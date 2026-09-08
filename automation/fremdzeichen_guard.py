#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fremdzeichen_guard.py — findet fernöstliche Schriftzeichen in Kundentexten.

WARUM: Die Produkttexte entstehen aus übersetzten Lieferantenbeschreibungen. Bleibt ein
Wort unübersetzt, steht es als chinesisches Zeichen mitten im deutschen Satz — gefunden am
20.08.2026: «mit einem bürstenlosen Motor und optischer Fluss定位 ausgestattet». Für die
Kundin sieht das aus wie ein kaputter Shop.

ZWEI KLASSEN, ZWEI ANTWORTEN:
1. **Fullwidth-Zeichen** (％＋－：，) sind reine Schreibvarianten unserer eigenen Zeichen.
   Sie werden ersetzt — «32Ω±15％» → «32Ω±15 %». Das ist verlustfrei und braucht niemanden.
2. **CJK-Ideogramme** (定位, 发热 …) tragen BEDEUTUNG. Sie werden nur GEMELDET, nie geraten:
   一 kann «eins» heissen oder Teil eines Fachworts sein, und eine falsche Übersetzung im
   Produkttext ist schlimmer als ein sichtbarer Rest (die Lehre der Heilversprechen-Fixes:
   erst verstehen, dann schreiben).

WARUM ALS WÄCHTER UND NICHT ALS EINMAL-LAUF: Der CJ-Grind legt täglich Produkte an; ein
heute sauberer Katalog ist morgen wieder betroffen. Genau die Lehre vom 12.08.
(«Ein Nachfüll-Skript ist die Reparatur, nie die Lösung»).

Nutzung:  DRY=1 python3 automation/fremdzeichen_guard.py
          python3 automation/fremdzeichen_guard.py
"""
import json, os, re, time, urllib.request

SHOP  = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOKEN = os.environ.get('SHOPIFY_ADMIN_TOKEN') or open('/tmp/cj_shop_token.txt').read().strip()
DRY   = os.environ.get('DRY') == '1'
QUELLE = os.environ.get('QUELLE', '/tmp/versand_quelle.jsonl')
LEDGER = 'dropship/_fremdzeichen.txt'
BERICHT = 'dropship/FREMDZEICHEN-ZU-PRUEFEN.md'

# Fullwidth-Formen unserer eigenen Zeichen — verlustfrei ersetzbar.
FULLWIDTH = {'％': ' %', '＋': '+', '－': '-', '＝': '=', '：': ':', '；': ';',
             '，': ',', '。': '.', '、': ',', '（': '(', '）': ')', '！': '!',
             '？': '?', '　': ' ', '～': '~', '＃': '#', '＊': '*', '／': '/'}
# Zeichen MIT Bedeutung — werden nie automatisch übersetzt.
BEDEUTUNG = re.compile(r'[぀-ヿ一-鿿]')

def gql(q, v=None):
    req = urllib.request.Request(
        f'https://{SHOP}/admin/api/2024-10/graphql.json',
        data=json.dumps({'query': q, 'variables': v or {}}).encode(),
        headers={'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'})
    for i in range(4):
        try: return json.load(urllib.request.urlopen(req, timeout=45))
        except Exception:
            if i == 3: raise
            time.sleep(2 ** i)

def main():
    if not os.path.exists(QUELLE):
        print(f"PAUSE (Quelle {QUELLE} fehlt — frischer Export noetig)"); return
    fertig = set()
    if os.path.exists(LEDGER):
        fertig = {l.split('\t')[0] for l in open(LEDGER, encoding='utf-8') if l.strip()}

    ersetzt = gemeldet = 0
    melden = []
    for line in open(QUELLE, encoding='utf-8'):
        try: o = json.loads(line)
        except Exception: continue
        pid = o.get('id', '')
        if not pid.startswith('gid://shopify/Product/') or pid in fertig: continue
        roh = o.get('descriptionHtml') or ''
        text = re.sub(r'<[^>]+>', ' ', roh)
        hat_fw   = any(z in text for z in FULLWIDTH)
        hat_bed  = bool(BEDEUTUNG.search(text))
        if not (hat_fw or hat_bed): continue

        if hat_bed:
            # ⚠️ AUCH DER BERICHT MUSS GEGEN LIVE PRUEFEN (21.08.2026). Der Ersetzungs-Zweig
            # unten holt laengst live, der Melde-Zweig tat es nicht — er schrieb weiter aus
            # dem Schnappschuss. Folge: Ein von Hand uebersetztes Produkt stand nach der
            # Reparatur unveraendert im Bericht und waere dem Betreiber ein zweites Mal
            # vorgelegt worden. Ein Rueckstand, der Erledigtes auffuehrt, wird nicht gelesen.
            r = gql('query($id:ID!){product(id:$id){title descriptionHtml}}', {'id': pid})
            p_live = (r.get('data') or {}).get('product')
            # ⚠️ KEIN `continue` in diesem Zweig: ein Produkt kann BEIDE Klassen tragen, und
            # ein Sprung hier uebersaehe die Fullwidth-Ersetzung weiter unten still.
            if p_live:
                text_live = re.sub(r'<[^>]+>', ' ', p_live['descriptionHtml'] or '')
                m = BEDEUTUNG.search(text_live)
                if m:   # sonst inzwischen behoben — kein Befund mehr
                    stelle = re.sub(r'\s+', ' ',
                                    text_live[max(0, m.start()-70):m.end()+70]).strip()
                    melden.append((pid, (p_live.get('title') or '')[:60],
                                   ''.join(sorted(set(BEDEUTUNG.findall(text_live))))[:20],
                                   stelle))
                    gemeldet += 1
                time.sleep(0.5)

        if hat_fw:
            # LIVE holen — der Export ist ein Schnappschuss, und zwischen Sammeln und
            # Schreiben kann ein anderer Reiniger denselben Text angefasst haben.
            r = gql('query($id:ID!){product(id:$id){title descriptionHtml}}', {'id': pid})
            p = (r.get('data') or {}).get('product')
            if not p: continue
            alt = p['descriptionHtml'] or ''
            neu = alt
            for a, b in FULLWIDTH.items(): neu = neu.replace(a, b)
            neu = re.sub(r' {2,}', ' ', neu)
            if neu == alt: continue
            if DRY:
                print(f"  ~ {p['title'][:44]}")
            else:
                rr = gql('''mutation($in:ProductInput!){productUpdate(input:$in){
                            product{id} userErrors{message}}}''',
                         {'in': {'id': pid, 'descriptionHtml': neu}})
                errs = (rr.get('data') or {}).get('productUpdate', {}).get('userErrors') or []
                if errs: print(f"  X {p['title'][:40]}: {errs[0]['message']}"); continue
                open(LEDGER, 'a', encoding='utf-8').write(f"{pid}\tfullwidth-ersetzt\n")
            ersetzt += 1
            time.sleep(1.0)

    # Kein Befund mehr → alten Bericht wegraeumen. Bliebe er stehen, listete er auf ewig
    # Produkte, die laengst uebersetzt sind.
    if not melden and os.path.exists(BERICHT):
        os.remove(BERICHT)
        print(f"  Bericht {BERICHT} entfernt (keine offenen Zeichen mehr)")
    if melden:
        with open(BERICHT, 'w', encoding='utf-8') as f:
            f.write("# Unübersetzte fernöstliche Zeichen in Produkttexten\n\n")
            f.write("Diese Zeichen tragen Bedeutung und werden bewusst NICHT automatisch\n"
                    "ersetzt — eine geratene Übersetzung im Produkttext ist schlimmer als\n"
                    "ein sichtbarer Rest. Bitte von Hand prüfen und übersetzen.\n\n")
            for pid, titel, zeichen, stelle in melden:
                f.write(f"- **{titel}** (`{pid.split('/')[-1]}`) — Zeichen: `{zeichen}`\n")
                f.write(f"  > …{stelle}…\n\n")

    print(f"{'DRY ' if DRY else ''}Fullwidth ersetzt: {ersetzt} · zu uebersetzen gemeldet: {gemeldet}")
    # ⚠️ FERTIG haengt NUR an `ersetzt` (21.08.2026, teuer gelernt). Der erste Entwurf
    # verlangte zusaetzlich `gemeldet == 0` — aber gemeldete CJK-Zeichen werden ABSICHTLICH
    # nie automatisch uebersetzt, die Zahl kann also gar nie auf 0 fallen. Der Aufseher
    # sieht ohne FERTIG-Zeile «noch Arbeit offen» und startete den Lauf im ZWEI-MINUTEN-Takt
    # neu: 131 Vollscans ueber einen 74-MB-Export plus Shopify-Abfragen fuer EINEN einzigen
    # Befund, der auf eine Menschenentscheidung wartet. Gemeldetes ist ein Rueckstand im
    # Bericht, KEINE offene Arbeit — nur was noch zu ERSETZEN waere, ist offene Arbeit.
    if ersetzt == 0:
        if gemeldet:
            print(f"({gemeldet} Zeichen liegen zur Handuebersetzung in {BERICHT})")
        print("FERTIG")

# ⚠️ 08.09.2026: Ohne diese Wache startet ein blosser `import` den Lauf — heute beim
# Messen an versand_jenachland passiert, am 03.09. schon einmal beim Melder.
# Ein Werkzeug, das man zum Messen importiert, darf beim Importieren nichts tun.
if __name__ == "__main__":
    main()
