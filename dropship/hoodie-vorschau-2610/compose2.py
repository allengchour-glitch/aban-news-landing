import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy import ndimage as ndi
D='/tmp/vz/gem/'; O=D+'final/'
LOGO=Image.open(D+'logo_4k.png').convert('RGB')
PXCM=19.0   # Pixel je cm bei Grösse L im Foto (Brustbreite ca. 58 cm ≙ ~1100 px)
INTER='/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf'
RED=(200,16,46)  # #c8102e wie in der Offerte

def logo_rgba(w):
    h=round(LOGO.size[1]*w/LOGO.size[0]); im=LOGO.resize((w,h),Image.LANCZOS)
    a=np.asarray(im).astype(np.float32); mx=a.max(axis=2)
    t=np.clip((mx-8)/(42-8),0,1); al=t*t*(3-2*t)       # fast schwarz → durchsichtig (der Hoodie ist selbst schwarz)
    return a,al

def textmask(txt,capmm,scale):
    cap_px=capmm/10*PXCM*scale; size=int(cap_px/0.727)
    f=ImageFont.truetype(INTER,size); tmp=Image.new('L',(int(size*len(txt)*0.9)+20,int(size*1.4)),0)
    d=ImageDraw.Draw(tmp); d.text((10,0),txt,font=f,fill=255)
    bb=tmp.getbbox(); return tmp.crop(bb)

def shade(base,cx,cy,w,h):
    """Falten und Licht des Stoffes an der Druckstelle: weiche Helligkeit der Umgebung relativ zum Mittel."""
    g=np.asarray(base.convert('L')).astype(np.float32)
    y0,y1=max(cy-h,0),min(cy+h,g.shape[0]); x0,x1=max(cx-w,0),min(cx+w,g.shape[1])
    reg=g[y0:y1,x0:x1]; sm=ndi.gaussian_filter(reg,25); ref=np.median(sm)+1e-3
    s=np.clip(sm/ref,0.80,1.20); out=np.ones_like(g); out[y0:y1,x0:x1]=s
    return out

def paste(base,la,lal,x,y,sh):
    a=np.asarray(base).astype(np.float32); h,w=lal.shape
    reg=a[y:y+h,x:x+w]; s=sh[y:y+h,x:x+w][...,None]
    # Stofftextur (Hochpass) leicht über den Druck legen
    g=np.asarray(base.convert('L')).astype(np.float32)[y:y+h,x:x+w]; tex=(g-ndi.gaussian_filter(g,3))[...,None]*0.5
    lg=la*s+tex
    al=ndi.gaussian_filter(lal,0.6)[...,None]
    a[y:y+h,x:x+w]=reg*(1-al)+np.clip(lg,0,255)*al
    return Image.fromarray(a.clip(0,255).astype(np.uint8))

def paste_text(base,txt,cx,top,sh,capmm=12):
    m=textmask(txt,capmm,1.0); a=np.asarray(base).astype(np.float32); h,w=m.size[1],m.size[0]
    x=cx-w//2; y=top; al=np.asarray(m).astype(np.float32)[...,None]/255
    reg=a[y:y+h,x:x+w]; s=sh[y:y+h,x:x+w][...,None]
    a[y:y+h,x:x+w]=reg*(1-al)+np.array(RED,dtype=np.float32)*s*al
    return Image.fromarray(a.clip(0,255).astype(np.uint8)),(x,y,w,h)

# Bild, Ansicht, Mitte x, Oberkante Logo y, Name
SPEC={'B1':('front',872,500,'ROBIN'),'B2f':('back',866,652,None),'B3':('front',850,540,'ALEX'),'B4':('back',878,697,None),
      'A1':('front',868,510,'ROBIN'),'A2':('back',878,652,None),'A3f':('front',855,535,'ALEX'),'A4f':('back',922,680,None)}
res={}
for n,(view,cx,top,name) in SPEC.items():
    base=Image.open(D+n+'.png').convert('RGB')
    if view=='front':
        w=int(9*PXCM); lx=cx+300-w//2; la,lal=logo_rgba(w); sh=shade(base,lx+w//2,top+la.shape[0]//2,w*2,w*2)
        out=paste(base,la,lal,lx,top,sh); box=(lx,top,w,la.shape[0])
        out,tb=paste_text(out,name,lx+w//2,top+la.shape[0]+int(0.9*PXCM),sh)
        res[n]=dict(logo=box,text=tb)
    else:
        w=int(24*PXCM); lx=cx-w//2; la,lal=logo_rgba(w); sh=shade(base,cx,top+la.shape[0]//2,w,w)
        out=paste(base,la,lal,lx,top,sh); res[n]=dict(logo=(lx,top,w,la.shape[0]))
    out.save(O+n+'_final.png'); print(n,res[n])
import json; json.dump(res,open(O+'pos.json','w'))
