#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
handle_messversprechen.py — nimmt unhaltbare Mess-Behauptungen aus der PRODUKT-URL.

DER FUND (21.08.2026): Nach dem Bereinigen von Titel und Beschreibung hiess ein Produkt
«F600 Fitness-Smartwatch mit Aktivitäts-Tracking» — seine Adresse aber weiterhin
`/products/f600-smartwatch-mit-blutzucker-tracking-606700`. **34 aktive Produkte** tragen
Blutzucker, Blutdruck, EKG oder Harnsäure im Handle, obwohl die Titel längst sauber sind.
Die URL ist kundensichtbar und für Google lesbar; für den Merchant-Kanal zählt sie mit.

Das ist dieselbe Lehre wie bei der Refurb-Prüfung des Audits: **der Handle trägt die Spur
weiter, auch wenn der Titel gesäubert wurde.** Wer eine Angabe aus einem Feld entfernt, muss
prüfen, welches andere Feld sie noch trägt — Titel, Beschreibung, SEO-Felder, Handle.

WIE REPARIERT WIRD:
- Neuer Handle aus dem AKTUELLEN (bereits sauberen) Titel; die Eindeutigkeitsnummer des
  Importers am Ende bleibt erhalten, sonst kollidieren gleichnamige Produkte.
- **Immer mit 301.** Ein Handle-Wechsel legt in Shopify KEINE Weiterleitung an; ohne sie
  wird jeder bestehende Link — auch der in Googles Index — zu einem 404.
- Enthält der neue Handle den Begriff immer noch (weil er im Titel steht), wird das Produkt
  ÜBERSPRUNGEN und gemeldet: dann ist der Titel das eigentliche Problem, nicht die URL.

⚠️ NICHT ANGEFASST: das Metafeld `judgeme.review_widget_data`. Darin steht ein
zwischengespeicherter Produktname der Review-App («F600 Smartwatch mit Blutzucker-Tracking»).
Das ist fremder App-Cache, der sich beim nächsten Sync selbst erneuert — daran zu schreiben
riskiert ein kaputtes Bewertungs-Widget für einen Wert, den niemand sieht.

Nutzung:  DRY=1 python3 automation/handle_messversprechen.py
"""
import json, os, re, time, unicodedata, urllib.request

SHOP  = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOKEN = os.environ.get('SHOPIFY_ADMIN_TOKEN') or open('/tmp/cj_shop_token.txt').read().strip()
DRY   = os.environ.get('DRY') == '1'
CAP   = int(os.environ.get('CAP', '60'))
LEDGER = 'dropship/_handle_mess.txt'
BEGRIFFE = ['blutzucker', 'blutdruck', 'ekg', 'harnsaeure', 'harnsäure', 'blutfett', 'glukose']

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

def slug(t):
    t = t.lower()
    for a, b in [('ä','a'),('ö','o'),('ü','u'),('ß','ss'),('é','e'),('è','e'),('à','a')]:
        t = t.replace(a, b)
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode()
    t = re.sub(r'[^a-z0-9]+', '-', t).strip('-')
    return re.sub(r'-{2,}', '-', t)

def main():
    fertig = set()
    if os.path.exists(LEDGER):
        fertig = {l.split('\t')[0] for l in open(LEDGER, encoding='utf-8') if l.strip()}

    kand = {}
    for begriff in BEGRIFFE:
        cur = None
        while True:
            r = gql('''query($q:String!,$c:String){products(first:100,after:$c,query:$q){
                       pageInfo{hasNextPage endCursor} nodes{id handle title}}}''',
                    {'q': f'status:active AND handle:*{begriff}*', 'c': cur})
            p = r['data']['products']
            for n in p['nodes']:
                if re.search(rf'(^|-){begriff}[a-z]*(-|$)', n['handle'], re.I) and n['id'] not in fertig:
                    kand[n['id']] = n
            if not p['pageInfo']['hasNextPage']: break
            cur = p['pageInfo']['endCursor']; time.sleep(0.4)
        time.sleep(0.3)

    print(f"Kandidaten: {len(kand)}")
    ok = titel_schuld = 0
    for n in list(kand.values())[:CAP]:
        alt = n['handle']
        # Die Eindeutigkeitsnummer des Importers am Ende erhalten
        # Die Eindeutigkeitsnummer ist NICHT immer rein numerisch: der Importer haengt auch
        # Hex-Suffixe an (…-e49535, …-88195c, …-bab88a). Ein Muster nur auf Ziffern verwarf sie
        # und haette den Handle ohne Eindeutigkeitsteil neu gebaut = Kollisionsgefahr.
        m = re.search(r'-([a-z0-9]{4,})$', alt, re.I)
        nummer = m.group(1) if (m and re.search(r'\d', m.group(1))) else ''
        neu = slug(n['title'])[:60].strip('-')
        if nummer: neu = f"{neu}-{nummer}"
        if any(re.search(rf'(^|-){b}[a-z]*(-|$)', neu, re.I) for b in BEGRIFFE):
            print(f"  ! {n['title'][:44]} — Begriff steht im TITEL, nicht nur in der URL")
            titel_schuld += 1
            continue
        if neu == alt:
            continue
        if DRY:
            print(f"  ~ /{alt}\n      → /{neu}")
        else:
            r = gql('''mutation($in:ProductInput!){productUpdate(input:$in){
                       product{handle} userErrors{message}}}''',
                    {'in': {'id': n['id'], 'handle': neu}})
            e = (r.get('data') or {}).get('productUpdate', {}).get('userErrors') or []
            if e: print(f"  X {alt[:40]}: {e[0]['message']}"); continue
            echt = r['data']['productUpdate']['product']['handle']   # Shopify kann anhängen
            # 301, sonst wird jeder bestehende Link (auch Googles Index) zum 404
            r2 = gql('''mutation($in:UrlRedirectInput!){urlRedirectCreate(urlRedirect:$in){
                        urlRedirect{path} userErrors{message}}}''',
                     {'in': {'path': f'/products/{alt}', 'target': f'/products/{echt}'}})
            w = r2['data']['urlRedirectCreate']
            open(LEDGER, 'a', encoding='utf-8').write(
                f"{n['id']}\t{alt}\t{echt}\t{'301' if w['urlRedirect'] else 'OHNE-301'}\n")
            time.sleep(0.7)
        ok += 1
    print(f"{'DRY ' if DRY else ''}Handles geaendert: {ok} · Begriff steckt im Titel: {titel_schuld}")
    if ok == 0: print("FERTIG")

main()
