#!/usr/bin/env python3
"""Tageskerzen ALLER USDT-Paare von Binance (öffentliche Marktdaten, ohne Schlüssel) — auch abgemeldete Coins.

Abgemeldete Paare (Status BREAK, z. B. LUNA, FTT) liefern ihre alte Kursgeschichte weiterhin. Das ist wichtig: Ein Test nur
mit heute noch gehandelten Coins würde die Verlierer weglassen und jede «Gewinner»-Strategie schönrechnen.
Zwischenspeicher: tools/trading/daten/binance_1d/<SYMBOL>.json als [[Tag, Schluss, Quote-Volumen], ...] (nur ganze Tage).
Aufruf: python3 tools/trading/krypto_bot/binance_daten.py [--neu]
"""
from __future__ import annotations

import json
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
ORDNER = HIER.parent / "daten" / "binance_1d"
QUELLEN = ["https://data-api.binance.vision", "https://api.binance.com"]
START_MS = 1500000000000  # Juli 2017, vor dem ersten Binance-Tag
# Keine Krypto-Wetten: Dollar-/Euro-Stablecoins, Gold-Token, verpackte Coins
STABIL = {"USDC", "BUSD", "TUSD", "USDP", "PAX", "DAI", "FDUSD", "EUR", "GBP", "AUD", "USDS", "USDSB", "SUSD", "UST", "PAXG",
          "WBTC", "WBETH", "BFUSD", "AEUR", "XUSD", "USD1", "EURI", "BKRW", "IDRT", "BIDR", "UAH", "NGN", "RUB", "TRY", "BRL",
          "ZAR", "USDE", "RLUSD", "USTC"}


def _hole(pfad):
    for n in range(4):
        for q in QUELLEN:
            try:
                with urllib.request.urlopen(urllib.request.Request(q + pfad, headers={"User-Agent": "aban-krypto"}), timeout=30) as r:
                    return json.load(r)
            except Exception:  # noqa: BLE001
                continue
        time.sleep(2 * (n + 1))
    raise OSError(f"nicht erreichbar: {pfad[:60]}")


def symbole():
    """Alle USDT-Paare (handelbar und abgemeldet) ohne Stablecoins und Hebel-Token."""
    d = _hole("/api/v3/exchangeInfo?permissions=SPOT")
    out = []
    for s in d["symbols"]:
        b = s["baseAsset"]
        if s["quoteAsset"] != "USDT" or b in STABIL or any(b.endswith(x) for x in ("UP", "DOWN", "BULL", "BEAR")) and len(b) > 4:
            continue
        out.append(s["symbol"])
    return sorted(out)


def lade(sym, neu=False):
    datei = ORDNER / f"{sym}.json"
    heute = datetime.now(timezone.utc).date().isoformat()
    alt = json.loads(datei.read_text()) if datei.exists() and not neu else []
    if alt and alt[-1][0] >= (datetime.now(timezone.utc).date().fromordinal(datetime.now(timezone.utc).date().toordinal() - 1)).isoformat():
        return alt
    start = (int(datetime.fromisoformat(alt[-1][0]).replace(tzinfo=timezone.utc).timestamp()) + 86400) * 1000 if alt else START_MS
    neu_z = []
    while True:
        k = _hole(f"/api/v3/klines?symbol={urllib.parse.quote(sym)}&interval=1d&startTime={start}&limit=1000")
        if not k:
            break
        neu_z += [[datetime.fromtimestamp(x[0] / 1000, timezone.utc).date().isoformat(), float(x[4]), float(x[7])] for x in k]
        if len(k) < 1000:
            break
        start = k[-1][0] + 86400000
    reihe = [z for z in alt + neu_z if z[0] < heute and z[1] > 0]
    ORDNER.mkdir(parents=True, exist_ok=True)
    datei.write_text(json.dumps(reihe))
    return reihe


def _sicher(sym, neu):
    try:
        return sym, lade(sym, neu)
    except OSError as ex:
        print(f"übersprungen: {ex}")
        return sym, []


def alle(neu=False, arbeiter=6):
    syms = symbole()
    with ThreadPoolExecutor(arbeiter) as ex:
        reihen = list(ex.map(lambda s: _sicher(s, neu), syms))
    return {s: r for s, r in reihen if r}


if __name__ == "__main__":
    t = time.time()
    d = alle("--neu" in sys.argv)
    print(f"{len(d)} Paare, {sum(len(r) for r in d.values())} Tageskerzen, {time.time() - t:.0f} s")
