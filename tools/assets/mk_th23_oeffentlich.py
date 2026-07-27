# -*- coding: utf-8 -*-
"""Asset-Charge 17 (th23_*): BEGEHBARE OEFFENTLICHE PUBLIKUMSBAUTEN — Post, Bank,
Polizeiwache, Gericht, Arztpraxis, Apotheke.

Familienfreundlich: keine Waffen, keine Zellen, keine Gewaltdarstellung. Die
Polizeiwache ist ein freundlicher Publikumsbau mit Empfangsschalter, Wartebank
und Buerozeile hinter Glas.

Konventionen wie th5-th20:
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * Eingang liegt auf Blender +y  ->  in three.js -z (glTF dreht die Achsen).
  * Jede Oeffnung >= 2.6 m licht, Innenhoehe >= 4.0 m, ueberall ein Boden.
  * Aussensockel und Innenboden enden BEIDE auf `FB` -> keine Schwelle in der Tuer.
    (Das Gericht steht auf einem 1.10-m-Podium `FBG`, davor eine gerechnete Freitreppe.)
  * Fensterglas steht knapp VOR der Wandflaeche — sonst rendert das Haus fensterlos.
  * Decken buendig auf die Wandkrone (Unterkante = H), sonst klafft ein Himmelsspalt.
  * Stuetzen und Einbauten NEBEN die Durchgaenge (`oeffnungs_achsen()`).
  * Treppenlaengen rechnen: n = round(Hoehe/Steigung).
  * Metallic max 0.6 — hoeher rendert three.js ohne Environment-Map fast schwarz.
  * Publikumsmasse: Theke 1.10 m, Sitzhoehe 0.45 m, Tisch 0.75 m, Tuer >= 2.2 m.
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
        # glTF liest alphaMode aus blend_method -> sonst waere das Fensterglas dicht
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

def ring(x, y, z, R, r, m=None, seg=24, mseg=6, rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(location=(x,y,z), major_radius=R, minor_radius=r,
                                     major_segments=seg, minor_segments=mseg, rotation=rot)
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
FB  = 0.30   # Fussboden-Oberkante — Aussensockel UND Innenboden enden hier.
FBG = 1.10   # Gericht: Podium mit Freitreppe (Innenboden liegt hoeher).

def boden(B, T, m_sockel, m_boden, rand=2.0, h=FB):
    box(0, 0, h/2, B + rand, T + rand, h, m_sockel)     # Vorplatz/Sockel
    box(0, 0, h/2, B, T, h, m_boden)                    # Innenboden, buendig

def bodenmuster(cx, cy, B, T, z, m1, m2, feld=2.5):
    """Schachbrettbelag — ein einfarbiger Saal wirkt tot."""
    nx = max(1, int(B/feld)); ny = max(1, int(T/feld))
    for ix in range(nx):
        for iy in range(ny):
            if (ix + iy) % 2: continue
            box(cx - B/2 + (ix + 0.5)*B/nx, cy - T/2 + (iy + 0.5)*T/ny, z,
                B/nx*0.99, T/ny*0.99, 0.03, m2 if (ix) % 2 == 0 else m1)

def stufen_aussen(cx, y0, breite, hoehe, m, n=4, tritt=0.50):
    """Freitreppe vom Gelaende auf einen hohen Sockel — nach +y absteigend.
    n+1 Steigungen, Lauflaenge = n*tritt (gerechnet, nicht geschaetzt)."""
    for i in range(n):
        zt = hoehe * (n - i) / (n + 1.0)
        box(cx, y0 + (i + 0.5)*tritt, zt/2, breite, tritt, zt, m)

# ---------------------------------------------------------------- Wand-Helfer
def wand_mit_tuer(cx, cy, laenge, dicke, hoehe, m, tuer_b=2.4, tuer_h=3.2,
                  achse='x', tuer_off=0.0):
    """Wand mit durchgehender Tueroeffnung: links + rechts + Sturz (kein Boolean noetig)."""
    seite_l = (laenge - tuer_b)/2 + tuer_off
    seite_r = (laenge - tuer_b)/2 - tuer_off
    if achse == 'x':
        if seite_l > 0.01:
            box(cx + tuer_off - tuer_b/2 - seite_l/2, cy, hoehe/2, seite_l, dicke, hoehe, m)
        if seite_r > 0.01:
            box(cx + tuer_off + tuer_b/2 + seite_r/2, cy, hoehe/2, seite_r, dicke, hoehe, m)
        box(cx + tuer_off, cy, tuer_h + (hoehe-tuer_h)/2, tuer_b, dicke, hoehe-tuer_h, m)
    else:
        if seite_l > 0.01:
            box(cx, cy + tuer_off - tuer_b/2 - seite_l/2, hoehe/2, dicke, seite_l, hoehe, m)
        if seite_r > 0.01:
            box(cx, cy + tuer_off + tuer_b/2 + seite_r/2, hoehe/2, dicke, seite_r, hoehe, m)
        box(cx, cy + tuer_off, tuer_h + (hoehe-tuer_h)/2, dicke, tuer_b, hoehe-tuer_h, m)

def oeffnungs_achsen(laenge, n, off_b):
    """Mitten der n Oeffnungen und der n+1 Pfeiler — damit man Stuetzen und
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
    """Rahmen in der Wandebene, Glas 1.4x so tief -> es steht knapp VOR der Wand.
    Glas nach innen versetzt = fensterloses Haus (Fallstrick 3)."""
    for i in range(n):
        t = (i + 0.5)/n - 0.5
        if achse == 'x':
            box(cx + t*laenge, cy, zmit, laenge/n*0.62, dicke*1.2, hoehe, m_rahm)
            box(cx + t*laenge, cy, zmit, laenge/n*0.50, dicke*1.4, hoehe*0.80, m_glas)
        else:
            box(cx, cy + t*laenge, zmit, dicke*1.2, laenge/n*0.62, hoehe, m_rahm)
            box(cx, cy + t*laenge, zmit, dicke*1.4, laenge/n*0.50, hoehe*0.80, m_glas)

def giebel(cx, cy, z, breite, hoehe, dicke, m, achse='y'):
    """Dreieckiges Giebelprisma. achse='x': Dreieck spannt in x auf, Dicke in y."""
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
    """n = round(Hoehe/Steigung) — Lauflaenge RECHNEN, nicht schaetzen."""
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

# ---------------------------------------------------------------- Publikums-Moeblierung
def theke(cx, cy, laenge, tiefe, m_korpus, m_platte, achse='x', hoehe=1.10, z=FB, ueber=0.10):
    """Publikumstheke. Standardhoehe 1.10 m (Schalter), 0.75 m = Tisch."""
    if achse == 'x':
        box(cx, cy, z + hoehe/2, laenge, tiefe, hoehe, m_korpus)
        box(cx, cy, z + hoehe + 0.03, laenge + 2*ueber, tiefe + 2*ueber, 0.06, m_platte)
    else:
        box(cx, cy, z + hoehe/2, tiefe, laenge, hoehe, m_korpus)
        box(cx, cy, z + hoehe + 0.03, tiefe + 2*ueber, laenge + 2*ueber, 0.06, m_platte)

def schalterplatz(px, py, breite, m_korpus, m_platte, m_glas, m_rahm, m_mon, s=1, z=FB,
                  nummer=True):
    """Ein Schalterplatz: Theke 1.10 m, Trennscheibe MIT Durchreiche (0.25 m Spalt
    ueber der Platte) und Nummernanzeige. s=+1 -> Kundenseite liegt auf +y."""
    theke(px, py, breite, 1.00, m_korpus, m_platte, 'x', 1.10, z)
    b = breite*0.94
    box(px, py + s*0.44, z + 1.79, b, 0.05, 0.82, m_glas)          # Scheibe ueber der Luke
    for sx in (-b/2, b/2):
        box(px + sx, py + s*0.44, z + 1.70, 0.08, 0.10, 1.10, m_rahm)
    box(px, py + s*0.44, z + 2.28, b + 0.16, 0.10, 0.10, m_rahm)   # Riegel oben
    if nummer:
        box(px, py + s*0.46, z + 2.42, 0.80, 0.08, 0.34, m_mon)    # Nummernanzeige
    box(px + breite*0.30, py - s*0.16, z + 1.32, 0.42, 0.30, 0.36, m_mon)  # Bildschirm Personal

def stuhlreihe(cx, cy, n, m_rahm, m_pol, achse='x', pitch=0.60, z=FB, blick=1):
    """Reihe verschraubter Wartestuehle. Sitz 0.45 m, Lehne dahinter.
    blick=+1 -> die Reihe schaut nach +y (bzw. +x bei achse='y')."""
    L = n*pitch
    if achse == 'x':
        box(cx, cy, z + 0.20, L, 0.09, 0.09, m_rahm)
        for sx in (-L/2 + 0.30, L/2 - 0.30):
            box(cx + sx, cy, z + 0.09, 0.09, 0.54, 0.18, m_rahm)
        for i in range(n):
            px = cx - L/2 + (i + 0.5)*pitch
            box(px, cy, z + 0.33, 0.09, 0.09, 0.26, m_rahm)
            box(px, cy, z + 0.45, pitch*0.86, 0.48, 0.07, m_pol)
            box(px, cy - blick*0.245, z + 0.74, pitch*0.86, 0.07, 0.50, m_pol)
    else:
        box(cx, cy, z + 0.20, 0.09, L, 0.09, m_rahm)
        for sy in (-L/2 + 0.30, L/2 - 0.30):
            box(cx, cy + sy, z + 0.09, 0.54, 0.09, 0.18, m_rahm)
        for i in range(n):
            py = cy - L/2 + (i + 0.5)*pitch
            box(cx, py, z + 0.33, 0.09, 0.09, 0.26, m_rahm)
            box(cx, py, z + 0.45, 0.48, pitch*0.86, 0.07, m_pol)
            box(cx - blick*0.245, py, z + 0.74, 0.07, pitch*0.86, 0.50, m_pol)

def sitzbank(px, py, z, laenge, m_holz, m_stahl, achse='x', blick=1, lehne=True):
    """Sitzbank, Sitzhoehe 0.45. blick=+1 -> Lehne liegt auf -y (man schaut nach +y)."""
    if achse == 'x':
        box(px, py, z + 0.45, laenge, 0.44, 0.07, m_holz)
        for sx in (-laenge/2 + 0.35, laenge/2 - 0.35):
            box(px + sx, py, z + 0.22, 0.09, 0.42, 0.45, m_stahl)
        if lehne:
            box(px, py - blick*0.21, z + 0.80, laenge, 0.07, 0.40, m_holz)
            for sx in (-laenge/2 + 0.35, laenge/2 - 0.35):
                box(px + sx, py - blick*0.21, z + 0.63, 0.08, 0.08, 0.68, m_stahl)
    else:
        box(px, py, z + 0.45, 0.44, laenge, 0.07, m_holz)
        for sy in (-laenge/2 + 0.35, laenge/2 - 0.35):
            box(px, py + sy, z + 0.22, 0.42, 0.09, 0.45, m_stahl)
        if lehne:
            box(px - blick*0.21, py, z + 0.80, 0.07, laenge, 0.40, m_holz)
            for sy in (-laenge/2 + 0.35, laenge/2 - 0.35):
                box(px - blick*0.21, py + sy, z + 0.63, 0.08, 0.08, 0.68, m_stahl)

def buerostuhl(px, py, z, m_pol, m_stahl, blick=1):
    """Drehstuhl, Sitz 0.46 ueber Boden."""
    zyl(px, py, z + 0.05, 0.30, 0.08, m_stahl, 12)
    zyl(px, py, z + 0.26, 0.06, 0.36, m_stahl, 10)
    box(px, py, z + 0.47, 0.50, 0.50, 0.09, m_pol)
    box(px, py - blick*0.24, z + 0.78, 0.48, 0.08, 0.52, m_pol)

def stuhl(px, py, z, m_holz, m_pol, blick=1):
    """Einfacher Besucherstuhl, Sitz 0.45."""
    for dx in (-0.20, 0.20):
        for dy in (-0.20, 0.20):
            box(px + dx, py + dy, z + 0.21, 0.06, 0.06, 0.42, m_holz)
    box(px, py, z + 0.45, 0.50, 0.48, 0.07, m_pol)
    box(px, py - blick*0.22, z + 0.72, 0.48, 0.06, 0.46, m_pol)

def tisch(px, py, z, B, T, m_platte, m_bein, hoehe=0.75):
    box(px, py, z + hoehe - 0.03, B, T, 0.06, m_platte)
    for dx in (-B/2 + 0.14, B/2 - 0.14):
        for dy in (-T/2 + 0.14, T/2 - 0.14):
            box(px + dx, py + dy, z + (hoehe - 0.06)/2, 0.08, 0.08, hoehe - 0.06, m_bein)

def regal(cx, cy, laenge, hoehe, tiefe, n, m_korpus, achse='x', z=FB, m_ware=None, blick=1):
    """OFFENES Regal: Rueckwand + Wangen + Deckel + n Boeden. `blick` = Richtung, in
    die das Regal schaut. Ware steht VOR der Rueckwand — in einem massiven Korpus
    waere sie unsichtbar (derselbe Fehler wie Glas hinter der Wandflaeche)."""
    zk_max = z + hoehe - 0.45
    for k in range(n):
        zk = z + 0.30 + k*(hoehe - 0.75)/max(1, n - 1)
        if achse == 'x':
            box(cx, cy, zk, laenge - 0.16, tiefe*0.90, 0.05, m_korpus)
            if m_ware:
                nb = max(1, int((laenge - 0.5)/0.55))
                for i in range(nb):
                    box(cx - laenge/2 + 0.40 + i*0.55, cy + blick*0.07, zk + 0.18,
                        0.36, tiefe*0.52, 0.28, m_ware if (i + k) % 2 else m_korpus)
        else:
            box(cx, cy, zk, tiefe*0.90, laenge - 0.16, 0.05, m_korpus)
            if m_ware:
                nb = max(1, int((laenge - 0.5)/0.55))
                for i in range(nb):
                    box(cx + blick*0.07, cy - laenge/2 + 0.40 + i*0.55, zk + 0.18,
                        tiefe*0.52, 0.36, 0.28, m_ware if (i + k) % 2 else m_korpus)
    if achse == 'x':
        box(cx, cy - blick*(tiefe/2 - 0.05), z + hoehe/2, laenge, 0.10, hoehe, m_korpus)
        for sx in (-laenge/2 + 0.06, laenge/2 - 0.06):
            box(cx + sx, cy, z + hoehe/2, 0.12, tiefe, hoehe, m_korpus)
        box(cx, cy, z + hoehe - 0.04, laenge, tiefe, 0.08, m_korpus)
        box(cx, cy, z + 0.09, laenge - 0.16, tiefe*0.90, 0.18, m_korpus)
    else:
        box(cx - blick*(tiefe/2 - 0.05), cy, z + hoehe/2, 0.10, laenge, hoehe, m_korpus)
        for sy in (-laenge/2 + 0.06, laenge/2 - 0.06):
            box(cx, cy + sy, z + hoehe/2, tiefe, 0.12, hoehe, m_korpus)
        box(cx, cy, z + hoehe - 0.04, tiefe, laenge, 0.08, m_korpus)
        box(cx, cy, z + 0.09, tiefe*0.90, laenge - 0.16, 0.18, m_korpus)

def schrankwand(cx, cy, laenge, hoehe, nx, ny, m_korpus, m_front, m_griff,
                achse='x', tiefe=0.45, z=FB, blick=-1):
    """Raster aus Fronten — Schliessfachwand (Post) bzw. Schubladenwand (Apotheke).
    blick=-1: die Fronten zeigen nach -y (bzw. -x)."""
    if achse == 'x':
        box(cx, cy, z + hoehe/2, laenge, tiefe, hoehe, m_korpus)
        for ix in range(nx):
            for iy in range(ny):
                px = cx - laenge/2 + (ix + 0.5)*laenge/nx
                pz = z + (iy + 0.5)*hoehe/ny
                box(px, cy + blick*(tiefe/2 + 0.015), pz,
                    laenge/nx*0.88, 0.03, hoehe/ny*0.84, m_front)
                box(px, cy + blick*(tiefe/2 + 0.045), pz - hoehe/ny*0.24,
                    laenge/nx*0.34, 0.03, 0.045, m_griff)
    else:
        box(cx, cy, z + hoehe/2, tiefe, laenge, hoehe, m_korpus)
        for ix in range(nx):
            for iy in range(ny):
                py = cy - laenge/2 + (ix + 0.5)*laenge/nx
                pz = z + (iy + 0.5)*hoehe/ny
                box(cx + blick*(tiefe/2 + 0.015), py, pz,
                    0.03, laenge/nx*0.88, hoehe/ny*0.84, m_front)
                box(cx + blick*(tiefe/2 + 0.045), py, pz - hoehe/ny*0.24,
                    0.03, laenge/nx*0.34, 0.045, m_griff)

def kordel(punkte, m_pfost, m_seil, z=FB, hoehe=0.95):
    """Warteschlangen-Absperrung: Pfosten + gespanntes Seil."""
    for (x, y) in punkte:
        zyl(x, y, z + 0.02, 0.19, 0.04, m_pfost, 14)
        zyl(x, y, z + hoehe/2, 0.045, hoehe, m_pfost, 12)
        zyl(x, y, z + hoehe + 0.04, 0.075, 0.10, m_pfost, 12)
    for i in range(len(punkte) - 1):
        x0, y0 = punkte[i]; x1, y1 = punkte[i+1]
        L = math.hypot(x1 - x0, y1 - y0)
        if L < 0.05: continue
        # rot=(0,pi/2,0) legt die Achse auf x, rotation_euler[2] dreht sie in die Richtung
        o = zyl((x0+x1)/2, (y0+y1)/2, z + hoehe - 0.09, 0.032, L, m_seil, 8,
                rot=(0, math.pi/2, 0))
        o.rotation_euler[2] = math.atan2(y1 - y0, x1 - x0)

def pflanze(px, py, z, m_topf, m_gruen, h=1.5):
    zyl(px, py, z + 0.24, 0.32, 0.48, m_topf, 14)
    zyl(px, py, z + 0.48 + h*0.25, 0.05, h*0.5, m_topf, 8)
    for (dx, dy, dz, r) in ((0.0, 0.0, h*0.72, 0.50), (0.28, 0.12, h*0.56, 0.32),
                            (-0.24, -0.16, h*0.60, 0.30)):
        kugel(px + dx, py + dy, z + 0.48 + dz, r, m_gruen, 12, 7)

def tuerfluegel(px, py, z, breite, hoehe, m_blatt, m_griff, achse='x', seite=1, auf=1):
    """Offen stehendes Tuerblatt (90 Grad) — man sieht in den Raum hinein.
    achse='x': Wand laeuft in x, das Blatt steht in y nach `auf`."""
    if achse == 'x':
        box(px + seite*(breite/2 - 0.02), py + auf*breite/2, z + hoehe/2,
            0.05, breite, hoehe, m_blatt)
        box(px + seite*(breite/2 - 0.02) + 0.06, py + auf*(breite - 0.16), z + 1.05,
            0.05, 0.12, 0.04, m_griff)
    else:
        box(px + auf*breite/2, py + seite*(breite/2 - 0.02), z + hoehe/2,
            breite, 0.05, hoehe, m_blatt)
        box(px + auf*(breite - 0.16), py + seite*(breite/2 - 0.02) + 0.06, z + 1.05,
            0.12, 0.05, 0.04, m_griff)

def deckenlicht(B, T, z, m, n=4, achse='x', laenge=None, breite=0.36):
    """Leuchtenreihe knapp unter der Decke."""
    L = laenge if laenge else T*0.78
    for i in range(n):
        if achse == 'x':
            box(-B/2 + (i + 0.5)*B/n, 0, z, breite, L, 0.12, m)
        else:
            box(0, -T/2 + (i + 0.5)*T/n, z, L, breite, 0.12, m)


# ================================================================ 1) Post
def post():
    """28x20 m: Schalterhalle mit 5 Schaltern, Paketannahme, Schliessfachwand,
    Wartebereich mit Stuhlreihen, Briefmarkenautomaten, Vordach."""
    neu()
    AUS = mat("PostFassade", (0.94,0.78,0.10), 0.55)
    SCHW= mat("PostBand",    (0.14,0.14,0.16), 0.60)
    W   = mat("PostWand",    (0.96,0.95,0.90), 0.85)
    AUS2= mat("PostWandHell",(0.93,0.90,0.74), 0.80)   # Aussenhaut der 3 anderen Seiten
    SOK = mat("Sockel",      (0.44,0.44,0.46), 0.90)
    BOD = mat("Terrazzo",    (0.76,0.74,0.70), 0.55)
    BOD2= mat("Terrazzo2",   (0.63,0.61,0.58), 0.55)
    HOLZ= mat("Theke",       (0.58,0.40,0.22), 0.55)
    PLAT= mat("Thekenplatte",(0.88,0.86,0.82), 0.35)
    STAH= mat("Stahl",       (0.54,0.56,0.60), 0.40, 0.45)
    CHR = mat("Chrom",       (0.74,0.76,0.80), 0.22, 0.55)
    GLAS= mat("Glas",        (0.68,0.82,0.90), 0.10, 0.0, None, 1.3, 0.42)
    ROT = mat("Akzent",      (0.82,0.16,0.14), 0.55)
    POL = mat("Polster",     (0.20,0.34,0.56), 0.70)
    KART= mat("Karton",      (0.74,0.58,0.36), 0.80)
    MON = mat("Anzeige",     (0.08,0.14,0.20), 0.25, 0.0, (0.28,0.72,1.0), 1.8)
    LED = mat("Deckenlicht", (1.0,0.96,0.88), 0.25, 0.0, (1.0,0.95,0.86), 1.9)
    LOGO= mat("Logo",        (1.0,0.86,0.12), 0.30, 0.0, (1.0,0.82,0.08), 2.0)
    GRUE= mat("Blatt",       (0.16,0.42,0.20), 0.75)

    B, T, H, d = 28.0, 20.0, 5.0, 0.45
    boden(B, T, SOK, BOD, 2.5)
    bodenmuster(0, 0, B - 1.2, T - 1.2, FB + 0.02, BOD, BOD2, 2.6)

    oeff, pfl = oeffnungs_achsen(B, 2, 3.2)          # Portale bei x = -5.2 / +5.2
    wand_mit_oeffnungen(0, T/2, B, d, H, AUS, 2, 3.2, 3.6)
    box(0, -T/2, H/2, B, d, H, AUS2)                      # Aussenhaut ringsum in einem Ton
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, AUS2)
    box(0, 0, H + 0.22, B + 1.1, T + 1.1, 0.44, AUS)      # Decke buendig auf der Krone
    box(0, 0, H - 0.06, B - 0.9, T - 0.9, 0.12, W)        # helle Deckenuntersicht innen

    # Fenster: nur in den Wandpfeilern, NICHT ueber den Portalen (Vordach!)
    for px in (pfl[0], pfl[2]):
        fensterband(px, T/2, 5.6, d, FB + 2.5, 1.9, AUS, GLAS, 2, 'x')
    fensterband(0.0, T/2, 2.6, d, FB + 2.5, 1.9, AUS, GLAS, 1, 'x')
    for sx in (-B/2, B/2):
        fensterband(sx, 0, T - 5.0, d, FB + 3.6, 1.1, AUS, GLAS, 5, 'y')

    # Fassadenband, Dachschild, Vordach
    box(0, T/2 + 0.26, FB + 4.62, B, 0.22, 0.46, SCHW)   # ueber der Vordach-Oberkante
    box(0, -T/2 - 0.26, FB + 4.62, B, 0.22, 0.46, SCHW)    # Band laeuft rundum weiter
    for sx in (-B/2 - 0.26, B/2 + 0.26):
        box(sx, 0, FB + 4.62, 0.22, T, 0.46, SCHW)
    box(0, T/2 + 0.62, H + 0.55, 9.0, 0.30, 1.10, SCHW)
    box(0, T/2 + 0.80, H + 0.55, 7.4, 0.12, 0.66, LOGO)
    box(0, T/2 + 1.90, FB + 3.90, 20.0, 3.40, 0.34, AUS)   # Vordach 4.03-4.37
    for sx in (-8.6, 8.6):                                 # Stuetzen NEBEN den Portalen
        zyl(sx, T/2 + 3.30, (FB + 4.03)/2, 0.20, 4.03 - FB, CHR, 12)

    # ---- 5 Schalter an der Rueckwand, Kundenseite auf +y
    for px in (-10.4, -5.2, 0.0, 5.2, 10.4):
        schalterplatz(px, -7.2, 3.6, HOLZ, PLAT, GLAS, CHR, MON, 1)
        buerostuhl(px + 0.3, -8.5, FB, POL, STAH, -1)
    box(0, -9.50, FB + 1.10, B - 3.0, 0.55, 2.20, W)       # Regalwand hinter den Schaltern
    for k in range(10):
        box(-11.2 + k*2.5, -9.20, FB + 0.75 + (k % 3)*0.60, 1.5, 0.10, 0.32, KART)
    box(0, -9.72, FB + 3.30, 15.0, 0.16, 0.90, SCHW)       # Nummern-Anzeigetafel
    for k in range(5):
        box(-6.0 + k*3.0, -9.60, FB + 3.30, 2.2, 0.10, 0.52, MON)

    # ---- Paketannahme an der -x-Wand
    regal(-13.50, 0.0, 8.0, 2.40, 0.50, 4, W, 'y', FB, KART, 1)
    theke(-11.90, 0.0, 6.0, 1.10, HOLZ, PLAT, 'y', 0.95)
    box(-11.90, -2.00, FB + 1.06, 0.80, 0.80, 0.12, STAH)  # Paketwaage
    box(-11.90, -1.98, FB + 1.20, 0.55, 0.55, 0.16, KART)
    box(-11.90,  2.10, FB + 1.18, 0.60, 0.50, 0.12, MON)
    for k in range(4):                                     # Paketstapel
        box(-12.80, -5.20 + (k % 2)*0.95, FB + 0.25 + (k // 2)*0.50,
            0.80, 0.80, 0.48, KART)
    box(-12.70, 3.90, FB + 2.40, 0.14, 3.0, 0.70, SCHW)
    box(-12.55, 3.90, FB + 2.40, 0.08, 2.4, 0.42, LOGO)

    # ---- Schliessfachwand an der +x-Wand
    schrankwand(13.50, -1.0, 10.0, 2.30, 10, 6, STAH, PLAT, CHR, 'y', 0.45, FB, -1)
    box(13.60, -1.0, FB + 2.60, 0.30, 10.2, 0.30, SCHW)
    box(13.40, -1.0, FB + 2.60, 0.08, 8.0, 0.22, LOGO)

    # ---- Briefmarkenautomaten neben den Portalen (Front-Innenseite)
    for sx in (-12.0, 12.0):
        box(sx, 9.00, FB + 0.95, 1.10, 0.70, 1.90, STAH)
        box(sx, 8.64, FB + 1.30, 0.90, 0.06, 0.60, MON)
        box(sx, 8.62, FB + 0.98, 0.86, 0.12, 0.10, CHR)
        box(sx, 9.00, FB + 1.97, 1.16, 0.76, 0.14, LOGO)

    # ---- Wartebereich (Mittelachse hinter dem Pfeiler, Portale bleiben frei)
    for py in (1.60, 3.40):
        stuhlreihe(0.0, py, 10, STAH, POL, 'x', 0.60, FB, -1)
    stuhlreihe(-8.60, 5.20, 6, STAH, POL, 'x', 0.60, FB, -1)
    stuhlreihe( 8.60, 5.20, 6, STAH, POL, 'x', 0.60, FB, -1)
    tisch(-4.60, 7.00, FB, 2.0, 0.70, PLAT, STAH, 1.05)     # Stehpult zum Ausfuellen
    for k in range(3):
        box(-5.30 + k*0.7, 7.00, FB + 1.10, 0.25, 0.32, 0.02, W)
    tisch( 4.60, 7.00, FB, 2.0, 0.70, PLAT, STAH, 1.05)
    kordel([(-2.6, 0.4), (-2.6, -2.4), (2.6, -2.4), (2.6, 0.4)], CHR, ROT, FB, 0.95)
    for (px, py) in ((-12.4, 7.8), (12.4, 7.8), (12.4, -8.0)):
        pflanze(px, py, FB, HOLZ, GRUE, 1.5)

    deckenlicht(B, T, H - 0.24, LED, 4, 'x', T - 4.0)
    export("th23_post", 0.018, 2)


# ================================================================ 2) Bank
def bank():
    """30x22 m: Kassenhalle mit 4 Schaltern, 3 Beratungskabinen hinter Glas,
    Geldautomaten-Nische, Marmorboden, hohe Fenster, Tresortuer."""
    neu()
    AUS = mat("BankFassade", (0.80,0.76,0.66), 0.75)
    W   = mat("BankWand",    (0.91,0.89,0.83), 0.85)
    SOK = mat("Sockel",      (0.52,0.50,0.46), 0.90)
    MAR = mat("Marmor",      (0.87,0.86,0.83), 0.30)
    MAR2= mat("Marmor2",     (0.62,0.60,0.58), 0.32)
    HOLZ= mat("Nussbaum",    (0.32,0.20,0.12), 0.50)
    PLAT= mat("Tresenplatte",(0.90,0.88,0.84), 0.28)
    MESS= mat("Messing",     (0.72,0.58,0.24), 0.28, 0.55)
    STAH= mat("Stahl",       (0.52,0.54,0.58), 0.38, 0.45)
    GLAS= mat("Glas",        (0.66,0.80,0.90), 0.10, 0.0, None, 1.3, 0.40)
    GLA2= mat("Kabinenglas", (0.72,0.84,0.92), 0.08, 0.0, None, 1.3, 0.28)
    POL = mat("Polster",     (0.14,0.24,0.44), 0.70)
    TEPP= mat("Laeufer",     (0.20,0.30,0.50), 0.85)
    MON = mat("Bildschirm",  (0.08,0.14,0.20), 0.25, 0.0, (0.30,0.70,1.0), 1.7)
    LED = mat("Deckenlicht", (1.0,0.97,0.90), 0.25, 0.0, (1.0,0.96,0.88), 1.8)
    LOGO= mat("Schriftzug",  (0.90,0.78,0.36), 0.30, 0.0, (0.95,0.80,0.30), 1.6)
    GRUE= mat("Blatt",       (0.15,0.40,0.20), 0.75)

    B, T, H, d = 30.0, 22.0, 6.0, 0.50
    boden(B, T, SOK, MAR, 3.0)
    bodenmuster(0, 0, B - 1.4, T - 1.4, FB + 0.02, MAR, MAR2, 2.4)
    box(0, 3.0, FB + 0.035, 4.0, 14.0, 0.04, TEPP)          # Laeufer Tuer -> Kasse

    wand_mit_tuer(0, T/2, B, d, H, AUS, 3.6, 4.2)
    box(0, -T/2, H/2, B, d, H, AUS)                         # Aussenhaut ringsum gleich
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, AUS)
    box(0, 0, H + 0.25, B + 1.2, T + 1.2, 0.50, AUS)        # Decke buendig
    box(0, -T/2 - 0.15, FB + 0.45, B + 0.30, 0.30, 0.90, SOK)   # Sockelband, Tuer bleibt frei
    for sx in (-B/2 - 0.15, B/2 + 0.15):
        box(sx, 0, FB + 0.45, 0.30, T, 0.90, SOK)
    for sx in (-8.40, 8.40):
        box(sx, T/2 + 0.15, FB + 0.45, 13.2, 0.30, 0.90, SOK)
    box(0, 0, H - 0.32, B + 0.44, T + 0.44, 0.56, MAR2)     # Traufgesims

    # Hohe Fenster: vorn beidseits der Tuer, links vor der Halle, rechts ueber den Kabinen
    for sx in (-9.0, 9.0):
        fensterband(sx, T/2, 10.0, d, FB + 3.2, 3.4, AUS, GLAS, 3, 'x')
    fensterband(-B/2,  5.5, 8.0, d, FB + 3.2, 3.4, AUS, GLAS, 3, 'y')
    fensterband(-B/2, -9.2, 3.4, d, FB + 3.2, 3.4, AUS, GLAS, 1, 'y')
    fensterband( B/2,  0.0, 17.0, d, FB + 4.1, 1.8, AUS, GLAS, 5, 'y')

    # Portal aussen: Freitreppe, 2 Saeulen, Schriftband
    stufen_aussen(0, (T + 3.0)/2, 9.0, FB, SOK, 2, 0.45)
    for sx in (-3.4, 3.4):
        zyl(sx, T/2 + 1.30, (FB + 5.10)/2, 0.42, 5.10 - FB, AUS, 16)
        box(sx, T/2 + 1.30, 5.22, 1.10, 1.10, 0.24, AUS)      # sitzt auf dem Saeulenkopf 5.10
    box(0, T/2 + 1.30, 5.62, 8.6, 2.20, 0.55, AUS)
    box(0, T/2 + 0.34, H + 0.62, 12.0, 0.30, 1.10, AUS)
    box(0, T/2 + 0.52, H + 0.62, 10.0, 0.12, 0.66, LOGO)

    # ---- Kassentresen an der Rueckwand
    for px in (-8.4, -2.8, 2.8, 8.4):
        schalterplatz(px, -8.60, 4.2, HOLZ, PLAT, GLAS, MESS, MON, 1)
        buerostuhl(px + 0.4, -9.90, FB, POL, STAH, -1)
    box(0, -10.90, FB + 1.05, 22.0, 0.45, 2.10, W)          # Rueckbuffet
    for k in range(8):
        box(-8.4 + k*2.4, -10.65, FB + 1.55, 1.6, 0.08, 0.34, MAR2)
    box(0, -10.95, FB + 3.70, 14.0, 0.20, 0.80, HOLZ)
    box(0, -10.82, FB + 3.70, 11.0, 0.10, 0.46, LOGO)

    # Tresortuer als Schauobjekt (dekorativ, kein Zutritt noetig)
    box(-12.60, -10.72, FB + 1.60, 3.60, 0.30, 3.20, MAR2)
    zyl(-12.60, -10.50, FB + 1.60, 1.20, 0.34, STAH, 24, rot=(math.pi/2, 0, 0))
    zyl(-12.60, -10.32, FB + 1.60, 0.95, 0.10, MESS, 24, rot=(math.pi/2, 0, 0))
    ring(-12.60, -10.24, FB + 1.60, 0.42, 0.06, MESS, 20, 6, rot=(math.pi/2, 0, 0))
    for a in range(4):
        w = a*math.pi/4
        o = box(-12.60, -10.24, FB + 1.60, 0.88, 0.07, 0.07, MESS)
        o.rotation_euler[1] = w

    # ---- Geldautomaten-Nische an der -x-Wand
    for py in (-6.20, -0.80):
        box(-13.10, py, FB + 1.80, 3.30, 0.34, 3.60, W)
    box(-13.10, -3.50, FB + 3.78, 3.30, 5.40, 0.36, W)
    box(-13.10, -3.50, FB + 3.62, 3.00, 4.80, 0.10, LED)
    for py in (-5.20, -3.50, -1.80):
        box(-14.20, py, FB + 0.95, 1.00, 1.30, 1.90, STAH)
        box(-13.66, py, FB + 1.38, 0.06, 0.90, 0.60, MON)
        box(-13.64, py, FB + 1.02, 0.10, 0.80, 0.10, MESS)
        box(-13.66, py, FB + 1.86, 0.08, 1.10, 0.14, LED)
    box(-12.90, 2.60, FB + 1.20, 0.16, 2.40, 0.60, W)
    box(-12.78, 2.60, FB + 1.20, 0.08, 2.00, 0.40, LOGO)

    # ---- 3 Beratungskabinen hinter Glas an der +x-Seite
    for cy in (-5.5, 0.0, 5.5):
        wand_mit_tuer(9.80, cy, 4.00, 0.10, 3.30, GLA2, 1.10, 2.55, 'y', 1.10)
        for sy in (cy - 2.00, cy + 2.00):
            box(12.20, sy, FB + 1.50, 4.80, 0.10, 3.00, GLA2)
            box(12.20, sy, FB + 3.03, 4.90, 0.16, 0.10, STAH)
        box(9.80, cy, FB + 3.03, 0.16, 4.10, 0.10, STAH)
        for sy in (cy - 2.0, cy + 2.0):
            box(9.80, sy, FB + 1.50, 0.12, 0.12, 3.00, STAH)
        tisch(12.30, cy, FB, 1.70, 0.95, HOLZ, STAH, 0.75)
        box(12.30, cy + 0.10, FB + 0.80, 0.44, 0.30, 0.34, MON)
        buerostuhl(13.40, cy, FB, POL, STAH, -1)
        for sy in (-0.55, 0.55):
            stuhl(11.20, cy + sy, FB, HOLZ, POL, 1)
        box(14.40, cy, FB + 0.90, 0.44, 2.00, 1.80, HOLZ)
        box(11.90, cy - 1.90, FB + 2.55, 1.20, 0.08, 0.36, LOGO)

    # ---- Wartezone + Halle
    for sx in (-6.6, 6.6):
        for sy in (-3.4, 3.4):
            zyl(sx, sy, (FB + H)/2, 0.44, H - FB, MAR, 18)
            box(sx, sy, FB + 0.16, 1.10, 1.10, 0.32, MAR2)
            box(sx, sy, H - 0.22, 1.10, 1.10, 0.44, MAR2)
    sitzbank(-8.20, 4.60, FB, 4.6, HOLZ, MESS, 'x', -1, True)
    sitzbank(-8.20, 1.60, FB, 4.6, HOLZ, MESS, 'x',  1, True)
    tisch(-8.20, 3.10, FB, 1.80, 0.90, MAR, MESS, 0.46)
    stuhlreihe(-3.20, 8.20, 5, STAH, POL, 'x', 0.60, FB, -1)
    tisch(-12.60, 7.60, FB, 1.80, 0.70, PLAT, STAH, 1.05)     # Stehpult
    for (px, py) in ((-13.0, 10.0), (13.0, 9.6), (-4.6, -1.6), (4.6, -1.6)):
        pflanze(px, py, FB, HOLZ, GRUE, 1.6)

    for i in range(4):                                        # Deckenkassetten + Licht
        for j in range(3):
            box(-10.5 + i*7.0, -6.0 + j*6.0, H - 0.12, 6.0, 5.0, 0.16, W)
    deckenlicht(B, T, H - 0.30, LED, 5, 'x', T - 5.0)
    export("th23_bank", 0.018, 2)


# ================================================================ 3) Polizeiwache
def polizeiwache():
    """26x18 m: freundlicher Publikumsbau — Empfangstheke mit Wartebank,
    Buerozeile hinter Glas, Anschlagtafel, blaues Fassadenband, Kinderecke.
    Bewusst OHNE Zellen, Waffen oder Gewaltdarstellung."""
    neu()
    AUS = mat("WacheFassade", (0.74,0.76,0.79), 0.75)
    W   = mat("WacheWand",    (0.91,0.92,0.94), 0.85)
    SOK = mat("Sockel",       (0.46,0.47,0.50), 0.90)
    BOD = mat("Linoleum",     (0.44,0.48,0.54), 0.60)
    BOD2= mat("Linoleum2",    (0.36,0.40,0.46), 0.60)
    BLAU= mat("Polizeiblau",  (0.12,0.32,0.78), 0.35, 0.0, (0.10,0.30,0.90), 1.5)
    HOLZ= mat("Buche",        (0.68,0.52,0.30), 0.55)
    PLAT= mat("Thekenplatte", (0.88,0.88,0.86), 0.30)
    STAH= mat("Stahl",        (0.54,0.56,0.60), 0.38, 0.45)
    CHR = mat("Chrom",        (0.74,0.76,0.80), 0.22, 0.55)
    GLAS= mat("Glas",         (0.68,0.82,0.90), 0.10, 0.0, None, 1.3, 0.42)
    GLA2= mat("Bueroglas",    (0.72,0.85,0.92), 0.08, 0.0, None, 1.3, 0.26)
    POL = mat("Polster",      (0.16,0.26,0.46), 0.70)
    KORK= mat("Anschlagtafel",(0.66,0.48,0.26), 0.85)
    PAP = mat("Aushang",      (0.96,0.96,0.92), 0.80)
    MON = mat("Bildschirm",   (0.08,0.14,0.20), 0.25, 0.0, (0.28,0.70,1.0), 1.7)
    LED = mat("Deckenlicht",  (1.0,0.97,0.90), 0.25, 0.0, (1.0,0.96,0.88), 1.9)
    ROT = mat("Kinderecke",   (0.86,0.32,0.18), 0.65)
    GELB= mat("Kinderecke2",  (0.94,0.78,0.20), 0.65)
    GRUE= mat("Blatt",        (0.16,0.42,0.20), 0.75)

    B, T, H, d = 26.0, 18.0, 4.8, 0.45
    boden(B, T, SOK, BOD, 2.5)
    bodenmuster(0, 0, B - 1.2, T - 1.2, FB + 0.02, BOD, BOD2, 2.4)

    wand_mit_tuer(0, T/2, B, d, H, AUS, 3.2, 3.4)
    box(0, -T/2, H/2, B, d, H, AUS)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, AUS)
    box(0, 0, H + 0.22, B + 1.1, T + 1.1, 0.44, AUS)        # Decke buendig

    for sx in (-8.0, 8.0):                                   # Fenster neben der Tuer
        fensterband(sx, T/2, 8.0, d, FB + 2.3, 1.7, AUS, GLAS, 3, 'x')
    for sx in (-B/2, B/2):                                   # nur im vorderen Hallenteil
        fensterband(sx, 4.60, 6.4, d, FB + 2.3, 1.7, AUS, GLAS, 2, 'y')
    fensterband(0, -T/2, 18.0, d, FB + 3.3, 1.2, AUS, GLAS, 4, 'x')   # Licht fuer die Bueros

    # Blaues Fassadenband rundum + Dachschild + Vordach
    box(0, T/2 + 0.30, FB + 3.55, B, 0.24, 0.50, BLAU)
    box(0, -T/2 - 0.30, FB + 3.55, B, 0.24, 0.50, BLAU)
    for sx in (-B/2 - 0.30, B/2 + 0.30):
        box(sx, 0, FB + 3.55, 0.24, T, 0.50, BLAU)
    box(0, T/2 + 0.62, H + 0.50, 8.0, 0.30, 1.00, W)
    box(0, T/2 + 0.80, H + 0.50, 6.6, 0.12, 0.58, BLAU)
    box(0, T/2 + 1.70, FB + 3.95, 12.0, 3.00, 0.30, AUS)     # Vordach 4.10-4.40
    for sx in (-5.0, 5.0):
        zyl(sx, T/2 + 2.90, (FB + 4.10)/2, 0.18, 4.10 - FB, CHR, 12)
    for sx in (-2.4, 2.4):                                   # Blaulicht-Leuchten am Portal
        zyl(sx, T/2 + 0.34, FB + 3.05, 0.16, 0.40, BLAU, 12)

    # ---- Buerozeile hinter Glas (Rueckteil y = -8.8 .. -4.0)
    RAEUME = ((-8.62, 8.30,  2.02), (0.00, 8.66, 0.00), (8.62, 8.30, -2.02))
    for (cx, br, toff) in RAEUME:
        wand_mit_tuer(cx, -4.00, br, 0.14, H, GLA2, 1.10, 2.50, 'x', toff)
        for k in range(int(br/1.7)):                          # Sprossen, damit Glas liest
            box(cx - br/2 + (k + 0.5)*br/int(br/1.7), -4.00, FB + 1.65, 0.07, 0.18, 3.30, STAH)
        box(cx, -4.00, FB + 2.42, br, 0.20, 0.09, STAH)
        tisch(cx, -6.60, FB, 1.80, 0.90, HOLZ, STAH, 0.76)
        box(cx - 0.45, -6.55, FB + 0.98, 0.46, 0.32, 0.38, MON)
        box(cx + 0.55, -6.85, FB + 0.79, 0.42, 0.30, 0.03, PAP)
        buerostuhl(cx, -7.55, FB, POL, STAH, 1)
        box(cx, -8.50, FB + 0.95, 2.60, 0.45, 1.90, W)        # Aktenschrank
        for k in range(3):
            box(cx, -8.26, FB + 0.55 + k*0.58, 2.30, 0.06, 0.34, HOLZ if k % 2 else PAP)
        box(cx + (2.6 if cx < 0 else -2.6), -6.40, FB + 1.90, 0.06, 2.20, 1.30, KORK)
    for sx in (-4.40, 4.40):                                  # Trennwaende zwischen den Bueros
        box(sx, -6.40, H/2, 0.14, 4.75, H, W)

    # ---- Empfangstheke mit Wartebank
    theke(0, -1.60, 8.00, 1.10, HOLZ, PLAT, 'x', 1.10)
    box(-3.20, -1.60, FB + 0.42, 2.20, 1.30, 0.84, HOLZ)      # niedriger Rollstuhl-Platz
    box(-3.20, -1.60, FB + 0.87, 2.40, 1.50, 0.06, PLAT)
    box(2.60, -1.90, FB + 1.32, 0.46, 0.32, 0.38, MON)
    box(0.20, -1.30, FB + 1.18, 0.60, 0.20, 0.10, CHR)
    buerostuhl(1.60, -2.90, FB, POL, STAH, 1)
    buerostuhl(-1.60, -2.90, FB, POL, STAH, 1)
    box(0, -1.60, FB + 2.90, 6.0, 0.24, 0.60, W)              # abgehaengtes Schild
    box(0, -1.44, FB + 2.90, 4.6, 0.10, 0.36, BLAU)
    for sx in (-2.9, 2.9):
        zyl(sx, -1.60, FB + 3.75, 0.05, 1.10, CHR, 8)         # Abhaengung bis zur Decke

    for sx in (-5.60, 5.60):                                  # Wartestuehle, Tuerachse frei
        stuhlreihe(sx, 3.20, 6, STAH, POL, 'x', 0.60, FB, -1)
    sitzbank(-9.40, 6.60, FB, 4.40, HOLZ, STAH, 'x', -1, True)
    sitzbank( 9.40, 6.60, FB, 4.40, HOLZ, STAH, 'x', -1, True)

    # ---- Anschlagtafel, Infostaender, Wasserspender, Kinderecke
    box(-12.72, -1.50, FB + 1.75, 0.12, 4.20, 1.50, KORK)
    for k in range(8):
        box(-12.62, -3.20 + (k % 4)*1.00, FB + 1.42 + (k // 4)*0.70, 0.03, 0.62, 0.44, PAP)
    box(12.72, -1.50, FB + 1.75, 0.12, 4.20, 1.50, KORK)
    for k in range(6):
        box(12.62, -3.00 + (k % 3)*1.30, FB + 1.45 + (k // 3)*0.66, 0.03, 0.70, 0.48, PAP)
    box(11.90, 2.60, FB + 0.60, 0.50, 0.50, 1.20, W)          # Wasserspender
    zyl(11.90, 2.60, FB + 1.44, 0.17, 0.48, GLAS, 12)
    box(-11.60, 1.20, FB + 0.75, 0.50, 1.60, 1.50, STAH)      # Prospektstaender
    for k in range(4):
        box(-11.40, 1.20, FB + 0.55 + k*0.36, 0.10, 1.40, 0.26, PAP)
    box(-10.20, 8.20, FB + 0.03, 3.60, 2.60, 0.06, GELB)      # Kinderecke
    tisch(-10.20, 8.20, FB, 1.00, 1.00, ROT, STAH, 0.50)
    for (dx, dy) in ((-0.85, 0.0), (0.85, 0.0), (0.0, -0.85)):
        box(-10.20 + dx, 8.20 + dy, FB + 0.15, 0.36, 0.36, 0.30, ROT)
    for k in range(4):
        box(-11.60 + k*0.42, 6.90, FB + 0.16, 0.30, 0.30, 0.26, GELB if k % 2 else ROT)
    for (px, py) in ((11.80, 7.60), (-12.00, -3.40), (12.00, -3.40)):
        pflanze(px, py, FB, HOLZ, GRUE, 1.5)

    deckenlicht(B, T, H - 0.24, LED, 4, 'x', T - 4.0)
    export("th23_polizeiwache", 0.018, 2)


# ================================================================ 4) Gericht
def gericht():
    """34x26 m auf 1.10-m-Podium: Portikus mit 6 Saeulen und gerechneter Freitreppe,
    Foyer, Saal mit Richterbank, Zeugenstand, Parteitischen, Schranke und
    5 Reihen Zuschauerbaenken."""
    neu()
    AUS = mat("Werkstein",   (0.84,0.80,0.70), 0.75)
    W   = mat("GerichtWand", (0.90,0.87,0.80), 0.85)
    SOK = mat("Sockel",      (0.58,0.55,0.48), 0.90)
    BOD = mat("Steinboden",  (0.78,0.75,0.68), 0.45)
    BOD2= mat("Steinboden2", (0.56,0.53,0.48), 0.48)
    HOLZ= mat("Eiche",       (0.44,0.29,0.16), 0.55)
    HOL2= mat("Eiche2",      (0.30,0.19,0.10), 0.55)
    PLAT= mat("Pultplatte",  (0.52,0.35,0.20), 0.40)
    GOLD= mat("Messing",     (0.74,0.60,0.26), 0.28, 0.55)
    GLAS= mat("Glas",        (0.68,0.82,0.90), 0.10, 0.0, None, 1.3, 0.42)
    POL = mat("Polster",     (0.34,0.12,0.14), 0.75)
    STAH= mat("Stahl",       (0.52,0.54,0.58), 0.38, 0.45)
    PAP = mat("Akten",       (0.95,0.94,0.90), 0.80)
    LED = mat("Deckenlicht", (1.0,0.96,0.86), 0.25, 0.0, (1.0,0.95,0.84), 1.9)
    GRUE= mat("Blatt",       (0.16,0.42,0.20), 0.75)

    B, T, H, d = 34.0, 26.0, 9.5, 0.60
    boden(B, T, SOK, BOD, 9.0, FBG)                      # Podium 43 x 35, Oberkante 1.10
    bodenmuster(0, 0, B - 1.6, T - 1.6, FBG + 0.02, BOD, BOD2, 3.2)
    # Freitreppe: n=5 Steigungen auf 1.10 m, Lauflaenge 5*0.52 = 2.60 m (gerechnet)
    stufen_aussen(0, (T + 9.0)/2, 16.0, FBG, SOK, 5, 0.52)
    for sx in (-8.90, 8.90):
        box(sx, 18.80, FBG*0.36, 1.40, 2.80, FBG*0.72, SOK)

    oeff, pfl = oeffnungs_achsen(B, 2, 3.6)              # Portale bei x = -6.27 / +6.27
    wand_mit_oeffnungen(0, T/2, B, d, H, AUS, 2, 3.6, 5.0)
    box(0, -T/2, H/2, B, d, H, AUS)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, AUS)
    box(0, 0, H + 0.30, B + 1.6, T + 1.6, 0.60, AUS)     # Decke buendig auf der Krone

    # Hohe Fenster ueber dem Sockelpaneel (Paneel endet bei 3.70)
    for sx in (-B/2, B/2):
        fensterband(sx, -4.00, 15.0, d, FBG + 5.00, 3.00, AUS, GLAS, 4, 'y')
        fensterband(sx,  8.60,  6.0, d, FBG + 4.40, 3.00, AUS, GLAS, 2, 'y')
        box(sx + (0.42 if sx < 0 else -0.42), 0, FBG + 1.30, 0.30, T - 1.2, 2.60, HOLZ)

    # ---- Portikus: 6 Saeulen NEBEN den Portalen (x = +-3, +-9, +-15)
    for px in (-15.0, -9.0, -3.0, 3.0, 9.0, 15.0):
        box(px, 15.50, FBG + 0.20, 1.70, 1.70, 0.40, AUS)
        zyl(px, 15.50, (FBG + 9.20)/2, 0.62, 9.20 - FBG, AUS, 16)
        box(px, 15.50, 9.34, 1.50, 1.50, 0.28, AUS)
    box(0, 15.50, 9.80, 32.0, 3.40, 0.64, AUS)           # Architrav 9.48 - 10.12
    giebel(0, 15.50, 10.12, 32.0, 3.30, 3.40, AUS, 'x')  # Tympanon, First 13.42
    box(0, 14.00, 11.30, 20.0, 0.30, 0.90, AUS)
    box(0, 13.86, 11.30, 17.0, 0.10, 0.52, GOLD)

    # ---- Trennwand Foyer / Saal mit 5 m breitem Portal
    wand_mit_tuer(0, 4.20, B, 0.40, H, W, 5.00, 5.20)
    box(0, 4.20, FBG + 4.30, 5.60, 0.56, 0.30, HOLZ)

    # ---- Foyer (y 4.6 .. 12.7)
    theke(-10.00, 8.00, 6.00, 1.10, HOLZ, PLAT, 'x', 1.10, FBG)
    buerostuhl(-10.00, 7.10, FBG, POL, GOLD, 1)
    box(-10.00, 8.00, FBG + 2.60, 5.0, 0.30, 0.70, W)
    box(-10.00, 8.18, FBG + 2.60, 4.0, 0.10, 0.42, GOLD)
    sitzbank(9.60, 8.40, FBG, 5.20, HOLZ, GOLD, 'x',  1, True)
    sitzbank(9.60, 6.20, FBG, 5.20, HOLZ, GOLD, 'x', -1, True)
    for sx in (-3.60, 3.60):
        zyl(sx, 6.50, (FBG + H)/2, 0.50, H - FBG, W, 18)
        box(sx, 6.50, FBG + 0.18, 1.30, 1.30, 0.36, AUS)
        box(sx, 6.50, H - 0.24, 1.30, 1.30, 0.48, AUS)
    box(-16.30, 10.60, FBG + 1.90, 0.24, 3.20, 1.60, HOL2)     # Aushangtafel
    for k in range(6):
        box(-16.14, 9.50 + (k % 3)*1.10, FBG + 1.60 + (k // 3)*0.66, 0.04, 0.72, 0.48, PAP)
    zyl(16.30, 10.60, FBG + 3.20, 0.80, 0.16, GOLD, 24, rot=(0, math.pi/2, 0))   # Uhr
    for sx in (-15.40, 15.40):
        sitzbank(sx, 9.20, FBG, 5.00, HOLZ, GOLD, 'y', 1 if sx < 0 else -1, True)
    for (px, py) in ((-14.5, 5.6), (14.5, 5.6), (-13.6, 12.0), (13.6, 12.0)):
        pflanze(px, py, FBG, HOL2, GRUE, 1.7)

    # ---- Saal: Richterbank auf Podest
    box(0, -10.00, FBG + 0.28, 14.00, 3.00, 0.56, HOL2)
    box(0, -8.35, FBG + 0.14, 3.40, 0.30, 0.28, HOL2)          # Stufe aufs Podest
    theke(0, -10.40, 9.00, 1.40, HOLZ, PLAT, 'x', 1.15, FBG + 0.56)
    for k in range(5):
        box(-3.6 + k*1.8, -9.72, FBG + 1.20, 1.30, 0.10, 0.70, HOL2)
    for sx in (-2.60, 0.0, 2.60):
        buerostuhl(sx, -11.20, FBG + 0.56, POL, GOLD, 1)
    box(0, -12.55, FBG + 2.80, 17.00, 0.30, 5.40, HOLZ)        # Wandpaneel hinter der Bank
    for sx in (-6.0, 6.0):
        box(sx, -12.36, FBG + 2.80, 2.60, 0.10, 4.80, HOL2)
    zyl(0, -12.34, FBG + 4.30, 1.10, 0.14, GOLD, 24, rot=(math.pi/2, 0, 0))
    ring(0, -12.26, FBG + 4.30, 1.30, 0.09, GOLD, 24, 6, rot=(math.pi/2, 0, 0))
    for k in range(8):
        a = k*math.tau/8
        o = box(math.cos(a)*1.65, -12.30, FBG + 4.30 + math.sin(a)*1.65, 0.40, 0.07, 0.10, GOLD)
        o.rotation_euler[1] = -a

    # Zeugenstand, Protokollpult, Parteitische
    box(-6.40, -8.60, FBG + 0.16, 2.20, 1.80, 0.32, HOL2)
    theke(-6.40, -8.60, 1.90, 0.95, HOLZ, PLAT, 'x', 1.05, FBG + 0.32)
    buerostuhl(-6.40, -9.20, FBG + 0.32, POL, GOLD, 1)
    tisch(5.20, -8.50, FBG, 2.40, 1.05, HOLZ, HOL2, 0.78)
    box(5.20, -8.50, FBG + 0.80, 0.60, 0.44, 0.06, PAP)
    buerostuhl(5.20, -9.30, FBG, POL, GOLD, 1)
    for sx in (-4.80, 4.80):
        tisch(sx, -5.60, FBG, 4.40, 1.30, HOLZ, HOL2, 0.76)
        for k in (-1.3, 0.0, 1.3):
            stuhl(sx + k, -6.60, FBG, HOL2, POL, 1)
        box(sx - 1.4, -5.45, FBG + 0.79, 0.50, 0.36, 0.05, PAP)
        box(sx + 1.2, -5.45, FBG + 0.80, 0.42, 0.30, 0.07, PAP)

    # Schranke mit Durchlass auf der Mittelachse
    gelaender(-13.50, -1.60, -3.20, FBG, HOLZ, 1.05, 'x')
    gelaender(  1.60, 13.50, -3.20, FBG, HOLZ, 1.05, 'x')
    for sx in (-1.60, 1.60):
        box(sx, -3.20, FBG + 0.55, 0.16, 0.16, 1.10, HOLZ)

    # 5 Reihen Zuschauerbaenke, Mittelgang auf der Portalachse
    for py in (-1.90, -0.60, 0.70, 2.00, 3.10):
        for sx in (-6.90, 6.90):
            sitzbank(sx, py, FBG, 10.60, HOLZ, GOLD, 'x', -1, True)

    for i in range(4):                                          # Deckenkassetten
        for j in range(3):
            box(-12.0 + i*8.0, -8.0 + j*8.0, H - 0.14, 6.6, 6.6, 0.20, W)
    deckenlicht(B, T, H - 0.34, LED, 4, 'x', T - 6.0)
    for (cx, cy) in ((0.0, -7.0), (0.0, 8.0)):                  # Pendelleuchten
        zyl(cx, cy, H - 0.90, 0.07, 1.60, GOLD, 8)
        zyl(cx, cy, H - 1.78, 1.30, 0.16, GOLD, 24)
        zyl(cx, cy, H - 1.92, 1.10, 0.14, LED, 24)
    export("th23_gericht", 0.020, 2)


# ================================================================ 5) Arztpraxis
def arztpraxis():
    """22x16 m: Empfang, Wartezimmer mit Stuhlreihen und Kinderecke, heller Flur,
    3 Behandlungsraeume hinter Tueren (Liege, Schreibtisch, Schrank, Waschbecken)."""
    neu()
    AUS = mat("PraxisFassade", (0.88,0.88,0.86), 0.75)
    W   = mat("PraxisWand",    (0.96,0.96,0.94), 0.85)
    SOK = mat("Sockel",        (0.52,0.52,0.54), 0.90)
    BOD = mat("Hellboden",     (0.80,0.78,0.72), 0.55)
    BOD2= mat("Hellboden2",    (0.70,0.72,0.68), 0.55)
    HOLZ= mat("Ahorn",         (0.76,0.62,0.40), 0.55)
    PLAT= mat("Arbeitsplatte", (0.90,0.90,0.88), 0.30)
    STAH= mat("Stahl",         (0.60,0.62,0.66), 0.35, 0.45)
    CHR = mat("Chrom",         (0.76,0.78,0.82), 0.20, 0.55)
    GLAS= mat("Glas",          (0.70,0.84,0.92), 0.10, 0.0, None, 1.3, 0.42)
    POL = mat("Polster",       (0.18,0.46,0.44), 0.70)
    POL2= mat("Liegenpolster", (0.24,0.54,0.52), 0.60)
    BLAU= mat("Praxisblau",    (0.16,0.40,0.72), 0.45, 0.0, (0.14,0.36,0.80), 1.3)
    PAP = mat("Papier",        (0.97,0.97,0.94), 0.80)
    MON = mat("Bildschirm",    (0.08,0.14,0.20), 0.25, 0.0, (0.30,0.70,1.0), 1.7)
    LED = mat("Deckenlicht",   (1.0,0.98,0.94), 0.22, 0.0, (1.0,0.98,0.94), 2.0)
    ROT = mat("Kinderrot",     (0.88,0.34,0.20), 0.65)
    GELB= mat("Kindergelb",    (0.94,0.80,0.22), 0.65)
    GRUE= mat("Blatt",         (0.16,0.44,0.22), 0.75)

    B, T, H, d = 22.0, 16.0, 4.2, 0.40
    boden(B, T, SOK, BOD, 2.0)
    bodenmuster(0, 0, B - 1.0, T - 1.0, FB + 0.02, BOD, BOD2, 2.1)

    wand_mit_tuer(0, T/2, B, d, H, AUS, 2.6, 3.0)
    box(0, -T/2, H/2, B, d, H, AUS)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, AUS)
    box(0, 0, H + 0.20, B + 1.0, T + 1.0, 0.40, AUS)          # Decke buendig

    for sx in (-7.0, 7.0):
        fensterband(sx, T/2, 7.0, d, FB + 2.20, 1.70, AUS, GLAS, 3, 'x')
    for sx in (-B/2, B/2):
        fensterband(sx,  4.60, 6.0, d, FB + 2.20, 1.70, AUS, GLAS, 2, 'y')
        fensterband(sx, -4.60, 5.6, d, FB + 2.20, 1.70, AUS, GLAS, 2, 'y')
    fensterband(0, -T/2, 19.2, d, FB + 2.90, 1.10, AUS, GLAS, 6, 'x')   # Licht in die Raeume

    box(0, T/2 + 0.28, FB + 3.30, B, 0.20, 0.40, BLAU)        # Fassadenband 3.40-3.80
    box(0, T/2 + 1.40, FB + 3.72, 8.0, 2.60, 0.28, AUS)       # Vordach 3.88-4.16
    for sx in (-3.2, 3.2):
        zyl(sx, T/2 + 2.40, (FB + 3.88)/2, 0.16, 3.88 - FB, CHR, 12)
    box(0, T/2 + 0.55, H + 0.45, 6.0, 0.26, 0.90, W)          # Dachschild
    box(0, T/2 + 0.70, H + 0.45, 4.6, 0.08, 0.60, BLAU)
    box(0, T/2 + 0.76, H + 0.45, 0.22, 0.06, 0.62, W)         # weisses Kreuz
    box(0, T/2 + 0.76, H + 0.45, 0.62, 0.06, 0.22, W)

    # ---- Behandlungsraeume (y -7.8 .. -1.0), Tuerwand + Trennwaende
    RAEUME = ((-7.19, 7.22,  1.79), (0.00, 6.84, 0.00), (7.19, 7.22, -1.79))
    for (cx, br, toff) in RAEUME:
        wand_mit_tuer(cx, -1.00, br, 0.22, H, W, 1.05, 2.30, 'x', toff)
        tuerfluegel(cx + toff, -1.00, FB, 1.00, 2.28, W, CHR, 'x', -1, 1)
        box(cx + toff, -1.00, FB + 2.55, 1.30, 0.26, 0.34, BLAU)      # Raumschild
        # Untersuchungsliege
        box(cx - 1.60, -5.00, FB + 0.33, 0.78, 1.96, 0.62, W)
        box(cx - 1.60, -5.00, FB + 0.70, 0.84, 2.02, 0.12, POL2)
        box(cx - 1.60, -5.86, FB + 0.83, 0.68, 0.36, 0.14, PAP)
        zyl(cx - 0.55, -5.90, FB + 0.24, 0.20, 0.44, STAH, 12)        # Rollhocker
        zyl(cx - 0.55, -5.90, FB + 0.49, 0.26, 0.10, POL, 14)
        # Schreibtisch + Stuhl + Schrank
        tisch(cx + 1.70, -6.70, FB, 1.60, 0.80, HOLZ, STAH, 0.75)
        box(cx + 1.35, -6.60, FB + 0.97, 0.46, 0.30, 0.38, MON)
        box(cx + 2.20, -6.90, FB + 0.79, 0.40, 0.28, 0.03, PAP)
        buerostuhl(cx + 1.70, -5.90, FB, POL, STAH, -1)
        box(cx + 2.40, -7.45, FB + 0.95, 1.60, 0.50, 1.90, W)
        for k in range(3):
            box(cx + 2.40, -7.18, FB + 0.60 + k*0.58, 1.40, 0.06, 0.32, HOLZ if k % 2 else PAP)
        # Waschbecken mit Armatur
        box(cx - 2.70, -7.52, FB + 0.42, 0.86, 0.52, 0.84, W)
        box(cx - 2.70, -7.52, FB + 0.86, 0.92, 0.58, 0.08, PLAT)
        box(cx - 2.70, -7.48, FB + 0.88, 0.52, 0.36, 0.06, CHR)
        zyl(cx - 2.70, -7.68, FB + 1.06, 0.03, 0.30, CHR, 8)
        box(cx - 2.70, -7.60, FB + 1.20, 0.06, 0.22, 0.05, CHR)
        box(cx - 2.60, -1.20, FB + 2.00, 1.10, 0.05, 0.80, BLAU)      # Wandbild
        box(0 if cx == 0 else cx, -4.80, H - 0.20, 0.34, 3.60, 0.12, LED)
    for sx in (-3.50, 3.50):
        box(sx, -4.40, H/2, 0.16, 6.80, H, W)

    # ---- Empfang rechts vom Eingang
    theke(6.20, 4.40, 7.00, 1.00, HOLZ, PLAT, 'x', 1.10)
    box(9.20, 3.20, FB + 0.55, 1.00, 2.40, 1.10, HOLZ)               # Rueckflanke
    box(9.20, 3.20, FB + 1.13, 1.20, 2.60, 0.06, PLAT)
    box(8.40, 4.15, FB + 1.32, 0.46, 0.30, 0.36, MON)
    box(4.20, 4.20, FB + 1.20, 0.50, 0.34, 0.10, CHR)
    box(6.20, 2.40, FB + 0.70, 6.00, 0.50, 1.40, W)                  # Aktenschrank
    for k in range(3):
        box(6.20, 2.14, FB + 0.45 + k*0.42, 5.60, 0.06, 0.26, PAP if k % 2 else HOLZ)
    buerostuhl(4.60, 3.30, FB, POL, STAH, 1)
    buerostuhl(7.80, 3.30, FB, POL, STAH, 1)
    box(6.20, 4.40, FB + 2.90, 5.00, 0.24, 0.56, W)
    box(6.20, 4.56, FB + 2.90, 3.80, 0.10, 0.34, BLAU)

    # ---- Wartezimmer links
    stuhlreihe(-6.40, 6.60, 8, STAH, POL, 'x', 0.60, FB, -1)
    stuhlreihe(-6.40, 3.20, 8, STAH, POL, 'x', 0.60, FB,  1)
    stuhlreihe(-10.10, 4.60, 5, STAH, POL, 'y', 0.60, FB, 1)
    tisch(-6.40, 4.90, FB, 2.20, 0.90, PLAT, STAH, 0.45)
    for k in range(3):
        box(-7.10 + k*0.70, 4.90, FB + 0.47, 0.36, 0.50, 0.03, PAP if k % 2 else BLAU)
    pflanze(-10.20, 7.40, FB, HOLZ, GRUE, 1.5)
    pflanze(10.20, 7.20, FB, HOLZ, GRUE, 1.5)
    box(-2.90, 6.40, FB + 0.03, 2.00, 2.00, 0.06, GELB)              # Kinderecke
    tisch(-2.90, 6.40, FB, 0.80, 0.80, ROT, STAH, 0.48)
    for (dx, dy) in ((-0.70, 0.0), (0.70, 0.0)):
        box(-2.90 + dx, 6.40 + dy, FB + 0.14, 0.34, 0.34, 0.28, ROT)
    for k in range(3):
        box(-3.50 + k*0.42, 5.60, FB + 0.15, 0.28, 0.28, 0.26, GELB if k % 2 else ROT)
    box(-11.60, 1.20, FB + 0.60, 0.50, 0.50, 1.20, W)                # Wasserspender
    zyl(-11.60, 1.20, FB + 1.44, 0.17, 0.48, GLAS, 12)
    box(-10.65, -0.20, FB + 1.90, 0.10, 2.20, 1.20, BLAU)            # Infotafel im Flur

    deckenlicht(B, T, H - 0.20, LED, 3, 'x', 6.0)
    for i in range(3):
        box(-7.0 + i*7.0, 0.40, H - 0.36, 5.6, 0.30, 0.12, LED)      # Flurlicht
    export("th23_arztpraxis", 0.016, 2)


# ================================================================ 6) Apotheke
def apotheke():
    """16x12 m: Verkaufsraum mit Sichttresen, Schubladenwand hinter der Theke,
    Warteschlangen-Kordel, Seitenregale, gruenes Leuchtkreuz aussen."""
    neu()
    AUS = mat("ApoFassade",  (0.90,0.90,0.88), 0.75)
    W   = mat("ApoWand",     (0.96,0.96,0.93), 0.85)
    SOK = mat("Sockel",      (0.50,0.50,0.52), 0.90)
    BOD = mat("Fliese",      (0.82,0.82,0.78), 0.45)
    BOD2= mat("Fliese2",     (0.66,0.72,0.66), 0.48)
    HOLZ= mat("Tresenholz",  (0.62,0.44,0.26), 0.55)
    HOL2= mat("Schubladen",  (0.46,0.31,0.18), 0.55)
    PLAT= mat("Tresenplatte",(0.92,0.92,0.90), 0.28)
    STAH= mat("Stahl",       (0.58,0.60,0.64), 0.35, 0.45)
    CHR = mat("Chrom",       (0.76,0.78,0.82), 0.20, 0.55)
    GLAS= mat("Glas",        (0.70,0.84,0.92), 0.10, 0.0, None, 1.3, 0.42)
    VITR= mat("Vitrine",     (0.76,0.88,0.94), 0.08, 0.0, None, 1.3, 0.26)
    KREU= mat("Leuchtkreuz", (0.20,0.85,0.35), 0.30, 0.0, (0.10,0.95,0.30), 2.6)
    GRUE= mat("Apogruen",    (0.14,0.52,0.26), 0.60)
    WARE= mat("Packung",     (0.90,0.62,0.22), 0.70)
    WAR2= mat("Packung2",    (0.36,0.58,0.86), 0.70)
    POL = mat("Polster",     (0.20,0.46,0.36), 0.70)
    MON = mat("Kasse",       (0.08,0.14,0.20), 0.25, 0.0, (0.30,0.72,1.0), 1.7)
    LED = mat("Deckenlicht", (1.0,0.98,0.94), 0.22, 0.0, (1.0,0.98,0.94), 2.0)
    BLAT= mat("Blatt",       (0.16,0.44,0.22), 0.75)

    B, T, H, d = 16.0, 12.0, 4.0, 0.40
    boden(B, T, SOK, BOD, 2.0)
    bodenmuster(0, 0, B - 1.0, T - 1.0, FB + 0.02, BOD, BOD2, 1.9)

    wand_mit_tuer(0, T/2, B, d, H, AUS, 2.6, 3.0)
    box(0, -T/2, H/2, B, d, H, AUS)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, AUS)
    box(0, 0, H + 0.20, B + 1.0, T + 1.0, 0.40, AUS)          # Decke buendig

    for sx in (-5.2, 5.2):                                     # Schaufenster
        fensterband(sx, T/2, 5.2, d, FB + 1.90, 2.20, AUS, GLAS, 2, 'x')
    for sx in (-B/2, B/2):
        fensterband(sx, 0, 8.0, d, FB + 2.90, 1.10, AUS, GLAS, 3, 'y')

    box(0, T/2 + 0.26, FB + 3.30, B, 0.20, 0.36, GRUE)         # Fassadenband
    box(0, T/2 + 0.34, FB + 2.55, 0.30, 0.16, 0.96, KREU)      # Kreuz unter dem Vordach
    box(0, T/2 + 0.34, FB + 2.55, 0.96, 0.16, 0.30, KREU)
    box(6.40, T/2 + 0.45, FB + 2.90, 0.10, 0.55, 0.10, STAH)   # Ausleger-Kreuz
    box(6.40, T/2 + 0.75, FB + 2.90, 0.16, 0.34, 1.00, KREU)
    box(6.40, T/2 + 0.75, FB + 2.90, 0.16, 1.00, 0.34, KREU)
    box(0, T/2 + 0.55, H + 0.42, 5.4, 0.24, 0.84, W)           # Dachschild
    box(0, T/2 + 0.70, H + 0.42, 4.2, 0.08, 0.52, GRUE)
    box(0, T/2 + 0.76, H + 0.42, 0.22, 0.06, 0.74, KREU)       # Leuchtkreuz auf dem Dachschild
    box(0, T/2 + 0.76, H + 0.42, 0.74, 0.06, 0.22, KREU)
    box(0, T/2 + 1.30, FB + 3.62, 6.4, 2.40, 0.26, AUS)        # Vordach 3.79-4.05
    for sx in (-2.6, 2.6):
        zyl(sx, T/2 + 2.20, (FB + 3.79)/2, 0.15, 3.79 - FB, CHR, 12)

    # ---- Sichttresen
    # Sichttresen: Korpus hinten, davor eine ECHTE Vitrine — Glas VOR der Auslage,
    # sonst steckt die Ware im massiven Tresen und man sieht nur eine Holzfront.
    box(0, -2.85, FB + 0.52, 11.00, 0.50, 1.04, HOLZ)          # Korpus y -3.10 .. -2.60
    box(0, -2.35, FB + 0.15, 11.00, 0.50, 0.30, HOLZ)          # Vitrinensockel
    for k in range(9):
        box(-4.4 + k*1.1, -2.36, FB + 0.44, 0.42, 0.32, 0.28, WARE if k % 2 else WAR2)
        box(-4.4 + k*1.1, -2.36, FB + 0.78, 0.42, 0.32, 0.28, WAR2 if k % 2 else WARE)
    box(0, -2.36, FB + 0.615, 10.80, 0.36, 0.03, PLAT)         # Zwischenboden
    box(0, -2.11, FB + 0.67, 11.00, 0.04, 0.74, VITR)          # Scheibe VOR der Ware
    for sx in (-5.48, 5.48):
        box(sx, -2.36, FB + 0.67, 0.04, 0.50, 0.74, VITR)
    box(0, -2.60, FB + 1.07, 11.20, 1.16, 0.06, PLAT)          # Tresenplatte, Oberkante 1.10
    for sx in (-3.0, 3.0):                                     # Kassenplaetze
        box(sx, -2.45, FB + 1.28, 0.44, 0.36, 0.30, STAH)
        box(sx, -2.52, FB + 1.46, 0.40, 0.24, 0.26, MON)
        buerostuhl(sx, -3.70, FB, POL, STAH, 1)
    box(-4.80, -2.45, FB + 1.22, 0.34, 0.30, 0.16, STAH)       # Waage
    box(4.80, -2.42, FB + 1.24, 0.40, 0.34, 0.20, WARE)

    # ---- Schubladenwand hinter der Theke
    schrankwand(0, -5.50, 12.00, 2.60, 14, 6, HOL2, PLAT, CHR, 'x', 0.50, FB, 1)
    box(0, -5.50, FB + 2.75, 12.20, 0.60, 0.14, HOL2)
    box(0, -5.56, FB + 3.10, 12.00, 0.42, 0.06, HOL2)
    for k in range(14):
        zyl(-5.85 + k*0.90, -5.56, FB + 3.28, 0.09, 0.30, WARE if k % 2 else WAR2, 10)
    box(0, -5.70, FB + 3.56, 8.00, 0.16, 0.34, GRUE)
    for sx in (-6.10, 6.10):                                   # seitliche Rueckwandregale
        regal(sx, -4.60, 2.00, 2.20, 0.45, 3, W, 'y', FB, WARE, 1 if sx < 0 else -1)

    # ---- Seitenregale + Insel
    regal(-7.45, 0.20, 8.00, 2.20, 0.55, 4, W, 'y', FB, WARE,  1)
    regal( 7.45, -0.60, 6.00, 2.20, 0.55, 4, W, 'y', FB, WAR2, -1)
    regal(4.20, 2.40, 2.40, 1.40, 0.90, 3, W, 'x', FB, WARE, 1)   # Verkaufsinsel

    # ---- Warteschlange + Beratungsecke
    kordel([(-2.60, 4.40), (-2.60, 0.90), (2.20, 0.90), (2.20, 3.40)], CHR, GRUE, FB, 0.95)
    box(0, -0.40, FB + 0.03, 3.00, 0.16, 0.03, GRUE)           # Bodenmarkierung
    stuhl(-5.60, 4.60, FB, HOLZ, POL, -1)
    stuhl(-4.20, 4.60, FB, HOLZ, POL, -1)
    tisch(-4.90, 3.60, FB, 1.00, 0.70, PLAT, STAH, 0.50)
    pflanze(-6.90, 4.80, FB, HOLZ, BLAT, 1.4)
    pflanze(6.90, 4.60, FB, HOLZ, BLAT, 1.4)

    deckenlicht(B, T, H - 0.20, LED, 3, 'x', T - 3.0)
    export("th23_apotheke", 0.016, 2)


if __name__ == "__main__":
    print("Asset-Charge 17 (th23, oeffentliche Publikumsbauten):")
    for fn in (post, bank, polizeiwache, gericht, arztpraxis, apotheke):
        fn()
    print("fertig")
