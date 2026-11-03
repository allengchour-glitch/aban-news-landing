#!/usr/bin/env python3
"""Satellit: Tageskerzen von Binance (öffentliche Marktdaten, ohne Schlüssel) für die Regel in satellit_kern.py.

Quelle: data-api.binance.vision (die Daten-Spiegelung von Binance, die auch von GitHub-Läufern und aus der Schweiz erreichbar ist),
Rückfall api.binance.com — dieselbe Reihenfolge wie binance_daten.py. Alles, was hier ankommt, ist nur Information: Fehler sind
OSError, der Aufrufer entscheidet, ob er ohne den Coin weitermacht.
"""
from __future__ import annotations

import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import binance_daten as BD  # noqa: E402
import satellit_kern as S  # noqa: E402

KANDIDATEN = 60            # so viele nach 24-Stunden-Volumen vorausgewählte Coins bekommen Kerzen; daraus entscheidet das 30-Tage-Volumen
PFLICHT = ("BTCUSDT", "ETHUSDT")
FRIST_S = 420              # so lange darf das Holen aller Kerzen insgesamt dauern (danach wird mit dem Vorhandenen weitergearbeitet)


def kandidaten(hole=None, anzahl=KANDIDATEN):
    """Die `anzahl` USDT-Paare mit dem höchsten 24-Stunden-Volumen (ohne Stablecoins, Gold-Token, verpackte Coins, Hebel-Token) plus BTC und ETH."""
    hole = hole or BD._hole
    roh = hole("/api/v3/ticker/24hr")
    ranking = []
    for t in roh if isinstance(roh, list) else []:
        sym = str(t.get("symbol", ""))
        if not sym.endswith("USDT") or not re.fullmatch(r"[A-Z0-9]{2,20}", sym):   # nur einfache Namen: Paare mit Sonderzeichen (z. B. chinesische Zeichen) lassen sich nicht abfragen
            continue
        basis = sym[:-4]
        if basis in BD.STABIL or (any(basis.endswith(x) for x in ("UP", "DOWN", "BULL", "BEAR")) and len(basis) > 4):
            continue
        try:
            ranking.append((float(t["quoteVolume"]), sym))
        except (KeyError, TypeError, ValueError):
            continue
    top = [s for _, s in sorted(ranking, reverse=True)[:anzahl]]
    return top + [s for s in PFLICHT if s not in top]


def kerzen(sym, hole=None, heute=None, rueck=S.RUECK + 5):
    """[(Tag, Schlusskurs, Quote-Volumen), …] der ABGESCHLOSSENEN Tage (der laufende Tag fehlt immer)."""
    hole = hole or BD._hole
    heute = heute or datetime.now(timezone.utc).date().isoformat()
    roh = hole(f"/api/v3/klines?symbol={sym}&interval=1d&limit={rueck}")
    out = []
    for k in roh if isinstance(roh, list) else []:
        try:
            tag = datetime.fromtimestamp(int(k[0]) / 1000, timezone.utc).date().isoformat()
            if tag < heute:
                out.append((tag, float(k[4]), float(k[7])))
        except (IndexError, TypeError, ValueError):
            continue
    return out


def alle_reihen(symbole, hole=None, heute=None, frist_s=FRIST_S, pause=0.05, jetzt=time.monotonic):
    """→ ({Symbol: Kerzen}, [Symbole ohne Kerzen]). Hört nach `frist_s` Sekunden auf zu holen; Bitcoin und Ether kommen zuerst."""
    reihen, fehlt = {}, []
    ende = jetzt() + frist_s
    for sym in sorted(symbole, key=lambda s: (s not in PFLICHT, s)):
        if jetzt() > ende:
            fehlt.append(sym)
            continue
        try:
            r = kerzen(sym, hole, heute)
        except OSError:
            r = []
        if r:
            reihen[sym] = r
        else:
            fehlt.append(sym)
        if pause:
            time.sleep(pause)
    return reihen, fehlt


def letzter_tag(reihen):
    """Der jüngste abgeschlossene Tag, für den Bitcoin Kerzen hat (Grundlage jeder Entscheidung)."""
    btc = reihen.get(S.BTC)
    return btc[-1][0] if btc else None
