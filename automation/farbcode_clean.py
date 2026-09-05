import json,subprocess,time,re,os
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
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")

COL={"black":"Schwarz","white":"Weiss","red":"Rot","blue":"Blau","green":"Grün","yellow":"Gelb","pink":"Pink","purple":"Lila",
"gray":"Grau","grey":"Grau","brown":"Braun","orange":"Orange","beige":"Beige","navy":"Marineblau","khaki":"Khaki","gold":"Gold",
"silver":"Silber","apricot":"Apricot","wine":"Weinrot","coffee":"Kaffeebraun","army":"Armee","dark":"Dunkel","light":"Hell",
"sky":"Himmel","rose":"Rosé","ivory":"Elfenbein","champagne":"Champagner","burgundy":"Bordeaux","turquoise":"Türkis",
"single":"","west":"","vest":"Weste","check":"kariert","plaid":"kariert","grid":"kariert","stripe":"gestreift","stripes":"gestreift","and":"/","small":"klein"}
CODE=re.compile(r'^[A-Z]{0,6}[\d][\w.-]*$|^[A-Z]{4,}\d*$|^[A-Z0-9]{6,}$')

def clean_entry(e):
    e=e.strip()
    if not e: return None
    toks=[t for t in re.split(r'\s+',e) if t]
    keep=[]
    for t in toks:
        if CODE.match(t): continue          # roher Code
        w=re.sub(r'[^\w]','',t).lower()
        if len(t)==1 and t.isupper(): continue
        rep=COL.get(w,t)
        if rep: keep.append(rep)
    out=" ".join(keep).strip(" /-,")
    out=re.sub(r'\s{2,}',' ',out)
    if not out or len(out)<3: return None
    if re.search(r'\d{3,}',out): return None       # Restcodes
    if not re.search(r'[a-zäöüA-ZÄÖÜ]{3,}',out): return None
    return out[:40]

LI=re.compile(r'<li>\s*<strong>Farbe:</strong>(.*?)</li>', re.S)
def fix_html(html):
    m=LI.search(html)
    if not m: return None,0
    raw=m.group(1)
    if not re.search(r'[A-Z]{2,}\d|\d{3,}|[A-Z]{5,}', raw): return None,0   # sieht sauber aus
    parts=[clean_entry(x) for x in raw.split(",")]
    parts=[p for p in parts if p]
    seen=set(); uniq=[]
    for p in parts:
        k=p.lower()
        if k in seen: continue
        seen.add(k); uniq.append(p)
    if len(uniq)>=2:
        new="<li>\n<strong>Farbe:</strong> "+", ".join(uniq[:12])+"</li>"
    else:
        new=""                                    # Zeile ganz raus
    return html[:m.start()]+new+html[m.end():], 1

state="/tmp/farbcode_cursor.txt"
cur=open(state).read().strip() or None if os.path.exists(state) else None
fixed=0; scanned=0; removed=0
while True:
    d=gql('query($c:String){ products(first:100,after:$c,query:"status:ACTIVE"){ pageInfo{hasNextPage endCursor} nodes{id descriptionHtml} }}',{"c":cur})
    pg=(d.get("data") or {}).get("products")
    if not pg: print("Abbruch: keine Daten",flush=True); break
    for p in pg["nodes"]:
        scanned+=1
        new,changed=fix_html(p["descriptionHtml"] or "")
        if changed:
            r=gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',{"i":{"id":p["id"],"descriptionHtml":new}})
            fixed+=1
            if "<strong>Farbe:" not in new: removed+=1
            time.sleep(0.2)
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]
    open(state,"w").write(cur)
    if scanned % 500 < 100: print(f"gescannt {scanned}, bereinigt {fixed} (davon Zeile entfernt {removed})",flush=True)
print(f"FERTIG: {scanned} gescannt, {fixed} bereinigt, {removed} Zeilen entfernt")
