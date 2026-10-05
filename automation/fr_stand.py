#!/usr/bin/env python3
"""fr_stand.py — misst den Stand der französischen Übersetzung (05.10.2026, Plan Punkt 10).

Nur lesen. Druckt EINE Ampel-Zeile «FR: …» für den Aufseher:
  - Menü/Links/Policies: fehlende oder veraltete (outdated) fr-Felder
  - Top-Produktseiten (Landeseiten 90 T, ACTIVE, ohne POD): Produkte mit < 3 fr-Keys
  - Menü-Kollektionen: Kollektionen mit fehlenden fr-Feldern
  - WebPresence luxestyle.ch: ob fr als alternateLocale veröffentlicht ist
Veraltet («outdated») heisst: der deutsche Text wurde geändert, die Übersetzung hinkt hinterher.
Aufruf: python3 automation/fr_stand.py   (Shopify-Token wie kaufwille_zeile)."""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql

POD = re.compile(r'pod|printful|selbst-gestalten', re.I)


def stand(typ):
    fehl = outd = 0; after = None
    while True:
        d = gql('query($t:TranslatableResourceType!,$a:String){ translatableResources(first:100,resourceType:$t,after:$a){ pageInfo{hasNextPage endCursor} edges{ node{ translatableContent{ key value } translations(locale:"fr"){ key outdated } } } } }', {"t": typ, "a": after})['translatableResources']
        for e in d['edges']:
            n = e['node']
            keys = {c['key'] for c in n['translatableContent'] if (c['value'] or '').strip()} - {'handle'}
            have = {x['key'] for x in n['translations']}
            fehl += len(keys - have); outd += sum(1 for x in n['translations'] if x['outdated'])
        if not d['pageInfo']['hasNextPage']:
            break
        after = d['pageInfo']['endCursor']
    return fehl, outd


def top_produkte(n_soll=58):
    q = ("FROM sessions SHOW sessions GROUP BY landing_page_path WHERE human_or_bot_session = 'human' "
         "AND landing_page_type = 'Product' SINCE -90d UNTIL today ORDER BY sessions DESC LIMIT 200")
    rows = gql('query($q:String!){shopifyqlQuery(query:$q){tableData{rows}}}', {"q": q})['shopifyqlQuery']['tableData']['rows']
    hs = []
    for r in rows:
        m = re.search(r'/products/([^/?#]+)', r.get('landing_page_path') or '')
        if m and m.group(1) not in hs:
            hs.append(m.group(1))
    luecken = []; gezaehlt = 0
    for i in range(0, len(hs), 10):
        ch = hs[i:i + 10]
        d = gql('{' + ' '.join(f'p{j}: productByIdentifier(identifier:{{handle:"{h}"}}){{ handle status tags translations(locale:"fr"){{ key outdated }} }}' for j, h in enumerate(ch)) + '}')
        for j, h in enumerate(ch):
            p = d.get(f'p{j}')
            if not p or p['status'] != 'ACTIVE' or any(POD.search(t) for t in p['tags']):
                continue
            gezaehlt += 1
            if len(p['translations']) < 3 or any(t['outdated'] for t in p['translations']):
                luecken.append(h)
            if gezaehlt >= n_soll:
                return gezaehlt, luecken
    return gezaehlt, luecken


def menu_kollektionen():
    menus = gql('{ menus(first:20){ nodes{ items{ url items{ url items{ url } } } } } }')['menus']['nodes']
    urls = []
    def walk(items):
        for it in items:
            urls.append(it.get('url') or ''); walk(it.get('items') or [])
    for m in menus:
        walk(m['items'])
    handles = sorted({re.search(r'/collections/([^/?#]+)', u).group(1) for u in urls if '/collections/' in u})
    fehl = []
    for i in range(0, len(handles), 10):
        ch = handles[i:i + 10]
        d = gql('{' + ' '.join(f'c{j}: collectionByIdentifier(identifier:{{handle:"{h}"}}){{ handle translations(locale:"fr"){{ key outdated }} }}' for j, h in enumerate(ch)) + '}')
        for j, h in enumerate(ch):
            c = d.get(f'c{j}')
            if c and ('title' not in {t['key'] for t in c['translations']} or any(t['outdated'] for t in c['translations'])):
                fehl.append(h)
    return len(handles), fehl


def main():
    teile = []; warn = False
    for typ, name in (('MENU', 'Menü'), ('LINK', 'Links'), ('SHOP_POLICY', 'Policies')):
        f, o = stand(typ)
        if f or o:
            warn = True; teile.append(f'{name} fehlt {f}/veraltet {o}')
    n, luecken = top_produkte()
    if luecken:
        warn = True; teile.append(f'Top-{n} Produkte {len(luecken)} ohne fr ({", ".join(luecken[:3])})')
    nk, fehl = menu_kollektionen()
    if fehl:
        warn = True; teile.append(f'Menü-Kollektionen {len(fehl)}/{nk} ohne fr')
    wp = [w for w in gql('{ webPresences(first:10){ nodes{ alternateLocales{locale} domain{ host } } } }')['webPresences']['nodes'] if w['domain'] and w['domain']['host'] == 'luxestyle.ch']
    alt = [l['locale'] for l in wp[0]['alternateLocales']] if wp else []
    live = 'fr' in alt
    if not live:
        teile.append(f'/fr NICHT veröffentlicht (WebPresence {alt}) — Betreiber-Klick oder webPresenceUpdate')
    print(('⚠️ ' if warn else '') + 'FR: ' + ('; '.join(teile) if teile else f'vollständig (Menü, Policies, Top-{n}, {nk} Menü-Kollektionen), /fr live'))


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'FR: unklar ({type(e).__name__}: {str(e)[:80]})')
