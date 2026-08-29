#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tote_rankings_ersatz.py — sucht zu jeder toten rankenden Seite den besten LEBENDEN Ersatz.

Gehört zu `automation/tote_rankings.py`, das die toten Adressen findet. Dieses Werkzeug
schlägt die Weiterleitung vor; es SCHREIBT NUR mit `SETZEN=1`.

WARUM ÜBERHAUPT WEITERLEITEN: Ein gedraftetes Produkt liefert der Besucherin einen 404.
Google hält die Adresse trotzdem monatelang im Index — die Position bleibt, der Verkehr
kommt an, und läuft ins Leere. Eine 301 gibt das Ranking-Signal an die lebende Seite weiter,
statt es verfallen zu lassen. Der Artikel bleibt gedraftet; es wird nichts wiederbelebt.

⚠️ WAS DIESES WERKZEUG NICHT TUT: Ein gedraftetes Produkt veröffentlichen. `keine-lieferanten-ref`
heisst, die Ware ist nicht bestellbar; `ausverkauft-lieferant` ebenso. Ein 404 ist ärgerlich,
eine unlieferbare Bestellung teuer (Lehre vom 20.08., Bestellung #1008).

⚠️ MARKENSEITEN BLEIBEN AUSSEN VOR. Casio, Chanel, Armani, Valentino, CeraVe, L'Oréal,
Paul Hewitt, New Era: dort ist die Frage «Kategorie oder 404?» eine Betreiber-Entscheidung
(`dropship/COWORK-AUFTRAEGE.md`, Punkt D) und keine technische. Wer für «casio illuminator»
auf eine Uhren-Kategorie ohne Casio weiterleitet, enttäuscht die Suchende härter als ein 404.

WIE DER ERSATZ GEFUNDEN WIRD: aus dem Titel des toten Produkts werden die tragenden Wörter
genommen, damit wird der LIVE-Katalog durchsucht, und die Kandidaten werden nach
Wort-Überschneidung bewertet. Unter einer Mindestüberschneidung wird NICHTS vorgeschlagen —
lieber kein Vorschlag als eine Weiterleitung auf etwas anderes.

Nutzung:  python3 automation/tote_rankings_ersatz.py          (nur ansehen)
          SETZEN=1 python3 automation/tote_rankings_ersatz.py (301 anlegen)
"""
import json, os, re, sys, time, unicodedata, urllib.request

SHOP = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOKEN = (os.environ.get('SHOPIFY_ADMIN_TOKEN')
         or open('/tmp/cj_shop_token.txt').read().strip())
SETZEN = os.environ.get('SETZEN') == '1'
BERICHT = 'dropship/TOTE-RANKINGS.md'
LEDGER = 'dropship/_tote_rankings_301.txt'

# Marken: die Entscheidung gehört dem Betreiber, nicht diesem Skript.
MARKEN = re.compile(r'\b(casio|chanel|armani|valentino|cerave|l.?oreal|paul hewitt|'
                    r'new era|dodgers|obo bettermann)\b', re.I)
# Füllwörter, die nichts über die Ware aussagen
STOPP = set('''für und mit der die das den dem des ein eine einen im in aus auf zu bei von
nie wieder immer dein deine mein sehr ganz alle jetzt neu neue set stück cm mm ml
l xl schwarz weiss weiß rot blau grün grau silberfarben'''.split())


# ── Von Hand entschieden ────────────────────────────────────────────────────────
# Die Wort-Überschneidung ist ein Anhaltspunkt, kein Urteil. Diese Ziele sind
# nachgesehen, nicht gerechnet.
HANDVERLESEN = {
    # 2'740 Suchen/Monat. Die Überschneidung lag bei 0.17, weil die lebenden Brunnen
    # anders heissen — es gibt aber fünfzehn davon. Der Keramikbrunnen nennt wie das
    # tote Produkt ausdrücklich Katze UND Hund; die drei Suchbegriffe verlangen beides.
    '/products/trinkbrunnen-1l-fur-katze-hund-immer-frisches-wass-1002046':
        ('/products/keramik-trinkbrunnen-fur-katzen-hunde-609600',
         'nennt wie das tote Produkt Katze und Hund'),
    # «holzuhren», 480/Monat. Der tote Artikel war ein Dubletten-Draft; der Zwilling lebt.
    '/products/holz-armbanduhr-623300':
        ('/products/holz-armbanduhr-fur-herren-602900', 'lebender Zwilling der Dublette'),
    # «trinkrucksack»/«trinkblase», 260/Monat. Tot: 2 l, lebend: 3 l — dieselbe Ware.
    '/products/trinkrucksack-hydration-2l-trinkblase':
        ('/products/sportlicher-trinkrucksack-mit-3l-blase-629900', 'dieselbe Ware, 3 l statt 2 l'),
}

# Automatische Vorschläge, die ich nach dem Nachsehen VERWORFEN habe.
NICHT = {
    # Ein Becherhalter fürs Auto ist kein magnetischer Handyhalter. Die Überschneidung
    # kam allein von «Halter»/«Phone» — dieselbe Wortfalle wie «IPL» in «L-IPL-iner».
    '/products/cup-holder-halter-mit-phone-mount': 'Vorschlag war ein Handyhalter, keine Getränkehalterung',
    # «r36» sucht ein bestimmtes Modell (R36S). Wir führen andere Retro-Konsolen; wer
    # das Modell sucht, ist auf einer fremden genauso enttäuscht wie bei einer Markenseite.
    '/products/r36s-retro-handheld-konsole-20-000-spiele-051265': 'Modellsuche — kein gleichwertiges Gerät im Sortiment',
}


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
    return {}


def worte(t):
    t = unicodedata.normalize('NFKD', t.lower())
    t = t.replace('ä', 'a').replace('ö', 'o').replace('ü', 'u').replace('ß', 'ss')
    return {w for w in re.findall(r'[a-z0-9]{3,}', t) if w not in STOPP}


def lies_bericht():
    """(pfad, status, titel, volumen) je toter Adresse."""
    if not os.path.exists(BERICHT):
        return []
    raus, pfad = [], None
    for z in open(BERICHT, encoding='utf-8'):
        m = re.match(r'^## (/\S+)\s+—\s+\*\*(\w+)\*\*', z)
        if m:
            pfad, status = m.group(1), m.group(2)
            continue
        m2 = re.match(r'^(.+?)\s+·\s+\*\*~(\d+) Suchen', z)
        if m2 and pfad:
            raus.append((pfad, status, m2.group(1).strip(), int(m2.group(2))))
            pfad = None
    return raus


def suche_ersatz(titel):
    """Kandidaten sammeln und nach Wort-Überschneidung bewerten.

    ⚠️ NICHT alle Wörter in EINE Abfrage: Shopify verknüpft sie und findet dann nichts.
    Der erste Entwurf suchte «frisches trinkbrunnen wasser» und meldete «nichts gefunden»
    für ein Produkt, zu dem es fünfzehn lebende Trinkbrunnen gibt. Deshalb je Wort EINE
    Abfrage und die Ergebnisse zusammenlegen — das Bewerten macht ohnehin die Überschneidung.
    """
    ziel = worte(titel)
    if not ziel:
        return None
    kandidaten = {}
    for w in sorted(ziel, key=len, reverse=True)[:3]:
        d = gql('{products(first:25,query:%s){nodes{handle title status}}}'
                % json.dumps(f'{w} status:active'))
        for n in d.get('products', {}).get('nodes', []):
            if n['status'] == 'ACTIVE':
                kandidaten[n['handle']] = n
    besten, bestwert = None, 0.0
    for n in kandidaten.values():
        k = worte(n['title'])
        if not k:
            continue
        wert = len(ziel & k) / len(ziel | k)
        if wert > bestwert:
            besten, bestwert = n, wert
    return (besten, bestwert) if besten else None


def redirect_setzen(von, nach):
    d = gql('''mutation($r:UrlRedirectInput!){urlRedirectCreate(urlRedirect:$r){
        urlRedirect{id} userErrors{field message}}}''',
            {'r': {'path': von, 'target': nach}})
    e = (d.get('urlRedirectCreate') or {}).get('userErrors') or []
    return (not e), e


def main():
    fertig = set()
    if os.path.exists(LEDGER):
        fertig = {l.split('\t')[0] for l in open(LEDGER, encoding='utf-8') if l.strip()}

    vorschlaege, offen = [], []
    for pfad, status, titel, vol in lies_bericht():
        if pfad in fertig:
            continue
        if pfad in NICHT:
            offen.append((vol, pfad, titel, 'verworfen: ' + NICHT[pfad]))
            continue
        if pfad in HANDVERLESEN:
            ziel, warum = HANDVERLESEN[pfad]
            vorschlaege.append((vol, pfad, titel,
                                {'handle': ziel.rsplit('/', 1)[-1], 'title': warum}, 1.0))
            continue
        if MARKEN.search(titel):
            offen.append((vol, pfad, titel, 'Markenseite → Betreiber (Cowork D)'))
            continue
        e = suche_ersatz(titel)
        if not e or e[1] < 0.30:
            grund = f'kein passender Ersatz (bester Wert {e[1]:.2f})' if e else 'nichts gefunden'
            offen.append((vol, pfad, titel, grund))
            continue
        vorschlaege.append((vol, pfad, titel, e[0], e[1]))

    vorschlaege.sort(reverse=True)
    offen.sort(reverse=True)
    print(f'{len(vorschlaege)} Weiterleitung(en) vorgeschlagen · {len(offen)} offen\n')
    for vol, pfad, titel, ziel, wert in vorschlaege:
        print(f'~{vol:>5}/Mt  {titel[:46]:48}')
        print(f'           → {ziel["title"][:46]:48}  ({wert:.2f})')
        print(f'             /products/{ziel["handle"]}')
        if SETZEN:
            ok, err = redirect_setzen(pfad, '/products/' + ziel['handle'])
            print('           ' + ('✅ 301 gesetzt' if ok else f'❌ {err}'))
            if ok:
                with open(LEDGER, 'a', encoding='utf-8') as f:
                    f.write(f'{pfad}\t/products/{ziel["handle"]}\t{vol}\n')
    if offen:
        print('\nOhne Vorschlag:')
        for vol, pfad, titel, grund in offen:
            print(f'  ~{vol:>5}/Mt  {titel[:44]:46} — {grund}')
    print('FERTIG: 0')


if __name__ == '__main__':
    main()
