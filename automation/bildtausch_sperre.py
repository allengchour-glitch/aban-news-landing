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
import os, sys


def _repo():
    """Repo-Wurzel robust finden. ⚠️ 05.10.2026 (Prüfer): der Aufseher startet `python3 /tmp/textbild_fix.py` (Spiegelkopie),
    die importiert /tmp/bildtausch_sperre.py — dirname(dirname(__file__)) ist dann «/», das Ledger «/dropship/…» fehlt,
    die Sperre war LEER (0 statt 295) und textbild_fix drehte um 04:43 wieder 81 Tausche zurück. Reihenfolge: $REPO,
    Lage der Datei, Arbeitsverzeichnis (der Aufseher läuft im Repo), fester Pfad. Ein Kandidat zählt nur mit dropship/ UND
    automation/ darunter."""
    hier = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for k in (os.environ.get("REPO"), hier, os.getcwd(), "/home/user/aban-news-landing"):
        if k and os.path.isdir(os.path.join(k, "dropship")) and os.path.isdir(os.path.join(k, "automation")):
            return k
    return hier


REPO = _repo()
LEDGER = os.path.join(REPO, "dropship/_google_bild_tausch.tsv")
IDS = os.path.join(REPO, "dropship/_google_bild_tausch_ids.tsv")
GETAUSCHT = ("tausch", "tausch-g", "tausch-q", "nachgesetzt")
_GEWARNT = set()


def _warnen(pfad):
    # Fehlendes Ledger = keine Sperre. Das darf nie still geschehen (einmal je Datei und Prozess, auf stderr).
    if pfad not in _GEWARNT:
        _GEWARNT.add(pfad)
        print(f"⚠️ bildtausch_sperre: Ledger fehlt → Sperre LEER: {pfad} (REPO={REPO}, __file__={__file__})", file=sys.stderr, flush=True)


def letzte_zeilen():
    """handle → letzte Ledger-Zeile (Liste der Spalten)."""
    out = {}
    if not os.path.exists(LEDGER):
        _warnen(LEDGER)
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
    if not os.path.exists(IDS):
        _warnen(IDS)
    else:
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
    print(f"Bildtausch-Sperre: {len(hs)} Handles · {len(ids)} davon mit bekannter Produkt-ID · Ledger {LEDGER}")
