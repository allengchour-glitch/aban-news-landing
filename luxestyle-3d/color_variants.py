#!/usr/bin/env python3
"""LuxeStyle - color_variants.py : fertiges Katzenmodell simpel einfaerben + Front-Render.

Erkennt Gesicht (max Schnauzen-Protrusion) + Augenpunkte automatisch, faerbt
Augen dunkel + Nase rosa, Koerper in Wunschfarbe (Volltoene -> AMS-druckfreundlich).
Rendert von vorn (Studio). Fuer Varianten-Vergleich (mehrere Farben/Posen).

Aufruf: IN=models/cat_sitting.stl OUT=/tmp/v.png BODY_COL="0.5,0.48,0.45" \
  [EYE_COL=..] [NOSE_COL=..] [EXPORT_PARTS=/tmp/dir] blender -b --python color_variants.py
"""
import bpy, os, numpy as np
from mathutils import Vector

IN=os.environ["IN"]; OUT=os.environ.get("OUT","/tmp/v.png")
def col(env,d):
    v=os.environ.get(env);
    return tuple(float(x) for x in v.split(",")) if v else d
BODY=col("BODY_COL",(0.52,0.50,0.47)); EYE=col("EYE_COL",(0.05,0.05,0.06)); NOSE=col("NOSE_COL",(0.78,0.42,0.46))
WHITE=col("WHITE_COL",(0.90,0.89,0.85))
EXPORT=os.environ.get("EXPORT_PARTS"); MULTI=os.environ.get("MULTI")
SPLIT=os.environ.get("SPLIT_STL")   # Ordner -> eine STL pro Farbzone (color_<name>.stl)

bpy.ops.wm.read_factory_settings(use_empty=True)
try: bpy.ops.wm.stl_import(filepath=IN)
except Exception: bpy.ops.import_mesh.stl(filepath=IN)
ob=[o for o in bpy.context.selected_objects if o.type=='MESH'][0]
bpy.context.view_layer.objects.active=ob; bpy.ops.object.shade_smooth()

V=np.array([v.co[:] for v in ob.data.vertices])
xmin,ymin,zmin=V.min(0); xmax,ymax,zmax=V.max(0)
dimx,dimy,dimz=xmax-xmin,ymax-ymin,zmax-zmin; cx,cy=(xmin+xmax)/2,(ymin+ymax)/2
big=max(dimx,dimy,dimz)*4

def cast(axis,sign,z,offc=0.0):
    if axis=='y': o=Vector((cx+offc,cy+sign*big,z)); d=Vector((0,-sign,0))
    else: o=Vector((cx+sign*big,cy+offc,z)); d=Vector((-sign,0,0))
    r,loc,nrm,i=ob.ray_cast(o,d)
    return (loc,nrm.normalized()) if r else (None,None)

# Gesicht: Richtung mit groesster Schnauzen-Protrusion auf halber Hoehe
zf=zmin+0.52*dimz; best=None
for axis,sign,dim in (('y',1,dimy),('y',-1,dimy),('x',1,dimx),('x',-1,dimx)):
    loc,n=cast(axis,sign,zf)
    if loc is None: continue
    val=loc[1] if axis=='y' else loc[0]
    pro=abs(val-(cy if axis=='y' else cx))
    if best is None or pro>best[0]: best=(pro,axis,sign)
_,FA,FS=best
cross='x' if FA=='y' else 'y'
crossdim=dimx if cross=='x' else dimy
print("FACE axis=%s sign=%+d"%(FA,FS),flush=True)

def face_pt(z,offc):  # Punkt+Normal auf der Gesichtsflaeche
    return cast(FA,FS,z,offc)

SEP=0.15*crossdim; EYE_R=0.075*crossdim; NOSE_R=0.05*crossdim
zeye=zmin+0.62*dimz; znose=zmin+0.52*dimz
pL,_=face_pt(zeye,-SEP); pR,_=face_pt(zeye,+SEP); pN,_=face_pt(znose,0.0)
print("eyes",pL is not None,pR is not None,"nose",pN is not None,flush=True)

mb=bpy.data.materials.new("body"); mb.use_nodes=True
mb.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value=(*BODY,1)
mb.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value=0.6
me=bpy.data.materials.new("eye"); me.use_nodes=True
eb=me.node_tree.nodes["Principled BSDF"]; eb.inputs["Base Color"].default_value=(*EYE,1)
eb.inputs["Roughness"].default_value=0.16
try: eb.inputs["Specular IOR Level"].default_value=0.9
except: pass
mn=bpy.data.materials.new("nose"); mn.use_nodes=True
mn.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value=(*NOSE,1)
mn.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value=0.4
mw_=bpy.data.materials.new("weiss"); mw_.use_nodes=True
mw_.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value=(*WHITE,1)
mw_.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value=0.62
ob.data.materials.clear()
for mm in (mb,me,mn,mw_): ob.data.materials.append(mm)  # 0 body,1 eye,2 nose,3 weiss

SOLID=os.environ.get("SOLID")
def near(c,p,r): return (c-p).length<r if p is not None else False
pL=Vector(pL) if pL is not None else None; pR=Vector(pR) if pR is not None else None; pN=Vector(pN) if pN is not None else None
ecount=ncount=wcount=0
zwhite=zmin+float(os.environ.get("WHITE_ZF","0.30"))*dimz   # weisse Pfoten/untere Brust
EYECOLOR=os.environ.get("EYECOLOR","1")=="1"   # Augen einfaerben? sonst Relief-Form
if not SOLID:
    for poly in ob.data.polygons:
        c=ob.matrix_world@poly.center
        if EYECOLOR and (near(c,pL,EYE_R) or near(c,pR,EYE_R)): poly.material_index=1; ecount+=1
        elif near(c,pN,NOSE_R): poly.material_index=2; ncount+=1
        elif MULTI and c.z<zwhite: poly.material_index=3; wcount+=1
        else: poly.material_index=0
print("mode",("SOLID" if SOLID else ("MULTI" if MULTI else "colored")),
      "eyes",ecount,"nose",ncount,"weiss",wcount,flush=True)

if EXPORT:
    os.makedirs(EXPORT,exist_ok=True)
    for mm,rgb in ((mb,BODY),(me,EYE),(mn,NOSE),(mw_,WHITE)):  # OBJ-Kd fuer assemble
        mm.diffuse_color=(*rgb,1)
    try: bpy.ops.wm.stl_export(filepath=os.path.join(EXPORT,"cat_solid.stl"))
    except Exception: bpy.ops.export_mesh.stl(filepath=os.path.join(EXPORT,"cat_solid.stl"))
    try: bpy.ops.wm.obj_export(filepath=os.path.join(EXPORT,"cat_colored.obj"),export_materials=True)
    except Exception: bpy.ops.export_scene.obj(filepath=os.path.join(EXPORT,"cat_colored.obj"),use_materials=True)

# Farbe als STL: Mesh nach Material trennen -> eine STL pro Farbe (vor dem Render)
if SPLIT:
    os.makedirs(SPLIT,exist_ok=True)
    NAMEMAP={"body":"koerper","weiss":"weiss","nose":"nase","eye":"augen"}
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True); bpy.context.view_layer.objects.active=ob
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='MATERIAL'); bpy.ops.object.mode_set(mode='OBJECT')
    written=[]
    for p in [m for m in bpy.context.scene.objects if m.type=='MESH']:
        if not p.material_slots or not p.material_slots[0].material: continue
        mnm=p.material_slots[0].material.name.split('.')[0]
        fn=NAMEMAP.get(mnm,mnm); path=os.path.join(SPLIT,"color_%s.stl"%fn)
        bpy.ops.object.select_all(action='DESELECT'); p.select_set(True); bpy.context.view_layer.objects.active=p
        try: bpy.ops.wm.stl_export(filepath=path,export_selected_objects=True)
        except Exception: bpy.ops.export_mesh.stl(filepath=path,use_selection=True)
        written.append((fn,len(p.data.polygons))); print("SPLIT_PART",fn,len(p.data.polygons),flush=True)
    print("SPLIT_DONE",SPLIT,sorted(written),flush=True)
    if os.environ.get("NORENDER"): import sys; sys.exit(0)

# Render von vorn
scn=bpy.context.scene
try: scn.render.engine='BLENDER_EEVEE_NEXT'
except: scn.render.engine='BLENDER_EEVEE'
scn.render.resolution_x=800; scn.render.resolution_y=800
try: scn.eevee.taa_render_samples=80
except: pass
w=bpy.data.worlds.new("W"); scn.world=w; w.use_nodes=True
w.node_tree.nodes["Background"].inputs[0].default_value=(0.5,0.53,0.57,1)
w.node_tree.nodes["Background"].inputs[1].default_value=0.35  # weniger Ambient -> Relief sichtbar
try: scn.eevee.use_raytracing=True
except: pass
bpy.ops.mesh.primitive_plane_add(size=900,location=(0,0,zmin))
pm=bpy.data.materials.new("f"); pm.use_nodes=True
pm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value=(0.55,0.57,0.6,1)
bpy.context.active_object.data.materials.append(pm)
F=Vector((0,FS,0)) if FA=='y' else Vector((FS,0,0))
tgt=Vector((cx,cy,zmin+0.58*dimz))+F*(0.12*max(dimx,dimy))
dist=max(dimx,dimy)*2.0
side=Vector((1,0,0)) if FA=='y' else Vector((0,1,0))
cl=tgt+F*dist+side*(crossdim*0.42)+Vector((0,0,dimz*0.2))
def area(loc,e,s=80):
    ld=bpy.data.lights.new("A",'AREA'); ld.energy=e; ld.size=s
    o=bpy.data.objects.new("A",ld); scn.collection.objects.link(o); o.location=loc
    dd=(tgt-Vector(loc)); o.rotation_euler=dd.to_track_quat('-Z','Y').to_euler()
# Sonne von oben-vorne -> wirft Schatten in Augen/Schnauzen-Relief
sun=bpy.data.lights.new("S",'SUN'); sun.energy=3.2; sun.angle=0.15
so=bpy.data.objects.new("S",sun); scn.collection.objects.link(so)
sd=(tgt-(cl+F*5+side*2+Vector((0,0,dist*0.9)))); so.rotation_euler=sd.to_track_quat('-Z','Y').to_euler()
area(cl+Vector((-55,0,55)),2600); area(cl+Vector((60,0,5)),900)
cd=bpy.data.cameras.new("C"); cam=bpy.data.objects.new("C",cd)
scn.collection.objects.link(cam); scn.camera=cam; cd.lens=58
cam.location=cl; dd=(cl-tgt); dd.normalize(); cam.rotation_euler=dd.to_track_quat('Z','Y').to_euler()
scn.render.filepath=OUT; bpy.ops.render.render(write_still=True)
print("VARIANT_DONE",OUT,flush=True)
