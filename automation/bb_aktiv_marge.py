"""Rentabilitäts-Audit der bereits AKTIVEN BigBuy-Produkte (User 2026-08-09
«bigbuy aufpassen nur rentable produkte»).

Vollkosten = wholesalePrice + CH-Fracht (BigBuy verlangt pauschal ~27.94 EUR SEUR).
Ein Verkauf unter Vollkosten ist ein garantierter Verlust — schlimmer als kein Verkauf.
Verlustbringer werden auf DRAFT gesetzt (nie gelöscht) und getaggt, damit sie nach einer
Preisanpassung wiederbelebt werden können.

DRY=1 → nur Bericht, keine Änderung.
"""
import json,subprocess,time,os,re,sys
KEY=open("/tmp/bigbuy_key.txt").read().strip()
STOK=open("/tmp/cj_shop_token.txt").read().strip()
DRY=os.environ.get("DRY")=="1"
CHF=0.93
def bb(path,body=None):
    """BigBuys Rate-Limit ist ueber ALLE laufenden Skripte geteilt (CLAUDE.md §14).
    Ohne diesen Retry kam 'You exceeded the rate limit' als JSON-Fehler zurueck und wurde
    faelschlich als 'kein Einkaufspreis' gewertet -> Produkte galten als unpruefbar."""
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
    for _ in range(4):
        r=subprocess.run(["curl","-s","--max-time","50","https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json","-H","X-Shopify-Access-Token: "+STOK,"-H","Content-Type: application/json","-d",p],capture_output=True,text=True)
        try:
            d=json.loads(r.stdout)
            if "data" in d: return d
        except Exception: pass
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")

POOL="/tmp/bb_aktiv_pool.json"
if not os.path.exists(POOL):
    pool=[];cur=None
    while True:
        d=gql('query($c:String){products(first:250,after:$c,query:"status:ACTIVE AND sku:BB-*"){pageInfo{hasNextPage endCursor} nodes{id title variants(first:1){nodes{sku price}}}}}',{"c":cur})
        pg=(d.get("data") or {}).get("products")
        if not pg: break
        for p in pg["nodes"]:
            v=p["variants"]["nodes"][0] if p["variants"]["nodes"] else {}
            sku=(v.get("sku") or "")
            if not sku.upper().startswith("BB-"): continue
            try: pr=float(v.get("price") or 0)
            except Exception: pr=0
            pool.append([p["id"],p["title"],pr,sku])
        if not pg["pageInfo"]["hasNextPage"]: break
        cur=pg["pageInfo"]["endCursor"]
        print("Pool wächst:",len(pool),flush=True)
    json.dump(pool,open(POOL,"w"),ensure_ascii=False)
pool=json.load(open(POOL))
DONE="/tmp/bb_aktiv_done.txt"
done=set()
if os.path.exists(DONE): done={l.split("\t")[0] for l in open(DONE)}
f=open(DONE,"a")
print(f"AKTIVE BigBuy-Produkte: {len(pool)} | geprüft {len(done)} | DRY={DRY}",flush=True)

def ek_of(sku):
    s=sku.upper().replace("BB-","")
    if re.fullmatch(r'\d+',s):
        d=bb(f"/rest/catalog/product/{s}.json") or {}
        return d.get("wholesalePrice"), d.get("sku")
    pi=bb(f"/rest/catalog/productinformationbysku/{s}.json")
    pid=(pi[0].get("id") if isinstance(pi,list) and pi else None)
    if not pid: return None,s
    return (bb(f"/rest/catalog/product/{pid}.json") or {}).get("wholesalePrice"), s

verlust=0; ok=0; n=0
for gid,title,vk,sku in pool:
    if gid in done: continue
    n+=1
    ek,ref=ek_of(sku)
    if ek is None:
        f.write(f"{gid}\tkein-ek\n"); f.flush(); time.sleep(0.5); continue
    sh=bb("/rest/shipping/orders.json",{"order":{"delivery":{"isoCountry":"CH","postcode":"8000","town":"Zurich"},"products":[{"reference":ref,"quantity":1}]}})
    opts=(sh.get("shippingOptions") if isinstance(sh,dict) else sh) or []
    ship=min((o.get("cost",999) for o in opts), default=None)
    if ship is None:
        f.write(f"{gid}\tkein-ch-versand\n"); f.flush(); time.sleep(0.6); continue
    kosten=(float(ek)+float(ship))*CHF
    marge=vk-kosten
    if marge < 5:
        verlust+=1
        print(f"❌ Marge {round(marge,2):>7} | VK {vk} − EK {ek} − Fracht {ship} · {title[:45]}",flush=True)
        if not DRY:
            gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',{"i":{"id":gid,"status":"DRAFT"}})
            gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',{"id":gid,"t":["bb-unrentabel-draft"]})
        f.write(f"{gid}\tVERLUST\tEK{ek}\tFracht{ship}\tVK{vk}\tMarge{round(marge,2)}\n")
    else:
        ok+=1
        f.write(f"{gid}\tOK\tMarge{round(marge,2)}\n")
    f.flush(); time.sleep(0.7)
    if n%100==0: print(f"… {n} geprüft | rentabel {ok} | Verlust {verlust}",flush=True)
print(f"FERTIG: {n} geprüft, {ok} rentabel, {verlust} Verlustbringer{' (DRY)' if DRY else ' gedraftet'}")
