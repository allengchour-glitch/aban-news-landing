#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tote_rankings.py — Wächter: rankt Google eine Seite, die es nicht mehr zu kaufen gibt?

DER FUND (29.08.2026): `/products/trinkbrunnen-1l-fur-katze-hund-immer-frisches-wass-1002046`
steht bei Google auf Position 46–47 für «trinkbrunnen katze» und «trinkbrunnen für katzen»
(je 1'300 Suchen/Monat) und auf Position 23 für «trinkbrunnen für hunde» (140) — und ist
**DRAFT**, Tag `ausverkauft-lieferant`. Rund **2'700 Suchen im Monat** zeigen auf eine Seite,
die der Besucherin einen 404 liefert. Google weiss das nicht; die Seite bleibt monatelang im
Index, weil ein 404 langsam abgewertet wird.

Das ist dieselbe Klasse wie die 61 toten Ratgeber-Links und die abgelaufenen Rabattcodes:
**kein Bericht weist das je als Kaufabbruch aus.** Der Unterschied ist nur, dass hier der
Verkehr von Google kommt — dem einzigen Kanal mit belegten Verkäufen.

WARUM ES IMMER WIEDER PASSIERT: Der Viability-Guard draftet ausverkaufte Lieferantenware,
der Dubletten-Fix draftet Doppelgänger, die BigBuy-Stilllegung hat Tausende gedraftet. Die
RANKINGS erfahren davon nichts. Jeder Draft-Lauf kann eine rankende Seite töten.

WAS ES TUT: liest `dropship/_rankings_semrush.csv` (Suchbegriff;Position;Volumen;Pfad),
prüft jede Produkt-/Kollektionsadresse LIVE gegen Shopify und meldet, welche für Besucher
tot ist. **Es repariert NICHTS** — welche Ersatzseite die richtige ist, hängt am Produkt.

⚠️ Die CSV ist ein Schnappschuss aus Semrush (MCP-Werkzeug, nicht aus einem Skript
abrufbar). Sie veraltet; nach jeder neuen Semrush-Abfrage gehört sie ersetzt. Ein alter
Schnappschuss meldet höchstens zu viel, nie zu wenig — ein gedraftetes Produkt bleibt tot.

Nutzung:  python3 automation/tote_rankings.py
"""
import json, os, sys, urllib.request

SHOP = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOKEN = (os.environ.get('SHOPIFY_ADMIN_TOKEN')
         or open('/tmp/cj_shop_token.txt').read().strip())
QUELLE = 'dropship/_rankings_semrush.csv'
BERICHT = 'dropship/TOTE-RANKINGS.md'


def gql(q, v=None):
    req = urllib.request.Request(
        f'https://{SHOP}/admin/api/2024-10/graphql.json',
        data=json.dumps({'query': q, 'variables': v or {}}).encode(),
        headers={'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'})
    for versuch in range(6):
        try:
            j = json.load(urllib.request.urlopen(req, timeout=60))
        except Exception as e:
            if versuch == 5:
                raise
            continue
        if 'errors' in j:
            # Drosselung ist keine Absage — sie sagt nur, wie lange zu warten ist.
            if any('hrottl' in str(e.get('message', '')) for e in j['errors']):
                import time
                time.sleep(2 + versuch)
                continue
            print('GQL-FEHLER:', j['errors'], file=sys.stderr)
        return j.get('data') or {}
    return {}


def weiterleitung(pfad):
    """Fängt eine 301 diese Adresse schon ab, und lebt ihr Ziel?

    ⚠️ Diese Prüfung fehlte im ersten Entwurf und machte den Wächter unbrauchbar:
    Am 29.08. meldete er 28 tote Adressen — für NEUN davon lag längst eine passende
    Weiterleitung. Ein gedraftetes Produkt mit 301 ist für die Besucherin kein 404,
    und für Google gibt die 301 das Signal an die lebende Seite weiter. Der Status
    allein sagt also nichts; erst Status UND fehlende Weiterleitung ergeben einen Befund.

    Nützliche Eigenschaft der Shopify-Mechanik: die Weiterleitung greift NUR, wenn die
    Adresse sonst einen 404 gäbe. Wird das Produkt wieder veröffentlicht, gewinnt die
    Produktseite und die 301 schaltet sich von selbst ab — sie muss nicht zurückgenommen
    werden.
    """
    d = gql('{urlRedirects(first:5,query:%s){nodes{path target}}}' % json.dumps('path:' + pfad))
    for n in d.get('urlRedirects', {}).get('nodes', []):
        if n['path'] != pfad:
            continue
        ziel = n['target']
        if '/products/' in ziel:
            st, _ = status_produkt(ziel.rsplit('/', 1)[-1])
            return ziel, (st == 'ACTIVE')
        if '/collections/' in ziel:
            st, _ = status_kollektion(ziel.rsplit('/', 1)[-1])
            return ziel, (st == 'ACTIVE')
        return ziel, True     # Seite oder Startseite — nicht weiter prüfbar
    return None, False


def status_produkt(handle):
    d = gql('{products(first:1,query:"handle:%s"){nodes{status title}}}' % handle)
    n = (d.get('products', {}).get('nodes') or [None])[0]
    if not n:
        return 'FEHLT', ''
    return n['status'], n['title']


def status_kollektion(handle):
    # ⚠️ NICHT `publishedOnCurrentPublication` abfragen: das Feld braucht den Scope
    # `read_product_listings`; fehlt er, macht GraphQL die GANZE Antwort null und
    # jede Kollektion sähe aus, als gäbe es sie nicht (am 29.08. genau so passiert).
    # Die Veröffentlichung steht in `resourcePublicationsV2`.
    d = gql('''{collections(first:1,query:"handle:%s"){nodes{title
        productsCount{count}
        resourcePublicationsV2(first:10){nodes{isPublished publication{name}}}}}}''' % handle)
    n = (d.get('collections', {}).get('nodes') or [None])[0]
    if not n:
        return 'FEHLT', ''
    pubs = n.get('resourcePublicationsV2', {}).get('nodes') or []
    im_shop = any(p.get('isPublished') and 'Online Store' in (p.get('publication') or {}).get('name', '')
                  for p in pubs)
    if not im_shop:
        return 'UNVEROEFFENTLICHT', n['title']
    if (n.get('productsCount') or {}).get('count', 0) == 0:
        return 'LEER', n['title']
    return 'ACTIVE', n['title']


def main():
    if not os.path.exists(QUELLE):
        print(f'{QUELLE} fehlt — erst eine Semrush-Abfrage ablegen.')
        return
    zeilen = [l.strip().split(';') for l in open(QUELLE, encoding='utf-8') if l.strip()]
    # je Pfad die Suchbegriffe sammeln, damit das verlorene Volumen sichtbar wird
    nach_pfad = {}
    for kw, pos, vol, pfad in zeilen:
        nach_pfad.setdefault(pfad, []).append((kw, int(pos), int(vol)))

    tot, gefangen = [], 0
    for pfad, treffer in sorted(nach_pfad.items()):
        handle = pfad.rsplit('/', 1)[-1]
        if '/products/' in pfad:
            st, titel = status_produkt(handle)
        elif '/collections/' in pfad:
            st, titel = status_kollektion(handle)
        else:
            continue
        if st != 'ACTIVE':
            ziel, ziel_lebt = weiterleitung(pfad)
            if ziel and ziel_lebt:
                gefangen += 1
                continue                      # kein 404 — die 301 fängt es ab
            if ziel and not ziel_lebt:
                st = f'301 → totes Ziel'      # Weiterleitung ins Leere: schlimmer als keine
            # Volumen nur EINMAL je Suchbegriff zählen — dieselbe Seite rankt oft
            # mit mehreren Positionen für denselben Begriff.
            je_kw = {}
            for kw, pos, vol in treffer:
                je_kw[kw] = max(je_kw.get(kw, 0), vol)
            tot.append((sum(je_kw.values()), pfad, st, titel, sorted(treffer, key=lambda t: -t[2])))

    tot.sort(reverse=True)
    print(f'{len(nach_pfad)} rankende Adressen geprüft · {gefangen} von einer 301 aufgefangen '
          f'· {len(tot)} wirklich tot')
    if not tot:
        if os.path.exists(BERICHT):
            os.remove(BERICHT)   # ohne Befund gehört der Bericht gelöscht
        print('FERTIG: 0')
        return

    z = ['# Rankende Seiten, die es nicht mehr zu kaufen gibt', '',
         'Automatisch erzeugt von `automation/tote_rankings.py`. Google schickt Besucher',
         'auf diese Adressen; für sie ist die Seite ein 404.', '']
    for vol, pfad, st, titel, treffer in tot:
        z.append(f'## {pfad}  — **{st}**')
        z.append(f'{titel}  ·  **~{vol} Suchen/Monat** betroffen')
        for kw, pos, v in treffer:
            z.append(f'- «{kw}» — Position {pos}, {v}/Monat')
        z.append('')
    open(BERICHT, 'w', encoding='utf-8').write('\n'.join(z) + '\n')
    for vol, pfad, st, titel, _ in tot:
        print(f'  ~{vol:>5}/Mt  [{st:18}] {pfad}')
    # FERTIG heisst «nichts mehr zu TUN», nicht «nichts mehr zu SEHEN» —
    # Gemeldetes ist ein Rückstand im Bericht, keine offene Arbeit.
    print('FERTIG: 0')


if __name__ == '__main__':
    main()
