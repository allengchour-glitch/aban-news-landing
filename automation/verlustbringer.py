# -*- coding: utf-8 -*-
"""verlustbringer.py — nimmt Ware aus dem Verkauf, bei der JEDER Verkauf Geld kostet.

DER BEFUND (15.09.2026, gemessen ueber 432'085 aktive Varianten):
  1'785 Produkte verlieren Geld, SELBST wenn die Kundin CHF 7 Versand zahlt.
  433 davon rettet eine massvolle Preiskorrektur (<= 1,6-fach).
  1'352 nicht: dort frisst die China-Fracht den ganzen Preis (Katzenbaeume, Teppiche,
  Subwoofer). Ein Subwoofer zu CHF 15.90 haette CHF 992.83 kosten muessen.

WARUM DAS EIN GEWINNTHEMA IST — und kein Aufraeumen: bei diesen Artikeln ist ein Verkauf
SCHLECHTER als kein Verkauf. Sie stehen im Google-Kanal, also wird genau dafuer geworben.

⚠️ unitCost ENTHAELT DIE FRACHT SCHON (`cj_kosten_backfill.mjs`: «Warenkosten + VOLLE
   Fracht»). Wer sie ein zweites Mal abzieht, bekommt 229'374 Verlustartikel statt 11'923 —
   dieser Fehler ist am 15.09. einmal passiert und steht im Journal.
⚠️ Fehlender unitCost heisst UNBEKANNT, nicht 0 — solche Varianten werden NIE angefasst.

  DRY=1 python3 automation/verlustbringer.py     nur Bericht
        python3 automation/verlustbringer.py     aendert (CAP begrenzt)
"""
import json, os, sys, time, urllib.request, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
from marge_wahrheit import netto, mindestpreis

DRY = os.environ.get("DRY") == "1"
CAP = int(os.environ.get("CAP", "400"))
EXPORT = os.environ.get("EXPORT", "/tmp/marge_export.jsonl")
LEDGER = "dropship/_verlustbringer_done.txt"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
URL = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
GRENZE = 1.6          # bis hierhin Preiskorrektur, darueber aus dem Verkauf
PUFFER = 3.00         # gewuenschter Gewinn je Verkauf im Gratisversand

def gql(q, v=None):
    b = json.dumps({"query": q, "variables": v or {}}).encode()
    r = urllib.request.Request(URL, b, {"X-Shopify-Access-Token": TOK,
                                        "Content-Type": "application/json"})
    for i in range(6):
        try: d = json.load(urllib.request.urlopen(r, timeout=45))
        except Exception:
            if i == 5: raise
            time.sleep(2 ** i); continue
        if d.get("data"): return d
        f = json.dumps(d.get("errors") or d, ensure_ascii=False)
        if "THROTTLED" in f: time.sleep(3 + 2 * i); continue
        raise RuntimeError("Shopify ohne data: " + f[:300])
    raise RuntimeError("erschoepft")

def rappen(x):
    """auf die naechste .90 aufrunden — nie ABrunden, das wuerde den Verlust zurueckholen."""
    import math
    return math.floor(x) + 0.90 if math.floor(x) + 0.90 >= x else math.floor(x) + 1.90

def lade():
    preis, ek, titel = {}, {}, {}
    for z in open(EXPORT, encoding="utf-8"):
        o = json.loads(z); i = o["id"]
        if "/Product/" in i:
            titel[i] = o.get("title", "")
        elif "/ProductVariant/" in i:
            try: pr = float(o.get("price") or 0)
            except ValueError: continue
            uc = ((o.get("inventoryItem") or {}).get("unitCost") or {}).get("amount")
            if uc is not None:
                preis[i] = (pr, o.get("__parentId")); ek[i] = float(uc)
    return preis, ek, titel

def main():
    if not os.path.exists(EXPORT):
        print(f"Export {EXPORT} fehlt — erst einen Bulk-Export mit price+unitCost ziehen."); return
    preis, ek, titel = lade()
    vs = collections.defaultdict(list)
    for v, (pr, p) in preis.items(): vs[p].append(v)

    getan = set()
    if os.path.exists(LEDGER):
        getan = {z.strip() for z in open(LEDGER) if z.strip()}

    heben, raus = [], []
    for p, liste in vs.items():
        # Nur wenn JEDE Variante auch MIT Versanderloes verliert — sonst gibt es einen Ausweg.
        if not all(netto(preis[v][0], ek[v], 7.0) <= 0 for v in liste): continue
        if p in getan: continue
        f = max((mindestpreis(ek[v], 0.0) + PUFFER) / max(preis[v][0], 0.01) for v in liste)
        (heben if f <= GRENZE else raus).append(p)

    print(f"VERLUSTBRINGER (jede Variante verliert auch mit CHF 7 Versand)")
    print(f"  Preis korrigieren : {len(heben)}")
    print(f"  aus dem Verkauf   : {len(raus)}")
    print(f"  schon erledigt    : {len(getan)}")
    if DRY:
        print("\n  -- Trockenlauf, nichts geaendert. Beispiele: --")
        for p in heben[:5]:
            v = liste = vs[p][0]
            print(f"   HEBEN {preis[v][0]:7.2f} → {rappen(mindestpreis(ek[v],0)+PUFFER):7.2f}  {titel.get(p,'')[:44]}")
        for p in raus[:5]:
            v = vs[p][0]
            print(f"   RAUS  {preis[v][0]:7.2f}  EK {ek[v]:8.2f}  {titel.get(p,'')[:44]}")
        return

    M_PREIS = """mutation($id:ID!,$vs:[ProductVariantsBulkInput!]!){
      productVariantsBulkUpdate(productId:$id, variants:$vs){ userErrors{field message} } }"""
    M_DRAFT = """mutation($in:ProductInput!){ productUpdate(input:$in){
      product{id status} userErrors{field message} } }"""
    n = 0
    with open(LEDGER, "a") as led:
        for p in heben:
            if n >= CAP: break
            upd = [{"id": v, "price": f"{rappen(mindestpreis(ek[v],0.0)+PUFFER):.2f}"} for v in vs[p]]
            r = gql(M_PREIS, {"id": p, "vs": upd})["data"]["productVariantsBulkUpdate"]
            if r["userErrors"]:
                print("  ⚠️ Preis:", p, r["userErrors"][:1]); continue
            led.write(p + "\n"); led.flush(); n += 1
        for p in raus:
            if n >= CAP: break
            r = gql(M_DRAFT, {"in": {"id": p, "status": "DRAFT",
                                     "tags": ["verlust-auto-draft"]}})["data"]["productUpdate"]
            if r["userErrors"]:
                print("  ⚠️ Draft:", p, r["userErrors"][:1]); continue
            led.write(p + "\n"); led.flush(); n += 1
    print(f"\nFERTIG: {n} Produkte bearbeitet (CAP {CAP})")

if __name__ == "__main__":
    main()
