#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""sticker_stueckzahl.py — schreibt die Stückzahl in Sticker-Titel.

BETREIBER-AUFTRAG 22.08.2026: «die sticker anzahl schreiben, die sind teuer wenn nur 1 stk».

DAS PROBLEM: 264 aktive Sticker stehen mit CHF 4.90 bis 7.90 im Shop, und in KEINEM Titel
steht, wie viele man dafür bekommt. Es ist je EIN Kiss-Cut-Aufkleber (Printful, drei Grössen
als Varianten: 7,6 cm 4.90 · 10 cm 5.90 · 14 cm 7.90). Ohne Angabe muss die Kundin raten —
und ein Preis, den man raten muss, wirkt teuer. Das ist dieselbe Klasse wie die
Multipack-Regel vom 26.07.2026 («Beutel à 100 Stück»), nur andersherum: dort verschwieg der
Titel, dass man VIELE bekommt, hier verschweigt er, dass es EINES ist.

BELEGT, NICHT ANGENOMMEN: Die Beschreibungen wurden vollständig nach «Bogen», «Sheet»,
«Set», «Pack» und «Stück» durchsucht. Kein einziger Treffer ist echt — die neun «set»-Funde
stecken in «Head**set**» und «Sun**set**». (Vierte Substring-Falle des Tages nach led/ski/auto.)

⚠️ «Stickerei» IST KEIN STICKER. Eine Titelsuche nach `sticker` findet 501 Produkte, davon
sind 216 bestickte Kleidung («Boho-Jacke · Blüten-Stickerei»). Die dürfen nie angefasst werden.

DRY=1 zeigt die geplanten Titel, ohne etwas zu ändern.
"""
import json, os, re, subprocess, time

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
LEDGER = "dropship/_sticker_stueckzahl.txt"
DRY = os.environ.get("DRY") == "1"
GRENZE = 255                      # Shopify-Titelgrenze, mit Reserve

STICKER = re.compile(r'sticker|aufkleber|decal', re.I)
STICKEREI = re.compile(r'stickerei|bestickt|besticken|stickmuster', re.I)
HAT_ZAHL = re.compile(r'·\s*\d+\s*(?:St[üu]ck|Stk|Blatt)', re.I)
# Nur AUSFORMULIERTE Mengen zählen. «5D», «3D», «PS5», «24 Designs» sind keine Stückzahlen —
# «PS5 Controller Sticker (24 Designs)» meint die Auswahl, nicht den Lieferumfang.
MENGE = re.compile(r'\b(\d{1,4})\s*(?:er[- ])?(?:St[üu]ck|Stk\b|Blatt|Bl[äa]tter)', re.I)


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


def einzelsticker(p):
    """Printful-Kiss-Cut: je ein Aufkleber, drei Grössen als Varianten."""
    sku = ((p.get("variants") or {}).get("nodes") or [{}])[0].get("sku") or ""
    return sku.startswith("9000001") and "kiss-cut" in (p.get("description") or "").lower()


def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}

    cur, kandidaten, uebersprungen = None, [], {}
    while True:
        d = gql('query($c:String){products(first:50,after:$c,query:"status:active '
                '(title:*sticker* OR title:*aufkleber* OR product_type:Sticker)")'
                '{pageInfo{hasNextPage endCursor} nodes{id title productType description '
                'variants(first:1){nodes{sku}}}}}', {"c": cur})
        if d is None:
            # ⚠️ Ausgefallene Abfrage ist kein Ergebnis — sonst gilt ein Netzproblem als
            # «keine weiteren Sticker» und der Lauf meldet fälschlich Vollzug.
            print("PAUSE (Shopify antwortet nicht) — nichts geändert")
            return
        pg = d["data"]["products"]
        for p in pg["nodes"]:
            t = p["title"]
            if STICKEREI.search(t):
                uebersprungen["Stickerei/bestickt"] = uebersprungen.get("Stickerei/bestickt", 0) + 1
                continue
            if not (STICKER.search(t) or p.get("productType") == "Sticker"):
                continue
            if HAT_ZAHL.search(t):
                uebersprungen["Titel nennt die Zahl schon"] = \
                    uebersprungen.get("Titel nennt die Zahl schon", 0) + 1
                continue
            if p["id"] in erledigt:
                continue
            if einzelsticker(p):
                n = 1
            else:
                m = MENGE.search(p.get("description") or "")
                if not m:
                    uebersprungen["Stückzahl steht nirgends"] = \
                        uebersprungen.get("Stückzahl steht nirgends", 0) + 1
                    continue
                n = int(m.group(1))
            neu = f"{t} · {n} Stück"
            if len(neu) > GRENZE:
                uebersprungen["Titel zu lang"] = uebersprungen.get("Titel zu lang", 0) + 1
                continue
            kandidaten.append((p["id"], t, neu, n))
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
        time.sleep(0.6)

    for grund, n in sorted(uebersprungen.items(), key=lambda x: -x[1]):
        print(f"  bleibt unverändert – {grund}: {n}")
    print(f"\n{len(kandidaten)} Titel bekommen die Stückzahl:")
    for _, alt, neu, _ in kandidaten[:12]:
        print(f"   {alt[:52]:52} → {neu[-14:]}")
    if len(kandidaten) > 12:
        print(f"   … und {len(kandidaten)-12} weitere")

    if DRY:
        print("\n(DRY=1 — nichts geändert)")
        print("FERTIG")
        return

    n = 0
    for pid, alt, neu, stk in kandidaten:
        # ⚠️ NUR den Titel setzen. `productUpdate` mit `tags:` würde die komplette Tag-Liste
        # ersetzen (Lehre 20.08.2026) — hier wird `tags` deshalb gar nicht erst mitgeschickt.
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{id}'
                'userErrors{message}}}', {"i": {"id": pid, "title": neu}})
        fehler = (((r or {}).get("data") or {}).get("productUpdate") or {}).get("userErrors")
        if r is None or fehler is None or fehler:
            print(f"   ⚠️ {alt[:44]} — {json.dumps(fehler)[:70] if fehler else 'keine Antwort'}")
            time.sleep(1); continue
        with open(LEDGER, "a") as f:
            f.write(f"{pid}\t{stk} Stück\t{neu[:70]}\n")
        n += 1
        time.sleep(0.4)
    print(f"\n{n} Titel ergänzt")
    print("FERTIG")


if __name__ == "__main__":
    main()
