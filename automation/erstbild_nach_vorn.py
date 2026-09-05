#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""erstbild_nach_vorn.py — holt EIN Bild eines Produkts an die erste Stelle (productReorderMedia)
und quittiert es im Ledger dropship/_hauptbild_umsortiert.txt.

WOFÜR: Die Kontaktbogen-Methode (21.08./31.08./03.09.2026): Erst ANSEHEN, dann umsortieren.
CJ-Erstbilder sind oft Massgrafiken, Collagen oder englische Infografiken; meist ist ein
sauberes Foto weiter hinten im Bildsatz. Kein neues Bild wird hochgeladen (Datei-Speicher voll,
Lehre 02.09.) — nur die Reihenfolge ändert sich. Umkehrbar über dieselbe Mutation.

Nutzung: python3 automation/erstbild_nach_vorn.py <product-gid-oder-id> <media-position 1..n> <grund>
         position = 1-basierte Position im AKTUELLEN Bildsatz (wie im Kontaktbogen nummeriert).
         Position 1 = nichts zu tun (Quittung «bleibt»).
"""
import json, os, sys, time, urllib.request

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
LEDGER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dropship", "_hauptbild_umsortiert.txt")


def gql(q, v=None):
    for i in range(8):
        req = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json",
                                     data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                     headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
        try:
            d = json.load(urllib.request.urlopen(req, timeout=60))
        except Exception:
            time.sleep(2 + 2 * i); continue
        if d.get("data") is not None:
            return d
        time.sleep(2 + 2 * i)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def main():
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(2)
    pid, pos, grund = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    gid = pid if pid.startswith("gid://") else f"gid://shopify/Product/{pid}"
    d = gql('query($id:ID!){product(id:$id){id title media(first:30){nodes{id mediaContentType '
            '... on MediaImage{status image{url}}}}}}', {"id": gid})
    p = (d.get("data") or {}).get("product")
    if not p:
        print("FEHLER: Produkt nicht gefunden"); sys.exit(1)
    medien = p["media"]["nodes"]
    if pos < 1 or pos > len(medien):
        print(f"FEHLER: Position {pos} ausserhalb 1..{len(medien)}"); sys.exit(1)
    if pos == 1:
        print(f"bleibt: {p['title'][:50]} (Bild 1 ist schon vorn)")
        return
    ziel = medien[pos - 1]
    if ziel.get("mediaContentType") != "IMAGE" or ziel.get("status") != "READY":
        print("FEHLER: Zielmedium ist kein fertiges Bild"); sys.exit(1)
    r = gql('mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m){userErrors{message}}}',
            {"id": gid, "m": [{"id": ziel["id"], "newPosition": "0"}]})
    err = ((r.get("data") or {}).get("productReorderMedia") or {}).get("userErrors")
    # ⚠️ 05.09.2026: `not r` genuegt NICHT — eine Antwort mit `errors` und `data:null` (tote
    # Anmeldung) ist truthy, `userErrors` ist dann None, und der Lauf haette quittiert, ohne
    # dass ein Bild bewegt wurde. Quittiert wird nur gegen eine Antwort MIT `data`.
    if err or not r or r.get("errors") or (r.get("data") or {}).get("productReorderMedia") is None:
        print("FEHLER:", err or r.get("errors") or "keine Antwort"); sys.exit(1)
    with open(LEDGER, "a") as f:
        f.write(f"{gid.split('/')[-1]}\tbild-{pos}-nach-vorn\t{grund}\n")
    print(f"OK: {p['title'][:50]} → Bild {pos} nach vorn ({grund})")


if __name__ == "__main__":
    main()
