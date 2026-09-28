#!/usr/bin/env python3
"""zustand_verklebt.py — Zustandsdateien (EIN Wert) in dropship/ auf verklebte Werte prüfen (28.09.2026).

Anlass: `dropship/_heilversprechen_seit.txt` enthielt vom 25.09. bis 27.09.
«2026-09-25T20:29:48Z2026-09-25T00:26:28Z2026-09-23T22:11:04Z» — drei Zeitstempel ohne Trenner, von der Ledger-Union in
`repo_vorspulen.sh` nach Snapshot-Restores angehängt (Datei ohne Zeilenende). Die Heilversprechen-Wache suchte zwei Tage
mit diesem Filter. Der Fix vom 28.09. morgens schützte nur Namen mit cursor|zeiger|_pos|_stand — «_seit», «_page» fehlten.
Jetzt: die Union erkennt Einzelwert-Dateien am INHALT (siehe EINWERT unten, dieselbe Regel in repo_vorspulen.sh), und
dieser Wächter meldet im Keepalive jede Datei, die trotzdem verklebt ist. Still bei 0.

  python3 automation/zustand_verklebt.py [ordner]      → «ZUSTAND VERKLEBT: n · datei (grund) …» oder nichts
  python3 automation/zustand_verklebt.py --test        → Kanarienvögel
"""
import os, re, sys

# Ein Einzelwert: Zahl, Datum/Zeitstempel oder Zeiger-Token (base64, ohne Leerraum).
EINWERT = re.compile(r"^(\d+|\d{4}-\d\d-\d\d(T[\d:.]+Z?)?|[A-Za-z0-9+/=_-]{20,})$")
# Verklebt: zweiter Zeitstempel direkt hinter dem ersten, oder zweiter Zeiger hinter «=».
KLEBER = [
    (re.compile(r"\d{4}-\d\d-\d\d(T[\d:.]+Z?)?\d{4}-\d\d-\d\d"), "zwei Zeitstempel ohne Trenner"),
    (re.compile(r"=+eyJ"), "zwei Zeiger ohne Trenner"),
]
NAME = re.compile(r"cursor|zeiger|_pos\.txt$|_stand\.txt$|_seit\.txt$|_page\.txt$", re.I)


def pruefen(ordner):
    funde = []
    for f in sorted(os.listdir(ordner)):
        if not f.endswith(".txt"):
            continue
        p = os.path.join(ordner, f)
        try:
            if os.path.getsize(p) > 4096:          # Ledger, keine Zustandsdatei
                continue
            zeilen = [l.strip() for l in open(p, errors="ignore").read().splitlines() if l.strip()]
        except OSError:
            continue
        if not zeilen:
            continue
        grund = None
        if len(zeilen) == 1:
            for rx, g in KLEBER:
                if rx.search(zeilen[0]) and " " not in zeilen[0] and "\t" not in zeilen[0]:
                    grund = g
                    break
        elif NAME.search(f) and all(EINWERT.match(z) for z in zeilen):
            grund = f"{len(zeilen)} Werte untereinander"
        if grund:
            funde.append((f, grund))
    return funde


def test():
    import tempfile
    d = tempfile.mkdtemp()
    faelle = {
        "_a_seit.txt": ("2026-09-25T20:29:48Z2026-09-25T00:26:28Z", True),
        "_b_cursor.txt": ("eyJsYXN0X2lkIjoxfQ==eyJsYXN0X2lkIjoyfQ==", True),
        "_c_page.txt": ("122\n130\n", True),
        "_d_seit.txt": ("2026-09-27T21:01:41Z\n", False),
        "_e_cursor.txt": ("eyJsYXN0X2lkIjoxNTQ5NDY5MDI0Mjk0NSwibGFzdF92YWx1ZSI6IjE1NDk0NjkwMjQyOTQ1In0=", False),
        "_f_ledger.txt": ("15448931139969\t2026-09-14\tText mit 2026-09-14 drin\n", False),
        "_g_liste.txt": ("111\n222\n", False),          # Ledger mit IDs, Name ist kein Zustand
        "_h_stand.txt": ("2026-09-25 \n", False),
    }
    for n, (inhalt, _) in faelle.items():
        open(os.path.join(d, n), "w").write(inhalt)
    gefunden = {f for f, _ in pruefen(d)}
    ok = True
    for n, (_, soll) in faelle.items():
        ist = n in gefunden
        print(("ok  " if ist == soll else "FEHL"), n, "gemeldet" if ist else "sauber")
        ok &= ist == soll
    print("TEST", "BESTANDEN" if ok else "GESCHEITERT")
    return 0 if ok else 1


if __name__ == "__main__":
    if "--test" in sys.argv:
        sys.exit(test())
    ordner = next((a for a in sys.argv[1:] if not a.startswith("-")),
                  os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dropship"))
    funde = pruefen(ordner)
    if funde:
        print(f"ZUSTAND VERKLEBT: {len(funde)} · " + " · ".join(f"{f} ({g})" for f, g in funde)
              + " → auf den letzten Wert zurücksetzen (origin-Fassung), Wächter liest sonst falsch")
