import bpy,math
scene=bpy.context.scene
for o in bpy.data.objects:
 if o.name.startswith('ENV_stair_handrail'):
  o.location.z=3.628
  o.rotation_euler.x=math.atan2(4.704,7.68)
dark=bpy.data.materials['MAT_deep_teal'];wood=bpy.data.materials['MAT_oak'];screen=bpy.data.materials['MAT_monitor_blue'];white=bpy.data.materials['MAT_warm_white_text']
def box(name,loc,size,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 mod=o.modifiers.new('Soft edges','BEVEL');mod.width=.03;mod.segments=2
 return o
for i,label in enumerate(['SHOP','VERSAND','KRYPTO','INHALTE','TECHNIK','STUDIO','CHEF']):
 x=-12+i*4
 box('PRP_gallery_desk',(x,10.0,6.13),(2.5,1.0,.14),wood)
 for dx in [-.96,.96]:box('PRP_gallery_desk_support',(x+dx,10.0,5.59),(.09,.8,1.0),dark)
 box('PRP_gallery_screen',(x,10.3,6.67),(1.4,.12,.72),screen)
 box('PRP_gallery_chair',(x,9.1,5.7),(.8,.75,.15),dark)
 box('PRP_gallery_chair_support',(x,9.1,5.35),(.13,.13,.65),dark)
 cu=bpy.data.curves.new('TXT_room_'+label,'FONT');cu.body=label;cu.align_x='CENTER';cu.size=.24;cu.extrude=.002;cu.materials.append(white)
 o=bpy.data.objects.new('TXT_room_'+label,cu);scene.collection.objects.link(o);o.location=(x,11.15,7.05);o.rotation_euler=(math.pi/2,0,0)
target=artifacts.file(name='office-delivery.png',media_type='image/png');scene.render.filepath=str(target.path);scene.render.image_settings.media_type='IMAGE';scene.render.image_settings.file_format='PNG';bpy.ops.render.render(write_still=True);target.publish()
result={'objects':len(scene.objects),'work_areas':7,'railing_contact':'aligned with stair-post tops','data':'Keine Live-Kontodaten'}

