# -*- coding: utf-8 -*-
"""Asset-Charge 37 (th37_*): STADTHAEUSER, FAHRZEUGE, SCHIESSBUDE.

Drei Gruppen, ein Generator:

  STADTHAEUSER   Fertige Baukoerper statt Modulen. Charge 34 ist ein Baukasten —
                 gut zum Selberbauen, aber jedes Haus daraus sieht gleich aus.
                 Hier stehen vier CHARAKTERE: Gruenderzeit-Altbau, Eckhaus mit
                 Laden, schmales Reihenhaus, Cafe mit Terrasse.

  FAHRZEUGE      Vier Wagen mit echter Silhouette. Ein Auto ist kein Quader mit
                 Raedern: Motorhaube, Windschutzscheibenneigung, Dachlinie und
                 Heckabfall machen es aus. Darum werden alle vier aus einem
                 SEITENPROFIL extrudiert (`keil_y`), nicht aus Kisten gestapelt.

  SCHIESSBUDE    Jahrmarkt-Bude mit Klappzielen und Spielzeug-Blastern.
                 ⚠️ BEWUSST KEINE echten Feuerwaffen: Das Spiel ist
                 familienfreundlich, und STL ist ein Druckformat. Was hier
                 entsteht, sind Kirmes-Requisiten — bunte Wasserpistole und
                 Budengewehr mit Korkkugel, unverkennbar Spielzeug, in Massen und
                 Formen, die nichts nachbilden.

Konventionen wie th5-th36 (siehe models/TH5-ASSETS.md):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Schauseite auf Blender +y  ->  three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT.
Werkzeug aus `th_werkzeug.py` (Charge 35/36).
"""
import os, math
import th_werkzeug as W
from th_werkzeug import (bpy, bmesh, neu, mat, mat_bild, leucht, box, zyl, kugel,
                         kegel, scheibe, flach, dreh, rohr, bogen_pkt, volute_pkt,
                         strebe, kranz, runden, export, TAU)

# ============================================================ Werkzeug-Ergaenzung
def keil_y(prof, cy, breite, m=None, cx=0.0, cz=0.0, name="Profil"):
    """Extrudiert ein Profil aus der x-z-Ebene entlang y.

    Das Gegenstueck zu `keil_x` aus Charge 34, und das Werkzeug fuer Fahrzeuge:
    man zeichnet die SEITENANSICHT und zieht sie auf Wagenbreite. Aus Kisten
    gestapelt bekommt man nie eine Windschutzscheibenneigung hin.

    `prof` sind (x, z)-Punkte im Umlauf, konvex ODER konkav — die Deckflaechen
    werden per Triangulierung geschlossen, nicht als N-Gon. Ein Auto-Seitenriss
    ist naemlich nicht konvex (die Fensterlinie springt zurueck), und ein N-Gon
    darueber faltet sich."""
    n = len(prof)
    bm = bmesh.new()
    v0 = [bm.verts.new((p[0] + cx, cy - breite/2.0, p[1] + cz)) for p in prof]
    v1 = [bm.verts.new((p[0] + cx, cy + breite/2.0, p[1] + cz)) for p in prof]
    f0 = bm.faces.new(v0)
    f1 = bm.faces.new(list(reversed(v1)))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((v0[i], v0[j], v1[j], v1[i]))
    bmesh.ops.triangulate(bm, faces=[f0, f1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if m: me.materials.append(m)
    bpy.context.view_layer.objects.active = o
    uvl = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            uvl.data[li].uv = (p.x if abs(poly.normal.y) < 0.5 else p.y, p.z)
    return o

def rad(x, y, z, r, br, felge, reifen):
    """Ein Rad: Reifen + Felge + Nabe. Die Zylinderachse muss auf y liegen —
    `rot=(pi/2,0,0)` legt sie dorthin (fuer x waere es (0,pi/2,0))."""
    flach(zyl(x, y, z, r, br, reifen, 20, (math.pi/2, 0, 0)))
    for s in (-1, 1):
        flach(zyl(x, y + s*(br/2 + 0.005), z, r*0.62, 0.03, felge, 16, (math.pi/2, 0, 0)))
    flach(zyl(x, y, z, r*0.16, br + 0.04, felge, 10, (math.pi/2, 0, 0)))

def _mats(wand=(0.94,0.91,0.85), zier=None, dachf=(0.40,0.26,0.24)):
    """Materialsatz mit WAEHLBARER Fassadenfarbe.

    ⚠️ Der erste Wurf gab allen vier Haeusern denselben Satz: Putz (0,94|0,91|0,85),
    Rahmen (0,96|0,95|0,92), Werkstein (0,82|0,79|0,72). Im Render standen vier
    weisse Kisten — das ganze Relief aus Gesimsen, Gewaenden und Balkonen war
    unsichtbar, weil es KEINEN KONTRAST zum Grund hatte. Genau der Befund
    „Haeuser zu simple Textur": es lag nie an der Textur, sondern daran, dass
    Wand und Zierglied dieselbe Helligkeit hatten.
    Jetzt traegt jedes Haus eine eigene Wandfarbe, die Ziederglieder bleiben
    nahezu weiss — dann liest sich jedes Gesims.

    Und das Glas war mit (0,62|0,78|0,88) heller als die Wand: Fenster wirkten
    wie aufgeklebte weisse Rechtecke statt wie Oeffnungen."""
    z = zier if zier else (0.97, 0.96, 0.94)
    return {
      "putz":  mat_bild("SdPutz", "hausputz.png", wand, 0.88, 0.0, True),
      "putz2": mat("SdPutz2", tuple(c*0.88 for c in wand), 0.88),
      "sockel":mat("SdSockel", tuple(c*0.62 for c in wand), 0.90),
      "stein": mat("SdStein",  z, 0.84),
      "dach":  mat("SdDach",   dachf, 0.74),
      "dach2": mat("SdDach2",  (0.32,0.35,0.40), 0.70),
      "glas":  mat("SdGlas",   (0.28,0.42,0.52), 0.10, 0.15),
      "rahm":  mat("SdRahmen", z, 0.55),
      "holz":  mat_bild("SdHolz", "bohlen.png", (0.78,0.60,0.40), 0.78, 0.0, True),
      "eisen": mat("SdEisen",  (0.16,0.17,0.19), 0.45, 0.60),
      "gold":  mat("SdGold",   (0.90,0.74,0.36), 0.34, 0.45),
      "markise":mat("SdMarkise",(0.72,0.22,0.24), 0.72),
      "laden": mat("SdLaden",  (0.32,0.42,0.34), 0.72),
      "ladenD":mat("SdLadenD", (0.24,0.33,0.27), 0.72),
      "metall":mat("SdMetall", (0.62,0.64,0.68), 0.40, 0.55),
      "laub":  mat("SdLaub",   (0.28,0.48,0.24), 0.85),
      "bluete":mat("SdBluete", (0.90,0.44,0.52), 0.70),
      # Fahrzeuge
      "lackA": mat("SdLackA", (0.16,0.30,0.52), 0.28, 0.35),
      "lackB": mat("SdLackB", (0.72,0.16,0.18), 0.26, 0.35),
      "lackC": mat("SdLackC", (0.90,0.90,0.92), 0.30, 0.25),
      "lackD": mat("SdLackD", (0.24,0.52,0.36), 0.28, 0.35),
      "scheibe":mat("SdScheibe",(0.36,0.48,0.55), 0.08, 0.20),
      "reifen":mat("SdReifen", (0.09,0.09,0.10), 0.85),
      "felge": mat("SdFelge",  (0.80,0.82,0.86), 0.25, 0.80),
      "chrom": mat("SdChrom",  (0.86,0.88,0.92), 0.15, 0.85),
      "licht": leucht("SdLicht", (1.00,0.94,0.78), 2.6),
      "rueck": leucht("SdRueck", (1.00,0.28,0.20), 2.2),
      # Jahrmarkt
      "budeA": mat("SdBudeA", (0.86,0.24,0.28), 0.72),
      "budeB": mat("SdBudeB", (0.96,0.94,0.88), 0.72),
      "gelb":  mat("SdGelb",  (0.96,0.76,0.20), 0.65),
      "blau":  mat("SdBlau",  (0.20,0.52,0.82), 0.60),
      "orange":mat("SdOrange",(0.95,0.52,0.16), 0.60),
      "gruen": mat("SdGruen", (0.30,0.70,0.42), 0.60),
      "kork":  mat("SdKork",  (0.78,0.62,0.38), 0.90),
    }

def _modul(name, bauer, bevel=0.012):
    neu(); bauer(); export(name, bevel, 2)

# ---------------------------------------------------------------- Bausteine
def _rahmen(x, yf, z, b, h, st, M, mat_="rahm"):
    """Rahmen als VIER Balken um eine Oeffnung — nie als Platte.

    ⚠️ Genau dieser Fehler steckte in der ersten Fassung und schon in der Gaube
    von Charge 35: eine Vollplatte in Fenstergroesse, davor gesetzt, deckt die
    Scheibe komplett zu. Im Render waren alle Fenster weisse Rechtecke, und die
    Fassade sah aus wie bekleben statt gebaut."""
    box(x, yf, z + h/2 + st/2, b + 2*st, 0.08, st, M[mat_])          # Sturz
    box(x, yf, z - h/2 - st/2, b + 2*st, 0.08, st, M[mat_])          # Bruestung
    for s9 in (-1, 1):
        box(x + s9*(b/2 + st/2), yf, z, st, 0.08, h, M[mat_])        # Gewaende

def _fenster(x, z, b, h, M, yf, bank=True, sprossen=True):
    """Fenster mit Laibung, Rahmen, Scheibe, Bank — die Einheit, aus der jede
    Fassade besteht. Ohne Laibung klebt das Glas auf der Wand und die Fassade
    sieht flach aus (der Befund „Haeuser zu simple Textur").

    ⚠️ `yf` ist die WANDFLAECHE, nicht die Wandtiefe. Erst nahm die Funktion die
    Tiefe und rechnete `tiefe/2` — beim Cafe stimmt das nicht, dessen Baukoerper
    sitzt bei y = -1,2 und nicht auf der Mitte."""
    # ⚠️ Zweiter Anlauf am selben Fenster. Die Scheibe lag bei yf-0,07, also INNEN
    # in der Wand — und die Wand ist ein voller Quader ohne Loch. Durch die
    # Rahmenoeffnung sah man darum den Putz, nicht das Glas. Jetzt steht das
    # ganze Fenster VOR der Fassade: Rahmen bei yf+0,03, Scheibe knapp dahinter.
    # Das ist bei einem Gruenderzeitbau ohnehin richtig — Gewaende kragen vor.
    box(x, yf + 0.015, z, b, 0.05, h, M["glas"])
    _rahmen(x, yf + 0.03, z, b, h, 0.10, M)
    if sprossen:
        box(x, yf + 0.045, z, 0.045, 0.05, h, M["rahm"])
        box(x, yf + 0.045, z + h*0.16, b, 0.05, 0.045, M["rahm"])
    if bank:
        box(x, yf + 0.04, z - h/2 - 0.14, b + 0.30, 0.20, 0.07, M["stein"])

def _tuer(x, z0, b, h, M, yf):
    box(x, yf + 0.02, z0 + h/2 - 0.10, b, 0.06, h - 0.20, M["holz"])
    box(x, yf + 0.02, z0 + h - 0.13, b, 0.06, 0.22, M["glas"])       # Oberlicht
    _rahmen(x, yf + 0.035, z0 + h/2, b, h, 0.12, M)
    kugel(x + b/2 - 0.10, yf + 0.07, z0 + h*0.45, 0.05, M["gold"], 9)
    box(x, yf + 0.16, z0 + 0.05, b + 0.34, 0.42, 0.10, M["stein"])   # Stufe

def _laden_flgl(x, yf, z, b, h, M):
    """Fensterlaeden links und rechts, mit Lamellen. Zwei Bretter neben einem
    Fenster aendern mehr am Gesamteindruck als jede Texturverfeinerung: sie
    geben der Fassade Rhythmus und eine zweite Tiefenstufe."""
    for s9 in (-1, 1):
        lx = x + s9*(b/2 + 0.16)
        box(lx, yf + 0.10, z, 0.28, 0.05, h, M["laden"])
        for k in range(7):
            box(lx, yf + 0.13, z - h/2 + h*(k + 0.5)/7, 0.24, 0.03, h/11, M["ladenD"])

def _verdachung(x, yf, z, b, M):
    """Fensterverdachung — die kleine Bekroenung ueber einem Fenster. Beim
    Gruenderzeitbau sitzt sie nur ueber dem ersten Obergeschoss (Beletage)."""
    box(x, yf + 0.10, z, b + 0.42, 0.26, 0.10, M["stein"])
    box(x, yf + 0.06, z - 0.09, b + 0.30, 0.20, 0.09, M["stein"])
    for s9 in (-1, 1):
        box(x + s9*(b/2 + 0.09), yf + 0.05, z - 0.30, 0.10, 0.16, 0.42, M["stein"])

def _quaderung(cx, cy, z0, z1, M, n=9):
    """Eckquaderung: abwechselnd lange und kurze Steine ueber die Hausecke, je
    einer auf jeder der beiden Fassaden. Ohne sie verliert sich die Kante einer
    verputzten Fassade voellig — die Ecke ist die Stelle, an der ein Haus seine
    Koerperlichkeit zeigt."""
    sx = 1 if cx > 0 else -1
    sy = 1 if cy > 0 else -1
    for k in range(n):
        hh = (z1 - z0)/n*0.70
        zz = z0 + (z1 - z0)*(k + 0.5)/n
        a = 0.62 if k % 2 == 0 else 0.34
        b = 0.34 if k % 2 == 0 else 0.62
        box(cx - sx*a/2, cy - sy*0.07, zz, a, 0.16, hh, M["stein"])
        box(cx - sx*0.07, cy - sy*b/2, zz, 0.16, b, hh, M["stein"])

def _schild(x, yf, z, b, M, farbe="markise"):
    """Ladenschild ueber der Front: Tafel, Rahmen, drei angedeutete Wortbloecke.
    Echte Schrift braeuchte eine Textur; drei Bloecke lesen sich aus Spielabstand
    genauso als Beschriftung und kosten nichts."""
    box(x, yf + 0.09, z, b, 0.10, 0.52, M[farbe])
    box(x, yf + 0.13, z, b + 0.10, 0.05, 0.62, M["stein"])
    for k in range(3):
        box(x - b*0.26 + k*b*0.26, yf + 0.16, z, b*0.17, 0.03, 0.16, M["rahm"])

def _dachziegel(cz, halbb, hoehe, tiefe, M, n=9):
    """Ziegelreihen auf einem Satteldach. Ein Dach als glatte Flaeche ist die
    groesste einzelne Schwachstelle: es ist die zweitgroesste sichtbare Flaeche
    am Haus und traegt sonst keinerlei Massstab."""
    L = math.hypot(halbb, hoehe)
    ry = math.atan2(hoehe, halbb)
    for s9 in (-1, 1):
        dx, dz = -s9*halbb/L, hoehe/L                     # aufwaerts entlang der Schraege
        nx, nz = s9*hoehe/L, halbb/L                      # nach aussen
        for k in range(n):
            t = (k + 0.5)/n
            px = s9*halbb + dx*L*t + nx*0.05
            pz = cz + dz*L*t + nz*0.05
            zi = box(px, 0, pz, L/n*1.16, tiefe, 0.07, M["dach"])
            zi.rotation_euler[1] = s9*ry
    box(0, 0, cz + hoehe + 0.05, 0.34, tiefe + 0.06, 0.16, M["dach"])   # Firstziegel
    for s9 in (-1, 1):                                                   # Rinne
        flach(zyl(s9*(halbb + 0.10), 0, cz + 0.02, 0.075, tiefe + 0.10,
                  M["metall"], 10, (math.pi/2, 0, 0)))

def _fallrohr(x, y, z0, z1, M):
    flach(zyl(x, y, (z0 + z1)/2, 0.055, z1 - z0, M["metall"], 10))
    for k in range(int((z1 - z0)/2.2) + 1):
        flach(zyl(x, y, z0 + 0.4 + k*2.2, 0.075, 0.10, M["metall"], 10))

def _gesims(z, b, t, M, vor=0.16):
    box(0, 0, z, b + vor, t + vor, 0.14, M["stein"])

# ================================================================ 1) Altbau
def _b_altbau():
    """Gruenderzeit-Mietshaus, 11,00 x 9,40 x 15,20 m — vier Geschosse mit
    Sockel, Gesimsen, Erker und Balkonen.

    Was einen Altbau ausmacht, ist nicht die Wandfarbe, sondern das RELIEF:
    Sockelband, Fenstergewaende, Stockwerkgesimse, Kranzgesims. Eine glatte Box
    mit Fenstertextur bleibt eine Box, egal wie gut die Textur ist."""
    M = _mats((0.86,0.74,0.54), None, (0.36,0.34,0.38))
    B, T = 11.00, 9.40
    GH, EG = 3.20, 3.90                       # Regelgeschoss, Erdgeschoss
    box(0, 0, 0.30, B + 0.30, T + 0.30, 0.60, M["sockel"])            # Sockel
    box(0, 0, (EG + 3*GH)/2 + 0.55, B, T, EG + 3*GH - 0.10, M["putz"])
    _gesims(EG + 0.30, B, T, M)
    for g in range(3):
        _gesims(EG + 0.30 + (g + 1)*GH, B, T, M, 0.12)
    _gesims(EG + 3*GH + 0.62, B, T, M, 0.34)                          # Kranzgesims
    # Erdgeschoss: Portal mittig, zwei hohe Fenster
    _tuer(0, 0.60, 1.40, 2.90, M, T/2)
    for s in (-1, 1):
        _fenster(s*3.30, 2.35, 1.50, 2.30, M, T/2)
    # Obergeschosse: 4 Fensterachsen, mittig ein Erker ueber dem Portal
    for g in range(3):
        zz = EG + 0.90 + g*GH + 1.05
        for xa in (-4.10, -1.60, 1.60, 4.10):
            _fenster(xa, zz, 1.20, 1.80, M, T/2)
    for g in range(3):                                                # Erker
        zz = EG + 0.90 + g*GH
        box(0, T/2 + 0.55, zz + 1.05, 2.90, 1.10, GH - 0.30, M["putz2"])
        box(0, T/2 + 1.06, zz + 1.15, 2.30, 0.10, 1.70, M["glas"])
        for s in (-1, 1):
            box(s*1.30, T/2 + 0.82, zz + 1.15, 0.10, 0.55, 1.70, M["glas"])
    box(0, T/2 + 0.55, EG + 0.72, 3.20, 1.30, 0.22, M["stein"])       # Erkerkonsole
    for s in (-1, 1):                                                 # Kragsteine
        strebe((s*1.20, T/2 + 0.20, EG + 0.62), (s*1.20, T/2 + 1.00, EG + 0.10),
               0.20, M["stein"])
    box(0, T/2 + 0.62, EG + 3*GH + 0.30, 3.40, 1.40, 0.16, M["stein"])
    for s in (-1, 1):                                                 # Balkone aussen
        for g in (1, 2):
            zz = EG + 0.90 + g*GH
            box(s*4.10, T/2 + 0.42, zz - 0.10, 2.10, 0.90, 0.16, M["stein"])
            for k in range(7):
                dreh([(0.00,0.00),(0.045,0.00),(0.045,0.05),(0.030,0.09),
                      (0.026,0.20),(0.045,0.32),(0.036,0.40),(0.045,0.44),(0.00,0.46)],
                     M["stein"], 10,
                     x=s*4.10 - 0.90 + k*0.30, y=T/2 + 0.80, z=zz - 0.02, name="Docke")
            box(s*4.10, T/2 + 0.80, zz + 0.46, 2.10, 0.14, 0.09, M["stein"])
    # Dach: flach geneigt mit Attika und zwei Gauben
    box(0, 0, EG + 3*GH + 0.82, B + 0.20, T + 0.20, 0.24, M["dach2"])
    for s in (-1, 1):
        box(s*2.80, T/2 - 1.20, EG + 3*GH + 1.42, 1.60, 1.30, 1.10, M["putz2"])
        box(s*2.80, T/2 - 1.80, EG + 3*GH + 1.42, 1.10, 0.10, 0.80, M["glas"])
        box(s*2.80, T/2 - 1.30, EG + 3*GH + 2.02, 1.90, 1.60, 0.14, M["dach"])
    box(3.90, -T/2 + 1.60, EG + 3*GH + 1.90, 0.80, 0.80, 2.00, M["dach"])   # Kamin
    # Beletage: Verdachung nur ueber dem ERSTEN Obergeschoss. Ueber allen dreien
    # waere es Kitsch — die Staffelung nach oben hin schlichter ist die Regel.
    for xa in (-4.10, -1.60, 1.60, 4.10):
        _verdachung(xa, T/2, EG + 0.90 + 1.05 + 1.10, 1.20, M)
    for sx in (-1, 1):
        for sy in (-1, 1):
            _quaderung(sx*B/2, sy*T/2, 0.62, EG + 0.22, M, 7)
    for sx in (-1, 1):
        _fallrohr(sx*(B/2 - 0.30), T/2 + 0.12, 0.10, EG + 3*GH + 0.70, M)

def altbau(): _modul("th37_altbau", _b_altbau, 0.012)

# ================================================================ 2) Eckhaus
def _b_eckhaus():
    """Eckhaus mit abgerundeter Ecke und Ladenlokal, 10,00 x 10,00 x 12,00 m.
    Die runde Ecke ist ein Drehkoerper-Viertel — als abgeschraegter Quader
    gebaut haette das Haus eine Fase statt eines Rundturms."""
    M = _mats((0.70,0.76,0.72), None, (0.34,0.30,0.32))
    B, T, GH, EG = 10.00, 10.00, 3.10, 4.00
    H = EG + 2*GH
    box(-0.9, 0, H/2, B - 1.8, T, H, M["putz"])
    box(0, -0.9, H/2, B, T - 1.8, H, M["putz"])
    # Rundecke bei (+x, +y)
    dreh([(0.00, 0.00), (4.10, 0.00), (4.10, H), (0.00, H)], M["putz"], 28,
         x=B/2 - 4.10, y=T/2 - 4.10, name="Rundecke")
    box(0, 0, 0.32, B + 0.24, T + 0.24, 0.64, M["sockel"])
    _gesims(EG, B, T, M, 0.20)
    _gesims(EG + GH, B, T, M, 0.10)
    _gesims(H + 0.10, B, T, M, 0.40)
    dreh([(0.00, EG - 0.16), (4.34, EG - 0.16), (4.34, EG + 0.10), (0.00, EG + 0.10)],
         M["stein"], 28, x=B/2 - 4.10, y=T/2 - 4.10, name="Eckgesims")
    # Ladenfront im Erdgeschoss (Schauseite +y und -x)
    for xa in (-3.40, -1.10):
        box(xa, T/2 + 0.02, 2.20, 1.90, 0.10, 2.60, M["glas"])
        _rahmen(xa, T/2 + 0.04, 2.20, 1.90, 2.60, 0.11, M)
    box(-2.25, T/2 + 0.62, 3.90, 5.20, 1.30, 0.26, M["markise"])       # Markise
    for s in (-1, 1):
        strebe((-2.25 + s*2.4, T/2 + 0.10, 4.05), (-2.25 + s*2.4, T/2 + 1.20, 3.86),
               0.07, M["eisen"])
    _tuer(-4.70, 0.55, 1.20, 2.60, M, T/2)
    # Obergeschosse
    for g in range(2):
        zz = EG + 0.30 + g*GH + 1.00
        for xa in (-3.60, -1.20):
            _fenster(xa, zz, 1.10, 1.70, M, T/2)
        for i in range(3):                                              # Rundecke
            a = math.radians(22 + i*23)
            cx, cy = B/2 - 4.10 + math.cos(a)*4.02, T/2 - 4.10 + math.sin(a)*4.02
            f = box(cx, cy, zz, 1.00, 0.14, 1.70, M["glas"])
            f.rotation_euler[2] = a - math.pi/2
            r2 = box(cx, cy, zz, 1.16, 0.09, 1.86, M["rahm"])
            r2.rotation_euler[2] = a - math.pi/2
    # Dach: Zeltdach ueber dem Rundturm, Flachdach ueber dem Rest
    box(-0.9, 0, H + 0.36, B - 1.6, T + 0.2, 0.30, M["dach2"])
    box(0, -0.9, H + 0.36, B + 0.2, T - 1.6, 0.30, M["dach2"])
    dreh([(0.00, H + 0.20), (4.34, H + 0.20), (4.20, H + 0.60), (3.20, H + 1.50),
          (1.70, H + 2.20), (0.00, H + 2.45)], M["dach"], 28,
         x=B/2 - 4.10, y=T/2 - 4.10, name="Turmdach")
    flach(kugel(B/2 - 4.10, T/2 - 4.10, H + 2.60, 0.22, M["gold"], 12))
    strebe((B/2 - 4.10, T/2 - 4.10, H + 2.70), (B/2 - 4.10, T/2 - 4.10, H + 3.20),
           0.05, M["gold"])
    _schild(-2.25, T/2, 4.28, 4.60, M)
    for g in range(2):
        zz = EG + 0.30 + g*GH + 1.00
        for xa in (-3.60, -1.20):
            _laden_flgl(xa, T/2, zz, 1.10, 1.70, M)
    _fallrohr(-B/2 + 0.24, T/2 - 0.12, 0.10, H + 0.05, M)

def eckhaus(): _modul("th37_eckhaus", _b_eckhaus, 0.012)

# ================================================================ 3) Reihenhaus
def _b_reihenhaus():
    """Schmales Reihenhaus mit Giebel zur Strasse, 6,00 x 8,60 x 11,40 m.
    Reihbar: die Seitenwaende sind flach, x += 6,00."""
    M = _mats((0.80,0.54,0.44), None, (0.42,0.26,0.22))
    B, T, GH = 6.00, 8.60, 2.90
    KH = 2*GH + 0.60                                   # Traufhoehe
    box(0, 0, 0.26, B + 0.16, T + 0.16, 0.52, M["sockel"])
    box(0, 0, KH/2 + 0.40, B, T, KH, M["putz2"])
    _gesims(GH + 0.55, B, T, M, 0.10)
    _tuer(-1.55, 0.50, 1.10, 2.35, M, T/2)
    _fenster(1.35, 1.85, 1.60, 1.60, M, T/2)
    for xa in (-1.55, 1.35):
        _fenster(xa, GH + 2.10, 1.30, 1.60, M, T/2)
    # Giebel + Satteldach
    # Giebel als Profil-Prisma. `th_werkzeug` hat keinen Giebel-Helfer — und ein
    # `kegel(vertices=3)` waere eine Pyramide mit Ecken auf den Achsen, nicht das
    # gewuenschte Dreiecksprisma.
    keil_y([(-B/2 - 0.20, KH + 0.40), (B/2 + 0.20, KH + 0.40), (0, KH + 2.70)],
           0, T + 0.40, M["dach"], name="Giebel")
    box(0, 0, KH + 0.40, B + 0.28, T + 0.50, 0.16, M["holz"])          # Traufbrett
    _fenster(0, KH + 1.30, 0.90, 1.00, M, T/2 + 0.20, False)
    _dachziegel(KH + 0.40, B/2 + 0.20, 2.30, T + 0.40, M, 9)
    _laden_flgl(1.35, T/2, 1.85, 1.60, 1.60, M)
    for xa in (-1.55, 1.35):
        _laden_flgl(xa, T/2, GH + 2.10, 1.30, 1.60, M)
    _fallrohr(B/2 - 0.22, T/2 + 0.10, 0.10, KH + 0.30, M)
    box(2.30, -T/2 + 2.20, KH + 2.40, 0.70, 0.70, 1.80, M["dach"])     # Kamin
    for k in range(3):                                                  # Blumenkasten
        box(1.35, T/2 + 0.16, 1.10, 1.70, 0.26, 0.24, M["holz"])
        flach(kugel(0.75 + k*0.60, T/2 + 0.16, 1.32, 0.17, M["laub"], 8))
        flach(kugel(0.75 + k*0.60, T/2 + 0.16, 1.44, 0.08, M["bluete"], 8))

def reihenhaus(): _modul("th37_reihenhaus", _b_reihenhaus, 0.010)

# ================================================================ 4) Cafe
def _b_cafe():
    """Eckcafe mit Terrasse, 9,00 x 7,40 x 7,60 m — Markise, vier Tische mit
    Stuehlen und Sonnenschirmen, Pflanzkuebel als Terrassengrenze."""
    M = _mats((0.94,0.86,0.68), None, (0.38,0.32,0.34))
    B, T, EG = 9.00, 7.40, 4.10
    box(0, -1.2, 0.26, B + 0.16, T - 2.2, 0.52, M["sockel"])
    box(0, -1.2, EG/2 + 0.40, B, T - 2.4, EG, M["putz"])
    box(0, -1.2, EG + 0.55, B + 0.30, T - 2.1, 0.26, M["stein"])
    box(0, -1.2, EG + 1.55, B - 0.6, T - 3.0, 1.70, M["putz2"])       # Obergeschoss
    box(0, -1.2, EG + 2.52, B + 0.24, T - 2.7, 0.24, M["dach2"])
    ty = T/2 - 2.4
    for xa in (-2.80, 0.0, 2.80):
        box(xa, ty + 0.02, 2.10, 2.20, 0.10, 2.60, M["glas"])
        _rahmen(xa, ty + 0.04, 2.10, 2.20, 2.60, 0.11, M)
    _tuer(-3.80, 0.50, 1.10, 2.50, M, ty)
    box(0, ty + 1.05, 3.86, B - 0.4, 2.10, 0.22, M["markise"])         # Markise
    _schild(0, ty, 4.72, 5.20, M, "markise")
    for xa in (-3.6, 0, 3.6):
        strebe((xa, ty + 0.10, 3.95), (xa, ty + 2.05, 3.62), 0.07, M["eisen"])
    for xa in (-3.4, 3.4):                                             # Terrasse
        for yy in (ty + 1.9, ty + 3.6):
            zyl(xa, yy, 0.36, 0.05, 0.72, M["eisen"], 10)
            flach(zyl(xa, yy, 0.75, 0.62, 0.06, M["holz"], 20))
            for k in range(3):
                a = TAU*k/3 + 0.4
                sx, sy = xa + math.cos(a)*0.92, yy + math.sin(a)*0.92
                zyl(sx, sy, 0.22, 0.035, 0.44, M["eisen"], 8)
                flach(zyl(sx, sy, 0.46, 0.20, 0.05, M["holz"], 12))
                st = box(sx, sy, 0.70, 0.36, 0.05, 0.44, M["eisen"])
                st.rotation_euler[2] = a
            zyl(xa, yy, 1.30, 0.035, 1.10, M["eisen"], 8)              # Schirm
            dreh([(0.00, 2.20), (1.35, 1.80), (1.42, 1.72), (0.00, 2.12)],
                 M["markise"], 20, x=xa, y=yy, name="Schirm")
    for xa in (-4.2, -1.4, 1.4, 4.2):                                  # Kuebel
        dreh([(0.00,0.00),(0.32,0.00),(0.30,0.55),(0.34,0.62),(0.28,0.66),(0.00,0.62)],
             M["stein"], 20, x=xa, y=ty + 4.6, name="Kuebel")
        for k in range(4):
            a = TAU*k/4 + 0.5
            flach(kugel(xa + math.cos(a)*0.16, ty + 4.6 + math.sin(a)*0.16, 0.78,
                        0.18, M["laub"], 8))
        flach(kugel(xa, ty + 4.6, 0.92, 0.09, M["bluete"], 8))

def cafe(): _modul("th37_cafe", _b_cafe, 0.010)

# ================================================================ 5-8) Fahrzeuge
def _wagen(prof, breite, lack, M, radstand, r_rad, dach_ab=0.0):
    """Gemeinsamer Aufbau aller vier Wagen: Karosserie aus dem Seitenprofil,
    Fensterband, Raeder, Leuchten, Stossfaenger, Kennzeichen.
    So bleiben die Fahrzeuge untereinander stimmig, ohne dass vier Mal dasselbe
    dasteht — die Form steckt allein im uebergebenen Profil."""
    keil_y(prof, 0.0, breite, lack, name="Karosse")
    for s in (-1, 1):                                                  # Raeder
        for xr in radstand:
            rad(xr, s*(breite/2 - 0.09), r_rad, r_rad, 0.20, M["felge"], M["reifen"])
    xs = [p[0] for p in prof]
    L = max(xs) - min(xs)
    box(min(xs) + 0.06, 0, r_rad + 0.16, 0.16, breite - 0.14, 0.26, M["chrom"])
    box(max(xs) - 0.06, 0, r_rad + 0.16, 0.16, breite - 0.14, 0.26, M["chrom"])
    for s in (-1, 1):
        box(max(xs) - 0.04, s*(breite/2 - 0.30), r_rad + 0.40, 0.10, 0.34, 0.18, M["licht"])
        box(min(xs) + 0.04, s*(breite/2 - 0.28), r_rad + 0.42, 0.10, 0.30, 0.14, M["rueck"])
        box(max(xs) - 0.30, s*(breite/2 + 0.01), r_rad + 0.62, 0.16, 0.06, 0.10, M["chrom"])
    box(max(xs) - 0.02, 0, r_rad + 0.02, 0.06, 0.44, 0.14, M["chrom"])   # Kennzeichen
    box(min(xs) + 0.02, 0, r_rad + 0.02, 0.06, 0.44, 0.14, M["chrom"])

def _b_limousine():
    """Viertuerige Limousine, 4,56 x 1,82 x 1,46 m. Das Profil ist der ganze
    Wagen: flache Haube, 28-Grad-Scheibe, lange Dachlinie, kurzes Heck."""
    M = _mats()
    R, BR = 0.33, 1.82
    P = [(-2.28,0.18),(-2.28,0.62),(-1.95,0.66),(-1.30,0.70),(-0.80,1.06),
         (-0.10,1.42),(0.95,1.44),(1.55,1.06),(2.05,0.70),(2.28,0.62),(2.28,0.20),
         (1.70,0.14),(0.60,0.12),(-0.70,0.12),(-1.80,0.14)]
    _wagen(P, BR, M["lackA"], M, (-1.44, 1.42), R)
    for s in (-1, 1):                                                  # Fensterband
        keil_y([(-0.62,0.98),(-0.02,1.30),(0.86,1.32),(1.32,1.00)],
               s*(BR/2 - 0.03), 0.06, M["scheibe"], name="Seitenglas")
    keil_y([(0.94,1.32),(1.48,1.02),(1.52,0.98),(0.92,1.28)], 0, BR - 0.22,
           M["scheibe"], name="Frontscheibe")
    keil_y([(-0.72,1.00),(-0.10,1.36),(-0.06,1.32),(-0.68,0.96)], 0, BR - 0.22,
           M["scheibe"], name="Heckscheibe")
    for s in (-1, 1):                                                  # Spiegel
        box(1.12, s*(BR/2 + 0.10), 1.08, 0.20, 0.12, 0.10, M["lackA"])

def limousine(): _modul("th37_limousine", _b_limousine, 0.014)

def _b_kombi():
    """Kombi, 4,72 x 1,86 x 1,62 m — Dachlinie laeuft bis ans Heck durch,
    Heckklappe steil. Dachreling obenauf."""
    M = _mats()
    R, BR = 0.34, 1.86
    P = [(-2.36,0.18),(-2.36,0.66),(-2.30,1.52),(-1.10,1.60),(0.40,1.62),
         (1.10,1.58),(1.62,1.10),(2.10,0.72),(2.36,0.64),(2.36,0.20),
         (1.72,0.14),(0.50,0.12),(-0.80,0.12),(-1.86,0.14)]
    _wagen(P, BR, M["lackD"], M, (-1.50, 1.48), R)
    for s in (-1, 1):
        keil_y([(-2.10,1.00),(-2.06,1.44),(-0.10,1.48),(-0.06,1.02)],
               s*(BR/2 - 0.03), 0.06, M["scheibe"], name="Seitenglas")
        keil_y([(0.10,1.02),(0.14,1.46),(0.98,1.42),(1.24,1.02)],
               s*(BR/2 - 0.03), 0.06, M["scheibe"], name="Seitenglas2")
        box(0, s*(BR/2 - 0.20), 1.66, 2.60, 0.07, 0.07, M["chrom"])     # Reling
    keil_y([(1.04,1.46),(1.58,1.10),(1.62,1.06),(1.02,1.42)], 0, BR - 0.22,
           M["scheibe"], name="Frontscheibe")
    keil_y([(-2.32,1.48),(-2.28,1.02),(-2.24,1.04),(-2.28,1.46)], 0, BR - 0.22,
           M["scheibe"], name="Heckscheibe")

def kombi(): _modul("th37_kombi", _b_kombi, 0.014)

def _b_sportwagen():
    """Sportcoupe, 4,26 x 1,88 x 1,20 m — tief, lange Haube, Fastback-Heck.
    Der Unterschied zur Limousine steckt NUR im Profil: Dachhoehe 1,18 statt
    1,44 und die Scheibe faellt ueber die ganze hintere Haelfte ab."""
    M = _mats()
    R, BR = 0.32, 1.88
    P = [(-2.13,0.16),(-2.13,0.52),(-1.60,0.62),(-0.70,1.00),(0.10,1.18),
         (0.80,1.16),(1.42,0.86),(2.00,0.58),(2.13,0.50),(2.13,0.18),
         (1.60,0.10),(0.40,0.08),(-0.80,0.08),(-1.70,0.12)]
    _wagen(P, BR, M["lackB"], M, (-1.34, 1.34), R)
    for s in (-1, 1):
        keil_y([(-0.40,0.86),(0.18,1.06),(0.76,1.04),(1.06,0.84)],
               s*(BR/2 - 0.03), 0.06, M["scheibe"], name="Seitenglas")
        box(1.02, s*(BR/2 + 0.08), 0.86, 0.18, 0.10, 0.08, M["lackB"])
    keil_y([(0.84,1.06),(1.40,0.88),(1.44,0.84),(0.82,1.02)], 0, BR - 0.24,
           M["scheibe"], name="Frontscheibe")
    keil_y([(-0.50,0.88),(0.14,1.10),(0.18,1.06),(-0.46,0.84)], 0, BR - 0.24,
           M["scheibe"], name="Heckscheibe")
    box(-2.02, 0, 1.06, 0.16, BR - 0.42, 0.06, M["lackB"])              # Heckfluegel
    for s in (-1, 1):
        box(-2.02, s*(BR/2 - 0.24), 0.94, 0.10, 0.06, 0.20, M["lackB"])

def sportwagen(): _modul("th37_sportwagen", _b_sportwagen, 0.012)

def _b_lieferwagen():
    """Lieferwagen, 5,20 x 2,00 x 2,42 m — Kastenaufbau, kurze Schnauze,
    Schiebetuer und Fluegeltueren hinten."""
    M = _mats()
    R, BR = 0.37, 2.00
    P = [(-2.60,0.20),(-2.60,2.42),(1.20,2.42),(1.55,1.30),(2.20,0.78),
         (2.60,0.70),(2.60,0.22),(1.90,0.14),(0.40,0.12),(-1.20,0.12),(-2.10,0.14)]
    _wagen(P, BR, M["lackC"], M, (-1.66, 1.66), R)
    keil_y([(1.24,2.36),(1.52,1.34),(1.56,1.30),(1.22,2.32)], 0, BR - 0.24,
           M["scheibe"], name="Frontscheibe")
    for s in (-1, 1):
        keil_y([(0.28,1.30),(0.30,2.10),(1.10,2.12),(1.16,1.32)],
               s*(BR/2 - 0.03), 0.06, M["scheibe"], name="Seitenglas")
        box(0.06, s*(BR/2 + 0.005), 1.30, 1.90, 0.05, 2.10, M["lackC"])  # Schiebetuer
        box(0.06, s*(BR/2 + 0.03), 1.24, 0.16, 0.06, 0.06, M["chrom"])
        box(1.14, s*(BR/2 + 0.09), 1.44, 0.16, 0.12, 0.14, M["lackC"])
    for s in (-1, 1):                                                    # Fluegeltueren
        box(-2.59, s*(BR/4), 1.30, 0.04, BR/2 - 0.10, 2.10, M["lackC"])
    box(0, 0, 2.46, 4.40, BR - 0.30, 0.08, M["lackC"])                   # Dachreling

def lieferwagen(): _modul("th37_lieferwagen", _b_lieferwagen, 0.012)

# ================================================================ 9-10) Jahrmarkt
def _b_schiessbude():
    """Jahrmarkt-Schiessbude, 4,40 x 2,60 x 3,60 m.

    ⚠️ Familienfreundlich und ausdruecklich OHNE echte Waffen: auf der Theke
    liegen zwei bunte Budengewehre mit Korkkugel — Spielzeug in Spielzeugfarben,
    mit Formen, die nichts nachbilden. Geschossen wird auf Klappziele, Blechdosen
    und Papierblumen, wie es auf jeder Chilbi steht."""
    M = _mats()
    B, T, H = 4.40, 2.60, 2.90
    box(0, 0, 0.06, B + 0.30, T + 0.30, 0.12, M["holz"])                # Podest
    for s in (-1, 1):                                                    # Eckpfosten
        for q in (-1, 1):
            box(s*(B/2 - 0.09), q*(T/2 - 0.09), H/2 + 0.10, 0.18, 0.18, H, M["budeA"])
    box(0, -T/2 + 0.10, H/2 + 0.10, B, 0.20, H, M["budeB"])              # Rueckwand
    for s in (-1, 1):
        box(s*(B/2 - 0.10), 0, H/2 + 0.10, 0.20, T, H, M["budeB"])
    box(0, T/2 - 0.24, 0.62, B - 0.30, 0.52, 1.00, M["budeA"])           # Theke
    box(0, T/2 - 0.24, 1.16, B - 0.10, 0.66, 0.09, M["holz"])
    # Baldachin mit Zackenblende
    box(0, 0.10, H + 0.32, B + 0.60, T + 0.50, 0.16, M["budeA"])
    for k in range(11):
        # rot=(pi,0,0): die Zacke haengt, sie steht nicht. Ohne die Drehung zeigen
        # alle Spitzen nach oben und die Blende sieht aus wie eine Krone.
        kegel(-B/2 - 0.18 + k*(B + 0.36)/10, T/2 + 0.24, H + 0.10, 0.24, 0.0, 0.34,
              M["budeB"] if k % 2 else M["gelb"], 3, rot=(math.pi, 0, 0))
    for k in range(9):                                                   # Lichterkette
        flach(kugel(-B/2 + 0.30 + k*(B - 0.60)/8, T/2 + 0.30, H + 0.22, 0.075,
                    M["gelb"] if k % 2 else M["orange"], 8))
    # Klappziele in drei Reihen
    for r in range(3):
        zz = 1.55 + r*0.52
        for k in range(6):
            xk = -B/2 + 0.48 + k*(B - 0.96)/5
            flach(zyl(xk, -T/2 + 0.34, zz, 0.13, 0.05,
                      [M["gelb"], M["blau"], M["gruen"], M["orange"]][(k + r) % 4],
                      14, (math.pi/2, 0, 0)))
            flach(zyl(xk, -T/2 + 0.31, zz, 0.055, 0.04, M["budeB"], 10, (math.pi/2, 0, 0)))
            strebe((xk, -T/2 + 0.36, zz - 0.13), (xk, -T/2 + 0.36, 1.28), 0.025, M["eisen"])
    for k in range(5):                                                   # Blechdosen
        zyl(-B/2 + 0.55 + k*(B - 1.10)/4, -T/2 + 0.70, 1.36, 0.075, 0.20,
            M["blau"] if k % 2 else M["orange"], 12)
    # Zwei Budengewehre auf der Theke — Spielzeug, klar erkennbar
    for s in (-1, 1):
        gx = s*1.25
        box(gx, T/2 - 0.24, 1.26, 0.90, 0.10, 0.09, M["gelb"])           # Lauf
        box(gx - s*0.42, T/2 - 0.24, 1.24, 0.30, 0.13, 0.16, M["blau"])  # Schaft
        box(gx - s*0.52, T/2 - 0.24, 1.15, 0.14, 0.11, 0.14, M["blau"])
        flach(kugel(gx + s*0.46, T/2 - 0.24, 1.26, 0.055, M["kork"], 9)) # Korkkugel
        flach(zyl(gx + s*0.10, T/2 - 0.24, 1.33, 0.045, 0.10, M["orange"], 10,
                  (0, math.pi/2, 0)))
    box(0, T/2 + 0.30, H - 0.30, 3.20, 0.10, 0.62, M["gelb"])            # Schild
    for k in range(6):
        flach(kugel(-1.30 + k*0.52, T/2 + 0.24, H - 0.30, 0.10,
                    M["budeA"] if k % 2 else M["blau"], 8))

def schiessbude(): _modul("th37_schiessbude", _b_schiessbude, 0.008)

def _b_wasserpistole():
    """Spielzeug-Wasserpistole als Jahrmarkt-Requisite, 0,62 x 0,16 x 0,42 m.

    ⚠️ Bewusst als SPIELZEUG modelliert: knallgelb-blau-orange, runder Tank
    obenauf, dicke Duese, weiche Formen. Kein Vorbild, keine realen Masse — ein
    Prop fuer Buden und Kinderhaende, nichts, was man als Vorlage brauchen
    koennte."""
    M = _mats()
    keil_y([(-0.20,0.00),(-0.06,0.02),(-0.02,0.16),(0.10,0.20),(0.30,0.20),
            (0.30,0.30),(0.10,0.30),(-0.06,0.26),(-0.14,0.14),(-0.30,0.06)],
           0, 0.13, M["gelb"], name="Griffkoerper")
    flach(zyl(0.20, 0, 0.36, 0.09, 0.30, M["blau"], 20, (0, math.pi/2, 0)))  # Tank
    flach(kugel(0.35, 0, 0.36, 0.09, M["blau"], 12))
    flach(kugel(0.05, 0, 0.36, 0.09, M["blau"], 12))
    flach(zyl(0.36, 0, 0.25, 0.045, 0.16, M["orange"], 14, (0, math.pi/2, 0)))  # Duese
    flach(zyl(0.45, 0, 0.25, 0.055, 0.05, M["orange"], 14, (0, math.pi/2, 0)))
    box(-0.02, 0, 0.13, 0.06, 0.05, 0.10, M["orange"])                   # Abzug
    box(-0.16, 0, 0.05, 0.16, 0.14, 0.10, M["blau"])
    flach(zyl(0.18, 0, 0.44, 0.035, 0.22, M["orange"], 10, (0, math.pi/2, 0)))
    for k in range(3):
        flach(kugel(0.10 + k*0.10, 0, 0.46, 0.035, M["gruen"], 8))

def wasserpistole(): _modul("th37_wasserpistole", _b_wasserpistole, 0.006)

# ================================================================ 11) Strassenzug
def _teil(fn, px, py, rot=0.0, pz=0.0):
    vor = set(bpy.context.scene.objects)
    fn()
    emp = bpy.data.objects.new("Platz", None); bpy.context.collection.objects.link(emp)
    emp.location = (px, py, pz); emp.rotation_euler[2] = rot
    for o in list(bpy.context.scene.objects):
        if o in vor or o is emp: continue
        o.parent = emp
    return emp

def strassenzug():
    """Ein Stueck Strasse aus den Teilen dieser Charge — der Massstabs-Test.
    Ein Auto allein sieht immer richtig aus; erst vor einem Haus faellt auf,
    wenn es zu gross ist. Fahrbahn 7 m, Gehweg beidseits."""
    neu()
    M = _mats()
    # ⚠️ Erst lag die Strasse bei y = -6, also HINTER den Haeusern: deren
    # Schauseite ist +y. Im Render sah man eine Haeuserzeile und sonst nichts,
    # die vier Wagen standen verdeckt dahinter.
    box(0, 10.5, 0.01, 44, 7.0, 0.02, M["sockel"])                   # Fahrbahn
    for yy in (6.6, 14.4):
        box(0, yy, 0.07, 44, 1.8, 0.14, M["stein"])                  # Gehwege
    _teil(_b_altbau, -13.0, 0)
    _teil(_b_eckhaus, 0.5, 0.4)
    _teil(_b_reihenhaus, 9.5, -0.3)
    _teil(_b_reihenhaus, 15.5, -0.3)
    _teil(_b_cafe, -22.0, -0.6)
    _teil(_b_limousine, -15.0, 8.6, 0)                # am Bordstein, Front +x
    _teil(_b_kombi, -7.0, 8.6, 0)
    _teil(_b_sportwagen, 4.0, 12.4, math.pi)          # Gegenrichtung
    _teil(_b_lieferwagen, 14.0, 8.6, 0)
    _teil(_b_schiessbude, 21.0, 4.2)
    _teil(_b_wasserpistole, 18.6, 5.0, 0.4, 1.10)     # auf der Theke danebengelegt
    export("th37_strassenzug", 0.012, 2)

if __name__ == "__main__":
    print("Asset-Charge 37 (th37, Stadthaeuser, Fahrzeuge, Schiessbude):")
    for fn in (altbau, eckhaus, reihenhaus, cafe, limousine, kombi, sportwagen,
               lieferwagen, schiessbude, wasserpistole, strassenzug):
        fn()
    print("fertig")
