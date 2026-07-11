# spiele-dev/blender_landscape_survivor.py — prozedurale Neon-Hintergrund-Landschaft für neon-survivor.html
# ----------------------------------------------------------------------------------------------------------
# Klon von blender_landscape.py (neon-realm), angepasst auf die Survivor-Masse:
#   Spielfeld ±46, Wände ±47, Skyline-Pylone bis r ~86  →  Ring beginnt bei r 96.
# Blender 4.0, headless:  blender -b -P spiele-dev/blender_landscape_survivor.py
# ⚠️ Der glTF-Exporter braucht numpy, das dem System-Blender fehlt. Einmalig:
#    python3.12 -m pip install --target /tmp/pymods numpy
#    PYTHONPATH=/tmp/pymods blender -b -P spiele-dev/blender_landscape_survivor.py
#
# Baut einen dekorativen RING um die Arena:
#   - Ring-Terrain (Annulus r 96..260) mit Noise-Hügeln, innen tief abgesenkt (Skirt).
#   - 13 markante Low-Poly-Berge (r ~120..190), TALL (h 40..95) — Survivor-Kamera schaut flacher
#     als neon-realm, darum höhere Gipfel. Tal Richtung Sonne (Norden = Spiel -Z = Blender +Y).
#   - ~16 Neon-Kristall-Spitzen (Cyan/Pink, emissiv) an den Bergflanken.
# 3 Materialien: rock (dunkles Violett/Blau) + crystal_cyan + crystal_pink — Survivor-Farbwelt
#   (Akzente 0x5ef2ff / 0xb98bff / 0xff7ad9) = identische Palette wie neon-realm.
# Export: models/landscape_survivor.glb  (plain GLB, KEIN Draco — three.js r128!)
# Ziel: < 400 KB, < 15k Tris. Einheiten = Spieleinheiten, Ursprung = Weltmitte, Y-up im GLB.
import bpy, bmesh, math, random, os, sys
from mathutils import Vector, Matrix, Euler, noise

random.seed(4611)
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "landscape_survivor.glb")

# ---------- leere Szene ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

# ---------- Materialien ----------
def mk_mat(name, base, emis, strength=1.0, rough=0.85):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = 0.0
    for key in ("Emission Color", "Emission"):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = (*emis, 1.0)
            break
    if "Emission Strength" in bsdf.inputs:
        # Strength <= 1 lassen: sonst schreibt der Exporter KHR_materials_emissive_strength,
        # das three.js r128 nicht kennt. Intensität wird im Spiel via emissiveIntensity geboostet.
        bsdf.inputs["Emission Strength"].default_value = strength
    return m

M_ROCK = mk_mat("rock",         (0.045, 0.055, 0.170), (0.075, 0.095, 0.300))
M_CYAN = mk_mat("crystal_cyan", (0.020, 0.090, 0.130), (0.370, 0.950, 1.000), rough=0.4)
M_PINK = mk_mat("crystal_pink", (0.120, 0.020, 0.090), (1.000, 0.430, 0.780), rough=0.4)

def obj_from_bm(bm, name, material):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(material)
    scn.collection.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = False  # Flat-Shading = Low-Poly-Look
    return ob

# ---------- Ring-Terrain ----------
R0, R1 = 96.0, 260.0      # innen knapp hinter den Pylonen (r ~86), aussen weit im Nebel
NR, NA = 12, 128          # radiale / angulare Segmente

def ring_h(x, y, t):
    """Höhe des Ring-Terrains. t = 0..1 (innen..aussen)."""
    n1 = noise.noise(Vector((x * 0.016, y * 0.016, 3.7)))
    n2 = noise.noise(Vector((x * 0.05,  y * 0.05,  9.1)))
    h = -3.0 * (1.0 - t) + t * 14.0 + (n1 * 8.0 + n2 * 3.0) * (0.25 + t)
    if t < 0.10:  # Skirt: Innenkante tief unter die Arena-Kante ziehen
        h = -3.0 + (h + 3.0) * (t / 0.10)
    return h

bm = bmesh.new()
grid = {}
for i in range(NR + 1):
    t = i / NR
    r = R0 + (R1 - R0) * t
    for j in range(NA):
        a = 2.0 * math.pi * j / NA
        x, y = r * math.cos(a), r * math.sin(a)
        grid[(i, j)] = bm.verts.new((x, y, ring_h(x, y, t)))
for i in range(NR):
    for j in range(NA):
        bm.faces.new((grid[(i, j)], grid[(i + 1, j)],
                      grid[(i + 1, (j + 1) % NA)], grid[(i, (j + 1) % NA)]))

# ---------- Berge (Low-Poly-Kegel mit Vertex-Jitter, ins selbe Rock-Mesh) ----------
# Survivor-Kamera (y=19, Blick flach nach Norden) → hohe Gipfel; Tal Richtung Sonne.
# Sonne steht im Spiel bei z=-430 (Norden). glTF-Export: game_z = -blender_y →
# Norden = Blender +Y = Winkel um +π/2 → dort Gipfel absenken (Sonne bleibt frei).
N_MTN = 13
mtn_spots = []
for k in range(N_MTN):
    a = (k + 0.5) / N_MTN * 2.0 * math.pi + random.uniform(-0.16, 0.16)
    r = random.uniform(120.0, 190.0)
    x, y = r * math.cos(a), r * math.sin(a)
    base_r = random.uniform(16.0, 30.0)
    height = random.uniform(40.0, 95.0)
    if math.sin(a) > 0.78:          # Tal Richtung Sonne (Norden)
        height *= 0.32
    ground = ring_h(x, y, (r - R0) / (R1 - R0))
    mtx = Matrix.Translation((x, y, ground - 4.0 + height / 2.0))
    ret = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True,
                                segments=random.randint(6, 8),
                                radius1=base_r, radius2=base_r * 0.06,
                                depth=height, matrix=mtx)
    for v in ret["verts"]:  # Jitter für unregelmässige Silhouette
        if v.co.z < ground + height * 0.9:  # Spitze halbwegs spitz lassen
            v.co.x += random.uniform(-1, 1) * base_r * 0.16
            v.co.y += random.uniform(-1, 1) * base_r * 0.16
            v.co.z += random.uniform(-1, 1) * height * 0.05
    mtn_spots.append((x, y, base_r, ground))

rock_ob = obj_from_bm(bm, "rock", M_ROCK)

# ---------- Kristall-Spitzen (Cyan + Pink, geneigt, teils Cluster) ----------
def add_crystal(bm, x, y, ground, radius, height, tilt, rotz):
    mtx = (Matrix.Translation((x, y, ground - 1.5)) @
           Euler((tilt[0], tilt[1], rotz)).to_matrix().to_4x4() @
           Matrix.Translation((0, 0, height / 2.0)))
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=5,
                          radius1=radius, radius2=radius * 0.08,
                          depth=height, matrix=mtx)

bm_cy, bm_pk = bmesh.new(), bmesh.new()
for k in range(16):
    target = random.choice(mtn_spots) if random.random() < 0.7 else None
    if target:  # an Bergflanke
        mx, my, mr, mg = target
        aa = random.uniform(0, 2 * math.pi)
        d = mr * random.uniform(0.55, 1.15)
        x, y = mx + math.cos(aa) * d, my + math.sin(aa) * d
    else:       # frei auf dem Ring
        aa = random.uniform(0, 2 * math.pi)
        rr = random.uniform(106.0, 175.0)
        x, y = rr * math.cos(aa), rr * math.sin(aa)
    rad = Vector((x, y)).length
    rad = max(R0 + 4, min(R1 - 6, rad))
    x, y = x / Vector((x, y)).length * rad, y / Vector((x, y)).length * rad
    ground = ring_h(x, y, (rad - R0) / (R1 - R0))
    tgt = bm_cy if k % 2 == 0 else bm_pk
    big_r, big_h = random.uniform(2.4, 5.0), random.uniform(12.0, 28.0)
    tilt = (random.uniform(-0.26, 0.26), random.uniform(-0.26, 0.26))
    add_crystal(tgt, x, y, ground, big_r, big_h, tilt, random.uniform(0, 6.28))
    for c in range(random.randint(1, 2)):  # kleine Begleit-Shards
        ox, oy = random.uniform(-5, 5), random.uniform(-5, 5)
        add_crystal(tgt, x + ox, y + oy, ring_h(x + ox, y + oy, (rad - R0) / (R1 - R0)),
                    big_r * random.uniform(0.35, 0.55), big_h * random.uniform(0.3, 0.5),
                    (random.uniform(-0.4, 0.4), random.uniform(-0.4, 0.4)), random.uniform(0, 6.28))

obj_from_bm(bm_cy, "crystal_cyan", M_CYAN)
obj_from_bm(bm_pk, "crystal_pink", M_PINK)

# ---------- Statistik + Budget-Check ----------
total_tris = 0
for ob in scn.collection.objects:
    if ob.type == "MESH":
        ob.data.calc_loop_triangles()
        total_tris += len(ob.data.loop_triangles)
print(f"[landscape_survivor] Tris gesamt: {total_tris}")

# ---------- Export ----------
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=True,
                          export_yup=True, export_animations=False)
size = os.path.getsize(OUT)
print(f"[landscape_survivor] exportiert: {OUT} ({size/1024:.0f} KB)")
if size > 400 * 1024:
    print("⚠️ GLB grösser als 400 KB Budget!")
    sys.exit(1)
