#!/usr/bin/env python3
"""Abdeckung der französischen Übersetzung (nur lesend): wie viele Produkte, Sammlungen, Artikel, Seiten haben Text auf Französisch.

Zählt je Ressourcentyp: gesamt, mit Titel auf Französisch, mit Beschreibung auf Französisch, veraltete Übersetzungen.
Schlank: es wird nur `translations(locale: "fr")` gelesen, nicht der deutsche Inhalt.
Aufruf: abdeckung.py [PRODUCT COLLECTION ARTICLE PAGE …]   Vorgabe: PRODUCT COLLECTION ARTICLE
Optional ABDECKUNG_AUS=<Datei> schreibt die Ressourcen-IDs mit französischem Titel als JSON-Liste.
"""
import json
import os
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import shop as S  # noqa: E402

Q = '''query($t:TranslatableResourceType!,$c:String){ translatableResources(resourceType:$t, first:250, after:$c){
  pageInfo{ hasNextPage endCursor } nodes{ resourceId translations(locale:"fr"){ key outdated } } } }'''
KEY_TITEL = {'PRODUCT': 'title', 'COLLECTION': 'title', 'ARTICLE': 'title', 'PAGE': 'title'}
KEY_TEXT = {'PRODUCT': 'body_html', 'COLLECTION': 'body_html', 'ARTICLE': 'body_html', 'PAGE': 'body_html'}


def zaehlen(shop, tok, typ, ids_aus=None):
    c, n, titel, text, veraltet = None, 0, 0, 0, 0
    mit_titel = []
    t0 = time.time()
    while True:
        d = S.gql(shop, tok, Q, {'t': typ, 'c': c})['translatableResources']
        for r in d['nodes']:
            n += 1
            tr = {t['key']: t for t in r['translations']}
            if KEY_TITEL[typ] in tr and not tr[KEY_TITEL[typ]]['outdated']:
                titel += 1
                mit_titel.append(r['resourceId'])
            if KEY_TEXT[typ] in tr and not tr[KEY_TEXT[typ]]['outdated']:
                text += 1
            if any(t['outdated'] for t in r['translations']):
                veraltet += 1
        if n % 5000 < 250:
            print(f'  {typ}: {n} gelesen, {time.time() - t0:.0f} s', flush=True)
        if not d['pageInfo']['hasNextPage']:
            break
        c = d['pageInfo']['endCursor']
    return n, titel, text, veraltet, mit_titel


def main():
    typen = sys.argv[1:] or ['PRODUCT', 'COLLECTION', 'ARTICLE']
    shop, tok = S.token()
    print('Stand', time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()))
    for typ in typen:
        n, titel, text, veraltet, ids = zaehlen(shop, tok, typ)
        print(f'{typ:11} gesamt {n:6d} | Titel französisch {titel:6d} ({100 * titel / max(n, 1):5.1f} %) | Beschreibung französisch {text:6d} '
              f'({100 * text / max(n, 1):5.1f} %) | mit veralteten Übersetzungen {veraltet}', flush=True)
        if os.environ.get('ABDECKUNG_AUS') and typ == 'PRODUCT':
            json.dump(ids, open(os.environ['ABDECKUNG_AUS'], 'w'))


if __name__ == '__main__':
    main()
