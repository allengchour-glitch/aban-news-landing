#!/usr/bin/env python3
"""spielzeug_trennung.py — Spielzeug sauber von RC/Elektronik trennen (08.10.2026, Betreiber «saubere trennung»).

GEMESSEN 08.10.: Die CJ-Gruppe `cjspielelektronik` (cj_category_fill.mjs) gab JEDEM Import Typ «Spass-Elektronik» und die
Tags rc/gadgets — auch Klemmbausteinen, 3D-Holzpuzzles und Modellbausätzen. Folge: 841 von 1'040 Produkten mit Tag `rc`
sind nicht ferngesteuert, und die Kollektion `spass-elektronik` («RC-Autos, Drohnen & Spass-Elektronik», Regel TAG=rc,
7 Kanäle) zeigte sie alle; 614 Spielzeuge ohne jede Elektronik trugen den Typ «Spass-Elektronik» (Filter «Produkttyp»).
Die Kategorien (Building Toys, Puzzles, Remote Control Toys) stimmten schon — nur Tag und Typ logen.

REGEL (EINE Datei automation/data/spielzeug_trennung.json, auch im Importer `spielzeugTrennung()`):
  Tag rc       bleibt bei RC-Wort (ferngesteuert, RC, Drohne, Helikopter, DJI/FPV …) ODER Elektronik-Wort (die Kollektion heisst
               «RC-Autos, Drohnen & Spass-Elektronik»); weg nur bei reinem Spielzeug (Bausteine, Holzpuzzles, Modellbausätze).
  Typ          «Spass-Elektronik» → «Spielzeug & Spiele», wenn kein Elektronik-Wort (LED, Licht, Sound, Akku, Roboter …) UND
               Importer: ein Bau-/Puzzlewort im Titel · Wächter: Shopify-Kategorie unter «Toys & Games» (sicherer als das Wort).
  Elektronisches Spielzeug (tanzender Affe mit Licht, Malroboter, Kinder-Smartphone) bleibt «Spass-Elektronik».
Schreibt tagsRemove + productUpdate(productType), zurückgelesen, Ledger dropship/_spielzeug_trennung.tsv. Täglich im Aufseher.

  python3 automation/spielzeug_trennung.py --kanarien · python3 automation/spielzeug_trennung.py · SCHARF=1 …
"""
import collections, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
REGEL = json.load(open(os.path.join(HIER, "data", "spielzeug_trennung.json"), encoding="utf-8"))
RC = re.compile(REGEL["rc"], re.I)
EL = re.compile(REGEL["el"], re.I)
BAU = re.compile(REGEL["bau"], re.I)
RC_BAU = re.compile(REGEL["rc_bau"], re.I)      # 08.10.: bei Bau-/Puzzletiteln nennt «Helikopter/Kamera/Roboter» oft nur das Modell
EL_BAU = re.compile(REGEL["el_bau"], re.I)


def ist_rc(t):
    return bool((RC_BAU if BAU.search(t) else RC).search(t))


def ist_el(t):
    return bool((EL_BAU if BAU.search(t) else EL).search(t))
ALT, NEU = REGEL["typ_alt"], REGEL["typ_neu"]
LEDGER = os.path.join(REPO, "dropship", "_spielzeug_trennung.tsv")
SCHARF = os.environ.get("SCHARF") == "1"


def import_regel(titel, typ, tags):
    """Wie spielzeugTrennung() im Importer (nur Titel bekannt) → (typ, tags)."""
    t = titel or ""
    tags = [x for x in tags if not (x == "rc" and not ist_rc(t) and not ist_el(t))]
    if typ == ALT and BAU.search(t) and not ist_el(t):
        typ = NEU
    return typ, tags


def waechter_regel(titel, typ, tags, kategorie):
    """Bestand: Kategorie ist gesetzt und stimmt (Building Toys, Puzzles …) → sie ersetzt das Bauwort."""
    t = titel or ""
    neu_tags = [x for x in tags if not (x == "rc" and not ist_rc(t) and not ist_el(t))]
    neu_typ = typ
    if typ == ALT and (kategorie or "").startswith("Toys & Games") and not ist_el(t):
        neu_typ = NEU
    return neu_typ, neu_tags


def kanarien():
    ok = 0
    for titel, typ, tags, soll_typ, soll_tags in REGEL["kanarien"]:
        ist = import_regel(titel, typ, tags)
        gut = ist == (soll_typ, soll_tags); ok += gut
        if not gut:
            print(f"  ✗ {titel!r} → {ist} (soll {(soll_typ, soll_tags)})")
    print(f"SPIELZEUG-KANARIEN {ok}/{len(REGEL['kanarien'])}")
    return ok == len(REGEL["kanarien"])


def main():
    from kaufwille_zeile import gql
    if not kanarien():
        raise SystemExit("Kanarienvögel gescheitert — nichts geschrieben")
    kand = {}
    for q in ("tag:rc status:active", f"product_type:'{ALT}' status:active"):
        cur = None
        while True:
            d = gql('query($q:String!,$c:String){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
                    'nodes{id title productType tags category{fullName}}}}', {"q": q, "c": cur})["products"]
            for n in d["nodes"]:
                kand[n["id"]] = n
            if not d["pageInfo"]["hasNextPage"]:
                break
            cur = d["pageInfo"]["endCursor"]
    plan, st = [], collections.Counter()
    for pid, n in kand.items():
        typ, tags = waechter_regel(n["title"], n["productType"], n["tags"], (n["category"] or {}).get("fullName"))
        weg = sorted(set(n["tags"]) - set(tags))
        if typ != n["productType"] or weg:
            plan.append((pid, n["title"], n["productType"], typ, weg))
            st["typ"] += typ != n["productType"]; st["rc-weg"] += bool(weg)
    # 08.10.: Die RC-Kollektion hatte zusätzlich «Titel enthält Bausteine» — Tag weg half nichts. Regeln mitprüfen (nur melden).
    rs = (gql('{collectionByHandle(handle:"spass-elektronik"){ruleSet{rules{column condition}}}}')["collectionByHandle"] or {}).get("ruleSet") or {}
    for r_ in rs.get("rules") or []:
        if r_["column"] == "TITLE" and BAU.search(r_["condition"]) and not RC.search(r_["condition"]):
            print(f"⚠️ RC-Kollektion zieht Bau-/Puzzle-Titel: «{r_['condition']}» (Regel entfernen, Altregel _spass_elektronik_regel_alt_2026-10-08.json)")
    print(f"Kandidaten {len(kand)} · Plan {len(plan)} · {dict(st)}")
    for x in plan[:12]:
        print(f"  {x[1][:55]:55} {x[2]} → {x[3]} · −{x[4]}")
    ok = fe = 0
    if SCHARF and plan:
        # 08.10.: gebündelt (10 Produkte je Mutation + 1 Rücklese-Abfrage) — einzeln waren es 3 Aufrufe/Produkt, ~7/min
        with open(LEDGER, "a", encoding="utf-8") as f:
            for i in range(0, len(plan), 10):
                charge = plan[i:i + 10]
                teile = []
                for k, (pid, titel, alt, typ, weg) in enumerate(charge):
                    if weg:
                        teile.append(f't{k}: tagsRemove(id:"{pid}", tags:{json.dumps(weg)}){{userErrors{{message}}}}')
                    if typ != alt:
                        teile.append(f'p{k}: productUpdate(product:{{id:"{pid}", productType:{json.dumps(typ)}}}){{userErrors{{message}}}}')
                r = gql("mutation{" + " ".join(teile) + "}")
                jetzt = {n["id"]: n for n in gql('query($i:[ID!]!){nodes(ids:$i){... on Product{id productType tags}}}',
                                                  {"i": [x[0] for x in charge]})["nodes"] if n}
                for k, (pid, titel, alt, typ, weg) in enumerate(charge):
                    fehler = [e for a_ in (f"t{k}", f"p{k}") for e in ((r.get(a_) or {}).get("userErrors") or [])]
                    j = jetzt.get(pid) or {}
                    gut = not fehler and j.get("productType") == typ and not (set(weg) & set(j.get("tags") or []))
                    ok += gut; fe += not gut
                    f.write("\t".join([pid.split("/")[-1], "gesetzt" if gut else "fehler", alt, typ, ",".join(weg),
                                       time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), titel[:80]]) + "\n")
                f.flush()
    print(f"FERTIG: SPIELZEUG-TRENNUNG {len(plan)} geplant{f' · gesetzt {ok} · fehler {fe}' if SCHARF else ' (TROCKEN)'} · {dict(st)}")


if __name__ == "__main__":
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien() else 1)
    main()
