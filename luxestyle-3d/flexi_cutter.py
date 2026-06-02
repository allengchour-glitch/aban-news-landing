# flexi_cutter.py - wiederverwendbaren Flexi-Gelenk-Cutter erzeugen (Blender, LuxeStyle)
# ---------------------------------------------------------------------------
# Baut EIN Cutter-Objekt (Rotationskoerper, garantiert wasserdicht). Ziehst du
# es per Boolean-DIFFERENZ von einem vollen Koerper ab, entsteht in EINEM Schnitt
# ein gefangenes Kugel-Pfannen-Gelenk: linke Haelfte traegt die Kugel, rechte
# Haelfte die Pfanne (Muendung < Kugel -> faellt nicht raus, dreht sich).
#
# Erzeugen:   OUT=cutter/flexi_cutter.stl NECK=1.7 BALL=3.0 CLEAR=0.5 GAP=1.2 DISC=11 \
#             blender --background --python flexi_cutter.py
#
# Anwenden (Bambu Studio / Cura / Blender):
#   1. Cutter importieren, an die gewuenschte Schnittstelle legen (X-Achse = Gelenkachse).
#   2. Boolean-DIFFERENZ: Koerper minus Cutter.
#   3. In Blender VOR dem Boolean Vertices verschweissen (Merge by Distance) -
#      STL-Import liefert "Dreieckssuppe"; Slicer verschweissen automatisch.
# Achse: die +X-Spitze ist die Pfannen-Seite, -X die Kugel-/Halsseite.
# Mass-Regel: Koerper an der Schnittstelle muss dicker als ~2*(BALL+CLEAR) sein
#   (sonst keine Pfannenwand). BALL=3 -> mind. ~9-10 mm Materialdicke.
# Geprueft: 14-mm-Balken -> 2 gefangene Teile, Querschnitt zeigt Kugel mit Spiel.
# ---------------------------------------------------------------------------
import bpy, bmesh, os, math
OUT=os.environ["OUT"]
rn=float(os.environ.get("NECK","1.7")); rb=float(os.environ.get("BALL","3.0"))
c=float(os.environ.get("CLEAR","0.5"));  g=float(os.environ.get("GAP","1.2"))
R=float(os.environ.get("DISC","11"));    N=int(os.environ.get("ARC","40"))
# Kugelmitte so, dass Hals-Kugel-Uebergang genau auf der +X-Spaltflaeche liegt
e=g/2+math.sqrt(rb*rb-rn*rn)

# Profil (x, r) als geschlossener Linienzug -> spaeter um X-Achse drehen
P=[]
P.append((-g/2, rn))                 # Hals an -X-Spaltflaeche
P.append(( g/2, rn))                 # Hals an +X-Spaltflaeche (= Kugelansatz)
for i in range(1,N+1):               # Kugel-Bogen (innen) bis zur Spitze
    x=g/2 + (e+rb - g/2)*i/N
    dr=rb*rb-(x-e)**2; r=math.sqrt(dr) if dr>0 else 0.0
    P.append((x,r))
P.append((e+rb+c, 0.0))               # Achsen-Spiel an der +X-Spitze
for i in range(1,N+1):                # Pfannen-Bogen (aussen) zurueck zur Muendung
    x=(e+rb+c) - ((e+rb+c)-g/2)*i/N
    dr=(rb+c)**2-(x-e)**2; r=math.sqrt(dr) if dr>0 else 0.0
    P.append((x,r))
P.append(( g/2, R))                   # +X-Spaltflaeche hoch bis Aussenrand
P.append((-g/2, R))                   # ueber den Aussenrand
# zurueck zu Start (-g/2, rn) schliesst die Schleife

bpy.ops.wm.read_factory_settings(use_empty=True)
me=bpy.data.meshes.new("prof"); ob=bpy.data.objects.new("prof",me)
bpy.context.collection.objects.link(ob)
bm=bmesh.new()
vs=[bm.verts.new((x,r,0.0)) for (x,r) in P]
for i in range(len(vs)): bm.edges.new((vs[i], vs[(i+1)%len(vs)]))
bm.to_mesh(me); bm.free()
bpy.context.view_layer.objects.active=ob; ob.select_set(True)
sc=ob.modifiers.new("screw","SCREW")
sc.axis='X'; sc.angle=2*math.pi; sc.steps=int(os.environ.get("STEPS","96"))
sc.use_merge_vertices=True; sc.merge_threshold=1e-4; sc.use_normal_flip=False
bpy.ops.object.modifier_apply(modifier=sc.name)
# verschweissen + Normalen
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=1e-4)
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
bm=bmesh.new(); bm.from_mesh(ob.data)
nm=sum(1 for ed in bm.edges if not ed.is_manifold); bm.free()
print("REV nonmanifold",nm,"verts",len(ob.data.vertices),"e",round(e,2))
try: bpy.ops.wm.stl_export(filepath=OUT)
except Exception: bpy.ops.export_mesh.stl(filepath=OUT)
print("REV_DONE",OUT)
