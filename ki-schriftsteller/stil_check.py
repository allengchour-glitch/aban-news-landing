#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
stil_check.py - Selbstpruefung fuer den Schreibstil (Motiv-Disziplin & Tabu).

Wozu: Beim Schreiben mit mehreren Durchgaengen/Agenten nutzen sich
Signatur-Motive ab (immer "geteiltes Herz", immer "drei Atemzuege"). Dieses
Skript misst das objektiv und meldet, wo variiert werden muss - damit der Ton
ueber ein ganzes Buch EINER bleibt. Reine Standardbibliothek, keine API.

Verwendung:
  python3 stil_check.py drachen/kapitel-band1
  python3 stil_check.py <kapitel-ordner> [--max N]   # Schwelle (Default 3)

Exit-Code: 0 wenn alles unter der Schwelle, 1 wenn ein Motiv ueberstrapaziert
oder ein Tabu-Treffer vorliegt - so taugt es auch fuer einen CI-Schritt.
"""
import argparse
import glob
import os
import re
import sys
from collections import Counter

# Signatur-Motive: gut, aber nur variiert. Mehr als MAX identische Wortlaute
# ueber das ganze Buch -> Hinweis zum Umformulieren.
MOTIVE = [
    r"geteilte[sn]? Herz",
    r"drei Atemz[uü]ge[n]?",
    r"graue Str[aä]hne",
    r"ergraut\w*",
    r"Ged[aä]chtnis, das nichts",
    r"leere[s]? L[aä]cheln",
    r"vernarbte[srn]?",
    r"das geteilte",
]

# Tabu: Hype-Woerter / moderner Slang / Mehrfach-Ausrufezeichen.
TABU = [
    r"revolution\w*", r"bahnbrechend", r"game.?changer", r"disruptiv\w*",
    r"einzigartig", r"unglaublich", r"quantensprung", r"\bokay\b", r"\bcool\b",
    r"!!",
]


def lade_kapitel(ordner):
    texte = {}
    for pfad in sorted(glob.glob(os.path.join(ordner, "kapitel-*.md"))):
        with open(pfad, encoding="utf-8") as f:
            texte[os.path.basename(pfad)] = f.read()
    return texte


def zaehle(texte, muster):
    """Zaehlt Treffer eines Musters ueber alle Kapitel; gibt (gesamt, pro-Datei)."""
    rx = re.compile(muster, re.IGNORECASE)
    pro_datei = Counter()
    for name, txt in texte.items():
        n = len(rx.findall(txt))
        if n:
            pro_datei[name] = n
    return sum(pro_datei.values()), pro_datei


def main():
    p = argparse.ArgumentParser(description="Stil-Selbstpruefung: Motiv-Disziplin & Tabu.")
    p.add_argument("ordner", help="Ordner mit kapitel-NN.md")
    p.add_argument("--max", type=int, default=3, help="Schwelle identischer Motiv-Wortlaute (Default 3)")
    args = p.parse_args()

    texte = lade_kapitel(args.ordner)
    if not texte:
        sys.exit("! Keine kapitel-*.md in %s" % args.ordner)

    print("Geprueft: %d Kapitel, ~%d Woerter\n" %
          (len(texte), sum(len(t.split()) for t in texte.values())))

    probleme = 0

    print("== Motiv-Disziplin (Schwelle %d) ==" % args.max)
    for muster in MOTIVE:
        gesamt, pro = zaehle(texte, muster)
        if gesamt > args.max:
            probleme += 1
            top = ", ".join("%s(%d)" % (k, v) for k, v in pro.most_common(4))
            print("  ! UEBERNUTZT %2dx  %-26s -> variieren in: %s" % (gesamt, muster, top))
        elif gesamt:
            print("  ok %2dx           %s" % (gesamt, muster))

    print("\n== Tabu (Hype/Slang/!!) ==")
    tabu_treffer = 0
    for muster in TABU:
        gesamt, pro = zaehle(texte, muster)
        if gesamt:
            tabu_treffer += gesamt
            print("  ! %dx  %s  in %s" % (gesamt, muster, ", ".join(pro)))
    if not tabu_treffer:
        print("  sauber.")

    print("\n== Laengen-Verteilung ==")
    laengen = {n: len(t.split()) for n, t in texte.items()}
    kurz = [n for n, w in sorted(laengen.items()) if w < 900]
    if kurz:
        print("  unter 900 Woertern (gehetzt-Verdacht): " + ", ".join(
            "%s(%d)" % (n.replace("kapitel-", "K").replace(".md", ""), laengen[n]) for n in kurz))
    else:
        print("  alle Kapitel >= 900 Woerter.")

    fazit = probleme + tabu_treffer
    print("\nFazit: %d Motiv-Warnung(en), %d Tabu-Treffer." % (probleme, tabu_treffer))
    sys.exit(1 if fazit else 0)


if __name__ == "__main__":
    main()
