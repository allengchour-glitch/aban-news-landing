#!/usr/bin/env python3
"""schmuck_tag_heilen.py — «Anhänger» ist nicht immer Schmuck (29.09.2026).

GEMESSEN (Bulk-Export, beim Einordnen der Google-Kategorien): Bruder-Modelle wie «Joskin Wannenkippanhänger»,
«Massey Ferguson 7480 mit Wannenkippanhänger», «Land Rover Defender, Einachsanhänger» trugen `kategorie-halskette` +
`schmuck` und standen damit in der Kollektion «Halsketten» (Regel TAG = kategorie-halskette) und «Schmuck-Sets».
Die Wache in `cat_tags.mjs` (11.08.) kannte Traktor/Bruder/Claas, aber nicht Joskin, Land Rover, RAM, Massey und
nicht die Anhänger-Komposita. Ebenso falsch: «Schlüsselanhänger» und «LED-Anhänger für Haustiere» als Halsschmuck.

REGEL: Aktive Produkte mit `kategorie-halskette` oder `schmuck`, deren Titel ein Fahrzeug-/Anhänger-Modell ist (oder die
den Tag `bruder` tragen), verlieren beide Tags; Schlüsselanhänger und Tier-Anhänger verlieren `kategorie-halskette`
(Schmuck-Tag bleibt, falls vorhanden — manche sind Taschen-Charms). Nur tagsRemove. Quelle repariert in cat_tags.mjs.
Täglich im Aufseher (ohne Variablen = scharf; DRY=1 zeigt nur). Ledger dropship/_schmuck_tag_heilen.tsv.
"""
import json, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from google_kategorie_fein import gql

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship/_schmuck_tag_heilen.tsv")
SCHARF = os.environ.get("DRY") != "1"

FAHRZEUG = re.compile(r"traktor|bagger|\blkw\b|kipper|dozer|schlepper|m[äa]hdrescher|\bbruder\b|john deere|fendt|claas|case ih|"
                      r"new holland|caterpillar|bworld|roadmax|massey|joskin|land rover|defender|\bram \d|\bjeep\b|frontlader|"
                      r"(wannenkipp|bordwand|fass|pferde|einachs|tank|holztransport|hakenlift|tieflade|vieh|ballen|abroll|mulden|beregnungs)-?anh[äa]nger",
                      re.I)
KEIN_HALSSCHMUCK = re.compile(r"schl[üu]sselanh[äa]nger|anh[äa]nger f[üu]r (hunde|haustiere|katzen)|leuchtanh[äa]nger f[üu]r hunde|"
                              r"anh[äa]nger f[üu]r hunde-halsb", re.I)


def main():
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: Schmuck-Tags heilen · {'SCHARF' if SCHARF else 'TROCKEN'}")
    kandidaten, c = [], None
    while True:
        r = gql('query($c:String){products(first:250,after:$c,query:"status:active AND (tag:kategorie-halskette OR tag:schmuck)"){'
                'pageInfo{hasNextPage endCursor} nodes{id handle title tags}}}', {"c": c})["products"]
        kandidaten += r["nodes"]
        if not r["pageInfo"]["hasNextPage"]:
            break
        c = r["pageInfo"]["endCursor"]
    plan = []
    for p in kandidaten:
        t = p["title"]
        tags = {x.lower() for x in p["tags"]}
        if FAHRZEUG.search(t) or "bruder" in tags:
            weg = [x for x in ("kategorie-halskette", "schmuck") if x in tags]
        elif KEIN_HALSSCHMUCK.search(t) and not re.search(r"halskette|kette\b", t, re.I):
            weg = [x for x in ("kategorie-halskette",) if x in tags]
        else:
            continue
        if weg:
            plan.append((p, weg))
    print(f"Schmuck-/Halsketten-Tags aktiv: {len(kandidaten)} · falsch getaggt: {len(plan)}")
    for p, weg in plan:
        print(f"  − {','.join(weg):30} {p['title'][:70]}")
    if not SCHARF:
        return
    ok = 0
    with open(LEDGER, "a", encoding="utf-8") as f:
        for p, weg in plan:
            e = gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}',
                    {"id": p["id"], "t": weg})["tagsRemove"]["userErrors"]
            if e:
                print("  Fehler:", p["handle"], e[0]["message"])
                continue
            ok += 1
            f.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{p['handle']}\t{','.join(weg)}\n")
    print(f"FERTIG: {ok} geheilt")


if __name__ == "__main__":
    main()
