#!/usr/bin/env python3
"""bildtausch_sperre.py — welche Produkte hat der Google-Bildtausch angefasst? (05.10.2026)

ANLASS (gemessen 05.10. 04:10 UTC, Rücklese über alle 301 Bildtausche): bei 83 Produkten lag live wieder das ALTE
Hauptbild vorne — bei 78 davon exakt die Bild-Reihenfolge VOR dem Tausch (alt an 0, gewähltes Bild an 1). Alle 83 alten
Media-IDs standen als Quittung in `dropship/_textbild_geprueft.txt`: `textbild_fix.py` beurteilt ein Hauptbild neu, sobald
seine Quittung nicht mehr zur ersten Media-ID passt, hält Spitze/Mesh/Muster per Dunkel-Lauf-Heuristik für «Textbild» und
holt das nächstbeste Bild — das alte — wieder nach vorne. Zwei Automaten, die dasselbe Feld in Gegenrichtung schreiben.

REGEL: Wer ein Hauptbild automatisch umsortiert (textbild_fix, hauptbild_ohne_text, bild_klein_fix …), fragt ZUERST hier,
ob der Google-Bildtausch das Produkt bewusst gesetzt hat — dann Finger weg. Der Bildtausch ist die einzige Stelle, die
ein Produkt hier wieder freigibt (Ledger-Art `rueckweg`).

  gesperrte_handles()  → set der Handles, deren LETZTE Ledger-Zeile ein Tausch ist (tausch, tausch-g, tausch-q, nachgesetzt)
  gesperrte_ids()      → dieselben Produkte als gid (aus dropship/_google_bild_tausch_ids.tsv, das google_bild_tausch.py pflegt)
  ist_gesperrt(handle=None, gid=None)
"""
import os

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship/_google_bild_tausch.tsv")
IDS = os.path.join(REPO, "dropship/_google_bild_tausch_ids.tsv")
GETAUSCHT = ("tausch", "tausch-g", "tausch-q", "nachgesetzt")


def letzte_zeilen():
    """handle → letzte Ledger-Zeile (Liste der Spalten)."""
    out = {}
    if not os.path.exists(LEDGER):
        return out
    for l in open(LEDGER, encoding="utf-8", errors="ignore"):
        f = l.rstrip("\n").split("\t")
        if len(f) >= 3:
            out[f[0]] = f
    return out


def gesperrte_handles():
    return {h for h, f in letzte_zeilen().items() if f[2] in GETAUSCHT}


def handle_ids():
    out = {}
    if os.path.exists(IDS):
        for l in open(IDS, encoding="utf-8", errors="ignore"):
            f = l.rstrip("\n").split("\t")
            if len(f) >= 2:
                out[f[0]] = f[1]
    return out


def ids_merken(paare):
    """paare: Iterable (handle, gid) — nur neue Handles anhängen."""
    bekannt = handle_ids()
    neu = [(h, g) for h, g in paare if h and g and bekannt.get(h) != g]
    if neu:
        with open(IDS, "a", encoding="utf-8") as f:
            for h, g in neu:
                f.write(f"{h}\t{g}\n")
    return len(neu)


def gesperrte_ids():
    hs = gesperrte_handles()
    return {g for h, g in handle_ids().items() if h in hs}


def ist_gesperrt(handle=None, gid=None):
    if handle and handle in gesperrte_handles():
        return True
    if gid and gid in gesperrte_ids():
        return True
    return False


if __name__ == "__main__":
    hs, ids = gesperrte_handles(), gesperrte_ids()
    print(f"Bildtausch-Sperre: {len(hs)} Handles · {len(ids)} davon mit bekannter Produkt-ID")
