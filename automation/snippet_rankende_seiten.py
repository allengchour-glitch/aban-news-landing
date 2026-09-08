#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
snippet_rankende_seiten.py — gibt den Seiten, die bei Google WIRKLICH ranken, einen
Suchergebnis-Text, der etwas über die Ware sagt.

DER FUND (29.08.2026): Von 65 aktiven Adressen, für die luxestyle.ch in Googles Top 100
steht, tragen **50** als Meta-Beschreibung nur den Baustein
«<Produktname> – bei LuxeStyle Schweiz. Gratis-Versand ab CHF 50, 30 Tage Rückgabe.»
Genau dieser Satz steht im Google-Ergebnis unter dem Titel. Er wiederholt den Titel und
sagt über das Produkt nichts. Wer auf Position 17 steht, wird nur geklickt, wenn das
Ergebnis überzeugt — der Text darunter ist das einzige Argument, das man dort hat.

Betroffen sind Seiten mit echtem Verkehr: «handstaubsauger» (5'400/Monat),
«kleiner luftbefeuchter» (260, Position 23), «holzspiegel» (140, Position 17).

WAS ES SCHREIBT: den ERSTEN SATZ aus der Produktbeschreibung, wörtlich — plus, wenn noch
Platz ist, ein konkretes Merkmal aus der Liste «Das zeichnet es aus». Beides steht schon
auf der Seite. **Es wird nichts erfunden und nichts umformuliert.** Ein Suchergebnis, das
mehr verspricht als die Seite hält, ist ein teurerer Fehler als ein langweiliges.

⚠️ `productUpdate(input:{seo:{…}})` ERSETZT das ganze SEO-Objekt. Der SEO-Titel wird
deshalb mitgelesen und unverändert mitgeschickt; sonst wäre er nach dem Lauf leer.

⚠️ NUR die rankenden Seiten (`dropship/_rankings_semrush.csv`). Über 46'000 Produkte zu
laufen wäre möglich, aber der Nutzen entsteht dort, wo Google die Seite schon zeigt.

ZWEITER MODUS `MODUS=katalog` (29.08.2026): Semrush zeigt für luxestyle.ch **keine einzige
Platzierung auf Seite 1** — die Kassengänge aus der Suche stammen also aus dem langen
Schwanz, aus Anfragen, die kein Ranking-Werkzeug verfolgt. Damit ist JEDE Produktseite ein
Los, und ein Baustein-Snippet verschenkt es. Der Katalogmodus geht den Bestand in Tagesraten
durch (Cursor + Ledger, `CAP` je Lauf), damit er sich nicht mit dem CJ-Grind um Shopifys
Eimer prügelt.

⚠️ Ein Massen-Schreiber ist die Klasse, die am 15.08. 149 Produkte beschädigt hat. Deshalb:
schreibt NUR in ein leeres oder Baustein-Feld, nimmt den Satz WÖRTLICH aus demselben
Produkt, fasst die Beschreibung selbst nie an, und ist durch `CAP` gedeckelt.

Nutzung:  DRY=1 python3 automation/snippet_rankende_seiten.py
          python3 automation/snippet_rankende_seiten.py
          MODUS=katalog CAP=300 python3 automation/snippet_rankende_seiten.py
"""
import html, json, os, re, sys, time, urllib.request

SHOP = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOKEN = (os.environ.get('SHOPIFY_ADMIN_TOKEN')
         or open('/tmp/cj_shop_token.txt').read().strip())
DRY = os.environ.get('DRY') == '1'
CAP = int(os.environ.get('CAP', '60'))
# QUELLE ist ueberschreibbar (08.09.2026): Das Werkzeug hing fest an der Semrush-Datei —
# aber die Seiten, auf denen HEUTE jemand landet, stehen in ShopifyQL, nicht bei Semrush.
# Erwartet wird je Zeile ein Pfad im 4. Semikolon-Feld (Semrush-Format); eine Liste blosser
# Handles geht ebenfalls, weil dann Feld 4 gleich dem Handle ist.
QUELLE = os.environ.get('QUELLE', 'dropship/_rankings_semrush.csv')
LEDGER = 'dropship/_snippet_rankend.txt'
MAXLEN = 155          # darüber schneidet Google ab

FLOSKEL = re.compile(r'(bei LuxeStyle (Schweiz|CH)|jetzt bei LuxeStyle)[^.]*\.\s*Gratis-Versand', re.I)
# Aussagen, die in einem Google-Snippet nichts verloren haben. Die Texte sind gereinigt;
# das hier ist die Wache dagegen, dass ein Rest doch in den Feed wandert.
HEIKEL = re.compile(r'\b(blutzucker|blutdruck|ekg|harnsäure|heilt|therapie|krebs|diabetes|'
                    r'lindert|behandelt|entlastet?|hallux|valgus|arthrose|schmerz|linderung)\w*', re.I)


def gql(q, v=None):
    req = urllib.request.Request(
        f'https://{SHOP}/admin/api/2024-10/graphql.json',
        data=json.dumps({'query': q, 'variables': v or {}}).encode(),
        headers={'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'})
    for versuch in range(6):
        try:
            j = json.load(urllib.request.urlopen(req, timeout=60))
        except Exception:
            if versuch == 5:
                raise
            time.sleep(1 + versuch)
            continue
        if 'errors' in j:
            if any('hrottl' in str(e.get('message', '')) for e in j['errors']):
                time.sleep(2 + versuch)
                continue
            print('GQL-FEHLER:', j['errors'], file=sys.stderr)
        return j.get('data') or {}
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def text(roh):
    return html.unescape(re.sub(r'<[^>]+>', ' ', roh or '')).replace('\xa0', ' ')


# Bausteine, die zwar im ersten Absatz stehen können, aber nichts über die Ware sagen.
# ⚠️ Der erste Entwurf hätte für die Leinen-Hose und eine Gaming-Tastatur
# «📦 Lieferzeit Schweiz: 10–20 Werktage …» als Google-Snippet gesetzt — bei zwei
# Produkten steht der Versandhinweis VOR dem Beschreibungstext.
# ⚠️ Auch der QUERVERWEIS-Baustein ist kein Produkttext. Der erste Kataloglauf setzte
# «🛍️ Das könnte dir auch gefallen: Damenmode · Bestseller» als Google-Snippet für fünf
# Produkte — darunter zwei POD-Seiten, die besten des Shops. Zweite Fassung derselben
# Lehre wie beim Versandhinweis: eine Liste bekannter Bausteine ist immer unvollständig,
# man findet den nächsten erst im Ergebnis.
BAUSTEIN = re.compile(r'(Lieferzeit|Direktversand|Gratis-Versand|30 Tage Rückgabe|'
                      r'Sorglos shoppen|Versand nur in die|könnte dir auch gefallen|'
                      r'Passt dazu|Passend dazu|Ähnliche Produkte|Kunden kauften|'
                      r'Entdecke auch|🛍️|📖)', re.I)
# Ein fremder Markenname im Suchergebnis ist dieselbe Klasse wie ein fremder Markenname
# im Titel (Google-Kanal, 12.08.): «Der Paperang Thermal Printer Mini Mobile Photo Printer …»
# ⚠️ Die Schwelle ist FÜNF grossgeschriebene Wörter am Stück, nicht drei. Deutsch schreibt
# Substantive gross — bei drei fielen «Bieten Sie Ihrer Katze», «Das Fitness Smart Armband»
# und «Dieser Smart Ring» als Markennamen durch, fünf einwandfreie Seiten wären ohne Text
# geblieben. Fünf Wörter am Stück schafft deutsche Prosa praktisch nie, eine unübersetzte
# englische Produktbezeichnung dagegen sofort.
FREMDMARKE = re.compile(r'\b([A-Z][a-z]+ ){5,}')


def erster_satz(beschreibung):
    """Der erste ECHTE Beschreibungsabsatz, auf ganze Sätze gekürzt."""
    for m in re.finditer(r'<p[^>]*>(.*?)</p>', beschreibung or '', re.S | re.I):
        t = ' '.join(text(m.group(1)).split())
        if len(t) < 40 or BAUSTEIN.search(t):
            continue                      # Versand-/Trust-Baustein, kein Produkttext
        saetze = re.split(r'(?<=[.!?])\s+', t)
        return saetze[0].strip() if saetze else ''
    return ''


def merkmal(beschreibung):
    """Ein konkretes Merkmal aus «Das zeichnet es aus» — Floskeln übergehen."""
    for li in re.findall(r'<li[^>]*>(.*?)</li>', beschreibung or '', re.S | re.I):
        t = ' '.join(text(li).split()).strip(' .')
        if not t or len(t) > 60:
            continue
        # ⚠️ Auch die Merkmalsliste kann Versand-Bausteine enthalten. Beim Ring stand
        # «Versand: 🇨🇭 Schweiz · Lieferung 10–20 Werktage» als «Merkmal» im Snippet —
        # die Ziffernprüfung unten hielt es für eine Massangabe.
        if BAUSTEIN.search(t) or 'Schweiz' in t:
            continue
        # «Einfach zu verwenden» sagt nichts. Ein Merkmal mit Zahl, Mass oder
        # Materialwort schon.
        if re.search(r'\d|cm|mm|ml|liter|holz|leder|edelstahl|akku|wasserdicht|'
                     r'faltbar|kabellos|silikon|baumwolle', t, re.I):
            return t
    return ''


def baue(titel, beschreibung):
    satz = erster_satz(beschreibung)
    if len(satz) < 40:
        return None, 'erster Satz zu kurz oder fehlt'
    if HEIKEL.search(satz):
        return None, 'heikle Aussage im ersten Satz'
    if FREMDMARKE.search(satz):
        return None, 'fremder Markenname im ersten Satz'
    s = satz
    if len(s) > MAXLEN:
        # sauber am letzten ganzen Wort kürzen, nie mitten im Wort
        s = s[:MAXLEN].rsplit(' ', 1)[0].rstrip(' ,;–-') + ' …'
        return s, None
    m = merkmal(beschreibung)
    # ⚠️ 08.09.2026: Das Merkmal wurde blind angehaengt — beim Tutu-Kleid stand danach
    # «...fuer kleine Fashionistas im Alter von 3 bis 8 Jahren. Ideal fuer Kinder von 3 bis
    # 8 Jahren.» Eine Doppelung im Suchergebnis ist schlimmer als ein kurzes Snippet.
    # Geprueft wird an den ZAHLEN/Werten des Merkmals: steckt jede davon schon im Satz,
    # sagt das Merkmal nichts Neues.
    if m and not HEIKEL.search(m) and len(s) + 3 + len(m) <= MAXLEN and not schon_gesagt(s, m):
        s = f'{s} {m}.'
    return s, None


def schon_gesagt(satz, m):
    """Sagt das Merkmal etwas, das im Satz nicht schon steht?

    Vergleicht die inhaltstragenden Teile (Zahlen und Woerter ab 5 Zeichen). Kommen ALLE
    davon bereits im Satz vor, ist das Merkmal eine Wiederholung. Ohne solche Teile
    (z. B. «Aus Edelstahl») entscheidet der Wortlaut selbst.
    """
    sl = satz.lower()
    zahlen = re.findall(r'\d+(?:[.,]\d+)?', m)
    if zahlen:                       # Zahlen tragen die Aussage — Wortwahl ist Formulierung
        return all(z in sl for z in zahlen)
    worte = re.findall(r'[A-Za-zÄÖÜäöüß]{5,}', m)
    if not worte:
        return m.lower() in sl
    return all(w.lower() in sl for w in worte)


CURSOR = 'dropship/_snippet_katalog_cursor.txt'


def schreibe(n):
    """Setzt das Snippet eines Produkts. Gibt (gesetzt, grund) zurueck."""
    alt = n['seo']['description'] or ''
    if alt and not FLOSKEL.search(alt):
        return False, 'hat schon eigenen Text'
    neu, grund = baue(n['title'], n['descriptionHtml'])
    if not neu:
        return False, grund
    if DRY:
        print(f'  {n["title"][:40]:42} → {neu[:70]}')
        return False, 'DRY'
    # ⚠️ seo-Titel MITSCHICKEN — das seo-Objekt wird komplett ersetzt.
    r = gql("""mutation($p:ProductInput!){productUpdate(input:$p){
                product{id} userErrors{field message}}}""",
            {'p': {'id': n['id'],
                   'seo': {'title': n['seo']['title'], 'description': neu}}})
    e = (r.get('productUpdate') or {}).get('userErrors') or []
    if e:
        return False, str(e)
    return True, neu


def katalog(fertig):
    """Geht den aktiven Katalog in Tagesraten durch."""
    cur = None
    if os.path.exists(CURSOR):
        cur = (open(CURSOR, encoding='utf-8').read().strip() or None)
    gesetzt = geprueft = 0
    leer_in_folge = 0
    while gesetzt < CAP:
        nach = json.dumps(cur) if cur else 'null'
        d = gql('{products(first:50,after:%s,query:"status:active"){pageInfo{hasNextPage endCursor}'
                ' nodes{id title status seo{title description} descriptionHtml}}}' % nach)
        p = d.get('products')
        if not p:
            # Stumme Antwort ist KEIN Katalogende (Lehre 21.08.) — Pause statt FERTIG.
            print('PAUSE (Shopify antwortete nicht) — kein Fortschritt vermerkt')
            return
        for n in p['nodes']:
            geprueft += 1
            h = n['id'].rsplit('/', 1)[-1]
            if h in fertig:
                continue
            ok, grund = schreibe(n)
            if DRY and grund == 'DRY':
                gesetzt += 1          # sonst begrenzt CAP den Trockenlauf nicht
            if ok:
                gesetzt += 1
                with open(LEDGER, 'a', encoding='utf-8') as f:
                    f.write(f'{h}\t{grund}\n')
                time.sleep(0.35)
            if gesetzt >= CAP:
                break
        cur = p['pageInfo']['endCursor']
        with open(CURSOR, 'w', encoding='utf-8') as f:
            f.write(cur or '')
        if not p['pageInfo']['hasNextPage']:
            print(f'Katalog einmal durch — Cursor zurueckgesetzt. {gesetzt} gesetzt.')
            os.path.exists(CURSOR) and os.remove(CURSOR)
            return
        leer_in_folge = 0 if gesetzt else leer_in_folge + 1
        if leer_in_folge > 60:      # 3000 Produkte ohne einen einzigen Treffer
            print(f'{geprueft} geprueft, nichts zu tun in diesem Abschnitt.')
            return
    print(f'{gesetzt} Snippet(s) gesetzt (von {geprueft} geprueft) — Tagesrate erreicht.')


def main():
    fertig = set()
    if os.path.exists(LEDGER):
        fertig = {l.split('\t')[0] for l in open(LEDGER, encoding='utf-8') if l.strip()}

    if os.environ.get('MODUS') == 'katalog':
        return katalog(fertig)

    handles = []
    for z in open(QUELLE, encoding='utf-8'):
        if not z.strip():
            continue
        teile = z.strip().split(';')
        pfad = teile[3] if len(teile) > 3 else teile[0]
        if '/products/' in pfad or ';' not in z:
            h = pfad.rsplit('/', 1)[-1]
            if h not in handles and h not in fertig:
                handles.append(h)

    gesetzt = uebersprungen = 0
    for h in handles[:CAP]:
        d = gql('{products(first:1,query:%s){nodes{id title status seo{title description}'
                ' descriptionHtml}}}' % json.dumps(f'handle:{h}'))
        n = (d.get('products', {}).get('nodes') or [None])[0]
        if not n or n['status'] != 'ACTIVE':
            continue
        alt = n['seo']['description'] or ''
        if alt and not FLOSKEL.search(alt):
            continue                       # hat schon einen eigenen Text
        neu, grund = baue(n['title'], n['descriptionHtml'])
        if not neu:
            print(f'  ⏭  {n["title"][:44]:46} — {grund}')
            uebersprungen += 1
            continue
        print(f'  {n["title"][:44]:46}\n     → {neu}')
        if DRY:
            continue
        # ⚠️ seo-Titel MITSCHICKEN: das seo-Objekt wird komplett ersetzt.
        r = gql('''mutation($p:ProductInput!){productUpdate(input:$p){
                    product{id seo{title description}} userErrors{field message}}}''',
                {'p': {'id': n['id'],
                       'seo': {'title': n['seo']['title'], 'description': neu}}})
        e = (r.get('productUpdate') or {}).get('userErrors') or []
        if e:
            print(f'     ❌ {e}')
            continue
        gesetzt += 1
        with open(LEDGER, 'a', encoding='utf-8') as f:
            f.write(f'{h}\t{neu}\n')
        time.sleep(0.4)

    print(f'\n{gesetzt} Snippet(s) gesetzt · {uebersprungen} übersprungen')
    if gesetzt == 0:
        print('FERTIG: 0')


if __name__ == '__main__':
    main()
