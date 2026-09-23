#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Selbsttest fuer ist_handklinge — die VERSANDFRAGE (Lehre 16.09.2026, Bestellung #1017).

Jeder Fall stammt aus dem echten Katalog vom 16.09.2026. Die NEIN-Faelle sind
wichtiger als die JA-Faelle: ein Fehlalarm nimmt verkaufsfaehige Ware aus dem
Shop, und genau daran ist die erste Fassung dieser Regel gescheitert
(«Elektrischer Schleifer fuer Bohrer und Messer» ist ein Schaerfgeraet).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from klingenregel import ist_handklinge, ist_klinge

SPERREN = [
    "Fuda Taschenmesser aus Damaststahl",          # die zurueckgesandte Ware selbst
    "Damast Kochmesser mit Hammerschlag-Finish",
    "Longquan Knochenhackmesser, handgeschmiedet",
    "Dragon's Descendant Knochenbeil",
    "Multifunktionsaxt für Outdoor und Reise",
    "Klappmesser aus Damaskus-Stahl",
    "Edelstahl-Messerset, 6-teilig",               # Fugen-s: ist_klinge sagt hier FALSE
    "Keramikmesser-Set mit schwarzer Klinge, 5-teilig",
    "Käsebrett-Set mit 3 Messern",                 # Plural-n: ist_klinge sagt hier FALSE
    "Klingen-Set mit Metallgriff",
    "Wild Wolf Sever Messer, scharf und leicht zu schleifen",
    "Stahlmesser für Fleisch",
    # 23.09.2026 (Social-Messung): englische CJ-Titel und «Messer MIT Hülle» fielen durch
    "Alloy Outdoor A Folding Knife Blade Removable",
    "Damast Boning Knife aus AUS10-Stahl",
    "Hackmesser aus Edelstahl mit Schutzhülle",
    "Geschmiedetes Küchenmesser mit Lederscheide",
    "Kitchen Cleaver with Sheath",
    "Messerblock mit 6 Messern",
    "Knife Block Set with 5 Knives",
    "Klappmesser inkl. Etui",
]
DURCHLASSEN = [
    "Magnetischer Messerhalter aus Bambus",        # Zubehoer, keine Klinge im Paket
    "Messerblock aus Massivholz",
    "Elektrischer Messerschärfer",
    "Elektrischer Schleifer für Bohrer und Messer",# Fehlgriff der ersten Fassung
    "Messer-Wetzstahl mit Holzgriff",
    "Yoland Schwertpflegeöl – Rostschutz für Klingen",
    "Retro Schwertabdeckung",
    "Mittelalterlicher Doppel-Schwertgurt aus PU-Leder",
    "Küchenregal für Gewürze & Messer",
    "350ml USB-Blender mit 3D-Messer",             # gekapselte Klinge im Geraet
    "Rasierer mit LCD-Display und 2-in-1-Klinge",
    "Kabelloser Trimmer mit SK5-Klinge",
    "Retro Schere mit spitzer Klinge",
    "Keramik Sparschäler mit Zirkonia-Klinge",
    "Elektrischer 3-Klingen Zwiebelschneider",
    "Elektronischer Handkraft-Messer",             # Dynamometer, kein Messer
    "90W Lötspitze, messerförmig, Ø 5mm",
    "Washed Machete Jeans für Herren",             # Waschung
    "Farbenprächtige Schwertfisch-Diamantmalerei", # Fisch
    "Kissen mit Schwertblatt-Nagelblumen-Muster",  # Bogenhanf
    "Roland Plotter-Klingen (15er-Set)",           # Bastelgeraet-Zubehoer
    # 23.09.2026: Gegenrichtung der englischen Woerter und der Mit-Huelle-Regel
    "Knife Sharpener 3-Stage",
    "Leather Knife Sheath",
    "Magnetic Knife Holder Strip",
    "Sticker Swiss Army Knife",
    "Tasse mit Taschenmesser-Motiv",
    "Messerschärfer mit Schutzhülle",
    "Gemüsehobel mit 5 Klingen und Schutzhülle",
    "Spiralschneider mit 3 Klingen",
    "Handyhülle mit Messer-Motiv",
    "Dagger Earrings aus Silber",
]

def main():
    fehler = []
    for t in SPERREN:
        if not ist_handklinge(t):
            fehler.append(f"  ❌ sollte SPERREN, tut es nicht: {t}")
    for t in DURCHLASSEN:
        if ist_handklinge(t):
            fehler.append(f"  ❌ sollte DURCHLASSEN, sperrt aber: {t}")
    print(f"{len(SPERREN)+len(DURCHLASSEN)} Faelle geprueft — "
          f"{len(SPERREN)} sollen sperren, {len(DURCHLASSEN)} sollen durch.")
    # Die Gegenprobe, die den Zweck der zweiten Frage belegt: drei Faelle, in denen
    # sich ist_klinge und ist_handklinge BEWUSST unterscheiden.
    for t, k, h in [("Edelstahl-Messerset, 6-teilig", False, True),
                    ("Messerblock aus Massivholz", False, False),
                    ("Retro Schwertabdeckung", True, False)]:
        if (ist_klinge(t), ist_handklinge(t)) != (k, h):
            fehler.append(f"  ❌ Unterschied verloren bei {t}: "
                          f"ist_klinge={ist_klinge(t)} ist_handklinge={ist_handklinge(t)}")
    if fehler:
        print("\n".join(fehler)); sys.exit(1)
    print("✅ Handklingenregel: alle Faelle richtig.")

if __name__ == "__main__":
    main()
