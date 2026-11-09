#!/usr/bin/env python3
"""Dünne Sammlungs-Einleitungen durch eine belegte Kaufhilfe ersetzen (wie «trinkbrunnen-katzen»).

Warum (Search Console, 28 Tage bis 06.11.2026): zwei Sammlungen mit Einblendungen und fast keinem Text.
  buero-organizer-ablage      111 Einblendungen, Position 67,1, Text 10 Wörter, 37 Produkte
  freizeit-sportrucksaecke     42 Einblendungen, Position 32,9, Text 16 Wörter, 219 Produkte
Ehrliche Erwartung: Position 33 bis 67 ändert ein Text allein kaum. Es ist die billige Hygiene gegen «dünne Seite».

Regeln des Textes: nur Bauarten und Merkmale, die in den Produkten der Sammlung stehen (BELEGE werden beim Lauf
LIVE gegen alle aktiven Produkte gezählt und müssen erreicht sein); keine Preise, keine Lieferzeiten, keine
Gesundheits- oder Sicherheitsaussagen, keine Zusagen. Verändert wird NUR `descriptionHtml`; SEO-Titel und
-Beschreibung bleiben. Ein Markierungsblock am Ende (`<!-- ls-verwandt -->`, `<!-- gd2 -->`) bleibt erhalten.

Aufruf (Vorgabe: Trockenlauf, schreibt nichts):
  python3 dropship/ranking-0911/apply_einleitungen.py
  LIVE=1 python3 dropship/ranking-0911/apply_einleitungen.py            schreiben (mit Sicherung und Rücklesen)
  ZURUECK=1 LIVE=1 python3 dropship/ranking-0911/apply_einleitungen.py  Sicherung zurückschreiben
  python3 dropship/ranking-0911/apply_einleitungen.py --selbsttest      Prüfungen ohne Netz
"""
import json
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import apply_fristen as netz  # token, gql (nur Netzfunktionen)

SICHERUNG = os.path.join(HIER, 'sicherung_einleitungen.json')

NEU_BUERO = (
    '<p>Büro-Organizer und Ablagen für den Schreibtisch: Stiftehalter (aus Holz, Metall oder als Bausteinfigur), '
    'Etuis und Federmäppchen, Schreibtisch-Organizer mit Fächern oder Schubladen, Körbe und Trays sowie '
    'Dokumentenhalter und Ordner. Dazu kommen Sammelkartenalben und Schutzhüllen. Die Modelle bestehen unter '
    'anderem aus Holz, Edelstahl, Eisen, Rattan, Leder oder Kunststoff.</p>'
    '<p><strong>So wählst du:</strong> Überlege zuerst, was auf den Schreibtisch muss: nur Stifte, auch Notizen und '
    'Karten oder ganze Dokumente. Miss den freien Platz und vergleiche ihn mit den Abmessungen beim Artikel. '
    'Fächer und Schubladen halten Kleinteile getrennt, ein offener Korb oder ein Tray ist schneller griffbereit, '
    'und ein Wandhalter spart Platz auf dem Tisch. Die genauen Angaben und Ausführungen findest du beim '
    'jeweiligen Artikel.</p>'
)

NEU_RUCKSACK = (
    '<p>Rucksäcke für Alltag, Freizeit und Sport: Tagesrucksäcke, urbane und College-Rucksäcke, Modelle aus Canvas, '
    'Oxford-Gewebe oder Leder und Kunstleder sowie Sportrucksäcke für Fitness, Tennis, Badminton, Basketball und '
    'Fussball. Viele Modelle nennen ihr Volumen in Litern, zum Beispiel 20–35 L oder 36–55 L.</p>'
    '<p><strong>So wählst du:</strong> Das Volumen bestimmt, wofür der Rucksack taugt: Für den Alltag oder einen Tag '
    'unterwegs reichen kleinere Modelle, für Training mit Wechselkleidern oder für Reisen darf es grösser sein. '
    'Achte auf gepolsterte Träger, auf ein Laptopfach, wenn du ein Notebook mitnimmst (einige Modelle haben eines), '
    'auf einen USB-Ladeanschluss, wenn du unterwegs laden willst (einzelne Modelle), und bei Sportrucksäcken auf ein '
    'getrenntes Nassfach für feuchte Kleidung. Ob ein Modell wasserdicht oder nur wasserabweisend ist, steht beim '
    'jeweiligen Artikel.</p>'
)

# Beleg: (Aussage, Muster, Felder, Mindestanzahl Produkte)
ZIELE = {
    'buero-organizer-ablage': {
        'alt': '<p>Schreibtisch-Organizer, Stiftehalter, Etuis und Ablagen — Ordnung auf dem Schreibtisch.</p>',
        'neu': NEU_BUERO,
        'belege': [
            ('Stiftehalter', r'stiftehalter|stifthalter|stifte- und pinselhalter|pigmentstifthalter', ('title',), 5),
            ('Etuis und Federmäppchen', r'etui|federmäppchen', ('title',), 4),
            ('Fächer oder Schubladen', r'schublade|fächer', ('title', 'options'), 3),
            ('Schreibtisch-Organizer', r'organizer', ('title',), 5),
            ('Körbe', r'korb', ('title',), 1),
            ('Trays', r'tray', ('title',), 1),
            ('Dokumentenhalter und Ordner', r'dokumenten|ordner', ('title',), 2),
            ('Wandhalter', r'wandmontiert', ('title',), 1),
            ('Sammelkartenalben und Schutzhüllen', r'sammelkarten|karten-sammelbuch', ('title',), 2),
            ('Bausteinfigur', r'baustein', ('title',), 1),
            ('Holz', r'holz', ('title',), 3),
            ('Metall', r'metall', ('title',), 1),
            ('Edelstahl', r'edelstahl', ('title',), 1),
            ('Eisen', r'eisen', ('title',), 1),
            ('Rattan', r'rattan', ('title',), 1),
            ('Leder', r'leder', ('title',), 1),
            ('Kunststoff', r'kunststoff', ('title', 'text'), 1),
        ],
    },
    'freizeit-sportrucksaecke': {
        'alt': ('<p>Rucksäcke für Alltag, Freizeit und Sport: Tagesrucksäcke, Stadtrucksäcke, Mode-Rucksäcke und '
                'Sportrucksäcke für Training, Ball- und Schlägersport.</p>'),
        'neu': NEU_RUCKSACK,
        'belege': [
            ('Tagesrucksäcke', r'tagesrucksack|tagesrucksäck', ('title',), 1),
            ('urban / College', r'urban|college|strassen', ('title',), 1),
            ('Canvas', r'canvas', ('title',), 3),
            ('Oxford-Gewebe', r'oxford', ('title',), 3),
            ('Leder', r'leder', ('title',), 3),
            ('Kunstleder (PU)', r'\bpu\b|kunstleder', ('title', 'text'), 3),
            ('Fitness', r'fitness', ('title',), 1),
            ('Tennis', r'tennis', ('title',), 1),
            ('Badminton', r'badminton', ('title',), 1),
            ('Basketball', r'basketball', ('title',), 1),
            ('Fussball', r'fussball|fußball', ('title',), 1),
            ('Volumen 20–35 L', r'20\s?[-–]\s?35\s?l', ('title',), 1),
            ('Volumen 36–55 L', r'36\s?[-–]\s?55\s?(l|liter)', ('title',), 1),
            ('Laptopfach', r'(fach|tasche)[^.]{0,60}laptop|laptop[^.]{0,40}(fach|polster)', ('text',), 3),
            ('USB-Ladeanschluss', r'usb[\s‑-]*(lade|anschluss)', ('text', 'title'), 3),
            ('Nassfach / Trocken-Nass-Trennung', r'nassfach|nassraum|dry-wet|trocken-nass|trockenfach', ('title',), 2),
        ],
    },
}

VERBOTEN = [r'CHF', r'\bFr\.', r'Werktag', r'Lieferzeit', r'Weihnacht', r'Gratis', r'gesund', r'Schmerz', r'heilt',
            r'garantiert', r'\b\d{1,2}\.\s?(Jan|Feb|Mär|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez)', r'bis spätestens',
            r'zertifiziert', r'geprüft', r'Norm\b', r'CE-']


def woerter(html):
    return len(re.sub(r'<[^>]+>', ' ', html).split())


def marker_teil(html):
    """Alles ab dem ersten Markierungsblock (<!-- ls-verwandt --> oder <!-- gd2 -->) bleibt erhalten."""
    m = re.search(r'\n?<!--\s*(ls-verwandt|gd2)\s*-->', html)
    return html[m.start():] if m else ''


def neues_html(alt_html, neu_text):
    rest = marker_teil(alt_html)
    return neu_text + (rest if rest.startswith('\n') or not rest else '\n' + rest)


def zaehle_belege(produkte, belege):
    """Rückgabe: Liste (Aussage, gefunden, mindestens, ok)."""
    out = []
    for name, muster, felder, minimum in belege:
        n = 0
        for p in produkte:
            teile = []
            for fld in felder:
                if fld == 'options':
                    teile.append(' '.join(v for o in p.get('options', []) for v in [o['name']] + list(o['values'])))
                else:
                    teile.append(p.get(fld) or '')
            if re.search(muster, ' | '.join(teile), re.I):
                n += 1
        out.append((name, n, minimum, n >= minimum))
    return out


def pruefe_texte():
    for h, z in ZIELE.items():
        t = z['neu']
        for muster in VERBOTEN:
            assert not re.search(muster, t, re.I), (h, muster)
        assert 70 <= woerter(t) <= 170, (h, woerter(t))
        assert t.count('<p>') == 2 and t.count('</p>') == 2, h
        assert '<a ' not in t, h
        assert z['alt'] != t


def selbsttest():
    pruefe_texte()
    fehler = []

    def ok(name, bed):
        print(('  ok   ' if bed else '  FAIL ') + name)
        if not bed:
            fehler.append(name)

    ok('Texte: keine verbotenen Wörter, 70–170 Wörter, zwei Absätze, keine Links', True)
    # Markierungsblock bleibt erhalten
    alt = '<p>alt</p>\n<!-- ls-verwandt --><p>Passend</p><!-- /ls-verwandt -->'
    n = neues_html(alt, '<p>neu</p>')
    ok('Markierungsblock am Ende bleibt erhalten', n == '<p>neu</p>\n<!-- ls-verwandt --><p>Passend</p><!-- /ls-verwandt -->')
    ok('ohne Markierung nur der neue Text', neues_html('<p>alt</p>', '<p>neu</p>') == '<p>neu</p>')
    ok('gd2-Markierung bleibt ebenfalls', '<!-- gd2 -->' in neues_html('<p>a</p>\n<!-- gd2 -->x', '<p>n</p>'))
    # Belegzählung
    ps = [{'title': 'Stiftehalter aus Massivholz', 'text': '', 'options': []},
          {'title': 'Etui', 'text': 'USB-Ladeanschluss', 'options': [{'name': 'Modell', 'values': ['4 Fächer']}]}]
    r = zaehle_belege(ps, [('S', r'stiftehalter', ('title',), 1), ('H', r'holz', ('title',), 2),
                           ('U', r'usb', ('text',), 1), ('F', r'fächer', ('options',), 1)])
    ok('Belegzählung: erreicht/nicht erreicht', [x[3] for x in r] == [True, False, True, True])
    ok('Belegzählung zählt Produkte, nicht Treffer',
       zaehle_belege([{'title': 'holz holz holz', 'text': '', 'options': []}], [('H', r'holz', ('title',), 2)])[0][1] == 1)
    # jede Aussage des Textes hat einen Beleg-Eintrag (Stichwörter)
    ok('Büro-Text: Stichwörter haben Belege',
       all(any(w.lower() in b[0].lower() for b in ZIELE['buero-organizer-ablage']['belege'])
           for w in ('Stiftehalter', 'Etuis', 'Schubladen', 'Körbe', 'Trays', 'Dokumentenhalter', 'Wandhalter',
                     'Sammelkarten', 'Bausteinfigur', 'Holz', 'Edelstahl', 'Eisen', 'Rattan', 'Leder', 'Kunststoff')))
    ok('Rucksack-Text: Stichwörter haben Belege',
       all(any(w.lower() in b[0].lower() for b in ZIELE['freizeit-sportrucksaecke']['belege'])
           for w in ('Tagesrucksäcke', 'Canvas', 'Oxford', 'Leder', 'Fitness', 'Tennis', 'Badminton', 'Basketball',
                     'Fussball', '20–35', '36–55', 'Laptopfach', 'USB', 'Nassfach')))
    print('Selbsttest:', 'ALLE OK' if not fehler else f'{len(fehler)} FEHLER')
    return 0 if not fehler else 1


# ---------------------------------------------------------------- Netz

Q_PRODUKTE = '''query($h:String!,$after:String){ collectionByHandle(handle:$h){ id title descriptionHtml seo{ title description }
  products(first:50, after:$after){ pageInfo{hasNextPage endCursor}
    nodes{ title status options{ name values } descriptionHtml } } } }'''
SCHREIBEN = '''mutation($i:CollectionInput!){ collectionUpdate(input:$i){ collection{ id }
  userErrors{ field message } } }'''


def lade(shop, tok, handle):
    after = None
    prod = []
    while True:
        d = netz.gql(shop, tok, Q_PRODUKTE, {'h': handle, 'after': after})['collectionByHandle']
        if not d:
            raise RuntimeError('Sammlung nicht gefunden: ' + handle)
        p = d['products']
        for n in p['nodes']:
            if n['status'] == 'ACTIVE':
                n['text'] = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', n.pop('descriptionHtml') or '')).strip()
                prod.append(n)
        if not p['pageInfo']['hasNextPage']:
            return d, prod
        after = p['pageInfo']['endCursor']


def main():
    if '--selbsttest' in sys.argv:
        return selbsttest()
    pruefe_texte()
    live = os.environ.get('LIVE') == '1'
    zurueck = os.environ.get('ZURUECK') == '1'
    shop, tok = netz.token()
    sicherung = json.load(open(SICHERUNG, encoding='utf-8')) if os.path.exists(SICHERUNG) else {}
    plan = []
    for handle, z in ZIELE.items():
        d, prod = lade(shop, tok, handle)
        jetzt = d['descriptionHtml'] or ''
        print(f'===== {handle}: {len(prod)} aktive Produkte, Text jetzt {woerter(jetzt)} Wörter')
        beleg = zaehle_belege(prod, z['belege'])
        for name, n, minimum, gut in beleg:
            print(f"   {'ok  ' if gut else 'FEHLT'} {name}: {n} Produkte (mindestens {minimum})")
        if zurueck:
            if handle not in sicherung:
                raise RuntimeError('Keine Sicherung für ' + handle)
            soll = sicherung[handle]['html']
            erwartet_jetzt = neues_html(soll, z['neu'])
            if jetzt != erwartet_jetzt and jetzt != soll:
                raise RuntimeError(f'{handle}: Text wurde inzwischen anderweitig geändert – nicht zurückgeschrieben')
            status = 'BEREITS' if jetzt == soll else 'AENDERN'
            ziel = soll
        else:
            if not all(b[3] for b in beleg):
                raise RuntimeError(f'{handle}: nicht alle Belege erreicht – kein Schreiben')
            ziel = neues_html(jetzt, z['neu'])
            if jetzt == ziel:
                status = 'BEREITS'
            elif jetzt == z['alt'] or marker_teil(jetzt) and jetzt.startswith(z['alt']):
                status = 'AENDERN'
            else:
                raise RuntimeError(f'{handle}: aktueller Text weicht vom erwarteten alten Text ab – von Hand ansehen:\n{jetzt[:300]}')
        print(f'   -> {status}; neuer Text {woerter(ziel)} Wörter')
        plan.append((handle, d['id'], jetzt, ziel, status))
    todo = [p for p in plan if p[4] == 'AENDERN']
    print(f'--- {len(todo)} von {len(plan)} zu ändern')
    if not todo:
        print('Nichts zu tun.')
        return 0
    if not live:
        print('TROCKENLAUF: nichts geschrieben. Mit LIVE=1 schreiben.')
        return 0
    if not zurueck:
        from datetime import datetime, timezone
        neu = False
        for handle, cid, jetzt, ziel, status in todo:
            if handle not in sicherung:
                sicherung[handle] = {'id': cid, 'html': jetzt,
                                     'gesichert': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
                neu = True
        if neu:
            json.dump(sicherung, open(SICHERUNG, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            print('Sicherung geschrieben:', SICHERUNG)
    fehler = 0
    for handle, cid, jetzt, ziel, status in todo:
        r = netz.gql(shop, tok, SCHREIBEN, {'i': {'id': cid, 'descriptionHtml': ziel}})['collectionUpdate']
        if r['userErrors']:
            raise RuntimeError('userErrors: ' + json.dumps(r['userErrors'], ensure_ascii=False)[:400])
        d, _ = lade(shop, tok, handle)
        gleich = (d['descriptionHtml'] or '') == ziel
        print(f"Rücklesen {handle}: {'GLEICH' if gleich else 'ABWEICHUNG'}")
        fehler += 0 if gleich else 1
    return 0 if fehler == 0 else 2


if __name__ == '__main__':
    sys.exit(main())
