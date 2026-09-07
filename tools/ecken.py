#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bringt die Eckenradien auf eine Leiter — 30 verschiedene Werte werden 3.

    python3 tools/ecken.py            # nur zählen
    python3 tools/ecken.py --schreiben

⚠️ WOZU. Gemessen über alle Seiten: **30 verschiedene** Eckenradien in 32 092
   Deklarationen — 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24,
   26, 28, 40, 99, 999 px. Niemand entscheidet 30-mal verschieden; so etwas entsteht,
   wenn jede Seite für sich gebaut wird. Genau dieser Eindruck ist gemeint, wenn der
   User sagt „zu fest KI gemacht": nicht hässlich, sondern beliebig.

DIE LEITER (drei Sprossen, mehr braucht keine Oberfläche):
     8 px  kleine Flächen — Knöpfe, Felder, Chips, Bilder       (aus 2–9)
    14 px  Karten und Kästen                                    (aus 10–40)
   999 px  Pillen (Rundum-Radius, bleibt)                        (aus 90+)

WAS DAS WERKZEUG NICHT ANFASST:
   · `%`-Radien (Kreise) und `var()`/`em`-Werte — dort steckt eine Absicht dahinter
   · mehrwertige Formen wie `12px 12px 0 0` (Karte oben rund, unten gerade) — jeder
     Einzelwert wird aber auf dieselbe Leiter gesetzt, damit die Form erhalten bleibt
   · `border-radius:0` — eine Kante ist eine Entscheidung, keine Ungenauigkeit
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WERT = re.compile(r'(border-radius:\s*)([^;}"\']{1,80})')
PX = re.compile(r'(?<![\w.])(\d+(?:\.\d+)?)px')


def leiter(n):
    if n <= 0:
        return 0          # eine Kante bleibt eine Kante
    if n >= 90:
        return 999        # Pille
    return 8 if n <= 9 else 14


def _einzeln(m):
    n = float(m.group(1))
    neu = leiter(n)
    return f"{neu:g}px"


def umschreiben(text):
    """Gibt (neuer Text, Anzahl geänderter Deklarationen) zurück."""
    geaendert = [0]

    def rep(m):
        kopf, wert = m.group(1), m.group(2)
        if "%" in wert or "var(" in wert or "em" in wert:
            return m.group(0)
        neu = PX.sub(_einzeln, wert)
        if neu != wert:
            geaendert[0] += 1
        return kopf + neu

    return WERT.sub(rep, text), geaendert[0]


def seiten():
    for muster in ("*.html", "*/*.html", "css/*.css"):
        for p in sorted(glob.glob(os.path.join(ROOT, muster))):
            yield p


def main():
    schreiben = "--schreiben" in sys.argv
    werte, ges, dateien = {}, 0, 0
    for p in seiten():
        s = open(p, encoding="utf-8", errors="ignore").read()
        for m in PX.findall(" ".join(x[1] for x in WERT.findall(s))):
            werte[float(m)] = werte.get(float(m), 0) + 1
        neu, k = umschreiben(s)
        if k:
            ges += k
            dateien += 1
            if schreiben:
                open(p, "w", encoding="utf-8").write(neu)
    print(f"Eckenradien: {len(werte)} verschiedene Werte · {ges} Deklarationen auf {dateien} Dateien "
          f"{'geändert' if schreiben else 'zu ändern'}")
    if not schreiben:
        print("(nur gezählt — mit --schreiben wird geändert)")


if __name__ == "__main__":
    main()
