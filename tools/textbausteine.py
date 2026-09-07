#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dünnt den Textbaustein „ohne Hype" aus — er steht 1059-mal im Bestand.

    python3 tools/textbausteine.py --zeigen      # nur zählen, nichts ändern
    python3 tools/textbausteine.py --schreiben   # ändern

⚠️ WOZU. User 2026-09-05: „zu fest KI gemacht." Gemessen mit `tools/ki_look.py`:
   „ohne Hype" kommt 1059-mal vor, „ehrlich" 2637-mal. Ein Satz, der auf 880 Seiten
   identisch steht, sagt nichts mehr — er ist Tapete. Genau daran erkennt man Text,
   den eine Maschine in eine Vorlage gegossen hat.

WAS DIESES WERKZEUG TUT — und was es bewusst NICHT tut:
   Es erfindet keine Aussage und schreibt keinen Satz um. Es entfernt genau zwei
   Formen, in denen der Baustein reine Anhängsel-Floskel ist:
     1. den angehängten Schwanz am Satzende („… dranbleiben — ehrlich, ohne Hype.")
     2. den Zusatz im Abzeichen über der Überschrift („Branchen-Guide · ehrlich,
        ohne Hype" → „Branchen-Guide"), auf 308 Seiten wortgleich.
   Es lässt ihn stehen, wo er GEMEINT ist: in <title> und Überschriften (dort ist er
   Teil der Aussage) und mitten im Satz („KI für Fliesenleger ohne Hype: …").
   Am Ende wird gezählt, auf wie vielen Seiten trotzdem noch mehr als eines steht —
   das sind die Fälle für die Hand, nicht für die Maschine.
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Angehängte Floskeln: das Muster ist immer „… — ehrlich, ohne Hype." am Satzende.
SCHWANZ = [
    re.compile(r'\s*(?:&mdash;|—|·|-)\s*[Ee]hrlich(?:\s+und)?,?\s*ohne Hype(\.?)'),
    re.compile(r'\s*(?:&mdash;|—|·|-)\s*[Pp]ragmatisch,?\s*ohne Hype(\.?)'),
    re.compile(r'\s*(?:&mdash;|—|·|-)\s*ohne Hype(\.?)(?=["<])'),
    re.compile(r'(?<=\.)\s*[Ee]hrlich(?:\s+und)?,?\s*ohne Hype(\.)'),
    re.compile(r',?\s*[Ee]hrlich(?:\s+und)?,?\s*ohne Hype(\.?)(?=["<])'),
]


def _weg(m):
    """⚠️ Der Punkt gehoert dem Satz, nicht der Floskel. Wer „… auf dem Laufenden —
       ohne Hype." mitsamt Punkt entfernt, laesst einen Satz ohne Ende stehen (einmal
       passiert, in welche-ki-fuer-was.html). Endete die Floskel mit einem Punkt,
       kommt er zurueck — aber nur, wenn davor nicht schon eines steht, sonst entsteht
       „in 5 Minuten.." (ebenfalls einmal passiert, in index.html).""" 
    if not m.group(1):
        return ""
    davor = m.string[:m.start()].rstrip()
    return "" if davor.endswith((".", "!", "?", ":", "…")) else "."


# Das Abzeichen über der Überschrift: auf 308 Seiten derselbe Zusatz. Der Seitentyp
# allein („Branchen-Guide") sagt schon alles, was das Abzeichen sagen soll.
BADGE = (re.compile(r'(class="badge">[^<]*?)\s*·\s*ehrlich,\s*ohne Hype'), r'\1')


def bereinigen(h):
    """Gibt (neuer Text, Anzahl entfernt) zurück. Titel und Überschriften bleiben."""
    # Titel/Überschriften schützen: Inhalt merken, durch Platzhalter ersetzen.
    schutz = []

    def merken(m):
        schutz.append(m.group(0))
        return "\x00%d\x00" % (len(schutz) - 1)

    h = re.sub(r'(?is)<title>.*?</title>', merken, h)
    h = re.sub(r'(?is)<h[1-3][^>]*>.*?</h[1-3]>', merken, h)

    vorher = len(re.findall(r'ohne Hype', h))
    h = BADGE[0].sub(BADGE[1], h)
    for muster in SCHWANZ:
        h = muster.sub(_weg, h)
    nachher = len(re.findall(r'ohne Hype', h))

    h = re.sub(r'\x00(\d+)\x00', lambda m: schutz[int(m.group(1))], h)
    return h, vorher - nachher


def seiten():
    for muster in ("*.html", "*/*.html"):
        for p in sorted(glob.glob(os.path.join(ROOT, muster))):
            if os.sep + "node_modules" + os.sep in p:
                continue
            yield p


def main():
    schreiben = "--schreiben" in sys.argv
    ges_vor = ges_weg = betroffen = mehrfach = 0
    for p in seiten():
        h = open(p, encoding="utf-8", errors="ignore").read()
        if "ohne Hype" not in h:
            continue
        ges_vor += len(re.findall(r'ohne Hype', h))
        neu, weg = bereinigen(h)
        if weg:
            betroffen += 1
            ges_weg += weg
            if schreiben:
                open(p, "w", encoding="utf-8").write(neu)
        if len(re.findall(r"ohne Hype", neu)) > 1:
            mehrfach += 1
    print(f"„ohne Hype\": {ges_vor} Vorkommen · {ges_weg} entfernbar auf {betroffen} Seiten "
          f"· es blieben {ges_vor - ges_weg}")
    print(f"Seiten, auf denen danach noch mehr als eines steht: {mehrfach}")
    if not schreiben:
        print("(nur gezählt — mit --schreiben wird geändert)")


if __name__ == "__main__":
    main()
