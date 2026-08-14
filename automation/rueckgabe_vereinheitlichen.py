# -*- coding: utf-8 -*-
"""
rueckgabe_vereinheitlichen.py — Widersprüche auf den Rückgabe-/Widerrufsseiten beseitigen
=========================================================================================

BEFUND (dropship/FEHLERSUCHE-14-08.md, Abschnitt [seiten])
----------------------------------------------------------
Sieben veröffentlichte Rückgabe-/Widerrufsseiten widersprechen sich bei der
Erstattungsfrist und bei den Rücksendekosten; zwei davon hängen nebeneinander im
Footer. Eine Seite nennt Retouren-Mailadressen auf der aufgegebenen Domain
luxestyle.com.co.

Live nachgezählt am 14.08.2026 (nicht aus dem Export, sondern per Admin-GraphQL über
alle 218 Seiten, davon 132 veröffentlicht). Die Suche lief NICHT über die
Seitentitel, sondern über den Fliesstext nach dem, was die Kundin liest
(«innert/innerhalb/spätestens … Werktagen/Tagen», «Rücksendekosten/Rückversand/
Retourenlabel», «luxestyle.com.co»). Das förderte mehr zutage als die im Befund
genannten sieben:

  Erstattungsfrist, wie sie live nebeneinander stand
    697899483521 rueckgabe .................. «innerhalb von 7 Werktagen» / «innert 7 Werktagen»
    698094092673 rueckgabe-widerruf ......... «innerhalb 5 Werktagen»
    697899942273 garantie ................... «Innerhalb 5-7 Werktage ist alles erledigt»
    699136606593 faq-rueckgabe-umtausch ..... «innert weniger Tage»
    697996345729 widerruf ................... «spätestens 14 Tage nach Eingang»   ← richtig
    698055328129 widerrufsbelehrung ......... «spätestens binnen 14 Tagen»        ← richtig (gesetzlich)
    698055524737 refund-policy-en ........... «within 14 days»                    ← richtig

  Rücksendekosten
    697899483521 rueckgabe .................. verspricht ein Rücksendelabel per E-Mail (innert 24h)
                                              UND sagt in der Tabelle darunter «Gefällt mir nicht → Kunde»
                                              (die Seite widerspricht sich selbst)
    698094092673 rueckgabe-widerruf ......... «Du bekommst innerhalb von 24h ein Rücksendelabel»
    698000998785 widerruf-deutschland ....... «Wir senden dir das Retouren-Label zu»
    698006405505 faq-luxestyle .............. «wir senden Retouren-Label zu»
    697996345729 / 698055328129 / 698055524737 / 699136606593 / 697899942273
                                              ... Kunde trägt die Rücksendung     ← richtig

  Tote Domain (www.luxestyle.com.co löst nicht mehr auf — live geprüft, curl 000)
    698094092673 rueckgabe-widerruf ......... returns@luxestyle.com.co, hello@luxestyle.com.co

WELCHE AUSSAGE IST DIE WAHRE?
-----------------------------
Nicht die Mehrheit entscheidet, sondern der rechtlich bindende Text. Das ist
Seite 698055328129 «Widerrufsbelehrung & Widerrufsformular» — die gesetzliche
Musterbelehrung. Sie sagt wörtlich «Die unmittelbaren Kosten der Rücksendung der
Waren tragen Sie» und «spätestens binnen 14 Tagen». Sie ist in sich stimmig und
darf ohnehin nicht umformuliert werden. Also gilt sie als Mass; alle
Marketing-Seiten werden auf sie ausgerichtet — und nicht umgekehrt.

Kanonische Aussage, die jetzt überall steht:
  1. 30 Tage Rückgaberecht ab Erhalt, ohne Angabe von Gründen (freiwillig, CH).
     EU-Kund:innen zusätzlich das gesetzliche 14-tägige Widerrufsrecht.
  2. Rückgabe per E-Mail an info@luxestyle.ch anmelden; man erhält die
     Retourenadresse und die Anleitung (innert 24 h). Kein Gratis-Label.
  3. Rücksendekosten trägt die Kundin — ausser bei Mangel, Transportschaden oder
     Falschlieferung, dann übernimmt sie der Shop.
  4. Erstattung innert 14 Tagen nach Eingang und Prüfung der Rücksendung auf das
     ursprüngliche Zahlungsmittel; beim gesetzlichen EU-Widerruf zusätzlich die
     Standard-Lieferkosten (so steht es in der Musterbelehrung).
  5. Einzige gültige Kontaktadresse: info@luxestyle.ch.

Warum 14 Tage und nicht die kürzeren 5 oder 7 Werktage: Die Musterbelehrung MUSS
14 Tage nennen, daran ist nicht zu rütteln. Jede kürzere Zusage auf einer
Nachbarseite erzeugt genau den Widerspruch, der nach OR Art. 18 zulasten des
Shops ausgelegt wird. Eine Zahl, die überall gilt, ist mehr wert als eine
schmeichelhaftere, die nur auf einer Seite steht.

FEHLTREFFER AUS DEM PROBELAUF — was BEWUSST NICHT angefasst wird
-----------------------------------------------------------------
* 698055328129 «Widerrufsbelehrung», 698000998785 «Folgen des Widerrufs»: der
  gesetzliche Wortlaut (Musterbelehrung, §312g BGB / Art. 40a-g OR) bleibt Zeichen
  für Zeichen stehen. Angefasst wird dort nur der frei formulierte Service-Satz.
* 697996345729 «widerruf», 698055524737 «refund-policy-en», 699136606593
  «faq-rueckgabe-umtausch» sind bei Frist UND Kosten bereits richtig — an der
  Frist wird nichts geändert. (Bei faq-rueckgabe-umtausch wird nur das vage
  «innert weniger Tage» durch die konkrete Zahl ersetzt, weil «wenige Tage» neben
  «14 Tage» wie ein Widerspruch wirkt.)
* 697899352449 «agb» §3 «Gratis-Versand ab CHF 65» und §5 «10–20 Werktage» sind
  falsch, gehören aber zum Befund [versandaussagen] und einem anderen Lauf.
  Nicht angefasst, sonst kollidieren zwei Reiniger auf derselben Zeile
  (die Lektion vom 11.08.: versand_widerspruch_fix.py schrieb CHF 50 → 65 zurück).
* 697899942273 «garantie»: die Tabelle «Gefällt nicht → DU (CHF 7-15)» ist
  korrekt und bleibt. Nur der Zeitsatz wird geradegezogen.
* «Rücksendelabel» wird NICHT pauschal per Suchen-und-Ersetzen getilgt: auf der
  Seite rueckgabe steht es zweimal in verschiedenen Sätzen mit verschiedenem Sinn
  (Zusendung / Aufgabe bei der Post). Beide Stellen werden einzeln formuliert.
* Die tote Domain luxestyle.com.co steht auch auf agb-luxestyle §1, terms-en §1,
  warum-luxestyle und influencer-partner. Das sind keine Rückgabeseiten, aber es
  ist dieselbe tote Domain in kundensichtbarem Text; sie wird mitkorrigiert und
  unten getrennt ausgewiesen.

QUELLE (Regel 7: wer schreibt das Feld beim NÄCHSTEN Mal?)
----------------------------------------------------------
Diese Seiten sind von Hand angelegt worden (Mai 2026), es gibt keinen Generator
und keinen Importer, der sie nachschreibt — im ganzen Repo greift kein Skript auf
Page-IDs dieser Seiten zu. Es gibt also keine Quelle zu reparieren; der Widerspruch
entstand durch Seiten, die über Monate nebeneinander angelegt und nie abgeglichen
wurden. Der bleibende Schutz ist die Prüfung `--pruefen`, die jederzeit meldet,
wenn irgendeine veröffentlichte Seite wieder eine abweichende Frist oder ein
Gratis-Label verspricht.

AUFRUF
------
  python3 automation/rueckgabe_vereinheitlichen.py            # Probelauf (DRY)
  python3 automation/rueckgabe_vereinheitlichen.py --scharf   # schreibt
  python3 automation/rueckgabe_vereinheitlichen.py --pruefen  # Live-Nachkontrolle
Ledger: dropship/_rueckgabe_vereinheitlicht.txt (Zeile für Zeile, mit flush)
"""
import json
import os
import re
import sys
import urllib.request

TOKEN = open('/tmp/cj_shop_token.txt').read().strip()
API = 'https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json'
LEDGER = os.path.join(os.path.dirname(__file__), '..', 'dropship',
                      '_rueckgabe_vereinheitlicht.txt')

# Die kanonische Frist, als Zeichenkette an genau einer Stelle definiert.
FRIST = 'innert 14 Tagen nach Eingang und Prüfung der Rücksendung'


def gql(query, variables=None):
    """Regel 6: eine gescheiterte Anfrage ist kein Ergebnis — sie wirft."""
    data = json.dumps({'query': query, 'variables': variables or {}}).encode()
    req = urllib.request.Request(API, data=data, headers={
        'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'})
    out = json.loads(urllib.request.urlopen(req, timeout=90).read())
    if 'errors' in out:
        raise RuntimeError(json.dumps(out['errors'])[:500])
    return out['data']


# ---------------------------------------------------------------------------
# Die Ersetzungen. Jede ist ein exakter Textausschnitt aus dem Live-Body, damit
# kein Muster daneben greifen kann. Trifft ein Ausschnitt nicht mehr, meldet das
# Skript ihn als OFFEN statt still weiterzumachen.
# ---------------------------------------------------------------------------
ERSETZUNGEN = {
    # ---- 1. «Rückgabe & Widerruf» (Footer «Rückgabe & Umtausch») -----------
    '697899483521': [
        # Gratis-Label versprochen, in der Tabelle zwei Absätze tiefer widerrufen
        ('<strong>Du erhältst ein Rücksendelabel</strong> per E-Mail (innert 24h)',
         '<strong>Du erhältst die Retourenadresse</strong> und die Anleitung per E-Mail (innert 24h)'),
        ('<strong>Gib das Paket bei der Post auf</strong> mit unserem Rücksendelabel',
         '<strong>Gib das Paket frankiert bei der Post auf</strong> – an die Retourenadresse aus unserer E-Mail'),
        ('<strong>Wir erstatten dir den Kaufpreis</strong> innerhalb von 7 Werktagen auf dein Zahlungsmittel',
         '<strong>Wir erstatten dir den Kaufpreis</strong> ' + FRIST +
         ', auf dein ursprüngliches Zahlungsmittel'),
        ('Nach Eingang der Rücksendung bei uns erstatten wir den Kaufpreis innert '
         '<strong>7 Werktagen</strong> auf dein ursprüngliches Zahlungsmittel.',
         'Nach Eingang und Prüfung der Rücksendung erstatten wir den Kaufpreis innert '
         '<strong>14 Tagen</strong> auf dein ursprüngliches Zahlungsmittel. '
         'Beim gesetzlichen Widerruf nach EU-Recht erstatten wir zusätzlich die '
         'Standard-Lieferkosten.'),
    ],
    # ---- 2. «↩️ Rückgabe & Widerrufsrecht» — tote Domain + 5 Werktage ------
    '698094092673': [
        ('<a href="mailto:returns@luxestyle.com.co">returns@luxestyle.com.co</a>',
         '<a href="mailto:info@luxestyle.ch">info@luxestyle.ch</a>'),
        ('<a href="mailto:hello@luxestyle.com.co">hello@luxestyle.com.co</a>',
         '<a href="mailto:info@luxestyle.ch">info@luxestyle.ch</a>'),
        ('Du bekommst innerhalb von 24h ein Rücksendelabel',
         'Du bekommst innert 24h die Retourenadresse und die Anleitung'),
        ('Erstattung erfolgt innerhalb 5 Werktagen nach Eingang',
         'Erstattung ' + FRIST),
        ('Volle Erstattung des Kaufpreises auf die ursprüngliche Zahlungsmethode. '
         'Versandkosten werden nicht erstattet (ausser bei fehlerhaften Produkten).',
         'Volle Erstattung des Kaufpreises auf die ursprüngliche Zahlungsmethode, ' +
         FRIST + '. Die Kosten der Rücksendung trägst du selbst – ausser bei Mangel, '
         'Transportschaden oder Falschlieferung, dann übernehmen wir sie. Beim '
         'gesetzlichen Widerruf nach EU-Recht erstatten wir zusätzlich die '
         'Standard-Lieferkosten.'),
    ],
    # ---- 3. «Widerrufsbelehrung Deutschland» — Label-Zusage ----------------
    #     Der Absatz «Folgen des Widerrufs» ist gesetzlicher Wortlaut → bleibt.
    '698000998785': [
        ('Wir senden dir das Retouren-Label zu. Bei Mängeln zahlen wir den Rückversand.',
         'Wir senden dir die Retourenadresse und die Anleitung zu. Die unmittelbaren '
         'Kosten der Rücksendung trägst du – ausser bei Mangel, Transportschaden oder '
         'Falschlieferung, dann übernehmen wir sie.'),
    ],
    # ---- 4. FAQ «Rückgabe & Umtausch» — vage Frist konkretisieren ----------
    '699136606593': [
        ('Sobald deine Rücksendung bei uns eingetroffen und geprüft ist, erstatten '
         'wir den Betrag. Wir bearbeiten deine Rückgabe innert weniger Tage.',
         'Sobald deine Rücksendung bei uns eingetroffen und geprüft ist, erstatten '
         'wir den Betrag – ' + FRIST + '.'),
    ],
    # ---- 5. Garantieseite — «5-7 Werktage» --------------------------------
    '697899942273': [
        ('<strong>WIR LÖSEN ES</strong><br>Innerhalb 5-7 Werktage ist alles erledigt.',
         '<strong>WIR LÖSEN ES</strong><br>Ersatz senden wir sofort los; erstattet '
         'wird ' + FRIST + '.'),
    ],
    # ---- 6. FAQ LuxeStyle — Label-Zusage ----------------------------------
    '698006405505': [
        ('<p>Email an info@luxestyle.ch — wir senden Retouren-Label zu.</p>',
         '<p>Email an info@luxestyle.ch — wir senden dir die Retourenadresse zu. '
         'Die Rücksendekosten trägst du bei Widerruf selbst; bei Mangel oder '
         'Falschlieferung übernehmen wir sie. Erstattung ' + FRIST + '.</p>'),
    ],
    # ---- 7. FAQ EN — Währung und Meldefrist an die DE-Seite angleichen ----
    '698055197057': [
        ('For changed mind: YOU pay ($10-15).',
         'For changed mind: YOU pay (CHF 10–15).'),
    ],
    # ---- 8. Refund Policy EN — Meldefrist 48h vs. 7 Tage auf der DE-Seite --
    '698055524737': [
        ('Send a photo within 48h to info@luxestyle.ch.',
         'Send a photo within 7 days to info@luxestyle.ch.'),
    ],
    # ---- 9. Nur der doppelt kodierte Titel (Body ist in Ordnung) -----------
    '697900106113': [],
}

# Tote Domain ausserhalb der Rückgabeseiten (getrennt ausgewiesen)
DOMAIN = {
    '698055360897': [('unseren Online-Shop luxestyle.com.co bei LuxeStyle CH',
                      'unseren Online-Shop luxestyle.ch bei LuxeStyle CH')],
    '698055459201': [('our online shop luxestyle.com.co with LuxeStyle CH',
                      'our online shop luxestyle.ch with LuxeStyle CH')],
    '698029965697': [('✅ luxestyle.com.co', '✅ luxestyle.ch')],
    '698063487361': [('alleng@luxestyle.com.co', 'info@luxestyle.ch'),
                     ('alleng@luxestyle.com.co?subject=Influencer-Bewerbung',
                      'info@luxestyle.ch?subject=Influencer-Bewerbung')],
}

# Doppelt kodierte Seitentitel: gespeichert ist «Rückgabe &amp; Widerruf», Shopify
# kodiert beim Ausliefern erneut → im Tab und im Google-Snippet steht «&amp;».
TITEL = {
    '697899483521': ('Rückgabe &amp; Widerruf', 'Rückgabe & Widerruf'),
    '697900106113': ('Kontakt &amp; Support', 'Kontakt & Support'),
}

Q_PAGE = 'query($id:ID!){page(id:$id){id handle title body isPublished}}'
M_PAGE = ('mutation($id:ID!,$p:PageUpdateInput!){pageUpdate(id:$id,page:$p)'
          '{page{id} userErrors{field message}}}')


def lade(pid):
    return gql(Q_PAGE, {'id': 'gid://shopify/Page/%s' % pid})['page']


def anwenden(scharf):
    ledger = open(LEDGER, 'a', encoding='utf-8') if scharf else None
    geaendert = offen = 0
    for gruppe, name in ((ERSETZUNGEN, 'rueckgabe'), (DOMAIN, 'tote-domain')):
        for pid, paare in gruppe.items():
            seite = lade(pid)
            body = seite['body'] or ''
            neu = body
            treffer, fehlend = [], []
            for alt, ersatz in paare:
                if alt in neu:
                    neu = neu.replace(alt, ersatz)
                    treffer.append(alt[:60])
                elif ersatz in neu:
                    pass  # schon erledigt
                else:
                    fehlend.append(alt[:60])
            felder = {}
            if neu != body:
                felder['body'] = neu
            if pid in TITEL:
                alt, ersatz = TITEL[pid]
                if seite['title'] == alt:
                    felder['title'] = ersatz
            if fehlend:
                offen += 1
                print('  OFFEN  %s %-24s Ausschnitt nicht gefunden: %s'
                      % (pid, seite['handle'], fehlend))
            if not felder:
                print('  ok     %s %-24s nichts zu tun' % (pid, seite['handle']))
                continue
            geaendert += 1
            print('  %s %s %-24s %s' % ('ÄNDERE' if scharf else 'WÜRDE ', pid,
                                        seite['handle'], sorted(felder)))
            if scharf:
                r = gql(M_PAGE, {'id': seite['id'], 'p': felder})
                errs = r['pageUpdate']['userErrors']
                if errs:
                    raise RuntimeError('%s: %s' % (pid, errs))
                ledger.write('%s\t%s\t%s\t%s\n' % (pid, seite['handle'], name,
                                                   ','.join(sorted(felder))))
                ledger.flush()          # Regel 5
                os.fsync(ledger.fileno())
    if ledger:
        ledger.close()
    print('\n  geändert: %d   offen: %d' % (geaendert, offen))


# ---------------------------------------------------------------------------
# Live-Nachkontrolle über ALLE veröffentlichten Seiten, nicht nur über die
# bearbeiteten — sonst prüft man nur die Fehler, die man schon kennt.
# ---------------------------------------------------------------------------
Q_ALLE = ('query($c:String){pages(first:50,after:$c){pageInfo{hasNextPage endCursor}'
          ' nodes{id handle title body isPublished}}}')

VERDAECHTIG = [
    ('Frist != 14 Tage', re.compile(
        r'(erstatt|rückerstatt|refund)[^.<]{0,80}?(\d+)\s*(-\s*\d+\s*)?(werktag|business day)', re.I)),
    ('Gratis-Label', re.compile(
        r'(rücksende-?label|retouren-?label|return label)', re.I)),
    ('tote Domain', re.compile(r'luxestyle\.com\.co', re.I)),
]


def pruefen():
    cursor, seiten = None, []
    while True:
        d = gql(Q_ALLE, {'c': cursor})['pages']
        seiten += d['nodes']
        if not d['pageInfo']['hasNextPage']:
            break
        cursor = d['pageInfo']['endCursor']
    treffer = 0
    for s in seiten:
        if not s['isPublished']:
            continue
        txt = re.sub(r'<[^>]+>', ' ', s['body'] or '')
        for label, pat in VERDAECHTIG:
            m = pat.search(txt)
            if m:
                treffer += 1
                print('  %-16s %s %s :: …%s…' % (
                    label, s['id'].split('/')[-1], s['handle'],
                    txt[max(0, m.start() - 50):m.end() + 50].strip()[:130]))
    print('\n  %d veröffentlichte Seiten geprüft, %d Verdachtsfälle offen'
          % (len([s for s in seiten if s['isPublished']]), treffer))


if __name__ == '__main__':
    if '--pruefen' in sys.argv:
        pruefen()
    else:
        scharf = '--scharf' in sys.argv
        print('=== %s ===' % ('SCHARF' if scharf else 'PROBELAUF (nichts wird geschrieben)'))
        anwenden(scharf)
