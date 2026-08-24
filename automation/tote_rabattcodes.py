#!/usr/bin/env python3
"""Findet Rabattcodes, die auf VERÖFFENTLICHTEN Seiten/Blogartikeln beworben werden,
obwohl sie im Shop abgelaufen sind.

Warum das ein eigener Wächter ist (20.08.2026): Der Vatertags-Code PAPA25 lief am 8. Juni
ab. Zweieinhalb Monate später bewarben ihn immer noch FÜNF veröffentlichte Seiten — darunter
drei zeitlose Ratgeber («Saphirglas vs. Mineralglas», «Echtleder vs. Kunstleder»), die über
Google dauerhaft Besucher bringen. Wer den Code an der Kasse eingibt, bekommt eine
Fehlermeldung: ein Kaufabbruch, den niemand je bemerkt hätte.
**Eine Aktion endet nicht mit dem Rabattcode — sie endet erst, wenn kein Text sie mehr bewirbt.**

Meldet nur, ändert nichts (der Ersatztext braucht eine Entscheidung: welcher Code passt?).
"""
import json, os, subprocess, sys

SHOP = "au3j0y-hq.myshopify.com"
TOK = os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read().strip()


def gql(q, v=None):
    with open("/tmp/_trc.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_trc.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
        except Exception:
            pass
    return {}


def alle(art, feld):
    """Alle Seiten/Artikel, paginiert. Ohne das liest der Waechter nur die ersten 100."""
    cur, raus = None, []
    while True:
        nach = ', after:"%s"' % cur if cur else ""
        d = gql("query{ %s(first:100%s){ nodes{ handle isPublished body } "
                "pageInfo{ hasNextPage endCursor } } }" % (art, nach))
        blk = d.get("data", {}).get(feld, {}) or {}
        raus.extend(blk.get("nodes", []) or [])
        pi = blk.get("pageInfo") or {}
        if not pi.get("hasNextPage"):
            return raus
        cur = pi.get("endCursor")
        if not cur:
            return raus

def main():
    d = gql("""query{ codeDiscountNodes(first:100){ nodes{ codeDiscount{
             ... on DiscountCodeBasic { title status codes(first:5){ nodes{ code } } }
             ... on DiscountCodeBxgy  { title status codes(first:5){ nodes{ code } } }
             ... on DiscountCodeFreeShipping { title status codes(first:5){ nodes{ code } } } } } } }""")
    tot = {}
    for n in d.get("data", {}).get("codeDiscountNodes", {}).get("nodes", []):
        c = n.get("codeDiscount") or {}
        if c.get("status") in ("EXPIRED",):
            for x in (c.get("codes") or {}).get("nodes", []):
                # Sehr kurze Codes würden in normalem Text zufällig treffen.
                if len(x["code"]) >= 5:
                    tot[x["code"]] = c.get("title") or ""
    if not tot:
        print("FERTIG: keine abgelaufenen Codes im Shop.")
        return
    print(f"Abgelaufene Codes: {', '.join(sorted(tot))}")

    funde = []
    for art, feld in (("pages", "pages"), ("articles", "articles")):
        # ⚠️ 24.08.2026: Stand hier ohne Paginierung als `first:100`. Der Shop hat 221
        # Seiten — `faq-luxestyle` steht auf Platz 105, also hat dieser Waechter 121 Seiten
        # NIE gesehen, und genau dort stand der abgelaufene Code LAUNCH30. Ein Waechter, der
        # nur den Anfang der Liste liest, meldet «0 Fundstellen» und sieht dabei gesund aus.
        for n in alle(art, feld):
            if not n.get("isPublished"):
                continue
            for code in tot:
                if code in (n.get("body") or ""):
                    funde.append((art, n["handle"], code))
    for art, h, code in funde:
        print(f"  ⚠️ {art[:-1]} /{h} bewirbt den abgelaufenen Code {code}")
    print(f"FERTIG: {len(funde)} Fundstelle(n).")
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
