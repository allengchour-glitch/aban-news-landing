#!/usr/bin/env python3
"""LuxeStyle - auto_face.py : automatische Augen/Nase auf eine Tier-Figur.

Findet OHNE Hardcoding heraus, wohin das Gesicht zeigt (Kopf-Ende, Front-Flaeche),
setzt per Raycast echte runde Augen + Nasen-Bump (3D-Geometrie, nicht Farbe) und
exportiert druckfertige Farbteile (color_<name>.stl) fuer assemble.py (AMS-3MF).

Annahmen: Mesh ist druckfertig (manifold, sitzt auf Z=0, in mm skaliert, z.B. via
polish.py). Funktioniert fuer kompakte Vierbeiner/Loaf-Figuren (Katze/Hund).

Aufruf (Blender headless):
  IN=/tmp/fig.stl OUTDIR=/tmp/fig_parts RENDER=/tmp/fig.png \
    blender --background --python auto_face.py
Env:  IN, OUTDIR, RENDER(optional PNG-Pfad), EYE_SCALE(=1.0), DEBUG(0/1)
"""
import bpy, os, sys
import numpy as np
from mathutils import Vector

IN = os.environ["IN"]; OUTDIR = os.environ["OUTDIR"]; os.makedirs(OUTDIR, exist_ok=True)
RENDER = os.environ.get("RENDER"); ES = float(os.environ.get("EYE_SCALE", "1.0"))
DEBUG = os.environ.get("DEBUG", "0") == "1"

bpy.ops.wm.read_factory_settings(use_empty=True)
ext = IN.lower().rsplit(".", 1)[-1]
if ext == "stl":
    try: bpy.ops.wm.stl_import(filepath=IN)
    except Exception: bpy.ops.import_mesh.stl(filepath=IN)
else:
    try: bpy.ops.wm.obj_import(filepath=IN)
    except Exception: bpy.ops.import_scene.obj(filepath=IN)
body = [o for o in bpy.context.selected_objects if o.type == 'MESH'][0]
body.name = "body"
bpy.context.view_layer.objects.active = body

# --- Geometrie analysieren (Welt-Koordinaten) ---
mw = body.matrix_world
V = np.array([(mw @ v.co)[:] for v in body.data.vertices])
xmin, ymin, zmin = V.min(0); xmax, ymax, zmax = V.max(0)
dimx, dimy, dimz = xmax-xmin, ymax-ymin, zmax-zmin
cx, cy = (xmin+xmax)/2, (ymin+ymax)/2

# Lange horizontale Achse = Blickachse (Loaf-Tiere sind laenger als breit)
long_axis = 'y' if dimy >= dimx else 'x'
cross_dim = dimx if long_axis == 'y' else dimy

# Kopf-Ende: Schwerpunkt des oberen Bandes (Ohren/Kopf sitzen hoch) entlang Blickachse
top = V[V[:, 2] >= zmin + 0.55*dimz]
if long_axis == 'y':
    head_mean = top[:, 1].mean(); head_sign = 1.0 if head_mean > cy else -1.0
    fdir = Vector((0, head_sign, 0))
else:
    head_mean = top[:, 0].mean(); head_sign = 1.0 if head_mean > cx else -1.0
    fdir = Vector((head_sign, 0, 0))

z_eye  = zmin + 0.66*dimz
z_nose = zmin + 0.42*dimz
sep    = 0.16 * cross_dim           # halber Augenabstand
r_eye  = max(2.0, 0.10*cross_dim) * ES
r_nose = max(1.2, 0.06*cross_dim) * ES
print("AUTO axis=%s head_sign=%+d cross=%.1f z_eye=%.1f z_nose=%.1f r_eye=%.2f"
      % (long_axis, head_sign, cross_dim, z_eye, z_nose, r_eye), flush=True)

def cast(side):
    """side: -1 links, +1 rechts, 0 Mitte (Nase)."""
    z = z_nose if side == 0 else z_eye
    off = 0.0 if side == 0 else side*sep
    if long_axis == 'y':
        origin = Vector((cx+off, head_sign*1000.0, z)); d = Vector((0, -head_sign, 0))
    else:
        origin = Vector((head_sign*1000.0, cy+off, z)); d = Vector((-head_sign, 0, 0))
    res, loc, nrm, idx = body.ray_cast(body.matrix_world.inverted() @ origin, d)
    return (body.matrix_world @ loc, (body.matrix_world.to_3x3() @ nrm).normalized()) if res else (None, None)

def bump(side, r, protrude, name):
    loc, n = cast(side)
    if loc is None:
        print("MISS", side, flush=True); return None
    c = loc - n*(r-protrude)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=c, segments=56, ring_count=28)
    o = bpy.context.active_object; o.name = name
    bpy.ops.object.shade_smooth()
    return o

eyeL = bump(-1, r_eye, 0.68*r_eye, "eyeL")
eyeR = bump(+1, r_eye, 0.68*r_eye, "eyeR")
nose = bump(0,  r_nose, 0.70*r_nose, "nose")
if not (eyeL and eyeR):
    print("FACE_DETECT_FAILED", flush=True); sys.exit(3)

bpy.ops.object.select_all(action='DESELECT')
eyeL.select_set(True); eyeR.select_set(True)
bpy.context.view_layer.objects.active = eyeL
bpy.ops.object.join(); eyes = bpy.context.active_object; eyes.name = "eyes"

def export_sel(ob, path):
    for o in bpy.context.scene.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    try: bpy.ops.wm.stl_export(filepath=path, export_selected_objects=True)
    except Exception: bpy.ops.export_mesh.stl(filepath=path, use_selection=True)

export_sel(body, os.path.join(OUTDIR, "color_weiss.stl"))
export_sel(eyes, os.path.join(OUTDIR, "color_schwarz.stl"))
if nose: export_sel(nose, os.path.join(OUTDIR, "color_rosa.stl"))
print("PARTS_DONE", OUTDIR, flush=True)

# --- optionaler Produkt-Render ---
if RENDER:
    def setmat(ob, rgb, rough, spec=0.5):
        m = bpy.data.materials.new("m"); m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*rgb, 1)
        b.inputs["Roughness"].default_value = rough
        try: b.inputs["Specular IOR Level"].default_value = spec
        except: pass
        ob.data.materials.clear(); ob.data.materials.append(m)
    setmat(body, (0.93,0.93,0.93), 0.55, 0.4)
    setmat(eyes, (0.02,0.02,0.02), 0.16, 0.8)
    if nose: setmat(nose, (0.95,0.5,0.58), 0.45)
    scn = bpy.context.scene
    try: scn.render.engine = 'BLENDER_EEVEE_NEXT'
    except: scn.render.engine = 'BLENDER_EEVEE'
    scn.render.resolution_x = 900; scn.render.resolution_y = 900
    w = bpy.data.worlds.new("W"); scn.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.62,0.66,0.72,1)
    bpy.ops.mesh.primitive_plane_add(size=600, location=(0,0,zmin))
    pm = bpy.data.materials.new("f"); pm.use_nodes = True
    pm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.72,0.75,0.80,1)
    pm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95
    bpy.context.active_object.data.materials.append(pm)
    tgt = Vector((cx, cy + head_sign*dimy*0.25, zmin+0.55*dimz)) if long_axis=='y' \
          else Vector((cx + head_sign*dimx*0.25, cy, zmin+0.55*dimz))
    def area(loc, e, s=60):
        ld = bpy.data.lights.new("A", 'AREA'); ld.energy = e; ld.size = s
        o = bpy.data.objects.new("A", ld); scn.collection.objects.link(o); o.location = loc
        dd = (tgt - Vector(loc)); o.rotation_euler = dd.to_track_quat('-Z','Y').to_euler()
    # Kamera 3/4 vor dem Gesicht
    dist = max(dimx, dimy)*1.9
    if long_axis == 'y':
        cam_loc = Vector((cx + cross_dim*0.5, cy + head_sign*dist, zmin+dimz*0.55))
    else:
        cam_loc = Vector((cx + head_sign*dist, cy + cross_dim*0.5, zmin+dimz*0.55))
    area(cam_loc + Vector((-40,0,40)), 3000); area(cam_loc + Vector((40,0,10)), 1500)
    area((cx, cy, zmax+50), 1200)
    cd = bpy.data.cameras.new("C"); cam = bpy.data.objects.new("C", cd)
    scn.collection.objects.link(cam); scn.camera = cam; cd.lens = 52
    cam.location = cam_loc
    dd = (cam.location - tgt); dd.normalize()
    cam.rotation_euler = dd.to_track_quat('Z','Y').to_euler()
    scn.render.filepath = RENDER
    bpy.ops.render.render(write_still=True)
    print("RENDER_DONE", RENDER, flush=True)
print("DONE", flush=True)
