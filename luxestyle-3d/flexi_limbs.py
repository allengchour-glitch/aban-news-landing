import bpy, bmesh, os, json, collections
from mathutils import Vector
IN=os.environ["IN"]; OUT=os.environ["OUT"]; PNG=os.environ.get("PNG")
ball_r=float(os.environ.get("BALL","3.0")); neck_r=float(os.environ.get("NECK","1.8"))
clear=float(os.environ.get("CLEAR","0.4")); gap=float(os.environ.get("GAP","1.0"))
edep=float(os.environ.get("EDEP","1.6")); Rlimb=float(os.environ.get("RLIMB","9"))
rc_frac=float(os.environ.get("RCFRAC","0.52")); back=float(os.environ.get("BACK","4.0"))
LIMBS=os.environ.get("LIMBS")  # optional json [{"dir":[x,y],"rc":..}, ...]

bpy.ops.wm.read_factory_settings(use_empty=True)
ext=IN.lower().rsplit(".",1)[-1]
if ext in("glb","gltf"): bpy.ops.import_scene.gltf(filepath=IN)
else:
    try: bpy.ops.wm.stl_import(filepath=IN)
    except Exception: bpy.ops.import_mesh.stl(filepath=IN)
cat=max([o for o in bpy.context.scene.objects if o.type=='MESH'],key=lambda m:sum(m.dimensions))
bpy.ops.object.select_all(action='DESELECT'); cat.select_set(True); bpy.context.view_layer.objects.active=cat
bpy.ops.object.make_single_user(object=True,obdata=True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
# zentrieren (alle Achsen) -> Gelenke laufen durch die Koerpermitte (Z-Mitte)
bb=[cat.matrix_world@Vector(c) for c in cat.bound_box]
ctr=Vector(((min(v.x for v in bb)+max(v.x for v in bb))/2,
            (min(v.y for v in bb)+max(v.y for v in bb))/2,
            (min(v.z for v in bb)+max(v.z for v in bb))/2))
cat.location=-ctr; bpy.ops.object.transform_apply(location=True)

# --- Gliedmassen bestimmen ---
verts=[cat.matrix_world@v.co for v in cat.data.vertices]
def detect():
    quads={}
    for sx in(1,-1):
        for sy in(1,-1):
            best=None;bd=-1
            for p in verts:
                if (1 if p.x>=0 else -1)==sx and (1 if p.y>=0 else -1)==sy:
                    r=(p.x*p.x+p.y*p.y)**.5
                    if r>bd: bd=r;best=p
            if best is not None: quads[(sx,sy)]=(Vector((best.x,best.y,0)),bd)
    out=[]
    for (sx,sy),(p,bd) in quads.items():
        d=p.normalized(); out.append({"dir":[d.x,d.y],"rc":rc_frac*bd})
    return out
limbs=json.loads(LIMBS) if LIMBS else detect()
print("LIMBS",json.dumps([{ "dir":[round(l['dir'][0],3),round(l['dir'][1],3)],"rc":round(l['rc'],1)} for l in limbs]))

def cyl(p0,p1,r):
    d=p1-p0; h=d.length; mid=(p0+p1)/2
    bpy.ops.mesh.primitive_cylinder_add(radius=r,depth=h,location=mid)
    o=bpy.context.active_object
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    return o
def sph(p,r):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r,segments=48,ring_count=24,location=p)
    return bpy.context.active_object
def boolean(target,tool,op):
    m=target.modifiers.new("b","BOOLEAN");m.operation=op;m.object=tool;m.solver="EXACT"
    bpy.context.view_layer.objects.active=target;bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(tool,do_unlink=True)

for l in limbs:
    d=Vector((l["dir"][0],l["dir"][1],0)).normalized(); rc=l["rc"]
    P=d*rc; Cb=P+d*edep
    # 1) Spalt: duenne Scheibe quer zum Bein -> Bein vom Koerper trennen
    G=cyl(P-d*(gap/2), P+d*(gap/2), Rlimb); boolean(cat,G,"DIFFERENCE")
    # 2) Pfanne: Kugel+Spiel aus dem Bein ausschneiden
    Cav=sph(Cb,ball_r+clear); boolean(cat,Cav,"DIFFERENCE")
    # 3) Koerper-Stiel mit Kugel in die Pfanne setzen (gehoert zum Koerper)
    stem=cyl(P-d*back, Cb, neck_r); ballo=sph(Cb,ball_r)
    bpy.ops.object.select_all(action='DESELECT'); stem.select_set(True); ballo.select_set(True)
    bpy.context.view_layer.objects.active=stem; bpy.ops.object.join()
    boolean(cat,bpy.context.active_object,"UNION")

# winzige Splitter entfernen (Druck-Nuisance): lose Teile trennen, kleine loeschen, wieder vereinen
MINPART=float(os.environ.get("MINPART","5"))
bpy.ops.object.select_all(action='DESELECT'); cat.select_set(True); bpy.context.view_layer.objects.active=cat
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
parts=[m for m in bpy.context.scene.objects if m.type=='MESH']
keep=[m for m in parts if max(m.dimensions)>=MINPART]
for m in parts:
    if m not in keep: bpy.data.objects.remove(m,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for m in keep: m.select_set(True)
bpy.context.view_layer.objects.active=keep[0]; bpy.ops.object.join(); cat=bpy.context.active_object
print("DROPPED splinters, kept",len(keep))

try: bpy.ops.wm.stl_export(filepath=OUT)
except Exception: bpy.ops.export_mesh.stl(filepath=OUT)

# lose Teile
me=cat.data; bm=bmesh.new(); bm.from_mesh(me)
adj=collections.defaultdict(set)
for e in bm.edges: a,b=e.verts[0].index,e.verts[1].index; adj[a].add(b); adj[b].add(a)
seen=set();comps=0
for v in bm.verts:
    if v.index in seen: continue
    comps+=1;st=[v.index]
    while st:
        x=st.pop()
        if x in seen: continue
        seen.add(x); st+=[y for y in adj[x] if y not in seen]
bm.free()
print("LIMBS_DONE parts",comps)
