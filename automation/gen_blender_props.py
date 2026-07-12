import bpy, math, os

OUT = "/home/user/aban-news-landing/models"

def clear():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()

def mat(name, rgb, emit=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1)
    bsdf.inputs["Roughness"].default_value = 0.85
    if emit and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (rgb[0], rgb[1], rgb[2], 1)
        bsdf.inputs["Emission Strength"].default_value = emit
    return m

def setmat(obj, m):
    obj.data.materials.clear(); obj.data.materials.append(m)
    for p in obj.data.polygons: p.use_smooth = False

def cyl(r, d, loc, verts=8, m=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, location=loc, vertices=verts)
    o = bpy.context.object
    if m: setmat(o, m)
    return o

def cube(s, loc, m=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.scale = s
    if m: setmat(o, m)
    return o

def cone(r, d, loc, verts=8, m=None):
    bpy.ops.mesh.primitive_cone_add(radius1=r, depth=d, location=loc, vertices=verts)
    o = bpy.context.object
    if m: setmat(o, m)
    return o

def export(name):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name), export_format='GLB',
        use_selection=True, export_apply=True)

# ---------- 1) Windmühle ----------
clear()
stone = mat("stone", (0.62,0.64,0.70)); wood = mat("wood",(0.45,0.30,0.17))
red = mat("red",(0.72,0.20,0.18)); cloth = mat("cloth",(0.90,0.88,0.82))
cyl(1.6, 4.0, (0,0,2.0), 10, stone)                 # Turm
cyl(1.75,0.4,(0,0,4.0),10, wood)                    # Sims
cone(1.9, 1.6, (0,0,4.9), 10, red)                  # Dach
hub = cyl(0.25,0.6,(0,-1.7,3.6),8, wood); hub.rotation_euler=(math.pi/2,0,0)
for i in range(4):                                   # 4 Flügel
    a = i*math.pi/2
    bl = cube((0.12,2.4,0.6),(0,-1.95,3.6), cloth)
    bl.location = (math.sin(a)*1.4, -1.95, 3.6+math.cos(a)*1.4)
    bl.rotation_euler = (0, a, 0)
export("gen_windmill.glb")

# ---------- 2) Ziehbrunnen ----------
clear()
stone = mat("stone2",(0.60,0.62,0.68)); wood = mat("wood2",(0.42,0.28,0.16)); roof = mat("roof",(0.30,0.45,0.62))
cyl(1.1,1.0,(0,0,0.5),10, stone)                    # Brunnenring
cyl(0.95,0.9,(0,0,0.55),10, mat("water",(0.12,0.45,0.60),0.4))  # Wasser
for x in (-1.0,1.0):                                 # 2 Pfosten
    cube((0.16,0.16,2.2),(x,0,1.6), wood)
cube((2.4,0.5,0.16),(0,0,2.7), wood)                # Querbalken
r = cone(1.6,0.8,(0,0,3.1),4, roof); r.rotation_euler=(0,0,math.pi/4)  # Dachfirst
cube((0.5,0.5,0.4),(0,0,2.0), wood)                 # Eimer
export("gen_well.glb")

# ---------- 3) Marktstand ----------
clear()
wood = mat("wood3",(0.48,0.32,0.18)); counter = mat("counter",(0.55,0.38,0.22))
stripeA = mat("stripeA",(0.85,0.25,0.22)); stripeB = mat("stripeB",(0.92,0.90,0.85))
for x in (-1.3,1.3):
    for y in (-0.8,0.8):
        cube((0.14,0.14,2.0),(x,y,1.0), wood)       # 4 Pfosten
cube((3.0,1.8,0.35),(0,0,1.05), counter)            # Theke
# gestreiftes Dach (schräg)
for i in range(6):
    c = stripeA if i%2==0 else stripeB
    p = cube((0.52,2.1,0.08),(-1.3+i*0.52,0,2.2), c)
    p.rotation_euler=(0,-0.18,0)
cube((3.2,0.14,0.5),(0,-1.0,1.9), wood)             # Frontblende
export("gen_market.glb")

print("DONE_ALL")
