#!/usr/bin/env python3
"""Sammlung «Trinkbrunnen für Katzen & Hunde»: dünnen Text (zwei Sätze) durch eine belegte Kaufhilfe ersetzen.

Warum: Search Console (28 Tage bis 06.11.2026): drei Seiten dieses Themas zeigen zusammen rund 900 Einblendungen
(deutsche Sammlung 329 auf Position 49, französische Sammlung 280 auf Position 24, ein Produkt 290 auf Position 27)
bei 0 Klicks. Die deutsche Sammlung trägt nur zwei allgemeine Sätze.

Belege der Aussagen (Produkttexte der 24 aktiven Produkte der Sammlung, gelesen 09.11.2026):
  Keramik 4, Kunststoff 9, Filter 10, USB 2, Akku 3, Batterie 4, «ohne Strom» 2,
  Fassungsvermögen 500 ml (Keramik Elefant), 528 ml, bis 4 Liter.
Keine Preise, keine Lieferzeiten, keine Gesundheitsaussagen im Text (Preise und Lieferzeit ändern sich).

Aufruf (Vorgabe: Trockenlauf, schreibt nichts):
  python3 dropship/ranking-0911/apply_trinkbrunnen.py
  LIVE=1 python3 dropship/ranking-0911/apply_trinkbrunnen.py            schreiben (mit Sicherung und Rücklesen)
  ZURUECK=1 LIVE=1 python3 dropship/ranking-0911/apply_trinkbrunnen.py  Sicherung zurückschreiben
"""
import json
import os
import re
import sys
import urllib.request

HANDLE = 'trinkbrunnen-katzen'
HIER = os.path.dirname(os.path.abspath(__file__))
SICHERUNG = os.path.join(HIER, 'sicherung_trinkbrunnen.json')

NEU_HTML = (
    '<p>Katzentrinkbrunnen und Trinkbrunnen für Hunde in vielen Bauarten: Keramik- und Kunststoffmodelle, '
    'mit oder ohne Filter, mit USB, Akku oder Batterie, einzelne sogar ganz ohne Strom. '
    'Das Fassungsvermögen reicht je nach Modell von etwa 0,5 bis 4 Liter.</p>'
    '<p><strong>So wählst du:</strong> Prüfe zuerst, wie viel Wasser der Brunnen fasst und wie oft du nachfüllen willst. '
    'Achte auf die Stromversorgung (USB, Akku, Batterie oder ohne Strom), darauf, ob ein Filter dabei ist und wie er '
    'gewechselt wird, und ob sich alle Teile zum Reinigen zerlegen lassen. '
    'Die genauen Angaben und Ausführungen findest du beim jeweiligen Artikel.</p>'
)
NEU_SEO_TITEL = 'Trinkbrunnen für Katzen & Hunde kaufen | LuxeStyle'
NEU_SEO_BESCHR = ('Katzentrinkbrunnen und Hunde-Trinkbrunnen: Keramik oder Kunststoff, mit Filter, USB, Akku oder '
                  'ohne Strom, von etwa 0,5 bis 4 Liter. Versand in die Schweiz.')

assert len(NEU_SEO_TITEL) <= 60, len(NEU_SEO_TITEL)
assert len(NEU_SEO_BESCHR) <= 160, len(NEU_SEO_BESCHR)
# keine Preise, keine Daten, keine Gesundheitsversprechen im Text
for muster in (r'CHF', r'\d{1,2}\.\s?(Nov|Dez)', r'gesund', r'Werktage', r'bis Weihnachten'):
    assert not re.search(muster, NEU_HTML + NEU_SEO_BESCHR), muster


def token():
    shop, cid, sec = os.environ['SHOPIFY_SHOP'], os.environ['SHOPIFY_CLIENT_ID'], os.environ['SHOPIFY_CLIENT_SECRET']
    m = re.match(r'^shpss_[0-9a-f]{32}', sec.strip())
    sec = m.group(0) if m else sec.strip()
    req = urllib.request.Request(f'https://{shop}/admin/oauth/access_token', method='POST',
                                 data=json.dumps({'client_id': cid, 'client_secret': sec,
                                                  'grant_type': 'client_credentials'}).encode(),
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return shop, json.loads(r.read())['access_token']


def gql(shop, tok, query, variables=None):
    req = urllib.request.Request(f'https://{shop}/admin/api/2025-01/graphql.json', method='POST',
                                 data=json.dumps({'query': query, 'variables': variables or {}}).encode(),
                                 headers={'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok})
    with urllib.request.urlopen(req, timeout=60) as r:
        j = json.loads(r.read())
    if j.get('errors'):
        raise RuntimeError(json.dumps(j['errors'])[:400])
    return j['data']


LESEN = '''query($h:String!){ collectionByHandle(handle:$h){ id title handle descriptionHtml seo{ title description } } }'''
SCHREIBEN = '''mutation($i:CollectionInput!){ collectionUpdate(input:$i){ collection{ id descriptionHtml seo{ title description } }
  userErrors{ field message } } }'''


def lesen(shop, tok):
    c = gql(shop, tok, LESEN, {'h': HANDLE})['collectionByHandle']
    if not c:
        raise RuntimeError('Sammlung nicht gefunden: ' + HANDLE)
    return c


def schreiben(shop, tok, cid, html, titel, beschr):
    d = gql(shop, tok, SCHREIBEN, {'i': {'id': cid, 'descriptionHtml': html, 'seo': {'title': titel, 'description': beschr}}})
    ue = d['collectionUpdate']['userErrors']
    if ue:
        raise RuntimeError('userErrors: ' + json.dumps(ue)[:400])


def main():
    live = os.environ.get('LIVE') == '1'
    zurueck = os.environ.get('ZURUECK') == '1'
    shop, tok = token()
    jetzt = lesen(shop, tok)
    print('Sammlung:', jetzt['title'], jetzt['id'])
    if zurueck:
        alt = json.load(open(SICHERUNG, encoding='utf-8'))
        ziel = (alt['descriptionHtml'], alt['seo']['title'] or '', alt['seo']['description'] or '')
        print('RÜCKNAHME auf Sicherung vom', alt['gesichert'])
    else:
        ziel = (NEU_HTML, NEU_SEO_TITEL, NEU_SEO_BESCHR)
    print('--- jetzt:   ', re.sub(r'\s+', ' ', jetzt['descriptionHtml'])[:160], '|', jetzt['seo'])
    print('--- Ziel:    ', ziel[0][:160], '|', ziel[1], '|', ziel[2])
    print('Wörter im Text (Ziel):', len(re.sub(r'<[^>]+>', ' ', ziel[0]).split()))
    if jetzt['descriptionHtml'] == ziel[0] and (jetzt['seo']['title'] or '') == ziel[1] and (jetzt['seo']['description'] or '') == ziel[2]:
        print('Nichts zu tun: Ist gleich Ziel.')
        return 0
    if not live:
        print('TROCKENLAUF: nichts geschrieben. Mit LIVE=1 schreiben.')
        return 0
    if not zurueck:
        if not os.path.exists(SICHERUNG):
            from datetime import datetime, timezone
            jetzt['gesichert'] = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
            json.dump(jetzt, open(SICHERUNG, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            print('Sicherung geschrieben:', SICHERUNG)
        else:
            print('Sicherung liegt schon (bleibt unverändert):', SICHERUNG)
    schreiben(shop, tok, jetzt['id'], *ziel)
    danach = lesen(shop, tok)
    ok = (danach['descriptionHtml'] == ziel[0] and (danach['seo']['title'] or '') == ziel[1]
          and (danach['seo']['description'] or '') == ziel[2])
    print('Rücklesen:', 'GLEICH Ziel' if ok else 'ABWEICHUNG')
    return 0 if ok else 2


if __name__ == '__main__':
    sys.exit(main())
