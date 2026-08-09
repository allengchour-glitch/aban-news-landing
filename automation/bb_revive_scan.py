import json,subprocess,time,os,re
KEY=open("/tmp/bigbuy_key.txt").read().strip()
STOK=open("/tmp/cj_shop_token.txt").read().strip()
def bb(path,body=None):
    a=["curl","-s","--max-time","35","-H","Authorization: Bearer "+KEY]
    if body is not None: a+=["-X","POST","-H","Content-Type: application/json","-d",json.dumps(body)]
    a.append("https://api.bigbuy.eu"+path)
    r=subprocess.run(a,capture_output=True,text=True)
    try: return json.loads(r.stdout)
    except Exception: return {"_raw":r.stdout[:150]}
def gql(q,v=None):
    p=json.dumps({"query":q,"variables":v or {}})
    for _ in range(3):
        r=subprocess.run(["curl","-s","--max-time","40","https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json","-H","X-Shopify-Access-Token: "+STOK,"-H","Content-Type: application/json","-d",p],capture_output=True,text=True)
        try: return json.loads(r.stdout)
        except Exception: time.sleep(2)
    return {}
ADDR={"firstName":"Test","lastName":"Test","country":"CH","postcode":"8000","town":"Zurich","address":"Teststrasse 1","phone":"0790000000","email":"info@luxestyle.ch"}
# Kandidaten laden (einmalig)
if not os.path.exists("/tmp/bb_revive_pool.json"):
    pool=[];cur=None
    while True:
        d=gql('query($c:String){products(first:250,after:$c,query:"status:DRAFT tag:lager-unbekannt-draft"){pageInfo{hasNextPage endCursor} nodes{id title tags variants(first:1){nodes{sku price}}}}}',{"c":cur})
        pg=(d.get("data") or {}).get("products")
        if not pg: break
        for p in pg["nodes"]:
            v=p["variants"]["nodes"][0] if p["variants"]["nodes"] else {}
            if any(t in p["tags"] for t in ("nicht-lieferbar-ch","ausverkauft-lieferant","duplikat-auto-draft")): continue
            try: pr=float(v.get("price") or 0)
            except Exception: pr=0
            if pr<25: continue                      # unter 25 CHF trägt die Fracht nie
            pool.append([p["id"],p["title"],pr,(v.get("sku") or "")])
        if not pg["pageInfo"]["hasNextPage"]: break
        cur=pg["pageInfo"]["endCursor"]
    json.dump(pool,open("/tmp/bb_revive_pool.json","w"),ensure_ascii=False)
pool=json.load(open("/tmp/bb_revive_pool.json"))
done=set()
if os.path.exists("/tmp/bb_revive_done.txt"): done={l.split("\t")[0] for l in open("/tmp/bb_revive_done.txt")}
f=open("/tmp/bb_revive_done.txt","a")
print(f"Pool {len(pool)} | bereits geprüft {len(done)}",flush=True)
akt=n=0
CHF=0.93
for gid,title,vk,sku in pool:
    if gid in done: continue
    n+=1
    s=sku.upper().replace("BB-","")
    ref = s if not re.fullmatch(r'\d+',s) else (bb(f"/rest/catalog/product/{s}.json") or {}).get("sku")
    if not ref: f.write(f"{gid}\tkein-ref\n"); f.flush(); continue
    sh=bb("/rest/shipping/orders.json",{"order":{"delivery":{"isoCountry":"CH","postcode":"8000","town":"Zurich"},"products":[{"reference":ref,"quantity":1}]}})
    opts=(sh.get("shippingOptions") if isinstance(sh,dict) else sh) or []
    if not opts: f.write(f"{gid}\tkein-ch-versand\n"); f.flush(); time.sleep(0.8); continue
    ship=min(o.get("cost",999) for o in opts)
    if ship*CHF > vk*0.35: f.write(f"{gid}\tmarge-zu-tief\t{ship}\n"); f.flush(); time.sleep(0.8); continue
    time.sleep(0.8)
    chk=bb("/rest/order/check.json",{"order":{"internalReference":"stock","language":"de","paymentMethod":"moneybox","carriers":[{"name":"seur"}],"shippingAddress":ADDR,"products":[{"reference":ref,"quantity":1}]}})
    t=json.dumps(chk)
    if "ER003" in t or '"totalOrder":0' in t or "ER007" in t:
        f.write(f"{gid}\tausverkauft\n"); f.flush(); time.sleep(0.8); continue
    gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',{"i":{"id":gid,"status":"ACTIVE"}})
    gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}',{"id":gid,"t":["lager-unbekannt-draft"]})
    gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',{"id":gid,"t":["ch-geprueft"]})
    for pub in ["301970915713","301971014017","302032716161","302566834561","302994456961"]:
        gql('mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}',{"id":gid,"p":[{"publicationId":"gid://shopify/Publication/"+pub}]})
        time.sleep(0.08)
    akt+=1; f.write(f"{gid}\tAKTIVIERT\t{ship}\n"); f.flush()
    print(f'✅ CHF {vk:>7} (Fracht {ship}) {title[:50]}',flush=True)
    time.sleep(0.9)
print(f"FERTIG: {n} geprüft, {akt} aktiviert")
