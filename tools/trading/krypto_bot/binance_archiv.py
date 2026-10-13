#!/usr/bin/env python3
"""Öffentliche Binance-Futures-Archive (data.binance.vision, ohne Schlüssel) für ehrlichere Backtests.

  • funding_tage(sym) → {Tag: Summe der Funding-Raten dieses Tages}  (USDⓈ-M, ab Listing; BTCUSDT ab 09/2019)
  • mark_tage(sym)    → {Tag: (Hoch, Tief)} des MARKPREISES (ab 01/2020)

Warum: Live löst der Börsen-Stop auf dem Binance-Markpreis aus, und Longs zahlen das echte Funding (2020/21 oft das
1,5- bis 3-Fache der pauschalen 0,01 % je 8 h). Yahoo-Tageskerzen (Mittel über viele Börsen) glätten die Ausschläge — mit
ihnen löste der Stop seit 2020 14-mal seltener aus, und die Backtests lagen 3–9 Pp. pro Jahr zu hoch
(Profit-Prüfung 11.10.2026). Fehlt ein Monat (zu neu, Netz weg), rechnen die Backtests für diese Tage mit dem Ersatzmodell.
Zwischenspeicher: tools/trading/daten/binance_archiv/ (gitignored). Aufruf zum Vorladen: python3 binance_archiv.py
"""
from __future__ import annotations

import csv
import io
import json
import time
import urllib.error
import urllib.request
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
ORDNER = HIER.parent / "daten" / "binance_archiv"
BASIS = "https://data.binance.vision/data/futures/um/monthly"
START = {"BTCUSDT": "2019-09", "ETHUSDT": "2019-11"}


def _monate(von, bis):
    y, m = map(int, von.split("-"))
    out = []
    while f"{y}-{m:02d}" <= bis:
        out.append(f"{y}-{m:02d}")
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out


def _hole(url, versuche=3):
    """ZIP-Inhalt als Text; None bei 404 (Monat (noch) nicht veröffentlicht)."""
    for n in range(versuche):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "aban-krypto"}), timeout=60) as r:
                roh = r.read()
            with zipfile.ZipFile(io.BytesIO(roh)) as z:
                return z.read(z.namelist()[0]).decode()
        except urllib.error.HTTPError as ex:
            if ex.code == 404:
                return None
            time.sleep(2 * (n + 1))
        except (OSError, zipfile.BadZipFile):
            time.sleep(2 * (n + 1))
    raise OSError(f"nicht erreichbar: {url[-60:]}")


def _tag(ms):
    ms = int(ms)
    if ms > 10 ** 14:  # neuere Archive teils in Mikrosekunden
        ms //= 1000
    return datetime.fromtimestamp(ms / 1000, timezone.utc).date().isoformat()


def _zeilen(text):
    for r in csv.reader(io.StringIO(text)):
        if r and r[0].strip().isdigit():
            yield r


def _monat(art, sym, ym, heute, nur_speicher=False):
    """Ein Monat aus dem Archiv, zwischengespeichert. Ältere Monate sind unveränderlich; die letzten zwei werden neu geholt,
    solange sie fehlen (Binance veröffentlicht einen Monat erst Tage nach seinem Ende)."""
    datei = ORDNER / f"{art}_{sym}_{ym}.json"
    if datei.exists():
        return json.loads(datei.read_text())
    if nur_speicher:
        return {}
    if art == "funding":
        url = f"{BASIS}/fundingRate/{sym}/{sym}-fundingRate-{ym}.zip"
    else:
        url = f"{BASIS}/markPriceKlines/{sym}/1d/{sym}-1d-{ym}.zip"
    text = _hole(url)
    if text is None:
        y, m = map(int, ym.split("-"))
        if (heute.year - y) * 12 + heute.month - m <= 2:
            return {}  # wohl noch nicht veröffentlicht: nicht als «leer» merken
        daten = {}
    elif art == "funding":
        daten = {}
        for r in _zeilen(text):
            t = _tag(r[0])
            daten[t] = daten.get(t, 0.0) + float(r[-1])  # Spalten: calc_time, funding_interval_hours, last_funding_rate
    else:
        daten = {_tag(r[0]): [float(r[2]), float(r[3])] for r in _zeilen(text)}  # open_time, open, high, low, close, …
    ORDNER.mkdir(parents=True, exist_ok=True)
    tmp = datei.with_suffix(".tmp")
    tmp.write_text(json.dumps(daten))
    tmp.replace(datei)
    return daten


def _reihe(art, sym, heute=None, nur_speicher=False):
    heute = heute or datetime.now(timezone.utc).date()
    von = START.get(sym, "2019-09") if art == "funding" else max(START.get(sym, "2020-01"), "2020-01")
    out = {}
    for ym in _monate(von, f"{heute.year}-{heute.month:02d}"):
        if ym == f"{heute.year}-{heute.month:02d}":
            break  # laufender Monat liegt nie im Monatsarchiv
        out.update(_monat(art, sym, ym, heute, nur_speicher))
    return out


def funding_tage(sym, heute: date | None = None, nur_speicher=False):
    return _reihe("funding", sym, heute, nur_speicher)


def mark_tage(sym, heute: date | None = None, nur_speicher=False):
    return {t: tuple(v) for t, v in _reihe("mark", sym, heute, nur_speicher).items()}


def fuer_tage(sym, tage, nur_speicher=False):
    """Ausgerichtet auf die Backtest-Tage: {'funding': [Rate|None], 'stop_hl': [(Hoch, Tief)|None]}. Netz weg → {} (Ersatzmodell).
    nur_speicher=True: nichts herunterladen (Cockpit) — fehlende Monate rechnen mit dem Ersatzmodell."""
    try:
        f, m = funding_tage(sym, nur_speicher=nur_speicher), mark_tage(sym, nur_speicher=nur_speicher)
    except OSError as ex:
        print(f"{sym}: Binance-Archiv nicht erreichbar ({ex}) — Backtest mit Ersatzmodell (pauschales Funding, Yahoo-Hoch/Tief).")
        return {}
    return {"funding": [f.get(t) for t in tage], "stop_hl": [m.get(t) for t in tage]}


if __name__ == "__main__":
    for s in ("BTCUSDT", "ETHUSDT"):
        f, m = funding_tage(s), mark_tage(s)
        print(f"{s}: Funding {len(f)} Tage ({min(f) if f else '-'} – {max(f) if f else '-'}), "
              f"Markpreis {len(m)} Tage ({min(m) if m else '-'} – {max(m) if m else '-'})")
