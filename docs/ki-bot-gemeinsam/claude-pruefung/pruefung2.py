#!/usr/bin/env python3
"""Gegenbeispiele zum Messgerät `signalpruefung` und Datenprüfung (nur lesend)."""
import importlib.util
import math
import random
from pathlib import Path

BASIS = Path(__file__).resolve().parents[3]   # Wurzel des Repositories
spec = importlib.util.spec_from_file_location('labor', BASIS / 'docs/ki-bot-gemeinsam/labor.py')
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)
tage, p, _ = L.laden(BASIS / 'tools/trading/daten/BTC-USD.json')
n = len(p)

# ---- A) Spärlicher Hellseher: schaut nur an jedem 97. Tag einen Tag in die Zukunft
def spaerlich(preise, jeder=97):
    m = len(preise)
    q = []
    for i in range(m):
        if i % jeder == 5 and i + 1 < m:
            q.append(1.0 if preise[i + 1] > preise[i] else 0.0)   # Zukunftswissen
        else:
            q.append(0.0)
    return {'X': q}

r = L.signalpruefung(p, spaerlich)
print('A) spärlicher Hellseher (jeder 97. Tag, i%97==5):')
print('   signalpruefung bestanden =', r['bestanden'], '| Fehler:', r['fehler'])
# Gegenprobe: ein dichter Hellseher wird erkannt
def dicht(preise):
    m = len(preise)
    return {'X': [1.0 if i + 1 < m and preise[i + 1] > preise[i] else 0.0 for i in range(m)]}
print('   dichter Hellseher bestanden =', L.signalpruefung(p, dicht)['bestanden'])

# Störungsprobe (Zukunft verändern, Vergangenheit muss gleich bleiben), 40 zufällige Schnittstellen
def stoerprobe(erzeuger, preise, schnitte=40, seed=1):
    rnd = random.Random(seed)
    voll = erzeuger(preise)
    gefunden = []
    for _ in range(schnitte):
        k = rnd.randrange(250, len(preise) - 2)
        gestoert = preise[:k + 1] + [x * rnd.uniform(0.5, 2.0) for x in preise[k + 1:]]
        teil = erzeuger(gestoert)
        for name in voll:
            if teil[name][:k + 1] != voll[name][:k + 1]:
                gefunden.append((k, name))
                break
    return gefunden
g = stoerprobe(spaerlich, p)
print(f'   Störungsprobe (40 zufällige Schnitte) findet den spärlichen Hellseher in {len(g)} von 40 Schnitten')
print('   Störungsprobe auf den echten Signalen:', len(stoerprobe(L.signale, p, schnitte=12)), 'Funde in 12 Schnitten')

# ---- B) Wirkung des spärlichen Hellsehers im Rechner (sieht der Bericht ihn?)
hell = spaerlich(p)['X']
ref = L.simulieren(p, [0.0] * n, 0.002, 201, 0.0)
sim = L.simulieren(p, hell, 0.002, 201, 0.0)
print(f"B) spärlicher Hellseher im Rechner: Rendite {sim['rendite']*100:.1f}% bei Exposure {sim['exposure_schnitt']:.3f} (Cash-Referenz {ref['rendite']*100:.1f}%)")

# ---- C) Datenqualität: Ausreisser, Stillstand, Sprünge
r_ = [p[i] / p[i - 1] - 1 for i in range(1, n)]
gross = sorted(((abs(x), tage[i + 1], x) for i, x in enumerate(r_)), reverse=True)[:6]
print('C) größte Tagesbewegungen:', [(str(d), f'{x*100:+.1f}%') for _, d, x in gross])
gleich = sum(1 for i in range(1, n) if p[i] == p[i - 1])
print('   Tage mit exakt gleichem Schlusskurs wie am Vortag:', gleich)
sprung = [(str(tage[i + 1]), f'{x*100:+.1f}%') for i, x in enumerate(r_) if abs(x) > 0.25]
print('   Tage mit |Rendite| > 25 %:', sprung)
print('   Daten: erster Tag', tage[0], 'letzter', tage[-1], '| Tage:', n, '| Wochenenden mit Daten: ja' if any(d.weekday() >= 5 for d in tage[:20]) else '')
print('   Schlusskurse zuletzt:', [round(x) for x in p[-5:]])

# ---- D) Zugesicherte Konstanten im Protokoll, die im Code nicht benutzt werden
src = (BASIS / 'docs/ki-bot-gemeinsam/labor.py').read_text(encoding='utf-8')
for key in ('signal_verzoegerung_tage', 'vorwaertstest_mindesttage', 'markt', 'kostenmodell'):
    print(f"D) PROTOKOLL['{key}'] im Code gelesen:", src.count(f'PROTOKOLL["{key}"]') + src.count(f"PROTOKOLL['{key}']"), 'mal')
print('   Literale 201 / 180 im Code:', src.count('201'), '/', src.count('180'))

# ---- E) Zwei-Tage-Leck an jedem 7. Tag, alle Versätze: das Leck steckt in einem Signal, das den Rechner wirklich erreicht
def zwei_tage_leck(preise, jeder, versatz):
    m = len(preise)
    return {'X': [1.0 if (i % jeder == versatz and i + 2 < m and preise[i + 2] > preise[i + 1]) else 0.0 for i in range(m)]}


def stoerprobe_x(erz, preise, schnitte=40, seed=1):
    rnd = random.Random(seed)
    voll = erz(preise)
    gef = 0
    for _ in range(schnitte):
        k = rnd.randrange(250, len(preise) - 3)
        gestoert = preise[:k + 1] + [x * rnd.uniform(0.5, 2.0) for x in preise[k + 1:]]
        if erz(gestoert)['X'][:k + 1] != voll['X'][:k + 1]:
            gef += 1
    return gef


print('E) Zwei-Tage-Leck an jedem 7. Tag (Versatz 0 bis 6): signalpruefung / Störungsprobe (40 Schnitte) / Rendite im Rechner')
bestanden_n = 0
for v in range(7):
    erz = lambda x, v=v: zwei_tage_leck(x, 7, v)
    ok = L.signalpruefung(p, erz)['bestanden']
    bestanden_n += ok
    sim = L.simulieren(p, erz(p)['X'], 0.002, 201, 0.0)
    print(f"   Versatz {v}: bestanden={ok!s:5}  Störungsprobe {stoerprobe_x(erz, p):2d}/40  Rendite {sim['rendite']*100:12.1f} %")
print('   signalpruefung bestanden bei', bestanden_n, 'von 7 Versätzen')
print('   Zwei-Tage-Leck an jedem 97. Tag (Versatz 5): Störungsprobe', stoerprobe_x(lambda x: zwei_tage_leck(x, 97, 5), p), '/ 40')
