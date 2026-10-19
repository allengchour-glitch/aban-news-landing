#!/usr/bin/env python3
"""Rückweg zu VARIANT-LINKS-2026-10-19: spielt die vier Originaldateien (diese Ordnerstruktur) ins Haupttheme zurück
und löscht danach das Hilfs-Snippet snippets/lx-karten-href.liquid (Reihenfolge: erst die Aufrufer, dann das Snippet).

    python3 dropship/_theme_backup_variantlinks_2026-10-19/rueckweg.py            # nur zeigen (DRY)
    python3 dropship/_theme_backup_variantlinks_2026-10-19/rueckweg.py --scharf   # wirklich zurückspielen
Ein unbekannter Schalter bricht mit Exit 2 ab. Braucht das Token wie die anderen Skripte (/tmp/cj_shop_token.txt oder SHOPIFY_ADMIN_TOKEN).
"""
import os, sys, time
HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HIER, "..", "..", "automation"))
THEME = "gid://shopify/OnlineStoreTheme/187533001089"
DATEIEN = ["snippets/product-card.liquid", "snippets/card-gallery.liquid", "blocks/product-title.liquid", "blocks/_product-details.liquid"]
SNIPPET = "snippets/lx-karten-href.liquid"
a = sys.argv[1:]
if a not in ([], ["--scharf"]):
    print("unbekannter Schalter", a, "— Abbruch (kein Lauf). Erlaubt: (ohne) · --scharf"); sys.exit(2)
import kollektion_leer as kl
for f in DATEIEN:
    t = open(os.path.join(HIER, f), encoding="utf-8", newline="").read()
    print("Original", f, len(t.encode()), "Bytes")
    if a:
        r = kl.gql('mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$id, files:$files){ userErrors{filename code message} } }',
                   {"id": THEME, "files": [{"filename": f, "body": {"type": "TEXT", "value": t}}]})["themeFilesUpsert"]
        if r["userErrors"]:
            print("FEHLER", f, r["userErrors"]); sys.exit(4)
        print("  zurückgespielt")
if a:
    time.sleep(3)
    r = kl.gql('mutation($id:ID!,$f:[String!]!){ themeFilesDelete(themeId:$id, files:$f){ deletedThemeFiles{filename} userErrors{filename code message} } }', {"id": THEME, "f": [SNIPPET]})["themeFilesDelete"]
    print("Snippet gelöscht:", r)
else:
    print("DRY: nichts geschrieben. Mit --scharf zurückspielen.")
