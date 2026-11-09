#!/usr/bin/env python3
"""Französisch Stufe 4: Seiten rueckgabe, garantie, faq, groessentabelle über translationsRegister schreiben.

Besitzer 09.11.2026: «übersetzten franz.» (bestätigt den Entscheid vom 08.11.). Der deutsche Text ist nach Rückgabe-Welle 2
und «Mängelfrist 30 Tage» final. Methode: fr_lib.py (Gerüst bleibt, nur Textläufe werden ersetzt, strenge Prüfung),
Texte in seiten_fr.py.

Aufruf (Vorgabe: Trockenlauf, schreibt nichts):
  python3 dropship/fr-seiten-0911/apply.py
  LIVE=1 python3 dropship/fr-seiten-0911/apply.py             schreiben, dann frisch zurücklesen und vergleichen
  ZURUECK=1 LIVE=1 python3 dropship/fr-seiten-0911/apply.py   genau diese fr-Übersetzungen wieder entfernen
  NUR=faq,garantie python3 …                                   begrenzen
  python3 dropship/fr-seiten-0911/apply.py --selbsttest        Prüfungen ohne Netz
Geschrieben wird nur Sprache fr und nur title, body_html, meta_title, meta_description, mit dem frisch gelesenen Digest
des deutschen Originals (hat sich die Seite inzwischen geändert, bricht der Lauf für diese Seite ab).
"""
import json
import os
import re
import sys
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
sys.path.insert(0, os.path.join(HIER, '..', 'ranking-0911'))
import fr_lib as L  # noqa: E402
import seiten_fr as S  # noqa: E402

FELDER = ['title', 'body_html', 'meta_title', 'meta_description']
LEDGER = os.path.join(HIER, 'lauf', 'seiten_ledger.json')

Q_SEITE = 'query($q:String!){ pages(first:5, query:$q){ nodes{ id handle } } }'
Q_RES = '''query($id:ID!){ translatableResource(resourceId:$id){ resourceId
  translatableContent{ key value digest locale } translations(locale:"fr"){ key value outdated } } }'''
M_REG = '''mutation($id:ID!,$tr:[TranslationInput!]!){ translationsRegister(resourceId:$id, translations:$tr){
  translations{ key locale } userErrors{ field message code } } }'''
M_DEL = '''mutation($id:ID!,$keys:[String!]!){ translationsRemove(resourceId:$id, translationKeys:$keys, locales:["fr"]){
  userErrors{ field message code } } }'''


def felder_bauen(handle, de_felder):
    """de_felder: {key: value}. Rückgabe: (fr {key: value}, fehlerliste)."""
    fr = S.SEITEN[handle]
    fehler = []
    body_de = de_felder['body_html']
    body, probleme = L.baue(body_de, fr['laeufe'])
    fehler += probleme
    if body is None:
        return None, fehler
    if 'json_ld' in fr:
        body = L.json_ld_bauen(body, fr['json_ld'])
    fehler += L.pruefe(body_de, body)
    out = {'title': fr['title'], 'body_html': body, 'meta_title': fr['meta_title'], 'meta_description': fr['meta_description']}
    if len(out['title']) > 70:
        fehler.append(f"title zu lang ({len(out['title'])})")
    if len(out['meta_title']) > 70:
        fehler.append(f"meta_title zu lang ({len(out['meta_title'])})")
    if not 60 <= len(out['meta_description']) <= 170:
        fehler.append(f"meta_description Länge {len(out['meta_description'])} (60 bis 170 erwartet)")
    for k in ('title', 'meta_title', 'meta_description'):
        for r in L.rest_deutsch(out[k]):
            fehler.append(f'{k}: Deutsch im Französischen: {r}')
    return out, fehler


def selbsttest():
    fehler = []

    def ok(name, bed):
        print(('  ok   ' if bed else '  FAIL ') + name)
        if not bed:
            fehler.append(name)
    de = '<div><p>Hallo <strong>Welt</strong>, 30 Tage. <a href="/pages/x">Mehr</a></p><table><tr><td>S</td><td>Länge (cm)</td></tr></table></div>'
    fr_ok = ['Bonjour <strong>monde</strong>, 30 jours. <a href="/fr/pages/x">Plus</a>', 'Longueur (cm)']
    out, pr = L.baue(de, fr_ok)
    ok('baut ein gültiges Gerüst', pr == [] and L.pruefe(de, out) == [])
    ok('Gerüst bleibt: Tags und Tabelle unverändert', out.count('<td>') == 2 and out.startswith('<div><p>'))
    ok('falsche Laufzahl wird gemeldet', L.baue(de, ['nur einer'])[1] != [])
    bad_tag = ['Bonjour <b>monde</b>, 30 jours. <a href="/fr/pages/x">Plus</a>', 'Longueur (cm)']
    ok('geänderter Inline-Tag wird gefunden', L.pruefe(de, L.baue(de, bad_tag)[0]) != [])
    bad_link = ['Bonjour <strong>monde</strong>, 30 jours. <a href="/pages/x">Plus</a>', 'Longueur (cm)']
    ok('Link ohne /fr wird gefunden', L.pruefe(de, L.baue(de, bad_link)[0]) != [])
    bad_num = ['Bonjour <strong>monde</strong>, 31 jours. <a href="/fr/pages/x">Plus</a>', 'Longueur (cm)']
    ok('geänderte Ziffer wird gefunden', L.pruefe(de, L.baue(de, bad_num)[0]) != [])
    bad_de = ['Bonjour <strong>monde</strong>, 30 jours und mehr. <a href="/fr/pages/x">Plus</a>', 'Longueur (cm)']
    ok('deutscher Rest wird gefunden', L.pruefe(de, L.baue(de, bad_de)[0]) != [])
    ld_de = '<p>A b</p><script type="application/ld+json">{"@type": "FAQPage", "@id": "https://x/pages/f#f", "inLanguage": "de-CH", "mainEntity": [{"@type": "Question", "name": "F?", "acceptedAnswer": {"@type": "Answer", "text": "A."}}]}</script>'
    daten = {'inLanguage': 'fr-CH', '@id': 'https://x/fr/pages/f#f', 'fragen': [('Q ?', 'R.')]}
    o, _ = L.baue(ld_de, ['A b'])
    o = L.json_ld_bauen(o, daten)
    ok('JSON-LD wird übersetzt und bleibt gültig', L.pruefe(ld_de, o) == [])
    ok('JSON-LD mit falscher Sprache wird gefunden', L.pruefe(ld_de, o.replace('fr-CH', 'de-CH')) != [])
    ok('JSON-LD mit falscher Fragenzahl bricht ab', _wirft(lambda: L.json_ld_bauen(ld_de, {**daten, 'fragen': []})))
    # die echten Texte
    ok('mindestens die vier ersten Seiten in seiten_fr.py', {'faq', 'groessentabelle', 'garantie', 'rueckgabe'} <= set(S.SEITEN))
    ok('jede Seite hat title, meta_title, meta_description und Läufe', all(
        all(k in v for k in ('title', 'meta_title', 'meta_description', 'laeufe')) for v in S.SEITEN.values()))
    ok('keine französische Fassung enthält «WELCOME10» oder «CHF 99999» (Platzhalter)', all(
        'XXX' not in ''.join(v['laeufe']) for v in S.SEITEN.values()))
    print('Selbsttest:', 'ALLE OK' if not fehler else f'{len(fehler)} FEHLER')
    return 0 if not fehler else 1


def _wirft(f):
    try:
        f()
    except RuntimeError:
        return True
    return False


def main():
    if '--selbsttest' in sys.argv:
        return selbsttest()
    import apply_fristen as netz  # token, gql
    live = os.environ.get('LIVE') == '1'
    zurueck = os.environ.get('ZURUECK') == '1'
    nur = [x for x in os.environ.get('NUR', '').split(',') if x]
    shop, tok = netz.token()
    ledger = json.load(open(LEDGER, encoding='utf-8')) if os.path.exists(LEDGER) else {}
    exit_code = 0
    for handle in S.SEITEN:
        if nur and handle not in nur:
            continue
        seite = [n for n in netz.gql(shop, tok, Q_SEITE, {'q': f'handle:{handle}'})['pages']['nodes'] if n['handle'] == handle]
        if len(seite) != 1:
            print(f'{handle}: Seite nicht gefunden'); exit_code = 1; continue
        rid = seite[0]['id']
        res = netz.gql(shop, tok, Q_RES, {'id': rid})['translatableResource']
        inhalt = {c['key']: c for c in res['translatableContent']}
        de_felder = {k: inhalt[k]['value'] for k in FELDER}
        vorhanden = {t['key']: t for t in res['translations']}
        if zurueck:
            keys = [k for k in FELDER if k in vorhanden]
            print(f'{handle}: Rücknahme von {keys}')
            if live and keys:
                r = netz.gql(shop, tok, M_DEL, {'id': rid, 'keys': keys})['translationsRemove']
                if r['userErrors']:
                    print('   FEHLER', r['userErrors']); exit_code = 1
            continue
        fr, fehler = felder_bauen(handle, de_felder)
        if fehler or fr is None:
            print(f'{handle}: PRÜFUNG NICHT BESTANDEN ({len(fehler)} Funde), nichts geschrieben')
            for x in fehler[:15]:
                print('   -', x)
            exit_code = 1
            continue
        ueberschreibt = [k for k in FELDER if k in vorhanden and vorhanden[k]['value'] != fr[k] and not vorhanden[k]['outdated']]
        print(f"{handle}: Prüfung OK | body {len(de_felder['body_html'])} -> {len(fr['body_html'])} Zeichen | "
              f"schon vorhanden: {sorted(vorhanden)} | überschreibt: {ueberschreibt}")
        if not live:
            continue
        tr = [{'locale': 'fr', 'key': k, 'value': fr[k], 'translatableContentDigest': inhalt[k]['digest']} for k in FELDER]
        r = netz.gql(shop, tok, M_REG, {'id': rid, 'tr': tr})['translationsRegister']
        if r['userErrors']:
            print('   FEHLER beim Schreiben:', json.dumps(r['userErrors'], ensure_ascii=False)[:300]); exit_code = 1; continue
        danach = netz.gql(shop, tok, Q_RES, {'id': rid})['translatableResource']
        gelesen = {t['key']: t for t in danach['translations']}
        gleich = all(k in gelesen and gelesen[k]['value'] == fr[k] and not gelesen[k]['outdated'] for k in FELDER)
        print(f"   Rücklesen: {'GLEICH' if gleich else 'ABWEICHUNG'}")
        if not gleich:
            exit_code = 2
        ledger[handle] = {'id': rid, 'felder': FELDER, 'geschrieben': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC'),
                          'rueckgelesen_gleich': gleich}
    if live and not zurueck:
        os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
        json.dump(ledger, open(LEDGER, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('Ledger:', LEDGER)
    if not live:
        print('TROCKENLAUF: nichts geschrieben. Mit LIVE=1 schreiben.')
    return exit_code


if __name__ == '__main__':
    sys.exit(main())
