#!/usr/bin/env python3
"""google_ads_kuration.py — löst das Merchant-«Over capacity (CSS)»-Problem (163'593 > 158K).
Schwache Angebote werden NUR von Shopping-Ads ausgeschlossen (mm-google-shopping.excluded_destination
= ["Shopping_ads"]); die Gratis-Listings — der einzige Kanal mit belegten Verkäufen — bleiben
unangetastet. Kriterien (Ads-Klicks wären hier Verlust): nur 1 Bild · Preis < CHF 19 · Spielware/
Partydeko. Batch-Schreiber (25 Metafelder je metafieldsSet-Call), Ledger dropship/_ads_kuration.txt.

Modi:  EXPORT=/tmp/audit.jsonl (Default)  ·  QUELLE=live SEIT=JJJJ-MM-TT (täglicher Nachzug,
weil der Export ein Schnappschuss ist und der CJ-Grind täglich nachlegt).
Endet mit PAUSE (fortsetzbar) ausser der Durchlauf ist wirklich komplett → FERTIG."""
import json, os, sys, time, urllib.request

EXPORT = os.environ.get("EXPORT", "/tmp/audit.jsonl")
LEDGER = "dropship/_ads_kuration.txt"
MAX = int(os.environ.get("MAX", "0"))  # 0 = alles
SPIEL = {"spielzeug", "partydeko", "party", "kostüm", "kostuem", "fasnacht"}
TOK = open("/tmp/cj_shop_token.txt").read().strip()

def gq(q, v=None):
    for i in range(4):
        try:
            req = urllib.request.Request(
                "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                data=json.dumps({"query": q, "variables": v or {}}).encode(),
                headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
            d = json.loads(urllib.request.urlopen(req, timeout=60).read())
            if d.get("errors") and any(e.get("extensions", {}).get("code") == "THROTTLED" for e in d["errors"]):
                time.sleep(3 * (i + 1)); continue
            return d
        except Exception:
            time.sleep(2 * (i + 1))
    return {}

def kandidat(tags, mc, preis, ptyp):
    tl = {t.lower() for t in tags}
    if tl & SPIEL or (ptyp or "").lower() in ("spielzeug & spiele", "partydeko"): return "spielware"
    if mc is not None and mc <= 1: return "ein_bild"
    if preis is not None and preis < 19: return "billig"
    return None

def aus_export():
    with open(EXPORT) as f:
        for line in f:
            d = json.loads(line)
            if "__parentId" in d or d.get("status") != "ACTIVE": continue
            if not d.get("id", "").startswith("gid://shopify/Product/"): continue
            mc = d.get("mediaCount", {})
            mc = mc.get("count") if isinstance(mc, dict) else mc
            try: preis = float(d.get("priceRangeV2", {}).get("minVariantPrice", {}).get("amount"))
            except Exception: preis = None
            g = kandidat(d.get("tags", []), mc, preis, d.get("productType"))
            if g: yield d["id"], g

def aus_live(seit):
    q = '''query($c:String,$q:String!){products(first:100,after:$c,query:$q){
      pageInfo{hasNextPage endCursor}
      nodes{id tags productType status mediaCount{count} priceRangeV2{minVariantPrice{amount}}}}}'''
    cur = None
    while True:
        d = gq(q, {"c": cur, "q": f"status:active created_at:>{seit}"})
        p = (d.get("data") or {}).get("products")
        if not p: print("PAUSE (Live-Abfrage ohne Antwort)"); return
        for n in p["nodes"]:
            try: preis = float(n["priceRangeV2"]["minVariantPrice"]["amount"])
            except Exception: preis = None
            g = kandidat(n.get("tags", []), (n.get("mediaCount") or {}).get("count"), preis, n.get("productType"))
            if g: yield n["id"], g
        if not p["pageInfo"]["hasNextPage"]: return
        cur = p["pageInfo"]["endCursor"]; time.sleep(0.4)

done = set()
if os.path.exists(LEDGER):
    done = {l.split("\t")[0] for l in open(LEDGER) if l.strip()}
quelle = aus_live(os.environ.get("SEIT", "2026-08-16")) if os.environ.get("QUELLE") == "live" else aus_export()
MUT = '''mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{field message}}}'''
batch, n, fehler = [], 0, 0
def flush():
    global batch, n, fehler
    if not batch: return True
    r = gq(MUT, {"m": [{"ownerId": pid, "namespace": "mm-google-shopping",
                        "key": "excluded_destination", "type": "list.single_line_text_field",
                        "value": json.dumps(["Shopping_ads"])} for pid, _ in batch]})
    errs = ((r.get("data") or {}).get("metafieldsSet") or {}).get("userErrors")
    if errs is None or errs:
        fehler += 1; print("Fehler:", str(errs)[:200] or "keine Antwort")
        batch = []; return fehler < 5
    with open(LEDGER, "a") as f:
        for pid, g in batch: f.write(f"{pid}\t{g}\n")
    n += len(batch); batch = []
    if n % 500 < 25: print(f"  {n} gesetzt...")
    time.sleep(0.5)
    return True

komplett = True
for pid, g in quelle:
    if pid in done: continue
    if MAX and n >= MAX: komplett = False; break
    batch.append((pid, g))
    if len(batch) >= 25 and not flush(): komplett = False; break
if komplett: flush()
print(f"{'FERTIG' if komplett and fehler < 5 else 'PAUSE (Cursor im Ledger)'}: {n} Produkte von Shopping-Ads ausgeschlossen (Gratis-Listings unberührt)")
