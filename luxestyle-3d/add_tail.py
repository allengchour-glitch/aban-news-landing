# add_tail.py - print-freundlichen Schwanz an eine sitzende Katze anfuegen (Blender).
# Sich verjuengender Bezier-Schlauch vom Hintern (+Y) an der Seite am Boden entlang nach
# vorne (-Y) zu den Pfoten -> liegt auf der Platte, kein Support. Union mit dem Koerper.
# IN= OUT= [PTS=json] [BEVEL=5]  blender --background --python add_tail.py
import bpy, os, json
from mathutils import Vector
IN=os.environ["IN"]; OUT=os.environ["OUT"]
# Kontrollpunkte (x,y,z,radius-faktor) - Hintern(+Y) -> rechte Seite am Boden -> vorne(-Y) zu den Pfoten
PTS=json.loads(os.environ.get("PTS",json.dumps([
 [0,14,-18,1.00],[12,10,-27,0.95],[19,-2,-31,0.82],[14,-15,-31,0.62],[6,-22,-28,0.42]
])))
BEVEL=float(os.environ.get("BEVEL","5.0"))

bpy.ops.wm.read_factory_settings(use_empty=True)
try: bpy.ops.wm.stl_import(filepath=IN)
except Exception: bpy.ops.import_mesh.stl(filepath=IN)
cat=[m for m in bpy.context.scene.objects if m.type=='MESH'][0]
bpy.context.view_layer.objects.active=cat;cat.select_set(True)
bpy.ops.object.make_single_user(object=True,obdata=True)

# Bezier-Kurve
cu=bpy.data.curves.new("tail","CURVE");cu.dimensions='3D'
sp=cu.splines.new('BEZIER');sp.bezier_points.add(len(PTS)-1)
for i,(x,y,z,r) in enumerate(PTS):
    bp=sp.bezier_points[i];bp.co=(x,y,z);bp.handle_left_type='AUTO';bp.handle_right_type='AUTO';bp.radius=r
cu.bevel_depth=BEVEL;cu.bevel_resolution=8;cu.use_fill_caps=True;cu.resolution_u=18
tail=bpy.data.objects.new("tailobj",cu);bpy.context.collection.objects.link(tail)
bpy.context.view_layer.objects.active=tail;tail.select_set(True)
bpy.ops.object.convert(target='MESH')
tail=bpy.context.active_object
# Normalen/clean
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')

# Union mit Katze
m=cat.modifiers.new("u","BOOLEAN");m.operation="UNION";m.object=tail;m.solver="EXACT"
bpy.context.view_layer.objects.active=cat;bpy.ops.object.modifier_apply(modifier=m.name)
bpy.data.objects.remove(tail,do_unlink=True)
try: bpy.ops.wm.stl_export(filepath=OUT)
except Exception: bpy.ops.export_mesh.stl(filepath=OUT)
print("TAIL_DONE",OUT)
