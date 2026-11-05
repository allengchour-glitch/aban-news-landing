#!/usr/bin/env python3
"""Baut dropship/codex-katalog/ausblenden.json: Modelle, die im Katalogfenster nicht erscheinen sollen (nicht in die Schweiz lieferbar oder überall ausverkauft),
und Varianten, die in sonst lieferbaren Modellen ausverkauft sind. Liest modelle.json und die Printful-Katalogdaten (Scratch, nicht im Repo).
Aufruf: python3 ausblenden_bauen.py [KATALOG_ORDNER]"""
import json,sys
SG=(sys.argv[1] if len(sys.argv)>1 else '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/sg/katalog')+'/'
m=json.load(open('dropship/codex-katalog/modelle.json'))
nicht_ch={x['id']:x['grund'] for x in m['modelle'] if not x['bestellbarCH']}
voll_aus=[];var_aus={}
for x in m['modelle']:
    d=json.load(open(SG+'%d.json'%x['id']))
    vs=d['varianten']; aus=[v['id'] for v in vs if not any(s in ('in_stock','stocked_on_demand') for s in (v.get('status') or {}).values())]
    if len(aus)==len(vs): voll_aus.append(x['id'])
    elif aus and x['bestellbarCH']: var_aus[x['id']]=aus
modelle_aus=sorted(set(nicht_ch)|set(voll_aus))
grund={}
for i in modelle_aus:
    g=[]
    if i in nicht_ch: g.append(nicht_ch[i])
    if i in voll_aus: g.append('überall ausverkauft (supplier_out_of_stock)')
    grund[str(i)]='; '.join(g)
out={'erstellt':'05.11.2026','quelle':'Printful-API (GEMESSEN 05.11.): Versandrate CH je Modell (Testvarianten, bei «out of stock» weitere Varianten nachgetestet), availability_status je Variante; «ausverkauft» = keine Variante irgendwo in_stock oder stocked_on_demand',
 'regel':'Modelle in modelle_ausblenden nicht anzeigen; varianten_ausblenden je Modell nicht anzeigen (Farbe/Grösse). Hypothese: die CH-Rate einer Testvariante gilt fuer das ganze Modell (bei regionsgebundenen Produkten wie «ships to Japan only» stimmt das; bei ausverkauften Testvarianten wurden 8 Modelle nachgetestet).',
 'modelle_ausblenden':modelle_aus,'grund':grund,'varianten_ausblenden':{str(k):v for k,v in var_aus.items()}}
json.dump(out,open('dropship/codex-katalog/ausblenden.json','w'),ensure_ascii=False,indent=0)
print('Modelle ausblenden:',len(modelle_aus),'| davon nicht CH:',len(nicht_ch),'| überall ausverkauft:',len(voll_aus),'| beides:',len(set(nicht_ch)&set(voll_aus)))
print('Modelle mit teilweise ausverkauften Varianten (angezeigt, Varianten ausgeblendet):',len(var_aus),'| Varianten:',sum(len(v) for v in var_aus.values()))
import collections
print(collections.Counter(('ausverkauft' if 'out of stock' in g else ('technisch' if 'technisch' in g else 'regionsgebunden/keine Rate')) for g in nicht_ch.values()))
