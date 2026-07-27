# -*- coding: utf-8 -*-
"""Asset-Charge 1 fuer Traumhaus: Stadtmoeblierung als GLB (three.js) + STL (Referenz).
Jedes Modell steht auf y=0, Masse in Metern, +z = Vorderseite."""
import bpy, os, math, sys

OUT_GLB = "/home/user/aban-news-landing/models"
OUT_STL = "/home/user/aban-news-landing/models/stl"
os.makedirs(OUT_STL, exist_ok=True)

def neu():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, rgb, rough=0.7, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m

def box(x, y, z, sx, sy, sz, m=None):
    # size=1 liefert bereits Kantenlaenge 1 -> Skalierung = gewuenschte Masse (NICHT /2,
    # sonst sind alle Boxen halb so gross wie ihre Positionen annehmen -> Teile klaffen)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    o = bpy.context.active_object; o.scale = (sx, sy, sz)
    if m: o.data.materials.append(m)
    return o

def zyl(x, y, z, r, h, m=None, seg=16, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kugel(x, y, z, r, m=None, seg=16):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=seg, ring_count=seg//2)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kegel(x, y, z, r1, r2, h, m=None, seg=12, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def runden(width=0.018, segments=3, winkel=42):
    """Alle Mesh-Objekte abrunden: Bevel-Modifier + Auto-Smooth.
    Der User will ausdruecklich keine harten Kanten."""
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': continue
        # Skalierung einbacken, sonst ist die Bevel-Breite pro Achse verzerrt
        bpy.context.view_layer.objects.active = o
        for s_ in bpy.context.scene.objects: s_.select_set(False)
        o.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        m = o.modifiers.new("Bevel", 'BEVEL')
        m.width = width; m.segments = segments
        m.limit_method = 'ANGLE'; m.angle_limit = math.radians(winkel)
        m.harden_normals = False
        try: bpy.ops.object.shade_auto_smooth(angle=math.radians(38))
        except Exception:
            try: bpy.ops.object.shade_smooth()
            except Exception: pass

def export(name, bevel=0.018, seg=3):
    runden(bevel, seg)
    for o in bpy.context.scene.objects: o.select_set(True)
    p_glb = os.path.join(OUT_GLB, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=p_glb, export_format='GLB', use_selection=False)
    p_stl = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p_stl)
    except Exception: bpy.ops.export_mesh.stl(filepath=p_stl)
    print("  ->", name, os.path.getsize(p_glb), "B glb /", os.path.getsize(p_stl), "B stl")

# ---------------------------------------------------------------- 1) Telefonzelle
def telefonzelle():
    neu()
    rot = mat("Rot", (0.72, 0.09, 0.07), 0.45)
    glas = mat("Glas", (0.55, 0.72, 0.80), 0.12)
    dkl = mat("Dunkel", (0.10, 0.10, 0.12), 0.5)
    box(0, 0, 0.06, 1.05, 1.05, 0.12, dkl)               # Bodenplatte
    for sx, sy in ((-0.48,-0.48),(0.48,-0.48),(-0.48,0.48),(0.48,0.48)):
        box(sx, sy, 1.25, 0.10, 0.10, 2.3, rot)          # Ecksaeulen
    for (px, py, rx, ry) in ((0,-0.5,0.86,0.05),(0,0.5,0.86,0.05),(-0.5,0,0.05,0.86),(0.5,0,0.05,0.86)):
        box(px, py, 1.45, rx, ry, 1.5, glas)             # Scheiben
    box(0, 0, 2.44, 1.16, 1.16, 0.16, rot)               # Dachrand
    box(0, 0, 2.60, 0.95, 0.95, 0.18, rot)               # Dachaufsatz
    box(0, -0.46, 1.05, 0.55, 0.06, 0.35, dkl)           # Apparat
    export("th5_telefonzelle")

# ---------------------------------------------------------------- 2) Bushaltestelle
def bushalte():
    neu()
    stahl = mat("Stahl", (0.35, 0.38, 0.42), 0.35, 0.7)
    glas = mat("Glas", (0.62, 0.75, 0.82), 0.10)
    holz = mat("Holz", (0.45, 0.32, 0.18), 0.75)
    blau = mat("Blau", (0.13, 0.35, 0.65), 0.4)
    for sx in (-1.7, 0, 1.7):
        box(sx, 0.55, 1.2, 0.09, 0.09, 2.4, stahl)       # Stuetzen
    box(0, 0.55, 1.6, 3.9, 0.05, 1.55, glas)             # Rueckwand
    box(0, 0.0, 2.46, 4.2, 1.35, 0.10, stahl)            # Dach
    box(-1.9, 0.2, 1.55, 0.05, 0.95, 1.45, glas)         # Seitenwand
    box(0, 0.42, 0.52, 3.4, 0.34, 0.07, holz)            # Sitzbank
    for sx in (-1.4, 0, 1.4):
        box(sx, 0.42, 0.26, 0.06, 0.28, 0.45, stahl)     # Bankbeine
    box(1.75, -0.35, 2.05, 0.55, 0.06, 0.7, blau)        # Haltestellen-Schild
    export("th5_bushaltestelle")

# ---------------------------------------------------------------- 3) Parkbrunnen
def brunnen():
    neu()
    stein = mat("Stein", (0.72, 0.70, 0.64), 0.85)
    wasser = mat("Wasser", (0.20, 0.48, 0.68), 0.08)
    bpy.ops.mesh.primitive_cylinder_add(radius=1.9, depth=0.55, location=(0,0,0.27), vertices=24)
    b = bpy.context.active_object; b.data.materials.append(stein)   # Beckenrand
    zyl(0, 0, 0.5, 1.62, 0.06, wasser, 24)                          # Wasserflaeche
    zyl(0, 0, 0.75, 0.42, 1.0, stein, 16)                           # Saeule
    bpy.ops.mesh.primitive_cylinder_add(radius=0.95, depth=0.14, location=(0,0,1.3), vertices=20)
    s = bpy.context.active_object; s.data.materials.append(stein)    # Schale
    zyl(0, 0, 1.62, 0.18, 0.5, stein, 12)                           # obere Saeule
    kugel(0, 0, 1.95, 0.26, stein, 14)                              # Kugelkrone
    export("th5_parkbrunnen")

# ---------------------------------------------------------------- 4) Strassenlaterne (Altstadt)
def laterne():
    neu()
    eisen = mat("Eisen", (0.13, 0.14, 0.16), 0.4, 0.5)
    glas = mat("LampenGlas", (0.98, 0.92, 0.72), 0.15)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.26, depth=0.22, location=(0,0,0.11), vertices=16)
    f = bpy.context.active_object; f.data.materials.append(eisen)    # Fuss
    zyl(0, 0, 1.85, 0.075, 3.5, eisen, 12)                           # Mast
    zyl(0, 0, 3.66, 0.16, 0.14, eisen, 12)                           # Kragen
    kegel(0, 0, 3.95, 0.30, 0.17, 0.5, glas, 8)                      # Laternenkorpus
    kegel(0, 0, 4.28, 0.34, 0.02, 0.22, eisen, 8)                    # Deckel
    kugel(0, 0, 4.45, 0.07, eisen, 10)                               # Knauf
    export("th5_laterne_altstadt", 0.010, 3)

# ---------------------------------------------------------------- 5) Baum: Spitzahorn
def baum_ahorn():
    neu()
    holz = mat("Rinde", (0.30, 0.21, 0.13), 0.9)
    laub1 = mat("Laub1", (0.16, 0.42, 0.14), 0.85)
    laub2 = mat("Laub2", (0.22, 0.50, 0.17), 0.85)
    kegel(0, 0, 1.15, 0.30, 0.19, 2.3, holz, 10)                     # Stamm
    for (ax, ay, az, ar, mm) in ((0,0,3.3,1.55,laub1), (-0.75,0.35,2.85,1.05,laub2),
                                 (0.8,-0.3,2.95,1.1,laub2), (0.15,0.8,3.75,0.95,laub1),
                                 (-0.3,-0.7,3.6,0.9,laub2)):
        k = kugel(ax, ay, az, ar, mm, 12); k.scale[2] = 0.82
    for (bx, by, bz, rz) in ((-0.5,0.2,2.4,0.5), (0.55,-0.2,2.5,-0.5)):
        zyl(bx, by, bz, 0.09, 1.0, holz, 6, rot=(0, rz, 0))          # Aeste
    export("th5_baum_ahorn", 0.010, 2)

# ---------------------------------------------------------------- 6) Baum: Saeulenpappel
def baum_pappel():
    neu()
    holz = mat("Rinde", (0.33, 0.26, 0.18), 0.9)
    laub = mat("Laub", (0.20, 0.44, 0.16), 0.85)
    kegel(0, 0, 1.6, 0.26, 0.17, 3.2, holz, 10)
    for i, (h, r) in enumerate(((3.3,0.95),(4.4,0.85),(5.4,0.68),(6.2,0.45))):
        k = kugel(0.06*(i%2*2-1), 0.05*(i%2), h, r, laub, 12); k.scale[2] = 1.35
    export("th5_baum_pappel", 0.010, 2)

# ---------------------------------------------------------------- 7) Parkbank
def parkbank():
    neu()
    holz = mat("BankHolz", (0.52, 0.33, 0.17), 0.75)
    guss = mat("Guss", (0.16, 0.17, 0.19), 0.45, 0.4)
    for i in range(4):
        box(0, -0.09 + i*0.13, 0.45, 1.75, 0.10, 0.05, holz)         # Sitzlatten
    for i in range(3):
        box(0, 0.28, 0.62 + i*0.15, 1.75, 0.05, 0.10, holz)          # Lehnenlatten
    for sx in (-0.78, 0.78):
        box(sx, 0.0, 0.22, 0.07, 0.55, 0.44, guss)                   # Wangen
        box(sx, 0.26, 0.66, 0.07, 0.06, 0.45, guss)                  # Lehnenstuetze
        box(sx, 0.0, 0.03, 0.10, 0.62, 0.06, guss)                   # Fuss
    export("th5_parkbank", 0.012, 3)

# ---------------------------------------------------------------- 8) Marktstand
def marktstand():
    neu()
    holz = mat("StandHolz", (0.55, 0.38, 0.22), 0.8)
    dach = mat("Markise", (0.72, 0.16, 0.16), 0.75)
    kiste = mat("Kiste", (0.62, 0.46, 0.26), 0.85)
    ware = mat("Ware", (0.85, 0.55, 0.15), 0.7)
    for sx, sy in ((-1.35,-0.6),(1.35,-0.6),(-1.35,0.6),(1.35,0.6)):
        box(sx, sy, 1.05, 0.10, 0.10, 2.1, holz)                     # Pfosten
    box(0, 0, 0.92, 2.9, 1.35, 0.09, holz)                           # Theke
    box(0, -0.65, 0.45, 2.9, 0.06, 0.85, holz)                       # Blende
    box(0, 0, 2.14, 3.2, 1.7, 0.08, dach)                            # Dachplatte
    box(0, -0.86, 1.98, 3.2, 0.08, 0.34, dach)                       # Volant
    for i, (cx, cy) in enumerate(((-0.85,0.1),(0.0,-0.1),(0.85,0.15))):
        box(cx, cy, 1.05, 0.62, 0.5, 0.18, kiste)                    # Kisten
        kugel(cx-0.1, cy, 1.2, 0.12, ware, 10)
        kugel(cx+0.12, cy+0.08, 1.2, 0.11, ware, 10)
    export("th5_marktstand", 0.014, 3)

# ---------------------------------------------------------------- 9) Poller-Reihe
def poller():
    neu()
    guss = mat("Poller", (0.18, 0.19, 0.22), 0.4, 0.35)
    for i in range(4):
        x = -1.8 + i*1.2
        zyl(x, 0, 0.45, 0.11, 0.9, guss, 12)
        kugel(x, 0, 0.92, 0.13, guss, 12)
    export("th5_poller", 0.012, 3)

# ---------------------------------------------------------------- 10) Ortsschild
def ortsschild():
    neu()
    mast = mat("Mast", (0.55, 0.57, 0.60), 0.4, 0.5)
    tafel = mat("Tafel", (0.93, 0.93, 0.90), 0.5)
    rand = mat("Rand", (0.10, 0.12, 0.35), 0.5)
    zyl(0, 0, 1.1, 0.055, 2.2, mast, 10)
    box(0, 0.02, 2.05, 1.9, 0.06, 0.62, rand)
    box(0, 0.05, 2.05, 1.74, 0.04, 0.48, tafel)
    export("th5_ortsschild", 0.008, 2)

if __name__ == "__main__":
    print("Asset-Charge 1:")
    for fn in (telefonzelle, bushalte, brunnen, laterne, baum_ahorn,
               baum_pappel, parkbank, marktstand, poller, ortsschild):
        fn()
    print("fertig")
