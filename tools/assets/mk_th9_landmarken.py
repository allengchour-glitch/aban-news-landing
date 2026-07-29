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
        # Teile mit "nb" sind schon rund (Torus-Reifen) oder winzig — ein Bevel
        # kostet dort ~200 Dreiecke und bringt nichts.
        if o.get("nb"):
            try: bpy.ops.object.shade_auto_smooth(angle=math.radians(38))
            except Exception: pass
            continue
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

# ---------------------------------------------------------- RUNDE KAROSSERIEN
# Eine Kette einzelner Quader liest sich als TREPPE — an Fahrzeugen faellt das am
# staerksten auf (dieselbe Lehre wie bei den Schiffsruempfen, `hull()` in
# mk_th15_hafen.py). `karosse()` loftet deshalb EIN Mesh aus verrundeten
# Rechteck-Querschnitten; alle Masse duerfen Zahl ODER Funktion von y sein, damit
# Front, Dach und Taille flie3end ineinander uebergehen.
def _f(v):
    return v if callable(v) else (lambda _y, _v=v: _v)

def rprofil(hb_u, hb_o, z0, z1, r_u, r_o, n=3):
    """EIN Querschnitt in der x-z-Ebene: unten 2*hb_u breit, oben 2*hb_o, z0..z1
    hoch, alle vier Ecken verrundet. Punktzahl ist immer 4*(n+1) — nur mit
    konstanter Punktzahl lassen sich beliebige Profile zu einem Mesh loften."""
    h = max(1e-3, z1 - z0)
    ru = max(0.0, min(r_u, hb_u*0.92, h*0.46))
    ro = max(0.0, min(r_o, hb_o*0.92, h*0.46))
    p = []
    for (cx, cz, rr, a0) in ((hb_u - ru, z0 + ru, ru, -math.pi/2),
                             (hb_o - ro, z1 - ro, ro, 0.0),
                             (-hb_o + ro, z1 - ro, ro, math.pi/2),
                             (-hb_u + ru, z0 + ru, ru, math.pi)):
        for k in range(n + 1):
            a = a0 + k*(math.pi/2)/n
            p.append((cx + math.cos(a)*rr, cz + math.sin(a)*rr))
    return p

def karosse(ys, hb, z0, z1, m, r_u=0.16, r_o=0.28, n=3, hb_o=None,
            kappen=(True, True), name="Karosserie"):
    """Karosserie/Aufbau als EIN geloftetes Mesh ueber die Stationen `ys`."""
    fhb = _f(hb); fho = _f(hb if hb_o is None else hb_o)
    fz0, fz1, fru, fro = _f(z0), _f(z1), _f(r_u), _f(r_o)
    verts, faces = [], []
    for y in ys:
        for (x, z) in rprofil(max(0.02, fhb(y)), max(0.02, fho(y)),
                              fz0(y), fz1(y), fru(y), fro(y), n):
            verts.append((x, y, z))
    P = 4*(n + 1)
    for i in range(len(ys) - 1):
        a, b = i*P, (i + 1)*P
        for k in range(P):
            k2 = (k + 1) % P
            faces.append((a + k, a + k2, b + k2, b + k))
    if kappen[0]: faces.append(tuple(range(P - 1, -1, -1)))                 # Heck (-y)
    if kappen[1]: faces.append(tuple(range((len(ys) - 1)*P, len(ys)*P)))    # Front (+y)
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if m: me.materials.append(m)
    bpy.context.view_layer.objects.active = o
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free(); me.update()
    return o

def prisma_x(pts_yz, breite, m=None, x=0.0, name="Prisma"):
    """Gewoelbtes Bauteil (Loeffel, Schaufel, Kotfluegel): ein Polygonzug in der
    y-z-Ebene wird in x extrudiert. Drei gestufte Bodenbleche sind keine Schaufel —
    mit dem Profil bekommt sie eine echte Rundung."""
    t = breite/2.0
    n = len(pts_yz)
    v = [(x - t, p[0], p[1]) for p in pts_yz] + [(x + t, p[0], p[1]) for p in pts_yz]
    f = [tuple(range(n)), tuple(range(2*n - 1, n - 1, -1))]
    for i in range(n):
        j = (i + 1) % n
        f.append((i, n + i, n + j, j))
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if m: me.materials.append(m)
    bpy.context.view_layer.objects.active = o
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free(); me.update()
    return o

def flach(o):
    """Bauteil vom globalen Bevel ausnehmen. Ein Torus-Reifen ist schon rund, und
    jedes gebevelte 5-cm-Kaestchen kostet ~200 Dreiecke."""
    if o is not None: o["nb"] = 1
    return o

def weich(o, w=0.055, seg=4, winkel=54):
    """DEUTLICH staerkerer Bevel fuer alles, was die Silhouette bestimmt
    (Stossstange, Dachkante, Kotfluegel, Leuchten)."""
    if o is None: return o
    md = o.modifiers.new("Weich", 'BEVEL')
    md.width = w; md.segments = seg; md.use_clamp_overlap = True
    md.limit_method = 'ANGLE'; md.angle_limit = math.radians(winkel)
    return o

def torus_x(x, y, z, R, r, m=None, mj=20, mn=8):
    """Ring mit Achse in x — Reifenprofil, Nabenring."""
    bpy.ops.mesh.primitive_torus_add(location=(x, y, z), rotation=(0, math.pi/2, 0),
                                     major_radius=R, minor_radius=r,
                                     major_segments=mj, minor_segments=mn)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def radlauf(x, y, z, R, dicke, breite, m, n=9, spanne=None):
    """Radlauf als HALBER Bogen aus tangential gedrehten Kaestchen. Ein voller Torus
    taucht unter z = 0 — die Unterkante muss exakt 0,00 bleiben."""
    sp = spanne if spanne else math.pi
    ch = 2*R*math.sin(sp/(2*n))*1.15
    for i in range(n):
        a = math.pi/2 - sp/2 + sp*(i + 0.5)/n
        o = box(x, y + math.cos(a)*R, z + math.sin(a)*R, breite, ch, dicke, m)
        o.rotation_euler[0] = a - math.pi/2
        flach(o)

def rad_voll(x, y, z, r, breite, m_reif, m_felge, seg=24, speichen=5, sx=0,
             stollen=0, m_stoll=None):
    """Rad mit RUNDEM Reifenprofil (Torus statt Klotz-Zylinder), Felgenschuessel,
    Speichenloechern und Nabe. `seg` MUSS gerade sein: bei ungerader Zahl steht
    unten eine Ecke statt einer Kante und das Rad schwebt (teuer gelernt an th17).
    `sx` = -1/+1 bringt die Felgendetails nur auf die sichtbare Aussenseite."""
    if seg % 2: seg += 1
    rm = min(breite*0.5, r*0.34)
    rf = max(0.04, r - 2*rm)
    flach(torus_x(x, y, z, r - rm, rm, m_reif, seg, 8))                 # Lauf + Flanken
    flach(zyl(x, y, z, r - rm + 0.004, breite*0.55, m_reif, seg, rot=(0, math.pi/2, 0)))
    flach(zyl(x, y, z, rf*1.02, breite*0.80, m_felge, seg, rot=(0, math.pi/2, 0)))
    for s in ((sx,) if sx else (-1, 1)):
        xf = x + s*breite*0.44
        flach(zyl(xf, y, z, rf*0.99, breite*0.06, m_felge, seg, rot=(0, math.pi/2, 0)))
        for i in range(speichen):
            a = i/max(1, speichen)*math.tau + 0.35
            flach(zyl(xf + s*0.012, y + math.cos(a)*rf*0.56, z + math.sin(a)*rf*0.56,
                      rf*0.27, breite*0.05, m_reif, 10, rot=(0, math.pi/2, 0)))
        flach(zyl(xf + s*0.024, y, z, rf*0.32, breite*0.08, m_felge, 12,
                  rot=(0, math.pi/2, 0)))
    for i in range(stollen):                                            # Stollenprofil
        a = i/stollen*math.tau
        o = box(x, y + math.cos(a)*(r - rm*0.5), z + math.sin(a)*(r - rm*0.5),
                breite*0.94, r*0.19, rm*0.80, m_stoll or m_reif)
        o.rotation_euler[0] = a - math.pi/2
        flach(o)

def scheibe(p0, p1, breite, m, dicke=0.05, aus=0.035):
    """Schraege Scheibe zwischen zwei Punkten (Windschutz-, Heckscheibe), um `aus`
    nach AUSSEN versetzt — im Blech steckend waere sie unsichtbar (Fallstrick 3).
    Rotation um x: lokale z-Achse auf die Sehne, also atan2(-vy, vz)."""
    ax, ay, az = p0; bx, by, bz = p1
    vy, vz = by - ay, bz - az
    L = math.hypot(vy, vz)
    if L < 1e-5: return None
    ny, nz = -vz/L, vy/L
    if ny < 0: ny, nz = -ny, -nz
    o = box((ax + bx)/2, (ay + by)/2 + ny*aus, (az + bz)/2 + nz*aus,
            breite, dicke, L, m)
    o.rotation_euler[0] = math.atan2(-vy, vz)
    return o

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
    """Niederflur-Stadtbus. 2026-07-29 von der Quaderkette auf EINE geloftete
    Karosserie umgestellt: gewoelbte Bug- und Heckkappe, verrundete Dachkante,
    Radlaeufe, Raeder mit Torus-Profil. Front auf +y, deshalb drehen=False."""
    neu()
    GELB = mat("BusGelb",   (0.93,0.73,0.16), 0.45)
    GEL2 = mat("Gelb tief", (0.76,0.58,0.11), 0.5)
    G    = mat("Scheibe",   (0.19,0.28,0.37), 0.10, 0.3)
    R    = mat("Reifen",    (0.09,0.09,0.10), 0.9)
    FEL  = mat("Felge",     (0.68,0.70,0.72), 0.32, 0.55)
    DKL  = mat("Dunkel",    (0.15,0.16,0.19), 0.55)
    GRAU = mat("Schuerze",  (0.34,0.35,0.38), 0.7)
    LIC  = mat("Scheinwerfer", (1.00,0.96,0.84), 0.2)
    ROT  = mat("Rueckleuchte", (0.80,0.14,0.11), 0.32)
    ZIEL = mat("Zielanzeige", (0.95,0.85,0.30), 0.3, 0.0, (0.95,0.85,0.30), 1.4)
    Z0, ZD = 0.32, 2.96
    def zd(y):
        a = abs(y)
        if a <= 4.75: return ZD
        return ZD - 0.15*((a - 4.75)/0.85)**2
    def bb(y):
        w = 1.28
        if y >  4.45: w -= 0.13*((y - 4.45)/1.15)**2
        if y < -4.55: w -= 0.11*((-4.55 - y)/1.05)**2
        return w
    def ro(y):
        a = abs(y)
        if a <= 4.40: return 0.32
        return 0.32 + 0.34*((a - 4.40)/1.20)**2
    ys = [-5.60,-5.42,-5.15,-4.75,-4.10,-3.00,-1.60,0.0,1.60,3.00,4.10,4.75,5.15,5.42,5.58]
    weich(karosse(ys, bb, Z0, zd, GELB, 0.30, ro, 3,
                  hb_o=lambda y: bb(y) - 0.05), 0.07, 4)
    # --- Front: senkrechte Bugkappe mit grosser Scheibe (Niederflurbus-Optik)
    weich(box(0, 5.61, 2.28, 2.16, 0.08, 1.20, G), 0.06, 4)          # Frontscheibe
    weich(box(0, 5.60, 2.92, 1.70, 0.10, 0.26, ZIEL), 0.05, 3)       # Zielanzeige
    weich(box(0, 5.60, 0.86, 2.24, 0.14, 0.44, GRAU), 0.07, 4)       # Stossfaenger
    for s in (-1, 1):
        weich(box(s*0.78, 5.62, 1.32, 0.44, 0.09, 0.22, LIC), 0.05, 3)
        flach(box(s*0.62, 5.66, 0.78, 0.26, 0.05, 0.10, DKL))
        weich(box(s*1.36, 4.90, 2.46, 0.14, 0.09, 0.52, DKL), 0.05, 3)   # Spiegel
        flach(box(s*1.28, 4.92, 2.32, 0.14, 0.05, 0.05, DKL))
    flach(box(0, 5.64, 1.62, 1.40, 0.06, 0.18, GEL2))                # Zierband
    # --- Heck
    weich(box(0, -5.63, 2.28, 2.00, 0.08, 0.98, G), 0.06, 4)         # Heckscheibe
    weich(box(0, -5.62, 0.84, 2.20, 0.14, 0.42, GRAU), 0.07, 4)
    for s in (-1, 1):
        weich(box(s*0.84, -5.64, 1.38, 0.30, 0.08, 0.56, ROT), 0.05, 3)
    for i in range(7):
        flach(box(0, -5.60, 1.72 + i*0.09, 1.30, 0.05, 0.05, DKL))   # Motorgitter
    # --- Seitenfenster (Band) und Tueren auf +x (three.js +x = rechte Seite)
    for i, (yc, ln) in enumerate(((3.55, 1.30), (1.55, 1.55), (-0.55, 1.55),
                                  (-2.55, 1.55), (-4.35, 1.35))):
        for s in (-1, 1):
            box(s*1.27, yc, 2.34, 0.07, ln, 0.86, G)
    for s in (-1, 1):
        flach(box(s*1.28, 0.0, 1.72, 0.05, 10.4, 0.10, GEL2))        # Zierlinie
        flach(box(s*1.28, 0.0, 0.62, 0.05, 10.2, 0.44, GRAU))        # Schuerze
    for yd in (4.45, -1.60):                                          # 2 Doppeltueren
        box(1.29, yd, 1.62, 0.08, 1.24, 2.10, DKL)
        box(1.31, yd, 2.20, 0.06, 1.12, 0.82, G)
        flach(box(1.33, yd, 1.62, 0.04, 0.05, 2.06, GEL2))
    # --- Raeder mit Radlauf
    for sy in (3.75, -3.45):
        for s in (-1, 1):
            rad_voll(s*1.14, sy, 0.50, 0.50, 0.30, R, FEL, 24, 6, s)
            radlauf(s*1.19, sy, 0.50, 0.68, 0.08, 0.16, GELB, 9)
    # --- Dach
    weich(box(0, 1.20, 3.06, 1.60, 2.10, 0.22, GEL2), 0.08, 4)       # Klimaaufbau
    for i in range(3):
        flach(box(0, -2.20 - i*1.10, 3.00, 1.10, 0.72, 0.07, GEL2))  # Dachluken
    export("th9_stadtbus", 0.026, 3, drehen=False)

# ============================================================ 9) Feuerwehrauto
def feuerwehr():
    """Loeschfahrzeug mit gelofteter Kabine und gelofteten Aufbau: gewoelbte Front,
    schraege A-Saeule, verrundete Dachkanten, Rolladenfaecher, Leiter, Blaulicht.
    Front auf +y, deshalb drehen=False."""
    neu()
    ROT  = mat("FwRot",   (0.74,0.11,0.09), 0.42)
    ROT2 = mat("Rot tief",(0.55,0.08,0.07), 0.5)
    G    = mat("Scheibe", (0.19,0.28,0.37), 0.10, 0.3)
    R    = mat("Reifen",  (0.09,0.09,0.10), 0.9)
    FEL  = mat("Felge",   (0.68,0.70,0.72), 0.32, 0.55)
    CHR  = mat("Riffelblech", (0.70,0.72,0.75), 0.35, 0.55)
    ALU  = mat("Rolladen",(0.78,0.79,0.80), 0.45, 0.4)
    DKL  = mat("Rahmen",  (0.16,0.16,0.18), 0.6)
    LIC  = mat("Scheinwerfer", (1.00,0.96,0.84), 0.2)
    BLAU = mat("Blaulicht", (0.20,0.36,0.92), 0.2, 0.0, (0.20,0.36,0.92), 2.6)
    ORA  = mat("Warnleuchte", (1.0,0.55,0.10), 0.25, 0.0, (1.0,0.52,0.10), 2.0)
    # --- Mannschaftskabine: Front faellt ueber die Scheibe in den Kuehlergrill
    def zk(y):
        if y <= 3.10: return 2.98
        return 2.98 - 0.98*min(1.0, (y - 3.10)/0.86)**1.6
    def bk(y):
        w = 1.24
        if y > 3.30: w -= 0.14*((y - 3.30)/0.66)**2
        return w
    def rk(y):
        if y <= 3.10: return 0.26
        return 0.26 + 0.30*min(1.0, (y - 3.10)/0.86)**2
    yk = [1.05,1.45,2.05,2.65,3.10,3.32,3.52,3.70,3.85,3.94]
    weich(karosse(yk, bk, 0.88, zk, ROT, 0.20, rk, 3), 0.06, 4)
    scheibe((0.0, 3.16, 2.94), (0.0, 3.66, 2.36), 2.02, G, 0.06, 0.05)
    for s in (-1, 1):
        box(s*1.21, 2.30, 2.40, 0.07, 1.30, 0.72, G)                 # Tuerfenster
        flach(box(s*1.23, 1.62, 1.90, 0.04, 0.05, 1.86, ROT2))       # Tuerfugen
        flach(box(s*1.23, 3.02, 1.90, 0.04, 0.05, 1.86, ROT2))
        flach(box(s*1.22, 1.94, 1.98, 0.06, 0.18, 0.05, CHR))        # Griff
        weich(box(s*1.34, 3.20, 2.52, 0.13, 0.09, 0.44, DKL), 0.05, 3)   # Spiegel
        flach(box(s*1.26, 3.22, 2.40, 0.14, 0.05, 0.05, DKL))
    # --- Aufbau
    def ra(y):
        if y >= -3.70: return 0.22
        return 0.22 + 0.26*((-3.70 - y)/0.55)**2
    ya = [-4.22,-4.05,-3.70,-3.00,-2.00,-1.00,0.00,0.70,1.10,1.28]
    weich(karosse(ya, 1.26, 0.80, 2.84, ROT, 0.14, ra, 3), 0.06, 4)
    for s in (-1, 1):                                                # 3 Rolladenfaecher
        for yc in (-3.15, -1.55, 0.05):
            box(s*1.28, yc, 1.66, 0.05, 1.34, 1.44, ALU)
            for k in range(9):
                flach(box(s*1.30, yc, 1.06 + k*0.15, 0.03, 1.30, 0.06, CHR))
            flach(box(s*1.31, yc, 2.42, 0.04, 1.38, 0.09, ROT2))
        flach(box(s*1.27, -1.55, 0.62, 0.06, 5.20, 0.30, ROT2))      # Schweller
        flach(box(s*1.28, -1.55, 2.72, 0.05, 5.30, 0.10, CHR))       # Dachkante
    weich(box(0, -1.50, 2.90, 2.30, 5.30, 0.10, CHR), 0.05, 3)       # Dachpodest
    for i in range(11):
        flach(box(0, -3.90 + i*0.50, 2.96, 2.16, 0.24, 0.05, ALU))   # Riffelblech
    # --- Leiter auf dem Dach
    for s in (-1, 1):
        zyl(s*0.38, -1.30, 3.10, 0.075, 5.00, CHR, 12, rot=(math.pi/2, 0, 0))
        flach(zyl(s*0.38, 1.22, 3.10, 0.09, 0.10, DKL, 12, rot=(math.pi/2, 0, 0)))
    for k in range(9):
        flach(zyl(0, -3.60 + k*0.58, 3.10, 0.042, 0.70, CHR, 8, rot=(0, math.pi/2, 0)))
    for s in (-1, 1):                                                # Leiterauflagen
        flach(box(s*0.52, -3.55, 2.99, 0.10, 0.16, 0.18, DKL))
        flach(box(s*0.52, 1.10, 2.99, 0.10, 0.16, 0.18, DKL))
    # --- Front
    weich(box(0, 3.98, 1.24, 2.10, 0.20, 0.42, DKL), 0.08, 4)        # Stossfaenger
    weich(box(0, 3.96, 1.78, 1.30, 0.10, 0.24, DKL), 0.05, 3)        # Kuehlergrill
    for i in range(3):
        flach(box(0, 4.00, 1.72 + i*0.10, 1.20, 0.04, 0.05, CHR))
    for s in (-1, 1):
        weich(box(s*0.74, 3.96, 1.76, 0.36, 0.09, 0.20, LIC), 0.05, 3)
        weich(box(s*0.86, 3.98, 1.30, 0.26, 0.07, 0.14, ORA), 0.04, 3)
        flach(zyl(s*1.02, 3.86, 1.20, 0.07, 0.16, DKL, 10, rot=(math.pi/2, 0, 0)))
    weich(box(0, 2.90, 3.10, 1.62, 0.34, 0.16, BLAU), 0.06, 4)       # Blaulichtbalken
    flach(box(0, 2.90, 2.98, 1.70, 0.38, 0.08, DKL))
    # --- Heck
    weich(box(0, -4.28, 1.20, 2.16, 0.18, 0.40, DKL), 0.07, 4)
    for s in (-1, 1):
        weich(box(s*0.84, -4.26, 1.80, 0.26, 0.08, 0.52, ORA), 0.05, 3)
    flach(box(0, -4.26, 2.40, 1.60, 0.06, 0.28, CHR))
    # --- Rahmen und Raeder
    box(0, 0.10, 0.56, 2.06, 7.90, 0.30, DKL)
    for sy in (2.80, -1.75, -3.05):
        for s in (-1, 1):
            rad_voll(s*1.12, sy, 0.50, 0.50, 0.30, R, FEL, 24, 6, s)
            radlauf(s*1.17, sy, 0.50, 0.68, 0.08, 0.16, ROT, 9)
    export("th9_feuerwehr", 0.024, 3, drehen=False)

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
