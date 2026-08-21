#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
alt_texte_nachziehen.py — füllt fehlende Bild-Alt-Texte in einem ZEITFENSTER gegen LIVE.

Warum es diesen Lauf zusätzlich zu automation/alt_text_backfill.mjs gibt (20.08.2026):
Der Backfill sortiert CREATED_AT absteigend und merkt sich einen Cursor. Neue Produkte
entstehen aber genau VORNE in dieser Sortierung — also HINTER dem Cursor, der dort längst
vorbeigelaufen ist. Ein Neuestes-zuerst-Sweep mit Cursor kann deshalb NIE etwas sehen, was
nach seinem Start angelegt wurde. Am 18.08. 23:41 hat er zudem «FERTIG» ins Log geschrieben;
`fixer_keepalive.sh` startet einen Lauf mit ^FERTIG im Log nie wieder. Ab da lief kein
Alt-Text-Nachfüller mehr, während der CJ-Grind täglich ~2'000 Produkte nachlegte.

Dieser Lauf arbeitet deshalb bewusst ÜBER EIN FENSTER (SEIT=JJJJ-MM-TT) statt über einen
Cursor — dieselbe Lehre wie beim Medizin-Zweck-Wächter: gegen LIVE, nicht gegen einen
Schnappschuss, und ohne Erledigt-Zeichen, das eine spätere Lücke unsichtbar macht.

Alt-Schema wie im Bestand: "<Titel> – Bild N | LuxeStyle", N = Position in der Medienliste.
Es werden AUSSCHLIESSLICH Bilder ohne Alt angefasst — vorhandene Alt-Texte bleiben, wie sie
sind (idempotent, gefahrlos wiederholbar).

ENV: SEIT=2026-08-17 · [LIMIT=99999 Produkte] · [DRY=1] · [STATUS=active]
"""
import json, os, sys, time, urllib.request

SHOP = 'au3j0y-hq.myshopify.com'
API  = '2025-01'
import datetime as _dt
# Ohne SEIT: die letzten 4 Tage. Der tägliche Lauf im Aufseher deckt sich damit
# vierfach selbst ab — fällt er ein paar Tage aus, holt der nächste Lauf die Lücke
# trotzdem ein. Für eine grössere Nachreparatur SEIT von Hand weiter zurücksetzen.
SEIT   = os.environ.get('SEIT') or (_dt.date.today() - _dt.timedelta(days=4)).isoformat()
LIMIT  = int(os.environ.get('LIMIT', '99999'))
DRY    = os.environ.get('DRY') == '1'
STATUS = os.environ.get('STATUS', 'active')
# REVERSE=1 arbeitet dasselbe Fenster von der NEUESTEN Seite her ab. Zwei Läufe (vorwärts +
# rückwärts) treffen sich in der Mitte und halbieren die Laufzeit. Das ist gefahrlos, weil
# der Lauf nur LEERE Alt-Texte füllt: trifft der zweite Lauf ein schon repariertes Produkt,
# findet er nichts mehr zu tun. Doppelt gelesen wird, doppelt geschrieben nie.
REVERSE = os.environ.get('REVERSE') == '1'
# BIS grenzt das Fenster nach oben ab (created_at:<BIS). Damit lässt sich eine grosse
# Nachreparatur tageweise auf mehrere Läufe aufteilen, die sich NICHT überlappen.
BIS   = os.environ.get('BIS', '')
# Wie viele Dateien pro fileUpdate. 25 ist konservativ; Shopify nimmt deutlich mehr, und
# jeder gesparte Aufruf ist eine ganze Netz-Rundreise weniger — bei ~40'000 Bildern der
# Unterschied zwischen zwei Stunden und zwanzig Minuten.
BATCH = int(os.environ.get('BATCH', '100'))
LEDGER_SUFFIX = os.environ.get('LEDGER_SUFFIX', '')
LEDGER = 'dropship/_alt_texte_fenster.txt'

def token():
    for p in ('/tmp/cj_shop_token.txt',):
        try:
            t = open(p).read().strip()
            if t: return t
        except Exception: pass
    cid, cs = os.environ.get('SHOPIFY_CLIENT_ID'), os.environ.get('SHOPIFY_CLIENT_SECRET')
    if cid and cs:
        req = urllib.request.Request(f'https://{SHOP}/admin/oauth/access_token',
            data=json.dumps({'client_id':cid,'client_secret':cs,'grant_type':'client_credentials'}).encode(),
            headers={'Content-Type':'application/json'})
        return json.load(urllib.request.urlopen(req, timeout=30)).get('access_token')
    return None

TOK = token()
if not TOK:
    print('no-op: kein Shopify-Token.'); sys.exit(0)

def gql(q, v=None, tries=5):
    """Fehlt 'data', wird kurz gewartet und erneut versucht — Shopify drosselt nach Kosten."""
    for a in range(tries):
        try:
            req = urllib.request.Request(f'https://{SHOP}/admin/api/{API}/graphql.json',
                data=json.dumps({'query':q,'variables':v or {}}).encode(),
                headers={'X-Shopify-Access-Token':TOK,'Content-Type':'application/json'})
            j = json.load(urllib.request.urlopen(req, timeout=60))
        except Exception as e:
            time.sleep(3 + 2*a); continue
        if j.get('data') is not None:
            return j['data']
        time.sleep(3 + 2*a)
    return None

Q = '''query($c:String,$q:String){ products(first:40, after:$c, query:$q, sortKey:CREATED_AT, reverse:REV){
  pageInfo{ hasNextPage endCursor }
  nodes{ id title featuredMedia{ id }
         media(first:25){ nodes{ ... on MediaImage { id alt } } } } } }'''
Q = Q.replace('reverse:REV', 'reverse:true' if REVERSE else 'reverse:false')
MUT = 'mutation($files:[FileUpdateInput!]!){ fileUpdate(files:$files){ files{ id } userErrors{ field message } } }'

done = set()
if os.path.exists(LEDGER):
    done = {l.strip() for l in open(LEDGER) if l.strip()}

buf, wartend, cursor = [], [], None
prods = seen = fixed = fehler = hauptbild = 0
lf = open(LEDGER, 'a')

def quittieren():
    """Erst NACH dem Schreiben quittieren. Andersherum würde ein Abbruch mit vollem Puffer
    Produkte als erledigt markieren, deren Alt-Texte nie ankamen — dieselbe Falle wie beim
    Post-Automaten: erst die Nebenwirkung, dann das Erledigt-Zeichen."""
    if DRY or not wartend: wartend.clear(); return
    for pid in wartend: lf.write(pid + '\n')
    lf.flush(); wartend.clear()

def flush():
    """Schreibt den Puffer. Höchstens 2 Anfragen/s, deshalb der Schlaf danach."""
    global fixed, fehler
    if not buf:
        quittieren(); return
    if DRY:
        fixed += len(buf); buf.clear(); wartend.clear(); return
    r = gql(MUT, {'files': buf})
    errs = (r or {}).get('fileUpdate', {}).get('userErrors') or []
    if errs:
        fehler += len(buf); wartend.clear()
        print('  ✗ fileUpdate:', json.dumps(errs, ensure_ascii=False)[:160], flush=True)
    else:
        fixed += len((r or {}).get('fileUpdate', {}).get('files') or [])
        quittieren()
    buf.clear(); time.sleep(0.15)

query = f'status:{STATUS} created_at:>={SEIT}' + (f' created_at:<{BIS}' if BIS else '')
print(f'Fenster: {query} · {"RUECKWAERTS" if REVERSE else "vorwaerts"} · DRY={DRY} · Ledger {LEDGER} ({len(done)} erledigt)', flush=True)

while prods < LIMIT:
    d = gql(Q, {'c': cursor, 'q': query})
    if not d or not d.get('products'):
        print('Abbruch: keine Antwort von Shopify.', flush=True); break
    page = d['products']
    for n in page['nodes']:
        if prods >= LIMIT: break
        prods += 1
        if n['id'] in done: continue
        title = (n.get('title') or '').strip()[:90]
        if not title: continue
        fm = (n.get('featuredMedia') or {}).get('id')
        offen = []
        for i, m in enumerate(n['media']['nodes']):
            mid = m.get('id')
            if not mid: continue                      # Videos u. a. haben hier kein id-Feld
            if (m.get('alt') or '').strip(): continue  # vorhandenes Alt NIE überschreiben
            offen.append({'id': mid, 'alt': f'{title} – Bild {i+1} | LuxeStyle'})
            if mid == fm: hauptbild += 1
        if offen:
            seen += 1
            buf.extend(offen); wartend.append(n['id'])
            if len(buf) >= BATCH:
                flush()
        elif not DRY:            # nichts zu tun → sofort quittieren (ein Probelauf NIE:
            lf.write(n['id'] + '\n'); lf.flush()   # sonst überspringt der echte Lauf ihn)
    if prods % 400 < 40:
        print(f'  … {prods} Produkte geprüft, {seen} mit Lücke, {fixed} Alt-Texte gesetzt '
              f'({hauptbild} davon Hauptbilder)', flush=True)
    if not page['pageInfo']['hasNextPage']: break
    cursor = page['pageInfo']['endCursor']
    time.sleep(0.2)

flush()
lf.close()
print(f'FENSTER DURCH: {prods} Produkte geprüft · {seen} hatten Lücken · '
      f'{fixed} Alt-Texte gesetzt · {hauptbild} davon Hauptbilder · {fehler} Fehler', flush=True)
