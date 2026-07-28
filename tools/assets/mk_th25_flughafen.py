# -*- coding: utf-8 -*-
"""Asset-Charge 24 (th25_*): FLUGHAFEN — Terminal, Kontrollturm, Verkehrsflugzeug,
Fluggastbruecke, Hangar, Gepaeckwagen, Landebahn-Modul, Radarturm, Tankwagen.
Familienfreundlich: ZIVILE Luftfahrt, KEINE Waffen, keine Militaerflugzeuge.

Konventionen wie th5-th24 (siehe models/TH5-ASSETS.md, Abschnitt "Fallstricke"):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * Schauseite (Eingang / Flugzeugnase / Fahrzeugfront) liegt auf Blender +y
    -> in three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT, sonst fehlt der Bevel.
  * `primitive_cube_add(size=1)` -> Kantenlaenge 1, Skalierung = Mass (NICHT /2).
  * Raeder: `rot=(0,pi/2,0)` und GERADE Segmentzahl (22 Segmente haben unten eine
    Ecke -> das Rad schwebt); mit 16 liegt die Unterkante exakt auf 0.
  * `rotation_euler[2]=pi` auf einem symmetrischen Quader ist ein NO-OP -> spiegeln
    ueber das VORZEICHEN der Offsets.
  * Metallic max 0.6 — darueber rendert three.js ohne Environment-Map fast schwarz.
  * Begehbar: Aussensockel und Innenboden enden BEIDE auf `FB`, Decke buendig auf
    die Wandkrone, Einbauten NEBEN die Durchgaenge (`oeffnungs_achsen()`).
  * Ein voller Zylinder ist kein Tonnendach -> `tonne()` halbiert wirklich.
  * Attika als Vollplatte mauert das Gewoelbe von innen zu -> nur `dachrand()`-Ring.
  * Fensterglas knapp VOR die Wandflaeche (Offset ~0.02), sonst rendert das Haus
    fensterlos.
  * Ein Rumpf aus aneinandergereihten Quadern sieht aus wie eine TREPPE -> `loft()`.

Modul-Raster: th25_landebahn_modul  x += 30.0
"""
import bpy, bmesh, os, math
from mathutils import Vector

OUT_GLB = "/home/user/aban-news-landing/models"
OUT_STL = "/home/user/aban-news-landing/models/stl"
os.makedirs(OUT_STL, exist_ok=True)

TAU = math.tau

# ---------------------------------------------------------------- Grundhelfer
def neu():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for o in list(bpy.data.objects):          # read_factory_settings liess schon
        bpy.data.objects.remove(o, do_unlink=True)   # einen Default-Wuerfel stehen

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

def leucht(name, rgb, estr=2.4):
    """Lampenmaterial: Basisfarbe = Leuchtfarbe, damit es auch unbeleuchtet knallt."""
    return mat(name, rgb, 0.25, 0.0, rgb, estr)

def box(x, y, z, sx, sy, sz, m=None):
    # size=1 liefert bereits Kantenlaenge 1 -> Skalierung = gewuenschtes Mass (NICHT /2)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    o = bpy.context.active_object; o.scale = (sx, sy, sz)
    if m: o.data.materials.append(m)
    return o

def zyl(x, y, z, r, h, m=None, seg=16, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x,y,z),
                                        vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kugel(x, y, z, r, m=None, seg=14):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z),
                                         segments=seg, ring_count=max(5, seg//2))
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kegel(x, y, z, r1, r2, h, m=None, seg=14, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z),
                                    vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def rad(x, y, z, r, breite, m=None, seg=16):
    """Fahrzeugrad, Achse auf x (Fahrtrichtung y). GERADE Segmentzahl, damit unten
    eine Kante und keine Ecke liegt — sonst schwebt das Rad."""
    return zyl(x, y, z, r, breite, m, seg, rot=(0, math.pi/2, 0))

def reifen(x, y, z, R, r, m=None, achse='y', mj=16, mn=8):
    rot = (math.pi/2, 0, 0) if achse == 'y' else ((0, math.pi/2, 0) if achse == 'x' else (0,0,0))
    bpy.ops.mesh.primitive_torus_add(location=(x,y,z), rotation=rot,
                                     major_radius=R, minor_radius=r,
                                     major_segments=mj, minor_segments=mn)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def strebe(p0, p1, d, m=None):
    """Stab zwischen zwei Punkten (Fachwerk, Streben, Abspannungen)."""
    p0 = Vector(p0); p1 = Vector(p1); v = p1 - p0; L = v.length
    if L < 1e-4: return None
    c = (p0 + p1) / 2.0
    o = box(c.x, c.y, c.z, d, d, L, m)
    o.rotation_euler = v.to_track_quat('Z', 'Y').to_euler()
    return o

def balken(p0, p1, breite, hoehe, m=None):
    """Wie `strebe`, aber rechteckig: `breite` quer, `hoehe` senkrecht dazu."""
    p0 = Vector(p0); p1 = Vector(p1); v = p1 - p0; L = v.length
    if L < 1e-4: return None
    c = (p0 + p1) / 2.0
    o = box(c.x, c.y, c.z, breite, hoehe, L, m)
    o.rotation_euler = v.to_track_quat('Z', 'Y').to_euler()
    return o

def ring(cx, cy, z, r, n, breite, hoehe, m, start=0.0):
    """Geschlossener Ring aus n tangential gedrehten Boxen (Handlauf, Lichterrand)."""
    ch = 2.0 * r * math.sin(math.pi/n) * 1.06
    for i in range(n):
        a = start + i/n*TAU
        o = box(cx + r*math.cos(a), cy + r*math.sin(a), z, ch, breite, hoehe, m)
        o.rotation_euler[2] = a + math.pi/2

def rahmen(cx, cy, z, B, H, dicke, tiefe, m):
    """Rechteckiger Rahmen in der x-z-Ebene (Faltenbalg-Spant, Torzarge)."""
    box(cx, cy, z + H/2 - dicke/2, B, tiefe, dicke, m)
    box(cx, cy, z - H/2 + dicke/2, B, tiefe, dicke, m)
    box(cx - B/2 + dicke/2, cy, z, dicke, tiefe, H - 2*dicke, m)
    box(cx + B/2 - dicke/2, cy, z, dicke, tiefe, H - 2*dicke, m)

def dachrand(cx, cy, z, B, T, dicke, hoehe, m):
    """Nur ein RING. Eine Vollplatte mauert das Tonnengewoelbe von innen zu."""
    box(cx, cy - T/2 + dicke/2, z, B, dicke, hoehe, m)
    box(cx, cy + T/2 - dicke/2, z, B, dicke, hoehe, m)
    box(cx - B/2 + dicke/2, cy, z, dicke, T - 2*dicke, hoehe, m)
    box(cx + B/2 - dicke/2, cy, z, dicke, T - 2*dicke, hoehe, m)

def leiter(cx, cy, z0, z1, m, breite=0.52, sprosse=0.32, holm=0.06, achse='y'):
    h = z1 - z0
    for s in (-1, 1):
        if achse == 'y': box(cx + s*breite/2, cy, z0 + h/2, holm, holm*1.4, h, m)
        else:            box(cx, cy + s*breite/2, z0 + h/2, holm*1.4, holm, h, m)
    n = max(1, int(h / sprosse))
    for i in range(n):
        z = z0 + (i + 0.6)*h/n
        if achse == 'y': box(cx, cy, z, breite, holm*1.1, holm*0.8, m)
        else:            box(cx, cy, z, holm*1.1, breite, holm*0.8, m)

# ---------------------------------------------------------------- Loft
def loft(rings, m=None, kappen=True, name="Loft"):
    """Loftet eine Kette gleich langer Punktringe zu EINEM Mesh. Eine Kette
    einzelner Quader liest sich als Treppe — Rumpf, Tragflaeche und Leitwerk
    entstehen deshalb als echte Loft-Flaechen."""
    n = len(rings[0])
    verts = []
    for r in rings: verts += [tuple(p) for p in r]
    faces = []
    for i in range(len(rings) - 1):
        a = i*n; b = (i + 1)*n
        for k in range(n):
            k2 = (k + 1) % n
            faces.append((a + k, a + k2, b + k2, b + k))
    if kappen:
        faces.append(tuple(range(n)))
        faces.append(tuple(range((len(rings)-1)*n, len(rings)*n)))
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if m: me.materials.append(m)
    bpy.context.view_layer.objects.active = o
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free(); me.update()
    return o

def _profil(n=9):
    """(u, h): u = Lage auf der Sehne (0 = Nase), h = halbe Dicke als Sehnenanteil."""
    P = []
    for i in range(n):
        u = (1 - math.cos(math.pi*i/(n-1)))/2
        h = 0.5*math.sqrt(max(0.0, 1.0 - (2*u - 1)**2))*(1.0 - 0.30*u)
        P.append((u, h))
    return [(u, h) for u, h in P] + [(u, -h) for u, h in reversed(P[1:-1])]

PROF = _profil(9)            # 16 Punkte, geschlossener Umriss

def fluegel_ring(x, y_le, chord, z, dicke):
    """Profilschnitt einer Tragflaeche (Spannweite in x, Dicke in z)."""
    return [(x, y_le - u*chord, z + h*chord*dicke*2.0) for u, h in PROF]

def finne_ring(z, y_le, chord, dicke, x0=0.0):
    """Profilschnitt eines Seitenleitwerks (Spannweite in z, Dicke in x)."""
    return [(x0 + h*chord*dicke*2.0, y_le - u*chord, z) for u, h in PROF]

def kreis_ring(y, r, zc, seg=16, sq=1.0):
    return [(r*math.cos(k/seg*TAU), y, zc + r*sq*math.sin(k/seg*TAU)) for k in range(seg)]

# ---------------------------------------------------------------- Rundung/Export
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
    bpy.ops.export_scene.gltf(filepath=p1, export_format='GLB',
                              use_selection=False, export_apply=True)
    p2 = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p2)
    except Exception: bpy.ops.export_mesh.stl(filepath=p2)
    print("  ->", name, os.path.getsize(p1), "B")

# ---------------------------------------------------------------- Boden / Wand
FB = 0.30   # Fussboden-Oberkante — Aussensockel UND Innenboden enden hier, damit
            # in der Tuer keine Schwelle steht. Moebel: FB + Hoehe ueber Boden.

def boden(B, T, m_sockel, m_boden, rand=2.0):
    # Vorplatz 2 cm tiefer als der Innenboden: deckungsgleiche Flaechen flimmern
    box(0, 0, (FB - 0.02)/2, B + rand, T + rand, FB - 0.02, m_sockel)
    box(0, 0, FB/2, B, T, FB, m_boden)

def oeffnungs_achsen(laenge, n, off_b):
    """x-Mitten der n Oeffnungen und der n+1 Pfeiler — damit Stuetzen und Einbauten
    NICHT in einem Durchgang stehen."""
    pf = (laenge - n*off_b) / (n + 1)
    pfeiler = [-laenge/2 + pf/2 + i*(pf + off_b) for i in range(n + 1)]
    oeff = [-laenge/2 + pf + off_b/2 + i*(pf + off_b) for i in range(n)]
    return oeff, pfeiler

def wand_mit_oeffnungen(cx, cy, laenge, dicke, hoehe, m, n=3, off_b=3.0, off_h=3.4, achse='x'):
    oeff, pfeiler = oeffnungs_achsen(laenge, n, off_b)
    pf = (laenge - n*off_b) / (n + 1)
    for t in pfeiler:
        if pf > 0.01:
            if achse == 'x': box(cx + t, cy, hoehe/2, pf, dicke, hoehe, m)
            else:            box(cx, cy + t, hoehe/2, dicke, pf, hoehe, m)
    for t in oeff:
        if achse == 'x': box(cx + t, cy, off_h + (hoehe-off_h)/2, off_b, dicke, hoehe-off_h, m)
        else:            box(cx, cy + t, off_h + (hoehe-off_h)/2, dicke, off_b, hoehe-off_h, m)

def wand_mit_tuer(cx, cy, laenge, dicke, hoehe, m, tuer_b=2.4, tuer_h=3.2,
                  achse='x', tuer_off=0.0):
    seite = (laenge - tuer_b) / 2
    if achse == 'x':
        if seite > 0.01:
            box(cx + tuer_off - tuer_b/2 - seite/2, cy, hoehe/2, seite, dicke, hoehe, m)
            box(cx + tuer_off + tuer_b/2 + seite/2, cy, hoehe/2, seite, dicke, hoehe, m)
        box(cx + tuer_off, cy, tuer_h + (hoehe-tuer_h)/2, tuer_b, dicke, hoehe-tuer_h, m)
    else:
        if seite > 0.01:
            box(cx, cy + tuer_off - tuer_b/2 - seite/2, hoehe/2, dicke, seite, hoehe, m)
            box(cx, cy + tuer_off + tuer_b/2 + seite/2, hoehe/2, dicke, seite, hoehe, m)
        box(cx, cy + tuer_off, tuer_h + (hoehe-tuer_h)/2, dicke, tuer_b, hoehe-tuer_h, m)

def fensterband(cx, cy, laenge, dicke, zmit, hoehe, m_rahm, m_glas, n=3, achse='x', aus=1.0):
    """Fensterband. Das Glas steht knapp VOR der Wandflaeche (`aus` = Richtung)."""
    for i in range(n):
        t = (i + 0.5)/n - 0.5
        if achse == 'x':
            box(cx + t*laenge, cy, zmit, laenge/n*0.62, dicke*1.2, hoehe, m_rahm)
            box(cx + t*laenge, cy + aus*dicke*0.62, zmit, laenge/n*0.50, 0.06, hoehe*0.80, m_glas)
        else:
            box(cx, cy + t*laenge, zmit, dicke*1.2, laenge/n*0.62, hoehe, m_rahm)
            box(cx + aus*dicke*0.62, cy + t*laenge, zmit, 0.06, laenge/n*0.50, hoehe*0.80, m_glas)

def glasfassade(cx, cy, laenge, z0, z1, m_rahm, m_glas, nx=10, nz=3, achse='x', aus=1.0):
    """Pfosten-Riegel-Fassade. `cy` ist die AUSSENFLAECHE der Wand; die Scheiben
    sitzen 0.04 davor — steckten sie in der Wand, rendert das Haus fensterlos."""
    h = z1 - z0; zm = (z0 + z1)/2; step = laenge/nx
    for i in range(nx + 1):
        t = -laenge/2 + i*step
        if achse == 'x': box(cx + t, cy + aus*0.10, zm, 0.16, 0.22, h, m_rahm)
        else:            box(cx + aus*0.10, cy + t, zm, 0.22, 0.16, h, m_rahm)
    for k in range(nz + 1):
        z = z0 + k*h/nz
        if achse == 'x': box(cx, cy + aus*0.10, z, laenge, 0.22, 0.13, m_rahm)
        else:            box(cx + aus*0.10, cy, z, 0.22, laenge, 0.13, m_rahm)
    for i in range(nx):
        t = -laenge/2 + (i + 0.5)*step
        if achse == 'x': box(cx + t, cy + aus*0.045, zm, step*0.90, 0.06, h*0.97, m_glas)
        else:            box(cx + aus*0.045, cy + t, zm, 0.06, step*0.90, h*0.97, m_glas)

def platte_mit_loch(cx, cy, z, B, T, dicke, lb, lt, m):
    """Geschossdecke mit rechteckigem Luftraum (Galerie) — 4 Streifen."""
    sv = (T - lt)/2.0; sh = (B - lb)/2.0
    if sv > 0.01:
        box(cx, cy - lt/2 - sv/2, z, B, sv, dicke, m)
        box(cx, cy + lt/2 + sv/2, z, B, sv, dicke, m)
    if sh > 0.01:
        box(cx - lb/2 - sh/2, cy, z, sh, lt, dicke, m)
        box(cx + lb/2 + sh/2, cy, z, sh, lt, dicke, m)

def _halbzyl(o):
    nur(o)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    bm.to_mesh(o.data); bm.free(); o.data.update()
    return o

def tonne(cx, cy, z, r, laenge, m, seg=26, flach=1.0):
    """HALBES Tonnengewoelbe, Fassachse in x, Bogen spannt ueber y. Basis exakt bei z,
    sitzt also buendig auf der Mauerkrone. Ein voller Zylinder taugt nicht: seine
    untere Haelfte steckt im Gebaeude und verdeckt von innen alles."""
    o = _halbzyl(zyl(cx, cy, z, r, laenge, m, seg, rot=(0, math.pi/2, 0)))
    if flach != 1.0: o.scale[2] = flach     # Scheitel = r*flach ueber der Krone
    return o

# ---------------------------------------------------------------- Gelaender / Treppe
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
    """Treppenlauf mit begehbarer Steigung und mitlaufendem Gelaender. Laenge RECHNEN
    (n = round(Hoehe/Steigung)), nicht schaetzen."""
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

# ---------------------------------------------------------------- Einrichtung
def sitzreihe(px, py, n, m_sitz, m_stahl, s=1):
    """Wartereihe aus n Schalensitzen. s=+1: Ruecken auf -y (Blick nach +y)."""
    box(px, py, FB + 0.40, n*0.62 + 0.16, 0.56, 0.07, m_stahl)
    for i in range(n):
        x = px - (n-1)*0.31 + i*0.62
        box(x, py, FB + 0.46, 0.55, 0.52, 0.07, m_sitz)
        box(x, py - s*0.25, FB + 0.71, 0.55, 0.07, 0.50, m_sitz)
    for sx in (-1, 1):
        box(px + sx*(n*0.31 - 0.06), py, FB + 0.20, 0.09, 0.42, 0.40, m_stahl)

def checkin(px, py, m_korpus, m_platte, m_stahl, m_led, s=1, B=4.2):
    """Check-in-Schalter. s=+1: Kunden stehen auf +y, Personal auf -y."""
    box(px, py, FB + 0.50, B, 1.20, 1.00, m_korpus)
    box(px, py, FB + 1.05, B + 0.30, 1.44, 0.10, m_platte)
    box(px, py + s*0.72, FB + 0.12, B*0.62, 0.66, 0.24, m_stahl)      # Gepaeckwaage
    box(px, py + s*0.72, FB + 0.26, B*0.58, 0.60, 0.05, m_stahl)
    box(px, py - s*0.95, FB + 1.70, B, 0.22, 2.80, m_korpus)          # Rueckwand
    box(px, py - s*0.82, FB + 2.30, B*0.80, 0.08, 0.80, m_led)        # Flugnummer
    box(px, py - s*0.40, FB + 1.42, 0.60, 0.10, 0.44, m_led)          # Monitor
    box(px, py - s*0.40, FB + 1.18, 0.16, 0.16, 0.26, m_stahl)

def anzeigetafel(px, py, z, B, H, m_rahm, m_led, m_stahl, s=1, haenge_bis=None):
    """Abflugtafel. Anzeigeflaeche auf `s`-Seite, knapp VOR dem Rahmen."""
    box(px, py, z, B, 0.24, H, m_rahm)
    box(px, py + s*0.16, z, B*0.94, 0.06, H*0.84, m_led)
    for i in range(int(H/0.30)):
        box(px, py + s*0.20, z + H*0.40 - i*0.30, B*0.88, 0.03, 0.06, m_rahm)
    if haenge_bis is not None:
        for sx in (-B*0.34, B*0.34):
            box(px + sx, py, (z + H/2 + haenge_bis)/2, 0.09, 0.09,
                haenge_bis - z - H/2, m_stahl)

def kofferstapel(px, py, z, m_a, m_b, m_c, n=3):
    """Bunte Koffer, leicht versetzt gestapelt."""
    farben = (m_a, m_b, m_c)
    for i in range(n):
        h = 0.26
        box(px + (0.06 if i % 2 else -0.05), py + (0.04 if i % 3 == 0 else -0.06),
            z + h/2 + i*h, 0.72 - i*0.05, 0.46 - i*0.03, h, farben[i % 3])
        box(px + (0.06 if i % 2 else -0.05), py + (0.04 if i % 3 == 0 else -0.06),
            z + h/2 + i*h, 0.74 - i*0.05, 0.14, h*0.55, farben[(i+1) % 3])


# ================================================================ 1) Terminal
def terminal():
    """BEGEHBARE Abflughalle 52 x 30 m: Glasfassade, 3 Portale, Check-in-Reihe,
    Anzeigetafeln, Sitzreihen, Galerie mit Treppe, gebogenes Dach."""
    neu()
    AUS  = mat("Fassade",     (0.80,0.81,0.84), 0.70)
    W    = mat("Innenwand",   (0.88,0.89,0.90), 0.80)
    SOK  = mat("Vorplatz",    (0.46,0.46,0.44), 0.92)
    BOD  = mat("Hallenboden", (0.74,0.73,0.70), 0.55)
    BOD2 = mat("Bodenband",   (0.58,0.60,0.64), 0.55)
    GAL  = mat("Galerie",     (0.80,0.79,0.76), 0.65)
    DACH = mat("Dachschale",  (0.60,0.63,0.68), 0.45, 0.35)
    RAHM = mat("Fassadenriegel", (0.40,0.42,0.46), 0.40, 0.45)
    GLAS = mat("Glas",        (0.52,0.68,0.80), 0.14, 0.10)
    STAH = mat("Stahl",       (0.56,0.58,0.62), 0.35, 0.55)
    BLAU = mat("Leitfarbe",   (0.10,0.32,0.60), 0.55)
    SITZ = mat("Sitzschale",  (0.14,0.36,0.66), 0.60)
    KORP = mat("Schalterkorpus", (0.90,0.90,0.92), 0.55)
    HOLZ = mat("Thekenplatte", (0.42,0.30,0.20), 0.50)
    LED  = mat("Anzeige", (0.06,0.09,0.14), 0.25, 0.0, (0.28,0.90,0.55), 1.9)
    LICH = leucht("Deckenlicht", (1.0,0.97,0.90), 1.9)

    B, T, H, d = 52.0, 30.0, 11.0, 0.6
    OG = FB + 5.00                      # Galerie-Oberkante
    boden(B, T, SOK, BOD, 1.2)

    # ---- Huelle: Front (+y) 3 grosse Portale, Vorfeldseite (-y) 3 Ausgaenge
    wand_mit_oeffnungen(0,  T/2, B, d, H, AUS, 3, 6.0, 4.4)
    wand_mit_oeffnungen(0, -T/2, B, d, H, AUS, 3, 5.0, 4.4)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, AUS)
    _, pf_v = oeffnungs_achsen(B, 3, 6.0)      # Pfeilerachsen vorn: +-21.75, +-7.25
    # ---- Glas: durchgehendes Band ueber den Portalen, Scheiben VOR der Wand
    glasfassade(0,  T/2 + d/2, B - 0.4, 4.70, H - 0.5, RAHM, GLAS, 13, 3, 'x',  1.0)
    glasfassade(0, -T/2 - d/2, B - 0.4, 4.70, H - 0.5, RAHM, GLAS, 13, 3, 'x', -1.0)
    for sx in (-1, 1):                          # Seitenfassaden
        glasfassade(sx*(B/2 + d/2), 0, T - 1.0, 4.70, H - 0.5, RAHM, GLAS, 7, 3, 'y', sx)
        fensterband(sx*(B/2 + d/2), 0, T - 6.0, 0.30, FB + 2.10, 2.40, RAHM, GLAS, 5, 'y', sx)
    # Glas auch zwischen den Portalen (Erdgeschoss)
    for px in pf_v:
        glasfassade(px,  T/2 + d/2, 4.60, FB + 0.10, 4.50, RAHM, GLAS, 3, 2, 'x',  1.0)
        box(px, -T/2 - d/2 - 0.05, FB + 2.30, 3.60, 0.06, 4.20, GLAS)

    # ---- Dach: gebogene Schale buendig auf der Wandkrone, davor nur ein RAND-Ring
    dachrand(0, 0, H - 0.30, B + 1.0, T + 1.0, 0.55, 0.60, AUS)
    tonne(0, 0, H, (T + 0.8)/2, B + 0.8, DACH, 30, flach=0.30)      # Scheitel +4.62
    for i in range(9):                                              # Dachbinder aussen
        tonne(-B/2 + 3.0 + i*6.0, 0, H + 0.02, (T + 0.94)/2, 0.34, STAH, 30, flach=0.30)
    box(0, T/2 + 0.32, H + 2.60, 22.0, 0.40, 1.90, AUS)             # Schriftband
    box(0, T/2 + 0.56, H + 2.60, 19.0, 0.14, 1.20, LED)

    # ---- Vordach an der Schauseite (+y), Stuetzen auf den PFEILERACHSEN
    box(0, T/2 + 2.4, (FB - 0.02)/2, B - 4.0, 4.8, FB - 0.02, SOK)  # Vorfahrt
    box(0, T/2 + 1.9, 5.90, B - 6.0, 4.20, 0.42, AUS)
    box(0, T/2 + 1.9, 5.62, B - 6.6, 3.60, 0.16, RAHM)
    for px in pf_v:
        zyl(px, T/2 + 3.4, (FB + 5.70)/2, 0.26, 5.70 - FB, STAH, 14)
        box(px, T/2 + 3.4, FB + 0.08, 0.80, 0.80, 0.16, STAH)

    # ---- Tragende Saeulen (auf den Pfeilerachsen, nie im Portal)
    for px in (-21.6, -7.2, 7.2, 21.6):
        for py in (-11.0, 0.0, 11.0):
            zyl(px, py, (FB + H)/2, 0.42, H - FB, W, 14)
            box(px, py, FB + 0.24, 1.10, 1.10, 0.48, GAL)

    # ---- Galerie mit Luftraum 30 x 14 und Treppe hinein
    platte_mit_loch(0, 0, OG - 0.17, B - 2*d, T - 2*d, 0.34, 30.0, 14.0, GAL)
    box(0, 0, OG - 0.36, 30.4, 14.4, 0.06, BLAU)                    # Untersicht-Band
    n_st = int(round((OG - FB)/0.1724))                             # = 29 Stufen
    treppe(-12.0, -7.0 + n_st*0.28, FB, 1.80, OG - FB, GAL, STAH, 0.1724, 0.28, richtung=-1)
    gelaender(-15.0, 15.0,  7.0, OG, STAH, 1.05, 'x')               # Bruestung, am
    gelaender(-15.0, -13.1, -7.0, OG, STAH, 1.05, 'x')              # Treppenkopf offen
    gelaender(-10.9,  15.0, -7.0, OG, STAH, 1.05, 'x')
    for sx in (-15.0, 15.0):
        gelaender(-7.0, 7.0, sx, OG, STAH, 1.05, 'y')
    for px in (-21.6, -7.2, 7.2, 21.6):                             # Galerie: Cafe/Laden
        box(px, -11.0, OG + 1.55, 4.40, 0.30, 3.10, W)
        box(px, -11.18, OG + 1.70, 3.60, 0.06, 2.10, GLAS)
        box(px, -10.20, OG + 0.55, 3.20, 0.90, 1.10, HOLZ)
    for px in (-18.0, -4.0, 10.0):
        sitzreihe(px, 10.6, 5, SITZ, STAH, 1)
        sitzreihe(px, 11.9, 5, SITZ, STAH, -1)
    for sx in (-20.5, 20.5):                                        # Galerie-Sitzinseln
        for py in (-2.0, 2.0):
            box(sx, py, OG + 0.46, 3.20, 0.60, 0.08, SITZ)
            box(sx, py, OG + 0.22, 3.00, 0.40, 0.36, STAH)

    # ---- Check-in-Reihe im Erdgeschoss (unter der hinteren Galerie)
    for i in range(7):
        checkin(-19.2 + i*6.4, -9.4, KORP, HOLZ, STAH, LED, s=1, B=4.6)
    for i in range(8):                                              # Absperrbaender
        zyl(-21.0 + i*6.0, -6.6, FB + 0.50, 0.07, 1.00, STAH, 10)
        zyl(-21.0 + i*6.0, -6.6, FB + 1.06, 0.13, 0.12, STAH, 12)
        if i < 7: box(-18.0 + i*6.0, -6.6, FB + 0.92, 5.6, 0.06, 0.06, BLAU)
    box(0, -12.6, FB + 1.40, 44.0, 0.30, 2.20, W)                   # Rueckwand Schalter
    box(0, -12.42, FB + 2.00, 40.0, 0.08, 0.90, BLAU)

    # ---- Abflugtafeln, frei haengend im Luftraum
    for px in (-9.0, 9.0):
        anzeigetafel(px, 5.4, FB + 3.60, 7.0, 2.30, W, LED, STAH, s=1, haenge_bis=OG - 0.34)
    anzeigetafel(0, -6.9, FB + 3.30, 8.0, 2.00, W, LED, STAH, s=1, haenge_bis=OG - 0.34)

    # ---- Bodenleitband + Sicherheitskontrolle-Andeutung + Licht
    box(0, 3.0, FB + 0.02, 46.0, 1.10, 0.04, BOD2)
    for i in range(12):
        box(-22.0 + i*4.0, 3.0, FB + 0.03, 2.60, 0.34, 0.04, BLAU)
    for i in range(7):
        box(-21.0 + i*7.0, 0, H - 0.34, 0.55, T - 4.0, 0.16, LICH)
    for i in range(5):
        box(-16.0 + i*8.0, 12.6, OG + 3.40, 3.0, 0.24, 0.16, LICH)
    export("th25_terminal", 0.022, 2)


# ================================================================ 2) Kontrollturm
def tower():
    """Kontrollturm 34 m: Schaft, Umlaufgalerie, auskragende Kanzel mit GENEIGTEN
    Scheiben, Dachkranz mit Antennen."""
    neu()
    BET  = mat("Turmschaft", (0.82,0.81,0.78), 0.85)
    BET2 = mat("Schaftrippe", (0.70,0.69,0.66), 0.85)
    SOK  = mat("Sockel",     (0.48,0.47,0.45), 0.92)
    KANZ = mat("Kanzel",     (0.86,0.86,0.88), 0.55)
    STAH = mat("Stahl",      (0.56,0.58,0.62), 0.35, 0.55)
    DUNK = mat("Zarge",      (0.24,0.26,0.30), 0.45, 0.30)
    GLAS = mat("Kanzelglas", (0.40,0.60,0.74), 0.12, 0.10)
    ROT  = mat("Warnring",   (0.76,0.16,0.14), 0.6)
    TUER = mat("Tuer",       (0.20,0.34,0.54), 0.5)
    BAKE = leucht("Hindernisfeuer", (1.0,0.22,0.18), 3.0)
    LED  = leucht("Kanzellicht", (1.0,0.94,0.78), 1.8)

    HS = 25.0                      # Schafthoehe
    box(0, 0, 0.30, 9.6, 9.6, 0.60, SOK)                       # Fundamentplatte
    zyl(0, 0, 0.90, 3.30, 1.80, BET2, 16)                      # Sockelfuss
    zyl(0, 0, (1.80 + HS)/2, 2.60, HS - 1.80, BET, 16)         # Schaft
    for i in range(16):                                        # senkrechte Rippen
        a = i/16*TAU
        box(2.62*math.cos(a), 2.62*math.sin(a), (2.20 + HS)/2, 0.26, 0.26,
            HS - 2.20, BET2).rotation_euler[2] = a
    for k in range(5):                                         # Ringgesimse
        zyl(0, 0, 4.6 + k*4.4, 2.82, 0.34, BET2, 16)
    for k in range(6):                                         # Treppenhausfenster
        box(0, 2.60, 5.4 + k*3.2, 1.10, 0.28, 1.30, DUNK)
        box(0, 2.76, 5.4 + k*3.2, 0.86, 0.06, 1.05, GLAS)
    box(0, 2.66, FB + 1.55, 1.80, 0.34, 3.10, DUNK)            # Eingang
    box(0, 2.80, FB + 1.45, 1.40, 0.10, 2.80, TUER)
    box(0, 3.70, FB + 1.90, 3.00, 1.80, 0.26, STAH)            # kleines Vordach
    for sx in (-1.3, 1.3):
        zyl(sx, 4.40, (FB + 1.86)/2, 0.10, 1.86 - FB, STAH, 10)
    leiter(0, -2.72, 1.60, HS - 0.6, STAH, 0.56, 0.34, 0.06, 'y')

    # ---- Umlaufgalerie unter der Kanzel
    zyl(0, 0, HS + 0.12, 4.90, 0.24, STAH, 24)
    ring(0, 0, HS + 0.24, 4.86, 24, 0.10, 0.08, STAH)
    ring(0, 0, HS + 1.24, 4.86, 24, 0.09, 0.09, STAH)
    for i in range(24):
        a = i/24*TAU
        box(4.86*math.cos(a), 4.86*math.sin(a), HS + 0.76, 0.07, 0.07, 1.00, STAH)
    for i in range(12):                                        # Konsolen unter der Galerie
        a = i/12*TAU
        strebe((2.4*math.cos(a), 2.4*math.sin(a), HS - 1.90),
               (4.75*math.cos(a), 4.75*math.sin(a), HS + 0.05), 0.16, STAH)

    # ---- Auskragende Kanzel: Bruestungsring, geneigte Scheiben, Dachkranz
    ZU, ZO = HS + 0.24, HS + 4.30                              # Scheiben von 25.24 bis 29.30
    RU, RO = 4.10, 5.40                                        # unten schmal, oben weit
    zyl(0, 0, ZU + 0.55, RU + 0.08, 1.10, KANZ, 24)            # Bruestung
    ring(0, 0, ZU + 1.06, RU + 0.20, 24, 0.16, 0.16, DUNK)
    NP = 20
    for i in range(NP):                                        # GENEIGTE Scheiben
        a = (i + 0.5)/NP*TAU
        ch = 2.0*RU*math.sin(math.pi/NP)*1.02
        balken((RU*math.cos(a), RU*math.sin(a), ZU + 1.10),
               (RO*math.cos(a), RO*math.sin(a), ZO), ch, 0.07, GLAS)
    for i in range(NP):                                        # Pfosten dazwischen
        a = i/NP*TAU
        balken((RU*math.cos(a), RU*math.sin(a), ZU + 1.06),
               (RO*math.cos(a), RO*math.sin(a), ZO + 0.04), 0.13, 0.16, DUNK)
    zyl(0, 0, ZO + 0.26, RO + 0.30, 0.52, KANZ, 24)            # Dachkranz
    zyl(0, 0, ZO + 0.62, RO - 0.10, 0.30, KANZ, 24)
    ring(0, 0, ZO + 0.20, RO + 0.34, 24, 0.16, 0.30, DUNK)
    for i in range(NP):                                        # Kanzel-Innenlicht
        a = (i + 0.5)/NP*TAU
        box(3.5*math.cos(a), 3.5*math.sin(a), ZU + 3.70, 0.34, 0.34, 0.10, LED)
    zyl(0, 0, ZU + 2.05, 3.30, 0.16, DUNK, 24)                 # Kanzelboden/Pultring
    ring(0, 0, ZU + 1.86, 3.20, 18, 0.70, 0.34, DUNK)          # Konsolen im Ring

    # ---- Antennen und Hindernisfeuer (Gesamthoehe 34 m)
    zyl(0, 0, ZO + 2.80, 0.16, 4.00, STAH, 10)                 # Mittelmast bis 33.5
    zyl(0, 0, ZO + 4.86, 0.26, 0.34, BAKE, 12)                 # Feuer auf 34.0
    for i in range(3):
        a = i/3*TAU
        strebe((0, 0, ZO + 4.10), (2.6*math.cos(a), 2.6*math.sin(a), ZO + 0.80), 0.05, STAH)
    for sx in (-3.4, 3.4):                                     # Peitschenantennen
        zyl(sx, 0, ZO + 1.90, 0.06, 2.20, STAH, 8)
        zyl(sx, 0, ZO + 3.06, 0.14, 0.16, BAKE, 10)
    for sy in (-3.4, 3.4):                                     # Richtfunkspiegel
        o = kegel(0, sy, ZO + 1.40, 0.70, 0.62, 0.24, STAH, 16,
                  rot=(math.pi/2 if sy > 0 else -math.pi/2, 0, 0))
        zyl(0, sy*0.86, ZO + 1.40, 0.10, 0.60, STAH, 8, rot=(math.pi/2, 0, 0))
    zyl(0, 0, 12.0, 2.86, 0.40, ROT, 16)                       # Warnring am Schaft
    zyl(0, 0, 19.0, 2.86, 0.40, ROT, 16)
    export("th25_tower", 0.020, 2)


# ================================================================ 3) Verkehrsflugzeug
def flugzeug():
    """Zweistrahliges VERKEHRSflugzeug, 38 m lang / 34 m Spannweite. Rumpf, Fluegel
    und Leitwerk sind GELOFTET (Quaderketten sehen aus wie Treppen). Fahrwerk mit
    Raedern auf z=0, Tuerschwelle auf 3.50 m -> passt zur Fluggastbruecke."""
    neu()
    WEISS = mat("Rumpf",      (0.91,0.92,0.94), 0.32)
    BLAU  = mat("Zierband",   (0.09,0.26,0.56), 0.35)
    GRAU  = mat("Tragflaeche",(0.80,0.81,0.84), 0.38)
    ALU   = mat("Alu",        (0.66,0.68,0.72), 0.32, 0.45)
    TRIEB = mat("Triebwerk",  (0.74,0.75,0.78), 0.30, 0.35)
    FAN   = mat("Fan",        (0.22,0.24,0.28), 0.30, 0.50)
    DUNK  = mat("Fenster",    (0.09,0.12,0.18), 0.14, 0.10)
    GUMM  = mat("Reifen",     (0.10,0.10,0.11), 0.92)
    STAH  = mat("Fahrwerk",   (0.50,0.52,0.56), 0.32, 0.55)
    ROT   = leucht("Positionslicht rot",  (1.0,0.20,0.16), 2.6)
    GRUEN = leucht("Positionslicht gruen",(0.25,1.0,0.35), 2.6)
    LAMP  = leucht("Landescheinwerfer",   (1.0,0.96,0.80), 2.4)

    ZC = 4.20                                     # Rumpfmittelachse
    R  = 2.00                                     # Rumpfradius
    # ---- Rumpf: Stationen (y, Radius, Mittelachse). Nase +y, Heck -y.
    ST = [(-19.00, 0.26, 5.72), (-18.20, 0.66, 5.46), (-16.50, 1.14, 4.96),
          (-14.00, 1.62, 4.46), (-11.50, 1.94, 4.24), (-8.00, 2.00, ZC),
          (-3.00, 2.00, ZC), (3.00, 2.00, ZC), (8.00, 2.00, ZC),
          (12.00, 1.98, ZC), (14.50, 1.86, 4.16), (16.00, 1.62, 4.10),
          (17.20, 1.24, 4.02), (18.20, 0.78, 3.94), (19.00, 0.14, 3.86)]
    def r_at(y):
        for i in range(len(ST)-1):
            if ST[i][0] <= y <= ST[i+1][0]:
                t = (y - ST[i][0])/(ST[i+1][0] - ST[i][0])
                return ST[i][1] + t*(ST[i+1][1] - ST[i][1]), ST[i][2] + t*(ST[i+1][2] - ST[i][2])
        return ST[0][1], ST[0][2]
    loft([kreis_ring(y, r, zc, 18) for (y, r, zc) in ST], WEISS, True, "Rumpf")

    # ---- Zierband + Bauchfarbe entlang der Rumpfkontur (folgt der Kruemmung)
    for i in range(46):
        y = -18.0 + i*0.82
        r, zc = r_at(y)
        xs = math.sqrt(max(0.01, r*r - 0.62*0.62))
        for sx in (-1, 1):
            box(sx*(xs + 0.015), y, zc - 0.62, 0.05, 0.86, 0.34, BLAU)
        box(0, y, zc - r + 0.06, r*1.30, 0.86, 0.10, ALU)
    # ---- Kabinenfenster
    for i in range(26):
        y = -8.6 + i*0.84
        r, zc = r_at(y)
        xs = math.sqrt(max(0.01, r*r - 0.55*0.55))
        for sx in (-1, 1):
            box(sx*(xs + 0.012), y, zc + 0.55, 0.05, 0.30, 0.26, DUNK)
    # ---- Tueren: aus 4 Streifen gestapelt, damit sie der Woelbung folgen
    for ty in (9.60, -9.60):
        r, zc = r_at(ty)
        for k in range(5):
            z = 3.62 + k*0.40
            xs = math.sqrt(max(0.01, r*r - (z - zc)**2))
            for sx in (-1, 1):
                box(sx*(xs + 0.012), ty, z, 0.05, 0.98, 0.38, ALU)
        for sx in (-1, 1):
            box(sx*(math.sqrt(max(0.01, r*r - 0.16))+0.03), ty, 3.50, 0.06, 1.06, 0.07, BLAU)
    # ---- Cockpitfenster
    for k, (yy, zz, bb, hh) in enumerate(((16.30, 5.00, 0.90, 0.52),
                                          (17.15, 4.86, 0.80, 0.46),
                                          (17.85, 4.66, 0.62, 0.38))):
        r, zc = r_at(yy)
        xs = math.sqrt(max(0.01, r*r - (zz - zc)**2))
        for sx in (-1, 1):
            box(sx*(xs + 0.02), yy, zz, 0.06, bb, hh, DUNK)
    box(0, 18.05, 5.12, 1.10, 0.90, 0.24, DUNK)

    # ---- Tragflaechen: EIN Loft von -17 bis +17, laeuft durch den Rumpf
    XS = [-17.0, -14.0, -10.0, -6.0, -3.0, 0.0, 3.0, 6.0, 10.0, 14.0, 17.0]
    def w_ring(x):
        a = abs(x)/17.0
        chord = 6.40 - 4.40*a
        y_le  = 3.40 - abs(x)*0.42
        z     = 3.05 + abs(x)*0.055
        return fluegel_ring(x, y_le, chord, z, 0.12)
    loft([w_ring(x) for x in XS], GRAU, True, "Tragflaeche")
    for sx in (-1, 1):                                     # Winglets
        zt = 3.05 + 17*0.055; yt = 3.40 - 17*0.42
        loft([finne_ring(zt + 0.02, yt - 0.30, 1.70, 0.10, sx*17.0),
              finne_ring(zt + 0.80, yt - 0.62, 1.40, 0.10, sx*17.15),
              finne_ring(zt + 1.55, yt - 0.95, 1.05, 0.10, sx*17.30)], GRAU, True, "Winglet")
        box(sx*17.34, yt - 1.60, zt + 1.52, 0.14, 0.24, 0.16, ROT if sx < 0 else GRUEN)
    for sx in (-1, 1):                                     # Klappenschienen
        for px in (5.2, 8.4, 11.6):
            x = sx*px
            a = abs(x)/17.0
            y_le = 3.40 - abs(x)*0.42; chord = 6.40 - 4.40*a
            box(x, y_le - chord - 0.28, 3.05 + abs(x)*0.055 - 0.22, 0.42, 1.30, 0.30, GRAU)

    # ---- Triebwerke unter den Fluegeln
    for sx in (-1, 1):
        px = sx*7.0
        zn = 2.05
        zyl(px, 1.90, zn, 1.10, 4.60, TRIEB, 18, rot=(math.pi/2, 0, 0))     # Gondel
        kegel(px, 4.34, zn, 1.10, 1.02, 0.30, ALU, 18, rot=(math.pi/2, 0, 0))
        zyl(px, 4.12, zn, 0.98, 0.14, FAN, 18, rot=(math.pi/2, 0, 0))       # Fanflaeche
        zyl(px, 4.06, zn, 0.20, 0.34, ALU, 12, rot=(math.pi/2, 0, 0))       # Spinner
        kegel(px, -0.70, zn, 1.02, 0.56, 1.20, TRIEB, 18, rot=(-math.pi/2, 0, 0))
        zyl(px, -1.44, zn, 0.46, 0.50, FAN, 14, rot=(math.pi/2, 0, 0))      # Duese
        box(px, 1.20, 3.20, 0.36, 2.60, 1.10, GRAU)                         # Pylon
        box(px, 4.20, zn - 0.94, 0.30, 0.20, 0.22, LAMP)                    # Landelicht

    # ---- Leitwerk
    loft([finne_ring(5.20, -11.60, 7.00, 0.11),
          finne_ring(7.10, -12.97, 5.82, 0.11),
          finne_ring(8.90, -14.27, 4.70, 0.11),
          finne_ring(10.40, -15.34, 3.77, 0.11),
          finne_ring(11.50, -16.14, 3.10, 0.11)], BLAU, True, "Seitenleitwerk")
    HS = [-6.50, -4.00, -2.00, 0.0, 2.00, 4.00, 6.50]
    def h_ring(x):
        a = abs(x)/6.5
        return fluegel_ring(x, -13.40 - abs(x)*0.30, 3.40 - 1.60*a, 5.75 + abs(x)*0.03, 0.10)
    loft([h_ring(x) for x in HS], GRAU, True, "Hoehenleitwerk")
    box(0, -16.30, 11.66, 0.34, 1.20, 0.24, ALU)                 # Antennenfaehnchen
    box(0, -19.05, 5.72, 0.30, 0.34, 0.30, WEISS)                # APU-Auslass
    box(0, -19.18, 5.72, 0.22, 0.14, 0.22, FAN)

    # ---- Fahrwerk: Raeder beruehren z=0 exakt (Mitte = Radius, gerade Segmentzahl)
    zyl(0, 13.00, 1.42, 0.15, 1.90, STAH, 10)                    # Bugfahrwerksbein
    box(0, 13.00, 0.86, 0.30, 0.44, 0.60, STAH)
    for sx in (-0.32, 0.32):
        rad(sx, 13.00, 0.45, 0.45, 0.24, GUMM, 16)
        rad(sx, 13.00, 0.45, 0.20, 0.26, ALU, 16)
    for sx in (-1, 1):                                           # Bugfahrwerksklappen
        box(sx*0.52, 13.00, 1.70, 0.06, 1.70, 1.20, WEISS)
    box(0, 12.60, 0.62, 0.28, 0.26, 0.24, LAMP)                  # Rollscheinwerfer
    for sx in (-1, 1):
        px = sx*3.90
        zyl(px, -1.60, 1.76, 0.19, 2.28, STAH, 10)               # Hauptbein
        strebe((px, -1.60, 2.70), (px + sx*0.90, -1.60, 3.10), 0.13, STAH)
        box(px, -1.60, 0.86, 0.34, 1.30, 0.34, STAH)             # Achstraeger
        for py in (-2.16, -1.04):
            for dx in (-0.44, 0.44):
                rad(px + dx, py, 0.62, 0.62, 0.34, GUMM, 16)
                rad(px + dx, py, 0.62, 0.27, 0.36, ALU, 16)
        box(px + sx*0.86, -1.60, 2.40, 0.08, 2.20, 1.80, WEISS)  # Fahrwerksklappe
        box(px, -1.60, 3.10, 1.60, 2.60, 0.50, GRAU)             # Fahrwerkskasten
    box(0, 5.20, 2.28, 3.40, 4.20, 0.28, ALU)                    # Fluegelwurzelverkleidung
    box(0, -4.60, 2.30, 3.20, 4.00, 0.30, ALU)
    export("th25_flugzeug", 0.016, 2)


# ================================================================ 4) Fluggastbruecke
def fluggastbruecke():
    """Fluggastbruecke auf Stuetzen: Rotunde am Terminal (-y), Tunnel, Kabine und
    FALTENBALG am Flugzeug (+y). Balgmitte auf 4.45 m, Schwelle 3.50 m."""
    neu()
    HAUT = mat("Bruecke",   (0.86,0.87,0.89), 0.55)
    GRAU = mat("Rippe",     (0.62,0.63,0.66), 0.55)
    RAHM = mat("Fensterrahmen", (0.34,0.36,0.40), 0.40, 0.45)
    GLAS = mat("Glas",      (0.46,0.64,0.78), 0.13, 0.10)
    STAH = mat("Stahl",     (0.54,0.56,0.60), 0.35, 0.55)
    BALG = mat("Faltenbalg",(0.20,0.21,0.23), 0.90)
    GUMM = mat("Reifen",    (0.10,0.10,0.11), 0.92)
    GELB = mat("Warnfarbe", (0.92,0.74,0.12), 0.60)
    BOD  = mat("Laufboden", (0.36,0.37,0.40), 0.75)
    LED  = leucht("Andocklicht", (1.0,0.92,0.70), 2.0)

    ZF = 3.50                      # Fussbodenoberkante = Tuerschwelle am Flugzeug
    ZD = 6.40                      # Tunneldecke
    # ---- Rotunde am Terminal
    zyl(0, -9.00, 1.60, 1.75, 3.20, GRAU, 16)                    # Drehsockel
    zyl(0, -9.00, 0.16, 2.30, 0.32, STAH, 16)
    zyl(0, -9.00, (ZF - 0.28 + ZD + 0.30)/2, 2.75, ZD + 0.30 - ZF + 0.28, HAUT, 18)
    zyl(0, -9.00, ZD + 0.52, 2.95, 0.34, GRAU, 18)               # Dachkranz
    for i in range(18):                                          # Fensterband rundum
        a = i/18*TAU
        box(2.79*math.cos(a), -9.00 + 2.79*math.sin(a), ZF + 1.95,
            0.10, 0.62, 1.30, GLAS).rotation_euler[2] = a
    ring(0, -9.00, ZF + 2.68, 2.80, 18, 0.14, 0.14, RAHM)
    ring(0, -9.00, ZF + 1.22, 2.80, 18, 0.14, 0.14, RAHM)

    # ---- Tunnel von y=-8.0 bis y=+5.4
    L0, L1 = -8.00, 5.40
    LM, LL = (L0 + L1)/2, L1 - L0
    box(0, LM, ZF - 0.14, 2.90, LL, 0.28, BOD)                   # Boden
    for sx in (-1, 1):
        box(sx*1.52, LM, (ZF + ZD)/2, 0.14, LL, ZD - ZF, HAUT)   # Seitenwaende
        box(sx*1.58, LM, ZF + 1.95, 0.06, LL*0.94, 0.95, GLAS)   # Glas VOR der Wand
        box(sx*1.56, LM, ZF + 2.46, 0.12, LL*0.96, 0.12, RAHM)
        box(sx*1.56, LM, ZF + 1.44, 0.12, LL*0.96, 0.12, RAHM)
        for i in range(9):                                       # Rippen
            box(sx*1.60, L0 + 0.8 + i*1.6, (ZF + ZD)/2, 0.10, 0.18, ZD - ZF, GRAU)
        box(sx*1.30, LM, ZF + 0.92, 0.09, LL*0.96, 0.09, STAH)   # Handlauf innen
    box(0, LM, ZD + 0.13, 3.24, LL, 0.26, GRAU)                  # Dach
    box(0, LM, ZF - 0.34, 2.60, LL, 0.14, STAH)                  # Untergurt
    for i in range(7):
        box(0, L0 + 1.0 + i*2.0, ZD - 0.14, 1.60, 0.30, 0.10, LED)

    # ---- Fahrbare Stuetze (Portal mit Radbogie) unter dem Tunnel
    SY = 3.10
    for sx in (-1, 1):
        box(sx*1.85, SY, 2.10, 0.34, 0.42, 2.60, STAH)
        box(sx*1.85, SY, 3.28, 0.44, 0.52, 0.30, GRAU)
    box(0, SY, 0.86, 4.10, 0.50, 0.34, STAH)                     # Bogiebalken
    box(0, SY, 1.32, 1.40, 0.60, 0.60, GRAU)                     # Antriebskasten
    box(0, SY, 3.44, 3.60, 0.60, 0.22, GELB)
    for dx in (-1.85, 1.85):
        for dy in (-0.62, 0.62):
            rad(dx, SY + dy, 0.46, 0.46, 0.30, GUMM, 16)
            rad(dx, SY + dy, 0.46, 0.20, 0.32, STAH, 16)
    strebe((-1.85, SY, 3.20), (1.85, SY - 0.02, 1.10), 0.12, STAH)
    strebe(( 1.85, SY, 3.20), (-1.85, SY - 0.02, 1.10), 0.12, STAH)

    # ---- Kabine mit Bedienstand
    box(0, 6.20, (ZF - 0.28 + ZD + 0.34)/2, 3.50, 1.90, ZD + 0.34 - ZF + 0.28, HAUT)
    box(0, 6.20, ZD + 0.60, 3.80, 2.20, 0.32, GRAU)
    for sx in (-1, 1):
        box(sx*1.79, 6.20, ZF + 2.10, 0.06, 1.50, 1.10, GLAS)
    box(0, 7.16, ZF + 2.10, 2.40, 0.08, 1.10, GLAS)              # Frontscheibe
    box(0, 7.02, ZF + 0.60, 1.30, 0.44, 0.80, GRAU)              # Bedienpult
    box(0, 6.86, ZF + 1.04, 1.10, 0.20, 0.16, LED)
    box(0, 6.20, ZD + 0.86, 1.20, 0.90, 0.20, LED)               # Andockscheinwerfer
    box(0, 6.20, ZF - 0.30, 3.20, 1.90, 0.20, STAH)

    # ---- Faltenbalg: 8 Spanten, Oeffnung 2.60 x 1.90 auf Schwelle 3.50
    for i in range(8):
        y = 7.24 + i*0.21
        s = 1.0 - i*0.018
        rahmen(0, y, ZF + 0.95, 3.30*s, 2.70*s, 0.16, 0.15, BALG)
    box(0, 8.86, ZF + 0.95, 3.06, 0.16, 2.46, BALG)              # Abschlussrahmen
    rahmen(0, 8.94, ZF + 0.95, 3.06, 2.50, 0.13, 0.14, GRAU)
    box(0, 8.90, ZF - 0.06, 2.60, 0.30, 0.16, GELB)              # Uebergangsblech
    for sx in (-1, 1):
        box(sx*1.66, 8.30, ZF + 0.95, 0.10, 1.90, 2.60, BALG)
    box(0, 8.36, ZF + 2.36, 3.30, 2.10, 0.14, BALG)              # Balgdach
    export("th25_fluggastbruecke", 0.018, 2)


# ================================================================ 5) Hangar
def hangar():
    """BEGEHBARE Wartungshalle 44 x 32 m: riesiges Tor (30 x 9 m), Tonnendach,
    Werkstattzeile an der Rueckwand, Hallenkran unter der Decke."""
    neu()
    AUS  = mat("Hallenwand",  (0.72,0.73,0.75), 0.75)
    RIPP = mat("Trapezrippe", (0.60,0.61,0.64), 0.70)
    SOK  = mat("Vorfeld",     (0.44,0.44,0.42), 0.92)
    BOD  = mat("Hallenboden", (0.56,0.57,0.56), 0.60)
    DACH = mat("Dachschale",  (0.58,0.60,0.64), 0.50, 0.35)
    STAH = mat("Stahl",       (0.54,0.56,0.60), 0.35, 0.55)
    GELB = mat("Warnfarbe",   (0.92,0.76,0.14), 0.60)
    ROT  = mat("Kran",        (0.78,0.24,0.14), 0.55)
    BLAU = mat("Werkbank",    (0.16,0.36,0.62), 0.55)
    HOLZ = mat("Bankplatte",  (0.46,0.33,0.20), 0.65)
    GLAS = mat("Glas",        (0.48,0.66,0.78), 0.13, 0.10)
    RAHM = mat("Rahmen",      (0.34,0.36,0.40), 0.40, 0.45)
    WEIS = mat("Bodenmarke",  (0.90,0.90,0.88), 0.65)
    LICH = leucht("Hallenlicht", (1.0,0.97,0.90), 2.0)

    B, T, H, d = 44.0, 32.0, 10.0, 0.7
    TB, TH = 30.0, 9.0                       # Tor: 30 m breit, 9 m hoch
    boden(B, T, SOK, BOD, 1.2)
    wand_mit_oeffnungen(0, T/2, B, d, H, AUS, 1, TB, TH)         # Tor auf +y
    box(0, -T/2, H/2, B, d, H, AUS)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, AUS)
    for i in range(15):                                          # Trapezblech-Rippen
        for sx in (-1, 1):
            box(sx*(B/2 + d/2 + 0.04), -T/2 + 1.0 + i*2.2, H/2, 0.10, 0.28, H, RIPP)
    for i in range(19):
        box(-B/2 + 1.0 + i*2.4, -T/2 - d/2 - 0.04, H/2, 0.28, 0.10, H, RIPP)
    for sx in (-1, 1):                                           # Fensterband oben
        glasfassade(sx*(B/2 + d/2), 0, T - 3.0, H - 2.60, H - 0.60, RAHM, GLAS, 9, 1, 'y', sx)
    glasfassade(0, -T/2 - d/2, B - 3.0, H - 2.60, H - 0.60, RAHM, GLAS, 13, 1, 'x', -1.0)
    wand_mit_tuer(0, -T/2 - 0.0, 0.0, 0, 0, AUS) if False else None
    box(-16.0, -T/2 - d/2 - 0.06, FB + 1.55, 1.60, 0.10, 2.50, RAHM)   # Nebentuer
    box(-16.0, -T/2 - d/2 - 0.12, FB + 1.50, 1.30, 0.06, 2.30, BLAU)

    # ---- Dach: halbes Tonnengewoelbe buendig auf der Krone, Attika nur als RING
    dachrand(0, 0, H - 0.30, B + 1.0, T + 1.0, 0.55, 0.60, AUS)
    tonne(0, 0, H, (T + 0.8)/2, B + 0.8, DACH, 30, flach=0.42)   # Scheitel +6.89
    for i in range(8):
        tonne(-B/2 + 3.0 + i*5.4, 0, H + 0.02, (T + 0.96)/2, 0.32, STAH, 30, flach=0.42)

    # ---- Torzarge, Laufschiene und geparkte Torfluegel
    box(0, T/2 + 0.16, TH + 0.42, TB + 1.4, 0.50, 0.84, GELB)
    box(0, T/2 + 0.62, TH + 1.10, TB + 2.6, 0.34, 0.34, STAH)    # Laufschiene
    for sx in (-1, 1):
        for k in range(2):
            px = sx*(15.9 + k*3.4)
            box(px, T/2 + 0.62, (FB + TH)/2, 3.30, 0.30, TH - FB, RIPP)
            box(px, T/2 + 0.50, TH - 0.60, 3.30, 0.10, 0.34, GELB)
            box(px, T/2 + 0.50, FB + 2.40, 2.40, 0.08, 1.10, GLAS)
        box(sx*(TB/2 + 0.12), T/2, (FB + TH)/2, 0.34, 0.90, TH - FB, GELB)

    # ---- Hallenkran: 2 Kranbahnen, Bruecke, Laufkatze, Haken
    for sy in (-11.0, 11.0):
        box(0, sy, 8.20, B - 1.6, 0.44, 0.70, STAH)
        for i in range(7):                                       # Konsolen an der Wand
            box(-18.0 + i*6.0, sy + (0.6 if sy > 0 else -0.6), 7.60, 0.60, 1.00, 0.50, STAH)
        box(0, sy, 8.62, B - 1.6, 0.60, 0.16, RIPP)
    box(-6.0, 0, 8.86, 1.20, 23.4, 0.90, ROT)                    # Kranbruecke
    box(-6.0, 0, 8.30, 0.70, 23.4, 0.34, STAH)
    for sy in (-10.9, 10.9):
        box(-6.0, sy, 8.30, 1.60, 0.90, 0.60, ROT)
        for dx in (-0.5, 0.5):
            zyl(-6.0 + dx, sy, 8.02, 0.24, 0.20, STAH, 12, rot=(math.pi/2, 0, 0))
    box(-6.0, 3.0, 8.10, 2.20, 2.00, 0.80, ROT)                  # Laufkatze
    zyl(-6.0, 3.0, 6.30, 0.05, 3.20, STAH, 8)                    # Seil
    box(-6.0, 3.0, 4.56, 0.50, 0.50, 0.44, STAH)                 # Hakenflasche
    zyl(-6.0, 3.0, 4.10, 0.09, 0.60, STAH, 10)
    zyl(-6.0, 3.0, 3.78, 0.26, 0.12, STAH, 12, rot=(math.pi/2, 0, 0))

    # ---- Werkstattzeile an der Rueckwand (NEBEN dem Tor, nie davor)
    for i in range(6):
        px = -18.0 + i*7.2
        box(px, -13.4, FB + 0.44, 5.60, 0.90, 0.88, BLAU)        # Werkbank
        box(px, -13.4, FB + 0.94, 5.90, 1.10, 0.12, HOLZ)
        box(px, -14.30, FB + 2.10, 5.60, 0.16, 1.70, RIPP)       # Werkzeugtafel
        for k in range(6):                                       # Werkzeug
            box(px - 2.2 + k*0.9, -14.16, FB + 2.40, 0.16, 0.06, 0.60, STAH)
            box(px - 2.2 + k*0.9, -14.16, FB + 1.62, 0.34, 0.06, 0.22, GELB)
        box(px, -12.60, FB + 0.30, 1.20, 0.70, 0.60, ROT)        # Werkzeugwagen
        box(px, -12.60, FB + 0.63, 1.30, 0.80, 0.06, STAH)
    for i in range(4):                                           # Materialregale
        px = -19.0 + i*5.4
        box(px, -10.4, FB + 1.40, 4.20, 1.00, 0.14, RIPP)
        box(px, -10.4, FB + 2.30, 4.20, 1.00, 0.14, RIPP)
        for sx in (-2.0, 2.0):
            box(px + sx, -10.4, FB + 1.30, 0.14, 1.00, 2.60, STAH)
        for k in range(4):
            box(px - 1.5 + k*1.0, -10.4, FB + 1.71, 0.80, 0.70, 0.48, GELB if k % 2 else BLAU)
            box(px - 1.5 + k*1.0, -10.4, FB + 2.60, 0.80, 0.70, 0.44, BLAU if k % 2 else ROT)
    box(17.0, -11.6, FB + 1.55, 8.00, 6.40, 3.10, RIPP)          # Meisterbuero
    box(17.0, -8.38, FB + 1.90, 6.20, 0.10, 1.60, GLAS)
    box(13.4, -11.6, FB + 1.30, 0.10, 1.40, 2.40, RAHM)
    box(17.0, -11.6, FB + 3.20, 8.40, 6.80, 0.20, STAH)
    gelaender(-3.6, 3.6, -8.30, FB + 3.30, STAH, 1.05, 'x')
    treppe(21.6, -8.10, FB, 1.20, 3.20, RIPP, STAH, 0.178, 0.28, richtung=1)

    # ---- Bodenmarkierung: Rollgasse mittig durchs Tor
    box(0, 1.0, FB + 0.02, 0.30, 26.0, 0.04, GELB)
    for sx in (-1, 1):
        box(sx*7.5, 1.0, FB + 0.02, 0.18, 26.0, 0.04, WEIS)
    for i in range(9):
        box(0, -10.0 + i*3.2, FB + 0.02, 3.20, 0.16, 0.04, WEIS)
    box(0, 13.4, FB + 0.02, TB - 1.0, 0.34, 0.04, GELB)
    for i in range(9):
        box(-16.0 + i*4.0, 14.2, FB + 0.02, 1.60, 0.90, 0.04, GELB)
    for i in range(6):                                           # Hallenlicht
        box(-16.5 + i*6.6, 0, 9.50, 0.60, T - 5.0, 0.18, LICH)
    export("th25_hangar", 0.022, 2)


# ================================================================ 6) Gepaeckwagen
def gepaeckwagen():
    """Schlepper mit 2 Gepaeckanhaengern und Koffern. Front auf +y."""
    neu()
    LACK = mat("Lack",     (0.92,0.72,0.10), 0.45)
    DUNK = mat("Rahmen",   (0.20,0.21,0.24), 0.60)
    STAH = mat("Stahl",    (0.54,0.56,0.60), 0.35, 0.55)
    GUMM = mat("Reifen",   (0.10,0.10,0.11), 0.92)
    GLAS = mat("Scheibe",  (0.44,0.62,0.76), 0.13, 0.10)
    SITZ = mat("Sitz",     (0.16,0.17,0.20), 0.80)
    PLAN = mat("Plane",    (0.24,0.36,0.56), 0.80)
    HOLZ = mat("Ladeflaeche", (0.42,0.33,0.24), 0.75)
    K1   = mat("Koffer rot",   (0.72,0.20,0.18), 0.60)
    K2   = mat("Koffer blau",  (0.16,0.34,0.62), 0.60)
    K3   = mat("Koffer gruen", (0.20,0.50,0.34), 0.60)
    LAMP = leucht("Rundumlicht", (1.0,0.72,0.14), 2.6)
    RUCK = leucht("Ruecklicht",  (1.0,0.20,0.16), 2.2)

    # ---- Schlepper
    box(0, 3.90, 0.62, 1.70, 3.30, 0.34, DUNK)                   # Rahmen
    box(0, 4.10, 1.02, 1.86, 2.70, 0.50, LACK)                   # Motorhaube/Wanne
    box(0, 5.35, 0.80, 1.90, 0.34, 0.44, DUNK)                   # Stossfaenger vorn
    for sx in (-0.66, 0.66):
        box(sx, 5.46, 1.06, 0.34, 0.16, 0.24, LAMP)              # Scheinwerfer
    box(0, 3.30, 0.98, 1.60, 0.70, 0.44, SITZ)                   # Sitz
    box(0, 2.98, 1.48, 1.60, 0.16, 0.60, SITZ)
    box(0, 4.20, 1.44, 1.20, 0.12, 0.34, DUNK)                   # Lenksaeule
    zyl(0, 4.14, 1.72, 0.24, 0.06, DUNK, 14, rot=(1.15, 0, 0))   # Lenkrad
    for sx in (-0.80, 0.80):                                     # Kabinenpfosten
        for py in (2.85, 4.85):
            box(sx, py, 1.90, 0.10, 0.10, 1.60, STAH)
    box(0, 3.85, 2.76, 1.80, 2.20, 0.14, LACK)                   # Dach
    box(0, 3.85, 2.90, 1.10, 0.80, 0.16, LAMP)                   # Rundumleuchte
    box(0, 4.86, 2.00, 1.56, 0.06, 1.20, GLAS)                   # Frontscheibe
    for dx in (-0.82, 0.82):
        rad(dx, 4.80, 0.36, 0.36, 0.26, GUMM, 16)
        rad(dx, 4.80, 0.36, 0.15, 0.28, STAH, 16)
        rad(dx, 2.90, 0.40, 0.40, 0.30, GUMM, 16)
        rad(dx, 2.90, 0.40, 0.17, 0.32, STAH, 16)
    box(0, 2.30, 0.56, 0.60, 0.50, 0.22, DUNK)                   # Kupplung
    box(0, 1.94, 0.52, 0.16, 0.60, 0.14, STAH)

    # ---- 2 Anhaenger
    for k, ym in enumerate((0.10, -3.70)):
        box(0, ym, 0.44, 1.72, 3.00, 0.20, DUNK)                 # Fahrgestell
        box(0, ym, 0.62, 1.90, 3.20, 0.16, HOLZ)                 # Ladeflaeche
        for sx in (-1, 1):
            box(sx*0.99, ym, 0.86, 0.10, 3.20, 0.34, DUNK)       # Bordwand
        box(0, ym - 1.58, 0.86, 1.90, 0.10, 0.34, DUNK)
        box(0, ym + 1.58, 0.86, 1.90, 0.10, 0.34, DUNK)
        for sx in (-0.86, 0.86):                                 # Dachstuetzen
            for py in (-1.42, 1.42):
                box(sx, ym + py, 1.36, 0.09, 0.09, 1.32, STAH)
        box(0, ym, 2.06, 2.06, 3.30, 0.10, PLAN)                 # Dach
        box(0, ym, 1.98, 2.10, 3.34, 0.08, STAH)
        for dx in (-0.80, 0.80):
            rad(dx, ym + 1.05, 0.28, 0.28, 0.22, GUMM, 16)
            rad(dx, ym + 1.05, 0.28, 0.12, 0.24, STAH, 16)
            rad(dx, ym - 1.05, 0.28, 0.28, 0.22, GUMM, 16)
            rad(dx, ym - 1.05, 0.28, 0.12, 0.24, STAH, 16)
        box(0, ym + 1.80, 0.46, 0.14, 0.70, 0.12, STAH)          # Deichsel
        box(0, ym + 2.14, 0.46, 0.34, 0.24, 0.18, DUNK)
        for sx in (-0.72, 0.72):
            box(sx, ym - 1.66, 0.72, 0.20, 0.08, 0.14, RUCK)
        # Koffer
        kofferstapel(-0.45, ym + 0.95, 0.70, K1, K2, K3, 3)
        kofferstapel( 0.45, ym + 0.95, 0.70, K2, K3, K1, 2)
        kofferstapel(-0.45, ym - 0.05, 0.70, K3, K1, K2, 2)
        kofferstapel( 0.45, ym - 0.10, 0.70, K1, K3, K2, 3)
        kofferstapel(-0.42, ym - 1.05, 0.70, K2, K1, K3, 2)
        kofferstapel( 0.46, ym - 1.02, 0.70, K3, K2, K1, 3)
    export("th25_gepaeckwagen", 0.014, 2)


# ================================================================ 7) Landebahn-Modul
def landebahn_modul():
    """Bahnbelag, exakt 30,0 m in x, reihbar (x += 30,0).
    Mittellinie: Strich 6,0 / Luecke 4,0 (Periode 10,0) -> laeuft ueber die Fuge.
    Randbefeuerung: Raster 5,0 -> laeuft ueber die Fuge.
    Schulterstreifen: durchgehende Linien, ebenfalls fugenlos."""
    neu()
    ASPH = mat("Bahnbelag",  (0.20,0.20,0.21), 0.95)
    ASP2 = mat("Belagfuge",  (0.26,0.26,0.27), 0.95)
    SCHU = mat("Schulter",   (0.34,0.33,0.30), 0.95)
    GRAS = mat("Bankett",    (0.26,0.38,0.20), 0.95)
    WEIS = mat("Markierung", (0.92,0.92,0.90), 0.60)
    GELB = mat("Randmarkierung", (0.90,0.78,0.16), 0.60)
    STAH = mat("Leuchtenfuss", (0.48,0.50,0.54), 0.40, 0.50)
    FEUW = leucht("Randfeuer weiss", (1.0,0.96,0.86), 2.8)
    FEUB = leucht("Schwellenfeuer blau", (0.30,0.62,1.0), 2.8)

    L = 30.0                                     # MODULLAENGE — exakt einhalten
    box(0, 0, 0.11, L, 30.0, 0.22, GRAS)                         # Bankett/Unterbau
    box(0, 0, 0.15, L, 26.0, 0.30, SCHU)                         # Schulterstreifen
    box(0, 0, 0.17, L, 22.0, 0.34, ASPH)                         # Fahrbahn 22 m
    for i in range(3):                                           # Belagfugen quer
        box(-10.0 + i*10.0, 0, 0.341, 0.12, 22.0, 0.02, ASP2)
    # Mittellinie: 3 Striche je Modul, Periode 10,0 -> Fuge faellt in eine Luecke
    for cx in (-10.0, 0.0, 10.0):
        box(cx, 0, 0.35, 6.00, 0.90, 0.03, WEIS)
    # Seitenbegrenzung: durchgehende Linien
    for sy in (-10.4, 10.4):
        box(0, sy, 0.35, L, 0.45, 0.03, WEIS)
    for sy in (-12.6, 12.6):                                     # Schulterrand gelb
        box(0, sy, 0.31, L, 0.30, 0.03, GELB)
    # Randbefeuerung: Raster 5,0 m, 6 Feuer je Seite und Modul
    for i in range(6):
        px = -12.5 + i*5.0
        for sy in (-13.6, 13.6):
            zyl(px, sy, 0.36, 0.16, 0.16, STAH, 12)
            zyl(px, sy, 0.52, 0.13, 0.20, FEUW, 12)
            box(px, sy, 0.65, 0.22, 0.22, 0.06, STAH)
    for i in range(3):                                           # Mittellinienfeuer
        px = -10.0 + i*10.0
        box(px, 0, 0.355, 0.34, 0.34, 0.05, FEUW)
    for sy in (-8.0, -4.0, 4.0, 8.0):                            # Aufsetzzonen-Feuer
        for i in range(3):
            box(-10.0 + i*10.0, sy, 0.355, 0.30, 0.24, 0.05, FEUB)
    export("th25_landebahn_modul", 0.014, 2)


# ================================================================ 8) Radarturm
def radarturm():
    """Drehradar auf Gittermast, 18 m. Reflektor als gekruemmtes Gitter, leicht
    nach hinten geneigt; Plattform mit Gelaender, Aussenleiter, Technikcontainer."""
    neu()
    STAH = mat("Gittermast", (0.56,0.58,0.62), 0.38, 0.55)
    ROT  = mat("Warnanstrich", (0.76,0.20,0.16), 0.60)
    WEIS = mat("Warnanstrich hell", (0.90,0.90,0.88), 0.60)
    BET  = mat("Fundament", (0.52,0.51,0.49), 0.92)
    GRAU = mat("Drehsockel", (0.68,0.69,0.72), 0.50, 0.35)
    REFL = mat("Reflektor", (0.80,0.81,0.84), 0.40, 0.35)
    CONT = mat("Technikcontainer", (0.30,0.44,0.36), 0.70)
    DUNK = mat("Tuer", (0.22,0.24,0.28), 0.55)
    BAKE = leucht("Hindernisfeuer", (1.0,0.22,0.18), 3.0)

    HM = 14.0                                    # Masthoehe
    def a_at(z):                                 # halbe Kantenlaenge, konisch
        return 1.45 - (z/HM)*0.70
    box(0, 0, 0.22, 5.20, 5.20, 0.44, BET)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(sx*1.45, sy*1.45, 0.34, 0.90, 0.90, 0.68, BET)
            strebe((sx*a_at(0.0), sy*a_at(0.0), 0.55),
                   (sx*a_at(HM), sy*a_at(HM), HM), 0.17, STAH)
    NL = 7
    for k in range(NL + 1):                                      # Horizontalriegel
        z = 0.55 + k*(HM - 0.55)/NL
        a = a_at(z)
        for sx in (-1, 1):
            box(sx*a, 0, z, 0.13, 2*a, 0.13, STAH)
            box(0, sx*a, z, 2*a, 0.13, 0.13, STAH)
    for k in range(NL):                                          # Diagonalen, 4 Seiten
        z0 = 0.55 + k*(HM - 0.55)/NL
        z1 = 0.55 + (k+1)*(HM - 0.55)/NL
        a0, a1 = a_at(z0), a_at(z1)
        for s in (-1, 1):
            strebe((-a0*s, -a0, z0), (a1*s, a1, z1), 0.10, STAH)
            strebe((-a0, a0*s, z0), (a1, -a1*s, z1), 0.10, STAH)
    leiter(0, -a_at(HM/2) - 0.30, 0.60, HM - 0.30, STAH, 0.54, 0.34, 0.06, 'y')
    for zz in (3.6, 7.6, 11.6):                                  # Warnringe
        for sx in (-1, 1):
            a = a_at(zz)
            box(sx*a, 0, zz, 0.20, 2*a, 0.60, ROT if zz != 7.6 else WEIS)
            box(0, sx*a, zz, 2*a, 0.20, 0.60, ROT if zz != 7.6 else WEIS)

    # ---- Plattform mit Gelaender
    box(0, 0, HM + 0.09, 3.60, 3.60, 0.18, STAH)
    for sx in (-1, 1):
        gelaender(-1.8, 1.8, sx*1.8, HM + 0.18, STAH, 1.05, 'x')
        gelaender(-1.8, 1.8, sx*1.8, HM + 0.18, STAH, 1.05, 'y')
    for sx in (-1, 1):
        for sy in (-1, 1):
            strebe((sx*a_at(HM), sy*a_at(HM), HM - 1.20), (sx*1.75, sy*1.75, HM + 0.06), 0.12, STAH)
    box(1.20, -1.20, HM + 0.72, 1.00, 1.00, 1.10, GRAU)          # Antriebsschrank

    # ---- Drehsockel und Reflektor
    ZD = HM + 0.18
    zyl(0, 0, ZD + 0.30, 1.05, 0.60, GRAU, 20)
    zyl(0, 0, ZD + 0.80, 0.80, 0.44, STAH, 20)
    zyl(0, 0, ZD + 1.16, 0.55, 0.34, GRAU, 16)
    box(0, 0, ZD + 1.50, 2.60, 0.50, 0.40, GRAU)                 # Wiege
    TILT = math.radians(14.0)                                    # Reflektor-Neigung
    CY, CZ = 0.05, ZD + 2.72                                     # Drehpunkt des Spiegels
    def P(u, v):
        dpt = (u*u)/13.0                                         # Parabel-Tiefe
        y = dpt*math.cos(TILT) - v*math.sin(TILT)
        z = dpt*math.sin(TILT) + v*math.cos(TILT)
        return (u, CY + y, CZ + z)
    US = [-3.0 + i*0.6 for i in range(11)]
    VS = [-1.15 + i*0.383 for i in range(7)]
    for v in VS:                                                 # waagrechte Latten
        for i in range(len(US) - 1):
            balken(P(US[i], v), P(US[i+1], v), 0.10, 0.09, REFL)
    for u in (-3.0, -1.8, -0.6, 0.6, 1.8, 3.0):                  # Rippen
        for i in range(len(VS) - 1):
            balken(P(u, VS[i]), P(u, VS[i+1]), 0.09, 0.10, REFL)
    for u in (-3.0, 3.0):                                        # Randbogen
        strebe(P(u, VS[0]), P(u, VS[-1]), 0.11, REFL)
    strebe(P(-2.4, 0.0), (0, CY, CZ - 1.10), 0.10, STAH)         # Rueckstreben
    strebe(P( 2.4, 0.0), (0, CY, CZ - 1.10), 0.10, STAH)
    strebe(P( 0.0, VS[-1]), (0, CY, CZ - 1.10), 0.10, STAH)
    box(0, CY - 0.10, CZ, 0.34, 0.34, 2.60, STAH).rotation_euler[0] = TILT
    for s in (-1, 1):                                            # Speisehorn im Fokus
        strebe(P(s*1.4, -1.15), (0, CY - 1.30, CZ - 0.35), 0.07, STAH)
    box(0, CY - 1.38, CZ - 0.35, 0.44, 0.50, 0.34, GRAU)
    box(0, CY + 0.30, CZ + 1.62, 1.40, 0.34, 0.30, WEIS)         # Sekundaerantenne
    zyl(0, CY + 0.20, CZ + 2.05, 0.13, 0.30, BAKE, 12)           # Hindernisfeuer 18 m

    # ---- Technikcontainer am Fuss
    box(4.60, 0.0, 1.20, 3.00, 2.40, 2.40, CONT)
    box(4.60, 0.0, 2.48, 3.24, 2.60, 0.16, GRAU)
    box(3.08, 0.0, 1.10, 0.08, 0.90, 2.10, DUNK)
    box(4.60, 1.24, 1.70, 1.10, 0.10, 0.60, DUNK)
    for sx in (-0.9, 0.9):
        box(4.60 + sx, -1.28, 0.60, 0.50, 0.16, 1.10, GRAU)
    export("th25_radarturm", 0.016, 2)


# ================================================================ 9) Tankwagen
def tankwagen():
    """Flugzeug-Betankungsfahrzeug: Kabine, Tank, Schlauchtrommel, Bedienstand.
    Front auf +y."""
    neu()
    KAB  = mat("Kabine",   (0.90,0.90,0.92), 0.50)
    TANK = mat("Tank",     (0.78,0.79,0.82), 0.34, 0.50)
    BAND = mat("Zierband", (0.14,0.34,0.62), 0.50)
    DUNK = mat("Rahmen",   (0.20,0.21,0.24), 0.65)
    STAH = mat("Stahl",    (0.54,0.56,0.60), 0.35, 0.55)
    GUMM = mat("Reifen",   (0.10,0.10,0.11), 0.92)
    GLAS = mat("Scheibe",  (0.44,0.62,0.76), 0.13, 0.10)
    SCHL = mat("Schlauch", (0.16,0.16,0.18), 0.90)
    GELB = mat("Warnfarbe",(0.92,0.76,0.14), 0.60)
    ROT  = mat("Feuerloescher", (0.72,0.16,0.14), 0.55)
    LAMP = leucht("Rundumlicht", (1.0,0.72,0.14), 2.6)
    RUCK = leucht("Ruecklicht",  (1.0,0.20,0.16), 2.2)
    SCHW = leucht("Scheinwerfer",(1.0,0.96,0.82), 2.2)

    # ---- Rahmen (Laengstraeger innerhalb der Raeder, sonst schneiden sie sich)
    for sx in (-0.86, 0.86):
        box(sx, -0.30, 1.05, 0.18, 9.00, 0.30, DUNK)
    for py in (-4.20, -2.20, 0.60, 3.00):
        box(0, py, 1.05, 1.90, 0.24, 0.26, DUNK)
    # ---- Kabine
    box(0, 3.60, 2.05, 2.44, 2.20, 1.90, KAB)
    box(0, 3.60, 3.06, 2.50, 2.26, 0.14, KAB)
    box(0, 4.68, 2.42, 2.20, 0.10, 1.00, GLAS)                   # Frontscheibe
    for sx in (-1, 1):
        box(sx*1.24, 3.40, 2.32, 0.08, 1.30, 0.80, GLAS)         # Seitenscheiben
        box(sx*1.30, 3.10, 1.86, 0.10, 1.40, 1.30, KAB)          # Tuerblatt
        box(sx*1.38, 3.72, 2.10, 0.10, 0.10, 0.34, STAH)
        box(sx*1.48, 4.10, 2.66, 0.28, 0.10, 0.40, DUNK)         # Spiegel
        box(sx*0.72, 4.78, 1.42, 0.40, 0.14, 0.26, SCHW)         # Scheinwerfer
        box(sx*1.02, 4.78, 1.42, 0.22, 0.14, 0.20, LAMP)
    box(0, 4.80, 1.06, 2.44, 0.24, 0.34, DUNK)                   # Stossfaenger
    box(0, 3.60, 3.20, 1.40, 0.60, 0.16, LAMP)                   # Rundumleuchte
    box(0, 2.48, 2.10, 2.30, 0.14, 1.80, KAB)                    # Rueckwand
    box(0, 3.60, 1.16, 2.30, 2.10, 0.14, DUNK)
    for sx in (-1, 1):                                           # Trittstufen
        box(sx*1.32, 3.10, 0.72, 0.60, 0.60, 0.10, STAH)

    # ---- Tank
    zyl(0, -0.90, 2.20, 1.06, 6.10, TANK, 20, rot=(math.pi/2, 0, 0))
    kegel(0, 2.24, 2.20, 1.06, 0.86, 0.30, TANK, 20, rot=(-math.pi/2, 0, 0))
    kegel(0, -4.04, 2.20, 1.06, 0.86, 0.30, TANK, 20, rot=(math.pi/2, 0, 0))
    for py in (0.90, -0.90, -2.70):                              # Spannbaender
        zyl(0, py, 2.20, 1.10, 0.14, STAH, 20, rot=(math.pi/2, 0, 0))
    for py in (0.60, -2.40):                                     # Sattel auf dem Rahmen
        box(0, py, 1.40, 2.00, 0.50, 0.44, DUNK)
    for sx in (-1, 1):                                           # Zierband seitlich
        box(sx*1.03, -0.90, 2.16, 0.10, 6.00, 0.44, BAND)
    box(0, 0.30, 3.34, 0.90, 0.90, 0.36, STAH)                   # Domdeckel
    zyl(0, 0.30, 3.58, 0.34, 0.18, STAH, 14)
    box(0, -1.90, 3.34, 1.60, 1.90, 0.10, STAH)                  # Laufsteg
    gelaender(-0.78, 0.78, -1.00, 3.39, STAH, 0.72, 'x')
    gelaender(-2.80, -0.98, 0.78, 3.39, STAH, 0.72, 'y')
    gelaender(-2.80, -0.98, -0.78, 3.39, STAH, 0.72, 'y')
    leiter(1.16, -2.40, 1.20, 3.34, STAH, 0.46, 0.32, 0.05, 'x')

    # ---- Bedienstand und Schlauchtrommel am Heck
    box(0, -4.42, 1.70, 2.36, 0.80, 1.10, DUNK)                  # Geraetekasten
    box(0, -4.84, 1.86, 1.90, 0.10, 0.70, GELB)                  # Bedienpanel
    for sx in (-0.60, 0.60):
        box(sx, -4.86, 1.72, 0.30, 0.10, 0.30, STAH)
    zyl(0, -4.30, 2.66, 0.62, 1.30, STAH, 18, rot=(0, math.pi/2, 0))   # Trommelkern
    for sx in (-0.70, 0.70):                                     # Trommelflansche
        zyl(sx, -4.30, 2.66, 0.86, 0.10, GELB, 20, rot=(0, math.pi/2, 0))
    for r_ in (0.70, 0.78):                                      # aufgewickelter Schlauch
        reifen(0, -4.30, 2.66, r_, 0.09, SCHL, 'x', 20, 8)
    box(0, -4.30, 3.60, 1.60, 0.20, 0.20, STAH)                  # Trommelbuegel
    for sx in (-0.70, 0.70):
        box(sx, -4.30, 3.16, 0.14, 0.16, 0.90, STAH)
    box(1.16, -3.30, 1.94, 0.16, 1.10, 0.90, SCHL)               # Schlauchende an Halterung
    box(1.22, -3.86, 1.94, 0.24, 0.30, 0.26, STAH)               # Betankungskupplung
    box(-1.18, -3.20, 1.86, 0.14, 0.70, 0.90, ROT)               # Feuerloescher
    for sx in (-0.80, 0.80):
        box(sx, -4.92, 1.20, 0.34, 0.10, 0.22, RUCK)
    box(0, -4.94, 1.06, 2.36, 0.14, 0.30, GELB)                  # Heckwarnbalken
    for i in range(5):
        box(-0.96 + i*0.48, -5.00, 1.06, 0.24, 0.06, 0.30, DUNK)

    # ---- Raeder (gerade Segmentzahl, Mitte = Radius -> Unterkante exakt 0)
    for dy in (3.30,):
        for dx in (-1.14, 1.14):
            rad(dx, dy, 0.56, 0.56, 0.34, GUMM, 16)
            rad(dx, dy, 0.56, 0.25, 0.36, STAH, 16)
    for dy in (-1.70, -3.10):
        for dx in (-1.16, 1.16):
            rad(dx, dy, 0.56, 0.56, 0.30, GUMM, 16)
            rad(dx + (0.30 if dx > 0 else -0.30), dy, 0.56, 0.56, 0.30, GUMM, 16)
            rad(dx, dy, 0.56, 0.24, 0.34, STAH, 16)
    for sx in (-1, 1):                                           # Kotfluegel hinten
        box(sx*1.30, -2.40, 1.30, 0.72, 2.60, 0.14, DUNK)
    export("th25_tankwagen", 0.016, 2)


if __name__ == "__main__":
    import sys
    ALLE = {"terminal": terminal, "tower": tower, "flugzeug": flugzeug,
            "fluggastbruecke": fluggastbruecke, "hangar": hangar,
            "gepaeckwagen": gepaeckwagen, "landebahn_modul": landebahn_modul,
            "radarturm": radarturm, "tankwagen": tankwagen}
    wahl = [a for a in sys.argv[1:] if a in ALLE] or list(ALLE)
    print("Asset-Charge 24 (th25, Flughafen):")
    for k in wahl:
        ALLE[k]()
    print("fertig")
