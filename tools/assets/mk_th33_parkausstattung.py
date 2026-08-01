# -*- coding: utf-8 -*-
"""Asset-Charge 33 (th33_*): PARK-AUSSTATTUNG.
Baut auf Charge 9 (th13_*, Jahrmarkt) auf und ergaenzt sie um das, was dort fehlt:
eine echte Streckenfuehrung fuer die Achterbahn und die grossen Fahrgeschaefte
eines Parks. Familienfreundlich, keine Waffen, kein Blut.

Konventionen wie th5-th13 (siehe models/TH5-ASSETS.md):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * Schauseite (Eingang/Theke/Schriftzug) liegt auf Blender +y  ->  three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT, sonst fehlt der Bevel im GLB.
  * `primitive_cube_add(size=1)` -> Kantenlaenge 1, Skalierung = Mass (NICHT /2).
  * `rot=(pi/2,0,0)` legt die Zylinderachse auf -y; fuer Raeder braucht es `rot=(0,pi/2,0)`.
  * Lichter sind emissive Materialien — ein Park lebt vom Licht.

MODULE (reihbar, damit man ganze Wege damit einfassen kann)
  `th33_warteschlange_modul`  4,000 m in x  ->  x += 4,00
  `th33_parkzaun_modul`       4,000 m in x  ->  x += 4,00
  Beide enden buendig auf halber Modullaenge, die Pfosten stehen bei +-2,00
  GENAU auf der Stossfuge — zwei Module teilen sich also einen Pfosten und die
  Reihe bekommt keine Doppelpfosten.

Texturen kommen aus `textures/th32` (Charge 32) — dieselbe Familie, damit Park
und Ausstattung zusammenpassen.
"""
import bpy, bmesh, os, math
from mathutils import Vector

TEXDIR = "/home/user/aban-news-landing/textures/th32"
_TEXCACHE = {}

OUT_GLB = "/home/user/aban-news-landing/models"
OUT_STL = "/home/user/aban-news-landing/models/stl"
os.makedirs(OUT_STL, exist_ok=True)

TAU = math.tau

def neu():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _TEXCACHE.clear()   # die alten Image-Datenbloecke sind jetzt ungueltig

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
    if emit is not None:
        b.inputs["Emission Color"].default_value = (emit[0], emit[1], emit[2], 1)
        b.inputs["Emission Strength"].default_value = estr
    return m


def mat_bild(name, datei, farbe=(1.0,1.0,1.0), rough=0.8, metal=0.0):
    """Material mit echter Bildtextur. Die Textur landet IM GLB (Blender bettet sie
    beim glTF-Export ein), das Spiel braucht also keine Extra-Verdrahtung.
    Prozedurale Koordinaten-Knoten (TexCoord/Mapping mit `Generated`) exportiert
    glTF NICHT — deshalb wird ueber echte UVs gekachelt, siehe `uv_kacheln()`."""
    m = mat(name, farbe, rough, metal)
    nt = m.node_tree
    tex = nt.nodes.new("ShaderNodeTexImage")
    if datei not in _TEXCACHE:
        _TEXCACHE[datei] = bpy.data.images.load(os.path.join(TEXDIR, datei))
    tex.image = _TEXCACHE[datei]
    tex.extension = 'REPEAT'
    tex.location = (-380, 240)
    b = nt.nodes["Principled BSDF"]
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    return m

def uv_kacheln(o, kachel=2.0):
    """UVs auf Weltmass bringen. Eine Wuerfelseite hat UV 0..1, egal ob sie 0,2 m
    oder 30 m gross ist — ohne Umrechnung ist dieselbe Textur auf dem Boden riesig
    und am Pfosten winzig. Skaliert wird mit den beiden GROESSTEN Abmessungen des
    Objekts; fuer Platten, Decks und Daecher ist das genau richtig."""
    if o is None or o.type != 'MESH' or not o.data.uv_layers: return o
    d = sorted([abs(v) for v in o.dimensions], reverse=True)
    fu, fv = max(0.05, d[0]/kachel), max(0.05, d[1]/kachel)
    uv = o.data.uv_layers[0].data
    for l in uv:
        l.uv[0] *= fu; l.uv[1] *= fv
    return o

def leucht(name, rgb, estr=3.0):
    return mat(name, rgb, 0.25, 0.0, rgb, estr)

def box(x, y, z, sx, sy, sz, m=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    o = bpy.context.active_object; o.scale = (sx, sy, sz)
    if m: o.data.materials.append(m)
    return o

def zyl(x, y, z, r, h, m=None, seg=16, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x,y,z),
                                        vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kugel(x, y, z, r, m=None, seg=10):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=seg*2, ring_count=seg)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kegel(x, y, z, r1, r2, h, m=None, seg=12, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z),
                                    vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def ring_t(x, y, z, R, r, m=None, mj=24, mn=8, rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(location=(x,y,z), rotation=rot,
                                     major_radius=R, minor_radius=r,
                                     major_segments=mj, minor_segments=mn)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def halbkugel(x, y, z, r, m=None, seg=16, flach=1.0):
    """Kuppel: obere Haelfte einer Kugel. Eine skalierte Vollkugel ist KEINE Kuppel —
    ihre untere Haelfte steckt im Bauwerk und taucht unter z=0."""
    o = kugel(x, y, z, r, m, seg)
    nur(o)
    if abs(flach - 1.0) > 1e-6:
        o.scale[2] = flach
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=(0,0,0), plane_no=(0,0,1), clear_inner=True)
    bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    bm.to_mesh(o.data); bm.free(); o.data.update()
    return o

def strebe(p0, p1, d, m=None):
    """Schraege Strebe zwischen zwei Punkten — als Quader, damit sie im Bevel
    sauber bleibt. Die Rotation wird aus der Richtung gerechnet."""
    v = Vector(p1) - Vector(p0); L = v.length
    if L < 1e-5: return None
    o = box((p0[0]+p1[0])/2, (p0[1]+p1[1])/2, (p0[2]+p1[2])/2, L, d, d, m)
    o.rotation_euler = v.to_track_quat('X', 'Z').to_euler()
    return o

def giebel(cx, cy, cz, halbb, hoehe, tiefe, m=None, achse='x'):
    """Dreiecksgiebel als echtes Prisma. `kegel(vertices=4)` taugt dafuer NICHT:
    das ergibt eine Pyramide, deren Ecken auf den Achsen liegen."""
    h2 = tiefe/2.0
    if achse == 'x':
        v = [(-halbb,-h2,0), (halbb,-h2,0), (0,-h2,hoehe),
             (-halbb, h2,0), (halbb, h2,0), (0, h2,hoehe)]
    else:
        v = [(-h2,-halbb,0), (-h2,halbb,0), (-h2,0,hoehe),
             ( h2,-halbb,0), ( h2,halbb,0), ( h2,0,hoehe)]
    f = [(0,1,2), (3,5,4), (0,2,5,3), (1,4,5,2), (0,3,4,1)]
    me = bpy.data.meshes.new("Giebel"); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new("Giebel", me); bpy.context.collection.objects.link(o)
    o.location = (cx, cy, cz)
    if m: me.materials.append(m)
    bpy.context.view_layer.objects.active = o
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free(); me.update()
    uvl = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            uvl.data[li].uv = ((v.x if achse == 'x' else v.y), v.z)
    return o

def girlande(p0, p1, n, sag, mats, rad=0.10, kabel=None):
    """Lichterkette mit Durchhang zwischen zwei Punkten."""
    for i in range(n + 1):
        t = i/float(n)
        x = p0[0] + (p1[0]-p0[0])*t
        y = p0[1] + (p1[1]-p0[1])*t
        z = p0[2] + (p1[2]-p0[2])*t - sag*math.sin(math.pi*t)
        if kabel and i < n:
            t2 = (i+1)/float(n)
            x2 = p0[0] + (p1[0]-p0[0])*t2
            y2 = p0[1] + (p1[1]-p0[1])*t2
            z2 = p0[2] + (p1[2]-p0[2])*t2 - sag*math.sin(math.pi*t2)
            strebe((x,y,z), (x2,y2,z2), 0.035, kabel)
        kugel(x, y, z, rad, mats[i % len(mats)], 7)

def runden(width=0.02, segments=2, winkel=42):
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': continue
        nur(o)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
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

def flach(o):
    """Vom globalen Bevel ausnehmen (Torus, Lampenkugeln — schon rund)."""
    if o is not None: o["nb"] = 1
    return o

def dreh_anim(objs, name, achse=2, frames=120, umdrehungen=1.0, hin_her=False,
              winkel=None, pivot=(0.0, 0.0, 0.0)):
    """Bewegte Baugruppe: die Objekte bekommen ein Empty als Elternteil, das Empty
    wird animiert. So dreht sich alles GEMEINSAM um EINE Achse.

    ⚠️ Zwei Fallen, die glTF-Animationen sonst still kaputtmachen:
      1. glTF speichert Rotationen als QUATERNION. Zwei Keyframes 0 -> 360 Grad
         sind fuer den Interpolator identisch — der Spieler sieht KEINE Drehung.
         Deshalb wird jede Umdrehung in Viertelschritte zerlegt.
      2. Die Standard-Interpolation ist BEZIER. Eine Dauerdrehung ruckelt dann an
         jedem Keyframe. Alle Keys werden auf LINEAR gesetzt.
    `hin_her=True` + `winkel` gibt stattdessen eine Pendelbewegung (Schiffschaukel)."""
    emp = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(emp)
    emp.empty_display_size = 0.5
    emp.location = pivot
    bpy.context.view_layer.update()
    for o in objs:
        if o is None: continue
        o.parent = emp
        # OHNE die Inverse springt jedes Kind um die Elternposition — der Kettenflieger
        # stand danach 11 m ueber dem Mast.
        o.matrix_parent_inverse = emp.matrix_world.inverted()
    if hin_her:
        w = winkel if winkel is not None else math.radians(30)
        keys = [(0, -w), (frames*0.25, 0.0), (frames*0.5, w),
                (frames*0.75, 0.0), (frames, -w)]
        ipol = 'BEZIER'          # Pendel: Bezier ist hier RICHTIG (Umkehrpunkte weich)
    else:
        n = max(4, int(round(4*abs(umdrehungen))))
        keys = [(frames*i/n, TAU*umdrehungen*i/n) for i in range(n + 1)]
        ipol = 'LINEAR'
    # Interpolation ueber die VOREINSTELLUNG setzen, nicht ueber `action.fcurves`:
    # Blender 5 hat die Action-API auf Layer/Slots umgestellt, `fcurves` gibt es
    # dort nicht mehr (AttributeError beim ersten Lauf).
    prefs = bpy.context.preferences.edit
    alt_ip = prefs.keyframe_new_interpolation_type
    prefs.keyframe_new_interpolation_type = ipol
    try:
        for f, a in keys:
            emp.rotation_euler[achse] = a
            emp.keyframe_insert("rotation_euler", frame=max(1.0, f), index=achse)
    finally:
        prefs.keyframe_new_interpolation_type = alt_ip
    return emp

def export(name, bevel=0.02, seg=2, anim=None):
    """`anim` ist eine Funktion, die NACH dem Runden die Baugruppen verhaengt und
    animiert. Reihenfolge ist wichtig: `runden()` wendet Transformationen an —
    danach zu parenten ist sicher, davor wuerde das Elternteil mitskaliert."""
    runden(bevel, seg)
    if anim: anim()
    for o in bpy.context.scene.objects: o.select_set(True)
    p1 = os.path.join(OUT_GLB, name + ".glb")
    # export_apply=True ist PFLICHT — sonst landet der Bevel NICHT im GLB.
    bpy.ops.export_scene.gltf(filepath=p1, export_format='GLB', use_selection=False,
                              export_apply=True, export_animations=True,
                              export_frame_range=False, export_anim_slide_to_zero=True)
    p2 = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p2)
    except Exception: bpy.ops.export_mesh.stl(filepath=p2)
    print("  ->", name, os.path.getsize(p1), "B")

def felskoerper(cx, cy, z0, sx, sy, sz, m, seed=0, rau=0.28, unterteil=3,
                kipp=(0.0, 0.0, 0.0), flachboden=True, name="Felskoerper"):
    """Unregelmaessiger Fels statt Quader — uebernommen aus Charge 26 (th26).
    Icosphaere mit radial verrauschten Punkten, danach EXAKT auf (sx, sy, sz)
    normiert: nur so bleibt das Mass erhalten und der tiefste Punkt liegt auf z0.
    Achtung: Blenders `subdivisions` zaehlt Stufen (1->20 Dreiecke, 2->80, 3->320),
    und `runden()` darf den Koerper nicht anfassen — Bevel + Auto-Smooth machen
    aus dem facettierten Fels einen Kartoffel-Blob."""
    import random as _r
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=unterteil, radius=1.0)
    rnd = _r.Random(seed)
    R = __import__("mathutils").Euler(kipp, 'XYZ').to_matrix()
    for v in bm.verts:
        v.co *= (1.0 + rnd.uniform(-rau, rau))
        if flachboden and v.co.z < -0.55:
            v.co.z = -0.55 - (v.co.z + 0.55)*0.25
        v.co = R @ v.co
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if m: me.materials.append(m)
    xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
    mnx, mxx, mny, mxy, mnz, mxz = min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)
    fx = sx/max(1e-6, mxx-mnx); fy = sy/max(1e-6, mxy-mny); fz = sz/max(1e-6, mxz-mnz)
    for v in me.vertices:
        v.co.x = (v.co.x - (mnx+mxx)/2)*fx
        v.co.y = (v.co.y - (mny+mxy)/2)*fy
        v.co.z = (v.co.z - mnz)*fz
    me.update()
    o.location = (cx, cy, z0); o["nb"] = 1
    bpy.context.view_layer.objects.active = o
    return o

def seit(vorher):
    """Alle Objekte, die seit dem Schnappschuss `vorher` dazugekommen sind —
    so muss keine Baugruppe von Hand aufgelistet werden."""
    return [o for o in bpy.context.scene.objects if o not in vorher]

FB = 0.12   # Oberkante der Parkbodenplatte. Jedes Geraet bekommt sein z als
            # FB + Hoehe ueber Boden — sonst steckt es im Belag.

def platte(B, T, m, z=None):
    return box(0, 0, (z if z else FB)/2.0, B, T, (z if z else FB), m)

# ---------------------------------------------------------------- Schienenprofil
# Masse aus th13_achterbahn_modul, damit die Teile zusammenpassen.
SPUR, ZS, PROF, ROHR = 0.62, 6.60, 0.15, 0.28

def gleis_segment(p0, p1, m_sch, m_rohr=None, quer=None):
    """EIN Schienensegment zwischen zwei Mittelpunkten der Fahrbahn.
    Beide Schienen werden entlang der Segmentrichtung gelegt und um die
    Fahrbahnmitte seitlich versetzt — bei einer KURVE darf der Versatz nicht
    entlang der Welt-y-Achse laufen, sondern muss senkrecht zur Fahrtrichtung
    stehen, sonst laufen die Schienen im Bogen auseinander."""
    a, b = Vector(p0), Vector(p1)
    v = b - a; L = v.length
    if L < 1e-6: return
    n = Vector((-v.y, v.x, 0.0))          # Normale in der Grundrissebene
    if n.length < 1e-6: n = Vector((0.0, 1.0, 0.0))
    n.normalize()
    for s in (-1, 1):
        o = strebe(tuple(a + n*(s*SPUR)), tuple(b + n*(s*SPUR)), PROF, m_sch)
    if m_rohr:
        strebe(tuple(a - Vector((0,0,ROHR))), tuple(b - Vector((0,0,ROHR))), 0.20, m_rohr)
    if quer:
        mid = (a + b)/2 - Vector((0, 0, 0.14))
        o = strebe(tuple(mid - n*0.80), tuple(mid + n*0.80), 0.11, quer)


# ================================================================ 1) Warteschlangen-Modul
def warteschlange_modul():
    """Absperrung fuer die Warteschlange, 4,000 m Raster, reihbar (x += 4,00).
    Der Pfosten steht NUR am linken Modulende. Erst hatte jedes Modul beide Enden
    — aneinandergereiht standen dann zwei deckungsgleiche Pfosten auf jeder Fuge
    (Z-Fighting). So kommt jeder Pfosten in einer Reihe genau einmal vor; das
    letzte Modul bekommt seinen Abschlusspfosten vom Spiel oder bleibt offen.
    Der Gurt haengt durch — ein gerader Gurt sieht aus wie ein Rohr, nicht wie Band."""
    neu()
    PFO = mat("WsPfosten", (0.72,0.74,0.78), 0.35, 0.55)
    FUSS= mat("WsFuss",    (0.22,0.24,0.28), 0.6, 0.3)
    GURT= mat("WsGurt",    (0.86,0.18,0.20), 0.75)
    KAPP= mat("WsKappe",   (0.92,0.74,0.22), 0.35, 0.6)
    L, ZP = 4.0, 1.02
    for px in (-L/2,):        # NUR links — sonst steht in einer Reihe jeder Pfosten doppelt
        zyl(px, 0, 0.05, 0.26, 0.10, FUSS, 16)
        zyl(px, 0, 0.09, 0.20, 0.06, FUSS, 16)
        zyl(px, 0, ZP/2 + 0.10, 0.045, ZP, PFO, 12)
        zyl(px, 0, ZP + 0.13, 0.075, 0.09, KAPP, 12)
    n = 12                                          # Gurt mit Durchhang
    for i in range(n):
        t0, t1 = i/n, (i + 1)/n
        x0, x1 = -L/2 + L*t0, -L/2 + L*t1
        z0 = ZP + 0.02 - 0.16*math.sin(math.pi*t0)
        z1 = ZP + 0.02 - 0.16*math.sin(math.pi*t1)
        o = strebe((x0, 0, z0), (x1, 0, z1), 0.055, GURT)
        # `box()` hat die Skalierung schon auf die Bauteilmasse gesetzt — hier MUSS
        # multipliziert werden. Ein `= 1.9` machte aus dem Gurt ein 1,9 m dickes Brett.
        if o: o.scale[1] *= 1.9                     # Band, nicht Schnur
    export("th33_warteschlange_modul", 0.012, 2)

# ================================================================ 2) Parkzaun-Modul
def parkzaun_modul():
    """Schmiedeeiserner Parkzaun, 4,000 m Raster, reihbar (x += 4,00).
    Pfosten nur am linken Modulende — Begruendung siehe `warteschlange_modul`."""
    neu()
    EISN = mat("PzEisen",  (0.16,0.20,0.24), 0.55, 0.4)
    GOLD = mat("PzGold",   (0.86,0.70,0.26), 0.35, 0.65)
    SOCK = mat("PzSockel", (0.60,0.58,0.54), 0.9)
    L, ZH = 4.0, 1.35
    box(0, 0, 0.11, L, 0.34, 0.22, SOCK)                      # durchlaufender Sockel
    for px in (-L/2,):        # NUR links — sonst steht in einer Reihe jeder Pfosten doppelt
        box(px, 0, ZH/2 + 0.20, 0.20, 0.20, ZH, EISN)
        kegel(px, 0, ZH + 0.32, 0.14, 0.02, 0.24, GOLD, 8)
    for zz in (0.42, 1.28):                                   # Riegel
        box(0, 0, zz, L - 0.20, 0.07, 0.07, EISN)
    n = 15
    for i in range(n):                                        # Staebe mit Spitze
        px = -L/2 + L*(i + 0.5)/n
        box(px, 0, ZH/2 + 0.22, 0.05, 0.05, ZH - 0.06, EISN)
        kegel(px, 0, ZH + 0.28, 0.045, 0.005, 0.16, GOLD, 6)
    export("th33_parkzaun_modul", 0.010, 2)

# ================================================================ 3) Parklaterne
def parklaterne():
    """Park-Laterne mit zwei Leuchten, Wimpel und Blumenampel — die Stadtlaterne
    (th4/th5) sieht in einem Freizeitpark aus wie ein Strassenmast."""
    neu()
    MAST = mat("PlMast",  (0.14,0.18,0.22), 0.5, 0.45)
    GOLD = mat("PlGold",  (0.88,0.72,0.26), 0.35, 0.65)
    GLAS = mat("PlGlas",  (0.96,0.92,0.72), 0.2, 0.0, (1.0,0.94,0.72), 2.2)
    WIMP = mat("PlWimpel",(0.90,0.22,0.24), 0.75)
    WIM2 = mat("PlWimpel2",(0.98,0.84,0.24), 0.75)
    GRUE = mat("PlGruen", (0.20,0.48,0.22), 0.85)
    BLUM = mat("PlBluete",(0.95,0.45,0.62), 0.7)
    H = 4.6
    zyl(0, 0, 0.09, 0.34, 0.18, MAST, 16)
    zyl(0, 0, 0.28, 0.24, 0.30, MAST, 16)
    zyl(0, 0, H/2 + 0.20, 0.085, H, MAST, 12)
    for zz in (1.30, 2.60):
        flach(ring_t(0, 0, zz, 0.13, 0.035, GOLD, 12, 6))
    box(0, 0, H + 0.24, 1.90, 0.10, 0.10, MAST)               # Ausleger
    for sx in (-1, 1):                                        # zwei Leuchten
        px = sx*0.86
        box(px, 0, H + 0.12, 0.09, 0.09, 0.28, MAST)
        kegel(px, 0, H - 0.14, 0.30, 0.16, 0.42, GLAS, 8)
        kegel(px, 0, H + 0.14, 0.34, 0.06, 0.22, GOLD, 8)
        flach(kugel(px, 0, H - 0.34, 0.10, GLAS, 8))
    kegel(0, 0, H + 0.62, 0.16, 0.02, 0.34, GOLD, 8)          # Spitze
    for i in range(6):                                        # Wimpelkette am Mast
        t = i/5.0
        px = -0.80 + 1.60*t
        pz = H - 0.05 - 0.30*math.sin(math.pi*t)
        o = box(px, 0.06, pz - 0.16, 0.20, 0.02, 0.26, (WIMP, WIM2)[i % 2])
        o.rotation_euler[1] = 0.5 - t
    for sx in (-1, 1):                                        # Blumenampel
        px = sx*0.62
        zyl(px, 0, 2.68, 0.24, 0.30, mat("PlAmpel", (0.55,0.36,0.22), 0.85), 12)
        for k in range(7):
            a = TAU*k/7.0
            flach(kugel(px + math.cos(a)*0.20, math.sin(a)*0.20, 2.86, 0.11, GRUE, 7))
            flach(kugel(px + math.cos(a)*0.24, math.sin(a)*0.24, 2.76, 0.075, BLUM, 6))
    export("th33_parklaterne", 0.014, 2)

# ================================================================ 4) Wegweiser
def wegweiser():
    """Wegweiser mit vier Schildern zu den Fahrgeschaeften. Die Schilder zeigen
    in VIER Richtungen und sitzen auf verschiedenen Hoehen — alle auf einer Hoehe
    sehen aus wie ein Kreuz, nicht wie ein Wegweiser."""
    neu()
    HOLZ = mat("WwHolz",  (0.52,0.34,0.18), 0.86)
    HOL2 = mat("WwHolz2", (0.64,0.46,0.26), 0.86)
    FARB = [mat("WwS1", (0.90,0.28,0.26), 0.7), mat("WwS2", (0.20,0.56,0.86), 0.7),
            mat("WwS3", (0.24,0.68,0.40), 0.7), mat("WwS4", (0.96,0.74,0.20), 0.7)]
    GOLD = mat("WwGold",  (0.88,0.72,0.26), 0.35, 0.6)
    STEI = mat("WwStein", (0.58,0.56,0.52), 0.9)
    zyl(0, 0, 0.14, 0.52, 0.28, STEI, 14)
    zyl(0, 0, 1.70, 0.11, 2.90, HOLZ, 10)
    for i in range(4):                                        # Schilder rundum, gestaffelt
        a = TAU*i/4.0 + 0.4
        zz = 1.10 + i*0.42
        o = box(math.cos(a)*0.66, math.sin(a)*0.66, zz, 1.20, 0.08, 0.30, FARB[i])
        o.rotation_euler[2] = a
        p = box(math.cos(a)*1.20, math.sin(a)*1.20, zz, 0.30, 0.10, 0.30, FARB[i])
        p.rotation_euler[2] = a + math.pi/4                   # angespitztes Ende
        r = box(math.cos(a)*0.66, math.sin(a)*0.66, zz - 0.17, 1.24, 0.10, 0.05, HOL2)
        r.rotation_euler[2] = a
    kegel(0, 0, 3.30, 0.20, 0.03, 0.36, GOLD, 8)
    export("th33_wegweiser", 0.012, 2)

# ================================================================ 5) Imbisswagen
def imbisswagen():
    """Foodtruck auf Raedern mit Klappe, Markise, Theke und Menuetafel.
    Schauseite (Ausgabe) auf +y."""
    neu()
    KARO = mat("IwKarosse", (0.92,0.36,0.32), 0.5)
    KAR2 = mat("IwKarosse2",(0.98,0.94,0.88), 0.55)
    DACH = mat_bild("IwMarkise", "zeltbahn.png", (1.0,1.0,1.0), 0.7)
    HOLZ = mat("IwTheke",   (0.60,0.42,0.24), 0.85)
    STAH = mat("IwStahl",   (0.70,0.72,0.76), 0.4, 0.5)
    REIF = mat("IwReifen",  (0.10,0.10,0.12), 0.9)
    FELG = mat("IwFelge",   (0.80,0.82,0.86), 0.35, 0.6)
    TAFE = mat("IwTafel",   (0.12,0.14,0.13), 0.85)
    KREI = mat("IwKreide",  (0.94,0.94,0.90), 0.8)
    L_W  = leucht("IwLampe", (1.0,0.95,0.78), 2.6)
    B, T, ZB = 4.6, 2.2, 0.72
    box(0, 0, ZB + 1.05, B, T, 2.10, KARO)                    # Kasten
    box(0, 0, ZB + 0.22, B + 0.06, T + 0.06, 0.34, KAR2)      # Zierstreifen
    box(0, 0, ZB + 2.16, B + 0.14, T + 0.14, 0.14, KAR2)      # Dachkante
    box(0, -T/2 - 0.20, ZB + 1.05, 0.9, 0.40, 1.60, KARO)     # Fahrerkabine
    box(0, -T/2 - 0.34, ZB + 1.44, 0.72, 0.14, 0.60,
        mat("IwGlas", (0.62,0.80,0.88), 0.15, 0.1))
    box(0, T/2 + 0.02, ZB + 1.32, 3.20, 0.10, 1.10, TAFE)     # Ausgabeoeffnung
    o = box(0, T/2 + 0.52, ZB + 2.10, 3.40, 1.00, 0.10, KAR2) # hochgeklappte Klappe
    o.rotation_euler[0] = -0.5
    box(0, T/2 + 0.34, ZB + 0.86, 3.40, 0.44, 0.12, HOLZ)     # Theke
    for sx in (-1, 1):
        box(sx*1.60, T/2 + 0.52, ZB + 0.42, 0.08, 0.08, 0.84, STAH)
    uv_kacheln(box(0, T/2 + 1.10, ZB + 2.28, 4.20, 1.80, 0.10, DACH), 1.4)  # Markise
    for sx in (-1, 1):
        box(sx*2.00, T/2 + 1.90, ZB + 1.16, 0.07, 0.07, 2.24, STAH)
    for i in range(9):
        flach(kugel(-1.9 + i*0.475, T/2 + 1.96, ZB + 2.20, 0.09, L_W, 7))
    box(-2.55, T/2 + 0.30, ZB + 0.90, 0.10, 0.70, 1.20, TAFE) # Menuetafel
    for i in range(4):
        box(-2.60, T/2 + 0.30, ZB + 1.28 - i*0.20, 0.02, 0.48 - (i % 2)*0.12, 0.05, KREI)
    for sx in (-1, 1):                                        # Raeder
        for sy in (-1, 1):
            flach(zyl(sx*1.55, sy*(T/2 - 0.18), 0.38, 0.38, 0.26, REIF, 16, rot=(0, math.pi/2, 0)))
            flach(zyl(sx*1.55, sy*(T/2 - 0.18), 0.38, 0.19, 0.28, FELG, 12, rot=(0, math.pi/2, 0)))
    box(2.45, 0, 0.30, 0.12, 0.60, 0.60, STAH)                # Stuetze vorn
    export("th33_imbisswagen", 0.014, 2)

# ================================================================ 6) Toilettenhaus
def toilettenhaus():
    """WC-Haeuschen mit zwei Eingaengen und Piktogrammen. Schauseite +y.
    Die Tueroeffnungen sind ECHTE Luecken (Wand aus drei Stuecken), keine
    aufgemalten Rechtecke — man laeuft im Spiel sonst gegen eine Tuer."""
    neu()
    WAND = mat("ToWand",  (0.90,0.88,0.82), 0.85)
    SOCK = mat("ToSockel",(0.52,0.50,0.46), 0.9)
    DACH = mat("ToDach",  (0.30,0.52,0.42), 0.7)
    HOLZ = mat("ToHolz",  (0.52,0.36,0.20), 0.85)
    BLAU = mat("ToBlau",  (0.20,0.44,0.80), 0.6)
    ROSA = mat("ToRosa",  (0.86,0.32,0.52), 0.6)
    DKL  = mat("ToDunkel",(0.10,0.11,0.13), 0.9)
    B, T, H = 6.4, 4.4, 2.9
    box(0, 0, 0.10, B + 0.6, T + 0.6, 0.20, SOCK)
    box(0, -T/2, H/2 + 0.20, B, 0.26, H, WAND)                # Rueckwand
    for sx in (-1, 1):
        box(sx*B/2, 0, H/2 + 0.20, 0.26, T, H, WAND)          # Seitenwaende
    box(0, T/2, H/2 + 0.20, 1.30, 0.26, H, WAND)              # Mittelpfeiler vorn
    for sx in (-1, 1):                                        # Front mit ECHTEN Oeffnungen
        box(sx*(B/2 - 0.65), T/2, H/2 + 0.20, 1.30, 0.26, H, WAND)
        box(sx*1.72, T/2, H - 0.10, 1.55, 0.26, 0.80, WAND)   # Sturz ueber der Tuer
        box(sx*1.72, T/2 + 0.02, 1.10, 1.10, 0.10, 1.80, DKL) # dunkler Durchgang
        box(sx*1.72, T/2 + 0.20, 2.24, 0.42, 0.06, 0.42, BLAU if sx < 0 else ROSA)
    box(0, 0, H + 0.34, B + 0.9, T + 0.9, 0.28, DACH)
    giebel(0, 0, H + 0.48, (B + 0.9)/2, 1.10, T + 0.9, DACH, 'x')
    for sx in (-1, 1):
        box(sx*(B/2 + 0.30), T/2 + 0.30, 1.30, 0.14, 0.14, 2.20, HOLZ)
    box(0, T/2 + 0.26, H + 0.62, 2.40, 0.10, 0.42, DKL)       # Schild "WC"
    for i in range(2):
        box(-0.34 + i*0.68, T/2 + 0.33, H + 0.62, 0.22, 0.04, 0.28, WAND)
    export("th33_toilettenhaus", 0.016, 2)

# ================================================================ 7) Parkplan-Tafel
def parkplan():
    """Grosse Uebersichtstafel am Eingang: Karte unter einem Dach, mit Leuchtband
    und farbigen Markierungen."""
    neu()
    RAHM = mat("PpRahmen", (0.42,0.28,0.16), 0.85)
    DACH = mat_bild("PpDach", "zeltbahn.png", (1.0,1.0,1.0), 0.7)
    KART = mat("PpKarte",  (0.90,0.88,0.78), 0.8)
    WEG  = mat("PpWeg",    (0.72,0.66,0.52), 0.8)
    GRUE = mat("PpGruen",  (0.36,0.62,0.34), 0.8)
    WASS = mat("PpWasser", (0.34,0.62,0.80), 0.4)
    GOLD = mat("PpGold",   (0.88,0.72,0.26), 0.35, 0.6)
    L_W  = leucht("PpLampe", (1.0,0.95,0.78), 2.4)
    PKT  = [mat("PpP1",(0.92,0.28,0.26),0.6), mat("PpP2",(0.24,0.60,0.90),0.6),
            mat("PpP3",(0.30,0.74,0.42),0.6), mat("PpP4",(0.98,0.76,0.20),0.6)]
    B, ZM = 3.4, 1.98
    for sx in (-1, 1):
        box(sx*(B/2 - 0.12), 0, 0.12, 0.30, 0.50, 0.24, RAHM)
        box(sx*(B/2 - 0.12), 0, 1.20, 0.22, 0.22, 2.16, RAHM)
    o = box(0, 0.06, ZM, B - 0.30, 0.10, 1.50, KART)          # Kartenblatt, leicht geneigt
    o.rotation_euler[0] = -0.18
    ob = box(0, 0.02, ZM, B - 0.14, 0.14, 1.66, RAHM); ob.rotation_euler[0] = -0.18
    def aufKarte(u, v, bu, bv, m):                            # u,v in Kartenkoordinaten
        q = box(u, 0.115 + v*0.032, ZM + v*0.98, bu, 0.03, bv*0.98, m)
        q.rotation_euler[0] = -0.18
        return q
    aufKarte(0, 0.02, 2.70, 0.16, WEG); aufKarte(0.0, 0.30, 0.16, 0.60, WEG)
    aufKarte(-0.90, -0.34, 0.90, 0.34, GRUE); aufKarte(0.95, -0.30, 0.80, 0.30, WASS)
    for i in range(4):
        aufKarte(-1.05 + i*0.70, 0.44, 0.16, 0.16, PKT[i])
    box(0, 0.30, ZM + 1.16, B + 0.30, 0.80, 0.10, DACH)
    uv_kacheln(box(0, 0.30, ZM + 1.16, B + 0.30, 0.80, 0.10, DACH), 1.2)
    for i in range(7):
        flach(kugel(-1.5 + i*0.5, 0.62, ZM + 1.08, 0.085, L_W, 7))
    kegel(0, 0, ZM + 1.52, 0.16, 0.02, 0.28, GOLD, 8)
    export("th33_parkplan", 0.012, 2)

# ================================================================ 8) Kassenhaeuschen
def kassenhaus():
    """Einzelnes Kassenhaeuschen mit Schalterscheibe, Ablage und Preisschild.
    Schauseite (Schalter) auf +y."""
    neu()
    WAND = mat("KhWand",  (0.94,0.88,0.72), 0.85)
    SOCK = mat("KhSockel",(0.54,0.50,0.44), 0.9)
    DACH = mat("KhDach",  (0.24,0.52,0.72), 0.65)
    HOLZ = mat("KhHolz",  (0.52,0.34,0.18), 0.85)
    GLAS = mat("KhGlas",  (0.66,0.82,0.90), 0.15, 0.1)
    GOLD = mat("KhGold",  (0.88,0.72,0.26), 0.35, 0.6)
    SCHI = mat("KhSchild",(0.14,0.18,0.26), 0.4, 0.0, (0.98,0.72,0.20), 2.0)
    L_W  = leucht("KhLampe", (1.0,0.95,0.78), 2.6)
    B, T, H = 2.8, 2.6, 2.7
    box(0, 0, 0.10, B + 0.5, T + 0.5, 0.20, SOCK)
    box(0, 0, H/2 + 0.20, B, T, H, WAND)
    box(0, 0, 0.50, B + 0.12, T + 0.12, 0.44, HOLZ)           # Sockelband
    box(0, T/2 + 0.02, 1.72, 1.90, 0.12, 1.05, GLAS)          # Schalterscheibe
    box(0, T/2 + 0.06, 1.72, 2.10, 0.10, 1.25, HOLZ)
    box(0, T/2 + 0.05, 1.16, 2.20, 0.10, 0.12, HOLZ)          # Sprechschlitz
    box(0, T/2 + 0.26, 1.02, 2.30, 0.42, 0.12, HOLZ)          # Ablage
    box(0, 0, H + 0.34, B + 0.9, T + 0.9, 0.26, DACH)
    kegel(0, 0, H + 1.06, 2.10, 0.10, 1.20, DACH, 8)
    kegel(0, 0, H + 1.82, 0.18, 0.02, 0.34, GOLD, 8)
    box(0, T/2 + 0.30, H + 0.72, 2.00, 0.14, 0.62, SCHI)      # Preisschild
    for i in range(6):
        flach(kugel(-0.9 + i*0.36, T/2 + 0.42, H + 0.28, 0.09, L_W, 7))
    export("th33_kassenhaus", 0.014, 2)

# ================================================================ 9) Blumenrabatte
def blumenrabatte():
    """Bepflanzte Rabatte mit Einfassung — fuer Wegraender und Platzmitten.
    Die Blueten sitzen in einem UNREGELMAESSIGEN Raster; ein exaktes Gitter sieht
    aus wie eine Sortieranlage, nicht wie ein Beet."""
    neu()
    EINF = mat("BrEinfassung", (0.62,0.58,0.52), 0.9)
    ERDE = mat("BrErde",       (0.24,0.17,0.12), 0.95)
    GRUE = mat("BrGruen",      (0.20,0.46,0.20), 0.88)
    GRU2 = mat("BrGruen2",     (0.26,0.56,0.26), 0.88)
    FARB = [mat("BrB1",(0.94,0.30,0.34),0.7), mat("BrB2",(0.98,0.80,0.24),0.7),
            mat("BrB3",(0.92,0.48,0.72),0.7), mat("BrB4",(0.66,0.42,0.92),0.7),
            mat("BrB5",(0.98,0.96,0.92),0.7)]
    B, T = 4.0, 2.2
    for sy in (-1, 1): box(0, sy*(T/2 - 0.12), 0.16, B, 0.24, 0.32, EINF)
    for sx in (-1, 1): box(sx*(B/2 - 0.12), 0, 0.16, 0.24, T - 0.48, 0.32, EINF)
    box(0, 0, 0.20, B - 0.44, T - 0.44, 0.30, ERDE)
    import random as _r
    rnd = _r.Random(33)
    for i in range(46):
        px = rnd.uniform(-B/2 + 0.42, B/2 - 0.42)
        py = rnd.uniform(-T/2 + 0.42, T/2 - 0.42)
        h  = rnd.uniform(0.16, 0.34)
        zyl(px, py, 0.35 + h/2, 0.025, h, rnd.choice([GRUE, GRU2]), 6)
        flach(kugel(px, py, 0.35 + h + 0.05, rnd.uniform(0.07, 0.11), rnd.choice(FARB), 7))
    for (px, py) in ((-B/2 + 0.34, 0.0), (B/2 - 0.34, 0.0)):
        kegel(px, py, 0.62, 0.26, 0.10, 0.60, GRU2, 8)
    export("th33_blumenrabatte", 0.010, 2)

if __name__ == "__main__":
    print("Asset-Charge 33 (th33, Park-Ausstattung):")
    for fn in (warteschlange_modul, parkzaun_modul, parklaterne, wegweiser,
               imbisswagen, toilettenhaus, parkplan, kassenhaus, blumenrabatte):
        fn()
    print("fertig")
