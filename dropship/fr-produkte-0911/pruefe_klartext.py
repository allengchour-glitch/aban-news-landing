#!/usr/bin/env python3
"""Liest die geschriebenen französischen Übersetzungen aller Produkte im Ledger frisch aus Shopify (nur lesend) und meldet
Entities (`&amp;`, `&quot;`, `&#39;`, `&lt;`, `&gt;`) in Klartextfeldern: title, product_type, meta_title, meta_description,
Optionsnamen und -werten. body_html wird nicht geprüft (dort sind Entities richtig).
Aufruf: pruefe_klartext.py   → Ausgabe: Zahl geprüfter Felder, Befunde mit Handle und Feld; Exit 1 bei Befund.
"""
import json
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import fr_produkte as P  # noqa: E402
import shop as S  # noqa: E402

RE_ENTITAET = re.compile(r'&(?:amp|quot|lt|gt|apos|#39|#x27);')
KLARTEXT = ('title', 'product_type', 'meta_title', 'meta_description')


def main():
    shop, tok = S.token()
    ledger = P.ledger_laden()
    felder = 0
    befunde = []
    for n, (pid, e) in enumerate(sorted(ledger.items()), 1):
        p, res = P.produkt_lesen(shop, tok, pid)
        tr = {t['key']: t for t in res[pid]['translations']}
        for k in KLARTEXT:
            if k in tr:
                felder += 1
                if RE_ENTITAET.search(tr[k]['value']):
                    befunde.append((p['handle'], k, tr[k]['value'][:80]))
        for o in p['options']:
            for rid in [o['id']] + [v['id'] for v in o['optionValues']]:
                t = {x['key']: x for x in res.get(rid, {}).get('translations', [])}
                if 'name' in t:
                    felder += 1
                    if RE_ENTITAET.search(t['name']['value']):
                        befunde.append((p['handle'], 'Option', t['name']['value'][:80]))
    print(f'{len(ledger)} Produkte, {felder} Klartextfelder gelesen, {len(befunde)} Befunde')
    for b in befunde[:40]:
        print('  ', b)
    return 1 if befunde else 0


if __name__ == '__main__':
    sys.exit(main())
