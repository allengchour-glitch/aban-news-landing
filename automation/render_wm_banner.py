#!/usr/bin/env python3
# LuxeStyle — WM-2026 Hero-Banner (Collection/Startseite). Pillow. Output: pod/wm-2026/wm-hero-banner.png
import os, math
from PIL import Image, ImageDraw, ImageFont
FONT='/tmp/fonts/Anton.ttf'
OUT=os.path.join(os.path.dirname(__file__),'..','pod','wm-2026'); os.makedirs(OUT,exist_ok=True)
W,H=1800,1000
RED=(198,28,35,255); RED2=(170,20,28,255); WHITE=(255,255,255,255); CREAM=(245,242,235,255)
def font(s): return ImageFont.truetype(FONT,s)
im=Image.new('RGBA',(W,H),RED)
d=ImageDraw.Draw(im)
# subtiler diagonaler Ton
for i in range(0,W,120): d.polygon([(i,0),(i+60,0),(i-200+60,H),(i-200,H)],fill=RED2)
def tw(s,f,tr=0): return sum(d.textbbox((0,0),c,font=f)[2] for c in s)+tr*(len(s)-1)
def text(x,y,s,f,fill,tr=0):
    cx=x
    for c in s: d.text((cx,y),c,font=f,fill=fill); cx+=d.textbbox((0,0),c,font=f)[2]+tr
# Links: Text
text(110,250,'WM 2026',font(190),WHITE,tr=6)
text(116,470,'HOPP SCHWIIZ',font(120),WHITE,tr=4)
d.rounded_rectangle([(120,650),(120+560,740)],radius=12,fill=WHITE)
text(150,662,'TRIKOTS · FAN-ARTIKEL',font(56),RED,tr=3)
# Rechts: Fussball + Schweizer Kreuz
def ball(cx,cy,r):
    d.ellipse([(cx-r,cy-r),(cx+r,cy+r)],fill=WHITE,outline=(30,30,30,255),width=max(6,r//22))
    pent=[(cx+r*0.42*math.cos(-math.pi/2+k*2*math.pi/5),cy+r*0.42*math.sin(-math.pi/2+k*2*math.pi/5)) for k in range(5)]
    d.polygon(pent,fill=(25,25,28,255))
    for k in range(5):
        a=-math.pi/2+k*2*math.pi/5
        d.line([(cx+r*0.42*math.cos(a),cy+r*0.42*math.sin(a)),(cx+r*0.82*math.cos(a),cy+r*0.82*math.sin(a))],fill=(30,30,30,255),width=max(5,r//26))
ball(1380,500,300)
# Schweizer Kreuz oben rechts
cx,cy,s=1640,250,170; half=s//2
d.rounded_rectangle([(cx-half,cy-half),(cx+half,cy+half)],radius=s//12,fill=WHITE)
arm=s*0.28; th=s*0.18
d.rectangle([(cx-th/2,cy-arm),(cx+th/2,cy+arm)],fill=RED)
d.rectangle([(cx-arm,cy-th/2),(cx+arm,cy+th/2)],fill=RED)
im.convert('RGB').save(os.path.join(OUT,'wm-hero-banner.png'))
print('  ✓ wm-hero-banner.png', W,'x',H)
