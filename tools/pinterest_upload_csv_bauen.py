#!/usr/bin/env python3
"""Baut aus dropship/pinterest_pins.csv die Fassung, die wirklich hochgeladen wird.

Der einzige Unterschied ist die Spalte «Publish date». Sie ist in der Quelldatei leer —
das heisst bei Pinterest «sofort veroeffentlichen», und 117 Pins in einer Minute sind
fuer ein frisches Konto das Muster, nach dem Spam aussieht. Deshalb werden sie ueber
zehn Tage verteilt, rund zwoelf am Tag, zu Tageszeiten, an denen in der Schweiz jemand
wach ist.

⚠️ Warum nicht 30 Tage: Pinterests Planungsfenster ist je nach Konto 14 oder 30 Tage.
Zehn Tage liegen unter BEIDEN Grenzen — ein Termin ausserhalb des Fensters laesst den
ganzen Upload scheitern, und das waere ein teurer Fehlschlag fuer nichts.

⚠️ Und die Boards werden NICHT gemischt vergeben: jede Zeile behaelt ihr Board. Verteilt
wird nur die ZEIT, und zwar so, dass nicht zwoelfmal hintereinander dasselbe Board
bedient wird (sonst sieht ein Tag aus wie ein Massenwurf in ein einziges Regal).

Gegenprobe laeuft mit: Zeilenzahl, alle Termine in der Zukunft, keiner ueber 14 Tage,
Board- und Linkspalten unveraendert. Schlaegt eine fehl, wird NICHTS geschrieben.
"""
import csv, sys, datetime, collections, itertools, os

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUELLE = os.path.join(REPO, "dropship", "pinterest_pins.csv")
ZIEL   = os.path.join(REPO, "dropship", "pinterest_pins_upload.csv")

TAGE = 10
UHRZEITEN = ["07:30", "09:00", "10:30", "12:00", "13:30", "15:00",
             "16:30", "18:00", "19:00", "20:00", "21:00", "22:00"]   # 12 Plaetze/Tag

def main():
    rows = list(csv.DictReader(open(QUELLE, encoding="utf-8")))
    if not rows:
        sys.exit("Quelldatei leer")

    # Reihum durch die Boards gehen, damit ein Tag gemischt aussieht.
    nach_board = collections.OrderedDict()
    for r in rows:
        nach_board.setdefault(r["Pinterest board"], []).append(r)
    verzahnt = [r for r in itertools.chain.from_iterable(
        itertools.zip_longest(*nach_board.values())) if r is not None]
    assert len(verzahnt) == len(rows), "Verzahnen hat Zeilen verloren"

    start = datetime.datetime.utcnow().replace(second=0, microsecond=0) \
            + datetime.timedelta(days=1)
    plaetze = [f"{(start + datetime.timedelta(days=t)).date()} {u}"
               for t in range(TAGE) for u in UHRZEITEN]
    if len(plaetze) < len(verzahnt):
        sys.exit(f"zu wenig Plaetze: {len(plaetze)} fuer {len(verzahnt)} Pins")

    for r, p in zip(verzahnt, plaetze):
        r["Publish date"] = p

    # --- Gegenprobe, bevor irgendetwas geschrieben wird -------------------------
    grenze = datetime.datetime.utcnow() + datetime.timedelta(days=14)
    jetzt  = datetime.datetime.utcnow()
    for r in verzahnt:
        d = datetime.datetime.strptime(r["Publish date"], "%Y-%m-%d %H:%M")
        assert d > jetzt,   f"Termin liegt in der Vergangenheit: {r['Publish date']}"
        assert d < grenze,  f"Termin ueber 14 Tage hinaus: {r['Publish date']}"
        assert r["Media URL"].startswith("https://"), "Media URL nicht https"
        assert r["Link"].startswith("https://luxestyle.ch/"), f"fremder Link: {r['Link']}"
    assert len(verzahnt) == len(rows)
    assert collections.Counter(r["Pinterest board"] for r in verzahnt) == \
           collections.Counter(r["Pinterest board"] for r in rows), "Boards verschoben"

    with open(ZIEL, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()), quoting=csv.QUOTE_ALL)
        w.writeheader(); w.writerows(verzahnt)

    proTag = collections.Counter(r["Publish date"][:10] for r in verzahnt)
    print(f"✅ {len(verzahnt)} Pins nach {ZIEL}")
    print(f"   {min(proTag)} bis {max(proTag)} · pro Tag: "
          + ", ".join(f"{t[-5:]}={n}" for t, n in sorted(proTag.items())))

if __name__ == "__main__":
    main()
