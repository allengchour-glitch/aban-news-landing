#!/usr/bin/env python3
"""Spielt die zweisprachigen Bausteine in `templates/product.json` des Haupt-Themes ein (Sicherung, Rücklesen, Rücknahme).

  python3 dropship/fr-produkte-0911/vorlage_fr/apply.py                       Trockenlauf (Vorgabe): liest live, baut, prüft, schreibt nichts
  LIVE=1 python3 dropship/fr-produkte-0911/vorlage_fr/apply.py                schreibt; vorher Sicherung in sicherung/product.json.vor
  ZURUECK=1 LIVE=1 python3 dropship/fr-produkte-0911/vorlage_fr/apply.py      stellt die Sicherung wieder her (nur wenn live noch dem Stand dieses Werkzeugs entspricht)
Vor dem Schreiben: jeder deutsche Schlüssel der Tabelle muss im LIVE-Quelltext seines Bausteins stehen, sonst bricht das Werkzeug ab
(ein anderer Beteiligter hat den Baustein inzwischen geändert). Nach dem Schreiben wird frisch gelesen und verglichen.
"""
import hashlib
import json
import os
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
sys.path.insert(0, os.path.join(HIER, '..'))
import bauen as B  # noqa: E402
import phrasen as P  # noqa: E402
import shop as S  # noqa: E402

DATEI = 'templates/product.json'
SICHERUNG = os.path.join(HIER, 'sicherung', 'product.json.vor')
STAND = os.path.join(HIER, 'sicherung', 'product.json.geschrieben.sha256')
Q_THEME = '''query{ themes(first:10, roles:[MAIN]){ nodes{ id name } } }'''
Q_DATEI = '''query($id:ID!,$f:[String!]!){ theme(id:$id){ files(filenames:$f, first:1){ nodes{ filename body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }'''
M_SCHREIBEN = '''mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$id, files:$files){
  upsertedThemeFiles{ filename } userErrors{ field message code } } }'''


def lesen(shop, tok, tid):
    n = S.gql(shop, tok, Q_DATEI, {'id': tid, 'f': [DATEI]})['theme']['files']['nodes']
    if not n:
        raise RuntimeError(DATEI + ' nicht gefunden')
    return n[0]['body']['content']


def schreiben(shop, tok, tid, inhalt):
    r = S.gql(shop, tok, M_SCHREIBEN, {'id': tid, 'files': [{'filename': DATEI, 'body': {'type': 'TEXT', 'value': inhalt}}]})['themeFilesUpsert']
    if r['userErrors']:
        raise RuntimeError(json.dumps(r['userErrors'], ensure_ascii=False)[:400])


def pruefen(text):
    """Schlüssel im Quelltext? Rückgabe: Liste der Probleme."""
    _, daten = B.vorlage_laden(text)
    bl = {n: e['custom_liquid'] for n, e in B.bloecke_finden(daten)}
    dyn = {k for k, _ in P.DATUM} | {'href="/collections/mengenrabatt-ab-2-stueck"', 'href="/collections/mengenrabatt-ab-3-stueck"'}
    probleme = []
    for n, paare in P.BLOECKE.items():
        if n not in bl:
            probleme.append(f'Baustein {n} fehlt in der Vorlage')
            continue
        orig = B.auspacken(n, bl[n])                  # schon eingewickelte Bausteine: gegen den ursprünglichen Quelltext prüfen
        for de, _ in paare:
            if de not in dyn and de not in orig:
                probleme.append(f'{n}: «{de[:50]}» steht nicht im Quelltext')
    return probleme


def main():
    live = os.environ.get('LIVE') == '1'
    zurueck = os.environ.get('ZURUECK') == '1'
    shop, tok = S.token()
    tid = S.gql(shop, tok, Q_THEME)['themes']['nodes'][0]['id']
    jetzt = lesen(shop, tok, tid)
    print('Haupt-Theme', tid, '| Vorlage', len(jetzt), 'Zeichen, md5', hashlib.md5(jetzt.encode()).hexdigest()[:12])
    if zurueck:
        if not os.path.exists(SICHERUNG):
            print('keine Sicherung vorhanden')
            return 2
        gespeichert = open(STAND).read().strip() if os.path.exists(STAND) else ''
        if gespeichert and hashlib.sha256(jetzt.encode()).hexdigest() != gespeichert and not os.environ.get('FREMD_UEBERSCHREIBEN'):
            print('live weicht vom Stand ab, den dieses Werkzeug schrieb: Abbruch (FREMD_UEBERSCHREIBEN=1 übersteuert)')
            return 2
        alt = open(SICHERUNG, encoding='utf-8').read()
        print('Rücknahme:', 'schreibt' if live else 'TROCKENLAUF', len(alt), 'Zeichen')
        if live:
            schreiben(shop, tok, tid, alt)
            time.sleep(3)
            print('Rücklesen gleich Sicherung:', lesen(shop, tok, tid) == alt)
        return 0
    gespeichert = open(STAND).read().strip() if os.path.exists(STAND) else ''
    if gespeichert and hashlib.sha256(jetzt.encode()).hexdigest() != gespeichert and not os.environ.get('FREMD_UEBERSCHREIBEN'):
        print('live weicht von dem Stand ab, den dieses Werkzeug zuletzt schrieb (jemand hat die Vorlage geändert): Abbruch (FREMD_UEBERSCHREIBEN=1 übersteuert)')
        return 2
    probleme = pruefen(jetzt)
    if probleme:
        print('ABBRUCH, Prüfung nicht bestanden:')
        for p in probleme:
            print('  -', p)
        return 2
    neu, bericht = B.umbauen(jetzt, erneuern=True)
    print('Umbau:', bericht)
    print('Größe', len(jetzt), '->', len(neu))
    if not live:
        print('TROCKENLAUF: nichts geschrieben. Mit LIVE=1.')
        return 0
    os.makedirs(os.path.dirname(SICHERUNG), exist_ok=True)
    if not os.path.exists(SICHERUNG):
        open(SICHERUNG, 'w', encoding='utf-8').write(jetzt)
    schreiben(shop, tok, tid, neu)
    ok = False
    for v in range(8):
        time.sleep(4)
        if lesen(shop, tok, tid) == neu:
            ok = True
            break
    open(STAND, 'w').write(hashlib.sha256(neu.encode()).hexdigest())
    print('Rücklesen gleich Soll:', ok)
    return 0 if ok else 3


if __name__ == '__main__':
    sys.exit(main())
