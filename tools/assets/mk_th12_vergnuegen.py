# -*- coding: utf-8 -*-
"""Asset-Charge 9 (th12_*): BEGEHBARES VERGNUEGUNGSVIERTEL — Casino, Nachtclub,
Bowling, Spielhalle, Theater. Familienfreundlich: Spieltische sind Deko, kein
echtes Gluecksspiel, keine Waffen.

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


# ---------------------------------------------------------------- Extra-Helfer
def leuchtband(cx, cy, laenge, z, m, n=14, achse='x', hoehe=0.34, tiefe=0.30):
    """Reihe einzelner Leuchtkaesten — liest sich besser als ein durchgehender Balken."""
    for i in range(n):
        t = (i + 0.5)/n - 0.5
        if achse == 'x': box(cx + t*laenge, cy, z, laenge/n*0.62, tiefe, hoehe, m)
        else:            box(cx, cy + t*laenge, z, tiefe, laenge/n*0.62, hoehe, m)

def teppich(cx, cy, B, T, z, m1, m2, feld=3.0):
    """Gemusterter Boden aus zwei Farben — ein einfarbiger Saal wirkt tot."""
    nx = max(1, int(B/feld)); ny = max(1, int(T/feld))
    for ix in range(nx):
        for iy in range(ny):
            px = cx - B/2 + (ix + 0.5)*B/nx
            py = cy - T/2 + (iy + 0.5)*T/ny
            box(px, py, z, B/nx*0.98, T/ny*0.98, 0.03, m1 if (ix+iy) % 2 == 0 else m2)

def spieltisch(px, py, m_filz, m_holz, m_chip, r=1.5, plaetze=6):
    """Ovaler Spieltisch mit Filz, Holzrand und Chip-Kante. Hoehe 0.78 ueber Boden."""
    t = zyl(px, py, FB + 0.36, r, 0.72, m_holz, 24); t.scale[1] = 0.66
    # Holzrand ZUERST und tiefer, Filz obendrauf — umgekehrt deckt der Rand den Filz zu.
    k = zyl(px, py, FB + 0.73, r*1.08, 0.14, m_holz, 24); k.scale[1] = 0.66
    p = zyl(px, py, FB + 0.80, r*0.94, 0.10, m_filz, 24); p.scale[1] = 0.66
    for i in range(plaetze):
        a = math.tau*(i + 0.5)/plaetze          # tau, nicht pi — sonst stehen alle
        sx = px + math.cos(a)*(r*1.08 + 0.45)   # Hocker auf derselben Haelfte
        sy = py + math.sin(a)*(r*0.66*1.08 + 0.45)
        zyl(sx, sy, FB + 0.22, 0.16, 0.44, m_holz, 10)
        zyl(sx, sy, FB + 0.47, 0.24, 0.10, m_chip, 14)

def automat(px, py, m_korpus, m_glas, m_led, s=1):
    """Spielautomat, Gesamthoehe 1.86 m. s=+1: Bedienseite auf -y, s=-1: auf +y.
    ACHTUNG: `rotation_euler[2] = pi` auf einem symmetrischen Quader ist ein No-Op —
    gespiegelt wird ueber das VORZEICHEN der y-Offsets, nicht ueber eine Rotation.
    (Zwei Pruefdurchgaenge haben genau diesen Fehler unabhaengig gefunden.)"""
    box(px, py, FB + 0.85, 0.80, 0.70, 1.70, m_korpus)               # Korpus 0.00-1.70
    box(px, py - s*0.33, FB + 1.20, 0.60, 0.08, 0.55, m_glas)        # Bildschirm in der Front
    box(px, py - s*0.42, FB + 0.86, 0.72, 0.22, 0.10, m_korpus)      # Tastenpult
    box(px, py, FB + 1.78, 0.84, 0.72, 0.16, m_led)                  # Leuchtkrone

# ================================================================ 1) Casino
def casino():
    """Spielsaal im Vegas-Look: Automatenreihen, Spieltische, Bar, Kronleuchter."""
    neu()
    W    = mat("CasinoWand", (0.36,0.14,0.16), 0.8)
    AUS  = mat("Fassade", (0.28,0.10,0.12), 0.7)
    SOK  = mat("Sockel", (0.30,0.28,0.26), 0.9)
    GOLD = mat("Gold", (0.76,0.60,0.22), 0.28, 0.75)
    T1   = mat("Teppich1", (0.52,0.10,0.12), 0.9)
    T2   = mat("Teppich2", (0.40,0.07,0.10), 0.9)
    FILZ = mat("Filz", (0.10,0.36,0.20), 0.85)
    HOLZ = mat("Mahagoni", (0.28,0.14,0.09), 0.5)
    CHIP = mat("Polster", (0.62,0.14,0.16), 0.8)
    GLAS = mat("Bildschirm", (0.18,0.30,0.42), 0.15, 0.2)
    NEON = mat("Neon", (1.0,0.30,0.45), 0.2, 0.0, (1.0,0.24,0.42), 3.0)
    NEON2= mat("Neon2", (1.0,0.82,0.30), 0.2, 0.0, (1.0,0.72,0.20), 2.8)
    LED  = mat("Automatenlicht", (1.0,0.86,0.40), 0.2, 0.0, (1.0,0.80,0.30), 2.2)
    KERZ = mat("Kerze", (1.0,0.94,0.78), 0.3, 0.0, (1.0,0.90,0.70), 2.4)
    B, T, H, d = 40.0, 30.0, 8.0, 0.6
    boden(B, T, SOK, T1, 3.0)
    teppich(0, 0, B-1.0, T-1.0, FB + 0.02, T1, T2, 3.0)
    wand_mit_oeffnungen(0, T/2, B, d, H, AUS, 3, 3.6, 4.2)
    box(0,-T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, W)
    box(0, 0, H + 0.30, B+1.4, T+1.4, 0.6, AUS)                   # Dach buendig
    # Vorfahrt mit Neon-Vordach
    box(0, T/2 + 4.6, FB/2, B-4.0, 9.0, FB, SOK)
    box(0, T/2 + 3.4, 6.20, B-6.0, 6.4, 0.50, GOLD)
    for sx in (-16.3, -5.45, 5.45, 16.3):        # auf den Wandpfeilern, NICHT im Portal
        zyl(sx, T/2 + 5.9, (FB + 5.95)/2, 0.34, 5.95 - FB, GOLD, 14)
    leuchtband(0, T/2 + 0.55, B-8.0, 5.70, NEON, 16, 'x', 0.30, 0.34)   # haengt frei unters Dach
    leuchtband(0, T/2 + 6.62, B-7.0, 6.10, NEON2, 15, 'x', 0.30, 0.30)
    box(0, T/2 + 0.35, H + 2.40, 18.0, 0.60, 3.60, AUS)           # Leuchtschild
    # Leuchtflaeche und Lauflicht muessen VOR den Rahmen — sonst stecken sie darin.
    box(0, T/2 + 0.70, H + 2.40, 15.0, 0.24, 2.60, NEON)
    for i in range(24):                                           # Lauflicht am Schild
        a = i/24*math.tau
        box(math.cos(a)*8.6, T/2 + 0.72, H + 2.40 + math.sin(a)*1.9, 0.34, 0.22, 0.34, NEON2)
    box(0, 0, H - 0.35, B+1.0, T+1.0, 0.55, GOLD)                 # Traufband
    for sx in (-B/2 - 0.32, B/2 + 0.32):                          # Neonstreifen an den Flanken
        leuchtband(sx, 0, T-4.0, H*0.62, NEON, 10, 'y', 0.60, 0.26)
        leuchtband(sx, 0, T-4.0, H*0.40, NEON2, 10, 'y', 0.40, 0.26)
    for sx in (-B/2 + 0.42, B/2 - 0.42):                          # Wandleuchten, buendig
        for k in range(5):
            box(sx, -10.0 + k*5.0, FB + 3.20, 0.24, 1.20, 0.50, NEON2)
    for sy in (-9.5, -5.5):                                       # Automatenreihen
        for i in range(12):
            automat(-13.2 + i*2.4, sy, HOLZ, GLAS, LED, 1)
            automat(-13.2 + i*2.4, sy + 0.78, HOLZ, GLAS, LED, -1)   # Ruecken an Ruecken
    spieltisch(-9.0, 3.0, FILZ, HOLZ, CHIP, 1.7, 6)               # Spieltische
    spieltisch(0.0, 3.0, FILZ, HOLZ, CHIP, 1.7, 6)
    spieltisch(9.0, 3.0, FILZ, HOLZ, CHIP, 1.7, 6)
    spieltisch(-5.0, 9.0, FILZ, HOLZ, CHIP, 1.4, 5)
    spieltisch(5.0, 9.0, FILZ, HOLZ, CHIP, 1.4, 5)
    box(15.0, -2.0, FB + 0.55, 8.0, 1.2, 1.10, HOLZ)              # Bar
    box(15.0, -2.0, FB + 1.16, 8.4, 1.5, 0.12, GOLD)
    box(15.0, -3.1, FB + 1.40, 8.0, 0.40, 2.80, W)                # Flaschenregal
    for k in range(4):
        box(15.0, -3.0, FB + 0.55 + k*0.62, 7.6, 0.30, 0.10, NEON2)
    for k in range(6):
        zyl(11.6 + k*1.36, -1.0, FB + 0.34, 0.16, 0.68, GOLD, 10)
        zyl(11.6 + k*1.36, -1.0, FB + 0.75, 0.32, 0.10, CHIP, 14)
    for sx in (-11.0, 11.0):                                      # Saeulen
        for sy in (-2.0, 6.0):
            zyl(sx, sy, (FB + H)/2, 0.45, H - FB, GOLD, 16)
    for (cx, cy) in ((-8.0, 0.0), (8.0, 0.0)):                    # Kronleuchter
        zyl(cx, cy, H - 1.125, 0.07, 2.25, GOLD, 8)   # reicht bis auf den oberen Teller
        for r_, n_, zz in ((1.5, 12, H - 1.70), (1.0, 8, H - 2.20)):
            zyl(cx, cy, zz, r_, 0.10, GOLD, 20)
            for i in range(n_):
                a = i/n_*math.tau
                box(cx + math.cos(a)*r_, cy + math.sin(a)*r_, zz + 0.22, 0.09, 0.09, 0.34, KERZ)
    export("th12_casino", 0.022, 2)

# ================================================================ 2) Nachtclub
def nachtclub():
    """Club: Tanzflaeche mit Leuchtfeldern, DJ-Pult, Bar, Galerie, Discokugel."""
    neu()
    W    = mat("ClubWand", (0.14,0.13,0.19), 0.85)
    AUS  = mat("Fassade", (0.18,0.16,0.24), 0.7)
    SOK  = mat("Sockel", (0.26,0.25,0.28), 0.9)
    BOD  = mat("Clubboden", (0.16,0.15,0.18), 0.6)
    GAL  = mat("Galerie", (0.22,0.21,0.26), 0.7)
    CHR  = mat("Chrom", (0.70,0.72,0.76), 0.25, 0.7)
    POL  = mat("Polster", (0.34,0.10,0.30), 0.8)
    F1   = mat("Feld1", (0.30,0.70,1.0), 0.2, 0.0, (0.20,0.60,1.0), 2.4)
    F2   = mat("Feld2", (1.0,0.30,0.70), 0.2, 0.0, (1.0,0.20,0.60), 2.4)
    NEON = mat("Neon", (0.40,1.0,0.80), 0.2, 0.0, (0.30,1.0,0.70), 2.8)
    LED  = mat("LED", (0.85,0.40,1.0), 0.2, 0.0, (0.80,0.30,1.0), 2.6)
    SPIEG= mat("Spiegel", (0.80,0.82,0.86), 0.10, 0.55)
    B, T, d = 28.0, 22.0, 0.5
    EH = 4.60
    OG = FB + EH + 0.34
    WH = OG + EH
    boden(B, T, SOK, BOD, 2.0)
    wand_mit_tuer(0, T/2, B, d, WH, AUS, 3.0, 3.4, 'x')
    box(0,-T/2, WH/2, B, d, WH, W)
    for sx in (-B/2, B/2): box(sx, 0, WH/2, d, T, WH, W)
    box(0, 0, WH + 0.30, B+1.2, T+1.2, 0.6, AUS)
    box(0, T/2 + 0.9, WH*0.62, B-6.0, 0.6, 2.2, AUS)              # Schriftzug
    box(0, T/2 + 0.56, WH*0.62, B-9.0, 0.24, 1.4, NEON)
    for sx in (-4.2, -1.9, 1.9, 4.2):                             # Samtkordel NEBEN der Tuer
        zyl(sx, T/2 + 2.2, FB + 0.50, 0.09, 1.00, CHR, 12)
        zyl(sx, T/2 + 2.2, FB + 1.06, 0.16, 0.12, CHR, 14)
    for sx in (-3.05, 3.05):                                      # (durchgehend wuerde das
        box(sx, T/2 + 2.2, FB + 0.92, 2.3, 0.10, 0.10, POL)       #  Seil den Eingang sperren)
    # Galerie nur an drei Seiten, Tanzflaeche bleibt offen
    platte_mit_loch(0, 0, OG - 0.17, B-2*d, T-2*d, 0.34, 13.0, 13.0, GAL)
    # Treppe IN den Luftraum, sonst rammt sie von unten in die Galerieplatte.
    # Stufenzahl aus der Steighoehe rechnen, nicht raten: n = round(4.94/0.172) = 29.
    treppe(-5.5, -6.5 + 29*0.28, FB, 1.6, OG - FB, GAL, CHR, 0.172, 0.28, richtung=-1)
    gelaender(-6.5, 6.5, 6.5, OG, CHR, 1.05, 'x')                 # Bruestung, aber am
    gelaender(-4.6, 6.5, -6.5, OG, CHR, 1.05, 'x')                # Treppenkopf offen
    for sx in (-6.5, 6.5):
        gelaender(-6.5, 6.5, sx, OG, CHR, 1.05, 'y')
    for ix in range(4):                                           # Tanzflaeche 12x12
        for iy in range(4):
            box(-4.5 + ix*3.0, -4.5 + iy*3.0, FB + 0.03, 2.94, 2.94, 0.06,
                F1 if (ix+iy) % 2 == 0 else F2)
    box(0, -8.6, FB + 0.30, 7.0, 3.0, 0.60, GAL)                  # DJ-Podest
    box(0, -8.2, FB + 1.10, 3.6, 1.0, 1.00, W)                    # DJ-Pult
    box(0, -8.2, FB + 1.62, 3.8, 1.2, 0.10, CHR)
    for sx in (-1.2, 1.2):
        box(sx, -8.2, FB + 1.70, 0.9, 0.7, 0.08, CHR)
    box(0, -8.2, FB + 1.02, 3.4, 0.10, 0.34, LED)
    box(0, -9.9, FB + 2.20, 8.0, 0.30, 3.20, W)                   # LED-Wand sitzt auf dem Podest
    for ix in range(8):
        for iy in range(4):
            box(-3.2 + ix*0.9, -9.76, FB + 0.95 + iy*0.72, 0.72, 0.08, 0.56,
                F1 if (ix+iy) % 2 == 0 else LED)
    box(-11.0, 4.0, FB + 0.55, 1.4, 9.0, 1.10, W)                 # Bar an der Laengswand
    box(-11.0, 4.0, FB + 1.16, 1.7, 9.4, 0.12, CHR)
    box(-12.4, 4.0, FB + 1.60, 0.40, 9.0, 3.00, W)
    for k in range(5):
        box(-12.3, 4.0, FB + 0.70 + k*0.62, 0.26, 8.6, 0.10, NEON)
    for k in range(6):
        zyl(-9.8, 0.4 + k*1.4, FB + 0.34, 0.16, 0.68, CHR, 10)
        zyl(-9.8, 0.4 + k*1.4, FB + 0.75, 0.32, 0.10, POL, 14)
    for (sx, sy) in ((10.0, 6.0), (10.0, 0.0), (10.0, -6.0)):     # Lounge-Sofas
        box(sx, sy, FB + 0.20, 3.0, 1.0, 0.40, POL)
        box(sx, sy, FB + 0.44, 3.0, 1.0, 0.08, POL)
        box(sx + 0.55, sy, FB + 0.66, 1.9, 1.0, 0.52, POL)
        zyl(sx - 1.9, sy, FB + 0.24, 0.55, 0.48, CHR, 16)
    zyl(0, 0, WH - 0.55, 0.06, 1.10, CHR, 8)                      # Discokugel
    kugel(0, 0, WH - 1.62, 0.55, SPIEG, 18) if False else None
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.55, location=(0,0,WH-1.62), segments=18, ring_count=10)
    bpy.context.active_object.data.materials.append(SPIEG)
    for i in range(6):                                            # Lichttraversen
        box(-9.0 + i*3.6, 0, WH - 0.45, 0.22, 14.0, 0.22, CHR)
        for k in range(5):
            box(-9.0 + i*3.6, -6.0 + k*3.0, WH - 0.78, 0.30, 0.30, 0.44,
                LED if (i+k) % 2 == 0 else NEON)
    export("th12_nachtclub", 0.022, 2)

# ================================================================ 3) Bowlingbahn
def bowlingbahn():
    """6 Bahnen mit Pins, Kugelrueckgabe, Anlaufzone, Sitzgruppen, Monitoren."""
    neu()
    W    = mat("BowlWand", (0.20,0.24,0.34), 0.85)
    AUS  = mat("Fassade", (0.26,0.30,0.42), 0.7)
    SOK  = mat("Sockel", (0.30,0.30,0.32), 0.9)
    BOD  = mat("Boden", (0.26,0.26,0.30), 0.6)
    BAHN = mat("Bahn", (0.84,0.68,0.40), 0.25)
    RINNE= mat("Rinne", (0.22,0.22,0.26), 0.5)
    PIN  = mat("Pin", (0.96,0.95,0.92), 0.4)
    PINR = mat("PinRing", (0.82,0.16,0.16), 0.5)
    KUG  = mat("Kugel", (0.14,0.20,0.46), 0.15, 0.3)
    POL  = mat("Sitz", (0.78,0.32,0.16), 0.8)
    CHR  = mat("Chrom", (0.68,0.70,0.74), 0.25, 0.7)
    MON  = mat("Monitor", (0.10,0.16,0.24), 0.2, 0.0, (0.30,0.70,1.0), 1.8)
    NEON = mat("Neon", (1.0,0.55,0.20), 0.2, 0.0, (1.0,0.45,0.14), 2.6)
    B, T, H, d = 34.0, 26.0, 6.0, 0.5
    boden(B, T, SOK, BOD, 2.0)
    wand_mit_oeffnungen(0, T/2, B, d, H, AUS, 2, 3.0, 3.4)
    box(0,-T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, W)
    box(0, 0, H + 0.30, B+1.2, T+1.2, 0.6, AUS)
    box(0, T/2 + 0.9, 4.55, B-6.0, 0.6, 2.0, AUS)                 # ueber den 3.4-m-Portalen
    box(0, T/2 + 1.28, 4.55, B-9.0, 0.24, 1.3, NEON)
    for i in range(6):                                            # 6 Bahnen
        px = -8.75 + i*3.5                                        # engeres Raster: 3.2 m
        box(px, -3.0, FB + 0.04, 1.06, 18.0, 0.08, BAHN)          # nackter Boden dazwischen
        for sx in (-0.72, 0.72):
            box(px + sx, -3.0, FB + 0.02, 0.38, 18.0, 0.10, RINNE)  # Rinnen
        box(px, -12.6, FB + 0.55, 2.20, 1.4, 1.10, W)             # Pinsetter-Blende
        box(px, -12.0, FB + 1.16, 2.40, 0.6, 0.12, NEON)
        for k, (ox, oy) in enumerate(((0,0), (-0.15,0.26), (0.15,0.26),
                                      (-0.30,0.52), (0,0.52), (0.30,0.52),
                                      (-0.45,0.78), (-0.15,0.78), (0.15,0.78), (0.45,0.78))):
            zyl(px + ox, -11.7 + oy, FB + 0.27, 0.065, 0.38, PIN, 10)   # Pins
            zyl(px + ox, -11.7 + oy, FB + 0.44, 0.048, 0.10, PINR, 10)
        box(px + 1.75, 1.0, FB + 0.24, 0.60, 8.0, 0.40, CHR)      # Rueckgabe nur in der
        for sx in (-0.26, 0.26):                                  # Anlaufzone, mit Mulde
            box(px + 1.75 + sx, 1.0, FB + 0.50, 0.08, 8.0, 0.20, CHR)
        for k in range(3):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.11, location=(px+1.75, 3.4+k*0.4, FB+0.55),
                                                 segments=14, ring_count=7)
            bpy.context.active_object.data.materials.append(KUG)
        box(px, 6.2, FB + 3.10, 1.9, 0.14, 1.10, MON)             # Monitor ueber der Bahn
        zyl(px, 6.2, FB + 4.675, 0.05, 2.05, CHR, 8)   # Aufhaengung bis an die Decke
    for i in range(6):                                            # Sitzgruppen, schmaler
        px = -8.75 + i*3.5                                        # und weiter von der Tuer weg
        for sy in (7.0, 8.6):
            box(px, sy, FB + 0.20, 2.0, 0.6, 0.40, W)
            box(px, sy, FB + 0.44, 2.0, 0.6, 0.08, POL)
            box(px, sy + (0.34 if sy > 7.8 else -0.34), FB + 0.68, 2.0, 0.10, 0.48, POL)
        box(px, 7.8, FB + 0.36, 0.8, 0.8, 0.72, CHR)
    box(0, 11.8, FB + 0.55, 9.0, 1.4, 1.10, W)                    # Ausgabetheke Schuhe
    box(0, 11.8, FB + 1.16, 9.4, 1.7, 0.12, CHR)
    box(0, 12.7, FB + 1.90, 9.0, 0.30, 1.40, W)
    for k in range(5):
        box(-3.6 + k*1.8, 12.55, FB + 1.90, 1.4, 0.10, 1.10, MON)
    for i in range(7):                                            # Deckenlicht
        box(-13.0 + i*4.4, 0, H - 0.30, 0.6, 20.0, 0.16, NEON)
    export("th12_bowlingbahn", 0.020, 2)

# ================================================================ 4) Spielhalle
def spielhalle():
    """Arcade: Automatenreihen, Airhockey, Greifautomat, Preistheke, viel Neon."""
    neu()
    W    = mat("HalleWand", (0.16,0.14,0.26), 0.85)
    AUS  = mat("Fassade", (0.22,0.18,0.34), 0.7)
    SOK  = mat("Sockel", (0.28,0.27,0.30), 0.9)
    BOD  = mat("Boden", (0.18,0.16,0.24), 0.6)
    KORP = mat("Korpus", (0.24,0.22,0.32), 0.6)
    GLAS = mat("Bildschirm", (0.16,0.28,0.40), 0.15, 0.2)
    ROT  = mat("Rot", (0.86,0.20,0.24), 0.5)
    GELB = mat("Gelb", (0.96,0.78,0.18), 0.5)
    CHR  = mat("Chrom", (0.68,0.70,0.74), 0.25, 0.7)
    N1   = mat("Neon1", (0.30,0.95,1.0), 0.2, 0.0, (0.20,0.90,1.0), 2.8)
    N2   = mat("Neon2", (1.0,0.35,0.75), 0.2, 0.0, (1.0,0.25,0.65), 2.8)
    LED  = mat("LED", (1.0,0.86,0.40), 0.2, 0.0, (1.0,0.80,0.30), 2.2)
    B, T, H, d = 26.0, 20.0, 5.2, 0.44
    boden(B, T, SOK, BOD, 2.0)
    wand_mit_oeffnungen(0, T/2, B, d, H, AUS, 3, 2.8, 3.2)   # 3 Portale: Mittelachse frei
    box(0,-T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, W)
    box(0, 0, H + 0.26, B+1.2, T+1.2, 0.52, AUS)
    box(0, T/2 + 0.9, H*0.70, B-4.0, 0.6, 1.8, AUS)
    box(0, T/2 + 1.32, H*0.70, B-7.0, 0.24, 1.2, N1)         # Neon VOR die Tafel
    for i in range(10):
        box(-B/2 + 1.6 + i*2.4, T/2 + 1.34, H*0.70, 0.34, 0.20, 1.6, N2)
    for sy in (-6.6, -2.6):                                       # Automatenreihen
        for i in range(9):
            automat(-9.6 + i*2.4, sy, KORP, GLAS, LED, 1)
            automat(-9.6 + i*2.4, sy + 0.78, KORP, GLAS, LED, -1)
    for sx in (-6.5, 0.0, 6.5):                                   # Airhockey-Tische
        box(sx, 3.4, FB + 0.35, 2.2, 1.3, 0.70, KORP)     # Spielhoehe 0.80 ueber Boden
        box(sx, 3.4, FB + 0.73, 2.3, 1.4, 0.06, CHR)
        box(sx, 3.4, FB + 0.78, 2.2, 1.3, 0.04, N1)
        for k in (-1.0, 1.0):
            box(sx + k*1.18, 3.4, FB + 0.86, 0.10, 1.35, 0.20, ROT)
    for sx in (-10.6, 10.6):                                      # Greifautomaten
        for k in range(3):
            box(sx, 1.0 + k*1.5, FB + 0.90, 1.2, 1.2, 1.80, KORP)
            box(sx, 1.0 + k*1.5, FB + 1.20, 1.0, 1.0, 1.10, GLAS)
            box(sx, 1.0 + k*1.5, FB + 1.92, 1.3, 1.3, 0.24, N2)
    box(0, 7.6, FB + 0.40, 8.0, 1.2, 0.80, KORP)                  # Preistheke 0.92 hoch
    box(0, 7.6, FB + 0.86, 8.4, 1.5, 0.12, CHR)
    box(0, 9.50, FB + 1.60, 8.0, 0.34, 3.20, W)                   # Preiswand an der Rueckwand
    for k in range(4):
        box(-3.0 + k*2.0, 9.30, FB + 1.90, 1.6, 0.10, 1.20, GELB if k % 2 else ROT)
    for i in range(5):                                            # Deckenlicht
        box(-9.6 + i*4.8, 0, H - 0.26, 0.5, 15.0, 0.14, N1 if i % 2 == 0 else N2)
    export("th12_spielhalle", 0.018, 2)

# ================================================================ 5) Theater
def theater():
    """Buehne mit Vorhang und Portal, 12 ansteigende Zuschauerreihen, Rang, Foyer."""
    neu()
    W    = mat("TheaterWand", (0.42,0.18,0.20), 0.85)
    AUS  = mat("Fassade", (0.82,0.76,0.64), 0.8)
    SOK  = mat("Sockel", (0.46,0.42,0.36), 0.9)
    BOD  = mat("Parkett", (0.34,0.20,0.12), 0.6)
    GOLD = mat("Stuck", (0.78,0.62,0.26), 0.3, 0.7)
    SITZ = mat("Sitz", (0.56,0.10,0.14), 0.8)
    VORH = mat("Vorhang", (0.62,0.08,0.12), 0.85)
    BUEH = mat("Buehne", (0.20,0.14,0.10), 0.7)
    KERZ = mat("Kerze", (1.0,0.92,0.74), 0.3, 0.0, (1.0,0.88,0.66), 2.2)
    GLAS = mat("Glas", (0.58,0.72,0.82), 0.15)
    B, T, H, d = 34.0, 34.0, 13.0, 0.6
    boden(B, T, SOK, BOD, 6.0)   # breiter Vorplatz: die Portikus-Saeulen stehen darauf
    # Aussenhaut komplett in Werkstein — mit dem dunkelroten Innenmaterial waeren
    # drei Seiten rot und nur die Schauseite hell.
    wand_mit_oeffnungen(0, T/2, B, d, H, AUS, 3, 3.2, 4.4)
    box(0,-T/2, H/2, B, d, H, AUS)
    for sx in (-B/2, B/2):
        box(sx, 0, H/2, d, T, H, AUS)
        fensterband(sx, 0, T-8.0, d, FB + 8.4, 3.0, AUS, GLAS, 4, 'y')
        box(sx + (0.42 if sx < 0 else -0.42), 0, H/2, 0.24, T-1.0, H-1.0, W)   # Innenschale
    box(0, 0, H + 0.35, B+1.6, T+1.6, 0.7, SOK)
    for px in (-10.0, -6.0, 6.0, 10.0):                           # Portikus vorn
        zyl(px, T/2 + 2.0, (FB + 9.4)/2, 0.58, 9.4 - FB, AUS, 14)
        zyl(px, T/2 + 2.0, 9.55, 0.76, 0.30, AUS, 14)
    box(0, T/2 + 2.0, 10.00, 24.0, 3.6, 0.60, AUS)
    box(0, T/2 + 0.30, 11.30, 20.0, 0.40, 1.60, GOLD)             # Schriftband
    box(0, -11.0, FB + 0.55, B-4.0, 10.0, 1.10, BUEH)             # Buehne, 1.10 hoch
    box(0, -11.0, FB + 1.14, B-3.6, 10.4, 0.12, BOD)
    box(0, -5.9, FB + 1.10, B-4.0, 0.40, 0.20, GOLD)              # Buehnenkante
    for sx in (-13.0, 13.0):                                      # Buehnenportal
        box(sx, -5.4, FB + 5.20, 3.0, 1.2, 10.40, W)
        for k in range(4):
            box(sx, -4.85, FB + 2.20 + k*2.30, 3.2, 0.24, 0.34, GOLD)
    box(0, -5.4, FB + 10.90, 29.0, 1.2, 1.00, W)
    box(0, -5.6, FB + 10.40, 27.0, 0.50, 0.60, GOLD)
    for i in range(15):                                           # Vorhang in Falten —
        px = -11.2 + i*1.6                                        # r=0.55 liess 0.50 m
        o = zyl(px, -5.9, FB + 5.60, 0.85, 9.00, VORH, 10)        # Spalt je Falte
        o.scale[1] = 0.5
    box(0, -6.15, FB + 5.60, 23.0, 0.25, 9.00, VORH)              # geschlossene Rueckseite
    box(0, -5.9, FB + 9.60, 21.0, 0.70, 1.40, VORH)               # Vorhangschabracke
    for r in range(8):                                            # Zuschauerreihen, fallen
        py = -1.6 + r*1.5                                         # zur Buehne hin ab
        zh = FB + r*0.26
        if r > 0:
            box(0, py, (FB + zh)/2, 26.0, 1.5, zh - FB, W)
        for c in range(16):
            if c in (7, 8): continue                               # Mittelgang auf der Tuerachse
            px = -11.25 + c*1.5
            box(px, py, zh + 0.42, 1.24, 0.66, 0.10, SITZ)
            box(px, py + 0.34, zh + 0.85, 1.24, 0.16, 0.90, SITZ)
            for bx in (-0.62, 0.62):
                box(px + bx, py, zh + 0.33, 0.09, 0.60, 0.66, SITZ)
    box(0, 11.1, FB + 0.91, 26.0, 2.9, 1.82, W)                   # Podest hinter der letzten
    treppe(0, 15.6, FB, 3.0, 1.82, W, GOLD, 0.17, 0.30, richtung=-1)   # Reihe + Zugangstreppe
    box(0, 14.2, FB + 6.40, 32.0, 3.0, 0.44, W)                   # Rang
    for c in range(16):
        px = -11.25 + c*1.5
        box(px, 14.2, FB + 7.04, 1.24, 0.66, 0.10, SITZ)
        box(px, 14.55, FB + 7.47, 1.24, 0.16, 0.90, SITZ)
        for bx in (-0.62, 0.62):                                  # Wangen tragen bis auf die
            box(px + bx, 14.2, FB + 6.95, 0.09, 0.60, 0.66, SITZ) # Rangplatte
    gelaender(-15.0, 15.0, 12.6, FB + 6.62, GOLD)
    for sx in (-15.2, 15.2):                                      # Aufgang zum Rang, endet
        treppe(sx, 1.78, FB, 1.6, 6.62, W, GOLD, 0.17, 0.28, richtung=1)   # an der Rangkante
    zyl(0, 4.0, 11.95, 0.08, 2.10, GOLD, 8)                       # Kronleuchter
    for r_, n_, zz in ((2.2, 16, H - 2.10), (1.5, 12, H - 2.80), (0.9, 8, H - 3.40)):
        zyl(0, 4.0, zz, r_, 0.12, GOLD, 24)
        for i in range(n_):
            a = i/n_*math.tau
            box(math.cos(a)*r_, 4.0 + math.sin(a)*r_, zz + 0.26, 0.10, 0.10, 0.40, KERZ)
    export("th12_theater", 0.022, 2)

if __name__ == "__main__":
    print("Asset-Charge 9 (th12, Vergnuegungsviertel):")
    for fn in (casino, nachtclub, bowlingbahn, spielhalle, theater):
        fn()
    print("fertig")
