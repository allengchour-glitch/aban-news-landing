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
PATS=[
 (re.compile(r'<p>\s*Versand:\s*ca\.\s*\d+\s*[–-]\s*\d+\s*Tage\.?\s*</p>',re.I),""),          # doppelte Versandzeile
 (re.compile(r'Versand:\s*ca\.\s*\d+\s*[–-]\s*\d+\s*Tage\.?',re.I),""),
 (re.compile(r'Gratis[- ]Versand ab CHF 50',re.I),"Gratis-Versand ab CHF 65"),
 (re.compile(r'Kostenloser Versand ab CHF 50',re.I),"Gratis-Versand ab CHF 65"),
 (re.compile(r'Abholung bei TK und TEMU[^<.]*\.?',re.I),""),
 (re.compile(r'\bTEMU\b',re.I),""),
 (re.compile(r'Bei Fragen bitte den Händler kontaktieren\.?',re.I),""),
 (re.compile(r'Verpackungsmethode:\s*',re.I),"Lieferumfang: "),
]
state="/tmp/versand_cursor.txt"
cur=(open(state).read().strip() or None) if os.path.exists(state) else None
sc=fx=0
while True:
    d=gql('query($c:String){ products(first:100,after:$c,query:"status:ACTIVE"){ pageInfo{hasNextPage endCursor} nodes{id descriptionHtml} }}',{"c":cur})
    pg=(d.get("data") or {}).get("products")
    if not pg: break
    for p in pg["nodes"]:
        sc+=1
        h=p["descriptionHtml"] or ""; n=h
        for pat,rep in PATS: n=pat.sub(rep,n)
        n=re.sub(r'<p>\s*</p>','',n)
        n=re.sub(r'\s{3,}',' ',n)
        if n!=h:
            gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',{"i":{"id":p["id"],"descriptionHtml":n}})
            fx+=1; time.sleep(0.18)
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]; open(state,"w").write(cur)
    if sc%500<100: print(f"gescannt {sc}, korrigiert {fx}",flush=True)
print(f"FERTIG: {sc} gescannt, {fx} korrigiert")
