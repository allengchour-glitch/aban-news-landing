#!/usr/bin/env python3
"""kleid_rock_tags.py — Kollektionen «Kleider» und «Röcke» an die Kategorie binden (08.10.2026).

ANLASS (Betreiber «weiter fein katalog verbessern»). Die Kollektionen hängen an Tags: `sub-kleider` = Tag
`kategorie-kleid`, `sub-roecke` = Tag `kategorie-rock` (sonst nutzt keine Kollektion `kategorie-*`-Tags ausser Uhren).
GEMESSEN 08.10. (aktive): kategorie-kleid 2'886, davon 57 Röcke, 14 Oberteile, 7 Jumpsuits, 5 Nachthemden, 5 Blusen,
3 Bikinis …; kategorie-rock 240, davon 29 echte Kleider («Schlitz Maxi-Rock Abendkleid», «Sommerkleid») — die standen
bei den Röcken und fehlten bei den Kleidern. Die Kategorie stimmt seit titelprobe_fein.py/kategorie_fein.py (Titel und
Google einig); die Tags kamen aus der CJ-Kategorie beim Import und wurden nie nachgezogen.

REGEL (zwei Signale — Shopify-Kategorie UND Titel — müssen einig sein, sonst nichts):
  Rock-Kategorie (aa-1-15*, Skorts aa-1-16)  + Rockwort im Titel, kein Kleidwort → +kategorie-rock, −kategorie-kleid
  Kleid-Kategorie (aa-1-4*)                  + Kleidwort im Titel                  → +kategorie-kleid, −kategorie-rock
  Oberteil/Hose/Shorts/Nachtwäsche/Jumpsuit/Jacke/Kimono/Bademode + KEIN Kleid- und KEIN Rockwort → beide Tags weg
  Sets, grobe «Clothing», Kinderkleidung (aa-1-25*) → bleiben, wie sie sind.
Schreibt nur tagsAdd/tagsRemove (andere Tags bleiben), Ledger dropship/_kleid_rock_tags.tsv. Täglich im Aufseher.

  python3 automation/kleid_rock_tags.py --kanarien  ·  python3 automation/kleid_rock_tags.py  ·  SCHARF=1 …
"""
import collections, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
import kategorie_fein as kf  # noqa: E402

LEDGER = os.path.join(REPO, "dropship", "_kleid_rock_tags.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
KLEID = "kategorie-kleid"; ROCK = "kategorie-rock"
_W = json.load(open(os.path.join(HIER, "data", "kleid_rock_woerter.json"), encoding="utf-8"))   # auch im Importer (cj_category_fill)
KLEIDWORT = re.compile(_W["kleid"], re.I)
ROCKWORT = re.compile(_W["rock"], re.I)
ANDERE = ("aa-1-13", "aa-1-12", "aa-1-14", "aa-1-17", "aa-1-9", "aa-1-10", "aa-1-23-1", "aa-1-20")


def soll(cid, titel):
    """→ (hinzufügen, entfernen) als Mengen; leere Mengen = nichts."""
    t = titel or ""
    k, r = bool(KLEIDWORT.search(t)), bool(ROCKWORT.search(t))
    if cid.startswith("aa-1-25"):
        return set(), set()
    if (cid.startswith("aa-1-15") or cid.startswith("aa-1-16")) and r and not k:
        return {ROCK}, {KLEID}
    if (cid == "aa-1-4" or cid.startswith("aa-1-4-")) and k:          # «Maxi-Rock Abendkleid»: Kategorie + Kleidwort genügen
        return {KLEID}, {ROCK}
    if cid.startswith(ANDERE) and not k and not r:
        return set(), {KLEID, ROCK}
    return set(), set()


KANARIEN = [   # (Kategorie, Titel, Soll-hinzu, Soll-weg)
    ("aa-1-15", "Weisser A-Linienrock", {ROCK}, {KLEID}),
    ("aa-1-15", "Eleganter Maxi-Jupe mit hoher Taille", {ROCK}, {KLEID}),
    ("aa-1-4", "Elegantes Sommerkleid aus Baumwolle", {KLEID}, {ROCK}),
    ("aa-1-4", "Schlitz Maxi-Rock Abendkleid", {KLEID}, {ROCK}),
    ("aa-1-15", "Rock-Kleid mit Trägern", set(), set()),                # Rock-Kategorie + Kleidwort → unklar
    ("aa-1-4", "Tutu-Kleid", {KLEID}, {ROCK}),
    ("aa-1-13-1", "Apricot-Bluse", set(), {KLEID, ROCK}),
    ("aa-1-17-3", "Loose & Bequemes Nachthemd für Damen", set(), {KLEID, ROCK}),
    ("aa-1-20", "High-Waist Bikini mit Cut-Outs", set(), {KLEID, ROCK}),
    ("aa-1-20", "Strandkleid & Bade-Cover-up für Damen", set(), set()),  # Kleidwort → bleibt
    ("aa-1-13", "Maternitätsshirt mit kurzer Röckchen", set(), set()),  # Rockwort → bleibt
    ("aa-1-11", "Elegante V-Neck Bluse & Maxi-Rock Set", set(), set()),  # Set → bleibt
    ("aa-1", "Elegant Schulterfrei", set(), set()),                      # grob → bleibt
    ("aa-1-25-4", "Mädchen Prinzessinnenkleid", set(), set()),           # Kinder → nie
    ("aa-1-13", "Kleiderbügel-Set aus Holz", set(), {KLEID, ROCK}),      # «Kleider-Bügel» ist kein Kleid
    ("aa-1-4", "Garderobe mit Spiegel", set(), set()),
]


def kanarien():
    ok = 0
    for cid, t, a, w in KANARIEN:
        ist = soll(cid, t)
        gut = ist == (a, w); ok += gut
        if not gut:
            print(f"  ✗ {cid} {t!r} → {ist} (soll {(a, w)})")
    print(f"KLEID-ROCK-KANARIEN {ok}/{len(KANARIEN)}")
    return ok == len(KANARIEN)


def main():
    from kaufwille_zeile import gql
    if not kanarien():
        raise SystemExit("Kanarienvögel gescheitert — nichts geschrieben")
    kf.export_holen()
    kat = {}
    for l in open(kf.EXPORT, encoding="utf-8"):
        p = json.loads(l)
        kat[p["id"]] = (((p.get("category") or {}).get("id") or "").split("/")[-1], p["title"])
    tags = collections.defaultdict(set)
    for tag in (KLEID, ROCK):
        cur = None
        while True:
            d = gql('query($q:String!,$c:String){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} nodes{id}}}',
                    {"q": f"tag:{tag} status:active", "c": cur})["products"]
            for n in d["nodes"]:
                tags[n["id"]].add(tag)
            if not d["pageInfo"]["hasNextPage"]:
                break
            cur = d["pageInfo"]["endCursor"]
    plan = []; st = collections.Counter()
    for pid, (cid, titel) in kat.items():
        hinzu, weg = soll(cid, titel)
        hinzu -= tags[pid]; weg &= tags[pid]
        if hinzu or weg:
            plan.append((pid, titel, sorted(hinzu), sorted(weg)))
            for t in hinzu: st[f"+{t}"] += 1
            for t in weg: st[f"-{t}"] += 1
    print("Plan:", len(plan), dict(st))
    for pid, t, a, w in plan[:25]:
        print(f"  {t[:60]:60} +{a} −{w}")
    ok = fe = 0
    if SCHARF and plan:
        with open(LEDGER, "a", encoding="utf-8") as f:
            for pid, t, a, w in plan:
                fehler = []
                if a:
                    fehler += gql('mutation($i:ID!,$t:[String!]!){tagsAdd(id:$i,tags:$t){userErrors{message}}}', {"i": pid, "t": a})["tagsAdd"]["userErrors"]
                if w:
                    fehler += gql('mutation($i:ID!,$t:[String!]!){tagsRemove(id:$i,tags:$t){userErrors{message}}}', {"i": pid, "t": w})["tagsRemove"]["userErrors"]
                jetzt = set(gql('query($i:ID!){product(id:$i){tags}}', {"i": pid})["product"]["tags"])
                gut = not fehler and set(a) <= jetzt and not (set(w) & jetzt)
                ok += gut; fe += not gut
                f.write("\t".join([pid.split("/")[-1], "gesetzt" if gut else "fehler", "+" + ",".join(a), "-" + ",".join(w),
                                   time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), t[:80]]) + "\n")
    print(f"KLEID-ROCK-TAGS: {len(plan)} geplant{f' · gesetzt {ok} · fehler {fe}' if SCHARF else ' (TROCKEN)'} · {dict(st)}")


if __name__ == "__main__":
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien() else 1)
    main()
