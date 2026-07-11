# spiele-dev/blender_landscape_flug.py — prozedurale Neon-Horizont-Landschaft für neon-flug.html
# ------------------------------------------------------------------------------------------------
# Blender 4.0, headless:  blender -b -P spiele-dev/blender_landscape_flug.py
# ⚠️ Der glTF-Exporter braucht numpy, das dem System-Blender fehlt. Einmalig:
#    python3.12 -m pip install --target /tmp/pymods numpy
#    PYTHONPATH=/tmp/pymods blender -b -P spiele-dev/blender_landscape_flug.py
#
# neon-flug ist ein Endlos-Flieger: die Welt scrollt zur Kamera (Schiff bei z≈0, Spur x ±9.6).
# Statt Ring (neon-realm) baut dieses Skript einen KORRIDOR:
#   - "corr_*"  : 1 kachelbares Korridor-Segment (Länge SEG=360 entlang Blender-Y = Spiel-Z):
#                 zwei seitliche Bergketten (|x| 24..112, z-periodisches Noise → nahtloses Tiling),
#                 14 markante Low-Poly-Berge + Neon-Kristalle (Cyan/Pink) an den Flanken.
#                 Im Spiel: 2 Instanzen, Parallax-Scroll + Wrap (z += speed*0.3, > 240 → -720).
#   - "back_*"  : statische Horizont-Wand (2 Reihen grosse Peaks, x -175..175) + Violett-Kristalle.
#                 Im Spiel fix bei z=-262 (Fog dazu auf 55..330 erweitert, Kamera far 460).
# Materialien: rock (dunkles Indigo) + crystal_cyan/pink/violet (Spiel boostet emissiveIntensity;
# Namen enthalten "crystal", daran erkennt der Loader die Glow-Meshes).
# Export: models/landscape_flug.glb (plain GLB, KEIN Draco — three.js r128!)
# Ziel: < 400 KB, < 10k Tris. Einheiten = Spieleinheiten, Ursprung = Segmentmitte, Y-up im GLB.
import bpy, bmesh, math, random, os, sys
from mathutils import Vector, Matrix, Euler, noise

random.seed(7031)
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "landscape_flug.glb")
SEG = 360.0  # Kachel-Länge entlang der Flugachse (Blender-Y)

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
        # <=1 lassen, sonst KHR_materials_emissive_strength (kennt r128 nicht);
        # Glow wird im Spiel via emissiveIntensity geboostet.
        bsdf.inputs["Emission Strength"].default_value = strength
    return m

# Farbwelt = neon-flug-Palette: Cyan #5ef2ff, Violett #b98bff, Pink #ff7ad9 auf Indigo-Fels
M_ROCK = mk_mat("rock",           (0.040, 0.050, 0.160), (0.060, 0.085, 0.280))
M_CYAN = mk_mat("crystal_cyan",   (0.020, 0.090, 0.130), (0.370, 0.950, 1.000), rough=0.4)
M_PINK = mk_mat("crystal_pink",   (0.120, 0.020, 0.090), (1.000, 0.480, 0.850), rough=0.4)
M_VIO  = mk_mat("crystal_violet", (0.070, 0.040, 0.130), (0.730, 0.550, 1.000), rough=0.4)

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

# ---------- z-periodisches Noise (nahtloses Tiling entlang der Flugachse) ----------
def per_noise(x, y, seed=0.0):
    a = 2.0 * math.pi * y / SEG
    return noise.noise(Vector((x * 0.022 + seed, math.cos(a) * 2.3, math.sin(a) * 2.3)))

# ---------- Korridor: seitliche Bergketten-Strips (beidseitig, kachelbar) ----------
X0, X1 = 24.0, 112.0   # ausserhalb der Neon-Wände (±9.6), bis weit in den Nebel
NX, NY = 7, 44

def strip_h(ax, y, side):
    """Höhe der Seitenkette. ax = |x|, steigt von der Spur weg an."""
    t = (ax - X0) / (X1 - X0)
    h = (-3.0 + t * 13.0 +
         (per_noise(ax, y, seed=side * 7.3) * 7.5 +
          per_noise(ax * 2.6, y, seed=side * 3.1 + 41.0) * 2.6) * (0.3 + t))
    if t < 0.08:  # Skirt: Innenkante unter den Spielboden ziehen
        h = -4.5 + (h + 4.5) * (t / 0.08)
    return h

bm = bmesh.new()
for side in (-1, 1):
    grid = {}
    for i in range(NX + 1):
        x = (X0 + (X1 - X0) * i / NX) * side
        for j in range(NY + 1):
            y = -SEG / 2 + SEG * j / NY
            hy = y if j < NY else -SEG / 2  # letzter Ring = erster (exaktes Tiling)
            grid[(i, j)] = bm.verts.new((x, y, strip_h(abs(x), hy, side)))
    for i in range(NX):
        for j in range(NY):
            q = (grid[(i, j)], grid[(i + 1, j)], grid[(i + 1, j + 1)], grid[(i, j + 1)])
            bm.faces.new(q if side > 0 else tuple(reversed(q)))

# ---------- Korridor-Berge (Low-Poly-Kegel, Seam-sicher: |y|+r < 180) ----------
mtn_spots = []
for k in range(14):
    side = -1 if k % 2 == 0 else 1
    x = side * random.uniform(38.0, 96.0)
    y = -150.0 + (k // 2) * (300.0 / 6.0) + random.uniform(-16.0, 16.0)
    base_r = random.uniform(14.0, 26.0)
    height = random.uniform(22.0, 55.0)
    ground = strip_h(abs(x), y, side)
    mtx = Matrix.Translation((x, y, ground - 3.0 + height / 2.0))
    ret = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True,
                                segments=random.randint(6, 8),
                                radius1=base_r, radius2=base_r * 0.06,
                                depth=height, matrix=mtx)
    for v in ret["verts"]:  # Jitter für unregelmässige Silhouette
        if v.co.z < ground + height * 0.9:
            v.co.x += random.uniform(-1, 1) * base_r * 0.16
            v.co.y += random.uniform(-1, 1) * base_r * 0.16
            v.co.z += random.uniform(-1, 1) * height * 0.05
    mtn_spots.append((x, y, base_r, ground))

obj_from_bm(bm, "corr_rock", M_ROCK)

# ---------- Kristall-Helfer ----------
def add_crystal(bm, x, y, ground, radius, height, tilt, rotz):
    mtx = (Matrix.Translation((x, y, ground - 1.5)) @
           Euler((tilt[0], tilt[1], rotz)).to_matrix().to_4x4() @
           Matrix.Translation((0, 0, height / 2.0)))
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=5,
                          radius1=radius, radius2=radius * 0.08,
                          depth=height, matrix=mtx)

# ---------- Korridor-Kristalle (Cyan + Pink an den Bergflanken) ----------
bm_cy, bm_pk = bmesh.new(), bmesh.new()
for k in range(12):
    mx, my, mr, mg = random.choice(mtn_spots)
    aa = random.uniform(0, 2 * math.pi)
    d = mr * random.uniform(0.5, 1.1)
    x, y = mx + math.cos(aa) * d, my + math.sin(aa) * d
    x = math.copysign(max(X0 + 4, min(X1 - 4, abs(x))), x)
    y = max(-168.0, min(168.0, y))
    ground = strip_h(abs(x), y, 1 if x > 0 else -1)
    tgt = bm_cy if k % 2 == 0 else bm_pk
    big_r, big_h = random.uniform(2.4, 5.0), random.uniform(11.0, 26.0)
    add_crystal(tgt, x, y, ground, big_r, big_h,
                (random.uniform(-0.26, 0.26), random.uniform(-0.26, 0.26)), random.uniform(0, 6.28))
    if random.random() < 0.7:  # Begleit-Shard
        ox, oy = random.uniform(-5, 5), random.uniform(-5, 5)
        add_crystal(tgt, x + ox, max(-168.0, min(168.0, y + oy)),
                    strip_h(abs(x + ox), y + oy, 1 if x > 0 else -1),
                    big_r * random.uniform(0.35, 0.55), big_h * random.uniform(0.3, 0.5),
                    (random.uniform(-0.4, 0.4), random.uniform(-0.4, 0.4)), random.uniform(0, 6.28))

obj_from_bm(bm_cy, "corr_crystal_cyan", M_CYAN)
obj_from_bm(bm_pk, "corr_crystal_pink", M_PINK)

# ---------- Horizont-Wand (statisch, im Spiel bei z=-262): 2 Peak-Reihen ----------
bm_bk = bmesh.new()
back_spots = []
for row, (yy, n, hmin, hmax) in enumerate(((0.0, 13, 34.0, 70.0), (16.0, 9, 55.0, 95.0))):
    for k in range(n):
        x = -170.0 + 340.0 * (k + 0.5) / n + random.uniform(-8.0, 8.0)
        base_r = random.uniform(16.0, 30.0)
        height = random.uniform(hmin, hmax)
        mtx = Matrix.Translation((x, yy + random.uniform(-4, 4), -4.0 + height / 2.0))
        ret = bmesh.ops.create_cone(bm_bk, cap_ends=True, cap_tris=True,
                                    segments=random.randint(6, 8),
                                    radius1=base_r, radius2=base_r * 0.05,
                                    depth=height, matrix=mtx)
        for v in ret["verts"]:
            if v.co.z < height * 0.85:
                v.co.x += random.uniform(-1, 1) * base_r * 0.15
                v.co.y += random.uniform(-1, 1) * base_r * 0.15
        if row == 0:
            back_spots.append((x, yy, base_r))
obj_from_bm(bm_bk, "back_rock", M_ROCK)

# ---------- Horizont-Kristalle (Violett + Cyan, gross — Blickfang in der Mitte) ----------
bm_bv, bm_bc = bmesh.new(), bmesh.new()
for k in range(7):
    mx, my, mr = random.choice(back_spots)
    x = mx + random.uniform(-1.0, 1.0) * mr * 0.9
    y = my - random.uniform(2.0, 10.0)  # vor den Peaks
    tgt = bm_bv if k % 2 == 0 else bm_bc
    add_crystal(tgt, x, y, -2.0, random.uniform(4.0, 7.0), random.uniform(22.0, 44.0),
                (random.uniform(-0.2, 0.2), random.uniform(-0.2, 0.2)), random.uniform(0, 6.28))
obj_from_bm(bm_bv, "back_crystal_violet", M_VIO)
obj_from_bm(bm_bc, "back_crystal_cyan", M_CYAN)

# ---------- Statistik + Budget-Check ----------
total_tris = 0
for ob in scn.collection.objects:
    if ob.type == "MESH":
        tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
        total_tris += tris
        print("MESH %-20s  polys=%5d  tris=%5d" % (ob.name, len(ob.data.polygons), tris))
print("TOTAL TRIS:", total_tris)
if total_tris > 10000:
    for ob in scn.collection.objects:
        if ob.type == "MESH":
            mod = ob.modifiers.new("dec", "DECIMATE")
            mod.ratio = 9000.0 / total_tris
    print("DECIMATE angewendet")

# ---------- Export (plain GLB, kein Draco!) ----------
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=True)
sz = os.path.getsize(OUT)
print("EXPORT OK:", OUT, "%.1f KB" % (sz / 1024.0))
if sz > 400 * 1024:
    print("WARNUNG: GLB > 400 KB!")
    sys.exit(1)
