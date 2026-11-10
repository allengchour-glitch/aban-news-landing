#!/usr/bin/env python3
"""Korrektur der Klartextfelder in den Vorschauen (lauf/vorschau/*.json): `&amp;` → `&` in title, product_type, meta_title,
meta_description und in Optionsnamen/-werten (nicht in body_html). Schreibt die betroffenen Produkte als Liste
`lauf/betroffen-klartext.json` (Format wie auswahl-stufe5a.json), die man mit `LIVE=1 NEU=1 IDS=…` neu schreiben lässt.

Hintergrund: ein erster Lauf maskierte `&` auch in Klartextfeldern; im <title> der Produktseite wurde daraus «&amp;amp;» und im Browser-Tab
stand wörtlich «&amp;» (GEMESSEN 09.11. 23:0x UTC an `doppel-ring-duo-s925-silber-mit-zirkonia-topas-blau`).
Idempotent: ein zweiter Lauf findet nichts mehr. Nur lesend und lokal (kein Netz).
"""
import glob
import json
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import fr_produkte as P  # noqa: E402

VORSCHAU = os.path.join(HIER, 'lauf', 'vorschau')
AUSGABE = os.path.join(HIER, 'lauf', 'betroffen-klartext.json')
KLARTEXT_FELDER = ('title', 'product_type', 'meta_title', 'meta_description')


def korrigiere(v):
    """Wendet klartext auf die Klartextfelder an. Rückgabe: True, wenn etwas geändert wurde."""
    geaendert = False
    for k in KLARTEXT_FELDER:
        if isinstance(v['fr'].get(k), str):
            neu = P.klartext(v['fr'][k])
            if neu != v['fr'][k]:
                v['fr'][k] = neu
                geaendert = True
    opt = []
    for name, werte in v['optionen']:
        n2, w2 = P.klartext(name), [P.klartext(w) for w in werte]
        geaendert = geaendert or n2 != name or w2 != list(werte)
        opt.append([n2, w2])
    v['optionen'] = opt
    return geaendert


def main():
    betroffen = []
    gesamt = 0
    for f in sorted(glob.glob(os.path.join(VORSCHAU, '*.json'))):
        v = json.load(open(f, encoding='utf-8'))
        gesamt += 1
        if korrigiere(v):
            json.dump(v, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            betroffen.append({'id': 'gid://shopify/Product/' + os.path.basename(f)[:-5], 'handle': v['handle']})
    # Die Liste wächst nur (ein zweiter Lauf findet nichts mehr und darf sie nicht leeren).
    if os.path.exists(AUSGABE):
        bekannt = {b['id'] for b in betroffen}
        betroffen += [b for b in json.load(open(AUSGABE, encoding='utf-8')) if b['id'] not in bekannt]
    json.dump(betroffen, open(AUSGABE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{gesamt} Vorschauen geprüft, {len(betroffen)} in der Liste → {os.path.relpath(AUSGABE)}')
    for b in betroffen[:60]:
        print('  ', b['handle'])
    return 0


if __name__ == '__main__':
    sys.exit(main())
