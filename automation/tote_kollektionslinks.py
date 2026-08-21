#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tote_kollektionslinks.py — findet Links auf Kategorien, die für Besucherinnen ins Leere führen.

DIE LÜCKE: `tote_links.py` prüft nur `/products/…`-Links. Die veröffentlichten SEO-Ratgeber
verlinken aber genauso auf **Kategorien** — und die können auf drei Arten tot sein:
gelöscht, aus dem Onlineshop genommen, oder vorhanden aber ohne ein einziges kaufbares Produkt.
Der letzte Fall ist der heimtückischste: Die Seite liefert HTTP 200 mit SEO-Titel und Werbetext,
darunter «Keine Produkte gefunden». Kein Bericht weist das je als Kaufabbruch aus.

WARUM DAS JETZT ENTSTEHT: Am 21.08. wurden 20 leere Kollektionen zurückgezogen — sieben davon
waren aus Ratgebern verlinkt. Die 301-Weiterleitungen fangen das ab, aber niemand prüft das
automatisch nach. Und dieselbe Mechanik wirkt weiter: Der Viability-Guard draftet Ware ohne
Lieferanten-SKU, die BigBuy-Stilllegung hat ganze Marken-Kollektionen entleert. Der TEXT, der
darauf zeigt, erfährt davon nichts.

Meldet nur — die Reparatur ist eine Entscheidung (Link umbiegen, Kollektion füllen oder 301).

Nutzung:  python3 automation/tote_kollektionslinks.py
"""
import json, os, re, sys, time, urllib.request

SHOP  = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOKEN = os.environ.get('SHOPIFY_ADMIN_TOKEN') or open('/tmp/cj_shop_token.txt').read().strip()
BERICHT = 'dropship/TOTE-KOLLEKTIONSLINKS.md'

def gql(q, v=None):
    req = urllib.request.Request(
        f'https://{SHOP}/admin/api/2024-10/graphql.json',
        data=json.dumps({'query': q, 'variables': v or {}}).encode(),
        headers={'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'})
    for i in range(4):
        try: return json.load(urllib.request.urlopen(req, timeout=45))
        except Exception:
            if i == 3: raise
            time.sleep(2 ** i)

# 1) Verlinkte Handles aus veröffentlichten Seiten und Artikeln einsammeln
links = {}
for typ in ['pages', 'articles']:
    d = gql(f'{{{typ}(first:150){{nodes{{title handle body publishedAt}}}}}}')['data'][typ]['nodes']
    for n in d:
        if not n.get('publishedAt'): continue
        for h in set(re.findall(r'/collections/([a-z0-9-]+)', n.get('body') or '')):
            links.setdefault(h, []).append(f"{typ[:-1]} «{n['title'][:40]}» (/{n['handle']})")

# 2) ALLE im Onlineshop veröffentlichten Kollektionen EINMAL holen — statt 86 Einzelabfragen.
#    Wer hier fehlt, ist entweder gelöscht oder nicht im Onlineshop; beides ist für die
#    Besucherin dasselbe.
veroeffentlicht = {}
cur = None
while True:
    r = gql('''query($c:String){collections(first:250,after:$c,query:"published_status:published"){
               pageInfo{hasNextPage endCursor} nodes{id handle title}}}''', {'c': cur})
    p = r['data']['collections']
    for n in p['nodes']: veroeffentlicht[n['handle']] = n
    if not p['pageInfo']['hasNextPage']: break
    cur = p['pageInfo']['endCursor']

# 3) Bestehende 301-Weiterleitungen EINMAL holen. Eine zurückgezogene Kollektion mit
#    Weiterleitung ist KEIN toter Link — die Besucherin landet bei passender Ware. Ohne
#    diesen Schritt meldet der Wächter jede sauber abgelöste Kollektion als Fehler und
#    wird dadurch wertlos (ein Wächter, der Richtiges anmahnt, wird bald ignoriert).
weiter = {}
cur = None
while True:
    r = gql('''query($c:String){urlRedirects(first:250,after:$c){
               pageInfo{hasNextPage endCursor} nodes{path target}}}''', {'c': cur})
    p_ = r['data']['urlRedirects']
    for n in p_['nodes']:
        m = re.match(r'^/collections/([a-z0-9-]+)$', n['path'] or '')
        if m: weiter[m.group(1)] = n['target']
    if not p_['pageInfo']['hasNextPage']: break
    cur = p_['pageInfo']['endCursor']

befunde = []
for h, wo in sorted(links.items()):
    if h == 'all':          # Shopifys eingebaute Route, kann nie leer sein
        continue
    c = veroeffentlicht.get(h)
    if not c:
        if h in weiter:
            continue        # zurückgezogen, aber mit 301 sauber abgelöst
        befunde.append((h, 'nicht im Onlineshop UND ohne Weiterleitung → 404', wo)); continue
    n = gql('query($q:String!){productsCount(query:$q){count}}',
            {'q': f"status:active AND collection_id:{c['id'].split('/')[-1]}"})['data']['productsCount']['count']
    if n == 0:
        befunde.append((h, 'veröffentlicht, aber 0 kaufbare Produkte', wo))
    time.sleep(0.25)

print(f"verlinkte Kollektionen: {len(links)} · im Onlineshop verfügbar: {len(veroeffentlicht)}")
print(f"PROBLEMATISCH: {len(befunde)}")
for h, was, wo in befunde:
    print(f"  ⚠️  /collections/{h} — {was}")
    for w in wo[:3]: print(f"        ← {w}")

if befunde:
    with open(BERICHT, 'w', encoding='utf-8') as f:
        f.write("# Kategorie-Links, die ins Leere führen\n\n")
        for h, was, wo in befunde:
            f.write(f"- `/collections/{h}` — {was}\n")
            for w in wo: f.write(f"  - verlinkt aus {w}\n")
elif os.path.exists(BERICHT):
    os.remove(BERICHT)
if not befunde: print("FERTIG")
