# -*- coding: utf-8 -*-
"""Asset-Charge 45 (th45_*): HAFEN UND STRAND.

Im Westen liegt seit langem ein Meer (Wasserflaeche 200 x 340 bei x = -232), ein
Sandstreifen bei x = -128, eine Eisenbahnbruecke und ein Wendeplatz — aber nichts,
was eine Kueste ausmacht: keine Kaimauer, kein Boot, kein Leuchtturm, kein
Strandkorb. 340 m Ufer ohne einen einzigen Gegenstand.

Konventionen wie th5-th44 (siehe models/TH5-ASSETS.md), Werkzeug aus th_werkzeug.py:
  * Ursprung mittig, Unterkante exakt z = 0, Meter, PBR-Materialien.
  * Schauseite (Kaikante, Bootsseite, Turmtuer) auf Blender +y -> three.js -z.
  * SCHIFFE: Bug auf +x, wie alle Fahrzeuge seit Charge 37.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT.

RASTER: th45_kaimauer laeuft auf x += 8,00.

⚠️ TIEFGANG. Die Boote stehen wie alles andere mit zmin = 0 auf dem Boden — das
   ist die Konvention, und `bau()` rechnet damit. Beim Einbau muessen sie um ihren
   Tiefgang GESENKT werden, sonst schwimmen sie obenauf:
     th45_fischerboot  Tiefgang 0,55
     th45_segelboot    Tiefgang 0,40
   Die Zahl steht auch im Docstring des jeweiligen Bauteils.

⚠️ Angewandte Regeln: Rumpf und Daecher als KOERPER per `keil_y` (41/44) · Glas
   VOR der Flaeche, waagrecht wie senkrecht (40/43) · Rahmen aus vier Balken, von
   der Mitte gerechnet (35/37/38/42/44) · Hellwertabstand (37/41) · mehrere Dinge
   um den Ursprung verteilen (42) · Boden- und Feldmarkierung an den ORT (43).
"""
import os, math
import th_werkzeug as W
from th_werkzeug import (bpy, bmesh, neu, mat, mat_bild, leucht, box, zyl, kugel,
                         kegel, scheibe, flach, dreh, rohr, bogen_pkt, volute_pkt,
                         strebe, kranz, runden, export, keil_y, rad, TAU)

def _mats():
    return {
      "beton": mat("HfBeton",  (0.58,0.57,0.54), 0.93),
      "beton2":mat("HfBeton2", (0.40,0.39,0.37), 0.94),
      "stein": mat("HfStein",  (0.93,0.92,0.89), 0.84),
      "stahl": mat("HfStahl",  (0.56,0.58,0.62), 0.42, 0.60),
      "stahl2":mat("HfStahl2", (0.32,0.34,0.38), 0.50, 0.55),
      "dunkel":mat("HfDunkel", (0.12,0.13,0.15), 0.68),
      "rost":  mat("HfRost",   (0.42,0.24,0.14), 0.88),
      "rumpf": mat("HfRumpf",  (0.18,0.32,0.52), 0.55),
      "rumpf2":mat("HfRumpf2", (0.72,0.18,0.14), 0.55),
      "deck":  mat("HfDeck",   (0.62,0.46,0.28), 0.86),
      "holz":  mat("HfHolz",   (0.44,0.29,0.17), 0.86),
      "weiss": mat("HfWeiss",  (0.93,0.93,0.91), 0.55),
      "rot":   mat("HfRot",    (0.72,0.18,0.14), 0.66),
      "gruen": mat("HfGruen",  (0.14,0.44,0.28), 0.70),
      "gelb":  mat("HfGelb",   (0.86,0.68,0.14), 0.66),
      "segel": mat("HfSegel",  (0.95,0.95,0.92), 0.80),
      "glas":  mat("HfGlas",   (0.16,0.24,0.30), 0.14, 0.20),
      "licht": leucht("HfLicht", (1.00,0.94,0.72), 1.9),
      "warn":  leucht("HfWarn",  (0.95,0.20,0.12), 1.4),
    }

def _modul(name, bauer, bevel=0.012):
    neu(); bauer(); export(name, bevel, 2)

def _rahmen(x, yf, z, b, h, st, m, mat_="stein"):
    """Vier Balken, von der MITTE gerechnet (Unterkante z - h/2)."""
    box(x, yf, z + h/2 - st/2, b, 0.07, st, m[mat_])
    box(x, yf, z - h/2 + st/2, b, 0.07, st, m[mat_])
    for s in (-1, 1):
        box(x + s*(b/2 - st/2), yf, z, st, 0.07, h - 2*st, m[mat_])

def _poller(x, y, m):
    """Poller: Drehkoerper mit ausladendem Kopf — daran haelt die Leine."""
    flach(dreh([(0.00, 0.00), (0.26, 0.00), (0.26, 0.06), (0.18, 0.12),
                (0.16, 0.52), (0.24, 0.60), (0.26, 0.68), (0.18, 0.74),
                (0.00, 0.76)], m["stahl2"], 16, x=x, y=y, name="Poller"))

# ================================================================ 1) Kaimauer
def _b_kaimauer():
    """Kaimauer-Modul, Raster 8,00 m, 2,60 m ueber Wasser. Wasserseite auf +y.

    ⚠️ Die Fender an der Wasserseite sind kein Zierrat: eine glatte Betonkante
    liest sich als Beckenrand, nicht als Kai. Erst Reibholz, Poller und Leiter
    machen daraus eine Stelle, an der ein Schiff festmacht."""
    m = _mats()
    BR, T, H = 8.00, 3.20, 2.60
    box(0, 0, H/2, BR, T, H, m["beton"])
    box(0, 0, H - 0.09, BR, T + 0.16, 0.18, m["beton2"])            # Kranzstein
    box(0, T/2 + 0.02, H - 0.09, BR, 0.12, 0.22, m["stein"])        # helle Kante
    for k in range(3):                                              # Reibhoelzer
        box(-BR/2 + BR*(k + 0.5)/3, T/2 + 0.10, 1.30, 0.30, 0.20, 2.00, m["holz"])
    for s in (-1, 1):                                               # Fender aus Reifen
        for k in range(2):
            flach(zyl(s*(BR/2 - 1.20), T/2 + 0.16, 0.85 + k*0.70, 0.34, 0.18,
                      m["dunkel"], 14, (math.pi/2, 0, 0)))
    _poller(-BR/2 + 2.0, -0.55, m)
    _poller( BR/2 - 2.0, -0.55, m)
    for k in range(6):                                              # Steigleiter
        box(0, T/2 + 0.10, 0.30 + k*0.42, 0.46, 0.05, 0.05, m["stahl"])
    for s in (-1, 1):
        box(s*0.22, T/2 + 0.10, 1.35, 0.05, 0.05, 2.20, m["stahl"])
    for k in range(2):                                              # Fugen
        box(-BR/2 + BR*(k + 1)/3, 0, H/2, 0.05, T + 0.02, H - 0.3, m["beton2"])

def kaimauer(): _modul("th45_kaimauer", _b_kaimauer, 0.008)

# ================================================================ 2) Hafenkran
def _b_hafenkran():
    """Portalkran auf Schienen, 9,40 x 7,20 x 14,6 m. Ausleger auf +y.

    ⚠️ Der Ausleger ist das, was einen Kran ausmacht — und er braucht ein
    GEGENGEWICHT auf der anderen Seite, sonst sieht der Kran aus, als kippe er."""
    m = _mats()
    SP, H = 6.40, 10.60                                             # Spurweite, Portalhoehe
    for s in (-1, 1):                                               # Portalbeine
        for q in (-1, 1):
            strebe((s*(SP/2), q*1.30, 0.55), (s*(SP/2 - 0.55), q*0.70, H), 0.26, m["gelb"])
        for k in range(7):
            zz = 1.10 + k*1.30
            f = 1.30 - 0.60*k/6
            box(s*(SP/2 - 0.28*k/6), 0, zz, 0.20, f*2, 0.18, m["gelb"])
    for s in (-1, 1):                                               # Fahrwerke
        box(s*SP/2, 0, 0.28, 1.30, 3.00, 0.56, m["stahl2"])
        for q in (-1, 1):
            flach(zyl(s*SP/2, q*1.05, 0.28, 0.28, 0.90, m["dunkel"], 14, (0, math.pi/2, 0)))
        box(s*SP/2, 0, 0.05, 1.60, 3.60, 0.10, m["rost"])           # Schiene
    box(0, 0, H + 0.45, SP + 1.4, 2.60, 0.90, m["gelb"])            # Kranbruecke
    for k in range(5):
        box(-SP/2 + k*SP/4, 0, H + 0.45, 0.16, 2.70, 0.96, m["stahl2"])
    # Ausleger nach +y, Gegengewicht nach -y
    ab = box(0, 3.90, H + 1.55, 1.70, 5.60, 0.55, m["gelb"])
    ab.rotation_euler[0] = -0.10
    for s in (-1, 1):
        strebe((s*0.70, 0.30, H + 2.90), (s*0.70, 6.30, H + 1.15), 0.09, m["stahl2"])
    box(0, 0, H + 2.55, 2.40, 2.20, 2.00, m["weiss"])               # Maschinenhaus
    box(0, -1.12, H + 2.75, 1.90, 0.10, 1.10, m["glas"])
    _rahmen(0, -1.18, H + 2.75, 2.02, 1.22, 0.11, m, "stahl2")
    box(0, -2.35, H + 1.90, 2.20, 1.70, 1.30, m["stahl2"])          # Gegengewicht
    for s in (-1, 1):
        strebe((s*0.70, -0.40, H + 2.90), (s*0.70, -2.60, H + 2.20), 0.09, m["stahl2"])
    flach(zyl(0, 6.20, H + 0.90, 0.045, 1.40, m["stahl"], 8))       # Hubseil
    box(0, 6.20, H + 0.02, 0.90, 0.70, 0.35, m["stahl2"])           # Haken-Traverse
    rohr([(0, 6.20, H - 0.16), (0, 6.44, H - 0.46), (0, 6.10, H - 0.62)],
         0.055, m["stahl2"], 6, True, "Haken")
    flach(zyl(0, 4.40, H + 3.62, 0.10, 0.30, m["warn"], 10))        # Hindernisfeuer

def hafenkran(): _modul("th45_hafenkran", _b_hafenkran, 0.010)

# ================================================================ 3) Fischerboot
def _b_fischerboot():
    """Fischerboot, 9,20 x 3,10 x 4,60 m. Bug auf +x. TIEFGANG 0,55 m.

    ⚠️ Der Rumpf kommt aus `keil_y`: die Seitenansicht eines Boots ist eine
    stetige Linie von Bug zu Heck, und aus Quadern gestapelt bekommt man keine.
    Beim Einbau um 0,55 senken, sonst steht das Boot auf dem Wasser."""
    m = _mats()
    L, B = 9.00, 2.80
    prof = [(-L/2, 0.75), (-L/2 + 0.30, 0.18), (-1.20, 0.00), (2.20, 0.06),
            (L/2 - 0.90, 0.40), (L/2, 1.25), (L/2 - 0.20, 1.55),
            (-L/2 + 0.10, 1.40)]
    keil_y(prof, 0.0, B, m["rumpf"], name="Rumpf")
    box(0.20, 0, 1.42, L - 1.4, B - 0.16, 0.12, m["deck"])          # Deck
    for s in (-1, 1):                                               # Schanzkleid
        box(0.20, s*(B/2 - 0.06), 1.72, L - 1.6, 0.12, 0.50, m["weiss"])
    box(0, 0, 1.20, L - 0.6, B + 0.06, 0.18, m["weiss"])            # Scheuerleiste
    # Ruderhaus: Fenster VOR der Wand
    box(-1.40, 0, 2.42, 2.60, B - 0.55, 1.90, m["weiss"])
    for s in (-1, 1):
        box(-1.40, s*(B/2 - 0.30), 2.75, 2.20, 0.06, 0.72, m["glas"])
        _rahmen(-1.40, s*(B/2 - 0.27), 2.75, 2.32, 0.84, 0.10, m, "stahl2")
    box(-0.12, 0, 2.75, 0.06, B - 0.90, 0.72, m["glas"])
    box(-1.40, 0, 3.46, 2.80, B - 0.40, 0.20, m["weiss"])           # Ruderhausdach
    flach(zyl(-1.40, 0, 3.86, 0.04, 0.60, m["stahl"], 8))
    flach(zyl(-2.35, 0, 2.90, 0.16, 0.90, m["rost"], 12))           # Schornstein
    # Mast mit Ausleger und Netztrommel
    flach(zyl(1.30, 0, 3.30, 0.075, 3.80, m["holz"], 10))
    strebe((1.30, 0, 4.70), (-1.90, 0, 3.90), 0.06, m["holz"])
    for s in (-1, 1):
        strebe((1.30, 0, 4.90), (0.60, s*(B/2 - 0.10), 1.60), 0.035, m["stahl"])
    flach(zyl(-2.60, 0, 1.95, 0.42, 1.20, m["rost"], 14, (math.pi/2, 0, 0)))
    flach(zyl(-2.60, 0, 1.95, 0.52, 0.10, m["rost"], 14, (math.pi/2, 0, 0)))
    for k in range(5):                                              # Reifenfender
        for s in (-1, 1):
            flach(zyl(-2.6 + k*1.5, s*(B/2 + 0.10), 1.32, 0.24, 0.14,
                      m["dunkel"], 12, (math.pi/2, 0, 0)))
    box(3.30, 0, 1.66, 0.70, 0.60, 0.36, m["rost"])                 # Ankerwinde
    flach(zyl(L/2 - 0.25, 0, 1.30, 0.05, 0.50, m["stahl"], 8))      # Bugstag

def fischerboot(): _modul("th45_fischerboot", _b_fischerboot, 0.010)

# ================================================================ 4) Segelboot
def _b_segelboot():
    """Segelboot, 6,60 x 2,20 x 8,20 m. Bug auf +x. TIEFGANG 0,40 m (ohne Kiel).

    Grosssegel und Fock als leicht gewoelbte Flaechen — ein flaches Dreieck sieht
    aus wie ein Blech, eine Woelbung wie Tuch im Wind."""
    m = _mats()
    L, B = 6.40, 2.00
    prof = [(-L/2, 0.55), (-L/2 + 0.25, 0.12), (-0.80, 0.00), (1.60, 0.05),
            (L/2 - 0.60, 0.35), (L/2, 1.00), (L/2 - 0.30, 1.15), (-L/2 + 0.10, 1.05)]
    keil_y(prof, 0.0, B, m["weiss"], name="Rumpf")
    box(0, 0, 0.95, L - 0.6, B + 0.05, 0.14, m["rumpf"])            # Zierstreifen
    box(0.10, 0, 1.10, L - 1.6, B - 0.30, 0.10, m["deck"])          # Deck
    box(-1.30, 0, 1.24, 1.90, B - 0.75, 0.40, m["deck"])            # Plicht
    for s in (-1, 1):
        box(-1.30, s*(B/2 - 0.42), 1.30, 1.90, 0.10, 0.34, m["weiss"])
    flach(zyl(0.60, 0, 4.60, 0.075, 7.00, m["stahl"], 10))          # Mast
    flach(zyl(-0.90, 0, 1.62, 0.055, 3.00, m["stahl"], 8, (0, math.pi/2, 0)))  # Baum
    # Grosssegel und Fock: gewoelbte Flaechen aus keil_y
    gs = [(0.55, 1.70), (0.55, 7.90), (-2.30, 1.70)]
    keil_y(gs, 0.0, 0.05, m["segel"], name="Grosssegel")
    fk = [(0.65, 1.70), (0.65, 7.10), (3.05, 1.35)]
    keil_y(fk, 0.0, 0.05, m["segel"], name="Fock")
    for k in range(4):                                              # Segellatten
        box(-0.60 - k*0.10, 0.03, 2.60 + k*1.30, 1.60 - k*0.22, 0.03, 0.05, m["rumpf"])
    flach(zyl(0.60, 0, 8.14, 0.05, 0.30, m["rot"], 8))              # Verklicker
    for s in (-1, 1):                                               # Wanten
        strebe((0.60, 0, 7.60), (0.20, s*(B/2 - 0.12), 1.14), 0.022, m["stahl"])
    strebe((0.60, 0, 7.70), (L/2 - 0.20, 0, 1.10), 0.022, m["stahl"])
    box(-2.55, 0, 1.36, 0.30, 0.34, 0.62, m["weiss"])               # Ruderkopf
    flach(zyl(-2.10, 0, 1.46, 0.03, 0.90, m["holz"], 8, (0, math.pi/2, 0)))

def segelboot(): _modul("th45_segelboot", _b_segelboot, 0.008)

# ================================================================ 5) Leuchtturm
def _b_leuchtturm():
    """Leuchtturm, 6,40 x 6,40 x 19,4 m. Tuer auf +y.

    ⚠️ Der Schaft ist ein DREHKOERPER mit Verjuengung. Als gestapelte Zylinder
    saehe man jeden Absatz — dieselbe Lehre wie beim Pylonen in Charge 39."""
    m = _mats()
    flach(dreh([(0.00, 0.00), (3.00, 0.00), (3.00, 0.70), (2.55, 0.95),
                (2.30, 3.00), (1.90, 8.00), (1.62, 13.00), (1.55, 14.00),
                (1.90, 14.30), (1.95, 14.90), (0.00, 14.95)],
               m["weiss"], 28, name="Schaft"))
    for k in range(4):                                              # Rote Baender
        zz = 2.30 + k*3.10
        r9 = 2.42 - 0.06*zz
        flach(zyl(0, 0, zz, r9, 1.30, m["rot"], 28))
    box(0, 2.30, 1.55, 1.10, 0.60, 2.40, m["dunkel"])               # Tuernische
    box(0, 2.58, 1.55, 0.94, 0.10, 2.24, m["rot"])
    _rahmen(0, 2.66, 1.55, 1.16, 2.62, 0.14, m)
    for k in range(4):                                              # Fenster im Schaft
        zz = 4.20 + k*2.70
        yy = 2.34 - 0.062*zz
        box(0, yy, zz, 0.62, 0.16, 0.86, m["glas"])
        _rahmen(0, yy + 0.10, zz, 0.76, 1.00, 0.10, m)
    # Galerie und Laterne
    flach(zyl(0, 0, 15.10, 2.55, 0.30, m["stahl2"], 28))
    for k in range(24):                                             # Gelaender
        a = TAU*k/24
        flach(zyl(math.cos(a)*2.35, math.sin(a)*2.35, 15.75, 0.045, 1.00,
                  m["stahl2"], 6))
    for zz in (16.18, 15.55):
        flach(dreh([(2.30, 0.0), (2.40, 0.0)], m["stahl2"], 28, z=zz, name="Riegel"))
    flach(zyl(0, 0, 17.00, 1.55, 2.50, m["glas"], 20))              # Laternenhaus
    for k in range(8):
        a = TAU*k/8
        box(math.cos(a)*1.52, math.sin(a)*1.52, 17.00, 0.12, 0.12, 2.50, m["stahl2"])
    flach(zyl(0, 0, 17.00, 1.00, 1.30, m["licht"], 18))             # Leuchtfeuer
    flach(kegel(0, 0, 18.75, 1.80, 0.30, 1.00, m["rot"], 20))       # Kuppel
    flach(kugel(0, 0, 19.28, 0.16, m["stahl2"], 8))

def leuchtturm(): _modul("th45_leuchtturm", _b_leuchtturm, 0.010)

# ================================================================ 6) Container
def _b_container():
    """Containerstapel, 6,20 x 2,50 x 5,30 m — drei Container versetzt gestapelt.

    Die Sicken sind das Erkennungsmerkmal: ein glatter Kasten ist eine Kiste."""
    m = _mats()
    def cont(x, y, z, farbe):
        L9, B9, H9 = 6.06, 2.44, 2.59
        box(x, y, z + H9/2, L9, B9, H9, farbe)
        for k in range(18):                                         # Sicken
            xx = x - L9/2 + 0.30 + k*(L9 - 0.6)/17
            for s in (-1, 1):
                box(xx, y + s*(B9/2 + 0.015), z + H9/2, 0.13, 0.05, H9 - 0.30, m["dunkel"])
        for s in (-1, 1):                                           # Rahmen oben/unten
            box(x, y, z + H9/2 + s*(H9/2 - 0.09), L9 + 0.06, B9 + 0.06, 0.18, m["dunkel"])
        for sx in (-1, 1):
            box(x + sx*(L9/2 - 0.06), y, z + H9/2, 0.14, B9 + 0.06, H9, m["dunkel"])
            for sy in (-1, 1):                                      # Eckbeschlaege
                for sz in (0.10, H9 - 0.10):
                    box(x + sx*(L9/2 - 0.08), y + sy*(B9/2 - 0.08), z + sz,
                        0.22, 0.22, 0.20, m["stahl2"])
        box(x + L9/2 - 0.03, y, z + H9/2, 0.06, B9 - 0.20, H9 - 0.30, m["dunkel"])
        for s in (-1, 1):                                           # Tuerstangen
            flach(zyl(x + L9/2 + 0.02, y + s*0.40, z + H9/2, 0.045, H9 - 0.34,
                      m["stahl2"], 8))
    cont(0.0,  0.0, 0.00, m["rumpf2"])
    cont(0.0,  0.0, 2.62, m["gruen"])
    cont(-0.1, 0.0, 5.24, m["rumpf"])

def container(): _modul("th45_container", _b_container, 0.008)

# ================================================================ 7) Strandkorb
def _b_strandkorb():
    """Strandkorb mit Sonnenschirm und Handtuch, 3,10 x 1,70 x 2,45 m.

    ⚠️ Die Haube ist eine Halbtonne aus `keil_y` — ein Strandkorb ohne die
    gewoelbte Haube ist ein Sessel."""
    m = _mats()
    KX = -0.75
    B9, T9 = 1.30, 1.05
    pkt = []
    N = 8
    for k in range(N + 1):                                          # Aussenbogen
        a = math.pi*k/N*0.5
        pkt.append((-math.sin(a)*T9/2, math.cos(a)*0.78 + 0.72))
    pkt.append((-T9/2 - 0.06, 0.30)); pkt.append((0.06, 0.30))
    hb = keil_y(pkt, 0.0, B9, m["gelb"], cx=KX, name="Haube")
    hb.rotation_euler[2] = math.pi/2
    box(KX, 0.16, 0.36, B9, T9 - 0.10, 0.72, m["holz"])             # Korpus
    box(KX, 0.16, 0.76, B9 - 0.10, T9 - 0.20, 0.10, m["weiss"])     # Sitzkissen
    for s in (-1, 1):
        box(KX + s*(B9/2 - 0.04), 0.16, 1.10, 0.08, T9 - 0.10, 0.80, m["holz"])
    for k in range(4):                                              # Streifen auf der Haube
        box(KX - B9/2 + 0.20 + k*(B9 - 0.4)/3, 0.10, 1.45, 0.09, T9*0.92, 0.86,
            m["weiss"])
    box(KX, -0.42, 0.06, B9 + 0.20, 0.36, 0.12, m["holz"])          # Kufe
    SX = 1.05                                                       # Sonnenschirm
    flach(zyl(SX, 0, 1.05, 0.045, 2.10, m["holz"], 10))
    flach(kegel(SX, 0, 2.22, 0.95, 0.10, 0.50, m["rot"], 16))
    for k in range(8):
        a = TAU*k/8
        box(SX + math.cos(a)*0.48, math.sin(a)*0.48, 2.06, 0.06, 0.06, 0.30, m["holz"])
    flach(kugel(SX, 0, 2.52, 0.09, m["holz"], 8))
    box(SX, 0, 0.04, 0.60, 0.60, 0.08, m["stein"])                  # Standfuss
    box(0.20, -0.62, 0.02, 1.20, 0.72, 0.04, m["rumpf"])            # Handtuch

def strandkorb(): _modul("th45_strandkorb", _b_strandkorb, 0.006)

# ================================================================ 8) Rettungsturm
def _b_rettungsturm():
    """Rettungsturm, 3,20 x 3,00 x 4,60 m — Stelzen, Kanzel, Leiter, Rettungsring.

    Die Kanzel ist zur Wasserseite (+y) offen; nach hinten geschlossen, sonst
    saehe man von der Strandseite mitten hindurch."""
    m = _mats()
    KB, KT, KH = 2.20, 1.90, 1.60
    ZB = 2.30                                                       # Kanzelboden
    for sx in (-1, 1):                                              # Stelzen
        for sy in (-1, 1):
            st = box(sx*1.05, sy*1.05, ZB/2, 0.16, 0.16, ZB + 0.20, m["holz"])
            st.rotation_euler[0] = -sy*0.06
            st.rotation_euler[1] = sx*0.06
    for zz in (0.55, 1.60):                                         # Querriegel
        for s in (-1, 1):
            box(s*1.05, 0, zz, 0.10, 2.10, 0.10, m["holz"])
            box(0, s*1.05, zz, 2.10, 0.10, 0.10, m["holz"])
    box(0, 0, ZB + 0.07, KB + 0.30, KT + 0.30, 0.14, m["holz"])     # Boden
    for s in (-1, 1):                                               # Seitenwaende
        box(s*(KB/2 + 0.06), 0, ZB + 0.70, 0.10, KT + 0.20, 1.20, m["weiss"])
    box(0, -KT/2 - 0.06, ZB + 0.70, KB + 0.30, 0.10, 1.20, m["weiss"])   # Rueckwand
    box(0, KT/2 + 0.02, ZB + 0.36, KB + 0.30, 0.10, 0.52, m["weiss"])    # Bruestung
    for k in range(5):                                              # Gelaenderstaebe
        box(-KB/2 + 0.20 + k*(KB - 0.4)/4, KT/2 + 0.02, ZB + 0.80, 0.06, 0.08, 0.36,
            m["weiss"])
    box(0, KT/2 + 0.02, ZB + 1.02, KB + 0.30, 0.12, 0.10, m["weiss"])
    dk = box(0, -0.10, ZB + 1.52, KB + 0.60, KT + 0.60, 0.14, m["rot"])  # Pultdach
    dk.rotation_euler[0] = 0.14
    for k in range(6):
        dr = box(-KB/2 - 0.25 + k*(KB + 0.5)/5, -0.10, ZB + 1.60, 0.08, KT + 0.60,
                 0.05, m["weiss"])
        dr.rotation_euler[0] = 0.14
    for k in range(6):                                              # Leiter hinten
        box(0, -KT/2 - 0.42, 0.32 + k*0.40, 0.60, 0.06, 0.06, m["holz"])
    for s in (-1, 1):
        strebe((s*0.30, -KT/2 - 0.42, 0.20), (s*0.30, -KT/2 - 0.20, ZB + 0.14),
               0.07, m["holz"])
    flach(dreh([(0.28, 0.0), (0.46, 0.0)], m["rot"], 20, x=KB/2 + 0.36,
               y=KT/2 - 0.20, z=ZB + 0.62, name="Rettungsring"))
    for k in range(4):
        a = TAU*k/4 + 0.4
        box(KB/2 + 0.36 + math.cos(a)*0.37, KT/2 - 0.20 + math.sin(a)*0.37,
            ZB + 0.62, 0.16, 0.16, 0.03, m["weiss"])

def rettungsturm(): _modul("th45_rettungsturm", _b_rettungsturm, 0.008)

# ================================================================ 9) Hafen (Ensemble)
def _teil(fn, px, py, rot=0.0, pz=0.0):
    vor = set(bpy.context.scene.objects)
    fn()
    for o in bpy.context.scene.objects:
        if o in vor: continue
        o.rotation_euler[2] += rot
        o.location = (px + math.cos(rot)*o.location[0] - math.sin(rot)*o.location[1],
                      py + math.sin(rot)*o.location[0] + math.cos(rot)*o.location[1],
                      pz + o.location[2])

def _b_hafen():
    """Massstabs-Test: Kai mit Kran, Booten, Leuchtturm und Strand, 60 x 44 m.

    Die Wasserflaeche liegt HIER, nicht in den Bauteilen (Lehre aus Charge 43),
    und die Boote sind um ihren Tiefgang gesenkt."""
    m = _mats()
    flach(box(0, -10.0, 0.004, 60.0, 24.0, 0.008, m["beton"]))      # Kaiflaeche
    flach(box(0, 11.0, 0.002, 60.0, 20.0, 0.004, m["rumpf"]))       # Wasser
    for k in range(6):
        _teil(_b_kaimauer, -20.0 + k*8.0, 0.4)
    _teil(_b_hafenkran, -14.0, -6.0)
    _teil(_b_fischerboot, -6.0, 6.5, 0.0, -0.55)
    _teil(_b_segelboot,    8.0, 6.0, 0.0, -0.40)
    _teil(_b_leuchtturm,  24.0, -3.0)
    for k in range(2):
        _teil(_b_container, 6.0 + k*7.0, -12.0)
    _teil(_b_strandkorb, -22.0, -17.0, math.pi)
    _teil(_b_rettungsturm, -12.0, -17.0)
    export("th45_hafen", 0.012, 2)

def hafen(): neu(); _b_hafen()

if __name__ == "__main__":
    print("Asset-Charge 45 (th45, Hafen und Strand):")
    for fn in (kaimauer, hafenkran, fischerboot, segelboot, leuchtturm,
               container, strandkorb, rettungsturm, hafen):
        fn()
    print("fertig")
