#!/usr/bin/env python3
"""filtergrenze_wache.py — Shopify blendet ALLE Filter einer Kollektion aus, sobald sie > 5'000 aktive Produkte hat.

GEMESSEN 04.10.2026: «Schmuck & Uhren» 4'932 aktiv → Filter da; «Schuhe» 5'498 → keine; nach Umstellung (ohne Kinderschuhe,
eigener Menüpunkt) 4'293 → Filter da. «Wohnen & Garten» ohne Küche (eigener Menüpunkt) 6'513 → 4'772 → Filter da.
QUELLE: help.shopify.com/en/manual/online-store/storefront-search/search-and-discovery-filters.
Bewusst über der Grenze (Inhalt würde sonst verfälscht): «Damen» (~9'800), Preis-Geschenkseiten (28'000–45'000).
Meldet jede Hauptmenü-Kollektion ab WARN (4'800) aktiven Produkten — Neuimporte schieben Kategorien über die Grenze.
Schreibt nichts. Eine Zeile «FILTERGRENZE: …».
"""
import os, sys, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402

WARN = int(os.environ.get("WARN", "4800"))
BEWUSST = {"damen-mode", "unter-chf-25", "kleine-geschenke-mitbringsel", "geschenke-unter-50-franken",
           "geschenke-unter-100-franken", "🎁-geschenke-bis-chf-30"}


def main():
    menue = [m for m in gql('{menus(first:30){nodes{handle items{url items{url items{url}}}}}}')["menus"]["nodes"]
             if m["handle"] == "main-menu"][0]["items"]
    hs = []
    def walk(it):
        for i in it:
            u = i.get("url") or ""
            if "/collections/" in u:
                hs.append(urllib.parse.unquote(u.split("/collections/")[1].split("?")[0]))
            walk(i.get("items") or [])
    walk(menue)
    befund = []
    for h in dict.fromkeys(hs):
        if h in BEWUSST:
            continue
        c = gql('query($h:String!){collectionByIdentifier(identifier:{handle:$h}){id}}', {"h": h})["collectionByIdentifier"]
        if not c:
            continue
        n = gql('query($q:String!){productsCount(query:$q,limit:null){count}}',
                {"q": f"collection_id:{c['id'].split('/')[-1]} status:active"})["productsCount"]["count"]
        if n >= WARN:
            befund.append(f"{h} {n}{' ⛔ ohne Filter' if n > 5000 else ''}")
    print("FILTERGRENZE: " + ("ok (alle Menü-Kollektionen < %d aktiv)" % WARN if not befund else " · ".join(befund)))


if __name__ == "__main__":
    main()
