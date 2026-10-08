#!/usr/bin/env python3
"""Prüfstand für den Krypto-Pilot: Stop, Parameter-Robustheit und Ethereum — mit vorab festgelegter Entscheidungsregel.

Entscheidungsregel (VOR dem Rechnen festgelegt): Ein Standardwert wird nur geändert, wenn die Alternative in ALLEN
geprüften Zeiträumen ein besseres Verhältnis von Jahresrendite zu schlimmstem Einbruch hat (MAR = Rendite ÷ |Einbruch|).
Sonst bleibt der bisherige Wert — auch wenn eine Variante in einem Zeitraum glänzt.

Modell wie futures.py (Gebühr 0,05 %, Funding 0,01 % je 8 h, Liquidation über Tagestief/-hoch), zusätzlich:
  • Börsen-Stop wie live: jeden Tag neu, Abstand = k × Tages-Schwankung × Schlusskurs des Vortags; wird er im Tagesverlauf
    erreicht, endet die Position zum Stop-Kurs minus 0,1 % Schlupf. Am nächsten Tag steigt der Pilot gemäss Signal wieder ein.
Aufruf: python3 tools/trading/krypto_bot/pilot_pruefung.py [--neu]
"""
from __future__ import annotations

import json
import math
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[2]
AUSGABE = ROOT / "data" / "krypto-pilot-pruefung.json"
GEBUEHR, FUNDING, MARGE_MIN, BAND, SCHLUPF = 0.0005, 0.0001, 0.005, 0.25, 0.001


def ohlc(sym):
    datei = HIER.parent / "daten" / f"{sym}_hlc.json"  # eigenes Format (Tag, Hoch, Tief, Schluss) — futures.py nutzt *_ohlc.json
    if not datei.exists() or "--neu" in sys.argv:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?period1=1410912000&period2={int(time.time())}&interval=1d"
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=30) as r:
            d = json.load(r)["chart"]["result"][0]
        q = d["indicators"]["quote"][0]
        rows = [(datetime.fromtimestamp(t, timezone.utc).date().isoformat(), hh, ll, cc)
                for t, hh, ll, cc in zip(d["timestamp"], q["high"], q["low"], q["close"]) if None not in (hh, ll, cc)]
        heute = datetime.now(timezone.utc).date().isoformat()
        rows = [r for r in rows if r[0] < heute]  # laufender Tag zählt nicht
        datei.parent.mkdir(exist_ok=True)
        datei.write_text(json.dumps(rows))
    rows = json.loads(datei.read_text())
    return {r[0]: (r[1], r[2], r[3]) for r in rows}


def sma(p, n):
    o, s = [None] * len(p), 0.0
    for i, x in enumerate(p):
        s += x
        if i >= n:
            s -= p[i - n]
        if i >= n - 1:
            o[i] = s / n
    return o


def vol(p):
    var, o = None, [None] * len(p)
    for i in range(1, len(p)):
        r = p[i] / p[i - 1] - 1
        var = r * r if var is None else 0.94 * var + 0.06 * r * r
        if i >= 30:
            o[i] = math.sqrt(var * 365)
    return o


def hebel(c, n_sma=200, ziel_vol=0.40, short=True, max_hebel=1.0):
    s, v = sma(c, n_sma), vol(c)
    z = []
    for i in range(len(c)):
        if s[i] is None or v[i] is None:
            z.append(0.0)
            continue
        r = 1.0 if c[i] > s[i] else (-1.0 if short else 0.0)
        z.append(r * min(max_hebel, ziel_vol / v[i]))
    return z


def lauf(z, h, l, c, a, b, stop_k=None):
    """Kontowert-Verlauf (Start 1.0) von Tag a bis b. Gibt Liste der Tageswerte und Anzahl Stop-Auslösungen zurück."""
    v = vol(c)
    E, N, werte, stops = 1.0, 0.0, [1.0], 0
    for i in range(max(a, 1), b):
        ziel = z[i - 1]
        ist = N / E if E > 0 else 0.0
        if (ziel == 0 and N != 0) or (ziel != 0 and (abs(ist - ziel) > BAND or (ist > 0) != (ziel > 0) or N == 0)):
            neu = ziel * E
            E -= abs(neu - N) * GEBUEHR
            N = neu
        if N != 0:
            ref = c[i - 1]
            if stop_k and v[i - 1]:
                abstand = stop_k * v[i - 1] / math.sqrt(365) * ref
                stop = ref - abstand if N > 0 else ref + abstand
                if (N > 0 and l[i] <= stop) or (N < 0 and h[i] >= stop):
                    aus = stop * (1 - SCHLUPF) if N > 0 else stop * (1 + SCHLUPF)
                    E += N * (aus / ref - 1) - abs(N) * GEBUEHR
                    N, stops = 0.0, stops + 1
                    werte.append(E)
                    continue
            extrem = l[i] if N > 0 else h[i]
            if E + N * (extrem / ref - 1) <= MARGE_MIN * abs(N * extrem / ref):
                werte.append(0.0)
                return werte, stops
            E += N * (c[i] / ref - 1) - abs(N) * FUNDING * 3 * (1 if N > 0 else -1)
            N *= c[i] / ref
        werte.append(E)
    return werte, stops


def kennz(werte):
    spitze, dd = werte[0], 0.0
    for w in werte:
        spitze = max(spitze, w)
        dd = min(dd, w / spitze - 1 if spitze > 0 else -1)
    jahre = (len(werte) - 1) / 365
    cagr = (werte[-1] / werte[0]) ** (1 / jahre) - 1 if werte[-1] > 0 and jahre > 0 else -1.0
    return {"cagr": cagr, "einbruch": dd, "mar": cagr / abs(dd) if dd < 0 else float("inf")}


def ausrichten(daten):
    tage = sorted(set.intersection(*[set(d) for d in daten]))
    return tage, [([d[t][0] for t in tage], [d[t][1] for t in tage], [d[t][2] for t in tage]) for d in daten]


def main():
    btc, eth = ohlc("BTC-USD"), ohlc("ETH-USD")
    erg = {"stand": max(btc), "regel": "Änderung nur, wenn MAR in allen Zeiträumen besser", "tests": {}}
    tage_b = sorted(btc)
    h, l, c = [btc[t][0] for t in tage_b], [btc[t][1] for t in tage_b], [btc[t][2] for t in tage_b]
    zeiten = {"ab 2015": "2015-01-01", "ab 2018": "2018-01-01", "ab 2022": "2022-01-01"}

    def block(name, varianten, h, l, c, tage, zeiten):
        print(f"\n== {name}")
        print(f"{'Variante':28}" + "".join(f"{z:>26}" for z in zeiten))
        res = {}
        for vname, (z, stop_k) in varianten.items():
            zeile, res[vname] = f"{vname:28}", {}
            for zn, start in zeiten.items():
                a = next(i for i, t in enumerate(tage) if t >= start)
                w, n_stop = lauf(z, h, l, c, a, len(c), stop_k)
                k = kennz(w)
                res[vname][zn] = {**k, "stops": n_stop}
                zeile += f"{k['cagr'] * 100:8.1f}% {k['einbruch'] * 100:5.0f}% MAR {k['mar']:4.2f}"
            print(zeile)
        erg["tests"][name] = res
        return res

    basis = hebel(c)
    block("1) Börsen-Stop (k × Tages-Schwankung)", {
        "kein Stop": (basis, None), "Stop 3σ": (basis, 3), "Stop 4σ (bisher live)": (basis, 4), "Stop 6σ": (basis, 6),
        "Stop 8σ": (basis, 8)}, h, l, c, tage_b, zeiten)
    block("2) Robustheit Trendlänge", {f"Schnitt {n} Tage": (hebel(c, n_sma=n), None) for n in (100, 150, 200, 250, 300)},
          h, l, c, tage_b, zeiten)
    block("3) Robustheit Schwankungsziel", {f"Ziel {int(v * 100)} %": (hebel(c, ziel_vol=v), None) for v in (0.30, 0.40, 0.50, 0.60)},
          h, l, c, tage_b, zeiten)

    # 2b) Trendlänge 150 gegen 200 auf GETRENNTEN Abschnitten (keine Überlappung → kein Mehrfachzählen derselben Jahre)
    tage, ((hb, lb, cb), (he, le, ce)) = ausrichten([btc, eth])
    abschnitte = [("2015-01-01", "2018-01-01"), ("2018-01-01", "2022-01-01"), ("2022-01-01", "9999")]
    print("\n== 2b) Trendlänge 150 vs. 200 auf getrennten Abschnitten (MAR)")
    res = {}
    for coin, (hh, ll, cc, tt) in {"BTC": (h, l, c, tage_b), "ETH": (he, le, ce, tage)}.items():
        res[coin] = {}
        for von, bis in abschnitte:
            if von < tt[0]:
                continue
            a = next(i for i, t in enumerate(tt) if t >= von)
            b = next((i for i, t in enumerate(tt) if t >= bis), len(cc))
            zeile = {n: kennz(lauf(hebel(cc, n_sma=n), hh, ll, cc, a, b)[0]) for n in (150, 200)}
            res[coin][f"{von[:4]}–{bis[:4] if bis != '9999' else 'heute'}"] = zeile
            print(f"  {coin} {von[:4]}–{bis[:4] if bis != '9999' else 'heute':5}  150: {zeile[150]['cagr'] * 100:6.1f} %/J MAR {zeile[150]['mar']:5.2f}"
                  f"  |  200: {zeile[200]['cagr'] * 100:6.1f} %/J MAR {zeile[200]['mar']:5.2f}")
    erg["tests"]["2b) Trendlänge getrennte Abschnitte"] = res

    # 4) Ethereum dazu: zwei getrennte Teilkonten à 50 %, gleiche Regel je Coin
    zeiten2 = {"ab 2019": "2019-01-01", "ab 2022": "2022-01-01"}
    print("\n== 4) Bitcoin allein vs. Bitcoin + Ethereum (je 50 %)")
    res = {}
    for zn, start in zeiten2.items():
        a = next(i for i, t in enumerate(tage) if t >= start)
        wb, _ = lauf(hebel(cb), hb, lb, cb, a, len(cb))
        we, _ = lauf(hebel(ce), he, le, ce, a, len(ce))
        mix = [0.5 * x + 0.5 * y for x, y in zip(wb, we)]
        kb, km = kennz(wb), kennz(mix)
        res[zn] = {"btc": kb, "btc_eth": km}
        print(f"  {zn}: BTC allein {kb['cagr'] * 100:6.1f}% Einbruch {kb['einbruch'] * 100:4.0f}% MAR {kb['mar']:.2f} | "
              f"BTC+ETH {km['cagr'] * 100:6.1f}% Einbruch {km['einbruch'] * 100:4.0f}% MAR {km['mar']:.2f}")
    erg["tests"]["4) Bitcoin + Ethereum"] = res
    AUSGABE.write_text(json.dumps(erg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
