#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""klingenregel_test.py — prueft die Klingen-Hausregel in BEIDE Richtungen.

WARUM ES DIESEN TEST GIBT: Die Regel wurde am 28.08. und am 29.08. reparieren
muessen und liegt seit dem 29.08. an EINER Stelle, aus der FUENF Dateien lesen
(drei CJ-Importer, zwei Google-Kanal-Waechter). Damit entscheidet sie darueber,
was in den einzigen Kanal kommt, der belegt verkauft — und was zu Recht
draussen bleibt. Eine Regel dieser Tragweite, die niemand prueft, ist eine
Vermutung.

Ein Waechter, der nur Positive findet, ist ein Alarm — deshalb steht hier zu
JEDEM Sperrfall ein Gegenfall, der NICHT gesperrt werden darf. Jede Zeile
stammt aus einem echten Fund, nicht aus der Vorstellung.

Aufruf:  python3 automation/klingenregel_test.py     (Exit 0 = alles richtig)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from klingenregel import ist_klinge

# (Titel, soll_gesperrt_sein, Herkunft des Falls)
FAELLE = [
    # --- Ware, die zu Recht draussen bleibt ---------------------------------
    ("Küchenmesser Damast 67 Lagen",       True,  "28.08. — Grundwort hinten"),
    ("Taschenmesser Outdoor klappbar",     True,  "28.08. — Grundwort hinten"),
    ("Jagdmesser mit Lederscheide",        True,  "28.08. — Grundwort hinten"),
    ("Survival-Messer mit Feuerstahl",     True,  "12.08. — bindestrich-getrennt"),
    ("Messer für die Küche, 20 cm",        True,  "12.08. — freistehend"),
    ("Faltbares Butterfly-Messer",         True,  "12.08. — WG Art. 4"),
    ("Wurfdolch-Set, 3-teilig",            True,  "16.08. — Dolch hinten"),
    ("Retro Schwertabdeckung",             True,  "29.08. — Waffenwort VORNE"),
    ("Katana Samurai-Schwert 104 cm",      True,  "29.08. — Waffenwort vorne"),
    ("Machete mit Nylonscheide",           True,  "16.08."),
    ("Nunchaku Doppelstock Hartholz",      True,  "24.08. — WG Art. 4"),
    ("Klappmesser Edelstahl",              True,  "28.08."),

    # --- Zubehoer: bleibt im Kanal (Hausregel 12.08.: Kuechenbesteck ist
    #     KEIN Richtlinienverstoss, Zubehoer erst recht nicht) ---------------
    ("Xinzuo Magnetischer Messerblock aus Akazienholz", False, "29.08. — Zubehör"),
    ("Multifunktionaler Messerhalter mit Wellenmuster", False, "29.08. — Zubehör"),
    ("Diamant-Messerschärfer mit festem Winkel",        False, "29.08. — Zubehör"),
    ("Abtropfgestell mit Geschirr- und Messerhalter",   False, "29.08. — Zubehör"),

    # --- Messgeraete: «…messer» ist auch die Endung fuer MESSGERAETE --------
    ("Herzfrequenzmesser Brustgurt Bluetooth", False, "28.08. — Messgerät"),
    ("Digitaler Winkelmesser 400 mm",          False, "28.08. — Messgerät"),
    ("Reifendruckmesser mit LCD",              False, "28.08. — Messgerät"),
    ("Laser-Entfernungsmesser 40 m",           False, "28.08. — Messgerät"),

    # --- Biologie und Botanik: das Waffenwort steht vorne, meint aber nichts
    #     Scharfes (ohne diese Liste flog ein Deko-Kissen aus dem Kanal) -----
    ("Kissen mit Schwertblatt-Nagelblumen-Muster", False, "29.08. — Bogenhanf"),
    ("Schwertlilien-Zwiebeln, 10 Stück",           False, "29.08. — Iris"),
    ("Plüsch-Schwertwal 40 cm",                    False, "29.08. — Orca"),

    # --- Kontext sticht: Kleidung, Deko, Spielzeug --------------------------
    ("Washed Machete Jeans Herren",         False, "12.08. — Waschung"),
    ("Samurai mit Katana, 30 cm Dekofigur", False, "12.08. — Dekofigur"),
    ("Anhänger Schwert Edelstahl Halskette", False, "12.08. — Schmuck"),

    # --- Harmlose Ware, die kein Klingenwort traegt -------------------------
    ("Bambus-Schneidebrett mit Saftrille",  False, "Gegenprobe"),
    ("Edelstahl-Sparschäler 2er-Set",       False, "Gegenprobe"),
]


def main():
    fehler = []
    for titel, soll, herkunft in FAELLE:
        ist = ist_klinge(titel)
        if ist != soll:
            fehler.append((titel, soll, ist, herkunft))
    print(f"{len(FAELLE)} Faelle geprueft — "
          f"{sum(1 for _, s, _ in FAELLE if s)} sollen sperren, "
          f"{sum(1 for _, s, _ in FAELLE if not s)} sollen durchlassen")
    if not fehler:
        print("✅ Klingenregel: alle Faelle richtig.")
        return 0
    print(f"\n❌ {len(fehler)} Abweichungen:\n")
    for titel, soll, ist, herkunft in fehler:
        print(f"  {titel}")
        print(f"     erwartet {'SPERRT' if soll else 'frei':6} · "
              f"tatsaechlich {'SPERRT' if ist else 'frei':6} · {herkunft}")
    return 1


sys.exit(main())
