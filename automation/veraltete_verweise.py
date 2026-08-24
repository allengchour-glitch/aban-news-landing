#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Waechter: veraltete Verweise in veroeffentlichten Seiten und Artikeln.

BEFUND (Audit 24.08.2026): Das Impressum und zwei AGB-Fassungen verwiesen auf die
EU-ODR-Plattform — abgeschaltet seit 20.07.2025. tote_links.py prueft nur
/products/-Links, tote_rabattcodes.py nur Codes: fuer VERWEISE (Behoerdenlinks,
alte Domains, abgeloeste Plattformen) gab es keinen Waechter. Genau solche
Verweise stehen bevorzugt in Rechtstexten, die nie wieder jemand liest.

MELDET NUR — ein Rechtstext wird nicht automatisch umgeschrieben. Bericht:
dropship/VERALTETE-VERWEISE.md (wird ohne Befund GELOESCHT, Lehre 21.08.:
ein Rueckstand, der Erledigtes auflistet, wird nicht gelesen).

FERTIG haengt allein daran, dass der Lauf durchkam — nicht an der Zahl der
Meldungen (Lehre fremdzeichen_guard 21.08.).
"""
import json, os, time, urllib.request

SHOP  = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOKEN = os.environ.get('SHOPIFY_ADMIN_TOKEN') or open('/tmp/cj_shop_token.txt').read().strip()
BERICHT = 'dropship/VERALTETE-VERWEISE.md'

# Muster + Begruendung. NUR eindeutige Zeichenketten — kein Regex, keine kurzen Woerter.
MUSTER = [
    ('ec.europa.eu/consumers/odr', 'EU-ODR-Plattform, abgeschaltet seit 20.07.2025'),
    ('luxestyle.com.co',           'aufgegebene Alt-Domain (loest nicht mehr auf)'),
    ('account.luxestyle.com.co',   'aufgegebene Alt-Domain (NXDOMAIN)'),
    ('aban-192.myshopify.com',     'interner Alt-Shopname, gehoert nicht in Kundentexte'),
]

def gql(q, v=None):
    req = urllib.request.Request(
        f'https://{SHOP}/admin/api/2024-10/graphql.json',
        data=json.dumps({'query': q, 'variables': v or {}}).encode(),
        headers={'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'})
    for i in range(8):
        try:
            j = json.load(urllib.request.urlopen(req, timeout=60))
        except Exception:
            if i == 7: raise
            time.sleep(2 ** i); continue
        if 'data' in j and j['data'] is not None: return j
        time.sleep(4)
    raise RuntimeError('gql erschoepft')

def alle(art, feld):
    """Paginiert — first:100 ohne Paginierung war die Luecke, durch die 121 von
    221 Seiten jahrelang ungeprueft blieben (tote_rabattcodes, 24.08.)."""
    cur, raus = None, []
    while True:
        nach = ', after:"%s"' % cur if cur else ''
        d = gql('query{ %s(first:100%s){ nodes{ handle isPublished body } '
                'pageInfo{ hasNextPage endCursor } } }' % (art, nach))
        blk = d['data'][feld]
        raus.extend(blk['nodes'])
        if not blk['pageInfo']['hasNextPage']: return raus
        cur = blk['pageInfo']['endCursor']

def main():
    funde = []
    for art, feld, pfad in (('pages', 'pages', '/pages/'), ('articles', 'articles', '/blogs/…/')):
        for n in alle(art, feld):
            if not n.get('isPublished'): continue
            b = n.get('body') or ''
            for m, grund in MUSTER:
                if m in b:
                    funde.append((pfad + n['handle'], m, grund))
    if not funde:
        if os.path.exists(BERICHT): os.remove(BERICHT)
        print('FERTIG: 0 veraltete Verweise in veroeffentlichten Texten.')
        return
    with open(BERICHT, 'w') as fh:
        fh.write('# Veraltete Verweise in veroeffentlichten Texten\n\n')
        fh.write('Stand: %s · Waechter: automation/veraltete_verweise.py (meldet nur)\n\n' % time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime()))
        for ort, m, grund in funde:
            fh.write('- `%s` enthaelt `%s` — %s\n' % (ort, m, grund))
    for ort, m, grund in funde:
        print('  ⚠️ %s → %s (%s)' % (ort, m, grund))
    print('FERTIG: %d Fundstelle(n), Bericht %s.' % (len(funde), BERICHT))

if __name__ == '__main__':
    main()
