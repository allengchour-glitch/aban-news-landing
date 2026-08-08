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
    return {}
M='''mutation($pid:ID!,$o:OptionUpdateInput!,$u:[OptionValueUpdateInput!]){
 productOptionUpdate(productId:$pid, option:$o, optionValuesToUpdate:$u, variantStrategy:LEAVE_AS_IS){ userErrors{message} }}'''
COL={"black":"Schwarz","white":"Weiss","red":"Rot","blue":"Blau","green":"Grün","yellow":"Gelb","pink":"Pink","purple":"Lila",
"gray":"Grau","grey":"Grau","brown":"Braun","orange":"Orange","beige":"Beige","navy":"Marineblau","khaki":"Khaki","gold":"Gold",
"silver":"Silber","apricot":"Apricot","wine":"Weinrot","coffee":"Kaffeebraun","army":"Armee","dark":"Dunkel","light":"Hell",
"sky":"Himmel","rose":"Rosé","ivory":"Elfenbein","champagne":"Champagner","burgundy":"Bordeaux","turquoise":"Türkis",
"leather":"Leder","surface":"","double":"","mesh":"Mesh","emerald":"Smaragd","lavender":"Lavendel","mint":"Mint","cream":"Creme","camel":"Camel","olive":"Oliv","teal":"Petrol",
"vermilion":"Zinnoberrot","and":"/","stripe":"gestreift","stripes":"gestreift","plaid":"kariert","check":"kariert",
"floral":"geblümt","print":"bedruckt","velvet":"Samt","fleece":"Fleece","lined":"gefüttert","matte":"matt","color":"","colour":"","style":"","size":"","yards":"","us":"","about":"","mm":"","generation":"","suit":"","top":"","set":"Set"}
CODE=re.compile(r'^[A-Z]{0,6}\d[\w.-]*$|^[A-Z]{5,}\d*$|^[A-Z0-9]{7,}$')
def clean(v):
    v=re.sub(r'-?\bUS Size \d+\b','',v)
    v=re.sub(r'-?\b\d+\s*(Yards|Size|About \d+mm)\b','',v,flags=re.I)
    v=re.sub(r'\bGeneration\b.*$','',v,flags=re.I)
    toks=[t for t in re.split(r'[\s-]+',v) if t]
    keep=[]
    for t in toks:
        if CODE.match(t): continue
        w=re.sub(r'[^\w]','',t).lower()
        rep=COL.get(w,t)
        if rep: keep.append(rep)
    out=re.sub(r'\s{2,}',' '," ".join(keep)).strip(" /-,")
    out=re.sub(r"\bWeinrot Rot\b","Weinrot",out)
    out=re.sub(r"\b(\w+) \1\b",r"\1",out)
    out=out.strip(" /-,")
    if not out or len(out)<2: return None
    if re.search(r'\d{3,}',out): return None
    return out[:40]
state="/tmp/varval_cursor.txt"
cur=(open(state).read().strip() or None) if os.path.exists(state) else None
sc=fx=0
BAD=re.compile(r'^[A-Z]{2,}\d{2,}|^[A-Z0-9]{7,}$|US Size|\bYards\b|Generation \d|About \d+mm|Surface-')
while True:
    d=gql('query($c:String){products(first:60,after:$c,query:"status:ACTIVE"){pageInfo{hasNextPage endCursor} nodes{id options{id name optionValues{id name}}}}}',{"c":cur})
    pg=(d.get("data") or {}).get("products")
    if not pg: break
    for p in pg["nodes"]:
        sc+=1
        for o in p["options"]:
            vals=o["optionValues"]
            if not any(BAD.search(v["name"] or "") for v in vals): continue
            upd=[];seen=set()
            for v in vals:
                n=clean(v["name"] or "")
                if not n or n.lower() in seen: continue
                seen.add(n.lower())
                if n!=v["name"]: upd.append({"id":v["id"],"name":n})
            if not upd: continue
            r=gql(M,{"pid":p["id"],"o":{"id":o["id"]},"u":upd})
            e=(r.get("data") or {}).get("productOptionUpdate",{}).get("userErrors")
            if not e: fx+=1
            time.sleep(0.3)
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]; open(state,"w").write(cur)
    if sc%600<60: print(f"gescannt {sc} | Varianten-Werte bereinigt {fx}",flush=True)
print(f"FERTIG: {sc} gescannt, {fx} Optionen bereinigt")
