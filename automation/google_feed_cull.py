import json,subprocess,time,re,os,sys
TOK=open("/tmp/cj_shop_token.txt").read().strip()
DRY = "--apply" not in sys.argv
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
# Raus aus dem Werbe-Feed (Google CSS-Kapazität überschritten → sonst ist ALLES abgelehnt):
RAUS = re.compile(r'kost[üu]m|verkleid|fasnacht|halloween|per[üu]cke|maske\b|tutu\b|hexe|vampir|zombie|clown|dessous|reizw|erotik|18\+|generalüberholt|restauriert|refurb', re.I)
CODE_IN_VALUE = re.compile(r'^[A-Z]{2,}[\d]{2,}|^[A-Z0-9]{7,}$|\bUS Size\b|\bYards\b|Generation \d|About \d+mm|Surface-|^\d{4,}')
Q='''query($c:String){products(first:100,after:$c){pageInfo{hasNextPage endCursor} nodes{
 id title status productType
 g:publishedOnPublication(publicationId:"%s")
 mediaCount{count} options{name values}
 priceRangeV2{minVariantPrice{amount}} }}}'''%GOOG
# ⚠️ 23.08.2026 — DIESER LAUF HINTERLIESS KEINE SPUR IM REPO, und das hat einen anderen
# Waechter zu Falschmeldungen gebracht. `google_kanal_luecke.py` meldet jedes Produkt, das
# im Online Store steht, bei Google fehlt und KEINEN erklaerenden Grund traegt. Ein hier
# bewusst entfernter Artikel traegt aber keinen Tag — sein Grund stand nur in /tmp. Folge:
# der Katalog-Audit vom 22.08. hat 27 Produkte faelschlich als "unerklaerte Luecke"
# angeklagt, und jede kuenftige Analyse haette dieselben erneut gemeldet.
# «Was nur in /tmp lebt, ist verloren» — zum dritten Mal in diesem Projekt.
# Das Ledger liegt jetzt im Repo und nennt den GRUND je Produkt.
state="/tmp/gfeed_cursor.txt"
LEDGER="dropship/_google_feed_cull.txt"
cur=(open(state).read().strip() or None) if (os.path.exists(state) and not DRY) else None
tot=infeed=drop=0
reasons={}
while True:
    d=gql(Q,{"c":cur}); pg=(d.get("data") or {}).get("products")
    if not pg: break
    for p in pg["nodes"]:
        tot+=1
        if not p["g"]: continue
        infeed+=1
        t=p["title"]; why=None
        if p["status"]!="ACTIVE": why="nicht-aktiv"
        elif RAUS.search(t) or RAUS.search(p["productType"] or ""): why="kein-werbe-sortiment"
        elif p["mediaCount"]["count"]<2: why="zu-wenig-bilder"
        elif float(p["priceRangeV2"]["minVariantPrice"]["amount"])<12: why="preis-zu-tief"
        else:
            for o in p["options"]:
                if any(CODE_IN_VALUE.search(v or "") for v in o["values"][:25]): why="roh-varianten-codes"; break
        if why:
            reasons[why]=reasons.get(why,0)+1; drop+=1
            if not DRY:
                gql('mutation($id:ID!,$p:[PublicationInput!]!){publishableUnpublish(id:$id,input:$p){userErrors{message}}}',{"id":p["id"],"p":[{"publicationId":GOOG}]})
                with open(LEDGER,"a") as fh:
                    fh.write(f"{p['id']}\t{why}\t{t[:70]}\n")
                time.sleep(0.16)
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]
    if not DRY: open(state,"w").write(cur)
    if tot%2000<100: print(f"{tot} geprüft | im Feed {infeed} | raus {drop} {reasons}",flush=True)
print(f"{'DRY ' if DRY else ''}FERTIG: {tot} geprüft, {infeed} im Google-Feed, {drop} rausgenommen → bleiben {infeed-drop}")
print("Gründe:",reasons)
