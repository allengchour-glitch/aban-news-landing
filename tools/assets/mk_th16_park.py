# -*- coding: utf-8 -*-
"""Asset-Charge 13 (th16_*): PARK, SPIELPLATZ UND SPORT IM FREIEN.
Spielturm, Schaukel, Sandkasten, Wippe, Kinderkarussell, begehbarer Pavillon,
Teichbruecke, Skate-Rampe, Basketballplatz, Grillplatz, Blumenbeet, Birke.
Familienfreundlich — keine Waffen, keine Werbung, nichts Bedrohliches.

Konventionen wie th5-th14 (siehe models/TH5-ASSETS.md, Abschnitt "Fallstricke"):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * Schauseite (Rutsche, Eingang, Sitzseite) liegt auf Blender +y -> three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT, sonst fehlt der Bevel.
  * `primitive_cube_add(size=1)` -> Kantenlaenge 1, Skalierung = Mass (NICHT /2).
  * `rot=(pi/2,0,0)` legt die Zylinderachse auf -y; liegende Staemme brauchen
    `rot=(0, pi/2, winkel)` (Achse = (cos w, sin w, 0)).
  * `rotation_euler[2] = pi` auf einem symmetrischen Quader ist ein No-Op —
    gespiegelt wird ueber das Vorzeichen der Offsets.
  * Metallic hoechstens 0.6 (ohne Environment-Map rendert mehr fast schwarz).
  * Kindermassstab: Podeste 1.5 m, Sitze 0.45 m, Griffe 0.75-0.95 m — passt fuer
    Kinder (~1.2 m) UND Erwachsene (~1.8 m).
  * Geneigte Platten (Rutsche, Bruecke, Rampe) liegen alle in der y-z-Ebene und
    werden NUR um x gedreht: theta = atan2(dz, dy), Normale = (0, -sin, cos).
    Deshalb IMMER in +y-Richtung durchlaufen, sonst zeigt die Dicke nach oben.
"""
import bpy, bmesh, os, math
from mathutils import Vector

OUT_GLB = "/home/user/aban-news-landing/models"
OUT_STL = "/home/user/aban-news-landing/models/stl"
os.makedirs(OUT_STL, exist_ok=True)

TAU = math.tau

# ---------------------------------------------------------------- Grundhelfer
def neu(): bpy.ops.wm.read_factory_settings(use_empty=True)

def nur(o):
    bpy.context.view_layer.objects.active = o
    for s_ in bpy.context.scene.objects: s_.select_set(False)
    o.select_set(True)

def mat(name, rgb, rough=0.7, metal=0.0, emit=None, estr=1.4):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = min(metal, 0.6)   # >0.6 rendert fast schwarz
    if emit:
        b.inputs["Emission Color"].default_value = (emit[0], emit[1], emit[2], 1)
        b.inputs["Emission Strength"].default_value = estr
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

def kugel(x, y, z, r, m=None, seg=12):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=seg, ring_count=max(5, seg//2))
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kegel(x, y, z, r1, r2, h, m=None, seg=12, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z),
                                    vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def torus(x, y, z, r_gross, r_klein, m=None, seg=16, seg_k=6):
    bpy.ops.mesh.primitive_torus_add(location=(x,y,z), major_radius=r_gross, minor_radius=r_klein,
                                     major_segments=seg, minor_segments=seg_k)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def pyramide(cx, cy, cz, halbb, hoehe, m=None):
    """Vierseitiges Zeltdach mit Ecken auf (+-halbb, +-halbb). Basis exakt bei cz.
    (kegel(vertices=4) haette je nach Startwinkel die Ecken auf den Achsen.)"""
    v = [(-halbb,-halbb,0), (halbb,-halbb,0), (halbb,halbb,0), (-halbb,halbb,0), (0,0,hoehe)]
    f = [(3,2,1,0), (0,1,4), (1,2,4), (2,3,4), (3,0,4)]
    me = bpy.data.meshes.new("Pyr"); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new("Pyr", me); bpy.context.collection.objects.link(o)
    o.location = (cx, cy, cz)
    if m: o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o
    return o

def strebe(p0, p1, d, m=None):
    """Stab zwischen zwei Punkten (A-Bock, Leiterholm, Netzseil, Ast)."""
    p0 = Vector(p0); p1 = Vector(p1); v = p1 - p0; L = v.length
    if L < 1e-4: return None
    c = (p0 + p1) / 2.0
    o = box(c.x, c.y, c.z, d, d, L, m)
    o.rotation_euler = v.to_track_quat('Z', 'Y').to_euler()
    return o

def rampe(p0, p1, breite, dicke, m=None):
    """Geneigte Platte in der y-z-Ebene. p0/p1 sind die Mittelpunkte der OBERKANTE
    an beiden Enden; die Dicke haengt nach unten. IMMER mit p1.y > p0.y aufrufen —
    sonst kippt die Normale und die Platte liegt ueber statt unter der Lauflaeche."""
    p0 = Vector(p0); p1 = Vector(p1); v = p1 - p0
    L = math.hypot(v.y, v.z)
    if L < 1e-5: return None
    th = math.atan2(v.z, v.y)
    n = Vector((0.0, -math.sin(th), math.cos(th)))    # Flaechennormale
    c = (p0 + p1) / 2.0 - n * (dicke / 2.0)
    o = box(c.x, c.y, c.z, breite, L, dicke, m)
    o.rotation_euler[0] = th
    return o

def ring(cx, cy, z, r, n, breite, hoehe, m, start=0.0):
    """Geschlossener Ring aus n tangential gedrehten Boxen."""
    ch = 2.0 * r * math.sin(math.pi/n) * 1.06
    for i in range(n):
        a = start + i/n*TAU
        o = box(cx + r*math.cos(a), cy + r*math.sin(a), z, ch, breite, hoehe, m)
        o.rotation_euler[2] = a + math.pi/2

def bogen_linie(cx, cy, z, r, a0, a1, breite, m, dicke=0.04, n=24):
    """Kreisbogen aus tangentialen Streifen (Spielfeldlinien, Mittelkreis)."""
    for i in range(n):
        a = a0 + (a1-a0)*(i+0.5)/n
        ch = abs(a1-a0)*r/n*1.10
        o = box(cx + r*math.cos(a), cy + r*math.sin(a), z, ch, breite, dicke, m)
        o.rotation_euler[2] = a + math.pi/2

def lok(cx, cy, ang, lx, ly):
    """Lokale Koordinate (lx, ly) um ang gedreht an (cx, cy) — fuer Ringmoebel."""
    return (cx + lx*math.cos(ang) - ly*math.sin(ang),
            cy + lx*math.sin(ang) + ly*math.cos(ang))

def bbox():
    bpy.context.view_layer.update()
    lo = [1e9, 1e9, 1e9]; hi = [-1e9, -1e9, -1e9]
    for o in bpy.context.scene.objects:
        if o.type != 'MESH': continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            for i in range(3):
                lo[i] = min(lo[i], w[i]); hi[i] = max(hi[i], w[i])
    return lo, hi

def zentriere(xy=True, z=True):
    """Bounding-Box in x/y mittig stellen und die Unterkante exakt auf 0 legen."""
    lo, hi = bbox()
    dx = -(lo[0]+hi[0])/2 if xy else 0.0
    dy = -(lo[1]+hi[1])/2 if xy else 0.0
    dz = -lo[2] if z else 0.0
    for o in bpy.context.scene.objects:
        if o.type != 'MESH': continue
        o.location = (o.location[0]+dx, o.location[1]+dy, o.location[2]+dz)

def runden(width=0.02, segments=2, winkel=42):
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': continue
        nur(o)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        m = o.modifiers.new("Bevel", 'BEVEL')
        d_min = max(1e-4, min(o.dimensions))
        m.width = min(width, 0.28 * d_min)
        m.segments = segments
        m.use_clamp_overlap = True
        m.limit_method = 'ANGLE'; m.angle_limit = math.radians(winkel)
        try: bpy.ops.object.shade_auto_smooth(angle=math.radians(38))
        except Exception: pass

def export(name, bevel=0.02, seg=2, zentr=False):
    if zentr: zentriere()
    runden(bevel, seg)
    for o in bpy.context.scene.objects: o.select_set(True)
    p1 = os.path.join(OUT_GLB, name + ".glb")
    # export_apply=True ist PFLICHT — sonst landet der Bevel NICHT im GLB.
    bpy.ops.export_scene.gltf(filepath=p1, export_format='GLB', use_selection=False, export_apply=True)
    p2 = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p2)
    except Exception: bpy.ops.export_mesh.stl(filepath=p2)
    lo, hi = bbox()
    print("  -> %-22s %5.2f x %5.2f x %5.2f  unten %.3f  %d B"
          % (name, hi[0]-lo[0], hi[1]-lo[1], hi[2]-lo[2], lo[2], os.path.getsize(p1)))

# ---------------------------------------------------------------- Bausteine
def gelaender_gerade(a0, a1, fest, z, m, hoehe=0.95, achse='x', staebe=True):
    """Handlauf + Pfosten. achse='x': laeuft in x bei y=fest, Fusspunkt auf z."""
    L = abs(a1 - a0)
    if L < 0.05: return
    c = (a0 + a1) / 2
    n = max(1, int(round(L / 1.2)))
    if achse == 'x':
        box(c, fest, z + hoehe, L, 0.07, 0.07, m)
        box(c, fest, z + hoehe*0.55, L, 0.05, 0.05, m)
        if staebe:
            for i in range(n + 1):
                box(a0 + (a1-a0)*i/n, fest, z + hoehe/2, 0.07, 0.07, hoehe, m)
    else:
        box(fest, c, z + hoehe, 0.07, L, 0.07, m)
        box(fest, c, z + hoehe*0.55, 0.05, L, 0.05, m)
        if staebe:
            for i in range(n + 1):
                box(fest, a0 + (a1-a0)*i/n, z + hoehe/2, 0.07, 0.07, hoehe, m)

def leiter(x, y0, z0, y1, z1, breite, m_holm, m_sprosse, sprossen=6):
    """Schraege Leiter: Holme von (y0,z0) unten nach (y1,z1) oben, Sprossen dazwischen."""
    for sx in (-breite/2, breite/2):
        strebe((x+sx, y0, z0), (x+sx, y1, z1), 0.075, m_holm)
    for i in range(1, sprossen + 1):
        t = i/(sprossen + 0.6)
        zyl(x, y0 + (y1-y0)*t, z0 + (z1-z0)*t, 0.028, breite, m_sprosse, 10, rot=(0, math.pi/2, 0))

def stamm_liegend(cx, cy, z, r, laenge, ang, m, seg=12):
    """Liegender Baumstamm: Achse = (cos ang, sin ang, 0)."""
    return zyl(cx, cy, z, r, laenge, m, seg, rot=(0, math.pi/2, ang))

# ================================================================ 1) Spielturm
def spielturm():
    """Klettergeruest: Turm mit Podest 1.50 m, Rutsche nach +y bis auf den Boden,
    Leiter auf -y, Kletternetz auf +x. Massstab fuer Kinder ab ca. 1.2 m."""
    neu()
    HOLZ = mat("Pfosten", (0.52,0.36,0.20), 0.80)
    BRET = mat("Podest", (0.62,0.45,0.26), 0.75)
    DACH = mat("Dach", (0.16,0.42,0.28), 0.70)
    RUTS = mat("Rutsche", (0.90,0.55,0.12), 0.35, 0.15)
    GELB = mat("Griff", (0.95,0.78,0.14), 0.45)
    BLAU = mat("Blau", (0.14,0.38,0.68), 0.55)
    SEIL = mat("Seil", (0.72,0.60,0.36), 0.85)
    ROT  = mat("Rot", (0.78,0.20,0.18), 0.55)
    PH = 1.50                                        # Podest-Oberkante
    # --- Turm
    for sx in (-0.84, 0.84):
        for sy in (-0.84, 0.84):
            box(sx, sy, 1.15, 0.12, 0.12, 2.30, HOLZ)
    box(0, 0, PH - 0.06, 1.86, 1.86, 0.12, BRET)                  # Podestplatte
    for sy in (-0.90, 0.90):                                       # Rahmen unter dem Podest
        box(0, sy, PH - 0.20, 1.86, 0.10, 0.16, HOLZ)
    for sx in (-0.90, 0.90):
        box(sx, 0, PH - 0.20, 0.10, 1.86, 0.16, HOLZ)
    for i in range(7):                                             # Dielenfugen
        box(0, -0.78 + i*0.26, PH + 0.005, 1.80, 0.20, 0.02, HOLZ)
    pyramide(0, 0, 2.30, 1.16, 0.62, DACH)                         # Zeltdach
    box(0, 0, 2.32, 2.36, 2.36, 0.06, DACH)                        # Traufbrett
    kugel(0, 0, 3.00, 0.09, GELB, 10)
    # --- Bruestung: -x geschlossen, +-y je zwei Wangen neben der Oeffnung
    gelaender_gerade(-0.84, 0.84, -0.84, PH, HOLZ, 0.78, 'x')      # bleibt bei der Leiter
    for sx in (-0.62, 0.62):                                        # Rutschen-Wangen
        box(sx, 0.86, PH + 0.39, 0.44, 0.09, 0.78, HOLZ)
        box(sx, 0.86, PH + 0.80, 0.44, 0.11, 0.10, GELB)
    gelaender_gerade(-0.84, 0.84, -0.86, PH, HOLZ, 0.78, 'x', False)
    for sx in (-0.62, 0.62):                                        # Leiter-Wangen
        box(sx, -0.86, PH + 0.39, 0.44, 0.09, 0.78, HOLZ)
    box(-0.88, 0, PH + 0.39, 0.09, 1.80, 0.78, BLAU)               # geschlossene Wand -x
    for i in range(4):
        box(-0.94, -0.60 + i*0.40, PH + 0.42, 0.06, 0.18, 0.62, GELB)
    box(0.88, 0, PH + 0.86, 0.09, 1.80, 0.10, GELB)                # Sturz ueber dem Netz
    # --- Rutsche nach +y, Auslauf beruehrt den Boden
    rampe((0, 0.88, PH - 0.02), (0, 3.62, 0.14), 0.62, 0.10, RUTS)
    box(0, 3.94, 0.09, 0.62, 0.88, 0.10, RUTS)                     # Auslauf, Oberkante 0.14
    for sx in (-0.36, 0.36):
        rampe((sx, 0.88, PH + 0.14), (sx, 3.62, 0.30), 0.10, 0.26, RUTS)
        box(sx, 3.94, 0.24, 0.10, 0.88, 0.26, RUTS)
    box(0, 0.90, PH + 0.62, 0.72, 0.10, 0.10, GELB)                # Einstiegsbuegel
    for sy in (1.9, 2.9):                                          # Stuetzen unter der Rutsche
        t = (sy - 0.88)/(3.62 - 0.88)
        zh = (PH - 0.02) + ((0.14) - (PH - 0.02))*t - 0.10
        zyl(0, sy, zh/2, 0.055, zh, HOLZ, 10)
    # --- Leiter auf -y
    leiter(0, -1.62, 0.02, -0.88, PH - 0.04, 0.66, HOLZ, GELB, 6)
    for sx in (-0.33, 0.33):                                       # Haltegriffe oben
        strebe((sx, -0.88, PH + 0.10), (sx, -1.20, PH + 0.72), 0.055, GELB)
    # --- Kletternetz auf +x
    # Der Anker gehoert auf den BODEN — sass er auf 1.20 m, lief das Netz fast
    # waagrecht und war als Aufstieg unbrauchbar.
    box(2.62, 0, 0.15, 0.18, 1.84, 0.30, HOLZ)                     # Bodenanker
    for sy in (-0.88, 0.88):
        box(2.62, sy, 0.26, 0.22, 0.22, 0.52, HOLZ)
    for i in range(5):                                             # Laengsseile
        sy = -0.72 + i*0.36
        strebe((0.92, sy, PH - 0.05), (2.56, sy, 0.32), 0.035, SEIL)
    for k in range(4):                                             # Querseile
        t = (k + 0.7)/4.7
        px = 0.92 + (2.56 - 0.92)*t
        pz = (PH - 0.05) + (0.32 - (PH - 0.05))*t
        zyl(px, 0, pz, 0.032, 1.50, SEIL, 8, rot=(math.pi/2, 0, 0))
    # --- Kleinkram
    for sx, sy, c in ((-1.00, 1.10, ROT), (1.00, -1.10, BLAU)):    # Trittsteine als Deko
        k = kugel(sx*1.9, sy*1.4, 0.09, 0.30, c, 10); k.scale[2] = 0.30
    export("th16_spielturm", 0.016, 2, zentr=True)

# ================================================================ 2) Doppelschaukel
def schaukel():
    """Doppelschaukel: 2 A-Boecke, Querbalken auf 2.40 m, 2 Sitze auf 0.45 m.
    Die Ketten reichen exakt von der Sitzoberkante bis unter den Balken."""
    neu()
    STAHL = mat("Gestell", (0.20,0.44,0.72), 0.45, 0.35)
    QUER  = mat("Querbalken", (0.86,0.86,0.88), 0.40, 0.45)
    KETTE = mat("Kette", (0.62,0.64,0.68), 0.35, 0.55)
    SITZ  = mat("Sitz", (0.86,0.30,0.14), 0.60)
    FUSS  = mat("Fuss", (0.34,0.34,0.36), 0.85)
    GELB  = mat("Detail", (0.95,0.78,0.14), 0.45)
    BH = 2.40                                        # Balkenachse
    SZ = 0.45                                        # Sitzoberkante
    for sx in (-1.78, 1.78):                         # A-Boecke
        for sy in (-0.98, 0.98):
            strebe((sx, sy, 0.04), (sx, 0.0, BH), 0.11, STAHL)
            box(sx, sy*0.96, 0.05, 0.30, 0.34, 0.10, FUSS)
        box(sx, 0, 1.05, 0.09, 1.28, 0.09, STAHL)    # Querriegel im Bock
    zyl(0, 0, BH, 0.075, 3.92, QUER, 14, rot=(0, math.pi/2, 0))    # Querbalken
    for sx in (-1.78, 1.78):
        zyl(sx, 0, BH, 0.11, 0.16, GELB, 12, rot=(0, math.pi/2, 0))
    for cx in (-0.88, 0.88):                         # 2 Sitze
        box(cx, 0, SZ - 0.025, 0.50, 0.22, 0.05, SITZ)
        box(cx, 0, SZ - 0.055, 0.54, 0.26, 0.03, GELB)
        for ox in (-0.20, 0.20):                     # Ketten: Sitz -> Balken
            zyl(cx + ox, 0, (SZ + (BH - 0.09))/2, 0.017, (BH - 0.09) - SZ, KETTE, 8)
            box(cx + ox, 0, BH - 0.07, 0.05, 0.05, 0.10, KETTE)
            for k in range(6):                       # Kettenglieder als Verdickung
                zyl(cx + ox, 0, SZ + 0.18 + k*0.30, 0.026, 0.05, KETTE, 8)
    export("th16_schaukel", 0.014, 2)

# ================================================================ 3) Sandkasten
def sandkasten():
    """Sandkasten 3.0 x 3.0 m mit Holzrand (Sitzkante 0.30), Sandflaeche,
    Eimer, Schaufel, Sandhaufen und Foermchen."""
    neu()
    HOLZ = mat("Bohle", (0.60,0.42,0.24), 0.80)
    ECKE = mat("Eckbrett", (0.48,0.32,0.18), 0.80)
    SAND = mat("Sand", (0.86,0.76,0.54), 0.95)
    ROT  = mat("Eimer", (0.85,0.22,0.18), 0.45)
    BLAU = mat("Schaufel", (0.16,0.42,0.78), 0.45)
    GELB = mat("Foermchen", (0.95,0.78,0.16), 0.45)
    GRUE = mat("Foermchen2", (0.20,0.62,0.32), 0.45)
    R = 1.50                                          # Aussenmass 3.0
    for sy in (-R + 0.11, R - 0.11):
        box(0, sy, 0.15, 3.00, 0.22, 0.30, HOLZ)
    for sx in (-R + 0.11, R - 0.11):
        box(sx, 0, 0.15, 0.22, 2.56, 0.30, HOLZ)
    for sx in (-1, 1):                                # Ecksitze ueber Eck
        for sy in (-1, 1):
            box(sx*(R-0.42), sy*(R-0.11), 0.32, 0.72, 0.30, 0.06, ECKE)
            box(sx*(R-0.11), sy*(R-0.42), 0.32, 0.30, 0.72, 0.06, ECKE)
    box(0, 0, 0.11, 2.58, 2.58, 0.22, SAND)           # Sandflaeche, Oberkante 0.22
    for (px, py, r) in ((0.55,-0.45,0.42), (-0.62,0.50,0.30)):     # Sandhaufen
        h = kugel(px, py, 0.22, r, SAND, 12); h.scale[2] = 0.42
    zyl(0.02, 0.86, 0.245, 0.34, 0.05, SAND, 16)      # geglaettetes Feld
    # Eimer (steht im Sand, Oeffnung oben)
    kegel(-0.30, -0.75, 0.335, 0.115, 0.145, 0.23, ROT, 14)
    zyl(-0.30, -0.75, 0.45, 0.135, 0.025, ROT, 14)
    for i in range(4):                                # Buegel als geschlossener Bogen
        a0 = math.pi*i/4; a1 = math.pi*(i + 1)/4
        strebe((-0.30 + math.cos(a0)*0.135, -0.75, 0.455 + math.sin(a0)*0.125),
               (-0.30 + math.cos(a1)*0.135, -0.75, 0.455 + math.sin(a1)*0.125), 0.028, GELB)
    # Schaufel: Blatt und Stiel auf EINER Achse — sonst liegen beide getrennt im Sand
    ang = 0.85; bx, by = 0.62, -0.16
    o = box(bx, by, 0.245, 0.26, 0.19, 0.03, BLAU); o.rotation_euler[2] = ang
    ex, ey = bx + math.cos(ang)*0.11, by + math.sin(ang)*0.11
    fx, fy = bx + math.cos(ang)*0.80, by + math.sin(ang)*0.80
    strebe((ex, ey, 0.26), (fx, fy, 0.36), 0.032, BLAU)
    o = box(fx, fy, 0.375, 0.15, 0.05, 0.04, BLAU); o.rotation_euler[2] = ang + math.pi/2
    # Foermchen
    zyl(-0.95, -0.20, 0.265, 0.10, 0.09, GELB, 12)
    zyl(0.35, -1.05, 0.255, 0.09, 0.07, GRUE, 6)
    export("th16_sandkasten", 0.014, 2)

# ================================================================ 4) Wippe
def wippe():
    """Klassische Wippe: Balken 3.2 m auf Lagerbock (Achse 0.55 m), 2 Sitze mit
    Griffbuegeln, Gummipuffer unter beiden Enden. Neigung 11.3 Grad."""
    neu()
    BALK = mat("Balken", (0.86,0.30,0.16), 0.55)
    HOLZ = mat("Bock", (0.20,0.44,0.72), 0.45, 0.35)
    SITZ = mat("Sitz", (0.95,0.78,0.16), 0.50)
    GRIF = mat("Griff", (0.16,0.16,0.18), 0.55)
    GUMM = mat("Puffer", (0.14,0.14,0.16), 0.90)
    ACHS = mat("Achse", (0.70,0.72,0.76), 0.30, 0.55)
    PZ = 0.55                                        # Drehachse
    LY = 1.60                                        # halbe Balkenlaenge
    dz = 0.32                                        # Hoehendifferenz Achse->Ende
    th = math.atan2(dz, LY)                          # +y-Ende liegt oben
    # Lagerbock
    for sy in (-0.42, 0.42):
        strebe((-0.30, sy, 0.05), (0.0, 0.0, PZ), 0.10, HOLZ)
        strebe(( 0.30, sy, 0.05), (0.0, 0.0, PZ), 0.10, HOLZ)
    box(0, 0, 0.05, 0.86, 1.02, 0.10, HOLZ)
    zyl(0, 0, PZ, 0.07, 0.46, ACHS, 12, rot=(0, math.pi/2, 0))
    zyl(0, 0, PZ, 0.13, 0.20, HOLZ, 12, rot=(0, math.pi/2, 0))
    # Balken
    b = box(0, 0, PZ, 0.22, 2*LY, 0.14, BALK); b.rotation_euler[0] = th
    for s in (-1, 1):
        cy = s*(LY - 0.22)
        cz = PZ + s*(LY - 0.22)*math.tan(th)
        o = box(0, cy, cz + 0.11, 0.40, 0.44, 0.06, SITZ); o.rotation_euler[0] = th
        o = box(0, cy - s*0.24, cz + 0.16, 0.34, 0.06, 0.16, SITZ); o.rotation_euler[0] = th
        gy = s*(LY - 0.62)
        gz = PZ + s*(LY - 0.62)*math.tan(th)
        for ox in (-0.16, 0.16):                     # Griffbuegel vor dem Sitz
            o = box(ox, gy, gz + 0.28, 0.05, 0.05, 0.32, GRIF); o.rotation_euler[0] = th
        o = zyl(0, gy, gz + 0.44, 0.028, 0.38, GRIF, 10, rot=(0, math.pi/2, 0))
        o.rotation_euler[0] = th
        # Gummipuffer unter beiden Enden; das tiefe Ende sitzt darauf auf
        zyl(0, s*LY, 0.08, 0.24, 0.16, GUMM, 14)
        zyl(0, s*LY, 0.16, 0.14, 0.04, GUMM, 12)
    export("th16_wippe", 0.014, 2)

# ================================================================ 5) Kinderkarussell
def karussell_klein():
    """Drehscheibe (Durchmesser 3.0 m): Bodenscheibe auf 0.16 m, umlaufender
    Handlauf auf 0.90 m, 6 Stangen zur Nabe auf 1.25 m, 3 Sitzbretter."""
    neu()
    SCHE = mat("Scheibe", (0.20,0.46,0.72), 0.55)
    RAND = mat("Rand", (0.95,0.78,0.16), 0.50)
    STAN = mat("Stange", (0.78,0.80,0.84), 0.30, 0.55)
    NABE = mat("Nabe", (0.55,0.57,0.60), 0.35, 0.5)
    SITZ = mat("Sitz", (0.86,0.28,0.16), 0.55)
    SOCK = mat("Sockel", (0.34,0.34,0.36), 0.85)
    PZ = 0.16                                        # Standflaeche
    zyl(0, 0, 0.045, 0.46, 0.09, SOCK, 16)           # Fundamentteller
    zyl(0, 0, 0.115, 0.24, 0.16, NABE, 14)           # Lager
    zyl(0, 0, PZ - 0.045, 1.50, 0.09, SCHE, 28)      # Scheibe, Oberkante 0.16
    zyl(0, 0, PZ + 0.015, 1.42, 0.03, RAND, 28)      # Trittbelag
    ring(0, 0, PZ + 0.035, 1.44, 24, 0.10, 0.05, SCHE)
    for i in range(6):                               # 6 Handlaufpfosten
        a = i/6*TAU
        px, py = math.cos(a)*1.30, math.sin(a)*1.30
        zyl(px, py, PZ + 0.37, 0.038, 0.74, STAN, 10)
        strebe((px, py, PZ + 0.74), (0, 0, 1.24), 0.042, STAN)
    ring(0, 0, PZ + 0.74, 1.30, 18, 0.055, 0.055, STAN)   # umlaufender Handlauf
    zyl(0, 0, 1.235, 0.10, 0.10, NABE, 12)
    kugel(0, 0, 1.33, 0.10, RAND, 12)
    for i in range(3):                               # Sitzbretter
        a = i/3*TAU + 0.5
        px, py = math.cos(a)*0.80, math.sin(a)*0.80
        o = box(px, py, PZ + 0.14, 0.60, 0.30, 0.06, SITZ); o.rotation_euler[2] = a + math.pi/2
        for s in (-0.22, 0.22):
            qx, qy = lok(px, py, a + math.pi/2, s, 0)
            box(qx, qy, PZ + 0.055, 0.10, 0.24, 0.11, SITZ)
    export("th16_karussell_klein", 0.014, 2)

# ================================================================ 6) Pavillon
def pavillon():
    """BEGEHBARER achteckiger Pavillon: Podest 0.45 m mit 2 Stufen auf +y,
    8 Saeulen, lichte Hoehe 2.95 m, 7 Baenke, Zeltdach, Haengelaterne."""
    neu()
    STEIN = mat("Podest", (0.72,0.68,0.60), 0.90)
    BODEN = mat("Boden", (0.80,0.76,0.68), 0.85)
    SAEU  = mat("Saeule", (0.92,0.90,0.84), 0.70)
    BALK  = mat("Balken", (0.58,0.40,0.22), 0.75)
    DACH  = mat("Dach", (0.32,0.16,0.12), 0.80)
    BANK  = mat("Bank", (0.64,0.46,0.26), 0.75)
    GUSS  = mat("Guss", (0.18,0.20,0.20), 0.50, 0.35)
    LAMP  = mat("Laterne", (1.0,0.94,0.72), 0.25, 0.0, (1.0,0.90,0.62), 2.2)
    FB = 0.45                                        # Fussboden-Oberkante
    RP = 3.15                                        # Saeulenkreis
    zyl(0, 0, FB/2, 3.90, FB, STEIN, 8)              # Podest (Achteck)
    zyl(0, 0, FB + 0.015, 3.70, 0.03, BODEN, 8)      # Belag buendig auf FB
    ring(0, 0, FB - 0.03, 3.72, 16, 0.16, 0.08, BODEN)
    box(0, 3.85, 0.15, 2.40, 0.62, 0.30, STEIN)      # Stufe 1 (Oberkante 0.30)
    box(0, 4.36, 0.075, 2.64, 0.60, 0.15, STEIN)     # Stufe 2 (Oberkante 0.15)
    for i in range(8):                               # Saeulen, keine steht auf +y
        a = math.radians(22.5) + i/8*TAU
        px, py = math.cos(a)*RP, math.sin(a)*RP
        zyl(px, py, FB + 1.475, 0.13, 2.95, SAEU, 12)
        zyl(px, py, FB + 0.06, 0.19, 0.12, SAEU, 12)
        zyl(px, py, FB + 2.87, 0.19, 0.14, SAEU, 12)
    ring(0, 0, RP, FB + 3.05, 8, 0.20, 0.24, BALK, math.radians(22.5))   # Ringanker
    for i in range(8):                               # Kopfbaender
        a = math.radians(22.5) + i/8*TAU
        for s in (-1, 1):
            b = math.radians(22.5) + (i + s*0.30)/8*TAU
            strebe((math.cos(a)*RP, math.sin(a)*RP, FB + 2.60),
                   (math.cos(b)*(RP*0.99), math.sin(b)*(RP*0.99), FB + 2.98), 0.08, BALK)
    kegel(0, 0, FB + 3.17 + 0.80, 4.35, 0.16, 1.60, DACH, 8)   # Zeltdach, Basis FB+3.17
    zyl(0, 0, FB + 4.80, 0.12, 0.24, BALK, 10)
    kugel(0, 0, FB + 5.00, 0.16, GUSS, 12)
    for i in range(8):                               # Gratsparren als Deko
        a = math.radians(22.5) + i/8*TAU
        strebe((math.cos(a)*4.28, math.sin(a)*4.28, FB + 3.20),
               (0, 0, FB + 4.72), 0.07, DACH)
    for i in range(8):                               # 7 Baenke, Eingang (90 Grad) frei
        a = i/8*TAU
        if abs(((math.degrees(a) - 90) + 180) % 360 - 180) < 1: continue
        ang = a - math.pi/2                          # lokal +y = radial nach aussen
        cx, cy = math.cos(a)*2.62, math.sin(a)*2.62
        o = box(cx, cy, FB + 0.42, 1.90, 0.46, 0.06, BANK); o.rotation_euler[2] = ang
        for s in (-0.78, 0.78):                      # Wangen
            qx, qy = lok(cx, cy, ang, s, 0.0)
            o = box(qx, qy, FB + 0.20, 0.08, 0.42, 0.40, GUSS); o.rotation_euler[2] = ang
        for k in range(3):                           # Lehne
            qx, qy = lok(cx, cy, ang, 0.0, 0.24)
            o = box(qx, qy, FB + 0.60 + k*0.16, 1.90, 0.05, 0.11, BANK)
            o.rotation_euler[2] = ang
        for s in (-0.78, 0.78):
            qx, qy = lok(cx, cy, ang, s, 0.22)
            o = box(qx, qy, FB + 0.58, 0.08, 0.10, 0.44, GUSS); o.rotation_euler[2] = ang
    zyl(0, 0, FB + 2.86, 0.05, 0.36, GUSS, 8)        # Haengelaterne in der Mitte
    kegel(0, 0, FB + 2.56, 0.28, 0.10, 0.22, GUSS, 10)
    zyl(0, 0, FB + 2.34, 0.20, 0.34, LAMP, 12)
    kegel(0, 0, FB + 2.13, 0.24, 0.10, 0.10, GUSS, 10)
    export("th16_pavillon", 0.018, 2)

# ================================================================ 7) Teichbruecke
def teichbruecke():
    """Geschwungene Holzbruecke, 7.0 m lang: Kreisbogen mit Scheitel 0.94 m,
    flache Auflager an beiden Enden, Gelaender folgt dem Bogen."""
    neu()
    DECK = mat("Deck", (0.62,0.44,0.24), 0.80)
    PLAN = mat("Planke", (0.54,0.37,0.20), 0.82)
    GEL  = mat("Gelaender", (0.48,0.32,0.17), 0.78)
    TRAG = mat("Traeger", (0.40,0.27,0.14), 0.85)
    L  = 3.10                                        # halbe Bogenlaenge
    H  = 0.80                                        # Stich
    D  = 0.14                                        # Deckstaerke
    BR = 1.70                                        # Deckbreite
    def zt(y):  return D + H*(1.0 - (y/L)**2)        # Oberkante des Decks
    N = 18
    ys = [-L + 2*L*i/N for i in range(N + 1)]
    for i in range(N):                               # Deck in Segmenten
        rampe((0, ys[i], zt(ys[i])), (0, ys[i+1], zt(ys[i+1])), BR, D,
              PLAN if i % 2 else DECK)
    for s in (-1, 1):                                # flache Auflager, Unterkante 0
        box(0, s*(L + 0.20), D/2, BR, 0.40, D, DECK)
    # Traeger nur dort, wo unter dem Deck wirklich Platz ist (sonst tauchen sie
    # an den Bogenenden unter die Nulllinie).
    for sx in (-0.66, 0.66):                         # Laengstraeger unter dem Deck
        for i in range(0, N, 2):
            if abs(ys[i]) > 2.40 or abs(ys[i+2]) > 2.40: continue
            rampe((sx, ys[i], zt(ys[i]) - D), (sx, ys[i+2], zt(ys[i+2]) - D), 0.12, 0.18, TRAG)
    for i in range(0, N + 1, 3):                     # Querriegel
        if abs(ys[i]) > 2.40: continue
        o = box(0, ys[i], zt(ys[i]) - D - 0.09, BR + 0.06, 0.10, 0.10, TRAG)
        o.rotation_euler[0] = math.atan2(zt(ys[i]+0.05) - zt(ys[i]-0.05), 0.10)
    for sx in (-(BR/2 - 0.07), BR/2 - 0.07):         # Gelaender beidseits
        for i in range(0, N + 1, 3):                 # Pfosten senkrecht
            y = ys[i]
            box(sx, y, zt(y) + 0.46, 0.09, 0.09, 0.98, GEL)
            box(sx, y, zt(y) + 0.98, 0.13, 0.13, 0.06, GEL)
        for i in range(N):                           # Handlauf + Mittelholm folgen dem Bogen
            rampe((sx, ys[i], zt(ys[i]) + 1.00), (sx, ys[i+1], zt(ys[i+1]) + 1.00), 0.11, 0.08, GEL)
            rampe((sx, ys[i], zt(ys[i]) + 0.56), (sx, ys[i+1], zt(ys[i+1]) + 0.56), 0.07, 0.07, GEL)
        for i in range(0, N, 2):                     # Fuellstaebe
            y = (ys[i] + ys[i+1])/2
            box(sx, y, zt(y) + 0.30, 0.05, 0.05, 0.52, GEL)
    export("th16_teichbruecke", 0.014, 2)

# ================================================================ 8) Skate-Rampe
def skate_rampe():
    """Quarterpipe-Modul, EXAKT 8.00 m breit und in x reihbar (x += 8.0).
    Radius 2.20 m, Plattform mit Gelaender oben, Auslauf nach +y, Coping am Rand."""
    neu()
    DECK = mat("Rampe", (0.66,0.50,0.30), 0.60)
    KANT = mat("Kante", (0.54,0.40,0.22), 0.70)
    RIPP = mat("Unterbau", (0.42,0.31,0.18), 0.85)
    ASPH = mat("Asphalt", (0.30,0.30,0.32), 0.95)
    COP  = mat("Coping", (0.74,0.76,0.80), 0.25, 0.55)
    GEL  = mat("Gelaender", (0.18,0.42,0.70), 0.45, 0.30)
    GELB = mat("Markierung", (0.94,0.78,0.16), 0.55)
    B  = 8.00                                        # Modulbreite — reihbar
    R  = 2.20                                        # Transition-Radius
    G  = 0.10                                        # Asphalt-Bodenplatte
    S  = G + 0.12                                    # Fahrflaeche am Transitionsfuss
    PT = 1.20                                        # Plattformtiefe hinten
    box(0, -0.40, G/2, B, 6.00, G, ASPH)             # Bodenplatte y=-3.40..+2.60
    M = 22                                           # Unterbau als waagrechte Lagen
    for k in range(M):
        z0 = S + k*R/M; z1 = S + (k+1)*R/M
        c = 1.0 - (z1 - S)/R
        ys = -R*math.sqrt(max(0.0, 1.0 - c*c))       # Oberflaeche am Lagen-OBERrand
        w = R + ys
        if w < 0.02: continue
        box(0, (-R + ys)/2, (z0 + z1)/2, B, w, z1 - z0, RIPP)
    NS = 14                                          # Fahrflaeche: oben -> unten (+y!)
    pts = []
    for i in range(NS + 1):
        t = math.radians(90.0)*(1.0 - i/NS)
        pts.append((-R*math.sin(t), S + R*(1.0 - math.cos(t))))
    for i in range(NS):
        rampe((0, pts[i][0], pts[i][1]), (0, pts[i+1][0], pts[i+1][1]), B, 0.12,
              DECK if i % 2 else KANT)
    box(0, 1.30, S - 0.06, B, 2.60, 0.12, DECK)      # Auslauf buendig bis y=+2.60
    box(0, 2.54, S + 0.025, B, 0.12, 0.05, GELB)
    box(0, -R - PT/2, (S + R - 0.12)/2, B, PT, S + R - 0.12, RIPP)   # Plattformkasten
    box(0, -R - PT/2, S + R - 0.06, B, PT, 0.12, DECK)               # Plattformdeck
    zyl(0, -R + 0.06, S + R + 0.02, 0.055, B, COP, 14, rot=(0, math.pi/2, 0))   # Coping
    for i in range(9):                               # Rippen sichtbar an der Rueckwand
        box(-3.6 + i*0.9, -R - PT + 0.05, (S + R)/2, 0.10, 0.10, S + R, KANT)
    zb = S + R
    gelaender_gerade(-3.94, 3.94, -R - PT + 0.10, zb, GEL, 1.00, 'x')      # Absturzsicherung
    for sx in (-3.94, 3.94):
        gelaender_gerade(-R - PT + 0.10, -R - 0.30, sx, zb, GEL, 1.00, 'y')
    export("th16_skate_rampe", 0.016, 2)

# ================================================================ 9) Basketballplatz
def basketballplatz():
    """Platte 16 x 26 m mit Linien, 2 Koerbe (Ring exakt 3.05 m, unter dem Brett)
    und 3.2 m hohem Ballfangzaun mit Tor auf +y."""
    neu()
    PLAT = mat("Belag", (0.30,0.42,0.52), 0.85)
    ZONE = mat("Zone", (0.62,0.34,0.22), 0.85)
    LIN  = mat("Linie", (0.94,0.94,0.92), 0.60)
    RAND = mat("Randstein", (0.62,0.60,0.56), 0.90)
    MAST = mat("Mast", (0.22,0.24,0.28), 0.45, 0.35)
    BRET = mat("Brett", (0.92,0.92,0.90), 0.35)
    RING = mat("Ring", (0.88,0.36,0.10), 0.35, 0.45)
    NETZ = mat("Netz", (0.92,0.92,0.90), 0.75)
    ZAUN = mat("Zaun", (0.24,0.42,0.34), 0.55, 0.30)
    PX, PY = 8.00, 13.00                             # halbe Plattenmasse
    CX, CY = 7.00, 12.00                             # halbes Spielfeld
    Z = 0.12                                         # Belagoberkante
    box(0, 0, Z/2, 2*PX, 2*PY, Z, PLAT)
    for sy in (-PY + 0.15, PY - 0.15):
        box(0, sy, Z + 0.02, 2*PX, 0.30, 0.06, RAND)
    for sx in (-PX + 0.15, PX - 0.15):
        box(sx, 0, Z + 0.02, 0.30, 2*PY - 0.6, 0.06, RAND)
    for s in (-1, 1):                                # Zonen einfaerben
        box(0, s*(CY - 2.90), Z + 0.005, 4.90, 5.80, 0.02, ZONE)
    # Linien
    for sx in (-CX, CX): box(sx, 0, Z + 0.02, 0.06, 2*CY, 0.03, LIN)
    for sy in (-CY, CY): box(0, sy, Z + 0.02, 2*CX, 0.06, 0.03, LIN)
    box(0, 0, Z + 0.02, 2*CX, 0.06, 0.03, LIN)                       # Mittellinie
    bogen_linie(0, 0, Z + 0.03, 1.80, 0, TAU, 0.06, LIN, 0.03, 30)   # Mittelkreis
    for s in (-1, 1):
        for sx in (-2.45, 2.45):                                     # Zonengrenzen
            box(sx, s*(CY - 2.90), Z + 0.03, 0.06, 5.80, 0.03, LIN)
        box(0, s*(CY - 5.80), Z + 0.03, 4.90, 0.06, 0.03, LIN)       # Freiwurflinie
        bogen_linie(0, s*(CY - 5.80), Z + 0.03, 1.80, 0, TAU, 0.06, LIN, 0.03, 26)
        ky = s*(CY - 1.60)                                           # Korbmittelpunkt
        a0 = math.pi if s > 0 else 0.0
        bogen_linie(0, ky, Z + 0.03, 6.60, a0, a0 + math.pi, 0.06, LIN, 0.03, 30)
        for sx in (-6.60, 6.60):
            box(sx, s*(CY - 0.80), Z + 0.03, 0.06, 1.60, 0.03, LIN)
        # Korbanlage: Mast hinter der Grundlinie, Ausleger, Brett, Ring auf 3.05
        my = s*(CY + 0.45)                                           # Abstand zum Zaun
        zyl(0, my, Z + 1.78, 0.10, 3.56, MAST, 12)
        box(0, my, Z + 0.10, 0.70, 0.58, 0.20, MAST)
        box(0, s*(CY - 0.11), Z + 3.42, 0.16, 1.14, 0.16, MAST)      # Ausleger
        strebe((0, my, Z + 2.20), (0, s*(CY - 0.02), Z + 3.34), 0.10, MAST)
        by = s*(CY - 0.68)                                           # Brettebene
        box(0, by, Z + 3.42, 1.80, 0.08, 1.05, BRET)                 # Brett 2.90..3.95
        box(0, by - s*0.05, Z + 3.30, 0.62, 0.03, 0.46, RING)        # Zielfeld
        box(0, by - s*0.09, Z + 2.93, 0.24, 0.12, 0.05, RING)        # Ringtraeger
        ry = by - s*0.32
        torus(0, ry, Z + 2.93, 0.225, 0.022, RING, 16, 6)            # Ring, Oberkante 3.05
        for i in range(8):                                           # Netz
            a = i/8*TAU
            strebe((math.cos(a)*0.225, ry + math.sin(a)*0.225, Z + 2.93),
                   (math.cos(a)*0.11, ry + math.sin(a)*0.11, Z + 2.53), 0.018, NETZ)
        for i in range(8):
            a = (i + 0.5)/8*TAU
            zyl(math.cos(a)*0.17, ry + math.sin(a)*0.17, Z + 2.72, 0.016, 0.10, NETZ, 6,
                rot=(math.pi/2, 0, 0))
    # Ballfangzaun mit Tor auf +y
    ZH = 3.20
    for sx in (-PX + 0.10, PX - 0.10):
        for i in range(9):
            zyl(sx, -PY + 0.20 + i*3.20, Z + ZH/2, 0.07, ZH, ZAUN, 8)
        for zz in (0.55, 1.75, ZH - 0.06):
            box(sx, 0, Z + zz, 0.05, 2*PY - 0.4, 0.05, ZAUN)
        for i in range(26):
            box(sx, -PY + 0.5 + i*1.0, Z + ZH/2, 0.035, 0.035, ZH - 0.10, ZAUN)
    for sy in (-PY + 0.10, PY - 0.10):
        auf = (sy > 0)
        for i in range(6):
            zyl(-PX + 0.15 + i*3.14, sy, Z + ZH/2, 0.07, ZH, ZAUN, 8)
        for zz in (0.55, 1.75, ZH - 0.06):
            if auf:
                for s in (-1, 1):
                    box(s*(PX/2 + 0.55), sy, Z + zz, PX - 1.10, 0.05, 0.05, ZAUN)
            else:
                box(0, sy, Z + zz, 2*PX - 0.4, 0.05, 0.05, ZAUN)
        for i in range(15):
            px = -PX + 0.6 + i*1.06
            if auf and abs(px) < 1.30: continue                      # 2.6 m Tor
            box(px, sy, Z + ZH/2, 0.035, 0.035, ZH - 0.10, ZAUN)
        if auf:
            for s in (-1.30, 1.30):
                zyl(s, sy, Z + ZH/2, 0.075, ZH, ZAUN, 8)
    export("th16_basketballplatz", 0.014, 2)

# ================================================================ 10) Grillplatz
def grillplatz():
    """Feuerstelle mit Steinring, schwenkbarem Grillrost, 5 Sitzbaumstaemmen,
    Holzstapel und Hackklotz auf einer Kiesflaeche."""
    neu()
    KIES = mat("Kies", (0.58,0.55,0.50), 0.95)
    STEIN= mat("Feldstein", (0.46,0.45,0.44), 0.90)
    STEI2= mat("Feldstein2", (0.54,0.50,0.46), 0.92)
    ASCH = mat("Asche", (0.24,0.22,0.21), 0.95)
    HOLZ = mat("Scheit", (0.44,0.30,0.17), 0.85)
    RIND = mat("Rinde", (0.30,0.21,0.13), 0.92)
    SCHN = mat("Schnittflaeche", (0.76,0.62,0.40), 0.85)
    STAH = mat("Stahl", (0.36,0.37,0.40), 0.45, 0.40)
    GLUT = mat("Glut", (1.0,0.42,0.10), 0.55, 0.0, (1.0,0.34,0.06), 2.0)
    RK = 3.40
    zyl(0, 0, 0.05, RK, 0.10, KIES, 24)              # Kiesflaeche
    ring(0, 0, 0.09, RK - 0.10, 26, 0.22, 0.14, STEI2)
    for i in range(13):                              # Steinring um die Feuerstelle
        a = i/13*TAU
        s = kugel(math.cos(a)*1.05, math.sin(a)*1.05, 0.18, 0.27,
                  STEIN if i % 2 else STEI2, 10)
        s.scale = (1.0, 0.72, 0.62); s.rotation_euler[2] = a
    zyl(0, 0, 0.115, 0.92, 0.03, ASCH, 20)           # Ascheflaeche
    for i in range(5):                               # Scheite als Tipi
        a = i/5*TAU + 0.3
        strebe((math.cos(a)*0.42, math.sin(a)*0.42, 0.13), (0, 0, 0.68), 0.085, HOLZ)
    kugel(0, 0, 0.16, 0.30, GLUT, 10).scale = (1.0, 1.0, 0.30)
    for sx in (-1.05, 1.05):                         # Grillgestell
        zyl(sx, 0, 0.62, 0.05, 1.24, STAH, 10)
        box(sx, 0, 0.04, 0.26, 0.26, 0.08, STAH)
    zyl(0, 0, 1.21, 0.045, 2.10, STAH, 10, rot=(0, math.pi/2, 0))
    for sx in (-0.42, 0.42):                         # Aufhaengung des Rosts
        zyl(sx, 0, 0.98, 0.014, 0.44, STAH, 6)
    box(0, 0, 0.755, 0.94, 0.94, 0.03, STAH)         # Rostrahmen
    for i in range(9):
        zyl(-0.40 + i*0.10, 0, 0.775, 0.012, 0.92, STAH, 6, rot=(math.pi/2, 0, 0))
    for i in range(5):                               # Sitzbaumstaemme
        a = i/5*TAU + 0.32
        px, py = math.cos(a)*2.35, math.sin(a)*2.35
        stamm_liegend(px, py, 0.32, 0.22, 1.50, a + math.pi/2, RIND, 14)
        for s in (-1, 1):
            qx, qy = lok(px, py, a + math.pi/2, s*0.75, 0)
            zyl(qx, qy, 0.32, 0.205, 0.03, SCHN, 14, rot=(0, math.pi/2, a + math.pi/2))
        for s in (-1, 1):                            # Keile gegen Wegrollen
            qx, qy = lok(px, py, a + math.pi/2, s*0.50, 0)
            box(qx, qy, 0.13, 0.14, 0.42, 0.10, RIND).rotation_euler[2] = a + math.pi/2
    # Holzstapel — Scheite ALLE laengs x, versetzt in y gestapelt. (Erst lagen sie
    # diagonal und schoben sich ineinander; ausserdem stand der Stapel in einem Sitzstamm.)
    sx0, sy0 = 0.0, -2.72
    for r_ in range(3):
        for c_ in range(4):
            py = sy0 - 0.36 + c_*0.24 + (0.12 if r_ % 2 else 0.0)
            pz = 0.21 + r_*0.20
            stamm_liegend(sx0, py, pz, 0.11, 1.10, 0.0, HOLZ, 10)
            zyl(sx0 + 0.56, py, pz, 0.105, 0.03, SCHN, 10, rot=(0, math.pi/2, 0.0))
    for s in (-1, 1):                                # Stuetzpfosten des Stapels
        zyl(sx0 + s*0.62, sy0, 0.38, 0.055, 0.76, RIND, 8)
    zyl(2.10, 1.85, 0.28, 0.30, 0.56, RIND, 14)      # Hackklotz
    zyl(2.10, 1.85, 0.565, 0.295, 0.03, SCHN, 14)
    export("th16_grillplatz", 0.014, 2)

# ================================================================ 11) Blumenbeet
def blumenbeet():
    """Beet mit Holzeinfassung, EXAKT 4.00 m breit und in x reihbar (x += 4.0).
    Drei Bluetenfarben, Erde bleibt unter der Sitzkante."""
    neu()
    HOLZ = mat("Einfassung", (0.56,0.38,0.20), 0.82)
    KANT = mat("Deckleiste", (0.44,0.29,0.15), 0.80)
    ERDE = mat("Erde", (0.22,0.16,0.11), 0.95)
    LAUB = mat("Laub", (0.20,0.46,0.18), 0.85)
    LAU2 = mat("Laub2", (0.26,0.54,0.22), 0.85)
    B1   = mat("Bluete rot", (0.86,0.16,0.20), 0.60)
    B2   = mat("Bluete gelb", (0.96,0.80,0.16), 0.60)
    B3   = mat("Bluete violett", (0.60,0.28,0.74), 0.60)
    MITT = mat("Bluetenmitte", (0.98,0.88,0.42), 0.55)
    BX, BY, HW = 4.00, 2.00, 0.16                    # Aussenmasse + Wandstaerke
    # Alle Deckleisten kragen nur nach INNEN aus — sonst waere das Modul 4.04 breit
    # und die Reihung bekaeme Fugen bzw. Ueberschneidungen.
    for s in (-1, 1):
        box(0, s*(BY/2 - HW/2), 0.17, BX, HW, 0.34, HOLZ)
        box(0, s*(BY/2 - HW/2 - 0.02), 0.355, BX, HW + 0.04, 0.03, KANT)
        box(s*(BX/2 - HW/2), 0, 0.17, HW, BY - 2*HW, 0.34, HOLZ)
        box(s*(BX/2 - HW/2 - 0.02), 0, 0.355, HW, BY - 2*HW + 0.04, 0.03, KANT)
    box(0, 0, 0.14, BX - 2*HW, BY - 2*HW, 0.28, ERDE)          # Erde, Oberkante 0.28
    for i in range(4):                               # Pfosten in den Ecken
        sx = (-1 if i % 2 == 0 else 1)*(BX/2 - 0.10)
        sy = (-1 if i < 2 else 1)*(BY/2 - 0.10)
        box(sx, sy, 0.21, 0.20, 0.20, 0.42, KANT)
    farben = (B1, B2, B3)
    for r_ in range(3):
        for c_ in range(9):
            px = -1.68 + c_*0.42 + (0.14 if r_ % 2 else 0.0)
            py = -0.54 + r_*0.54
            f = farben[(c_ + r_) % 3]
            h = 0.20 + 0.06*((c_ * 7 + r_ * 5) % 3)
            zyl(px, py, 0.28 + h/2, 0.018, h, LAUB, 6)          # Stiel
            k = kugel(px, py, 0.28 + h + 0.055, 0.085, f, 10); k.scale[2] = 0.62
            for i in range(3):                                  # Bluetenblaetter
                a = i/3*TAU + c_*0.3
                p = kugel(px + math.cos(a)*0.075, py + math.sin(a)*0.075,
                          0.28 + h + 0.045, 0.052, f, 6); p.scale[2] = 0.45
            kugel(px, py, 0.28 + h + 0.085, 0.03, MITT, 6)
            for s in (-1, 1):                                   # Blaetter
                bl = kugel(px + s*0.07, py + s*0.04, 0.30 + h*0.35, 0.075,
                           LAU2 if s > 0 else LAUB, 6)
                bl.scale = (1.0, 0.55, 0.25); bl.rotation_euler[2] = s*0.6
    for (px, py, rr) in ((-1.55, 0.0, 0.24), (1.55, 0.10, 0.22), (0.0, -0.02, 0.20)):
        b = kugel(px, py, 0.30, rr, LAU2, 10); b.scale[2] = 0.70   # Polsterstauden
    export("th16_blumenbeet", 0.012, 1)   # 1 Bevel-Segment: 27 Blueten sonst > 45k Dreiecke

# ================================================================ 12) Birke
def baum_birke():
    """Schlanke Haengebirke, ca. 9 m: heller Stamm mit dunklen Rindenstrichen,
    lockere Krone. Ergaenzung zu th5_baum_ahorn / th5_baum_pappel / th6_fichte."""
    neu()
    RIND = mat("Birkenrinde", (0.90,0.89,0.85), 0.85)
    STRI = mat("Rindenstrich", (0.18,0.17,0.16), 0.90)
    AST  = mat("Ast", (0.72,0.70,0.66), 0.85)
    L1   = mat("Laub1", (0.44,0.66,0.24), 0.86)
    L2   = mat("Laub2", (0.52,0.72,0.30), 0.86)
    L3   = mat("Laub3", (0.36,0.58,0.22), 0.86)
    kegel(0, 0, 0.28, 0.28, 0.20, 0.56, RIND, 12)              # Wurzelanlauf
    kegel(0, 0, 3.28, 0.20, 0.10, 5.60, RIND, 12)              # Stamm 0.56 - 6.16
    kegel(0, 0, 7.06, 0.10, 0.04, 1.80, RIND, 10)              # Wipfel 6.16 - 7.96
    for i in range(26):                                        # Rindenstriche
        a = i*2.399
        z = 0.55 + (i % 13)*0.42 + 0.14*(i % 3)
        r = 0.195 - 0.018*z
        if r < 0.05: continue
        o = box(math.cos(a)*r, math.sin(a)*r, z, 0.035, 0.16, 0.05, STRI)
        o.rotation_euler[2] = a
    for (z0, ang, laenge, hoch, kr) in ((3.05, 0.4, 1.05, 0.95, 0.62), (3.80, 2.6, 0.95, 0.85, 0.58),
                                        (4.60, 1.5, 1.15, 1.05, 0.66), (5.35, 4.0, 1.00, 0.90, 0.62),
                                        (6.05, 5.3, 0.85, 0.80, 0.58), (6.70, 3.2, 0.72, 0.70, 0.54)):
        tx, ty, tz = math.cos(ang)*laenge, math.sin(ang)*laenge, z0 + hoch
        strebe((0, 0, z0), (tx, ty, tz), 0.055, AST)
        # Jeder Ast bekommt sein Laubpaket — sonst ragen nackte Stoecke aus der Krone.
        k = kugel(tx*0.94, ty*0.94, tz + kr*0.42, kr, (L1, L2, L3)[int(ang) % 3], 12)
        k.scale[2] = 1.10
    krone = ((0.00, 0.00, 7.90, 1.05, L1), (0.72, 0.42, 6.95, 0.95, L2),
             (-0.68, 0.30, 6.35, 0.98, L3), (0.30, -0.78, 6.60, 0.92, L1),
             (-0.42, -0.62, 5.55, 0.86, L2), (0.86, -0.18, 5.75, 0.80, L3),
             (-0.86, 0.52, 4.95, 0.74, L1), (0.52, 0.80, 5.05, 0.78, L2),
             (0.00, 0.20, 8.55, 0.62, L2), (-0.30, -0.28, 4.35, 0.62, L3))
    for (kx, ky, kz, kr, km) in krone:
        k = kugel(kx, ky, kz, kr, km, 12); k.scale[2] = 1.18
    export("th16_baum_birke", 0.012, 2)

if __name__ == "__main__":
    print("Asset-Charge 13 (th16, Park + Spielplatz + Sport):")
    for fn in (spielturm, schaukel, sandkasten, wippe, karussell_klein, pavillon,
               teichbruecke, skate_rampe, basketballplatz, grillplatz,
               blumenbeet, baum_birke):
        fn()
    print("fertig")
