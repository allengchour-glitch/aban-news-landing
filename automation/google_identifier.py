"""Sagt Google, dass die Dropship-Ware keine Herstellerkennung hat — für alle, denen sie fehlt.

DER BEFUND: Von 28'705 aktiven Produkten im Google-Kanal tragen `gtin`, `mpn`, `brand` und
`identifier_exists` allesamt NULL Werte, und `custom_product` — Shopifys Feld für «hat keine
Herstellerkennung» — steht bei 956, also bei 3 %. Für die restlichen 27'749 wartet Merchant auf
eine Nummer, die es nie geben wird: CJ-Ware hat keine EAN und keine MPN. Ein Eintrag ohne
Kennung und ohne die Angabe «hat keine» gilt als unvollständig und wird schlechter zugeordnet.

Google ist der einzige Kanal mit belegten Verkäufen (52 Klicks, +206 %, praktisch alles
organisch). Was dort die Zuordnung verbessert, ist unmittelbar Geld.

⚠️ NICHT PAUSCHAL SETZEN. Die Live-Stichprobe über 300 Produkte fand vier mit echtem Barcode —
«Armband Cleopatra» 8003558752003, «Plüsch Eule» 4028667185553: Fortura-Ware mit EAN. Für die
wäre «hat keine Kennung» eine Falschaussage gegenüber Google, und sie würde die bessere
Zuordnung verschenken, die eine echte EAN bringt. Der Barcode wird deshalb je Produkt LIVE
gelesen, nicht aus dem Export — der Export führt das Feld gar nicht mit, und genau daran
scheitert die bequeme Variante.

⚠️ UND DIE QUELLE GLEICH MIT. Das ist die Lehre, die an diesem Katalog dreimal Geld gekostet
hat: `condition` fehlte nach dem Backfill am nächsten Tag wieder bei allen Neuimporten,
`google_product_category` fiel von 87 % auf 0 % zurück. Zu jedem Nachfüllen gehört die Frage,
wer das Feld beim NÄCHSTEN Produkt schreibt. Hier: `cj_category_fill.mjs`, gleicher Commit.

DRY=1 meldet nur.
"""
import json, os, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_google_identifier.txt"
# metafieldsSet nimmt hart 25 Einträge je Aufruf. Mehr wird nicht abgelehnt, sondern
# stillschweigend gekürzt — deshalb die Blockgrösse hier und nicht irgendwo im Aufruf.
BLOCK = 25


def gql(q, v=None):
    with open("/tmp/_gi.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_gi.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def main():
    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}

    offen = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p.get("status") != "ACTIVE" or not p.get("g"):
            continue
        mf = {m["key"]: m["value"] for m in (p.get("mf") or {}).get("nodes", [])}
        if (mf.get("custom_product") or "").lower() == "true" or mf.get("gtin"):
            continue
        if p["id"] in done:
            continue
        offen.append(p["id"])

    print(f"ohne Kennung und ohne «hat keine»: {len(offen)}", flush=True)
    if DRY:
        print("   (DRY — es wird nichts geschrieben)", flush=True)
        return

    f = open(LEDGER, "a")
    gesetzt = mit_ean = 0
    for i in range(0, len(offen), BLOCK):
        teil = offen[i:i + BLOCK]
        # Barcode LIVE lesen — der Export führt ihn nicht mit.
        d = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id status '
                'variants(first:10){nodes{barcode}}}}}', {"ids": teil})
        knoten = [n for n in ((d.get("data") or {}).get("nodes") or []) if n]
        ohne = []
        for n in knoten:
            if n.get("status") != "ACTIVE":
                continue
            hat_ean = any((v.get("barcode") or "").strip()
                          for v in (n.get("variants") or {}).get("nodes", []))
            if hat_ean:
                mit_ean += 1
                f.write(f"{n['id']}\tean-vorhanden\t-\n")
                continue
            ohne.append(n["id"])
        if ohne:
            r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m)'
                    '{userErrors{message}}}',
                    {"m": [{"ownerId": g, "namespace": "mm-google-shopping",
                            "key": "custom_product", "value": "true",
                            # ⚠️ `boolean`, NICHT `single_line_text_field`. Für den Schlüssel
                            # besteht im Shop schon eine Definition, und Shopify lehnt jeden
                            # abweichenden Typ ab — der erste Lauf scheiterte genau daran
                            # («must be consistent with the definition's»). Vorhandene
                            # Definitionen vor dem Schreiben abfragen, nicht raten.
                            "type": "boolean"} for g in ohne]})
            fehler = ((r.get("data") or {}).get("metafieldsSet") or {}).get("userErrors")
            if fehler:
                print(f"  ⚠️ {fehler[0]['message'][:70]}", flush=True)
                continue
            for g in ohne:
                f.write(f"{g}\tcustom_product\ttrue\n")
            gesetzt += len(ohne)
        f.flush()
        if gesetzt and gesetzt % 500 < BLOCK:
            print(f"   {gesetzt} gesetzt · {mit_ean} mit echter EAN ausgelassen", flush=True)
        time.sleep(0.4)
    print(f"FERTIG: {gesetzt} als «ohne Herstellerkennung» gekennzeichnet, "
          f"{mit_ean} mit echter EAN unangetastet")


if __name__ == "__main__":
    main()
