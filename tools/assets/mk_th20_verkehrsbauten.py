# -*- coding: utf-8 -*-
"""Asset-Charge 13 (th20_*): BEGEHBARE VERKEHRSBAUTEN — U-Bahn-Station, Tankstelle,
Busbahnhof, Feuerwache, offene Parkgarage.

Konventionen wie th5-th12:
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
def markierung(cx, cy, n, breite, laenge, z, m, abstand):
    """Parkplatz-Markierungen: n Striche im Abstand `abstand` entlang x."""
    for i in range(n + 1):
        box(cx - n*abstand/2 + i*abstand, cy, z, breite, laenge, 0.03, m)

def gleisstueck(cx, cy, laenge, z, m_schotter, m_schwelle, m_schiene):
    """Schotter, Schwellen, 2 Schienen. Das Gleis laeuft in X — PARALLEL zum Bahnsteig
    (laengs in y gebaut stuende es quer davor). Spurweite 1.435 m."""
    box(cx, cy, z + 0.11, laenge, 3.60, 0.22, m_schotter)
    n = max(1, int(laenge / 0.62))
    for i in range(n):
        box(cx - laenge/2 + (i + 0.5)*laenge/n, cy, z + 0.28, 0.26, 2.60, 0.14, m_schwelle)
    for sy in (-0.7175, 0.7175):
        box(cx, cy + sy, z + 0.40, laenge, 0.14, 0.16, m_schiene)

# ================================================================ 1) U-Bahn-Station
def ubahn_station():
    """Zugangstreppe -> Schalterhalle -> Bahnsteig am Gleis, Tonnengewoelbe."""
    neu()
    W    = mat("StationWand", (0.86,0.85,0.82), 0.8)
    SOK  = mat("Sockel", (0.42,0.41,0.39), 0.9)
    BOD  = mat("Bahnsteigboden", (0.70,0.68,0.64), 0.6)
    KACH = mat("Kachel", (0.92,0.92,0.90), 0.35)
    BAND = mat("Farbband", (0.16,0.42,0.72), 0.5)
    STAHL= mat("Stahl", (0.46,0.48,0.52), 0.4, 0.5)
    SCHOT= mat("Schotter", (0.34,0.33,0.31), 0.95)
    SCHW = mat("Schwelle", (0.28,0.22,0.18), 0.85)
    SCHIE= mat("Schiene", (0.52,0.50,0.48), 0.35, 0.55)
    GELB = mat("Blindenstreifen", (0.92,0.80,0.20), 0.75)
    LED  = mat("Deckenlicht", (1.0,0.98,0.92), 0.2, 0.0, (1.0,0.98,0.92), 2.0)
    TAF  = mat("Anzeige", (0.08,0.10,0.14), 0.3, 0.0, (0.25,0.85,0.45), 1.6)
    B, T, H, d = 34.0, 22.0, 7.0, 0.6
    boden(B, T, SOK, BOD, 3.0)
    wand_mit_oeffnungen(0, T/2, B, d, H, W, 3, 4.0, 4.2)          # Zugang (+y)
    box(0,-T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, W)
    platte_mit_loch(0, 0, H + 0.25, B+1.2, T+1.2, 0.5, B-3.0, T-3.0, SOK)
    tonne(0, 0, H, T/2, B-1.0, KACH, 24)                          # Gewoelbe
    for i in range(8):
        tonne(-B/2 + 2.4 + i*4.2, 0, H, T/2 + 0.14, 0.30, STAHL, 24)
    for sx in (-B/2 + 0.42, B/2 - 0.42):                          # Kachelband an den Waenden
        box(sx, 0, FB + 2.20, 0.24, T-1.0, 1.60, KACH)
        box(sx, 0, FB + 3.10, 0.26, T-1.0, 0.34, BAND)
    box(0, -6.0, FB + 0.38, B-4.0, 6.0, 0.76, SOK)                # Bahnsteig, 0.76 hoch
    box(0, -8.9, FB + 0.78, B-4.0, 0.60, 0.04, GELB)              # Blindenstreifen
    gleisstueck(0, -11.2, 30.0, FB, SCHOT, SCHW, SCHIE)           # Gleis laengs am Bahnsteig
    _, pf = oeffnungs_achsen(B, 3, 4.0)                           # Stuetzen auf die Pfeiler-
    for px in pf:                                                 # achsen, sonst steht eine
        zyl(px, -6.0, FB + 0.76 + (H - FB - 0.76)/2, 0.30,        # Saeule im Mittelportal
            H - FB - 0.76, STAHL, 12)
    box(0, T/2 - 1.4, FB + 5.00, 9.0, 0.30, 1.80, TAF)            # Anzeigetafel
    for sx in (-11.0, 11.0):                                      # Fahrkartenautomaten
        for k in range(2):
            box(sx + k*1.5, T/2 - 2.2, FB + 0.85, 1.10, 0.60, 1.70, W)
            box(sx + k*1.5, T/2 - 2.55, FB + 1.25, 0.80, 0.10, 0.60, TAF)
    for i in range(4):                                            # Sitzbaenke
        box(-9.0 + i*6.0, -2.6, FB + 1.20, 2.4, 0.50, 0.10, STAHL)
        box(-9.0 + i*6.0, -2.34, FB + 1.52, 2.4, 0.10, 0.54, STAHL)
    for i in range(7):
        box(-B/2 + 3.6 + i*4.6, 0, H - 0.30, 0.6, T-4.0, 0.14, LED)
    export("th20_ubahn_station", 0.022, 2)

# ================================================================ 2) Tankstelle
def tankstelle():
    """Vordach auf Stuetzen, 4 Zapfsaeulen, begehbarer Shop, Preistafel."""
    neu()
    W    = mat("ShopWand", (0.90,0.89,0.86), 0.8)
    SOK  = mat("Vorplatz", (0.44,0.44,0.42), 0.92)
    BOD  = mat("Shopboden", (0.72,0.70,0.66), 0.5)
    DACH = mat("Vordach", (0.94,0.94,0.92), 0.6)
    ROT  = mat("Akzent", (0.84,0.18,0.14), 0.5)
    GRUEN= mat("Akzent2", (0.16,0.56,0.34), 0.5)
    GLAS = mat("Glas", (0.46,0.64,0.74), 0.12, 0.25)
    STAHL= mat("Stahl", (0.52,0.54,0.58), 0.4, 0.5)
    TAF  = mat("Preistafel", (0.10,0.12,0.16), 0.3, 0.0, (0.95,0.85,0.25), 1.8)
    B, T, H, d = 12.0, 9.0, 4.0, 0.34
    box(0, 0, FB/2, 34.0, 30.0, FB, SOK)                          # ganzer Vorplatz
    box(0, 9.0, FB/2, B, T, FB, BOD)                              # Shopboden
    wand_mit_tuer(0, 9.0 + T/2, B, d, H, W, 2.4, 3.0, 'x')        # Shop-Eingang (+y)
    box(0, 9.0 - T/2, H/2 + 0.0, B, d, H, W)
    for sx in (-B/2, B/2): box(sx, 9.0, H/2, d, T, H, W)
    box(0, 9.0, H + 0.22, B+1.0, T+1.0, 0.44, DACH)
    box(0, 9.0, H + 0.60, B+0.4, T+0.4, 0.36, ROT)                # Firmenband
    for sx in (-3.4, 3.4):
        box(sx, 9.0 + T/2 - 0.06, FB + 1.60, 3.6, 0.20, 2.20, GLAS)   # Schaufenster
    for i in range(3):                                            # Regale im Shop
        box(-4.0 + i*4.0, 7.4, FB + 0.85, 3.2, 0.70, 1.70, W)
        for k in range(3):
            box(-4.0 + i*4.0, 7.4, FB + 0.50 + k*0.56, 3.3, 0.80, 0.10,
                ROT if k % 2 == 0 else GRUEN)
    box(0, 11.6, FB + 0.55, 5.0, 1.0, 1.10, W)                    # Kasse
    box(0, 11.6, FB + 1.16, 5.4, 1.3, 0.12, STAHL)
    box(0, -3.0, 5.30, 22.0, 12.0, 0.60, DACH)                    # Zapfsaeulen-Vordach
    box(0, -3.0, 5.72, 22.4, 12.4, 0.34, ROT)
    for sx in (-9.4, 9.4):
        for sy in (-8.0, 2.0):
            zyl(sx, sy, (FB + 5.00)/2, 0.30, 5.00 - FB, STAHL, 14)
    for sx in (-5.0, 5.0):                                        # 4 Zapfsaeulen auf Inseln
        for sy in (-6.4, -0.4):
            box(sx, sy, FB + 0.09, 3.6, 1.6, 0.18, SOK)           # Insel
            box(sx, sy, FB + 0.95, 0.80, 0.60, 1.54, W)
            box(sx, sy - 0.32, FB + 1.34, 0.60, 0.08, 0.42, TAF)
            box(sx, sy, FB + 1.80, 0.90, 0.70, 0.16, ROT)
            zyl(sx + 0.48, sy + 0.34, FB + 1.10, 0.06, 0.70, STAHL, 8)
    box(-14.0, 5.0, FB + 3.10, 0.50, 0.50, 6.20, STAHL)           # Preismast
    box(-14.0, 5.0, FB + 6.90, 3.4, 0.40, 3.20, W)
    for k in range(3):
        box(-14.0, 4.75, FB + 5.90 + k*1.00, 2.8, 0.14, 0.70, TAF)
    export("th20_tankstelle", 0.020, 2)

# ================================================================ 3) Busbahnhof
def busbahnhof():
    """4 ueberdachte Bussteige mit Wartehalle, Anzeigen und Bussteigkanten."""
    neu()
    W    = mat("HalleWand", (0.88,0.87,0.84), 0.8)
    SOK  = mat("Sockel", (0.44,0.44,0.42), 0.92)
    BOD  = mat("Steigboden", (0.68,0.66,0.62), 0.6)
    ASPH = mat("Fahrbahn", (0.26,0.26,0.28), 0.95)
    DACH = mat("Dach", (0.52,0.56,0.60), 0.5, 0.35)
    GLAS = mat("Glas", (0.52,0.70,0.80), 0.12, 0.25)
    STAHL= mat("Stahl", (0.50,0.52,0.56), 0.4, 0.5)
    GELB = mat("Kante", (0.92,0.80,0.20), 0.75)
    TAF  = mat("Anzeige", (0.08,0.10,0.14), 0.3, 0.0, (0.30,0.80,1.0), 1.7)
    box(0, 0, FB/2, 60.0, 40.0, FB, ASPH)                         # Busfahrflaeche
    for i in range(4):                                            # 4 Bussteige
        cy = -12.0 + i*8.0
        box(0, cy, FB + 0.09, 46.0, 3.2, 0.18, BOD)
        box(0, cy - 1.55, FB + 0.19, 46.0, 0.30, 0.04, GELB)
        box(0, cy + 1.55, FB + 0.19, 46.0, 0.30, 0.04, GELB)
        box(0, cy, 4.62, 47.0, 4.4, 0.34, DACH)                   # Dach
        for k in range(8):                                        # Stuetzen
            zyl(-20.0 + k*5.7, cy, (FB + 4.45)/2, 0.22, 4.45 - FB, STAHL, 12)
        for k in range(6):                                        # Sitzbaenke + Anzeigen
            box(-17.0 + k*6.8, cy, FB + 0.62, 2.2, 0.50, 0.10, STAHL)
            box(-17.0 + k*6.8, cy + 0.26, FB + 0.94, 2.2, 0.10, 0.54, STAHL)
        for k in range(4):
            box(-15.0 + k*10.0, cy, FB + 3.30, 1.8, 0.20, 0.90, TAF)
    box(0, 16.0, FB/2, 24.0, 10.0, FB, BOD)                       # Wartehalle
    wand_mit_oeffnungen(0, 21.0, 24.0, 0.4, 5.0, W, 3, 3.0, 3.4)
    box(0, 11.0, 2.50, 24.0, 0.4, 5.0, W)
    for sx in (-12.0, 12.0):
        box(sx, 16.0, 2.50, 0.4, 10.0, 5.0, W)
        box(sx, 16.0, FB + 2.30, 0.22, 8.0, 2.20, GLAS)
    box(0, 16.0, 5.25, 25.0, 11.0, 0.5, DACH)
    for k in range(4):
        box(-8.0 + k*5.4, 13.0, FB + 0.62, 3.0, 0.50, 0.10, STAHL)
        box(-8.0 + k*5.4, 13.26, FB + 0.94, 3.0, 0.10, 0.54, STAHL)
    box(0, 20.4, FB + 3.00, 16.0, 0.24, 1.80, TAF)                # grosse Abfahrtstafel
    export("th20_busbahnhof", 0.020, 2)

# ================================================================ 4) Feuerwache
def feuerwache():
    """Fahrzeughalle mit 3 Toren, Schlauchturm, Mannschaftstrakt, Hof."""
    neu()
    W    = mat("WacheWand", (0.86,0.30,0.24), 0.8)
    HELL = mat("Putz", (0.90,0.88,0.84), 0.8)
    SOK  = mat("Hof", (0.42,0.42,0.40), 0.92)
    BOD  = mat("Hallenboden", (0.58,0.58,0.56), 0.6)
    DACH = mat("Dach", (0.36,0.36,0.38), 0.8)
    GLAS = mat("Glas", (0.50,0.68,0.78), 0.14, 0.2)
    STAHL= mat("Stahl", (0.50,0.52,0.56), 0.4, 0.5)
    GELB = mat("Bodenmarkierung", (0.92,0.80,0.20), 0.75)
    BLAU = mat("Blaulicht", (0.20,0.36,0.92), 0.2, 0.0, (0.20,0.36,0.92), 2.4)
    B, T, H, d = 30.0, 20.0, 8.0, 0.5
    boden(B, T, SOK, BOD, 8.0)
    wand_mit_oeffnungen(0, T/2, B, d, H, W, 3, 5.0, 5.0)          # 3 Hallentore (+y)
    box(0,-T/2, H/2, B, d, H, W)
    for sx in (-B/2, B/2): box(sx, 0, H/2, d, T, H, W)
    box(0, 0, H + 0.30, B+1.2, T+1.2, 0.6, DACH)
    box(0, 0, H - 0.55, B+0.6, T+0.6, 0.45, HELL)                 # Traufband
    oeff, _ = oeffnungs_achsen(B, 3, 5.0)
    for px in oeff:                                               # Ausfahrtmarkierungen
        for sx in (-2.3, 2.3):
            box(px + sx, T/2 + 5.0, FB + 0.02, 0.16, 12.0, 0.04, GELB)
        box(px, 0, FB + 0.02, 4.4, T-2.0, 0.04, BOD)
    for i in range(6):                                            # Hallenfenster oben
        box(-12.5 + i*5.0, T/2 - 0.06, FB + 6.40, 3.0, 0.24, 1.10, GLAS)
    box(-B/2 - 3.5, -T/2 + 4.0, 8.50, 7.0, 8.0, 17.0, HELL)       # Schlauchturm
    box(-B/2 - 3.5, -T/2 + 4.0, 17.30, 7.8, 8.8, 0.6, DACH)
    for k in range(4):
        box(-B/2 - 3.5, -T/2 + 0.05, FB + 3.0 + k*3.4, 2.2, 0.24, 1.20, GLAS)
    box(-B/2 - 3.5, -T/2 + 4.0, 18.10, 0.8, 0.8, 1.0, STAHL)
    box(B/2 + 4.5, 0, 3.30, 8.0, T, 6.0, HELL)                    # Mannschaftstrakt
    box(B/2 + 4.5, 0, 6.55, 8.8, T+0.8, 0.5, DACH)
    for k in range(4):
        box(B/2 + 0.45, -7.0 + k*4.6, FB + 2.20, 0.22, 2.4, 1.40, GLAS)
        box(B/2 + 8.55, -7.0 + k*4.6, FB + 2.20, 0.22, 2.4, 1.40, GLAS)
    wand_mit_tuer(B/2 + 4.5, T/2, 8.0, 0.4, 6.0, HELL, 1.8, 2.8, 'x')
    for sx in (-8.0, 0.0, 8.0):                                   # Blaulichter ueber den Toren
        box(sx, T/2 + 0.30, FB + 5.40, 0.50, 0.24, 0.24, BLAU)
    export("th20_feuerwache", 0.022, 2)

# ================================================================ 5) Offene Parkgarage
def parkgarage():
    """2 begehbare Decks mit Rampe, Stellplatzmarkierung, Bruestung, Treppenhaus."""
    neu()
    BET  = mat("Beton", (0.72,0.71,0.68), 0.9)
    SOK  = mat("Sockel", (0.42,0.42,0.40), 0.92)
    BOD  = mat("Deckbelag", (0.56,0.56,0.54), 0.7)
    DKL  = mat("Fuge", (0.36,0.36,0.34), 0.85)
    STAHL= mat("Gelaender", (0.54,0.56,0.60), 0.4, 0.5)
    GELB = mat("Markierung", (0.92,0.86,0.30), 0.75)
    GRUEN= mat("Leitfarbe", (0.18,0.56,0.36), 0.6)
    LED  = mat("Deckenlicht", (1.0,0.98,0.92), 0.2, 0.0, (1.0,0.98,0.92), 1.8)
    B, T, EH = 34.0, 22.0, 3.20
    boden(B, T, SOK, BOD, 3.0)
    OG = FB + EH + 0.34
    platte_mit_loch(0, 0, OG - 0.17, B, T, 0.34, 0.0, 0.0, BOD)   # OG-Deck (geschlossen)
    box(0, 0, OG + EH + 0.20, B+0.8, T+0.8, 0.40, BET)            # Dachdeck
    for sx in (-15.0, -9.0, -3.0, 3.0, 9.0, 15.0):                # Stuetzen
        for sy in (-8.0, 0.0, 8.0):
            box(sx, sy, (FB + OG + EH)/2, 0.55, 0.55, OG + EH - FB, BET)
    for et, z0 in ((0, FB), (1, OG)):                             # Bruestungen je Deck
        for sy in (-T/2 + 0.16, T/2 - 0.16):
            box(0, sy, z0 + 0.55, B, 0.30, 1.10, BET)
            box(0, sy, z0 + 1.14, B+0.2, 0.36, 0.10, DKL)
        for sx in (-B/2 + 0.16, B/2 - 0.16):
            box(sx, 0, z0 + 0.55, 0.30, T, 1.10, BET)
            box(sx, 0, z0 + 1.14, 0.36, T+0.2, 0.10, DKL)
        for sy in (-7.0, 7.0):                                    # Stellplatzmarkierung
            markierung(0, sy, 10, 0.12, 4.8, z0 + 0.02, GELB, 2.6)
            box(0, sy + (2.4 if sy > 0 else -2.4), z0 + 0.02, 27.0, 0.12, 0.03, GELB)
        box(0, 0, z0 + 0.02, 27.0, 0.16, 0.03, GRUEN)             # Fahrgasse
    treppe(-14.0, 4.6, FB, 2.4, OG - FB, BET, STAHL, 0.17, 0.28, richtung=-1)
    box(-14.0, -3.0, OG + 0.18, 2.8, 3.0, 0.36, BET)              # Podest oben
    for i in range(6):                                            # Deckenlicht
        box(-14.0 + i*5.6, 0, OG - 0.42, 0.5, T-3.0, 0.14, LED)
        box(-14.0 + i*5.6, 0, OG + EH - 0.22, 0.5, T-3.0, 0.14, LED)
    box(0, T/2 + 1.2, FB + 1.40, 6.0, 0.30, 2.20, BET)            # Einfahrtschild
    box(0, T/2 + 1.02, FB + 1.60, 4.4, 0.16, 1.20, GRUEN)
    export("th20_parkgarage", 0.020, 2)

if __name__ == "__main__":
    print("Asset-Charge 13 (th20, Verkehrsbauten):")
    for fn in (ubahn_station, tankstelle, busbahnhof, feuerwache, parkgarage):
        fn()
    print("fertig")
