#!/usr/bin/env python3
"""Startseiten-Video: stimmt noch, was eingebrannt ist?  (MELDET NUR, 05.09.2026)

Das Spotlight-Video auf der Startseite ist ein Reel mit EINGEBRANNTEN Preisen und
Titeln. Was fest im Video steht, altert wie fest getippte Preise im HTML
(lux_spotlight_favs, 30.08.). Deshalb: dropship/_startseiten_video.json nennt jede
eingebrannte Behauptung, dieser Waechter haelt sie taeglich gegen den Shop —
Produkt ACTIVE? Preis exakt? CTA-Ziel im Onlineshop mit Ware? Code ACTIVE?
Videodatei liefert 200?

Bei Abweichung: Bericht dropship/STARTSEITEN-VIDEO.md. Ohne Befund wird der Bericht
GELOESCHT (ein Bericht ohne Befund ist Rauschen). Geschrieben wird am Shop nichts —
ein Video mit falschem Preis tauscht man aus, man «repariert» es nicht per Skript.
Netzfehler ist kein Befund (unklar, nicht falsch).
"""
import json, os, sys, time, urllib.request

MANIFEST = os.environ.get('MANIFEST', 'dropship/_startseiten_video.json')  # Testlauf darf ein anderes lesen
BERICHT  = 'dropship/STARTSEITEN-VIDEO.md'
CDN      = 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/'
SHOP     = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')

def token():
    for p in ('/tmp/cj_shop_token.txt',):
        if os.path.exists(p):
            return open(p).read().strip()
    sys.exit('cj_shop_token.txt fehlt')

TOK = token()

def gql(q, v=None):
    for i in range(8):
        r = urllib.request.Request(f'https://{SHOP}/admin/api/2024-10/graphql.json',
            data=json.dumps({'query': q, 'variables': v or {}}).encode(),
            headers={'X-Shopify-Access-Token': TOK, 'Content-Type': 'application/json'})
        d = json.loads(urllib.request.urlopen(r, timeout=90).read())
        if 'errors' in d and 'Throttl' in json.dumps(d['errors']):
            time.sleep(3 + i); continue
        return d
    return d

m = json.load(open(MANIFEST))
befunde, unklar = [], []

# 1) Videodatei erreichbar?
try:
    req = urllib.request.Request(CDN + m['video'], method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
    code = urllib.request.urlopen(req, timeout=40).getcode()
    if code != 200:
        befunde.append(f'Videodatei antwortet {code}: {m["video"]}')
except Exception as e:
    unklar.append(f'Videodatei nicht pruefbar ({e.__class__.__name__})')

# 2) Jedes eingebrannte Produkt: ACTIVE und Preis exakt
for p in m['produkte']:
    d = gql('query($q:String!){products(first:3,query:$q){nodes{handle status '
            'priceRangeV2{minVariantPrice{amount}}}}}', {'q': f'handle:{p["handle"]}'})
    ns = (d.get('data') or {}).get('products', {}).get('nodes') if d.get('data') else None
    if ns is None:
        unklar.append(f'{p["handle"]}: Shopify ohne Antwort'); continue
    ex = [n for n in ns if n['handle'] == p['handle']]          # Handle EXAKT (Lehre 02.09.)
    if not ex:
        befunde.append(f'{p["handle"]}: Produkt existiert nicht mehr (eingebrannt CHF {p["preis"]})'); continue
    n = ex[0]
    if n['status'] != 'ACTIVE':
        befunde.append(f'{p["handle"]}: {n["status"]} (eingebrannt CHF {p["preis"]})')
    live = f'{float(n["priceRangeV2"]["minVariantPrice"]["amount"]):.2f}'
    if live != p['preis']:
        befunde.append(f'{p["handle"]}: Preis live {live}, im Video {p["preis"]}')

# 3) CTA-Ziel: im Onlineshop, mit aktiver Ware (nie productsCount — zaehlt Entwuerfe)
h = m['cta'].rsplit('/', 1)[-1]
d = gql('query($q:String!){collections(first:3,query:$q){nodes{id handle '
        'resourcePublicationsV2(first:10){nodes{publication{name}}}}}}', {'q': f'handle:{h}'})
cs = [c for c in ((d.get('data') or {}).get('collections', {}).get('nodes') or []) if c['handle'] == h]
if not cs:
    befunde.append(f'CTA-Kollektion {h} existiert nicht')
else:
    c = cs[0]
    pubs = {x['publication']['name'] for x in c['resourcePublicationsV2']['nodes']}
    if not (pubs & {'Online Store', 'Onlineshop'}):
        befunde.append(f'CTA-Kollektion {h} nicht im Onlineshop')
    cid = c['id'].rsplit('/', 1)[-1]
    a = gql('query($q:String!){products(first:1,query:$q){nodes{id}}}',
            {'q': f'collection_id:{cid} AND status:active'})
    if not ((a.get('data') or {}).get('products', {}).get('nodes')):
        befunde.append(f'CTA-Kollektion {h} hat KEIN aktives Produkt')

# 4) Rabattcode
d = gql('query($c:String!){codeDiscountNodeByCode(code:$c){codeDiscount{... on DiscountCodeBasic{status}}}}', {'c': m['code']})
st = (((d.get('data') or {}).get('codeDiscountNodeByCode') or {}).get('codeDiscount') or {}).get('status')
if st is None:
    unklar.append(f'Code {m["code"]}: nicht pruefbar')
elif st != 'ACTIVE':
    befunde.append(f'Code {m["code"]} ist {st} — steht im Abspann des Videos')

if befunde:
    with open(BERICHT, 'w') as f:
        f.write(f'# Startseiten-Video: eingebrannte Angaben stimmen nicht mehr\n\n'
                f'Stand {time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime())} · Sektion `{m["sektion"]}` · `{m["video"]}`\n\n'
                f'Das Video traegt Preise und Titel fest im Bild. Reparatur = Video austauschen '
                f'(neu rendern braucht freien Datei-Speicher) oder das Produkt zurueck auf den eingebrannten Stand.\n\n')
        for b in befunde: f.write(f'- ⛔ {b}\n')
        for u in unklar:  f.write(f'- ⚠️ unklar: {u}\n')
    print(f'BEFUND: {len(befunde)} Abweichung(en) → {BERICHT}')
    for b in befunde: print('  ⛔', b)
else:
    if os.path.exists(BERICHT): os.remove(BERICHT)
    print(f'OK: {len(m["produkte"])} Produkte, CTA, Code, Datei — alles wie eingebrannt'
          + (f' ({len(unklar)} unklar)' if unklar else ''))
for u in unklar: print('  ⚠️', u)
print('FERTIG')
