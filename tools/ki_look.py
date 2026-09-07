#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Misst, woran eine Seite „nach KI gemacht" aussieht — in Zahlen, nicht im Gefühl.

    python3 tools/ki_look.py            # Übersicht über alle Seiten
    python3 tools/ki_look.py --json     # maschinenlesbar (für Vorher/Nachher)

⚠️ WOZU. User 2026-09-05: „zu fest KI gemacht". Das ist ein Eindruck; damit man ihn
   gezielt abbauen und den Erfolg belegen kann, zählt dieses Werkzeug die Muster, die ihn
   erzeugen — jedes einzeln, über den ganzen Bestand:
     · Emoji in H1/H2 (das Icon-vor-jeder-Überschrift-Muster)
     · Textbausteine, die auf Hunderten Seiten identisch wiederkehren („ohne Hype",
       „Buzzword-Bingo", „ehrlich", „Auf einen Blick", „kein Login")
     · Farbverläufe (linear-gradient) und stark gerundete Kästen (border-radius ≥ 14 px)
     · Karten-in-Karten (verschachtelte Rahmen)
   Es urteilt nicht — es zählt. Das Urteil steht in reports/KI-LOOK.md.
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMO = re.compile(r'[\U0001F300-\U0001FAFF☀-➿]')
TICS = ["ohne Hype", "kein Hype", "Buzzword-Bingo", "ehrlich", "Auf einen Blick", "kein Login", "Kurz & bündig"]


def messen(pfad):
    h = open(pfad, encoding="utf-8", errors="ignore").read()
    h1 = re.findall(r'<h1[^>]*>(.*?)</h1>', h, re.S)
    h2 = re.findall(r'<h2[^>]*>(.*?)</h2>', h, re.S)
    text = re.sub(r'(?is)<(script|style)[^>]*>.*?</\1>', ' ', h)
    tics = {t: len(re.findall(re.escape(t).replace(r'\&', '(?:&|&amp;)'), text)) for t in TICS}
    return {
        "h1_emoji": sum(1 for x in h1 if EMO.search(x)),
        "h2_emoji": sum(1 for x in h2 if EMO.search(x)),
        "verlaeufe": len(re.findall(r'linear-gradient\(', h)),
        # ⚠️ Bis 2026-09-07 stand hier „Kästen ≥ 14 px gerundet". Diese Zahl war nach
        # der Radien-Leiter (tools/ecken.py) WERTLOS: 14 px ist jetzt die gewählte
        # Karten-Sprosse, also stieg der „Befund" von 4119 auf 9591, obwohl genau das
        # die Verbesserung war. Ein Messgerät, das eine Entscheidung als Fehler zählt,
        # misst das Falsche. Gezählt wird jetzt, was den Eindruck wirklich erzeugt:
        # wie viele VERSCHIEDENE Radien eine Seite verwendet.
        "radien": len(set(re.findall(r'border-radius:\s*(\d+(?:\.\d+)?)px', h))),
        "tics": sum(tics.values()),
        "tics_detail": tics,
    }


def main():
    seiten = sorted(glob.glob(os.path.join(ROOT, "*.html")))
    summe = {"h1_emoji": 0, "h2_emoji": 0, "verlaeufe": 0, "tics": 0}
    radien_gesamt = set()
    betroffen = {k: 0 for k in summe}
    tics_gesamt = {t: 0 for t in TICS}
    radien_max = 0
    for p in seiten:
        m = messen(p)
        radien_max = max(radien_max, m["radien"])
        radien_gesamt |= set(re.findall(r'border-radius:\s*(\d+(?:\.\d+)?)px',
                                        open(p, encoding="utf-8", errors="ignore").read()))
        for k in summe:
            summe[k] += m[k]
            if m[k]:
                betroffen[k] += 1
        for t in TICS:
            tics_gesamt[t] += m["tics_detail"][t]
    n = len(seiten)
    if "--json" in sys.argv:
        print(json.dumps({"seiten": n, "summe": summe, "betroffen": betroffen, "tics": tics_gesamt,
                          "radien": sorted(float(x) for x in radien_gesamt),
                          "radien_hoechstens_je_seite": radien_max}, ensure_ascii=False, indent=1))
        return
    print(f"KI-Look über {n} Seiten\n")
    print(f"{'Muster':28} {'Vorkommen':>10} {'Seiten':>8}")
    for k, label in [("h1_emoji", "Emoji in H1"), ("h2_emoji", "Emoji in H2"), ("tics", "Textbausteine (alle)"),
                     ("verlaeufe", "Farbverläufe")]:
        print(f"{label:28} {summe[k]:>10} {betroffen[k]:>8}")
    print(f"{'Verschiedene Eckenradien':28} {len(radien_gesamt):>10} {'(max ' + str(radien_max) + ' je Seite)':>8}")
    print("\nTextbausteine einzeln:")
    for t, v in sorted(tics_gesamt.items(), key=lambda x: -x[1]):
        print(f"  {t:20} {v:>6}")


if __name__ == "__main__":
    main()
