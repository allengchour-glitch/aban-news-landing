#!/usr/bin/env python3
"""neue_kollektionen_anlegen.py — legt die Semrush-Landeseiten aus kategorie_rein_semrush.CFG an (05.10.2026).

Je Eintrag: Smart-Kollektion (Regel TAG = kat-…), Titel, Handle, Beschreibung, SEO-Titel + Meta (SEOInput ersetzt BEIDE Felder,
darum immer beide), Sortierung, danach Veröffentlichung in denselben sechs Kanälen wie /collections/diamond-painting.
Idempotent: existiert der Handle schon, wird nichts neu angelegt (nur fehlende Veröffentlichungen nachgeholt).
Ledger dropship/semrush/_neue_kollektionen_2026-10-05.tsv (Datum, Handle, ID, Aktion, Altwert, Neuwert) — nichts wird gelöscht;
`--zurueck` nimmt die Kollektionen aus allen Kanälen (unpublish), die Kollektion selbst bleibt (Hausregel «nie löschen»).
  python3 automation/neue_kollektionen_anlegen.py             Trockenlauf
  SCHARF=1 python3 automation/neue_kollektionen_anlegen.py    anlegen + veröffentlichen + zurücklesen
  SCHARF=1 python3 automation/neue_kollektionen_anlegen.py --zurueck
"""
import json, os, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402
from kategorie_rein_semrush import CFG, PUBLIKATIONEN  # noqa: E402

LEDGER = os.path.join(REPO, "dropship/semrush/_neue_kollektionen_2026-10-05.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
Q = ('query($h:String!){c:collectionByHandle(handle:$h){id title handle sortOrder seo{title description} productsCount{count} '
     'ruleSet{rules{column relation condition}} resourcePublicationsV2(first:20){nodes{publication{id name} isPublished}}}}')


def ledger(handle, cid, aktion, alt, neu):
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write("\t".join([time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), handle, cid or "", aktion,
                           json.dumps(alt, ensure_ascii=False), json.dumps(neu, ensure_ascii=False)]) + "\n")


def lesen(handle):
    return gql(Q, {"h": handle})["c"]


def anlegen(handle, c):
    live = lesen(handle)
    if live:
        print(f"== {handle}: existiert ({live['id']}, {live['productsCount']['count']} Produkte)")
    else:
        inp = {"title": c["titel"], "handle": handle, "descriptionHtml": c["text"], "sortOrder": c["sort"],
               "seo": {"title": c["seo_titel"], "description": c["seo_text"]},
               "ruleSet": {"appliedDisjunctively": False,
                           "rules": [{"column": "TAG", "relation": "EQUALS", "condition": c["tag"]}]}}
        print(f"== {handle}: NEU «{c['titel']}» Regel TAG={c['tag']} Sort {c['sort']} SEO «{c['seo_titel']}»")
        if not SCHARF:
            return
        r = gql('mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id handle} userErrors{field message}}}',
                {"i": inp})["collectionCreate"]
        if r["userErrors"]:
            print("   ⚠️", r["userErrors"]); ledger(handle, "", "create-fehler", None, r["userErrors"]); return
        ledger(handle, r["collection"]["id"], "create", None, {"titel": c["titel"], "tag": c["tag"], "seo": c["seo_titel"]})
        live = lesen(handle)
    if not SCHARF:
        return
    offen = [p for p in PUBLIKATIONEN
             if not any(n["isPublished"] and n["publication"]["id"] == p for n in live["resourcePublicationsV2"]["nodes"])]
    if offen:
        r = gql('mutation($id:ID!,$in:[PublicationInput!]!){publishablePublish(id:$id,input:$in){userErrors{field message}}}',
                {"id": live["id"], "in": [{"publicationId": p} for p in offen]})["publishablePublish"]
        print(f"   veröffentlicht in {len(offen)} Kanälen", r["userErrors"] or "✅")
        ledger(handle, live["id"], "publish", [], offen)
    live = lesen(handle)
    pubs = sorted(n["publication"]["name"] for n in live["resourcePublicationsV2"]["nodes"] if n["isPublished"])
    print(f"   zurückgelesen: «{live['title']}» · SEO «{(live['seo'] or {}).get('title')}» · Meta {len((live['seo'] or {}).get('description') or '')} Z. · "
          f"Regel {[(r['column'], r['condition']) for r in live['ruleSet']['rules']]} · Sort {live['sortOrder']} · Kanäle {pubs}")


def zurueck(handle):
    live = lesen(handle)
    if not live:
        print(f"== {handle}: fehlt"); return
    pubs = [n["publication"]["id"] for n in live["resourcePublicationsV2"]["nodes"] if n["isPublished"]]
    print(f"== {handle}: aus {len(pubs)} Kanälen nehmen")
    if SCHARF and pubs:
        r = gql('mutation($id:ID!,$in:[PublicationInput!]!){publishableUnpublish(id:$id,input:$in){userErrors{field message}}}',
                {"id": live["id"], "in": [{"publicationId": p} for p in pubs]})["publishableUnpublish"]
        print("  ", r["userErrors"] or "✅"); ledger(handle, live["id"], "unpublish", pubs, [])


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    ziele = args or list(CFG)
    for h in ziele:
        (zurueck if "--zurueck" in sys.argv else anlegen)(h, CFG[h]) if "--zurueck" not in sys.argv else zurueck(h)


if __name__ == "__main__":
    main()
