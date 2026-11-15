import bpy
scene=bpy.context.scene
def palette(name,c,rough=.5,metal=.0,emission=0):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name)
 m.use_nodes=True;m.diffuse_color=(*c,1)
 n=m.node_tree.nodes.get('Principled BSDF')
 n.inputs['Base Color'].default_value=(*c,1)
 n.inputs['Roughness'].default_value=rough
 n.inputs['Metallic'].default_value=metal
 n.inputs['Emission Color'].default_value=(*c,1)
 n.inputs['Emission Strength'].default_value=emission
 return m
palette('MAT_deep_teal',(.014,.036,.052),.32,.18)
palette('MAT_warm_ivory',(.79,.75,.66),.72)
palette('MAT_oak',(.49,.29,.14),.42)
palette('MAT_mint_accent',(.09,.60,.43),.35,.1,.45)
palette('MAT_monitor_blue',(.012,.053,.077),.32,.05,.35)
palette('MAT_warm_white_text',(.96,.91,.78),.45,0,.6)
palette('MAT_warm_brass',(.65,.43,.19),.3,.65)
palette('MAT_ficus_green',(.07,.31,.14),.7)
wall=palette('MAT_porcelain_wall',(.83,.86,.82),.78)
bpy.data.objects['ENV_back_wall'].data.materials[0]=wall
areas=[
 ('shop',(.72,.45,.17)),
 ('versand',(.25,.48,.37)),
 ('krypto',(.28,.34,.58)),
 ('inhalte',(.67,.32,.25)),
 ('technik',(.17,.43,.58)),
 ('studio',(.49,.30,.57)),
 ('chef',(.15,.47,.43))]
panels=sorted([o for o in scene.objects if o.name.startswith('ENV_back_window') and not o.name.startswith('ENV_back_window_frame')],key=lambda o:o.location.x)
assert len(panels)==len(areas)
for o,(label,c) in zip(panels,areas):
 o.data.materials[0]=palette('MAT_area_'+label,c,.42,.05,.12)
for o in scene.objects:
 if o.name.startswith('PRP_chair_seat') or o.name.startswith('PRP_lounge_cushion'):
  o.data.materials[0]=bpy.data.materials['MAT_area_versand' if o.location.x<0 else 'MAT_area_inhalte']
# Die Monitorstruktur bleibt dunkel, Lichtlinien bilden den Fokus.
key=bpy.data.objects['LGT_key'];key.data.energy=2.5;key.data.angle=.14
fill=bpy.data.objects['LGT_fill'];fill.data.energy=2200;fill.data.color=(1.0,.86,.7)
bpy.data.objects['LGT_monitor_fill'].data.energy=380
bg=scene.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.18,.23,.27,1);bg.inputs[1].default_value=.65
scene.render.resolution_x=1280;scene.render.resolution_y=960;scene.render.resolution_percentage=75
target=artifacts.file(name='office-colour-design.png',media_type='image/png')
scene.render.filepath=str(target.path);scene.render.image_settings.media_type='IMAGE';scene.render.image_settings.file_format='PNG'
bpy.ops.render.render(write_still=True);target.publish()
result={'objects':len(scene.objects),'area_accents':[a[0] for a in areas],'look':'Porzellan, Sandstein, dunkles Petrol, Eiche, Kupfer und gedeckte Bereichsfarben','live_data':False}

