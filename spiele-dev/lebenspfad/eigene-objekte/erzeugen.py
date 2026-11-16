#!/usr/bin/env python3
"""Eigene Lebenspfad-Miniaturen, ohne Texturen oder externe Assets.

Aufruf: blender --background --factory-startup --python erzeugen.py -- [--render]
Nur neue, eigene Szenen/Collections. Bestehende Szenen bleiben unangetastet.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

import bpy
import bmesh
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUTPUT = ROOT / "models" / "lebenspfad-eigen"
PI = math.pi


def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4


def material(name, color, metal=0, rough=.65):
    rgb = tuple(linear(int(color[i:i+2], 16) / 255) for i in (0, 2, 4))
    m = bpy.data.materials.new("LP_Eigen_" + name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    node = m.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*rgb, 1)
    node.inputs["Metallic"].default_value = metal
    node.inputs["Roughness"].default_value = rough
    return m


def own_scene(name):
    scene = bpy.data.scenes.new("LP_Eigen_" + name)
    collection = bpy.data.collections.new("LP_Eigen_" + name)
    scene.collection.children.link(collection)
    bpy.context.window.scene = scene
    return scene, collection


class Builder:
    """Sammelt getrennte Bauteile direkt in genau einem Mesh pro Material."""
    def __init__(self, name, palette):
        self.name = name
        self.scene, self.collection = own_scene(name)
        self.palette = palette
        self.parts = {k: ([], []) for k in palette}
        self.smooth = {k: [] for k in palette}

    def add(self, mat, vertices, faces, smooth=None):
        vs, fs = self.parts[mat]
        base = len(vs)
        vs.extend(tuple(v) for v in vertices)
        fs.extend(tuple(base + i for i in f) for f in faces)
        self.smooth[mat].extend(smooth if smooth is not None else [False]*len(faces))

    def box(self, mat, pos, size, bevel=0, rotation=None):
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1)
        for v in bm.verts:
            v.co.x *= size[0]
            v.co.y *= size[1]
            v.co.z *= size[2]
        if bevel:
            bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(bevel, min(size)*.45),
                            segments=1, affect='EDGES', clamp_overlap=True)
        bm.verts.ensure_lookup_table()
        for v in bm.verts:
            if rotation is not None:
                v.co = rotation @ v.co
            v.co += Vector(pos)
        bm.verts.index_update()
        self.add(mat, [v.co[:] for v in bm.verts],
                 [[v.index for v in f.verts] for f in bm.faces])
        bm.free()

    def profile(self, mat, profile, pos=(0, 0, 0), n=16, direction=None):
        """Geschlossener Rotationskörper, Profil als (Radius, Höhe)."""
        rot = (Vector(direction).to_track_quat('Z', 'Y').to_matrix()
               if direction else Matrix.Identity(3))
        vs = [rot @ Vector((r*math.cos(2*PI*i/n), r*math.sin(2*PI*i/n), z))
              + Vector(pos) for r, z in profile for i in range(n)]
        fs = [tuple(reversed(range(n)))]
        for j in range(len(profile)-1):
            for i in range(n):
                k = j*n+i
                nxt = j*n+(i+1) % n
                fs.append((k, nxt, nxt+n, k+n))
        fs.append(tuple((len(profile)-1)*n+i for i in range(n)))
        self.add(mat, vs, fs, [False]+[True]*(len(fs)-2)+[False])

    def rod(self, mat, a, b, radius, n=8, radius2=None):
        delta = Vector(b)-Vector(a)
        self.profile(mat, [(radius, 0), (radius if radius2 is None else radius2,
                                      delta.length)], a, n, delta)

    def extrude(self, mat, outline, y, depth):
        """Profil in X/Z, Rückseite in positiver Y-Richtung."""
        n = len(outline)
        vs = [(x, y+d, z) for d in (0, depth) for x, z in outline]
        fs = [tuple(reversed(range(n))), tuple(n+i for i in range(n))]
        fs.extend((i, (i+1) % n, (i+1) % n+n, i+n) for i in range(n))
        self.add(mat, vs, fs)

    def band(self, mat, outer, inner, y, depth):
        """Offener U-Bogen mit geschlossenen Stirnflächen."""
        self.extrude(mat, outer + list(reversed(inner)), y, depth)

    def star(self, mat, x, y, z, r, depth=.04):
        points = []
        for i in range(10):
            a = PI/2+i*PI/5
            rr = r if i % 2 == 0 else r*.46
            points.append((x+rr*math.cos(a), z+rr*math.sin(a)))
        self.extrude(mat, points, y, depth)

    def leaf(self, mat, root, tip, width):
        a, b = Vector(root), Vector(tip)
        d = b-a
        side = d.cross(Vector((0, -1, .4))).normalized()*width
        mid = a+d*.48
        ridge = mid+Vector((0, -.06, .07))
        vs = [a, mid+side, b, mid-side, ridge, mid-Vector((0, -.03, .035))]
        fs = [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4),
              (1, 0, 5), (2, 1, 5), (3, 2, 5), (0, 3, 5)]
        self.add(mat, vs, fs)

    def finish(self):
        objects = []
        for key, (vertices, faces) in self.parts.items():
            if not vertices:
                continue
            mesh = bpy.data.meshes.new(self.name + "_" + key)
            mesh.from_pydata(vertices, [], faces)
            mesh.update()
            for polygon, smooth in zip(mesh.polygons, self.smooth[key]):
                polygon.use_smooth = smooth
            bm = bmesh.new()
            bm.from_mesh(mesh)
            bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
            bmesh.ops.triangulate(bm, faces=list(bm.faces),
                                 quad_method='BEAUTY', ngon_method='BEAUTY')
            bm.to_mesh(mesh)
            bm.free()
            mesh.materials.append(self.palette[key])
            obj = bpy.data.objects.new(self.name + "_" + key, mesh)
            self.collection.objects.link(obj)
            objects.append(obj)
        return objects


def arch(radius, cx=1.7, spring=2.85, bottom=.22, segments=6):
    pts = [(-cx-radius, bottom), (-cx-radius, spring)]
    pts.extend((-cx+radius*math.cos(PI-i*PI/2/segments),
                spring+radius*math.sin(PI-i*PI/2/segments))
               for i in range(1, segments+1))
    if cx:
        pts.append((cx, spring+radius))
    pts.extend((cx+radius*math.cos(PI/2-i*PI/2/segments),
                spring+radius*math.sin(PI/2-i*PI/2/segments))
               for i in range(1, segments+1))
    pts.append((cx+radius, bottom))
    return pts


def gate():
    b = Builder("willkommenstor", {
        "holz": material("Tor_Honigholz", "BB8255"),
        "stirnholz": material("Tor_Stirnholz", "80533B"),
        "petrol": material("Tor_Petrol", "286D70"),
        "creme": material("Tor_Porzellan", "F4E4C7"),
        "messing": material("Tor_Sternmessing", "D9AC65", .45, .4),
    })
    # Gerundeter tragender Bogen; echte freie Öffnung.
    b.band("holz", arch(.75), arch(.25), -.29, .58)
    b.band("petrol", arch(.69, bottom=.45), arch(.60, bottom=.45), -.315, .035)
    b.band("stirnholz", arch(.33, bottom=.46), arch(.26, bottom=.46), -.32, .038)
    for s in (-1, 1):
        x = s*2.22
        b.box("petrol", (s*2.25, 0, .11), (.90, 1.0, .22), .08)
        b.box("creme", (x, 0, .32), (.66, .78, .24), .055)
        b.box("messing", (x, -.012, .48), (.55, .67, .075), .02)
        # Tischlerdetails: versenkte Zapfen, Stirnholz und runde Holznägel.
        for z in (.83, 2.53):
            b.profile("stirnholz", [(.065, 0), (.065, .024)],
                      (x, -.335, z), 8, (0, -1, 0))
        b.box("stirnholz", (x, -.322, 1.65), (.035, .025, 1.10), .008)
        b.rod("messing", (s*1.68, 0, 3.12), (s*1.68, 0, 2.82), .025, 6)
        b.box("creme", (s*1.68, 0, 2.67), (.25, .26, .28), .04)
        for zz in (2.51, 2.84):
            b.box("petrol", (s*1.68, 0, zz), (.33, .34, .065), .02)
        b.box("messing", (s*1.68, -.139, 2.67), (.028, .02, .24))
    b.box("petrol", (0, 0, 3.64), (3.8, .79, .40), .13)
    b.box("creme", (0, -.41, 3.64), (2.60, .065, .19), .065)
    b.profile("messing", [(.35, 0), (.35, .045)], (0, -.46, 3.65), 20, (0, -1, 0))
    b.profile("petrol", [(.295, 0), (.295, .035)], (0, -.51, 3.65), 20, (0, -1, 0))
    b.star("creme", 0, -.566, 3.66, .233)
    return b


def bench():
    b = Builder("erinnerungsplatz", {
        "holz": material("Platz_WarmesHolz", "AF7450"),
        "stein": material("Platz_KalksteinPapier", "DDD1B8"),
        "kupfer": material("Platz_Kupfer", "AA6948", .5, .43),
        "gruen": material("Platz_Salbeipetrol", "427C6D"),
        "dunkel": material("Platz_ErdeStirnholz", "4A3D34"),
    })
    b.box("stein", (0, 0, .09), (4.8, 2.65, .18), .08)
    # Einleger an den Enden lassen den kleinen Platz bewusst gestaltet wirken.
    for x in (-2.08, 2.08):
        b.box("kupfer", (x, -.74, .185), (.33, .035, .015))
        b.box("kupfer", (x, -.93, .185), (.33, .035, .015))
    for x in (-1.58, .91):
        for y in (-.29, .51):
            b.box("kupfer", (x, y, .49), (.15, .16, .62))
            b.box("dunkel", (x, y, .205), (.23, .25, .05))
        b.box("kupfer", (x, .13, .75), (.16, 1.04, .12), .02)
        b.box("kupfer", (x, .64, 1.34), (.13, .14, 1.25), .025)
        b.box("kupfer", (x, -.21, .99), (.10, .10, .40), .018)
        b.box("holz", (x, .10, 1.20), (.24, 1.0, .12), .045)
    for y in (-.27, -.01, .25, .51):
        b.box("holz", (-.34, y, .86), (3.20, .235, .15), .035)
    for z in (1.23, 1.53, 1.83):
        b.box("holz", (-.34, .66, z), (3.20, .15, .24), .04)
        for x in (-1.58, .91):
            b.profile("kupfer", [(.035, 0), (.035, .015)],
                      (x, .574, z), 6, (0, -1, 0))
    # Offenes Buch: zwei geneigte Seitenblöcke, Einband, Falz und Leseband.
    for s in (-1, 1):
        rotation = Matrix.Rotation(s*math.radians(-9), 3, 'Y')
        b.box("gruen", (.08+s*.19, -.06, .967), (.39, .48, .045), .015, rotation)
        b.box("stein", (.08+s*.185, -.06, 1.007), (.35, .44, .057), .012, rotation)
    b.box("kupfer", (.08, -.10, 1.032), (.03, .42, .013))
    b.box("kupfer", (.08, -.325, .985), (.03, .08, .06), .004)
    for x in (-.17, .32):
        for y in (-.12, -.03, .06):
            b.box("dunkel", (x, y, 1.062), (.15, .011, .005))
    # Kupfertopf mit offen sichtbarer Erde und geometrischen, gefalteten Blättern.
    b.profile("kupfer", [(.28, .18), (.31, .23), (.41, .68), (.43, .73), (.40, .77)],
              (1.80, .50, 0), 12)
    b.profile("dunkel", [(.365, .773), (.365, .782)], (1.80, .50, 0), 12)
    b.rod("gruen", (1.8, .50, .77), (1.76, .50, 1.91), .029, 6)
    for root, tip, width in [
        ((1.80,.5,.9), (1.30,.45,1.31), .15),
        ((1.78,.5,1.03), (2.22,.46,1.38), .18),
        ((1.78,.5,1.23), (1.31,.52,1.68), .17),
        ((1.77,.5,1.4), (2.12,.5,1.81), .16),
        ((1.76,.5,1.6), (1.67,.5,2.0), .12),
        ((1.79,.5,1.17), (1.83,.05,1.54), .15),
        ((1.76,.5,1.51), (1.75,.83,1.87), .13),
    ]:
        b.leaf("gruen", root, tip, width)
    # Kleiner Erinnerungsstein neben der Bank, mit Kupferstern.
    b.box("stein", (-2.1, -.50, .37), (.36, .24, .38), .07)
    b.star("kupfer", -2.1, -.635, .40, .105, .02)
    return b


def observatory():
    b = Builder("sternwarte", {
        "creme": material("Sternwarte_Muschelkalk", "E3D6BC"),
        "petrol": material("Sternwarte_PetrolEmaille", "286E73", .15, .43),
        "messing": material("Sternwarte_Messing", "C59854", .6, .35),
        "stein": material("Sternwarte_Sockelstein", "9CABA6"),
        "nacht": material("Sternwarte_Optik", "182F40", .18, .25),
    })
    b.profile("stein", [(2.43, 0), (2.5, .07), (2.5, .16), (2.42, .23)], n=24)
    b.profile("creme", [(1.90, .23), (1.97, .30), (1.97, .44), (1.83, .51),
                        (1.83, 2.61), (1.96, 2.68), (1.96, 2.78)], n=20)
    b.profile("messing", [(1.965, .43), (1.965, .49)], n=20)
    b.profile("petrol", [(1.94, 2.57), (2.04, 2.65), (2.04, 2.80)], n=20)
    b.profile("messing", [(2.045, 2.77), (2.045, 2.83)], n=20)
    # Kuppel mit echter ausgesparter Öffnung in Blickrichtung des Teleskops.
    # 24 Längsfacetten, 5 Breitenringe. Kein schwarzer aufgemalter Schlitz.
    rings = [(2.02*math.cos(i*PI/2/5), 2.82+1.42*math.sin(i*PI/2/5))
             for i in range(6)]
    start, end = -PI/2+PI/8, 3*PI/2-PI/8
    sectors = 21
    vs = []
    for radius, z in rings:
        for j in range(sectors+1):
            phi = start+(end-start)*j/sectors
            vs.append((radius*math.cos(phi), radius*math.sin(phi), z))
    fs = []
    for i in range(5):
        for j in range(sectors):
            k = i*(sectors+1)+j
            if i == 4:
                fs.append((k, k+1, k+sectors+1))
            else:
                fs.append((k, k+1, k+sectors+2, k+sectors+1))
    b.add("petrol", vs, fs)
    for phi in (start, end, 0, PI/2, PI):
        # Aufgesetzte schmale Messingrippen, radial deckungsgleich zur Kuppel.
        rib_vs = []
        for radius, z in rings[:-1] + [(.035, 4.245)]:
            for offset in (-.013, .013):
                rib_vs.append(((radius+.018)*math.cos(phi+offset),
                               (radius+.018)*math.sin(phi+offset), z+.009))
        b.add("messing", rib_vs, [(2*i, 2*i+1, 2*i+3, 2*i+2) for i in range(5)])
    # Flacher Innenraum unter der Öffnung.
    b.profile("nacht", [(1.79, 2.834), (1.79, 2.842)], n=20)
    # Portal mit gewölbtem oberen Abschluss.
    outer = arch(.52, cx=0, spring=1.76, bottom=.38, segments=8)
    inner = arch(.43, cx=0, spring=1.76, bottom=.38, segments=8)
    b.extrude("petrol", outer, -1.85, .10)
    b.band("messing", outer, inner, -1.875, .025)
    b.star("messing", 0, -1.904, 1.68, .17, .026)
    b.box("messing", (.28, -1.91, 1.10), (.04, .05, .20), .01)
    for z in (.65, .83):
        b.box("nacht", (0, -1.859, z), (.56, .01, .02))
    b.box("stein", (0, -2.01, .29), (1.30, .68, .13), .045)
    b.box("creme", (0, -1.91, .385), (1.12, .44, .10), .03)
    # Zwei runde Fenster mit Messing-Kreuzstäben und dezente Mauerfugen.
    for phi in (-PI/6, -5*PI/6):
        normal = Vector((math.cos(phi), math.sin(phi), 0))
        center = normal*1.83+Vector((0,0,1.65))
        b.profile("messing", [(.31, 0), (.33, .035), (.31, .075)], center, 12, normal)
        b.profile("nacht", [(.255, 0), (.255, .015)], center+normal*.078, 12, normal)
        tangent = Vector((-normal.y, normal.x, 0))
        for direction in (tangent, Vector((0,0,1))):
            b.rod("messing", center+normal*.105-direction*.26,
                  center+normal*.105+direction*.26, .018, 6)
    for phi in (PI/4, 3*PI/4, PI, 0):
        normal = Vector((math.cos(phi), math.sin(phi), 0))
        for z in (.75, 2.35):
            p = normal*1.839+Vector((0,0,z))
            tangent = Vector((-normal.y, normal.x, 0))
            b.rod("stein", p-tangent*.13, p+tangent*.13, .018, 4)
    # Teleskop auf Gabelmontierung, das sichtbar aus dem Kuppelschlitz schaut.
    b.profile("messing", [(.26, 2.80), (.26, 2.89), (.13, 2.96), (.13, 3.40)], n=12)
    for x in (-.27, .27):
        b.rod("petrol", (x, -.12, 3.26), (x, -.26, 3.90), .065, 8)
    b.rod("messing", (-.38, -.26, 3.90), (.38, -.26, 3.90), .15, 12)
    direction = Vector((0, -.80, .60))
    origin = Vector((0, .15, 3.66))
    b.profile("petrol", [(.17,0), (.21,.09), (.21,1.57), (.29,1.66),
                         (.29,1.83), (.27,1.86)], origin, 12, direction)
    for t in (.20, 1.30, 1.69):
        r = .298 if t > 1.6 else .224
        b.profile("messing", [(r, 0), (r, .07)], origin+direction*t, 12, direction)
    b.profile("nacht", [(.238,0), (.238,.018)], origin+direction*1.865, 12, direction)
    b.profile("messing", [(.095,0), (.095,.22)], origin-direction*.22, 10, direction)
    b.profile("nacht", [(.105,0), (.105,.05)], origin-direction*.27, 10, direction)
    # Kleines Sucherfernrohr.
    b.rod("messing", (.25,-.42,4.0), (.36,-.42,4.17), .035, 6)
    b.profile("petrol", [(.065,0), (.065,.43)], (.36,-.28,4.10), 8, direction)
    # Präzise Zielhöhe (5 Einheiten), ohne Änderung der Grundfläche.
    vertices = [v for vs, _ in b.parts.values() for v in vs]
    top = max(v[2] for v in vertices)
    factor = 5.0/top
    for key, (vs, fs) in b.parts.items():
        b.parts[key] = ([(x,y,z*factor) for x,y,z in vs], fs)
    return b


def read_glb(path):
    """Misst BIN-Positionen/Indexbuffer; vertraut nicht auf Accessor-min/max."""
    data = path.read_bytes()
    magic, version, length = struct.unpack_from('<4sII', data)
    assert magic == b'glTF' and version == 2 and length == len(data)
    cursor, doc, binary = 12, None, None
    while cursor < len(data):
        size, kind = struct.unpack_from('<II', data, cursor)
        block = data[cursor+8:cursor+8+size]
        if kind == 0x4E4F534A:
            doc = json.loads(block)
        elif kind == 0x004E4942:
            binary = block
        cursor += 8+size
    assert doc and binary is not None
    assert not doc.get('images') and not doc.get('textures')
    assert not doc.get('animations') and not doc.get('skins')
    assert all('uri' not in b for b in doc['buffers'])
    assert all('matrix' not in n and 'translation' not in n and 'rotation' not in n
               and 'scale' not in n for n in doc['nodes']), 'Transformation unerwartet'
    points, triangles, primitives, used_materials = [], 0, 0, set()
    for mesh in doc['meshes']:
        for prim in mesh['primitives']:
            primitives += 1
            assert prim.get('mode', 4) == 4
            assert set(prim['attributes']) == {'POSITION', 'NORMAL'}
            used_materials.add(prim['material'])
            a = doc['accessors'][prim['attributes']['POSITION']]
            assert a['componentType'] == 5126 and a['type'] == 'VEC3'
            view = doc['bufferViews'][a['bufferView']]
            offset = view.get('byteOffset', 0)+a.get('byteOffset', 0)
            stride = view.get('byteStride', 12)
            ps = [struct.unpack_from('<3f', binary, offset+i*stride) for i in range(a['count'])]
            assert all(math.isfinite(v) for p in ps for v in p)
            points.extend(ps)
            idx = doc['accessors'][prim['indices']]
            assert idx['count'] % 3 == 0
            fmt, width = {5121: ('B', 1), 5123: ('H', 2), 5125: ('I', 4)}[idx['componentType']]
            iv = doc['bufferViews'][idx['bufferView']]
            off = iv.get('byteOffset', 0)+idx.get('byteOffset', 0)
            indices = struct.unpack_from('<'+fmt*idx['count'], binary, off)
            assert min(indices) >= 0 and max(indices) < len(ps)
            for i in range(0, len(indices), 3):
                a0,b0,c0 = (Vector(ps[j]) for j in indices[i:i+3])
                assert (b0-a0).cross(c0-a0).length > 1e-9, 'Entartetes Dreieck'
            triangles += idx['count']//3
    lo = [min(p[i] for p in points) for i in range(3)]
    hi = [max(p[i] for p in points) for i in range(3)]
    return {
        'file': str(path.relative_to(ROOT)), 'bytes': len(data),
        'sha256': hashlib.sha256(data).hexdigest(),
        'gltf_bounds_min_xyz': [round(v, 6) for v in lo],
        'gltf_bounds_max_xyz': [round(v, 6) for v in hi],
        'width_height_depth': [round(hi[i]-lo[i], 6) for i in range(3)],
        'exported_vertices': len(points), 'triangles': triangles,
        'materials': len(used_materials), 'meshes': len(doc['meshes']),
        'primitives': primitives,
    }


def export(builder):
    objects = builder.finish()
    for obj in bpy.context.view_layer.objects:
        obj.select_set(False)
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    path = OUTPUT / (builder.name + '.glb')
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format='GLB', use_selection=True, use_active_scene=True,
        export_yup=True, export_texcoords=False, export_normals=True,
        export_materials='EXPORT', export_animations=False,
        export_cameras=False, export_lights=False, export_extras=False,
        export_attributes=False,
    )
    result = read_glb(path)
    result['source_vertices'] = sum(len(o.data.vertices) for o in objects)
    result['source_triangles'] = sum(len(o.data.polygons) for o in objects)
    assert result['triangles'] == result['source_triangles']
    assert result['triangles'] < 2500, result
    assert result['bytes'] < 100000, result
    assert result['materials'] <= 5 and result['meshes'] == result['materials']
    assert result['primitives'] == result['materials']
    assert abs(result['gltf_bounds_min_xyz'][1]) < 1e-6
    print('GLB_READY ' + json.dumps(result), flush=True)
    return result


def render_sheet(results):
    """Vorschau aus den frisch wieder importierten GLBs; Cycles nur CPU."""
    scene, collection = own_scene('Kontaktbogen')
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 128
    scene.cycles.use_denoising = False  # Debian-Build ohne OpenImageDenoise.
    scene.render.resolution_x = 1500
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new('LP_Eigen_Studiowelt')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.60,.68,.73,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .45
    scene.view_settings.view_transform = 'AgX'
    camera_data = bpy.data.cameras.new('LP_Eigen_Orthografisch')
    camera = bpy.data.objects.new('LP_Eigen_Orthografisch', camera_data)
    collection.objects.link(camera)
    target = Vector((0,0,2.1))
    camera.location = (9,-16,11)
    camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 18.8
    scene.camera = camera
    right = camera.rotation_euler.to_matrix() @ Vector((1,0,0))
    up = camera.rotation_euler.to_matrix() @ Vector((0,1,0))
    forward = camera.rotation_euler.to_matrix() @ Vector((0,0,-1))
    for i, result in enumerate(results):
        before = set(scene.objects)
        bpy.ops.import_scene.gltf(filepath=str(ROOT / result['file']))
        imported = [o for o in scene.objects if o not in before]
        # Gleiche Objektansicht, unterschiedliche Position entlang der Bildbreite.
        shift = right*((i-1)*6.05)
        for obj in imported:
            if obj.parent is None:
                obj.location += shift
        meshes = [o for o in imported if o.type == 'MESH']
        assert len(meshes) == result['materials']
        assert sum(len(o.data.polygons) for o in meshes) == result['triangles']
    ground_mat = material('Studio_Hintergrund', 'E4E8E2')
    mesh = bpy.data.meshes.new('LP_Eigen_Boden')
    mesh.from_pydata([(-200,-200,-.025),(200,-200,-.025),(200,200,-.025),(-200,200,-.025)], [], [(0,1,2,3)])
    ground = bpy.data.objects.new('LP_Eigen_Boden', mesh)
    collection.objects.link(ground)
    mesh.materials.append(ground_mat)
    for name, pos, power, size in [
        ('Hauptlicht', (-4,-8,13), 2200, 8),
        ('Fuelllicht', (8,-1,9), 1300, 7),
        ('Kantenlicht', (-1,7,11), 1800, 6),
    ]:
        data = bpy.data.lights.new('LP_Eigen_'+name, 'AREA')
        data.energy, data.shape, data.size = power, 'DISK', size
        obj = bpy.data.objects.new('LP_Eigen_'+name, data)
        collection.objects.link(obj)
        obj.location = pos
        obj.rotation_euler = (Vector((0,0,1))-obj.location).to_track_quat('-Z','Y').to_euler()
    ink = material('Studio_Schrift', '244E52')
    # Kameraorientierte Bildbeschriftungen; werden nie in die Spiel-GLBs exportiert.
    def label(body, x, y, size):
        curve = bpy.data.curves.new('LP_Eigen_Beschriftung', 'FONT')
        curve.body, curve.size, curve.align_x = body, size, 'CENTER'
        curve.extrude = 0
        obj = bpy.data.objects.new('LP_Eigen_'+body, curve)
        collection.objects.link(obj)
        obj.location = target + right*x + up*y - forward*8
        obj.rotation_euler = camera.rotation_euler
        curve.materials.append(ink)
        if hasattr(obj, 'visible_shadow'):
            obj.visible_shadow = False
    label('L E B E N S P F A D   /   E I G E N E   O B J E K T E', 0, 3.67, .24)
    for i, (name, result) in enumerate(zip(['WILLKOMMENSTOR','ERINNERUNGSPLATZ','STERNWARTE'], results)):
        label(name, (i-1)*6.05, -3.20, .23)
        label(f"{result['triangles']} Tris  /  {result['bytes']/1000:.1f} kB  /  {result['materials']} Materialien",
              (i-1)*6.05, -3.56, .16)
    scene.render.filepath = str(HERE / 'kontaktbogen.png')
    bpy.ops.render.render(write_still=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--render', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    OUTPUT.mkdir(parents=True, exist_ok=True)
    original_scene = bpy.context.window.scene
    try:
        results = [export(build()) for build in (gate, bench, observatory)]
        report = {'status': 'GEMESSEN', 'blender': bpy.app.version_string,
                  'axes': 'glTF: X rechts, Y oben, Vorderseite +Z; Blender: Z oben, Vorderseite -Y',
                  'models': results}
        (HERE / 'messwerte.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)+'\n')
        print('ALLE_GLBS_READY', flush=True)
        if args.render:
            render_sheet(results)
        print('FERTIG: Export und Prüfungen erfolgreich.', flush=True)
    finally:
        bpy.context.window.scene = original_scene


if __name__ == '__main__':
    main()
