#!/usr/bin/env python3
"""kollektion_neu_anlegen.py — Smart-Kollektion mit HÄNGENDER Mitgliedschaft neu anlegen, Handle bleibt (10.10.2026).

ANLASS: «Geschenke bis CHF 30» (Hauptmenü, 9 Kanäle) zeigte im Shop 9'259 Artikel, Admin 11'183 — die Regel ist seit 05.10.
nur noch «Tag = geschenkwelt-unter30» (400). Shopify hatte die Mitgliedschaft nach dem Regelwechsel nie neu berechnet; Regel ändern,
Sortierung ändern, Regel zurücksetzen bewirkten in je 2–4 Min nichts. Die Wichtel-Kollektion rechnete im selben Lauf normal um.
Ab Seite 2 standen E-Scooter-Ladegerät & Co. (die Mitglieder der Regel vom 03.10.).

WAS ES TUT (ohne Ausfall): neue Kollektion mit allen Feldern (Titel, Text, SEO, Bild, Vorlage, Regel, Sortierung) unter
Zwischen-Handle → in dieselben Kanäle → warten bis gefüllt → alte Kollektion: Handle «…-alt-JJJJMMTT», aus allen Kanälen (bleibt als
Sicherung, nicht gelöscht) → neue bekommt das Original-Handle. Menüs mit URL-Link und Theme (Handle) zeigen danach automatisch auf
die neue; Menüpunkte mit resourceId werden gemeldet (nicht umgebogen).
  python3 automation/kollektion_neu_anlegen.py HANDLE            Trockenlauf
  SCHARF=1 python3 automation/kollektion_neu_anlegen.py HANDLE
Sicherung: dropship/_kollektion_neu_<datum>.json
"""
import datetime as dt, json, os, sys, time
HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from seo_autopilot import gql

SCHARF = os.environ.get("SCHARF") == "1"
Q = '''query($h:String!){c:collectionByHandle(handle:$h){id title handle descriptionHtml sortOrder templateSuffix image{url altText}
 seo{title description} productsCount{count} ruleSet{appliedDisjunctively rules{column relation condition}}
 resourcePublicationsV2(first:30){nodes{publication{id name}}}}}'''


def zahl(cid):
    return gql('query($id:ID!){c:collection(id:$id){productsCount{count}}}', {"id": cid})["c"]["productsCount"]["count"]


def main():
    h = sys.argv[1]
    alt = gql(Q, {"h": h})["c"]
    if not alt or not alt["ruleSet"]:
        sys.exit("keine Smart-Kollektion mit diesem Handle")
    tag = dt.date.today().strftime("%Y%m%d")
    pubs = [p["publication"]["id"] for p in alt["resourcePublicationsV2"]["nodes"]]
    print(f"{alt['title']} · {alt['productsCount']['count']} · {len(pubs)} Kanäle · {alt['ruleSet']['rules']}")
    sicher = os.path.join(REPO, "dropship", f"_kollektion_neu_{tag}.json")
    bisher = json.load(open(sicher)) if os.path.exists(sicher) else {}
    bisher[h] = alt
    json.dump(bisher, open(sicher, "w"), ensure_ascii=False, indent=1)
    if not SCHARF:
        print("TROCKEN — nichts geschrieben"); return
    eingabe = {"title": alt["title"], "handle": f"{h}-neu-{tag}", "descriptionHtml": alt["descriptionHtml"],
               "sortOrder": alt["sortOrder"], "seo": alt["seo"], "ruleSet": alt["ruleSet"]}
    if alt["templateSuffix"]:
        eingabe["templateSuffix"] = alt["templateSuffix"]
    if alt["image"]:
        eingabe["image"] = {"src": alt["image"]["url"], "altText": alt["image"]["altText"]}
    r = gql('mutation($c:CollectionInput!){collectionCreate(input:$c){collection{id handle} userErrors{field message}}}',
            {"c": eingabe})["collectionCreate"]
    if r["userErrors"]:
        sys.exit(f"Anlegen: {r['userErrors']}")
    neu = r["collection"]["id"]; print("neu:", neu, r["collection"]["handle"], flush=True)
    r = gql('mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i){userErrors{message}}}',
            {"id": neu, "i": [{"publicationId": p} for p in pubs]})["publishablePublish"]
    print("veröffentlicht:", r["userErrors"] or f"{len(pubs)} Kanäle", flush=True)
    for i in range(40):
        n = zahl(neu); print("  gefüllt:", n, flush=True)
        if n > 0 and (i > 2 or n >= 50):
            break
        time.sleep(10)
    r = gql('mutation($c:CollectionInput!){collectionUpdate(input:$c){collection{handle} userErrors{message}}}',
            {"c": {"id": alt["id"], "handle": f"{h}-alt-{tag}", "title": alt["title"] + " (alt)"}})["collectionUpdate"]
    print("alt umbenannt:", r["collection"], r["userErrors"], flush=True)
    r = gql('mutation($id:ID!,$i:[PublicationInput!]!){publishableUnpublish(id:$id,input:$i){userErrors{message}}}',
            {"id": alt["id"], "i": [{"publicationId": p} for p in pubs]})["publishableUnpublish"]
    print("alt aus Kanälen:", r["userErrors"] or "ok", flush=True)
    r = gql('mutation($c:CollectionInput!){collectionUpdate(input:$c){collection{handle productsCount{count}} userErrors{message}}}',
            {"c": {"id": neu, "handle": h}})["collectionUpdate"]
    print("neu übernimmt Handle:", r["collection"], r["userErrors"], flush=True)
    zurueck = gql(Q, {"h": h})["c"]
    ok = zurueck and zurueck["id"] == neu and len(zurueck["resourcePublicationsV2"]["nodes"]) == len(pubs)
    print(("✓" if ok else "✗"), "Handle", h, "→", zurueck and zurueck["id"], "Kanäle", zurueck and len(zurueck["resourcePublicationsV2"]["nodes"]))
    bisher[h + "#neu"] = {"id": neu, "alt_id": alt["id"], "alt_handle": f"{h}-alt-{tag}"}
    json.dump(bisher, open(sicher, "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
