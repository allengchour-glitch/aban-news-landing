#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Blender headless Render (Cycles CPU, CI-tauglich).

Rendert eine kurze 360°-Animation als PNG-Sequenz. Zwei Modi:
  MODE=intro  -> abstraktes Marken-Intro (Ikosphäre, amber, leicht emissiv)
  MODE=mug    -> Produkt-Turntable: prozeduraler Becher + Design-Textur (DESIGN=Pfad zu PNG)

Aufruf (im Workflow):
  blender -b -P blender/render_scene.py
ENV: MODE=intro|mug · DESIGN=pod/looks/x.png · FRAMES=60 · SAMPLES=16 · RES=800 · OUT=media/3d/frames

Defensiv geschrieben (Blender 3.x/4.x): Principled-Inputs werden über mehrere mögliche
Namen gesetzt, alles Nicht-Kritische in try/except. Cycles + CPU = kein GPU nötig.
"""
import bpy, os, math

MODE    = os.environ.get("MODE", "intro").strip().lower()
DESIGN  = os.environ.get("DESIGN", "").strip()
FRAMES  = max(8, int(os.environ.get("FRAMES", "60") or "60"))
SAMPLES = max(4, int(os.environ.get("SAMPLES", "16") or "16"))
RES     = max(256, int(os.environ.get("RES", "800") or "800"))
OUT     = os.environ.get("OUT", "media/3d/frames").strip()
AMBER   = (0.851, 0.341, 0.035, 1.0)  # #d97706 linear-ish

os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for blk in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for d in list(blk):
            try:
                blk.remove(d)
            except Exception:
                pass


def set_principled(bsdf, **vals):
    """Setzt Principled-Inputs tolerant (Namen variieren je Blender-Version)."""
    aliases = {
        "base_color": ["Base Color"],
        "metallic":   ["Metallic"],
        "roughness":  ["Roughness"],
        "emission":   ["Emission Color", "Emission"],
        "emission_strength": ["Emission Strength"],
    }
    for key, val in vals.items():
        for name in aliases.get(key, [key]):
            if name in bsdf.inputs:
                try:
                    bsdf.inputs[name].default_value = val
                    break
                except Exception:
                    pass


def new_material(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    return mat, bsdf


def add_camera_and_lights(dist=6.0, height=2.0):
    cam_data = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Cam", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (0, -dist, height)
    cam.rotation_euler = (math.radians(78), 0, 0)
    bpy.context.scene.camera = cam

    key = bpy.data.lights.new("Key", "AREA"); key.energy = 800; key.size = 6
    ko = bpy.data.objects.new("Key", key); ko.location = (4, -5, 7); bpy.context.collection.objects.link(ko)
    rim = bpy.data.lights.new("Rim", "AREA"); rim.energy = 500; rim.size = 5
    ro = bpy.data.objects.new("Rim", rim); ro.location = (-5, -2, 4); bpy.context.collection.objects.link(ro)


def set_world(top=(0.10, 0.085, 0.06), strength=1.0):
    w = bpy.data.worlds.new("W") if not bpy.data.worlds else bpy.data.worlds[0]
    bpy.context.scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (top[0], top[1], top[2], 1.0)
        bg.inputs[1].default_value = strength


def build_intro():
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.6, location=(0, 0, 1.1))
    obj = bpy.context.active_object
    try:
        bpy.ops.object.shade_smooth()
    except Exception:
        pass
    mat, bsdf = new_material("amber")
    if bsdf:
        set_principled(bsdf, base_color=AMBER, metallic=0.7, roughness=0.25,
                       emission=AMBER, emission_strength=0.5)
    obj.data.materials.append(mat)

    # Innen-Drahtgitter als Akzent
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=2.1, location=(0, 0, 1.1))
    wire = bpy.context.active_object
    wmat, wb = new_material("wire")
    if wb:
        set_principled(wb, base_color=(1, 1, 1, 1), emission=(1, 0.8, 0.4, 1), emission_strength=1.2)
    wire.data.materials.append(wmat)
    try:
        m = wire.modifiers.new("wf", "WIREFRAME"); m.thickness = 0.012
    except Exception:
        pass
    return [obj, wire]


def build_mug():
    # Korpus
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=1.0, depth=2.0, location=(0, 0, 1.0))
    body = bpy.context.active_object
    try:
        bpy.ops.object.shade_smooth()
    except Exception:
        pass
    mat, bsdf = new_material("mug")
    if bsdf:
        set_principled(bsdf, base_color=(0.95, 0.95, 0.95, 1), roughness=0.35, metallic=0.0)
        # Design-Textur (falls vorhanden) auf Base Color
        if DESIGN and os.path.isfile(DESIGN) and "Base Color" in bsdf.inputs:
            try:
                img = bpy.data.images.load(os.path.abspath(DESIGN))
                nt = mat.node_tree
                tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = img
                tc = nt.nodes.new("ShaderNodeTexCoord")
                nt.links.new(tc.outputs["UV"], tex.inputs["Vector"])
                nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
            except Exception as e:
                print("Design-Textur übersprungen:", e)
    body.data.materials.append(mat)

    # Henkel
    bpy.ops.mesh.primitive_torus_add(major_radius=0.55, minor_radius=0.12, location=(1.05, 0, 1.0))
    handle = bpy.context.active_object
    handle.rotation_euler = (0, math.radians(90), 0)
    handle.data.materials.append(mat)

    # Bodenplatte (Schattenfänger)
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))
    return [body, handle]


def main():
    sc = bpy.context.scene
    clear_scene()
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = SAMPLES
    try:
        sc.cycles.use_denoising = True
    except Exception:
        pass
    sc.render.resolution_x = RES
    sc.render.resolution_y = RES
    sc.render.fps = 30
    sc.render.image_settings.file_format = "PNG"
    sc.frame_start = 1
    sc.frame_end = FRAMES

    set_world()
    add_camera_and_lights()
    objs = build_mug() if MODE == "mug" else build_intro()

    # 360°-Drehung auf das erste (Haupt-)Objekt + Geschwister per Parent
    main_obj = objs[0]
    for o in objs[1:]:
        o.parent = main_obj
    main_obj.rotation_euler = (0, 0, 0)
    main_obj.keyframe_insert("rotation_euler", frame=1)
    main_obj.rotation_euler = (0, 0, math.radians(360))
    main_obj.keyframe_insert("rotation_euler", frame=FRAMES)
    # lineare Interpolation für gleichmässige Drehung
    if main_obj.animation_data and main_obj.animation_data.action:
        for fc in main_obj.animation_data.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"

    sc.render.filepath = os.path.abspath(OUT) + "_"
    print(f"[aban3d] MODE={MODE} FRAMES={FRAMES} SAMPLES={SAMPLES} RES={RES} -> {OUT}_####.png")
    bpy.ops.render.render(animation=True)
    print("[aban3d] fertig.")


if __name__ == "__main__":
    main()
