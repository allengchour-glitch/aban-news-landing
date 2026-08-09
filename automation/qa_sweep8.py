import json,subprocess,time,re,os,collections
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

Q='''query($c:String){ products(first:100,after:$c,query:"status:ACTIVE"){ pageInfo{hasNextPage endCursor}
 nodes{ id title handle descriptionHtml
   seo{title description}
   priceRangeV2{minVariantPrice{amount}}
   media(first:1){nodes{ ... on MediaImage{ image{url width height} } }}
 }}}'''

BAD_TITLE=[
 (re.compile(r'\s{2,}'),"doppel-leerzeichen"),
 (re.compile(r'^[^A-Za-zÄÖÜäöü0-9]'),"start-sonderzeichen"),
 (re.compile(r'[,;:\-–]\s*$'),"end-satzzeichen"),
 (re.compile(r'\b(undefined|null|NaN|None)\b',re.I),"platzhalter"),
 (re.compile(r'&(amp|lt|gt|quot|#\d+);'),"html-entity"),
 (re.compile(r'\bnew\b.*\b(2019|2020|2021|2022)\b',re.I),"altjahr"),
 (re.compile(r'[一-鿿]'),"chinesisch"),
 (re.compile(r'^.{0,12}$'),"titel-zu-kurz"),
 (re.compile(r'^.{110,}$'),"titel-zu-lang"),
]
BAD_DESC=[
 (re.compile(r'\b(undefined|null|NaN)\b'),"platzhalter"),
 (re.compile(r'<li>\s*</li>|<p>\s*</p>'),"leere-tags"),
 (re.compile(r'[一-鿿]'),"chinesisch"),
 (re.compile(r'&lt;|&gt;'),"escaped-html"),
 (re.compile(r'\bAliExpress|\bAlibaba|\bCJdropshipping|\bBigBuy|\bTemu\b',re.I),"lieferanten-leak"),
 (re.compile(r'https?://(?!luxestyle)',re.I),"fremd-link"),
]

cur=None; n=0
found=collections.defaultdict(list)
st="/tmp/qa8_cursor.txt"
if os.path.exists(st):
    cur=open(st).read().strip() or None
while True:
    d=gql(Q,{"c":cur})
    pg=(d.get("data") or {}).get("products")
    if not pg: print("keine daten",flush=True); break
    for p in pg["nodes"]:
        n+=1
        t=p["title"] or ""
        for rx,tag in BAD_TITLE:
            if rx.search(t): found["T:"+tag].append((p["id"],t[:70]))
        h=p["descriptionHtml"] or ""
        if len(h.strip())<40: found["D:leer"].append((p["id"],t[:70]))
        for rx,tag in BAD_DESC:
            if rx.search(h): found["D:"+tag].append((p["id"],t[:70]))
        s=p.get("seo") or {}
        if not (s.get("title") or "").strip(): found["S:kein-seo-titel"].append((p["id"],t[:70]))
        if not (s.get("description") or "").strip(): found["S:keine-seo-desc"].append((p["id"],t[:70]))
        try: pr=float(p["priceRangeV2"]["minVariantPrice"]["amount"])
        except Exception: pr=0
        if pr<=0: found["P:preis-null"].append((p["id"],t[:70]))
        elif pr<5: found["P:preis-unter-5"].append((p["id"],f"{pr} {t[:60]}"))
        elif pr>900: found["P:preis-ueber-900"].append((p["id"],f"{pr} {t[:60]}"))
        m=p["media"]["nodes"]
        if not m: found["I:kein-bild"].append((p["id"],t[:70]))
        else:
            im=(m[0] or {}).get("image") or {}
            w,hh=im.get("width") or 0, im.get("height") or 0
            if w and w<500: found["I:bild-klein"].append((p["id"],f"{w}x{hh} {t[:55]}"))
    if n % 2000 < 100: print("gescannt",n,{k:len(v) for k,v in sorted(found.items())},flush=True)
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]; open(st,"w").write(cur)
print("=== FERTIG",n,flush=True)
for k,v in sorted(found.items(), key=lambda x:-len(x[1])):
    print(f"{k}: {len(v)}")
json.dump({k:v for k,v in found.items()},open("/tmp/qa8_found.json","w"))
