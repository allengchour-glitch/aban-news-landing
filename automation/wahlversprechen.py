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
    r'in (?:verschiedenen|mehreren|unterschiedlichen) (?:Gr[öo]ssen|Farben|Ausf[üu]hrungen|Varianten|Modellen)'
    r'|(?:verschiedene|mehrere) (?:Gr[öo]ssen|Farben|Ausf[üu]hrungen|Modelle|Varianten) (?:erh[äa]ltlich|verf[üu]gbar|zur Auswahl)'
    r'|w[äa]hlen Sie (?:zwischen|aus)'
    r'|zur Auswahl stehen'
    r'|(?:Modelle|Ausf[üu]hrungen) mit .{0,40}(?:oder|und) .{0,25}(?:F[äa]chern|St[üu]ck|Gr[öo]ssen)'
    r'|erh[äa]ltlich in .{0,30}(?:und|oder) .{0,30}(?:Farben?|Gr[öo]ssen?)'
    # «Verfügbar in zwei Grössen: S und M» — an einem Produkt mit EINER Variante ist die
    # Zahl die Ankuendigung einer Wahl, nicht eine Eigenschaft (gefunden am Keramik-Napf).
    r'|(?:verf[üu]gbar|erh[äa]ltlich) in (?:zwei|drei|vier|f[üu]nf|sechs|\d+) '
    r'(?:Gr[öo]ssen|Farben|Ausf[üu]hrungen|Varianten|Modellen)', re.I)

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
cur, gesehen, treffer = None, 0, []
while gesehen < CAP:
    d = gql('''query($c:String,$q:String!){products(first:100,after:$c,query:$q){
                 pageInfo{hasNextPage endCursor}
                 nodes{id title descriptionHtml variantsCount{count} options{name}}}}''',
            {'c': cur, 'q': abfrage})
    p = (d.get('data') or {}).get('products')
    if not p:
        print('PAUSE (Shopify blieb stumm) — naechster Lauf macht weiter.')
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
            treffer.append((a['id'].split('/')[-1], a['title'], m.group(0)[:70]))
    if not p['pageInfo']['hasNextPage']:
        break
    cur = p['pageInfo']['endCursor']

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
AUFZAEHLUNG = re.compile(r'^\s*(?:\w+\s*){0,2}[,:]\s*(?:darunter|z\.?\s?B\.?|etwa|wie|n[äa]mlich)\b', re.I)

def treffer_anteil(satz, f):
    ende = f.end()
    if AUFZAEHLUNG.match(satz[ende:]):
        ende = len(satz.rstrip('.!? '))
    return (ende - f.start()) / max(len(satz), 1)

def saetze(t):
    """Text in Saetze zerlegen, Trennzeichen behalten."""
    teile, start = [], 0
    for m in re.finditer(r'[.!?](?:\s|$)', t):
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
        if f and len(f.group(0)) / max(len(inhalt), 1) >= GRENZE_LI:
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
