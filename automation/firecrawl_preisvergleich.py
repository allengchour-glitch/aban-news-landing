#!/usr/bin/env python3
"""firecrawl_preisvergleich.py — Preisvergleich unserer Produkte mit dem Schweizer Markt über Firecrawl (24.11.2026).

ANLASS: Betreiber 24.11. «fireclaw nutzen oder ich kündige» (Firecrawl Hobby, 5'000 Credits je Monat, Zyklus ab 24.11.).
Der Engpass ist Abschluss, nicht Verkehr allein — und der Preis entscheidet mit. Bisher kannten wir nur unseren EK (CJ),
nicht den Marktpreis in der Schweiz. Dieses Werkzeug fragt je Produkt EINE Firecrawl-Suche (country CH) und lässt die
3 besten Treffer-Seiten per JSON-Auswertung lesen: «ähnlichstes Angebot, Name, Preis, Währung, gleiche Art?».
GEMESSEN 24.11.: 17 Credits je Produkt (Suche 2 + 3 × JSON-Seite 5). Beispiel Socken-Adventskalender 24 Paar:
wir CHF 54.90, Galaxus FlipSox CHF 39.90 (gleiche Art).

Es schreibt NICHTS in den Shop. Ergebnis: Ledger dropship/_preisvergleich.tsv (eine Zeile je Produkt und Lauf) und
Bericht dropship/PREISVERGLEICH.md (teurer als der Markt / billiger als der Markt). Preisentscheide bleiben beim
Betreiber bzw. laufen über preis_verlustschutz (EK-Boden) — nie unter EK + Verlustschutz senken.

  python3 automation/firecrawl_preisvergleich.py --pools          # alle Startseiten-Pools
  python3 automation/firecrawl_preisvergleich.py --ids 123,456     # einzelne Produkt-IDs (Zahlen)
  python3 automation/firecrawl_preisvergleich.py --bericht         # nur Bericht aus dem Ledger neu bauen
ENV: FIRECRAWL_API_KEY (Pflicht) · RESERVE (Credits, die übrig bleiben müssen; Vorgabe 1500) · TAGE (Produkt erst nach
     so vielen Tagen erneut prüfen; Vorgabe 14) · LIMIT (max. Produkte je Lauf) · PARALLEL (Vorgabe 2) · EUR_CHF (0.94, Schätzung)
"""
import concurrent.futures as cf
import datetime as dt
import json
import os
import re
import statistics
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(ROOT, 'dropship/_preisvergleich.tsv')
BERICHT = os.path.join(ROOT, 'dropship/PREISVERGLEICH.md')
SHOP = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOK = open('/tmp/cj_shop_token.txt').read().strip() if os.path.exists('/tmp/cj_shop_token.txt') else ''
FC = os.environ.get('FIRECRAWL_API_KEY', '')
RESERVE = int(os.environ.get('RESERVE', '1500'))
TAGE = int(os.environ.get('TAGE', '14'))
LIMIT = int(os.environ.get('LIMIT', '0') or 0)
PARALLEL = int(os.environ.get('PARALLEL', '2'))
EUR_CHF = float(os.environ.get('EUR_CHF', '0.94'))
POOLS = ['startseite-pool-trends', 'startseite-pool-mehr', 'startseite-pool-weihnachten', 'startseite-pool-winter',
         'startseite-pool-geschenke', 'startseite-pool-schmuck', 'startseite-pool-wohnen']


def gql(q, v=None, versuche=6):
    for i in range(versuche):
        try:
            r = urllib.request.Request(f'https://{SHOP}/admin/api/2025-10/graphql.json',
                                       data=json.dumps({'query': q, 'variables': v or {}}).encode(),
                                       headers={'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOK})
            d = json.load(urllib.request.urlopen(r, timeout=60))
            if d.get('errors'):
                raise RuntimeError(str(d['errors'])[:200])
            return d['data']
        except Exception as e:  # Drosselung / Netz
            if i == versuche - 1:
                raise
            time.sleep(10 + 10 * i)


def fc(pfad, body=None, timeout=150):
    r = urllib.request.Request('https://api.firecrawl.dev' + pfad, data=json.dumps(body).encode() if body else None,
                               headers={'Authorization': 'Bearer ' + FC, 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(r, timeout=timeout))


def guthaben():
    return fc('/v2/team/credit-usage')['data']['remainingCredits']


def produkte_aus_pools():
    ids = []
    for h in POOLS:
        d = gql('query($h:String!){collectionByHandle(handle:$h){products(first:100){nodes{id}}}}', {'h': h})
        c = d['collectionByHandle']
        if c:
            ids += [n['id'] for n in c['products']['nodes']]
    return list(dict.fromkeys(ids))


def produkt(gid):
    d = gql('query($i:ID!){product(id:$i){id handle title status productType priceRangeV2{minVariantPrice{amount}} descriptionHtml}}', {'i': gid})
    return d['product']


def suchtext(titel):
    t = re.split(r'\s[·|–-]\s', titel)[0]           # Zusätze nach «·» / « – » weg
    t = re.sub(r'\b\d+([.,]\d+)?\s?(cm|mm|ml|g|kg|m)\b', ' ', t, flags=re.I)
    t = re.sub(r'[«»"„“()]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()


def vergleich(p):
    titel = p['title']
    kurz = re.sub(r'<[^>]+>', ' ', p.get('descriptionHtml') or '')
    kurz = re.sub(r'\s+', ' ', kurz).strip()[:300]
    prompt = (f"Our product: '{titel}'. Short description: {kurz!r}. On this page find the single offer most similar to our "
              "product. Return its name, its current price as a number, the currency (CHF or EUR or other), and whether it is "
              "essentially the same kind of product (same product type, similar size/quantity/material; a premium brand "
              "version of the same type still counts as same kind). If the page is a list, pick the closest item. "
              "If there is no price, preis = null.")
    schema = {'type': 'object', 'properties': {'name': {'type': 'string'}, 'preis': {'type': ['number', 'null']},
              'waehrung': {'type': 'string'}, 'gleiche_art': {'type': 'boolean'}, 'shop': {'type': 'string'}},
              'required': ['name', 'preis', 'waehrung', 'gleiche_art']}
    body = {'query': suchtext(titel) + ' kaufen', 'limit': 3, 'country': 'CH', 'location': 'Switzerland',
            'scrapeOptions': {'onlyMainContent': True, 'formats': [{'type': 'json', 'prompt': prompt, 'schema': schema}]}}
    d = fc('/v2/search', body)
    treffer = []
    for r in (d.get('data') or {}).get('web') or []:
        j = r.get('json') or {}
        preis, wae = j.get('preis'), (j.get('waehrung') or '').upper()
        if not isinstance(preis, (int, float)) or preis <= 0 or not j.get('gleiche_art'):
            continue
        chf = preis if wae == 'CHF' else (round(preis * EUR_CHF, 2) if wae == 'EUR' else None)
        if chf:
            treffer.append({'chf': chf, 'wae': wae, 'name': (j.get('name') or '')[:80], 'url': r.get('url', '')})
    return treffer, d.get('creditsUsed', 0)


def ledger_lesen():
    zeilen = []
    if os.path.exists(LEDGER):
        for z in open(LEDGER, encoding='utf-8'):
            f = z.rstrip('\n').split('\t')
            if len(f) >= 8 and f[0] != 'id':
                zeilen.append(f)
    return zeilen


def bericht():
    letzte = {}
    for f in ledger_lesen():
        letzte[f[0]] = f   # jüngste Zeile je Produkt gewinnt (Ledger ist chronologisch)
    zeilen = []
    for gid, f in letzte.items():
        _, datum, handle, titel, unser, n, median, minimum, belege = f[:9]
        if int(n) == 0:
            continue
        unser, median, minimum = float(unser), float(median), float(minimum)
        zeilen.append((unser / median, datum, handle, titel, unser, int(n), median, minimum, belege))
    zeilen.sort(reverse=True)
    teurer = [z for z in zeilen if z[0] >= 1.25]
    billiger = [z for z in zeilen if z[0] <= 0.75]
    out = [f'# Preisvergleich mit dem Schweizer Markt (Firecrawl)', '',
           f'Stand {dt.datetime.utcnow():%d.%m.%Y %H:%M} UTC · {len(letzte)} Produkte geprüft, {len(zeilen)} mit vergleichbaren Angeboten. '
           'Vergleich = Median der Angebote gleicher Art (CHF; EUR × ' + str(EUR_CHF) + ' geschätzt). Nur Hinweis — Preise ändert '
           'dieses Werkzeug nicht; nie unter EK + Verlustschutz.', '',
           f'## Deutlich teurer als der Markt (≥ 25 %): {len(teurer)}', '', '| Faktor | Produkt | wir | Markt-Median | günstigstes | Belege |', '|---|---|---|---|---|---|']
    for z in teurer:
        out.append(f'| {z[0]:.2f} | [{z[3][:60]}](https://luxestyle.ch/products/{z[2]}) | {z[4]:.2f} | {z[6]:.2f} | {z[7]:.2f} | {z[8][:200]} |')
    out += ['', f'## Deutlich billiger als der Markt (≤ 75 %): {len(billiger)}', '', '| Faktor | Produkt | wir | Markt-Median | Belege |', '|---|---|---|---|---|']
    for z in sorted(billiger):
        out.append(f'| {z[0]:.2f} | [{z[3][:60]}](https://luxestyle.ch/products/{z[2]}) | {z[4]:.2f} | {z[6]:.2f} | {z[8][:200]} |')
    open(BERICHT, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print(f'BERICHT: {len(zeilen)} verglichen · teurer {len(teurer)} · billiger {len(billiger)} → {BERICHT}')


def main():
    if '--bericht' in sys.argv:
        bericht(); return
    if not FC:
        sys.exit('FIRECRAWL_API_KEY fehlt')
    if '--ids' in sys.argv:
        ids = ['gid://shopify/Product/' + x.strip() for x in sys.argv[sys.argv.index('--ids') + 1].split(',') if x.strip()]
    else:
        ids = produkte_aus_pools()
    heute = dt.date.today()
    frisch = {f[0] for f in ledger_lesen() if (heute - dt.date.fromisoformat(f[1][:10])).days < TAGE}
    ids = [i for i in ids if i not in frisch]
    if LIMIT:
        ids = ids[:LIMIT]
    rest = guthaben()
    print(f'{len(ids)} Produkte offen · Firecrawl-Guthaben {rest} · Reserve {RESERVE}', flush=True)
    if not os.path.exists(LEDGER):
        open(LEDGER, 'w', encoding='utf-8').write('id\tdatum\thandle\ttitel\tunser_chf\tn\tmedian_chf\tmin_chf\tbelege\n')
    verbraucht = 0

    def eins(gid):
        p = produkt(gid)
        if not p or p['status'] != 'ACTIVE':
            return None
        treffer, cr = vergleich(p)
        return p, treffer, cr

    with cf.ThreadPoolExecutor(PARALLEL) as ex:
        offen = list(ids)
        while offen:
            if rest - verbraucht - 17 * PARALLEL < RESERVE:
                print(f'STOPP: Reserve erreicht (Guthaben ~{rest - verbraucht})', flush=True)
                break
            stapel, offen = offen[:PARALLEL], offen[PARALLEL:]
            for fut in [ex.submit(eins, g) for g in stapel]:
                try:
                    r = fut.result()
                except Exception as e:
                    print('FEHLER', str(e)[:160], flush=True)
                    continue
                if not r:
                    continue
                p, treffer, cr = r
                verbraucht += cr
                unser = float(p['priceRangeV2']['minVariantPrice']['amount'])
                preise = [t['chf'] for t in treffer]
                med = statistics.median(preise) if preise else 0
                belege = ' ; '.join(f"{t['chf']:.2f} {t['url'][:70]}" for t in treffer)
                with open(LEDGER, 'a', encoding='utf-8') as f:
                    f.write('\t'.join([p['id'], dt.datetime.utcnow().isoformat(timespec='minutes'), p['handle'],
                                       p['title'].replace('\t', ' '), f'{unser:.2f}', str(len(preise)), f'{med:.2f}',
                                       f'{(min(preise) if preise else 0):.2f}', belege.replace('\t', ' ')]) + '\n')
                print(f"{unser:7.2f} vs {med:7.2f} (n={len(preise)}) {p['title'][:60]}", flush=True)
    print(f'FERTIG: ~{verbraucht} Credits verbraucht, Guthaben jetzt {guthaben()}', flush=True)
    bericht()


if __name__ == '__main__':
    main()
