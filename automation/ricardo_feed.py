#!/usr/bin/env python3
"""ricardo_feed.py — Produkt-Feed für Ricardo.ch aus der Schweizer-Lager-Ware (Fortura) (05.10.2026, Betreiber «kannst du ricardo machen»).

WARUM NUR FORTURA: Ricardo-Käufer erwarten Lieferung in Tagen; CJ-Ware braucht 10–20 Werktage (schlechte Bewertungen).
WARUM NUR EIN TEIL: Ricardo nimmt 8–12 % Erfolgsprovision (Mode/Wohnen 12 %). Fortura-Marge im Median 21 % (z. B. VK 49.90,
EK 39.46) → nach 12 % bleiben oft CHF 4. Regel: VK·0.88 − EK ≥ CHF 5 (gemessen 05.10.: 364 von 2'388 Produkten).
Draussen: Klingen (klingenregel), Entwürfe, nicht im Onlineshop, Varianten ohne Bestand. Keine Einkaufspreise im Feed
(das Repo ist öffentlich und die Datei wird per URL abgerufen).

Format: Google-Shopping-Spalten als TSV (id, item_group_id, title, description, link, image_link, additional_image_link,
price, availability, quantity, gtin, brand, condition, product_type, shipping_time) → dropship/ricardo/ricardo_feed.csv.
Ricardo richtet den Feed nach Mail an accountmanagement@ricardo.ch ein (Feed-URL + Shopify-Handle au3j0y-hq).
Eingabe Kandidaten: Voll-Export /tmp/kost28.jsonl (Kosten-Kette des Aufsehers); Bestand/Status LIVE.
  python3 automation/ricardo_feed.py           → schreibt den Feed, druckt «RICARDO-FEED: n Produkte / m Varianten»
"""
import csv, html, json, os, re, sys
HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql
from klingenregel import ist_klinge, ist_handklinge

PROVISION = float(os.environ.get('RICARDO_PROVISION', '0.12'))
MIN_NETTO = float(os.environ.get('RICARDO_MIN_NETTO', '5'))
EXPORT = os.environ.get('EXPORT', '/tmp/kost28.jsonl')
ZIEL = os.path.join(REPO, 'dropship', 'ricardo', 'ricardo_feed.csv')
Q = '''query($ids:[ID!]!){nodes(ids:$ids){... on Product{id handle status title descriptionHtml productType vendor onlineStoreUrl
 images(first:5){nodes{url}} variants(first:50){nodes{id sku barcode price inventoryQuantity selectedOptions{name value}}}}}}'''


def kandidaten():
    prod = {}
    for l in open(EXPORT):
        d = json.loads(l)
        if (d.get('sku') or '').startswith('fortura-'):
            uc = (d.get('inventoryItem') or {}).get('unitCost')
            if uc:
                prod.setdefault(d['__parentId'], []).append((float(d['price']), float(uc['amount'])))
    return [p for p, vs in prod.items() if min(vs)[0] * (1 - PROVISION) - min(vs)[1] >= MIN_NETTO]


def main():
    if not os.path.exists(EXPORT):
        print('RICARDO-FEED: unklar (kein Export ' + EXPORT + ')'); return 1
    ids = kandidaten(); rows = []
    for i in range(0, len(ids), 25):
        for n in gql(Q, {'ids': ids[i:i + 25]})['nodes']:
            if not n or n['status'] != 'ACTIVE' or not n['onlineStoreUrl']:
                continue
            if ist_klinge(n['title']) or ist_handklinge(n['title']):
                continue
            txt = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', n['descriptionHtml'] or ''))).strip()
            bilder = [x['url'] for x in n['images']['nodes']]
            for v in n['variants']['nodes']:
                if (v['inventoryQuantity'] or 0) <= 0 or not (v['sku'] or '').startswith('fortura-'):
                    continue
                opt = [o['value'] for o in v['selectedOptions'] if o['value'] != 'Default Title']
                rows.append({'id': v['sku'], 'item_group_id': n['handle'], 'title': (n['title'] + (' – ' + ' / '.join(opt) if opt else ''))[:150],
                             'description': txt[:4000], 'link': f"https://luxestyle.ch/products/{n['handle']}?variant={v['id'].split('/')[-1]}",
                             'image_link': bilder[0] if bilder else '', 'additional_image_link': ','.join(bilder[1:5]),
                             'price': f"{float(v['price']):.2f} CHF", 'availability': 'in stock', 'quantity': v['inventoryQuantity'],
                             'gtin': v['barcode'] or '', 'brand': n['vendor'] or 'LuxeStyle', 'condition': 'new',
                             'product_type': n['productType'] or '', 'shipping_time': '1-3 Werktage (Lager Schweiz)'})
    if not rows:
        print('⚠️ RICARDO-FEED: 0 Varianten — Feed NICHT überschrieben'); return 1
    os.makedirs(os.path.dirname(ZIEL), exist_ok=True)
    tmp = ZIEL + '.tmp'
    with open(tmp, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()), delimiter='\t'); w.writeheader(); w.writerows(rows)
    os.replace(tmp, ZIEL)
    print(f"RICARDO-FEED: {len({r['item_group_id'] for r in rows})} Produkte / {len(rows)} Varianten (Fortura, ≥ CHF {MIN_NETTO:.0f} nach {PROVISION:.0%})")
    return 0


if __name__ == '__main__':
    sys.exit(main())
