#!/usr/bin/env python3
"""Nimmt Plüsch-HEIMTEXTIL aus der Spielzeug-Kategorie (09.09.2026, MELDET+FIX).

Gemessen: 59 aktive Sofakissen, Kissenbezüge, Hussen, Teppiche und Decken tragen den
Tag `spielzeug` und die Warengruppe «Spielzeug & Spiele» — sie standen dadurch in der
Startseiten-Kachel «Spielzeug & Plüsch», bei CREATED_DESC als frische Ware ganz vorne.
Ursache ist cj_category_fill.mjs:853 (jedes «plüsch» = Spielzeug); die Quelle ist am
selben Tag repariert und liest DIESELBE Regeldatei: automation/pluesch_textil.json.

- Spielzeug gewinnt: «Plüschtier-Kissen» bleibt Spielzeug, «Plüsch-Sofakissen» nicht.
- tagsRemove/tagsAdd, NIE productUpdate(tags:) — das ersetzt die ganze Liste (20.08.).
- DRY=1 (Vorgabe) liest nur; WRITE=1 schreibt und quittiert je Produkt.
Ledger: dropship/_pluesch_textil.txt
"""
import json, os, re, sys, time, urllib.request

SHOP="au3j0y-hq.myshopify.com"
WRITE=os.environ.get("WRITE")=="1"
LEDGER="dropship/_pluesch_textil.txt"
R=json.load(open(os.path.join(os.path.dirname(__file__),"pluesch_textil.json")))
SP=re.compile(R["spielzeug"],re.I); TX=re.compile(R["textil"],re.I)
WEG=["spielzeug","kinder","spielzeug-ch-front","kinderspielzeug"]

def token(): return open("/tmp/cj_shop_token.txt").read().strip()
def gql(q,v=None,versuche=8):
    body=json.dumps({"query":q,"variables":v or {}}).encode()
    for i in range(versuche):
        try:
            req=urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json",data=body,
                headers={"X-Shopify-Access-Token":token(),"Content-Type":"application/json"})
            d=json.load(urllib.request.urlopen(req,timeout=40))
        except Exception: time.sleep(2*(i+1)); continue
        if d.get("errors"):
            if "hrottled" in json.dumps(d["errors"]): time.sleep(3*(i+1)); continue
            print("GraphQL:",json.dumps(d["errors"])[:300]); sys.exit(1)
        if d.get("data") is None: time.sleep(2*(i+1)); continue
        return d["data"]
    print("PAUSE (Shopify blieb stumm)"); sys.exit(2)

def istTextil(t): return (not SP.search(t)) and bool(TX.search(t))

# Kandidaten LIVE: aktive Ware mit Spielzeug-Tag und «plüsch» im Titel
kand=[]; cur=None
while True:
    d=gql('query($c:String){products(first:250,after:$c,query:"status:active AND tag:spielzeug AND title:*plüsch*"){pageInfo{hasNextPage endCursor}nodes{id title tags productType}}}',{"c":cur})
    p=d["products"]; kand+=p["nodes"]
    if not p["pageInfo"]["hasNextPage"]: break
    cur=p["pageInfo"]["endCursor"]
textil=[n for n in kand if istTextil(n["title"])]
print(f"geprueft={len(kand)}  Heimtextil={len(textil)}  bleibt Spielzeug={len(kand)-len(textil)}")
if not WRITE:
    for n in textil: print("  →",n["title"][:66])
    print("DRY — nichts geschrieben. WRITE=1 zum Schreiben.")
    sys.exit(0)

ok=0
for n in textil:
    weg=[t for t in WEG if t in n["tags"]]
    if weg:
        r=gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}',{"id":n["id"],"t":weg})
        if r["tagsRemove"]["userErrors"]: print("FEHLER remove",n["title"][:40],r["tagsRemove"]["userErrors"]); continue
    r=gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',{"id":n["id"],"t":R["tags_textil"]})
    if r["tagsAdd"]["userErrors"]: print("FEHLER add",n["title"][:40],r["tagsAdd"]["userErrors"]); continue
    r=gql('mutation($in:ProductInput!){productUpdate(input:$in){product{id productType tags} userErrors{message}}}',
          {"in":{"id":n["id"],"productType":R["typ_textil"]}})
    pr=r["productUpdate"]["product"]
    if r["productUpdate"]["userErrors"] or not pr: print("FEHLER typ",n["title"][:40]); continue
    # Quittung nur gegen die GELESENE Antwort (kein blindes userErrors-leer)
    if pr["productType"]!=R["typ_textil"] or "spielzeug" in pr["tags"]:
        print("⚠ nicht sauber:",n["title"][:50]); continue
    with open(LEDGER,"a") as f: f.write(f"{time.strftime('%Y-%m-%d')}\t{n['id'].split('/')[-1]}\t{n['title']}\n")
    ok+=1; time.sleep(0.3)
print(f"FERTIG. umgetypt={ok} von {len(textil)}")
