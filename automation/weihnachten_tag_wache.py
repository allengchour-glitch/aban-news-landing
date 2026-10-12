#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""weihnachten_tag_wache.py — das Tag «weihnachten» muss verdient sein (12.10.2026).

ANLASS (GEMESSEN 12.10., Workflow-Prüfer «Neuimporte», gegengeprüft): Die CJ-Gruppe «cjpartydeko»
(automation/cj_groups_extra.json) hängt «weihnachten» fest an ALLE sechs CJ-Kategorien — auch Kunstblumen, Tortendeko,
Partymasken, Einladungskarten. 77 Neuimporte in 48 h trugen das Tag, 35 ohne jeden Weihnachtsbezug. In der Kollektion
«Weihnachten 🎄» (weihnachten-2026, Tag-Regel, neueste zuerst; Startseiten-Reihe 7, Hauptmenü) waren 62 von 344 aktiven
ohne Weihnachtsbezug, auf der Startseite 5 von 8 Karten (Gestrickter Blumenstrauss, Hochzeitskleid-Modell, Mona-Lisa-Sisal).

REGEL (data/weihnachten_tag_regel.json, dieselbe Datei liest der Importer cj_category_fill.mjs):
  «weihnachten» bleibt, wenn der TITEL ein Weihnachtswort trägt. Nur bei Produkten der Gruppentypen aus
  «nur_gruppen_typen» (Partydeko & Ballone) wird ein unverdientes Tag entfernt — andere Quellen werden nur gemeldet.
  Das Produkt bleibt im Shop und in seinen Sachkollektionen; es verliert nur die Weihnachtsreihe.
Ledger dropship/_weihnachten_tag.tsv (Rückweg: Tag wieder setzen). Standard: TROCKEN; SCHARF=1 schreibt + liest zurück.

  python3 automation/weihnachten_tag_wache.py [--kanarien]
"""
import json, os, re, sys, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
REGEL = json.load(open(os.path.join(REPO, "data", "weihnachten_tag_regel.json"), encoding="utf-8"))
WORT = re.compile(REGEL["weihnachtswort"], re.I)
TYPEN = set(REGEL["nur_gruppen_typen"])
LEDGER = os.path.join(REPO, "dropship", "_weihnachten_tag.tsv")
BERICHT = os.path.join(REPO, "dropship", "WEIHNACHTEN-TAG.md")
SCHARF = os.environ.get("SCHARF") == "1"


def verdient(titel):
    return bool(WORT.search(titel or ""))


def kanarien():
    f = 0
    for titel, soll in REGEL["kanarien"]:
        ist = verdient(titel)
        f += ist != soll
        print(f"  {'OK  ' if ist == soll else 'FEHL'} {titel} → {ist}")
    print(f"KANARIEN {len(REGEL['kanarien']) - f}/{len(REGEL['kanarien'])}")
    return 0 if not f else 1


def main():
    from seo_autopilot import gql
    try:
        from eimer_etikette import nachlauf
    except Exception:
        nachlauf = None
    weg, nur_melden, ok, cur = [], [], 0, None
    while True:
        d = gql('query($c:String){ products(first:250, after:$c, query:"tag:weihnachten status:active"){ pageInfo{hasNextPage endCursor} '
                'nodes{ id handle title productType tags } } }', {"c": cur})
        pg = d["products"]
        for p in pg["nodes"]:
            if "weihnachten" not in p["tags"]:
                continue
            if verdient(p["title"]):
                ok += 1
            elif p["productType"] in TYPEN:
                weg.append(p)
            else:
                nur_melden.append(p)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
    geschrieben = fehler = 0
    if SCHARF:
        for p in weg:
            r = gql('mutation($id:ID!,$t:[String!]!){ tagsRemove(id:$id, tags:$t){ userErrors{ message } } }',
                    {"id": p["id"], "t": ["weihnachten"]})
            if (r.get("tagsRemove") or {}).get("userErrors"):
                fehler += 1; continue
            n = gql('query($id:ID!){ product(id:$id){ tags } }', {"id": p["id"]}).get("product") or {}
            if "weihnachten" in (n.get("tags") or []):
                fehler += 1; continue
            geschrieben += 1
            with open(LEDGER, "a", encoding="utf-8") as f:
                f.write(f"{p['handle']}\t{time.strftime('%Y-%m-%d')}\tweihnachten-entfernt\t{p['title'][:80]}\n")
            time.sleep(0.3)
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Tag «weihnachten» ohne Weihnachtsbezug — Stand {time.strftime('%Y-%m-%d %H:%M')} UTC\n\n"
                f"Aktiv mit Tag: {ok + len(weg) + len(nur_melden)} · verdient (Weihnachtswort im Titel): {ok} · "
                f"unverdient Partydeko: {len(weg)}{f' → entfernt {geschrieben}, Fehler {fehler}' if SCHARF else ' (TROCKEN)'} · "
                f"unverdient andere Quelle (nur gemeldet): {len(nur_melden)}\n\nRegel: `data/weihnachten_tag_regel.json`.\n\n"
                "## Unverdient, Partydeko\n" + "\n".join(f"- {p['title'][:90]} (`{p['handle']}`)" for p in weg[:200]) +
                "\n\n## Unverdient, andere Quelle (nur gemeldet)\n" + "\n".join(f"- {p['title'][:90]} — {p['productType']} (`{p['handle']}`)" for p in nur_melden[:200]) + "\n")
    print(f"WEIHNACHTEN-TAG: {ok} verdient · {len(weg)} unverdient Partydeko"
          f"{f' → entfernt {geschrieben}, Fehler {fehler}' if SCHARF else ' (TROCKEN)'} · {len(nur_melden)} andere nur gemeldet → dropship/WEIHNACHTEN-TAG.md")
    return 0 if not fehler else 1


if __name__ == "__main__":
    sys.exit(kanarien() if "--kanarien" in sys.argv else main())
