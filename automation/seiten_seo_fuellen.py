# -*- coding: utf-8 -*-
"""
seiten_seo_fuellen.py — title_tag und description_tag für die /pages/-Ebene
============================================================================

BEFUND (dropship/FEHLERSUCHE-14-08.md, Abschnitt [seo-technik])
---------------------------------------------------------------
99 von 132 veröffentlichten Shop-Seiten haben weder global.title_tag noch
global.description_tag. Shopify baut das Snippet dann aus dem rohen Seitenanfang:
Wörter kleben aneinander, weil beim Entkernen der HTML-Blöcke kein Leerzeichen
entsteht, Emoji stehen mitten im Satz, und doppelt kodierte Entities erscheinen
als sichtbares «&amp;».

Live am 14.08.2026 nachgezählt (Admin-GraphQL über alle 218 Seiten):
132 veröffentlicht, davon 99 ohne beide Felder — Zahl bestätigt.
Beispiele des Ist-Zustands:
  /pages/agb  → «Allgemeine GeschäftsbedingungenStand: 14. Juni 20261. Geltungsbereich…»
  /pages/rueckgabe → «Rückgabe &amp;amp; Widerruf🔄 30 Tage RückgaberechtDu kannst…»

WAS DIESES SKRIPT TUT
---------------------
Für jede betroffene Seite:
  title_tag        = bereinigter Seitentitel (Emoji weg, Entity einmal aufgelöst)
                     + « | LuxeStyle CH», solange 60 Zeichen nicht überschritten
                     werden; sonst nur der Titel, an der Wortgrenze gekürzt.
  description_tag  = für die 26 Service-, Rechts- und Landingseiten von Hand
                     geschrieben (unten in HAND); für die reinen Ratgeberseiten
                     aus dem Fliesstext gewonnen — aber mit einem Extraktor, der
                     Blöcke einzeln liest und mit «. » verbindet, statt die Tags
                     bloss zu löschen. Genau das Löschen erzeugt die
                     zusammengeklebten Wörter, die der Befund beschreibt.
                     Höchstens 155 Zeichen, an der Wortgrenze gekappt.

BEWUSST NICHT ANGEFASST (Fehltreffer und Grenzfälle aus dem Probelauf)
-----------------------------------------------------------------------
* Sieben veröffentlichte Seiten sind interne Arbeitsblätter, keine Kundenseiten:
  do-it-now, morgen-briefing-23-05, action-center, make-com-fix-guide,
  master-dashboard-v2, tiktok-callback (OAuth-Rückleitung), merkliste (leerer
  Body). Sie bekommen KEIN Snippet. Ein gutes Snippet würde sie in der Suche
  bewerben — und laut Fehlersuche stehen auf mindestens einer davon Zugangsdaten
  im Klartext. Der richtige Umgang ist «unveröffentlichen», nicht «SEO geben»;
  das ist ein anderer Auftrag und wird hier nur gemeldet.
* Seiten, die schon eines der beiden Felder tragen (33 Stück), werden nicht
  überschrieben — Lektion vom 11.08.: «⛔ NIE vorhandene Werte überschreiben»,
  der Probelauf des Kategorie-Skripts zeigte damals 1'208 Verschlechterungen.
* Der SEO-Titel bekommt bewusst KEIN «– LuxeStyle»-Anhängsel, wo Shopify das
  schon selbst anhängt … doch: das Theme hängt « – LuxeStyle» an den
  Seitentitel, nicht an title_tag. Ein gesetztes title_tag ersetzt den ganzen
  Tab-Titel. Darum steht der Shopname hier im Wert drin, sonst verschwindet er.
* Emoji werden nur am ANFANG und am ENDE entfernt, nicht innerhalb des Titels —
  «🇨🇭 Warum LuxeStyle CH?» wird zu «Warum LuxeStyle CH?», aber eine Flagge
  mitten in einem Satz bliebe stehen, statt den Satz zu zerreissen.
  (Im Bestand kommt kein solcher Fall vor; die Regel schützt künftige Läufe.)
* Der Extraktor überspringt einen ersten Block, der bloss den Titel wiederholt —
  sonst begänne jede Beschreibung mit ihrer eigenen Überschrift.

QUELLE (Regel 7)
----------------
Diese Seiten werden nicht von einem Importer geschrieben, sondern von Hand bzw.
von früheren Sessions angelegt. Es gibt keinen Generator, der das Feld beim
nächsten Mal wieder leer liesse. Wer künftig eine Seite anlegt, findet mit
`--fehlend` in einem Aufruf alle veröffentlichten Seiten ohne Snippet.

AUFRUF
------
  python3 automation/seiten_seo_fuellen.py            # Probelauf, zeigt jeden Wert
  python3 automation/seiten_seo_fuellen.py --scharf   # schreibt
  python3 automation/seiten_seo_fuellen.py --fehlend  # Live: wer hat noch kein Snippet?
Ledger: dropship/_seiten_seo_gefuellt.txt (Zeile für Zeile, mit flush)
"""
import html
import json
import os
import re
import sys
import time
import urllib.request

TOKEN = open('/tmp/cj_shop_token.txt').read().strip()
API = 'https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json'
LEDGER = os.path.join(os.path.dirname(__file__), '..', 'dropship',
                      '_seiten_seo_gefuellt.txt')

MAX_TITEL = 60
MAX_BESCHREIBUNG = 155
SUFFIX = ' | LuxeStyle CH'

# Interne Arbeitsblätter und technische Seiten — bekommen bewusst kein Snippet.
NICHT_ANFASSEN = {
    '698019643777',   # do-it-now (INTERN)
    '698055557505',   # morgen-briefing-23-05
    '698059325825',   # action-center
    '698059751809',   # make-com-fix-guide
    '698060996993',   # master-dashboard-v2
    '699202437505',   # tiktok-callback (OAuth-Rückleitung)
    '699965571457',   # merkliste (leerer Body, App-Seite)
}

# Von Hand geschriebene Beschreibungen für Service-, Rechts- und Landingseiten.
# Nur geprüfte Aussagen: 30 Tage Rückgabe, Gratis-Versand ab CHF 50, Lieferung
# nur in die Schweiz (inkl. Liechtenstein), TWINT/Klarna vorhanden.
HAND = {
    '697899352449': 'Allgemeine Geschäftsbedingungen von LuxeStyle CH: Vertragsschluss, Preise, Lieferung, Widerruf und Gewährleistung nach Schweizer Recht — kurz und verständlich.',
    '697899385217': 'Wie LuxeStyle CH deine Daten verarbeitet: Zweck, Speicherdauer, Cookies und deine Rechte nach revDSG und DSGVO. Verantwortlich: LuxeStyle CH, Belp.',
    '697899417985': 'Impressum von LuxeStyle CH: Inhaber, Adresse in Belp, E-Mail und Telefonnummer für Anfragen zum Onlineshop luxestyle.ch.',
    '697899450753': 'Versand und Lieferung in der Schweiz: Kosten, Gratis-Versand ab CHF 50, Lieferzeiten je Lager und Sendungsverfolgung — alles auf einen Blick.',
    '697899483521': 'Rückgabe bei LuxeStyle CH: 30 Tage Rückgaberecht ohne Begründung. Wie du anmeldest, wer die Rücksendung zahlt und wann das Geld zurück ist.',
    '697899549057': 'Wer hinter LuxeStyle CH steckt: ein Schweizer Onlineshop aus Belp mit kuratierten Lifestyle-, Schmuck- und Beauty-Produkten für die ganze Schweiz.',
    '697899909505': 'Welche Cookies luxestyle.ch setzt, wofür sie da sind und wie du deine Einwilligung jederzeit änderst oder widerrufst.',
    '697899942273': 'Die Garantie von LuxeStyle CH: 30 Tage Geld zurück und 12 Monate Herstellergarantie auf Elektronik. Was abgedeckt ist und wer den Rückversand zahlt.',
    '697899975041': 'Grössen-Guide von LuxeStyle CH: Masstabellen für Kleidung, Ringgrössen und Kettenlängen — damit du beim ersten Mal die richtige Grösse triffst.',
    '697900007809': 'Pflegehinweise für Schmuck, Leder und Textilien: So bleiben deine Lieblingsstücke von LuxeStyle CH lange schön.',
    '697900073345': 'Wo ist meine Bestellung? Sendungsverfolgung, typische Lieferzeiten und was zu tun ist, wenn das Paket auf sich warten lässt.',
    '697900106113': 'Kontakt zu LuxeStyle CH: E-Mail an info@luxestyle.ch, Antwort in der Regel innert 24 Stunden. Fragen zu Bestellung, Versand und Rückgabe.',
    '697938641281': '10% Rabatt auf deine erste Bestellung bei LuxeStyle CH: Newsletter abonnieren und Code WELCOME10 im Warenkorb einlösen.',
    '697996345729': '30 Tage Rückgaberecht in der Schweiz und 14 Tage gesetzlicher Widerruf für die EU: Ablauf, Rücksendekosten und Erstattung bei LuxeStyle CH.',
    '698000015745': 'LuxeStyle CH ist online: der Schweizer Shop für kuratierte Lifestyle-, Schmuck- und Beauty-Produkte. Gratis-Versand ab CHF 50, 30 Tage Rückgabe.',
    '698000048513': 'Presseinformation zum Start von LuxeStyle CH — ein Schweizer Onlineshop aus Belp für Lifestyle- und Geschenkideen.',
    '698000114049': 'Die Geschichte hinter LuxeStyle CH: warum aus Belp ein Schweizer Onlineshop für kuratierte Lifestyle-Produkte wurde.',
    '698000867713': 'Versand und Lieferung: Wir liefern innerhalb der Schweiz (inkl. Liechtenstein). Kosten, Lieferzeiten und Gratis-Versand ab CHF 50.',
    '698000998785': 'Widerrufsbelehrung für Verbraucher: 14 Tage gesetzliches Widerrufsrecht, dazu freiwillig 30 Tage Rückgaberecht bei LuxeStyle CH.',
    '698006405505': 'Die häufigsten Fragen an LuxeStyle CH: Lieferzeit, Versandkosten, Zahlungsarten, Rückgabe und Garantie — kurz beantwortet.',
    '698018300289': 'Bezahlen bei LuxeStyle CH: TWINT, Klarna Rechnungskauf, Visa, Mastercard, PayPal und Apple Pay — sicher über Shopify Payments.',
    '698019381633': 'Echte Bewertungen von Kundinnen und Kunden von LuxeStyle CH — gesammelt über Judge.me, ungefiltert und mit Kaufnachweis.',
    '698019938689': '10% Welcome-Bonus: Newsletter von LuxeStyle CH abonnieren und Code WELCOME10 auf die erste Bestellung anwenden.',
    '698029965697': 'Sieben Versprechen von LuxeStyle CH: Schweizer Shop, 30 Tage Rückgabe, Gratis-Versand ab CHF 50, TWINT und Klarna, persönlicher Support.',
    '698054934913': 'Deine Datenschutz-Einstellungen bei LuxeStyle CH: Weitergabe von Daten widersprechen und Einwilligungen jederzeit anpassen.',
    '698055164289': 'The story behind LuxeStyle: a Swiss online shop from Belp with a curated selection of lifestyle, jewellery and beauty products.',
    '698055197057': 'Everything about ordering at LuxeStyle: shipping within Switzerland, payment methods, 30-day money-back guarantee and returns.',
    '698055262593': 'Seven promises from LuxeStyle: Swiss shop, 30-day returns, free shipping over CHF 50, secure payment and personal support.',
    '698055328129': 'Widerrufsbelehrung und Muster-Widerrufsformular von LuxeStyle CH: 14 Tage Widerrufsrecht für die EU, 30 Tage Rückgabe für die Schweiz.',
    '698055360897': 'Allgemeine Geschäftsbedingungen von LuxeStyle CH: Geltungsbereich, Vertragsschluss, Lieferung, Widerruf und die freiwillige 30-Tage-Garantie.',
    '698055393665': "L'histoire derrière LuxeStyle: une boutique en ligne suisse de Belp proposant une sélection de produits lifestyle, bijoux et beauté.",
    '698055426433': 'La storia di LuxeStyle: un negozio online svizzero di Belp con una selezione curata di prodotti lifestyle, gioielli e bellezza.',
    '698055459201': 'Terms and conditions of LuxeStyle CH: scope, contract, delivery, right of withdrawal and the voluntary 30-day money-back guarantee.',
    '698055491969': 'How LuxeStyle CH handles your data: purpose, storage period, cookies and your rights under Swiss revFADP and GDPR.',
    '698055524737': 'Returns at LuxeStyle: 30-day money-back guarantee. How to register a return, who pays return shipping and when you get your refund.',
    '698094092673': '30 Tage Rückgaberecht bei LuxeStyle CH: Rückgabe anmelden, Ware zurücksenden, Erstattung innert 14 Tagen nach Eingang und Prüfung.',
    '698444808577': 'Alle Kategorien von LuxeStyle CH auf einen Blick: Mode, Schmuck, Beauty, Wohnen, Technik und Geschenkideen — mit Lieferung in die Schweiz.',
    '698553336193': 'Alle Links von LuxeStyle CH an einem Ort: Shop, Kategorien, Kontakt und Social Media.',
    '698754531713': 'Geschenkfinder von LuxeStyle CH: In drei Schritten zum passenden Geschenk — nach Anlass, Person und Budget, mit Lieferung in die Schweiz.',
    '698796441985': 'Marken und Kategorien von LuxeStyle CH schnell finden: Schmuck, Uhren, Beauty, Mode, Wohnen und Technik in der Übersicht.',
    '698965459329': 'Frequently asked questions about ordering, shipping, payment and returns at LuxeStyle CH.',
    '698504085889': 'Alle Designs und Sticker von LuxeStyle CH auf einen Blick — Motive zum Selbstgestalten für Shirts, Tassen und mehr.',
    '698060931457': 'Die fünf meistgekauften Produkte bei LuxeStyle CH — was Kundinnen und Kunden gerade am häufigsten bestellen.',
    '698063389057': 'Black Friday bei LuxeStyle CH: Die Deals des Jahres auf Wellness-, Beauty- und Lifestyle-Produkte, mit Lieferung in die Schweiz.',
    '698063487361': 'Influencer- und Partnerprogramm von LuxeStyle CH: Wie die Zusammenarbeit läuft und wie du dich bewirbst.',
    '698063552897': 'Weihnachtsgeschenke von LuxeStyle CH: Wellness- und Lifestyle-Ideen, die wirklich ankommen — mit Lieferung in die Schweiz.',

    # --- Ratgeberseiten, die aus reinen Aufzählungen bestehen -----------------
    # Der Extraktor lieferte hier im Probelauf mitten aus einer Liste heraus
    # («2. Wellness als Geschenk», «10ml Wasser → 3-5 Tropfen»). Diese Seiten
    # haben keinen Einleitungssatz, also ist ein von Hand geschriebener
    # Zweizeiler die einzige ehrliche Lösung.
    '697998508417': 'Was in der Schweiz Herbst und Winter 2026 verschenkt wird: Cozy-Living, Wellness und personalisierte Geschenke — die Trends im Überblick.',
    '697998541185': 'Sieben Wanderungen für 2026 — vom Aletschgletscher bis zum Oeschinensee, je mit Schwierigkeitsgrad und Dauer.',
    '697998606721': 'Fünf Anschaffungen, die eine Männergarderobe 2026 wirklich aufwerten — vom Premium-Wallet bis zur Uhr, mit Preisrahmen und Haltbarkeit.',
    '697998639489': 'Fünf Schweizer Spa-Hotels für ein Wellness-Wochenende 2026 — von Arosa bis Engelberg, mit Preisen pro Nacht.',
    '697998672257': 'Wie viel schenkt man 2026 zur Hochzeit, und was kommt an? Richtwerte nach Verwandtschaftsgrad plus konkrete Geschenkideen.',
    '697998836097': 'So misst du Ring-, Armband- und Kettengrösse richtig aus — mit Massband oder Schnur, plus Masstabelle für Wallets.',
    '697998868865': 'Geschenkkarten von LuxeStyle CH: Wert wählen, sofort per E-Mail erhalten, im Checkout einlösen. Unbegrenzt gültig.',
    '697998901633': 'Zehn Geschenke, die auch am Tag davor noch klappen — von der digitalen Geschenkkarte bis zur fertig verpackten Selfcare-Box.',
    '698004013441': 'Zehn Geschenkideen zum Muttertag 2026, sortiert nach Typ und Budget — mit Lieferung in die ganze Schweiz.',
    '698004046209': 'Sieben Hochzeitsgeschenke jenseits des Couverts — vom Champagner-Set bis zum personalisierten Schmuckstück.',
    '698004078977': 'Erstes Date: Was anziehen, was mitbringen und was besser nicht. Ein kurzer Leitfaden mit konkreten Empfehlungen.',
    '698004177281': 'Was «vegan» in der Kosmetik wirklich bedeutet — und sieben Produkte ohne tierische Inhaltsstoffe und ohne Tierversuche.',
    '698005750145': 'Adventskalender 2026 im Vergleich: Was in Drogerie-Kalendern steckt, was Premium-Kalender bieten und wann du bestellen solltest.',
    '698005848449': 'Edelstahlschmuck richtig pflegen: Wann du ihn abnimmst, wie du ihn reinigst und warum er nicht anläuft — in wenigen Regeln.',
    # «Preis» stand im ersten Entwurf, kommt auf der Seite aber gar nicht vor —
    # ersetzt durch das, was dort tatsächlich verglichen wird.
    '698006208897': 'Schweizer Onlineshop oder deutsche Marke? Wo die Unterschiede bei Qualität, Service und Rückgabe wirklich liegen.',
    '698006307201': 'Welcher Duft im Aroma-Diffuser was bewirkt — plus die richtige Dosierung und wie du das Gerät sauber hältst.',
    '697998573953': 'Eine vollständige Beauty-Routine in zehn Minuten: fünf Minuten morgens, fünf abends — Schritt für Schritt erklärt.',
}


def gql(query, variables=None):
    """
    Regel 6: eine gescheiterte Anfrage ist kein Ergebnis. Bei THROTTLED wird
    gewartet und erneut gefragt (Shopify drosselt bei vielen Seiten zuverlässig);
    jeder andere Fehler wirft, damit nichts Halbfertiges ins Ledger gerät.
    """
    data = json.dumps({'query': query, 'variables': variables or {}}).encode()
    for versuch in range(6):
        req = urllib.request.Request(API, data=data, headers={
            'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'})
        out = json.loads(urllib.request.urlopen(req, timeout=90).read())
        if 'errors' not in out:
            return out['data']
        codes = [e.get('extensions', {}).get('code') for e in out['errors']]
        if 'THROTTLED' in codes and versuch < 5:
            time.sleep(4 * (versuch + 1))
            continue
        raise RuntimeError(json.dumps(out['errors'])[:500])
    raise RuntimeError('THROTTLED: nach 6 Versuchen keine Antwort')


EMOJI = re.compile(
    '[\U0001F000-\U0001FAFF←-⇿⌀-➿️‍⬀-⯿]+')
BLOCK = re.compile(r'</(?:h[1-6]|p|li|div|tr|td|th|blockquote|ul|ol|table)>|<br\s*/?>',
                   re.I)


def entkerne(text):
    """Entities zweimal auflösen — im Bestand liegen doppelt kodierte Werte."""
    for _ in range(2):
        neu = html.unescape(text)
        if neu == text:
            break
        text = neu
    return text


def saeubere_titel(titel):
    t = entkerne(titel or '')
    t = EMOJI.sub(' ', t) if EMOJI.match(t.strip()) else t
    # Emoji nur am Rand entfernen, nie mitten im Satz
    t = re.sub(r'^\s*(?:%s\s*)+' % EMOJI.pattern, '', t)
    t = re.sub(r'(?:\s*%s)+\s*$' % EMOJI.pattern, '', t)
    return re.sub(r'\s+', ' ', t).strip(' -–—·|')


def kappe(text, grenze):
    """
    Erst an der letzten Satzgrenze kürzen, sonst an der Wortgrenze — nie mitten
    im Wort. Ein Snippet, das mitten im Satz endet, sieht abgeschnitten aus.
    """
    text = text.strip()
    if len(text) <= grenze:
        return text
    kopf = text[:grenze]
    satzende = max(kopf.rfind('. '), kopf.rfind('! '), kopf.rfind('? '))
    if satzende >= 60:
        return kopf[:satzende + 1]
    return kopf.rsplit(' ', 1)[0].rstrip(' ,;:–-')


# Blöcke, die kein Snippet-Anfang sein dürfen: Lesezeit-Angaben, Datumszeilen,
# «Stand: …» und Ähnliches. Sie stehen im Bestand als erster Absatz und würden
# jede Beschreibung mit einer Nebensache eröffnen.
BEIWERK = re.compile(
    r'^(lesezeit|stand|last updated|zuletzt aktualisiert|inhalt|weiterlesen)\b'
    r'|^\d+\s*(min|minuten)\b', re.I)


def bloecke(body):
    """
    Der Kern: Blöcke EINZELN lesen und mit «. » verbinden.
    Werden die Tags bloss gelöscht, entsteht «GeschäftsbedingungenStand:» —
    genau der Befund. Hier bekommt jeder Block seine eigene Satzgrenze.
    """
    t = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', body or '', flags=re.S | re.I)
    t = BLOCK.sub('\n', t)
    t = re.sub(r'<[^>]+>', ' ', t)
    t = entkerne(t)
    raus = []
    for zeile in t.split('\n'):
        z = re.sub(r'\s+', ' ', zeile).strip()
        z = re.sub(r'^\s*(?:%s\s*)+' % EMOJI.pattern, '', z).strip()
        if len(z) < 3:
            continue
        raus.append(z)
    return raus


def baue_beschreibung(seite):
    pid = seite['id'].split('/')[-1]
    if pid in HAND:
        return HAND[pid], 'hand'
    titel = saeubere_titel(seite['title'])
    teile = bloecke(seite['body'])
    # Ersten Block überspringen, wenn er nur die Überschrift wiederholt
    if teile and teile[0].lower().rstrip('.!?') == titel.lower().rstrip('.!?'):
        teile = teile[1:]
    satz = ''
    for t in teile:
        if not re.search(r'[a-zäöüéèà]', t):      # reine Zahlen-/Symbolzeilen weg
            continue
        if BEIWERK.match(t):
            continue
        # Tabellenzellen und Stichwortzeilen taugen nicht als Fliesstext.
        # Der erste Block muss ein richtiger Satz sein; danach genügt weniger.
        woerter = len(t.split())
        # Der ERSTE Block muss ein echter Satz sein, nicht der erste Punkt einer
        # Aufzählung. Ohne diese Schwelle begann das Snippet von
        # /pages/hochzeitsgeschenke-unter-100 mit «1. 🥂 Champagner-Gläser
        # Kristall (CHF 44.90).» und das von /pages/reise-packliste-1-woche mit
        # «5 Oberteile (3 Casual, 2 Smart).» — beides im Probelauf gesehen.
        if not satz and (woerter < 8 or len(t) < 45):
            continue
        if woerter < 3:
            continue
        satz = (satz + ' ' + t).strip() if satz else t
        if not satz.endswith(('.', '!', '?', ':')):
            satz += '.'
        if len(satz) >= 110:
            break
    if len(satz) < 50:
        # Auffangnetz für Seiten, die nur aus Stichwortlisten bestehen: lieber
        # eine ehrliche, allgemeine Zeile als ein zufälliger Aufzählungspunkt.
        # Nur geprüfte Aussagen (Gratis-Versand ab CHF 50, 30 Tage Rückgabe).
        rumpf = titel.rstrip('.!?')
        return kappe('%s – der Ratgeber von LuxeStyle CH. Gratis-Versand ab '
                     'CHF 50, 30 Tage Rückgabe.' % rumpf, MAX_BESCHREIBUNG), 'titel'
    return kappe(satz, MAX_BESCHREIBUNG), 'text'


def baue_titel(seite):
    """
    Passt der volle Titel nicht mit Shopname, wird NICHT stumpf abgeschnitten
    («… Warum dein Wallet 2026 unbedingt»), sondern zuerst der Untertitel hinter
    dem Gedankenstrich oder Doppelpunkt weggelassen. Erst wenn auch das nicht
    reicht, wird an der Wortgrenze gekappt.
    """
    t = saeubere_titel(seite['title'])
    # Trägt der Titel den Shopnamen schon, wird er nicht ein zweites Mal
    # angehängt («Influencer & Partner — LuxeStyle CH | LuxeStyle CH»).
    if 'luxestyle' in t.lower():
        return kappe(t, MAX_TITEL)
    if len(t) + len(SUFFIX) <= MAX_TITEL:
        return t + SUFFIX
    kopf = re.split(r'\s+[–—-]\s+|(?<=\?)\s+|:\s+', t, maxsplit=1)[0].strip(' ,;:–-')
    if 12 <= len(kopf) and len(kopf) + len(SUFFIX) <= MAX_TITEL:
        return kopf + SUFFIX
    if len(t) <= MAX_TITEL:
        return t
    return kappe(kopf if 12 <= len(kopf) <= MAX_TITEL else t, MAX_TITEL)


Q_ALLE = ('query($c:String){pages(first:50,after:$c){pageInfo{hasNextPage endCursor}'
          ' nodes{id handle title body isPublished'
          ' t:metafield(namespace:"global",key:"title_tag"){value}'
          ' d:metafield(namespace:"global",key:"description_tag"){value}}}}')

M_SET = ('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m)'
         '{userErrors{field message}}}')


def alle_seiten():
    cursor, out = None, []
    while True:
        d = gql(Q_ALLE, {'c': cursor})['pages']
        out += d['nodes']
        if not d['pageInfo']['hasNextPage']:
            break
        cursor = d['pageInfo']['endCursor']
    return out


def lauf(scharf):
    seiten = alle_seiten()
    pub = [s for s in seiten if s['isPublished']]
    kandidaten = [s for s in pub if not s['t'] and not s['d']]
    print('%d Seiten gesamt, %d veröffentlicht, %d ohne beide SEO-Felder\n'
          % (len(seiten), len(pub), len(kandidaten)))
    ledger = open(LEDGER, 'a', encoding='utf-8') if scharf else None
    gesetzt = uebersprungen = duenn = 0
    for s in kandidaten:
        pid = s['id'].split('/')[-1]
        if pid in NICHT_ANFASSEN:
            uebersprungen += 1
            print('  ÜBERSPRUNGEN  %s %-28s (interne/technische Seite)'
                  % (pid, s['handle']))
            continue
        besch, quelle = baue_beschreibung(s)
        if not besch:
            duenn += 1
            print('  ZU DÜNN       %s %-28s kein brauchbarer Text' % (pid, s['handle']))
            continue
        tit = baue_titel(s)
        gesetzt += 1
        print('  %s %s %-28s [%s]\n      T(%2d): %s\n      D(%3d): %s'
              % ('SETZE ' if scharf else 'WÜRDE ', pid, s['handle'], quelle,
                 len(tit), tit, len(besch), besch))
        if scharf:
            r = gql(M_SET, {'m': [
                {'ownerId': s['id'], 'namespace': 'global', 'key': 'title_tag',
                 'type': 'single_line_text_field', 'value': tit},
                {'ownerId': s['id'], 'namespace': 'global', 'key': 'description_tag',
                 'type': 'multi_line_text_field', 'value': besch}]})
            errs = r['metafieldsSet']['userErrors']
            if errs:
                raise RuntimeError('%s: %s' % (pid, errs))
            ledger.write('%s\t%s\t%s\n' % (pid, s['handle'], quelle))
            ledger.flush()          # Regel 5
            os.fsync(ledger.fileno())
    if ledger:
        ledger.close()
    print('\n  gesetzt: %d   bewusst übersprungen: %d   zu dünn: %d'
          % (gesetzt, uebersprungen, duenn))


def fehlend():
    pub = [s for s in alle_seiten() if s['isPublished']]
    offen = [s for s in pub if not s['t'] or not s['d']]
    for s in offen:
        print('  %s %-30s title:%s desc:%s' % (
            s['id'].split('/')[-1], s['handle'],
            'ja' if s['t'] else 'NEIN', 'ja' if s['d'] else 'NEIN'))
    print('\n  %d von %d veröffentlichten Seiten ohne vollständiges Snippet'
          % (len(offen), len(pub)))


if __name__ == '__main__':
    if '--fehlend' in sys.argv:
        fehlend()
    else:
        scharf = '--scharf' in sys.argv
        print('=== %s ===\n' % ('SCHARF' if scharf else
                                'PROBELAUF (nichts wird geschrieben)'))
        lauf(scharf)
