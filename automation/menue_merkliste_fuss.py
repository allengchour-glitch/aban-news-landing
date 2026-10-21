#!/usr/bin/env python3
"""menue_merkliste_fuss.py — «Merkliste» ins Fussmenü (21.10.2026, Kollegen-Feedback 16.10.: «die Liste finde ich nirgends»).

Der Menüpunkt «♥ Merkliste» steht als LETZTER von 13 Punkten im Hauptmenü (mobil ganz unten in der Schublade); das Fussmenü hatte keinen.
Dieser Eintrag ergänzt den Footer (nach «Alle Kategorien»); das Kopf-Herz mit Zähler (snippets/header-actions.liquid) ist der Hauptweg.
Muster: kollektion_accessoires_fix (menuUpdate mit ALLEN Einträgen, IDs erhalten, Sicherung, Rücklesen).
  python3 automation/menue_merkliste_fuss.py            # DRY
  SCHARF=1 python3 automation/menue_merkliste_fuss.py   # Sicherung nach dropship/, menuUpdate, Rücklesen (+1, 0 verlorene IDs)
"""
import json, os, sys
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
REPO = os.path.dirname(HIER)
SCHARF = os.environ.get("SCHARF") == "1"
from kollektion_accessoires_fix import _als_input, _zaehle_items, gql, MENU_ITEM_FELDER  # noqa: E402

TITEL, URL, NACH = "♥ Merkliste", "/pages/merkliste", "Alle Kategorien"


def lesen():
    q = ('{menus(first:20){nodes{id handle title items{' + MENU_ITEM_FELDER + ' items{' + MENU_ITEM_FELDER + '}}}}}')
    return next(m for m in gql(q)["menus"]["nodes"] if m["handle"] == "footer")


def main():
    m = lesen()
    items = _als_input(m["items"])
    if any((i.get("url") or "").rstrip("/").endswith(URL) for i in items):
        print("Fussmenü hat die Merkliste schon — nichts zu tun"); return 0
    pos = next((k + 1 for k, i in enumerate(items) if i["title"].strip() == NACH), len(items))
    items.insert(pos, {"title": TITEL, "type": "HTTP", "url": URL, "items": []})
    vorher = _zaehle_items(m["items"])
    print(f"Fussmenü vorher: {vorher} Einträge · geplant: «{TITEL}» an Position {pos + 1}" + ("" if SCHARF else " · DRY"))
    if not SCHARF:
        return 0
    sich = os.path.join(REPO, "dropship", f"menu_backup_{datetime.now(timezone.utc):%Y-%m-%d_%H%M}_vor_merkliste_fuss.json")
    json.dump(m, open(sich, "w"), ensure_ascii=False, indent=1)
    r = gql('mutation($id:ID!,$t:String!,$h:String,$items:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$items){menu{id} userErrors{field message}}}',
            {"id": m["id"], "t": m["title"], "h": m["handle"], "items": items})["menuUpdate"]
    if r["userErrors"]:
        print("  ⛔ menuUpdate:", r["userErrors"]); return 1
    n = lesen()

    def ids(its, acc):
        for i in its:
            acc.add(i["id"]); ids(i.get("items") or [], acc)
        return acc
    verloren = ids(m["items"], set()) - ids(n["items"], set())
    nachher = _zaehle_items(n["items"])
    ok = nachher == vorher + 1 and not verloren and any((i.get("url") or "").rstrip("/").endswith(URL) for i in n["items"])
    print(f"Fussmenü nachher: {nachher} (erwartet {vorher + 1}) · verlorene IDs: {len(verloren)} · Sicherung {os.path.relpath(sich, REPO)}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
