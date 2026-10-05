#!/usr/bin/env python3
"""menue_semrush_kollektionen.py — hängt die Semrush-Landeseiten vom 05.10.2026 ins Hauptmenü (HTTP-Links, Backup, idempotent).

Nur dort, wo eine passende Unterrubrik existiert (gemessen am Hauptmenü 05.10.): Wohnen & Garten (Teppiche, Bettwäsche nach
«Kissen & Wohntextilien»; Wäschekörbe, Wandregale nach «Aufbewahrung»; Duschvorhänge nach «Vorhänge»; Wecker nach «Beleuchtung»),
Sport & Party (Taschenlampen nach «Camping & Outdoor»), Herbst & Übergang (Winterjacken nach «Jacken & Mäntel»).
Typ HTTP mit /collections/<handle> — Typ COLLECTION rendert /en/… = 404 (Hausregel). Backup des ganzen Menüs vorher nach
dropship/semrush/_hauptmenue_backup_2026-10-05.json; danach automation/menue_links.py = 0 Befunde Pflicht.
  python3 automation/menue_semrush_kollektionen.py          Trockenlauf
  SCHARF=1 python3 automation/menue_semrush_kollektionen.py
"""
import json, os, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER); sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402

SCHARF = os.environ.get("SCHARF") == "1"
BACKUP = os.path.join(REPO, "dropship/semrush/_hauptmenue_backup_2026-10-05.json")
LEDGER = os.path.join(REPO, "dropship/semrush/_neue_kollektionen_2026-10-05.tsv")
# (Rubrik-Titel, nach welchem Unterpunkt, [(Titel, handle)…])
PLAN = [
    ("Wohnen & Garten", "Kissen & Wohntextilien", [("Teppiche", "teppiche"), ("Bettwäsche", "bettwaesche")]),
    ("Wohnen & Garten", "Aufbewahrung", [("Wäschekörbe", "waeschekoerbe"), ("Wandregale", "wandregale")]),
    ("Wohnen & Garten", "Vorhänge", [("Duschvorhänge", "duschvorhaenge")]),
    ("Wohnen & Garten", "Beleuchtung", [("Wecker", "wecker")]),
    ("Sport & Party", "Camping & Outdoor", [("Taschenlampen & Stirnlampen", "taschenlampen")]),
    ("Herbst & Übergang", "Jacken & Mäntel", [("Winterjacken & Daunenjacken", "winterjacken")]),
]
F = "id title type url tags"
Q = f"query{{menus(first:10){{nodes{{id handle title items{{{F} items{{{F} items{{{F}}}}}}}}}}}}}"


def eingabe(it):
    o = {"id": it["id"], "title": it["title"], "type": it["type"], "url": it["url"], "tags": it.get("tags") or []}
    if it.get("items"):
        o["items"] = [eingabe(x) for x in it["items"]]
    return o


def main():
    menu = next(m for m in gql(Q)["menus"]["nodes"] if m["handle"] == "main-menu")
    if not os.path.exists(BACKUP):
        json.dump(menu, open(BACKUP, "w"), ensure_ascii=False, indent=1)
    vorhanden = {u["url"] for r in menu["items"] for u in r["items"]}
    neu = 0
    for rubrik, nach, eintraege in PLAN:
        r = next((x for x in menu["items"] if x["title"] == rubrik), None)
        if not r:
            print("⚠️ Rubrik fehlt:", rubrik); continue
        idx = next((i for i, u in enumerate(r["items"]) if u["title"] == nach), None)
        if idx is None:
            print(f"⚠️ Unterpunkt «{nach}» fehlt in {rubrik}"); continue
        for k, (titel, handle) in enumerate(eintraege):
            url = f"/collections/{handle}"
            if url in vorhanden:
                print(f"   schon da: {rubrik} › {titel}"); continue
            r["items"].insert(idx + 1 + k, {"id": None, "title": titel, "type": "HTTP", "url": url, "tags": [], "items": []})
            print(f"   + {rubrik} › nach «{nach}»: {titel} → {url}"); neu += 1
    print(f"{neu} neue Menüpunkte · Rubriken: {[(x['title'], len(x['items'])) for x in menu['items']]}")
    if not SCHARF or not neu:
        return
    items = []
    for it in menu["items"]:
        o = eingabe(it)
        o["items"] = [{k: v for k, v in eingabe(u).items() if not (k == "id" and v is None)} for u in it["items"]]
        items.append(o)
    r = gql('mutation($id:ID!,$t:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,items:$i){menu{id} userErrors{field message}}}',
            {"id": menu["id"], "t": menu["title"], "i": items})["menuUpdate"]
    print("menuUpdate:", r["userErrors"] or "✅")
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\tmain-menu\t{menu['id']}\tmenu\t{json.dumps('Backup ' + os.path.basename(BACKUP))}\t{json.dumps(neu)}\n")
    live = next(m for m in gql(Q)["menus"]["nodes"] if m["handle"] == "main-menu")
    urls = {u["url"] for rr in live["items"] for u in rr["items"]}
    print("zurückgelesen:", [f"/collections/{h}" in urls for _, _, e in PLAN for _, h in e])


if __name__ == "__main__":
    main()
