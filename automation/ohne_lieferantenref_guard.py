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

# ⚠️ 20.08.2026: Eine SKU zu HABEN ist nicht dasselbe wie eine QUELLE zu haben.
# Der Juni-Import legte 65 Produkte mit frei getippten Slugs an, die sich als Referenz
# tarnen: «CJ-ANTIGRAV-HUMID», «cj-bag-capri», «cool-turtle», «FENRIR-BLK». Das Präfix
# «CJ-» kann jeder tippen; bei CJ existiert dahinter nichts (API: 1602001 Product not
# found). Deshalb wird hier die FORM geprüft, nicht der Anfangsbuchstabe.
_KERN = [
    re.compile(r'^CJ[A-Z]{2}[0-9A-Z]{6,}', re.I),          # CJ-Varianten-SKU: CJYD…/CJBQ…/CJSL…
    re.compile(r'^\d{9,}'),                                # CJ-pid (lange Zahl)
    re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-', re.I),   # UUID (CJ + Gelato-POD)
]


def gueltige_ref(sku):
    """True, wenn die SKU die FORM einer echten Lieferantenreferenz hat.

    Bewusst grosszügig: lieber eine erfundene SKU durchlassen als ein bestellbares
    Produkt draften. Bekannte Formen (Stand 20.08.2026, gegen den Live-Katalog geprüft):
      CJ-2606160740461633600 · cj-CJBQ2934265 · CJ-CJYD292641701AZ-Black · CJYD291508502BY
      bb-S3414715 · BB-V0100921 · fortura-… · LX-… · 5599797_4012 (Printful)
      aee8d787-63c4-41a9-… (Gelato-POD)
    """
    s = (sku or "").strip()
    if not s:
        return False
    low = s.lower()
    if low.startswith(("bb-", "fortura-", "lx-")):
        return True
    if re.match(r'^\d{6,}_\d+$', s):                       # Printful <sync>_<variant>
        return True
    kern = re.sub(r'^cj-', '', s, flags=re.I)               # Präfix abziehen, Kern prüfen
    return any(k.match(kern) for k in _KERN)


def hat_quelle(p):
    """Produkt gilt als bestellbar, wenn IRGENDEINE Variante eine formgültige Referenz trägt."""
    return any(gueltige_ref(v["sku"]) for v in p["variants"]["nodes"])


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
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


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
            if not hat_quelle(p):
                continue          # immer noch keine (formgültige) Quelle -> bleibt draussen
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
    schein = []   # SKU sieht aus wie eine Referenz, ist aber keine
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
                # SKU vorhanden — aber trägt sie die FORM einer echten Referenz?
                # Diese Klasse wird NUR GEMELDET, nicht gedraftet: ein zu strenges
                # Formmuster über 41'000 Produkte würde gültige Ware aus dem Verkauf
                # nehmen. Erst mit DRY-Ausgabe gegenprüfen, dann von Hand entscheiden.
                if not hat_quelle(p) and not any(POD.search(t) for t in p["tags"]):
                    schein.append((p["id"], p["title"],
                                   [v["sku"] for v in p["variants"]["nodes"] if v["sku"]][:1]))
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
    if schein:
        print(f"⚠️ {len(schein)} Produkte tragen eine SKU OHNE gültige Referenzform "
              f"(getarnte Slugs wie 'CJ-ANTIGRAV-HUMID' / 'cool-turtle') — nur gemeldet:",
              flush=True)
        for gid, titel, sku in schein[:15]:
            print(f"  ❓ {gid.split('/')[-1]} {sku} {titel[:52]}", flush=True)
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
