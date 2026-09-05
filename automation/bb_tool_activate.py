import json,subprocess,time,os
KEY=open("/tmp/bigbuy_key.txt").read().strip()
STOK=open("/tmp/cj_shop_token.txt").read().strip()
def bb(path,method="GET",body=None):
    a=["curl","-s","--max-time","35","-H","Authorization: Bearer "+KEY]
    if body is not None: a+=["-X","POST","-H","Content-Type: application/json","-d",json.dumps(body)]
    a.append("https://api.bigbuy.eu"+path)
    r=subprocess.run(a,capture_output=True,text=True)
    try: return json.loads(r.stdout)
    except Exception: return {"_raw":r.stdout[:200]}
def gql(q,v=None):
    p=json.dumps({"query":q,"variables":v or {}})
    for _ in range(3):
        r=subprocess.run(["curl","-s","--max-time","40","https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json","-H","X-Shopify-Access-Token: "+STOK,"-H","Content-Type: application/json","-d",p],capture_output=True,text=True)
        try: return json.loads(r.stdout)
        except Exception: time.sleep(2)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")
rows=[json.loads(l) for l in open("/tmp/bb_tool_result.jsonl")]
cand=[x for x in rows if x.get("ch")]
print("CH-lieferbar:",len(cand))
done=set()
if os.path.exists("/tmp/bb_tool_active.txt"): done={l.strip() for l in open("/tmp/bb_tool_active.txt")}
f=open("/tmp/bb_tool_active.txt","a")
akt=skip_marge=skip_stock=0
CHF=0.93  # EUR→CHF grob
for x in cand:
    if x["gid"] in done: continue
    vk=float(x["price"]); ship=float(x["ship"])
    if ship*CHF > vk*0.35:                     # Fracht frisst >35% → unrentabel
        skip_marge+=1; f.write(x["gid"]+"\n"); continue
    # Bestandsprüfung: Bestell-Simulation (ER003 = ausverkauft)
    chk=bb("/rest/order/check.json","POST",{"order":{"internalReference":"stock-test","language":"de","paymentMethod":"moneybox",
        "carriers":[{"name":"seur"}],"shippingAddress":{"firstName":"Test","lastName":"Test","country":"CH","postcode":"8000",
        "town":"Zurich","address":"Teststrasse 1","phone":"0790000000","email":"info@luxestyle.ch"},
        "products":[{"reference":x["ref"],"quantity":1}]}})
    txt=json.dumps(chk)
    if "ER003" in txt or '"totalOrder":0' in txt:
        skip_stock+=1; f.write(x["gid"]+"\n"); time.sleep(0.8); continue
    gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',{"i":{"id":x["gid"],"status":"ACTIVE"}})
    gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}',{"id":x["gid"],"t":["lager-unbekannt-draft"]})
    gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',{"id":x["gid"],"t":["werkzeug","marken-werkzeug","ch-geprueft"]})
    for pub in ["301970915713","301971014017","302032716161","302566834561","302994456961"]:
        gql('mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}',{"id":x["gid"],"p":[{"publicationId":"gid://shopify/Publication/"+pub}]})
        time.sleep(0.1)
    akt+=1; f.write(x["gid"]+"\n"); f.flush()
    print(f'✅ CHF {vk:>7} (Fracht {ship}) {x["title"][:46]}',flush=True)
    time.sleep(0.9)
print(f"FERTIG: {akt} aktiviert | {skip_marge} Marge zu tief | {skip_stock} ausverkauft")
