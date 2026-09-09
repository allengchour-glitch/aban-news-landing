#!/usr/bin/env python3
"""Taut veroeffentlichte BEST_SELLING-Kollektionen auf CREATED_DESC auf (31.08.2026).

Messung 29.08.: Bei 7 Bestellungen in der Shop-Geschichte ist BEST_SELLING keine
Rangfolge, sondern eine zufaellig stabile Ordnung — die Seiten zeigten monatelang
dieselben Produkte. Damals wurden 8 Startseiten-Reihen umgestellt; dieser Lauf
vervollstaendigt es fuer ALLE veroeffentlichten Kollektionen (225 gemessen).
- NUR sortOrder wird geaendert; Regeln, Produkte, Bilder bleiben unberuehrt.
- MANUAL (handkuratiert, z. B. `bestseller`) wird NIE angefasst.

NACHTRAG 09.09.2026 — die Annahme von damals ist GEMESSEN und war falsch:
Der Docstring sagte "PRICE_ASC/PRICE_DESC bleiben stehen — bei Preisband-Kollektionen
moeglich Absicht". Gezaehlt ueber alle 364 publizierten Kollektionen: 93 sind
preis-sortiert, und davon traegt **genau EINE** einen Preis im Namen ("Angebote &
Deals", 0 aktive Produkte). Die ECHTEN Preisbaender ("Unter CHF 25", "Geschenke
unter CHF 50", "Premium ab CHF 80" …) stehen ausnahmslos auf CREATED_DESC — dort
waere eine Preissortierung ohnehin sinnlos, das Band filtert den Preis schon.
Die uebrigen 92 sind normale Kategorien (Kinderspielzeug, Damen-Jacken, Hunde-
Zubehoer), deren Seite damit eingefroren ist: sie zeigen seit Monaten dieselbe
Ware, waehrend der Grind taeglich hunderte Produkte anlegt.
=> PREIS=1 taut sie mit auf; Kollektionen mit einem Preisband im Titel/Handle
   bleiben ausgenommen (Wache in beide Richtungen geprueft).
=> DRY=1 zeigt nur, was passieren wuerde.
Ledger: dropship/_kollektion_auftauen.txt
"""
import json, os, re, sys, time, urllib.request

DRY   = os.environ.get("DRY") == "1"
PREIS = os.environ.get("PREIS") == "1"
# Ein Preisband nennt seinen Preis im Namen. Nur DORT ist eine Preissortierung
# eine Aussage ueber die Kollektion und keine eingefrorene Zufallsordnung.
PREISBAND = re.compile(r"(chf|franken|\bunter\b|\bbis\b|\bab\s*\d|preis|budget|g[uü]nstig|sale|angebot|deal)", re.I)

def ist_preisband(handle, titel):
    return bool(PREISBAND.search(titel or "") or PREISBAND.search(handle or ""))

SHOP="au3j0y-hq.myshopify.com"
LEDGER="dropship/_kollektion_auftauen.txt"

def token(): return open("/tmp/cj_shop_token.txt").read().strip()
def gql(q, v=None, versuche=6):
    body=json.dumps({"query":q,"variables":v or {}}).encode()
    for i in range(versuche):
        try:
            req=urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json", data=body,
                headers={"X-Shopify-Access-Token":token(),"Content-Type":"application/json"})
            d=json.load(urllib.request.urlopen(req, timeout=30))
        except Exception: time.sleep(2*(i+1)); continue
        if d.get("errors"):
            if "Throttled" in json.dumps(d["errors"]): time.sleep(3*(i+1)); continue
            print("GraphQL:", json.dumps(d["errors"])[:200]); sys.exit(1)
        return d["data"]
    print("PAUSE (Shopify blieb stumm)"); sys.exit(2)

try: fertig=set(l.split()[1] for l in open(LEDGER) if len(l.split())>1)
except FileNotFoundError: fertig=set()

after=None; geprueft=0; umgestellt=0
while True:
    d=gql('query($a:String){ collections(first:100, after:$a){pageInfo{hasNextPage endCursor} nodes{id handle title sortOrder resourcePublicationsV2(first:20){nodes{publication{name}}}} } }',{"a":after})
    c=d["collections"]
    for n in c["nodes"]:
        geprueft+=1
        # Der Zettel filtert die Live-Messung NICHT: eine Quittung von gestern sagt
        # nichts darueber, ob die Kollektion heute wieder eingefroren ist. Wahrheit
        # ist der gelesene sortOrder; das Ledger ist nur das Protokoll.
        if n["sortOrder"]=="BEST_SELLING":
            pass
        elif PREIS and n["sortOrder"] in ("PRICE_ASC","PRICE_DESC"):
            if ist_preisband(n["handle"], n.get("title")):
                continue
        else:
            continue
        pubs=[p["publication"]["name"] for p in n["resourcePublicationsV2"]["nodes"]]
        if not any(x in ("Online Store","Onlineshop") for x in pubs): continue
        if DRY:
            print(f"  DRY {n['sortOrder']:11s} {n['handle']:34s} {(n.get('title') or '')[:44]}")
            umgestellt+=1; continue
        r=gql('mutation($input:CollectionInput!){collectionUpdate(input:$input){collection{sortOrder} userErrors{field message}}}',
              {"input":{"id":n["id"],"sortOrder":"CREATED_DESC"}})
        ue=r["collectionUpdate"]["userErrors"]
        if ue: print("FEHLER", n["handle"], ue); continue
        with open(LEDGER,"a") as f: f.write(f"{time.strftime('%Y-%m-%d')} {n['handle']}\n")
        umgestellt+=1
        if umgestellt%25==0: print(f"  … {umgestellt}")
        time.sleep(0.3)
    if not c["pageInfo"]["hasNextPage"]: break
    after=c["pageInfo"]["endCursor"]
print(f"FERTIG. geprueft={geprueft} umgestellt={umgestellt}")
