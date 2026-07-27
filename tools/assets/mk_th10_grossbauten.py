# -*- coding: utf-8 -*-
"""Asset-Charge 6 (th10_*): BEGEHBARE GROSSBAUTEN — oeffentliche Haeuser, in die man
hineinlaufen kann. Groesser als Charge 4 (th8) und mit richtigem Innenleben.

Konventionen wie th5-th9:
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

# ================================================================ 1) Bahnhof
def bahnhof():
    """Bahnhofshalle: 3 Portale, Glas-Tonnendach, Bahnsteig, Uhr, Anzeigetafel."""
    neu()
    W    = mat("BahnWand", (0.80,0.74,0.64), 0.85)
    SOK  = mat("BahnSockel", (0.44,0.41,0.37), 0.9)
    BOD  = mat("Hallenboden", (0.66,0.64,0.60), 0.6)
    STAHL= mat("Stahl", (0.42,0.45,0.50), 0.4, 0.6)
    GLAS = mat("Hallenglas", (0.62,0.76,0.84), 0.12, 0.2)
    HOLZ = mat("Bank", (0.46,0.30,0.17), 0.75)
    TAFEL= mat("Anzeige", (0.08,0.10,0.14), 0.3, 0.0, (0.25,0.85,0.45), 1.6)
    B, T, H, d = 42.0, 26.0, 11.0, 0.6
    boden(B, T, SOK, BOD, 2.4)
    wand_mit_oeffnungen(0, T/2, B, d, H, W, 3, 5.0, 5.6)          # Eingangsfront (+y)
    wand_mit_oeffnungen(0,-T/2, B, d, H, W, 4, 6.0, 5.6)          # Gleisseite
    for sx in (-B/2, B/2):
        wand_mit_tuer(sx, 0, T, d, H, W, 2.6, 3.2, 'y')
        fensterband(sx, 0, T-3.0, d, 7.6, 3.0, W, GLAS, 4, 'y')
    # Traufkranz als RING, nicht als Vollplatte — sonst ist das Gewoelbe von innen zu.
    platte_mit_loch(0, 0, H+0.25, B+1.2, T+1.2, 0.5, B-2.4, T-2.4, SOK)
    tonne(0, 0, H, T/2, B-1.0, GLAS, 26)                          # Glas-Tonnendach
    for i in range(9):                                            # Binder als Halbbogen
        tonne(-B/2 + 2.2 + i*4.6, 0, H, T/2 + 0.14, 0.34, STAHL, 26)
    _, pfeiler = oeffnungs_achsen(B, 3, 5.0)                      # Stuetzen in die
    for sx in pfeiler:                                            # PFEILER-Achsen, damit
        for sy in (-7.5, 7.5):                                    # kein Portal verstellt ist
            zyl(sx, sy, (FB + H)/2, 0.40, H - FB, STAHL, 12)
            kegel(sx, sy, H - 0.25, 0.40, 1.10, 0.5, STAHL, 12)
    box(0,-T/2+3.0, FB+0.28, B-6.0, 5.0, 0.56, SOK)               # Bahnsteig
    for i in range(14):
        box(-B/2+4.0+i*2.6, -T/2+0.7, FB+0.58, 1.6, 0.30, 0.06,
            mat("Kante",(0.92,0.86,0.30),0.8))
    for sx in (-9.0, 9.0):                                        # Wartebaenke
        for k in range(3):
            px = sx - 3.0 + k*3.0
            box(px, 2.0, FB+0.44, 2.0, 0.55, 0.10, HOLZ)          # Sitz 0.45 ueber Boden
            box(px, 2.28, FB+0.78, 2.0, 0.10, 0.58, HOLZ)         # Lehne
            for bx in (-0.8, 0.8):
                box(px+bx, 2.0, FB+0.20, 0.10, 0.50, 0.40, STAHL)
    box(0, T/2-1.2, FB+7.0, 9.0, 0.30, 2.4, TAFEL)                # Anzeigetafel
    zyl(0, T/2-1.0, FB+9.0, 1.5, 0.24, mat("Uhr",(0.94,0.93,0.90),0.4), 24, rot=(math.pi/2,0,0))
    box(0, T/2-1.15, FB+9.6, 0.12, 0.10, 1.0, STAHL)
    box(0, T/2-1.15, FB+9.0, 0.90, 0.10, 0.10, STAHL)
    for sx in (-16.0, 16.0):                                      # Schalter
        box(sx, T/2-2.6, FB+0.90, 4.0, 1.0, 1.80, W)
        box(sx, T/2-3.2, FB+1.86, 4.2, 0.5, 0.12, HOLZ)
    export("th10_bahnhof", 0.024, 2)

# ================================================================ 2) Einkaufszentrum
def einkaufszentrum():
    """2 Ebenen mit Atrium, Ladenfronten, Rolltreppe, Oberlicht ueber dem Luftraum."""
    neu()
    W    = mat("EkzWand", (0.86,0.85,0.82), 0.8)
    SOK  = mat("EkzSockel", (0.52,0.51,0.49), 0.9)
    BOD  = mat("EkzBoden", (0.72,0.70,0.68), 0.45)
    DEC  = mat("Decke", (0.90,0.90,0.88), 0.9)
    GLAS = mat("Schaufenster", (0.44,0.62,0.74), 0.12, 0.25)
    STAHL= mat("Gelaender", (0.55,0.58,0.62), 0.35, 0.6)
    ROT  = mat("Akzent", (0.78,0.24,0.20), 0.55)
    LED  = mat("Deckenlicht", (1.0,0.97,0.90), 0.2, 0.0, (1.0,0.97,0.90), 2.0)
    B, T, d = 36.0, 28.0, 0.5
    EH = 4.60                                   # lichte Geschosshoehe
    OG = FB + EH + 0.34                         # Oberkante OG-Boden = 5.24
    WH = OG + EH                                # Wandkrone = 9.84 (Decke schliesst buendig)
    boden(B, T, SOK, BOD, 2.0)
    wand_mit_oeffnungen(0, T/2, B, d, WH, W, 3, 4.0, 4.2)
    box(0,-T/2, WH/2, B, d, WH, W)
    for sx in (-B/2, B/2): box(sx, 0, WH/2, d, T, WH, W)
    platte_mit_loch(0, 0, OG - 0.17, B-2*d, T-2*d, 0.34, 14.0, 10.0, BOD)
    platte_mit_loch(0, 0, WH + 0.20, B, T, 0.40, 15.0, 11.0, DEC)   # Decke mit Atrium-Loch
    box(0, 0, WH + 0.20, 15.0, 11.0, 0.16, GLAS)                    # Oberlicht im Loch
    for et in (0, 1):
        z0 = FB if et == 0 else OG
        # Im EG die Eingangsseite AUSLASSEN — dort wuerden die Scheiben die Portale zubauen.
        seiten = [-T/2 + 0.9] if et == 0 else [-T/2 + 0.9, T/2 - 0.9]
        for sx in (-13.0, -4.5, 4.5, 13.0):
            for sy in seiten:
                box(sx, sy, z0 + 1.70, 7.2, 0.22, 3.20, GLAS)
                box(sx, sy - 0.16*(1 if sy > 0 else -1), z0 + 3.62, 7.6, 0.34, 0.70, ROT)
        for sy in (-9.0, 0.0, 9.0):
            for sx in (-B/2 + 0.9, B/2 - 0.9):
                box(sx, sy, z0 + 1.70, 0.22, 6.4, 3.20, GLAS)
    bruestung(0, 0, 14.0, 10.0, OG, STAHL)
    for sy in (-5.0, 5.0):
        box(0, sy, OG + 0.50, 14.0, 0.16, 1.00, STAHL)
    # Rolltreppe: Steighoehe exakt FB -> OG, Lauf endet an der Galeriekante y=+5.0
    n, y_end, lauf = treppe(4.0, 5.0 - 25*0.40, FB, 3.2, OG - FB, BOD, STAHL,
                            steig=0.20, auftritt=0.40, richtung=1)
    for sy in (-6.0, 6.0):
        zyl(-8.0, sy, FB + 0.25, 1.6, 0.50, ROT, 20)                # Sitzinseln
    for i in range(4):
        for k in range(3):
            box(-12.0 + i*8.0, -8.0 + k*8.0, WH - 0.10, 2.6, 0.5, 0.14, LED)
    zyl(0, 0, FB + 0.28, 1.8, 0.56, mat("Brunnen",(0.62,0.66,0.70),0.5), 24)
    zyl(0, 0, FB + 0.52, 1.65, 0.08, mat("Wasser",(0.30,0.58,0.72),0.15,0.2), 24)
    export("th10_einkaufszentrum", 0.022, 2)

# ================================================================ 3) Schule
def schule():
    """Eingangsfoyer -> Mittelflur -> 4 Klassenzimmer mit Tafeln und Pultreihen."""
    neu()
    W    = mat("SchulWand", (0.92,0.88,0.78), 0.85)
    SOK  = mat("Sockel", (0.58,0.56,0.52), 0.9)
    IN   = mat("Innenwand", (0.94,0.93,0.88), 0.9)
    BOD  = mat("Linoleum", (0.52,0.58,0.50), 0.6)
    FLUR = mat("Flurboden", (0.66,0.62,0.56), 0.6)
    DACH = mat("Dach", (0.40,0.42,0.44), 0.8)
    GLAS = mat("Glas", (0.58,0.74,0.82), 0.15)
    RAHM = mat("Rahmen", (0.36,0.34,0.30), 0.7)
    TAFEL= mat("Tafel", (0.14,0.26,0.20), 0.85)
    HOLZ = mat("Pult", (0.72,0.56,0.34), 0.7)
    B, T, H, d = 34.0, 20.0, 4.5, 0.34
    boden(B, T, SOK, FLUR, 1.6)
    for sy in (-6.6, 6.6):
        box(0, sy, FB + 0.02, B-1.0, 6.0, 0.04, BOD)              # Klassenboden
    wand_mit_tuer(0, T/2, B, d, H, W, 3.2, 3.2, 'x')              # Eingang (+y)
    box(0,-T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, W)
    # Fensterband der Eingangsseite um die Tuer herum, sonst steht Glas in der Oeffnung
    for sx in (-9.75, 9.75):
        fensterband(sx, T/2, 12.5, d, FB+2.20, 1.90, RAHM, GLAS, 3, 'x')
    fensterband(0, -T/2, B-4.0, d, FB+2.20, 1.90, RAHM, GLAS, 8, 'x')
    # Flurwand vorn: Mitte offen (3.4 m Foyer-Gang von der Tuer in den Flur)
    for k in (-1, 1):
        wand_mit_tuer(k*9.5, 3.4, 15.0, 0.26, H, IN, 1.6, 2.6, 'x')
        wand_mit_tuer(k*8.5, -3.4, 17.0, 0.26, H, IN, 1.6, 2.6, 'x')
        box(k*2.0, 6.6, H/2, 0.26, 6.8, H, IN)                    # Foyer-Gang-Waende
    box(0, -6.6, H/2, 0.26, 6.8, H, IN)                           # Trennwand hinten
    box(0, 0, H+0.25, B+1.0, T+1.0, 0.5, DACH)
    for sy in (-9.75, 9.75):                                      # Tafeln an der Aussenwand
        for sx in (-9.5, 9.5):
            box(sx, sy, FB + 1.90, 3.6, 0.10, 1.40, TAFEL)
    for sy in (-6.6, 6.6):                                        # Pultreihen
        for sx0 in (-9.5, 9.5):
            for r in range(3):
                for c in (-1, 1):
                    px = sx0 + c*1.5
                    py = sy + (r - 1)*1.6
                    box(px, py, FB+0.72, 1.20, 0.60, 0.08, HOLZ)  # Platte 0.76 ueber Boden
                    for bx in (-0.5, 0.5):
                        for by in (-0.24, 0.24):
                            box(px+bx, py+by, FB+0.34, 0.07, 0.07, 0.68, RAHM)
                    box(px, py+0.70, FB+0.42, 0.50, 0.46, 0.06, HOLZ)   # Sitz 0.45
                    box(px, py+0.91, FB+0.72, 0.50, 0.06, 0.52, HOLZ)   # Lehne
                    for lx in (-0.2, 0.2):
                        for ly in (-0.18, 0.18):
                            box(px+lx, py+0.70+ly, FB+0.20, 0.05, 0.05, 0.39, RAHM)
    for i in range(10):                                           # Garderobe im Flur
        box(-13.5 + i*3.0, 3.15, FB + 1.55, 2.2, 0.14, 0.30, HOLZ)
    export("th10_schule", 0.020, 2)

# ================================================================ 4) Bibliothek
def bibliothek():
    """Lesesaal mit umlaufender Galerie, Treppe hinauf, Regalen, Lesetischen."""
    neu()
    W    = mat("BibWand", (0.86,0.80,0.68), 0.85)
    SOK  = mat("Sockel", (0.52,0.49,0.44), 0.9)
    BOD  = mat("Parkett", (0.50,0.34,0.20), 0.6)
    GAL  = mat("Galerie", (0.58,0.42,0.26), 0.65)
    DEC  = mat("Decke", (0.92,0.90,0.86), 0.9)
    GLAS = mat("Glas", (0.60,0.76,0.84), 0.14)
    HOLZ = mat("Regal", (0.42,0.28,0.17), 0.75)
    BUCH = mat("Buecher", (0.62,0.24,0.22), 0.8)
    BUCH2= mat("Buecher2", (0.22,0.36,0.55), 0.8)
    MES  = mat("Messing", (0.68,0.55,0.24), 0.35, 0.7)
    B, T, d = 28.0, 22.0, 0.44
    EH = 5.00
    OG = FB + EH + 0.34                        # Galerie-Oberkante = 5.64
    WH = OG + EH                               # Wandkrone = 10.64
    boden(B, T, SOK, BOD, 2.0)
    wand_mit_tuer(0, T/2, B, d, WH, W, 3.2, 3.6, 'x')
    box(0,-T/2, WH/2, B, d, WH, W)
    for sx in (-B/2, B/2): box(sx, 0, WH/2, d, T, WH, W)
    for sy in (-T/2, T/2):
        fensterband(0, sy, B-8.0, d, FB+7.0, 3.4, W, GLAS, 4, 'x')
    platte_mit_loch(0, 0, OG - 0.17, B-2*d, T-2*d, 0.34, 15.0, 11.0, GAL)
    platte_mit_loch(0, 0, WH + 0.25, B+1.0, T+1.0, 0.5, 14.0, 10.0, DEC)
    box(0, 0, WH + 0.25, 14.0, 10.0, 0.16, GLAS)                  # Oberlicht
    bruestung(0, 0, 15.0, 11.0, OG, MES)
    # Treppe im Luftraum, Austritt exakt an der Galeriekante y = -5.5
    treppe(-5.5, -5.5 + 31*0.28, FB, 1.6, OG - FB, GAL, MES, 0.172, 0.28, richtung=-1)
    for i in range(6):                                            # Regalreihen EG
        px = -11.0 + i*4.4
        for sy in (-7.0, 7.0):
            if sy > 0 and px < 0: continue                        # Platz fuer die Theke
            box(px, sy, FB + 1.15, 1.0, 5.0, 2.30, HOLZ)
            for k in range(4):
                box(px, sy, FB + 0.42 + k*0.54, 1.10, 4.7, 0.30, BUCH if k % 2 == 0 else BUCH2)
    for i in range(4):                                            # Lesetische
        px = -6.0 + i*4.0
        box(px, 0, FB + 0.71, 2.6, 1.4, 0.08, HOLZ)               # Platte 0.75 ueber Boden
        for bx in (-1.1, 1.1):
            for by in (-0.5, 0.5):
                box(px+bx, by, FB + 0.34, 0.09, 0.09, 0.67, MES)
        for by in (-1.1, 1.1):
            s = 1 if by > 0 else -1
            box(px, by, FB + 0.42, 1.2, 0.5, 0.06, HOLZ)          # Sitz 0.45
            box(px, by + s*0.28, FB + 0.72, 1.2, 0.07, 0.54, HOLZ)
            for lx in (-0.5, 0.5):
                for ly in (-0.19, 0.19):
                    box(px+lx, by+ly, FB + 0.20, 0.06, 0.06, 0.39, HOLZ)
        zyl(px, 0, FB + 1.02, 0.16, 0.54, MES, 10)                # Tischlampe
        kegel(px, 0, FB + 1.44, 0.36, 0.14, 0.30,
              mat("Schirm",(0.24,0.42,0.34),0.6,0.0,(0.9,0.85,0.6),0.7), 12)
    for i in range(8):                                            # Regale auf der Galerie
        px = -12.0 + i*3.4
        for sy in (-9.2, 9.2):
            box(px, sy, OG + 1.15, 1.2, 0.9, 2.30, HOLZ)
            for k in range(4):
                box(px, sy, OG + 0.42 + k*0.54, 1.3, 0.8, 0.30, BUCH2 if k % 2 == 0 else BUCH)
    box(-8.0, T/2 - 3.0, FB + 0.55, 5.0, 1.4, 1.10, HOLZ)         # Ausleihtheke, aus der
    box(-8.0, T/2 - 3.0, FB + 1.16, 5.4, 1.7, 0.12, GAL)          # Tuerachse geschoben
    export("th10_bibliothek", 0.020, 2)

# ================================================================ 5) Sporthalle
def sporthalle():
    """Halle mit Spielfeld, Korbanlagen in Normhoehe, Tribuene, Tonnendach."""
    neu()
    W    = mat("HallenWand", (0.88,0.87,0.83), 0.85)
    SOK  = mat("Sockel", (0.46,0.45,0.42), 0.9)
    BOD  = mat("Schwingboden", (0.78,0.58,0.32), 0.5)
    LIN  = mat("Spielfeldlinie", (0.86,0.24,0.20), 0.7)
    TRIB = mat("Tribuene", (0.24,0.40,0.62), 0.7)
    STAHL= mat("Stahl", (0.48,0.51,0.55), 0.4, 0.55)
    GLAS = mat("Oberlicht", (0.68,0.80,0.86), 0.12, 0.2)
    B, T, H, d = 34.0, 22.0, 8.0, 0.5
    boden(B, T, SOK, BOD, 2.0)
    wand_mit_oeffnungen(0, T/2, B, d, H, W, 2, 3.4, 3.6)
    box(0,-T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2):
        box(sx, 0, H/2, d, T, H, W)
        fensterband(sx, 0, T-4.0, d, FB+5.8, 1.8, W, GLAS, 5, 'y')
    # Attika als RING (eine Vollplatte deckelt die Halle und macht das Gewoelbe unsichtbar)
    platte_mit_loch(0, 0, H+0.3, B+1.2, T+1.2, 0.6, B-1.0, T-1.0, SOK)
    tonne(0, 0, H, T/2, B-1.2, W, 22)                             # Tonnendach auf der Krone
    for i in range(7):
        tonne(-B/2+2.4+i*4.9, 0, H, T/2+0.14, 0.30, STAHL, 22)
    box(0, 0, H + T/2 - 0.14, 10.0, 3.0, 0.20, GLAS)              # Firstoberlicht
    for sx in (-11.0, 0.0, 11.0):                                 # Spielfeldlinien
        box(sx, 0, FB + 0.02, 0.12, 15.0, 0.04, LIN)
    for i in range(36):
        a = i/36*math.tau
        o = box(math.cos(a)*3.0, math.sin(a)*3.0, FB + 0.02, 0.55, 0.12, 0.04, LIN)
        o.rotation_euler[2] = a + math.pi/2
    for sy in (-7.5, 7.5): box(0, sy, FB + 0.02, 22.6, 0.12, 0.04, LIN)
    for sx in (-12.6, 12.6):                                      # Korbanlagen, Ring 3.05
        s = -1 if sx > 0 else 1
        zyl(sx, 0, FB + 2.15, 0.16, 4.30, STAHL, 10)
        box(sx + s*1.6, 0, FB + 3.55, 1.8, 0.12, 1.10, mat("Brett",(0.92,0.91,0.88),0.5))
        zyl(sx + s*2.2, 0, FB + 3.05, 0.225, 0.05, mat("Ring",(0.86,0.36,0.14),0.5), 16)
    for r in range(4):                                            # Tribuene als Massivkeil
        h_r = 0.45*(r + 1)
        box(0, -T/2 + 1.2 + r*1.0, FB + h_r/2, B-4.0, 1.0, h_r, TRIB)
        box(0, -T/2 + 1.2 + r*1.0, FB + h_r - 0.05, B-4.4, 0.90, 0.10, SOK)
    export("th10_sporthalle", 0.022, 2)

# ================================================================ 6) Rathaus
def rathaus():
    """Foyer mit Freitreppe auf die Galerie, Schalterhalle, Portikus, Uhrturm vorn."""
    neu()
    W    = mat("RathausWand", (0.84,0.78,0.66), 0.85)
    SOK  = mat("Sockel", (0.48,0.44,0.38), 0.9)
    BOD  = mat("Marmor", (0.80,0.78,0.72), 0.35)
    GAL  = mat("Galerie", (0.72,0.68,0.60), 0.6)
    DACH = mat("Dach", (0.34,0.30,0.28), 0.8)
    GLAS = mat("Glas", (0.56,0.72,0.82), 0.15)
    MES  = mat("Messing", (0.70,0.56,0.24), 0.32, 0.75)
    HOLZ = mat("Theke", (0.40,0.26,0.16), 0.7)
    B, T, d = 30.0, 24.0, 0.5
    EH = 5.60
    OG = FB + EH + 0.34                        # Galerie-Oberkante = 6.24
    WH = OG + EH                               # Wandkrone = 11.84
    boden(B, T, SOK, BOD, 3.0)
    for i in range(2):                                            # Freitreppe aussen
        box(0, T/2 + 1.9 + i*0.9, FB - 0.075 - i*0.15, 12.0, 0.9, 0.15, SOK)
    wand_mit_tuer(0, T/2, B, d, WH, W, 4.0, 4.4, 'x')
    box(0,-T/2, WH/2, B, d, WH, W)
    for sx in (-B/2, B/2):
        box(sx, 0, WH/2, d, T, WH, W)
        fensterband(sx, 0, T-5.0, d, FB+7.2, 3.0, W, GLAS, 4, 'y')
    for px in (-9.4, -6.0, -2.6, 2.6, 6.0, 9.4):                  # Portikus, Mitte frei
        zyl(px, T/2 + 1.9, (FB + 9.0)/2, 0.55, 9.0 - FB, W, 14)
        zyl(px, T/2 + 1.9, 9.15, 0.72, 0.30, W, 14)
    box(0, T/2 + 1.9, 9.60, 22.0, 3.4, 0.60, W)                   # Portikusdach
    platte_mit_loch(0, 0, OG - 0.17, B-2*d, T-2*d, 0.34, 12.0, 11.0, GAL)
    box(0, 0, WH + 0.30, B+1.4, T+1.4, 0.6, DACH)                 # Dach buendig auf Krone
    box(0, T/2-3.6, WH + 2.30, 7.0, 7.0, 3.4, W)                  # Uhrturm auf der Schauseite
    box(0, T/2-3.6, WH + 4.25, 7.8, 7.8, 0.5, DACH)
    kegel(0, T/2-3.6, WH + 6.10, 5.0, 0.0, 3.2, DACH, 4, rot=(0,0,math.pi/4))
    zyl(0, T/2-0.05, WH + 2.30, 1.6, 0.30, mat("Zifferblatt",(0.94,0.92,0.86),0.4), 24,
        rot=(math.pi/2,0,0))
    # Innentreppe: Austritt genau an der Galeriekante y = -5.5
    treppe(0, -5.5 + 35*0.26, FB, 5.0, OG - FB, BOD, MES, 0.17, 0.26, richtung=-1)
    bruestung(0, 0, 12.0, 11.0, OG, MES)
    for sx in (-10.5, 10.5):                                      # Schalter
        box(sx, 4.0, FB + 0.55, 6.0, 1.2, 1.10, HOLZ)
        box(sx, 4.0, FB + 1.16, 6.4, 1.5, 0.12, GAL)
        for k in (-1.8, 0.0, 1.8):
            box(sx+k, 3.35, FB + 1.90, 1.1, 0.10, 0.80, GLAS)
    for sx in (-10.5, 10.5):                                      # Brunnen aus der Treppenachse
        zyl(sx, -8.0, FB + 0.28, 1.4, 0.56, SOK, 20)
        zyl(sx, -8.0, FB + 0.52, 1.25, 0.08, mat("Wasser",(0.30,0.58,0.72),0.15,0.2), 20)
    export("th10_rathaus", 0.022, 2)

# ================================================================ 7) Kino
def kino():
    """Foyer mit Kasse, zwei Saaleingaenge, Saal mit ansteigenden Reihen und Leinwand."""
    neu()
    W    = mat("KinoWand", (0.30,0.24,0.28), 0.85)
    AUS  = mat("Fassade", (0.62,0.30,0.26), 0.7)
    SOK  = mat("Vorplatz", (0.46,0.45,0.43), 0.9)
    BOD  = mat("Foyerboden", (0.42,0.34,0.32), 0.5)
    SITZ = mat("Sitz", (0.62,0.14,0.16), 0.75)
    LEIN = mat("Leinwand", (0.92,0.92,0.90), 0.55)
    GLAS = mat("Glas", (0.44,0.60,0.70), 0.12, 0.25)
    NEON = mat("Neon", (1.0,0.82,0.30), 0.2, 0.0, (1.0,0.72,0.20), 2.6)
    MES  = mat("Messing", (0.72,0.58,0.24), 0.3, 0.7)
    B, T, H, d = 30.0, 26.0, 7.2, 0.5
    boden(B, T, SOK, BOD, 2.0)
    wand_mit_oeffnungen(0, T/2, B, d, H, AUS, 3, 2.8, 3.4)
    box(0,-T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, W)
    box(0, 0, H+0.30, B+1.2, T+1.2, 0.6, AUS)                     # Dach buendig
    box(0, T/2+0.9, H+1.6, B-2.0, 0.6, 2.0, AUS)                  # Marquee
    for i in range(11):
        box(-B/2+2.0+i*2.6, T/2+1.25, H+1.6, 0.5, 0.24, 1.5, NEON)
    # Trennwand Foyer/Saal mit zwei echten Saaleingaengen
    wand_mit_tuer(-9.5, 4.4, 11.0, 0.34, H, W, 2.6, 3.0, 'x')
    wand_mit_tuer( 9.5, 4.4, 11.0, 0.34, H, W, 2.6, 3.0, 'x')
    box(0, 4.4, H/2, 8.0, 0.34, H, W)
    box(-11.0, 9.0, FB + 0.55, 5.0, 1.2, 1.10, AUS)               # Kasse, nicht im Portal
    box(-11.0, 9.0, FB + 1.16, 5.4, 1.5, 0.12, MES)
    box(-11.0, 9.6, FB + 2.10, 4.6, 0.14, 1.20, NEON)
    for sx in (-12.4, 12.4):                                      # Plakatvitrinen an der Wand
        box(sx, T/2-0.36, FB + 2.20, 3.0, 0.20, 4.20, GLAS)
    for r in range(9):                                            # Saal: hinten hoch, vorn tief
        py = 2.6 - r*1.5
        zh = FB + (8 - r)*0.28                                    # Podest-Oberkante
        if zh > FB + 0.01:
            box(0, py, (FB + zh)/2, 24.0, 1.5, zh - FB, W)
        for c in range(14):
            px = -10.4 + c*1.6
            box(px, py, zh + 0.42, 1.30, 0.70, 0.10, SITZ)        # Sitz 0.45 ueber Podest
            box(px, py - 0.36, zh + 0.85, 1.30, 0.16, 0.90, SITZ) # Lehne
            for bx in (-0.66, 0.66):                              # Wangen tragen bis aufs Podest
                box(px+bx, py, zh + 0.33, 0.10, 0.62, 0.66, SITZ)
    box(0, -T/2+0.9, FB + 2.85, 22.0, 0.24, 4.70, LEIN)           # Leinwand unter der Decke
    box(0, -T/2+1.15, FB + 2.85, 23.4, 0.30, 5.10, W)
    for sx in (-13.0, 13.0):
        for k in range(4):
            box(sx, 1.0 - k*3.0, FB + 3.60, 0.20, 0.9, 0.30, NEON)
    export("th10_kino", 0.020, 2)

# ================================================================ 8) Restaurant
def restaurant():
    """Gastraum mit Tischen, Tresen, offener Kueche, ueberdachter Terrasse."""
    neu()
    W    = mat("GastWand", (0.90,0.84,0.72), 0.85)
    SOK  = mat("Sockel", (0.50,0.46,0.40), 0.9)
    BOD  = mat("Dielen", (0.52,0.34,0.20), 0.65)
    DACH = mat("Dach", (0.44,0.26,0.20), 0.8)
    GLAS = mat("Fenster", (0.58,0.74,0.82), 0.14)
    RAHM = mat("Rahmen", (0.34,0.24,0.16), 0.7)
    HOLZ = mat("Moebel", (0.46,0.30,0.18), 0.7)
    TUCH = mat("Tischtuch", (0.94,0.93,0.90), 0.85)
    STAHL= mat("Kueche", (0.72,0.74,0.78), 0.3, 0.7)
    LAMP = mat("Lampe", (1.0,0.90,0.66), 0.3, 0.0, (1.0,0.85,0.55), 1.8)
    B, T, H, d = 20.0, 16.0, 4.4, 0.34
    boden(B, T, SOK, BOD, 4.0)
    wand_mit_tuer(0, T/2, B, d, H, W, 2.6, 3.2, 'x')              # licht 2.9 m
    box(0,-T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2):
        box(sx, 0, H/2, d, T, H, W)
        fensterband(sx, 0, T-3.0, d, FB+2.00, 1.90, RAHM, GLAS, 3, 'y')
    for sx in (-5.5, 5.5):
        fensterband(sx, T/2, 7.0, d, FB+2.00, 1.90, RAHM, GLAS, 2, 'x')
    box(0, 0, H+0.22, B+1.0, T+1.0, 0.44, DACH)
    box(0, T/2+1.6, H-0.4, B+1.0, 3.4, 0.24, DACH)                # Terrassendach
    for sx in (-8.0, 0.0, 8.0): zyl(sx, T/2+3.1, (FB + H - 0.52)/2 + FB/2, 0.14, H-0.52-FB, RAHM, 10)
    for i in range(3):                                            # Terrassentische
        zyl(-6.5 + i*6.5, T/2 + 1.9, FB + 0.34, 0.14, 0.68, RAHM, 10)
        zyl(-6.5 + i*6.5, T/2 + 1.9, FB + 0.72, 0.75, 0.08, TUCH, 18)
    box(0, -T/2 + 2.2, FB + 0.45, B-3.0, 3.4, 0.90, STAHL)        # offene Kueche
    box(0, -T/2 + 2.2, FB + 0.96, B-2.6, 3.8, 0.12, STAHL)
    for sx in (-5.0, 0.0, 5.0):
        zyl(sx, -T/2 + 1.6, FB + 1.06, 0.42, 0.10, mat("Platte",(0.20,0.20,0.22),0.6), 16)
    box(0, -T/2 + 4.4, (FB + 1.50 + H)/2, B-3.0, 0.24, H - FB - 1.50, STAHL)   # Abzug an der Decke
    box(-6.5, 1.5, FB + 0.55, 5.0, 1.1, 1.10, HOLZ)               # Tresen
    box(-6.5, 1.5, FB + 1.16, 5.4, 1.4, 0.12, RAHM)
    for k in range(4):                                            # Barhocker
        zyl(-8.6 + k*1.4, 0.55, FB + 0.34, 0.16, 0.68, RAHM, 10)
        zyl(-8.6 + k*1.4, 0.55, FB + 0.75, 0.34, 0.10, HOLZ, 14)
    for i in range(3):                                            # Gasttische
        for k in range(2):
            px = -3.0 + i*4.5
            py = -1.6 + k*3.4
            zyl(px, py, FB + 0.34, 0.16, 0.68, RAHM, 10)
            zyl(px, py, FB + 0.72, 0.68, 0.08, TUCH, 18)          # Platte 0.76 ueber Boden
            for a in (0, math.pi):
                sx2 = px + math.cos(a)*1.25
                box(sx2, py, FB + 0.20, 0.42, 0.42, 0.40, HOLZ)   # Stuhlkorpus
                box(sx2, py, FB + 0.43, 0.50, 0.50, 0.06, HOLZ)   # Sitz 0.45
                box(sx2 + math.cos(a)*0.22, py, FB + 0.75, 0.10, 0.50, 0.58, HOLZ)
            zyl(px, py, (FB + 2.29 + H)/2, 0.05, H - FB - 2.29, RAHM, 8)   # Pendel bis Decke
            kegel(px, py, FB + 2.12, 0.42, 0.16, 0.34, LAMP, 14)
    export("th10_restaurant", 0.020, 2)

if __name__ == "__main__":
    print("Asset-Charge 6 (th10, BEGEHBARE Grossbauten):")
    for fn in (bahnhof, einkaufszentrum, schule, bibliothek,
               sporthalle, rathaus, kino, restaurant):
        fn()
    print("fertig")
