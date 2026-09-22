#!/usr/bin/env python3
"""cj_bild_nachtrag.py — traegt fehlende Bilder aus dem CJ-Listing nach (Klasse «1-Bild-Produkt»).

WARUM (22.09.2026): Das Karten-Karussell (Horizon, card-gallery) braucht >= 2 Bilder; ein Produkt
mit EINEM Bild hat auf der Kollektionsseite kein Karussell und auf der Produktseite keine
Galerie. GEMESSEN im Export vom 22.09.: 51'342 aktive Produkte, 1'927 mit einem Bild, davon
831 CJ (`cj-real`) — und CJ liefert per `product/query?pid=` 3–10 Bilder je Listing. Der Fortura-
Rest (856) hat keine Zusatzbilder im Feed (17.09. gemessen), fuer den gibt es nichts zu holen.
Erster Fall: «Futterspielzeug Karotte» (besuchte Landeseite), 1 -> 5 Bilder.

VERFAHREN: Kandidaten = aktive `cj-real` mit mediaCount <= 1 aus /tmp/export.jsonl (wenn juenger
als 3 Tage) — sonst wird die Produktliste per GraphQL geblaettert (mediaCount im Feld). Je Produkt:
pid aus der SKU (`CJ-<pid>` oder `CJ-<pid>-…`), CJ-Bildliste holen, jede URL per HTTP-HEAD auf 200
pruefen (Bild-Falle: quick/product 404), Dublette zum Hauptbild ueberspringen, bis 6 Bilder per
`productCreateMedia` anlegen, danach Medienzahl RUECKLESEN. Ledger `dropship/_cj_bild_nachtrag.txt`
(handle\tergebnis). CJ-Aufrufe ueber cj_takt (ein Takt fuer alle Verbraucher).
ENV: LIMIT (Standard 150 je Lauf) · DRY=1
"""
import json, os, re, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cj_takt import takt, frei

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOK = open('/tmp/cj_shop_token.txt').read().strip()
URL = 'https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json'
LEDGER = os.path.join(REPO, 'dropship/_cj_bild_nachtrag.txt')
EXPORT = '/tmp/export.jsonl'
LIMIT = int(os.environ.get('LIMIT', '150'))
DRY = os.environ.get('DRY') == '1'


def _cj_token():
    try:
        d = json.load(open('/tmp/cj_token.json'))
        t = d.get('accessToken') or (d.get('data') or {}).get('accessToken') or d.get('token')
        if t: return t
    except Exception: pass
    try:
        for l in open('/tmp/cj_creds.env'):
            if l.startswith(('CJ_TOKEN=', 'export CJ_TOKEN=')): return l.split('=', 1)[1].strip().strip('"')
    except Exception: pass
    print('CJ-Token fehlt — NICHT MESSBAR'); sys.exit(2)


CJTOK = _cj_token()


def cj(path):
    for _ in range(5):
        takt()
        out = subprocess.run(['curl', '-s', '--max-time', '40', '-H', 'CJ-Access-Token: ' + CJTOK,
                              'https://developers.cjdropshipping.com' + path], capture_output=True, text=True).stdout
        frei()
        try: d = json.loads(out)
        except Exception: time.sleep(2); continue
        if str(d.get('code')) in ('1600200', '1600201'): time.sleep(1.5); continue
        return d
    return None


def gql(q, v=None):
    a = ['curl', '-s', '--max-time', '60', '-X', 'POST', URL, '-H', 'X-Shopify-Access-Token: ' + TOK,
         '-H', 'Content-Type: application/json', '-d', json.dumps({'query': q, 'variables': v or {}})]
    for versuch in range(5):
        out = subprocess.run(a, capture_output=True, text=True).stdout
        try: d = json.loads(out)
        except Exception: time.sleep(3); continue
        if d.get('errors') and any('THROTTLED' in str(e) for e in d['errors']): time.sleep(6); continue
        return d
    raise RuntimeError('Shopify antwortet nicht (5 Versuche)')


def kandidaten():
    if os.path.exists(EXPORT) and time.time() - os.path.getmtime(EXPORT) < 3 * 86400:
        out = []
        for l in open(EXPORT):
            d = json.loads(l)
            if not d.get('id', '').startswith('gid://shopify/Product/') or d.get('status') != 'ACTIVE': continue
            if 'cj-real' in (d.get('tags') or []) and (d.get('mediaCount') or {}).get('count', 0) <= 1:
                out.append(d['id'])
        return out, 'export'
    out = []; cur = None
    while True:
        d = gql('query($c:String){products(first:250,query:"status:active tag:cj-real",after:$c){pageInfo{hasNextPage endCursor} nodes{id mediaCount{count}}}}', {'c': cur})['data']['products']
        out += [p['id'] for p in d['nodes'] if (p['mediaCount'] or {}).get('count', 0) <= 1]
        if not d['pageInfo']['hasNextPage']: break
        cur = d['pageInfo']['endCursor']
    return out, 'graphql'


def main():
    fertig = set()
    if os.path.exists(LEDGER):
        fertig = {l.split('\t')[0] for l in open(LEDGER)}
    ids, quelle = kandidaten()
    offen = [i for i in ids if i not in fertig]
    print(f'Kandidaten {len(ids)} ({quelle}), offen {len(offen)}, Lauf bis {LIMIT}')
    n = 0; plus = 0
    for gid in offen[:LIMIT]:
        p = (gql('query($id:ID!){product(id:$id){id handle title status media(first:20){nodes{... on MediaImage{image{url}}}} variants(first:1){nodes{sku}}}}', {'id': gid}).get('data') or {}).get('product')
        if not p: continue
        n += 1
        erg = 'kein-cj-pid'
        sku = (p['variants']['nodes'] or [{}])[0].get('sku') or ''
        # SKU-Formen (22.09. gemessen): `CJ-<pid 18–19 Ziffern>` (neuere Importe) ODER
        # `CJ-CJYD2867018` / `cj-CJMZ2930713` = CJ-PRODUKTCODE (aeltere) -> productSku= statt pid=
        # (beide Endpunkte antworten 200 mit productImageSet; Test 22.09.: 17 bzw. 5 Bilder).
        m = re.match(r'(?i)cj-(\d{12,})', sku)
        mc = re.match(r'(?i)cj-(CJ[A-Z0-9]{6,})', sku)
        if p['status'] != 'ACTIVE': erg = 'nicht-aktiv'
        elif len(p['media']['nodes']) > 1: erg = 'hat-schon'
        elif m or mc:
            frage = ('/api2.0/v1/product/query?pid=' + m.group(1)) if m else ('/api2.0/v1/product/query?productSku=' + mc.group(1))
            d = cj(frage) or {}
            if str(d.get('code')) != '200':
                erg = f'cj-{d.get("code")}'
            else:
                imgs = (d.get('data') or {}).get('productImageSet') or []
                if isinstance(imgs, str):
                    try: imgs = json.loads(imgs)
                    except Exception: imgs = [imgs]
                vorhanden = {u['image']['url'].split('?')[0].rsplit('/', 1)[-1].split('.')[0][:20] for u in p['media']['nodes'] if u.get('image')}
                gut = []
                for u in imgs[:10]:
                    if not str(u).startswith('http'): continue
                    if u.rsplit('/', 1)[-1].split('.')[0][:20] in vorhanden: continue
                    code = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '20', '-I', u], capture_output=True, text=True).stdout
                    if code == '200': gut.append(u)
                    if len(gut) >= 6: break
                if not gut: erg = 'cj-keine-weiteren'
                elif DRY: erg = f'DRY-{len(gut)}'
                else:
                    r = gql('mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){media{status} mediaUserErrors{message}}}',
                            {'id': p['id'], 'm': [{'originalSource': u, 'mediaContentType': 'IMAGE', 'alt': p['title']} for u in gut]})
                    pcm = (r.get('data') or {}).get('productCreateMedia') or {}
                    if pcm.get('mediaUserErrors'):
                        erg = 'fehler:' + str(pcm['mediaUserErrors'])[:80]
                    else:
                        time.sleep(6)
                        q = (gql('query($id:ID!){product(id:$id){media(first:20){nodes{status}}}}', {'id': p['id']}).get('data') or {}).get('product') or {}
                        st = [x['status'] for x in (q.get('media') or {}).get('nodes') or []]
                        erg = f'plus-{len(gut)}-medien-{len(st)}' if len(st) > 1 else 'ruecklesen-1'
                        plus += len(gut)
        print(erg, p['handle'])
        if not DRY or erg.startswith('cj-') or erg in ('kein-cj-pid', 'hat-schon', 'nicht-aktiv'):
            with open(LEDGER, 'a') as f: f.write(f'{gid}\t{erg}\t{p["handle"]}\n')
    print(f'FERTIG: {n} geprüft, {plus} Bilder angelegt, offen danach {max(0, len(offen) - n)}')


if __name__ == '__main__':
    main()
