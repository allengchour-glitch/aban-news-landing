#!/usr/bin/env python3
"""semrush_positionen.py — eigener Positions-Verlauf für die Zielbegriffe (05.10.2026).

ANLASS: Betreiber 05.10. «position tracking und alles machen». Im Semrush-Projekt 31464185 gibt es keine Positions-Kampagne
(`campaigns` → targets null), und per MCP lässt sie sich nicht anlegen. Bis der Betreiber sie in der Oberfläche einrichtet,
speichert die Session Schnappschüsse nach dropship/semrush/positionen/ und dieses Werkzeug wertet sie aus.

QUELLEN (Dateiname bestimmt das Format):
  *_db_*.csv        Semrush-Datenbank `resource_organic` (Keyword;Position;…;Url;Timestamp). ⚠️ GEMESSEN 05.10.: die Datenbank
                    aktualisiert kleine Begriffe nur alle paar Wochen (Timestamps 31.07.–27.09.2026, Position = Previous Position
                    bei 80/80 Zeilen) — sie zeigt Wirkung von SEO-Änderungen frühestens nach Wochen.
  *_tracking_*.csv  Positions-Kampagne `tracking_position_organic` (täglich live), Spalten Keyword;Position;Url — sobald es sie gibt.
ZIELE: dropship/semrush/position_tracking_ziele.tsv (keyword, ziel_url, quelle) — dieselbe Liste, die in die Kampagne gehört
       (dropship/semrush/POSITION-TRACKING-KEYWORDS.txt).

AUSGABE: dropship/semrush/POSITIONEN.md — je Zielbegriff erste und letzte gemessene Position, Veränderung, und ob die rankende
URL die Ziel-URL ist (sonst: falsche Seite rankt → Kannibalisierung/Umleitung prüfen). Schreibt NICHTS im Shop.
  python3 automation/semrush_positionen.py            # Bericht schreiben
  python3 automation/semrush_positionen.py --zeile    # eine Zeile für die Keepalive-Meldung
"""
import csv, glob, os, re, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDNER = os.path.join(REPO, "dropship", "semrush", "positionen")
ZIELE = os.path.join(REPO, "dropship", "semrush", "position_tracking_ziele.tsv")
BERICHT = os.path.join(REPO, "dropship", "semrush", "POSITIONEN.md")


def pfad(u):
    u = (u or "").split("?")[0].rstrip("/")
    return re.sub(r"^https?://(www\.)?luxestyle\.ch", "", u)


def schnappschuesse():
    """{datum: {keyword: (position, url_pfad, quelle)}} — bei mehreren URLs je Begriff die beste Position."""
    alle = {}
    for f in sorted(glob.glob(os.path.join(ORDNER, "*.csv"))):
        name = os.path.basename(f)
        datum, art = name[:10], ("tracking" if "_tracking_" in name else "db")
        tag = alle.setdefault(datum, {})
        for r in csv.DictReader(open(f, encoding="utf-8"), delimiter=";"):
            k = (r.get("Keyword") or "").strip().lower()
            try:
                pos = int(float(r.get("Position") or 0))
            except ValueError:
                continue
            if not k or pos <= 0:
                continue
            alt = tag.get(k)
            if not alt or pos < alt[0] or (art == "tracking" and alt[2] == "db"):
                tag[k] = (pos, pfad(r.get("Url")), art)
    return alle


def ziele():
    if not os.path.exists(ZIELE):
        return {}
    return {r["keyword"]: r for r in csv.DictReader(open(ZIELE, encoding="utf-8"), delimiter="\t")}


def auswertung():
    snaps, zl = schnappschuesse(), ziele()
    daten = sorted(snaps)
    zeilen = []
    for k, z in zl.items():
        werte = [(d, snaps[d][k]) for d in daten if k in snaps[d]]
        erste = werte[0] if werte else None
        letzte = werte[-1] if werte else None
        zeilen.append({"k": k, "ziel": pfad(z["ziel_url"]), "quelle": z["quelle"], "erste": erste, "letzte": letzte})
    return daten, zeilen


def main():
    daten, zeilen = auswertung()
    gemessen = [z for z in zeilen if z["letzte"]]
    top10 = [z for z in gemessen if z["letzte"][1][0] <= 10]
    besser = [z for z in gemessen if z["erste"] and z["letzte"][1][0] < z["erste"][1][0]]
    schlechter = [z for z in gemessen if z["erste"] and z["letzte"][1][0] > z["erste"][1][0]]
    falsch = [z for z in gemessen if z["letzte"][1][1] and z["letzte"][1][1] != z["ziel"]]
    if "--zeile" in sys.argv:
        print(f"POSITIONEN: {len(gemessen)}/{len(zeilen)} Zielbegriffe gemessen · Top 10: {len(top10)} · besser {len(besser)} · "
              f"schlechter {len(schlechter)} · falsche Seite rankt {len(falsch)} · Stand {daten[-1] if daten else '—'}")
        return 0
    out = [f"# Positionen der Zielbegriffe (Semrush, Google Schweiz)\n",
           f"Schnappschüsse: {', '.join(daten) or '—'} · Zielbegriffe {len(zeilen)} · gemessen {len(gemessen)} · Top 10 {len(top10)} · "
           f"besser {len(besser)} · schlechter {len(schlechter)} · falsche Seite rankt {len(falsch)}\n",
           "⚠️ Quelle «db» = Semrush-Datenbank (wird für kleine Begriffe nur alle paar Wochen aufgefrischt); «tracking» = tägliche Kampagne.\n",
           "| Begriff | erste | letzte | Δ | rankende Seite | Ziel | Quelle |", "|---|---|---|---|---|---|---|"]
    for z in sorted(zeilen, key=lambda z: (z["letzte"][1][0] if z["letzte"] else 999)):
        if z["letzte"]:
            e, l = z["erste"][1][0], z["letzte"][1][0]
            d = e - l
            seite = z["letzte"][1][1] + ("" if z["letzte"][1][1] == z["ziel"] else " ⚠️")
            out.append(f"| {z['k']} | {e} ({z['erste'][0]}) | {l} ({z['letzte'][0]}, {z['letzte'][1][2]}) | {'+' if d > 0 else ''}{d} | {seite} | {z['ziel']} | {z['quelle']} |")
        else:
            out.append(f"| {z['k']} | — | — | — | nicht in Top 100 | {z['ziel']} | {z['quelle']} |")
    open(BERICHT, "w", encoding="utf-8").write("\n".join(out) + "\n")
    print(f"{BERICHT}: {len(gemessen)}/{len(zeilen)} gemessen, Top 10 {len(top10)}, falsche Seite {len(falsch)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
