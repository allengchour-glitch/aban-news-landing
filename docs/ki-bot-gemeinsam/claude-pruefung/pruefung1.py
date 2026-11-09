#!/usr/bin/env python3
"""Unabhängige Prüfung des Codex-Labors (docs/ki-bot-gemeinsam/labor.py), nur lesend.

Teil 1: eigene Nachrechnung der Simulation (Wertreihe statt nur Endwerten) gegen L.simulieren,
Teil 2: Rendite, Einbruch, Schwankung je Strategie und Jahr,
Teil 3: Exposure von Timing trennen (Vergleich mit fester Quote gleicher mittlerer Exposure).
"""
import importlib.util
import json
import math
import sys
from datetime import date
from pathlib import Path
from statistics import stdev

BASIS = Path(__file__).resolve().parents[3]   # Wurzel des Repositories
spec = importlib.util.spec_from_file_location('labor', BASIS / 'docs/ki-bot-gemeinsam/labor.py')
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)

tage, p, _ = L.laden(BASIS / 'tools/trading/daten/BTC-USD.json')
qs = L.signale(p)


def werte_reihe(p, ziel, kosten, start, band):
    """Eigene Nachrechnung: gleiche Regeln wie in der README, aber Wertreihe (NAV je Tag) als Ergebnis.
    Handel zum Schlusskurs i mit der Zielquote von Tag i-1; Bestand verdient ab dem Folgetag."""
    cash, bestand = 1.0, 0.0
    nav = [1.0]
    expo = []
    for i in range(start, len(p)):
        vor = cash + bestand
        expo.append(bestand / vor)
        bestand *= p[i] / p[i - 1]
        kap = cash + bestand
        w = ziel[i - 1]
        if w == 0 or abs(w - bestand / kap) >= band:
            # Zielgewicht nach Kosten: v = Handelsvolumen mit Vorzeichen
            if w * kap >= bestand:     # kaufen
                v = (w * kap - bestand) / (1 + w * kosten)
                neu = bestand + v
            else:                      # verkaufen
                neu = w * (kap - kosten * bestand) / (1 - w * kosten)
                v = bestand - neu
            cash = kap - neu - kosten * abs(neu - bestand)
            bestand = neu
        nav.append(cash + bestand)
    nav[-1] -= kosten * bestand       # Schlussliquidation
    return nav, expo


def kennzahlen(nav):
    hoch, dd = 1.0, 0.0
    for w in nav:
        hoch = max(hoch, w)
        dd = min(dd, w / hoch - 1)
    r = [nav[i] / nav[i - 1] - 1 for i in range(1, len(nav))]
    vol = stdev(r) * math.sqrt(365) if len(r) > 1 else 0.0
    return nav[-1] - 1, dd, vol


def perioden():
    out = {}
    for beginn, ende in L.PROTOKOLL['historische_teilperioden']:
        start = next((i for i, d in enumerate(tage) if d.isoformat() >= beginn), len(p))
        stop = next((i for i, d in enumerate(tage) if ende and d.isoformat() >= ende), len(p))
        out[beginn] = (start, stop)
    return out


def main():
    PER = perioden()
    kosten = {k: sum(v.values()) / 10000 for k, v in L.PROTOKOLL['kosten_szenarien_bp'].items()}
    print('Perioden (Index):', PER, '| Daten', tage[0], 'bis', tage[-1], '| n =', len(p))

    # --- Teil 1: Nachrechnung gegen L.simulieren, alle 36 Kombinationen
    maxabw = 0.0
    n = 0
    for beginn, (start, stop) in PER.items():
        for sz, c in kosten.items():
            for name, q in qs.items():
                band = L.PROTOKOLL['handelsband'] if name not in ('Halten', 'Trend 200') else 0.0
                ref = L.simulieren(p[:stop], q[:stop], c, start, band)
                nav, expo = werte_reihe(p[:stop], q[:stop], c, start, band)
                r, dd, vol = kennzahlen(nav)
                abw = max(abs(r - ref['rendite']), abs(dd - ref['max_einbruch']),
                          abs(sum(expo) / len(expo) - ref['exposure_schnitt']))
                maxabw = max(maxabw, abw)
                n += 1
    print(f'Teil 1: {n} Kombinationen nachgerechnet, größte Abweichung zu labor.simulieren: {maxabw:.2e}')

    # --- Teil 2: Tabelle Basis-Szenario
    c = kosten['basis']
    print('\nTeil 2: Basis-Szenario (20 bp je Richtung)')
    for beginn, (start, stop) in PER.items():
        print(f'\n  Periode ab {beginn}: {tage[start]} bis {tage[stop - 1]}')
        print(f"  {'Strategie':22} {'Rendite':>9} {'MaxDD':>8} {'Expo':>6} {'Vol':>6} {'R/|DD|':>7} {'Aufträge':>8}")
        for name, q in qs.items():
            band = L.PROTOKOLL['handelsband'] if name not in ('Halten', 'Trend 200') else 0.0
            ref = L.simulieren(p[:stop], q[:stop], c, start, band)
            print(f"  {name:22} {ref['rendite']*100:8.1f}% {ref['max_einbruch']*100:7.1f}% {ref['exposure_schnitt']:6.2f} "
                  f"{ref['vol_realisiert']*100:5.1f}% {ref['rendite']/abs(ref['max_einbruch']):7.2f} {ref['auftraege']:8d}")

    # --- Teil 3: Exposure von Timing trennen
    print('\nTeil 3: gleiche mittlere Exposure als feste Quote (Band 0,10), Basis-Kosten')
    for beginn, (start, stop) in PER.items():
        print(f'\n  Periode ab {beginn}')
        print(f"  {'Strategie':22} {'Expo':>5} | {'Rendite':>8} {'MaxDD':>7} | feste Quote: {'Rendite':>8} {'MaxDD':>7} | Differenz Rendite / DD")
        for name, q in qs.items():
            if name in ('Halten',):
                continue
            band = L.PROTOKOLL['handelsband'] if name not in ('Halten', 'Trend 200') else 0.0
            ref = L.simulieren(p[:stop], q[:stop], c, start, band)
            f = ref['exposure_schnitt']
            nav_b, _ = werte_reihe(p[:stop], [f] * stop, c, start, L.PROTOKOLL['handelsband'])
            rb, ddb, _ = kennzahlen(nav_b)
            print(f"  {name:22} {f:5.2f} | {ref['rendite']*100:7.1f}% {ref['max_einbruch']*100:6.1f}% |              "
                  f"{rb*100:7.1f}% {ddb*100:6.1f}% | {100*(ref['rendite']-rb):+6.1f} pp / {100*(ref['max_einbruch']-ddb):+5.1f} pp")

    # --- Teil 4: Rendite je Kalenderjahr (innerhalb der jeweiligen Periode)
    print('\nTeil 4: Rendite je Kalenderjahr (Basis-Kosten, Wertreihe der jeweiligen Periode)')
    jahre = {}
    for beginn, (start, stop) in PER.items():
        for name, q in qs.items():
            band = L.PROTOKOLL['handelsband'] if name not in ('Halten', 'Trend 200') else 0.0
            nav, _ = werte_reihe(p[:stop], q[:stop], c, start, band)
            # nav[k] gehört zu Tag start+k ... (nav[0] = Start, nav[k] = nach Iteration i=start+k-1) -> Tag start+k-1
            tage_nav = [tage[start]] + [tage[start + k - 1] for k in range(1, len(nav))]
            letzte = {}
            for k, d in enumerate(tage_nav):
                letzte[d.year] = k
            vor = 0
            for jahr in sorted(letzte):
                k = letzte[jahr]
                jahre.setdefault(name, {})[jahr] = nav[k] / nav[vor] - 1
                vor = k
    ys = sorted({y for v in jahre.values() for y in v})
    print(f"  {'Strategie':22}" + ''.join(f'{y:>9}' for y in ys))
    for name in qs:
        print(f'  {name:22}' + ''.join(f"{jahre[name].get(y, float('nan'))*100:8.1f}%" for y in ys))


if __name__ == '__main__':
    main()
