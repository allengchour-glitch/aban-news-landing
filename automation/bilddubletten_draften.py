#!/usr/bin/env python3
"""bilddubletten_draften.py — draftet die im Bericht bestaetigten Dubletten.

WARUM GETRENNT (28.08.2026): `bilddubletten.py --FIX` musste vor dem Draften erst alle
49'000 aktiven Produkte paginieren, um `aktiv` zu fuellen — rund zehn Minuten. Der Container
faellt derzeit stuendlich auf einen alten Snapshot zurueck und hat den Lauf dreimal in genau
dieser Phase erwischt; gedraftet wurde nie zu Ende. Der Bericht `BILD-DUBLETTEN.md` enthaelt
aber bereits alles Noetige (ID, Datum, Preis, Titel, Urteil). Dieses Skript liest ihn und ist
in Sekunden durch — es ueberlebt damit jeden Rueckfall.

Es draftet NUR Zeilen mit dem Urteil **DUBLETTE** (>= 3 gemeinsame Bilder UND >= 80 % Anteil).
Bildfamilien bleiben unberuehrt. Je zusammenhaengender Gruppe bleibt das AELTESTE Produkt
aktiv — es traegt Bewertungen, interne Links und Verkaufshistorie.
⚠️ tagsAdd, nie productUpdate(tags:) — das ersetzt die ganze Liste.
"""
import json, os, re, subprocess, sys, time

TOK = open('/tmp/cj_shop_token.txt').read().strip()
URL = 'https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json'
BERICHT = 'dropship/BILD-DUBLETTEN.md'
LEDGER = 'dropship/_bilddubletten_gedraftet.txt'
DRY = os.environ.get('DRY') == '1'

def gql(q, v=None):
    for i in range(8):
        r = subprocess.run(['curl', '-s', '--max-time', '60', URL,
                            '-H', 'X-Shopify-Access-Token: ' + TOK,
                            '-H', 'Content-Type: application/json',
                            '-d', json.dumps({'query': q, 'variables': v or {}})],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get('data'): return d
            if 'THROTTLED' in json.dumps(d.get('errors') or ''): time.sleep(3); continue
        except Exception: pass
        time.sleep(2)
    return {}

if not os.path.exists(BERICHT):
    print('kein Bericht — nichts zu tun.'); sys.exit(0)

paare, art = [], None
for z in open(BERICHT):
    if z.startswith('- **'):
        art = 'DUBLETTE' if '**DUBLETTE**' in z else 'familie'
        aktuell = []
    m = re.match(r'\s+- (\d+) · (\d{4}-\d\d-\d\d) · CHF ([\d.]+) · \S+ · (.*)', z.rstrip())
    if m and art == 'DUBLETTE':
        aktuell.append((m.group(1), m.group(2), m.group(4)))
        if len(aktuell) == 2: paare.append(tuple(aktuell))

# Zusammenhaengende Gruppen — ein Produkt kann in mehreren Paaren stecken. Wer paarweise
# entscheidet, kann A im einen Paar behalten und im naechsten draften; im schlimmsten Fall
# bleibt von einer Dreiergruppe keines aktiv.
eltern, info = {}, {}
def wurzel(x):
    while eltern.get(x, x) != x: x = eltern[x]
    return x
for (a, da, ta), (b, db, tb) in paare:
    info[a] = (da, ta); info[b] = (db, tb)
    ra, rb = wurzel(a), wurzel(b)
    if ra != rb: eltern[rb] = ra
gruppen = {}
for pid in info: gruppen.setdefault(wurzel(pid), set()).add(pid)

erledigt = set()
if os.path.exists(LEDGER):
    erledigt = {z.split('\t')[0] for z in open(LEDGER, errors='ignore')}

n = uebersprungen = 0
led = open(LEDGER, 'a')
for mitglieder in gruppen.values():
    nach_alter = sorted(mitglieder, key=lambda p: info[p][0])
    behalten = nach_alter[0]
    for weg in nach_alter[1:]:
        if weg in erledigt: uebersprungen += 1; continue
        if DRY:
            print(f'  (DRY) {weg} → DRAFT, bleibt: {behalten} | {info[weg][1][:55]}'); n += 1; continue
        g = 'gid://shopify/Product/' + weg
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{status} userErrors{message}}}',
                {'i': {'id': g, 'status': 'DRAFT'}})
        e = (r.get('data') or {}).get('productUpdate', {}).get('userErrors')
        if e is None or e:
            print('  FEHLER', weg, e); continue
        gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
            {'id': g, 't': ['duplikat-auto-draft']})
        led.write(f'{weg}\tbildgleich mit {behalten}\t{info[weg][1][:60]}\n'); led.flush()
        print(f'  DRAFT {weg} (bleibt {behalten}) | {info[weg][1][:55]}')
        n += 1; time.sleep(0.3)
led.close()
print(f'FERTIG: {len(gruppen)} Gruppen · {n} gedraftet · {uebersprungen} schon im Ledger.')
