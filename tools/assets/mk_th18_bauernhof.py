# -*- coding: utf-8 -*-
"""Asset-Charge th18_*: BAUERNHOF UND STADTRAND.
Scheune, Stall, Silo, Gewaechshaus, Traktor, Anhaenger, Heuballen, Zaun-Modul,
Feld-Modul, Windrad, Wassertank. Familienfreundlich — keine Waffen, keine Tiere
in Not, nur Landwirtschaft.

Konventionen wie th5-th14 (bitte nicht abweichen):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * `primitive_cube_add(size=1)` liefert Kantenlaenge 1 -> Skalierung = Mass, NICHT /2.
  * Schauseite (Tor, Front) auf Blender +y  ->  in three.js -z.
  * Raeder: `rot=(0, pi/2, 0)`. `rot=(pi/2,0,0)` legt die Achse auf -y — bei einem
    Fahrzeug mit Laenge in y stuenden die Raeder quer.
  * `rotation_euler[2] = pi` auf symmetrischen Quadern ist ein NO-OP — gespiegelt
    wird ueber das Vorzeichen der Offsets.
  * Metallic hoechstens 0.6 — darueber rendert three.js ohne Environment-Map schwarz.
  * Begehbar: Aussensockel UND Innenboden enden auf `FB`, Einbauten auf `FB + Hoehe`.
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
    """Echter Ring (Torus). Eine flache Zylinderscheibe waere ein Deckel, kein Buegel."""
    bpy.ops.mesh.primitive_torus_add(location=(x,y,z), major_radius=r, minor_radius=rr,
                                     major_segments=seg, minor_segments=rseg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def rad(x, y, z, r, breite, m=None, seg=18):
    """Fahrzeugrad. Achse MUSS in x liegen (Fahrzeuglaenge = y)."""
    return zyl(x, y, z, r, breite, m, seg, rot=(0, math.pi/2, 0))

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

# ---------------------------------------------------------------- Daecher
def tonne(cx, cy, z, r, laenge, m, seg=24):
    """HALBES Tonnengewoelbe, Fassachse in x, Bogen spannt ueber y.
    Basis liegt exakt bei z. Ein voller Zylinder taugt nicht — seine untere
    Haelfte steckt im Bau und verdeckt von innen alles."""
    return _halbzyl(zyl(cx, cy, z, r, laenge, m, seg, rot=(0, math.pi/2, 0)))

def tonne_y(cx, cy, z, r, laenge, m, seg=24):
    """HALBES Tonnengewoelbe, Fassachse in y, Bogen spannt ueber x.
    Fuer Hallen, die laengs in y stehen (Gewaechshaus)."""
    return _halbzyl(zyl(cx, cy, z, r, laenge, m, seg, rot=(math.pi/2, 0, 0)))

def _halbzyl(o):
    nur(o)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    bm.to_mesh(o.data); bm.free(); o.data.update()
    return o

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

def satteldach(cx, cy, B, T, z0, fh, dicke, m, ueber_x=0.5, ueber_y=0.6):
    """Zwei geneigte Dachflaechen. Traufe exakt auf z0, First auf z0+fh.
    Rechnung: die Platte wird um atan2(fh, B/2+ueber) um die y-Achse gekippt —
    geschaetzte Winkel lassen die Traufe schweben."""
    bh = B/2 + ueber_x
    a  = math.atan2(fh, bh)
    L  = math.hypot(bh, fh)
    for s in (-1, 1):
        o = box(cx + s*bh/2, cy, z0 + fh/2, L, T + 2*ueber_y, dicke, m)
        o.rotation_euler[1] = s*a
    return a

# ---------------------------------------------------------------- Streben
def strebe_xz(x1, z1, x2, z2, y, breite_z, tiefe_y, m):
    """Schraege in der x-z-Ebene zwischen zwei Punkten."""
    L = math.hypot(x2-x1, z2-z1)
    o = box((x1+x2)/2, y, (z1+z2)/2, L, tiefe_y, breite_z, m)
    o.rotation_euler[1] = -math.atan2(z2-z1, x2-x1)
    return o

def strebe_yz(y1, z1, y2, z2, x, breite_z, tiefe_x, m):
    """Schraege in der y-z-Ebene."""
    L = math.hypot(y2-y1, z2-z1)
    o = box(x, (y1+y2)/2, (z1+z2)/2, tiefe_x, L, breite_z, m)
    o.rotation_euler[0] = math.atan2(z2-z1, y2-y1)
    return o

def strebe_xy(x1, y1, x2, y2, z, breite, hoehe, m):
    """Schraege in der Grundrissebene (Deichsel, Verstrebungen)."""
    L = math.hypot(x2-x1, y2-y1)
    o = box((x1+x2)/2, (y1+y2)/2, z, L, breite, hoehe, m)
    o.rotation_euler[2] = math.atan2(y2-y1, x2-x1)
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

def leiter(cx, cy, z0, z1, m, breite=0.52, sprosse=0.30, holm=0.06, achse='y'):
    """Anlegeleiter, senkrecht. achse='y': Holme in x versetzt, Leiter blickt nach +y."""
    h = z1 - z0
    for s in (-1, 1):
        if achse == 'y': box(cx + s*breite/2, cy, z0 + h/2, holm, holm*1.4, h, m)
        else:            box(cx, cy + s*breite/2, z0 + h/2, holm*1.4, holm, h, m)
    n = max(1, int(h / sprosse))
    for i in range(n):
        z = z0 + (i + 0.6)*h/n
        if achse == 'y': box(cx, cy, z, breite, holm*1.1, holm*0.8, m)
        else:            box(cx, cy, z, holm*1.1, breite, holm*0.8, m)

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

# ================================================================ 1) Scheune
def scheune():
    """BEGEHBAR: grosse Scheune, Satteldach, breites Tor, Heuboden, Balkenwerk."""
    neu()
    ROT  = mat("ScheunenHolz", (0.44,0.13,0.11), 0.86)
    ROT2 = mat("Torholz", (0.37,0.10,0.09), 0.86)
    WEIS = mat("Zierholz", (0.86,0.84,0.77), 0.75)
    HOLZ = mat("Balken", (0.35,0.22,0.12), 0.82)
    DIEL = mat("Dielen", (0.47,0.32,0.18), 0.76)
    SOK  = mat("Hofboden", (0.55,0.53,0.49), 0.94)
    BLECH= mat("Dachblech", (0.30,0.32,0.34), 0.42, 0.45)
    HEU  = mat("Heu", (0.82,0.68,0.31), 0.92)
    STRO = mat("Stroh", (0.72,0.60,0.27), 0.95)
    GLAS = mat("Fensterglas", (0.60,0.74,0.80), 0.14)
    DKL  = mat("Luke", (0.14,0.11,0.09), 0.9)
    B, T, H, d, FH = 18.0, 24.0, 7.0, 0.40, 4.8
    boden(B, T, SOK, DIEL, 2.4)
    # --- Huelle
    wand_mit_tuer(0, T/2, B, d, H, ROT, 6.0, 5.2, 'x')
    box(0, -T/2, H/2, B, d, H, ROT)
    for sx in (-B/2, B/2):
        box(sx, 0, H/2, d, T, H, ROT)
        fensterband(sx, 0, T-9.0, d, FB + 4.95, 1.15, WEIS, GLAS, 4, 'y')
        fensterband(sx, 0, T-11.0, d, FB + 2.10, 1.10, WEIS, GLAS, 3, 'y')
    for sy in (T/2 - d/2, -T/2 + d/2):
        giebel(0, sy, H, B/2 + 0.5, FH, d, ROT)
    satteldach(0, 0, B, T, H, FH, 0.30, BLECH, 0.5, 0.6)
    box(0, 0, H + FH + 0.12, 0.36, T + 1.3, 0.26, BLECH)          # Firstblech
    for sy in (T/2 + 0.62, -T/2 - 0.62):                          # Ortgangbretter
        for s in (-1, 1):
            strebe_xz(0, H + FH, s*(B/2 + 0.5), H, sy, 0.26, 0.09, WEIS)
    # --- Tor: zwei offene Fluegel an der Fassade
    for s in (-1, 1):
        box(s*4.45, T/2 + 0.30, (FB + 5.2)/2, 2.70, 0.14, 5.2 - FB, ROT2)
        for a, b in ((FB + 0.15, 5.05), (5.05, FB + 0.15)):
            strebe_xz(s*4.45 - 1.15, a, s*4.45 + 1.15, b, T/2 + 0.40, 0.16, 0.09, WEIS)
        box(s*4.45, T/2 + 0.40, FB + 0.15, 2.55, 0.09, 0.16, WEIS)
        box(s*4.45, T/2 + 0.40, 5.05, 2.55, 0.09, 0.16, WEIS)
    box(0, T/2 + 0.07, H + 1.65, 1.90, 0.14, 1.70, WEIS)          # Giebelluke
    box(0, T/2 + 0.16, H + 1.65, 1.50, 0.10, 1.34, DKL)
    box(0, T/2 + 0.95, H + 3.05, 0.24, 2.10, 0.24, HOLZ)          # Aufzugsbalken
    box(0, T/2 + 1.90, H + 2.72, 0.16, 0.16, 0.42, HOLZ)
    # --- Heuboden (Oberkante 4.50) auf Unterzuegen und Stuetzen
    LZ = FB + 4.20
    yb = -3.0
    box(0, (yb - T/2 + d)/2, LZ - 0.14, B - 2*d, (yb + T/2 - d), 0.28, DIEL)
    for sy in (-3.2, -6.8, -10.4):
        box(0, sy, LZ - 0.44, B - 2*d, 0.34, 0.32, HOLZ)
        for sx in (-5.8, 0.0, 5.8):
            box(sx, sy, (FB + LZ - 0.60)/2, 0.28, 0.28, LZ - 0.60 - FB, HOLZ)
            strebe_xz(sx - 0.9, LZ - 1.50, sx + 0.0, LZ - 0.60, sy, 0.14, 0.20, HOLZ)
            strebe_xz(sx + 0.9, LZ - 1.50, sx + 0.0, LZ - 0.60, sy, 0.14, 0.20, HOLZ)
    # Treppe hinauf: n = round(4.20/0.175) = 24, Lauf 24*0.28 = 6.72 -> Start y=3.72
    treppe(-7.0, yb + 24*0.28, FB, 1.40, LZ - FB, DIEL, HOLZ, 0.175, 0.28, richtung=-1)
    gelaender(-8.75, -7.78, yb, LZ, HOLZ, 1.05, 'x')              # Bruestung, Treppenkopf frei
    gelaender(-6.22,  8.75, yb, LZ, HOLZ, 1.05, 'x')
    # --- Dachtragwerk
    for i in range(6):
        sy = -10.0 + i*4.0
        box(0, sy, H - 0.42, B - 2*d, 0.26, 0.34, HOLZ)           # Zugbalken
        box(0, sy, H - 0.42 + (FH + 0.12)/2, 0.24, 0.24, FH + 0.12, HOLZ)   # Koenigsstiel
        for s in (-1, 1):
            strebe_xz(s*(B/2 - d - 0.15), H - 1.40, s*6.4, H - 0.55, sy, 0.18, 0.20, HOLZ)
            strebe_xz(s*3.6, H + 0.55, 0.0, H + FH - 1.10, sy, 0.16, 0.18, HOLZ)
    for sx in (-6.4, 0.0, 6.4):                                   # Pfetten dicht unters Dach
        box(sx, 0, H + FH*(1 - abs(sx)/(B/2 + 0.5)) - 0.30, 0.22, T - 2*d, 0.24, HOLZ)
    # --- Heu
    # Heuballen NUR auf der Treppenseite stapeln — die erste Fassung fuellte den
    # ganzen Heuboden, man stand beim Hochsteigen sofort in einem Ballen.
    for k in range(3):
        for i in range(3):
            for j in range(3):
                if k == 2 and j > 1: continue
                box(-6.0 + i*2.2, -10.4 + j*2.0 + (k % 2)*0.15, LZ + 0.24 + k*0.46,
                    2.00, 1.80, 0.44, HEU if (i + j + k) % 3 else STRO)
    for i in range(4):                                            # Ballen im Erdgeschoss
        box(6.4 - (i % 2)*2.1, -8.6 + (i // 2)*2.0, FB + 0.23, 1.90, 1.75, 0.46, HEU)
    for i in range(3):
        box(6.4 - (i % 2)*2.1, -8.6 + (i // 2)*2.0, FB + 0.69, 1.90, 1.75, 0.46, STRO)
    box(-5.5, 5.2, FB + 0.14, 5.4, 4.6, 0.28, STRO)               # loses Stroh
    box(4.6, 6.4, FB + 0.55, 2.4, 1.0, 1.10, HOLZ)                # Werkbank
    box(4.6, 6.4, FB + 1.14, 2.6, 1.2, 0.10, DIEL)
    export("th18_scheune", 0.022, 2)

# ================================================================ 2) Stall
def stall():
    """BEGEHBAR: Stall mit Boxen beidseits des Mittelgangs, Futtertroegen, Fenstern."""
    neu()
    W    = mat("Stallwand", (0.80,0.78,0.72), 0.88)
    SOCK = mat("Sockelmauer", (0.52,0.50,0.46), 0.94)
    HOLZ = mat("Boxenholz", (0.48,0.32,0.17), 0.80)
    HOLZ2= mat("Balken", (0.36,0.23,0.13), 0.82)
    BOD  = mat("Stallboden", (0.44,0.42,0.39), 0.92)
    STRO = mat("Stroh", (0.80,0.67,0.30), 0.95)
    DACH = mat("Ziegel", (0.46,0.20,0.13), 0.72)
    STAHL= mat("Gitter", (0.62,0.64,0.66), 0.35, 0.5)
    GLAS = mat("Fensterglas", (0.58,0.74,0.80), 0.14)
    TROG = mat("Trog", (0.60,0.58,0.54), 0.75)
    LICHT= mat("Stalllampe", (1.0,0.92,0.72), 0.3, 0.0, (1.0,0.90,0.66), 1.9)
    B, T, H, d, FH = 16.0, 12.0, 4.20, 0.35, 3.20
    boden(B, T, SOCK, BOD, 2.0)
    wand_mit_tuer(0, T/2, B, d, H, W, 3.40, 3.20, 'x')
    box(0, -T/2, H/2, B, d, H, W)
    fensterband(0, -T/2, B - 6.0, d, FB + 2.05, 1.25, HOLZ, GLAS, 3, 'x')
    for sx in (-5.6, 5.6):                                        # Fenster neben dem Tor
        fensterband(sx, T/2, 3.6, d, FB + 2.05, 1.25, HOLZ, GLAS, 2, 'x')
    for sx in (-B/2, B/2):
        box(sx, 0, H/2, d, T, H, W)
        fensterband(sx, 0, T - 2.4, d, FB + 2.05, 1.25, HOLZ, GLAS, 4, 'y')
        box(sx, 0, 0.72, d*1.15, T, 0.86, SOCK)                   # Sockelband aussen
    for sy in (T/2, -T/2):
        box(0, sy, 0.72, B, d*1.15, 0.86, SOCK)
    for sy in (T/2 - d/2, -T/2 + d/2):
        giebel(0, sy, H, B/2 + 0.4, FH, d, W)
    satteldach(0, 0, B, T, H, FH, 0.26, DACH, 0.4, 0.5)
    box(0, 0, H + FH + 0.10, 0.34, T + 1.1, 0.22, DACH)
    for sx in (-1.82, 1.82):                                      # Torzarge aus Holz
        box(sx, T/2 + 0.06, 1.60, 0.24, d + 0.12, 3.20, HOLZ)
    box(0, T/2 + 0.06, 3.32, 3.88, d + 0.12, 0.24, HOLZ)
    box(0, T/2 + 0.62, 3.86, 4.60, 1.20, 0.14, HOLZ)              # kleines Vordach
    for sx in (-1.60, 1.60):
        strebe_yz(T/2 + 0.10, 3.44, T/2 + 1.16, 3.80, sx, 0.12, 0.12, HOLZ)
    # --- Deckenbalken
    for i in range(6):
        box(0, -4.6 + i*1.85, H - 0.32, B - 2*d, 0.22, 0.28, HOLZ2)
    for i in range(3):
        box(0, -3.4 + i*3.4, H - 0.75, 0.60, 0.30, 0.16, LICHT)   # Stalllampen
    # --- Boxen links und rechts vom Gang (Gang: x in [-1.8, 1.8])
    xg, xi = 1.80, B/2 - d
    for s in (-1, 1):
        for k in range(5):                                        # Trennwaende
            sy = -5.6 + k*2.5
            box(s*(xg + (xi - xg)/2), sy, FB + 0.70, xi - xg, 0.12, 1.40, HOLZ)
            box(s*(xg + (xi - xg)/2), sy, FB + 1.44, xi - xg, 0.16, 0.10, HOLZ2)
        for k in range(4):                                        # Boxenfront zum Gang
            cy = -4.35 + k*2.5
            box(s*(xg + (xi - xg)/2), cy, FB + 0.035, xi - xg - 0.10, 2.28, 0.07, STRO)  # Einstreu
            for oy in (-0.86, 0.86):                              # Front, Tuerluecke mittig
                box(s*xg, cy + oy, FB + 0.50, 0.12, 0.62, 1.00, HOLZ)
                box(s*xg, cy + oy, FB + 1.45, 0.12, 0.62, 0.10, HOLZ)
                for g in range(3):
                    zyl(s*xg, cy + oy - 0.22 + g*0.22, FB + 1.22, 0.030, 0.44, STAHL, 8)
            box(s*xg, cy, FB + 1.45, 0.12, 1.14, 0.10, HOLZ)      # Sturz ueber der Luecke
            # Futtertrog in der Box, an der Gangseite
            box(s*(xg + 0.42), cy, FB + 0.34, 0.62, 1.30, 0.68, TROG)
            box(s*(xg + 0.42), cy, FB + 0.62, 0.48, 1.16, 0.16, HOLZ2)
    box(0, 0, FB + 0.015, 3.60, T - 2*d, 0.03, BOD)               # Futtergang
    for i in range(9):
        box(0, -4.9 + i*1.22, FB + 0.04, 3.40, 0.10, 0.05, SOCK)  # Rillen im Gang
    box(-5.5, 5.10, FB + 0.55, 1.80, 0.70, 1.10, HOLZ)            # Schrank in der Quergasse
    box(-5.5, 5.10, FB + 1.14, 1.94, 0.84, 0.10, HOLZ2)
    for i in range(3):                                            # Eimer
        zyl(4.30 + i*0.55, 5.10, FB + 0.16, 0.17, 0.32, STAHL, 12)
    box(6.20, 5.10, FB + 0.42, 1.40, 0.90, 0.84, HOLZ2)           # Strohballen als Sitz
    box(6.20, 5.10, FB + 0.88, 1.44, 0.94, 0.08, STRO)
    export("th18_stall", 0.020, 2)

# ================================================================ 3) Silo
def silo():
    """Rundsilo ~14 m mit Wellblechringen, Kegeldach, Aussenleiter, Plattform."""
    neu()
    BLECH= mat("SiloBlech", (0.74,0.75,0.77), 0.36, 0.45)
    RING = mat("SiloRing", (0.62,0.63,0.66), 0.42, 0.45)
    DACH = mat("SiloDach", (0.52,0.54,0.57), 0.38, 0.5)
    BET  = mat("Fundament", (0.60,0.58,0.54), 0.94)
    STAHL= mat("Stahl", (0.55,0.57,0.60), 0.40, 0.5)
    DKL  = mat("Klappe", (0.28,0.30,0.32), 0.7)
    GELB = mat("Warnfarbe", (0.88,0.72,0.14), 0.55)
    R, Z0, ZM = 3.00, 0.42, 11.50                                 # Gesamthoehe ~14.3 m
    zyl(0, 0, Z0/2, R + 0.35, Z0, BET, 28)                        # Fundamentring
    zyl(0, 0, (Z0 + ZM)/2, R, ZM - Z0, BLECH, 28)                 # Mantel
    for i in range(10):                                           # Wellblech-Ringe
        zyl(0, 0, Z0 + 0.55 + i*1.05, R + 0.05, 0.14, RING, 28)
    for i in range(8):                                            # Senkrechte Stoesse
        a = i/8*math.tau
        box(math.cos(a)*(R + 0.03), math.sin(a)*(R + 0.03), (Z0 + ZM)/2,
            0.13, 0.13, ZM - Z0 - 0.2, RING).rotation_euler[2] = a
    zyl(0, 0, ZM + 0.16, R + 0.16, 0.32, RING, 28)                # Traufring
    kegel(0, 0, ZM + 1.28, R + 0.10, 0.28, 1.92, DACH, 28)        # Kegeldach
    zyl(0, 0, ZM + 2.32, 0.34, 0.30, STAHL, 14)                   # Dachhut
    kegel(0, 0, ZM + 2.62, 0.40, 0.06, 0.30, STAHL, 14)
    box(0.0, R*0.42, ZM + 1.62, 0.80, 0.72, 0.14, DKL)            # Einfuellklappe
    # --- Auslauftrichter und Tuer am Fuss (Schauseite +y)
    kegel(0, R + 0.42, 1.15, 0.52, 0.20, 0.90, STAHL, 14, rot=(math.radians(-28), 0, 0))
    box(0, R + 0.30, 0.42, 0.90, 0.55, 0.84, STAHL)
    box(0, R - 0.02, 1.65, 1.00, 0.14, 1.80, DKL)                 # Wartungstuer
    box(0, R + 0.05, 1.65, 0.80, 0.06, 1.55, GELB)
    # --- Aussenleiter mit Rueckenschutz-Buegeln, Leiterkopf bleibt frei
    leiter(0, R + 0.30, 0.55, ZM + 1.30, STAHL, 0.56, 0.31, 0.07, 'y')
    for i in range(8):
        ring(0, R + 0.62, 3.6 + i*1.05, 0.46, 0.035, STAHL, 12, 6, rot=(math.pi/2, 0, 0))
    box(0, R + 0.94, (3.6 + 11.2)/2, 0.05, 0.05, 7.6, STAHL)
    # Plattform als U — der Leiterkopf (|x| < 0.32) MUSS ausgespart bleiben,
    # sonst laeuft die Leiter mitten durch das Podest.
    for sx in (-0.88, 0.88):
        box(sx, R + 0.65, ZM + 0.50, 1.05, 1.50, 0.10, STAHL)
    box(0, R + 1.15, ZM + 0.50, 2.80, 0.50, 0.10, STAHL)
    gelaender(-1.40, 1.40, R + 1.42, ZM + 0.55, STAHL, 1.05, 'x')
    for sx in (-1.40, 1.40):
        gelaender(R - 0.05, R + 1.42, sx, ZM + 0.55, STAHL, 1.05, 'y')
    zyl(0, 0, 0.78, R + 0.07, 0.22, GELB, 28)                     # Warnring am Fuss
    export("th18_silo", 0.020, 2)

# ================================================================ 4) Gewaechshaus
def gewaechshaus():
    """BEGEHBAR: Glashaus mit Tonnendach, Pflanztischen, Hochbeeten."""
    neu()
    GLAS = mat("Gewaechshausglas", (0.66,0.82,0.86), 0.10, 0.0, None, 1.3, 0.34)
    RAHM = mat("Alurahmen", (0.78,0.79,0.81), 0.35, 0.45)
    BET  = mat("Sockelmauer", (0.60,0.58,0.54), 0.92)
    BOD  = mat("Kiesboden", (0.56,0.53,0.48), 0.95)
    HOLZ = mat("Tischholz", (0.52,0.36,0.20), 0.80)
    HOLZ2= mat("Beetholz", (0.42,0.28,0.15), 0.84)
    ERDE = mat("Pflanzerde", (0.24,0.16,0.10), 0.96)
    GRUE = mat("Blattgruen", (0.20,0.48,0.16), 0.86)
    GRUE2= mat("Jungpflanze", (0.34,0.62,0.22), 0.86)
    TOPF = mat("Tontopf", (0.66,0.34,0.20), 0.88)
    ROT  = mat("Tomate", (0.78,0.16,0.12), 0.55)
    B, T, WH, R = 9.0, 15.0, 2.80, 4.50
    boden(B, T, BET, BOD, 2.0)
    # --- Glashuelle
    wand_mit_tuer(0, T/2, B, 0.10, WH, GLAS, 2.60, 2.40, 'x')
    box(0, -T/2, WH/2, B, 0.10, WH, GLAS)
    for sx in (-B/2, B/2):
        box(sx, 0, WH/2, 0.10, T, WH, GLAS)
        box(sx, 0, 0.30, 0.26, T, 0.60, BET)                      # Sockelmauer
        for i in range(11):                                       # Pfosten
            box(sx, -T/2 + 0.4 + i*1.42, WH/2, 0.14, 0.12, WH, RAHM)
        box(sx, 0, WH - 0.07, 0.16, T, 0.14, RAHM)
        box(sx, 0, 0.62, 0.16, T, 0.12, RAHM)
    box(0, -T/2, 0.30, B, 0.26, 0.60, BET)
    for sy in (T/2, -T/2):                                        # Giebelpfosten
        for px in (-3.6, -1.35, 1.35, 3.6):
            box(px, sy, WH/2, 0.14, 0.12, WH, RAHM)
        box(0, sy, WH - 0.07, B, 0.16, 0.14, RAHM)
        box(0, sy, 2.44, 2.90, 0.16, 0.14, RAHM)                  # Tuersturz
    # --- Tonnendach: Achse laengs in y, Bogen ueber die Breite
    tonne_y(0, 0, WH, R, T, GLAS, 28)
    for i in range(11):                                           # Bogenrippen
        tonne_y(0, -T/2 + 0.30 + i*1.44, WH, R + 0.05, 0.13, RAHM, 28)
    tonne_y(0,  T/2 - 0.06, WH, R + 0.06, 0.14, RAHM, 28)
    tonne_y(0, -T/2 + 0.06, WH, R + 0.06, 0.14, RAHM, 28)
    box(0, 0, WH + R - 0.10, 0.22, T + 0.2, 0.22, RAHM)           # Firstprofil
    for i in range(4):                                            # Lueftungsklappen im Dach
        ph = math.radians(20)                                     # Klappe liegt TANGENTIAL
        o = box(math.sin(ph)*(R + 0.05), -4.8 + i*3.2,            # auf dem Bogen — flach
                WH + math.cos(ph)*(R + 0.05), 1.50, 2.10, 0.09, RAHM)  # gesetzt steckt
        o.rotation_euler[1] = ph                                  # sie im Glas
    # --- Innenleben
    box(0, 0, FB + 0.02, 2.10, T - 0.4, 0.05, BET)                # Mittelweg
    for s in (-1, 1):                                             # Pflanztische vorn
        box(s*2.70, 4.10, FB + 0.82, 2.30, 6.20, 0.08, HOLZ)
        box(s*2.70, 4.10, FB + 0.44, 2.10, 6.00, 0.06, HOLZ)      # Zwischenbord
        for k in range(4):
            for ox in (-1.00, 1.00):
                box(s*2.70 + ox, 1.30 + k*1.90, FB + 0.39, 0.10, 0.10, 0.78, HOLZ)
        for k in range(5):                                        # Toepfe mit Jungpflanzen
            for ox in (-0.72, 0.0, 0.72):
                pflanze(s*2.70 + ox, 1.60 + k*1.25, FB + 0.86, 0.30, 0.56,
                        GRUE2, TOPF, 3)
    for s in (-1, 1):                                             # Hochbeete hinten
        box(s*2.70, -3.70, FB + 0.24, 2.40, 6.60, 0.48, HOLZ2)
        box(s*2.70, -3.70, FB + 0.44, 2.16, 6.36, 0.14, ERDE)
        for k in range(5):
            for ox in (-0.74, 0.0, 0.74):
                pflanze(s*2.70 + ox, -6.30 + k*1.30, FB + 0.50, 0.34, 0.86, GRUE, None, 3)
    for s in (-1, 1):                                             # Tomatenstangen
        for k in range(4):
            zyl(s*3.55, -6.2 + k*1.70, FB + 1.35, 0.045, 1.80, HOLZ, 8)
            for j in range(3):
                kugel(s*3.55 + 0.12, -6.2 + k*1.70, FB + 1.05 + j*0.34, 0.10, ROT, 8)
    zyl(0, -6.60, FB + 0.38, 0.50, 0.76, RAHM, 16)                # Wassertonne
    zyl(0, -6.60, FB + 0.78, 0.50, 0.05, GLAS, 16)
    box(0, 6.10, FB + 0.42, 1.40, 0.60, 0.84, HOLZ)               # Ablage neben der Tuer
    for i in range(3):
        kegel(-0.45 + i*0.45, 6.10, FB + 0.96, 0.16, 0.20, 0.24, TOPF, 10)
    export("th18_gewaechshaus", 0.016, 2)

# ================================================================ 5) Traktor
def traktor():
    """Traktor: grosse Hinterraeder mit Stollen, Kabine, Auspuff. Front auf +y."""
    neu()
    GRUE = mat("Traktorlack", (0.11,0.40,0.15), 0.42)
    GRUE2= mat("Lack dunkel", (0.08,0.30,0.12), 0.45)
    GELB = mat("Felge", (0.90,0.74,0.14), 0.48)
    REIF = mat("Reifen", (0.10,0.10,0.11), 0.88)
    STAHL= mat("Stahl", (0.55,0.57,0.60), 0.40, 0.5)
    DKL  = mat("Kunststoff", (0.16,0.16,0.17), 0.72)
    GLAS = mat("Kabinenglas", (0.52,0.68,0.76), 0.14)
    SITZ = mat("Sitz", (0.20,0.19,0.20), 0.85)
    LICHT= mat("Scheinwerfer", (1.0,0.94,0.74), 0.25, 0.0, (1.0,0.92,0.68), 2.2)
    ROT  = mat("Rueckleuchte", (0.86,0.14,0.12), 0.3, 0.0, (0.90,0.12,0.10), 1.8)
    # --- Raeder (Achse in x!). Die Stollen bilden den AEUSSEREN Radius: Karkasse
    # 0.88, Stollen bis 0.90 = Achshoehe -> Unterkante exakt 0.00. Umgekehrt
    # (Stollen ueber der Achshoehe) haengt das Rad unter dem Boden.
    for s in (-1, 1):
        rad(s*0.90, -1.05, 0.90, 0.88, 0.62, REIF, 20)            # hinten
        rad(s*0.90, -1.05, 0.90, 0.44, 0.66, GELB, 16)
        zyl(s*0.90, -1.05, 0.90, 0.16, 0.72, STAHL, 12, rot=(0, math.pi/2, 0))
        for i in range(14):                                       # Stollenprofil
            a = i/14*math.tau
            o = box(s*0.90, -1.05 + math.cos(a)*0.845, 0.90 + math.sin(a)*0.845,
                    0.64, 0.22, 0.11, REIF)
            o.rotation_euler[0] = a - math.pi/2
        rad(s*0.80, 1.62, 0.52, 0.50, 0.36, REIF, 18)             # vorn
        rad(s*0.80, 1.62, 0.52, 0.26, 0.40, GELB, 14)
        for i in range(10):
            a = i/10*math.tau
            o = box(s*0.80, 1.62 + math.cos(a)*0.475, 0.52 + math.sin(a)*0.475,
                    0.38, 0.16, 0.09, REIF)
            o.rotation_euler[0] = a - math.pi/2
    # --- Rahmen, Motorhaube
    box(0, 0.30, 0.98, 0.86, 3.30, 0.46, GRUE2)                   # Rahmen
    box(0, 1.55, 1.46, 1.02, 1.90, 0.72, GRUE)                    # Motorhaube
    box(0, 1.55, 1.84, 0.86, 1.70, 0.10, GRUE2)                   # Haubendeckel
    box(0, 2.47, 1.42, 0.94, 0.10, 0.64, DKL)                     # Kuehlergrill
    for i in range(5):
        box(0, 2.52, 1.18 + i*0.13, 0.86, 0.05, 0.06, STAHL)
    for s in (-1, 1):
        box(s*0.36, 2.51, 1.66, 0.24, 0.09, 0.19, LICHT)          # Scheinwerfer
        box(s*0.46, 1.55, 1.20, 0.14, 1.70, 0.30, GRUE2)          # Seitenblech
    # --- Kotfluegel ueber den Hinterraedern
    for s in (-1, 1):
        tonne(s*0.95, -1.05, 0.94, 1.04, 0.72, GRUE, 18)
        box(s*0.95, -2.05, 1.02, 0.76, 0.14, 0.24, GRUE2)
    # --- Kabine
    box(0, -0.90, 1.62, 1.38, 2.20, 0.14, GRUE2)                  # Kabinenboden
    for sx in (-0.60, 0.60):
        for sy in (-1.88, 0.06):
            box(sx, sy, 2.32, 0.10, 0.10, 1.28, GRUE2)            # Saeulen
    box(0, -0.90, 3.02, 1.56, 2.34, 0.14, GRUE)                   # Dach
    box(0, -0.90, 3.13, 1.30, 2.00, 0.09, GRUE2)
    box(0,  0.10, 2.36, 1.22, 0.06, 1.24, GLAS)                   # Frontscheibe
    box(0, -1.90, 2.36, 1.22, 0.06, 1.24, GLAS)                   # Heckscheibe
    for sx in (-0.62, 0.62):
        box(sx, -0.90, 2.36, 0.06, 1.86, 1.18, GLAS)
    box(0, -1.20, 1.94, 0.56, 0.54, 0.18, SITZ)                   # Sitz
    box(0, -1.46, 2.32, 0.56, 0.14, 0.62, SITZ)
    box(0, -0.42, 2.02, 0.09, 0.09, 0.62, DKL)                    # Lenksaeule
    o = zyl(0, -0.34, 2.36, 0.21, 0.05, DKL, 16); o.rotation_euler[0] = math.radians(66)
    box(0, -0.85, 3.20, 0.34, 0.30, 0.12, LICHT)                  # Arbeitsscheinwerfer
    for s in (-1, 1):                                             # Trittstufen
        for k in range(2):
            box(s*0.74, -0.35 - k*0.02, 1.02 + k*0.34, 0.34, 0.30, 0.06, STAHL)
        box(s*0.72, -0.55, 1.35, 0.06, 0.06, 0.66, STAHL)
    # --- Auspuff
    zyl(0.52, 2.08, 2.16, 0.075, 1.55, DKL, 12)
    zyl(0.52, 2.08, 2.96, 0.095, 0.14, STAHL, 12)
    kegel(0.52, 2.08, 3.08, 0.10, 0.05, 0.12, DKL, 10)
    # --- Heck: Hydraulik und Kupplung
    for s in (-1, 1):
        strebe_yz(-1.95, 1.10, -2.55, 0.62, s*0.48, 0.14, 0.14, STAHL)
        box(s*0.48, -2.58, 0.58, 0.20, 0.18, 0.22, STAHL)
        box(s*0.72, -1.62, 1.32, 0.12, 0.34, 0.34, ROT)
    box(0, -2.42, 0.86, 0.44, 0.44, 0.24, STAHL)
    zyl(0, -2.62, 0.86, 0.09, 0.28, STAHL, 12, rot=(math.pi/2, 0, 0))
    box(0, -2.20, 1.30, 1.10, 0.30, 0.18, GRUE2)
    export("th18_traktor", 0.014, 2)

# ================================================================ 6) Anhaenger
def anhaenger():
    """Kipp-Anhaenger mit Bordwaenden, Tandemachse und Deichsel. Deichsel auf +y."""
    neu()
    GRUE = mat("Anhaengerlack", (0.12,0.38,0.15), 0.45)
    GRUE2= mat("Lack dunkel", (0.08,0.28,0.11), 0.48)
    STAHL= mat("Stahlrahmen", (0.42,0.44,0.47), 0.45, 0.5)
    STAHL2= mat("Blank", (0.60,0.62,0.65), 0.32, 0.55)
    REIF = mat("Reifen", (0.10,0.10,0.11), 0.88)
    GELB = mat("Felge", (0.88,0.72,0.14), 0.50)
    DIEL = mat("Ladeboden", (0.46,0.32,0.18), 0.82)
    ROT  = mat("Rueckleuchte", (0.86,0.14,0.12), 0.3, 0.0, (0.90,0.12,0.10), 1.7)
    WARN = mat("Warntafel", (0.90,0.76,0.16), 0.55)
    for s in (-1, 1):                                             # Tandemachse
        for sy in (-0.55, -1.78):
            rad(s*1.02, sy, 0.52, 0.50, 0.34, REIF, 18)           # Stollen = Aussenradius
            rad(s*1.02, sy, 0.52, 0.25, 0.38, GELB, 14)
            for i in range(10):
                a = i/10*math.tau
                o = box(s*1.02, sy + math.cos(a)*0.475, 0.52 + math.sin(a)*0.475,
                        0.36, 0.16, 0.09, REIF)
                o.rotation_euler[0] = a - math.pi/2
        box(s*1.02, -1.16, 1.14, 0.46, 2.30, 0.12, STAHL)         # Kotfluegel
        box(s*1.02, -0.02, 1.02, 0.16, 0.30, 0.28, STAHL)
        box(s*1.02, -2.32, 1.02, 0.16, 0.30, 0.28, STAHL)
    box(0, -1.16, 0.62, 1.90, 0.22, 0.20, STAHL)                  # Achsbruecken
    box(0, -0.55, 0.66, 2.16, 0.16, 0.16, STAHL)
    box(0, -1.78, 0.66, 2.16, 0.16, 0.16, STAHL)
    box(0, -0.40, 0.90, 1.80, 4.60, 0.22, STAHL)                  # Hauptrahmen
    for s in (-1, 1):
        box(s*0.95, -0.40, 0.92, 0.14, 4.60, 0.26, STAHL)
    box(0, -0.40, 1.08, 2.30, 4.42, 0.11, DIEL)                   # Ladeboden (Oberkante 1.14)
    for i in range(9):
        box(0, -2.40 + i*0.50, 1.15, 2.24, 0.06, 0.03, GRUE2)     # Dielenfugen
    # --- Bordwaende, Oberkante 2.09
    for s in (-1, 1):
        box(s*1.15, -0.40, 1.62, 0.09, 4.42, 0.95, GRUE)
        box(s*1.19, -0.40, 2.04, 0.13, 4.50, 0.10, GRUE2)
        for k in range(6):
            box(s*1.20, -2.20 + k*0.72, 1.62, 0.07, 0.12, 0.92, GRUE2)
    box(0,  1.76, 1.62, 2.30, 0.09, 0.95, GRUE)                   # Stirnwand
    box(0,  1.80, 2.04, 2.38, 0.14, 0.10, GRUE2)
    box(0,  1.82, 2.32, 2.20, 0.08, 0.46, WARN)                   # Warntafel vorn
    box(0, -2.56, 1.62, 2.30, 0.09, 0.95, GRUE)                   # Heckklappe
    box(0, -2.60, 2.04, 2.38, 0.14, 0.10, GRUE2)
    for s in (-1, 1):
        zyl(s*1.02, -2.60, 1.20, 0.07, 0.16, STAHL2, 10, rot=(math.pi/2, 0, 0))
        box(s*0.86, -2.62, 1.36, 0.30, 0.10, 0.22, ROT)           # Rueckleuchten
        box(s*0.62, -2.64, 1.82, 0.34, 0.06, 0.34, WARN)
    # --- Deichsel
    for s in (-1, 1):
        strebe_xy(s*0.62, 1.86, 0.0, 3.32, 0.90, 0.16, 0.20, STAHL)
    box(0, 3.30, 0.90, 0.26, 0.70, 0.22, STAHL)
    ring(0, 3.62, 0.90, 0.13, 0.045, STAHL2, 14, 6, rot=(math.pi/2, 0, 0))   # Zugoese
    box(0, 2.90, 0.62, 0.16, 0.16, 0.34, STAHL)                   # Stuetzfuss
    zyl(0, 2.90, 0.22, 0.07, 0.44, STAHL2, 10)
    zyl(0, 2.90, 0.03, 0.20, 0.06, STAHL, 12)
    # --- Kippzylinder unter der Ladeflaeche
    strebe_yz(1.30, 0.74, 0.30, 1.04, 0.0, 0.16, 0.16, STAHL2)
    strebe_yz(0.34, 1.02, -0.20, 1.06, 0.0, 0.12, 0.12, STAHL)
    export("th18_anhaenger", 0.014, 2)

# ================================================================ 7) Heuballen
def heuballen():
    """Drei Rundballen in drei Groessen — Achse liegt in x, Unterkante exakt 0."""
    neu()
    HEU  = mat("Heu", (0.82,0.68,0.30), 0.94)
    HEU2 = mat("Heu hell", (0.88,0.76,0.40), 0.94)
    HEU3 = mat("Heu dunkel", (0.68,0.54,0.22), 0.95)
    NETZ = mat("Wickelnetz", (0.60,0.50,0.22), 0.85)
    FOLIE= mat("Silofolie", (0.90,0.90,0.88), 0.55)
    FOL2 = mat("Foliennaht", (0.78,0.78,0.76), 0.6)
    def ballen(px, py, r, L, m_kern, m_band, spirale=True):
        # Achse in x. Die Wickelbaender stehen 0.012 vor -> Mitte auf r+0.012,
        # sonst laege die Ballen-Unterkante bei -0.012 statt exakt 0.
        r = r + 0.012
        zyl(px, py, r, r - 0.012, L, m_kern, 24, rot=(0, math.pi/2, 0))
        for i in range(4):                                        # Wickelbaender
            zyl(px - L/2 + L*(i + 0.5)/4, py, r, r, L*0.09, m_band, 24,
                rot=(0, math.pi/2, 0))
        if spirale:                                               # Stirnseiten-Ringe
            for s in (-1, 1):
                for k, rr in enumerate((0.74, 0.48, 0.24)):
                    zyl(px + s*(L/2 + 0.012), py, r, r*rr, 0.02,
                        m_band if k % 2 == 0 else m_kern, 20, rot=(0, math.pi/2, 0))
    ballen(-1.75, 0.15, 0.88, 1.30, HEU, HEU3)
    ballen( 0.55, 0.95, 0.70, 1.10, HEU2, HEU3)
    ballen( 2.10, -0.65, 0.56, 0.95, FOLIE, FOL2, False)
    for i in range(3):                                            # etwas loses Heu am Fuss
        box(-1.75 + i*1.9, -0.05 + (i % 2)*0.5, 0.05, 1.7, 1.2, 0.10, HEU3)
    export("th18_heuballen", 0.016, 2)

# ================================================================ 8) Zaun-Modul
def zaun_modul():
    """Holzzaun, exakt 4.00 m in x. Reihen: x += 4.00 -> Pfostenraster 2.00 m,
    Riegel stossen exakt aneinander (Pfosten NUR am linken Rand + Mitte, sonst
    stuenden an jeder Fuge zwei Pfosten nebeneinander)."""
    neu()
    HOLZ = mat("Zaunholz", (0.56,0.42,0.26), 0.86)
    HOLZ2= mat("Pfostenholz", (0.46,0.33,0.19), 0.88)
    HOLZ3= mat("Riegel hell", (0.62,0.48,0.31), 0.84)
    L, HP = 4.00, 1.28
    for px in (-L/2 + 0.10, 0.0):                                 # Pfosten
        box(px, 0, HP/2, 0.18, 0.18, HP, HOLZ2)
        # Pfostenkopf aus zwei Quadern statt kegel(seg=4): die 4-Ecken-Grundflaeche
        # von Blender liegt mit den ECKEN auf den Achsen und ragte 0.04 m ueber
        # das 4.00-m-Raster hinaus (gemessen: Modulbreite 4.08 statt 4.00).
        box(px, 0, HP + 0.05, 0.18, 0.18, 0.10, HOLZ2)
        box(px, 0, HP + 0.14, 0.11, 0.11, 0.08, HOLZ2)
    for z, hh in ((0.34, 0.15), (0.74, 0.15), (1.10, 0.13)):      # Riegel, exakt -2.00..2.00
        box(0, -0.085, z, L, 0.06, hh, HOLZ3 if z > 0.5 else HOLZ)
    for i in range(4):                                            # Zwischenlatten
        box(-1.50 + i*1.00, -0.10, 0.68, 0.09, 0.05, 1.02, HOLZ)
    for s in (-1, 1):                                             # Andreaskreuz im Feld
        strebe_xz(s*0.06, 0.34, s*1.86, 1.10, -0.055, 0.11, 0.05, HOLZ3)
    export("th18_zaun_modul", 0.012, 2)

# ================================================================ 9) Feld-Modul
def feld_modul():
    """Ackerstueck, exakt 10.00 x 10.00 m. Furchenraster 0.50 m -> in x UND y
    kachelbar (10.00 / 0.50 = 20 Furchen, keine halbe Furche am Rand)."""
    neu()
    ERDE = mat("Ackererde", (0.27,0.19,0.12), 0.96)
    ERDE2= mat("Erde hell", (0.34,0.25,0.16), 0.95)
    ERDE3= mat("Erde feucht", (0.21,0.15,0.10), 0.97)
    STEIN= mat("Feldstein", (0.52,0.50,0.46), 0.92)
    GRUE = mat("Saatgruen", (0.30,0.52,0.20), 0.90)
    S, PER, RR = 10.0, 0.50, 0.21
    box(0, 0, 0.06, S, S, 0.12, ERDE3)                            # Krume, exakt 10 x 10
    n = int(S / PER)
    for i in range(n):
        y = -S/2 + PER/2 + i*PER
        tonne(0, y, 0.12, RR, S, ERDE if i % 2 == 0 else ERDE2, 10)
    for i in range(n):                                            # Saatreihen in der Furche
        if i % 2: continue
        y = -S/2 + PER/2 + i*PER
        for k in range(12):
            kugel(-4.6 + k*0.84, y, 0.34, 0.09, GRUE, 8)
    for (sx, sy, rr) in ((-3.1, 2.4, 0.15), (2.6, -3.6, 0.13), (4.1, 1.2, 0.11),
                         (-1.4, -1.9, 0.14)):
        kugel(sx, sy, 0.20, rr, STEIN, 8)     # halb eingegraben, ueberragt die Furche nicht
    export("th18_feld_modul", 0.014, 2)

# ================================================================ 10) Windrad
def windrad():
    """Windrad ~28 m: konischer Turm, Gondel, 3 Rotorblaetter. Rotor blickt nach +y."""
    neu()
    WEIS = mat("Turmlack", (0.90,0.91,0.92), 0.42)
    WEIS2= mat("Gondel", (0.84,0.85,0.87), 0.40)
    HELL = mat("Blattlack", (0.94,0.94,0.94), 0.36)
    ROT  = mat("Blattspitze", (0.84,0.20,0.14), 0.45)
    BET  = mat("Fundament", (0.62,0.60,0.56), 0.94)
    DKL  = mat("Tuer", (0.30,0.32,0.34), 0.7)
    STAHL= mat("Stahl", (0.55,0.57,0.60), 0.40, 0.5)
    LICHT= mat("Hindernisfeuer", (1.0,0.30,0.24), 0.3, 0.0, (1.0,0.18,0.14), 2.6)
    ZT0, ZT1 = 0.50, 20.00
    ZH, YH   = 20.40, 1.62                                        # Nabenmitte
    box(0, 0, ZT0/2, 4.20, 4.20, ZT0, BET)                        # Fundament
    kegel(0, 0, (ZT0 + ZT1)/2, 1.18, 0.62, ZT1 - ZT0, WEIS, 20)   # Turm
    for i in range(3):
        zyl(0, 0, 2.4 + i*0.42, 1.14 - i*0.012, 0.14, WEIS2, 20)  # Sockelringe
    box(0, 1.08, 1.55, 0.86, 0.14, 2.10, DKL)                     # Turmtuer
    box(0, 1.14, 1.55, 0.68, 0.06, 1.88, STAHL)
    box(0, -0.60, ZH, 1.60, 3.80, 1.55, WEIS2)                    # Gondel
    box(0, -0.60, ZH + 0.86, 1.20, 3.30, 0.22, WEIS)              # Gondeldeckel
    box(0, -2.48, ZH + 0.30, 0.10, 0.90, 0.70, STAHL)             # Windmesser
    kugel(0, -2.90, ZH + 0.30, 0.14, STAHL, 10)
    box(0, -0.60, ZH + 1.00, 0.34, 0.34, 0.16, LICHT)             # Hindernisfeuer
    zyl(0, 1.30, ZH, 0.60, 0.70, WEIS2, 18, rot=(math.pi/2, 0, 0))
    kegel(0, YH + 0.42, ZH, 0.60, 0.16, 0.72, WEIS, 18, rot=(-math.pi/2, 0, 0))
    for i in range(3):                                            # 3 Rotorblaetter
        th = math.pi/2 + i*math.tau/3
        dx, dz = math.cos(th), math.sin(th)
        for (rr0, rr1, ln, mm) in ((0.55, 0.20, 6.30, HELL), (0.20, 0.09, 1.30, ROT)):
            d0 = 0.60 + (0.0 if mm is HELL else 6.30)
            c  = d0 + ln/2
            o = kegel(dx*c, YH, ZH + dz*c, rr0, rr1, ln, mm, 4,
                      rot=(0, math.pi/2 - th, 0))
            o.scale = (1.25, 0.30, 1.0)                           # Blattprofil: breit
                                                                  # in der Rotorebene,
                                                                  # duenn laengs der Achse
        o = box(dx*0.95, YH, ZH + dz*0.95, 0.62, 0.62, 0.62, WEIS2)
        o.rotation_euler[1] = math.pi/2 - th
    export("th18_windrad", 0.016, 2)

# ================================================================ 11) Wassertank
def wassertank():
    """Wassertank auf Holzgestell, ~6 m, mit Leiter, Podest und Zapfhahn."""
    neu()
    HOLZ = mat("Gestellholz", (0.48,0.33,0.19), 0.86)
    HOLZ2= mat("Holz dunkel", (0.36,0.24,0.14), 0.88)
    DIEL = mat("Podestdielen", (0.55,0.40,0.23), 0.82)
    TANK = mat("Tankblech", (0.60,0.63,0.66), 0.36, 0.5)
    RING = mat("Tankring", (0.48,0.50,0.53), 0.42, 0.5)
    DACH = mat("Tankdeckel", (0.40,0.42,0.45), 0.40, 0.5)
    STAHL= mat("Stahl", (0.55,0.57,0.60), 0.38, 0.5)
    BET  = mat("Punktfundament", (0.62,0.60,0.56), 0.94)
    BLAU = mat("Wasser", (0.20,0.44,0.58), 0.20)
    PB, ZP = 1.35, 3.30                                           # Pfosten-Halbraster, Podest
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(sx*PB, sy*PB, 0.10, 0.52, 0.52, 0.20, BET)        # Fundamentklotz
            box(sx*PB, sy*PB, (0.20 + ZP)/2, 0.22, 0.22, ZP - 0.20, HOLZ)
    for z in (1.15, 2.35):                                        # Riegelkraenze
        for sy in (-1, 1): box(0, sy*PB, z, 2*PB, 0.16, 0.18, HOLZ2)
        for sx in (-1, 1): box(sx*PB, 0, z, 0.16, 2*PB, 0.18, HOLZ2)
    for sy in (-1, 1):                                            # Kreuzstreben laengs x
        strebe_xz(-PB, 0.30, PB, 1.10, sy*PB, 0.12, 0.10, HOLZ2)
        strebe_xz(-PB, 1.10, PB, 0.30, sy*PB, 0.12, 0.10, HOLZ2)
        strebe_xz(-PB, 1.24, PB, 2.30, sy*PB, 0.12, 0.10, HOLZ2)
        strebe_xz(-PB, 2.30, PB, 1.24, sy*PB, 0.12, 0.10, HOLZ2)
    for sx in (-1, 1):                                            # Kreuzstreben laengs y
        strebe_yz(-PB, 0.30, PB, 1.10, sx*PB, 0.12, 0.10, HOLZ2)
        strebe_yz(-PB, 1.10, PB, 0.30, sx*PB, 0.12, 0.10, HOLZ2)
    box(0, 0, ZP + 0.09, 2*PB + 0.50, 2*PB + 0.50, 0.18, HOLZ)    # Kopfrahmen
    for i in range(7):                                            # Podestdielen
        box(0, -1.50 + i*0.50, ZP + 0.22, 2*PB + 0.50, 0.46, 0.08, DIEL)
    ZT = ZP + 0.26                                                # Tankfuss = Podestoberkante
    zyl(0, 0, ZT + 0.875, 1.32, 1.75, TANK, 24)                   # Tank 3.56 - 5.31
    for i in range(3):
        zyl(0, 0, ZT + 0.35 + i*0.55, 1.36, 0.12, RING, 24)
    zyl(0, 0, ZT + 1.79, 1.38, 0.14, RING, 24)
    kegel(0, 0, ZT + 2.08, 1.36, 0.30, 0.50, DACH, 24)            # Kegeldeckel
    zyl(0, 0, ZT + 2.36, 0.32, 0.16, STAHL, 14)                   # Einstiegsluke
    box(0.34, 0, ZT + 2.45, 0.60, 0.44, 0.06, DACH)
    zyl(0, 0, ZT + 1.72, 1.20, 0.05, BLAU, 24)                    # Wasserspiegel
    box(-1.44, 0, ZT + 0.875, 0.10, 0.34, 1.50, RING)             # Standrohr-Anzeige
    zyl(-1.50, 0, ZT + 0.875, 0.05, 1.45, BLAU, 10)
    # --- Fallrohr mit Zapfhahn auf der Schauseite (+y)
    zyl(0.0, 1.15, 2.06, 0.09, 2.88, STAHL, 12)                   # 0.62 - 3.50
    strebe_yz(0.30, ZT + 0.16, 1.15, ZT - 0.10, 0.0, 0.16, 0.16, STAHL)
    box(0, 1.15, 0.62, 0.20, 0.44, 0.16, STAHL)
    zyl(0, 1.42, 0.62, 0.055, 0.30, RING, 10, rot=(math.pi/2, 0, 0))
    box(0, 1.30, 0.80, 0.06, 0.06, 0.20, RING)
    zyl(0, 0.90, 0.09, 0.66, 0.18, HOLZ2, 16)                     # Traenketrog darunter
    zyl(0, 0.90, 0.16, 0.56, 0.06, BLAU, 16)
    # --- Leiter auf +y bis aufs Podest
    leiter(0.72, PB + 0.42, 0.05, ZP + 0.50, HOLZ, 0.50, 0.31, 0.07, 'y')
    gelaender(-PB - 0.25, PB + 0.25, -PB - 0.25, ZP + 0.26, HOLZ2, 0.95, 'x')
    for sx in (-PB - 0.25, PB + 0.25):
        gelaender(-PB - 0.25, PB + 0.25, sx, ZP + 0.26, HOLZ2, 0.95, 'y')
    gelaender(-PB - 0.25, 0.20, PB + 0.25, ZP + 0.26, HOLZ2, 0.95, 'x')
    export("th18_wassertank", 0.016, 2)


if __name__ == "__main__":
    print("Asset-Charge th18 (Bauernhof und Stadtrand):")
    for fn in (scheune, stall, silo, gewaechshaus, traktor, anhaenger,
               heuballen, zaun_modul, feld_modul, windrad, wassertank):
        fn()
    print("fertig")
