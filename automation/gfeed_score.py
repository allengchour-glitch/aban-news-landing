import json,subprocess,time,re,os
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
GOOG="gid://shopify/Publication/302872297857"
RAUS=re.compile(r'kost[üu]m|verkleid|fasnacht|halloween|per[üu]cke|maske\b|tutu\b|hexe|vampir|zombie|clown|dessous|reizw|erotik|18\+|generalüberholt|restauriert|refurb|ersatzteil|ersatzkopf',re.I)
CODE=re.compile(r'\b[A-Z]{2,}\d{3,}\b|\b[A-Z0-9]{8,}\b|\bUS Size\b|\bYards\b|Generation \d|About \d+mm|Surface-')
Q='''query($c:String){products(first:100,after:$c){pageInfo{hasNextPage endCursor} nodes{
 id title status productType tags mediaCount{count} options{name values}
 priceRangeV2{minVariantPrice{amount}} variants(first:1){nodes{sku}}
 g:publishedOnPublication(publicationId:"%s") }}}'''%GOOG
rows=[];cur=None;tot=0
while True:
    d=gql(Q,{"c":cur}); pg=(d.get("data") or {}).get("products")
    if not pg: break
    for p in pg["nodes"]:
        tot+=1
        if not p["g"] or p["status"]!="ACTIVE": 
            if p["g"]: rows.append((p["id"],-99,"nicht-aktiv"))
            continue
        t=p["title"]; price=float(p["priceRangeV2"]["minVariantPrice"]["amount"])
        imgs=p["mediaCount"]["count"]
        sku=(p["variants"]["nodes"][0]["sku"] if p["variants"]["nodes"] else "") or ""
        s=0; bad=None
        if RAUS.search(t) or RAUS.search(p["productType"] or ""): bad="kein-werbe-sortiment"
        elif CODE.search(t): bad="code-im-titel"
        elif any(CODE.search(v or "") for o in p["options"] for v in o["values"][:25]): bad="code-in-variante"
        elif imgs<3: bad="unter-3-bildern"
        elif price<15: bad="preis-unter-15"
        elif not lieferantenref(sku): bad="keine-lieferanten-sku"
        if bad: rows.append((p["id"],-1,bad)); continue
        s = min(imgs,10)*2 + (10 if 20<=price<=120 else 4) + (6 if "neuheit" in p["tags"] else 0) + (4 if "ch-lager" in p["tags"] else 0)
        rows.append((p["id"],s,"ok"))
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]
    if tot%5000<100: print("gescannt",tot,"| im Feed",len(rows),flush=True)
json.dump(rows,open("/tmp/gfeed_scores.json","w"))
ok=[r for r in rows if r[1]>0]; ok.sort(key=lambda r:-r[1])
from collections import Counter
# Eine Prüfung, eine Wahrheit: dieselbe Formprüfung wie gfeed_restore (Präfix ist tippbar,
# die Form nicht) — sonst hält der eine Lauf draussen, was der andere hereinlässt.
from gfeed_restore import lieferantenref
print("FERTIG gescannt:",tot,"| im Feed:",len(rows),"| qualifiziert:",len(ok))
print(Counter(r[2] for r in rows).most_common())
