#!/usr/bin/env python3
"""saison_tags_nachtragen.py — Saison-Tags für Neuware nachtragen (02.10.2026, 12-Tage-Plan Tag 2).

ANLASS: Startseiten-Reihe «Halloween» (Sektion pl_kinder → Kollektion `halloween`, Regel Tag = halloween, CREATED_DESC)
zeigte am 02.10. als neuesten Artikel einen vom 03.09. — obwohl der Grind seit 01.10. 16:20 Halloween-Ware importiert
(«Halloween Hexenhut Nachtlicht», «Halloween-Zauberkrug Gartenlicht», «Baby‑Romper Halloween mit Kapuze» …).
Das Tag `halloween` setzten nur Fortura- und BigBuy-Importer; `cj_sku_import.mjs` nie. 9 aktive Produkte mit
«Halloween» im Titel standen ausserhalb der Reihe, alle vom 01.10.

Regel (eine Quelle: SAISON in diesem Skript, gespiegelt in automation/cat_tags.mjs `saisonTags`):
  Titel enthält «halloween» (auch Komposita: «Halloween-Deko», «Halloweenkostüm») → Tag `halloween`.
  Bewusst NUR der Titel: der CJ-Suchbegriff («halloween decoration») trifft auch neutrale Lampen und Kissen.
Nur hinzufügen, nie entfernen. Nur ACTIVE. Rücklesen nach jedem Schreiben.

  python3 automation/saison_tags_nachtragen.py              # Trockenlauf (Standard)
  SCHARF=1 python3 automation/saison_tags_nachtragen.py     # schreibt (Tageswächter im Aufseher)
  python3 automation/saison_tags_nachtragen.py --kanarienvogel
"""
import json, os, re, sys, time, unicodedata, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
try:
    from eimer_etikette import nachlauf
except Exception:  # pragma: no cover
    def nachlauf(d):
        return 0.0

URL = "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json"
SCHARF = os.environ.get("SCHARF") == "1"

# (Tag, Muster auf dem normalisierten Titel, Shopify-Suchanfrage zum Vorfiltern)
SAISON = [
    ("halloween", re.compile(r"halloween"), "status:active AND title:Halloween*"),
    # 12.10.2026 (Messrunde «Saison», Gegenprüfung bestätigt): 12 echte Kalender, alle 02.–12.10. importiert, standen ausserhalb
    # der Kollektion «Adventskalender» (15 aktiv) — kurz vor dem CJ-Bestellschluss (~13.–15.11.). Freitext-Suche als Vorfilter:
    # `title:*kalender*` fand 5 von 6 Kompositen NICHT («Filz-Adventskalender», «Schlittenkalender»).
    ("adventskalender", re.compile(r"advent-?s?kalender|weihnachtskalender|weihnachts-?countdown|schlittenkalender"),
     "status:active AND (kalender OR adventskalender OR weihnachtskalender OR countdown OR schlittenkalender)",
     re.compile(r"halloween|\beid\b|ramadan|beauty")),   # Halloween-Countdown, Eid-Kalender; «Beauty» schliesst die Kollektionsregel aus
]


def norm(t):
    return unicodedata.normalize("NFD", (t or "").lower()).encode("ascii", "ignore").decode()


def tags_fuer(titel):
    s = norm(titel)
    return [e[0] for e in SAISON if e[1].search(s) and not (len(e) > 3 and e[3].search(s))]


def gql(q, v=None):
    tok = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read()).strip()
    letzter = ""
    for a in range(6):
        try:
            r = urllib.request.Request(URL, data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                       headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=60))
            if j.get("data") is not None and not j.get("errors"):
                nachlauf(j)
                return j["data"]
            letzter = json.dumps(j.get("errors"))[:200]
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
        time.sleep(4 + 3 * a)
    print("Shopify-Fehler: " + letzter, file=sys.stderr)
    raise RuntimeError(letzter)


def kanarienvogel():
    faelle = [("Halloween Hexenhut Nachtlicht", ["halloween"]),
              ("Halloween-Zauberkrug Gartenlicht", ["halloween"]),
              ("Baby‑Romper Halloween mit Kapuze", ["halloween"]),
              ("Aufblasbares Halloweenkostüm für zwei Personen", ["halloween"]),
              ("Samt-Kürbis Kissen", []),                      # Herbstdeko, kein Halloween-Bezug im Titel
              ("Ghost Magic Book Nachtlicht", []),             # nur der Suchbegriff war Halloween
              ("Nordische Nachttischlampe Touch", []),
              ("DIY Filz-Adventskalender zum Aufhängen", ["adventskalender"]),
              ("Weihnachts-Schlittenkalender aus Schima superba", ["adventskalender"]),
              ("Weihnachtskalender aus MDF – mit 24 Tagesfächern", ["adventskalender"]),
              ("Weihnachts-Countdown-Dekoration mit Glöckchen", ["adventskalender"]),
              ("Halloween Adventskalender Zwerge", ["halloween"]),   # Halloween-Countdown gehört nicht in den Advent
              ("Eid Mubarak Countdown-Kalender aus Filz", []),
              ("Adventure Rucksack für Outdoor & Sport", []),
              ("Beauty Adventskalender 24 Tage", [])]
    ok = 0
    for t, soll in faelle:
        ist = tags_fuer(t)
        ok += ist == soll
        print(f"{'✓' if ist == soll else '✗'} {t} → {ist} (soll {soll})")
    print(f"Kanarienvögel {ok}/{len(faelle)}")
    return 0 if ok == len(faelle) else 1


def main():
    if "--kanarienvogel" in sys.argv:
        return kanarienvogel()
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())} · {'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    gesetzt = fehler = 0
    for tag, muster, suche, *_ in SAISON:
        prod, c = {}, None
        while True:
            d = gql('query($c:String,$q:String!){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
                    'nodes{id title status tags}}}', {"c": c, "q": suche})["products"]
            for n in d["nodes"]:
                prod[n["id"]] = n
            if not d["pageInfo"]["hasNextPage"]:
                break
            c = d["pageInfo"]["endCursor"]
        offen = [n for n in prod.values() if n["status"] == "ACTIVE" and tag in tags_fuer(n["title"]) and tag not in n["tags"]]
        print(f"{tag}: {len(prod)} Treffer der Suche, {len(offen)} ohne Tag", flush=True)
        for n in offen:
            if not SCHARF:
                print(f"  (trocken) + {tag}: {n['title']}")
                continue
            r = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){node{... on Product{tags}} userErrors{message}}}',
                    {"id": n["id"], "t": [tag]})["tagsAdd"]
            if not r["userErrors"] and tag in ((r.get("node") or {}).get("tags") or []):
                gesetzt += 1
                print(f"  + {tag}: {n['title']}", flush=True)
            else:
                fehler += 1
                print(f"  ✗ {n['title']}: {r['userErrors']}", flush=True)
    print(f"FERTIG: {gesetzt} gesetzt, {fehler} Fehler", flush=True)
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
