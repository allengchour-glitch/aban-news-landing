# -*- coding: utf-8 -*-
"""Asset-Charge 9 (th13_*): JAHRMARKT / VERGNUEGUNGSPARK.
Bunte, leuchtende Fahrgeschaefte und Buden — familienfreundlich, keine Waffen.

Konventionen wie th5-th11 (siehe models/TH5-ASSETS.md):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * Schauseite (Eingang/Theke/Schriftzug) liegt auf Blender +y  ->  three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT, sonst fehlt der Bevel im GLB.
  * `primitive_cube_add(size=1)` -> Kantenlaenge 1, Skalierung = Mass (NICHT /2).
  * `rot=(pi/2,0,0)` legt die Zylinderachse auf -y (Riesenrad-Nabe!), fuer Raeder
    braucht es `rot=(0,pi/2,0)`.
  * Voller Zylinder != Tonnendach, skalierte Kugel != Kuppel -> bmesh.ops.bisect_plane.
  * Wo Leute stehen/laufen: Bodenplatte, Moebel auf die Fussboden-Oberkante `FB`.
  * Lichter sind emissive Materialien (Jahrmarkt lebt vom Licht).
"""
import bpy, bmesh, os, math
from mathutils import Vector

OUT_GLB = "/home/user/aban-news-landing/models"
OUT_STL = "/home/user/aban-news-landing/models/stl"
os.makedirs(OUT_STL, exist_ok=True)

TAU = math.tau

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
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (emit[0], emit[1], emit[2], 1)
        b.inputs["Emission Strength"].default_value = estr
    return m

def leucht(name, rgb, estr=3.0):
    """Lampenmaterial: Basisfarbe = Leuchtfarbe, damit es auch unbeleuchtet knallt."""
    return mat(name, rgb, 0.25, 0.0, rgb, estr)

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

def kugel(x, y, z, r, m=None, seg=10):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=seg, ring_count=max(5, seg//2))
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kegel(x, y, z, r1, r2, h, m=None, seg=12, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def halbkugel(x, y, z, r, m=None, seg=16, flach=1.0):
    """Echte Kuppel: untere Haelfte per bisect_plane WEGGESCHNITTEN, Basis exakt bei z."""
    o = kugel(x, y, z, r, m, seg)
    o.scale[2] = flach
    nur(o)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=(0,0,0), plane_no=(0,0,1), clear_inner=True)
    bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    bm.to_mesh(o.data); bm.free(); o.data.update()
    return o

def giebel(cx, cy, cz, halbb, hoehe, tiefe, m=None, achse='x'):
    """Dreiecksgiebel als echtes Prisma. achse='x': Dreieck in der x-z-Ebene,
    Tiefe in y. achse='y': Dreieck in der y-z-Ebene, Tiefe in x (Zeltgiebel)."""
    t = tiefe / 2.0
    if achse == 'x':
        v = [(-halbb,-t,0), (halbb,-t,0), (0,-t,hoehe), (-halbb,t,0), (halbb,t,0), (0,t,hoehe)]
    else:
        v = [(-t,-halbb,0), (-t,halbb,0), (-t,0,hoehe), (t,-halbb,0), (t,halbb,0), (t,0,hoehe)]
    f = [(0,1,2), (5,4,3), (0,3,4,1), (1,4,5,2), (2,5,3,0)]
    me = bpy.data.meshes.new("Giebel"); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new("Giebel", me); bpy.context.collection.objects.link(o)
    o.location = (cx, cy, cz)
    if m: o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o
    return o

def strebe(p0, p1, d, m=None):
    """Stab zwischen zwei Punkten (A-Boecke, Fachwerk, Sparren)."""
    p0 = Vector(p0); p1 = Vector(p1); v = p1 - p0; L = v.length
    if L < 1e-4: return None
    c = (p0 + p1) / 2.0
    o = box(c.x, c.y, c.z, d, d, L, m)
    o.rotation_euler = v.to_track_quat('Z', 'Y').to_euler()
    return o

def ring(cx, cy, z, r, n, breite, hoehe, m, start=0.0):
    """Geschlossener Ring aus n tangential gedrehten Boxen (Lichterrand, Ringtraeger)."""
    ch = 2.0 * r * math.sin(math.pi/n) * 1.06
    for i in range(n):
        a = start + i/n*TAU
        o = box(cx + r*math.cos(a), cy + r*math.sin(a), z, ch, breite, hoehe, m)
        # rot_z = a + pi/2 legt die lokale x-Achse auf die Tangente
        o.rotation_euler[2] = a + math.pi/2

def lampenring(cx, cy, z, r, n, rad, mats, start=0.0):
    for i in range(n):
        a = start + i/n*TAU
        kugel(cx + r*math.cos(a), cy + r*math.sin(a), z, rad, mats[i % len(mats)], 8)

def girlande(p0, p1, n, sag, mats, rad=0.11, kabel=None):
    """Lichterkette als Parabel zwischen zwei Punkten (haengt in der Mitte durch)."""
    p0 = Vector(p0); p1 = Vector(p1)
    pts = []
    for i in range(n):
        t = i/(n-1.0)
        p = p0.lerp(p1, t); p.z -= sag * 4.0 * t * (1.0 - t)
        pts.append(p)
        kugel(p.x, p.y, p.z, rad, mats[i % len(mats)], 8)
    if kabel:
        for i in range(len(pts)-1):
            strebe(pts[i], pts[i+1], 0.035, kabel)
    return pts

# ---------------------------------------------------------------- Lampen-Schrift
# 3x5-Punktraster — Jahrmarkt-Schriftzuege aus einzelnen Gluehbirnen.
FONT = {
 ' ': ("000","000","000","000","000"),
 'A': ("111","101","111","101","101"), 'B': ("110","101","110","101","110"),
 'C': ("111","100","100","100","111"), 'D': ("110","101","101","101","110"),
 'E': ("111","100","111","100","111"), 'F': ("111","100","111","100","100"),
 'G': ("111","100","101","101","111"), 'H': ("101","101","111","101","101"),
 'I': ("111","010","010","010","111"), 'J': ("001","001","001","101","111"),
 'K': ("101","101","110","101","101"), 'L': ("100","100","100","100","111"),
 'M': ("101","111","111","101","101"), 'N': ("110","111","111","111","101"),
 'O': ("111","101","101","101","111"), 'P': ("111","101","111","100","100"),
 'Q': ("111","101","101","111","001"), 'R': ("111","101","111","110","101"),
 'S': ("111","100","111","001","111"), 'T': ("111","010","010","010","010"),
 'U': ("101","101","101","101","111"), 'V': ("101","101","101","101","010"),
 'W': ("101","101","111","111","101"), 'X': ("101","101","010","101","101"),
 'Y': ("101","101","010","010","010"), 'Z': ("111","001","010","100","111"),
 '!': ("010","010","010","000","010"),
}

def wortbreite(wort, cell, gap=1.0):
    return len(wort)*(3*cell + gap*cell) - gap*cell

def dotword(wort, cx, cy, cz, cell, m, dick=None, gap=1.0, richtung=-1):
    """Schriftzug aus Lampen-Wuerfeln, Schauflaeche in der x-z-Ebene bei y=cy.
    SPIEGEL-FALLE: Wer von vorn (Blender +y = three.js -z) auf das Schild schaut,
    sieht Welt-+x LINKS. Buchstaben UND Spalten laufen deshalb standardmaessig
    in -x (richtung=-1), sonst steht der Schriftzug spiegelverkehrt.
    Fuer die Rueckseite eines doppelseitigen Schildes richtung=+1.
    Ausserdem: die Lampen muessen VOR der Schildflaeche liegen (groesseres |y|)."""
    dick = dick if dick else cell*0.7
    lw = 3*cell + gap*cell
    W = wortbreite(wort, cell, gap)
    x0 = cx - richtung*(W/2.0 - cell/2.0)
    for li, ch in enumerate(wort):
        rows = FONT.get(ch.upper(), FONT[' '])
        for r, row in enumerate(rows):
            for c, v in enumerate(row):
                if v == '1':
                    box(x0 + richtung*(li*lw + c*cell), cy, cz + (2-r)*cell,
                        cell*0.82, dick, cell*0.82, m)
    return W

# ---------------------------------------------------------------- Bevel + Export
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

def export(name, bevel=0.02, seg=2):
    runden(bevel, seg)
    for o in bpy.context.scene.objects: o.select_set(True)
    p1 = os.path.join(OUT_GLB, name + ".glb")
    # export_apply=True ist PFLICHT — sonst landet der Bevel NICHT im GLB.
    bpy.ops.export_scene.gltf(filepath=p1, export_format='GLB', use_selection=False, export_apply=True)
    p2 = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p2)
    except Exception: bpy.ops.export_mesh.stl(filepath=p2)
    print("  ->", name, os.path.getsize(p1), "B")

# ---------------------------------------------------------------- Boden
FB = 0.12   # Oberkante der Jahrmarkt-Bodenplatte. JEDES Moebel/Geraet bekommt sein z
            # als FB + Hoehe ueber Boden — sonst steckt es im Belag.

def platte(B, T, m, z=None):
    return box(0, 0, (z if z else FB)/2.0, B, T, (z if z else FB), m)

# ================================================================ 1) Riesenrad
def riesenrad():
    """Speichenrad mit 12 Gondeln, zwei A-Boecken, Einstiegsplattform, Lichterkette."""
    neu()
    ROT   = mat("RrRot",   (0.86,0.20,0.18), 0.45, 0.25)
    GELB  = mat("RrGelb",  (0.97,0.80,0.16), 0.45, 0.25)
    BLAU  = mat("RrBlau",  (0.18,0.42,0.78), 0.45, 0.25)
    NABE  = mat("RrNabe",  (0.68,0.70,0.74), 0.40, 0.25)   # hoher Metallwert rendert
                                                            # in three.js ohne Env-Map schwarz
    BOD   = mat("RrBoden", (0.40,0.40,0.43), 0.95)
    PLAT  = mat("RrPodest",(0.62,0.46,0.28), 0.8)
    L_W = leucht("RrLampeW", (1.00,0.94,0.72), 3.2)
    L_R = leucht("RrLampeR", (1.00,0.26,0.26), 3.0)
    L_G = leucht("RrLampeG", (0.32,1.00,0.44), 3.0)
    L_B = leucht("RrLampeB", (0.36,0.62,1.00), 3.0)
    LAM = [L_W, L_R, L_W, L_G, L_W, L_B]
    GON = [mat("RrGondel%d"%i, c, 0.55) for i, c in enumerate(
            [(0.88,0.22,0.20),(0.96,0.74,0.16),(0.20,0.52,0.84),(0.24,0.68,0.36),
             (0.86,0.42,0.74),(0.98,0.52,0.16)])]

    HUB, R, WY, N = 14.2, 11.6, 1.15, 36
    box(0, 0.7, FB/2, 20.0, 12.6, FB, BOD)      # Bodenplatte inkl. Einstiegsseite

    # --- Rad: zwei Felgenebenen, Speichen, Querverbaende
    ch = 2*R*math.sin(math.pi/N)*1.06
    for sy in (-WY, WY):
        for i in range(N):
            a = i/N*TAU
            o = box(R*math.cos(a), sy, HUB + R*math.sin(a), ch, 0.26, 0.22, ROT)
            o.rotation_euler[1] = -(a + math.pi/2)      # lokale x -> Tangente
        for k in range(12):
            a = k/12*TAU
            o = box(R/2*math.cos(a), sy, HUB + R/2*math.sin(a), R, 0.16, 0.16, GELB)
            o.rotation_euler[1] = -a                    # lokale x -> radial
    for k in range(12):
        a = k/12*TAU
        box(R*math.cos(a), 0, HUB + R*math.sin(a), 0.16, 2*WY, 0.16, ROT)
        box(0.66*R*math.cos(a), 0, HUB + 0.66*R*math.sin(a), 0.14, 2*WY, 0.14, GELB)
    zyl(0, 0, HUB, 0.78, 2*WY + 0.9, NABE, 20, rot=(math.pi/2,0,0))   # Achse liegt auf y
    zyl(0, 0, HUB, 0.34, 7.4, NABE, 12, rot=(math.pi/2,0,0))
    kugel(0, WY + 1.35, HUB, 0.85, L_W, 14)
    kugel(0, -WY - 1.35, HUB, 0.85, L_W, 14)

    # --- A-Boecke (Beine spreizen in x, deshalb kreuzt nichts das Rad)
    # Fusspunkt bei z=0.16: die SCHRAEGE Endflaeche eines Stabes taucht sonst unter z=0
    # (halbe Kantenlaenge * sin(Neigung) = 0.11) und die Unterkante waere negativ.
    for sy in (-3.1, 3.1):
        strebe((0, sy, HUB), ( 8.2, sy, 0.16), 0.44, BLAU)
        strebe((0, sy, HUB), (-8.2, sy, 0.16), 0.44, BLAU)
        for zz in (4.0, 8.0, 11.4):
            xx = 8.2*(1.0 - zz/HUB)
            box(0, sy, zz, 2*xx, 0.24, 0.24, GELB)
    for zz, br in ((0.42, 0.46), (7.0, 0.26)):
        xx = 8.2*(1.0 - zz/HUB)
        for sx in (-xx, xx):
            box(sx, 0, zz, br, 6.3, br, BLAU)
    for sx in (-1, 1):                                   # Diagonalverband zwischen den Boecken
        strebe((sx*7.9, -3.1, 0.5), (sx*5.6, 3.1, 6.2), 0.18, GELB)
        strebe((sx*7.9,  3.1, 0.5), (sx*5.6,-3.1, 6.2), 0.18, GELB)
    for sy in (-3.1, 3.1):                               # Fusspunkte
        for sx in (-8.2, 8.2):
            box(sx, sy, 0.20, 1.6, 1.6, 0.40, BOD)

    # --- Einstiegsplattform (+y, ausserhalb der Gondelbahn)
    box(0, 3.7, FB + 0.28, 9.2, 3.6, 0.56, PLAT)
    for sx in (-4.6, 4.6):          # OFFENES Gelaender: eine geschlossene Blechwand
        for gy in (2.1, 3.7, 5.3):  # verdeckt von aussen die ganze Einstiegsseite
            box(sx, gy, FB + 0.60, 0.09, 0.09, 1.04, GELB)
        box(sx, 3.7, FB + 1.12, 0.10, 3.6, 0.10, GELB)
        box(sx, 3.7, FB + 0.72, 0.08, 3.6, 0.08, GELB)
    for gx in (-4.6, -2.3, 0.0, 2.3, 4.6):
        box(gx, 5.5, FB + 0.60, 0.09, 0.09, 1.04, GELB)
    box(0, 5.5, FB + 1.12, 9.2, 0.10, 0.10, GELB)
    box(0, 5.5, FB + 0.72, 9.2, 0.08, 0.08, GELB)
    box(0, 5.9, 0.16, 3.2, 0.9, 0.32, PLAT)              # Stufe
    girlande((-4.6, 3.7, FB+1.70), (4.6, 3.7, FB+1.70), 11, 0.22, LAM, 0.12, GELB)

    # --- Gondeln (haengen senkrecht, Boden ueber der Plattform)
    for k in range(12):
        a = (2*k + 1)*math.pi/12.0
        gx, gz = R*math.cos(a), HUB + R*math.sin(a)
        c = GON[k % len(GON)]
        zyl(gx, 0, gz, 0.30, 0.7, NABE, 10, rot=(math.pi/2,0,0))
        for bx in (-0.62, 0.62):
            box(gx + bx, 0, gz - 0.62, 0.10, 0.10, 1.24, NABE)
        zg = gz - 1.24                                   # Dachunterkante
        box(gx, 0, zg + 0.06, 1.94, 1.86, 0.12, c)       # Dach
        zf = zg - 1.30                                   # Bodenoberkante
        box(gx, 0, zf - 0.05, 1.72, 1.62, 0.10, c)       # Boden
        for bx in (-0.81, 0.81):                         # 4 Eckpfosten (offene Gondel)
            for by in (-0.76, 0.76):
                box(gx + bx, by, zf + 0.68, 0.10, 0.10, 1.36, NABE)
        for by in (-0.76, 0.76):                         # Bruestung rundum
            box(gx, by, zf + 0.30, 1.72, 0.10, 0.60, c)
        for bx in (-0.81, 0.81):
            box(gx + bx, 0, zf + 0.30, 0.10, 1.62, 0.60, c)
        box(gx, 0.10, zf + 0.42, 1.55, 0.52, 0.09, PLAT) # Bank
        box(gx, -0.18, zf + 0.72, 1.55, 0.09, 0.52, PLAT)
        kugel(gx, 0, zg + 0.26, 0.15, LAM[k % len(LAM)], 8)

    # --- Lichterkette: Felge aussen + Speichen + Boecke
    for i in range(N):
        a = (i + 0.5)/N*TAU
        for sy in (-WY - 0.22, WY + 0.22):
            kugel((R + 0.10)*math.cos(a), sy, HUB + (R + 0.10)*math.sin(a),
                  0.16, LAM[i % len(LAM)], 8)
    for k in range(12):
        a = k/12*TAU
        for t in (0.32, 0.55, 0.80):
            kugel(R*t*math.cos(a), 0, HUB + R*t*math.sin(a), 0.14, LAM[k % len(LAM)], 8)
    for sy in (-3.1, 3.1):
        for i in range(7):
            t = 0.10 + i*0.13
            for s in (-1, 1):
                kugel(s*8.2*t, sy, HUB*(1.0 - t), 0.13, LAM[i % len(LAM)], 8)
    export("th13_riesenrad", 0.022, 2)

# ================================================================ 2) Karussell
def karussell():
    """Kinderkarussell: Podest, Mittelsaeule, 8 Pferde an Messingstangen, Dach + Lichterrand."""
    neu()
    POD  = mat("KaPodest", (0.72,0.20,0.22), 0.6)
    DECK = mat("KaDeck",   (0.78,0.62,0.38), 0.75)
    GOLD = mat("KaGold",   (0.90,0.72,0.28), 0.35, 0.35)
    DACH = mat("KaDach",   (0.94,0.93,0.90), 0.6)
    DACH2= mat("KaDach2",  (0.86,0.18,0.24), 0.6)
    BLAU = mat("KaBlau",   (0.20,0.44,0.78), 0.6)
    BOD  = mat("KaBoden",  (0.40,0.40,0.43), 0.95)
    SATT = mat("KaSattel", (0.44,0.24,0.14), 0.7)
    PF   = [mat("KaPferd%d"%i, c, 0.55) for i, c in enumerate(
            [(0.96,0.95,0.92),(0.52,0.32,0.18),(0.94,0.62,0.74),(0.36,0.56,0.86)])]
    MAEH = [mat("KaMaehne%d"%i, c, 0.6) for i, c in enumerate(
            [(0.92,0.72,0.28),(0.24,0.18,0.14),(0.86,0.30,0.52),(0.94,0.92,0.30)])]
    L_W = leucht("KaLampeW", (1.00,0.95,0.74), 3.2)
    L_R = leucht("KaLampeR", (1.00,0.30,0.34), 3.0)
    L_G = leucht("KaLampeG", (0.36,1.00,0.50), 3.0)
    L_B = leucht("KaLampeB", (0.40,0.66,1.00), 3.0)
    LAM = [L_W, L_R, L_W, L_B, L_W, L_G]

    RP, HD = 4.60, 3.55                     # Podestradius, Dachunterkante
    platte(11.6, 11.8, BOD)
    zyl(0, 0, FB + 0.31, RP, 0.62, POD, 32)         # Podestzarge
    HP = FB + 0.70                                   # begehbare Deck-Oberkante = 0.82
    zyl(0, 0, HP - 0.04, RP + 0.15, 0.08, DECK, 32)  # Deck
    box(0, 5.10, 0.13, 2.8, 0.72, 0.26, DECK)        # 2 Stufen zum Einstieg (+y)
    box(0, 4.62, 0.27, 2.8, 0.62, 0.54, DECK)

    zyl(0, 0, (HP + HD)/2, 0.50, HD - HP, GOLD, 16)  # Mittelsaeule
    for zz in (HP + 0.35, (HP+HD)/2, HD - 0.25):
        zyl(0, 0, zz, 0.62, 0.14, DACH2, 16)
    kegel(0, 0, HD + 0.68, 5.20, 0.55, 1.36, DACH, 24)          # Dach
    for k in range(12):                                          # Dachstreifen
        a = (k + 0.5)/12*TAU
        r = 2.90
        o = box(r*math.cos(a), r*math.sin(a), HD + 1.36*(5.20 - r)/4.65 + 0.06,
                4.85, 0.62, 0.07, DACH2 if k % 2 == 0 else BLAU)
        o.rotation_euler = (0.0, math.atan2(1.36, 4.65), a)
    halbkugel(0, 0, HD + 1.36, 0.62, DACH2, 16, 1.0)
    zyl(0, 0, HD + 2.10, 0.09, 0.60, GOLD, 10)
    kugel(0, 0, HD + 2.48, 0.26, L_W, 12)

    ring(0, 0, HD + 0.02, 5.05, 28, 0.30, 0.26, DACH2)           # Traufkranz
    lampenring(0, 0, HD - 0.16, 5.05, 28, 0.15, LAM)             # Lichterrand Dach
    for k in range(28):                                          # Zackenborte
        a = k/28*TAU
        o = box(5.02*math.cos(a), 5.02*math.sin(a), HD - 0.40, 1.06, 0.10, 0.42,
                DACH if k % 2 == 0 else BLAU)
        o.rotation_euler[2] = a + math.pi/2
    lampenring(0, 0, HP + 0.12, RP + 0.12, 20, 0.13, LAM)        # Lichterrand Podest
    for k in range(20):                                          # Spiegelfelder Zarge
        a = k/20*TAU
        o = box(RP*math.cos(a), RP*math.sin(a), FB + 0.34, 0.62, 0.10, 0.40,
                GOLD if k % 2 == 0 else DACH)
        o.rotation_euler[2] = a + math.pi/2

    # --- 8 Pferde. Lokales Bezugssystem: u = Fahrtrichtung, v = radial, w = Hoehe ueber Deck
    def lbox(cx, cy, a, u, v, w, su, sv, sw, m, tilt=0.0):
        x = cx + v*math.cos(a) - u*math.sin(a)
        y = cy + v*math.sin(a) + u*math.cos(a)
        o = box(x, y, HP + w, sv, su, sw, m)     # rot_z=a: lokale x -> radial, y -> vorwaerts
        o.rotation_euler = (tilt, 0.0, a)
        return o

    RH = 3.15
    for k in range(8):
        a = k/8*TAU
        px, py = RH*math.cos(a), RH*math.sin(a)
        c, mh = PF[k % 4], MAEH[k % 4]
        for u in (-0.44, 0.44):                                   # Beine
            for v in (-0.17, 0.17):
                lbox(px, py, a, u, v, 0.35, 0.15, 0.15, 0.70, c)
                lbox(px, py, a, u, v, 0.06, 0.20, 0.19, 0.12, SATT)
        lbox(px, py, a, 0.0, 0.0, 0.98, 1.28, 0.44, 0.58, c)      # Rumpf
        lbox(px, py, a, 0.60, 0.0, 1.02, 0.36, 0.46, 0.54, c)     # Brust
        lbox(px, py, a, 0.80, 0.0, 1.34, 0.32, 0.34, 0.66, c, tilt=-0.42)   # Hals
        lbox(px, py, a, 1.12, 0.0, 1.64, 0.56, 0.28, 0.28, c, tilt=-0.30)   # Kopf
        lbox(px, py, a, 1.36, 0.0, 1.60, 0.16, 0.22, 0.18, SATT)  # Maul
        for v in (-0.10, 0.10):
            lbox(px, py, a, 1.00, v, 1.84, 0.10, 0.09, 0.20, c)   # Ohren
        lbox(px, py, a, 0.84, 0.0, 1.40, 0.09, 0.30, 0.52, mh, tilt=-0.42)  # Maehne
        lbox(px, py, a, -0.68, 0.0, 1.12, 0.16, 0.24, 0.46, mh, tilt=0.35)  # Schweif
        lbox(px, py, a, -0.05, 0.0, 1.32, 0.58, 0.52, 0.14, SATT) # Sattel
        lbox(px, py, a, -0.05, 0.0, 1.02, 0.30, 0.50, 0.44, SATT) # Sattelgurt
        for v in (-0.28, 0.28):                                   # Steigbuegel
            lbox(px, py, a, -0.05, v, 0.86, 0.12, 0.06, 0.30, GOLD)
        zyl(px, py, (HP + HD)/2 + 0.08, 0.055, HD - HP - 0.16, GOLD, 10)    # Stange
        kugel(px, py, HD - 0.14, 0.10, LAM[k % len(LAM)], 8)

    for k in range(8):                                            # Zugstreben Dach
        a = (k + 0.5)/8*TAU
        strebe((0.55*math.cos(a), 0.55*math.sin(a), HD - 0.30),
               (4.55*math.cos(a), 4.55*math.sin(a), HD + 0.02), 0.09, GOLD)
    export("th13_karussell", 0.020, 2)

# ================================================================ 3) Autoscooter
def autoscooter():
    """Halle mit Fahrbahnplatte, Bande, 6 Scootern, Dachgitter, Neonschriftzug."""
    neu()
    BOD  = mat("AsBoden",  (0.38,0.38,0.41), 0.95)
    BAHN = mat("AsBahn",   (0.24,0.25,0.29), 0.35, 0.25)     # blanke Stahlbahn
    BANDE= mat("AsBande",  (0.90,0.18,0.20), 0.55)
    BAND2= mat("AsBande2", (0.96,0.94,0.90), 0.55)
    STUE = mat("AsStuetze",(0.20,0.42,0.76), 0.5, 0.3)
    DACH = mat("AsDach",   (0.30,0.32,0.38), 0.7)
    GIT  = mat("AsGitter", (0.60,0.63,0.68), 0.4, 0.25)
    GUMMI= mat("AsGummi",  (0.12,0.12,0.14), 0.85)
    SITZ = mat("AsSitz",   (0.16,0.16,0.18), 0.75)
    SCHILD=mat("AsSchild", (0.10,0.08,0.16), 0.5)
    L_W = leucht("AsLampeW", (1.00,0.95,0.76), 3.2)
    L_R = leucht("AsLampeR", (1.00,0.24,0.30), 3.0)
    L_G = leucht("AsLampeG", (0.30,1.00,0.52), 3.0)
    L_B = leucht("AsLampeB", (0.36,0.64,1.00), 3.0)
    L_P = leucht("AsLampeP", (1.00,0.40,0.86), 3.0)
    LAM = [L_W, L_R, L_W, L_B, L_W, L_G]
    CAR = [mat("AsCar%d"%i, c, 0.4, 0.25) for i, c in enumerate(
            [(0.92,0.16,0.18),(0.96,0.76,0.14),(0.16,0.50,0.86),(0.22,0.70,0.36),
             (0.96,0.44,0.12),(0.86,0.30,0.76)])]

    B, T, H = 18.0, 12.0, 5.0
    RB, RT = 15.0, 9.0                       # Fahrbahn
    platte(B, T, BOD)
    box(0, 0, FB + 0.16, RB, RT, 0.32, BAHN)                 # Fahrbahnplatte
    BZ = FB + 0.32                                            # Fahrbahn-Oberkante = 0.44

    for sy in (-1, 1):                                        # Bande laengs
        for i in range(10):
            box(-RB/2 + 0.75 + i*1.5, sy*(RT/2 + 0.18), FB + 0.42, 1.5, 0.36, 0.84,
                BANDE if i % 2 == 0 else BAND2)
        box(0, sy*(RT/2 + 0.18), FB + 0.88, RB + 0.4, 0.44, 0.14, GIT)
    for sx in (-1, 1):                                        # Bande quer
        for i in range(6):
            box(sx*(RB/2 + 0.18), -RT/2 + 0.75 + i*1.5, FB + 0.42, 0.36, 1.5, 0.84,
                BAND2 if i % 2 == 0 else BANDE)
        box(sx*(RB/2 + 0.18), 0, FB + 0.88, 0.44, RT + 0.4, 0.14, GIT)

    for sx in (-8.6, -4.3, 0.0, 4.3, 8.6):                    # Stuetzen
        for sy in (-5.6, 5.6):
            box(sx, sy, (FB + H)/2, 0.36, 0.36, H - FB, STUE)
    for sy in (-5.6, 5.6):
        box(0, sy, H - 0.18, B, 0.44, 0.36, DACH)
    for sx in (-8.6, 8.6):
        box(sx, 0, H - 0.18, 0.44, T, 0.36, DACH)
    box(0, 0, H + 0.14, B + 0.8, T + 0.8, 0.28, DACH)         # Dachdeck
    for sy in (-1, 1):                                        # Traufblende + Lampen
        box(0, sy*(T/2 + 0.42), H + 0.52, B + 0.8, 0.26, 0.60, BANDE)
        for i in range(19):
            kugel(-B/2 + 0.5 + i, sy*(T/2 + 0.60), H + 0.52, 0.15, LAM[i % len(LAM)], 8)
    for sx in (-1, 1):
        box(sx*(B/2 + 0.42), 0, H + 0.52, 0.26, T + 0.8, 0.60, BANDE)
        for i in range(13):
            kugel(sx*(B/2 + 0.60), -T/2 + 0.5 + i, H + 0.52, 0.15, LAM[i % len(LAM)], 8)

    GZ = H - 0.60                                             # Dachgitter (Stromdecke)
    for i in range(16):
        box(-RB/2 + 0.5 + i, 0, GZ, 0.08, RT, 0.06, GIT)
    for i in range(10):
        box(0, -RT/2 + 0.5 + i, GZ + 0.09, RB, 0.08, 0.06, GIT)
    for sx in (-1, 1):
        box(sx*RB/2, 0, GZ + 0.20, 0.16, RT, 0.16, GIT)

    # --- 6 Scooter
    pos = [(-5.2,-2.6,0.35),(-1.4,2.2,-0.9),(2.8,-1.6,2.4),
           (5.6,2.8,-2.1),(-4.4,2.9,1.4),(1.0,-3.0,-0.4)]
    for i, (cx, cy, a) in enumerate(pos):
        c = CAR[i % len(CAR)]
        o = box(cx, cy, BZ + 0.14, 1.62, 2.16, 0.24, GUMMI); o.rotation_euler[2] = a  # Gummiring
        o = box(cx, cy, BZ + 0.46, 1.24, 1.70, 0.52, c);     o.rotation_euler[2] = a  # Karosserie
        def loc(u, v, w, su, sv, sw, m, tilt=0.0):
            x = cx + v*math.cos(a) - u*math.sin(a)
            y = cy + v*math.sin(a) + u*math.cos(a)
            ob = box(x, y, BZ + w, sv, su, sw, m); ob.rotation_euler = (tilt, 0.0, a)
            return ob
        loc(-0.35, 0.0, 0.72, 0.50, 0.86, 0.14, SITZ)          # Sitzflaeche
        loc(-0.68, 0.0, 0.94, 0.14, 0.86, 0.58, SITZ)          # Lehne
        loc( 0.35, 0.0, 0.86, 0.10, 0.10, 0.44, c, tilt=-0.35) # Lenksaeule
        loc( 0.46, 0.0, 1.06, 0.10, 0.40, 0.10, SITZ)          # Lenkrad
        loc( 0.82, 0.0, 0.62, 0.24, 0.70, 0.14, L_W)           # Frontlicht
        zyl(cx, cy, (BZ + 0.70 + GZ)/2, 0.05, GZ - BZ - 0.70, GIT, 8)          # Stromstange
        kugel(cx, cy, GZ - 0.16, 0.13, LAM[i % len(LAM)], 8)

    # --- Neonschriftzug auf der Schauseite (+y)
    box(0, T/2 + 0.62, H + 2.10, 11.6, 0.30, 2.60, SCHILD)
    # Neonrohre, Lampen und Schrift liegen VOR der Tafel (groesseres y) — dahinter
    # waeren sie von der Schauseite aus unsichtbar.
    for sz in (H + 0.84, H + 3.36):
        box(0, T/2 + 0.80, sz, 11.9, 0.22, 0.22, L_R)
    for sx in (-5.85, 5.85):
        box(sx, T/2 + 0.80, H + 2.10, 0.22, 0.22, 2.72, L_R)
    dotword("SCOOTER", 0, T/2 + 0.84, H + 2.30, 0.30, L_W, 0.24)
    for i in range(9):
        kugel(-4.0 + i, T/2 + 0.86, H + 1.10, 0.13, LAM[i % len(LAM)], 8)
    export("th13_autoscooter", 0.020, 2)

# ================================================================ 4) Achterbahn-Modul
def achterbahn_modul():
    """Schienenmodul, exakt 12.0 m lang. Enden liegen auf gleicher Hoehe mit Steigung 0
    -> beliebig aneinanderreihbar (x += 12.0), der Uebergang bleibt knickfrei."""
    neu()
    SCH  = mat("AbSchiene", (0.98,0.82,0.14), 0.4, 0.25)
    SCHW = mat("AbSchwelle",(0.88,0.20,0.18), 0.6)
    STUE = mat("AbStuetze", (0.20,0.46,0.80), 0.55)
    VERB = mat("AbVerband", (0.96,0.94,0.90), 0.6)
    FUSS = mat("AbFuss",    (0.42,0.42,0.45), 0.95)
    L_W = leucht("AbLampeW", (1.00,0.95,0.76), 3.2)
    L_R = leucht("AbLampeR", (1.00,0.26,0.30), 3.0)
    L_B = leucht("AbLampeB", (0.38,0.66,1.00), 3.0)
    L_G = leucht("AbLampeG", (0.34,1.00,0.50), 3.0)
    LAM = [L_W, L_R, L_W, L_B, L_W, L_G]

    L, Z0, A, NS = 12.0, 3.40, 3.20, 48
    dx = L/NS
    def zf(x): return Z0 + A*(1.0 - math.cos(TAU*x/L))/2.0   # Enden: z=Z0+A, Steigung 0

    for i in range(NS):
        x0 = -L/2 + i*dx; x1 = x0 + dx
        zm = (zf(x0) + zf(x1))/2.0
        th = math.atan2(zf(x1) - zf(x0), dx)
        # Die beiden AEUSSERSTEN Segmente exakt waagrecht: ein gekipptes Segment ragt
        # sonst um dicke*sin(th) ueber x=+-6 hinaus und das Modul waere 12.02 statt 12.00 lang.
        if i == 0 or i == NS - 1: th = 0.0
        seg = dx/math.cos(th)
        for sy in (-0.62, 0.62):                              # zwei Schienen
            o = box(x0 + dx/2, sy, zm, seg, 0.15, 0.15, SCH); o.rotation_euler[1] = -th
        o = box(x0 + dx/2, 0.0, zm - 0.28, seg, 0.20, 0.20, SCH)   # Mittelrohr
        o.rotation_euler[1] = -th
        if i % 3 == 1:                                        # Schwellen (nie am Modulstoss)
            o = box(x0 + dx/2, 0, zm - 0.14, seg*1.1, 1.60, 0.11, SCHW)
            o.rotation_euler[1] = -th
        if i % 6 == 2:                                        # Randlampen
            for sy in (-0.86, 0.86):
                kugel(x0 + dx/2, sy, zm + 0.06, 0.13, LAM[(i//6) % len(LAM)], 8)

    for sx in (-4.5, -1.5, 1.5, 4.5):                         # Stuetzen
        zt = zf(sx) - 0.40
        box(sx, 0, 0.10, 1.70, 2.60, 0.20, FUSS)              # Fundament
        for sy in (-0.85, 0.85):
            box(sx, sy, zt/2 + 0.10, 0.34, 0.34, zt - 0.20, STUE)
        for zz in (1.30, 2.60):
            if zz < zt - 0.4:
                box(sx, 0, zz, 0.24, 1.70, 0.24, VERB)
        strebe((sx, -0.85, 0.30), (sx, 0.85, zt - 0.2), 0.13, VERB)
        strebe((sx,  0.85, 0.30), (sx,-0.85, zt - 0.2), 0.13, VERB)
        box(sx, 0, zt + 0.16, 0.34, 2.10, 0.30, STUE)         # Traversenkopf
    for x0, x1 in ((-4.5,-1.5), (-1.5,1.5), (1.5,4.5)):       # Laengsverband
        for sy in (-0.85, 0.85):
            box((x0+x1)/2, sy, 1.90, x1-x0, 0.20, 0.20, VERB)
            strebe((x0, sy, 0.45), (x1, sy, 3.20), 0.13, VERB)
    export("th13_achterbahn_modul", 0.018, 2)

# ================================================================ 5) Freifallturm
def freefall_turm():
    """Freifallturm ~30 m: Gittermast, Gondelring mit 8 Sitzen, Krone mit Lichtern."""
    neu()
    MAST = mat("FfMast",  (0.94,0.94,0.92), 0.45, 0.4)
    DIAG = mat("FfDiag",  (0.86,0.20,0.22), 0.5, 0.3)
    RING = mat("FfRing",  (0.20,0.44,0.80), 0.5, 0.35)
    SITZ = mat("FfSitz",  (0.96,0.78,0.16), 0.55)
    POLS = mat("FfPolster",(0.14,0.15,0.18), 0.8)
    KRON = mat("FfKrone", (0.86,0.26,0.62), 0.55)
    BOD  = mat("FfBoden", (0.40,0.40,0.43), 0.95)
    ZAUN = mat("FfZaun",  (0.62,0.65,0.70), 0.4, 0.25)
    L_W = leucht("FfLampeW", (1.00,0.95,0.76), 3.2)
    L_R = leucht("FfLampeR", (1.00,0.24,0.28), 3.2)
    L_B = leucht("FfLampeB", (0.36,0.64,1.00), 3.0)
    L_G = leucht("FfLampeG", (0.34,1.00,0.50), 3.0)
    L_P = leucht("FfLampeP", (1.00,0.42,0.88), 3.0)
    LAM = [L_W, L_R, L_W, L_B, L_W, L_G, L_W, L_P]

    HM, S = 27.6, 1.55                    # Mastspitze, halbe Kantenlaenge
    platte(11.0, 11.0, BOD)
    box(0, 0, FB + 0.16, 7.6, 7.6, 0.32, mat("FfPodest", (0.52,0.52,0.56), 0.8))
    PZ = FB + 0.32                        # begehbare Podest-Oberkante

    for sx in (-S, S):                    # 4 Eckstiele
        for sy in (-S, S):
            box(sx, sy, HM/2, 0.30, 0.30, HM, MAST)
    lev = [i*2.30 for i in range(1, 12)]
    for z in lev:                         # Riegel
        for sx in (-S, S):
            box(sx, 0, z, 0.20, 2*S, 0.20, MAST)
        for sy in (-S, S):
            box(0, sy, z, 2*S, 0.20, 0.20, MAST)
    for i in range(len(lev)-1):           # Diagonalen auf allen 4 Seiten
        z0, z1 = lev[i], lev[i+1]
        d = 1 if i % 2 == 0 else -1
        for sx in (-S, S):
            strebe((sx, -S*d, z0), (sx, S*d, z1), 0.15, DIAG)
        for sy in (-S, S):
            strebe((-S*d, sy, z0), (S*d, sy, z1), 0.15, DIAG)
    for sx in (-S, S):                    # Fuehrungsschienen
        for sy in (-S, S):
            box(sx*1.28, sy*1.28, (PZ + HM)/2, 0.16, 0.16, HM - PZ, RING)
    for i in range(14):                   # Lichtstreifen am Mast
        z = 1.6 + i*1.9
        for sx in (-S, S):
            for sy in (-S, S):
                box(sx*1.02, sy*1.02, z, 0.16, 0.16, 0.70, LAM[i % len(LAM)])

    # --- Krone
    box(0, 0, HM + 0.30, 4.6, 4.6, 0.60, KRON)
    box(0, 0, HM + 0.85, 3.4, 3.4, 0.50, KRON)
    lampenring(0, 0, HM + 0.30, 2.65, 16, 0.18, LAM)
    for k in range(4):
        a = k/4*TAU + math.pi/4
        strebe((2.2*math.cos(a), 2.2*math.sin(a), HM + 0.60),
               (0.0, 0.0, HM + 1.80), 0.14, MAST)
    zyl(0, 0, HM + 1.90, 0.14, 0.90, MAST, 10)
    kugel(0, 0, HM + 2.42, 0.40, L_R, 12)

    # --- Gondelring (Parkposition auf Einstiegshoehe)
    RG, ZR = 3.35, PZ + 2.10
    ring(0, 0, ZR, RG, 16, 0.34, 0.34, RING)
    ring(0, 0, ZR - 0.10, 1.95, 12, 0.26, 0.26, RING)
    for k in range(8):
        a = k/8*TAU
        strebe((1.95*math.cos(a), 1.95*math.sin(a), ZR - 0.10),
               (RG*math.cos(a), RG*math.sin(a), ZR), 0.16, RING)
    for k in range(8):
        a = (k + 0.5)/8*TAU
        ca, sa = math.cos(a), math.sin(a)
        def sbox(rr, w, su, sv, sw, m, tilt=0.0):
            o = box(rr*ca, rr*sa, PZ + w, sv, su, sw, m)
            o.rotation_euler = (tilt, 0.0, a)
            return o
        sbox(RG, 1.55, 0.16, 0.16, 1.10, RING)                 # Aufhaengung
        sbox(RG + 0.16, 1.35, 1.10, 0.16, 1.20, SITZ)          # Rueckenlehne
        sbox(RG + 0.10, 1.32, 0.98, 0.14, 1.00, POLS)
        sbox(RG - 0.22, 0.98, 1.00, 0.66, 0.14, SITZ)          # Sitzflaeche
        sbox(RG - 0.22, 1.02, 0.90, 0.56, 0.08, POLS)
        sbox(RG - 0.48, 1.42, 0.92, 0.16, 0.16, SITZ)          # Schulterbuegel
        for v in (-0.34, 0.34):
            o = box((RG - 0.34)*ca - v*sa, (RG - 0.34)*sa + v*ca, PZ + 1.62,
                    0.14, 0.42, 0.14, SITZ); o.rotation_euler[2] = a
        sbox(RG - 0.30, 0.62, 0.80, 0.30, 0.10, RING)          # Fussstuetze
        kugel((RG + 0.30)*ca, (RG + 0.30)*sa, PZ + 2.00, 0.14, LAM[k % len(LAM)], 8)

    # --- Sicherheitszaun ums Podest + Einstieg auf +y
    # Der Zaun steht NEBEN dem Podest, also auf der Bodenplatte (FB) — auf PZ bezogen
    # wuerde er 0.32 m in der Luft haengen.
    def rgel(cx, cy, laenge, achse, n):     # Pfosten + 2 Holme, KEINE Blechwand
        for i in range(n + 1):
            t = -laenge/2 + laenge*i/n
            if achse == 'y': box(cx, cy + t, FB + 0.61, 0.09, 0.09, 1.22, ZAUN)
            else:            box(cx + t, cy, FB + 0.61, 0.09, 0.09, 1.22, ZAUN)
        for zz in (FB + 1.16, FB + 0.64):
            if achse == 'y': box(cx, cy, zz, 0.08, laenge, 0.08, ZAUN)
            else:            box(cx, cy, zz, laenge, 0.08, 0.08, ZAUN)
    for sx in (-1, 1):
        rgel(sx*4.6, 0.0, 9.2, 'y', 9)
    rgel(0.0, -4.6, 9.2, 'x', 9)
    for sx in (-3.1, 3.1):
        rgel(sx, 4.6, 3.0, 'x', 3)
    box(0, 5.1, FB/2 + 0.11, 3.2, 0.90, 0.22, BOD)             # Stufe zum Podest
    girlande((-4.6, 4.6, FB + 1.42), (4.6, 4.6, FB + 1.42), 13, 0.20, LAM, 0.12, ZAUN)
    export("th13_freefall_turm", 0.020, 2)

# ================================================================ 6) Losbude
def losbude():
    """Losbude mit Theke, Lostrommel, Preisregal, gestreifter Markise und Girlande."""
    neu()
    WAND = mat("LbWand",  (0.94,0.92,0.86), 0.8)
    RAHM = mat("LbRahmen",(0.72,0.16,0.20), 0.6)
    BOD  = mat("LbBoden", (0.44,0.34,0.24), 0.85)
    DACH = mat("LbDach",  (0.30,0.32,0.36), 0.8)
    HOLZ = mat("LbHolz",  (0.62,0.44,0.26), 0.75)
    GOLD = mat("LbGold",  (0.90,0.72,0.28), 0.35, 0.35)
    MW   = mat("LbMarkiseW", (0.96,0.95,0.92), 0.7)
    MR   = mat("LbMarkiseR", (0.86,0.18,0.22), 0.7)
    SCHILD=mat("LbSchild",(0.16,0.10,0.24), 0.5)
    L_W = leucht("LbLampeW", (1.00,0.95,0.76), 3.2)
    L_R = leucht("LbLampeR", (1.00,0.28,0.30), 3.0)
    L_G = leucht("LbLampeG", (0.36,1.00,0.52), 3.0)
    L_B = leucht("LbLampeB", (0.40,0.66,1.00), 3.0)
    LAM = [L_W, L_R, L_W, L_B, L_W, L_G]
    PRS = [mat("LbPreis%d"%i, c, 0.6) for i, c in enumerate(
            [(0.92,0.26,0.28),(0.96,0.80,0.20),(0.28,0.56,0.88),(0.34,0.76,0.42),
             (0.92,0.50,0.80),(0.98,0.58,0.20)])]

    B, T, H, d = 4.60, 2.80, 3.00, 0.14
    platte(B + 1.6, T + 1.4, BOD)
    box(0, 0, FB/2 + 0.06, B, T, FB, HOLZ)                      # Standboden innen
    IB = FB + 0.06                                              # Innenboden-Oberkante
    box(0, -T/2, H/2, B, d, H, WAND)                            # Rueckwand
    for sx in (-1, 1):
        box(sx*B/2, 0, H/2, d, T, H, WAND)
    box(0, T/2, IB + 0.50, B, d, 1.00, RAHM)                    # Thekenbrueckung (+y)
    box(0, T/2, H - 0.30, B, d, 0.60, RAHM)                     # Sturz
    box(0, T/2 + 0.22, IB + 1.06, B + 0.30, 0.72, 0.10, HOLZ)   # Theke
    box(0, T/2 + 0.54, IB + 0.52, B + 0.30, 0.10, 0.98, RAHM)
    box(0, 0, H + 0.12, B + 0.50, T + 0.50, 0.24, DACH)         # Dach

    for i in range(8):                                          # Markise, gestreift
        o = box(-B/2 + B/16 + i*B/8, T/2 + 0.86, H - 0.06, B/8, 1.70, 0.09,
                MR if i % 2 == 0 else MW)
        o.rotation_euler[0] = -0.26
    box(0, T/2 + 1.64, H - 0.46, B + 0.20, 0.16, 0.30, RAHM)    # Volant
    for sx in (-1, 1):
        strebe((sx*(B/2 - 0.1), T/2 + 0.05, H + 0.02),
               (sx*(B/2 - 0.1), T/2 + 1.62, H - 0.42), 0.07, RAHM)

    box(0, T/2 - 0.02, H + 0.69, 3.40, 0.18, 1.10, SCHILD)      # Schild sitzt auf dem Dach
    dotword("LOSE", 0, T/2 + 0.14, H + 0.69, 0.17, L_W, 0.14)
    for i in range(11):
        kugel(-1.6 + i*0.32, T/2 + 0.14, H + 1.24, 0.09, LAM[i % len(LAM)], 8)
    girlande((-B/2 - 0.5, T/2 + 0.62, H - 0.10), (B/2 + 0.5, T/2 + 0.62, H - 0.10),
             13, 0.26, LAM, 0.10, RAHM)

    zyl(-1.5, T/2 + 0.16, IB + 1.48, 0.42, 0.52, GOLD, 14, rot=(0, math.pi/2, 0))  # Lostrommel
    box(-1.5, T/2 + 0.16, IB + 1.48, 0.86, 0.10, 0.10, GOLD)
    for sx in (-1.98, -1.02):
        box(sx, T/2 + 0.16, IB + 1.20, 0.08, 0.30, 0.44, HOLZ)
    box(-1.06, T/2 + 0.16, IB + 1.48, 0.12, 0.10, 0.28, RAHM)   # Kurbel
    box(1.5, T/2 + 0.20, IB + 1.26, 0.70, 0.50, 0.30, PRS[1])   # Loskiste
    for i in range(4):
        box(1.2 + (i % 2)*0.34, T/2 + 0.12 + (i//2)*0.2, IB + 1.44, 0.14, 0.14, 0.06, MW)

    for k, zz in enumerate((0.55, 1.20, 1.85)):                 # Preisregal an der Rueckwand
        box(0, -T/2 + 0.34, IB + zz, B - 0.4, 0.44, 0.07, HOLZ)
        for i in range(6):
            px = -1.75 + i*0.70
            m = PRS[(i + k) % len(PRS)]
            if (i + k) % 3 == 0:
                kugel(px, -T/2 + 0.34, IB + zz + 0.24, 0.20, m, 10)
            elif (i + k) % 3 == 1:
                box(px, -T/2 + 0.34, IB + zz + 0.20, 0.34, 0.30, 0.34, m)
            else:
                zyl(px, -T/2 + 0.34, IB + zz + 0.22, 0.16, 0.40, m, 12)
    for sx in (-1, 1):                                          # Regalwangen
        box(sx*(B/2 - 0.18), -T/2 + 0.34, IB + 1.20, 0.08, 0.44, 2.30, HOLZ)
    export("th13_losbude", 0.018, 2)

# ================================================================ 7) Imbissbude
def imbissbude():
    """Imbiss mit Ausgabefenster, Menuetafel, Sonnenschirm und Stehtisch."""
    neu()
    WAND = mat("IbWand",  (0.92,0.90,0.84), 0.8)
    RAHM = mat("IbRahmen",(0.16,0.46,0.34), 0.6)
    BOD  = mat("IbBoden", (0.44,0.34,0.24), 0.85)
    DACH = mat("IbDach",  (0.30,0.32,0.36), 0.8)
    STAHL= mat("IbStahl", (0.78,0.80,0.84), 0.35, 0.25)
    HOLZ = mat("IbHolz",  (0.62,0.44,0.26), 0.75)
    TAFEL= mat("IbTafel", (0.10,0.12,0.14), 0.65)
    SW   = mat("IbSchirmW",(0.96,0.95,0.92), 0.7)
    SR   = mat("IbSchirmR",(0.90,0.22,0.18), 0.7)
    L_W = leucht("IbLampeW", (1.00,0.95,0.78), 3.0)
    L_Y = leucht("IbLampeY", (1.00,0.82,0.24), 3.0)
    L_R = leucht("IbLampeR", (1.00,0.28,0.28), 3.0)
    L_G = leucht("IbLampeG", (0.40,1.00,0.54), 3.0)
    LAM = [L_W, L_R, L_W, L_Y, L_W, L_G]

    B, T, H, d = 4.20, 3.00, 3.10, 0.14
    box(0, 1.30, FB/2, B + 1.8, 9.60, FB, BOD)     # Platz reicht bis unter den Schirm
    box(0, 0, FB/2 + 0.06, B, T, FB, HOLZ)
    IB = FB + 0.06
    box(0, -T/2, H/2, B, d, H, WAND)
    for sx in (-1, 1):
        box(sx*B/2, 0, H/2, d, T, H, WAND)
        box(sx*B/2, 0, IB + 1.90, d*1.4, T - 0.6, 0.12, RAHM)
    box(0, T/2, IB + 0.55, B, d, 1.10, RAHM)                    # Bruestung unter dem Fenster
    box(0, T/2, H - 0.38, B, d, 0.76, RAHM)                     # Sturz -> Ausgabefenster
    for sx in (-1.05, 1.05):                                    # Fensterpfosten
        box(sx, T/2, IB + 1.68, 0.10, d*1.2, 1.16, RAHM)
    box(0, T/2 + 0.24, IB + 1.16, B + 0.34, 0.76, 0.10, STAHL)  # Ausgabetheke
    box(0, T/2 + 0.60, IB + 0.58, B + 0.34, 0.10, 1.06, RAHM)
    box(0, 0, H + 0.12, B + 0.50, T + 0.50, 0.24, DACH)
    o = box(0, T/2 + 0.48, H + 0.34, B + 0.50, 1.10, 0.12, RAHM)   # Klappe/Vordach
    o.rotation_euler[0] = -0.30
    for sx in (-1, 1):
        strebe((sx*(B/2 - 0.1), T/2 + 0.06, H + 0.30),
               (sx*(B/2 - 0.1), T/2 + 1.32, H + 0.06), 0.06, RAHM)
    zyl(-1.2, -0.6, H + 0.62, 0.22, 0.76, STAHL, 12)            # Abzugsrohr
    zyl(-1.2, -0.6, H + 1.06, 0.30, 0.14, STAHL, 12)

    box(0, T/2 - 0.02, H + 0.65, 3.20, 0.16, 1.02, TAFEL)       # Menuetafel auf dem Dach
    dotword("IMBISS", 0, T/2 + 0.12, H + 0.65, 0.13, L_Y, 0.12)
    girlande((-B/2 - 0.4, T/2 + 0.68, H + 0.30), (B/2 + 0.4, T/2 + 0.68, H + 0.30),
             11, 0.22, LAM, 0.10, RAHM)

    box(0, -T/2 + 0.55, IB + 0.45, B - 0.5, 0.80, 0.90, STAHL)  # Kueche
    box(0, -T/2 + 0.55, IB + 0.94, B - 0.4, 0.90, 0.08, STAHL)
    for sx in (-1.0, 0.0, 1.0):
        zyl(sx, -T/2 + 0.55, IB + 1.02, 0.24, 0.08, mat("IbPlatte", (0.18,0.18,0.20), 0.6), 14)
    box(1.4, T/2 - 0.30, IB + 1.30, 0.60, 0.44, 0.28, L_Y)      # Waermevitrine
    for i in range(3):
        zyl(-1.7 + i*0.30, T/2 - 0.20, IB + 1.34, 0.07, 0.26, LAM[i % 3], 10)

    # --- Sonnenschirm mit Stehtisch (vor der Bude, +y)
    px, py = 1.40, T/2 + 2.55       # seitlich versetzt, sonst verdeckt der Schirm
    zyl(px, py, FB + 1.22, 0.06, 2.44, STAHL, 10)               # das Ausgabefenster
    kegel(px, py, FB + 2.60, 1.50, 0.10, 0.38, SW, 16)
    for k in range(8):                                          # Schirmbahnen
        a = k/8*TAU
        o = box(px + 0.77*math.cos(a), py + 0.77*math.sin(a), FB + 2.62, 1.46, 0.60, 0.05,
                SR if k % 2 == 0 else SW)
        o.rotation_euler = (0.0, math.atan2(0.38, 1.40), a)
    zyl(px, py, FB + 2.86, 0.07, 0.24, STAHL, 8)
    kugel(px, py, FB + 3.04, 0.12, L_W, 10)
    zyl(px, py, FB + 0.55, 0.07, 1.10, STAHL, 10)               # Stehtisch
    zyl(px, py, FB + 1.14, 0.52, 0.07, HOLZ, 18)
    zyl(px, py, FB + 0.04, 0.42, 0.08, STAHL, 18)
    export("th13_imbissbude", 0.018, 2)

# ================================================================ 8) Zuckerwatte-Stand
def zuckerwatte_stand():
    """Kleiner Stand mit Zuckerwattemaschine, rosa Markise, Wattestecken."""
    neu()
    WAND = mat("ZwWand",  (0.98,0.94,0.96), 0.8)
    RAHM = mat("ZwRahmen",(0.92,0.42,0.66), 0.6)
    BOD  = mat("ZwBoden", (0.44,0.34,0.24), 0.85)
    DACH = mat("ZwDach",  (0.34,0.30,0.34), 0.8)
    HOLZ = mat("ZwHolz",  (0.66,0.48,0.28), 0.75)
    STAHL= mat("ZwStahl", (0.80,0.82,0.86), 0.35, 0.25)
    MP   = mat("ZwMarkiseP", (0.96,0.52,0.74), 0.7)
    MW   = mat("ZwMarkiseW", (0.98,0.96,0.95), 0.7)
    WATT = mat("ZwWatte", (0.99,0.72,0.86), 0.95)
    WAT2 = mat("ZwWatte2",(0.80,0.86,0.99), 0.95)
    SCHILD=mat("ZwSchild",(0.30,0.10,0.26), 0.5)
    L_W = leucht("ZwLampeW", (1.00,0.95,0.80), 3.0)
    L_P = leucht("ZwLampeP", (1.00,0.46,0.80), 3.0)
    L_B = leucht("ZwLampeB", (0.50,0.72,1.00), 3.0)
    LAM = [L_W, L_P, L_W, L_B]

    B, T, H, d = 2.60, 2.00, 2.55, 0.12
    platte(B + 1.4, T + 1.2, BOD)
    box(0, 0, FB/2 + 0.06, B, T, FB, HOLZ)
    IB = FB + 0.06
    box(0, -T/2, H/2, B, d, H, WAND)
    for sx in (-1, 1):
        box(sx*B/2, 0, H/2, d, T, H, WAND)
    box(0, T/2, IB + 0.48, B, d, 0.96, RAHM)
    box(0, T/2, H - 0.24, B, d, 0.48, RAHM)
    box(0, T/2 + 0.20, IB + 1.02, B + 0.26, 0.68, 0.09, HOLZ)   # Theke
    box(0, T/2 + 0.49, IB + 0.50, B + 0.26, 0.09, 0.94, RAHM)
    box(0, 0, H + 0.10, B + 0.44, T + 0.44, 0.20, DACH)

    for i in range(7):                                          # rosa Markise
        o = box(-B/2 + B/14 + i*B/7, T/2 + 0.72, H - 0.06, B/7, 1.42, 0.08,
                MP if i % 2 == 0 else MW)
        o.rotation_euler[0] = -0.28
    box(0, T/2 + 1.40, H - 0.44, B + 0.16, 0.14, 0.26, MP)
    for sx in (-1, 1):
        strebe((sx*(B/2 - 0.08), T/2 + 0.04, H + 0.02),
               (sx*(B/2 - 0.08), T/2 + 1.38, H - 0.40), 0.06, RAHM)
    # Schild breit genug fuer das lange Wort — bei 2.30 m ragten die Randbuchstaben
    # links und rechts ueber die Tafel hinaus.
    box(0, T/2 - 0.02, H + 0.43, 3.00, 0.14, 0.62, SCHILD)      # buendig auf dem Dach
    dotword("ZUCKERWATTE", 0, T/2 + 0.10, H + 0.43, 0.068, L_P, 0.09)
    girlande((-B/2 - 0.3, T/2 + 0.54, H - 0.10), (B/2 + 0.3, T/2 + 0.54, H - 0.10),
             9, 0.18, LAM, 0.09, RAHM)

    # --- Maschine auf der Theke: Trommel in Schuessel + Wattewolke
    TH = IB + 1.07                                              # Thekenoberkante
    zyl(-0.55, T/2 + 0.16, TH + 0.10, 0.44, 0.20, STAHL, 20)
    zyl(-0.55, T/2 + 0.16, TH + 0.26, 0.40, 0.14, MW, 20)
    zyl(-0.55, T/2 + 0.16, TH + 0.38, 0.14, 0.22, STAHL, 12)
    kugel(-0.55, T/2 + 0.16, TH + 0.56, 0.26, WATT, 12)
    zyl(-0.55, T/2 + 0.16, TH + 0.02, 0.48, 0.10, RAHM, 20)
    for i in range(5):                                          # Wattestecken im Halter
        px = 0.42 + (i % 3)*0.30
        py = T/2 + 0.02 + (i//3)*0.28
        zyl(px, py, TH + 0.22, 0.03, 0.36, HOLZ, 8)
        kugel(px, py, TH + 0.54, 0.19, WATT if i % 2 == 0 else WAT2, 12)
    box(1.02, T/2 + 0.14, TH + 0.09, 0.55, 0.44, 0.09, STAHL)
    for k, zz in enumerate((0.52, 1.10, 1.66)):                 # Regal hinten
        box(0, -T/2 + 0.28, IB + zz, B - 0.34, 0.36, 0.06, HOLZ)
        for i in range(4):
            kugel(-0.86 + i*0.58, -T/2 + 0.28, IB + zz + 0.22, 0.17,
                  WATT if (i + k) % 2 == 0 else WAT2, 10)
    export("th13_zuckerwatte_stand", 0.016, 2)

# ================================================================ 9) Festzelt
def festzelt():
    """Begehbares Festzelt: offene Seiten, gestreiftes Satteldach, 6 Biertischgarnituren."""
    neu()
    BOD  = mat("FzBoden", (0.48,0.40,0.28), 0.9)
    PLAN = mat("FzPlaneW",(0.96,0.95,0.92), 0.75)
    PLA2 = mat("FzPlaneB",(0.20,0.42,0.78), 0.75)
    HOLZ = mat("FzHolz",  (0.72,0.56,0.34), 0.75)
    BANK = mat("FzBank",  (0.62,0.44,0.24), 0.75)
    STAHL= mat("FzStahl", (0.64,0.66,0.70), 0.4, 0.25)
    ROT  = mat("FzRot",   (0.84,0.18,0.20), 0.6)
    SCHILD=mat("FzSchild",(0.14,0.12,0.28), 0.5)
    KRUG = mat("FzKrug",  (0.88,0.70,0.26), 0.35)
    L_W = leucht("FzLampeW", (1.00,0.95,0.78), 3.0)
    L_R = leucht("FzLampeR", (1.00,0.28,0.30), 2.8)
    L_G = leucht("FzLampeG", (0.36,1.00,0.52), 2.8)
    L_B = leucht("FzLampeB", (0.40,0.66,1.00), 2.8)
    L_Y = leucht("FzLampeY", (1.00,0.84,0.28), 2.8)
    LAM = [L_W, L_R, L_Y, L_G, L_W, L_B]

    B, T = 16.0, 12.0                    # Grundriss
    HE, HF = 3.40, 6.40                  # Traufe, First
    platte(B + 2.4, T + 2.4, BOD)
    box(0, 0, FB/2 + 0.05, B, T, FB, mat("FzTanz", (0.56,0.44,0.30), 0.8))
    IB = FB + 0.05                       # Tanzboden-Oberkante

    for sx in (-7.6, -3.8, 0.0, 3.8, 7.6):                      # Stuetzen an den Traufen
        for sy in (-T/2, T/2):
            box(sx, sy, (IB + HE)/2, 0.26, 0.26, HE - IB, HOLZ)
            box(sx, sy, IB + 0.06, 0.44, 0.44, 0.12, STAHL)
    # Pfetten/Sparren 0.22 m TIEFER als die Dachebene — sonst stechen sie durch die
    # Plane und liegen als Balken obenauf statt darunter.
    for sy in (-T/2, T/2):
        box(0, sy, HE - 0.22, B + 0.8, 0.24, 0.26, HOLZ)        # Traufpfetten
    box(0, 0, HF - 0.24, B + 0.8, 0.26, 0.30, HOLZ)             # Firstpfette
    for sx in (-7.6, -3.8, 0.0, 3.8, 7.6):                      # Sparren (von innen sichtbar)
        for sy in (-T/2, T/2):
            strebe((sx, sy, HE - 0.22), (sx, 0.0, HF - 0.22), 0.14, HOLZ)
        # Kehlbalken kurz halten: bei +-3.2 / HE+1.6 stachen die Enden durch die Plane
        strebe((sx, -2.4, HE + 1.30), (sx, 2.4, HE + 1.30), 0.12, HOLZ)

    slope = math.atan2(HF - HE, T/2)                            # 0.4636
    slen = math.hypot(T/2, HF - HE) + 0.60
    for sy in (-1, 1):                                          # gestreifte Dachbahnen
        for i in range(8):
            cy = sy*(T/4 + 0.30*math.cos(slope))
            cz = (HE + HF)/2 - 0.30*math.sin(slope)
            o = box(-8.2 + 1.025 + i*2.05, cy, cz, 2.05, slen, 0.12,
                    PLAN if i % 2 == 0 else PLA2)
            o.rotation_euler[0] = -sy*slope
    for sx in (-1, 1):                                          # Giebelflaechen
        giebel(sx*8.15, 0, HE, T/2, HF - HE, 0.16, PLAN, achse='y')
        for k in range(5):
            box(sx*8.05, 0, HE + 0.35 + k*0.62, 0.10, (T/2)*(1 - (0.35 + k*0.62)/(HF-HE))*1.9,
                0.10, ROT)
    for sy in (-1, 1):                                          # Volant an der Traufe
        for i in range(16):
            box(-B/2 + 0.5 + i, sy*(T/2 + 0.55), HE - 0.30, 1.0, 0.10, 0.44,
                ROT if i % 2 == 0 else PLAN)
    for sy in (-1, 1):
        girlande((-8.0, sy*(T/2 - 0.2), HE + 0.05), (8.0, sy*(T/2 - 0.2), HE + 0.05),
                 17, 0.28, LAM, 0.11, HOLZ)
    girlande((-7.9, -T/2 + 0.5, HE + 0.5), (7.9, T/2 - 0.5, HE + 0.5), 17, 0.45, LAM, 0.11, HOLZ)
    girlande((-7.9, T/2 - 0.5, HE + 0.5), (7.9, -T/2 + 0.5, HE + 0.5), 17, 0.45, LAM, 0.11, HOLZ)

    box(0, T/2 + 0.62, HE - 0.92, 5.60, 0.14, 0.86, SCHILD)     # Banner ueber dem Eingang
    dotword("FESTZELT", 0, T/2 + 0.74, HE - 0.92, 0.115, L_Y, 0.10)

    # --- 6 Biertischgarnituren (Tisch 0.78, Baenke 0.47 ueber dem Tanzboden)
    for gx in (-5.2, 0.0, 5.2):
        for gy in (-3.0, 3.0):
            box(gx, gy, IB + 0.74, 2.40, 0.58, 0.07, HOLZ)      # Tischplatte
            box(gx, gy, IB + 0.70, 2.20, 0.14, 0.10, BANK)
            for bx in (-0.95, 0.95):
                box(gx + bx, gy, IB + 0.37, 0.09, 0.52, 0.74, HOLZ)
                box(gx + bx, gy, IB + 0.03, 0.14, 0.64, 0.06, STAHL)
            for by in (-0.78, 0.78):
                box(gx, gy + by, IB + 0.44, 2.40, 0.26, 0.06, BANK)
                for bx in (-0.95, 0.95):
                    box(gx + bx, gy + by, IB + 0.22, 0.08, 0.24, 0.44, HOLZ)
                    box(gx + bx, gy + by, IB + 0.02, 0.12, 0.34, 0.04, STAHL)
            for i in range(3):                                   # Kruege auf dem Tisch
                zyl(gx - 0.7 + i*0.7, gy + 0.1, IB + 0.87, 0.09, 0.20, KRUG, 12)
    export("th13_festzelt", 0.020, 2)

# ================================================================ 10) Lichterbogen
def lichterbogen():
    """Eingangsbogen 9 m breit, 7 m lichte Durchfahrt, sehr viele Lampen (emissiv)."""
    neu()
    PYL  = mat("LbPylon", (0.90,0.20,0.24), 0.55)
    PYL2 = mat("LbPylon2",(0.98,0.96,0.92), 0.6)
    BOG  = mat("LbBogen", (0.20,0.42,0.80), 0.55)
    GOLD = mat("LbGold",  (0.90,0.72,0.28), 0.35, 0.35)
    BOD  = mat("LbGrund", (0.42,0.42,0.45), 0.95)
    SCHILD=mat("LbSchild",(0.12,0.08,0.22), 0.5)
    L_W = leucht("LiLampeW", (1.00,0.95,0.78), 3.4)
    L_R = leucht("LiLampeR", (1.00,0.26,0.30), 3.2)
    L_G = leucht("LiLampeG", (0.34,1.00,0.50), 3.2)
    L_B = leucht("LiLampeB", (0.40,0.66,1.00), 3.2)
    L_Y = leucht("LiLampeY", (1.00,0.84,0.26), 3.2)
    L_P = leucht("LiLampeP", (1.00,0.44,0.86), 3.2)
    LAM = [L_W, L_R, L_Y, L_G, L_W, L_B, L_P, L_W]

    PX, PB, PT, PH = 3.85, 1.00, 1.20, 3.90     # Pylonachse, Breite, Tiefe, Hoehe
    R, NB = 3.85, 26                            # Bogenradius = Pylonachse -> Bogen landet
    platte(9.04, 3.60, BOD)                     # exakt auf den Pylonen
    for sx in (-PX, PX):
        box(sx, 0, 0.16, PB + 0.34, PT + 0.44, 0.32, PYL2)      # Sockel
        box(sx, 0, (0.32 + PH)/2, PB, PT, PH - 0.32, PYL)
        for zz in (1.30, 2.60, 3.80):                            # Zierbaender
            box(sx, 0, zz, PB + 0.14, PT + 0.14, 0.16, PYL2)
        box(sx, 0, PH + 0.12, PB + 0.34, PT + 0.34, 0.24, GOLD)  # Kaempfer
        for sy in (-1, 1):                                       # Lampen auf den Pylonen
            for i in range(6):
                kugel(sx, sy*(PT/2 + 0.16), 0.75 + i*0.62, 0.15, LAM[i % len(LAM)], 8)
        for i in range(3):
            kugel(sx - 0.28 + i*0.28, 0, PH + 0.42, 0.14, LAM[i % len(LAM)], 8)

    for i in range(NB):                                          # Bogen aus Segmenten
        f0 = math.pi*i/NB; f1 = math.pi*(i+1)/NB
        fm = (f0 + f1)/2
        ch = 2*R*math.sin((f1 - f0)/2)*1.06
        o = box(R*math.cos(fm), 0, PH + R*math.sin(fm), ch, PT, 0.54, BOG)
        o.rotation_euler[1] = -(fm + math.pi/2)                  # lokale x -> Tangente
        o = box(R*math.cos(fm)*0.945, 0, PH + R*math.sin(fm)*0.945, ch*0.95, PT + 0.18, 0.14, GOLD)
        o.rotation_euler[1] = -(fm + math.pi/2)
        for sy in (-1, 1):                                       # Lampen beidseitig
            kugel((R + 0.02)*math.cos(fm), sy*(PT/2 + 0.16), PH + (R + 0.02)*math.sin(fm),
                  0.16, LAM[i % len(LAM)], 8)
        if i % 2 == 0:
            kugel((R - 0.42)*math.cos(fm), 0, PH + (R - 0.42)*math.sin(fm),
                  0.15, LAM[(i//2) % len(LAM)], 8)               # Laibungslampen
    box(0, 0, PH + R + 0.60, 8.00, PT + 0.30, 1.20, SCHILD)      # Krone
    dotword("JAHRMARKT", 0,  (PT/2 + 0.22), PH + R + 0.62, 0.155, L_Y, 0.13)
    dotword("JAHRMARKT", 0, -(PT/2 + 0.22), PH + R + 0.62, 0.155, L_Y, 0.13, richtung=1)
    for sy in (-1, 1):
        box(0, sy*(PT/2 + 0.12), PH + R + 1.26, 8.10, 0.18, 0.18, GOLD)
        box(0, sy*(PT/2 + 0.12), PH + R - 0.02, 8.10, 0.18, 0.18, GOLD)
        for i in range(15):
            kugel(-3.5 + i*0.5, sy*(PT/2 + 0.20), PH + R + 1.40, 0.15, LAM[i % len(LAM)], 8)
    kugel(0, 0, PH + R + 1.64, 0.30, L_W, 12)
    for sy in (-1, 1):                                           # Girlanden von der Krone
        girlande((-PX, sy*(PT/2 + 0.05), PH + 0.30), (0, sy*(PT/2 + 0.05), PH + R - 0.30),
                 9, -0.35, LAM, 0.12, GOLD)
        girlande((PX, sy*(PT/2 + 0.05), PH + 0.30), (0, sy*(PT/2 + 0.05), PH + R - 0.30),
                 9, -0.35, LAM, 0.12, GOLD)
    export("th13_lichterbogen", 0.020, 2)

ALLE = (riesenrad, karussell, autoscooter, achterbahn_modul, freefall_turm,
        losbude, imbissbude, zuckerwatte_stand, festzelt, lichterbogen)

if __name__ == "__main__":
    import sys
    wahl = [a for a in sys.argv[1:] if not a.startswith("-")]
    print("Asset-Charge 9 (th13, Jahrmarkt):")
    for fn in ALLE:
        if wahl and fn.__name__ not in wahl: continue
        fn()
    print("fertig")
