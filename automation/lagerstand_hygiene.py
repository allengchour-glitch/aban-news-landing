"""Räumt widersprüchliche Lagerstände auf.

ANLASS (Sauber-Lauf 2026-08-10): Fünf aktive Produkte melden Bestand 0. Sie zerfallen in
zwei völlig verschiedene Fälle, die man nicht gleich behandeln darf:

 A) DENY + 0 + tracked  → das Produkt ist im Shop sichtbar, aber NICHT kaufbar
    («Ausverkauft»-Knopf). Für Kunden und Google ist das eine tote Seite. Solche Artikel
    gehören auf DRAFT, bis der Lieferant wieder liefert — nicht gelöscht, damit die
    Historie und die URL erhalten bleiben (dieselbe Regel wie beim Duplikate-Handling).

 B) CONTINUE + 0 + tracked → kaufbar, aber die Bestandsverfolgung ist sinnlos
    eingeschaltet. Bei Dropship/Print-on-Demand gibt es kein eigenes Lager; die Zählung
    steht dauerhaft auf 0 und meldet Google widersprüchliche Verfügbarkeit. Hier wird
    lediglich `tracked` abgeschaltet — am Kaufverhalten ändert sich nichts.

Der Unterschied ist wichtig: Fall B einfach mitzudraften würde den Editor («Selbst
gestalten») aus dem Shop nehmen — laut Projektregel ein heiliger Bereich.

DRY=1 meldet nur.
"""
import json, os, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_lagerstand_hygiene.txt"


def gql(q, v=None):
    with open("/tmp/_lh.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_lh.json"], capture_output=True, text=True)
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
    d = gql('{products(first:100,query:"status:ACTIVE AND inventory_total:0"){nodes{'
            'id title variants(first:100){nodes{id inventoryPolicy '
            'inventoryItem{id tracked}}}}}}')
    nodes = ((d.get("data") or {}).get("products") or {}).get("nodes") or []
    print(f"aktive Produkte mit Bestand 0: {len(nodes)}", flush=True)
    f = open(LEDGER, "a")
    gedraftet = entkoppelt = 0
    for p in nodes:
        vs = p["variants"]["nodes"]
        blockiert = [v for v in vs if v["inventoryPolicy"] == "DENY"
                     and v["inventoryItem"]["tracked"]]
        if blockiert and len(blockiert) == len(vs):
            # Fall A: kein einziger Variantenkauf möglich -> aus dem Schaufenster nehmen.
            gedraftet += 1
            print(f"  ⛔ DRAFT (nicht kaufbar): {p['title'][:52]}", flush=True)
            if not DRY:
                gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                    {"i": {"id": p["id"], "status": "DRAFT"}})
                # tagsAdd statt tags im ProductInput: letzteres ERSETZT die Liste und
                # würde Kategorie-/Kollektions-Tags mitreissen.
                gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t)'
                    '{userErrors{message}}}',
                    {"id": p["id"], "t": ["ausverkauft-lieferant"]})
                f.write(f"{p['id']}\tdraft-ausverkauft\t{p['title']}\n"); f.flush()
            continue
        # Fall B: kaufbar (CONTINUE) -> nur die sinnlose Bestandsverfolgung abschalten.
        falsch = [v for v in vs if v["inventoryItem"]["tracked"]
                  and v["inventoryPolicy"] == "CONTINUE"]
        if not falsch:
            continue
        entkoppelt += len(falsch)
        print(f"  🔧 {len(falsch)} Variante(n) entkoppeln: {p['title'][:46]}", flush=True)
        if DRY:
            continue
        for v in falsch:
            gql('mutation($id:ID!,$in:InventoryItemInput!){inventoryItemUpdate(id:$id,input:$in)'
                '{userErrors{message}}}',
                {"id": v["inventoryItem"]["id"], "in": {"tracked": False}})
            time.sleep(0.2)
        f.write(f"{p['id']}\tuntracked:{len(falsch)}\t{p['title']}\n"); f.flush()
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {gedraftet} gedraftet, "
          f"{entkoppelt} Varianten entkoppelt")


if __name__ == "__main__":
    main()
