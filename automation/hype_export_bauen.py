#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""hype_export_bauen — Bulk-Export mit genau den Feldern, die hype_kuratieren.py liest.

WARUM: /tmp/export.jsonl stammt aus fruehen Sessions und ueberlebt weder Wipe noch Rewind.
Ohne ihn kann die betreute Hype-Runde keine Kandidaten sehen. Dieses Skript baut ihn neu —
gleiche Mechanik wie kosten_export_bauen.py (eine Bulk-Operation, kein Punkte-Fresser).

Felder = Vertrag mit hype_kuratieren.py: status, title, tags, productType, mediaCount.count,
priceRangeV2.minVariantPrice.amount, g (Google-Kanal). Wer dort liest, aendert hier mit.
"""
import json, os, subprocess, sys, time

SHOP = "au3j0y-hq.myshopify.com"
ZIEL = os.environ.get("ZIEL", "/tmp/export.jsonl")
MAXALTER = int(os.environ.get("MAXALTER", "86400"))
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BULK = ('{ products(query:"status:active") { edges { node { id title status tags productType '
        'g:publishedOnPublication(publicationId:"gid://shopify/Publication/302872297857") '
        'mediaCount { count } '
        'priceRangeV2 { minVariantPrice { amount } } } } } }')


def tok():
    p = "/tmp/cj_shop_token.txt"
    if not (os.path.exists(p) and open(p).read().strip()):
        subprocess.run(["bash", os.path.join(REPO, "automation", "shop_token_refresh.sh")],
                       capture_output=True)
    return open(p).read().strip()


def gql(q, v=None):
    with open("/tmp/_heb.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    r = subprocess.run(["curl", "-s", "--max-time", "90",
                        f"https://{SHOP}/admin/api/2024-10/graphql.json",
                        "-H", "X-Shopify-Access-Token: " + tok(),
                        "-H", "Content-Type: application/json",
                        "--data-binary", "@/tmp/_heb.json"], capture_output=True, text=True)
    try:
        d = json.loads(r.stdout)
    except Exception:
        return {}
    if d.get("errors"):
        print("   ⚠️ Shopify:", json.dumps(d["errors"])[:180])
    return d


def main():
    if os.path.exists(ZIEL):
        alter = time.time() - os.path.getmtime(ZIEL)
        if alter < MAXALTER:
            print(f"FERTIG: {ZIEL} ist {int(alter/3600)} h alt — kein neuer Export nötig")
            return
    cur = gql('{currentBulkOperation{id status}}')
    c = (cur.get("data") or {}).get("currentBulkOperation") or {}
    if c.get("status") in ("RUNNING", "CREATED"):
        print(f"   laufende Bulk-Operation ({c['status']}) → abbrechen")
        gql('mutation($id:ID!){bulkOperationCancel(id:$id){userErrors{message}}}', {"id": c["id"]})
        time.sleep(8)
    r = gql('mutation($q:String!){bulkOperationRunQuery(query:$q)'
            '{bulkOperation{id} userErrors{field message}}}', {"q": BULK})
    ue = ((r.get("data") or {}).get("bulkOperationRunQuery") or {}).get("userErrors") or []
    if ue:
        print("PAUSE: Export nicht gestartet —", str(ue)[:160])
        return
    for i in range(160):
        time.sleep(15)
        d = gql('{currentBulkOperation{status objectCount url errorCode}}')
        o = (d.get("data") or {}).get("currentBulkOperation") or {}
        if o.get("status") == "COMPLETED":
            if not o.get("url"):
                print("PAUSE: fertig, aber ohne URL")
                return
            subprocess.run(["curl", "-sL", "--max-time", "600", "-o", ZIEL, o["url"]])
            n = sum(1 for _ in open(ZIEL))
            print(f"FERTIG: {ZIEL} — {os.path.getsize(ZIEL)} Bytes, {n} Zeilen")
            return
        if o.get("status") in ("FAILED", "CANCELED"):
            print(f"PAUSE: Export {o.get('status')} {o.get('errorCode') or ''}")
            return
    print("PAUSE: Export nicht innerhalb der Wartezeit fertig")


if __name__ == "__main__":
    sys.exit(main())
