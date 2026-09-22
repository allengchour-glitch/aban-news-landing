#!/usr/bin/env python3
"""Baut dropship/_pinterest_pins_queue.tsv — die Warteschlange für pinterest_pin_erstellen.mjs (Hetzner-Agent).

ANLASS (22.09.2026, Betreiber «push mehr» Besucher): Pinterest ist der einzige organische Kanal, den wir
selbst anschieben dürfen (nicht unter dropship/_SOCIAL_STOPP). Der erste Pin lief am 22.09. 12:56 UTC
durch und wurde auf der Pinnwand nachgelesen.

Auswahl: kaufbare aktive Produkte aus Kollektionen mit Verkehr, ≥2 Bilder, ab CHF 19, keine Risiko-Tags
(Kostüm/18plus/Medizinprodukt/Klinge/…), Text in du-Form (Sie-Form wird ausgeschlossen), Board nach Titel/
Typ/Tags auf die sechs Pinnwände. Das Skript liest nur aus dem Shop; wer schon gepinnt ist, entscheidet der
Agent aus auftraege/erledigt (Quittung) und der Pinnwand selbst (Plattform-Wahrheit).
  MAX=n je Kollektion (Standard 8) · Ausgabe überschreibt die TSV (Kopf: handle board title url bild text)
"""
import json, os, re, html, urllib.request
from collections import Counter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, "dropship", "_pinterest_pins_queue.tsv")
MAX = int(os.environ.get("MAX", "8"))
TOK = open('/tmp/cj_shop_token.txt').read().strip()
KOLL = ['hype-jetzt', 'bestseller', 'neu-eingetroffen', 'trends-gadgets', 'wohnen-dekoration', 'schmuck-uhren',
        'beauty-pflege', 'damen-mode', 'fur-ihn', 'herrenuhren-schmuck', 'herren-schuhe', 'schuhe-sneaker', 'sub-haustier',
        'sub-kueche', 'lampen-leuchten', 'sub-ohrringe', 'sub-halsketten', 'sub-ringe', 'uhren', 'wellness-massage',
        'sommer', 'weihnachten-2026', 'premium-schmuck', 'wasserfester-schmuck']
BOARDS = {'herren': 'Herrenmode Schweiz', 'schmuck': 'Schmuck & Accessoires', 'damen': 'Sommerkleider & Damenmode 2026',
          'wellness': 'Wellness & Beauty', 'home': 'Home & Geschenkideen', 'schuhe': 'Schuhe & Sandalen'}
RISK = re.compile(r'kost|18plus|erotik|medizinprodukt|nicht-bewerben|klinge|waffen|raucher|kiffer|duplikat|heilversprechen|verdeckte|abhoer', re.I)
SIE = re.compile(r"\b(Sie|Ihnen|Ihr|Ihre|Ihrem|Ihren|Ihrer)\b")


def gql(q, v=None):
    r = urllib.request.Request('https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json',
                               data=json.dumps({'query': q, 'variables': v or {}}).encode(),
                               headers={'X-Shopify-Access-Token': TOK, 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(r, timeout=90))


def board(p):
    t = (p['title'] + ' ' + (p['productType'] or '') + ' ' + ' '.join(p['tags'])).lower()
    if re.search(r'schuh|sandale|sneaker|stiefel|pantoffel|slipper|pumps', t): return BOARDS['schuhe']
    if re.search(r'ohrring|halskette|armband|ring\b|schmuck|uhr\b|uhren|kette|anhänger', t): return BOARDS['schmuck']
    if re.search(r'herren|männer|for-him|fur-ihn', t): return BOARDS['herren']
    if re.search(r'kleid|damen|bluse|rock\b|jupe|leggings|top\b|bikini|damenmode|women', t): return BOARDS['damen']
    if re.search(r'beauty|wellness|massage|haut|pflege|kosmetik|make-up|makeup|haar|zahn|aroma|diffuser|yoga|fitness', t): return BOARDS['wellness']
    return BOARDS['home']


def txt(h):
    return re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', ' ', h or ''))).strip()


def main():
    kand = {}
    for coll in KOLL:
        d = gql('query($h:String!){collectionByHandle(handle:$h){products(first:40,sortKey:BEST_SELLING){nodes{handle title status productType tags mediaCount{count} descriptionHtml featuredMedia{preview{image{url}}} priceRangeV2{minVariantPrice{amount}} variants(first:1){nodes{availableForSale}}}}}}', {'h': coll})
        c = (d.get('data') or {}).get('collectionByHandle')
        if not c:
            print("  Kollektion fehlt:", coll); continue
        n = 0
        for p in c['products']['nodes']:
            if p['status'] != 'ACTIVE' or p['handle'] in kand: continue
            if (p['mediaCount']['count'] or 0) < 2 or float(p['priceRangeV2']['minVariantPrice']['amount']) < 19: continue
            if not p['variants']['nodes'] or not p['variants']['nodes'][0]['availableForSale']: continue
            if RISK.search(' '.join(p['tags']) + ' ' + p['title']): continue
            img = ((p['featuredMedia'] or {}).get('preview') or {}).get('image', {}).get('url')
            if not img: continue
            t = txt(p['descriptionHtml']); s = re.split(r'(?<=[.!?])\s+', t)
            beschr = ' '.join(s[:2])[:380].rstrip()
            if SIE.search(beschr): beschr = s[0][:200]
            if SIE.search(beschr) or len(beschr) < 40: continue
            preis = float(p['priceRangeV2']['minVariantPrice']['amount'])
            beschr = f"{beschr} · CHF {preis:.2f} bei LuxeStyle CH — Gratis-Versand ab CHF 50, Kauf auf Rechnung mit Klarna oder TWINT."
            kand[p['handle']] = [p['handle'], board(p), p['title'][:95], f"https://luxestyle.ch/products/{p['handle']}",
                                 img.split('?')[0] + '?width=1200', beschr.replace('\t', ' ').replace('\n', ' ')]
            n += 1
            if n >= MAX: break
    # Reihum über die Pinnwände, damit nicht 18 Home-Pins vor dem ersten Schmuck-Pin kommen
    je_board = {}
    for k in kand.values(): je_board.setdefault(k[1], []).append(k)
    reihe = []
    while any(je_board.values()):
        for b in list(je_board):
            if je_board[b]: reihe.append(je_board[b].pop(0))
    with open(OUT, 'w') as f:
        f.write("handle\tboard\ttitle\turl\tbild\ttext\n")
        for k in reihe: f.write('\t'.join(k) + '\n')
    print("Warteschlange:", len(kand), dict(Counter(k[1] for k in kand.values())))


if __name__ == "__main__":
    main()
