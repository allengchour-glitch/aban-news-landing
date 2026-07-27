# -*- coding: utf-8 -*-
"""Asset-Charge 19 (th24_*): ZOO UND TIERPARK — Gehege, Voliere, Aquarienhaus,
Streichelzoo, Eingangsgebaeude. Die Tiere selbst baut die Spiel-Session; hier
kommen die Anlagen.

Konventionen wie th5-th23:
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

def mat(name, rgb, rough=0.7, metal=0.0, emit=None, estr=1.3, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], alpha)
    if alpha < 1.0:
        b.inputs["Alpha"].default_value = alpha
        m.blend_method = 'BLEND'
        m.show_transparent_back = False
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
def fels(cx, cy, cz, r, m, seg=9, hoehe=1.0):
    """Felsblock: Kegelstumpf mit wenigen Segmenten, leicht gekippt — liest sich
    natuerlicher als eine Box und bleibt trotzdem billig.
    Das Kippen senkt eine Seite ab; die Hebung wird herausgerechnet, sonst taucht
    der Fels unter z=0 (im Gehege gemessene -0,08)."""
    rx, ry = 0.10, -0.08
    lift = r*(abs(math.sin(rx)) + abs(math.sin(ry)))
    o = kegel(cx, cy, cz + lift + r*hoehe/2, r, r*0.55, r*hoehe, m, seg)
    o.rotation_euler[0] = rx
    o.rotation_euler[1] = ry
    return o

def gitterwand(cx, cy, laenge, hoehe, z0, m, achse='x', n=None, dick=0.055):
    """Senkrechte Gitterstaebe zwischen zwei Riegeln — Zaun, Gehege, Voliere."""
    if n is None: n = max(2, int(laenge / 0.28))
    for i in range(n + 1):
        t = -laenge/2 + laenge*i/n
        if achse == 'x': box(cx + t, cy, z0 + hoehe/2, dick, dick, hoehe, m)
        else:            box(cx, cy + t, z0 + hoehe/2, dick, dick, hoehe, m)
    for zz in (z0 + 0.06, z0 + hoehe - 0.06):
        if achse == 'x': box(cx, cy, zz, laenge, dick*1.6, dick*1.6, m)
        else:            box(cx, cy, zz, dick*1.6, laenge, dick*1.6, m)

def baumstamm(cx, cy, z0, hoehe, r, m_stamm, m_laub, seg=10):
    """Einfacher Baum fuer Gehege und Volieren."""
    zyl(cx, cy, z0 + hoehe/2, r, hoehe, m_stamm, seg)
    for k, (dz, rr) in enumerate(((hoehe*0.92, hoehe*0.34), (hoehe*1.14, hoehe*0.26),
                                  (hoehe*1.30, hoehe*0.17))):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=rr, location=(cx, cy, z0 + dz),
                                             segments=12, ring_count=7)
        bpy.context.active_object.data.materials.append(m_laub)

# ================================================================ 1) Freigehege
def gehege():
    """Modulares Freigehege: Wassergraben, Bruestung, Felsen, Baeume, Unterstand.
    Reiht in x auf exakt 16,0 m."""
    neu()
    RAS  = mat("Gehegewiese", (0.24,0.44,0.20), 0.92)
    ERDE = mat("Erde", (0.30,0.23,0.16), 0.95)
    FELS = mat("Fels", (0.44,0.43,0.41), 0.92)
    WASS = mat("Wasser", (0.20,0.42,0.54), 0.14, 0.2)
    BET  = mat("Bruestung", (0.58,0.57,0.54), 0.85)
    STAHL= mat("Gelaender", (0.34,0.36,0.38), 0.45, 0.5)
    STAMM= mat("Stamm", (0.34,0.24,0.15), 0.85)
    LAUB = mat("Laub", (0.20,0.42,0.18), 0.9)
    HOLZ = mat("Unterstand", (0.42,0.29,0.18), 0.8)
    DACH = mat("Dach", (0.36,0.30,0.22), 0.85)
    B, T = 16.0, 14.0
    box(0, 0, 0.15, B, T, 0.30, RAS)                              # Gehegeflaeche
    box(0, 2.0, 0.32, B-1.0, 7.0, 0.06, ERDE)                     # Sandflaeche
    box(0, T/2 - 0.9, 0.34, B, 1.8, 0.68, BET)                    # Besucherbruestung
    gitterwand(0, T/2 - 0.9, B, 0.90, 0.68, STAHL, 'x')
    box(0, T/2 - 1.9, 0.16, B, 1.2, 0.32, WASS)                   # Wassergraben
    box(0, T/2 - 2.55, 0.24, B, 0.30, 0.48, FELS)                 # Grabenkante
    for sx in (-6.4, -3.0, 4.2, 6.8):                             # Felsgruppe
        fels(sx, -4.0 + (sx % 3), 0.30, 1.1 + (abs(sx) % 1.4), FELS, 9, 1.1)
    baumstamm(-5.2, -1.0, 0.30, 3.4, 0.26, STAMM, LAUB)
    baumstamm(5.6, -3.4, 0.30, 2.8, 0.22, STAMM, LAUB)
    box(-2.0, -5.2, 1.40, 5.0, 3.4, 2.20, HOLZ)                   # Unterstand
    box(-2.0, -5.2, 2.66, 5.6, 3.9, 0.32, DACH)
    box(-2.0, -3.55, 1.90, 5.0, 0.20, 1.20, HOLZ)                 # Rueckwand-Ausschnitt
    for sx in (-4.2, 0.2):
        box(sx, -6.8, 1.10, 0.22, 0.22, 1.60, HOLZ)
    box(3.6, 1.2, 0.46, 1.8, 1.8, 0.28, FELS)                     # Futterplattform
    box(-7.4, T/2 - 0.9, 1.30, 1.2, 0.16, 1.20, HOLZ)             # Infotafel
    box(-7.4, T/2 - 1.0, 1.30, 1.1, 0.06, 1.05,
        mat("Infotext", (0.90,0.88,0.82), 0.6))
    export("th24_gehege", 0.020, 2)

# ================================================================ 2) Voliere
def voliere():
    """Begehbare Grossvoliere: Netzkuppel auf Ringstuetzen, Baeume, Sitzstangen, Teich."""
    neu()
    RAS  = mat("Volierenboden", (0.26,0.44,0.22), 0.92)
    WEG  = mat("Weg", (0.60,0.56,0.48), 0.9)
    NETZ = mat("Netz", (0.34,0.36,0.38), 0.6, 0.0, None, 1.3, 0.22)   # durchsichtig,
    #  sonst ist die Voliere ein geschlossenes Fass statt eines bespannten Gerippes
    STAHL= mat("Bogen", (0.40,0.42,0.45), 0.45, 0.5)
    STAMM= mat("Stamm", (0.34,0.24,0.15), 0.85)
    LAUB = mat("Laub", (0.22,0.44,0.20), 0.9)
    WASS = mat("Teich", (0.20,0.44,0.56), 0.14, 0.2)
    FELS = mat("Fels", (0.46,0.45,0.42), 0.92)
    R, H = 11.0, 9.0
    zyl(0, 0, FB/2, R + 1.2, FB, WEG, 32)                         # Sockelscheibe
    zyl(0, 0, FB + 0.02, R, 0.04, RAS, 32)
    box(0, 0, FB + 0.03, 2.6, 2*R, 0.05, WEG)                     # Besucherweg quer durch
    for i in range(16):                                           # Ringstuetzen mit Netz
        a = i/16*math.tau
        zyl(math.cos(a)*R, math.sin(a)*R, FB + H*0.32, 0.16, H*0.64, STAHL, 8)
    for i in range(16):                                           # Netzfelder als Gitter
        a0 = i/16*math.tau
        a1 = (i+1)/16*math.tau
        mx, my = (math.cos(a0)+math.cos(a1))/2*R, (math.sin(a0)+math.sin(a1))/2*R
        o = box(mx, my, FB + H*0.32, R*0.40, 0.05, H*0.62, NETZ)
        o.rotation_euler[2] = (a0 + a1)/2 + math.pi/2
    for k, (rr, zz) in enumerate(((R*0.86, FB + H*0.70), (R*0.58, FB + H*0.86),
                                  (R*0.24, FB + H*0.96))):        # Kuppelringe
        zyl(0, 0, zz, rr, 0.10, STAHL, 32)
        for i in range(16):
            a = i/16*math.tau
            o = box(math.cos(a)*rr*0.98, math.sin(a)*rr*0.98, zz - 0.30, rr*0.42, 0.05, 0.62, NETZ)
            o.rotation_euler[2] = a + math.pi/2
    zyl(0, 0, FB + H*0.99, 0.9, 0.16, STAHL, 20)
    for (bx, by, bh) in ((-5.4, 3.2, 4.2), (4.6, -2.6, 3.6), (-2.0, -5.6, 3.0)):
        baumstamm(bx, by, FB, bh, 0.24, STAMM, LAUB)
    for k in range(5):                                            # Sitzstangen
        zyl(-6.0 + k*3.0, 4.6, FB + 1.9 + (k % 2)*0.7, 0.07, 4.0, STAMM, 8,
            rot=(0, math.pi/2, 0))
        for sx in (-1.9, 1.9):
            zyl(-6.0 + k*3.0 + sx, 4.6, FB + (1.9 + (k % 2)*0.7)/2, 0.08,
                1.9 + (k % 2)*0.7, STAMM, 8)
    zyl(5.4, 4.2, FB + 0.06, 2.6, 0.12, WASS, 20)                 # Teich
    for i in range(7):
        a = i/7*math.tau
        fels(5.4 + math.cos(a)*2.9, 4.2 + math.sin(a)*2.9, FB, 0.55, FELS, 7, 0.7)
    export("th24_voliere", 0.020, 2)

# ================================================================ 3) Aquarienhaus
def aquarienhaus():
    """Begehbar: dunkler Rundgang mit beleuchteten Becken links und rechts."""
    neu()
    W    = mat("AquaWand", (0.14,0.18,0.22), 0.85)
    AUS  = mat("Fassade", (0.34,0.42,0.48), 0.7)
    SOK  = mat("Sockel", (0.30,0.32,0.34), 0.9)
    BOD  = mat("Boden", (0.18,0.20,0.24), 0.6)
    GLAS = mat("Scheibe", (0.62,0.82,0.88), 0.08, 0.0, None, 1.3, 0.20)
    # Wasserkoerper transparent und nur schwach leuchtend — opak und hell ueberstrahlt
    # er Riff und Korallen komplett, dann steht man vor einer weissen Flaeche
    WASS = mat("Becken", (0.14,0.50,0.62), 0.12, 0.0, (0.10,0.34,0.44), 0.5, 0.34)
    FELS = mat("Riff", (0.42,0.36,0.30), 0.9)
    KOR  = mat("Koralle", (0.86,0.42,0.30), 0.7)
    KOR2 = mat("Koralle2", (0.90,0.76,0.24), 0.7)
    LED  = mat("Leitlicht", (0.40,0.86,1.0), 0.2, 0.0, (0.30,0.80,1.0), 2.2)
    STAHL= mat("Rahmen", (0.42,0.45,0.48), 0.4, 0.5)
    B, T, H, d = 24.0, 30.0, 6.0, 0.5
    boden(B, T, SOK, BOD, 2.0)
    wand_mit_oeffnungen(0, T/2, B, d, H, AUS, 1, 3.4, 3.6)
    box(0,-T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, W)
    box(0, 0, H + 0.28, B+1.2, T+1.2, 0.56, AUS)
    box(0, T/2 + 0.8, H*0.72, B-6.0, 0.5, 1.8, AUS)               # Schriftband
    box(0, T/2 + 0.52, H*0.72, B-9.0, 0.22, 1.1, LED)
    for sx in (-8.0, 8.0):                                        # Becken beidseits des Gangs
        s = 1 if sx > 0 else -1
        for k in range(4):
            cy = -10.5 + k*7.0
            # Becken als HOHLE Wanne bauen — ein Vollkasten verdeckt Wasser und Riff
            box(sx + s*5.08, cy, FB + 2.10, 0.24, 6.0, 3.60, W)   # Rueckwand
            for sy2 in (-2.88, 2.88):
                box(sx + s*2.6, cy + sy2, FB + 2.10, 5.2, 0.24, 3.60, W)   # Seitenwaende
            box(sx + s*2.6, cy, FB + 4.02, 5.2, 6.0, 0.24, W)     # Deckel
            box(sx + s*2.6, cy, FB + 0.30, 5.2, 6.0, 0.20, FELS)  # Beckenboden
            box(sx, cy, FB + 2.10, 0.16, 5.2, 3.20, GLAS)         # Scheibe zum Gang
            box(sx + s*0.30, cy, FB + 2.10, 0.34, 5.4, 3.40, STAHL)
            # KEIN durchsichtiger Wasserquader vor dem Riff: transparente Flaechen
            # werden in three.js nicht zuverlaessig sortiert, das Riff verschwand
            # dahinter. Stattdessen Rueckwand und Boden in Wasserfarbe.
            box(sx + s*4.94, cy, FB + 2.10, 0.10, 5.6, 3.30, WASS)
            for i in range(4):
                fels(sx + s*(1.4 + i*0.7), cy - 2.0 + i*1.3, FB + 0.60, 0.7, FELS, 7, 1.1)
                zyl(sx + s*(1.8 + i*0.6), cy - 1.6 + i*1.2, FB + 1.60, 0.16, 1.0,
                    KOR if i % 2 == 0 else KOR2, 8)
            box(sx + s*0.9, cy, FB + 3.95, 3.0, 5.0, 0.16, LED)   # Beckenbeleuchtung
    for k in range(9):                                            # Leitlicht im Boden
        box(0, -12.0 + k*3.0, FB + 0.02, 1.6, 0.16, 0.04, LED)
    for k in range(6):
        box(0, -11.0 + k*4.5, H - 0.26, 1.2, 0.5, 0.14, LED)
    box(0, T/2 - 3.0, FB + 0.55, 4.0, 1.2, 1.10, W)               # Kasse im Foyer
    box(0, T/2 - 3.0, FB + 1.16, 4.4, 1.5, 0.12, STAHL)
    export("th24_aquarienhaus", 0.020, 2)

# ================================================================ 4) Streichelzoo
def streichelzoo():
    """Gatter mit Tor, Unterstand, Futterstation, Heuraufe, Sitzbaenken."""
    neu()
    RAS  = mat("Weide", (0.32,0.50,0.24), 0.92)
    STRO = mat("Stroh", (0.72,0.60,0.30), 0.9)
    HOLZ = mat("Zaunholz", (0.52,0.38,0.22), 0.85)
    HOLZ2= mat("Bauholz", (0.42,0.30,0.18), 0.85)
    DACH = mat("Dach", (0.40,0.32,0.24), 0.85)
    METAL= mat("Beschlag", (0.44,0.46,0.48), 0.45, 0.5)
    B, T = 20.0, 16.0
    box(0, 0, 0.12, B, T, 0.24, RAS)
    box(0, -2.0, 0.26, B-4.0, 8.0, 0.06, STRO)
    for (cx, cy, laenge, achse) in ((0, -T/2, B, 'x'), (-B/2, 0, T, 'y'), (B/2, 0, T, 'y')):
        for i in range(int(laenge/2.0) + 1):                      # Zaunpfosten
            t = -laenge/2 + laenge*i/int(laenge/2.0)
            if achse == 'x': box(cx + t, cy, 0.24 + 0.55, 0.16, 0.16, 1.10, HOLZ)
            else:            box(cx, cy + t, 0.24 + 0.55, 0.16, 0.16, 1.10, HOLZ)
        for zz in (0.24 + 0.34, 0.24 + 0.78):                     # Riegel
            if achse == 'x': box(cx, cy, zz, laenge, 0.10, 0.14, HOLZ)
            else:            box(cx, cy, zz, 0.10, laenge, 0.14, HOLZ)
    for sx in (-1, 1):                                            # Vorderzaun mit Tor
        box(sx*6.5, T/2, 0.24 + 0.55, 7.0*0 + 0.16, 0.16, 1.10, HOLZ)
        box(sx*3.75, T/2, 0.24 + 0.34, 5.5, 0.10, 0.14, HOLZ)
        box(sx*3.75, T/2, 0.24 + 0.78, 5.5, 0.10, 0.14, HOLZ)
        box(sx*8.25, T/2, 0.24 + 0.34, 3.5, 0.10, 0.14, HOLZ)
        box(sx*8.25, T/2, 0.24 + 0.78, 3.5, 0.10, 0.14, HOLZ)
        box(sx*10.0, T/2, 0.24 + 0.55, 0.16, 0.16, 1.10, HOLZ)
    box(0, T/2, 0.24 + 0.55, 0.18, 0.30, 1.30, HOLZ)              # Torpfosten Mitte
    box(-1.35, T/2 + 0.18, 0.24 + 0.52, 2.5, 0.10, 0.90, HOLZ2)   # Torfluegel offen
    box(1.35, T/2 + 0.18, 0.24 + 0.52, 2.5, 0.10, 0.90, HOLZ2)
    box(-5.0, -5.0, 0.24 + 1.20, 7.0, 4.5, 2.40, HOLZ2)           # Unterstand
    box(-5.0, -5.0, 0.24 + 2.58, 7.6, 5.0, 0.36, DACH)
    box(-5.0, -2.85, 0.24 + 1.80, 7.0, 0.20, 1.20, HOLZ2)
    box(5.0, -3.0, 0.24 + 0.55, 2.4, 1.0, 1.10, HOLZ2)            # Heuraufe
    gitterwand(5.0, -3.0, 2.4, 0.70, 0.24 + 1.10, METAL, 'x', 9, 0.06)
    box(5.0, -3.0, 0.24 + 1.20, 2.2, 0.9, 0.30, STRO)
    for sx in (-7.0, 0.0, 7.0):                                   # Futterautomaten
        zyl(sx, 4.6, 0.24 + 0.55, 0.18, 1.10, METAL, 10)
        zyl(sx, 4.6, 0.24 + 1.24, 0.34, 0.28, METAL, 12)
    for sx in (-6.0, 6.0):                                        # Baenke am Zaun
        box(sx, T/2 + 1.6, 0.24 + 0.44, 2.2, 0.50, 0.10, HOLZ2)
        box(sx, T/2 + 1.86, 0.24 + 0.76, 2.2, 0.10, 0.54, HOLZ2)
        for bx in (-0.85, 0.85):
            box(sx + bx, T/2 + 1.6, 0.24 + 0.20, 0.10, 0.46, 0.40, METAL)
    export("th24_streichelzoo", 0.018, 2)

# ================================================================ 5) Zoo-Eingang
def zoo_eingang():
    """Eingangsgebaeude: Torbogen, 3 Kassen, Drehkreuze, Shop, Lageplan."""
    neu()
    W    = mat("EingangWand", (0.86,0.78,0.60), 0.8)
    HOLZ = mat("Holzband", (0.46,0.32,0.20), 0.8)
    SOK  = mat("Vorplatz", (0.56,0.53,0.48), 0.9)
    BOD  = mat("Halleboden", (0.66,0.62,0.56), 0.6)
    DACH = mat("Dach", (0.34,0.42,0.28), 0.85)
    GLAS = mat("Glas", (0.52,0.70,0.78), 0.14, 0.2)
    METAL= mat("Drehkreuz", (0.46,0.48,0.50), 0.4, 0.5)
    GRUEN= mat("Schild", (0.16,0.48,0.26), 0.6)
    LAUB = mat("Laub", (0.22,0.44,0.20), 0.9)
    STAMM= mat("Stamm", (0.34,0.24,0.15), 0.85)
    B, T, H, d = 26.0, 12.0, 5.4, 0.44
    boden(B, T, SOK, BOD, 6.0)
    wand_mit_oeffnungen(0, T/2, B, d, H, W, 3, 3.0, 3.4)          # Besucherseite (+y)
    wand_mit_oeffnungen(0,-T/2, B, d, H, W, 3, 3.0, 3.4)          # zum Zoo (-y)
    for sx in (-B/2, B/2):
        box(sx, 0, H/2, d, T, H, W)
        box(sx, 0, FB + 2.30, d*1.2, T-3.0, 1.60, GLAS)
    box(0, 0, H + 0.26, B+2.0, T+2.0, 0.52, DACH)
    box(0, 0, H - 0.42, B+1.0, T+1.0, 0.40, HOLZ)                 # Traufband
    box(0, T/2 + 1.4, H + 1.90, 16.0, 0.50, 2.60, W)              # Torbogenschild
    box(0, T/2 + 1.12, H + 1.90, 13.0, 0.22, 1.80, GRUEN)
    for sx in (-8.6, 8.6):
        box(sx, T/2 + 1.4, (FB + H + 0.6)/2, 1.6, 1.6, H + 0.6 - FB, W)
    oeff, pf = oeffnungs_achsen(B, 3, 3.0)
    for px in oeff:                                               # Drehkreuze in den Toren
        for sx in (-1.1, 1.1):
            zyl(px + sx, 0, FB + 0.50, 0.09, 1.00, METAL, 10)
        for k in range(3):
            a = k/3*math.tau
            o = box(px, 0, FB + 0.90, 1.9, 0.09, 0.09, METAL)
            o.rotation_euler[2] = a
        zyl(px, 0, FB + 0.45, 0.12, 0.90, METAL, 10)
    for px in pf[1:-1]:                                           # Kassen zwischen den Toren
        box(px, 2.6, FB + 0.55, 3.0, 1.6, 1.10, W)
        box(px, 2.6, FB + 1.16, 3.4, 1.9, 0.12, HOLZ)
        box(px, 1.75, FB + 1.90, 3.0, 0.16, 1.40, GLAS)
        box(px, 3.5, FB + 2.60, 3.2, 0.24, 1.20, GRUEN)
    box(-10.4, -3.4, FB + 1.10, 3.6, 0.30, 2.20, W)               # Lageplan
    box(-10.4, -3.58, FB + 1.30, 3.2, 0.10, 1.70, GRUEN)
    box(10.4, -3.4, FB + 0.55, 4.0, 1.2, 1.10, W)                 # Shop-Theke
    box(10.4, -3.4, FB + 1.16, 4.4, 1.5, 0.12, HOLZ)
    for sx in (-13.6, 13.6):
        baumstamm(sx, T/2 + 4.2, 0.0, 3.6, 0.26, STAMM, LAUB)
    export("th24_zoo_eingang", 0.020, 2)

if __name__ == "__main__":
    print("Asset-Charge 19 (th24, Zoo und Tierpark):")
    for fn in (gehege, voliere, aquarienhaus, streichelzoo, zoo_eingang):
        fn()
    print("fertig")
