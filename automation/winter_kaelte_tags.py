#!/usr/bin/env python3
"""winter_kaelte_tags.py — Kollektion «Winter & Kälte» per Tag statt Titel-ODER-Regel (08.10.2026).

ANLASS (Plan Tag 10, Saison-Texte, Betreiber «verbessere weiter»). Die Kollektion `winter-kaelte` folgte der Regel
«Titel enthält heizung ODER heizdecke ODER handschuhe ODER handwärmer ODER beheizbar ODER winter». GEMESSEN 08.10.:
497 aktive, davon ~25 Fremdware — Boxhandschuhe, Ofen- und Spülhandschuhe, UV-Schutz- und Fitnesshandschuhe, Lockenstab
«mit Keramikheizung», «beheizbare Wimpernzange», Warmwasserhahn «mit Sofortheizung», Lunchbox «mit Schnellheizung»,
Tastenkappe, Fussbodenheizungs-Thermostat. Eine ODER-Regel kann nichts ausschliessen (Shopify: alle Bedingungen UND oder
alle ODER). Darum: Tag `winter-kaelte` aus derselben Wortliste MINUS Ausschlüsse, Kollektion = Tag-Regel.

REGEL (eine Datei automation/data/winter_kaelte.json): Titel trifft «ja» und nicht «nein» → Tag; sonst Tag weg.
Täglich im Aufseher (auch Neuimporte). Ledger dropship/_winter_kaelte_tags.tsv.

  python3 automation/winter_kaelte_tags.py --kanarien · python3 automation/winter_kaelte_tags.py · SCHARF=1 …
  SCHARF=1 python3 automation/winter_kaelte_tags.py --regel-umstellen   (einmalig, NACH dem ersten Taggen)
"""
import collections, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
import kategorie_fein as kf  # noqa: E402

TAG = "winter-kaelte"
LEDGER = os.path.join(REPO, "dropship", "_winter_kaelte_tags.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
_R = json.load(open(os.path.join(HIER, "data", "winter_kaelte.json"), encoding="utf-8"))
JA = re.compile(_R["ja"], re.I)
NEIN = re.compile(_R["nein"], re.I)


def soll(titel):
    t = titel or ""
    return bool(JA.search(t)) and not NEIN.search(t)


def kanarien():
    ok = 0
    for t, s in _R["kanarien"]:
        gut = soll(t) == s; ok += gut
        if not gut:
            print(f"  ✗ {t!r} → {soll(t)} (soll {s})")
    print(f"WINTER-KANARIEN {ok}/{len(_R['kanarien'])}")
    return ok == len(_R["kanarien"])


def main():
    from kaufwille_zeile import gql
    if not kanarien():
        raise SystemExit("Kanarienvögel gescheitert — nichts geschrieben")
    kf.export_holen()
    titel = {}
    for l in open(kf.EXPORT, encoding="utf-8"):
        p = json.loads(l)
        titel[p["id"]] = p["title"]
    # Export darf bis 6 h alt sein → aktuelle Kollektionsmitglieder dazunehmen (08.10.: 2 Hundemäntel fehlten im Export)
    cur = None
    while True:
        d = gql('query($c:String){collectionByHandle(handle:"winter-kaelte"){products(first:250,after:$c){pageInfo{hasNextPage endCursor} '
                'nodes{id title status}}}}', {"c": cur})["collectionByHandle"]["products"]
        for n in d["nodes"]:
            if n["status"] == "ACTIVE":
                titel.setdefault(n["id"], n["title"])
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    hat = set()
    cur = None
    while True:
        d = gql('query($q:String!,$c:String){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} nodes{id title}}}',
                {"q": f"tag:{TAG}", "c": cur})["products"]
        for n in d["nodes"]:
            hat.add(n["id"]); titel.setdefault(n["id"], n["title"])
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    plus = [pid for pid, t in titel.items() if soll(t) and pid not in hat]
    minus = [pid for pid in hat if not soll(titel.get(pid, ""))]
    print(f"Export {len(titel)} · mit Tag {len(hat)} · +{len(plus)} · −{len(minus)}")
    for pid in minus[:30]:
        print(f"  − {titel.get(pid, '')[:70]}")
    ok = fe = 0
    if SCHARF:
        with open(LEDGER, "a", encoding="utf-8") as led:
            for pid, m in [(x, "tagsAdd") for x in plus] + [(x, "tagsRemove") for x in minus]:
                r = gql('mutation($i:ID!,$t:[String!]!){%s(id:$i,tags:$t){userErrors{message}}}' % m, {"i": pid, "t": [TAG]})[m]
                gut = not r["userErrors"]; ok += gut; fe += not gut
                led.write("\t".join([pid.split("/")[-1], "+" if m == "tagsAdd" else "-", "gesetzt" if gut else "fehler",
                                     time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), titel.get(pid, "")[:80]]) + "\n")
    print(f"FERTIG: WINTER-KAELTE +{len(plus)} −{len(minus)}{f' · gesetzt {ok} · fehler {fe}' if SCHARF else ' (TROCKEN)'}")


def regel_umstellen():
    from kaufwille_zeile import gql
    c = gql('{collectionByHandle(handle:"winter-kaelte"){id ruleSet{appliedDisjunctively rules{column relation condition}}}}')["collectionByHandle"]
    n = gql('query($q:String!){productsCount(query:$q,limit:null){count}}', {"q": f"tag:{TAG} status:active"})["productsCount"]["count"]
    print("alt:", c["ruleSet"], "· aktive mit Tag:", n)
    if n < 300:
        raise SystemExit("zu wenige getaggt — erst taggen, dann umstellen")
    if not SCHARF:
        return
    json.dump(c, open(os.path.join(REPO, "dropship", "_winter_kaelte_regel_alt.json"), "w", encoding="utf-8"), ensure_ascii=False)
    r = gql('mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{ruleSet{rules{column condition}}} userErrors{message}}}',
            {"i": {"id": c["id"], "ruleSet": {"appliedDisjunctively": False,
                                               "rules": [{"column": "TAG", "relation": "EQUALS", "condition": TAG}]}}})["collectionUpdate"]
    print("neu:", r)


if __name__ == "__main__":
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien() else 1)
    if "--regel-umstellen" in sys.argv:
        regel_umstellen()
    else:
        main()
