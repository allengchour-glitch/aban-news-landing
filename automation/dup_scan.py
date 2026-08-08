import json,subprocess,time,os,re
TOK=open("/tmp/cj_shop_token.txt").read().strip()
def gql(q,v=None):
    p=json.dumps({"query":q,"variables":v or {}})
    for _ in range(4):
        r=subprocess.run(["curl","-s","--max-time","60","https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json","-H","X-Shopify-Access-Token: "+TOK,"-H","Content-Type: application/json","-d",p],capture_output=True,text=True)
        try:
            d=json.loads(r.stdout)
            if "data" in d: return d
        except Exception: pass
        time.sleep(3)
    return {}
Q='''query($c:String){products(first:200,after:$c,query:"status:ACTIVE"){pageInfo{hasNextPage endCursor}
 nodes{id title createdAt mediaCount{count} featuredMedia{... on MediaImage{image{url}}}
 variants(first:1){nodes{sku price}}}}}'''
rows=[];cur=None;n=0
while True:
    d=gql(Q,{"c":cur}); pg=(d.get("data") or {}).get("products")
    if not pg: break
    for p in pg["nodes"]:
        v=p["variants"]["nodes"][0] if p["variants"]["nodes"] else {}
        img=((p.get("featuredMedia") or {}).get("image") or {}).get("url","").split("/")[-1].split("?")[0]
        rows.append([p["id"],p["title"],img,(v.get("sku") or ""),(v.get("price") or ""),p["mediaCount"]["count"],p["createdAt"]])
        n+=1
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]
    if n%4000<200: print("gescannt",n,flush=True)
json.dump(rows,open("/tmp/dup_rows.json","w"))
from collections import defaultdict
def norm(t): 
    t=t.lower()
    for a,b in [("ä","ae"),("ö","oe"),("ü","ue"),("ß","ss")]: t=t.replace(a,b)
    return re.sub(r'[^a-z0-9]','',t)
byimg=defaultdict(list); bysku=defaultdict(list); bytp=defaultdict(list)
for r in rows:
    if r[2]: byimg[r[2]].append(r)
    if r[3]: bysku[r[3]].append(r)
    bytp[(norm(r[1]),r[4])].append(r)
di={k:v for k,v in byimg.items() if len(v)>1}
ds={k:v for k,v in bysku.items() if len(v)>1}
dt={k:v for k,v in bytp.items() if len(v)>1}
print(f"FERTIG {n} Produkte | gleiches Hauptbild: {len(di)} Gruppen | gleiche SKU: {len(ds)} | gleicher Titel+Preis: {len(dt)}")
json.dump({"img":{k:[x[0] for x in v] for k,v in di.items()},
           "sku":{k:[x[0] for x in v] for k,v in ds.items()},
           "titel":{f"{k[0]}|{k[1]}":[x[0] for x in v] for k,v in dt.items()}},
          open("/tmp/dup_groups.json","w"))
for k,v in list(di.items())[:8]: print("  BILD:",[x[1][:38] for x in v])
for k,v in list(ds.items())[:8]: print("  SKU:",k[:24],[x[1][:34] for x in v])
