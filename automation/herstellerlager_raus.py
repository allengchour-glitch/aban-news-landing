#!/usr/bin/env python3
"""herstellerlager_raus.py — «Direktversand ab Herstellerlager» → «… ab Lieferantenlager» (24.09.2026).

WARUM: Die Ware kommt aus dem Lager des Dropship-Lieferanten (CJ), nicht vom Hersteller. Der Ratgeber-Prüfer fand die
Formulierung auf einer verlinkten Produktseite; gemessen 565 aktive Produkte. Quelle war der Versandbaustein in
delivery_block.mjs / versand_jenachland.py / versandaussagen_wahrheit.py (am selben Tag umgestellt, sonst Rückfall).
Ersetzt nur die exakte Zeichenfolge «ab Herstellerlager» in descriptionHtml, unter /tmp/lock_produkttext.lock,
Rücklesen je Produkt, Ledger dropship/_herstellerlager_raus.txt. Ohne SCHARF=1 nur zählen + drei Beispiele.
"""
import fcntl, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kollektionstexte_nachbessern import gql
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship", "_herstellerlager_raus.txt")
SCHARF = os.environ.get("SCHARF") == "1"
ALT, NEU = "ab Herstellerlager", "ab Lieferantenlager"

def alle():
    out, after = [], None
    while True:
        d = gql('query($a:String){products(first:100,after:$a,query:"\\"Herstellerlager\\""){pageInfo{hasNextPage endCursor} nodes{id handle status descriptionHtml}}}', {"a": after})["products"]
        out += [p for p in d["nodes"] if ALT in (p["descriptionHtml"] or "")]
        if not d["pageInfo"]["hasNextPage"]: return out
        after = d["pageInfo"]["endCursor"]

ps = alle()
print(f"{len(ps)} Produkte mit «{ALT}» (alle Status)")
if not SCHARF:
    for p in ps[:3]:
        i = p["descriptionHtml"].find(ALT); print(" ", p["handle"][:45], "…", p["descriptionHtml"][max(0, i-60):i+40].replace("\n", " "))
    sys.exit(0)
lock = open("/tmp/lock_produkttext.lock", "w"); fcntl.flock(lock, fcntl.LOCK_EX)
ok = fehl = 0
for p in ps:
    neu = p["descriptionHtml"].replace(ALT, NEU)
    r = gql('mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{descriptionHtml} userErrors{message}}}', {"p": {"id": p["id"], "descriptionHtml": neu}})["productUpdate"]
    body = (r.get("product") or {}).get("descriptionHtml") or ""
    if r["userErrors"] or ALT in body or NEU not in body:
        fehl += 1; print("  ⛔", p["handle"], r["userErrors"][:1]); continue
    ok += 1
    with open(LEDGER, "a") as f: f.write(f"{p['id']}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\n")
    time.sleep(0.25)
print(f"FERTIG: {ok} ersetzt (rückgelesen), {fehl} Fehler")
