import json,os,re,subprocess,time
SHOP="au3j0y-hq.myshopify.com"; TOK=open('/tmp/cj_shop_token.txt').read().strip()
NODE="/opt/node22/bin/node"; LOKAL=["social","."]
LEDGER="dropship/_pod_druckdatei.txt"; KARTE="dropship/_sticker_cdn.json"
DRY=os.environ.get("DRY")=="1"
def gql(q,v=None):
    p=json.dumps({"query":q,"variables":v or {}})
    for i in range(8):
        r=subprocess.run(["curl","-s","--max-time","60",
            f"https://{SHOP}/admin/api/2024-10/graphql.json",
            "-H","X-Shopify-Access-Token: "+TOK,"-H","Content-Type: application/json","-d",p],
            capture_output=True,text=True)
        try:
            d=json.loads(r.stdout)
            if d.get("data"): return d
            if "THROTTL" in json.dumps(d.get("errors") or "").upper(): time.sleep(4+i*3); continue
            if d.get("errors"): print("  GraphQL:",json.dumps(d["errors"])[:150]); return None
        except Exception: pass
        time.sleep(3+i*2)
    return None
karte=json.load(open(KARTE)) if os.path.exists(KARTE) else {}
erledigt=set()
if os.path.exists(LEDGER): erledigt={l.split("\t")[0] for l in open(LEDGER)}
alle=[x for x in json.load(open('/tmp/pod_printfiles.json')) if 'abannews' in x['url']]
offen=[x for x in alle if x['id'] not in erledigt]
print(f"{len(alle)} mit toter Druckdatei · {len(offen)} noch offen",flush=True)
n=0
for x in offen:
    rel="/".join(x['url'].split("?")[0].split("/")[3:])
    datei=next((os.path.join(w,rel) for w in LOKAL if os.path.exists(os.path.join(w,rel))),None)
    if not datei: print("  ⚠️ lokal fehlt:",rel,flush=True); continue
    name=os.path.basename(datei)
    url=karte.get(name)
    if not url:
        if DRY: print(f"  [DRY] {x['typ']:10} {x['titel'][:44]:44} ← {rel}",flush=True); n+=1; continue
        r=subprocess.run([NODE,"automation/upload_to_shopify_cdn.mjs",datei,
                          f"Druckmotiv {os.path.splitext(name)[0]}"],capture_output=True,text=True,
                         env={**os.environ,"SHOPIFY_ADMIN_TOKEN":TOK,"SHOPIFY_SHOP":SHOP})
        out=(r.stdout or "").strip().splitlines()
        url=out[-1] if out else ""
        if not url.startswith("https://cdn.shopify.com/"):
            print("  ⚠️ Upload:",name,(r.stderr or "")[-70:].strip(),flush=True); continue
        karte[name]=url; json.dump(karte,open(KARTE,"w"),ensure_ascii=False,sort_keys=True,indent=0)
    if DRY: print(f"  [DRY] {x['typ']:10} {x['titel'][:44]:44} ← {rel}",flush=True); n+=1; continue
    d=gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{message}}}',
          {"m":[{"ownerId":x['id'],"namespace":"custom","key":"print_file","type":"url","value":url}]})
    f=(((d or {}).get("data") or {}).get("metafieldsSet") or {}).get("userErrors")
    if d is None or f is None or f:
        print("  ⚠️",x['titel'][:40],json.dumps(f)[:70] if f else "keine Antwort",flush=True); continue
    with open(LEDGER,"a") as fh: fh.write(f"{x['id']}\t{url}\t{x['titel'][:60]}\n")
    n+=1
    if n%25==0: print(f"   … {n} umgehaengt",flush=True)
    time.sleep(0.25)
print(f"FERTIG: {n} Druckdateien {'geprueft (DRY)' if DRY else 'auf die CDN umgestellt'}",flush=True)
