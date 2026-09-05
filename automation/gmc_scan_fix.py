import json,subprocess,time,os
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
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")
GOOG="gid://shopify/Publication/302872297857"; OS="gid://shopify/Publication/301970915713"
Q='''query($c:String){products(first:100,after:$c){pageInfo{hasNextPage endCursor} nodes{id title status
  g:publishedOnPublication(publicationId:"%s") o:publishedOnPublication(publicationId:"%s")
  media(first:10){nodes{... on MediaImage{image{url width height}}}}}}}'''%(GOOG,OS)
state="/tmp/gmcscan_cursor.txt"; outf="/tmp/gmc_issues_all.jsonl"
cur=(open(state).read().strip() or None) if os.path.exists(state) else None
tot=un=sm=fixed=0
f=open(outf,"a")
while True:
    d=gql(Q,{"c":cur}); pg=(d.get("data") or {}).get("products")
    if not pg: break
    for p in pg["nodes"]:
        tot+=1
        if not p["g"]: continue
        if not p["o"] or p["status"]!="ACTIVE":
            un+=1; f.write(json.dumps({"t":"unreachable","id":p["id"],"title":p["title"],"status":p["status"]},ensure_ascii=False)+"\n")
            # aus Google-Feed nehmen (Seite ist nicht erreichbar)
            gql('mutation($id:ID!,$p:[PublicationInput!]!){publishableUnpublish(id:$id,input:$p){userErrors{message}}}',{"id":p["id"],"p":[{"publicationId":GOOG}]})
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
    if tot%1000<100: print(f"gescannt {tot} | unerreichbar {un} (aus Feed: {fixed}) | Bild<500 {sm}",flush=True)
print(f"FERTIG: {tot} gescannt, {un} unerreichbar (aus Google-Feed genommen: {fixed}), {sm} mit zu kleinem Hauptbild")
