#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
laserpointer_guard.py — Laserpointer aus dem Verkauf nehmen (V-NISSG, SR 814.711)
=================================================================================

BEFUND (dropship/FEHLERSUCHE-14-08.md, Abschnitt [jugendschutz], Stand 12.08.):
  «11 Laserpointer live im Shop». Die V-NISSG erlaubt in der Schweiz seit 1.6.2021
  nur noch Laserpointer der Klasse 1; Einfuhr, ANBIETEN, Abgabe und Besitz aller
  übrigen Klassen sind verboten. BAG und die kantonalen Waffenbüros zählen die
  handgeführten Katzen-/Tierlaser ausdrücklich dazu. Kein einziger Artikel nennt
  eine Laserklasse, eine Leistung in mW oder eine Augenwarnung.

ZAHL LIVE (14.08., nicht 11): 19.
  Der Schnappschuss vom 12.08. ist überholt — der CJ-Grind hat seither weitere
  Katzenlaser importiert (15496431403393, 15496431534465, 15496506835329,
  15497149448577, 15497437970817, 15497439576449, 15497453732225, 15497454092673,
  15497454223745 sind alle NACH dem Export entstanden). Ein Bestandslauf allein
  repariert deshalb nichts dauerhaft → siehe ABSCHNITT «QUELLE» unten.

SUCHWEG (nicht nach den eigenen Klassennamen suchen):
  1. Live-Titelsuche  title:*laser* AND status:active  → 53 Treffer
  2. Live-Volltextsuche  "laser" AND status:active     → 87 Treffer
     Der Volltext fand GENAU EIN Produkt, das im Text einen Laserpunkt nennt, im
     Titel aber nicht: «2er-Pack 18650 Li-ion Akkus» — die Akkuzelle nennt
     Laserpointer als EINSATZZWECK. Das ist derselbe Fehltreffer-Typ wie die
     Silberoxid-Knopfzellen im Gedächtnis → nicht angefasst.
  3. Jeder der 19 Kandidaten wurde EINZELN per Produktbild geprüft (Vision-QA).

FEHLTREFFER AUS DEM PROBELAUF — bewusst NICHT gedraftet (34 von 53 Titeltreffern):
  · Messtechnik (Auftrag nennt sie ausdrücklich aus): Laser-Wasserwaage,
    Laser-Nivelliergerät + Stativ/Messstange, Laser-Entfernungsmesser,
    Laser-Distanzmessgerät, Golf-Entfernungsmesser, Laser-Geschwindigkeitsmessgerät.
  · «Superhelle Laser-Taschenlampe» (15449007096193): Datenblatt sagt
    «Lichtquelle: LED», Bilder zeigen eine Zoom-LED-Lampe mit Farbfiltern.
    «Laser» ist reines Lieferanten-Marketing für den gebündelten Strahl.
  · «Kabelloses Dual-Laser-Feuerzeug» (15495395344769): die Bilder zeigen ein
    Doppel-LICHTBOGEN-Feuerzeug (zwei Elektroden, sichtbarer Plasmabogen).
    «Dual-Laser» ist die Fehlübersetzung von «dual arc» — kein Laser.
  · LED-ROLLBÄLLE, die nur im Text «Laser» heissen (die teuerste Falle dieses
    Laufs): «LED Laser Rolling Pet Toy Ball» (15450831683969) — Merkmalsliste
    nennt ausschliesslich «Zwei Farbmodi: Rotes Licht und bunter Farbwechsel»,
    Verpackung im Bild heisst «LED Magic Ball»; und «Wiederaufladbares,
    selbsterwärmendes Haustierspielzeug» (15496611332481) — «integrierte
    LED-Laserfunktion», aber in 5 von 5 Bildern kein Austrittsfenster und kein
    Strahl, identische Bauform. Beide bleiben ACTIVE.
  · Lasergravur = Fertigungsverfahren, kein Laser IM Produkt: Gravur-Kette,
    Geburtsstein-Ring, Zirkonring, Servierplatte, Business-Schuhe, Gaming-Tastatur
    («Laser-gravierte Tasten»), DIY Laser Diamond Painting, 5D Laser Sticker.
  · Wortbestandteil ohne Gerät: «Midi-Rock in Laser-Grün» (Farbe), «Faltmesser mit
    Lasermuster» (Muster), «Laserpink» als Köderfarbe beim Angelköder.
  · Kosmetik/Medizin — anderer Befund, anderer Wächter (medizinprodukte_guard):
    Laser-Haarentfernung (3×), IPL-Gerät, Laser-Kamm, Lasertherapie-Kamm.
  · Fahrzeug-/Velobeleuchtung mit «Laserlinie»/«Cycling Laser Map» (7×) und
    Laser-Sternenhimmelprojektoren (2×): fest montierte bzw. abgestellte
    Leuchten, keine handgeführten Zeigegeräte. V-NISSG Art. 6 zielt auf
    Laserpointer. GRENZFALL → im Bericht als offener Punkt gemeldet, nicht
    eigenmächtig gedraftet.

AUFGENOMMEN TROTZ WIDERSPRÜCHLICHER BILDER (1 Fall, bewusst):
  «USB Laser Katzenball» (15497437970817) — die 7 Bilder zeigen denselben
  LED-Rollball wie oben, ABER Titel UND Merkmalsliste behaupten «Interaktiver
  Laser», der «zufällige Muster projiziert». Strafbar ist das ANBIETEN; der Shop
  bietet das Ding als Laserprojektor an. Wird der Text korrigiert, kann es
  jederzeit wieder ACTIVE gesetzt werden.

ENTSCHEIDUNG: status=DRAFT + Tag `laserpointer-v-nissg` (nichts gelöscht, nichts
  archiviert). DRAFT nimmt das Produkt zugleich aus ALLEN Verkaufskanälen —
  entscheidend, weil 17 der 19 im Google-Kanal standen, dem einzigen Kanal mit
  belegten Verkäufen. Mit Laserklassen-Nachweis (Klasse 1) ist jedes Produkt
  durch Zurücksetzen auf ACTIVE wieder freischaltbar.

QUELLE (Regel: zu jedem Backfill gehört die Frage, wer das NÄCHSTE Produkt anlegt):
  `automation/cj_category_fill.mjs` hatte nur GRUPPEN-`ban`-Muster; die Gruppe
  `cjhaustier` verbot lediglich /wholesale|human|for people/. Deshalb landeten
  zwischen dem 12. und 14.08. neun weitere Katzenlaser im Shop. Dieses Skript
  bringt zusätzlich `LASER_VERBOTEN`/`LASER_OK` mit, das der Importer jetzt
  GRUPPENÜBERGREIFEND anwendet (siehe Patch in cj_category_fill.mjs).

LEDGER: dropship/_laserpointer_gedraftet.txt, Zeile für Zeile mit flush.
  Nur eine ECHTE Antwort der API kommt ins Ledger; ein Fehlschlag gilt als offen
  und wird beim nächsten Lauf erneut versucht.

AUFRUF:  python3 automation/laserpointer_guard.py          → DRY (zeigt nur)
         python3 automation/laserpointer_guard.py --scharf → schreibt
"""
import json
import os
import sys
import time
import urllib.request

SHOP = 'https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json'
TOKEN = open('/tmp/cj_shop_token.txt').read().strip()
LEDGER = os.path.join(os.path.dirname(__file__), '..', 'dropship',
                      '_laserpointer_gedraftet.txt')
TAG = 'laserpointer-v-nissg'

# Einzeln per Bild geprüft (Vision-QA) — Begründung je Zeile.
TREFFER = {
    '15453764223361': 'Spielball, Bild zeigt roten Laserstrahl + «Laser light design»',
    '15454193090945': 'Präsentations-Pointer, Bild zeigt gelben «CAUTION laser radiation»-Aufkleber; Text behauptet «strahlungsfrei»',
    '15454386127233': 'Kreiselturm, Bild «Unpredictable laser position», rote Strahlen',
    '15455600869761': 'Bild «Laser Cat Toy · Electric Weeble Wobbler», Katze jagt Punkt',
    '15481818579329': 'Handgerät, Bild zeigt roten Strahl + Punkt am Boden',
    '15485599449473': 'Bild «The laser moves randomly across floors and walls»',
    '15485599777153': 'Hundetrainer, Schalter «Light/Train/Chaser», Strahl im Bild',
    '15494122406273': 'Halsband, Bild «Continuous laser mode / Flashing laser mode»',
    '15495110230401': 'Pfotenform, Bild zeigt roten Strahl, «5 adjustable angles»',
    '15495186612609': 'Rotierender Diamantkopf, Katze jagt Punkt',
    '15496431403393': 'Turm mit Laserkopf, Text «projiziert einen roten Laserpunkt»',
    '15496431534465': 'Bild zeigt roten Strahl, Text «Automatischer Infrarot-Laser»',
    '15496506835329': 'Halsband mit Austrittsmodul, «projiziert einen Laserpunkt»',
    '15497149448577': 'Bild «Intelligent Laser Cat Teaser Collar», Metalldüse am Hals',
    '15497437970817': 'Bilder ohne Austritt, ABER Titel+Merkmal behaupten Laserprojektion',
    '15497439576449': 'Bild «Smart Laser Collar», rote Linse sichtbar',
    '15497453732225': 'Laserturm mit Modi Random/Fast/Slow, Austritt im Ball sichtbar',
    '15497454092673': 'Bild zeigt Katze am roten Strahl (Text nennt es «Infrarotlicht»)',
    '15497454223745': 'Bilder zeigen roten Strahl über den Boden, «Laser-Modus»',
}


def gql(query, variables=None, versuche=5):
    """Nur eine echte Antwort zählt; Netzfehler werden wiederholt."""
    letzte = None
    for i in range(versuche):
        try:
            req = urllib.request.Request(
                SHOP,
                data=json.dumps({'query': query, 'variables': variables or {}}).encode(),
                headers={'X-Shopify-Access-Token': TOKEN,
                         'Content-Type': 'application/json'})
            antwort = json.loads(urllib.request.urlopen(req, timeout=60).read())
            if antwort.get('errors') and not antwort.get('data'):
                raise RuntimeError(antwort['errors'])
            return antwort
        except Exception as e:          # noqa: BLE001
            letzte = e
            time.sleep(3 * (i + 1))
    raise RuntimeError('keine Antwort nach %d Versuchen: %s' % (versuche, letzte))


LESEN = '''query($ids:[ID!]!){nodes(ids:$ids){... on Product{
  id title status tags
  resourcePublicationsV2(first:10){nodes{publication{name}}}}}}'''

SCHREIBEN = '''mutation($in:ProductInput!){productUpdate(input:$in){
  product{id status tags} userErrors{field message}}}'''


def erledigt():
    if not os.path.exists(LEDGER):
        return set()
    with open(LEDGER, encoding='utf-8') as f:
        return {z.split('\t')[0] for z in f if z.strip()}


def main():
    scharf = '--scharf' in sys.argv
    schon = erledigt()
    ids = ['gid://shopify/Product/' + i for i in TREFFER]
    produkte = gql(LESEN, {'ids': ids})['data']['nodes']

    offen = []
    for p in produkte:
        if p is None:
            continue
        num = p['id'].split('/')[-1]
        kanaele = [x['publication']['name'] for x in p['resourcePublicationsV2']['nodes']]
        google = 'Google & YouTube' in kanaele
        if num in schon:
            print('  übersprungen (Ledger): %s' % num)
            continue
        if p['status'] != 'ACTIVE':
            print('  bereits nicht ACTIVE: %s %s (%s)' % (num, p['title'], p['status']))
            continue
        offen.append((p, num, google))
        print('%s DRAFT+Tag | %-52s | Google:%s | %s'
              % (num, p['title'][:52], 'JA ' if google else 'nein', TREFFER[num]))

    print('\n%d Produkte zu ändern (%d davon im Google-Kanal).'
          % (len(offen), sum(1 for _, _, g in offen if g)))
    if not scharf:
        print('DRY-Lauf — nichts geschrieben. Mit --scharf ausführen.')
        return

    with open(LEDGER, 'a', encoding='utf-8') as led:
        for p, num, google in offen:
            tags = sorted(set(p['tags']) | {TAG})
            antwort = gql(SCHREIBEN, {'in': {'id': p['id'], 'status': 'DRAFT',
                                             'tags': tags}})
            fehler = antwort['data']['productUpdate']['userErrors']
            if fehler:
                print('  FEHLER %s: %s — bleibt offen' % (num, fehler))
                continue
            neu = antwort['data']['productUpdate']['product']
            if neu['status'] != 'DRAFT' or TAG not in neu['tags']:
                print('  UNBESTÄTIGT %s — bleibt offen' % num)
                continue
            led.write('%s\t%s\tgoogle=%s\t%s\n'
                      % (num, p['title'], google, TREFFER[num]))
            led.flush()
            os.fsync(led.fileno())
            print('  ✔ %s → DRAFT' % num)
            time.sleep(0.3)


if __name__ == '__main__':
    main()
