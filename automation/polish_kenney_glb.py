import bpy, os

SRC = "/tmp/ftk/Models/GLB format"
OUT = "/home/user/aban-news-landing/models"
# source (Kenney name) -> output name
MAP = {
    "windmill": "ftk_windmill",
    "road": "ftk_road",
    "road-bend": "ftk_road_bend",
    "road-corner": "ftk_road_corner",
    "stall-red": "ftk_stall",
    "cart": "ftk_cart",
    "banner-red": "ftk_banner",
    "lantern": "ftk_lantern",
    "fountain-round-detail": "ftk_fountain",
    "watermill": "ftk_watermill",
    "tree-high-round": "ftk_tree",
}

def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    # purge orphan data so textures/materials don't leak between files
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.textures):
        for b in list(block):
            if b.users == 0:
                block.remove(b)

ok=[]
for src, out in MAP.items():
    path = os.path.join(SRC, src + ".glb")
    if not os.path.exists(path):
        print("MISS", src); continue
    clear()
    bpy.ops.import_scene.gltf(filepath=path)  # lädt Textures/colormap.png relativ mit
    # flat shading für sauberen Low-Poly-Look
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            for p in o.data.polygons:
                p.use_smooth = False
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, out + ".glb"),
        export_format='GLB', use_selection=True, export_apply=True)  # GLB = Textur eingebettet
    ok.append(out)

print("POLISHED:", ",".join(ok))
