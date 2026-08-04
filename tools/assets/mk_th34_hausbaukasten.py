# -*- coding: utf-8 -*-
"""Asset-Charge 34 (th34_*): HAUS-BAUKASTEN.
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

DAS RASTER — der ganze Sinn dieser Charge
  Alle Teile sitzen auf EINEM Raster, damit man ohne Nachmessen bauen kann:

      Wandmodul      4,000 (x) x 0,300 (y) x 2,750 (z)   ->  reihen: x += 4,00
      Geschossdecke  4,000 x 4,000 x 0,250
      Geschosshoehe  2,750 + 0,250 = 3,000               ->  stapeln: z += 3,00
      Ecke           0,300 x 0,300 Pfeiler, Aussenkante buendig zur Wandflucht

  Jedes Teil ist in x UND y auf die Mitte zentriert, die Unterkante liegt auf
  z = 0. Ein Wandmodul an (0,0) belegt also x -2,00 … +2,00 und y -0,15 … +0,15.
  Die Wandflucht ist damit y = 0 — aussen ist +y (three.js -z, die Schauseite).

  ⚠️ Die Bounding-Box ist bei einigen Teilen GROESSER als das Raster: Fensterbank,
  Gesims und Tuerstufe springen bewusst vor. Verankert wird immer am RASTER, nie
  an der Box-Mitte. Steht bei jedem Teil in der Tabelle in models/TH5-ASSETS.md.

Texturen kommen aus `textures/th32` (Charge 32), die Fassade aus `hausputz.png`.
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

def keil_x(prof, cx, breite, m=None, cy=0.0, cz=0.0):
    """Extrudiert ein beliebiges konvexes Profil aus der y-z-Ebene entlang x.
    Damit sind Gaubenwangen, Erkerkonsolen und Pultflaechen EIN Bauteil statt
    drei handgeschriebener `from_pydata`-Bloecke.

    ⚠️ UVs werden hier erzeugt. `from_pydata` legt KEINE UV-Ebene an; ein Mesh
    ohne UVs zeigt eine Bildtextur als einfarbige Flaeche (genau der Fehler, der
    in Charge 32 das gestreifte Stationsdach knallrot gemacht hat)."""
    n = len(prof)
    v = [(cx - breite/2.0, cy + p[0], cz + p[1]) for p in prof] + \
        [(cx + breite/2.0, cy + p[0], cz + p[1]) for p in prof]
    f = [tuple(range(n)), tuple(range(2*n - 1, n - 1, -1))]
    for i in range(n):
        j = (i + 1) % n
        f.append((i, j, n + j, n + i))
    me = bpy.data.meshes.new("Keil"); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new("Keil", me); bpy.context.collection.objects.link(o)
    if m: me.materials.append(m)
    bpy.context.view_layer.objects.active = o
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free(); me.update()
    uvl = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            uvl.data[li].uv = (p.x if abs(poly.normal.x) < 0.5 else p.y, p.z)
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



# ---------------------------------------------------------------- Rastermasse
BR, DI, WH, DE = 4.00, 0.30, 2.75, 0.25      # Breite, Dicke, Wandhoehe, Deckenstaerke
GH = WH + DE                                  # Geschosshoehe 3,000
DSP, DHH = 4.40, 1.70                         # Satteldach: Spannweite quer, Firsthoehe
DNEIG = DHH / (DSP/2.0)                       # 0,7727 -> 37,7 Grad Dachneigung

# Diese drei Zahlen standen frueher als Literale in dach_sattel, dach_giebel UND
# in der Gaube. Als die Gaube dazukam, war ihr Anschnitt aus einer per Hand
# nachgerechneten Neigung gebaut — driftet eine der Kopien, klafft eine Fuge.

def _mats():
    """Ein Satz Materialien fuer alle Teile — gleiche Farbwelt ueber den Baukasten."""
    return {
      "putz":  mat_bild("HbPutz",  "hausputz.png", (0.97,0.95,0.90), 0.85),
      "sockel":mat("HbSockel", (0.62,0.60,0.56), 0.90),
      "rahm":  mat("HbRahmen", (0.95,0.94,0.90), 0.60),
      "bank":  mat("HbBank",   (0.80,0.78,0.72), 0.75),
      "glas":  mat("HbGlas",   (0.68,0.82,0.90), 0.15, 0.05),
      "holz":  mat("HbHolz",   (0.46,0.30,0.18), 0.70),
      "dach":  mat("HbDach",   (0.44,0.26,0.22), 0.75),
      "metall":mat("HbMetall", (0.72,0.74,0.78), 0.35, 0.55),
      "boden": mat_bild("HbBoden", "bohlen.png", (1.0,0.96,0.90), 0.85),
    }

def sockelband(m):
    """Umlaufendes Sockelband am Wandfuss — ohne das steht jede Wand wie ein
    Brett auf dem Boden."""
    return box(0, 0, 0.22, BR, DI + 0.08, 0.44, m)

def putzflaeche(x, z, bx, bz, m, kachel=1.6):
    """Wandstueck mit auf Weltmass gebrachten UVs."""
    return uv_kacheln(box(x, 0, z, bx, DI, bz, m), kachel)

def _modul(name, bauer, bevel=0.014):
    """Ein Bauteil einzeln exportieren. Die Geometrie steckt in den `_b_*`-Funktionen,
    die NICHT `neu()` rufen — nur so lassen sie sich auch zu einem Haus kombinieren.
    Vorher rief jedes Modul selbst `neu()`, was die Szene leert: das Beispielhaus
    bestand deshalb nur aus dem zuletzt gesetzten Teil (gemessen 4,00 x 1,61 —
    das war der Balkon)."""
    neu(); bauer(); export(name, bevel, 2)

# ================================================================ 1) Wand voll
def _b_wand_voll():
    """Geschlossenes Wandmodul. Sockelband unten, Traufgesims oben — genau die
    zwei Kanten, die eine Wand als Bauteil lesbar machen."""
    M = _mats()
    putzflaeche(0, WH/2, BR, WH, M["putz"])
    sockelband(M["sockel"])
    box(0, 0, WH - 0.09, BR, DI + 0.12, 0.18, M["sockel"])   # Traufgesims

def wand_voll():
    _modul("th34_wand_voll", _b_wand_voll, 0.014)

# ================================================================ 2) Wand mit Fenster
def _fenster(cx, cz, fb, fh, M):
    """Fensteroeffnung als DREI Wandstuecke plus Laibung — ein aufgemaltes
    Rechteck auf voller Wand ist kein Fenster, man sieht keine Tiefe."""
    lo, ro = cx - fb/2, cx + fb/2
    putzflaeche((-BR/2 + lo)/2, cz, lo + BR/2, fh, M["putz"])           # links
    putzflaeche((ro + BR/2)/2, cz, BR/2 - ro, fh, M["putz"])            # rechts
    box(cx, 0, cz, fb, DI*0.55, fh, M["glas"])                          # Glas, zurueckgesetzt
    for s in (-1, 1):                                                    # Laibung
        box(cx + s*(fb/2 + 0.06), 0, cz, 0.12, DI + 0.02, fh + 0.24, M["rahm"])
    box(cx, 0, cz + fh/2 + 0.06, fb + 0.24, DI + 0.02, 0.12, M["rahm"])  # Sturz
    box(cx, 0.06, cz - fh/2 - 0.09, fb + 0.42, DI + 0.22, 0.10, M["bank"])  # Bank
    box(cx, -DI*0.18, cz, 0.05, 0.05, fh, M["rahm"])                     # Sprossen
    box(cx, -DI*0.18, cz, fb, 0.05, 0.05, M["rahm"])

def _b_wand_fenster():
    """Wandmodul mit einem mittigen Fenster 1,60 x 1,30."""
    M = _mats()
    FB, FH, FZ = 1.60, 1.30, 1.52
    putzflaeche(0, (FZ - FH/2)/2, BR, FZ - FH/2, M["putz"])              # Bruestung
    putzflaeche(0, (FZ + FH/2 + WH)/2, BR, WH - FZ - FH/2, M["putz"])    # Sturzfeld
    _fenster(0, FZ, FB, FH, M)
    sockelband(M["sockel"])
    box(0, 0, WH - 0.09, BR, DI + 0.12, 0.18, M["sockel"])

def wand_fenster():
    _modul("th34_wand_fenster", _b_wand_fenster, 0.014)

def _b_wand_fenster2():
    """Wandmodul mit zwei schmalen Fenstern — fuer Treppenhaus und Bad."""
    M = _mats()
    FB, FH, FZ = 0.85, 1.30, 1.52
    putzflaeche(0, (FZ - FH/2)/2, BR, FZ - FH/2, M["putz"])
    putzflaeche(0, (FZ + FH/2 + WH)/2, BR, WH - FZ - FH/2, M["putz"])
    putzflaeche(0, FZ, 1.10, FH, M["putz"])                              # Mittelpfeiler
    for s in (-1, 1):
        cx = s*1.10
        box(cx, 0, FZ, FB, DI*0.55, FH, M["glas"])
        for q in (-1, 1):
            box(cx + q*(FB/2 + 0.06), 0, FZ, 0.12, DI + 0.02, FH + 0.24, M["rahm"])
        box(cx, 0, FZ + FH/2 + 0.06, FB + 0.24, DI + 0.02, 0.12, M["rahm"])
        box(cx, 0.06, FZ - FH/2 - 0.09, FB + 0.42, DI + 0.22, 0.10, M["bank"])
        box(cx, -DI*0.18, FZ, 0.05, 0.05, FH, M["rahm"])
    putzflaeche(0, FZ, 0.0001, FH, M["putz"])
    sockelband(M["sockel"])
    box(0, 0, WH - 0.09, BR, DI + 0.12, 0.18, M["sockel"])

def wand_fenster2():
    _modul("th34_wand_fenster2", _b_wand_fenster2, 0.014)

# ================================================================ 4) Wand mit Tuer
def _b_wand_tuer():
    """Wandmodul mit Haustuer 1,10 x 2,15, Zarge, Oberlicht und Stufe."""
    M = _mats()
    TB, TH = 1.10, 2.15
    putzflaeche(0, (TH + WH)/2, BR, WH - TH, M["putz"])                  # Sturzfeld
    for s in (-1, 1):                                                     # Wandfelder seitlich
        b = BR/2 - TB/2
        putzflaeche(s*(TB/2 + b/2), TH/2, b, TH, M["putz"])
    box(0, 0, TH/2, TB, DI*0.5, TH, M["holz"])                            # Tuerblatt
    # Die Fuellungen sassen bei TH*0.30 +- TH*0.24 und waren TH*0.26 hoch — die
    # untere ragte damit 0,15 m UNTER die Tuer hinaus (gemessene zmin -0,151).
    for cz in (TH*0.28, TH*0.66):
        box(0, -DI*0.16, cz, TB*0.62, 0.04, TH*0.24, M["holz"])
    box(0, -DI*0.16, TH - 0.24, TB*0.70, 0.04, 0.22, M["glas"])           # Oberlicht
    for s in (-1, 1):                                                     # Zarge
        box(s*(TB/2 + 0.07), 0, (TH + 0.14)/2, 0.14, DI + 0.04, TH + 0.14, M["rahm"])
    box(0, 0, TH + 0.07, TB + 0.28, DI + 0.04, 0.14, M["rahm"])           # Sturz
    box(0, -DI*0.30, TH*0.48, 0.06, 0.06, 0.26, M["metall"])              # Griff
    box(0, 0.22, 0.07, TB + 0.60, 0.66, 0.14, M["bank"])                  # Stufe
    sockelband(M["sockel"])
    box(0, 0, WH - 0.09, BR, DI + 0.12, 0.18, M["sockel"])

def wand_tuer():
    _modul("th34_wand_tuer", _b_wand_tuer, 0.014)

# ================================================================ 5) Wand mit Garagentor
def _b_wand_tor():
    """Wandmodul mit Sektional-Garagentor 2,60 x 2,10."""
    M = _mats()
    TB, TH = 2.60, 2.10
    putzflaeche(0, (TH + WH)/2, BR, WH - TH, M["putz"])
    for s in (-1, 1):
        b = BR/2 - TB/2
        putzflaeche(s*(TB/2 + b/2), TH/2, b, TH, M["putz"])
    box(0, 0, TH/2, TB, DI*0.42, TH, M["rahm"])                           # Torblatt
    for q in range(1, 5):                                                 # Paneelfugen
        box(0, -DI*0.14, q*TH/5, TB + 0.02, 0.05, 0.05, M["metall"])
    for s in (-1, 1):
        box(s*(TB/2 + 0.09), 0, (TH + 0.18)/2, 0.18, DI + 0.04, TH + 0.18, M["sockel"])
    box(0, 0, TH + 0.09, TB + 0.36, DI + 0.04, 0.18, M["sockel"])
    box(0, -DI*0.26, 0.68, 0.44, 0.08, 0.10, M["metall"])                 # Griff
    sockelband(M["sockel"])
    box(0, 0, WH - 0.09, BR, DI + 0.12, 0.18, M["sockel"])

def wand_tor():
    _modul("th34_wand_tor", _b_wand_tor, 0.014)

# ================================================================ 6) Ecke
def _b_ecke():
    """Eckpfeiler 0,30 x 0,30, Aussenkanten buendig zur Wandflucht beider Seiten.
    Ohne ihn klafft an jeder Hausecke eine Fuge, weil zwei Wandmodule im rechten
    Winkel nur ihre Stirnseiten aneinanderlegen."""
    M = _mats()
    box(0, 0, WH/2, DI, DI, WH, M["putz"])
    box(0, 0, 0.22, DI + 0.10, DI + 0.10, 0.44, M["sockel"])
    box(0, 0, WH - 0.09, DI + 0.14, DI + 0.14, 0.18, M["sockel"])
    for zz in (0.9, 1.55, 2.2):                                           # Eckquaderung
        box(0, 0, zz, DI + 0.06, DI + 0.06, 0.22, M["bank"])

def ecke():
    _modul("th34_ecke", _b_ecke, 0.012)

# ================================================================ 7) Geschossdecke
def _b_decke():
    """Decken-/Bodenplatte 4,00 x 4,00 x 0,25. Oberseite gedielt, Unterseite glatt."""
    M = _mats()
    # Nur EINE Platte. Eine zweite Dielenschicht bei DE-0.015 (0,03 hoch) reichte
    # von 0,235 bis 0,265 und ueberlappte damit die Oberkante bei 0,250 — im Bild
    # flimmerte der Boden gegen sich selbst.
    uv_kacheln(box(0, 0, DE/2, BR, BR, DE, M["boden"]), 1.4)
    for s in (-1, 1):                                                     # Randbalken
        box(0, s*(BR/2 - 0.06), DE/2, BR, 0.12, DE, M["sockel"])
        box(s*(BR/2 - 0.06), 0, DE/2, 0.12, BR, DE, M["sockel"])

def decke():
    _modul("th34_decke", _b_decke, 0.01)

# ================================================================ 8) Satteldach-Modul
def _b_dach_sattel():
    """Satteldach-Abschnitt, 4,00 m lang, First in x — beliebig reihbar.
    Als PRISMA gebaut: `kegel(vertices=4)` waere eine Pyramide, deren Ecken auf
    den Achsen liegen, und das Modul waere breiter als sein Raster."""
    M = _mats()
    SP, HH = DSP, DHH                       # Spannweite quer, Firsthoehe
    o = giebel(0, 0, 0, SP/2, HH, BR, M["dach"], 'y')
    for s in (-1, 1):                       # Traufbrett
        box(0, s*(SP/2 - 0.06), 0.10, BR + 0.04, 0.16, 0.20, M["holz"])
    box(0, 0, HH - 0.04, BR + 0.04, 0.26, 0.14, M["holz"])   # Firstziegel

def dach_sattel():
    _modul("th34_dach_sattel", _b_dach_sattel, 0.012)

# ================================================================ 9) Giebelwand
def _b_dach_giebel():
    """Giebel-Abschluss fuer das Satteldach — dreieckige Wandflaeche mit
    Lueftungsluke."""
    M = _mats()
    SP, HH = DSP, DHH
    g = giebel(0, 0, 0, SP/2, HH, DI, M["putz"], 'x')
    box(0, 0, HH*0.42, 0.62, DI + 0.06, 0.46, M["holz"])
    box(0, -DI*0.4, HH*0.42, 0.46, 0.05, 0.32, M["metall"])

def dach_giebel():
    _modul("th34_dach_giebel", _b_dach_giebel, 0.012)

# ================================================================ 10) Treppe
def _b_treppe_modul():
    """Gerader Treppenlauf ueber eine Geschosshoehe (3,00 m) auf 4,00 m Lauflaenge.
    17 Steigungen a 0,176 — das ist die Steigung, die sich im Spiel begehbar
    anfuehlt; flacher wird der Lauf zu lang fuer das Raster."""
    M = _mats()
    n = 17
    st, au = GH/n, BR/n
    for i in range(n):
        box(-BR/2 + au*(i + 0.5), 0, st*(i + 0.5), au*1.02, 1.10, st, M["sockel"])
        box(-BR/2 + au*(i + 0.5), 0, st*(i + 1) - 0.02, au*1.06, 1.14, 0.04, M["bank"])
    for s in (-1, 1):                                                     # Wange + Handlauf
        for i in range(0, n, 3):
            box(-BR/2 + au*(i + 0.5), s*0.58, st*(i + 1) + 0.50, 0.07, 0.07, 1.00, M["metall"])
        o = box(0, s*0.58, GH/2 + 0.52, BR*1.03, 0.09, 0.09, M["metall"])
        o.rotation_euler[1] = -math.atan2(GH, BR)

def treppe_modul():
    _modul("th34_treppe", _b_treppe_modul, 0.012)

# ================================================================ 11) Balkon
def _b_balkon():
    """Auskragender Balkon, 4,00 m breit, 1,60 m tief — passt genau auf ein
    Wandmodul und wird an dessen Aussenseite gesetzt."""
    M = _mats()
    T = 1.60
    box(0, T/2, 0.09, BR, T, 0.18, M["sockel"])
    box(0, T - 0.06, 0.62, BR, 0.10, 0.90, M["rahm"])                     # Bruestung vorn
    for s in (-1, 1):
        box(s*(BR/2 - 0.05), T/2, 0.62, 0.10, T, 0.90, M["rahm"])
    for i in range(11):                                                   # Staebe
        box(-BR/2 + 0.2 + i*0.36, T - 0.06, 0.60, 0.05, 0.06, 0.84, M["metall"])
    box(0, T - 0.06, 1.10, BR, 0.14, 0.08, M["holz"])                     # Handlauf
    # ACHTUNG: Die Konsolen haengen ABSICHTLICH unter z = 0. Der Balkon wird an
    # der Geschossdecke montiert, seine OBERKANTE ist der Bezugspunkt — die
    # Streben greifen darunter an die Fassade. Einziges Teil der Charge mit
    # zmin < 0; steht so in der Doku.
    for s in (-1, 1):
        o = strebe((s*1.5, 0.06, 0.02), (s*1.5, T - 0.3, -0.55), 0.12, M["sockel"])

def balkon():
    _modul("th34_balkon", _b_balkon, 0.012)

# ================================================================ 12) Erweiterung
def _b_wand_schaufenster():
    """Erdgeschoss-Wand mit Schaufenster fuer Stadthaeuser: breite Verglasung,
    Sockelplatte, Markisenkasten."""
    M = _mats()
    FB, FH, FZ = 3.10, 1.75, 1.60
    putzflaeche(0, (FZ - FH/2)/2, BR, FZ - FH/2, M["putz"])
    putzflaeche(0, (FZ + FH/2 + WH)/2, BR, WH - FZ - FH/2, M["putz"])
    for s2 in (-1, 1):
        b = (BR - FB)/2
        putzflaeche(s2*(FB/2 + b/2), FZ, b, FH, M["putz"])
    box(0, 0, FZ, FB, DI*0.5, FH, M["glas"])
    box(0, -DI*0.18, FZ, 0.06, 0.06, FH, M["rahm"])            # Mittelpfosten
    for s2 in (-1, 1):
        box(s2*(FB/2 + 0.07), 0, FZ, 0.14, DI + 0.02, FH + 0.26, M["rahm"])
    box(0, 0, FZ + FH/2 + 0.07, FB + 0.28, DI + 0.02, 0.14, M["rahm"])
    box(0, 0.10, FZ - FH/2 - 0.10, FB + 0.36, DI + 0.30, 0.12, M["bank"])   # Sockelplatte
    # Der Markisenkasten sass bei FZ+FH/2+0.30 und ragte damit auf 2,945 — ueber
    # die Wandkrone von 2,750. Ein Wandmodul MUSS aber genau 2,750 hoch bleiben,
    # sonst stimmt der Geschossstoss beim Stapeln nicht mehr.
    box(0, 0.16, 2.53, FB + 0.30, 0.42, 0.30, M["dach"])                    # Markisenkasten
    sockelband(M["sockel"])
    box(0, 0, WH - 0.09, BR, DI + 0.12, 0.18, M["sockel"])

def wand_schaufenster(): _modul("th34_wand_schaufenster", _b_wand_schaufenster, 0.014)

def _b_erker():
    """Erker: dreiseitig vorspringender Fenstererker, sitzt VOR einem Wandmodul.
    Ragt 0,90 m aus der Wandflucht — deshalb ist die Bounding-Box tiefer als das
    Raster, verankert wird trotzdem am Modulmittelpunkt."""
    M = _mats()
    VT, EB, EH = 0.90, 2.60, 1.90
    for (px, py, bx, by, rot) in ((0, VT, EB, 0.16, 0),
                                  (-EB/2 + 0.08, VT/2, 0.16, VT, 0),
                                  ( EB/2 - 0.08, VT/2, 0.16, VT, 0)):
        box(px, py, 0.14, bx + 0.30, by + 0.30, 0.28, M["sockel"])          # Boden
        box(px, py, 0.28 + EH/2, bx, by, EH, M["glas"])                     # Glas
        box(px, py, 0.28 + EH + 0.10, bx + 0.30, by + 0.30, 0.20, M["bank"])# Deckplatte
    for s2 in (-1, 1):                                                       # Ecklisenen
        box(s2*(EB/2 - 0.08), VT - 0.08, 0.28 + EH/2, 0.20, 0.20, EH, M["rahm"])
    box(0, VT/2, 0.28 + EH + 0.32, EB + 0.34, VT + 0.34, 0.24, M["dach"])   # Erkerdach
    for s2 in (-1, 1):                                                       # Konsolen
        # Vorher zwei duenne Streben — im Bild las sich das wie abgebrochene
        # Beine. Ein Erker haengt an KRAGSTEINEN: massives Dreieck, an der Wand
        # am tiefsten, zur Erkerfront hin auslaufend.
        keil_x([(0.02, 0.14), (VT, 0.14), (0.02, -0.55)], s2*0.9, 0.18, M["sockel"])

def erker(): _modul("th34_erker", _b_erker, 0.012)

def _b_gaube():
    """Schleppgaube fuers Satteldach.

    ⚠️ ZWEI Fehler steckten in der ersten Fassung, beide erst im Bild sichtbar:
    (1) Die Stirnwand sass bei y = GT/2 — also MITTIG zwischen den Wangen statt
        vorne. Von der Schauseite sah die Gaube dadurch aus wie eine oben offene
        Kiste: man blickte an der Wand vorbei ins Innere.
    (2) Die Wangen waren Quader mit waagrechter Unterkante. Eine Gaube sitzt aber
        auf einer 37,7-Grad-Schraege — der Quader verschwand hinten im Dach und
        stand vorne in der Luft.
    Jetzt: Wangen als Keil, dessen Unterkante GENAU auf DNEIG liegt.

    ANKER (wichtig fuers Setzen): Ursprung ist die VORDERE UNTERKANTE, also der
    Punkt, wo die Gaube die Dachhaut trifft. y = 0 ist die Traufseite, der Koerper
    liegt bei negativem y (dachaufwaerts). Damit setzt man sie mit genau einer
    Zahl: der Dachhoehe an der gewuenschten Traufe."""
    M = _mats()
    GB, GH2, GT = 1.70, 1.15, 1.30                # Breite, Stirnhoehe, Tiefe
    ZH = GT * DNEIG                               # 1,0045 — Anschnitt hinten
    DA = 0.42                                     # Dachueberhoehung hinten
    for s2 in (-1, 1):                            # Wangen, unten auf Dachneigung
        keil_x([(-GT, ZH), (0, 0), (0, GH2), (-GT, GH2 + DA)],
               s2*(GB/2 - 0.06), 0.12, M["putz"])
    # Die Stirnwand ist ein RAHMEN, kein Brett. In der ersten Fassung war sie ein
    # Vollquader 0,14 tief und die Glasscheibe 0,10 tief an derselben Stelle —
    # das Glas steckte KOMPLETT in der Wand. Im Bild: eine blinde Putzflaeche.
    box(0, -0.07, 0.15, GB, 0.14, 0.30, M["putz"])                # Bruestung
    box(0, -0.07, GH2 - 0.11, GB, 0.14, 0.22, M["putz"])          # Sturz
    for s2 in (-1, 1):
        box(s2*(GB/2 - 0.11), -0.07, GH2/2, 0.22, 0.14, GH2, M["putz"])
    box(0, -0.05, 0.615, GB - 0.44, 0.08, 0.63, M["glas"])        # Scheibe
    box(0, -0.01, 0.615, 0.05, 0.07, 0.63, M["rahm"])             # Sprosse
    box(0, 0.03, 0.06, GB + 0.20, 0.26, 0.12, M["bank"])          # Sohlbank
    kz = lambda y: GH2 + DA - (DA/GT)*(y + GT)    # Oberkante der Wange bei y
    keil_x([(-GT - 0.02, kz(-GT - 0.02)), (0.16, kz(0.16)),
            (0.16, kz(0.16) + 0.14), (-GT - 0.02, kz(-GT - 0.02) + 0.14)],
           0, GB + 0.30, M["dach"])                                # Gaubendach

def gaube(): _modul("th34_gaube", _b_gaube, 0.012)

def _b_dach_pult():
    """Pultdach-Abschnitt 4,00 m — fuer Anbauten, Garagen und Carports.
    Als PRISMA gebaut, nicht als gekippter Quader: ein gekippter Quader haette an
    Traufe und First keilfoermige Luecken."""
    M = _mats()
    SP, HH = 4.40, 1.10
    keil_x([(-SP/2, 0.0), (SP/2, HH), (SP/2, HH + 0.22), (-SP/2, 0.22)],
           0, BR, M["dach"])
    for (py, pz) in ((-SP/2 + 0.06, 0.11), (SP/2 - 0.06, HH + 0.11)):
        box(0, py, pz, BR + 0.04, 0.16, 0.22, M["holz"])          # Traufbretter

def dach_pult(): _modul("th34_dach_pult", _b_dach_pult, 0.012)

def _b_dach_flach():
    """Flachdach mit Attika — fuer Stadt- und Gewerbebauten. Die Attika ist ein
    RING aus vier Balken: eine Vollplatte deckt die Dachflaeche zu und macht aus
    jedem Flachdach einen Klotz."""
    M = _mats()
    box(0, 0, DE/2, BR, BR, DE, M["sockel"])                      # Dachplatte
    box(0, 0, DE + 0.02, BR - 0.5, BR - 0.5, 0.06, M["dach"])     # Kiesfeld
    for s2 in (-1, 1):
        box(0, s2*(BR/2 - 0.11), DE + 0.30, BR, 0.22, 0.60, M["putz"])
        box(s2*(BR/2 - 0.11), 0, DE + 0.30, 0.22, BR - 0.44, 0.60, M["putz"])
    for s2 in (-1, 1):                                            # Abdeckplatte
        box(0, s2*(BR/2 - 0.11), DE + 0.63, BR + 0.10, 0.32, 0.08, M["bank"])
        box(s2*(BR/2 - 0.11), 0, DE + 0.63, 0.32, BR - 0.44, 0.08, M["bank"])

def dach_flach(): _modul("th34_dach_flach", _b_dach_flach, 0.012)

def _b_kamin():
    """Schornstein mit Krone und Abdeckung.
    Die Krone stand vorher nur auf ZWEI Pfosten (x-Seiten) — von vorn sah der
    Kamin dadurch aus wie ein T. Eine Krone ist ein RING: vier Pfosten."""
    M = _mats()
    box(0, 0, 0.85, 0.62, 0.62, 1.70, M["dach"])                  # Schaft, Ziegelton
    box(0, 0, 1.76, 0.78, 0.78, 0.22, M["bank"])                  # Gesims
    for s2 in (-1, 1):                                            # Krone, 4 Pfosten
        box(s2*0.26, 0, 2.02, 0.10, 0.62, 0.30, M["bank"])
        box(0, s2*0.26, 2.02, 0.42, 0.10, 0.30, M["bank"])
    box(0, 0, 2.20, 0.86, 0.86, 0.10, M["bank"])                  # Abdeckplatte
    box(0, 0, 0.85, 0.66, 0.66, 0.10, M["bank"])                  # Zierring

def kamin(): _modul("th34_kamin", _b_kamin, 0.010)

# ================================================================ 13) Beispielhaus
def _teil(fn, px, py, rot=0.0, pz=0.0):
    """Baut ein Modul und setzt es als GANZES an seinen Platz.
    Das Empty bekommt bewusst KEINE matrix_parent_inverse — die Kinder SOLLEN sich
    mitbewegen. (Genau umgekehrt zur Regel bei Animationen, wo die Inverse die
    Weltlage der Kinder erhaelt.)"""
    vor = set(bpy.context.scene.objects)
    fn()
    emp = bpy.data.objects.new("Platz", None)
    bpy.context.collection.objects.link(emp)
    emp.location = (px, py, pz); emp.rotation_euler[2] = rot
    for o in list(bpy.context.scene.objects):
        if o in vor or o is emp: continue
        o.parent = emp
    return emp

def beispielhaus():
    """Fertiges Haus, NUR aus den dokumentierten Rasterschritten zusammengesetzt —
    keine Sonderzahlen. Das ist zugleich der Beweis, dass das Raster stimmt: bliebe
    an Ecken oder Geschossstoessen eine Fuge, waere die Massangabe falsch.

    Grundriss 8 x 4 m (zwei Module breit, eines tief), zwei Geschosse:
        Sued  y = -2, rot pi     |  Nord y = +2, rot 0
        West  x = -4, rot pi/2   |  Ost  x = +4, rot -pi/2
        Ecken (+-4, +-2) · Decken (+-2, 0) auf z = 2,75 bzw. 5,75
        Satteldach (+-2, 0) auf z = 6,00 · Giebel (+-4, 0) quer dazu
    """
    neu()
    def w(fn, px, py, rot, g):
        _teil(fn, px, py, rot, g*GH)
    for g in (0, 1):
        w(_b_wand_tuer if g == 0 else _b_wand_fenster, -2, -2, math.pi, g)   # Sued
        w(_b_wand_fenster,                           2, -2, math.pi, g)
        w(_b_wand_fenster2, -2, 2, 0, g)                                  # Nord
        w(_b_wand_voll,      2, 2, 0, g)
        w(_b_wand_tor if g == 0 else _b_wand_fenster, -4, 0,  math.pi/2, g)  # West
        w(_b_wand_fenster,                          4, 0, -math.pi/2, g)  # Ost
        for sx in (-4, 4):
            for sy in (-2, 2):
                _teil(_b_ecke, sx, sy, 0, g*GH)
        for sx in (-2, 2):
            _teil(_b_decke, sx, 0, 0, g*GH + WH)
    for sx in (-2, 2):
        _teil(_b_dach_sattel, sx, 0, 0, 2*GH)
    for sx in (-4, 4):
        _teil(_b_dach_giebel, sx, 0, math.pi/2, 2*GH)
    _teil(_b_balkon, 2, -2, math.pi, GH + WH)
    # Gaube: Traufe der Gaube bei y = -1,90 (0,30 innerhalb der Dachtraufe -2,20).
    # Die Setzhoehe ist KEINE geratene Zahl, sondern die Dachhoehe an genau
    # dieser Stelle — sonst steckt die Gaube im Dach (so war es im ersten Bild:
    # 0,55 m zu tief, sichtbar blieb nur das Gaubendach als Platte).
    GA_Y = -1.90
    _teil(_b_gaube, -2, GA_Y, math.pi, 2*GH + DHH*(1 - abs(GA_Y)/(DSP/2)))
    _teil(_b_kamin, 2.6, 0.9, 0, 2*GH + 0.9)          # Schornstein am First
    export("th34_beispielhaus", 0.014, 2)

if __name__ == "__main__":
    print("Asset-Charge 34 (th34, Haus-Baukasten):")
    for fn in (wand_voll, wand_fenster, wand_fenster2, wand_tuer, wand_tor,
               ecke, decke, dach_sattel, dach_giebel, treppe_modul, balkon,
               wand_schaufenster, erker, gaube, dach_pult, dach_flach, kamin,
               beispielhaus):
        fn()
    print("fertig")
