import bpy, math
scene=bpy.context.scene
dark=bpy.data.materials['MAT_deep_teal'];mint=bpy.data.materials['MAT_mint_accent'];wood=bpy.data.materials['MAT_oak'];stone=bpy.data.materials['MAT_warm_ivory'];screen=bpy.data.materials['MAT_monitor_blue']
def material(name,c,em=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Roughness'].default_value=.5
 if em:n.inputs['Emission Color'].default_value=(*c,1);n.inputs['Emission Strength'].default_value=em
 return m
white=material('MAT_warm_white_text',(.85,.95,.91),.4)
green=material('MAT_ficus_green',(.075,.29,.17))
brass=material('MAT_warm_brass',(.58,.4,.16))
def box(name,loc,size,m,bevel=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:
  mod=o.modifiers.new('Soft edges','BEVEL');mod.width=bevel;mod.segments=2
 return o
def cylinder(name,loc,r,depth,m):
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(m);return o
def text(name,body,loc,size,m):
 cu=bpy.data.curves.new(name,'FONT');cu.body=body;cu.align_x='CENTER';cu.size=size;cu.extrude=.003
 o=bpy.data.objects.new(name,cu);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(math.pi/2,0,0);cu.materials.append(m);return o
# Tragwerk der beiden Galerien; keine schwebenden Plattformen.
for x in [-13.5,-8.4,8.4,13.5]:
 for y in [2.2,8.8]:
  box('ENV_gallery_column',(x,y,2.5),(.24,.24,4.85),dark)
for x in [-10.95,10.95]:
 box('ENV_gallery_beam',(x,2.2,4.7),(5.4,.27,.3),dark)
for i in range(25):
 h=(i+1)*.196
 box('ENV_stair_step',(-11.9,-5.7+i*.32,.08+h/2),(2.0,.34,h),wood,.015)
for x in [-12.94,-10.86]:
 o=box('ENV_stair_handrail',(x,-1.86,3.26),(.09,9.2,.1),brass,.01);o.rotation_euler.x=math.atan2(4.9,8)
 for i in range(5):
  y=-5.7+i*1.92;z=.08+(i*6+1)*.196+.5
  box('ENV_stair_rail_post',(x,y,z),(.07,.07,1.0),brass,.01)
# Geordnetes Licht- und Bodensystem.
for x in [-14.15,14.15]:box('ENV_floor_guidelight',(x,-.2,.1),(.07,22.5,.035),mint,.01)
box('ENV_front_guidelight',(0,-11.7,.1),(28.3,.07,.035),mint,.01)
for x in [-8.3,8.3]:
 for y in [-5,1.1]:
  # Stuhl auf echter Bodenhoehe, mit Ruecken und Rollenfuss.
  cylinder('PRP_chair_base',(x,y-1.35,.17),.55,.12,dark)
  cylinder('PRP_chair_column',(x,y-1.35,.47),.09,.55,dark)
  box('PRP_chair_seat',(x,y-1.35,.78),(1.0,.9,.16),mint,.1)
  box('PRP_chair_back',(x,y-1.78,1.25),(1.0,.14,.95),dark,.09)
  box('PRP_keyboard',(x,y-.38,1.36),(1.0,.36,.03),dark,.025)
  box('PRP_desk_light',(x+1.75,y,1.62),(.06,.06,.68),brass,.02)
  box('PRP_desk_light_head',(x+1.62,y,1.98),(.4,.2,.08),white)
# Pflanzen: sichtbare Staemme und verschiedene Blattmassen.
for x,y in [(-13,-9),(13,-9),(-5,8.7),(5,8.7),(-13,10),(13,10)]:
 cylinder('PRP_ficus_planter',(x,y,.43),.49,.7,dark)
 cylinder('PRP_ficus_trunk',(x,y,1.13),.07,1.35,wood)
 for i in range(7):
  a=i*2.4
  bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=(x+.35*math.cos(a),y+.35*math.sin(a),1.5+(i%3)*.3))
  o=bpy.context.object;o.name='PRP_ficus_leaves';o.scale=(.45,.36,.55);o.data.materials.append(green)
# Monitore sind bewusst eine Gestaltungsvorlage, ohne erfundene Kennzahlen.
text('HERO_brand','ABAN  /  KONTROLLRAUM',(0,6.54,4.3),.43,white)
text('HERO_scope','SHOP   /   INHALTE   /   FINANZEN',(0,6.54,3.6),.23,white)
text('HERO_status','GESTALTUNGSVORLAGE',(0,6.54,2.8),.22,mint)
text('HERO_status_note','KEINE LIVE-KONTODATEN',(0,6.54,2.35),.18,white)
for x,label in [(-6,'VERKAUF'),(6,'ABLAEUFE')]:
 text('HERO_panel_title',label,(x,6.54,4.2),.32,white)
 for j in range(4):
  box('HERO_panel_placeholder',(x,6.51,3.5-j*.46),(2.9,.025,.07),mint,.01)
box('HERO_console_screen',(0,-1.05,1.99),(3.3,.22,.62),screen,.07)
text('HERO_console_label','ABAN',(0,-1.18,2.05),.25,white)
# Ruhezone in der vorderen Ecke mit Rueckenpolstern.
for x in [-5.3,5.3]:
 box('PRP_lounge_base',(x,-8.9,.42),(3.3,1.35,.65),dark,.16)
 box('PRP_lounge_cushion',(x,-8.9,.83),(3.1,1.2,.24),mint,.12)
 box('PRP_lounge_back',(x,-9.42,1.2),(3.3,.25,1.1),dark,.12)
cylinder('PRP_meeting_table',(0,-8.5,.67),1.2,.12,wood)
cylinder('PRP_meeting_support',(0,-8.5,.35),.14,.6,dark)
# Zusatzlicht motiviert durch die grosse Monitorwand.
bpy.ops.object.light_add(type='POINT',location=(0,5,5.8));o=bpy.context.object;o.name='LGT_monitor_fill';o.data.color=(.4,.9,.78);o.data.energy=550;o.data.shadow_soft_size=4
scene.render.resolution_x=1280;scene.render.resolution_y=960;scene.render.resolution_percentage=75
target=artifacts.file(name='office-final.png',media_type='image/png');scene.render.filepath=str(target.path);scene.render.image_settings.media_type='IMAGE';scene.render.image_settings.file_format='PNG';bpy.ops.render.render(write_still=True);target.publish()
result={'objects':len(scene.objects),'camera':scene.camera.name,'hero_width_m':bpy.data.objects['HERO_monitor_structure'].dimensions.x,'labels':'Gestaltungsvorlage, keine Live-Kontodaten','supports':len([o for o in scene.objects if o.name.startswith('ENV_gallery_column')]),'stair_steps':25}

