#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gegenprobe für tools/ecken.py — beide Richtungen.

    python3 tools/test_ecken.py
"""
import importlib.util
import os
import sys

spec = importlib.util.spec_from_file_location(
    "ecken", os.path.join(os.path.dirname(os.path.abspath(__file__)), "ecken.py"))
e = importlib.util.module_from_spec(spec)
spec.loader.exec_module(e)

FAELLE = [
    ("border-radius:8px", "border-radius:8px", 0, "8 px ist schon eine Sprosse"),
    ("border-radius:9px", "border-radius:8px", 1, "9 rutscht auf die kleine Sprosse"),
    ("border-radius:10px", "border-radius:14px", 1, "10 ist eine Karte"),
    ("border-radius:28px", "border-radius:14px", 1, "auch 28 ist eine Karte"),
    ("border-radius: 3px", "border-radius: 8px", 1, "Leerzeichen nach dem Doppelpunkt"),
    ("border-radius:999px", "border-radius:999px", 0, "die Pille bleibt Pille"),
    ("border-radius:99px", "border-radius:999px", 1, "99 war eine halbe Pille"),
    ("border-radius:0", "border-radius:0", 0, "eine Kante ist eine Entscheidung"),
    ("border-radius:12px 12px 0 0", "border-radius:14px 14px 0 0", 1,
     "mehrwertige Form bleibt Form, jeder Wert kommt auf die Leiter"),
    ("border-radius:50%", "border-radius:50%", 0, "Prozent heisst Kreis — nicht anfassen"),
    ("border-radius:var(--r)", "border-radius:var(--r)", 0, "var() bleibt"),
    ("border-radius:.5em", "border-radius:.5em", 0, "em bleibt"),
    ("<p>border-radius steht hier nur im Text</p>", "<p>border-radius steht hier nur im Text</p>", 0,
     "ohne Doppelpunkt ist es kein CSS"),
]


def main():
    fehler = 0
    for ein, soll, n_soll, was in FAELLE:
        neu, n = e.umschreiben(ein)
        ok = neu == soll and n == n_soll
        print(("  ok      " if ok else "  FEHLER  ") + was)
        if not ok:
            print(f"          erwartet: {soll!r} ({n_soll}×)")
            print(f"          bekommen: {neu!r} ({n}×)")
            fehler += 1
    print(f"\n{len(FAELLE) - fehler} von {len(FAELLE)} Fällen grün")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
