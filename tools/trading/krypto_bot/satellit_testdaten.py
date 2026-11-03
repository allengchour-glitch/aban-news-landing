#!/usr/bin/env python3
"""Zufällige, aber feste Kursverläufe für die Tests des Satelliten (nur zum Prüfen, nie im Handel)."""
from __future__ import annotations

import random
from datetime import date, timedelta


def synthetisch(seed, tage=420, start="2018-02-01", gleiche_volumen=False, btc_absturz=False):
    """Zufällige Kursverläufe zum Prüfen: 12 alte Coins, ein neuer (unter 90 Tagen), einer mit später Listung, einer mit Lücke, einer vom Markt genommen."""
    rnd = random.Random(seed)
    a0 = date.fromisoformat(start)
    namen = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "TRXUSDT", "LINKUSDT", "AVAXUSDT", "DOTUSDT", "LTCUSDT",
             "NEUUSDT", "SPAETUSDT", "WEGUSDT"]
    reihen = {}
    for k, sym in enumerate(namen):
        von = {"NEUUSDT": tage - 60, "SPAETUSDT": 250}.get(sym, 0)
        bis = tage if sym != "WEGUSDT" else tage - 120
        p, reihe = 100.0 * (k + 1), []
        steigend = sym in ("BTCUSDT", "SOLUSDT", "ADAUSDT", "LINKUSDT")
        for j in range(von, bis):
            drift = 0.002 if steigend else -0.0005
            if btc_absturz and sym == "BTCUSDT" and j >= 290:
                drift = -0.012         # Bitcoin bricht ein: der 150-Tage-Filter muss dann zugehen
            p *= 1 + rnd.gauss(drift, 0.03)
            if sym == "DOTUSDT" and j in (200, 201):
                continue
            vol = 1e7 if gleiche_volumen else rnd.uniform(1e6, 5e7) * (16 - k)
            reihe.append(((a0 + timedelta(days=j)).isoformat(), round(p, 6), vol))
        reihen[sym] = reihe
    return reihen
