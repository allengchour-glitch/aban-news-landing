# -*- coding: utf-8 -*-
"""Asset-Charge 3 (th7_*): MODULARE Gebaeude + Fahrzeuge fuer die Riesenstadt.
Die Module sind so gebaut, dass sie sich stapeln/aneinanderreihen lassen —
damit baut die Spiel-Session ganze Viertel aus wenigen Teilen.
Konventionen wie th5/th6: Unterkante y=0, Meter, +z = Schauseite, Bevel + Auto-Smooth."""
import bpy, os, math

OUT_GLB = "/home/user/aban-news-landing/models"
OUT_STL = "/home/user/aban-news-landing/models/stl"
os.makedirs(OUT_STL, exist_ok=True)

def neu(): bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, rgb, rough=0.7, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
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

def runden(width=0.016, segments=3, winkel=42):
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': continue
        bpy.context.view_layer.objects.active = o
        for s_ in bpy.context.scene.objects: s_.select_set(False)
        o.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        m = o.modifiers.new("Bevel", 'BEVEL')
        m.width = width; m.segments = segments
        m.limit_method = 'ANGLE'; m.angle_limit = math.radians(winkel)
        try: bpy.ops.object.shade_auto_smooth(angle=math.radians(38))
        except Exception:
            try: bpy.ops.object.shade_smooth()
            except Exception: pass

def export(name, bevel=0.016, seg=3):
    runden(bevel, seg)
    for o in bpy.context.scene.objects: o.select_set(True)
    p1 = os.path.join(OUT_GLB, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=p1, export_format='GLB', use_selection=False)
    p2 = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p2)
    except Exception: bpy.ops.export_mesh.stl(filepath=p2)
    print("  ->", name, os.path.getsize(p1), "B")

def fensterreihe(g_breite, g_tiefe, zbase, anzahl, rahm, glas, hoehe=1.5):
    """Fensterreihe auf der +z-Front, gleichmaessig verteilt."""
    for i in range(anzahl):
        px = -g_breite/2 + g_breite*(i+0.5)/anzahl
        box(px, g_tiefe/2+0.02, zbase, g_breite/anzahl*0.62, 0.06, hoehe, rahm)
        box(px, g_tiefe/2+0.05, zbase, g_breite/anzahl*0.50, 0.05, hoehe*0.82, glas)

# ============================================================ MODULARE GEBAEUDE
def hochhaus_modul():
    """Stapelbar: exakt 6 m hoch, Grundriss 8x8 -> mehrere uebereinander = Turm."""
    neu()
    wand = mat("TurmWand", (0.72,0.74,0.77), 0.6)
    glas = mat("TurmGlas", (0.26,0.42,0.52), 0.15, 0.2)
    band = mat("Band", (0.55,0.57,0.60), 0.5)
    box(0,0,3.0, 8.0,8.0,6.0, wand)
    for e in range(2):                                  # 2 Fensterbaender je Modul
        for s in range(4):                              # alle 4 Seiten
            a = s*math.pi/2
            bx, by = math.sin(a)*4.03, math.cos(a)*4.03
            o = box(bx, by, 1.6+e*2.9, 7.2 if s%2==0 else 0.06, 0.06 if s%2==0 else 7.2, 1.3, glas)
        box(0,0,3.05+e*2.9, 8.12,8.12,0.14, band)       # umlaufendes Gesims
    box(0,0,5.95, 8.2,8.2,0.18, band)                   # Abschluss (Stapelkante)
    export("th7_hochhaus_modul", 0.020, 3)

def hochhaus_dach():
    """Abschluss fuer den Turm: Attika + Technik + Antenne. Auf ein Modul setzen."""
    neu()
    band = mat("Band", (0.55,0.57,0.60), 0.5)
    tech = mat("Technik", (0.44,0.46,0.48), 0.6)
    dkl = mat("Dunkel", (0.22,0.23,0.26), 0.5)
    box(0,0,0.30, 8.3,8.3,0.60, band)                   # Attika
    box(0,0,0.10, 7.9,7.9,0.20, dkl)                    # Dachflaeche
    box(-1.8,1.2,1.10, 2.6,2.2,1.40, tech)              # Aufbau
    box(2.0,-1.4,0.85, 1.5,1.5,0.90, tech)              # Klimageraet
    for sx,sy in ((2.0,-1.4),):
        zyl(sx,sy,1.45, 0.55, 0.30, dkl, 12)
    zyl(2.6,2.4,1.9, 0.06, 3.0, dkl, 8)                 # Antenne
    zyl(2.6,2.4,3.5, 0.16, 0.10, dkl, 8)
    export("th7_hochhaus_dach", 0.018, 3)

def reihenhaus_modul():
    """Breite 6 m -> im Raster 6 aneinandersetzen = geschlossene Zeile."""
    neu()
    wand = mat("ZeileWand", (0.88,0.83,0.72), 0.85)
    dach = mat("ZeileDach", (0.48,0.28,0.22), 0.8)
    glas = mat("Glas", (0.62,0.76,0.84), 0.2)
    rahm = mat("Rahmen", (0.35,0.33,0.30), 0.7)
    tuer = mat("Tuer", (0.32,0.22,0.14), 0.6)
    box(0,0,0.22, 6.1,7.3,0.44, mat("Sockel",(0.68,0.66,0.62),0.9))
    box(0,0,3.30, 6.0,7.2,6.20, wand)
    box(0,0,6.55, 6.25,7.45,0.30, dach)                 # Traufgesims
    kegel(0,0,7.35, 4.6,0.0, 1.6, dach, 4, rot=(0,0,math.pi/4))   # Satteldach
    fensterreihe(6.0, 7.2, 4.9, 2, rahm, glas, 1.35)    # OG
    box(-1.5, 3.63, 1.75, 1.9,0.06,1.5, rahm)           # EG Fenster
    box(-1.5, 3.66, 1.75, 1.6,0.05,1.25, glas)
    box(1.7, 3.66, 1.20, 1.1,0.10,2.35, tuer)           # Haustuer
    box(1.7, 3.95, 2.55, 1.6,0.70,0.12, dach)           # Vordach
    export("th7_reihenhaus_modul", 0.016, 3)

def parkhaus():
    """Offenes Parkdeck, 3 Ebenen mit Bruestung + Rampe."""
    neu()
    bet = mat("Beton", (0.70,0.69,0.66), 0.9)
    dkl = mat("Fuge", (0.42,0.42,0.40), 0.8)
    for e in range(3):
        box(0,0,0.35+e*3.0, 16.0,11.0,0.42, bet)        # Decken
        box(0,-5.35,1.05+e*3.0, 16.0,0.30,0.85, bet)    # Bruestung vorn
        box(0, 5.35,1.05+e*3.0, 16.0,0.30,0.85, bet)
        box(-7.9,0,1.05+e*3.0, 0.30,11.0,0.85, bet)
        box( 7.9,0,1.05+e*3.0, 0.30,11.0,0.85, bet)
    for sx in (-6.5,-2.2,2.2,6.5):                      # Stuetzen
        for sy in (-4.0,0,4.0):
            box(sx,sy,4.6, 0.55,0.55,9.2, bet)
    box(9.4,0,3.4, 3.2,9.0,0.38, bet)                   # Rampe (schraeg angedeutet)
    box(9.4,-4.6,4.3, 3.4,0.28,0.8, dkl)
    box(9.4, 4.6,4.3, 3.4,0.28,0.8, dkl)
    box(0,0,9.62, 16.2,11.2,0.24, dkl)                  # Dachkante
    export("th7_parkhaus", 0.020, 3)

def lagerhalle():
    """Industrie: Tonnendach, Rolltore, Rampe."""
    neu()
    wand = mat("HalleWand", (0.62,0.65,0.68), 0.75, 0.15)
    dach = mat("HalleDach", (0.45,0.48,0.52), 0.6, 0.25)
    tor = mat("Tor", (0.30,0.36,0.42), 0.6)
    box(0,0,0.25, 20.4,12.4,0.50, mat("Sockel",(0.55,0.55,0.53),0.9))
    box(0,0,3.20, 20.0,12.0,5.40, wand)
    for i in range(9):                                  # Wellblech-Rippen
        box(-9.0+i*2.25, 0, 3.2, 0.14, 12.1, 5.3, dach)
    bpy.ops.mesh.primitive_cylinder_add(radius=6.3, depth=20.2, location=(0,0,5.9),
                                        vertices=18, rotation=(0, math.pi/2, 0))
    d = bpy.context.active_object; d.scale = (1,0.42,1); d.data.materials.append(dach)
    for tx in (-5.5, 5.5):                              # 2 Rolltore
        box(tx, 6.05, 2.10, 4.4,0.14,4.2, tor)
        for r in range(5):
            box(tx, 6.13, 0.5+r*0.85, 4.4,0.05,0.08, wand)
    box(0,7.4,0.30, 20.0,2.4,0.60, mat("Rampe",(0.58,0.57,0.54),0.9))
    export("th7_lagerhalle", 0.020, 3)

def bruecke_modul():
    """Strassenbruecke, 14 m Spannweite, aneinanderreihbar."""
    neu()
    bet = mat("BrueckeBeton", (0.74,0.72,0.68), 0.85)
    gel = mat("Gelaender", (0.40,0.42,0.45), 0.5, 0.4)
    fahr = mat("Fahrbahn", (0.24,0.24,0.27), 0.95)
    box(0,0,3.60, 14.0,9.0,0.80, bet)                   # Deck
    box(0,0,4.05, 13.9,8.4,0.12, fahr)                  # Belag
    for sy in (-4.3, 4.3):
        box(0, sy, 4.60, 14.0,0.22,0.95, gel)           # Bruestung
        for i in range(8):
            box(-6.1+i*1.75, sy, 4.62, 0.10,0.26,0.90, gel)
    for sx in (-5.6, 5.6):                              # Pfeiler
        box(sx,0,1.60, 1.8,7.0,3.20, bet)
        box(sx,0,3.30, 2.4,7.6,0.30, bet)
    export("th7_bruecke_modul", 0.018, 3)

# ============================================================ FAHRZEUGE (parkend)
def _rad(x, y, z, r=0.36, b=0.24, m=None):
    zyl(x, y, z, r, b, m, 14, rot=(math.pi/2, 0, 0))

def lieferwagen():
    neu()
    kar = mat("Kasten", (0.90,0.90,0.88), 0.5)
    kab = mat("Kabine", (0.82,0.82,0.80), 0.5)
    glas = mat("Scheibe", (0.28,0.38,0.44), 0.15)
    rad = mat("Reifen", (0.10,0.10,0.12), 0.8)
    fel = mat("Felge", (0.68,0.70,0.72), 0.4, 0.6)
    box(0,0.3,1.55, 2.20,3.60,1.90, kar)                # Kasten
    box(0,-1.95,1.15, 2.10,1.30,1.35, kab)              # Kabine
    box(0,-2.58,1.35, 1.85,0.10,0.85, glas)             # Frontscheibe
    box(0,0.3,0.55, 2.24,3.70,0.55, kab)                # Schweller
    for sx,sy in ((-0.98,-1.55),(0.98,-1.55),(-0.98,1.55),(0.98,1.55)):
        _rad(sx,sy,0.40, 0.40,0.26, rad); _rad(sx*1.02,sy,0.40, 0.20,0.28, fel)
    box(-0.85,-2.62,0.85, 0.35,0.10,0.22, mat("Licht",(0.95,0.92,0.80),0.3))
    box( 0.85,-2.62,0.85, 0.35,0.10,0.22, mat("Licht2",(0.95,0.92,0.80),0.3))
    export("th7_lieferwagen", 0.014, 3)

def lkw():
    neu()
    kab = mat("LkwKabine", (0.20,0.42,0.68), 0.5)
    aufl = mat("Auflieger", (0.88,0.88,0.86), 0.6)
    glas = mat("Scheibe", (0.26,0.36,0.44), 0.15)
    rad = mat("Reifen", (0.10,0.10,0.12), 0.8)
    box(0,-2.6,1.75, 2.40,2.20,2.30, kab)
    box(0,-3.72,2.05, 2.10,0.10,1.10, glas)
    box(0,1.9,2.35, 2.45,6.20,2.60, aufl)               # Auflieger
    box(0,1.9,0.95, 2.20,6.00,0.50, mat("Rahmen",(0.30,0.30,0.32),0.6))
    for sy in (-2.9,-1.2, 0.6, 2.2, 3.8):
        for sx in (-1.06, 1.06):
            _rad(sx, sy, 0.50, 0.50, 0.30, rad)
    export("th7_lkw", 0.016, 3)

def taxi():
    neu()
    gelb = mat("Taxi", (0.95,0.76,0.10), 0.45)
    glas = mat("Scheibe", (0.24,0.34,0.42), 0.15)
    rad = mat("Reifen", (0.10,0.10,0.12), 0.8)
    fel = mat("Felge", (0.70,0.72,0.74), 0.4, 0.6)
    dkl = mat("Schild", (0.15,0.15,0.18), 0.5)
    box(0,0,0.62, 1.90,4.30,0.70, gelb)                 # Karosserie unten
    box(0,0.15,1.20, 1.72,2.30,0.72, gelb)              # Kabine
    box(0,-1.02,1.22, 1.60,0.10,0.60, glas)             # Front
    box(0, 1.32,1.22, 1.60,0.10,0.60, glas)             # Heck
    for sx in (-0.87, 0.87):
        box(sx,0.15,1.20, 0.08,2.10,0.58, glas)         # Seitenscheiben
    box(0,0.15,1.62, 0.70,0.34,0.20, dkl)               # Taxi-Schild
    for sx,sy in ((-0.82,-1.35),(0.82,-1.35),(-0.82,1.35),(0.82,1.35)):
        _rad(sx,sy,0.34, 0.34,0.22, rad); _rad(sx*1.03,sy,0.34, 0.17,0.24, fel)
    export("th7_taxi", 0.012, 3)

# ============================================================ LANDMARKEN
def denkmal():
    neu()
    st = mat("Sockelstein", (0.68,0.66,0.60), 0.9)
    br = mat("Bronze", (0.36,0.30,0.16), 0.45, 0.7)
    for i,(s_,h_) in enumerate(((3.0,0.45),(2.4,0.40),(1.9,0.35))):
        box(0,0,0.225+i*0.40, s_,s_,h_, st)             # Stufensockel
    box(0,0,2.05, 1.35,1.35,2.40, st)                   # Postament
    box(0,0,3.35, 1.60,1.60,0.22, st)
    zyl(0,0,3.95,0.30,1.00, br, 12)                     # Figur (abstrahiert)
    zyl(0,0,4.70,0.20,0.55, br, 10)
    kegel(0,0,5.12,0.26,0.06,0.42, br, 10)
    export("th7_denkmal", 0.014, 3)

if __name__ == "__main__":
    print("Asset-Charge 3 (th7, modulare Gebaeude + Fahrzeuge):")
    for fn in (hochhaus_modul, hochhaus_dach, reihenhaus_modul, parkhaus, lagerhalle,
               bruecke_modul, lieferwagen, lkw, taxi, denkmal):
        fn()
    print("fertig")
