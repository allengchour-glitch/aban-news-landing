#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
wortluecke_rankings.py — welches Wort suchen die Leute, das im Produkttitel gar nicht steht?

DER FUND (29.08.2026): Der meistgesuchte Begriff, für den luxestyle.ch überhaupt auftaucht,
ist **«handstaubsauger» mit 5'400 Suchen im Monat** — und das Produkt hiess «Handlicher
Akku-Staubsauger». Das Wort, das die Kundin eintippt, kam im Titel nicht vor. Ebenso:
«Erhöhte Futternäpfe für Hunde» gegen die Suche «hundenapf erhöht», «Keramik-Reibe für
Ingwer & Knoblauch» gegen «ingwerreibe».
Das ist kein Keyword-Trick, sondern eine Frage der richtigen Benennung: Deutsch bildet
Zusammensetzungen (Hund+Napf), und wer das Produkt anders zerlegt, wird nicht gefunden.

⚠️ **DIESES WERKZEUG MELDET NUR — und das ist keine Bequemlichkeit, sondern nötig.**
Von 24 gefundenen Lücken waren nur drei eindeutig. Beispiele, bei denen Umbenennen FALSCH
gewesen wäre:
- «katzentrinkbrunnen» → «Trinkbrunnen für Haustiere»: Der Lieferantentext nennt nirgends
  Katzen. Das Produkt auf Katzen zu verengen wäre eine Behauptung, die ich nicht belegen kann.
- «bluetooth tastatur» → «K68 Kabellose … Tastatur»: «kabellos» kann auch 2,4-GHz-Funk sein.
  Ohne Beleg im Text bleibt der Titel, wie er ist.
- «atmungsaktive schuhe» → «Atmungsaktive Sneaker»: «Sneaker» ist bereits das genauere Wort.
- «t shirt bedrucken» → «T-Shirt selbst gestalten»: Beides stimmt; welcher Begriff im Titel
  steht, ist eine Sortimentsentscheidung des POD-Bereichs, keine Korrektur.
**Regel: Nur umbenennen, wenn der Produkttext das gesuchte Wort BELEGT.**

⚠️ Der Titel wird geändert, der HANDLE nicht — sonst wäre jeder bestehende Link ein 404 und
es bräuchte eine 301. `productUpdate` mit nur `title` lässt Handle und Tags unberührt.

Quelle: `dropship/_rankings_semrush.csv` (Suchbegriff;Position;Volumen;Pfad), ein
Schnappschuss aus dem Semrush-MCP-Werkzeug — aus einem Skript nicht abrufbar.

Nutzung:  python3 automation/wortluecke_rankings.py
"""
import json, os, re, sys, time, urllib.request

SHOP = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOKEN = (os.environ.get('SHOPIFY_ADMIN_TOKEN')
         or open('/tmp/cj_shop_token.txt').read().strip())
QUELLE = 'dropship/_rankings_semrush.csv'
BERICHT = 'dropship/WORTLUECKE-RANKINGS.md'
# Wörter, deren Fehlen nichts bedeutet
STOPP = {'fur', 'und', 'mit', 'der', 'die', 'das', 'im', 'in', 'aus', 'auf', 'zu', 'bei',
         'von', 'kaufen', 'schweiz', 'gunstig', 'online', 'beste', 'test'}


def gql(q):
    req = urllib.request.Request(
        f'https://{SHOP}/admin/api/2024-10/graphql.json',
        data=json.dumps({'query': q}).encode(),
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
    return {}


def norm(t):
    t = t.lower().replace('ä', 'a').replace('ö', 'o').replace('ü', 'u').replace('ß', 'ss')
    return re.sub(r'[^a-z0-9]', ' ', t)


def main():
    if not os.path.exists(QUELLE):
        print(f'{QUELLE} fehlt.')
        return
    gesehen, treffer = set(), []
    for z in open(QUELLE, encoding='utf-8'):
        if not z.strip():
            continue
        kw, pos, vol, pfad = z.strip().split(';')
        if '/products/' not in pfad or (kw, pfad) in gesehen:
            continue
        gesehen.add((kw, pfad))
        h = pfad.rsplit('/', 1)[-1]
        n = (gql('{products(first:1,query:%s){nodes{title status}}}' % json.dumps(f'handle:{h}'))
             .get('products', {}).get('nodes') or [None])[0]
        if not n or n['status'] != 'ACTIVE':
            continue
        tn = norm(n['title'])
        # Auch das Wortinnere zählt: «Hundenapf» steckt nicht in «Futternäpfe für Hunde»,
        # «Sonnenbrille» aber sehr wohl in «Sonnenbrillen-Set».
        fehlt = [w for w in norm(kw).split()
                 if w and w not in STOPP and w not in tn]
        if fehlt:
            treffer.append((int(vol), int(pos), kw, fehlt, n['title'], pfad))

    treffer.sort(reverse=True)
    print(f'{len(treffer)} Suchbegriffe, deren Wörter im Titel fehlen')
    if not treffer:
        if os.path.exists(BERICHT):
            os.remove(BERICHT)
        print('FERTIG: 0')
        return
    z = ['# Suchwörter, die im Produkttitel fehlen', '',
         'Nur umbenennen, wenn der PRODUKTTEXT das gesuchte Wort belegt — siehe Kopf von',
         '`automation/wortluecke_rankings.py`. Ein falscher Titel ist teurer als ein',
         'ungenauer.', '',
         '| Volumen | Position | Suchbegriff | fehlt im Titel | aktueller Titel |',
         '|---:|---:|---|---|---|']
    for vol, pos, kw, fehlt, titel, pfad in treffer:
        z.append(f'| {vol} | {pos} | «{kw}» | `{", ".join(fehlt)}` | [{titel}]({pfad}) |')
    open(BERICHT, 'w', encoding='utf-8').write('\n'.join(z) + '\n')
    for vol, pos, kw, fehlt, titel, _ in treffer[:15]:
        print(f'  {vol:>5}/Mt Pos{pos:>3}  «{kw}» — fehlt: {",".join(fehlt)}  ({titel[:40]})')
    # FERTIG heisst «nichts mehr zu TUN», nicht «nichts mehr zu SEHEN».
    print('FERTIG: 0')


if __name__ == '__main__':
    main()
