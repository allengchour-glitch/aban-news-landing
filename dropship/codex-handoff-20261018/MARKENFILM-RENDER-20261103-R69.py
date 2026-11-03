#!/usr/bin/env python3
"""LuxeStyle website brand edit; local, deterministic and silent. No generated imagery.
Usage: python render_brand_film.py --assets ../assets --output . --preview
       python render_brand_film.py --assets ../assets --output . --render desktop mobile
"""
import argparse, hashlib, json, math, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
FPS=30; FRAMES=600
MASTER_ID='luxe_website_brand_master_20261103'
BG='#faf7f2'; INK='#292722'; MUTED='#77654e'; LINE='#d9cebd'
FONT_SERIF='/usr/share/fonts/opentype/urw-base35/P052-Roman.otf'
FONT_ITALIC='/usr/share/fonts/opentype/urw-base35/P052-Italic.otf'
FONT_SANS='/usr/share/fonts/truetype/open-sans/OpenSans-Regular.ttf'
FONT_MED='/usr/share/fonts/truetype/open-sans/OpenSans-Semibold.ttf'
TIMELINE=[(0,84,'intro'),(84,204,'style'),(204,324,'home'),(324,423,'everyday'),(423,525,'ideas'),(525,600,'close')]
FILES={'fashion':'homepage-fashion-blumenkleid.jpg','home':'season-card-winter.png','beauty':'category-tile-beauty-pflege.png','bag':'category-tile-sub-taschen.jpg','watch':'category-tile-uhren.jpg','tech':'category-tile-elektronik-technik.jpg','kitchen':'category-tile-sub-kueche.jpg','gaming':'category-tile-gaming.jpg','sport':'category-tile-sport-outdoor.png','gifts':'budget-card-premium-geschenke.png','christmas':'season-card-christmas.png','design':'design-collage-selbstgestalten-collage.png','paint':'category-tile-selbst-gestalten-1.png','logo':'luxestyle-logo.png'}
def ease(t):
 t=max(0,min(1,t)); return 1-(1-t)**3

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
class Film:
 def __init__(self,assets,kind):
  self.assets=assets; self.kind=kind; self.w,self.h=(1280,1120) if kind=='desktop' else (810,1080)
  self.mobile=kind=='mobile'; self.images={k:ImageOps.exif_transpose(Image.open(assets/v)).convert('RGBA' if k=='logo' else 'RGB') for k,v in FILES.items()}
  self.cache={}; self.text_bounds=[]; self.asset_usage=[]
 def font(self,size,face='sans'):
  key=('font',size,face)
  if key not in self.cache: self.cache[key]=ImageFont.truetype({'sans':FONT_SANS,'serif':FONT_SERIF,'italic':FONT_ITALIC,'medium':FONT_MED}[face],size)
  return self.cache[key]
 def text(self,im,txt,xy,size,face='sans',color=INK,opacity=1,tracking=0,anchor='la',scene=''):
  f=self.font(size,face); layer=Image.new('RGBA',im.size);d=ImageDraw.Draw(layer)
  if tracking:
   width=sum(d.textlength(c,font=f) for c in txt)+tracking*(len(txt)-1); shift=width/2 if anchor=='ma' else width if anchor=='ra' else 0; x=xy[0]-shift
   for c in txt: d.text((x,xy[1]),c,font=f,fill=color,anchor='la');x+=d.textlength(c,font=f)+tracking
   bounds=(xy[0]-shift,xy[1],xy[0]-shift+width,xy[1]+size*1.5)
  else:
   d.text(xy,txt,font=f,fill=color,anchor=anchor);bounds=d.textbbox(xy,txt,font=f,anchor=anchor)
  if opacity<1: layer.putalpha(layer.getchannel('A').point(lambda a:round(a*max(0,opacity))))
  im.paste(layer,(0,0),layer)
  if scene and opacity==1:self.text_bounds.append({'scene':scene,'text':txt,'bounds':list(bounds),'size':size})
 def panel(self,im,key,box,t=1,delay=0,fit='cover',position=(.5,.5),reveal='up'):
  x,y,w,h=map(int,box); ck=(key,w,h,fit,position)
  if ck not in self.cache:
   src=self.images[key]
   if fit=='contain':
    tile=Image.new('RGB',(w,h),'#ffffff'); small=ImageOps.contain(src,(w,h),Image.Resampling.LANCZOS); tile.paste(small,((w-small.width)//2,(h-small.height)//2))
   else:tile=ImageOps.fit(src,(w,h),Image.Resampling.LANCZOS,centering=position)
   self.cache[ck]=tile
  tile=self.cache[ck]
  p=ease((t-delay)/.55)
  if p>=1:im.paste(tile,(x,y))
  elif p>0:
   if reveal=='right':
    shown=max(1,round(w*p)); im.paste(tile.crop((0,0,shown,h)),(x,y))
   else:
    shown=max(1,round(h*p));off=round(20*(1-p)); im.paste(tile.crop((0,max(0,h-shown-off),w,h-off)),(x,y+h-shown))
 def logo(self,im,xy,width):
  key=('logo',width)
  if key not in self.cache:
   logo=self.images['logo'];self.cache[key]=logo.resize((width,round(logo.height*width/logo.width)),Image.Resampling.LANCZOS)
  im.paste(self.cache[key],xy,self.cache[key])
 def header(self,im):
  if self.mobile:
   self.logo(im,(42,34),240)
   self.text(im,'LUXESTYLE.CH',(767,50),19,'medium',MUTED,anchor='ra')
  else:
   self.logo(im,(64,36),280)
   self.text(im,'SCHÖNES FÜR DEINEN ALLTAG',(1216,56),19,'medium',MUTED,tracking=1.8,anchor='ra')
 def heading(self,im,n,title,sub,t,scene):
  m=42 if self.mobile else 64;y=138 if self.mobile else 150
  p=ease(t/.35);self.text(im,n,(m,y),24 if self.mobile else 18,'medium',MUTED,opacity=p,tracking=2.1)
  self.text(im,title,(m,y+35+round((1-p)*12)),70 if self.mobile else 89,'serif',opacity=p,scene=scene if p==1 else'')
  if isinstance(sub,str):sub=[sub]
  for j,s in enumerate(sub):self.text(im,s,(m,y+(132 if self.mobile else 148)+j*35),30 if self.mobile else 25,'sans',MUTED,opacity=ease((t-.10)/.35),scene=scene if t>.5 else'')
 def footer(self,im,txt='LuxeStyle.ch',n=None):
  m=42 if self.mobile else 64;y=self.h-61
  d=ImageDraw.Draw(im);d.line((m,y-18,self.w-m,y-18),fill=LINE,width=1)
  self.text(im,txt,(m,y),27 if self.mobile else 20,'sans',MUTED)
  if n:self.text(im,n,(self.w-m,y),27 if self.mobile else 20,'sans',MUTED,anchor='ra')
 def render(self,frame,record=False):
  start,end,scene=next(s for s in TIMELINE if s[0]<=frame<s[1]);t=(frame-start)/FPS
  hold=('held-scene',scene)
  if (scene=='intro' or t>=1) and hold in self.cache: return self.cache[hold].copy()
  im=Image.new('RGB',(self.w,self.h),BG);self.header(im)
  # The opener is complete on frame 0 for clean poster/loading behaviour.
  a=10 if scene=='intro' else t
  if scene=='intro':
   if self.mobile:
    self.text(im,'Schön leben.',(42,145),80,'serif',scene=scene)
    self.text(im,'Schlau shoppen.',(42,230),76,'italic',scene=scene)
    self.panel(im,'fashion',(42,355,360,548),a,position=(.5,0))
    self.panel(im,'home',(418,355,350,266),a)
    self.panel(im,'gifts',(418,637,350,266),a)
    self.text(im,'Entdecke deine nächste Lieblingsidee.',(42,939),30,'sans',MUTED,scene=scene)
   else:
    self.text(im,'Schön leben.',(64,151),94,'serif',scene=scene)
    self.text(im,'Schlau shoppen.',(64,248),92,'italic',scene=scene)
    self.panel(im,'fashion',(64,390,538,602),a,position=(.5,0))
    self.panel(im,'home',(620,390,596,292),a)
    self.panel(im,'gifts',(620,700,290,292),a)
    self.panel(im,'beauty',(928,700,288,292),a)
    self.text(im,'Entdecke deine nächste Lieblingsidee.',(64,1032),25,'sans',MUTED,scene=scene)
  elif scene=='style':
   self.heading(im,'01 / MODE & ACCESSOIRES','Dein Stil.', ['Damen · Herren · Schuhe · Taschen','Schmuck · Uhren · Beauty'] if self.mobile else'Damen · Herren · Schuhe · Taschen · Schmuck · Uhren · Beauty',t,scene)
   if self.mobile:
    self.panel(im,'fashion',(42,370,403,620),t,position=(.5,0));self.panel(im,'beauty',(461,370,307,302),t,.06)
    self.panel(im,'bag',(461,688,307,302),t,.12)
   else:
    self.panel(im,'fashion',(64,360,536,650),t,position=(.5,0));self.panel(im,'beauty',(618,360,598,315),t,.06)
    self.panel(im,'bag',(618,693,290,317),t,.12);self.panel(im,'watch',(926,693,290,317),t,.18,fit='contain')
   self.footer(im,'Für deinen eigenen Stil.','01')
  elif scene=='home':
   self.heading(im,'02 / WOHNEN & TECHNIK','Dein Zuhause.','Wohnen · Küche · Technik · Gaming',t,scene)
   if self.mobile:
    self.panel(im,'home',(42,342,726,393),t,reveal='right');self.panel(im,'tech',(42,751,355,239),t,.08,fit='contain');self.panel(im,'kitchen',(413,751,355,239),t,.16,fit='contain')
   else:
    self.panel(im,'home',(64,360,766,650),t,reveal='right',position=(.58,.5));self.panel(im,'tech',(848,360,368,315),t,.08,fit='contain');self.panel(im,'kitchen',(848,693,175,317),t,.12,fit='contain');self.panel(im,'gaming',(1041,693,175,317),t,.16,fit='contain')
   self.footer(im,'Ideen für deinen Lieblingsort.','02')
  elif scene=='everyday':
   self.heading(im,'03 / FREIZEIT & FAMILIE','Dein Alltag.', ['Sport & Outdoor · Kinder & Baby','Haustiere'] if self.mobile else'Sport & Outdoor · Kinder & Baby · Haustiere',t,scene)
   if self.mobile:
    self.panel(im,'sport',(42,370,726,368),t,reveal='right');self.panel(im,'paint',(42,754,280,236),t,.08,fit='contain')
    self.text(im,'Kleine Ideen.',(349,796),42,'serif',opacity=ease((t-.2)/.35));self.text(im,'Viel Alltag.',(349,846),42,'italic',opacity=ease((t-.25)/.35))
   else:
    self.panel(im,'sport',(64,360,766,650),t,reveal='right',position=(.43,.5));self.panel(im,'paint',(848,360,368,400),t,.08,fit='contain')
    self.text(im,'Kleine Ideen.',(848,818),43,'serif',opacity=ease((t-.2)/.35));self.text(im,'Viel Alltag.',(848,872),43,'italic',opacity=ease((t-.25)/.35))
   self.footer(im,'Für grosse und kleine Momente.','03')
  elif scene=='ideas':
   self.heading(im,'04 / GESCHENKE & GESTALTEN','Deine Ideen.','Selbst gestalten · Schenken · Entdecken',t,scene)
   if self.mobile:
    self.panel(im,'design',(42,342,407,648),t,position=(.47,.5));self.panel(im,'gifts',(465,342,303,316),t,.08);self.panel(im,'christmas',(465,674,303,316),t,.16,position=(.60,.5))
   else:
    self.panel(im,'design',(64,360,516,650),t,position=(.5,.5));self.panel(im,'gifts',(598,360,618,315),t,.08);self.panel(im,'christmas',(598,693,618,317),t,.16)
   self.footer(im,'Persönlich auswählen. Freude schenken.','04')
  else:
   p=ease(t/.45)
   if self.mobile:
    self.text(im,'Deine nächste',(42,185),65,'serif',opacity=p,scene=scene if p==1 else'');self.text(im,'Lieblingsidee.',(42,258),76,'italic',opacity=p,scene=scene if p==1 else'')
    self.text(im,'Entdecke sie auf',(42,374),30,'sans',MUTED,opacity=p);self.text(im,'luxestyle.ch',(42,417),63,'serif',opacity=p,scene=scene if p==1 else'')
    self.panel(im,'fashion',(42,560,229,388),t,.05,position=(.5,0));self.panel(im,'home',(287,560,229,388),t,.12,position=(.64,.5));self.panel(im,'gifts',(532,560,236,388),t,.19)
   else:
    self.text(im,'Deine nächste Lieblingsidee.',(64,185),79,'serif',opacity=p,scene=scene if p==1 else'')
    self.text(im,'Entdecke sie auf',(64,316),27,'sans',MUTED,opacity=p);self.text(im,'luxestyle.ch',(64,362),78,'serif',opacity=p,scene=scene if p==1 else'')
    self.panel(im,'fashion',(64,526,372,484),t,.05,position=(.5,0));self.panel(im,'home',(454,526,372,484),t,.12,position=(.64,.5));self.panel(im,'gifts',(844,526,372,484),t,.19)
   self.footer(im,'Schön leben. Schlau shoppen.')
  if scene=='intro' or t>=1:self.cache[hold]=im.copy()
  return im

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--assets',type=Path,default=Path(__file__).parent.parent/'assets');ap.add_argument('--output',type=Path,default=Path(__file__).parent);ap.add_argument('--preview',action='store_true');ap.add_argument('--render',nargs='*',choices=['desktop','mobile']);args=ap.parse_args();args.output.mkdir(parents=True,exist_ok=True)
 manifest={'masterId':MASTER_ID,'revision':'r69-website-edit-01','sourceAuthority':'Owner explicitly requested existing website-only materials, edited and cut; no original filmed takes required for this website montage. Review preview, no social advertising or third-party licence certificate.','fps':FPS,'frames':FRAMES,'durationSeconds':20,'audio':False,'timeline':[{'startFrame':a,'endFrameExclusive':b,'scene':c} for a,b,c in TIMELINE],'palette':{'cream':BG,'ink':INK,'taupe':MUTED},'sourceManifestSha256':sha(args.assets/'SOURCES.json'),'fonts':[{'path':p,'sha256':sha(p)} for p in [FONT_SERIF,FONT_ITALIC,FONT_SANS,FONT_MED]],'assets':[{'filename':v,'sha256':sha(args.assets/v)} for v in FILES.values()],'outputs':[]}
 kinds=args.render or ['desktop','mobile']
 if (args.output/'FILM-MANIFEST.json').exists():
  prior=json.loads((args.output/'FILM-MANIFEST.json').read_text())
  manifest['outputs']=[x for x in prior.get('outputs',[]) if not any('-'+k+'-' in x['filename'] for k in kinds)]
 for kind in kinds:
  film=Film(args.assets,kind)
  if args.preview or args.render is None:
   shots=[]
   for f in [0,120,240,360,465,565]:
    im=film.render(f,True);im.save(args.output/f'{kind}-frame-{f:03}.jpg',quality=94);small=im.copy();small.thumbnail((420,390));shots.append(small)
   sheet=Image.new('RGB',(420*3,430*2),BG)
   for i,im in enumerate(shots):sheet.paste(im,((i%3)*420,(i//3)*430))
   sheet.save(args.output/f'{kind}-CONTACT.jpg',quality=93)
  poster=film.render(0,True);poster.save(args.output/f'luxestyle-brand-{kind}-poster.jpg',quality=94)
  if args.render is not None:
   outfile=args.output/f'luxestyle-brand-{kind}-r69.mp4'
   cmd=['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{film.w}x{film.h}','-r',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','19','-vf','format=gbrp,zscale=primariesin=bt709:transferin=iec61966-2-1:matrixin=gbr:rangein=full:primaries=bt709:transfer=bt709:matrix=bt709:range=limited,format=yuv420p,setsar=1','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart','-r',str(FPS),'-frames:v',str(FRAMES),str(outfile)]
   proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
   for f in range(FRAMES):
    proc.stdin.write(film.render(f).tobytes())
    if f%150==0:print(f'{kind}: {f}/{FRAMES}',flush=True)
   proc.stdin.close();ret=proc.wait()
   if ret:raise RuntimeError(f'ffmpeg failed {ret}')
   manifest['outputs'].append({'filename':outfile.name,'width':film.w,'height':film.h,'bytes':outfile.stat().st_size,'sha256':sha(outfile),'poster':f'luxestyle-brand-{kind}-poster.jpg'})
  bounds=list({json.dumps(x,sort_keys=True):x for x in film.text_bounds}.values());(args.output/f'{kind}-text-bounds.json').write_text(json.dumps(bounds,ensure_ascii=False,indent=2)+'\n')
 if args.render is not None:(args.output/'FILM-MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 print('Complete',flush=True)
if __name__=='__main__':main()
