#!/usr/bin/env python3
"""Test der zweisprachigen Bausteine der Produktseite mit dem ECHTEN Ruby-Liquid (Referenz von Shopify).

  RUBY_LIQUID_GEMS=<GEM_HOME mit «gem install liquid --version 5.14.0 --install-dir …»> python3 dropship/fr-produkte-0911/vorlage_fr/test_vorlage.py

Geprüft: (1) jeder deutsche Schlüssel der Tabelle steht im Quelltext des Bausteins, (2) strenge Syntaxprüfung der eingewickelten Bausteine,
(3) Lieferbox, Vertrauenszeilen, Rückgabe-Text und Mengenrabatt mit Attrappen der Shopify-Objekte: der deutsche Zweig gibt exakt dasselbe aus wie
der ursprüngliche Baustein, der französische enthält kein Deutsch mehr aus den Tabellen, (4) Rundreise einwickeln/auspacken.
"""
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from html import unescape

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
sys.path.insert(0, os.path.join(HIER, '..', '..', 'fr-seiten-0911'))
import bauen as B  # noqa: E402
import fr_lib as L  # noqa: E402
import phrasen as P  # noqa: E402

RUBY_RENDER = os.path.join(HIER, '..', '..', 'lagerbestand-0511', 'rubyrender.rb')
GEMS = os.environ.get('RUBY_LIQUID_GEMS') or ('/tmp/rlgems' if os.path.isdir('/tmp/rlgems') else '')
FEHLER = []


def ok(name, bed, detail=''):
    print(('  ok   ' if bed else '  FAIL ') + name + ('' if bed else f' | {detail}'))
    if not bed:
        FEHLER.append(name)


def ruby(template, faelle, now=1793867400):
    """Rendert mit Ruby-Liquid (strenger Parser, strenge Filter). Rückgabe (Ausgaben, Fehlerliste)."""
    r = subprocess.run(['ruby', RUBY_RENDER], input=json.dumps({'template': template, 'now': now, 'faelle': faelle}), capture_output=True,
                       text=True, env={**os.environ, 'RUBY_LIQUID_GEMS': GEMS}, timeout=120)
    if r.returncode != 0:
        return None, [r.stderr.strip()[:300]]
    j = json.loads(r.stdout)
    return j['ergebnisse'], j['fehler']


def text(h):
    return re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]+>', ' ', re.sub(r'<(script|style)\b.*?</\1>', ' ', h, flags=re.S)))).strip()


DEUTSCH = re.compile(r'\b(Lieferung|Versand|Lager|ausverkauft|Verfügbar|Bestelle|versandbereit|Schweiz|Hersteller|gedruckt|Nur noch|Rückgabe|Rückgaberecht|'
                     r'Gratis|gratis|Kauf auf Rechnung|Mengenvorteil|Stück|Werktage|Ersatz|Druckfehlern|deine|dein)\b')


def deutsch_rest(t):
    """Deutscher Rest in einem französischen Text: enge Wortliste dieses Tests UND die allgemeine Funktionswörter-Liste der Seitenübersetzung
    (fr_lib.rest_deutsch). Die enge Liste allein übersah «auch gemischt aus dieser Auswahl, im Warenkorb …» (GEMESSEN 09.11. an der Live-Seite)."""
    return DEUTSCH.findall(t) + L.rest_deutsch(t)


def main():
    if not GEMS or not os.path.isdir(GEMS):
        print('RUBY_LIQUID_GEMS fehlt (gem install liquid --version 5.14.0 --no-document --install-dir /tmp/rlgems): Ruby-Teile übersprungen')
        return 3
    quelle = open(os.path.join(HIER, 'quelle-product.json'), encoding='utf-8').read()
    kopf, daten = B.vorlage_laden(quelle)
    bl = {n: e['custom_liquid'] for n, e in B.bloecke_finden(daten)}

    # (1) Schlüssel im Quelltext
    dyn = {k for k, _ in P.DATUM} | {'href="/collections/mengenrabatt-ab-2-stueck"', 'href="/collections/mengenrabatt-ab-3-stueck"'}   # in der Ausgabe aus Liquid zusammengesetzt
    fehlt = [(n, de[:50]) for n, paare in P.BLOECKE.items() for de, _ in paare if de not in dyn and de not in bl[n]]
    ok('jeder deutsche Schlüssel steht im Quelltext seines Bausteins', not fehlt, fehlt[:5])
    ok('alle Bausteine der Tabelle gibt es in der Vorlage', set(P.BLOECKE) <= set(bl), set(P.BLOECKE) - set(bl))
    # (4) Rundreise
    neu, ber = B.umbauen(quelle)
    zur, _ = B.umbauen(neu, rueckwaerts=True)
    ok('Rundreise: einwickeln und auspacken ergibt den Ausgangszustand', B.vorlage_laden(zur)[1] == daten)
    ok('zweites Einwickeln ändert nichts (idempotent)', B.umbauen(neu)[0] == neu)
    wrap = {n: e['custom_liquid'] for n, e in B.bloecke_finden(B.vorlage_laden(neu)[1])}

    # (2) strenge Syntax
    for n in P.BLOECKE:
        out, f = ruby(wrap[n], [])
        ok(f'strenge Syntaxprüfung: {n}', out is not None and not f, f)

    # (3) Lieferbox mit Attrappen
    def ctx(tags, ok_=True, v=None, preis=2990, land='CH', loc='de', stufe=None, druck=None, stempel='2026-11-05T07:30:00Z', schalter=None):
        c = {'closest': {'product': {'id': 123, 'tags': tags, 'available': ok_,
                                     'selected_or_first_available_variant': v or {'available': ok_, 'inventory_quantity': 2, 'inventory_management': 'shopify', 'inventory_policy': 'deny'}}},
             'product': {'price_min': preis, 'tags': tags, 'description': ''}, 'localization': {'country': {'iso_code': land}},
             'request': {'locale': {'iso_code': loc}}, 'shop': {'metafields': {'luxe': {}}}}
        mf = c['shop']['metafields']['luxe']
        if stempel is not None:
            mf['fortura_bestand_stand'] = {'value': stempel}
        if schalter is not None:
            mf['bestand_anzeige'] = {'value': schalter}
        if stufe is not None:
            mf['ch_lager_stufe'] = {'value': stufe}
        if druck is not None:
            mf['druck_profil_ids'] = {'value': druck}
        return c
    q = lambda qty: {'available': True, 'inventory_quantity': qty, 'inventory_management': 'shopify', 'inventory_policy': 'deny'}  # noqa: E731
    def faelle_fuer(now):
        st = datetime.fromtimestamp(now - 3600, timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')   # Bestandsstempel eine Stunde alt
        return faelle_bauen(st)

    def faelle_bauen(st):
      return {
        'CH-Lager, 2 Stück': ctx(['fortura', 'profil-ch-lager'], v=q(2), stempel=st),
        'CH-Lager, 1 Stück': ctx(['fortura', 'profil-ch-lager'], v=q(1), stempel=st),
        'CH-Lager, 5 Stück': ctx(['fortura', 'profil-ch-lager'], v=q(5), stempel=st),
        'CH-Lager, 20 Stück': ctx(['fortura', 'profil-ch-lager'], v=q(20), stempel=st),
        'CH-Lager, Ausführung ausverkauft': ctx(['fortura', 'profil-ch-lager'], v={'available': False, 'inventory_quantity': 0, 'inventory_management': 'shopify', 'inventory_policy': 'deny'}),
        'Produkt ausverkauft': ctx(['fortura'], ok_=False, v={'available': False, 'inventory_quantity': 0, 'inventory_management': 'shopify', 'inventory_policy': 'deny'}),
        'EU-Lager': ctx(['eu-lager']),
        'Druck auf Bestellung': ctx(['selbst-gestalten']),
        'Direktversand': ctx([]),
        'Liechtenstein': ctx([], land='LI'),
        'CH-Lager Stufe 0': ctx(['fortura'], stufe=0),
      }
    for now, name in ((1793867400, '05.11.'), (1795250000, '20.11.')):
        faelle = faelle_fuer(now)
        de_ctx = list(faelle.values())
        fr_ctx = [json.loads(json.dumps(c)) for c in de_ctx]
        for c in fr_ctx:
            c['request']['locale']['iso_code'] = 'fr'
        orig_de, f1 = ruby(bl['lux_delivery'], de_ctx, now)
        wrap_de, f2 = ruby(wrap['lux_delivery'], de_ctx, now)
        wrap_fr, f3 = ruby(wrap['lux_delivery'], fr_ctx, now)
        ok(f'Lieferbox ({name}): Ruby-Liquid meldet keine Fehler', not (f1 or f2 or f3), (f1 or f2 or f3))
        if orig_de is None or wrap_de is None or wrap_fr is None:
            continue
        for (fname, _), o, w, f in zip(faelle.items(), orig_de, wrap_de, wrap_fr):
            ok(f'Lieferbox ({name}) «{fname}»: deutscher Zweig gleich dem ursprünglichen Baustein', o == w, 'Ausgabe weicht ab')
            rest = deutsch_rest(text(f))
            ok(f'Lieferbox ({name}) «{fname}»: französisch ohne deutsche Wörter', not rest, rest[:4])
        textfr = ' '.join(text(f) for f in wrap_fr)
        for erwartet in ('Plus que 2 en stock', 'Plus qu’une pièce en stock', 'Plus que quelques pièces en stock', 'En stock · prêt à expédier', 'Cette version est épuisée',
                         'Actuellement épuisé', 'En stock dans l’entrepôt de l’UE', 'Imprimé pour vous', 'Disponible · expédition directe depuis l’Asie',
                         'Livraison au Liechtenstein', 'Commandez maintenant – livraison estimée du', ' au '):
            ok(f'Lieferbox ({name}): französischer Text enthält «{erwartet}»', erwartet in textfr)
        ok(f'Lieferbox ({name}): Daten mit französischem Monat', re.search(r'du \d{1,2} (janv\.|févr\.|mars|avr\.|mai|juin|juil\.|août|sept\.|oct\.|nov\.|déc\.) – ?\d{1,2}|du \d{1,2} (janv\.|févr\.|mars|avr\.|mai|juin|juil\.|août|sept\.|oct\.|nov\.|déc\.) au \d{1,2} (janv\.|févr\.|mars|avr\.|mai|juin|juil\.|août|sept\.|oct\.|nov\.|déc\.)', textfr) is not None, textfr[:300])

    # Vertrauenszeilen
    def tctx(tags, preis, beschr, loc):
        return {'product': {'tags': tags, 'price_min': preis, 'description': beschr}, 'request': {'locale': {'iso_code': loc}}}
    for name, args in {'CH-Lager': (['profil-ch-lager'], 2990, ''), 'ab 55.56': ([], 6000, ''), 'ab 50': ([], 5200, ''), 'normal': ([], 2000, ''),
                       'Editor': ([], 2000, 'x lspod-designer y')}.items():
        o, _ = ruby(bl['lux_trust'], [tctx(*args, 'de')])
        w, _ = ruby(wrap['lux_trust'], [tctx(*args, 'de')])
        f, _ = ruby(wrap['lux_trust'], [tctx(*args, 'fr')])
        ok(f'Vertrauenszeilen «{name}»: deutscher Zweig gleich', o and w and o[0] == w[0])
        rest = deutsch_rest(text(f[0])) if f else ['kein Ergebnis']
        ok(f'Vertrauenszeilen «{name}»: französisch ohne deutsche Wörter', not rest, rest[:4])
    f, _ = ruby(wrap['lux_trust'], [tctx([], 2000, '', 'fr')])
    ok('Vertrauenszeilen: «30 jours de retour» und «CHF 7» im Französischen', 'de retour' in text(f[0]) and 'CHF 7' in text(f[0]))

    # Rückgabe-Text
    for name, beschr in {'Standard': '', 'Editor': 'lspod-designer'}.items():
        o, _ = ruby(bl['lux_rueckgabe_text'], [{'product': {'description': beschr}, 'request': {'locale': {'iso_code': 'de'}}}])
        w, _ = ruby(wrap['lux_rueckgabe_text'], [{'product': {'description': beschr}, 'request': {'locale': {'iso_code': 'de'}}}])
        f, _ = ruby(wrap['lux_rueckgabe_text'], [{'product': {'description': beschr}, 'request': {'locale': {'iso_code': 'fr'}}}])
        ok(f'Rückgabe-Text «{name}»: deutscher Zweig gleich', o and w and o[0] == w[0])
        rest = deutsch_rest(text(f[0])) if f else ['kein Ergebnis']
        ok(f'Rückgabe-Text «{name}»: französisch ohne deutsche Wörter', not rest, rest[:4])
        ok(f'Rückgabe-Text «{name}»: Link auf /fr/policies', 'href="/fr/policies/refund-policy' in (f[0] if f else ''))

    # Mengenrabatt
    for name, tags in {'a': ['mengenrabatt-a'], 'b': ['mengenrabatt-b'], 'keiner': []}.items():
        ctxs = [{'closest': {'product': {'tags': tags}}, 'request': {'locale': {'iso_code': l}}} for l in ('de', 'fr')]
        o, _ = ruby(bl['lux_mengenrabatt'], ctxs[:1])
        w, _ = ruby(wrap['lux_mengenrabatt'], ctxs[:1])
        f, _ = ruby(wrap['lux_mengenrabatt'], ctxs[1:])
        ok(f'Mengenrabatt «{name}»: deutscher Zweig gleich', o and w and o[0] == w[0])
        rest = deutsch_rest(text(f[0])) if f else ['kein Ergebnis']
        ok(f'Mengenrabatt «{name}»: französisch ohne deutsche Wörter', not rest, rest[:4])

    # Kleine Bausteine mit echten Ausgabeschnipseln (Logik zu verwickelt für Attrappen)
    def schnipsel(name, html):
        t = B.einwickeln('t', html, P.BLOECKE[name])
        de, _ = ruby(t, [{'request': {'locale': {'iso_code': 'de'}}}])
        fr, _ = ruby(t, [{'request': {'locale': {'iso_code': 'fr'}}}])
        return de[0], fr[0]
    de, fr = schnipsel('lux_spezifikationen', '<tr><th>Kategorie</th><td>Uhren</td></tr><tr><th>Marke</th><td>X</td></tr><tr><th>Masse</th><td>5 cm</td></tr>'
                       '<tr><th>Material</th><td>Stahl</td></tr><tr><th>Gewicht</th><td>1 kg</td></tr><tr><th>Zustand</th><td>Neu</td></tr><h3>Spezifikationen &amp; Details</h3>')
    ok('Spezifikationen: deutsch unverändert, französisch übersetzt', 'Gewicht' in de and 'Poids' in fr and 'Neuf' in fr and not deutsch_rest(text(fr)) and 'Gewicht' not in fr)
    de, fr = schnipsel('lux_breadcrumb', '<a href="/">Home</a> › x {"name":"Home"}')
    ok('Brotkrumen: «Home» wird «Accueil»', 'Home' in de and 'Accueil' in fr and 'Home' not in fr)
    de, fr = schnipsel('lux_sizeguide', '📏 <strong>Erhältlich bis Grösse 43</strong> · asiatisch konfektioniert, fällt eher kleiner aus – grösser? Herrenschuhe ab 44 → 📐 Mass-Tabellen ansehen (cm)')
    ok('Grössenhilfe: übersetzt, Zahlen bleiben', 'taille 43' in fr and 'à partir de 44' in fr and 'Grösse' not in fr)

    print('Test Produktseiten-Bausteine:', 'ALLE OK' if not FEHLER else f'{len(FEHLER)} FEHLER')
    return 0 if not FEHLER else 1


if __name__ == '__main__':
    sys.exit(main())
