# -*- coding: utf-8 -*-
"""Asset-Charge 5 (th9_*): GROSSE Landmarken fuer die Riesenstadt.
Alles deutlich groesser als die bisherigen Chargen — Bauten, die eine Skyline praegen.

Konventionen (identisch zu th5/th6/th7/th8):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * Schauseite (Portal/Front) liegt in three.js bei -z.
    ACHTUNG: der glTF-Export dreht die Achsen, Blender +y -> three.js -z.
    Deshalb wird hier bequem mit der Front auf Blender -y gebaut und `export()`
    dreht das Modell zum Schluss um 180 Grad. Ausnahme: `museum` ist bereits
    auf +y gebaut und laeuft mit drehen=False.
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

def mat(name, rgb, rough=0.7, metal=0.0, emit=None, estr=1.4):
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
    # size=1 liefert bereits Kantenlaenge 1 -> Skalierung = gewuenschte Masse (NICHT /2)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    o = bpy.context.active_object; o.scale = (sx, sy, sz)
    if m: o.data.materials.append(m)
    return o

def zyl(x, y, z, r, h, m=None, seg=16, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kugel(x, y, z, r, m=None, seg=20):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=seg, ring_count=max(8,seg//2))
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kegel(x, y, z, r1, r2, h, m=None, seg=12, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def rad(x, y, z, r, breite, m=None, seg=16):
    """Fahrzeugrad. Achse MUSS in x liegen (Fahrzeuglaenge = y).
    rot=(pi/2,0,0) legt die Achse auf -y = Laengsachse -> Rad steht quer. Falsch!"""
    return zyl(x, y, z, r, breite, m, seg, rot=(0, math.pi/2, 0))

def halbkugel(x, y, z, r, m=None, seg=22, flach=0.62):
    """Echte Kuppel: UV-Kugel, untere Haelfte WEGGESCHNITTEN und Loch geschlossen.
    Basis liegt exakt bei z -> laesst sich buendig auf einen Tambour setzen.
    (Nur zu skalieren reicht NICHT: die untere Haelfte steckt sonst im Gebaeude.)"""
    o = kugel(x, y, z, r, m, seg)
    o.scale[2] = flach
    nur(o)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    bm.to_mesh(o.data); bm.free(); o.data.update()
    return o

def giebel(cx, cy, cz, halbb, hoehe, tiefe, m=None):
    """Dreiecksgiebel als echtes Prisma (Basis bei cz, Spitze cz+hoehe, Tiefe in y).
    Ein `kegel(vertices=3)` ist KEIN Giebel — daraus wird eine Pyramide."""
    t = tiefe / 2.0
    v = [(-halbb,-t,0), (halbb,-t,0), (0,-t,hoehe), (-halbb,t,0), (halbb,t,0), (0,t,hoehe)]
    f = [(0,1,2), (5,4,3), (0,3,4,1), (1,4,5,2), (2,5,3,0)]
    me = bpy.data.meshes.new("Giebel"); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new("Giebel", me); bpy.context.collection.objects.link(o)
    o.location = (cx, cy, cz)
    if m: o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o
    return o

def dreh180():
    """Ganzes Modell um die Welt-Z-Achse drehen: Front von -y nach +y (= three.js -z)."""
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': continue
        nur(o)
        o.rotation_euler[2] += math.pi
        o.location = (-o.location[0], -o.location[1], o.location[2])
        # Rotation UND Skalierung zusammen anwenden — bei nicht-uniformer Skalierung
        # wuerde ein reines rotation-apply die Box scheren.
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

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

def export(name, bevel=0.02, seg=2, drehen=True):
    if drehen: dreh180()
    runden(bevel, seg)
    for o in bpy.context.scene.objects: o.select_set(True)
    p1 = os.path.join(OUT_GLB, name + ".glb")
    # export_apply=True ist PFLICHT — sonst landet der Bevel NICHT im GLB.
    bpy.ops.export_scene.gltf(filepath=p1, export_format='GLB', use_selection=False, export_apply=True)
    p2 = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p2)
    except Exception: bpy.ops.export_mesh.stl(filepath=p2)
    print("  ->", name, os.path.getsize(p1), "B")

def fensterraster(cx, cy, b, t, z0, etagen, eh, m_glas, m_band, seiten=4):
    """Umlaufende Fensterbaender. Glas liegt knapp VOR der Wandflaeche (sonst steckt es
    komplett in der Fassade und ist unsichtbar), die Geschossbaender stehen weiter vor
    -> echte Tiefe statt aufgeklebter Streifen."""
    for e in range(etagen):
        z = z0 + e*eh + eh*0.55
        box(cx, cy - t/2 - 0.02, z, b*0.86, 0.12, eh*0.42, m_glas)
        box(cx, cy + t/2 + 0.02, z, b*0.86, 0.12, eh*0.42, m_glas)
        if seiten == 4:
            box(cx - b/2 - 0.02, cy, z, 0.12, t*0.86, eh*0.42, m_glas)
            box(cx + b/2 + 0.02, cy, z, 0.12, t*0.86, eh*0.42, m_glas)
        box(cx, cy, z0 + e*eh + eh*0.02, b+0.34, t+0.34, 0.20, m_band)   # Geschossband
        box(cx, cy, z0 + e*eh + eh*0.96, b+0.24, t+0.24, 0.14, m_band)   # Sturz

# ============================================================ 1) Wolkenkratzer
def wolkenkratzer():
    """52 m hoch, abgestuft — praegt die Skyline. Mit Erdgeschoss-Portal."""
    neu()
    W   = mat("TurmWand", (0.74,0.76,0.78), 0.5)
    G   = mat("TurmGlas", (0.18,0.34,0.48), 0.10, 0.35)
    B   = mat("Band", (0.30,0.33,0.38), 0.35, 0.6)
    SOK = mat("Sockel", (0.42,0.40,0.38), 0.85)
    AKZ = mat("Krone", (0.14,0.52,0.55), 0.4, 0.4)
    EG  = mat("Portalglas", (0.10,0.20,0.30), 0.08, 0.4)
    box(0,0,1.2, 20.0,20.0,2.4, SOK)                       # Plaza-Sockel
    box(0,0,2.9, 16.0,16.0,1.0, SOK)
    box(0,0,12.4, 14.0,14.0,18.0, W)                       # Basis
    fensterraster(0,0, 14.0,14.0, 3.4, 6, 3.0, G, B)
    box(0,0,29.4, 11.0,11.0,16.0, W)                       # Mittelteil
    fensterraster(0,0, 11.0,11.0, 21.4, 5, 3.2, G, B)
    box(0,0,41.0, 7.6,7.6,7.2, W)                          # Spitze
    fensterraster(0,0, 7.6,7.6, 37.4, 2, 3.2, G, B, 4)
    box(0,0,44.9, 8.4,8.4,0.7, AKZ)                        # Krone
    zyl(0,0,48.5, 0.22, 6.5, B, 10)                        # Mast
    kugel(0,0,52.2, 0.42, mat("Signal",(0.9,0.2,0.15),0.4,0.0,(0.9,0.2,0.15),3.0), 12)
    # Erdgeschoss: Lobby-Portal statt nackter Sockelplatte
    box(0,-6.94, 5.0, 8.4, 0.30, 3.2, EG)                  # Glasfront
    box(0,-7.10, 5.0, 1.6, 0.22, 2.8, AKZ)                 # Drehtuer-Rahmen
    box(0,-7.70, 6.95, 10.0, 2.0, 0.34, B)                 # Vordach
    for sx in (-4.4, 4.4): zyl(sx,-8.40, 4.65, 0.22, 4.5, B, 10)   # steht auf der Plaza
    for i in range(4):                                      # Freitreppe (ausserhalb des Sockels)
        box(0, -10.35-i*0.70, 2.10-i*0.60, 11.0, 0.70, 0.60, SOK)
    export("th9_wolkenkratzer", 0.024, 2)

# ============================================================ 2) Stadion
def stadion():
    """Ovale Arena mit Rang, Flutlicht, Spielfeld. Tribuene offen genug, dass man reinsieht."""
    neu()
    BET  = mat("Beton", (0.68,0.67,0.64), 0.85)
    SOK  = mat("StadionSockel", (0.40,0.39,0.37), 0.9)
    AKZ  = mat("StadionBand", (0.72,0.22,0.18), 0.55)
    RANG = mat("Rang", (0.22,0.36,0.60), 0.7)
    RASEN= mat("Rasen", (0.16,0.44,0.16), 0.9)
    MAST = mat("Mast", (0.42,0.44,0.47), 0.4, 0.5)
    LICHT= mat("Flutlicht", (0.98,0.96,0.86), 0.2, 0.0, (0.98,0.96,0.86), 2.4)
    GLAS = mat("Tor", (0.24,0.34,0.42), 0.15)
    A, Bh = 26.0, 20.0
    n = 28
    for i in range(n):
        t = i/n*math.tau
        bx, by = math.cos(t)*A, math.sin(t)*Bh
        # Tangente einer ELLIPSE, nicht eines Kreises — sonst klaffen Schlitze.
        phi = math.atan2(Bh*math.cos(t), -A*math.sin(t))
        tor = (i % 7 == 3)
        o = box(bx, by, 4.0, 6.0, 3.0, 8.0, GLAS if tor else BET)
        o.rotation_euler[2] = phi
        o = box(bx, by, 8.45, 6.2, 3.4, 0.9, AKZ)              # farbiges Traufband
        o.rotation_euler[2] = phi
        o = box(bx, by, 0.45, 6.2, 3.4, 0.9, SOK)              # dunkles Sockelband
        o.rotation_euler[2] = phi
    for i in range(n):                                          # Innenrang (schraeg)
        t = i/n*math.tau
        bx, by = math.cos(t)*21.0, math.sin(t)*15.5
        o = box(bx, by, 4.6, 5.4, 6.5, 0.9, RANG)
        o.rotation_euler[2] = math.atan2(15.5*math.cos(t), -21.0*math.sin(t))
        o.rotation_euler[0] = -0.42
    bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=0.3, location=(0,0,0.16), vertices=40)
    fld = bpy.context.active_object; fld.scale=(17.0,11.5,1); fld.data.materials.append(RASEN)
    LIN = mat("Linien",(0.88,0.92,0.88),0.9)
    for k in range(36):                                         # Mittelkreis als Ring (der
        a = k/36*math.tau                                       # Rasen darf NICHT zugedeckt
        o = box(math.cos(a)*4.6, math.sin(a)*4.6, 0.32, 0.85, 0.16, 0.06, LIN)  # werden)
        o.rotation_euler[2] = a + math.pi/2
    box(0, 0, 0.32, 0.16, 22.6, 0.06, LIN)                      # Mittellinie
    for i in range(4):                                          # Flutlichtmasten AUSSERHALB
        al = math.pi/4 + i*math.pi/2
        ux, uy = math.cos(al), math.sin(al)
        mx, my = ux*33.0, uy*27.0
        kegel(mx,my,1.6, 1.5, 0.85, 3.2, SOK, 10)               # Betonfuss
        zyl(mx,my,12.0, 0.62, 22.0, MAST, 12)
        head = box(mx,my,23.4, 5.0,1.4,2.4, MAST)
        head.rotation_euler[2] = al + math.pi/2                  # Breite tangential
        tx, ty = -uy, ux
        for k in range(3):
            d = (k-1)*1.5
            lp = box(mx + tx*d - ux*0.78, my + ty*d - uy*0.78, 23.4, 1.2,0.16,1.8, LICHT)
            lp.rotation_euler[2] = al + math.pi/2
    export("th9_stadion", 0.03, 2)

# ============================================================ 3) Museum mit Kuppel
def museum():
    """Klassizistischer Bau mit Kuppel, Portikus, Freitreppe.
    Bereits auf +y (three.js -z) gebaut -> export(drehen=False)."""
    neu()
    W   = mat("MuseumWand", (0.88,0.86,0.78), 0.8)
    SAE = mat("Saeule", (0.95,0.93,0.87), 0.7)
    SOK = mat("MuseumSockel", (0.60,0.57,0.50), 0.9)
    DACH= mat("Dach", (0.30,0.38,0.40), 0.6, 0.2)
    KUP = mat("Kuppel", (0.30,0.50,0.50), 0.4, 0.45)
    STU = mat("Stufe", (0.70,0.68,0.62), 0.9)
    BRZ = mat("Bronzetor", (0.36,0.28,0.14), 0.4, 0.7)
    box(0,0,0.9, 40.0,36.0,1.8, SOK)                         # Sockel (traegt den Portikus)
    box(0,0,0.30, 41.4,37.4,0.60, SOK)
    for i in range(5):                                        # Freitreppe nach vorn (+y)
        box(0, 18.4+i*0.9, 1.62-i*0.36, 24.0+i*1.0, 0.9, 0.36, STU)
    box(0,0,7.0, 38.0,28.0,10.4, W)                          # Hauptbau
    box(0,0,12.6, 39.6,29.6,0.9, DACH)                       # Gesims
    for i in range(8):                                       # Portikus (steht auf dem Sockel)
        px = -10.5 + i*3.0                                   # Abstand 3.0: die Saeulen
        zyl(px, 15.8, 6.6, 0.62, 9.6, SAE, 14)               # verschmelzen sonst zur Wand
        zyl(px, 15.8, 1.95, 0.80, 0.30, SAE, 14)             # Basis
        zyl(px, 15.8, 11.32, 0.80, 0.28, SAE, 14)            # Kapitell
    box(0, 15.8, 12.0, 21.0, 2.6, 1.2, W)                    # Architrav
    giebel(0, 15.8, 12.6, 10.5, 3.4, 2.6, W)                 # Dreiecksgiebel (Prisma!)
    box(0, 14.05, 3.4, 4.2, 0.30, 6.0, BRZ)                  # Bronzeportal
    zyl(0,0,14.6, 9.0, 3.4, W, 26)                           # Tambour
    for i in range(16):
        a = i/16*math.tau
        zyl(math.cos(a)*9.0, math.sin(a)*9.0, 14.6, 0.30, 3.4, SAE, 8)   # Tambour-Saeulen
    halbkugel(0,0,16.3, 8.6, KUP, 26)                        # Kuppel sitzt auf dem Tambour
    zyl(0,0,22.0, 0.9, 1.6, KUP, 14)                         # Laterne
    kegel(0,0,23.4, 1.2, 0.0, 1.4, DACH, 14)
    FEN = mat("Fenster",(0.42,0.58,0.70),0.2)
    for sy in (-9.0, 0.0, 9.0):                              # Seitenfenster (in der Wand)
        for sx in (-18.9, 18.9):
            box(sx, sy, 7.4, 0.40, 2.2, 5.2, FEN)
    export("th9_museum", 0.024, 2, drehen=False)

# ============================================================ 4) Einkaufszentrum
def mall():
    """Breiter Flachbau mit Glasfront, Vordach, Werbeturm."""
    neu()
    W   = mat("MallWand", (0.72,0.70,0.66), 0.8)
    SOK = mat("MallSockel", (0.44,0.43,0.41), 0.9)
    G   = mat("MallGlas", (0.30,0.50,0.62), 0.12, 0.25)
    DACH= mat("MallDach", (0.34,0.36,0.38), 0.7)
    ROT = mat("Akzent", (0.80,0.22,0.18), 0.55)
    TUER= mat("Tuer", (0.16,0.26,0.34), 0.1, 0.3)
    box(0,0,0.35, 46.0,32.0,0.70, SOK)
    box(0,0,4.4, 44.0,28.0,7.4, W)
    box(0,0,8.4, 45.6,29.6,0.7, DACH)
    box(0,0,1.1, 44.6,28.6,0.8, SOK)                         # Sockelband
    for i in range(8):                                       # Glasfront (in der Wand)
        if i in (3,4): continue
        box(-18.5+i*5.3, -13.92, 4.4, 4.2, 0.30, 5.6, G)
    box(-2.65,-13.90, 2.6, 2.4, 0.34, 4.0, TUER)             # Portal: 2 Tuerfluegel
    box( 2.65,-13.90, 2.6, 2.4, 0.34, 4.0, TUER)
    box(0,-13.86, 5.1, 11.6, 0.36, 1.0, ROT)                 # Portalrahmen
    box(0,-15.40, 3.90, 40.0, 3.2, 0.36, DACH)               # Vordach (auf Stuetzen)
    for sx in (-16, -8, 0, 8, 16):
        zyl(sx,-14.60, 2.21, 0.22, 3.02, DACH, 10)   # vom Sockel bis unters Vordach
    box(0,-16.90, 4.15, 40.0, 0.5, 0.9, ROT)                 # Vordach-Blende
    box(0,-14.40, 9.30, 16.0, 0.6, 2.4, ROT)                 # Schriftband (sitzt auf dem Dach)
    box(19.0, 6.0, 9.4, 3.2, 3.2, 12.0, W)                   # Werbeturm
    box(19.0, 6.0, 15.8, 3.6, 3.6, 1.0, ROT)
    for i in range(5):                                       # Oberlichter
        box(-14+i*7, 4.0, 8.9, 5.0, 8.0, 0.5, G)
    export("th9_mall", 0.024, 2)

# ============================================================ 5) Krankenhaus
def krankenhaus():
    """H-Grundriss, 6 Etagen, Kreuz-Zeichen, ueberdachte Vorfahrt."""
    neu()
    W   = mat("KlinikWand", (0.90,0.90,0.87), 0.8)
    SOK = mat("KlinikSockel", (0.50,0.50,0.48), 0.9)
    G   = mat("KlinikGlas", (0.34,0.54,0.66), 0.15, 0.2)
    B   = mat("Band", (0.52,0.56,0.60), 0.5, 0.3)
    ROT = mat("Kreuz", (0.86,0.16,0.16), 0.5)
    DACH= mat("Dach", (0.36,0.38,0.40), 0.7)
    GRN = mat("Klinikband", (0.20,0.54,0.50), 0.55)
    box(0,0,0.5, 40.0,26.0,1.0, SOK)
    box(0,0,10.5, 14.0,22.0,19.0, W)                         # Mitteltrakt
    fensterraster(0,0, 14.0,22.0, 1.0, 6, 3.1, G, B)
    for sx in (-13.0, 13.0):                                 # Fluegel
        box(sx,0,9.0, 12.0,26.0,16.0, W)
        fensterraster(sx,0, 12.0,26.0, 1.0, 5, 3.1, G, B)
        box(sx,0,17.3, 12.6,26.6,0.7, DACH)
    box(0,0,20.3, 14.6,22.6,0.7, DACH)
    box(0,0,1.5, 40.4,26.4,0.8, GRN)                         # farbiges Sockelband
    zyl(0,-11.2, 21.9, 0.18, 2.4, B, 10)                     # Kreuz-Mast auf der Attika
    box(0,-11.2, 24.4, 0.9,0.42,4.2, ROT)                    # Kreuz (2 Balken, keine Klotzmitte)
    box(0,-11.2, 24.4, 4.2,0.42,0.9, ROT)
    box(0,-16.0, 0.09, 22.0,10.0,0.18, SOK)                  # Vorfahrt-Platte
    box(0,-14.2, 4.2, 16.0,8.0,0.4, DACH)                    # Vorfahrt-Dach (in der Wand)
    for sx in (-7.0, 0.0, 7.0):
        zyl(sx,-17.4, 2.19, 0.24, 4.02, B, 10)       # von der Vorfahrt-Platte bis ans Dach
    box(0,-11.05, 2.2, 9.0, 0.30, 4.0, G)                    # Glas-Eingang
    box(0,-11.02, 4.6, 9.6, 0.34, 0.9, GRN)
    export("th9_krankenhaus", 0.024, 2)

# ============================================================ 6) Hotel
def hotel():
    """Hochhaus-Hotel mit Balkonreihen auf BEIDEN Laengsseiten, Lobby, Dachterrasse."""
    neu()
    W   = mat("HotelWand", (0.74,0.64,0.50), 0.75)
    SOK = mat("HotelSockel", (0.44,0.40,0.35), 0.9)
    G   = mat("HotelGlas", (0.26,0.44,0.58), 0.14, 0.25)
    BAL = mat("Balkon", (0.82,0.79,0.73), 0.7)
    DACH= mat("Dach", (0.34,0.36,0.38), 0.7)
    GOLD= mat("Akzent", (0.72,0.58,0.24), 0.3, 0.7)
    box(0,0,0.6, 26.0,22.0,1.2, SOK)
    box(0,0,3.6, 24.0,18.0,5.0, W)                           # Lobby-Sockel
    box(0,0,1.5, 24.4,18.4,0.8, SOK)
    for i in range(6):                                       # Lobby-Glas (in der Wand)
        box(-9.5+i*3.8, -8.94, 3.4, 3.0,0.22,4.0, G)
    box(0,-9.5, 6.00, 20.0, 5.0, 0.40, GOLD)                 # Vordach bindet in die Wand ein
    for sx in (-8,0,8): zyl(sx,-10.60, 3.00, 0.28, 6.00, GOLD, 10)   # auf dem Sockel
    box(0,0,20.6, 20.0,15.0,29.0, W)                         # Turm
    for e in range(9):                                       # Balkone auf BEIDEN Seiten
        z = 7.6 + e*3.2
        for sgn in (-1, 1):
            box(0, sgn*7.7, z, 18.4,0.7,0.20, BAL)
            box(0, sgn*8.0, z+0.48, 18.4,0.14,0.75, BAL)
            for i in range(6):
                box(-7.5+i*3.0, sgn*7.42, z+1.5, 2.2,0.20,2.2, G)
    for e in range(9):                                       # Schmalseiten bekommen Fenster
        z = 7.6 + e*3.2
        for sgn in (-1, 1):
            for i in range(3):
                box(sgn*9.92, -4.4+i*4.4, z+1.5, 0.20,2.6,2.0, G)
    box(0,0,35.3, 21.0,16.0,0.8, DACH)                       # Attika
    box(0,0,36.8, 12.0,9.0,2.2, W)                           # Dachaufbau
    box(0,0,38.1, 13.0,10.0,0.5, GOLD)
    export("th9_hotel", 0.024, 2)

# ============================================================ 7) Burg
def burg():
    """Burg mit Bergfried, Zinnen, echtem Tor-Durchlass, Ecktuermen."""
    neu()
    ST  = mat("Burgstein", (0.38,0.35,0.31), 0.92)
    FUN = mat("Fundament", (0.30,0.28,0.25), 0.95)
    DACH= mat("Turmdach", (0.32,0.17,0.15), 0.8)
    TOR = mat("Tor", (0.26,0.17,0.10), 0.7)
    B, T, H = 34.0, 26.0, 11.0
    d = 2.0
    box(0,0,0.7, B+3.0, T+3.0, 1.4, FUN)                     # Fundament
    for (cx,cy,sx,sy) in ((0, T/2, B, d), (-B/2,0, d, T), (B/2,0, d, T)):
        box(cx,cy, H/2+1.4, sx,sy,H, ST)                     # Ringmauer (Sued fehlt: Tor)
    # Suedmauer mit echtem Durchlass: links + rechts + Sturz
    box(-10.25,-T/2, H/2+1.4, 13.5, d, H, ST)
    box( 10.25,-T/2, H/2+1.4, 13.5, d, H, ST)
    box(0,-T/2, 10.4, 7.0, d, 3.0, ST)                       # Sturz ueber der Durchfahrt
    box(0,-T/2-1.15, 4.35, 5.4, 0.4, 5.9, TOR)               # Torfluegel VOR der Mauer
    for i in range(17):                                      # Zinnen Nord/Sued
        box(-B/2+1+i*2.05, T/2, H+2.2, 1.1,d,1.6, ST)
        box(-B/2+1+i*2.05,-T/2, H+2.2, 1.1,d,1.6, ST)
    for i in range(13):                                      # Zinnen Ost/West
        box(-B/2, -T/2+1+i*2.05, H+2.2, d,1.1,1.6, ST)
        box( B/2, -T/2+1+i*2.05, H+2.2, d,1.1,1.6, ST)
    for (tx,ty) in ((-B/2,-T/2),(B/2,-T/2),(-B/2,T/2),(B/2,T/2)):
        zyl(tx,ty, 8.4, 3.4, 15.0, ST, 14)                   # Ecktuerme (bis z=15.9)
        zyl(tx,ty, 16.15, 3.5, 0.5, ST, 14)                  # geschlossenes Deck
        for k in range(11):
            a = k/11*math.tau
            box(tx+math.cos(a)*3.3, ty+math.sin(a)*3.3, 17.0, 0.9,0.9,1.2, ST)
        kegel(tx,ty, 18.70, 4.0, 0.0, 4.6, DACH, 14)         # Dach sitzt auf dem Deck
    zyl(0, 5.0, 13.0, 5.2, 24.0, ST, 16)                     # Bergfried (bis z=25.0)
    zyl(0, 5.0, 25.25, 5.3, 0.5, ST, 16)                     # Deck
    for k in range(14):
        a = k/14*math.tau
        box(math.cos(a)*5.1, 5.0+math.sin(a)*5.1, 26.2, 1.1,1.1,1.4, ST)
    kegel(0, 5.0, 28.70, 6.2, 0.0, 6.4, DACH, 16)
    export("th9_burg", 0.03, 2)

# ============================================================ 8) Bus
def stadtbus():
    neu()
    GELB = mat("BusGelb", (0.92,0.72,0.16), 0.5)
    G    = mat("Scheibe", (0.20,0.30,0.40), 0.12, 0.3)
    R    = mat("Reifen", (0.10,0.10,0.12), 0.85)
    FEL  = mat("Felge", (0.66,0.68,0.70), 0.35, 0.7)
    DKL  = mat("Dunkel", (0.16,0.18,0.22), 0.5)
    box(0,0,1.75, 2.55,11.0,2.30, GELB)
    box(0,0,2.98, 2.42,10.6,0.30, GELB)
    box(0,-5.53,2.05, 2.20,0.14,1.20, G)                     # Frontscheibe
    box(0, 5.53,2.05, 2.20,0.14,1.10, G)                     # Heckscheibe
    for sy in (-3.6,-1.2, 1.2, 3.6):
        for sx in (-1.24, 1.24):
            box(sx, sy, 2.15, 0.12, 1.9, 1.05, G)            # Seitenscheiben
    box(1.24,-2.6, 1.57, 0.12, 1.2, 1.94, DKL)               # Tueren (buendig, schweben nicht)
    box(1.24, 2.2, 1.57, 0.12, 1.2, 1.94, DKL)
    box(0,0,0.62, 2.60,11.1,0.5, DKL)
    for sy in (-3.9, 3.4):
        for sx in (-1.20, 1.20):
            rad(sx, sy, 0.52, 0.52, 0.32, R, 16)
            rad(sx*1.03, sy, 0.52, 0.26, 0.34, FEL, 12)
    box(0,-5.53,2.68, 1.6,0.12,0.34,
        mat("Anzeige",(0.95,0.85,0.30),0.3,0.0,(0.95,0.85,0.30),1.2))
    export("th9_stadtbus", 0.016, 2)

# ============================================================ 9) Feuerwehrauto
def feuerwehr():
    neu()
    ROT  = mat("FwRot", (0.72,0.10,0.09), 0.45)
    G    = mat("Scheibe", (0.20,0.30,0.40), 0.12, 0.3)
    R    = mat("Reifen", (0.10,0.10,0.12), 0.85)
    FEL  = mat("Felge", (0.66,0.68,0.70), 0.35, 0.7)
    CHR  = mat("Chrom", (0.72,0.74,0.78), 0.3, 0.8)
    BLAU = mat("Blaulicht", (0.20,0.36,0.92), 0.2, 0.0, (0.20,0.36,0.92), 2.6)
    box(0,-2.4,1.60, 2.45,2.60,1.90, ROT)                    # Kabine
    box(0,-3.64,1.90, 2.10,0.16,0.95, G)                     # Frontscheibe
    for sx in (-1.20, 1.20):                                 # Tuerfenster
        box(sx, -2.9, 1.95, 0.12, 1.1, 0.75, G)
    box(0, 1.5,1.55, 2.50,5.60,1.80, ROT)                    # Aufbau
    box(0, 1.5,2.55, 2.60,5.70,0.28, ROT)
    for sy in (-0.2, 1.4, 3.0):                              # Geraetefaecher
        for sx in (-1.23, 1.23):
            box(sx, sy, 1.35, 0.10, 1.3, 1.1, CHR)
    box(0, 1.55, 2.78, 0.9, 5.4, 0.10, CHR)                  # Leiterbett
    for sx in (-0.35, 0.35):                                 # Leiter: 2 Holme
        zyl(sx, 1.55, 2.95, 0.09, 5.4, CHR, 10, rot=(math.pi/2,0,0))
    for k in range(7):                                       # Leiter: Sprossen
        zyl(0, -0.85+k*0.80, 2.95, 0.05, 0.72, CHR, 8, rot=(0,math.pi/2,0))
    box(0,-2.4,2.66, 1.5,0.5,0.24, BLAU)                     # Blaulichtbalken
    box(0, 0.30,0.55, 2.45,8.00,0.44, mat("Rahmen",(0.20,0.20,0.22),0.6))
    for sy in (-2.9, 1.2, 2.9):
        for sx in (-1.18, 1.18):
            rad(sx, sy, 0.50, 0.50, 0.30, R, 16)
            rad(sx*1.03, sy, 0.50, 0.25, 0.32, FEL, 12)
    export("th9_feuerwehr", 0.016, 2)

# ============================================================ 10) Wasserturm
def wasserturm():
    neu()
    ST  = mat("Turmstein", (0.62,0.56,0.46), 0.88)
    SOK = mat("TurmSockel", (0.40,0.37,0.32), 0.92)
    MET = mat("Tank", (0.60,0.64,0.68), 0.4, 0.45)
    DACH= mat("Dach", (0.30,0.32,0.36), 0.7)
    FEN = mat("Fenster",(0.26,0.34,0.42),0.25)
    zyl(0,0,0.5, 4.6, 1.0, SOK, 18)
    zyl(0,0,7.0, 3.8, 13.0, ST, 18)                          # Schaft
    for i in range(3):
        zyl(0,0, 3.0+i*3.4, 4.2, 0.32, ST, 18)               # RUNDE Ringgesimse
    for i in range(8):                                       # Schraegstreben tragen den Tank
        a = i/8*math.tau
        s = zyl(math.cos(a)*4.5, math.sin(a)*4.5, 11.6, 0.20, 3.2, ST, 8)
        s.rotation_euler[0] = math.cos(a)*0.30
        s.rotation_euler[1] = math.sin(a)*0.30
    zyl(0,0,13.4, 5.6, 0.5, ST, 22)                          # Konsole
    zyl(0,0,16.6, 5.2, 6.2, MET, 22)                         # Wassertank
    zyl(0,0,19.9, 5.4, 0.5, MET, 22)
    kegel(0,0,21.6, 5.6, 0.0, 3.0, DACH, 22)                 # Kegeldach
    zyl(0,0,23.4, 0.14, 1.6, DACH, 8)
    for i in range(6):                                       # Fenster BUENDIG im Schaft
        a = i/6*math.tau
        o = box(math.cos(a)*3.62, math.sin(a)*3.62, 6.0+((i%3)*3.0), 0.6, 0.40, 1.1, FEN)
        o.rotation_euler[2] = a
    export("th9_wasserturm", 0.024, 2)

if __name__ == "__main__":
    print("Asset-Charge 5 (th9, GROSSE Landmarken):")
    for fn in (wolkenkratzer, stadion, museum, mall, krankenhaus,
               hotel, burg, stadtbus, feuerwehr, wasserturm):
        fn()
    print("fertig")
