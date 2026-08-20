#!/usr/bin/env python3
"""Wächter für Hunde-Erziehungsgeräte nach TSchV Art. 76 (Bestand).

Liest DIESELBE Musterdatei wie der Importer: automation/tierschutz_geraet.json.
Wer dort etwas ändert, ändert es für beide Seiten gleichzeitig.

WARUM ER TÄGLICH GEGEN LIVE LÄUFT: Am 20.08.2026 standen elf Elektroschock-/Sprüh-Geräte
aktiv und in allen sechs Kanälen im Shop, neun davon nach dem 13.08. neu angelegt — also
NACH der Sofortmassnahme vom 16.08. Der CJ-Grind legt die Klasse laufend nach. Ein
Einmal-Ledger meldet deshalb «fertig», während der Shop erneut voll davon ist. Der Voll-Export
ist zudem ein Schnappschuss und kennt genau die jüngsten Produkte nicht.

Aufrufe:
  python3 automation/tierschutz_guard.py                 # letzte 3 Tage (Standard)
  SEIT=2026-08-01 python3 automation/tierschutz_guard.py # ab Datum
  FIX=1 python3 automation/tierschutz_guard.py           # meldet NICHT nur, sondern draftet

Ohne FIX=1 wird NICHTS verändert — nur gemeldet. Beim Draften: status DRAFT,
tagsAdd `tierschutz-tschv76` (NIE tags:, das löscht cj-real/haustier/hund/pet) und
publishableUnpublish aus dem Google-Kanal.
"""
import json, os, re, sys, time, urllib.request
from datetime import date, timedelta

HIER = os.path.dirname(os.path.abspath(__file__))
SHOP = 'https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json'
GOOGLE_PUB = 'gid://shopify/Publication/302872297857'
TAG = 'tierschutz-tschv76'


def token():
    for p in ('/tmp/cj_shop_token.txt', '/tmp/shop_token.txt'):
        if os.path.exists(p):
            return open(p).read().strip()
    t = os.environ.get('SHOPIFY_TOKEN')
    if t:
        return t
    sys.exit('kein Shopify-Token gefunden (/tmp/cj_shop_token.txt oder SHOPIFY_TOKEN)')


TOK = token()


def gql(query, variables=None, tries=4):
    body = json.dumps({'query': query, 'variables': variables or {}}).encode()
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(SHOP, data=body, headers={
                'X-Shopify-Access-Token': TOK, 'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=60) as r:
                d = json.loads(r.read())
            if d.get('data'):
                return d
            last = d
        except Exception as e:                      # noqa: BLE001
            last = {'exc': str(e)}
        time.sleep(2 + i * 2)
    sys.exit('GraphQL antwortet nicht: ' + json.dumps(last)[:500])


M = json.load(open(os.path.join(HIER, 'tierschutz_geraet.json')))
SPERRE = [(x['n'], re.compile(x['re'], re.I)) for x in M['sperre']]
TREFFER = [(x['n'], re.compile(x['tier'], re.I), re.compile(x['geraet'], re.I),
            re.compile(x['wirkung'], re.I)) for x in M['treffer']]


def tierschutz_geraet(titel, text):
    """None = unbedenklich, sonst (grund, muster, stelle)."""
    roh = (titel or '') + ' || ' + (text or '')
    klar = re.sub(r'<[^>]+>', ' ', roh).replace('&nbsp;', ' ').replace('&amp;', '&')
    klar = re.sub(r'\s+', ' ', klar)
    for _n, rx in SPERRE:
        if rx.search(klar):
            return None
    for n, tier, geraet, wirkung in TREFFER:
        if not tier.search(klar) or not geraet.search(klar):
            continue
        m = wirkung.search(klar)
        if m:
            return (n, m.group(0)[:90], klar[max(0, m.start() - 60):m.start() + 120])
    return None


Q = """query($q:String!,$c:String){ products(first:100, after:$c, query:$q){
  pageInfo{hasNextPage endCursor}
  nodes{ id title descriptionHtml tags status
         resourcePublicationsV2(first:12){nodes{isPublished publication{name}}} } } }"""
M_DRAFT = """mutation($id:ID!){ productUpdate(input:{id:$id,status:DRAFT}){
  product{id status} userErrors{message} } }"""
M_TAG = """mutation($id:ID!,$t:[String!]!){ tagsAdd(id:$id,tags:$t){ userErrors{message} } }"""
M_UNPUB = """mutation($id:ID!,$p:ID!){ publishableUnpublish(id:$id,input:{publicationId:$p}){
  userErrors{message} } }"""


def main():
    seit = os.environ.get('SEIT') or str(date.today() - timedelta(days=3))
    fix = os.environ.get('FIX') == '1'
    # Nach der FUNKTION suchen, nicht nach der Produktbezeichnung: die Geräte heissen
    # «Hundebellen», «Ultraschall Anti-Bell Halsband» oder «Drahtloser Hundezaun».
    suchen = ['halsband', 'collar', 'antibell', 'anti-bell', 'bellen', 'hundezaun',
              'hundetrainer', 'trainingshalsband', 'hundeerziehung', 'zaun hund']
    gesehen, funde = {}, []
    for wort in suchen:
        q = f'status:active created_at:>={seit} {wort}'
        c = None
        while True:
            d = gql(Q, {'q': q, 'c': c})['data']['products']
            for p in d['nodes']:
                if p['id'] in gesehen:
                    continue
                gesehen[p['id']] = 1
                if TAG in (p['tags'] or []):
                    continue
                hit = tierschutz_geraet(p['title'], p['descriptionHtml'])
                if hit:
                    kan = [n['publication']['name'] for n in
                           p['resourcePublicationsV2']['nodes'] if n['isPublished']]
                    funde.append((p, hit, kan))
            if not d['pageInfo']['hasNextPage']:
                break
            c = d['pageInfo']['endCursor']
            time.sleep(0.5)
        time.sleep(0.5)

    print(f'{len(gesehen)} aktive Produkte seit {seit} geprüft, {len(funde)} Befunde')
    for p, hit, kan in funde:
        pid = p['id'].split('/')[-1]
        print(f'  ⚠️ {pid} [{hit[0]}] «{p["title"][:55]}» · Muster «{hit[1]}» · Kanäle {len(kan)}')
        print(f'     …{hit[2][:150]}…')
        if fix:
            gql(M_DRAFT, {'id': p['id']}); time.sleep(0.5)
            gql(M_TAG, {'id': p['id'], 't': [TAG]}); time.sleep(0.5)
            gql(M_UNPUB, {'id': p['id'], 'p': GOOGLE_PUB}); time.sleep(0.5)
            print('     → DRAFT, Tag gesetzt, aus Google & YouTube entfernt')
    if funde and not fix:
        print('\nNur gemeldet. Zum Reparieren: FIX=1 python3 automation/tierschutz_guard.py')


if __name__ == '__main__':
    main()
