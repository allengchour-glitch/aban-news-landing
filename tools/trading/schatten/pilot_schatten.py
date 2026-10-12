#!/usr/bin/env python3
"""Schattenbuch Krypto-Pilot — führt die Entscheide des Piloten täglich mit SPIELGELD nach, ohne Broker, ohne Schlüssel.

    python3 tools/trading/schatten/pilot_schatten.py --lauf     # neuen Tag verbuchen (idempotent)
    python3 tools/trading/schatten/pilot_schatten.py --bericht  # Stand gegen Bitcoin halten

Zweck: ehrlicher Vorwärtstest auf Tagen, die beim Entwickeln niemand kannte. Logbuch: data/krypto-pilot-schatten.json.
Verbucht: Rendite = Σ Anteil × Hebel (vom letzten Lauf) × Kursänderung − Gebühr auf Hebeländerung − Funding.
Vereinfacht (bewusst, steht im Bericht): Börsen-Stops und Liquidation sind nicht abgebildet; zwischen zwei Läufen gilt
der alte Hebel. Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

HIER = Path(__file__).resolve().parent
KB = HIER.parent / "krypto_bot"
sys.path[:0] = [str(KB), str(HIER.parent), str(HIER.parent / "ki_bot")]
ROOT = HIER.parents[2]
LOGBUCH = ROOT / "data" / "krypto-pilot-schatten.json"
START_KAPITAL = 10_000.0
KAPITAL_FAKTOR = 1.5   # Funding-Ernte: Spot + 50 % Sicherheit für den Short
SPOT_GEBUEHR = 0.001
CARRY_KOSTEN = 0.0015


def tage_zwischen(a: str, b: str) -> int:
    return max(0, (date.fromisoformat(b) - date.fromisoformat(a)).days)


def verbuchen(lb: dict, ents: list[dict], gebuehr: float, funding_8h: float, funding: dict | None = None,
              schluessel: str = "tage", modus: str = "P0") -> bool:
    """Einen neuen Stand ins Logbuch schreiben. → True, wenn etwas verbucht wurde (gleicher Stand = nichts).
    funding: {Markt: Summe der echten Raten seit dem letzten Stand}; fehlt ein Markt → Schätzung funding_8h × 3 × Tage.
    modus P0 = alles über Futures (Longs zahlen Funding). P2 = Pilot 2.0: Long über Spot (0,10 %, kein Funding), Short über
    Futures (bekommt Funding), freies Geld als Funding-Ernte geparkt (1,5× Kapital, 0,15 % auf Änderungen)."""
    stand = max(e["stand"] for e in ents)
    tage = lb.setdefault(schluessel, [])
    if tage and stand <= tage[-1]["stand"]:
        return False
    jetzt = {e["markt"]: {"kurs": e["kurs"], "hebel": e["hebel"]} for e in ents}
    anteil = 1.0 / len(jetzt)
    if not tage:
        if schluessel == "tage":
            lb.update({"start": stand, "start_kapital": START_KAPITAL,
                       "hinweis": "Spielgeld-Vorwärtstest; Stops/Liquidation nicht abgebildet."})
        tage.append({"stand": stand, "kapital": START_KAPITAL, "rendite": 0.0, "maerkte": jetzt})
        return True
    vor = tage[-1]
    n_tage = tage_zwischen(vor["stand"], stand)
    r = 0.0
    for m, neu in jetzt.items():
        alt = vor["maerkte"].get(m)
        h_alt = alt["hebel"] if alt else 0.0
        f = (funding or {}).get(m)
        if f is None:
            f = funding_8h * 3 * n_tage
        spot_long = modus == "P2" and h_alt > 0
        if alt and alt["kurs"] > 0:
            r += anteil * h_alt * (neu["kurs"] / alt["kurs"] - 1)
            if not spot_long:
                r -= anteil * h_alt * f  # Long zahlt f, Short bekommt f (bei negativem f umgekehrt)
            if modus == "P2":  # Parkplatz: freies Kapital in der Funding-Ernte
                r += anteil * max(0.0, 1 - abs(h_alt)) / KAPITAL_FAKTOR * f
        geb = SPOT_GEBUEHR if (modus == "P2" and (neu["hebel"] > 0 or h_alt > 0)) else gebuehr
        r -= anteil * abs(neu["hebel"] - h_alt) * geb
        if modus == "P2":
            r -= anteil * abs(max(0.0, 1 - abs(neu["hebel"])) - max(0.0, 1 - abs(h_alt))) / KAPITAL_FAKTOR * CARRY_KOSTEN
    kapital = round(vor["kapital"] * (1 + r), 2)
    tage.append({"stand": stand, "kapital": kapital, "rendite": round(r, 6), "maerkte": jetzt,
                 "funding": {m: round(v, 6) for m, v in (funding or {}).items()}})
    return True


OKX = "https://www.okx.com/api/v5/public/funding-rate-history?instId={m}-USDT-SWAP&limit=100"


def echtes_funding(maerkte, von: str, bis: str) -> dict:
    """Summe der echten Raten (OKX, öffentlich) mit Zahlzeit nach Tag «von» bis Ende Tag «bis» (UTC). Fehler → Markt fehlt."""
    import urllib.request
    from datetime import datetime, timedelta, timezone
    a = int((datetime.fromisoformat(von).replace(tzinfo=timezone.utc) + timedelta(days=1)).timestamp() * 1000)
    b = int((datetime.fromisoformat(bis).replace(tzinfo=timezone.utc) + timedelta(days=1)).timestamp() * 1000)
    out = {}
    for m in maerkte:
        try:
            with urllib.request.urlopen(urllib.request.Request(OKX.format(m=m), headers={"User-Agent": "aban-schatten"}), timeout=20) as r:
                d = json.load(r)["data"]
            zeiten = [int(x["fundingTime"]) for x in d]
            if not zeiten or min(zeiten) > a:  # Lücke: zu alt für die Schnittstelle → lieber schätzen als falsch zählen
                continue
            out[m] = sum(float(x.get("realizedRate") or x["fundingRate"]) for x in d if a <= int(x["fundingTime"]) < b)
        except Exception as ex:  # noqa: BLE001
            print(f"Funding {m} nicht erreichbar ({type(ex).__name__}) — Schätzung 0,01 %/8 h")
    return out


def _kennz(t):
    hoch, einbruch = t[0]["kapital"], 0.0
    for x in t:
        hoch = max(hoch, x["kapital"])
        einbruch = min(einbruch, x["kapital"] / hoch - 1)
    return t[-1]["kapital"], t[-1]["kapital"] / t[0]["kapital"] - 1, einbruch


def bericht(lb: dict) -> str:
    t = lb.get("tage") or []
    if len(t) < 2:
        return "Schattenbuch Krypto-Pilot: noch zu wenig Tage (Start " + (t[0]["stand"] if t else "–") + ")."
    z = [f"Schattenbuch Krypto-Pilot (Spielgeld) {t[0]['stand']} bis {t[-1]['stand']}, {len(t) - 1} Buchungen:"]
    for name, key in (("Pilot (alles Futures)", "tage"), ("Pilot 2.0 (Spot-Long + Parkplatz)", "tage_p2")):
        tt = lb.get(key) or []
        if len(tt) >= 2:
            k, r, e = _kennz(tt)
            z.append(f"  {name}: {k:,.0f} ({r * 100:+.1f} % seit {tt[0]['stand']}), schlimmster Einbruch {e * 100:.1f} %")
    btc0, btc1 = t[0]["maerkte"].get("BTC", {}).get("kurs"), t[-1]["maerkte"].get("BTC", {}).get("kurs")
    if btc0 and btc1:
        z.append(f"  Bitcoin halten im selben Zeitraum: {(btc1 / btc0 - 1) * 100:+.1f} %")
    h = ", ".join(f"{m} {v['hebel']:+.2f}×" for m, v in t[-1]["maerkte"].items())
    z.append(f"  Aktuelle Position: {h}")
    z.append("  Vereinfacht: ohne Börsen-Stops und Liquidation. Funding echt (OKX), sonst geschätzt. Keine Anlageberatung.")
    return "\n".join(z)


def lies(datei: Path = LOGBUCH) -> dict:
    return json.loads(datei.read_text(encoding="utf-8")) if datei.exists() else {}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lauf", action="store_true")
    ap.add_argument("--bericht", action="store_true")
    a = ap.parse_args()
    lb = lies()
    if a.lauf:
        import pilot as P
        import pilot_kern as K
        ents = [P.entscheid(m) for m in P.maerkte({})]  # Standard-Einstellungen, nicht die des PCs
        for e in ents:
            print(P.text(e))
        stand = max(e["stand"] for e in ents)
        geaendert = False
        for key, modus in (("tage", "P0"), ("tage_p2", "P2")):
            tt = lb.get(key) or []
            f = echtes_funding([e["markt"] for e in ents], tt[-1]["stand"], stand) if tt and stand > tt[-1]["stand"] else {}
            if verbuchen(lb, ents, K.GEBUEHR, K.FUNDING_8H, funding=f, schluessel=key, modus=modus):
                geaendert = True
                print(f"verbucht ({modus}):", stand, "Funding", f or "Start/geschätzt")
        if geaendert:
            LOGBUCH.parent.mkdir(exist_ok=True)
            LOGBUCH.write_text(json.dumps(lb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        else:
            print("Stand schon verbucht — nichts geändert.")
    print(bericht(lb))
    return 0


if __name__ == "__main__":
    sys.exit(main())
