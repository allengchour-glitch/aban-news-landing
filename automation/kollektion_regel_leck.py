#!/usr/bin/env python3
"""Repariert Smart-Regeln, die durch Substring-Treffer Fremdware einsammeln (09.09.2026).

ANLASS: Nach dem Auftauen der 92 preis-sortierten Kategorien (kollektion_auftauen.py
PREIS=1) standen die Fremdtreffer plötzlich VORNE — die Preissortierung hatte sie
jahrelang ans Ende geschoben und damit VERSTECKT. Der Defekt ist also älter als das
Auftauen; sichtbar wurde er erst dadurch.

GEMESSEN an der Regel-Engine selbst (nicht an der Suche — Shopifys Suche tokenisiert,
eine Smart-Regel CONTAINS ist ein LITERALER Teilstring; eine Simulation über die Suche
zählt falsch):
  camping-licht-outdoor  62 → 15   «laterne» traf 47 Blusen/Kleider mit LATERNENärmeln
  garten-leuchten       187 →  7   «laterne» + nacktes «solar» (Solar-Smartwatch, Kurbelradio)
  bar-cocktail           55 → 11   «sieb» (Fritteuse, Teesieb), «shaker» (Protein-, Milchshaker),
                                   «cocktail» (Cocktailkleid)
  sonnenbrillen-herren    4 →  3   «aviator» traf ein Lederarmband

Die Ersetzung ist in beide Richtungen am ECHTEN Inhalt der Kollektion gelesen worden,
nicht nur gezählt. Alte Regeln liegen in dropship/_kollektion_regeln_alt.json.
"""
import json, os, sys, time, urllib.request

SHOP="au3j0y-hq.myshopify.com"
DRY = os.environ.get("DRY")=="1"
SICHERUNG="dropship/_kollektion_regeln_alt.json"

NEU={
 "camping-licht-outdoor":["stirnlampe","campinglampe","campingleuchte","outdoor-lampe",
                          "campinglaterne","camping-laterne","sturmlaterne"],
 "garten-leuchten":["gartenleuchte","gartenlampe","solarleuchte","solar-leuchte","solarlampe",
                    "solar-lampe","solarlicht","solar-lichterkette","aussenleuchte","wegeleuchte",
                    "gartenlaterne","solarlaterne"],
 "bar-cocktail":["cocktail-shaker","cocktailshaker","boston shaker","barshaker","bar-shaker",
                 "barzubehör","barset","bar-set","jigger","cocktailglas","cocktail-glas",
                 "cocktail glas","für cocktails","cocktail-räuchergerät","eiscrusher","bartender"],
 "sonnenbrillen-herren":["herren-sonnenbrille","pilotenbrille","wayfarer","sport-sonnenbrille",
                         "sportsonnenbrille"],
}

def token(): return open("/tmp/cj_shop_token.txt").read().strip()
def gql(q,v=None,versuche=8):
    body=json.dumps({"query":q,"variables":v or {}}).encode()
    for i in range(versuche):
        try:
            req=urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json",data=body,
                headers={"X-Shopify-Access-Token":token(),"Content-Type":"application/json"})
            d=json.load(urllib.request.urlopen(req,timeout=40))
        except Exception: time.sleep(2*(i+1)); continue
        if d.get("errors"):
            if "hrottled" in json.dumps(d["errors"]): time.sleep(3*(i+1)); continue
            print("GraphQL:",json.dumps(d["errors"])[:300]); sys.exit(1)
        if d.get("data") is None: time.sleep(2*(i+1)); continue
        return d["data"]
    print("PAUSE (Shopify blieb stumm)"); sys.exit(2)

alt={}
if os.path.exists(SICHERUNG): alt=json.load(open(SICHERUNG))

for h,terms in NEU.items():
    c=gql('query($h:String!){collectionByHandle(handle:$h){id title ruleSet{appliedDisjunctively rules{column relation condition}}}}',{"h":h})["collectionByHandle"]
    if not c: print("⛔ fehlt:",h); continue
    alt.setdefault(h,{"titel":c["title"],"ruleSet":c["ruleSet"]})
    rules=[{"column":"TITLE","relation":"CONTAINS","condition":t} for t in terms]
    if DRY:
        print(f"DRY {h}: {len(c['ruleSet']['rules'])} → {len(rules)} Regeln"); continue
    r=gql('mutation($in:CollectionInput!){collectionUpdate(input:$in){collection{id ruleSet{rules{condition}}} userErrors{field message}}}',
          {"in":{"id":c["id"],"ruleSet":{"appliedDisjunctively":True,"rules":rules}}})
    ue=r["collectionUpdate"]["userErrors"]
    if ue: print("FEHLER",h,ue); continue
    got=[x["condition"] for x in r["collectionUpdate"]["collection"]["ruleSet"]["rules"]]
    ok = sorted(got)==sorted(terms)
    print(f"{'✔' if ok else '⚠'} {h}: {len(got)} Regeln gesetzt")
    time.sleep(0.4)

if not DRY:
    json.dump(alt,open(SICHERUNG,"w"),ensure_ascii=False,indent=1)
    print("Alte Regeln gesichert in",SICHERUNG)
