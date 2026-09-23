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
HANDKLINGE_STAMM = re.compile(_R['handklinge_stamm'], re.I)
HANDKLINGE_KEIN_PAKET = re.compile(_R['handklinge_kein_paket'], re.I)
HANDKLINGE_GERAET = re.compile(_R['handklinge_geraet'], re.I)
HANDKLINGE_SPIELZEUG = re.compile(_R['handklinge_spielzeug'], re.I)
HANDKLINGE_MIT_ZUBEHOER = re.compile(_R['handklinge_mit_zubehoer'], re.I)
_KLINGEN_NOMEN = ('messer', 'messern', 'knife', 'knives')


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


def ist_handklinge(titel):
    """True, wenn im PAKET eine Handklinge liegt — die Versandfrage, nicht die Werbefrage.

    Getrennt von `ist_klinge`, weil es eine andere Frage ist (Lehre 16.09.2026,
    Bestellung #1017): CJ hat die Sendung aus Shanghai als VERBOTENEN ARTIKEL
    zurueckgeschickt. Fuer die Schweiz gibt es keine Linie fuer Klingen — egal ob
    Kuechenmesser oder Taschenmesser, und egal was `freightCalculate` vorher sagte.

    Zwei Richtungen, in denen sich die Antwort von `ist_klinge` unterscheidet:

    WEITER: «Edelstahl-Messerset» und «Keramikmesser-Set» sind fuer `ist_klinge`
    FALSE — deren Endverankerung scheitert am Fugen-s bzw. am Plural-n. Fuer die
    Versandfrage zaehlt der Wortstamm, denn im Karton liegen Klingen.

    ENGER: Zubehoer ohne Klinge (Messerblock, -halter, -schaerfer, Schwertpflegeoel,
    Schwertgurt) darf weiter in die Schweiz und bleibt im Verkauf. Ebenso Geraete
    mit gekapselter Klinge (Standmixer, Rasierer, Schaeler, Schere) und die
    Messgeraete-Ausnahme («Handkraft-Messer» ist ein Dynamometer).

    Die Kontext-Ausnahme gilt wie bei `ist_klinge` zuerst: «Washed Machete Jeans».
    """
    t = titel or ''
    if KONTEXT_AUSNAHME.search(t):
        return False
    if HANDKLINGE_SPIELZEUG.search(t):
        return False
    if MESSGERAET.search(t):
        return False
    if WAFFENWORT_VORNE.search(t) and VORNE_AUSNAHME.search(t):
        return False
    # 23.09.2026: Paket MIT Klinge — «Hackmesser mit Schutzhülle», «Messerblock mit 6 Messern».
    # Steht VOR der Zubehör-Ausnahme, weil «schutzhülle»/«scheide» dort als reines Zubehör gelten.
    m = HANDKLINGE_MIT_ZUBEHOER.search(t)
    if m and not HANDKLINGE_GERAET.search(t):
        vor = t[:m.start()]
        if m.group(1).lower() in _KLINGEN_NOMEN:
            return True
        if HANDKLINGE_STAMM.search(vor) and not HANDKLINGE_KEIN_PAKET.search(vor):
            return True
    if HANDKLINGE_KEIN_PAKET.search(t) or HANDKLINGE_GERAET.search(t):
        return False
    return bool(HANDKLINGE_STAMM.search(t))
