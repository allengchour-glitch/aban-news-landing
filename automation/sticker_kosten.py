#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""sticker_kosten.py — trägt den Einkaufspreis der POD-Sticker nach.

WARUM DAS KEINE SCHÄTZUNG IST: Die Variantennummer HINTER dem Unterstrich ist die
Printful-Variante, und sie ist bei allen Sticker-Produkten dieselbe:
    3424232_10163  «Kiss-Cut Aufkleber – Selbst gestalten»  → Kosten CHF 1.99  (gepflegt)
    9000001_10163  «Schweiz-Sticker Matterhorn»             → Kosten fehlte
Der Teil vor dem Unterstrich ist nur die Shopify-seitige Produktnummer; `printful_sync.mjs`
liest ausschliesslich die Zahl dahinter und druckt das Motiv aus dem Metafeld
`custom.print_file`. Gleiche Printful-Variante heisst also derselbe Einkaufspreis — das ist
eine abgelesene Tatsache, keine Hochrechnung.

WOFÜR: Ohne Einkaufspreis weiss niemand, ob ein Verkauf Gewinn bringt (Eintrag 20.08.2026).
Bei CHF 4.90 für einen Sticker ist das die entscheidende Zahl: 4.90 − 1.99 = 2.91 vor
Versand. Printful produziert und versendet selbst, es fällt also KEINE China-Fracht an —
diese Ware folgt einer ganz anderen Kostenlogik als der CJ-Katalog.

⚠️ Es werden NUR Varianten angefasst, deren Printful-Nummer in der Tabelle steht und die
noch KEINEN Einkaufspreis tragen. Ein vorhandener Wert wird nie überschrieben.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
LEDGER = "dropship/_sticker_kosten.txt"
DRY = os.environ.get("DRY") == "1"

# Printful-Variante → Einkaufspreis CHF, abgelesen am gepflegten Editor-Produkt 3424232_*.
KOSTEN = {"10163": "1.99", "10164": "1.99", "10165": "2.19", "16362": "4.98"}


def gql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}})
    for i in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json", "-d", p],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
            if "THROTTL" in json.dumps(d.get("errors") or "").upper():
                time.sleep(4 + i * 3); continue
            if d.get("errors"):
                print("  GraphQL-Fehler:", json.dumps(d["errors"])[:180]); return None
        except Exception:
            pass
        time.sleep(3 + i * 2)
    return None


def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}
    cur, offen, hatte, unbekannt = None, [], 0, set()
    while True:
        d = gql('query($c:String){products(first:50,after:$c,query:"status:active '
                'product_type:Sticker"){pageInfo{hasNextPage endCursor} nodes{id title '
                'variants(first:20){nodes{id sku inventoryItem{unitCost{amount}}}}}}}',
                {"c": cur})
        if d is None:
            print("PAUSE (Shopify antwortet nicht) — nichts geschrieben")
            return
        pg = d["data"]["products"]
        for p in pg["nodes"]:
            if p["id"] in erledigt:
                continue
            ein = []
            for v in p["variants"]["nodes"]:
                if v["inventoryItem"].get("unitCost"):
                    hatte += 1
                    continue
                m = re.match(r'^\d{6,}_(\d+)$', v["sku"] or "")
                if not m:
                    continue
                c = KOSTEN.get(m.group(1))
                if not c:
                    unbekannt.add(m.group(1))
                    continue
                ein.append({"id": v["id"], "inventoryItem": {"cost": c}})
            if ein:
                offen.append((p["id"], p["title"], ein))
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
        time.sleep(0.5)

    print(f"{len(offen)} Produkte ohne Einkaufspreis · {hatte} Varianten hatten schon einen")
    if unbekannt:
        print(f"  ⚠️ Printful-Varianten ohne Tabelleneintrag (NICHT angefasst): "
              f"{', '.join(sorted(unbekannt))}")
    if DRY:
        for pid, t, ein in offen[:6]:
            print(f"   {t[:52]:52} {[e['inventoryItem']['cost'] for e in ein]}")
        print("(DRY=1 — nichts geschrieben)")
        print("FERTIG")
        return

    n = 0
    for pid, t, ein in offen:
        r = gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){'
                'productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{message}}}',
                {"p": pid, "v": ein})
        f = (((r or {}).get("data") or {}).get("productVariantsBulkUpdate") or {}).get("userErrors")
        if r is None or f is None or f:
            print(f"   ⚠️ {t[:44]} — {json.dumps(f)[:70] if f else 'keine Antwort'}")
            time.sleep(1); continue
        with open(LEDGER, "a") as fh:
            fh.write(f"{pid}\t{len(ein)} Varianten\t{t[:60]}\n")
        n += 1
        time.sleep(0.4)
    print(f"\n{n} Produkte mit Einkaufspreis")
    print("FERTIG")


if __name__ == "__main__":
    main()
