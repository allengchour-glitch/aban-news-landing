#!/usr/bin/env python3
"""Wertet die Ergebnisdateien `res_*.tsv` der Index-Messung aus und vergleicht mit einer früheren CSV.

Aufruf:  python3 index_auswerten.py <ordner mit res_*.tsv> <alte csv: handle,status,tiefe,produkte> [neue csv schreiben]
Ausgabe: Zählung je Zustand, «indexiert jetzt» gegen früher, Übergangsmatrix, Median der Produktzahl je Zustand.
Prüft: jede Adresse genau einmal, keine fremde Adresse, keine Zeile ohne Zustand.
"""
import collections
import csv
import glob
import statistics
import sys
import urllib.parse

ordner, alt_csv = sys.argv[1], sys.argv[2]
alt = {}
for r in csv.DictReader(open(alt_csv, encoding='utf-8')):
    alt['https://luxestyle.ch/collections/' + urllib.parse.quote(r['handle'], safe='-._~')] = r
neu = {}
for f in sorted(glob.glob(f'{ordner}/res_*.tsv')):
    for zeile in open(f, encoding='utf-8'):
        p = zeile.rstrip('\n').split('\t')
        assert len(p) >= 2 and p[1], f'Zeile ohne Zustand in {f}: {zeile[:80]}'
        assert p[0] not in neu, f'doppelt: {p[0]}'
        neu[p[0]] = (p[1].replace('–', '-'), p[2] if len(p) > 2 else '')
fremd = [u for u in neu if u not in alt]
fehlt = [u for u in alt if u not in neu]
print(f'gemessen {len(neu)} von {len(alt)}; fremde Adressen {len(fremd)}; nicht gemessen {len(fehlt)}')
ist = lambda s: s.startswith('Submitted and indexed') or s.startswith('Indexed')
print('Zustände:', dict(collections.Counter(v[0] for v in neu.values())))
print('indexiert jetzt:', sum(1 for v in neu.values() if ist(v[0])), '| früher:', sum(1 for r in alt.values() if ist(r['status'])))
uebergang = collections.Counter((alt[u]['status'], v[0]) for u, v in neu.items() if u in alt)
for k, n in sorted(uebergang.items(), key=lambda x: -x[1]):
    print(f'{n:4d}  {k[0]}  ->  {k[1]}')
for zustand in sorted({v[0] for v in neu.values()}):
    werte = [int(alt[u]['produkte'] or 0) for u, v in neu.items() if v[0] == zustand and u in alt]
    if werte:
        print(f'Median Produktzahl {zustand}: {statistics.median(werte)} (n={len(werte)})')
if len(sys.argv) > 3:
    with open(sys.argv[3], 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['handle', 'status_alt', 'status_neu', 'letzter_crawl_neu', 'tiefe', 'produkte_alt'])
        for u, r in alt.items():
            if u in neu:
                w.writerow([r['handle'], r['status'], neu[u][0], neu[u][1][:10], r['tiefe'], r['produkte']])
    print('geschrieben:', sys.argv[3])
