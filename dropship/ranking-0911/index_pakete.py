#!/usr/bin/env python3
"""Teilt die Menü-Kategorien in Pakete für die Index-Messung (OpenSEO `inspect_urls`, höchstens 10 URLs je Aufruf).

Aufruf:  python3 index_pakete.py <csv mit Spalte handle> <ausgabeordner> [anzahl=6]
Liest `handle` (die Datei `index_menue_0911.csv` hier oder `../index-analyse-0311/index_menue_0311.csv`),
schreibt `chunk_1.txt` .. `chunk_N.txt` mit einer prozentcodierten Adresse je Zeile (Emoji-Handles brauchen das).
Danach je Paket einen Hilfsagenten (Haiku) starten, der pro Aufruf zehn URLs abfragt und die Zeilen
`url<TAB>coverageState<TAB>lastCrawlTime<TAB>googleCanonical` an `res_N.tsv` anhängt (Auftragstext: README, «Messrezept»).
Stichprobe danach selbst nachmessen (10 zufällige URLs), erst dann den Zahlen trauen.
"""
import csv
import sys
import urllib.parse

quelle, ziel = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 6
urls = ['https://luxestyle.ch/collections/' + urllib.parse.quote(r['handle'], safe='-._~')
        for r in csv.DictReader(open(quelle, encoding='utf-8'))]
assert len(urls) == len(set(urls)), 'doppelte Adressen'
groesse = -(-len(urls) // n)
for i in range(n):
    teil = urls[i * groesse:(i + 1) * groesse]
    open(f'{ziel}/chunk_{i + 1}.txt', 'w').write('\n'.join(teil) + '\n')
    print(f'chunk_{i + 1}.txt: {len(teil)} URLs')
