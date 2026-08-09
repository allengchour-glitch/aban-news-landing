import json,subprocess,time,os,re
KEY=open("/tmp/bigbuy_key.txt").read().strip()
def bb(path,method="GET",body=None):
    a=["curl","-s","--max-time","35","-H","Authorization: Bearer "+KEY]
    if body is not None:
        a+=["-X","POST","-H","Content-Type: application/json","-d",json.dumps(body)]
    a.append("https://api.bigbuy.eu"+path)
    r=subprocess.run(a,capture_output=True,text=True)
    try: return json.loads(r.stdout)
    except Exception: return {"_raw":r.stdout[:120]}
tools=json.load(open("/tmp/tool_revive.json"))
out=[]
done=set()
if os.path.exists("/tmp/bb_tool_result.jsonl"):
    for l in open("/tmp/bb_tool_result.jsonl"):
        try: done.add(json.loads(l)["gid"])
        except Exception: pass
f=open("/tmp/bb_tool_result.jsonl","a")
ok=no=0
for gid,title,price,sku in tools:
    if gid in done: continue
    s=(sku or "").upper().replace("BB-","")
    if re.fullmatch(r'\d+',s):                      # reine Zahl = BigBuy-Produkt-ID → Referenz holen
        p=bb(f"/rest/catalog/product/{s}.json")
        ref=p.get("sku")
        time.sleep(0.7)
    else:
        ref=s                                        # S…/V… ist bereits die Referenz
    if not ref:
        f.write(json.dumps({"gid":gid,"title":title,"status":"kein-produkt"})+"\n"); f.flush(); continue
    sh=bb("/rest/shipping/orders.json","POST",{"order":{"delivery":{"isoCountry":"CH","postcode":"8000","town":"Zurich"},"products":[{"reference":ref,"quantity":1}]}})
    opts = sh.get("shippingOptions") if isinstance(sh,dict) else (sh if isinstance(sh,list) else [])
    opts = opts or []
    shippable = len(opts)>0
    cost = min([o.get("cost",999) for o in opts]) if shippable else None
    st={"gid":gid,"title":title,"price":price,"ref":ref,"ch":shippable,"ship":cost}
    f.write(json.dumps(st,ensure_ascii=False)+"\n"); f.flush()
    if shippable: ok+=1
    else: no+=1
    if (ok+no)%20==0: print(f"geprüft {ok+no} | CH-lieferbar {ok} | nicht {no}",flush=True)
    time.sleep(0.7)
print(f"FERTIG: {ok} CH-lieferbar, {no} nicht lieferbar")
