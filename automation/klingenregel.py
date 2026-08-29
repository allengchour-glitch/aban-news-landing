#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
klingenregel.py — EINE Quelle für die Klingen-Hausregel (Google-Kanal).

Vorher stand dieselbe Regex wörtlich in fünf Dateien (drei CJ-Importer, zwei
Google-Kanal-Wächter). Am 28.08. musste sie in allen fünf repariert werden, am
29.08. erneut — das ist die sechste Wiederholung der Geschwister-Lehre nach
Farbtabelle, Grössenmenge, publishVerified(), Preisformel und technik_plausibel.
**Neue Klingenwörter NUR in `klingenregel.json`.**

Die Regel hat drei Stufen, und jede stammt aus einem echten Fehlgriff:

1. `klinge_am_ende` — trifft die Ware SELBST. Die Wortgrenze steht am ENDE, weil
   deutsche Zusammensetzungen das Grundwort hinten tragen («Küchenmesser»).
   Zubehör wie «Messerblock» fällt damit korrekt heraus: Küchenbesteck und
   Zubehör sind bei Google zulässig (Hausregel 12.08.).

2. `waffenwort_vorne` — schliesst die Lücke vom 29.08.: «Retro Schwertabdeckung»
   ist eine Scheide für ein Schwert und fiel durch Stufe 1, weil das Waffenwort
   VORNE steht. Enthält bewusst KEIN «messer» — sonst fielen Messerblock und
   Messerschärfer wieder heraus.

3. `waffenwort_vorne_ausnahme` — die Gegenrichtung: «Schwertblatt» ist der
   Bogenhanf, «Schwertwal» der Orca, «Schwertlilie» die Iris. Ohne diese Liste
   hätte Stufe 2 ein Deko-Kissen aus dem einzigen verkaufenden Kanal geworfen.

Nutzung:  from klingenregel import ist_klinge
          if ist_klinge(titel): ...
"""
import json
import os
import re

_PFAD = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'klingenregel.json')
_R = json.load(open(_PFAD, encoding='utf-8'))

KLINGE_AM_ENDE   = re.compile(_R['klinge_am_ende'], re.I)
WAFFENWORT_VORNE = re.compile(_R['waffenwort_vorne'], re.I)
VORNE_AUSNAHME   = re.compile(_R['waffenwort_vorne_ausnahme'], re.I)
MESSGERAET       = re.compile(_R['messgeraet_ausnahme'], re.I)
KONTEXT_AUSNAHME = re.compile(_R['kontext_ausnahme'], re.I)


def ist_klinge(titel):
    """True, wenn der Titel eine Klinge oder Waffenzubehör bezeichnet.

    Die Kontext-Ausnahme steht ZUERST: «Washed Machete Jeans» ist eine Waschung,
    «Samurai mit Katana» eine Dekofigur. Ein Kleidungs- oder Deko-Wort im Titel
    sticht die Klingenwörter — sonst räumt die Regel halbe Abteilungen leer.
    """
    t = titel or ''
    if KONTEXT_AUSNAHME.search(t):
        return False
    if KLINGE_AM_ENDE.search(t) and not MESSGERAET.search(t):
        return True
    if WAFFENWORT_VORNE.search(t) and not VORNE_AUSNAHME.search(t):
        return True
    return False
