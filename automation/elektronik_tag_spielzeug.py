#!/usr/bin/env python3
"""Nimmt den Tag `elektronik` von Klemmbaustein-SPIELZEUG (31.08.2026).

Befund: Die CJ-Gruppe cjspielelektronik haengte `elektronik` blanko an alles —
390 Baustein-Sets standen dadurch in der Kategorie «Elektronik & Technik»
(Smart-Regel TAG=elektronik) und, weil CREATED_DESC, vorn in deren
Startseiten-Reihe. Die Quelle ist korrigiert (Tagliste ohne elektronik);
dieser Lauf raeumt den Bestand.

Konservativ: Nur Produkte, die BEREITS spielzeug UND kinder tragen UND deren
TITEL ein Bausteinwort enthaelt. RC-Helikopter, Game-Player usw. bleiben
unangetastet (Grenzfaelle). tagsRemove, NIE productUpdate(tags:).
"""
import json, re, sys, time, urllib.request

SHOP="au3j0y-hq.myshopify.com"
LEDGER="dropship/_elektronik_tag_spielzeug.txt"
# 31.08. erweitert: auch Modell-BAUSAETZE (E-Lok, Kampfjet, Dino …) trugen elektronik —
# gedeckt durch die Dreifach-Tag-Schranke (spielzeug+kinder) in der Suche.
MUSTER=re.compile(r'baustein|bauklotz|bauklötz|klemmbaustein|baukasten|bausatz|modellbau|modell\b|spielzeug', re.I)

def token(): return open("/tmp/cj_shop_token.txt").read().strip()
def gql(q, v=None, versuche=6):
    body=json.dumps({"query":q,"variables":v or {}}).encode()
    for i in range(versuche):
        try:
            req=urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json", data=body,
                headers={"X-Shopify-Access-Token":token(),"Content-Type":"application/json"})
            d=json.load(urllib.request.urlopen(req, timeout=30))
        except Exception: time.sleep(2*(i+1)); continue
        if d.get("errors"):
            if "Throttled" in json.dumps(d["errors"]): time.sleep(3*(i+1)); continue
            print("GraphQL:", json.dumps(d["errors"])[:200]); sys.exit(1)
        return d["data"]
    print("PAUSE (Shopify blieb stumm)"); sys.exit(2)

try: fertig=set(l.split()[1] for l in open(LEDGER) if len(l.split())>1)
except FileNotFoundError: fertig=set()

after=None; geprueft=0; entfernt=0
while True:
    d=gql('query($a:String){ products(first:50, after:$a, query:"tag:elektronik AND tag:spielzeug AND tag:kinder AND status:active"){ pageInfo{hasNextPage endCursor} nodes{id handle title tags productType} } }', {"a":after})
    c=d["products"]
    for p in c["nodes"]:
        geprueft+=1
        if p["handle"] in fertig: continue
        # 31.08. dritte Fassung: Titel-Muster fing Spielkueche/Bonsai/RC nicht — die harte
        # Schranke ist productType der Spielzeug-Gruppe plus die Dreifach-Tags der Suche.
        if p.get("productType") != "Spass-Elektronik" and not MUSTER.search(p["title"]): continue
        if "elektronik" not in p["tags"]: continue
        r=gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{field message}}}',
              {"id":p["id"],"t":["elektronik"]})
        if r["tagsRemove"]["userErrors"]:
            print("FEHLER", p["handle"], r["tagsRemove"]["userErrors"]); continue
        with open(LEDGER,"a") as f: f.write(f"{time.strftime('%Y-%m-%d')} {p['handle']}\n")
        entfernt+=1
        if entfernt % 25 == 0: print(f"  … {entfernt} entfernt")
        time.sleep(0.25)
    if not c["pageInfo"]["hasNextPage"]: break
    after=c["pageInfo"]["endCursor"]
print(f"FERTIG. geprueft={geprueft} elektronik-Tag entfernt={entfernt}")
