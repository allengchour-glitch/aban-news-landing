# Kurzlinks /fb, /th, /pin wie /ig /tt /yt: Shopify-URL-Weiterleitung (301) auf die Wegweiser-Sammlung mit UTM.
# Trockenlauf ist Vorgabe; LIVE=1 legt an; ZURUECK=1 LIVE=1 löscht genau diese drei Pfade wieder.
import json, os, sys, urllib.request
SHOP = os.environ.get('SHOPIFY_SHOP') or 'au3j0y-hq.myshopify.com'
def token():
    b = json.dumps({'client_id': os.environ['SHOPIFY_CLIENT_ID'], 'client_secret': os.environ['SHOPIFY_CLIENT_SECRET'].strip()[:38] if os.environ['SHOPIFY_CLIENT_SECRET'].strip().startswith('shpss_') else os.environ['SHOPIFY_CLIENT_SECRET'].strip(), 'grant_type': 'client_credentials'}).encode()
    r = urllib.request.Request(f'https://{SHOP}/admin/oauth/access_token', data=b, method='POST', headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(r, timeout=30))['access_token']
T = token()
def gql(q, v=None):
    r = urllib.request.Request(f'https://{SHOP}/admin/api/2025-01/graphql.json', data=json.dumps({'query': q, 'variables': v or {}}).encode(), method='POST',
                               headers={'Content-Type': 'application/json', 'X-Shopify-Access-Token': T})
    return json.load(urllib.request.urlopen(r, timeout=60))
ZIEL = '/collections/aus-tiktok-und-instagram?utm_source={q}&utm_medium=bio&utm_campaign=profil&utm_content={k}_kurzlink'
PLAN = [('/fb', 'facebook', 'fb'), ('/th', 'threads', 'th'), ('/pin', 'pinterest', 'pin')]
LIVE = os.environ.get('LIVE') == '1'; ZURUECK = os.environ.get('ZURUECK') == '1'
for pfad, quelle, k in PLAN:
    d = gql('query($q:String!){ urlRedirects(first:5, query:$q){ nodes{ id path target } } }', {'q': f'path:{pfad}'})
    vorhanden = [n for n in d['data']['urlRedirects']['nodes'] if n['path'] == pfad]
    ziel = ZIEL.format(q=quelle, k=k)
    if ZURUECK:
        for n in vorhanden:
            print('LÖSCHEN', pfad, n['id'], '(Trockenlauf)' if not LIVE else '')
            if LIVE: print(gql('mutation($id:ID!){ urlRedirectDelete(id:$id){ deletedUrlRedirectId userErrors{ field message } } }', {'id': n['id']})['data'])
        continue
    if vorhanden:
        print('VORHANDEN', pfad, '->', vorhanden[0]['target'], '(nichts geändert)'); continue
    print('ANLEGEN', pfad, '->', ziel, '' if LIVE else '(Trockenlauf)')
    if LIVE:
        r = gql('mutation($r:UrlRedirectInput!){ urlRedirectCreate(urlRedirect:$r){ urlRedirect{ id path target } userErrors{ field message } } }', {'r': {'path': pfad, 'target': ziel}})
        print('  ', json.dumps(r.get('data') or r, ensure_ascii=False))
