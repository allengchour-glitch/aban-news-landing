"""Gestaltung des bestehenden Büros; keine Datenquelle und keine Messwerte.

Szene: statisches Büro in Metern, vorhandene Kamera und Einrichtung erhalten.
Fokus: Monitorwand; Mitte frei, ruhige Lamellen im Hintergrund.
Material: Eiche mit feiner Maserung, matte Steinoberfläche, Petrol und Messing.
Abnahme: Gesamtbild und Monitoransicht, keine schwebenden Ergänzungen,
Kennzeichnung Gestaltungsvorlage/keine Live-Kontodaten bleibt sichtbar.
"""
import bpy, math
from mathutils import Vector
scene = bpy.context.scene
wood = bpy.data.materials['MAT_oak']
dark = bpy.data.materials['MAT_deep_teal']
brass = bpy.data.materials['MAT_warm_brass']
warm = bpy.data.materials['MAT_warm_white_text']

# Holzmaserung ist prozedural; GLB übernimmt nur die Grundfarbe.
nodes, links = wood.node_tree.nodes, wood.node_tree.links
shader = nodes.get('Principled BSDF')
coord = nodes.new('ShaderNodeTexCoord')
mapping = nodes.new('ShaderNodeVectorMath'); mapping.operation = 'MULTIPLY'
mapping.inputs[1].default_value = (2, 38, 4)
noise = nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 3
noise.inputs['Detail'].default_value = 2
ramp = nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position = .15
ramp.color_ramp.elements[0].color = (.23, .12, .052, 1)
ramp.color_ramp.elements[1].position = .85
ramp.color_ramp.elements[1].color = (.57, .36, .18, 1)
bump = nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .12
bump.inputs['Distance'].default_value = .015
links.new(coord.outputs['Generated'], mapping.inputs[0])
links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
links.new(noise.outputs['Fac'], ramp.inputs[0])
links.new(ramp.outputs['Color'], shader.inputs['Base Color'])
links.new(noise.outputs['Fac'], bump.inputs['Height'])
links.new(bump.outputs['Normal'], shader.inputs['Normal'])

def box(name, loc, size, material, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.name = 'GAL_' + name; o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        mod = o.modifiers.new('Kanten', 'BEVEL'); mod.width = bevel; mod.segments = 2
    return o

# Hinter der Monitorwand und unterhalb der Galerie; die Anzeigen bleiben frei.
slat = box('akustik', (-9, 7.45, 2.7), (.12, .16, 4.9), wood)
for i in range(1, 61):
    o = slat.copy(); o.data = slat.data
    scene.collection.objects.link(o); o.location.x = -9 + i * .30

# Greifbare Arbeitsplätze: matte Unterlagen, Tastatur und Maus ohne neue Behauptungen.
for x in (-8.3, 8.3):
    for y in (-5, 1.1):
        box('unterlage', (x, y-.32, 1.345), (2.4, .75, .018), dark, .006)
        box('tastatur', (x-.2, y-.32, 1.375), (1.1, .35, .045), warm, .012)
        box('maus', (x+.65, y-.33, 1.39), (.20, .30, .08), dark, .035)
        # Fuss und Leuchtenarm stehen auf der Tischplatte.
        box('lampenfuss', (x-1.55, y+.2, 1.36), (.28, .28, .06), brass)
        box('lampenarm', (x-1.55, y+.2, 1.72), (.055, .055, .70), brass)
        box('leuchte', (x-1.3, y+.2, 2.08), (.65, .12, .08), dark)
        box('lichtflaeche', (x-1.3, y+.2, 2.035), (.53, .085, .012), warm, .003)

# Umlaufende Handläufe mit realen Endpunkten; ursprüngliche Geländer bleiben.
box('handlauf_hinten', (0, 8.75, 6.15), (28, .16, .10), brass)
for x in (-8.2, 8.2):
    box('handlauf_seite', (x, 5.5, 6.15), (.16, 7, .10), brass)

# Weiches Leselicht mit exportierbarem Punktlicht; keine Area-Lights.
key = bpy.data.objects['LGT_key']; key.data.energy = 2.0; key.data.angle = .20
fill = bpy.data.objects['LGT_fill']; fill.data.energy = 2600
fill.data.color = (1, .84, .68); fill.data.shadow_soft_size = 7
scene.render.resolution_x = 1200; scene.render.resolution_y = 900
scene.render.resolution_percentage = 80
target = artifacts.file(name='office-gallery-refined.png', media_type='image/png')
scene.render.filepath = str(target.path)
scene.render.image_settings.media_type = 'IMAGE'
scene.render.image_settings.file_format = 'PNG'
bpy.ops.render.render(write_still=True); target.publish()
result = {'objects': len(scene.objects), 'slats': 61, 'desks_refined': 4,
          'camera': scene.camera.name, 'live_data': False,
          'note': 'Prozedurale Holzmaserung nur im Render, GLB mit Grundmaterial.'}
