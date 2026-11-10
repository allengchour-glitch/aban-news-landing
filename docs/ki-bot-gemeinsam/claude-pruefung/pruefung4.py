#!/usr/bin/env python3
"""Unabhängige Prüfung der Streaming-Fassung (Protokollversion 4) von docs/ki-bot-gemeinsam/labor.py.

Nur lesend, nur Standardbibliothek. Prüft SignalStrom gegen
  (a) eine eigene Nachrechnung aus den Signaldefinitionen (anderer Rechenweg: math.fsum, Zweipass-Varianz),
  (b) die Batch-Fassung der Version 3 (aus dem Git-Stand, Pfad per Umgebungsvariable V3_LABOR),
  (c) Grenzfälle: Aufwärmphase, gleitende Fenster, eingefrorene Konfiguration, Zustandsneutralität, Historie.
Aufruf:  V3_LABOR=/pfad/zu/v3/labor.py python3 pruefung4.py
"""
import importlib.util
import math
import os
import random
import sys
import time
from decimal import Decimal
from fractions import Fraction
from pathlib import Path

BASIS = Path(__file__).resolve().parents[1]   # docs/ki-bot-gemeinsam
sys.path.insert(0, str(BASIS))


def lade(pfad, name):
    spec = importlib.util.spec_from_file_location(name, pfad)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


L4 = lade(BASIS / 'labor.py', 'labor_v4')
V3_PFAD = os.environ.get('V3_LABOR')
L3 = lade(V3_PFAD, 'labor_v3') if V3_PFAD else None
NAMEN = list(L4.SignalStrom.namen)
FEHLER = []
ZAEHLER = {'ok': 0}


def pruefe(bedingung, text):
    if bedingung:
        ZAEHLER['ok'] += 1
    else:
        FEHLER.append(text)
        print('  FEHLER:', text)


# ------------------------------------------------------------------ eigene Nachrechnung
def unabhaengig(p, kurz=150, lang=200, fenster=30, ziel=0.25):
    """Aus den Definitionen: Trend = heutiger Kurs über dem Mittel der letzten N Schlusskurse (inkl. heute);
    Risikoquote = min(1, Ziel / (Stichproben-Std der letzten 30 Tagesrenditen * sqrt(365)))."""
    n = len(p)
    out = {k: [0.0] * n for k in NAMEN}
    out['Halten'] = [1.0] * n
    for i in range(lang - 1, n):
        ma200 = math.fsum(p[i - lang + 1:i + 1]) / lang
        ma150 = math.fsum(p[i - kurz + 1:i + 1]) / kurz
        r = [p[j] / p[j - 1] - 1 for j in range(i - fenster + 1, i + 1)]
        m = math.fsum(r) / fenster
        var = math.fsum((x - m) ** 2 for x in r) / (fenster - 1)
        vol = math.sqrt(var) * math.sqrt(365)
        q = min(1.0, ziel / vol) if vol > 0 else 0.0
        k = p[i]
        out['Trend 200'][i] = float(k > ma200)
        out['Halten Risiko 25'][i] = q
        out['Trend 150 Risiko 25'][i] = q if k > ma150 else 0.0
        out['Trend 200 Risiko 25'][i] = q if k > ma200 else 0.0
        out['Konsens 150/200'][i] = q if (k > ma150 and k > ma200) else 0.0
    return out


def vergleich(a, b, tol=1e-12):
    """(grösste Abweichung, Zahl der Schalter-Unterschiede 0/1)"""
    groesste, schalter = 0.0, 0
    for name in NAMEN:
        if len(a[name]) != len(b[name]):
            return float('inf'), -1
        for x, y in zip(a[name], b[name]):
            d = abs(x - y)
            groesste = max(groesste, d)
            if (x == 0.0) != (y == 0.0):
                schalter += 1
    return groesste, schalter


def zufallsreihe(rng, n, start=100.0, vol=0.03, drift=0.0003):
    p, k = [], start
    for _ in range(n):
        k *= math.exp(rng.gauss(drift, vol))
        p.append(k)
    return p


def abschnitt(titel):
    print(f'\n== {titel}')


# ------------------------------------------------------------------ 1 echte Daten
abschnitt('1 echte Bitcoin-Reihe: SignalStrom gegen eigene Nachrechnung und Version 3')
daten = BASIS.parents[1] / 'tools' / 'trading' / 'daten' / 'BTC-USD.json'
tage, p, _ = L4.laden(daten)
print(f'  {len(p)} Tageskurse {tage[0]} bis {tage[-1]}')
s4 = L4.signale(p)
eigen = unabhaengig(p)
g, sw = vergleich(s4, eigen)
print(f'  V4 gegen eigene Nachrechnung: grösste Abweichung {g:.3e}, Schalter-Unterschiede {sw}')
pruefe(g < 1e-12 and sw == 0, 'V4 weicht auf der echten Reihe von der eigenen Nachrechnung ab')
if L3:
    s3 = L3.signale(p)
    pruefe(all(s3[n] == s4[n] for n in NAMEN), 'V4 und V3 nicht bitgleich auf der echten Reihe')
    print('  V4 == V3 bitgleich auf der echten Reihe:', all(s3[n] == s4[n] for n in NAMEN))
# Schritt für Schritt gegen die Batch-Ausgabe
strom = L4.SignalStrom()
gleich = True
for i, k in enumerate(p):
    o = strom.schritt(k)
    if any(o[n] != s4[n][i] for n in NAMEN):
        gleich = False
        break
pruefe(gleich, 'Schritt-für-Schritt-Ausgabe weicht von signale() ab')

# ------------------------------------------------------------------ 2 Zufallsreihen
abschnitt('2 Zufallsreihen (Samen 20261110): V4 gegen V3 bitgleich, gegen eigene Nachrechnung')
rng = random.Random(20261110)
n_reihen, max_abw, max_schalter, bit_ungleich = 0, 0.0, 0, 0
for _ in range(300):
    n = rng.choice([1, 2, 29, 30, 31, 149, 150, 151, 198, 199, 200, 201, 202, 230, 231, 232, 500, 1200])
    n = n + rng.randint(0, 3)
    skala = 10 ** rng.uniform(-6, 9)
    reihe = zufallsreihe(rng, n, start=skala, vol=rng.choice([0.002, 0.01, 0.03, 0.08]))
    a = L4.signale(reihe)
    e = unabhaengig(reihe)
    g, sw = vergleich(a, e)
    max_abw, max_schalter = max(max_abw, g), max_schalter + max(sw, 0)
    if L3:
        b = L3.signale(reihe)
        if any(a[nm] != b[nm] for nm in NAMEN):
            bit_ungleich += 1
    n_reihen += 1
print(f'  {n_reihen} Reihen; grösste Abweichung zur eigenen Nachrechnung {max_abw:.3e}; Schalter-Unterschiede {max_schalter}; bitungleich zu V3: {bit_ungleich}')
pruefe(max_abw < 1e-9 and max_schalter == 0, 'Zufallsreihen: V4 weicht von der eigenen Nachrechnung ab')
pruefe(bit_ungleich == 0, 'Zufallsreihen: V4 ist nicht bitgleich zu V3')

# ------------------------------------------------------------------ 3 Aufwärmphase und Fenstergrenzen
abschnitt('3 Aufwärmphase und Fenstergrenzen')
rng = random.Random(1)
reihe = zufallsreihe(rng, 260, start=30000.0)
a = L4.signale(reihe)
erste = next(i for i in range(len(reihe)) if any(a[n][i] != 0.0 for n in NAMEN if n != 'Halten'))
print('  erstes von Null verschiedenes Signal bei Index', erste, '(= %d. Kurs)' % (erste + 1))
pruefe(all(a[n][i] == 0.0 for n in NAMEN if n != 'Halten' for i in range(199)), 'Signale vor dem 200. Kurs nicht Null')
pruefe(all(a['Halten'][i] == 1.0 for i in range(len(reihe))), 'Halten nicht immer 1')
# Verschiebung: Änderung des ältesten Kurses im 200er-Fenster ändert MA200 (und nur dann)
basis = reihe[:300] if len(reihe) >= 300 else reihe + zufallsreihe(rng, 300 - len(reihe), start=reihe[-1])
a1 = L4.signale(basis)
geaendert = list(basis)
geaendert[0] *= 1.5          # liegt im Fenster des 200. Kurses (Index 199), aber nicht mehr in dem des 201. (Index 200)
a2 = L4.signale(geaendert)
pruefe(a1['Trend 200'][200:] == a2['Trend 200'][200:], 'Kurs vor dem Fenster beeinflusst Trend 200 ab Index 200')
# Die Volatilität am Index 199 hängt von den Kursen 169..199 ab, nicht von Kurs 0
pruefe(a1['Halten Risiko 25'][199] == a2['Halten Risiko 25'][199], 'Volatilität am Index 199 hängt von Kurs 0 ab')

# ------------------------------------------------------------------ 4 begrenzte Historie
abschnitt('4 begrenzte Historie und Laufzeit')
strom = L4.SignalStrom()
rng = random.Random(7)
k = 100.0
t0 = time.time()
for _ in range(100000):
    k *= math.exp(rng.gauss(0.0002, 0.02))
    strom.schritt(k)
dauer = time.time() - t0
print(f'  100000 Schritte in {dauer:.1f} s; Historie {len(strom._historie)}; Zähler {strom.anzahl}')
pruefe(len(strom._historie) == 200 and strom.anzahl == 100000, 'Historie nicht auf 200 begrenzt')
# Ergebnis hängt nicht von verworfener Vorgeschichte ab: Strom mit nur den letzten 200 Kursen gibt dasselbe aus
zweit = L4.SignalStrom()
for kurs in list(strom._historie):          # genau die 200 gehaltenen Kurse, ohne die verworfene Vorgeschichte
    zweit.schritt(kurs)
naechster = k * 1.01
pruefe(strom.schritt(naechster) == zweit.schritt(naechster), 'Ausgabe hängt von verworfener Vorgeschichte ab')

# ------------------------------------------------------------------ 5 eingefrorene Konfiguration
abschnitt('5 eingefrorene Konfiguration')
rng = random.Random(3)
reihe = zufallsreihe(rng, 400, start=20000.0)
kontrolle = L4.SignalStrom()
lauf = L4.SignalStrom()
ausgaben_k, ausgaben_l = [], []
sicher = {key: (list(v) if isinstance(v, list) else v) for key, v in L4.PROTOKOLL.items() if key in ('trend_tage', 'vol_tage', 'vol_ziel')}
for i, kurs in enumerate(reihe):
    if i == 250:           # mitten im Lauf: globales Protokoll von aussen verändern, auch die verschachtelte Liste
        L4.PROTOKOLL['trend_tage'][0] = 5
        L4.PROTOKOLL['trend_tage'][1] = 10
        L4.PROTOKOLL['vol_tage'] = 5
        L4.PROTOKOLL['vol_ziel'] = 0.9
    ausgaben_k.append(kontrolle.schritt(kurs) if i < 250 else None)
    ausgaben_l.append(lauf.schritt(kurs))
neu_erzeugt = L4.SignalStrom()
for key, wert in sicher.items():       # Protokoll wiederherstellen
    L4.PROTOKOLL[key] = wert
pruefe(neu_erzeugt.lang == 10 and neu_erzeugt.fenster == 5, 'neue Instanz übernimmt das geänderte Protokoll nicht (Erwartung: ja)')
referenz = L4.signale(reihe)           # mit wiederhergestelltem Protokoll
gleich = all(ausgaben_l[i][n] == referenz[n][i] for i in range(len(reihe)) for n in NAMEN)
pruefe(gleich, 'laufender Strom wurde durch Änderung des globalen Protokolls verändert')
# Grenze: Attribute der Instanz sind von aussen veränderbar (keine Sperre)
x = L4.SignalStrom()
x.lang = 5
pruefe(x.lang == 5, 'Instanzattribut änderbar (dokumentierte Grenze: keine Sperre)')
print('  Grenze bestätigt: Instanzattribute (kurz, lang, fenster, ziel) lassen sich von aussen ändern, ohne Fehler')

# ------------------------------------------------------------------ 6 Zustandsneutralität
abschnitt('6 Zustandsneutralität bei ungültigen Kursen')
ungueltig = [float('nan'), float('inf'), float('-inf'), 0, 0.0, -1, -0.0, True, False, None, '100', b'1', [1.0], (1.0,),
             Decimal('5'), Fraction(5, 1), 1e999, complex(1, 0)]
reihe = zufallsreihe(random.Random(11), 320, start=1000.0)
kontrolle, pruefling = L4.SignalStrom(), L4.SignalStrom()
abweichung, fehlerarten = 0, {}
for i, kurs in enumerate(reihe):
    if i in (5, 120, 199, 200, 215, 260):
        for bad in ungueltig:
            try:
                pruefling.schritt(bad)
                fehlerarten[repr(bad)] = 'KEIN FEHLER'
            except Exception as e:     # noqa
                fehlerarten.setdefault(repr(bad), type(e).__name__)
    if pruefling.schritt(kurs) != kontrolle.schritt(kurs):
        abweichung += 1
print(f'  Abweichungen nach ungültigen Eingaben: {abweichung}; Zähler {pruefling.anzahl} gegen {kontrolle.anzahl}')
nicht_abgewiesen = [k for k, v in fehlerarten.items() if v == 'KEIN FEHLER']
andere = {k: v for k, v in fehlerarten.items() if v not in ('ValueError', 'KEIN FEHLER')}
print('  nicht abgewiesen:', nicht_abgewiesen)
print('  Fehlerart ungleich ValueError:', andere)
pruefe(abweichung == 0 and pruefling.anzahl == kontrolle.anzahl, 'ungültige Eingabe veränderte den Zustand')
pruefe(not nicht_abgewiesen, 'ungültige Eingaben wurden nicht abgewiesen: ' + ', '.join(nicht_abgewiesen))
# riesige ganze Zahl (gültig im Sinn von int, aber nicht als float darstellbar)
try:
    L4.SignalStrom().schritt(10 ** 400)
    art = 'KEIN FEHLER'
except Exception as e:     # noqa
    art = type(e).__name__
print('  Kurs 10**400 (int):', art)

# ------------------------------------------------------------------ 7 gültige, aber extreme Kurse nach der Aufwärmphase
abschnitt('7 gültige, aber extreme Kurse: bleibt der Zustand nach einem Fehler im Schritt unverändert?')
extrem = [5e-324, 1e-320, 1e-200, 1e154, 1e200, 1.7976931348623157e308]
ergebnis7 = {}
for wert in extrem:
    s = L4.SignalStrom()
    for kurs in zufallsreihe(random.Random(5), 230, start=100.0):
        s.schritt(kurs)
    vorher = (s.anzahl, list(s._historie))
    try:
        s.schritt(wert)
        art = 'ok'
    except Exception as e:     # noqa
        art = type(e).__name__
    nachher = (s.anzahl, list(s._historie))
    ergebnis7[wert] = (art, vorher == nachher)
    print(f'  Kurs {wert!r}: {art}; Zustand unverändert: {vorher == nachher}')
verletzt = [w for w, (art, unveraendert) in ergebnis7.items() if art != 'ok' and not unveraendert]
pruefe(not verletzt, f'Fehler mitten im Schritt hinterlässt veränderten Zustand bei Kursen {verletzt}')

abschnitt('7b krankhafte, aber gültige Kursfolgen: Ausnahme mitten im Schritt, Zustand danach?')
folgen = {
    'gross, klein, gross': [1e308, 1e-308, 1e308],
    'klein, gross': [1e-300, 1e300],
    'denormal, gross': [5e-324, 1e308],
    'gross, denormal, gross': [1.7976931348623157e308, 5e-324, 1.7976931348623157e308],
    'Sprung 1e100': [1e-50, 1e50, 1e-50],
}
for titel, folge in folgen.items():
    s = L4.SignalStrom()
    for kurs in zufallsreihe(random.Random(5), 230, start=100.0):
        s.schritt(kurs)
    gefunden = None
    for kurs in folge:
        v = (s.anzahl, list(s._historie))
        try:
            s.schritt(kurs)
        except Exception as e:     # noqa
            gefunden = (type(e).__name__, str(e)[:60], v == (s.anzahl, list(s._historie)))
            break
    print(f'  {titel}: {"keine Ausnahme" if gefunden is None else "Ausnahme " + gefunden[0] + " (" + gefunden[1] + "), Zustand unverändert: " + str(gefunden[2])}')
    if gefunden is not None:
        pruefe(gefunden[2], f'Ausnahme im Schritt bei «{titel}» hinterlässt veränderten Zustand ({gefunden[0]})')

# ------------------------------------------------------------------ 8 Sonderfälle der Definition
abschnitt('8 Sonderfälle: konstante Reihe, Ties')
konst = [100.0] * 260
a = L4.signale(konst)
print('  konstante Reihe: Halten Risiko 25 am Ende =', a['Halten Risiko 25'][-1], '; Trend 200 =', a['Trend 200'][-1])
pruefe(a['Trend 200'][-1] == 0.0, 'konstante Reihe: Trend 200 sollte 0 sein (Kurs nicht über Mittel)')
if L3:
    b = L3.signale(konst)
    pruefe(all(a[n] == b[n] for n in NAMEN), 'konstante Reihe: V4 und V3 verschieden')
# Gleichheit Kurs == Mittel bei Reihe mit geraden Werten
tie = [100.0] * 199 + [100.0]
a = L4.signale(tie)
pruefe(a['Trend 200'][-1] == 0.0, 'Gleichstand Kurs == Mittel zählt nicht als Trend')

# ------------------------------------------------------------------ 9 Einmal-Iterator und Vorgeschichte
abschnitt('9 einmaliger Iterator, Eingabetypen')
rng = random.Random(9)
reihe = zufallsreihe(rng, 260, start=50.0)
pruefe(L4.signale(iter(reihe)) == L4.signale(reihe), 'Iterator und Liste verschieden')
pruefe(L4.signale(tuple(reihe)) == L4.signale(reihe), 'Tupel und Liste verschieden')
ganz = [100 + (i % 7) for i in range(260)]
pruefe(L4.signale(ganz) == L4.signale([float(x) for x in ganz]), 'ganze Zahlen und Gleitkommazahlen verschieden')

print(f'\nErgebnis: {ZAEHLER["ok"]} Prüfungen bestanden, {len(FEHLER)} Befunde')
for f in FEHLER:
    print(' -', f)
sys.exit(1 if FEHLER else 0)
