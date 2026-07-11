# spiele-dev/blender_hero.py — Low-Poly-Held mit Rig + Animationen für neon-realm.html
# ------------------------------------------------------------------------------------
# Blender 4.0, headless:
#   python3.12 -m pip install --target <scratch>/pymods numpy   (einmalig, Exporter-Falle)
#   PYTHONPATH=<scratch>/pymods /usr/bin/blender -b -P spiele-dev/blender_hero.py
#
# Baut einen stilisierten, menschlichen Neon-Helden (dunkler Anzug, cyan/pink Akzente,
# leuchtende Augen) aus Low-Poly-Primitiven, rigged mit einem 16-Knochen-Humanoid-Skelett
# (manuelle, part-genaue Gewichte — kein Bone-Heat-Risiko) und exportiert 3 benannte
# Animationen als getrennte glTF-Animationen (Actions + NLA-Tracks gepusht):
#   "idle"  f1..49  @24fps = 2.0 s Loop (Atmen, leichtes Wippen, Armpendeln)
#   "walk"  f1..25  @24fps = 1.0 s Loop (Schrittzyklus, Arme gegenläufig, Hüft-Bob)
#   "wave"  f1..37  @24fps = 1.5 s      (rechter Arm winkt, Start/Ende = Rest-Pose)
#
# Masse/Ausrichtung (WICHTIG für neon-realm.html):
#   Höhe ~1.71 Einheiten, Ursprung an den Füssen (steht auf y=0 in three.js).
#   Blickrichtung: -Y in Blender  →  +Z in glTF/three.js (Standard; mesh.lookAt(ziel) passt,
#   bzw. rotation.y = Math.atan2(dx,dz) für Laufrichtung).
# Export: models/hero.glb — plain GLB, KEIN Draco, Emission-Strength <= 1
#   (sonst KHR_materials_emissive_strength, das three.js r128 nicht kennt).
# Ziel: < 8000 Tris, < 500 KB.
import bpy, bmesh, math, os
from math import radians
from mathutils import Vector, Matrix, Euler

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "hero.glb")

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.fps = 24

# ---------------- Materialien ----------------
def mk_mat(name, base, emis, strength=1.0, rough=0.8, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*base, 1.0)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    for key in ("Emission Color", "Emission"):
        if key in b.inputs:
            b.inputs[key].default_value = (*emis, 1.0)
            break
    if "Emission Strength" in b.inputs:
        b.inputs["Emission Strength"].default_value = min(strength, 1.0)  # r128-Falle
    return m

M_SUIT  = mk_mat("hero_suit",  (0.030, 0.034, 0.100), (0.050, 0.070, 0.220), 0.9)
M_DARK  = mk_mat("hero_dark",  (0.018, 0.018, 0.048), (0.055, 0.028, 0.100), 0.7, rough=0.6)
M_SKIN  = mk_mat("hero_skin",  (0.870, 0.610, 0.450), (0.240, 0.130, 0.080), 0.5, rough=0.9)
M_CYAN  = mk_mat("hero_cyan",  (0.020, 0.090, 0.130), (0.360, 0.950, 1.000), 1.0, rough=0.4)
M_PINK  = mk_mat("hero_pink",  (0.120, 0.020, 0.090), (1.000, 0.430, 0.780), 1.0, rough=0.4)
M_EYE   = mk_mat("hero_eye",   (0.400, 0.950, 1.000), (0.550, 1.000, 1.000), 1.0, rough=0.3)
M_MOUTH = mk_mat("hero_mouth", (0.420, 0.180, 0.170), (0.180, 0.060, 0.060), 0.4, rough=0.9)

# ---------------- Part-Baukasten (jedes Teil -> genau 1 Knochen) ----------------
PARTS = []  # (object, bone_name)

def _finish(bm, name, mat, bone):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(mat)
    scn.collection.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = False  # Flat-Shading = Low-Poly-Look
    PARTS.append((ob, bone))
    return ob

def box(name, center, size, mat, bone, rot_y=0.0, taper_top=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    if taper_top:  # obere Fläche verbreitern/verschmälern (x,y-Faktoren)
        for v in bm.verts:
            if v.co.z > 0:
                v.co.x *= taper_top[0]; v.co.y *= taper_top[1]
    M = (Matrix.Translation(Vector(center)) @ Matrix.Rotation(rot_y, 4, 'Y')
         @ Matrix.Diagonal(Vector(size)).to_4x4())
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    return _finish(bm, name, mat, bone)

def cyl(name, p1, p2, r1, r2, mat, bone, segs=8):
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=segs,
                          radius1=r1, radius2=r2, depth=d.length)
    M = Matrix.Translation((p1 + p2) / 2) @ d.normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    return _finish(bm, name, mat, bone)

def sph(name, center, r, mat, bone, scale=(1, 1, 1), u=10, v=8):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=r)
    M = Matrix.Translation(Vector(center)) @ Matrix.Diagonal(Vector(scale)).to_4x4()
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    return _finish(bm, name, mat, bone)

# ---------------- Körper (Blender: z=hoch, -Y=vorn; Höhe ~1.71) ----------------
for s, S in ((1, "L"), (-1, "R")):   # s = Seitenvorzeichen (+X = .L)
    # Beine
    cyl(f"thigh_{S}", (0.115*s, 0, 0.88), (0.12*s, 0, 0.46), 0.078, 0.058, M_SUIT, f"thigh.{S}")
    sph(f"knee_{S}",  (0.12*s, 0, 0.46), 0.060, M_SUIT, f"shin.{S}")
    cyl(f"shin_{S}",  (0.12*s, 0, 0.46), (0.12*s, 0, 0.10), 0.055, 0.044, M_SUIT, f"shin.{S}")
    box(f"boot_{S}",  (0.12*s, -0.045, 0.060), (0.115, 0.27, 0.12), M_DARK, f"foot.{S}")
    box(f"boottrim_{S}", (0.12*s, 0.015, 0.135), (0.118, 0.14, 0.028), M_CYAN, f"foot.{S}")
    # Arme
    sph(f"shoulder_{S}", (0.265*s, 0, 1.315), 0.085, M_PINK, f"shoulder.{S}", scale=(1.05, 0.95, 0.75))
    cyl(f"uparm_{S}", (0.265*s, 0, 1.28), (0.272*s, 0, 1.05), 0.056, 0.048, M_SUIT, f"upper_arm.{S}")
    sph(f"elbow_{S}", (0.272*s, 0, 1.05), 0.050, M_SUIT, f"forearm.{S}")
    cyl(f"forearm_{S}", (0.272*s, 0, 1.05), (0.282*s, 0, 0.84), 0.046, 0.040, M_SUIT, f"forearm.{S}")
    cyl(f"cuff_{S}", (0.276*s, 0, 0.905), (0.279*s, 0, 0.862), 0.052, 0.050, M_CYAN, f"forearm.{S}")
    sph(f"hand_{S}", (0.285*s, 0, 0.78), 0.052, M_DARK, f"hand.{S}", scale=(0.85, 0.9, 1.25))

# Rumpf
box("pelvis", (0, 0, 0.935), (0.335, 0.225, 0.155), M_SUIT, "hips")
box("belt",   (0, 0, 0.858), (0.350, 0.240, 0.052), M_CYAN, "hips")
box("abdomen", (0, 0, 1.065), (0.300, 0.205, 0.170), M_SUIT, "spine", taper_top=(1.18, 1.05))
box("chest",  (0, 0, 1.245), (0.420, 0.235, 0.210), M_SUIT, "chest", taper_top=(1.04, 1.0))
# V-Linien + Kern auf der Brust (vorn = -Y)
box("vline_L", (-0.068, -0.122, 1.235), (0.034, 0.012, 0.185), M_CYAN, "chest", rot_y=radians(-24))
box("vline_R", ( 0.068, -0.122, 1.235), (0.034, 0.012, 0.185), M_CYAN, "chest", rot_y=radians(24))
sph("core",   (0, -0.125, 1.300), 0.038, M_PINK, "chest", scale=(1, 0.5, 1.3))
# Hals + Kopf (Gesicht Richtung -Y)
cyl("neck", (0, 0, 1.335), (0, 0, 1.435), 0.055, 0.050, M_SKIN, "head")
sph("head", (0, 0, 1.555), 0.165, M_SKIN, "head", u=12, v=9)
sph("hair", (0, 0.030, 1.596), 0.172, M_DARK, "head", scale=(1.02, 1.0, 0.92), u=12, v=9)
sph("eye_L", (-0.058, -0.145, 1.565), 0.024, M_EYE, "head", scale=(1, 0.55, 1))
sph("eye_R", ( 0.058, -0.145, 1.565), 0.024, M_EYE, "head", scale=(1, 0.55, 1))
box("mouth", (0, -0.157, 1.487), (0.055, 0.012, 0.014), M_MOUTH, "head")
box("visor", (0, -0.030, 1.660), (0.30, 0.30, 0.045), M_DARK, "head")  # Stirnband/Haarkante

# ---------------- Armature (16 Deform-Knochen) ----------------
arm_data = bpy.data.armatures.new("HeroRigData")
arm_ob = bpy.data.objects.new("HeroRig", arm_data)
scn.collection.objects.link(arm_ob)
bpy.context.view_layer.objects.active = arm_ob
bpy.ops.object.mode_set(mode='EDIT')
eb = arm_data.edit_bones

def bone(name, head, tail, parent=None, connect=False):
    b = eb.new(name)
    b.head, b.tail = Vector(head), Vector(tail)
    if parent:
        b.parent = eb[parent]; b.use_connect = connect
    return b

bone("hips",  (0, 0, 0.84), (0, 0, 1.00))
bone("spine", (0, 0, 1.00), (0, 0, 1.16), "hips", True)
bone("chest", (0, 0, 1.16), (0, 0, 1.35), "spine", True)
bone("head",  (0, 0, 1.38), (0, 0, 1.71), "chest")
for s, S in ((1, "L"), (-1, "R")):
    bone(f"shoulder.{S}",  (0.06*s, 0, 1.30), (0.23*s, 0, 1.315), "chest")
    bone(f"upper_arm.{S}", (0.265*s, 0, 1.29), (0.272*s, 0, 1.05), f"shoulder.{S}")
    bone(f"forearm.{S}",   (0.272*s, 0, 1.05), (0.282*s, 0, 0.84), f"upper_arm.{S}", True)
    bone(f"hand.{S}",      (0.282*s, 0, 0.84), (0.290*s, 0, 0.70), f"forearm.{S}", True)
    bone(f"thigh.{S}",     (0.115*s, 0, 0.88), (0.12*s, 0, 0.46), "hips")
    bone(f"shin.{S}",      (0.12*s, 0, 0.46), (0.12*s, 0, 0.10), f"thigh.{S}", True)
    bone(f"foot.{S}",      (0.12*s, 0, 0.10), (0.12*s, -0.20, 0.02), f"shin.{S}", True)
bpy.ops.object.mode_set(mode='OBJECT')

# ---------------- Gewichte (part-genau, deterministisch) + Join ----------------
for ob, bn in PARTS:
    vg = ob.vertex_groups.new(name=bn)
    vg.add(list(range(len(ob.data.vertices))), 1.0, 'REPLACE')

bpy.ops.object.select_all(action='DESELECT')
mesh_obs = [ob for ob, _ in PARTS]
for ob in mesh_obs:
    ob.select_set(True)
bpy.context.view_layer.objects.active = mesh_obs[0]
bpy.ops.object.join()
hero = bpy.context.view_layer.objects.active
hero.name = "Hero"
hero.parent = arm_ob
mod = hero.modifiers.new("Armature", 'ARMATURE')
mod.object = arm_ob

# ---------------- Animations-Helfer ----------------
# Keyframes in WELT-Achsen gedacht (Armature steht auf Identity), in Bone-Lokal umgerechnet.
# Welt: -Y = vorn. Für abwärts zeigende Knochen (Beine/Arme): rotX negativ = nach VORN schwingen.
POSE = arm_ob.pose.bones
ALL_BONES = [pb.name for pb in POSE]

def key_rot(pb_name, frame, rx=0, ry=0, rz=0):
    pb = POSE[pb_name]
    R = Euler((radians(rx), radians(ry), radians(rz)), 'XYZ').to_matrix()
    B = pb.bone.matrix_local.to_3x3()
    pb.rotation_quaternion = (B.inverted() @ R @ B).to_quaternion()
    pb.keyframe_insert('rotation_quaternion', frame=frame)

def key_loc(pb_name, frame, dz=0.0, dy=0.0):
    pb = POSE[pb_name]
    B = pb.bone.matrix_local.to_3x3()
    pb.location = B.inverted() @ Vector((0.0, dy, dz))
    pb.keyframe_insert('location', frame=frame)

def new_action(name, last_frame):
    if arm_ob.animation_data is None:
        arm_ob.animation_data_create()
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm_ob.animation_data.action = act
    for f in (1, last_frame):   # alle Knochen auf Rest setzen -> saubere Loops, kein Pose-Bleed
        for bn in ALL_BONES:
            key_rot(bn, f)
            key_loc(bn, f)
    return act

def make_cyclic(act):
    for fc in act.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = 'BEZIER'

# ---------------- "walk" — 1.0 s Schrittzyklus (f1..25 @24fps) ----------------
walk = new_action("walk", 25)
def walk_contact(f, m):
    # m=+1: linkes Bein vorn | m=-1: rechtes Bein vorn
    key_rot("thigh.L", f, rx=-30*m); key_rot("thigh.R", f, rx=30*m)
    key_rot("shin.L", f, rx=(8 if m > 0 else 22)); key_rot("shin.R", f, rx=(22 if m > 0 else 8))
    key_rot("foot.L", f, rx=-6*m); key_rot("foot.R", f, rx=6*m)
    key_rot("upper_arm.L", f, rx=24*m); key_rot("upper_arm.R", f, rx=-24*m)
    key_rot("forearm.L", f, rx=-14); key_rot("forearm.R", f, rx=-14)
    key_rot("hips", f, rz=4*m); key_rot("chest", f, rz=-4*m)
    key_rot("head", f, rz=1.5*m)
    key_loc("hips", f, dz=-0.018)
def walk_passing(f, m):
    # m=+1: rechtes Bein schwingt durch (gebeugt) | m=-1: linkes
    key_rot("thigh.L", f, rx=(6 if m > 0 else -12)); key_rot("thigh.R", f, rx=(-12 if m > 0 else 6))
    key_rot("shin.L", f, rx=(6 if m > 0 else 52)); key_rot("shin.R", f, rx=(52 if m > 0 else 6))
    key_rot("foot.L", f, rx=(0 if m > 0 else 12)); key_rot("foot.R", f, rx=(12 if m > 0 else 0))
    key_rot("upper_arm.L", f, rx=0); key_rot("upper_arm.R", f, rx=0)
    key_rot("forearm.L", f, rx=-10); key_rot("forearm.R", f, rx=-10)
    key_rot("hips", f, rz=0); key_rot("chest", f, rz=0)
    key_loc("hips", f, dz=0.014)
walk_contact(1, +1); walk_passing(7, +1); walk_contact(13, -1); walk_passing(19, -1); walk_contact(25, +1)
make_cyclic(walk)

# ---------------- "idle" — 2.0 s Atmen/Wippen (f1..49) ----------------
idle = new_action("idle", 49)
def idle_pose(f, k):  # k 0..1 Atemphase
    key_rot("chest", f, rx=-2.6*k)
    key_rot("spine", f, rx=-1.2*k)
    key_rot("head", f, rx=2.0*k, rz=0.8*k)
    key_rot("shoulder.L", f, rz=2.2*k); key_rot("shoulder.R", f, rz=-2.2*k)
    key_rot("upper_arm.L", f, rx=2.5*k, ry=-1.5*k)
    key_rot("upper_arm.R", f, rx=2.5*k, ry=1.5*k)
    key_loc("hips", f, dz=0.012*k)
idle_pose(1, 0.0); idle_pose(13, 0.55); idle_pose(25, 1.0); idle_pose(37, 0.45); idle_pose(49, 0.0)
make_cyclic(idle)

# ---------------- "wave" — 1.5 s Winken rechter Arm (f1..37, Start/Ende Rest) ----------------
wave = new_action("wave", 37)
ARM_UP = dict(ry=142, rx=-10)  # rechten Arm seitlich hochdrehen (Welt-Y)
key_rot("upper_arm.R", 6, **ARM_UP); key_rot("upper_arm.R", 30, **ARM_UP)
for f, a in ((6, 10), (12, 38), (18, -6), (24, 38), (30, 10)):
    key_rot("forearm.R", f, ry=a)
key_rot("hand.R", 12, ry=14); key_rot("hand.R", 24, ry=14)
key_rot("head", 10, rz=-5); key_rot("head", 28, rz=-5)
key_rot("chest", 10, rz=-3); key_rot("chest", 28, rz=-3)
make_cyclic(wave)

# ---------------- Actions als NLA-Tracks pushen (getrennte glTF-Animationen) ----------------
ad = arm_ob.animation_data
ad.action = None
for act in (idle, walk, wave):
    tr = ad.nla_tracks.new()
    tr.name = act.name
    st = tr.strips.new(act.name, int(act.frame_range[0]), act)
    st.name = act.name

# ---------------- Stats + Export ----------------
tris = sum(len(p.vertices) - 2 for p in hero.data.polygons)
zs = [ (hero.matrix_world @ v.co).z for v in hero.data.vertices ]
print(f"[hero] Tris: {tris}  Höhe: {max(zs):.3f}  Boden: {min(zs):.3f}  Parts: {len(PARTS)}")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB',
    export_animations=True, export_animation_mode='ACTIONS',
    export_force_sampling=True, export_optimize_animation_size=True,
    export_yup=True, export_apply=False,
    export_skins=True, export_morph=False,
    export_cameras=False, export_lights=False,
)
print(f"[hero] Export: {OUT}  ({os.path.getsize(OUT)/1024:.1f} KB)")
