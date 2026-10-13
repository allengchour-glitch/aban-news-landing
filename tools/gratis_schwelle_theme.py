#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gratis_schwelle_theme.py — Theme-Zahlen der Gratis-Schwelle 45 → 40.50 nachziehen (Entscheid D, Schritt 4).

ERST NACH `automation/gratis_schwelle_setzen.py --scharf` (Profile live auf 40.50, zurückgelesen) und dem Umstellen von
ch_lager_profil.GRATIS_AB_CH. Vorher würde der Warenkorb ab 40.50 «gratis» sagen, die Kasse aber CHF 7 verlangen.

Holt die LIVE-Dateien (nie theme_backup/), ersetzt genau die gezählten Stellen und schreibt sie nach ZIEL (Standard:
Scratch-Ordner) samt erwarteter md5 — hochladen mit dem md5-gesicherten Upload:
  python3 tools/gratis_schwelle_theme.py /pfad/ordner
  QUELLE=/pfad/ordner python3 <scratch>/umsetzung/theme/hochladen.py '<md5-json aus der Ausgabe>' snippets/cart-summary.liquid layout/theme.liquid templates/product.json
Danach: python3 automation/warenkorb_gratisversand.py --pruefen (Schwellen-Zahl = Tarif) und warenkorb_einig.py --kanarien
(KANARIEN-Sollwerte für 2× 24.90 / 39.90 + 5.90 / Code 52.00 werden 0 — dort nachziehen).
"""
import hashlib
import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
from kaufwille_zeile import gql  # noqa: E402

THEME = "gid://shopify/OnlineStoreTheme/187533001089"
ERSETZEN = {   # Datei → [(alt, neu, Anzahl)]; Reihenfolge zählt (product.json: erst 4500 → 4050, dann 5000 → 4500)
    "snippets/cart-summary.liquid": [
        ("Tarif gratis ab 45 (Entscheid D «ab 40.50» vorbereitet, gratis_schwelle_setzen.py)",
         "Tarif gratis ab 40.50 (seit Betreiber-Entscheid D, gratis_schwelle_setzen.py; vorher 45)", 1),
        ("{%- elsif cart.total_price >= 4500 -%}", "{%- elsif cart.total_price >= 4050 -%}", 1),
        ("⌈(45.00 − Betrag nach Rabatt)", "⌈(40.50 − Betrag nach Rabatt)", 1),
        ("{%- assign lux_gv_rest2 = 4500 |", "{%- assign lux_gv_rest2 = 4050 |", 1),
    ],
    "layout/theme.liquid": [
        ("var SCHWELLE=4500, VERSAND=700, letzt=null; // 09.09.2026",
         "var SCHWELLE=4050, VERSAND=700, letzt=null; // Entscheid D: Tarif ab 40.50 (gratis_schwelle_setzen.py). Davor 09.09.2026", 1),
        (">= 45.00 (Tarif; Entscheid D «40.50» vorbereitet)", ">= 40.50 (Tarif seit Entscheid D; vorher 45)", 1),
        ("chl||tot>=4500, rest=gratis?0:Math.max(5000-sub, Math.floor(((4500-tot)*10+8)/9));",
         "chl||tot>=4050, rest=gratis?0:Math.max(5000-sub, Math.floor(((4050-tot)*10+8)/9));", 1),
    ],
    "templates/product.json": [
        ("Tarif ab 45 → ab 50 auch mit 10-%-Code gratis, 45–49.99 ohne Gutschein (Entscheid D 40.50 vorbereitet).",
         "Entscheid D: Tarif ab 40.50 → ab 45 auch mit 10-%-Code gratis, 40.50–44.99 ohne Gutschein.", 1),
        ("product.price_min >= 4500 %}", "product.price_min >= 4050 %}", 2),
        ("product.price_min >= 5000 %}", "product.price_min >= 4500 %}", 2),
    ],
}


def main():
    ziel = sys.argv[1] if len(sys.argv) > 1 else "/tmp/gratis_schwelle_theme"
    os.makedirs(ziel, exist_ok=True)
    t = gql('query($id:ID!,$f:[String!]!){theme(id:$id){role files(filenames:$f,first:5){nodes{filename checksumMd5 '
            'body{... on OnlineStoreThemeFileBodyText{content}}}}}}', {"id": THEME, "f": list(ERSETZEN)})["theme"]
    if t["role"] != "MAIN":
        raise SystemExit(f"Theme nicht MAIN ({t['role']})")
    md5 = {}
    for n in t["files"]["nodes"]:
        c = n["body"]["content"]
        for alt, neu, k in ERSETZEN[n["filename"]]:
            if c.count(alt) != k:
                raise SystemExit(f"ABBRUCH {n['filename']}: «{alt[:60]}» {c.count(alt)}× statt {k} — Live-Datei geändert, neu prüfen")
            c = c.replace(alt, neu)
        if n["filename"] == "templates/product.json":
            k = c.find("{", c.find("*/") + 2 if c.lstrip().startswith("/*") else 0)
            json.loads(c[k:])
        open(os.path.join(ziel, n["filename"].replace("/", "__")), "w", encoding="utf-8").write(c)
        open(os.path.join(ziel, n["filename"].replace("/", "__") + ".vorher"), "w", encoding="utf-8").write(n["body"]["content"])
        md5[n["filename"]] = n["checksumMd5"]
        print(f"✓ {n['filename']}: {len(ERSETZEN[n['filename']])} Ersetzungen · neu md5 {hashlib.md5(c.encode()).hexdigest()}")
    print("Live-md5 für hochladen.py:", json.dumps(md5))


if __name__ == "__main__":
    main()
