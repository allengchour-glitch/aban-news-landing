"""Waechter: Katalog-Reiniger, die nur noch «FERTIG: 0 gescannt» schreiben.

25.09.2026: bild_klein_fix, default_variant_fix und promo_aus_beschreibung meldeten
seit dem 14.09. 180 Mal «FERTIG: 0 gescannt» — ihr Cursor hing am Katalogende
(Behebung: automation/vollrunde.py). Kein Traceback, kein Absturz; nur eine Null,
die niemand las. Dieser Waechter liest sie: sind die letzten DREI FERTIG-Zeilen
eines Logs alle mit 0 geprueften Einheiten, meldet er das Log in der Keepalive-
Ausgabe. Stumm, wenn nichts auffaellt.
"""
import glob
import os
import re

MUSTER = re.compile(r"FERTIG:?\s+0\s+(gescannt|geprueft|geprüft)\b", re.I)
JEDE_FERTIG = re.compile(r"FERTIG", re.I)
# Waechter, deren Kandidaten = Bestand MINUS Ledger sind: eine 0 heisst dort «alles schon
# geprueft» (seit der Grind-Pause kommt kaum Neuware). Nur mit Grund eintragen.
LEDGER_NULL_OK = {
    "cj_verfuegbarkeit": "Export minus Ledger, Cursor seit 19.09. entfernt",
    "cj_varianten_wache": "Kandidaten minus dropship/_cj_varianten_wache.txt",
}


def pruefe(pfad, n=3):
    try:
        with open(pfad, "rb") as f:
            f.seek(0, 2)
            f.seek(max(0, f.tell() - 200_000))
            zeilen = f.read().decode("utf-8", "replace").splitlines()
    except OSError:
        return 0
    idx = [i for i, z in enumerate(zeilen) if JEDE_FERTIG.search(z)]
    fertig = [zeilen[i] for i in idx]
    if len(fertig) < n:
        return 0
    # Eine Cursor-Freigabe (vollrunde.fertig ohne volle Runde) im Fenster der letzten n Laeufe
    # ist eine erklaerte Null, kein Befund.
    if any("CURSOR-FREI" in z for z in zeilen[idx[-n]:]):
        return 0
    letzte = fertig[-n:]
    if all(MUSTER.search(z) for z in letzte):
        return sum(1 for z in fertig if MUSTER.search(z))
    return 0


def main():
    funde = []
    for pfad in sorted(glob.glob("/tmp/*.log")):
        if os.path.basename(pfad)[:-4] in LEDGER_NULL_OK:
            continue
        k = pruefe(pfad)
        if k:
            funde.append(f"{os.path.basename(pfad)[:-4]} ({k}×)")
    if funde:
        print("⚠️ NULLRUNDEN (letzte 3 Laeufe je 0 geprueft — Cursor/Abfrage pruefen): " + ", ".join(funde))


if __name__ == "__main__":
    main()
