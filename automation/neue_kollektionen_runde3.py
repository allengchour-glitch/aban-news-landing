#!/usr/bin/env python3
"""neue_kollektionen_runde3.py — Runde 3 der Semrush-Landeseiten (05.10.2026, Betreiber «fix mal weiter semrush»).

Dieselbe Mechanik wie Runde 2 (neue_kollektionen_anlegen.py + menue_semrush_kollektionen.py), nur mit eigenem Ledger
dropship/semrush/_neue_kollektionen_2_2026-10-05.tsv, eigenem Menü-Backup und dem Menü-Plan dieser Runde. Die Regeln
stehen in kategorie_rein_semrush.CFG (Block «Runde 3»); das Taggen macht kategorie_rein.py (täglich im Aufseher).
  python3 automation/neue_kollektionen_runde3.py            Trockenlauf (Kollektionen + Menü)
  SCHARF=1 python3 automation/neue_kollektionen_runde3.py   anlegen + veröffentlichen + Menü
  SCHARF=1 python3 automation/neue_kollektionen_runde3.py --zurueck
"""
import os, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER); sys.path.insert(0, HIER)
import neue_kollektionen_anlegen as A  # noqa: E402
import menue_semrush_kollektionen as M  # noqa: E402
from kategorie_rein_semrush import CFG  # noqa: E402

HANDLES = ["etageren", "usb-sticks", "wanduhren", "woks", "abendkleider", "lunchboxen", "winterschuhe", "bauchtaschen"]
LEDGER = os.path.join(REPO, "dropship/semrush/_neue_kollektionen_2_2026-10-05.tsv")
A.LEDGER = LEDGER
M.LEDGER = LEDGER
M.BACKUP = os.path.join(REPO, "dropship/semrush/_hauptmenue_backup_2026-10-05_runde3.json")
# (Rubrik, nach welchem Unterpunkt, [(Titel, handle)…]) — Rubriken/Unterpunkte am Hauptmenü 05.10. 09:1x UTC gemessen
M.PLAN = [
    ("Wohnen & Garten", "Küche & Kochen", [("Woks & Wokpfannen", "woks"), ("Etageren", "etageren")]),
    ("Wohnen & Garten", "Küchenhelfer & Gadgets", [("Lunchboxen & Bento-Boxen", "lunchboxen")]),
    ("Wohnen & Garten", "Wanddeko", [("Wanduhren", "wanduhren")]),
    ("Technik & Gaming", "PC & Homeoffice", [("USB-Sticks", "usb-sticks")]),
    ("Damen", "Midikleider", [("Abendkleider & Cocktailkleider", "abendkleider")]),
    ("Damen", "Taschen & Rucksäcke", [("Bauchtaschen & Gürteltaschen", "bauchtaschen")]),
    ("Schuhe", "Stiefel & Boots", [("Winterschuhe & Winterstiefel", "winterschuhe")]),
]


def main():
    if "--zurueck" in sys.argv:
        for h in HANDLES:
            A.zurueck(h)
        return
    if "--nur-menue" not in sys.argv:
        for h in HANDLES:
            A.anlegen(h, CFG[h])
    if "--nur-kollektionen" not in sys.argv:
        M.main()


if __name__ == "__main__":
    main()
