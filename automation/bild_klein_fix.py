"""Google-Merchant «Bild zu klein (<500x500)» heilen.
Strategie: Hat das Produkt ein ANDERES Medium mit >=500x500, wird das zum Hauptbild
(productReorderMedia). Nur wenn ALLE Bilder klein sind, wird das Produkt gemeldet
(dann fehlt die Quelle -> Tag 'bild-zu-klein' fuer spaeteren Lieferanten-Backfill).
Resumable ueber /tmp/bildklein_cursor.txt.
"""
import json,subprocess,time,re,os
TOK=open("/tmp/cj_shop_token.txt").read().strip()
def gql(q,v=None):
    p=json.dumps({"query":q,"variables":v or {}})
    for _ in range(5):
        r=subprocess.run(["curl","-s","--max-time","60","https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json","-H","X-Shopify-Access-Token: "+TOK,"-H","Content-Type: application/json","-d",p],capture_output=True,text=True)
        try:
            d=json.loads(r.stdout)
            if "data" in d: return d
        except Exception: pass
        time.sleep(4)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")

Q='''query($c:String){ products(first:60,after:$c,query:"status:ACTIVE"){ pageInfo{hasNextPage endCursor}
 nodes{ id title
   media(first:12){nodes{ id ... on MediaImage{ image{width height} } }}
 }}}'''
MV='''mutation($id:ID!,$m:[MoveInput!]!){ productReorderMedia(id:$id, moves:$m){ userErrors{message} }}'''
TAG='mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}'

st="/tmp/bildklein_cursor.txt"
cur=open(st).read().strip() or None if os.path.exists(st) else None
n=0; fixed=0; hopeless=0
while True:
    d=gql(Q,{"c":cur})
    pg=(d.get("data") or {}).get("products")
    if not pg: print("keine daten",flush=True); break
    for p in pg["nodes"]:
        n+=1
        med=[m for m in p["media"]["nodes"] if m.get("image")]
        if not med: continue
        f=med[0]["image"]
        fw,fh=f.get("width") or 0, f.get("height") or 0
        if fw>=500 and fh>=500: continue
        # Ersatz suchen: groesstes Bild mit beiden Kanten >=500
        cands=[m for m in med[1:] if (m["image"].get("width") or 0)>=500 and (m["image"].get("height") or 0)>=500]
        if cands:
            best=max(cands,key=lambda m:(m["image"]["width"]*m["image"]["height"]))
            r=gql(MV,{"id":p["id"],"m":[{"id":best["id"],"newPosition":"0"}]})
            errs=((r.get("data") or {}).get("productReorderMedia") or {}).get("userErrors") or []
            if not errs:
                fixed+=1
                print(f"FIX {p['title'][:55]} {fw}x{fh} -> {best['image']['width']}x{best['image']['height']}",flush=True)
            time.sleep(0.25)
        else:
            hopeless+=1
            gql(TAG,{"id":p["id"],"t":["bild-zu-klein"]})
            time.sleep(0.15)
    if n % 600 < 60: print(f"gescannt {n} | umsortiert {fixed} | ohne Ersatz {hopeless}",flush=True)
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]; open(st,"w").write(cur)
print(f"FERTIG: {n} gescannt, {fixed} Hauptbilder getauscht, {hopeless} ohne grosses Bild (Tag bild-zu-klein)")
