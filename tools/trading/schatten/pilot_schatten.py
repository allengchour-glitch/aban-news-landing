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


def tage_zwischen(a: str, b: str) -> int:
    return max(0, (date.fromisoformat(b) - date.fromisoformat(a)).days)


def verbuchen(lb: dict, ents: list[dict], gebuehr: float, funding_8h: float) -> bool:
    """Einen neuen Stand ins Logbuch schreiben. → True, wenn etwas verbucht wurde (gleicher Stand = nichts)."""
    stand = max(e["stand"] for e in ents)
    tage = lb.setdefault("tage", [])
    if tage and stand <= tage[-1]["stand"]:
        return False
    jetzt = {e["markt"]: {"kurs": e["kurs"], "hebel": e["hebel"]} for e in ents}
    anteil = 1.0 / len(jetzt)
    if not tage:
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
        if alt and alt["kurs"] > 0:
            r += anteil * h_alt * (neu["kurs"] / alt["kurs"] - 1)
            # Funding: Longs zahlen, Shorts erhalten (vereinfacht positiver Satz, 3× pro Tag)
            r -= anteil * h_alt * funding_8h * 3 * n_tage
        r -= anteil * abs(neu["hebel"] - h_alt) * gebuehr
    kapital = round(vor["kapital"] * (1 + r), 2)
    tage.append({"stand": stand, "kapital": kapital, "rendite": round(r, 6), "maerkte": jetzt})
    return True


def bericht(lb: dict) -> str:
    t = lb.get("tage") or []
    if len(t) < 2:
        return "Schattenbuch Krypto-Pilot: noch zu wenig Tage (Start " + (t[0]["stand"] if t else "–") + ")."
    k0, k1 = t[0]["kapital"], t[-1]["kapital"]
    btc0, btc1 = t[0]["maerkte"].get("BTC", {}).get("kurs"), t[-1]["maerkte"].get("BTC", {}).get("kurs")
    hoch, einbruch = k0, 0.0
    for x in t:
        hoch = max(hoch, x["kapital"])
        einbruch = min(einbruch, x["kapital"] / hoch - 1)
    z = [f"Schattenbuch Krypto-Pilot (Spielgeld) {t[0]['stand']} bis {t[-1]['stand']}, {len(t) - 1} Buchungen:",
         f"  Pilot: {k1:,.0f} von {k0:,.0f} ({(k1 / k0 - 1) * 100:+.1f} %), schlimmster Einbruch {einbruch * 100:.1f} %"]
    if btc0 and btc1:
        z.append(f"  Bitcoin halten im selben Zeitraum: {(btc1 / btc0 - 1) * 100:+.1f} %")
    h = ", ".join(f"{m} {v['hebel']:+.2f}×" for m, v in t[-1]["maerkte"].items())
    z.append(f"  Aktuelle Position: {h}")
    z.append("  Vereinfacht: ohne Börsen-Stops und Liquidation. Keine Anlageberatung.")
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
        if verbuchen(lb, ents, K.GEBUEHR, K.FUNDING_8H):
            LOGBUCH.parent.mkdir(exist_ok=True)
            LOGBUCH.write_text(json.dumps(lb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            print("verbucht:", lb["tage"][-1]["stand"])
        else:
            print("Stand schon verbucht — nichts geändert.")
    print(bericht(lb))
    return 0


if __name__ == "__main__":
    sys.exit(main())
