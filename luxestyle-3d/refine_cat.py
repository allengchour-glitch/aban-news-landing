#!/usr/bin/env python3
"""LuxeStyle - refine_cat.py : parametrisches Veredeln + Render einer Katzen-Figur.

Nimmt die Farbteile (color_weiss/schwarz/rosa.stl) und macht daraus einen
fotorealistischeren Katzen-Render: echte Fellfarbe (optional Tabby-Streifen),
Iris-Augen mit Glanzlicht, Studio-Licht, Post-Processing (Bloom/Grade). Alle
Stellschrauben kommen aus einer JSON (PARAMS) -> Loop-tauglich.

WICHTIG: Das ist der MARKETING-Render. Fuer den DRUCK zaehlen nur solide Farbzonen
(Body-Farbe, Augen schwarz, Nase rosa) -> getrennt via assemble.py.

Aufruf:
  BODY=parts/color_weiss.stl EYES=parts/color_schwarz.stl NOSE=parts/color_rosa.stl \
    PARAMS=/tmp/cat_params.json OUT=/tmp/cat_refine.png \
    blender --background --python refine_cat.py
"""
import bpy, os, json, math
import numpy as np
from mathutils import Vector

BODY=os.environ["BODY"]; EYES=os.environ["EYES"]; NOSE=os.environ.get("NOSE")
OUT=os.environ.get("OUT","/tmp/cat_refine.png")
P=json.load(open(os.environ["PARAMS"])) if os.environ.get("PARAMS") and os.path.exists(os.environ["PARAMS"]) else {}

def g(k,d): return P.get(k,d)
BODY_COL   = g("body_color",[0.42,0.40,0.37])      # Grundfell (Default warmgrau)
STRIPE_COL = g("stripe_color",[0.22,0.20,0.18])    # Tabby-Streifen dunkel
BELLY_COL  = g("belly_color",[0.78,0.75,0.70])     # heller Bauch/Brust
TABBY      = float(g("tabby",0.0))                  # 0..1 Streifen-Staerke
TABBY_SCALE= float(g("tabby_scale",7.0))
IRIS_COL   = g("iris_color",[0.55,0.42,0.08])       # Augen-Iris (Bernstein)
EYE_ROUGH  = float(g("eye_rough",0.12))
NOSE_COL   = g("nose_color",[0.78,0.40,0.45])
EAR_COL    = g("ear_color", None)                   # optional Ohr-Innen rosa
BG         = g("bg",[0.58,0.62,0.68])
KEY        = float(g("key_energy",3200))
HIGHLIGHT  = float(g("highlight",1.0))              # Augen-Glanzlicht an/aus 0..1
BLOOM      = float(g("bloom",0.6))
FUR_ROUGH  = float(g("fur_rough",0.62))

bpy.ops.wm.read_factory_settings(use_empty=True)
def imp(path,name):
    try: bpy.ops.wm.stl_import(filepath=path)
    except Exception: bpy.ops.import_mesh.stl(filepath=path)
    o=bpy.context.selected_objects[0]; o.name=name
    bpy.ops.object.shade_smooth(); return o
body=imp(BODY,"body"); eyes=imp(EYES,"eyes")
nose=imp(NOSE,"nose") if NOSE and os.path.exists(NOSE) else None

# --- bbox/geo ---
mw=body.matrix_world
Vb=np.array([(mw@v.co)[:] for v in body.data.vertices])
zmin,zmax=Vb[:,2].min(),Vb[:,2].max(); dz=zmax-zmin
xmin,xmax=Vb[:,0].min(),Vb[:,0].max()
ymin,ymax=Vb[:,1].min(),Vb[:,1].max()
cx,cy=(xmin+xmax)/2,(ymin+ymax)/2
dimx,dimy=xmax-xmin,ymax-ymin
long_axis='y' if dimy>=dimx else 'x'
cross=dimx if long_axis=='y' else dimy
# Kopf-Richtung (oberes Band)
top=Vb[Vb[:,2]>=zmin+0.55*dz]
head_sign = (1.0 if (top[:,1].mean()>cy) else -1.0) if long_axis=='y' else (1.0 if (top[:,0].mean()>cx) else -1.0)

# --- Body-Material: Fell, optional Tabby + heller Bauch ---
m=bpy.data.materials.new("fur"); m.use_nodes=True; nt=m.node_tree
bsdf=nt.nodes["Principled BSDF"]; bsdf.inputs["Roughness"].default_value=FUR_ROUGH
try: bsdf.inputs["Sheen Weight"].default_value=0.3
except: pass
BELLY_STR=float(g("belly_strength",0.0))
if TABBY>0.01:
    tex=nt.nodes.new("ShaderNodeTexWave"); tex.inputs["Scale"].default_value=TABBY_SCALE
    tex.inputs["Distortion"].default_value=float(g("tabby_dist",3.0)); tex.wave_type='BANDS'; tex.bands_direction='Z'
    try: tex.inputs["Detail"].default_value=float(g("tabby_detail",2.0))
    except: pass
    ramp=nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position=0.40; ramp.color_ramp.elements[1].position=0.58
    mix=nt.nodes.new("ShaderNodeMixRGB"); mix.blend_type='MIX'
    mix.inputs["Color1"].default_value=(*BODY_COL,1); mix.inputs["Color2"].default_value=(*STRIPE_COL,1)
    nt.links.new(tex.outputs["Fac"],ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"],mix.inputs["Fac"])
    base_out=mix.outputs["Color"]
    if BELLY_STR>0.01:  # heller Bauch UNTEN (bottom -> belly), oben Tabby
        geo=nt.nodes.new("ShaderNodeNewGeometry"); sep=nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(geo.outputs["Position"],sep.inputs["Vector"])
        belly=nt.nodes.new("ShaderNodeMapRange")
        belly.inputs["From Min"].default_value=zmin
        belly.inputs["From Max"].default_value=zmin+0.45*dz
        belly.inputs["To Min"].default_value=BELLY_STR; belly.inputs["To Max"].default_value=0.0
        mix2=nt.nodes.new("ShaderNodeMixRGB"); mix2.inputs["Color2"].default_value=(*BELLY_COL,1)
        nt.links.new(sep.outputs["Z"],belly.inputs["Value"])
        nt.links.new(belly.outputs["Result"],mix2.inputs["Fac"])
        nt.links.new(base_out,mix2.inputs["Color1"]); base_out=mix2.outputs["Color"]
    nt.links.new(base_out,bsdf.inputs["Base Color"])
else:
    bsdf.inputs["Base Color"].default_value=(*BODY_COL,1)
body.data.materials.clear(); body.data.materials.append(m)

# --- Augen: Iris glaenzend ---
me=bpy.data.materials.new("eye"); me.use_nodes=True
eb=me.node_tree.nodes["Principled BSDF"]
eb.inputs["Base Color"].default_value=(*IRIS_COL,1); eb.inputs["Roughness"].default_value=EYE_ROUGH
try: eb.inputs["Specular IOR Level"].default_value=0.9
except: pass
eyes.data.materials.clear(); eyes.data.materials.append(me)

if nose:
    mn=bpy.data.materials.new("nose"); mn.use_nodes=True
    mn.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value=(*NOSE_COL,1)
    mn.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value=0.35
    nose.data.materials.clear(); nose.data.materials.append(mn)

# --- Augen-Detail: Pupille (schwarz) + Glanzlicht (weiss) je Auge ---
front = Vector((0,head_sign,0)) if long_axis=='y' else Vector((head_sign,0,0))
up = Vector((0,0,1))
def black_mat():
    mm=bpy.data.materials.new("pup"); mm.use_nodes=True
    b=mm.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value=(0.01,0.01,0.01,1)
    b.inputs["Roughness"].default_value=0.1
    try: b.inputs["Specular IOR Level"].default_value=0.9
    except: pass
    return mm
def glint_mat():
    mm=bpy.data.materials.new("gl"); mm.use_nodes=True
    b=mm.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value=(1,1,1,1)
    try: b.inputs["Emission Color"].default_value=(1,1,1,1); b.inputs["Emission Strength"].default_value=3.0
    except: pass
    return mm
Ve=np.array([(eyes.matrix_world@v.co)[:] for v in eyes.data.vertices])
midx=Ve[:,0].mean()
for si,sidem in enumerate((Ve[Ve[:,0]<midx], Ve[Ve[:,0]>=midx])):
    c=Vector(sidem.mean(0)); rad=float(np.linalg.norm(sidem-np.array(c),axis=1).max())
    sidesign = -1.0 if si==0 else 1.0
    # Pupille: rund, vorne zentriert (Iris-Ring bleibt sichtbar)
    ppos=c+front*(rad*0.55)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=rad*0.52, location=ppos, segments=24, ring_count=12)
    pu=bpy.context.active_object; bpy.ops.object.shade_smooth(); pu.data.materials.append(black_mat())
    # Glanzlicht oben-seitlich
    if HIGHLIGHT>0.01:
        gpos=c+front*(rad*0.85)+up*(rad*0.45)+Vector((sidesign*rad*0.2,0,0))
        bpy.ops.mesh.primitive_uv_sphere_add(radius=rad*0.18, location=gpos, segments=12, ring_count=6)
        gl=bpy.context.active_object; gl.data.materials.append(glint_mat())

# --- Szene/Licht/Kamera ---
scn=bpy.context.scene
try: scn.render.engine='BLENDER_EEVEE_NEXT'
except: scn.render.engine='BLENDER_EEVEE'
scn.render.resolution_x=1000; scn.render.resolution_y=1000
try: scn.eevee.taa_render_samples=96
except: pass
w=bpy.data.worlds.new("W"); scn.world=w; w.use_nodes=True
w.node_tree.nodes["Background"].inputs[0].default_value=(*BG,1)
w.node_tree.nodes["Background"].inputs[1].default_value=1.0
# Boden
bpy.ops.mesh.primitive_plane_add(size=600,location=(0,0,zmin))
pm=bpy.data.materials.new("f"); pm.use_nodes=True
pm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value=(BG[0]*1.1,BG[1]*1.1,BG[2]*1.1,1)
pm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value=0.95
bpy.context.active_object.data.materials.append(pm)

tgt=Vector((cx, cy+head_sign*dimy*0.22, zmin+0.58*dz)) if long_axis=='y' else Vector((cx+head_sign*dimx*0.22, cy, zmin+0.58*dz))
dist=max(dimx,dimy)*1.95
cam_loc=Vector((cx+cross*0.45, cy+head_sign*dist, zmin+dz*0.6)) if long_axis=='y' else Vector((cx+head_sign*dist, cy+cross*0.45, zmin+dz*0.6))
def area(loc,e,s=70):
    ld=bpy.data.lights.new("A",'AREA'); ld.energy=e; ld.size=s
    o=bpy.data.objects.new("A",ld); scn.collection.objects.link(o); o.location=loc
    dd=(tgt-Vector(loc)); o.rotation_euler=dd.to_track_quat('-Z','Y').to_euler()
area(cam_loc+Vector((-50,0,50)),KEY); area(cam_loc+Vector((55,0,5)),KEY*0.45)
area((cx,cy,zmax+60),KEY*0.4)
cd=bpy.data.cameras.new("C"); cam=bpy.data.objects.new("C",cd)
scn.collection.objects.link(cam); scn.camera=cam; cd.lens=58
cam.location=cam_loc; dd=(cam.location-tgt); dd.normalize()
cam.rotation_euler=dd.to_track_quat('Z','Y').to_euler()

# --- Post (Bloom) via Compositor, nur wenn aktiviert ---
if BLOOM>0.01:
    scn.use_nodes=True; cnt=scn.node_tree
    for n in list(cnt.nodes): cnt.nodes.remove(n)
    rl=cnt.nodes.new("CompositorNodeRLayers")
    comp=cnt.nodes.new("CompositorNodeComposite")
    glare=cnt.nodes.new("CompositorNodeGlare"); glare.glare_type='FOG_GLOW'
    glare.quality='HIGH'; glare.threshold=0.9; glare.mix=-(1.0-min(BLOOM,0.9))
    cnt.links.new(rl.outputs["Image"],glare.inputs[0])
    cnt.links.new(glare.outputs[0],comp.inputs[0])
else:
    scn.use_nodes=False

n_mesh=len([o for o in scn.objects if o.type=='MESH'])
print("DBG cam",tuple(round(c,1) for c in cam.location),"tgt",tuple(round(c,1) for c in tgt),
      "meshes",n_mesh,"bbox z",round(zmin,1),round(zmax,1),"dimx",round(dimx,1),"dimy",round(dimy,1),flush=True)
scn.render.filepath=OUT
bpy.ops.render.render(write_still=True)
print("REFINE_DONE",OUT,"head_sign",head_sign,"tabby",TABBY,flush=True)
