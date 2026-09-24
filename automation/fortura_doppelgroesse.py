#!/usr/bin/env python3
"""fortura_doppelgroesse.py — abgeschnittene Doppelgrössen der Fortura-Kostüme reparieren (24.09.2026).

WARUM (Ratgeber-Prüfer «Halloween-Kostüm Damen»): Der Fortura-Feed führt Doppelgrössen («Grösse S/M» in Bez2DE, «S-M» in
der ArtNr), das Feld GrösseDE ist aber abgeschnitten («S»). Der Importer übernahm GrösseDE → im Shop steht «S», geliefert
wird S/M. Wer M trägt, findet «seine» Grösse nicht. Gemessen am Feed vom 24.09.: 154 Varianten.
REGEL: nur eindeutige Fälle — Shop-Wert leer ODER ein Bestandteil der vollen Grösse («S» ⊂ «S/M»); alle Varianten mit
diesem Wert müssen dasselbe Ziel haben und das Ziel darf im Produkt noch nicht existieren. Umbenannt wird der
Optionswert (productOptionUpdate), Rücklesen je Produkt. Ohne SCHARF=1 nur der Plan.
"""
import csv, collections, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kollektionstexte_nachbessern import gql
SCHARF = os.environ.get("SCHARF") == "1"
FEED = os.environ.get("FORTURA_CSV", "/tmp/fortura_feed.csv")
rd = csv.reader(open(FEED, encoding="latin-1", errors="ignore"), delimiter="|")
h = next(rd); ix = {k: i for i, k in enumerate(h)}
ziel = {}
for r in rd:
    if len(r) < len(h): continue
    m = re.search(r"Gr(?:ö|oe)sse\s+([0-9A-Z]{1,5}\s*/\s*[0-9A-Z]{1,5})", r[ix["Bez2DE"]])
    if m: ziel["fortura-" + r[ix["ArtNr"]].strip()] = re.sub(r"\s", "", m.group(1))
print(f"Feed: {len(ziel)} Varianten mit Doppelgrösse in Bez2DE")
plan, n_ok = [], 0
skus = list(ziel)
for i in range(0, len(skus), 40):
    q = " OR ".join(f"sku:{s}" for s in skus[i:i+40])
    d = gql('query($q:String!){productVariants(first:100,query:$q){nodes{sku selectedOptions{name value} product{id handle options{id name optionValues{id name}}}}}}', {"q": q})
    for v in d["productVariants"]["nodes"]:
        z = ziel.get(v["sku"])
        for so in v["selectedOptions"]:
            if not re.match(r"Gr(ö|oe)sse|Size", so["name"], re.I): continue
            ist = so["value"].strip()
            if ist == z: n_ok += 1; continue
            if ist and ist not in z.split("/"): continue          # unstimmig → nicht anfassen
            plan.append((v["product"], so["name"], ist, z))
# je Produkt+Wert genau ein Ziel
grp = collections.defaultdict(set); prods = {}
for p, opt, ist, z in plan:
    grp[(p["id"], opt, ist)].add(z); prods[p["id"]] = p
todo = []
for (pid, opt, ist), zs in grp.items():
    p = prods[pid]; o = next(o for o in p["options"] if o["name"] == opt)
    namen = {v["name"] for v in o["optionValues"]}
    if len(zs) != 1 or (next(iter(zs)) in namen):
        print(f"  ⏭️ {p['handle'][:40]} {opt} «{ist}» → {zs} (mehrdeutig/schon vorhanden)"); continue
    val = next((v for v in o["optionValues"] if v["name"] == ist), None)
    if val: todo.append((p, o, val, next(iter(zs))))
print(f"schon korrekt: {n_ok} · umzubenennen: {len(todo)} Optionswerte in {len({t[0]['id'] for t in todo})} Produkten")
for p, o, val, z in todo[:12]: print(f"  {p['handle'][:45]:47} «{val['name']}» → «{z}»")
if not SCHARF: sys.exit(0)
ok = 0
for p, o, val, z in todo:
    r = gql('mutation($pid:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){productOptionUpdate(productId:$pid,option:$o,optionValuesToUpdate:$v){product{options{name optionValues{name}}} userErrors{message}}}',
            {"pid": p["id"], "o": {"id": o["id"]}, "v": [{"id": val["id"], "name": z}]})["productOptionUpdate"]
    namen = [v["name"] for oo in (r.get("product") or {}).get("options", []) if oo["name"] == o["name"] for v in oo["optionValues"]]
    if r["userErrors"] or z not in namen: print("  ⛔", p["handle"], r["userErrors"][:1]); continue
    ok += 1; time.sleep(0.3)
print(f"FERTIG: {ok} von {len(todo)} umbenannt (rückgelesen)")
