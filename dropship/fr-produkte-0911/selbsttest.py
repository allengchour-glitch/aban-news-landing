"""Selbsttest der Produktübersetzung (ohne Netz, ohne Schlüssel): reine Logik, Übersetzungsspeicher, Vorlagen, Prüfung, Ablauf mit Attrappe."""
import copy
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import fr_produkte as P  # noqa: E402
import llm  # noqa: E402

FEHLER = []


def ok(name, bed):
    print(('  ok   ' if bed else '  FAIL ') + name)
    if not bed:
        FEHLER.append(name)


def wirft(f, *a):
    try:
        f(*a)
    except (ValueError, RuntimeError):
        return True
    return False


DE_BODY = ('<!-- ls-text-v2 --><p>Diese Lampe ist <strong>sehr hell</strong> und misst 110 x 110 mm.</p><!-- /ls-text-v2 -->'
           '<div class="ls-produktdetails"><h4>Produktdetails</h4><ul><li><strong>Material:</strong> Kunststoff</li></ul></div>'
           '<p><strong>🛍️ Das könnte dir auch gefallen:</strong> <a href="/collections/wohnen-dekoration">Wohnen &amp; Deko</a>'
           ' · <a href="/collections/beleuchtung">Beleuchtung</a></p>')
FR_TEXTE = {
    'Diese Lampe ist <strong>sehr hell</strong> und misst 110 x 110 mm.': 'Cette lampe est <strong>très lumineuse</strong> et mesure 110 x 110 mm.',
    'Produktdetails': 'Détails du produit',
    '<strong>Material:</strong> Kunststoff': '<strong>Matière :</strong> plastique',
    'Lampe': 'Lampe',
}
TITEL_FR = {'wohnen-dekoration': ('Wohnen & Deko', 'Maison & Déco'), 'beleuchtung': ('Beleuchtung', 'Éclairage')}


class Attrappe:
    """Ersetzt llm.aufruf: übersetzt nach FR_TEXTE, zählt Aufrufe, kann kaputte Antworten liefern."""
    def __init__(self, kaputt=0, wie='ziffer'):
        self.aufrufe, self.kaputt, self.wie, self.gesehen = 0, kaputt, wie, []

    def __call__(self, eintraege, kontext='', **kw):
        self.aufrufe += 1
        self.gesehen.append(list(eintraege))
        erg = []
        for e in eintraege:
            fr = {'LED Lampe 3W': 'Lampe LED 3 W', 'Beleuchtung': 'Éclairage', 'Ausführung': 'Version', 'Schwarz': 'Noir',
                  'LED Lampe 3W | LuxeStyle CH': 'x'}.get(e) or FR_TEXTE.get(e) or 'Texte de test'
            erg.append(fr)
        if self.kaputt and self.aufrufe <= self.kaputt:
            if self.wie == 'ziffer':
                erg = [x.replace('110', '111') for x in erg]
            elif self.wie == 'deutsch':
                erg = [x + ' und mehr' for x in erg]
        return erg, {'ein': 100, 'aus': 50, 'denk': 0}


def laufen():
    print('Selbsttest Produktübersetzung')
    # --- reine Logik
    ok('nachbearbeiten setzt /fr vor interne Links', P.nachbearbeiten('<a href="/collections/x">A</a>') == '<a href="/fr/collections/x">A</a>')
    ok('nachbearbeiten verdoppelt /fr nicht', P.nachbearbeiten('<a href="/fr/collections/x">A</a>') == '<a href="/fr/collections/x">A</a>')
    ok('nachbearbeiten lässt externe Links', P.nachbearbeiten('<a href="https://x.ch/collections/y">A</a>') == '<a href="https://x.ch/collections/y">A</a>')
    ok('nachbearbeiten macht nacktes & zu &amp; und lässt Entities', P.nachbearbeiten('A & B &amp; C &eacute; D') == 'A &amp; B &amp; C &eacute; D')
    ok('klartext löst Entities auf und maskiert nichts', P.klartext('A &amp; B &quot;C&quot; d&#39;e &lt;3') == 'A & B "C" d\'e <3')
    ok('klartext löst nur eine Ebene auf', P.klartext('&amp;lt;') == '&lt;' and P.klartext('Cuisine & Bar') == 'Cuisine & Bar')
    ok('html_form ist das Gegenstück (nacktes & → &amp;, Entities bleiben)', P.html_form('Cuisine & Bar') == 'Cuisine &amp; Bar' and P.html_form('A &amp; B') == 'A &amp; B')
    ok('Umbrüche: fremde <br> werden zu Leerzeichen, wenn die Quelle keins hat', P.umbrueche_wie_quelle('Inhalt: - A - B', 'Contenu :<br>- A<br><br>- B') == 'Contenu : - A - B')
    ok('Umbrüche: <br> der Quelle bleiben unberührt', P.umbrueche_wie_quelle('A<br>B', 'a<br>b') == 'a<br>b')
    f_, e_ = P.plan_felder({'title': 'Lampe', 'product_type': 'Sport & Outdoor', 'meta_title': 'M'},
                           {'title': 'Lampe DE', 'product_type': 'Sport & Outdoor', 'meta_title': 'M'},
                           {'title': 'd', 'product_type': 'd', 'meta_title': 'd'}, {'product_type', 'meta_title'})
    ok('Plan: abweichende Felder werden geschrieben, gleiche mit altem Eintrag entfernt', f_ == {'title': 'Lampe'} and sorted(e_) == ['meta_title', 'product_type'])
    f_, e_ = P.plan_felder({'product_type': 'Sport & Outdoor'}, {'product_type': 'Sport & Outdoor'}, {'product_type': 'd'}, set())
    ok('Plan: gleich dem Quelltext und noch ohne Übersetzung → nichts zu tun', f_ == {} and e_ == [])
    ok('Ziffern: gleiche Reihenfolge egal, Änderung wird gesehen', P.ziffern('<b>3</b> x 4') == P.ziffern('4 x 3') and P.ziffern('3 x 4') != P.ziffern('3 x 5'))
    ok('Meta-Titel-Vorlage', P.meta_titel_fr('Lampe | LuxeStyle CH', 'Lampe FR') == 'Lampe FR | LuxeStyle CH')
    ok('Meta-Titel ohne Vorlage → None', P.meta_titel_fr('Etwas anderes', 'x') is None)
    de_b = 'Lampe bei LuxeStyle – Schweizer Online-Shop. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. Jetzt –10% mit Code WELCOME10.'
    fr_b = P.meta_beschr_fr(de_b, 'Lampe FR')
    ok('Meta-Beschreibung-Vorlage übersetzt, Zahlen gleich', fr_b is not None and P.ziffern(fr_b) == P.ziffern(de_b) and fr_b.startswith('Lampe FR chez LuxeStyle'))
    ok('Meta-Beschreibung mit anderem Text → None', P.meta_beschr_fr('Eigener Text', 'x') is None)
    lauf = '<strong>🛍️ Das könnte dir auch gefallen:</strong> <a href="/collections/wohnen-dekoration">Wohnen &amp; Deko</a> · <a href="/collections/beleuchtung">Beleuchtung</a>'
    v = P.verwandt_fr(lauf, TITEL_FR)
    ok('Verwandt-Block: Etikett und Linktexte aus den Sammlungstiteln, Hrefs gleich',
       v is not None and 'Cela pourrait aussi vous plaire :' in v and '>Maison &amp; Déco</a>' in v and '>Éclairage</a>' in v and v.count('href="/collections/') == 2)
    ok('Verwandt-Block mit unbekanntem Handle → None (geht an Gemini)', P.verwandt_fr(lauf, {'wohnen-dekoration': ('Wohnen & Deko', 'x')}) is None)
    ok('Verwandt-Block: Linktext weicht vom deutschen Sammlungstitel ab → None', P.verwandt_fr(lauf, {'wohnen-dekoration': ('Anderer Titel', 'x'), 'beleuchtung': ('Beleuchtung', 'y')}) is None)
    ok('Grossschreibung: Etikett wird gross', P.anfang_gross('Farbe', 'couleur') == 'Couleur' and P.anfang_gross('<strong>Masse:</strong> 5', '<strong>dimensions :</strong> 5') == '<strong>Dimensions :</strong> 5')
    ok('Grossschreibung: Emoji, Entity und schon gross bleiben', P.anfang_gross('🔒 Kauf', '🔒 achat') == '🔒 Achat' and P.anfang_gross('Ärmel', 'Manches') == 'Manches' and P.anfang_gross('&amp; Ding', '&amp; chose') == '&amp; Chose')
    ok('Nachbessern: «30 jours retour»', P.nachbearbeiten('🔄 30 jours retour') == '🔄 30 jours de retour')
    ok('anderer Lauf ist kein Verwandt-Block', P.verwandt_fr('Etwas', TITEL_FR) is None)
    # --- Einzelprüfung
    ok('Einzelprüfung: in Ordnung', P.einzelpruefung('Misst 110 x 110 mm', 'Mesure 110 x 110 mm') == [])
    ok('Einzelprüfung: Ziffer geändert', 'Ziffern weichen ab' in P.einzelpruefung('Misst 110 mm', 'Mesure 111 mm'))
    ok('Einzelprüfung: Tag verloren', 'Tags weichen ab' in P.einzelpruefung('<strong>A</strong> b', 'A b'))
    ok('Einzelprüfung: Link-Ziel geändert', 'Tags weichen ab' in P.einzelpruefung('<a href="/products/x">A</a>', '<a href="/fr/products/y">A</a>'))
    ok('Einzelprüfung: deutscher Rest', 'deutscher Rest' in P.einzelpruefung('Das ist gut und schön', 'Ceci est bon und mehr'))
    ok('Einzelprüfung: leer', 'leer' in P.einzelpruefung('Text', '  '))
    ok('Standard-Option wird erkannt', P.standard_option('Title', ['Default Title']) and not P.standard_option('Farbe', ['Default Title']))

    # --- Teilen bei Zählfehlern
    echt_l = llm.aufruf
    try:
        aufrufe = []

        def spinnt(texte, kontext='', **kw):
            aufrufe.append(len(texte))
            if len(texte) > 2:
                raise RuntimeError('Zählfehler')
            return [t.upper() for t in texte], {'ein': 1, 'aus': 1, 'denk': 0}
        llm.aufruf = spinnt
        nu_ = {}
        erg_ = P.gemini_geteilt(['a', 'b', 'c', 'd', 'e'], 'k', nu_)
        ok('Teilen: fünf Einträge werden halbiert, Reihenfolge bleibt', erg_ == ['A', 'B', 'C', 'D', 'E'] and aufrufe[0] == 5 and nu_['aufrufe'] == 3)

        def immer_kaputt(texte, kontext='', **kw):
            raise RuntimeError('kaputt')
        llm.aufruf = immer_kaputt
        ok('Teilen: ein einzelner Eintrag ohne Erfolg wirft', wirft(P.gemini_geteilt, ['x'], 'k', {}))
    finally:
        llm.aufruf = echt_l

    # --- Stapel-Schreiben: Aliase und Variablen
    erfasst = []

    class FalschShop:
        @staticmethod
        def gql(shop, tok, q, var=None):
            erfasst.append((q, var))
            return {f'a{j}': {'userErrors': []} for j in range(q.count('translationsRegister('))}
    echt_s = P.S
    P.S = FalschShop
    try:
        auftr = [(f'gid://shopify/Product/{i}', {'title': f'T{i}'}, {'title': f'd{i}'}) for i in range(31)]
        P.stapel_schreiben('s', 't', auftr, groesse=15)
        ok('Stapel: 31 Aufträge in 3 Pakete (15, 15, 1)', len(erfasst) == 3 and erfasst[0][0].count('translationsRegister(') == 15 and erfasst[2][0].count('translationsRegister(') == 1)
        ok('Stapel: Variablen und Digests je Alias', erfasst[0][1]['id3'] == 'gid://shopify/Product/3' and erfasst[0][1]['tr3'][0]['translatableContentDigest'] == 'd3'
           and erfasst[0][1]['tr3'][0]['locale'] == 'fr')

        class MitFehler(FalschShop):
            @staticmethod
            def gql(shop, tok, q, var=None):
                return {'a0': {'userErrors': [{'field': ['x'], 'message': 'kaputt', 'code': 'INVALID'}]}}
        P.S = MitFehler
        ok('Stapel: userErrors werden zum Fehler', wirft(P.stapel_schreiben, 's', 't', auftr[:1]))
    finally:
        P.S = echt_s

    # --- Ablauf mit Attrappe
    echt = llm.aufruf
    try:
        inhalt = {'title': 'LED Lampe 3W', 'body_html': DE_BODY, 'product_type': 'Beleuchtung',
                  'meta_title': 'LED Lampe 3W | LuxeStyle CH',
                  'meta_description': 'LED Lampe 3W bei LuxeStyle – Schweizer Online-Shop. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. Jetzt –10% mit Code WELCOME10.'}
        optionen = [('Ausführung', ['Schwarz']), ('Title', ['Default Title'])]
        a = Attrappe()
        llm.aufruf = a
        nutzung, tm = {}, {}
        fr, fr_opt, neu = P.produkt_uebersetzen(inhalt, optionen, tm, TITEL_FR, nutzung)
        ok('Ablauf: Titel, Typ und Meta', fr['title'] == 'Lampe LED 3 W' and fr['product_type'] == 'Éclairage'
           and fr['meta_title'] == 'Lampe LED 3 W | LuxeStyle CH' and fr['meta_description'].startswith('Lampe LED 3 W chez LuxeStyle'))
        ok('Ablauf: Gerüst bleibt, Text französisch', fr['body_html'].count('<!-- ls-text-v2 -->') == 1 and 'très lumineuse' in fr['body_html']
           and '<div class="ls-produktdetails">' in fr['body_html'])
        ok('Ablauf: Verwandt-Block aus Sammlungstiteln mit /fr-Links', 'href="/fr/collections/wohnen-dekoration">Maison &amp; Déco</a>' in fr['body_html'])
        ok('Ablauf: Optionen (fester Name, Wert, Standard-Option unverändert)', fr_opt == [('Version', ['Noir']), ('Title', ['Default Title'])])
        ok('Ablauf: Gemini bekam den Verwandt-Block nicht', not any('Das könnte dir' in e for liste in a.gesehen for e in liste))
        ok('Ablauf: ein einziger Aufruf', a.aufrufe == 1 and nutzung['aufrufe'] == 1 and nutzung['ein'] == 100)
        ok('Ablauf: Übersetzungsspeicher lernt kurze Läufe', 'Produktdetails' in neu and neu['Produktdetails'] == 'Détails du produit')
        # Übersetzungsspeicher wird genutzt
        a2 = Attrappe()
        llm.aufruf = a2
        tm2 = dict(neu)
        P.produkt_uebersetzen(inhalt, optionen, tm2, TITEL_FR, {})
        ok('Speicher: bekannte Läufe gehen nicht mehr an Gemini', not any('Produktdetails' == e for liste in a2.gesehen for e in liste))
        # fehlerhafte Antwort: Ziffer geändert → Wiederholung
        a3 = Attrappe(kaputt=1, wie='ziffer')
        llm.aufruf = a3
        fr3, _, _ = P.produkt_uebersetzen(inhalt, optionen, {}, TITEL_FR, {})
        ok('Prüfung: geänderte Ziffer löst eine Wiederholung aus und wird korrigiert', a3.aufrufe == 2 and '110 x 110' in fr3['body_html'])
        a4 = Attrappe(kaputt=9, wie='ziffer')
        llm.aufruf = a4
        ok('Prüfung: dauerhaft falsche Ziffer bricht das Produkt ab', wirft(P.produkt_uebersetzen, inhalt, optionen, {}, TITEL_FR, {}))
        a5 = Attrappe(kaputt=9, wie='deutsch')
        llm.aufruf = a5
        ok('Prüfung: deutscher Rest bricht das Produkt ab', wirft(P.produkt_uebersetzen, inhalt, optionen, {}, TITEL_FR, {}))
        # Beschreibung ohne Text
        leer = copy.deepcopy(inhalt)
        leer['body_html'] = ''
        llm.aufruf = Attrappe()
        fr6, _, _ = P.produkt_uebersetzen(leer, [], {}, TITEL_FR, {})
        ok('leere Beschreibung wird nicht erfunden', fr6['body_html'] == '')
        # Klartextfelder (Titel, Typ, Optionen, Meta) bekommen kein &amp; (im <title> würde es doppelt maskiert), Läufe in der Beschreibung schon
        inh_u = {'title': 'Tisch & Stuhl', 'body_html': '<p>Tisch &amp; Stuhl aus Holz.</p>', 'product_type': 'Haus & Garten',
                 'meta_title': 'Tisch & Stuhl | LuxeStyle CH', 'meta_description': ''}

        def uebers_und(eintraege, kontext='', **kw):
            m = {'Tisch & Stuhl': 'Table &amp; chaise', 'Haus & Garten': 'Maison & Jardin', 'Rot & Blau': 'Rouge & bleu',
                 'Tisch &amp; Stuhl aus Holz.': 'Table & chaise en bois.', 'Farbe & Form': 'Couleur &amp; forme'}
            return [m.get(e, 'x') for e in eintraege], {'ein': 1, 'aus': 1, 'denk': 0}
        llm.aufruf = uebers_und
        fr_u, opt_u, neu_u = P.produkt_uebersetzen(inh_u, [('Farbe & Form', ['Rot & Blau'])], {}, TITEL_FR, {})
        ok('Klartext: Titel, Typ, Meta ohne &amp;', fr_u['title'] == 'Table & chaise' and fr_u['product_type'] == 'Maison & Jardin'
           and fr_u['meta_title'] == 'Table & chaise | LuxeStyle CH')
        ok('Klartext: Optionsname und -wert ohne &amp;', opt_u == [('Couleur & forme', ['Rouge & bleu'])])
        ok('Klartext: Lauf der Beschreibung bleibt HTML (&amp;)', fr_u['body_html'] == '<p>Table &amp; chaise en bois.</p>')
        ok('Klartext: Übersetzungsspeicher führt HTML-Form', neu_u.get('Rot & Blau') == 'Rouge &amp; bleu' and neu_u.get('Haus & Garten') == 'Maison &amp; Jardin')
        # Speicher in HTML-Form: Klartextfeld bekommt &, Lauf bekommt &amp;
        inh_t = {'title': 'Rot & Blau', 'body_html': '<p>Rot & Blau</p>', 'product_type': '', 'meta_title': '', 'meta_description': ''}
        llm.aufruf = Attrappe()
        fr_t, opt_t, _ = P.produkt_uebersetzen(inh_t, [('Farbe', ['Rot & Blau'])], {'Rot & Blau': 'Rouge &amp; bleu'}, TITEL_FR, {})
        ok('Speicher: Klartextfeld aufgelöst, Lauf bleibt HTML', fr_t['title'] == 'Rouge & bleu' and opt_t == [('Couleur', ['Rouge & bleu'])]
           and fr_t['body_html'] == '<p>Rouge &amp; bleu</p>')
        # Gemini setzt <br> vor Aufzählungsstriche (Quelle: reiner Text): wird zu Leerzeichen, das Produkt geht durch die Prüfung
        inh_b = {'title': 'Figur', 'body_html': '<p>Inhalt: - Figur mit Helm</p>', 'product_type': '', 'meta_title': '', 'meta_description': ''}

        def uebers_br(eintraege, kontext='', **kw):
            m = {'Figur': 'Figurine', 'Inhalt: - Figur mit Helm': 'Contenu :<br><br>- Figurine avec casque'}
            return [m.get(e, 'x') for e in eintraege], {'ein': 1, 'aus': 1, 'denk': 0}
        llm.aufruf = uebers_br
        fr_b, _, _ = P.produkt_uebersetzen(inh_b, [], {}, TITEL_FR, {})
        ok('Umbrüche: Produkt mit eingefügten <br> geht durch die Prüfung', fr_b['body_html'] == '<p>Contenu : - Figurine avec casque</p>')
    finally:
        llm.aufruf = echt
    print('Selbsttest:', 'ALLE OK' if not FEHLER else f'{len(FEHLER)} FEHLER')
    return 0 if not FEHLER else 1
