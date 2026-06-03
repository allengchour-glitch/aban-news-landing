#!/usr/bin/env python3
"""LuxeStyle - sculpt_face.py : echte Katzen-Gesichtsgeometrie modellieren.

Statt Farbe aufzumalen wird die Form gebaut:
  - SCHNAUZE (Maulpartie) als kraeftige Kuppel  -> UNION in den Koerper
  - MUND als zwei schraege Rillen (Katzen-Laecheln) -> DIFFERENCE
  - AUGEN als domed Mandeln (separat, faerbbar)
  - NASE als kleines Dreieck (separat, faerbbar)
Export: cat_body.stl (Koerper+Schnauze+Mund, manifold) + color_schwarz.stl (Augen)
+ color_rosa.stl (Nase). Fuer EINFACHEN Druck spaeter unionbar.

Aufruf: IN=body.stl OUTDIR=/tmp/sculpt RENDER=/tmp/sculpt.png \
  blender --background --python sculpt_face.py    (Env: PARAMS optional)
"""
import bpy, os, json, math
import numpy as np
from mathutils import Vector

IN=os.environ["IN"]; OUTDIR=os.environ.get("OUTDIR","/tmp/sculpt"); os.makedirs(OUTDIR,exist_ok=True)
RENDER=os.environ.get("RENDER")
P=json.load(open(os.environ["PARAMS"])) if os.environ.get("PARAMS") and os.path.exists(os.environ.get("PARAMS","")) else {}
def g(k,d): return P.get(k,d)

bpy.ops.wm.read_factory_settings(use_empty=True)
try: bpy.ops.wm.stl_import(filepath=IN)
except Exception: bpy.ops.import_mesh.stl(filepath=IN)
body=[o for o in bpy.context.selected_objects if o.type=='MESH'][0]
body.name="body"; body.data=body.data.copy()
bpy.context.view_layer.objects.active=body; bpy.ops.object.shade_smooth()

V=np.array([(body.matrix_world@v.co)[:] for v in body.data.vertices])
xmin,ymin,zmin=V.min(0); xmax,ymax,zmax=V.max(0)
dimx,dimy,dimz=xmax-xmin,ymax-ymin,zmax-zmin
cx,cy=(xmin+xmax)/2,(ymin+ymax)/2
long_axis='y' if dimy>=dimx else 'x'; cross=dimx if long_axis=='y' else dimy
top=V[V[:,2]>=zmin+0.55*dimz]
head_sign=(1.0 if top[:,1].mean()>cy else -1.0) if long_axis=='y' else (1.0 if top[:,0].mean()>cx else -1.0)
front=Vector((0,head_sign,0)) if long_axis=='y' else Vector((head_sign,0,0))

def cast(zf,off=0.0):
    z=zmin+zf*dimz
    if long_axis=='y': o=Vector((cx+off,head_sign*1000.0,z)); d=Vector((0,-head_sign,0))
    else: o=Vector((head_sign*1000.0,cy+off,z)); d=Vector((-head_sign,0,0))
    r,loc,nrm,i=body.ray_cast(body.matrix_world.inverted()@o,d)
    return (body.matrix_world@loc,(body.matrix_world.to_3x3()@nrm).normalized()) if r else (None,None)

def blob(loc,r,scale,name):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r,location=loc,segments=48,ring_count=24)
    o=bpy.context.active_object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(scale=True); bpy.ops.object.shade_smooth(); return o

def boolean(tool,op):
    md=body.modifiers.new("b","BOOLEAN"); md.operation=op; md.object=tool; md.solver='EXACT'
    bpy.context.view_layer.objects.active=body
    bpy.ops.object.modifier_apply(modifier=md.name); bpy.data.objects.remove(tool,do_unlink=True)

EYE_ZF=float(g("eye_zf",0.63)); SEP=float(g("sep",0.16))*cross; EYE_R=float(g("eye_r",0.10))*cross
MUZ_ZF=float(g("muz_zf",0.50)); MUZ_R=float(g("muz_r",0.22))*cross
NOSE_ZF=float(g("nose_zf",0.55)); NOSE_R=float(g("nose_r",0.06))*cross
MOUTH_ZF=float(g("mouth_zf",0.45))

# 1) SCHNAUZE -> UNION (kraeftig vorgewoelbt)
loc,n=cast(MUZ_ZF)
if loc:
    boolean(blob(loc-n*(MUZ_R*0.30),MUZ_R,(1.7,1.0,0.82),"muzzle"),'UNION'); print("MUZZLE ok",flush=True)

# 2) MUND -> zwei schraege Rillen DIFFERENCE (auf der Schnauze)
loc,n=cast(MOUTH_ZF)
if loc:
    for side in (-1,1):
        bpy.ops.mesh.primitive_cylinder_add(radius=NOSE_R*0.30,depth=cross*0.18,vertices=16,location=(0,0,0))
        cyl=bpy.context.active_object
        cyl.rotation_euler=(0,math.radians(90),math.radians(side*20)) if long_axis=='y' else (math.radians(90),0,math.radians(side*20))
        bpy.ops.object.transform_apply(rotation=True)
        offx=side*cross*0.06
        cyl.location=loc+(Vector((offx,0,-dimz*0.01))) - n*(NOSE_R*0.10)
        boolean(cyl,'DIFFERENCE')
    print("MOUTH ok",flush=True)

# 3) AUGEN -> separate domed Mandeln (faerbbar)
eye_objs=[]
for side in (-1,1):
    loc,n=cast(EYE_ZF,off=side*SEP)
    if loc: eye_objs.append(blob(loc-n*(EYE_R*0.42),EYE_R,(1.45,0.72,1.0),"eye%d"%side))
if eye_objs:
    bpy.ops.object.select_all(action='DESELECT')
    for e in eye_objs: e.select_set(True)
    bpy.context.view_layer.objects.active=eye_objs[0]; bpy.ops.object.join()
    eyes=bpy.context.active_object; eyes.name="eyes"; print("EYES ok",flush=True)
else: eyes=None

# 4) NASE -> separate kleine Tropfen-Form
loc,n=cast(NOSE_ZF)
nose=blob(loc-n*(NOSE_R*0.25),NOSE_R,(1.3,1.0,0.85),"nose") if loc else None
if nose: print("NOSE ok",flush=True)

# Export
def export_sel(ob,path):
    for o in bpy.context.scene.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active=ob
    try: bpy.ops.wm.stl_export(filepath=path,export_selected_objects=True)
    except Exception: bpy.ops.export_mesh.stl(filepath=path,use_selection=True)
export_sel(body,os.path.join(OUTDIR,"cat_body.stl"))
if eyes: export_sel(eyes,os.path.join(OUTDIR,"color_schwarz.stl"))
if nose: export_sel(nose,os.path.join(OUTDIR,"color_rosa.stl"))
print("SCULPT_DONE verts",len(body.data.vertices),flush=True)

if RENDER:
    def setmat(ob,rgb,rough,spec=0.5):
        m=bpy.data.materials.new("m"); m.use_nodes=True; b=m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value=(*rgb,1); b.inputs["Roughness"].default_value=rough
        try: b.inputs["Specular IOR Level"].default_value=spec
        except: pass
        ob.data.materials.clear(); ob.data.materials.append(m)
    setmat(body,(0.62,0.60,0.58),0.62)
    if eyes: setmat(eyes,(0.03,0.03,0.03),0.14,0.85)
    if nose: setmat(nose,(0.70,0.38,0.42),0.4)
    scn=bpy.context.scene
    try: scn.render.engine='BLENDER_EEVEE_NEXT'
    except: scn.render.engine='BLENDER_EEVEE'
    scn.render.resolution_x=1000; scn.render.resolution_y=1000
    try: scn.eevee.taa_render_samples=96
    except: pass
    w=bpy.data.worlds.new("W"); scn.world=w; w.use_nodes=True
    w.node_tree.nodes["Background"].inputs[0].default_value=(0.55,0.58,0.62,1)
    bpy.ops.mesh.primitive_plane_add(size=600,location=(0,0,zmin))
    pm=bpy.data.materials.new("f"); pm.use_nodes=True
    pm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value=(0.6,0.62,0.65,1)
    pm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value=0.95
    bpy.context.active_object.data.materials.append(pm)
    tgt=Vector((cx,cy+head_sign*dimy*0.18,zmin+0.58*dimz)) if long_axis=='y' else Vector((cx+head_sign*dimx*0.18,cy,zmin+0.58*dimz))
    dist=max(dimx,dimy)*1.9
    cam_loc=Vector((cx+cross*0.42,cy+head_sign*dist,zmin+dimz*0.6)) if long_axis=='y' else Vector((cx+head_sign*dist,cy+cross*0.42,zmin+dimz*0.6))
    def area(loc,e,s=70):
        ld=bpy.data.lights.new("A",'AREA'); ld.energy=e; ld.size=s
        o=bpy.data.objects.new("A",ld); scn.collection.objects.link(o); o.location=loc
        dd=(tgt-Vector(loc)); o.rotation_euler=dd.to_track_quat('-Z','Y').to_euler()
    area(cam_loc+Vector((-55,0,60)),3400); area(cam_loc+Vector((60,0,5)),1300); area((cx,cy,zmax+60),1000)
    cd=bpy.data.cameras.new("C"); cam=bpy.data.objects.new("C",cd)
    scn.collection.objects.link(cam); scn.camera=cam; cd.lens=58
    cam.location=cam_loc; dd=(cam.location-tgt); dd.normalize()
    cam.rotation_euler=dd.to_track_quat('Z','Y').to_euler()
    scn.render.filepath=RENDER; bpy.ops.render.render(write_still=True)
    print("RENDER_DONE",RENDER,flush=True)
