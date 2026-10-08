#!/usr/bin/env python3
"""buero_korb_typ.py — Produkttyp «Büro & Home Office» nur für Büroware (08.10.2026).

ANLASS (Betreiber «verbessere alles und sauber»): Die CJ-Gruppe «Büro & Home Office» stempelt jeden Treffer als Google
«Office Supplies»; produkttyp_aus_kategorie.mjs machte daraus den Shop-Typ «Büro & Home Office». Seit heute Morgen zieht
data/buero_korb.json die Google-Kategorie nach (google_kategorie_umzug.py), der TYP blieb: Badebomben, Gartenfee,
Anatomiemodelle, Golf-Adventskalender, Regenschirm trugen weiter «Büro & Home Office» — und der Typ machte sie bis heute
Abend zu Mitgliedern des Menüs «Büro & Home Office» (kategorie_rein_2 KERN, jetzt aus). Der Typ geht in den Google-Feed
(product_type) und in den Produkttyp-Filter.

REGEL (wie werkzeug_korb_shop.py): Typ neu = produkttyp_vereinheitlichen.aus_kategorie(Shopify-Kategorie, Titel) — nur wenn
  * der Typ HEUTE «Büro & Home Office»/«Büro» ist (idempotent),
  * die Shopify-Kategorie NICHT im Büro-Zweig liegt (os-…) und kein Bürowort im Titel steht (dieselbe Wortliste wie die
    Menü-Kollektion in kategorie_rein_2.py),
  * ein Typ ableitbar ist (sonst bleibt alles, nie raten) und keine Kollektion mit TYPE-Regel das Produkt verlöre (sperrgrund).
DRY (Standard) zeigt den Plan; SCHARF=1 schreibt (Rücklesen aus der Antwort). Ledger dropship/_buero_korb_typ.tsv
(id, alt, neu, kategorie) — Rückweg: Spalte 2 zurückschreiben. Täglich im Aufseher nach kategorie_rein_2.
"""
import json, os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402  (Eimer-Etikette eingebaut)
import produkttyp_vereinheitlichen as ptv  # noqa: E402
import kategorie_rein_2 as kr2  # noqa: E402

SCHARF = os.environ.get("SCHARF") == "1"
LEDGER = os.path.join(REPO, "dropship", "_buero_korb_typ.tsv")
TC = "gid://shopify/TaxonomyCategory/"
BUERO_TYPEN = {"Büro & Home Office", "Büro"}
_CFG = kr2.CFG["buro-home-office"]
BUEROWORT = _CFG["echt"] if _CFG else re.compile(r"büro|schreibtisch|notiz|stift|tastatur|mauspad", re.I)
# Büro-nahe Zweige ausserhalb von os-: Computerzubehör (Tastatur, Maus, Handgelenkauflage, Tastenkappen) bleibt Home Office
BUERO_ZWEIGE = ("os", "el-7-8")   # os = Office Supplies, el-7-8 = Computerzubehör (Mauspad, Handgelenkauflage)


def typ_fuer(kat, titel):
    return ptv.aus_kategorie(kat, titel)


def plan():
    regeln = ptv.typ_regeln()
    tun, bleibt = [], {"buero": 0, "ohne_typ": 0, "sperre": 0, "ohne_kat": 0}
    knoten = []
    for typname in sorted(BUERO_TYPEN):
        after = None
        while True:
            r = gql('query($q:String!,$a:String){products(first:100, after:$a, query:$q){pageInfo{hasNextPage endCursor} '
                    'nodes{id handle title productType category{id}}}}',
                    {"q": f"status:active product_type:'{typname}'", "a": after})["products"]
            knoten += r["nodes"]
            if not r["pageInfo"]["hasNextPage"]:
                break
            after = r["pageInfo"]["endCursor"]
    if True:
        r = {"nodes": knoten, "pageInfo": {"hasNextPage": False}}
        for p in r["nodes"]:
            if p["productType"] not in BUERO_TYPEN:
                continue
            kat = ((p.get("category") or {}).get("id") or "").replace(TC, "")
            if not kat:
                bleibt["ohne_kat"] += 1; continue
            if kat.startswith(BUERO_ZWEIGE) or BUEROWORT.search(p["title"]):
                bleibt["buero"] += 1; continue
            typ = typ_fuer(kat, p["title"])
            if not typ or typ in BUERO_TYPEN:
                bleibt["ohne_typ"] += 1; continue
            if ptv.sperrgrund(p["productType"], typ, regeln, pid=p["id"]):
                bleibt["sperre"] += 1; continue
            tun.append((p, typ, kat))
    return tun, bleibt


def main():
    tun, bleibt = plan()
    print(f"PLAN: {len(tun)} Typen neu · bleiben: {bleibt} · {'SCHARF' if SCHARF else 'TROCKEN'}")
    for p, t, k in tun:
        print(f"   {p['title'][:55]:55s} → {t:24s} {k}")
    if not SCHARF:
        print("FERTIG (trocken)"); return 0
    ok = fehl = 0
    with open(LEDGER, "a", encoding="utf-8") as f:
        for p, typ, kat in tun:
            r = gql('mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{productType} userErrors{message}}}',
                    {"p": {"id": p["id"], "productType": typ}})["productUpdate"]
            if not r["userErrors"] and (r.get("product") or {}).get("productType") == typ:
                ok += 1; f.write(f"{p['id']}\t{p['productType']}\t{typ}\t{kat}\n"); f.flush()
            else:
                fehl += 1; print(f"   ⚠️ {p['title'][:40]}: {r['userErrors']}")
    print(f"FERTIG: {ok} Typen nachgezogen, {fehl} Fehler")
    return 0


if __name__ == "__main__":
    sys.exit(main())
