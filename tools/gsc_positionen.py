#!/usr/bin/env python3
"""gsc_positionen.py — Search-Console-Antworten (query × page) → Positions-Schnappschuss für die Zielbegriffe (18.10.2026).

ANLASS: Die Semrush-Einheiten sind aufgebraucht (Konnektor meldet «active subscription, no API units», 18.10.). Der eigene Tracker
`automation/semrush_positionen.py` liest deshalb zusätzlich Schnappschüsse mit `_gsc_` im Dateinamen. Search Console ist nur über den
OpenSEO-Konnektor einer Sitzung lesbar (0 Credits); die Sitzung ruft

    mcp OpenSEO get_search_console_performance  projectId 443c940c-93c9-4feb-9d0c-1e4d1d88c6cf, dimensions ["query","page"],
    startDate/endDate (≥ 7 Tage, Ende ≤ heute − 3), rowLimit 1000, danach startRow 1000, 2000 … solange hasMore=true

auf — der Harness legt grosse Antworten als Datei ab — und führt sie hier zusammen:

    python3 tools/gsc_positionen.py <antwort_0.json> [<antwort_1000.json> …]      # schreibt dropship/semrush/positionen/<heute>_gsc_<von>-<bis>.csv
    python3 tools/gsc_positionen.py --selbsttest

Je Zielbegriff (dropship/semrush/position_tracking_ziele.tsv) zählt die Seite mit den meisten Impressionen; Position = Mittel dieser
Zeile (gerundet, exakt in `PositionExakt`). ⚠️ Search Console zeigt nur Begriffe mit Impressionen: ein fehlender Begriff heisst NICHT
«Platz > 100». Mittel über Handy/PC ≠ Semrush-Rang zum Zeitpunkt — der Tracker vergleicht deshalb nur gleiche Quellen.
"""
import collections, csv, datetime as dt, json, os, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIELE = os.path.join(REPO, "dropship", "semrush", "position_tracking_ziele.tsv")
ORDNER = os.path.join(REPO, "dropship", "semrush", "positionen")


def lies(pfad):
    d = json.load(open(pfad, encoding="utf-8"))
    if isinstance(d, list) and d and isinstance(d[0], dict) and "text" in d[0]:
        d = json.loads(d[0]["text"])
    return d


def zusammenfuehren(antworten, ziele):
    """→ (fenster, [(keyword, position_gerundet, url, impressionen, klicks, exakt)]); wirft ValueError mit Grund."""
    if not antworten:
        raise ValueError("keine Antwort")
    fenster = {(a.get("startDate"), a.get("endDate")) for a in antworten}
    if len(fenster) != 1:
        raise ValueError(f"verschiedene Fenster: {sorted(fenster)}")
    if antworten[-1].get("hasMore"):
        raise ValueError("letzte Antwort meldet hasMore=true — nächste Seite (startRow) fehlt")
    if any(a.get("dimensions") != ["query", "page"] for a in antworten):
        raise ValueError("Dimensionen müssen [query, page] sein")
    je = collections.defaultdict(list)
    for a in antworten:
        for r in a.get("rows", []):
            q, p = r["keys"]
            k = q.strip().lower()
            if k in ziele:
                je[k].append((r["impressions"], r["position"], p.split("?")[0], r["clicks"]))
    zeilen = []
    for k, v in sorted(je.items()):
        imp, pos, url, _ = max(v)
        zeilen.append((k, max(1, round(pos)), url, sum(x[0] for x in v), sum(x[3] for x in v), round(pos, 1)))
    return fenster.pop(), zeilen


def ziele_lesen():
    return {r["keyword"].strip().lower() for r in csv.DictReader(open(ZIELE, encoding="utf-8"), delimiter="\t")}


def schreiben(fenster, zeilen, heute=None):
    heute = heute or dt.date.today().isoformat()
    von, bis = (fenster[0][5:].replace("-", ""), fenster[1][5:].replace("-", ""))
    pfad = os.path.join(ORDNER, f"{heute}_gsc_{von}-{bis}.csv")
    with open(pfad, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Keyword", "Position", "Url", "Impressionen", "Klicks", "PositionExakt"])
        w.writerows(zeilen)
    return pfad


def selbsttest():
    a1 = {"startDate": "2026-10-08", "endDate": "2026-10-15", "dimensions": ["query", "page"], "hasMore": True, "rows": [
        {"keys": ["Schlafmaske", "https://luxestyle.ch/products/a?variant=1"], "clicks": 0, "impressions": 3, "position": 60.4},
        {"keys": ["schlafmaske", "https://luxestyle.ch/products/b"], "clicks": 1, "impressions": 9, "position": 41.6},
        {"keys": ["fremdbegriff", "https://luxestyle.ch/"], "clicks": 0, "impressions": 50, "position": 2}]}
    a2 = {"startDate": "2026-10-08", "endDate": "2026-10-15", "dimensions": ["query", "page"], "hasMore": False, "rows": [
        {"keys": ["mini ventilator", "https://luxestyle.ch/products/c"], "clicks": 0, "impressions": 2, "position": 0.4}]}
    z = {"schlafmaske", "mini ventilator", "ohne treffer"}
    f, zl = zusammenfuehren([a1, a2], z)
    fehler = []
    if zl != [("mini ventilator", 1, "https://luxestyle.ch/products/c", 2, 0, 0.4),
              ("schlafmaske", 42, "https://luxestyle.ch/products/b", 12, 1, 41.6)]:
        fehler.append(f"Zusammenführung: {zl}")
    for schlecht, grund in ((([a1]), "hasMore"), (([a2, dict(a2, startDate="2026-10-01")]), "Fenster"),
                            (([dict(a2, dimensions=["query"])]), "Dimensionen")):
        try:
            zusammenfuehren(schlecht, z)
            fehler.append(f"{grund} nicht abgelehnt")
        except ValueError:
            pass
    print("SELBSTTEST gsc_positionen:", "OK (Seite mit meisten Impressionen, Position ≥ 1, 3 Ablehnungen)" if not fehler else "FEHLER " + "; ".join(fehler))
    return 0 if not fehler else 1


def main():
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    pfade = [a for a in sys.argv[1:] if not a.startswith("--")]
    try:
        fenster, zeilen = zusammenfuehren([lies(p) for p in pfade], ziele_lesen())
    except (ValueError, OSError, KeyError) as e:
        print("gsc_positionen: ABGEBROCHEN —", e)
        sys.exit(1)
    print(schreiben(fenster, zeilen), len(zeilen), "Zielbegriffe mit Impressionen")


if __name__ == "__main__":
    main()
