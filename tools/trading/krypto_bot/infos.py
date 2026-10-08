#!/usr/bin/env python3
"""Freie Markt-Infos für den Krypto-Pilot — alle ohne Konto und ohne Schlüssel.

  Angst & Gier    alternative.me/fng            täglich seit 02/2018
  Funding         BitMEX XBTUSD / ETHUSD        alle 8 h seit 2016 (BTC) bzw. 2018 (ETH)
  MVRV            CoinMetrics Community API     Marktwert ÷ «realisierter» Wert (Einstandswert aller Coins)
  Hashrate        CoinMetrics Community API     Rechenleistung des Bitcoin-Netzes
  VIX, Dollar, US-Zins 10 J., Notenbank-Bilanz  FRED (US-Notenbank St. Louis): VIXCLS, DTWEXBGS, DGS10, WALCL
  Stablecoins     DefiLlama                     Gesamtmenge aller Dollar-Stablecoins (Liquidität im Kryptomarkt)

Jede Reihe wird als {Datum: Wert} in tools/trading/daten/info_<name>.json zwischengespeichert (höchstens einmal pro Tag neu).
`python3 tools/trading/krypto_bot/infos.py` zeigt das heutige Lagebild.
"""
from __future__ import annotations

import csv
import io
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
DATEN = HIER.parent / "daten"
UA = {"User-Agent": "Mozilla/5.0 (aban-krypto-pilot)"}
FRED = {"vix": "VIXCLS", "dollar": "DTWEXBGS", "zins10": "DGS10", "bilanz": "WALCL"}


def _hole(url, versuche=3, kopf=None):
    for n in range(versuche):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=kopf or UA), timeout=40) as r:
                return r.read().decode("utf-8")
        except Exception:  # noqa: BLE001
            if n == versuche - 1:
                raise
            time.sleep(3 * (n + 1))


def _tag(ts):
    return datetime.fromtimestamp(int(ts), timezone.utc).date().isoformat()


def angst_gier():
    d = json.loads(_hole("https://api.alternative.me/fng/?limit=0&format=json"))["data"]
    return {_tag(x["timestamp"]): float(x["value"]) for x in d}


def _ab(alt, tage=5):
    return (datetime.fromisoformat(max(alt)) - timedelta(days=tage)).date().isoformat() if alt else None


def coinmetrics(asset, metrik, alt=None):
    out = dict(alt or {})
    url = ("https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?" + urllib.parse.urlencode(
        {"assets": asset, "metrics": metrik, "frequency": "1d", "page_size": 10000, "start_time": _ab(alt) or "2010-01-01"}))
    while url:
        d = json.loads(_hole(url))
        for x in d["data"]:
            if x.get(metrik) not in (None, ""):
                out[x["time"][:10]] = float(x[metrik])
        url = d.get("next_page_url")
    return out


def fred(reihe):
    out = {}
    # FRED trennt Verbindungen mit Browser-Kennung ohne Antwort; die Kennung eines Kommandozeilen-Werkzeugs geht durch.
    roh = _hole(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={reihe}", kopf={"User-Agent": "curl/8.5.0", "Accept": "*/*"})
    for z in csv.reader(io.StringIO(roh)):
        if len(z) == 2 and z[0][:2] in ("19", "20"):
            try:
                out[z[0]] = float(z[1])
            except ValueError:
                pass  # «.» = kein Wert (Feiertag)
    return out


def funding_okx(inst):
    """Die letzten ~3 Monate von OKX (BitMEX liefert teils mit Verzug)."""
    tage, nach = {}, ""
    for _ in range(10):
        d = json.loads(_hole(f"https://www.okx.com/api/v5/public/funding-rate-history?instId={inst}&limit=100{nach}"))["data"]
        if not d:
            break
        for x in d:
            tage.setdefault(_tag(int(x["fundingTime"]) // 1000), []).append(float(x["realizedRate"] or x["fundingRate"]))
        nach = f"&after={min(int(x['fundingTime']) for x in d)}"
        time.sleep(0.3)
    return {t: sum(v) / len(v) for t, v in tage.items()}


def funding(symbol, okx=None, alt=None):
    """Tagesmittel der 8-Stunden-Funding-Sätze (0.0001 = 0,01 % je 8 h). BitMEX seit 2016, neueste Tage ergänzt aus OKX."""
    tage, start, ab = {}, 0, _ab(alt)
    while True:
        url = f"https://www.bitmex.com/api/v1/funding?symbol={symbol}&count=500&start={start}&reverse=false" + (f"&startTime={ab}" if ab else "")
        d = json.loads(_hole(url))
        for x in d:
            tage.setdefault(x["timestamp"][:10], []).append(float(x["fundingRate"]))
        if len(d) < 500:
            break
        start += 500
        time.sleep(2.1)  # BitMEX: 30 Anfragen pro Minute ohne Konto
    out = {**(alt or {}), **{t: sum(v) / len(v) for t, v in tage.items()}}
    if okx:
        try:
            letzt = max(out) if out else ""
            out.update({t: v for t, v in funding_okx(okx).items() if t > letzt})
        except Exception:  # noqa: BLE001
            pass
    return out


def stablecoins():
    d = json.loads(_hole("https://stablecoins.llama.fi/stablecoincharts/all"))
    return {_tag(x["date"]): float(sum((x.get("totalCirculatingUSD") or {}).values())) for x in d}


# Jede Quelle bekommt den gespeicherten Stand (alt) und lädt, wo möglich, nur die letzten Tage nach.
QUELLEN = {
    "angst_gier": lambda alt: angst_gier(),
    "funding_btc": lambda alt: funding("XBTUSD", "BTC-USDT-SWAP", alt), "funding_eth": lambda alt: funding("ETHUSD", "ETH-USDT-SWAP", alt),
    "mvrv_btc": lambda alt: coinmetrics("btc", "CapMVRVCur", alt), "mvrv_eth": lambda alt: coinmetrics("eth", "CapMVRVCur", alt),
    "hashrate": lambda alt: coinmetrics("btc", "HashRate", alt),
    "stablecoins": lambda alt: stablecoins(),
    **{name: (lambda alt, r=fid: fred(r)) for name, fid in FRED.items()},
}


def reihe(name, neu=False, max_alter_h=20):
    """{Datum: Wert} aus dem Zwischenspeicher, sonst aus dem Netz. Fällt das Netz aus, gilt der alte Stand."""
    datei = DATEN / f"info_{name}.json"
    frisch = datei.exists() and time.time() - datei.stat().st_mtime < max_alter_h * 3600
    if datei.exists() and (frisch and not neu):
        return json.loads(datei.read_text())
    try:
        d = QUELLEN[name](json.loads(datei.read_text()) if datei.exists() and not neu else None)
        if not d:
            raise ValueError("leer")
        DATEN.mkdir(exist_ok=True)
        datei.write_text(json.dumps(d, sort_keys=True))
        return d
    except Exception as ex:  # noqa: BLE001
        if datei.exists():
            print(f"Info {name}: Netz-Fehler ({type(ex).__name__}), nehme gespeicherten Stand.")
            return json.loads(datei.read_text())
        print(f"Info {name}: nicht verfügbar ({type(ex).__name__}).")
        return {}


def stand(d, tag, verzug=1):
    """Letzter Wert, der am Schluss von `tag` schon bekannt war: Datum ≤ tag − verzug Tage (keine Zukunftsdaten)."""
    grenze = (datetime.fromisoformat(tag) - timedelta(days=verzug)).date().isoformat()
    kandidaten = [t for t in d if t <= grenze]
    return (max(kandidaten), d[max(kandidaten)]) if kandidaten else (None, None)


def auf_tage(d, tage, verzug=1):
    """Reihe auf die Handelstage legen, mit Verzug und Vorwärts-Füllung (Wochenenden, Feiertage). None vor Datenbeginn."""
    schluessel = sorted(d)
    out, j, letzt = [], 0, None
    for t in tage:
        grenze = (datetime.fromisoformat(t) - timedelta(days=verzug)).date().isoformat()
        while j < len(schluessel) and schluessel[j] <= grenze:
            letzt = d[schluessel[j]]
            j += 1
        out.append(letzt)
    return out


def lagebild(neu=False):
    """Heutige Werte aller Infos (was am Schluss von gestern bekannt war)."""
    heute = datetime.now(timezone.utc).date().isoformat()
    lage = {}
    for name in QUELLEN:
        d = reihe(name, neu)
        if d:
            t, v = stand(d, heute, 2 if name == "bilanz" else 1)
            lage[name] = {"tag": t, "wert": v}
    return lage


def text(lage, heute=None):
    heute = heute or datetime.now(timezone.utc).date().isoformat()

    def w(name, fmt):
        x = lage.get(name)
        if not x or x["wert"] is None:
            return "—"
        alt = (datetime.fromisoformat(heute) - datetime.fromisoformat(x["tag"])).days > (9 if name == "bilanz" else 5)
        return fmt.format(x["wert"]) + (f" (Stand {x['tag']})" if alt else "")
    return (f"Angst&Gier {w('angst_gier', '{:.0f}')} · Funding BTC {w('funding_btc', '{:.4%}')} ETH {w('funding_eth', '{:.4%}')} je 8 h"
            f" · MVRV BTC {w('mvrv_btc', '{:.2f}')} ETH {w('mvrv_eth', '{:.2f}')} · VIX {w('vix', '{:.1f}')}"
            f" · US-Zins 10 J. {w('zins10', '{:.2f}')} %")


if __name__ == "__main__":
    print(text(lagebild("--neu" in sys.argv)))
