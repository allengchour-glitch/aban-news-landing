import json, ssl, time, urllib.request
TOK=open("/tmp/cj_shop_token.txt").read().strip()
CTX=ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
def gql(q, v=None, versuche=12):
    for i in range(versuche):
        req=urllib.request.Request("https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
            data=json.dumps({"query":q,"variables":v or {}}).encode(),
            headers={"X-Shopify-Access-Token":TOK,"Content-Type":"application/json"})
        d=json.loads(urllib.request.urlopen(req,context=CTX).read())
        if d.get("data") is not None: return d
        errs=d.get("errors") or []
        if any(e.get("extensions",{}).get("code")=="THROTTLED" for e in errs):
            ts=d.get("extensions",{}).get("cost",{}).get("throttleStatus",{})
            need=d["extensions"]["cost"].get("requestedQueryCost",50)-ts.get("currentlyAvailable",0)
            time.sleep(max(2, need/max(ts.get("restoreRate",50),1)+1)); continue
        return d
    raise SystemExit("⛔ dauerhaft gedrosselt")
