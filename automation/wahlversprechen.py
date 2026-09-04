#!/usr/bin/env python3
"""wahlversprechen.py — findet Produkte, deren TEXT eine Auswahl verspricht, die es nicht gibt.

WARUM (27.08.2026, drei Funde an einem Tag):
  · «Mehrzweck-Organizer fürs Pult»  — «Modelle mit vier, sechs, neun, zwölf oder fünfzehn
    Fächern, in Retro-Braun oder Pure Clear» → EINE Variante «Default Title».
  · «Rizinusöl-Wickel-Set»           — «Das Set ist in verschiedenen Grössen erhältlich»
    → EINE Variante. Und das ist die Seite, auf der 36 von 147 Suchsitzungen im Monat
    landen: unsere mit Abstand stärkste organische Eingangstür.
  · Dieselbe Klasse wie die Pflanzenlampe in fünf Kleidergrössen (23.08.).
Die Ursache ist immer dieselbe: Der Importer übernimmt den Text des CJ-LISTINGS, das zwölf
Varianten hat — angelegt wird bei uns eine. **Der Text beschreibt nicht, was wir verkaufen.**
Für die Kundin ist es ein Kaufabbruch ohne Spur: Sie sucht die Auswahl, findet keine, geht.

VERFAHREN: Nur Produkte mit EINER Variante ohne echte Option. Im Beschreibungstext wird nach
Formulierungen gesucht, die eine WAHL ankündigen — nicht nach blossen Aufzählungen.

STANDARD IST MELDEN (dropship/WAHLVERSPRECHEN.md). `FIX=1` streicht nur die Sätze, deren
Muster eindeutig ist; alles andere bleibt liegen. Ein halb gestrichener Satz ist schlimmer
als ein falscher (Lehre 21.08. zur Regex-Textchirurgie).
ENV: SEIT=JJJJ-MM-TT · CAP=... · FIX=1
"""
import json, os, re, subprocess, sys, time

TOK = open('/tmp/cj_shop_token.txt').read().strip()
URL = 'https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json'
BERICHT = 'dropship/WAHLVERSPRECHEN.md'
LEDGER = 'dropship/_wahlversprechen.txt'
CAP = int(os.environ.get('CAP', '4000'))
SEIT = os.environ.get('SEIT', '')
FIX = os.environ.get('FIX') == '1'

# ⚠️ Nur Formulierungen, die eine WAHL ankuendigen. «Erhaeltlich in Blau» allein ist eine
# Beschreibung, keine Auswahl — «erhaeltlich in verschiedenen Farben» ist eine.
WAHL = re.compile(
    # 31.08.: auch Zahlwoerter («In zwei Farben erhältlich: Weiss und Grau») — der
    # Kopfhaut-Roller mit EINER Variante trug genau diese Form, und sie entging dem Muster.
    r'in (?:verschiedenen|mehreren|unterschiedlichen|zwei|drei|vier|f[üu]nf) (?:Gr[öo]ssen|Farben|Ausf[üu]hrungen|Varianten|Modellen)'
    r'|(?:verschiedene|mehrere) (?:Gr[öo]ssen|Farben|Ausf[üu]hrungen|Modelle|Varianten) (?:erh[äa]ltlich|verf[üu]gbar|zur Auswahl)'
    r'|w[äa]hlen Sie (?:zwischen|aus)'
    r'|zur Auswahl stehen'
    r'|(?:Modelle|Ausf[üu]hrungen) mit .{0,40}(?:oder|und) .{0,25}(?:F[äa]chern|St[üu]ck|Gr[öo]ssen)'
    r'|erh[äa]ltlich in .{0,30}(?:und|oder) .{0,30}(?:Farben?|Gr[öo]ssen?)'
    # «Verfügbar in zwei Grössen: S und M» — an einem Produkt mit EINER Variante ist die
    # Zahl die Ankuendigung einer Wahl, nicht eine Eigenschaft (gefunden am Keramik-Napf).
    r'|(?:verf[üu]gbar|erh[äa]ltlich) in (?:zwei|drei|vier|f[üu]nf|sechs|\d+) '
    r'(?:Gr[öo]ssen|Farben|Ausf[üu]hrungen|Varianten|Modellen)'
    # 03.09.: Die HÄUFIGSTE Form fehlte — «Erhältlich in den Farben Weiss und Apricot»,
    # «Erhältlich in Grössen von L bis 5XL», «Erhältlich in diversen Grössen». Das Muster
    # darüber verlangt das Substantiv NACH dem «und»; im echten Text steht es DAVOR. Der
    # Wächter meldete deshalb 0, während der Voll-Audit 6'172 Produkte fand — ein Melder,
    # der nichts meldet, sieht aus wie ein sauberer Katalog. Der Plural trägt die Aussage:
    # «in einer Grösse» und «in der Farbe Schwarz» treffen bewusst nicht.
    r'|(?:verf[üu]gbar|erh[äa]ltlich|lieferbar) in '
    r'(?:den |diversen |unterschiedlichen |verschiedenen |mehreren )?'
    r'(?:Gr[öo]ssen|Farben|Ausf[üu]hrungen|Varianten|Modellen)(?![\wäöüß])', re.I)

def gql(q, v=None):
    gedrosselt, i = 0, 0
    while i < 8:
        r = subprocess.run(['curl', '-s', '--max-time', '60', URL,
                            '-H', 'X-Shopify-Access-Token: ' + TOK,
                            '-H', 'Content-Type: application/json',
                            '-d', json.dumps({'query': q, 'variables': v or {}})],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get('data'):
                return d
            if 'THROTTLED' in json.dumps(d.get('errors') or ''):
                gedrosselt += 1; time.sleep(3)
                if gedrosselt < 30:
                    continue
        except Exception:
            pass
        i += 1; time.sleep(2.5)
    return {}

erledigt = set()
if os.path.exists(LEDGER):
    erledigt = {z.split('\t')[0] for z in open(LEDGER, errors='ignore')}

abfrage = 'status:active' + (f' created_at:>={SEIT}' if SEIT else '')

# ⚠️ 03.09.2026: OHNE persistenten Cursor sah dieser Lauf IMMER dieselben ersten CAP Produkte.
# Bei 52'313 aktiven Produkten und CAP=6000 heisst das: 46'000 wurden NIE geprueft, und der
# Lauf meldete taeglich zufrieden «0 versprechen eine Auswahl», weil die ersten 6'000 laengst
# im Ledger stehen. Der Voll-Audit fand zur selben Zeit 6'172 Faelle. Dieselbe Falle wie der
# DEPTH-Reset der CJ-Runner (29.07.) und der Seiten-Zeiger des Bewertungs-Imports (28.08.):
# ein Lauf ohne Gedaechtnis ueber seinen Fortschritt arbeitet ewig am Anfang.
CURSOR = '/tmp/wahlversprechen_cursor.txt'
# ⚠️ 04.09.2026: ARBEITSLISTE STATT KATALOG-DURCHLAUF. Der Vollscan sieht bei CAP=6000 und
# 52'000 Produkten nur ein Achtel pro Tag — der taegliche Klassen-Vollscan misst die Klasse
# dagegen in EINEM Lauf und legt die Treffer in `dropship/_klassen/` ab. Ein Scan, viele
# Arbeitslisten: LISTE= arbeitet genau die ab, der Cursor-Weg bleibt als Netz fuer alles,
# was der Klassen-Scan (noch) nicht kennt.
LISTE = os.environ.get('LISTE', '')


def seiten_aus_liste(pfad):
    ids = [z.split('\t')[0].strip() for z in open(pfad) if z.strip()]
    Q = ('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title descriptionHtml '
         'variantsCount{count} options{name}}}}')
    for i in range(0, len(ids), 50):
        d = gql(Q, {'ids': [f'gid://shopify/Product/{x}' for x in ids[i:i + 50]]})
        yield {'nodes': [n for n in ((d.get('data') or {}).get('nodes') or []) if n],
               'pageInfo': {'hasNextPage': i + 50 < len(ids), 'endCursor': None}}
        time.sleep(0.3)


def seiten_aus_katalog(start):
    c = start
    while True:
        d = gql('''query($c:String,$q:String!){products(first:100,after:$c,query:$q){
                     pageInfo{hasNextPage endCursor}
                     nodes{id title descriptionHtml variantsCount{count} options{name}}}}''',
                {'c': c, 'q': abfrage})
        p = (d.get('data') or {}).get('products')
        if not p:
            print('PAUSE (Shopify blieb stumm) — naechster Lauf macht weiter.')
            return
        yield p
        if not p['pageInfo']['hasNextPage']:
            return
        c = p['pageInfo']['endCursor']


cur = None
if not SEIT and not LISTE and os.path.exists(CURSOR):
    cur = (open(CURSOR).read().strip() or None)
gesehen, treffer = 0, []
quelle = (seiten_aus_liste(LISTE) if LISTE else seiten_aus_katalog(cur))
for p in quelle:
    if gesehen >= CAP:
        break
    for a in p['nodes']:
        gesehen += 1
        if (a.get('variantsCount') or {}).get('count', 1) > 1:
            continue                       # es GIBT eine Auswahl
        namen = [o['name'] for o in (a.get('options') or [])]
        if namen and namen != ['Title']:
            continue                       # eine echte Option, auch wenn nur ein Wert
        txt = re.sub(r'<[^>]+>', ' ', a.get('descriptionHtml') or '')
        txt = re.sub(r'\s+', ' ', txt)
        m = WAHL.search(txt)
        if m:
            # 01.09.: SET-Inhalt ist keine Auswahl. «4 Bambus-Boxen in zwei Grössen:
            # 2× gross (30×20×12 cm), 2× klein» — BEIDE Grössen sind im Set, die Kundin
            # waehlt nichts. Erkennungszeichen: eine Stueckzahl «N×» vor einem BUCHSTABEN
            # direkt nach dem Treffer (× vor Ziffer ist eine Massangabe wie 30×20 und
            # zaehlt nicht). Solche Treffer sind Fehlalarme, nicht Befunde.
            danach = txt[m.start():m.start() + 120]
            if re.search(r'\d+\s*[×x]\s*[A-Za-zÄÖÜäöü]', danach):
                continue
            treffer.append((a['id'].split('/')[-1], a['title'], m.group(0)[:70]))
    cur = p['pageInfo']['endCursor'] if p['pageInfo']['hasNextPage'] else None

# Fortschritt merken, damit der naechste Lauf DORT weitermacht statt wieder am Anfang.
# Nur im Voll-Modus: ein SEIT- oder LISTE-Lauf hat einen eigenen, kleineren Ausschnitt und
# darf den Zeiger des Voll-Laufs nicht verstellen.
if not SEIT and not LISTE:
    with open(CURSOR, 'w') as f:
        f.write(cur or '')

print(f'{gesehen} aktive Produkte geprueft · {len(treffer)} versprechen eine Auswahl ohne Varianten')
if treffer:
    with open(BERICHT, 'w') as f:
        f.write('# Text verspricht eine Auswahl, das Produkt hat keine\n\n')
        f.write('Alle unten haben **eine** Variante ohne Option. Der Text stammt aus dem\n'
                'CJ-Listing, das mehrere Varianten hat — angelegt wurde bei uns eine.\n\n')
        for pid, t, stelle in treffer:
            f.write(f'- `{pid}` · {t[:70]}\n  - «…{stelle}…»\n')
    for pid, t, stelle in treffer[:15]:
        print(f'   {pid} · {t[:55]}\n      «{stelle}»')
elif os.path.exists(BERICHT):
    os.remove(BERICHT)

# ── REPARATUR (nur mit FIX=1) ────────────────────────────────────────────────────────────
# ⚠️ SATZWEISE, NIE MIT ROHEM REGEX (Lehre 21.08.: der erste Wearable-Entwurf hinterliess
# «Es misst praezise Ihr die Herzfrequenz» und Saetze, die klein anfingen). Und nur dort, wo
# das Wahlversprechen den Satz TRAEGT — sonst bleibt der Satz stehen und wird gemeldet.
GRENZE = 0.45          # Anteil, den die Fundstelle am SATZ haben muss, damit der Satz faellt
# ⚠️ Fuer LISTENPUNKTE gilt ein tieferer Wert. Grund: Die Regex trifft nur die Ankuendigung
# («in verschiedenen Farben»), nicht die angehaengte Aufzaehlung («: Gruen, Gelb, Pink,
# Weiss, Grau») — der Anteil sinkt dadurch unter die Satz-Grenze, obwohl der ganze Punkt
# nichts anderes sagt. Ein Listenpunkt ist kurz und hat in aller Regel genau eine Aussage.
GRENZE_LI = 0.30

# ⚠️ DIE AUFZAEHLUNG GEHOERT ZUM VERSPRECHEN (28.08.2026). «Es ist in verschiedenen Grössen
# erhältlich, darunter 21×26 cm, 25×30 cm, 30×80 cm.» — die Regex trifft nur die Ankuendigung
# (34 von 110 Zeichen, 31 %) und der Satz blieb stehen, obwohl er NICHTS anderes sagt. Folgt
# auf den Treffer eine Aufzaehlung mit ausdruecklichem Marker, zaehlt sie mit. Nur mit Marker —
# ohne ihn koennte hinter dem Komma ein zweiter Aussagesatz stehen (Lehre vom Haustier-Halsband:
# «…, lässt es sich optimal an den Stil anpassen» traegt eine zweite Aussage und bleibt).
# ⚠️ Zwischen Treffer und Aufzaehlung stehen oft ein bis zwei Woerter: die Regex trifft
# «in verschiedenen Grössen», im Satz folgt aber « erhältlich, darunter …». Bis zu zwei
# kurze Woerter sind deshalb erlaubt — mehr nicht, sonst frisst die Regel halbe Saetze.
# Ein Anschluss-Satzteil hinter der Aufzaehlung: dort steht eine ZWEITE Aussage, dann darf
# der Listenpunkt nicht fallen. Die Liste ist bewusst kurz und wird an echten Texten geprueft —
# eine Verbotsliste ist immer unvollstaendig, deshalb zusaetzlich die Laengengrenze oben.
ANSCHLUSS = re.compile(r'[.;]|\b(dazu|zudem|ausserdem|au[sß]erdem|damit|sodass|so dass|wodurch|'
                       r'ideal|perfekt|passt|bietet|sorgt|eignet|verf[üu]gt|besteht|wird geliefert|'
                       r'inklusive|inkl\.|lieferumfang)\b', re.I)

AUFZAEHLUNG = re.compile(r'^\s*(?:\w+\s*){0,2}[,:]\s*(?:darunter|z\.?\s?B\.?|etwa|wie|n[äa]mlich)\b', re.I)

# ⚠️ 04.09.2026: DIE AUFZAEHLUNG BRAUCHT NICHT IMMER EIN MARKERWORT. Nach dem Rueckstandslauf
# blieben Saetze wie «Das Bändercollar ist aus Stoff gefertigt und in verschiedenen Farben
# erhältlich: Weinrot, Schwarz, Ingwer, Dunkelgrün, Violett, Rosenrot und Blaustich.» stehen —
# ein Doppelpunkt und eine reine Wortliste, ohne «darunter». Der Satz sagt nichts anderes.
# Erkannt wird deshalb zusaetzlich: Doppelpunkt, danach bis zum Satzende NUR kurze Glieder
# (hoechstens drei Woerter), getrennt durch Komma oder «und/oder», ohne Verbform.
# ⚠️ Eng gefasst: ein Glied mit einem Verb («: Sie können frei wählen») ist ein Aussagesatz,
# kein Farbregister — dann bleibt der Satz stehen. Eine Verbotsliste ist nie vollstaendig,
# deshalb zusaetzlich die harte Laengengrenze von drei Woertern je Glied.
_VERBHAFT = re.compile(r'\b(?:ist|sind|wird|werden|kann|k[öo]nnen|haben|hat|l[äa]sst|'
                       r'bietet|sorgt|eignet|passt|w[äa]hlen|erlaubt|macht|gibt)\b', re.I)


def reine_liste(rest):
    """Steht nach dem Doppelpunkt bis zum Satzende nur eine Aufzaehlung?"""
    m = re.match(r'\s*(?:\w+\s*){0,2}:\s*([^.!?]{3,200})', rest)
    if not m:
        return 0
    liste = m.group(1)
    glieder = [g.strip() for g in re.split(r',|\bund\b|\boder\b', liste) if g.strip()]
    if len(glieder) < 2:
        return 0
    if any(len(g.split()) > 3 or _VERBHAFT.search(g) for g in glieder):
        return 0
    return m.end()

def treffer_anteil(satz, f):
    ende = f.end()
    rest = satz[ende:]
    if AUFZAEHLUNG.match(rest) or reine_liste(rest):
        ende = len(satz.rstrip('.!? '))
    return (ende - f.start()) / max(len(satz), 1)

def saetze(t):
    """Text in Saetze zerlegen, Trennzeichen behalten.

    ⚠️ 03.09.2026: Der Punkt in «(14.5 cm)» ist KEIN Satzende. Der alte Trenner schnitt dort,
    die Haelfte davor fiel als «Satz» weg, und im Text blieb «…Portionsgrössen.5 cm) oder
    1800 ml (21 cm).» stehen — ein Bruchstueck mit unpaariger Klammer. Drei Produkte hat es
    erwischt. Zwei Regeln verhindern es: nicht zwischen Ziffern trennen, und nicht innerhalb
    einer offenen Klammer. Eine Abkuerzung wie «ca.» oder «ml.» bleibt ein Satzende — dort
    steht danach ein Leerzeichen und meist ein Grossbuchstabe, das ist unschaedlich.
    """
    teile, start, tiefe = [], 0, 0
    for m in re.finditer(r'[()]|[.!?](?:\s|$)', t):
        z = m.group(0)[0]
        if z == '(':
            tiefe += 1; continue
        if z == ')':
            tiefe = max(0, tiefe - 1); continue
        if tiefe > 0:
            continue                                  # Punkt innerhalb einer Klammer
        if m.start() > 0 and t[m.start()-1].isdigit() and m.end() < len(t) and t[m.end():m.end()+1].isdigit():
            continue                                  # Dezimalpunkt zwischen Ziffern
        teile.append(t[start:m.end()]); start = m.end()
    if start < len(t):
        teile.append(t[start:])
    return teile

def bereinige(html):
    """Gibt (neues_html, was_entfernt) zurueck. Faellt nichts weg: (html, [])."""
    weg = []
    # 1) Listenpunkte, die NUR das Versprechen sind — der ganze Punkt faellt.
    def li(m):
        inhalt = re.sub(r'<[^>]+>', ' ', m.group(1))
        inhalt = re.sub(r'\s+', ' ', inhalt).strip()
        f = WAHL.search(inhalt)
        # ⚠️ 03.09.2026: Die Anteils-Regel allein ist seit der Muster-Erweiterung UNSICHER.
        # «Erhältlich in den Farben Blau und Grün, ideal für unterwegs» — der Kopf ist 24 von
        # 58 Zeichen, also 41 % und ueber der Grenze; der Punkt waere gefallen und haette
        # «ideal für unterwegs» mitgerissen. Ein Anschluss-Satzteil schuetzt jetzt IMMER,
        # unabhaengig vom Anteil. Wer ein Suchmuster verbreitert, muss die Schwellen
        # nachrechnen, die auf seiner alten Laenge beruhten.
        if f and ANSCHLUSS.search(inhalt[f.end():]):
            return m.group(0)
        if f and len(f.group(0)) / max(len(inhalt), 1) >= GRENZE_LI:
            weg.append('• ' + inhalt[:60]); return ''
        # 03.09.2026: Beginnt der Punkt MIT der Ankuendigung («Erhältlich in den Farben …»),
        # dann ist die Aufzaehlung dahinter das Versprechen selbst — der Anteil bleibt aber
        # klein, weil die Regex nur den Kopf trifft. Ein Listenpunkt, der so anfaengt, sagt
        # nichts anderes. ⚠️ ABER nur, wenn dahinter wirklich nur die Aufzaehlung steht:
        # Ein Anschlusssatz («…, dazu ein herausnehmbares Innenfutter») traegt eine zweite
        # Aussage, und ein halber Punkt ist schlimmer als ein falscher (Lehre 27.08.).
        if f and f.start() == 0 and len(inhalt) <= 170:
            weg.append('• ' + inhalt[:60]); return ''
        return m.group(0)
    neu = re.sub(r'<li[^>]*>(.*?)</li>', li, html, flags=re.S)

    # 2) Fliesstext NUR in REINEN Absaetzen — solchen ohne innere Tags.
    # ⚠️ WARUM SO ENG (Trockentest 27.08.2026): Bei «Ein <strong>schöner</strong> Ring,
    # erhältlich in Gold- oder Stahlfarben.» sieht ein Textknoten-Verfahren nur den Rest
    # «Ring, erhältlich in Gold- oder Stahlfarben.» — haelt ihn fuer einen ganzen Satz,
    # loescht ihn und hinterlaesst «Ein schöner». Genau der Fehler, den die Wearable-
    # Reparatur am 21.08. schon einmal gemacht hat. Ein Absatz mit Auszeichnung wird
    # deshalb NICHT angefasst, sondern nur gemeldet — lieber ein falscher Satz stehen
    # als ein halber.
    def absatz(m):
        innen = m.group(1)
        raus = []
        for s_ in saetze(innen):
            k = re.sub(r'\s+', ' ', s_).strip()
            f = WAHL.search(k)
            if f and k and treffer_anteil(k, f) >= GRENZE:
                weg.append(k[:70]); continue
            raus.append(s_)
        rest = ''.join(raus)
        return '' if not rest.strip() else m.group(0).replace(innen, rest)
    neu = re.sub(r'<p[^>]*>([^<>]*)</p>', absatz, neu)

    neu = re.sub(r'<li[^>]*>\s*</li>', '', neu)
    neu = re.sub(r'<(p|ul|ol)[^>]*>\s*</\1>', '', neu)
    neu = re.sub(r'[ \t]{2,}', ' ', neu)
    return neu, weg

gefixt = 0
if FIX and treffer:
    with open(LEDGER, 'a') as led:
        for pid, t, stelle in treffer:
            if pid in erledigt:
                continue
            d = gql('query($i:ID!){product(id:$i){descriptionHtml}}', {'i': 'gid://shopify/Product/' + pid})
            h = ((d.get('data') or {}).get('product') or {}).get('descriptionHtml') or ''
            if not h:
                continue
            neu, weg = bereinige(h)
            if not weg or neu == h:
                continue          # traegt den Satz nicht -> bleibt stehen und wird gemeldet
            r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{id} userErrors{message}}}',
                    {'i': {'id': 'gid://shopify/Product/' + pid, 'descriptionHtml': neu}})
            if (r.get('data') or {}).get('productUpdate', {}).get('userErrors'):
                continue
            led.write(f'{pid}\t{" | ".join(weg)[:120]}\t{t[:50]}\n'); led.flush()
            gefixt += 1
            if gefixt % 25 == 0:
                print(f'   {gefixt} Texte bereinigt', flush=True)
    print(f'{gefixt} Texte bereinigt (Ledger {LEDGER})')

# ⚠️ FERTIG haengt an der ZAHL DER PRUEFUNGEN, nicht an der Zahl der Befunde — ein
# Melde-Waechter wird sonst nie fertig und der Aufseher startet ihn endlos neu (Lehre 21.08.).
print(f'FERTIG: {gesehen} geprueft, {len(treffer)} gemeldet, {gefixt} bereinigt.')
