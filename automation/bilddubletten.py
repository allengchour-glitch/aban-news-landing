#!/usr/bin/env python3
"""bilddubletten.py — findet Produkt-Dubletten am BILDINHALT.

WARUM (27.08.2026, Betreiber-Screenshot): Auf der Startseite standen «Armband mit
Diamantherz» und «Armband ‹Hohles Herz› mit Zirkonia» nebeneinander — gleicher Preis,
gleiches Foto, zwei Produkte. Keine der bestehenden Wachen konnte das sehen:
  · Titelvergleich  → die Titel sind verschieden.
  · SKU-Vergleich   → CJ vergibt je Listing eine eigene SKU (…1630600 / …1603000).
  · Handle-Vergleich → verschiedene Titel ergeben verschiedene Slugs.
  · Bild-URL-Vergleich → CJ lädt dasselbe Foto je Listing unter NEUER CDN-URL hoch;
    genau daran ist der `imgKey`-Dedup am 26.07. gescheitert («0 bild-identische»).
Der Inhalt ist aber gleich: alle fünf Bilder beider Produkte hatten dieselbe MD5-Summe.
**Der Dateiname ist verschieden, die Bytes sind es nicht.** Darauf prüft dieser Wächter.

VERFAHREN (billig sieben, teuer bestätigen):
  1. Nur das HAUPTBILD jedes aktiven Produkts wird geladen und gehasht — einmal.
     Das Ergebnis steht im Ledger und wird nur neu geholt, wenn sich die Bild-URL ändert.
  2. Nur für Verdachtsgruppen (gleicher Hash) werden ALLE Medien beider Produkte gehasht.
     Erst ab ZWEI gemeinsamen Bildern gilt es als Dublette — ein einzelnes gemeinsames
     Bild kann ein generisches Verpackungs- oder Grössenbild sein.

STANDARD IST MELDEN. `FIX=1` draftet die JÜNGERE Fassung (die ältere hat Bewertungen,
Links und Verkaufshistorie) mit Tag `duplikat-auto-draft` — nie löschen, nie beide.
⚠️ Tags NUR mit tagsAdd; `productUpdate(input:{tags:…})` ersetzt die ganze Liste.

ENV: HASHCAP=400 (Bilder je Lauf) · SEIT=JJJJ-MM-TT · FIX=1 · DRY=1
"""
import json, os, subprocess, sys, time, hashlib, re
import concurrent.futures as cf

def _token():
    """Erst die Datei, bei Ablauf selbst holen.

    ⚠️ Der Snapshot-Rewind stellt /tmp/cj_shop_token.txt auf einen ALTEN, laengst
    abgelaufenen Stand zurueck (Token gelten ~24 h). Ein Waechter, der nur liest, meldet
    dann «Shopify blieb stumm» und tut den ganzen Tag nichts — obwohl nur der Zettel alt
    war. Deshalb holt er sich bei Bedarf selbst einen (Client-Credentials-Grant).
    """
    t = ''
    try:
        t = open('/tmp/cj_shop_token.txt').read().strip()
    except Exception:
        pass
    if t:
        r = subprocess.run(['curl', '-s', '--max-time', '30',
                            'https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json',
                            '-H', 'X-Shopify-Access-Token: ' + t, '-H', 'Content-Type: application/json',
                            '-d', '{"query":"query{shop{id}}"}'], capture_output=True, text=True)
        if '"shop"' in r.stdout:
            return t
    cid = os.environ.get('SHOPIFY_CLIENT_ID'); cs = os.environ.get('SHOPIFY_CLIENT_SECRET')
    if not (cid and cs):
        for z in open('/tmp/secrets_env.sh', errors='ignore') if os.path.exists('/tmp/secrets_env.sh') else []:
            m = re.match(r'\s*(?:export\s+)?(SHOPIFY_CLIENT_ID|SHOPIFY_CLIENT_SECRET)=[\'"]?([^\'"\s]+)', z)
            if m:
                if m.group(1).endswith('ID'): cid = m.group(2)
                else: cs = m.group(2)
    if not (cid and cs):
        return t
    r = subprocess.run(['curl', '-s', '--max-time', '30',
                        'https://au3j0y-hq.myshopify.com/admin/oauth/access_token',
                        '-H', 'Content-Type: application/json',
                        '-d', json.dumps({'client_id': cid, 'client_secret': cs,
                                          'grant_type': 'client_credentials'})], capture_output=True, text=True)
    try:
        n = json.loads(r.stdout).get('access_token')
    except Exception:
        n = None
    if n:
        open('/tmp/cj_shop_token.txt', 'w').write(n)
        print('Shopify-Token war abgelaufen — neu geholt.')
        return n
    return t

# ⚠️ SELBSTSPERRE (28.08.2026). Der Aufseher startet diesen Lauf einmal taeglich, und ein
# Lauf von Hand kann daneben liegen — heute liefen zwei Instanzen gleichzeitig ueber 49'000
# Produkte und teilten sich Shopifys Punkte, waehrend beide denselben Ledger schrieben.
# Der Zeitstempel-Riegel des Aufsehers greift dagegen nicht: Er sieht nur seinen eigenen Start.
# Eine Sperre im Skript schuetzt JEDEN Aufrufweg — dieselbe Lehre wie beim Aufseher selbst
# («Selbstpruefung ist die erste Verteidigung, nie die einzige», aber hier ist sie die
# richtige Stelle, weil es genau einen Prozess geben soll).
import fcntl
_sperre = open('/tmp/bilddubletten.lock', 'w')
try:
    fcntl.flock(_sperre, fcntl.LOCK_EX | fcntl.LOCK_NB)
except OSError:
    print('laeuft bereits — dieser Start endet.')
    sys.exit(0)

TOK = _token()
URL = 'https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json'
LEDGER = 'dropship/_bildhash.txt'
BERICHT = 'dropship/BILD-DUBLETTEN.md'
GETAN = 'dropship/_bilddubletten_gedraftet.txt'
HASHCAP = int(os.environ.get('HASHCAP', '400'))
SEIT = os.environ.get('SEIT', '')
FIX = os.environ.get('FIX') == '1'

def gql(q, v=None):
    # Drosselung ist eine Warteanweisung, kein Abbruchgrund (Lehre 21./27.08.).
    gedrosselt = 0
    i = 0
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
                gedrosselt += 1
                time.sleep(3)
                if gedrosselt < 30:
                    continue          # verbraucht keinen Versuch
        except Exception:
            pass
        i += 1
        time.sleep(2.5)
    return {}

def hol(url):
    r = subprocess.run(['curl', '-sL', '--max-time', '25', url.split('?')[0]], capture_output=True)
    return r.stdout if len(r.stdout) > 800 else None

def basis(url):
    return url.split('?')[0].split('/')[-1]

# ── Ledger: pid \t bild-dateiname \t md5
bekannt = {}
if os.path.exists(LEDGER):
    for z in open(LEDGER, errors='ignore'):
        t = z.rstrip('\n').split('\t')
        if len(t) >= 3:
            bekannt[t[0]] = (t[1], t[2])

# ⚠️ SEITE FUER SEITE HASHEN, nicht erst alles laden (27.08.2026). Die erste Fassung holte
# ALLE aktiven Produkte (465 Seiten bei 46'500 Artikeln) und begann erst danach zu hashen —
# minutenlang passierte sichtbar nichts, und ein Shopify-Aussetzer auf Seite 400 warf die
# ganze Vorarbeit weg. Jetzt wird jede Seite sofort abgearbeitet: Der Ledger waechst von der
# ersten Sekunde an, und ein Abbruch kostet hoechstens die angefangene Seite.
abfrage = 'status:active' + (f' created_at:>={SEIT}' if SEIT else '')
cur, alle, neu = None, [], 0
log = open(LEDGER, 'a')
while True:
    d = gql('''query($c:String,$q:String!){products(first:100,after:$c,query:$q){
                 pageInfo{hasNextPage endCursor}
                 nodes{id title createdAt featuredImage{url}
                       variants(first:1){nodes{sku price}}}}}''', {'c': cur, 'q': abfrage})
    p = (d.get('data') or {}).get('products')
    if not p:
        print('PAUSE (Shopify blieb stumm) — Ledger bleibt gueltig, naechster Lauf macht weiter.')
        break
    alle += p['nodes']
    # ⚠️ Die Bilder liegen auf Shopifys CDN, nicht hinter der Admin-API — fuer sie gilt kein
    # Punktebudget und keine Drosselung. Sequentiell schaffte der Lauf 1,1 Bilder/s, also
    # rund 12 Stunden fuer den ganzen Katalog. Sechs parallele Abrufe kuerzen das auf
    # Stunden; die Admin-Abfragen selbst bleiben streng seriell.
    offen = []
    for a in p['nodes']:
        if neu + len(offen) >= HASHCAP:
            break                     # weiterpaginieren (fuer die Gruppen), aber nicht laden
        pid = a['id'].split('/')[-1]
        u = (a.get('featuredImage') or {}).get('url')
        if not u:
            continue
        b = basis(u)
        if bekannt.get(pid, ('', ''))[0] == b:
            continue                  # unveraendert -> nicht erneut laden
        offen.append((pid, b, u))
    if offen:
        with cf.ThreadPoolExecutor(max_workers=6) as pool:
            for (pid, b, u), roh in zip(offen, pool.map(lambda t: hol(t[2]), offen)):
                if roh is None:
                    continue          # Netzfehler ist keine Erledigung
                h = hashlib.md5(roh).hexdigest()
                bekannt[pid] = (b, h)
                log.write(f'{pid}\t{b}\t{h}\n')
                neu += 1
        log.flush()
        print(f'  {neu} gehasht ({len(alle)} Produkte gesehen)', flush=True)
    if not p['pageInfo']['hasNextPage']:
        break
    cur = p['pageInfo']['endCursor']
log.close()
print(f'{len(alle)} aktive Produkte gesehen · {neu} Hauptbilder neu gehasht ({len(bekannt)} im Ledger)')

# ── Gruppen bilden, aber nur ueber Produkte, die JETZT aktiv sind.
aktiv = {a['id'].split('/')[-1]: a for a in alle}
gruppen = {}
for pid, (b, h) in bekannt.items():
    if pid in aktiv:
        gruppen.setdefault(h, []).append(pid)
kand = {h: v for h, v in gruppen.items() if len(v) > 1}
print(f'{len(kand)} Verdachtsgruppen (gleiches Hauptbild)')

def medien(pid):
    d = gql('query($i:ID!){product(id:$i){media(first:15){nodes{... on MediaImage{image{url}}}}}}',
            {'i': 'gid://shopify/Product/' + pid})
    n = ((d.get('data') or {}).get('product') or {}).get('media', {}).get('nodes', [])
    s = set()
    for m in n:
        if not m.get('image'):
            continue
        roh = hol(m['image']['url'])
        if roh:
            s.add(hashlib.md5(roh).hexdigest())
    return s

befunde = []
for h, pids in kand.items():
    saetze = {p: medien(p) for p in pids}
    # Erst ab ZWEI gemeinsamen Bildern: ein einzelnes gemeinsames Foto kann ein
    # generisches Verpackungs-/Groessenbild sein und beweist nichts.
    for i in range(len(pids)):
        for j in range(i + 1, len(pids)):
            a, b = pids[i], pids[j]
            gem = saetze[a] & saetze[b]
            klein = min(len(saetze[a]), len(saetze[b])) or 1
            anteil = len(gem) / klein
            # ⚠️ «ZWEI GEMEINSAME BILDER» WAR ZU SCHWACH (erster Volllauf, 27.08.2026).
            # Zubehoer-FAMILIEN teilen sich Fotos, ohne dasselbe Produkt zu sein: «USB-Ladegeraet
            # fuer 18650», «Akku & Ladegeraet Set» und «Akku & Ladegeraet fuer Taschenlampen»
            # zeigen dieselbe Ladeschale — drei echte Artikel. Und ein 18650-Einzelakku teilte
            # 2 von 8 Bildern mit einem 10er-Pack. Entschieden wird deshalb nach dem ANTEIL am
            # kleineren Bildsatz, nicht nach der blossen Zahl:
            #   >= 0.8  → Dublette (Prusa-Heizbett: 5 von 5)
            #   >= 0.5  → Bildfamilie, nur melden (Ladegeraet-Trio: 3 von 5)
            #   darunter → gemeinsames Verpackungs-/Groessenbild, kein Befund
            # ⚠️ DIE ZWEI-BILDER-SCHWELLE WAR RICHTIG UND ICH HABE SIE WEGGENOMMEN
            # (28.08.2026). Beim Umstieg auf den ANTEIL ist die harte Bedingung «mindestens
            # zwei gemeinsame Bilder» entfallen — und bei Produkten mit nur EINEM Bild ist
            # der Anteil zwangslaeufig 100 %. Ergebnis im ersten Volllauf: «Schweiz-Magnet
            # Matterhorn» und «Schweiz-Sticker Matterhorn» galten als Dublette, ebenso
            # Magnet/Tasche/Kissen/Mauspad «Gruezi» — eine ganze Motivfamilie, vier echte
            # Produkte, die sich EIN Motivfoto teilen. Beide Bedingungen gelten jetzt
            # zusammen: mindestens zwei gemeinsame Bilder UND ein hoher Anteil.
            if len(gem) >= 2 and anteil >= 0.5:
                befunde.append((a, b, len(gem), len(saetze[a]), len(saetze[b]), anteil))

def zeile(pid):
    a = aktiv[pid]
    v = (a['variants']['nodes'] or [{}])[0]
    return f"{pid} · {a['createdAt'][:10]} · CHF {v.get('price')} · {v.get('sku')} · {a['title'][:60]}"

if befunde:
    with open(BERICHT, 'w') as f:
        f.write('# Bild-identische Produkte\n\n')
        f.write('Gefunden am Bild**inhalt** (MD5), nicht an Titel, SKU oder Bild-URL — die\n'
                'drei taeuschen bei CJ-Doppellistings alle drei.\n\n')
        for a, b, gem, na, nb, anteil in sorted(befunde, key=lambda x: -x[5]):
            art = 'DUBLETTE' if (anteil >= 0.8 and gem >= 3) else 'Bildfamilie — von Hand ansehen'
            f.write(f'- **{art}** · {gem} gemeinsame Bilder ({na} bzw. {nb} insgesamt, {anteil:.0%})\n')
            f.write(f'  - {zeile(a)}\n  - {zeile(b)}\n')
    print(f'⚠️ {len(befunde)} bild-identische Paare -> {BERICHT}')
    for a, b, gem, na, nb, anteil in sorted(befunde, key=lambda x: -x[5]):
        print(f'   {gem} gemeinsam ({anteil:.0%}):\n     {zeile(a)}\n     {zeile(b)}')
elif os.path.exists(BERICHT):
    os.remove(BERICHT)          # ein Bericht ohne Befund wird nicht gelesen

gedraftet = 0
if FIX and befunde:
    schon = set()
    if os.path.exists(GETAN):
        schon = {z.split('\t')[0] for z in open(GETAN, errors='ignore')}
    with open(GETAN, 'a') as led:
        # ⚠️ PAARWEISE DRAFTEN IST NICHT SICHER (28.08.2026). Ein Produkt kann in MEHREREN
        # Paaren stecken (A~B und A~C — im Bericht steht 15447564222849 zweimal). Wer jedes
        # Paar einzeln entscheidet, kann A in einem Paar behalten und im naechsten draften —
        # im schlimmsten Fall bleibt von einer Dreiergruppe KEINES aktiv. Deshalb werden erst
        # die zusammenhaengenden Gruppen gebildet und je Gruppe genau das AELTESTE behalten.
        eltern = {}
        def wurzel(x):
            while eltern.get(x, x) != x: x = eltern[x]
            return x
        for a, b, gem, na, nb, anteil in befunde:
            if anteil < 0.8 or gem < 3: continue
            ra, rb = wurzel(a), wurzel(b)
            if ra != rb: eltern[rb] = ra
        gruppen = {}
        for a, b, gem, na, nb, anteil in befunde:
            if anteil < 0.8 or gem < 3: continue
            for x in (a, b): gruppen.setdefault(wurzel(x), set()).add(x)
        zu_draften = []
        for mitglieder in gruppen.values():
            nach_alter = sorted(mitglieder, key=lambda p: aktiv[p]['createdAt'])
            behalten = nach_alter[0]
            for x in nach_alter[1:]:
                zu_draften.append((x, behalten))
        for weg, behalten in zu_draften:
            if weg in schon:
                continue
            r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{status} userErrors{message}}}',
                    {'i': {'id': 'gid://shopify/Product/' + weg, 'status': 'DRAFT'}})
            if (r.get('data') or {}).get('productUpdate', {}).get('userErrors'):
                continue
            gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {'id': 'gid://shopify/Product/' + weg, 't': ['duplikat-auto-draft']})
            led.write(f'{weg}\tbildgleich mit {behalten}\t{aktiv[weg]["title"][:60]}\n')
            led.flush(); gedraftet += 1
    print(f'{gedraftet} juengere Dubletten gedraftet (Tag duplikat-auto-draft)')

# ⚠️ FERTIG heisst «nichts mehr zu TUN», nicht «nichts mehr zu SEHEN» (Lehre 21.08.).
# Gemeldete Paare sind ein Rueckstand im Bericht, keine offene Arbeit — sonst startet der
# Aufseher diesen Lauf endlos neu.
print(f'FERTIG: {neu} gehasht, {len(befunde)} Paare gemeldet, {gedraftet} gedraftet.')
