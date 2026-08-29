#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""kosten_export_bauen — Bulk-Export mit Preis, Einkaufspreis und Gewicht je Variante.

WARUM ALS REPO-SKRIPT: `kosten_boden15_korrigieren.py` braucht diesen Export, und er lag
zuerst nur als Wegwerf-Skript in /tmp. Der Snapshot-Rewind hat ihn prompt entfernt — und
damit die ganze Korrektur blockiert. Ein Werkzeug, das nicht committet ist, existiert nicht
(dieselbe Lehre wie beim Social-Autopilot und beim Auto-Committer).

Schreibt /tmp/kost28.jsonl. Läuft nur, wenn die Datei fehlt oder älter als MAXALTER ist —
ein Bulk-Export über 460'000 Zeilen ist nichts, was man stündlich wiederholt.

⚠️ Das Feld `price` ist PFLICHT. Ohne es bricht der Korrekturlauf mit KeyError ab; das war
   der erste Fehlversuch am 29.08. Die Felderliste hier muss zu dem passen, was der
   Korrekturlauf liest — beide Stellen gehören zusammen gelesen, wenn eine sich ändert.

⚠️ Eine laufende Bulk-Operation wird abgebrochen. Shopify erlaubt nur EINE gleichzeitig und
   weist die neue sonst ab — der Lauf sähe dann aus, als wäre er gescheitert.
"""
import json
import os
import subprocess
import sys
import time

SHOP = "au3j0y-hq.myshopify.com"
ZIEL = os.environ.get("ZIEL", "/tmp/kost28.jsonl")
MAXALTER = int(os.environ.get("MAXALTER", "86400"))
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BULK = ('{ products(query:"status:active") { edges { node { id title '
        'variants { edges { node { id sku price '
        'inventoryItem { id unitCost { amount } '
        'measurement { weight { value unit } } } } } } } } } }')


def tok():
    p = "/tmp/cj_shop_token.txt"
    if not (os.path.exists(p) and open(p).read().strip()):
        subprocess.run(["bash", os.path.join(REPO, "automation", "shop_token_refresh.sh")],
                       capture_output=True)
    return open(p).read().strip()


def gql(q, v=None):
    with open("/tmp/_keb.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    r = subprocess.run(["curl", "-s", "--max-time", "90",
                        f"https://{SHOP}/admin/api/2024-10/graphql.json",
                        "-H", "X-Shopify-Access-Token: " + tok(),
                        "-H", "Content-Type: application/json",
                        "--data-binary", "@/tmp/_keb.json"], capture_output=True, text=True)
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
