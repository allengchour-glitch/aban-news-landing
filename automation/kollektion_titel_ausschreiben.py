#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""kollektion_titel_ausschreiben.py — Kollektionstitel ohne Ergänzungsstrich (12.10.2026).

ANLASS (Messrunde 12.10., Prüfer «Suche & Navigation»): Die Vorschlagsliste der Shop-Suche findet Kollektionen nur über
den TITEL. «Lauf- & Sportschuhe» (1'353 Produkte, Hauptmenü) wird mit «laufschuhe» nicht gefunden — gemessen 20 von 20
ausgeschriebenen Wörtern ohne Treffer (suggest.json, resources[type]=collection). 19 Kollektionen hatten so einen Titel.

REGEL: «X- & Yz» → «X<kopf> & Yz», der Kopf ist das Grundwort von Yz («Sportschuhe» → «schuhe»; mit Bindestrich
«Business-Rucksäcke» → «Rucksäcke»). Englische/Fremd-Bestimmungswörter (Unisex, Laptop, Baby, Smoke) bekommen einen
Bindestrich («Laptop-Rucksäcke»). Titel ohne erkennbares Grundwort werden nur gemeldet. Nur der Titel ändert sich —
Handle (URL), SEO-Titel und Menü-Beschriftungen bleiben.

  python3 automation/kollektion_titel_ausschreiben.py            Trockenlauf
  SCHARF=1 python3 automation/kollektion_titel_ausschreiben.py   schreiben + zurücklesen (Aufseher täglich; neue Kollektionen)
  python3 automation/kollektion_titel_ausschreiben.py --kanarien
"""
import json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
SCHARF = os.environ.get("SCHARF") == "1"
LEDGER = os.path.join(REPO, "dropship", "_kollektion_titel_ausgeschrieben.tsv")
MUSTER = re.compile(r"\b([A-ZÄÖÜ][\wäöüß]*)-\s+(&|und|oder)\s+([A-ZÄÖÜ][\wäöüß-]*)")
GRUNDWOERTER = ["rucksäcke", "schuhe", "spiele", "pflege", "werkzeug", "decken", "licht", "kostüme", "lampen", "leuchten",
                "figuren", "sets", "zubehör", "taschen", "uhren", "kleider", "hosen", "jacken", "möbel", "geräte", "artikel"]
MIT_STRICH = {"Unisex", "Laptop", "Baby", "Smoke", "Business", "Outdoor", "Party"}   # «Actionfiguren» schreibt man zusammen


def grundwort(y):
    if "-" in y:
        return y.rsplit("-", 1)[1]
    yl = y.lower()
    for g in sorted(GRUNDWOERTER, key=len, reverse=True):
        if yl.endswith(g) and len(yl) > len(g):
            return g
    return None


def neuer_titel(titel):
    m = MUSTER.search(titel)
    if not m:
        return None
    x, und, y = m.groups()
    g = grundwort(y)
    if not g:
        return None
    if x in MIT_STRICH:
        links = f"{x}-{g[:1].upper()}{g[1:]}"
    else:
        links = x + g.lower()
    return titel[:m.start()] + f"{links} {und} {y}" + titel[m.end():]


def kanarien():
    faelle = [("Lauf- & Sportschuhe", "Laufschuhe & Sportschuhe"),
              ("Laptop- & Business-Rucksäcke", "Laptop-Rucksäcke & Business-Rucksäcke"),
              ("Gesichts- & Hautpflege", "Gesichtspflege & Hautpflege"),
              ("Baby- & Kinder-Sets", "Baby-Sets & Kinder-Sets"),
              ("Raucher- & Dreh-Zubehör (18+)", "Raucherzubehör & Dreh-Zubehör (18+)"),
              ("Unisex- & Tierkostüme", "Unisex-Kostüme & Tierkostüme"),
              ("Steh- & Deckenlampen", "Stehlampen & Deckenlampen"),
              ("Damenmode – unsere Favoriten", None),
              ("Geschenke für Sie & Ihn", None)]
    ok = 0
    for t, soll in faelle:
        ist = neuer_titel(t)
        ok += ist == soll
        print(f"{'✓' if ist == soll else '✗'} {t} → {ist}")
    print(f"KANARIEN {ok}/{len(faelle)}")
    return 0 if ok == len(faelle) else 1


def main():
    from seo_autopilot import gql
    cur, liste = None, []
    while True:
        d = gql('query($c:String){collections(first:250,after:$c){pageInfo{hasNextPage endCursor} nodes{id handle title}}}', {"c": cur})["collections"]
        liste += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    gesetzt = gemeldet = fehler = 0
    for c in liste:
        if not MUSTER.search(c["title"]):
            continue
        neu = neuer_titel(c["title"])
        if not neu:
            gemeldet += 1; print(f"  ? kein Grundwort: {c['title']} ({c['handle']})"); continue
        if not SCHARF:
            print(f"  (trocken) {c['title']} → {neu}"); continue
        r = gql('mutation($c:CollectionInput!){collectionUpdate(input:$c){collection{title} userErrors{message}}}',
                {"c": {"id": c["id"], "title": neu}})["collectionUpdate"]
        if r["userErrors"] or (r.get("collection") or {}).get("title") != neu:
            fehler += 1; print(f"  ✗ {c['handle']}: {r['userErrors']}"); continue
        gesetzt += 1
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{c['handle']}\t{time.strftime('%Y-%m-%d')}\t{c['title']}\t{neu}\n")
    print(f"KOLLEKTIONSTITEL: {len(liste)} geprüft · {'gesetzt ' + str(gesetzt) if SCHARF else 'trocken'} · ohne Grundwort {gemeldet} · Fehler {fehler}")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(kanarien() if "--kanarien" in sys.argv else main())
