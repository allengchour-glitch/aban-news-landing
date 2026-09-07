#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gegenprobe für tools/flaechen.py."""
import importlib.util
import os
import sys

spec = importlib.util.spec_from_file_location(
    "f", os.path.join(os.path.dirname(os.path.abspath(__file__)), "flaechen.py"))
f = importlib.util.module_from_spec(spec)
spec.loader.exec_module(f)

FAELLE = [
    ("background:linear-gradient(135deg,#fef3c7,#fffdf9)", "background:#fef3c7", 1,
     "Creme-auf-Creme wird eine Fläche"),
    ("background:linear-gradient(180deg,#d97706,#fbbf24)", "background:#d97706", 1,
     "der Akzentbalken bekommt die Markenfarbe"),
    ("background:linear-gradient(180deg,var(--cream),var(--bg))", "background:var(--cream)", 1,
     "auch mit Variablen"),
    ("background:linear-gradient(90deg,#fff,transparent)", None, 0,
     "die Maske der Laufschrift bleibt — sonst schneidet der Text hart ab"),
    ("background:linear-gradient(90deg,rgba(255,255,255,1),rgba(255,255,255,0))", None, 0,
     "auch die Maske mit rgba-Null bleibt"),
    ("background:linear-gradient(135deg,#1f2937,#3a2a12 55%,#b45309)", None, 0,
     "dreistufig ist ein Motiv, keine Fläche"),
    ("background:linear-gradient(currentColor,currentColor)", None, 0,
     "currentColor ist ein animierter Unterstrich"),
    ("h1{background:linear-gradient(90deg,#a,#b);-webkit-background-clip:text}", None, 0,
     "eine Datei mit Verlaufs-SCHRIFT wird ganz ausgelassen"),
    ("background-image:linear-gradient(135deg,#fef3c7,#fffdf9)", None, 0,
     "background-image nimmt keine Farbe an — sonst wäre die Fläche danach durchsichtig"),
    ("-webkit-mask-image:linear-gradient(90deg,#000,#fff)", None, 0,
     "eine Maske ist keine Fläche"),
    ("<p>Kein CSS hier drin</p>", None, 0, "unbeteiligte Datei bleibt gleich"),
]


def main():
    fehler = 0
    for ein, soll, n_soll, was in FAELLE:
        neu, n = f.umschreiben(ein)
        soll = ein if soll is None else soll
        ok = neu == soll and n == n_soll
        print(("  ok      " if ok else "  FEHLER  ") + was)
        if not ok:
            print(f"          erwartet: {soll!r} ({n_soll}×)\n          bekommen: {neu!r} ({n}×)")
            fehler += 1
    print(f"\n{len(FAELLE) - fehler} von {len(FAELLE)} Fällen grün")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
