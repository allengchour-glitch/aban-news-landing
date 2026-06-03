import bpy,os,math,numpy as np
from mathutils import Vector
IN=os.environ["IN"]; OUT=os.environ["OUT"]
AZ=math.radians(float(os.environ.get("AZ","30")))
RES=int(os.environ.get("RES","1400"))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=IN)
obs=[o for o in bpy.context.scene.objects if o.type=='MESH']
if len(obs)>1:
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active=obs[0]; bpy.ops.object.join()
ob=[o for o in bpy.context.scene.objects if o.type=='MESH'][0]
bpy.context.view_layer.objects.active=ob; bpy.ops.object.shade_smooth()
V=np.array([(ob.matrix_world@v.co)[:] for v in ob.data.vertices])
xmin,ymin,zmin=V.min(0); xmax,ymax,zmax=V.max(0)
dimx,dimy,dimz=xmax-xmin,ymax-ymin,zmax-zmin; cx,cy=(xmin+xmax)/2,(ymin+ymax)/2
big=max(dimx,dimy,dimz)*4
def cast(axis,sign,z):
    o=Vector((cx,cy+sign*big,z)) if axis=='y' else Vector((cx+sign*big,cy,z))
    d=Vector((0,-sign,0)) if axis=='y' else Vector((-sign,0,0))
    r,loc,n,i=ob.ray_cast(ob.matrix_world.inverted()@o,d); return loc if r else None
zf=zmin+0.52*dimz; best=None
for axis,sign in (('y',1),('y',-1),('x',1),('x',-1)):
    loc=cast(axis,sign,zf)
    if loc is None: continue
    val=loc[1] if axis=='y' else loc[0]; pro=abs(val-(cy if axis=='y' else cx))
    if best is None or pro>best[0]: best=(pro,axis,sign)
_,FA,FS=best
F=Vector((0.0,float(FS),0.0)) if FA=='y' else Vector((float(FS),0.0,0.0))
crossdim=dimx if FA=='y' else dimy
scn=bpy.context.scene
try: scn.render.engine='BLENDER_EEVEE_NEXT'
except: scn.render.engine='BLENDER_EEVEE'
scn.render.resolution_x=RES; scn.render.resolution_y=RES
scn.render.film_transparent=True       # Figur freigestellt -> sauber auf weiss komponieren
try: scn.eevee.taa_render_samples=160
except: pass
w=bpy.data.worlds.new("W"); scn.world=w; w.use_nodes=True
bg=w.node_tree.nodes["Background"]; bg.inputs[0].default_value=(1,1,1,1); bg.inputs[1].default_value=0.55
ca,sa=math.cos(AZ),math.sin(AZ)
dirv=Vector((F.x*ca - F.y*sa, F.x*sa + F.y*ca, 0.0)).normalized()
side=dirv.cross(Vector((0,0,1))).normalized()
tgt=Vector((cx,cy,zmin+0.52*dimz))
dist=max(dimx,dimy)*2.6
cl=tgt+dirv*dist+Vector((0,0,dimz*0.34))
def area(loc,e,s):
    ld=bpy.data.lights.new("A",'AREA'); ld.energy=e; ld.size=s
    o=bpy.data.objects.new("A",ld); scn.collection.objects.link(o); o.location=loc
    dd=(tgt-Vector(loc)); o.rotation_euler=dd.to_track_quat('-Z','Y').to_euler()
area(tgt+dirv*dist*0.9+side*dist*0.55+Vector((0,0,dimz*1.2)), 2600, max(dimx,dimy)*1.1)
area(tgt+dirv*dist*0.9-side*dist*0.7+Vector((0,0,dimz*0.5)), 1000, max(dimx,dimy)*1.5)
area(tgt-dirv*dist*0.4+Vector((0,0,dimz*1.7)), 900, max(dimx,dimy)*0.7)
cd=bpy.data.cameras.new("C"); cam=bpy.data.objects.new("C",cd)
scn.collection.objects.link(cam); scn.camera=cam; cd.lens=55
cam.location=cl; dd=(cl-tgt); dd.normalize(); cam.rotation_euler=dd.to_track_quat('Z','Y').to_euler()
scn.render.image_settings.color_mode='RGBA'
scn.render.filepath=OUT; bpy.ops.render.render(write_still=True); print("OK")
