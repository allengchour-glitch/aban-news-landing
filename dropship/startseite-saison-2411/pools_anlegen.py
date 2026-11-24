"""Legt die drei Saison-Pools an (manuell, versteckt, nur Online Store) und füllt sie in der geprüften Reihenfolge. LIVE=1 schreibt."""
import sys, json, time, os
sys.path.insert(0, '../live2311')
from gql2 import gql
LIVE = os.environ.get('LIVE') == '1'
OS = 'gid://shopify/Publication/301970915713'
def q(*a):
    for _ in range(8):
        try: return gql(*a)
        except BaseException: time.sleep(20)
    raise SystemExit('gedrosselt')
plan = json.load(open('pool_plan.json'))   # {handle: {"title":..., "ids":[...]}}
for h, p in plan.items():
    ex = q('query($h:String!){collectionByHandle(handle:$h){id}}', {'h': h})['collectionByHandle']
    print(h, 'vorhanden' if ex else 'neu', len(p['ids']))
    if not LIVE: continue
    if not ex:
        r = q('''mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id handle} userErrors{field message}}}''',
              {'i': {'title': p['title'], 'handle': h, 'sortOrder': 'MANUAL',
                     'descriptionHtml': '<p>Interne Auswahl für die Startseite. Nicht zum Stöbern gedacht.</p>',
                     'metafields': [{'namespace': 'seo', 'key': 'hidden', 'type': 'number_integer', 'value': '1'}]}})
        assert not r['collectionCreate']['userErrors'], r
        cid = r['collectionCreate']['collection']['id']
        assert r['collectionCreate']['collection']['handle'] == h, r
        r = q('mutation($i:ID!,$p:[PublicationInput!]!){publishablePublish(id:$i,input:$p){userErrors{message}}}', {'i': cid, 'p': [{'publicationId': OS}]})
        assert not r['publishablePublish']['userErrors'], r
    else:
        cid = ex['id']
    have = [n['id'] for n in q('query($i:ID!){collection(id:$i){products(first:100){nodes{id}}}}', {'i': cid})['collection']['products']['nodes']]
    add = [i for i in p['ids'] if i not in have]
    if add:
        r = q('mutation($i:ID!,$p:[ID!]!){collectionAddProducts(id:$i,productIds:$p){userErrors{message}}}', {'i': cid, 'p': add})
        assert not r['collectionAddProducts']['userErrors'], r
    time.sleep(3)
    moves = [{'id': pid, 'newPosition': str(n)} for n, pid in enumerate(p['ids'])]
    r = q('mutation($i:ID!,$m:[MoveInput!]!){collectionReorderProducts(id:$i,moves:$m){userErrors{message}}}', {'i': cid, 'm': moves})
    assert not r['collectionReorderProducts']['userErrors'], r
    time.sleep(8)
    ist = [n['id'] for n in q('query($i:ID!){collection(id:$i){products(first:100,sortKey:MANUAL){nodes{id}}}}', {'i': cid})['collection']['products']['nodes']]
    pub = q('query($i:ID!){collection(id:$i){publishedOnPublication(publicationId:"%s")}}' % OS, {'i': cid})['collection']['publishedOnPublication']
    print(h, cid, 'nachgelesen', len(ist), 'Reihenfolge gleich' if ist == p['ids'] else 'ABWEICHUNG', 'Online Store', pub)
