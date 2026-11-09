#!/usr/bin/env python3
"""Unsicherheit und Zerlegung: Alpha/Beta gegen Bitcoin und Block-Bootstrap der Renditedifferenzen (nur lesend).

Alles auf den Tagesrenditen der Wertreihe aus pruefung1.werte_reihe (gleiche Regeln wie labor.simulieren, dort
auf 1,8e-15 nachgerechnet). Basis-Kosten (20 bp je Richtung). Bootstrap: gleitende Blöcke von 20 Tagen, 4000 Ziehungen.
"""
import importlib.util
import math
import random
from pathlib import Path

HIER = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('pruefung1', HIER / 'pruefung1.py')
P1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(P1)
L, p, tage, qs = P1.L, P1.p, P1.tage, P1.qs

KOSTEN = sum(L.PROTOKOLL['kosten_szenarien_bp']['basis'].values()) / 10000
BAND = L.PROTOKOLL['handelsband']
PER = P1.perioden()


def tagesrenditen(name, start, stop):
    band = BAND if name not in ('Halten', 'Trend 200') else 0.0
    nav, _ = P1.werte_reihe(p[:stop], qs[name][:stop], KOSTEN, start, band)
    return [nav[i] / nav[i - 1] - 1 for i in range(1, len(nav))]


def btc_renditen(start, stop):
    return [p[i] / p[i - 1] - 1 for i in range(start, stop)]


def alpha_beta(rs, rb):
    n = len(rs)
    ms, mb = sum(rs) / n, sum(rb) / n
    cov = sum((a - ms) * (b - mb) for a, b in zip(rs, rb)) / (n - 1)
    var = sum((b - mb) ** 2 for b in rb) / (n - 1)
    beta = cov / var
    alpha = (ms - beta * mb) * 365
    return alpha, beta


def block_idx(n, laenge, rnd):
    idx = []
    while len(idx) < n:
        s = rnd.randrange(0, n - laenge + 1)
        idx.extend(range(s, s + laenge))
    return idx[:n]


def quantile(xs, q):
    xs = sorted(xs)
    return xs[int(q * (len(xs) - 1))]


def main():
    rnd = random.Random(20261109)
    namen = [n for n in qs if n != 'Halten']
    # Tagesrenditen je Periode, zu einer Reihe über beide Perioden zusammengesetzt
    daten = {n: [] for n in namen}
    btc = []
    perioden_teile = {}
    for beginn, (start, stop) in PER.items():
        rb = btc_renditen(start, stop)
        # Wertreihe beginnt mit Tag 'start' (Iteration start liefert die erste Rendite): Längen prüfen
        for n in namen:
            r = tagesrenditen(n, start, stop)
            assert len(r) == len(rb), (len(r), len(rb))
            daten[n] += r
            perioden_teile.setdefault(beginn, {})[n] = r
        btc += rb
        perioden_teile[beginn]['BTC'] = rb
    print(f'Tage: {len(btc)} (Periode 1: {len(perioden_teile["2022-01-01"]["BTC"])}, Periode 2: {len(perioden_teile["2024-01-01"]["BTC"])})')

    print('\nA) Alpha (Jahreswert, in Prozentpunkten) und Beta gegen Bitcoin, 90-%-Intervall aus Block-Bootstrap')
    print(f"{'Strategie':22} | {'Periode 1: Alpha':>22} {'Beta':>5} | {'Periode 2: Alpha':>22} {'Beta':>5} | {'beide: Alpha':>22} {'Beta':>5}")
    for n in namen:
        zeilen = []
        for teil in (('2022-01-01',), ('2024-01-01',), ('2022-01-01', '2024-01-01')):
            rs = sum((perioden_teile[b][n] for b in teil), [])
            rb = sum((perioden_teile[b]['BTC'] for b in teil), [])
            a0, b0 = alpha_beta(rs, rb)
            alphas = []
            m = len(rs)
            for _ in range(2000):
                idx = block_idx(m, 20, rnd)
                a, _b = alpha_beta([rs[i] for i in idx], [rb[i] for i in idx])
                alphas.append(a)
            lo, hi = quantile(alphas, 0.05), quantile(alphas, 0.95)
            zeilen.append(f'{a0*100:6.1f} [{lo*100:6.1f};{hi*100:6.1f}] {b0:5.2f}')
        print(f'{n:22} | ' + ' | '.join(zeilen))

    print('\nB) Mittlere jährliche Renditedifferenz (Konsens gegen andere), beide Perioden zusammen, 90-%-Intervall, Anteil der Ziehungen mit Differenz > 0')
    vergleich = [('Konsens 150/200', 'Halten Risiko 25'), ('Konsens 150/200', 'Trend 200 Risiko 25'),
                 ('Konsens 150/200', 'Trend 150 Risiko 25'), ('Konsens 150/200', 'Trend 200')]
    for a, b in vergleich:
        d = [x - y for x, y in zip(daten[a], daten[b])]
        m = len(d)
        d0 = sum(d) / m * 365
        zieh = []
        for _ in range(4000):
            idx = block_idx(m, 20, rnd)
            zieh.append(sum(d[i] for i in idx) / m * 365)
        pos = sum(1 for z in zieh if z > 0) / len(zieh)
        print(f'  {a} − {b}: {d0*100:+6.1f} pp/Jahr  [{quantile(zieh,0.05)*100:+6.1f}; {quantile(zieh,0.95)*100:+6.1f}]  Anteil > 0: {pos*100:4.0f} %')

    print('\nC) Dasselbe je Periode für Konsens − Halten Risiko 25 (Rendite pp/Jahr)')
    for beginn in PER:
        d = [x - y for x, y in zip(perioden_teile[beginn]['Konsens 150/200'], perioden_teile[beginn]['Halten Risiko 25'])]
        m = len(d)
        d0 = sum(d) / m * 365
        zieh = []
        for _ in range(4000):
            idx = block_idx(m, 20, rnd)
            zieh.append(sum(d[i] for i in idx) / m * 365)
        print(f'  Periode {beginn}: {d0*100:+6.1f} pp/Jahr [{quantile(zieh,0.05)*100:+6.1f}; {quantile(zieh,0.95)*100:+6.1f}]  Anteil > 0: {sum(1 for z in zieh if z>0)/len(zieh)*100:4.0f} %')

    print('\nD) Sharpe-ähnlich (mittlere Tagesrendite·365 / (Tages-Stdev·√365), ohne Zins), beide Perioden zusammen')
    for n in namen + ['BTC']:
        r = daten[n] if n != 'BTC' else btc
        m = sum(r) / len(r)
        s = (sum((x - m) ** 2 for x in r) / (len(r) - 1)) ** 0.5
        print(f'  {n:22} {m*365/(s*math.sqrt(365)):5.2f}  (Rendite/Jahr {m*365*100:6.1f} %, Schwankung {s*math.sqrt(365)*100:5.1f} %)')
    globals()['teil_e_f'](daten, namen, btc)


# ---------------------------------------------------------------- E) Parameter-Nachbarschaft, F) Deflated Sharpe Ratio
from statistics import NormalDist, stdev


def konsens_quoten(preise, a, b, vol_ziel, vol_tage=30):
    """Konsens-Regel mit frei wählbaren Fenstern (gleiche Definition wie labor.signale)."""
    out = []
    for t in range(len(preise)):
        if t < max(b - 1, vol_tage):
            out.append(0.0)
            continue
        ma_a = sum(preise[t - a + 1:t + 1]) / a
        ma_b = sum(preise[t - b + 1:t + 1]) / b
        r = [preise[j] / preise[j - 1] - 1 for j in range(t - vol_tage + 1, t + 1)]
        vol = stdev(r) * math.sqrt(365)
        q = min(1.0, vol_ziel / vol) if vol > 0 else 0.0
        out.append(q if (preise[t] > ma_a and preise[t] > ma_b) else 0.0)
    return out


def sr_daily(r):
    m = sum(r) / len(r)
    s = (sum((x - m) ** 2 for x in r) / (len(r) - 1)) ** 0.5
    return m / s


def momente(r):
    n = len(r)
    m = sum(r) / n
    m2 = sum((x - m) ** 2 for x in r) / n
    m3 = sum((x - m) ** 3 for x in r) / n
    m4 = sum((x - m) ** 4 for x in r) / n
    return m3 / m2 ** 1.5, m4 / m2 ** 2


def psr(sr, sr_stern, T, skew, kurt):
    z = (sr - sr_stern) * math.sqrt(T - 1) / math.sqrt(1 - skew * sr + (kurt - 1) / 4 * sr * sr)
    return NormalDist().cdf(z)


def sr0(v, n):
    g = 0.5772156649015329
    zi = NormalDist().inv_cdf
    return math.sqrt(v) * ((1 - g) * zi(1 - 1 / n) + g * zi(1 - 1 / (n * math.e)))


def teil_e_f(daten, namen, btc):
    print('\nE) Parameter-Nachbarschaft des Konsens (24 Konfigurationen, beide Perioden, Basis-Kosten)')
    raster = []
    for a in (100, 150):
        for b in (200, 250):
            for ziel in (0.20, 0.25, 0.30):
                for band in (0.05, 0.10):
                    raster.append((a, b, ziel, band))
    ergeb = []
    for a, b, ziel, band in raster:
        q = konsens_quoten(p, a, b, ziel)
        r_gesamt, dd_p, tot = [], [], 1.0
        for beginn, (start, stop) in PER.items():
            nav, _ = P1.werte_reihe(p[:stop], q[:stop], KOSTEN, start, band)
            rr = [nav[i] / nav[i - 1] - 1 for i in range(1, len(nav))]
            r_gesamt += rr
            rend, dd, _v = P1.kennzahlen(nav)
            dd_p.append(dd)
            tot *= 1 + rend
        ergeb.append(((a, b, ziel, band), tot - 1, min(dd_p), sr_daily(r_gesamt) * math.sqrt(365), r_gesamt))
    ergeb.sort(key=lambda x: -x[3])
    rang_codex = next(i for i, e in enumerate(ergeb, 1) if e[0] == (150, 200, 0.25, 0.10))
    print(f'  Sharpe-ähnlich: min {min(e[3] for e in ergeb):.2f}, Median {sorted(e[3] for e in ergeb)[len(ergeb)//2]:.2f}, max {max(e[3] for e in ergeb):.2f}; '
          f'Codex-Wahl (150/200, 25 %, Band 10 %) liegt auf Rang {rang_codex} von {len(ergeb)}')
    gesamt = sorted(e[1] for e in ergeb)
    print(f'  Gesamtrendite beider Perioden: min {gesamt[0]*100:.0f} %, Median {gesamt[len(gesamt)//2]*100:.0f} %, max {gesamt[-1]*100:.0f} %; '
          f'Codex-Wahl {next(e[1] for e in ergeb if e[0]==(150,200,0.25,0.10))*100:.0f} %')
    for e in ergeb[:3] + [e for e in ergeb if e[0] == (150, 200, 0.25, 0.10)] + ergeb[-2:]:
        print(f'    {e[0]}  Rendite {e[1]*100:6.1f} %  schlimmster Einbruch {e[2]*100:6.1f} %  Sharpe {e[3]:5.2f}')

    print('\nF) Deflated Sharpe Ratio (Bailey und López de Prado 2014, Gl. 2): Wahrscheinlichkeit, dass das wahre Sharpe über der Schwelle liegt')
    T = len(btc)
    srs = {n: sr_daily(daten[n]) for n in namen}
    v_lab = sum((x - sum(srs.values()) / len(srs)) ** 2 for x in srs.values()) / (len(srs) - 1)
    v_raster = None
    srr = [sr_daily(e[4]) for e in ergeb]
    mr = sum(srr) / len(srr)
    v_raster = sum((x - mr) ** 2 for x in srr) / (len(srr) - 1)
    print(f'  T = {T} Tage; Varianz der Tages-Sharpe über die 5 Lab-Strategien {v_lab:.2e}, über die 24 Konfigurationen {v_raster:.2e}')
    print(f"  {'Strategie':22} {'SR/Jahr':>7} {'Schiefe':>7} {'Kurtosis':>8} {'PSR(0)':>7} | DSR bei N = 5 / 10 / 24 / 50 / 100 (Varianz aus dem Raster)")
    for n in namen + ['BTC']:
        r = daten[n] if n != 'BTC' else btc
        sr = sr_daily(r)
        sk, ku = momente(r)
        zeile = [psr(sr, 0.0, T, sk, ku)]
        dsr = [psr(sr, sr0(v_raster, N), T, sk, ku) for N in (5, 10, 24, 50, 100)]
        print(f"  {n:22} {sr*math.sqrt(365):7.2f} {sk:7.2f} {ku:8.1f} {zeile[0]:7.2f} | " + ' / '.join(f'{x:.2f}' for x in dsr))
    sr = sr_daily(daten['Konsens 150/200'])
    sk, ku = momente(daten['Konsens 150/200'])
    mintrl = 1 + (1 - sk * sr + (ku - 1) / 4 * sr * sr) * (NormalDist().inv_cdf(0.95) / sr) ** 2
    print(f'  Mindestlänge der Messreihe, damit das Sharpe des Konsens (SR*=0, 95 %) belegt wäre: {mintrl:.0f} Tage = {mintrl/365:.1f} Jahre (vorhanden: {T/365:.1f} Jahre)')
    print(f'  Schwelle SR_0 für N=24 (Raster-Varianz): {sr0(v_raster,24)*math.sqrt(365):.2f} pro Jahr; für N=100: {sr0(v_raster,100)*math.sqrt(365):.2f}')
    return ergeb




if __name__ == '__main__':
    main()
