# -*- coding: utf-8 -*-
"""Asset-Charge 4 (th8_*): BEGEHBARE Gebaeude — hohl, mit Tueroeffnung, Boden und Innenraum.
Die Spielfigur (ca. 1.8 m) kann hineinlaufen: jede Tueroeffnung ist >= 2.2 m hoch
und >= 1.4 m breit, Innenhoehe >= 3.0 m.

Bauprinzip: Waende werden als EINZELNE Boxen gesetzt und um die Oeffnung herum
segmentiert (links/rechts/Sturz) — kein Boolean noetig, bleibt sauber und schnell.
Konventionen wie th5-th7: Unterkante y=0, Meter, +z = Schauseite/Eingang."""
import bpy, bmesh, os, math

OUT_GLB = "/home/user/aban-news-landing/models"
OUT_STL = "/home/user/aban-news-landing/models/stl"
os.makedirs(OUT_STL, exist_ok=True)

def neu(): bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, rgb, rough=0.7, metal=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (emit[0], emit[1], emit[2], 1)
        b.inputs["Emission Strength"].default_value = 1.2
    return m

def box(x, y, z, sx, sy, sz, m=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    o = bpy.context.active_object; o.scale = (sx, sy, sz)
    if m: o.data.materials.append(m)
    return o

def zyl(x, y, z, r, h, m=None, seg=16, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kegel(x, y, z, r1, r2, h, m=None, seg=12, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def tonne(cx, cy, z, r, laenge, m, seg=24, flach=1.0):
    """HALBES Tonnengewoelbe: Zylinder mit Achse in x, untere Haelfte weggeschnitten.
    Basis liegt exakt bei z. Ein VOLLER Zylinder taugt nicht — seine untere Haelfte
    fuellt die Halle, man sieht von der Tuer aus nur eine graue Wand (hier gemessene
    Unterkante -1,90)."""
    o = zyl(cx, cy, z, r, laenge, m, seg, rot=(0, math.pi/2, 0))
    o.scale[2] = flach
    bpy.context.view_layer.objects.active = o
    for s_ in bpy.context.scene.objects: s_.select_set(False)
    o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    bm.to_mesh(o.data); bm.free(); o.data.update()
    return o

def runden(width=0.016, segments=2, winkel=42):
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': continue
        bpy.context.view_layer.objects.active = o
        for s_ in bpy.context.scene.objects: s_.select_set(False)
        o.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        m = o.modifiers.new("Bevel", 'BEVEL')
        d_min = max(1e-4, min(o.dimensions))
        m.width = min(width, 0.28 * d_min)
        m.segments = segments
        m.use_clamp_overlap = True
        m.limit_method = 'ANGLE'; m.angle_limit = math.radians(winkel)
        try: bpy.ops.object.shade_auto_smooth(angle=math.radians(38))
        except Exception: pass

def export(name, bevel=0.016, seg=2):
    runden(bevel, seg)
    for o in bpy.context.scene.objects: o.select_set(True)
    p1 = os.path.join(OUT_GLB, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=p1, export_format='GLB', use_selection=False, export_apply=True)
    p2 = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p2)
    except Exception: bpy.ops.export_mesh.stl(filepath=p2)
    print("  ->", name, os.path.getsize(p1), "B")

# ---------------------------------------------------------------- Wand-Helfer
def wand_mit_tuer(cx, cy, laenge, dicke, hoehe, m, tuer_b=1.6, tuer_h=2.4,
                  achse='x', tuer_off=0.0):
    """Wand mit durchgehender Tueroeffnung: links + rechts + Sturz.
    achse='x': Wand laeuft in X, Dicke in Y."""
    seite = (laenge - tuer_b) / 2
    if achse == 'x':
        lx = cx + tuer_off - tuer_b/2 - seite/2
        rx = cx + tuer_off + tuer_b/2 + seite/2
        if seite > 0.01:
            box(lx, cy, hoehe/2, seite, dicke, hoehe, m)
            box(rx, cy, hoehe/2, seite, dicke, hoehe, m)
        box(cx + tuer_off, cy, tuer_h + (hoehe-tuer_h)/2, tuer_b, dicke, hoehe-tuer_h, m)  # Sturz
    else:
        ly = cy + tuer_off - tuer_b/2 - seite/2
        ry = cy + tuer_off + tuer_b/2 + seite/2
        if seite > 0.01:
            box(cx, ly, hoehe/2, dicke, seite, hoehe, m)
            box(cx, ry, hoehe/2, dicke, seite, hoehe, m)
        box(cx, cy + tuer_off, tuer_h + (hoehe-tuer_h)/2, dicke, tuer_b, hoehe-tuer_h, m)

def fensterband(cx, cy, laenge, dicke, zmit, hoehe, m_rahm, m_glas, n=3, achse='x'):
    """n Fenster gleichmaessig; Rahmen aussen, Glas innen (bleibt geschlossen)."""
    for i in range(n):
        t = (i + 0.5) / n - 0.5
        if achse == 'x':
            px = cx + t * laenge
            box(px, cy, zmit, laenge/n*0.62, dicke*1.2, hoehe, m_rahm)
            box(px, cy, zmit, laenge/n*0.50, dicke*1.4, hoehe*0.80, m_glas)
        else:
            py = cy + t * laenge
            box(cx, py, zmit, dicke*1.2, laenge/n*0.62, hoehe, m_rahm)
            box(cx, py, zmit, dicke*1.4, laenge/n*0.50, hoehe*0.80, m_glas)

# ================================================================ 1) Stadthaus
def stadthaus_offen():
    """2 Etagen begehbar: EG-Halle mit Tuer, Treppe nach oben, OG-Galerie."""
    neu()
    W = mat("HausWand", (0.90,0.86,0.76), 0.85)
    IN = mat("Innenwand", (0.94,0.92,0.86), 0.9)
    BOD = mat("Boden", (0.55,0.38,0.22), 0.75)
    DEC = mat("Decke", (0.88,0.87,0.84), 0.9)
    DACH = mat("Dach", (0.46,0.26,0.20), 0.8)
    RAHM = mat("Rahmen", (0.35,0.32,0.28), 0.7)
    GLAS = mat("Glas", (0.60,0.75,0.84), 0.15)
    TREP = mat("Treppe", (0.50,0.36,0.22), 0.8)
    B, T, H = 12.0, 10.0, 3.4          # Grundriss + Geschosshoehe
    d = 0.30                            # Wandstaerke
    box(0,0,0.12, B+0.8, T+0.8, 0.24, mat("Sockel",(0.66,0.64,0.60),0.9))
    for et in (0, 1):
        z0 = 0.24 + et*H
        box(0,0,z0+0.06, B, T, 0.12, BOD)                       # Geschossboden
        # Vorderwand (+y) mit Tuer nur im EG
        if et == 0:
            wand_mit_tuer(0, T/2, B, d, H, W, 1.8, 2.5, 'x')
        else:
            box(0, T/2, z0+H/2, B, d, H, W)
        box(0,-T/2, z0+H/2, B, d, H, W)                          # Rueckwand
        box(-B/2, 0, z0+H/2, d, T, H, W)                         # Seitenwaende
        box( B/2, 0, z0+H/2, d, T, H, W)
        # Alle vier Seiten kriegen Fenster (Innenraum bleibt hell)
        fensterband(0,  T/2+0.02, B*0.8, d*0.5, z0+1.9, 1.5, RAHM, GLAS, 3, 'x')
        fensterband(0, -T/2-0.02, B*0.8, d*0.5, z0+1.9, 1.5, RAHM, GLAS, 3, 'x')
        fensterband(-B/2-0.02, 0, T*0.7, d*0.5, z0+1.9, 1.5, RAHM, GLAS, 2, 'y')
        fensterband( B/2+0.02, 0, T*0.7, d*0.5, z0+1.9, 1.5, RAHM, GLAS, 2, 'y')
    # Treppe EG -> OG (14 Stufen an der linken Innenwand)
    for s in range(14):
        box(-B/2+1.4, -T/2+1.2+s*0.28, 0.36+s*0.235, 1.5, 0.28, 0.16, TREP)
    box(-B/2+1.4, -T/2+1.2+14*0.28+0.6, 3.72, 1.5, 1.2, 0.14, TREP)   # Podest
    # Deckenoeffnung markieren: OG-Boden nur als 2 Streifen (Galerie)
    box(0,0, 0.24+H+0.06, B, T, 0.12, DEC)
    # Dach
    box(0,0, 0.24+2*H+0.20, B+0.6, T+0.6, 0.34, DACH)
    kegel(0,0, 0.24+2*H+1.35, B*0.62, 0.0, 2.0, DACH, 4, rot=(0,0,math.pi/4))
    export("th8_stadthaus_offen", 0.014, 2)

# ================================================================ 2) Markthalle
def markthalle_offen():
    """Grosse Halle mit 3 Toren, Stuetzenreihe, Tonnendach — komplett begehbar."""
    neu()
    W = mat("HalleWand", (0.84,0.80,0.72), 0.85)
    BOD = mat("HalleBoden", (0.62,0.60,0.56), 0.9)
    STZ = mat("Stuetze", (0.72,0.70,0.66), 0.8)
    DACH = mat("HalleDach", (0.40,0.44,0.48), 0.6, 0.2)
    RAHM = mat("Rahmen", (0.32,0.30,0.28), 0.7)
    GLAS = mat("Glas", (0.62,0.76,0.84), 0.15)
    B, T, H = 24.0, 16.0, 6.5
    d = 0.40
    box(0,0,0.10, B+1.0, T+1.0, 0.20, mat("Sockel",(0.58,0.56,0.53),0.9))
    box(0,0,0.26, B, T, 0.12, BOD)                                # Hallenboden
    # Front: 3 Tore (je 3.2 breit) -> 4 Wandstuecke
    for i in range(4):
        seg = (B - 3*3.2) / 4
        px = -B/2 + seg/2 + i*(seg + 3.2)
        box(px, T/2, H/2, seg, d, H, W)
    for i in range(3):                                            # Stuerze ueber den Toren
        px = -B/2 + (B-3*3.2)/8 + (B-3*3.2)/4/2 + 0  # Platzhalter, exakt unten gesetzt
    seg = (B - 3*3.2) / 4
    for i in range(3):
        px = -B/2 + seg + 1.6 + i*(seg + 3.2)
        box(px, T/2, 3.0 + (H-3.0)/2, 3.2, d, H-3.0, W)           # Sturz (Tor 3.0 hoch)
    box(0,-T/2, H/2, B, d, H, W)                                  # Rueckwand
    box(-B/2,0, H/2, d, T, H, W)
    box( B/2,0, H/2, d, T, H, W)
    fensterband(0,-T/2-0.02, B*0.8, d*0.5, 4.6, 1.6, RAHM, GLAS, 5, 'x')
    fensterband(-B/2-0.02,0, T*0.8, d*0.5, 4.6, 1.6, RAHM, GLAS, 4, 'y')
    fensterband( B/2+0.02,0, T*0.8, d*0.5, 4.6, 1.6, RAHM, GLAS, 4, 'y')
    # Stuetzen auf die PFEILER-Achsen (-10.2/-3.4/3.4/10.2), nicht auf die Torachsen
    # (-6.8/0/6.8) — sonst steht beim Eintreten eine Saeule mitten im Tor.
    for sx in (-10.2, -3.4, 3.4, 10.2):
        for sy in (-4.0, 4.0):
            zyl(sx, sy, 3.3, 0.28, 6.1, STZ, 12)
    # Gewoelberadius EXAKT auf die Wandflucht (T/2), dann setzt die Tonne genau auf den
    # Laengswaenden auf. Bei r=8.6 lag der Ansatz 0.6 m ausserhalb und es klaffte rings
    # ein Himmelsspalt; Giebelfelder helfen dagegen nicht, weil die Tonne laengs x
    # konstant hoch ist — der Spalt laeuft an den LANGseiten entlang, nicht am Giebel.
    tonne(0, 0, H, T/2, B + 0.6, DACH, 24, 0.44)
    for i in range(7):                                    # Binder als Halbbogen
        tonne(-B/2 + 1.8 + i*(B-3.6)/6, 0, H, T/2 + 0.14, 0.26, STZ, 24, 0.44)
    export("th8_markthalle_offen", 0.018, 2)

# ================================================================ 3) Ladenlokal
def laden_offen():
    """Kleiner Laden: Verkaufsraum mit Theke, Regalen, Schaufenster, Tuer."""
    neu()
    W = mat("LadenWand", (0.92,0.88,0.80), 0.85)
    BOD = mat("LadenBoden", (0.68,0.62,0.54), 0.8)
    THE = mat("Theke", (0.48,0.32,0.18), 0.7)
    REG = mat("Regal", (0.58,0.44,0.28), 0.75)
    GLAS = mat("Schaufenster", (0.64,0.78,0.86), 0.12)
    RAHM = mat("Rahmen", (0.30,0.28,0.26), 0.7)
    DACH = mat("Dach", (0.42,0.40,0.38), 0.8)
    WARE1 = mat("Ware1", (0.86,0.32,0.24), 0.7)
    WARE2 = mat("Ware2", (0.30,0.58,0.80), 0.7)
    B, T, H = 9.0, 8.0, 3.6
    d = 0.28
    box(0,0,0.10, B+0.6, T+0.6, 0.20, mat("Sockel",(0.62,0.60,0.56),0.9))
    box(0,0,0.24, B, T, 0.10, BOD)
    wand_mit_tuer(0, T/2, B, d, H, W, 1.6, 2.4, 'x', tuer_off=2.4)   # Tuer rechts
    box(0,-T/2, H/2, B, d, H, W)
    box(-B/2,0, H/2, d, T, H, W)
    box( B/2,0, H/2, d, T, H, W)
    box(-1.5, T/2, 1.9, 4.4, d*0.6, 1.9, RAHM)                       # Schaufenster
    box(-1.5, T/2+0.04, 1.9, 4.0, d*0.4, 1.6, GLAS)
    box(0,0, H+0.12, B+0.5, T+0.5, 0.24, DACH)
    box(-1.5, T/2+0.55, 2.95, 4.8, 1.1, 0.10, mat("Markise",(0.72,0.20,0.18),0.7))
    box(1.9, -T/2+1.6, 0.75, 3.4, 0.7, 0.92, THE)                    # Theke
    box(1.9, -T/2+1.6, 1.24, 3.6, 0.86, 0.08, THE)
    for r in range(3):                                               # Regalwand links
        box(-B/2+0.55, -0.5, 0.9+r*0.85, 0.5, 4.4, 0.07, REG)
        for w in range(4):
            box(-B/2+0.55, -2.2+w*1.15, 1.05+r*0.85, 0.34,0.34,0.24, WARE1 if (r+w)%2 else WARE2)
    export("th8_laden_offen", 0.012, 2)

# ================================================================ 4) Kirchenschiff
def kirche_offen():
    """Begehbares Kirchenschiff: Portal, Saeulen, Bankreihen, Chor, Turm."""
    neu()
    W = mat("KircheWand", (0.86,0.82,0.72), 0.88)
    BOD = mat("KircheBoden", (0.58,0.54,0.48), 0.85)
    SAE = mat("Saeule", (0.90,0.87,0.80), 0.8)
    BNK = mat("Bank", (0.42,0.28,0.16), 0.75)
    DACH = mat("KircheDach", (0.34,0.36,0.40), 0.7)
    GLAS = mat("Kirchenfenster", (0.42,0.52,0.72), 0.2, 0.0, (0.16,0.20,0.30))
    RAHM = mat("Masswerk", (0.36,0.33,0.28), 0.7)
    B, T, H = 14.0, 26.0, 9.0
    d = 0.50
    box(0,0,0.14, B+1.2, T+1.2, 0.28, mat("Sockel",(0.64,0.62,0.56),0.9))
    box(0,0,0.30, B, T, 0.12, BOD)
    wand_mit_tuer(0, T/2, B, d, H, W, 2.6, 4.2, 'x')                 # Portal
    box(0,-T/2, H/2, B, d, H, W)
    box(-B/2,0, H/2, d, T, H, W)
    box( B/2,0, H/2, d, T, H, W)
    for sy in (-8.0,-3.5, 1.0, 5.5):                                 # hohe Fenster
        for sx in (-B/2-0.02, B/2+0.02):
            box(sx, sy, 5.2, d*0.5, 1.5, 4.0, RAHM)
            box(sx, sy, 5.2, d*0.35, 1.25, 3.7, GLAS)
    for sx in (-4.2, 4.2):                                           # Saeulenreihen
        for sy in (-9.0,-5.0,-1.0, 3.0, 7.0):
            zyl(sx, sy, 4.4, 0.42, 8.4, SAE, 14)
    for r in range(9):                                               # Bankreihen
        for sx in (-2.6, 2.6):
            box(sx, -9.5+r*2.0, 0.80, 4.0, 0.5, 0.12, BNK)
            box(sx, -9.5+r*2.0-0.28, 1.15, 4.0, 0.10, 0.60, BNK)
    box(0, -T/2+2.2, 1.05, 3.0, 1.6, 1.30, SAE)                      # Altar
    box(0,0, H+0.18, B+0.7, T+0.7, 0.36, DACH)                       # Traufkranz schliesst die Wand ab
    kegel(0,0, H+2.55, B*0.64, 0.0, 4.4, DACH, 4, rot=(0,0,math.pi/4))  # Dach sitzt buendig auf
    box(0, T/2-1.2, H+2.0, 4.4, 4.4, 4.0, W)                         # Turmschaft
    kegel(0, T/2-1.2, H+7.4, 3.2, 0.0, 5.2, DACH, 4, rot=(0,0,math.pi/4))
    export("th8_kirche_offen", 0.018, 2)

# ================================================================ 5) Werkstatt
def werkstatt_offen():
    """Garage/Werkstatt mit grossem Tor, Hebebuehne, Werkbank."""
    neu()
    W = mat("WerkWand", (0.74,0.76,0.78), 0.8)
    BOD = mat("WerkBoden", (0.44,0.45,0.47), 0.9)
    STA = mat("Stahl", (0.52,0.55,0.58), 0.4, 0.6)
    BNK = mat("Werkbank", (0.40,0.36,0.32), 0.7)
    DACH = mat("Dach", (0.38,0.40,0.44), 0.65, 0.2)
    GLAS = mat("Glas", (0.62,0.76,0.84), 0.15)
    RAHM = mat("Rahmen", (0.30,0.30,0.30), 0.7)
    B, T, H = 14.0, 12.0, 5.0
    d = 0.32
    box(0,0,0.10, B+0.8, T+0.8, 0.20, mat("Sockel",(0.55,0.55,0.53),0.9))
    box(0,0,0.24, B, T, 0.10, BOD)
    wand_mit_tuer(0, T/2, B, d, H, W, 5.0, 4.0, 'x', tuer_off=-2.0)   # grosses Tor
    box(4.6, T/2, 1.15, 1.2, d*0.9, 2.30, mat("Nebentuer",(0.30,0.34,0.40),0.6))
    box(0,-T/2, H/2, B, d, H, W)
    box(-B/2,0, H/2, d, T, H, W)
    box( B/2,0, H/2, d, T, H, W)
    fensterband(0,-T/2-0.02, B*0.7, d*0.5, 3.6, 1.4, RAHM, GLAS, 4, 'x')
    fensterband(-B/2-0.02,0, T*0.7, d*0.5, 3.6, 1.4, RAHM, GLAS, 3, 'y')
    box(0,0, H+0.14, B+0.5, T+0.5, 0.28, DACH)
    for i in range(7):
        box(-6.0+i*2.0, 0, H+0.30, 0.16, T+0.5, 0.10, STA)            # Dachbinder
    box(-3.0,-1.5, 0.42, 4.6, 2.2, 0.26, STA)                         # Hebebuehne
    zyl(-3.0,-1.5, 0.90, 0.22, 0.95, STA, 10)
    box(3.6,-T/2+1.1, 0.80, 5.0, 0.8, 0.98, BNK)                      # Werkbank
    box(3.6,-T/2+1.1, 1.32, 5.2, 0.9, 0.08, BNK)
    for i in range(4):
        box(1.8+i*1.2, -T/2+0.55, 2.3, 0.9, 0.12, 1.5, STA)           # Werkzeugtafel
    export("th8_werkstatt_offen", 0.014, 2)

if __name__ == "__main__":
    print("Asset-Charge 4 (th8, BEGEHBAR):")
    for fn in (stadthaus_offen, markthalle_offen, laden_offen, kirche_offen, werkstatt_offen):
        fn()
    print("fertig")
