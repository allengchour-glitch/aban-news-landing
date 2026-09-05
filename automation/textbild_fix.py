import json,subprocess,time,os,io,re
from PIL import Image
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
def fetch(url):
    try:
        r=subprocess.run(["curl","-sL","--max-time","25",url.split("?")[0]],capture_output=True)
        if len(r.stdout)<500: return None
        return Image.open(io.BytesIO(r.stdout)).convert("L")
    except Exception: return None
def textscore(im):
    if im is None: return 999
    im=im.resize((400,400)); px=im.load(); rows=0
    for y in range(0,400,2):
        runs=0; dark=0; prev=False
        for x in range(0,400,2):
            d=px[x,y]<110; dark+=d
            if d and not prev: runs+=1
            prev=d
        if runs>=8 and dark<140: rows+=1
    return rows
# Optionaler Filter, damit einzelne Kategorien vorgezogen werden können. Anlass: die Uhren
# (904 Artikel) haben auffällig oft eine Lieferanten-Collage als Hauptbild — mit englischem
# Werbetext und fremder Marke. Ohne Filter käme die Kategorie erst nach Zehntausenden anderer
# Produkte an die Reihe.
QUERY=os.environ.get("QUERY","status:ACTIVE")
Q=f'''query($c:String){{products(first:50,after:$c,query:"{QUERY}"){{pageInfo{{hasNextPage endCursor}}
 nodes{{id title media(first:6){{nodes{{id ... on MediaImage{{image{{url}}}}}}}}}}}}}}'''
# Cursor und Ledger im Repo, nicht in /tmp: dieser Lauf lädt für JEDES Produkt bis zu fünf
# Bilder herunter und bewertet sie. Geht der Cursor bei einem Container-Wipe verloren,
# beginnt die Bildanalyse wieder bei null — das kostet Stunden und Bandbreite umsonst.
state=os.environ.get("CURSOR","dropship/_textbild_cursor.txt")
cur=(open(state).read().strip() or None) if os.path.exists(state) else None
# Geprüft-Ledger: Produkt-ID -> Media-ID des Hauptbilds, das beim letzten Lauf beurteilt
# wurde. Ohne dieses Ledger lud jeder Lauf für DIESELBEN ~500 unheilbaren Produkte erneut
# bis zu fünf Bilder herunter und kam nie über die ersten Seiten hinaus (beobachtet 26.08.:
# zehn Läufe in Folge «umsortiert 0» auf identischem Fenster). Der Schlüssel ist die
# Media-ID, nicht nur die Produkt-ID: Tauscht ein Backfill oder Reorder das Hauptbild,
# passt die Quittung nicht mehr und das Produkt wird neu beurteilt.
GEPRUEFT="dropship/_textbild_geprueft.txt"
quitt={}
if os.path.exists(GEPRUEFT):
    for z in open(GEPRUEFT,errors="ignore"):
        t=z.rstrip("\n").split("\t")
        if len(t)>=2: quitt[t[0]]=t[1]
qlog=open(GEPRUEFT,"a")
sc=hit=fix=skip=0
log=open("dropship/_textbild_hits.txt","a")
while True:
    d=gql(Q,{"c":cur}); pg=(d.get("data") or {}).get("products")
    if not pg: break
    for p in pg["nodes"]:
        sc+=1
        ms=[m for m in p["media"]["nodes"] if m.get("image")]
        if len(ms)<2: continue
        if quitt.get(p["id"])==ms[0]["id"]: skip+=1; continue
        s0=textscore(fetch(ms[0]["image"]["url"]))
        haupt=ms[0]["id"]
        if s0>=8:
            hit+=1
            best=None;bs=s0
            for m in ms[1:5]:
                s=textscore(fetch(m["image"]["url"]))
                if s<bs: bs=s; best=m
                if s<=1: break
            if best and bs<=3:
                r=gql('mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m){userErrors{message}}}',
                      {"id":p["id"],"m":[{"id":best["id"],"newPosition":"0"}]})
                if not (r.get("data") or {}).get("productReorderMedia",{}).get("userErrors"):
                    fix+=1; haupt=best["id"]
                    log.write(f'{p["id"]}\t{s0}->{bs}\t{p["title"][:60]}\n'); log.flush()
                time.sleep(0.2)
        qlog.write(f'{p["id"]}\t{haupt}\n'); qlog.flush()
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]; open(state,"w").write(cur)
    if sc%200<50: print(f"gescannt {sc} | Text-Hauptbilder {hit} | umsortiert {fix}",flush=True)
# Cursor am Ende löschen: der Katalog wächst täglich um Hunderte CJ-Importe. Bliebe der Cursor
# stehen, startete jeder Folgelauf am Ende und prüfte nie wieder etwas ("FERTIG: 37 gescannt").
if os.path.exists(state): os.remove(state)
print(f"FERTIG: {sc} gescannt ({skip} per Quittung uebersprungen), {hit} mit Text-Hauptbild, {fix} auf sauberes Bild umgestellt")
