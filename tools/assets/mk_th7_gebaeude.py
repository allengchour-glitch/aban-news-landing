# -*- coding: utf-8 -*-
"""Asset-Charge 3 (th7_*): MODULARE Gebaeude + Fahrzeuge fuer die Riesenstadt.
Die Module sind so gebaut, dass sie sich stapeln/aneinanderreihen lassen —
damit baut die Spiel-Session ganze Viertel aus wenigen Teilen.
Konventionen wie th5/th6: Unterkante y=0, Meter, +z = Schauseite, Bevel + Auto-Smooth."""
import bpy, bmesh, os, math

OUT_GLB = "/home/user/aban-news-landing/models"
OUT_STL = "/home/user/aban-news-landing/models/stl"
os.makedirs(OUT_STL, exist_ok=True)

def neu(): bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, rgb, rough=0.7, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
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

def kegel(x, y, z, r1, r2, h, m=None, seg=12, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def tonne(cx, cy, z, r, laenge, m, seg=24, flach=1.0):
    """HALBES Tonnengewoelbe: Zylinder mit Achse in x, untere Haelfte weggeschnitten,
    Basis exakt bei z. Ein VOLLER Zylinder fuellt die Halle von innen und taucht unter
    den Boden (bei der Lagerhalle gemessene -0,30) — derselbe Fehler steckte in der
    th8-Markthalle."""
    o = zyl(cx, cy, z, r, laenge, m, seg, rot=(0, math.pi/2, 0))
    o.scale[2] = flach
    bpy.context.view_layer.objects.active = o
    for s_ in bpy.context.scene.objects: s_.select_set(False)
    o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    bm.to_mesh(o.data); bm.free(); o.data.update()
    return o

def runden(width=0.016, segments=3, winkel=42):
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': continue
        bpy.context.view_layer.objects.active = o
        for s_ in bpy.context.scene.objects: s_.select_set(False)
        o.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        # Teile mit "nb" sind schon rund (Torus-Reifen) oder winzig — ein Bevel
        # kostet dort ~200 Dreiecke und bringt nichts.
        if o.get("nb"):
            try: bpy.ops.object.shade_auto_smooth(angle=math.radians(38))
            except Exception: pass
            continue
        m = o.modifiers.new("Bevel", 'BEVEL')
        d_min = max(1e-4, min(o.dimensions))          # duennste Dimension
        m.width = min(width, 0.28 * d_min)            # Offset <= ~1/4 der duennsten Kante
        m.segments = segments
        m.use_clamp_overlap = True
        m.limit_method = 'ANGLE'; m.angle_limit = math.radians(winkel)
        try: bpy.ops.object.shade_auto_smooth(angle=math.radians(38))
        except Exception: pass   # KEIN shade_smooth()-Fallback: das mittelt alles rund

def dreh180():
    """Modell um die Welt-Z-Achse drehen: Front von -y nach +y (= three.js -z).
    Die Fahrzeuge sind der Bequemlichkeit halber mit der Front auf -y gebaut,
    die Bibliotheks-Konvention ist aber Schauseite/Front auf three.js -z."""
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': continue
        bpy.context.view_layer.objects.active = o
        for s_ in bpy.context.scene.objects: s_.select_set(False)
        o.select_set(True)
        o.rotation_euler[2] += math.pi
        o.location = (-o.location[0], -o.location[1], o.location[2])
        # Rotation UND Skalierung zusammen anwenden, sonst schert die Box.
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

def export(name, bevel=0.016, seg=3, drehen=False):
    if drehen: dreh180()
    runden(bevel, seg)
    for o in bpy.context.scene.objects: o.select_set(True)
    p1 = os.path.join(OUT_GLB, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=p1, export_format='GLB', use_selection=False, export_apply=True)
    p2 = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p2)
    except Exception: bpy.ops.export_mesh.stl(filepath=p2)
    print("  ->", name, os.path.getsize(p1), "B")

def fensterreihe(g_breite, g_tiefe, zbase, anzahl, rahm, glas, hoehe=1.5):
    """Fensterreihe auf der +z-Front, gleichmaessig verteilt."""
    for i in range(anzahl):
        px = -g_breite/2 + g_breite*(i+0.5)/anzahl
        box(px, g_tiefe/2+0.02, zbase, g_breite/anzahl*0.62, 0.06, hoehe, rahm)
        box(px, g_tiefe/2+0.05, zbase, g_breite/anzahl*0.50, 0.05, hoehe*0.82, glas)

# ------------------------------------------------------------- FASSADEN-RELIEF
# Die erste Fassung dieser Module war ein glatter Quader mit aufgemaltem
# Fensterband. Die Helfer hier geben echtes Vor- und Rueckspringen — OHNE das
# Modulraster zu sprengen. Grundregel dabei:
#   * Jedes rasterbestimmende Teil ist ein QUADER. Der Mittelpunkt seiner
#     Flaeche bleibt auch nach dem Bevel exakt auf Mass; eine Pyramidenspitze
#     oder eine Zylinderkante schrumpft dagegen (das alte Satteldach aus
#     `kegel(vertices=4)` war deshalb 12.97 statt 6.00 m breit).
#   * Tiefenstaffelung immer: Wandflaeche -> Feld -> Pfeiler -> Gesims/Bank.
#     Das Glas liegt knapp VOR der Wandflaeche (sonst unsichtbar), aber
#     deutlich HINTER Pfeiler und Gesims — daraus entsteht die Fensternische.

def fbox(t, u, v, z, bu, bv, bz, m=None):
    """Quader auf einer der vier Fassaden eines quadratischen Baukoerpers.
    t=0 -> +y, t=1 -> +x, t=2 -> -y, t=3 -> -x. `u` laeuft laengs der Fassade,
    `v` ist der Abstand von der Gebaeudemitte nach aussen."""
    if t == 0: return box( u,  v, z, bu, bv, bz, m)
    if t == 1: return box( v, -u, z, bv, bu, bz, m)
    if t == 2: return box(-u, -v, z, bu, bv, bz, m)
    return         box(-v,  u, z, bv, bu, bz, m)

def randring(cx, cy, B, T, z, breite, dicke, m):
    """Attika / Dachrand / Bruestung als RING. Eine Vollplatte deckt die dunkle
    Dachhaut zu und macht jedes Flachdach zu einem weissen Klotz."""
    for sy in (-1, 1): box(cx, cy + sy*(T/2 - breite/2), z, B, breite, dicke, m)
    for sx in (-1, 1): box(cx + sx*(B/2 - breite/2), cy, z, breite, T - 2*breite, dicke, m)

def halbzyl(o):
    """Untere Haelfte wegschneiden — ein voller Zylinder ist kein Tonnendach
    (seine Unterhaelfte steckt im Bau und taucht unter z = 0)."""
    bpy.context.view_layer.objects.active = o
    for s_ in bpy.context.scene.objects: s_.select_set(False)
    o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    bm.to_mesh(o.data); bm.free(); o.data.update()
    return o

def laibung(t, u, v0, z, b, h, tief, m_rahm, m_glas, m_sims=None, vsp=1, hsp=1):
    """EIN Fenster mit echter Laibung. `v0` ist die Wandflaeche, `tief` der
    Vorsprung des umlaufenden Rahmens. Tiefenfolge: Glas v0+0.02, Sprossen
    v0+0.06, Laibung/Sturz v0+tief, Fensterbank v0+tief+0.10."""
    fbox(t, u, v0 + 0.045, z, b, 0.05, h, m_glas)                      # Glas, knapp davor
    for i in range(vsp):
        flach(fbox(t, u - b/2 + b*(i+1)/(vsp+1), v0 + 0.085, z, 0.07, 0.05, h, m_rahm))
    for i in range(hsp):
        flach(fbox(t, u, v0 + 0.085, z - h/2 + h*(i+1)/(hsp+1), b, 0.05, 0.07, m_rahm))
    for s in (-1, 1):                                                  # Laibungswangen
        fbox(t, u + s*(b/2 + 0.08), v0 + tief/2, z, 0.16, tief, h + 0.32, m_rahm)
    fbox(t, u, v0 + tief/2, z + h/2 + 0.08, b + 0.32, tief, 0.16, m_rahm)      # Sturz
    ts = tief + 0.10
    fbox(t, u, v0 + ts/2, z - h/2 - 0.09, b + 0.44, ts, 0.18, m_sims or m_rahm)  # Bank

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

# ============================================================ MODULARE GEBAEUDE
def hochhaus_modul():
    """Stapelbar: exakt 6 m hoch, Grundriss 8x8 -> mehrere uebereinander = Turm."""
    neu()
    wand = mat("TurmWand", (0.72,0.74,0.77), 0.6)
    glas = mat("TurmGlas", (0.26,0.42,0.52), 0.15, 0.2)
    band = mat("Band", (0.55,0.57,0.60), 0.5)
    box(0,0,3.0, 8.0,8.0,6.0, wand)
    for e in range(2):                                  # 2 Fensterbaender je Modul
        for s in range(4):                              # alle 4 Seiten
            a = s*math.pi/2
            bx, by = math.sin(a)*4.03, math.cos(a)*4.03
            o = box(bx, by, 1.6+e*2.9, 7.2 if s%2==0 else 0.06, 0.06 if s%2==0 else 7.2, 1.3, glas)
        box(0,0,3.05+e*2.9, 8.12,8.12,0.14, band)       # umlaufendes Gesims
    box(0,0,5.95, 8.2,8.2,0.18, band)                   # Abschluss (Stapelkante)
    export("th7_hochhaus_modul", 0.020, 3)

def hochhaus_dach():
    """Abschluss fuer den Turm: Attika + Technik + Antenne. Auf ein Modul setzen."""
    neu()
    band = mat("Band", (0.55,0.57,0.60), 0.5)
    tech = mat("Technik", (0.44,0.46,0.48), 0.6)
    dkl = mat("Dunkel", (0.22,0.23,0.26), 0.5)
    box(0,0,0.30, 8.3,8.3,0.60, band)                   # Attika
    box(0,0,0.10, 7.9,7.9,0.20, dkl)                    # Dachflaeche
    box(-1.8,1.2,1.10, 2.6,2.2,1.40, tech)              # Aufbau
    box(2.0,-1.4,0.85, 1.5,1.5,0.90, tech)              # Klimageraet
    for sx,sy in ((2.0,-1.4),):
        zyl(sx,sy,1.45, 0.55, 0.30, dkl, 12)
    zyl(2.6,2.4,1.9, 0.06, 3.0, dkl, 8)                 # Antenne
    zyl(2.6,2.4,3.5, 0.16, 0.10, dkl, 8)
    export("th7_hochhaus_dach", 0.018, 3)

def reihenhaus_modul():
    """Breite 6 m -> im Raster 6 aneinandersetzen = geschlossene Zeile."""
    neu()
    wand = mat("ZeileWand", (0.88,0.83,0.72), 0.85)
    dach = mat("ZeileDach", (0.48,0.28,0.22), 0.8)
    glas = mat("Glas", (0.62,0.76,0.84), 0.2)
    rahm = mat("Rahmen", (0.35,0.33,0.30), 0.7)
    tuer = mat("Tuer", (0.32,0.22,0.14), 0.6)
    box(0,0,0.22, 6.1,7.3,0.44, mat("Sockel",(0.68,0.66,0.62),0.9))
    box(0,0,3.30, 6.0,7.2,6.20, wand)
    box(0,0,6.55, 6.25,7.45,0.30, dach)                 # Traufgesims
    kegel(0,0,7.35, 4.6,0.0, 1.6, dach, 4, rot=(0,0,math.pi/4))   # Satteldach
    fensterreihe(6.0, 7.2, 4.9, 2, rahm, glas, 1.35)    # OG
    box(-1.5, 3.63, 1.75, 1.9,0.06,1.5, rahm)           # EG Fenster
    box(-1.5, 3.66, 1.75, 1.6,0.05,1.25, glas)
    box(1.7, 3.66, 1.20, 1.1,0.10,2.35, tuer)           # Haustuer
    box(1.7, 3.95, 2.55, 1.6,0.70,0.12, dach)           # Vordach
    export("th7_reihenhaus_modul", 0.016, 3)

def parkhaus():
    """Offenes Parkdeck, 3 Ebenen mit Bruestung + Rampe."""
    neu()
    bet = mat("Beton", (0.70,0.69,0.66), 0.9)
    dkl = mat("Fuge", (0.42,0.42,0.40), 0.8)
    for e in range(3):
        box(0,0,0.35+e*3.0, 16.0,11.0,0.42, bet)        # Decken
        box(0,-5.35,1.05+e*3.0, 16.0,0.30,0.85, bet)    # Bruestung vorn
        box(0, 5.35,1.05+e*3.0, 16.0,0.30,0.85, bet)
        box(-7.9,0,1.05+e*3.0, 0.30,11.0,0.85, bet)
        box( 7.9,0,1.05+e*3.0, 0.30,11.0,0.85, bet)
    for sx in (-6.5,-2.2,2.2,6.5):                      # Stuetzen
        for sy in (-4.0,0,4.0):
            box(sx,sy,4.6, 0.55,0.55,9.2, bet)
    box(9.4,0,3.4, 3.2,9.0,0.38, bet)                   # Rampe (schraeg angedeutet)
    box(9.4,-4.6,4.3, 3.4,0.28,0.8, dkl)
    box(9.4, 4.6,4.3, 3.4,0.28,0.8, dkl)
    box(0,0,9.62, 16.2,11.2,0.24, dkl)                  # Dachkante
    export("th7_parkhaus", 0.020, 3)

def lagerhalle():
    """Industrie: Tonnendach, Rolltore, Rampe."""
    neu()
    wand = mat("HalleWand", (0.62,0.65,0.68), 0.75, 0.15)
    dach = mat("HalleDach", (0.45,0.48,0.52), 0.6, 0.25)
    tor = mat("Tor", (0.30,0.36,0.42), 0.6)
    box(0,0,0.25, 20.4,12.4,0.50, mat("Sockel",(0.55,0.55,0.53),0.9))
    box(0,0,3.20, 20.0,12.0,5.40, wand)
    for i in range(9):                                  # Wellblech-Rippen
        box(-9.0+i*2.25, 0, 3.2, 0.14, 12.1, 5.3, dach)
    # Gewoelbe auf die Mauerkrone (5.90), Radius auf die halbe Hallentiefe (6.0),
    # damit es genau auf den Laengswaenden aufsetzt.
    tonne(0, 0, 5.90, 6.0, 20.2, dach, 22, 0.46)
    for i in range(9):                                  # Binder als Halbbogen
        tonne(-9.0 + i*2.25, 0, 5.90, 6.12, 0.16, dach, 22, 0.46)
    for tx in (-5.5, 5.5):                              # 2 Rolltore
        box(tx, 6.05, 2.10, 4.4,0.14,4.2, tor)
        for r in range(5):
            box(tx, 6.13, 0.5+r*0.85, 4.4,0.05,0.08, wand)
    box(0,7.4,0.30, 20.0,2.4,0.60, mat("Rampe",(0.58,0.57,0.54),0.9))
    export("th7_lagerhalle", 0.020, 3)

def bruecke_modul():
    """Strassenbruecke, 14 m Spannweite, aneinanderreihbar."""
    neu()
    bet = mat("BrueckeBeton", (0.74,0.72,0.68), 0.85)
    gel = mat("Gelaender", (0.40,0.42,0.45), 0.5, 0.4)
    fahr = mat("Fahrbahn", (0.24,0.24,0.27), 0.95)
    box(0,0,3.60, 14.0,9.0,0.80, bet)                   # Deck
    box(0,0,4.05, 13.9,8.4,0.12, fahr)                  # Belag
    for sy in (-4.3, 4.3):
        box(0, sy, 4.60, 14.0,0.22,0.95, gel)           # Bruestung
        for i in range(8):
            box(-6.1+i*1.75, sy, 4.62, 0.10,0.26,0.90, gel)
    for sx in (-5.6, 5.6):                              # Pfeiler
        box(sx,0,1.60, 1.8,7.0,3.20, bet)
        box(sx,0,3.30, 2.4,7.6,0.30, bet)
    export("th7_bruecke_modul", 0.018, 3)

# ============================================================ FAHRZEUGE (parkend)
# Alle drei sind 2026-07-29 von Quaderketten auf geloftete Karosserien umgestellt
# worden: gewoelbte Front, schraege A-Saeule, verrundete Dachkanten, Radlaeufe,
# Raeder mit Torus-Profil und Speichenfelge. Front liegt auf Blender +y
# (= three.js -z), deshalb laeuft `export()` hier OHNE drehen.

def lieferwagen():
    """Transporter: eine einzige geloftete Karosserie vom Heck bis in die
    Motorhaube — die Windschutzscheibe entsteht als Teil der Loft-Flaeche."""
    neu()
    KAR  = mat("Kasten",       (0.91,0.91,0.89), 0.42)
    ZIER = mat("Zierband",     (0.58,0.59,0.61), 0.55)
    DKL  = mat("Kunststoff",   (0.15,0.15,0.17), 0.72)
    GLAS = mat("Scheibe",      (0.26,0.38,0.46), 0.12, 0.25)
    REIF = mat("Reifen",       (0.09,0.09,0.10), 0.90)
    FELG = mat("Felge",        (0.70,0.72,0.74), 0.35, 0.55)
    LIC  = mat("Scheinwerfer", (1.00,0.96,0.84), 0.20)
    ROT  = mat("Rueckleuchte", (0.78,0.13,0.11), 0.35)
    Z0, ZD = 0.58, 2.46
    def zdach(y):
        if y <= 1.36: return ZD
        return ZD - 1.32*min(1.0, (y - 1.36)/1.06)**1.55      # Scheibe geht in die Haube ueber
    def breit(y):
        w = 1.08
        if y >  1.00: w -= 0.16*((y - 1.00)/1.42)**2
        if y < -1.95: w -= 0.09*((-1.95 - y)/0.47)**2
        return w
    def rob(y):
        if y <= 1.36: return 0.34
        return 0.34 + 0.26*min(1.0, (y - 1.36)/1.06)**2
    ys = [-2.42,-2.28,-2.06,-1.70,-1.15,-0.50,0.20,0.85,1.36,1.58,1.78,1.96,2.12,2.26,2.36,2.42]
    weich(karosse(ys, breit, Z0, zdach, KAR, 0.22, rob, 3), 0.06, 4)
    # --- Raeder + Radlaeufe
    for sy in (-1.50, 1.44):
        for s in (-1, 1):
            rad_voll(s*0.94, sy, 0.42, 0.42, 0.27, REIF, FELG, 24, 5, s)
            radlauf(s*0.99, sy, 0.42, 0.55, 0.09, 0.16, KAR, 9)
    box(0, -0.03, 0.46, 2.06, 2.28, 0.24, ZIER)                     # Schweller
    # --- Front. Die Nasenkappe reicht von z 0.58 bis 1.14 — Grill und Leuchten
    # muessen INNERHALB dieses Fensters liegen, sonst schweben sie vor dem Blech.
    weich(box(0, 2.42, 0.74, 1.86, 0.20, 0.26, KAR), 0.06, 4)       # Stossstange
    flach(box(0, 2.46, 0.62, 1.78, 0.10, 0.12, DKL))                # Spoilerlippe
    weich(box(0, 2.44, 1.00, 0.86, 0.10, 0.18, DKL), 0.04, 3)       # Kuehlergrill
    for s in (-1, 1):
        weich(box(s*0.62, 2.42, 1.00, 0.38, 0.10, 0.16, LIC), 0.04, 3)
        flach(box(s*0.50, 2.48, 0.70, 0.22, 0.05, 0.09, DKL))
    scheibe((0.0, 1.42, 2.42), (0.0, 2.00, 1.88), 1.66, GLAS, 0.05, 0.05)
    # --- Fahrerhaus seitlich
    for s in (-1, 1):
        box(s*1.05, 1.00, 1.88, 0.06, 0.84, 0.58, GLAS)             # Tuerfenster
        flach(box(s*1.07, 0.52, 1.52, 0.03, 0.04, 1.72, ZIER))      # Tuerfugen
        flach(box(s*1.07, 1.46, 1.52, 0.03, 0.04, 1.72, ZIER))
        flach(box(s*1.06, 0.72, 1.58, 0.05, 0.20, 0.05, DKL))       # Griff
        weich(box(s*1.14, 1.40, 1.98, 0.14, 0.08, 0.26, DKL), 0.05, 3)   # Spiegel
        flach(box(s*1.08, 1.42, 1.88, 0.10, 0.04, 0.04, DKL))
        flach(box(s*1.09, -0.05, 1.06, 0.03, 2.30, 0.10, ZIER))     # Seitenschutzleiste
    for i in range(4):                                              # Dachsicken
        flach(box(0, -1.85 + i*0.86, 2.45, 1.36, 0.09, 0.05, ZIER))
    # --- Heck
    flach(box(0, -2.44, 1.52, 0.05, 0.05, 1.68, DKL))               # Fuge Fluegeltueren
    flach(box(0, -2.44, 2.30, 1.82, 0.05, 0.05, DKL))
    for s in (-1, 1):
        weich(box(s*0.76, -2.45, 1.24, 0.24, 0.07, 0.56, ROT), 0.05, 3)
    weich(box(0, -2.44, 0.68, 1.80, 0.18, 0.20, KAR), 0.06, 4)      # Heckstossstange
    flach(box(0, -2.48, 0.54, 1.70, 0.08, 0.11, DKL))
    export("th7_lieferwagen", 0.030, 3)


def lkw():
    """Sattelzug: geloftetes Fahrerhaus mit gewoelbter Nase und Dachspoiler,
    gelofteter Auflieger mit verrundeter Bugkante. Front auf +y."""
    neu()
    BLAU = mat("LkwKabine",  (0.16,0.38,0.66), 0.45)
    BLA2 = mat("Blau dunkel",(0.11,0.27,0.48), 0.5)
    AUFL = mat("Auflieger",  (0.90,0.90,0.88), 0.55)
    AUF2 = mat("Planenband", (0.66,0.67,0.68), 0.6)
    GLAS = mat("Scheibe",    (0.24,0.34,0.42), 0.12, 0.25)
    REIF = mat("Reifen",     (0.09,0.09,0.10), 0.90)
    FELG = mat("Felge",      (0.68,0.70,0.72), 0.35, 0.55)
    RAHM = mat("Rahmen",     (0.24,0.25,0.28), 0.6, 0.3)
    CHR  = mat("Chrom",      (0.76,0.78,0.80), 0.25, 0.55)
    LIC  = mat("Scheinwerfer",(1.00,0.96,0.84), 0.20)
    ROT  = mat("Rueckleuchte",(0.78,0.13,0.11), 0.35)
    # --- Fahrerhaus (Frontlenker): Nase und Dachkante grosszuegig verrundet
    ZK0, ZKD = 0.98, 3.38
    def zk(y):
        if y <= 4.55: return ZKD
        return ZKD - 0.26*((y - 4.55)/0.67)**2
    def bk(y):
        w = 1.24
        if y > 4.60: w -= 0.15*((y - 4.60)/0.62)**2
        if y < 2.50: w -= 0.05
        return w
    def rk(y):
        if y <= 4.40: return 0.30
        return 0.30 + 0.34*((y - 4.40)/0.82)**2
    yk = [2.22,2.55,3.00,3.50,3.95,4.30,4.55,4.78,4.96,5.10,5.20]
    weich(karosse(yk, bk, ZK0, zk, BLAU, 0.24, rk, 3), 0.06, 4)
    # Windleitblech: hinten (zum Auflieger) HOCH, vorn flach — andersherum sieht es
    # aus wie ein abgestelltes Brett.
    weich(karosse([2.26,2.70,3.30,3.85,4.25,4.52],
                  lambda y: 1.18 - 0.12*max(0.0, (y - 3.9)/0.65)**2,
                  3.28, lambda y: 3.72 - 0.40*min(1.0, max(0.0, (y - 2.26)/2.26))**1.4,
                  BLAU, 0.10, 0.26, 3), 0.05, 3)
    scheibe((0.0, 4.98, 3.24), (0.0, 5.18, 2.36), 1.96, GLAS, 0.06, 0.05)
    for s in (-1, 1):                                               # Seitenscheiben + Spiegel
        box(s*1.21, 3.72, 2.62, 0.06, 1.30, 0.78, GLAS)
        weich(box(s*1.28, 4.34, 2.72, 0.11, 0.09, 0.58, BLA2), 0.04, 3)
        flach(box(s*1.22, 4.34, 2.60, 0.14, 0.05, 0.05, BLA2))
        flach(box(s*1.24, 3.10, 1.90, 0.04, 0.05, 1.60, BLA2))      # Tuerfuge
    weich(box(0, 5.22, 1.62, 2.06, 0.22, 0.44, BLA2), 0.09, 4)      # Stossstange
    weich(box(0, 5.20, 2.14, 1.70, 0.14, 0.30, RAHM), 0.05, 3)      # Kuehlergrill
    for i in range(3):
        flach(box(0, 5.26, 2.06 + i*0.11, 1.56, 0.04, 0.05, CHR))
    for s in (-1, 1):
        weich(box(s*0.74, 5.24, 1.72, 0.42, 0.10, 0.22, LIC), 0.05, 3)
        flach(zyl(s*0.98, 5.20, 1.36, 0.07, 0.16, RAHM, 10, rot=(math.pi/2, 0, 0)))
    flach(box(0, 4.92, 3.32, 1.86, 0.30, 0.08, BLA2))               # Sonnenblende
    # --- Auflieger
    ZA0, ZAD = 1.34, 3.72
    def ba(y):
        w = 1.24
        if y >  1.24: w -= 0.13*((y - 1.24)/0.46)**2
        if y < -5.00: w -= 0.05
        return w
    def ra(y):
        if y <= 1.05: return 0.20
        return 0.20 + 0.34*((y - 1.05)/0.65)**2
    ya = [-5.24,-5.05,-4.60,-3.60,-2.20,-0.80,0.40,1.05,1.32,1.52,1.66,1.70]
    weich(karosse(ya, ba, ZA0, ZAD, AUFL, 0.16, ra, 3), 0.06, 4)
    for i in range(11):                                             # Spriegel der Plane
        flach(box(0, -4.70 + i*0.62, 3.72, 1.96, 0.09, 0.05, AUF2))
    for s in (-1, 1):
        flach(box(s*1.25, -1.70, 1.52, 0.05, 6.70, 0.14, AUF2))     # Scheuerleiste
        flach(box(s*1.25, -1.70, 3.52, 0.05, 6.70, 0.14, AUF2))
    flach(box(0, -5.28, 2.50, 2.26, 0.06, 2.00, AUF2))              # Hecktueren-Fuge
    flach(box(0, -5.30, 2.50, 0.06, 0.06, 2.16, RAHM))
    for s in (-1, 1):
        weich(box(s*0.86, -5.30, 1.48, 0.28, 0.08, 0.30, ROT), 0.04, 3)
    weich(box(0, -5.32, 0.86, 2.10, 0.16, 0.20, RAHM), 0.06, 4)     # Unterfahrschutz
    for s in (-1, 1):
        flach(box(s*0.70, -5.24, 1.10, 0.10, 0.10, 0.52, RAHM))
    # --- Rahmen, Sattelplatte, Fahrwerk
    for s in (-1, 1):
        box(s*0.48, 3.60, 0.86, 0.16, 3.10, 0.28, RAHM)             # Zugmaschine
        box(s*0.56, -1.70, 1.16, 0.16, 6.70, 0.26, RAHM)            # Auflieger
    weich(box(0, 2.16, 1.24, 1.66, 1.30, 0.14, RAHM), 0.05, 3)      # Sattelplatte
    zyl(0, 2.16, 1.12, 0.34, 0.16, CHR, 16)
    for s in (-1, 1):                                               # Stuetzwinden
        box(s*0.78, -0.40, 0.86, 0.16, 0.16, 1.02, RAHM)
        flach(box(s*0.78, -0.40, 0.16, 0.30, 0.34, 0.10, RAHM))
    zyl(-0.94, 3.30, 1.02, 0.32, 1.30, CHR, 20, rot=(math.pi/2, 0, 0))   # Tank
    flach(zyl(-0.94, 3.30, 1.02, 0.35, 0.10, RAHM, 20, rot=(math.pi/2, 0, 0)))
    zyl(1.16, 2.60, 2.20, 0.09, 2.20, CHR, 12)                      # Auspuff
    flach(zyl(1.16, 2.60, 3.33, 0.11, 0.14, RAHM, 12))
    for (sy, det) in ((4.52, 1), (2.86, 1), (2.06, 0), (-3.30, 1), (-4.24, 0)):
        for s in (-1, 1):
            rad_voll(s*1.06, sy, 0.52, 0.52, 0.32, REIF, FELG, 24, 5 if det else 0, s)
            if det:
                radlauf(s*1.12, sy, 0.52, 0.68, 0.07, 0.14,
                        BLAU if sy > 1.0 else AUFL, 9)
    export("th7_lkw", 0.026, 3)


def taxi():
    """Taxi als echtes Stufenheck: untere Karosserie und Dachaufbau sind zwei
    geloftete Meshes, dazwischen umlaufendes Glas mit A-, B- und C-Saeule.
    Ein Quader mit aufgesetztem Glasklotz sah aus wie ein Spielzeugklotz."""
    neu()
    GELB = mat("Taxi",         (0.95,0.76,0.10), 0.40)
    GEL2 = mat("Taxi dunkel",  (0.78,0.60,0.07), 0.45)
    GLAS = mat("Scheibe",      (0.20,0.29,0.36), 0.10, 0.30)
    DKL  = mat("Kunststoff",   (0.14,0.14,0.16), 0.72)
    CHR  = mat("Chrom",        (0.78,0.79,0.81), 0.24, 0.55)
    REIF = mat("Reifen",       (0.09,0.09,0.10), 0.90)
    FELG = mat("Felge",        (0.72,0.74,0.76), 0.32, 0.55)
    LIC  = mat("Scheinwerfer", (1.00,0.96,0.86), 0.18)
    ROT  = mat("Rueckleuchte", (0.80,0.14,0.11), 0.32)
    # --- untere Karosserie: Motorhaube faellt nach vorn, Heck leicht abfallend
    def zs(y):
        z = 0.96
        if y >  1.00: z -= 0.24*((y - 1.00)/1.15)**1.5
        if y < -1.25: z -= 0.09*((-1.25 - y)/0.90)**1.8
        return z
    def bs(y):
        w = 0.95
        if y >  1.25: w -= 0.15*((y - 1.25)/0.90)**2
        if y < -1.55: w -= 0.11*((-1.55 - y)/0.60)**2
        return w
    yb = [-2.15,-2.02,-1.82,-1.45,-1.00,-0.45,0.15,0.70,1.20,1.58,1.86,2.04,2.14]
    weich(karosse(yb, bs, 0.26, zs, GELB, 0.19, 0.26, 3,
                  hb_o=lambda y: bs(y) - 0.035), 0.05, 4)
    # --- Dachaufbau: A- und C-Saeule entstehen als Neigung der Loft-Flaeche
    def zg(y):
        if -0.76 <= y <= 0.44: return 1.50
        if y > 0.44: return 1.50 - 0.70*((y - 0.44)/0.70)**1.45
        return 1.50 - 0.58*((-0.76 - y)/0.58)**1.55
    def bg(y):
        w = 0.87
        if y >  0.40: w -= 0.21*((y - 0.40)/0.74)**2
        if y < -0.72: w -= 0.17*((-0.72 - y)/0.62)**2
        return w
    yg = [-1.34,-1.20,-1.02,-0.76,-0.40,0.00,0.44,0.72,0.95,1.14]
    weich(karosse(yg, bg, 0.82, zg, GLAS, 0.10, 0.22, 3,
                  hb_o=lambda y: bg(y)*0.90), 0.04, 3)
    weich(karosse([-0.86,-0.60,-0.20,0.20,0.50],                    # Dachblech
                  lambda y: 0.80 - 0.05*abs(y/0.86)**2, 1.30, 1.53,
                  GELB, 0.10, 0.26, 3), 0.05, 4)
    for s in (-1, 1):                                               # A-, B-, C-Saeule
        scheibe((s*0.66, 1.09, 0.86), (s*0.66, 0.52, 1.44), 0.08, GELB, 0.07, 0.0)
        scheibe((s*0.66,-1.26, 0.88), (s*0.66,-0.74, 1.43), 0.08, GELB, 0.07, 0.0)
        box(s*0.845, -0.06, 1.16, 0.06, 0.07, 0.60, GELB)
        flach(box(s*0.86, -0.10, 0.90, 0.05, 2.10, 0.05, CHR))      # Fensterleiste
        flach(box(s*0.90, -0.10, 0.62, 0.04, 2.60, 0.09, GEL2))     # Zierleiste
        flach(box(s*0.90, -0.06, 0.70, 0.03, 0.04, 0.50, GEL2))     # Tuerfuge
        flach(box(s*0.90, -1.24, 0.70, 0.03, 0.04, 0.50, GEL2))
        flach(box(s*0.90, 1.10, 0.70, 0.03, 0.04, 0.44, GEL2))
        flach(box(s*0.88, 0.28, 0.82, 0.06, 0.16, 0.05, CHR))       # Tuergriff
        flach(box(s*0.88, -0.62, 0.82, 0.06, 0.16, 0.05, CHR))
        weich(box(s*0.98, 0.98, 1.02, 0.16, 0.08, 0.14, DKL), 0.04, 3)   # Spiegel
    # --- Raeder mit Radlauf
    for sy in (-1.32, 1.34):
        for s in (-1, 1):
            rad_voll(s*0.83, sy, 0.33, 0.33, 0.21, REIF, FELG, 24, 5, s)
            radlauf(s*0.89, sy, 0.33, 0.44, 0.055, 0.12, GELB, 9)
    # --- Front und Heck
    # Die Frontkappe endet bei z 0.72 — Grill und Leuchten muessen darunter bleiben,
    # sonst stehen sie als Balken vor der Haube in der Luft.
    weich(box(0, 2.12, 0.46, 1.70, 0.18, 0.22, DKL), 0.05, 4)       # Stossfaenger
    weich(box(0, 2.08, 0.64, 1.16, 0.10, 0.13, DKL), 0.04, 3)       # Kuehlergrill
    flach(box(0, 2.11, 0.64, 1.08, 0.05, 0.04, CHR))
    for s in (-1, 1):
        weich(box(s*0.60, 2.06, 0.63, 0.34, 0.10, 0.13, LIC), 0.04, 3)
        flach(box(s*0.52, 2.14, 0.42, 0.22, 0.05, 0.07, DKL))
        weich(box(s*0.66, -2.09, 0.73, 0.24, 0.09, 0.19, ROT), 0.04, 3)
    weich(box(0, -2.09, 0.44, 1.70, 0.16, 0.20, DKL), 0.05, 4)
    flach(box(0, -2.12, 0.62, 0.58, 0.06, 0.12, CHR))               # Kennzeichen
    flach(zyl(-0.50, -2.16, 0.34, 0.05, 0.16, DKL, 10, rot=(math.pi/2, 0, 0)))
    flach(box(0, 1.55, 0.86, 1.10, 0.90, 0.04, GEL2))               # Haubenfuge
    # --- Dachschild
    weich(box(0, 0.05, 1.63, 0.62, 0.28, 0.19,
              mat("Schildlicht", (0.97,0.87,0.32), 0.32)), 0.05, 4)
    flach(box(0, 0.05, 1.53, 0.66, 0.30, 0.06, DKL))
    export("th7_taxi", 0.022, 3)


# ============================================================ LANDMARKEN
def denkmal():
    neu()
    st = mat("Sockelstein", (0.68,0.66,0.60), 0.9)
    br = mat("Bronze", (0.36,0.30,0.16), 0.45, 0.7)
    for i,(s_,h_) in enumerate(((3.0,0.45),(2.4,0.40),(1.9,0.35))):
        box(0,0,0.225+i*0.40, s_,s_,h_, st)             # Stufensockel
    box(0,0,2.05, 1.35,1.35,2.40, st)                   # Postament
    box(0,0,3.35, 1.60,1.60,0.22, st)
    zyl(0,0,3.95,0.30,1.00, br, 12)                     # Figur (abstrahiert)
    zyl(0,0,4.70,0.20,0.55, br, 10)
    kegel(0,0,5.12,0.26,0.06,0.42, br, 10)
    export("th7_denkmal", 0.014, 3)

if __name__ == "__main__":
    print("Asset-Charge 3 (th7, modulare Gebaeude + Fahrzeuge):")
    for fn in (hochhaus_modul, hochhaus_dach, reihenhaus_modul, parkhaus, lagerhalle,
               bruecke_modul, lieferwagen, lkw, taxi, denkmal):
        fn()
    print("fertig")
