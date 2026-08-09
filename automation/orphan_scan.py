"""Findet ACTIVE-Produkte, die in KEINER Kollektion liegen (nur ueber Suche erreichbar =
toter Winkel im Shop) und meldet die haeufigsten productType/Tag-Muster, damit man gezielt
Smart-Collection-Regeln nachziehen kann."""
import json,subprocess,time,os,collections
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

Q='''query($c:String){ products(first:100,after:$c,query:"status:ACTIVE"){ pageInfo{hasNextPage endCursor}
 nodes{ id title productType tags collections(first:1){nodes{id}} }}}'''
st="/tmp/orphan_cursor.txt"; out="/tmp/orphans.jsonl"
cur=open(st).read().strip() or None if os.path.exists(st) else None
n=0; orph=0
f=open(out,"a")
while True:
    d=gql(Q,{"c":cur})
    pg=(d.get("data") or {}).get("products")
    if not pg: print("keine daten",flush=True); break
    for p in pg["nodes"]:
        n+=1
        if not p["collections"]["nodes"]:
            orph+=1
            f.write(json.dumps({"id":p["id"],"t":p["title"],"pt":p.get("productType") or "","tags":p["tags"]})+"\n")
    f.flush()
    if n % 3000 < 100: print("gescannt",n,"| Waisen",orph,flush=True)
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]; open(st,"w").write(cur)
print(f"FERTIG: {n} gescannt, {orph} ohne Kollektion")
