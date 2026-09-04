#!/usr/bin/env python3
"""Dateien-Bibliothek freiräumen: verwaiste Marketing-Videos löschen.

EINORDNUNG (04.09.2026, zweimal korrigiert — beide Korrekturen gehören zusammen):
Die Dateien-Bibliothek (GenericFile) umfasst 948 Dateien / 958 MB, davon 101 MP4 mit
616 MB — unsere eigenen Reels und Werbefilme. Das ist ein sauber aufräumbarer Topf, ABER:
**Shopifys Basic-Plan erlaubt 100 GB, und die Grenze zählt Produktmedien mit.** Gemessen
sind es 63'845 Produkte × 1,44 MB ≈ **92 GB** — deshalb scheitert schon ein 10-KB-JSON.
Dieses Werkzeug räumt also den kleinen, sauberen Teil (0,3 %); die Masse sind Produktbilder
und dafür ist `dateispeicher_aufraeumen.py` (Medien von ENTWÜRFEN) zuständig.
**Ein Aufräumwerkzeug ist erst dann die Antwort, wenn es dieselbe Grössenordnung hat wie
das Problem** — sonst putzt man sauber am falschen Ende.

WAS GELÖSCHT WIRD: nur Videos ohne JEDEN Verweis — nicht im Theme, nicht auf einer Seite,
nicht in einem Artikel, nicht in einer Queue oder einem Ledger des Repos. Gemessen sind das
33 Dateien / 196 MB; die 66 Videos der TikTok-Warteschlange bleiben unangetastet.
⚠️ Eine gelöschte Datei ist WEG. Deshalb wird die Referenzsuche vor jedem Lauf neu gemacht
und nie aus einer Liste von gestern gelesen.

BENUTZUNG:  DRY=1 python3 automation/dateispeicher_videos.py
            DRY=0 CAP=50 python3 automation/dateispeicher_videos.py
"""
import json, os, re, sys, time, urllib.request

SHOP = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOKEN = os.environ.get('SHOPIFY_ADMIN_TOKEN') or open('/tmp/cj_shop_token.txt').read().strip()
DRY = os.environ.get('DRY', '1') == '1'
CAP = int(os.environ.get('CAP', '40'))
MIND_ALTER_TAGE = int(os.environ.get('MIND_ALTER_TAGE', '7'))
# ⚠️ 04.09.2026: Auch nach 190 MB gelöschter Videos meldet Shopify weiter
# FILE_STORAGE_LIMIT_EXCEEDED. Die Bibliothek besteht nicht nur aus MP4 — 346 PNG (255 MB)
# und 452 JPG (75 MB) kommen dazu, überwiegend alte Slides und Werbebilder. Deshalb ist die
# Endungsliste einstellbar; die Regeln (kein Verweis, Mindestalter) bleiben für alle gleich.
ENDUNGEN = tuple(e.strip().lower() for e in os.environ.get('ENDUNGEN', 'mp4').split(',') if e.strip())
LEDGER = 'dropship/_dateispeicher_videos_geloescht.txt'
STAND = '/tmp/dateispeicher_produktref.json'
# VERBRAUCHT (04.09.2026): Ein Reel, das gepostet ist, wird nie wieder gepostet — das ist
# Hausregel seit dem 06.07. («immer nur NEUES posten»). Seine CDN-Kopie hat damit keine
# Zukunft mehr; dasselbe gilt fuer tote URLs und Dubletten-Absagen. Mit VERBRAUCHT=1 werden
# solche Videos zusaetzlich freigegeben — aber nur, wenn ALLE Queue-Eintraege dazu
# verbraucht sind. Steht dasselbe Video irgendwo noch auf «ready», bleibt es.
# ⚠️ «saison-skip» ist bewusst NICHT verbraucht: Sommerware kommt im Sommer wieder.
VERBRAUCHT_STATUS = {'posted', 'posted-ig-fb', 'posted-tiktok', 'archived-deadurl',
                     'dup-produkt-skip', 'dup-reel-owner-skip', 'skip-produkt-ausverkauft'}
VERBRAUCHT = os.environ.get('VERBRAUCHT') == '1' 


def gql(q, v=None, tries=10):
    for i in range(tries):
        try:
            r = urllib.request.Request(
                f'https://{SHOP}/admin/api/2024-10/graphql.json',
                data=json.dumps({'query': q, 'variables': v or {}}).encode(),
                headers={'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'})
            j = json.load(urllib.request.urlopen(r, timeout=90))
            if j.get('data') and not j.get('errors'):
                return j['data']
            e = json.dumps(j.get('errors', ''))[:120]
            if 'THROTTLED' in e.upper():
                time.sleep(4); continue
            if j.get('data'):
                return j['data']
            sys.stderr.write(f'  ⚠️ {e}\n')
        except Exception as ex:
            sys.stderr.write(f'  ⚠️ {ex}\n')
        time.sleep(3)
    return {}


def dateiname(u):
    return re.sub(r'\?.*', '', u or '').rsplit('/', 1)[-1]


def referenzen():
    """Alles einsammeln, was auf eine Datei zeigen koennte — LIVE, nie aus einer alten Liste."""
    ref = set()
    t = ((gql('query{themes(first:5,roles:MAIN){nodes{id}}}') or {}).get('themes') or {}).get('nodes')
    if t:
        c = None
        while True:
            d = gql('query($id:ID!,$c:String){theme(id:$id){files(first:50,after:$c){'
                    'pageInfo{hasNextPage endCursor} nodes{body{... on OnlineStoreThemeFileBodyText{content}}}}}}',
                    {'id': t[0]['id'], 'c': c})
            f = ((d.get('theme') or {}).get('files') or {})
            for n in f.get('nodes', []):
                b = (n.get('body') or {}).get('content') or ''
                ref.update(m.group(1) for m in re.finditer(r'/files/([A-Za-z0-9._\-]+)', b))
            if not f.get('pageInfo', {}).get('hasNextPage'):
                break
            c = f['pageInfo']['endCursor']; time.sleep(0.2)
    for typ, q in (('pages', 'query($c:String){pages(first:100,after:$c){pageInfo{hasNextPage endCursor} nodes{body}}}'),
                   ('articles', 'query($c:String){articles(first:100,after:$c){pageInfo{hasNextPage endCursor} nodes{body}}}')):
        c = None
        while True:
            d = gql(q, {'c': c}); o = d.get(typ) or {}
            for n in o.get('nodes', []):
                ref.update(m.group(1) for m in re.finditer(r'/files/([A-Za-z0-9._\-]+)', n.get('body') or ''))
            if not o.get('pageInfo', {}).get('hasNextPage'):
                break
            c = o['pageInfo']['endCursor']; time.sleep(0.2)
    return ref


def produkt_referenzen():
    """⛔ 04.09.2026, vor der zweiten Löschrunde gefunden: PRODUKTTEXTE betten Dateien der
    Bibliothek ein — gemessen 166 Bildverweise in 2'000 aktiven Texten, darunter die
    Vorschaubilder des «Selbst gestalten»-Editors (Hausregel 4: der Editor ist heilig).
    Der erste Entwurf dieses Werkzeugs hat nur Theme, Seiten und Artikel geprüft; sein
    Trockenlauf hätte 400 Dateien gelöscht, darunter diese Bilder.
    ⚠️ Und der Grund, warum das fast durchging: Shopifys Produktsuche findet die Zeichenkette
    NICHT — «cdn.shopify.com/s/files» meldet 0 Treffer, während dieselben 300 Texte 120
    Verweise tragen. Ein Nullergebnis aus einer Suche, die das Feld gar nicht indexiert, ist
    kein Beleg. Deshalb wird hier paginiert und im TEXT gelesen, nicht gesucht.
    (Videos betten Produkttexte nie ein — gemessen 0 in 2'000 Texten; Bilder sehr wohl.)
    """
    # ⚠️ FORTSETZBAR. 53'000 Produkttexte zu lesen dauert länger, als dieser Container lebt
    # (er startet etwa stündlich neu, Lehre 03.09.). Ohne Zwischenstand beginnt jeder Lauf von
    # vorn und kommt nie an — dieselbe Falle wie der Klassen-Vollscan.
    stand = {'fertig': [], 'status': 'active', 'cursor': None, 'namen': []}
    if os.path.exists(STAND) and os.environ.get('NEU') != '1':
        try:
            stand = json.load(open(STAND))
            if time.time() - os.path.getmtime(STAND) > 43200:   # ein Tag alter Stand ist wertlos
                stand = {'fertig': [], 'status': 'active', 'cursor': None, 'namen': []}
        except Exception:
            pass
    ref = set(stand.get('namen') or [])
    for status in ('active', 'draft'):
        if status in stand.get('fertig', []):
            continue
        c = stand['cursor'] if stand.get('status') == status else None
        seite = 0
        while True:
            d = gql('query($c:String,$q:String!){products(first:50,after:$c,query:$q){'
                    'pageInfo{hasNextPage endCursor} nodes{descriptionHtml}}}',
                    {'c': c, 'q': 'status:' + status})
            o = d.get('products') or {}
            if not o:
                break
            for n in o.get('nodes', []):
                ref.update(m.group(1) for m in re.finditer(r'/files/([A-Za-z0-9._\-]+)',
                                                           n.get('descriptionHtml') or ''))
            seite += 1
            if not o.get('pageInfo', {}).get('hasNextPage'):
                stand.setdefault('fertig', []).append(status)
                stand['cursor'] = None
                json.dump({'fertig': stand['fertig'], 'status': status, 'cursor': None,
                           'namen': sorted(ref)}, open(STAND, 'w'))
                break
            c = o['pageInfo']['endCursor']
            if seite % 10 == 0:
                json.dump({'fertig': stand.get('fertig', []), 'status': status, 'cursor': c,
                           'namen': sorted(ref)}, open(STAND, 'w'))
                print(f'   … {status}: {seite*50} Texte gelesen, {len(ref)} Dateinamen', flush=True)
    return ref


def queue_status(namen):
    """Status je Datei aus den Warteschlangen — welche Videos sind verbraucht?"""
    import csv
    st = {}
    for pfad in ('automation/reels_seed.csv', 'social/video_queue.csv'):
        if not os.path.exists(pfad):
            continue
        try:
            for r in csv.DictReader(open(pfad, encoding='utf-8', errors='ignore')):
                zeile = ' '.join(str(x) for x in r.values())
                s = (r.get('status') or '').strip()
                for n in namen:
                    if n in zeile:
                        st.setdefault(n, set()).add(s)
        except Exception:
            pass
    return st


def repo_erwaehnungen(namen):
    """Queues und Ledger im Repo — die TikTok-Warteschlange lebt von diesen Dateien."""
    treffer = set()
    for wurzel in ('dropship', 'automation', 'social', 'reels'):
        if not os.path.isdir(wurzel):
            continue
        for r, _, fs in os.walk(wurzel):
            for f in fs:
                p = os.path.join(r, f)
                try:
                    if os.path.getsize(p) > 8_000_000:
                        continue
                    inhalt = open(p, encoding='utf-8', errors='ignore').read()
                except Exception:
                    continue
                for n in namen:
                    if n in inhalt:
                        treffer.add(n)
    return treffer


Q = ('query($c:String){files(first:250, after:$c, query:"media_type:GENERIC_FILE"){'
     'pageInfo{hasNextPage endCursor} nodes{... on GenericFile{ id originalFileSize createdAt url }}}}')
M = 'mutation($i:[ID!]!){fileDelete(fileIds:$i){deletedFileIds userErrors{message}}}'


def main():
    dateien = []
    c = None
    while True:
        f = (gql(Q, {'c': c}) or {}).get('files') or {}
        for x in f.get('nodes', []):
            if x and dateiname(x.get('url')).lower().endswith(tuple('.'+e for e in ENDUNGEN)):
                dateien.append(x)
        if not f.get('pageInfo', {}).get('hasNextPage'):
            break
        c = f['pageInfo']['endCursor']; time.sleep(0.3)
    gesamt = sum(x.get('originalFileSize') or 0 for x in dateien)
    print(f'{len(dateien)} Dateien ({",".join(ENDUNGEN)}) in der Bibliothek · {gesamt/1e6:.0f} MB')

    ref = referenzen()
    namen = {dateiname(x['url']) for x in dateien}
    ref |= repo_erwaehnungen(namen)
    if any(e not in ('mp4', 'mov', 'webm') for e in ENDUNGEN):
        print('   … Produkttexte werden mitgelesen (Bilder werden dort eingebettet)')
        ref |= produkt_referenzen()
    grenze = time.time() - MIND_ALTER_TAGE * 86400
    if VERBRAUCHT:
        qs = queue_status(namen)
        verbraucht = {n for n, sts in qs.items() if sts and sts <= VERBRAUCHT_STATUS}
        print(f'   … {len(verbraucht)} Dateien sind laut Warteschlange verbraucht (gepostet/tot/Dublette)')
        ref -= verbraucht
    frei = [x for x in dateien
            if dateiname(x['url']) not in ref
            and time.mktime(time.strptime(x['createdAt'][:19], '%Y-%m-%dT%H:%M:%S')) < grenze]
    print(f'ohne jeden Verweis und aelter als {MIND_ALTER_TAGE} Tage: '
          f'{len(frei)} · {sum(x.get("originalFileSize") or 0 for x in frei)/1e6:.0f} MB')
    frei = frei[:CAP]
    if DRY:
        for x in frei:
            print(f'  [DRY] {x["createdAt"][:10]} {(x.get("originalFileSize") or 0)/1e6:6.1f} MB  {dateiname(x["url"])[:60]}')
        print(f'FERTIG (DRY): {len(frei)} Videos, {sum(x.get("originalFileSize") or 0 for x in frei)/1e6:.0f} MB waeren geloescht')
        return
    led = open(LEDGER, 'a')
    weg = 0; byt = 0
    for i in range(0, len(frei), 20):
        blk = frei[i:i + 20]
        r = gql(M, {'i': [x['id'] for x in blk]})
        fd = (r.get('fileDelete') or {})
        if fd.get('userErrors'):
            sys.stderr.write(f'  ⛔ {json.dumps(fd["userErrors"])[:140]}\n'); continue
        for x in blk:
            led.write(f'{x["id"].split("/")[-1]}\t{x.get("originalFileSize") or 0}\t{x["createdAt"][:10]}\t{dateiname(x["url"])[:70]}\n')
            weg += 1; byt += x.get('originalFileSize') or 0
        led.flush(); time.sleep(0.4)
    led.close()
    print(f'FERTIG: {weg} Videos geloescht, {byt/1e6:.0f} MB frei')


if __name__ == '__main__':
    main()
