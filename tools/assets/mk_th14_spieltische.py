# -*- coding: utf-8 -*-
"""Asset-Charge 10 (th14_*): CASINO- UND BARAUSSTATTUNG im Vegas-Look.

Familienfreundliche DEKO-Moebel fuer das three.js-Stadtspiel: reine Einrichtung,
KEINE Waffen, kein Gore, kein echtes Gluecksspiel — Automaten/Tische sind Kulisse.
Viel Licht: emissive Materialien an Blenden, Schildern, Fugen und Kerzen.

Konventionen (identisch zu th5..th11):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
    AUSNAHME: `th14_discokugel` und `th14_kronleuchter` HAENGEN — Unterkante > 0,
    Aufhaengehoehe ist in der jeweiligen Docstring dokumentiert.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * Schauseite / Bedienseite auf Blender +y  ->  in three.js -z.
  * `primitive_cube_add(size=1)` liefert Kantenlaenge 1 -> Skalierung = Mass, NICHT /2.
  * `rot=(pi/2,0,0)` legt eine Zylinderachse auf -y, NICHT auf x.
    Fuer Achsen laengs x `rot=(0,pi/2,0)` benutzen.
  * Metallic 1.0 rendert ohne Environment-Map SCHWARZ -> Chrom/Messing max. 0.7.
  * Massstab: Spielfigur ~1.8 m. Tisch 0.75..0.80, Tresen 1.10, Sitz 0.45,
    Barhocker-Sitz 0.75.
"""
import bpy, bmesh, os, math

OUT_GLB = "/home/user/aban-news-landing/models"
OUT_STL = "/home/user/aban-news-landing/models/stl"
os.makedirs(OUT_STL, exist_ok=True)

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

def box(x, y, z, sx, sy, sz, m=None):
    # size=1 liefert bereits Kantenlaenge 1 -> Skalierung = gewuenschte Masse (NICHT /2)
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
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=seg, ring_count=max(6, seg//2))
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kegel(x, y, z, r1, r2, h, m=None, seg=16, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def torus(x, y, z, R, r, m=None, seg=28, rseg=8, rot=(0,0,0)):
    """Ring. Liegt ohne Rotation in der xy-Ebene (Achse z);
    rot=(pi/2,0,0) stellt ihn in die xz-Ebene."""
    bpy.ops.mesh.primitive_torus_add(location=(x,y,z), rotation=rot,
                                     major_radius=R, minor_radius=r,
                                     major_segments=seg, minor_segments=rseg)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def gruppe(objs, cx, cy, ang):
    """Fertig gebaute Teilgruppe (Aufbau um den lokalen Ursprung) um z drehen + versetzen."""
    ca, sa = math.cos(ang), math.sin(ang)
    for o in objs:
        x, y, z = o.location
        o.location = (cx + x*ca - y*sa, cy + x*sa + y*ca, z)
        o.rotation_euler[2] += ang
    return objs

# ---------------------------------------------------------------- Profil-Prismen
def _mesh_aus(v, f, m, name):
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if m: o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free(); me.update()
    return o

def prisma_x(cx, pts, breite, m=None, name="PrismaX"):
    """Seitenprofil (y,z) laengs x extrudiert."""
    b = breite/2.0; n = len(pts)
    v = [(cx-b, p[0], p[1]) for p in pts] + [(cx+b, p[0], p[1]) for p in pts]
    f = [tuple(range(n)), tuple(range(2*n-1, n-1, -1))]
    for i in range(n):
        j = (i+1) % n
        f.append((i, j, j+n, i+n))
    return _mesh_aus(v, f, m, name)

def prisma_y(cy, pts, tiefe, m=None, name="PrismaY"):
    """Frontprofil (x,z) laengs y extrudiert — fuer Schilder, Giebel, Kronen."""
    d = tiefe/2.0; n = len(pts)
    v = [(p[0], cy-d, p[1]) for p in pts] + [(p[0], cy+d, p[1]) for p in pts]
    f = [tuple(range(n)), tuple(range(2*n-1, n-1, -1))]
    for i in range(n):
        j = (i+1) % n
        f.append((i, j, j+n, i+n))
    return _mesh_aus(v, f, m, name)

def prisma_z(pts, z0, h, m=None, name="PrismaZ"):
    """Grundriss (x,y) in z extrudiert — Ovale, Halbrunde, Podeste.
    Nur so bleibt die Unterkante exakt auf z0; ein skalierter Zylinder
    traegt seine Rundung nicht in die Ecken."""
    n = len(pts)
    v = [(p[0], p[1], z0) for p in pts] + [(p[0], p[1], z0+h) for p in pts]
    f = [tuple(range(n-1, -1, -1)), tuple(range(n, 2*n))]
    for i in range(n):
        j = (i+1) % n
        f.append((i, j, j+n, i+n))
    return _mesh_aus(v, f, m, name)

# ---------------------------------------------------------------- Grundrisse + Baender
def oval_pts(A, B, n=44, cy=0.0):
    return [(A*math.cos(i/n*math.tau), cy + B*math.sin(i/n*math.tau)) for i in range(n)]

def halbrund_pts(A, B, y_flach, n=26):
    """Halbrund: gerade Kante auf y=y_flach (Bedienseite, +y),
    Bogen nach -y bis y_flach-B. Punkte laufen von (A,y_flach) ueber den
    Bogen nach (-A,y_flach), die Sehne schliesst das Polygon."""
    return [(A*math.cos(i/(n-1)*math.pi), y_flach - B*math.sin(i/(n-1)*math.pi))
            for i in range(n)]

def bogen_pts(cx, cy, R, a0, a1, n=18):
    return [(cx + R*math.cos(a0 + (a1-a0)*i/(n-1)),
             cy + R*math.sin(a0 + (a1-a0)*i/(n-1))) for i in range(n)]

def band(pts, z, breite, hoehe, m, geschlossen=True, ueber=1.10):
    """Legt ein Profil (Breite x Hoehe) als Kette gedrehter Boxen auf einen
    Polygonzug. Die Ausrichtung kommt aus der SEHNE — damit stimmt die Tangente
    auch auf Ellipsen (die Kreisformel a+pi/2 klafft dort auf)."""
    n = len(pts); rng = range(n) if geschlossen else range(n-1)
    out = []
    for i in rng:
        a = pts[i]; b = pts[(i+1) % n]
        dx, dy = b[0]-a[0], b[1]-a[1]
        L = math.hypot(dx, dy)
        if L < 1e-6: continue
        o = box((a[0]+b[0])/2, (a[1]+b[1])/2, z, L*ueber, breite, hoehe, m)
        o.rotation_euler[2] = math.atan2(dy, dx)
        out.append(o)
    return out

def strebe(x0, y0, z0, x1, y1, z1, r, m, seg=8):
    """Zylinder zwischen zwei Punkten (Kordeln, Ketten, Streben)."""
    dx, dy, dz = x1-x0, y1-y0, z1-z0
    L = math.sqrt(dx*dx + dy*dy + dz*dz)
    if L < 1e-6: return None
    theta = math.acos(max(-1.0, min(1.0, dz/L)))
    phi = math.atan2(dy, dx)
    return zyl((x0+x1)/2, (y0+y1)/2, (z0+z1)/2, r, L, m, seg,
               rot=(0, theta, phi))

def runden(width=0.012, segments=2, winkel=42):
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

def export(name, bevel=0.012, seg=2):
    runden(bevel, seg)
    for o in bpy.context.scene.objects: o.select_set(True)
    p1 = os.path.join(OUT_GLB, name + ".glb")
    # export_apply=True ist PFLICHT — sonst landet der Bevel NICHT im GLB.
    bpy.ops.export_scene.gltf(filepath=p1, export_format='GLB', use_selection=False, export_apply=True)
    p2 = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p2)
    except Exception: bpy.ops.export_mesh.stl(filepath=p2)
    print("  ->", name, os.path.getsize(p1), "B")

# ================================================================ Bausteine
def _barhocker(cx, cy, ang, H, CHR, POL, lehne=True):
    """Barhocker, Sitzoberkante = H. Lehne lokal auf -y -> sitzende Figur schaut +y."""
    g = []
    g.append(zyl(0, 0, 0.020, 0.205, 0.040, CHR, 20))            # Bodenteller
    g.append(zyl(0, 0, (0.040 + H-0.10)/2, 0.048, H-0.14, CHR, 14))
    g.append(torus(0, 0, min(0.24, H*0.34), 0.185, 0.018, CHR, 20, 6))   # Fussring
    g.append(zyl(0, 0, H-0.115, 0.215, 0.030, CHR, 22))          # Sitzteller
    g.append(zyl(0, 0, H-0.050, 0.205, 0.100, POL, 22))          # Polster, OK = H
    if lehne:
        for sx in (-0.125, 0.125):
            g.append(box(sx, -0.175, H+0.075, 0.038, 0.038, 0.250, CHR))
        g.append(box(0, -0.185, H+0.215, 0.330, 0.065, 0.230, POL))
        g.append(box(0, -0.185, H+0.345, 0.360, 0.085, 0.040, CHR))
    return gruppe(g, cx, cy, ang)

def _casinostuhl(cx, cy, ang, HOL, POL, GLD):
    """Gepolsterter Casino-Stuhl, Sitz 0,46, Lehne lokal auf -y."""
    g = []
    for sx in (-0.195, 0.195):
        for sy in (-0.195, 0.195):
            g.append(box(sx, sy, 0.180, 0.048, 0.048, 0.360, HOL))   # Beine 0..0.36
    for sy in (-0.200, 0.200):
        g.append(box(0, sy, 0.150, 0.400, 0.034, 0.034, HOL))
    for sx in (-0.200, 0.200):
        g.append(box(sx, 0, 0.150, 0.034, 0.400, 0.034, HOL))
    g.append(box(0, 0, 0.382, 0.500, 0.500, 0.044, HOL))             # Sitzrahmen 0.36..0.404
    g.append(box(0, 0, 0.432, 0.470, 0.470, 0.056, POL))             # Polster OK 0.46
    for sx in (-0.205, 0.205):
        g.append(box(sx, -0.215, 0.660, 0.050, 0.050, 0.560, HOL))   # Lehnenpfosten
    g.append(box(0, -0.222, 0.740, 0.420, 0.060, 0.300, POL))        # Lehnenpolster
    g.append(box(0, -0.222, 0.918, 0.470, 0.080, 0.056, GLD))        # Abschlussleiste
    return gruppe(g, cx, cy, ang)

def _automat_mats():
    return dict(
        SCH=mat("AutSchwarz", (0.09,0.09,0.11), 0.50),
        KOR=mat("AutKorpus",  (0.32,0.07,0.14), 0.45),
        CHR=mat("AutChrom",   (0.82,0.84,0.88), 0.22, 0.70),
        GLD=mat("AutGold",    (0.82,0.64,0.22), 0.30, 0.60),
        SCR=mat("AutScreen",  (0.12,0.30,0.58), 0.15, 0.0, (0.22,0.58,0.98), 2.0),
        WAL=mat("AutWalze",   (0.96,0.92,0.74), 0.25, 0.0, (1.00,0.94,0.66), 1.8),
        TOP=mat("AutTopper",  (0.86,0.14,0.46), 0.25, 0.0, (1.00,0.18,0.58), 2.2),
        SEI=mat("AutSeite",   (0.20,0.55,0.90), 0.25, 0.0, (0.25,0.70,1.00), 1.9),
        KNP=mat("AutTaste",   (0.96,0.78,0.12), 0.30, 0.0, (1.00,0.78,0.12), 1.6),
        KN2=mat("AutTaste2",  (0.90,0.20,0.16), 0.30, 0.0, (1.00,0.22,0.16), 1.6),
        S1 =mat("AutSym1",    (0.85,0.14,0.14), 0.30, 0.0, (1.00,0.20,0.18), 1.5),
        S2 =mat("AutSym2",    (0.95,0.80,0.20), 0.30, 0.0, (1.00,0.84,0.22), 1.5),
        S3 =mat("AutSym3",    (0.20,0.72,0.42), 0.30, 0.0, (0.24,0.90,0.50), 1.5),
        POL=mat("AutPolster", (0.55,0.08,0.15), 0.85),
    )

def _automat(cx, cy, ang, M, hebel=True):
    """Ein Spielautomat, Bedienseite lokal +y. Aufbau:
       Sockel 0..0.12 | Korpus 0.12..0.78 | Tastendeck 0.78..0.83 (steht 0.19 vor
       dem Korpus, sonst verschwinden die Tasten hinter dem Oberschrank) |
       Oberschrank 0.83..1.55 | Topper 1.55..1.875."""
    g = []
    g.append(box(0, 0, 0.060, 0.720, 0.620, 0.120, M['SCH']))          # Sockel
    g.append(box(0, 0, 0.450, 0.680, 0.580, 0.660, M['KOR']))          # Korpus 0.12..0.78
    g.append(box(0, 0.302, 0.330, 0.480, 0.060, 0.100, M['CHR']))      # Ablageschale
    g.append(box(0, 0.302, 0.190, 0.560, 0.055, 0.070, M['GLD']))      # Zierleiste
    g.append(box(0, 0.385, 0.700, 0.660, 0.200, 0.170, M['KOR']))      # Schuerze unter dem Deck
    g.append(box(0, 0.300, 0.805, 0.680, 0.360, 0.050, M['CHR']))      # Tastendeck 0.78..0.83
    g.append(box(0, 0.470, 0.815, 0.700, 0.060, 0.090, M['GLD']))      # Deckkante 0.77..0.86
    for sx in (-0.21, -0.07, 0.07, 0.21):
        g.append(zyl(sx, 0.400, 0.842, 0.036, 0.026, M['KNP'], 12))    # Tasten
    g.append(zyl(0, 0.255, 0.844, 0.055, 0.030, M['KN2'], 14))         # Starttaste
    g.append(box(0, -0.020, 1.190, 0.680, 0.500, 0.720, M['KOR']))     # Oberschrank 0.83..1.55
    for sx in (-0.336, 0.336):                                         # Leuchtleisten seitlich
        g.append(box(sx, -0.020, 1.190, 0.030, 0.460, 0.660, M['SEI']))
    g.append(box(0, 0.248, 1.060, 0.580, 0.048, 0.360, M['WAL']))      # Walzenfenster 0.88..1.24
    for sx in (-0.098, 0.098):
        g.append(box(sx, 0.258, 1.060, 0.022, 0.040, 0.360, M['CHR'])) # Walzenstege
    for sx, sm in ((-0.196, M['S1']), (0.0, M['S2']), (0.196, M['S3'])):
        g.append(zyl(sx, 0.276, 1.060, 0.072, 0.014, sm, 14, rot=(math.pi/2, 0, 0)))
    g.append(box(0, 0.252, 0.868, 0.640, 0.060, 0.036, M['GLD']))      # Rahmen unten
    g.append(box(0, 0.252, 1.256, 0.640, 0.060, 0.036, M['GLD']))      # Rahmen oben
    g.append(box(0, 0.248, 1.400, 0.580, 0.044, 0.260, M['SCR']))      # Bildschirm 1.27..1.53
    g.append(box(0, 0.020, 1.545, 0.780, 0.400, 0.040, M['GLD']))      # Topper-Sockelrahmen
    g.append(box(0, 0.020, 1.700, 0.740, 0.360, 0.300, M['TOP']))      # Topper 1.55..1.85
    g.append(box(0, 0.020, 1.855, 0.780, 0.400, 0.040, M['GLD']))      # Topper-Kranz -> 1.875
    for sx in (-0.24, 0.0, 0.24):
        g.append(kugel(sx, 0.205, 1.700, 0.052, M['KNP'], 12))         # Zierlampen
    if hebel:
        g.append(zyl(0.355, 0.060, 0.950, 0.055, 0.070, M['CHR'], 14, rot=(0, math.pi/2, 0)))
        w = 0.40
        r = zyl(0.385 + math.sin(w)*0.180, 0.060, 0.950 + math.cos(w)*0.180,
                0.022, 0.360, M['CHR'], 10)
        r.rotation_euler = (0, w, 0)
        g.append(r)
        g.append(kugel(0.385 + math.sin(w)*0.360, 0.060, 0.950 + math.cos(w)*0.360,
                       0.055, M['KN2'], 14))
    return gruppe(g, cx, cy, ang)

# ================================================================ 1) Spielautomat
def spielautomat():
    """Einarmiger Bandit 0,78 breit, Walzenfenster + Bildschirm emissiv,
    Hebel rechts, Hocker (Sitz 0,64) daneben. Bedienseite +y (three.js -z)."""
    neu()
    M = _automat_mats()
    _automat(0, 0, 0, M, hebel=True)
    _barhocker(1.02, 0.16, math.pi/2, 0.64, M['CHR'], M['POL'], lehne=True)
    export("th14_spielautomat", 0.010, 2)

# ================================================================ 2) Automatenreihe
def automatenreihe():
    """4 Automaten Ruecken an Ruecken auf einer gemeinsamen Ruecken-Wand, in den
    Fugen Leucht-Pilaster, darueber ein Fries, der auf den Toppern AUFLIEGT.
    MODULAR: Raster x += 1.60 (Ruecken-Wand, Fries und Kranz sind exakt 1.60 m
    breit, die Rand-Pilaster ergaenzen sich zum Mittel-Pilaster).
    Ohne Hebel — der wuerde ueber das Raster hinausragen."""
    neu()
    M = _automat_mats()
    RUE = mat("ReiheRuecken", (0.12,0.10,0.14), 0.60)
    FRI = mat("ReiheFries",   (0.85,0.20,0.55), 0.25, 0.0, (1.00,0.24,0.62), 2.2)
    BND = mat("ReiheBand",    (0.20,0.80,0.85), 0.25, 0.0, (0.24,0.95,1.00), 2.4)
    PIL = mat("ReihePilaster",(0.55,0.20,0.75), 0.25, 0.0, (0.62,0.22,0.95), 2.0)
    GLD = mat("ReiheGold",    (0.82,0.64,0.22), 0.30, 0.60)
    box(0, 0, 0.9375, 1.600, 0.100, 1.875, RUE)             # Ruecken-Wand 0..1.875
    for sx in (-0.40, 0.40):
        _automat(sx,  0.34, 0.0,     M, hebel=False)
        _automat(sx, -0.34, math.pi, M, hebel=False)
    for sy in (0.220, -0.220):                              # Leucht-Pilaster in der Mittelfuge,
        box(0.0, sy, 0.775, 0.120, 0.540, 1.520, PIL)       # unter den Toppern endend
    # Seitenwangen schliessen den Block ab. Ein schmaler Pilaster am Rand taugt
    # nicht: seine 1.0 m tiefe Flanke steht frei und wirkt als leuchtende Platte.
    # Wangen und ihre Zierteile enden EXAKT auf x = +-0.800, sonst zerfaellt das
    # 1.60-Raster (die erste Fassung war 1.612 breit und liess beim Aneinander-
    # setzen eine Fuge).
    for sx in (-0.775, 0.775):
        box(sx, 0, 0.9375, 0.050, 1.660, 1.875, RUE)
        box(sx*0.992, 0, 1.845, 0.062, 1.700, 0.060, GLD)   # Abschlussprofil der Wange
        for sy in (-0.480, 0.0, 0.480):                     # schmale Lichtfugen aussen;
            box(sx*1.023, sy, 0.900, 0.012, 0.110, 1.400, PIL)   # als Vollflaeche wirkte
                                                            # die Wange wie eine Leuchttafel
    box(0, 0, 2.005, 1.600, 1.400, 0.260, FRI)              # Fries liegt auf 1.875 auf
    for sy in (-0.715, 0.715):
        box(0, sy, 2.005, 1.600, 0.030, 0.150, BND)         # Leuchtband beidseitig
    box(0, 0, 2.150, 1.600, 1.460, 0.030, GLD)              # Kranz -> 2.165
    export("th14_automatenreihe", 0.010, 2)

# ================================================================ 3) Roulettetisch
def roulettetisch():
    """Ovaler Tisch 2,60 x 1,50, Filz mit Zahlenraster, Kessel links,
    gepolsterter Chip-Rand, Leuchtband an der Zarge. Platte OK 0,78."""
    neu()
    HOL  = mat("RlHolz",     (0.26,0.13,0.08), 0.45)
    HOL2 = mat("RlHolzHell", (0.45,0.25,0.13), 0.42)
    FIL  = mat("RlFilz",     (0.06,0.31,0.17), 0.93)
    LIN  = mat("RlLinie",    (0.93,0.93,0.88), 0.70)
    ROT  = mat("RlRot",      (0.64,0.09,0.10), 0.62)
    SWZ  = mat("RlSchwarz",  (0.08,0.08,0.09), 0.62)
    GRN  = mat("RlGruen",    (0.09,0.46,0.22), 0.62)
    CHR  = mat("RlChrom",    (0.82,0.84,0.88), 0.22, 0.70)
    GLD  = mat("RlGold",     (0.82,0.64,0.22), 0.30, 0.60)
    LED  = mat("RlLed",      (0.85,0.25,0.70), 0.25, 0.0, (1.00,0.25,0.80), 2.2)
    CHIP = [mat("RlChip1", (0.86,0.16,0.16), 0.6), mat("RlChip2", (0.15,0.35,0.78), 0.6),
            mat("RlChip3", (0.95,0.85,0.30), 0.6), mat("RlChip4", (0.20,0.62,0.32), 0.6),
            mat("RlChip5", (0.93,0.93,0.90), 0.6)]
    A, B = 1.30, 0.75
    for sx in (-0.72, 0.72):                                   # Gestell
        box(sx, 0, 0.050, 0.900, 0.620, 0.100, HOL)            # Fuss 0..0.10
        zyl(sx, 0, 0.400, 0.115, 0.640, HOL2, 18)              # Saeule 0.08..0.72
    box(0, 0, 0.360, 1.220, 0.170, 0.130, HOL2)                # Traverse
    prisma_z(oval_pts(A, B, 44), 0.680, 0.100, HOL, "RlPlatte")            # 0.68..0.78
    band(oval_pts(A+0.004, B+0.004, 44), 0.702, 0.038, 0.042, LED)         # Leuchtband
    prisma_z(oval_pts(A-0.170, B-0.170, 44), 0.775, 0.016, FIL, "RlFilz")  # 0.775..0.791
    band(oval_pts(A-0.075, B-0.075, 44), 0.845, 0.170, 0.130, HOL2)        # Chip-Rand 0.78..0.91
    band(oval_pts(A-0.075, B-0.075, 44), 0.915, 0.140, 0.014, GLD)         # Zierkante
    # Filz-Layout auf der rechten Haelfte. Raster x -0.20..0.90, y +-0.34 —
    # jede Ecke liegt nachgerechnet INNERHALB der Filz-Ellipse (1.13 x 0.58),
    # sonst ragen Linien und Felder ueber den Rand hinaus.
    sp = 1.100/12.0
    for i in range(13):
        box(-0.200 + i*sp, 0.0, 0.797, 0.012, 0.680, 0.012, LIN)
    for sy in (-0.340, -0.1133, 0.1133, 0.340):
        box(0.350, sy, 0.797, 1.100, 0.012, 0.012, LIN)
    for i in range(12):
        for k, sy in enumerate((-0.2267, 0.0, 0.2267)):
            f = [ROT, SWZ][(i + k) % 2]
            box(-0.200 + (i + 0.5)*sp, sy, 0.795, 0.082, 0.208, 0.008, f)
    # Kessel
    KX = -0.78
    zyl(KX, 0, 0.820, 0.450, 0.170, HOL2, 32)                  # Kesselkoerper 0.735..0.905
    zyl(KX, 0, 0.912, 0.400, 0.024, HOL, 32)                   # Ballspur
    for k in range(24):
        a = k/24*math.tau
        f = GRN if k == 0 else [ROT, SWZ][k % 2]
        o = box(KX + math.cos(a)*0.310, math.sin(a)*0.310, 0.920, 0.096, 0.080, 0.016, f)
        o.rotation_euler[2] = a
    zyl(KX, 0, 0.930, 0.235, 0.030, HOL, 28)                   # Rotor 0.915..0.945
    kegel(KX, 0, 1.000, 0.085, 0.022, 0.120, GLD, 16)          # Turm 0.94..1.06
    for k in range(4):
        o = box(KX, 0, 0.992, 0.310, 0.030, 0.024, GLD)
        o.rotation_euler[2] = k*math.pi/4
    kugel(KX, 0, 1.078, 0.046, GLD, 14)                        # Knauf -> 1.124
    # Chiptray des Croupiers (Bedienseite +y)
    box(-0.050, 0.450, 0.808, 0.520, 0.170, 0.038, CHR)
    for k in range(5):
        for j in range(4):
            zyl(-0.250 + k*0.100, 0.450, 0.834 + j*0.014, 0.038, 0.013, CHIP[k], 14)
    export("th14_roulettetisch", 0.010, 2)

# ================================================================ 4) Kartentisch
def kartentisch():
    """Halbrunder Blackjack-Tisch: gerade Dealer-Kante auf +y, Bogen mit
    5 Spielplaetzen auf -y, 5 Hocker (Sitz 0,55). Platte OK 0,80."""
    neu()
    HOL = mat("BjHolz",   (0.27,0.14,0.08), 0.45)
    HOL2= mat("BjHolzHell",(0.46,0.26,0.14), 0.42)
    FIL = mat("BjFilz",   (0.09,0.22,0.46), 0.93)
    LIN = mat("BjLinie",  (0.94,0.90,0.60), 0.70)
    CHR = mat("BjChrom",  (0.82,0.84,0.88), 0.22, 0.70)
    GLD = mat("BjGold",   (0.82,0.64,0.22), 0.30, 0.60)
    LED = mat("BjLed",    (0.20,0.75,0.85), 0.25, 0.0, (0.22,0.90,1.00), 2.2)
    POL = mat("BjPolster",(0.52,0.09,0.16), 0.88)
    SWZ = mat("BjDunkel", (0.10,0.10,0.12), 0.55)
    CHIP= [mat("BjChip1",(0.87,0.17,0.17),0.6), mat("BjChip2",(0.16,0.36,0.78),0.6),
           mat("BjChip3",(0.95,0.86,0.32),0.6), mat("BjChip4",(0.94,0.94,0.92),0.6)]
    A, B, YF = 1.20, 0.92, 0.46
    aussen = halbrund_pts(A, B, YF, 30)
    innen  = halbrund_pts(A-0.150, 0.700, 0.340, 30)
    for sx, sy in ((-0.86, 0.22), (0.86, 0.22), (-0.44, -0.34), (0.44, -0.34)):
        box(sx, sy, 0.045, 0.240, 0.240, 0.090, HOL)          # Fussteller 0..0.09
        zyl(sx, sy, 0.400, 0.075, 0.640, HOL2, 14)            # Bein 0.08..0.72
    box(0, 0.10, 0.360, 1.760, 0.120, 0.110, HOL2)            # Traverse
    prisma_z(aussen, 0.700, 0.100, HOL, "BjPlatte")           # 0.70..0.80
    # Leuchtband: Bogen OFFEN abfahren und die gerade Kante separat setzen.
    # Mit geschlossen=True wuerde die Schliess-Sehne als EINE 2.40-m-Box quer
    # durch das Modell laufen (und mit `ueber` sogar darueber hinausragen).
    band(aussen, 0.722, 0.042, 0.046, LED, geschlossen=False)
    box(0, YF, 0.722, 2*A, 0.042, 0.046, LED)
    prisma_z(innen, 0.795, 0.016, FIL, "BjFilz")              # 0.795..0.811
    # Chip-Rand nur auf dem Spielerbogen. Mittellinie um die halbe Randbreite
    # nach innen (sonst haengt der Rand am Bogenscheitel ueber die Platte).
    rand = halbrund_pts(A-0.083, B-0.166, YF-0.083, 30)
    band(rand, 0.865, 0.165, 0.130, HOL2, geschlossen=False)  # 0.80..0.93
    band(rand, 0.935, 0.135, 0.014, GLD, geschlossen=False)
    # 5 Spielfelder + Bogenlinie
    for i in range(5):
        t = math.pi*(i + 0.5)/5
        px, py = 0.840*math.cos(t), 0.300 - 0.470*math.sin(t)
        zyl(px, py, 0.816, 0.098, 0.008, LIN, 20)
        zyl(px, py, 0.819, 0.078, 0.008, FIL, 20)
    for i in range(19):
        t = math.pi*(0.06 + 0.88*i/18)
        px, py = 0.985*math.cos(t), 0.320 - 0.560*math.sin(t)
        o = box(px, py, 0.815, 0.090, 0.012, 0.008, LIN)
        o.rotation_euler[2] = math.atan2(-0.560*math.cos(t), -0.985*math.sin(t))
    # Dealer-Seite: Chiptray + Kartenschlitten
    box(0, 0.372, 0.828, 0.560, 0.150, 0.040, CHR)
    for k in range(4):
        for j in range(4):
            zyl(-0.195 + k*0.130, 0.372, 0.855 + j*0.014, 0.040, 0.013, CHIP[k], 14)
    s = box(0.520, 0.352, 0.858, 0.180, 0.240, 0.110, SWZ)    # Kartenschlitten
    s.rotation_euler[0] = -0.22
    box(-0.520, 0.352, 0.833, 0.230, 0.170, 0.050, SWZ)       # Ablage
    for i in range(5):                                        # Hocker am Bogen
        t = 0.30 + (math.pi - 0.60)*i/4
        px, py = 1.380*math.cos(t), 0.400 - 1.000*math.sin(t)
        _barhocker(px, py, math.atan2(-py, -px) - math.pi/2, 0.55, CHR, POL, lehne=True)
    export("th14_kartentisch", 0.010, 2)

# ================================================================ 5) Pokertisch
def pokertisch():
    """Ovaler Pokertisch 2,70 x 1,60 mit 8 Plaetzen (Getraenkehalter,
    Chip-Feld) und 8 Stuehlen. Platte OK 0,78, Rand OK 0,90."""
    neu()
    HOL = mat("PkHolz",   (0.25,0.13,0.08), 0.45)
    HOL2= mat("PkHolzHell",(0.44,0.25,0.13), 0.42)
    FIL = mat("PkFilz",   (0.10,0.28,0.20), 0.93)
    LED = mat("PkLed",    (0.85,0.55,0.15), 0.25, 0.0, (1.00,0.62,0.16), 2.2)
    EMB = mat("PkEmblem", (0.90,0.80,0.35), 0.30, 0.0, (1.00,0.86,0.40), 1.6)
    CHR = mat("PkChrom",  (0.82,0.84,0.88), 0.22, 0.70)
    GLD = mat("PkGold",   (0.82,0.64,0.22), 0.30, 0.60)
    POL = mat("PkPolster",(0.16,0.24,0.42), 0.88)
    SWZ = mat("PkDunkel", (0.10,0.10,0.12), 0.55)
    CHIP= [mat("PkChip1",(0.87,0.17,0.17),0.6), mat("PkChip2",(0.16,0.36,0.78),0.6),
           mat("PkChip3",(0.95,0.86,0.32),0.6), mat("PkChip4",(0.94,0.94,0.92),0.6)]
    A, B = 1.35, 0.80
    for sx in (-0.72, 0.72):
        box(sx, 0, 0.050, 0.860, 0.640, 0.100, HOL)
        zyl(sx, 0, 0.400, 0.120, 0.640, HOL2, 18)
    box(0, 0, 0.360, 1.220, 0.180, 0.130, HOL2)
    prisma_z(oval_pts(A, B, 44), 0.680, 0.100, HOL, "PkPlatte")            # 0.68..0.78
    band(oval_pts(A+0.006, B+0.006, 44), 0.716, 0.050, 0.050, LED)
    prisma_z(oval_pts(A-0.190, B-0.190, 44), 0.775, 0.016, FIL, "PkFilz")
    band(oval_pts(A-0.085, B-0.085, 44), 0.845, 0.185, 0.130, HOL2)        # Rand 0.78..0.91
    band(oval_pts(A-0.085, B-0.085, 44), 0.915, 0.150, 0.014, GLD)
    # Emblem in der Mitte (Deko, keine Schrift). Ring als `band`, nicht als
    # zwei Scheiben — die obere Scheibe deckte sonst die Strahlen zu.
    band(oval_pts(0.300, 0.300, 26), 0.797, 0.048, 0.012, EMB)
    for k in range(8):
        a = k/8*math.tau
        o = box(math.cos(a)*0.395, math.sin(a)*0.395, 0.797, 0.150, 0.036, 0.012, EMB)
        o.rotation_euler[2] = a
    for k in range(8):                                    # 8 Plaetze
        t = (k + 0.5)/8*math.tau
        rx, ry = (A-0.085)*math.cos(t), (B-0.085)*math.sin(t)
        zyl(rx, ry, 0.900, 0.052, 0.070, CHR, 16)         # Getraenkehalter im Rand
        zyl(rx, ry, 0.902, 0.040, 0.070, SWZ, 16)
        fx, fy = (A-0.330)*math.cos(t), (B-0.330)*math.sin(t)
        o = box(fx, fy, 0.795, 0.230, 0.130, 0.008, LED)  # Chip-Feld
        o.rotation_euler[2] = math.atan2(-fx, fy)
        for j in range(3):
            zyl(fx, fy, 0.807 + j*0.014, 0.036, 0.013, CHIP[k % 4], 14)
    for k in range(8):                                    # 8 Stuehle
        t = (k + 0.5)/8*math.tau
        px, py = 1.760*math.cos(t), 1.240*math.sin(t)
        _casinostuhl(px, py, math.atan2(-py, -px) - math.pi/2, HOL2, POL, GLD)
    export("th14_pokertisch", 0.010, 2)

# ================================================================ 6) Casinobar
def casinobar():
    """Geschwungener Bartresen (OK 1,10) mit Fussreling und Leuchtblende,
    dahinter das hinterleuchtete Flaschenregal (bis 2,45), davor 5 Barhocker
    (Sitz 0,75). Gastseite = +y."""
    neu()
    HOL = mat("BarHolz",   (0.24,0.13,0.09), 0.50)
    PLA = mat("BarPlatte", (0.16,0.16,0.19), 0.30)
    GLD = mat("BarGold",   (0.82,0.64,0.22), 0.30, 0.60)
    CHR = mat("BarChrom",  (0.82,0.84,0.88), 0.22, 0.70)
    SWZ = mat("BarDunkel", (0.11,0.11,0.13), 0.55)
    POL = mat("BarPolster",(0.50,0.10,0.16), 0.88)
    LED = mat("BarLed",    (0.85,0.20,0.55), 0.25, 0.0, (1.00,0.22,0.62), 2.4)
    RUE = mat("BarRueck",  (0.25,0.70,0.90), 0.25, 0.0, (0.30,0.85,1.00), 2.6)
    GLS = mat("BarGlas",   (0.62,0.76,0.84), 0.12, 0.20)
    FL1 = mat("BarFlasche1",(0.20,0.42,0.22), 0.25, 0.10)
    FL2 = mat("BarFlasche2",(0.48,0.26,0.10), 0.25, 0.10)
    FL3 = mat("BarFlasche3",(0.72,0.74,0.78), 0.20, 0.15)
    CY, R = -2.60, 3.40
    a0, a1 = math.radians(52), math.radians(128)
    N = 20
    # Tresenkoerper: Vorderblende auf R (Aussenflaeche 3.455), Innenblende auf
    # R-0.56 (2.80). Die Platte muss GENAU diese Spanne abdecken (Mitte 3.135,
    # Breite 0.69) — mit R-0.06 stand sie 0.20 m ueber die Blende vor.
    p_front = bogen_pts(0, CY, R,        a0, a1, N)
    p_licht = bogen_pts(0, CY, R+0.045,  a0, a1, N)
    p_platt = bogen_pts(0, CY, R-0.265,  a0, a1, N)
    p_sockl = bogen_pts(0, CY, R-0.050,  a0, a1, N)
    p_reling= bogen_pts(0, CY, R+0.120,  a0, a1, N)
    p_innen = bogen_pts(0, CY, R-0.560,  a0, a1, N)
    band(p_sockl,  0.070, 0.130, 0.140, SWZ, False)          # Sockel 0..0.14
    band(p_front,  0.610, 0.110, 0.940, HOL, False)          # Blende 0.14..1.08
    band(p_front,  0.180, 0.130, 0.060, GLD, False)          # Zierprofil
    band(p_licht,  1.005, 0.045, 0.080, LED, False)          # Leuchtband unter der Platte
    band(p_platt,  1.070, 0.690, 0.060, PLA, False)          # Tresenplatte OK 1.10
    band(p_innen,  0.480, 0.080, 0.960, SWZ, False)          # Innenblende
    band(bogen_pts(0, CY, R-0.400, a0, a1, N), 0.925, 0.360, 0.050, PLA, False)  # Arbeitsplatte
    band(p_reling, 0.210, 0.070, 0.070, CHR, False)          # Fussreling
    for a in (a0, a1):                                       # Stirnseiten
        px, py = R*math.cos(a), CY + R*math.sin(a)
        o = box(px - 0.325*math.cos(a), py - 0.325*math.sin(a), 0.610, 0.080, 0.690, 0.940, HOL)
        o.rotation_euler[2] = a + math.pi/2
    # Rueckbuffet: gleicher Mittelpunkt, aber WEITERER Winkelbereich — sonst
    # wirkt es neben dem 4.2-m-Tresen wie ein verlorenes Moebel.
    RB = 1.70
    b0, b1 = math.radians(40), math.radians(140)
    p_rb  = bogen_pts(0, CY, RB,        b0, b1, 18)
    p_rbw = bogen_pts(0, CY, RB-0.150,  b0, b1, 18)
    band(p_rb,  0.475, 0.460, 0.950, SWZ, False)             # Unterschrank 0..0.95
    band(p_rb,  0.990, 0.520, 0.080, PLA, False)             # Abstellplatte
    band(p_rbw, 1.680, 0.060, 1.320, RUE, False)             # hinterleuchtete Rueckwand 1.02..2.34
    for zs in (1.180, 1.500, 1.820, 2.140):
        band(p_rb, zs, 0.320, 0.035, GLS, False)             # Glasboeden
    p_fl = bogen_pts(0, CY, RB-0.020, b0, b1, 16)
    for zs, fm in ((1.198, FL1), (1.518, FL2), (1.838, FL3), (2.158, FL1)):
        for i, p in enumerate(p_fl):
            # Flaschen 0.26 hoch — bei 0.32 Fachhoehe steckte der Hals im Boden darueber
            if i % 2 == 0:
                zyl(p[0], p[1], zs + 0.110, 0.036, 0.200, [FL1, FL2, FL3][i % 3], 10)
                zyl(p[0], p[1], zs + 0.235, 0.014, 0.060, [FL1, FL2, FL3][i % 3], 8)
            else:
                zyl(p[0], p[1], zs + 0.095, 0.042, 0.170, fm, 10)
    band(bogen_pts(0, CY, RB, b0, b1, 18), 2.395, 0.560, 0.110, SWZ, False)   # Kranz 2.34..2.45
    band(bogen_pts(0, CY, RB+0.290, b0, b1, 18), 2.360, 0.050, 0.090, LED, False)
    for i in range(5):                                       # 5 Barhocker
        a = math.radians(58 + 16*i)
        px, py = 3.900*math.cos(a), CY + 3.900*math.sin(a)
        _barhocker(px, py, a - math.pi/2, 0.75, CHR, POL, lehne=True)
    export("th14_casinobar", 0.012, 2)

# ================================================================ 7) Neonschild
def neonschild_gross():
    """Freistehendes Leuchtschild: Tafel 5,00 x 3,00 m (z 4,00..7,00) auf
    zwei Masten, Glueh-Rand aus 54 Lampen, Neon-Motiv, Krone bis 7,85 m.
    Schauseite +y (three.js -z)."""
    neu()
    BET = mat("NsBeton",  (0.52,0.51,0.48), 0.90)
    STA = mat("NsStahl",  (0.34,0.36,0.40), 0.40, 0.55)
    RAH = mat("NsRahmen", (0.82,0.64,0.22), 0.30, 0.60)
    TAF = mat("NsTafel",  (0.10,0.08,0.14), 0.55)
    PAN = mat("NsPanel",  (0.55,0.12,0.42), 0.25, 0.0, (0.95,0.15,0.55), 2.4)
    NE1 = mat("NsNeon1",  (0.25,0.85,0.95), 0.20, 0.0, (0.30,0.95,1.00), 3.0)
    NE2 = mat("NsNeon2",  (0.98,0.85,0.25), 0.20, 0.0, (1.00,0.88,0.25), 3.0)
    NE3 = mat("NsNeon3",  (0.95,0.30,0.25), 0.20, 0.0, (1.00,0.32,0.26), 3.0)
    BIR = mat("NsBirne",  (1.00,0.95,0.75), 0.25, 0.0, (1.00,0.94,0.70), 2.6)
    box(0, 0, 0.100, 2.400, 1.300, 0.200, BET)                  # Fundament 0..0.20
    box(0, 0, 0.250, 2.000, 1.000, 0.120, STA)
    for sx in (-0.80, 0.80):
        box(sx, 0, 2.200, 0.320, 0.320, 3.900, STA)             # Maste 0.25..4.15
        box(sx, 0, 4.070, 0.480, 0.480, 0.160, RAH)
    for sx in (-0.80, 0.80):
        for sy in (-0.42, 0.42):
            s = box(sx, sy*0.60, 0.900, 0.140, 0.140, 1.500, STA)   # Streben
            s.rotation_euler[0] = math.copysign(0.42, sy)
    box(0, 0, 1.600, 1.600, 0.180, 0.180, STA)                  # Querriegel
    # Tafel
    box(0, -0.060, 5.500, 5.000, 0.220, 3.000, TAF)             # Rueckkoerper 4.00..7.00
    box(0,  0.100, 5.500, 4.560, 0.100, 2.560, PAN)             # Leuchtflaeche
    for zs in (4.110, 6.890):
        box(0, 0.070, zs, 5.000, 0.240, 0.220, RAH)
    for sx in (-2.390, 2.390):
        box(sx, 0.070, 5.500, 0.220, 0.240, 3.000, RAH)
    # Neon-Motiv: Raute + Strahlenkranz + zwei Querroehren
    # Rautenkontur: rotation_euler[1]=b legt die lokale x-Achse auf (cos b, -sin b)
    # in der (x,z)-Ebene. Fuer die Kante im Quadranten +x/+z ist das +pi/4;
    # mit vertauschtem Vorzeichen kreuzen sich die vier Stege zu einem X.
    for k in range(4):
        a = k*math.pi/2 + math.pi/4
        o = box(math.cos(a)*0.780, 0.185, 5.500 + math.sin(a)*0.780,
                1.560, 0.070, 0.070, NE1)
        o.rotation_euler[1] = math.pi/4 if k % 2 == 0 else -math.pi/4
    for k in range(8):
        a = k/8*math.tau + math.pi/8
        o = box(math.cos(a)*1.28, 0.185, 5.500 + math.sin(a)*1.28, 0.400, 0.060, 0.060, NE2)
        o.rotation_euler[1] = -a
    zyl(0, 0.200, 5.500, 0.260, 0.090, NE3, 24, rot=(math.pi/2, 0, 0))
    zyl(0, 0.215, 5.500, 0.150, 0.090, NE2, 20, rot=(math.pi/2, 0, 0))
    for zs in (4.480, 6.520):
        zyl(0, 0.185, zs, 0.060, 4.200, NE3, 12, rot=(0, math.pi/2, 0))
    # Gluehlampen-Rand
    for i in range(18):
        px = -2.295 + i*(4.590/17)
        for zs in (4.110, 6.890):
            kugel(px, 0.205, zs, 0.072, BIR, 10)
    for j in range(1, 10):
        pz = 4.110 + j*(2.780/10)
        for sx in (-2.390, 2.390):
            kugel(sx, 0.205, pz, 0.072, BIR, 10)
    # Krone
    prisma_y(0.0, [(-1.500, 7.000), (1.500, 7.000), (0.900, 7.480),
                   (0.000, 7.850), (-0.900, 7.480)], 0.240, TAF, "NsKrone")
    prisma_y(0.090, [(-1.260, 7.060), (1.260, 7.060), (0.760, 7.430),
                     (0.000, 7.700), (-0.760, 7.430)], 0.080, NE2, "NsKroneLicht")
    for k in range(7):
        a = math.pi*(0.12 + 0.76*k/6)
        kugel(math.cos(a)*1.420, 0.180, 7.010 + math.sin(a)*0.760, 0.070, BIR, 10)
    export("th14_neonschild_gross", 0.016, 2)

# ================================================================ 8) Discokugel
def discokugel():
    """HAENGENDES Modell. Deckenplatte-Oberkante z = 3,60 (Montagehoehe),
    Kugelunterkante z = 2,26. Also: an eine 3,60-m-Decke schrauben.
    Spiegel: metallic 0.65 statt 1.0 — ohne Environment-Map rendert 1.0 schwarz."""
    neu()
    DKL = mat("DkDunkel", (0.12,0.12,0.14), 0.55)
    MOT = mat("DkMotor",  (0.72,0.74,0.78), 0.30, 0.65)
    ACH = mat("DkAchse",  (0.80,0.82,0.86), 0.22, 0.70)
    KUG = mat("DkKugel",  (0.70,0.76,0.84), 0.14, 0.65)
    SP1 = mat("DkSpiegel1",(0.86,0.90,0.96), 0.10, 0.60)
    SP2 = mat("DkSpiegel2",(0.62,0.78,0.92), 0.10, 0.60)
    GLW = mat("DkGlanz",  (0.95,0.96,1.00), 0.15, 0.0, (0.95,0.97,1.00), 2.2)
    box(0, 0, 3.550, 0.520, 0.520, 0.100, DKL)                 # Deckenplatte 3.50..3.60
    box(0, 0, 3.480, 0.360, 0.360, 0.060, MOT)
    zyl(0, 0, 3.360, 0.135, 0.260, MOT, 20)                    # Motorgehaeuse 3.23..3.49
    for sx in (-0.155, 0.155):
        box(sx, 0, 3.420, 0.040, 0.300, 0.180, DKL)            # Kuehlrippen
    zyl(0, 0, 3.080, 0.026, 0.340, ACH, 10)                    # Achse 2.91..3.25
    torus(0, 0, 2.950, 0.055, 0.014, ACH, 20, 6, rot=(math.pi/2, 0, 0))
    RK, ZC = 0.340, 2.600                                      # Kugel 2.26..2.94
    kugel(0, 0, ZC, RK, KUG, 24)
    for ir in range(7):                                        # Spiegelfacetten
        th = math.pi*(ir + 0.5)/7
        rr = RK*math.sin(th)
        nn = max(4, int(round(14*math.sin(th))))
        for k in range(nn):
            ph = k/nn*math.tau + ir*0.31
            px, py = rr*math.cos(ph), rr*math.sin(ph)
            pz = ZC + RK*math.cos(th)
            m = GLW if (ir + k) % 7 == 0 else ([SP1, SP2][(ir + k) % 2])
            o = box(px*1.02, py*1.02, ZC + (pz-ZC)*1.02, 0.135, 0.135, 0.016, m)
            o.rotation_euler = (0, th, ph)
    export("th14_discokugel", 0.008, 2)

# ================================================================ 9) DJ-Pult
def dj_pult():
    """DJ-Pult 2,30 x 0,80, Arbeitsplatte OK 1,00, 2 Decks + Mixer,
    LED-Front (emissiv) zum Publikum auf +y, 2 Monitorboxen."""
    neu()
    SWZ = mat("DjSchwarz", (0.10,0.10,0.12), 0.55)
    KOR = mat("DjKorpus",  (0.15,0.15,0.18), 0.50)
    PLA = mat("DjPlatte",  (0.20,0.20,0.23), 0.35)
    CHR = mat("DjChrom",   (0.80,0.82,0.86), 0.22, 0.70)
    ALU = mat("DjAlu",     (0.62,0.64,0.68), 0.35, 0.55)
    VIN = mat("DjVinyl",   (0.07,0.07,0.08), 0.60)
    LB1 = mat("DjLed1", (0.90,0.15,0.50), 0.25, 0.0, (1.00,0.18,0.58), 2.6)
    LB2 = mat("DjLed2", (0.20,0.80,0.95), 0.25, 0.0, (0.24,0.90,1.00), 2.6)
    LB3 = mat("DjLed3", (0.95,0.80,0.20), 0.25, 0.0, (1.00,0.84,0.22), 2.6)
    LB4 = mat("DjLed4", (0.45,0.30,0.95), 0.25, 0.0, (0.50,0.34,1.00), 2.6)
    SCR = mat("DjScreen",  (0.15,0.35,0.60), 0.15, 0.0, (0.25,0.62,1.00), 2.2)
    LBL = mat("DjLabel",   (0.95,0.65,0.15), 0.30, 0.0, (1.00,0.68,0.16), 1.4)
    box(0, 0, 0.060, 2.120, 0.680, 0.120, SWZ)                 # Sockel 0..0.12
    box(0, 0, 0.530, 2.200, 0.700, 0.820, KOR)                 # Korpus 0.12..0.94
    box(0, 0.356, 0.530, 2.140, 0.030, 0.780, SWZ)             # Frontblende
    for k, zs in enumerate((0.250, 0.420, 0.590, 0.760)):
        box(0, 0.374, zs, 2.080, 0.030, 0.075, [LB1, LB2, LB3, LB4][k])
    for sx in (-1.075, 1.075):
        box(sx, 0.180, 0.530, 0.035, 0.380, 0.780, [LB2, LB1][0 if sx < 0 else 1])
    box(0, 0, 0.970, 2.300, 0.800, 0.060, PLA)                 # Arbeitsplatte OK 1.00
    box(0, 0.395, 0.970, 2.300, 0.030, 0.075, CHR)             # Kantenprofil
    for sx in (-0.72, 0.72):                                   # 2 Decks
        box(sx, -0.020, 1.026, 0.520, 0.440, 0.052, ALU)       # 1.00..1.052
        zyl(sx, -0.020, 1.068, 0.165, 0.032, CHR, 28)
        zyl(sx, -0.020, 1.090, 0.158, 0.014, VIN, 28)
        zyl(sx, -0.020, 1.099, 0.052, 0.008, LBL, 20)
        zyl(sx + 0.205, -0.180, 1.070, 0.030, 0.040, SWZ, 12)  # Tonarm-Lager
        t = box(sx + 0.140, -0.100, 1.082, 0.200, 0.026, 0.018, ALU)
        t.rotation_euler[2] = 0.85
        box(sx - 0.205, 0.120, 1.062, 0.045, 0.190, 0.020, ALU)   # Pitchfader
        box(sx - 0.205, 0.150, 1.076, 0.035, 0.035, 0.026, LB3)
        for j in range(3):
            zyl(sx + 0.190 + 0.0, 0.090 - j*0.075, 1.062, 0.020, 0.022, LB1, 10)
    box(0, -0.020, 1.030, 0.400, 0.440, 0.060, ALU)            # Mixer 1.00..1.06
    for k in range(4):
        box(-0.135 + k*0.090, 0.090, 1.064, 0.030, 0.190, 0.012, SWZ)
        box(-0.135 + k*0.090, 0.120, 1.078, 0.038, 0.040, 0.030, [LB1, LB2, LB3, LB4][k])
    for r in range(3):
        for c in range(4):
            zyl(-0.135 + c*0.090, -0.180 + r*0.055, 1.070, 0.017, 0.024,
                [CHR, LB2, LB3][r], 10)
    for sx in (-0.175, 0.175):                                 # VU-Leuchten
        box(sx, -0.010, 1.066, 0.030, 0.180, 0.012, LB2)
    box(0, -0.300, 1.062, 0.520, 0.150, 0.024, ALU)            # Laptop-Bruecke
    for sx in (-0.220, 0.220):
        box(sx, -0.300, 1.032, 0.040, 0.120, 0.060, SWZ)
    lp = box(0, -0.330, 1.190, 0.480, 0.026, 0.290, SWZ)       # Laptop-Deckel
    lp.rotation_euler[0] = -0.22
    ls = box(0, -0.315, 1.190, 0.440, 0.014, 0.250, SCR)
    ls.rotation_euler[0] = -0.22
    for sx in (-1.020, 1.020):                                 # Monitorboxen
        box(sx, -0.200, 1.180, 0.280, 0.250, 0.360, SWZ)
        zyl(sx, -0.078, 1.230, 0.090, 0.030, VIN, 18, rot=(math.pi/2, 0, 0))
        zyl(sx, -0.078, 1.100, 0.045, 0.030, VIN, 14, rot=(math.pi/2, 0, 0))
        box(sx, -0.078, 1.335, 0.200, 0.030, 0.030, LB2)
    export("th14_dj_pult", 0.010, 2)

# ================================================================ 10) Tanzflaeche
def tanzflaeche():
    """Tanzflaechen-Modul EXAKT 6,00 x 6,00 m, Hoehe 0,15.
    8 x 8 leuchtende Felder (0,72) im Raster 0,75, Fuge 0,03 -> beim
    Aneinandersetzen (x += 6,00 / z += 6,00) bleibt die Fuge gleich breit."""
    neu()
    TRG = mat("TfTraeger", (0.09,0.09,0.11), 0.55)
    FUG = mat("TfFuge",    (0.30,0.10,0.45), 0.35, 0.0, (0.55,0.14,0.85), 1.6)
    F1  = mat("TfFeld1", (0.90,0.16,0.50), 0.22, 0.0, (1.00,0.18,0.58), 2.2)
    F2  = mat("TfFeld2", (0.16,0.78,0.95), 0.22, 0.0, (0.20,0.88,1.00), 2.2)
    F3  = mat("TfFeld3", (0.95,0.80,0.20), 0.22, 0.0, (1.00,0.84,0.22), 2.2)
    F4  = mat("TfFeld4", (0.42,0.28,0.95), 0.22, 0.0, (0.48,0.32,1.00), 2.2)
    F   = (F1, F2, F3, F4)
    box(0, 0, 0.045, 6.000, 6.000, 0.090, TRG)         # Traeger 0..0.09
    box(0, 0, 0.105, 5.940, 5.940, 0.030, FUG)         # leuchtendes Fugenraster 0.09..0.12
    for i in range(8):
        for j in range(8):
            cx = -3.0 + 0.375 + i*0.75
            cy = -3.0 + 0.375 + j*0.75
            idx = ((i + j) % 2)*2 + ((i//2 + j//2) % 2)
            box(cx, cy, 0.120, 0.720, 0.720, 0.060, F[idx])   # Felder 0.09..0.15
    export("th14_tanzflaeche", 0.010, 2)

# ================================================================ 11) Samtkordel
def samtkordel():
    """Absperrung: 2 Messingpfosten (Pfostenabstand 1,80 m), dazwischen eine
    durchhaengende Samtkordel. Reihenbildung: naechster Pfosten x += 1,80."""
    neu()
    MES = mat("SkMessing", (0.80,0.62,0.22), 0.28, 0.65)
    MES2= mat("SkMessingD",(0.60,0.45,0.15), 0.35, 0.60)
    SAM = mat("SkSamt",    (0.58,0.06,0.12), 0.92)
    SAM2= mat("SkSamtHell",(0.72,0.10,0.16), 0.90)
    FLZ = mat("SkFilz",    (0.14,0.12,0.12), 0.95)
    for sx in (-0.90, 0.90):
        zyl(sx, 0, 0.010, 0.195, 0.020, FLZ, 24)              # Filzgleiter 0..0.02
        kegel(sx, 0, 0.055, 0.190, 0.110, 0.070, MES2, 24)    # Fussteller 0.02..0.09
        zyl(sx, 0, 0.105, 0.075, 0.040, MES, 20)
        zyl(sx, 0, 0.480, 0.036, 0.720, MES, 16)              # Saeule 0.12..0.84
        zyl(sx, 0, 0.420, 0.058, 0.036, MES2, 20)             # Zierring
        zyl(sx, 0, 0.855, 0.062, 0.040, MES2, 20)             # Oese-Traeger
        torus(sx, 0, 0.855, 0.062, 0.016, MES, 20, 6, rot=(math.pi/2, 0, 0))
        kugel(sx, 0, 0.912, 0.058, MES, 16)                   # Knauf -> 0.970
        zyl(sx, 0, 0.960, 0.022, 0.030, MES2, 12)
    # Kordel: Kettenlinie zwischen den Oesen, Durchhang 0.24
    x0, x1, zh, sag = -0.838, 0.838, 0.855, 0.240
    n = 14
    pts = []
    for i in range(n + 1):
        s = i/n
        pts.append((x0 + (x1-x0)*s, zh - 4.0*sag*s*(1.0-s)))
    for i in range(n):
        a, b = pts[i], pts[i+1]
        strebe(a[0], 0, a[1], b[0], 0, b[1], 0.030, SAM if i % 2 == 0 else SAM2, 8)
    for p in pts[1:-1]:
        kugel(p[0], 0, p[1], 0.030, SAM, 10)                  # Knickpunkte fuellen
    for sx in (x0, x1):                                       # Endquasten
        zyl(sx, 0, zh - 0.020, 0.040, 0.060, MES2, 14)
        kegel(sx, 0, zh - 0.090, 0.030, 0.055, 0.090, SAM2, 14)
    export("th14_samtkordel", 0.008, 2)

# ================================================================ 12) Kronleuchter
def kronleuchter():
    """HAENGENDES Modell. Deckenrosette-Oberkante z = 4,00 (Montagehoehe),
    Unterkante (Zierspitze) z = 1,95 -> Bauhoehe 2,05 m.
    20 Kerzen (Flammen emissiv) auf 2 Etagen, Kristallgehaenge."""
    neu()
    MES = mat("KlMessing",  (0.80,0.62,0.22), 0.28, 0.65)
    MES2= mat("KlMessingD", (0.58,0.44,0.16), 0.36, 0.60)
    WAX = mat("KlKerze",    (0.96,0.93,0.84), 0.75)
    FLM = mat("KlFlamme",   (1.00,0.82,0.35), 0.20, 0.0, (1.00,0.78,0.30), 3.0)
    GLW = mat("KlSchein",   (1.00,0.90,0.65), 0.25, 0.0, (1.00,0.88,0.60), 1.6)
    KRI = mat("KlKristall", (0.86,0.92,0.98), 0.10, 0.20, (0.60,0.72,0.85), 0.5)
    zyl(0, 0, 3.965, 0.240, 0.070, MES2, 24)                  # Deckenrosette 3.93..4.00
    zyl(0, 0, 3.900, 0.140, 0.070, MES, 20)
    zyl(0, 0, 3.640, 0.022, 0.540, MES, 10)                   # Haengestange 3.37..3.91
    for zs in (3.480, 3.640, 3.800):
        torus(0, 0, zs, 0.052, 0.013, MES2, 18, 6, rot=(math.pi/2, 0, 0))
    kegel(0, 0, 3.300, 0.240, 0.060, 0.160, MES, 20)          # Baldachin 3.22..3.38
    zyl(0, 0, 2.720, 0.055, 1.000, MES, 14)                   # Mittelsaeule 2.22..3.22
    zyl(0, 0, 2.940, 0.090, 0.070, MES2, 16)
    zyl(0, 0, 2.500, 0.090, 0.070, MES2, 16)
    kugel(0, 0, 2.220, 0.115, MES, 16)                        # Knoten 2.105..2.335
    # Zierspitze 1.95..2.11: r1 ist der UNTERE Radius -> muss klein sein,
    # sonst haengt unten ein nach unten aufgehender Trichter statt einer Spitze.
    kegel(0, 0, 2.030, 0.010, 0.078, 0.160, MES2, 16)
    def _etage(zring, rring, anz, zarm):
        torus(0, 0, zring, rring, 0.032, MES, 30, 8)
        for k in range(anz):
            a = k/anz*math.tau
            o = box(math.cos(a)*(rring/2 + 0.03), math.sin(a)*(rring/2 + 0.03), zarm,
                    rring - 0.02, 0.046, 0.040, MES)
            o.rotation_euler[2] = a
            px, py = math.cos(a)*rring, math.sin(a)*rring
            zyl(px, py, zring + 0.055, 0.068, 0.050, MES2, 14)        # Tropfschale
            zyl(px, py, zring + 0.170, 0.027, 0.180, WAX, 10)         # Kerze
            kegel(px, py, zring + 0.315, 0.030, 0.000, 0.110, FLM, 10)# Flamme
            kugel(px, py, zring + 0.275, 0.055, GLW, 10)              # Lichtschein
    _etage(2.940, 0.560, 8, 2.920)                            # obere Etage
    _etage(2.480, 0.870, 12, 2.460)                           # untere Etage
    for k in range(12):                                       # Gehaenge unter dem Ring
        a = k/12*math.tau + 0.13
        px, py = math.cos(a)*0.870, math.sin(a)*0.870
        for j, (dz, rr) in enumerate(((0.075, 0.034), (0.150, 0.030),
                                      (0.220, 0.026), (0.285, 0.021))):
            o = kugel(px, py, 2.480 - dz, rr, KRI, 8)
            o.scale = (0.75, 0.75, 1.45)
    for k in range(8):                                        # Girlanden zwischen den Etagen
        a = k/8*math.tau + 0.20
        for j in range(4):
            s = (j + 0.5)/4
            rr = 0.560 + (0.870 - 0.560)*s
            zz = 2.940 - (2.940 - 2.480)*s - 0.06*math.sin(math.pi*s)
            o = kugel(math.cos(a)*rr, math.sin(a)*rr, zz, 0.026, KRI, 8)
            o.scale = (0.8, 0.8, 1.3)
    export("th14_kronleuchter", 0.008, 2)

if __name__ == "__main__":
    print("Asset-Charge 10 (th14, Casino-/Barausstattung):")
    for fn in (spielautomat, automatenreihe, roulettetisch, kartentisch, pokertisch,
               casinobar, neonschild_gross, discokugel, dj_pult, tanzflaeche,
               samtkordel, kronleuchter):
        fn()
    print("fertig")
