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
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")
M='''mutation($pid:ID!,$o:OptionUpdateInput!,$u:[OptionValueUpdateInput!]){
 productOptionUpdate(productId:$pid, option:$o, optionValuesToUpdate:$u, variantStrategy:LEAVE_AS_IS){ userErrors{message} }}'''
# Pseudo-Standardwerte, die Shopify NICHT als Default erkennt → sinnloses Auswahlfeld + «- Standard» im Warenkorb
PSEUDO={"standard","default","default title ","einheitsgrösse","einheitsgroesse","one size","onesize","normal","-","standardausführung"}
RENAME={"Größe":"Grösse","Color":"Farbe","Colour":"Farbe","Size":"Grösse","Style":"Stil","Type":"Ausführung","Model":"Modell"}
state="/tmp/defvar_cursor.txt"
cur=(open(state).read().strip() or None) if os.path.exists(state) else None
sc=defx=namex=0
while True:
    d=gql('query($c:String){products(first:100,after:$c,query:"status:ACTIVE"){pageInfo{hasNextPage endCursor} nodes{id options{id name optionValues{id name}} variantsCount{count}}}}',{"c":cur})
    pg=(d.get("data") or {}).get("products")
    if not pg: print("keine Daten",flush=True); break
    for p in pg["nodes"]:
        sc+=1
        for o in p["options"]:
            vals=o["optionValues"]
            # 1) Ein-Varianten-Produkt mit Pseudo-Default → echter Shopify-Default
            if p["variantsCount"]["count"]==1 and len(vals)==1 and vals[0]["name"].strip().lower() in PSEUDO:
                r=gql(M,{"pid":p["id"],"o":{"id":o["id"],"name":"Title"},"u":[{"id":vals[0]["id"],"name":"Default Title"}]})
                if not r.get("data",{}).get("productOptionUpdate",{}).get("userErrors"): defx+=1
                time.sleep(0.25)
            # 2) Optionsname vereinheitlichen (Schweizer ss, deutsch statt englisch)
            elif o["name"] in RENAME:
                r=gql(M,{"pid":p["id"],"o":{"id":o["id"],"name":RENAME[o["name"]]}})
                if not r.get("data",{}).get("productOptionUpdate",{}).get("userErrors"): namex+=1
                time.sleep(0.25)
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]; open(state,"w").write(cur)
    if sc%500<100: print(f"gescannt {sc} | Default-Fix {defx} | Namens-Fix {namex}",flush=True)
print(f"FERTIG: {sc} gescannt, {defx} Standardvarianten bereinigt, {namex} Optionsnamen vereinheitlicht")
