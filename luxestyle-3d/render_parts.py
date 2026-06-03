# render_parts.py - die per split_color zerlegten STL-Regionen farbig zusammen rendern.
# Farbzuordnung weiss/schwarz/orange/rosa. TAG= OUT= [CAM=front|side|back|top]
import bpy,os,glob
from mathutils import Vector
TAG=os.environ["TAG"];out=os.environ["OUT"];view=os.environ.get("CAM","front")
COL={"weiss":(0.93,0.93,0.94),"schwarz":(0.02,0.02,0.02),"orange":(0.93,0.45,0.10),"rosa":(0.97,0.62,0.68)}
bpy.ops.wm.read_factory_settings(use_empty=True)
meshes=[]
for fn in sorted(glob.glob("/tmp/parts/%s_*.stl"%TAG)):
    mn=os.path.basename(fn).split("_",1)[1][:-4]
    before=set(bpy.context.scene.objects)
    try: bpy.ops.wm.stl_import(filepath=fn)
    except Exception: bpy.ops.import_mesh.stl(filepath=fn)
    o=[x for x in bpy.context.scene.objects if x not in before and x.type=='MESH'][0]
    bpy.context.view_layer.objects.active=o
    mat=bpy.data.materials.new(mn);mat.use_nodes=True
    mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value=(*COL.get(mn,(0.7,0.7,0.7)),1)
    o.data.materials.clear();o.data.materials.append(mat);bpy.ops.object.shade_smooth()
    meshes.append(o)
# backview-Kamera exakt
bb=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
center=sum(bb,Vector())/len(bb)
dim=Vector((max(v.x for v in bb)-min(v.x for v in bb),max(v.y for v in bb)-min(v.y for v in bb),max(v.z for v in bb)-min(v.z for v in bb)))
tgt=bpy.data.objects.new("t",None);bpy.context.collection.objects.link(tgt);tgt.location=center
d=max(dim)*2.2+4
cams={"back":(d*0.6,d,d*0.6),"side":(d,0,d*0.6),"front":(d*0.6,-d,d*0.6),"top":(0.01,-0.01,d*1.2)}
bpy.ops.object.camera_add(location=cams[view])
cam=bpy.context.active_object;bpy.context.scene.camera=cam
c=cam.constraints.new("TRACK_TO");c.target=tgt;c.track_axis="TRACK_NEGATIVE_Z";c.up_axis="UP_Y"
bpy.ops.object.light_add(type="SUN",location=(d,-d,d*1.5));bpy.context.active_object.data.energy=4
w=bpy.data.worlds.new("w");bpy.context.scene.world=w;w.use_nodes=True
w.node_tree.nodes["Background"].inputs[0].default_value=(0.93,0.93,0.93,1)
sc=bpy.context.scene;sc.render.engine="CYCLES";sc.cycles.device="CPU";sc.cycles.samples=48
sc.cycles.use_denoising=False;bpy.context.view_layer.cycles.use_denoising=False
sc.render.resolution_x=900;sc.render.resolution_y=900;sc.render.filepath=out
bpy.ops.render.render(write_still=True);print("PARTS_RENDER",TAG,"meshes",len(meshes),"center",[round(x,1) for x in center])
