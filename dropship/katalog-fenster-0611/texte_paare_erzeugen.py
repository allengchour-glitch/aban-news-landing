#!/usr/bin/env python3
"""Überträgt die verankerten Ersetzungen des Pakets katalog-texte-de-0611 (patch_bauen.py) als JS-Datenstruktur
nach texte_ersetzungen.mjs. Nichts wird von Hand abgeschrieben:

  python3 -I dropship/katalog-fenster-0611/texte_paare_erzeugen.py

Ablauf (die Originale in katalog-texte-de-0611/ werden nur gelesen, nie verändert):
  1. patch_bauen.py wird gelesen und im Speicher an genau zwei Stellen angepasst (Pfad D auf einen Wegwerfordner mit Kopien der *.orig,
     und ein Aufzeichner in ersetzen()); jede dieser zwei Stellen muss genau einmal vorkommen, sonst Abbruch.
  2. Das angepasste Skript läuft (exec) und zeichnet jedes Paar (Datei, alt, neu) in der Reihenfolge auf, in der es angewandt wird.
  3. Kontrolle: die aufgezeichneten Paare, der Reihe nach auf die *.orig angewandt (jedes genau einmal), ergeben dieselben Bytes wie das
     Ergebnis des Skripts UND wie theme/* im Paket (MD5-Vergleich). Weicht etwas ab, wird keine Datei geschrieben.
  4. Geschrieben wird texte_ersetzungen.mjs (Paare, MD5 der Quellen) und, aus den Locale-Paaren abgeleitet, die neuen Sprachschlüssel.
"""
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile

HIER = os.path.dirname(os.path.abspath(__file__)) + '/'
B = os.path.abspath(HIER + '../katalog-texte-de-0611') + '/'
DATEI_MAP = {
    'assets__luxe-clothing.js': 'assets/luxe-clothing.js',
    'sections__luxe-clothing.liquid': 'sections/luxe-clothing.liquid',
    'locales__de.json': 'locales/de.json',
    'locales__en.default.json': 'locales/en.default.json',
}


def md5(b):
    return hashlib.md5(b).hexdigest()


def genau_einmal(text, teil, name):
    n = text.count(teil)
    if n != 1:
        sys.exit('ABBRUCH: «%s» kommt %d mal in patch_bauen.py vor (erwartet 1)' % (name, n))


quelle = open(B + 'patch_bauen.py', encoding='utf-8').read()
quelle_md5 = md5(quelle.encode('utf-8'))

d_zeile = re.search(r"^D = '[^']*'$", quelle, re.M)
if not d_zeile or len(re.findall(r"^D = '[^']*'$", quelle, re.M)) != 1:
    sys.exit('ABBRUCH: die Zeile «D = ...» in patch_bauen.py fehlt oder ist nicht eindeutig')
auf_zeichner = '    n = text.count(alt)\n'
genau_einmal(quelle, auf_zeichner, 'n = text.count(alt)')

wegwerf = tempfile.mkdtemp(prefix='lxtexte-') + '/'
try:
    for ausgabe_name in DATEI_MAP:
        shutil.copyfile(B + 'theme/' + ausgabe_name + '.orig', wegwerf + ausgabe_name + '.orig')
    angepasst = quelle.replace(d_zeile.group(0), "D = %r" % wegwerf)
    angepasst = angepasst.replace(auf_zeichner, '    REC.append((name, alt, neu))\n' + auf_zeichner)
    rec = []
    ns = {'REC': rec, '__name__': '__patch_bauen__'}
    exec(compile(angepasst, 'patch_bauen.py (angepasst)', 'exec'), ns)

    # --- Kontrolle: Paare der Reihe nach auf die Originale angewandt = Ausgabe des Skripts = theme/* im Paket ---
    zustand = {n: open(wegwerf + n + '.orig', encoding='utf-8').read() for n in DATEI_MAP}
    for (name, alt, neu) in rec:
        if zustand[name].count(alt) != 1:
            sys.exit('ABBRUCH: Paar für %s trifft %d mal (erwartet 1): %r' % (name, zustand[name].count(alt), alt[:80]))
        zustand[name] = zustand[name].replace(alt, neu)
    bericht = {}
    for name in DATEI_MAP:
        skript = open(wegwerf + name, encoding='utf-8').read()
        im_paket = open(B + 'theme/' + name, encoding='utf-8').read()
        if zustand[name] != skript:
            sys.exit('ABBRUCH: aufgezeichnete Paare ergeben NICHT die Ausgabe von patch_bauen.py: ' + name)
        if zustand[name] != im_paket:
            sys.exit('ABBRUCH: Ausgabe weicht von theme/%s im Paket ab (patch_bauen.py nach dem Bau geändert?)' % name)
        bericht[name] = md5(zustand[name].encode('utf-8'))
finally:
    shutil.rmtree(wegwerf, ignore_errors=True)

paare = []
zaehler = {}
for (name, alt, neu) in rec:
    datei = DATEI_MAP[name]
    zaehler[datei] = zaehler.get(datei, 0) + 1
    paare.append({'datei': datei, 'nr': zaehler[datei], 'alt': alt, 'neu': neu})

# Neue Sprachschlüssel (Locale-Paare: die hinzugefügten Zeilen «    "schluessel": "text",»)
schluessel = {'de': {}, 'en': {}}
for p in paare:
    for sprache, datei in (('de', 'locales/de.json'), ('en', 'locales/en.default.json')):
        if p['datei'] != datei:
            continue
        zusatz = p['neu'][len(p['alt']):] if p['neu'].startswith(p['alt']) else None
        if zusatz is None:
            sys.exit('ABBRUCH: Locale-Paar beginnt nicht mit seinem Anker: ' + datei)
        for zeile in zusatz.splitlines():
            m = re.match(r'^    ("[a-z_]+"): (".*"),?$', zeile)
            if not m:
                sys.exit('ABBRUCH: unerwartete Zeile im Locale-Paar: %r' % zeile)
            schluessel[sprache][json.loads(m.group(1))] = json.loads(m.group(2))


def js(w):
    return json.dumps(w, ensure_ascii=False)


aus = []
aus.append('// ERZEUGT von texte_paare_erzeugen.py aus katalog-texte-de-0611/patch_bauen.py. NICHT von Hand ändern: Skript neu laufen lassen.')
aus.append('// Jedes Paar: «alt» muss im Text genau einmal vorkommen und wird durch «neu» ersetzt (Reihenfolge wie in patch_bauen.py).')
aus.append('// Kontrolle beim Erzeugen: die Paare, der Reihe nach auf die *.orig angewandt, ergeben Byte für Byte theme/* des Pakets katalog-texte-de-0611.')
aus.append('export const TEXTE_QUELLE = %s;' % js({'patch_bauen.py': quelle_md5, 'ausgabe_md5': bericht}))
aus.append('export const TEXTE_PAARE = [')
for p in paare:
    aus.append('  { datei: %s, nr: %d,\n    alt: %s,\n    neu: %s },' % (js(p['datei']), p['nr'], js(p['alt']), js(p['neu'])))
aus.append('];')
aus.append('// Die Sprachschlüssel, die die Locale-Paare hinzufügen (aus den Paaren abgeleitet, nicht abgeschrieben).')
aus.append('export const TEXTE_SCHLUESSEL = %s;' % js(schluessel))
open(HIER + 'texte_ersetzungen.mjs', 'w', encoding='utf-8').write('\n'.join(aus) + '\n')
print('texte_ersetzungen.mjs geschrieben:', len(paare), 'Paare', {k: v for k, v in zaehler.items()})
print('Quelle patch_bauen.py md5', quelle_md5)
print('Ausgabe gleich theme/* im Paket:', json.dumps(bericht))
print('Neue Sprachschlüssel:', {k: list(v) for k, v in schluessel.items()})
