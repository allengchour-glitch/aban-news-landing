#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""produkt_bildsatz.py — alle Bilder EINES Produkts als nummerierten Kontaktbogen.
Nutzung: python3 automation/produkt_bildsatz.py <product-gid-oder-id>
Ergebnis: /tmp/kontaktbogen_p<id>.png (+ .json). Die Nummern entsprechen der Position
im Bildsatz (1 = aktuelles Hauptbild) — genau die Zahl, die erstbild_nach_vorn.py erwartet.
Baut auf bild_kontaktbogen_liste.py auf (Lehre 21.08.: erst den GANZEN Bildsatz ansehen).
"""
import json, os, subprocess, sys, urllib.request
SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
HIER = os.path.dirname(os.path.abspath(__file__))
pid = sys.argv[1]
gid = pid if pid.startswith("gid://") else f"gid://shopify/Product/{pid}"
req = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json",
    data=json.dumps({"query": 'query($id:ID!){product(id:$id){id title media(first:30){nodes{mediaContentType ... on MediaImage{status image{url}}}}}}', "variables": {"id": gid}}).encode(),
    headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
d = json.load(urllib.request.urlopen(req, timeout=60))
p = d["data"]["product"]
liste = []
for i, m in enumerate(p["media"]["nodes"], 1):
    url = (m.get("image") or {}).get("url")
    liste.append({"url": url if (m.get("mediaContentType") == "IMAGE" and m.get("status") == "READY") else "",
                  "titel": f"{i}", "id": str(i)})
name = "p" + gid.split("/")[-1]
json.dump(liste, open(f"/tmp/bildsatz_{name}.json", "w"))
r = subprocess.run([sys.executable, os.path.join(HIER, "bild_kontaktbogen_liste.py"), f"/tmp/bildsatz_{name}.json", name],
                   capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip()[-300:])
print(f"TITEL: {p['title']}\nBILDER: {len(liste)}\nPNG: /tmp/kontaktbogen_{name}.png")
