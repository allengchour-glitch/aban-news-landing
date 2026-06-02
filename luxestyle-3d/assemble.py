#!/usr/bin/env python3
"""LuxeStyle - assemble.py : Farb-Teile -> EINE fertige 3MF (Bambu-tauglich).

Nimmt das von colorize.py erzeugte `colored.obj` (eine Mesh, mehrere Material-
Regionen) ODER einen Ordner mit `color_<name>.stl` und schreibt EINE einzige
**3MF**-Datei, in der jede Farbe als Basis-Material hinterlegt und jedes Dreieck
seiner Farbe zugeordnet ist. Bambu Studio oeffnet das als ein Objekt und fragt
nur noch, welche Farbe auf welches Filament soll (Auto-Match). Kein Bemalen,
keine 4 Einzel-Importe mehr. Zusaetzlich: kombiniertes GLB + Vorschau-Render.

Aufruf:  blender --background --python assemble.py
Env:
  IN      = colored.obj  ODER  Ordner mit color_*.stl
  OUT     = Ziel .3mf
  PALETTE = optional JSON {"name":[r,g,b],...} (fuer STL-Ordner-Modus, sonst Default)
  GLB     = optional: zusaetzlich kombiniertes GLB hierhin
  PNG     = optional: Vorschau-Render hierhin
"""
import bpy, bmesh, os, json, zipfile
from mathutils import Vector

IN = os.environ["IN"]; OUT = os.environ["OUT"]
GLB = os.environ.get("GLB"); PNG = os.environ.get("PNG")
DEFAULT = {"weiss":[0.85,0.85,0.85],"schwarz":[0.04,0.04,0.04],"orange":[0.9,0.45,0.1],"rosa":[0.95,0.6,0.66]}
PAL = json.loads(os.environ["PALETTE"]) if os.environ.get("PALETTE") else DEFAULT

bpy.ops.wm.read_factory_settings(use_empty=True)

# --- Eingabe laden: ein OBJ mit Materialien, oder mehrere STL pro Farbe ---
if os.path.isdir(IN):
    objs=[]
    for fn in sorted(os.listdir(IN)):
        if not fn.lower().startswith("color_") or not fn.lower().endswith(".stl"): continue
        nm=fn[len("color_"):-4]
        try: bpy.ops.wm.stl_import(filepath=os.path.join(IN,fn))
        except Exception: bpy.ops.import_mesh.stl(filepath=os.path.join(IN,fn))
        ob=bpy.context.selected_objects[0] if bpy.context.selected_objects else bpy.context.active_object
        rgb=PAL.get(nm,[0.6,0.6,0.6])
        mat=bpy.data.materials.new(nm); mat.use_nodes=True
        mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value=(*rgb,1)
        mat.diffuse_color=(*rgb,1)
        ob.data.materials.clear(); ob.data.materials.append(mat)
        objs.append(ob)
    for x in bpy.context.scene.objects: x.select_set(x in objs)
    bpy.context.view_layer.objects.active=objs[0]
    bpy.ops.object.join()
    o=bpy.context.active_object
else:
    ext=IN.lower().rsplit(".",1)[-1]
    if ext=="obj":
        try: bpy.ops.wm.obj_import(filepath=IN)
        except Exception: bpy.ops.import_scene.obj(filepath=IN)
    elif ext in ("glb","gltf"): bpy.ops.import_scene.gltf(filepath=IN)
    else: raise SystemExit("IN: colored.obj, .glb oder Ordner mit color_*.stl")
    o=max([x for x in bpy.context.scene.objects if x.type=='MESH'], key=lambda m: sum(m.dimensions))

bpy.context.view_layer.objects.active=o
for x in bpy.context.scene.objects: x.select_set(x is o)
o.select_set(True)
bpy.ops.object.make_single_user(object=True, obdata=True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# --- Dreiecke erzwingen (3MF kennt nur Dreiecke) ---
me=o.data
bm=bmesh.new(); bm.from_mesh(me)
bmesh.ops.triangulate(bm, faces=bm.faces[:])
bm.to_mesh(me); bm.free()

# --- Material-Farben (sRGB hex) in Reihenfolge der Mesh-Materialien ---
def lin2srgb(c):
    return 12.92*c if c<=0.0031308 else 1.055*(c**(1/2.4))-0.055
def hexcol(m):
    c=m.diffuse_color if m else (0.6,0.6,0.6,1)
    r,g,b=(max(0,min(255,round(lin2srgb(x)*255))) for x in c[:3])
    return "#%02X%02X%02X"%(r,g,b)
mats=list(me.materials) or [None]
colors=[hexcol(m) for m in mats]

# --- 3MF-XML aufbauen ---
verts="".join('<vertex x="%.4f" y="%.4f" z="%.4f"/>'%(v.co.x,v.co.y,v.co.z) for v in me.vertices)
tris=[]
for p in me.polygons:
    a,b,c=p.vertices[0],p.vertices[1],p.vertices[2]
    pi=p.material_index if p.material_index<len(colors) else 0
    tris.append('<triangle v1="%d" v2="%d" v3="%d" pid="1" p1="%d"/>'%(a,b,c,pi))
tris="".join(tris)
base="".join('<base name="%s" displaycolor="%sFF"/>'%(
    (mats[i].name if mats[i] else "Teil%d"%i), colors[i]) for i in range(len(colors)))

model=(
'<?xml version="1.0" encoding="UTF-8"?>\n'
'<model unit="millimeter" xml:lang="en-US" '
'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n'
'<resources>\n'
'<basematerials id="1">%s</basematerials>\n'
'<object id="2" type="model" pid="1" pindex="0"><mesh>'
'<vertices>%s</vertices><triangles>%s</triangles>'
'</mesh></object>\n'
'</resources>\n'
'<build><item objectid="2"/></build>\n'
'</model>\n')%(base,verts,tris)

content_types=('<?xml version="1.0" encoding="UTF-8"?>\n'
'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
'<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>'
'</Types>')
rels=('<?xml version="1.0" encoding="UTF-8"?>\n'
'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
'<Relationship Target="/3D/3dmodel.model" Id="rel0" '
'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>'
'</Relationships>')

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
with zipfile.ZipFile(OUT,"w",zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml",content_types)
    z.writestr("_rels/.rels",rels)
    z.writestr("3D/3dmodel.model",model)
print("3MF_DONE", OUT, "verts", len(me.vertices), "tris", len(me.polygons), "colors", colors)

# --- optional: kombiniertes GLB ---
if GLB:
    bpy.ops.export_scene.gltf(filepath=GLB, export_format='GLB', use_selection=True)
    print("GLB", GLB)

# --- optional: Vorschau ---
if PNG:
    bpy.ops.object.shade_smooth()
    bb=[o.matrix_world@Vector(c) for c in o.bound_box]; miny=min(v.y for v in bb); maxz=max(v.z for v in bb); d=max(o.dimensions)
    tg=bpy.data.objects.new("t",None); bpy.context.collection.objects.link(tg); tg.location=Vector((0,0,maxz*0.4))
    bpy.ops.object.camera_add(location=(0,miny-d*1.3,maxz*0.5+d*0.8))
    cam=bpy.context.active_object; bpy.context.scene.camera=cam
    c=cam.constraints.new("TRACK_TO"); c.target=tg; c.track_axis="TRACK_NEGATIVE_Z"; c.up_axis="UP_Y"
    bpy.ops.object.light_add(type="SUN",location=(d,miny-d,d*2)); bpy.context.active_object.data.energy=3
    sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.device="CPU"; sc.cycles.samples=24
    sc.cycles.use_denoising=False; bpy.context.view_layer.cycles.use_denoising=False
    wd=bpy.data.worlds.new("w"); sc.world=wd; wd.use_nodes=True; wd.node_tree.nodes["Background"].inputs[0].default_value=(0.95,0.95,0.93,1)
    sc.render.resolution_x=900; sc.render.resolution_y=850; sc.render.filepath=PNG
    bpy.ops.render.render(write_still=True); print("PNG",PNG)
