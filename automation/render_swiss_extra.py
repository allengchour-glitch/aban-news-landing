#!/usr/bin/env python3
# LuxeStyle — Swiss-Edition Zusatz: SWISS MADE (Emblem) + ZÜRI (Stadt-Pride). Pillow-only.
import os, math
from PIL import Image, ImageDraw, ImageFont
FONT='/tmp/fonts/Anton.ttf'
OUT=os.path.join(os.path.dirname(__file__),'..','pod','swiss-edition')
ANTHRACITE=(31,35,40,255); OFFWHITE=(244,241,234,255); RED=(213,43,30,255)
W=3000
def font(s): return ImageFont.truetype(FONT,s)
def tsize(f,s): b=f.getbbox(s); return b[2]-b[0],b[3]-b[1],b[0],b[1]
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
    for c in s: w,h,ox,oy=tsize(f,c); d.text((cx-ox,y),c,font=f,fill=fill); cx+=w+tr
    return cx-x
def centered(d,y,s,f,fill,tr=0):
    lw=lwidth(s,f,tr); tracked(d,(W-lw)//2,y,s,f,fill,tr); return lw
def new(): return Image.new('RGBA',(W,2400),(0,0,0,0))
def trim(im,pad=70):
    bb=im.getbbox()
    if not bb: return im
    im=im.crop(bb); o=Image.new('RGBA',(im.width+2*pad,im.height+2*pad),(0,0,0,0)); o.paste(im,(pad,pad),im); return o
def save(im,name): im=trim(im); im.save(os.path.join(OUT,name+'.png')); print(f'  ✓ {name}.png  {im.width}x{im.height}')
def swiss_cross(d,cx,cy,s,sq,cr):
    half=s//2; d.rounded_rectangle([(cx-half,cy-half),(cx+half,cy+half)],radius=s//12,fill=sq)
    arm=s*0.28; th=s*0.18
    d.rectangle([(cx-th/2,cy-arm),(cx+th/2,cy+arm)],fill=cr); d.rectangle([(cx-arm,cy-th/2),(cx+arm,cy+th/2)],fill=cr)

print('🇨🇭 Rendere Swiss-Edition Zusatz …')

# SWISS MADE — Emblem (kleines Kreuz + Typo gestapelt)
im=new(); d=ImageDraw.Draw(im)
swiss_cross(d,W//2,420,440,RED,OFFWHITE)
f=fitfont('SWISS',1500,tr=50); h=tsize(f,'SWISS')[1]
centered(d,760,'SWISS',f,ANTHRACITE,50)
centered(d,760+h+30,'MADE',f,ANTHRACITE,50)
bottom=im.getbbox()[3]
cf=font(110); centered(d,bottom+70,'SCHWIIZER QUALITÄT',cf,RED,16)
save(im,'swiss-made')

# ZÜRI — Stadt-Pride + Koordinaten
im=new(); d=ImageDraw.Draw(im)
f=fitfont('ZÜRI',W-300,tr=40); h=tsize(f,'ZÜRI')[1]
centered(d,300,'ZÜRI',f,ANTHRACITE,40)
bottom=im.getbbox()[3]
cf=font(120); centered(d,bottom+70,'47.37° N · 8.54° E',cf,RED,14)
save(im,'zueri')

print('Fertig → pod/swiss-edition/')
