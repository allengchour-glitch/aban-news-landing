# -*- coding: utf-8 -*-
"""Asset-Charge 12 (th15_*): HAFEN UND WASSER — Kaimauer, Containerkran,
Containerstapel, Frachtschiff, Segelboot, Leuchtturm, Steg, Bootshaus,
Faehranleger, Fischerhuette. Familienfreundlich, KEINE Waffen.

Konventionen wie th5-th14 (siehe models/TH5-ASSETS.md, Abschnitt "Fallstricke"):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * Schauseite (Wasserseite/Bug/Eingang) liegt auf Blender +y  ->  three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT, sonst fehlt der Bevel im GLB.
  * `primitive_cube_add(size=1)` -> Kantenlaenge 1, Skalierung = Mass (NICHT /2).
  * `rot=(pi/2,0,0)` legt die Zylinderachse auf -y; Raeder brauchen `rot=(0,pi/2,0)`.
  * `rotation_euler[2]=pi` auf einem symmetrischen Quader ist ein NO-OP -> spiegeln
    ueber das VORZEICHEN der Offsets.
  * Metallic max 0.6 bei niedriger Roughness — darueber rendert three.js ohne
    Environment-Map fast schwarz.
  * Treppenlaengen rechnen (`n = round(Hoehe/Steigung)`), nicht schaetzen.
  * Wo Leute laufen: Boden nicht vergessen, Moebel auf `FB + Hoehe ueber Boden`.

Modul-Raster: th15_kaimauer_modul x += 12.0 · th15_steg x += 8.0
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

def leucht(name, rgb, estr=2.6):
    """Lampenmaterial: Basisfarbe = Leuchtfarbe, damit es auch unbeleuchtet knallt."""
    return mat(name, rgb, 0.25, 0.0, rgb, estr)

def box(x, y, z, sx, sy, sz, m=None):
    # size=1 liefert bereits Kantenlaenge 1 -> Skalierung = gewuenschtes Mass (NICHT /2)
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

def kegel(x, y, z, r1, r2, h, m=None, seg=14, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def rad(x, y, z, r, breite, m=None, seg=14):
    """Fahrzeugrad, Achse auf x (Fahrtrichtung y). rot=(pi/2,0,0) waere FALSCH."""
    return zyl(x, y, z, r, breite, m, seg, rot=(0, math.pi/2, 0))

def laufrad(x, y, z, r, breite, m=None, seg=14):
    """Kranlaufrad: Fahrtrichtung x -> Achse auf y."""
    return zyl(x, y, z, r, breite, m, seg, rot=(math.pi/2, 0, 0))

def reifen(x, y, z, R, r, m=None, achse='y', mj=14, mn=8):
    """Autoreifen als Fender. achse='y': Reifenflaeche schaut nach +y."""
    rot = (math.pi/2, 0, 0) if achse == 'y' else ((0, math.pi/2, 0) if achse == 'x' else (0,0,0))
    bpy.ops.mesh.primitive_torus_add(location=(x,y,z), rotation=rot,
                                     major_radius=R, minor_radius=r,
                                     major_segments=mj, minor_segments=mn)
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
    """Dreiecksgiebel als echtes Prisma. achse='x': Dreieck in x-z, Tiefe in y."""
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
    """Stab zwischen zwei Punkten (Fachwerk, Streben, Wanten, Ketten)."""
    p0 = Vector(p0); p1 = Vector(p1); v = p1 - p0; L = v.length
    if L < 1e-4: return None
    c = (p0 + p1) / 2.0
    o = box(c.x, c.y, c.z, d, d, L, m)
    o.rotation_euler = v.to_track_quat('Z', 'Y').to_euler()
    return o

def ring(cx, cy, z, r, n, breite, hoehe, m, start=0.0):
    """Geschlossener Ring aus n tangential gedrehten Boxen (Handlauf, Lichterrand)."""
    ch = 2.0 * r * math.sin(math.pi/n) * 1.06
    for i in range(n):
        a = start + i/n*TAU
        o = box(cx + r*math.cos(a), cy + r*math.sin(a), z, ch, breite, hoehe, m)
        o.rotation_euler[2] = a + math.pi/2   # legt die lokale x-Achse auf die Tangente

def flaeche(pts_yz, x=0.0, dicke=0.06, m=None):
    """Ebenes Polygon in der y-z-Ebene als duennes Prisma (Segel, Tafeln).
    Normalen werden per bmesh neu berechnet — sonst ist eine Seite unsichtbar
    (three.js rendert per Vorgabe nur FrontSide)."""
    t = dicke/2.0
    n = len(pts_yz)
    v = [(x-t, p[0], p[1]) for p in pts_yz] + [(x+t, p[0], p[1]) for p in pts_yz]
    f = [tuple(range(n)), tuple(range(2*n-1, n-1, -1))]
    for i in range(n):
        j = (i+1) % n
        f.append((i, n+i, n+j, j))
    me = bpy.data.meshes.new("Flaeche"); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new("Flaeche", me); bpy.context.collection.objects.link(o)
    if m: o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free(); me.update()
    return o

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

# ---------------------------------------------------------------- Boden / Wand
FB = 0.30   # Fussboden-Oberkante — Aussensockel UND Innenboden enden hier,
            # damit in der Tuer keine Schwelle steht. Moebel: FB + Hoehe ueber Boden.

def boden(B, T, m_sockel, m_boden, rand=2.0):
    box(0, 0, FB/2, B + rand, T + rand, FB, m_sockel)     # Vorplatz
    box(0, 0, FB/2, B, T, FB, m_boden)                    # Innenboden, buendig

def wand_mit_tuer(cx, cy, laenge, dicke, hoehe, m, tuer_b=2.4, tuer_h=3.0,
                  achse='x', tuer_off=0.0):
    """Wand mit durchgehender Tueroeffnung: links + rechts + Sturz (kein Boolean)."""
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

def oeffnungs_achsen(laenge, n, off_b):
    """Mitten der n Oeffnungen und der n+1 Pfeiler — damit Einbauten NICHT
    versehentlich in einem Durchgang stehen."""
    pf = (laenge - n*off_b) / (n + 1)
    pfeiler = [-laenge/2 + pf/2 + i*(pf + off_b) for i in range(n + 1)]
    oeff = [-laenge/2 + pf + off_b/2 + i*(pf + off_b) for i in range(n)]
    return oeff, pfeiler

def wand_mit_fenstern(cx, cy, laenge, dicke, hoehe, m, m_glas, n=3,
                      f_b=1.5, f_z0=1.20, f_z1=2.60, achse='x'):
    """Wand mit n echten Fensteroeffnungen: Bruestung + Pfeiler + Sturz + Glas.
    Das Glas sitzt knapp VOR der Wandflaeche (Fallstrick 3), nicht darin."""
    oeff, pfeiler = oeffnungs_achsen(laenge, n, f_b)
    pf = (laenge - n*f_b) / (n + 1)
    fh = f_z1 - f_z0
    if achse == 'x':
        box(cx, cy, f_z0/2, laenge, dicke, f_z0, m)                       # Bruestung
        box(cx, cy, f_z1 + (hoehe-f_z1)/2, laenge, dicke, hoehe-f_z1, m)  # Sturz
        for t in pfeiler:
            if pf > 0.01: box(cx + t, cy, f_z0 + fh/2, pf, dicke, fh, m)
        for t in oeff:
            box(cx + t, cy, f_z0 + fh/2, f_b*0.96, dicke*0.5, fh*0.96, m_glas)
    else:
        box(cx, cy, f_z0/2, dicke, laenge, f_z0, m)
        box(cx, cy, f_z1 + (hoehe-f_z1)/2, dicke, laenge, hoehe-f_z1, m)
        for t in pfeiler:
            if pf > 0.01: box(cx, cy + t, f_z0 + fh/2, dicke, pf, fh, m)
        for t in oeff:
            box(cx, cy + t, f_z0 + fh/2, dicke*0.5, f_b*0.96, fh*0.96, m_glas)

def satteldach(cx, cy, halbb, laenge, z_traufe, hoehe, dicke, m, ueber=0.40):
    """Zwei geneigte Dachflaechen (First laeuft in y). Gibt den Neigungswinkel zurueck.
    Die Platten werden entlang der Neigung verschoben, damit der Ueberstand an der
    TRAUFE liegt und nicht ueber den First hinausragt."""
    ang = math.atan2(hoehe, halbb)
    ln  = math.hypot(halbb, hoehe) + ueber
    for s in (-1, 1):
        px = s*(halbb/2 + ueber/2*math.cos(ang))
        pz = z_traufe + hoehe/2 - ueber/2*math.sin(ang) + dicke/(2*math.cos(ang))
        o = box(cx + px, cy, pz, ln, laenge, dicke, m)
        o.rotation_euler[1] = s*ang    # +ang: lokale +x-Achse zeigt nach +x und ABWAERTS
    box(cx, cy, z_traufe + hoehe + dicke*0.35, 0.34, laenge, 0.22, m)   # Firstkappe
    return ang

def sparren(cx, cy0, cy1, n, halbb, z_traufe, hoehe, m, d=0.13):
    """Sichtbare Dachsparren unter einem Satteldach (von innen)."""
    ang = math.atan2(hoehe, halbb)
    ln  = math.hypot(halbb, hoehe)
    for i in range(n):
        y = cy0 + (cy1-cy0)*(i+0.5)/n
        for s in (-1, 1):
            o = box(cx + s*halbb/2, y, z_traufe + hoehe/2 - d*0.6, ln, d, d, m)
            o.rotation_euler[1] = s*ang
        box(cx, y, z_traufe + 0.10, 2*halbb*0.94, d, d, m)   # Kehlbalken

# ---------------------------------------------------------------- Gelaender / Treppe
def gelaender(a0, a1, fest, z, m, hoehe=1.05, achse='x', d=0.08):
    """Handlauf + Staebe. achse='x': laeuft in x bei y=fest."""
    L = abs(a1 - a0)
    if L < 0.05: return
    c = (a0 + a1) / 2
    n = max(2, int(L / 1.5))
    if achse == 'x':
        box(c, fest, z + hoehe, L, d+0.01, d+0.01, m)
        box(c, fest, z + hoehe*0.55, L, d*0.6, d*0.6, m)
        for i in range(n + 1):
            box(a0 + (a1-a0)*i/n, fest, z + hoehe/2, d, d, hoehe, m)
    else:
        box(fest, c, z + hoehe, d+0.01, L, d+0.01, m)
        box(fest, c, z + hoehe*0.55, d*0.6, L, d*0.6, m)
        for i in range(n + 1):
            box(fest, a0 + (a1-a0)*i/n, z + hoehe/2, d, d, hoehe, m)

def gelaender_schraeg(y0, y1, z0, z1, fest, m, hoehe=1.05, d=0.08):
    """Gelaender entlang einer Rampe: senkrechte Staebe + geneigter Handlauf.
    Ein waagerechter Handlauf ueber einer Rampe sieht sofort falsch aus."""
    L = math.hypot(y1-y0, z1-z0)
    n = max(2, int(L / 1.5))
    ang = math.atan2(z1-z0, y1-y0)
    for i in range(n + 1):
        t = i/n
        box(fest, y0 + (y1-y0)*t, z0 + (z1-z0)*t + hoehe/2, d, d, hoehe, m)
    for k, zoff in ((0, hoehe), (1, hoehe*0.55)):
        dd = d+0.01 if k == 0 else d*0.6
        o = box(fest, (y0+y1)/2, (z0+z1)/2 + zoff, dd, L, dd, m)
        o.rotation_euler[0] = ang

def treppe(cx, y0, z0, breite, hoehe_ges, m, m_gel=None, steig=0.17, auftritt=0.30,
           richtung=-1):
    """Treppenlauf. n = round(Hoehe/Steigung) — Lauflaenge RECHNEN, nicht schaetzen."""
    n = max(1, int(round(hoehe_ges / steig)))
    st = hoehe_ges / n
    for i in range(n):
        box(cx, y0 + richtung*(i + 0.5)*auftritt, z0 + (i + 0.5)*st,
            breite, auftritt, st, m)
    if m_gel:
        winkel = richtung * math.atan2(st, auftritt)
        laenge = math.hypot(auftritt, st) * 1.06
        for sx in (cx - breite/2 - 0.09, cx + breite/2 + 0.09):
            for i in range(0, n, 3):
                box(sx, y0 + richtung*(i + 0.5)*auftritt,
                    z0 + (i + 0.5)*st + 0.55, 0.06, 0.06, 1.10, m_gel)
            for i in range(n):
                o = box(sx, y0 + richtung*(i + 0.5)*auftritt,
                        z0 + (i + 0.5)*st + 1.06, 0.07, laenge, 0.08, m_gel)
                o.rotation_euler[0] = winkel
    return n, y0 + richtung*n*auftritt, n*auftritt

# ---------------------------------------------------------------- Hafen-Helfer
def poller(px, py, pz, m, s=1.0):
    """Festmacher-Poller (Pilzform). pz = Standflaeche. Gesamthoehe 0.86*s."""
    zyl(px, py, pz + 0.06*s, 0.36*s, 0.12*s, m, 14)
    kegel(px, py, pz + 0.40*s, 0.27*s, 0.20*s, 0.56*s, m, 14)
    kegel(px, py, pz + 0.77*s, 0.20*s, 0.33*s, 0.18*s, m, 14)
    halbkugel(px, py, pz + 0.86*s, 0.33*s, m, 12, 0.45)

def klampe(px, py, pz, m, achse='x'):
    """Kleine Klampe zum Festbinden (Steg, Anleger)."""
    zyl(px, py, pz + 0.09, 0.045, 0.18, m, 8)
    o = box(px, py, pz + 0.21, 0.44, 0.09, 0.09, m)
    if achse == 'y': o.rotation_euler[2] = math.pi/2

def kiste(cx, cy, cz, b, t, h, m, m2=None):
    """Fischkiste: Boden + 4 Wandbretter, oben offen. cz = Unterkante."""
    box(cx, cy, cz + 0.035, b, t, 0.07, m)
    for sy in (-1, 1): box(cx, cy + sy*(t/2-0.035), cz + h/2, b, 0.07, h, m)
    for sx in (-1, 1): box(cx + sx*(b/2-0.035), cy, cz + h/2, 0.07, t-0.13, h, m)
    if m2: box(cx, cy, cz + h - 0.04, b + 0.05, t + 0.05, 0.06, m2)

def netz(cx, cy, cz, breite, hoehe, m, achse='x', nx=9, ny=7, d=0.035, tiefe=0.03):
    """Fischernetz als Strang-Gitter. achse='x': Netz liegt in der x-z-Ebene."""
    for i in range(nx):
        t = (i + 0.5)/nx - 0.5
        if achse == 'x': box(cx + t*breite, cy, cz, d, d + tiefe, hoehe, m)
        else:            box(cx, cy + t*breite, cz, d + tiefe, d, hoehe, m)
    for j in range(ny):
        u = (j + 0.5)/ny - 0.5
        if achse == 'x': box(cx, cy, cz + u*hoehe, breite, d + tiefe, d, m)
        else:            box(cx, cy, cz + u*hoehe, d + tiefe, breite, d, m)

def container(cx, cy, cz, m_korp, m_akz, m_boden, laenge=6.06, breite=2.44,
              hoehe=2.59, tueren=1, sicken=9):
    """Seecontainer. Laengsachse in y, Tueren auf +y (tueren=1) bzw. -y (-1).
    cz = Unterkante. Gespiegelt wird ueber das VORZEICHEN, nie ueber rotation_euler[2]."""
    zc = cz + hoehe/2
    box(cx, cy, zc, breite, laenge, hoehe, m_korp)
    for sx in (-1, 1):                                        # Sicken (Trapezblech)
        for i in range(sicken):
            t = (i + 0.5)/sicken - 0.5
            box(cx + sx*breite/2, cy + t*laenge*0.94, zc,
                0.07, laenge*0.045, hoehe*0.84, m_akz)
    box(cx, cy, cz + 0.11, breite + 0.03, laenge + 0.02, 0.22, m_akz)      # Untergurt
    box(cx, cy, cz + hoehe - 0.11, breite + 0.03, laenge + 0.02, 0.22, m_akz)
    for sx in (-1, 1):                                        # Eckbeschlaege
        for sy in (-1, 1):
            for zz in (cz + 0.13, cz + hoehe - 0.13):
                box(cx + sx*(breite/2 - 0.02), cy + sy*(laenge/2 - 0.14), zz,
                    0.28, 0.30, 0.26, m_boden)
    fy = cy + tueren*(laenge/2 + 0.03)                        # Tuerseite
    for sx in (-1, 1):
        box(cx + sx*breite/4, fy, zc, breite/2 - 0.06, 0.07, hoehe - 0.36, m_akz)
        for k in (-1, 1):
            zyl(cx + sx*breite/4 + k*0.28, fy + tueren*0.06, zc, 0.045, hoehe - 0.42,
                m_boden, 8)
        box(cx + sx*breite/4, fy + tueren*0.09, zc - 0.15, 0.20, 0.10, 0.10, m_boden)
    box(cx, fy - tueren*0.02, zc + hoehe*0.22, breite*0.34, 0.05, 0.34, m_boden)  # Schild

def rumpf(segmente, m_unter, m_ober, m_deck, m_bulw, z_wl, h_bulw=0.85,
          deck_luecke=None, deck_rand=0.30):
    """Schiffsrumpf aus Querschnitts-Segmenten (yc, laenge, breite, z_deck).
    `deck_luecke` = (y0, y1, halbe_restbreite): dort bleibt die Deckmitte offen
    (Cockpit) — sonst deckt die Deckplatte die Plicht komplett zu."""
    for (yc, ln, w, zd) in segmente:
        if w < 0.22: continue
        box(0, yc, z_wl/2, w, ln, z_wl, m_unter)
        box(0, yc, (z_wl + zd)/2, w, ln, zd - z_wl, m_ober)
        if deck_luecke and deck_luecke[0] < yc < deck_luecke[1]:
            rest = w/2 - deck_rand/2 - deck_luecke[2]
            if rest > 0.08:
                for sx in (-1, 1):
                    box(sx*(deck_luecke[2] + rest/2), yc, zd + 0.05, rest, ln, 0.10, m_deck)
        else:
            box(0, yc, zd + 0.05, max(0.1, w - deck_rand), ln, 0.10, m_deck)
        if h_bulw > 0.01:
            for sx in (-1, 1):
                box(sx*(w/2 - 0.09), yc, zd + h_bulw/2, 0.18, ln, h_bulw, m_bulw)


# ================================================================ 1) Kaimauer-Modul
def kaimauer_modul():
    """Kaimauer, exakt 12,0 m lang, reihbar (x += 12,0). Poller, Fenderreihe,
    Steigleiter, Festmacherringe. Wasserseite = +y."""
    neu()
    BET  = mat("Beton",      (0.62,0.60,0.56), 0.92)
    BET2 = mat("Betonkranz", (0.72,0.70,0.66), 0.88)
    DUNK = mat("BetonNass",  (0.40,0.40,0.38), 0.95)
    STAH = mat("Stahl",      (0.42,0.44,0.47), 0.45, 0.55)
    GUSS = mat("Guss",       (0.20,0.21,0.23), 0.55, 0.30)
    GUMM = mat("Gummi",      (0.11,0.11,0.12), 0.92)
    SEIL = mat("Tau",        (0.68,0.58,0.38), 0.9)
    GELB = mat("Warnfarbe",  (0.90,0.72,0.12), 0.6)
    L, TW, H = 12.0, 3.0, 4.0
    # Mauerkoerper: x bleibt EXAKT 12.0, alle Anbauten wachsen nur in y/z
    box(0, 0, H/2, L, TW, H, BET)
    box(0, 0, 0.55, L, TW + 0.10, 1.10, DUNK)                 # nasser Sockel
    for k in range(3):                                        # Schalungsfugen
        box(0, 0, 1.45 + k*0.85, L, TW + 0.04, 0.05, DUNK)
    for i in range(7):                                        # senkrechte Fugen
        box(-L/2 + (i + 0.5)*L/7, 0, 2.4, 0.06, TW + 0.04, 3.0, DUNK)
    box(0, 0, H - 0.15, L, TW + 0.36, 0.30, BET2)             # Kranzbalken
    box(0, TW/2 + 0.18, H - 0.05, L, 0.20, 0.14, GELB)        # Kantenschutz Wasserseite
    box(0, -TW/2 - 0.10, H + 0.08, L, 0.28, 0.16, BET2)       # Bordkante Landseite
    # Fenderreihe (senkrechte Gummifender) auf der Wasserseite
    for px in (-5.0, -3.0, -1.0, 1.0, 3.0, 5.0):
        zyl(px, TW/2 + 0.16, 2.00, 0.24, 2.80, GUMM, 12)
        for zz in (0.72, 3.28):
            box(px, TW/2 + 0.10, zz, 0.52, 0.16, 0.14, STAH)
    for px in (-4.0, 0.0, 4.0):                               # zusaetzliche Autoreifen
        reifen(px, TW/2 + 0.22, 1.55, 0.38, 0.13, GUMM, 'y')
        box(px, TW/2 + 0.14, 2.60, 0.05, 0.05, 1.60, SEIL)
    for px in (-1.6, 1.6):                                    # Festmacherringe
        reifen(px, TW/2 + 0.06, 2.95, 0.17, 0.05, GUSS, 'y', 10, 6)
    # Steigleiter in der Mauerflucht
    for sx in (-0.24, 0.24):
        box(sx, TW/2 + 0.10, 2.05, 0.07, 0.07, 3.70, STAH)
    for k in range(9):
        box(0, TW/2 + 0.10, 0.45 + k*0.40, 0.48, 0.09, 0.05, STAH)
    box(0, TW/2 + 0.06, 4.25, 0.60, 0.10, 0.90, STAH)         # Handgriff ueber Kante
    # Poller
    for px in (-3.6, 3.6):
        poller(px, 0.55, H, GUSS, 1.0)
    for px in (-3.6, 3.6):                                    # Tau-Schlaufe am Poller
        reifen(px, 0.55, H + 0.52, 0.30, 0.06, SEIL, 'z', 12, 6)
    export("th15_kaimauer_modul", 0.022, 2)


# ================================================================ 2) Containerkran
def containerkran():
    """Portalkran (Ship-to-Shore) ~24 m: Fahrwerk auf Schienen, Portal, Ausleger
    ueber das Wasser (+y), Katze mit Spreader, Fuehrerhaus, Maschinenhaus."""
    neu()
    ROT  = mat("KranRot",   (0.78,0.22,0.14), 0.6)
    WEIS = mat("KranWeiss", (0.86,0.86,0.84), 0.65)
    STAH = mat("Stahl",     (0.46,0.48,0.52), 0.42, 0.55)
    DUNK = mat("Traeger",   (0.30,0.32,0.35), 0.6, 0.25)
    GUMM = mat("Gummi",     (0.11,0.11,0.12), 0.92)
    GLAS = mat("Kabinenglas", (0.30,0.46,0.58), 0.15, 0.25)
    GELB = mat("Gelb",      (0.90,0.72,0.12), 0.55)
    LED  = leucht("Warnlicht", (1.0,0.32,0.22), 3.0)
    BLAU = mat("Container",  (0.16,0.36,0.62), 0.65)
    BLA2 = mat("ContainerA", (0.12,0.28,0.50), 0.7)
    SW   = mat("Beschlag",   (0.16,0.16,0.18), 0.6, 0.3)
    BX, GY = 4.2, 6.0            # Beine bei x=+-4,2; Spurweite in y = 12
    Z_BOG, Z_PORT = 1.20, 17.40
    # Schienen exakt 12,0 lang -> passt auf das Kaimauer-Raster.
    # Die Laufraeder muessen INNERHALB der Schiene bleiben: 4,2 + 1,30 + 0,42 = 5,92 < 6,0.
    for sy in (-GY, GY):
        box(0, sy, 0.07, 12.0, 0.56, 0.14, STAH)
        box(0, sy, 0.20, 12.0, 0.22, 0.16, DUNK)
    # Fahrwerke
    for sx in (-BX, BX):
        for sy in (-GY, GY):
            box(sx, sy, 0.94, 3.50, 1.40, 0.52, DUNK)
            for wx in (sx-1.30, sx-0.44, sx+0.44, sx+1.30):
                laufrad(wx, sy, 0.42, 0.42, 0.34, GUMM, 14)
            box(sx, sy, 1.22, 1.60, 1.60, 0.24, STAH)
    # Beine + Verband
    for sx in (-BX, BX):
        for sy in (-GY, GY):
            box(sx, sy, (Z_BOG + Z_PORT)/2, 1.10, 1.10, Z_PORT - Z_BOG, ROT)
    for sy in (-GY, GY):
        box(0, sy, 8.6, 2*BX, 0.55, 0.55, ROT)
        strebe((-BX, sy, 3.4), (BX, sy, 8.4), 0.32, ROT)
        strebe((BX, sy, 3.4), (-BX, sy, 8.4), 0.32, ROT)
        strebe((-BX, sy, 8.8), (BX, sy, 14.6), 0.32, ROT)
        strebe((BX, sy, 8.8), (-BX, sy, 14.6), 0.32, ROT)
    for sx in (-BX, BX):
        box(sx, 0, 11.4, 0.55, 2*GY, 0.55, ROT)
    # Portalrahmen oben
    for sy in (-GY, GY):
        box(0, sy, Z_PORT + 0.70, 2*BX + 1.6, 1.30, 1.40, ROT)
    for sx in (-BX, BX):
        box(sx, 0, Z_PORT + 0.70, 1.30, 2*GY + 1.3, 1.40, ROT)
    # Ausleger (2 Kastentraeger + Querverbaende), Wasserseite +y
    for sx in (-2.3, 2.3):
        box(sx, 5.0, 19.70, 1.00, 38.0, 1.60, ROT)
    for i in range(19):
        box(0, -13.0 + i*2.0, 19.70, 3.60, 0.34, 0.34, ROT)
        if i % 2 == 0:
            box(0, -13.0 + i*2.0, 20.44, 4.60, 0.30, 0.16, STAH)
    box(0, 24.2, 19.70, 4.80, 0.80, 1.80, ROT)                # Auslegerkopf
    kugel(0, 24.7, 20.90, 0.26, LED, 10)
    # Pylon + Pardunen
    for sx in (-BX, BX):
        strebe((sx, 0, Z_PORT + 1.30), (sx*0.34, 0, 24.00), 0.72, ROT)
    box(0, 0, 24.10, 2*BX*0.34 + 0.9, 0.90, 0.60, ROT)
    for sx in (-1.7, 1.7):
        kugel(sx, 0, 24.60, 0.24, LED, 10)
        strebe((sx, 0, 24.05), (sx*1.35, 22.6, 20.55), 0.24, STAH)
        strebe((sx, 0, 24.05), (sx*1.35, -12.6, 20.55), 0.24, STAH)
    # Maschinenhaus auf dem hinteren Ausleger
    box(0, -11.0, 21.85, 5.20, 5.60, 2.60, WEIS)
    box(0, -11.0, 23.25, 5.40, 5.80, 0.24, DUNK)
    for i in range(3):
        box(-1.8 + i*1.8, -8.15, 22.10, 1.20, 0.12, 0.90, GLAS)
    # Gelaender am Ausleger
    for sx in (-2.95, 2.95):
        gelaender(-13.0, 23.6, sx, 20.50, STAH, 1.05, 'y', 0.07)
    # Katze mit Spreader und haengendem Container
    KY = 13.5
    box(0, KY, 18.35, 5.20, 3.20, 1.00, GELB)
    for sx in (-2.3, 2.3):
        for sy in (KY-1.2, KY+1.2):
            laufrad(sx, sy, 18.95, 0.30, 0.24, DUNK, 10)
    for sx in (-1.0, 1.0):
        for sy in (KY-1.0, KY+1.0):
            box(sx, sy, 13.30, 0.10, 0.10, 9.30, STAH)
    box(0, KY, 8.90, 2.10, 2.40, 0.72, GELB)                  # Kopfstueck
    box(0, KY, 8.35, 2.70, 12.20, 0.55, GELB)                 # Spreader
    for sy in (KY-5.9, KY+5.9):
        box(0, sy, 8.35, 2.80, 0.34, 0.66, DUNK)
    # Container haengt BUENDIG unter dem Spreader (8,075) — 5,49 + 2,59 = 8,08
    container(0, KY, 5.49, BLAU, BLA2, SW, 12.20, 2.44, 2.59, 1, 15)
    # Fuehrerhaus unter der Katze
    box(-3.55, KY-1.1, 17.60, 2.20, 2.60, 2.40, WEIS)
    box(-3.55, KY-1.1, 18.90, 2.40, 2.80, 0.22, DUNK)
    box(-4.68, KY-1.1, 17.85, 0.10, 2.20, 1.40, GLAS)
    box(-3.55, KY-2.42, 17.85, 1.80, 0.10, 1.40, GLAS)
    box(-3.55, KY-1.1, 16.35, 1.20, 1.20, 0.30, DUNK)
    strebe((-2.6, KY-1.1, 18.60), (-1.0, KY, 18.30), 0.16, STAH)
    # Leiter am Landbein
    for sx in (-0.28, 0.28):
        box(-BX + sx, -GY - 0.72, 9.30, 0.07, 0.07, 16.20, STAH)
    for k in range(27):
        box(-BX, -GY - 0.72, 1.40 + k*0.60, 0.52, 0.09, 0.05, STAH)
    export("th15_containerkran", 0.022, 2)


# ================================================================ 3) Containerstapel
def containerstapel():
    """3 x 2 gestapelte Seecontainer in sechs Farben. Tueren auf +y."""
    neu()
    SW   = mat("Beschlag", (0.16,0.16,0.18), 0.6, 0.3)
    farben = [
        ((0.72,0.24,0.16), (0.60,0.19,0.12), "Rost"),
        ((0.16,0.38,0.64), (0.12,0.30,0.54), "Blau"),
        ((0.16,0.46,0.30), (0.11,0.37,0.24), "Gruen"),
        ((0.86,0.66,0.16), (0.72,0.54,0.11), "Gelb"),
        ((0.58,0.60,0.62), (0.47,0.49,0.51), "Grau"),
        ((0.20,0.52,0.56), (0.15,0.42,0.46), "Tuerkis"),
    ]
    mats = [(mat("C%s" % n, a, 0.66), mat("C%sA" % n, b, 0.72)) for (a, b, n) in farben]
    BR, LN, HO = 2.44, 6.06, 2.59
    for lage in range(2):
        for i in range(3):
            k = lage*3 + i
            mk, ma = mats[k]
            # oben leicht versetzt gestapelt — wirkt wie ein echter Terminalstapel
            dy = 0.0 if lage == 0 else (0.22 if i == 1 else -0.14)
            container(-2.54 + i*2.54, dy, lage*(HO + 0.06), mk, ma, SW,
                      LN, BR, HO, 1 if (i + lage) % 2 == 0 else -1, 9)
    export("th15_containerstapel", 0.020, 2)


# ================================================================ 4) Frachtschiff
def frachtschiff():
    """Stueckgutfrachter ~45 m: Rumpf mit Wasserpass, Ladeluken mit Deckladung,
    zwei Ladekrane, Aufbauten mit Bruecke, Schornstein, Vormast. Bug auf +y."""
    neu()
    RUM  = mat("Rumpf",    (0.16,0.24,0.40), 0.62)
    UNT  = mat("Unterwasser", (0.52,0.14,0.12), 0.75)
    DECK = mat("Deck",     (0.44,0.42,0.38), 0.85)
    WEIS = mat("Aufbau",   (0.88,0.88,0.86), 0.62)
    GRAU = mat("Stahl",    (0.46,0.48,0.52), 0.45, 0.5)
    DUNK = mat("Dunkel",   (0.22,0.23,0.26), 0.6, 0.25)
    GLAS = mat("Bruecke",  (0.32,0.48,0.60), 0.15, 0.25)
    LUKE = mat("Lukendeckel", (0.36,0.40,0.44), 0.7)
    ROT  = mat("Signalrot", (0.78,0.20,0.16), 0.6)
    GELB = mat("Kran",     (0.88,0.70,0.14), 0.55)
    LED  = leucht("Positionslicht", (1.0,0.86,0.45), 2.4)
    SW   = mat("Beschlag", (0.16,0.16,0.18), 0.6, 0.3)
    C1   = mat("Cont1", (0.72,0.24,0.16), 0.66); C1A = mat("Cont1A", (0.60,0.19,0.12), 0.72)
    C2   = mat("Cont2", (0.16,0.38,0.64), 0.66); C2A = mat("Cont2A", (0.12,0.30,0.54), 0.72)
    C3   = mat("Cont3", (0.16,0.46,0.30), 0.66); C3A = mat("Cont3A", (0.11,0.37,0.24), 0.72)
    ZWL, ZD = 1.70, 4.60
    segs = [(0.0, 24.0, 9.20, ZD)]
    for i in range(14):                                   # Bug 12,0 -> 22,5
        t = (i + 0.5)/14.0
        segs.append((12.0 + i*0.75 + 0.375, 0.79,
                     max(0.55, 9.20*(1.0 - t**1.8)), ZD + 1.05*t*t))
    for i in range(8):                                    # Heck -12,0 -> -22,4
        t = (i + 0.5)/8.0
        segs.append((-12.0 - i*1.30 - 0.65, 1.34,
                     9.20*(1.0 - 0.62*t**2.6), ZD + 0.35*t*t))
    rumpf(segs, UNT, RUM, DECK, GRAU, ZWL, 0.90)
    box(0, 0, ZWL + 0.10, 9.30, 44.6, 0.20, WEIS)         # Wasserpass-Streifen
    box(0, -22.35, 2.30, 3.60, 0.40, 4.60, RUM)           # Heckspiegel
    # Aufbauten achtern
    box(0, -15.50, ZD + 1.60, 8.00, 7.00, 3.20, WEIS)
    box(0, -15.75, ZD + 4.80, 7.40, 6.50, 3.20, WEIS)
    box(0, -14.20, ZD + 8.00, 9.60, 3.60, 3.00, WEIS)     # Brueckendeck mit Nocken
    box(0, -14.20, ZD + 9.62, 9.90, 3.90, 0.24, DUNK)
    for zz, ln, yy, br in ((ZD + 2.30, 7.4, -12.02, 6.4), (ZD + 5.50, 6.8, -12.52, 5.8)):
        for i in range(4):
            box(-br/2 + (i + 0.5)*br/4, yy, zz, br/4*0.66, 0.12, 0.80, GLAS)
    for i in range(6):                                    # Brueckenfenster nach vorn
        box(-3.6 + i*1.44, -12.42, ZD + 8.35, 1.15, 0.14, 1.30, GLAS)
    for sx in (-4.60, 4.60):
        box(sx, -14.20, ZD + 8.35, 0.16, 3.20, 1.30, GLAS)
    gelaender(-4.7, 4.7, -12.30, ZD + 9.74, GRAU, 1.05, 'x', 0.07)
    for sx in (-4.70, 4.70):
        gelaender(-15.9, -12.3, sx, ZD + 9.74, GRAU, 1.05, 'y', 0.07)
    # Schornstein
    kegel(0, -17.60, ZD + 7.50, 1.55, 1.28, 5.40, DUNK, 16)
    box(0, -17.60, ZD + 9.10, 3.00, 3.00, 0.90, ROT)
    box(0, -17.60, ZD + 10.28, 3.20, 3.20, 0.30, DUNK)
    for sx in (-1.15, 1.15):
        zyl(sx, -17.60, ZD + 10.80, 0.10, 0.80, GRAU, 8)
    # Radarmast
    zyl(0, -14.90, ZD + 11.40, 0.13, 3.30, GRAU, 10)
    box(0, -14.90, ZD + 12.10, 1.90, 0.16, 0.14, GRAU)
    box(0, -14.90, ZD + 13.05, 1.30, 0.30, 0.16, WEIS)
    kugel(0, -14.90, ZD + 13.45, 0.20, LED, 10)
    # Ladeluken mit Deckladung — Luken 5,90 lang, dazwischen 2,40 Luft fuer die
    # Kranfundamente (r=0,90). Zu dicht gesetzt steckt der Kransockel im Suell.
    for k, yy in enumerate((-7.4, 0.6, 8.6)):
        box(0, yy, ZD + 0.55, 6.90, 5.60, 1.00, GRAU)      # Suell
        box(0, yy, ZD + 1.22, 7.20, 5.90, 0.34, LUKE)      # Lukendeckel
        for i in range(5):
            box(0, yy - 2.2 + i*1.1, ZD + 1.44, 7.20, 0.22, 0.12, GRAU)
    for (cy, ma, mb) in ((-7.4, C1, C1A), (0.6, C2, C2A), (8.6, C3, C3A)):
        for sx in (-1.30, 1.30):
            container(sx, cy, ZD + 1.39, ma, mb, SW, 6.06, 2.44, 2.59, 1, 7)
    # Ladekrane — je einer nach Backbord und nach Steuerbord, sonst haengt das
    # ganze Schiff einseitig ueber (Bounding-Box lag um 2,7 m aus der Mitte).
    for (cy, sg) in ((-3.4, -1), (4.6, 1)):
        zyl(0, cy, ZD + 1.40, 0.90, 2.80, GELB, 14)
        box(0, cy, ZD + 3.80, 2.30, 2.70, 2.00, GELB)
        box(0, cy, ZD + 4.90, 2.50, 2.90, 0.24, DUNK)
        box(sg*0.90, cy, ZD + 4.20, 0.90, 1.10, 1.00, GLAS)
        strebe((sg*0.9, cy, ZD + 4.20), (sg*7.4, cy, ZD + 8.10), 0.34, GELB)
        strebe((sg*0.9, cy, ZD + 4.60), (sg*7.2, cy, ZD + 8.20), 0.16, GRAU)
        box(sg*7.35, cy, ZD + 7.30, 0.16, 0.16, 1.40, GRAU)
        box(sg*7.35, cy, ZD + 6.40, 0.55, 0.70, 0.44, DUNK)
    # Back (Vorschiff) mit Ankerwinde und Poller
    box(0, 16.90, ZD + 0.92, 4.20, 4.60, 0.22, DECK)
    for sx in (-1.95, 1.95):
        gelaender(14.7, 19.1, sx, ZD + 1.03, GRAU, 0.95, 'y', 0.07)
    box(0, 15.30, ZD + 1.45, 2.20, 1.10, 0.84, GRAU)
    for sx in (-0.85, 0.85):
        zyl(sx, 15.30, ZD + 1.60, 0.42, 2.40, DUNK, 12, rot=(0, math.pi/2, 0))
    for sx in (-1.30, 1.30):
        poller(sx, 18.60, ZD + 1.03, DUNK, 0.55)
        poller(sx, -18.20, ZD + 0.05, DUNK, 0.55)
    # Vormast
    zyl(0, 13.20, ZD + 3.60, 0.17, 7.20, WEIS, 12)
    box(0, 13.20, ZD + 6.10, 2.60, 0.16, 0.14, WEIS)
    kugel(0, 13.20, ZD + 7.35, 0.19, LED, 10)
    # Anker + Rettungsboot
    for sx in (-1, 1):
        box(sx*3.05, 18.20, 3.00, 0.20, 1.10, 1.30, DUNK)
    for sx in (-1, 1):
        box(sx*4.15, -15.5, ZD + 3.55, 0.85, 3.40, 1.10, GELB)
        box(sx*4.15, -15.5, ZD + 4.20, 0.95, 3.60, 0.24, WEIS)
    # Reling ums Hauptdeck
    for sx in (-4.45, 4.45):
        gelaender(-11.0, 11.5, sx, ZD + 0.92, GRAU, 0.95, 'y', 0.07)
    export("th15_frachtschiff", 0.022, 2)


# ================================================================ 5) Segelboot
def segelboot():
    """Segelyacht ~8 m: Rumpf mit Sprung, Plicht (Cockpit) mit Baenken und Pinne,
    Kajuetaufbau, Mast mit Grosssegel und Fock, Seereling. Bug auf +y."""
    neu()
    WEIS = mat("Rumpf",   (0.92,0.92,0.90), 0.35)
    UNT  = mat("Unterwasserschiff", (0.10,0.22,0.42), 0.55)
    STRE = mat("Zierstreifen", (0.12,0.32,0.56), 0.4)
    TEAK = mat("Teakdeck", (0.62,0.44,0.24), 0.7)
    HOLZ = mat("Holz",    (0.46,0.30,0.16), 0.6)
    ALU  = mat("Alu",     (0.72,0.74,0.78), 0.28, 0.55)
    SEGL = mat("Segeltuch", (0.95,0.95,0.92), 0.85)
    GLAS = mat("Luke",    (0.28,0.40,0.50), 0.15, 0.25)
    POLS = mat("Polster", (0.30,0.38,0.46), 0.85)
    ROT  = mat("Fender",  (0.82,0.28,0.20), 0.7)
    ZWL, ZD, LOA = 0.42, 1.15, 8.0
    N = 16
    segs = []
    for i in range(N):
        t = -1.0 + (i + 0.5)*2.0/N
        if t >= 0: w = 2.60*max(0.10, 1.0 - t**1.9)
        else:      w = 2.60*(1.0 - 0.55*abs(t)**3)
        segs.append((t*LOA/2, LOA/N + 0.02, w, ZD + 0.17*t*t))
    rumpf(segs, UNT, WEIS, TEAK, WEIS, ZWL, 0.11, (-3.35, -0.55, 0.86), 0.16)
    box(0, 0, ZWL + 0.06, 2.62, 6.4, 0.09, STRE)              # Zierstreifen
    box(0, -3.92, 0.62, 1.30, 0.20, 1.24, WEIS)               # Heckspiegel
    # Plicht (Cockpit)
    box(0, -1.95, 0.72, 1.90, 2.80, 0.10, TEAK)               # Plichtboden 0,77
    for sx in (-1, 1):
        box(sx*0.86, -1.95, 1.05, 0.12, 2.80, 0.50, WEIS)     # Suell
        box(sx*0.56, -1.95, 0.86, 0.52, 2.60, 0.12, POLS)     # Baenke 0,92
        box(sx*0.86, -1.95, 1.32, 0.16, 2.84, 0.06, HOLZ)     # Suellkante
    box(0, -0.52, 1.05, 1.84, 0.14, 0.50, WEIS)
    box(0, -3.32, 1.05, 1.84, 0.14, 0.50, WEIS)
    box(0, -3.05, 1.00, 0.60, 0.44, 0.36, HOLZ)               # Steuerkonsole
    o = box(0, -2.55, 1.24, 0.07, 1.05, 0.07, HOLZ); o.rotation_euler[0] = 0.12  # Pinne
    for sx in (-0.86, 0.86):
        zyl(sx, -1.05, 1.42, 0.11, 0.20, ALU, 10)             # Schotwinschen
    # Kajuetaufbau
    box(0, 1.05, 1.48, 1.72, 3.00, 0.66, WEIS)
    box(0, 1.05, 1.83, 1.86, 3.14, 0.08, TEAK)
    for sx in (-1, 1):
        for k in range(3):
            zyl(sx*0.88, 0.05 + k*1.00, 1.50, 0.12, 0.08, GLAS, 10, rot=(0, math.pi/2, 0))
    box(0, -0.44, 1.52, 0.72, 0.10, 0.60, GLAS)               # Niedergang
    box(0, 1.55, 1.88, 0.70, 0.90, 0.07, GLAS)                # Decksluke
    # Rigg
    MY = 1.00
    zyl(0, MY, 5.03, 0.09, 7.76, ALU, 12)                     # Mast 1,15 - 8,91
    zyl(0, -0.70, 2.12, 0.075, 3.40, ALU, 10, rot=(math.pi/2, 0, 0))   # Baum
    box(0, MY, 2.02, 0.34, 0.34, 0.22, ALU)
    strebe((0, MY, 8.80), (0, 3.90, 1.42), 0.035, ALU)        # Vorstag
    strebe((0, MY, 8.80), (0, -3.85, 1.30), 0.035, ALU)       # Achterstag
    for sx in (-1, 1):
        strebe((0, MY, 8.30), (sx*1.15, MY, 1.32), 0.032, ALU)   # Wanten
        box(sx*0.62, MY, 5.60, 1.24, 0.10, 0.09, ALU)            # Salinge
    # Grosssegel (Leech leicht ausgestellt) und Fock
    gross = [(0.94, 2.24), (0.92, 8.68), (-0.55, 6.60), (-1.65, 4.35), (-2.35, 2.36)]
    flaeche(gross, 0.05, 0.055, SEGL)
    for zz in (3.60, 5.10, 6.60):
        t = (zz - 2.30)/6.40
        box(0.05, 0.90 - 1.6*(1 - t)*0.9, zz, 0.075, 2.0*(1 - t) + 0.5, 0.05, ALU)
    fock = [(3.72, 1.62), (1.02, 8.42), (0.58, 5.20), (0.62, 3.10), (2.15, 2.10)]
    flaeche(fock, -0.05, 0.055, SEGL)
    # Seereling + Bugkorb
    for sx in (-1, 1):
        for i in range(6):
            yy = -2.9 + i*1.30
            t = yy/(LOA/2)
            w = 2.60*(max(0.10, 1.0 - t**1.9) if t >= 0 else (1.0 - 0.55*abs(t)**3))
            box(sx*(w/2 - 0.10), yy, ZD + 0.17*t*t + 0.34, 0.055, 0.055, 0.62, ALU)
        strebe((sx*1.21, -2.9, 1.78), (sx*0.52, 3.72, 1.72), 0.035, ALU)
        strebe((sx*1.21, -2.9, 1.50), (sx*0.52, 3.72, 1.46), 0.030, ALU)
        strebe((sx*0.52, 3.72, 1.72), (0, 3.95, 1.68), 0.035, ALU)
    zyl(0, 3.80, 1.30, 0.10, 0.24, ALU, 10)                   # Ankerbeschlag
    for sx in (-1, 1):                                        # Fender aussenbords
        for yy in (-2.2, -0.8):
            zyl(sx*1.16, yy, 0.98, 0.13, 0.52, ROT, 10)
    export("th15_segelboot", 0.016, 2)


# ================================================================ 6) Leuchtturm
def leuchtturm():
    """Leuchtturm ~22 m: Felssockel, rot-weiss geringelter Schaft, umlaufende
    Galerie mit Gelaender, verglaste Laterne (emissiv), Kegeldach. Tuer auf +y."""
    neu()
    FELS = mat("Fels",   (0.44,0.43,0.40), 0.95)
    ROT  = mat("Ringrot", (0.80,0.18,0.16), 0.6)
    WEIS = mat("Ringweiss", (0.93,0.93,0.90), 0.55)
    STAH = mat("Stahl",  (0.44,0.46,0.50), 0.4, 0.55)
    DUNK = mat("Dunkel", (0.20,0.21,0.24), 0.6, 0.25)
    HOLZ = mat("Tuer",   (0.36,0.22,0.13), 0.65)
    GLAS = mat("Laternenglas", (0.60,0.74,0.84), 0.12, 0.2)
    LICH = leucht("Leuchtfeuer", (1.0,0.90,0.55), 3.4)
    LIN  = leucht("Linse", (1.0,0.72,0.30), 2.8)
    Z0, BAND, NB = 0.90, 2.00, 8
    R0, R1 = 2.40, 1.50
    zyl(0, 0, 0.45, 3.60, 0.90, FELS, 20)                     # Sockel
    zyl(0, 0, 0.86, 2.70, 0.16, FELS, 20)
    for i in range(NB):                                       # Schaft, geringelt
        rb = R0 + (R1 - R0)*i/NB
        rt = R0 + (R1 - R0)*(i + 1)/NB
        kegel(0, 0, Z0 + BAND*(i + 0.5), rb, rt, BAND, ROT if i % 2 == 0 else WEIS, 24)
    Z_G = Z0 + BAND*NB                                        # 16,90
    for zz, rr in ((Z0 + 0.05, R0 + 0.06), (Z_G - 0.10, R1 + 0.06)):
        zyl(0, 0, zz, rr, 0.22, STAH, 24)
    # Tuer + Stufen
    box(0, 2.20, 2.00, 1.50, 0.50, 2.30, WEIS)
    box(0, 2.44, 1.95, 1.12, 0.16, 2.05, HOLZ)
    box(0, 2.42, 3.22, 1.20, 0.34, 0.20, WEIS)
    treppe(0, 4.60, 0.0, 2.00, 0.90, FELS, None, 0.18, 0.30, richtung=-1)
    for zz in (5.40, 8.90, 12.40):                            # Schaftfenster
        rr = R0 + (R1 - R0)*(zz - Z0)/(BAND*NB)
        box(0, rr - 0.16, zz, 0.66, 0.42, 1.00, WEIS)
        box(0, rr + 0.06, zz, 0.44, 0.10, 0.74, GLAS)
    # Galerie
    for i in range(12):
        a = i/12*TAU
        strebe((math.cos(a)*1.45, math.sin(a)*1.45, Z_G - 1.30),
               (math.cos(a)*2.85, math.sin(a)*2.85, Z_G + 0.02), 0.16, STAH)
    zyl(0, 0, Z_G + 0.12, 3.05, 0.24, STAH, 24)
    for i in range(16):
        a = i/16*TAU
        box(math.cos(a)*2.86, math.sin(a)*2.86, Z_G + 0.77, 0.08, 0.08, 1.06, STAH)
    ring(0, 0, Z_G + 1.28, 2.86, 16, 0.09, 0.09, STAH)
    ring(0, 0, Z_G + 0.80, 2.86, 16, 0.06, 0.06, STAH)
    # Laterne
    ZL0 = Z_G + 0.24
    zyl(0, 0, ZL0 + 1.30, 1.36, 2.40, GLAS, 16)
    for i in range(8):
        a = i/8*TAU + 0.19
        box(math.cos(a)*1.42, math.sin(a)*1.42, ZL0 + 1.30, 0.14, 0.14, 2.60, WEIS)
    zyl(0, 0, ZL0 + 0.16, 1.52, 0.32, DUNK, 16)
    zyl(0, 0, ZL0 + 2.68, 1.56, 0.28, DUNK, 16)
    zyl(0, 0, ZL0 + 1.05, 0.62, 0.70, LICH, 14)               # Leuchtfeuer
    zyl(0, 0, ZL0 + 1.62, 0.94, 0.44, LIN, 18)                # Linsenring
    box(0, 0, ZL0 + 1.62, 2.10, 0.30, 0.30, LIN)              # Lichtkeule
    box(0, 0, ZL0 + 1.62, 0.30, 2.10, 0.30, LIN)
    # Dach + Spitze
    ZR = ZL0 + 2.82                                           # 19,96
    kegel(0, 0, ZR + 0.72, 1.78, 0.10, 1.44, ROT, 18)
    kugel(0, 0, ZR + 1.56, 0.20, DUNK, 10)
    zyl(0, 0, ZR + 1.92, 0.045, 0.52, STAH, 8)
    export("th15_leuchtturm", 0.020, 2)


# ================================================================ 7) Steg
def steg():
    """Holzsteg auf Pfaehlen, exakt 8,0 m lang, reihbar (x += 8,0).
    Belag quer, damit die Fuge beim Reihen nicht auffaellt."""
    neu()
    HOLZ = mat("Diele",   (0.60,0.46,0.30), 0.85)
    HOL2 = mat("Diele2",  (0.54,0.40,0.25), 0.88)
    PFAH = mat("Pfahl",   (0.40,0.30,0.20), 0.9)
    NASS = mat("Nass",    (0.26,0.24,0.20), 0.92)
    STAH = mat("Beschlag", (0.42,0.44,0.47), 0.45, 0.5)
    GUMM = mat("Gummi",   (0.11,0.11,0.12), 0.92)
    SEIL = mat("Tau",     (0.70,0.60,0.40), 0.9)
    L, BR = 8.0, 2.40
    # Pfaehle + Querriegel
    for px in (-3.0, -1.0, 1.0, 3.0):
        for py in (-1.0, 1.0):
            zyl(px, py, 0.51, 0.16, 1.02, PFAH, 12)
            zyl(px, py, 0.28, 0.175, 0.56, NASS, 12)
        box(px, 0, 0.95, 0.34, BR + 0.20, 0.18, PFAH)
        for py in (-1, 1):
            strebe((px, py*1.0, 0.30), (px, py*0.10, 0.90), 0.09, PFAH)
    for sy in (-0.95, 0.95):                                  # Laengstraeger
        box(0, sy, 1.045, L, 0.16, 0.16, PFAH)
    # Belag: 33 Bohlen quer, exakt innerhalb 8,0 m
    n = 33
    for i in range(n):
        px = -L/2 + 0.12 + i*(L - 0.24)/(n - 1)
        box(px, 0, 1.17, 0.20, BR, 0.10, HOLZ if i % 3 else HOL2)
    box(0, 0, 1.20, L, BR + 0.10, 0.05, HOLZ)                 # Randabschluss
    # Dalben, Klampen, Fender
    for py in (-1.36, 1.36):
        zyl(0, py, 0.95, 0.15, 1.90, PFAH, 12)
        zyl(0, py, 0.30, 0.165, 0.60, NASS, 12)
        reifen(0, py, 1.62, 0.24, 0.05, SEIL, 'z', 12, 6)
        box(0, py, 1.94, 0.34, 0.34, 0.10, STAH)
    for px in (-2.5, 2.5):
        for py in (-1.16, 1.16):
            klampe(px, py, 1.22, STAH, 'x')
    for px in (-2.0, 2.0):                                    # haengende Fender
        reifen(px, 1.30, 0.62, 0.32, 0.11, GUMM, 'y')
        box(px, 1.26, 1.00, 0.05, 0.05, 0.80, SEIL)
    export("th15_steg", 0.018, 2)


# ================================================================ 8) Bootshaus
def bootshaus():
    """BEGEHBAR: Bootshaus mit offener Wasserseite (+y), Slip in der Mitte,
    Stege links und rechts, Werkbank, Regal, Ruderboot. Satteldach."""
    neu()
    HOLZ = mat("Bretter",  (0.48,0.36,0.24), 0.85)
    HOL2 = mat("Bretter2", (0.42,0.31,0.20), 0.88)
    DIEL = mat("Steg",     (0.60,0.46,0.30), 0.85)
    SOK  = mat("Sockel",   (0.52,0.50,0.46), 0.92)
    PFAH = mat("Pfahl",    (0.38,0.28,0.19), 0.9)
    DACH = mat("Dach",     (0.34,0.30,0.27), 0.85)
    WASS = mat("Wasser",   (0.10,0.30,0.40), 0.18, 0.25)
    STAH = mat("Beschlag", (0.44,0.46,0.50), 0.45, 0.5)
    GLAS = mat("Fensterglas", (0.56,0.72,0.82), 0.14, 0.2)
    ROT  = mat("Boot",     (0.72,0.24,0.18), 0.6)
    WEIS = mat("Bootweiss", (0.90,0.90,0.86), 0.5)
    SEIL = mat("Tau",      (0.70,0.60,0.40), 0.9)
    LAMP = leucht("Lampe", (1.0,0.88,0.60), 2.4)
    B, T, WH, SLIP = 9.0, 12.0, 4.20, 2.30
    # Boden: Stege links/rechts + hinten, Mitte bleibt Wasser (Slip)
    box(0, -7.70, FB/2, B + 2.6, 3.6, FB, SOK)                # Vorplatz an Land
    for sx in (-1, 1):
        box(sx*(SLIP + (B/2 - SLIP)/2), 0, FB/2, B/2 - SLIP, T, FB, DIEL)
    box(0, -5.00, FB/2, 2*SLIP, 2.0, FB, DIEL)                # Steg hinten
    for i in range(24):                                       # Dielenfugen
        for sx in (-1, 1):
            box(sx*(SLIP + (B/2 - SLIP)/2), -5.75 + i*0.5, FB + 0.01, B/2 - SLIP - 0.1, 0.05, 0.03, HOL2)
    box(0, 0.70, 0.09, 2*SLIP, 13.0, 0.18, WASS)              # Slip-Wasserflaeche
    for sx in (-1, 1):                                        # Stegkante + Pfaehle
        # z-Mitte = (FB+0.06)/2, sonst sinkt die Kante 3 cm unter den Nullpunkt
        box(sx*SLIP, 0.5, (FB + 0.06)/2, 0.12, 13.0, FB + 0.06, PFAH)
        for yy in (-4.4, -1.6, 1.2, 4.0, 5.6):
            zyl(sx*(SLIP - 0.22), yy, 0.16, 0.15, 0.32, PFAH, 10)
    # Waende
    for sx in (-1, 1):
        wand_mit_fenstern(sx*(B/2 + 0.14), 0, T + 0.56, 0.28, WH, HOLZ, GLAS,
                          3, 1.60, 1.90, 3.30, 'y')
    wand_mit_tuer(0, -T/2 - 0.14, B + 0.56, 0.28, WH, HOLZ, 2.40, 2.90, 'x')
    for sx in (-1, 1):                                        # Eckpfosten Wasserseite
        box(sx*(B/2 - 0.10), T/2 - 0.10, WH/2, 0.42, 0.42, WH, HOL2)
    box(0, T/2 - 0.10, WH - 0.35, B + 0.56, 0.34, 0.70, HOL2) # Sturz ueber der Oeffnung
    for sx in (-1, 1):                                        # Bretterstruktur aussen
        for i in range(16):
            box(sx*(B/2 + 0.30), -5.6 + i*0.75, WH*0.5, 0.06, 0.10, WH, HOL2)
    # Dach
    ang = satteldach(0, 0, B/2 + 0.40, T + 1.10, WH, 2.10, 0.20, DACH, 0.50)
    for cy in (-T/2 - 0.02, T/2 - 0.02):
        giebel(0, cy, WH, B/2 + 0.28, 2.10, 0.30, HOL2, 'x')
    sparren(0, -5.4, 5.4, 7, B/2 + 0.28, WH, 2.10, HOL2, 0.13)
    for yy in (-3.4, 0.4, 4.2):                               # Haengelampen
        box(0, yy, WH + 1.55, 0.07, 0.07, 0.90, STAH)
        kegel(0, yy, WH + 1.02, 0.34, 0.10, 0.28, STAH, 12)
        kugel(0, yy, WH + 0.86, 0.15, LAMP, 10)
    # Werkbank + Werkzeugtafel (linker Steg)
    box(-4.05, -1.60, FB + 0.86, 0.78, 3.00, 0.09, HOL2)
    for yy in (-2.95, -0.25):
        for sx in (-0.30, 0.30):
            box(-4.05 + sx, yy, FB + 0.42, 0.09, 0.09, 0.84, HOL2)
    box(-4.05, -1.60, FB + 0.52, 0.66, 2.80, 0.06, HOL2)
    box(-4.28, -1.60, FB + 1.70, 0.06, 2.60, 1.10, HOL2)      # Werkzeugtafel
    for i in range(7):
        box(-4.20, -2.75 + i*0.38, FB + 1.70, 0.05, 0.09, 0.44 if i % 2 else 0.28, STAH)
    zyl(-3.95, -0.60, FB + 1.00, 0.09, 0.20, STAH, 10)        # Schraubstock
    box(-3.95, -0.60, FB + 1.16, 0.26, 0.16, 0.14, STAH)
    for k in range(3):                                        # Kisten
        kiste(-3.90, 2.60 + k*0.02, FB + k*0.34, 0.62, 0.44, 0.32, HOL2)
    # Regal rechts
    box(4.28, 1.20, FB + 1.00, 0.44, 3.20, 0.06, HOL2)
    box(4.28, 1.20, FB + 1.60, 0.44, 3.20, 0.06, HOL2)
    box(4.28, 1.20, FB + 2.20, 0.44, 3.20, 0.06, HOL2)
    for sy in (-0.30, 2.70):
        box(4.28, sy, FB + 1.35, 0.44, 0.06, 2.70, HOL2)
    for i in range(9):
        box(4.28, -0.15 + i*0.34, FB + 1.14, 0.24, 0.22, 0.22, ROT if i % 3 == 0 else STAH)
        box(4.28, -0.15 + i*0.34, FB + 1.74, 0.26, 0.24, 0.20, WEIS if i % 2 else HOL2)
    # Kanu haengt an der rechten Wand
    for i in range(9):
        t = (i + 0.5)/9.0
        w = 0.72*(1.0 - (2*t - 1)**2)**0.6 + 0.06
        box(4.05, -3.6 + i*0.52, 2.90, 0.44, 0.52, w, WEIS if i % 2 else ROT)
    for yy in (-2.6, 1.0):
        strebe((4.05, yy, 3.30), (4.05, yy, WH + 0.60), 0.05, SEIL)
    # Ruderboot im Slip
    for i in range(11):
        t = (i + 0.5)/11.0
        yy = -2.6 + i*0.42
        w = 1.35*(1.0 - abs(2*t - 1)**2.1) + 0.16
        box(0, yy, 0.34, w, 0.44, 0.68, ROT)
        box(0, yy, 0.66, w - 0.14, 0.44, 0.10, WEIS)
    for yy in (-1.6, 0.4):
        box(0, yy, 0.60, 1.12, 0.16, 0.07, WEIS)              # Duchten
    for sx in (-1, 1):
        o = box(sx*0.62, -0.9, 0.82, 0.09, 2.20, 0.09, HOL2)
        o.rotation_euler[2] = sx*0.16
    # Klampen, Rettungsring, Tauwerk
    for sx in (-1, 1):
        for yy in (-2.4, 1.4, 4.6):
            klampe(sx*(SLIP - 0.42), yy, FB, STAH, 'y')
    reifen(-4.20, 4.10, 1.70, 0.42, 0.11, ROT, 'x')
    reifen(4.20, -4.20, 1.70, 0.42, 0.11, WEIS, 'x')
    for sx in (-1, 1):
        reifen(sx*(SLIP + 0.55), 5.20, FB + 0.12, 0.26, 0.07, SEIL, 'z', 12, 6)
    export("th15_bootshaus", 0.020, 2)


# ================================================================ 9) Faehranleger
def faehranleger():
    """Anlegerbruecke auf Pfaehlen: Zugangsrampe von Land (-y), Deck mit
    Wartehaeuschen und Gelaender, Klapprampe zum Wasser (+y), Dalben."""
    neu()
    BET  = mat("Beton",    (0.62,0.60,0.56), 0.92)
    DIEL = mat("Belag",    (0.58,0.45,0.30), 0.85)
    DIE2 = mat("Belag2",   (0.52,0.39,0.25), 0.88)
    PFAH = mat("Pfahl",    (0.40,0.30,0.20), 0.9)
    NASS = mat("Nass",     (0.26,0.24,0.20), 0.92)
    STAH = mat("Stahl",    (0.46,0.48,0.52), 0.42, 0.55)
    GRUE = mat("Anstrich", (0.16,0.40,0.36), 0.6)
    GLAS = mat("Glas",     (0.56,0.72,0.82), 0.14, 0.2)
    HOLZ = mat("Bank",     (0.50,0.34,0.20), 0.75)
    GELB = mat("Warnfarbe", (0.90,0.72,0.12), 0.55)
    ROT  = mat("Rettung",  (0.82,0.24,0.18), 0.7)
    WEIS = mat("Weiss",    (0.90,0.90,0.88), 0.6)
    LAMP = leucht("Anlegerlicht", (1.0,0.88,0.58), 2.6)
    ZD, BR = 1.80, 6.40
    # Pfaehle + Traeger
    for py in (-6.6, -3.1, 0.4, 3.9):
        for px in (-2.9, 2.9):
            zyl(px, py, 0.80, 0.22, 1.60, PFAH, 12)
            zyl(px, py, 0.30, 0.24, 0.60, NASS, 12)
            strebe((px, py, 0.55), (px*0.55, py, 1.58), 0.12, PFAH)
        box(0, py, 1.60, 6.60, 0.30, 0.26, PFAH)
    for px in (-2.9, 2.9):
        box(px, -1.00, 1.72, 0.28, 13.20, 0.24, PFAH)
    # Deckbelag (Bohlen quer)
    for i in range(26):
        box(0, -7.35 + i*0.50, ZD - 0.06, BR, 0.44, 0.12, DIEL if i % 3 else DIE2)
    box(0, -1.00, ZD - 0.13, BR + 0.10, 13.20, 0.06, PFAH)
    # Landrampe: Lauf ueber die OBERKANTEN definieren und die Platte darunter
    # legen — sonst taucht die Unterkante am Fusspunkt unter z=0 (gemessen -0,08).
    RY0, RY1, RZ0, RZ1 = -15.55, -7.45, 0.26, 1.80
    ang_r = math.atan2(RZ1 - RZ0, RY1 - RY0)
    Lr = math.hypot(RY1 - RY0, RZ1 - RZ0)
    o = box(0, (RY0+RY1)/2, (RZ0+RZ1)/2 - 0.11/math.cos(ang_r), 4.40, Lr, 0.22, BET)
    o.rotation_euler[0] = ang_r
    box(0, -15.90, 0.13, 4.60, 1.50, 0.26, BET)               # Anschluss am Land
    box(0, -16.55, 0.06, 4.60, 0.90, 0.12, BET)
    for py in (-13.4, -10.2):
        for px in (-1.8, 1.8):
            zyl(px, py, 0.30, 0.16, 0.60, BET, 10)
    for sx in (-2.28, 2.28):
        gelaender_schraeg(RY0 + 0.2, RY1 - 0.2, RZ0 + 0.04, RZ1 - 0.04, sx, STAH, 1.05, 0.07)
    for i in range(9):                                        # Querleisten (Rutschschutz)
        t = (i + 0.5)/9.0
        o = box(0, RY0 + t*(RY1-RY0), RZ0 + t*(RZ1-RZ0) + 0.04, 4.30, 0.10, 0.06, GELB)
        o.rotation_euler[0] = ang_r
    # Klapprampe zum Wasser
    ang_k = math.atan2(-1.25, 5.00)
    box(0, 8.00, 1.09, 4.20, math.hypot(5.0, 1.25) + 0.10, 0.18, STAH).rotation_euler[0] = ang_k
    for sx in (-2.15, 2.15):
        o = box(sx, 8.00, 1.24, 0.14, math.hypot(5.0, 1.25), 0.26, GELB)
        o.rotation_euler[0] = ang_k
        gelaender_schraeg(5.6, 10.4, 1.74, 0.56, sx, STAH, 1.00, 0.07)
    for sx in (-1.9, 1.9):
        zyl(sx, 5.50, 1.62, 0.16, 0.50, STAH, 10, rot=(0, math.pi/2, 0))   # Scharnier
    # Hubgeruest ueber der Klapprampe
    for sx in (-2.7, 2.7):
        box(sx, 5.30, 3.55, 0.34, 0.34, 3.50, STAH)
        strebe((sx, 5.30, 4.60), (sx*0.62, 5.30, 5.20), 0.16, STAH)
    box(0, 5.30, 5.28, 5.70, 0.40, 0.40, STAH)
    for sx in (-1.55, 1.55):
        box(sx, 5.30, 5.02, 0.30, 0.30, 0.60, GELB)
        strebe((sx, 5.30, 4.90), (sx, 10.10, 0.72), 0.055, STAH)
    # Wartehaeuschen (offen nach +y, dem Wasser zu)
    HX, HY, HH = -1.50, -4.30, 2.60
    box(HX, HY - 1.24, ZD + HH/2, 3.30, 0.16, HH, GRUE)       # Rueckwand
    box(HX, HY - 1.16, ZD + 1.55, 2.90, 0.10, 1.20, GLAS)
    for sx in (-1.57, 1.57):
        box(HX + sx, HY, ZD + HH/2, 0.16, 2.50, HH, GRUE)
        box(HX + sx, HY + 0.30, ZD + 1.55, 0.09, 1.60, 1.20, GLAS)
    box(HX, HY - 0.10, ZD + HH + 0.10, 3.90, 3.20, 0.20, GRUE)   # Dach
    box(HX, HY + 1.42, ZD + HH - 0.18, 3.90, 0.30, 0.24, WEIS)
    box(HX, HY - 1.02, ZD + 0.46, 2.90, 0.42, 0.09, HOLZ)     # Bank 0,50
    for sx in (-1.20, 1.20):
        box(HX + sx, HY - 1.02, ZD + 0.23, 0.09, 0.38, 0.46, GRUE)
    box(HX, HY - 1.06, ZD + 0.80, 2.90, 0.10, 0.34, HOLZ)
    box(HX + 1.75, HY - 0.30, ZD + 1.70, 0.10, 0.90, 0.66, WEIS)   # Fahrplan
    kugel(HX, HY - 0.10, ZD + HH - 0.08, 0.18, LAMP, 10)
    # Gelaender am Deck (Rampenachse bleibt frei)
    for sx in (-3.16, 3.16):
        gelaender(-7.4, 5.4, sx, ZD, STAH, 1.05, 'y', 0.07)
    gelaender(-3.1, -2.3, -7.5, ZD, STAH, 1.05, 'x', 0.07)
    gelaender(2.3, 3.1, -7.5, ZD, STAH, 1.05, 'x', 0.07)
    # Poller, Laternen, Rettungsring
    for sx in (-2.60, 2.60):
        for py in (-2.0, 3.4):
            poller(sx, py, ZD, STAH, 0.62)
    for sx in (-2.95, 2.95):
        zyl(sx, -6.20, ZD + 1.60, 0.09, 3.20, STAH, 10)
        kegel(sx, -6.20, ZD + 3.32, 0.30, 0.10, 0.26, STAH, 12)
        kugel(sx, -6.20, ZD + 3.14, 0.16, LAMP, 10)
    reifen(3.05, 1.20, ZD + 1.10, 0.36, 0.09, ROT, 'x')
    box(3.16, 1.20, ZD + 1.55, 0.08, 0.30, 0.30, WEIS)
    # Dalben am Wasser
    for sx in (-4.60, 4.60):
        for k, (dx, dy) in enumerate(((0, 0), (0.42, 0.30), (-0.36, 0.34))):
            zyl(sx + dx, 9.20 + dy, 2.10, 0.20, 4.20, PFAH, 12)
            zyl(sx + dx, 9.20 + dy, 0.35, 0.22, 0.70, NASS, 12)
        box(sx + 0.03, 9.40, 3.80, 1.10, 1.10, 0.20, STAH)
        kugel(sx + 0.03, 9.40, 4.02, 0.16, LAMP, 10)
    export("th15_faehranleger", 0.020, 2)


# ================================================================ 10) Fischerhuette
def fischerhuette():
    """BEGEHBAR: kleine Fischerhuette mit Ofen, Werkbank, Netzen, Kisten,
    Fass und Trockengestell davor. Tuer auf +y."""
    neu()
    HOLZ = mat("Bretter",  (0.46,0.33,0.21), 0.86)
    HOL2 = mat("Bretter2", (0.38,0.27,0.17), 0.9)
    BLAU = mat("Anstrich", (0.20,0.38,0.46), 0.75)
    DIEL = mat("Diele",    (0.56,0.42,0.27), 0.85)
    SOK  = mat("Sockel",   (0.52,0.50,0.46), 0.92)
    DACH = mat("Dachpappe", (0.30,0.28,0.26), 0.88)
    GLAS = mat("Fensterglas", (0.56,0.72,0.82), 0.14, 0.2)
    GUSS = mat("Ofen",     (0.18,0.18,0.20), 0.6, 0.3)
    STAH = mat("Metall",   (0.46,0.48,0.52), 0.42, 0.5)
    NETZ = mat("Netz",     (0.36,0.42,0.30), 0.9)
    NET2 = mat("Netz2",    (0.44,0.40,0.26), 0.9)
    KORK = mat("Boje",     (0.86,0.42,0.16), 0.7)
    KOR2 = mat("Boje2",    (0.90,0.86,0.30), 0.7)
    ROT  = mat("Rot",      (0.74,0.26,0.18), 0.65)
    FEUR = leucht("Feuer", (1.0,0.44,0.12), 3.0)
    LAMP = leucht("Lampe", (1.0,0.88,0.58), 2.4)
    B, T, WH = 6.0, 7.0, 3.20
    boden(B, T, SOK, DIEL, 2.4)
    for i in range(13):                                       # Dielenfugen
        box(0, -3.0 + i*0.5, FB + 0.01, B - 0.2, 0.05, 0.03, HOL2)
    wand_mit_tuer(0, T/2 + 0.13, B + 0.52, 0.26, WH, BLAU, 2.40, 2.80, 'x')
    wand_mit_fenstern(0, -T/2 - 0.13, B + 0.52, 0.26, WH, HOLZ, GLAS,
                      1, 1.60, 1.20, 2.40, 'x')
    for sx in (-1, 1):
        wand_mit_fenstern(sx*(B/2 + 0.13), 0, T + 0.26, 0.26, WH, HOLZ, GLAS,
                          2, 1.40, 1.20, 2.40, 'y')
        for i in range(10):                                   # Bretterstruktur
            box(sx*(B/2 + 0.28), -3.15 + i*0.70, WH*0.5, 0.05, 0.10, WH, HOL2)
    box(0, T/2 + 0.16, WH - 0.28, B + 0.60, 0.34, 0.24, HOL2) # Tuersturz-Blende
    ang = satteldach(0, 0, B/2 + 0.34, T + 0.90, WH, 1.70, 0.18, DACH, 0.45)
    for cy in (-T/2 - 0.02, T/2 - 0.02):
        giebel(0, cy, WH, B/2 + 0.24, 1.70, 0.26, HOL2, 'x')
    sparren(0, -2.9, 2.9, 5, B/2 + 0.24, WH, 1.70, HOL2, 0.11)
    # Ofen mit Rohr durchs Dach
    box(-2.00, -2.35, FB + 0.50, 0.90, 0.72, 1.00, GUSS)
    box(-2.00, -2.35, FB + 1.04, 1.02, 0.84, 0.10, GUSS)
    box(-2.00, -1.97, FB + 0.52, 0.52, 0.06, 0.42, FEUR)
    box(-2.00, -1.94, FB + 0.52, 0.58, 0.05, 0.50, GUSS)
    zyl(-2.00, -2.35, FB + 1.10, 0.24, 0.12, GUSS, 12)
    zyl(-2.00, -2.35, FB + 2.30, 0.13, 2.30, GUSS, 12)        # 1,40 - 3,70
    zyl(-2.00, -2.35, FB + 3.95, 0.13, 1.00, GUSS, 12)        # durchs Dach bis 4,55
    kegel(-2.00, -2.35, FB + 4.52, 0.24, 0.08, 0.18, GUSS, 12)
    box(-2.00, -2.35, FB + 3.28, 0.60, 0.60, 0.10, DACH)      # Dachdurchfuehrung
    for k in range(3):                                        # Brennholz
        zyl(-2.72, -1.20 + k*0.02, FB + 0.14 + k*0.24, 0.12, 0.60, HOL2, 8, rot=(0, math.pi/2, 0))
    # Werkbank rechts
    box(2.20, -0.60, FB + 0.86, 1.00, 2.60, 0.09, HOL2)
    for yy in (-1.75, 0.55):
        for sx in (-0.38, 0.38):
            box(2.20 + sx, yy, FB + 0.42, 0.10, 0.10, 0.84, HOL2)
    box(2.20, -0.60, FB + 0.50, 0.86, 2.40, 0.06, HOL2)
    box(2.66, -0.60, FB + 1.70, 0.06, 2.40, 1.00, HOL2)       # Werkzeugbrett
    for i in range(6):
        box(2.58, -1.65 + i*0.42, FB + 1.72, 0.05, 0.10, 0.40 if i % 2 else 0.26, STAH)
    kiste(2.20, 1.40, FB, 0.66, 0.46, 0.34, HOL2, ROT)
    kiste(2.20, 1.40, FB + 0.36, 0.66, 0.46, 0.34, HOL2)
    kiste(2.20, 1.42, FB + 0.72, 0.66, 0.46, 0.34, HOL2, ROT)
    # Netze an den Waenden
    netz(-2.72, 1.30, FB + 1.80, 2.80, 1.90, NETZ, 'y', 10, 8)
    box(-2.76, 1.30, FB + 2.78, 0.09, 2.90, 0.09, HOL2)
    netz(0.20, -3.05, FB + 1.85, 2.20, 1.60, NET2, 'x', 8, 6)
    box(0.20, -3.08, FB + 2.68, 2.30, 0.09, 0.09, HOL2)
    for i, xx in enumerate((-2.55, -2.20, -1.85)):            # Bojen
        kugel(xx, 1.20, FB + 0.72, 0.17, KORK if i % 2 == 0 else KOR2, 10)
    # Fass, Hocker, Tisch, Ruder, Laterne
    zyl(-2.60, 2.40, FB + 0.44, 0.38, 0.88, HOL2, 14)
    for zz in (FB + 0.14, FB + 0.44, FB + 0.76):
        zyl(-2.60, 2.40, zz, 0.40, 0.07, STAH, 14)
    zyl(0.90, 2.00, FB + 0.24, 0.20, 0.48, HOL2, 10)
    zyl(0.90, 2.00, FB + 0.50, 0.26, 0.06, HOLZ, 12)
    for sx in (-1, 1):                                        # Ruder an der Wand
        o = box(sx*2.60 - 0.10, -2.40, FB + 1.30, 0.09, 0.09, 2.30, HOL2)
        o.rotation_euler[0] = sx*0.16
        box(sx*2.60 - 0.10, -2.40 + sx*0.34, FB + 0.42, 0.13, 0.16, 0.62, HOL2)
    box(0, 0.60, WH + 1.20, 0.06, 0.06, 0.50, STAH)
    kegel(0, 0.60, WH + 0.86, 0.28, 0.09, 0.24, STAH, 12)
    kugel(0, 0.60, WH + 0.72, 0.14, LAMP, 10)
    # Trockengestell + Kisten draussen
    for sx in (-1.60, 1.60):
        # Fusspunkt bei 0,07: eine schraege Strebe der Staerke 0,11 ragt sonst
        # mit ihrer Ecke unter den Nullpunkt (gemessen -0,01).
        strebe((sx - 0.55, 4.10, 0.07), (sx, 4.10, 2.40), 0.11, HOL2)
        strebe((sx + 0.55, 4.10, 0.07), (sx, 4.10, 2.40), 0.11, HOL2)
    box(0, 4.10, 2.42, 3.90, 0.11, 0.11, HOL2)
    netz(0, 4.06, 1.55, 3.20, 1.70, NETZ, 'x', 11, 7)
    for i, xx in enumerate((-1.30, -0.95, 1.05, 1.42)):
        kugel(xx, 4.02, 0.62, 0.16, KORK if i % 2 == 0 else KOR2, 10)
    kiste(2.60, 3.60, FB, 0.70, 0.48, 0.34, HOL2, ROT)
    kiste(2.60, 3.62, FB + 0.36, 0.70, 0.48, 0.34, HOL2)
    kiste(-2.70, 3.70, FB, 0.70, 0.48, 0.34, HOL2)
    export("th15_fischerhuette", 0.018, 2)


if __name__ == "__main__":
    print("Asset-Charge 12 (th15, Hafen und Wasser):")
    for fn in (kaimauer_modul, containerkran, containerstapel, frachtschiff,
               segelboot, leuchtturm, steg, bootshaus, faehranleger, fischerhuette):
        fn()
    print("fertig")
