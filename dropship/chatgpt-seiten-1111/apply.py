#!/usr/bin/env python3
"""Belegte Kaufhilfen für Sammlungen, auf die ChatGPT Besucher schickt (11.11.2026).

Warum (ShopifyQL, 14 Tage bis 11.11.2026, `utm_source = chatgpt.com`): ChatGPT schickt Besucher auf Sammlungsseiten,
deren Einleitung nur 4 bis 15 Wörter hat. Die Texte in `texte.json` nennen nur Arten, Materialien und Merkmale, die
die Produkte der Sammlung belegen. Das Skript zählt JEDEN Beleg beim Lauf gegen alle aktiven Produkte nach und
schreibt nur, wenn alle erreicht sind. Verändert wird nur `descriptionHtml`; SEO-Titel und -Beschreibung bleiben.
Ein Markierungsblock am Ende (`<!-- ls-verwandt -->`, `<!-- gd2 -->`) bleibt erhalten.

Aufruf (Vorgabe: Trockenlauf, schreibt nichts):
  python3 dropship/chatgpt-seiten-1111/apply.py                      Plan und Belegzählung
  LIVE=1 python3 dropship/chatgpt-seiten-1111/apply.py               schreiben (Sicherung, frisches Rücklesen)
  ZURUECK=1 LIVE=1 python3 dropship/chatgpt-seiten-1111/apply.py     Sicherung zurückschreiben
  NUR=handle1,handle2 …                                              nur diese Sammlungen
  python3 dropship/chatgpt-seiten-1111/apply.py --selbsttest         Prüfungen ohne Netz
Exit: 0 alles gut · 1 mindestens eine Sammlung übersprungen (Beleg fehlt, Textregel, alter Text weicht ab) ·
      2 Abweichung beim Rücklesen.
"""
import json
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
for kandidat in (os.environ.get('RANKING_LIB', ''), os.path.join(HIER, '..', 'ranking-0911'), os.path.join(HIER, 'lib')):
    if kandidat and os.path.exists(os.path.join(kandidat, 'apply_einleitungen.py')):
        sys.path.insert(0, kandidat)
        break
import apply_einleitungen as basis  # woerter, marker_teil, neues_html, zaehle_belege, lade, VERBOTEN  # noqa: E402
import apply_fristen as netz        # token, gql                                                        # noqa: E402

TEXTE = os.environ.get('TEXTE') or os.path.join(HIER, 'texte.json')
SICHERUNG = os.environ.get('SICHERUNG') or os.path.join(HIER, 'sicherung.json')
SCHREIBEN = basis.SCHREIBEN

# zusätzlich zu basis.VERBOTEN: Superlative, Wirkung, Echtheit, Dichtheit
VERBOTEN_ZUSATZ = [r'\bPremium', r'hochwertig', r'\bperfekt', r'\bbeste[nrms]?\b', r'\bideal', r'wasserdicht', r'Echtleder',
                   r'echtes? Leder', r'Haltungskorrektur', r'korrigier', r'linder', r'Therapie', r'therapeut', r'entlast',
                   r'Diamant', r'\bRabatt', r'Bestseller', r'\bTop[- ]', r'einzigartig', r'luxuri', r'ß', r' – ', r'—']


def text_fehler(handle, z):
    """Liste der Regelverstösse eines Eintrags (leer = in Ordnung)."""
    t = z.get('neu') or ''
    f = []
    for muster in list(basis.VERBOTEN) + VERBOTEN_ZUSATZ:
        m = re.search(muster, t, re.I)
        if m:
            f.append(f'verbotenes Wort/Zeichen «{m.group(0)}»')
    w = basis.woerter(t)
    if not 70 <= w <= 170:
        f.append(f'{w} Wörter (erlaubt 70 bis 170)')
    if t.count('<p>') != 2 or t.count('</p>') != 2 or not t.startswith('<p>') or not t.endswith('</p>'):
        f.append('nicht genau zwei Absätze <p>…</p>')
    if not re.search(r'</p>\s*<p><strong>So wählst du:</strong> ', t):
        f.append('zweiter Absatz beginnt nicht mit «So wählst du:»')
    if re.search(r'<(?!/?(p|strong)>)', t):
        f.append('anderes HTML als <p> und <strong>')
    if '<!--' in t:
        f.append('Markierungsblock im neuen Text')
    if not z.get('belege'):
        f.append('keine Belege')
    for b in z.get('belege') or []:
        try:
            re.compile(b['muster'])
        except re.error as e:
            f.append(f"Muster «{b['muster']}» ungültig: {e}")
        if int(b.get('minimum', 0)) < 1:
            f.append(f"Beleg «{b['aussage']}»: Minimum unter 1")
        if not set(b.get('felder') or []) <= {'title', 'options', 'text'} or not b.get('felder'):
            f.append(f"Beleg «{b['aussage']}»: Felder ungültig")
    if (z.get('alt') or '') == t:
        f.append('neuer Text gleich dem alten')
    return f


def belege_tupel(z):
    return [(b['aussage'], b['muster'], tuple(b['felder']), int(b['minimum'])) for b in z['belege']]


def status_fuer(jetzt, z):
    """BEREITS | AENDERN | ABWEICHUNG, dazu das Ziel-HTML."""
    ziel = basis.neues_html(jetzt, z['neu'])
    if jetzt == ziel:
        return 'BEREITS', ziel
    rest = basis.marker_teil(jetzt)
    kopf = jetzt[:len(jetzt) - len(rest)] if rest else jetzt
    if kopf.strip() == (z.get('alt') or '').strip():
        return 'AENDERN', ziel
    return 'ABWEICHUNG', ziel


def selbsttest():
    fehler = []

    def ok(name, bed):
        print(('  ok   ' if bed else '  FAIL ') + name)
        if not bed:
            fehler.append(name)

    gut = {'alt': '<p>Alt.</p>', 'neu': '<p>' + 'Wort ' * 40 + 'Ringe aus Edelstahl.</p><p><strong>So wählst du:</strong> ' + 'Wort ' * 40 + 'Ende.</p>',
           'belege': [{'aussage': 'Edelstahl', 'muster': r'edelstahl', 'felder': ['title'], 'minimum': 2}]}
    ok('guter Eintrag: keine Regelverstösse', text_fehler('x', gut) == [])
    for name, aend in [('Preis', lambda z: z.update(neu=z['neu'].replace('Ende.', 'ab CHF 9.'))),
                       ('Superlativ', lambda z: z.update(neu=z['neu'].replace('Ende.', 'hochwertig.'))),
                       ('Gedankenstrich', lambda z: z.update(neu=z['neu'].replace('Ende.', 'so – oder so.'))),
                       ('Eszett', lambda z: z.update(neu=z['neu'].replace('Ende.', 'groß.'))),
                       ('Link', lambda z: z.update(neu=z['neu'].replace('Ende.', '<a href="/x">hier</a>.'))),
                       ('drei Absätze', lambda z: z.update(neu=z['neu'] + '<p>Mehr.</p>')),
                       ('zu kurz', lambda z: z.update(neu='<p>Kurz.</p><p><strong>So wählst du:</strong> Kurz.</p>')),
                       ('ohne So wählst du', lambda z: z.update(neu=z['neu'].replace('<strong>So wählst du:</strong> ', ''))),
                       ('ohne Belege', lambda z: z.update(belege=[])),
                       ('kaputtes Muster', lambda z: z.update(belege=[{'aussage': 'a', 'muster': '(', 'felder': ['title'], 'minimum': 1}])),
                       ('Minimum 0', lambda z: z.update(belege=[{'aussage': 'a', 'muster': 'a', 'felder': ['title'], 'minimum': 0}])),
                       ('Markierung im Text', lambda z: z.update(neu=z['neu'] + '<!-- gd2 -->')),
                       ('Gesundheit', lambda z: z.update(neu=z['neu'].replace('Ende.', 'lindert Verspannungen.')))]:
        z = json.loads(json.dumps(gut))
        aend(z)
        ok('Regelverstoss erkannt: ' + name, len(text_fehler('x', z)) >= 1)
    # Status
    ok('Status AENDERN bei exakt altem Text', status_fuer('<p>Alt.</p>', gut)[0] == 'AENDERN')
    ok('Status AENDERN mit Markierungsblock, Block bleibt', status_fuer('<p>Alt.</p>\n<!-- ls-verwandt -->x', gut)[0] == 'AENDERN'
       and status_fuer('<p>Alt.</p>\n<!-- ls-verwandt -->x', gut)[1].endswith('\n<!-- ls-verwandt -->x'))
    ok('Status ABWEICHUNG bei fremdem Text', status_fuer('<p>Ganz anders.</p>', gut)[0] == 'ABWEICHUNG')
    ok('Status BEREITS nach dem Schreiben', status_fuer(gut['neu'], gut)[0] == 'BEREITS')
    ok('Status BEREITS mit Markierungsblock', status_fuer(gut['neu'] + '\n<!-- gd2 -->y', gut)[0] == 'BEREITS')
    # Belegzählung über die Basis
    ps = [{'title': 'Ring aus Edelstahl', 'text': '', 'options': []}, {'title': 'Kette', 'text': 'Edelstahl', 'options': []}]
    r = basis.zaehle_belege(ps, belege_tupel(gut))
    ok('Beleg nicht erreicht (1 von 2 im Titel)', r[0][1] == 1 and r[0][3] is False)
    print('Selbsttest:', 'ALLE OK' if not fehler else f'{len(fehler)} FEHLER')
    return 0 if not fehler else 1


def main():
    if '--selbsttest' in sys.argv:
        return selbsttest()
    live = os.environ.get('LIVE') == '1'
    zurueck = os.environ.get('ZURUECK') == '1'
    texte = json.load(open(TEXTE, encoding='utf-8'))
    nur = [h for h in (os.environ.get('NUR') or '').split(',') if h]
    if nur:
        texte = {h: z for h, z in texte.items() if h in nur}
    shop, tok = netz.token()
    sicherung = json.load(open(SICHERUNG, encoding='utf-8')) if os.path.exists(SICHERUNG) else {}
    plan, uebersprungen = [], []
    for handle, z in texte.items():
        probleme = text_fehler(handle, z)
        d, prod = basis.lade(shop, tok, handle)
        jetzt = d['descriptionHtml'] or ''
        print(f'===== {handle}: {len(prod)} aktive Produkte, Text jetzt {basis.woerter(jetzt)} Wörter')
        if zurueck:
            if handle not in sicherung:
                print('   keine Sicherung: nichts zurückzuschreiben')
                continue
            soll = sicherung[handle]['html']
            if jetzt == soll:
                print('   -> BEREITS (Stand der Sicherung)')
                continue
            if jetzt != basis.neues_html(soll, z['neu']):
                print('   ABWEICHUNG: Text wurde inzwischen anderweitig geändert, nicht zurückgeschrieben')
                uebersprungen.append(handle)
                continue
            plan.append((handle, d['id'], jetzt, soll))
            print(f'   -> ZURÜCK auf {basis.woerter(soll)} Wörter')
            continue
        beleg = basis.zaehle_belege(prod, belege_tupel(z)) if not any('Muster' in p or 'Belege' in p or 'Felder' in p for p in probleme) else []
        for name, n, minimum, gut in beleg:
            print(f"   {'ok   ' if gut else 'FEHLT'} {name}: {n} Produkte (mindestens {minimum})")
            if not gut:
                probleme.append(f'Beleg «{name}» nicht erreicht ({n} von mindestens {minimum})')
        status, ziel = status_fuer(jetzt, z)
        if status == 'ABWEICHUNG':
            probleme.append('heutiger Text weicht vom erwarteten alten Text ab: ' + jetzt[:160].replace('\n', ' '))
        if probleme:
            for p in probleme:
                print('   PROBLEM:', p)
            uebersprungen.append(handle)
            continue
        print(f'   -> {status}; neuer Text {basis.woerter(z["neu"])} Wörter')
        if status == 'AENDERN':
            plan.append((handle, d['id'], jetzt, ziel))
    print(f'--- {len(plan)} zu schreiben, {len(uebersprungen)} übersprungen: {", ".join(uebersprungen) or "keine"}')
    if not live:
        print('TROCKENLAUF: nichts geschrieben. Mit LIVE=1 schreiben.')
        return 1 if uebersprungen else 0
    if plan and not zurueck:
        from datetime import datetime, timezone
        for handle, cid, jetzt, ziel in plan:
            if handle not in sicherung:
                sicherung[handle] = {'id': cid, 'html': jetzt, 'gesichert': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
        json.dump(sicherung, open(SICHERUNG, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('Sicherung geschrieben:', SICHERUNG)
    fehler = 0
    for handle, cid, jetzt, ziel in plan:
        r = netz.gql(shop, tok, SCHREIBEN, {'i': {'id': cid, 'descriptionHtml': ziel}})['collectionUpdate']
        if r['userErrors']:
            print('FEHLER', handle, json.dumps(r['userErrors'], ensure_ascii=False)[:300])
            fehler += 1
            continue
        d, _ = basis.lade(shop, tok, handle)
        gleich = (d['descriptionHtml'] or '') == ziel
        print(f"Rücklesen {handle}: {'GLEICH' if gleich else 'ABWEICHUNG'}")
        fehler += 0 if gleich else 1
    return 2 if fehler else (1 if uebersprungen else 0)


if __name__ == '__main__':
    sys.exit(main())
