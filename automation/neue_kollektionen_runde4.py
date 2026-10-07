#!/usr/bin/env python3
"""neue_kollektionen_runde4.py — Runde 4 der Semrush-Landeseiten (07.10.2026, Betreiber «semrush kannst noch ausnützen»; API-Guthaben 0, Daten aus der Ernte 02.10.).

Dieselbe Mechanik wie Runde 2 (neue_kollektionen_anlegen.py + menue_semrush_kollektionen.py), nur mit eigenem Ledger
dropship/semrush/_neue_kollektionen_4_2026-10-07.tsv, eigenem Menü-Backup und dem Menü-Plan dieser Runde. Die Regeln
stehen in kategorie_rein_semrush.CFG (Block «Runde 4»); das Taggen macht kategorie_rein.py (täglich im Aufseher).
  python3 automation/neue_kollektionen_runde4.py            Trockenlauf (Kollektionen + Menü)
  SCHARF=1 python3 automation/neue_kollektionen_runde4.py   anlegen + veröffentlichen + Menü
  SCHARF=1 python3 automation/neue_kollektionen_runde4.py --zurueck
"""
import os, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER); sys.path.insert(0, HIER)
import neue_kollektionen_anlegen as A  # noqa: E402
import menue_semrush_kollektionen as M  # noqa: E402
from kategorie_rein_semrush import CFG  # noqa: E402

HANDLES = ["schneidebretter", "wandteppiche"]
LEDGER = os.path.join(REPO, "dropship/semrush/_neue_kollektionen_4_2026-10-07.tsv")
A.LEDGER = LEDGER
M.LEDGER = LEDGER
M.BACKUP = os.path.join(REPO, "dropship/semrush/_hauptmenue_backup_2026-10-07_runde4.json")
# (Rubrik, nach welchem Unterpunkt, [(Titel, handle)…]) — Rubriken/Unterpunkte am Hauptmenü 05.10. 09:1x UTC gemessen
M.PLAN = [
    ("Wohnen & Garten", "Küche & Kochen", [("Schneidebretter", "schneidebretter")]),
    ("Wohnen & Garten", "Wanddeko", [("Wandteppiche & Wandbehänge", "wandteppiche")]),
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
