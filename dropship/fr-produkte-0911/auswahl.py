#!/usr/bin/env python3
"""Auswahl Stufe 5a: die Produkte, die Besucher am ehesten sehen (nur lesend).

Reihenfolge: Wegweiser-Sammlung (Bio-Links Instagram, TikTok, YouTube), die vier Startseiten-Pools, verkaufte Produkte
seit 05.10.2026, Rizinusöl-Produkte (einzige Seite mit Kaufsuche in Google), Bestseller bis CHF 50. Nur aktive Produkte.
Schreibt auswahl-stufe5a.json (id, handle, title, quelle).
"""
import json
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import shop as S  # noqa: E402

Q_SAMMLUNG = '''query($h:String!){ collectionByHandle(handle:$h){ title products(first:100){ nodes{ id handle title status } } } }'''
Q_BESTELLUNGEN = '''query($c:String){ orders(first:50, after:$c, query:"created_at:>=2026-10-05"){ pageInfo{ hasNextPage endCursor }
  nodes{ lineItems(first:50){ nodes{ product{ id handle title status } } } } } }'''
Q_SUCHE = '''query($q:String!){ products(first:20, query:$q){ nodes{ id handle title status } } }'''

QUELLEN = [('aus-tiktok-und-instagram', 'Wegweiser'), ('startseite-pool-trends', 'Pool Trends'), ('startseite-pool-schmuck', 'Pool Schmuck'),
           ('startseite-pool-wohnen', 'Pool Wohnen'), ('startseite-pool-mehr', 'Pool Mehr')]


def main():
    shop, tok = S.token()
    out, gesehen = [], set()

    def add(p, quelle):
        if p and p['status'] == 'ACTIVE' and p['id'] not in gesehen:
            gesehen.add(p['id'])
            out.append({'id': p['id'], 'handle': p['handle'], 'title': p['title'], 'quelle': quelle})

    for h, q in QUELLEN:
        c = S.gql(shop, tok, Q_SAMMLUNG, {'h': h})['collectionByHandle']
        if not c:
            print('Sammlung fehlt:', h)
            continue
        for p in c['products']['nodes']:
            add(p, q)
    cur = None
    while True:
        d = S.gql(shop, tok, Q_BESTELLUNGEN, {'c': cur})['orders']
        for o in d['nodes']:
            for li in o['lineItems']['nodes']:
                add(li['product'], 'verkauft')
        if not d['pageInfo']['hasNextPage']:
            break
        cur = d['pageInfo']['endCursor']
    for p in S.gql(shop, tok, Q_SUCHE, {'q': 'title:*Rizinus* status:active'})['products']['nodes']:
        add(p, 'Rizinusöl')
    c = S.gql(shop, tok, Q_SAMMLUNG, {'h': 'bestseller-unter-50'})['collectionByHandle']
    if c:
        for p in c['products']['nodes'][:40]:
            add(p, 'Bestseller')
    json.dump(out, open(os.path.join(HIER, 'auswahl-stufe5a.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    zaehl = {}
    for e in out:
        zaehl[e['quelle']] = zaehl.get(e['quelle'], 0) + 1
    print(len(out), 'Produkte:', zaehl)


if __name__ == '__main__':
    main()
