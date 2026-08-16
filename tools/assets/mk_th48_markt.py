# -*- coding: utf-8 -*-
"""Asset-Charge 48 (th48_*): MARKTPLATZ.

Der „Marktplatz" bei (26|67) ist bisher ein Kartenpunkt mit zwei Ahornbaeumen —
kein Stand, keine Halle, kein Brunnen. Das Rathaus daneben zeigt seinen Portikus
auf einen leeren Platz.

Konventionen wie th5-th47 (siehe models/TH5-ASSETS.md), Werkzeug aus th_werkzeug.py:
  * Ursprung mittig, Unterkante exakt z = 0, Meter, PBR-Materialien.
  * Schauseite (Verkaufsseite, Portal) auf Blender +y -> three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT.

RASTER: th48_marktstand und th48_obststand laufen auf x += 4,00.

⚠️ Angewandte Regeln (alle in TH5-ASSETS.md ausgeschrieben):
   Dach als KOERPER per `keil_y` + Drehung um z (41/44/46/47) · KEIN gedrehter,
   skalierter Vierkant-Kegel — der ergibt immer ein Quadrat (47) · was eine
   Oeffnung umgibt, besteht aus vier Teilen, in JEDER Ebene (35/37/38/42/47) ·
   Glas 5 cm VOR der Wand, waagrecht wie senkrecht (40/43) · Wand und Zierglied
   im Hellwert trennen (37/41) · mehrere Dinge um den Ursprung verteilen (42) ·
   `kegel()` setzt die MITTE auf z (46) · gekippte Koerper brauchen Aufschlag
   (38/42/45) · tangential heisst ry = -(a + pi/2) (37/46).
"""
import os, math
import th_werkzeug as W
from th_werkzeug import (bpy, bmesh, neu, mat, mat_bild, leucht, box, zyl, kugel,
                         kegel, scheibe, flach, dreh, rohr, bogen_pkt, volute_pkt,
                         strebe, kranz, runden, export, keil_y, rad, TAU)

def _mats():
    return {
      "wand":  mat_bild("MkWand", "hausputz.png", (0.78,0.72,0.58), 0.88, 0.0, True),
      "wand2": mat("MkWand2",  (0.60,0.54,0.42), 0.88),
      "stein": mat("MkStein",  (0.95,0.94,0.91), 0.84),
      "sockel":mat("MkSockel", (0.44,0.42,0.38), 0.90),
      "dach":  mat("MkDach",   (0.40,0.22,0.18), 0.76),
      "dach2": mat("MkDach2",  (0.29,0.16,0.13), 0.78),
      "holz":  mat("MkHolz",   (0.46,0.30,0.17), 0.86),
      "holz2": mat("MkHolz2",  (0.66,0.50,0.30), 0.86),
      "stahl": mat("MkStahl",  (0.54,0.56,0.60), 0.42, 0.60),
      "kupfer":mat("MkKupfer", (0.24,0.52,0.44), 0.52, 0.35),
      "dunkel":mat("MkDunkel", (0.12,0.13,0.15), 0.68),
      "pflast":mat("MkPflast", (0.56,0.54,0.50), 0.95),
      "wasser":mat("MkWasser", (0.08,0.32,0.46), 0.42, 0.0),
      "rot":   mat("MkRot",    (0.66,0.20,0.16), 0.70),
      "gruen": mat("MkGruen",  (0.18,0.42,0.22), 0.86),
      "gelb":  mat("MkGelb",   (0.84,0.68,0.16), 0.70),
      "orange":mat("MkOrange", (0.86,0.48,0.10), 0.74),
      "weiss": mat("MkWeiss",  (0.93,0.93,0.90), 0.62),
      "glas":  mat("MkGlas",   (0.18,0.26,0.32), 0.14, 0.20),
      "licht": leucht("MkLicht", (1.00,0.93,0.74), 1.2),
    }

def _modul(name, bauer, bevel=0.012):
    neu(); bauer(); export(name, bevel, 2)

def _rahmen(x, yf, z, b, h, st, m, mat_="stein"):
    """Vier Balken um eine Oeffnung, von der MITTE gerechnet."""
    box(x, yf, z + h/2 - st/2, b, 0.07, st, m[mat_])
    box(x, yf, z - h/2 + st/2, b, 0.07, st, m[mat_])
    for s in (-1, 1):
        box(x + s*(b/2 - st/2), yf, z, st, 0.07, h - 2*st, m[mat_])

def _fenster(x, z, br, ho, m, yw, felder=2):
    box(x, yw + 0.02, z, br, 0.06, ho, m["glas"])
    box(x, yw + 0.035, z, 0.05, 0.06, ho - 0.04, m["stein"])
    for k in range(1, felder):
        box(x, yw + 0.035, z - ho/2 + ho*k/felder, br - 0.03, 0.06, 0.045, m["stein"])
    _rahmen(x, yw + 0.05, z, br + 0.16, ho + 0.16, 0.11, m)
    box(x, yw + 0.08, z - ho/2 - 0.13, br + 0.30, 0.15, 0.09, m["stein"])

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

def _plane(x, y, z, br, tf, m, mat_="rot", streifen="weiss", n=7, neig=0.26):
    """Marktplane: gestreiftes Schraegdach ueber dem Stand.

    ⚠️ Die Plane ist um `neig` gekippt. Ihre senkrechte Ausdehnung ist damit
    tf*sin + d*cos — der Aufschlag, den gekippte Koerper seit Charge 38 brauchen,
    ist hier in `z` schon eingerechnet."""
    pl = box(x, y, z, br, tf, 0.06, m[mat_])
    pl.rotation_euler[0] = neig
    for k in range(n):
        st = box(x - br/2 + br*(k + 0.5)/n, y, z + 0.035, br/n*0.46, tf, 0.05,
                 m[streifen])
        st.rotation_euler[0] = neig
    return pl

# ================================================================ 1) Markthalle
def _b_markthalle():
    """Markthalle, 22,4 x 14,4 x 12,6 m. Offene Arkaden auf +y.

    ⚠️ Die Arkaden sind BOEGEN aus `rohr()` auf Pfeilern, keine rechteckigen
    Durchgaenge: der Rundbogen ist das, was eine Markthalle von einer Lagerhalle
    unterscheidet."""
    m = _mats()
    B, T, H = 20.60, 12.60, 6.80
    box(0, 0, 0.32, B + 1.2, T + 1.2, 0.64, m["sockel"])
    box(0, 0, 0.82, B + 0.7, T + 0.7, 0.36, m["stein"])
    # Umlaufende Pfeiler statt geschlossener Waende
    NP = 6
    for k in range(NP + 1):
        xx = -B/2 + B*k/NP
        for s in (-1, 1):
            box(xx, s*(T/2 - 0.35), H/2 + 1.00, 1.10, 0.70, H, m["wand"])
            box(xx, s*(T/2 - 0.35), H/2 + 1.06, 1.24, 0.78, H - 0.5, m["stein"])
    for s in (-1, 1):
        for k in range(3):
            yy = -T/2 + 0.35 + (T - 0.70)*k/2
            box(s*(B/2 - 0.35), yy, H/2 + 1.00, 0.70, 1.10, H, m["wand"])
            box(s*(B/2 - 0.35), yy, H/2 + 1.06, 0.78, 1.24, H - 0.5, m["stein"])
    # Rundboegen zwischen den Pfeilern
    for k in range(NP):
        x0 = -B/2 + B*k/NP + 0.62
        x1 = -B/2 + B*(k + 1)/NP - 0.62
        for s in (-1, 1):
            rohr(bogen_pkt(x0, x1, 4.90, (x1 - x0)*0.46, 11), 0.22, m["stein"], 10,
                 True, "Bogen")
            box((x0 + x1)/2, s*(T/2 - 0.35), 5.90, x1 - x0, 0.74, 1.90, m["wand2"])
    box(0, 0, H + 1.10, B + 0.9, T + 0.9, 0.34, m["stein"])         # Hauptgesims
    box(0, 0, H + 0.84, B + 0.6, T + 0.6, 0.20, m["stein"])
    # Innenraum: Boden und Staender
    flach(box(0, 0, 1.02, B - 1.6, T - 1.6, 0.06, m["pflast"]))
    for k in range(3):
        for s in (-1, 1):
            box(-6.0 + k*6.0, s*2.4, 1.50, 3.20, 1.10, 0.90, m["holz2"])
            box(-6.0 + k*6.0, s*2.4, 1.98, 3.40, 1.30, 0.08, m["holz"])
    _satteldach(B, T, 3.60, H + 1.24, m, 0.90)
    # Dachreiter mit Uhr
    TZ = H + 1.24 + 2.30
    box(0, 0, TZ + 0.70, 2.60, 2.60, 1.40, m["wand"])
    for s in (-1, 1):
        for q in (-1, 1):
            box(s*1.16, q*1.16, TZ + 0.76, 0.28, 0.28, 1.52, m["stein"])
    for s in (-1, 1):
        flach(zyl(0, s*1.34, TZ + 0.80, 0.62, 0.10, m["stein"], 20, (math.pi/2, 0, 0)))
        flach(zyl(0, s*1.40, TZ + 0.80, 0.50, 0.05, m["licht"], 20, (math.pi/2, 0, 0)))
        for k in range(12):
            a = TAU*k/12
            flach(zyl(math.cos(a)*0.41, s*1.44, TZ + 0.80 + math.sin(a)*0.41,
                      0.028, 0.03, m["dunkel"], 6, (math.pi/2, 0, 0)))
        for lg, aw in ((0.28, 1.05), (0.38, 2.70)):
            zg = box(math.cos(aw)*lg/2, s*1.46, TZ + 0.80 + math.sin(aw)*lg/2,
                     lg, 0.04, 0.05, m["dunkel"])
            zg.rotation_euler[1] = -aw
    box(0, 0, TZ + 1.50, 3.00, 3.00, 0.22, m["stein"])
    flach(kegel(0, 0, TZ + 2.42, 2.00, 0.0, 1.62, m["kupfer"], 8))
    flach(zyl(0, 0, TZ + 3.50, 0.06, 0.60, m["kupfer"], 8))
    flach(kugel(0, 0, TZ + 3.88, 0.16, m["kupfer"], 8))

def markthalle(): _modul("th48_markthalle", _b_markthalle)

# ================================================================ 2) Marktstand
def _b_marktstand():
    """Marktstand mit Plane, Raster 4,00 m, 2,60 m hoch. Verkaufsseite auf +y."""
    m = _mats()
    BR, T = 3.60, 1.80
    for sx in (-1, 1):                                              # Gestell
        for sy in (-1, 1):
            flach(zyl(sx*(BR/2 - 0.12), sy*(T/2 - 0.10), 1.10, 0.05, 2.20,
                      m["stahl"], 8))
    for sy in (-1, 1):
        flach(zyl(0, sy*(T/2 - 0.10), 2.16, 0.045, BR - 0.24, m["stahl"], 8,
                  (0, math.pi/2, 0)))
    box(0, -0.10, 0.92, BR - 0.20, T - 0.30, 0.08, m["holz2"])      # Ladentisch
    for sx in (-1, 1):
        box(sx*(BR/2 - 0.30), -0.10, 0.46, 0.10, T - 0.40, 0.84, m["holz"])
    box(0, -0.10 - (T - 0.30)/2 - 0.03, 0.62, BR - 0.20, 0.06, 0.56, m["holz"])
    for k in range(4):                                              # Kisten unter dem Tisch
        box(-1.20 + k*0.80, -0.10, 0.24, 0.62, 0.48, 0.44, m["holz2"])
    _plane(0, 0.10, 2.34, BR + 0.30, T + 0.50, m, "rot", "weiss", 7, 0.24)
    for k in range(9):                                              # Volant
        box(-BR/2 - 0.10 + k*(BR + 0.20)/8, 0.10 + (T + 0.50)/2 - 0.02, 2.05,
            (BR + 0.20)/8*0.52, 0.05, 0.30, m["rot"] if k % 2 else m["weiss"])
    box(0, 0.10 - (T + 0.50)/2, 2.58, BR + 0.30, 0.06, 0.26, m["holz"])
    for k in range(3):                                              # Waren auf dem Tisch
        flach(kugel(-1.00 + k*1.00, -0.10, 1.06, 0.16, m["orange"], 7))
        flach(kugel(-1.00 + k*1.00 + 0.34, -0.28, 1.04, 0.13, m["gruen"], 7))
    box(1.35, -0.10, 1.10, 0.30, 0.30, 0.28, m["stahl"])            # Waage
    flach(zyl(1.35, -0.10, 1.28, 0.20, 0.03, m["stahl"], 14))

def marktstand(): _modul("th48_marktstand", _b_marktstand, 0.006)

# ================================================================ 3) Obststand
def _b_obststand():
    """Obst- und Gemuesestand mit Schraegauslage, Raster 4,00 m, 2,60 m hoch.

    ⚠️ Die Auslage ist SCHRAEG — das ist der Unterschied zum Marktstand mit
    ebenem Tisch, und der Grund, warum man die Ware von vorn sieht."""
    m = _mats()
    BR, T = 3.60, 1.90
    for sx in (-1, 1):
        for sy in (-1, 1):
            flach(zyl(sx*(BR/2 - 0.12), sy*(T/2 - 0.10), 1.10, 0.05, 2.20,
                      m["stahl"], 8))
    for sy in (-1, 1):
        flach(zyl(0, sy*(T/2 - 0.10), 2.16, 0.045, BR - 0.24, m["stahl"], 8,
                  (0, math.pi/2, 0)))
    au = box(0, -0.15, 1.02, BR - 0.20, 1.30, 0.07, m["holz2"])     # Schraegauslage
    au.rotation_euler[0] = -0.38
    for sx in (-1, 1):
        box(sx*(BR/2 - 0.28), -0.15, 0.50, 0.10, 1.20, 0.92, m["holz"])
    for k in range(4):                                              # Steigen mit Ware
        xx = -1.28 + k*0.86
        kz = 1.16 + (k % 2)*0.02
        ki = box(xx, -0.15, kz, 0.72, 1.05, 0.16, m["holz"])
        ki.rotation_euler[0] = -0.38
        farbe = (m["orange"], m["gruen"], m["rot"], m["gelb"])[k]
        for q in range(6):
            fx = xx - 0.24 + (q % 3)*0.24
            fy = -0.36 + (q//3)*0.34
            flach(kugel(fx, fy, kz + 0.16 + (q//3)*0.13, 0.11, farbe, 6))
    _plane(0, 0.14, 2.36, BR + 0.30, T + 0.50, m, "gruen", "weiss", 7, 0.26)
    for k in range(4):                                              # Preisschilder
        box(-1.28 + k*0.86, -0.72, 1.02, 0.30, 0.04, 0.20, m["weiss"])
        box(-1.28 + k*0.86, -0.74, 1.02, 0.24, 0.03, 0.13, m["dunkel"])
    for k in range(3):                                              # Saecke davor
        flach(dreh([(0.00, 0.00), (0.22, 0.02), (0.24, 0.26), (0.16, 0.44),
                    (0.10, 0.50), (0.00, 0.52)], m["holz2"], 12,
                   x=-1.10 + k*1.10, y=-1.05, name="Sack"))

def obststand(): _modul("th48_obststand", _b_obststand, 0.006)

# ================================================================ 4) Marktbrunnen
def _b_brunnen():
    """Marktbrunnen, 3,8 x 3,8 x 3,4 m — achteckiges Becken, Saeule, Wasserschale.

    ⚠️ Der Beckenrand ist ein RING aus acht Balken um die Wasserflaeche, keine
    volle Platte darueber: dieselbe Lehre wie der Poolrand in Charge 47, nur
    achteckig."""
    m = _mats()
    R = 1.70
    for k in range(8):                                              # Beckenrand
        a = TAU*k/8 + TAU/16
        rw = box(math.cos(a)*R, math.sin(a)*R, 0.30, 2*R*math.tan(math.pi/8), 0.30, 0.60,
                 m["stein"])
        rw.rotation_euler[2] = a + math.pi/2
    flach(zyl(0, 0, 0.06, R - 0.05, 0.12, m["sockel"], 8))          # Beckenboden
    flach(zyl(0, 0, 0.34, R - 0.20, 0.36, m["wasser"], 8))          # Wasser
    flach(dreh([(0.00, 0.00), (0.62, 0.00), (0.58, 0.16), (0.34, 0.30),
                (0.28, 1.10), (0.34, 1.28), (0.30, 1.40), (0.22, 1.52),
                (0.00, 1.56)], m["stein"], 16, z=0.44, name="Saeule"))
    flach(dreh([(0.00, 0.00), (0.86, 0.10), (0.90, 0.24), (0.80, 0.30),
                (0.16, 0.22), (0.00, 0.20)], m["stein"], 20, z=1.94, name="Schale"))
    flach(zyl(0, 0, 2.16, 0.72, 0.06, m["wasser"], 20))
    flach(dreh([(0.00, 0.00), (0.22, 0.04), (0.18, 0.30), (0.12, 0.52),
                (0.00, 0.60)], m["stein"], 14, z=2.24, name="Aufsatz"))
    flach(kugel(0, 0, 2.94, 0.20, m["kupfer"], 10))
    for k in range(4):                                              # Wasserspeier
        a = TAU*k/4 + TAU/8
        flach(zyl(math.cos(a)*0.30, math.sin(a)*0.30, 1.72, 0.055, 0.34, m["kupfer"],
                  8, (math.pi/2, 0, a + math.pi/2)))
        for q in range(4):                                          # Strahl
            flach(zyl(math.cos(a)*(0.52 + q*0.10), math.sin(a)*(0.52 + q*0.10),
                      1.66 - q*0.16, 0.022, 0.20, m["wasser"], 5,
                      (0.42*math.sin(a), -0.42*math.cos(a), 0)))

def brunnen(): _modul("th48_brunnen", _b_brunnen, 0.008)

# ================================================================ 5) Litfasssaeule
def _b_litfass():
    """Litfasssaeule, 1,5 x 1,5 x 3,5 m — Plakatflaeche, Zierdach, Sockel."""
    m = _mats()
    flach(dreh([(0.00, 0.00), (0.62, 0.00), (0.60, 0.12), (0.52, 0.22),
                (0.50, 2.62), (0.56, 2.72), (0.54, 2.84)],
               m["dunkel"], 20, name="Saeule"))
    for k in range(3):                                              # Plakate
        a0 = TAU*k/3 + 0.18
        for q in range(5):
            a = a0 + q*0.115
            pl = box(math.cos(a)*0.515, math.sin(a)*0.515, 1.42, 0.12, 0.06, 1.70,
                     (m["rot"], m["gelb"], m["gruen"])[k])
            pl.rotation_euler[2] = a
    box(0, 0, 0.14, 1.10, 1.10, 0.28, m["sockel"])
    flach(zyl(0, 0, 2.90, 0.72, 0.12, m["stein"], 20))
    flach(kegel(0, 0, 3.14, 0.74, 0.10, 0.36, m["kupfer"], 20))
    flach(zyl(0, 0, 3.40, 0.05, 0.24, m["kupfer"], 8))
    flach(kugel(0, 0, 3.56, 0.11, m["kupfer"], 8))

def litfass(): _modul("th48_litfass", _b_litfass, 0.006)

# ================================================================ 6) Marktwaage
def _b_marktwaage():
    """Waagehaeuschen, 3,4 x 3,4 x 4,2 m — offener Pavillon mit Zeltdach und
    Waagebalken. Schalter auf +y."""
    m = _mats()
    R, H = 1.40, 2.50
    box(0, 0, 0.10, 3.10, 3.10, 0.20, m["sockel"])
    box(0, 0, 0.26, 2.90, 2.90, 0.12, m["pflast"])
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(sx*R, sy*R, H/2 + 0.32, 0.22, 0.22, H, m["stein"])
    # Bruestung auf drei Seiten, vorn offen
    for sy, sx in ((-1, 0), (0, -1), (0, 1)):
        box(sx*R, sy*R, 0.92, (2*R if sy else 0.20), (0.20 if sy else 2*R), 1.08,
            m["wand"])
        box(sx*R, sy*R, 1.50, (2*R + 0.2 if sy else 0.28), (0.28 if sy else 2*R + 0.2),
            0.10, m["stein"])
    box(0, R, 1.86, 2*R, 0.16, 0.10, m["stein"])                    # Sturz vorn
    box(0, 0, H + 0.44, 2*R + 0.70, 2*R + 0.70, 0.16, m["stein"])   # Traufkranz
    # Hier ist der gedrehte Vierkant-Kegel AUSNAHMSWEISE richtig: der Pavillon ist
    # quadratisch (3,50 x 3,50), und genau dann faellt die zwangslaeufig
    # quadratische Bounding-Box mit dem gewuenschten Grundriss zusammen. Bei einem
    # rechteckigen Bau ginge es nicht — siehe das Villendach in Charge 47.
    flach(kegel(0, 0, H + 1.14, 1.60, 0.0, 1.24, m["dach"], 4, rot=(0, 0, math.pi/4)))
    flach(zyl(0, 0, H + 1.90, 0.05, 0.34, m["kupfer"], 8))
    flach(kugel(0, 0, H + 2.12, 0.12, m["kupfer"], 8))
    # Waagebalken mit zwei Schalen
    flach(zyl(0, 0, 1.62, 0.06, 1.10, m["stahl"], 10))
    box(0, 0, 2.16, 1.90, 0.07, 0.07, m["stahl"])
    for s in (-1, 1):
        flach(zyl(s*0.90, 0, 1.98, 0.02, 0.36, m["stahl"], 6))
        flach(dreh([(0.00, 0.00), (0.30, 0.06), (0.32, 0.12), (0.00, 0.14)],
                   m["stahl"], 14, x=s*0.90, z=1.74, name="Schale"))
    box(0, -R + 0.10, 0.94, 1.60, 0.10, 0.70, m["holz2"])           # Ladentisch hinten

def marktwaage(): _modul("th48_marktwaage", _b_marktwaage, 0.008)

# ================================================================ 7) Handkarren
def _b_handkarren():
    """Handkarren mit Kisten, 2,6 x 1,3 x 1,4 m. Deichsel auf +x."""
    m = _mats()
    box(-0.10, 0, 0.68, 1.70, 1.00, 0.08, m["holz2"])               # Ladeflaeche
    for k in range(5):
        box(-0.78 + k*0.34, 0, 0.72, 0.22, 1.00, 0.05, m["holz"])
    for s in (-1, 1):                                               # Bordwaende
        box(-0.10, s*0.50, 0.88, 1.70, 0.06, 0.32, m["holz"])
    box(-0.95, 0, 0.88, 0.06, 1.00, 0.32, m["holz"])
    for s in (-1, 1):                                               # Raeder
        rad(-0.30, s*0.58, 0.42, 0.42, 0.10, m["holz2"], m["holz"], m["stahl"], 8)
    box(-0.30, 0, 0.42, 0.12, 1.30, 0.12, m["holz"])                # Achse
    strebe((0.72, 0, 0.68), (1.26, 0, 0.86), 0.06, m["holz"])       # Deichsel
    flach(zyl(1.34, 0, 0.88, 0.035, 0.52, m["holz"], 8, (math.pi/2, 0, 0)))
    for s in (-1, 1):                                               # Stuetzbein
        strebe((0.62, s*0.30, 0.64), (0.72, s*0.30, 0.04), 0.05, m["holz"])
    for k in range(3):                                              # Kisten
        kx = -0.72 + k*0.62
        box(kx, ((k % 2) - 0.5)*0.24, 0.94, 0.54, 0.44, 0.36, m["holz2"])
        for q in range(3):
            box(kx, ((k % 2) - 0.5)*0.24, 0.94, 0.06, 0.46, 0.36, m["holz"])
        if k == 1:
            for q in range(5):
                flach(kugel(kx - 0.16 + (q % 3)*0.16, ((k % 2) - 0.5)*0.24 + (q//3)*0.18,
                            1.16, 0.10, m["rot"], 6))

def handkarren(): _modul("th48_handkarren", _b_handkarren, 0.006)

# ================================================================ 8) Baumscheibe
def _b_baumscheibe():
    """Baum mit Rundbank und Gitterrost, 3,6 x 3,6 x 6,2 m.

    Auf einem Marktplatz steht kein Baum ohne Scheibe: Rost, Bank und Poller
    gehoeren dazu."""
    m = _mats()
    flach(zyl(0, 0, 0.05, 1.30, 0.10, m["sockel"], 16))             # Baumscheibe
    for k in range(16):                                             # Gitterrost
        a = TAU*k/16
        gr = box(math.cos(a)*0.72, math.sin(a)*0.72, 0.11, 1.16, 0.07, 0.05, m["stahl"])
        gr.rotation_euler[2] = -(a + math.pi/2)
    flach(zyl(0, 0, 2.20, 0.22, 4.40, m["holz"], 12))               # Stamm
    for k in range(3):
        st = strebe((0, 0, 3.10 + k*0.50), (math.cos(TAU*k/3)*0.90,
                    math.sin(TAU*k/3)*0.90, 3.90 + k*0.40), 0.09, m["holz"])
    for k in range(6):                                              # Krone
        a = TAU*k/6
        flach(kugel(math.cos(a)*0.70, math.sin(a)*0.70, 4.70 + (k % 2)*0.30,
                    0.95, m["gruen"], 8))
    flach(kugel(0, 0, 5.30, 1.05, m["gruen"], 8))
    for k in range(6):                                              # Rundbank
        a = TAU*k/6 + TAU/12
        bk = box(math.cos(a)*1.52, math.sin(a)*1.52, 0.46,
                 2*1.52*math.tan(math.pi/6)*0.86, 0.42, 0.06, m["holz2"])
        bk.rotation_euler[2] = a + math.pi/2
        for q in (-1, 1):
            bx = math.cos(a)*1.52 - math.sin(a)*q*0.52
            by = math.sin(a)*1.52 + math.cos(a)*q*0.52
            box(bx, by, 0.22, 0.10, 0.38, 0.44, m["stahl"])

def baumscheibe(): _modul("th48_baumscheibe", _b_baumscheibe, 0.008)

# ================================================================ 9) Marktplatz
def _teil(fn, px, py, rot=0.0, pz=0.0):
    vor = set(bpy.context.scene.objects)
    fn()
    for o in bpy.context.scene.objects:
        if o in vor: continue
        o.rotation_euler[2] += rot
        o.location = (px + math.cos(rot)*o.location[0] - math.sin(rot)*o.location[1],
                      py + math.sin(rot)*o.location[0] + math.cos(rot)*o.location[1],
                      pz + o.location[2])

def _b_marktplatz():
    """Massstabs-Test: Platz mit Halle, Staenden und Brunnen, 44 x 34 m."""
    m = _mats()
    flach(box(0, 0, 0.004, 44.0, 34.0, 0.008, m["pflast"]))
    _teil(_b_markthalle,  -8.0, 8.0)
    _teil(_b_brunnen,     11.0, 6.0)
    for k in range(4):
        _teil(_b_marktstand, -14.0 + k*4.0, -6.0)
    for k in range(3):
        _teil(_b_obststand,   4.0 + k*4.0, -6.0)
    for k in range(4):
        _teil(_b_marktstand, -12.0 + k*4.0, -13.0, math.pi)
    _teil(_b_marktwaage,  15.0, -3.0)
    _teil(_b_litfass,    -18.0, -2.0)
    _teil(_b_handkarren,   0.0, -10.0, 0.5)
    _teil(_b_baumscheibe, 17.0, 10.0)
    _teil(_b_baumscheibe, -19.0, 12.0)
    export("th48_marktplatz", 0.012, 2)

def marktplatz(): neu(); _b_marktplatz()

if __name__ == "__main__":
    print("Asset-Charge 48 (th48, Marktplatz):")
    for fn in (markthalle, marktstand, obststand, brunnen, litfass, marktwaage,
               handkarren, baumscheibe, marktplatz):
        fn()
    print("fertig")
