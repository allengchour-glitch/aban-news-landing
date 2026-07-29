# -*- coding: utf-8 -*-
"""Asset-Charge 31 (th31_*): WAFFEN-PROPS fuer ein Action-Adventure.

Stilisierte Spiel-Requisiten — Fantasy, historisch, Sci-Fi. Gerundete, weiche
Silhouetten mit Charakter; KEINE masshaltigen oder mechanisch korrekten
Feuerwaffenteile, keine realen Modellbezeichnungen, keine funktionsfaehige
Mechanik, kein Blut, keine Verletzungsdarstellung.

Konventionen wie th5-th29 (siehe models/TH5-ASSETS.md, "Fallstricke"):
  * Meter, PBR-Materialien, Unterkante exakt z=0 (`absetzen()` rechnet das aus).
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT, sonst fehlt der Bevel.
  * `primitive_cube_add(size=1)` -> Kantenlaenge 1, Skalierung = Mass (NICHT /2).
  * Metallic max 0.6 bei niedriger Roughness — darueber rendert three.js ohne
    Environment-Map fast schwarz.
  * `rotation_euler[2]=pi` auf einem symmetrischen Koerper ist ein NO-OP.

AUSRICHTUNG (fuer die Spiel-Session):
  Alle Handwaffen LIEGEN flach: Klinge/Spitze zeigt nach **+y**, Griff/Knauf
  nach **-y**, Klingenbreite in x, Klingendicke in z, Unterkante z=0.
  In three.js wird daraus (glTF dreht die Achsen): Spitze nach -z, oben +y.
  Schilde stehen aufrecht, Schauseite (Buckel/Wappen) nach +y.
  Der Griffpunkt jedes Modells steht in `GRIFF` und wird beim Lauf ausgegeben.

FORMSPRACHE (Kern dieser Charge — es darf NICHTS eckig wirken):
  Quader-Ketten sind verboten. Alles Runde entsteht aus
    * `loft()`   — beliebige Ringfolge zu EINEM Mesh (Klingen, Schaefte, Schilde)
    * `dreh()`   — Rotationskoerper aus einem (Position, Radius)-Profil
    * `rohr()`   — Rundrohr entlang eines Pfades (Krallen, Ranken, Riemen, Sehnen)
    * `klinge()` — Linsen-Querschnitt mit echter Hohlkehle, laeuft in die Spitze aus
  Rundungen bekommen mind. 16 Segmente, Wicklungen sind Ringfolgen (`wicklung()`),
  keine glatten Zylinder.
"""
import bpy, bmesh, os, math
from mathutils import Vector

OUT_GLB = "/home/user/aban-news-landing/models"
OUT_STL = "/home/user/aban-news-landing/models/stl"
os.makedirs(OUT_STL, exist_ok=True)

TAU = math.tau

# Griffpunkt je Modell (x, y, z) in Metern, nach `absetzen()` — dort fasst die Hand an.
GRIFF = {}

# ---------------------------------------------------------------- Grundhelfer
def neu(): bpy.ops.wm.read_factory_settings(use_empty=True)

def nur(o):
    bpy.context.view_layer.objects.active = o
    for s_ in bpy.context.scene.objects: s_.select_set(False)
    o.select_set(True)

def mat(name, rgb, rough=0.7, metal=0.0, emit=None, estr=1.6, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = min(metal, 0.6)   # >0.6 rendert fast schwarz
    if emit:
        b.inputs["Emission Color"].default_value = (emit[0], emit[1], emit[2], 1)
        b.inputs["Emission Strength"].default_value = estr
    if alpha < 1.0:
        b.inputs["Alpha"].default_value = alpha
        try: m.blend_method = 'BLEND'
        except Exception: pass
    return m

def leucht(name, rgb, estr=2.6, alpha=1.0):
    """Leuchtmaterial: Basisfarbe = Leuchtfarbe, damit es auch unbeleuchtet knallt."""
    return mat(name, rgb, 0.28, 0.0, rgb, estr, alpha)

def box(x, y, z, sx, sy, sz, m=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    o = bpy.context.active_object; o.scale = (sx, sy, sz)
    if m: o.data.materials.append(m)
    return o

def zyl(x, y, z, r, h, m=None, seg=20, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kugel(x, y, z, r, m=None, seg=20):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=seg,
                                         ring_count=max(6, seg//2))
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def torus_y(x, y, z, R, r, m=None, mj=20, mn=8):
    """Ring, dessen Achse in y laeuft — Wicklungsring, Zwinge, Randbeschlag."""
    bpy.ops.mesh.primitive_torus_add(location=(x,y,z), rotation=(math.pi/2,0,0),
                                     major_radius=R, minor_radius=r,
                                     major_segments=mj, minor_segments=mn)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

# ---------------------------------------------------------------- Loft-Kern
def loft(rings, m=None, caps=(True, True), name="Loft"):
    """Loftet eine Ringfolge zu EINEM Mesh. Ringe mit identischen Punkten werden
    zu einem einzigen Vertex zusammengezogen -> echte Spitzen ohne Nullflaechen.
    Eine Kette einzelner Quader liest sich als Treppe; das ist genau der Fehler,
    den diese Funktion vermeidet."""
    verts = []; idx = []
    for r in rings:
        pts = [Vector(p) for p in r]
        if max((p - pts[0]).length for p in pts) < 1e-6:
            verts.append(tuple(pts[0])); idx.append([len(verts)-1]*len(pts))
        else:
            base = len(verts); verts += [tuple(p) for p in pts]
            idx.append([base + k for k in range(len(pts))])
    n = len(rings[0]); faces = []
    for i in range(len(rings) - 1):
        A = idx[i]; B = idx[i+1]
        for k in range(n):
            k2 = (k + 1) % n
            f = [A[k], A[k2], B[k2], B[k]]
            g = []
            for v in f:
                if not g or g[-1] != v: g.append(v)
            if len(g) > 2 and g[0] == g[-1]: g.pop()
            if len(g) >= 3: faces.append(tuple(g))
    if caps[0] and len(set(idx[0])) > 2:  faces.append(tuple(reversed(idx[0])))
    if caps[1] and len(set(idx[-1])) > 2: faces.append(tuple(idx[-1]))
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if m: me.materials.append(m)
    bpy.context.view_layer.objects.active = o
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free(); me.update()
    return o

def dreh(profil, m=None, seg=24, a1=0.0, a2=0.0, achse='y', flach=1.0, caps=(True, True)):
    """Rotationskoerper aus [(Position entlang der Achse, Radius), ...].
    achse='y' (Standard): Achse laeuft in y, Querschnitt in x/z, versetzt um (a1=x, a2=z).
    `flach` staucht die zweite Achse — aus dem Rundstab wird ein flacher Bugel
    (Parierstange). Das Profil darf hin- UND zuruecklaufen (Schildschale)."""
    rings = []
    for (p, r) in profil:
        ring = []
        for k in range(seg):
            a = k/seg*TAU
            u = r*math.cos(a); v = r*math.sin(a)*flach
            if   achse == 'y': ring.append((a1 + u, p, a2 + v))
            elif achse == 'x': ring.append((p, a1 + u, a2 + v))
            else:              ring.append((a1 + u, a2 + v, p))
        rings.append(ring)
    return loft(rings, m, caps, "Dreh")

def rohr(punkte, r1, r2=None, m=None, seg=12, up=(0,0,1), caps=(True, True)):
    """Rundrohr entlang eines Pfades (Parallelrahmen ueber eine Referenz-Achse).
    r1/r2 duerfen Listen sein -> verjuengende Krallen, Ranken, Riemen."""
    P = [Vector(p) for p in punkte]
    if r2 is None: r2 = r1
    R1 = list(r1) if isinstance(r1, (list, tuple)) else [r1]*len(P)
    R2 = list(r2) if isinstance(r2, (list, tuple)) else [r2]*len(P)
    U = Vector(up); rings = []
    for i, p in enumerate(P):
        if   i == 0:          t = P[1] - P[0]
        elif i == len(P) - 1: t = P[-1] - P[-2]
        else:                 t = P[i+1] - P[i-1]
        if t.length < 1e-9: t = Vector((0,1,0))
        t.normalize()
        u = U - t*U.dot(t)
        if u.length < 1e-4:
            u = Vector((1,0,0)); u = u - t*u.dot(t)
        u.normalize(); b = t.cross(u)
        ring = []
        for k in range(seg):
            a = k/seg*TAU
            ring.append(tuple(p + b*(R1[i]*math.cos(a)) + u*(R2[i]*math.sin(a))))
        rings.append(ring)
    return loft(rings, m, caps, "Rohr")

# ---------------------------------------------------------------- Querschnitte
def q_klinge(hw, ht, fd):
    """Klingen-Querschnitt (16 Punkte) in x/z: Linse mit beidseitiger Hohlkehle."""
    fd = max(0.0, min(fd, ht*0.62))
    o = [(1.00*hw, 0.0), (0.80*hw, 0.60*ht), (0.56*hw, ht), (0.34*hw, ht - fd*0.5),
         (0.0, ht - fd), (-0.34*hw, ht - fd*0.5), (-0.56*hw, ht), (-0.80*hw, 0.60*ht)]
    u = [(-1.00*hw, 0.0), (-0.80*hw, -0.60*ht), (-0.56*hw, -ht), (-0.34*hw, -(ht - fd*0.5)),
         (0.0, -(ht - fd)), (0.34*hw, -(ht - fd*0.5)), (0.56*hw, -ht), (0.80*hw, -0.60*ht)]
    return o + u

def q_slab(a0, a1, ht):
    """Blatt-Querschnitt (10 Punkte): Strecke a0..a1 mit Linsendicke ht.
    Fuer Axtblatt, Bogenwurfarm, Bolzenspitze."""
    L = a1 - a0
    o = [(a0, 0.0), (a0 + 0.12*L, 0.58*ht), (a0 + 0.30*L, ht),
         (a1 - 0.30*L, ht), (a1 - 0.12*L, 0.58*ht), (a1, 0.0)]
    u = [(a1 - 0.12*L, -0.58*ht), (a1 - 0.30*L, -ht),
         (a0 + 0.30*L, -ht), (a0 + 0.12*L, -0.58*ht)]
    return o + u

def q_rund(hx, hz, seg=16, n=0.72):
    """Superellipse: n=1 Ellipse, n<1 gerundetes Rechteck (Schaefte, Griffe)."""
    p = []
    for k in range(seg):
        a = k/seg*TAU
        ca = math.cos(a); sa = math.sin(a)
        p.append((hx*math.copysign(abs(ca)**n, ca), hz*math.copysign(abs(sa)**n, sa)))
    return p

def ipol(kontur, t):
    """Lineare Interpolation in [(t, wert), ...]."""
    if t <= kontur[0][0]: return kontur[0][1]
    for i in range(len(kontur) - 1):
        t0, w0 = kontur[i]; t1, w1 = kontur[i+1]
        if t <= t1:
            if t1 - t0 < 1e-9: return w1
            u = (t - t0)/(t1 - t0)
            return w0 + (w1 - w0)*u
    return kontur[-1][1]

def klinge(y0, y1, kontur, dicke, m, n=20, fuller=0.45, cx=0.0, cz=0.0, hohl_bis=0.62):
    """Klinge als EIN gelofteter Koerper. kontur = [(t, Halbbreite)], t=0 Wurzel,
    t=1 Spitze (Halbbreite 0 -> echter Spitzen-Vertex)."""
    rings = []
    for i in range(n + 1):
        t = i/n
        y = y0 + (y1 - y0)*t
        hw = ipol(kontur, t)
        ht = dicke*0.5*(1.0 - 0.42*t*t)
        if hw < 1e-4:
            rings.append([(cx, y, cz)]*16)
        else:
            f = 1.0 if t < hohl_bis else max(0.0, 1.0 - (t - hohl_bis)/(1.0 - hohl_bis))
            rings.append([(cx + px, y, cz + pz) for (px, pz) in q_klinge(hw, ht, ht*fuller*f)])
    return loft(rings, m, (True, True), "Klinge")

def wicklung(y0, y1, r, m, n=None, dick=0.0058, seg=16):
    """Griffwicklung als Ringfolge — ein glatter Zylinder sieht sofort billig aus."""
    if n is None: n = max(3, int(round(abs(y1 - y0)/(dick*2.15))))
    for i in range(n):
        y = y0 + (y1 - y0)*(i + 0.5)/n
        torus_y(0, y, 0, r, dick, m, seg, 7)
    return n

def kreuzwicklung(y0, y1, r, m, dick=0.0042, n=7):
    """Zusaetzliche schraege Kreuzbaender ueber einer Wicklung (Leder-Optik)."""
    for i in range(n):
        y = y0 + (y1 - y0)*(i + 0.5)/n
        o = torus_y(0, y, 0, r*1.03, dick, m, 14, 6)
        o.rotation_euler[0] = 0.30 if i % 2 == 0 else -0.30

# ---------------------------------------------------------------- Abschluss
def absetzen():
    """Verschiebt die ganze Szene so, dass die Unterkante exakt z=0 ist.
    ACHTUNG: `matrix_world` wird erst nach `view_layer.update()` neu gerechnet —
    ohne den Aufruf liefert das ZULETZT skalierte Objekt seine Rohmasse
    (eine 1-m-Kugel statt 3 cm) und die ganze Szene rutscht um fast einen Meter."""
    bpy.context.view_layer.update()
    zmin = 1e9
    for o in bpy.context.scene.objects:
        if o.type != 'MESH': continue
        for c in o.bound_box:
            zmin = min(zmin, (o.matrix_world @ Vector(c)).z)
    for o in bpy.context.scene.objects:
        o.location.z -= zmin
    return zmin

def runden(width=0.006, segments=2, winkel=44):
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': continue
        nur(o)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        m = o.modifiers.new("Bevel", 'BEVEL')
        d_min = max(1e-4, min(o.dimensions))
        m.width = min(width, 0.26*d_min)
        m.segments = segments
        m.use_clamp_overlap = True
        m.limit_method = 'ANGLE'; m.angle_limit = math.radians(winkel)
        try: bpy.ops.object.shade_auto_smooth(angle=math.radians(38))
        except Exception: pass

def export(name, griff, bevel=0.006, seg=2):
    dz = absetzen()
    GRIFF[name] = (round(griff[0], 3), round(griff[1], 3), round(griff[2] - dz, 3))
    runden(bevel, seg)
    for o in bpy.context.scene.objects: o.select_set(True)
    p1 = os.path.join(OUT_GLB, name + ".glb")
    # export_apply=True ist PFLICHT — sonst landet der Bevel NICHT im GLB.
    bpy.ops.export_scene.gltf(filepath=p1, export_format='GLB', use_selection=False, export_apply=True)
    p2 = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p2)
    except Exception: bpy.ops.export_mesh.stl(filepath=p2)
    print("  -> %-24s %7d B   Griff %s" % (name, os.path.getsize(p1), GRIFF[name]))

# ---------------------------------------------------------------- Materialsatz
def M_stahl():   return mat("Stahl",     (0.64,0.67,0.72), 0.30, 0.55)
def M_stahl_d(): return mat("StahlDkl",  (0.40,0.43,0.48), 0.38, 0.50)
def M_messing(): return mat("Messing",   (0.76,0.60,0.26), 0.32, 0.55)
def M_bronze():  return mat("Bronze",    (0.60,0.40,0.20), 0.40, 0.45)
def M_holz():    return mat("Holz",      (0.44,0.29,0.16), 0.76)
def M_holz_d():  return mat("HolzDkl",   (0.31,0.19,0.11), 0.80)
def M_leder():   return mat("Leder",     (0.36,0.21,0.13), 0.86)
def M_leder_d(): return mat("LederDkl",  (0.22,0.14,0.09), 0.88)
def M_stoff():   return mat("Stoff",     (0.55,0.16,0.14), 0.90)


# ================================================================ 1) Ritterschwert
def schwert_ritter():
    """Ritterschwert 1,05 m: Klinge mit Hohlkehle, Parierstange, Wicklung, Scheibenknauf.
    Griffpunkt: Mitte der Wicklung."""
    neu()
    ST = M_stahl(); SD = M_stahl_d(); MS = M_messing(); LE = M_leder(); LD = M_leder_d()
    ZA = 0.048                                  # Achshoehe = groesster Radius (Knauf)
    # Klinge 0.00 .. 0.79, Linsenquerschnitt mit Hohlkehle, laeuft in die Spitze aus
    klinge(0.0, 0.79, [(0.0,0.0265),(0.15,0.0262),(0.55,0.0240),(0.80,0.0205),
                       (0.92,0.0150),(1.0,0.0)], 0.0118, ST, 22, 0.46, 0.0, ZA, 0.58)
    # Fehlschaerfe/Zwinge am Klingenfuss
    dreh([(-0.020,0.012),(-0.014,0.021),(0.004,0.024),(0.020,0.021),(0.028,0.014)],
         MS, 22, 0.0, ZA, 'y', 0.62)
    # Parierstange: Rotationskoerper um x, in z gestaucht -> flacher Bugel
    dreh([(-0.118,0.003),(-0.112,0.012),(-0.092,0.017),(-0.055,0.020),(0.0,0.023),
          (0.055,0.020),(0.092,0.017),(0.112,0.012),(0.118,0.003)],
         ST, 20, -0.030, ZA, 'x', 0.60)
    for sx in (-1, 1):                          # Enden leicht verdickt (Knospe)
        kugel(sx*0.112, -0.030, ZA, 0.0125, MS, 16).scale = (1.0, 0.85, 0.62)
    # Griff: Rotationskoerper mit leichter Taille + Lederwicklung
    dreh([(-0.204,0.0170),(-0.196,0.0196),(-0.170,0.0203),(-0.130,0.0186),
          (-0.090,0.0186),(-0.060,0.0205),(-0.048,0.0208),(-0.042,0.0195)],
         LD, 22, 0.0, ZA, 'y')
    for o in ([torus_y(0, -0.204 + (0.156)*(i + 0.5)/13, ZA, 0.0203, 0.0060, LE, 18, 7)
               for i in range(13)]): pass
    for i in range(5):                          # Kreuzband ueber der Wicklung
        o = torus_y(0, -0.190 + i*0.036, ZA, 0.0215, 0.0040, LD, 16, 6)
        o.rotation_euler[0] = 0.34 if i % 2 == 0 else -0.34
    # Scheibenknauf
    dreh([(-0.262,0.004),(-0.258,0.019),(-0.250,0.033),(-0.240,0.042),(-0.228,0.046),
          (-0.216,0.043),(-0.208,0.033),(-0.202,0.022),(-0.198,0.018)],
         MS, 24, 0.0, ZA, 'y')
    torus_y(0, -0.228, ZA, 0.0405, 0.0075, ST, 22, 8)
    kugel(0, -0.264, ZA, 0.010, MS, 16)
    export("th31_schwert_ritter", (0.0, -0.125, ZA))


# ================================================================ 2) Kurzschwert
def schwert_kurz():
    """Kurzschwert 0,70 m mit breiterer, blattfoermiger Klinge. Griffpunkt: Wicklungsmitte."""
    neu()
    ST = M_stahl(); MS = M_messing(); BR = M_bronze(); LE = M_leder(); LD = M_leder_d()
    ZA = 0.046
    klinge(0.0, 0.50, [(0.0,0.0335),(0.12,0.0348),(0.45,0.0330),(0.72,0.0290),
                       (0.88,0.0195),(1.0,0.0)], 0.0140, ST, 20, 0.42, 0.0, ZA, 0.55)
    dreh([(-0.016,0.014),(-0.010,0.024),(0.006,0.027),(0.020,0.024),(0.026,0.016)],
         BR, 22, 0.0, ZA, 'y', 0.60)
    # kurze, kraeftige Parierstange mit knospenfoermigen Enden
    dreh([(-0.088,0.004),(-0.082,0.014),(-0.062,0.019),(-0.030,0.023),(0.0,0.026),
          (0.030,0.023),(0.062,0.019),(0.082,0.014),(0.088,0.004)],
         BR, 20, -0.026, ZA, 'x', 0.66)
    for sx in (-1, 1):
        kugel(sx*0.086, -0.026, ZA, 0.014, MS, 16).scale = (1.0, 0.80, 0.68)
    dreh([(-0.158,0.0175),(-0.150,0.0200),(-0.126,0.0205),(-0.096,0.0188),
          (-0.066,0.0192),(-0.046,0.0208),(-0.038,0.0200)], LD, 22, 0.0, ZA, 'y')
    for i in range(9):
        torus_y(0, -0.152 + 0.110*(i + 0.5)/9, ZA, 0.0206, 0.0062, LE, 18, 7)
    for i in range(4):
        o = torus_y(0, -0.142 + i*0.030, ZA, 0.0218, 0.0040, LD, 16, 6)
        o.rotation_euler[0] = 0.32 if i % 2 == 0 else -0.32
    # Knauf: gedrungene Zwiebel
    dreh([(-0.200,0.004),(-0.196,0.020),(-0.188,0.034),(-0.178,0.042),(-0.168,0.044),
          (-0.160,0.038),(-0.155,0.026),(-0.152,0.019)], BR, 24, 0.0, ZA, 'y')
    torus_y(0, -0.176, ZA, 0.0395, 0.0070, MS, 20, 8)
    kugel(0, -0.202, ZA, 0.010, MS, 16)
    export("th31_schwert_kurz", (0.0, -0.100, ZA))


# ================================================================ 3) Streitaxt
def axt_kampf():
    """Streitaxt 0,86 m: gebogene Schneide, Bart, Rueckendorn, Holzstiel mit Wicklung.
    Griffpunkt: unteres Stieldrittel."""
    neu()
    ST = M_stahl(); SD = M_stahl_d(); HO = M_holz(); LE = M_leder(); MS = M_messing()
    ZA = 0.031
    # Stiel: Rotationskoerper mit leichter Verdickung an beiden Enden
    dreh([(-0.420,0.008),(-0.414,0.020),(-0.404,0.0245),(-0.386,0.0225),(-0.330,0.0200),
          (-0.180,0.0192),(0.000,0.0198),(0.180,0.0208),(0.330,0.0215),(0.392,0.0212),
          (0.400,0.0195),(0.406,0.010)], HO, 22, 0.0, ZA, 'y')
    # Axtblatt: EIN Loft quer ueber x. Die Schneide (grosses x) laeuft NICHT gerade
    # aus, sondern die Ringe werden zum Rand hin wieder kuerzer -> echte Sichel
    # (der erste Wurf hatte eine brettartig gerade Schneide).
    kopf = [(-0.078, 0.258, 0.298, 0.0075),
            (-0.045, 0.245, 0.316, 0.0180),
            (-0.012, 0.223, 0.340, 0.0268),
            ( 0.020, 0.206, 0.356, 0.0282),
            ( 0.060, 0.187, 0.373, 0.0242),
            ( 0.100, 0.171, 0.390, 0.0196),
            ( 0.140, 0.159, 0.406, 0.0146),
            ( 0.175, 0.152, 0.420, 0.0096),
            ( 0.200, 0.152, 0.428, 0.0056),
            ( 0.218, 0.163, 0.424, 0.0032),
            ( 0.232, 0.185, 0.412, 0.0022),
            ( 0.242, 0.213, 0.392, 0.0016),
            ( 0.249, 0.248, 0.360, 0.0012),
            ( 0.2525, 0.286, 0.322, 0.0009),
            ( 0.2540, 0.300, 0.308, 0.0006)]
    rings = [[(x, a, ZA + h) for (a, h) in q_slab(y0, y1, ht)] for (x, y0, y1, ht) in kopf]
    loft(rings, ST, (True, True), "Axtblatt")
    # Auge: Zwingen ueber und unter dem Blatt + flache Langetten am Stiel
    for yy, rr in ((0.196, 0.030), (0.352, 0.029)):
        torus_y(0, yy, ZA, rr, 0.0085, MS, 26, 8)
    for sz in (-1, 1):
        rohr([(0, 0.050, ZA + sz*0.0190), (0, 0.120, ZA + sz*0.0198),
              (0, 0.200, ZA + sz*0.0204), (0, 0.290, ZA + sz*0.0208)],
             [0.006, 0.014, 0.016, 0.016], 0.0042, SD, 10, (0,0,1))
    # Wicklung am Griff + Endknauf
    for i in range(16):
        torus_y(0, -0.360 + 0.230*(i + 0.5)/16, ZA, 0.0208, 0.0062, LE, 18, 7)
    dreh([(-0.436,0.006),(-0.430,0.018),(-0.422,0.027),(-0.410,0.029),(-0.398,0.024)],
         MS, 22, 0.0, ZA, 'y')
    export("th31_axt_kampf", (0.0, -0.235, ZA))


# ================================================================ 4) Streitkolben
def streitkolben():
    """Streitkolben 0,62 m: gerippter Kopf aus acht gerundeten Flanken, Kernkugel,
    Dornspitze, gewickelter Griff. Griffpunkt: Wicklungsmitte."""
    neu()
    ST = M_stahl(); SD = M_stahl_d(); MS = M_messing(); LE = M_leder(); LD = M_leder_d()
    RIB = 0.046                                  # radiale Reichweite der Flanken
    ZA = 0.028 + RIB                             # Achshoehe = groesster Radius
    # Schaft
    dreh([(-0.278,0.010),(-0.272,0.021),(-0.258,0.0235),(-0.230,0.0215),(-0.120,0.0198),
          (0.020,0.0196),(0.090,0.0205),(0.120,0.0215)], SD, 22, 0.0, ZA, 'y')
    # Kopfkern
    dreh([(0.098,0.020),(0.112,0.038),(0.130,0.050),(0.152,0.056),(0.180,0.058),
          (0.208,0.055),(0.230,0.046),(0.246,0.032),(0.254,0.020),(0.258,0.012)],
         ST, 28, 0.0, ZA, 'y')
    for i in range(8):                           # acht gerundete Rippen (Flanken)
        a = i/8*TAU
        o = kugel(0.028*math.sin(a), 0.180, ZA + 0.028*math.cos(a), 1.0, ST, 20)
        o.scale = (0.0115, 0.070, RIB)
        o.rotation_euler[1] = a
    torus_y(0, 0.118, ZA, 0.044, 0.0075, MS, 30, 8)   # Zierring unten
    torus_y(0, 0.240, ZA, 0.034, 0.0068, MS, 30, 8)   # Zierring oben
    # Dornspitze — deutlich laenger, sonst verschwindet sie zwischen den Rippen
    dreh([(0.240,0.024),(0.256,0.022),(0.280,0.016),(0.304,0.0085),(0.320,0.0)],
         ST, 22, 0.0, ZA, 'y')
    # Griffwicklung + Knauf
    for i in range(15):
        torus_y(0, -0.250 + 0.230*(i + 0.5)/15, ZA, 0.0208, 0.0060, LE, 18, 7)
    for i in range(5):
        o = torus_y(0, -0.228 + i*0.046, ZA, 0.0220, 0.0040, LD, 16, 6)
        o.rotation_euler[0] = 0.30 if i % 2 == 0 else -0.30
    dreh([(-0.300,0.006),(-0.294,0.020),(-0.286,0.029),(-0.274,0.030),(-0.266,0.024)],
         MS, 26, 0.0, ZA, 'y')
    export("th31_streitkolben", (0.0, -0.160, ZA))


# ================================================================ 5) Speer
def speer():
    """Speer 2,20 m: Blattspitze mit Mittelgrat, Tuelle, Wicklung, Schuh.
    Griffpunkt: Wicklung hinter der Mitte."""
    neu()
    ST = M_stahl(); SD = M_stahl_d(); HO = M_holz(); LE = M_leder(); MS = M_messing()
    ZA = 0.026
    # Schaft
    prof = []
    for i in range(21):
        y = -1.060 + (0.845 + 1.060)*i/20
        prof.append((y, 0.0182 - 0.0022*(y + 1.06)/1.905))
    dreh([(-1.070,0.008)] + prof + [(0.850,0.0150)], HO, 22, 0.0, ZA, 'y')
    # Tuelle (Schaftkappe)
    dreh([(0.760,0.0158),(0.780,0.0205),(0.800,0.0225),(0.840,0.0222),(0.868,0.0200),
          (0.884,0.0170),(0.894,0.0140)], ST, 22, 0.0, ZA, 'y')
    for yy in (0.792, 0.836, 0.876):
        torus_y(0, yy, ZA, 0.0232, 0.0055, MS, 20, 8)
    # Blattspitze
    klinge(0.868, 1.100, [(0.0,0.0105),(0.14,0.0245),(0.34,0.0305),(0.58,0.0280),
                          (0.80,0.0180),(0.92,0.0095),(1.0,0.0)],
           0.0135, ST, 20, 0.30, 0.0, ZA, 0.50)
    # Wicklungen: unter der Spitze und am Griff
    for i in range(12):
        torus_y(0, 0.640 + 0.120*(i + 0.5)/12, ZA, 0.0176, 0.0056, LE, 18, 7)
    for i in range(20):
        torus_y(0, -0.300 + 0.260*(i + 0.5)/20, ZA, 0.0180, 0.0058, LE, 18, 7)
    for i in range(6):
        o = torus_y(0, -0.280 + i*0.044, ZA, 0.0192, 0.0038, M_leder_d(), 16, 6)
        o.rotation_euler[0] = 0.28 if i % 2 == 0 else -0.28
    # Schuh am unteren Ende
    dreh([(-1.100,0.0),(-1.092,0.010),(-1.078,0.018),(-1.056,0.0215),(-1.030,0.0215),
          (-1.014,0.0195),(-1.006,0.0175)], SD, 22, 0.0, ZA, 'y')
    torus_y(0, -1.020, ZA, 0.0222, 0.0050, MS, 20, 8)
    export("th31_speer", (0.0, -0.170, ZA))


# ================================================================ 6) Langbogen
def bogen():
    """Langbogen 1,70 m: gelofteter D-Querschnitt-Wurfarm, Sehne, Griffwicklung,
    Hornnocken. Liegt flach; oberes Ende +y, Sehne bei x=0.
    Griffpunkt: Wicklungsmitte am Griff (x = Ruecklage des Bogens)."""
    neu()
    HO = M_holz(); HD = M_holz_d(); LE = M_leder(); LD = M_leder_d()
    HORN = mat("Horn", (0.86,0.80,0.66), 0.44)
    SEHN = mat("Sehne", (0.88,0.84,0.72), 0.62)
    L = 0.845; C = 0.150; ZA = 0.028
    def xm(y):                                   # Ruecklage des Wurfarms
        u = min(1.0, abs(y)/L)
        return C*(1.0 - u**1.75)
    def masse(y):                                # (Dicke in x, Breite in z)
        u = min(1.0, abs(y)/L)
        g = math.exp(-(y/0.115)**2)              # Griffverdickung in der Mitte
        hx = (0.0130 + 0.0075*(1 - u**1.6))*(1 + 0.55*g)
        hz = (0.0075 + 0.0175*(1 - u**1.9))*(1 + 0.42*g)
        return hx, hz
    rings = []
    N = 60
    for i in range(N + 1):
        y = -L + 2*L*i/N
        hx, hz = masse(y)
        cxx = xm(y)
        rings.append([(cxx + px, y, ZA + pz) for (px, pz) in q_rund(hx, hz, 16, 0.80)])
    loft(rings, HO, (True, True), "Wurfarm")
    # Ruecken-Streifen (dunkleres Holz) als schmaler Loft knapp ueber dem Arm
    rings2 = []
    for i in range(N + 1):
        y = -L + 2*L*i/N
        hx, hz = masse(y)
        rings2.append([(xm(y) + hx*0.42 + px, y, ZA + pz)
                       for (px, pz) in q_rund(hx*0.34, hz*0.72, 12, 0.85)])
    loft(rings2, HD, (True, True), "Ruecken")
    # Hornnocken an den Enden
    for sy in (-1, 1):
        dreh([(sy*0.808, 0.0075),(sy*0.826, 0.0110),(sy*0.845, 0.0115),
              (sy*0.858, 0.0085),(sy*0.864, 0.0045)][::sy],
             HORN, 16, xm(sy*0.836), ZA, 'y')
        kugel(0.0, sy*0.851, ZA, 0.0075, HORN, 14)
    # Sehne + Wickelbund in der Mitte
    zyl(0, 0, ZA, 0.0030, 1.702, SEHN, 12, rot=(math.pi/2, 0, 0))
    for i in range(11):
        torus_y(0, -0.052 + 0.104*(i + 0.5)/11, ZA, 0.0048, 0.0016, LD, 12, 6)
    for sy in (-1, 1):                            # Schlaufe an den Nocken
        for i in range(4):
            torus_y(0, sy*(0.790 + i*0.014), ZA, 0.0042, 0.0014, LD, 10, 6)
    # Griffwicklung (Ringe um den verdickten Griff)
    for i in range(15):
        y = -0.088 + 0.176*(i + 0.5)/15
        hx, hz = masse(y)
        o = torus_y(xm(y), y, ZA, max(hx, hz)*0.98, 0.0055, LE, 18, 7)
        o.scale = (1.0, 1.0, min(1.0, hz/max(hx, hz))*1.06)
    rohr([(xm(0.10) + 0.012, 0.098, ZA + 0.008), (xm(0.12) + 0.020, 0.118, ZA + 0.014),
          (xm(0.14) + 0.022, 0.140, ZA + 0.016)], 0.010, 0.006, LD, 10)   # Pfeilauflage
    export("th31_bogen", (C, 0.0, ZA))


# ================================================================ 7) Koecher
def koecher():
    """Koecher mit 7 Pfeilen und Tragriemen. Pfeilspitzen zeigen nach +y.
    Griffpunkt: Mitte des Tragriemens."""
    neu()
    LE = M_leder(); LD = M_leder_d(); HO = M_holz(); ST = M_stahl(); MS = M_messing()
    FED = mat("Feder", (0.80,0.36,0.20), 0.86)
    FED2 = mat("Feder2", (0.90,0.88,0.82), 0.86)
    ZA = 0.082
    # Koecherkoerper (Rotationskoerper, leicht konisch)
    dreh([(-0.300,0.004),(-0.296,0.030),(-0.288,0.052),(-0.276,0.062),(-0.200,0.068),
          (-0.060,0.074),(0.080,0.078),(0.200,0.080),(0.262,0.081),(0.274,0.079),
          (0.278,0.070)], LE, 26, 0.0, ZA, 'y')
    for yy, rr in ((-0.272, 0.064), (-0.120, 0.0715), (0.060, 0.0775), (0.256, 0.0815)):
        torus_y(0, yy, ZA, rr, 0.0075, LD, 24, 8)     # Bundriemen
    for i in range(12):                               # Nieten am oberen Bund
        a = i/12*TAU
        kugel(0.0805*math.sin(a), 0.256, ZA + 0.0805*math.cos(a), 0.0058, MS, 10)
    dreh([(0.262,0.074),(0.272,0.066),(0.276,0.052),(0.272,0.030),(0.268,0.0)],
         mat("Koecherinnen", (0.16,0.10,0.07), 0.92), 26, 0.0, ZA, 'y')   # offene Muendung
    # 7 Pfeile
    plaetze = [(0.0,0.0), (0.044,0.012), (-0.044,0.010), (0.022,-0.042),
               (-0.024,-0.040), (0.050,-0.028), (-0.052,-0.026)]
    for k, (px, pz) in enumerate(plaetze):
        y_o = 0.585 + 0.038*((k % 3) - 1)
        p0 = (px*0.35, 0.05, ZA + pz*0.35)
        p1 = (px, y_o, ZA + pz)
        rohr([p0, (0.5*(p0[0]+p1[0]), 0.34, ZA + 0.5*(pz*0.35 + pz)), p1],
             0.0055, None, HO, 10)
        d = Vector(p1) - Vector(p0); d.normalize()
        for f in range(3):                            # drei Federn je Pfeil
            a = f/3*TAU + k*0.4
            base = Vector(p1) - d*0.070
            o = kugel(base.x + 0.013*math.sin(a), base.y, base.z + 0.013*math.cos(a),
                      1.0, FED if k % 2 == 0 else FED2, 14)
            o.scale = (0.0018, 0.055, 0.021)
            o.rotation_euler[1] = a
        nk = Vector(p1) - d*0.010
        dreh([(nk.y - 0.012, 0.0064),(nk.y + 0.004, 0.0070),(nk.y + 0.014, 0.0056)],
             LD, 12, nk.x, nk.z, 'y')
    # Tragriemen: gebogener Flachriemen ueber die Aussenseite
    pts = []
    for i in range(15):
        t = i/14
        y = 0.235 - 0.470*t
        x = 0.070 + 0.235*math.sin(math.pi*t)**0.85
        pts.append((x, y, ZA + 0.012*math.sin(math.pi*t)))
    rohr(pts, 0.0055, 0.028, LD, 12, (0,0,1))
    for i in (0, 14):                                  # Schnallen
        torus_y(pts[i][0], pts[i][1], pts[i][2], 0.020, 0.0055, MS, 16, 8)
    export("th31_koecher", (0.30, 0.0, ZA))


# ================================================================ 8) Armbrust
def armbrust():
    """Armbrust 0,86 m: gelofteter Schaft, gebogener Bugel, Sehne, aufgelegter Bolzen,
    Steigbuegel. Stilisierte Requisite ohne funktionsfaehige Mechanik.
    Griffpunkt: Schafttaille hinter dem Abzug."""
    neu()
    HO = M_holz(); HD = M_holz_d(); ST = M_stahl(); SD = M_stahl_d(); MS = M_messing()
    LE = M_leder(); FED = mat("Feder", (0.86,0.84,0.78), 0.86)
    # --- Schaft: EIN Loft, Unterkante fast flach, Kolben hoch, Nase schlank
    schaft = [(-0.440, 0.026, 0.012, 0.100),
              (-0.400, 0.031, 0.008, 0.118),
              (-0.340, 0.033, 0.006, 0.122),
              (-0.280, 0.031, 0.005, 0.098),
              (-0.220, 0.029, 0.006, 0.076),
              (-0.140, 0.028, 0.007, 0.066),
              (-0.040, 0.031, 0.009, 0.064),
              ( 0.080, 0.033, 0.011, 0.063),
              ( 0.200, 0.034, 0.012, 0.062),
              ( 0.300, 0.033, 0.013, 0.060),
              ( 0.370, 0.028, 0.016, 0.054),
              ( 0.404, 0.019, 0.022, 0.044)]
    rings = []
    for (y, hx, zlo, zhi) in schaft:
        zc = (zlo + zhi)/2; hz = (zhi - zlo)/2
        rings.append([(px, y, zc + pz) for (px, pz) in q_rund(hx, hz, 16, 0.68)])
    loft(rings, HO, (True, True), "Schaft")
    # Wangenauflage + Ruecken (dunkles Holz)
    rohr([(0, -0.400, 0.116), (0, -0.330, 0.120), (0, -0.250, 0.098), (0, -0.180, 0.076)],
         0.026, 0.010, HD, 14)
    # Bahn fuer den Bolzen: zwei weiche Fuehrungsleisten
    for sx in (-1, 1):
        rohr([(sx*0.014, 0.030, 0.066), (sx*0.014, 0.200, 0.065), (sx*0.014, 0.360, 0.058)],
             0.007, 0.007, HD, 10)
    # --- Bugel: Loft quer ueber x, Mittellinie nach hinten gebogen
    def by(x): return 0.318 - 0.90*x*x
    bg = []
    for i in range(33):
        x = -0.320 + 0.640*i/32
        u = abs(x)/0.320
        hz = 0.0165*(1 - 0.58*u*u); hy = 0.0230*(1 - 0.55*u*u)
        bg.append([(x, by(x) + pz2, 0.082 + pz1)
                   for (pz2, pz1) in q_rund(hy, hz, 14, 0.78)])
    loft(bg, SD, (True, True), "Bugel")
    for sx in (-1, 1):                                  # Bugelenden gerundet
        kugel(sx*0.320, by(0.320), 0.082, 0.011, MS, 14)
    torus_y(0, 0.315, 0.078, 0.030, 0.008, MS, 18, 8)   # Bugelbund am Schaft
    # --- Sehne: Tip - Nuss - Tip
    for sx in (-1, 1):
        rohr([(sx*0.318, by(0.318), 0.082), (sx*0.16, 0.190, 0.079), (0.0, 0.040, 0.078)],
             0.0035, 0.0035, FED, 8)
    for i in range(7):                                   # Mittelwicklung der Sehne
        zyl(0, 0.040 + 0.004*i, 0.078, 0.0058, 0.0032, LE, 10, rot=(math.pi/2,0,0))
    # --- Nuss / Gehaeuse (rund, angedeutet, keine Mechanik)
    zyl(0, 0.030, 0.070, 0.020, 0.062, MS, 20, rot=(0, math.pi/2, 0))
    dreh([(-0.030,0.018),(-0.020,0.026),(0.020,0.027),(0.030,0.019)], HD, 18, 0.030, 0.070, 'x')
    # --- Abzug + Buegel darunter
    rohr([(0, -0.060, 0.052), (0, -0.075, 0.036), (0, -0.086, 0.030)], 0.010, 0.005, MS, 10)
    rohr([(0, -0.030, 0.050), (0, -0.062, 0.018), (0, -0.105, 0.014), (0, -0.140, 0.040)],
         0.008, 0.008, SD, 10)
    # --- Steigbuegel an der Nase (kraeftiger Rundbuegel)
    rohr([(0.036, 0.400, 0.046), (0.056, 0.440, 0.016), (0.036, 0.462, -0.014),
          (0.0, 0.468, -0.024), (-0.036, 0.462, -0.014), (-0.056, 0.440, 0.016),
          (-0.036, 0.400, 0.046)], 0.009, 0.013, SD, 12)
    # --- Kolbenkappe hinten
    dreh([(-0.446,0.0),(-0.450,0.020),(-0.452,0.040),(-0.448,0.056),(-0.438,0.060),
          (-0.430,0.056)], SD, 20, 0.0, 0.062, 'y', 0.62)
    # --- Bolzen liegt in der Bahn (heller Schaft, damit er sich abhebt)
    BOL = mat("Bolzen", (0.72,0.58,0.34), 0.72)
    rohr([(0, 0.040, 0.076), (0, 0.300, 0.076)], 0.0068, 0.0068, BOL, 12)
    dreh([(0.298,0.0068),(0.314,0.0118),(0.356,0.0080),(0.378,0.0)], ST, 16, 0.0, 0.076, 'y')
    for f in range(3):
        a = f/3*TAU
        o = kugel(0.009*math.sin(a), 0.076, 0.076 + 0.009*math.cos(a), 1.0, FED, 14)
        o.scale = (0.0016, 0.036, 0.015); o.rotation_euler[1] = a
    export("th31_armbrust", (0.0, -0.150, 0.040))


# ================================================================ 9) Rundschild
def schild_rund():
    """Rundschild 0,75 m: gewoelbte Schale (Rotationskoerper), Stahlbuckel,
    Randbeschlag, sechs Beschlagbaender, Nieten, Griffbuegel hinten.
    Steht aufrecht, Schauseite +y. Griffpunkt: Buegelmitte hinter der Nabe."""
    neu()
    HO = M_holz(); HD = M_holz_d(); ST = M_stahl(); SD = M_stahl_d(); MS = M_messing()
    LE = M_leder()
    ROT = mat("Schildrot", (0.62,0.16,0.14), 0.78)
    # Schale: Profil laeuft von vorn/Mitte nach aussen und hinten wieder zurueck
    def yf(r): return 0.030 - 0.070*(r/0.356)**1.9
    prof = []
    rr = [0.003, 0.05, 0.11, 0.17, 0.23, 0.285, 0.325, 0.350, 0.356]
    for r in rr: prof.append((yf(r), r))
    for r in reversed(rr): prof.append((yf(r) - 0.024, r))
    dreh(prof, ROT, 40, 0.0, 0.0, 'y', 1.0, (True, True))
    # Holzrand (schmaler Streifen aussen) + Randbeschlag
    dreh([(yf(0.330), 0.330), (yf(0.356), 0.356), (yf(0.356) - 0.024, 0.356),
          (yf(0.330) - 0.024, 0.330)], HD, 40, 0.0, 0.0, 'y')
    bpy.ops.mesh.primitive_torus_add(location=(0, yf(0.356) - 0.012, 0), rotation=(math.pi/2,0,0),
                                     major_radius=0.356, minor_radius=0.019,
                                     major_segments=48, minor_segments=10)
    bpy.context.active_object.data.materials.append(ST)
    # Beschlagbaender: sechs Rippen von der Nabe zum Rand, folgen der Woelbung
    for i in range(6):
        a = i/6*TAU
        pts = []
        for k in range(7):
            r = 0.085 + (0.345 - 0.085)*k/6
            pts.append((r, yf(r) + 0.007, 0.0))
        o = rohr(pts, 0.0055, 0.0155, SD, 10, (0,0,1))
        o.rotation_euler[1] = a
    # Buckel (Nabe)
    dreh([(0.118,0.0),(0.114,0.016),(0.104,0.036),(0.088,0.056),(0.066,0.072),
          (0.044,0.082),(0.030,0.086),(0.024,0.096),(0.018,0.100),(0.006,0.100)],
         ST, 32, 0.0, 0.0, 'y')
    torus_y(0, 0.012, 0.0, 0.098, 0.008, MS, 32, 8)
    for i in range(8):                                   # Nieten am Buckelrand
        a = i/8*TAU
        kugel(0.098*math.sin(a), 0.020, 0.098*math.cos(a), 0.0085, MS, 12)
    for i in range(16):                                  # Nieten am Rand
        a = (i + 0.5)/16*TAU
        kugel(0.335*math.sin(a), yf(0.335) + 0.010, 0.335*math.cos(a), 0.0085, MS, 12)
    # Rueckseite: zwei Querleisten (folgen der Woelbung), Griffbuegel, Armschlaufe
    for a in (0.0, math.pi/2):
        pts = [(-0.320 + 0.640*k/8, yf(abs(-0.320 + 0.640*k/8)) - 0.038, 0.0)
               for k in range(9)]
        o = rohr(pts, 0.0155, 0.008, HD, 10, (0,0,1))
        o.rotation_euler[1] = a
    rohr([(-0.118, -0.014, 0.0), (-0.060, -0.036, 0.0), (0.0, -0.046, 0.0),
          (0.060, -0.036, 0.0), (0.118, -0.014, 0.0)], 0.011, 0.016, HD, 12, (0,0,1))
    rohr([(-0.032, -0.048, 0.0), (0.0, -0.052, 0.0), (0.032, -0.048, 0.0)],
         0.013, 0.019, LE, 12, (0,0,1))
    rohr([(-0.190, -0.026, 0.075), (-0.120, -0.040, 0.090), (-0.048, -0.038, 0.084)],
         0.009, 0.020, LE, 10, (0,0,1))
    export("th31_schild_rund", (0.0, -0.050, 0.0))


# ================================================================ 10) Wappenschild
def schild_wappen():
    """Wappenschild (Dreiecksform) 0,52 x 0,74 m: gewoelbte Schale als EIN Loft,
    Randbeschlag entlang der Kontur, erhabenes Wappenfeld mit Kreuz und Buckel.
    Steht aufrecht, Schauseite +y. Griffpunkt: Buegel hinter dem oberen Drittel."""
    neu()
    ST = M_stahl(); SD = M_stahl_d(); MS = M_messing(); HD = M_holz_d(); LE = M_leder()
    BLAU = mat("Wappenblau", (0.16,0.26,0.56), 0.72)
    GOLD = mat("Wappengold", (0.80,0.64,0.24), 0.34, 0.55)
    H = 0.740; W = 0.262
    kontur = [(0.000,0.010),(0.030,0.085),(0.070,0.148),(0.120,0.196),(0.180,0.226),
              (0.250,0.246),(0.330,0.256),(0.430,0.260),(0.560,0.262),(0.680,0.262),
              (0.740,0.262)]
    def hwz(z): return ipol(kontur, z)
    def vorn(x, z):
        """Woelbung der Vorderseite an der Stelle (x, z) — Referenz fuer ALLE
        Aufbauten, damit nichts vor oder hinter der Schale schwebt."""
        return 0.058*(1.0 - (x/W)**2)*(0.55 + 0.45*min(1.0, z/0.35))
    def hint(x, z): return vorn(x, z) - 0.026
    def schale(skal=1.0, vor=0.0, dicke=0.024, m=None, zo=0.0):
        """Gewoelbte Schildplatte: pro Reihe ein geschlossener Ring aus Vorder- und
        Rueckseite -> EIN sauberes Mesh statt aufeinandergelegter Platten."""
        M = 13; rows = []
        zs = [kontur[0][0] + (H - kontur[0][0])*(i/26)**0.92 for i in range(27)]
        for z in zs:
            hw = hwz(z)*skal
            zz = zo + (z - H*0.5)*skal + H*0.5
            if hw < 0.004: hw = 0.004
            front = []; back = []
            for j in range(M):
                x = -hw + 2*hw*j/(M - 1)
                y = vor + 0.058*(1.0 - (x/W)**2)*(0.55 + 0.45*min(1.0, z/0.35))
                front.append((x, y, zz)); back.append((x, y - dicke, zz))
            rows.append(front + back[::-1])
        return loft(rows, m, (True, True), "Schale")
    schale(1.0, 0.0, 0.026, BLAU)
    # Randbeschlag: Rundprofil entlang der Kontur (links hoch, oben herum, rechts runter)
    pfad = []
    zs = [kontur[0][0] + (H - kontur[0][0])*(i/16)**0.9 for i in range(17)]
    for z in reversed(zs):
        hw = hwz(z)
        pfad.append((-hw, 0.058*(1 - 1.0)*0 + 0.058*(1.0 - (hw/W)**2)*(0.55 + 0.45*min(1.0, z/0.35)) - 0.012, z))
    for z in zs[1:]:
        hw = hwz(z)
        pfad.append((hw, 0.058*(1.0 - (hw/W)**2)*(0.55 + 0.45*min(1.0, z/0.35)) - 0.012, z))
    rohr(pfad, 0.013, 0.013, ST, 12, (0,1,0))
    for i in range(0, len(pfad), 3):                    # Nieten auf dem Beschlag
        p = pfad[i]
        kugel(p[0], p[1] + 0.012, p[2], 0.0085, MS, 12)
    # Wappenfeld: kleinere Schale in Gold, davor ein Kreuz + Buckel
    schale(0.70, 0.010, 0.012, GOLD, 0.028)
    # Kreuzbalken (rund, folgen der Woelbung)
    def yv(x, z): return 0.058*(1.0 - (x/W)**2)*(0.55 + 0.45*min(1.0, z/0.35)) + 0.016
    senk = [(0.0, yv(0.0, 0.16 + 0.42*t), 0.16 + 0.42*t) for t in [i/8 for i in range(9)]]
    rohr(senk, 0.020, 0.034, BLAU, 12, (0,1,0))
    quer = [(-0.130 + 0.260*t, yv(-0.130 + 0.260*t, 0.470), 0.470) for t in [i/8 for i in range(9)]]
    rohr(quer, 0.020, 0.034, BLAU, 12, (0,1,0))
    dreh([(yv(0,0.470) + 0.030, 0.0),(yv(0,0.470) + 0.026, 0.016),(yv(0,0.470) + 0.016, 0.030),
          (yv(0,0.470) + 0.004, 0.038),(yv(0,0.470) - 0.010, 0.040)],
         GOLD, 24, 0.0, 0.470, 'y')
    for (px, pz) in ((0.0, 0.150), (0.0, 0.660), (-0.150, 0.470), (0.150, 0.470)):
        kugel(px, yv(px, pz) + 0.006, pz, 0.014, GOLD, 14)
    # Rueckseite: Griffbuegel + Armschlaufe
    rohr([(-0.120, -0.030, 0.560), (-0.060, -0.050, 0.548), (0.0, -0.054, 0.544),
          (0.060, -0.050, 0.548), (0.120, -0.030, 0.560)], 0.011, 0.017, HD, 12, (0,0,1))
    rohr([(-0.030, -0.056, 0.545), (0.0, -0.060, 0.543), (0.030, -0.056, 0.545)],
         0.013, 0.020, LE, 12, (0,0,1))
    rohr([(-0.140, -0.026, 0.330), (-0.080, -0.052, 0.320), (-0.020, -0.056, 0.316)],
         0.009, 0.021, LE, 10, (0,0,1))
    export("th31_schild_wappen", (0.0, -0.060, 0.545))


# ================================================================ 11) Zauberstab
def zauberstab():
    """Zauberstab 0,42 m: gedrechselter Griff, verjuengter Schaft, Krallenfassung,
    leuchtender Kristall. Griffpunkt: Griffmitte."""
    neu()
    HD = M_holz_d(); MS = M_messing(); LE = M_leder()
    KRI = leucht("Kristall", (0.55,0.82,1.0), 3.2)
    FUN = leucht("Funke", (0.72,0.90,1.0), 4.0)
    ZA = 0.030
    # Griff (gedrechselt: mehrere weiche Wuelste)
    dreh([(-0.210,0.004),(-0.206,0.012),(-0.198,0.016),(-0.186,0.0155),(-0.176,0.0175),
          (-0.166,0.0160),(-0.140,0.0148),(-0.110,0.0152),(-0.086,0.0168),(-0.074,0.0175),
          (-0.064,0.0160),(-0.052,0.0140)], HD, 24, 0.0, ZA, 'y')
    for i in range(7):
        torus_y(0, -0.160 + 0.086*(i + 0.5)/7, ZA, 0.0158, 0.0042, LE, 16, 7)
    torus_y(0, -0.196, ZA, 0.0168, 0.0048, MS, 20, 8)
    torus_y(0, -0.068, ZA, 0.0180, 0.0050, MS, 20, 8)
    # Schaft
    dreh([(-0.056,0.0138),(-0.010,0.0118),(0.040,0.0100),(0.086,0.0086),(0.112,0.0082)],
         HD, 20, 0.0, ZA, 'y')
    # Fassung
    dreh([(0.104,0.0086),(0.116,0.0130),(0.126,0.0155),(0.138,0.0150),(0.146,0.0122)],
         MS, 22, 0.0, ZA, 'y')
    for i in range(4):                                  # Krallen
        a = i/4*TAU + math.pi/4
        pts = [(0.0, 0.140, 0.0), (0.014, 0.158, 0.0), (0.020, 0.178, 0.0),
               (0.016, 0.196, 0.0)]
        o = rohr([(p[0], p[1], p[2]) for p in pts], [0.0055,0.0048,0.0038,0.0026],
                 None, MS, 8, (0,0,1))
        o.rotation_euler[1] = a
        o.location = (0.0, 0.0, ZA)
    # Kristall (bewusst facettiert, 8 Segmente -> Edelstein statt Kugel)
    dreh([(0.136,0.0),(0.148,0.014),(0.162,0.0225),(0.176,0.0235),(0.192,0.0180),
          (0.204,0.0095),(0.210,0.0)], KRI, 8, 0.0, ZA, 'y')
    for (dx, dy, dz, r) in ((0.030,0.150,0.014,0.0045),(-0.026,0.196,0.020,0.0038),
                            (0.012,0.212,-0.030,0.0034),(-0.032,0.168,-0.022,0.0030)):
        kugel(dx, dy, ZA + dz, r, FUN, 12)
    export("th31_zauberstab", (0.0, -0.130, ZA))


# ================================================================ 12) Magierstab
def magierstab():
    """Magierstab 1,85 m: knorriger Schaft (Rotationskoerper mit welligem Radius),
    drei gewundene Ranken als Spitze, schwebender Leuchtstein.
    Griffpunkt: Wicklung im unteren Drittel."""
    neu()
    HO = M_holz(); HD = M_holz_d(); MS = M_messing(); LE = M_leder()
    STE = leucht("Leuchtstein", (1.0,0.78,0.34), 3.0)
    KER = leucht("Steinkern", (1.0,0.94,0.72), 4.2)
    ZA = 0.100
    # Schaft: welliger Radius -> knorriges Holz statt Besenstiel
    prof = [(-1.100, 0.006), (-1.092, 0.018)]
    N = 56
    for i in range(N + 1):
        t = i/N
        y = -1.086 + (0.520 + 1.086)*t
        r = 0.0225 - 0.0055*t + 0.0022*math.sin(t*23.0) + 0.0014*math.sin(t*47.0 + 1.1)
        prof.append((y, r))
    prof.append((0.532, 0.0160))
    dreh(prof, HO, 22, 0.0, ZA, 'y')
    dreh([(-1.108,0.004),(-1.100,0.016),(-1.088,0.026),(-1.060,0.0275),(-1.030,0.0255),
          (-1.016,0.022)], MS, 22, 0.0, ZA, 'y')          # Schuh
    for i in range(22):                                   # Wicklung
        torus_y(0, -0.480 + 0.300*(i + 0.5)/22, ZA, 0.0218, 0.0062, LE, 18, 7)
    for i in range(7):
        o = torus_y(0, -0.460 + i*0.042, ZA, 0.0230, 0.0040, HD, 16, 6)
        o.rotation_euler[0] = 0.30 if i % 2 == 0 else -0.30
    for yy in (-0.500, -0.170, 0.180):
        torus_y(0, yy, ZA, 0.0232, 0.0060, MS, 20, 8)
    # Drei gewundene Ranken: spiralen hoch, umschliessen den Stein, laufen spitz aus
    for k in range(3):
        pts = []; rad = []
        for i in range(19):
            t = i/18
            ang = k/3*TAU + t*4.1
            rr = 0.020 + 0.082*math.sin(math.pi*min(1.0, t*0.94))**0.8
            y = 0.430 + 0.330*t
            pts.append((rr*math.sin(ang), y, ZA + rr*math.cos(ang)))
            rad.append(0.0135*(1 - t) + 0.0032)
        rohr(pts, rad, None, HD, 10, (0,1,0))
    kugel(0, 0.650, ZA, 0.052, STE, 26)
    kugel(0, 0.650, ZA, 0.030, KER, 20)
    for (a, yy, rr) in ((0.4, 0.560, 0.075), (2.6, 0.720, 0.070), (4.4, 0.640, 0.085)):
        kugel(rr*math.sin(a), yy, ZA + rr*math.cos(a), 0.0075, KER, 12)
    export("th31_magierstab", (0.0, -0.330, ZA))


# ================================================================ 13) Blaster
def blaster():
    """Stilisierter Sci-Fi-Blaster 0,40 m: rundliche Huelle, Ringlauf mit Leuchtkern,
    Energiezelle, ergonomischer Griff. Erkennbar futuristisch, keine reale Vorlage,
    keine funktionsfaehige Mechanik. Griffpunkt: Griffmitte."""
    neu()
    HUL = mat("Huelle", (0.80,0.82,0.86), 0.34, 0.35)
    DKL = mat("HuelleDkl", (0.20,0.22,0.28), 0.45, 0.30)
    AKZ = mat("Akzent", (0.78,0.30,0.16), 0.40)
    MET = mat("BlasterMetall", (0.55,0.58,0.64), 0.28, 0.55)
    GRP = mat("Griffgummi", (0.14,0.15,0.18), 0.86)
    LED = leucht("Energie", (0.30,0.90,1.0), 3.4)
    LE2 = leucht("Energie2", (0.85,0.98,1.0), 4.4)
    # --- Huelle: EIN Loft, weiche Tropfenform
    body = [(-0.115, 0.020, 0.150, 0.030),
            (-0.090, 0.027, 0.152, 0.038),
            (-0.055, 0.032, 0.155, 0.043),
            (-0.010, 0.034, 0.157, 0.045),
            ( 0.035, 0.033, 0.159, 0.043),
            ( 0.080, 0.030, 0.161, 0.038),
            ( 0.115, 0.026, 0.162, 0.032),
            ( 0.140, 0.021, 0.163, 0.026)]
    loft([[(px, y, zc + pz) for (px, pz) in q_rund(hx, hz, 18, 0.74)]
          for (y, hx, zc, hz) in body], HUL, (True, True), "Huelle")
    # Oberschale (dunkel) als schmalerer Loft obenauf
    loft([[(px, y, zc + hz*0.55 + pz) for (px, pz) in q_rund(hx*0.72, hz*0.42, 16, 0.78)]
          for (y, hx, zc, hz) in body], DKL, (True, True), "Oberschale")
    # --- Lauf: Rotationskoerper mit Ringen + Leuchtkern
    dreh([(0.120,0.026),(0.140,0.030),(0.168,0.028),(0.196,0.031),(0.224,0.027),
          (0.252,0.030),(0.276,0.026),(0.292,0.021),(0.300,0.016)], MET, 24, 0.0, 0.163, 'y')
    for yy in (0.152, 0.184, 0.216, 0.248):
        torus_y(0, yy, 0.163, 0.031, 0.0075, DKL, 20, 8)
    dreh([(0.140,0.0135),(0.290,0.0135),(0.300,0.0120)], LED, 16, 0.0, 0.163, 'y')
    torus_y(0, 0.298, 0.163, 0.019, 0.0060, LE2, 20, 8)
    # --- Energiezelle oben
    dreh([(-0.075,0.0),(-0.068,0.012),(-0.055,0.015),(0.030,0.015),(0.044,0.012),
          (0.050,0.0)], LED, 18, 0.0, 0.204, 'y')
    for yy in (-0.050, -0.014, 0.022):
        torus_y(0, yy, 0.204, 0.0165, 0.0045, MET, 16, 8)
    rohr([(0, 0.040, 0.200), (0, 0.070, 0.188), (0, 0.086, 0.176)], 0.010, 0.010, DKL, 12)
    # --- Visier
    rohr([(0, 0.060, 0.192), (0, 0.105, 0.190), (0, 0.132, 0.184)], 0.007, 0.009, MET, 10)
    kugel(0, 0.128, 0.190, 0.0055, LE2, 12)
    # --- Griff: Loft nach unten-hinten, Unterkante auf z=0
    grip = [(0.138, -0.028, 0.023, 0.033),
            (0.110, -0.041, 0.024, 0.032),
            (0.075, -0.056, 0.024, 0.031),
            (0.040, -0.070, 0.023, 0.030),
            (0.012, -0.082, 0.021, 0.028),
            (0.000, -0.087, 0.017, 0.024)]
    loft([[(px, yc + py, z) for (px, py) in q_rund(hx, hy, 16, 0.72)]
          for (z, yc, hx, hy) in grip], GRP, (True, True), "Griff")
    for i in range(4):                                   # Fingermulden
        t = 0.16 + 0.20*i
        z = 0.138 - 0.138*t*1.9
        yc = -0.028 - 0.060*t*1.9
        o = torus_y(0, yc - 0.026, max(0.012, z), 0.016, 0.0055, DKL, 14, 6)
        o.rotation_euler[0] = math.pi/2*0.0
        o.rotation_euler = (1.24, 0.0, 0.0)
    dreh([(-0.090,0.008),(-0.086,0.018),(-0.070,0.021),(-0.040,0.020)],
         AKZ, 16, 0.0, 0.010, 'y')                        # Griffabschluss unten
    # --- Abzugsbuegel (rund) + Abzug
    rohr([(0, 0.030, 0.118), (0, 0.046, 0.086), (0, 0.030, 0.058), (0, -0.010, 0.048),
          (0, -0.044, 0.062)], 0.008, 0.010, MET, 10)
    rohr([(0, 0.010, 0.108), (0, 0.004, 0.090), (0, 0.010, 0.078)], 0.009, 0.005, DKL, 10)
    # --- seitliche Leuchtstreifen
    for sx in (-1, 1):
        rohr([(sx*0.031, -0.080, 0.150), (sx*0.036, -0.020, 0.155), (sx*0.034, 0.050, 0.158)],
             0.004, 0.011, LED, 8)
    export("th31_blaster", (0.0, -0.060, 0.070))


# ================================================================ 14) Energieschwert
def energieschwert():
    """Sci-Fi-Klinge aus Licht, 1,10 m: massives Griffstueck mit Ringen und
    Leuchtfenstern, weiss-heisser Kern, halbtransparenter Glutmantel.
    Griffpunkt: Griffmitte."""
    neu()
    MET = mat("Griffmetall", (0.68,0.71,0.76), 0.26, 0.55)
    DKL = mat("GriffDkl", (0.16,0.17,0.21), 0.45, 0.30)
    GRP = mat("Griffband", (0.20,0.14,0.12), 0.88)
    KRN = leucht("Klingenkern", (1.0,0.98,0.94), 5.0)
    MAN = leucht("Glutmantel", (0.35,0.72,1.0), 2.6, 0.42)
    LED = leucht("Statuslicht", (0.35,0.85,1.0), 3.6)
    ZA = 0.032
    # Griffstueck
    dreh([(-0.250,0.006),(-0.246,0.016),(-0.238,0.022),(-0.228,0.0235),(-0.208,0.0225),
          (-0.196,0.0215),(-0.150,0.0205),(-0.110,0.0210),(-0.070,0.0215),(-0.046,0.0230),
          (-0.030,0.0250),(-0.018,0.0265),(-0.006,0.0270)], MET, 26, 0.0, ZA, 'y')
    for i in range(11):                                   # Griffband
        torus_y(0, -0.196 + 0.150*(i + 0.5)/11, ZA, 0.0212, 0.0055, GRP, 20, 7)
    for yy, rr in ((-0.234, 0.0245), (-0.202, 0.0225), (-0.040, 0.0245), (-0.014, 0.0285)):
        torus_y(0, yy, ZA, rr, 0.0060, DKL, 22, 8)
    # Emitter-Schild
    dreh([(-0.012,0.0270),(0.000,0.0300),(0.012,0.0290),(0.020,0.0230),(0.024,0.0180)],
         MET, 26, 0.0, ZA, 'y')
    torus_y(0, 0.002, ZA, 0.0300, 0.0055, LED, 24, 8)
    for i in range(3):                                    # Statuslichter am Griff
        a = i/3*TAU
        kugel(0.0215*math.sin(a), -0.062, ZA + 0.0215*math.cos(a), 0.0055, LED, 12)
    # Klingenkern
    dreh([(0.010,0.0090),(0.022,0.0148),(0.060,0.0155),(0.560,0.0150),(0.720,0.0135),
          (0.800,0.0100),(0.840,0.0048),(0.850,0.0)], KRN, 22, 0.0, ZA, 'y')
    # Glutmantel (halbtransparent, umschliesst den Kern)
    dreh([(0.006,0.0165),(0.020,0.0275),(0.060,0.0292),(0.560,0.0285),(0.730,0.0250),
          (0.812,0.0180),(0.848,0.0088),(0.860,0.0)], MAN, 26, 0.0, ZA, 'y')
    export("th31_energieschwert", (0.0, -0.140, ZA))


# ================================================================
BAU = [schwert_ritter, schwert_kurz, axt_kampf, streitkolben, speer, bogen,
       koecher, armbrust, schild_rund, schild_wappen, zauberstab, magierstab,
       blaster, energieschwert]

if __name__ == "__main__":
    import sys
    wahl = sys.argv[1:] if len(sys.argv) > 1 else None
    print("Asset-Charge 31 (th31, Waffen-Props):")
    for fn in BAU:
        if wahl and fn.__name__ not in wahl: continue
        fn()
    print("Griffpunkte:")
    for k, v in GRIFF.items():
        print("   %-26s %s" % (k, v))
    print("fertig")
