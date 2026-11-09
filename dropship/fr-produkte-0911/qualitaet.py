#!/usr/bin/env python3
"""Qualitätsprüfung französischer Übersetzungen (nur lesend), zum Beispiel nach dem Lauf von Shopifys Übersetzer.

Liest Produkte (oder Sammlungen, Artikel) mit französischem `body_html` und prüft gegen den deutschen Text:
  * Gerüst: gleiche Folge der HTML-Tags (Stile, Skripte, Markierungen, Tabellen unverändert),
  * Ziffern: gleiche Zahlen (Masse, Preise, Fristen),
  * deutscher Rest im französischen Text (Wortliste),
  * leere oder zu kurze Übersetzung.
Aufruf: qualitaet.py [PRODUCT|COLLECTION|ARTICLE] [Anzahl Seiten zu je 50, Vorgabe 4]
Ausgabe: Zahlen je Befundart und bis zu 10 Beispiele mit Handle.
"""
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
sys.path.insert(0, os.path.join(HIER, '..', 'fr-seiten-0911'))
import fr_lib as L  # noqa: E402
import shop as S  # noqa: E402

Q = '''query($t:TranslatableResourceType!,$c:String){ translatableResources(resourceType:$t, first:50, after:$c){
  pageInfo{ hasNextPage endCursor } nodes{ resourceId translatableContent{ key value } translations(locale:"fr"){ key value outdated } } } }'''
RE_TAG = re.compile(r'<[^>]+>')


def tags(s):
    return [re.sub(r'href="/fr/', 'href="/', re.sub(r'\s+', ' ', t)) for t in RE_TAG.findall(s or '')]


def pruefen(de, fr):
    f = []
    if tags(de) != tags(fr):
        f.append('Gerüst weicht ab')
    zd = sorted(re.findall(r'\d+', RE_TAG.sub(' ', de)))
    zf = sorted(re.findall(r'\d+', RE_TAG.sub(' ', fr)))
    if zd != zf:
        f.append('Ziffern weichen ab')
    if L.rest_deutsch(RE_TAG.sub(' ', fr)):
        f.append('deutscher Rest')
    if len(RE_TAG.sub('', fr).strip()) < 0.3 * len(RE_TAG.sub('', de).strip()):
        f.append('zu kurz')
    return f


def main():
    typ = sys.argv[1] if len(sys.argv) > 1 else 'PRODUCT'
    seiten = int(sys.argv[2]) if len(sys.argv) > 2 else 4
    shop, tok = S.token()
    c, geprueft, zaehl, beispiele = None, 0, {}, {}
    for _ in range(seiten * 20):
        d = S.gql(shop, tok, Q, {'t': typ, 'c': c})['translatableResources']
        for r in d['nodes']:
            inh = {x['key']: x['value'] for x in r['translatableContent']}
            tr = {t['key']: t for t in r['translations']}
            if 'body_html' not in tr or tr['body_html']['outdated'] or not inh.get('body_html'):
                continue
            geprueft += 1
            fehler = pruefen(inh['body_html'], tr['body_html']['value'])
            for x in fehler or ['in Ordnung']:
                zaehl[x] = zaehl.get(x, 0) + 1
                if x != 'in Ordnung':
                    beispiele.setdefault(x, []).append(inh.get('handle', r['resourceId']))
        if geprueft >= seiten * 50 or not d['pageInfo']['hasNextPage']:
            break
        c = d['pageInfo']['endCursor']
    print(f'{typ}: {geprueft} geprüft (französische Beschreibung, nicht veraltet)')
    for k, v in sorted(zaehl.items(), key=lambda kv: -kv[1]):
        print(f'  {k:22} {v:5d} ({100 * v / max(geprueft, 1):.1f} %)')
    for k, v in beispiele.items():
        print(f'  Beispiele «{k}»:', ', '.join(v[:10]))


if __name__ == '__main__':
    main()
