# spiele-dev/blender_nature.py — Low-Poly-Natur-Pack (Neon-Fantasy) für neon-realm.html
# ------------------------------------------------------------------------------------
# Blender 4.0, headless:  blender -b -P spiele-dev/blender_nature.py
# ⚠️ Der glTF-Exporter braucht numpy, das dem System-Blender fehlt. Einmalig:
#    python3.12 -m pip install --target /tmp/pymods numpy
#    PYTHONPATH=/tmp/pymods blender -b -P spiele-dev/blender_nature.py
#
# Baut 10 einzelne, benannte Assets (Ursprung jeweils am Boden, z=0; Einheiten ≈ Meter):
#   tree_leafy  (~5.6 m)  Laubbaum, gekrümmter Stamm + 2 Astansätze + 6-teilige Icosphere-Krone
#   tree_birch  (~6.6 m)  schlanke Neon-Birke, heller Stamm mit dunklen Bändern, sparse Krone
#   tree_willow (~4.7 m)  Trauerweide, Dom-Krone + 10 hängende Strähnen mit Pink-Glow-Spitzen
#   tree_glow   (~4.4 m)  Glow-Baum, 5 Äste mit emissiven Cyan/Pink-Orbs
#   bush_a      (~1.1 m)  Teal-Busch (3 Kugel-Cluster)
#   bush_b      (~0.9 m)  Violett-Busch, flacher, + 2 Cyan-Glow-Beeren
#   grass_tuft  (~0.5 m)  7 gefächerte Halme (zweifarbig, doppelseitig)
#   flower_cyan / flower_pink / flower_gold (~0.4 m)  Stiel + emissive Blüte
#
# Materialien (4, geteilt — wichtig für Draw-Calls):
#   nature_lit  — EIN Lit-Material mit Vertex-Colors (COLOR_0) für ALLE nicht-emissiven Teile
#                 (Stämme, Blattwerk, Gras, Stiele) → 1 Draw-Call pro InstancedMesh.
#   glow_cyan / glow_pink / glow_gold — emissive Akzente (Strength ≤ 1: sonst schreibt der
#                 Exporter KHR_materials_emissive_strength, das three.js r128 nicht kennt.
#                 Intensität im Spiel via material.emissiveIntensity boosten.)
# Export: models/nature_pack.glb (plain GLB, KEIN Draco — three.js r128!)  Ziel < 500 KB.
import bpy, bmesh, math, random, os
from mathutils import Vector, Matrix

random.seed(1707)
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "nature_pack.glb")

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

# ---------- Materialien ----------
def mk_mat(name, base, emis=(0, 0, 0), strength=0.0, rough=0.9, vcol=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = 0.0
    for key in ("Emission Color", "Emission"):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = (*emis, 1.0)
            break
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = strength  # ≤ 1.0 lassen! (r128)
    if vcol:
        vc = nt.nodes.new("ShaderNodeVertexColor")
        vc.layer_name = "Col"
        nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    return m

M_LIT  = mk_mat("nature_lit", (1, 1, 1), emis=(0.05, 0.06, 0.16), strength=0.30, vcol=True)
M_CYAN = mk_mat("glow_cyan", (0.02, 0.09, 0.13), (0.35, 0.95, 1.00), 1.0, rough=0.4)
M_PINK = mk_mat("glow_pink", (0.13, 0.02, 0.09), (1.00, 0.40, 0.75), 1.0, rough=0.4)
M_GOLD = mk_mat("glow_gold", (0.13, 0.09, 0.02), (1.00, 0.80, 0.30), 1.0, rough=0.4)
MATS = {"lit": M_LIT, "cyan": M_CYAN, "pink": M_PINK, "gold": M_GOLD}

# ---------- Farbwelt (linear RGB; gedämpfte Neon-Dämmerungs-Töne) ----------
C_BARK       = (0.070, 0.050, 0.110)   # dunkles Violett-Braun
C_BARK_LITE  = (0.100, 0.075, 0.150)
C_BIRCH      = (0.720, 0.700, 0.860)   # heller Birkenstamm
C_BIRCH_BAND = (0.100, 0.070, 0.160)   # dunkle Bänder
C_TEAL       = (0.075, 0.260, 0.190)   # Laub Teal dunkel
C_TEAL_LITE  = (0.115, 0.360, 0.240)
C_VIOLET     = (0.150, 0.110, 0.330)   # Laub Blauviolett
C_VIOLET_LITE= (0.220, 0.165, 0.430)
C_WILLOW     = (0.095, 0.280, 0.290)   # Strähnen Cyan-Grün
C_GRASS_LO   = (0.060, 0.190, 0.150)
C_GRASS_HI   = (0.160, 0.420, 0.290)
C_STEM       = (0.090, 0.240, 0.180)

# ---------- Part-Tagging: jedes Face bekommt (mat_key, tint) ----------
class Builder:
    def __init__(self):
        self.bm = bmesh.new()
        self.tags = []          # Registry: id -> (mat_key, tint)
        self.face_tag = {}      # face -> tag id (über Faceliste in Erzeugungsreihenfolge)

    def tag(self, mat_key, tint=(1, 1, 1)):
        self.tags.append((mat_key, tint))
        return len(self.tags) - 1

    def _claim(self, faces, tid):
        for f in faces:
            self.face_tag[f] = tid

    # gebogenes, verjüngtes Glied (Stamm/Ast): quadratische Bezier p0..p2 mit Bauch `bulge`
    def limb(self, tid, p0, p2, bulge, r0, r1, sides=6, segs=4, jitter=0.10,
             band_tid=None, band_prob=0.0, rng=None):
        rng = rng or random
        p0, p2, bulge = Vector(p0), Vector(p2), Vector(bulge)
        p1 = (p0 + p2) * 0.5 + bulge
        bez = lambda t: p0 * (1 - t) ** 2 + p1 * 2 * t * (1 - t) + p2 * t * t
        rings = []
        for i in range(segs + 1):
            t = i / segs
            c = bez(t)
            d = (bez(min(t + 0.01, 1)) - bez(max(t - 0.01, 0))).normalized()
            u = d.cross(Vector((0, 0, 1)))
            if u.length < 1e-4:
                u = d.cross(Vector((1, 0, 0)))
            u.normalize()
            v = d.cross(u).normalized()
            r = (r0 + (r1 - r0) * t ** 0.85) * (1.0 + rng.uniform(-jitter, jitter) * 0.5)
            ring = []
            for j in range(sides):
                a = 2 * math.pi * j / sides + rng.uniform(-0.06, 0.06)
                ring.append(self.bm.verts.new(c + (u * math.cos(a) + v * math.sin(a)) * r))
            rings.append(ring)
        for i in range(segs):
            band = band_tid is not None and rng.random() < band_prob
            for j in range(sides):
                f = self.bm.faces.new((rings[i][j], rings[i][(j + 1) % sides],
                                       rings[i + 1][(j + 1) % sides], rings[i + 1][j]))
                self.face_tag[f] = band_tid if band else tid
        top = self.bm.verts.new(bez(1.0))
        for j in range(sides):
            f = self.bm.faces.new((rings[-1][j], rings[-1][(j + 1) % sides], top))
            self.face_tag[f] = tid
        tip_dir = (bez(1.0) - bez(0.9)).normalized()
        return Vector(bez(1.0)), tip_dir

    # unregelmässiger Icosphere-Klumpen (Kronen/Büsche)
    def blob(self, tid, loc, scale, subdiv=2, jitter=0.14, rng=None):
        # subdiv=2 → 80 Tris (subdiv=1 wäre der blosse 20-Tri-Ikosaeder — zu grob)
        rng = rng or random
        before = set(self.bm.faces)
        ret = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=1.0)
        for v in ret["verts"]:
            n = v.co.normalized()
            v.co += n * rng.uniform(-jitter, jitter)
            v.co = Vector(loc) + Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
        self._claim([f for f in self.bm.faces if f not in before], tid)

    # Band/Halm/Blütenblatt: Mittellinie pts + Breitenliste (0 = Spitze)
    def ribbon(self, tid, pts, widths, tip_tid=None, tip_from=999):
        pts = [Vector(p) for p in pts]
        rings = []
        for i, p in enumerate(pts):
            d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            side = d.cross(Vector((0, 0, 1)))
            if side.length < 1e-4:
                side = Vector((1, 0, 0))
            w = widths[i]
            if w <= 1e-5:
                rings.append((self.bm.verts.new(p),))
            else:
                s = side.normalized() * (w * 0.5)
                rings.append((self.bm.verts.new(p - s), self.bm.verts.new(p + s)))
        for i in range(len(rings) - 1):
            a, b = rings[i], rings[i + 1]
            if len(a) == 1 and len(b) == 1:
                continue
            if len(a) == 1:
                f = self.bm.faces.new((a[0], b[1], b[0]))
            elif len(b) == 1:
                f = self.bm.faces.new((a[0], a[1], b[0]))
            else:
                f = self.bm.faces.new((a[0], a[1], b[1], b[0]))
            self.face_tag[f] = tip_tid if (tip_tid is not None and i >= tip_from) else tid

    # kleiner Oktaeder (Glow-Beeren/Blütenmitte), 8 Tris
    def octa(self, tid, loc, r):
        L = Vector(loc)
        vs = [self.bm.verts.new(L + Vector(o) * r) for o in
              ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1))]
        idx = ((0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4), (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5))
        for i in idx:
            f = self.bm.faces.new((vs[i[0]], vs[i[1]], vs[i[2]]))
            self.face_tag[f] = tid

    # Objekt erzeugen: Materialslots + Vertex-Colors aus den Tags
    def finish(self, name):
        bm = self.bm
        order = list(bm.faces)                      # Reihenfolge bleibt in to_mesh erhalten
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        used_keys = []
        for f in order:
            k = self.tags[self.face_tag[f]][0]
            if k not in used_keys:
                used_keys.append(k)
        for k in used_keys:
            me.materials.append(MATS[k])
        col = me.color_attributes.new(name="Col", type='BYTE_COLOR', domain='CORNER')
        for pi, poly in enumerate(me.polygons):
            mat_key, tint = self.tags[self.face_tag[order[pi]]]
            poly.material_index = used_keys.index(mat_key)
            poly.use_smooth = False                 # Flat-Shading = Low-Poly-Look
            for li in poly.loop_indices:
                col.data[li].color = (*tint, 1.0)
        ob = bpy.data.objects.new(name, me)
        scn.collection.objects.link(ob)
        tris = sum(len(p.vertices) - 2 for p in me.polygons)
        print(f"  {name:12s} tris={tris:4d} mats={used_keys}")
        return ob

def vary(c, rng, amt=0.18):
    f = 1.0 + rng.uniform(-amt, amt)
    return (min(c[0] * f, 1), min(c[1] * f, 1), min(c[2] * f, 1))

print("== nature_pack: baue Assets ==")

# ---------- tree_leafy: Laubbaum mit mehrlagiger, unregelmässiger Krone ----------
rng = random.Random(11)
b = Builder()
t_bark = b.tag("lit", C_BARK)
tip, _ = b.limb(t_bark, (0, 0, 0), (0.32, 0.10, 2.9), (0.18, -0.10, 0), 0.24, 0.11, sides=6, segs=4, rng=rng)
# 2 Astansätze aus dem oberen Stammdrittel in die Krone
b.limb(t_bark, (0.12, 0.02, 1.9), (1.05, 0.45, 3.1), (0.15, 0.25, -0.1), 0.09, 0.03, sides=5, segs=2, rng=rng)
b.limb(t_bark, (0.05, 0.00, 2.2), (-0.85, -0.55, 3.4), (-0.2, -0.1, 0), 0.08, 0.03, sides=5, segs=2, rng=rng)
# Krone: 6 Icosphere-Klumpen, 2 Teal-Töne, unregelmässig versetzt
crown = [((0.30, 0.05, 4.15), (1.30, 1.25, 1.00)),
         ((1.05, 0.45, 3.55), (0.85, 0.80, 0.70)),
         ((-0.75, -0.50, 3.70), (0.90, 0.85, 0.75)),
         ((-0.35, 0.70, 3.95), (0.75, 0.80, 0.65)),
         ((0.55, -0.70, 3.85), (0.70, 0.70, 0.60)),
         ((0.15, 0.10, 4.95), (0.70, 0.65, 0.55))]
for i, (loc, sc) in enumerate(crown):
    base = C_TEAL_LITE if i % 2 else C_TEAL
    b.blob(b.tag("lit", vary(base, rng)), loc, sc, rng=rng)
b.finish("tree_leafy")

# ---------- tree_birch: hohe schlanke Neon-Birke, heller Stamm mit Bändern ----------
rng = random.Random(23)
b = Builder()
t_stem = b.tag("lit", C_BIRCH)
t_band = b.tag("lit", C_BIRCH_BAND)
b.limb(t_stem, (0, 0, 0), (0.22, -0.12, 4.9), (-0.14, 0.10, 0), 0.14, 0.05,
       sides=6, segs=6, band_tid=t_band, band_prob=0.28, rng=rng)
t_twig = b.tag("lit", C_BARK_LITE)
b.limb(t_twig, (0.10, -0.04, 3.2), (0.95, 0.40, 4.6), (0.1, 0.15, 0), 0.045, 0.015, sides=4, segs=2, rng=rng)
b.limb(t_twig, (0.14, -0.07, 3.9), (-0.70, -0.45, 5.2), (-0.15, -0.1, 0), 0.04, 0.015, sides=4, segs=2, rng=rng)
crown = [((0.25, -0.10, 5.55), (0.80, 0.75, 0.68)),
         ((0.90, 0.35, 4.75), (0.55, 0.55, 0.45)),
         ((-0.60, -0.40, 5.25), (0.60, 0.55, 0.50)),
         ((0.05, 0.15, 6.15), (0.50, 0.48, 0.42))]
for i, (loc, sc) in enumerate(crown):
    base = C_VIOLET_LITE if i % 2 else C_VIOLET
    b.blob(b.tag("lit", vary(base, rng)), loc, sc, rng=rng)
b.finish("tree_birch")

# ---------- tree_willow: Trauerweide mit hängenden Glow-Strähnen ----------
rng = random.Random(37)
b = Builder()
t_bark = b.tag("lit", C_BARK)
b.limb(t_bark, (0, 0, 0), (0.45, 0.15, 2.4), (0.30, 0.05, 0), 0.21, 0.10, sides=6, segs=4, rng=rng)
b.blob(b.tag("lit", C_VIOLET), (0.45, 0.15, 3.15), (1.55, 1.50, 0.95), rng=rng)
b.blob(b.tag("lit", vary(C_VIOLET_LITE, rng)), (0.05, -0.35, 3.55), (0.85, 0.80, 0.60), rng=rng)
t_str = b.tag("lit", C_WILLOW)
t_tip = b.tag("pink")
for k in range(10):
    a = 2 * math.pi * k / 10 + rng.uniform(-0.2, 0.2)
    R = rng.uniform(1.15, 1.55)
    cx, cy = 0.45 + math.cos(a) * R, 0.15 + math.sin(a) * R
    z0 = rng.uniform(2.75, 3.15)
    z1 = rng.uniform(0.45, 0.95)
    sway = rng.uniform(0.10, 0.30)
    pts = [(0.45 + math.cos(a) * R * 0.75, 0.15 + math.sin(a) * R * 0.75, z0),
           (cx, cy, z0 - (z0 - z1) * 0.30),
           (cx + math.cos(a) * sway, cy + math.sin(a) * sway, z0 - (z0 - z1) * 0.70),
           (cx + math.cos(a) * sway * 1.4, cy + math.sin(a) * sway * 1.4, z1)]
    b.ribbon(t_str, pts, [0.13, 0.11, 0.08, 0.04], tip_tid=t_tip, tip_from=2)
b.finish("tree_willow")

# ---------- tree_glow: Kristall-Baum, Äste mit emissiven Orbs ----------
rng = random.Random(41)
b = Builder()
t_bark = b.tag("lit", C_BARK_LITE)
b.limb(t_bark, (0, 0, 0), (0.05, 0.05, 1.6), (0.10, -0.06, 0), 0.20, 0.12, sides=6, segs=3, rng=rng)
t_orbC = b.tag("cyan")
t_orbP = b.tag("pink")
for k in range(5):
    a = 2 * math.pi * k / 5 + rng.uniform(-0.25, 0.25)
    sp = rng.uniform(0.9, 1.5)
    h = rng.uniform(2.9, 3.9)
    p2 = (math.cos(a) * sp, math.sin(a) * sp, h)
    bulge = (math.cos(a) * 0.35, math.sin(a) * 0.35, -0.25)
    tip, _ = b.limb(t_bark, (0.05, 0.05, 1.35), p2, bulge, 0.085, 0.025, sides=5, segs=3, rng=rng)
    r = rng.uniform(0.26, 0.38)
    b.blob(t_orbC if k % 2 == 0 else t_orbP, tip + Vector((0, 0, r * 0.55)), (r, r, r), jitter=0.05, rng=rng)
# 2 kleine hängende Beeren am Stamm
b.octa(t_orbP, (0.35, 0.20, 1.9), 0.09)
b.octa(t_orbC, (-0.28, -0.15, 2.1), 0.08)
b.finish("tree_glow")

# ---------- bush_a / bush_b ----------
rng = random.Random(53)
b = Builder()
for i, (loc, sc) in enumerate([((0, 0, 0.52), (0.72, 0.66, 0.55)),
                               ((0.48, 0.22, 0.38), (0.50, 0.46, 0.40)),
                               ((-0.42, -0.15, 0.42), (0.46, 0.50, 0.42))]):
    base = C_TEAL_LITE if i % 2 else C_TEAL
    b.blob(b.tag("lit", vary(base, rng)), loc, sc, rng=rng)
b.finish("bush_a")

rng = random.Random(59)
b = Builder()
for i, (loc, sc) in enumerate([((0, 0, 0.40), (0.80, 0.72, 0.42)),
                               ((0.50, -0.25, 0.30), (0.44, 0.40, 0.32)),
                               ((-0.45, 0.28, 0.32), (0.42, 0.44, 0.30))]):
    base = C_VIOLET if i % 2 else C_VIOLET_LITE
    b.blob(b.tag("lit", vary(base, rng)), loc, sc, rng=rng)
t_ber = b.tag("cyan")
b.octa(t_ber, (0.35, 0.30, 0.62), 0.07)
b.octa(t_ber, (-0.30, -0.28, 0.55), 0.06)
b.finish("bush_b")

# ---------- grass_tuft: 7 gefächerte Halme, zweifarbig ----------
rng = random.Random(61)
b = Builder()
t_lo = b.tag("lit", C_GRASS_LO)
t_hi = b.tag("lit", C_GRASS_HI)
for k in range(7):
    a = 2 * math.pi * k / 7 + rng.uniform(-0.3, 0.3)
    lean = rng.uniform(0.10, 0.26)
    h = rng.uniform(0.32, 0.52)
    dx, dy = math.cos(a), math.sin(a)
    pts = [(dx * 0.02, dy * 0.02, 0),
           (dx * lean * 0.45, dy * lean * 0.45, h * 0.55),
           (dx * lean, dy * lean, h * 0.9),
           (dx * lean * 1.45, dy * lean * 1.45, h)]
    b.ribbon(t_lo, pts, [0.055, 0.045, 0.028, 0.0], tip_tid=t_hi, tip_from=1)
b.finish("grass_tuft")

# ---------- Blumen: Stiel + 2 Blätter + emissive Blüte ----------
def flower(name, glow_key, petals, height, prad, seed):
    rng = random.Random(seed)
    b = Builder()
    t_stem = b.tag("lit", C_STEM)
    lx = rng.uniform(-0.05, 0.05)
    b.ribbon(t_stem, [(0, 0, 0), (lx * 0.5, 0.01, height * 0.55), (lx, 0.02, height)],
             [0.030, 0.026, 0.020])
    for s in (-1, 1):  # 2 kleine Blätter
        b.ribbon(t_stem, [(0, 0, height * 0.30), (s * 0.09, s * 0.03, height * 0.42),
                          (s * 0.15, s * 0.05, height * 0.40)], [0.0, 0.055, 0.0])
    t_pet = b.tag(glow_key)
    cz = height + 0.02
    for k in range(petals):
        a = 2 * math.pi * k / petals
        dx, dy = math.cos(a), math.sin(a)
        b.ribbon(t_pet, [(lx + dx * 0.02, 0.02 + dy * 0.02, cz),
                         (lx + dx * prad * 0.6, 0.02 + dy * prad * 0.6, cz + 0.035),
                         (lx + dx * prad, 0.02 + dy * prad, cz + 0.07)],
                 [0.0, prad * 0.62, 0.0])
    b.octa(t_pet, (lx, 0.02, cz + 0.03), 0.045)
    b.finish(name)

flower("flower_cyan", "cyan", 6, 0.34, 0.105, 71)
flower("flower_pink", "pink", 5, 0.40, 0.120, 73)
flower("flower_gold", "gold", 7, 0.28, 0.095, 79)

# ---------- Export ----------
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True,
                          export_apply=True, export_lights=False, export_cameras=False)
print("EXPORTIERT:", OUT, os.path.getsize(OUT), "bytes")
