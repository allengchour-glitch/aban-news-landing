#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gegenprobe fuer tools/textbausteine.py — beide Richtungen.

    python3 tools/test_textbausteine.py

⚠️ WOZU. Ein Werkzeug, das 947 Stellen auf 597 Seiten aendert, muss beweisen, dass es
   NICHT anfasst, was gemeint ist (Titel, Ueberschrift, Satzmitte) und dass es die
   Floskel wirklich trifft. Die beiden Fehler, die es in der Entwicklung machte, stehen
   als eigene Faelle drin: der geschluckte Satzpunkt und der doppelte Punkt.
"""
import importlib.util
import os
import sys

W = os.path.join(os.path.dirname(os.path.abspath(__file__)), "textbausteine.py")
spec = importlib.util.spec_from_file_location("tb", W)
tb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tb)

FAELLE = [
    # (Eingabe, erwartete Anzahl entfernt, erwartete Ausgabe oder None, Beschreibung)
    ('<title>Geld &amp; KI — ehrlich &amp; ohne Hype</title>', 0, None,
     "im Titel ist die Floskel Teil der Aussage"),
    ('<h2>Bleib dran — ohne Hype</h2>', 0, None, "in der Ueberschrift bleibt sie"),
    ('<h1>KI ohne Hype</h1>', 0, None, "auch in der H1"),
    ('<p>KI für Fliesenleger ohne Hype: konkrete Beispiele.</p>', 0, None,
     "mitten im Satz ist sie Inhalt"),
    ('<meta name="description" content="Gratis prüfen — ehrlich, ohne Hype.">', 1,
     '<meta name="description" content="Gratis prüfen.">', "angehaengter Schwanz faellt weg"),
    ('<p>Bleib auf dem Laufenden — ohne Hype.</p>', 1, '<p>Bleib auf dem Laufenden.</p>',
     "der Punkt gehoert dem Satz, nicht der Floskel"),
    ('<meta content="… in 5 Minuten. Ehrlich, ohne Hype.">', 1,
     '<meta content="… in 5 Minuten.">', "kein doppelter Punkt"),
    ('<span class="badge">Branchen-Guide · ehrlich, ohne Hype</span>', 1,
     '<span class="badge">Branchen-Guide</span>', "das Abzeichen nennt nur noch den Seitentyp"),
    ('<p>Nur Text ohne die Floskel.</p>', 0, '<p>Nur Text ohne die Floskel.</p>',
     "unbeteiligte Seiten bleiben Byte für Byte gleich"),
]


def main():
    fehler = 0
    for eingabe, erwartet, ausgabe, was in FAELLE:
        neu, weg = tb.bereinigen(eingabe)
        ok = weg == erwartet and (ausgabe is None or neu == ausgabe)
        print(("  ok      " if ok else "  FEHLER  ") + was)
        if not ok:
            print(f"          erwartet {erwartet}× weg{'' if ausgabe is None else ' → ' + ausgabe}")
            print(f"          bekommen {weg}× weg → {neu}")
            fehler += 1
    print(f"\n{len(FAELLE) - fehler} von {len(FAELLE)} Faellen gruen")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
