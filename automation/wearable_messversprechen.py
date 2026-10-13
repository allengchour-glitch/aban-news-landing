#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
wearable_messversprechen.py — streicht unhaltbare Mess-Behauptungen aus Wearable-Texten.

WORUM ES GEHT: Ein optischer Sensor am Handgelenk kann **Blutdruck, EKG und Blutzucker nicht
messen**. Steht es trotzdem im Produkttext, ist das eine Falschangabe — und bei einem Gerät,
das damit beworben wird, zugleich eine Zweckbestimmung als Medizinprodukt (MepV). Beides trifft
ausgerechnet den Google-&-YouTube-Kanal, den einzigen mit belegten Verkäufen.

WAS BEWUSST BLEIBT — die Unterscheidung ist der ganze Punkt:
- **Blutsauerstoff / SpO2** (125 Produkte): bei Consumer-Wearables seit Jahren Standard und als
  Wellness-Funktion etabliert (Apple Watch, Fitbit, Garmin führen sie ebenso). Wer das streicht,
  entfernt eine legitime Angabe und senkt kein Risiko.
- **Herzfrequenz / Puls**: misst jede Sportuhr, unstrittig.
- **Körpertemperatur** wird nicht gestrichen, sondern zu **Hauttemperatur** präzisiert — gemessen
  wird die Haut, nicht die Körperkerntemperatur. Das ist wahr statt weggelassen.

ZWEI FEHLTREFFER-KLASSEN, im Probelauf gefunden und ausgenommen:
1. **Zubehör.** «Smartwatch Schutzhülle mit Displayschutz» erklärt: «Für die Nutzung der
   EKG-Funktion muss die Krone der Hülle entfernt werden.» Das ist eine Bedienungsanleitung für
   die Uhr der Kundin, keine Behauptung über die Hülle.
2. **Manuelle Eingabe.** «Für ein vollständigeres Bild können Sie **manuell** Blutdruck …
   erfassen» — das Gerät misst nicht, die Nutzerin trägt Werte ein. Eine wahre Aussage.

Nutzung:  DRY=1 python3 automation/wearable_messversprechen.py      (Titel/Text + SEO-Felder, nur zeigen)
          python3 automation/wearable_messversprechen.py
          NUR=seo …   nur SEO-Felder · SEO=0 … ohne SEO-Felder · CACHE_NUTZEN=1 … Export wiederverwenden
          RUECKWEG=<Produkt-GID|alle> …   SEO-Felder + Titel aus dropship/_wearable_mess_seo.tsv zurück
          python3 automation/wearable_messversprechen.py --test   (Kanarienvögel, ohne Netz)
Letzte Zeile jedes Laufs: «WEARABLE-SEO: N offen · …» (unklar, wenn der Export scheitert — nie «0»).
"""
import json, os, re, time, urllib.request

SHOP  = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
# 13.10.2026: Token erst beim ersten Aufruf lesen — sonst scheitert schon der Selbsttest (--test)
# ohne Netz und ohne Token-Datei.
TOKEN = os.environ.get('SHOPIFY_ADMIN_TOKEN') or ''
DRY   = os.environ.get('DRY') == '1'
CAP   = int(os.environ.get('CAP', '200'))
QUELLE = os.environ.get('QUELLE', '/tmp/wearable_export.jsonl')
LEDGER = 'dropship/_wearable_mess.txt'

# ⚠️ Die Wortgrenze gehoert ans ENDE, nie an den Anfang: `uhr\b` traf «Sportuhr»,
# «Herrenuhr», «Damenuhr» und «Taucheruhr» NICHT — im Deutschen steht vor dem Grundwort
# ein Buchstabe. Genau diese Falle hat am 28.08. die Klingenregel an fast jeder Klinge
# vorbeilaufen lassen; hier kostete sie am 03.09. einen uebersehenen Blutdruck-Titel.
# ⚠️ 13.10.2026: «armband» stand in der Gruppe MIT Anfangs-Wortgrenze — dieselbe Falle wie oben:
# «Smartarmband mit Blutdruckmessung» und «EKG-Überwachungsarmband» (beide aktiv) liefen am Waechter
# vorbei, der Produkttitel trug den Blutdruck seit Wochen. «armband» gehoert zu den Grundwoertern.
TRAEGER  = re.compile(r'(?<![\wäöüß])(smartwatch|smart\s*watch|fitness[- ]?tracker|'
                      r'smart[- ]?ring|wearable)|[\wäöüß]*(uhr|watch|armband)(?![\wäöüß])', re.I)
ZUBEHOER = re.compile(r'\b(hülle|huelle|schutzfolie|displayschutz|armband[- ]?ersatz|ersatzarmband|'
                      r'ladekabel|ladegerät|ladestation|halterung|schutzglas|panzerglas)\b', re.I)
KRITISCH = re.compile(r'blutdruck|blutzucker|glukose|\bEKG\b|elektrokardiogramm|ecg\b', re.I)
# MOTIV (13.10.2026): «Titanring mit EKG-Muster», «Armband mit EKG-Herzschlag-Motiv» — die Herzlinie als
# Schmuck- oder Druckmotiv ist keine Mess-Behauptung. Zaehlt ein Text NUR wegen eines Motivs, bleibt er.
MOTIV    = re.compile(r'\bEKG[- ]?(?:Herzschlag[- ]?|Herz[- ]?)?(?:Muster|Motiv|Linie|Kurve|Design|Print|Anhänger|'
                      r'Anhaenger|Optik|Aufdruck|Grafik|Symbol)\w*', re.I)


def kritisch(t):
    """Mess-Behauptung im Text — Motive (EKG-Linie als Schmuck/Print) zaehlen nicht."""
    return bool(t) and bool(KRITISCH.search(MOTIV.sub(' ', t)))
# ⚠️ Zwischen «manuell» und dem Verb steht oft eine Aufzählung MIT KOMMA
# («manuell Blutdruck, Menstruationszyklus erfassen») — ohne Komma im Muster
# rutschte der Smart Ring durch die Ausnahme und wäre bereinigt worden.
MANUELL  = re.compile(r'manuell[a-z]*[\s\w,.\-–]{0,60}?(?:erfass|eintrag|eingeb|notier)', re.I)

def gql(q, v=None):
    global TOKEN
    if not TOKEN:
        TOKEN = open('/tmp/cj_shop_token.txt').read().strip()
    req = urllib.request.Request(
        f'https://{SHOP}/admin/api/2026-01/graphql.json',
        data=json.dumps({'query': q, 'variables': v or {}}).encode(),
        headers={'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'})
    for i in range(4):
        try: return json.load(urllib.request.urlopen(req, timeout=45))
        except Exception:
            if i == 3: raise
            time.sleep(2 ** i)


def titel_saeubern(t):
    """Für den TITEL gilt die Satzregel NICHT: ein Titel ist kein Satz, und ein leerer Titel
    wird von Shopify abgelehnt («Title can't be blank») — genau das passierte bei
    «Smart-Armband mit Blutdruck- und Herzfrequenzmessung» und «F16 Smartwatch mit EKG,
    Blutdruck & Herzfrequenz». Hier wird nur herausgeschnitten, nie verworfen."""
    n = re.sub(r'\bKörpertemperatur', 'Hauttemperatur', t)
    # ⚠️ EINE Wortliste fuer Erkennung UND Reinigung (03.09.2026). KRITISCH kannte
    # «Glukose», der Reiniger nicht — der Waechter fand «Smartwatch mit Blutsauerstoff &
    # Glukosemessung» und liess den Titel unveraendert stehen. Ein Waechter, der findet und
    # nicht beheben kann, meldet denselben Fall jeden Tag neu.
    WORT = r'Blutdruck|EKG|Blutzucker|Glukose|Elektrokardiogramm|\bECG\b'
    KOPF = r'(messung|überwachung|ueberwachung|funktion|analyse|sensor|tracking|messer)'
    # ⚠️ 13.10.2026: Bindestrich-Koppelung ZUERST aufloesen (wie flick() im Fliesstext). Ohne das ergab
    # «Smart-Armband mit Herz- & Blutdruckmessung» den Halbtitel «Smart-Armband mit Herz» (aktiv seit 03.09.).
    # (a) beide Teile Messwoerter: «EKG- und Blutzucker-Messung» → weg
    n = re.sub(r'\b(?:' + WORT + r')-\s*(?:und|oder|&amp;|&)\s*(?:' + WORT + r')[- ]?' + KOPF + r'\b', '', n, flags=re.I)
    # (b) erster Teil bleibt: «Herzfrequenz- & Blutdruckmessung» → «Herzfrequenzmessung»
    n = re.sub(r'([A-Za-zÄÖÜäöüß]+)-\s*(?:und|oder|&amp;|&)\s*(?:' + WORT + r')[- ]?' + KOPF + r'\b',
               lambda m: m.group(1) + m.group(2).lower(), n, flags=re.I)
    n = re.sub(r'\bHerz(?=mess)', 'Herzfrequenz', n)          # «Herzmessung» → «Herzfrequenzmessung»
    n = re.sub(r'\b(?:' + WORT + r')[- ]?(?:messung|überwachung|ueberwachung|funktion|analyse|sensor|tracking)\b',
               '', n, flags=re.I)
    n = re.sub(r'\b(?:' + WORT + r')\b[- ]?', '', n, flags=re.I)
    n = re.sub(r'\s*[,&]\s*(?=[,&])', '', n)              # doppelte Trenner
    # ⚠️ OHNE das \s* vor dem Trenner bleibt «mit& Herzfrequenz» stehen: das Leerzeichen
    # zwischen «mit» und «&» ist beim Herausschneiden schon verschwunden.
    # ⚠️ 03.09.: «für» wurde vergessen — «Smartwatch für Blutdruck- & Sauerstoffmessung»
    # ergab «Smartwatch für & Sauerstoffmessung». Ein halber Titel ist schlimmer als ein
    # langer. Deshalb ALLE Verbindungswörter, die vor der gestrichenen Stelle stehen können.
    n = re.sub(r'\b(mit|für|fuer|zur|zum|inkl\.?|inklusive)\s*(?:und|&|,|-)+\s*',
               lambda m: m.group(1) + ' ', n, flags=re.I)
    n = re.sub(r'\s*(?:und|&)\s*(?=[,.]|$)', '', n, flags=re.I)
    n = re.sub(r'^\s*[,&·–-]+\s*|\s*[,&·–-]+\s*$', '', n)
    n = re.sub(r'\s{2,}', ' ', n).strip()
    n = re.sub(r'\b(?:mit|für|fuer|zur|zum|und|inkl\.?)\s*$', '', n, flags=re.I).strip()
    # Halbtitel aus dem Lauf vom 03.09. («Smart-Armband mit Herz») — das Grundwort war mitgegangen.
    n = re.sub(r'\b(mit|für|fuer|zur)\s+Herz$', r'\1 Herzfrequenzmessung', n)
    # Auffangnetz: bleibt zu wenig übrig, lieber den alten Titel behalten als einen leeren
    return n if len(n) >= 8 else t

# ⚠️ 13.10.2026: Artikel + Adjektiv OHNE Nomen. «… speziell für die nicht-invasive Blutzuckermessung entwickelt»
# wurde am 03.09. zu «für die nicht-invasive entwickelt wurde» (E600, live) — satz_ok sah es nicht. Nomen sind
# im Deutschen gross: folgt dem Adjektiv ein kleines Wort (kein und/oder/…) oder das Satzende, fehlt das Nomen.
# Artikel/Pronomen als «Adjektiv» sind ausgenommen («…Display, das eine klare Anzeige …» ist ein Relativsatz).
FRAGMENT = re.compile(
    r'\b(?:die|der|das|den|dem|des|eine|einer|einem|einen|ein|deine[nmrs]?|Ihre[nmrs]?)\s+'
    r'(?:[a-zäöüß][\wäöüß-]*\s+)?'
    r'(?!(?:die|der|das|den|dem|des|eine[nmrs]?|ein|keine[nmrs]?|seine[nmrs]?|ihre[nmrs]?|deine[nmrs]?|'
    r'diese[nmrs]?|alle|beide|viele|wenige|einige|meisten)\b)'
    r'[a-zäöüß][\wäöüß-]*(?:e|en)(?![\wäöüß-])'
    r'(?=\s*(?:[.;:!?]|$)|\s+(?!(?:und|oder|sowie|so|sehr|besonders|bzw|als|wie|zu)\b)[a-zäöüß])')


def satz_ok(s, anfang=True):
    """Erkennt Satzreste, die eine Streichung hinterlassen hat. anfang=False: ein UNVERÄNDERTER Satz darf mit
    «Mit …»/«Für …» beginnen (Meta-Auswahl) — nur nach einer Streichung ist das ein Rest."""
    t = s.strip()
    if not t: return False
    if FRAGMENT.search(t): return False                            # Adjektiv ohne Nomen
    if re.match(r'^[a-zäöü]', t): return False                    # beginnt klein
    if re.search(r'\b(Ihr|Ihre|Ihren|Ihrem|des|der|die|das|dem|den)\s+(der|die|das|dem|den)\b', t): return False
    if anfang and re.search(r'^\s*(und|sowie|oder|mit|für)\b', t, re.I): return False
    if re.search(r'^\s*(und|sowie|oder)\b', t, re.I): return False
    if re.search(r'\b(misst|überwacht|erfasst|bietet|liefert)\s*[.,]', t): return False   # Verb ohne Objekt
    return True

def saeubere(text):
    """Streicht die Begriffe. WICHTIG: satzweise — ein Satz, der danach nicht mehr trägt,
    fällt GANZ weg. Der erste Entwurf schnitt nur die Wörter heraus und hinterliess
    «Es misst präzise Ihr die Herzfrequenz» und Sätze, die mit Kleinbuchstaben begannen.
    Ein halber Satz im Produkttext ist schlimmer als ein fehlender."""
    # Körpertemperatur → Hauttemperatur: präzisieren, nicht streichen (gemessen wird die Haut)
    t = re.sub(r'\bKörpertemperatur', 'Hauttemperatur', text)

    def flick(stueck):
        s = stueck
        # In Aufzählungen ist das Herausschneiden sicher
        s = re.sub(r',\s*(?:Blutdruck|EKG|Blutzucker|Elektrokardiogramm)(?=\s*[,.;）)]|\s+(?:und|sowie)\b)', '', s, flags=re.I)
        s = re.sub(r'\b(?:Blutdruck|EKG|Blutzucker|Elektrokardiogramm)\s*,\s*', '', s, flags=re.I)
        s = re.sub(r'\s+(?:und|sowie)\s+(?:Blutdruck|EKG|Blutzucker)(?=\s*[.,;）)]|$)', '', s, flags=re.I)
        # ⚠️ ZUERST die deutsche Bindestrich-Koppelung, sonst bleibt der Kopf haengen.
        # «Herzfrequenz- und Blutdruckmessung» ergab am 02.09. auf 19 Produktseiten
        # das Fragment «Unterstuetzt Herzfrequenz- und» — der zweite Teil wurde
        # gestrichen, das Grundwort ging mit. In EINEM Schritt wird die Koppelung
        # aufgeloest und das Grundwort an den ersten Teil geschrieben.
        KOPF = r'(?:messung|überwachung|ueberwachung|funktion|analyse|sensor|tracking|monitor(?:ing)?)'
        s = re.sub(r'([A-Za-zÄÖÜäöüß]+)-\s*(?:und|oder|&amp;|&)\s*(?:Blutdruck|Blutzucker|EKG|Elektrokardiogramm)[- ]?'
                   + KOPF + r'\b', r'\1messung', s, flags=re.I)
        s = re.sub(r'(?:Blutdruck|Blutzucker|EKG|Elektrokardiogramm)-\s*(?:und|oder|&amp;|&)\s*([A-Za-zÄÖÜäöüß]+[- ]?'
                   + KOPF + r')\b', r'\1', s, flags=re.I)
        s = re.sub(r'\b(?:Blutdruck|Blutzucker|EKG)[- ]?(?:messung|überwachung|funktion|analyse|sensor)\b\s*,?\s*', '', s, flags=re.I)
        s = re.sub(r'\bEKG\+PPG\b', 'PPG', s)
        s = re.sub(r',\s*,', ',', s)
        s = re.sub(r'\s{2,}', ' ', s)
        s = re.sub(r'\s+([,.;])', r'\1', s)
        # Auffangnetz: bleibt trotzdem eine Koppelung ohne zweiten Teil stehen,
        # wird das Grundwort angehaengt statt ein Fragment auszuliefern.
        s = re.sub(r'([A-Za-zÄÖÜäöüß]+)-\s*(?:und|oder|&amp;|&)\s*$', r'\1messung', s)
        return s

    # HTML-Blöcke einzeln behandeln, damit Tags heil bleiben
    teile = re.split(r'(<[^>]+>)', t)
    raus = []
    for teil in teile:
        if teil.startswith('<') or not KRITISCH.search(teil):
            raus.append(teil); continue
        # Satzweise: nur Sätze mit Treffer anfassen
        saetze = re.split(r'(?<=[.!?])\s+', teil)
        neu_saetze = []
        for satz in saetze:
            if not KRITISCH.search(satz):
                neu_saetze.append(satz); continue
            g = flick(satz)
            if KRITISCH.search(g) or not satz_ok(g):
                continue                     # Rest unbrauchbar oder Begriff noch drin → Satz weg
            neu_saetze.append(g)
        raus.append(' '.join(neu_saetze))
    t = ''.join(raus)
    t = re.sub(r'<li>\s*</li>', '', t)
    t = re.sub(r'<p>\s*</p>', '', t)
    t = re.sub(r'\s{2,}', ' ', t)
    return t

ROH = '/tmp/wearable_live.jsonl'

Q_LIVE = ('query($q:String!,$c:String){products(first:100,after:$c,query:$q){'
          ' pageInfo{hasNextPage endCursor} nodes{id title descriptionHtml}}}')


def quelle_live():
    """Baut die Quelle LIVE aus dem Shop statt aus einem Export.

    Der Standardpfad /tmp/wearable_export.jsonl ist ein Wipe-/Snapshot-Opfer und war
    am 03.09. drei Tage alt: der Lauf vom Vortag hat 104 Titel bereinigt und trotzdem
    drei uebersehen, weil sie NACH dem Export importiert wurden. Ein Werkzeug, dessen
    Quelle veraltet, meldet Vollzug ueber eine Vergangenheit. Gesucht wird direkt nach
    den Messwoertern (Shopify durchsucht Titel UND Text) — enger als der ganze Katalog
    und genau die Klasse.
    """
    global QUELLE
    QUELLE = ROH
    gesehen = set()
    with open(ROH, 'w', encoding='utf-8') as raus:
        for begriff in ('blutdruck', 'blutzucker', 'glukose', 'EKG', 'elektrokardiogramm'):
            cur = None
            while True:
                r = gql(Q_LIVE, {'q': 'status:active AND ' + begriff, 'c': cur})
                pg = (r.get('data') or {}).get('products')
                if not pg:
                    break                      # stumme Antwort ist kein Befund
                for n in pg['nodes']:
                    if n['id'] in gesehen:
                        continue
                    gesehen.add(n['id'])
                    raus.write(json.dumps(n, ensure_ascii=False) + '\n')
                if not pg['pageInfo']['hasNextPage']:
                    break
                cur = pg['pageInfo']['endCursor']
                time.sleep(0.3)
            time.sleep(0.3)
    print('Quelle live gebaut: %d Kandidaten' % len(gesehen))


def main():
    fertig = set()
    if os.path.exists(LEDGER):
        fertig = {l.split('\t')[0] for l in open(LEDGER, encoding='utf-8') if l.strip()}

    if QUELLE == 'live' or not os.path.exists(QUELLE):
        quelle_live()                       # kein/kein frischer Export -> LIVE lesen
    kand = []
    for line in open(QUELLE, encoding='utf-8'):
        try: o = json.loads(line)
        except Exception: continue
        if not o.get('id', '').startswith('gid://shopify/Product/'): continue
        if o['id'] in fertig: continue
        titel = o.get('title', '') or ''
        if not TRAEGER.search(titel): continue
        if ZUBEHOER.search(titel):  continue          # Hülle/Folie/Ladekabel — nicht das Gerät
        roh = o.get('descriptionHtml') or ''
        klar = re.sub(r'<[^>]+>', ' ', roh)
        if not kritisch(titel + ' ' + klar): continue   # Motiv («EKG-Linie» als Schmuck) zaehlt nicht
        if MANUELL.search(klar) and not kritisch(titel):
            continue                                   # «manuell erfassen» ist keine Messung
        kand.append(o['id'])

    print(f"Kandidaten: {len(kand)}")
    geaendert = unveraendert = 0
    for pid in kand[:CAP]:
        r = gql('query($id:ID!){product(id:$id){title descriptionHtml}}', {'id': pid})
        p = (r.get('data') or {}).get('product')
        if not p: continue
        altT, altB = p['title'], p['descriptionHtml'] or ''
        neuT = titel_saeubern(altT)
        neuB = saeubere(altB)
        if neuT == altT and neuB == altB:
            unveraendert += 1
            open(LEDGER, 'a', encoding='utf-8').write(f"{pid}\tnichts-zu-tun\n") if not DRY else None
            continue
        # Sicherung: der Text darf nur SCHRUMPFEN (wir streichen, wir schreiben nicht dazu).
        # Ausnahme ist «Körpertemperatur»→«Hauttemperatur», das ist gleich lang minus 2.
        if len(neuB) > len(altB):
            print(f"  ! {altT[:44]} — Text wuerde wachsen, uebersprungen"); continue
        if DRY:
            print(f"  ~ {altT[:52]}")
            if neuT != altT: print(f"      Titel: «{altT[:60]}» → «{neuT[:60]}»")
            for w in ['Blutdruck', 'EKG', 'Blutzucker']:
                if re.search(w, altB, re.I) and not re.search(w, neuB, re.I):
                    print(f"      {w} entfernt")
        else:
            rr = gql('''mutation($in:ProductInput!){productUpdate(input:$in){
                        product{id} userErrors{message}}}''',
                     {'in': {'id': pid, 'title': neuT, 'descriptionHtml': neuB}})
            e = (rr.get('data') or {}).get('productUpdate', {}).get('userErrors') or []
            if e: print(f"  X {altT[:40]}: {e[0]['message']}"); continue
            # ⚠️ Nur quittieren, wenn die Aussage WIRKLICH weg ist. Am 03.09. stand
            # «Smart Business Armband mit Herz- und Blutdruckmesser» als «bereinigt» im
            # Ledger und trug den Blutdruck weiter im Titel — die Regel kommt an der
            # Bindestrich-Koppelung («Herz- und …messer») nicht sauber vorbei. Eine
            # falsche Quittung ueberspringt den Fall fuer immer; «titel-offen» laesst
            # ihn im naechsten Lauf wieder auftauchen und im Bericht sichtbar.
            offen = kritisch(neuT)
            open(LEDGER, 'a', encoding='utf-8').write(
                f"{pid}\t{'titel-offen' if offen else 'bereinigt'}\n")
            if offen:
                print(f"  ⚠️ Titel traegt die Aussage weiter: «{neuT[:60]}» — von Hand")
            time.sleep(0.8)
        geaendert += 1
    print(f"{'DRY ' if DRY else ''}bereinigt: {geaendert} · ohne Aenderung: {unveraendert}")
    if geaendert == 0: print("FERTIG")

# ═══════════════════════════════════════════════════════════════════════════════════════════════
# SEO-FELDER (13.10.2026, Prüfpunkt ON-M1A). Der Wächter las nur title + descriptionHtml. Im
# Google-Snippet standen derweil 27 SEO-Titel und 24 SEO-Beschreibungen (31 Produkte) mit Blutdruck,
# EKG oder Blutzucker — der Produkttitel war längst bereinigt («E530 Smartwatch»), der SEO-Titel sagte
# weiter «E530 Smartwatch mit EKG- und Blutzucker-Messung | LuxeStyle CH». Dieselbe Aussage an
# anderer Stelle. Und die Live-Suche (quelle_live) sieht SEO-Felder GAR NICHT: gemessen 4 von 31
# gefunden — darum hier ein Massenexport aller aktiven Produkte (eine Bulk-Operation, ~18 MB).
# Regeln (dieselben wie für den Titel): Blutdruck/EKG/Blutzucker fallen, Herzfrequenz/SpO2 bleiben,
# Zubehör, «manuell erfassen» und Motive bleiben ausgenommen.
#   seo.title       → Formel aus seo_titel_grenze.py: «<bereinigter Produkttitel> | LuxeStyle CH» (≤ 70)
#   seo.description → Formel aus seo_voll_fix.py: «<Name>: <erster Sachsatz> Gratis-Versand ab CHF 50,
#                     30 Tage Rückgabe.» (≤ 155); ohne tauglichen Satz LEER (Google nimmt den Text).
# IMMER beide Felder schicken (Falle 30.09.: SEOInput ersetzt beide), danach zurücklesen.
# Ledger dropship/_wearable_mess_seo.tsv mit Altwerten; Rückweg: RUECKWEG=<Produkt-GID|alle>.
# ═══════════════════════════════════════════════════════════════════════════════════════════════
SEO_LEDGER = 'dropship/_wearable_mess_seo.tsv'
SEO_EXPORT = '/tmp/wearable_seo_export.jsonl'
SEO_BULK = '{ products(query: "status:active") { edges { node { id handle title seo { title description } } } } }'
MARKE_RE = re.compile(r'\s*[|·–-]\s*LuxeStyle(?:\s*CH)?\s*$', re.I)
VERSAND = 'Gratis-Versand ab CHF 50, 30 Tage Rückgabe.'


def seo_export():
    """Bulk-Export aller aktiven Produkte (id, handle, title, seo). Status nur über die EIGENE Bulk-ID
    (Regel fremder-bulk, 07.10.). Gibt False zurück, wenn der Export nicht zustande kommt — dann gilt
    der Lauf als «unklar», nie als «0 offen»."""
    if os.environ.get('CACHE_NUTZEN') == '1' and os.path.exists(SEO_EXPORT):
        return True
    import subprocess
    m = gql('mutation { bulkOperationRunQuery(query: """%s""") { bulkOperation { id } userErrors { message } } }' % SEO_BULK)
    bo = ((m.get('data') or {}).get('bulkOperationRunQuery') or {})
    if bo.get('userErrors') or not bo.get('bulkOperation'):
        print('SEO-Export: Start abgelehnt', bo.get('userErrors') or m.get('errors')); return False
    bid = bo['bulkOperation']['id']
    for _ in range(240):                                   # höchstens 60 min
        time.sleep(15)
        b = ((gql('query($i:ID!){node(id:$i){... on BulkOperation{status objectCount url errorCode}}}',
                  {'i': bid}).get('data') or {}).get('node') or {})
        if b.get('status') == 'COMPLETED':
            if not b.get('url'):                           # 0 Objekte: keine Datei
                open(SEO_EXPORT, 'w').close(); return True
            subprocess.run(['curl', '-sS', '--retry', '3', '-o', SEO_EXPORT, b['url']], check=True)
            return True
        if b.get('status') in ('FAILED', 'CANCELED', 'EXPIRED'):
            print('SEO-Export:', b.get('status'), b.get('errorCode')); return False
    print('SEO-Export: Zeitüberschreitung'); return False


def seo_betroffen(titel, st, sd):
    """Gilt die Wearable-Regel für dieses Produkt — und trägt ein SEO-Feld die Aussage?"""
    if not TRAEGER.search(titel or '') or ZUBEHOER.search(titel or ''):
        return False
    if not (kritisch(st) or kritisch(sd)):
        return False
    if MANUELL.search(sd or '') and not kritisch(st) and not kritisch(titel):
        return False                                       # «manuell erfassen» ist keine Messung
    return True


def seo_titel_neu(produkttitel, alt_seo_titel):
    """Formel seo_titel_grenze.py auf den bereinigten Produkttitel; trägt der Produkttitel selbst die
    Aussage noch (nicht bereinigbar), der bereinigte alte SEO-Titel; sonst leer (= Produkttitel)."""
    from seo_titel_grenze import seo_titel
    for basis in (titel_saeubern(produkttitel), titel_saeubern(MARKE_RE.sub('', alt_seo_titel or ''))):
        if basis and not kritisch(basis):
            return seo_titel(basis)
    return ''


def erster_sachsatz(name, body_html):
    """Wie erster_satz() aus seo_voll_fix.py (gleiche Filter: 25–120 Zeichen, Satzende, keine Floskel/Sie-Form,
    kein CHF, keine Lieferzeit) — aber auf dem BEREINIGTEN Text, ohne Mess-Behauptung und ohne Satzrest
    (satz_ok). erster_satz() gibt nur den ERSTEN Treffer; ist der ein Rest, braucht es den nächsten."""
    from seo_voll_fix import FLOSKEL, text
    titel = (name or '').lower()
    for s in re.split(r'(?<=[.!?])\s+|\s*¶\s*', text(saeubere(body_html or ''))):
        s = s.strip(' ¶')
        if titel and s.lower().startswith(titel):
            s = s[len(titel):].lstrip(' :–-·')
        if (25 <= len(s) <= 120 and s[-1:] in '.!?' and not FLOSKEL.search(s) and 'CHF' not in s
                and not re.search(r'\b(z|bzw|ca|inkl|evtl)\.$|wie im Titel|^\w+:', s)
                and 'Lieferzeit' not in s and not s.startswith(('💎', '✨', '👉', '📦'))
                and not kritisch(s) and satz_ok(s, anfang=False)):
            return s
    return ''


def seo_beschreibung_neu(name, body_html, tags):
    """Formel seo_voll_fix.py: «<Name>: <erster Sachsatz> [Ab Schweizer Lager, ]Gratis-Versand …» (≤ 155).
    Der Satz kommt aus dem BEREINIGTEN Text und darf keine Mess-Behauptung tragen; sonst leer.
    Passt nicht alles in 155 Zeichen, fällt zuerst der Name (Google zeigt den Titel ohnehin darüber), dann
    der Versandsatz — NIE wird mitten im Satz gekappt (Probelauf 13.10.: «… spürst du es kaum am»)."""
    name = re.sub(r'\s*[–-]\s*[A-Z]{0,3}\d{2,}[A-Z0-9]*\s*$', '', MARKE_RE.sub('', name or '')).strip()
    satz = erster_sachsatz(name, body_html)
    if not satz:
        return ''
    lager = 'Ab Schweizer Lager, ' if 'ch-lager' in [x.lower() for x in (tags or [])] else ''
    trenner = ' – ' if ':' in name else ': '                # «Smartwatch: Herzfrequenz, …: Satz» vermeiden
    for m in (f'{name}{trenner}{satz} {lager}{VERSAND}', f'{satz} {lager}{VERSAND}',
              f'{name}{trenner}{satz}', satz):
        if len(m) <= 155 and m[-1:] in '.!?' and not kritisch(m):
            return m
    return ''


Q_SEO = 'query($id:ID!){product(id:$id){id handle title tags status descriptionHtml seo{title description}}}'
M_SEO = ('mutation($p:ProductUpdateInput!){productUpdate(product:$p){'
         'product{title seo{title description}} userErrors{field message}}}')


def _gleich(live, soll, produkttitel, feld):
    """Shopify speichert '' und einen SEO-Titel gleich dem Produkttitel als null."""
    if (live or '') == (soll or ''):
        return True
    return live is None and feld == 'title' and soll == produkttitel


def seo_pruefen():
    """Gibt (geprüft, betroffen, bereinigt, offen) zurück; offen=None heisst unklar."""
    try:
        from eimer_etikette import nachlauf
    except Exception:
        nachlauf = lambda d: 0
    if not seo_export():
        return (0, 0, 0, None)
    kand, n = [], 0
    for z in open(SEO_EXPORT, encoding='utf-8'):
        try: o = json.loads(z)
        except Exception: continue
        if not o.get('id', '').startswith('gid://shopify/Product/'): continue
        n += 1
        s_ = o.get('seo') or {}
        if seo_betroffen(o.get('title'), s_.get('title'), s_.get('description')):
            kand.append(o['id'])
    print(f'SEO-Felder: {n} aktive geprüft, {len(kand)} mit Mess-Behauptung', flush=True)
    bereinigt = fehler = 0
    zeit = time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())
    for pid in kand[:CAP]:
        p = (gql(Q_SEO, {'id': pid}).get('data') or {}).get('product')
        if not p or p.get('status') != 'ACTIVE':
            continue
        seo = p.get('seo') or {}
        altST, altSD = seo.get('title') or '', seo.get('description') or ''
        if not seo_betroffen(p['title'], altST, altSD):
            continue                                       # inzwischen erledigt
        neuT = titel_saeubern(p['title'])                  # Halbtitel/Restaussage im Produkttitel mitnehmen
        neuST = seo_titel_neu(neuT, altST) if kritisch(altST) else altST
        neuSD = seo_beschreibung_neu(neuT, p.get('descriptionHtml'), p.get('tags')) if kritisch(altSD) else altSD
        felder = [f for f, a, b in (('titel', p['title'], neuT), ('seo.title', altST, neuST),
                                    ('seo.description', altSD, neuSD)) if a != b]
        print(f"  ~ {p['handle'][:60]}  [{'+'.join(felder)}]")
        if neuT != p['title']:
            print(f"      Titel  «{p['title']}» → «{neuT}»")
        if neuST != altST:
            print(f"      SEO-T  «{altST}» → «{neuST}»")
        if neuSD != altSD:
            print(f"      SEO-B  «{altSD[:150]}»\n          → «{neuSD}»")
        if DRY:
            bereinigt += 1; continue
        eingabe = {'id': pid, 'seo': {'title': neuST, 'description': neuSD}}   # IMMER beide (Falle 30.09.)
        if neuT != p['title']:
            eingabe['title'] = neuT
        r = gql(M_SEO, {'p': eingabe})
        nachlauf(r)
        pu = (r.get('data') or {}).get('productUpdate') or {}
        live = pu.get('product') or {}
        lseo = live.get('seo') or {}
        gut = (not pu.get('userErrors') and live.get('title') == neuT
               and _gleich(lseo.get('title'), neuST, neuT, 'title')
               and _gleich(lseo.get('description'), neuSD, neuT, 'description')
               and not kritisch(lseo.get('title')) and not kritisch(lseo.get('description')))
        with open(SEO_LEDGER, 'a', encoding='utf-8') as led:
            led.write('\t'.join(x.replace('\t', ' ').replace('\n', ' ') for x in [
                zeit, pid, p['handle'], '+'.join(felder), p['title'], altST, altSD, neuT, neuST, neuSD,
                'ok' if gut else f"FEHLER {pu.get('userErrors')} live={json.dumps(lseo, ensure_ascii=False)[:120]}"]) + '\n')
        if gut:
            bereinigt += 1
        else:
            fehler += 1
            print(f"   ⚠️ zurückgelesen ≠ gesendet: {pu.get('userErrors')} {lseo}")
        time.sleep(0.4)
    offen = len(kand) - bereinigt if not DRY else len(kand)
    return (n, len(kand), bereinigt, offen)


def seo_rueckweg(ziel):
    """Setzt Titel + beide SEO-Felder auf die Altwerte aus dem Ledger zurück (jüngster ok-Eintrag je Produkt)."""
    letzte = {}
    for z in open(SEO_LEDGER, encoding='utf-8'):
        f = z.rstrip('\n').split('\t')
        if len(f) >= 11 and f[10] == 'ok' and (ziel == 'alle' or f[1] == ziel):
            letzte[f[1]] = f
    for pid, f in letzte.items():
        r = gql(M_SEO, {'p': {'id': pid, 'title': f[4], 'seo': {'title': f[5], 'description': f[6]}}})
        print('  zurück', f[2], ((r.get('data') or {}).get('productUpdate') or {}).get('userErrors') or 'ok')
        time.sleep(0.4)
    print(f'Rückweg: {len(letzte)} Produkte')


def selbsttest():
    """Kanarienvögel ohne Netz (python3 automation/wearable_messversprechen.py --test)."""
    from seo_titel_grenze import seo_titel
    f = 0
    def soll(ist, erwartet, was):
        nonlocal f
        if ist != erwartet:
            f += 1; print(f'❌ {was}: {ist!r} ≠ {erwartet!r}')
    # SEO-Titel aus dem alten SEO-Titel (Fallback-Pfad) und aus dem Produkttitel
    soll(seo_titel_neu('E530 Smartwatch', 'E530 Smartwatch mit EKG- und Blutzucker-Messung | LuxeStyle CH'),
         'E530 Smartwatch | LuxeStyle CH', 'E530')
    soll(seo_titel(titel_saeubern(MARKE_RE.sub('', 'E530 Smartwatch mit EKG- und Blutzucker-Messung | LuxeStyle CH'))),
         'E530 Smartwatch | LuxeStyle CH', 'E530 aus SEO-Titel')
    soll(titel_saeubern('W8 EKG Smart-Armband'), 'W8 Smart-Armband', 'W8')
    soll(titel_saeubern('Mountain EKG Kurzarm-Shirt'), 'Mountain Kurzarm-Shirt', 'Reiniger allein (Schranke ist TRAEGER)')
    soll(seo_betroffen('Mountain EKG Kurzarm-Shirt für Paare', '', 'Mountain EKG Kurzarm-Shirt für Paare – jetzt bestellen.'),
         False, 'Mountain-Shirt bleibt unverändert')
    soll(seo_betroffen('Titanring mit EKG-Muster', 'Titanring mit EKG-Muster | LuxeStyle CH', ''), False, 'Titanring (Motiv)')
    soll(seo_betroffen('Herzschlag-Armband', 'Armband mit EKG-Herzschlag-Motiv | LuxeStyle CH', ''), False, 'Armband-Motiv')
    soll(seo_betroffen('Smartwatch Schutzhülle mit Displayschutz', 'Hülle für EKG-Smartwatch', ''), False, 'Zubehör')
    soll(seo_betroffen('Smart Ring', '', 'Du kannst manuell Blutdruck, Zyklus erfassen.'), False, 'manuell')
    soll(seo_betroffen('W8 Smart-Armband', 'W8 EKG Smart-Armband | LuxeStyle CH', ''), True, 'W8 betroffen')
    soll(seo_betroffen('Smartarmband mit Blutdruckmessung', 'x', ''), False, 'nur Produkttitel → Hauptpass')
    soll(seo_betroffen('Überwachungsarmband', '', 'EKG-Überwachungsarmband – bei LuxeStyle Schweiz.'), True, 'Kompositum armband')
    soll(seo_betroffen('Smartwatch: Herzfrequenz, Blutsauerstoff', 'Smartwatch: Herzfrequenz, Blutsauerstoff | LuxeStyle CH',
                       'Smartwatch: Herzfrequenz, Blutsauerstoff – SpO2 rund um die Uhr.'), False, 'SpO2/Herzfrequenz bleiben')
    soll(bool(TRAEGER.search('Smartarmband mit Blutdruckmessung')), True, 'TRAEGER Smartarmband')
    soll(titel_saeubern('Smartarmband mit Blutdruckmessung'), 'Smartarmband', 'Smartarmband')
    soll(titel_saeubern('Smart-Armband mit Herz- & Blutdruckmessung'), 'Smart-Armband mit Herzfrequenzmessung', 'Koppelung Herz-')
    soll(titel_saeubern('Smart-Armband mit Herz'), 'Smart-Armband mit Herzfrequenzmessung', 'Halbtitel 03.09.')
    soll(titel_saeubern('DT93 Smartwatch mit Herzfrequenz- & Blutdruckmessung'), 'DT93 Smartwatch mit Herzfrequenzmessung', 'Koppelung')
    soll(titel_saeubern('Smart-Armband mit Blutdruck- und Herzfrequenzmessung'), 'Smart-Armband mit Herzfrequenzmessung', 'umgekehrt')
    soll(titel_saeubern('G20 Smart-Armband mit EKG und Herzfrequenz'), 'G20 Smart-Armband mit Herzfrequenz', 'G20')
    soll(titel_saeubern('Smartwatch für Blutdruck- & Sauerstoffmessung'), 'Smartwatch für Sauerstoffmessung', 'für')
    soll(titel_saeubern('E600 Smartwatch zur Blutzuckermessung'), 'E600 Smartwatch', 'E600')
    soll(titel_saeubern('Smartwatch mit Herzfrequenzmessung'), 'Smartwatch mit Herzfrequenzmessung', 'sauber bleibt')
    # Meta: Satz mit Messwort fällt, Sie-Form fällt (Floskel), Lager-Zusatz, Länge
    soll(seo_beschreibung_neu('X1 Smartwatch', '<p>Diese Smartwatch misst Blutdruck und EKG.</p>', []), '', 'Meta ohne Satz → leer')
    m = seo_beschreibung_neu('X1 Smartwatch', '<p>Mit 1,4-Zoll-Display und sieben Tagen Akkulaufzeit im Alltag.</p>', ['ch-lager'])
    soll(m, 'X1 Smartwatch: Mit 1,4-Zoll-Display und sieben Tagen Akkulaufzeit im Alltag. Ab Schweizer Lager, ' + VERSAND, 'Meta Formel')
    soll(len(m) <= 155, True, 'Meta ≤ 155')
    soll(seo_beschreibung_neu('X1 Smartwatch', '<p>Sie erhalten eine Uhr mit langer Akkulaufzeit für jeden Tag.</p>', []), '', 'Sie-Form → leer')
    soll(satz_ok('Die E600 Smartwatch ist ein innovatives Wearable, das speziell für die nicht-invasive entwickelt wurde.'),
         False, 'Fragment E600')
    for gut in ('Es verfügt über ein 1,3 Zoll grosses IPS-Farbdisplay, das eine klare Anzeige gewährleistet.',
                'Die Smart Bluetooth Uhr ist ein vielseitiges Accessoire, das über die reine Zeitanzeige hinausgeht.',
                'Das ist die neue, bequeme Uhr.', 'Die tägliche und sportliche Nutzung ist einfach.'):
        soll(satz_ok(gut), True, 'kein Fragment: ' + gut[:40])
    lang = ('<p>Dank seines geringen Gewichts von nur 20g und dem komfortablen Design spürst du es kaum am Handgelenk.</p>')
    m = seo_beschreibung_neu('Smart-Armband mit Herzfrequenzmessung · ultraleicht, 20 g', lang, [])
    soll(m.endswith('Rückgabe.') and len(m) <= 155 and 'kaum am Handgelenk.' in m, True, 'nie mitten im Satz: ' + m)
    soll(seo_beschreibung_neu('E600 Smartwatch', '<p>Die E600 Smartwatch ist ein innovatives Wearable, das speziell '
         'für die nicht-invasive Blutzuckermessung entwickelt wurde.</p><p>Das Display misst 1,43 Zoll und zeigt alle Werte klar an.</p>', []),
         'E600 Smartwatch: Das Display misst 1,43 Zoll und zeigt alle Werte klar an. ' + VERSAND, 'E600 nächster Satz')
    print(f'{f} Fehler' if f else '✅ Selbsttest: alle Kanarienvögel richtig')
    return 1 if f else 0


# ⚠️ Wache (03.09.2026): Ohne sie FUEHRT ein blosser Import dieses Werkzeug AUS.
# Genau das ist beim Bau von klassen_kontrolle.py passiert — ein Melder, der beim
# Laden einen fremden Schreiber startet, ist eine gestellte Falle.
def lauf():
    import sys
    if '--test' in sys.argv:
        sys.exit(selbsttest())
    if os.environ.get('RUECKWEG'):
        return seo_rueckweg(os.environ['RUECKWEG'])
    if os.environ.get('NUR') != 'seo':
        main()
    if os.environ.get('SEO', '1') == '1':
        n, betr, ok, offen = seo_pruefen()
        zeit = time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())
        if offen is None:
            print(f'WEARABLE-SEO: unklar (Export fehlgeschlagen), {zeit}')
        else:
            print(f"{'⚠️ ' if offen else ''}WEARABLE-SEO: {offen} offen · {ok} {'bereinigbar (DRY)' if DRY else 'bereinigt'}"
                  f" · {betr} betroffen von {n} aktiven, {zeit}")
        if os.path.exists(SEO_EXPORT) and os.environ.get('CACHE_NUTZEN') != '1':
            os.remove(SEO_EXPORT)                          # ~18 MB, Platte knapp


if __name__ == "__main__":
    lauf()
