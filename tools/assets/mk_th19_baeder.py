# -*- coding: utf-8 -*-
"""Asset-Charge 16 (th19_*): BEGEHBARE SPORT- UND BADEBAUTEN — Schwimmbad,
Fitnessstudio, Eishalle, Kletterhalle, Tennishalle, Reithalle.
Familienfreundlich, keine Waffen.

Konventionen wie th5-th14:
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * Eingang liegt auf Blender +y  ->  in three.js -z (glTF dreht die Achsen).
  * Jede Oeffnung >= 3.0 m licht, ueberall ein Boden.
  * Aussensockel und Innenboden enden BEIDE auf `FB` -> keine Schwelle in der Tuer.
    (Beim Schwimmbad liegt der Boden hoeher, weil das Becken nach UNTEN muss —
     aussen wie innen aber wieder auf demselben Niveau, plus Freitreppe davor.)
  * Metallic max 0.6 — hoeher rendert three.js ohne Environment-Map fast schwarz.
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

def mat(name, rgb, rough=0.7, metal=0.0, emit=None, estr=1.3, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], alpha)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = min(metal, 0.6)   # >0.6 = schwarz in three.js
    b.inputs["Alpha"].default_value = alpha
    if alpha < 0.999:
        # glTF liest alphaMode aus blend_method -> sonst waere Wasser/Plexiglas dicht
        try: m.blend_method = 'BLEND'
        except Exception: pass
        try: m.surface_render_method = 'BLENDED'
        except Exception: pass
    if emit:
        b.inputs["Emission Color"].default_value = (emit[0], emit[1], emit[2], 1)
        b.inputs["Emission Strength"].default_value = estr
    return m

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

def kugel(x, y, z, r, m=None, seg=12, ring=7):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=seg, ring_count=ring)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def ring(x, y, z, R, r, m=None, seg=28, mseg=6):
    bpy.ops.mesh.primitive_torus_add(location=(x,y,z), major_radius=R, minor_radius=r,
                                     major_segments=seg, minor_segments=mseg)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
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

# ---------------------------------------------------------------- Boden
FB = 0.30   # Fussboden-Oberkante — Aussensockel UND Innenboden enden hier.
            # JEDES Einrichtungsstueck bekommt sein z relativ dazu.

def boden(B, T, m_sockel, m_boden, rand=2.0, h=FB):
    box(0, 0, h/2, B + rand, T + rand, h, m_sockel)     # Vorplatz
    box(0, 0, h/2, B, T, h, m_boden)                    # Innenboden, buendig

def stufen_aussen(cx, y0, breite, hoehe, m, n=3, tritt=0.48):
    """Freitreppe vom Gelaende auf einen hohen Sockel — nach +y absteigend."""
    for i in range(n):
        zt = hoehe * (n - i) / (n + 1.0)
        box(cx, y0 + (i + 0.5)*tritt, zt/2, breite, tritt, zt, m)

# ---------------------------------------------------------------- Wand-Helfer
def wand_mit_tuer(cx, cy, laenge, dicke, hoehe, m, tuer_b=2.4, tuer_h=3.2,
                  achse='x', tuer_off=0.0):
    """Wand mit durchgehender Tueroeffnung: links + rechts + Sturz (kein Boolean noetig)."""
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
    """x-Mitten der n Oeffnungen und der n+1 Pfeiler — damit man Stuetzen und
    Einbauten NICHT versehentlich in einen Durchgang stellt."""
    pf = (laenge - n*off_b) / (n + 1)
    pfeiler = [-laenge/2 + pf/2 + i*(pf + off_b) for i in range(n + 1)]
    oeff = [-laenge/2 + pf + off_b/2 + i*(pf + off_b) for i in range(n)]
    return oeff, pfeiler

def wand_mit_oeffnungen(cx, cy, laenge, dicke, hoehe, m, n=3, off_b=3.0, off_h=3.4, achse='x'):
    """Wand mit n gleichmaessig verteilten Durchgaengen (Hallenportale)."""
    oeff, pfeiler = oeffnungs_achsen(laenge, n, off_b)
    pf = (laenge - n*off_b) / (n + 1)
    for t in pfeiler:
        if pf > 0.01:
            if achse == 'x': box(cx + t, cy, hoehe/2, pf, dicke, hoehe, m)
            else:            box(cx, cy + t, hoehe/2, dicke, pf, hoehe, m)
    for t in oeff:
        if achse == 'x': box(cx + t, cy, off_h + (hoehe-off_h)/2, off_b, dicke, hoehe-off_h, m)
        else:            box(cx, cy + t, off_h + (hoehe-off_h)/2, dicke, off_b, hoehe-off_h, m)

def fensterband(cx, cy, laenge, dicke, zmit, hoehe, m_rahm, m_glas, n=3, achse='x'):
    for i in range(n):
        t = (i + 0.5)/n - 0.5
        if achse == 'x':
            box(cx + t*laenge, cy, zmit, laenge/n*0.62, dicke*1.2, hoehe, m_rahm)
            box(cx + t*laenge, cy, zmit, laenge/n*0.50, dicke*1.4, hoehe*0.80, m_glas)
        else:
            box(cx, cy + t*laenge, zmit, dicke*1.2, laenge/n*0.62, hoehe, m_rahm)
            box(cx, cy + t*laenge, zmit, dicke*1.4, laenge/n*0.50, hoehe*0.80, m_glas)

def platte_mit_loch(cx, cy, z, B, T, dicke, lb, lt, m, lx=0.0, ly=0.0):
    """Platte mit rechteckiger Aussparung (Galerie ODER Schwimmbecken) — 4 Streifen.
    lx/ly verschieben das Loch gegenueber der Plattenmitte."""
    y_u, y_o = -T/2, T/2
    lyu, lyo = ly - lt/2, ly + lt/2
    x_l, x_r = -B/2, B/2
    lxl, lxr = lx - lb/2, lx + lb/2
    if lyu - y_u > 0.01:
        box(cx, cy + (y_u + lyu)/2, z, B, lyu - y_u, dicke, m)
    if y_o - lyo > 0.01:
        box(cx, cy + (lyo + y_o)/2, z, B, y_o - lyo, dicke, m)
    if lxl - x_l > 0.01:
        box(cx + (x_l + lxl)/2, cy + ly, z, lxl - x_l, lt, dicke, m)
    if x_r - lxr > 0.01:
        box(cx + (lxr + x_r)/2, cy + ly, z, x_r - lxr, lt, dicke, m)

def tonne(cx, cy, z, r, laenge, m, seg=24, fuellen=False):
    """HALBES Tonnengewoelbe: Zylinder mit Achse in x, untere Haelfte weggeschnitten.
    Basis liegt exakt bei z, sitzt also buendig auf der Mauerkrone. Ein voller Zylinder
    taugt nicht: seine untere Haelfte steckt im Gebaeude und verdeckt von innen alles.
    fuellen=False laesst die Unterseite offen -> man sieht von innen das echte Gewoelbe;
    die halbrunden Stirndeckel des Zylinders bleiben als Giebel stehen."""
    o = zyl(cx, cy, z, r, laenge, m, seg, rot=(0, math.pi/2, 0))
    nur(o)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    if fuellen:
        bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    bm.to_mesh(o.data); bm.free(); o.data.update()
    return o

def giebel(cx, cy, z, breite, hoehe, dicke, m, achse='y'):
    """Dreieckiges Giebelprisma. achse='y': Dreieck spannt in y auf, Dicke in x."""
    h2 = dicke/2.0
    if achse == 'y':
        v = [(-h2,-breite/2,0),(-h2,breite/2,0),(-h2,0,hoehe),
             ( h2,-breite/2,0),( h2,breite/2,0),( h2,0,hoehe)]
    else:
        v = [(-breite/2,-h2,0),(breite/2,-h2,0),(0,-h2,hoehe),
             (-breite/2, h2,0),(breite/2, h2,0),(0, h2,hoehe)]
    f = [(0,1,2),(5,4,3),(0,2,5,3),(2,1,4,5),(1,0,3,4)]
    me = bpy.data.meshes.new("giebel"); me.from_pydata(v, [], f); me.update()
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free(); me.update()
    ob = bpy.data.objects.new("Giebel", me)
    bpy.context.collection.objects.link(ob)
    ob.location = (cx, cy, z)
    if m: ob.data.materials.append(m)
    return ob

def satteldach(B, T, z, rise, m_dach, m_giebel, ueber=0.8, dicke=0.34):
    """Satteldach mit First in x. Traufe bei z, First bei z+rise. Giebel schliessen
    die Stirnseiten — sonst klafft dort ein Himmelsspalt."""
    hw = T/2 + ueber
    a = math.atan2(rise, hw)
    sl = math.hypot(hw, rise)
    dz = (dicke/2.0)/math.cos(a)
    for s in (-1, 1):
        o = box(0, s*hw/2, z + rise/2 + dz, B + 2*ueber, sl, dicke, m_dach)
        o.rotation_euler[0] = -s*a
    box(0, 0, z + rise + dz*0.8, B + 2*ueber, 0.75, 0.30, m_dach)     # Firstkappe
    for s in (-1, 1):
        # Giebel bewusst etwas hoeher als der First: sonst bleibt zwischen seiner
        # Schraege und der Dachunterseite ein Schlitz offen.
        giebel(s*(B/2), 0, z, T, rise + 0.15, 0.5, m_giebel, 'y')

# ---------------------------------------------------------------- Gelaender + Treppe
def gelaender(a0, a1, fest, z, m, hoehe=1.05, achse='x'):
    """Handlauf + Staebe. achse='x': laeuft in x bei y=fest."""
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
    """Treppenlauf mit begehbarer Steigung (~0.17 m) und mitlaufendem Gelaender.
    n = round(Hoehe/Steigung) — Lauflaenge RECHNEN, nicht schaetzen."""
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

# ---------------------------------------------------------------- Sport-Helfer
def tribuene(cx, y0, breite, reihen, m_stufe, m_sitz, m_sitz2, richtung=-1,
             stufe_t=0.90, stufe_h=0.45, pitch=0.72, gang=2.0, z0=FB):
    """Ansteigende Zuschauertribuene. y0 = Vorderkante der untersten Stufe,
    richtung=-1: steigt nach -y an. Mittelgang bleibt frei."""
    for r in range(reihen):
        zh = z0 + (r + 1)*stufe_h
        cy = y0 + richtung*(r + 0.5)*stufe_t
        box(cx, cy, (z0 + zh)/2, breite, stufe_t, zh - z0, m_stufe)     # Stufenblock
        n = max(1, int(breite / pitch))
        for i in range(n):
            px = cx - breite/2 + (i + 0.5)*breite/n
            if abs(px - cx) < gang/2: continue
            box(px, cy - richtung*0.10, zh + 0.045, pitch*0.84, 0.42, 0.09,
                m_sitz if (i + r) % 2 == 0 else m_sitz2)                 # Sitzschale
            box(px, cy + richtung*0.30, zh + 0.30, pitch*0.84, 0.09, 0.44,
                m_sitz if (i + r) % 2 == 0 else m_sitz2)                 # Lehne
    # Zugangstreppe im Mittelgang
    for r in range(reihen):
        box(cx, y0 + richtung*(r + 0.5)*stufe_t, z0 + (r + 0.5)*stufe_h*0.5,
            gang*0.9, stufe_t, (r + 1)*stufe_h - stufe_h*0.5, m_stufe)

def bank(px, py, z, laenge, m_holz, m_stahl, achse='x', lehne=True):
    """Sitzbank, Sitzhoehe 0.45 ueber Boden."""
    if achse == 'x':
        box(px, py, z + 0.45, laenge, 0.42, 0.07, m_holz)
        for sx in (-laenge/2 + 0.30, laenge/2 - 0.30):
            box(px + sx, py, z + 0.22, 0.09, 0.40, 0.45, m_stahl)
        if lehne:
            box(px, py - 0.20, z + 0.78, laenge, 0.07, 0.38, m_holz)
            for sx in (-laenge/2 + 0.30, laenge/2 - 0.30):
                box(px + sx, py - 0.20, z + 0.62, 0.08, 0.08, 0.66, m_stahl)
    else:
        box(px, py, z + 0.45, 0.42, laenge, 0.07, m_holz)
        for sy in (-laenge/2 + 0.30, laenge/2 - 0.30):
            box(px, py + sy, z + 0.22, 0.40, 0.09, 0.45, m_stahl)
        if lehne:
            box(px - 0.20, py, z + 0.78, 0.07, laenge, 0.38, m_holz)
            for sy in (-laenge/2 + 0.30, laenge/2 - 0.30):
                box(px - 0.20, py + sy, z + 0.62, 0.08, 0.08, 0.66, m_stahl)

def liegestuhl(px, py, z, m_rahm, m_pol, achse='y'):
    """Liegestuhl, Sitzflaeche 0.40 ueber Boden, Lehne 35 Grad geneigt."""
    if achse == 'y':
        for dx in (-0.26, 0.26):
            for dy in (-0.80, 0.80):
                box(px + dx, py + dy, z + 0.19, 0.07, 0.07, 0.38, m_rahm)
        box(px, py, z + 0.41, 0.64, 1.86, 0.08, m_pol)
        o = box(px, py - 1.28, z + 0.63, 0.64, 0.82, 0.07, m_pol)
        o.rotation_euler[0] = -0.60
    else:
        for dy in (-0.26, 0.26):
            for dx in (-0.80, 0.80):
                box(px + dx, py + dy, z + 0.19, 0.07, 0.07, 0.38, m_rahm)
        box(px, py, z + 0.41, 1.86, 0.64, 0.08, m_pol)
        o = box(px - 1.28, py, z + 0.63, 0.82, 0.64, 0.07, m_pol)
        o.rotation_euler[1] = 0.60

def bande(cx, cy, B, T, z, hoehe, fase, m_bande, m_kante, m_glas, m_pfost,
          glas_h=1.5, luecken=()):
    """Spielfeldbande mit abgeschraegten Ecken + Plexiglas-Aufsatz.
    `luecken` = Liste (x0,x1) auf der +y-Seite, die frei bleiben (Spielerbaenke)."""
    hb, ht = B/2, T/2
    lang = B - 2*fase
    quer = T - 2*fase
    def seg(x, y, sx, sy, rot=0.0):
        laengs = sx >= sy                       # laeuft das Segment in x oder in y?
        o = box(x, y, z + hoehe/2, sx, sy, hoehe, m_bande); o.rotation_euler[2] = rot
        o = box(x, y, z + hoehe + 0.06,
                sx*(1.0 if laengs else 1.20), sy*(1.20 if laengs else 1.0), 0.12, m_kante)
        o.rotation_euler[2] = rot
        o = box(x, y, z + hoehe + glas_h/2 + 0.12,
                sx*0.995 if laengs else 0.05, 0.05 if laengs else sy*0.995, glas_h, m_glas)
        o.rotation_euler[2] = rot
        n = max(2, int(max(sx, sy)/2.4))
        for i in range(n + 1):
            t = -0.5 + i/n
            dx = t*sx*math.cos(rot) if laengs else -t*sy*math.sin(rot)
            dy = t*sx*math.sin(rot) if laengs else t*sy*math.cos(rot)
            box(x + dx, y + dy, z + hoehe + glas_h/2 + 0.12, 0.09, 0.09, glas_h, m_pfost)
    # Laengsseiten
    for s in (-1, 1):
        y = cy + s*ht
        if s > 0 and luecken:
            grenzen = [cx - lang/2]
            for (a, b) in luecken: grenzen += [a, b]
            grenzen += [cx + lang/2]
            for k in range(0, len(grenzen) - 1, 2):
                a, b = grenzen[k], grenzen[k+1]
                if b - a > 0.2: seg((a+b)/2, y, b - a, 0.16)
        else:
            seg(cx, y, lang, 0.16)
    for s in (-1, 1):
        seg(cx + s*hb, cy, 0.16, quer)
    # Ecken 45 Grad
    d = fase/2.0
    for sx in (-1, 1):
        for sy in (-1, 1):
            seg(cx + sx*(hb - d), cy + sy*(ht - d), fase*math.sqrt(2)*0.99, 0.16,
                -sx*sy*math.pi/4)


# ================================================================ 1) Schwimmbad
def schwimmbad():
    """Schwimmhalle 40x26 m: 25-m-Becken mit Bahnen und Rinne, Kinderbecken,
    1-m-Sprungbrett, Startbloecke, Liegestuehle, Umkleiden, Tonnendach."""
    neu()
    F   = 0.60                      # Beckenumgang liegt hoeher — das Becken muss nach unten
    AUS = mat("BadFassade", (0.86,0.88,0.90), 0.75)
    W   = mat("BadWand",    (0.90,0.93,0.95), 0.70)
    SOK = mat("Sockel",     (0.55,0.56,0.58), 0.90)
    DECK= mat("Beckenumgang",(0.80,0.83,0.84), 0.55)
    STEIN=mat("Beckenrand", (0.93,0.94,0.92), 0.45)
    RINNE=mat("Rinne",      (0.32,0.34,0.36), 0.60)
    FLIE= mat("Beckenfliese",(0.55,0.80,0.88), 0.30)
    LINIE=mat("Bahnenlinie",(0.10,0.24,0.50), 0.40)
    WASS= mat("Wasser",     (0.20,0.62,0.82), 0.10, 0.20, None, 1.3, 0.62)
    ROT = mat("Schwimmrot", (0.86,0.22,0.20), 0.55)
    GELB= mat("Schwimmgelb",(0.96,0.78,0.20), 0.55)
    CHR = mat("Chrom",      (0.74,0.77,0.80), 0.22, 0.55)
    DACH= mat("Dachhaut",   (0.62,0.68,0.74), 0.60)
    GLAS= mat("Glas",       (0.66,0.82,0.90), 0.12, 0.10, None, 1.3, 0.42)
    HOLZ= mat("Bank",       (0.72,0.55,0.32), 0.65)
    TUER= mat("Kabinentuer",(0.20,0.62,0.66), 0.55)
    LICHT=mat("Oberlicht",  (1.0,0.98,0.90), 0.25, 0.0, (1.0,0.97,0.88), 1.9)
    SCHILD=mat("Schild",    (0.20,0.55,0.80), 0.35, 0.0, (0.25,0.65,0.95), 1.6)

    B, T, H, d = 40.0, 26.0, 8.0, 0.6
    PB, PT, PX, PY = 25.8, 13.4, -1.0, -3.6          # Beckenoeffnung im Boden
    WB, WT = 25.0, 12.6                              # Wasserflaeche
    WZ = 0.30                                        # Wasserspiegel -> 0.30 m unter Deck

    # --- Boden: Aussenring + Innenplatte mit Beckenloch (Sockel wuerde es sonst zubetonieren)
    platte_mit_loch(0, 0, F/2, B + 6.0, T + 6.0, F, B, T, SOK)
    platte_mit_loch(0, 0, F/2, B, T, F, PB, PT, DECK, PX, PY)
    stufen_aussen(0, T/2 + 3.0, 26.0, F, SOK, 3, 0.50)          # Freitreppe vor dem Eingang
    # Beckenwanne
    box(PX, PY, 0.03, PB, PT, 0.06, FLIE)
    for k in range(6):                                          # Bahnenmarkierung am Grund
        ly = PY + (k - 2.5)*2.1
        box(PX, ly, 0.075, WB - 2.0, 0.24, 0.03, LINIE)
        for ex in (-1, 1):
            box(PX + ex*(WB/2 - 1.4), ly, 0.075, 0.9, 0.9, 0.03, LINIE)
    box(PX, PY, WZ/2 + 0.06, WB, WT, WZ - 0.06, WASS)           # Wasser
    # Rinne + Beckenrand rundum
    for ex in (-1, 1):
        box(PX + ex*(PB/2 + 0.14), PY, F - 0.10, 0.26, PT + 0.55, 0.22, RINNE)
        box(PX + ex*(PB/2 + 0.57), PY, F + 0.01, 0.60, PT + 1.4, 0.10, STEIN)
        box(PX, PY + ex*(PT/2 + 0.14), F - 0.10, PB + 0.55, 0.26, 0.22, RINNE)
        box(PX, PY + ex*(PT/2 + 0.57), F + 0.01, PB + 1.4, 0.60, 0.10, STEIN)
    # Leinen zwischen den Bahnen (schwimmende Segmente, abwechselnd rot/gelb)
    for k in range(5):
        ly = PY + (k - 2)*2.1
        for i in range(13):
            zyl(PX - WB/2 + 0.95 + i*1.93, ly, WZ + 0.03, 0.07, 1.85,
                ROT if i % 2 == 0 else GELB, 8, rot=(0, math.pi/2, 0))
        for ex in (-1, 1):
            zyl(PX + ex*(WB/2 + 0.10), ly, WZ + 0.03, 0.08, 0.22, CHR, 8)
    # Einstiegsleitern
    for ly in (PY - 4.2, PY + 4.2):
        for dx in (-0.28, 0.28):
            zyl(PX + WB/2 + 0.32, ly + dx, F + 0.42, 0.045, 1.20, CHR, 10)
        for k in range(3):
            box(PX + WB/2 + 0.20, ly, 0.16 + k*0.22, 0.34, 0.62, 0.05, CHR)
    # --- Startbloecke am -x-Ende
    for k in range(6):
        ly = PY + (k - 2.5)*2.1
        px = PX - PB/2 - 1.35
        box(px, ly, F + 0.21, 0.62, 0.62, 0.42, W)
        o = box(px, ly, F + 0.45, 0.74, 0.74, 0.07, GELB); o.rotation_euler[1] = -0.13
        box(px + 0.30, ly, F + 0.62, 0.07, 0.44, 0.28, CHR)      # Griffbuegel
        box(px - 0.44, ly, F + 0.55, 0.10, 0.34, 0.34, SCHILD)   # Bahnnummer
    # --- 1-m-Sprungbrett (Brett 1.00 m ueber dem Wasserspiegel)
    BRZ = WZ + 1.00
    box(12.35, PY, BRZ - 0.04, 5.70, 0.62, 0.08, GELB)
    box(14.40, PY, (F + BRZ - 0.08)/2, 0.34, 0.52, BRZ - 0.08 - F, CHR)
    box(15.10, PY, (F + BRZ - 0.08)/2, 0.30, 0.52, BRZ - 0.08 - F, CHR)
    box(14.75, PY, F + 0.04, 1.60, 0.90, 0.08, CHR)
    for sy in (-0.40, 0.40):
        box(13.90, PY + sy, BRZ + 0.44, 2.60, 0.07, 0.07, CHR)
        for sx in (12.80, 15.00):
            box(sx, PY + sy, BRZ + 0.22, 0.06, 0.06, 0.44, CHR)
    treppe(14.75, PY + 1.20, F, 0.90, BRZ - 0.08 - F, W, CHR, 0.17, 0.30, richtung=-1)
    # --- Kinderbecken (in der Ecke vorn links — nicht neben die Startbloecke!)
    KX, KY, KB, KT = -16.5, 7.5, 5.0, 6.0
    box(KX, KY, F + 0.02, KB, KT, 0.05, FLIE)
    for ex in (-1, 1):
        box(KX + ex*(KB/2 + 0.12), KY, F + 0.22, 0.24, KT + 0.48, 0.44, STEIN)
        box(KX, KY + ex*(KT/2 + 0.12), F + 0.22, KB + 0.48, 0.24, 0.44, STEIN)
    box(KX, KY, F + 0.16, KB - 0.1, KT - 0.1, 0.22, WASS)
    box(KX, KY + KT/2 - 0.9, F + 1.05, 0.60, 0.60, 0.90, GELB)       # Mini-Rutsche
    o = box(KX, KY + KT/2 - 2.2, F + 0.80, 0.70, 2.60, 0.09, ROT); o.rotation_euler[0] = 0.42
    for k in range(3):
        box(KX + 0.55, KY + KT/2 - 0.55, F + 0.18 + k*0.26, 0.50, 0.06, 0.05, CHR)
    # --- Umkleidekabinen an der Eingangsseite (hinter den Wandpfeilern, Portale frei)
    oeff, pfeiler = oeffnungs_achsen(B, 3, 3.4)
    for bx in pfeiler:
        for c in range(4):
            px = bx + (c - 1.5)*1.24
            for sx in (-0.62, 0.62):
                box(px + sx, T/2 - 1.55, F + 1.15, 0.07, 1.50, 2.30, W)
            box(px, T/2 - 0.85, F + 1.15, 1.24, 0.08, 2.30, W)
            box(px, T/2 - 1.55, F + 2.36, 1.30, 1.56, 0.10, W)
            box(px, T/2 - 2.28, F + 1.10, 1.04, 0.06, 1.60, TUER)
        box(bx, T/2 - 1.55, F + 2.55, 4.96*1.06, 1.60, 0.28, TUER)
    # --- Liegestuehle + Baenke
    for k in range(7):
        liegestuhl(17.6, -10.0 + k*2.3, F, CHR, GELB, 'y')
    for px in (-7.5, -5.0, 3.0, 5.5, 8.0):        # NICHT in die Tuerachsen (+-10.85 / 0)
        liegestuhl(px, 8.0, F, CHR, ROT, 'x')
    for sx in (-16.0, 16.0):
        bank(sx, PY - 8.6, F, 3.6, HOLZ, CHR, 'x', True)
    # Duschen an der Rueckwand
    for k in range(5):
        px = -8.0 + k*4.0
        zyl(px, -T/2 + 0.55, F + 1.20, 0.05, 2.40, CHR, 8)
        box(px, -T/2 + 0.75, F + 2.32, 0.30, 0.40, 0.10, CHR)
    box(0, -T/2 + 0.35, F + 1.30, 22.0, 0.20, 2.60, FLIE)
    # --- Huelle
    wand_mit_oeffnungen(0, T/2, B, d, H, AUS, 3, 3.4, 3.9)
    box(0, -T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2):
        box(sx, 0, H/2, d, T, H, W)
        fensterband(sx, 0, T - 5.0, d, F + 5.4, 2.4, AUS, GLAS, 5, 'y')
    fensterband(0, T/2, B - 8.0, d, F + 5.4, 2.4, AUS, GLAS, 7, 'x')
    # Traufband als RING — ein volles Deckenbrett wuerde das Gewoelbe von innen zumauern
    platte_mit_loch(0, 0, H + 0.16, B + 0.9, T + 0.9, 0.32, B - 1.0, T - 1.0, AUS)
    dach = tonne(0, 0, H + 0.32, T/2, B + 1.2, DACH, 30, fuellen=False)
    dach.scale[2] = 0.50
    box(0, 0, H + 0.32 + (T/2)*0.50, B - 9.0, 3.0, 0.44, GLAS)       # Oberlicht im First
    for yy in (-10.0, -6.0, 0.0, 6.0, 10.0):                         # Lichtbaender AM Gewoelbe
        zz = H + 0.32 + math.sqrt(max(0.0, (T/2)**2 - yy*yy))*0.50 - 0.16
        box(0, yy, zz, B - 6.0, 0.44, 0.18, LICHT)
    # Vordach + Schild
    box(0, T/2 + 1.9, F + 3.70, B - 12.0, 3.6, 0.42, AUS)
    for sx in (-11.0, 11.0):
        zyl(sx, T/2 + 2.6, (F + 3.49)/2, 0.26, 3.49 - F, CHR, 12)
    box(0, T/2 + 0.34, H + 1.30, 17.0, 0.34, 2.00, AUS)
    box(0, T/2 + 0.58, H + 1.30, 14.0, 0.20, 1.30, SCHILD)
    export("th19_schwimmbad", 0.020, 2)


# ================================================================ 2) Fitnessstudio
def fitnessstudio():
    """30x20 m: Laufbaender, Hantelbaenke, Hantelablagen, Seilzuege, Spiegelwand,
    Empfangstheke, Gummiboden."""
    neu()
    AUS = mat("FitFassade", (0.26,0.28,0.32), 0.75)
    W   = mat("FitWand",    (0.30,0.32,0.36), 0.80)
    SOK = mat("Sockel",     (0.34,0.34,0.36), 0.90)
    GUM = mat("Gummiboden", (0.16,0.17,0.19), 0.85)
    GUM2= mat("Gummiboden2",(0.21,0.22,0.25), 0.85)
    TURF= mat("Kunstrasen", (0.16,0.36,0.22), 0.85)
    SPIE= mat("Spiegel",    (0.80,0.85,0.90), 0.10, 0.25)
    STAH= mat("Stahl",      (0.42,0.44,0.48), 0.35, 0.45)
    CHR = mat("Chrom",      (0.74,0.77,0.80), 0.20, 0.55)
    POL = mat("Polster",    (0.14,0.15,0.18), 0.60)
    ROT = mat("Akzent",     (0.88,0.24,0.16), 0.50)
    GEW = mat("Gewicht",    (0.12,0.12,0.14), 0.55)
    HOLZ= mat("Theke",      (0.55,0.38,0.22), 0.55)
    GLAS= mat("Glas",       (0.62,0.78,0.88), 0.12, 0.10, None, 1.3, 0.40)
    MON = mat("Konsole",    (0.10,0.16,0.22), 0.25, 0.0, (0.25,0.70,1.0), 1.7)
    NEON= mat("Leuchte",    (1.0,0.95,0.85), 0.25, 0.0, (1.0,0.93,0.82), 1.9)
    LOGO= mat("Logo",       (1.0,0.35,0.12), 0.30, 0.0, (1.0,0.32,0.10), 2.0)

    B, T, H, d = 30.0, 20.0, 5.0, 0.45
    boden(B, T, SOK, GUM, 2.5)
    for ix in range(6):                                     # Bodenfelder, sonst wirkt es tot
        for iy in range(4):
            if (ix + iy) % 2: continue
            box(-12.5 + ix*5.0, -7.5 + iy*5.0, FB + 0.015, 4.8, 4.8, 0.03, GUM2)
    box(-9.0, -6.0, FB + 0.02, 10.0, 2.6, 0.04, TURF)       # Functional-Bahn
    for k in range(9):
        box(-13.0 + k*2.5, -6.0, FB + 0.05, 0.10, 2.4, 0.02, ROT)

    oeff, pfeiler = oeffnungs_achsen(B, 2, 3.2)
    wand_mit_oeffnungen(0, T/2, B, d, H, AUS, 2, 3.2, 3.6)
    box(0, -T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, W)
    box(0, 0, H + 0.22, B + 1.1, T + 1.1, 0.44, AUS)
    fensterband(0, T/2, B - 6.0, d, FB + 4.15, 1.0, AUS, GLAS, 8, 'x')
    fensterband(B/2, 0, T - 5.0, d, FB + 2.60, 1.9, AUS, GLAS, 5, 'y')
    box(0, T/2 + 0.62, H*0.72, B - 8.0, 0.40, 1.50, AUS)
    box(0, T/2 + 0.86, H*0.72, B - 12.0, 0.20, 1.00, LOGO)
    box(0, T/2 + 1.9, FB + 3.30, B - 10.0, 3.4, 0.34, AUS)   # Vordach
    for sx in (-9.5, 9.5):
        zyl(sx, T/2 + 3.1, (FB + 3.13)/2, 0.20, 3.13 - FB, CHR, 12)

    # Spiegelwand an der Rueckwand + an der -x-Wand
    for k in range(10):
        box(-13.5 + k*3.0, -T/2 + 0.28, FB + 1.75, 2.86, 0.07, 2.70, SPIE)
        box(-13.5 + k*3.0, -T/2 + 0.24, FB + 3.16, 2.96, 0.05, 0.10, CHR)
    for k in range(6):
        box(-B/2 + 0.28, -7.5 + k*3.0, FB + 1.75, 0.07, 2.86, 2.70, SPIE)

    # Empfangstheke + Wartebereich beim Eingang
    box(10.6, 6.6, FB + 0.50, 6.4, 1.0, 1.00, HOLZ)
    box(10.6, 6.6, FB + 1.05, 6.8, 1.3, 0.10, CHR)
    box(13.5, 5.0, FB + 0.50, 1.0, 2.4, 1.00, HOLZ)
    box(13.5, 5.0, FB + 1.05, 1.3, 2.6, 0.10, CHR)
    box(10.6, 7.8, FB + 1.60, 6.4, 0.30, 3.00, W)
    box(10.6, 7.62, FB + 2.30, 4.0, 0.10, 1.10, LOGO)
    for k in range(2):
        zyl(9.2 + k*2.6, 5.6, FB + 0.32, 0.18, 0.64, CHR, 10)
        zyl(9.2 + k*2.6, 5.6, FB + 0.70, 0.30, 0.10, ROT, 14)
    bank(-11.0, 7.6, FB, 4.0, HOLZ, CHR, 'x', True)
    for k in range(6):                                             # Spinde an der -x-Wand
        box(-14.2, 8.4 - k*0.62, FB + 1.05, 0.55, 0.60, 2.10, STAH)
        box(-13.90, 8.4 - k*0.62, FB + 1.05, 0.04, 0.50, 1.94, ROT)

    # Laufbaender: Konsolen zeigen zur Spiegelwand (-y)
    for i in range(6):
        px = -12.4 + i*2.15
        box(px, 3.9, FB + 0.18, 0.92, 2.00, 0.36, STAH)
        box(px, 3.75, FB + 0.38, 0.66, 1.70, 0.05, GUM)
        for sx in (-0.44, 0.44):
            box(px + sx, 4.40, FB + 0.70, 0.07, 0.90, 0.70, STAH)
            box(px + sx, 4.05, FB + 1.02, 0.06, 0.72, 0.06, CHR)
        box(px, 4.82, FB + 0.85, 0.86, 0.10, 0.98, STAH)
        box(px, 4.72, FB + 1.20, 0.70, 0.08, 0.42, MON)
    # Ergometer-Reihe
    for i in range(5):
        px = -12.4 + i*2.15
        box(px, 0.6, FB + 0.10, 0.34, 1.30, 0.20, STAH)
        box(px, 0.6, FB + 0.55, 0.16, 0.20, 0.70, STAH)
        box(px, 0.15, FB + 0.72, 0.18, 0.44, 0.10, POL)
        zyl(px, 1.05, FB + 0.42, 0.30, 0.08, CHR, 16, rot=(0, math.pi/2, 0))
        box(px, 1.05, FB + 1.00, 0.52, 0.08, 0.07, CHR)
        box(px, 1.05, FB + 1.16, 0.34, 0.06, 0.24, MON)

    # Hantelbaenke mit Langhantel-Ablage
    for i in range(4):
        px = -12.0 + i*2.6
        box(px, -2.6, FB + 0.44, 0.42, 1.50, 0.14, POL)
        box(px, -3.35, FB + 0.52, 0.52, 0.34, 0.14, POL)
        for sy in (-0.62, 0.62):
            box(px, -2.6 + sy, FB + 0.19, 0.34, 0.09, 0.38, STAH)
        for sx in (-0.62, 0.62):
            box(px + sx, -2.05, FB + 0.62, 0.09, 0.09, 1.24, STAH)
            box(px + sx, -2.05, FB + 1.20, 0.14, 0.22, 0.14, ROT)
        zyl(px, -2.05, FB + 1.26, 0.025, 1.90, CHR, 8, rot=(0, math.pi/2, 0))
        for sx in (-0.85, 0.85):
            zyl(px + sx, -2.05, FB + 1.26, 0.22, 0.09, GEW, 16, rot=(0, math.pi/2, 0))
    # Hantelablage (Kurzhanteln)
    for j, py in enumerate((-8.2, -8.9)):
        box(2.0, py, FB + 0.30 + j*0.0, 7.6, 0.44, 0.10, STAH)
        box(2.0, py, FB + 0.15, 7.6, 0.30, 0.30, STAH)
        for i in range(10):
            px = -1.4 + i*0.76
            zyl(px, py, FB + 0.48, 0.035, 0.30, CHR, 8, rot=(math.pi/2, 0, 0))
            for sy in (-0.15, 0.15):
                zyl(px, py + sy, FB + 0.48, 0.13, 0.10, GEW, 12, rot=(math.pi/2, 0, 0))
    # Power-Racks
    for i in range(2):
        px = 9.0 + i*4.4
        for sx in (-0.72, 0.72):
            for sy in (-0.62, 0.62):
                box(px + sx, -6.0 + sy, FB + 1.10, 0.12, 0.12, 2.20, STAH)
        box(px, -6.0, FB + 2.24, 1.68, 1.36, 0.12, STAH)
        for sx in (-0.72, 0.72):
            box(px + sx, -6.0, FB + 1.16, 0.20, 0.20, 0.14, ROT)
        zyl(px, -6.0, FB + 1.22, 0.025, 2.10, CHR, 8, rot=(0, math.pi/2, 0))
        for sx in (-0.95, 0.95, -0.80, 0.80):
            zyl(px + sx, -6.0, FB + 1.22, 0.23, 0.07, GEW, 16, rot=(0, math.pi/2, 0))
        box(px, -6.0, FB + 0.07, 2.4, 1.8, 0.14, GUM2)
    # Seilzug-Station
    for i in range(2):
        px = 5.2 + i*5.6
        for sx in (-0.60, 0.60):
            box(px + sx, 0.4, FB + 1.15, 0.14, 0.14, 2.30, STAH)
        box(px, 0.4, FB + 2.34, 1.40, 0.30, 0.14, STAH)
        box(px, 0.4, FB + 0.62, 0.90, 0.44, 1.24, GEW)      # Gewichtsblock
        for k in range(8):
            box(px, 0.4, FB + 0.16 + k*0.14, 0.94, 0.50, 0.10, STAH if k % 2 else GEW)
        for sx in (-0.60, 0.60):
            zyl(px + sx, 0.4, FB + 1.62, 0.012, 1.30, CHR, 6)
            box(px + sx, 0.4, FB + 0.98, 0.22, 0.06, 0.14, CHR)
        box(px, -0.30, FB + 0.24, 1.00, 0.50, 0.48, POL)
    # Mattenbereich + Medizinbaelle — hinter dem Mittelpfeiler, nicht in der Tuerachse
    for k in range(4):
        box(-1.5 + k*1.2, 7.2, FB + 0.03, 1.0, 2.2, 0.06, ROT if k % 2 else GUM2)
    for k in range(4):
        kugel(-9.6, 5.2 + k*0.62, FB + 0.17, 0.17, ROT, 12, 7)
    # Beleuchtung
    for i in range(5):
        box(-11.0 + i*5.5, 0, H - 0.22, 0.34, T - 4.0, 0.14, NEON)
    export("th19_fitnessstudio", 0.018, 2)


# ================================================================ 3) Eishalle
def eishalle():
    """44x28 m: Eisflaeche mit Bande und Plexiglas, 2 Tore, Spielerbaenke,
    Tribuene, haengende Anzeigetafel."""
    neu()
    AUS = mat("EisFassade", (0.30,0.38,0.48), 0.75)
    W   = mat("EisWand",    (0.62,0.70,0.78), 0.80)
    SOK = mat("Sockel",     (0.42,0.44,0.46), 0.90)
    BET = mat("Beton",      (0.48,0.50,0.53), 0.85)
    EIS = mat("Eis",        (0.86,0.93,0.98), 0.12, 0.10)
    BLAU= mat("Blaulinie",  (0.16,0.34,0.80), 0.45)
    ROT = mat("Rotlinie",   (0.84,0.16,0.16), 0.45)
    BAN = mat("Bande",      (0.94,0.95,0.96), 0.55)
    KANT= mat("Bandenkante",(0.96,0.78,0.14), 0.50)
    PLEX= mat("Plexiglas",  (0.78,0.88,0.94), 0.08, 0.05, None, 1.3, 0.24)
    PFO = mat("Pfosten",    (0.55,0.58,0.62), 0.35, 0.40)
    NETZ= mat("Tornetz",    (0.94,0.95,0.96), 0.80, 0.0, None, 1.3, 0.38)
    STAH= mat("Stahl",      (0.46,0.48,0.52), 0.35, 0.45)
    SIT1= mat("Sitz1",      (0.16,0.34,0.72), 0.60)
    SIT2= mat("Sitz2",      (0.86,0.30,0.18), 0.60)
    HOLZ= mat("Bank",       (0.70,0.52,0.30), 0.65)
    TAFE= mat("Tafel",      (0.08,0.09,0.12), 0.40)
    LED = mat("Anzeige",    (0.10,0.12,0.14), 0.25, 0.0, (1.0,0.55,0.10), 2.4)
    LED2= mat("Anzeige2",   (0.10,0.12,0.14), 0.25, 0.0, (0.30,0.95,0.55), 2.2)
    NEON= mat("Hallenlicht",(1.0,0.98,0.92), 0.25, 0.0, (1.0,0.97,0.90), 1.9)

    B, T, H, d = 44.0, 28.0, 9.0, 0.6
    EB, ET, EY = 30.0, 15.0, -1.0                    # Eisflaeche (Platz fuer die Tribuene hinten)
    boden(B, T, SOK, BET, 3.0)
    box(0, EY, FB + 0.03, EB, ET, 0.06, EIS)
    # Linien
    box(0, EY, FB + 0.07, 0.32, ET, 0.02, ROT)
    for sx in (-5.0, 5.0):  box(sx, EY, FB + 0.07, 0.32, ET, 0.02, BLAU)
    for sx in (-13.0, 13.0):
        box(sx, EY, FB + 0.07, 0.14, ET, 0.02, ROT)
        zyl(sx + (1.0 if sx < 0 else -1.0), EY, FB + 0.075, 1.9, 0.02, BLAU, 20)
    ring(0, EY, FB + 0.075, 4.5, 0.05, BLAU, 30, 6)
    for sx in (-8.5, 8.5):
        for sy in (-5.0, 5.0):
            ring(sx, EY + sy, FB + 0.075, 4.5, 0.05, ROT, 30, 6)
            zyl(sx, EY + sy, FB + 0.075, 0.30, 0.03, ROT, 14)
    zyl(0, EY, FB + 0.08, 0.30, 0.03, BLAU, 14)
    # Bande mit 2 Luecken fuer die Spielerbaenke (auf der Eingangsseite)
    bande(0, EY, EB + 0.6, ET + 0.6, FB, 1.20, 3.0, BAN, KANT, PLEX, PFO,
          1.50, luecken=((-7.4, -5.4), (5.4, 7.4)))
    # Tore
    for sx in (-13.0, 13.0):
        s = 1 if sx < 0 else -1
        for dy in (-0.915, 0.915):
            zyl(sx, EY + dy, FB + 0.68, 0.055, 1.22, ROT, 10)
        zyl(sx, EY, FB + 1.28, 0.055, 1.83, ROT, 10, rot=(math.pi/2, 0, 0))
        box(sx - s*0.50, EY, FB + 0.66, 1.00, 1.90, 0.05, NETZ)      # Netzdach
        box(sx - s*1.00, EY, FB + 0.62, 0.05, 1.90, 1.24, NETZ)      # Netzrueckwand
        for dy in (-0.915, 0.915):
            box(sx - s*0.50, EY + dy, FB + 0.62, 1.00, 0.05, 1.24, NETZ)
        for dy in (-0.915, 0.915):
            zyl(sx - s*1.00, EY + dy, FB + 0.62, 0.04, 1.24, ROT, 8)
    # Spielerbaenke hinter den Bandenluecken
    for sx in (-6.4, 6.4):
        box(sx, EY + ET/2 + 1.55, FB + 0.55, 7.0, 0.20, 1.10, BAN)   # Rueckwand
        box(sx, EY + ET/2 + 0.95, FB + 0.45, 6.6, 0.44, 0.10, HOLZ)  # Sitzbank
        for k in range(5):
            box(sx - 2.6 + k*1.3, EY + ET/2 + 0.95, FB + 0.20, 0.10, 0.40, 0.40, STAH)
        box(sx, EY + ET/2 + 1.30, FB + 2.40, 7.2, 1.4, 0.14, STAH)   # Dach
        for dx in (-3.3, 3.3):
            box(sx + dx, EY + ET/2 + 1.55, FB + 1.20, 0.12, 0.12, 2.40, STAH)
    # Tribuene auf der Rueckseite: 5 Reihen a 0.90 m = 4.5 m, endet bei y=-13.9 (Wand -14)
    tribuene(0, EY - ET/2 - 0.9, 38.0, 5, BET, SIT1, SIT2, -1, 0.85, 0.46, 0.74, 2.2, FB)
    gelaender(-19.0, 19.0, EY - ET/2 - 0.9, FB, PFO, 1.05, 'x')
    # Zuschauerbaenke beim Eingang — hinter den Wandpfeilern, Portale bleiben frei
    for px in oeffnungs_achsen(B, 3, 3.6)[1]:
        bank(px, T/2 - 1.6, FB, 5.0, HOLZ, STAH, 'x', True)
    # Anzeigetafel, an den Dachbindern haengend (Unterkante 5.70 m ueber dem Eis)
    box(0, EY, 6.85, 4.2, 4.2, 2.30, TAFE)
    for sx in (-1.6, 1.6):
        for sy in (-1.6, 1.6):
            zyl(sx, EY + sy, 8.30, 0.05, 0.60, STAH, 8)
    for s in (-1, 1):
        box(s*2.13, EY, 7.20, 0.10, 3.4, 1.10, LED)
        box(s*2.13, EY, 6.20, 0.10, 3.4, 0.60, LED2)
        box(0, EY + s*2.13, 7.20, 3.4, 0.10, 1.10, LED)
        box(0, EY + s*2.13, 6.20, 3.4, 0.10, 0.60, LED2)
    box(0, EY, 8.05, 4.4, 4.4, 0.16, STAH)
    # Huelle
    wand_mit_oeffnungen(0, T/2, B, d, H, AUS, 3, 3.6, 4.0)
    box(0, -T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, W)
    box(0, 0, H + 0.30, B + 1.4, T + 1.4, 0.60, AUS)
    for i in range(8):                                              # Dachbinder
        box(0, -12.0 + i*3.5, H - 0.40, B - 1.0, 0.26, 0.70, STAH)
    for i in range(6):
        box(-18.0 + i*7.2, 0, H - 0.92, 0.44, T - 5.0, 0.18, NEON)
    box(0, T/2 + 0.62, H*0.76, B - 12.0, 0.40, 1.90, AUS)
    box(0, T/2 + 0.86, H*0.76, B - 16.0, 0.20, 1.20, LED)
    box(0, T/2 + 1.9, FB + 4.20, B - 14.0, 3.8, 0.40, AUS)
    for sx in (-13.0, 13.0):
        zyl(sx, T/2 + 3.1, (FB + 4.00)/2, 0.24, 4.00 - FB, STAH, 12)
    export("th19_eishalle", 0.020, 2)


# ================================================================ 4) Kletterhalle
def kletterhalle():
    """26x20 m, 13 m hoch: Kletterwaende mit farbigen Griffen, Boulderblock,
    Matten, Sicherungsseile, Empfang, Cafe-Galerie."""
    neu()
    AUS = mat("KletFassade",(0.42,0.36,0.30), 0.78)
    W   = mat("KletWand",   (0.58,0.55,0.50), 0.82)
    SOK = mat("Sockel",     (0.40,0.39,0.37), 0.90)
    BOD = mat("Hallenboden",(0.34,0.32,0.30), 0.80)
    P1  = mat("Panel1",     (0.32,0.42,0.52), 0.75)
    P2  = mat("Panel2",     (0.44,0.36,0.30), 0.75)
    P3  = mat("Panel3",     (0.30,0.44,0.38), 0.75)
    P4  = mat("Panel4",     (0.50,0.46,0.38), 0.75)
    GR1 = mat("Griff1",     (0.92,0.24,0.20), 0.55)
    GR2 = mat("Griff2",     (0.20,0.55,0.92), 0.55)
    GR3 = mat("Griff3",     (0.96,0.78,0.16), 0.55)
    GR4 = mat("Griff4",     (0.24,0.76,0.42), 0.55)
    MAT1= mat("Matte1",     (0.18,0.30,0.52), 0.85)
    MAT2= mat("Matte2",     (0.52,0.20,0.24), 0.85)
    SEIL= mat("Seil",       (0.92,0.86,0.40), 0.65)
    STAH= mat("Stahl",      (0.48,0.50,0.54), 0.35, 0.45)
    CHR = mat("Chrom",      (0.74,0.77,0.80), 0.20, 0.55)
    HOLZ= mat("Holz",       (0.62,0.44,0.24), 0.60)
    GLAS= mat("Glas",       (0.64,0.80,0.88), 0.12, 0.10, None, 1.3, 0.40)
    NEON= mat("Licht",      (1.0,0.97,0.88), 0.25, 0.0, (1.0,0.95,0.86), 1.9)
    LOGO= mat("Logo",       (0.20,0.80,0.70), 0.30, 0.0, (0.18,0.85,0.72), 2.0)

    B, T, H, d = 26.0, 20.0, 13.0, 0.5
    GRIFFE = (GR1, GR2, GR3, GR4)
    PANEL  = (P1, P2, P3, P4)
    boden(B, T, SOK, BOD, 2.5)

    def kletterwand(cx, cy, laenge, hoehe, achse, nach, z0=FB, felder=None):
        """Panelraster + Griffe. `nach` = Richtung, in die die Wand schaut (+1/-1)."""
        nx = max(1, int(laenge/2.6)); nz = max(1, int(hoehe/2.0))
        for i in range(nx):
            for k in range(nz):
                t = -laenge/2 + (i + 0.5)*laenge/nx
                zz = z0 + (k + 0.5)*hoehe/nz
                m = PANEL[(i + k*3) % 4]
                if achse == 'x':
                    box(cx + t, cy, zz, laenge/nx*0.98, 0.22, hoehe/nz*0.98, m)
                else:
                    box(cx, cy + t, zz, 0.22, laenge/nx*0.98, hoehe/nz*0.98, m)
                for g in range(4):
                    gx = t + (g % 2 - 0.5)*laenge/nx*0.46
                    gz = zz + (g//2 - 0.5)*hoehe/nz*0.44
                    gm = GRIFFE[(i + k + g) % 4]
                    if achse == 'x':
                        box(cx + gx, cy + nach*0.18, gz, 0.16, 0.14, 0.11, gm)
                    else:
                        box(cx + nach*0.18, cy + gx, gz, 0.14, 0.16, 0.11, gm)

    # Kletterwaende: Rueckwand, -x-Wand, hinterer Teil der +x-Wand
    kletterwand(0, -T/2 + 0.34, B - 1.0, 11.4, 'x', +1)
    kletterwand(-B/2 + 0.34, -1.0, T - 3.0, 11.4, 'y', +1)
    kletterwand(B/2 - 0.34, -5.0, 8.0, 11.4, 'y', -1)
    # Ueberhang-Sektor an der Rueckwand
    for i in range(5):
        o = box(-6.0 + i*2.5, -T/2 + 1.35, FB + 8.60, 2.44, 2.60, 0.22, PANEL[i % 4])
        o.rotation_euler[0] = 0.42
        for g in range(3):
            gb = box(-6.0 + i*2.5 + (g - 1)*0.75, -T/2 + 1.62, FB + 8.30, 0.16, 0.14, 0.12,
                     GRIFFE[(i + g) % 4])
            gb.rotation_euler[0] = 0.42
    # Freistehender Boulderblock
    box(3.0, 2.0, FB + 1.60, 5.6, 4.6, 3.20, P2)
    box(3.0, 2.0, FB + 3.36, 6.2, 5.2, 0.32, P4)
    for i in range(5):
        for k in range(4):
            box(3.0 - 2.2 + i*1.1, -0.34, FB + 0.55 + k*0.72, 0.16, 0.14, 0.11,
                GRIFFE[(i + k) % 4])
            box(3.0 - 2.2 + i*1.1, 4.34, FB + 0.55 + k*0.72, 0.16, 0.14, 0.11,
                GRIFFE[(i + k + 2) % 4])
    for k in range(4):
        box(0.14, 2.0 - 1.5 + k*1.0, FB + 1.10 + k*0.55, 0.14, 0.16, 0.11, GRIFFE[k % 4])
        box(5.86, 2.0 - 1.5 + k*1.0, FB + 1.10 + k*0.55, 0.14, 0.16, 0.11, GRIFFE[(k+1) % 4])
    # Bouldermatten
    for k in range(9):
        box(-11.0 + k*2.6, -T/2 + 2.0, FB + 0.20, 2.5, 2.4, 0.40, MAT1 if k % 2 else MAT2)
    for k in range(5):                              # ab y=-5.0, sonst ueberlappen sie
        box(-B/2 + 1.9, -5.0 + k*2.6, FB + 0.20, 2.4, 2.5, 0.40, MAT2 if k % 2 else MAT1)
    box(3.0, 2.0, FB + 0.20, 9.4, 8.4, 0.40, MAT1)
    for k in range(2):                              # weiter noerdlich laege der Treppenlauf
        box(B/2 - 1.9, -5.6 + k*2.6, FB + 0.20, 2.4, 2.5, 0.40, MAT2)
    # Sicherungsseile mit Umlenkung ganz oben
    for i in range(8):
        px = -10.5 + i*3.0
        box(px, -T/2 + 0.75, FB + 11.62, 0.30, 0.60, 0.14, STAH)
        zyl(px - 0.10, -T/2 + 1.05, FB + 5.90, 0.022, 11.30, SEIL, 6)
        zyl(px + 0.10, -T/2 + 1.30, FB + 6.20, 0.022, 10.70, SEIL, 6)
        box(px, -T/2 + 1.18, FB + 0.52, 0.22, 0.22, 0.24, GR3)
    for i in range(4):
        py = -6.0 + i*3.0
        box(-B/2 + 0.75, py, FB + 11.62, 0.60, 0.30, 0.14, STAH)
        zyl(-B/2 + 1.05, py, FB + 5.90, 0.022, 11.30, SEIL, 6)
    # Empfang (rechts vom mittleren Wandpfeiler) + Schuhregal an der -x-Seite
    box(9.0, 7.2, FB + 0.50, 5.2, 1.0, 1.00, HOLZ)
    box(9.0, 7.2, FB + 1.05, 5.6, 1.3, 0.10, CHR)
    box(9.0, 8.4, FB + 1.50, 5.2, 0.30, 2.80, W)
    box(9.0, 8.22, FB + 2.10, 3.4, 0.10, 0.90, LOGO)
    for k in range(4):
        box(-9.6, 8.9, FB + 0.30 + k*0.52, 4.0, 0.80, 0.06, HOLZ)
    for sx in (-11.5, -7.7):
        box(sx, 8.9, FB + 0.95, 0.08, 0.80, 1.90, HOLZ)
    bank(0.0, 7.4, FB, 4.0, HOLZ, STAH, 'x', True)          # vor dem Mittelpfeiler
    bank(-5.0, 6.0, FB, 3.0, HOLZ, STAH, 'x', True)
    # Cafe-Galerie ueber dem Eingangsbereich (Stuetzen NEBEN den Portalen)
    GZ = 4.40
    box(0, 7.5, GZ - 0.16, 23.0, 4.0, 0.32, HOLZ)
    for (sx, sy) in ((-9.7, 9.2), (0.0, 9.2), (9.7, 9.2), (-9.7, 5.9), (9.7, 5.9)):
        box(sx, sy, (FB + GZ - 0.32)/2, 0.26, 0.26, GZ - 0.32 - FB, STAH)
    gelaender(-11.5, 9.6, 5.5, GZ, CHR, 1.05, 'x')          # Treppenkopf bleibt offen
    gelaender(5.5, 9.5, -11.5, GZ, CHR, 1.05, 'y')
    gelaender(5.5, 9.5, 11.5, GZ, CHR, 1.05, 'y')
    treppe(10.6, -1.30, FB, 1.50, GZ - FB, HOLZ, CHR, 0.171, 0.28, richtung=1)
    for k in range(4):
        zyl(-8.4 + k*3.4, 7.6, GZ + 0.36, 0.62, 0.06, HOLZ, 18)
        zyl(-8.4 + k*3.4, 7.6, GZ + 0.18, 0.10, 0.36, STAH, 10)
        for a in range(3):
            ang = math.tau*(a + 0.5)/3
            zyl(-8.4 + k*3.4 + math.cos(ang)*1.0, 7.6 + math.sin(ang)*1.0,
                GZ + 0.22, 0.16, 0.44, STAH, 10)
            zyl(-8.4 + k*3.4 + math.cos(ang)*1.0, 7.6 + math.sin(ang)*1.0,
                GZ + 0.47, 0.24, 0.08, MAT2, 12)
    # Huelle
    wand_mit_oeffnungen(0, T/2, B, d, H, AUS, 2, 3.2, 3.6)
    box(0, -T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, W)
    box(0, 0, H + 0.26, B + 1.2, T + 1.2, 0.52, AUS)
    fensterband(0, T/2, B - 5.0, d, FB + 6.60, 4.4, AUS, GLAS, 6, 'x')
    fensterband(B/2, 0, T - 6.0, d, FB + 9.20, 2.4, AUS, GLAS, 4, 'y')
    box(0, T/2 + 0.62, FB + 11.20, B - 8.0, 0.40, 1.60, AUS)
    box(0, T/2 + 0.86, FB + 11.20, B - 12.0, 0.20, 1.00, LOGO)
    box(0, T/2 + 1.9, FB + 4.40, B - 8.0, 3.4, 0.36, AUS)
    for sx in (-9.7, 9.7):
        zyl(sx, T/2 + 3.1, (FB + 4.22)/2, 0.22, 4.22 - FB, STAH, 12)
    for i in range(4):
        box(-9.0 + i*6.0, 0, H - 0.24, 0.44, T - 4.0, 0.16, NEON)
    for i in range(3):
        box(-6.0 + i*6.0, -2.0, H - 0.10, 2.4, 9.0, 0.22, GLAS)     # Oberlichter
    export("th19_kletterhalle", 0.018, 2)


# ================================================================ 5) Tennishalle
def tennishalle():
    """38x26 m: 2 Plaetze mit Linien und Netzen, Tonnendach, Zuschauertribuene."""
    neu()
    AUS = mat("TennFassade",(0.72,0.70,0.64), 0.78)
    W   = mat("TennWand",   (0.80,0.78,0.72), 0.82)
    SOK = mat("Sockel",     (0.46,0.46,0.44), 0.90)
    BOD = mat("Hallenboden",(0.24,0.42,0.36), 0.72)
    PLAT= mat("Platzbelag", (0.16,0.34,0.58), 0.65)
    RAND= mat("Auslauf",    (0.30,0.56,0.46), 0.68)
    LIN = mat("Linie",      (0.96,0.97,0.96), 0.50)
    NETZ= mat("Netz",       (0.14,0.15,0.18), 0.80, 0.0, None, 1.3, 0.55)
    BAND= mat("Netzband",   (0.96,0.97,0.96), 0.60)
    STAH= mat("Stahl",      (0.48,0.50,0.54), 0.35, 0.45)
    CHR = mat("Chrom",      (0.74,0.77,0.80), 0.20, 0.55)
    HOLZ= mat("Holz",       (0.68,0.50,0.28), 0.62)
    SIT1= mat("Sitz1",      (0.22,0.46,0.72), 0.60)
    SIT2= mat("Sitz2",      (0.92,0.72,0.18), 0.60)
    TRENN=mat("Trennnetz",  (0.20,0.30,0.28), 0.80, 0.0, None, 1.3, 0.45)
    DACH= mat("Dachhaut",   (0.66,0.64,0.58), 0.62)
    GLAS= mat("Glas",       (0.64,0.80,0.88), 0.12, 0.10, None, 1.3, 0.40)
    BALL= mat("Ball",       (0.85,0.92,0.20), 0.60)
    NEON= mat("Licht",      (1.0,0.98,0.90), 0.25, 0.0, (1.0,0.96,0.88), 1.9)
    LOGO= mat("Logo",       (0.95,0.55,0.10), 0.30, 0.0, (1.0,0.52,0.08), 2.0)

    B, T, H, d = 38.0, 26.0, 9.0, 0.55
    CL, CW = 23.77, 8.23                     # Einzelfeld
    boden(B, T, SOK, BOD, 3.0)

    def platz(cy):
        box(0, cy, FB + 0.03, CL + 4.0, CW + 2.2, 0.04, RAND)      # Belagfeld
        box(0, cy, FB + 0.06, CL, CW, 0.03, PLAT)
        L = 0.06
        for s in (-1, 1):                                          # Grundlinien
            box(s*CL/2, cy, FB + 0.085, L, CW, 0.02, LIN)
            box(0, cy + s*CW/2, FB + 0.085, CL, L, 0.02, LIN)      # Seitenlinien
            box(s*6.40, cy, FB + 0.085, L, CW, 0.02, LIN)          # Aufschlaglinien
            box(s*(CL/2 - 0.10), cy, FB + 0.085, 0.20, L, 0.02, LIN)   # Mittelmarke
        box(0, cy, FB + 0.085, 12.80, L, 0.02, LIN)                # Mittellinie
        # Netz 0.914 m Mitte, 1.07 m an den Pfosten
        for s in (-1, 1):
            zyl(0, cy + s*(CW/2 + 0.914), FB + 0.585, 0.06, 1.17, STAH, 12)
            zyl(0, cy + s*(CW/2 + 0.914), FB + 1.19, 0.08, 0.06, CHR, 12)
        # Netzkante 0.914 m ueber dem Boden — Unterkante sitzt AUF dem Belag,
        # nicht darunter (sonst rutscht die Modell-Unterkante unter z=0).
        box(0, cy, FB + 0.457, 0.05, CW + 1.83, 0.914, NETZ)
        box(0, cy, FB + 0.914, 0.07, CW + 1.83, 0.07, BAND)
        box(0, cy, FB + 0.457, 0.10, 0.10, 0.914, BAND)           # Mittelgurt
        for k in range(6):
            box(0, cy + (k - 2.5)*1.9, FB + 0.457, 0.06, 0.05, 0.914, BAND)

    platz(5.3); platz(-5.3)
    # Trennnetz zwischen den Plaetzen
    for k in range(9):
        box(-16.0 + k*4.0, 0, FB + 2.00, 3.9, 0.05, 3.60, TRENN)
    for k in range(10):
        zyl(-18.0 + k*4.0, 0, FB + 2.00, 0.07, 3.90, STAH, 10)
    # Rueckfangnetze an den Stirnseiten
    for s in (-1, 1):
        box(s*(B/2 - 1.2), 0, FB + 2.20, 0.06, T - 3.0, 4.00, TRENN)
        for k in range(7):
            zyl(s*(B/2 - 1.2), -10.5 + k*3.5, FB + 2.20, 0.07, 4.20, STAH, 10)
    # Tribuene an der Rueckseite (3 Reihen a 0.90 = 2.7 m, endet bei -12.6; Wand -12.7)
    tribuene(0, -9.9, 28.0, 3, W, SIT1, SIT2, -1, 0.90, 0.44, 0.72, 2.0, FB)
    gelaender(-14.0, 14.0, -9.9, FB, CHR, 1.05, 'x')
    for k in range(3):
        bank(-15.6, -7.0 + k*7.0, FB, 3.4, HOLZ, STAH, 'y', True)
    for k in range(3):
        bank(15.6, -7.0 + k*7.0, FB, 3.4, HOLZ, STAH, 'y', True)
    # Schiedsrichterstuhl am Netz von Platz 1
    box(0, 11.2, FB + 1.05, 0.9, 0.9, 1.50, STAH)
    box(0, 11.2, FB + 1.86, 1.0, 1.0, 0.12, HOLZ)
    box(0, 11.62, FB + 2.28, 1.0, 0.10, 0.72, HOLZ)
    treppe(1.1, 12.30, FB, 0.7, 1.62, STAH, CHR, 0.18, 0.28, richtung=-1)
    # Ballkoerbe
    for k in range(2):
        px = 15.6
        for sy in (-6.0, 6.0):
            box(px, sy + k*1.2, FB + 0.44, 0.7, 0.7, 0.06, STAH)
            for dx in (-0.32, 0.32):
                for dy in (-0.32, 0.32):
                    box(px + dx, sy + k*1.2 + dy, FB + 0.22, 0.06, 0.06, 0.44, STAH)
            for i in range(3):
                for j in range(3):
                    kugel(px - 0.22 + i*0.22, sy + k*1.2 - 0.22 + j*0.22, FB + 0.52, 0.065,
                          BALL, 10, 6)
    # Huelle
    wand_mit_oeffnungen(0, T/2, B, d, H, AUS, 3, 3.4, 3.8)
    box(0, -T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, W)
    fensterband(0, T/2, B - 8.0, d, FB + 6.20, 2.0, AUS, GLAS, 7, 'x')
    for sx in (-B/2, B/2):
        fensterband(sx, 0, T - 6.0, d, FB + 6.20, 2.0, AUS, GLAS, 5, 'y')
    # Traufband als RING, sonst mauert es das Gewoelbe von innen zu
    platte_mit_loch(0, 0, H + 0.16, B + 0.9, T + 0.9, 0.32, B - 1.0, T - 1.0, AUS)
    dach = tonne(0, 0, H + 0.32, T/2, B + 1.2, DACH, 30, fuellen=False)
    dach.scale[2] = 0.45
    box(0, 0, H + 0.32 + (T/2)*0.45, B - 10.0, 2.6, 0.40, GLAS)
    for yy in (-9.0, -4.5, 0.0, 4.5, 9.0):                       # Lichtbaender AM Gewoelbe
        zz = H + 0.32 + math.sqrt(max(0.0, (T/2)**2 - yy*yy))*0.45 - 0.16
        box(0, yy, zz, B - 5.0, 0.42, 0.18, NEON)
    box(0, T/2 + 0.60, H*0.78, B - 12.0, 0.40, 1.80, AUS)
    box(0, T/2 + 0.84, H*0.78, B - 16.0, 0.20, 1.10, LOGO)
    box(0, T/2 + 1.9, FB + 4.00, B - 12.0, 3.4, 0.38, AUS)
    for sx in (-11.5, 11.5):
        zyl(sx, T/2 + 3.1, (FB + 3.81)/2, 0.22, 3.81 - FB, STAH, 12)
    export("th19_tennishalle", 0.018, 2)


# ================================================================ 6) Reithalle
def reithalle():
    """44x24 m: Sandplatz mit Bande, Hindernisse, Zuschauertribuene, grosses Tor."""
    neu()
    AUS = mat("ReitFassade",(0.56,0.44,0.32), 0.80)
    W   = mat("ReitWand",   (0.72,0.62,0.48), 0.82)
    SOK = mat("Sockel",     (0.44,0.42,0.38), 0.90)
    BOD = mat("Umgang",     (0.46,0.44,0.40), 0.85)
    SAND= mat("Sand",       (0.80,0.70,0.50), 0.92)
    SAND2=mat("Sandspur",   (0.74,0.63,0.44), 0.92)
    BAN = mat("Bande",      (0.60,0.45,0.28), 0.72)
    BANK= mat("Bandenkante",(0.34,0.28,0.20), 0.65)
    HOLZ= mat("Holz",       (0.68,0.50,0.28), 0.62)
    DUNK= mat("Balken",     (0.36,0.26,0.16), 0.72)
    STAH= mat("Stahl",      (0.48,0.50,0.54), 0.35, 0.45)
    CHR = mat("Chrom",      (0.74,0.77,0.80), 0.20, 0.55)
    ROT = mat("Stange rot", (0.86,0.22,0.18), 0.55)
    BLAU= mat("Stange blau",(0.20,0.42,0.80), 0.55)
    WEIS= mat("Stange weiss",(0.94,0.94,0.92), 0.55)
    GRUE= mat("Stange gruen",(0.24,0.66,0.36), 0.55)
    SIT1= mat("Sitz1",      (0.44,0.20,0.16), 0.60)
    SIT2= mat("Sitz2",      (0.72,0.58,0.24), 0.60)
    DACH= mat("Dachhaut",   (0.40,0.34,0.30), 0.72)
    GLAS= mat("Glas",       (0.64,0.80,0.88), 0.12, 0.10, None, 1.3, 0.40)
    SPIE= mat("Spiegel",    (0.80,0.85,0.90), 0.10, 0.25)
    NEON= mat("Licht",      (1.0,0.97,0.88), 0.25, 0.0, (1.0,0.95,0.86), 1.9)
    LOGO= mat("Logo",       (0.95,0.80,0.30), 0.35, 0.0, (1.0,0.78,0.24), 1.8)

    B, T, H, d = 44.0, 24.0, 6.0, 0.5
    AY0, AY1 = -7.6, 11.4                    # Sandplatz in y
    AX = 21.4                                # halbe Sandplatz-Breite
    ACY, ACT = (AY0 + AY1)/2, AY1 - AY0
    boden(B, T, SOK, BOD, 3.0)
    box(0, ACY, FB + 0.05, 2*AX, ACT, 0.10, SAND)
    for k in range(9):                       # Hufspuren / Abziehmuster
        box(0, AY0 + 1.0 + k*2.2, FB + 0.11, 2*AX - 1.6, 0.55, 0.02, SAND2)
    # Bande rund um den Sandplatz, Torluecke bei x=0 auf der Eingangsseite
    for s in (-1, 1):
        box(s*(AX + 0.12), ACY, FB + 0.65, 0.24, ACT + 0.5, 1.30, BAN)
        box(s*(AX + 0.12), ACY, FB + 1.34, 0.30, ACT + 0.5, 0.14, BANK)
    box(0, AY0 - 0.12, FB + 0.65, 2*AX + 0.5, 0.24, 1.30, BAN)
    box(0, AY0 - 0.12, FB + 1.34, 2*AX + 0.5, 0.30, 0.14, BANK)
    for s in (-1, 1):
        L = AX - 2.6
        box(s*(AX + 2.6)/2 + s*0.0, AY1 + 0.12, FB + 0.65, L, 0.24, 1.30, BAN)
        box(s*(AX + 2.6)/2, AY1 + 0.12, FB + 1.34, L, 0.30, 0.14, BANK)
    # Tor: Schiebetor-Fluegel offen daneben geparkt — VOR der Bande, nicht in der Wand
    box(-6.6, AY1 - 0.10, FB + 2.20, 5.0, 0.14, 4.40, HOLZ)
    for k in range(4):
        box(-6.6, AY1 - 0.20, FB + 0.60 + k*1.10, 4.8, 0.06, 0.14, DUNK)
    # Hindernisse
    def hindernis(px, py, hoehen, breite=3.8, farben=(ROT, WEIS, BLAU)):
        for s in (-1, 1):
            box(px, py + s*(breite/2 + 0.16), FB + 0.86, 0.30, 0.30, 1.52, HOLZ)
            box(px, py + s*(breite/2 + 0.16), FB + 0.14, 0.90, 0.34, 0.18, DUNK)
            for h in hoehen:
                box(px + 0.19, py + s*(breite/2 + 0.16), FB + h, 0.10, 0.34, 0.10, DUNK)
        for i, h in enumerate(hoehen):
            for k in range(6):
                zyl(px, py - breite/2 + 0.32 + k*(breite - 0.64)/5.0, FB + h + 0.07,
                    0.065, (breite - 0.64)/5.0*0.99,
                    farben[(i + k) % len(farben)], 10, rot=(math.pi/2, 0, 0))
    hindernis(-15.0, 2.0, (0.62, 0.98))
    hindernis(-7.0, 7.0, (0.72, 1.10), 3.8, (BLAU, WEIS, GRUE))
    hindernis(1.0, -2.5, (0.55, 0.85, 1.15), 3.8, (GRUE, WEIS, ROT))
    hindernis(9.0, 5.0, (0.68, 1.05), 3.8, (WEIS, ROT, BLAU))
    hindernis(16.0, -1.0, (0.60, 0.95), 3.8, (GRUE, BLAU, WEIS))
    hindernis(17.6, 6.5, (0.75, 1.12), 3.8, (ROT, GRUE, WEIS))
    # Stangenlager an der Bande
    for k in range(5):
        zyl(-18.5, AY0 + 1.2, FB + 0.10 + k*0.15, 0.065, 3.6,
            (ROT, WEIS, BLAU, GRUE, WEIS)[k], 10, rot=(0, math.pi/2, 0))
    for s in (-1, 1):
        box(-18.5 + s*1.85, AY0 + 1.2, FB + 0.30, 0.20, 0.50, 0.60, DUNK)
    # Zuschauertribuene hinter der Bande (4 Reihen a 0.80 = 3.2 m, endet -11.7; Wand -11.75)
    tribuene(0, AY0 - 0.9, 30.0, 4, W, SIT1, SIT2, -1, 0.80, 0.44, 0.74, 2.2, FB)
    gelaender(-15.0, 15.0, AY0 - 0.9, FB, CHR, 1.05, 'x')
    for k in range(2):
        bank(-17.0 + k*34.0, AY0 - 2.6, FB, 4.0, HOLZ, STAH, 'x', True)
    # Dressurspiegel an den Stirnseiten (ueber der Bande)
    for s in (-1, 1):
        for k in range(4):
            box(s*(AX + 0.02), ACY - 4.5 + k*3.0, FB + 2.40, 0.06, 2.8, 1.90, SPIE)
    # Huelle
    wand_mit_tuer(0, T/2, B, d, H, AUS, 5.4, 4.8, 'x')
    box(0, -T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, W)
    fensterband(0, T/2, B - 14.0, d, FB + 5.10, 1.0, AUS, GLAS, 6, 'x')
    for sx in (-B/2, B/2):
        fensterband(sx, 0, T - 4.0, d, FB + 4.60, 1.5, AUS, GLAS, 6, 'y')
    # Traufband als RING — ein volles Brett wuerde den Dachstuhl von innen zumauern
    platte_mit_loch(0, 0, H + 0.14, B + 1.0, T + 1.0, 0.28, B - 1.2, T - 1.2, AUS)
    satteldach(B, T, H + 0.28, 3.60, DACH, AUS, 0.9, 0.34)
    # Dachstuhl: Sparren buendig unter der Dachhaut, Zugband + Firstsaeule.
    # (Die Dachunterseite laeuft von z=9.52 im First auf z=6.17 an der Traufe.)
    spw = math.hypot(T/2, 3.35)
    swi = math.atan2(3.35, T/2)
    for i in range(9):
        px = -20.0 + i*5.0
        box(px, 0, H + 0.40, 0.26, T - 0.6, 0.32, DUNK)            # Zugband
        box(px, 0, H + 1.95, 0.22, 0.22, 2.90, DUNK)               # Firstsaeule
        for s in (-1, 1):
            o = box(px, s*(T/4), 7.72, 0.22, spw, 0.24, DUNK)      # Sparren
            o.rotation_euler[0] = -s*swi
    for i in range(6):
        box(-18.0 + i*7.2, 0, H + 0.80, 0.40, T - 8.0, 0.18, NEON)
    box(0, T/2 + 0.58, H*0.86, B - 22.0, 0.36, 1.40, AUS)
    box(0, T/2 + 0.80, H*0.86, B - 26.0, 0.18, 0.85, LOGO)
    box(0, T/2 + 1.9, FB + 5.30, 12.0, 3.4, 0.34, AUS)
    for sx in (-5.4, 5.4):
        zyl(sx, T/2 + 3.1, (FB + 5.13)/2, 0.22, 5.13 - FB, DUNK, 12)
    export("th19_reithalle", 0.020, 2)


if __name__ == "__main__":
    print("Asset-Charge 16 (th19, Baeder + Sporthallen):")
    for fn in (schwimmbad, fitnessstudio, eishalle, kletterhalle, tennishalle, reithalle):
        fn()
    print("fertig")
