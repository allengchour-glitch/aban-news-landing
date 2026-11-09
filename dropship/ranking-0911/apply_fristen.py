#!/usr/bin/env python3
"""Weihnachts-Seiten: Bestellschluss-Daten aus dem Text nehmen (ohne neues Versprechen) und die Weihnachts-Seiten verlinken.

Warum (GEMESSEN 09.11.2026): sieben Sammlungen, ein Ratgeber-Artikel und eine Seite nennen ein Bestell-Datum
(«bis Mitte November», «bis Anfang November», «bis Ende November»). Zwei Gründe, sie zu ändern:
  1. Die Sätze werden mit dem Datum falsch: «Anfang November» ist heute schon vorbei (Sammlung «adventskalender»),
     «Mitte November» ist ab 15.11. vorbei. Dann liest eine Kundin «zu spät» und geht.
  2. Der Besitzer hat am 28.10. entschieden, in Beiträgen keinen Bestellschluss für Weihnachten zu nennen
     (kein Lieferversprechen); die Lieferzeiten sind Richtwerte (steht so auch auf der Pyjama-Sammlung).
Die neuen Sätze nennen KEIN Datum und KEIN Versprechen; die Lieferangabe beim Artikel bleibt die Quelle.
Zusätzlich bekommt der Ratgeber «Weihnachtsgeschenke 2026» (Position 6,6 bei Google) im Block «Passend dazu bei
LuxeStyle» drei Links auf die Weihnachts-Sammlungen (Familien-Pyjama 327 Einblendungen auf Position 24,3,
Pullover 77 auf 38,3, Adventskalender). Das sind nur Verlinkungen, keine Aussage über Ware.

Aufruf (Vorgabe: Trockenlauf, schreibt nichts):
  python3 dropship/ranking-0911/apply_fristen.py
  LIVE=1 python3 dropship/ranking-0911/apply_fristen.py            schreiben (mit Sicherung und Rücklesen)
  ZURUECK=1 LIVE=1 python3 dropship/ranking-0911/apply_fristen.py  Sicherung zurückschreiben (nur, wenn der Text
                                                                   noch dem Stand dieses Werkzeugs entspricht)
  python3 dropship/ranking-0911/apply_fristen.py --selbsttest      Prüfungen ohne Netz
"""
import json
import os
import re
import sys
import urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
SICHERUNG = os.path.join(HIER, 'sicherung_fristen.json')

# (Art, Handle, [(alt, neu, erwartete Anzahl)])
ZIELE = [
    ('collection', 'weihnachten-2026', [
        ('Wer alles bis Weihnachten zu Hause haben will, bestellt am besten bis Mitte November.',
         'Wer alles bis Weihnachten zu Hause haben will, bestellt am besten früh und prüft die Lieferangabe beim Artikel.', 1),
    ]),
    ('collection', 'kleine-geschenke-mitbringsel', [
        ('Fürs Wichteln Anfang Dezember am besten bis Mitte November bestellen.',
         'Fürs Wichteln rechnest du die Lieferzeit am besten vom Termin aus zurück.', 1),
    ]),
    ('collection', 'adventskalender', [
        ('Damit der Kalender am 1. Dezember bereitsteht, bestellst du am besten bis Anfang November. '
         'Die genaue Lieferzeit steht auf jeder Produktseite.',
         'Rechne die Lieferzeit vom 1. Dezember aus zurück, damit der Kalender rechtzeitig bereitsteht. '
         'Die genaue Lieferzeit steht auf jeder Produktseite.', 1),
    ]),
    ('collection', 'weihnachtspyjama-familie', [
        ('Für Weihnachten empfehlen wir eine frühzeitige Bestellung, möglichst bis Mitte November.',
         'Für Weihnachten empfehlen wir eine frühzeitige Bestellung.', 1),
    ]),
    ('collection', 'weihnachtspullover', [
        ('Für Weihnachten am besten bis Mitte November bestellen.',
         'Für Weihnachten am besten früh bestellen.', 1),
    ]),
    ('collection', '🎁-geschenke-bis-chf-30', [
        ('Für Weihnachten am besten bis Mitte November bestellen – die meisten Artikel kommen per Direktversand in 10–20 Werktagen.',
         'Für Weihnachten am besten früh bestellen – die meisten Artikel kommen per Direktversand in 10–20 Werktagen.', 1),
    ]),
    ('collection', 'damenmode-favoriten', [
        ('Für Dezember-Feste bis Mitte November bestellen.',
         'Für Dezember-Feste am besten früh bestellen.', 1),
    ]),
    ('article', 'weihnachtsgeschenke-2026-schweiz-ideen', [
        # Einleitung
        ('Wer also bis Mitte Dezember alles unter dem Baum haben möchte, plant bei Direktversand-Artikeln '
         'idealerweise bis spätestens Mitte November ein.',
         'Wer also bis Mitte Dezember alles unter dem Baum haben möchte, rechnet bei Direktversand-Artikeln '
         'die Lieferzeit vom Wunschtermin aus zurück.', 1),
        # erste FAQ (nur sichtbarer Text)
        ('empfehlen wir, Geschenke bis spätestens Mitte November zu bestellen. Wer früher dran ist, hat mehr Puffer und vermeidet Stress.',
         'empfehlen wir, Geschenke früh zu bestellen und die Lieferangabe beim Artikel zu beachten. '
         'Wer früher dran ist, hat mehr Puffer und vermeidet Stress.', 1),
        # zweite FAQ: sichtbarer Text UND strukturierte Daten (zwei Fundstellen, gleicher Wortlaut)
        ('ist es ideal, bis spätestens Mitte November zu planen. So hast du genügend Puffer und vermeidest Verzögerungen.',
         'ist es ideal, früh zu bestellen und die Lieferangabe beim Artikel zu beachten. '
         'So hast du genügend Puffer und vermeidest Verzögerungen.', 2),
        # Schlussabsatz: keine Zusage der rechtzeitigen Lieferung
        ('kombiniere für unterschiedliche Empfänger und sichere dich mit einer frühen Bestellung die rechtzeitige Lieferung.',
         'kombiniere für unterschiedliche Empfänger und bestelle früh, damit du genug Puffer hast.', 1),
        # Verlinkung der Weihnachts-Sammlungen im Block «Passend dazu bei LuxeStyle»
        ('<li><a href="/collections/bestseller-premium-heroes">Bestseller</a></li>\n</ul>',
         '<li><a href="/collections/bestseller-premium-heroes">Bestseller</a></li>\n'
         '<li><a href="/collections/weihnachtspyjama-familie">Weihnachtspyjamas für die ganze Familie</a></li>\n'
         '<li><a href="/collections/weihnachtspullover">Weihnachtspullover</a></li>\n'
         '<li><a href="/collections/adventskalender">Adventskalender</a></li>\n</ul>', 1),
    ]),
    ('page', 'weihnachtsgeschenke-last-minute', [
        ('Damit das Geschenk sicher rechtzeitig da ist, bestell am besten bis Ende November: '
         'der Direktversand ab Lieferantenlager braucht 10–20 Werktage.',
         'Damit das Geschenk rechtzeitig da ist, bestell so früh wie möglich: '
         'der Direktversand ab Lieferantenlager braucht 10–20 Werktage, die genaue Lieferangabe steht beim Artikel.', 1),
    ]),
]

# Was die NEUEN Sätze nie enthalten dürfen (Datum als Bestellschluss, Zusagen)
VERBOTEN = [r'Mitte November', r'Anfang November', r'Ende November', r'bis spätestens', r'garantiert',
            r'sicher rechtzeitig', r'rechtzeitige Lieferung', r'\b\d{1,2}\.\s?(Nov|Dez)\w*\s+bestell']
FELD = {'collection': 'descriptionHtml', 'article': 'body', 'page': 'body'}


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
        raise RuntimeError(json.dumps(j['errors'])[:500])
    return j['data']


LESEN = {
    'collection': 'query($h:String!){ collectionByHandle(handle:$h){ id title handle descriptionHtml } }',
    'article': 'query($q:String!){ articles(first:10, query:$q){ nodes{ id handle title body blog{ handle } } } }',
    'page': 'query($q:String!){ pages(first:10, query:$q){ nodes{ id handle title body isPublished } } }',
}
SCHREIBEN = {
    'collection': 'mutation($i:CollectionInput!){ collectionUpdate(input:$i){ collection{ id } userErrors{ field message } } }',
    'article': 'mutation($id:ID!,$a:ArticleUpdateInput!){ articleUpdate(id:$id, article:$a){ article{ id } userErrors{ field message code } } }',
    'page': 'mutation($id:ID!,$p:PageUpdateInput!){ pageUpdate(id:$id, page:$p){ page{ id } userErrors{ field message code } } }',
}


def lesen(shop, tok, art, handle):
    if art == 'collection':
        c = gql(shop, tok, LESEN[art], {'h': handle})['collectionByHandle']
        if not c:
            raise RuntimeError(f'Sammlung nicht gefunden: {handle}')
        return {'id': c['id'], 'titel': c['title'], 'html': c['descriptionHtml'] or ''}
    q = f'handle:{handle}'
    daten = gql(shop, tok, LESEN[art], {'q': q})
    knoten = daten['articles' if art == 'article' else 'pages']['nodes']
    treffer = [n for n in knoten if n['handle'] == handle]
    if len(treffer) != 1:
        raise RuntimeError(f'{art} {handle}: {len(treffer)} Treffer statt 1')
    n = treffer[0]
    return {'id': n['id'], 'titel': n['title'], 'html': n['body'] or '',
            'veroeffentlicht': n.get('isPublished')}


def schreiben(shop, tok, art, objekt_id, html):
    if art == 'collection':
        d = gql(shop, tok, SCHREIBEN[art], {'i': {'id': objekt_id, 'descriptionHtml': html}})['collectionUpdate']
    elif art == 'article':
        d = gql(shop, tok, SCHREIBEN[art], {'id': objekt_id, 'a': {'body': html}})['articleUpdate']
    else:
        d = gql(shop, tok, SCHREIBEN[art], {'id': objekt_id, 'p': {'body': html}})['pageUpdate']
    if d['userErrors']:
        raise RuntimeError('userErrors: ' + json.dumps(d['userErrors'], ensure_ascii=False)[:500])


# ---------------------------------------------------------------- reine Logik (ohne Netz)

def ersetzen(html, regeln):
    """Wendet die Regeln an. Rückgabe (neues_html, status).
    status: 'AENDERN' (alle Regeln anwendbar), 'BEREITS' (alle schon angewandt), sonst wird ein Fehler geworfen."""
    neu = html
    angewandt = 0
    bereits = 0
    for alt, ersatz, erwartet in regeln:
        n_alt = neu.count(alt)
        n_neu = neu.count(ersatz)
        if n_alt == erwartet:
            neu = neu.replace(alt, ersatz)
            angewandt += 1
        elif n_alt == 0 and n_neu >= erwartet:
            bereits += 1
        else:
            raise RuntimeError(f'Regel passt nicht (alt {n_alt}x, erwartet {erwartet}x, neu schon {n_neu}x): {alt[:70]}…')
    if angewandt and bereits:
        raise RuntimeError('Gemischter Stand: ein Teil der Regeln ist schon angewandt, ein Teil nicht – von Hand ansehen')
    return neu, ('AENDERN' if angewandt else 'BEREITS')


def pruefe_regeln():
    for art, handle, regeln in ZIELE:
        assert art in FELD, art
        for alt, ersatz, erwartet in regeln:
            assert alt != ersatz, (handle, alt[:50])
            assert erwartet in (1, 2), (handle, erwartet)
            for muster in VERBOTEN:
                assert not re.search(muster, ersatz), (handle, muster, ersatz[:80])


def json_ld_gueltig(html):
    """Alle ld+json-Blöcke müssen sich als JSON lesen lassen. Rückgabe: Anzahl Blöcke."""
    n = 0
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        json.loads(m.group(1))
        n += 1
    return n


def zeige(html_alt, html_neu):
    """Kurze Anzeige der geänderten Stellen."""
    zeilen = []
    a, b = html_alt.split('\n'), html_neu.split('\n')
    for x, y in zip(a, b):
        if x != y:
            zeilen.append('   - ' + re.sub(r'<[^>]+>', '', x)[:150])
            zeilen.append('   + ' + re.sub(r'<[^>]+>', '', y)[:150])
    if len(a) != len(b):
        zeilen.append(f'   (Zeilenzahl {len(a)} -> {len(b)})')
    return '\n'.join(zeilen[:14])


# ---------------------------------------------------------------- Selbsttest

def selbsttest():
    pruefe_regeln()
    fehler = []

    def ok(name, bedingung):
        print(('  ok   ' if bedingung else '  FAIL ') + name)
        if not bedingung:
            fehler.append(name)

    regeln = [('A alt.', 'A neu.', 1), ('B alt', 'B neu', 2)]
    h = 'x A alt. y B alt z B alt w'
    neu, st = ersetzen(h, regeln)
    ok('wendet alle Regeln an', neu == 'x A neu. y B neu z B neu w' and st == 'AENDERN')
    neu2, st2 = ersetzen(neu, regeln)
    ok('zweiter Lauf ändert nichts (BEREITS)', neu2 == neu and st2 == 'BEREITS')

    def wirft(f):
        try:
            f()
        except RuntimeError:
            return True
        return False
    ok('falsche Anzahl bricht ab', wirft(lambda: ersetzen('x A alt. y B alt z', regeln)))
    ok('fehlende Stelle bricht ab', wirft(lambda: ersetzen('nichts', regeln)))
    ok('gemischter Stand bricht ab', wirft(lambda: ersetzen('x A neu. y B alt z B alt w', regeln)))
    ok('alt zweimal statt einmal bricht ab', wirft(lambda: ersetzen('A alt. A alt. B alt B alt', regeln)))

    # strukturierte Daten bleiben lesbar, auch wenn der Text in der JSON-Zeichenkette steht
    ld = ('<p>ist es ideal, bis spätestens Mitte November zu planen. So.</p>'
          '<script type="application/ld+json">{"a": {"text": "ist es ideal, bis spätestens Mitte November zu planen. So."}}</script>')
    r2 = [('ist es ideal, bis spätestens Mitte November zu planen. So.', 'ist es ideal, früh zu bestellen. So.', 2)]
    neu3, _ = ersetzen(ld, r2)
    ok('JSON-LD bleibt gültig und trägt den neuen Satz', json_ld_gueltig(neu3) == 1 and 'Mitte November' not in neu3)

    # Regeln des Werkzeugs selbst
    alle_neu = ' '.join(e for _, _, rs in ZIELE for _, e, _ in rs)
    ok('keine verbotenen Wörter in den neuen Sätzen', not any(re.search(m, alle_neu) for m in VERBOTEN))
    ok('jede Regel ändert den Text', all(a != e for _, _, rs in ZIELE for a, e, _ in rs))
    ok('Datum steht in jeder alten Fassung der Sammlungen/Seite',
       all(re.search(r'(Mitte|Anfang|Ende) (November|Dezember)', a)
           for art, _, rs in ZIELE if art != 'article' for a, _, _ in rs))
    ok('Verlinkungen zeigen auf drei Weihnachts-Sammlungen',
       all(f'/collections/{s}"' in alle_neu for s in ('weihnachtspyjama-familie', 'weihnachtspullover', 'adventskalender')))
    ok('neue Links tragen keinen Preis und keine Frist', 'CHF' not in alle_neu)
    ok('neun Ziele (7 Sammlungen, 1 Artikel, 1 Seite)', len(ZIELE) == 9)

    print('Selbsttest:', 'ALLE OK' if not fehler else f'{len(fehler)} FEHLER')
    return 0 if not fehler else 1


# ---------------------------------------------------------------- Hauptlauf

def main():
    if '--selbsttest' in sys.argv:
        return selbsttest()
    pruefe_regeln()
    live = os.environ.get('LIVE') == '1'
    zurueck = os.environ.get('ZURUECK') == '1'
    shop, tok = token()
    sicherung = json.load(open(SICHERUNG, encoding='utf-8')) if os.path.exists(SICHERUNG) else {}
    plan = []
    for art, handle, regeln in ZIELE:
        schluessel = f'{art}:{handle}'
        jetzt = lesen(shop, tok, art, handle)
        if zurueck:
            if schluessel not in sicherung:
                raise RuntimeError(f'Keine Sicherung für {schluessel}')
            soll = sicherung[schluessel]['html']
            # nur zurückschreiben, wenn der Text noch dem Stand dieses Werkzeugs entspricht
            erwartet_jetzt, _ = ersetzen(soll, regeln)
            if jetzt['html'] != erwartet_jetzt and jetzt['html'] != soll:
                raise RuntimeError(f'{schluessel}: Text wurde inzwischen von anderer Seite geändert – nicht zurückgeschrieben')
            status = 'BEREITS' if jetzt['html'] == soll else 'AENDERN'
            neu = soll
        else:
            neu, status = ersetzen(jetzt['html'], regeln)
        if art == 'article':
            assert json_ld_gueltig(neu) == json_ld_gueltig(jetzt['html']), 'Anzahl strukturierter Daten geändert'
            if not zurueck:
                assert 'Mitte November' not in neu, 'Artikel enthält noch «Mitte November»'
        plan.append((art, handle, schluessel, jetzt, neu, status))
        print(f"{status:8} {art:10} {handle}  (veröffentlicht: {jetzt.get('veroeffentlicht', '-')})")
        if status == 'AENDERN':
            print(zeige(jetzt['html'], neu))
    todo = [p for p in plan if p[5] == 'AENDERN']
    print(f'--- {len(todo)} von {len(plan)} Zielen zu ändern')
    if not todo:
        print('Nichts zu tun.')
        return 0
    if not live:
        print('TROCKENLAUF: nichts geschrieben. Mit LIVE=1 schreiben.')
        return 0
    if not zurueck:
        from datetime import datetime, timezone
        neu_gesichert = False
        for art, handle, schluessel, jetzt, neu, status in todo:
            if schluessel not in sicherung:
                sicherung[schluessel] = {'id': jetzt['id'], 'titel': jetzt['titel'], 'html': jetzt['html'],
                                         'gesichert': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
                neu_gesichert = True
        if neu_gesichert:
            json.dump(sicherung, open(SICHERUNG, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            print('Sicherung geschrieben:', SICHERUNG)
    fehler = 0
    for art, handle, schluessel, jetzt, neu, status in todo:
        schreiben(shop, tok, art, jetzt['id'], neu)
        danach = lesen(shop, tok, art, handle)
        gleich = danach['html'] == neu
        print(f"Rücklesen {art}:{handle}: {'GLEICH' if gleich else 'ABWEICHUNG'}")
        if not gleich:
            fehler += 1
    return 0 if fehler == 0 else 2


if __name__ == '__main__':
    sys.exit(main())
