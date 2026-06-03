# split_color.py - farbiges GLB nach Material in einzelne STL-Regionen zerlegen.
# (Workaround: GLB/OBJ rendern in dieser Headless-Umgebung leer, frische STL gehen.)
# IN=farbiges.glb TAG=name  -> /tmp/parts/TAG_<material>.stl
import bpy,os
IN=os.environ["IN"];TAG=os.environ["TAG"]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=IN)
o=[m for m in bpy.context.scene.objects if m.type=="MESH"][0]
bpy.context.view_layer.objects.active=o;o.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
matnames=[s.material.name for s in o.material_slots if s.material]
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
parts=[m for m in bpy.context.scene.objects if m.type=="MESH"]
for p in parts:
    mn=p.material_slots[0].material.name if p.material_slots and p.material_slots[0].material else "x"
    bpy.ops.object.select_all(action='DESELECT');p.select_set(True);bpy.context.view_layer.objects.active=p
    fn="/tmp/parts/%s_%s.stl"%(TAG,mn)
    try: bpy.ops.wm.stl_export(filepath=fn,export_selected_objects=True)
    except Exception: bpy.ops.export_mesh.stl(filepath=fn,use_selection=True)
    print("PART",mn,len(p.data.vertices))
