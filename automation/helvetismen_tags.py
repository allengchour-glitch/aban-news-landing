"""Schweizer Suchwörter als unsichtbare Tags: Natel, Trottinett, Finken.

Befund 23.09.2026 (Audit, WebFetch der Live-Suche): «Natel» lieferte unter den ersten 10 Treffern
kein einziges Handy-Zubehör (UV-Nagellampe, Body Shaper …), «Trottinett» null Scooter, «Finken»
3 von 8 — obwohl 272 Handy-, 20 Scooter- und 164 Hausschuh-Produkte aktiv sind. Velo, Jupe und
Portemonnaie funktionierten bereits. Die Shop-Suche findet Tags; ein Tag ist für die Kundin
unsichtbar und ändert weder Titel, Feed noch Kollektionsregeln (Muster: suchwort_tags.py).

Schreibt mit tagsAdd (ergänzt, ersetzt nie). DRY=1 zeigt Treffer und abgewiesene Ausnahmen.
"""
import json, os, re, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from eimer_etikette import nachlauf  # noqa: E402
except Exception:  # pragma: no cover
    def nachlauf(d):
        return None

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_helvetismen_tags.txt"

# Tag → (Suchvorfilter, Titelmuster, Ausnahme)
REGELN = {
    "natel": ("title:*handy* OR title:*smartphone* OR title:*iphone*",
              re.compile(r"handy|smartphone|iphone", re.I),
              re.compile(r"smartwatch", re.I)),
    "trottinett": ("title:*scooter* OR title:*tretroller* OR title:*kickboard*",
                   re.compile(r"scooter|tretroller|kickboard", re.I),
                   re.compile(r"motorrad|vespa", re.I)),
    # «Slipper» ist auch ein Schuh (Loafer) oder ein Unterwäsche-Slip → nur mit Haus-Hinweis.
    "finken": ("title:*hausschuh* OR title:*pantoffel* OR title:*slipper* OR title:*puschen*",
               re.compile(r"hausschuh|pantoffel|puschen|slipper.*(haus|plüsch|flausch|warm|winter|indoor|home)|"
                          r"(haus|plüsch|flausch|warm|winter|indoor|home).*slipper", re.I),
               re.compile(r"loafer|unterwäsche|dessous|\bslip\b", re.I)),
}


def gql(q, v=None):
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "-m", "60", "-X", "POST",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "-d", json.dumps({"query": q, "variables": v or {}})],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(5)
            continue
        if any("THROTTLED" in json.dumps(e) for e in d.get("errors") or []):
            time.sleep(10)
            continue
        nachlauf(d)
        return d
    raise SystemExit("ABBRUCH: Shopify antwortet nicht")


def produkte(vorfilter):
    nach = None
    while True:
        d = gql("""query($q:String,$n:String){products(first:250,after:$n,query:$q){
          pageInfo{hasNextPage endCursor} nodes{id title tags}}}""",
                {"q": f"status:active AND ({vorfilter})", "n": nach})
        p = d["data"]["products"]
        yield from p["nodes"]
        if not p["pageInfo"]["hasNextPage"]:
            return
        nach = p["pageInfo"]["endCursor"]


def main():
    gesamt = 0
    for tag, (vor, muster, ausnahme) in REGELN.items():
        treffer, weg = [], []
        for p in produkte(vor):
            t = p["title"]
            if tag in [x.lower() for x in p["tags"]]:
                continue
            if not muster.search(t):
                continue
            if ausnahme.search(t):
                weg.append(t)
                continue
            treffer.append(p)
        print(f"{tag}: {len(treffer)} neu · {len(weg)} Ausnahmen")
        for t in weg[:8]:
            print(f"   ✗ {t[:80]}")
        for p in treffer[:6 if DRY else 0]:
            print(f"   ✓ {p['title'][:80]}")
        if DRY:
            continue
        for p in treffer:
            r = gql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}",
                    {"id": p["id"], "t": [tag]})
            if (r.get("data") or {}).get("tagsAdd", {}).get("userErrors"):
                print("   FEHLER", p["title"][:60], r["data"]["tagsAdd"]["userErrors"])
                continue
            gesamt += 1
            with open(LEDGER, "a") as f:
                f.write(f"{time.strftime('%Y-%m-%d')}\t{p['id']}\t{tag}\t{p['title'][:70]}\n")
    print(f"FERTIG: {gesamt} Tags gesetzt{' (DRY)' if DRY else ''}")


if __name__ == "__main__":
    main()
