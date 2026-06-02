#!/usr/bin/env python3
"""LuxeStyle - texture_to_parts: Meshy-Textur -> Bambu/AMS-Farb-Teile.

Liest die Farb-Textur eines (Meshy-)GLB aus, ordnet jede Flaeche der naechsten
Filament-Farbe einer Palette zu, und zerlegt das Modell in getrennte Meshes
PRO FARBE -> als STLs. In Bambu Studio: alle Teile importieren, "als ein Objekt
zusammenfuegen", dann je Teil ein Filament zuweisen (kein Malen).

Aufruf (Blender headless):
  blender --background --python texture_to_parts.py
Env:
  GLB     = Eingabe .glb (mit Textur)
  OUTDIR  = Zielordner fuer color_<name>.stl + preview.png
  PALETTE = optional JSON {"name":[r,g,b], ...} (0..1). Sonst Katzen-Default.
"""
import bpy, os, json
import numpy as np
from mathutils import Vector

GLB = os.environ["GLB"]; OUTDIR = os.environ["OUTDIR"]
os.makedirs(OUTDIR, exist_ok=True)
DEFAULT = {"weiss": [0.85,0.85,0.85], "schwarz": [0.04,0.04,0.04],
           "orange": [0.9,0.45,0.1], "rosa": [0.95,0.6,0.66]}
PAL = json.loads(os.environ.get("PALETTE", "")) if os.environ.get("PALETTE") else DEFAULT
names = list(PAL); cols = np.array([PAL[n] for n in names])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
o = max([x for x in bpy.context.scene.objects if x.type=='MESH'], key=lambda m: sum(m.dimensions))
bpy.context.view_layer.objects.active = o
me = o.data

# --- Textur-Bild der Base Color finden ---
img = None
for m in o.data.materials:
    if m and m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image:
                img = n.image; break
    if img: break
if img is None:
    raise SystemExit("Keine Textur gefunden im GLB.")
W, H = img.size
px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)[:, :, :3]

uv = me.uv_layers.active.data

# --- Materialien pro Palette-Farbe anlegen ---
me.materials.clear()
mats = []
for i, n in enumerate(names):
    mat = bpy.data.materials.new(n); mat.use_nodes = True
    mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (*PAL[n], 1)
    mat.diffuse_color = (*PAL[n], 1)
    me.materials.append(mat); mats.append(i)

# --- jede Flaeche der naechsten Palette-Farbe zuordnen ---
for poly in me.polygons:
    u = 0.0; v = 0.0
    for li in poly.loop_indices:
        c = uv[li].uv; u += c.x; v += c.y
    nlp = len(poly.loop_indices); u /= nlp; v /= nlp
    x = int((u % 1.0) * (W-1)); y = int((v % 1.0) * (H-1))
    rgb = px[y, x]
    d = np.sum((cols - rgb) ** 2, axis=1)
    poly.material_index = int(np.argmin(d))

bpy.ops.object.shade_smooth()

# --- Vorschau rendern (Farben wie zugeordnet) ---
bb = [o.matrix_world @ Vector(c) for c in o.bound_box]; miny=min(v.y for v in bb); maxz=max(v.z for v in bb); d=max(o.dimensions)
tg = bpy.data.objects.new("t", None); bpy.context.collection.objects.link(tg); tg.location = Vector((0,0,maxz*0.4))
bpy.ops.object.camera_add(location=(0, miny-d*1.3, maxz*0.5+d*0.8))
cam=bpy.context.active_object; bpy.context.scene.camera=cam
c=cam.constraints.new("TRACK_TO"); c.target=tg; c.track_axis="TRACK_NEGATIVE_Z"; c.up_axis="UP_Y"
bpy.ops.object.light_add(type="SUN", location=(d,miny-d,d*2)); bpy.context.active_object.data.energy=3
sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.device="CPU"; sc.cycles.samples=24
sc.cycles.use_denoising=False; bpy.context.view_layer.cycles.use_denoising=False
wd=bpy.data.worlds.new("w"); sc.world=wd; wd.use_nodes=True; wd.node_tree.nodes["Background"].inputs[0].default_value=(0.95,0.95,0.93,1)
sc.render.resolution_x=900; sc.render.resolution_y=850; sc.render.filepath=os.path.join(OUTDIR,"preview.png")
bpy.ops.render.render(write_still=True)

# --- nach Material trennen + je Teil STL exportieren ---
bpy.context.view_layer.objects.active = o; o.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.separate(type='MATERIAL')
bpy.ops.object.mode_set(mode='OBJECT')
count = 0
for obj in [x for x in bpy.context.scene.objects if x.type=='MESH']:
    if not obj.data.polygons: continue
    nm = obj.data.materials[obj.data.polygons[0].material_index].name if obj.data.materials else "teil"
    nm = nm.split('.')[0]
    for x in bpy.context.scene.objects: x.select_set(x is obj)
    bpy.context.view_layer.objects.active = obj
    path = os.path.join(OUTDIR, "color_%s.stl" % nm)
    try: bpy.ops.wm.stl_export(filepath=path, export_selected_objects=True)
    except Exception: bpy.ops.export_mesh.stl(filepath=path, use_selection=True)
    print("PART", nm, len(obj.data.polygons)); count += 1
print("PARTS_DONE", count)
