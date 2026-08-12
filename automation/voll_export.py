"""Ein einziger vollständiger Katalog-Export als gemeinsame Arbeitsgrundlage."""
import json,subprocess,time
TOK=open("/tmp/cj_shop_token.txt").read().strip()
def gql(q,v=None):
    for i in range(10):
        r=subprocess.run(["curl","-s","--max-time","90","https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
         "-H","X-Shopify-Access-Token: "+TOK,"-H","Content-Type: application/json","-d",json.dumps({"query":q,"variables":v or {}})],capture_output=True,text=True)
        try:
            d=json.loads(r.stdout)
            if d.get("data") and d["data"].get("products") is not None: return d
        except Exception: pass
        time.sleep(10+5*i)
    return {}
Q='''query($c:String){products(first:100,after:$c){pageInfo{hasNextPage endCursor} nodes{
 id handle title status productType vendor tags createdAt
 descriptionHtml
 priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}}
 mediaCount{count}
 featuredMedia{... on MediaImage{image{url}} mediaContentType}
 seo{title description}
 options{name values}
 variants(first:3){nodes{sku price compareAtPrice inventoryQuantity inventoryPolicy inventoryItem{tracked}}}
 g:publishedOnPublication(publicationId:"gid://shopify/Publication/302872297857")
 os:publishedOnPublication(publicationId:"gid://shopify/Publication/301970915713")
 mf:metafields(namespace:"mm-google-shopping",first:10){nodes{key value}}}}}'''
cur=None; n=0
with open("/tmp/export.jsonl","w") as f:
    while True:
        d=gql(Q,{"c":cur}); pg=(d.get("data") or {}).get("products")
        if not pg: print("ABBRUCH bei",n,flush=True); break
        for p in pg["nodes"]:
            f.write(json.dumps(p,ensure_ascii=False)+"\n"); n+=1
        if not pg["pageInfo"]["hasNextPage"]: break
        cur=pg["pageInfo"]["endCursor"]
        if n%3000<100: print("…",n,flush=True)
        time.sleep(0.6)
print("EXPORT FERTIG:",n)
