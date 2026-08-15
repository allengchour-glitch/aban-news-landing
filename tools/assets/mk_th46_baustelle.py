# -*- coding: utf-8 -*-
"""Asset-Charge 46 (th46_*): BAUSTELLE.

Die Baustelle bei (-30|102) ist der letzte Ort, an dem noch Quader Bauteile
darstellen: der Turmdrehkran ist ein Balken auf einem Balken, der Rohbau eine
Kiste mit drei Platten darin, der Bauzaun sieben durchscheinende Bretter.

Konventionen wie th5-th45 (siehe models/TH5-ASSETS.md), Werkzeug aus th_werkzeug.py:
  * Ursprung mittig, Unterkante exakt z = 0, Meter, PBR-Materialien.
  * Schauseite (Gitterfeld, Kabine, Schaufel) auf Blender +y -> three.js -z.
  * FAHRZEUGE: Front auf +x.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT.

RASTER: th46_bauzaun laeuft auf x += 3,50, th46_geruest auf x += 2,50.

⚠️ DREHACHSE DES KRANS. Der Ausleger sitzt so im Modell, dass er sich im Spiel um
   die MASTACHSE (x = 0, y = 0) drehen laesst — Ausleger auf +y, Gegenausleger auf
   -y, beide mittig ueber dem Mast. Wer ihn woanders aufhaengt, laesst ihn
   eiern.

⚠️ Angewandte Regeln: Koerper statt Platten per `keil_y` (41/44) · Glas VOR der
   Flaeche, waagrecht wie senkrecht (40/43) · Rahmen aus vier Balken, von der
   Mitte gerechnet (35/37/38/42/44) · Hellwertabstand (37/41) · mehrere Dinge um
   den Ursprung verteilen (42) · Bodenmarkierung an den ORT (43) · gekippte
   Koerper brauchen Aufschlag (38/42/45).
"""
import os, math
import th_werkzeug as W
from th_werkzeug import (bpy, bmesh, neu, mat, mat_bild, leucht, box, zyl, kugel,
                         kegel, scheibe, flach, dreh, rohr, bogen_pkt, volute_pkt,
                         strebe, kranz, runden, export, keil_y, rad, TAU)

def _mats():
    return {
      "gelb":  mat("BsGelb",   (0.82,0.62,0.08), 0.55, 0.20),
      "gelb2": mat("BsGelb2",  (0.62,0.46,0.06), 0.60, 0.20),
      "beton": mat("BsBeton",  (0.60,0.59,0.56), 0.94),
      "beton2":mat("BsBeton2", (0.42,0.41,0.39), 0.95),
      "stein": mat("BsStein",  (0.93,0.92,0.89), 0.84),
      "stahl": mat("BsStahl",  (0.56,0.58,0.62), 0.42, 0.60),
      "stahl2":mat("BsStahl2", (0.30,0.32,0.36), 0.50, 0.55),
      "dunkel":mat("BsDunkel", (0.12,0.13,0.15), 0.68),
      "rost":  mat("BsRost",   (0.44,0.26,0.15), 0.88),
      "holz":  mat("BsHolz",   (0.60,0.44,0.24), 0.88),
      "ziegel":mat("BsZiegel", (0.64,0.30,0.20), 0.90),
      "sand":  mat("BsSand",   (0.72,0.62,0.42), 0.96),
      "erde":  mat("BsErde",   (0.36,0.28,0.20), 0.97),
      "blau":  mat("BsBlau",   (0.16,0.34,0.56), 0.66),
      "rot":   mat("BsRot",    (0.70,0.20,0.14), 0.66),
      "reifen":mat("BsReifen", (0.07,0.07,0.08), 0.90),
      "glas":  mat("BsGlas",   (0.16,0.24,0.30), 0.14, 0.20),
      "warn":  leucht("BsWarn",  (0.98,0.62,0.10), 1.4),
      "licht": leucht("BsLicht", (1.00,0.94,0.78), 1.3),
    }

def _modul(name, bauer, bevel=0.012):
    neu(); bauer(); export(name, bevel, 2)

def _rahmen(x, yf, z, b, h, st, m, mat_="stein"):
    """Vier Balken, von der MITTE gerechnet (Unterkante z - h/2)."""
    box(x, yf, z + h/2 - st/2, b, 0.07, st, m[mat_])
    box(x, yf, z - h/2 + st/2, b, 0.07, st, m[mat_])
    for s in (-1, 1):
        box(x + s*(b/2 - st/2), yf, z, st, 0.07, h - 2*st, m[mat_])

def _fachwerk(x, y, z0, z1, br, m, mat_="gelb", d=0.075, n=None):
    """Gitterschuss: vier Gurte, waagrechte Riegel, Diagonalen.

    ⚠️ Ein Gittermast aus vier Staeben ohne Riegel liest sich als Besenstiel-
    Buendel. Die Diagonalen sind der Unterschied zwischen Stab und Fachwerk."""
    h = z1 - z0
    n = n if n else max(2, int(h/br))
    for sx in (-1, 1):
        for sy in (-1, 1):
            flach(zyl(x + sx*br/2, y + sy*br/2, (z0 + z1)/2, d, h, m[mat_], 6))
    for k in range(n + 1):
        zz = z0 + h*k/n
        for sx in (-1, 1):
            box(x + sx*br/2, y, zz, d*1.2, br, d*1.2, m[mat_])
            box(x, y + sx*br/2, zz, br, d*1.2, d*1.2, m[mat_])
    for k in range(n):
        zz = z0 + h*(k + 0.5)/n
        for sx in (-1, 1):
            dg = box(x + sx*br/2, y, zz, d*1.1, math.hypot(br, h/n), d*1.1, m[mat_])
            dg.rotation_euler[0] = (1 if k % 2 else -1)*math.atan2(h/n, br)
            dg2 = box(x, y + sx*br/2, zz, math.hypot(br, h/n), d*1.1, d*1.1, m[mat_])
            dg2.rotation_euler[1] = (1 if k % 2 else -1)*math.atan2(h/n, br)

# ================================================================ 1) Turmdrehkran
def _b_baukran():
    """Turmdrehkran, 24,0 x 3,4 x 26,4 m. Ausleger auf +y, Gegenausleger auf -y.

    ⚠️ Der Ausleger liegt MITTIG ueber der Mastachse (x = 0, y = 0), damit das
    Spiel den ganzen Oberteil um genau diese Achse drehen kann. Wuerde er
    ausmittig sitzen, eierte er beim Schwenken.

    Und der Gegenausleger ist kein Zierrat: ohne ihn sieht ein Turmdrehkran aus,
    als kippe er nach vorn."""
    m = _mats()
    HM = 20.0
    _fachwerk(0, 0, 0.60, HM, 1.60, m, "gelb", 0.085, 13)
    box(0, 0, 0.30, 3.20, 3.20, 0.60, m["beton2"])                  # Fundamentkreuz
    for s in (-1, 1):
        box(s*1.30, 0, 0.42, 1.20, 3.00, 0.30, m["beton2"])
        box(0, s*1.30, 0.42, 3.00, 1.20, 0.30, m["beton2"])
    for k in range(28):                                             # Steigleiter
        box(0.55, 0, 1.20 + k*0.66, 0.42, 0.035, 0.035, m["stahl"])
    # Drehkranz und Turmkopf
    flach(zyl(0, 0, HM + 0.30, 1.10, 0.60, m["stahl2"], 16))
    box(0, 0, HM + 1.00, 1.90, 1.90, 0.80, m["gelb2"])
    _fachwerk(0, 0, HM + 1.40, HM + 5.20, 1.10, m, "gelb", 0.060, 4)
    flach(zyl(0, 0, HM + 5.45, 0.10, 0.50, m["stahl"], 8))
    # Ausleger auf +y
    LA = 16.0
    for s in (-1, 1):
        flach(zyl(s*0.62, 1.10 + LA/2, HM + 1.30, 0.075, LA, m["gelb"], 6,
                  (math.pi/2, 0, 0)))
    flach(zyl(0, 1.10 + LA/2, HM + 2.10, 0.075, LA, m["gelb"], 6, (math.pi/2, 0, 0)))
    for k in range(16):
        yy = 1.30 + k*LA/16
        box(0, yy, HM + 1.70, 1.30, 0.07, 0.90, m["gelb"])
        dg = box(0, yy + LA/32, HM + 1.70, 1.30, 0.07, math.hypot(0.80, LA/16))
        dg.data.materials.append(m["gelb"]); dg.rotation_euler[0] = 0.90
    # Gegenausleger auf -y mit Ballast und Maschinenhaus
    LG = 6.20
    for s in (-1, 1):
        flach(zyl(s*0.62, -1.10 - LG/2, HM + 1.30, 0.075, LG, m["gelb"], 6,
                  (math.pi/2, 0, 0)))
    for k in range(6):
        box(0, -1.30 - k*LG/6, HM + 1.60, 1.30, 0.07, 0.70, m["gelb"])
    box(0, -LG - 0.40, HM + 1.55, 2.20, 1.70, 1.50, m["beton2"])    # Ballast
    box(0, -2.60, HM + 2.35, 1.90, 2.00, 1.50, m["stein"])          # Maschinenhaus
    box(0, -1.62, HM + 2.55, 1.50, 0.10, 0.80, m["glas"])
    _rahmen(0, -1.56, HM + 2.55, 1.62, 0.92, 0.10, m, "stahl2")
    # Abspannungen vom Turmkopf
    for zz, yy in ((HM + 5.10, 1.10 + LA*0.55), (HM + 5.10, 1.10 + LA*0.95)):
        strebe((0, 0.20, zz), (0, yy, HM + 2.20), 0.055, m["stahl2"])
    strebe((0, -0.20, HM + 5.10), (0, -LG - 0.30, HM + 2.30), 0.055, m["stahl2"])
    # Fuehrerkabine unter dem Drehkranz
    box(1.55, 0.60, HM + 0.70, 1.30, 1.50, 1.60, m["stein"])
    box(1.55, 1.38, HM + 0.85, 1.10, 0.10, 1.10, m["glas"])
    _rahmen(1.55, 1.44, HM + 0.85, 1.22, 1.22, 0.10, m, "stahl2")
    flach(zyl(0, 1.10 + LA - 0.80, HM + 6.35, 0.11, 0.34, m["warn"], 10))

def baukran(): _modul("th46_baukran", _b_baukran, 0.008)

# ================================================================ 2) Rohbau
def _b_rohbau():
    """Rohbau, 12,4 x 9,4 x 10,2 m — drei Geschossdecken, Stuetzen, Schalung,
    Bewehrung. Offene Seite auf +y.

    ⚠️ Ein Rohbau ist OFFEN. Als geschlossene Kiste mit Platten darin sieht man
    nichts von dem, was ihn ausmacht — Decken, Stuetzen und die Bewehrung, die
    oben herausschaut."""
    m = _mats()
    B, T, ET = 11.60, 8.60, 3.20
    box(0, 0, 0.22, B + 0.8, T + 0.8, 0.44, m["beton2"])            # Fundamentplatte
    for e in range(3):                                              # Geschossdecken
        zz = 0.44 + (e + 1)*ET
        box(0, 0, zz, B, T, 0.28, m["beton"])
        box(0, 0, zz + 0.14, B + 0.30, T + 0.30, 0.06, m["beton2"]) # Deckenrand
        for s in (-1, 1):                                           # Absturzsicherung
            box(0, s*(T/2 + 0.12), zz + 0.72, B, 0.07, 0.07, m["rot"])
            box(0, s*(T/2 + 0.12), zz + 1.16, B, 0.07, 0.07, m["stein"])
            box(s*(B/2 + 0.12), 0, zz + 0.72, 0.07, T, 0.07, m["rot"])
            box(s*(B/2 + 0.12), 0, zz + 1.16, 0.07, T, 0.07, m["stein"])
        for k in range(6):
            box(-B/2 + 0.4 + k*(B - 0.8)/5, T/2 + 0.12, zz + 0.70, 0.08, 0.08, 1.40,
                m["stahl"])
    for e in range(3):                                              # Stuetzen
        z0 = 0.44 + e*ET
        for sx in (-1, 1):
            for k in range(3):
                yy = -T/2 + 0.60 + k*(T - 1.2)/2
                box(sx*(B/2 - 0.55), yy, z0 + ET/2, 0.42, 0.42, ET, m["beton"])
        for k in range(2):
            box((k - 0.5)*3.6, -T/2 + 0.60, z0 + ET/2, 0.42, 0.42, ET, m["beton"])
    for s in (-1, 1):                                               # Aussenwaende (2 Seiten)
        box(s*(B/2 - 0.14), 0, 0.44 + 1.5*ET, 0.28, T, 3*ET, m["beton"])
    box(0, -T/2 + 0.14, 0.44 + 1.5*ET, B, 0.28, 3*ET, m["beton"])
    for k in range(14):                                             # Bewehrung oben
        xx = -B/2 + 0.5 + k*(B - 1.0)/13
        flach(zyl(xx, ((k % 3) - 1)*2.4, 0.44 + 3*ET + 0.55, 0.025, 0.95,
                  m["rost"], 5))
    for s in (-1, 1):                                               # Schalungstafeln
        for k in range(3):
            box(s*(B/2 + 0.35), -2.4 + k*2.4, 1.30, 0.10, 2.10, 2.60, m["holz"])
    box(-B/2 - 0.35, T/2 - 1.2, 0.90, 0.12, 2.20, 1.80, m["holz"])
    for e in range(3):                                              # Treppenlauf
        z0 = 0.44 + e*ET
        tl = box(B/2 - 1.60, T/2 - 1.30, z0 + ET/2, 1.10, 3.20, 0.22, m["beton"])
        tl.rotation_euler[0] = -math.atan2(ET, 3.10)

def rohbau(): _modul("th46_rohbau", _b_rohbau)

# ================================================================ 3) Geruest
def _b_geruest():
    """Fassadengeruest, Raster 2,50 m, drei Lagen, 6,60 m hoch. Wandseite auf -y.

    ⚠️ Die Beläge sind Bohlen mit Fugen, keine durchgehende Platte: an den Fugen
    erkennt man, dass man auf Brettern steht."""
    m = _mats()
    BR, T, LA = 2.50, 1.10, 2.00
    for sy in (-1, 1):                                              # Stiele
        for sx in (-1, 1):
            flach(zyl(sx*(BR/2 - 0.06), sy*T/2, 3.30, 0.048, 6.60, m["stahl"], 8))
            flach(zyl(sx*(BR/2 - 0.06), sy*T/2, 0.05, 0.10, 0.10, m["stahl2"], 8))
    for e in range(3):                                              # Lagen
        zz = 0.30 + (e + 1)*LA
        for sy in (-1, 1):
            flach(zyl(0, sy*T/2, zz, 0.042, BR - 0.12, m["stahl"], 8, (0, math.pi/2, 0)))
        for sx in (-1, 1):
            flach(zyl(sx*(BR/2 - 0.06), 0, zz, 0.042, T, m["stahl"], 8, (math.pi/2, 0, 0)))
        for k in range(4):                                          # Bohlen
            box(0, -T/2 + 0.16 + k*0.26, zz + 0.05, BR - 0.18, 0.24, 0.05, m["holz"])
        flach(zyl(0, T/2, zz + 1.00, 0.038, BR - 0.12, m["stahl"], 8, (0, math.pi/2, 0)))
        flach(zyl(0, T/2, zz + 0.55, 0.038, BR - 0.12, m["stahl"], 8, (0, math.pi/2, 0)))
        box(0, T/2, zz + 0.20, BR - 0.14, 0.05, 0.20, m["holz"])    # Bordbrett
    dg = box(0, T/2, 1.60, math.hypot(BR, LA), 0.045, 0.045, m["stahl"])
    dg.rotation_euler[1] = -math.atan2(LA, BR)
    dg2 = box(0, T/2, 4.30, math.hypot(BR, LA), 0.045, 0.045, m["stahl"])
    dg2.rotation_euler[1] = math.atan2(LA, BR)
    for e in range(3):                                              # Wandanker
        box(0, -T/2 - 0.22, 0.30 + (e + 1)*LA, 0.06, 0.44, 0.06, m["stahl"])

def geruest(): _modul("th46_geruest", _b_geruest, 0.005)

# ================================================================ 4) Bauzaun
def _b_bauzaun():
    """Bauzaun-Element, Raster 3,50 m, 2,00 m hoch — Gitter in Rohrrahmen auf
    Betonfuessen.

    ⚠️ Das Gitter besteht aus Staeben, nicht aus einer durchscheinenden Platte:
    eine halbtransparente Flaeche liest sich als Milchglas, nicht als Bauzaun.
    Dieselbe Lehre wie beim Netz in Charge 44."""
    m = _mats()
    BR, H = 3.44, 2.00
    for s in (-1, 1):                                               # Rahmenrohre
        flach(zyl(s*(BR/2 - 0.03), 0, H/2 + 0.14, 0.035, H, m["stahl"], 8))
    for zz in (0.16, H + 0.12):
        flach(zyl(0, 0, zz, 0.035, BR - 0.06, m["stahl"], 8, (0, math.pi/2, 0)))
    for k in range(19):                                             # Senkrechte Staebe
        flach(zyl(-BR/2 + 0.14 + k*(BR - 0.28)/18, 0, H/2 + 0.14, 0.014, H - 0.10,
                  m["stahl"], 4))
    for k in range(6):                                              # Waagrechte Staebe
        flach(zyl(0, 0, 0.30 + k*(H - 0.30)/5.5, 0.014, BR - 0.10, m["stahl"], 4,
                  (0, math.pi/2, 0)))
    for s in (-1, 1):                                               # Betonfuesse
        box(s*(BR/2 - 0.20), 0, 0.07, 0.70, 0.32, 0.14, m["beton2"])
        for q in (-1, 1):
            box(s*(BR/2 - 0.20) + q*0.24, 0, 0.16, 0.10, 0.24, 0.08, m["beton2"])
    box(BR/2 - 0.80, 0.04, 1.45, 0.90, 0.05, 0.60, m["rot"])        # Warnschild
    box(BR/2 - 0.80, 0.07, 1.45, 0.76, 0.04, 0.46, m["stein"])

def bauzaun(): _modul("th46_bauzaun", _b_bauzaun, 0.005)

# ================================================================ 5) Bagger
def _b_bagger():
    """Kettenbagger, 6,65 x 2,82 x 3,84 m. Front (Ausleger) auf +x.

    Die Boxmitte liegt bei x +1,27: der Ausleger reicht nach vorn, und der
    Ursprung gehoert an die MASCHINE, nicht in die Mitte ihrer Bounding-Box —
    `bau()` setzt darueber, und ein Bagger soll dort stehen, wo man ihn hinstellt.
    Dieselbe Ausnahme wie beim Fahrleitungsmast in Charge 41.

    ⚠️ Die Kette ist ein Laufwerk, kein Balken: Umlenkrollen vorn und hinten,
    Laufrollen unten, Kettenglieder aussen herum. Ein glatter Quader liest sich
    als Kiste auf dem Boden."""
    m = _mats()
    KB, KL = 0.62, 4.00                                             # Kettenbreite, -laenge
    for s in (-1, 1):
        y = s*(1.05)
        for q in (-1, 1):                                           # Umlenkrollen
            flach(zyl(q*(KL/2 - 0.45), y, 0.60, 0.48, KB, m["stahl2"], 14,
                      (math.pi/2, 0, 0)))
        box(0, y, 0.60, KL - 0.90, KB, 0.96, m["stahl2"])
        for k in range(5):                                          # Laufrollen
            flach(zyl(-1.30 + k*0.65, y, 0.26, 0.20, KB + 0.06, m["dunkel"], 10,
                      (math.pi/2, 0, 0)))
        for k in range(22):                                         # Kettenglieder
            # ⚠️ Radius 0,60 um Mitte 0,52 heisst Unterkante 0,52-0,60-0,06 =
            # -0,14 — die Kette lief unter dem Boden durch. Die Kette umschlingt
            # die Rollen, ihre Unterkante ist also 0: Mitte 0,60, Radius 0,54,
            # halbe Gliedstaerke 0,06.
            a = TAU*k/22
            cx = math.cos(a)*(KL/2 - 0.45); cz = 0.60 + math.sin(a)*0.54
            # ⚠️ `rotation_euler[1] = -a` legte die lange Gliedachse RADIAL statt
            # tangential: unten am Umlauf stand das Glied hochkant und ragte 0,17
            # statt 0,06 nach unten. Ein um y mit ry gedrehter Quader legt seine
            # lange Achse auf (cos ry, -sin ry); tangential heisst (-sin a, cos a),
            # also ry = -(a + pi/2). Dieselbe Formel wie beim Radlauf in Charge 37.
            gl = box(cx, y, cz, 0.34, KB + 0.10, 0.12, m["dunkel"])
            gl.rotation_euler[1] = -(a + math.pi/2)
    box(0, 0, 1.20, 3.40, 2.20, 0.34, m["gelb2"])                   # Drehbuehne
    flach(zyl(0, 0, 1.44, 0.70, 0.22, m["stahl2"], 16))
    box(-0.30, 0, 1.95, 2.80, 2.10, 1.00, m["gelb"])                # Oberwagen
    box(-1.75, 0, 1.80, 0.60, 2.00, 0.90, m["gelb2"])               # Gegengewicht
    box(0.70, -0.55, 2.35, 1.50, 1.00, 1.80, m["gelb"])             # Kabine
    for s in (-1, 1):
        box(0.70, -0.55 + s*0.52, 2.45, 1.30, 0.06, 1.30, m["glas"])
        _rahmen(0.70, -0.55 + s*0.55, 2.45, 1.42, 1.42, 0.10, m, "stahl2")
    box(1.44, -0.55, 2.45, 0.06, 0.90, 1.30, m["glas"])
    # Ausleger, Stiel, Loeffel
    # ⚠️ Ausgestreckt zog der Ausleger die Boxmitte auf +1,85. Ein Bagger auf
    # einer Baustelle steht meist ANGEWINKELT — das ist nicht nur naeher am
    # Ursprung, es sieht auch nach Pause aus statt nach Standbild im Aushub.
    al = box(1.85, 0.55, 2.75, 2.60, 0.42, 0.55, m["gelb"])
    al.rotation_euler[1] = -0.62
    st = box(3.10, 0.55, 2.05, 2.00, 0.36, 0.44, m["gelb"])
    st.rotation_euler[1] = 0.95
    strebe((1.20, 0.55, 2.30), (2.60, 0.55, 3.45), 0.13, m["stahl2"])
    strebe((2.80, 0.55, 3.35), (3.55, 0.55, 2.40), 0.11, m["stahl2"])
    lf = keil_y([(0.00, 0.00), (0.90, 0.10), (1.05, 0.70), (0.10, 0.85)],
                0.55, 0.90, m["stahl2"], cx=3.45, cz=0.90, name="Loeffel")
    for k in range(5):                                              # Zaehne
        flach(kegel(4.47, 0.20 + k*0.22, 0.97, 0.07, 0.0, 0.26, m["stahl2"], 5,
                    rot=(0, math.pi/2, 0)))
    flach(zyl(-0.30, 0, 2.52, 0.10, 0.34, m["warn"], 10))           # Rundumleuchte

def bagger(): _modul("th46_bagger", _b_bagger, 0.008)

# ================================================================ 6) Baucontainer
def _b_baucontainer():
    """Buero-Baucontainer, 6,20 x 2,60 x 3,40 m — Fenster, Tuer, Aussentreppe.

    ⚠️ Er steht auf Kanthoelzern, nicht auf dem Boden: erst der Spalt darunter
    macht aus dem Kasten einen aufgestellten Container."""
    m = _mats()
    L9, B9, H9 = 6.00, 2.44, 2.60
    for s in (-1, 1):                                               # Kanthoelzer
        box(s*(L9/2 - 0.60), 0, 0.09, 0.80, B9, 0.18, m["holz"])
    box(0, 0, 0.18 + H9/2, L9, B9, H9, m["blau"])
    for k in range(20):                                             # Sicken
        xx = -L9/2 + 0.30 + k*(L9 - 0.6)/19
        for s in (-1, 1):
            box(xx, s*(B9/2 + 0.015), 0.18 + H9/2, 0.12, 0.05, H9 - 0.34, m["stein"])
    for s in (-1, 1):
        box(0, 0, 0.18 + H9/2 + s*(H9/2 - 0.09), L9 + 0.06, B9 + 0.06, 0.18, m["stein"])
    for sx in (-1, 1):
        box(sx*(L9/2 - 0.05), 0, 0.18 + H9/2, 0.12, B9 + 0.06, H9, m["stein"])
    for k in range(2):                                              # Fenster
        xx = -1.60 + k*3.20
        box(xx, B9/2 + 0.02, 1.72, 1.10, 0.06, 0.90, m["glas"])
        _rahmen(xx, B9/2 + 0.05, 1.72, 1.22, 1.02, 0.10, m)
    box(1.05, B9/2 + 0.02, 1.30, 0.90, 0.06, 2.05, m["stein"])      # Tuer
    box(1.05, B9/2 + 0.05, 1.72, 0.66, 0.05, 0.60, m["glas"])
    _rahmen(1.05, B9/2 + 0.08, 1.30, 1.02, 2.17, 0.09, m)
    flach(zyl(0.68, B9/2 + 0.10, 1.30, 0.035, 0.22, m["stahl2"], 8, (math.pi/2, 0, 0)))
    for k in range(3):                                              # Aussentreppe
        box(1.05, B9/2 + 0.28 + k*0.30, 0.24 - k*0.08, 1.00, 0.32, 0.08, m["stahl2"])
    for s in (-1, 1):
        strebe((1.05 + s*0.50, B9/2 + 0.26, 0.30), (1.05 + s*0.50, B9/2 + 0.90, 0.06),
               0.06, m["stahl2"])
    box(0, 0, 0.18 + H9 + 0.06, L9 + 0.20, B9 + 0.20, 0.12, m["stein"])
    box(-2.10, B9/2 + 0.04, 2.45, 1.30, 0.06, 0.34, m["gelb"])      # Firmenschild

def baucontainer(): _modul("th46_baucontainer", _b_baucontainer, 0.008)

# ================================================================ 7) Materiallager
def _b_materiallager():
    """Materiallager, 6,80 x 3,40 x 1,60 m — Ziegelpaletten, Rohrbuendel,
    Sandhaufen, Schubkarre.

    ⚠️ Vier Dinge in einem Modul: sie sind um den Ursprung verteilt, sonst setzt
    `bau()` sie im Spiel versetzt (Lehre aus Charge 42)."""
    m = _mats()
    for p in (-2.30, -0.75):                                        # Ziegelpaletten
        for k in range(4):
            box(p, 0.55, 0.16 + k*0.30, 1.20, 1.00, 0.28,
                m["ziegel"] if k % 2 else m["ziegel"])
            for q in range(5):
                box(p - 0.48 + q*0.24, 0.55, 0.16 + k*0.30, 0.04, 1.02, 0.28,
                    m["beton2"])
        for k in range(3):                                          # Palette
            box(p - 0.42 + k*0.42, 0.55, 0.03, 0.16, 1.00, 0.06, m["holz"])
    for k in range(6):                                              # Rohrbuendel
        r9, c9 = (0.16, 3) if k < 3 else (0.16, 3)
        xx = 0.90 + (k % 3)*0.36
        zz = 0.18 + (k//3)*0.32
        flach(zyl(xx, -0.70, zz, 0.16, 2.20, m["stahl"], 12, (math.pi/2, 0, 0)))
    for s in (-1, 1):
        box(0.90 + 0.36, -0.70 + s*1.14, 0.28, 1.20, 0.10, 0.56, m["holz"])
    # ⚠️ `kegel()` setzt die MITTE auf z, nicht den Fuss: mit z = 0 und Hoehe 0,90
    # lag der Sandhaufen von -0,45 bis +0,45. Ein Schuettkegel gehoert auf h/2.
    flach(kegel(2.55, 0.75, 0.45, 1.05, 0.16, 0.90, m["sand"], 18))  # Sandhaufen
    flach(kegel(2.60, 0.80, 0.31, 0.70, 0.10, 0.62, m["sand"], 16))
    # Schubkarre
    SX, SY = -2.80, -1.10
    kf = keil_y([(0.00, 0.10), (0.90, 0.00), (1.00, 0.42), (-0.10, 0.46)],
                SY, 0.62, m["stahl2"], cx=SX, cz=0.42, name="Wanne")
    for s in (-1, 1):
        flach(zyl(SX + 1.00, SY + s*0.26, 0.28, 0.045, 0.90, m["holz"], 8,
                  (0, math.pi/2, 0)))
        box(SX + 0.20, SY + s*0.26, 0.16, 0.55, 0.06, 0.22, m["stahl2"])
    flach(zyl(SX - 0.16, SY, 0.26, 0.26, 0.10, m["dunkel"], 14, (math.pi/2, 0, 0)))

def materiallager(): _modul("th46_materiallager", _b_materiallager, 0.006)

# ================================================================ 8) Betonmischer
def _b_mischer():
    """Freifall-Betonmischer auf Gestell, 1,60 x 1,10 x 1,55 m.

    Klein, aber er fehlt auf keiner Baustelle — und die schraeg stehende Trommel
    ist seine Silhouette."""
    m = _mats()
    tr = flach(dreh([(0.00, 0.00), (0.30, 0.10), (0.42, 0.34), (0.40, 0.62),
                     (0.26, 0.80), (0.16, 0.86), (0.00, 0.88)],
                    m["gelb"], 18, z=0.0, name="Trommel"))
    tr.location = (0.10, 0.0, 0.62)
    tr.rotation_euler[1] = 0.62
    for k in range(3):                                              # Reifen
        flach(zyl(0.10, 0, 0.62, 0.44 - k*0.02, 0.05, m["gelb2"], 18,
                  (0, 0.62, 0)))
    for s in (-1, 1):                                               # Gestell
        strebe((-0.36, s*0.34, 0.06), (0.16, s*0.34, 0.88), 0.07, m["stahl2"])
        strebe((0.52, s*0.34, 0.06), (0.16, s*0.34, 0.88), 0.07, m["stahl2"])
        flach(zyl(0.52, s*0.40, 0.16, 0.16, 0.09, m["dunkel"], 12, (math.pi/2, 0, 0)))
    box(-0.42, 0, 0.30, 0.34, 0.42, 0.40, m["stahl2"])              # Motor
    flach(zyl(-0.42, 0.24, 0.30, 0.14, 0.10, m["dunkel"], 12, (math.pi/2, 0, 0)))
    strebe((-0.30, 0.34, 0.60), (-0.62, 0.34, 0.86), 0.05, m["stahl2"])
    box(-0.66, 0.34, 0.88, 0.16, 0.06, 0.06, m["rot"])              # Kipphebel

def mischer(): _modul("th46_mischer", _b_mischer, 0.005)

# ================================================================ 9) Baustelle (Ensemble)
def _teil(fn, px, py, rot=0.0, pz=0.0):
    vor = set(bpy.context.scene.objects)
    fn()
    for o in bpy.context.scene.objects:
        if o in vor: continue
        o.rotation_euler[2] += rot
        o.location = (px + math.cos(rot)*o.location[0] - math.sin(rot)*o.location[1],
                      py + math.sin(rot)*o.location[0] + math.cos(rot)*o.location[1],
                      pz + o.location[2])

def _b_baustelle():
    """Massstabs-Test: Rohbau mit Kran, Geruest und Ausstattung, 42 x 32 m."""
    m = _mats()
    flach(box(0, 0, 0.004, 42.0, 32.0, 0.008, m["erde"]))
    _teil(_b_rohbau,   -4.0,  4.0)
    _teil(_b_baukran,   9.0, -2.0)
    for k in range(5):
        _teil(_b_geruest, -9.5 + k*2.5, 8.9)
    _teil(_b_bagger,   -14.0, -8.0, -0.4)
    _teil(_b_baucontainer, 8.0, -11.0)
    _teil(_b_materiallager, -2.0, -10.0)
    _teil(_b_mischer,   1.5, -6.0, 0.6)
    for k in range(8):                                              # Bauzaun ringsum
        _teil(_b_bauzaun, -17.5 + k*3.5, -14.5)
    for k in range(6):
        _teil(_b_bauzaun, -19.5, -12.0 + k*3.5, math.pi/2)
    export("th46_baustelle", 0.012, 2)

def baustelle(): neu(); _b_baustelle()

if __name__ == "__main__":
    print("Asset-Charge 46 (th46, Baustelle):")
    for fn in (baukran, rohbau, geruest, bauzaun, bagger, baucontainer,
               materiallager, mischer, baustelle):
        fn()
    print("fertig")
