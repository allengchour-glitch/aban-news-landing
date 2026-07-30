# -*- coding: utf-8 -*-
"""Asset-Charge 24 (th29_*): WINTER UND WEIHNACHTSMARKT — Marktbude, geschmueckter
Baum, Freiluft-Eisbahn, Schneemaenner, Rodelhang, Skiliftmast.

Konventionen wie th5-th24:
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * Eingang liegt auf Blender +y  ->  in three.js -z (glTF dreht die Achsen).
  * Jede Oeffnung >= 3.0 m licht, Innenhoehe >= 4.0 m, ueberall ein Boden.
  * Aussensockel und Innenboden enden BEIDE auf `FB` -> keine Schwelle in der Tuer.
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

def mat(name, rgb, rough=0.7, metal=0.0, emit=None, estr=1.3):
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

def kegel(x, y, z, r1, r2, h, m=None, seg=12, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
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
            # (Teuerster Fehler dieser Charge: Moebel auf z=0 gesetzt, waehrend der
            #  begehbare Boden hoeher lag — Stuehle steckten komplett im Boden.)

def boden(B, T, m_sockel, m_boden, rand=2.0):
    box(0, 0, FB/2, B + rand, T + rand, FB, m_sockel)     # Vorplatz
    box(0, 0, FB/2, B, T, FB, m_boden)                    # Innenboden, buendig

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

def platte_mit_loch(cx, cy, z, B, T, dicke, lb, lt, m):
    """Geschossdecke mit rechteckigem Luftraum (Galerie/Atrium) — 4 Streifen."""
    sv = (T - lt)/2.0
    sh = (B - lb)/2.0
    if sv > 0.01:
        box(cx, cy - lt/2 - sv/2, z, B, sv, dicke, m)
        box(cx, cy + lt/2 + sv/2, z, B, sv, dicke, m)
    if sh > 0.01:
        box(cx - lb/2 - sh/2, cy, z, sh, lt, dicke, m)
        box(cx + lb/2 + sh/2, cy, z, sh, lt, dicke, m)

def tonne(cx, cy, z, r, laenge, m, seg=24):
    """HALBES Tonnengewoelbe: Zylinder mit Achse in x, untere Haelfte weggeschnitten.
    Basis liegt exakt bei z, sitzt also buendig auf der Mauerkrone. Ein voller Zylinder
    taugt nicht: seine untere Haelfte steckt im Gebaeude und verdeckt von innen alles."""
    o = zyl(cx, cy, z, r, laenge, m, seg, rot=(0, math.pi/2, 0))
    nur(o)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    bm.to_mesh(o.data); bm.free(); o.data.update()
    return o

# ---------------------------------------------------------------- Gelaender + Treppe
def gelaender(a0, a1, fest, z, m, hoehe=1.05, achse='x'):
    """Handlauf + Staebe. achse='x': laeuft in x bei y=fest."""
    L = abs(a1 - a0)
    if L < 0.05: return            # degenerierter Aufruf wuerde nur Muell erzeugen
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
    """Gelaender an ALLEN 4 Kanten eines Galerie-Lochs — sonst faellt man seitlich runter."""
    gelaender(cx-lb/2, cx+lb/2, cy-lt/2, z, m, hoehe, 'x')
    gelaender(cx-lb/2, cx+lb/2, cy+lt/2, z, m, hoehe, 'x')
    gelaender(cy-lt/2, cy+lt/2, cx-lb/2, z, m, hoehe, 'y')
    gelaender(cy-lt/2, cy+lt/2, cx+lb/2, z, m, hoehe, 'y')

def treppe(cx, y0, z0, breite, hoehe_ges, m, m_gel=None, steig=0.17, auftritt=0.28,
           richtung=-1):
    """Treppenlauf mit begehbarer Steigung (~0.17 m) und mitlaufendem Gelaender.
    Gibt (n, y_ende, lauflaenge) zurueck, damit der Anschluss nachgerechnet werden kann."""
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
            # Handlauf: schlanke Segmente, um den Steigungswinkel GEDREHT. Ungedreht
            # muessten sie so hoch wie die Steigung sein und wirken als fetter Klotz.
            winkel = richtung * math.atan2(st, auftritt)
            laenge = math.hypot(auftritt, st) * 1.06
            for i in range(n):
                o = box(sx, y0 + richtung*(i + 0.5)*auftritt,
                        z0 + (i + 0.5)*st + 1.06, 0.07, laenge, 0.08, m_gel)
                o.rotation_euler[0] = winkel
    return n, y0 + richtung*n*auftritt, n*auftritt



# ---------------------------------------------------------------- Extra-Helfer
def kugel_(x, y, z, r, m=None, seg=16):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, y, z),
                                         segments=seg, ring_count=max(6, seg//2))
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def lichterkette(punkte, m_kabel, m_licht, r_licht=0.075):
    """Kabel als kurze Segmente zwischen den Punkten, dazwischen Lampen.
    Die Segmente werden ueber `atan2` ausgerichtet — eine Reihe einzelner Boxen
    ohne Drehung wuerde als Treppe lesen."""
    for i in range(len(punkte) - 1):
        (x0, y0, z0), (x1, y1, z1) = punkte[i], punkte[i+1]
        dx, dy, dz = x1-x0, y1-y0, z1-z0
        L = math.sqrt(dx*dx + dy*dy + dz*dz)
        o = box((x0+x1)/2, (y0+y1)/2, (z0+z1)/2, 0.035, L, 0.035, m_kabel)
        o.rotation_euler[2] = math.atan2(dy, dx) - math.pi/2
        o.rotation_euler[0] = math.atan2(dz, math.hypot(dx, dy))
        kugel_(x0 + dx*0.5, y0 + dy*0.5, z0 + dz*0.5 - 0.09, r_licht, m_licht, 10)

def tanne(cx, cy, z0, hoehe, m_stamm, m_nadel, etagen=6, m_kugel=None, m_licht=None):
    """Nadelbaum aus gestapelten Kegeln. Kugeln und Lichter optional."""
    zyl(cx, cy, z0 + hoehe*0.06, hoehe*0.035, hoehe*0.12, m_stamm, 10)
    for e in range(etagen):
        f = e/etagen
        r = hoehe*0.30*(1.0 - f*0.78)
        zz = z0 + hoehe*0.12 + f*hoehe*0.80
        kegel(cx, cy, zz + hoehe*0.11, r, r*0.30, hoehe*0.22, m_nadel, 14)
        if m_kugel:
            for k in range(5):
                a = (e*1.7 + k*1.257)
                kugel_(cx + math.cos(a)*r*0.80, cy + math.sin(a)*r*0.80,
                       zz + hoehe*0.045, hoehe*0.018, m_kugel, 8)
    if m_licht:
        for k in range(26):
            a = k*0.98
            f = k/26.0
            r = hoehe*0.30*(1.0 - f*0.76)
            kugel_(cx + math.cos(a)*r*0.86, cy + math.sin(a)*r*0.86,
                   z0 + hoehe*0.16 + f*hoehe*0.76, hoehe*0.013, m_licht, 8)

# ================================================================ 1) Marktbude
def weihnachtsbude():
    """Marktbude mit Giebeldach, Schneeauflage, Theke, Waren, Girlande, Tannengruen."""
    neu()
    HOLZ = mat("Budenholz", (0.44,0.28,0.16), 0.85)
    HOLZ2= mat("Rahmen", (0.32,0.20,0.11), 0.8)
    DACH = mat("Dachschindel", (0.30,0.22,0.16), 0.9)
    SCHNEE= mat("Schnee", (0.94,0.95,0.97), 0.85)
    THEKE= mat("Theke", (0.58,0.40,0.24), 0.75)
    ROT  = mat("Stoff", (0.66,0.14,0.14), 0.85)
    GRUEN= mat("Tannengruen", (0.14,0.34,0.18), 0.9)
    WARE = mat("Ware", (0.78,0.62,0.30), 0.7)
    WARE2= mat("Ware2", (0.72,0.24,0.22), 0.7)
    LICHT= mat("Lichterkette", (1.0,0.88,0.55), 0.25, 0.0, (1.0,0.80,0.40), 2.4)
    KABEL= mat("Kabel", (0.18,0.16,0.14), 0.7)
    B, T, H = 4.4, 3.0, 2.6
    box(0, 0, 0.09, B + 1.6, T + 2.4, 0.18, mat("Platz", (0.52,0.50,0.48), 0.92))
    box(0, 0, 0.18 + 0.05, B, T, 0.10, HOLZ2)                     # Podest
    for sx in (-B/2 + 0.09, B/2 - 0.09):                          # Eckpfosten
        for sy in (-T/2 + 0.09, T/2 - 0.09):
            box(sx, sy, 0.28 + H/2, 0.18, 0.18, H, HOLZ2)
    box(0, -T/2 + 0.09, 0.28 + H/2, B, 0.16, H, HOLZ)             # Rueckwand
    for sx in (-B/2 + 0.09, B/2 - 0.09):
        box(sx, 0, 0.28 + H/2, 0.16, T, H, HOLZ)                  # Seitenwaende
    box(0, T/2 - 0.09, 0.28 + H - 0.35, B, 0.16, 0.70, HOLZ)      # Sturz vorn
    box(0, T/2 - 0.40, 0.28 + 0.52, B - 0.4, 0.70, 1.04, THEKE)   # Theke
    box(0, T/2 - 0.40, 0.28 + 1.08, B - 0.2, 0.86, 0.08, HOLZ2)   # Thekenplatte
    for i in range(6):                                            # Waren auf der Theke
        box(-1.6 + i*0.64, T/2 - 0.42, 0.28 + 1.20, 0.44, 0.44, 0.16,
            WARE if i % 2 == 0 else WARE2)
    for k in range(3):                                            # Regal an der Rueckwand
        box(0, -T/2 + 0.30, 0.28 + 0.90 + k*0.46, B - 0.6, 0.34, 0.06, HOLZ2)
        for i in range(7):
            box(-1.7 + i*0.57, -T/2 + 0.30, 0.28 + 1.02 + k*0.46, 0.30, 0.24, 0.18,
                WARE2 if (i + k) % 2 == 0 else WARE)
    # Satteldach als zwei geneigte Platten + First
    neig = math.atan2(1.10, T/2 + 0.45)
    for s in (-1, 1):
        laenge = math.hypot(1.10, T/2 + 0.45)
        o = box(0, s*(T/4 + 0.22), 0.28 + H + 0.55, B + 0.9, laenge, 0.16, DACH)
        o.rotation_euler[0] = -s*neig
        o2 = box(0, s*(T/4 + 0.22), 0.28 + H + 0.68, B + 0.86, laenge*0.92, 0.10, SCHNEE)
        o2.rotation_euler[0] = -s*neig
    box(0, 0, 0.28 + H + 1.12, B + 0.9, 0.22, 0.18, DACH)         # First
    box(0, 0, 0.28 + H + 1.24, B + 0.8, 0.30, 0.12, SCHNEE)
    box(0, T/2 + 0.30, 0.28 + H + 0.30, B + 0.6, 0.14, 0.34, ROT) # Schriftband
    for i in range(9):                                            # Tannengruen am Sturz
        kugel_(-B/2 + 0.35 + i*0.47, T/2 + 0.24, 0.28 + H - 0.68, 0.20, GRUEN, 8)
    lichterkette([(-B/2 - 0.3, T/2 + 0.30, 0.28 + H + 0.06),
                  (-B/4, T/2 + 0.30, 0.28 + H - 0.14),
                  (0.0, T/2 + 0.30, 0.28 + H - 0.20),
                  (B/4, T/2 + 0.30, 0.28 + H - 0.14),
                  (B/2 + 0.3, T/2 + 0.30, 0.28 + H + 0.06)], KABEL, LICHT)
    export("th29_weihnachtsbude", 0.016, 2)

# ================================================================ 2) Geschmueckter Baum
def christbaum():
    """Grosse geschmueckte Tanne auf Kreuzfuss, mit Kugeln, Lichtern und Spitze."""
    neu()
    STAMM= mat("Stamm", (0.32,0.22,0.14), 0.9)
    NADEL= mat("Nadel", (0.12,0.30,0.16), 0.92)
    KUGEL= mat("Christbaumkugel", (0.78,0.16,0.16), 0.35, 0.4)
    LICHT= mat("Lichterkette", (1.0,0.90,0.60), 0.25, 0.0, (1.0,0.84,0.45), 2.6)
    GOLD = mat("Spitze", (0.82,0.66,0.26), 0.3, 0.6)
    SCHNEE= mat("Schnee", (0.94,0.95,0.97), 0.85)
    HOLZ = mat("Fuss", (0.36,0.24,0.15), 0.85)
    zyl(0, 0, 0.09, 1.30, 0.18, SCHNEE, 24)                       # Schneeteller
    for a in (0.0, math.pi/2):                                    # Kreuzfuss
        o = box(0, 0, 0.30, 2.20, 0.26, 0.24, HOLZ)
        o.rotation_euler[2] = a
    tanne(0, 0, 0.42, 9.0, STAMM, NADEL, 7, KUGEL, LICHT)
    kegel(0, 0, 9.85, 0.26, 0.0, 0.90, GOLD, 10)                  # Spitze
    for k in range(7):                                            # Schneeauflage auf den Etagen
        f = k/7.0
        r = 9.0*0.30*(1.0 - f*0.78)
        zyl(0, 0, 0.42 + 9.0*0.12 + f*9.0*0.80 + 9.0*0.005, r*0.94, 0.05, SCHNEE, 14)
    export("th29_christbaum", 0.018, 2)

# ================================================================ 3) Freiluft-Eisbahn
def eisbahn_freiluft():
    """Eisfläche mit Bande, Lichtermasten, Schlittschuhverleih-Huette, Baenken."""
    neu()
    EIS  = mat("Eis", (0.78,0.88,0.94), 0.12, 0.15)
    SCHNEE= mat("Schneerand", (0.92,0.94,0.96), 0.85)
    BANDE= mat("Bande", (0.88,0.88,0.90), 0.6)
    ROT  = mat("Bandenstreifen", (0.74,0.16,0.16), 0.6)
    HOLZ = mat("Huette", (0.44,0.29,0.17), 0.85)
    DACH = mat("Dach", (0.30,0.22,0.16), 0.9)
    STAHL= mat("Mast", (0.36,0.38,0.40), 0.45, 0.5)
    LICHT= mat("Lichterkette", (1.0,0.92,0.68), 0.25, 0.0, (1.0,0.88,0.55), 2.4)
    KABEL= mat("Kabel", (0.18,0.16,0.14), 0.7)
    NADEL= mat("Nadel", (0.12,0.30,0.16), 0.92)
    STAMM= mat("Stamm", (0.32,0.22,0.14), 0.9)
    B, T = 30.0, 20.0
    box(0, 0, 0.10, B + 4.0, T + 4.0, 0.20, SCHNEE)               # Umgebung
    box(0, 0, 0.22, B, T, 0.04, EIS)                              # Eisflaeche
    for i in range(30):                                           # Wischspuren
        box(-B/2 + 1.0 + i*1.0, (i % 5 - 2)*3.0, 0.245, 0.7, 5.0, 0.01,
            mat("Spur", (0.84,0.92,0.96), 0.10) if i == 0 else EIS)
    for (cx, cy, laenge, achse) in ((0, -T/2, B, 'x'), (0, T/2, B, 'x'),
                                    (-B/2, 0, T, 'y'), (B/2, 0, T, 'y')):
        if achse == 'x':
            box(cx, cy, 0.24 + 0.55, laenge, 0.22, 1.10, BANDE)
            box(cx, cy, 0.24 + 1.02, laenge, 0.28, 0.12, ROT)
        else:
            box(cx, cy, 0.24 + 0.55, 0.22, laenge, 1.10, BANDE)
            box(cx, cy, 0.24 + 1.02, 0.28, laenge, 0.12, ROT)
    for sx in (-12.0, -4.0, 4.0, 12.0):                           # Lichtermasten
        for sy in (-T/2 - 1.6, T/2 + 1.6):
            zyl(sx, sy, 0.20 + 2.60, 0.13, 5.20, STAHL, 10)
            kugel_(sx, sy, 0.20 + 5.30, 0.22, LICHT, 10)
    for sy in (-T/2 - 1.6, T/2 + 1.6):                            # Girlanden zwischen den Masten
        for k in range(3):
            x0, x1 = -12.0 + k*8.0, -4.0 + k*8.0
            lichterkette([(x0, sy, 5.10), ((x0+x1)/2, sy, 4.20), (x1, sy, 5.10)],
                         KABEL, LICHT)
    box(-B/2 - 3.6, 5.0, 0.20 + 1.30, 6.0, 4.4, 2.60, HOLZ)       # Verleih-Huette
    box(-B/2 - 3.6, 5.0, 0.20 + 2.78, 6.6, 5.0, 0.36, DACH)
    box(-B/2 - 3.6, 5.0, 0.20 + 3.02, 6.4, 4.8, 0.14, SCHNEE)
    box(-B/2 - 3.6, 2.85, 0.20 + 1.40, 4.4, 0.20, 1.10, mat("Fenster",(0.30,0.42,0.50),0.2))
    box(-B/2 - 3.6, 2.70, 0.20 + 0.82, 4.8, 0.40, 0.10, HOLZ)     # Ausgabebrett
    for sx in (-9.0, 0.0, 9.0):                                   # Baenke am Rand
        box(sx, T/2 + 2.6, 0.20 + 0.44, 2.4, 0.50, 0.10, HOLZ)
        box(sx, T/2 + 2.86, 0.20 + 0.76, 2.4, 0.10, 0.54, HOLZ)
        for bx in (-0.9, 0.9):
            box(sx + bx, T/2 + 2.6, 0.20 + 0.20, 0.10, 0.46, 0.40, STAHL)
    for (tx, ty, th_) in ((B/2 + 3.0, -6.0, 5.0), (B/2 + 4.4, 1.0, 3.8)):
        tanne(tx, ty, 0.20, th_, STAMM, NADEL, 6)
        zyl(tx, ty, 0.24, 1.1, 0.08, SCHNEE, 14)
    export("th29_eisbahn_freiluft", 0.020, 2)

# ================================================================ 4) Schneemaenner
def schneemaenner():
    """Drei Schneemaenner verschiedener Groesse mit Hut, Schal, Nase, Armen."""
    neu()
    SCHNEE= mat("Schnee", (0.95,0.96,0.98), 0.82)
    KOHLE= mat("Kohle", (0.10,0.10,0.12), 0.75)
    MOEHRE= mat("Moehre", (0.90,0.46,0.14), 0.7)
    SCHAL= mat("Schal", (0.72,0.16,0.18), 0.9)
    SCHAL2= mat("Schal2", (0.18,0.36,0.62), 0.9)
    HUT  = mat("Hut", (0.14,0.14,0.16), 0.8)
    AST  = mat("Ast", (0.34,0.24,0.15), 0.9)
    for (cx, cy, s, schal) in ((-2.6, 0.4, 1.00, SCHAL), (0.0, 0.0, 1.25, SCHAL2),
                               (2.4, 0.6, 0.78, SCHAL)):
        r1, r2, r3 = 0.62*s, 0.44*s, 0.30*s
        zyl(cx, cy, 0.03, r1*1.25, 0.06, SCHNEE, 18)              # Schneeteller
        kugel_(cx, cy, 0.06 + r1, r1, SCHNEE, 18)
        kugel_(cx, cy, 0.06 + 2*r1 + r2*0.72, r2, SCHNEE, 18)
        zk = 0.06 + 2*r1 + 2*r2*0.72 + r3*0.72
        kugel_(cx, cy, zk, r3, SCHNEE, 18)
        for k in range(3):                                        # Knoepfe
            kugel_(cx, cy - r2*0.94, 0.06 + 2*r1 + r2*0.30 + k*r2*0.42, 0.035*s, KOHLE, 8)
        for sx2 in (-0.34, 0.34):                                 # Augen
            kugel_(cx + sx2*r3, cy - r3*0.86, zk + r3*0.24, 0.038*s, KOHLE, 8)
        o = kegel(cx, cy - r3 - 0.11*s, zk, 0.055*s, 0.0, 0.30*s, MOEHRE, 10)
        o.rotation_euler[0] = -math.pi/2                          # Nase waagrecht
        zyl(cx, cy, 0.06 + 2*r1 + 2*r2*0.72 - r3*0.16, r3*1.06, 0.11*s, schal, 16)
        o = box(cx, cy - r3*1.02, 0.06 + 2*r1 + 2*r2*0.72 - r3*0.10, 0.16*s, 0.10*s, 0.52*s, schal)
        zyl(cx, cy, zk + r3*0.80, r3*1.25, 0.06*s, HUT, 16)       # Hutkrempe
        zyl(cx, cy, zk + r3*1.10, r3*0.72, 0.56*s, HUT, 16)       # Zylinder
        for sx2 in (-1, 1):                                       # Arme aus Aesten
            o = zyl(cx + sx2*(r2 + 0.36*s), cy, 0.06 + 2*r1 + r2*0.86, 0.035*s, 0.86*s, AST, 8,
                    rot=(0, math.pi/2, 0))
            o.rotation_euler[1] = math.pi/2 + sx2*0.22
            zyl(cx + sx2*(r2 + 0.72*s), cy, 0.06 + 2*r1 + r2*1.30, 0.026*s, 0.34*s, AST, 6,
                rot=(0, sx2*0.7, 0))
    export("th29_schneemaenner", 0.014, 2)

# ================================================================ 5) Rodelhang
def rodelhang():
    """Rodelbahn-Modul: Schneepiste zwischen zwei Waellen, Strohballen, Bande.
    Reiht in x auf exakt 12,0 m; die Bahn faellt in y ab."""
    neu()
    SCHNEE= mat("Piste", (0.93,0.95,0.97), 0.85)
    SCHNEE2= mat("Wall", (0.88,0.90,0.94), 0.88)
    STROH= mat("Strohballen", (0.74,0.62,0.30), 0.9)
    HOLZ = mat("Absperrung", (0.44,0.30,0.18), 0.85)
    NADEL= mat("Nadel", (0.12,0.30,0.16), 0.92)
    STAMM= mat("Stamm", (0.32,0.22,0.14), 0.9)
    ROT  = mat("Fahne", (0.78,0.16,0.16), 0.8)
    B, T = 12.0, 20.0
    box(0, 0, 0.35, B, T, 0.70, SCHNEE)                           # Pistenkoerper
    box(0, 0, 0.72, B - 3.0, T, 0.06, mat("Spur", (0.86,0.90,0.94), 0.7))
    for sx in (-B/2 + 1.0, B/2 - 1.0):                            # Schneewaelle
        # Ein um 90 Grad gekippter Kegel legt seinen RADIUS auf die z-Achse und taucht
        # damit r tief unter den Boden (hier gemessene -0,69). Stattdessen ein Quader
        # mit aufgesetztem Halbzylinder, dessen untere Haelfte im Quader verschwindet.
        box(sx, 0, 0.70 + 0.35, 2.00, T, 0.70, SCHNEE2)
        zyl(sx, 0, 0.70 + 0.70, 1.00, T, SCHNEE2, 14, rot=(math.pi/2, 0, 0))
    for sx in (-B/2 + 0.6, B/2 - 0.6):                            # Strohballen als Prallschutz
        for k in range(5):
            zyl(sx, -T/2 + 2.0 + k*4.0, 0.70 + 0.42, 0.42, 1.10, STROH, 12,
                rot=(0, math.pi/2, 0))
    for sx in (-B/2 + 0.15, B/2 - 0.15):                          # Absperrung
        for k in range(6):
            box(sx, -T/2 + 1.6 + k*3.4, 0.70 + 0.55, 0.12, 0.12, 1.10, HOLZ)
        box(sx, 0, 0.70 + 0.98, 0.10, T - 1.2, 0.10, HOLZ)
    for k in range(4):                                            # Streckenfahnen
        zyl(-B/2 + 0.15, -T/2 + 3.0 + k*4.6, 0.70 + 1.42, 0.05, 0.60, HOLZ, 6)
        box(-B/2 + 0.44, -T/2 + 3.0 + k*4.6, 0.70 + 1.62, 0.56, 0.04, 0.34, ROT)
    for (tx, ty, th_) in ((-B/2 - 2.2, -5.0, 4.6), (B/2 + 2.4, 3.0, 5.4)):
        tanne(tx, ty, 0.0, th_, STAMM, NADEL, 6)
        zyl(tx, ty, 0.04, 1.0, 0.08, SCHNEE, 14)
    export("th29_rodelhang", 0.018, 2)

# ================================================================ 6) Skiliftmast
def skiliftmast():
    """Schlepplift-Mast mit Rollenbatterie, Buegeln am Seil und Leiter."""
    neu()
    STAHL= mat("Mast", (0.44,0.46,0.50), 0.45, 0.5)
    GELB = mat("Warnfarbe", (0.90,0.76,0.20), 0.7)
    GUMMI= mat("Rolle", (0.16,0.16,0.18), 0.8)
    SEIL = mat("Seil", (0.30,0.30,0.32), 0.6, 0.3)
    HOLZ = mat("Buegel", (0.40,0.28,0.18), 0.85)
    SCHNEE= mat("Schnee", (0.93,0.95,0.97), 0.85)
    BET  = mat("Fundament", (0.56,0.55,0.52), 0.9)
    H = 9.0
    zyl(0, 0, 0.10, 0.90, 0.20, SCHNEE, 20)
    box(0, 0, 0.35, 1.40, 1.40, 0.50, BET)                        # Fundament
    zyl(0, 0, 0.60 + (H - 0.60)/2, 0.24, H - 0.60, STAHL, 12)     # Mast
    for k in range(3):                                            # Warnringe
        zyl(0, 0, 1.20 + k*0.50, 0.26, 0.22, GELB, 12)
    box(0, 0, H + 0.16, 3.20, 0.34, 0.32, STAHL)                  # Ausleger
    for sx in (-1.35, 1.35):                                      # Rollenbatterien
        box(sx, 0, H - 0.14, 1.10, 0.30, 0.26, STAHL)
        for k in range(4):
            zyl(sx - 0.42 + k*0.28, 0, H - 0.34, 0.13, 0.16, GUMMI, 12,
                rot=(math.pi/2, 0, 0))
    box(0, 0, H - 0.40, 2.80, 0.08, 0.08, SEIL)                   # Seil ueber die Rollen
    for sx in (-1.0, 0.4):                                        # 2 Schleppbuegel
        zyl(sx, 0, H - 0.40 - 1.10, 0.05, 2.20, SEIL, 8)
        box(sx, 0, H - 0.40 - 2.34, 0.42, 0.10, 0.28, HOLZ)
        for bx in (-0.19, 0.19):
            box(sx + bx, 0, H - 0.40 - 2.10, 0.06, 0.06, 0.48, HOLZ)
    for k in range(14):                                           # Steigleiter
        box(0.30, 0, 0.70 + k*0.42, 0.46, 0.05, 0.05, STAHL)
    for sx in (0.09, 0.51):
        box(sx, 0, 0.70 + 6.5*0.42, 0.05, 0.05, 13*0.42, STAHL)
    export("th29_skiliftmast", 0.016, 2)

if __name__ == "__main__":
    print("Asset-Charge 24 (th29, Winter und Weihnachtsmarkt):")
    for fn in (weihnachtsbude, christbaum, eisbahn_freiluft, schneemaenner,
               rodelhang, skiliftmast):
        fn()
    print("fertig")
