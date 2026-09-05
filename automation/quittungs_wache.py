#!/usr/bin/env python3
"""Meldet Schreib-Werkzeuge, deren GraphQL-Helfer bei Misserfolg STILL zurueckkehrt.

WARUM (05.09.2026): Als die Custom-App weg war, antwortete Shopify mit `errors` und
`data:null`. Ein Helfer, der daraufhin `{}` zurueckgibt, macht daraus fuer den Aufrufer
etwas Ununterscheidbares: `((r.get("data") or {}).get("productUpdate") or {}).get("userErrors")`
ist bei Erfolg UND bei totem Zugang falsy — und die naechste Zeile schreibt die Quittung.
Eine falsche Quittung ueberspringt das Produkt fuer immer.

ENG GEFASST MIT ABSICHT: Gemeldet wird nur die Form, die sich zuverlaessig erkennen laesst —
ein Helfer, der mit `return {}` endet. Alle anderen Schutzarten (raise, sys.exit, `return None`
mit Pruefung beim Aufrufer, ausdrueckliches `if d is None`) sind legitim und werden NICHT
gemeldet. Bei einem Melder liegt die Beweislast beim Alarm (Lehre 28.08.): lieber einen Fall
uebersehen als einen erfinden — ein Bericht mit Fehlalarmen wird nach dem zweiten nicht mehr
gelesen. MELDET NUR, aendert nichts.
"""
import os, re, sys

ORDNER = os.path.dirname(os.path.abspath(__file__))
MUTATION = re.compile(r'productUpdate|productVariantsBulkUpdate|tagsAdd|tagsRemove|'
                      r'publishablePublish|publishableUnpublish|productOptionUpdate')
HELFER = re.compile(r'(?ms)^def (?:s?gql|shop_gql|api)\(.*?(?=^\S|\Z)')


def befund(pfad):
    s = open(pfad, encoding='utf-8', errors='replace').read()
    if not MUTATION.search(s):
        return None                      # kein Schreiber
    for m in HELFER.finditer(s):
        blk = m.group(0)
        if re.search(r'(?m)^[ \t]*return \{\}[ \t]*$', blk):
            return 'GraphQL-Helfer endet mit `return {}` — ein Misserfolg ist fuer den Aufrufer nicht erkennbar'
    return None


def main():
    treffer = []
    for name in sorted(os.listdir(ORDNER)):
        if not name.endswith('.py') or name == os.path.basename(__file__):
            continue
        g = befund(os.path.join(ORDNER, name))
        if g:
            treffer.append((name, g))
    if not treffer:
        print('FERTIG: kein Schreib-Werkzeug kehrt bei Misserfolg still zurueck.')
        return 0
    print(f'⚠️ {len(treffer)} Schreib-Werkzeug(e) koennen einen Fehlschlag als Erfolg quittieren:')
    for n, g in treffer:
        print(f'  – {n}: {g}')
    print('  Reparatur: statt `return {}` nach erschoepften Versuchen ein `raise RuntimeError(...)`.')
    return 0


sys.exit(main())
