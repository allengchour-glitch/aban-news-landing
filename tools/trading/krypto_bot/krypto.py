#!/usr/bin/env python3
"""KI-Krypto-Bot — Bitcoin mit Schwankungsziel, automatisch über Alpaca oder Binance (Standard: Spielgeld).

Warum gerade diese Regel? Siehe analyse.py: Von acht vorab festgelegten Strategien schlug keine das einfache Halten von
Bitcoin. Das Schwankungsziel kam im ungesehenen Test (2022–2026) auf fast dieselbe Rendite mit kleinerem Einbruch
(−53 % statt −67 %), verdiente in den Boomjahren davor aber deutlich weniger. Es ist eine Risikobremse, keine Geldmaschine.

Regel (täglich, nur abgeschlossene Tage): Schwankung = EWMA der Tagesrenditen (λ 0,94) auf ein Jahr hochgerechnet;
Bitcoin-Anteil = min(100 %, 40 % ÷ Schwankung). Ruhiger Markt → voll investiert, wilder Markt → weniger.
Andere Strategien: KRYPTO_STRATEGIE=halten (immer 100 %) oder trend200 (100 % über dem 200-Tage-Schnitt, sonst 0).

  python3 tools/trading/krypto_bot/krypto.py --status            # was der Bot heute tun würde
  python3 tools/trading/krypto_bot/krypto.py --lauf --trocken    # Aufträge nur anzeigen
  python3 tools/trading/krypto_bot/krypto.py --lauf              # handeln (Papierkonto, solange nicht doppelt freigegeben)

Sicherungen wie beim KI-Bot (broker_alpaca.py): Papier ist Standard, echtes Geld nur mit ALPACA_PAPER=false UND
KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD"; höchstens KI_BOT_ANTEIL des Kontos, je Auftrag höchstens KI_BOT_MAX_AUFTRAG USD,
kein Hebel, kein Leerverkauf; Not-Aus KI_BOT_STOP=1 oder Datei tools/trading/ki_bot/STOP. Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER.parent))
sys.path.insert(0, str(HIER.parent / "ki_bot"))
import lern_bot as L  # noqa: E402

ROOT = HIER.parents[2]
LOGBUCH = ROOT / "data" / "krypto-bot.json"
SYMBOL_YAHOO, SYMBOL_ALPACA = "BTC-USD", "BTC/USD"
ZIEL_VOL, LAMBDA = 0.40, 0.94
STRATEGIEN = ("schwankungsziel", "halten", "trend200")


def abgeschlossen(reihe, jetzt=None):
    """Yahoo liefert den laufenden Tag mit: der zählt erst, wenn er vorbei ist (UTC)."""
    heute = (jetzt or datetime.now(timezone.utc)).date().isoformat()
    return [x for x in reihe if x[0] < heute]


def quote(preise, strategie="schwankungsziel"):
    """Ziel-Anteil Bitcoin (0…1) aus Kursen bis und mit gestern. Gibt (quote, info) zurück."""
    if strategie == "halten":
        return 1.0, {"regel": "immer voll investiert"}
    if strategie == "trend200":
        if len(preise) < 200:
            return 0.0, {"regel": "zu wenig Kurse"}
        s = sum(preise[-200:]) / 200
        return (1.0 if preise[-1] > s else 0.0), {"regel": "Kurs über 200-Tage-Schnitt", "schnitt200": round(s, 2)}
    var = None
    for a, b in zip(preise, preise[1:]):
        r = b / a - 1
        var = r * r if var is None else LAMBDA * var + (1 - LAMBDA) * r * r
    if var is None or len(preise) < 31:
        return 0.0, {"regel": "zu wenig Kurse"}
    vol = math.sqrt(var * 365)
    return min(1.0, ZIEL_VOL / vol), {"regel": f"Schwankungsziel {ZIEL_VOL * 100:.0f} %", "schwankung_jahr": round(vol, 4)}


def lies():
    if LOGBUCH.exists():
        return json.loads(LOGBUCH.read_text(encoding="utf-8"))
    return {"version": 1, "entscheide": []}


def schreibe(lb):
    LOGBUCH.parent.mkdir(exist_ok=True)
    LOGBUCH.write_text(json.dumps(lb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def entscheid(strategie, offline=False, jetzt=None):
    reihe = abgeschlossen(L.kurse(SYMBOL_YAHOO, offline), jetzt)
    q, info = quote([p for _, p in reihe], strategie)
    return {"stand": reihe[-1][0], "kurs": round(reihe[-1][1], 2), "strategie": strategie, "quote": round(q, 4), **info}


def ausfuehren(e, trocken=False, env=None, client=None):
    """Zielanteil an Alpaca senden (Papier, solange nicht doppelt freigegeben). Gibt Liste der Aufträge zurück."""
    import broker_alpaca as B
    cfg = B.einstellungen(env)
    eintrag = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modus": "ECHTGELD" if cfg["echtgeld"] else "papier",
               "strategie": "krypto:" + e["strategie"], "trocken": trocken, "auftraege": [], "hinweis": ""}
    if not cfg["key"] or not cfg["secret"]:
        print("Broker: keine Alpaca-Schlüssel gesetzt — nichts zu tun.")
        return []
    if cfg["stop"]:
        eintrag["hinweis"] = "Not-Aus oder Pause aktiv — keine Aufträge."
        print("Broker: " + eintrag["hinweis"])
        B._protokolliere(eintrag)
        return []
    c = client or B.Alpaca(cfg)
    konto = c.konto()
    if konto.get("trading_blocked") or konto.get("account_blocked") or konto.get("crypto_status") not in (None, "ACTIVE"):
        eintrag["hinweis"] = "Konto oder Krypto-Handel gesperrt — keine Aufträge."
        print("Broker: " + eintrag["hinweis"])
        B._protokolliere(eintrag)
        return []
    plan = B.plane(cfg, konto, c.positionen(), {SYMBOL_ALPACA: e["quote"]})
    for a in plan:
        print(f"{'(trocken) ' if trocken else ''}{a['seite']:4} {a['symbol']} {a['notional']:>9.2f} USD (ist {a['ist']:.2f} → soll {a['soll']:.2f})")
        if not trocken:
            try:
                antwort = c.auftrag(a["symbol"], a["seite"], a["notional"])
                a["id"], a["status"] = (antwort or {}).get("id"), (antwort or {}).get("status")
            except Exception as ex:  # noqa: BLE001
                a["fehler"] = type(ex).__name__
        eintrag["auftraege"].append(a)
    if not plan:
        print("Broker: Bitcoin-Anteil liegt im Zielbereich — keine Aufträge.")
    B._protokolliere(eintrag)
    return plan


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--lauf", action="store_true")
    ap.add_argument("--trocken", action="store_true")
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--broker", choices=["alpaca", "binance"], help="Standard: KRYPTO_BROKER oder alpaca")
    a = ap.parse_args()
    import os
    strategie = (os.environ.get("KRYPTO_STRATEGIE") or "schwankungsziel").strip().lower()
    if strategie not in STRATEGIEN:
        print(f"KRYPTO_STRATEGIE muss eine von {', '.join(STRATEGIEN)} sein.")
        return 1
    if not (a.status or a.lauf):
        ap.print_help()
        return 0
    e = entscheid(strategie, a.offline)
    kurs = f"{e['kurs']:,.0f}".replace(",", "'")
    text = (f"₿ Krypto-Bot {e['stand']}: Bitcoin {kurs} USD · Ziel {e['quote'] * 100:.0f} % investiert "
            f"({e['regel']}" + (f", Schwankung {e['schwankung_jahr'] * 100:.0f} %/Jahr" if "schwankung_jahr" in e else "") + ")")
    print(text)
    if a.status:
        return 0
    lb = lies()
    vorher = lb["entscheide"][-1]["quote"] if lb["entscheide"] else None
    if not lb["entscheide"] or lb["entscheide"][-1]["stand"] != e["stand"]:
        lb["entscheide"].append(e)
        lb["entscheide"] = lb["entscheide"][-2000:]
        schreibe(lb)
    broker = a.broker or (os.environ.get("KRYPTO_BROKER") or "alpaca").strip().lower()
    if broker == "binance":
        import broker_binance as BB
        plan = BB.ausfuehren(e, trocken=a.trocken)
    else:
        plan = ausfuehren(e, trocken=a.trocken)
    if plan or vorher is None or abs(e["quote"] - vorher) >= 0.05:
        import signale as SG
        SG.push(text + ("\n" + "\n".join(f"{x['seite']} ca. {x.get('notional', x.get('quote_betrag', x.get('ca_betrag', 0))):.0f} ({broker})" for x in plan) if plan else "") + "\nKeine Anlageberatung.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
