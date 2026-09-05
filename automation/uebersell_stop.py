"""Verhindert Verkäufe von Grössen, die nachweislich nicht mehr am Lager sind.

DER BEFUND (11.08.2026): Von 316'146 Varianten mit Bestand 0 sind fast alle **ungetrackt** —
bei ihnen bedeutet die 0 nichts, Shopify verkauft sie ohnehin unbegrenzt weiter. Genau
**26 Varianten** in **drei** Produkten sind dagegen `tracked: true` UND stehen zugleich auf
`CONTINUE`. Das ist die gefährliche Mischung: Der Bestand wird gepflegt, sagt «leer» — und
Shopify verkauft trotzdem. Das ist die Fehlerklasse der Bestellung #1009 (bezahlt, nicht
lieferbar, erstattet).

Dass es nur 26 sind, ist die gute Nachricht: die Bestandsführung im Katalog ist im Grossen
sauber. Es lohnt sich trotzdem, denn beide betroffenen CJ-Artikel sind Kleidung mit echtem,
synchronisiertem Bestand (2'186 bzw. 16'001 Stück über alle Grössen) — es fehlen also nur
einzelne Grössen, und genau die darf man nicht mehr verkaufen. Die Umstellung auf `DENY`
nimmt nur diese Grössen aus dem Verkauf; das Produkt selbst bleibt kaufbar.

Gesetzt wird auf ALLEN Varianten der betroffenen Produkte, nicht nur auf den heute leeren:
Eine Grösse, die morgen leer läuft, hätte sonst dasselbe Problem.

DAS DRITTE PRODUKT — und warum die naheliegende Annahme falsch war: Beim «Unisex T-Shirt –
Selbst gestalten» (Printful, Druck auf Bestellung) stehen acht Grössen auf 9999 («immer da»),
nur 5XL auf 0. Das sah nach einem vergessenen Wert aus, und der erste Entwurf dieses Skripts
wollte die 0 deshalb auf 9999 heben. **Die Nachfrage beim Lieferanten hat das widerlegt:**

    4012 (M)   US=in_stock, EU=in_stock, EU_LV, EU_ES, CA, UK, AU
    5309 (4XL) US=in_stock, EU=in_stock, EU_LV, UK
    12872 (5XL) US=in_stock          ← sonst nichts

5XL gibt es nur im US-Lager. Der Shop liefert in die Schweiz; eine 5XL-Bestellung wäre also
nicht oder nur über den Atlantik erfüllbar. Die 0 ist keine Nachlässigkeit, sondern die
Wahrheit für diesen Markt — Printful hat sie bewusst so gesetzt. Richtig ist deshalb auch hier
`DENY`: die Grösse verschwindet aus dem Verkauf, die acht lieferbaren bleiben. Der Editor
bleibt unangetastet.

Merke: Bevor man einen Lagerstand «korrigiert», fragt man den Lieferanten. Eine 0 kann ein
vergessener Wert sein — oder eine Aussage.

DRY=1 meldet nur.
"""
import json, os, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
POD_TITEL = "Unisex T-Shirt – Selbst gestalten"


def gql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}})
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json", "-d", p],
                           capture_output=True, text=True)
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


def main():
    treffer = json.load(open(os.environ.get("QUELLE", "/tmp/uebersell.json")))
    pids = sorted({t[1] for t in treffer})
    print(f"betroffene Produkte: {len(pids)}", flush=True)

    d = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title '
            'variants(first:100){nodes{id title inventoryQuantity inventoryPolicy '
            'inventoryItem{id}}}}}}', {"ids": pids})
    for n in (d.get("data") or {}).get("nodes") or []:
        if not n:
            continue
        vs = n["variants"]["nodes"]
        if n["title"].strip() == POD_TITEL:
            # Nur die leere Grösse sperren — die acht lieferbaren bleiben auf CONTINUE, damit
            # der Editor bei Druckware nie an einer Bestandszahl scheitert.
            offen = [v for v in vs
                     if (v["inventoryQuantity"] or 0) <= 0 and v["inventoryPolicy"] != "DENY"]
        else:
            offen = [v for v in vs if v["inventoryPolicy"] != "DENY"]
        leer = sum(1 for v in vs if (v["inventoryQuantity"] or 0) <= 0)
        print(f"{n['title'][:50]} — {len(offen)} von {len(vs)} Varianten auf DENY "
              f"({leer} davon aktuell leer)", flush=True)
        if DRY or not offen:
            continue
        for i in range(0, len(offen), 25):
            teil = [{"id": v["id"], "inventoryPolicy": "DENY"} for v in offen[i:i + 25]]
            r = gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate('
                    'productId:$p,variants:$v){userErrors{message}}}', {"p": n["id"], "v": teil})
            errs = ((r.get("data") or {}).get("productVariantsBulkUpdate") or {}).get("userErrors")
            if errs:
                print(f"   ⚠️ {errs[0]['message']}", flush=True)
            time.sleep(0.4)
        print("   gesetzt", flush=True)


if __name__ == "__main__":
    main()
