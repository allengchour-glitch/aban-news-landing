#!/usr/bin/env python3
# LuxeStyle — Swiss-Edition Welle 2: Line-Art (Berge/Natur), programmatisch (Pillow, keine KI).
# Monoline-Stil, Design-System-Farben. Output: pod/swiss-edition/*.png (transparent, Druckauflösung).
import os
from PIL import Image, ImageDraw, ImageFont

FONT = '/tmp/fonts/Anton.ttf'
OUT  = os.path.join(os.path.dirname(__file__), '..', 'pod', 'swiss-edition')
ANTHRACITE=(31,35,40,255); OFFWHITE=(244,241,234,255); RED=(213,43,30,255); SAGE=(124,140,107,255)
W=3000

def font(s): return ImageFont.truetype(FONT, s)
def tsize(f,s): b=f.getbbox(s); return b[2]-b[0], b[3]-b[1], b[0], b[1]
def lwidth(s,f,tr=0): return sum(tsize(f,c)[0] for c in s)+tr*(len(s)-1)
def fitfont(s,maxw,start=900,tr=0):
    sz=start
    while sz>40:
        f=font(sz)
        if lwidth(s,f,tr)<=maxw: return f
        sz-=10
    return font(40)
def tracked(d,x,y,s,f,fill,tr=0):
    cx=x
    for c in s:
        w,h,ox,oy=tsize(f,c); d.text((cx-ox,y),c,font=f,fill=fill); cx+=w+tr
    return cx-x
def centered(d,y,s,f,fill,tr=0):
    lw=lwidth(s,f,tr); tracked(d,(W-lw)//2,y,s,f,fill,tr); return lw
def new(): return Image.new('RGBA',(W,2600),(0,0,0,0))
def trim(im,pad=70):
    bb=im.getbbox()
    if not bb: return im
    im=im.crop(bb); out=Image.new('RGBA',(im.width+2*pad,im.height+2*pad),(0,0,0,0)); out.paste(im,(pad,pad),im); return out
def save(im,name):
    im=trim(im); im.save(os.path.join(OUT,name+'.png')); print(f'  ✓ {name}.png  {im.width}x{im.height}')

def scale_pts(pts, x0, y0, w, h):
    return [(x0+px*w, y0+py*h) for px,py in pts]

print('🏔️ Rendere Swiss-Edition Welle 2 (Line-Art) …')

# 1) MATTERHORN monoline + ZERMATT 4478
im=new(); d=ImageDraw.Draw(im)
LW=26  # Linienstärke
mx0,my0,mw,mh = 600, 120, 1800, 1100
# asymmetrische Matterhorn-Ridge (normiert 0..1, y nach unten), klassische gebogene Spitze links-steil
ridge=[(0.02,1.0),(0.40,0.34),(0.47,0.12),(0.53,0.04),(0.57,0.15),(0.66,0.40),(0.78,0.30),(0.99,1.0)]
pts=scale_pts(ridge,mx0,my0,mw,mh)
d.line(pts,fill=ANTHRACITE,width=LW,joint='curve')
# dezente Schnee-Kappe direkt unter der Spitze (kurz, sauber)
snow=[(0.46,0.22),(0.50,0.30),(0.54,0.22)]
d.line(scale_pts(snow,mx0,my0,mw,mh),fill=ANTHRACITE,width=int(LW*0.55),joint='curve')
# Boden-Linie
d.line([(mx0-40,my0+mh),(mx0+mw+40,my0+mh)],fill=ANTHRACITE,width=LW)
# Text — Caption garantiert unter ZERMATT (echte Unterkante messen)
f=fitfont('ZERMATT',1500,tr=50); centered(d,my0+mh+100,'ZERMATT',f,ANTHRACITE,50)
bottom=im.getbbox()[3]
cf=font(120); centered(d,bottom+70,'4478 M Ü. M.',cf,RED,22)
save(im,'matterhorn-zermatt')

# 2) ALPEN-PANORAMA monoline (Bergkette als Brustband) + SCHWIIZER ALPE + Sonne
im=new(); d=ImageDraw.Draw(im)
LW=24; bx0,by0,bw,bh=250,250,2500,820
# Sonne (Kreis-Outline) hinter den Bergen
d.ellipse([W//2-150,by0-60,W//2+150,by0+240],outline=RED,width=LW)
# Bergkette: überlappende Dreiecks-Peaks (eine Polylinie)
peaks=[(0.0,1.0),(0.13,0.45),(0.26,0.85),(0.40,0.18),(0.55,0.80),(0.68,0.35),(0.82,0.78),(1.0,1.0)]
d.line(scale_pts(peaks,bx0,by0,bw,bh),fill=ANTHRACITE,width=LW,joint='curve')
d.line([(bx0-30,by0+bh),(bx0+bw+30,by0+bh)],fill=ANTHRACITE,width=LW)
f=fitfont('SCHWIIZER ALPE',2200,tr=40); centered(d,by0+bh+90,'SCHWIIZER ALPE',f,ANTHRACITE,40)
save(im,'schwiizer-alpe')

# 3) EDELWEISS (stilisiert, monoline) + EDELWEISS-Schriftzug
im=new(); d=ImageDraw.Draw(im)
import math
cx,cy=W//2,720; petL=420; petW=120
for i in range(8):
    a=math.pi*2*i/8
    tip=(cx+math.cos(a)*petL, cy+math.sin(a)*petL)
    s1=(cx+math.cos(a-0.18)*petW, cy+math.sin(a-0.18)*petW)
    s2=(cx+math.cos(a+0.18)*petW, cy+math.sin(a+0.18)*petW)
    d.line([s1,tip,s2],fill=ANTHRACITE,width=20,joint='curve')
# Blütenmitte (kleine Punkte)
for i in range(6):
    a=math.pi*2*i/6; d.ellipse([cx+math.cos(a)*55-26,cy+math.sin(a)*55-26,cx+math.cos(a)*55+26,cy+math.sin(a)*55+26],fill=RED)
f=fitfont('EDELWEISS',1700,tr=48); centered(d,cy+petL+120,'EDELWEISS',f,ANTHRACITE,48)
save(im,'edelweiss')

print('Fertig → pod/swiss-edition/')
