import bpy, math
from mathutils import Vector
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
def mat(name,c,metal=0,rough=.5,em=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
 if em:n.inputs['Emission Color'].default_value=(*c,1);n.inputs['Emission Strength'].default_value=em
 return m
stone=mat('MAT_warm_ivory',(.66,.72,.7),rough=.65)
dark=mat('MAT_deep_teal',(.024,.075,.09),rough=.38)
mint=mat('MAT_mint_accent',(.16,.68,.55),metal=.2,rough=.3,em=.3)
wood=mat('MAT_oak',(.38,.23,.12),rough=.5)
screen=mat('MAT_monitor_blue',(.025,.16,.20),rough=.28,em=.6)
def box(name,loc,size,m,bevel=.05):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:
  mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=3
 return o
def cyl(name,loc,r,depth,m):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(m);return o
box('ENV_foundation',(0,0,-.4),(30,25,.8),dark,.25)
box('ENV_floor',(0,0,.03),(29.6,24.6,.1),stone,.06)
box('ENV_back_wall',(0,11.7,3.6),(30,.45,7.2),stone,.09)
for x in [-14.6,14.6]:box('ENV_side_wall',(x,4,1.15),(.35,15.4,2.3),dark,.08)
for x in [-13.7,-10,10,13.7]:
 box('ENV_structural_column',(x,9,3.5),(.3,.3,7),dark)
box('ENV_upper_walkway',(0,10.1,4.9),(29,2.6,.3),wood,.06)
box('ENV_upper_rail',(0,8.75,5.65),(28,.12,.9),dark,.02)
for x in [-11,11]:
 box('ENV_upper_side',(x,5.5,4.9),(5.6,7,.3),wood)
 box('ENV_rail_side',(x+(2.8 if x<0 else -2.8),5.5,5.65),(.12,7,.9),dark,.02)
for i in range(7):
 x=-12+i*4
 box('ENV_back_window_frame',(x,11.4,4.7),(3.3,.17,3.5),dark)
 box('ENV_back_window',(x,11.27,4.7),(3.0,.06,3.2),screen,.01)
cyl('HERO_command_plaza',(0,-.5,.16),4.6,.24,dark)
cyl('HERO_plaza_inlay',(0,-.5,.29),4.42,.04,mint)
cyl('HERO_plaza_surface',(0,-.5,.32),4.25,.04,dark)
cyl('HERO_central_console',(0,.1,.95),2.3,1.2,wood)
cyl('HERO_console_top',(0,.1,1.6),2.5,.14,dark)
box('HERO_monitor_structure',(0,7,3.1),(17,.55,4.6),dark,.18)
for x,w in [(-6,3.9),(0,7.6),(6,3.9)]:
 box('HERO_monitor_panel',(x,6.65,3.2),(w,.12,3.7),screen,.07)
box('HERO_monitor_light',(0,6.57,1.19),(16.2,.08,.07),mint,.02)
for x in [-8.2,8.2]:
 box('HERO_monitor_support',(x,7,1),(.24,.45,2),dark)
for x in [-8.3,8.3]:
 for y in [-5,1.1]:
  box('PRP_desk',(x,y,1.25),(4.2,1.9,.16),wood)
  for dx in [-1.6,1.6]:box('PRP_desk_leg',(x+dx,y,.62),(.15,1.5,1.2),dark)
  box('PRP_desk_monitor',(x,y+.3,1.85),(1.5,.14,.85),dark)
  box('PRP_desk_display',(x,y+.21,1.85),(1.35,.04,.7),screen)
bpy.ops.object.camera_add(location=(29,-37,30));cam=bpy.context.object;cam.name='CAM_main';cam.rotation_euler=(Vector((0,1,2))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=43;scene.camera=cam
for name,typ,loc,power in [('LGT_key','SUN',(-8,-10,16),2.2),('LGT_fill','POINT',(2,-8,13),1800)]:
 bpy.ops.object.light_add(type=typ,location=loc);o=bpy.context.object;o.name=name;o.data.energy=power
 if typ=='SUN':o.rotation_euler=(.45,-.4,-.5)
 else:o.data.shadow_soft_size=8
world=bpy.data.worlds.new('WORLD_studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.13,.18,.2,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5;scene.world=world
scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=960;scene.render.resolution_y=720;scene.render.resolution_percentage=70
target=artifacts.file(name='office-blockout.png',media_type='image/png');scene.render.filepath=str(target.path);scene.render.image_settings.media_type='IMAGE';scene.render.image_settings.file_format='PNG';bpy.ops.render.render(write_still=True);target.publish()
result={'objects':len(scene.objects),'footprint':[30,25],'hero_dimensions':list(bpy.data.objects['HERO_monitor_structure'].dimensions),'camera':cam.name}

