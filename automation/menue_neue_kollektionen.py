#!/usr/bin/env python3
"""menue_neue_kollektionen.py — sechs Keyword-Kollektionen ins Hauptmenü hängen (24.09.2026, Keywordplan C3).

Ohne Menüplatz sind die sechs Landeseiten Waisen: nur Sitemap + zwei Ratgeber verlinken sie. Muster und Helfer aus
`kollektion_accessoires_fix.modus_menue` (menuUpdate mit ALLEN Einträgen, IDs erhalten, Sicherung, Rücklesen).

  python3 automation/menue_neue_kollektionen.py            # DRY: zeigt Positionen, schreibt nichts
  SCHARF=1 python3 automation/menue_neue_kollektionen.py   # Sicherung nach dropship/, menuUpdate, Rücklesen (+6, 0 verlorene IDs)

Einträge (nur, wenn die Kollektion ≥ 10 aktive Produkte hat und noch nicht im Menü steht):
  Damen            → «Midikleider» nach «Kleider»
  Wohnen & Garten  → «Vorhänge» nach «Kissen & Wohntextilien», «Wanddeko» nach «Vasen & Deko», «Hängematten» nach «Garten & Outdoor»
  Kinder & Haustier → Haustierwelt → «Kratzbäume», «Hundebetten» ans Ende
"""
import json
import os
import sys
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
REPO = os.path.dirname(HIER)
SCHARF = os.environ.get("SCHARF") == "1"
from kollektion_accessoires_fix import _menu_lesen, _als_input, _zaehle_items, gql  # noqa: E402

PLAN = [  # (Titel, Handle, Pfad im Menü [Titelfragmente], Vorgänger-Handle oder None = ans Ende)
    ("Midikleider", "midikleider", ["Damen"], "sub-kleider"),
    ("Vorhänge", "vorhaenge", ["Wohnen & Garten"], "kissen-wohntextilien"),
    ("Wanddeko", "wanddeko", ["Wohnen & Garten"], "sub-deko"),
    ("Hängematten", "haengematten", ["Wohnen & Garten"], "outdoor-garten"),
    ("Kratzbäume", "kratzbaeume", ["Kinder & Haustier", "Haustierwelt"], None),
    ("Hundebetten", "hundebetten", ["Kinder & Haustier", "Haustierwelt"], None),
]


def aktiv(handle):
    c = gql('query($h:String!){collectionByHandle(handle:$h){id}}', {"h": handle})["collectionByHandle"]
    if not c:
        return 0
    return gql('query($q:String!){productsCount(query:$q, limit:null){count}}',
               {"q": f"collection_id:{c['id'].split('/')[-1]} status:active"})["productsCount"]["count"]


def finde(items, titel):
    return next((i for i in items if i["title"].strip().lower() == titel.lower()), None)


def alle_urls(items, acc):
    for i in items:
        acc.add((i.get("url") or "").rstrip("/"))
        alle_urls(i.get("items") or [], acc)
    return acc


def main():
    m = _menu_lesen()
    vorher = _zaehle_items(m["items"])
    drin = alle_urls(m["items"], set())
    items = _als_input(m["items"])
    geplant = 0
    for titel, handle, pfad, nach in PLAN:
        url = f"/collections/{handle}"
        if url in drin:
            print(f"  = «{titel}» steht schon im Menü"); continue
        n = aktiv(handle)
        if n < 10:
            print(f"  ⏭️ «{titel}»: nur {n} aktive — nicht verlinkt"); continue
        eltern = items
        for t in pfad:
            e = finde(eltern, t)
            if not e:
                print(f"  ⛔ Menüpunkt «{t}» nicht gefunden (für «{titel}»)"); break
            eltern = e["items"]
        else:
            pos = len(eltern)
            if nach:
                pos = next((k + 1 for k, i in enumerate(eltern) if (i.get("url") or "").rstrip("/").endswith(f"/collections/{nach}")), len(eltern))
            eltern.insert(pos, {"title": titel, "type": "HTTP", "url": url, "items": []})
            geplant += 1
            print(f"  + «{titel}» ({n} aktiv) → {' › '.join(pfad)} an Position {pos + 1}")
    print(f"Menü vorher: {vorher} Einträge · geplant: +{geplant}" + ("" if SCHARF else " · DRY"))
    if not SCHARF or not geplant:
        return 0
    sich = os.path.join(REPO, "dropship", f"menu_backup_{datetime.now(timezone.utc):%Y-%m-%d_%H%M}_vor_keyword_kollektionen.json")
    json.dump(m, open(sich, "w"), ensure_ascii=False, indent=1)
    print("  Sicherung:", os.path.relpath(sich, REPO))
    r = gql('mutation($id:ID!,$t:String!,$h:String,$items:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,'
            'items:$items){menu{id} userErrors{field message}}}',
            {"id": m["id"], "t": m["title"], "h": m["handle"], "items": items})["menuUpdate"]
    if r["userErrors"]:
        print("  ⛔ menuUpdate:", r["userErrors"]); return 1
    n = _menu_lesen()
    nachher = _zaehle_items(n["items"])

    def ids(items, acc):
        for i in items:
            acc.add(i["id"]); ids(i.get("items") or [], acc)
        return acc
    verloren = ids(m["items"], set()) - ids(n["items"], set())
    neu_drin = alle_urls(n["items"], set())
    fehlt = [h for _, h, _, _ in PLAN if f"/collections/{h}" not in neu_drin]
    print(f"Menü nachher: {nachher} (vorher {vorher}, erwartet {vorher + geplant}) · verlorene IDs: {len(verloren)} · fehlt: {fehlt or 'nichts'}")
    return 0 if (nachher == vorher + geplant and not verloren and not fehlt) else 1


if __name__ == "__main__":
    sys.exit(main())
