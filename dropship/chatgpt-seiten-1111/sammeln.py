#!/usr/bin/env python3
"""Sammelt die geprüften Einträge der Schreiber (<handle>/eintrag.json) zu texte.json für apply.py.
Aufruf: python3 sammeln.py <Ordner mit den Handle-Unterordnern> [Zieldatei]"""
import json, os, sys
quelle = sys.argv[1]
ziel = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'texte.json')
aus = {}
for h in sorted(os.listdir(quelle)):
    f = os.path.join(quelle, h, 'eintrag.json')
    if not os.path.isfile(f):
        continue
    e = json.load(open(f, encoding='utf-8'))
    if e.get('handle') != h:
        print('ÜBERSPRUNGEN', h, ': Handle im Eintrag ist', e.get('handle')); continue
    aus[h] = {'alt': e['alt_html'], 'neu': e['neu_html'].strip(),
              'belege': [{'aussage': b['aussage'], 'muster': b['muster'], 'felder': b['felder'], 'minimum': b['minimum']} for b in e['belege']],
              'hinweise': e.get('hinweise', '')}
json.dump(aus, open(ziel, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{len(aus)} Einträge → {ziel}')
