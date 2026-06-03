#!/usr/bin/env python3
"""LuxeStyle - colorize.py : universelles Farb-Tool fuer Bambu/AMS.

Faerbt ein 3D-Modell und zerlegt es in Farb-Teile (STL pro Filament) +
farbiges OBJ + Vorschau. Zwei Modi:

  MODE=texture : liest die Farb-Textur eines GLB (z. B. Meshy) und ordnet jede
                 Flaeche der naechsten Palette-Farbe zu.
  MODE=rules   : faerbt ein unbemaltes Modell (STL/GLB) nach Regeln (Kugeln/Boxen)
                 -> Koerper = Basisfarbe, definierte Regionen = andere Farben.

Aufruf (Blender headless):
  blender --background --python colorize.py
Env:
  IN      = Eingabedatei (.glb oder .stl)
  OUTDIR  = Zielordner
  MODE    = texture | rules | auto (Default auto: Textur wenn vorhanden, sonst rules)
  PALETTE = JSON {"name":[r,g,b], ...} 0..1 (Default: weiss/schwarz/orange/rosa)
  RULES   = JSON [{"color":"name","sphere":[x,y,z,r]} | {"color":"name","box":[x0,x1,y0,y1,z0,z1]}]
            (Koordinaten in mm nach optionalem SIZE-Skalieren; Reihenfolge = Prioritaet)
  BASE    = Name der Basisfarbe (Default erstes Palette-Element)
  SIZE    = laengste Kante in mm (0 = nicht skalieren)
  RENDER  = 1/0 Vorschau
"""
import bpy, os, json
import numpy as np
from mathutils import Vector

IN = os.environ["IN"]; OUTDIR = os.environ["OUTDIR"]; os.makedirs(OUTDIR, exist_ok=True)
MODE = os.environ.get("MODE", "auto")
SIZE = float(os.environ.get("SIZE", "0"))
RENDER = os.environ.get("RENDER", "1") == "1"
DEFAULT_PAL = {"weiss":[0.85,0.85,0.85],"schwarz":[0.04,0.04,0.04],"orange":[0.9,0.45,0.1],"rosa":[0.95,0.6,0.66]}
PAL = json.loads(os.environ["PALETTE"]) if os.environ.get("PALETTE") else DEFAULT_PAL
names = list(PAL); cols = np.array([PAL[n] for n in names])
BASE = os.environ.get("BASE", names[0])
RULES = json.loads(os.environ["RULES"]) if os.environ.get("RULES") else []

bpy.ops.wm.read_factory_settings(use_empty=True)
ext = IN.lower().rsplit(".",1)[-1]
if ext in ("glb","gltf"): bpy.ops.import_scene.gltf(filepath=IN)
elif ext == "stl":
    try: bpy.ops.wm.stl_import(filepath=IN)
    except Exception: bpy.ops.import_mesh.stl(filepath=IN)
else: raise SystemExit("Format: glb/stl")
o = max([x for x in bpy.context.scene.objects if x.type=='MESH'], key=lambda m: sum(m.dimensions))
bpy.context.view_layer.objects.active=o; me=o.data

if SIZE > 0:
    f = SIZE/max(o.dimensions); o.scale=(f,f,f); bpy.ops.object.transform_apply(scale=True)

# Textur finden?
img = None
for m in (me.materials or []):
    if m and m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type=='TEX_IMAGE' and n.image: img=n.image; break
    if img: break
if MODE == "auto": MODE = "texture" if img else "rules"

# Palette-Materialien (frisch)
me.materials.clear()
idx = {}
for i,n in enumerate(names):
    mat=bpy.data.materials.new(n); mat.use_nodes=True
    mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value=(*PAL[n],1)
    mat.diffuse_color=(*PAL[n],1); me.materials.append(mat); idx[n]=i

if MODE == "texture":
    if img is None: raise SystemExit("MODE=texture aber keine Textur.")
    W,Hh=img.size; px=np.array(img.pixels[:],dtype=np.float32).reshape(Hh,W,4)[:,:,:3]
    uv=me.uv_layers.active.data
    for poly in me.polygons:
        u=v=0.0
        for li in poly.loop_indices: c=uv[li].uv; u+=c.x; v+=c.y
        n=len(poly.loop_indices); u/=n; v/=n
        x=int((u%1.0)*(W-1)); y=int((v%1.0)*(Hh-1))
        d=np.sum((cols-px[y,x])**2,axis=1); poly.material_index=int(np.argmin(d))
else:  # rules
    base_i = idx.get(BASE,0)
    for poly in me.polygons: poly.material_index = base_i
    for rule in RULES:
        ci = idx[rule["color"]]
        if "sphere" in rule:
            cx,cy,cz,r = rule["sphere"]; r2=r*r
            for poly in me.polygons:
                c=poly.center
                if (c.x-cx)**2+(c.y-cy)**2+(c.z-cz)**2 < r2: poly.material_index=ci
        elif "box" in rule:
            x0,x1,y0,y1,z0,z1 = rule["box"]
            for poly in me.polygons:
                c=poly.center
                if x0<=c.x<=x1 and y0<=c.y<=y1 and z0<=c.z<=z1: poly.material_index=ci

bpy.ops.object.shade_smooth()

# farbiges OBJ exportieren (mit Materialien)
objp = os.path.join(OUTDIR,"colored.obj")
try: bpy.ops.wm.obj_export(filepath=objp, export_materials=True, export_selected_objects=False)
except Exception: pass

# Vorschau
if RENDER:
    bb=[o.matrix_world@Vector(c) for c in o.bound_box]; miny=min(v.y for v in bb); maxz=max(v.z for v in bb); d=max(o.dimensions)
    tg=bpy.data.objects.new("t",None); bpy.context.collection.objects.link(tg); tg.location=Vector((0,0,maxz*0.4))
    bpy.ops.object.camera_add(location=(0,miny-d*1.3,maxz*0.5+d*0.8))
    cam=bpy.context.active_object; bpy.context.scene.camera=cam
    c=cam.constraints.new("TRACK_TO"); c.target=tg; c.track_axis="TRACK_NEGATIVE_Z"; c.up_axis="UP_Y"
    bpy.ops.object.light_add(type="SUN",location=(d,miny-d,d*2)); bpy.context.active_object.data.energy=3
    sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.device="CPU"; sc.cycles.samples=24
    sc.cycles.use_denoising=False; bpy.context.view_layer.cycles.use_denoising=False
    wd=bpy.data.worlds.new("w"); sc.world=wd; wd.use_nodes=True; wd.node_tree.nodes["Background"].inputs[0].default_value=(0.95,0.95,0.93,1)
    sc.render.resolution_x=900; sc.render.resolution_y=850; sc.render.filepath=os.path.join(OUTDIR,"preview.png")
    bpy.ops.render.render(write_still=True)

# nach Material trennen + STL pro Farbe
bpy.context.view_layer.objects.active=o; o.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='MATERIAL'); bpy.ops.object.mode_set(mode='OBJECT')
cnt=0
for obj in [x for x in bpy.context.scene.objects if x.type=='MESH']:
    if not obj.data.polygons: continue
    nm=(obj.data.materials[obj.data.polygons[0].material_index].name if obj.data.materials else "teil").split('.')[0]
    for x in bpy.context.scene.objects: x.select_set(x is obj)
    bpy.context.view_layer.objects.active=obj
    p=os.path.join(OUTDIR,"color_%s.stl"%nm)
    try: bpy.ops.wm.stl_export(filepath=p, export_selected_objects=True)
    except Exception: bpy.ops.export_mesh.stl(filepath=p, use_selection=True)
    print("PART",nm,len(obj.data.polygons)); cnt+=1
print("COLORIZE_DONE", MODE, cnt)
