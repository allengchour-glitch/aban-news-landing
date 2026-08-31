#!/usr/bin/env python3
"""Taut veroeffentlichte BEST_SELLING-Kollektionen auf CREATED_DESC auf (31.08.2026).

Messung 29.08.: Bei 7 Bestellungen in der Shop-Geschichte ist BEST_SELLING keine
Rangfolge, sondern eine zufaellig stabile Ordnung — die Seiten zeigten monatelang
dieselben Produkte. Damals wurden 8 Startseiten-Reihen umgestellt; dieser Lauf
vervollstaendigt es fuer ALLE veroeffentlichten Kollektionen (225 gemessen).
- NUR sortOrder wird geaendert; Regeln, Produkte, Bilder bleiben unberuehrt.
- MANUAL (handkuratiert, z. B. `bestseller`) wird NIE angefasst.
- PRICE_ASC/PRICE_DESC bleiben stehen — bei Preisband-Kollektionen moeglich Absicht.
Ledger: dropship/_kollektion_auftauen.txt
"""
import json, sys, time, urllib.request

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
    d=gql('query($a:String){ collections(first:100, after:$a){pageInfo{hasNextPage endCursor} nodes{id handle sortOrder resourcePublicationsV2(first:3){nodes{publication{name}}}} } }',{"a":after})
    c=d["collections"]
    for n in c["nodes"]:
        geprueft+=1
        if n["handle"] in fertig: continue
        if n["sortOrder"]!="BEST_SELLING": continue
        pubs=[p["publication"]["name"] for p in n["resourcePublicationsV2"]["nodes"]]
        if not any(x in ("Online Store","Onlineshop") for x in pubs): continue
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
