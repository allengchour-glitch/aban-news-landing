# -*- coding: utf-8 -*-
"""Asset-Charge 47 (th47_*): VILLEN UND GAERTEN.

Die vier Villen in „Villen Ost" (96|-33) und „Villen West" (-96|18) sind
prozedurale Kisten: Korpus, Kegeldach mit vier Seiten, Fenster als aufgeklebte
Rechtecke. Und die Grundstuecke haben ausser Hecke und Zaun nichts.

Konventionen wie th5-th46 (siehe models/TH5-ASSETS.md), Werkzeug aus th_werkzeug.py:
  * Ursprung mittig, Unterkante exakt z = 0, Meter, PBR-Materialien.
  * Schauseite (Eingang, Toroeffnung) auf Blender +y -> three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT.

RASTER: th47_hecke laeuft auf x += 3,00.

⚠️ Angewandte Regeln: Dach als KOERPER per `keil_y` + Drehung um z (41/44/46) ·
   Glas 5 cm VOR der Wand, waagrecht wie senkrecht (40/43) · Rahmen aus vier
   Balken, von der MITTE gerechnet (35/37/38/42/44) · Wand und Zierglied im
   Hellwert trennen (37/41) · mehrere Dinge um den Ursprung verteilen (42) ·
   `kegel()` setzt die MITTE auf z, nicht den Fuss (46) · gekippte Koerper
   brauchen Aufschlag (38/42/45).
"""
import os, math
import th_werkzeug as W
from th_werkzeug import (bpy, bmesh, neu, mat, mat_bild, leucht, box, zyl, kugel,
                         kegel, scheibe, flach, dreh, rohr, bogen_pkt, volute_pkt,
                         strebe, kranz, runden, export, keil_y, rad, TAU)

def _mats(wand=(0.72,0.66,0.54), dachf=(0.34,0.20,0.17)):
    """⚠️ Wand gedaempft, Zierglied fast weiss: 0,25 Abstand im Hellwert. Bei
    gleicher Helligkeit verschwindet jedes Gesims (Charge 37 und 41)."""
    return {
      "wand":  mat_bild("VlWand", "hausputz.png", wand, 0.88, 0.0, True),
      "wand2": mat("VlWand2",  tuple(c*0.80 for c in wand), 0.88),
      "stein": mat("VlStein",  (0.95,0.94,0.91), 0.84),
      "sockel":mat("VlSockel", (0.42,0.40,0.36), 0.90),
      "dach":  mat("VlDach",   dachf, 0.76),
      "dach2": mat("VlDach2",  tuple(c*0.74 for c in dachf), 0.78),
      "holz":  mat("VlHolz",   (0.44,0.28,0.16), 0.86),
      "holz2": mat("VlHolz2",  (0.62,0.46,0.26), 0.86),
      "stahl": mat("VlStahl",  (0.52,0.54,0.58), 0.42, 0.60),
      "dunkel":mat("VlDunkel", (0.12,0.13,0.15), 0.68),
      "beton": mat("VlBeton",  (0.60,0.59,0.56), 0.93),
      "gruen": mat("VlGruen",  (0.18,0.40,0.20), 0.94),
      "gruen2":mat("VlGruen2", (0.24,0.48,0.24), 0.94),
      "kies":  mat("VlKies",   (0.66,0.62,0.54), 0.96),
      # ⚠️ Erst (0,16|0,44|0,58) mit Rauheit 0,14: eine so glatte Flaeche blaest
      # unter dem Umgebungslicht weiss aus — das Becken war im Render eine
      # helle Platte. Wasser in dieser Groesse liest sich nur ueber die FARBE,
      # nicht ueber Spiegelung: dunkler und deutlich rauer.
      "wasser":mat("VlWasser", (0.07,0.30,0.44), 0.42, 0.0),
      "glas":  mat("VlGlas",   (0.18,0.26,0.32), 0.14, 0.20),
      "licht": leucht("VlLicht", (1.00,0.93,0.74), 1.2),
    }

def _modul(name, bauer, bevel=0.012):
    neu(); bauer(); export(name, bevel, 2)

def _rahmen(x, yf, z, b, h, st, m, mat_="stein"):
    """Vier Balken, von der MITTE gerechnet (Unterkante z - h/2)."""
    box(x, yf, z + h/2 - st/2, b, 0.07, st, m[mat_])
    box(x, yf, z - h/2 + st/2, b, 0.07, st, m[mat_])
    for s in (-1, 1):
        box(x + s*(b/2 - st/2), yf, z, st, 0.07, h - 2*st, m[mat_])

def _fenster(x, z, br, ho, m, yw, laden=False, felder=2):
    """Fenster mit Sprossen, Sohlbank und optionalen Fensterlaeden.

    ⚠️ Glas auf yw + 0,02 mit 6 cm Tiefe -> Aussenkante yw + 0,05, also VOR der
    Wand. Dahinter waere es unsichtbar (Charge 40)."""
    box(x, yw + 0.02, z, br, 0.06, ho, m["glas"])
    box(x, yw + 0.035, z, 0.05, 0.06, ho - 0.04, m["stein"])
    for k in range(1, felder):
        box(x, yw + 0.035, z - ho/2 + ho*k/felder, br - 0.03, 0.06, 0.045, m["stein"])
    _rahmen(x, yw + 0.05, z, br + 0.16, ho + 0.16, 0.11, m)
    box(x, yw + 0.08, z - ho/2 - 0.13, br + 0.30, 0.15, 0.09, m["stein"])
    if laden:
        for s in (-1, 1):
            lb = box(x + s*(br/2 + 0.20), yw + 0.10, z, 0.34, 0.06, ho, m["holz2"])
            for k in range(5):
                box(x + s*(br/2 + 0.20), yw + 0.14, z - ho/2 + ho*(k + 0.5)/5,
                    0.30, 0.04, ho/5*0.55, m["holz"])

def _satteldach(B, T, HH, zbasis, m, ueber=0.70, mat_="dach"):
    """Satteldach als KOERPER, First auf x (Charge 41)."""
    TD = T/2 + ueber
    d = keil_y([(-TD, 0.0), (TD, 0.0), (TD, 0.24), (0.0, HH), (-TD, 0.24)],
               0.0, B + 2*ueber, m[mat_], cz=zbasis, name="Satteldach")
    d.rotation_euler[2] = math.pi/2
    for s in (-1, 1):
        box(0, s*(TD - 0.05), zbasis + 0.14, B + 2*ueber + 0.1, 0.12, 0.28, m["stein"])
    box(0, 0, zbasis + HH, B + 0.3, 0.34, 0.18, m["dach2"])
    return d

def _mansarddach(B, T, HH, zbasis, m, ueber=0.70, mat_="dach"):
    """Mansarddach als KOERPER: unten steil, oben flach, First auf x.

    ⚠️ HIER STAND EIN WALMDACH aus einem gedrehten, skalierten Vierkant-Kegel —
    und das kann gar nicht funktionieren. Blender wendet erst die SKALIERUNG in
    lokalen Achsen an und dann die Drehung: die vier Ecken liegen lokal auf den
    Achsen, nach 45 Grad landen sie alle auf den Diagonalen, und die Bounding-Box
    wird damit ZWANGSLAEUFIG quadratisch. Die Villa mass 22,00 x 22,00 statt
    12,4 x 10,4 — ein rechteckiges Walmdach ist so nicht zu bekommen.

    Ein Mansarddach ist dagegen extrudierbar, also ein Fall fuer `keil_y` wie
    Sattel- und Tonnendach seit Charge 41 — und es unterscheidet die Villa
    zugleich sichtbar von der mit dem einfachen Satteldach."""
    TD = T/2 + ueber
    d = keil_y([(-TD, 0.0), (TD, 0.0), (TD, 0.24), (TD*0.62, HH*0.60),
                (TD*0.30, HH), (-TD*0.30, HH), (-TD*0.62, HH*0.60), (-TD, 0.24)],
               0.0, B + 2*ueber, m[mat_], cz=zbasis, name="Mansarddach")
    d.rotation_euler[2] = math.pi/2
    for s in (-1, 1):
        box(0, s*(TD - 0.05), zbasis + 0.14, B + 2*ueber + 0.1, 0.12, 0.28, m["stein"])
        box(0, s*(TD*0.62), zbasis + HH*0.60, B + 2*ueber, 0.10, 0.10, m["dach2"])
    box(0, 0, zbasis + HH, B + 0.3, TD*0.68, 0.14, m["dach2"])
    return d

def _kamin(x, y, z0, m, h=2.10):
    box(x, y, z0 + h/2, 0.82, 0.82, h, m["wand2"])
    box(x, y, z0 + h + 0.11, 1.06, 1.06, 0.22, m["stein"])
    for q in range(4):
        flach(zyl(x + ((q % 2) - 0.5)*0.32, y + ((q//2) - 0.5)*0.32, z0 + h + 0.35,
                  0.10, 0.26, m["dunkel"], 10))

# ================================================================ 1) Villa mit Walmdach
def _b_villa_walm():
    """Villa mit Mansarddach, 12,4 x 10,4 x 10,7 m. Eingang auf +y.

    Sockel mit Absatz, Ecklisenen, Gurtgesims, Erker ueber zwei Geschosse,
    Veranda mit Saeulen, Fensterlaeden, Gaube und Kamin."""
    m = _mats((0.74,0.68,0.54), (0.36,0.22,0.18))
    B, T, H = 10.60, 8.60, 6.40
    box(0, 0, 0.30, B + 0.9, T + 0.9, 0.60, m["sockel"])
    box(0, 0, 0.78, B + 0.5, T + 0.5, 0.30, m["stein"])
    box(0, 0, H/2 + 0.93, B, T, H, m["wand"])
    for s in (-1, 1):                                               # Ecklisenen
        box(s*(B/2 - 0.24), 0, H/2 + 1.00, 0.48, T + 0.12, H - 0.4, m["stein"])
    box(0, 0, 4.05, B + 0.20, T + 0.20, 0.22, m["stein"])           # Gurtgesims
    box(0, 0, H + 0.98, B + 0.44, T + 0.44, 0.28, m["stein"])       # Hauptgesims
    # Erker ueber zwei Geschosse auf +y
    EB, ET = 3.20, 1.20
    box(-2.40, T/2 + ET/2, H/2 + 0.93, EB, ET, H, m["wand"])
    for s in (-1, 1):
        box(-2.40 + s*(EB/2 - 0.14), T/2 + ET/2, H/2 + 1.00, 0.28, ET + 0.06, H - 0.4,
            m["stein"])
    for e in range(2):
        _fenster(-2.40, 2.20 + e*2.85, 1.90, 1.70, m, T/2 + ET)
        for sx in (-1, 1):
            box(-2.40 + sx*(EB/2 + 0.01), T/2 + ET/2, 2.20 + e*2.85, 0.06, 0.80, 1.70,
                m["glas"])
            box(-2.40 + sx*(EB/2 + 0.05), T/2 + ET/2, 2.20 + e*2.85, 0.09, 0.94, 1.86,
                m["stein"])
            box(-2.40 + sx*(EB/2 + 0.09), T/2 + ET/2, 2.20 + e*2.85, 0.08, 0.80, 1.70,
                m["glas"])
    box(-2.40, T/2 + ET/2, H + 1.08, EB + 0.5, ET + 0.5, 0.26, m["stein"])
    # Fenster ringsum
    for e in range(2):
        zz = 2.20 + e*2.85
        for xx in (1.30, 3.60):
            _fenster(xx, zz, 1.20, 1.60, m, T/2, True)
        for xx in (-3.40, 0.0, 3.40):
            _fenster(xx, zz, 1.20, 1.60, m, -T/2 - 0.12, True)
        for sx in (-1, 1):
            for yy in (-2.10, 2.10):
                box(sx*(B/2 + 0.02), yy, zz, 0.06, 1.10, 1.50, m["glas"])
                box(sx*(B/2 + 0.06), yy, zz, 0.10, 1.26, 1.66, m["stein"])
                box(sx*(B/2 + 0.10), yy, zz, 0.09, 1.10, 1.50, m["glas"])
    # Veranda mit Saeulen und Eingang
    box(2.60, T/2 + 0.90, 0.24, 4.40, 2.20, 0.48, m["beton"])
    for k in range(4):
        flach(dreh([(0.00, 0.00), (0.20, 0.00), (0.17, 0.10), (0.15, 2.10),
                    (0.19, 2.24), (0.22, 2.34), (0.00, 2.36)], m["stein"], 14,
                   x=1.00 + k*1.10, y=T/2 + 1.70, z=0.48, name="Saeule"))
    box(2.60, T/2 + 0.90, 2.98, 4.80, 2.60, 0.24, m["stein"])
    box(2.60, T/2 + 0.90, 3.16, 4.40, 2.20, 0.16, m["dach2"])
    box(2.60, T/2 + 0.06, 1.62, 1.20, 0.16, 2.30, m["holz"])        # Haustuer
    box(2.60, T/2 + 0.14, 2.20, 0.86, 0.06, 0.80, m["glas"])
    _rahmen(2.60, T/2 + 0.18, 1.62, 1.38, 2.48, 0.13, m)
    flach(zyl(2.60, T/2 + 0.98, 2.80, 0.14, 0.16, m["licht"], 12))
    for k in range(3):                                              # Freitreppe
        box(2.60, T/2 + 2.10 + k*0.34, 0.42 - k*0.14, 2.20, 0.36, 0.14, m["beton"])
    _mansarddach(B, T, 3.10, H + 1.12, m)
    # Gaube auf +y
    box(1.20, T/2 - 1.10, H + 2.05, 1.80, 1.40, 1.30, m["wand"])
    box(1.20, T/2 - 1.72, H + 2.10, 1.20, 0.06, 0.90, m["glas"])
    _rahmen(1.20, T/2 - 1.76, H + 2.10, 1.32, 1.02, 0.10, m)
    gd = keil_y([(-0.95, 0.0), (0.95, 0.0), (0.0, 0.72)], 0.0, 2.10, m["dach"],
                cz=H + 2.70, name="Gaubendach")
    gd.rotation_euler[2] = math.pi/2
    gd.location = (1.20, T/2 - 1.10, 0.0)
    _kamin(-3.20, -1.60, H + 1.12, m)

def villa_walm(): _modul("th47_villa_walm", _b_villa_walm)

# ================================================================ 2) Villa mit Giebel
def _b_villa_giebel():
    """Villa mit Satteldach und Balkon, 11,6 x 9,8 x 10,6 m. Eingang auf +y.

    Giebel zur Strasse, Balkon auf Konsolen, Fachwerkfeld im Giebel."""
    m = _mats((0.86,0.82,0.72), (0.30,0.34,0.38))
    B, T, H = 9.60, 8.00, 6.20
    box(0, 0, 0.28, B + 0.9, T + 0.9, 0.56, m["sockel"])
    box(0, 0, 0.74, B + 0.5, T + 0.5, 0.30, m["stein"])
    box(0, 0, H/2 + 0.89, B, T, H, m["wand"])
    for s in (-1, 1):
        box(s*(B/2 - 0.22), 0, H/2 + 0.95, 0.44, T + 0.12, H - 0.4, m["stein"])
    box(0, 0, 3.85, B + 0.18, T + 0.18, 0.20, m["stein"])
    box(0, 0, H + 0.92, B + 0.40, T + 0.40, 0.26, m["stein"])
    for e in range(2):
        zz = 2.10 + e*2.80
        for xx in (-3.20, 0.0, 3.20):
            _fenster(xx, zz, 1.15, 1.55, m, T/2, e == 1)
            _fenster(xx, zz, 1.15, 1.55, m, -T/2 - 0.12, e == 1)
        for sx in (-1, 1):
            for yy in (-2.00, 2.00):
                box(sx*(B/2 + 0.02), yy, zz, 0.06, 1.05, 1.45, m["glas"])
                box(sx*(B/2 + 0.06), yy, zz, 0.10, 1.21, 1.61, m["stein"])
                box(sx*(B/2 + 0.10), yy, zz, 0.09, 1.05, 1.45, m["glas"])
    # Haustuer statt des mittleren Erdgeschossfensters
    box(0, T/2 + 0.06, 1.55, 1.30, 0.18, 2.30, m["holz"])
    box(0, T/2 + 0.16, 2.20, 0.92, 0.06, 0.76, m["glas"])
    _rahmen(0, T/2 + 0.20, 1.55, 1.50, 2.50, 0.14, m)
    for k in range(3):
        box(0, T/2 + 0.36 + k*0.32, 0.42 - k*0.14, 2.00, 0.34, 0.14, m["beton"])
    # Balkon auf Konsolen ueber der Tuer
    box(0, T/2 + 0.80, 3.44, 3.40, 1.60, 0.20, m["beton"])
    for s in (-1, 1):
        strebe((s*1.30, T/2 + 0.04, 2.90), (s*1.30, T/2 + 1.40, 3.36), 0.14, m["stein"])
    for k in range(9):                                              # Balkongelaender
        flach(zyl(-1.55 + k*0.39, T/2 + 1.54, 3.98, 0.045, 0.90, m["stahl"], 8))
    for s in (-1, 1):
        for k in range(4):
            flach(zyl(s*1.66, T/2 + 0.30 + k*0.42, 3.98, 0.045, 0.90, m["stahl"], 8))
    box(0, T/2 + 1.54, 4.46, 3.40, 0.07, 0.07, m["stahl"])
    for s in (-1, 1):
        box(s*1.66, T/2 + 0.80, 4.46, 0.07, 1.60, 0.07, m["stahl"])
    _satteldach(B, T, 3.10, H + 1.05, m)
    # Fachwerkfeld im Giebel (Ostseite)
    for s in (-1, 1):
        for k in range(4):
            box(s*(B/2 + 0.02), -1.60 + k*1.05, H + 1.55, 0.06, 0.16, 1.10, m["holz"])
        box(s*(B/2 + 0.02), 0, H + 1.20, 0.06, 3.40, 0.16, m["holz"])
        dg = box(s*(B/2 + 0.02), 0, H + 1.60, 0.06, 2.60, 0.16, m["holz"])
        dg.rotation_euler[0] = 0.62
    _kamin(2.60, -1.40, H + 1.05, m)

def villa_giebel(): _modul("th47_villa_giebel", _b_villa_giebel)

# ================================================================ 3) Garage
def _b_garage():
    """Doppelgarage mit Pultdach, 7,4 x 6,4 x 3,3 m. Tore auf +y."""
    m = _mats((0.80,0.76,0.66), (0.30,0.32,0.36))
    B, T, H = 7.00, 6.00, 2.70
    box(0, 0, 0.14, B + 0.5, T + 0.5, 0.28, m["sockel"])
    box(0, 0, H/2 + 0.28, B, T, H, m["wand"])
    for s in (-1, 1):
        box(s*(B/2 - 0.16), 0, H/2 + 0.34, 0.32, T + 0.08, H - 0.3, m["stein"])
    for s in (-1, 1):                                               # Zwei Sektionaltore
        box(s*1.70, T/2 - 0.10, 1.32, 2.60, 0.26, 2.10, m["dunkel"])
        for k in range(5):
            box(s*1.70, T/2 + 0.05, 0.36 + k*0.48, 2.46, 0.08, 0.42, m["stein"])
        _rahmen(s*1.70, T/2 + 0.10, 1.32, 2.86, 2.36, 0.15, m)
    dk = box(0, -0.20, H + 0.52, B + 0.7, T + 0.8, 0.20, m["dach"])
    dk.rotation_euler[0] = 0.10
    for k in range(9):
        dr = box(-B/2 - 0.3 + k*(B + 0.6)/8, -0.20, H + 0.62, 0.09, T + 0.8, 0.05,
                 m["dach2"])
        dr.rotation_euler[0] = 0.10
    flach(zyl(0, T/2 + 0.06, 2.62, 0.13, 0.14, m["licht"], 12))
    box(-B/2 - 0.12, 1.20, 1.10, 0.10, 1.00, 2.00, m["holz"])       # Nebentuer

def garage(): _modul("th47_garage", _b_garage)

# ================================================================ 4) Gartenhaus
def _b_gartenhaus():
    """Gartenhaus aus Holz, 3,6 x 3,2 x 3,2 m. Tuer auf +y."""
    m = _mats((0.62,0.46,0.28), (0.34,0.26,0.18))
    B, T, H = 3.20, 2.80, 2.10
    for s in (-1, 1):                                               # Sockelbalken
        box(0, s*(T/2 - 0.09), 0.09, B + 0.3, 0.18, 0.18, m["holz"])
        box(s*(B/2 - 0.09), 0, 0.09, 0.18, T + 0.3, 0.18, m["holz"])
    box(0, 0, H/2 + 0.18, B, T, H, m["holz2"])
    for k in range(11):                                             # Bretterfugen
        xx = -B/2 + 0.14 + k*(B - 0.28)/10
        for s in (-1, 1):
            box(xx, s*(T/2 + 0.012), H/2 + 0.18, 0.05, 0.04, H - 0.10, m["holz"])
    box(0, T/2 + 0.02, 1.15, 0.90, 0.06, 1.90, m["holz"])           # Tuer
    box(0, T/2 + 0.06, 1.62, 0.60, 0.05, 0.60, m["glas"])
    _rahmen(0, T/2 + 0.09, 1.15, 1.06, 2.06, 0.10, m, "holz")
    flach(zyl(-0.36, T/2 + 0.11, 1.10, 0.03, 0.16, m["stahl"], 8, (math.pi/2, 0, 0)))
    for s in (-1, 1):                                               # Seitenfenster
        box(s*(B/2 + 0.02), 0, 1.55, 0.06, 0.80, 0.70, m["glas"])
        _rahmen(s*(B/2 + 0.06), 0, 1.55, 0.94, 0.84, 0.09, m, "holz")
    _satteldach(B, T, 1.10, H + 0.22, m, 0.34)
    box(0, 0, 0.05, 1.60, 0.90, 0.10, m["beton"])                   # Trittplatte davor
    box(B/2 + 0.30, -0.60, 0.42, 0.50, 0.50, 0.84, m["gruen2"])     # Regentonne
    flach(dreh([(0.00, 0.00), (0.30, 0.00), (0.32, 0.10), (0.30, 0.80), (0.00, 0.84)],
               m["gruen"], 14, x=B/2 + 0.62, y=0.70, name="Tonne"))

def gartenhaus(): _modul("th47_gartenhaus", _b_gartenhaus, 0.008)

# ================================================================ 5) Pool
def _b_pool():
    """Pool mit Holzterrasse und Liegen, 9,4 x 6,6 x 0,9 m.

    ⚠️ Das Wasser liegt UNTER der Terrassenkante — ein Becken, dessen Wasser
    obenauf liegt, ist eine blaue Platte im Boden."""
    m = _mats()
    PB, PT = 5.40, 3.20
    flach(box(0, 0, 0.03, 9.20, 6.40, 0.06, m["holz2"]))            # Terrasse
    for k in range(23):                                             # Dielenfugen
        box(-4.50 + k*0.41, 0, 0.065, 0.04, 6.40, 0.012, m["holz"])
    # ⚠️ Der Beckenrand war eine VOLLE Platte 5,90 x 3,70 ueber dem ganzen Becken —
    # sie deckte das Wasser zu, und im Kontaktbogen war der Pool eine weisse
    # Flaeche. Ein Beckenrand ist ein RAHMEN aus vier Balken um die Oeffnung,
    # genau wie ein Fensterrahmen (Charge 35/37/38/42) — nur waagrecht.
    for s in (-1, 1):
        box(0, s*(PT/2 + 0.16), 0.16, PB + 0.64, 0.32, 0.20, m["stein"])
        box(s*(PB/2 + 0.16), 0, 0.16, 0.32, PT + 0.64, 0.20, m["stein"])
    for s in (-1, 1):                                               # Beckenwaende
        box(0, s*(PT/2 - 0.07), 0.12, PB, 0.14, 0.24, m["beton"])
        box(s*(PB/2 - 0.07), 0, 0.12, 0.14, PT, 0.24, m["beton"])
    box(0, 0, 0.02, PB, PT, 0.04, m["beton"])                       # Beckenboden
    box(0, 0, 0.15, PB - 0.20, PT - 0.20, 0.16, m["wasser"])        # Wasserspiegel
    for k in range(3):                                              # Bahnenmarkierung
        box(0, -PT/2 + PT*(k + 1)/4, 0.235, PB - 0.40, 0.07, 0.012, m["stein"])
    for s in (-1, 1):                                               # Einstiegsleiter
        rohr([(PB/2 - 0.40, s*0.60, 0.60), (PB/2 - 0.30, s*0.60, 0.30),
              (PB/2 - 0.55, s*0.60, 0.12)], 0.035, m["stahl"], 6, True, "Holm")
    box(PB/2 - 0.42, 0, 0.50, 0.06, 1.20, 0.06, m["stahl"])
    for k in range(2):                                              # Liegen
        LX, LY = -3.40, -1.40 + k*2.80
        for s in (-1, 1):
            box(LX, LY + s*0.30, 0.28, 1.80, 0.09, 0.36, m["stahl"])
        lg = box(LX, LY, 0.48, 1.70, 0.62, 0.07, m["stein"])
        rl = box(LX - 0.72, LY, 0.66, 0.60, 0.62, 0.07, m["stein"])
        rl.rotation_euler[1] = -0.62
        for q in (-1, 1):
            flach(zyl(LX + q*0.72, LY + 0.34, 0.14, 0.09, 0.06, m["stahl"], 10,
                      (math.pi/2, 0, 0)))
    flach(zyl(3.70, 2.30, 1.05, 0.05, 2.10, m["holz"], 10))         # Sonnenschirm
    flach(kegel(3.70, 2.30, 2.32, 1.30, 0.10, 0.44, m["gruen2"], 16))
    box(3.70, 2.30, 0.10, 0.60, 0.60, 0.14, m["beton"])

def pool(): _modul("th47_pool", _b_pool, 0.006)

# ================================================================ 6) Hecke
def _b_hecke():
    """Heckenmodul, Raster 3,00 m, 1,60 m hoch — geschnitten, mit Sockelmauer.

    ⚠️ Eine Hecke ist keine glatte Kiste: die aufgesetzten Buesche brechen die
    Silhouette, sonst liest sie sich als gruene Mauer."""
    m = _mats()
    BR, T, H = 3.00, 0.90, 1.30
    box(0, 0, 0.16, BR, T + 0.30, 0.32, m["stein"])                 # Sockelmauer
    box(0, 0, H/2 + 0.32, BR, T, H, m["gruen"])
    # ⚠️ Die Laubkugeln sassen auch auf den FLANKEN, auf halber Hoehe — das sah
    # aus wie eine gruene Kiste mit Warzen. Eine geschnittene Hecke ist an den
    # Seiten glatt; ihre Unregelmaessigkeit sitzt OBEN, wo der Trieb ausschlaegt.
    for k in range(13):                                             # Laubkoerper oben
        xx = -BR/2 + 0.14 + k*(BR - 0.28)/12
        flach(kugel(xx, ((k % 3) - 1)*0.20, H + 0.28 + ((k % 4) - 1.5)*0.06,
                    0.28 + (k % 3)*0.03, m["gruen2"], 7))
    for k in range(5):                                              # zweite Reihe
        xx = -BR/2 + 0.42 + k*(BR - 0.84)/4
        flach(kugel(xx, ((k % 2) - 0.5)*0.34, H + 0.40, 0.24, m["gruen2"], 6))

def hecke(): _modul("th47_hecke", _b_hecke, 0.006)

# ================================================================ 7) Gartentor
def _b_gartentor():
    """Gartentor zwischen zwei Mauerpfeilern, 4,6 x 0,7 x 2,5 m. Schauseite +y."""
    m = _mats()
    PB = 1.85
    for s in (-1, 1):
        box(s*PB, 0, 1.00, 0.56, 0.56, 2.00, m["stein"])
        box(s*PB, 0, 0.12, 0.72, 0.72, 0.24, m["sockel"])
        box(s*PB, 0, 2.08, 0.72, 0.72, 0.16, m["stein"])
        flach(kegel(s*PB, 0, 2.34, 0.34, 0.06, 0.36, m["stein"], 12))
        flach(kugel(s*PB, 0, 2.56, 0.13, m["stein"], 8))
    for s in (-1, 1):                                               # Zwei Torfluegel
        x0, x1 = s*0.06, s*(PB - 0.30)
        box((x0 + x1)/2, 0, 0.34, abs(x1 - x0), 0.07, 0.10, m["stahl"])
        box((x0 + x1)/2, 0, 1.52, abs(x1 - x0), 0.07, 0.10, m["stahl"])
        n = 7
        for k in range(n + 1):
            xx = x0 + (x1 - x0)*k/n
            flach(zyl(xx, 0, 0.94, 0.035, 1.36, m["stahl"], 8))
            flach(kegel(xx, 0, 1.68, 0.055, 0.0, 0.20, m["stahl"], 6))
        flach(zyl(x1 - s*0.12, 0.07, 0.94, 0.045, 0.10, m["stahl"], 10,
                  (math.pi/2, 0, 0)))
    box(0, 0, 0.06, 3.20, 0.90, 0.12, m["kies"])                    # Zufahrt

def gartentor(): _modul("th47_gartentor", _b_gartentor, 0.006)

# ================================================================ 8) Gartenlaube
def _b_gartenlaube():
    """Sechseckige Gartenlaube, 3,8 x 3,3 x 3,3 m — Saeulen, Zeltdach, Bank.

    ⚠️ Das Zeltdach ist ein `kegel` mit sechs Seiten — und seine MITTE gehoert
    auf zbasis + h/2, nicht auf zbasis (Charge 46)."""
    m = _mats()
    R, H = 1.70, 2.30
    flach(zyl(0, 0, 0.08, R + 0.30, 0.16, m["beton"], 12))          # Podest
    flach(zyl(0, 0, 0.20, R + 0.16, 0.10, m["holz2"], 12))
    for k in range(6):                                              # Saeulen
        a = TAU*k/6
        flach(zyl(math.cos(a)*R, math.sin(a)*R, H/2 + 0.24, 0.09, H, m["holz"], 8))
    for k in range(6):                                              # Brustriegel
        a0, a1 = TAU*k/6, TAU*(k + 1)/6
        if k == 0: continue                                         # Eingang offen
        x0, y0 = math.cos(a0)*R, math.sin(a0)*R
        x1, y1 = math.cos(a1)*R, math.sin(a1)*R
        for zz in (0.80, 1.16):
            rg = box((x0 + x1)/2, (y0 + y1)/2, zz, math.hypot(x1 - x0, y1 - y0),
                     0.07, 0.07, m["holz"])
            rg.rotation_euler[2] = math.atan2(y1 - y0, x1 - x0)
        for q in range(3):
            t = (q + 1)/4.0
            flach(zyl(x0 + (x1 - x0)*t, y0 + (y1 - y0)*t, 0.98, 0.03, 0.36,
                      m["holz"], 6))
        bk = box((x0 + x1)/2*0.82, (y0 + y1)/2*0.82, 0.48,
                 math.hypot(x1 - x0, y1 - y0)*0.80, 0.38, 0.06, m["holz2"])
        bk.rotation_euler[2] = math.atan2(y1 - y0, x1 - x0)
    flach(zyl(0, 0, H + 0.30, R + 0.24, 0.12, m["holz"], 12))       # Traufkranz
    # ⚠️ Hier lagen sechs Gratstaebe mit `rotation_euler = (0, -theta, a)`. Ein
    # XYZ-Euler dreht erst um y, dann um z — der Stab kippte damit in die falsche
    # Ebene und stand im Kontaktbogen waagrecht aus dem Dach heraus. Ein Sechs-
    # kant-Kegel zeigt seine Grate ohnehin als Kanten; die Staebe waren Zierrat
    # mit Risiko. Statt sie neu auszurechnen: weglassen, Knauf behalten.
    flach(kegel(0, 0, H + 0.36 + 0.55, R + 0.42, 0.0, 1.10, m["dach"], 6))
    flach(zyl(0, 0, H + 1.02, 0.07, 0.30, m["dach2"], 8))
    flach(kugel(0, 0, H + 1.22, 0.15, m["dach2"], 8))

def gartenlaube(): _modul("th47_gartenlaube", _b_gartenlaube, 0.008)

# ================================================================ 9) Grundstueck
def _teil(fn, px, py, rot=0.0, pz=0.0):
    vor = set(bpy.context.scene.objects)
    fn()
    for o in bpy.context.scene.objects:
        if o in vor: continue
        o.rotation_euler[2] += rot
        o.location = (px + math.cos(rot)*o.location[0] - math.sin(rot)*o.location[1],
                      py + math.sin(rot)*o.location[0] + math.cos(rot)*o.location[1],
                      pz + o.location[2])

def _b_grundstueck():
    """Massstabs-Test: Villengrundstueck mit allem, 34 x 30 m."""
    m = _mats()
    flach(box(0, 0, 0.004, 34.0, 30.0, 0.008, m["gruen"]))
    flach(box(-2.0, 9.0, 0.010, 20.0, 8.0, 0.010, m["kies"]))
    _teil(_b_villa_walm,   -4.0,  3.0)
    _teil(_b_garage,        8.0,  6.0)
    _teil(_b_pool,         -6.0, -8.0)
    _teil(_b_gartenhaus,   11.0, -9.0, math.pi)
    _teil(_b_gartenlaube,   3.0, -9.0)
    _teil(_b_gartentor,    -2.0, 13.6)
    for k in range(5):
        _teil(_b_hecke, -15.0 + k*3.0, 13.6)
    for k in range(5):
        _teil(_b_hecke,  2.5 + k*3.0, 13.6)
    for k in range(9):
        _teil(_b_hecke, -16.4, -12.0 + k*3.0, math.pi/2)
    export("th47_grundstueck", 0.012, 2)

def grundstueck(): neu(); _b_grundstueck()

if __name__ == "__main__":
    print("Asset-Charge 47 (th47, Villen und Gaerten):")
    for fn in (villa_walm, villa_giebel, garage, gartenhaus, pool, hecke,
               gartentor, gartenlaube, grundstueck):
        fn()
    print("fertig")
