"""Blender-Gegenprüfung: Messgerät, Reproduktion, Szenenerhalt und GLB-Reimport."""
import hashlib
import json
from pathlib import Path
import runpy
import struct
import sys
import tempfile

import bpy

HERE = Path(__file__).resolve().parent
api = runpy.run_path(str(HERE / 'erzeugen.py'))
read_glb = api['read_glb']
checks = []


def fixture(path, vertices, indices=(0, 1, 2)):
    binary = struct.pack('<18f3H', *(c for v in vertices for c in v),
                         *([0, -.8, .6]*3), *indices)
    binary += b'\0' * ((-len(binary)) % 4)
    doc = {
        'asset': {'version': '2.0'},
        'buffers': [{'byteLength': len(binary)}],
        'bufferViews': [{'buffer': 0, 'byteOffset': 0, 'byteLength': 36},
                        {'buffer': 0, 'byteOffset': 36, 'byteLength': 36},
                        {'buffer': 0, 'byteOffset': 72, 'byteLength': 6}],
        'accessors': [{'bufferView': 0, 'componentType': 5126, 'count': 3, 'type': 'VEC3',
                       'min': [min(p[i] for p in vertices) for i in range(3)],
                       'max': [max(p[i] for p in vertices) for i in range(3)]},
                      {'bufferView': 1, 'componentType': 5126, 'count': 3, 'type': 'VEC3'},
                      {'bufferView': 2, 'componentType': 5123, 'count': 3, 'type': 'SCALAR'}],
        'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1},
                                    'indices': 2, 'material': 0}]}],
        'materials': [{}], 'nodes': [{'mesh': 0}], 'scenes': [{'nodes': [0]}], 'scene': 0,
    }
    encoded = json.dumps(doc).encode()
    encoded += b' ' * ((-len(encoded)) % 4)
    data = (struct.pack('<4sII', b'glTF', 2, 28+len(encoded)+len(binary))
            + struct.pack('<II', len(encoded), 0x4E4F534A)+encoded
            + struct.pack('<II', len(binary), 0x004E4942)+binary)
    path.write_bytes(data)


old_root = read_glb.__globals__['ROOT']
try:
    with tempfile.TemporaryDirectory(prefix='lebenspfad-messprobe-') as temp:
        read_glb.__globals__['ROOT'] = Path(temp)
        path = Path(temp) / 'dreieck.glb'
        points = [(0, 0, 0), (2, 0, 0), (0, 3, 4)]
        fixture(path, points)
        result = read_glb(path)
        assert result['exported_vertices'] == 3 and result['triangles'] == 1
        assert result['width_height_depth'] == [2, 3, 4]
        assert result['materials'] == result['meshes'] == result['primitives'] == 1
        assert result['bytes'] == path.stat().st_size
        checks.append('Positivprobe: bekanntes Dreieck, Bounds 2/3/4, 3 Vertices, 1 Material')
        for label, vertices, indices in [
            ('Ungueltiger Index erkannt', points, (0, 1, 99)),
            ('Entartetes Dreieck erkannt', [(0, 0, 0), (1, 0, 0), (2, 0, 0)], (0, 1, 2)),
        ]:
            fixture(path, vertices, indices)
            try:
                read_glb(path)
            except AssertionError:
                checks.append('Negativprobe: '+label)
            else:
                raise AssertionError('Messgeraet hat Fehler uebersehen: '+label)
finally:
    read_glb.__globals__['ROOT'] = old_root


def snapshot(scene):
    return [(o, o.data, tuple(tuple(r) for r in o.matrix_world),
             tuple(v.co[:] for v in o.data.vertices) if o.type == 'MESH' else None)
            for o in scene.objects]


original_scene = bpy.context.window.scene
existing = {scene: snapshot(scene) for scene in bpy.data.scenes}
files = sorted((old_root / 'models' / 'lebenspfad-eigen').glob('*.glb'))
assert len(files) == 3
before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
sys.argv = ['blender']  # Reproduktion ohne Render, keine weitere Hardwarelast.
api['main']()
assert bpy.context.window.scene == original_scene
assert all(scene in list(bpy.data.scenes) and snapshot(scene) == state
           for scene, state in existing.items())
checks.append('Vorhandene Szenen, Objekte, Geometrie und Transformationen erhalten; aktive Szene wiederhergestellt')
after = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
assert before == after, 'Wiederholung weicht byteweise ab'
checks.append('Frischer Factory-Startup-Lauf erzeugt drei byteidentische GLBs (SHA-256)')

report = json.loads((HERE / 'messwerte.json').read_text())
for item in report['models']:
    scene, collection = api['own_scene']('Gegenprobe')
    bpy.ops.import_scene.gltf(filepath=str(old_root / item['file']))
    meshes = [o for o in scene.objects if o.type == 'MESH']
    points = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
    # Rueckkonvertierung von Blender-Z-up in glTF-Y-up.
    points = [(p.x, p.z, -p.y) for p in points]
    lo = [min(p[i] for p in points) for i in range(3)]
    hi = [max(p[i] for p in points) for i in range(3)]
    assert all(abs(a-b) < 1e-5 for a, b in zip(lo, item['gltf_bounds_min_xyz']))
    assert all(abs(a-b) < 1e-5 for a, b in zip(hi, item['gltf_bounds_max_xyz']))
    assert len(meshes) == 5
    assert sum(len(o.data.polygons) for o in meshes) == item['triangles']
    checks.append('Unabhaengiger Blender-Reimport: Bounds und Dreiecke bestaetigt, '+Path(item['file']).name)
bpy.context.window.scene = original_scene
(HERE / 'pruefung.json').write_text(json.dumps({
    'status': 'GEMESSEN: bestanden', 'blender': bpy.app.version_string,
    'checks': checks, 'sha256': after,
}, indent=2, ensure_ascii=False)+'\n')
print('GEPRUEFT: '+str(len(checks))+' Gegenpruefungen bestanden.', flush=True)
