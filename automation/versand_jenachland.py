#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
versand_jenachland.py — entfernt den letzten «Lieferzeit (je nach Land)»-Block.

WARUM ES DEN NOCH GIBT: Der grosse Versandaussagen-Lauf vom 14.08.2026 hat 1'037 Produkte
auf eine Wahrheit gebracht. Am 20.08. tragen aber **1'000 weitere** denselben Baustein in
einer Variante, die das damalige Muster nicht traf — gefunden über die Klasse `ls-liefer`
statt über den Fliesstext.

WAS DARAN FALSCH IST — zwei Dinge:
1. Die Zahlen (10–18 / 8–16 Tage) gehören zu keiner der vier gültigen Stufen
   (CH-Lager 1–2 · EU-Lager 2–7 · Druck auf Bestellung 7–14 · Direktversand 10–20).
2. Schlimmer: **ALLE 1'000 versprechen eine Lieferzeit in die USA.** Der Shop hat genau
   EINEN aktiven Markt («Switzerland», Region CH) — niemand ausserhalb der Schweiz kann
   überhaupt auschecken. Die Zusage ist also nicht bloss ungenau, sie ist unerfüllbar.

WARUM PUNKTGENAU UND NICHT PER ABSATZ-TAUSCH: Der Baustein ist ein sauber geschlossenes
`<p class="ls-liefer" data-tier="…">…</p>`. Genau dieses eine Element wird ersetzt — die
Lehre vom 14.08. lautet, dass ein grober Absatz-Tausch Nachbarinformation mitreisst
(damals fast «Gratis-Versand ab CHF 50 · 30 Tage Rückgabe» bei zwei Produkten).

WARUM GEGEN LIVE: Der Export ist ein Schnappschuss, und ein Massen-Schreiber, der seine
Textbasis Stunden vor dem Schreiben einsammelt, überschreibt zwischenzeitliche Reparaturen
(Lehre 15.08.: 149 Produkte bekamen so einen längst entfernten Block zurück). Der Export
liefert hier nur die KANDIDATENLISTE; der Text kommt unmittelbar vor dem Schreiben live.

Nutzung:  DRY=1 python3 automation/versand_jenachland.py     (zeigt nur)
          python3 automation/versand_jenachland.py           (schreibt)
"""
import json, os, re, sys, time, urllib.request

SHOP  = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOKEN = os.environ.get('SHOPIFY_ADMIN_TOKEN') or open('/tmp/cj_shop_token.txt').read().strip()
DRY   = os.environ.get('DRY') == '1'
CAP   = int(os.environ.get('CAP', '1200'))
LEDGER = 'dropship/_versand_jenachland.txt'
QUELLE = os.environ.get('QUELLE', '/tmp/groessen_export.jsonl')

STIL = ('background:#f4f6fb;border:1px solid #dde3ef;border-radius:10px;'
        'padding:10px 14px;font-size:13px;margin:0 0 14px;')

# Die Zuordnung folgt der bereits appliziertem Form (tier=pod / tier=direkt im Bestand),
# damit im Shop EINE Formulierung steht und nicht eine fünfte Variante entsteht.
STUFE = {
    'eu-druck': ('7–14 Werktage',  'Druck auf Bestellung · Versand nur in die Schweiz und nach Liechtenstein'),
    'pod':      ('7–14 Werktage',  'Druck auf Bestellung · Versand nur in die Schweiz und nach Liechtenstein'),
    'china':    ('10–20 Werktage', 'Direktversand ab Herstellerlager · Versand nur in die Schweiz und nach Liechtenstein'),
    'direkt':   ('10–20 Werktage', 'Direktversand ab Herstellerlager · Versand nur in die Schweiz und nach Liechtenstein'),
    # «standard» sind ~67 handkuratierte Altprodukte ohne Herkunftstag. Die Stufe ist nicht
    # belegbar, der alte Text sagte 8–16 Tage — also eine lange Laufzeit. Gewählt wird die
    # LÄNGSTE Zusage: wer früher liefert als versprochen, enttäuscht niemanden.
    'standard': ('10–20 Werktage', 'Versand nur in die Schweiz und nach Liechtenstein'),
}

def gql(q, v=None):
    req = urllib.request.Request(
        f'https://{SHOP}/admin/api/2024-10/graphql.json',
        data=json.dumps({'query': q, 'variables': v or {}}).encode(),
        headers={'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'})
    for versuch in range(4):
        try:
            return json.load(urllib.request.urlopen(req, timeout=45))
        except Exception as e:
            if versuch == 3: raise
            time.sleep(2 ** versuch)

BLOCK = re.compile(r'<p class="ls-liefer"[^>]*data-tier="([^"]*)"[^>]*>.*?</p>', re.S)

def neuer_block(tier):
    zeit, zusatz = STUFE[tier]
    return (f'<p class="ls-liefer" data-tier="{tier}" style="{STIL}">'
            f'📦 <strong>Lieferzeit</strong> Schweiz: <strong>{zeit}</strong> '
            f'<span style="opacity:.7;">· {zusatz}</span></p>')

def kandidaten_live(fertig=frozenset()):
    """Kandidaten LIVE aus dem Katalog — ohne Export, ohne Verfallsdatum.

    ⚠️ 04.09.2026: Das Werkzeug las `/tmp/groessen_export.jsonl`. Die Datei ueberlebt keinen
    Container-Neustart, und der Aufseher rief den Lauf deshalb taeglich ins Leere; das Ledger
    steht seit dem 30.08. bei 1'000. Gemessen am OBJEKT tragen dagegen die ersten 600 aktiven
    Produkte den Block ALLE. Ein Werkzeug, dessen Quelle veraltet, meldet Vollzug ueber eine
    Vergangenheit — deshalb sucht es seine Kandidaten jetzt selbst.
    ⚠️ Neuimporte sind NICHT betroffen (50 neueste: 0) — die Quelle ist seit dem 14.08. dicht,
    es ist reiner Altbestand.
    """
    Q = ('query($c:String){products(first:100,after:$c,query:"status:active"){'
         'pageInfo{hasNextPage endCursor} nodes{id descriptionHtml}}}')
    ids, cur = [], None
    while len(ids) < CAP * 3:
        d = gql(Q, {'c': cur})
        pg = (d.get('data') or {}).get('products')
        if not pg:
            print('PAUSE (Shopify stumm) — kein Ergebnis ist kein Befund.'); break
        for p in pg['nodes']:
            h = p.get('descriptionHtml') or ''
            if p['id'] in fertig:
                continue          # ⚠️ WAEHREND des Scans ueberspringen, nicht danach — sonst
                                  # sammelt der Lauf immer wieder denselben Katalogbeginn ein
                                  # und meldet «0 offen», obwohl der Rest unberuehrt ist.
            if 'ls-liefer' in h and 'je nach Land' in re.sub(r'<[^>]+>', ' ', h):
                ids.append(p['id'])
        if not pg['pageInfo']['hasNextPage']:
            break
        cur = pg['pageInfo']['endCursor']
        time.sleep(0.2)
    return ids


def kandidaten():
    """IDs aus dem Export — nur die Liste, der Text kommt später live."""
    if QUELLE == 'live' or not os.path.exists(QUELLE):
        return kandidaten_live(_FERTIG)
    ids = []
    for line in open(QUELLE, encoding='utf-8'):
        try: o = json.loads(line)
        except Exception: continue
        if not o.get('id', '').startswith('gid://shopify/Product/'): continue
        h = o.get('descriptionHtml') or ''
        if 'ls-liefer' in h and 'je nach Land' in re.sub(r'<[^>]+>', ' ', h):
            ids.append(o['id'])
    return ids

_FERTIG = frozenset()


def main():
    global _FERTIG
    fertig = set()
    # ⚠️ 04.09.2026: DIE ALTEN QUITTUNGEN SIND WERTLOS. 1'000 Produkte stehen seit dem 30.08.
    # als «ersetzt» im Ledger und tragen den Block LIVE weiter (5 von 5 Stichproben) — ein
    # spaeterer Schreiber hat sie zurueckgeholt. Eine falsche Quittung ueberspringt den Fall
    # fuer immer, deshalb hier derselbe Schalter wie bei den anderen Textwerkzeugen.
    if os.path.exists(LEDGER) and not os.environ.get('IGNORIERE_LEDGER'):
        fertig = {l.split('\t')[0] for l in open(LEDGER, encoding='utf-8') if l.strip()}
    _FERTIG = frozenset(fertig)
    offen = [i for i in kandidaten() if i not in fertig]
    print(f"Kandidaten: {len(offen)} offen ({len(fertig)} laut Ledger erledigt)")
    if not offen:
        print("FERTIG"); return

    geaendert = unklar = schon = 0
    for n, pid in enumerate(offen[:CAP], 1):
        r = gql('query($id:ID!){product(id:$id){title descriptionHtml}}', {'id': pid})
        p = (r.get('data') or {}).get('product')
        if not p:
            print(f"  ?  {pid} nicht gefunden"); continue
        alt = p['descriptionHtml'] or ''
        neu, ersetzt, ungeklaert = alt, 0, 0

        def tausche(m):
            nonlocal ersetzt, ungeklaert
            if 'je nach Land' not in m.group(0):
                return m.group(0)                      # schon repariert — nicht anfassen
            tier = m.group(1)
            if tier not in STUFE:
                ungeklaert += 1
                return m.group(0)                      # unbekannte Stufe NIE raten
            ersetzt += 1
            return neuer_block(tier)

        neu = BLOCK.sub(tausche, alt)
        if ungeklaert: unklar += 1
        if not ersetzt:
            schon += 1
            open(LEDGER, 'a', encoding='utf-8').write(f"{pid}\tnichts-zu-tun\n")
            continue
        # SICHERUNG — prüft genau das, worauf es ankommt: Ausserhalb des ls-liefer-Blocks
        # darf sich kein Zeichen ändern. (Eine reine Längenprüfung wäre falsch: der neue
        # Block ist mal kürzer, mal länger als der alte, und hätte legitime Reparaturen
        # blockiert — beim ersten Testlauf traf das gleich das Slim Wallet.)
        if BLOCK.sub('§', alt) != BLOCK.sub('§', neu):
            print(f"  !  {p['title'][:40]} — Text ausserhalb des Blocks betroffen, uebersprungen")
            continue
        if DRY:
            print(f"  ~  {p['title'][:44]}")
            if n <= 2:
                m = BLOCK.search(neu)
                print(f"     neu: {re.sub(r'<[^>]+>', ' ', m.group(0)).strip()}")
        else:
            rr = gql('''mutation($in:ProductInput!){productUpdate(input:$in){
                        product{id} userErrors{field message}}}''',
                     {'in': {'id': pid, 'descriptionHtml': neu}})
            errs = (rr.get('data') or {}).get('productUpdate', {}).get('userErrors') or []
            if errs:
                print(f"  X  {p['title'][:40]}: {errs[0]['message']}"); continue
            open(LEDGER, 'a', encoding='utf-8').write(f"{pid}\tersetzt\n")
        geaendert += 1
        if n % 50 == 0: print(f"  … {n}/{min(len(offen), CAP)}")
        time.sleep(1.0)                                # 1 Anfrage/s, Shopify schonen

    print(f"{'DRY ' if DRY else ''}geaendert: {geaendert} · schon-sauber: {schon} · "
          f"unklare Stufe: {unklar}")
    if geaendert == 0 and schon and not DRY:
        print("FERTIG")

main()
