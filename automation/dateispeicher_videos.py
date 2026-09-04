#!/usr/bin/env python3
"""Dateien-Bibliothek freiräumen: verwaiste Marketing-Videos löschen.

⛔ KORREKTUR EINER EIGENEN ANNAHME (04.09.2026). Der erste Versuch löschte Medien von
BigBuy-ENTWÜRFEN, weil das Gedächtnis sagt, der Grind lege ~1 GB Produktbilder pro Tag an.
Gemessen ist der volle Speicher aber ein ANDERER Topf: Die Dateien-Bibliothek
(GenericFile) umfasst 948 Dateien / 958 MB — davon **101 MP4 mit 616 MB**, unsere eigenen
Reels und Showcase-Filme aus Juni bis August. Produktbilder laufen weiter durch (die
Importe von heute haben READY-Medien), die Sperre trifft nur diese Bibliothek.
**Wer den vollen Speicher am Produktbild sucht, löscht am falschen Ort.**

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
    grenze = time.time() - MIND_ALTER_TAGE * 86400
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
