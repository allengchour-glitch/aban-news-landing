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

Nutzung:  DRY=1 python3 automation/wearable_messversprechen.py
          python3 automation/wearable_messversprechen.py
"""
import json, os, re, time, urllib.request

SHOP  = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOKEN = os.environ.get('SHOPIFY_ADMIN_TOKEN') or open('/tmp/cj_shop_token.txt').read().strip()
DRY   = os.environ.get('DRY') == '1'
CAP   = int(os.environ.get('CAP', '200'))
QUELLE = os.environ.get('QUELLE', '/tmp/wearable_export.jsonl')
LEDGER = 'dropship/_wearable_mess.txt'

# ⚠️ Die Wortgrenze gehoert ans ENDE, nie an den Anfang: `uhr\b` traf «Sportuhr»,
# «Herrenuhr», «Damenuhr» und «Taucheruhr» NICHT — im Deutschen steht vor dem Grundwort
# ein Buchstabe. Genau diese Falle hat am 28.08. die Klingenregel an fast jeder Klinge
# vorbeilaufen lassen; hier kostete sie am 03.09. einen uebersehenen Blutdruck-Titel.
TRAEGER  = re.compile(r'(?<![\wäöüß])(smartwatch|smart\s*watch|armband|fitness[- ]?tracker|'
                      r'smart[- ]?ring|wearable)|[\wäöüß]*(uhr|watch)(?![\wäöüß])', re.I)
ZUBEHOER = re.compile(r'\b(hülle|huelle|schutzfolie|displayschutz|armband[- ]?ersatz|ersatzarmband|'
                      r'ladekabel|ladegerät|ladestation|halterung|schutzglas|panzerglas)\b', re.I)
KRITISCH = re.compile(r'blutdruck|blutzucker|glukose|\bEKG\b|elektrokardiogramm|ecg\b', re.I)
# ⚠️ Zwischen «manuell» und dem Verb steht oft eine Aufzählung MIT KOMMA
# («manuell Blutdruck, Menstruationszyklus erfassen») — ohne Komma im Muster
# rutschte der Smart Ring durch die Ausnahme und wäre bereinigt worden.
MANUELL  = re.compile(r'manuell[a-z]*[\s\w,.\-–]{0,60}?(?:erfass|eintrag|eingeb|notier)', re.I)

def gql(q, v=None):
    req = urllib.request.Request(
        f'https://{SHOP}/admin/api/2024-10/graphql.json',
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
    n = re.sub(r'\b(?:Blutdruck|EKG|Blutzucker)[- ]?(?:messung|überwachung|funktion|analyse)\b', '', n, flags=re.I)
    n = re.sub(r'\b(?:Blutdruck|EKG|Blutzucker|Elektrokardiogramm)\b[- ]?', '', n, flags=re.I)
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
    # Auffangnetz: bleibt zu wenig übrig, lieber den alten Titel behalten als einen leeren
    return n if len(n) >= 8 else t

def satz_ok(s):
    """Erkennt Satzreste, die eine Streichung hinterlassen hat."""
    t = s.strip()
    if not t: return False
    if re.match(r'^[a-zäöü]', t): return False                    # beginnt klein
    if re.search(r'\b(Ihr|Ihre|Ihren|Ihrem|des|der|die|das|dem|den)\s+(der|die|das|dem|den)\b', t): return False
    if re.search(r'^\s*(und|sowie|oder|mit|für)\b', t, re.I): return False
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
        if not KRITISCH.search(titel + ' ' + klar): continue
        if MANUELL.search(klar) and not KRITISCH.search(titel):
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
            offen = bool(KRITISCH.search(neuT))
            open(LEDGER, 'a', encoding='utf-8').write(
                f"{pid}\t{'titel-offen' if offen else 'bereinigt'}\n")
            if offen:
                print(f"  ⚠️ Titel traegt die Aussage weiter: «{neuT[:60]}» — von Hand")
            time.sleep(0.8)
        geaendert += 1
    print(f"{'DRY ' if DRY else ''}bereinigt: {geaendert} · ohne Aenderung: {unveraendert}")
    if geaendert == 0: print("FERTIG")

main()
