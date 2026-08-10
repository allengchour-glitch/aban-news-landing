"""Nimmt Produkte ohne jede Lieferanten-Referenz aus dem Verkauf.

WARUM (belegt, nicht vermutet): Bestellung **#1008** ging über ein Produkt ohne SKU ein und
konnte nie ausgeliefert werden — der Kunde hatte bezahlt, und niemand konnte feststellen, wo
die Ware zu bestellen wäre. Seither steht die Regel im Projekt-Gedächtnis (§14): «Produkte
OHNE Lieferanten-SKU sind unprüfbar = unverkäuflich». Für BigBuy setzt der Viability-Guard sie
schon um; ein Alt-Bestand vom 21.05.2026 ist damals durchgerutscht.

Der Katalog-Audit vom 10.08. hat **266 aktive Produkte ohne SKU auf JEDER Variante** gefunden
(nicht nur auf der ersten — das wurde eigens nachgeprüft). Ein Blick in die Bestellhistorie
bestätigt das Muster: von zehn Bestellungen ist genau die eine ohne SKU (#1008) bis heute
unerfüllt.

Diese Produkte sehen gut aus — gepflegte Titel, schöne Bilder, teils als «bestseller»
markiert. Genau das macht sie gefährlich: sie werden bevorzugt gekauft und können dann nicht
geliefert werden. Ein Verkauf, der zurückabgewickelt werden muss, kostet mehr als ein Verkauf,
der nie zustande kommt.

REVERSIBEL: Es wird nur auf DRAFT gesetzt und mit `keine-lieferanten-ref` markiert — nichts
gelöscht. Sobald eine Bezugsquelle eingetragen ist, holt `REVIVE=1` das Produkt zurück.
Print-on-Demand ist ausgenommen: dort ist Printful die Quelle, die Variantennummer steht in
der SKU-Spalte des Fulfillment-Dienstes (Regel 4 — der Editor ist heilig).

DRY=1 meldet nur. REVIVE=1 macht die Änderung rückgängig.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
REVIVE = os.environ.get("REVIVE") == "1"
LEDGER = "dropship/_ohne_lieferantenref.txt"
TAG = "keine-lieferanten-ref"
POD = re.compile(r'printful|^fertig-|^pod-|selbstgestalten', re.I)


def gql(q, v=None):
    with open("/tmp/_or.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_or.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    return {}


def wiederbeleben():
    cur, n = None, 0
    while True:
        d = gql('query($c:String){products(first:100,after:$c,query:"status:DRAFT AND tag:'
                + TAG + '"){pageInfo{hasNextPage endCursor} nodes{id title '
                'variants(first:50){nodes{sku}}}}}', {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            break
        for p in pg["nodes"]:
            if not any((v["sku"] or "").strip() for v in p["variants"]["nodes"]):
                continue          # immer noch keine Quelle -> bleibt draussen
            n += 1
            print(f"  ♻️ zurück: {p['title'][:56]}", flush=True)
            if DRY:
                continue
            gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": p["id"], "status": "ACTIVE"}})
            gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t)'
                '{userErrors{message}}}', {"id": p["id"], "t": [TAG]})
            time.sleep(0.25)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {n} wiederbelebt")


def main():
    if REVIVE:
        return wiederbeleben()
    cur, treffer, geprueft, pod = None, [], 0, 0
    while True:
        d = gql('query($c:String){products(first:100,after:$c,query:"status:ACTIVE"){'
                'pageInfo{hasNextPage endCursor} nodes{id title tags '
                'variants(first:60){nodes{sku}}}}}', {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            break
        for p in pg["nodes"]:
            geprueft += 1
            if any((v["sku"] or "").strip() for v in p["variants"]["nodes"]):
                continue
            if any(POD.search(t) for t in p["tags"]):
                pod += 1                       # Printful liefert — Quelle ist dort hinterlegt
                continue
            treffer.append((p["id"], p["title"]))
        if geprueft % 5000 < 100:
            print(f"  … {geprueft} geprüft | ohne Quelle {len(treffer)} | POD verschont {pod}",
                  flush=True)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]

    print(f"{geprueft} aktive Produkte | ohne jede Lieferanten-SKU: {len(treffer)} "
          f"| POD ausgenommen: {pod}", flush=True)
    f = open(LEDGER, "a")
    n = 0
    for gid, titel in treffer:
        n += 1
        if n <= 15 or DRY:
            print(f"  ⛔ {titel[:60]}", flush=True)
        if DRY:
            continue
        gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
            {"i": {"id": gid, "status": "DRAFT"}})
        gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
            {"id": gid, "t": [TAG]})
        f.write(f"{gid}\tdraft-ohne-quelle\t{titel}\n"); f.flush()
        time.sleep(0.25)
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {n} auf DRAFT (rückholbar mit REVIVE=1)")


if __name__ == "__main__":
    main()
