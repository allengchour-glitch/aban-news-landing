# -*- coding: utf-8 -*-
"""Asset-Charge 7 (th11_*): INNENAUSSTATTUNG fuer die begehbaren Gebaeude (th8_*).
Massstab: Spielfigur ~1,8 m. Moebel, Ladenbau und Vertikal-Erschliessung
(Rolltreppe / Aufzug / Treppenlauf).

Konventionen (identisch zu th5..th9):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * Schauseite (Bedienseite/Front) wird hier direkt auf Blender +y gebaut
    -> in three.js liegt sie bei -z. Deshalb ueberall `export(..., drehen=False)`.
    (`dreh180()` bleibt fuer auf -y gebaute Modelle erhalten.)
  * `primitive_cube_add(size=1)` liefert Kantenlaenge 1 -> Skalierung = Mass, NICHT /2.
  * `rot=(pi/2,0,0)` legt eine Zylinderachse auf -y, NICHT auf x.
    Fuer Raeder/Rollen `rot=(0,pi/2,0)` benutzen.
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

def kugel(x, y, z, r, m=None, seg=20):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=seg, ring_count=max(6,seg//2))
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kegel(x, y, z, r1, r2, h, m=None, seg=12, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def rolle(x, y, z, r, breite, m=None, seg=12, achse=0.0):
    """Laufrolle. Achse waagerecht; `achse` dreht sie zusaetzlich um z.
    rot=(pi/2,0,0) waere FALSCH (legt die Achse auf -y)."""
    return zyl(x, y, z, r, breite, m, seg, rot=(0, math.pi/2, achse))

def gruppe(objs, cx, cy, ang):
    """Fertig gebaute Teilgruppe (alle achsparallel) um z drehen und versetzen."""
    ca, sa = math.cos(ang), math.sin(ang)
    for o in objs:
        x, y, z = o.location
        o.location = (cx + x*ca - y*sa, cy + x*sa + y*ca, z)
        o.rotation_euler[2] += ang
    return objs

def schraeg(x, ym, zm, sx, laenge, dicke, m, theta, hoch=0.0):
    """Platte laengs einer Steigung. (ym,zm) = Punkt auf der Steigungslinie,
    `hoch` = REIN VERTIKALER Versatz des Plattenmittelpunkts (bequem rechenbar:
    die Platte deckt vertikal hoch +- dicke/(2*cos theta) ab).
    theta<0 => es geht Richtung -y aufwaerts."""
    o = box(x, ym, zm + hoch, sx, laenge, dicke, m)
    o.rotation_euler[0] = theta
    return o

def prisma_x(cx, pts, breite, m=None, name="Prisma"):
    """Seitenprofil (Liste von (y,z)-Punkten) laengs x extrudiert.
    Fuer Treppenwangen / Rolltreppen-Trog: nur so bleibt die Unterkante sauber
    auf z=0 — eine schraeg gedrehte Box taucht am unteren Ende IMMER unter den Boden."""
    b = breite / 2.0
    n = len(pts)
    v = [(cx-b, p[0], p[1]) for p in pts] + [(cx+b, p[0], p[1]) for p in pts]
    f = [tuple(range(n)), tuple(range(2*n-1, n-1, -1))]
    for i in range(n):
        j = (i + 1) % n
        f.append((i, j, j+n, i+n))
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if m: o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free(); me.update()
    return o

def dreh180():
    """Ganzes Modell um die Welt-Z-Achse drehen: Front von -y nach +y (= three.js -z)."""
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': continue
        nur(o)
        o.rotation_euler[2] += math.pi
        o.location = (-o.location[0], -o.location[1], o.location[2])
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

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

def export(name, bevel=0.012, seg=2, drehen=False):
    if drehen: dreh180()
    runden(bevel, seg)
    for o in bpy.context.scene.objects: o.select_set(True)
    p1 = os.path.join(OUT_GLB, name + ".glb")
    # export_apply=True ist PFLICHT — sonst landet der Bevel NICHT im GLB.
    bpy.ops.export_scene.gltf(filepath=p1, export_format='GLB', use_selection=False, export_apply=True)
    p2 = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p2)
    except Exception: bpy.ops.export_mesh.stl(filepath=p2)
    print("  ->", name, os.path.getsize(p1), "B")

# ============================================================ 1) Schreibtisch
def schreibtisch():
    """Bueroschreibtisch 1,60 x 0,80, Plattenhoehe 0,75, Rollcontainer darunter.
    Benutzerseite (Stuhl) = +y."""
    neu()
    HOLZ = mat("TischPlatte", (0.76,0.62,0.44), 0.55)
    KANT = mat("Kante", (0.52,0.40,0.27), 0.6)
    MET  = mat("Gestell", (0.30,0.32,0.35), 0.42, 0.55)
    WEIS = mat("Container", (0.88,0.88,0.86), 0.55)
    FRNT = mat("Schubfront", (0.70,0.72,0.75), 0.45, 0.25)
    CHR  = mat("Chrom", (0.78,0.80,0.83), 0.22, 0.85)
    DKL  = mat("Monitor", (0.13,0.14,0.16), 0.5)
    SCR  = mat("Bildschirm", (0.30,0.52,0.66), 0.15, 0.0, (0.30,0.52,0.66), 0.9)

    box(0, 0, 0.735, 1.60, 0.80, 0.030, HOLZ)              # Platte, Oberkante 0.750
    box(0, 0.395, 0.735, 1.60, 0.020, 0.034, KANT)         # Vorderkante
    for sx in (-0.72, 0.72):                               # Beine
        for sy in (-0.34, 0.34):
            zyl(sx, sy, 0.360, 0.030, 0.720, MET, 12)
        box(sx, 0, 0.680, 0.050, 0.700, 0.045, MET)        # Laengstraverse
    box(0, 0, 0.560, 1.44, 0.045, 0.045, MET)              # Quertraverse
    box(0, -0.345, 0.500, 1.40, 0.022, 0.330, MET)         # Sichtblende hinten
    box(0, -0.320, 0.690, 1.30, 0.070, 0.070, MET)         # Kabelkanal

    # Rollcontainer (rechts unter der Platte)
    box(0.45, -0.05, 0.320, 0.42, 0.55, 0.560, WEIS)       # Korpus z 0.04..0.60
    for sx in (-0.16, 0.16):
        for sy in (-0.22, 0.22):
            rolle(0.45+sx, -0.05+sy, 0.020, 0.020, 0.016, DKL, 10)
    for i, zf in enumerate((0.115, 0.320, 0.520)):
        box(0.45, 0.232, zf, 0.400, 0.022, 0.175, FRNT)    # Schubladenfronten
        zyl(0.45, 0.252, zf, 0.014, 0.170, CHR, 8, rot=(0, math.pi/2, 0))

    # Arbeitsplatz-Details
    box(0, -0.230, 0.765, 0.26, 0.17, 0.030, DKL)          # Monitorfuss
    zyl(0, -0.230, 0.900, 0.026, 0.240, DKL, 10)
    m = box(0, -0.205, 1.120, 0.58, 0.030, 0.340, DKL)     # Monitorgehaeuse
    m.rotation_euler[0] = 0.10
    s = box(0, -0.190, 1.120, 0.54, 0.014, 0.300, SCR)     # Bildflaeche
    s.rotation_euler[0] = 0.10
    box(0, 0.060, 0.762, 0.42, 0.14, 0.024, DKL)           # Tastatur
    box(0.30, 0.070, 0.766, 0.07, 0.11, 0.032, DKL)        # Maus
    export("th11_schreibtisch", 0.010, 2)

# ============================================================ 2) Buerostuhl
def buerostuhl():
    """Drehstuhl: Fusskreuz mit 5 Rollen, Gasfeder, Sitz 0,48, Rueckenlehne geneigt."""
    neu()
    MET  = mat("StuhlMetall", (0.30,0.32,0.35), 0.40, 0.60)
    DKL  = mat("StuhlKunst", (0.12,0.13,0.15), 0.55)
    STO  = mat("StuhlPolster", (0.15,0.27,0.42), 0.85)
    AKZ  = mat("StuhlAkzent", (0.72,0.30,0.20), 0.7)

    for k in range(5):
        a = k / 5.0 * math.tau
        s = box(math.cos(a)*0.165, math.sin(a)*0.165, 0.078, 0.330, 0.055, 0.046, MET)
        s.rotation_euler[2] = a                                  # Ausleger
        zyl(math.cos(a)*0.300, math.sin(a)*0.300, 0.086, 0.018, 0.062, DKL, 8)
        rolle(math.cos(a)*0.300, math.sin(a)*0.300, 0.032, 0.032, 0.022, DKL, 12,
              achse=a + math.pi/2)                               # Rolle, Achse tangential
    zyl(0, 0, 0.130, 0.062, 0.160, DKL, 14)                      # Gasfeder-Huelse
    zyl(0, 0, 0.250, 0.036, 0.220, MET, 12)                      # Kolben
    box(0, -0.02, 0.375, 0.230, 0.270, 0.055, DKL)               # Mechanik
    box(0, 0.00, 0.435, 0.480, 0.460, 0.090, STO)                # Sitz, OK 0.480
    box(0, 0.00, 0.394, 0.440, 0.420, 0.020, DKL)                # Sitzschale
    box(0, -0.215, 0.500, 0.100, 0.115, 0.220, DKL)              # Lehnentraeger
    l = box(0, -0.245, 0.750, 0.440, 0.075, 0.500, STO)          # Rueckenlehne
    l.rotation_euler[0] = 0.15
    lk = box(0, -0.185, 0.620, 0.400, 0.040, 0.090, AKZ)         # Lendenstuetze (VOR der Lehne)
    lk.rotation_euler[0] = 0.15
    for sx in (-0.245, 0.245):                                   # Armlehnen: am Sitz verankert
        box(sx, -0.020, 0.430, 0.120, 0.080, 0.055, DKL)         # Konsole greift in den Sitz
        box(sx*1.122, -0.020, 0.560, 0.050, 0.055, 0.245, DKL)   # Stuetze
        box(sx*1.122, 0.020, 0.700, 0.075, 0.260, 0.042, DKL)    # Auflage
    export("th11_buerostuhl", 0.008, 2)

# ============================================================ 3) Sofa
def sofa():
    """3er-Sofa 2,10 x 0,90, Sitzhoehe 0,48, mit Rueckenkissen + 2 Zierkissen."""
    neu()
    KOR = mat("SofaKorpus", (0.20,0.24,0.31), 0.90)
    POL = mat("SofaPolster", (0.31,0.36,0.45), 0.92)
    ZIE = mat("Zierkissen", (0.72,0.42,0.16), 0.90)
    FUS = mat("SofaFuss", (0.35,0.24,0.14), 0.55)

    box(0, 0.02, 0.200, 2.10, 0.86, 0.240, KOR)          # Sitzkasten z 0.08..0.32
    for sx in (-0.92, 0.92):
        for sy in (-0.34, 0.36):
            zyl(sx, sy, 0.040, 0.035, 0.080, FUS, 10)
    for sx in (-0.68, 0.0, 0.68):                        # Sitzkissen, OK 0.48
        box(sx, 0.06, 0.400, 0.650, 0.720, 0.160, POL)
    box(0, -0.370, 0.530, 2.10, 0.160, 0.580, KOR)       # Rueckenkorpus z 0.24..0.82
    for sx in (-0.68, 0.0, 0.68):                        # Rueckenkissen
        box(sx, -0.270, 0.650, 0.640, 0.200, 0.340, POL)
    for sx in (-0.97, 0.97):                             # Armlehnen
        box(sx, 0.00, 0.420, 0.160, 0.900, 0.680, KOR)
        box(sx, 0.00, 0.770, 0.185, 0.900, 0.070, POL)
    for sx in (-0.56, 0.56):                             # Zierkissen, an die Lehne gelehnt
        k = box(sx, -0.150, 0.630, 0.360, 0.120, 0.360, ZIE)
        k.rotation_euler[0] = 0.38
    export("th11_sofa", 0.014, 2)

# ------------------------------------------------------------ Stuhl-Baustein
def _stuhl(cx, cy, ang, HOLZ, POL):
    """Einzelstuhl (Sitz 0,45), Lehne lokal auf -y; wird per `gruppe()` gedreht."""
    g = []
    g.append(box(0, 0, 0.435, 0.440, 0.440, 0.050, POL))                 # Sitz OK 0.46
    for sx in (-0.190, 0.190):
        for sy in (-0.190, 0.190):
            g.append(box(sx, sy, 0.205, 0.045, 0.045, 0.410, HOLZ))      # Beine
    for sx in (-0.190, 0.190):
        g.append(box(sx, -0.190, 0.665, 0.045, 0.045, 0.500, HOLZ))      # Lehnenpfosten
    g.append(box(0, -0.192, 0.800, 0.390, 0.032, 0.150, HOLZ))           # Lehnenbrett oben
    g.append(box(0, -0.192, 0.610, 0.390, 0.032, 0.100, HOLZ))           # Lehnenbrett unten
    g.append(box(0,  0.190, 0.160, 0.390, 0.032, 0.032, HOLZ))           # Zargen
    g.append(box(0, -0.190, 0.160, 0.390, 0.032, 0.032, HOLZ))
    for sx in (-0.190, 0.190):
        g.append(box(sx, 0, 0.160, 0.032, 0.390, 0.032, HOLZ))
    return gruppe(g, cx, cy, ang)

# ============================================================ 4) Esstisch mit 4 Stuehlen
def esstisch_stuehle():
    """Set: Tisch 1,50 x 0,90 (OK 0,76) + 4 Stuehle, je 2 pro Laengsseite."""
    neu()
    HOLZ = mat("EssHolz", (0.47,0.30,0.16), 0.60)
    PLAT = mat("EssPlatte", (0.58,0.39,0.21), 0.50)
    POL  = mat("EssPolster", (0.30,0.35,0.27), 0.90)

    box(0, 0, 0.735, 1.50, 0.90, 0.050, PLAT)                # Platte OK 0.760
    for sx in (-0.66, 0.66):
        for sy in (-0.36, 0.36):
            box(sx, sy, 0.355, 0.070, 0.070, 0.710, HOLZ)    # Beine
    for sy in (-0.375, 0.375):
        box(0, sy, 0.665, 1.32, 0.045, 0.090, HOLZ)          # Zargen
    for sx in (-0.675, 0.675):
        box(sx, 0, 0.665, 0.045, 0.700, 0.090, HOLZ)
    for sx in (-0.36, 0.36):
        _stuhl(sx, -0.74, 0.0, HOLZ, POL)                    # Lehne zeigt nach -y
        _stuhl(sx,  0.74, math.pi, HOLZ, POL)                # Lehne zeigt nach +y
    export("th11_esstisch_stuehle", 0.010, 2)

# ============================================================ 5) Bett
def bett():
    """Doppelbett 1,62 x 2,10, Matratze OK 0,56, Kopfteil (-y) 1,10 hoch,
    Decke mit Umschlag + 2 Kissen."""
    neu()
    HOLZ = mat("BettHolz", (0.44,0.28,0.15), 0.60)
    MATR = mat("Matratze", (0.90,0.89,0.85), 0.92)
    DEC  = mat("Decke", (0.20,0.33,0.48), 0.94)
    DEC2 = mat("DeckeUmschlag", (0.86,0.88,0.90), 0.94)
    KIS  = mat("Kopfkissen", (0.94,0.93,0.90), 0.95)

    box(0, 0.02, 0.200, 1.62, 2.00, 0.240, HOLZ)          # Bettkasten z 0.08..0.32
    for sx in (-0.74, 0.74):
        for sy in (-0.92, 0.94):
            box(sx, sy, 0.040, 0.100, 0.100, 0.080, HOLZ)
    box(0, -1.02, 0.550, 1.62, 0.080, 1.100, HOLZ)        # Kopfteil
    box(0, -0.975, 0.780, 1.44, 0.040, 0.540, MATR)       # Polsterfeld im Kopfteil
    box(0,  1.02, 0.260, 1.62, 0.080, 0.360, HOLZ)        # Fussteil
    box(0, 0.02, 0.440, 1.54, 1.92, 0.240, MATR)          # Matratze OK 0.56
    box(0, 0.30, 0.600, 1.50, 1.34, 0.100, DEC)           # Decke
    for sx in (-0.765, 0.765):                            # Decke haengt seitlich ueber
        box(sx, 0.30, 0.480, 0.060, 1.34, 0.260, DEC)
    box(0, 0.955, 0.500, 1.50, 0.060, 0.260, DEC)         # Decke am Fussende
    box(0, -0.360, 0.665, 1.50, 0.220, 0.075, DEC2)       # Umschlag LIEGT AUF der Decke
    for sx in (-0.38, 0.38):
        k = box(sx, -0.700, 0.635, 0.660, 0.360, 0.150, KIS)
        k.rotation_euler[0] = 0.12
    export("th11_bett", 0.014, 2)

# ============================================================ 6) Kuechenzeile
def kuechenzeile():
    """Zeile 3,24 m: Spuele links, Kochfeld + Backofen Mitte, Oberschraenke,
    Dunstabzug, Fliesenspiegel. Bedienseite = +y."""
    neu()
    KOR  = mat("KuecheKorpus", (0.90,0.90,0.88), 0.55)
    FRNT = mat("KuecheFront", (0.20,0.34,0.33), 0.45)
    ARB  = mat("Arbeitsplatte", (0.26,0.26,0.28), 0.40)
    EDST = mat("Edelstahl", (0.74,0.76,0.79), 0.28, 0.85)
    CHR  = mat("Griff", (0.80,0.82,0.85), 0.22, 0.90)
    FLI  = mat("Fliesen", (0.82,0.86,0.86), 0.35)
    SOK  = mat("Sockel", (0.22,0.23,0.25), 0.65)
    GLK  = mat("Glaskeramik", (0.10,0.10,0.12), 0.20)
    ROT  = mat("Kochzone", (0.75,0.18,0.10), 0.35, 0.0, (0.75,0.18,0.10), 1.6)
    OFG  = mat("Ofenglas", (0.12,0.14,0.17), 0.18)

    box(0, -0.02, 0.050, 3.20, 0.52, 0.100, SOK)                 # Sockelleiste
    box(0,  0.00, 0.500, 3.20, 0.60, 0.800, KOR)                 # Unterschrank-Korpus
    box(0, -0.335, 1.180, 3.24, 0.030, 0.520, FLI)               # Fliesenspiegel

    # Arbeitsplatte 0.90..0.94 mit 2 Ausschnitten (Spuele / Kochfeld)
    loecher = ((-1.49, -0.82), (0.14, 0.70))
    kanten  = [-1.62, -1.49, -0.82, 0.14, 0.70, 1.62]
    for a, b in ((-1.62,-1.49), (-0.82,0.14), (0.70,1.62)):
        box((a+b)/2, 0.0, 0.920, b-a, 0.64, 0.040, ARB)
    for a, b in loecher:                                          # Stege vor/hinter dem Loch
        box((a+b)/2, -0.265, 0.920, b-a, 0.110, 0.040, ARB)
        box((a+b)/2,  0.265, 0.920, b-a, 0.110, 0.040, ARB)

    # Spuelbecken (5 Teile: Boden + 4 Waende -> echter Trog)
    BECK = mat("Beckenboden", (0.52,0.55,0.58), 0.35, 0.80)
    box(-1.155, 0.0, 0.750, 0.620, 0.360, 0.020, BECK)
    box(-1.475, 0.0, 0.850, 0.030, 0.420, 0.200, EDST)
    box(-0.835, 0.0, 0.850, 0.030, 0.420, 0.200, EDST)
    box(-1.155, -0.195, 0.850, 0.680, 0.030, 0.200, EDST)
    box(-1.155,  0.195, 0.850, 0.680, 0.030, 0.200, EDST)
    zyl(-1.155, -0.265, 1.060, 0.022, 0.260, CHR, 12)             # Armatur
    zyl(-1.155, -0.150, 1.180, 0.020, 0.250, CHR, 12, rot=(math.pi/2, 0, 0))
    zyl(-1.155, -0.030, 1.150, 0.016, 0.070, CHR, 10)
    box(-1.155, -0.300, 1.215, 0.130, 0.028, 0.030, CHR)          # Hebel

    # Kochfeld + Backofen
    box(0.42, 0.0, 0.925, 0.560, 0.420, 0.030, GLK)               # Glaskeramik im Loch
    for dx in (-0.135, 0.135):
        for dy in (-0.105, 0.105):
            zyl(0.42+dx, dy, 0.944, 0.072, 0.008, ROT, 14)
    box(0.42, 0.310, 0.500, 0.560, 0.030, 0.620, EDST)            # Ofenfront
    box(0.42, 0.322, 0.480, 0.420, 0.016, 0.300, OFG)
    zyl(0.42, 0.340, 0.760, 0.018, 0.500, CHR, 10, rot=(0, math.pi/2, 0))
    for dx in (-0.20, -0.07, 0.07, 0.20):                         # Bedienknoepfe
        zyl(0.42+dx, 0.328, 0.700, 0.022, 0.028, CHR, 10, rot=(math.pi/2, 0, 0))

    # Fronten links (Spuelunterschrank) und rechts
    for cx in (-1.36, -0.92):
        box(cx, 0.312, 0.500, 0.400, 0.024, 0.740, FRNT)
        zyl(cx, 0.334, 0.800, 0.012, 0.300, CHR, 8)
    for cx in (0.96, 1.40):
        box(cx, 0.312, 0.500, 0.400, 0.024, 0.740, FRNT)
        zyl(cx, 0.334, 0.800, 0.012, 0.300, CHR, 8)
    for zf in (0.240, 0.500, 0.760):                              # Schubladenblock
        box(-0.29, 0.312, zf, 0.740, 0.024, 0.230, FRNT)
        zyl(-0.29, 0.334, zf, 0.014, 0.480, CHR, 8, rot=(0, math.pi/2, 0))

    # Oberschraenke 1.45..2.11
    for cx, bw, nd in ((-0.85, 1.50, 3), (1.15, 0.90, 2)):
        box(cx, -0.150, 1.780, bw, 0.340, 0.660, KOR)
        for j in range(nd):
            dx = -bw/2.0 + bw*(j + 0.5)/nd
            box(cx + dx, 0.032, 1.780, bw/nd - 0.030, 0.024, 0.620, FRNT)
            zyl(cx + dx, 0.052, 1.560, 0.012, 0.240, CHR, 8)
    # Dunstabzug ueber dem Kochfeld
    box(0.42, -0.150, 1.510, 0.640, 0.360, 0.120, EDST)
    box(0.42, -0.150, 1.446, 0.560, 0.300, 0.020, GLK)
    box(0.42, -0.230, 1.900, 0.260, 0.220, 0.660, EDST)
    export("th11_kuechenzeile", 0.010, 2)

# ============================================================ 7) Ladenregal
def ladenregal():
    """Doppelseitiges Supermarktregal 2,00 x 0,90 x 1,78, beidseitig 4 Boeden
    plus Sockelebene, alle Ebenen mit Ware bestueckt."""
    neu()
    MET  = mat("RegalMetall", (0.72,0.73,0.75), 0.45, 0.35)
    RUE  = mat("RegalRuecken", (0.42,0.46,0.52), 0.65)
    LIP  = mat("Preisleiste", (0.92,0.92,0.90), 0.5)
    SOK  = mat("RegalSockel", (0.30,0.32,0.35), 0.6)
    WARE = [mat("Ware1", (0.80,0.24,0.18), 0.7), mat("Ware2", (0.20,0.44,0.70), 0.7),
            mat("Ware3", (0.94,0.78,0.22), 0.7), mat("Ware4", (0.26,0.58,0.34), 0.7),
            mat("Ware5", (0.88,0.86,0.82), 0.7), mat("Ware6", (0.56,0.30,0.62), 0.7)]

    box(0, 0, 0.060, 2.00, 0.86, 0.120, SOK)                 # Sockelwanne
    box(0, 0, 0.950, 1.96, 0.060, 1.660, RUE)                # Mittelruecken
    for sx in (-0.985, 0.985):
        box(sx, 0, 0.950, 0.045, 0.860, 1.660, MET)          # Wangen
    box(0, 0, 1.800, 2.00, 0.900, 0.040, MET)                # Abdeckung

    ebenen = [0.120]
    for zb in (0.420, 0.780, 1.140, 1.500):
        ebenen.append(zb + 0.0175)
        for sgn in (-1, 1):
            box(0, sgn*0.245, zb, 1.90, 0.400, 0.035, MET)   # Boden
            box(0, sgn*0.440, zb + 0.033, 1.90, 0.020, 0.052, LIP)   # Preisleiste
    for li, ztop in enumerate(ebenen):
        h = 0.24 if li == 0 else 0.20
        for sgn in (-1, 1):
            for k in range(6):
                m = WARE[(k + li*2 + (0 if sgn < 0 else 3)) % len(WARE)]
                box(-0.80 + k*0.32, sgn*0.245, ztop + h/2, 0.260, 0.300, h, m)
    export("th11_ladenregal", 0.010, 2)

# ============================================================ 8) Empfangstheke
def empfangstheke():
    """Geschwungene Empfangstheke: Kundentresen 1,14, Arbeitsplatte 0,80.
    Kundenseite (aussen) = +y."""
    neu()
    KOR = mat("ThekeKorpus", (0.90,0.89,0.86), 0.50)
    HOL = mat("ThekeHolz", (0.42,0.26,0.14), 0.50)
    PLA = mat("ThekePlatte", (0.24,0.25,0.28), 0.35)
    AKZ = mat("ThekeLicht", (0.20,0.60,0.68), 0.3, 0.0, (0.20,0.60,0.68), 1.2)
    SOK = mat("ThekeSockel", (0.26,0.27,0.30), 0.6)

    CY, R, n = -1.15, 1.55, 13
    a0, a1 = math.radians(32.0), math.radians(148.0)
    for i in range(n):
        a = a0 + (a1 - a0) * (i + 0.5) / n
        ca, sa = math.cos(a), math.sin(a)
        def seg(rad, sx, sy, z, sz, m):
            o = box(ca*rad, CY + sa*rad, z, sx, sy, sz, m)
            o.rotation_euler[2] = a + math.pi/2
            return o
        seg(R - 0.05, 0.260, 0.100, 0.060, 0.120, SOK)      # Sockelfuge
        seg(R,        0.260, 0.090, 0.600, 0.960, HOL)      # Aussenblende
        seg(R + 0.035,0.250, 0.040, 0.980, 0.080, AKZ)      # Lichtband
        seg(R - 0.060,0.275, 0.420, 1.110, 0.060, PLA)      # Kundentresen OK 1.14
        seg(0.890,    0.165, 0.060, 0.380, 0.760, KOR)      # Innenblende
        seg(1.200,    0.265, 0.620, 0.780, 0.045, PLA)      # Arbeitsplatte OK 0.80
                                                            # (Breite > Sehne am AUSSEN-
                                                            # radius, sonst Keilspalte)
    for a in (a0, a1):                                       # Stirnseiten schliessen
        ca, sa = math.cos(a), math.sin(a)
        o = box(ca*1.200, CY + sa*1.200, 0.540, 0.060, 0.660, 1.080, KOR)
        o.rotation_euler[2] = a + math.pi/2
    export("th11_empfangstheke", 0.010, 2)

# ============================================================ 9) Rolltreppe
def rolltreppe():
    """Rolltreppe, Steigung 30 Grad, Hoehenunterschied exakt 4,00 m.
    Unteres Podest bei +y (z=0), oberes Podest bei -y (z=4,00).
    20 Steigungen a 0,20 m, Auftritt 0,3464 -> Lauf 6,928 m."""
    neu()
    TRU = mat("RtTrog", (0.36,0.38,0.42), 0.45, 0.55)
    STU = mat("RtStufe", (0.70,0.72,0.75), 0.35, 0.75)
    GEL = mat("RtGelb", (0.94,0.78,0.14), 0.5)
    GLA = mat("RtGlas", (0.52,0.66,0.74), 0.12, 0.10)
    GUM = mat("RtHandlauf", (0.10,0.11,0.13), 0.55)
    PLA = mat("RtPodest", (0.62,0.64,0.66), 0.40, 0.60)
    KAM = mat("RtKamm", (0.86,0.70,0.16), 0.45)

    g   = 0.20 / math.tan(math.radians(30.0))       # 0.34641 Auftritt
    y0  = 3.40                                      # Fuss der Steigung (unten, +y)
    yt  = y0 - 19*g                                 # -3.1823 Vorderkante oberes Podest
    th  = -math.radians(30.0)
    ym, zm = (y0 + yt) / 2.0, 2.10                  # Punkt auf der NASENLINIE (0.20 -> 4.00)
    yp  = yt - 1.55                                 # Rueckkante oberes Podest

    # Trog als Seitenprofil-Prisma. Die Trogoberkante liegt 0.20 UNTER der Nasenlinie:
    # legt man sie AUF die Nasenlinie, verschwinden die Stufen komplett im Trog
    # (die Nasenlinie beruehrt nur die Stufenkanten, der Rest der Stufe liegt darunter).
    profil = [(y0,       0.00),          # Trogoberkante trifft hier den Boden
              (yt,       3.80),          # Trogoberkante (= Nasenlinie - 0.20)
              (yt,       4.00),
              (yp,       4.00),          # oberes Podest
              (yp,       0.00),
              (yt-0.02,  0.00),          # Vorderwand des Maschinenraums
              (yt-0.02,  3.21),
              (2.361,    0.00)]          # Trogunterseite trifft den Boden
    prisma_x(0.0, profil, 1.24, TRU, "Trog")

    for k in range(20):                              # Stufen (Vollkoerper -> keine Luecken)
        box(0, y0 - g*k - g/2 + 0.010, 0.20*k + 0.100, 1.00, g + 0.020, 0.200, STU)
        box(0, y0 - g*k - 0.045, 0.20*(k+1) + 0.006, 1.00, 0.070, 0.024, GEL)   # gelbe Kante

    for sx in (-0.60, 0.60):
        schraeg(sx, ym, zm, 0.080, 7.40, 0.260, TRU, th, hoch=-0.090)       # Sockelblende
        schraeg(sx*0.917, ym, zm, 0.030, 7.75, 0.875, GLA, th, hoch=0.545)  # Glasbalustrade
        schraeg(sx*0.933, ym, zm, 0.110, 7.90, 0.090, GUM, th, hoch=1.100)  # Handlauf

    # Unteres Podest (Boden z=0)
    box(0, y0 + 0.60, 0.015, 1.20, 1.20, 0.030, PLA)
    box(0, y0 + 0.055, 0.020, 1.00, 0.110, 0.040, KAM)                  # Kammplatte
    for sx in (-0.60, 0.60):
        box(sx, y0 + 0.60, 0.130, 0.080, 1.20, 0.260, TRU)
        box(sx*0.917, y0 + 0.60, 0.745, 0.030, 1.20, 1.010, GLA)
        box(sx*0.933, y0 + 0.65, 1.260, 0.110, 1.30, 0.090, GUM)
        box(sx*0.933, y0 + 1.22, 0.755, 0.110, 0.120, 1.030, GUM)       # Umlenkung
    # Oberes Podest (Boden z=4.00)
    box(0, yt - 0.055, 4.020, 1.00, 0.110, 0.040, KAM)
    box(0, yt - 0.775, 4.015, 1.20, 1.45, 0.030, PLA)
    for sx in (-0.60, 0.60):
        box(sx, yt - 0.775, 4.130, 0.080, 1.45, 0.260, TRU)
        box(sx*0.917, yt - 0.775, 4.745, 0.030, 1.45, 1.010, GLA)
        box(sx*0.933, yt - 0.800, 5.140, 0.110, 1.50, 0.090, GUM)
        box(sx*0.933, yt - 1.470, 4.755, 0.110, 0.120, 1.030, GUM)
    export("th11_rolltreppe", 0.012, 2)

# ============================================================ 10) Aufzug
def aufzug():
    """Aufzugskabine 1,80 x 1,86 x 2,48, Tuer OFFEN (Fluegel in den Taschen),
    innen Spiegel, Handlauf, Tastenpanel + Etagenanzeige. Oeffnung = +y."""
    neu()
    WAN = mat("AufzugWand", (0.72,0.74,0.78), 0.35, 0.65)
    BOD = mat("AufzugBoden", (0.24,0.25,0.28), 0.55)
    DEC = mat("AufzugDecke", (0.86,0.87,0.88), 0.45)
    CHR = mat("AufzugChrom", (0.82,0.84,0.87), 0.18, 0.92)
    SPG = mat("Spiegel", (0.74,0.80,0.86), 0.09, 0.15)   # metal=1 rendert ohne Env-Map SCHWARZ
    PAN = mat("Tastenpanel", (0.20,0.21,0.24), 0.40, 0.30)
    TAS = mat("Taste", (0.90,0.90,0.88), 0.35, 0.10, (0.85,0.80,0.40), 0.6)
    ANZ = mat("Etagenanzeige", (0.20,0.85,0.55), 0.2, 0.0, (0.20,0.85,0.55), 2.4)
    LIC = mat("Kabinenlicht", (1.00,0.97,0.88), 0.2, 0.0, (1.00,0.97,0.88), 1.5)

    box(0, 0, 0.040, 1.80, 1.80, 0.080, BOD)                     # Boden
    box(0, -0.860, 1.240, 1.80, 0.080, 2.320, WAN)               # Rueckwand
    for sx in (-0.860, 0.860):
        box(sx, 0, 1.240, 0.080, 1.80, 2.320, WAN)               # Seitenwaende
    box(0, 0, 2.440, 1.80, 1.80, 0.080, DEC)                     # Decke
    for sx in (-0.700, 0.700):                                   # Frontwand mit Oeffnung
        box(sx, 0.860, 1.130, 0.400, 0.080, 2.100, WAN)
    box(0, 0.860, 2.290, 1.80, 0.080, 0.220, WAN)                # Sturz
    box(0, 0.860, 0.090, 1.04, 0.120, 0.020, CHR)                # Schwelle
    for sx in (-0.680, 0.680):                                   # offene Tuerfluegel
        box(sx, 0.905, 1.130, 0.440, 0.050, 2.100, CHR)
    box(0, -0.805, 1.600, 1.40, 0.020, 1.200, SPG)               # Spiegel
    box(0, -0.786, 0.920, 1.44, 0.050, 0.050, CHR)               # Handlauf
    for sx in (-0.786, 0.786):
        box(sx, -0.020, 0.920, 0.050, 1.44, 0.050, CHR)
    box(0.808, 0.400, 1.350, 0.030, 0.180, 0.720, PAN)           # Tastenpanel
    for r in range(5):
        for c in (-0.045, 0.045):
            zyl(0.788, 0.400 + c, 1.100 + r*0.115, 0.020, 0.014, TAS, 10,
                rot=(0, math.pi/2, 0))
    box(0.808, 0.400, 1.830, 0.030, 0.230, 0.110, ANZ)           # Etagenanzeige
    box(0, -0.100, 2.372, 1.10, 1.10, 0.060, LIC)                # Deckenleuchte
    export("th11_aufzug", 0.010, 2)

# ============================================================ 11) Treppenlauf
def treppenlauf():
    """Gerader Treppenlauf, Hoehenunterschied EXAKT 4,00 m (20 x 0,20),
    Auftritt 0,30 -> Lauf 6,00 m, Geldaender beidseitig.
    Grundriss in y symmetrisch (-3,00 .. +3,00) -> STAPELBAR mit z += 4,00
    (fuer ein Treppenhaus die Kopie zusaetzlich um 180 Grad drehen)."""
    neu()
    STU = mat("TrStufe", (0.70,0.65,0.56), 0.60)
    WAN = mat("TrWange", (0.33,0.29,0.24), 0.70)
    RIS = mat("TrSetzstufe", (0.52,0.47,0.40), 0.72)
    HAN = mat("TrHandlauf", (0.44,0.30,0.18), 0.50)
    GEL = mat("TrGelaender", (0.32,0.34,0.38), 0.40, 0.55)

    g  = 0.30
    y0 = 3.00
    y1 = y0 - 20*g                       # -3.00
    th = -math.atan2(4.00, 6.00)         # -33.69 Grad
    ym, zm = 0.0, 2.20                   # Punkt auf der Nasenlinie

    for k in range(20):
        zt = 0.20 * (k + 1)                                   # Trittflaeche OK
        box(0, y0 - g*k - 0.140, zt - 0.025, 1.40, 0.320, 0.050, STU)
        box(0, y0 - g*k - 0.020, 0.20*k + 0.100, 1.36, 0.040, 0.200, RIS)
    # Wange als Seitenprofil-Prisma (steht am Antritt sauber auf z=0)
    wprofil = [(y0,        0.20), (y0,        0.00), (y0 - 0.60, 0.00),
               (y1,        3.60), (y1,        4.00), (y1 + g,    4.00)]
    for sx in (-0.72, 0.72):
        prisma_x(sx, wprofil, 0.090, WAN, "Wange")
        schraeg(sx, ym, zm, 0.100, 7.50, 0.080, HAN, th, hoch= 0.95)   # Handlauf
        schraeg(sx, ym, zm, 0.055, 7.40, 0.055, GEL, th, hoch= 0.50)   # Knieholm
        for k in (0, 4, 8, 12, 16):                                    # Gelaenderpfosten
            box(sx, y0 - g*(k + 0.5), 0.20*k + 0.625, 0.060, 0.060, 0.850, GEL)
        box(sx, y0 + 0.060, 0.600, 0.090, 0.090, 1.200, GEL)           # Antrittspfosten
        box(sx, y1 - 0.060, 4.600, 0.090, 0.090, 1.200, GEL)           # Austrittspfosten
    export("th11_treppenlauf", 0.012, 2)

# ============================================================ 12) Pflanzkuebel innen
def pflanzkuebel_innen():
    """Grosse Zimmerpflanze im Kuebel, ca. 1,05 x 1,05 x 2,00."""
    neu()
    TON  = mat("Kuebel", (0.72,0.48,0.34), 0.75)
    RAND = mat("KuebelRand", (0.62,0.40,0.28), 0.70)
    ERDE = mat("Erde", (0.20,0.15,0.11), 0.95)
    STA  = mat("Stamm", (0.36,0.28,0.18), 0.80)
    BL1  = mat("Blatt", (0.16,0.42,0.20), 0.78)
    BL2  = mat("BlattHell", (0.24,0.56,0.26), 0.76)

    kegel(0, 0, 0.300, 0.260, 0.340, 0.600, TON, 24)          # Kuebel z 0..0.60
    zyl(0, 0, 0.600, 0.360, 0.060, RAND, 24)                  # Rand z 0.57..0.63
    zyl(0, 0, 0.648, 0.330, 0.050, ERDE, 24)                  # Erde LIEGT OBEN (Rand ist
                                                              # eine Vollscheibe und wuerde
                                                              # tiefer liegende Erde zudecken)
    for k in range(3):                                        # 3 Stiele, leicht gefaechert
        a = k / 3.0 * math.tau
        b = 0.18
        s = zyl(math.cos(a)*0.145, math.sin(a)*0.145, 1.047, 0.035, 0.950, STA, 8)
        s.rotation_euler = (0, b, a)
    ringe = ((6, 0.98, 0.60, 0.28, 1.00, 0.26, BL1),
             (6, 1.28, 0.62, 0.30, 0.80, 0.28, BL2),
             (6, 1.56, 0.58, 0.28, 0.52, 0.26, BL1),
             (5, 1.82, 0.50, 0.24, 0.26, 0.20, BL2))
    idx = 0
    for anz, zc, lang, breit, beta, rc, m in ringe:
        for k in range(anz):
            a = (k / anz) * math.tau + idx * 0.55
            o = kugel(math.cos(a)*rc, math.sin(a)*rc, zc, 1.0, m, 10)
            o.scale = (lang/2, breit/2, 0.014)
            o.rotation_euler = (0, beta, a)
        idx += 1
    o = kugel(0, 0, 1.900, 1.0, BL2, 10)                      # Spitzenblatt
    o.scale = (0.11, 0.20, 0.014)
    o.rotation_euler = (0, -0.25, 0.9)
    export("th11_pflanzkuebel_innen", 0.008, 2)

if __name__ == "__main__":
    print("Asset-Charge 7 (th11, Innenausstattung):")
    for fn in (schreibtisch, buerostuhl, sofa, esstisch_stuehle, bett, kuechenzeile,
               ladenregal, empfangstheke, rolltreppe, aufzug, treppenlauf,
               pflanzkuebel_innen):
        fn()
    print("fertig")
