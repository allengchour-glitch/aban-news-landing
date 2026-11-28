import json,subprocess,time,os
TOK=open("/tmp/cj_shop_token.txt").read().strip()
def gql(q,v=None,*,versuche=4):
    p=json.dumps({"query":q,"variables":v or {}})
    for versuch in range(versuche):
        r=subprocess.run(["curl","--fail","-sS","--max-time","60","https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json","-H","X-Shopify-Access-Token: "+TOK,"-H","Content-Type: application/json","-d",p],capture_output=True,text=True)
        if r.returncode == 22:
            raise RuntimeError(f"Shopify meldet einen HTTP-Fehler: {r.stderr.strip()}")
        if r.returncode == 0:
            try:
                d = json.loads(r.stdout)
            except ValueError:
                d = None
            if isinstance(d, dict) and d.get("errors"):
                raise RuntimeError(f"Shopify meldet GraphQL-Fehler: {d['errors']}")
            if isinstance(d, dict) and isinstance(d.get("data"), dict):
                return d["data"]
        if versuch + 1 < versuche:
            time.sleep(3)
    raise RuntimeError("Shopify-Antwort fehlt oder ist unlesbar. Ergebnis unbekannt.")
GOOG="gid://shopify/Publication/302872297857"; OS="gid://shopify/Publication/301970915713"
Q='''query($c:String){products(first:100,after:$c){pageInfo{hasNextPage endCursor} nodes{id title status
  g:publishedOnPublication(publicationId:"%s") o:publishedOnPublication(publicationId:"%s")
  media(first:10){nodes{... on MediaImage{image{url width height}}}}}}}'''%(GOOG,OS)
state="/tmp/gmcscan_cursor.txt"; outf="/tmp/gmc_issues_all.jsonl"
cur=(open(state).read().strip() or None) if os.path.exists(state) else None
tot=un=sm=fixed=0
f=open(outf,"a")
while True:
    pg = gql(Q, {"c":cur})["products"]
    for p in pg["nodes"]:
        tot+=1
        if p["g"] is False: continue
        if p["g"] is not True or not isinstance(p["o"], bool) or not p["status"]:
            raise RuntimeError(f"Unvollständiger Kanal- oder Produktstatus: {p['id']}")
        if not p["o"] or p["status"]!="ACTIVE":
            un+=1; f.write(json.dumps({"t":"unreachable","id":p["id"],"title":p["title"],"status":p["status"]},ensure_ascii=False)+"\n")
            ergebnis = gql('mutation($id:ID!,$p:[PublicationInput!]!){publishableUnpublish(id:$id,input:$p){userErrors{message}}}',
                           {"id":p["id"],"p":[{"publicationId":GOOG}]}, versuche=1)
            fehler = ergebnis["publishableUnpublish"]["userErrors"]
            if fehler != []:
                raise RuntimeError(f"Auslistung für {p['id']} nicht bestätigt: {fehler}")
            nachher = gql('query($id:ID!,$kanal:ID!){product(id:$id){id publishedOnPublication(publicationId:$kanal)}}',
                          {"id":p["id"], "kanal":GOOG})["product"]
            if not nachher or nachher["id"] != p["id"] or nachher["publishedOnPublication"] is not False:
                raise RuntimeError(f"Auslistung für {p['id']} im Shopify-Kanal nicht bestätigt")
            fixed+=1; time.sleep(0.2); continue
        imgs=[m["image"] for m in p["media"]["nodes"] if m.get("image")]
        if not imgs: continue
        first=imgs[0]
        if first["width"]<500 or first["height"]<500:
            big=[i for i in imgs[1:] if i["width"]>=500 and i["height"]>=500]
            sm+=1
            f.write(json.dumps({"t":"small","id":p["id"],"title":p["title"],"w":first["width"],"h":first["height"],"ersatz":bool(big)},ensure_ascii=False)+"\n")
    f.flush()
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]; open(state,"w").write(cur)
    if tot%1000<100: print(f"gescannt {tot} | unerreichbar {un} (aus Shopify-Google-Kanal genommen: {fixed}) | Bild<500 {sm}",flush=True)
print(f"FERTIG: {tot} gescannt, {un} unerreichbar (aus Shopify-Google-Kanal genommen: {fixed}), {sm} mit zu kleinem Hauptbild")
