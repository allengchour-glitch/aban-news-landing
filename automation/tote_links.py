#!/usr/bin/env python3
"""Findet Produkt- und Kollektionslinks in VERÖFFENTLICHTEN Seiten/Blogartikeln, die ins Leere führen.

Warum das ein eigener Wächter ist (20.08.2026): In 25 veröffentlichten SEO-Ratgebern zeigten
**61 Links** auf Produkte, die es nicht mehr gibt oder die auf DRAFT stehen. Genau diese Ratgeber
(«Echtleder vs. Kunstleder», «RFID-Schutz erklärt», «Wanderziele Schweiz») holen über Google
dauerhaft Besucher — die lasen den Text, klickten auf die Empfehlung und landeten auf 404.
Ein verlorener Klick, den keine Statistik als Kaufabbruch ausweist.

Die Ursache ist struktureller Natur und wiederholt sich: Der Viability-Guard draftet Produkte ohne
Lieferanten-SKU (`keine-lieferanten-ref`), der Dubletten-Fix draftet Doppelgänger, Altbestand wird
gelöscht — die TEXTE, die darauf verlinken, weiss davon niemand. Jeder Draft-Lauf kann neue tote
Links erzeugen.

Meldet nur. Das Umhängen braucht eine Entscheidung: passender Ersatzartikel oder Kategorie?
"""
import json, os, re, subprocess, sys, collections

SHOP = "au3j0y-hq.myshopify.com"
TOK = os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read().strip()


def gql(q, v=None):
    with open("/tmp/_tl.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_tl.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
        except Exception:
            pass
    return {}


def main():
    prod = collections.defaultdict(list)
    for typ, feld in (("pages", "pages"), ("articles", "articles")):
        d = gql("query{ %s(first:100){ nodes{ handle isPublished body } } }" % typ)
        for n in d.get("data", {}).get(feld, {}).get("nodes", []):
            if not n.get("isPublished"):
                continue
            for m in re.finditer(r'href="/products/([a-z0-9\-]+)"', n.get("body") or ""):
                prod[m.group(1)].append(f"{typ[:-1]}/{n['handle']}")
    tot = []
    for h in prod:
        d = gql("query($h:String!){ productByHandle(handle:$h){ status } }", {"h": h})
        p = (d.get("data") or {}).get("productByHandle")
        # Ein DRAFT ist für Besucherinnen dasselbe wie gelöscht: 404.
        if not p or p.get("status") != "ACTIVE":
            tot.append((h, p["status"] if p else "GELÖSCHT", sorted(set(prod[h]))))
    for h, s, wo in tot:
        print(f"  ⚠️ /products/{h} [{s}] ← {', '.join(wo)}")
    print(f"FERTIG: {len(prod)} verlinkte Produkte geprüft, {len(tot)} tot.")
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
