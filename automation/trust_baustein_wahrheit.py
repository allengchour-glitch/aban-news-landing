#!/usr/bin/env python3
"""trust_baustein_wahrheit.py — «✅ Geprüfte Qualität» → «✅ Geprüfte Angaben» im Produkttext (02.09.2026).

Der Importer-Baustein «🛡️ Sorglos shoppen: ✅ Geprüfte Qualität · …» steht in über 10'000 aktiven
Produkttexten. Geprüft werden hier ANGABEN (Titel, Aussagen, Kanäle), nicht die Ware — die Zusage
ist eine Überzusage (Lehre 29.08. am Vertrauensblock der Startseite). Auf der Produktseite ist der
Kasten seit 02.09. zur Laufzeit ausgeblendet; im JSON-LD und im Google-Feed steht der Satz weiter,
weil beide `product.description` roh lesen. Deshalb dieser Schreiber.

Regeln (Lehren 15.08./23.08.): LIVE lesen, EXAKTE Zeichenkette ersetzen, sofort schreiben (keine
Stunden zwischen Lesen und Schreiben), Quittung nur nach gelesener Antwort, DRY zuerst.
  DRY=1        nur anzeigen
  CAP=N        max Produkte je Lauf (Standard 800)
Ledger: dropship/_trust_baustein_wahrheit.txt
"""
import json, os, sys, time, urllib.request
ALT = '✅ Geprüfte Qualität'
NEU = '✅ Geprüfte Angaben'
DRY = os.environ.get('DRY') == '1'
CAP = int(os.environ.get('CAP', '800'))
LEDGER = os.path.join(os.path.dirname(__file__), '..', 'dropship', '_trust_baustein_wahrheit.txt')
SHOP = 'au3j0y-hq.myshopify.com'
API = f'https://{SHOP}/admin/api/2024-10/graphql.json'

def token():
    return open('/tmp/cj_shop_token.txt').read().strip()

def gql(q, v=None, versuche=8):
    for i in range(versuche):
        try:
            req = urllib.request.Request(API, data=json.dumps({'query': q, 'variables': v or {}}).encode(),
                headers={'X-Shopify-Access-Token': token(), 'Content-Type': 'application/json'})
            r = json.loads(urllib.request.urlopen(req, timeout=60).read())
        except Exception as e:
            time.sleep(2 * (i + 1)); continue
        errs = r.get('errors') or []
        if any('Throttled' in str(e.get('message', '')) for e in errs):
            ts = (r.get('extensions') or {}).get('cost', {}).get('throttleStatus', {})
            need = max(1.0, (ts.get('requestedQueryCost', 100) - ts.get('currentlyAvailable', 0)) / max(1, ts.get('restoreRate', 100)))
            time.sleep(min(30, need + 0.5)); continue
        if errs: print('GQL-Fehler:', errs[:1], file=sys.stderr); return None
        return r.get('data')
    return None

done = set()
if os.path.exists(LEDGER):
    done = {l.split('\t')[0] for l in open(LEDGER, encoding='utf-8') if l.strip()}

geschrieben = 0; geprueft = 0; ohne = 0; cursor = None; fertig = False
while not fertig and geschrieben < CAP:
    d = gql('query($c:String){ products(first:50, after:$c, query:"status:active AND \\"Geprüfte Qualität\\""){ pageInfo{hasNextPage endCursor} nodes{ id title descriptionHtml } } }', {'c': cursor})
    if not d:
        print('PAUSE (Shopify blieb stumm)'); break
    pg = d['products']
    for p in pg['nodes']:
        pid = p['id'].split('/')[-1]
        if pid in done: continue
        geprueft += 1
        h = p['descriptionHtml'] or ''
        n = h.count(ALT)
        if n == 0:
            ohne += 1
            if not DRY:  # ein Anzeigemodus merkt keinen Fortschritt (Lehre 28.08.)
                with open(LEDGER, 'a', encoding='utf-8') as f: f.write(f'{pid}\tohne-befund\t{p["title"][:60]}\n')
            done.add(pid); continue
        neu = h.replace(ALT, NEU)
        if DRY:
            print(f'  [DRY] {pid} ×{n} | {p["title"][:60]}'); geschrieben += 1
            if geschrieben >= CAP: fertig = True; break
            continue
        m = gql('mutation($i:ProductInput!){ productUpdate(input:$i){ product{ descriptionHtml } userErrors{ message } } }',
                {'i': {'id': p['id'], 'descriptionHtml': neu}})
        pu = (m or {}).get('productUpdate') or {}
        if not m or pu.get('userErrors') or ALT in (pu.get('product') or {}).get('descriptionHtml', ALT):
            print(f'  ⛔ {pid} nicht geschrieben: {pu.get("userErrors")}'); continue
        with open(LEDGER, 'a', encoding='utf-8') as f: f.write(f'{pid}\tersetzt-{n}\t{p["title"][:60]}\n')
        done.add(pid); geschrieben += 1
        if geschrieben % 50 == 0: print(f'  … {geschrieben} geschrieben', flush=True)
        if geschrieben >= CAP: fertig = True; break
        time.sleep(0.25)
    if not pg['pageInfo']['hasNextPage']: fertig = True; print('FERTIG: keine weiteren Kandidaten im Index')
    cursor = pg['pageInfo']['endCursor']
print(f'{"[DRY] " if DRY else ""}geprüft {geprueft} · geschrieben {geschrieben} · ohne Befund {ohne}')
