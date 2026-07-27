# -*- coding: utf-8 -*-
"""Asset-Charge 2 (th6_*) fuer die Riesenstadt: Verkehr, Stadtmobiliar, Gruen.
Wie th5: Unterkante y=0, Meter, +z = Schauseite, Bevel + Auto-Smooth (keine harten Kanten)."""
import bpy, os, math

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
        b.inputs["Emission Strength"].default_value = 1.4
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

def kugel(x, y, z, r, m=None, seg=16):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=seg, ring_count=max(6,seg//2))
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
        d_min = max(1e-4, min(o.dimensions))          # duennste Dimension
        m.width = min(width, 0.28 * d_min)            # Offset <= ~1/4 der duennsten Kante
        m.segments = segments
        m.use_clamp_overlap = True
        m.limit_method = 'ANGLE'; m.angle_limit = math.radians(winkel)
        try: bpy.ops.object.shade_auto_smooth(angle=math.radians(38))
        except Exception: pass   # KEIN shade_smooth()-Fallback: das mittelt alles rund

def export(name, bevel=0.016, seg=3):
    runden(bevel, seg)
    for o in bpy.context.scene.objects: o.select_set(True)
    p1 = os.path.join(OUT_GLB, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=p1, export_format='GLB', use_selection=False, export_apply=True)
    p2 = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p2)
    except Exception: bpy.ops.export_mesh.stl(filepath=p2)
    print("  ->", name, os.path.getsize(p1), "B")

# ---------------------------------------------------------------- Verkehr
def ampel():
    neu()
    dkl = mat("AmpelDkl", (0.11,0.12,0.14), 0.45, 0.3)
    rot = mat("Rot", (0.85,0.13,0.11), 0.4, 0.0, (0.85,0.13,0.11))
    gel = mat("Gelb", (0.93,0.72,0.10), 0.4)
    gru = mat("Gruen", (0.16,0.75,0.34), 0.4)
    zyl(0,0,0.09, 0.24, 0.18, dkl, 16)                 # Fussplatte
    zyl(0,0,1.8, 0.075, 3.4, dkl, 12)                  # Mast
    box(0,0,3.9, 0.42,0.36,1.15, dkl)                  # Gehaeuse
    for i,(mm,zz) in enumerate(((rot,4.28),(gel,3.9),(gru,3.52))):
        zyl(0,-0.20,zz, 0.115, 0.06, mm, 14, rot=(math.pi/2,0,0))   # Linsen
        kegel(0,-0.30,zz+0.06, 0.20,0.15, 0.14, dkl, 12, rot=(math.pi/2,0,0))  # Blenden
    export("th6_ampel", 0.010, 3)

def schild_stop():
    neu()
    mast = mat("Mast", (0.62,0.64,0.66), 0.4, 0.5)
    rot = mat("StopRot", (0.75,0.10,0.11), 0.5)
    wei = mat("Weiss", (0.95,0.95,0.93), 0.5)
    zyl(0,0,1.15, 0.045, 2.3, mast, 10)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.42, depth=0.05, location=(0,0.03,2.15), vertices=8, rotation=(math.pi/2,0,0))
    o = bpy.context.active_object; o.data.materials.append(rot)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.34, depth=0.05, location=(0,0.055,2.15), vertices=8, rotation=(math.pi/2,0,0))
    o2 = bpy.context.active_object; o2.data.materials.append(wei)
    box(0,0.08,2.15, 0.44,0.03,0.10, rot)              # STOP-Balken (Platzhalter-Grafik)
    export("th6_schild_stop", 0.008, 2)

def hydrant():
    neu()
    rot = mat("HydRot", (0.78,0.16,0.10), 0.55)
    zyl(0,0,0.05, 0.22, 0.10, rot, 14)
    zyl(0,0,0.42, 0.135, 0.75, rot, 14)
    kugel(0,0,0.83, 0.15, rot, 14)
    for a in (0, math.pi/2):
        zyl(math.cos(a)*0.17, math.sin(a)*0.17, 0.55, 0.06, 0.16, rot, 10, rot=(math.pi/2, 0, a))
    zyl(0,0,0.94, 0.05, 0.10, rot, 8)
    export("th6_hydrant", 0.010, 3)

def pylone():
    neu()
    ora = mat("Orange", (0.92,0.38,0.06), 0.6)
    wei = mat("Weiss", (0.95,0.95,0.92), 0.6)
    for i in range(3):
        x = -0.8 + i*0.8
        box(x,0,0.03, 0.42,0.42,0.06, ora)
        kegel(x,0,0.36, 0.16,0.05, 0.62, ora, 12)
        zyl(x,0,0.42, 0.125, 0.09, wei, 12)
    export("th6_pylonen", 0.008, 2)

# ---------------------------------------------------------------- Stadtmobiliar
def litfass():
    neu()
    dkl = mat("Sockel", (0.20,0.21,0.23), 0.6)
    pap = mat("Plakat", (0.86,0.84,0.78), 0.75)
    zyl(0,0,0.09, 0.62, 0.18, dkl, 20)
    zyl(0,0,1.35, 0.55, 2.35, pap, 20)
    zyl(0,0,2.58, 0.66, 0.12, dkl, 20)
    kegel(0,0,2.78, 0.60, 0.10, 0.32, dkl, 16)
    export("th6_litfasssaeule", 0.012, 3)

def papierkorb():
    neu()
    met = mat("Metall", (0.30,0.33,0.36), 0.5, 0.4)
    zyl(0,0,0.42, 0.055, 0.84, met, 10)                # Pfosten
    bpy.ops.mesh.primitive_cylinder_add(radius=0.21, depth=0.46, location=(0,0.24,0.72), vertices=14)
    k = bpy.context.active_object; k.data.materials.append(met)
    box(0,0.24,0.50, 0.40,0.40,0.03, met)
    export("th6_papierkorb", 0.008, 3)

def blumenkuebel():
    neu()
    ton = mat("Ton", (0.66,0.42,0.30), 0.85)
    erde = mat("Erde", (0.26,0.19,0.13), 1.0)
    gruen = mat("Gruen", (0.22,0.52,0.20), 0.8)
    bl1 = mat("Bluete1", (0.90,0.30,0.45), 0.7)
    bl2 = mat("Bluete2", (0.95,0.80,0.25), 0.7)
    kegel(0,0,0.28, 0.46, 0.36, 0.56, ton, 18)
    zyl(0,0,0.57, 0.47, 0.08, ton, 18)
    zyl(0,0,0.56, 0.40, 0.06, erde, 16)
    for i in range(7):
        a = i/7*math.tau; r = 0.20
        kugel(math.cos(a)*r, math.sin(a)*r, 0.70, 0.13, gruen, 10)
        kugel(math.cos(a)*r*0.7, math.sin(a)*r*0.7, 0.80, 0.07, bl1 if i%2 else bl2, 8)
    export("th6_blumenkuebel", 0.010, 3)

def stromkasten():
    neu()
    gr = mat("Kasten", (0.44,0.48,0.44), 0.7)
    dkl = mat("Dunkel", (0.22,0.24,0.24), 0.6)
    box(0,0,0.06, 0.92,0.52,0.12, dkl)
    box(0,0,0.66, 0.80,0.42,1.10, gr)
    box(0,0,1.25, 0.86,0.48,0.08, dkl)
    box(0.0,-0.215,0.66, 0.62,0.02,0.86, dkl)          # Tuerfuge
    box(0.28,-0.23,0.62, 0.06,0.03,0.12, dkl)          # Griff
    export("th6_stromkasten", 0.012, 3)

def container():
    neu()
    gr = mat("Container", (0.20,0.45,0.28), 0.7)
    dkl = mat("Deckel", (0.14,0.30,0.20), 0.6)
    rad = mat("Rad", (0.12,0.12,0.14), 0.5)
    box(0,0,0.62, 1.30,0.86,1.00, gr)
    box(0,0.06,1.16, 1.36,0.94,0.12, dkl)
    for sx,sy in ((-0.52,-0.34),(0.52,-0.34),(-0.52,0.34),(0.52,0.34)):
        zyl(sx,sy,0.10, 0.10, 0.08, rad, 10, rot=(math.pi/2,0,0))
    box(0,-0.44,0.95, 0.90,0.04,0.10, dkl)             # Griffleiste
    export("th6_muellcontainer", 0.012, 3)

def kiosk():
    neu()
    wand = mat("KioskWand", (0.86,0.82,0.72), 0.8)
    dach = mat("KioskDach", (0.20,0.40,0.52), 0.7)
    glas = mat("Glas", (0.60,0.74,0.82), 0.15)
    holz = mat("Theke", (0.52,0.36,0.20), 0.75)
    box(0,0,0.10, 2.70,2.10,0.20, mat("Sockel",(0.55,0.55,0.52),0.9))
    box(0,0,1.35, 2.40,1.80,2.30, wand)
    box(0,0,2.58, 2.86,2.26,0.16, dach)
    box(0,0,2.72, 2.40,1.90,0.14, dach)
    box(0,-0.91,1.75, 1.80,0.06,0.90, glas)            # Verkaufsfenster
    box(0,-1.02,1.22, 1.94,0.30,0.10, holz)            # Auslage-Brett
    box(0,-0.98,2.34, 2.10,0.24,0.28, dach)            # Vordach
    box(1.05,-0.91,0.80, 0.60,0.06,1.20, glas)         # Seitenscheibe
    export("th6_kiosk", 0.014, 3)

def billboard():
    neu()
    stahl = mat("Stahl", (0.42,0.45,0.48), 0.4, 0.6)
    flae = mat("Plakatflaeche", (0.90,0.88,0.84), 0.7)
    rahm = mat("Rahmen", (0.25,0.27,0.30), 0.5)
    for sx in (-1.5, 1.5):
        zyl(sx,0,1.6, 0.10, 3.2, stahl, 10)
    box(0,0.06,3.35, 4.30,0.16,2.10, rahm)
    box(0,0.0,3.35, 4.05,0.06,1.88, flae)
    box(0,-0.10,4.52, 3.60,0.14,0.14, stahl)           # Beleuchtungsschiene
    for sx in (-1.2, 0, 1.2):
        kegel(sx,-0.22,4.46, 0.13,0.07, 0.18, stahl, 8, rot=(math.pi/2.6,0,0))
    export("th6_billboard", 0.012, 3)

# ---------------------------------------------------------------- Gruen
def fichte():
    neu()
    stamm = mat("Stamm", (0.30,0.21,0.14), 0.9)
    nad1 = mat("Nadel1", (0.10,0.30,0.16), 0.85)
    nad2 = mat("Nadel2", (0.13,0.36,0.19), 0.85)
    kegel(0,0,0.55, 0.20, 0.14, 1.1, stamm, 10)
    for i,(zz,rr,hh) in enumerate(((1.5,1.35,1.5),(2.5,1.10,1.4),(3.4,0.85,1.3),(4.15,0.55,1.1))):
        kegel(0,0,zz, rr, 0.05, hh, nad1 if i%2 else nad2, 14)
    export("th6_fichte", 0.010, 2)

def hecke_modul():
    neu()
    lb = mat("Hecke", (0.17,0.40,0.16), 0.9)
    box(0,0,0.55, 2.40,0.70,1.10, lb)
    for i in range(5):                                  # unregelmaessige Oberkante
        kugel(-0.96+i*0.48, 0, 1.10, 0.30, lb, 10)
    export("th6_hecke_modul", 0.030, 3)

def brunnen_trog():
    neu()
    st = mat("Sandstein", (0.72,0.66,0.54), 0.9)
    wa = mat("Wasser", (0.22,0.50,0.66), 0.1)
    box(0,0,0.30, 2.20,0.90,0.60, st)
    box(0,0,0.52, 1.94,0.66,0.10, wa)
    box(-0.80,0.36,0.90, 0.30,0.22,0.60, st)            # Wandbrunnen-Stele
    zyl(-0.80,0.20,1.02, 0.045, 0.20, st, 8, rot=(math.pi/2,0,0))
    export("th6_brunnen_trog", 0.014, 3)

if __name__ == "__main__":
    print("Asset-Charge 2 (th6, Riesenstadt):")
    for fn in (ampel, schild_stop, hydrant, pylone, litfass, papierkorb, blumenkuebel,
               stromkasten, container, kiosk, billboard, fichte, hecke_modul, brunnen_trog):
        fn()
    print("fertig")
