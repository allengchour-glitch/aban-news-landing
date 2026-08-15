# -*- coding: utf-8 -*-
"""Asset-Charge 44 (th44_*): STADION UND SPORTPLATZ.

Der Sportpark bei (0|216) hat Schwimmbad, Tennishalle, Fitnessstudio, Eishalle,
Kletterhalle und einen Basketballplatz — aber keinen Sportplatz: kein Spielfeld,
keine Tribuene, kein Flutlicht, kein Tor. Ein Sportpark ohne Sportplatz ist
dieselbe Luecke wie die Wartehaeuschen ohne Bus in Charge 39.

Konventionen wie th5-th43 (siehe models/TH5-ASSETS.md), Werkzeug aus th_werkzeug.py:
  * Ursprung mittig, Unterkante exakt z = 0, Meter, PBR-Materialien.
  * Schauseite (Sitzreihen, Toroeffnung, Tafelfront) auf Blender +y -> three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT.

RASTER: th44_tribuene laeuft auf x += 12,00, th44_ballfangzaun auf x += 4,00.

⚠️ Angewandte Regeln (ausgeschrieben in TH5-ASSETS.md):
   Stufenkoerper und Daecher per `keil_y` + Drehung um z (Charge 41) · Glas und
   sichtbare Teile VOR der Flaeche, waagrecht wie senkrecht (Charge 40/43) ·
   Rahmen aus vier Balken, von der Mitte gerechnet (35/37/38/42) · Hellwert-
   abstand zwischen Grund und Zierglied (37/41) · mehrere Dinge in einem Modul um
   den Ursprung verteilen (42) · Fahrbahn- und Feldmarkierung gehoert an den ORT,
   nicht ins Bauteil (43).
"""
import os, math
import th_werkzeug as W
from th_werkzeug import (bpy, bmesh, neu, mat, mat_bild, leucht, box, zyl, kugel,
                         kegel, scheibe, flach, dreh, rohr, bogen_pkt, volute_pkt,
                         strebe, kranz, runden, export, keil_y, rad, TAU)

def _mats():
    return {
      "beton": mat("StBeton",  (0.62,0.61,0.58), 0.92),
      "beton2":mat("StBeton2", (0.44,0.43,0.41), 0.93),
      "stein": mat("StStein",  (0.94,0.93,0.90), 0.84),
      "stahl": mat("StStahl",  (0.58,0.60,0.64), 0.42, 0.60),
      "stahl2":mat("StStahl2", (0.34,0.36,0.40), 0.50, 0.55),
      "dunkel":mat("StDunkel", (0.12,0.13,0.15), 0.68),
      "rasen": mat("StRasen",  (0.20,0.44,0.20), 0.95),
      "rot":   mat("StRot",    (0.68,0.20,0.16), 0.68),
      "blau":  mat("StBlau",   (0.14,0.30,0.58), 0.68),
      "gelb":  mat("StGelb",   (0.84,0.68,0.14), 0.68),
      "sand":  mat("StSand",   (0.80,0.72,0.52), 0.95),
      "ziegel":mat("StZiegel", (0.62,0.28,0.20), 0.86),
      "holz":  mat("StHolz",   (0.46,0.30,0.17), 0.86),
      "netz":  mat("StNetz",   (0.90,0.90,0.88), 0.80),
      "glas":  mat("StGlas",   (0.16,0.24,0.30), 0.14, 0.20),
      "licht": leucht("StLicht",  (1.00,0.96,0.84), 1.8),
      "anzeig":leucht("StAnzeig", (0.98,0.72,0.18), 1.4),
    }

def _modul(name, bauer, bevel=0.012):
    neu(); bauer(); export(name, bevel, 2)

def _rahmen(x, yf, z, b, h, st, m, mat_="stein"):
    """Vier Balken, von der MITTE gerechnet (Unterkante z - h/2)."""
    box(x, yf, z + h/2 - st/2, b, 0.07, st, m[mat_])
    box(x, yf, z - h/2 + st/2, b, 0.07, st, m[mat_])
    for s in (-1, 1):
        box(x + s*(b/2 - st/2), yf, z, st, 0.07, h - 2*st, m[mat_])

def _netzflaeche(x, y, z, br, ho, m, richtung="xz", maschen=0.30, d=0.014):
    """Netz aus duennen Staeben in beiden Richtungen.

    ⚠️ Ein Netz als einzelne halbdurchsichtige Platte liest sich als Milchglas.
    Die Maschen sind das, woran man es erkennt — und sie kosten hier nur duenne
    Zylinder, weil das Modell ohnehin nicht texturiert wird."""
    nx = max(2, int(br/maschen)); nz = max(2, int(ho/maschen))
    for k in range(nx + 1):
        xx = x - br/2 + br*k/nx
        if richtung == "xz": flach(zyl(xx, y, z, d, ho, m["netz"], 4))
        else:                flach(zyl(x, y - br/2 + br*k/nx, z, d, ho, m["netz"], 4))
    for k in range(nz + 1):
        zz = z - ho/2 + ho*k/nz
        if richtung == "xz":
            flach(zyl(x, y, zz, d, br, m["netz"], 4, (0, math.pi/2, 0)))
        else:
            flach(zyl(x, y, zz, d, br, m["netz"], 4, (math.pi/2, 0, 0)))

# ================================================================ 1) Tribuene
def _b_tribuene():
    """Tribuenen-Modul, Raster 12,00 m, 8 Reihen, 5,90 m hoch. Sitzseite auf +y.

    ⚠️ Der Stufenkoerper kommt aus `keil_y`: der Querschnitt einer Tribuene IST
    eine Treppe, und als Koerper extrudiert bekommt man Auflager, Stirnseiten und
    Stufen in einem Zug. Aus gestapelten Quadern haette jede Reihe eine eigene
    Silhouette und die Stirnseite waere offen — derselbe Fehler wie das
    Plattendach in Charge 41."""
    m = _mats()
    BR, R, ST, AU = 12.00, 8, 0.42, 0.78                # Reihen, Steigung, Auftritt
    prof = [(-R*AU/2 - 0.55, 0.0)]
    for k in range(R):                                  # Treppenprofil
        x0 = -R*AU/2 + k*AU
        prof.append((x0, k*ST)); prof.append((x0 + AU, k*ST))
    prof.append((R*AU/2, R*ST)); prof.append((R*AU/2 + 0.55, R*ST - 0.30))
    prof.append((R*AU/2 + 0.55, 0.0))
    kb = keil_y(prof, 0.0, BR, m["beton"], name="Stufenkoerper")
    kb.rotation_euler[2] = math.pi/2
    for k in range(R):                                  # Sitzschalen
        yy = -R*AU/2 + k*AU + AU*0.42
        for q in range(11):
            xx = -BR/2 + 0.65 + q*(BR - 1.3)/10
            sc = box(xx, yy, k*ST + 0.28, 0.46, 0.40, 0.10,
                     m["blau"] if (k + q) % 3 else m["rot"])
            le = box(xx, yy - 0.20, k*ST + 0.44, 0.46, 0.09, 0.30,
                     m["blau"] if (k + q) % 3 else m["rot"])
            le.rotation_euler[0] = -0.18
    for s in (-1, 1):                                   # Wangen
        box(s*(BR/2 - 0.12), 0, R*ST/2, 0.24, R*AU + 1.1, R*ST + 0.4, m["beton2"])
    for k in range(R + 1):                              # Gelaender hinten
        pass
    box(0, R*AU/2 + 0.30, R*ST + 0.55, BR, 0.12, 1.10, m["stahl"])
    for q in range(9):
        flach(zyl(-BR/2 + 0.7 + q*(BR - 1.4)/8, R*AU/2 + 0.30, R*ST + 0.55,
                  0.045, 1.10, m["stahl"], 8))
    # Dach auf vier Stuetzen, nach vorn geneigt
    for s in (-1, 1):
        for q in (-1, 1):
            box(s*(BR/2 - 0.55), R*AU/2 + q*0.10 - 0.10, R*ST + 1.85,
                0.20, 0.20, 3.60, m["stahl2"])
    dk = box(0, 0.35, R*ST + 3.95, BR + 0.6, R*AU + 1.6, 0.16, m["stahl2"])
    dk.rotation_euler[0] = -0.16
    for k in range(9):
        dr = box(-BR/2 - 0.2 + k*(BR + 0.4)/8, 0.35, R*ST + 4.05,
                 0.10, R*AU + 1.6, 0.05, m["stahl"])
        dr.rotation_euler[0] = -0.16
    for s in (-1, 1):                                   # Aufgang seitlich
        for k in range(R):
            box(s*(BR/2 + 0.42), -R*AU/2 + k*AU + AU/2, k*ST - ST/2 + 0.07,
                0.70, AU, 0.14, m["beton2"])

def tribuene(): _modul("th44_tribuene", _b_tribuene)

# ================================================================ 2) Flutlichtmast
def _b_flutlichtmast():
    """Flutlichtmast, 3,60 x 1,30 x 18,4 m — Gittermast, Traverse, acht Strahler.

    ⚠️ Der Kopf sitzt auf einer Traverse VOR dem Mast, nicht auf seiner Achse:
    sonst leuchtet der Mast in seinen eigenen Schatten."""
    m = _mats()
    HM = 16.0
    for s in (-1, 1):                                   # Gittermast
        for q in (-1, 1):
            strebe((s*0.30, q*0.30, 0.30), (s*0.13, q*0.13, HM), 0.075, m["stahl"])
    for k in range(20):
        zz = 0.55 + k*(HM - 0.9)/19
        f = 0.30 - 0.17*k/19
        for s in (-1, 1):
            box(s*f, 0, zz, 0.06, f*2, 0.06, m["stahl"])
            box(0, s*f, zz, f*2, 0.06, 0.06, m["stahl"])
        if k % 2 == 0:
            dg = box(0, 0, zz + 0.16, f*2.4, 0.06, 0.06, m["stahl"])
            dg.rotation_euler[1] = 0.60
    box(0, 0, 0.20, 1.30, 1.30, 0.40, m["beton2"])      # Fundament
    for k in range(24):                                 # Steigleiter
        box(0.34, 0, 0.80 + k*0.62, 0.36, 0.035, 0.035, m["stahl"])
    for s in (-1, 1):
        strebe((0.50, s*0.02, 0.70), (0.50, s*0.02, HM - 0.6), 0.035, m["stahl"])
    # Traverse und Strahler
    box(0, 0.55, HM + 0.55, 3.40, 0.20, 0.20, m["stahl2"])
    box(0, 0.55, HM + 1.35, 3.40, 0.20, 0.20, m["stahl2"])
    for s in (-1, 1):
        strebe((0, 0.10, HM + 0.30), (s*1.55, 0.55, HM + 0.55), 0.07, m["stahl2"])
        strebe((0, 0.10, HM + 1.10), (s*1.55, 0.55, HM + 1.35), 0.07, m["stahl2"])
    for r9 in range(2):
        for k in range(4):
            xx = -1.35 + k*0.90
            zz = HM + 0.55 + r9*0.80
            box(xx, 0.70, zz, 0.62, 0.34, 0.42, m["stahl2"])
            flach(zyl(xx, 0.90, zz, 0.24, 0.06, m["licht"], 14, (math.pi/2, 0, 0)))
            flach(zyl(xx, 0.86, zz, 0.28, 0.05, m["dunkel"], 14, (math.pi/2, 0, 0)))

def flutlichtmast(): _modul("th44_flutlichtmast", _b_flutlichtmast, 0.006)

# ================================================================ 3) Tor
def _b_tor():
    """Fussballtor, 7,50 x 2,30 x 2,50 m — Pfosten, Latte, Netz, Bodenrahmen.

    Toroeffnung auf +y: das Netz haengt nach -y, also in three.js nach +z."""
    m = _mats()
    B, H, T = 7.32, 2.44, 1.90
    flach(zyl(-B/2, 0, H/2, 0.06, H, m["stein"], 12))   # Pfosten
    flach(zyl( B/2, 0, H/2, 0.06, H, m["stein"], 12))
    flach(zyl(0, 0, H, 0.06, B, m["stein"], 12, (0, math.pi/2, 0)))   # Latte
    for s in (-1, 1):                                   # Netzbuegel schraeg
        rohr([(s*B/2, 0.0, H), (s*B/2, -T*0.55, H - 0.30), (s*B/2, -T, 0.10)],
             0.045, m["stein"], 6, True, "Buegel")
        flach(zyl(s*B/2, -T/2, 0.05, 0.045, T, m["stein"], 8, (math.pi/2, 0, 0)))
    flach(zyl(0, -T, 0.10, 0.045, B, m["stein"], 8, (0, math.pi/2, 0)))
    _netzflaeche(0, -T + 0.02, H/2, B, H, m, "xz", 0.34)             # Rueckwand
    for s in (-1, 1):                                                # Seitennetze
        _netzflaeche(s*B/2 - s*0.02, -T/2, H/2 - 0.15, T, H - 0.3, m, "yz", 0.34)
    for k in range(int(B/0.34) + 1):                                 # Dachnetz
        xx = -B/2 + k*0.34
        flach(zyl(xx, -T/2, H - 0.16, 0.014, T, m["netz"], 4, (math.pi/2, 0, 0)))
    for k in range(int(T/0.34) + 1):
        flach(zyl(0, -k*0.34, H - 0.16, 0.014, B, m["netz"], 4, (0, math.pi/2, 0)))

def tor(): _modul("th44_tor", _b_tor, 0.005)

# ================================================================ 4) Ballfangzaun
def _b_ballfangzaun():
    """Ballfangzaun-Modul, Raster 4,00 m, 5,00 m hoch — Pfosten, Netz, Riegel."""
    m = _mats()
    BR, H = 4.00, 4.90
    for s in (-1, 1):
        box(s*(BR/2 - 0.09), 0, H/2, 0.18, 0.18, H, m["stahl2"])
        box(s*(BR/2 - 0.09), 0, 0.08, 0.42, 0.42, 0.16, m["beton2"])
    for zz in (0.30, H/2, H - 0.14):
        box(0, 0, zz, BR - 0.18, 0.10, 0.10, m["stahl2"])
    _netzflaeche(0, 0.02, H/2 + 0.10, BR - 0.30, H - 0.55, m, "xz", 0.34)

def ballfangzaun(): _modul("th44_ballfangzaun", _b_ballfangzaun, 0.005)

# ================================================================ 5) Anzeigetafel
def _b_spielstand():
    """Spielstandtafel auf zwei Masten, 5,20 x 0,60 x 5,60 m.

    ⚠️ Die Ziffernfelder sind vertiefte Kaesten mit leuchtender Flaeche darin —
    als aufgemalte Rechtecke waeren sie bei Tag unsichtbar."""
    m = _mats()
    for s in (-1, 1):
        box(s*1.85, 0, 1.85, 0.26, 0.26, 3.70, m["stahl2"])
        box(s*1.85, 0, 0.10, 0.62, 0.62, 0.20, m["beton2"])
    box(0, 0, 4.35, 5.00, 0.42, 2.30, m["dunkel"])      # Tafelkoerper
    box(0, 0, 4.35, 5.20, 0.30, 2.50, m["stahl2"])
    box(0, 0.18, 5.20, 4.40, 0.10, 0.44, m["stein"])    # Kopfzeile
    for s in (-1, 1):                                   # Ziffernfelder
        box(s*1.20, 0.16, 4.30, 1.50, 0.14, 0.90, m["dunkel"])
        box(s*1.20, 0.24, 4.30, 1.30, 0.06, 0.72, m["anzeig"])
        for k in range(1, 2):
            box(s*1.20, 0.28, 4.30, 0.06, 0.05, 0.72, m["dunkel"])
    box(0, 0.16, 3.55, 2.20, 0.14, 0.46, m["dunkel"])   # Spielzeit
    box(0, 0.24, 3.55, 2.00, 0.06, 0.32, m["anzeig"])
    box(0, 0, 5.52, 5.30, 0.50, 0.16, m["stahl2"])

def spielstand(): _modul("th44_spielstand", _b_spielstand, 0.006)

# ================================================================ 6) Ersatzbank
def _b_ersatzbank():
    """Ueberdachte Ersatzbank, 6,40 x 2,10 x 2,05 m. Oeffnung auf +y.

    Das Tonnendach entsteht aus `keil_y` mit gebogenem Profil — als flache Platte
    waere es ein Carport, und die Silhouette ist hier der ganze Wiedererkennungswert."""
    m = _mats()
    B, T = 6.20, 1.80
    pkt = []
    N = 9
    for k in range(N + 1):                              # Aussenbogen
        a = math.pi*k/N
        pkt.append((-math.cos(a)*T/2, math.sin(a)*1.05 + 0.62))
    for k in range(N + 1):                              # Innenbogen zurueck
        a = math.pi*(N - k)/N
        pkt.append((-math.cos(a)*(T/2 - 0.09), math.sin(a)*0.96 + 0.62))
    dk = keil_y(pkt, 0.0, B, m["stahl2"], name="Tonnendach")
    dk.rotation_euler[2] = math.pi/2
    for s in (-1, 1):                                   # Stirnwaende
        box(s*(B/2 - 0.05), -0.10, 0.90, 0.10, T - 0.10, 1.60, m["glas"])
        _rahmen(s*(B/2 - 0.02), -0.10, 0.90, T - 0.06, 1.66, 0.12, m, "stahl2")
    box(0, -T/2 + 0.09, 0.85, B, 0.18, 1.50, m["stahl2"])   # Rueckwand
    for k in range(4):                                  # Sitzbank
        box(0, -0.18 + k*0.16, 0.50, B - 0.60, 0.13, 0.06, m["holz"])
    for k in range(3):
        box(0, -0.26, 0.72 + k*0.17, B - 0.60, 0.07, 0.13, m["holz"])
    for q in range(4):
        box(-B/2 + 0.75 + q*(B - 1.5)/3, -0.10, 0.24, 0.12, 0.56, 0.48, m["stahl2"])
    box(0, -T/2 + 0.20, 1.72, B - 1.2, 0.08, 0.28, m["stein"])   # Beschriftungsband

def ersatzbank(): _modul("th44_ersatzbank", _b_ersatzbank, 0.008)

# ================================================================ 7) Weitsprunganlage
def _b_sprunganlage():
    """Weitsprunganlage, 14,0 x 3,40 x 0,30 m — Anlauf, Absprungbalken, Sandgrube.

    ⚠️ Sie liegt praktisch flach. Alles, was hier Hoehe hat, sind die Randsteine —
    und genau die machen aus einer Sandflaeche eine Grube."""
    m = _mats()
    box(-3.20, 0, 0.025, 7.40, 1.30, 0.05, m["ziegel"])     # Anlaufbahn
    for s in (-1, 1):
        box(-3.20, s*0.68, 0.03, 7.40, 0.06, 0.06, m["stein"])
    box(0.60, 0, 0.035, 0.34, 1.30, 0.07, m["stein"])       # Absprungbalken
    box(0.90, 0, 0.032, 0.20, 1.30, 0.065, m["beton2"])
    box(4.10, 0, 0.02, 6.20, 2.90, 0.04, m["sand"])         # Sandgrube
    for s in (-1, 1):                                       # Grubenrand
        box(4.10, s*1.53, 0.07, 6.40, 0.16, 0.14, m["beton"])
    box(7.25, 0, 0.07, 0.16, 3.20, 0.14, m["beton"])
    box(1.02, 0, 0.07, 0.16, 3.20, 0.14, m["beton"])
    for k in range(6):                                      # Weitenmarken
        box(2.00 + k*1.00, 1.62, 0.09, 0.10, 0.22, 0.18, m["gelb"])

def sprunganlage(): _modul("th44_sprunganlage", _b_sprunganlage, 0.004)

# ================================================================ 8) Kassenhaeuschen
def _b_kasse():
    """Kassenhaeuschen, 3,40 x 3,00 x 3,45 m. Schalter auf +y.

    Passt auch an den Freizeitpark-Eingang: ein Park ohne Kasse ist ein Tor
    ohne Grund."""
    m = _mats()
    B, T, H = 2.80, 2.40, 2.60
    box(0, 0, 0.12, B + 0.5, T + 0.5, 0.24, m["beton2"])
    box(0, 0, H/2 + 0.24, B, T, H, m["stein"])
    for s in (-1, 1):
        box(s*(B/2 - 0.10), 0, H/2 + 0.30, 0.20, T + 0.06, H - 0.3, m["beton"])
    # Schalterfenster: Glas VOR der Wand, Ablage darunter
    box(0, T/2 + 0.02, 1.72, 1.60, 0.06, 0.95, m["glas"])
    _rahmen(0, T/2 + 0.05, 1.72, 1.76, 1.11, 0.11, m)
    box(0, T/2 + 0.16, 1.16, 1.90, 0.34, 0.09, m["beton"])          # Ablage
    box(0, T/2 + 0.03, 1.16, 1.60, 0.06, 0.12, m["dunkel"])         # Durchreiche
    box(0, T/2 + 0.06, 2.52, 2.10, 0.12, 0.42, m["rot"])            # Schild
    for k in range(5):
        box(-0.72 + k*0.36, T/2 + 0.13, 2.52, 0.22, 0.05, 0.20, m["stein"])
    box(0, -T/2 + 0.06, 1.30, 0.90, 0.12, 2.10, m["holz"])          # Tuer hinten
    box(0, 0, H + 0.34, B + 0.9, T + 0.9, 0.20, m["stahl2"])        # Vordach
    for k in range(7):
        box(-B/2 - 0.35 + k*(B + 0.7)/6, 0, H + 0.46, 0.09, T + 0.9, 0.05, m["stahl"])
    flach(zyl(0, T/2 + 0.30, H + 0.20, 0.16, 0.10, m["licht"], 12))

def kasse(): _modul("th44_kasse", _b_kasse)

# ================================================================ 9) Stadion (Ensemble)
def _teil(fn, px, py, rot=0.0, pz=0.0):
    vor = set(bpy.context.scene.objects)
    fn()
    for o in bpy.context.scene.objects:
        if o in vor: continue
        o.rotation_euler[2] += rot
        o.location = (px + math.cos(rot)*o.location[0] - math.sin(rot)*o.location[1],
                      py + math.sin(rot)*o.location[0] + math.cos(rot)*o.location[1],
                      pz + o.location[2])

def _b_stadion():
    """Massstabs-Test: Spielfeld mit Tribuene, Flutlicht und Ausstattung, 96 x 66 m.

    Die Feldmarkierung liegt HIER, nicht in den Bauteilen (Lehre aus Charge 43)."""
    m = _mats()
    flach(box(0, 0, 0.004, 96.0, 66.0, 0.008, m["rasen"]))
    for s in (-1, 1):                                   # Seitenlinien
        box(0, s*22.0, 0.012, 68.0, 0.12, 0.016, m["stein"])
        box(s*34.0, 0, 0.012, 0.12, 44.0, 0.016, m["stein"])
    box(0, 0, 0.012, 0.12, 44.0, 0.016, m["stein"])     # Mittellinie
    for k in range(40):                                 # Mittelkreis
        a = TAU*k/40
        box(math.cos(a)*9.15, math.sin(a)*9.15, 0.012, 0.16, 0.16, 0.016, m["stein"])
    _teil(_b_tor,  -34.0, 0.0, -math.pi/2)
    _teil(_b_tor,   34.0, 0.0,  math.pi/2)
    for k in range(3):
        _teil(_b_tribuene, -12.0 + k*12.0, 30.0, math.pi)
    for s in (-1, 1):
        for q in (-1, 1):
            _teil(_b_flutlichtmast, s*38.0, q*26.0, math.atan2(-q, -s))
    _teil(_b_spielstand, 0.0, -30.0, 0.0)
    _teil(_b_ersatzbank, -9.0, -25.0, 0.0)
    _teil(_b_ersatzbank,  9.0, -25.0, 0.0)
    _teil(_b_sprunganlage, -6.0, -28.0 + 0.0, 0.0, 0.0)
    for k in range(6):
        _teil(_b_ballfangzaun, -10.0 + k*4.0, 33.0)
    _teil(_b_kasse, 30.0, -30.0, 0.0)
    export("th44_stadion", 0.012, 2)

def stadion(): neu(); _b_stadion()

if __name__ == "__main__":
    print("Asset-Charge 44 (th44, Stadion und Sportplatz):")
    for fn in (tribuene, flutlichtmast, tor, ballfangzaun, spielstand,
               ersatzbank, sprunganlage, kasse, stadion):
        fn()
    print("fertig")
