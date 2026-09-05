import json,subprocess,time,os,re
KEY=open("/tmp/bigbuy_key.txt").read().strip()
STOK=open("/tmp/cj_shop_token.txt").read().strip()
def bb(path,body=None):
    """Rate-Limit ist ueber alle BigBuy-Skripte geteilt (CLAUDE.md §14) -> Retry mit Backoff,
    sonst wird 'You exceeded the rate limit' faelschlich als fehlender Einkaufspreis gewertet."""
    a=["curl","-s","--max-time","35","-H","Authorization: Bearer "+KEY]
    if body is not None: a+=["-X","POST","-H","Content-Type: application/json","-d",json.dumps(body)]
    a.append("https://api.bigbuy.eu"+path)
    for att in range(6):
        out=subprocess.run(a,capture_output=True,text=True).stdout
        if "rate limit" in out.lower():
            time.sleep(8*(att+1)); continue
        try: return json.loads(out)
        except Exception: time.sleep(3)
    return None
def gql(q,v=None):
    p=json.dumps({"query":q,"variables":v or {}})
    for _ in range(3):
        r=subprocess.run(["curl","-s","--max-time","40","https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json","-H","X-Shopify-Access-Token: "+STOK,"-H","Content-Type: application/json","-d",p],capture_output=True,text=True)
        try: return json.loads(r.stdout)
        except Exception: time.sleep(2)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")
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
    info = bb(f"/rest/catalog/product/{s}.json") if re.fullmatch(r'\d+',s) else None
    ref = s if info is None else (info or {}).get("sku")
    if not ref: f.write(f"{gid}\tkein-ref\n"); f.flush(); continue
    sh=bb("/rest/shipping/orders.json",{"order":{"delivery":{"isoCountry":"CH","postcode":"8000","town":"Zurich"},"products":[{"reference":ref,"quantity":1}]}})
    opts=(sh.get("shippingOptions") if isinstance(sh,dict) else sh) or []
    if not opts: f.write(f"{gid}\tkein-ch-versand\n"); f.flush(); time.sleep(0.8); continue
    ship=min(o.get("cost",999) for o in opts)
    # ---- ECHTE Rentabilität (User 2026-08-09 «bigbuy aufpassen nur rentable produkte») ----
    # Bisher wurde NUR die Fracht geprüft. Der Einkaufspreis (wholesalePrice) fehlte komplett →
    # Artikel konnten im Einkauf teurer als der eigene VK sein. Jetzt: Vollkosten-Rechnung.
    ek = (info or {}).get("wholesalePrice")
    if ek is None:
        # Referenz (BB-S…/BB-V…) → interne BigBuy-ID → Produktdaten mit wholesalePrice
        pi = bb(f"/rest/catalog/productinformationbysku/{ref}.json")
        pid = (pi[0].get("id") if isinstance(pi,list) and pi else None)
        if pid: ek = (bb(f"/rest/catalog/product/{pid}.json") or {}).get("wholesalePrice")
    if ek is None:
        # ohne EK ist Rentabilität nicht beweisbar → nicht aktivieren (Regel: nie blind)
        f.write(f"{gid}\tkein-ek-unpruefbar\n"); f.flush(); time.sleep(0.8); continue
    kosten = (float(ek)+float(ship))*CHF          # EK + Fracht in CHF
    marge  = vk - kosten
    if marge < 12 or vk < kosten*1.35:
        f.write(f"{gid}\tmarge-zu-tief\tEK{ek}\tFracht{ship}\tVK{vk}\tMarge{round(marge,2)}\n"); f.flush(); time.sleep(0.8); continue
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
    akt+=1; f.write(f"{gid}\tAKTIVIERT\tEK{ek}\tFracht{ship}\tVK{vk}\tMarge{round(marge,2)}\n"); f.flush()
    print(f'✅ VK {vk} − EK {ek} − Fracht {ship} → Marge CHF {round(marge,2)} · {title[:45]}',flush=True)
    time.sleep(0.9)
print(f"FERTIG: {n} geprüft, {akt} aktiviert")
