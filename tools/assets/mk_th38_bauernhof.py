# -*- coding: utf-8 -*-
"""Asset-Charge 38 (th38_*): BAUERNHOF.

Im Spiel steht seit langem ein Bauernhof-Wegweiser bei (-40|-196), aber dort gibt
es nur ein Gebaeude. Diese Ladung macht daraus einen Hof: Scheune, Silo, Traktor,
Heuballen, Weidezaun im Raster, Huehnerstall, Futtertrog und ein Hoftor.

Konventionen wie th5-th37 (siehe models/TH5-ASSETS.md), Werkzeug aus th_werkzeug.py:
  * Ursprung mittig, Unterkante exakt z = 0, Meter, PBR-Materialien.
  * Schauseite (Tor, Front) auf Blender +y  ->  three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT.

RASTER: th38_weidezaun und th38_steinmauer laufen auf x += 2,50 und sind damit
untereinander mischbar (Holz und Stein am selben Koppelrand).

⚠️ Die drei Fallen, die in dieser Datei am ehesten zuschlagen, stehen als Kommentar
   an der jeweiligen Stelle: Rahmen statt Platte, Kugel auf z = r, Drehachse beim
   Zylinder.
"""
import os, math
import th_werkzeug as W
from th_werkzeug import (bpy, bmesh, neu, mat, mat_bild, leucht, box, zyl, kugel,
                         kegel, scheibe, flach, dreh, rohr, bogen_pkt, volute_pkt,
                         strebe, kranz, runden, export, TAU)

def _mats():
    """Hoffarben: verwittertes Holz, rotes Scheunenblech, Wellblech, Stroh."""
    return {
      "holz":  mat_bild("BhHolz", "bohlen.png", (0.62,0.42,0.26), 0.88, 0.0, True),
      "holzD": mat("BhHolzD",  (0.34,0.22,0.14), 0.90),
      "rot":   mat("BhRot",    (0.44,0.11,0.09), 0.80),
      "putz":  mat_bild("BhPutz", "hausputz.png", (0.86,0.83,0.76), 0.90, 0.0, True),
      "blech": mat("BhBlech",  (0.52,0.55,0.58), 0.45, 0.55),
      "dach":  mat("BhDach",   (0.30,0.31,0.34), 0.72),
      "stroh": mat("BhStroh",  (0.74,0.62,0.28), 0.92),
      "stein": mat("BhStein",  (0.60,0.58,0.53), 0.90),
      "gruen": mat("BhGruen",  (0.16,0.34,0.18), 0.60),
      "reifen":mat("BhReifen", (0.07,0.07,0.08), 0.90),
      "glas":  mat("BhGlas",   (0.24,0.36,0.44), 0.12, 0.15),
      "chrom": mat("BhChrom",  (0.78,0.80,0.84), 0.20, 0.80),
      "rahm":  mat("BhRahmen", (0.94,0.93,0.90), 0.60),
    }

def _modul(name, bauer, bevel=0.012):
    neu(); bauer(); export(name, bevel, 2)

def _rahmen(x, yf, z, b, h, st, M, mat_="rahm"):
    """⚠️ Ein Rahmen sind VIER Balken. Eine Platte in Fenstergroesse davor deckt die
    Scheibe zu — genau der Fehler, der in Charge 35 (Gaube), 37 (Fenster) und 37
    (Ladenschild) dreimal aufgetreten ist."""
    box(x, yf, z + h/2 + st/2, b + 2*st, 0.08, st, M[mat_])
    box(x, yf, z - h/2 - st/2, b + 2*st, 0.08, st, M[mat_])
    for s in (-1, 1):
        box(x + s*(b/2 + st/2), yf, z, st, 0.08, h, M[mat_])

def _fenster(x, z, b, h, M, yf):
    """Scheibe VOR die Wand, Rahmen davor. Liegt die Scheibe hinter der Wandflaeche,
    sieht man durch die Rahmenoeffnung den Putz — die Wand hat kein Loch."""
    box(x, yf + 0.015, z, b, 0.05, h, M["glas"])
    _rahmen(x, yf + 0.03, z, b, h, 0.09, M)
    box(x, yf + 0.045, z, 0.04, 0.05, h, M["rahm"])

# ================================================================ 1) Scheune
def _b_scheune():
    """Grosse Feldscheune, 14,00 x 9,00 x 9,60 m — rotes Blech auf Holzstaendern,
    Satteldach, grosses Schiebetor auf der Schauseite.

    Die Wand ist nicht glatt: senkrechte Staender alle 1,75 m geben ihr das
    Relief, an dem man eine Scheune ueberhaupt erst erkennt. Eine glatte rote
    Kiste bleibt eine Kiste."""
    M = _mats()
    B, T, WH = 14.00, 9.00, 5.60
    box(0, 0, 0.18, B + 0.40, T + 0.40, 0.36, M["stein"])              # Sockel
    box(0, 0, WH/2 + 0.36, B, T, WH, M["rot"])
    for i in range(9):                                                  # Staender
        x = -B/2 + 0.35 + i*(B - 0.70)/8
        for s in (-1, 1):
            box(x, s*(T/2 + 0.03), WH/2 + 0.36, 0.16, 0.10, WH, M["holzD"])
    for s in (-1, 1):
        box(s*(B/2 + 0.03), 0, WH/2 + 0.36, 0.10, T - 0.20, WH, M["holzD"])
    box(0, 0, WH + 0.44, B + 0.20, T + 0.20, 0.16, M["holzD"])         # Traufband
    # Satteldach als Prisma
    v = [(-B/2 - 0.30, -T/2 - 0.30, WH + 0.52), (B/2 + 0.30, -T/2 - 0.30, WH + 0.52),
         (B/2 + 0.30,  T/2 + 0.30, WH + 0.52), (-B/2 - 0.30,  T/2 + 0.30, WH + 0.52),
         (-B/2 - 0.30, 0.0, WH + 4.00), (B/2 + 0.30, 0.0, WH + 4.00)]
    f = [(0,1,2,3), (0,4,5,1), (3,2,5,4), (0,3,4), (1,5,2)]
    me = bpy.data.meshes.new("Dach"); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new("Dach", me); bpy.context.collection.objects.link(o)
    me.materials.append(M["dach"]); bpy.context.view_layer.objects.active = o
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    uvl = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            uvl.data[li].uv = (p.x, p.z)
    # Schiebetor auf der Schauseite
    TB, TH = 5.20, 4.40
    box(0, T/2 + 0.10, TH/2 + 0.36, TB, 0.12, TH, M["holz"])
    for k in range(7):
        box(-TB/2 + 0.35 + k*(TB - 0.70)/6, T/2 + 0.17, TH/2 + 0.36, 0.10, 0.06, TH, M["holzD"])
    box(0, T/2 + 0.17, 2.30, TB, 0.06, 0.14, M["holzD"])               # Andreaskreuz-Riegel
    for s in (-1, 1):
        strebe((s*TB/2*0.9, T/2 + 0.20, 0.50), (-s*TB/2*0.9, T/2 + 0.20, 4.40), 0.10, M["holzD"])
    box(0, T/2 + 0.22, TH + 0.52, TB + 0.40, 0.12, 0.16, M["blech"])   # Laufschiene
    for s in (-1, 1):                                                   # Rollen
        flach(zyl(s*TB*0.34, T/2 + 0.22, TH + 0.44, 0.09, 0.06, M["chrom"], 12, (0, math.pi/2, 0)))
    _fenster(-B/2 + 2.2, 4.30, 1.10, 1.00, M, T/2)
    _fenster( B/2 - 2.2, 4.30, 1.10, 1.00, M, T/2)
    # Giebelluke
    box(0, T/2 + 0.34, WH + 1.70, 1.30, 0.10, 1.20, M["holz"])
    _rahmen(0, T/2 + 0.40, WH + 1.70, 1.30, 1.20, 0.10, M, "holzD")

def scheune(): _modul("th38_scheune", _b_scheune, 0.012)

# ================================================================ 2) Silo
def _b_silo():
    """Futtersilo, 3,60 m Durchmesser, 11,20 m hoch. Der Rumpf ist EIN Drehkoerper
    mit Wellblech-Sicken; als gestapelte Zylinder saehe man jede Fuge."""
    M = _mats()
    dreh([(0.00, 0.00), (1.95, 0.00), (1.95, 0.30), (1.80, 0.42), (1.80, 8.40),
          (1.86, 8.55), (1.80, 8.70), (1.58, 9.60), (1.10, 10.30), (0.42, 10.80),
          (0.00, 10.90)], M["blech"], 32, name="Rumpf")
    for k in range(11):                                                # Sicken
        flach(zyl(0, 0, 0.90 + k*0.70, 1.84, 0.07, M["blech"], 32))
    dreh([(0.00, 10.86), (0.30, 10.94), (0.26, 11.14), (0.00, 11.20)],
         M["blech"], 20, name="Haube")
    for s in (-1, 1):                                                  # Fuellrohr
        pass
    rohr([(1.70, 0, 0.60), (2.10, 0, 3.00), (2.10, 0, 7.00), (1.55, 0, 10.20)],
         0.16, M["blech"], 10, True, "Fuellrohr")
    # Steigleiter: die Sprossen liegen quer, also Achse auf x — rot=(0,pi/2,0).
    for s in (-1, 1):
        strebe((-1.86 + 0.0, s*0.24, 0.40), (-1.86, s*0.24, 9.40), 0.06, M["chrom"])
    for k in range(23):
        flach(zyl(-1.86, 0, 0.50 + k*0.40, 0.030, 0.48, M["chrom"], 8, (0, math.pi/2, 0)))
    box(0, 1.86, 1.30, 0.80, 0.10, 0.90, M["holzD"])                   # Auslaufklappe
    dreh([(0.00, 0.00), (2.20, 0.00), (2.20, 0.16), (0.00, 0.16)], M["stein"], 24,
         name="Fundament")

def silo(): _modul("th38_silo", _b_silo, 0.010)

# ================================================================ 3) Traktor
def _b_traktor():
    """Traktor, 3,90 x 1,95 x 2,55 m. Front auf +x wie die Fahrzeuge aus Charge 37.

    ⚠️ Raeder: `zyl(rot=(pi/2,0,0))` legt die Achse auf y — das ist hier richtig.
    Mit (0,pi/2,0) laege sie auf x und die Raeder stuenden quer zur Fahrtrichtung."""
    M = _mats()
    HR, VR = 0.72, 0.42                                                # Hinter-, Vorderrad
    box(0.10, 0, 0.86, 2.60, 0.90, 0.42, M["gruen"])                   # Rahmen
    box(0.95, 0, 1.24, 1.35, 0.86, 0.62, M["gruen"])                   # Motorhaube
    box(1.62, 0, 1.20, 0.16, 0.72, 0.46, M["blech"])                   # Kuehlergrill
    for k in range(4):
        box(1.66, 0, 1.02 + k*0.12, 0.06, 0.66, 0.045, M["chrom"])
    for s in (-1, 1):
        flach(zyl(1.60, s*0.30, 1.52, 0.13, 0.10, leucht("BhLicht", (1.0,0.94,0.76), 2.4),
                  12, (0, math.pi/2, 0)))
    box(-0.62, 0, 1.34, 1.05, 0.94, 0.34, M["gruen"])                  # Sitzkonsole
    box(-0.62, 0, 1.66, 0.52, 0.52, 0.14, M["holzD"])                  # Sitz
    box(-0.86, 0, 1.92, 0.14, 0.50, 0.42, M["holzD"])                  # Lehne
    rohr([(-0.10, 0, 1.55), (0.10, 0, 1.90), (0.16, 0, 2.02)], 0.045, M["chrom"], 8, True, "Lenksaeule")
    flach(zyl(0.16, 0, 2.06, 0.22, 0.04, M["holzD"], 16, (0, 0.5, 0)))  # Lenkrad
    for s in (-1, 1):                                                   # Ueberrollbuegel
        strebe((-0.95, s*0.44, 1.50), (-0.95, s*0.44, 2.42), 0.07, M["gruen"])
    box(-0.95, 0, 2.44, 0.10, 0.94, 0.08, M["gruen"])
    flach(zyl(0.92, 0, 1.98, 0.055, 0.90, M["blech"], 10))              # Auspuff
    flach(zyl(0.92, 0, 2.44, 0.075, 0.10, M["blech"], 10))
    for s in (-1, 1):                                                   # Raeder
        flach(zyl(-0.95, s*0.80, HR, HR, 0.34, M["reifen"], 20, (math.pi/2, 0, 0)))
        flach(zyl(-0.95, s*0.80, HR, HR*0.52, 0.36, M["gruen"], 16, (math.pi/2, 0, 0)))
        for k in range(8):                                              # Stollenprofil
            a = TAU*k/8
            st = box(-0.95 + math.cos(a)*HR*0.86, s*0.80, HR + math.sin(a)*HR*0.86,
                     0.14, 0.36, 0.09, M["reifen"])
            st.rotation_euler[1] = -(a + math.pi/2)
        flach(zyl(1.28, s*0.72, VR, VR, 0.24, M["reifen"], 16, (math.pi/2, 0, 0)))
        flach(zyl(1.28, s*0.72, VR, VR*0.50, 0.26, M["gruen"], 12, (math.pi/2, 0, 0)))
    box(-1.42, 0, 0.92, 0.20, 0.70, 0.16, M["blech"])                   # Anhaengerkupplung

def traktor(): _modul("th38_traktor", _b_traktor, 0.010)

# ================================================================ 4) Heuballen
def _b_heuballen():
    """Rundballen-Stapel, 2,60 x 1,40 x 2,30 m — drei unten, zwei oben.

    ⚠️ Ein liegender Zylinder mit Radius r gehoert auf z = r, sonst schwebt oder
    versinkt er. Die obere Lage liegt in der Kehle der unteren, nicht mittig
    darauf: z = r + r*sqrt(3) ergaebe Punktberuehrung, hier reicht 1,72*r."""
    M = _mats()
    R, L = 0.60, 1.28
    def ballen(x, z):
        flach(zyl(x, 0, z, R, L, M["stroh"], 20, (math.pi/2, 0, 0)))
        for s in (-1, 1):                                               # Stirnseiten
            flach(zyl(x, s*(L/2 + 0.005), z, R*0.97, 0.02, M["stroh"], 20, (math.pi/2, 0, 0)))
        for k in range(6):                                              # Wickelbaender
            flach(zyl(x - L/2 + 0.12 + k*(L - 0.24)/5, 0, z, R + 0.012, 0.05,
                      M["holzD"], 20, (math.pi/2, 0, 0)))
    for i in range(3): ballen(-R*2 + i*R*2, R)
    for i in range(2): ballen(-R + i*R*2, R + R*1.72)

def heuballen(): _modul("th38_heuballen", _b_heuballen, 0.008)

# ================================================================ 5) Weidezaun
def _b_weidezaun():
    """Weidezaun-Modul, Raster 2,50 m, 1,25 m hoch — Rundpfosten, drei Querlatten,
    eine Strebe. Reihbar: x += 2,50."""
    M = _mats()
    BR = 2.50
    for s in (-1, 1):
        dreh([(0.00, 0.00), (0.085, 0.00), (0.085, 1.10), (0.070, 1.18),
              (0.040, 1.24), (0.00, 1.26)], M["holz"], 12, x=s*(BR/2 - 0.09), name="Pfosten")
    for z in (0.42, 0.76, 1.08):
        box(0, 0, z, BR - 0.12, 0.07, 0.13, M["holz"])
    strebe((-BR/2 + 0.20, 0, 0.16), (BR/2 - 0.30, 0, 1.02), 0.075, M["holzD"])
    for s in (-1, 1):                                                   # Grasbueschel am Fuss
        for k in range(3):
            flach(kugel(s*(BR/2 - 0.09) + (k - 1)*0.11, (k % 2 - 0.5)*0.10, 0.09,
                        0.09, M["gruen"], 7))

def weidezaun(): _modul("th38_weidezaun", _b_weidezaun, 0.007)

# ================================================================ 6) Huehnerstall
def _b_huehnerstall():
    """Huehnerstall auf Stelzen, 2,40 x 1,80 x 2,05 m — Rampe, Klappe, Legenester,
    Pultdach aus Wellblech."""
    M = _mats()
    B, T, KH = 2.40, 1.60, 1.05
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(sx*(B/2 - 0.14), sy*(T/2 - 0.14), 0.28, 0.14, 0.14, 0.56, M["holzD"])
    box(0, 0, 0.60, B, T, 0.10, M["holz"])                              # Boden
    box(0, 0, 0.65 + KH/2, B, T, KH, M["holz"])
    for k in range(7):                                                  # Bretterfuge
        box(-B/2 + 0.18 + k*(B - 0.36)/6, T/2 + 0.02, 0.65 + KH/2, 0.05, 0.04, KH, M["holzD"])
    box(0, -0.06, 0.65 + KH + 0.10, B + 0.34, T + 0.40, 0.10, M["blech"])
    for k in range(9):                                                  # Wellblech-Sicken
        box(-B/2 - 0.10 + k*(B + 0.20)/8, -0.06, 0.65 + KH + 0.16, 0.06, T + 0.40, 0.035, M["blech"])
    # Einflugklappe mit Rahmen (nicht als Platte davor!)
    box(0.55, T/2 + 0.03, 0.90, 0.34, 0.05, 0.42, M["holzD"])
    _rahmen(0.55, T/2 + 0.06, 0.90, 0.34, 0.42, 0.06, M, "holzD")
    strebe((0.55, T/2 + 0.10, 0.66), (0.55, T/2 + 0.95, 0.06), 0.13, M["holz"])   # Rampe
    for k in range(5):
        box(0.55, T/2 + 0.22 + k*0.16, 0.56 - k*0.115, 0.30, 0.05, 0.035, M["holzD"])
    _fenster(-0.62, 1.12, 0.44, 0.34, M, T/2)
    for s in (-1, 1):                                                   # Legenester aussen
        box(s*(B/2 + 0.10), -0.30, 0.98, 0.20, 0.60, 0.44, M["holz"])
    flach(kugel(0.95, 0.10, 1.98, 0.09, M["rot"], 8))                   # Hahn auf dem First
    kegel(1.02, 0.10, 1.98, 0.05, 0.0, 0.10, M["stroh"], 6, rot=(0, math.pi/2, 0))

def huehnerstall(): _modul("th38_huehnerstall", _b_huehnerstall, 0.008)

# ================================================================ 7) Futtertrog
def _b_futtertrog():
    """Futtertrog aus Holz auf Boecken, 2,20 x 0,70 x 0,74 m. Der Trog ist ein
    Keil, kein Kasten — die schraegen Waende sind das, woran man ihn erkennt."""
    M = _mats()
    L, OB, UB, TH = 2.20, 0.62, 0.34, 0.30
    for s in (-1, 1):                                                   # Schraegwaende
        w = box(0, s*(OB + UB)/4, 0.52, L, 0.06, TH + 0.06, M["holz"])
        w.rotation_euler[0] = s*0.42
    box(0, 0, 0.38, L, UB, 0.06, M["holz"])                             # Boden
    for s in (-1, 1):                                                   # Stirnbretter
        box(s*(L/2 - 0.03), 0, 0.52, 0.06, OB, TH + 0.10, M["holzD"])
    for s in (-1, 1):                                                   # Boecke
        for q in (-1, 1):
            strebe((s*(L/2 - 0.28), q*0.26, 0.36), (s*(L/2 - 0.28) + q*0.0, q*0.30, 0.02),
                   0.075, M["holzD"])
            box(s*(L/2 - 0.28), q*0.28, 0.19, 0.09, 0.09, 0.38, M["holzD"])
    box(0, 0, 0.20, L - 0.30, 0.07, 0.07, M["holzD"])                   # Querzug
    for k in range(5):                                                  # Heu im Trog
        flach(kugel(-0.80 + k*0.40, 0.0, 0.60, 0.13, M["stroh"], 8))

def futtertrog(): _modul("th38_futtertrog", _b_futtertrog, 0.007)

# ================================================================ 8) Hoftor
def _b_hoftor():
    """Hoftor zwischen zwei Steinpfeilern, 4,60 x 0,60 x 2,90 m. Zwei Fluegel,
    Rundbogen aus `rohr()` — als gerade Streben saehe er aus wie ein Rohrschaden."""
    M = _mats()
    PB = 1.95
    for s in (-1, 1):
        dreh([(0.00, 0.00), (0.42, 0.00), (0.42, 0.14), (0.34, 0.22), (0.32, 2.10),
              (0.40, 2.20), (0.44, 2.32), (0.32, 2.42), (0.20, 2.54), (0.00, 2.58)],
             M["stein"], 20, x=s*PB, name="Pfeiler")
        flach(kugel(s*PB, 0, 2.66, 0.14, M["stein"], 12))
    rohr(bogen_pkt(-PB, PB, 2.10, 0.62, 11), 0.055, M["holzD"], 10, True, "Bogen")
    box(0, 0, 2.80, 1.70, 0.09, 0.34, M["holz"])                        # Hofschild
    _rahmen(0, 0.05, 2.80, 1.70, 0.34, 0.07, M, "holzD")
    for s in (-1, 1):                                                   # Torfluegel
        x0, x1 = 0.06*s, (PB - 0.36)*s
        box((x0 + x1)/2, 0, 0.22, abs(x1 - x0), 0.07, 0.14, M["holz"])
        box((x0 + x1)/2, 0, 1.72, abs(x1 - x0), 0.07, 0.14, M["holz"])
        n = 6
        for k in range(n + 1):
            xx = x0 + (x1 - x0)*k/n
            strebe((xx, 0, 0.16), (xx, 0, 1.82), 0.045, M["holz"])
        strebe((x0, 0, 0.24), (x1, 0, 1.68), 0.07, M["holzD"])          # Diagonale
        flach(zyl(x1 - s*0.10, 0.06, 0.98, 0.05, 0.10, M["chrom"], 10, (math.pi/2, 0, 0)))
    for s in (-1, 1):                                                   # Grasnarbe am Pfeiler
        for k in range(4):
            flach(kugel(s*PB + (k - 1.5)*0.16, 0.16, 0.08, 0.08, M["gruen"], 7))

def hoftor(): _modul("th38_hoftor", _b_hoftor, 0.008)

# ================================================================ 9) Hof-Ensemble
def _teil(fn, px, py, rot=0.0, pz=0.0):
    vor = set(bpy.context.scene.objects)
    fn()
    emp = bpy.data.objects.new("Platz", None); bpy.context.collection.objects.link(emp)
    emp.location = (px, py, pz); emp.rotation_euler[2] = rot
    for o in list(bpy.context.scene.objects):
        if o in vor or o is emp: continue
        o.parent = emp
    return emp

def hof():
    """Der ganze Hof aus den Teilen oben — zugleich die Massstabs-Probe. Ein Silo
    allein sieht immer richtig aus; erst neben der Scheune faellt auf, wenn es zu
    klein ist."""
    neu()
    M = _mats()
    scheibe(0, 0, 0.004, 15.0, M["stein"], 40)                          # Hofplatz
    _teil(_b_scheune, -6.5, -7.0)
    _teil(_b_silo, 4.6, -8.4)
    _teil(_b_huehnerstall, 9.4, -1.0, -math.pi/2)
    _teil(_b_traktor, -2.0, 2.2, math.pi/2)
    _teil(_b_heuballen, -9.5, 2.6)
    _teil(_b_futtertrog, 6.4, 4.0, math.pi)
    _teil(_b_hoftor, 0.0, 11.6)
    for k in range(4):                                                  # Koppel rechts
        _teil(_b_weidezaun, 13.2, 2.0 + k*2.5, math.pi/2)
    for k in range(3):                                                  # Koppel links
        _teil(_b_weidezaun, -13.2, 2.0 + k*2.5, math.pi/2)
    export("th38_hof", 0.012, 2)

if __name__ == "__main__":
    print("Asset-Charge 38 (th38, Bauernhof):")
    for fn in (scheune, silo, traktor, heuballen, weidezaun, huehnerstall,
               futtertrog, hoftor, hof):
        fn()
    print("fertig")
