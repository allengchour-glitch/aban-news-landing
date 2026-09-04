#!/usr/bin/env python3
"""Dateispeicher freiräumen: Medien von DRAFT-Produkten toter Lieferanten löschen.

BEFUND (02.–04.09.2026): Der Shopify-Dateispeicher ist voll. **Basic erlaubt 100 GB, und
die Grenze zählt Produktmedien mit** — gemessen 63'845 Produkte × 1,44 MB ≈ 92 GB. Die
Dateien-Bibliothek (Reels, Werbebilder) ist mit 958 MB nur 1 % davon; die Masse sind
Produktbilder. Deshalb ist DIESES Werkzeug der grosse Hebel, nicht das Video-Aufräumen. Seit dem 01.09. scheitert
JEDER Upload in die Dateien-Bibliothek mit FILE_STORAGE_LIMIT_EXCEEDED — die TikTok-Queue,
der Befehlskanal und die Kundinnenfotos kommen deshalb nicht mehr durch. Gemessen: die
4'000 neuesten Dateien sind ausnahmslos Produktbilder aus dem September, zusammen 912 MB;
der Grind legt rund 1 GB pro Tag an.

WAS HIER GELÖSCHT WIRD — und was NICHT:
  * NUR Medien von Produkten im Status DRAFT. Ein aktives Produkt wird nie angefasst.
  * NUR Klassen, deren Lieferant abgeschaltet ist: BigBuy (Import deaktiviert seit 10.07.,
    Betreiber-Entscheid) und Dubletten (der lebende Zwilling hat eigene Bilder).
  * Das PRODUKT bleibt vollständig bestehen — Titel, Text, Tags, Preise, Varianten.
    Gelöscht wird ausschliesslich das Bildmaterial.
  ⚠️ Damit ist eine Wiederbelebung nicht mehr bildlos möglich: Wer ein BigBuy-Produkt
     zurückholt, muss die Bilder neu importieren. Das ist der Preis, und er ist bewusst
     gezahlt — 10'000+ Entwürfe eines abgeschalteten Lieferanten blockieren sonst den
     Speicher für die Ware, die verkauft.

BENUTZUNG:  DRY=1 CAP=20 python3 automation/dateispeicher_aufraeumen.py
            DRY=0 CAP=800 python3 automation/dateispeicher_aufraeumen.py
            KLASSE="status:draft AND tag:duplikat-auto-draft" …
"""
import json, os, sys, threading, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

SHOP = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOKEN = os.environ.get('SHOPIFY_ADMIN_TOKEN') or open('/tmp/cj_shop_token.txt').read().strip()
DRY = os.environ.get('DRY', '1') == '1'
CAP = int(os.environ.get('CAP', '50'))
# Der Shopify-Eimer fasst 2000 Punkte und füllt mit 100/s nach; eine Löschseite kostet
# gemessen 20. Der Engpass ist die Antwortzeit der Mutation, nicht das Budget — deshalb
# ein kleiner Arbeitertrupp statt eines seriellen Laufs.
PARALLEL = int(os.environ.get('PARALLEL', '4'))
# Klassen in der Reihenfolge ihres Nutzens und ihrer Sicherheit. Erschoepfte Klassen stehen
# in /tmp/dateispeicher_klassen_fertig.txt; der naechste Lauf nimmt die naechste.
# ⚠️ BEWUSST NICHT dabei: «ausverkauft-lieferant» (kann wieder lieferbar werden) und
# «cj-nicht-versendbar-ch» (heute wurden 13 davon wiederbelebt, als CJ eine CH-Linie
# freischaltete). Wer deren Bilder loescht, macht die Wiederbelebung bildlos.
# ⚠️ AUCH NICHT «duplikat-auto-draft», obwohl es die groesste Klasse waere (4'908 Produkte,
# ~4 GB): Die Begruendung dafuer lautet «der lebende Zwilling hat eigene Bilder» — und genau
# das liess sich an fuenf Stichproben NICHT zeigen (kein aktiver Zwilling ueber den
# Handle-Stamm auffindbar; die Dubletten wurden 28.08. ueber BILDHASHES gefunden, nicht ueber
# Handles). Eine Loeschung, deren Sicherheitsannahme man nicht belegen kann, unterbleibt.
KLASSEN = [k.strip() for k in os.environ.get(
    'KLASSEN',
    'status:draft AND tag:bigbuy|'
    'status:draft AND tag:nicht-lieferbar-ch|status:draft AND tag:bb-versand-unrentabel'
).split('|') if k.strip()]
FERTIGDATEI = '/tmp/dateispeicher_klassen_fertig.txt'
_fertig = set()
if os.path.exists(FERTIGDATEI):
    _fertig = {z.strip() for z in open(FERTIGDATEI) if z.strip()}
_offen = [k for k in KLASSEN if k not in _fertig]
KLASSE = os.environ.get('KLASSE') or (_offen[0] if _offen else '')
LEDGER = 'dropship/_dateispeicher_media_geloescht.txt'
CURSOR = '/tmp/dateispeicher_cursor.txt'


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
            if 'THROTTLED' in e.upper():          # Drosselung ist keine Absage (Lehre 21.08.)
                c = (j.get('extensions', {}).get('cost') or {})
                t = c.get('throttleStatus') or {}
                need = max(2, (c.get('requestedQueryCost', 60) - t.get('currentlyAvailable', 0))
                           / max(1, t.get('restoreRate', 100)))
                time.sleep(min(30, need + 1)); continue
            if j.get('data'):
                return j['data']
            sys.stderr.write(f'  ⚠️ {e}\n')
        except Exception as ex:
            sys.stderr.write(f'  ⚠️ {ex}\n')
        time.sleep(3)
    return {}


Q = '''query($q:String!,$c:String){ products(first:25, after:$c, query:$q){
  pageInfo{ hasNextPage endCursor }
  nodes{ id title status
    media(first:25){ nodes{ ... on MediaImage { id originalSource{ fileSize } } } } } } }'''
M = '''mutation($p:ID!,$m:[ID!]!){ productDeleteMedia(productId:$p, mediaIds:$m){
  deletedMediaIds mediaUserErrors{ message } userErrors{ message } } }'''


schloss = threading.Lock()
led = None


def loeschen(auftrag):
    x, ms, groesse = auftrag
    r = gql(M, {'p': x['id'], 'm': ms})
    pdm = (r.get('productDeleteMedia') or {})
    fehler = (pdm.get('mediaUserErrors') or []) + (pdm.get('userErrors') or [])
    if fehler:
        sys.stderr.write(f"  ⛔ {x['id']}: {json.dumps(fehler)[:120]}\n"); return
    with schloss:
        led.write(f"{x['id'].split('/')[-1]}\t{len(pdm.get('deletedMediaIds') or [])}\t{groesse}\t{x['title'][:60]}\n")
        led.flush()


def main():
    global led
    if not KLASSE:
        print('FERTIG: alle Klassen durchlaufen'); return
    print(f'Klasse: {KLASSE}')
    cur = None
    auftraege = []
    # ⚠️ Ein Cursor gehoert zu SEINER Abfrage. Der erste Entwurf las den Cursor der
    # BigBuy-Klasse und schickte ihn an die Dubletten-Abfrage — Antwort «keine weiteren
    # Produkte», und die Klasse haette als leer gegolten. Deshalb je Klasse ein Cursor.
    stand = {}
    if os.path.exists(CURSOR) and os.environ.get('NEU') != '1':
        try:
            stand = json.load(open(CURSOR))
        except Exception:
            stand = {}
    cur = stand.get(KLASSE)
    if cur:
        print(f'FORTSETZUNG ab Cursor …{cur[-12:]}')
    led = None if DRY else open(LEDGER, 'a')
    prod = bilder = 0
    byt = 0
    while prod < CAP:
        d = gql(Q, {'q': KLASSE, 'c': cur})
        p = d.get('products') or {}
        knoten = p.get('nodes') or []
        if not knoten:
            print('keine weiteren Produkte'); break
        for x in knoten:
            # ⛔ Sicherung am OBJEKT, nicht am Filter: nie ein aktives Produkt anfassen.
            if x['status'] != 'DRAFT':
                sys.stderr.write(f"  ⛔ {x['id']} ist {x['status']} — uebersprungen\n"); continue
            ms = [m['id'] for m in x['media']['nodes'] if m.get('id')]
            s = sum((m.get('originalSource') or {}).get('fileSize') or 0 for m in x['media']['nodes'])
            if not ms:
                continue
            prod += 1; bilder += len(ms); byt += s
            if DRY:
                print(f"  [DRY] {x['id'].split('/')[-1]} {len(ms):2} Bilder {s/1e6:5.2f} MB  {x['title'][:52]}")
                if prod >= CAP:
                    break
                continue
            auftraege.append((x, ms, s))
            if prod >= CAP:
                break
        if auftraege:
            with ThreadPoolExecutor(max_workers=PARALLEL) as pool:
                list(pool.map(loeschen, auftraege))
            auftraege = []
        if not p.get('pageInfo', {}).get('hasNextPage'):
            print(f'Klasse vollstaendig durchlaufen: {KLASSE}')
            if not DRY:
                open(FERTIGDATEI, 'a').write(KLASSE + '\n')
                stand.pop(KLASSE, None)
                json.dump(stand, open(CURSOR, 'w'))
            cur = None; break
        cur = p['pageInfo']['endCursor']
        # ⚠️ Cursor NUR im Schreibmodus fortschreiben — ein Anzeigemodus darf keinen
        # Fortschritt merken (Lehre 28.08.).
        if not DRY:
            stand[KLASSE] = cur
            json.dump(stand, open(CURSOR, 'w'))
    if led:
        led.close()
    print(f'FERTIG: {prod} Produkte, {bilder} Bilder, {byt/1e6:.1f} MB {"(DRY)" if DRY else "geloescht"}')


if __name__ == '__main__':
    main()
