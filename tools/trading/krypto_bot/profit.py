#!/usr/bin/env python3
"""Profit-Anzeige für den Krypto-Pilot — echte Zahlen direkt vom Binance-Futures-Konto (nur lesen, kein Auftrag).

  py tools/trading/krypto_bot/profit.py          # Gewinn heute / 7 Tage / 30 Tage / seit Start + offene Positionen

Quelle: /fapi/v1/income (realisierter Gewinn, Funding, Gebühren — Ein- und Auszahlungen zählen NICHT als Gewinn),
/fapi/v2/account (Kontostand) und /fapi/v2/positionRisk (offene Positionen mit Einstieg, Markpreis, Liquidationspreis).
Binance gibt die Einkommens-Geschichte nur für die letzten Monate heraus — darum wird jeder Eintrag in
data/krypto-profit.json gespeichert (ohne Schlüssel) und der Gewinn «seit Start» bleibt auch später vollständig.
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
from datetime import datetime, timedelta, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import broker_futures as BF  # noqa: E402

ROOT = HIER.parents[2]
LOGBUCH = ROOT / "data" / "krypto-profit.json"
# Was als Gewinn/Verlust zählt. TRANSFER (Ein-/Auszahlung) und Bonus-Gutschriften bewusst NICHT.
GEWINN_ARTEN = {"REALIZED_PNL": "realisiert", "FUNDING_FEE": "funding", "COMMISSION": "gebuehren",
                "INSURANCE_CLEAR": "realisiert", "LIQUIDATION_FEE": "gebuehren"}
WOCHE_MS = 7 * 86400 * 1000


def lies(pfad=None):
    pfad = pfad or LOGBUCH
    try:
        lb = json.loads(pfad.read_text(encoding="utf-8")) if pfad.exists() else {}
    except ValueError:
        lb = {}
    lb.setdefault("version", 1)
    lb.setdefault("einkommen", {})
    lb.setdefault("offen_verlauf", [])  # [ms, offener Gewinn] höchstens alle 15 Minuten — für «Gewinn heute» korrekt
    return lb


def offen_merken(lb, offen, jetzt_ms=None):
    jetzt_ms = jetzt_ms or int(time.time() * 1000)
    v = lb["offen_verlauf"]
    if not v or jetzt_ms - v[-1][0] >= 15 * 60 * 1000:
        v.append([jetzt_ms, round(offen, 4)])
    lb["offen_verlauf"] = [x for x in v if x[0] >= jetzt_ms - 120 * 86400 * 1000]


def schreibe(lb, pfad=None):
    pfad = pfad or LOGBUCH
    pfad.parent.mkdir(exist_ok=True)
    pfad.write_text(json.dumps(lb, ensure_ascii=False) + "\n", encoding="utf-8")


def einkommen_holen(c, ab_ms, bis_ms):
    """Alle Einkommens-Einträge ab ab_ms, in Wochen-Fenstern und je 1000 Einträgen (Binance-Grenzen)."""
    out, start = [], ab_ms
    while start < bis_ms:
        ende = min(start + WOCHE_MS, bis_ms)
        s = start
        while True:
            seite = c._req("GET", "/fapi/v1/income", {"startTime": s, "endTime": ende, "limit": 1000}, signiert=True) or []
            out += seite
            if len(seite) < 1000:
                break
            s = int(seite[-1]["time"]) + 1
        start = ende + 1
    return out


def nachfuehren(lb, c, jetzt_ms=None, max_tage=90):
    """Neue Einkommens-Einträge ins Logbuch (nach tranId+Art entdoppelt)."""
    jetzt_ms = jetzt_ms or int(time.time() * 1000)
    vorhanden = lb["einkommen"]
    letzte = max((e["zeit"] for e in vorhanden.values()), default=None)
    ab = max(jetzt_ms - max_tage * 86400 * 1000, (letzte - 3600 * 1000) if letzte else 0)
    for e in einkommen_holen(c, ab, jetzt_ms):
        art = e.get("incomeType")
        if art not in GEWINN_ARTEN:
            continue
        key = f"{e.get('tranId')}-{art}-{e.get('symbol', '')}"
        vorhanden[key] = {"zeit": int(e["time"]), "art": GEWINN_ARTEN[art], "symbol": e.get("symbol") or "",
                          "betrag": float(e["income"]), "asset": e.get("asset", "USDT")}
    lb["einkommen"] = vorhanden
    return lb


def auswerten(lb, konto, positionen, jetzt=None):
    """Reine Rechnung (testbar): Gewinn nach Zeitraum und Art, offene Positionen."""
    jetzt = jetzt or datetime.now().astimezone()
    mitternacht = jetzt.replace(hour=0, minute=0, second=0, microsecond=0)
    grenzen = {"heute": mitternacht, "7_tage": jetzt - timedelta(days=7), "30_tage": jetzt - timedelta(days=30),
               "gesamt": datetime.fromtimestamp(0, timezone.utc)}
    wallet = float(konto.get("totalWalletBalance", 0) or 0)
    offen = float(konto.get("totalUnrealizedProfit", 0) or 0)
    eintraege = [e for e in lb["einkommen"].values() if e.get("asset", "USDT") in ("USDT", "USDC", "BUSD")]
    zeitraeume = {}
    for name, ab in grenzen.items():
        ab_ms = ab.timestamp() * 1000
        teil = [e for e in eintraege if e["zeit"] >= ab_ms]
        arten = {a: round(sum(e["betrag"] for e in teil if e["art"] == a), 4) for a in ("realisiert", "funding", "gebuehren")}
        # offener Gewinn: nur die Veränderung im Zeitraum (letzter gemerkter Stand vor Beginn; ohne Stand: ab 0)
        vorher = [x[1] for x in lb.get("offen_verlauf", []) if x[0] <= ab_ms]
        offen_delta = offen - (vorher[-1] if vorher else 0.0)
        netto = round(sum(arten.values()) + offen_delta, 4)
        basis = wallet + offen - netto
        zeitraeume[name] = {**arten, "offen": round(offen_delta, 4), "netto": netto, "prozent": netto / basis if basis > 0 else None}
    pro_markt = {}
    for e in eintraege:
        if e["symbol"]:
            pro_markt[e["symbol"]] = round(pro_markt.get(e["symbol"], 0.0) + e["betrag"], 4)
    pos = []
    for p in positionen:
        menge = float(p.get("positionAmt", 0) or 0)
        if not menge:
            continue
        einstieg, mark = float(p.get("entryPrice", 0) or 0), float(p.get("markPrice", 0) or 0)
        pnl = float(p.get("unRealizedProfit", 0) or 0)
        marge = float(p.get("isolatedMargin", 0) or 0) or (abs(menge) * einstieg / max(1.0, float(p.get("leverage", 1) or 1)))
        pro_markt[p["symbol"]] = round(pro_markt.get(p["symbol"], 0.0) + pnl, 4)
        pos.append({"symbol": p["symbol"], "seite": "LONG" if menge > 0 else "SHORT", "menge": abs(menge), "einstieg": einstieg,
                    "mark": mark, "gewinn": round(pnl, 4), "gewinn_prozent": pnl / marge if marge else None,
                    "kursbewegung": (mark / einstieg - 1) * (1 if menge > 0 else -1) if einstieg else None,
                    "liquidation": float(p.get("liquidationPrice", 0) or 0) or None, "hebel": float(p.get("leverage", 0) or 0),
                    "wert": round(abs(menge) * mark, 2)})
    tage = {}
    for e in eintraege:
        t = datetime.fromtimestamp(e["zeit"] / 1000).astimezone().date().isoformat()
        tage[t] = round(tage.get(t, 0.0) + e["betrag"], 4)
    kumuliert, s = [], 0.0
    for t in sorted(tage):
        s += tage[t]
        kumuliert.append([t, round(s, 4)])
    return {"wallet": round(wallet, 2), "offen": round(offen, 4), "gesamt": round(wallet + offen, 2), "zeitraeume": zeitraeume,
            "pro_markt": pro_markt, "positionen": pos, "tage": [[t, tage[t]] for t in sorted(tage)][-60:], "kumuliert": kumuliert[-365:],
            "seit": datetime.fromtimestamp(min((e["zeit"] for e in eintraege), default=time.time() * 1000) / 1000).date().isoformat()}


def abrufen(env=None, client=None, logbuch=None, jetzt=None):
    """Holt den Stand vom Konto (nur lesende Abfragen). Ohne Schlüssel oder bei Fehlern: {'hinweis': …}."""
    cfg = BF.einstellungen(env)
    if not cfg["key"] or not cfg["secret"]:
        return {"hinweis": "Keine Futures-Schlüssel gesetzt (BINANCE_FUTURES_API_KEY/SECRET) — ohne Schlüssel kein Kontostand."}
    c = client or BF.Futures(cfg)
    lb = lies(logbuch)
    try:
        konto = c.konto()
        positionen = c._req("GET", "/fapi/v2/positionRisk", signiert=True) or []
        try:
            nachfuehren(lb, c)
        except (urllib.error.URLError, KeyError, ValueError):
            pass  # Kontostand trotzdem zeigen; Einkommen beim nächsten Abruf
        offen_merken(lb, float(konto.get("totalUnrealizedProfit", 0) or 0))
        schreibe(lb, logbuch)
    except urllib.error.HTTPError as ex:
        return {"hinweis": "Binance sperrt deinen Standort (HTTP 451)." if ex.code == 451 else
                "Schlüssel ungültig (HTTP 401)." if ex.code == 401 else f"Binance lehnt ab (HTTP {ex.code})."}
    except (urllib.error.URLError, KeyError, ValueError) as ex:
        return {"hinweis": f"Binance nicht erreichbar: {type(ex).__name__}"}
    return {"modus": "ECHTGELD" if cfg["echtgeld"] else "TESTNETZ", "zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            **auswerten(lb, konto, positionen, jetzt)}


def text(p):
    if p.get("hinweis"):
        return "Profit: " + p["hinweis"]

    def z(x):
        return f"{x:+,.2f}".replace(",", "'")

    def pc(x):
        return f" ({x * 100:+.2f} %)" if x is not None else ""
    zr = p["zeitraeume"]
    t = (f"💰 Profit ({p['modus']}) · Konto {p['gesamt']:,.2f} USDT".replace(",", "'")
         + f"\nHeute {z(zr['heute']['netto'])}{pc(zr['heute']['prozent'])} · 7 Tage {z(zr['7_tage']['netto'])}{pc(zr['7_tage']['prozent'])}"
         + f" · 30 Tage {z(zr['30_tage']['netto'])}{pc(zr['30_tage']['prozent'])}"
         + f"\nSeit {p['seit']}: {z(zr['gesamt']['netto'])}{pc(zr['gesamt']['prozent'])} — realisiert {z(zr['gesamt']['realisiert'])}, "
         f"offen {z(zr['gesamt']['offen'])}, Funding {z(zr['gesamt']['funding'])}, Gebühren {z(zr['gesamt']['gebuehren'])}")
    for x in p["positionen"]:
        t += (f"\n{x['seite']} {x['menge']:g} {x['symbol']} · Einstieg {x['einstieg']:,.2f} · jetzt {x['mark']:,.2f} · "
              f"{z(x['gewinn'])} USDT" + (f" ({x['gewinn_prozent'] * 100:+.1f} % auf das Pfand)" if x["gewinn_prozent"] is not None else "")).replace(",", "'")
    return t


if __name__ == "__main__":
    print(text(abrufen()))
