#!/usr/bin/env python3
"""ek_varianten_nachtragen.py — Einkaufspreis (unitCost) für Varianten nachtragen, die ein Varianten-Schreiber angelegt hat (24.09.2026).

ANLASS: `productOptionsCreate(variantStrategy: CREATE)` legt neue Varianten an, die Gewicht und Versandflags der alten erben,
aber NICHT deren unitCost. Gemessen: Kanarienvogel «Wasserfeste Maniküre» 1 von 14 mit EK; die Stecker-Auswahl vom 21.09.
(Tag stecker-eu-varianten) 54 von 69 Varianten ohne EK. Ohne EK rechnet verlustbringer.py und die Margen-Ampel blind.

REGEL: nur Produkte mit den Schreiber-Tags; nur wenn MINDESTENS eine Variante einen EK hat. Fehlender EK =
bekannter EK × (Verkaufspreis Variante / Verkaufspreis der Variante mit EK) — dieselbe Proportion, mit der die Schreiber
den Verkaufspreis aus dem CJ-Preis abgeleitet haben. Produkte ganz ohne EK bleiben unangetastet (Bericht).
Rücklesen je Produkt. DRY Standard, SCHARF=1 schreibt. Ledger dropship/_ek_varianten_nachgetragen.txt.
"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.environ.get("REPO", "/home/user/aban-news-landing"))
from kollektionstexte_nachbessern import gql   # noqa: E402

SCHARF = os.environ.get("SCHARF") == "1"
TAGS = ["stecker-eu-varianten", "auswahl-nachgeruestet"]
LEDGER = "dropship/_ek_varianten_nachgetragen.txt"


def produkte():
    q = " OR ".join(f"tag:{t}" for t in TAGS)
    after, out = None, []
    while True:
        r = gql('query($q:String!,$a:String){products(first:50,query:$q,after:$a){pageInfo{hasNextPage endCursor} nodes{id handle '
                'variants(first:100){nodes{id sku price inventoryItem{unitCost{amount}}}}}}}', {"q": q, "a": after})["products"]
        out += r["nodes"]
        if not r["pageInfo"]["hasNextPage"]:
            return out
        after = r["pageInfo"]["endCursor"]


def main():
    ganz_ohne, getan, fehler = [], 0, 0
    for p in produkte():
        vs = p["variants"]["nodes"]
        mit = [v for v in vs if v["inventoryItem"]["unitCost"]]
        ohne = [v for v in vs if not v["inventoryItem"]["unitCost"]]
        if not ohne:
            continue
        if not mit:
            ganz_ohne.append(p["handle"]); continue
        ref = min(mit, key=lambda v: float(v["price"]))
        ek_ref, vk_ref = float(ref["inventoryItem"]["unitCost"]["amount"]), float(ref["price"])
        plan = {v["id"]: f"{ek_ref * float(v['price']) / vk_ref:.2f}" for v in ohne}
        print(f"{p['handle'][:55]:55s} {len(ohne)} ohne EK → {sorted(set(plan.values()))} (Basis {ek_ref} bei VK {vk_ref})")
        if not SCHARF:
            continue
        e = gql('mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$pid,variants:$v){userErrors{message}}}',
                {"pid": p["id"], "v": [{"id": k, "inventoryItem": {"cost": c}} for k, c in plan.items()]})["productVariantsBulkUpdate"]["userErrors"]
        live = gql('query($id:ID!){product(id:$id){variants(first:100){nodes{id inventoryItem{unitCost{amount}}}}}}', {"id": p["id"]})["product"]
        ist = {v["id"]: f"{float(v['inventoryItem']['unitCost']['amount']):.2f}" for v in live["variants"]["nodes"] if v["inventoryItem"]["unitCost"]}
        if e or any(ist.get(k) != c for k, c in plan.items()):
            fehler += 1; print("   ⛔ nicht bestätigt:", e); continue
        getan += 1
        with open(LEDGER, "a") as fh:
            fh.write(f"{p['id'].split('/')[-1]}\t{len(plan)}\t{time.strftime('%Y-%m-%d')}\t{p['handle']}\n")
    print(f"ganz ohne EK (unangetastet): {len(ganz_ohne)} {ganz_ohne[:5]}")
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {getan} Produkte nachgetragen (rückgelesen), {fehler} Fehler"
          + ("" if SCHARF else " [DRY]"))


if __name__ == "__main__":
    main()
