"""Hebt Varianten unter dem Preisboden von CHF 14.90 an — jeder Verkauf darunter ist ein Verlust.

DER BEFUND (12.08.2026): 2'632 aktive Produkte haben eine Variante unter CHF 14.90, davon
2'355 mit CJ-SKU — dort fällt China-Fracht von CHF 3–6 sicher an. 2'346 davon stehen im
Google-Kanal, werden also aktiv beworben. Bei 1'012 liegt sogar die TEUERSTE Variante unter
dem Boden: dort ist jeder Verkauf ein Verlust, egal was die Kundin wählt. 157 starten unter
CHF 5 — ein Damenkleid zu einheitlich CHF 4.90, eine Baseball-Cap zu CHF 4.90.

Verschärfend: alle sind `tracked=false` mit `inventoryPolicy=CONTINUE`, also unbegrenzt
bestellbar. Es gibt keine Bestandsgrenze, die den Schaden deckelt.

WO DER BODEN LECKTE — und es war nicht der Importer. Der rechnet
`Math.max(landed*1.4, landed+5, 14.90)` und KANN nichts Billigeres anlegen. Gesenkt hat
hinterher `google_feed/reprice_to_benchmark.py`: dessen Boden war `cur*0.60`, also ein
RELATIVER Boden. Er begrenzt, wie weit ein einzelner Schritt senkt, nicht wie tief der Preis
am Ende liegt — über mehrere Läufe sinkt er geometrisch (10.90 → 6.90 → 4.90). Das erklärt
auch die 169 Fälle aus dem August, die NACH Einführung des Bodens entstanden. Der absolute
Boden ist dort jetzt eingebaut; dieses Skript räumt auf, was bereits unten liegt.

⚠️ ANGEFASST WERDEN NUR EINZELNE VARIANTEN, nicht der Produktpreis. Bei 102 Produkten ist die
billigste «Farbe» gar kein Produkt, sondern Zubehör aus CJ-Rohtext («Memory card-8G»,
«Yellow-Without movement») — die Kamera für CHF 121.90 bewirbt sich mit «ab CHF 4.90». Auch
diese Zubehör-Varianten steigen auf den Boden; damit stimmt der Ab-Preis der Karte wieder.

⚠️ BigBuy bleibt unangetastet: dort ist der Einkaufspreis bekannt und der Versand in die
Schweiz kostet ~27 EUR — eine pauschale Anhebung auf 14.90 wäre dort sinnlos, die Ware ist
ohnehin erst ab CHF 35–40 rentabel und hat eigene Wachen.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_preisboden.txt"
BODEN = 14.90

CJ_SKU = re.compile(r'^CJ', re.I)


def gql(q, v=None):
    with open("/tmp/_pb.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_pb.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def main():
    kandidaten = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE":
            continue
        if float(p["priceRangeV2"]["minVariantPrice"]["amount"]) >= BODEN:
            continue
        skus = [(v.get("sku") or "") for v in ((p.get("variants") or {}).get("nodes") or [])]
        if not any(CJ_SKU.match(s) for s in skus):
            continue                      # nur CJ — dort ist die Fracht sicher
        kandidaten.append((p["id"], p["title"],
                           float(p["priceRangeV2"]["minVariantPrice"]["amount"]),
                           float(p["priceRangeV2"]["maxVariantPrice"]["amount"])))

    ganz = [k for k in kandidaten if k[3] < BODEN]
    print(f"CJ-Produkte unter dem Boden CHF {BODEN:.2f}: {len(kandidaten)} | "
          f"davon komplett darunter: {len(ganz)}", flush=True)
    for _, t, lo, hi in sorted(kandidaten, key=lambda x: x[2])[:10]:
        print(f"   CHF {lo:>5.2f} – {hi:>6.2f}   {t[:56]}", flush=True)
    if DRY or not kandidaten:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = varianten = 0
    for gid, titel, _, _ in kandidaten:
        if gid in done:
            continue
        d = gql('query($id:ID!){node(id:$id){... on Product{variants(first:100)'
                '{nodes{id price}}}}}', {"id": gid})
        vs = (((d.get("data") or {}).get("node") or {}).get("variants") or {}).get("nodes") or []
        hoch = [{"id": v["id"], "price": f"{BODEN:.2f}"}
                for v in vs if float(v["price"]) < BODEN]
        if not hoch:
            f.write(f"{gid}\tnichts-zu-tun\n")
            continue
        r = gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){'
                'productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{message}}}',
                {"p": gid, "v": hoch})
        e = ((r.get("data") or {}).get("productVariantsBulkUpdate") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ {titel[:36]}: {e[0]['message'][:60]}", flush=True)
            continue
        n += 1
        varianten += len(hoch)
        f.write(f"{gid}\t{len(hoch)}\t{titel}\n")
        if n % 100 == 0:
            f.flush()
            print(f"  … {n}/{len(kandidaten)} Produkte, {varianten} Varianten", flush=True)
        time.sleep(0.3)
    f.flush()
    print(f"FERTIG: {n} Produkte, {varianten} Varianten auf CHF {BODEN:.2f} gehoben")


if __name__ == "__main__":
    main()
