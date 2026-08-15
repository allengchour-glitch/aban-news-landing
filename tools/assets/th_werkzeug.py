# -*- coding: utf-8 -*-
"""WERKZEUGKASTEN fuer die Zier-Chargen (th35, th36, ...).

Herausgeloest aus `mk_th35_zierwerk.py`: derselbe 200-Zeilen-Block stand vorher in
jeder Charge noch einmal. Beim Gold-Fix (metallic 0,90 wird ohne Environment-Map
schwarz) haette man ihn zweimal aendern muessen — und die zweite Kopie vergessen.

Die zwei Werkzeuge, um die es geht:
  `dreh(profil, ...)`   Drehkoerper aus (radius, hoehe)-Punkten. Eine Brunnenschale
                        aus gestapelten Zylindern zeigt jeden Absatz; ein
                        Drehkoerper hat EINE stetige Silhouette.
  `rohr(punkte, r)`     Rundrohr entlang einer Bezier-Kurve. Aus geraden Streben
                        gebaut sieht ein Schmiedebogen aus wie ein Rohrschaden.

Konventionen (siehe models/TH5-ASSETS.md):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Schauseite auf Blender +y  ->  three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT, sonst fehlt der Bevel.

⚠️ Drehkoerper und Rohre duerfen NICHT durch `runden()`: sie sind bereits rund, ein
   zweiter Bevel erzeugt nur Fehlkanten und verdreifacht die Dreiecke. Beide Helfer
   setzen darum selbst das `nb`-Flag.

⚠️ Pfade kommen aus `__file__`, nicht aus einem festen /home-Pfad — sonst laesst sich
   die Charge in einem zweiten Arbeitsbaum nicht bauen (Charge 34 schrieb ins falsche
   Verzeichnis).
"""
import bpy, bmesh, os, math
from mathutils import Vector, Euler

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.dirname(os.path.dirname(HIER))
TEXDIR = os.path.join(WURZEL, "textures", "th32")
OUT_GLB = os.path.join(WURZEL, "models")
OUT_STL = os.path.join(WURZEL, "models", "stl")
os.makedirs(OUT_STL, exist_ok=True)

TAU = math.tau
_TEXCACHE = {}

# ============================================================ Grundwerkzeug
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

def mat_bild(name, datei, farbe=(1.0,1.0,1.0), rough=0.8, metal=0.0, tint=False):
    """Material mit Bildtextur.

    ⚠️ `farbe` wirkt NUR mit `tint=True`. Ohne den Schalter wird die Textur direkt
    auf Base Color gelegt und die uebergebene Farbe ist wirkungslos — in Charge 37
    bekamen dadurch vier Haeuser dieselbe weisse Putzflaeche, obwohl jedem eine
    eigene Fassadenfarbe mitgegeben war. Im Render standen vier weisse Kisten.
    Mit `tint=True` haengt ein Multiply-Mix dazwischen: Textur x Farbe. Das
    Verhalten OHNE Schalter bleibt unveraendert, damit Charge 35/36 nicht neu
    gebaut werden muessen.

    Die Sockel des Mix-Knotens werden ueber ihren TYP gesucht, nicht ueber Index
    oder Namen: `ShaderNodeMix` hat mehrere Sockel namens „A"/„B" (je Datentyp),
    und die Reihenfolge hat sich zwischen Blender-Versionen schon geaendert."""
    m = mat(name, farbe, rough, metal)
    nt = m.node_tree
    tex = nt.nodes.new("ShaderNodeTexImage")
    if datei not in _TEXCACHE:
        _TEXCACHE[datei] = bpy.data.images.load(os.path.join(TEXDIR, datei))
    tex.image = _TEXCACHE[datei]; tex.extension = 'REPEAT'; tex.location = (-380, 240)
    b = nt.nodes["Principled BSDF"]
    if not tint:
        nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
        return m
    mx = None
    for typ in ("ShaderNodeMix", "ShaderNodeMixRGB"):
        try:
            mx = nt.nodes.new(typ)
            if typ == "ShaderNodeMix": mx.data_type = 'RGBA'
            mx.blend_type = 'MULTIPLY'
            break
        except Exception:
            mx = None
    if mx is None:
        nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
        return m
    mx.location = (-160, 240)
    fac = [i for i in mx.inputs if i.type == 'VALUE']
    if fac: fac[0].default_value = 1.0
    cols = [i for i in mx.inputs if i.type == 'RGBA']
    outs = [o for o in mx.outputs if o.type == 'RGBA']
    cols[0].default_value = (farbe[0], farbe[1], farbe[2], 1.0)
    nt.links.new(tex.outputs["Color"], cols[1])
    nt.links.new(outs[0], b.inputs["Base Color"])
    return m

def leucht(name, rgb, estr=3.0):
    return mat(name, rgb, 0.25, 0.0, rgb, estr)

def box(x, y, z, sx, sy, sz, m=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    o = bpy.context.active_object; o.scale = (sx, sy, sz)
    if m: o.data.materials.append(m)
    return o

def zyl(x, y, z, r, h, m=None, seg=24, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x,y,z),
                                        vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kugel(x, y, z, r, m=None, seg=12):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=seg*2, ring_count=seg)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kegel(x, y, z, r1, r2, h, m=None, seg=16, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z),
                                    vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def scheibe(x, y, z, r, m=None, seg=32):
    bpy.ops.mesh.primitive_circle_add(radius=r, location=(x,y,z), vertices=seg, fill_type='NGON')
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return flach(o)

def flach(o):
    """Vom globalen Bevel ausnehmen (Drehkoerper, Rohre, Kugeln — schon rund)."""
    if o is not None: o["nb"] = 1
    return o

# ============================================================ Die zwei neuen Werkzeuge
def dreh(profil, m=None, seg=48, x=0.0, y=0.0, z=0.0, name="Dreh", zu_unten=True):
    """DREHKOERPER aus einem Profil von (radius, hoehe)-Punkten.

    Das Profil laeuft von unten nach oben und beschreibt die AUSSENkante. Ist
    `zu_unten` gesetzt, wird unten und oben je eine Deckflaeche geschlossen —
    sonst sieht man beim Umrunden ins Innere.

    Warum nicht einfach Zylinder stapeln: bei einer Brunnenschale aus fuenf
    Zylindern sieht man fuenf Absaetze. Ein Drehkoerper hat EINE stetige
    Silhouette, und genau daran erkennt das Auge „gedrechselt" statt „gebastelt".

    ⚠️ Ein Profilpunkt mit r = 0 ist erlaubt (Spitze/Achse), aber nur am Anfang
       oder Ende — mittendrin entstehen sonst Flaechen mit Nullbreite."""
    bm = bmesh.new()
    verts = [bm.verts.new((p[0], 0.0, p[1])) for p in profil]
    for i in range(len(verts) - 1):
        bm.edges.new((verts[i], verts[i+1]))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], axis=(0, 0, 1),
                   cent=(0, 0, 0), dvec=(0, 0, 0), angle=TAU, steps=seg, use_merge=True)
    if zu_unten:
        bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.location = (x, y, z)
    if m: me.materials.append(m)
    bpy.context.view_layer.objects.active = o
    # UVs aus Umlaufwinkel und Hoehe — ohne sie zeigt eine Bildtextur eine
    # einfarbige Flaeche (dieselbe Falle wie beim Stationsdach in Charge 32).
    uvl = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            uvl.data[li].uv = (math.atan2(p.y, p.x)/TAU + 0.5, p.z)
    return flach(o)

def rohr(punkte, r, m=None, seg=10, glatt=True, name="Rohr"):
    """RUNDROHR entlang eines Linienzugs — fuer Bogen, Voluten, Gelaender.

    Gebaut als Blender-Kurve mit `bevel_depth`; die Kurve wird sofort zu einem
    Mesh gewandelt, weil der glTF-Export Kurven nicht mitnimmt.

    `glatt=True` macht aus dem Linienzug eine weiche Kurve (NURBS-artig ueber
    'BEZIER' mit automatischen Griffen). Genau das unterscheidet eine Volute von
    einem Streckenzug: bei geraden Segmenten sieht man jeden Knick, und ein
    Schmiedebogen mit Knick sieht aus wie ein Rohrschaden."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = max(1, seg//4)
    cu.resolution_u = 8 if glatt else 1
    sp = cu.splines.new('BEZIER' if glatt else 'POLY')
    if glatt:
        sp.bezier_points.add(len(punkte) - 1)
        for i, p in enumerate(punkte):
            bp = sp.bezier_points[i]
            bp.co = p
            bp.handle_left_type = bp.handle_right_type = 'AUTO'
    else:
        sp.points.add(len(punkte) - 1)
        for i, p in enumerate(punkte):
            sp.points[i].co = (p[0], p[1], p[2], 1.0)
    ob = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(ob, do_unlink=True)
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if m: me.materials.append(m)
    bpy.context.view_layer.objects.active = o
    return flach(o)

def bogen_pkt(x0, x1, z0, hoch, n=9, y=0.0):
    """Punktreihe eines Rundbogens von (x0,z0) nach (x1,z0) mit Stich `hoch`."""
    return [(x0 + (x1-x0)*i/(n-1), y, z0 + hoch*math.sin(math.pi*i/(n-1)))
            for i in range(n)]

def volute_pkt(ca, cz, r0, wind=1.6, n=16, fest=0.0, drehsinn=1, start=0.0, ebene="xz"):
    """Punktreihe einer Volute (Schneckenspirale) — das Grundmotiv jedes
    Schmiedegitters. Der Radius laeuft logarithmisch nach innen, sonst sieht die
    Spirale aus wie eine aufgerollte Feder statt wie geschmiedetes Eisen.

    ⚠️ `ebene` waehlt, IN welcher Ebene die Spirale liegt: "xz" fuer Tore und
    Gitter (Schauseite +y), "yz" fuer Wangen, die seitlich stehen. Ohne diesen
    Schalter lag die Volute der Bank quer zur Wange und blies deren Tiefe von
    0,66 auf 1,70 m auf — gemessen, im Bild sofort sichtbar."""
    pts = []
    for i in range(n):
        t = i/(n-1.0)
        a = start + drehsinn*TAU*wind*t
        rr = r0*math.exp(-1.7*t)
        u, v = ca + math.cos(a)*rr, cz + math.sin(a)*rr
        pts.append((u, fest, v) if ebene == "xz" else (fest, u, v))
    return pts

def strebe(p0, p1, d, m=None):
    v = Vector(p1) - Vector(p0); L = v.length
    if L < 1e-5: return None
    o = box((p0[0]+p1[0])/2, (p0[1]+p1[1])/2, (p0[2]+p1[2])/2, L, d, d, m)
    o.rotation_euler = v.to_track_quat('X', 'Z').to_euler()
    return o

def kranz(fn, n, r, z=0.0, start=0.0):
    """Ruft `fn(x, y, winkel, i)` n-mal auf einem Kreis auf — Saeulen, Streben,
    Blumen. Spart die immer gleiche Winkelrechnerei."""
    for i in range(n):
        a = start + TAU*i/n
        fn(math.cos(a)*r, math.sin(a)*r, a, i)

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

def export(name, bevel=0.014, seg=2):
    runden(bevel, seg)
    for o in bpy.context.scene.objects: o.select_set(True)
    p1 = os.path.join(OUT_GLB, name + ".glb")
    # export_apply=True ist PFLICHT — sonst landet der Bevel NICHT im GLB.
    bpy.ops.export_scene.gltf(filepath=p1, export_format='GLB', use_selection=False,
                              export_apply=True, export_animations=False)
    p2 = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p2)
    except Exception: bpy.ops.export_mesh.stl(filepath=p2)
    print("  ->", name, os.path.getsize(p1), "B")


# ============================================================ Fahrzeug-Werkzeug
# Beides stand seit Charge 37 lokal in mk_th37_stadt.py. Ladung 40 sind wieder
# Fahrzeuge — statt es zu kopieren, steht es ab jetzt hier. mk_th37 fuehrt seine
# eigenen Fassungen weiter (sie stehen nicht in seiner Importliste), damit an
# den fertigen Wagen aus Charge 37 nichts nachtraeglich anders wird.

def keil_y(prof, cy, breite, m=None, cx=0.0, cz=0.0, name="Profil"):
    """Extrudiert ein Profil aus der x-z-Ebene entlang y.

    Das Werkzeug fuer Fahrzeuge: man zeichnet die SEITENANSICHT und zieht sie auf
    Wagenbreite. Aus Kisten gestapelt bekommt man nie eine Windschutzscheiben-
    neigung hin.

    ⚠️ Die Deckflaechen werden TRIANGULIERT, nicht als N-Gon geschlossen. Ein
    Fahrzeug-Seitenriss ist nicht konvex (die Fensterlinie springt zurueck), und
    ein N-Gon darueber faltet sich."""
    n = len(prof)
    bm = bmesh.new()
    v0 = [bm.verts.new((p[0] + cx, cy - breite/2.0, p[1] + cz)) for p in prof]
    v1 = [bm.verts.new((p[0] + cx, cy + breite/2.0, p[1] + cz)) for p in prof]
    f0 = bm.faces.new(v0)
    f1 = bm.faces.new(list(reversed(v1)))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((v0[i], v0[j], v1[j], v1[i]))
    bmesh.ops.triangulate(bm, faces=[f0, f1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if m: me.materials.append(m)
    bpy.context.view_layer.objects.active = o
    uvl = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            uvl.data[li].uv = (p.x if abs(poly.normal.y) < 0.5 else p.y, p.z)
    return o

def rad(x, y, z, r, br, felge, reifen, chrom=None, speichen=5):
    """Ein Rad: Reifen, Felgenschuessel, Speichen, Nabe.

    ⚠️ Die Zylinderachse muss auf y liegen — `rot=(pi/2,0,0)` legt sie dorthin.
    Mit (0,pi/2,0) laege sie auf x und das Rad stuende quer zur Fahrtrichtung.

    Die Speichen sind der Unterschied zwischen „Rad" und „schwarze Scheibe":
    eine glatte Felge liest sich aus jeder Entfernung als Loch."""
    flach(zyl(x, y, z, r, br, reifen, 20, (math.pi/2, 0, 0)))
    for s9 in (-1, 1):
        ya = y + s9*(br/2 + 0.006)
        flach(zyl(x, ya, z, r*0.62, 0.03, felge, 16, (math.pi/2, 0, 0)))
        for k in range(speichen):
            a = TAU*k/speichen + 0.3
            sp = box(x + math.cos(a)*r*0.34, ya + s9*0.012, z + math.sin(a)*r*0.34,
                     r*0.44, 0.02, r*0.16, felge)
            sp.rotation_euler[1] = -a
        flach(zyl(x, ya + s9*0.02, z, r*0.17, 0.03, chrom or felge, 12, (math.pi/2, 0, 0)))
    flach(zyl(x, y, z, r*0.16, br + 0.04, felge, 10, (math.pi/2, 0, 0)))
