"""Rizinusöl-Wickel-Seite verschönern (24.11.2026). LIVE=1 schreibt. Sicherung: dropship/rizinus-2411/vorher.json."""
import sys, json, os, time, subprocess
sys.path.insert(0, '../live2311')
from gql2 import gql
LIVE = os.environ.get('LIVE') == '1'
PID = 'gid://shopify/Product/16592643817863'
def q(*a):
    for i in range(8):
        try: return gql(*a)
        except BaseException as e:
            if i == 7: raise
            time.sleep(15)
vor = json.load(open('produkt.json'))
M = [m['id'] for m in vor['media']['nodes']]          # M[0] = Bild 1 …
V = {v['title']: v['id'] for v in vor['variants']['nodes']}
NEU = [('info_ausfuehrungen.jpg', 'Rizinusöl-Wickel: Ausführungen Bauchwickel mit Knöpfen, Klett oder Gummiband, Nackenwickel und Set'),
       ('info_anwendung.jpg', 'Rizinusöl-Wickel anwenden in 3 Schritten: Einlage mit Rizinusöl beträufeln, umlegen, schliessen'),
       ('weiss_knoepfe.jpg', 'Rizinusöl-Wickel Weiss, Bauchwickel mit Knöpfen'),
       ('schwarz_klett.jpg', 'Rizinusöl-Wickel Schwarz, Bauchwickel mit Klett')]
print('PLAN: 4 neue Bilder, Bild 11 (Collage mit Stockfoto) aus der Galerie, Variante Khaki/Knöpfe zuerst mit Lifestyle-Bild 2, Farbe Khaki zuerst')
if not LIVE: sys.exit(0)
# 1) hochladen
urls = []
env = dict(os.environ, SHOPIFY_ADMIN_TOKEN=open('/tmp/cj_shop_token.txt').read().strip(), SHOPIFY_SHOP='au3j0y-hq.myshopify.com')
for f, alt in NEU:
    tmp = f'/tmp/rizinus-wickel-{f}'; subprocess.run(['cp', f, tmp], check=True)
    u = subprocess.run(['/opt/node22/bin/node', '/home/user/aban-news-landing/automation/upload_to_shopify_cdn.mjs', tmp, alt], capture_output=True, text=True, env=env, timeout=180).stdout.strip()
    assert u.startswith('https://'), (f, u); urls.append(u); print('CDN', f, u)
r = q('mutation($p:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$p,media:$m){media{id ... on MediaImage{status}} mediaUserErrors{message}}}',
      {'p': PID, 'm': [{'originalSource': u, 'alt': a, 'mediaContentType': 'IMAGE'} for u, (_, a) in zip(urls, NEU)]})
assert not r['productCreateMedia']['mediaUserErrors'], r
neu_ids = [m['id'] for m in r['productCreateMedia']['media']]
print('neue Medien', neu_ids)
for _ in range(20):
    st = q('query($p:ID!){product(id:$p){media(first:60){nodes{id status}}}}', {'p': PID})['product']['media']['nodes']
    s = {n['id']: n['status'] for n in st}
    if all(s.get(i) == 'READY' for i in neu_ids): break
    time.sleep(6)
print('Status', [s.get(i) for i in neu_ids])
INFO_A, INFO_B, WEISS, SCHWARZ = neu_ids
# 2) Varianten-Bilder (eine Variante = ein Bild)
upd = [{'id': V['Khaki / Bauchwickel · Knöpfe'], 'mediaId': M[1]}, {'id': V['Weiss / Bauchwickel · Knöpfe'], 'mediaId': WEISS},
       {'id': V['Schwarz / Bauchwickel · Klett'], 'mediaId': SCHWARZ}]
r = q('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{field message}}}', {'p': PID, 'v': upd})
print('Variantenbilder', r['productVariantsBulkUpdate']['userErrors'])
# 3) Farbe Khaki zuerst + Variante Khaki/Knöpfe auf Position 1
opt = q('query($p:ID!){product(id:$p){options{id name optionValues{id name}}}}', {'p': PID})['product']['options']
farbe = [o for o in opt if o['name'] == 'Farbe'][0]
werte = sorted(farbe['optionValues'], key=lambda x: ['Khaki', 'Rosa', 'Weiss', 'Schwarz'].index(x['name']))
r = q('mutation($p:ID!,$o:[OptionReorderInput!]!){productOptionsReorder(productId:$p,options:$o){userErrors{field message}}}',
      {'p': PID, 'o': [{'id': farbe['id'], 'values': [{'id': w['id']} for w in werte]}] + [{'id': o['id']} for o in opt if o['name'] != 'Farbe']})
print('Optionen', r['productOptionsReorder']['userErrors'])
r = q('mutation($p:ID!,$pos:[ProductVariantPositionInput!]!){productVariantsBulkReorder(productId:$p,positions:$pos){userErrors{field message}}}',
      {'p': PID, 'pos': [{'id': V['Khaki / Bauchwickel · Knöpfe'], 'position': 1}]})
print('Variantenreihenfolge', r['productVariantsBulkReorder']['userErrors'])
# 4) Galerie-Reihenfolge (Bildnummern 1-basiert aus vorher.json)
def b(n): return M[n - 1]
reihe = [b(1), b(2), INFO_A, INFO_B, b(3), b(4), b(21),
         b(5), b(6), b(8), b(25), b(23), b(7),
         b(9), b(13), b(14), b(15), b(28), b(19),
         WEISS, b(16), b(18), b(24), b(17), b(20),
         SCHWARZ, b(10), b(27), b(12), b(22), b(26)]
r = q('mutation($p:ID!,$m:[MoveInput!]!){productReorderMedia(id:$p,moves:$m){job{id} mediaUserErrors{message}}}',
      {'p': PID, 'm': [{'id': i, 'newPosition': str(n)} for n, i in enumerate(reihe)]})
print('Reihenfolge', r['productReorderMedia']['mediaUserErrors'])
time.sleep(8)
# 5) Bild 11 (Collage mit ausgeschnittenem Stockfoto) entfernen — Original liegt in dropship/rizinus-2411/bild11_collage.jpg
r = q('mutation($p:ID!,$m:[ID!]!){productDeleteMedia(productId:$p,mediaIds:$m){deletedMediaIds mediaUserErrors{message}}}', {'p': PID, 'm': [b(11)]})
print('Bild 11 entfernt', r['productDeleteMedia'])
json.dump({'neu_ids': neu_ids, 'urls': urls, 'reihe': reihe}, open('/home/user/aban-news-landing/dropship/rizinus-2411/nachher_plan.json', 'w'), indent=1)
