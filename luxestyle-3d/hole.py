#!/usr/bin/env python3
"""LuxeStyle - hole.py : Schluesselring-Loch in ein 3D-Modell bohren.

Skaliert ein GLB auf echte mm (SIZE = laengste Kante), bohrt ein vertikales
Loch (Z-Achse) durch solides Material und exportiert wieder GLB (Textur bleibt
erhalten, damit colorize.py danach die Bambu-Farbteile baut). Erzeugt ein
Kontroll-Render von oben (blauer Durchblick = Loch sitzt richtig).

Aufruf:  blender --background --python hole.py
Env:  GLB, OUT, PNG, SIZE(=50), HX(=0 Mitte), HYF(=0.62 Ruecken/Schwanz), HD(=4.5)
"""
import bpy, os, math
from mathutils import Vector
glb=os.environ["GLB"]; out=os.environ["OUT"]; png=os.environ["PNG"]
SIZE=float(os.environ.get("SIZE","50"))      # laengste Kante in mm
hx=float(os.environ.get("HX","0"))
hyf=float(os.environ.get("HYF","0.62"))       # Hole-Y als Anteil von ymax (0..1) -> Richtung Ruecken/Schwanz
hd=float(os.environ.get("HD","4.5"))          # Loch-Durchmesser mm
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
o=max([x for x in bpy.context.scene.objects if x.type=='MESH'],key=lambda m:sum(m.dimensions))
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
bpy.ops.object.make_single_user(object=True, obdata=True)
# auf mm skalieren
f=SIZE/max(o.dimensions); o.scale=(f,f,f); bpy.ops.object.transform_apply(scale=True)
bb=[o.matrix_world@Vector(c) for c in o.bound_box]
zmin=min(v.z for v in bb); zmax=max(v.z for v in bb)
ymin=min(v.y for v in bb); ymax=max(v.y for v in bb)
hy=ymax*hyf
print("PLACE hole at x=%.1f y=%.1f (ymax=%.1f) z=%.1f..%.1f d=%.1f"%(hx,hy,ymax,zmin,zmax,hd))
bpy.ops.mesh.primitive_cylinder_add(radius=hd/2, depth=(zmax-zmin)+20, location=(hx,hy,(zmin+zmax)/2))
cyl=bpy.context.active_object
bpy.context.view_layer.objects.active=o
m=o.modifiers.new("h","BOOLEAN"); m.operation="DIFFERENCE"; m.object=cyl; m.solver='EXACT'
try: bpy.ops.object.modifier_apply(modifier=m.name)
except Exception as e: print("BOOLERR",e)
bpy.data.objects.remove(cyl,do_unlink=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB')
# Check-Render von oben (Loch = dunkler Durchblick)
bpy.ops.object.shade_smooth()
d=max(o.dimensions)
tg=bpy.data.objects.new("t",None);bpy.context.collection.objects.link(tg);tg.location=Vector((0,0,0))
bpy.ops.object.camera_add(location=(0,-d*0.05,zmax+d*1.2))
cam=bpy.context.active_object;bpy.context.scene.camera=cam
c=cam.constraints.new("TRACK_TO");c.target=tg;c.track_axis="TRACK_NEGATIVE_Z";c.up_axis="UP_Y"
bpy.ops.object.light_add(type="SUN",location=(d,-d,d*2));bpy.context.active_object.data.energy=3
sc=bpy.context.scene;sc.render.engine="CYCLES";sc.cycles.device="CPU";sc.cycles.samples=20
sc.cycles.use_denoising=False;bpy.context.view_layer.cycles.use_denoising=False
wd=bpy.data.worlds.new("w");sc.world=wd;wd.use_nodes=True;wd.node_tree.nodes["Background"].inputs[0].default_value=(0.55,0.7,0.85,1)
sc.render.resolution_x=850;sc.render.resolution_y=850;sc.render.filepath=png
bpy.ops.render.render(write_still=True);print("HOLE_DONE")
