# -*- coding: utf-8 -*-
"""Asset-Charge 39 (th39_*): STRASSENAUSSTATTUNG.

Die Landstrasse und ihre sechs Zubringer sind seit der Bergwelt-Ladung befahrbar,
aber sie sind nackt: kein Vorfahrtsschild an den Einmuendungen, keine Leitpfosten
am Bankett, keine Leitplanke am Hang, keine Haltestelle. Genau das fehlt einer
Strasse, damit sie nicht wie ein Asphaltband im Gras aussieht.

Konventionen wie th5-th38 (siehe models/TH5-ASSETS.md), Werkzeug aus th_werkzeug.py:
  * Ursprung mittig, Unterkante exakt z = 0, Meter, PBR-Materialien.
  * Schauseite (Schildflaeche) auf Blender +y  ->  three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT.

RASTER: th39_leitplanke laeuft auf x += 4,00 und ist damit reihbar wie der
Weidezaun aus Charge 38 (2,50) — beide Raster sind fuer sich geschlossen.

⚠️ Die Fallen, die hier am ehesten zuschlagen, stehen als Kommentar an der
   jeweiligen Stelle: Rahmen statt Platte (Wartehaeuschen, Fahrplankasten),
   gedrehte Koerper fallen unter ihre Mitte, und ein Schild ist eine PLATTE auf
   einem Pfosten — kein Klotz.
"""
import os, math
import th_werkzeug as W
from th_werkzeug import (bpy, bmesh, neu, mat, mat_bild, leucht, box, zyl, kugel,
                         kegel, scheibe, flach, dreh, rohr, bogen_pkt, volute_pkt,
                         strebe, kranz, runden, export, TAU)

def _mats():
    """Verkehrsfarben: verzinkter Stahl, Schildweiss, Signalrot, Leitblau."""
    return {
      "stahl": mat("StStahl",  (0.62,0.64,0.67), 0.42, 0.62),
      "pfost": mat("StPfost",  (0.55,0.57,0.60), 0.50, 0.45),
      "weiss": mat("StWeiss",  (0.92,0.92,0.90), 0.55),
      "rot":   mat("StRot",    (0.68,0.11,0.10), 0.55),
      "blau":  mat("StBlau",   (0.10,0.24,0.52), 0.55),
      "schwarz":mat("StSchw",  (0.10,0.10,0.11), 0.70),
      "gelb":  mat("StGelb",   (0.86,0.66,0.10), 0.55),
      "orange":mat("StOrange", (0.82,0.36,0.06), 0.60),
      "glas":  mat("StGlas",   (0.30,0.42,0.48), 0.10, 0.10),
      "holz":  mat("StHolz",   (0.42,0.28,0.17), 0.85),
      "beton": mat("StBeton",  (0.70,0.69,0.65), 0.92),
      # Rueckstrahler leuchten schwach — ohne Emission sind sie im Abendlicht
      # schwarze Punkte, genau dann also, wenn ein Reflektor sichtbar sein soll.
      "refl":  leucht("StRefl", (0.90,0.30,0.16), 1.1),
      "reflw": leucht("StReflW",(0.95,0.92,0.72), 0.9),
    }

def _modul(name, bauer, bevel=0.008):
    neu(); bauer(); export(name, bevel, 2)

def _mast(hoehe, m, r=0.035):
    """Rundmast mit Fussplatte. Die Platte ist das, was den Mast auf den Boden
    stellt statt ihn im Boden verschwinden zu lassen."""
    flach(zyl(0, 0, hoehe/2, r, hoehe, m["pfost"], 12))
    flach(zyl(0, 0, 0.018, r*2.6, 0.036, m["stahl"], 12))
    for k in range(4):                                                  # Ankerschrauben
        a = TAU*k/4 + 0.4
        flach(zyl(math.cos(a)*r*1.9, math.sin(a)*r*1.9, 0.046, 0.012, 0.02,
                  m["stahl"], 6))

def _platte(z, br, ho, dicke, m_, y=0.0, seg=None):
    """Schildflaeche: eine duenne PLATTE, keine Kiste.

    ⚠️ Ein Schild mit 20 cm Tiefe liest sich aus jeder Entfernung als Klotz —
    die Silhouette eines Schildes ist die Flaeche, nicht der Koerper."""
    return box(0, y, z, br, dicke, ho, m_)

# ================================================================ 1) Vorfahrt achten
def _b_vorfahrt():
    """Vorfahrt-achten-Schild, auf der Spitze stehendes Dreieck, 2,55 m hoch.

    ⚠️ Das Dreieck ist ein Kegel mit DREI Ecken und gleichem Ober-/Unterradius —
    also ein dreikantiges Prisma. Um es aufzustellen, kippt es um x: die
    Prismenachse liegt auf z und muss auf y zeigen, damit die Flaeche zur
    Strasse schaut.

    ⚠️ Und dann muss die Spitze nach UNTEN — sonst ist es kein Vorfahrt-achten-
    Schild. Der erste Versuch drehte dafuer um z, und genau das ist falsch:
    Blender wendet einen XYZ-Euler in der Reihenfolge x, y, z an, das z kommt
    also ZULETZT und dreht die schon gekippte Tafel um die WELT-Hochachse — sie
    schaut danach nach hinten, die Spitze bleibt oben. Nachgemessen mit einem
    Probeprisma:  x90        -> zmax +0,500 bei x 0  (Spitze oben)
                  x90 z180   -> zmax +0,500 bei x 0  (Spitze oben, nur gedreht)
                  x90 y180   -> zmin -0,500 bei x 0  (Spitze unten)
    Nach dem Kippen liegt die Tafelebene auf x-z, und in dieser Ebene dreht y."""
    M = _mats()
    _mast(2.30, M)
    R = 0.52
    for r_, d_, mm in ((R, 0.05, M["rot"]), (R*0.74, 0.055, M["weiss"])):
        p = kegel(0, 0, 2.02, r_, r_, d_, mm, 3)
        p.rotation_euler = (math.pi/2, math.pi, 0)
        flach(p)
    flach(zyl(0, 0.05, 1.58, 0.05, 0.02, M["reflw"], 10, (math.pi/2, 0, 0)))

def vorfahrt(): _modul("th39_vorfahrt", _b_vorfahrt)

# ================================================================ 2) Ortstafel
def _b_ortstafel():
    """Ortstafel auf zwei Masten, Tafel 1,80 x 0,58 auf 1,55 m.

    Die dunkle Leiste in der Tafel steht fuer die Beschriftung: eine leere weisse
    Flaeche liest sich als vergessenes Blech, ein Balken darin als Ortsname."""
    M = _mats()
    # ⚠️ Erste Fassung: Tafel 1,80 breit auf 2,18 Gesamthoehe — das liest sich als
    # Plakatwand, nicht als Ortstafel. Ein Strassenschild steht hoch ueber dem
    # Bankett; die Hoehe des Mastes ist der halbe Wiedererkennungswert.
    for s in (-1, 1):
        flach(zyl(s*0.56, 0, 1.14, 0.032, 2.28, M["pfost"], 10))
        flach(zyl(s*0.56, 0, 0.016, 0.075, 0.032, M["stahl"], 12))
    _platte(2.22, 1.52, 0.50, 0.045, M["weiss"])
    _platte(2.22, 1.58, 0.56, 0.030, M["schwarz"])                      # Rand hinter der Tafel
    _platte(2.22, 0.94, 0.14, 0.055, M["schwarz"])                      # Schriftbalken
    for s in (-1, 1):                                                   # Klemmschienen hinten
        box(0, -0.055, 2.22 + s*0.17, 1.34, 0.05, 0.06, M["stahl"])

def ortstafel(): _modul("th39_ortstafel", _b_ortstafel)

# ================================================================ 3) Wegweiser
def _b_wegweiser():
    """Pfeilwegweiser mit zwei Armen in Gegenrichtung, 3,20 m hoch.

    ⚠️ Der Pfeil entsteht aus Tafel + aufgesetztem Dreiecksprisma an der Spitze.
    Eine blosse Tafel mit schraeger Kante waere ein Keil, kein Pfeil — die
    Erkennbarkeit steckt in der einspringenden Schulter."""
    M = _mats()
    _mast(3.05, M, 0.045)
    for i, (s, z0) in enumerate(((1, 2.62), (-1, 2.06))):
        L, H = 1.30, 0.34
        box(s*(0.05 + L/2), 0, z0, L, 0.05, H, M["blau"])
        box(s*(0.05 + L/2), 0, z0, L*0.98, 0.062, H*0.62, M["blau"])
        # Spitze nach aussen — dieselbe Euler-Falle wie beim Vorfahrtsschild:
        # y dreht IN der Tafelebene, z dreht die Tafel aus ihr heraus. Gemessen:
        # x90 y+90 -> Ecke bei x +0,500;  x90 y-90 -> Ecke bei x -0,500.
        sp = kegel(s*(0.05 + L + 0.10), 0, z0, H*0.72, H*0.72, 0.05, M["blau"], 3)
        sp.rotation_euler = (math.pi/2, s*math.pi/2, 0)
        flach(sp)
        box(s*(0.05 + L/2), 0.033, z0 + 0.02, L*0.78, 0.012, 0.055, M["weiss"])
        flach(zyl(0, 0, z0, 0.055, 0.40, M["stahl"], 10, (math.pi/2, 0, 0)))  # Schelle

def wegweiser(): _modul("th39_wegweiser", _b_wegweiser)

# ================================================================ 4) Leitpfosten
def _b_leitpfosten():
    """Leitpfosten, 1,00 m ueber Grund, weiss mit schwarzem Kopf und Reflektor.

    Der Querschnitt ist ein abgeflachtes Rechteck, kein Rundstab: die schmale
    Seite zeigt zur Fahrbahn, dadurch wirkt er in der Reihe wie eine Linie."""
    M = _mats()
    box(0, 0, 0.50, 0.11, 0.07, 1.00, M["weiss"])
    box(0, 0, 0.955, 0.115, 0.075, 0.10, M["schwarz"])                  # Kopfband
    flach(zyl(0, 0.038, 0.90, 0.030, 0.012, M["refl"], 8, (math.pi/2, 0, 0)))
    flach(zyl(0, -0.038, 0.90, 0.030, 0.012, M["reflw"], 8, (math.pi/2, 0, 0)))
    box(0, 0, 0.022, 0.20, 0.16, 0.044, M["beton"])                     # Fussstein

def leitpfosten(): _modul("th39_leitpfosten", _b_leitpfosten, 0.005)

# ================================================================ 5) Leitplanke
def _b_leitplanke():
    """Leitplanken-Modul, Raster 4,00 m, Holm auf 0,73 m.

    ⚠️ Das W-Profil ist der ganze Wiedererkennungswert. Ein einzelner Balken
    liest sich als Brett am Pfosten; drei Baender mit zurueckgesetzter Mitte
    ergeben die Doppelwelle, die man von der Autobahn kennt."""
    M = _mats()
    BR = 4.00
    # ⚠️ Der Holm sass erst auf 0,73 und ragte mit seinem oberen Band bis 1,00 —
    # also UEBER die 0,74 hohen Pfosten hinaus. Eine Leitplanke, die oben ueber
    # ihre eigenen Pfosten steht, schwebt. Holmmitte jetzt 0,60, Pfosten 0,92.
    HM = 0.60
    for s in (-1, 1):                                                   # Sigma-Pfosten
        x = s*(BR/2 - 0.20)
        box(x, 0, 0.46, 0.12, 0.10, 0.92, M["pfost"])
        box(x, 0.055, 0.46, 0.16, 0.02, 0.92, M["pfost"])
        box(x, 0.09, HM, 0.14, 0.09, 0.16, M["stahl"])                  # Distanzstueck
    for dz, dy in ((0.155, 0.155), (0.0, 0.115), (-0.155, 0.155)):      # Holm im W-Profil
        box(0, dy, HM + dz, BR - 0.06, 0.04, 0.12, M["stahl"])
    for dz in (0.088, -0.088):                                          # Schraege dazwischen
        b = box(0, 0.135, HM + dz, BR - 0.06, 0.045, 0.10, M["stahl"])
        b.rotation_euler[0] = (0.62 if dz > 0 else -0.62)
    for k in range(5):                                                  # Stossbolzen
        flach(zyl(-BR/2 + 0.30 + k*(BR - 0.60)/4, 0.185, HM, 0.022, 0.03,
                  M["stahl"], 8, (math.pi/2, 0, 0)))

def leitplanke(): _modul("th39_leitplanke", _b_leitplanke, 0.006)

# ================================================================ 6) Bushaltestelle
def _b_bushalt():
    """Wartehaeuschen, 3,40 x 1,58 x 2,52 m — Rueckwand und zwei Seiten verglast,
    Bank, Fahrplankasten, Haltestellenmast.

    ⚠️ RAHMEN SIND VIER BALKEN. Das ist der Fehler, der in Charge 35 (Gaube),
    37 (Fenster), 37 (Ladenschild) und 38 (Klappe) aufgetreten ist: eine Platte
    in Scheibengroesse davor deckt genau das zu, was sie rahmen soll."""
    M = _mats()
    B, T, H = 3.40, 1.50, 2.30

    def rahmen(x, y, z, br, ho, st, achse="x"):
        """Vier Balken um eine Oeffnung — nie eine Platte."""
        if achse == "x":
            box(x, y, z + ho/2 - st/2, br, 0.07, st, M["stahl"])
            box(x, y, z - ho/2 + st/2, br, 0.07, st, M["stahl"])
            for s in (-1, 1):
                box(x + s*(br/2 - st/2), y, z, st, 0.07, ho - 2*st, M["stahl"])
        else:
            box(x, y, z + ho/2 - st/2, 0.07, br, st, M["stahl"])
            box(x, y, z - ho/2 + st/2, 0.07, br, st, M["stahl"])
            for s in (-1, 1):
                box(x, y + s*(br/2 - st/2), z, 0.07, st, ho - 2*st, M["stahl"])

    for sx in (-1, 1):                                                  # Eckstiele
        for sy in (-1, 1):
            box(sx*(B/2 - 0.06), sy*(T/2 - 0.06), H/2, 0.10, 0.10, H, M["pfost"])
    # Rueckwand (auf -y, damit die offene Seite zur Strasse auf +y zeigt)
    box(0, -T/2 + 0.06, 1.28, B - 0.24, 0.03, 1.72, M["glas"])
    rahmen(0, -T/2 + 0.02, 1.28, B - 0.20, 1.76, 0.09, "x")
    for sx in (-1, 1):                                                  # Seitenscheiben
        box(sx*(B/2 - 0.06), 0, 1.28, 0.03, T - 0.24, 1.72, M["glas"])
        rahmen(sx*(B/2 - 0.02), 0, 1.28, T - 0.20, 1.76, 0.09, "y")
    box(0, 0, H + 0.09, B + 0.24, T + 0.30, 0.10, M["stahl"])           # Dach
    for k in range(7):                                                  # Dachsicken
        box(-B/2 - 0.06 + k*(B + 0.12)/6, 0, H + 0.16, 0.07, T + 0.30, 0.045, M["stahl"])
    box(0, -T/2 + 0.24, 0.47, B - 0.60, 0.34, 0.06, M["holz"])          # Sitzflaeche
    for sx in (-1, 1):
        box(sx*(B/2 - 0.45), -T/2 + 0.24, 0.235, 0.09, 0.30, 0.47, M["pfost"])
    # Fahrplankasten: Glas dahinter, Rahmen davor — nicht umgekehrt
    box(B/2 - 0.42, -T/2 + 0.11, 1.62, 0.52, 0.02, 0.66, M["weiss"])
    rahmen(B/2 - 0.42, -T/2 + 0.14, 1.62, 0.56, 0.70, 0.05, "x")
    flach(zyl(B/2 + 0.42, T/2 - 0.20, 1.35, 0.036, 2.70, M["pfost"], 10))
    flach(zyl(B/2 + 0.42, T/2 - 0.20, 0.016, 0.09, 0.032, M["stahl"], 12))
    flach(zyl(B/2 + 0.42, T/2 - 0.20, 2.58, 0.26, 0.05, M["gelb"], 20, (math.pi/2, 0, 0)))
    flach(zyl(B/2 + 0.42, T/2 - 0.17, 2.58, 0.19, 0.02, M["schwarz"], 20, (math.pi/2, 0, 0)))

def bushalt(): _modul("th39_bushalt", _b_bushalt, 0.010)

# ================================================================ 7) Absperrbake
def _b_bake():
    """Absperrbake, 1,60 x 0,42 x 1,06 m — rot-weiss gestreiftes Brett auf zwei
    Klappfuessen. Die Streifen sind aufgesetzte Leisten, keine Textur: das Modell
    soll auch als STL ohne Bild erkennbar bleiben."""
    M = _mats()
    BR = 1.55
    # ⚠️ Die Streifen waren 0,40 hoch und um 0,62 rad gekippt: senkrechte
    # Ausdehnung 0,40*cos + 0,20*sin = 0,44 auf einem Brett von 0,28 — sie
    # standen oben und unten 8 cm ueber. Ein gekippter Quader braucht
    # h*cos + b*sin <= Bretthoehe, nicht h <= Bretthoehe.
    box(0, 0, 0.86, BR, 0.045, 0.28, M["weiss"])
    for k in range(4):                                                  # Schraegstreifen
        st = box(-BR/2 + 0.24 + k*(BR - 0.48)/3, 0.030, 0.86, 0.16, 0.012, 0.26, M["rot"])
        st.rotation_euler[1] = 0.62
    for s in (-1, 1):                                                   # Klappbock
        x = s*(BR/2 - 0.16)
        strebe((x, -0.17, 0.02), (x, 0.0, 0.72), 0.055, M["pfost"])
        strebe((x,  0.17, 0.02), (x, 0.0, 0.72), 0.055, M["pfost"])
        box(x, 0, 0.72, 0.09, 0.09, 0.16, M["pfost"])
        for q in (-1, 1):
            box(x, q*0.19, 0.025, 0.22, 0.12, 0.05, M["schwarz"])       # Fussplatte
    flach(zyl(0, 0.035, 1.02, 0.045, 0.02, M["refl"], 10, (math.pi/2, 0, 0)))

def bake(): _modul("th39_bake", _b_bake, 0.006)

# ================================================================ 8) Leitkegel
def _b_pylon():
    """Leitkegel, 0,36 x 0,36 x 0,76 m — Drehkoerper mit Sockelplatte.

    ⚠️ Als gestapelte Kegel saehe man jeden Absatz. Ein Drehkoerper hat EINE
    stetige Silhouette, und genau daran erkennt das Auge einen Pylonen."""
    M = _mats()
    dreh([(0.00, 0.000), (0.175, 0.000), (0.175, 0.055), (0.120, 0.075),
          (0.098, 0.180), (0.074, 0.400), (0.052, 0.600), (0.036, 0.720),
          (0.000, 0.760)], M["orange"], 24, name="Pylon")
    for z0, ho in ((0.34, 0.11), (0.53, 0.08)):                         # Reflexbaender
        r0 = 0.098 - (z0 - 0.18)*0.115
        flach(zyl(0, 0, z0 + ho/2, r0 + 0.006, ho, M["reflw"], 24))

def pylon(): _modul("th39_pylon", _b_pylon, 0.004)

# ================================================================ 9) Kreuzung (Ensemble)
def _teil(fn, px, py, rot=0.0, pz=0.0):
    vor = set(bpy.context.scene.objects)
    fn()
    for o in bpy.context.scene.objects:
        if o in vor: continue
        o.rotation_euler[2] += rot
        o.location = (px + math.cos(rot)*o.location[0] - math.sin(rot)*o.location[1],
                      py + math.sin(rot)*o.location[0] + math.cos(rot)*o.location[1],
                      pz + o.location[2])

def _b_kreuzung():
    """Massstabs-Test: eine Einmuendung mit allem aus dieser Ladung, 24 x 24 m."""
    M = _mats()
    scheibe(0, 0, 0.003, 12.0, M["beton"], 40)
    _teil(_b_vorfahrt,  -5.6,  4.6, math.pi)
    _teil(_b_vorfahrt,   5.6, -4.6, 0.0)
    _teil(_b_ortstafel, -8.4, -4.8, math.pi/2)
    _teil(_b_wegweiser,  5.6,  4.8, 0.0)
    _teil(_b_bushalt,   -2.0,  7.4, math.pi)
    for k in range(5):
        _teil(_b_leitpfosten, -9.0 + k*4.5, -7.6)
    for k in range(3):
        _teil(_b_leitplanke,  -8.0 + k*4.0,  9.4)
    _teil(_b_bake,       8.6,  1.2, math.pi/2)
    for k in range(4):
        _teil(_b_pylon,  7.9,  -0.6 - k*1.1)
    export("th39_kreuzung", 0.010, 2)

def kreuzung(): neu(); _b_kreuzung()

if __name__ == "__main__":
    print("Asset-Charge 39 (th39, Strassenausstattung):")
    for fn in (vorfahrt, ortstafel, wegweiser, leitpfosten, leitplanke,
               bushalt, bake, pylon, kreuzung):
        fn()
    print("fertig")
