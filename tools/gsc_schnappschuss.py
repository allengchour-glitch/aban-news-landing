#!/usr/bin/env python3
"""gsc_schnappschuss.py — Search-Console-Seiten (OpenSEO) → dropship/_gsc_seiten.json (13.10.2026).

Search Console ist hier nur über den OpenSEO-Konnektor einer Claude-Sitzung lesbar (kein Schlüssel im Container).
Die Verbesserungsrunde ruft einmal täglich (0 Credits)
    mcp OpenSEO get_search_console_performance  projectId 443c940c-93c9-4feb-9d0c-1e4d1d88c6cf,
    dimensions ["page"], dateRange last_28_days, rowLimit 1000,
    filters [{dimension:"page", operator:"contains", expression:"/products/"}],  startRow 0
auf — und solange die Antwort hasMore=true meldet, erneut mit startRow 1000, 2000 … Jede Antwort landet als Datei
(der Harness legt grosse Antworten selbst ab); dieses Skript führt ALLE Seiten zusammen:

    python3 tools/gsc_schnappschuss.py <antwort_0.json> [<antwort_1000.json> …]
    python3 tools/gsc_schnappschuss.py --selbsttest

Prüfung 13.10. (Workflow wf_1c367cd7-abd, Befund bestätigt): die erste Fassung nahm EINE Datei und brach bei hasMore ab
— schon nach 7 Datentagen waren es 912 Seiten, ab ~1'000 wäre der Schnappschuss täglich gescheitert und der GSC-Teil von
tote_landeseiten.py nach 3 Tagen blind geworden. Abschneiden wäre falsch: hinter den Klick-Seiten sortiert GSC beliebig.
Jetzt: mehrere Dateien, gleiches Fenster (startDate/endDate) Pflicht, nur die LETZTE darf hasMore=false melden, Seiten
werden nach URL zusammengeführt. Der Filter «/products/» hält die Zahl klein (tote_landeseiten liest nur Produktseiten).
Daten gibt es erst ab 04.10.2026 — «tage» zählt nur Tage mit Daten.
"""
import datetime as dt, json, os, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIEL = os.path.join(REPO, "dropship", "_gsc_seiten.json")
ERSTER_DATENTAG = dt.date(2026, 10, 4)


def lies(pfad):
    d = json.load(open(pfad, encoding="utf-8"))
    # Der Harness legt Antworten teils als [{"type":"text","text":"{…}"}] ab
    if isinstance(d, list) and d and isinstance(d[0], dict) and "text" in d[0]:
        d = json.loads(d[0]["text"])
    return d


def zusammenfuehren(antworten):
    """→ (fenster(start, ende), zeilen) oder wirft ValueError mit Grund."""
    if not antworten:
        raise ValueError("keine Antwort")
    fenster = set()
    for i, d in enumerate(antworten):
        if not d.get("ok") or "rows" not in d:
            raise ValueError(f"Antwort {i + 1}: ohne rows/ok")
        fenster.add((d.get("startDate"), d.get("endDate")))
        letzte = i == len(antworten) - 1
        if d.get("hasMore") and letzte:
            raise ValueError(f"Antwort {i + 1} (letzte) meldet hasMore=true — startRow {1000 * (i + 1)} nachladen")
        if not d.get("hasMore") and not letzte:
            raise ValueError(f"Antwort {i + 1} meldet hasMore=false, danach kommen noch {len(antworten) - i - 1} — Reihenfolge?")
    if len(fenster) != 1:
        raise ValueError(f"verschiedene Zeitfenster: {sorted(fenster)}")
    seiten = {}
    for d in antworten:
        for r in d["rows"]:
            page = (r.get("keys") or [r.get("page")])[0]
            if not page:
                continue
            k, i, _ = seiten.get(page, (0, 0, 0))
            pos = r.get("position") or 0
            seiten[page] = (k + (r.get("clicks") or 0), i + (r.get("impressions") or 0), pos)
    zeilen = [{"page": p, "clicks": k, "impressions": i, "position": round(pos, 1)} for p, (k, i, pos) in seiten.items()]
    return fenster.pop(), zeilen


def selbsttest():
    a = {"ok": True, "startDate": "2026-09-13", "endDate": "2026-10-10", "hasMore": True,
         "rows": [{"keys": ["https://luxestyle.ch/products/a"], "clicks": 2, "impressions": 10, "position": 5.0}]}
    b = {"ok": True, "startDate": "2026-09-13", "endDate": "2026-10-10", "hasMore": False,
         "rows": [{"keys": ["https://luxestyle.ch/products/b"], "clicks": 0, "impressions": 4, "position": 30.0}]}
    c = dict(b, startDate="2026-09-14")
    faelle = [
        ("zwei Seiten", [a, b], 2),
        ("letzte hasMore", [a], "hasMore=true"),
        ("Reihenfolge", [b, a], "Reihenfolge"),
        ("Fenster", [a, c], "Zeitfenster"),
        ("leer", [], "keine Antwort"),
        ("eine Seite", [b], 1),
    ]
    fehler = 0
    for name, eingabe, soll in faelle:
        try:
            _, z = zusammenfuehren(eingabe)
            ist = len(z)
        except ValueError as e:
            ist = str(e)
        ok = ist == soll if isinstance(soll, int) else (isinstance(ist, str) and soll in ist)
        fehler += not ok
        print(f"  {'✓' if ok else '✗'} {name}: {ist}")
    print(f"SELBSTTEST {'OK' if not fehler else f'{fehler} FEHLER'}")
    return fehler == 0


def faellig_zeile(max_h=20):
    """19.10.2026: --faellig — Zeile für den Keepalive (die 4-h-Routine liest sie). Search Console ist nur über den OpenSEO-Konnektor einer
    Sitzung lesbar; ohne diese Zeile stand die Pflicht nirgends (Schnappschuss 13.10., Ampel «GSC-TOT 5 T alt»). Exit 0 = fällig."""
    try:
        h = (dt.datetime.utcnow() - dt.datetime.strptime(json.load(open(ZIEL, encoding="utf-8"))["stand"], "%Y-%m-%dT%H:%MZ")).total_seconds() / 3600
    except Exception:  # noqa: BLE001
        h = 999
    if h < max_h:
        return 1
    print(f"⚠️ SESSION-AUFGABE GSC-Schnappschuss ({int(h)} h alt): OpenSEO get_search_console_performance projectId "
          "443c940c-93c9-4feb-9d0c-1e4d1d88c6cf, dimensions [page], dateRange last_28_days, rowLimit 1000, "
          "Filter page contains /products/, startRow 0/1000/… solange hasMore → python3 tools/gsc_schnappschuss.py <Antworten>")
    return 0


def main():
    if "--selbsttest" in sys.argv:
        return 0 if selbsttest() else 1
    if "--faellig" in sys.argv:
        faellig_zeile()
        return 0
    dateien = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not dateien:
        print(__doc__); return 2
    try:
        (von, bis), zeilen = zusammenfuehren([lies(p) for p in dateien])
    except ValueError as e:
        print(f"⚠️ kein Schnappschuss: {e}"); return 1
    start = max(dt.date.fromisoformat(von), ERSTER_DATENTAG)
    tage = (dt.date.fromisoformat(bis) - start).days + 1
    out = {"stand": dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "von": str(start), "bis": bis,
           "tage": tage, "quelle": f"OpenSEO get_search_console_performance [page] last_28_days, {len(dateien)} Seite(n)",
           "zeilen": zeilen}
    json.dump(out, open(ZIEL, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"FERTIG: {len(zeilen)} Seiten aus {len(dateien)} Antwort(en), {tage} Tage Daten → {os.path.relpath(ZIEL, REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
