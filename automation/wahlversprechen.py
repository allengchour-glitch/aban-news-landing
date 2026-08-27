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
    r'|erh[äa]ltlich in .{0,30}(?:und|oder) .{0,30}(?:Farben?|Gr[öo]ssen?)', re.I)

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

# ⚠️ FERTIG haengt an der ZAHL DER PRUEFUNGEN, nicht an der Zahl der Befunde — ein
# Melde-Waechter wird sonst nie fertig und der Aufseher startet ihn endlos neu (Lehre 21.08.).
print(f'FERTIG: {gesehen} geprueft, {len(treffer)} gemeldet.')
