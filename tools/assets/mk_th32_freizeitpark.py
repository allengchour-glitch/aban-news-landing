# -*- coding: utf-8 -*-
"""Asset-Charge 32 (th32_*): FREIZEITPARK-ERWEITERUNG.
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

SCHIENEN-SCHNITTSTELLE (der Grund fuer diese Charge)
  `th13_achterbahn_modul` ist 12,0 m lang und endet auf beiden Seiten mit
  Steigung 0. Genau diese Schnittstelle bedienen Kurve und Station hier, damit
  sich aus den drei Teilen eine geschlossene Bahn legen laesst:
      Fahrbahnmitte y = 0 | Schienenpaar y = +-0,62 | Mittelrohr 0,28 unter der
      Schienenmitte | Schienen-Mittelhoehe z = 6,60 | Profil 0,15 x 0,15
  Das Raster ist eine 12-m-Kachel. Die Kurve belegt eine ganze Kachel und dreht
  von der -x-Kante (y=0) auf die +y-Kante (x=0) — beide Male genau in der
  Kachelmitte, sonst passt die naechste Kachel nicht.
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

# ================================================================ 1) Achterbahn-Kurve
def achterbahn_kurve():
    """90-Grad-Kurve auf einer 12x12-Kachel. Eintritt an der -x-Kante bei y=0,
    Austritt an der +y-Kante bei x=0 — beide genau in der Kachelmitte, sonst
    passt die naechste Kachel nicht. Bogenmittelpunkt (-6, +6), Radius 6,0.
    Ueberhoehung: die kurvenaeussere Schiene liegt hoeher, sonst sieht die Kurve
    aus wie eine flach hingelegte Schleife."""
    neu()
    SCH  = mat("AbSchiene", (0.98,0.82,0.14), 0.4, 0.25)
    SCHW = mat("AbSchwelle",(0.88,0.20,0.18), 0.6)
    STUE = mat("AbStuetze", (0.20,0.46,0.80), 0.55)
    VERB = mat("AbVerband", (0.96,0.94,0.90), 0.6)
    FUSS = mat("AbFuss",    (0.42,0.42,0.45), 0.95)
    L_W = leucht("AbLampeW", (1.00,0.95,0.76), 3.2)
    L_R = leucht("AbLampeR", (1.00,0.26,0.30), 3.0)
    L_B = leucht("AbLampeB", (0.38,0.66,1.00), 3.0)
    LAM = [L_W, L_R, L_W, L_B]

    CX, CY, R, NS = -6.0, 6.0, 6.0, 40
    def punkt(i):
        a = -TAU/4.0 * (i/float(NS))          # 0 -> -90 Grad: (-x-Kante) nach (+y-Kante)
        return Vector((CX + R*math.cos(a), CY + R*math.sin(a), ZS))

    for i in range(NS):
        p0, p1 = punkt(i), punkt(i+1)
        gleis_segment(p0, p1, SCH, SCH, SCHW if i % 3 == 1 else None)
        if i % 6 == 2:
            v = p1 - p0; n = Vector((-v.y, v.x, 0.0)).normalized()
            mid = (p0 + p1)/2
            for s in (-1, 1):
                flach(kugel(*(mid + n*(s*0.88) + Vector((0,0,0.06))), 0.13, LAM[(i//6) % len(LAM)], 8))

    # Stuetzen entlang des Bogens. Sie stehen im Bogen, nicht im Raster —
    # ein Stuetzenraster in x waere unter der Kurve mal 6 m, mal 0 m vom Gleis weg.
    for i in (4, 13, 22, 31, 39):
        p = punkt(i)
        zt = ZS - 0.40
        v = punkt(min(NS, i+1)) - punkt(max(0, i-1))
        n = Vector((-v.y, v.x, 0.0)).normalized()
        box(p.x, p.y, 0.10, 2.20, 2.20, 0.20, FUSS)
        for s in (-1, 1):
            q = p + n*(s*0.85)
            box(q.x, q.y, zt/2 + 0.10, 0.34, 0.34, zt - 0.20, STUE)
        for zz in (1.40, 3.00, 4.60):
            a = p + n*(-0.85); b = p + n*0.85
            strebe((a.x, a.y, zz), (b.x, b.y, zz), 0.22, VERB)
        a = p + n*(-0.85); b = p + n*0.85
        strebe((a.x, a.y, 0.40), (b.x, b.y, zt - 0.30), 0.13, VERB)
        strebe((b.x, b.y, 0.40), (a.x, a.y, zt - 0.30), 0.13, VERB)
        strebe((a.x, a.y, zt + 0.16), (b.x, b.y, zt + 0.16), 0.30, STUE)
    export("th32_achterbahn_kurve", 0.018, 2)

# ================================================================ 2) Achterbahn-Station
def achterbahn_station():
    """Bahnhof, 12,0 m lang wie das Geradenmodul — gleiche Schienenhoehe, gleiche
    Spur, Steigung 0. Darunter Bahnsteig, Warteschlange, Bedienpult und Dach.
    Der Bahnsteig liegt 1,10 m unter der Schienenmitte: der Einstieg in einen
    Wagen ist eine Stufe, kein Klettern."""
    neu()
    SCH  = mat("AbSchiene", (0.98,0.82,0.14), 0.4, 0.25)
    SCHW = mat("AbSchwelle",(0.88,0.20,0.18), 0.6)
    STUE = mat("AbStuetze", (0.20,0.46,0.80), 0.55)
    VERB = mat("AbVerband", (0.96,0.94,0.90), 0.6)
    HOLZ = mat_bild("StBoden", "bohlen.png", (1.0,0.94,0.86), 0.85)
    DACH = mat_bild("StDach", "zeltbahn.png", (1.0,1.0,1.0), 0.7)
    PFOS = mat("StPfosten", (0.94,0.92,0.88), 0.6)
    GELB = mat("StKante",   (0.98,0.80,0.10), 0.5)
    PULT = mat("StPult",    (0.28,0.30,0.34), 0.5)
    MON  = mat("StAnzeige", (0.10,0.16,0.22), 0.3, 0.0, (0.30,0.78,1.00), 2.0)
    L_W  = leucht("StLampe", (1.00,0.95,0.78), 2.6)
    L_G  = leucht("StGruen", (0.30,1.00,0.46), 2.8)

    L, BS = 12.0, ZS - 1.10          # Bahnsteig-Oberkante 5,50
    uv_kacheln(box(0, 0, 0.10, L, 9.0, 0.20,
                   mat_bild("StSockel", "parkpflaster.png", (1.0,1.0,1.0), 0.9)), 2.4)
    # --- Traggeruest bis zur Bahnsteighoehe
    for sx in (-5.2, -1.75, 1.75, 5.2):
        for sy in (-2.4, 2.4):
            box(sx, sy, (BS - 0.30)/2 + 0.20, 0.42, 0.42, BS - 0.50, STUE)
        for zz in (1.60, 3.40):
            strebe((sx, -2.4, zz), (sx, 2.4, zz), 0.20, VERB)
        strebe((sx, -2.4, 0.40), (sx, 2.4, BS - 0.60), 0.13, VERB)
    for x0, x1 in ((-5.2,-1.75), (-1.75,1.75), (1.75,5.2)):
        for sy in (-2.4, 2.4):
            strebe((x0, sy, 0.60), (x1, sy, BS - 0.60), 0.13, VERB)
            box((x0+x1)/2, sy, 2.60, x1-x0, 0.20, 0.20, VERB)
    # --- Bahnsteig beidseitig neben dem Gleis
    for sy in (-1, 1):
        uv_kacheln(box(0, sy*2.35, BS - 0.09, L, 2.90, 0.18, HOLZ), 1.8)
        box(0, sy*1.02, BS + 0.02, L, 0.24, 0.04, GELB)      # Sicherheitslinie
        for i in range(9):                                    # Gelaender aussen
            box(-5.4 + i*1.35, sy*3.75, BS + 0.52, 0.10, 0.10, 1.04, PFOS)
        box(0, sy*3.75, BS + 1.02, L, 0.09, 0.09, PFOS)
        box(0, sy*3.75, BS + 0.56, L, 0.07, 0.07, PFOS)
    # --- Gleis auf ganzer Laenge, Steigung 0
    NS = 24
    for i in range(NS):
        x0 = -L/2 + i*(L/NS); x1 = x0 + L/NS
        gleis_segment(Vector((x0,0,ZS)), Vector((x1,0,ZS)), SCH, SCH,
                      SCHW if i % 3 == 1 else None)
    for sx in (-4.6, 4.6):                                    # Bremsbacken im Gleis
        box(sx, 0, ZS - 0.34, 3.0, 0.30, 0.24, PULT)
    # --- Dach auf Pfosten
    for sx in (-5.0, 0.0, 5.0):
        for sy in (-1, 1):
            box(sx, sy*3.5, BS + 1.85, 0.20, 0.20, 3.70, PFOS)
    uv_kacheln(box(0, 0, BS + 3.78, L + 1.2, 8.4, 0.16, DACH), 3.2)
    giebel(0, 0, BS + 3.86, 4.2, 1.30, L + 1.2, DACH, 'y')
    for i in range(11):
        flach(kugel(-5.5 + i*1.10, 4.24, BS + 3.62, 0.13, L_W, 8))
    # --- Bedienpult mit Anzeige, Schauseite +y
    box(-3.6, 3.10, BS + 0.55, 1.60, 0.70, 0.92, PULT)
    box(-3.6, 3.10, BS + 1.05, 1.70, 0.80, 0.10, PULT)
    box(-3.6, 2.74, BS + 1.28, 1.20, 0.08, 0.44, MON)
    flach(kugel(-2.6, 3.10, BS + 1.22, 0.12, L_G, 8))
    # --- Warteschlange auf dem Vorplatz
    for i in range(6):
        box(1.2 + (i % 3)*1.6, 4.6 + (i//3)*1.5, FB + 0.52, 0.09, 0.09, 1.04, PFOS)
    for k in range(2):
        box(2.8, 4.6 + k*1.5, FB + 0.94, 3.4, 0.06, 0.06, GELB)
    export("th32_achterbahn_station", 0.018, 2)

# ================================================================ 3) Kettenkarussell
def kettenkarussell():
    """Kettenflieger ~14 m: Mast, Drehkranz mit Krone, 16 Sitze an Ketten.
    Die Sitze haengen NICHT senkrecht, sondern sind nach aussen ausgestellt —
    ein stehender Kettenflieger sieht aus wie ein kaputter Schirm."""
    neu()
    MAST = mat("KkMast",  (0.90,0.88,0.84), 0.45, 0.3)
    KRAN = mat("KkKranz", (0.86,0.16,0.24), 0.5)
    GOLD = mat("KkGold",  (0.92,0.74,0.22), 0.35, 0.65)
    KETT = mat("KkKette", (0.62,0.64,0.68), 0.4, 0.6)
    SITZ = mat("KkSitz",  (0.16,0.42,0.74), 0.6)
    BODE = mat_bild("KkBoden", "parkpflaster.png", (1.0,1.0,1.0), 0.9)
    ZAUN = mat("KkZaun",  (0.94,0.92,0.86), 0.6)
    DACH = mat_bild("KkDach", "zeltbahn.png", (0.72,1.0,0.86), 0.7)
    L_W = leucht("KkLampeW", (1.00,0.95,0.78), 3.0)
    L_R = leucht("KkLampeR", (1.00,0.30,0.34), 2.8)
    L_G = leucht("KkLampeG", (0.98,0.82,0.20), 2.8)
    LAM = [L_W, L_R, L_W, L_G]

    R_P, ZK, N = 8.6, 11.4, 16
    uv_kacheln(platte(2*R_P + 1.2, 2*R_P + 1.2, BODE), 2.4)
    uv_kacheln(zyl(0, 0, FB + 0.16, R_P, 0.32, BODE, 32), 2.4)   # runde Fahrflaeche
    zyl(0, 0, FB + 0.36, 2.10, 0.36, KRAN, 24)                # Podest um den Mast
    zyl(0, 0, (FB + ZK)/2, 0.62, ZK - FB, MAST, 16)           # Mast
    for zz in (3.2, 6.0, 8.8):                                # Zierringe
        flach(ring_t(0, 0, zz, 0.78, 0.10, GOLD, 20, 6))
    _vor = set(bpy.context.scene.objects)
    # --- Drehkranz mit Kegeldach (dreht sich mitsamt den Sitzen)
    zyl(0, 0, ZK + 0.30, 3.60, 0.60, KRAN, 24)
    zyl(0, 0, ZK + 0.68, 3.90, 0.16, GOLD, 24)
    kegel(0, 0, ZK + 1.85, 4.30, 0.30, 2.10, DACH, 20)
    kegel(0, 0, ZK + 3.15, 0.34, 0.05, 0.60, GOLD, 10)
    for i in range(20):                                       # Randlampen am Kranz
        a = TAU*i/20.0
        flach(kugel(math.cos(a)*3.96, math.sin(a)*3.96, ZK + 0.68, 0.14, LAM[i % 4], 8))
    # --- Sitze an Ketten, nach aussen ausgestellt
    for i in range(N):
        a = TAU*i/N
        ax, ay = math.cos(a), math.sin(a)
        top = Vector((ax*3.30, ay*3.30, ZK + 0.10))
        bot = Vector((ax*6.40, ay*6.40, ZK - 3.30))
        for s in (-1, 1):                                     # zwei Ketten je Sitz
            q = Vector((-ay, ax, 0.0))*(s*0.26)
            strebe(tuple(top + q*0.6), tuple(bot + q), 0.05, KETT)
        box(bot.x, bot.y, bot.z - 0.10, 0.66, 0.60, 0.14, SITZ).rotation_euler[2] = a
        box(bot.x - ax*0.28, bot.y - ay*0.28, bot.z + 0.36, 0.14, 0.60, 0.80, SITZ).rotation_euler[2] = a
        for s in (-1, 1):                                     # Buegel
            q = Vector((-ay, ax, 0.0))*(s*0.30)
            strebe(tuple(bot + q + Vector((0,0,-0.06))), tuple(bot + q + Vector((0,0,0.34))), 0.06, KETT)
    _dreh = seit(_vor)
    # --- Zaun mit Ein-/Ausgang auf +y (steht still)
    for i in range(28):
        a = TAU*i/28.0
        if math.cos(a - TAU/4) > 0.86: continue               # Luecke = Eingang
        box(math.cos(a)*R_P, math.sin(a)*R_P, FB + 0.58, 0.10, 0.10, 1.16, ZAUN)
        if i % 2 == 0:
            flach(kugel(math.cos(a)*R_P, math.sin(a)*R_P, FB + 1.24, 0.10, LAM[i % 4], 7))
    for i in range(28):
        a0, a1 = TAU*i/28.0, TAU*(i+1)/28.0
        if math.cos(a0 - TAU/4) > 0.86 or math.cos(a1 - TAU/4) > 0.86: continue
        strebe((math.cos(a0)*R_P, math.sin(a0)*R_P, FB + 1.06),
               (math.cos(a1)*R_P, math.sin(a1)*R_P, FB + 1.06), 0.07, ZAUN)
    export("th32_kettenkarussell", 0.018, 2,
           anim=lambda: dreh_anim(_dreh, "Drehkranz", 2, 200, 1.0, pivot=(0, 0, ZK)))

# ================================================================ 4) Piratenschiff
def piratenschiff():
    """Schiffsschaukel: A-Bock, Pendelarm, Boot in Schraeglage.
    Das Boot haengt gekippt — ein waagrecht stehendes Schaukelschiff wirkt kaputt.
    Die Kippung wird auf die BOOTSGRUPPE gelegt, damit Rumpf, Sitze und Galionsfigur
    gemeinsam kippen; einzeln gedreht laufen sie auseinander."""
    neu()
    BOCK = mat("PsBock",  (0.86,0.24,0.20), 0.55)
    STAH = mat("PsStahl", (0.72,0.74,0.78), 0.4, 0.5)
    RUMP = mat("PsRumpf", (0.44,0.26,0.14), 0.8)
    DECK = mat_bild("PsDeck", "bohlen.png", (1.0,0.96,0.88), 0.85)
    GOLD = mat("PsGold",  (0.92,0.74,0.22), 0.35, 0.65)
    SITZ = mat("PsSitz",  (0.16,0.34,0.62), 0.65)
    SEGL = mat("PsSegel", (0.94,0.92,0.86), 0.85)
    BODE = mat_bild("PsBoden", "parkpflaster.png", (1.0,1.0,1.0), 0.9)
    ZAUN = mat("PsZaun",  (0.94,0.92,0.86), 0.6)
    L_W = leucht("PsLampe", (1.00,0.95,0.78), 3.0)
    L_R = leucht("PsRot",   (1.00,0.28,0.30), 2.8)

    ZA, WINK = 12.60, math.radians(34)          # Achshoehe, Auslenkung
    uv_kacheln(platte(20.0, 13.0, BODE), 2.6)
    # --- zwei A-Boecke
    for sy in (-3.6, 3.6):
        for sx in (-1, 1):
            strebe((sx*5.4, sy, FB), (0.0, sy, ZA), 0.52, BOCK)
        strebe((-5.4, sy, FB + 0.30), (5.4, sy, FB + 0.30), 0.30, BOCK)
        for zz in (4.2, 8.0):
            t = 1.0 - (zz - FB)/(ZA - FB)
            strebe((-5.4*t, sy, zz), (5.4*t, sy, zz), 0.24, STAH)
        for sx in (-1, 1):
            box(sx*5.4, sy, FB + 0.22, 1.60, 1.60, 0.44, STAH)
    strebe((0, -3.6, ZA), (0, 3.6, ZA), 0.34, STAH)           # Achstraeger
    flach(zyl(0, 0, ZA, 0.46, 8.0, STAH, 16, rot=(math.pi/2, 0, 0)))
    for sy in (-3.6, 3.6):
        for i in range(7):
            flach(kugel(-4.6 + i*1.53, sy, ZA - (abs(-4.6 + i*1.53))*(ZA - FB)/5.4 + 0.34,
                        0.13, (L_W, L_R)[i % 2], 8))
    # --- Pendel: Arm + Boot, gemeinsam gekippt
    grp = []
    def merk(o):
        grp.append(o); return o
    for s in (-1, 1):
        merk(strebe((s*0.9, -2.6, ZA), (s*0.9, -2.6, ZA - 7.4), 0.30, STAH))
        merk(strebe((s*0.9,  2.6, ZA), (s*0.9,  2.6, ZA - 7.4), 0.30, STAH))
    merk(strebe((-0.9, 0, ZA - 7.2), (0.9, 0, ZA - 7.2), 0.26, STAH))
    ZB = ZA - 7.9                                             # Bootsmitte
    merk(box(0, 0, ZB, 8.6, 2.9, 1.05, RUMP))                 # Rumpf
    uv_kacheln(merk(box(0, 0, ZB + 0.56, 8.2, 2.6, 0.14, DECK)), 1.6)
    for s in (-1, 1):                                         # aufgebogene Enden
        o = merk(box(s*4.85, 0, ZB + 0.50, 2.10, 2.60, 1.00, RUMP))
        o.rotation_euler[1] = -s*0.42
    merk(box(0, 0, ZB + 0.34, 8.8, 3.10, 0.22, GOLD))         # Scheuerleiste
    for i in range(6):                                        # Sitzbaenke quer
        merk(box(-3.4 + i*1.36, 0, ZB + 0.86, 0.62, 2.30, 0.46, SITZ))
        merk(box(-3.4 + i*1.36, 0, ZB + 1.28, 0.16, 2.30, 0.42, SITZ))
    merk(strebe((-4.6, 0, ZB + 1.30), (4.6, 0, ZB + 1.30), 0.12, STAH))
    merk(box(0, 0, ZB + 2.30, 0.26, 0.26, 3.20, DECK))        # Mast
    merk(box(0, 0, ZB + 2.90, 0.18, 2.20, 1.60, SEGL))        # Segel
    for s in (-1, 1):                                         # Laternen an den Spitzen
        merk(flach(kugel(s*4.9, 0, ZB + 1.10, 0.16, L_W, 8)))
    # Das Pendel wird NICHT mehr fest gekippt, sondern animiert (siehe export(anim=...)).
    # Eine feste Schraeglage sah im Spiel aus wie ein haengengebliebenes Fahrgeschaeft.
    # --- Absperrung
    for i in range(16):
        a = TAU*i/16.0
        if math.cos(a - TAU/4) > 0.80: continue
        box(math.cos(a)*7.6, math.sin(a)*5.6, FB + 0.56, 0.10, 0.10, 1.12, ZAUN)
    export("th32_piratenschiff", 0.018, 2,
           anim=lambda: dreh_anim(grp, "Pendel", 1, 150, hin_her=True,
                                  winkel=WINK, pivot=(0, 0, ZA)))

# ================================================================ 5) Wildwasserbahn
def wildwasserbahn():
    """Log Flume: Liftberg, Sturzrinne ins Becken, Rundkurs-Rinne, zwei Boote.
    Die Rinne ist eine U-Schale aus drei Quadern (Boden + zwei Wangen) — ein
    voller Quader waere ein Damm, kein Kanal, und das Wasser laege obenauf."""
    neu()
    FELS = mat("WwFels",  (0.48,0.47,0.44), 0.93)
    RINN = mat("WwRinne", (0.36,0.42,0.48), 0.75)
    WASS = mat_bild("WwWasser", "wasser.png", (1.0,1.0,1.0), 0.18, 0.0)
    SCHA = mat("WwSchaum",(0.94,0.97,1.00), 0.5)
    BOOT = mat("WwBoot",  (0.52,0.30,0.16), 0.8)
    SITZ = mat("WwSitz",  (0.86,0.62,0.18), 0.6)
    STAH = mat("WwStahl", (0.66,0.68,0.72), 0.42, 0.5)
    BODE = mat_bild("WwBoden", "parkpflaster.png", (1.0,1.0,1.0), 0.9)
    GRUE = mat("WwGruen", (0.22,0.48,0.22), 0.9)
    ZAUN = mat("WwZaun",  (0.94,0.92,0.86), 0.6)
    L_W = leucht("WwLampe", (1.00,0.95,0.78), 2.6)

    B, T = 30.0, 22.0
    uv_kacheln(platte(B, T, BODE), 2.6)

    def rinne(p0, p1, breite=2.3, tief=0.72, m=RINN, wasser=True):
        """U-Schale plus Wasserspiegel darin."""
        a, b = Vector(p0), Vector(p1)
        v = b - a
        if v.length < 1e-6: return
        n = Vector((-v.y, v.x, 0.0))
        n = n.normalized() if n.length > 1e-6 else Vector((0,1,0))
        strebe(tuple(a), tuple(b), 0.16, m)                    # Boden (duenn)
        o = strebe(tuple(a - Vector((0,0,0.02))), tuple(b - Vector((0,0,0.02))), 0.14, m)
        for s in (-1, 1):
            strebe(tuple(a + n*(s*breite/2)), tuple(b + n*(s*breite/2)), tief, m)
        if wasser:
            strebe(tuple(a + Vector((0,0,0.16))), tuple(b + Vector((0,0,0.16))), 0.10, WASS)

    # --- Felsberg mit Liftschacht (Schauseite +y)
    for (px, py, sx, sy, sz, sd, kip) in (
            (-8.5, -5.0, 9.0, 8.0, 11.0, 201, ( 0.05, -0.04,  0.3)),
            (-11.0, 1.0, 6.0, 6.0,  8.0, 202, (-0.04,  0.05, -0.6)),
            (-5.0, -8.5, 7.0, 5.0,  7.0, 203, ( 0.06,  0.03,  0.9))):
        felskoerper(px, py, FB, sx, sy, sz, FELS, sd, 0.24, 3, kip)
    for (px, py, r, h, sd) in ((-13.2, -8.0, 1.8, 2.6, 204), (-2.6, -9.4, 1.5, 2.2, 205),
                               (-13.6, 4.6, 1.4, 2.0, 206)):
        felskoerper(px, py, FB, 2*r, 1.8*r, h, FELS, sd, 0.30, 2, (0.08, -0.06, sd/10.0))
    for (px, py) in ((-11.5, -9.6), (-4.2, -10.2), (-14.2, 1.8)):
        kegel(px, py, FB + 1.5, 1.5, 0.1, 3.0, GRUE, 8)

    ZO = 11.6                                                  # Scheitelhoehe
    # Lift: schraege Rinne den Berg hinauf, mit Kettenschacht
    rinne((-8.5, 8.6, FB + 1.10), (-8.5, -1.2, ZO), 2.3, 0.72)
    for i in range(9):
        t = i/8.0
        box(-8.5, 8.6 - t*9.8, FB + 1.10 + t*(ZO - FB - 1.10) - 0.55, 3.1, 0.34, 0.9, STAH)
    # Scheitel + Sturzrinne nach +y ins Becken
    rinne((-8.5, -1.2, ZO), (-3.4, -1.2, ZO - 0.2), 2.3, 0.72)
    rinne((-3.4, -1.2, ZO - 0.2), (2.6, 5.4, 1.30), 2.5, 0.90)
    for s in (-1, 1):                                          # Bremswanne unten
        strebe((2.6 + s*0.1, 5.4, 1.20), (6.4 + s*0.1, 7.4, 1.05), 0.18, RINN)
    # --- Becken
    box(7.6, 6.2, FB + 0.55, 13.0, 9.0, 1.10, RINN)
    uv_kacheln(box(7.6, 6.2, FB + 0.94, 12.2, 8.2, 0.34, WASS), 3.4)
    for i in range(14):                                        # Gischt am Aufschlag
        a = TAU*i/14.0
        kugel(3.4 + math.cos(a)*1.9, 6.2 + math.sin(a)*1.5,
              FB + 1.05 + abs(math.sin(a*2))*0.7, 0.42 + 0.12*(i % 3), SCHA, 8)
    # --- Rueckfuehrung um das Becken herum
    rinne((13.4, 8.4, 1.05), (13.4, -6.6, 1.30), 2.3, 0.62)
    rinne((13.4, -6.6, 1.30), (-2.0, -8.8, 1.35), 2.3, 0.62)
    rinne((-2.0, -8.8, 1.35), (-8.5, 8.6, 1.10), 2.3, 0.62, wasser=False)
    for (px, py) in ((13.4, 2.0), (13.4, -5.0), (4.0, -8.2), (-4.0, -3.0), (-7.4, 5.0)):
        box(px, py, (0.9 + FB)/2, 0.44, 0.44, 0.9, STAH)
    # --- zwei Boote (Baumstamm-Form)
    for (px, py, pz, ang) in ((-8.5, 5.4, FB + 1.42, 0.0), (13.4, -1.0, 1.62, TAU/4)):
        o = flach(zyl(px, py, pz, 0.86, 3.60, BOOT, 14, rot=(0, math.pi/2, 0)))
        o.rotation_euler[2] = ang
        for k in (-1, 1):
            b = box(px, py + k*0.80*math.cos(ang), pz + 0.30, 1.30, 0.70, 0.44, SITZ)
            b.rotation_euler[2] = ang
    # --- Absperrung entlang der Schauseite
    for i in range(11):
        box(-13.0 + i*2.6, 10.4, FB + 0.56, 0.10, 0.10, 1.12, ZAUN)
        if i % 2 == 0:
            flach(kugel(-13.0 + i*2.6, 10.4, FB + 1.22, 0.11, L_W, 7))
    for i in range(10):
        strebe((-13.0 + i*2.6, 10.4, FB + 1.02), (-10.4 + i*2.6, 10.4, FB + 1.02), 0.07, ZAUN)
    export("th32_wildwasserbahn", 0.018, 2)

# ================================================================ 6) Teetassen
def teetassen():
    """Tassenkarussell: Drehteller mit 3 Untertellern, je 3 Tassen mit Henkel.
    Die Tasse ist ein HOHLER Becher (Zylinder + eingesenkter Innenboden) — ein
    voller Zylinder liest sich als Fass, nicht als Tasse."""
    neu()
    TELL = mat("TtTeller", (0.90,0.32,0.44), 0.55)
    TEL2 = mat("TtTeller2",(0.98,0.80,0.24), 0.55)
    BODE = mat_bild("TtBoden", "parkpflaster.png", (1.0,1.0,1.0), 0.9)
    WEIS = mat("TtPorzell",(0.97,0.96,0.93), 0.35)
    GOLD = mat("TtGold",   (0.92,0.74,0.22), 0.35, 0.65)
    DACH = mat_bild("TtDach", "zeltbahn.png", (0.68,0.92,1.0), 0.7)
    PFOS = mat("TtPfosten",(0.94,0.92,0.86), 0.6)
    ZAUN = mat("TtZaun",   (0.94,0.92,0.86), 0.6)
    FARB = [mat("TtTasseA", (0.92,0.30,0.32), 0.45),
            mat("TtTasseB", (0.28,0.56,0.90), 0.45),
            mat("TtTasseC", (0.36,0.76,0.44), 0.45),
            mat("TtTasseD", (0.96,0.72,0.22), 0.45)]
    L_W = leucht("TtLampe", (1.00,0.95,0.78), 2.8)
    L_P = leucht("TtPink",  (1.00,0.42,0.68), 2.6)

    R_P = 8.0
    uv_kacheln(platte(2*R_P + 1.0, 2*R_P + 1.0, BODE), 2.4)
    _vorT = set(bpy.context.scene.objects)
    zyl(0, 0, FB + 0.18, R_P, 0.36, TELL, 32)                  # grosser Drehteller
    flach(ring_t(0, 0, FB + 0.36, R_P - 0.18, 0.16, GOLD, 32, 6))
    zyl(0, 0, FB + 0.52, 1.10, 0.32, TEL2, 20)                 # Nabe

    def tasse(px, py, rad, farbe, dreh):
        zyl(px, py, FB + 0.44, rad*1.28, 0.16, WEIS, 18)        # Untertasse
        zyl(px, py, FB + 0.52 + 0.52, rad, 1.04, farbe, 18)     # Becherwand
        zyl(px, py, FB + 1.02, rad*0.86, 0.10, WEIS, 18)        # Innenboden -> hohl
        flach(ring_t(px, py, FB + 1.02, rad*0.94, 0.09, WEIS, 18, 6))
        flach(ring_t(px + math.cos(dreh)*(rad + 0.16), py + math.sin(dreh)*(rad + 0.16),
                     FB + 0.86, 0.30, 0.09, farbe, 14, 6,
                     rot=(math.pi/2, 0, dreh + math.pi/2)))     # Henkel
        for k in range(3):                                      # Sitzbank innen
            a = dreh + math.pi + TAU*k/3.0
            box(px + math.cos(a)*rad*0.62, py + math.sin(a)*rad*0.62,
                FB + 0.80, 0.46, 0.20, 0.34, WEIS).rotation_euler[2] = a

    _unter = []
    for i in range(3):                                          # 3 Unterteller
        a = TAU*i/3.0 + TAU/12.0
        ux, uy = math.cos(a)*4.35, math.sin(a)*4.35
        _vorU = set(bpy.context.scene.objects)
        zyl(ux, uy, FB + 0.44, 2.75, 0.20, TEL2 if i % 2 else TELL, 24)
        flach(ring_t(ux, uy, FB + 0.54, 2.66, 0.12, GOLD, 24, 6))
        for k in range(3):
            b = TAU*k/3.0 + a*0.7
            tasse(ux + math.cos(b)*1.45, uy + math.sin(b)*1.45, 0.92,
                  FARB[(i*3 + k) % 4], b)
        _unter.append((seit(_vorU), ux, uy))
    _dreh = seit(_vorT)          # grosser Teller INKLUSIVE aller Unterteller
    # --- Dach auf sechs Pfosten
    for i in range(6):
        a = TAU*i/6.0
        box(math.cos(a)*7.2, math.sin(a)*7.2, FB + 2.85, 0.20, 0.20, 5.70, PFOS)
    uv_kacheln(zyl(0, 0, FB + 5.82, 7.3, 0.22, DACH, 24), 3.0)   # Schirm hoeher
    kegel(0, 0, FB + 6.85, 7.3, 1.20, 1.85, DACH, 24)
    kegel(0, 0, FB + 8.10, 0.40, 0.06, 0.80, GOLD, 10)
    for i in range(18):
        a = TAU*i/18.0
        flach(kugel(math.cos(a)*7.26, math.sin(a)*7.26, FB + 5.70, 0.14,
                    (L_W, L_P)[i % 2], 8))
    def _anim():
        # Unterteller GEGENLAEUFIG, und ihre Empties haengen am grossen Teller —
        # so ueberlagern sich beide Drehungen wie beim echten Fahrgeschaeft.
        emps = [dreh_anim(g, "Unterteller%d" % i, 2, 200, -2.0, pivot=(ux, uy, FB + 0.44))
                for i, (g, ux, uy) in enumerate(_unter)]
        gross = [o for o in _dreh if o not in sum([g for g, _, _ in _unter], [])]
        dreh_anim(gross + emps, "Drehteller", 2, 200, 1.0, pivot=(0, 0, FB))
    export("th32_teetassen", 0.018, 2, anim=_anim)

# ================================================================ 7) Geisterbahn
def geisterbahn():
    """Geisterbahn, kindgerecht gruselig — Kuerbisse, Fledermaeuse, Mond, KEIN Blut.
    Fassade mit getrennter Ein- und Ausfahrt; das Gleis verschwindet durch die
    Schwingtuere. Schauseite +y."""
    neu()
    FASS = mat("GbFassade", (0.26,0.18,0.36), 0.8)
    FAS2 = mat("GbFassade2",(0.18,0.12,0.26), 0.85)
    HOLZ = mat("GbHolz",   (0.34,0.24,0.16), 0.85)
    DACH = mat("GbDach",   (0.14,0.10,0.20), 0.8)
    GRUE = mat("GbGruen",  (0.30,0.82,0.42), 0.4, 0.0, (0.16,0.52,0.24), 1.6)
    ORAN = mat("GbKuerbis",(0.94,0.52,0.12), 0.6)
    STIE = mat("GbStiel",  (0.30,0.44,0.18), 0.8)
    SCHW = mat("GbSchwarz",(0.10,0.09,0.12), 0.7)
    SILB = mat("GbSilber", (0.74,0.76,0.80), 0.35, 0.6)
    BODE = mat_bild("GbBoden", "parkpflaster.png", (0.82,0.80,0.86), 0.9)
    MOND = mat("GbMond",   (0.98,0.96,0.84), 0.3, 0.0, (0.98,0.94,0.78), 2.4)
    L_G = leucht("GbLichtG", (0.42,1.00,0.52), 2.8)
    L_V = leucht("GbLichtV", (0.72,0.36,1.00), 2.6)
    L_O = leucht("GbLichtO", (1.00,0.60,0.16), 2.8)
    LAM = [L_G, L_V, L_O]

    B, T, H = 18.0, 12.0, 8.4
    uv_kacheln(platte(B + 2.0, T + 4.0, BODE), 2.6)
    # --- Baukoerper mit zwei Toroeffnungen in der Front
    box(0, -1.0, FB + H/2, B, T, H, FASS)
    # Lisenen: die Front war eine 18 m breite glatte Wand
    for px in (-7.4, -4.2, 4.2, 7.4):
        box(px, 5.26, FB + (H - 0.4)/2, 0.70, 0.62, H - 0.4, FAS2)
        box(px, 5.30, FB + H - 0.30, 0.92, 0.70, 0.42, HOLZ)     # Kapitell
    box(0, 5.20, FB + 0.55, B - 1.0, 0.50, 1.10, FAS2)           # Sockelband
    box(0, 5.34, FB + H - 1.90, B - 1.2, 0.34, 0.34, HOLZ)       # Gurtgesims
    for sy in (-1, 1):                                           # Seitenwaende gliedern
        for px in (-6.0, 0.0, 6.0):
            box(px, sy*(6.0) - 1.0, FB + H/2, 0.60, 0.40, H - 0.6, FAS2)
    for sx in (-1, 1):                                          # Ecktuerme
        box(sx*(B/2 - 1.1), 4.6, FB + (H + 1.6)/2, 2.20, 2.20, H + 1.6, FAS2)
        kegel(sx*(B/2 - 1.1), 4.6, FB + H + 2.90, 1.70, 0.10, 2.60, DACH, 8)
        flach(kugel(sx*(B/2 - 1.1), 4.6, FB + H + 4.30, 0.22, L_V, 8))
    # Front oberhalb der Tore (die Tore selbst bleiben offen)
    box(0, 5.0, FB + H/2 + 2.30, B - 4.4, 0.50, H - 4.60, FASS)
    for sx in (-1, 1):
        box(sx*5.10, 5.0, FB + 1.85, 2.20, 0.50, 3.70, FASS)   # Pfeiler zwischen den Toren
    box(0, 5.0, FB + 1.85, 3.00, 0.50, 3.70, FASS)             # Mittelpfeiler
    box(0, 6.10, FB + 4.30, 11.0, 2.20, 0.30, HOLZ)             # Vordach ueber den Toren
    for sx in (-1, 1):
        box(sx*4.9, 6.95, FB + 2.15, 0.24, 0.24, 4.30, HOLZ)     # Vordachstuetzen
    for sx in (-1, 1):                                          # Torlaibungen
        box(sx*2.55, 5.05, FB + 3.86, 2.40, 0.62, 0.36, HOLZ)
        for s2 in (-1, 1):
            box(sx*2.55 + s2*1.32, 5.05, FB + 1.85, 0.30, 0.62, 3.70, HOLZ)
    for sx in (-1, 1):                                          # Schwingtueren, leicht offen
        for s2 in (-1, 1):
            o = box(sx*2.55 + s2*0.58, 4.70, FB + 1.72, 1.10, 0.10, 3.30, HOLZ)
            o.rotation_euler[2] = s2*0.34
    # --- Gleis, das in die Tore laeuft (Schmalspur, nicht die Achterbahn-Spur)
    for sx in (-1, 1):
        for s2 in (-1, 1):
            box(sx*2.55 + s2*0.42, 6.60, FB + 0.07, 0.10, 3.60, 0.14, SILB)
        for i in range(5):
            box(sx*2.55, 5.30 + i*0.80, FB + 0.04, 1.30, 0.24, 0.08, HOLZ)
    # --- Giebel, Mond, Schriftband
    giebel(0, 5.0, FB + H, B/2 - 1.6, 2.60, 0.60, FAS2, 'x')
    flach(kugel(0, 4.55, FB + H + 1.10, 1.05, MOND, 12))
    box(0, 4.80, FB + H - 0.90, B - 6.0, 0.24, 1.10, SCHW)
    for i in range(13):
        flach(kugel(-5.4 + i*0.90, 4.62, FB + H - 0.90, 0.13, LAM[i % 3], 8))
    # --- Fledermaeuse an der Fassade (zwei Fluegel + Koerper)
    for (px, pz, sc) in ((-6.4, 6.6, 1.0), (5.8, 7.2, 0.8), (-2.2, 7.6, 0.7), (3.0, 5.6, 0.6)):
        kugel(px, 4.66, FB + pz, 0.24*sc, SCHW, 8)
        for s in (-1, 1):
            o = box(px + s*0.62*sc, 4.66, FB + pz + 0.06*sc, 1.00*sc, 0.10, 0.44*sc, SCHW)
            o.rotation_euler[1] = -s*0.30
    # --- Kuerbisse am Boden
    for (px, py, r) in ((-7.4, 6.6, 0.52), (-6.2, 7.4, 0.40), (7.2, 6.8, 0.48),
                        (6.0, 7.6, 0.36), (0.0, 7.8, 0.44)):
        o = kugel(px, py, FB + r*0.86, r, ORAN, 10); o.scale[2] = 0.80
        zyl(px, py, FB + r*1.62, r*0.16, r*0.5, STIE, 8)
        for s in (-1, 1):                                       # leuchtende Augen
            flach(kugel(px + s*r*0.34, py + r*0.86, FB + r*1.0, r*0.15, L_O, 6))
    # --- Zaun mit Luecke vor den Toren
    for i in range(15):
        px = -9.8 + i*1.40
        if abs(px) < 6.2: continue
        box(px, 8.6, FB + 0.56, 0.10, 0.10, 1.12, HOLZ)
    export("th32_geisterbahn", 0.018, 2)

# ================================================================ 8) Parkeingang
def parkeingang():
    """Haupteingang: Torbogen zwischen zwei Tuermen, vier Kassenhaeuschen,
    Drehkreuze und Fahnen. Begehbar in der Mitte (4,2 m lichte Durchfahrt),
    Schauseite +y. Reihbar ist er NICHT — er ist der eine Eingang."""
    neu()
    MAUE = mat("PeMauer",  (0.86,0.76,0.60), 0.85)
    MAU2 = mat("PeMauer2", (0.72,0.60,0.44), 0.88)
    DACH = mat("PeDach",   (0.20,0.52,0.72), 0.6)
    HOLZ = mat("PeHolz",   (0.46,0.30,0.18), 0.85)
    GLAS = mat("PeGlas",   (0.62,0.80,0.88), 0.15, 0.1)
    STAH = mat("PeStahl",  (0.70,0.72,0.76), 0.4, 0.55)
    GOLD = mat("PeGold",   (0.92,0.74,0.22), 0.35, 0.65)
    ROT  = mat("PeFahne",  (0.88,0.20,0.24), 0.7)
    BLAU = mat("PeFahne2", (0.18,0.44,0.80), 0.7)
    BODE = mat_bild("PeBoden", "parkpflaster.png", (1.0,1.0,1.0), 0.9)
    SCHI = mat("PeSchild", (0.14,0.18,0.26), 0.4, 0.0, (0.98,0.72,0.20), 2.2)
    L_W = leucht("PeLampe", (1.00,0.95,0.78), 2.8)
    L_R = leucht("PeRot",   (1.00,0.32,0.32), 2.6)
    L_B = leucht("PeBlau",  (0.40,0.70,1.00), 2.6)
    LAM = [L_W, L_R, L_W, L_B]

    B, T = 26.0, 10.0
    uv_kacheln(platte(B, T, BODE), 2.6)
    box(0, 0, FB + 0.02, 5.4, T, 0.06, MAU2)                    # Pflasterband der Durchfahrt
    # --- zwei Tuerme
    for sx in (-1, 1):
        cx = sx*5.20
        box(cx, 0, FB + 4.40, 3.60, 4.40, 8.80, MAUE)
        box(cx, 0, FB + 8.95, 4.20, 5.00, 0.30, MAU2)           # Kranz
        for i in range(6):                                       # Zinnen
            box(cx - 1.75 + i*0.70, -2.30, FB + 9.42, 0.46, 0.40, 0.64, MAU2)
            box(cx - 1.75 + i*0.70,  2.30, FB + 9.42, 0.46, 0.40, 0.64, MAU2)
        kegel(cx, 0, FB + 11.30, 2.60, 0.10, 3.20, DACH, 8)
        box(cx, 0, FB + 13.30, 0.12, 0.12, 0.80, STAH)
        box(cx, 0.55, FB + 13.45, 0.06, 1.10, 0.70, ROT if sx < 0 else BLAU)
        for zz in (2.6, 5.4):                                    # Fenster
            box(cx, 2.22, FB + zz, 1.10, 0.14, 1.30, GLAS)
            box(cx, 2.28, FB + zz, 1.30, 0.10, 1.50, HOLZ)
            box(cx, 2.30, FB + zz, 1.30, 0.08, 0.10, HOLZ)
    # --- Bogen zwischen den Tuermen (Segmente, KEIN Vollquader — sonst ist es ein Riegel)
    NB = 13
    for i in range(NB):
        a = math.pi*(i + 0.5)/NB
        px = -3.40*math.cos(a)
        pz = FB + 5.60 + 2.30*math.sin(a)
        o = box(px, 0, pz, 0.86, 3.20, 0.70, MAUE)
        o.rotation_euler[1] = a - math.pi/2
    box(0, 0, FB + 8.30, 7.40, 3.60, 0.60, MAU2)                # Riegel ueber dem Bogen
    box(0, 0, FB + 8.86, 8.20, 4.00, 0.30, MAU2)
    box(0, -1.70, FB + 9.70, 6.60, 0.26, 1.40, SCHI)            # Schriftschild
    box(0,  1.70, FB + 9.70, 6.60, 0.26, 1.40, SCHI)
    for i in range(9):
        flach(kugel(-3.2 + i*0.80, 1.86, FB + 10.55, 0.13, LAM[i % 4], 8))
        flach(kugel(-3.2 + i*0.80, -1.86, FB + 10.55, 0.13, LAM[i % 4], 8))
    for s in (-1, 1):                                            # Bogenlaibung
        box(0, s*1.66, FB + 5.60, 6.90, 0.24, 4.60, MAU2)
    # --- vier Kassenhaeuschen, zwei je Seite, Theke auf +y
    for sx in (-1, 1):
        for k in (0, 1):
            cx = sx*(8.60 + k*3.40)
            box(cx, -0.40, FB + 1.55, 2.90, 3.00, 3.10, MAUE)
            box(cx, -0.40, FB + 3.28, 3.40, 3.50, 0.36, DACH)
            kegel(cx, -0.40, FB + 3.90, 1.90, 0.10, 0.90, DACH, 8)
            box(cx, 1.16, FB + 1.70, 2.10, 0.14, 1.20, GLAS)     # Schalterscheibe
            box(cx, 1.24, FB + 1.02, 2.40, 0.36, 0.14, HOLZ)     # Ablage
            flach(kugel(cx, 1.10, FB + 2.60, 0.14, L_W, 8))
    # --- Drehkreuze links und rechts der Durchfahrt
    _kreuze = []
    for sx in (-1, 1):
        for k in (0, 1):
            cx = sx*(3.10 + k*1.60)
            zyl(cx, 0, FB + 0.55, 0.13, 1.10, STAH, 10)
            _vorD = set(bpy.context.scene.objects)
            for a3 in range(3):
                b = TAU*a3/3.0 + k*0.4
                strebe((cx, 0, FB + 0.98),
                       (cx + math.cos(b)*0.62, math.sin(b)*0.62, FB + 0.98), 0.08, STAH)
            _kreuze.append((seit(_vorD), cx))
    # --- Fahnenmasten aussen
    for sx in (-1, 1):
        px = sx*12.20
        box(px, 3.20, FB + 3.10, 0.14, 0.14, 6.20, STAH)
        box(px, 3.20 + 0.60, FB + 5.40, 0.06, 1.20, 0.80, ROT if sx < 0 else BLAU)
        flach(kugel(px, 3.20, FB + 6.28, 0.16, GOLD, 8))
    def _anim():
        for i, (g, cx) in enumerate(_kreuze):
            dreh_anim(g, "Drehkreuz%d" % i, 2, 240, 1.0 if i % 2 == 0 else -1.0,
                      pivot=(cx, 0, FB))
    export("th32_parkeingang", 0.018, 2, anim=_anim)

if __name__ == "__main__":
    print("Asset-Charge 32 (th32, Freizeitpark-Erweiterung):")
    for fn in (achterbahn_kurve, achterbahn_station, kettenkarussell, piratenschiff,
               wildwasserbahn, teetassen, geisterbahn, parkeingang):
        fn()
    print("fertig")
