# -*- coding: utf-8 -*-
"""Asset-Charge th22_*: WOHNBAUTEN fuer das Stadtspiel.
Altbau-Fassadenmodul, Eckhaus, Plattenbau-Modul, Villa, Bungalow, Doppelhaus,
begehbarer Hinterhof, Dachterrassen-Aufsatz, Balkon-Anbau, begehbare Garage.
Familienfreundlich — reine Architektur, keine Waffen.

Konventionen wie th5-th20 (bitte nicht abweichen):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * `primitive_cube_add(size=1)` liefert Kantenlaenge 1 -> Skalierung = Mass, NICHT /2.
  * Schauseite (Eingang) auf Blender +y  ->  in three.js -z.
  * Fensterglas sitzt knapp VOR der Wandflaeche (Offset ~0.02) — innen liegend
    rendert das Haus als Klotz ohne ein einziges Fenster.
  * Decken buendig auf die Wandkrone, sonst klafft rings ein Himmelsspalt.
  * Begehbar: Aussensockel UND Innenboden enden auf `FB`, Moebel auf `FB + Hoehe`.
  * Stuetzen NEBEN die Durchgaenge (`oeffnungs_achsen()`).
  * Treppenlaengen rechnen: n = round(Hoehe/Steigung).
  * `kegel(vertices=4)` legt die ECKEN auf die Achsen -> bei Modulmassen zwei Quader.
  * Metallic hoechstens 0.6 — darueber rendert three.js ohne Environment-Map schwarz.

MODULRASTER (hart, nicht veraendern):
  th22_altbau_modul      8.00 m in x  (Reihung x += 8.0)
  th22_plattenbau_modul 12.00 m in x  (Reihung x += 12.0)
  th22_dachterrasse     12.00 m in x  (Aufsatz auf das Plattenbau-Modul)
  Gesimse, Stuckbaender und Balkonplatten laufen exakt ueber die volle Modulbreite,
  Trennwaende/Pfosten sitzen NUR an der linken Kante (sonst stehen an jeder Fuge
  zwei nebeneinander).
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

def kugel(x, y, z, r, m=None, seg=18):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=seg, ring_count=max(7, seg//2))
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kegel(x, y, z, r1, r2, h, m=None, seg=12, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def ring(x, y, z, r, rr, m=None, seg=16, rseg=8, rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(location=(x,y,z), major_radius=r, minor_radius=rr,
                                     major_segments=seg, minor_segments=rseg, rotation=rot)
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

def boden(B, T, m_sockel, m_boden, rand=2.0):
    box(0, 0, FB/2, B + rand, T + rand, FB, m_sockel)     # Vorplatz
    box(0, 0, FB/2, B, T, FB, m_boden)                    # Innenboden, buendig

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

def oeffnungs_achsen(laenge, n, off_b):
    """x-Mitten der n Oeffnungen und der n+1 Pfeiler — damit Stuetzen und Einbauten
    NICHT in einem Durchgang landen."""
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

def fensterband(cx, cy, laenge, dicke, zmit, hoehe, m_rahm, m_glas, n=3, achse='x'):
    """Glas knapp VOR die Wandflaeche — innen liegend waere es unsichtbar."""
    for i in range(n):
        t = (i + 0.5)/n - 0.5
        if achse == 'x':
            box(cx + t*laenge, cy, zmit, laenge/n*0.62, dicke*1.2, hoehe, m_rahm)
            box(cx + t*laenge, cy, zmit, laenge/n*0.50, dicke*1.6, hoehe*0.78, m_glas)
        else:
            box(cx, cy + t*laenge, zmit, dicke*1.2, laenge/n*0.62, hoehe, m_rahm)
            box(cx, cy + t*laenge, zmit, dicke*1.6, laenge/n*0.50, hoehe*0.78, m_glas)

def platte_mit_loch(cx, cy, z, B, T, dicke, lb, lt, m):
    sv = (T - lt)/2.0
    sh = (B - lb)/2.0
    if sv > 0.01:
        box(cx, cy - lt/2 - sv/2, z, B, sv, dicke, m)
        box(cx, cy + lt/2 + sv/2, z, B, sv, dicke, m)
    if sh > 0.01:
        box(cx - lb/2 - sh/2, cy, z, sh, lt, dicke, m)
        box(cx + lb/2 + sh/2, cy, z, sh, lt, dicke, m)

# ---------------------------------------------------------------- Fenster
def fenster(a, pz, b, h, wand, m_rahm, m_glas, s=1, achse='y',
            m_sims=None, m_sturz=None, vsp=1, hsp=1, m_laden=None, bogen=False):
    """EIN Fenster in einer geraden Fassade.
      achse='y': Fassade liegt bei y=wand und blickt nach s*(+y); `a` ist die x-Mitte.
      achse='x': Fassade liegt bei x=wand und blickt nach s*(+x); `a` ist die y-Mitte.
    Reihenfolge der Tiefen ist entscheidend (teuer gelernt):
      Rahmen 0.03 -> Glas 0.075 -> Sprossen 0.10, jeweils VOR der Wandflaeche.
    Laege das Glas hinter der Wand, rendert das Haus als fensterloser Klotz."""
    def bx(u, z, bb, hh, dd, oo, m):
        if achse == 'y': return box(u, wand + s*oo, z, bb, dd, hh, m)
        else:            return box(wand + s*oo, u, z, dd, bb, hh, m)
    bx(a, pz, b + 0.20, h + 0.20, 0.10, 0.030, m_rahm)             # Rahmen/Laibung
    bx(a, pz, b, h, 0.05, 0.075, m_glas)                           # Glas, knapp davor
    for i in range(vsp):
        bx(a - b/2 + b*(i+1)/(vsp+1), pz, 0.06, h, 0.05, 0.100, m_rahm)
    for i in range(hsp):
        bx(a, pz - h/2 + h*(i+1)/(hsp+1), b, 0.06, 0.05, 0.100, m_rahm)
    if m_sims:
        bx(a, pz - h/2 - 0.13, b + 0.40, 0.13, 0.26, 0.110, m_sims)
    if m_sturz:
        bx(a, pz + h/2 + 0.16, b + 0.44, 0.18, 0.28, 0.115, m_sturz)
    if bogen and m_sturz:                                          # Segmentbogen
        for i in range(7):
            w = math.pi*(i + 0.5)/7
            bx(a - math.cos(w)*(b/2 + 0.10), pz + h/2 + 0.10 + math.sin(w)*0.26,
               0.20, 0.24, 0.24, 0.095, m_sturz)
    if m_laden:                                                    # Fensterlaeden
        for sgn in (-1, 1):
            bx(a + sgn*(b/2 + 0.19), pz, 0.34, h, 0.07, 0.135, m_laden)

def rundfenster(cx, cy, r, ang, pz, b, h, m_rahm, m_glas, m_sims=None):
    """Fenster in einer RUNDEN Wand (Turm). `ang` = Winkel auf dem Zylinder."""
    ca, sa = math.cos(ang), math.sin(ang)
    def bx(rr, bb, hh, dd, zz, m):
        o = box(cx + ca*rr, cy + sa*rr, zz, dd, bb, hh, m)
        o.rotation_euler[2] = ang
        return o
    bx(r + 0.03, b + 0.20, h + 0.20, 0.10, pz, m_rahm)
    bx(r + 0.075, b, h, 0.05, pz, m_glas)
    bx(r + 0.10, 0.06, h, 0.05, pz, m_rahm)
    bx(r + 0.10, b, 0.06, 0.05, pz, m_rahm)
    if m_sims:
        bx(r + 0.11, b + 0.36, 0.13, 0.26, pz - h/2 - 0.13, m_sims)

def gesims(cz, dicke, vor, wand, laenge, m, s=1, achse='y', c=0.0, hoehe=None):
    """Durchlaufendes Gesims-/Stuckband. `laenge` MUSS bei Modulen exakt die
    Modulbreite sein, damit das Band ueber die Fuge weiterlaeuft."""
    hh = hoehe if hoehe else dicke
    if achse == 'y': return box(c, wand + s*(vor/2 - 0.02), cz, laenge, vor, hh, m)
    else:            return box(wand + s*(vor/2 - 0.02), c, cz, vor, laenge, hh, m)

# ---------------------------------------------------------------- Daecher
def _halbzyl(o):
    nur(o)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    bm.to_mesh(o.data); bm.free(); o.data.update()
    return o

def tonne(cx, cy, z, r, laenge, m, seg=24):
    """HALBES Tonnengewoelbe, Fassachse in x. Ein voller Zylinder taugt nicht —
    seine untere Haelfte steckt im Bau und verdeckt von innen alles."""
    return _halbzyl(zyl(cx, cy, z, r, laenge, m, seg, rot=(0, math.pi/2, 0)))

def tonne_y(cx, cy, z, r, laenge, m, seg=24):
    """HALBES Tonnengewoelbe, Fassachse in y."""
    return _halbzyl(zyl(cx, cy, z, r, laenge, m, seg, rot=(math.pi/2, 0, 0)))

def giebel(cx, cy, cz, halbb, hoehe, tiefe, m=None):
    """Dreiecksgiebel als echtes Prisma (Basis cz, Spitze cz+hoehe, Tiefe in y).
    `kegel(vertices=3)` waere eine Pyramide, kein Giebel."""
    t = tiefe / 2.0
    v = [(-halbb,-t,0), (halbb,-t,0), (0,-t,hoehe), (-halbb,t,0), (halbb,t,0), (0,t,hoehe)]
    f = [(0,1,2), (5,4,3), (0,3,4,1), (1,4,5,2), (2,5,3,0)]
    me = bpy.data.meshes.new("Giebel"); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new("Giebel", me); bpy.context.collection.objects.link(o)
    o.location = (cx, cy, cz)
    if m: o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o
    return o

def giebel_quer(cx, cy, cz, halbt, hoehe, tiefe_x, m=None):
    """Giebel fuer eine Wand, die in x steht (Breite laeuft in y). Wird ueber eine
    Objektrotation erzeugt — ein von Hand gespiegeltes Mesh dreht die Normalen um
    und die Flaechen verschwinden in three.js (Backface-Culling)."""
    o = giebel(cx, cy, cz, halbt, hoehe, tiefe_x, m)
    o.rotation_euler[2] = math.pi/2
    return o

def satteldach(cx, cy, B, T, z0, fh, dicke, m, ueber_x=0.5, ueber_y=0.6):
    """First laeuft in y, Giebel auf +y/-y. Traufe exakt auf z0, First z0+fh."""
    bh = B/2 + ueber_x
    a  = math.atan2(fh, bh)
    L  = math.hypot(bh, fh)
    for s in (-1, 1):
        o = box(cx + s*bh/2, cy, z0 + fh/2, L, T + 2*ueber_y, dicke, m)
        o.rotation_euler[1] = s*a
    return a

def satteldach_x(cx, cy, B, T, z0, fh, dicke, m, ueber_x=0.5, ueber_y=0.6):
    """First laeuft in x (parallel zur Strasse), Giebel auf +x/-x — fuer Doppelhaus
    und Reihenhaus. Winkel wird gerechnet, nicht geschaetzt."""
    bt = T/2 + ueber_y
    a  = math.atan2(fh, bt)
    L  = math.hypot(bt, fh)
    for s in (-1, 1):
        o = box(cx, cy + s*bt/2, z0 + fh/2, B + 2*ueber_x, L, dicke, m)
        o.rotation_euler[0] = -s*a
    return a

def walmdach(cx, cy, B, T, z0, fh, first, m=None, ueber=0.6):
    """Echtes Walmdach: 4 geneigte Flaechen + Bodenplatte, First `first` lang in x.
    Als Mesh gebaut — mit vier gekippten Platten klaffen an den Graten Schlitze."""
    bh, bt, fl = B/2 + ueber, T/2 + ueber, first/2
    v = [(-bh,-bt,0), (bh,-bt,0), (bh,bt,0), (-bh,bt,0), (-fl,0,fh), (fl,0,fh)]
    f = [(3,2,1,0),                      # Unterseite
         (0,1,5,4),                      # -y Traufseite
         (2,3,4,5),                      # +y Traufseite
         (1,2,5), (3,0,4)]               # Walme
    me = bpy.data.meshes.new("Walm"); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new("Walm", me); bpy.context.collection.objects.link(o)
    o.location = (cx, cy, z0)
    if m: o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o
    return o

# ---------------------------------------------------------------- Streben
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

# ---------------------------------------------------------------- Gelaender / Treppe
def gelaender(a0, a1, fest, z, m, hoehe=1.05, achse='x', stab=0.07):
    L = abs(a1 - a0)
    if L < 0.05: return
    c = (a0 + a1) / 2
    n = max(2, int(L / 1.4))
    if achse == 'x':
        box(c, fest, z + hoehe, L, 0.09, 0.09, m)
        for i in range(n + 1):
            box(a0 + (a1-a0)*i/n, fest, z + hoehe/2, stab, stab, hoehe, m)
    else:
        box(fest, c, z + hoehe, 0.09, L, 0.09, m)
        for i in range(n + 1):
            box(fest, a0 + (a1-a0)*i/n, z + hoehe/2, stab, stab, hoehe, m)

def bruestung(cx, cy, lb, lt, z, m, hoehe=1.05):
    gelaender(cx-lb/2, cx+lb/2, cy-lt/2, z, m, hoehe, 'x')
    gelaender(cx-lb/2, cx+lb/2, cy+lt/2, z, m, hoehe, 'x')
    gelaender(cy-lt/2, cy+lt/2, cx-lb/2, z, m, hoehe, 'y')
    gelaender(cy-lt/2, cy+lt/2, cx+lb/2, z, m, hoehe, 'y')

def treppe(cx, y0, z0, breite, hoehe_ges, m, m_gel=None, steig=0.17, auftritt=0.28,
           richtung=-1):
    """Lauf mit begehbarer Steigung. n = round(Hoehe/Steigung) — NICHT raten."""
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

def stufen(cx, cy, z0, breite, hoehe, m, tiefe=0.30, richtung=1):
    """Kurze Aussentreppe vor einer Haustuer (Blickrichtung +y)."""
    n = max(1, int(round(hoehe / 0.17)))
    st = hoehe / n
    for i in range(n):
        box(cx, cy + richtung*(i + 0.5)*tiefe, z0 + hoehe - (i + 0.5)*st,
            breite - i*0.10, tiefe, hoehe - i*st, m)
    return n*tiefe

def pflanze(px, py, pz, r, hoehe, m_gruen, m_topf=None, n=5):
    """Buschige Pflanze aus ueberlappenden Kugeln, optional im Topf."""
    z = pz
    if m_topf:
        kegel(px, py, pz + hoehe*0.16, r*0.78, r*0.95, hoehe*0.32, m_topf, 12)
        z = pz + hoehe*0.30
    for i in range(n):
        a = i/n*math.tau
        kugel(px + math.cos(a)*r*0.42, py + math.sin(a)*r*0.42,
              z + hoehe*0.34 + (i % 2)*hoehe*0.16, r*0.54, m_gruen, 8)

def baum(px, py, pz, h, m_stamm, m_krone, r=1.5):
    zyl(px, py, pz + h*0.28, h*0.045, h*0.56, m_stamm, 10)
    for (dx, dy, dz, rr) in ((0,0,0.62,1.0), (-0.45,0.25,0.50,0.72),
                             (0.42,-0.30,0.52,0.70), (0.10,0.45,0.74,0.62)):
        kugel(px + dx*r, py + dy*r, pz + h*dz, r*rr, m_krone, 12)

def muelltonne(px, py, pz, m_korpus, m_deckel, m_rad, b=0.72, t=0.62, h=1.10):
    box(px, py, pz + h/2, b, t, h, m_korpus)
    box(px, py, pz + h + 0.05, b + 0.06, t + 0.06, 0.10, m_deckel)
    box(px, py + t/2 + 0.03, pz + h + 0.16, b*0.5, 0.10, 0.08, m_deckel)   # Griff
    for s in (-1, 1):
        zyl(px + s*(b/2 - 0.08), py - t/2 + 0.06, pz + 0.09, 0.09, 0.06, m_rad, 10,
            rot=(0, math.pi/2, 0))

def fahrradstaender(px, py, pz, n, m, achse='x', abstand=0.62):
    """Anlehnbuegel-Reihe. Buegel = zwei Pfosten + Querholm (ein Torus waere hier
    zu fein und kostet nur Dreiecke)."""
    for i in range(n):
        t = (i - (n-1)/2) * abstand
        ax, ay = (px + t, py) if achse == 'x' else (px, py + t)
        for s in (-1, 1):
            if achse == 'x': box(ax, ay + s*0.32, pz + 0.38, 0.06, 0.06, 0.76, m)
            else:            box(ax + s*0.32, ay, pz + 0.38, 0.06, 0.06, 0.76, m)
        if achse == 'x': box(ax, ay, pz + 0.78, 0.06, 0.70, 0.06, m)
        else:            box(ax, ay, pz + 0.78, 0.70, 0.06, 0.06, m)

# ================================================================ Gruenderzeit-Raster
# Die Bandhoehen sind fuer Modul UND Eckhaus IDENTISCH — sonst springen Gesimse
# und Stuckbaender an der Fuge zwischen beiden Haeusern.
A_H      = 16.00                 # Gesamthoehe beider Altbauten
A_SOK    = 0.60                  # Sockeloberkante
A_EG     = 4.20                  # Erdgeschoss-Oberkante
A_GURT_C, A_GURT_H = 4.32, 0.36  # Gurtgesims  4.14 .. 4.50
A_W1,  A_W1H = 6.30, 2.60        # Beletage-Fenster
A_B2_C, A_B2_H = 8.10, 0.24      # Stuckband   7.98 .. 8.22
A_W2,  A_W2H = 9.75, 2.30
A_B3_C, A_B3_H = 11.40, 0.22     # Stuckband  11.29 .. 11.51
A_W3,  A_W3H = 12.85, 2.05
A_TR_C, A_TR_H = 14.58, 0.56     # Traufgesims 14.30 .. 14.86

def _altbau_mat():
    return dict(
        PUTZ = mat("AltbauPutz", (0.83,0.76,0.63), 0.86),
        FASS = mat("AltbauFassade", (0.87,0.80,0.66), 0.84),
        STUCK= mat("Stuck", (0.94,0.92,0.86), 0.72),
        RUST = mat("Rustika", (0.74,0.69,0.58), 0.90),
        SOK  = mat("Werkstein", (0.55,0.53,0.49), 0.92),
        DACH = mat("Schiefer", (0.24,0.25,0.28), 0.62),
        FEN  = mat("Fensterrahmen", (0.95,0.94,0.90), 0.55),
        GLAS = mat("Fensterglas", (0.36,0.47,0.55), 0.14, 0.25),
        TUER = mat("Haustuer", (0.26,0.14,0.09), 0.52),
        MET  = mat("Schmiedeeisen", (0.20,0.21,0.23), 0.42, 0.45),
        GOLD = mat("Messing", (0.72,0.58,0.24), 0.32, 0.55),
        LICHT= mat("Hauslicht", (1.0,0.92,0.72), 0.30, 0.0, (1.0,0.88,0.62), 1.8),
        GRUE = mat("Blattgruen", (0.20,0.44,0.16), 0.88),
        TOPF = mat("Blumentopf", (0.60,0.32,0.20), 0.88),
    )

# ================================================================ 1) Altbau-Modul
def altbau_modul():
    """Gruenderzeit-Fassadenmodul, exakt 8.00 m breit und 16.00 m hoch.
    Reihung x += 8.00: Sockel, Rustikabaender, Gurt-/Stuckbaender, Traufgesims und
    Mansardflaeche laufen exakt ueber die volle Modulbreite und stossen an der Fuge
    ohne Versatz aneinander. NICHTS ragt ueber |x| = 4.00 hinaus — deshalb sitzen
    Erker, Portal und Schaufenster ausschliesslich in +y."""
    neu()
    M = _altbau_mat()
    PUTZ, FASS, STUCK, RUST = M['PUTZ'], M['FASS'], M['STUCK'], M['RUST']
    SOK, DACH, FEN, GLAS = M['SOK'], M['DACH'], M['FEN'], M['GLAS']
    TUER, MET, GOLD, LICHT = M['TUER'], M['MET'], M['GOLD'], M['LICHT']
    B, T, H, YF = 8.0, 10.0, A_H, 5.0
    # --- Baukoerper
    box(0, 0, H/2, B, T, H, PUTZ)
    box(0, YF - 0.07, H/2, B, 0.14, H, FASS)                 # Fassadenschale, buendig
    box(0, YF, 0.30, B, 0.26, 0.60, SOK)                     # Sockelband
    for i in range(6):                                       # Rustika im Erdgeschoss
        box(0, YF + 0.06, 0.90 + i*0.60, B, 0.12, 0.50, RUST)
    gesims(A_GURT_C, 0, 0.30, YF, B, STUCK, 1, 'y', 0.0, A_GURT_H)
    gesims(A_B2_C, 0, 0.24, YF, B, STUCK, 1, 'y', 0.0, A_B2_H)
    gesims(A_B3_C, 0, 0.24, YF, B, STUCK, 1, 'y', 0.0, A_B3_H)
    for i in range(8):                                       # Traufkonsolen
        box(-3.5 + i, YF + 0.16, 14.16, 0.18, 0.40, 0.34, STUCK)
    gesims(A_TR_C, 0, 0.52, YF, B, STUCK, 1, 'y', 0.0, A_TR_H)
    # --- Erdgeschoss: Portal links, Schaufenster rechts
    PX = -2.75
    box(PX, YF + 0.14, 1.90, 2.24, 0.32, 3.80, SOK)          # Tuergewaende
    box(PX, YF + 0.30, 1.60, 1.56, 0.10, 3.00, TUER)         # Fluegel 0.10 .. 3.10
    for s in (-1, 1):
        box(PX + s*0.40, YF + 0.37, 2.10, 0.56, 0.06, 1.60, GOLD)
        box(PX + s*0.40, YF + 0.37, 0.90, 0.56, 0.06, 0.90, FASS)
    box(PX, YF + 0.36, 3.34, 1.56, 0.06, 0.44, GLAS)         # Oberlicht
    box(PX, YF + 0.30, 3.14, 1.70, 0.22, 0.14, GOLD)
    box(PX, YF + 0.62, 4.02, 2.40, 0.80, 0.20, STUCK)        # Vordach ueber dem Portal
    for s in (-1, 1):
        strebe_yz(YF + 0.10, 3.70, YF + 0.92, 3.92, PX + s*0.90, 0.10, 0.10, MET)
        # Lampen auf das Gewaende, NICHT daneben: bei +-1.34 lagen sie auf x = -4.17
        # und haben das 8.00-m-Raster gesprengt (gemessen 8.17 statt 8.00).
        box(PX + s*0.98, YF + 0.34, 2.60, 0.16, 0.16, 0.30, LICHT)
    stufen(PX, YF + 0.30, 0.0, 1.90, 0.16, SOK, 0.34, 1)
    box(-0.78, YF + 0.12, 2.30, 1.36, 0.22, 2.20, SOK)       # Blindnische
    fenster(-0.78, 2.30, 1.00, 1.80, YF + 0.12, FEN, GLAS, 1, 'y', STUCK, None, 1, 1)
    box(1.90, YF + 0.10, 2.10, 3.90, 0.24, 3.00, SOK)        # Ladenfront
    fenster(1.90, 2.10, 3.36, 2.46, YF + 0.14, FEN, GLAS, 1, 'y', STUCK, None, 2, 1)
    box(1.90, YF + 0.44, 3.66, 3.90, 0.30, 0.34, TUER)       # Ladenschild
    box(1.90, YF + 0.60, 3.66, 3.20, 0.10, 0.20, GOLD)
    # --- Erker, mittig, 3.40 breit, ragt NUR in +y
    EB, EY0, EY1 = 3.40, YF, YF + 0.95
    box(0, (EY0 + EY1)/2, (A_GURT_C + A_GURT_H/2 + 14.86)/2, EB, EY1 - EY0,
        14.86 - (A_GURT_C + A_GURT_H/2), FASS)
    box(0, EY1 - 0.48, 4.36, EB - 0.30, 0.90, 0.32, STUCK)   # Erkerplatte unten
    for kx in (-1.20, 0.0, 1.20):                            # Konsolen
        box(kx, EY1 - 0.52, 3.94, 0.24, 0.80, 0.56, STUCK)
    for (zz, hh) in ((A_W1, A_W1H), (A_W2, A_W2H), (A_W3, A_W3H)):
        for sx in (-0.82, 0.82):
            fenster(sx, zz, 1.06, hh, EY1, FEN, GLAS, 1, 'y', STUCK, STUCK, 1, 1)
        for sx in (-1, 1):                                   # Erker-Seitenfenster
            fenster(EY1 - 0.46, zz, 0.56, hh*0.86, sx*EB/2, FEN, GLAS, sx, 'x', None, None, 0, 1)
    for zc, zh in ((A_B2_C, A_B2_H), (A_B3_C, A_B3_H)):
        box(0, EY1 - 0.50, zc, EB + 0.16, 1.06, zh + 0.06, STUCK)
    box(0, EY1 - 0.52, 15.00, EB + 0.22, 1.16, 0.28, DACH)   # Erkerdach auf dem Gesims
    for i in range(9):                                       # Balustrade auf dem Erker
        box(-1.60 + i*0.40, EY1 - 0.52, 15.42, 0.13, 0.13, 0.56, STUCK)
    box(0, EY1 - 0.52, 15.78, EB + 0.10, 0.90, 0.14, STUCK)
    # --- Regelgeschosse: zwei Seitenachsen
    for sx in (-2.75, 2.75):
        fenster(sx, A_W1, 1.26, A_W1H, YF, FEN, GLAS, 1, 'y', STUCK, STUCK, 1, 2)
        fenster(sx, A_W2, 1.26, A_W2H, YF, FEN, GLAS, 1, 'y', STUCK, STUCK, 1, 1, None, True)
        fenster(sx, A_W3, 1.26, A_W3H, YF, FEN, GLAS, 1, 'y', STUCK, None, 1, 1)
        box(sx, YF + 0.32, A_W1 - A_W1H/2 + 0.42, 1.60, 0.10, 0.84, MET)   # Franz. Balkon
        for i in range(9):
            box(sx - 0.72 + i*0.18, YF + 0.36, A_W1 - A_W1H/2 + 0.42, 0.05, 0.05, 0.84, MET)
    # --- Rueckfassade schlicht
    for zz, hh in ((2.10, 1.90), (A_W1, 2.10), (A_W2, 2.00), (A_W3, 1.90)):
        for sx in (-2.6, 0.0, 2.6):
            fenster(sx, zz, 1.20, hh, -T/2, FEN, GLAS, -1, 'y', SOK, None, 1, 1)
    # --- Mansarddach: Traufe 14.86, Oberkante EXAKT 16.00
    strebe_yz(YF, 14.86, 4.10, 15.80, 0, 0.22, B, DACH)
    strebe_yz(-T/2, 14.86, -4.10, 15.80, 0, 0.22, B, DACH)
    box(0, 0, 15.88, B, 8.40, 0.24, DACH)                    # Deck, Oberkante 16.00
    for sx in (-2.45, 2.45):                                 # Gauben
        box(sx, 4.62, 15.32, 1.34, 0.92, 1.04, FASS)
        box(sx, 4.60, 15.90, 1.50, 1.04, 0.12, DACH)
        fenster(sx, 15.34, 0.86, 0.76, 5.08, FEN, GLAS, 1, 'y', None, None, 1, 0)
    # KEINE Schornsteine: jeder Aufbau ueber 16.00 sprengt das Hoehenraster
    # (erste Fassung mass 16.55). Rauchfaenge sitzen im Eckhaus.
    for sx in (-2.9, 2.9):                                   # Dachluken statt Kamin
        box(sx, -2.10, 15.72, 0.62, 0.62, 0.28, SOK)
    export("th22_altbau_modul", 0.018, 2)

# ================================================================ 2) Altbau-Eckhaus
def altbau_eck():
    """Eckhaus zum Modul: zwei Fluegel, abgeschraegte (runde) Ecke mit Turmhaube.
    Alle Bandhoehen sind identisch mit th22_altbau_modul, die linke Flanke (x = -6.00)
    und die Rueckseite (y = -6.00) sind glatte Brandwaende — dort docken die Module an.
    Der Eckturm ist TANGENTIAL an beide Fassaden gelegt (Mittelpunkt 3.45/3.45,
    r = 2.55 -> beruehrt x = 6.00 und y = 6.00), sonst schneidet er die Flucht."""
    neu()
    M = _altbau_mat()
    PUTZ, FASS, STUCK, RUST = M['PUTZ'], M['FASS'], M['STUCK'], M['RUST']
    SOK, DACH, FEN, GLAS = M['SOK'], M['DACH'], M['FEN'], M['GLAS']
    TUER, MET, GOLD, LICHT = M['TUER'], M['MET'], M['GOLD'], M['LICHT']
    KUPF = mat("Kupferhaube", (0.30,0.52,0.46), 0.48, 0.35)
    H = A_H
    TX, TY, TR = 3.45, 3.45, 2.55
    # --- Baukoerper: Fluegel A laengs y (Schauseite +y), Fluegel B laengs x
    box(-1.90, 0.0, H/2, 8.20, 12.0, H, PUTZ)                # x -6.00 .. 2.20
    box( 4.10,-1.90, H/2, 3.80, 8.20, H, PUTZ)               # y -6.00 .. 2.20
    zyl(TX, TY, H/2, TR, H, FASS, 32)                        # Eckturm
    box(-1.90, 6.00 - 0.07, H/2, 8.20, 0.14, H, FASS)        # Fassadenschale +y
    box( 6.00 - 0.07,-1.90, H/2, 0.14, 8.20, H, FASS)        # Fassadenschale +x
    # --- Sockel, Rustika, Gesimse: gleiche Hoehen wie beim Modul
    box(-1.90, 6.00, 0.30, 8.20, 0.26, 0.60, SOK)
    box( 6.00,-1.90, 0.30, 0.26, 8.20, 0.60, SOK)
    zyl(TX, TY, 0.30, TR + 0.13, 0.60, SOK, 32)
    for i in range(6):
        box(-1.90, 6.06, 0.90 + i*0.60, 8.20, 0.12, 0.50, RUST)
        box( 6.06,-1.90, 0.90 + i*0.60, 0.12, 8.20, 0.50, RUST)
        zyl(TX, TY, 0.90 + i*0.60, TR + 0.06, 0.50, RUST, 32)
    for (zc, zh, vor) in ((A_GURT_C, A_GURT_H, 0.30), (A_B2_C, A_B2_H, 0.24),
                          (A_B3_C, A_B3_H, 0.24), (A_TR_C, A_TR_H, 0.52)):
        gesims(zc, 0, vor, 6.00, 8.20, STUCK, 1, 'y', -1.90, zh)
        gesims(zc, 0, vor, 6.00, 8.20, STUCK, 1, 'x', -1.90, zh)
        zyl(TX, TY, zc, TR + vor - 0.02, zh, STUCK, 32)
    for i in range(8):                                       # Traufkonsolen
        box(-5.60 + i*1.05, 6.16, 14.16, 0.18, 0.40, 0.34, STUCK)
        box(6.16, -5.60 + i*1.05, 14.16, 0.40, 0.18, 0.34, STUCK)
    # --- Erdgeschoss: Portal in Fluegel A, Laeden ringsum
    PX = -4.60
    box(PX, 6.14, 1.90, 2.24, 0.32, 3.80, SOK)
    box(PX, 6.30, 1.60, 1.56, 0.10, 3.00, TUER)
    box(PX, 6.36, 3.34, 1.56, 0.06, 0.44, GLAS)
    box(PX, 6.62, 4.02, 2.40, 0.80, 0.20, STUCK)
    for s in (-1, 1):
        strebe_yz(6.10, 3.70, 6.92, 3.92, PX + s*0.90, 0.10, 0.10, MET)
        box(PX + s*0.98, 6.34, 2.60, 0.16, 0.16, 0.30, LICHT)
    stufen(PX, 6.30, 0.0, 1.90, 0.16, SOK, 0.34, 1)
    for sx in (-1.70, 0.90):
        fenster(sx, 2.10, 1.90, 2.40, 6.10, FEN, GLAS, 1, 'y', STUCK, None, 1, 1)
    for sy in (-4.60, -2.00, 0.60):
        fenster(sy, 2.10, 1.90, 2.40, 6.10, FEN, GLAS, 1, 'x', STUCK, None, 1, 1)
    # --- Regelgeschosse
    for (zz, hh, bg) in ((A_W1, A_W1H, False), (A_W2, A_W2H, True), (A_W3, A_W3H, False)):
        for sx in (-4.60, -2.20, 0.20):
            fenster(sx, zz, 1.24, hh, 6.00, FEN, GLAS, 1, 'y', STUCK,
                    STUCK if zz != A_W3 else None, 1, 1, None, bg)
        for sy in (-4.60, -2.20, 0.20):
            fenster(sy, zz, 1.24, hh, 6.00, FEN, GLAS, 1, 'x', STUCK,
                    STUCK if zz != A_W3 else None, 1, 1, None, bg)
        for a in (math.radians(6), math.radians(45), math.radians(84)):
            rundfenster(TX, TY, TR, a, zz, 1.10, hh, FEN, GLAS, STUCK)
    for sx in (-4.60, -2.20, 0.20):                          # Franz. Balkone Beletage
        box(sx, 6.32, A_W1 - A_W1H/2 + 0.42, 1.58, 0.10, 0.84, MET)
    for sy in (-4.60, -2.20, 0.20):
        box(6.32, sy, A_W1 - A_W1H/2 + 0.42, 0.10, 1.58, 0.84, MET)
    for a in (math.radians(6), math.radians(45), math.radians(84)):
        o = box(TX + math.cos(a)*(TR + 0.22), TY + math.sin(a)*(TR + 0.22),
                A_W1 - A_W1H/2 + 0.42, 0.10, 1.40, 0.84, MET)
        o.rotation_euler[2] = a
    # --- Brandwaende: x = -6.00 und y = -6.00 bleiben ABSOLUT glatt.
    # Erste Fassung hatte dort Fenster mit Sims — die 0.24 m Ueberstand haetten das
    # anstossende 8-m-Modul durchdrungen (gemessen x_min = -6.24).
    for zz in (2.10, A_W1, A_W2, A_W3):
        for sy in (-4.4, -1.6, 1.2, 4.0):
            box(-6.00 + 0.04, sy, zz, 0.06, 1.10, 1.60, PUTZ)     # angedeutete Blendnische
        for sx in (-4.4, -1.6, 1.2, 4.0):
            box(sx, -6.00 + 0.04, zz, 1.10, 0.06, 1.60, PUTZ)
    # --- Mansarddach, Oberkante EXAKT 16.00, dann die Turmhaube
    strebe_yz(6.00, 14.86, 5.10, 15.80, -1.90, 0.22, 8.20, DACH)
    strebe_xz(6.00, 14.86, 5.10, 15.80, -1.90, 0.22, 8.20, DACH)
    box(-1.90,-0.45, 15.88, 8.20, 11.10, 0.24, DACH)
    box( 3.65,-1.90, 15.88, 2.90,  8.20, 0.24, DACH)
    box(-4.20,-4.20, 15.60, 0.80, 0.80, 1.60, RUST)          # Schornstein
    box(-4.20,-4.20, 16.46, 0.94, 0.94, 0.18, SOK)
    zyl(TX, TY, 16.02, TR + 0.30, 0.36, STUCK, 32)           # Traufring des Turms
    kegel(TX, TY, 17.15, TR + 0.16, 1.30, 1.90, KUPF, 28)    # 16.20 .. 18.10
    o = kugel(TX, TY, 18.60, 1.32, KUPF, 22); o.scale[2] = 0.86
    zyl(TX, TY, 19.55, 0.34, 0.60, KUPF, 16)
    kegel(TX, TY, 20.20, 0.42, 0.06, 0.70, KUPF, 16)
    zyl(TX, TY, 20.95, 0.06, 0.86, GOLD, 10)
    kugel(TX, TY, 21.30, 0.20, GOLD, 12)
    box(TX + 0.30, TY, 21.30, 0.52, 0.05, 0.34, GOLD)        # Wetterfahne
    export("th22_altbau_eck", 0.018, 2)

# ================================================================ 3) Plattenbau-Modul
def plattenbau_modul():
    """Plattenbau-Segment, exakt 12.00 m breit und 15.00 m hoch, Reihung x += 12.00.
    Die Balkonplatten, die Bruestungen und die Handlaeufe laufen exakt ueber die
    volle Modulbreite -> an der Fuge entsteht EINE durchgehende Balkonreihe.
    Balkon-Trennwaende sitzen nur an der LINKEN Kante und im Feld; an der rechten
    Kante steht keine, sonst haetten zwei Module an jeder Fuge eine Doppelwand."""
    neu()
    PLAT = mat("Betonplatte", (0.63,0.62,0.58), 0.92)
    PLA2 = mat("Betonplatte hell", (0.72,0.71,0.67), 0.90)
    FUGE = mat("Plattenfuge", (0.40,0.40,0.38), 0.95)
    SOK  = mat("Sockelbeton", (0.38,0.38,0.37), 0.94)
    BRUE = mat("Bruestungsplatte", (0.50,0.58,0.62), 0.86)
    BRU2 = mat("Bruestung farbig", (0.80,0.52,0.20), 0.82)
    BET  = mat("Balkonbeton", (0.66,0.65,0.62), 0.90)
    MET  = mat("Handlauf", (0.52,0.54,0.57), 0.40, 0.5)
    FEN  = mat("Fensterrahmen", (0.92,0.92,0.90), 0.55)
    GLAS = mat("Fensterglas", (0.34,0.45,0.54), 0.14, 0.25)
    TUER = mat("Hauseingang", (0.30,0.36,0.42), 0.55)
    LICHT= mat("Eingangslicht", (1.0,0.93,0.74), 0.30, 0.0, (1.0,0.90,0.66), 1.8)
    GRUE = mat("Balkongruen", (0.22,0.46,0.18), 0.88)
    TOPF = mat("Blumenkasten", (0.58,0.30,0.20), 0.88)
    B, T, H, YF = 12.0, 12.0, 15.0, 6.0
    ZG = [0.40 + i*2.80 for i in range(6)]                   # 0.40 .. 14.40
    # --- Baukoerper
    box(0, 0, H/2, B, T, H, PLAT)
    box(0, YF - 0.06, H/2, B, 0.12, H, PLA2)
    box(0, -T/2 + 0.06, H/2, B, 0.12, H, PLA2)
    box(0, YF - 0.02, 0.20, B, 0.22, 0.40, SOK)              # Sockel
    box(0, -T/2 + 0.02, 0.20, B, 0.22, 0.40, SOK)
    for z in ZG:                                             # waagrechte Plattenfugen
        box(0, YF + 0.03, z, B, 0.06, 0.07, FUGE)
        box(0, -T/2 - 0.03, z, B, 0.06, 0.07, FUGE)
    for sx in (-3.0, 0.0, 3.0):                              # senkrechte Fugen
        box(sx, YF + 0.03, 7.40, 0.07, 0.06, 14.0, FUGE)
        box(sx, -T/2 - 0.03, 7.40, 0.07, 0.06, 14.0, FUGE)
    # --- Balkonreihe: 4 Ebenen, Platte 12.00 m -> laeuft ueber die Fuge weiter
    for z in ZG[1:5]:
        box(0, YF + 0.80, z + 0.09, B, 1.60, 0.18, BET)      # Platte
        box(0, YF + 1.53, z + 0.70, B, 0.14, 1.04, BRUE)     # Bruestung, volle Breite
        box(0, YF + 1.53, z + 0.98, B, 0.17, 0.22, BRU2)     # Farbstreifen
        box(0, YF + 1.53, z + 1.25, B, 0.20, 0.06, MET)      # Handlauf, volle Breite
        for tx in (-5.93, -3.0, 0.0, 3.0):                   # Trennwaende, linke Kante!
            box(tx, YF + 0.82, z + 0.73, 0.14, 1.56, 1.10, BET)
        for i, bc in enumerate((-4.5, -1.5, 1.5, 4.5)):      # Balkontuer + Fenster
            fenster(bc - 0.72, z + 1.35, 1.06, 2.30, YF, FEN, GLAS, 1, 'y', None, None, 1, 1)
            fenster(bc + 0.68, z + 1.55, 1.16, 1.50, YF, FEN, GLAS, 1, 'y', None, None, 1, 1)
            if i % 2 == 0:                                   # Blumenkasten aussen
                box(bc, YF + 1.68, z + 1.02, 1.40, 0.28, 0.26, TOPF)
                for k in range(3):
                    pflanze(bc - 0.44 + k*0.44, YF + 1.68, z + 1.14, 0.22, 0.34, GRUE, None, 3)
    # --- Erdgeschoss: zwei Hauseingaenge, Kellerfenster
    for sx in (-3.0, 3.0):
        box(sx, YF + 0.10, 1.65, 2.30, 0.24, 2.90, SOK)
        box(sx, YF + 0.26, 1.45, 1.70, 0.10, 2.50, TUER)
        box(sx, YF + 0.32, 1.90, 1.30, 0.06, 1.30, GLAS)
        box(sx, YF + 0.30, 3.02, 1.90, 0.16, 0.22, MET)
        box(sx + 0.98, YF + 0.28, 2.30, 0.30, 0.12, 0.44, LICHT)
        box(sx - 0.96, YF + 0.30, 1.90, 0.26, 0.10, 0.36, MET)     # Klingeltableau
        stufen(sx, YF + 0.24, 0.0, 2.00, 0.20, SOK, 0.34, 1)
    for sx in (-5.0, -1.0, 1.0, 5.0):
        fenster(sx, 2.05, 1.30, 1.40, YF, FEN, GLAS, 1, 'y', SOK, None, 1, 1)
    # --- Rueckfassade: schlichtes Fensterraster
    for z in ZG[:5]:
        for sx in (-4.5, -1.5, 1.5, 4.5):
            fenster(sx, z + 1.55, 1.30, 1.55, -T/2, FEN, GLAS, -1, 'y', SOK, None, 1, 1)
    # --- Dach: Attika nur vorn und hinten (an den Flanken waere sie an jeder Fuge doppelt)
    box(0, 0, 14.48, B, T, 0.16, SOK)                        # Dachdeck 14.40 .. 14.56
    box(0, YF - 0.15, 14.70, B, 0.30, 0.60, PLA2)            # 14.40 .. 15.00 EXAKT
    box(0, -T/2 + 0.15, 14.70, B, 0.30, 0.60, PLA2)
    # Dachaufbauten enden ebenfalls bei 15.00 — hoehere Kappen sprengen das Raster.
    for sx in (-2.6, 2.6):                                   # Lueftungskoepfe
        zyl(sx, -3.4, 14.78, 0.34, 0.44, SOK, 14)
    box(0, -1.2, 14.78, 1.60, 1.60, 0.44, SOK)               # Aufzugsueberfahrt
    export("th22_plattenbau_modul", 0.018, 2)

# ---------------------------------------------------------------- Garten-/Terrassenmoebel
def gartentisch(px, py, pz, m_platte, m_bein, b=1.60, t=0.90, h=0.74):
    box(px, py, pz + h - 0.03, b, t, 0.06, m_platte)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(px + sx*(b/2 - 0.12), py + sy*(t/2 - 0.10), pz + (h - 0.06)/2,
                0.07, 0.07, h - 0.06, m_bein)
    box(px, py, pz + 0.18, b - 0.30, 0.06, 0.06, m_bein)

def gartenstuhl(px, py, pz, m_sitz, m_bein, s=1):
    """s = +1: Rueckenlehne auf +y (der Stuhl blickt nach -y)."""
    box(px, py, pz + 0.42, 0.48, 0.48, 0.06, m_sitz)
    box(px, py + s*0.22, pz + 0.68, 0.48, 0.06, 0.46, m_sitz)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(px + sx*0.20, py + sy*0.20, pz + 0.20, 0.05, 0.05, 0.40, m_bein)

def liege(px, py, pz, m_polster, m_rahmen, s=1):
    box(px, py, pz + 0.36, 0.74, 1.90, 0.10, m_rahmen)
    box(px, py, pz + 0.44, 0.70, 1.86, 0.08, m_polster)
    o = box(px, py + s*0.70, pz + 0.66, 0.70, 0.62, 0.08, m_polster)
    o.rotation_euler[0] = -s*math.radians(38)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(px + sx*0.30, py + sy*0.78, pz + 0.16, 0.06, 0.06, 0.32, m_rahmen)

def sonnenschirm(px, py, pz, m_mast, m_tuch, r=1.70, h=2.35):
    zyl(px, py, pz + h/2, 0.055, h, m_mast, 10)
    kegel(px, py, pz + h - 0.34, r, 0.10, 0.52, m_tuch, 16)
    for i in range(8):
        a = i/8*math.tau
        box(px + math.cos(a)*r*0.55, py + math.sin(a)*r*0.55, pz + h - 0.50,
            0.05, 0.05, 0.05, m_mast)
    zyl(px, py, pz + 0.07, 0.42, 0.14, m_mast, 14)

def dachrand(cx, cy, B, T, z, dicke, breite, m):
    """Attika-/Blechrand als RING um die Dachflaeche. Eine Vollplatte darueber
    verdeckt die dunkle Dachhaut und das Flachdach wirkt als weisser Klotz."""
    for sy in (-1, 1):
        box(cx, cy + sy*(T/2 - breite/2), z, B, breite, dicke, m)
    for sx in (-1, 1):
        box(cx + sx*(B/2 - breite/2), cy, z, breite, T - 2*breite, dicke, m)

def hecke(cx, cy, laenge, tiefe, pz, hoehe, m, achse='x', n=None):
    """Hecke aus ueberlappenden Quadern — ein einzelner Balken wirkt wie eine Mauer."""
    n = n or max(2, int(laenge / 1.1))
    for i in range(n):
        t = (i + 0.5)/n*laenge - laenge/2
        d = 0.06 if i % 2 else 0.0
        if achse == 'x': box(cx + t, cy, pz + hoehe/2, laenge/n*1.06, tiefe + d, hoehe - d, m)
        else:            box(cx, cy + t, pz + hoehe/2, tiefe + d, laenge/n*1.06, hoehe - d, m)

# ================================================================ 4) Villa
def villa():
    """Freistehende Villa mit Walmdach, Erker, angebauter Garage und Vorgarten-Sockel.
    Das Walmdach ist ein echtes Mesh (`walmdach`) — vier gekippte Platten lassen an
    den Graten Schlitze klaffen. Die Dachunterseite liegt exakt auf der Wandkrone."""
    neu()
    PUTZ = mat("Villenputz", (0.90,0.87,0.79), 0.84)
    PUT2 = mat("Sockelputz", (0.68,0.64,0.57), 0.90)
    SOK  = mat("Naturstein", (0.58,0.55,0.50), 0.92)
    ZIEG = mat("Dachziegel", (0.50,0.22,0.15), 0.74)
    HOLZ = mat("Holzwerk", (0.42,0.27,0.15), 0.80)
    FEN  = mat("Fensterrahmen", (0.96,0.95,0.92), 0.55)
    GLAS = mat("Fensterglas", (0.34,0.46,0.55), 0.14, 0.25)
    LADE = mat("Fensterladen", (0.22,0.34,0.30), 0.78)
    TUER = mat("Haustuer", (0.28,0.15,0.10), 0.52)
    TOR  = mat("Garagentor", (0.40,0.42,0.45), 0.55)
    FLAD = mat("Garagen-Flachdach", (0.33,0.33,0.32), 0.90)
    MET  = mat("Metall", (0.50,0.52,0.55), 0.40, 0.5)
    RAS  = mat("Rasen", (0.28,0.46,0.20), 0.94)
    WEG  = mat("Plattenweg", (0.70,0.68,0.64), 0.92)
    GRUE = mat("Buchsgruen", (0.18,0.40,0.15), 0.90)
    KRON = mat("Baumkrone", (0.20,0.44,0.17), 0.90)
    STAM = mat("Stamm", (0.32,0.22,0.13), 0.88)
    LICHT= mat("Aussenlicht", (1.0,0.93,0.74), 0.30, 0.0, (1.0,0.90,0.66), 1.8)
    HX, HB, HT, HW = -3.50, 13.0, 10.0, 7.20            # Haus: x -10.00 .. 3.00
    GX, GB, GT, GW =  6.20,  6.40, 6.40, 3.20          # Garage: x 3.00 .. 9.40
    YF = HT/2                                           # Fassade +y bei 5.00
    # --- Grundstueck
    box(-0.30, 0, FB/2, 23.0, 17.0, FB, RAS)
    box(-3.50, 6.90, FB + 0.02, 2.60, 4.20, 0.06, WEG)  # Weg zur Haustuer
    box( 6.20, 6.20, FB + 0.02, 6.40, 5.60, 0.06, WEG)  # Einfahrt
    hecke(-0.30, 8.05, 22.0, 0.70, FB, 0.85, GRUE, 'x')
    hecke(-11.05, 0.0, 16.0, 0.70, FB, 0.85, GRUE, 'y')
    # --- Baukoerper
    box(HX, 0, HW/2, HB, HT, HW, PUTZ)
    box(HX, 0, 0.50, HB + 0.20, HT + 0.20, 1.00, PUT2)  # Sockelgeschoss
    box(HX, YF - 0.05, HW/2, HB, 0.10, HW, PUTZ)
    box(HX, 0, HW - 0.16, HB + 0.24, HT + 0.24, 0.32, SOK)   # Traufgesims
    # --- Erker auf der Schauseite
    EX, EB, EY = -7.00, 3.00, YF + 1.10
    box(EX, YF + 0.55, 3.45, EB, 1.10, 6.90, PUTZ)
    box(EX, YF + 0.55, 0.50, EB + 0.20, 1.30, 1.00, PUT2)
    for zz, hh in ((2.30, 2.00), (5.40, 1.70)):
        fenster(EX, zz, 1.30, hh, EY, FEN, GLAS, 1, 'y', SOK, None, 1, 1)
        for sx in (-1, 1):
            fenster(YF + 0.55, zz, 0.72, hh*0.9, EX + sx*EB/2, FEN, GLAS, sx, 'x', SOK, None, 0, 1)
    walmdach(EX, YF + 0.55, EB, 1.10, 6.90, 0.80, 1.30, ZIEG, 0.30)
    # --- Haustuer mit Vordach
    box(HX, YF + 0.16, 1.60, 2.40, 0.36, 3.20, SOK)
    box(HX, YF + 0.34, 1.35, 1.60, 0.10, 2.50, TUER)
    box(HX, YF + 0.40, 1.90, 0.90, 0.05, 1.10, GLAS)
    box(HX, YF + 0.90, 3.42, 3.20, 1.80, 0.22, SOK)     # Vordach
    for sx in (-1, 1):
        zyl(HX + sx*1.30, YF + 1.55, (FB + 3.31)/2, 0.16, 3.31 - FB, SOK, 14)
        box(HX + sx*1.44, YF + 0.30, 2.30, 0.18, 0.14, 0.34, LICHT)
    stufen(HX, YF + 0.30, 0.0, 2.20, FB, SOK, 0.34, 1)
    # --- Fenster Haus
    for sx in (-1.20, 1.30):
        fenster(sx, 2.30, 1.40, 2.00, YF, FEN, GLAS, 1, 'y', SOK, None, 1, 1, LADE)
    for sx in (-8.20, -5.60, -1.20, 1.30):
        fenster(sx, 5.40, 1.30, 1.70, YF, FEN, GLAS, 1, 'y', SOK, None, 1, 1, LADE)
    for sy in (-3.0, 0.0, 3.0):
        for zz, hh in ((2.30, 2.00), (5.40, 1.70)):
            fenster(sy, zz, 1.30, hh, HX - HB/2, FEN, GLAS, -1, 'x', SOK, None, 1, 1, LADE)
    for sx in (-8.0, -5.0, -2.0, 1.0):
        for zz, hh in ((2.30, 2.00), (5.40, 1.70)):
            fenster(sx, zz, 1.30, hh, -HT/2, FEN, GLAS, -1, 'y', SOK, None, 1, 1)
    # --- Walmdach: Unterseite exakt auf der Wandkrone 7.20
    walmdach(HX, 0, HB, HT, HW, 3.00, 6.00, ZIEG, 0.65)
    box(HX, 0, HW + 3.00, 6.10, 0.34, 0.22, ZIEG)       # Firstziegel
    for sx in (-6.40, -0.70):                            # Gauben
        box(sx, 3.30, 8.45, 1.60, 1.50, 1.50, PUTZ)
        walmdach(sx, 3.30, 1.60, 1.50, 9.20, 0.60, 0.60, ZIEG, 0.20)
        fenster(sx, 8.50, 1.00, 1.00, 4.06, FEN, GLAS, 1, 'y', None, None, 1, 1)
    box(-8.60, -2.60, 9.40, 0.90, 0.90, 1.70, PUT2)     # Schornstein
    box(-8.60, -2.60, 10.34, 1.06, 1.06, 0.18, SOK)
    # --- Garage
    box(GX, 0, GW/2, GB, GT, GW, PUTZ)
    box(GX, 0, 0.50, GB + 0.16, GT + 0.16, 1.00, PUT2)
    box(GX, 0, GW + 0.16, GB + 0.60, GT + 0.60, 0.32, FLAD)  # Dachplatte buendig
    dachrand(GX, 0, GB + 0.66, GT + 0.66, GW + 0.44, 0.24, 0.28, PUT2)
    box(GX, GT/2 + 0.06, 1.30, 4.60, 0.20, 2.60, SOK)        # Torlaibung
    box(GX, GT/2 + 0.18, 1.28, 4.20, 0.12, 2.40, TOR)        # Sektionaltor
    for i in range(5):
        box(GX, GT/2 + 0.26, 0.34 + i*0.48, 4.10, 0.04, 0.06, MET)
    box(GX, GT/2 + 0.26, 2.62, 4.30, 0.14, 0.16, MET)
    box(GX + GB/2 + 0.06, -1.60, 1.55, 0.14, 1.00, 2.30, TUER)   # Nebentuer
    box(GX - 2.60, GT/2 + 0.12, 2.90, 0.20, 0.16, 0.36, LICHT)
    # --- Vorgarten
    baum(-9.60, 6.60, FB, 4.6, STAM, KRON, 1.7)
    baum( 9.20, -5.40, FB, 4.0, STAM, KRON, 1.5)
    for i in range(4):
        pflanze(-5.40 + i*0.95, 6.40, FB, 0.42, 0.80, GRUE, None, 4)
    for i in range(3):
        pflanze(-1.60, 5.90 + i*0.90, FB, 0.40, 0.75, GRUE, None, 4)
    export("th22_villa", 0.018, 2)

# ================================================================ 5) Bungalow
def bungalow():
    """Flacher Bungalow mit vorgelagerter Terrasse und Carport. Flachdach mit
    kraeftigem Ueberstand, Terrassenplatte auf FB, Moebel auf FB + Hoehe."""
    neu()
    PUTZ = mat("Bungalowputz", (0.88,0.86,0.80), 0.86)
    HOLZ = mat("Holzverschalung", (0.52,0.35,0.19), 0.82)
    HOL2 = mat("Terrassendiele", (0.58,0.42,0.24), 0.84)
    SOK  = mat("Sichtbeton", (0.62,0.61,0.58), 0.90)
    DACH = mat("Flachdach", (0.34,0.34,0.33), 0.88)
    ATTI = mat("Dachrand", (0.74,0.73,0.70), 0.80)
    FEN  = mat("Fensterrahmen", (0.28,0.29,0.31), 0.55)
    GLAS = mat("Fensterglas", (0.36,0.48,0.56), 0.14, 0.25)
    TUER = mat("Haustuer", (0.30,0.34,0.22), 0.55)
    MET  = mat("Metall", (0.52,0.54,0.57), 0.40, 0.5)
    RAS  = mat("Rasen", (0.28,0.46,0.20), 0.94)
    WEG  = mat("Wegplatten", (0.70,0.68,0.64), 0.92)
    GRUE = mat("Gruen", (0.19,0.42,0.16), 0.90)
    KRON = mat("Baumkrone", (0.21,0.46,0.18), 0.90)
    STAM = mat("Stamm", (0.32,0.22,0.13), 0.88)
    POL  = mat("Polster", (0.86,0.83,0.74), 0.86)
    TUCH = mat("Schirmtuch", (0.82,0.42,0.26), 0.88)
    TOPF = mat("Pflanzkuebel", (0.56,0.52,0.48), 0.90)
    LICHT= mat("Aussenlicht", (1.0,0.93,0.74), 0.30, 0.0, (1.0,0.90,0.66), 1.8)
    HX, HB, HT, HW = 1.00, 14.0, 9.0, 3.40             # Haus x -6.00 .. 8.00
    YF = HT/2                                           # 4.50
    box(-2.00, 0, FB/2, 25.0, 19.0, FB, RAS)
    box( 0.00, 6.80, FB + 0.02, 11.0, 4.60, 0.06, HOL2)     # Terrassendeck
    for i in range(11):
        box(-5.0 + i*1.0, 6.80, FB + 0.06, 0.94, 4.52, 0.04, HOL2 if i % 2 else SOK)
    box( 6.60, 6.60, FB + 0.02, 2.40, 5.00, 0.06, WEG)      # Weg zur Haustuer
    hecke(-2.00, 9.00, 24.0, 0.70, FB, 0.90, GRUE, 'x')
    # --- Baukoerper
    box(HX, 0, HW/2, HB, HT, HW, PUTZ)
    box(HX, 0, 0.22, HB + 0.24, HT + 0.24, 0.44, SOK)
    box(HX - 4.20, YF - 0.05, HW/2, 5.20, 0.12, HW, HOLZ)   # Holzfeld an der Front
    box(HX, 0, HW + 0.16, HB + 1.40, HT + 1.40, 0.32, DACH) # Dach buendig auf 3.40
    dachrand(HX, 0, HB + 1.46, HT + 1.46, HW + 0.40, 0.16, 0.34, ATTI)
    # --- Fensterfront zur Terrasse
    for sx in (-3.60, -1.20, 1.20):
        fenster(sx, 1.90, 1.90, 2.40, YF, FEN, GLAS, 1, 'y', SOK, None, 1, 1)
    box(-1.20, YF + 0.13, 0.36, 6.30, 0.22, 0.12, SOK)      # Schwelle
    box(6.20, YF + 0.12, 1.55, 2.10, 0.24, 2.70, SOK)       # Hauseingang
    box(6.20, YF + 0.28, 1.35, 1.40, 0.10, 2.40, TUER)
    box(6.20, YF + 0.34, 2.10, 0.36, 0.05, 1.30, GLAS)
    box(6.20, YF + 0.85, 2.94, 2.60, 1.60, 0.18, DACH)      # Eingangsvordach
    box(7.42, YF + 0.26, 2.20, 0.18, 0.14, 0.34, LICHT)
    stufen(6.20, YF + 0.24, 0.0, 1.90, FB, SOK, 0.32, 1)
    for sy in (-2.60, 0.60):
        fenster(sy, 2.10, 1.40, 1.50, HX + HB/2, FEN, GLAS, 1, 'x', SOK, None, 1, 1)
    for sx in (-4.0, -0.5, 3.0, 6.0):
        fenster(sx, 2.10, 1.40, 1.50, -HT/2, FEN, GLAS, -1, 'y', SOK, None, 1, 1)
    # --- Carport auf der linken Seite
    CX, CB, CT, CH = -9.20, 6.40, 6.20, 2.90
    box(CX, 0, CH + 0.14, CB + 0.90, CT + 0.90, 0.28, DACH)
    dachrand(CX, 0, CB + 0.96, CT + 0.96, CH + 0.34, 0.14, 0.28, ATTI)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(CX + sx*(CB/2 - 0.20), sy*(CT/2 - 0.20), (FB + CH)/2,
                0.22, 0.22, CH - FB, HOLZ)
    for sy in (-1, 1):                                       # Kopfbaender
        strebe_yz(sy*(CT/2 - 0.20), CH - 0.85, sy*(CT/2 - 0.95), CH - 0.06,
                  CX - CB/2 + 0.20, 0.12, 0.12, HOLZ)
        strebe_yz(sy*(CT/2 - 0.20), CH - 0.85, sy*(CT/2 - 0.95), CH - 0.06,
                  CX + CB/2 - 0.20, 0.12, 0.12, HOLZ)
    box(CX, 0, FB + 0.03, CB, CT, 0.06, SOK)                 # Stellplatz
    box(CX - CB/2 + 0.10, 0, (FB + CH)/2, 0.12, CT - 0.6, CH - FB - 0.3, HOLZ)  # Rueckwand
    # --- Terrasse: Moebel auf FB + Hoehe
    gartentisch(-1.60, 6.60, FB + 0.06, HOL2, MET, 1.70, 0.95, 0.74)
    for sy, s in ((5.90, -1), (7.30, 1)):
        for sx in (-2.30, -0.90):
            gartenstuhl(sx, sy, FB + 0.06, POL, MET, s)
    sonnenschirm(1.90, 6.60, FB + 0.06, MET, TUCH, 1.70, 2.35)
    liege(3.40, 6.90, FB + 0.06, POL, MET, 1)
    liege(4.40, 6.90, FB + 0.06, POL, MET, 1)
    for i in range(3):
        pflanze(-4.60 + i*0.90, 7.90, FB + 0.06, 0.42, 0.86, GRUE, TOPF, 4)
    baum(-11.00, 7.20, FB, 4.2, STAM, KRON, 1.6)
    baum( 8.40, -6.20, FB, 3.8, STAM, KRON, 1.5)   # innerhalb der Platte, sonst schwebt er
    export("th22_bungalow", 0.018, 2)

# ================================================================ 6) Doppelhaus
def doppelhaus():
    """Zwei Doppelhaushaelften mit gemeinsamer Mittelwand und zwei Eingaengen.
    Satteldach mit First in x (`satteldach_x`) — das Standard-`satteldach` legt den
    First in y und wuerde die Giebel auf die Strassenseite drehen.
    Die Giebelscheiben bekommen halbt = T/2 + ueber_y, sonst ragt das Dreieck
    ueber die Dachflaeche hinaus."""
    neu()
    PUT1 = mat("PutzHaelfteA", (0.92,0.88,0.76), 0.86)
    PUT2 = mat("PutzHaelfteB", (0.66,0.71,0.72), 0.86)
    SOK  = mat("Sockelputz", (0.58,0.56,0.52), 0.92)
    ZIEG = mat("Dachziegel", (0.42,0.24,0.18), 0.76)
    STUCK= mat("Gesims", (0.94,0.93,0.89), 0.72)
    HOLZ = mat("Holzwerk", (0.44,0.28,0.16), 0.82)
    FEN  = mat("Fensterrahmen", (0.96,0.95,0.92), 0.55)
    GLAS = mat("Fensterglas", (0.34,0.46,0.55), 0.14, 0.25)
    LAD1 = mat("LaedenA", (0.24,0.36,0.30), 0.78)
    LAD2 = mat("LaedenB", (0.44,0.28,0.24), 0.78)
    TUE1 = mat("HaustuerA", (0.26,0.16,0.10), 0.52)
    TUE2 = mat("HaustuerB", (0.16,0.24,0.30), 0.52)
    MET  = mat("Metall", (0.50,0.52,0.55), 0.40, 0.5)
    RAS  = mat("Rasen", (0.28,0.46,0.20), 0.94)
    WEG  = mat("Wegplatten", (0.70,0.68,0.64), 0.92)
    GRUE = mat("Hecke", (0.18,0.40,0.15), 0.90)
    KRON = mat("Baumkrone", (0.21,0.46,0.18), 0.90)
    STAM = mat("Stamm", (0.32,0.22,0.13), 0.88)
    LICHT= mat("Aussenlicht", (1.0,0.93,0.74), 0.30, 0.0, (1.0,0.90,0.66), 1.8)
    B, T, HW, FH = 15.0, 9.5, 6.40, 3.40
    YF = T/2                                                 # 4.75
    box(0, 0, FB/2, 22.0, 17.0, FB, RAS)
    hecke(0, 8.05, 21.0, 0.70, FB, 0.90, GRUE, 'x')
    hecke(0, 6.60, 3.20, 0.60, FB, 1.00, GRUE, 'y')          # Trennhecke der Vorgaerten
    for sx in (-5.20, 5.20):
        box(sx, 6.60, FB + 0.02, 1.80, 3.60, 0.06, WEG)
    # --- Baukoerper: beide Haelften getrennt, gemeinsame Mittelwand bei x = 0
    for s, mm in ((-1, PUT1), (1, PUT2)):
        box(s*3.75, 0, HW/2, 7.50, T, HW, mm)
        box(s*3.75, 0, 0.42, 7.54, T + 0.16, 0.84, SOK)
        box(s*3.75, YF - 0.05, HW/2, 7.50, 0.10, HW, mm)
    box(0, 0, HW/2 + 0.15, 0.44, T + 0.30, HW + 0.30, SOK)   # gemeinsame Mittelwand
    box(0, 0, HW + 0.36, 0.60, T + 0.36, 0.34, SOK)
    for s in (-1, 1):                                        # Traufgesims je Haelfte
        box(s*3.75, YF + 0.10, HW - 0.14, 7.50, 0.40, 0.28, STUCK)
        box(s*3.75, -YF - 0.10, HW - 0.14, 7.50, 0.40, 0.28, STUCK)
    # --- Eingaenge
    for s, mt in ((-1, TUE1), (1, TUE2)):
        px = s*5.20
        box(px, YF + 0.14, 1.55, 2.00, 0.32, 3.10, SOK)
        box(px, YF + 0.30, 1.35, 1.30, 0.10, 2.50, mt)
        box(px, YF + 0.36, 2.10, 0.70, 0.05, 1.20, GLAS)
        box(px, YF + 0.80, 3.28, 2.40, 1.50, 0.20, HOLZ)     # Vordach
        strebe_yz(YF + 0.16, 2.60, YF + 1.10, 3.16, px - 0.86, 0.10, 0.10, HOLZ)
        strebe_yz(YF + 0.16, 2.60, YF + 1.10, 3.16, px + 0.86, 0.10, 0.10, HOLZ)
        box(px + s*1.16, YF + 0.28, 2.30, 0.18, 0.14, 0.34, LICHT)
        box(px - s*1.14, YF + 0.30, 1.85, 0.24, 0.10, 0.32, MET)   # Klingel
        stufen(px, YF + 0.26, 0.0, 1.70, FB, SOK, 0.32, 1)
    # --- Fenster
    for s, ld in ((-1, LAD1), (1, LAD2)):
        for sx in (1.30, 3.10):
            fenster(s*sx, 2.20, 1.30, 1.90, YF, FEN, GLAS, 1, 'y', STUCK, None, 1, 1, ld)
        for sx in (1.30, 3.10, 5.20):
            fenster(s*sx, 4.90, 1.30, 1.70, YF, FEN, GLAS, 1, 'y', STUCK, None, 1, 1, ld)
        for sy in (-2.60, 0.40, 3.00):
            for zz, hh in ((2.20, 1.90), (4.90, 1.70)):
                fenster(sy, zz, 1.20, hh, s*B/2, FEN, GLAS, s, 'x', STUCK, None, 1, 1, ld)
        for sx in (1.30, 3.60, 6.00):
            for zz, hh in ((2.20, 1.90), (4.90, 1.70)):
                fenster(s*sx, zz, 1.20, hh, -YF, FEN, GLAS, -1, 'y', STUCK, None, 1, 1)
    # --- Satteldach: First in x, Giebelscheiben auf +x/-x
    satteldach_x(0, 0, B, T, HW, FH, 0.26, ZIEG, 0.55, 0.65)
    box(0, 0, HW + FH + 0.10, B + 1.10, 0.34, 0.22, ZIEG)    # Firstziegel
    for s in (-1, 1):
        giebel_quer(s*(B/2 - 0.16), 0, HW, T/2 + 0.65, FH, 0.32, PUT1 if s < 0 else PUT2)
        strebe_yz(-T/2 - 0.65, HW, 0.0, HW + FH, s*(B/2 + 0.52), 0.22, 0.16, HOLZ)
        strebe_yz( T/2 + 0.65, HW, 0.0, HW + FH, s*(B/2 + 0.52), 0.22, 0.16, HOLZ)
        for sy in (-1, 1):                                   # Giebelfenster
            fenster(sy*1.70, HW + 1.10, 0.80, 1.00, s*(B/2 - 0.16), FEN, GLAS, s, 'x',
                    None, None, 1, 1)
    for s, mm in ((-1, PUT1), (1, PUT2)):                    # Gauben auf der Schauseite
        box(s*3.20, 2.60, HW + 1.05, 1.70, 1.90, 1.70, mm)
        satteldach_x(s*3.20, 2.60, 1.70, 1.90, HW + 1.90, 0.55, 0.14, ZIEG, 0.22, 0.24)
        fenster(s*3.20, HW + 1.15, 1.10, 1.10, 3.55, FEN, GLAS, 1, 'y', None, None, 1, 1)
    for s in (-1, 1):                                        # Schornsteine
        box(s*1.20, -1.80, HW + FH - 0.30, 0.68, 0.68, 2.20, SOK)
        box(s*1.20, -1.80, HW + FH + 0.86, 0.82, 0.82, 0.16, STUCK)
    baum(-8.60, 6.40, FB, 4.0, STAM, KRON, 1.5)
    baum( 8.60, 6.40, FB, 4.0, STAM, KRON, 1.5)
    export("th22_doppelhaus", 0.018, 2)

# ================================================================ 7) Hinterhof
def hinterhof():
    """BEGEHBAR: Blockrand mit Toreinfahrt, Hofdurchfahrt, Innenhof, drei
    Treppenhaus-Eingaengen, Muelltonnen und Fahrradstaender.
    Der Torbogen liegt als APPLIZIERTER Keilsteinring auf der Fassade (Innenradius
    2.18 > halbe Durchfahrtsbreite 2.10) — ein echter Bogen im Mauerwerk braeuchte
    Zwickelfuellungen, sonst klaffen ueber der Durchfahrt zwei Loecher.
    Aussensockel und Hofboden enden BEIDE auf FB, alle Einbauten auf FB + Hoehe."""
    neu()
    FASS = mat("Hoffassade", (0.80,0.75,0.66), 0.88)
    FAS2 = mat("Hofputz Fluegel", (0.72,0.70,0.63), 0.90)
    FAS3 = mat("Hofputz Rueckhaus", (0.68,0.64,0.58), 0.90)
    SOK  = mat("Sockelmauer", (0.50,0.48,0.45), 0.94)
    WERK = mat("Werkstein", (0.60,0.58,0.53), 0.90)
    STUCK= mat("Gesims", (0.90,0.88,0.83), 0.76)
    PFLA = mat("Hofpflaster", (0.47,0.46,0.44), 0.94)
    PFL2 = mat("Pflaster hell", (0.55,0.54,0.51), 0.93)
    ASPH = mat("Gehweg", (0.40,0.40,0.40), 0.95)
    DACH = mat("Dachpappe", (0.28,0.28,0.28), 0.90)
    FEN  = mat("Fensterrahmen", (0.92,0.91,0.87), 0.55)
    GLAS = mat("Fensterglas", (0.32,0.42,0.50), 0.14, 0.25)
    TOR  = mat("Hoftor", (0.24,0.30,0.24), 0.62)
    TUER = mat("Treppenhaustuer", (0.26,0.16,0.11), 0.55)
    MET  = mat("Metall", (0.46,0.48,0.51), 0.40, 0.5)
    MUEL = mat("Muelltonne", (0.22,0.26,0.22), 0.80)
    MUE2 = mat("Tonnendeckel", (0.62,0.55,0.14), 0.75)
    MUE3 = mat("Tonnendeckel blau", (0.16,0.30,0.52), 0.75)
    GRUE = mat("Hofgruen", (0.20,0.44,0.17), 0.90)
    KRON = mat("Baumkrone", (0.22,0.46,0.18), 0.90)
    STAM = mat("Stamm", (0.32,0.22,0.13), 0.88)
    TOPF = mat("Pflanzkuebel", (0.54,0.30,0.20), 0.88)
    LICHT= mat("Hoflicht", (1.0,0.92,0.72), 0.30, 0.0, (1.0,0.88,0.62), 2.0)
    B, T, HW = 26.0, 24.0, 12.0
    DB, DY0, DY1 = 2.10, 7.50, 12.00                 # halbe Durchfahrt, Fluegeltiefe
    ZG = (1.90, 4.80, 7.65, 10.50)                   # Fensterachsen der 4 Geschosse
    boden(B, T, ASPH, PFLA, 3.0)
    box(0, 0, FB + 0.02, 17.6, 15.2, 0.06, PFL2)     # heller Hofbelag
    for i in range(9):                               # Pflasterfugen
        box(0, -7.4 + i*1.9, FB + 0.05, 17.6, 0.08, 0.04, PFLA)
    box(0, 9.75, FB + 0.03, 4.10, 4.50, 0.06, PFL2)  # Durchfahrtsspur
    # --- Vorderhaus mit Durchfahrt
    for sx in (-1, 1):
        box(sx*(B/2 + DB)/2, 9.75, HW/2, B/2 - DB, DY1 - DY0, HW, FASS)
    box(0, 9.75, (4.60 + HW)/2, 2*DB, DY1 - DY0, HW - 4.60, FASS)    # Sturz ueber der Einfahrt
    for sx in (-1, 1):                               # Torgewaende
        box(sx*(DB + 0.28), 12.02, 2.45, 0.56, 0.40, 4.90, WERK)
    for i in range(11):                              # Keilsteinring
        w = math.pi*(i + 0.5)/11
        o = box(math.cos(w)*2.35, 12.16, 4.60 + math.sin(w)*2.35, 0.36, 0.30, 0.46, WERK)
        o.rotation_euler[1] = -w
    box(0, 12.20, 6.95, 0.52, 0.38, 0.74, WERK)      # Schlussstein
    box(0, 12.14, 7.60, 5.60, 0.28, 0.30, STUCK)
    for s in (-1, 1):                                # offene Torfluegel in der Durchfahrt
        box(s*(DB - 0.11), 11.40, 2.40, 0.14, 1.10, 4.20, TOR)
        for k in range(3):
            box(s*(DB - 0.17), 11.40, 1.10 + k*1.30, 0.06, 0.86, 0.14, MET)
    box(0, 9.75, 4.52, 4.20, 4.50, 0.16, WERK)       # Durchfahrtsdecke buendig auf 4.60
    for sy in (8.4, 11.1):
        box(0, sy, 4.34, 0.60, 0.24, 0.18, LICHT)    # Deckenleuchten
    box(0, 12.30, 3.60, 1.80, 0.14, 0.44, WERK)      # Hausnummernschild
    # --- Seitenfluegel und Rueckhaus
    for sx in (-1, 1):
        box(sx*11.0, -0.25, HW/2, 4.0, 15.5, HW, FAS2)
    box(0, -10.0, HW/2, B, 4.0, HW, FAS3)
    # --- Sockel und Gesimse
    for (cx, cy, bb, tt) in ((0, 9.75, B, DY1 - DY0), (-11.0, -0.25, 4.0, 15.5),
                             (11.0, -0.25, 4.0, 15.5), (0, -10.0, B, 4.0)):
        box(cx, cy, 0.55, bb + 0.16, tt + 0.16, 1.10, SOK)
    box(0, 12.16, 12.00, B, 0.44, 0.34, STUCK)       # Strassengesims
    # --- Strassenfassade
    for z in ZG:
        for sx in (-11.4, -8.7, -6.0, -3.3, 3.3, 6.0, 8.7, 11.4):
            fenster(sx, z, 1.24, 1.90, 12.00, FEN, GLAS, 1, 'y', WERK,
                    WERK if z < 5 else None, 1, 1)
    # --- Hoffassaden (Fenster kleiner, ohne Zierrat)
    for z in ZG:
        for sx in (-7.6, -5.0, -2.9, 2.9, 5.0, 7.6):
            fenster(sx, z, 1.10, 1.70, DY0, FEN, GLAS, -1, 'y', SOK, None, 1, 1)
        for sx in (-7.5, -4.5, 4.5, 7.5):
            fenster(sx, z, 1.10, 1.70, -8.0, FEN, GLAS, 1, 'y', SOK, None, 1, 1)
        for sy in (-6.0, -3.0, 3.0, 6.0):
            for sx in (-1, 1):
                fenster(sy, z, 1.10, 1.70, sx*9.0, FEN, GLAS, -sx, 'x', SOK, None, 1, 1)
        if z > 3:
            fenster(0, z, 1.30, 1.70, -8.0, FEN, GLAS, 1, 'y', SOK, None, 1, 1)
            for sx in (-1, 1):
                fenster(0, z, 1.30, 1.70, sx*9.0, FEN, GLAS, -sx, 'x', SOK, None, 1, 1)
    # --- Drei Treppenhaus-Eingaenge am Hof
    def eingang(px, py, wand, s, achse, nr):
        def bx(u, z, bb, hh, dd, oo, m):
            if achse == 'y': return box(u, wand + s*oo, z, bb, dd, hh, m)
            else:            return box(wand + s*oo, u, z, dd, bb, hh, m)
        a = px if achse == 'y' else py
        bx(a, 1.70, 2.10, 3.40, 0.26, 0.12, WERK)          # Gewaende
        bx(a, 1.45, 1.40, 2.50, 0.10, 0.28, TUER)          # Tuerblatt
        bx(a, 2.10, 0.90, 1.10, 0.05, 0.35, GLAS)
        bx(a, 3.10, 1.90, 0.44, 0.06, 0.34, GLAS)          # Oberlicht
        bx(a, 3.86, 2.30, 0.16, 1.10, 0.60, WERK)          # Vordach
        bx(a + 0.98, 3.20, 0.30, 0.34, 0.24, 0.24, LICHT)  # Lampe
        bx(a - 0.96, 1.90, 0.24, 0.34, 0.10, 0.32, MET)    # Klingeltableau
        bx(a, 3.55, 0.60, 0.30, 0.08, 0.32, WERK)          # Hausnummer
    eingang(0.0, 0.0, -8.0, 1, 'y', 1)
    eingang(0.0, 0.0, -9.0, 1, 'x', 2)
    eingang(0.0, 0.0,  9.0, -1, 'x', 3)
    # --- Hofausstattung (alles auf FB + Hoehe)
    box(-7.60, -6.20, FB + 0.03, 3.60, 2.20, 0.06, PFLA)          # Standplatz
    for i, (mm, md) in enumerate(((MUEL, MUE2), (MUEL, MUE3), (MUEL, MUE2), (MUEL, MUE3))):
        muelltonne(-8.85 + i*0.84, -6.20, FB, mm, md, MET)
    box(-7.60, -7.32, FB + 0.90, 3.70, 0.14, 1.80, FAS3)          # Sichtschutzwand
    for i in range(5):
        box(-9.20 + i*0.80, -7.24, FB + 0.90, 0.66, 0.06, 1.66, TOR)
    fahrradstaender(6.60, 2.00, FB, 5, MET, 'y', 0.78)
    box(6.60, 2.00, FB + 0.03, 1.60, 4.60, 0.06, PFLA)
    for i in range(3):                                            # Teppichstange
        box(-2.20 + i*2.20, -3.60, FB + 0.90, 0.10, 0.10, 1.80, MET)
    box(0.0, -3.60, FB + 1.78, 4.60, 0.09, 0.09, MET)
    baum(4.20, -4.60, FB, 5.2, STAM, KRON, 1.8)
    box(4.20, -4.60, FB + 0.10, 2.20, 2.20, 0.20, PFL2)
    for i in range(3):
        pflanze(-7.40 + i*1.40, 5.90, FB, 0.44, 0.90, GRUE, TOPF, 4)
    for i in range(2):
        pflanze(7.40, 5.60 - i*1.40, FB, 0.44, 0.90, GRUE, TOPF, 4)
    box(-4.60, 5.80, FB + 0.22, 1.80, 0.50, 0.10, TOPF)           # Bank
    box(-4.60, 6.02, FB + 0.62, 1.80, 0.10, 0.70, TOPF)
    for sx in (-5.30, -3.90):
        box(sx, 5.80, FB + 0.11, 0.10, 0.46, 0.22, MET)
    zyl(2.20, 6.40, FB + 0.02, 0.34, 0.06, MET, 14)               # Gully
    # --- Daecher (buendig auf der Wandkrone 12.00) und Attika
    box(0, 9.75, 12.15, B, 4.90, 0.30, DACH)
    for sx in (-1, 1): box(sx*11.0, -0.25, 12.15, 4.40, 15.50, 0.30, DACH)
    box(0, -10.0, 12.15, B, 4.40, 0.30, DACH)
    box(0, 11.86, 12.62, B, 0.42, 0.64, FASS)                     # Strassenattika
    for (sx, sy) in ((-8.0, 9.75), (8.0, 9.75), (-11.0, -4.0), (11.0, 4.0), (0.0, -10.0)):
        box(sx, sy, 13.10, 0.86, 0.86, 1.60, SOK)                 # Schornsteine
        box(sx, sy, 13.98, 1.02, 1.02, 0.18, STUCK)
    export("th22_hinterhof", 0.018, 2)

# ================================================================ 8) Dachterrasse
def dachterrasse():
    """Aufsatz-Modul fuer Flachdaecher, exakt 12.00 m breit (passt auf
    th22_plattenbau_modul). Bruestung und Handlauf laufen ueber die volle Breite,
    die Seitenbruestungen sind nach INNEN gesetzt, damit 12.00 exakt bleibt."""
    neu()
    DIEL = mat("Terrassendiele", (0.58,0.42,0.24), 0.84)
    DIE2 = mat("Diele dunkel", (0.47,0.33,0.19), 0.86)
    KIES = mat("Kiesstreifen", (0.60,0.58,0.54), 0.94)
    BRUE = mat("Bruestung", (0.74,0.73,0.70), 0.86)
    MET  = mat("Handlauf", (0.52,0.54,0.57), 0.40, 0.5)
    GLAS = mat("Windschutzglas", (0.62,0.74,0.80), 0.12, 0.0, None, 1.3, 0.36)
    HOLZ = mat("Pergolaholz", (0.50,0.35,0.20), 0.84)
    HOL2 = mat("Pergola dunkel", (0.40,0.27,0.15), 0.86)
    TUCH = mat("Sonnensegel", (0.86,0.82,0.70), 0.90)
    POL  = mat("Polster", (0.84,0.80,0.72), 0.86)
    POL2 = mat("Kissen", (0.36,0.52,0.56), 0.86)
    GRUE = mat("Blattgruen", (0.20,0.46,0.17), 0.90)
    GRU2 = mat("Graeser", (0.42,0.56,0.24), 0.90)
    TOPF = mat("Pflanzkuebel", (0.52,0.48,0.44), 0.90)
    TOP2 = mat("Terrakotta", (0.60,0.32,0.20), 0.88)
    LICHT= mat("Lichterkette", (1.0,0.90,0.68), 0.30, 0.0, (1.0,0.86,0.58), 2.0)
    B, T = 12.0, 8.0
    box(0, 0, 0.06, B, T, 0.12, DIE2)                        # Traegerdeck
    for i in range(16):                                      # Dielung
        box(0, -T/2 + 0.25 + i*0.50, 0.15, B - 0.60, 0.46, 0.06, DIEL if i % 2 else DIE2)
    for sx in (-1, 1):
        box(sx*(B/2 - 0.15), 0, 0.15, 0.30, T, 0.06, KIES)   # Kiesstreifen an den Flanken
    # --- Bruestung: vorn/hinten volle 12.00, Flanken nach innen gesetzt
    # Handlaeufe hoechstens so breit wie die Bruestung (0.18) — mit 0.24 lag der
    # seitliche Handlauf auf +-6.03 und das 12.00-m-Raster war hin.
    for sy in (-1, 1):
        box(0, sy*(T/2 - 0.09), 0.68, B, 0.18, 1.00, BRUE)
        box(0, sy*(T/2 - 0.09), 1.21, B, 0.18, 0.07, MET)
    for sx in (-1, 1):
        box(sx*(B/2 - 0.09), 0, 0.68, 0.18, T - 0.36, 1.00, BRUE)
        box(sx*(B/2 - 0.09), 0, 1.21, 0.18, T - 0.36, 0.07, MET)
    for i in range(6):                                       # Windschutz aus Glas
        box(-4.4 + i*1.76, T/2 - 0.10, 1.72, 1.64, 0.05, 0.96, GLAS)
        box(-4.4 + i*1.76, T/2 - 0.10, 1.24, 1.70, 0.09, 0.08, MET)
    for i in range(7):
        box(-5.28 + i*1.76, T/2 - 0.10, 1.72, 0.08, 0.10, 0.96, MET)
    # --- Pergola
    for sx in (-3.60, 0.0, 3.60):
        for sy in (-1.50, 1.50):
            box(sx, sy, 1.42, 0.18, 0.18, 2.60, HOLZ)
            strebe_xz(sx - 0.55, 2.16, sx + 0.0, 2.62, sy, 0.12, 0.14, HOL2)
            strebe_xz(sx + 0.55, 2.16, sx + 0.0, 2.62, sy, 0.12, 0.14, HOL2)
    for sy in (-1.50, 1.50):
        box(0, sy, 2.80, 8.40, 0.20, 0.26, HOL2)             # Laengstraeger
    for i in range(13):                                      # Sparren
        box(-3.90 + i*0.65, 0, 3.00, 0.12, 3.50, 0.16, HOLZ)
    box(0, 0, 3.12, 7.60, 3.20, 0.05, TUCH)                  # Sonnensegel
    for i in range(9):                                       # Lichterkette
        box(-3.60 + i*0.90, -1.50, 2.62, 0.10, 0.10, 0.14, LICHT)
    # --- Moebel (Deck-Oberkante 0.18)
    Z = 0.18
    gartentisch(-2.20, 0.20, Z, DIEL, MET, 1.80, 0.95, 0.74)
    for sy, s in ((-0.50, -1), (0.90, 1)):
        for sx in (-2.90, -1.50):
            gartenstuhl(sx, sy, Z, POL, MET, s)
    box(2.90, 0.40, Z + 0.22, 2.60, 0.90, 0.44, POL)         # Lounge-Sofa
    box(2.90, 0.78, Z + 0.62, 2.60, 0.20, 0.52, POL)
    for sx in (-1, 1):
        box(2.90 + sx*1.20, 0.40, Z + 0.52, 0.24, 0.90, 0.34, POL)
    for sx in (-0.80, 0.80):
        box(2.90 + sx, 0.62, Z + 0.58, 0.44, 0.16, 0.42, POL2)
    box(2.90, -0.90, Z + 0.20, 1.10, 0.70, 0.40, HOL2)       # Beistelltisch
    liege(-4.80, 1.20, Z, POL, MET, 1)
    box(4.90, -2.40, Z + 0.45, 1.20, 0.70, 0.90, MET)        # Aussenkueche / Grill
    box(4.90, -2.40, Z + 0.92, 1.30, 0.80, 0.06, BRUE)
    box(4.90, -2.72, Z + 1.14, 1.16, 0.10, 0.40, MET)
    # --- Begruenung
    for i in range(6):
        pflanze(-5.20 + i*2.10, -3.30, Z, 0.48, 1.10, GRUE, TOPF, 5)
    for i in range(4):
        pflanze(-5.20 + i*0.90, 3.10, Z, 0.36, 0.80, GRU2, TOP2, 4)
    for i in range(3):
        pflanze(5.20, 2.60 - i*1.30, Z, 0.40, 0.90, GRUE, TOP2, 4)
    box(-1.20, -3.35, Z + 0.28, 3.20, 0.60, 0.56, TOPF)      # langer Pflanztrog
    for i in range(4):
        pflanze(-2.40 + i*0.80, -3.35, Z + 0.50, 0.34, 0.70, GRU2, None, 4)
    export("th22_dachterrasse", 0.016, 2)

# ================================================================ 9) Balkon-Modul
def balkon_modul():
    """Einzelner vorgehaengter Balkon zum Anbauen — Wandscheibe mit Balkontuer,
    Platte, Gelaender und Blumenkasten. Die Plattenunterseite liegt EXAKT auf z = 0
    (Anbauhoehe wird beim Setzen bestimmt); die Abhaengung laeuft deshalb als
    Zugstange nach OBEN zur Wand, nicht als Konsole nach unten."""
    neu()
    WAND = mat("Anschlusswand", (0.82,0.79,0.72), 0.88)
    PUTZ = mat("Laibung", (0.90,0.88,0.83), 0.82)
    BET  = mat("Balkonplatte", (0.74,0.73,0.70), 0.88)
    FLIE = mat("Balkonfliesen", (0.60,0.56,0.50), 0.86)
    MET  = mat("Gelaender", (0.34,0.36,0.38), 0.42, 0.5)
    MET2 = mat("Handlauf", (0.58,0.60,0.63), 0.36, 0.55)
    GLAS = mat("Tuerglas", (0.34,0.46,0.55), 0.14, 0.25)
    FEN  = mat("Tuerrahmen", (0.94,0.93,0.90), 0.55)
    TOPF = mat("Blumenkasten", (0.56,0.30,0.20), 0.88)
    GRUE = mat("Blumengruen", (0.21,0.46,0.17), 0.90)
    BLUE = mat("Blueten", (0.86,0.26,0.32), 0.72)
    POL  = mat("Klappstuhl", (0.30,0.46,0.50), 0.82)
    HOLZ = mat("Balkontisch", (0.48,0.33,0.19), 0.84)
    BW, PT = 3.60, 1.90                                   # Breite, Auskragung
    YW = -0.90                                            # Wandachse
    # --- Wandscheibe mit Balkontuer
    # Die Tuergruppe steht auf der BALKONOBERKANTE 0.24, nicht auf der Plattenmitte.
    # Erste Fassung setzte die Laibung auf z = 1.18 +- 1.30 -> Unterkante -0.12.
    wand_mit_tuer(0, YW, BW, 0.30, 3.10, WAND, 1.50, 2.70, 'x')
    box(0, YW - 0.02, 1.40, 1.44, 0.34, 2.40, PUTZ)       # Laibung 0.20 .. 2.60
    box(0, YW + 0.14, 1.38, 1.16, 0.06, 2.28, FEN)        # Rahmen 0.24 .. 2.52
    box(0, YW + 0.18, 1.37, 1.00, 0.04, 2.14, GLAS)       # Glas   0.30 .. 2.44
    box(0, YW + 0.21, 1.37, 0.06, 0.04, 2.14, FEN)
    box(0, YW + 0.21, 1.72, 1.00, 0.04, 0.06, FEN)
    box(0.42, YW + 0.24, 1.20, 0.05, 0.05, 0.30, MET2)    # Griff
    box(0, YW + 0.20, 2.61, 1.44, 0.14, 0.18, PUTZ)       # Sturz 2.52 .. 2.70
    # --- Platte: Unterkante exakt 0.00
    box(0, 0.05, 0.09, BW, PT, 0.18, BET)
    box(0, 0.05, 0.21, BW - 0.16, PT - 0.14, 0.06, FLIE)  # Belag
    for i in range(7):
        box(-1.50 + i*0.50, 0.05, 0.24, 0.46, PT - 0.20, 0.02, BET)
    box(0, 0.97, 0.14, BW, 0.12, 0.14, BET)               # Tropfkante vorn
    for sx in (-1, 1):
        box(sx*(BW/2 - 0.06), 0.05, 0.14, 0.12, PT, 0.14, BET)
    # --- Gelaender auf drei Seiten
    gelaender(-BW/2 + 0.08, BW/2 - 0.08, 0.94, 0.24, MET, 0.96, 'x', 0.05)
    for sx in (-1, 1):
        gelaender(-0.82, 0.94, sx*(BW/2 - 0.08), 0.24, MET, 0.96, 'y', 0.05)
    for i in range(15):                                   # senkrechte Fuellstaebe
        box(-1.66 + i*0.238, 0.94, 0.72, 0.03, 0.03, 0.90, MET)
    box(0, 0.94, 1.20, BW - 0.12, 0.09, 0.06, MET2)       # Handlauf vorn
    for sx in (-1, 1):
        box(sx*(BW/2 - 0.08), 0.06, 1.20, 0.09, 1.72, 0.06, MET2)
    for sx in (-1, 1):                                    # Zugstangen nach oben zur Wand
        strebe_yz(0.88, 0.30, YW + 0.16, 2.78, sx*(BW/2 - 0.14), 0.06, 0.06, MET2)
        box(sx*(BW/2 - 0.14), YW + 0.20, 2.80, 0.12, 0.24, 0.16, MET2)
    # --- Blumenkasten aussen am Gelaender
    # Kasten schlank halten: 2.40 x 0.24 sah aus wie eine zweite Bruestung.
    box(-0.55, 1.08, 0.86, 1.50, 0.22, 0.20, TOPF)
    for sx in (-1, 1):
        box(-0.55 + sx*0.70, 1.00, 0.86, 0.05, 0.18, 0.26, MET2)
    for i in range(5):
        pflanze(-1.15 + i*0.30, 1.08, 0.94, 0.17, 0.28, GRUE, None, 3)
        kugel(-1.15 + i*0.30, 1.12, 1.10, 0.065, BLUE, 8)
    # --- kleine Moeblierung, vom Kasten weg auf die freie Ecke
    zyl(1.05, 0.34, 0.46, 0.34, 0.05, HOLZ, 16)           # Bistrotisch
    zyl(1.05, 0.34, 0.33, 0.05, 0.22, MET2, 10)
    zyl(1.05, 0.34, 0.25, 0.22, 0.04, MET2, 14)
    box(0.10, 0.44, 0.68, 0.42, 0.42, 0.05, POL)          # Klappstuhl
    box(0.10, 0.64, 0.92, 0.42, 0.05, 0.44, POL)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(0.10 + sx*0.17, 0.44 + sy*0.17, 0.47, 0.04, 0.04, 0.42, MET2)
    export("th22_balkon_modul", 0.012, 2)

# ================================================================ 10) Garage
def garage():
    """BEGEHBAR: Einzelgarage mit offenem Kipptor, Werkbank und Regal.
    Das Kipptor steht OFFEN: eine um 76 Grad gekippte Platte, die vorn heraus- und
    hinten unter die Decke laeuft (Oberkante bleibt unter der Deckenunterseite).
    Decke buendig auf der Wandkrone 3.40, Aussensockel und Innenboden auf FB."""
    neu()
    WAND = mat("Garagenwand", (0.74,0.68,0.56), 0.90)
    WAN2 = mat("Innenputz", (0.80,0.78,0.73), 0.90)
    SOK  = mat("Sockelbeton", (0.40,0.39,0.37), 0.94)
    EST  = mat("Estrich", (0.44,0.43,0.42), 0.90)
    DECK = mat("Decke", (0.72,0.71,0.68), 0.88)
    DACH = mat("Dachrand", (0.30,0.30,0.29), 0.88)
    TOR  = mat("Kipptor", (0.40,0.46,0.52), 0.55)
    TOR2 = mat("Torprofil", (0.32,0.37,0.42), 0.58)
    MET  = mat("Metall", (0.52,0.54,0.57), 0.40, 0.5)
    MET2 = mat("Werkzeugstahl", (0.62,0.64,0.67), 0.32, 0.55)
    HOLZ = mat("Werkbankholz", (0.46,0.31,0.17), 0.82)
    HOL2 = mat("Regalholz", (0.55,0.39,0.22), 0.84)
    FEN  = mat("Fensterrahmen", (0.92,0.91,0.88), 0.55)
    GLAS = mat("Fensterglas", (0.44,0.56,0.62), 0.14, 0.25)
    KIST = mat("Kiste", (0.62,0.48,0.28), 0.88)
    KIS2 = mat("Kiste blau", (0.24,0.38,0.54), 0.80)
    KIS3 = mat("Farbeimer", (0.72,0.68,0.20), 0.72)
    REIF = mat("Reifen", (0.11,0.11,0.12), 0.90)
    LICHT= mat("Deckenleuchte", (1.0,0.95,0.82), 0.30, 0.0, (1.0,0.93,0.76), 2.0)
    OEL  = mat("Oelfleck", (0.18,0.17,0.16), 0.60)
    B, T, HW, d = 5.00, 7.20, 3.40, 0.25
    TB, TH = 3.40, 2.90                                   # Toroeffnung
    boden(B, T, SOK, EST, 1.60)
    box(0, 0, FB + 0.02, B - 2*d - 0.1, T - 2*d - 0.1, 0.05, EST)
    for sx in (-1, 1):                                    # Bodenmarkierung Stellplatz
        box(sx*1.35, -0.30, FB + 0.05, 0.09, 5.20, 0.03, DACH)
    box(0, -2.90, FB + 0.05, 2.70, 0.09, 0.03, DACH)
    zyl(0.30, -0.60, FB + 0.05, 0.42, 0.03, OEL, 16)
    # --- Huelle
    wand_mit_tuer(0, T/2 - d/2, B, d, HW, WAND, TB, TH, 'x')
    box(0, -T/2 + d/2, HW/2, B, d, HW, WAND)
    for sx in (-1, 1):
        box(sx*(B/2 - d/2), 0, HW/2, d, T, HW, WAND)
        box(sx*(B/2 - d - 0.03), 0, HW/2, 0.06, T - 2*d, HW, WAN2)   # Innenschale
    box(0, -T/2 + d + 0.03, HW/2, B - 2*d, 0.06, HW, WAN2)
    box(0, 0, 0.50, B + 0.10, T + 0.10, 1.00, SOK)                   # Aussensockel
    fensterband(B/2 - d/2, -0.60, 4.20, d, FB + 2.30, 0.85, FEN, GLAS, 3, 'y')
    fensterband(-B/2 + d/2, -0.60, 4.20, d, FB + 2.30, 0.85, FEN, GLAS, 3, 'y')
    fensterband(0, -T/2 + d/2, 3.20, d, FB + 2.30, 0.85, FEN, GLAS, 2, 'x')
    # --- Decke buendig auf der Wandkrone, dann Dachrand
    box(0, 0, HW + 0.13, B + 0.50, T + 0.50, 0.26, DACH)             # 3.40 .. 3.66
    dachrand(0, 0, B + 0.62, T + 0.62, HW + 0.34, 0.16, 0.26, DECK)  # 3.66 .. 3.82
    box(0, 0, HW - 0.06, B - 2*d, T - 2*d, 0.10, DECK)               # Innendecke
    for sy in (-1.80, 1.60):
        box(0, sy, HW - 0.20, 1.10, 0.22, 0.14, LICHT)
    # --- Kipptor, offen
    box(0, T/2 - d/2 + 0.02, TH + 0.20, TB + 0.40, d + 0.10, 0.34, SOK)   # Torsturz
    # Neigung und Mitte nachgerechnet: 80 Grad, Halblaenge 1.40
    # -> y-Ausladung 1.40*sin80 = 1.379, z-Ausladung 1.40*cos80 = 0.243.
    # Mit 76 Grad und Mitte y=3.90 stand das Blatt 1.67 m vor der Fassade.
    TA = math.radians(80)
    TCY, TCZ = 3.15, 3.10
    o = box(0, TCY, TCZ, TB - 0.10, 0.10, 2.80, TOR)
    o.rotation_euler[0] = TA
    for k in (-1, 0, 1):
        oz = box(0, TCY + k*0.86*math.sin(TA), TCZ + k*0.86*math.cos(TA),
                 TB - 0.16, 0.12, 0.10, TOR2)
        oz.rotation_euler[0] = TA
    for sx in (-1, 1):                                    # Laufschienen unter der Decke
        box(sx*(TB/2 - 0.12), 0.70, HW - 0.22, 0.08, 5.20, 0.10, MET)
        box(sx*(TB/2 - 0.12), T/2 - 0.40, 3.02, 0.10, 0.14, 0.14, MET)
    # --- Werkbank an der linken Wand
    WX = -B/2 + d + 0.42
    box(WX, -1.10, FB + 0.42, 0.72, 3.00, 0.84, HOLZ)
    box(WX, -1.10, FB + 0.88, 0.80, 3.10, 0.08, HOL2)
    for sy in (-2.40, 0.20):
        box(WX + 0.28, sy, FB + 0.42, 0.10, 0.10, 0.84, MET)
    box(WX - 0.02, -1.10, FB + 0.24, 0.66, 2.80, 0.06, HOLZ)         # Zwischenbord
    box(WX + 0.16, -0.30, FB + 1.02, 0.22, 0.30, 0.20, MET2)         # Schraubstock
    box(WX + 0.16, -0.30, FB + 1.16, 0.10, 0.24, 0.10, MET2)
    box(WX - 0.26, -1.10, FB + 1.60, 0.06, 2.60, 1.20, WAN2)         # Werkzeugwand
    for i in range(8):                                               # Werkzeug
        box(WX - 0.16, -2.20 + i*0.32, FB + 1.86, 0.06, 0.07, 0.34, MET2)
    for i in range(4):
        box(WX - 0.16, -1.90 + i*0.42, FB + 1.34, 0.07, 0.22, 0.07, MET2)
    for i in range(3):
        box(WX + 0.10, -2.10 + i*0.44, FB + 1.00, 0.26, 0.30, 0.16, KIS2)
    # --- Regal an der Rueckwand
    RY = -T/2 + d + 0.24
    for sx in (-1, 1):
        box(sx*1.50, RY, FB + 1.00, 0.08, 0.44, 2.00, HOL2)
    for k in range(4):
        box(0, RY, FB + 0.36 + k*0.54, 3.10, 0.44, 0.05, HOL2)
    for k in range(4):
        for i in range(4):
            if (k + i) % 3 == 0: continue
            box(-1.15 + i*0.76, RY, FB + 0.55 + k*0.54, 0.52, 0.34, 0.32,
                (KIST, KIS2, KIS3)[(k + i) % 3])
    for k in range(3):                                               # Reifenstapel
        zyl(1.65, 2.30, FB + 0.12 + k*0.22, 0.34, 0.20, REIF, 18)
    box(-1.70, 2.60, FB + 0.30, 0.50, 0.50, 0.60, KIS2)              # Kanister
    box(-1.70, 2.60, FB + 0.66, 0.16, 0.16, 0.12, MET2)
    for i in range(3):
        zyl(1.10 + i*0.34, 3.00, FB + 0.14, 0.15, 0.28, KIS3, 12)
    export("th22_garage", 0.016, 2)


if __name__ == "__main__":
    print("Asset-Charge th22 (Wohnbauten):")
    for fn in (altbau_modul, altbau_eck, plattenbau_modul, villa, bungalow,
               doppelhaus, hinterhof, dachterrasse, balkon_modul, garage):
        fn()
    print("fertig")
