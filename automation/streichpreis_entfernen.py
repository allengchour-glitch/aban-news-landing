#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Erfundene Streichpreise entfernen (Audit 24.08.2026, Befund 2.1/2.3/2.4).

36 aktive Produkte (58 Varianten) warben mit «Angebotspreis X / Normaler Preis Y» —
und Y wurde NIE verlangt: dropship/PRODUKT-PIPELINE.md (30.05.) fuehrt dieselben
Produkte SKU-identisch zum heutigen «Aktionspreis», der Streichpreis ist laut
streichpreise.py-Docstring aus dem Verkaufspreis konstruiert (x1.55/1.65/1.70).
PBV Art. 16 verlangt, dass ein Vergleichspreis tatsaechlich verlangt wurde, und
Abs. 3 befristet ihn — dieser lief 96 Tage. 28 der 36 stehen im Google-Kanal.

Der VERKAUFSPREIS bleibt unangetastet — entfernt wird nur die falsche Referenz.
⚠️ AUSNAHME 15431914783105 (Thomas Sabo, BigBuy-Markenware): koennte eine
belegbare UVP tragen → NICHT angefasst, Betreiber entscheidet.
Live geprueft je Produkt (Status + compareAtPrice), nicht aus dem Export
geschrieben (Lehre 15.08.).
"""
import json, os, time, urllib.request
SHOP='au3j0y-hq.myshopify.com'; TOKEN=open('/tmp/cj_shop_token.txt').read().strip()
DRY=os.environ.get('DRY')=='1'
AUSNAHME={'15431914783105'}
LEDGER='dropship/_streichpreis_entfernt.txt'
def gql(q,v=None):
    r=urllib.request.Request(f'https://{SHOP}/admin/api/2024-10/graphql.json',
      data=json.dumps({'query':q,'variables':v or {}}).encode(),
      headers={'X-Shopify-Access-Token':TOKEN,'Content-Type':'application/json'})
    for i in range(8):
        try: j=json.load(urllib.request.urlopen(r,timeout=60))
        except Exception:
            if i==7: raise
            time.sleep(2**i); continue
        if 'data' in j and j['data'] is not None: return j
        time.sleep(4)
    raise RuntimeError(str(j)[:250])
kand=json.load(open('/tmp/cap_kandidaten.json'))
Q='''query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title status vendor
 variants(first:30){nodes{id price compareAtPrice}}}}}'''
M='''mutation($pid:ID!,$vars:[ProductVariantsBulkInput!]!){
 productVariantsBulkUpdate(productId:$pid,variants:$vars){userErrors{field message}}}'''
fh=None if DRY else open(LEDGER,'a')
n=0; uebersprungen=0
ids=[k for k in kand if k not in AUSNAHME]
for i in range(0,len(ids),20):
    j=gql(Q,{'ids':['gid://shopify/Product/'+x for x in ids[i:i+20]]})
    for p in (j['data']['nodes'] or []):
        if not p: continue
        pid=p['id'].split('/')[-1]
        if p['status']!='ACTIVE':
            uebersprungen+=1; continue
        treffer=[v for v in p['variants']['nodes'] if v['compareAtPrice']]
        if not treffer:
            uebersprungen+=1; continue
        print(('DRY ' if DRY else '')+pid, p['title'][:52], '·', p['vendor'],
              '·', ', '.join(f"{v['price']} statt {v['compareAtPrice']}" for v in treffer[:4]))
        if DRY: n+=len(treffer); continue
        r=gql(M,{'pid':p['id'],'vars':[{'id':v['id'],'compareAtPrice':None} for v in treffer]})
        e=r['data']['productVariantsBulkUpdate']['userErrors']
        if e: print('   ⛔',e); continue
        for v in treffer:
            fh.write(f"{pid}\t{v['id'].split('/')[-1]}\t{v['price']}\tentfernt:{v['compareAtPrice']}\t{p['title'][:50]}\n")
        fh.flush(); n+=len(treffer); time.sleep(0.4)
if fh: fh.close()
print(f'FERTIG: {n} Streichpreise entfernt, {uebersprungen} uebersprungen (nicht aktiv / schon leer), Ausnahme Thomas Sabo unberuehrt.')
