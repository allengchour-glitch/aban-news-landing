#!/usr/bin/env python3
"""LuxeStyle - Polish-Tool: Mesh veredeln + druckfertig machen (via Blender).

Nimmt ein Mesh (STL/OBJ/PLY/GLB, z. B. von Meshy), saeubert es, glaettet,
legt optional eine Detail-/Schuppen-Struktur drauf, skaliert auf Druckgroesse
und exportiert eine druckfertige STL (+ optional ein Render).

Voraussetzung: Blender installiert (Aufruf 'blender' im PATH).

Beispiele:
    python3 polish.py meshy_cat.stl --out cat_clean.stl
    python3 polish.py snake.obj --detail scales --strength 0.18 --render
    python3 polish.py fish.glb --detail reptile --size 60 --smooth --render

Detail-Muster: none | scales | reptile | rough
  (echte Geometrie-Verdraengung - FDM druckt nur grobe Struktur, kein Mikro-Detail)
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

BPY = r'''
import bpy, os, math
from mathutils import Vector

inp     = os.environ["POLISH_IN"]
out     = os.environ["POLISH_OUT"]
detail  = os.environ.get("POLISH_DETAIL", "none")
strength= float(os.environ.get("POLISH_STRENGTH", "0.15"))
cell    = float(os.environ.get("POLISH_CELL", "0.3"))
size_mm = float(os.environ.get("POLISH_SIZE", "0"))   # 0 = nicht skalieren
deci    = float(os.environ.get("POLISH_DECIMATE", "1"))  # 1 = keine Reduktion
smooth  = os.environ.get("POLISH_SMOOTH", "0") == "1"
loop    = os.environ.get("POLISH_LOOP", "0") == "1"
base    = os.environ.get("POLISH_BASE", "0") == "1"
render  = os.environ.get("POLISH_RENDER", "0") == "1"

bpy.ops.wm.read_factory_settings(use_empty=True)

# --- Import (mehrere Blender-Versionen abdecken) ---
ext = inp.lower().rsplit(".", 1)[-1]
def imp():
    if ext == "stl":
        try: bpy.ops.wm.stl_import(filepath=inp); return
        except Exception: bpy.ops.import_mesh.stl(filepath=inp); return
    if ext == "obj":
        try: bpy.ops.wm.obj_import(filepath=inp); return
        except Exception: bpy.ops.import_scene.obj(filepath=inp); return
    if ext == "ply":
        try: bpy.ops.wm.ply_import(filepath=inp); return
        except Exception: bpy.ops.import_mesh.ply(filepath=inp); return
    if ext in ("glb", "gltf"):
        bpy.ops.import_scene.gltf(filepath=inp); return
    raise SystemExit("Format nicht unterstuetzt: " + ext)
imp()

# auf das groesste Mesh-Objekt fokussieren
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
if not meshes:
    raise SystemExit("Kein Mesh gefunden.")
obj = max(meshes, key=lambda o: sum(o.dimensions))
for o in bpy.context.scene.objects:
    o.select_set(o == obj)
bpy.context.view_layer.objects.active = obj

# Mesh-Daten zu Single-User machen (sonst koennen Modifier nicht angewandt werden)
try:
    bpy.ops.object.make_single_user(object=True, obdata=True)
except Exception:
    pass

# --- Saeubern: doppelte Vertices weg, Normalen konsistent ---
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.remove_doubles(threshold=0.0005)
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode="OBJECT")

# --- optional Polygone reduzieren (fuer dichte KI-Meshes) ---
if 0 < deci < 1:
    dec = obj.modifiers.new("dec", "DECIMATE")
    dec.ratio = deci

# --- optional glaetten (Subdivision) ---
if smooth or detail != "none":
    s = obj.modifiers.new("sub", "SUBSURF")
    s.levels = 3; s.render_levels = 3

# --- Detail-/Schuppen-Struktur als Displacement ---
if detail != "none":
    tex = bpy.data.textures.new("detail", type="VORONOI")
    tex.noise_scale = cell
    if detail == "scales":
        tex.distance_metric = "DISTANCE_SQUARED"
    elif detail == "reptile":
        tex.distance_metric = "CHEBYCHEV"
    elif detail == "rough":
        tex = bpy.data.textures.new("rough", type="STUCCI")
        tex.noise_scale = cell
    d = obj.modifiers.new("disp", "DISPLACE")
    d.texture = tex
    d.strength = strength
    d.mid_level = 0.5

# Modifier anwenden
bpy.context.view_layer.objects.active = obj
for m in list(obj.modifiers):
    try: bpy.ops.object.modifier_apply(modifier=m.name)
    except Exception: pass

# --- auf Druckgroesse skalieren (laengste Kante = size_mm) ---
if size_mm > 0:
    dim = max(obj.dimensions)
    if dim > 0:
        f = size_mm / dim
        obj.scale = (f, f, f)
        bpy.ops.object.transform_apply(scale=True)

# --- optional flacher Boden + immer auf Druckplatte setzen ---
def _bounds():
    return [obj.matrix_world @ Vector(c) for c in obj.bound_box]
if base:
    bb = _bounds()
    minz = min(v.z for v in bb); maxz = max(v.z for v in bb)
    cx = sum(v.x for v in bb) / 8.0; cy = sum(v.y for v in bb) / 8.0
    cut = minz + (maxz - minz) * 0.05
    big = max(obj.dimensions) * 3 + 10
    bpy.ops.mesh.primitive_cube_add(size=big, location=(cx, cy, cut - big / 2))
    cube = bpy.context.active_object
    bpy.context.view_layer.objects.active = obj
    mb = obj.modifiers.new("base", "BOOLEAN")
    mb.operation = "DIFFERENCE"; mb.object = cube
    try: bpy.ops.object.modifier_apply(modifier=mb.name)
    except Exception: pass
    bpy.data.objects.remove(cube, do_unlink=True)
# immer: Modell auf die Platte setzen (min Z = 0)
bb = _bounds(); minz = min(v.z for v in bb)
obj.location.z -= minz
bpy.ops.object.transform_apply(location=True)

# --- optional: Aufhaenge-Buegel oben (echter Schluesselanhaenger-Look) ---
if loop:
    bb = _bounds()
    maxz = max(v.z for v in bb)
    cx = sum(v.x for v in bb) / 8.0
    cy = sum(v.y for v in bb) / 8.0
    Rr = max(obj.dimensions) * 0.07 + 2.2      # Ring-Radius
    mr = max(Rr * 0.30, 1.0)                    # Ringdicke (min 1 mm, druckbar)
    # senkrecht stehender Buegel (XZ-Ebene): Loch zeigt nach vorn -> haengt richtig
    bpy.ops.mesh.primitive_torus_add(major_radius=Rr, minor_radius=mr,
        location=(cx, cy, maxz + Rr * 0.5),
        rotation=(math.radians(90), 0, 0))
    ring = bpy.context.active_object
    ring.select_set(True); obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()

# --- Export STL ---
try: bpy.ops.wm.stl_export(filepath=out)
except Exception: bpy.ops.export_mesh.stl(filepath=out)
print("POLISH_STL_DONE", out)

# --- optional Render ---
if render:
    png = out.rsplit(".", 1)[0] + ".png"
    mat = bpy.data.materials.new("m"); mat.use_nodes = True
    b = mat.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (0.12, 0.45, 0.2, 1)
    b.inputs["Roughness"].default_value = 0.45
    obj.data.materials.clear(); obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    tgt = bpy.data.objects.new("t", None); bpy.context.collection.objects.link(tgt)
    tgt.location = obj.location
    d = max(obj.dimensions) * 2.2 + 4
    bpy.ops.object.camera_add(location=(d*0.6, -d, d*0.6))
    cam = bpy.context.active_object; bpy.context.scene.camera = cam
    c = cam.constraints.new("TRACK_TO"); c.target = tgt
    c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
    bpy.ops.object.light_add(type="SUN", location=(d, -d, d*1.5))
    bpy.context.active_object.data.energy = 4.0
    w = bpy.data.worlds.new("w"); bpy.context.scene.world = w; w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.93, 0.93, 0.93, 1)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 24
    sc.cycles.use_denoising = False
    bpy.context.view_layer.cycles.use_denoising = False
    sc.render.resolution_x = 1200; sc.render.resolution_y = 900
    sc.render.filepath = png
    bpy.ops.render.render(write_still=True)
    print("POLISH_PNG_DONE", png)
'''


def find_blender() -> str | None:
    return shutil.which("blender")


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Mesh veredeln + druckfertig machen (Blender).")
    p.add_argument("input", help="Eingabe-Mesh (STL/OBJ/PLY/GLB)")
    p.add_argument("--out", default=None, help="Ziel-STL (Standard: <name>_polished.stl)")
    p.add_argument("--detail", choices=["none", "scales", "reptile", "rough"], default="none")
    p.add_argument("--strength", type=float, default=0.15, help="Staerke der Struktur in mm")
    p.add_argument("--cell", type=float, default=0.3, help="Musterdichte (kleiner = feiner)")
    p.add_argument("--size", type=float, default=0, help="laengste Kante in mm (0 = nicht skalieren)")
    p.add_argument("--decimate", type=float, default=1.0, help="Polygone reduzieren (z. B. 0.2 = 20%% behalten)")
    p.add_argument("--smooth", action="store_true", help="zusaetzlich glaetten")
    p.add_argument("--loop", action="store_true", help="Schluesselring-Loop oben anfuegen")
    p.add_argument("--base", action="store_true", help="Boden flach schneiden (steht/druckt ohne Stuetzen)")
    p.add_argument("--render", action="store_true", help="Vorschau-PNG rendern")
    a = p.parse_args(argv)

    inp = Path(a.input)
    if not inp.exists():
        print(f"FEHLER: Datei nicht gefunden: {inp}", file=sys.stderr); return 2
    blender = find_blender()
    if blender is None:
        print("FEHLER: Blender nicht gefunden (im PATH).", file=sys.stderr); return 1

    out = Path(a.out) if a.out else inp.with_name(inp.stem + "_polished.stl")
    env = dict(os.environ,
               POLISH_IN=str(inp.resolve()), POLISH_OUT=str(out.resolve()),
               POLISH_DETAIL=a.detail, POLISH_STRENGTH=str(a.strength),
               POLISH_CELL=str(a.cell), POLISH_SIZE=str(a.size),
               POLISH_DECIMATE=str(a.decimate),
               POLISH_SMOOTH="1" if a.smooth else "0",
               POLISH_LOOP="1" if a.loop else "0",
               POLISH_BASE="1" if a.base else "0",
               POLISH_RENDER="1" if a.render else "0")

    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as f:
        f.write(BPY); script = f.name
    cmd = ["xvfb-run", "-a", blender, "--background", "--python", script]
    if not shutil.which("xvfb-run"):
        cmd = [blender, "--background", "--python", script]
    print("Verarbeite:", inp.name, "->", out.name)
    r = subprocess.run(cmd, env=env)
    os.unlink(script)
    print("Fertig." if r.returncode == 0 else "Fehler beim Verarbeiten.", file=sys.stderr)
    return r.returncode


if __name__ == "__main__":
    raise SystemExit(main())
