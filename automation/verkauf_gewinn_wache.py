#!/usr/bin/env python3
"""verkauf_gewinn_wache.py — hebt VERKAUFTE Varianten auf den Gewinnziel-Preis (11.10.2026).

ANLASS (Betreiber 11.10.: «preisanpassung, heute 2 verkauf aber wenig gewinn»): preis_verlustschutz verhindert nur VERLUST.
Zu kleiner Gewinn blieb unbemerkt. Ausserdem hatten die Bügeltransfer-Varianten KEINEN Einkaufspreis (unitCost null) —
der Schutz sah sie nie. Diese Wache prüft nur Varianten, die in den letzten TAGE Tagen bezahlt verkauft wurden.

Rechnung je Verkauf (Hausregel «15 % Reserve», dropship/PREIS-VERLUSTSCHUTZ.md, Gebühren wie tools/marge_wahrheit.py):
  Gewinn = Preis × (1 − 15 %) + Kundenversand − (2.9 % + 0.30 + 1.5 %) − EK  ≥  GEWINN_ZIEL (CHF 12)
  Kundenversand: 0 ab CHF 45 nach Rabatt (Gratisversand), sonst CHF 7.00 (Schweiz).
  Ziel gerundet auf .90. NUR HEBEN (nie senken), höchstens +50 % je Lauf, höchstens 20 Änderungen je Lauf.
  Ohne EK (unitCost leer) = unbekannt, nie 0 → nur gemeldet.

Protokoll: dropship/_verkauf_gewinn.tsv (Datum, SKU, alt, neu, EK, Ziel, Versand) · Stand: dropship/_verkauf_gewinn_stand.json
  DRY=1 python3 automation/verkauf_gewinn_wache.py    # nur zeigen, nichts schreiben
  python3 automation/verkauf_gewinn_wache.py          # schreibt (täglich über den Aufseher)
"""
import datetime, json, math, os, sys, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json"
DRY = os.environ.get("DRY") == "1"
GEB_P, GEB_F, FX = 0.029, 0.30, 0.015
RABATT = 0.15
GEWINN_ZIEL = 12.0
GRATIS_AB = 45.0
VERSAND_CH = 7.0
TAGE = 60
MAX_HEBUNG = 1.5
MAX_AENDERUNGEN = 20
LEDGER = os.path.join(REPO, "dropship", "_verkauf_gewinn.tsv")
STAND = os.path.join(REPO, "dropship", "_verkauf_gewinn_stand.json")


def tok():
    return (os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read()).strip()


def gql(q, v=None):
    r = urllib.request.Request(URL, data=json.dumps({"query": q, "variables": v or {}}).encode(),
                               headers={"X-Shopify-Access-Token": tok(), "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(r, timeout=60))


def ceil90(x):
    c = math.ceil(x) - 0.10
    while c < x - 1e-9:
        c += 1
    return round(c, 2)


def ziel_preis(ek):
    """Kleinster Preis, der GEWINN_ZIEL bei RABATT liefert. Versand des Kunden zuerst 0 (Gratis), dann 7.00 —
    konsistent ist nur, wer die Gratisgrenze auch tatsächlich erreicht (sonst zahlt die Kundin 7.00)."""
    for versand in (0.0, VERSAND_CH):
        p = ceil90(((GEWINN_ZIEL + GEB_F + ek) / (1 - GEB_P - FX) - versand) / (1 - RABATT))
        gratis = p * (1 - RABATT) >= GRATIS_AB
        if (versand == 0.0) == gratis:
            return p, versand
    return p, VERSAND_CH


def verkaufte_varianten():
    since = (datetime.date.today() - datetime.timedelta(days=TAGE)).isoformat()
    ids, cursor = set(), None
    while True:
        j = gql("query($q:String,$c:String){ orders(first:100, after:$c, query:$q){ pageInfo{ hasNextPage endCursor } "
                "nodes{ lineItems(first:20){ nodes{ variant{ id } } } } } }",
                {"q": f"financial_status:paid created_at:>={since}", "c": cursor})
        d = (j.get("data") or {}).get("orders")
        if not d:
            raise RuntimeError(f"Shopify-Bestellungen nicht lesbar: {j.get('errors')}")
        for o in d["nodes"]:
            for li in o["lineItems"]["nodes"]:
                if li.get("variant"):
                    ids.add(li["variant"]["id"])
        if not d["pageInfo"]["hasNextPage"]:
            break
        cursor = d["pageInfo"]["endCursor"]
    out = []
    ids = sorted(ids)
    for i in range(0, len(ids), 50):
        j = gql("query($ids:[ID!]!){ nodes(ids:$ids){ ... on ProductVariant { id sku price product{ id title status } "
                "inventoryItem{ unitCost{ amount } } } } }", {"ids": ids[i:i + 50]})
        out += [n for n in ((j.get("data") or {}).get("nodes") or []) if n]
    return out


def main():
    heute = datetime.date.today().isoformat()
    varianten = verkaufte_varianten()
    plan, ohne_ek = [], []
    for v in varianten:
        if v["product"]["status"] != "ACTIVE":
            continue
        ek_raw = ((v.get("inventoryItem") or {}).get("unitCost") or {}).get("amount")
        if ek_raw is None:
            ohne_ek.append(v["sku"])
            continue
        ek = float(ek_raw)
        ziel, versand = ziel_preis(ek)
        alt = float(v["price"])
        if alt >= ziel:
            continue
        neu = min(ziel, ceil90(alt * MAX_HEBUNG))
        if neu <= alt:
            continue
        plan.append({"id": v["id"], "sku": v["sku"], "pid": v["product"]["id"], "titel": v["product"]["title"],
                     "alt": alt, "neu": neu, "ek": ek, "ziel": ziel, "versand": versand})
    plan = plan[:MAX_AENDERUNGEN]
    for z in plan:
        print(f"  {z['sku']}: CHF {z['alt']:.2f} → {z['neu']:.2f} (Ziel {z['ziel']:.2f}, EK {z['ek']:.2f}, "
              f"Kundenversand {z['versand']:.2f}) · {z['titel'][:45]}", flush=True)
    print(f"Verkaufte Varianten: {len(varianten)} · zu heben: {len(plan)} · ohne EK (ungeprüft): {len(ohne_ek)}"
          f"{' · DRY' if DRY else ''}", flush=True)
    geaendert = 0
    if not DRY:
        nach_produkt = {}
        for z in plan:
            nach_produkt.setdefault(z["pid"], []).append(z)
        for pid, zs in nach_produkt.items():
            r = gql("mutation($pid:ID!,$vs:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$pid, variants:$vs)"
                    "{ productVariants{ id price } userErrors{ field message } } }",
                    {"pid": pid, "vs": [{"id": z["id"], "price": f"{z['neu']:.2f}"} for z in zs]})
            out = (r.get("data") or {}).get("productVariantsBulkUpdate") or {}
            fehler = out.get("userErrors") or r.get("errors")
            if fehler:
                print(f"  ⚠️ Schreibfehler {pid}: {fehler}", flush=True)
                continue
            geaendert += len(zs)
            with open(LEDGER, "a", encoding="utf-8") as f:
                for z in zs:
                    f.write(f"{heute}\t{z['sku']}\t{z['alt']:.2f}\t{z['neu']:.2f}\t{z['ek']:.2f}\t{z['ziel']:.2f}\t{z['versand']:.2f}\n")
    with open(STAND, "w", encoding="utf-8") as f:
        json.dump({"stand": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="minutes"),
                   "verkaufte_varianten": len(varianten), "zu_heben": len(plan), "geaendert": geaendert,
                   "ohne_ek": ohne_ek[:20], "ohne_ek_anzahl": len(ohne_ek), "dry": DRY}, f, ensure_ascii=False, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
