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
GOOG="gid://shopify/Publication/302872297857"
KEEP=5000
rows=json.load(open("/tmp/gfeed_scores.json"))
ok=sorted([r for r in rows if r[1]>0], key=lambda r:-r[1])
keep={r[0] for r in ok[:KEEP]}
drop=[r[0] for r in rows if r[0] not in keep]
print(f"im Feed {len(rows)} | behalten {len(keep)} | aus dem Feed nehmen {len(drop)}",flush=True)
done=set()
if os.path.exists("/tmp/gfeed_done.txt"): done={l.strip() for l in open("/tmp/gfeed_done.txt")}
f=open("/tmp/gfeed_done.txt","a")
n=0
for gid in drop:
    if gid in done: continue
    gql('mutation($id:ID!,$p:[PublicationInput!]!){publishableUnpublish(id:$id,input:$p){userErrors{message}}}',{"id":gid,"p":[{"publicationId":GOOG}]})
    f.write(gid+"\n"); n+=1
    if n%250==0: f.flush(); print("entfernt",n,flush=True)
    time.sleep(0.14)
f.close()
print("FERTIG: aus dem Google-Feed genommen:",n,"→ Feed enthält jetzt ~",len(keep))
