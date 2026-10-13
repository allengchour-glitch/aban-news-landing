#!/usr/bin/env python3
"""gsc_schnappschuss.py — Search-Console-Seiten (OpenSEO) → dropship/_gsc_seiten.json (13.10.2026).

Search Console ist hier nur über den OpenSEO-Konnektor einer Claude-Sitzung lesbar (kein Schlüssel im Container).
Die Verbesserungsrunde ruft einmal täglich
    mcp OpenSEO get_search_console_performance  projectId 443c940c-93c9-4feb-9d0c-1e4d1d88c6cf,
    dimensions ["page"], dateRange last_28_days, rowLimit 1000          (0 Credits)
auf. Ist die Antwort zu gross, legt der Harness sie als Datei ab; dieses Skript macht daraus den Schnappschuss, den
automation/tote_landeseiten.py (GSC=1) liest. Daten gibt es erst ab 04.10.2026 — «tage» zählt nur Tage mit Daten.

    python3 tools/gsc_schnappschuss.py <antwortdatei.json>
"""
import datetime as dt, json, os, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIEL = os.path.join(REPO, "dropship", "_gsc_seiten.json")
ERSTER_DATENTAG = dt.date(2026, 10, 4)


def main():
    if len(sys.argv) < 2:
        print(__doc__); return 2
    d = json.load(open(sys.argv[1], encoding="utf-8"))
    if not d.get("ok") or "rows" not in d:
        print("Antwort ohne rows/ok — kein Schnappschuss"); return 1
    if d.get("hasMore"):
        print("⚠️ hasMore=true — mehr als 1000 Seiten, startRow nachladen (Schnappschuss wäre unvollständig)"); return 1
    start = max(dt.date.fromisoformat(d["startDate"]), ERSTER_DATENTAG)
    tage = (dt.date.fromisoformat(d["endDate"]) - start).days + 1
    zeilen = [{"page": (r.get("keys") or [r.get("page")])[0], "clicks": r.get("clicks", 0),
               "impressions": r.get("impressions", 0), "position": round(r.get("position") or 0, 1)} for r in d["rows"]]
    out = {"stand": dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "von": str(start), "bis": d["endDate"],
           "tage": tage, "quelle": "OpenSEO get_search_console_performance [page] last_28_days", "zeilen": zeilen}
    json.dump(out, open(ZIEL, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"FERTIG: {len(zeilen)} Seiten, {tage} Tage Daten → {os.path.relpath(ZIEL, REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
