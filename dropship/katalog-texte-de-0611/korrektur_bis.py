#!/usr/bin/env python3
"""Korrektur 1 (Bauer, 05.11.2026): Halbgeviertstrich in Zahlenbereichen -> «bis».
Regel der Aufgabe: keine Gedankenstriche (– oder —) als Satzzeichen. Zahlenbereiche waren in 11 Beschreibungen mit «–» gesetzt
(«260–350 g/m²», «S 30–45 cm»), in anderen schon mit «bis» («54,9 cm bis 60 cm»): einheitlich «bis».
Es wird NUR ein «–» zwischen zwei Nicht-Leerzeichen ersetzt, sonst nichts."""
import json, re, glob, sys
S = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/ds/texte/out/'
n = 0
for f in sorted(glob.glob(S + 'b_[0-9][0-9].json')):
    d = json.load(open(f, encoding='utf-8')); geaendert = False
    for o in d:
        neu = re.sub(r'(?<=\S)–(?=\S)', ' bis ', o['de'])
        if neu != o['de']:
            for a, b in zip(o['de'].split('\n'), neu.split('\n')):
                if a != b: print(f[-10:-5], o['id'], '|', a.strip()[:90], '=>', b.strip()[:90])
            o['de'] = neu; geaendert = True; n += 1
    if geaendert:
        json.dump(d, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('Beschreibungen geändert:', n)
