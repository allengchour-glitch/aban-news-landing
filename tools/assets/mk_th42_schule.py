# -*- coding: utf-8 -*-
"""Asset-Charge 42 (th42_*): SCHULE UND PAUSENHOF.

Die Schule bei (-56|100) ist eine Kiste: Sockel, Korpus, flache Dachplatte,
Fenster als aufgeklebte Rechtecke, ein Glockenturm aus zwei Quadern, und ein
Pausenhof, auf dem genau ein Basketballkorb steht. Dieselbe Ausgangslage wie
beim Bahnhof vor Charge 41 und den Stadthaeusern vor Charge 37.

Konventionen wie th5-th41 (siehe models/TH5-ASSETS.md), Werkzeug aus th_werkzeug.py:
  * Ursprung mittig, Unterkante exakt z = 0, Meter, PBR-Materialien.
  * Schauseite (Eingang, Korbbrett, Tafel) auf Blender +y -> three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT.

RASTER: th42_fahrradstaender laeuft auf x += 3,20.

⚠️ Die vier Lehren, die in dieser Datei angewendet sind, stehen an Ort und Stelle:
   Dach als KOERPER (keil_y, um z gedreht), Glas VOR der Wand, Rahmen aus vier
   Balken, und Wand gegen Zierglied deutlich im Hellwert trennen.
"""
import os, math
import th_werkzeug as W
from th_werkzeug import (bpy, bmesh, neu, mat, mat_bild, leucht, box, zyl, kugel,
                         kegel, scheibe, flach, dreh, rohr, bogen_pkt, volute_pkt,
                         strebe, kranz, runden, export, keil_y, rad, TAU)

def _mats():
    """⚠️ Wand OCKER (0,66), Zierglied fast weiss (0,95). Der Abstand von 0,29 im
    Hellwert ist die eigentliche Lehre aus Charge 37 und 41: liegen Grund und
    Zierglied beieinander, verschwindet jedes Gesims, egal wie fein es ist."""
    return {
      "wand":  mat_bild("SuWand", "hausputz.png", (0.66,0.55,0.38), 0.88, 0.0, True),
      "wand2": mat("SuWand2",  (0.52,0.43,0.29), 0.88),
      "stein": mat("SuStein",  (0.95,0.94,0.90), 0.84),
      "sockel":mat("SuSockel", (0.40,0.37,0.32), 0.90),
      "dach":  mat("SuDach",   (0.30,0.32,0.36), 0.74),
      "dach2": mat("SuDach2",  (0.22,0.24,0.28), 0.76),
      "holz":  mat("SuHolz",   (0.46,0.30,0.17), 0.86),
      "stahl": mat("SuStahl",  (0.56,0.58,0.62), 0.42, 0.60),
      "dunkel":mat("SuDunkel", (0.13,0.14,0.16), 0.68),
      "beton": mat("SuBeton",  (0.52,0.52,0.50), 0.93),
      "rot":   mat("SuRot",    (0.68,0.22,0.14), 0.70),
      "blau":  mat("SuBlau",   (0.14,0.30,0.56), 0.70),
      "gruen": mat("SuGruen",  (0.18,0.42,0.24), 0.72),
      "gelb":  mat("SuGelb",   (0.84,0.66,0.14), 0.70),
      "messing":mat("SuMessing",(0.62,0.48,0.18), 0.34, 0.70),
      "glas":  mat("SuGlas",   (0.18,0.26,0.32), 0.14, 0.20),
      "licht": leucht("SuLicht", (1.00,0.93,0.74), 1.2),
    }

def _modul(name, bauer, bevel=0.012):
    neu(); bauer(); export(name, bevel, 2)

def _rahmen(x, yf, z, b, h, st, m, mat_="stein"):
    """⚠️ EIN RAHMEN SIND VIER BALKEN — nicht eine Platte in Fenstergroesse davor.
    Der Fehler aus Charge 35, 37, 37 und 38."""
    box(x, yf, z + h/2 - st/2, b, 0.07, st, m[mat_])
    box(x, yf, z - h/2 + st/2, b, 0.07, st, m[mat_])
    for s in (-1, 1):
        box(x + s*(b/2 - st/2), yf, z, st, 0.07, h - 2*st, m[mat_])

def _fenster(x, z, br, ho, m, yw, felder=3):
    """Schulfenster: hoch, mehrfach gesprosst.

    ⚠️ Glas auf yw + 0,02 mit 6 cm Tiefe -> Aussenkante yw + 0,05, also 5 cm VOR
    der Wand. Dahinter waere es unsichtbar (in Charge 40 hatte deshalb kein
    einziger von sechs Wagen Scheiben)."""
    box(x, yw + 0.02, z, br, 0.06, ho, m["glas"])
    for k in range(1, felder):
        box(x, yw + 0.035, z - ho/2 + ho*k/felder, br - 0.03, 0.06, 0.055, m["stein"])
    box(x, yw + 0.035, z, 0.06, 0.06, ho - 0.04, m["stein"])
    _rahmen(x, yw + 0.05, z, br + 0.18, ho + 0.18, 0.12, m)
    box(x, yw + 0.08, z - ho/2 - 0.14, br + 0.34, 0.16, 0.10, m["stein"])   # Sohlbank

def _satteldach(B, T, HH, zbasis, m, ueber=0.75, mat_="dach"):
    """Satteldach als KOERPER, First auf x.

    ⚠️ Charge 41 hatte es zuerst als vier geneigte Platten — die Stirnplatten
    standen waagrecht aus dem Haus heraus. `keil_y` zieht den Giebelquerschnitt
    zu einem Koerper aus, inklusive geschlossener Giebelflaechen. Das Profil
    liegt in x-z, der First soll auf x laufen: also einmal um z drehen. Eine
    Drehung um z laesst „oben" oben — die Eulerfalle aus Charge 39 kommt hier
    gar nicht erst vor."""
    TD = T/2 + ueber
    d = keil_y([(-TD, 0.0), (TD, 0.0), (TD, 0.28), (0.0, HH), (-TD, 0.28)],
               0.0, B + 2*ueber, m[mat_], cz=zbasis, name="Satteldach")
    d.rotation_euler[2] = math.pi/2
    for s in (-1, 1):                                                   # Traufbrett
        box(0, s*(TD - 0.06), zbasis + 0.16, B + 2*ueber + 0.1, 0.14, 0.32, m["stein"])
    box(0, 0, zbasis + HH, B + 0.3, 0.40, 0.20, m["dach2"])             # First
    return d

# ================================================================ 1) Schulhaus
def _b_schule():
    """Schulhaus, 22,0 x 13,5 x 15,4 m. Eingang auf +y.

    Zwei Geschosse mit hohen Klassenfenstern, Lisenen zwischen den Achsen,
    Gurtgesims, Satteldach, Eingangsrisalit mit Freitreppe und Dachreiter mit
    Glocke — das, was ein Schulhaus von einem Buerokasten unterscheidet."""
    m = _mats()
    B, T, H = 20.6, 11.4, 8.8
    box(0, 0, 0.36, B + 1.1, T + 1.1, 0.72, m["sockel"])                # Sockel
    box(0, 0, 0.94, B + 0.6, T + 0.6, 0.36, m["stein"])
    box(0, 0, H/2 + 1.12, B, T, H, m["wand"])                           # Korpus
    for k in range(8):                                                  # Lisenen
        xx = -B/2 + 0.75 + k*(B - 1.5)/7
        for s in (-1, 1):
            box(xx, s*(T/2 + 0.02), H/2 + 1.20, 0.50, 0.14, H - 0.5, m["stein"])
    for s in (-1, 1):                                                   # Ecklisenen
        box(s*(B/2 - 0.30), 0, H/2 + 1.20, 0.60, T + 0.16, H - 0.5, m["stein"])
    box(0, 0, 5.28, B + 0.24, T + 0.24, 0.26, m["stein"])               # Gurtgesims
    box(0, 0, H + 1.16, B + 0.55, T + 0.55, 0.34, m["stein"])           # Hauptgesims
    for e in range(2):                                                  # Klassenfenster
        zz = 3.20 + e*3.30
        for k in range(7):
            xx = -B/2 + 1.55 + k*(B - 3.1)/6
            if e == 0 and abs(xx) < 1.7: continue
            _fenster(xx, zz, 1.45, 2.20, m, T/2)
            _fenster(xx, zz, 1.45, 2.20, m, -T/2 - 0.12)
    for s in (-1, 1):                                                   # Giebelfenster
        for e in range(2):
            zz = 3.20 + e*3.30
            box(s*(B/2 + 0.02), 0, zz, 0.06, 1.30, 2.00, m["glas"])
            box(s*(B/2 + 0.06), 0, zz, 0.10, 1.48, 2.18, m["stein"])
            box(s*(B/2 + 0.10), 0, zz, 0.09, 1.30, 2.00, m["glas"])
    # Eingangsrisalit: die Tuer ist eine OEFFNUNG, kein Brett auf der Wand
    box(0, T/2 + 0.30, H/2 + 1.12, 5.20, 0.90, H - 0.4, m["wand2"])
    box(0, T/2 + 0.70, 2.55, 2.90, 0.34, 3.60, m["dunkel"])
    for s in (-1, 1):
        box(s*0.68, T/2 + 0.86, 2.55, 1.30, 0.10, 3.42, m["holz"])
        box(s*0.68, T/2 + 0.93, 3.30, 0.96, 0.06, 1.70, m["glas"])
    _rahmen(0, T/2 + 0.96, 2.55, 3.14, 3.86, 0.20, m)
    rohr(bogen_pkt(-1.50, 1.50, 4.50, 0.66, 9), 0.10, m["stein"], 8, True, "Portalbogen")
    for k in range(3):                                                  # Freitreppe
        box(0, T/2 + 0.98 + k*0.36, 0.60 - k*0.20, 4.00 - k*0.30, 0.38, 0.20, m["sockel"])
    box(0, T/2 + 0.80, 6.60, 4.30, 0.24, 0.70, m["stein"])              # Schulschild
    box(0, T/2 + 0.90, 6.60, 3.80, 0.08, 0.44, m["dunkel"])
    for k in range(7):
        box(-1.70 + k*0.57, T/2 + 0.95, 6.60, 0.32, 0.06, 0.24, m["stein"])
    vd = box(0, T/2 + 1.75, 5.05, 5.60, 2.00, 0.18, m["stahl"])         # Vordach
    vd.rotation_euler[0] = -0.15
    for s in (-1, 1):
        strebe((s*2.30, T/2 + 0.80, 4.30), (s*2.30, T/2 + 2.55, 4.96), 0.08, m["stahl"])
    _satteldach(B, T, 3.30, H + 1.33, m)
    # Dachreiter mit Glocke — offener Belfried, nicht zwei gestapelte Quader
    TX, TZ = -6.4, H + 1.33 + 2.10
    box(TX, 0, TZ + 0.55, 2.30, 2.30, 1.10, m["stein"])
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(TX + sx*0.90, sy*0.90, TZ + 2.00, 0.24, 0.24, 1.80, m["stein"])
    box(TX, 0, TZ + 2.96, 2.50, 2.50, 0.26, m["stein"])
    flach(kegel(TX, 0, TZ + 3.85, 1.85, 0.0, 1.60, m["dach2"], 4, rot=(0, 0, math.pi/4)))
    flach(zyl(TX, 0, TZ + 4.78, 0.05, 0.50, m["messing"], 8))
    flach(kugel(TX, 0, TZ + 5.06, 0.13, m["messing"], 8))
    flach(dreh([(0.00, 0.00), (0.34, 0.06), (0.40, 0.26), (0.30, 0.60),
                (0.14, 0.80), (0.10, 0.92), (0.00, 0.94)],
               m["messing"], 16, x=TX, y=0.0, z=TZ + 1.10, name="Glocke"))
    box(TX, 0, TZ + 2.20, 1.90, 0.14, 0.14, m["holz"])                  # Glockenjoch

def schule(): _modul("th42_schule", _b_schule)

# ================================================================ 2) Turnhalle
def _b_turnhalle():
    """Turnhalle, 26,0 x 16,0 x 8,6 m — flach gedeckt, Oberlichtband, Sprossenwand
    aussen, doppelfluegliges Tor.

    Eine Halle ist breit und niedrig; genau deshalb traegt sie ihre Wirkung aus
    dem OBERLICHTBAND, nicht aus Fenstern in Augenhoehe."""
    m = _mats()
    B, T, H = 25.0, 15.0, 6.40
    box(0, 0, 0.26, B + 0.9, T + 0.9, 0.52, m["sockel"])
    box(0, 0, H/2 + 0.50, B, T, H, m["wand"])
    for k in range(9):                                                  # Wandpfeiler
        xx = -B/2 + 1.0 + k*(B - 2.0)/8
        for s in (-1, 1):
            box(xx, s*(T/2 + 0.03), H/2 + 0.50, 0.44, 0.16, H - 0.3, m["stein"])
    for s in (-1, 1):                                                   # Oberlichtband
        box(0, s*(T/2 - 0.01), 5.20, B - 2.6, 0.10, 1.40, m["glas"])
        for k in range(11):
            box(-B/2 + 1.6 + k*(B - 3.2)/10, s*(T/2 + 0.01), 5.20, 0.14, 0.11, 1.50, m["stein"])
        box(0, s*(T/2 + 0.01), 5.98, B - 2.4, 0.13, 0.18, m["stein"])
        box(0, s*(T/2 + 0.01), 4.42, B - 2.4, 0.13, 0.18, m["stein"])
    box(0, 0, H + 0.86, B + 0.9, T + 0.9, 0.28, m["dach2"])             # Attika + Dach
    box(0, 0, H + 1.10, B + 0.5, T + 0.5, 0.22, m["dach"])
    for k in range(7):                                                  # Lichtkuppeln
        flach(kugel(-9.0 + k*3.0, 0, H + 1.30, 0.62, m["glas"], 9))
    # Tor: zwei Fluegel in einer OEFFNUNG
    # ⚠️ Erst auf z = 1,90 mit 3,90 Rahmenhoehe: der untere Rahmenbalken sass
    # damit auf 1,90 - 1,95 + 0,11 = 0,06 und reichte mit seiner halben Hoehe bis
    # -0,05. Ein Rahmen wird von der MITTE aus gerechnet — seine Unterkante ist
    # z - h/2, nicht z.
    box(0, T/2 + 0.06, 2.02, 4.20, 0.30, 3.60, m["dunkel"])
    for s in (-1, 1):
        box(s*1.00, T/2 + 0.22, 2.02, 1.90, 0.10, 3.40, m["stahl"])
        for k in range(4):
            box(s*1.00, T/2 + 0.28, 0.82 + k*0.80, 1.72, 0.05, 0.10, m["dunkel"])
    _rahmen(0, T/2 + 0.30, 2.02, 4.50, 3.86, 0.22, m)
    for s in (-1, 1):                                                   # Sprossenwand aussen
        for k in range(9):
            flach(zyl(s*9.6, -T/2 - 0.14, 1.00 + k*0.44, 0.045, 1.60, m["holz"], 8,
                      (0, math.pi/2, 0)))
        for q in (-1, 1):
            box(s*9.6 + q*0.80, -T/2 - 0.14, 2.70, 0.10, 0.10, 3.50, m["holz"])

def turnhalle(): _modul("th42_turnhalle", _b_turnhalle)

# ================================================================ 3) Fahrradstaender
def _b_fahrradstaender():
    """Anlehnbuegel-Reihe mit Dach, Raster 3,20 m.

    ⚠️ Buegel, keine Radklemmen: eine Reihe schmaler Schlitze liest sich aus
    zwei Metern als Rost im Boden."""
    m = _mats()
    BR = 3.20
    for k in range(3):
        xx = -BR/2 + 0.55 + k*(BR - 1.1)/2
        rohr([(xx, -0.35, 0.02), (xx, -0.35, 0.72), (xx, 0.0, 0.86),
              (xx, 0.35, 0.72), (xx, 0.35, 0.02)], 0.045, m["stahl"], 8, True, "Buegel")
        box(xx, 0, 0.78, 0.09, 0.72, 0.06, m["stahl"])
    # ⚠️ Das Dach war 1,50 tief auf 2,44 Hoehe und ueberragte die drei Buegel wie
    # eine Pergola. Ein Radunterstand deckt die Raeder, nicht den Hof.
    for s in (-1, 1):                                                   # Dachstuetzen
        box(s*(BR/2 - 0.20), -0.58, 1.06, 0.10, 0.10, 2.12, m["stahl"])
        strebe((s*(BR/2 - 0.20), -0.58, 1.94), (s*(BR/2 - 0.20), 0.26, 2.18), 0.06, m["stahl"])
    dk = box(0, -0.16, 2.26, BR + 0.16, 1.22, 0.10, m["stahl"])         # Pultdach
    dk.rotation_euler[0] = 0.16
    for k in range(6):
        dr = box(-BR/2 + 0.30 + k*(BR - 0.6)/5, -0.16, 2.32, 0.08, 1.22, 0.045, m["stahl"])
        dr.rotation_euler[0] = 0.16

def fahrradstaender(): _modul("th42_fahrradstaender", _b_fahrradstaender, 0.006)

# ================================================================ 4) Basketballkorb
def _b_basketballkorb():
    """Basketballanlage, 1,90 x 1,55 x 3,90 m — Ausleger, Brett, Ring, Netz.

    ⚠️ Der Mast steht 1,20 m HINTER dem Brett und traegt es ueber einen Ausleger.
    Ein Brett direkt am Mast heisst: wer von vorn zum Korb geht, laeuft in den
    Mast. Genau daran erkennt man einen echten Korb von einem gebastelten."""
    m = _mats()
    flach(zyl(0, 0.60, 1.70, 0.085, 3.40, m["stahl"], 12))
    flach(zyl(0, 0.60, 0.08, 0.34, 0.16, m["beton"], 14))
    strebe((0, 0.56, 3.30), (0, -0.34, 3.36), 0.07, m["stahl"])         # Ausleger
    strebe((0, 0.56, 2.60), (0, -0.28, 3.24), 0.055, m["stahl"])        # Schraegzug
    box(0, -0.40, 3.20, 1.80, 0.07, 1.05, m["stein"])                   # Brett
    _rahmen(0, -0.44, 3.20, 1.86, 1.11, 0.07, m, "stahl")
    box(0, -0.45, 3.08, 0.62, 0.05, 0.44, m["rot"])                     # Zielfeld
    box(0, -0.46, 3.08, 0.52, 0.05, 0.34, m["stein"])
    # ⚠️ Der Ring stand SENKRECHT. `zyl(rot=(pi/2,0,0))` kippt die Zylinderachse
    # von z auf y — richtig fuer ein Rad, falsch fuer einen Korbring: der haengt
    # waagrecht, seine Achse bleibt auf z. Als senkrechte Scheibe vor dem Brett
    # war er im Render gar nicht zu erkennen. Und ein Ring ist ein ROHR im Kreis,
    # keine Scheibe — sonst ist es ein Deckel.
    _rp = [(math.cos(TAU*k/12)*0.225, -0.72 + math.sin(TAU*k/12)*0.225, 2.92)
           for k in range(13)]
    rohr(_rp, 0.019, m["rot"], 6, True, "Korbring")
    box(0, -0.52, 2.92, 0.14, 0.30, 0.05, m["rot"])                     # Ringtraeger
    for k in range(10):                                                 # Netz
        a = TAU*k/10
        nz = rohr([(math.cos(a)*0.235, -0.72 + math.sin(a)*0.235, 2.90),
                   (math.cos(a)*0.175, -0.72 + math.sin(a)*0.175, 2.62),
                   (math.cos(a)*0.130, -0.72 + math.sin(a)*0.130, 2.45)],
                  0.012, m["stein"], 5, True, "Netz")

def basketballkorb(): _modul("th42_basketballkorb", _b_basketballkorb, 0.005)

# ================================================================ 5) Pausenhofdach
def _b_pausenhofdach():
    """Ueberdachter Pausenplatz, 8,4 x 5,4 x 3,3 m — vier Stuetzen, Pultdach,
    Umlaufbank."""
    m = _mats()
    B, T = 7.80, 4.80
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(sx*(B/2 - 0.18), sy*(T/2 - 0.18), 1.35, 0.20, 0.20, 2.70, m["stahl"])
            box(sx*(B/2 - 0.18), sy*(T/2 - 0.18), 0.06, 0.42, 0.42, 0.12, m["beton"])
    dk = box(0, -0.10, 3.02, B + 0.60, T + 0.70, 0.14, m["dach"])
    dk.rotation_euler[0] = 0.13
    for k in range(9):
        dr = box(-B/2 - 0.20 + k*(B + 0.4)/8, -0.10, 3.10, 0.09, T + 0.70, 0.05, m["dach2"])
        dr.rotation_euler[0] = 0.13
    for s in (-1, 1):                                                   # Umlaufbank
        for k in range(4):
            box(0, s*(T/2 - 0.42), 0.44 + k*0.0, B - 1.0, 0.13, 0.06, m["holz"])
            break
        box(0, s*(T/2 - 0.42), 0.44, B - 1.0, 0.42, 0.06, m["holz"])
        for q in (-1, 1):
            box(q*(B/2 - 0.90), s*(T/2 - 0.42), 0.22, 0.12, 0.42, 0.38, m["stahl"])
    # ⚠️ Die Tafel hing am -x-Kopf und zog die Boxmitte auf -0,73. `bau()` setzt
    # ueber den Ursprung, nicht ueber die Boxmitte — ein Teil, dessen Schwerpunkt
    # weit daneben liegt, landet im Spiel verschoben. Jetzt an der Rueckwand.
    box(0, T/2 - 0.10, 1.65, B - 1.2, 0.12, 1.40, m["gruen"])           # Anschlagtafel
    _rahmen(0, T/2 - 0.16, 1.65, B - 1.0, 1.56, 0.10, m)

def pausenhofdach(): _modul("th42_pausenhofdach", _b_pausenhofdach, 0.008)

# ================================================================ 6) Klettergeruest
def _b_klettergeruest():
    """Klettergeruest, 4,60 x 3,20 x 2,90 m — Rahmen, Sprossen, Netz, Rutsche.

    ⚠️ Fallschutz ist Teil des Geraets: die Sandflaeche darunter gehoert dazu,
    sonst steht das Geruest auf dem blanken Hof."""
    m = _mats()
    B, T, H = 3.60, 2.60, 2.55
    # ⚠️ Erst r = 3,20: die Fallschutzflaeche allein machte das Teil 6,40 breit
    # und damit groesser als das Geraet darauf. r = 2,40 deckt den Sturzraum
    # und laesst die Silhouette beim Geruest.
    flach(zyl(0, 0, 0.012, 2.40, 0.024, m["gelb"], 28))                 # Fallschutz
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(sx*B/2, sy*T/2, H/2, 0.13, 0.13, H, m["rot"])
    for sy in (-1, 1):
        box(0, sy*T/2, H, B + 0.13, 0.12, 0.12, m["rot"])
    for sx in (-1, 1):
        box(sx*B/2, 0, H, 0.12, T + 0.13, 0.12, m["rot"])
    for k in range(6):                                                  # Sprossenleiter
        flach(zyl(-B/2, -T/2 + 0.30 + k*0.0, 0.36 + k*0.36, 0.035, T - 0.20,
                  m["stahl"], 8, (math.pi/2, 0, 0)))
    for k in range(5):                                                  # Kletternetz
        xx = -B/2 + 0.55 + k*(B - 1.1)/4
        rohr([(xx, T/2, 0.10), (xx, T/2 - 0.25, 1.30), (xx, T/2, H - 0.10)],
             0.022, m["blau"], 5, True, "Netzseil")
    for k in range(4):
        zz = 0.45 + k*0.60
        rohr([(-B/2 + 0.30, T/2 - 0.08, zz), (0, T/2 - 0.22, zz + 0.10),
              (B/2 - 0.30, T/2 - 0.08, zz)], 0.020, m["blau"], 5, True, "Netzquer")
    box(0, 0, H - 0.10, B - 0.30, T - 0.30, 0.10, m["holz"])            # Podest
    ru = box(B/2 + 0.70, 0, 1.20, 1.90, 0.86, 0.10, m["blau"])          # Rutsche
    ru.rotation_euler[1] = 0.72
    for s in (-1, 1):
        rb = box(B/2 + 0.70, s*0.44, 1.30, 1.90, 0.08, 0.22, m["blau"])
        rb.rotation_euler[1] = 0.72
    box(B/2 + 1.42, 0, 0.14, 0.70, 0.86, 0.10, m["blau"])

def klettergeruest(): _modul("th42_klettergeruest", _b_klettergeruest, 0.006)

# ================================================================ 7) Tischtennisplatte
def _b_tischtennis():
    """Betontischtennisplatte, 2,74 x 1,53 x 0,80 m — Normmass, Metallnetz."""
    m = _mats()
    box(0, 0, 0.72, 2.74, 1.525, 0.08, m["beton"])
    box(0, 0, 0.755, 2.70, 0.03, 0.012, m["stein"])                     # Mittellinie
    for s in (-1, 1):
        box(s*1.35, 0, 0.755, 0.04, 1.50, 0.012, m["stein"])            # Randlinien
    box(0, 0, 0.755, 2.70, 1.48, 0.006, m["gruen"])
    for s in (-1, 1):                                                   # Fuesse
        # ⚠️ Um 0,10 gekippt misst der Fuss 0,68*cos + 0,16*sin = 0,693 hoch —
        # auf Mitte 0,34 endet er bei -0,007. Gekippte Koerper brauchen Aufschlag.
        fs = box(s*1.00, 0, 0.355, 0.16, 1.20, 0.68, m["beton"])
        fs.rotation_euler[1] = -s*0.10
    box(0, 0, 0.80, 0.05, 1.72, 0.16, m["stahl"])                       # Netz
    for k in range(11):
        box(0, -0.80 + k*0.16, 0.80, 0.03, 0.02, 0.15, m["stahl"])
    for s in (-1, 1):
        box(0, s*0.86, 0.78, 0.09, 0.09, 0.30, m["stahl"])

def tischtennis(): _modul("th42_tischtennis", _b_tischtennis, 0.006)

# ================================================================ 8) Schulbank
def _b_schulbank():
    """Bank mit Abfallbehaelter und Baumscheibe, 3,40 x 1,10 x 2,60 m."""
    m = _mats()
    BX = -1.30                                                          # Bank links
    for s in (-1, 1):                                                   # Wangen
        box(BX + s*0.80, 0.08, 0.23, 0.12, 0.60, 0.46, m["beton"])
        box(BX + s*0.80, -0.22, 0.74, 0.12, 0.16, 0.72, m["beton"])
    for k in range(4):
        box(BX, -0.18 + k*0.16, 0.52, 1.72, 0.13, 0.055, m["holz"])
    for k in range(3):
        box(BX, -0.25, 0.76 + k*0.17, 1.72, 0.07, 0.13, m["holz"])
    KX = 0.30                                                           # Abfallbehaelter
    flach(dreh([(0.00, 0.00), (0.14, 0.00), (0.16, 0.08), (0.24, 0.30),
                (0.26, 0.86), (0.24, 0.92), (0.00, 0.94)],
               m["stahl"], 16, x=KX, y=0.0, z=0.0, name="Behaelter"))
    flach(zyl(KX, 0, 0.99, 0.30, 0.08, m["dunkel"], 16))
    flach(zyl(KX, 0, 1.05, 0.10, 0.06, m["stahl"], 10))
    # ⚠️ Bank, Behaelter und Baum standen alle rechts der Mitte (Boxmitte
    # 0,54). Wer drei Dinge in ein Modul packt, muss sie um den Ursprung
    # verteilen — sonst setzt `bau()` sie im Spiel daneben.
    BM = 1.35                                                           # Baumscheibe
    flach(zyl(BM, 0, 0.05, 0.62, 0.10, m["sockel"], 18))
    for k in range(12):
        a = TAU*k/12
        box(BM + math.cos(a)*0.62, math.sin(a)*0.62, 0.14, 0.10, 0.10, 0.28, m["stahl"])
    flach(zyl(BM, 0, 1.10, 0.13, 2.20, m["holz"], 10))
    for k in range(3):
        flach(kugel(BM + (k - 1)*0.42, ((k % 2) - 0.5)*0.36, 2.05 + (k % 2)*0.22,
                    0.52, m["gruen"], 8))

def schulbank(): _modul("th42_schulbank", _b_schulbank, 0.008)

# ================================================================ 9) Schulhof (Ensemble)
def _teil(fn, px, py, rot=0.0, pz=0.0):
    vor = set(bpy.context.scene.objects)
    fn()
    for o in bpy.context.scene.objects:
        if o in vor: continue
        o.rotation_euler[2] += rot
        o.location = (px + math.cos(rot)*o.location[0] - math.sin(rot)*o.location[1],
                      py + math.sin(rot)*o.location[0] + math.cos(rot)*o.location[1],
                      pz + o.location[2])

def _b_schulhof():
    """Massstabs-Test: Schule, Turnhalle und Pausenhof — 52 x 44 m."""
    m = _mats()
    flach(box(0, 0, 0.004, 52.0, 44.0, 0.008, m["beton"]))
    _teil(_b_schule,        -11.0,  13.0)
    _teil(_b_turnhalle,      12.0,  14.0)
    _teil(_b_pausenhofdach, -16.0,  -6.0)
    _teil(_b_klettergeruest,  1.0,  -7.0)
    _teil(_b_tischtennis,     9.0,  -5.0, 0.0)
    _teil(_b_tischtennis,     9.0,  -9.5, 0.0)
    _teil(_b_basketballkorb, 19.0, -14.0, math.pi)
    _teil(_b_basketballkorb,-19.0, -14.0, 0.0)
    for k in range(4):
        _teil(_b_fahrradstaender, -22.0 + k*3.2, 4.0)
    for k in range(3):
        _teil(_b_schulbank, -8.0 + k*9.0, -16.0)
    export("th42_schulhof", 0.012, 2)

def schulhof(): neu(); _b_schulhof()

if __name__ == "__main__":
    print("Asset-Charge 42 (th42, Schule und Pausenhof):")
    for fn in (schule, turnhalle, fahrradstaender, basketballkorb, pausenhofdach,
               klettergeruest, tischtennis, schulbank, schulhof):
        fn()
    print("fertig")
