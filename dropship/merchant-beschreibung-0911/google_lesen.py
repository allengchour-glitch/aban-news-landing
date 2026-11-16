#!/usr/bin/env python3
"""Pullover-Pilot messen (16.11.2026): Welche Beschreibung trägt Google heute für die Damenpullover? Nur lesen.

Anlass: Seit 09./10.11. tragen 329 Damenpullover einen Sachtext als `seo.description` statt der Werbezeile
(pilot_pullover.py). Hypothese: die App «Google & YouTube» schickt `seo.description` als Beschreibung an Google.
Gemessen wird hier direkt über die Merchant API (Dienstkonto GCP_SA_KEY), nicht über einen CSV-Bericht:
`products.get` liefert je Artikel `productAttributes.description`, also die Spalte «Description» des Berichts.

Gruppen: pilot = die 329 Produkte aus sicherung/pilot_pullover_vorher.json, kontrolle = die übrigen aus
pullover_pids.json. Einordnung mit klassifiziere() aus klassifizieren.py; trägt ein Pilot-Produkt bei Google noch
eine Werbezeile, heisst die Klasse hier «werbezeile» (seine heutige SEO-Beschreibung ist keine Werbezeile mehr).

Gibt KEINE Konto-Nummer, kein Feed-Label und keine Angebotsnamen mit Label aus (Actions-Protokolle sind öffentlich),
schreibt keine Datei und nichts im Merchant Center oder im Shop.

Aufruf:
  python3 dropship/merchant-beschreibung-0911/google_lesen.py              (braucht GCP_SA_KEY und SHOPIFY_*)
  python3 dropship/merchant-beschreibung-0911/google_lesen.py --selbsttest (ohne Netz)
Exitcodes: 0 gelesen, 2 Zugang fehlt, 4 Schnittstelle antwortet nicht wie erwartet.
"""
import collections
import json
import os
import re
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
sys.path.insert(0, os.path.join(HIER, '..', 'ranking-0911'))
sys.path.insert(0, os.path.join(HIER, '..', '..', 'automation'))

from klassifizieren import klassifiziere, klartext, ist_werbezeile  # noqa: E402

BEISPIELE = 3
PAKET = int(os.environ.get('PAKET', '100'))  # Angebote je Abfrage von product_view
NICHT_GELESEN = ('nicht_gefunden', 'nicht_im_kanal', 'nicht_im_shop', 'nicht_lesbar')
# Kanal «Google & YouTube» in Shopify (wie automation/lib/gmc_schaufenster.mjs)
GOOGLE_PUBLICATION = 'gid://shopify/Publication/302872297857'
PILOT_ENDE = '2026-11-10T00:05:00Z'  # letzter Schreibzugriff des Pilots: 10.11. 00:01 UTC


def gruppen(pids, pilot_gids):
    """Produkt-Nummer -> 'pilot' oder 'kontrolle'. Pilot-Produkte, die nicht in der Pullover-Liste stehen, zählen mit."""
    pilot = {str(g).rsplit('/', 1)[-1] for g in pilot_gids}
    g = {str(p): ('pilot' if str(p) in pilot else 'kontrolle') for p in pids}
    for p in pilot:
        g.setdefault(p, 'pilot')
    return g


def angebote(pid, vids):
    """Angebotsnummern der App «Google & YouTube» in der Reihenfolge der Varianten."""
    return [f'shopify_ZZ_{pid}_{v}' for v in vids]


def waehle(views, offers, sprache='de'):
    """Erste Variante des Produkts, die Google in der gewünschten Sprache führt. views: offer_id -> {sprache: pname}."""
    for off in offers:
        p = (views.get(off) or {}).get(sprache)
        if p:
            return off, p
    return None, None


def name_aus_zeile(pv):
    """(Angebot, Name für products.get, Sprache) aus einer Zeile von product_view. Der Name entsteht aus Sprache, Feed-Label
    und Angebot (Form «sprache~label~angebot»), nicht aus der id: deren Form ist nicht zugesagt (Lauf 2 vom 16.11. fand
    mit dem Zerlegen der id kein einziges Angebot, auch nicht die Probe)."""
    off, sprache, label = pv.get('offerId') or '', pv.get('languageCode') or '', pv.get('feedLabel') or ''
    if not (off and sprache and label):
        return off, None, sprache
    return off, f'{sprache}~{label}~{off}', sprache


def fehlklasse(im_kanal):
    """Klasse eines Produkts, das Google nicht führt: nicht im Kanal (Schaufenster oder nie veröffentlicht) oder
    im Kanal, aber bei Google nicht angekommen."""
    return 'nicht_gefunden' if im_kanal else 'nicht_im_kanal'


def einordnen(gruppe, google, seo, body):
    k = klassifiziere(google, seo, body)
    if gruppe == 'pilot' and k in ('seo_heute', 'seo_alt'):
        return 'werbezeile'
    if gruppe == 'pilot' and k == 'anderes' and ist_werbezeile(google or ''):
        return 'werbezeile'
    return k


def urteil(z):
    """Regel aus dem Plan vom 16.11.: bestätigt ab 80 % «pilot» unter den bei Google gefundenen Pilot-Produkten,
    nicht bestätigt ab 50 % «werbezeile», sonst unklar. Zu wenig gefundene Produkte (unter 50) = unklar."""
    gefunden = sum(v for (g, k), v in z.items() if g == 'pilot' and k not in NICHT_GELESEN)
    if gefunden < 50:
        return 'unklar', gefunden
    if z.get(('pilot', 'pilot'), 0) >= 0.8 * gefunden:
        return 'bestaetigt', gefunden
    if z.get(('pilot', 'werbezeile'), 0) >= 0.5 * gefunden:
        return 'nicht_bestaetigt', gefunden
    return 'unklar', gefunden


def schwaerzen(text, name=''):
    """Konto-Nummer und Feed-Label aus Fehlertexten nehmen, bevor sie ins öffentliche Protokoll gehen."""
    t = str(text or '')
    if name:
        t = t.replace(name, '<konto>').replace(name.split('/')[-1], '<konto>')
    t = re.sub(r'accounts/\d+', 'accounts/<konto>', t)
    t = re.sub(r'\b[A-Z]{3}_\d{5,}\b', '<label>', t)
    return re.sub(r'\b\d{8,}\b', '<nummer>', t)


def liste(c):
    """Zählung als Text ohne geschweifte Klammern: GitHub schwärzt jede Zeile eines mehrzeiligen Secrets, beim
    JSON-Schlüssel also auch «{» und «}» (Lauf 4 vom 16.11. zeigte ein Wörterbuch nur als ***)."""
    return ', '.join(f'{k}: {v}' for k, v in sorted(c.items(), key=lambda x: str(x[0]))) or 'keine'


def bericht(z, beispiele):
    zeilen = []
    for g in ('pilot', 'kontrolle'):
        summe = sum(v for (gg, _), v in z.items() if gg == g)
        zeilen.append(f'GRUPPE {g}: {summe} Produkte')
        for (gg, k), v in sorted(z.items(), key=lambda x: -x[1]):
            if gg == g:
                zeilen.append(f'  {k:15s} {v:4d}')
                for handle, text in beispiele.get((g, k), [])[:BEISPIELE]:
                    zeilen.append(f'      z. B. {handle[:60]} | {" ".join(text.split())[:110]}')
    return zeilen


def selbsttest():
    fehler = []

    def ok(name, bed):
        print(('  ok   ' if bed else '  FAIL ') + name)
        if not bed:
            fehler.append(name)
    g = gruppen(['1', '2', '3'], ['gid://shopify/Product/2', 'gid://shopify/Product/9'])
    ok('Gruppen: Pilot aus der Sicherung, Rest Kontrolle', g == {'1': 'kontrolle', '2': 'pilot', '3': 'kontrolle', '9': 'pilot'})
    ok('Angebotsnummern im Format der App', angebote('15449059426689', [5, 6]) == ['shopify_ZZ_15449059426689_5', 'shopify_ZZ_15449059426689_6'])
    views = {'shopify_ZZ_1_5': {'fr': 'fr~L~shopify_ZZ_1_5'}, 'shopify_ZZ_1_6': {'de': 'de~L~shopify_ZZ_1_6'}}
    ok('Wahl: erste Variante mit deutscher Fassung', waehle(views, ['shopify_ZZ_1_5', 'shopify_ZZ_1_6']) == ('shopify_ZZ_1_6', 'de~L~shopify_ZZ_1_6'))
    ok('Wahl: nichts gefunden', waehle({}, ['shopify_ZZ_1_5']) == (None, None))
    ok('Name aus Sprache, Label und Angebot', name_aus_zeile({'offerId': 'shopify_ZZ_1_2', 'languageCode': 'de', 'feedLabel': 'L'}) == ('shopify_ZZ_1_2', 'de~L~shopify_ZZ_1_2', 'de'))
    ok('Name fehlt ohne Feed-Label', name_aus_zeile({'offerId': 'shopify_ZZ_1_2', 'languageCode': 'de'})[1] is None)
    ok('Fehlklasse: nicht im Google-Kanal', fehlklasse(False) == 'nicht_im_kanal')
    ok('Fehlklasse: im Kanal, aber bei Google nicht da', fehlklasse(True) == 'nicht_gefunden')
    alt = 'Strickpullover mit Rundhalsausschnitt bei LuxeStyle – Schweizer Online-Shop. Gratis-Versand ab CHF 50, 30 Tage Rückgabe.'
    neu = 'Strickpullover mit Rundhalsausschnitt für Damen. Material: Polyester. Grössen: S–XL.'
    body = 'Dieser Pullover ist ein weiches Basic für den Winter.'
    ok('Pilot: Google trägt den neuen Text', einordnen('pilot', neu, neu, body) == 'pilot')
    ok('Pilot: Google trägt noch die alte Werbezeile (gleicher Anfang wie der neue Text)', einordnen('pilot', alt, neu, body) == 'werbezeile')
    ok('Pilot: andere Werbezeile zählt auch als Werbezeile', einordnen('pilot', 'Anders bei LuxeStyle. Gratis-Versand ab CHF 50.', neu, body) == 'werbezeile')
    ok('Kontrolle: Werbezeile gleich heute', einordnen('kontrolle', alt, alt, body) == 'seo_heute')
    ok('Kontrolle: echte Beschreibung', einordnen('kontrolle', body, '', body) == 'echt')
    z = collections.Counter({('pilot', 'pilot'): 80, ('pilot', 'werbezeile'): 20, ('pilot', 'nicht_gefunden'): 9})
    ok('Urteil bestätigt ab 80 %', urteil(z) == ('bestaetigt', 100))
    z = collections.Counter({('pilot', 'pilot'): 79, ('pilot', 'werbezeile'): 21})
    ok('Urteil knapp darunter ist unklar', urteil(z)[0] == 'unklar')
    z = collections.Counter({('pilot', 'pilot'): 10, ('pilot', 'werbezeile'): 90})
    ok('Urteil nicht bestätigt ab 50 % Werbezeile', urteil(z)[0] == 'nicht_bestaetigt')
    z = collections.Counter({('pilot', 'pilot'): 40, ('pilot', 'nicht_gefunden'): 280})
    ok('Urteil unklar bei weniger als 50 gefundenen', urteil(z) == ('unklar', 40))
    z = collections.Counter({('pilot', 'pilot'): 60, ('pilot', 'nicht_lesbar'): 30, ('pilot', 'nicht_im_shop'): 5, ('pilot', 'nicht_im_kanal'): 200})
    ok('Urteil zählt nicht lesbare und fehlende Produkte nicht mit', urteil(z) == ('bestaetigt', 60))
    s = schwaerzen('HTTP 404 accounts/123456789/products/de~CHF_99383214465~shopify_ZZ_1_2', 'accounts/123456789')
    ok('Schwärzen: weder Konto-Nummer noch Feed-Label im Text', '123456789' not in s and '99383214465' not in s and 'CHF_' not in s)
    ok('Schwärzen: Konto auch ohne Namen', '987654321' not in schwaerzen('accounts/987654321 fehlt'))
    ok('Schwärzen: nackte lange Nummer (Konto ohne Präfix)', '99383214465' not in schwaerzen('Konto 99383214465 unbekannt'))
    zeilen = bericht(collections.Counter({('pilot', 'pilot'): 2, ('kontrolle', 'seo_heute'): 1}),
                     {('pilot', 'pilot'): [('handle-a', neu), ('handle-b', neu), ('handle-c', neu), ('handle-d', neu)]})
    ok('Bericht: Gruppen und Klassen', 'GRUPPE pilot: 2 Produkte' in zeilen and any('seo_heute' in z_ for z_ in zeilen))
    ok('Bericht: höchstens drei Beispiele je Klasse', sum('z. B.' in z_ for z_ in zeilen) == 3)
    ok('Zählung als Text ohne Klammern', liste(collections.Counter({3: 722})) == '3: 722' and liste(collections.Counter()) == 'keine')
    print('Selbsttest:', 'ALLE OK' if not fehler else f'{len(fehler)} FEHLER')
    return 0 if not fehler else 1


def suchen_still(h, name, abfrage):
    """reports:search ohne Ausgabe von Problemzeilen; Fehlertexte geschwärzt."""
    import requests
    zeilen, token = [], None
    url = f'https://merchantapi.googleapis.com/reports/v1/{name}/reports:search'
    while True:
        body = {'query': abfrage, 'pageSize': 1000}
        if token:
            body['pageToken'] = token
        r = None
        for versuch in range(6):
            try:
                r = requests.post(url, headers=h, json=body, timeout=120)
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError):
                r = None
                time.sleep(2 ** versuch * 2)
                continue
            if r.status_code in (429, 500, 502, 503, 504):
                time.sleep(2 ** versuch * 2)
                continue
            break
        if r is None or r.status_code != 200:
            print('ABBRUCH: reports:search ' + (schwaerzen(f'HTTP {r.status_code} {r.text[:300]}', name) if r is not None else 'nicht erreichbar'))
            sys.exit(4)
        j = r.json()
        zeilen += j.get('results') or []
        token = j.get('nextPageToken')
        if not token:
            return zeilen


def produkt_lesen(h, name, pname):
    import requests
    for versuch in range(5):
        try:
            r = requests.get(f'https://merchantapi.googleapis.com/products/v1/{name}/products/{pname}', headers=h, timeout=60)
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError):
            time.sleep(2 ** versuch)
            continue
        if r.status_code in (429, 500, 502, 503, 504):
            time.sleep(2 ** versuch)
            continue
        if r.status_code == 200:
            attr = r.json().get('productAttributes') or {}
            return attr.get('description') or '', None
        return None, f'HTTP {r.status_code}'
    return None, 'nicht erreichbar'


def main():
    if '--selbsttest' in sys.argv:
        return selbsttest()
    for v in ('SHOPIFY_SHOP', 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET'):
        if not os.environ.get(v, '').strip():
            print(f'ABBRUCH: {v} fehlt')
            return 2
    import merchant_bildprobleme as mb  # braucht google-auth und requests (nur im Lauf, nicht im Selbsttest)
    import apply_fristen as netz        # Shopify: token(), gql()
    pids = json.load(open(os.path.join(HIER, 'pullover_pids.json'), encoding='utf-8'))
    pilot_gids = json.load(open(os.path.join(HIER, 'sicherung', 'pilot_pullover_vorher.json'), encoding='utf-8'))
    gruppe = gruppen(pids, pilot_gids)
    print(f'Pullover: {len(gruppe)} Produkte, davon Pilot {sum(1 for v in gruppe.values() if v == "pilot")}')

    shop, tok = netz.token()
    q = ('query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id handle status updatedAt descriptionHtml seo{ description } '
         f'gp: publishedOnPublication(publicationId: "{GOOGLE_PUBLICATION}") '
         'variants(first:3){ nodes{ legacyResourceId } } } } }')
    shopify, ids = {}, list(gruppe)
    for i in range(0, len(ids), 100):
        for n in netz.gql(shop, tok, q, {'ids': [f'gid://shopify/Product/{x}' for x in ids[i:i + 100]]})['nodes']:
            if n:
                shopify[n['id'].rsplit('/', 1)[-1]] = n
    print(f'Shopify: {len(shopify)} von {len(ids)} Produkten gelesen')
    for g in ('pilot', 'kontrolle'):
        im = sum(1 for p, n in shopify.items() if gruppe.get(p) == g and n.get('gp'))
        print(f'Shopify, Kanal «Google & YouTube»: {g} {im} von {sum(1 for p in shopify if gruppe.get(p) == g)} veröffentlicht')

    h = mb.anmelden()
    name = mb.konto(h)
    # Messgerät-Probe: ein Angebot der App, das Google am 15.11. sicher führte (MODUS=autofeed in merchant_bildprobleme.py)
    probe = next((o for o in mb.BILDPROBEN if o.startswith('shopify_ZZ_')), '')
    alle_angebote, je_produkt = [probe] if probe else [], {}
    for p, n in shopify.items():
        offers = angebote(p, [v['legacyResourceId'] for v in (n.get('variants') or {}).get('nodes') or []])
        je_produkt[p] = offers
        alle_angebote += offers
    views, zeilen, formen = collections.defaultdict(dict), 0, collections.Counter()
    for i in range(0, len(alle_angebote), PAKET):
        liste = ','.join("'" + o + "'" for o in alle_angebote[i:i + PAKET])
        for x in suchen_still(h, name, f'SELECT id, offer_id, language_code, feed_label FROM product_view WHERE offer_id IN ({liste})'):
            zeilen += 1
            pv = x.get('productView') or {}
            formen[len(str(pv.get('id', '')).split('~'))] += 1
            off, pname, sprache = name_aus_zeile(pv)
            if pname:
                views[off][sprache] = pname
    print(f'product_view: {zeilen} Zeilen; Teile der id (Anzahl «~»-Teile: Zeilen): {liste(formen)}')
    print(f'Merchant: {sum(1 for o in views if o != probe)} von {len(alle_angebote) - (1 if probe else 0)} Angeboten bei Google gefunden '
          f'(Probe {probe}: {"gefunden" if probe in views else "NICHT gefunden, Messgerät prüfen"})')

    z, beispiele, fehler = collections.Counter(), collections.defaultdict(list), collections.Counter()
    spaeter = collections.Counter()  # Pilot-Produkte mit einer Shopify-Änderung nach dem Ende des Pilots, je Klasse
    for p, g in gruppe.items():
        n = shopify.get(p)
        if not n:
            z[(g, 'nicht_im_shop')] += 1
            continue
        off, pname = waehle(views, je_produkt.get(p, []))
        if not pname:
            z[(g, fehlklasse(bool(n.get('gp'))))] += 1
            continue
        text, err = produkt_lesen(h, name, pname)
        if err:
            fehler[err] += 1
            z[(g, 'nicht_lesbar')] += 1
            continue
        k = einordnen(g, text, (n.get('seo') or {}).get('description') or '', klartext(n.get('descriptionHtml')))
        z[(g, k)] += 1
        if g == 'pilot' and str(n.get('updatedAt') or '') > PILOT_ENDE:
            spaeter[k] += 1
        if len(beispiele[(g, k)]) < BEISPIELE:
            beispiele[(g, k)].append((n.get('handle') or p, text))
    for zeile in bericht(z, beispiele):
        print(zeile)
    if fehler:
        print('Lesefehler products.get:', liste(fehler))
    print(f'Pilot, in Shopify nach {PILOT_ENDE} noch einmal geändert (updatedAt), je Klasse: {liste(spaeter)}')
    u, gefunden = urteil(z)
    print(f'URTEIL: {u} (Pilot-Produkte bei Google gefunden und gelesen: {gefunden}; Regel: ab 80 % «pilot» bestätigt, '
          f'ab 50 % «werbezeile» nicht bestätigt)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
