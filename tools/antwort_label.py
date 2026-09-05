#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Antwort-Etikett vom Antwortsatz trennen — ein Doppelpunkt, mehr nicht.

    python3 tools/antwort_label.py [--probe]

⚠️ WOZU. 29 Kaufberater eröffnen ihre „Antwort zuerst"-Box mit einem fetten Etikett ohne
   Satzzeichen: „<strong>Kurzantwort</strong> Für den ersten Start sind …". Für Leser
   trennt der Fettdruck; für jede Maschine, die Text liest (Vorlese-Software, Antwort-
   Maschinen, die eigene Engine), ist das EIN Satz — „Kurzantwort Für den ersten Start …",
   und mit 29–44 Wörtern zu lang. Ein Doppelpunkt am Etikett ist typografisch ohnehin
   richtig. Idempotent: Etiketten, die schon mit Satzzeichen enden, bleiben unberührt.
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MUSTER = re.compile(r'(?is)(<(?:p|div)[^>]*class="[^"]*answer-first[^"]*"[^>]*>\s*<strong>)([^<]*?)(\s*</strong>)')


def main():
    probe = "--probe" in sys.argv
    n = 0
    for p in sorted(glob.glob(os.path.join(ROOT, "*kaufen-schweiz.html"))):
        h = open(p, encoding="utf-8").read()

        def ersatz(m):
            label = m.group(2).rstrip()
            if re.search(r'[:.!?]$', label):
                return m.group(0)
            return m.group(1) + label + ":" + m.group(3)
        neu, k = MUSTER.subn(ersatz, h, count=1)
        if neu != h:
            n += 1
            if not probe:
                open(p, "w", encoding="utf-8").write(neu)
    print(("🔍 " if probe else "✓ ") + f"{n} Etiketten " + ("ohne Doppelpunkt gefunden" if probe else "mit Doppelpunkt versehen"))


if __name__ == "__main__":
    main()
