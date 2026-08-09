"""Handles mit -1/-2/-3-Suffix = Shopify hat bei Anlage eine Kollision aufgeloest
-> starker Hinweis auf stillen Doppelimport. Prueft, ob der Basis-Handle wirklich existiert
und ob beide dasselbe Produkt sind (norm. Titel + Preis)."""
import json,subprocess,time,re,os,collections
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
    return {}
Q='''query($c:String){ products(first:200,after:$c,query:"status:ACTIVE"){ pageInfo{hasNextPage endCursor}
 nodes{ id handle title priceRangeV2{minVariantPrice{amount}} }}}'''
st="/tmp/handledup_cursor.txt"; out="/tmp/handles.jsonl"
cur=open(st).read().strip() or None if os.path.exists(st) else None
f=open(out,"a"); n=0
while True:
    d=gql(Q,{"c":cur})
    pg=(d.get("data") or {}).get("products")
    if not pg: print("keine daten",flush=True); break
    for p in pg["nodes"]:
        n+=1
        f.write(json.dumps({"id":p["id"],"h":p["handle"],"t":p["title"],
            "p":p["priceRangeV2"]["minVariantPrice"]["amount"]})+"\n")
    f.flush()
    if n % 4000 < 200: print("gescannt",n,flush=True)
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]; open(st,"w").write(cur)
print("FERTIG gescannt",n)
