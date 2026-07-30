# -*- coding: utf-8 -*-
"""Asset-Charge th26_*: BERGWELT — ein eigenes Biom fuer die Openworld.
Felsformation, reihbares Felswand-Modul, Wasserfall, Hoehleneingang, Berghuette,
Seilbahn (Station, Gondel, Stuetze), Haengebruecke, Gipfelkreuz, Bergsee.
Familienfreundlich, keine Waffen.

Konventionen wie th5-th24 (bitte nicht abweichen):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * `primitive_cube_add(size=1)` liefert Kantenlaenge 1 -> Skalierung = Mass, NICHT /2.
  * Schauseite (Portal, Front, Talseite) auf Blender +y  ->  in three.js -z.
  * Gekippte Koerper sinken unter null: `kipp_box()` rechnet die halbe z-Ausdehnung
    aus der ECHTEN Rotationsmatrix und setzt den tiefsten Punkt exakt auf z0.
  * Transparente Flaechen sortiert three.js nicht -> Wasser wird EINGEFAERBT, nie
    als geschichteter Glaskoerper gebaut (Wasserfall, Bergsee).
  * Zylinder mit GERADER Segmentzahl, wenn etwas aufstehen soll.
  * Metallic hoechstens 0.6 — darueber rendert three.js ohne Environment-Map schwarz.
  * Dunkle Materialien rendern in three.js heller als im Blender-Wert -> nachdunkeln.
  * Modul (`th26_felswand_modul`): exakt 12,000 m breit, 16,000 m hoch. Alle
    durchlaufenden Baender/Vorspruenge sind 12,0 m lang bei cx=0 und nur um die
    X-ACHSE gekippt (das laesst das Profil laengs x konstant -> fugenlose Reihung).
    Einzelbloecke bleiben innerhalb |x| < 5,4. Nach JEDEM Detail neu messen.

Seilbahn-Schnittstelle (damit Station, Gondel und Stuetze zusammenpassen):
  * Gondel: Kabinenboden z=0.00, Klemme greift das Seil von UNTEN, Oberkante 4,98.
    Seilachse der Gondel liegt bei z = 5,00.
  * Station: Perron-Oberkante 0,60, Seil/Schiene ueber dem Perron -> Gondel auf
    z = 0,60 setzen: Kabinenboden = Perronhoehe, Oberkante 5,58 unter der Schiene.
  * Stuetze: Seilachse 14,20, Rollen liegen OBERHALB des Seils (Niederhalter-
    Batterie) -> Gondel auf z = 9,20 setzen, Oberkante 14,18 unter den Rollen.
"""
import bpy, bmesh, os, math, random
import mathutils

OUT_GLB = "/home/user/aban-news-landing/models"
OUT_STL = "/home/user/aban-news-landing/models/stl"
os.makedirs(OUT_STL, exist_ok=True)

RND = random.Random(26)

def neu():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # read_factory_settings(use_empty=True) reicht nicht immer — ein Default-Wuerfel
    # mit Unterkante -1,00 hat schon eine ganze Charge versaut.
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)

def nur(o):
    bpy.context.view_layer.objects.active = o
    for s_ in bpy.context.scene.objects: s_.select_set(False)
    o.select_set(True)

def mat(name, rgb, rough=0.7, metal=0.0, emit=None, estr=1.3, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], alpha)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = min(metal, 0.6)   # ueber 0.6 rendert es schwarz
    if "Alpha" in b.inputs: b.inputs["Alpha"].default_value = alpha
    if alpha < 1.0:
        for attr, val in (("surface_render_method", 'BLENDED'), ("blend_method", 'BLEND')):
            try: setattr(m, attr, val)
            except Exception: pass
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

def kugel(x, y, z, r, m=None, seg=14):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=seg, ring_count=max(6, seg//2))
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kegel(x, y, z, r1, r2, h, m=None, seg=12, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def ring(x, y, z, r, rr, m=None, seg=24, rseg=8, rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(location=(x,y,z), major_radius=r, minor_radius=rr,
                                     major_segments=seg, minor_segments=rseg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def runden(width=0.02, segments=2, winkel=42):
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': continue
        nur(o)
        # NIE nur rotation=True anwenden — mit nicht-uniformer Skalierung schert das die Box.
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
FB = 0.30   # Fussboden-Oberkante — Aussensockel UND Innenboden enden hier.

def boden(B, T, m_sockel, m_boden, rand=2.0):
    box(0, 0, FB/2, B + rand, T + rand, FB, m_sockel)     # Vorplatz
    box(0, 0, FB/2 + 0.01, B, T, FB, m_boden)             # Innenboden (2 cm gegen z-Fighting)

# ---------------------------------------------------------------- Waende
def wand_mit_tuer(cx, cy, laenge, dicke, hoehe, m, tuer_b=2.4, tuer_h=3.2,
                  achse='x', tuer_off=0.0):
    """Wand mit durchgehender Oeffnung: links + rechts + Sturz (kein Boolean noetig)."""
    seite = (laenge - tuer_b) / 2
    if achse == 'x':
        if seite > 0.01:
            box(cx + tuer_off - tuer_b/2 - seite/2, cy, hoehe/2, seite, dicke, hoehe, m)
            box(cx + tuer_off + tuer_b/2 + seite/2, cy, hoehe/2, seite, dicke, hoehe, m)
        if hoehe - tuer_h > 0.01:
            box(cx + tuer_off, cy, tuer_h + (hoehe-tuer_h)/2, tuer_b, dicke, hoehe-tuer_h, m)
    else:
        if seite > 0.01:
            box(cx, cy + tuer_off - tuer_b/2 - seite/2, hoehe/2, dicke, seite, hoehe, m)
            box(cx, cy + tuer_off + tuer_b/2 + seite/2, hoehe/2, dicke, seite, hoehe, m)
        if hoehe - tuer_h > 0.01:
            box(cx, cy + tuer_off, tuer_h + (hoehe-tuer_h)/2, dicke, tuer_b, hoehe-tuer_h, m)

def fensterband(cx, cy, laenge, dicke, zmit, hoehe, m_rahm, m_glas, n=3, achse='x'):
    """Glas knapp VOR die Wandflaeche — innen liegend waere es unsichtbar."""
    for i in range(n):
        t = (i + 0.5)/n - 0.5
        if achse == 'x':
            box(cx + t*laenge, cy, zmit, laenge/n*0.62, dicke*1.2, hoehe, m_rahm)
            box(cx + t*laenge, cy, zmit, laenge/n*0.50, dicke*1.5, hoehe*0.78, m_glas)
        else:
            box(cx, cy + t*laenge, zmit, dicke*1.2, laenge/n*0.62, hoehe, m_rahm)
            box(cx, cy + t*laenge, zmit, dicke*1.5, laenge/n*0.50, hoehe*0.78, m_glas)

def platte_mit_loch(cx, cy, z, B, T, dicke, lb, lt, m):
    """Platte mit rechteckigem Loch — vier Streifen. Hier: Ufergelaende um den See."""
    sv = (T - lt)/2.0
    sh = (B - lb)/2.0
    if sv > 0.01:
        box(cx, cy - lt/2 - sv/2, z, B, sv, dicke, m)
        box(cx, cy + lt/2 + sv/2, z, B, sv, dicke, m)
    if sh > 0.01:
        box(cx - lb/2 - sh/2, cy, z, sh, lt, dicke, m)
        box(cx + lb/2 + sh/2, cy, z, sh, lt, dicke, m)

# ---------------------------------------------------------------- Daecher
def satteldach(cx, cy, B, T, z0, fh, dicke, m, ueber_x=0.5, ueber_y=0.6):
    """Zwei geneigte Dachflaechen. Traufe exakt auf z0, First auf z0+fh."""
    bh = B/2 + ueber_x
    a  = math.atan2(fh, bh)
    L  = math.hypot(bh, fh)
    for s in (-1, 1):
        o = box(cx + s*bh/2, cy, z0 + fh/2, L, T + 2*ueber_y, dicke, m)
        o.rotation_euler[1] = s*a
    return a

def dachplatten(cx, cy, B, T, z0, fh, m1, m2, ueber_x=0.5, ueber_y=0.6,
                dicke=0.13, versatz=0.15, pl=1.35, pb=1.55):
    """Steinplatten auf die beiden Dachflaechen legen — versetzt entlang der
    Schraege, um `versatz` NORMAL zur Dachflaeche angehoben (senkrecht gerechnet
    waeren sie am First eingesunken und an der Traufe abgehoben)."""
    bh = B/2 + ueber_x
    a  = math.atan2(fh, bh)
    L  = math.hypot(bh, fh)
    TT = T + 2*ueber_y
    reihen  = max(2, int(round(L/pl)))
    spalten = max(2, int(round(TT/pb)))
    for s in (-1, 1):
        nx, nz = s*math.sin(a), math.cos(a)          # Flaechennormale
        for i in range(reihen):
            d  = (i + 0.5)*L/reihen                  # Abstand vom First entlang der Schraege
            px = cx + s*d*math.cos(a) + nx*versatz
            pz = z0 + fh - d*math.sin(a) + nz*versatz
            for j in range(spalten):
                py = cy - TT/2 + (j + 0.5)*TT/spalten + (0.10 if i % 2 else -0.10)
                o = box(px, py, pz, L/reihen*0.99, TT/spalten*0.94, dicke,
                        m1 if (i + j) % 2 == 0 else m2)
                o.rotation_euler[1] = s*a

# ---------------------------------------------------------------- Streben / Seile
def strebe_xz(x1, z1, x2, z2, y, breite_z, tiefe_y, m):
    L = math.hypot(x2-x1, z2-z1)
    o = box((x1+x2)/2, y, (z1+z2)/2, L, tiefe_y, breite_z, m)
    o.rotation_euler[1] = -math.atan2(z2-z1, x2-x1)
    return o

def strebe_yz(y1, z1, y2, z2, x, breite_z, tiefe_x, m):
    L = math.hypot(y2-y1, z2-z1)
    o = box(x, (y1+y2)/2, (z1+z2)/2, tiefe_x, L, breite_z, m)
    o.rotation_euler[0] = math.atan2(z2-z1, y2-y1)
    return o

def strebe_xy(x1, y1, x2, y2, z, breite, hoehe, m):
    L = math.hypot(x2-x1, y2-y1)
    o = box((x1+x2)/2, (y1+y2)/2, z, L, breite, hoehe, m)
    o.rotation_euler[2] = math.atan2(y2-y1, x2-x1)
    return o

def seil(p1, p2, r, m, seg=8):
    """Zylinder zwischen zwei Raumpunkten — Trag-, Hand- und Abspannseile."""
    a = mathutils.Vector(p1); b = mathutils.Vector(p2)
    v = b - a
    L = v.length
    if L < 1e-4: return None
    mid = (a + b)/2
    o = zyl(mid.x, mid.y, mid.z, r, L, m, seg)
    o.rotation_euler = v.to_track_quat('Z', 'Y').to_euler()
    return o

# ---------------------------------------------------------------- Gelaender / Treppe / Leiter
def gelaender(a0, a1, fest, z, m, hoehe=1.05, achse='x'):
    L = abs(a1 - a0)
    if L < 0.05: return
    c = (a0 + a1) / 2
    n = max(2, int(L / 1.4))
    if achse == 'x':
        box(c, fest, z + hoehe, L, 0.09, 0.09, m)
        for i in range(n + 1):
            box(a0 + (a1-a0)*i/n, fest, z + hoehe/2, 0.07, 0.07, hoehe, m)
    else:
        box(fest, c, z + hoehe, 0.09, L, 0.09, m)
        for i in range(n + 1):
            box(fest, a0 + (a1-a0)*i/n, z + hoehe/2, 0.07, 0.07, hoehe, m)

def bruestung(cx, cy, lb, lt, z, m, hoehe=1.05):
    gelaender(cx-lb/2, cx+lb/2, cy-lt/2, z, m, hoehe, 'x')
    gelaender(cx-lb/2, cx+lb/2, cy+lt/2, z, m, hoehe, 'x')
    gelaender(cy-lt/2, cy+lt/2, cx-lb/2, z, m, hoehe, 'y')
    gelaender(cy-lt/2, cy+lt/2, cx+lb/2, z, m, hoehe, 'y')

def treppe(cx, y0, z0, breite, hoehe_ges, m, m_gel=None, steig=0.17, auftritt=0.28,
           richtung=-1):
    """Lauf mit begehbarer Steigung. n = round(Hoehe/Steigung) — Lauflaenge NICHT raten."""
    n = max(1, int(round(hoehe_ges / steig)))
    st = hoehe_ges / n
    for i in range(n):
        box(cx, y0 + richtung*(i + 0.5)*auftritt, z0 + (i + 0.5)*st,
            breite, auftritt, st, m)
    if m_gel:
        for sx in (cx - breite/2 - 0.09, cx + breite/2 + 0.09):
            for i in range(0, n, 4):
                box(sx, y0 + richtung*(i + 0.5)*auftritt,
                    z0 + (i + 0.5)*st + 0.55, 0.06, 0.06, 1.10, m_gel)
            winkel = richtung * math.atan2(st, auftritt)
            laenge = math.hypot(auftritt, st) * 1.06
            for i in range(n):
                o = box(sx, y0 + richtung*(i + 0.5)*auftritt,
                        z0 + (i + 0.5)*st + 1.06, 0.07, laenge, 0.08, m_gel)
                o.rotation_euler[0] = winkel
    return n, y0 + richtung*n*auftritt, n*auftritt

def leiter(cx, cy, z0, z1, m, breite=0.52, sprosse=0.32, holm=0.06, achse='y'):
    """Senkrechte Steigleiter. achse='y': Holme in x versetzt, Leiter blickt nach +y."""
    h = z1 - z0
    for s in (-1, 1):
        if achse == 'y': box(cx + s*breite/2, cy, z0 + h/2, holm, holm*1.4, h, m)
        else:            box(cx, cy + s*breite/2, z0 + h/2, holm*1.4, holm, h, m)
    n = max(1, int(h / sprosse))
    for i in range(n):
        z = z0 + (i + 0.6)*h/n
        if achse == 'y': box(cx, cy, z, breite, holm*1.1, holm*0.8, m)
        else:            box(cx, cy, z, holm*1.1, breite, holm*0.8, m)

# ---------------------------------------------------------------- Fels-Helfer
def _zhalf(dims, rot):
    """Halbe z-Ausdehnung eines gedrehten Quaders — aus der echten Rotationsmatrix.
    Der senkrechte statt des achsnormalen Versatzes laesst gekippte Koerper unter
    null sinken; das betrifft in dieser Charge fast jeden Felsen."""
    M = mathutils.Euler(rot, 'XYZ').to_matrix()
    return 0.5*(abs(M[2][0])*dims[0] + abs(M[2][1])*dims[1] + abs(M[2][2])*dims[2])

def kipp_box(cx, cy, z0, sx, sy, sz, m, rot=(0,0,0)):
    """Gekippter Quader, dessen TIEFSTER Punkt exakt auf z0 liegt."""
    o = box(cx, cy, z0 + _zhalf((sx, sy, sz), rot), sx, sy, sz, m)
    o.rotation_euler = rot
    return o

def kipp_lift(sx, sy, sz, rx, ry, rz):
    """Halbe Hoehe eines um (rx,ry,rz) gekippten Quaders — also genau der Betrag, um
    den er angehoben werden muss, damit er nicht unter z=0 taucht.
    Nur `rx` zu beruecksichtigen reicht NICHT: eine zusaetzliche y-Kippung senkt die
    Ecke um sx*|sin ry| weiter ab (im Wasserfall gemessene -0,24)."""
    from mathutils import Euler
    R = Euler((rx, ry, rz), 'XYZ').to_matrix()
    return 0.5*(abs(R[2][0])*sx + abs(R[2][1])*sy + abs(R[2][2])*sz)

def fels(cx, cy, cz, r, m, seg=8, hoehe=1.0, rx=0.10, ry=-0.08):
    """Felsblock: Kegelstumpf mit wenigen Segmenten, leicht gekippt. Die Kippung
    senkt eine Seite ab; die Hebung wird herausgerechnet (Zoo-Charge: -0,08 gemessen).
    Konservativ ueber den umschliessenden Zylinder gerechnet."""
    h = r*hoehe
    lift = 0.5*abs(math.cos(rx)*math.cos(ry))*h + r*math.hypot(math.sin(ry), math.cos(ry)*math.sin(rx))
    o = kegel(cx, cy, cz + lift, r, r*0.55, h, m, seg)
    o.rotation_euler[0] = rx
    o.rotation_euler[1] = ry
    return o

def geroell(cx, cy, z0, B, T, n, m1, m2, rmin=0.25, rmax=0.75):
    """Streu aus kleinen Broeckchen — kaschiert die Fuge zwischen Fels und Boden."""
    for i in range(n):
        px = cx + RND.uniform(-B/2, B/2)
        py = cy + RND.uniform(-T/2, T/2)
        r  = RND.uniform(rmin, rmax)
        fels(px, py, z0 - r*0.18, r, m1 if i % 2 == 0 else m2, 7, 0.8,
             RND.uniform(-0.2, 0.2), RND.uniform(-0.2, 0.2))

def verwitterung(cx, cy, cz, laenge, tiefe, dicke, m, rot=(0,0,0)):
    """Vorspringende Verwitterungskante (Simsband) an einer Felsflanke."""
    return kipp_box(cx, cy, cz, laenge, tiefe, dicke, m, rot)

def baumstamm(cx, cy, z0, hoehe, r, m_stamm, m_laub, seg=8):
    zyl(cx, cy, z0 + hoehe/2, r, hoehe, m_stamm, seg)
    for dz, rr in ((hoehe*0.62, hoehe*0.40), (hoehe*0.92, hoehe*0.30), (hoehe*1.16, hoehe*0.18)):
        kegel(cx, cy, z0 + dz + rr*0.6, rr, rr*0.16, rr*1.9, m_laub, 10)

def schilf(cx, cy, z0, r, n, m_halm, m_kolben):
    """Schilfbuschel: duenne Halme mit leichter Neigung, ein paar Rohrkolben."""
    for i in range(n):
        a  = RND.uniform(0, math.tau)
        d  = RND.uniform(0, r)
        px, py = cx + math.cos(a)*d, cy + math.sin(a)*d
        h  = RND.uniform(1.0, 1.9)
        rx = RND.uniform(-0.14, 0.14); ry = RND.uniform(-0.14, 0.14)
        o = zyl(px, py, z0 + 0.5*h*math.cos(rx)*math.cos(ry), 0.035, h, m_halm, 6)
        o.rotation_euler[0] = rx; o.rotation_euler[1] = ry
        if i % 4 == 0:
            zyl(px + math.sin(ry)*h*0.5, py - math.sin(rx)*h*0.5,
                z0 + h*0.94, 0.075, 0.34, m_kolben, 6)

# ================================================================ 1) Felsformation
def felsformation():
    """Grosse Felsgruppe ~14 m: mehrere verschachtelte Bloecke mit Verwitterungskanten."""
    neu()
    F1  = mat("Fels", (0.44,0.43,0.40), 0.93)
    F2  = mat("FelsDunkel", (0.33,0.32,0.30), 0.94)
    F3  = mat("FelsHell", (0.56,0.54,0.49), 0.90)
    F4  = mat("Verwitterung", (0.48,0.42,0.34), 0.95)
    ERD = mat("Bergerde", (0.24,0.19,0.13), 0.96)      # dunkel angesetzt: rendert heller
    MOO = mat("Moos", (0.19,0.33,0.15), 0.95)
    SCH = mat("Firn", (0.88,0.90,0.93), 0.55)
    # --- Gelaendesockel
    box(0, 0, 0.30, 18.0, 15.0, 0.60, ERD)
    box(0, 0, 0.62, 13.0, 10.5, 0.10, F4)
    # --- Hauptbloecke, ineinander verschachtelt (Ueberlappung ist gewollt)
    kipp_box(-3.4,  1.2, 0.0,  6.6, 5.6, 12.2, F1, (0.055, -0.045,  0.34))
    kipp_box( 2.6, -1.0, 0.0,  5.6, 5.0, 13.6, F2, (-0.045, 0.050, -0.62))
    kipp_box( 0.2,  2.6, 0.0,  5.0, 4.4,  8.6, F3, (0.070, 0.035,  1.05))
    kipp_box(-5.4, -2.4, 0.0,  4.6, 4.2,  7.4, F2, (-0.060, -0.055, -0.30))
    kipp_box( 5.6,  2.2, 0.0,  4.2, 4.0,  6.2, F1, (0.050, 0.060,  0.75))
    kipp_box(-0.6, -3.6, 0.0,  5.4, 3.6,  5.0, F3, (0.080, -0.030,  0.15))
    kipp_box( 4.4, -3.4, 0.0,  3.6, 3.2,  3.8, F2, (-0.070, 0.040, -0.85))
    kipp_box(-6.6,  2.6, 0.0,  3.4, 3.0,  4.4, F1, (0.060, -0.070,  0.45))
    # --- Aufgesetzte Kappen (die Bloecke laufen oben nicht flach aus)
    kipp_box( 2.9, -0.6, 12.4, 3.4, 3.0, 1.6, F3, (0.10, -0.09, -0.62))
    kipp_box(-3.2,  1.4, 11.0, 3.8, 3.2, 1.5, F1, (-0.09, 0.11, 0.34))
    box(2.9, -0.6, 14.02, 2.6, 2.3, 0.22, SCH)        # Firnhaeubchen
    # --- Verwitterungskanten: vorspringende Simse in mehreren Hoehen
    for (px, py, pz, lx, ly, dz, rot) in (
            (-3.4,  3.7,  3.0, 6.4, 1.5, 0.42, ( 0.09, -0.04,  0.34)),
            (-3.4,  3.6,  6.6, 5.6, 1.3, 0.36, (-0.07, -0.05,  0.34)),
            (-3.4,  3.5,  9.4, 4.6, 1.1, 0.30, ( 0.06, -0.03,  0.34)),
            ( 2.6,  1.4,  4.4, 5.4, 1.4, 0.40, (-0.08,  0.05, -0.62)),
            ( 2.6,  1.3,  8.2, 4.6, 1.2, 0.34, ( 0.07,  0.04, -0.62)),
            ( 2.6,  1.2, 11.2, 3.6, 1.0, 0.28, (-0.06,  0.05, -0.62)),
            (-5.6, -0.4,  2.4, 4.4, 1.3, 0.36, ( 0.08, -0.06, -0.30)),
            (-5.6, -0.5,  5.2, 3.4, 1.1, 0.30, (-0.06, -0.05, -0.30)),
            ( 5.7,  4.2,  2.6, 4.0, 1.2, 0.34, ( 0.07,  0.06,  0.75)),
            ( 0.2,  4.6,  4.6, 4.6, 1.2, 0.34, ( 0.09,  0.03,  1.05)),
            (-0.6, -5.2,  2.2, 5.0, 1.3, 0.36, ( 0.08, -0.03,  0.15))):
        verwitterung(px, py, pz, lx, ly, dz, F4, rot)
    # --- Kluefte: schmale dunkle Spalten in den Flanken
    for (px, py, pz, hz, rot) in ((-1.4, 3.9, 1.0, 8.4, (0, 0.05, 0.34)),
                                  ( 4.6, 1.5, 1.0, 9.6, (0, -0.04, -0.62)),
                                  (-6.4, -0.2, 0.8, 5.4, (0, 0.06, -0.30))):
        kipp_box(px, py, pz, 0.34, 0.9, hz, F2, rot)
    # --- Bewuchs und Geroell
    for (px, py, pz, r) in ((-3.4, 4.2, 3.30, 1.5), (2.6, 1.9, 4.68, 1.4),
                            (-5.6, 0.1, 2.68, 1.2), (0.2, 5.1, 4.90, 1.3)):
        kugel(px, py, pz, r*0.45, MOO, 10)
    geroell(0, 0, 0.62, 16.0, 13.0, 26, F1, F3, 0.28, 0.85)
    for (px, py, r, h) in ((-7.6, -4.6, 1.5, 1.3), (7.4, -4.4, 1.3, 1.1),
                           (7.8,  4.8, 1.2, 1.2), (-8.0, 5.0, 1.1, 1.0)):
        fels(px, py, 0.55, r, F1, 8, h, RND.uniform(-0.14, 0.14), RND.uniform(-0.14, 0.14))
    export("th26_felsformation", 0.030, 2)

# ================================================================ 2) Felswand-Modul
def felswand_modul():
    """Steilwand-Modul, exakt 12,000 m breit und 16,000 m hoch, reihbar x += 12,0.
    ALLE Baender und Vorspruenge sind 12,0 m lang bei cx = 0 und nur um die
    X-Achse gekippt -> das Profil ist laengs x konstant, die Fuge verschwindet.
    Einzelbloecke bleiben innerhalb |x| <= 5,35, damit das Raster haelt."""
    neu()
    F1  = mat("Wandfels", (0.45,0.44,0.41), 0.93)
    F2  = mat("WandfelsDunkel", (0.32,0.31,0.29), 0.94)
    F3  = mat("WandfelsHell", (0.57,0.55,0.50), 0.90)
    F4  = mat("Band", (0.50,0.44,0.35), 0.95)
    MOO = mat("Wandmoos", (0.20,0.34,0.16), 0.95)
    SCH = mat("Firn", (0.88,0.90,0.93), 0.55)
    ERD = mat("Schutt", (0.30,0.26,0.20), 0.96)
    BR = 12.0
    # --- Grundkoerper: x exakt -6,0 .. +6,0 , z exakt 0 .. 16,0
    box(0, -0.20, 8.00, BR, 2.20, 16.00, F1)
    box(0,  0.62, 4.20, BR, 0.60, 8.40, F2)          # leicht vorstehender Wandfuss
    # --- Schutthalde am Fuss (durchlaufend)
    # Gekippter Quader: die halbe Hoehe ist (T*|sin a| + H*|cos a|)/2 = 0.834, nicht H/2.
    # Bei z=0.62 tauchte die Schutthalde damit auf -0.21 ab.
    o = box(0, 1.75, 0.84, BR, 2.10, 1.24, ERD); o.rotation_euler[0] = -0.22
    box(0, 1.15, 1.28, BR, 1.10, 0.34, F4)
    # --- Baender und Vorspruenge: nur Kippung um x, damit sie durchlaufen
    for (py, pz, ty, dz, rx, m) in ((1.05,  3.30, 1.35, 0.55,  0.16, F4),
                                    (0.80,  5.60, 0.95, 0.38, -0.12, F3),
                                    (1.25,  7.90, 1.70, 0.70,  0.20, F4),
                                    (0.78, 10.30, 0.95, 0.36, -0.14, F3),
                                    (1.05, 12.60, 1.30, 0.52,  0.15, F4),
                                    (0.75, 14.60, 0.90, 0.34, -0.10, F3)):
        o = box(0, py, pz, BR, ty, dz, m); o.rotation_euler[0] = rx
    # --- Durchlaufende Kaminspur / Wasserrinne (Profil laengs x konstant)
    for (py, pz, ty, dz, rx) in ((0.55, 2.20, 0.50, 1.30, 0.10),
                                 (0.42, 6.90, 0.44, 1.70, -0.08),
                                 (0.48, 11.50, 0.46, 1.60, 0.09)):
        o = box(0, py, pz, BR, ty, dz, F2); o.rotation_euler[0] = rx
    # --- Einzelbloecke: NUR innerhalb |x| <= 5,35, sonst sprengen sie das Raster
    for (px, py, pz, sx, sy, sz, rot, m) in (
            (-3.60, 1.05,  1.60, 2.60, 1.30, 2.40, ( 0.10, -0.07,  0.20), F3),
            ( 3.20, 1.10,  1.20, 2.40, 1.20, 2.00, (-0.09,  0.06, -0.24), F1),
            ( 0.20, 1.15,  3.62, 2.20, 1.10, 2.30, ( 0.08,  0.05,  0.30), F1),
            (-4.10, 0.95,  5.95, 1.90, 0.95, 1.80, (-0.07, -0.06, -0.18), F3),
            ( 4.05, 1.00,  6.05, 1.80, 0.90, 1.70, ( 0.09,  0.05,  0.22), F2),
            (-1.10, 1.45,  8.30, 2.40, 1.10, 2.10, ( 0.07, -0.04,  0.26), F3),
            ( 3.70, 1.35,  8.45, 2.00, 1.00, 1.60, (-0.08,  0.06, -0.20), F1),
            (-3.90, 0.90, 10.75, 1.70, 0.85, 1.50, ( 0.08, -0.05,  0.16), F1),
            ( 1.30, 0.95, 10.60, 1.90, 0.90, 1.70, (-0.07,  0.04, -0.28), F3),
            (-1.90, 1.20, 13.05, 2.10, 1.00, 1.60, ( 0.09, -0.05,  0.24), F1),
            ( 4.00, 1.15, 13.00, 1.80, 0.90, 1.40, (-0.08,  0.05, -0.18), F2)):
        kipp_box(px, py, pz, sx, sy, sz, m, rot)
    # --- Moospolster und Firn (alles innerhalb des Rasters)
    for (px, pz) in ((-4.6, 3.75), (2.1, 6.05), (-0.9, 8.75), (4.3, 10.75), (-3.1, 13.35)):
        kugel(px, 1.35, pz, 0.42, MOO, 10)
    box(0, 0.10, 15.92, BR, 2.55, 0.16, SCH)         # Firndecke, Oberkante exakt 16,00
    export("th26_felswand_modul", 0.024, 2)

# ================================================================ 3) Wasserfall
def wasserfall():
    """Felsstufe mit herabstuerzendem Wasser, Gischtbecken und nassen Steinen.
    Wasser als EINGEFAERBTE Flaechen — geschichtete Glaskoerper sortiert three.js
    nicht zuverlaessig und der Fels dahinter verschwindet."""
    neu()
    F1  = mat("Fels", (0.40,0.39,0.36), 0.94)
    F2  = mat("FelsDunkel", (0.26,0.25,0.24), 0.95)
    F3  = mat("FelsHell", (0.52,0.50,0.45), 0.90)
    NAS = mat("NasserFels", (0.17,0.18,0.19), 0.24)
    WAS = mat("Wasser", (0.44,0.68,0.80), 0.16, 0.15)
    WAS2= mat("WasserTief", (0.20,0.42,0.56), 0.14, 0.15)
    SCHAUM= mat("Gischt", (0.90,0.94,0.96), 0.55)
    STURZ= mat("Sturzwasser", (0.80,0.90,0.95), 0.20, 0.10)
    MOO = mat("Moos", (0.19,0.33,0.16), 0.95)
    GRAS= mat("Ufergras", (0.26,0.42,0.20), 0.94)
    KIES= mat("Kies", (0.34,0.32,0.29), 0.96)
    HK = 9.6                                    # Fallhoehe

    box(0, 0, 0.10, 24.0, 24.0, 0.20, KIES)     # Sohle
    # --- Felskessel: gestaffelte, gekippte Bloecke statt zweier glatter Platten
    # Geschlossene Wand mit Schlucht statt freistehender Bloecke: einzelne gekippte
    # Quader lesen sich als umfallende Platten, nie als Felskessel. Die Wand laeuft
    # durch, die Kerbe entsteht durch die Luecke zwischen linkem und rechtem Massiv.
    for sgn in (-1, 1):
        box(sgn*8.6, -6.2, 6.6, 10.0, 5.6, 13.2, F1)          # Hauptmassiv
        box(sgn*7.0, -3.0, 4.6, 5.2, 4.0,  9.2, F2)           # vorspringender Pfeiler
        box(sgn*10.4, -1.4, 3.2, 4.4, 5.0,  6.4, F3)          # Vorbau zum Ufer
        for k in range(4):                                    # gestufte Absaetze
            o = box(sgn*(4.4 + k*0.55), -5.0 + k*0.35, 2.0 + k*2.7,
                    2.6 - k*0.35, 3.2, 1.10, F3 if k % 2 else F2)
            o.rotation_euler = (0.09, -sgn*0.07, sgn*0.13)
    box(0, -8.6, 7.0, 9.4, 2.6, 14.0, F2)                     # Rueckwand der Schlucht
    box(0, -7.6, 11.6, 8.0, 1.6,  4.8, F1)                    # Ueberhang ueber der Lippe
    for k in range(5):                          # Gesimse / Baender in der Wand
        o = box(-0.4 + (k % 2)*0.8, -6.9, 2.4 + k*1.9, 11.0 - k*0.9, 1.5, 0.55, F3)
        o.rotation_euler[0] = 0.10 + (k % 2)*0.06
    # --- Abrisskante und Sturzbahn
    box(0, -6.5, HK + 0.18, 6.4, 2.6, 0.36, NAS)          # nasse Felslippe
    box(0, -5.9, HK + 0.34, 5.6, 1.6, 0.18, WAS)          # anlaufendes Wasser
    for (bx, bw, vor) in ((-1.9, 1.7, 0.00), (0.0, 2.3, 0.06), (1.9, 1.6, 0.02)):
        # drei Straehnen unterschiedlicher Breite — eine glatte Platte wirkt wie Papier
        box(bx, -5.72 + vor, HK/2 + 0.30, bw, 0.30, HK - 0.30, STURZ)
        box(bx, -5.60 + vor, HK/2 + 0.30, bw*0.55, 0.16, HK - 0.30, WAS)
    for k in range(9):                                    # Spritzer laengs der Bahn
        zz = 1.2 + k*0.95
        kugel_w = 0.30 + (k % 3)*0.13
        for sx2 in (-1, 1):
            bpy.ops.mesh.primitive_uv_sphere_add(
                radius=kugel_w, location=(sx2*(2.5 + (k % 4)*0.28), -5.30, zz),
                segments=10, ring_count=6)
            bpy.context.active_object.data.materials.append(SCHAUM)
    # --- Becken: gefuellte Flaeche, Gischtring NUR am Aufschlag
    zyl(0, -1.4, 0.24, 7.2, 0.28, WAS2, 30)
    zyl(0, -1.4, 0.40, 6.4, 0.12, WAS, 30)
    for i in range(22):                                   # Gischtring am Aufschlagpunkt
        a = i/22*math.tau
        rk = 0.42 + (i % 3)*0.14
        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=rk,                                    # Mitte mindestens auf rk,
            location=(math.cos(a)*2.5, -4.3 + math.sin(a)*1.7, max(0.46, rk)),
            segments=10, ring_count=6)                    # sonst taucht die Kugel ab
        bpy.context.active_object.data.materials.append(SCHAUM)
    box(0, -4.3, 0.52, 4.6, 2.6, 0.16, SCHAUM)            # Schaumteppich
    for i in range(3):                                    # abziehende Schaumbaender
        o = zyl(0, -1.0 + i*1.5, 0.47, 4.6 - i*0.9, 0.06, SCHAUM, 26)
    geroell(0, -1.6, 0.20, 20.0, 16.0, 46, F2, F3, 0.22, 0.85)   # Bruch am Wandfuss
    box(0, 5.6, 0.30, 5.0, 5.6, 0.24, WAS)                # Abfluss
    box(0, 5.6, 0.42, 3.4, 5.6, 0.10, WAS2)
    # --- Uferbloecke, Moos, Gras
    for (px, py, rr, hh, m) in ((-6.8, 1.6, 1.5, 1.9, F1), (-4.6, 4.2, 1.1, 1.4, F2),
                                ( 6.4, 1.2, 1.6, 2.1, F1), ( 4.4, 4.6, 1.2, 1.5, F3),
                                (-2.6, -0.2, 0.9, 1.1, NAS), ( 2.4, 0.4, 1.0, 1.2, NAS)):
        fels(px, py, 0.20, rr, m, 9, hh/rr)
    for k in range(14):
        a = k/14*math.tau
        px, py = math.cos(a)*7.6, -1.4 + math.sin(a)*7.0
        kegel(px, py, 0.20 + 0.34, 0.42, 0.06, 0.68, GRAS, 6)
    for (px, py, rr) in ((-3.1, -5.6, 0.7), (3.2, -5.4, 0.6), (-1.4, -6.2, 0.5),
                         (1.6, -6.4, 0.55)):
        zyl(px, py, 0.22 + 0.08, rr, 0.16, MOO, 12)
    
    export("th26_wasserfall", 0.026, 2)

# ================================================================ 4) Hoehleneingang
def hoehleneingang():
    """Begehbares Hoehlenportal mit Tropfsteinen und dunklem Gang.
    Portal 6,0 m breit und 6,6 m licht, Gang 16 m tief."""
    neu()
    F1  = mat("Fels", (0.43,0.42,0.39), 0.93)
    F2  = mat("FelsDunkel", (0.29,0.28,0.27), 0.94)
    F3  = mat("FelsHell", (0.56,0.54,0.49), 0.90)
    DKL = mat("Hoehlenwand", (0.13,0.13,0.14), 0.95)   # dunkel angesetzt
    BOD = mat("Hoehlenboden", (0.24,0.23,0.22), 0.92)
    SOK = mat("Vorplatz", (0.44,0.43,0.40), 0.94)
    TRO = mat("Tropfstein", (0.68,0.62,0.52), 0.55)
    NAS = mat("NasserFels", (0.19,0.20,0.21), 0.30)
    WAS = mat("Hoehlensee", (0.20,0.44,0.52), 0.15, 0.0, (0.10,0.28,0.36), 0.4)
    KRI = mat("Leuchtkristall", (0.42,0.82,0.92), 0.20, 0.0, (0.30,0.76,0.94), 2.2)
    HOL = mat("Steg", (0.36,0.26,0.16), 0.86)
    MOO = mat("Moos", (0.18,0.32,0.15), 0.95)
    B, T = 18.0, 20.0
    OEB, OEH = 6.0, 6.6                       # lichte Portalbreite / -hoehe
    boden(B, T, SOK, BOD, 4.0)
    # --- Massiv: zwei Flanken + Sturz
    kipp_box(-7.2, -1.0, 0.0, 7.8, 17.0, 11.4, F1, (0.0,  0.045,  0.05))
    kipp_box( 7.2, -1.0, 0.0, 7.8, 17.0, 10.6, F2, (0.0, -0.050, -0.04))
    box(0, -1.0, 8.80, 7.2, 17.0, 4.40, F1)                   # Sturz ueber dem Gang
    box(0,  7.6, 8.90, 8.6,  2.4, 4.20, F3)                   # Portalstirn
    for s in (-1, 1):                                          # angeschraegte Portalecken
        kipp_box(s*3.9, 7.4, 4.2, 2.6, 2.6, 3.0, F3, (0.0, -s*0.28, 0.0))
    kipp_box(-2.4, 8.2, 8.0, 3.4, 2.2, 2.6, F1, ( 0.10, -0.08,  0.22))
    kipp_box( 2.8, 8.4, 8.4, 3.0, 2.0, 2.4, F2, (-0.09,  0.07, -0.26))
    # --- Ganginnenwaende (Fels bis an den Sturz)
    for s in (-1, 1):
        box(s*4.6, -1.0, (FB + 6.6)/2 + 0.0, 3.2, 17.0, 6.6 - FB + 0.6, F2)
    box(0, -9.2, (FB + 8.8)/2, 8.0, 2.2, 8.8 - FB, DKL)        # Abschlusswand des Gangs
    box(0, -8.0, 3.60, 6.4, 0.6, 6.20, DKL)
    # --- Deckengewoelbe im Gang (leicht abgetreppte Bloecke, dunkel)
    for i in range(7):
        py = 6.4 - i*2.4
        box(0, py, 6.90 - (0.10 if i % 2 else 0.0), 6.2, 1.9, 0.70, DKL)
        for s in (-1, 1):
            kipp_box(s*2.5, py, 4.6, 1.4, 1.7, 2.0, DKL, (0.0, -s*0.16, 0.0))
    # --- Tropfsteine von der Decke (Kegel: r1 unten spitz, r2 oben breit)
    for i in range(18):
        px = RND.uniform(-2.5, 2.5); py = RND.uniform(-7.4, 6.6)
        h  = RND.uniform(0.9, 2.4);  r = RND.uniform(0.14, 0.34)
        kegel(px, py, 6.55 - h/2, 0.03, r, h, TRO, 8)
    # --- Stalagmiten vom Boden
    for i in range(13):
        px = RND.choice([RND.uniform(-2.7, -1.5), RND.uniform(1.5, 2.7)])
        py = RND.uniform(-7.6, 6.4)
        h  = RND.uniform(0.7, 2.0);  r = RND.uniform(0.16, 0.38)
        kegel(px, py, FB + h/2, r, 0.04, h, TRO, 8)
    # --- Zwei Saeulen, wo sie zusammengewachsen sind
    for (px, py, r) in ((-2.1, 1.8, 0.34), (2.3, -3.4, 0.30)):
        zyl(px, py, (FB + 6.55)/2, r, 6.55 - FB, TRO, 10)
        kegel(px, py, FB + 0.55, r*1.9, r, 1.10, TRO, 10)
        kegel(px, py, 6.00, r, r*1.9, 1.10, TRO, 10)
    # --- Kleiner Hoehlensee hinten links + Leuchtkristalle
    box(-2.0, -6.4, FB + 0.05, 3.0, 3.6, 0.10, WAS)
    for (px, py, pz, r) in ((-3.6, -5.0, 2.6, 0.24), (3.4, -6.2, 3.4, 0.20),
                            (-3.2, 0.6, 4.2, 0.22), (3.2, 2.8, 2.2, 0.18),
                            (0.0, -8.4, 4.6, 0.26)):
        kegel(px, py, pz, r, 0.03, r*2.6, KRI, 6, rot=(0, math.pi/2 if px > 0 else -math.pi/2, 0))
    # --- Bohlensteg im Gang, damit man den Boden liest
    for i in range(16):
        box(0, 6.6 - i*1.05, FB + 0.06, 3.0, 0.90, 0.12, HOL)
    for s in (-1, 1):
        box(s*1.60, -0.6, FB + 0.10, 0.12, 15.0, 0.20, HOL)
    # --- Aussen: Geroell, Moos, Wegweiser
    geroell(0, 10.4, FB, 16.0, 6.0, 20, F1, F3, 0.24, 0.70)
    for (px, py, pz) in ((-4.4, 8.6, 6.1), (4.6, 8.8, 5.9), (-6.8, 9.4, 2.2), (6.6, 9.2, 2.0)):
        kugel(px, py, pz, 0.55, MOO, 10)
    box(-6.0, 9.6, FB + 1.05, 0.16, 0.16, 2.10, HOL)
    box(-6.0, 9.52, FB + 1.85, 1.50, 0.10, 0.55, F3)
    for (px, py, r) in ((-8.6, 9.8, 1.3), (8.4, 9.6, 1.2), (-9.4, 5.4, 1.1), (9.2, 5.2, 1.0)):
        fels(px, py, FB, r, F1, 8, 1.1, RND.uniform(-0.14, 0.14), RND.uniform(-0.14, 0.14))
    for (px, py, r) in ((-2.8, -5.4, 0.7), (2.6, -7.0, 0.6), (-1.2, -8.2, 0.55)):
        fels(px, py, FB, r, NAS, 7, 1.0, RND.uniform(-0.14, 0.14), RND.uniform(-0.14, 0.14))
    export("th26_hoehleneingang", 0.024, 2)

# ---------------------------------------------------------------- Blockbau-Helfer
def blockwand(cx, cy, laenge, z0, z1, m, achse='x', r=0.17, luecken=(), ueber=0.0):
    """Blockhaus-Wand aus gestapelten Rundhoelzern. `luecken` = [(a0, a1, zu, zo)]
    in Wandkoordinaten (a laeuft entlang der Wandachse, relativ zu cx bzw. cy).
    Fuer Tuer und Fenster: die Stammlage wird an der Luecke geteilt, nicht gelocht."""
    step = r*1.90
    n = max(1, int(round((z1 - z0)/step)))
    step = (z1 - z0)/n
    for i in range(n):
        z = z0 + (i + 0.5)*step
        segs = [(-laenge/2 - ueber, laenge/2 + ueber)]
        for (a0, a1, zu, zo) in luecken:
            if zu < z < zo:
                neue = []
                for (s0, s1) in segs:
                    if a1 <= s0 or a0 >= s1: neue.append((s0, s1)); continue
                    if s0 < a0: neue.append((s0, a0))
                    if a1 < s1: neue.append((a1, s1))
                segs = neue
        for (s0, s1) in segs:
            L = s1 - s0
            if L < 0.14: continue
            c = (s0 + s1)/2
            if achse == 'x': zyl(cx + c, cy, z, r, L, m, 10, rot=(0, math.pi/2, 0))
            else:            zyl(cx, cy + c, z, r, L, m, 10, rot=(math.pi/2, 0, 0))
    return n, step

# ================================================================ 5) Berghuette
def berghuette():
    """BEGEHBAR: Blockhuette mit flachem Steindach, Stube mit Ofen, Tisch, Baenken,
    Vordach mit Holzstapel."""
    neu()
    HOL = mat("Blockholz", (0.42,0.28,0.16), 0.86)
    HOL2= mat("Bauholz", (0.34,0.22,0.13), 0.86)
    DIE = mat("Diele", (0.50,0.35,0.19), 0.78)
    SOK = mat("Steinsockel", (0.44,0.43,0.40), 0.93)
    STE = mat("Dachstein", (0.40,0.40,0.39), 0.90)
    STE2= mat("Dachstein2", (0.32,0.33,0.33), 0.90)
    OFN = mat("Ofenkachel", (0.66,0.60,0.50), 0.70)
    OFN2= mat("Ofenblech", (0.20,0.20,0.21), 0.45, 0.35)
    GLA = mat("Fensterglas", (0.58,0.72,0.80), 0.14)
    STO = mat("Stoff", (0.58,0.18,0.16), 0.88)
    MET = mat("Beschlag", (0.42,0.44,0.46), 0.40, 0.5)
    FEU = mat("Feuer", (1.0,0.62,0.22), 0.30, 0.0, (1.0,0.52,0.16), 2.6)
    LAM = mat("Lampe", (1.0,0.93,0.76), 0.30, 0.0, (1.0,0.88,0.64), 1.8)
    GES = mat("Geschirr", (0.86,0.85,0.80), 0.55)
    B, T, WH = 13.0, 11.0, 4.30      # Wandhoehe ueber FB
    TB, TH = 3.00, 3.20              # Tuer
    boden(B, T, SOK, DIE, 3.6)
    box(0, 0, 0.16, B + 1.0, T + 1.0, 0.32, SOK)              # Steinsockel unter der Schwelle
    # --- Blockwaende (Ecken kreuzen sich, Ueberstand 0,45)
    blockwand(0,  T/2, B, FB, FB + WH, HOL, 'x', 0.17,
              luecken=[(-TB/2, TB/2, FB - 0.1, FB + TH)], ueber=0.45)
    blockwand(0, -T/2, B, FB, FB + WH, HOL, 'x', 0.17,
              luecken=[(-3.4, -1.4, FB + 1.30, FB + 2.60),
                       ( 1.4,  3.4, FB + 1.30, FB + 2.60)], ueber=0.45)
    for s in (-1, 1):
        blockwand(s*B/2, 0, T, FB, FB + WH, HOL, 'y', 0.17,
                  luecken=[(-1.1, 1.1, FB + 1.30, FB + 2.60)], ueber=0.0)
    # --- Fenster in die Luecken
    for (px, py, sx, sy) in ((-2.4, -T/2, 2.0, 0.34), (2.4, -T/2, 2.0, 0.34),
                             (-B/2, 0, 0.34, 2.2), (B/2, 0, 0.34, 2.2)):
        box(px, py, FB + 1.95, sx, sy, 1.30, HOL2)
        box(px*1.02, py*1.02, FB + 1.95, sx*0.86, sy*0.86, 1.10, GLA)
        if abs(py) > 1:                                        # Laeden nur an der Rueckwand
            for k in (-1, 1):
                box(px + k*(sx/2 + 0.42), py - 0.22, FB + 1.95, 0.80, 0.10, 1.30, STO)
    # --- Tuer (offen, ein Fluegel nach aussen)
    box(0, T/2 + 0.02, FB + TH + 0.18, TB + 0.6, 0.26, 0.36, HOL2)     # Sturzbalken
    box(-TB/2 - 0.10, T/2 + 0.62, FB + 1.55, 0.16, 1.30, 3.00, HOL2)
    box( TB/2 + 0.10, T/2 + 0.05, FB + 1.55, 0.16, 0.30, 3.00, HOL2)
    box(0, T/2 + 0.05, FB + 0.06, TB, 0.60, 0.12, DIE)                 # Schwelle buendig
    # --- Flaches Steindach (Firsthoehe nur 1,0 m auf 13 m Breite = 8,6 Grad)
    DZ = FB + WH
    satteldach(0, 0, B, T, DZ, 1.00, 0.20, STE2, 0.65, 0.75)
    dachplatten(0, 0, B, T, DZ, 1.00, STE, STE2, 0.65, 0.75, 0.12, 0.16, 1.30, 1.45)
    box(0, 0, DZ + 1.06, 0.55, T + 1.6, 0.22, STE2)                    # Firstabdeckung
    for (px, py) in ((-4.6, -3.4), (-2.2, 2.8), (2.4, -1.6), (4.8, 3.2), (0.6, 4.2)):
        fels(px, py, DZ + 1.00 - abs(px)/(B/2 + 0.65)*1.00 + 0.10, 0.42, STE, 7, 0.8, 0.05, 0.04)
    # --- Vordach mit Holzstapel
    for s in (-1, 1):
        box(s*5.4, T/2 + 3.10, FB + 1.55, 0.26, 0.26, 3.10, HOL2)
        strebe_yz(T/2 + 0.35, FB + 2.60, T/2 + 2.95, FB + 3.05, s*5.4, 0.16, 0.20, HOL2)
    box(0, T/2 + 3.10, FB + 3.18, 11.4, 0.28, 0.26, HOL2)
    o = box(0, T/2 + 1.75, FB + 3.42, 11.8, 3.30, 0.18, HOL2); o.rotation_euler[0] = -0.14
    for i in range(9):                                                  # Holzstapel unterm Dach
        for k in range(6 - i//3):
            zyl(-4.6 + (i % 3)*0.0 + 0.0, 0, 0, 0.001, 0.001, HOL2, 4) if False else None
    for lay in range(6):
        for i in range(7):
            zyl(-5.0 + 0.34*0, T/2 + 1.05 + i*0.36, FB + 0.20 + lay*0.33,
                0.17, 2.60, HOL2, 8, rot=(0, math.pi/2, 0)) if i < 7 - lay//2 else None
    box(-5.0, T/2 + 2.30, FB + 0.05, 2.80, 3.00, 0.10, SOK)             # Unterlage
    # --- Stube
    box(-4.4, -3.2, FB + 1.10, 1.90, 1.50, 2.20, OFN)                   # Ofen
    box(-4.4, -3.2, FB + 2.28, 2.10, 1.70, 0.16, OFN2)
    box(-4.4, -2.40, FB + 0.62, 0.90, 0.14, 0.80, OFN2)                 # Ofentuer
    box(-4.4, -2.34, FB + 0.62, 0.70, 0.08, 0.60, FEU)
    zyl(-4.4, -3.2, FB + 3.35, 0.16, 2.00, OFN2, 10)                    # Rauchrohr
    box(-4.4, -1.55, FB + 0.30, 2.30, 0.55, 0.60, SOK)                  # Ofenbank
    box(0.4, 0.6, FB + 0.72, 3.20, 1.30, 0.10, HOL2)                    # Tisch
    for (sx, sy) in ((-1.4, -0.5), (1.4, -0.5), (-1.4, 0.5), (1.4, 0.5)):
        box(0.4 + sx, 0.6 + sy, FB + 0.34, 0.14, 0.14, 0.68, HOL2)
    for sy in (-1.05, 1.05):                                            # Baenke
        box(0.4, 0.6 + sy, FB + 0.44, 3.20, 0.42, 0.09, HOL2)
        for sx in (-1.35, 1.35):
            box(0.4 + sx, 0.6 + sy, FB + 0.20, 0.14, 0.38, 0.40, HOL2)
    box(0.4, 0.6, FB + 0.78, 0.34, 0.34, 0.06, GES)
    zyl(-0.6, 0.6, FB + 0.84, 0.13, 0.18, GES, 10)
    zyl( 1.4, 0.6, FB + 0.84, 0.13, 0.18, GES, 10)
    box(4.6, -3.4, FB + 0.30, 2.60, 1.90, 0.60, HOL2)                   # Pritsche
    box(4.6, -3.4, FB + 0.66, 2.60, 1.90, 0.14, STO)
    box(4.6, -4.25, FB + 0.72, 2.60, 0.24, 0.30, STO)
    box(5.9, 1.2, FB + 1.20, 0.40, 2.60, 0.08, HOL2)                    # Wandregal
    box(5.9, 1.2, FB + 1.75, 0.40, 2.60, 0.08, HOL2)
    for i in range(5):
        zyl(5.9, 0.1 + i*0.5, FB + 1.34, 0.11, 0.20, GES, 8)
        box(5.9, 0.1 + i*0.5, FB + 1.90, 0.24, 0.24, 0.22, GES)
    zyl(0.4, 0.6, FB + 3.50, 0.04, 1.00, MET, 6)                        # Haengelampe
    kegel(0.4, 0.6, FB + 2.88, 0.40, 0.12, 0.34, MET, 12)
    kugel(0.4, 0.6, FB + 2.76, 0.18, LAM, 10)
    for s in (-1, 1):                                                   # Deckenbalken
        for i in range(5):
            box(0, -4.0 + i*2.0, FB + WH - 0.16, B - 0.4, 0.22, 0.26, HOL2) if s < 0 else None
    export("th26_berghuette", 0.020, 2)

# ================================================================ 6) Seilbahn-Station
def seilbahn_station():
    """BEGEHBAR: Bergstation mit Umlenkscheibe, Perron, Gelaender, Antriebsraum.
    Perron-Oberkante 0,60 = Kabinenboden der Gondel; Seil 5,66; Schiene 5,86."""
    neu()
    BET = mat("Stationsbeton", (0.60,0.58,0.55), 0.86)
    BET2= mat("Sichtbeton", (0.48,0.47,0.45), 0.88)
    SOK = mat("Vorplatz", (0.44,0.43,0.40), 0.93)
    BOD = mat("Perronbelag", (0.36,0.36,0.38), 0.72)
    HOL = mat("Laerchenschalung", (0.44,0.30,0.17), 0.84)
    STA = mat("Stahlbau", (0.44,0.46,0.50), 0.38, 0.5)
    STA2= mat("Maschinenstahl", (0.30,0.32,0.35), 0.40, 0.45)
    ROT = mat("Signalrot", (0.62,0.15,0.13), 0.60)
    GLA = mat("Glas", (0.55,0.70,0.78), 0.14)
    DAC = mat("Dachblech", (0.26,0.28,0.30), 0.45, 0.4)
    SEI = mat("Tragseil", (0.34,0.35,0.37), 0.35, 0.5)
    GUM = mat("Gummibelag", (0.15,0.15,0.17), 0.92)
    LED = mat("Hallenleuchte", (1.0,0.94,0.78), 0.25, 0.0, (1.0,0.90,0.68), 1.9)
    GRU = mat("Anzeige", (0.14,0.42,0.26), 0.5, 0.0, (0.20,0.70,0.40), 1.4)
    B, T, H, d = 18.0, 26.0, 9.0, 0.50
    PER  = 0.60          # Perron-Oberkante
    RZ   = 5.66          # Seilachse
    SCHI = 5.86          # Schienen-Unterkante (Gondel-Oberkante 5,58 laeuft darunter)
    LX   = 3.40          # Fahrspuren links/rechts
    WY   = -7.50         # Achse der Umlenkscheibe
    boden(B, T, SOK, BOD, 2.6)
    # --- Huelle: Talseite (+y) offen fuer die Seilausfahrt, Zugaenge in den Flanken
    wand_mit_tuer(0,  T/2, B, d, H, BET, 11.0, 7.0, 'x')
    box(0, -T/2, H/2, B, d, H, BET)
    for s in (-1, 1):
        wand_mit_tuer(s*B/2, 0, T, d, H, BET, 3.20, 3.40, 'y')
        fensterband(s*B/2, 0, T - 9.0, d, 6.20, 2.00, BET2, GLA, 4, 'y')
    box(0, 0, H + 0.30, B + 1.6, T + 1.6, 0.60, DAC)
    box(0, 0, H - 0.45, B + 0.9, T + 0.9, 0.45, HOL)                    # Traufband
    box(0, T/2 + 0.95, H + 1.55, 11.0, 0.55, 1.90, BET2)                # Schriftband
    box(0, T/2 + 0.62, H + 1.55, 8.6, 0.24, 1.20, ROT)
    # --- Perrons: Mittelperron zwischen den Spuren, Aussenperrons an den Waenden
    box(0, 4.30, (FB + PER)/2, 3.60, 13.40, PER - FB, BOD)
    box(0, 4.30, PER + 0.01, 3.20, 13.00, 0.04, GUM)
    for s in (-1, 1):
        box(s*6.80, 2.75, (FB + PER)/2, 3.20, 16.50, PER - FB, BOD)
        box(s*6.80, 2.75, PER + 0.01, 2.80, 16.10, 0.04, GUM)
        box(s*8.60, 0.0, FB + 0.075, 0.50, 3.40, 0.15, BOD)             # Stufe an der Tuer
        gelaender(-5.50, 11.00, s*8.42, PER, STA, 1.05, 'y')            # Aussenkante
        gelaender(s*5.20, s*8.40, 11.00, PER, STA, 1.05, 'x')
        gelaender(s*5.20, s*8.40, -5.50, PER, STA, 1.05, 'x')
        gelaender(-2.40, 11.00, s*1.80, PER, STA, 1.05, 'y')            # Mittelperron
    gelaender(-1.80, 1.80, 11.00, PER, STA, 1.05, 'x')
    gelaender(-1.80, 1.80, -2.40, PER, STA, 1.05, 'x')
    # --- Umlenkscheibe: Kranz auf Seilhoehe, Scheibe DARUEBER (die Gondel-Klemme
    #     laeuft mit Oberkante 5,58 unten durch)
    ring(0, WY, RZ + 0.16, LX, 0.16, STA2, 24, 8)
    zyl(0, WY, RZ + 0.56, LX - 0.10, 0.44, STA, 24)
    zyl(0, WY, RZ + 0.86, 0.70, 0.50, STA2, 16)
    for i in range(8):                                                   # Speichen
        a = i/8*math.tau
        o = box(math.cos(a)*LX/2, WY + math.sin(a)*LX/2, RZ + 0.56, LX, 0.22, 0.30, STA2)
        o.rotation_euler[2] = a
    zyl(0, WY, RZ + 1.62, 0.34, 1.10, STA2, 12)                          # Welle nach oben
    box(0, WY, RZ + 2.28, 5.60, 1.10, 0.44, STA)                         # Traverse
    for s in (-1, 1):
        box(s*2.60, WY, (PER + RZ + 2.06)/2, 0.44, 0.60, RZ + 2.06 - PER, STA)
        strebe_yz(WY - 2.4, PER + 1.2, WY, RZ + 1.4, s*2.60, 0.18, 0.24, STA)
    # --- Seil und Schiene in beiden Spuren
    for s in (-1, 1):
        seil((s*LX, WY, RZ), (s*LX, T/2 + 6.0, RZ), 0.07, SEI, 8)
        box(s*LX, 2.0, SCHI + 0.11, 0.20, 24.0, 0.22, STA2)
        for i in range(9):                                               # Schienenaufhaengung
            box(s*LX, -6.0 + i*2.4, SCHI + 0.60, 0.16, 0.16, 0.78, STA2)
            box(s*LX, -6.0 + i*2.4, SCHI + 1.02, 1.60, 0.16, 0.16, STA2)
    for i in range(9):                                                   # Bogen um die Scheibe
        a0 = math.pi/2 + i/9*math.pi
        a1 = math.pi/2 + (i+1)/9*math.pi
        seil((math.cos(a0)*LX, WY + math.sin(a0)*LX, RZ),
             (math.cos(a1)*LX, WY + math.sin(a1)*LX, RZ), 0.07, SEI, 6)
    # --- Antriebsraum in der hinteren rechten Ecke (ausserhalb des Scheibenschwenks)
    ax0, ax1, ay0, ay1, ah = 5.30, 8.75, -12.75, -6.20, 3.60
    box((ax0+ax1)/2, ay0 + 0.12, (FB + ah)/2, ax1-ax0, 0.24, ah - FB, BET2)
    box(ax0 - 0.12, (ay0+ay1)/2, (FB + ah)/2, 0.24, ay1-ay0, ah - FB, BET2)
    wand_mit_tuer((ax0+ax1)/2, ay1, ax1-ax0, 0.24, ah - FB + FB, BET2, 1.60, 2.60, 'x')
    box((ax0+ax1)/2, (ay0+ay1)/2, ah + 0.10, ax1-ax0+0.3, ay1-ay0+0.3, 0.20, BET2)
    box(ax0 - 0.10, (ay0+ay1)/2 + 1.0, FB + 2.10, 0.10, 2.60, 1.10, GLA)
    box(7.00, -9.40, FB + 0.90, 2.60, 1.60, 1.80, STA2)                  # Motor
    zyl(7.00, -8.40, FB + 1.10, 0.60, 0.90, STA, 16, rot=(math.pi/2, 0, 0))
    box(7.00, -11.20, FB + 0.70, 2.20, 1.10, 1.40, STA)                  # Getriebe
    box(6.10, -7.20, FB + 1.05, 0.30, 1.60, 2.10, BET2)                  # Schaltschrank
    box(6.24, -7.20, FB + 1.60, 0.10, 1.20, 0.70, GRU)
    # --- Kommandostand auf dem Aussenperron
    box(-7.00, 8.20, PER + 1.30, 2.60, 2.60, 2.60, BET2)
    box(-7.00, 6.90, PER + 1.70, 2.20, 0.14, 1.40, GLA)
    box(-5.72, 8.20, PER + 1.70, 0.14, 2.20, 1.40, GLA)
    box(-7.00, 8.20, PER + 2.68, 2.90, 2.90, 0.16, DAC)
    box(-7.00, 7.60, PER + 0.55, 2.00, 0.80, 0.10, HOL)
    box(-7.00, 7.30, PER + 0.95, 1.60, 0.10, 0.60, GRU)
    # --- Ausstattung Perron
    for s in (-1, 1):
        for k in range(3):
            py = -3.0 + k*5.4
            box(s*7.60, py, PER + 0.46, 0.60, 2.00, 0.10, HOL)           # Bank
            box(s*8.00, py, PER + 0.78, 0.12, 2.00, 0.54, HOL)
            for by in (-0.75, 0.75):
                box(s*7.60, py + by, PER + 0.22, 0.50, 0.12, 0.44, STA)
        box(s*5.60, 10.20, PER + 1.35, 0.30, 1.60, 2.70, BET2)           # Infotafel
        box(s*5.44, 10.20, PER + 1.70, 0.08, 1.30, 1.60, GRU)
    for i in range(4):                                                    # Drehsperren am Zugang
        box(0 + (i - 1.5)*0.9, -1.60, PER + 0.55, 0.14, 0.60, 1.10, STA)
    box(0, 10.60, PER + 1.90, 3.40, 0.24, 0.90, GRU)                      # Abfahrtsanzeige
    # --- Dachtragwerk und Licht
    for i in range(7):
        py = -10.5 + i*3.5
        box(0, py, H - 1.05, B - 2*d, 0.30, 0.40, STA)
        for s in (-1, 1):
            strebe_xz(s*(B/2 - d), H - 2.40, s*4.0, H - 1.30, py, 0.20, 0.24, STA)
        box(0, py, H - 1.45, 3.00, 0.40, 0.16, LED)
    export("th26_seilbahn_station", 0.020, 2)

# ================================================================ 7) Seilbahn-Gondel
def seilbahn_gondel():
    """Gondel fuer 6 Personen mit Aufhaengung und Laufwerk.
    Kabinenboden z = 0,00, Seilachse z = 5,00, Oberkante 4,98 (Klemme greift von
    unten) -> in der Station auf z = 0,60 setzen, an der Stuetze auf z = 9,20."""
    neu()
    KOR = mat("Kabine", (0.82,0.30,0.14), 0.55)
    KOR2= mat("Kabinenband", (0.20,0.22,0.26), 0.55)
    RAH = mat("Rahmen", (0.36,0.38,0.42), 0.38, 0.5)
    GLA = mat("Kabinenglas", (0.52,0.70,0.80), 0.12)
    BOD = mat("Kabinenboden", (0.16,0.17,0.19), 0.90)
    SIT = mat("Sitzpolster", (0.22,0.28,0.40), 0.85)
    STA = mat("Stahl", (0.44,0.46,0.50), 0.36, 0.55)
    STA2= mat("Laufwerk", (0.30,0.32,0.35), 0.40, 0.5)
    GUM = mat("Rollenbelag", (0.14,0.14,0.16), 0.90)
    SEI = mat("Tragseil", (0.34,0.35,0.37), 0.35, 0.5)
    WEI = mat("Zierstreifen", (0.92,0.92,0.90), 0.45)
    KB, KT, KH = 2.30, 3.20, 2.30       # Kabine: Breite, Laenge, Verglasungshoehe
    # --- Boden und Sockelband
    box(0, 0, 0.09, KB, KT, 0.18, BOD)
    box(0, 0, 0.48, KB + 0.06, KT + 0.06, 0.62, KOR)          # 0,17 .. 0,79
    box(0, 0, 0.80, KB + 0.10, KT + 0.10, 0.10, WEI)
    # --- Verglasung rundum, Glas knapp VOR dem Rahmen
    for (sy, ty) in ((-1, 0), (1, 0)):
        box(0, sy*(KT/2 - 0.02), 1.58, KB - 0.10, 0.10, 1.44, GLA)
        box(0, sy*(KT/2 + 0.02), 1.58, KB + 0.02, 0.08, 1.52, RAH)
    for s in (-1, 1):
        box(s*(KB/2 - 0.02), -0.86, 1.58, 0.10, 1.20, 1.44, GLA)
        box(s*(KB/2 - 0.02),  0.86, 1.58, 0.10, 1.20, 1.44, GLA)
        box(s*(KB/2 + 0.04),  0.00, 1.58, 0.09, 0.30, 1.52, KOR2)     # Tuerspalt (Schiebetuer)
        for ty in (-1.52, 1.52):
            box(s*(KB/2 + 0.03), ty, 1.58, 0.09, 0.16, 1.52, RAH)
        box(s*(KB/2 + 0.05), 0.0, 1.10, 0.07, 2.90, 0.10, RAH)
        box(s*(KB/2 + 0.05), 0.0, 2.28, 0.07, 2.90, 0.10, RAH)
        box(s*(KB/2 + 0.06), -0.62, 1.42, 0.06, 0.14, 0.34, STA)      # Griff
        box(s*(KB/2 + 0.06),  0.62, 1.42, 0.06, 0.14, 0.34, STA)
    for s in (-1, 1):                                                  # Eckpfosten
        for ty in (-1, 1):
            box(s*(KB/2 - 0.05), ty*(KT/2 - 0.05), 1.52, 0.12, 0.12, 2.60, RAH)
    # --- Dach
    box(0, 0, 2.42, KB + 0.06, KT + 0.06, 0.14, KOR)
    box(0, 0, 2.56, KB - 0.20, KT - 0.30, 0.16, KOR2)
    box(0, 0, 2.62, 0.90, KT + 0.10, 0.10, WEI)
    # --- Innen: zwei Baenke gegenueber, Haltestange
    for sy in (-1, 1):
        box(0, sy*0.92, 0.53, KB - 0.24, 0.52, 0.10, SIT)              # Sitzflaeche 0,58
        box(0, sy*1.20, 0.86, KB - 0.24, 0.10, 0.56, SIT)
        for sx in (-0.72, 0.72):
            box(sx, sy*0.92, 0.35, 0.10, 0.46, 0.34, RAH)
    zyl(0, 0, 1.32, 0.05, 2.28, STA, 8)
    box(0, 0, 0.20, KB - 0.30, 1.10, 0.05, KOR2)
    # --- Gehaenge
    box(0, 0, 3.52, 0.24, 0.40, 1.80, STA)                             # 2,62 .. 4,42
    box(0, 0, 2.78, 0.60, 0.90, 0.22, STA)                             # Fuss am Dach
    for s in (-1, 1):
        strebe_yz(s*0.55, 2.86, s*0.14, 3.40, 0.0, 0.12, 0.16, STA)
    # --- Laufwerk und Klemme: Seilachse 5,00, Klemme greift von UNTEN
    box(0, 0, 4.58, 0.46, 1.70, 0.34, STA2)                            # 4,41 .. 4,75
    for ty in (-0.62, 0.62):                                            # Laufrollen
        zyl(0.34, ty, 4.86, 0.22, 0.14, STA2, 12, rot=(0, math.pi/2, 0))
        zyl(0.34, ty, 4.86, 0.13, 0.16, GUM, 10, rot=(0, math.pi/2, 0))
    box(0.34, 0.0, 5.12, 0.20, 1.70, 0.16, STA2)                        # Fahrschiene-Fuehrung
    box(0, 0, 4.86, 0.30, 0.90, 0.24, STA2)                             # Klemmkoerper 4,74..4,98
    for ty in (-0.34, 0.34):
        box(0, ty, 4.90, 0.44, 0.16, 0.16, STA)
    seil((0, -1.80, 5.00), (0, 1.80, 5.00), 0.07, SEI, 8)               # Seilstueck zur Anschauung
    export("th26_seilbahn_gondel", 0.014, 2)

# ================================================================ 8) Seilbahn-Stuetze
def seilbahn_stuetze():
    """Seilbahnstuetze ~16 m mit Rollenbatterie und Leiter.
    Seilachse 14,20; die Rollen liegen OBERHALB des Seils (Niederhalterbatterie),
    damit die Gondel (Oberkante 4,98 ueber ihrem Boden) frei darunter durchlaeuft:
    Gondel auf z = 9,20 setzen -> Oberkante 14,18 unter dem Seil."""
    neu()
    BET = mat("Fundament", (0.56,0.55,0.52), 0.90)
    STA = mat("Stuetzenstahl", (0.48,0.50,0.54), 0.36, 0.5)
    STA2= mat("Rollenbatterie", (0.32,0.34,0.37), 0.40, 0.45)
    GUM = mat("Rollenbelag", (0.14,0.14,0.16), 0.90)
    SEI = mat("Tragseil", (0.34,0.35,0.37), 0.35, 0.5)
    ROT = mat("Warnring", (0.66,0.16,0.13), 0.55)
    WEI = mat("Warnring2", (0.90,0.90,0.88), 0.55)
    GEL = mat("Gelaender", (0.52,0.54,0.56), 0.38, 0.5)
    ERD = mat("Bergwiese", (0.24,0.38,0.19), 0.95)
    FEL = mat("Fels", (0.44,0.43,0.40), 0.93)
    SCH = mat("Schild", (0.86,0.78,0.24), 0.6)
    RZ  = 14.20          # Seilachse
    LX  = 2.60           # Spurabstand vom Mast
    # --- Gelaende und Fundament
    box(0, 0, 0.22, 9.0, 9.0, 0.44, ERD)
    box(0, 0, 0.62, 4.20, 4.20, 0.80, BET)               # Fundamentblock 0,44 .. 1,02
    box(0, 0, 1.10, 3.20, 3.20, 0.20, BET)
    # --- Mast: gerader Schaft, gerade Segmentzahl (steht sonst auf einer Ecke)
    zyl(0, 0, 1.10 + 5.90, 0.62, 11.80, STA, 12)         # 1,10 .. 12,90
    zyl(0, 0, 13.55, 0.50, 1.30, STA, 12)                # 12,90 .. 14,20
    zyl(0, 0, 14.75, 0.42, 1.10, STA, 12)                # 14,20 .. 15,30
    for zz in (2.2, 5.4, 8.6, 11.4):                     # Schuesse
        zyl(0, 0, zz, 0.70, 0.16, STA2, 12)
    for i, zz in enumerate((1.60, 2.40, 3.20)):          # Warnringe unten
        zyl(0, 0, zz, 0.64, 0.34, ROT if i % 2 == 0 else WEI, 12)
    # --- Querarm ueber dem Seil (Batterie haengt darunter)
    box(0, 0, 15.44, 6.40, 0.60, 0.44, STA)              # 15,22 .. 15,66
    box(0, 0, 15.76, 5.20, 0.44, 0.22, STA)
    for s in (-1, 1):
        strebe_xz(s*0.50, 14.10, s*3.00, 15.24, 0.0, 0.20, 0.26, STA)
        strebe_xz(s*0.50, 14.10, s*3.00, 15.24, 0.0, 0.20, 0.26, STA) if False else None
    # --- Rollenbatterie je Spur: Wippen unter dem Querarm, Rollen auf dem Seil
    for s in (-1, 1):
        px = s*LX
        box(px, 0, 15.02, 0.70, 0.70, 0.40, STA2)                       # Anschlussbock
        box(px, 0, 14.86, 0.34, 4.60, 0.30, STA2)                       # Hauptwippe
        for ty in (-1.60, 1.60):                                         # Unterwippen
            box(px, ty, 14.62, 0.30, 2.40, 0.26, STA2)
            box(px, ty, 14.76, 0.20, 0.20, 0.24, STA2)
        for i in range(8):                                               # 8 Rollen ueber dem Seil
            ty = -2.10 + i*0.60
            zyl(px, ty, RZ + 0.30, 0.30, 0.26, STA2, 12, rot=(0, math.pi/2, 0))
            zyl(px, ty, RZ + 0.30, 0.19, 0.30, GUM, 10, rot=(0, math.pi/2, 0))
        seil((px, -4.60, RZ), (px, 4.60, RZ), 0.07, SEI, 8)              # Seil
        box(px, 0, 15.34, 0.24, 0.24, 0.36, STA2)
    # --- Bedienpodest mit Gelaender (unter dem Querarm, ausserhalb der Fahrspur)
    box(0, -1.30, 12.98, 2.20, 1.80, 0.16, STA)
    bruestung(0, -1.30, 2.20, 1.80, 13.06, GEL, 1.05)
    for s in (-1, 1):
        strebe_xz(s*0.55, 11.60, s*1.05, 12.90, -1.30, 0.14, 0.18, STA)
    # --- Steigleiter mit Rueckenschutz auf der -y-Seite
    leiter(0, -0.90, 1.02, 12.90, STA, 0.56, 0.32, 0.07, 'y')
    for i in range(9):
        ring(0, -1.22, 3.20 + i*1.10, 0.42, 0.045, STA2, 12, 5, rot=(math.pi/2, 0, 0))
    # --- Umgebung
    for (px, py, r) in ((-3.2, 2.8, 0.9), (3.0, -2.6, 0.8), (2.6, 3.2, 0.7), (-3.0, -3.0, 0.75)):
        fels(px, py, 0.44, r, FEL, 8, 1.0, RND.uniform(-0.14, 0.14), RND.uniform(-0.14, 0.14))
    box(2.30, 2.10, 1.30, 0.10, 0.10, 1.72, STA)
    box(2.30, 2.05, 2.05, 0.72, 0.06, 0.52, SCH)
    export("th26_seilbahn_stuetze", 0.018, 2)

# ================================================================ 9) Haengebruecke
def haengebruecke():
    """Haengebruecke ~20 m Spannweite mit Tragseilen, Holzbohlen und Seitennetzen.
    Die Bohlen LIEGEN auf den beiden Tragseilen — sie folgen dem Durchhang."""
    neu()
    FEL = mat("Widerlager", (0.44,0.43,0.40), 0.93)
    FEL2= mat("Fels", (0.34,0.33,0.31), 0.94)
    ERD = mat("Bergerde", (0.24,0.19,0.13), 0.96)
    HOL = mat("Bohle", (0.46,0.32,0.18), 0.86)
    HOL2= mat("Bohle2", (0.38,0.26,0.14), 0.86)
    STA = mat("Portalstahl", (0.44,0.46,0.50), 0.38, 0.5)
    SEI = mat("Tragseil", (0.40,0.41,0.43), 0.36, 0.5)
    SEI2= mat("Handseil", (0.52,0.50,0.44), 0.45)
    NET = mat("Seitennetz", (0.46,0.44,0.38), 0.70)
    SCH = mat("Hinweistafel", (0.82,0.74,0.26), 0.6)
    L    = 10.0            # halbe Spannweite
    ZE   = 2.60            # Seilhoehe am Widerlager
    SAG  = 0.85            # Durchhang in der Mitte
    SX   = 1.05            # Tragseile bei x = +-1,05
    HX   = 1.38            # Handseile
    HOEH = 1.05            # Handlaufhoehe ueber der Bohle
    RS   = 0.055           # Seilradius
    def zc(y):             # Parabel-Durchhang
        return ZE - SAG*(1.0 - (y/L)**2)
    def slope(y):
        return math.atan2(2*SAG*y/(L*L), 1.0)
    # --- Widerlager
    for s in (-1, 1):
        box(0, s*(L + 1.30), 1.15, 4.60, 2.60, 2.30, FEL)
        box(0, s*(L + 1.30), 2.38, 5.00, 3.00, 0.16, FEL2)
        box(0, s*(L + 2.90), 0.90, 5.40, 3.40, 1.80, ERD)
        for sx in (-1, 1):                                  # Portalpfosten
            box(sx*1.34, s*(L + 0.70), 3.90, 0.28, 0.28, 2.60, STA)
        box(0, s*(L + 0.70), 5.10, 3.20, 0.28, 0.28, STA)
        for sx in (-1, 1):
            strebe_xz(sx*1.34, 4.60, sx*0.60, 5.06, s*(L + 0.70), 0.16, 0.20, STA)
        # Abspannseile nach hinten in den Fels
        for sx in (-1, 1):
            seil((sx*HX, s*(L + 0.70), 5.16), (sx*1.90, s*(L + 3.40), 1.90), 0.05, SEI2, 6)
        for (px, py, r) in ((-3.0, s*(L + 3.6), 1.1), (3.0, s*(L + 3.9), 1.0)):
            fels(px, py, 1.70, r, FEL, 8, 1.0, RND.uniform(-0.12, 0.12), RND.uniform(-0.12, 0.12))
        box(0, s*(L + 4.30), 2.35, 1.40, 0.12, 0.90, SCH)
        box(0, s*(L + 4.30), 1.35, 0.12, 0.12, 2.00, STA)
    # --- Tragseile und Handseile als Polygonzuege
    N = 24
    for sx in (-1, 1):
        for i in range(N):
            y0 = -L + 2*L*i/N
            y1 = -L + 2*L*(i+1)/N
            seil((sx*SX, y0, zc(y0)), (sx*SX, y1, zc(y1)), RS, SEI, 6)
            seil((sx*HX, y0, zc(y0) + HOEH), (sx*HX, y1, zc(y1) + HOEH), RS*0.85, SEI2, 6)
        # Anschluss ans Portal
        seil((sx*SX, -L, zc(-L)), (sx*SX, -L - 0.70, ZE + 0.20), RS, SEI, 6)
        seil((sx*SX,  L, zc( L)), (sx*SX,  L + 0.70, ZE + 0.20), RS, SEI, 6)
        seil((sx*HX, -L, zc(-L) + HOEH), (sx*HX, -L - 0.70, 5.06), RS*0.85, SEI2, 6)
        seil((sx*HX,  L, zc( L) + HOEH), (sx*HX,  L + 0.70, 5.06), RS*0.85, SEI2, 6)
    # --- Bohlen: liegen OBEN AUF den Tragseilen (Seil-Oberkante + halbe Bohle)
    BD = 0.075
    nB = 47
    for i in range(nB):
        y = -9.6 + i*(19.2/(nB - 1))
        a = slope(y)
        z = zc(y) + (RS + BD/2)*math.cos(a)
        o = box(0, y, z, 2.50, 0.30, BD, HOL if i % 3 else HOL2)
        o.rotation_euler[0] = a
    for sx in (-1, 1):                                   # Laengsholm unter den Bohlen
        for i in range(N):
            y0 = -L + 2*L*i/N; y1 = -L + 2*L*(i+1)/N
            if abs(y0) > 9.7: continue
            seil((sx*0.72, y0, zc(y0) - 0.02), (sx*0.72, y1, zc(y1) - 0.02), 0.05, HOL2, 6)
    # --- Haenger und Seitennetz
    for sx in (-1, 1):
        for i in range(17):
            y = -9.6 + i*1.20
            seil((sx*HX, y, zc(y) + HOEH), (sx*SX, y, zc(y)), 0.030, SEI2, 6)
        for i in range(16):                               # Netzdiagonalen in beide Richtungen
            y0 = -9.6 + i*1.20; y1 = y0 + 1.20
            seil((sx*HX, y0, zc(y0) + HOEH), (sx*SX, y1, zc(y1)), 0.022, NET, 5)
            seil((sx*SX, y0, zc(y0)), (sx*HX, y1, zc(y1) + HOEH), 0.022, NET, 5)
        for k in (0.34, 0.68):                            # zwei Zwischenseile
            for i in range(N):
                y0 = -L + 2*L*i/N; y1 = -L + 2*L*(i+1)/N
                seil((sx*(SX + (HX-SX)*k), y0, zc(y0) + HOEH*k),
                     (sx*(SX + (HX-SX)*k), y1, zc(y1) + HOEH*k), 0.024, NET, 5)
    export("th26_haengebruecke", 0.016, 2)

# ================================================================ 10) Gipfelkreuz
def gipfelkreuz():
    """Gipfelkreuz auf Steinsockel mit Gipfelbuch-Kasten."""
    neu()
    FEL = mat("Gipfelfels", (0.46,0.45,0.42), 0.93)
    FEL2= mat("GipfelfelsDunkel", (0.34,0.33,0.31), 0.94)
    FEL3= mat("GipfelfelsHell", (0.58,0.56,0.51), 0.90)
    ERD = mat("Gipfelgrus", (0.30,0.27,0.21), 0.96)
    HOL = mat("Kreuzholz", (0.40,0.27,0.15), 0.84)
    HOL2= mat("Kreuzholz2", (0.32,0.21,0.12), 0.84)
    MET = mat("Beschlag", (0.42,0.44,0.47), 0.36, 0.55)
    GOL = mat("Messingtafel", (0.62,0.50,0.20), 0.30, 0.55)
    KAS = mat("Buchkasten", (0.36,0.24,0.14), 0.80)
    SEI = mat("Abspannseil", (0.46,0.47,0.49), 0.38, 0.5)
    SCH = mat("Firn", (0.88,0.90,0.93), 0.55)
    # --- Gipfelkuppe
    box(0, 0, 0.18, 9.0, 8.0, 0.36, ERD)
    kipp_box(0, 0, 0.30, 6.20, 5.40, 1.05, FEL, (0.04, -0.03, 0.12))
    kipp_box(-0.4, 0.3, 1.20, 4.60, 4.00, 0.90, FEL3, (-0.05, 0.04, -0.35))
    kipp_box(0.3, -0.2, 1.95, 3.20, 2.90, 0.85, FEL2, (0.05, 0.03, 0.55))
    for (px, py, r, h) in ((-2.9, 1.6, 1.05, 1.0), (2.8, -1.7, 0.95, 1.1),
                           (-2.4, -2.2, 0.85, 0.9), (2.5, 2.3, 0.90, 1.0),
                           (-3.6, -0.4, 0.75, 0.8), (3.5, 0.6, 0.80, 0.9)):
        fels(px, py, 0.34, r, FEL if r > 0.9 else FEL3, 8, h,
             RND.uniform(-0.14, 0.14), RND.uniform(-0.14, 0.14))
    geroell(0, 0, 0.34, 8.0, 7.0, 18, FEL, FEL3, 0.20, 0.55)
    box(0.1, -0.1, 2.72, 2.20, 2.00, 0.14, SCH)
    # --- Kreuz: Stamm 1,90 .. 9,10 , Querbalken bei 7,10
    box(0, 0, 5.50, 0.36, 0.32, 7.20, HOL)
    box(0, 0, 2.10, 0.62, 0.58, 0.60, MET)                    # Fussschuh im Fels
    box(0, 0, 7.10, 3.40, 0.30, 0.34, HOL)                    # Querbalken
    box(0, 0, 7.10, 0.46, 0.38, 0.46, MET)                    # Kreuzungsbeschlag
    for s in (-1, 1):                                          # Kopfbaender
        strebe_xz(s*0.18, 6.45, s*1.05, 6.94, 0.0, 0.14, 0.20, HOL2)
        box(s*1.62, 0, 7.10, 0.22, 0.34, 0.40, MET)            # Balkenschuhe
    box(0, 0, 9.02, 0.44, 0.40, 0.22, MET)                     # Kopfabdeckung
    box(0, -0.20, 8.10, 0.60, 0.06, 0.34, GOL)                 # Inschrifttafel
    # --- Gipfelbuch-Kasten auf der Schauseite (+y)
    box(0, 0.34, 2.90, 0.60, 0.34, 0.70, KAS)
    box(0, 0.52, 2.90, 0.52, 0.06, 0.60, HOL2)                 # Klappe
    box(0, 0.56, 2.90, 0.10, 0.06, 0.14, MET)                  # Verschluss
    box(0, 0.34, 3.28, 0.70, 0.44, 0.10, KAS)                  # Wetterdach
    box(0, 0.44, 3.36, 0.66, 0.30, 0.06, MET)
    box(0, 0.20, 3.62, 0.46, 0.06, 0.26, GOL)                  # Schildchen
    # --- Abspannseile in vier Richtungen
    for (ax, ay) in ((-2.6, 2.2), (2.6, 2.2), (-2.6, -2.2), (2.6, -2.2)):
        seil((0, 0, 6.30), (ax, ay, 1.55), 0.035, SEI, 6)
        box(ax, ay, 1.45, 0.30, 0.30, 0.30, MET)
    export("th26_gipfelkreuz", 0.016, 2)

# ================================================================ 11) Bergsee
def bergsee():
    """Bergsee mit Uferfelsen, Schilf und kleinem Bootssteg.
    Wasser als EINGEFAERBTE Flaeche direkt ueber dem Seegrund — ein transparenter
    Wasserquader wuerde in three.js falsch sortiert und alles darunter schlucken."""
    neu()
    ERD = mat("Ufergras", (0.23,0.38,0.18), 0.95)
    ERD2= mat("Uferkies", (0.50,0.48,0.43), 0.94)
    SCHL= mat("Seegrund", (0.20,0.24,0.20), 0.95)
    WAS = mat("Bergseewasser", (0.16,0.42,0.50), 0.14, 0.0, (0.08,0.26,0.34), 0.45)
    WAS2= mat("Flachwasser", (0.28,0.58,0.60), 0.14, 0.0, (0.14,0.34,0.38), 0.5)
    FEL = mat("Uferfels", (0.44,0.43,0.40), 0.93)
    FEL2= mat("UferfelsDunkel", (0.32,0.31,0.29), 0.94)
    FEL3= mat("UferfelsHell", (0.57,0.55,0.50), 0.90)
    HAL = mat("Schilfhalm", (0.36,0.46,0.20), 0.92)
    KOL = mat("Rohrkolben", (0.32,0.22,0.12), 0.90)
    HOL = mat("Stegholz", (0.48,0.34,0.19), 0.85)
    HOL2= mat("Stegpfahl", (0.34,0.24,0.14), 0.88)
    MOO = mat("Moos", (0.19,0.34,0.16), 0.94)
    STA = mat("Ring", (0.42,0.44,0.47), 0.38, 0.5)
    NAD = mat("Nadeln", (0.14,0.30,0.16), 0.94)
    STM = mat("Stamm", (0.30,0.21,0.13), 0.88)
    B, T = 30.0, 26.0
    LB, LT = 20.0, 15.0                 # Seebecken
    WSP = 0.46                          # Wasserspiegel
    # --- Ufergelaende als Ring, damit das Becken nicht zubetoniert wird
    platte_mit_loch(0, 0, 0.25, B, T, 0.50, LB, LT, ERD)
    platte_mit_loch(0, 0, 0.50, B - 2.0, T - 2.0, 0.10, LB - 0.6, LT - 0.6, ERD2)
    box(0, 0, 0.09, LB + 0.6, LT + 0.6, 0.18, SCHL)                    # Seegrund
    box(0, 0, WSP - 0.06, LB, LT, 0.12, WAS)                           # Wasserspiegel 0,46
    box(0, 0, WSP - 0.05, LB - 3.0, LT - 2.4, 0.12, WAS)               # Tiefenzone
    for (px, py, sx, sy) in ((0, -LT/2 + 1.1, LB - 1.0, 2.2), (0, LT/2 - 1.1, LB - 1.0, 2.2),
                             (-LB/2 + 1.1, 0, 2.2, LT - 1.0), (LB/2 - 1.1, 0, 2.2, LT - 1.0)):
        box(px, py, WSP - 0.04, sx, sy, 0.12, WAS2)                    # Flachwassersaum
    # --- Uferfelsen rundum (einige stehen im Wasser)
    RND.seed(261)
    for i in range(26):
        a  = i/26*math.tau
        rr = RND.uniform(0.94, 1.24)
        px = math.cos(a)*(LB/2)*rr
        py = math.sin(a)*(LT/2)*rr
        r  = RND.uniform(0.55, 1.55)
        z0 = 0.50 if (abs(px) > LB/2 or abs(py) > LT/2) else 0.18
        fels(px, py, z0, r, (FEL, FEL2, FEL3)[i % 3], 8, RND.uniform(0.8, 1.3),
             RND.uniform(-0.16, 0.16), RND.uniform(-0.16, 0.16))
    for (px, py, sx, sy, sz, rot) in (
            (-12.0,  8.4, 4.4, 3.6, 3.4, ( 0.07, -0.06,  0.4)),
            ( 12.4, -7.6, 4.0, 3.4, 3.0, (-0.06,  0.07, -0.6)),
            (-13.0, -6.8, 3.4, 3.0, 2.4, ( 0.06,  0.05,  0.9)),
            ( 11.6,  9.0, 3.0, 2.6, 2.0, (-0.07, -0.05, -0.3)),
            (  1.6, -11.4, 3.8, 2.8, 2.6, ( 0.05, -0.06,  0.2))):
        kipp_box(px, py, 0.44, sx, sy, sz, FEL, rot)
    for (px, py, pz) in ((-11.6, 8.0, 3.4), (12.0, -7.2, 3.0), (1.4, -11.0, 2.6)):
        kugel(px, py, pz, 0.55, MOO, 10)
    geroell(0, 0, 0.52, B - 3.0, T - 3.0, 22, FEL, FEL3, 0.20, 0.52)
    # --- Schilf im Flachwasser (Nordufer und Ostbucht)
    for (px, py, r, n) in ((-7.0, -6.2, 2.0, 26), (-3.4, -6.6, 1.6, 20),
                           ( 6.4, -6.4, 1.8, 22), ( 8.6,  3.2, 1.5, 18),
                           (-8.8,  3.6, 1.6, 20), ( 2.2, -6.8, 1.2, 14)):
        schilf(px, py, WSP - 0.10, r, n, HAL, KOL)
    # --- Bootssteg von +y ins Wasser
    SY0, SY1 = 6.60, 1.40
    for i in range(11):
        py = SY0 - i*(SY0 - SY1)/10.0
        box(0, py, 0.98, 2.20, 0.42, 0.09, HOL)                        # Bohlen, Oberkante 1,02
    for sx in (-0.90, 0.90):
        box(sx, (SY0 + SY1)/2, 0.90, 0.14, SY0 - SY1 + 0.5, 0.14, HOL2)
        for py in (SY0, (SY0 + SY1)/2, SY1):
            zyl(sx, py, 0.52, 0.13, 1.00, HOL2, 10)                    # Pfaehle bis in den Grund
    for sx in (-1.05, 1.05):                                            # Gelaender einseitig
        pass
    for i in range(4):
        py = SY0 - i*(SY0 - SY1)/3.0
        box(-1.06, py, 1.53, 0.10, 0.10, 1.02, HOL2)
    box(-1.06, (SY0 + SY1)/2, 2.02, 0.09, SY0 - SY1 + 0.3, 0.09, HOL2)
    zyl(0.92, SY1 - 0.20, 1.18, 0.10, 0.40, HOL2, 10)                   # Poller
    ring(0.92, SY1 - 0.20, 1.36, 0.16, 0.035, STA, 12, 5, rot=(math.pi/2, 0, 0))
    box(0, SY0 + 0.70, 0.66, 2.60, 1.20, 0.14, HOL)                     # Anlandung
    # --- Bank, Steinmann, zwei Bergfoehren
    box(-6.4, 9.0, 0.98, 2.20, 0.46, 0.10, HOL)
    box(-6.4, 9.24, 1.32, 2.20, 0.10, 0.56, HOL)
    for sx in (-0.85, 0.85):
        box(-6.4 + sx, 9.0, 0.73, 0.12, 0.42, 0.42, HOL2)
    for i, (r, h) in enumerate(((0.55, 0.34), (0.44, 0.30), (0.34, 0.26), (0.24, 0.20))):
        zyl(6.8, 9.4, 0.50 + sum(x[1] for x in ((0.55,0.34),(0.44,0.30),(0.34,0.26),(0.24,0.20))[:i]) + h/2,
            r, h, FEL3 if i % 2 else FEL, 8)
    baumstamm(-12.6, 11.0, 0.50, 4.60, 0.30, STM, NAD, 8)
    baumstamm(13.2, 10.4, 0.50, 3.80, 0.26, STM, NAD, 8)
    export("th26_bergsee", 0.020, 2)

if __name__ == "__main__":
    print("Asset-Charge th26 (Bergwelt):")
    for fn in (felsformation, felswand_modul, wasserfall, hoehleneingang, berghuette,
               seilbahn_station, seilbahn_gondel, seilbahn_stuetze, haengebruecke,
               gipfelkreuz, bergsee):
        fn()
    print("fertig")
