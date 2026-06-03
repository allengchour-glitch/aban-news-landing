#!/usr/bin/env python3
"""LuxeStyle - hole.py : Schluesselring-Loch in ein 3D-Modell bohren.

Bohrt ein gerades Loch entlang einer Achse (AXIS) durch solides Material und
exportiert wieder (GLB mit Textur ODER OBJ mit Farb-Materialien - je nach OUT-
Endung). Optionales Skalieren auf mm (SIZE). Erzeugt ein Kontroll-Render
(blauer Durchblick = Loch sitzt richtig).

Reihenfolge fuer farbige Teile:
  GLB-Workflow:  hole.py (GLB->GLB, Textur bleibt) -> colorize.py -> assemble.py
  OBJ-Workflow:  colorize.py -> hole.py (colored.obj->.obj, Farben bleiben) -> assemble.py

Aufruf:  blender --background --python hole.py
Env:
  IN/GLB = Eingabe (.glb/.gltf/.obj/.stl)        (GLB als Alias erlaubt)
  OUT    = Ausgabe (.glb oder .obj -> Format folgt der Endung)
  PNG    = Kontroll-Render
  SIZE   = laengste Kante in mm (0 = nicht skalieren; Default 0)
  AXIS   = z|x|y  Bohr-Richtung (Default z = senkrecht, fuer flach liegende Modelle)
  HD     = Loch-Durchmesser mm (Default 4.5)
  Position der Bohrung (mm, im Modell-Koordinatensystem nach Skalieren):
    HX, HY, HZ          absolute Mitte quer zur Achse (Default 0)
    HXF, HYF, HZF       ODER als Anteil 0..1 von max der Achse (z. B. HYF=0.62)
"""
import bpy, os, math
from mathutils import Vector

IN = os.environ.get("IN") or os.environ["GLB"]
OUT = os.environ["OUT"]; PNG = os.environ.get("PNG")
SIZE = float(os.environ.get("SIZE", "0"))
AXIS = os.environ.get("AXIS", "z").lower()
HD = float(os.environ.get("HD", "4.5"))

bpy.ops.wm.read_factory_settings(use_empty=True)
ext = IN.lower().rsplit(".", 1)[-1]
if ext in ("glb", "gltf"): bpy.ops.import_scene.gltf(filepath=IN)
elif ext == "obj":
    try: bpy.ops.wm.obj_import(filepath=IN)
    except Exception: bpy.ops.import_scene.obj(filepath=IN)
else:
    try: bpy.ops.wm.stl_import(filepath=IN)
    except Exception: bpy.ops.import_mesh.stl(filepath=IN)
o = max([x for x in bpy.context.scene.objects if x.type=='MESH'], key=lambda m: sum(m.dimensions))
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
bpy.ops.object.make_single_user(object=True, obdata=True)
if SIZE > 0:
    f=SIZE/max(o.dimensions); o.scale=(f,f,f)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

bb=[o.matrix_world@Vector(c) for c in o.bound_box]
xmin,xmax=min(v.x for v in bb),max(v.x for v in bb)
ymin,ymax=min(v.y for v in bb),max(v.y for v in bb)
zmin,zmax=min(v.z for v in bb),max(v.z for v in bb)

def coord(letter, lo, hi):
    if os.environ.get("H%sF"%letter.upper()) is not None:
        return hi*float(os.environ["H%sF"%letter.upper()])
    return float(os.environ.get("H%s"%letter.upper(), "0"))
hx=coord("x",xmin,xmax); hy=coord("y",ymin,ymax); hz=coord("z",zmin,zmax)

# Zylinder entlang AXIS, lang genug um ganz durchzugehen
span={"x":xmax-xmin,"y":ymax-ymin,"z":zmax-zmin}[AXIS]
rot={"z":(0,0,0),"x":(0,math.radians(90),0),"y":(math.radians(90),0,0)}[AXIS]
loc=[hx,hy,hz]; loc[{"x":0,"y":1,"z":2}[AXIS]]={"x":(xmin+xmax)/2,"y":(ymin+ymax)/2,"z":(zmin+zmax)/2}[AXIS]
print("PLACE axis=%s d=%.1f at x=%.1f y=%.1f z=%.1f  (bounds X%.1f..%.1f Y%.1f..%.1f Z%.1f..%.1f)"%(
    AXIS,HD,loc[0],loc[1],loc[2],xmin,xmax,ymin,ymax,zmin,zmax))
bpy.ops.mesh.primitive_cylinder_add(radius=HD/2, depth=span+20, location=loc, rotation=rot)
cyl=bpy.context.active_object
bpy.context.view_layer.objects.active=o
m=o.modifiers.new("h","BOOLEAN"); m.operation="DIFFERENCE"; m.object=cyl; m.solver='EXACT'
try: bpy.ops.object.modifier_apply(modifier=m.name)
except Exception as e: print("BOOLERR",e)
bpy.data.objects.remove(cyl,do_unlink=True)

oext=OUT.lower().rsplit(".",1)[-1]
o.select_set(True); bpy.context.view_layer.objects.active=o
if oext in ("glb","gltf"): bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True)
elif oext=="obj":
    try: bpy.ops.wm.obj_export(filepath=OUT, export_selected_objects=True, export_materials=True)
    except Exception: bpy.ops.export_scene.obj(filepath=OUT, use_selection=True)
else:
    try: bpy.ops.wm.stl_export(filepath=OUT, export_selected_objects=True)
    except Exception: bpy.ops.export_mesh.stl(filepath=OUT, use_selection=True)
print("HOLE_EXPORT", OUT)

if PNG:
    bpy.ops.object.shade_smooth()
    d=max(o.dimensions)
    # Kamera entlang der Achse, damit das Loch als Durchblick sichtbar ist
    campos={"z":(0,-d*0.05,zmax+d*1.2),"x":(xmax+d*1.2,0,(zmin+zmax)/2),"y":(0,ymin-d*1.2,(zmin+zmax)/2)}[AXIS]
    up={"z":"UP_Y","x":"UP_Z","y":"UP_Z"}[AXIS]
    tg=bpy.data.objects.new("t",None);bpy.context.collection.objects.link(tg)
    tg.location=Vector(((xmin+xmax)/2,(ymin+ymax)/2,(zmin+zmax)/2))
    bpy.ops.object.camera_add(location=campos);cam=bpy.context.active_object;bpy.context.scene.camera=cam
    c=cam.constraints.new("TRACK_TO");c.target=tg;c.track_axis="TRACK_NEGATIVE_Z";c.up_axis=up
    bpy.ops.object.light_add(type="SUN",location=(d,-d,d*2));bpy.context.active_object.data.energy=3
    sc=bpy.context.scene;sc.render.engine="CYCLES";sc.cycles.device="CPU";sc.cycles.samples=20
    sc.cycles.use_denoising=False;bpy.context.view_layer.cycles.use_denoising=False
    sc.world=bpy.data.worlds.new("w");sc.world.use_nodes=True
    sc.world.node_tree.nodes["Background"].inputs[0].default_value=(0.55,0.7,0.85,1)
    sc.render.resolution_x=850;sc.render.resolution_y=850;sc.render.filepath=PNG
    bpy.ops.render.render(write_still=True)
print("HOLE_DONE")
