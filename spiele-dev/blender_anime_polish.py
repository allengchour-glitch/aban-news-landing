#!/usr/bin/env python3
# spiele-dev/blender_anime_polish.py — Anime-Charaktere (Meshy) mergen + polieren.
# ---------------------------------------------------------------------------------
# Blender 4.x headless (numpy im PYTHONPATH, Exporter-Falle):
#   python3.12 -m pip install --target <scratch>/pymods numpy
#   PYTHONPATH=<scratch>/pymods CFG=<config.json> /usr/bin/blender -b -P blender_anime_polish.py
#
# Nimmt je Charakter 3 Meshy-Animations-GLBs (idle/walk/run — jeweils dasselbe gerigte
# Mesh + genau 1 Clip, identische Bone-Namen) und baut EINE saubere GLB:
#   - EIN Armature + EIN Mesh, 3 benannte Actions idle/walk/run (export_animation_mode='ACTIONS')
#   - Ghost-NLA entfernt, keine Streu-Actions
#   - Decimate auf <=15k Tris, Textur <=1024 als JPEG
#   - Hoehe ~1.75, Fuesse bei y=0 (glTF), zentriert; Blick nach +Z (ROT_DEG drehbar)
#   - kein Draco, Emission <=1, +Y up  ->  laeuft in three.js r128 AnimationMixer
# Config-JSON: {"out_dir":..., "chars":[{"name","idle","walk","run","rot_deg":0,"height":1.75,"tris":14000}]}
import bpy, os, json, math
from mathutils import Vector

CFG = json.load(open(os.environ["CFG"]))
OUT_DIR = CFG["out_dir"]

def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for coll in (bpy.data.actions, bpy.data.meshes, bpy.data.armatures,
                 bpy.data.materials, bpy.data.images, bpy.data.objects):
        for d in list(coll):
            try: coll.remove(d)
            except Exception: pass

def import_glb(path):
    before_obj = set(bpy.data.objects)
    before_act = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    new_obj = [o for o in bpy.data.objects if o not in before_obj]
    new_act = [a for a in bpy.data.actions if a not in before_act]
    arm = next((o for o in new_obj if o.type == 'ARMATURE'), None)
    meshes = [o for o in new_obj if o.type == 'MESH']
    act = new_act[0] if new_act else None
    return arm, meshes, act

def process_char(c):
    clean_scene()
    name = c["name"]
    # 1) import idle as base
    base_arm, base_meshes, act_idle = import_glb(c["idle"])
    _, walk_meshes_arm = None, None
    walk_arm, walk_meshes, act_walk = import_glb(c["walk"])
    run_arm,  run_meshes,  act_run  = import_glb(c["run"])

    # 2) rename the 3 actions
    for a, nm in ((act_idle, "idle"), (act_walk, "walk"), (act_run, "run")):
        if a: a.name = nm; a.use_fake_user = True

    # 3) delete the extra armatures + all extra meshes (duplicates), keep base only
    keep_mesh = base_meshes[0]
    to_del = []
    for o in bpy.data.objects:
        if o is base_arm or o is keep_mesh: continue
        to_del.append(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in to_del: o.select_set(True)
    bpy.ops.object.delete()

    # 4) purge stray actions -> keep exactly idle/walk/run
    for a in list(bpy.data.actions):
        if a.name not in ("idle", "walk", "run"):
            bpy.data.actions.remove(a)

    # 5) clean animation_data on base armature: no ghost NLA, assign idle as active
    base_arm.animation_data_clear()
    ad = base_arm.animation_data_create()
    ad.action = bpy.data.actions.get("idle")

    # make sure mesh's armature modifier points to base_arm
    for m in base_arm.children:
        pass
    for mod in keep_mesh.modifiers:
        if mod.type == 'ARMATURE':
            mod.object = base_arm
    if keep_mesh.parent and keep_mesh.parent.type == 'ARMATURE':
        keep_mesh.parent = base_arm

    # 6) decimate to <= target tris
    bpy.context.view_layer.objects.active = keep_mesh
    me = keep_mesh.data
    ntri = sum(len(p.vertices) - 2 for p in me.polygons)
    target = c.get("tris", 14000)
    if ntri > target:
        dec = keep_mesh.modifiers.new("dec", 'DECIMATE')
        dec.decimate_type = 'COLLAPSE'
        dec.ratio = max(0.05, target / float(ntri))
        dec.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=dec.name)

    # 7) shade smooth + resize textures <=1024
    bpy.ops.object.select_all(action='DESELECT')
    keep_mesh.select_set(True)
    bpy.context.view_layer.objects.active = keep_mesh
    bpy.ops.object.shade_smooth()
    for img in bpy.data.images:
        if img.size[0] > 1024 or img.size[1] > 1024:
            s = 1024.0 / max(img.size)
            img.scale(int(img.size[0]*s), int(img.size[1]*s))

    # emission strength <=1 (r128)
    for mat in bpy.data.materials:
        if not mat.use_nodes: continue
        b = mat.node_tree.nodes.get("Principled BSDF")
        if b and "Emission Strength" in b.inputs:
            b.inputs["Emission Strength"].default_value = min(1.0, b.inputs["Emission Strength"].default_value)

    # 8) normalize TRS on the armature node (no transform_apply -> keeps anim amplitude correct).
    def world_bbox():
        dg = bpy.context.evaluated_depsgraph_get()
        ev = keep_mesh.evaluated_get(dg)
        cs = [ (keep_mesh.matrix_world @ v.co) for v in ev.data.vertices ]
        xs=[p.x for p in cs]; ys=[p.y for p in cs]; zs=[p.z for p in cs]
        return (min(xs),max(xs),min(ys),max(ys),min(zs),max(zs))

    # facing rotation about world Z
    rot = math.radians(c.get("rot_deg", 0))
    if rot:
        base_arm.rotation_euler[2] += rot
        bpy.context.view_layer.update()

    x0,x1,y0,y1,z0,z1 = world_bbox()
    height = (z1 - z0) or 1.0
    s = c.get("height", 1.75) / height
    print(f"  [scale] native_h={height:.4f} arm_scale_before={tuple(round(v,5) for v in base_arm.scale)} s={s:.5f}")
    base_arm.scale = tuple(v * s for v in base_arm.scale)
    bpy.context.view_layer.update()
    applied = float(base_arm.scale.x)   # uniform object scale we are about to bake in
    # BAKE rotation+scale into armature+mesh DATA (glTF skinning needs geometry/bind at unit node scale;
    # leftover node scale silently breaks skin size in three.js). Keep translation on the node.
    bpy.ops.object.select_all(action='DESELECT')
    base_arm.select_set(True); keep_mesh.select_set(True)
    bpy.context.view_layer.objects.active = base_arm
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.context.view_layer.update()
    # transform_apply does NOT rescale action location fcurves -> root/hip translation would be
    # amplified by 1/applied. Compensate: multiply every bone .location channel value by `applied`.
    for act in bpy.data.actions:
        for fc in act.fcurves:
            if fc.data_path.endswith(".location"):
                for kp in fc.keyframe_points:
                    kp.co.y *= applied
                    kp.handle_left.y *= applied
                    kp.handle_right.y *= applied
                fc.update()
    # now feet->0 and center x/y via node translation only
    x0,x1,y0,y1,z0,z1 = world_bbox()
    base_arm.location.x -= (x0 + x1) / 2.0
    base_arm.location.y -= (y0 + y1) / 2.0
    base_arm.location.z -= z0
    bpy.context.view_layer.update()
    x0,x1,y0,y1,z0,z1 = world_bbox()
    print(f"  [scale] final_h={z1-z0:.4f} final_zmin={z0:.4f} arm_scale={tuple(round(v,5) for v in base_arm.scale)}")

    # 9) export
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, name + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=out, export_format='GLB',
        export_animation_mode='ACTIONS', export_animations=True,
        export_image_format='JPEG', export_jpeg_quality=85,
        export_draco_mesh_compression_enable=False,
        export_yup=True, export_apply=False,
        export_skins=True, export_morph=False)
    ntri2 = sum(len(p.vertices) - 2 for p in keep_mesh.data.polygons)
    print(f"[DONE] {name} -> {out} tris={ntri2} size={os.path.getsize(out)}")

for ch in CFG["chars"]:
    try:
        process_char(ch)
    except Exception as e:
        import traceback; traceback.print_exc()
        print("[FAIL]", ch.get("name"), e)
print("[ALL DONE]")
