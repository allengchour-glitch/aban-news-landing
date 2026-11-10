#!/usr/bin/env python3
"""Merchant-Center-Bericht «Update product descriptions to include details customers are looking for» gegen Shopify
klassifizieren: Was bekommt Google als Beschreibung eines Artikels?

Eingabe: die CSV aus dem Merchant Center (Spalten Product, Product ID, Language, Feed label, Description, Key details,
Add to description; die ersten zwei Zeilen sind Name und Filter). Product ID hat die Form `shopify_ZZ_<Produkt>_<Variante>`.

Klassen (je Produkt, die Beschreibung der ersten Zeile des Produkts):
  echt       Google trägt die echte Produktbeschreibung (Anfang gleich dem Text in Shopify)
  seo_heute  Google trägt die SEO-Werbezeile, gleich der heutigen `seo.description`
  seo_alt    Google trägt eine SEO-Werbezeile älteren Wortlauts (Muster «bei LuxeStyle … Gratis-Versand ab CHF 50»)
  anderes    keines davon

Nur lesend (Shopify Admin API 2025-01, Umgebungsvariablen SHOPIFY_SHOP / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET).

Aufruf:
  python3 dropship/merchant-beschreibung-0911/klassifizieren.py <Bericht.csv>
  python3 dropship/merchant-beschreibung-0911/klassifizieren.py --selbsttest
"""
import collections
import csv
import html
import io
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HIER, '..', 'ranking-0911'))


def norm(s):
    return re.sub(r'\s+', ' ', s or '').strip()


def klartext(html_text):
    """Erst Tags entfernen, dann Entitäten auflösen (umgekehrt würde «a &lt; b» als Tag weggeschnitten)."""
    return norm(html.unescape(re.sub(r'<[^>]+>', ' ', html_text or '')))


def ist_werbezeile(text):
    """Die Werbezeile unseres Shops: Marke plus Versandversprechen."""
    return 'bei LuxeStyle' in text and 'Gratis-Versand ab CHF 50' in text


def klassifiziere(csv_beschreibung, seo_beschreibung, koerper_klartext):
    c, seo, body = norm(csv_beschreibung), norm(seo_beschreibung), norm(koerper_klartext)
    if body and c[:50] == body[:50]:
        return 'echt'
    if ist_werbezeile(c):
        if seo and (c == seo or c.rstrip('.…') == seo.rstrip('.…') or c[:40] == seo[:40]):
            return 'seo_heute'
        return 'seo_alt'
    return 'anderes'


def produkt_id(s):
    m = re.search(r'_(\d{10,})_', s) or re.search(r'(\d{10,})', s)
    return m.group(1) if m else None


def lese_bericht(pfad):
    zeilen = open(pfad, encoding='utf-8-sig').read().splitlines()
    kopf = zeilen[:2]
    rows = list(csv.DictReader(io.StringIO('\n'.join(zeilen[2:]))))
    return kopf, rows


def selbsttest():
    fehler = []

    def ok(name, bed):
        print(('  ok   ' if bed else '  FAIL ') + name)
        if not bed:
            fehler.append(name)
    seo = 'Pullover bei LuxeStyle – Schweizer Online-Shop. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. Jetzt –10% mit Code WELCOME10.'
    body = 'Dieser elegante Pullover für Damen ist ein vielseitiges Basic für die Herbst- und Wintersaison.'
    ok('echte Beschreibung erkannt', klassifiziere(body, seo, body) == 'echt')
    ok('SEO-Werbezeile gleich heute', klassifiziere(seo, seo, body) == 'seo_heute')
    ok('SEO-Werbezeile abgeschnitten mit «…»', klassifiziere(seo[:80] + '...', seo, body) in ('seo_heute', 'seo_alt'))
    ok('SEO-Werbezeile älteren Wortlauts',
       klassifiziere('Pullover – bei LuxeStyle Schweiz. Gratis-Versand ab CHF 50, 30 Tage Rückgabe.', seo, body) == 'seo_alt')
    ok('anderes', klassifiziere('Ein ganz anderer Text.', seo, body) == 'anderes')
    ok('Vorrang der echten Beschreibung, wenn SEO-Text leer', klassifiziere(body, '', body) == 'echt')
    ok('Produkt-ID aus Merchant-Format', produkt_id('shopify_ZZ_15449059426689_55878972342657') == '15449059426689')
    ok('Produkt-ID ohne Länderteil', produkt_id('15449059426689_cj-cjmy1sh') == '15449059426689')
    ok('Klartext entfernt Tags und Entitäten', klartext('<p>a &lt; b</p>') == 'a < b')
    print('Selbsttest:', 'ALLE OK' if not fehler else f'{len(fehler)} FEHLER')
    return 0 if not fehler else 1


def main():
    if '--selbsttest' in sys.argv:
        return selbsttest()
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    import apply_fristen as netz  # token, gql
    kopf, rows = lese_bericht(sys.argv[1])
    print(kopf[0], '|', kopf[1])
    erste = collections.OrderedDict()
    for r in rows:
        p = produkt_id(r['Product ID'])
        if p:
            erste.setdefault(p, r)
    print(f'Zeilen: {len(rows)} | Produkte: {len(erste)}')
    print('Google sagt «Hinzufügen»:', collections.Counter(r['Add to description'] for r in rows).most_common(5))
    shop, tok = netz.token()
    q = 'query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id status descriptionHtml seo{ description } } } }'
    ids = list(erste)
    shopify = {}
    for i in range(0, len(ids), 100):
        for n in netz.gql(shop, tok, q, {'ids': [f'gid://shopify/Product/{x}' for x in ids[i:i + 100]]})['nodes']:
            if n:
                shopify[n['id'].split('/')[-1]] = n
    zaehler = collections.Counter()
    for p, r in erste.items():
        n = shopify.get(p)
        if not n:
            zaehler[('Produkt gibt es nicht mehr', '-')] += 1
            continue
        k = klassifiziere(r['Description'], n['seo']['description'], klartext(n['descriptionHtml']))
        zaehler[(k, n['status'])] += 1
    gesamt = sum(zaehler.values())
    for (k, s), v in sorted(zaehler.items(), key=lambda x: -x[1]):
        print(f'{v:5d} ({v / gesamt:5.1%})  {k:10s} Status {s}')
    laengen = sorted(len(r['Description']) for r in rows)
    print('Länge der Beschreibung bei Google: kleinste / mittlere / grösste =', laengen[0], laengen[len(laengen) // 2], laengen[-1])
    return 0


if __name__ == '__main__':
    sys.exit(main())
