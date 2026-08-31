#!/usr/bin/env python3
"""Rotiert die MANUAL-Kollektion `bestseller` taeglich deterministisch.

Grund (31.08.): Betreiber — «bestseller immernoch die gleichen produkten».
Die Kollektion ist handkuratiert (18 aktive Bewertungssieger) und MANUAL;
die Startseiten-Reihe zeigt die ersten 12 — also jeden Tag dieselben.
Diese Rotation mischt die AKTIVEN Produkte mit einem Datums-Seed
(zlib.crc32 — hash() ist je Prozess zufaellig, Lehre 28.08.) und schiebt
Entwuerfe ans Ende. Gleicher Tag → gleiche Ordnung (idempotent), neuer Tag
→ andere ersten 12. Es wird NICHTS entfernt oder gedraftet, nur sortiert.
"""
import json, random, sys, time, urllib.request, zlib

SHOP = "au3j0y-hq.myshopify.com"
HANDLE = "bestseller"

def token():
    return open("/tmp/cj_shop_token.txt").read().strip()

def gql(q, v=None, versuche=6):
    body = json.dumps({"query": q, "variables": v or {}}).encode()
    for i in range(versuche):
        try:
            req = urllib.request.Request(
                f"https://{SHOP}/admin/api/2024-10/graphql.json", data=body,
                headers={"X-Shopify-Access-Token": token(), "Content-Type": "application/json"})
            d = json.load(urllib.request.urlopen(req, timeout=30))
        except Exception as e:
            time.sleep(2 * (i + 1)); continue
        if d.get("errors"):
            msg = json.dumps(d["errors"])
            if "Throttled" in msg:
                time.sleep(3 * (i + 1)); continue
            print("GraphQL-Fehler:", msg[:300]); sys.exit(1)
        return d["data"]
    print("PAUSE (Shopify blieb stumm)"); sys.exit(2)

d = gql('{ collectionByHandle(handle:"%s"){ id sortOrder products(first:100){nodes{id status}} } }' % HANDLE)
c = d["collectionByHandle"]
if not c or c["sortOrder"] != "MANUAL":
    print("FERTIG. Kollektion fehlt oder nicht MANUAL — nichts zu tun."); sys.exit(0)

nodes = c["products"]["nodes"]
aktive = [p["id"] for p in nodes if p["status"] == "ACTIVE"]
rest   = [p["id"] for p in nodes if p["status"] != "ACTIVE"]
if len(aktive) < 3:
    print("FERTIG. Zu wenige aktive Produkte (%d) — keine Rotation." % len(aktive)); sys.exit(0)

heute = time.strftime("%Y-%m-%d")
rnd = random.Random(zlib.crc32(heute.encode()))
rnd.shuffle(aktive)
ziel = aktive + rest  # Entwuerfe ans Ende — die Reihe zeigt nur Aktive, aber sauber ist sauber

moves = [{"id": pid, "newPosition": str(i)} for i, pid in enumerate(ziel)]
r = gql("""mutation($id:ID!,$moves:[MoveInput!]!){
  collectionReorderProducts(id:$id, moves:$moves){ job{id} userErrors{field message} } }""",
        {"id": c["id"], "moves": moves})
err = r["collectionReorderProducts"]["userErrors"]
if err:
    print("Fehler:", err); sys.exit(1)
print("FERTIG. %d Produkte rotiert (Seed %s), Job %s" % (
    len(ziel), heute, (r["collectionReorderProducts"].get("job") or {}).get("id", "?")))
