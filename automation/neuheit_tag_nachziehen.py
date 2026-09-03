#!/usr/bin/env python3
"""Setzt den Tag «neuheit» auf die Ware, die ihn braucht — die Startseiten-Reihe lebt davon.

BEFUND 03.09.2026: Die Reihe «✨ Neuheiten 2026» haengt an der Smart-Regel TAG=neuheit
(CREATED_DESC). KEIN Importer setzte den Tag; der juengste Artikel darin war vom 10.08.
Das Schaufenster zeigte 24 Tage lang dieselbe Ware, waehrend taeglich hunderte Produkte
dazukamen. Die Quelle ist repariert (alle drei CJ-Importer setzen den Tag jetzt) — dieses
Skript holt die Luecke dazwischen nach.

Nutzt tagsAdd, NIE productUpdate(tags:) — das wuerde die komplette Tag-Liste ersetzen
(Gedaechtnis-Regel vom 20.08.). Idempotent: ein zweites Setzen desselben Tags ist harmlos.
"""
import json, os, sys, time, urllib.request

SHOP = "au3j0y-hq.myshopify.com"
SEIT = os.environ.get("SEIT", "2026-08-11")
CAP  = int(os.environ.get("CAP", "5000"))
TOK  = open("/tmp/cj_shop_token.txt").read().strip()

def gql(q, v=None):
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json",
        data=json.dumps({"query": q, "variables": v or {}}).encode(),
        headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
    for i in range(6):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=45))
            if "data" in d and d["data"]:
                return d
            if "THROTTLED" in json.dumps(d.get("errors") or ""):
                time.sleep(3); continue
        except Exception:
            pass
        time.sleep(2 ** i)
    return {}

cur, n = None, 0
while n < CAP:
    d = gql('query($c:String,$q:String!){products(first:100,after:$c,query:$q){'
            'pageInfo{hasNextPage endCursor} nodes{id}}}',
            {"c": cur, "q": f"status:active created_at:>={SEIT} -tag:neuheit"})
    p = (d.get("data") or {}).get("products")
    if not p:
        print("PAUSE (Shopify stumm) — naechster Lauf macht weiter."); break
    if not p["nodes"]:
        print("FERTIG: keine Produkte mehr ohne Tag."); break
    for x in p["nodes"]:
        gql('mutation($id:ID!){tagsAdd(id:$id,tags:["neuheit"]){userErrors{message}}}', {"id": x["id"]})
        n += 1
        if n % 200 == 0: print(f"  {n} getaggt", flush=True)
        if n >= CAP: break
    # Cursor NICHT weitersetzen: der Filter «-tag:neuheit» schliesst die eben getaggten
    # bereits aus, die naechste Seite waere sonst uebersprungen.
    cur = None
print(f"FERTIG: {n} Produkte getaggt (seit {SEIT})")
