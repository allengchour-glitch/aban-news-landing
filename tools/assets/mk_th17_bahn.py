# -*- coding: utf-8 -*-
"""Asset-Charge (th17_*): SCHIENE & TRAM — Gleis, Bahnsteig, Lok, Wagen, Tram,
Haltestelle, Oberleitung, Signal, Tunnelportal. Familienfreundlich, KEINE Waffen.

Konventionen wie th5-th14 (siehe models/TH5-ASSETS.md, Abschnitt "Fallstricke"):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT, sonst fehlt der Bevel.
  * `primitive_cube_add(size=1)` -> Kantenlaenge 1, Skalierung = Mass (NICHT /2).
  * FRONT der Fahrzeuge liegt auf Blender +y  ->  in three.js -z.
  * Raeder/Achsen: `rot=(0,pi/2,0)` legt die Zylinderachse auf x. Fahrzeuge liegen
    hier mit ihrer LAENGE in y, also waere `rot=(pi/2,0,0)` fuer Raeder falsch —
    das gilt nur fuer laengslaufende Teile (Dachtonne, Puffer, Signal-Lampen).
  * `rotation_euler[2] = pi` auf symmetrischen Quadern ist ein No-Op -> gespiegelt
    wird ueber das VORZEICHEN der Offsets.
  * Metallic max 0.6 (darueber rendert three.js ohne Environment-Map fast schwarz).

MODULRASTER (das Wichtigste dieser Charge):
  * th17_gleis_modul, th17_bahnsteig_modul, th17_bahnsteigdach und der Fahrdraht von
    th17_oberleitungsmast sind exakt 12.000 m lang und laufen in +x. Reihen mit
    `x += 12.0` — Schwellen (0.60), Plattenfugen (1.50), Dachstuetzen (6.00),
    Blindenstreifen-Rippen (0.30) und Fahrdraht-Haenger (3.00) sind so gesetzt,
    dass ihr Raster ueber die Modulfuge hinweg weiterlaeuft.
  * SOK (Schienenoberkante) = 0.650 ueber Grund. Fahrzeuge stehen mit der
    Radunterkante auf z=0 -> im Spiel auf z = +0.650 setzen, dann beruehren die
    Raeder die Schiene.
  * Fahrdraht liegt auf 5.600 ueber Grund = 4.950 ueber SOK -> exakt die Hoehe der
    ausgefahrenen Stromabnehmer von Lok und Tram.
  * Bahnsteigkante gehoert NEBEN das Gleis: Bahnsteigmitte auf y = +4.70 vom
    Gleismittelpunkt (halbe Breite 3.00 -> Kante bei 1.70, Wagenkasten halb 1.51).
  * th17_gleis_bogen beginnt (anders als die Geraden) mit seinem Anfangs-Ende im
    Ursprung, Tangente +x, und dreht nach +y — er wird an das Modul-Ende gesetzt.
"""
import bpy, bmesh, os, math

OUT_GLB = "/home/user/aban-news-landing/models"
OUT_STL = "/home/user/aban-news-landing/models/stl"
os.makedirs(OUT_STL, exist_ok=True)

TAU = math.tau

# ---------------------------------------------------------------- Grundmasse
MOD  = 12.000      # Modullaenge in x
SPUR = 1.435       # Spurweite (Mitte Schiene - Mitte Schiene)
HS   = SPUR / 2.0  # 0.7175
SOK  = 0.650       # Schienenoberkante ueber Grund
SCHW = 0.600       # Schwellenabstand
FD   = 5.600       # Fahrdrahthoehe ueber Grund
PANT = FD - SOK    # 4.950 — Oberkante Stromabnehmer im Fahrzeugmodell


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
    b.inputs["Metallic"].default_value = min(metal, 0.6)
    if emit:
        b.inputs["Emission Color"].default_value = (emit[0], emit[1], emit[2], 1)
        b.inputs["Emission Strength"].default_value = estr
    return m


def leucht(name, rgb, estr=2.4):
    return mat(name, rgb, 0.25, 0.0, rgb, estr)


def box(x, y, z, sx, sy, sz, m=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    o = bpy.context.active_object; o.scale = (sx, sy, sz)
    if m: o.data.materials.append(m)
    return o


def zyl(x, y, z, r, h, m=None, seg=16, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x, y, z),
                                        vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o


def kegel(x, y, z, r1, r2, h, m=None, seg=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x, y, z),
                                    vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o


def kugel(x, y, z, r, m=None, seg=12):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, y, z), segments=seg,
                                         ring_count=max(5, seg // 2))
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
    bpy.ops.export_scene.gltf(filepath=p1, export_format='GLB', use_selection=False,
                              export_apply=True)
    p2 = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p2)
    except Exception: bpy.ops.export_mesh.stl(filepath=p2)
    print("  ->", name, os.path.getsize(p1), "B")


# ---------------------------------------------------------------- Helfer
def strebe(y0, z0, y1, z1, dicke, m, cx=0.0, breite=None):
    """Schraege Strebe in der y-z-Ebene, Laengsachse = lokales y.
    atan2(dz, dy) ist korrekt fuer alle vier Quadranten: das lokale +y-Ende
    wandert nach (cos t, sin t), also genau auf den hoeheren/tieferen Endpunkt."""
    dy, dz = y1 - y0, z1 - z0
    L = math.hypot(dy, dz)
    o = box(cx, (y0 + y1) / 2.0, (z0 + z1) / 2.0, breite or dicke, L, dicke, m)
    o.rotation_euler[0] = math.atan2(dz, dy)
    return o


def tonne_y(cx, cy, zbasis, r, laenge, m, seg=20, flach=1.0):
    """Halbe Tonne mit Achse in y (Fahrzeugdach). Untere Haelfte WEGGESCHNITTEN,
    Basis exakt bei zbasis — ein voller Zylinder wuerde im Wagenkasten stecken."""
    o = zyl(cx, cy, zbasis, r, laenge, m, seg, rot=(math.pi / 2, 0, 0))
    nur(o)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    bm.to_mesh(o.data); bm.free(); o.data.update()
    o.scale[2] = flach
    return o


def radsatz(cy, m_rad, m_stahl, r=0.575, br=0.135):
    """Zwei Raeder + Achswelle. Die Radmitten liegen auf der Spurweite, damit die
    Laufflaeche wirklich auf dem Schienenkopf steht. Achse laeuft in x!
    Segmentzahl 24 (durch 4 teilbar): dann liegt eine Kante exakt unten und die
    Radunterkante trifft z=0.000 — mit 22 Segmenten schwebte das Rad 6 mm."""
    for sx in (-HS, HS):
        zyl(sx, cy, r, r, br, m_rad, 24, rot=(0, math.pi / 2, 0))          # Radreifen
        zyl(sx, cy, r, r * 0.62, br * 1.25, m_stahl, 16, rot=(0, math.pi / 2, 0))  # Radscheibe
    zyl(0, cy, r, 0.075, 2 * HS - 0.12, m_stahl, 12, rot=(0, math.pi / 2, 0))


def drehgestell(cy, m_rahm, m_rad, m_stahl, achs=2.70, r=0.575, br=0.135):
    for dy in (-achs / 2.0, achs / 2.0):
        radsatz(cy + dy, m_rad, m_stahl, r, br)
        for sx in (-1, 1):
            box(sx * (HS + 0.20), cy + dy, r, 0.34, 0.36, 0.34, m_rahm)     # Achslager
    for sx in (-1, 1):
        box(sx * (HS + 0.33), cy, r + 0.06, 0.15, achs + 1.10, 0.46, m_rahm)  # Langtraeger
    box(0, cy, r + 0.40, 2.00, 1.00, 0.34, m_rahm)                          # Wiege
    box(0, cy, r + 0.62, 1.20, 1.60, 0.22, m_rahm)


def stromabnehmer(cy, zdach, m_rahm, m_iso, m_schleif, ztop=PANT, breite=1.90):
    """Einarm-Stromabnehmer, Schleifstueck-Oberkante exakt auf `ztop`.
    Jedes Gelenk bekommt ein Querrohr und jeder Arm einen Lagerbock — ohne die
    schweben die Arme frei ueber dem Grundrahmen (erste Fassung sah aus wie
    hingeworfene Staebe)."""
    box(0, cy, zdach + 0.07, 2.10, 1.50, 0.14, m_rahm)                      # Grundrahmen
    zb = zdach + 0.40                                                       # Drehachse
    for sx in (-0.78, 0.78):
        for dy in (-0.58, 0.58):
            zyl(sx, cy + dy, zdach + 0.26, 0.09, 0.24, m_iso, 10)           # Isolatoren
        box(sx, cy - 0.58, zb - 0.14, 0.20, 0.20, 0.32, m_rahm)             # Lagerbock
    zyl(0, cy - 0.58, zb, 0.075, 1.80, m_rahm, 12, rot=(0, math.pi / 2, 0))
    zk = zb + 0.60 * (ztop - 0.16 - zb)
    for sx in (-0.62, 0.62):                                                # Unterarm (V)
        strebe(cy - 0.58, zb, cy + 0.80, zk, 0.10, m_rahm, sx, 0.10)
    zyl(0, cy + 0.80, zk, 0.06, 1.30, m_rahm, 12, rot=(0, math.pi / 2, 0))  # Kniegelenk
    strebe(cy + 0.80, zk, cy - 0.42, ztop - 0.14, 0.085, m_rahm, 0.0, 0.085)  # Oberarm
    strebe(cy + 0.24, zk - 0.16, cy - 0.38, ztop - 0.20, 0.05, m_rahm, 0.0, 0.05)
    box(0, cy - 0.42, ztop - 0.10, 0.60, 0.18, 0.12, m_rahm)                # Wippe
    box(0, cy - 0.42, ztop - 0.03, breite, 0.22, 0.06, m_schleif)           # Schleifstueck
    box(0, cy - 0.24, ztop - 0.06, breite * 0.50, 0.16, 0.05, m_schleif)    # OK exakt ztop
    for sx in (-1, 1):                                                      # Hoerner
        box(sx * (breite / 2 - 0.02), cy - 0.34, ztop - 0.08, 0.10, 0.34, 0.05, m_schleif)


def fensterband(y0, y1, n, z, h, b, xhalb, m_glas, m_rahm, dicke=0.07):
    """Fensterreihe auf beiden Fahrzeugseiten. Glas steht knapp VOR der Wand —
    innen versetztes Glas steckt in der Seitenwand und ist unsichtbar."""
    for i in range(n):
        cy = y0 + (y1 - y0) * (i + 0.5) / n
        for sx in (-xhalb, xhalb):
            s = 1.0 if sx > 0 else -1.0
            box(sx + s * 0.012, cy, z, dicke, b + 0.14, h + 0.14, m_rahm)
            box(sx + s * 0.030, cy, z, dicke, b, h, m_glas)


def tuer(cy, xhalb, z0, hoehe, breite, m_tuer, m_glas, m_rahm):
    zc = z0 + hoehe / 2.0
    for sx in (-xhalb, xhalb):
        s = 1.0 if sx > 0 else -1.0
        box(sx + s * 0.015, cy, zc, 0.07, breite + 0.10, hoehe + 0.10, m_rahm)
        box(sx + s * 0.032, cy, zc, 0.06, breite, hoehe, m_tuer)
        box(sx + s * 0.050, cy, z0 + hoehe * 0.68, 0.05, breite * 0.80, hoehe * 0.42, m_glas)
        box(sx + s * 0.050, cy, zc, 0.05, 0.05, hoehe * 0.92, m_rahm)       # Tuerfuge


# ================================================================ 1) Gleismodul
def gleis_modul():
    """Gerades Gleis, exakt 12.000 m in x. Schotterbett zweistufig, 20 Schwellen
    im 0.60-Raster (erste bei -5.70 -> der Rhythmus laeuft ueber die Fuge weiter)."""
    neu()
    SCH  = mat("Schotter", (0.40,0.385,0.365), 0.98)
    SCH2 = mat("SchotterKrone", (0.47,0.455,0.43), 0.96)
    BET  = mat("Betonschwelle", (0.60,0.585,0.555), 0.90)
    STA  = mat("Schienenfuss", (0.34,0.31,0.28), 0.55, 0.35)
    KOPF = mat("Schienenkopf", (0.74,0.75,0.77), 0.20, 0.60)
    KLE  = mat("Kleineisen", (0.30,0.26,0.22), 0.6, 0.3)
    box(0, 0, 0.075, MOD, 5.20, 0.15, SCH)                     # Bettungssohle 0.00-0.15
    box(0, 0, 0.225, MOD, 4.20, 0.15, SCH2)                    # Krone        0.15-0.30
    n = int(round(MOD / SCHW))                                 # 20
    for i in range(n):
        px = -MOD / 2 + SCHW / 2 + i * SCHW                    # -5.70 .. +5.70
        box(px, 0, 0.360, 0.26, 2.60, 0.20, BET)               # Schwelle 0.26-0.46
        for sx in (-HS, HS):
            box(px, sx, 0.478, 0.30, 0.30, 0.036, KLE)         # Rippenplatte
    for sx in (-HS, HS):
        box(0, sx, 0.4805, MOD, 0.170, 0.041, STA)             # Fuss  0.460-0.501
        box(0, sx, 0.5555, MOD, 0.048, 0.109, STA)             # Steg  0.501-0.610
        box(0, sx, 0.6300, MOD, 0.075, 0.040, KOPF)            # Kopf  0.610-0.650
    export("th17_gleis_modul", 0.010, 2)


# ================================================================ 2) Gleisbogen
def gleis_bogen():
    """90deg-Bogen, Radius 20 m, Aufbau identisch zum geraden Modul (gleiche
    Schotterhoehen, gleiche SOK 0.650) -> stumpf anschliessbar.
    Anfang im Ursprung, Tangente +x, Ende bei (20, 20) mit Tangente +y."""
    neu()
    SCH  = mat("Schotter", (0.40,0.385,0.365), 0.98)
    SCH2 = mat("SchotterKrone", (0.47,0.455,0.43), 0.96)
    BET  = mat("Betonschwelle", (0.60,0.585,0.555), 0.90)
    STA  = mat("Schienenfuss", (0.34,0.31,0.28), 0.55, 0.35)
    KOPF = mat("Schienenkopf", (0.74,0.75,0.77), 0.20, 0.60)
    R  = 20.0
    T90 = math.pi / 2.0
    def pos(t, d):
        """Punkt im Abstand d von der Gleisachse (d>0 = kurvenaussen)."""
        return ((R + d) * math.sin(t), R - (R + d) * math.cos(t))
    # Schotter: tangentiale Segmente mit 6% Ueberlappung, sonst klaffen Schlitze
    nb = 26
    dtb = T90 / nb
    lb = 2 * R * math.sin(dtb / 2) * 1.06
    for i in range(nb):
        t = (i + 0.5) * dtb
        x, y = pos(t, 0.0)
        o = box(x, y, 0.075, lb, 5.20, 0.15, SCH);  o.rotation_euler[2] = t
        o = box(x, y, 0.225, lb, 4.20, 0.15, SCH2); o.rotation_euler[2] = t
    ns = int(round(R * T90 / SCHW))                            # 52 Schwellen
    dts = T90 / ns
    for i in range(ns):
        t = (i + 0.5) * dts
        x, y = pos(t, 0.0)
        o = box(x, y, 0.360, 0.26, 2.60, 0.20, BET); o.rotation_euler[2] = t
    lr = 2 * R * math.sin(dts / 2) * 1.08
    for d in (-HS, HS):
        for i in range(ns):
            t = (i + 0.5) * dts
            x, y = pos(t, d)
            # exakt dasselbe Schienenprofil wie im geraden Modul -> SOK 0.650
            o = box(x, y, 0.4805, lr, 0.170, 0.041, STA); o.rotation_euler[2] = t
            o = box(x, y, 0.5555, lr, 0.060, 0.109, STA); o.rotation_euler[2] = t
            o = box(x, y, 0.6300, lr, 0.075, 0.040, KOPF); o.rotation_euler[2] = t
    export("th17_gleis_bogen", 0.010, 1)


# ================================================================ 3) Bahnsteig
def bahnsteig_modul():
    """Mittelbahnsteig, exakt 12.000 m in x, 6.00 m breit, 0.760 m hoch.
    Plattenraster 1.50 m und Blindenstreifen-Rippen 0.30 m laufen ueber die Fuge
    weiter. Beide Kanten sind Gleiskanten -> Modulmitte auf y = +-4.70 zur
    Gleisachse setzen, dann steht die Kante NEBEN dem Gleis (Spalt 0.19 m)."""
    neu()
    BET = mat("Bahnsteigbeton", (0.62,0.61,0.58), 0.92)
    PLA = mat("Gehwegplatte", (0.70,0.69,0.66), 0.85)
    KAN = mat("Kantenstein", (0.50,0.49,0.47), 0.80)
    WEI = mat("Sicherheitslinie", (0.90,0.89,0.86), 0.70)
    GEL = mat("Blindenstreifen", (0.86,0.68,0.14), 0.75)
    B, T, H = MOD, 6.00, 0.760
    DK = 0.016                       # Deckschicht: Platten, Rippen und Kante enden
                                     # ALLE exakt auf H -> Bauhoehe bleibt 0.760.
    box(0, 0, (H - DK) / 2, B, T, H - DK, BET)                        # Korpus 0.000-0.744
    for ix in range(8):                                               # Plattenraster 1.50
        px = -B / 2 + 0.75 + ix * 1.50
        for iy in range(3):
            box(px, (iy - 1) * 1.50, H - DK / 2, 1.46, 1.46, DK, PLA)
    for s in (-1, 1):
        box(0, s * 2.90, H - 0.030, B, 0.20, 0.060, KAN)              # Kantenstein
        box(0, s * 2.76, H - DK / 2, B, 0.10, DK, WEI)                # Sicherheitslinie
        for i in range(40):                                           # Blindenstreifen: die
            px = -B / 2 + 0.15 + i * 0.30                             # Rippen SIND der
            box(px, s * 2.50, H - DK / 2, 0.16, 0.40, DK, GEL)        # Streifen (0.30-Raster)
        box(0, s * 2.98, 0.30, B, 0.04, 0.60, KAN)                    # Sockelblende
    box(0, 0, H - DK / 2, B, 0.24, DK, KAN)                           # Entwaesserungsrinne
    export("th17_bahnsteig_modul", 0.010, 2)


# ================================================================ 4) Bahnsteigdach
def bahnsteigdach():
    """Satteldach auf Stuetzen, exakt 12.000 m in x. Stuetzen bei x=+-3.00 ->
    ueber die Fuge hinweg konstanter 6.00-Rhythmus. Auf den Bahnsteig setzen:
    z = +0.760."""
    neu()
    STZ  = mat("Stuetze", (0.30,0.33,0.36), 0.45, 0.35)
    TRA  = mat("Traeger", (0.36,0.39,0.42), 0.45, 0.30)
    DACH = mat("Dachhaut", (0.52,0.55,0.58), 0.55, 0.25)
    UNT  = mat("Dachuntersicht", (0.78,0.77,0.73), 0.85)
    RIN  = mat("Rinne", (0.44,0.46,0.48), 0.45, 0.35)
    SHI  = mat("Stationsschild", (0.10,0.24,0.52), 0.65)
    LAM  = leucht("Deckenleuchte", (1.0,0.93,0.75), 2.2)
    ZS, ZT = 3.60, 3.78          # Stuetzenkopf / Traegeroberkante
    ZR = 4.20                    # First
    for px in (-3.0, 3.0):
        for py in (-1.15, 1.15):
            box(px, py, ZS / 2, 0.24, 0.24, ZS, STZ)                  # Stuetze
            box(px, py, 0.06, 0.52, 0.52, 0.12, STZ)                  # Fussplatte
            box(px, py, ZS - 0.30, 0.34, 0.34, 0.20, STZ)             # Kopfplatte
        box(px, 0, ZT - 0.09, 0.26, 2.60, 0.18, TRA)                  # Quertraeger
        strebe(-0.30, ZS - 0.40, -1.05, ZS - 0.02, 0.10, TRA, px, 0.14)
        strebe(0.30, ZS - 0.40, 1.05, ZS - 0.02, 0.10, TRA, px, 0.14)
    for py in (-1.15, 1.15):
        box(0, py, ZT - 0.09, MOD, 0.20, 0.18, TRA)                   # Laengstraeger
    for s in (-1, 1):                                                 # Dachhaelften
        o = box(0, s * 1.34, (ZR - 0.16) + 0.04, MOD, 2.70, 0.16, DACH)
        o.rotation_euler[0] = -s * math.radians(7.0)
        o2 = box(0, s * 1.30, (ZR - 0.16) - 0.02, MOD, 2.50, 0.06, UNT)
        o2.rotation_euler[0] = -s * math.radians(7.0)
        zyl(0, s * 2.72, ZR - 0.36, 0.085, MOD, RIN, 12, rot=(0, math.pi / 2, 0))
    box(0, 0, ZR + 0.10, MOD, 0.34, 0.12, DACH)                       # Firstkappe
    for i in range(4):                                                # Leuchten 3.00-Raster
        px = -4.5 + i * 3.0
        box(px, 0, 3.95, 0.05, 0.05, 0.42, TRA)
        box(px, 0, 3.68, 1.30, 0.28, 0.12, LAM)
    for px in (-4.5, 4.5):                                            # Stationsschilder
        for py in (-0.42, 0.42):
            box(px, py, 3.30, 0.04, 0.04, 0.72, TRA)
        box(px, 0, 2.86, 2.20, 0.09, 0.44, SHI)
    export("th17_bahnsteigdach", 0.014, 2)


# ================================================================ 5) Lokomotive
def lokomotive():
    """Moderne E-Lok, 19.00 m ueber Puffer, Fuehrerstaende an beiden Enden,
    Einarm-Stromabnehmer (Schleifstueck exakt auf 4.950 = Fahrdraht ueber SOK).
    Radunterkante z=0 -> im Spiel auf z=+0.650 setzen."""
    neu()
    KAS = mat("Lokkasten", (0.72,0.14,0.13), 0.45)
    DUN = mat("Zierstreifen", (0.16,0.17,0.20), 0.55)
    GRA = mat("Dach", (0.36,0.37,0.39), 0.60, 0.25)
    RAH = mat("Rahmen", (0.22,0.22,0.24), 0.55, 0.35)
    RAD = mat("Radreifen", (0.26,0.25,0.25), 0.55, 0.30)
    STA = mat("Stahl", (0.52,0.53,0.55), 0.35, 0.55)
    GLA = mat("Scheibe", (0.16,0.26,0.34), 0.12, 0.25)
    GIT = mat("Lueftergitter", (0.30,0.30,0.32), 0.65, 0.30)
    ISO = mat("Isolator", (0.72,0.70,0.66), 0.35)
    SCL = mat("Schleifstueck", (0.30,0.29,0.28), 0.45, 0.35)
    LMP = leucht("Spitzenlicht", (1.0,0.96,0.84), 2.6)
    RUE = leucht("Schlusslicht", (1.0,0.24,0.20), 2.2)
    LB, KB = 17.40, 2.96                 # Kastenlaenge / -breite (mit Zierleisten 3.11)
    Z0, Z1 = 1.10, 3.50                  # Kastenunterkante / -oberkante
    for cy in (-5.60, 5.60):
        drehgestell(cy, RAH, RAD, STA, 2.80, 0.575)
    box(0, 0, 0.98, 2.60, LB + 0.6, 0.30, RAH)                        # Hauptrahmen
    box(0, 0, (Z0 + Z1) / 2, KB, LB, Z1 - Z0, KAS)                    # Kasten
    box(0, 0, Z0 + 0.14, KB + 0.04, LB, 0.28, DUN)                    # unterer Streifen
    box(0, 0, Z1 - 0.16, KB + 0.04, LB, 0.22, DUN)                    # Dachrandstreifen
    for sx in (-1, 1):                                                # Lueftergitter
        for i in range(6):
            box(sx * (KB / 2 + 0.015), -4.4 + i * 1.76, 2.40, 0.06, 1.30, 1.20, GIT)
        for i in range(5):
            box(sx * (KB / 2 + 0.03), -4.4 + i * 1.76, 2.40, 0.05, 0.08, 1.20, RAH)
    for cy in (-7.10, 7.10):                                          # Fuehrerstandstueren
        tuer(cy, KB / 2, Z0 + 0.10, 1.94, 0.86, DUN, GLA, RAH)
    for cy in (-7.95, 7.95):                                          # Seitenfenster Fuehrerstand
        fensterband(cy - 0.35, cy + 0.35, 1, 3.00, 0.72, 0.66, KB / 2, GLA, RAH)
    box(0, 0, Z1 + 0.11, KB - 0.16, LB - 0.2, 0.22, GRA)              # Dach
    for cy in (-6.4, 6.4):
        box(0, cy, Z1 + 0.36, 1.90, 1.80, 0.28, GRA)                  # Klimakaesten
    box(0, 0, Z1 + 0.32, 0.14, 9.0, 0.10, STA)                        # Dachleitung
    for cy in (-3.5, 3.5):
        for sx in (-0.75, 0.75):
            zyl(sx, cy, Z1 + 0.36, 0.09, 0.28, ISO, 10)
    stromabnehmer(3.20, Z1 + 0.22, STA, ISO, SCL, PANT, 1.90)         # angehoben
    box(0, -3.60, Z1 + 0.30, 2.00, 1.40, 0.14, STA)                   # zweiter, abgelegt
    strebe(-4.20, Z1 + 0.36, -2.95, Z1 + 0.62, 0.08, STA, 0.0, 0.08)
    strebe(-2.95, Z1 + 0.62, -4.05, Z1 + 0.50, 0.07, STA, 0.0, 0.07)
    box(0, -4.10, Z1 + 0.56, 1.80, 0.16, 0.05, SCL)
    for s in (-1, 1):                                                 # Fuehrerstaende
        yf = s * (LB / 2)
        box(0, yf + s * 0.18, 1.62, KB - 0.02, 0.36, 1.04, KAS)       # Bugunterteil
        # Rahmen HINTER die Scheibe — umgekehrt deckt der massive Rahmen das Glas zu.
        o = box(0, yf + s * 0.16, 2.92, KB - 0.12, 0.10, 1.42, RAH)
        o.rotation_euler[0] = s * 0.22
        o = box(0, yf + s * 0.24, 2.92, KB - 0.30, 0.16, 1.30, GLA)   # Frontscheibe, gerakt
        o.rotation_euler[0] = s * 0.22
        box(0, yf - s * 0.10, Z1 - 0.06, KB - 0.06, 0.60, 0.24, DUN)  # Dachkante
        box(0, yf + s * 0.30, 0.86, 2.62, 0.30, 0.52, RAH)            # Bahnraeumer
        box(0, yf + s * 0.42, 0.60, 2.30, 0.16, 0.36, RAH)
        for sx in (-1.06, 1.06):                                      # Spitzenlichter
            zyl(sx, yf + s * 0.36, 1.66, 0.155, 0.14, LMP, 14, rot=(math.pi / 2, 0, 0))
            zyl(sx, yf + s * 0.32, 1.66, 0.185, 0.10, RAH, 14, rot=(math.pi / 2, 0, 0))
            zyl(sx, yf + s * 0.36, 1.30, 0.085, 0.12, RUE, 10, rot=(math.pi / 2, 0, 0))
        zyl(0, yf + s * 0.34, 2.14, 0.135, 0.14, LMP, 14, rot=(math.pi / 2, 0, 0))
        box(0, yf + s * 0.55, 0.98, 0.46, 0.52, 0.30, RAH)            # Kupplung
        for sx in (-1.05, 1.05):                                      # Puffer -> Gesamt 19.00
            zyl(sx, yf + s * 0.62, 1.06, 0.185, 0.36, STA, 14, rot=(math.pi / 2, 0, 0))
            zyl(sx, yf + s * 0.775, 1.06, 0.225, 0.05, RAH, 14, rot=(math.pi / 2, 0, 0))
    export("th17_lokomotive", 0.016, 2)


# ================================================================ 6) Personenwagen
def personenwagen():
    """Reisezugwagen, exakt 24.000 m in y -> kuppelbar mit `y += 24.0`.
    Die Wulstfaltenbaelge an beiden Enden bilden die Endflaechen bei y=+-12.000;
    Puffer liegen bewusst INNERHALB, damit nichts ueber das Raster hinausragt."""
    neu()
    KAS = mat("Wagenkasten", (0.86,0.85,0.83), 0.50)
    STR = mat("Zierstreifen", (0.72,0.14,0.13), 0.50)
    DUN = mat("Schuerze", (0.24,0.25,0.27), 0.60)
    DAC = mat("Wagendach", (0.44,0.45,0.47), 0.60, 0.25)
    RAH = mat("Rahmen", (0.22,0.22,0.24), 0.55, 0.35)
    RAD = mat("Radreifen", (0.26,0.25,0.25), 0.55, 0.30)
    STA = mat("Stahl", (0.52,0.53,0.55), 0.35, 0.55)
    GLA = mat("Fenster", (0.20,0.30,0.38), 0.12, 0.25)
    TUE = mat("Tuer", (0.30,0.31,0.34), 0.45)
    BAL = mat("Faltenbalg", (0.16,0.16,0.18), 0.85)
    LMP = leucht("Innenlicht", (1.0,0.95,0.82), 1.6)
    L, KB = 24.000, 2.90
    Z0, Z1 = 1.10, 3.55
    for cy in (-8.60, 8.60):
        drehgestell(cy, RAH, RAD, STA, 2.50, 0.575)
    box(0, 0, 0.98, 2.50, 21.6, 0.30, RAH)                            # Untergestell
    box(0, 0, (Z0 + Z1) / 2, KB, 23.00, Z1 - Z0, KAS)                 # Kasten -11.50..11.50
    box(0, 0, Z0 + 0.16, KB + 0.04, 23.00, 0.32, DUN)
    box(0, 0, 2.10, KB + 0.05, 23.00, 0.14, STR)                      # Zierstreifen
    box(0, 0, 3.34, KB + 0.05, 23.00, 0.10, STR)
    tonne_y(0, 0, Z1, KB / 2, 23.00, DAC, 22, 0.33)                   # Dachtonne
    for cy in (-9.55, 9.55):                                          # Tueren
        tuer(cy, KB / 2, Z0 + 0.02, 2.02, 1.26, TUE, GLA, RAH)
        box(0, cy, Z0 - 0.16, 2.10, 1.30, 0.14, RAH)                  # Trittstufe
    fensterband(-8.30, 8.30, 10, 2.82, 1.02, 1.16, KB / 2, GLA, RAH)
    for i in range(10):                                               # Innenlicht-Andeutung
        cy = -8.30 + 16.60 * (i + 0.5) / 10
        for sx in (-1, 1):
            box(sx * (KB / 2 - 0.02), cy, 2.82, 0.05, 1.10, 0.96, LMP)
    for sx in (-1, 1):                                                # Unterflurkaesten
        box(sx * 1.16, -3.6, 0.86, 0.44, 3.20, 0.72, DUN)
        box(sx * 1.16, 3.6, 0.86, 0.44, 3.20, 0.72, DUN)
        zyl(sx * 0.70, 0.0, 0.80, 0.28, 3.40, STA, 14, rot=(math.pi / 2, 0, 0))
    for i in range(6):                                                # Dachluefter
        box(0, -7.0 + i * 2.8, 3.94, 0.70, 0.60, 0.10, DAC)
    for s in (-1, 1):                                                 # Uebergaenge — die
        ye = s * 11.50                                                # Endflaeche liegt exakt
        box(0, ye + s * 0.15, 2.30, 2.36, 0.30, 2.30, DUN)            # auf +-12.000, damit
        for k in range(2):                                            # `y += 24.0` fugenlos
            box(0, ye + s * (0.36 + k * 0.07), 2.30, 2.26 - k * 0.06, 0.06,
                2.24 - k * 0.06, BAL)                                 # Faltenbalg-Rippen
        box(0, ye + s * 0.475, 2.30, 2.06, 0.05, 2.06, BAL)           # Endflaeche y=+-12.000
        box(0, ye - s * 0.30, 0.98, 0.44, 0.50, 0.30, RAH)            # Kupplung
        for sx in (-1.05, 1.05):
            zyl(sx, ye - s * 0.16, 1.06, 0.18, 0.34, STA, 14, rot=(math.pi / 2, 0, 0))
    export("th17_personenwagen", 0.016, 2)


# ================================================================ 7) Tram
def tram():
    """Dreiteilige Gelenk-Strassenbahn, 28.00 m: 9.60 + Balg 0.40 + 8.00 +
    Balg 0.40 + 9.60. Front auf +y, Stromabnehmer auf 4.950 ueber Radunterkante."""
    neu()
    KAS = mat("Tramkasten", (0.88,0.87,0.85), 0.48)
    STR = mat("Zierband", (0.10,0.42,0.30), 0.50)
    DUN = mat("Schuerze", (0.24,0.26,0.28), 0.60)
    DAC = mat("Tramdach", (0.46,0.47,0.49), 0.60, 0.25)
    RAH = mat("Rahmen", (0.22,0.22,0.24), 0.55, 0.35)
    RAD = mat("Radreifen", (0.26,0.25,0.25), 0.55, 0.30)
    STA = mat("Stahl", (0.52,0.53,0.55), 0.35, 0.55)
    GLA = mat("Scheibe", (0.18,0.28,0.36), 0.12, 0.25)
    TUE = mat("Tuer", (0.16,0.34,0.28), 0.45)
    BAL = mat("Faltenbalg", (0.15,0.15,0.17), 0.88)
    ISO = mat("Isolator", (0.72,0.70,0.66), 0.35)
    SCL = mat("Schleifstueck", (0.30,0.29,0.28), 0.45, 0.35)
    LMP = leucht("Scheinwerfer", (1.0,0.96,0.86), 2.6)
    RUE = leucht("Schlusslicht", (1.0,0.26,0.20), 2.2)
    ANZ = leucht("Zielanzeige", (1.0,0.72,0.16), 2.0)
    KB, RR = 2.40, 0.330
    Z0, Z1 = 0.72, 3.30                    # Wagenboden / Dachansatz
    SEK = ((9.20, 4.40, 14.00), (0.00, -4.00, 4.00), (-9.20, -14.00, -4.40))
    for cy in (10.00, 0.00, -10.00):       # Drehgestelle (kleine Trambraeder)
        drehgestell(cy, RAH, RAD, STA, 1.80, RR, 0.115)
    for (cy, y0, y1) in SEK:
        ln = y1 - y0
        box(0, cy, (Z0 + Z1) / 2, KB, ln, Z1 - Z0, KAS)               # Kasten
        box(0, cy, Z0 - 0.14, KB - 0.06, ln - 0.10, 0.28, DUN)        # Untergurt
        box(0, cy, 1.12, KB + 0.04, ln, 0.14, STR)                    # Zierband
        box(0, cy, 3.16, KB + 0.04, ln, 0.12, STR)
        tonne_y(0, cy, Z1, KB / 2, ln, DAC, 20, 0.26)                 # Dach
    for (cy, y0, y1) in SEK:                                          # Schuerzen nur zwischen
        for (a, b) in ((y0 + 0.4, cy - 1.6), (cy + 1.6, y1 - 0.4)):   # den Drehgestellen ->
            if b - a > 0.6:                                           # Raeder bleiben sichtbar
                box(0, (a + b) / 2, 0.52, KB - 0.10, b - a, 0.40, DUN)
    for cy in (7.00, 2.00, -2.00, -7.00, 11.60, -11.60):              # Tueren beidseitig
        tuer(cy, KB / 2, Z0 + 0.02, 2.02, 1.30, TUE, GLA, RAH)
        box(0, cy, Z0 - 0.20, 2.46, 1.34, 0.12, DUN)
    fensterband(4.90, 6.30, 1, 2.30, 1.06, 1.20, KB / 2, GLA, RAH)
    fensterband(7.80, 11.00, 2, 2.30, 1.06, 1.36, KB / 2, GLA, RAH)
    fensterband(12.30, 13.40, 1, 2.30, 1.06, 0.96, KB / 2, GLA, RAH)
    fensterband(-1.20, 1.20, 1, 2.30, 1.06, 2.00, KB / 2, GLA, RAH)
    fensterband(2.80, 3.80, 1, 2.30, 1.06, 0.90, KB / 2, GLA, RAH)
    fensterband(-3.80, -2.80, 1, 2.30, 1.06, 0.90, KB / 2, GLA, RAH)
    fensterband(-6.30, -4.90, 1, 2.30, 1.06, 1.20, KB / 2, GLA, RAH)
    fensterband(-11.00, -7.80, 2, 2.30, 1.06, 1.36, KB / 2, GLA, RAH)
    fensterband(-13.40, -12.30, 1, 2.30, 1.06, 0.96, KB / 2, GLA, RAH)
    for s in (-1, 1):                                                 # Gelenke
        yg = s * 4.20
        box(0, yg, (Z0 + Z1) / 2 + 0.05, KB - 0.30, 0.44, Z1 - Z0 - 0.30, BAL)
        for k in range(3):
            box(0, yg - 0.16 + k * 0.16, (Z0 + Z1) / 2 + 0.05, KB - 0.22, 0.06,
                Z1 - Z0 - 0.22, BAL)
        box(0, yg, Z0 - 0.10, 1.40, 0.50, 0.30, RAH)
    stromabnehmer(0.60, Z1 + 0.34, STA, ISO, SCL, PANT, 1.70)
    for sx in (-0.80, 0.80):                                          # Dachaufbauten
        box(sx, 8.20, Z1 + 0.42, 0.70, 3.20, 0.26, DAC)
        box(sx, -8.20, Z1 + 0.42, 0.70, 3.20, 0.26, DAC)
    for s in (-1, 1):                                                 # Bug / Heck
        yf = s * 14.00
        # Rahmen HINTER die Scheibe; alle Bugteile bleiben innerhalb +-14.000.
        o = box(0, yf - s * 0.30, 2.44, KB - 0.06, 0.10, 1.56, RAH)
        o.rotation_euler[0] = s * 0.20
        o = box(0, yf - s * 0.23, 2.44, KB - 0.20, 0.16, 1.44, GLA)   # Frontscheibe
        o.rotation_euler[0] = s * 0.20
        box(0, yf - s * 0.11, 1.36, KB - 0.04, 0.22, 0.72, KAS)       # Bugblende
        box(0, yf - s * 0.10, 0.86, KB - 0.12, 0.20, 0.34, DUN)
        box(0, yf - s * 0.28, 3.30, KB - 0.30, 0.34, 0.34, ANZ)       # Zielanzeige
        for sx in (-0.86, 0.86):
            box(sx, yf - s * 0.08, 1.62, 0.36, 0.16, 0.20, LMP if s > 0 else RUE)
            box(sx, yf - s * 0.08, 1.32, 0.30, 0.16, 0.14, RUE)
        box(0, yf - s * 0.08, 0.40, KB - 0.30, 0.16, 0.30, DUN)       # Bahnraeumer
    export("th17_tram", 0.016, 2)


# ================================================================ 8) Tramhaltestelle
def tramhaltestelle():
    """Haltestelleninsel 18 x 3.6 m, 0.24 m hoch, mit Kantenstein und
    Blindenstreifen auf beiden Seiten, verglastem Wartehaeuschen (offen nach +y),
    Fahrplanvitrine, Haltestellenmast und Baenken."""
    neu()
    BET = mat("Inselbeton", (0.63,0.62,0.59), 0.92)
    PLA = mat("Platte", (0.71,0.70,0.67), 0.85)
    KAN = mat("Kantenstein", (0.50,0.49,0.47), 0.80)
    GEL = mat("Blindenstreifen", (0.86,0.68,0.14), 0.75)
    STZ = mat("Stuetze", (0.28,0.31,0.34), 0.45, 0.35)
    GLA = mat("Glas", (0.62,0.74,0.80), 0.10, 0.20)
    DAC = mat("Dach", (0.40,0.43,0.46), 0.55, 0.30)
    HOL = mat("Sitzholz", (0.46,0.31,0.18), 0.70)
    ROT = mat("Signalrot", (0.74,0.16,0.14), 0.55)
    VIT = leucht("Fahrplanlicht", (0.96,0.95,0.88), 1.8)
    LED = leucht("Haltestellenlicht", (1.0,0.94,0.78), 2.0)
    SCH = mat("Schild", (0.94,0.80,0.10), 0.55)
    B, T, FB = 18.00, 3.60, 0.240
    box(0, 0, FB / 2, B, T, FB, BET)                                  # Insel
    for ix in range(12):
        for iy in range(2):
            box(-B / 2 + 0.75 + ix * 1.50, (iy - 0.5) * 1.50, FB - 0.012, 1.44, 1.44, 0.030, PLA)
    for s in (-1, 1):
        box(0, s * 1.72, FB - 0.028, B, 0.16, 0.062, KAN)             # Kante
        box(0, s * 1.44, FB - 0.010, B, 0.34, 0.030, GEL)             # Blindenstreifen
        for i in range(60):
            box(-B / 2 + 0.15 + i * 0.30, s * 1.44, FB + 0.014, 0.15, 0.30, 0.016, GEL)
    # ---- Wartehaeuschen (offen nach +y)
    HX, HL, HT, HH = -3.40, 5.20, 2.20, 2.55
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(HX + sx * (HL / 2 - 0.09), sy * (HT / 2 - 0.09), FB + HH / 2,
                0.14, 0.14, HH, STZ)
    box(HX, -HT / 2 + 0.10, FB + HH / 2, HL - 0.30, 0.06, HH - 0.24, GLA)   # Rueckwand
    for sx in (-1, 1):                                                # Seitenwaende
        box(HX + sx * (HL / 2 - 0.10), 0, FB + HH / 2, 0.06, HT - 0.34, HH - 0.24, GLA)
    box(HX, -HT / 2 + 0.10, FB + 0.10, HL - 0.30, 0.10, 0.20, STZ)
    box(HX, 0, FB + HH + 0.09, HL + 0.40, HT + 0.40, 0.18, DAC)       # Dach
    box(HX, 0, FB + HH - 0.05, HL, HT, 0.10, STZ)
    box(HX, 0, FB + HH - 0.16, HL - 0.90, 0.30, 0.10, LED)            # Deckenlicht
    box(HX, -HT / 2 + 0.34, FB + 0.44, HL - 1.20, 0.42, 0.08, HOL)    # Bank
    box(HX, -HT / 2 + 0.18, FB + 0.72, HL - 1.20, 0.08, 0.46, HOL)
    for sx in (-1, 0, 1):
        box(HX + sx * (HL - 1.5) / 2, -HT / 2 + 0.34, FB + 0.20, 0.10, 0.40, 0.40, STZ)
    box(HX + HL / 2 - 0.35, HT / 2 - 0.45, FB + 0.44, 0.44, 0.44, 0.88, STZ)  # Abfalleimer
    box(HX + HL / 2 - 0.35, HT / 2 - 0.45, FB + 0.92, 0.52, 0.52, 0.08, DAC)
    # ---- Fahrplanvitrine
    VX = 1.60
    for sx in (-0.55, 0.55):
        box(VX + sx, -0.20, FB + 1.05, 0.10, 0.10, 2.10, STZ)
    box(VX, -0.20, FB + 1.62, 1.34, 0.16, 1.16, STZ)
    box(VX, -0.12, FB + 1.62, 1.20, 0.06, 1.02, VIT)
    box(VX, -0.10, FB + 2.12, 1.34, 0.20, 0.16, ROT)
    # ---- Haltestellenmast mit Schild
    MX = 5.60
    zyl(MX, 0, FB + 1.70, 0.075, 3.40, STZ, 12)
    zyl(MX, 0.10, FB + 3.05, 0.46, 0.09, SCH, 20, rot=(math.pi / 2, 0, 0))
    zyl(MX, 0.16, FB + 3.05, 0.34, 0.05, ROT, 20, rot=(math.pi / 2, 0, 0))
    box(MX, 0.20, FB + 3.05, 0.44, 0.04, 0.12, SCH)
    box(MX, 0, FB + 2.20, 0.86, 0.10, 0.30, LED)
    # ---- Baenke auf der Insel
    for bx in (7.20, -7.60):
        box(bx, -0.30, FB + 0.44, 1.80, 0.44, 0.08, HOL)
        box(bx, -0.52, FB + 0.72, 1.80, 0.08, 0.46, HOL)
        for sx in (-0.70, 0.70):
            box(bx + sx, -0.30, FB + 0.20, 0.10, 0.42, 0.40, STZ)
    export("th17_tramhaltestelle", 0.016, 2)


# ================================================================ 9) Oberleitungsmast
def oberleitungsmast():
    """Mast 8.00 m mit Ausleger nach +y und 12.00 m Fahrdraht-Abschnitt in x
    (gleiches Raster wie th17_gleis_modul, Haenger im 3.00-Raster).
    Fahrdraht auf z=5.600 = 4.950 ueber SOK -> genau Stromabnehmer-Hoehe.
    Der Mast steht bei y=0, der Draht liegt bei y=+3.00: Mast also 3.00 m
    seitlich der Gleisachse setzen."""
    neu()
    BET = mat("Fundament", (0.60,0.59,0.56), 0.92)
    MAS = mat("Mast", (0.38,0.42,0.44), 0.45, 0.40)
    STA = mat("Stahl", (0.50,0.52,0.54), 0.35, 0.55)
    ISO = mat("Isolator", (0.74,0.72,0.68), 0.35)
    DRA = mat("Fahrdraht", (0.60,0.44,0.24), 0.35, 0.55)
    SEI = mat("Tragseil", (0.44,0.44,0.46), 0.45, 0.45)
    WRN = mat("Warnschild", (0.86,0.72,0.12), 0.60)
    HM = 8.00
    YD = 3.00                                   # Draht-Achse
    box(0, 0, 0.14, 1.10, 1.10, 0.28, BET)                            # Fundament
    kegel(0, 0, 0.28 + (HM - 0.28) / 2, 0.21, 0.115, HM - 0.28, MAS, 8)   # Mast, konisch
    for zz in (2.2, 4.4, 6.0):                                        # Ringe
        zyl(0, 0, zz, 0.20, 0.07, STA, 8)
    box(0, 0, HM - 0.04, 0.26, 0.26, 0.10, STA)                       # Mastkappe
    ZA = 6.60
    zyl(0, YD / 2 + 0.10, ZA, 0.07, YD - 0.10, STA, 10, rot=(math.pi / 2, 0, 0))  # Ausleger
    strebe(0.16, 7.42, YD - 0.05, ZA + 0.06, 0.075, STA, 0.0, 0.075)  # Schraegstrebe
    for yy in (0.95, 2.35):                                           # Isolatoren am Ausleger
        zyl(0, yy, ZA + 0.20, 0.085, 0.28, ISO, 10)
        for k in range(3):
            zyl(0, yy, ZA + 0.10 + k * 0.10, 0.135, 0.035, ISO, 10)
    box(0, YD, ZA - 0.14, 0.09, 0.30, 0.20, STA)                      # Tragseilklemme
    box(0, YD, 6.42, MOD, 0.05, 0.05, SEI)                            # Tragseil
    box(0, YD, FD, MOD, 0.055, 0.065, DRA)                            # Fahrdraht (OK 5.6325)
    for i in range(4):                                                # Haenger im 3.00-Raster
        px = -4.5 + i * 3.0
        box(px, YD, (FD + 6.42) / 2, 0.035, 0.035, 6.42 - FD, SEI)
    box(0, 2.55, 6.10, 0.05, 0.05, 1.00, STA)                         # Seitenhalter-Abhang
    zyl(0, 2.78, 5.66, 0.045, 0.50, STA, 8, rot=(math.pi / 2, 0, 0))
    zyl(0, 2.52, 5.66, 0.075, 0.22, ISO, 10, rot=(math.pi / 2, 0, 0))
    box(0, 0.14, 2.60, 0.34, 0.05, 0.44, WRN)                         # Warnschild
    box(0, 0.13, 1.40, 0.24, 0.04, 0.32, WRN)
    export("th17_oberleitungsmast", 0.012, 2)


# ================================================================ 10) Signal
def signal():
    """Lichtsignal: Mast, Signalschirm mit drei emissiven Lichtern (rot/gelb/gruen),
    Sonnenblenden, Mastschild und Kabelkasten. Signalseite auf +y."""
    neu()
    BET = mat("Fundament", (0.60,0.59,0.56), 0.92)
    MAS = mat("Mast", (0.36,0.38,0.40), 0.45, 0.40)
    SCH = mat("Signalschirm", (0.14,0.14,0.15), 0.70)
    RAN = mat("Schirmrand", (0.90,0.89,0.86), 0.65)
    STA = mat("Stahl", (0.50,0.52,0.54), 0.35, 0.55)
    KAB = mat("Kabelkasten", (0.34,0.36,0.34), 0.75)
    WEI = mat("Mastschild", (0.92,0.91,0.88), 0.60)
    ROT = leucht("Rot", (1.0,0.16,0.12), 3.0)
    GEL = leucht("Gelb", (1.0,0.74,0.10), 2.6)
    GRU = leucht("Gruen", (0.20,1.0,0.42), 2.8)
    box(0, 0, 0.15, 0.92, 0.92, 0.30, BET)                            # Fundament
    zyl(0, 0, 2.25, 0.10, 3.90, MAS, 12)                              # Mast 0.30-4.20
    for zz in (1.30, 2.60):
        zyl(0, 0, zz, 0.125, 0.08, STA, 12)
    box(0, -0.02, 4.86, 0.72, 0.42, 1.90, SCH)                        # Signalschirm 3.91-5.81
    box(0, 0.20, 4.86, 0.86, 0.06, 2.02, SCH)                         # Rueckblende
    box(0, 0.23, 4.86, 0.78, 0.04, 1.94, RAN)
    for (zz, m) in ((5.42, ROT), (4.86, GEL), (4.30, GRU)):
        zyl(0, -0.235, zz, 0.145, 0.10, m, 16, rot=(math.pi / 2, 0, 0))    # Licht
        zyl(0, -0.20, zz, 0.185, 0.09, SCH, 16, rot=(math.pi / 2, 0, 0))   # Fassung
        o = box(0, -0.36, zz + 0.20, 0.42, 0.30, 0.05, SCH)                # Sonnenblende
        o.rotation_euler[0] = -0.30
    box(0, -0.16, 5.86, 0.80, 0.34, 0.10, SCH)                        # Deckel
    box(0, -0.13, 3.20, 0.30, 0.05, 0.66, WEI)                        # Mastschild
    box(0, 0.30, 1.00, 0.42, 0.34, 1.30, KAB)                         # Kabelkasten
    box(0, 0.30, 1.68, 0.48, 0.40, 0.08, MAS)
    for zz in (0.60, 1.30):
        box(0, 0.13, zz, 0.24, 0.06, 0.10, STA)
    export("th17_signal", 0.014, 2)


# ================================================================ 11) Tunnelportal
def tunnelportal():
    """Portal mit echtem Rundbogen (lichte Weite 8.60 m, Scheitel 8.30 m) und
    10.4 m tiefer, befahrbarer Roehre. Der Bogen entsteht aus Saeulen, deren
    Unterkante der Leibung folgt (Fallstrick: eine Spalte darf NIE in die
    Oeffnung ragen -> massgebend ist ihr zur Mitte NAECHSTER Rand)."""
    neu()
    MAU = mat("Portalmauer", (0.55,0.52,0.47), 0.92)
    QUA = mat("Quaderstein", (0.62,0.59,0.53), 0.88)
    GES = mat("Gesims", (0.66,0.63,0.57), 0.85)
    ROE = mat("Roehreninnen", (0.40,0.39,0.37), 0.95)
    BOD = mat("Tunnelboden", (0.34,0.33,0.32), 0.97)
    TAF = mat("Jahrestafel", (0.72,0.70,0.64), 0.80)
    LED = leucht("Tunnelleuchte", (1.0,0.90,0.66), 2.2)
    R, KS = 4.30, 4.00               # lichter Radius / Kaempferhoehe
    BW, HW, TD = 15.00, 10.40, 1.60  # Portalbreite / -hoehe / Wanddicke
    YV = 5.20                        # Mitte Portalwand (4.40 .. 6.00)
    YR0, YR1 = -6.00, 4.40           # Roehre
    YC, YL = (YR0 + YR1) / 2, YR1 - YR0
    # ---- Widerlager bis Kaempferhoehe
    for s in (-1, 1):
        b = BW / 2 - R
        box(s * (R + b / 2), YV, KS / 2, b, TD, KS, MAU)
    # ---- Bogenzwickel als Saeulen
    n = 44
    w = BW / n
    for i in range(n):
        xa = -BW / 2 + i * w; xb = xa + w
        xn = 0.0 if xa * xb < 0 else min(abs(xa), abs(xb))
        zu = KS + (math.sqrt(R * R - xn * xn) if xn < R else 0.0)
        h = HW - zu
        if h > 0.02:
            box((xa + xb) / 2, YV, zu + h / 2, w * 1.02, TD, h,
                QUA if i % 2 == 0 else MAU)
    # ---- Archivolte (Bogenring) vor der Portalflaeche
    nv = 15
    RM = R + 0.42
    for i in range(nv):
        a = math.pi * (i + 0.5) / nv
        o = box(RM * math.cos(a), 6.22, KS + RM * math.sin(a),
                0.84, 0.48, 2 * RM * math.tan(math.pi / (2 * nv)) * 1.10,
                QUA if i % 2 == 0 else GES)
        o.rotation_euler[1] = -a
    box(0, 6.26, KS + R + 0.90, 1.00, 0.56, 1.50, GES)                # Schlussstein
    for s in (-1, 1):                                                 # Kaempfergesims
        box(s * (R + 0.9), 6.16, KS - 0.02, 2.0, 0.40, 0.34, GES)
    box(0, YV, HW + 0.28, BW + 0.80, TD + 0.60, 0.56, GES)            # Kranzgesims
    box(0, YV, HW + 0.66, BW - 0.60, TD + 0.20, 0.28, MAU)
    box(0, 6.18, KS + R + 2.05, 1.90, 0.30, 0.70, TAF)                # Jahrestafel
    # ---- Fluegelmauern
    for s in (-1, 1):
        o = box(s * (BW / 2 + 1.30), 5.10, 1.85, 3.60, 0.80, 3.70, MAU)
        o.rotation_euler[2] = -s * math.radians(26)
        o = box(s * (BW / 2 + 1.30), 5.10, 3.86, 3.70, 1.00, 0.32, GES)
        o.rotation_euler[2] = -s * math.radians(26)
    # ---- Roehre
    for s in (-1, 1):
        box(s * (R + 0.35), YC, KS / 2, 0.70, YL, KS, ROE)            # Widerlagerwand
    ng = 15
    RG = R + 0.35
    for i in range(ng):
        a = math.pi * (i + 0.5) / ng
        o = box(RG * math.cos(a), YC, KS + RG * math.sin(a),
                0.70, YL, 2 * RG * math.tan(math.pi / (2 * ng)) * 1.10, ROE)
        o.rotation_euler[1] = -a
    box(0, YC, 0.06, 2 * R, YL, 0.12, BOD)                            # Roehrenboden
    for i in range(3):                                                # Tunnelleuchten
        box(0, YR0 + 1.6 + i * 3.4, KS + R - 0.30, 0.50, 1.20, 0.12, LED)
    export("th17_tunnelportal", 0.016, 2)


if __name__ == "__main__":
    print("Asset-Charge th17 (Schiene & Tram):")
    for fn in (gleis_modul, gleis_bogen, bahnsteig_modul, bahnsteigdach,
               lokomotive, personenwagen, tram, tramhaltestelle,
               oberleitungsmast, signal, tunnelportal):
        fn()
    print("fertig")
