#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""neuheiten_rotation.py — die Reihe «Neuheiten 2026» zeigt aus JEDER Welt das Neueste, nicht nur die
Gruppe, die der Grind gerade importiert.

BEFUND (05.09.2026, Audit mobil-startseite): «Neuheiten 2026» und «Elektronik & Technik» zeigten
10 von 12 dieselben Produkte — beide CREATED_DESC, und die juengsten Importe waren Beamer. Eine
Kollektion mit 10'000 Produkten sortiert sich nach dem Grind, nicht nach der Kundin.

LOESUNG: Die Smart-Kollektion `neu-eingetroffen` (TAG neuheit) steht auf MANUAL; dieses Werkzeug
holt taeglich je Welt die 1–2 juengsten brauchbaren Produkte (Kriterien wie querbeet_kuratieren:
≥3 Bilder, ab CHF 19, im Google-Kanal, kein Risiko-Tag) nach vorn — 24 Karten, Welten gemischt.
Der Rest der Kollektion bleibt dahinter in Anlegereihenfolge (Shopify haengt Neues bei MANUAL hinten an).
Idempotent je Tag; entfernt und draftet nichts. DRY=1 zeigt nur die Auswahl.
"""
import json, os, re, sys, time, urllib.request, datetime as dt

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
HANDLE = "neu-eingetroffen"
DRY = os.environ.get("DRY") == "1"
TAGE = int(os.environ.get("TAGE", "14"))
KARTEN = 24
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from querbeet_kuratieren import WELTEN, RISIKO_TAG, NICHT_TITEL, gleiche_warenart  # eine Regelquelle


def gql(q, v=None):
    for i in range(10):
        req = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json",
                                     data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                     headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
        try:
            d = json.load(urllib.request.urlopen(req, timeout=60))
        except Exception:
            time.sleep(2 + 2 * i); continue
        if d.get("data") is not None:
            return d
        ts = (d.get("extensions") or {}).get("cost", {}).get("throttleStatus") or {}
        time.sleep(max(2, (d["extensions"]["cost"].get("requestedQueryCost", 60) - ts.get("currentlyAvailable", 0)) / 50 + 1) if ts else 2 + 2 * i)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


Q = '''query($q:String!){products(first:60,query:$q,sortKey:CREATED_AT,reverse:true){
  nodes{id title tags createdAt mediaCount{count} featuredImage{url} priceRangeV2{minVariantPrice{amount}}
    resourcePublicationsV2(first:10){nodes{publication{name}}}}}}'''


def taugt(p):
    if (p.get("mediaCount") or {}).get("count", 0) < 3: return "unter 3 Bilder"
    if not p.get("featuredImage"): return "kein Bild"
    try:
        if float(p["priceRangeV2"]["minVariantPrice"]["amount"]) < 19: return "unter CHF 19"
    except Exception:
        return "kein Preis"
    if set(p["tags"]) & RISIKO_TAG: return "Risiko-Tag"
    if NICHT_TITEL.search(p["title"]): return "Titel"
    if not any("Google" in n["publication"]["name"] for n in p["resourcePublicationsV2"]["nodes"]): return "nicht bei Google"
    return ""


def main():
    seit = (dt.datetime.utcnow() - dt.timedelta(days=TAGE)).strftime("%Y-%m-%d")
    koll = gql('query($h:String!){collectionByHandle(handle:$h){id sortOrder}}', {"h": HANDLE})["data"]["collectionByHandle"]
    if not koll:
        print("OFFEN: Kollektion fehlt"); return
    welt_ids = {}
    for h in WELTEN:
        c = gql('query($h:String!){collectionByHandle(handle:$h){id}}', {"h": h})["data"]["collectionByHandle"]
        if c: welt_ids[h] = c["id"].split("/")[-1]
    auswahl, titel = [], []
    runde2 = []
    for h, cid in welt_ids.items():
        # ⚠️ tag:neuheit AND collection_id:… liefert still 0 (stiller Shopify-Filter, 05.09.) → Tag lokal pruefen
        q = f"status:active AND collection_id:{cid} AND created_at:>{seit}"
        nodes = (gql(Q, {"q": q}).get("data") or {}).get("products", {}).get("nodes", [])
        gut = [p for p in nodes if "neuheit" in p["tags"] and not taugt(p) and not any(gleiche_warenart(p["title"], t) for t in titel)]
        if gut:
            auswahl.append(gut[0]); titel.append(gut[0]["title"])
            if len(gut) > 1: runde2.append(gut[1])
        print(f"  {h:26s} {len(nodes):3d} seit {seit}, brauchbar {len(gut):3d} → {gut[0]['title'][:45] if gut else '—'}")
    for p in runde2:
        if len(auswahl) >= KARTEN: break
        if not any(gleiche_warenart(p["title"], t) for t in titel):
            auswahl.append(p); titel.append(p["title"])
    auswahl = auswahl[:KARTEN]
    print(f"Auswahl: {len(auswahl)} Produkte aus {len(welt_ids)} Welten")
    if DRY:
        return
    if koll["sortOrder"] != "MANUAL":
        r = gql('mutation($in:CollectionInput!){collectionUpdate(input:$in){userErrors{message}}}', {"in": {"id": koll["id"], "sortOrder": "MANUAL"}})
        print("sortOrder → MANUAL", ((r.get("data") or {}).get("collectionUpdate") or {}).get("userErrors"))
    moves = [{"id": p["id"], "newPosition": str(i)} for i, p in enumerate(auswahl)]
    r = gql('mutation($id:ID!,$m:[MoveInput!]!){collectionReorderProducts(id:$id,moves:$m){job{id} userErrors{field message}}}', {"id": koll["id"], "m": moves})
    d = (r.get("data") or {}).get("collectionReorderProducts") or {}
    print("FERTIG:", len(moves), "nach vorn, job", (d.get("job") or {}).get("id"), "errors", d.get("userErrors"))


if __name__ == "__main__":
    main()
