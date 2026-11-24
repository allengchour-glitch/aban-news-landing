#!/usr/bin/env python3
"""Pool-Sammlungen für die Bereichs-Reihen anlegen (manuell, versteckt, nur Online Store) — wie startseite-pool-winter.
Eingabe: keep.json {theme_key: [gid, ...]} (Reihenfolge = Pool-Reihenfolge). LIVE=1 schreibt, sonst Trockenlauf."""
import sys, os, json, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../live2311'))
from gql2 import gql

LIVE = os.environ.get('LIVE') == '1'
ENDUNG = {'dresses': 'kleider', 'womens': 'damenmode', 'mens': 'herrenmode', 'shoes': 'schuhe', 'bags': 'taschen', 'beauty': 'beauty',
          'tech': 'technik', 'kitchen': 'kueche', 'pets': 'haustier', 'kids': 'kinder', 'sport': 'sport'}
TITEL = {'dresses': 'Kleider', 'womens': 'Damenmode', 'mens': 'Herrenmode', 'shoes': 'Schuhe', 'bags': 'Taschen', 'beauty': 'Beauty',
         'tech': 'Technik', 'kitchen': 'Küche', 'pets': 'Haustier', 'kids': 'Kinder', 'sport': 'Sport'}
MIN = 12  # Fenster der Reihe; kleinere Pools zeigen nichts


def G(q, v=None):
    for _ in range(10):
        try:
            return gql(q, v or {})
        except BaseException:
            time.sleep(8)
    raise SystemExit('Shopify antwortet nicht')


keep = json.load(open(sys.argv[1]))
online = [p['id'] for p in G('{publications(first:30){nodes{id name}}}')['publications']['nodes'] if p['name'] == 'Online Store'][0]
fertig = []
for key, ids in keep.items():
    handle = f'startseite-pool-{ENDUNG[key]}'
    if len(ids) < MIN:
        print('ZU KLEIN', key, len(ids)); continue
    da = G('query($h:String!){collectionByHandle(handle:$h){id productsCount{count}}}', {'h': handle})['collectionByHandle']
    if da:
        print('EXISTIERT', handle, da['productsCount']['count'], '→ unverändert'); fertig.append(key); continue
    print('PLAN', handle, len(ids))
    if not LIVE:
        continue
    r = G('mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id handle} userErrors{field message}}}',
          {'i': {'title': f'Startseite Pool {TITEL[key]}', 'handle': handle, 'sortOrder': 'MANUAL', 'products': ids,
                 'metafields': [{'namespace': 'seo', 'key': 'hidden', 'type': 'number_integer', 'value': '1'}]}})['collectionCreate']
    if r['userErrors']:
        print('FEHLER', handle, r['userErrors']); continue
    cid = r['collection']['id']
    p = G('mutation($id:ID!,$in:[PublicationInput!]!){publishablePublish(id:$id,input:$in){userErrors{message}}}',
          {'id': cid, 'in': [{'publicationId': online}]})['publishablePublish']
    if p['userErrors']:
        print('PUBLISH-FEHLER', handle, p['userErrors'])
    time.sleep(2)
    n = G('query($id:ID!){collection(id:$id){productsCount{count} products(first:3){nodes{handle}}}}', {'id': cid})['collection']
    print('ANGELEGT', handle, n['productsCount']['count'], [x['handle'][:30] for x in n['products']['nodes']])
    fertig.append(key)
print('FERTIG', ','.join(fertig))
