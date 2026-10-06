#!/usr/bin/env python3
"""Ehrlicher Futures-Test: Was bringt Hebel auf Bitcoin wirklich?

Modell (Bitcoin-Perpetual, wie bei Binance Futures):
  • Entscheidung am Tagesschluss, Position gilt ab dem nächsten Tag (kein Blick in die Zukunft).
  • Hebel = Positionsgrösse ÷ Kontowert. Umgeschichtet wird nur, wenn der Hebel mehr als 0,25 vom Ziel abweicht
    oder die Richtung wechselt (sonst würde tägliches Nachjustieren die Gebühren explodieren lassen).
  • Gebühr 0,05 % auf jeden gehandelten Betrag (Binance-Futures, Taker).
  • Funding: Longs zahlen FUNDING je 8 Stunden auf ihre Position, Shorts bekommen es (Standard 0,01 % = Binance-Basiszins;
    in Boomphasen war es oft deutlich höher, darum zusätzlich 0,03 %).
  • Liquidation: Reicht das Tagestief (Long) bzw. Tageshoch (Short), um das Konto unter die Mindestmarge (0,5 % der
    Position) zu drücken, ist das ganze Konto weg — so, als läge alles als Sicherheit auf dem Futures-Konto.
Getestet wird ab 2015 (ganze Zeit) und ab 2022 (ungesehener Teil der Krypto-Analyse). Keine Anlageberatung.

Aufruf: python3 tools/trading/krypto_bot/futures.py [--neu]   (--neu = Kurse frisch laden)
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[2]
DATEN = HIER.parent / "daten" / "BTC-USD_ohlc.json"
AUSGABE = ROOT / "data" / "krypto-futures-test.json"
GEBUEHR = 0.0005
MARGE_MIN = 0.005
BAND = 0.25


def hole():
    """Tageskurse mit Hoch/Tief von Yahoo Finance (gratis, ohne Schlüssel) in den lokalen Cache."""
    import time
    import urllib.request
    from datetime import datetime, timezone
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?period1=1410912000&period2={int(time.time())}&interval=1d"
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=30) as r:
        d = json.load(r)["chart"]["result"][0]
    q = d["indicators"]["quote"][0]
    rows = [(datetime.fromtimestamp(t, timezone.utc).date().isoformat(), o, hh, ll, cc)
            for t, o, hh, ll, cc in zip(d["timestamp"], q["open"], q["high"], q["low"], q["close"]) if None not in (o, hh, ll, cc)]
    DATEN.parent.mkdir(exist_ok=True)
    DATEN.write_text(json.dumps(rows))


def lade():
    if not DATEN.exists() or "--neu" in sys.argv:
        hole()
    rows = json.loads(DATEN.read_text())
    return [r[0] for r in rows], [r[2] for r in rows], [r[3] for r in rows], [r[4] for r in rows]


def sma(p, n):
    o, s = [None] * len(p), 0.0
    for i, x in enumerate(p):
        s += x
        if i >= n:
            s -= p[i - n]
        if i >= n - 1:
            o[i] = s / n
    return o


def ziele(c):
    """Ziel-Hebel je Tag (Entscheidung am Schluss von Tag i, positiv = Long, negativ = Short)."""
    n, s200 = len(c), sma(c, 200)
    var, vol = None, [None] * n
    for i in range(1, n):
        r = c[i] / c[i - 1] - 1
        var = r * r if var is None else 0.94 * var + 0.06 * r * r
        vol[i] = math.sqrt(var * 365)
    Z = {}
    for L in (1, 2, 3, 5, 10):
        Z[f"Long {L}×"] = [float(L)] * n
    Z["Schwankungsziel × 2"] = [0.0 if vol[i] is None else 2 * min(1.0, 0.40 / vol[i]) for i in range(n)]
    Z["Trend 200 Long/Short 1×"] = [0.0 if s200[i] is None else (1.0 if c[i] > s200[i] else -1.0) for i in range(n)]
    Z["Trend 200 Long/Short 2×"] = [0.0 if s200[i] is None else (2.0 if c[i] > s200[i] else -2.0) for i in range(n)]
    Z["Nur Short unter 200-Tage-Schnitt 1×"] = [0.0 if s200[i] is None or c[i] > s200[i] else -1.0 for i in range(n)]
    return Z


def lauf(z, h, l, c, a, b, funding):
    """Kontowert-Verlauf ab Tag a bis b (Start 1.0). Gibt (Tagesrenditen, liquidiert_am, gebuehren, funding_summe)."""
    E, N, out, geb, fund = 1.0, 0.0, [], 0.0, 0.0
    for i in range(max(a, 1), b):
        ziel = z[i - 1]
        ist = N / E if E > 0 else 0.0
        if (ziel == 0 and N != 0) or (ziel != 0 and (abs(ist - ziel) > BAND or (ist > 0) != (ziel > 0))):
            neu = ziel * E
            g = abs(neu - N) * GEBUEHR
            E -= g
            geb += g
            N = neu
        vor = E
        if N != 0:
            extrem = l[i] if N > 0 else h[i]
            e_extrem = E + N * (extrem / c[i - 1] - 1)
            if e_extrem <= MARGE_MIN * abs(N * extrem / c[i - 1]):
                out.append(-1.0)
                return out, i, geb, fund
            f = abs(N) * funding * 3 * (1 if N > 0 else -1)
            E += N * (c[i] / c[i - 1] - 1) - f
            fund += f
            N *= c[i] / c[i - 1]
        out.append(E / vor - 1 if vor > 0 else 0.0)
    return out, None, geb, fund


def kennz(x, tage):
    w, spitze, dd = 1.0, 1.0, 0.0
    for v in x:
        w *= 1 + v
        spitze = max(spitze, w)
        dd = min(dd, w / spitze - 1)
    jahre = len(x) / 365
    return {"cagr": (w ** (1 / jahre) - 1) if w > 0 and jahre > 0 else -1.0, "endwert": w, "einbruch": dd}


def auswerten():
    tage, h, l, c = lade()
    Z = ziele(c)
    erg = {"stand": tage[-1], "gebuehr": GEBUEHR, "marge_min": MARGE_MIN, "zeitraeume": {}}
    for name_zr, start in (("2015 bis heute", "2015-01-01"), ("2022 bis heute (ungesehen)", "2022-01-01")):
        a = next(i for i, t in enumerate(tage) if t >= start)
        block = {}
        for funding in (0.0001, 0.0003):
            for name, z in Z.items():
                x, liq, geb, fund = lauf(z, h, l, c, a, len(c), funding)
                k = kennz(x, tage)
                block.setdefault(name, {})[f"funding_{funding * 100:.2f}"] = {
                    **k, "liquidiert": tage[liq] if liq else None, "gebuehren": geb, "funding": fund}
        erg["zeitraeume"][name_zr] = block
    return erg


def bericht(erg):
    for zr, block in erg["zeitraeume"].items():
        print(f"\n== {zr} (Funding 0,01 % / 0,03 % je 8 h, Gebühr {erg['gebuehr'] * 100:.2f} %)")
        print(f"{'Strategie':38} {'p.J. 0,01':>10} {'Einbruch':>9} {'p.J. 0,03':>10}  Liquidiert")
        for name, v in block.items():
            a, b = v["funding_0.01"], v["funding_0.03"]
            liq = a["liquidiert"] or b["liquidiert"] or "–"
            def f(k):
                return "  Konto weg" if k["liquidiert"] else f"{k['cagr'] * 100:9.1f}%"
            print(f"{name:38} {f(a):>10} {a['einbruch'] * 100:8.0f}% {f(b):>10}  {liq}")


def main():
    erg = auswerten()
    bericht(erg)
    AUSGABE.write_text(json.dumps(erg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
