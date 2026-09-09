#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""lieferblock_doppelt.py — entfernt die ZWEITE Lieferzeit-Angabe im Produkttext.

WARUM ES DAS BRAUCHT (09.09.2026, gefunden beim Lesen eines reparierten Textes):
Der Shop hat ZWEI Werkzeuge, die Versandaussagen richtigstellen, und jedes kennt nur
SEINE Blockform:

  · versandaussagen_wahrheit.py schreibt  <p>📦 <strong>Lieferzeit Schweiz:</strong> …</p>
  · versand_jenachland.py       ersetzt   <p class="ls-liefer" data-tier="…">…</p>

Beide quittieren korrekt — jedes ueber seinen eigenen Block. Beim Moissanit-Ohrstecker
«Trilogie» standen dadurch BEIDE Bloecke im Text: oben die alte, unerfuellbare Zusage
«CH / EU: 10–18 Tage · USA: 12–22 Tage», weiter unten die richtige «Lieferzeit Schweiz:
10–20 Werktage». Elf Ledger-Zeilen sagten «erledigt», und die Kundin las trotzdem beides.

**Zwei Reparaturwerkzeuge auf demselben Feld brauchen eine gemeinsame Frage: steht die
Aussage danach genau EINMAL da?** Keines der beiden kann das allein beantworten — die
Sicherung in versand_jenachland.py bricht sogar ausdruecklich ab, sobald sich etwas
AUSSERHALB seines Blocks aendert (zu Recht: sie schuetzt Nachbarinformation). Also ein
eigener, kleiner Schritt danach.

WAS ES TUT: Traegt ein Produkt einen `ls-liefer`-Block UND zusaetzlich einen nackten
`<p>📦 <strong>Lieferzeit …</strong>…</p>`, faellt der NACKTE weg. Der `ls-liefer`-Block
bleibt — er traegt die Stufe (`data-tier`) und den Zusatz «Versand nur in die Schweiz und
nach Liechtenstein», ist also die vollstaendigere Aussage.

⚠️ Steht NUR der nackte Block da, wird nichts angefasst: dann ist er die einzige Aussage.
⚠️ Sagen die beiden Bloecke VERSCHIEDENE Zeiten, wird ebenfalls nichts angefasst und der
   Fall gemeldet — welche Zahl stimmt, entscheidet kein Automat.

  DRY=1   nur zeigen        CAP=N   hoechstens N Produkte      SEITEN=N  hoechstens N Seiten

⚠️ SEITEN ist die wichtigere Bremse. Die Suche kann die Klasse nicht enger fassen: nach der
Reparatur sagen BEIDE Bloecke «Lieferzeit Schweiz», eine Zwei-Phrasen-Suche findet sie also
nicht. Ohne Seitenbremse blaettert ein Lauf mit wenigen Treffern den halben Katalog durch und
hungert den geteilten Shopify-Eimer aus — genau der Fehler, der am 03.09. die Waechter
fehlalarmieren liess. Der taegliche Lauf nimmt deshalb die AELTESTEN Seiten zuerst
(CREATED_AT aufsteigend): die Klasse ist Altlast, dort sitzt sie.
"""
import json, os, re, sys, time, urllib.request

SHOP  = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOKEN = os.environ.get('SHOPIFY_ADMIN_TOKEN') or open('/tmp/cj_shop_token.txt').read().strip()
DRY   = os.environ.get('DRY') == '1'
CAP   = int(os.environ.get('CAP', '400'))
SEITEN = int(os.environ.get('SEITEN', '40'))   # 40 × 100 = 4'000 aelteste Produkte
LEDGER = 'dropship/_lieferblock_doppelt.txt'

LS   = re.compile(r'<p class="ls-liefer"[^>]*>(.*?)</p>', re.S)
NACKT = re.compile(r'<p>\s*📦\s*<strong>\s*Lieferzeit[^<]*</strong>[^<]*</p>\s*', re.S)
TAGE = re.compile(r'(\d{1,2})\s*[–-]\s*(\d{1,2})\s*Werktage')


def entdoppeln(html):
    """(neuer_text, status) — status: 'entfernt' | 'nur-einer' | 'zeiten-verschieden'."""
    ls = LS.search(html or '')
    n  = NACKT.search(html or '')
    if not ls or not n:
        return html, 'nur-einer'
    a = TAGE.search(ls.group(1)); b = TAGE.search(n.group(0))
    if a and b and a.groups() != b.groups():
        return html, 'zeiten-verschieden'
    return html[:n.start()] + html[n.end():], 'entfernt'


def gql(q, v=None):
    req = urllib.request.Request(
        f'https://{SHOP}/admin/api/2024-10/graphql.json',
        data=json.dumps({'query': q, 'variables': v or {}}).encode(),
        headers={'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'})
    for versuch in range(8):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=45))
        except Exception:
            if versuch == 7: raise
            time.sleep(2 ** versuch); continue
        if d.get('errors'):
            nur_drossel = all('throttl' in str(e.get('message', '')).lower()
                              or (e.get('extensions') or {}).get('code') == 'THROTTLED'
                              for e in d['errors'])
            if nur_drossel and versuch < 7:
                time.sleep(4 * (versuch + 1)); continue
            raise RuntimeError('Shopify-Fehler: ' + str(d['errors'])[:200])
        return d
    raise RuntimeError('erschoepft')


def main():
    fertig = set()
    if os.path.exists(LEDGER):
        fertig = {l.split('\t')[0] for l in open(LEDGER, encoding='utf-8') if l.strip()}
    Q = ('query($c:String){products(first:100,after:$c,sortKey:CREATED_AT,'
         'query:"status:active AND \\"Lieferzeit Schweiz\\""){'
         'pageInfo{hasNextPage endCursor} nodes{id title descriptionHtml}}}')
    M = ('mutation($id:ID!,$b:String!){productUpdate(input:{id:$id,descriptionHtml:$b})'
         '{product{id descriptionHtml} userErrors{field message}}}')
    cur = None
    entfernt = verschieden = gesehen = seite = 0
    while gesehen < CAP and seite < SEITEN:
        pg = (gql(Q, {'c': cur}).get('data') or {}).get('products')
        if not pg:
            print('PAUSE (Shopify stumm) — kein Ergebnis ist kein Befund.'); break
        for p in pg['nodes']:
            if p['id'] in fertig:
                continue
            neu, status = entdoppeln(p['descriptionHtml'] or '')
            if status == 'nur-einer':
                continue
            gesehen += 1
            if status == 'zeiten-verschieden':
                verschieden += 1
                print(f"  ?  {p['title'][:50]} — zwei VERSCHIEDENE Zeiten, Mensch entscheidet")
                continue
            print(f"  ~  {p['title'][:52]}")
            if DRY:
                continue
            a = gql(M, {'id': p['id'], 'b': neu})['data']['productUpdate']
            if a['userErrors']:
                print('     ⛔', a['userErrors']); continue
            if a['product']['descriptionHtml'] != neu:
                print('     ⛔ Rueckfeld weicht ab — nicht quittiert'); continue
            open(LEDGER, 'a', encoding='utf-8').write(f"{p['id']}\tentdoppelt\n")
            entfernt += 1
            if gesehen >= CAP: break
        if not pg['pageInfo']['hasNextPage']:
            break
        cur = pg['pageInfo']['endCursor']; seite += 1
        time.sleep(0.2)
    print(f"{'DRY ' if DRY else ''}entdoppelt: {entfernt} · verschiedene Zeiten: {verschieden}")
    if entfernt == 0 and verschieden == 0 and not DRY:
        print('FERTIG')


if __name__ == '__main__':
    main()
