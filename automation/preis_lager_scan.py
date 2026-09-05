"""Preis-/Lager-Fehler:
 A) compareAtPrice <= price  -> Rabatt-Badge zeigt 0% oder negativ (unseriös) -> compareAt loeschen
 B) compareAtPrice > 3x price -> unglaubwuerdiger Fake-Rabatt -> auf 1.6x price kappen
 C) tracked + qty<=0 + policy CONTINUE -> Geister-Verkauf -> policy DENY
Alles direkt korrigiert. Resumable ueber /tmp/preislager_cursor.txt.
"""
import json,subprocess,time,os
TOK=open("/tmp/cj_shop_token.txt").read().strip()
def gql(q,v=None):
    p=json.dumps({"query":q,"variables":v or {}})
    for _ in range(5):
        r=subprocess.run(["curl","-s","--max-time","60","https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json","-H","X-Shopify-Access-Token: "+TOK,"-H","Content-Type: application/json","-d",p],capture_output=True,text=True)
        try:
            d=json.loads(r.stdout)
            if "data" in d: return d
        except Exception: pass
        time.sleep(4)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")

Q='''query($c:String){ products(first:40,after:$c,query:"status:ACTIVE"){ pageInfo{hasNextPage endCursor}
 nodes{ id title variants(first:30){nodes{ id price compareAtPrice inventoryQuantity inventoryPolicy
   inventoryItem{tracked} }}}}}'''
MUT='''mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){
  productVariantsBulkUpdate(productId:$pid, variants:$v){ userErrors{message} }}'''

st="/tmp/preislager_cursor.txt"
cur=open(st).read().strip() or None if os.path.exists(st) else None
n=0; fa=fb=fc=0; prods=0
while True:
    d=gql(Q,{"c":cur})
    pg=(d.get("data") or {}).get("products")
    if not pg: print("keine daten",flush=True); break
    for p in pg["nodes"]:
        n+=1
        upd=[]
        for v in p["variants"]["nodes"]:
            try: pr=float(v["price"])
            except Exception: continue
            ca=v.get("compareAtPrice")
            ca=float(ca) if ca not in (None,"") else None
            ch={}
            if ca is not None:
                if ca<=pr: ch["compareAtPrice"]=None; fa+=1
                elif ca>pr*3: ch["compareAtPrice"]=f"{round(pr*1.6,2)}"; fb+=1
            tracked=((v.get("inventoryItem") or {}).get("tracked"))
            q=v.get("inventoryQuantity")
            if tracked and (q is None or q<=0) and v.get("inventoryPolicy")=="CONTINUE":
                ch["inventoryPolicy"]="DENY"; fc+=1
            if ch:
                ch["id"]=v["id"]; upd.append(ch)
        if upd:
            prods+=1
            r=gql(MUT,{"pid":p["id"],"v":upd})
            e=((r.get("data") or {}).get("productVariantsBulkUpdate") or {}).get("userErrors") or []
            if e: print("ERR",p["title"][:40],e[:1],flush=True)
            time.sleep(0.25)
    if n % 800 < 40: print(f"gescannt {n} | Produkte korrigiert {prods} | A(compareAt<=preis) {fa} B(fake-rabatt) {fb} C(geister) {fc}",flush=True)
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]; open(st,"w").write(cur)
print(f"FERTIG: {n} gescannt, {prods} Produkte korrigiert | A {fa} B {fb} C {fc}")
