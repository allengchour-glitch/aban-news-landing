# flexicut.py - Flexi-Cutter automatisch in ein Modell schneiden (Blender, LuxeStyle)
# ---------------------------------------------------------------------------
# Schneidet Kugel-Pfannen-Flexi-Gelenke entlang einer Achse in ein Modell und
# zentriert es, damit die Gelenke durch die KOERPERMITTE laufen. Funktioniert
# nur bei DURCHGEHENDEN Koerpern (z.B. flache Pancake): WORKS. Volle Figuren mit
# abstehenden Beinen (sitzende Katze) ZERFALLEN (Glieder fallen ab).
# Aufruf: IN= OUT= PNG= AXIS=x|y|z JOINTS='[..]' BALL= NECK= CLEAR= GAP= EDEP= BIG=
#   blender --background --python flexicut.py
# Geprueft: Pancake AXIS=y JOINTS=[-18,-6,6,18] -> 5 Segmente, Kugeln gefangen.
# ---------------------------------------------------------------------------
import bpy, bmesh, os, json
from mathutils import Vector
IN=os.environ["IN"]; OUT=os.environ["OUT"]; PNG=os.environ.get("PNG")
AXIS=os.environ.get("AXIS","z").lower()
JOINTS=json.loads(os.environ["JOINTS"])          # Positionen entlang AXIS (mm)
ball_r=float(os.environ.get("BALL","3.0")); neck_r=float(os.environ.get("NECK","1.7"))
clear=float(os.environ.get("CLEAR","0.4")); gap=float(os.environ.get("GAP","0.9"))
edep=float(os.environ.get("EDEP","1.85")); BIG=float(os.environ.get("BIG","45"))

ai={"x":0,"y":1,"z":2}[AXIS]
def vec(along, a, b):  # vector with 'along' on axis, a,b on the other two
    o=[a,b]; v=[0,0,0]; v[ai]=along
    oi=[i for i in range(3) if i!=ai]; v[oi[0]]=o[0]; v[oi[1]]=o[1]; return Vector(v)

bpy.ops.wm.read_factory_settings(use_empty=True)
ext=IN.lower().rsplit(".",1)[-1]
if ext in("glb","gltf"): bpy.ops.import_scene.gltf(filepath=IN)
elif ext=="obj":
    try: bpy.ops.wm.obj_import(filepath=IN)
    except Exception: bpy.ops.import_scene.obj(filepath=IN)
else:
    try: bpy.ops.wm.stl_import(filepath=IN)
    except Exception: bpy.ops.import_mesh.stl(filepath=IN)
cat=max([o for o in bpy.context.scene.objects if o.type=='MESH'],key=lambda m:sum(m.dimensions))
bpy.ops.object.select_all(action='DESELECT'); cat.select_set(True); bpy.context.view_layer.objects.active=cat
bpy.ops.object.make_single_user(object=True,obdata=True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
# auf Bounding-Box-Mitte zentrieren, damit die Gelenke durch die Koerpermitte laufen
bb=[cat.matrix_world@Vector(c) for c in cat.bound_box]
ctr0=Vector(( (min(v.x for v in bb)+max(v.x for v in bb))/2,
              (min(v.y for v in bb)+max(v.y for v in bb))/2,
              (min(v.z for v in bb)+max(v.z for v in bb))/2 ))
cat.location = -ctr0
bpy.ops.object.transform_apply(location=True)
bb=[cat.matrix_world@Vector(c) for c in cat.bound_box]
lo=min(v[ai] for v in bb); hi=max(v[ai] for v in bb)
J=sorted(JOINTS)

# Segment-Grenzen entlang Achse
bounds=[lo]
for z in J: bounds += [z-gap/2, z+gap/2]
bounds += [hi]
# Paare (seg k): bounds[0:1],[2:3],...
segs=[(bounds[2*k],bounds[2*k+1]) for k in range(len(J)+1)]

def add_cyl(c_along0, c_along1, r):
    h=c_along1-c_along0; mid=(c_along0+c_along1)/2
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=vec(mid,0,0))
    o=bpy.context.active_object
    if AXIS=="x": o.rotation_euler=(0,1.5708,0)
    elif AXIS=="y": o.rotation_euler=(1.5708,0,0)
    return o
def add_sph(along,r):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r,location=vec(along,0,0)); return bpy.context.active_object

pos=[]   # positive Teile (Discs + Kugeln + Hälse)
for (a,b) in segs: pos.append(add_cyl(a,b,BIG))
for z in J:
    bc=z+gap/2+edep
    pos.append(add_sph(bc,ball_r))                      # Kugel
    pos.append(add_cyl(z-gap/2, bc, neck_r))            # Hals (unteres Disc -> Kugel)
# join positives
for o in bpy.context.scene.objects: o.select_set(o in pos)
bpy.context.view_layer.objects.active=pos[0]; bpy.ops.object.join(); keeper=bpy.context.active_object

# Sockets abziehen
socks=[]
for z in J:
    bc=z+gap/2+edep
    socks.append(add_sph(bc, ball_r+clear))
    socks.append(add_cyl(bc, bc+ (BIG*0.0)+ (gap+edep)*0.0 + 6, neck_r+clear+1.0))  # kleiner Kanal nach +Achse
if socks:
    for o in bpy.context.scene.objects: o.select_set(o in socks)
    bpy.context.view_layer.objects.active=socks[0]; bpy.ops.object.join(); sock=bpy.context.active_object
    m=keeper.modifiers.new("s","BOOLEAN"); m.operation="DIFFERENCE"; m.object=sock; m.solver="EXACT"
    bpy.context.view_layer.objects.active=keeper; bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(sock,do_unlink=True)

# cat = cat ∩ keeper
m=cat.modifiers.new("i","BOOLEAN"); m.operation="INTERSECT"; m.object=keeper; m.solver="EXACT"
bpy.context.view_layer.objects.active=cat; bpy.ops.object.modifier_apply(modifier=m.name)
bpy.data.objects.remove(keeper,do_unlink=True)

# export
try: bpy.ops.wm.stl_export(filepath=OUT)
except Exception: bpy.ops.export_mesh.stl(filepath=OUT)
# loose parts count
me=cat.data
bm=bmesh.new(); bm.from_mesh(me)
seen=set(); comps=0
import collections
adj=collections.defaultdict(set)
for e in bm.edges:
    a,b=e.verts[0].index,e.verts[1].index; adj[a].add(b); adj[b].add(a)
for v in bm.verts:
    if v.index in seen: continue
    comps+=1; stack=[v.index]
    while stack:
        x=stack.pop()
        if x in seen: continue
        seen.add(x)
        stack+=[y for y in adj[x] if y not in seen]
bm.free()
print("FLEXICUT_DONE parts", comps)

if PNG:
    bpy.ops.object.select_all(action='DESELECT'); cat.select_set(True); bpy.context.view_layer.objects.active=cat
    bpy.ops.object.shade_smooth()
    mat=bpy.data.materials.new("m");mat.use_nodes=True
    mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value=(0.85,0.85,0.87,1)
    cat.data.materials.append(mat)
    bb=[cat.matrix_world@Vector(c) for c in cat.bound_box]; ctr=sum(bb,Vector())/8; d=max(cat.dimensions)
    tg=bpy.data.objects.new("t",None);bpy.context.collection.objects.link(tg);tg.location=ctr
    bpy.ops.object.camera_add(location=(ctr.x+d*0.7, ctr.y-d*1.6, ctr.z+d*0.5))
    cam=bpy.context.active_object;bpy.context.scene.camera=cam
    c=cam.constraints.new("TRACK_TO");c.target=tg;c.track_axis="TRACK_NEGATIVE_Z";c.up_axis="UP_Z"
    bpy.ops.object.light_add(type="SUN",location=(d,-d,d*2));bpy.context.active_object.data.energy=3.5
    bpy.ops.object.light_add(type="AREA",location=(-d,-d,d));bpy.context.active_object.data.energy=500
    sc=bpy.context.scene;sc.render.engine="CYCLES";sc.cycles.device="CPU";sc.cycles.samples=32
    sc.cycles.use_denoising=False;bpy.context.view_layer.cycles.use_denoising=False
    sc.world=bpy.data.worlds.new("w");sc.world.use_nodes=True
    sc.world.node_tree.nodes["Background"].inputs[0].default_value=(0.96,0.95,0.93,1)
    sc.render.resolution_x=900;sc.render.resolution_y=900;sc.render.filepath=PNG
    bpy.ops.render.render(write_still=True); print("PNG",PNG)
