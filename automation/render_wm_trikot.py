#!/usr/bin/env python3
# LuxeStyle — WM-Trikot „Selbst gestalten" Blanks (Editor-Vorschau Vorne/Hinten)
# Kunde tippt im Editor Name + Nummer als Text-Ebenen drauf. Output: pod/templates/
import os, math
from PIL import Image, ImageDraw, ImageFont
FONT='/tmp/fonts/Anton.ttf'
OUT=os.path.join(os.path.dirname(__file__),'..','pod','templates'); os.makedirs(OUT,exist_ok=True)
RED=(206,32,39,255); WHITE=(255,255,255,255); DARKRED=(165,22,30,255); GHOST=(255,255,255,70)
W,H=1200,1400
def font(s): return ImageFont.truetype(FONT,s)
def ctext(d,cx,y,s,f,fill,track=0):
    tw=sum(d.textbbox((0,0),ch,font=f)[2] for ch in s)+track*(len(s)-1); x=cx-tw//2
    for ch in s:
        d.text((x,y),ch,font=f,fill=fill); x+=d.textbbox((0,0),ch,font=f)[2]+track

def jersey(draw):
    """Rotes Trikot-Silhouette mittig (Body + Ärmel + Kragen)."""
    cx=W//2
    # Ärmel
    draw.polygon([(cx-300,300),(cx-470,470),(cx-360,560),(cx-210,420)],fill=DARKRED)
    draw.polygon([(cx+300,300),(cx+470,470),(cx+360,560),(cx+210,420)],fill=DARKRED)
    # Body
    draw.polygon([(cx-300,300),(cx-250,1180),(cx+250,1180),(cx+300,300),(cx+150,260),(cx-150,260)],fill=RED)
    # Kragen (Crew)
    draw.ellipse([(cx-110,230),(cx+110,330)],fill=(0,0,0,0))
    draw.arc([(cx-110,230),(cx+110,330)],0,180,fill=WHITE,width=14)

def swiss_cross(d,cx,cy,s):
    half=s//2; d.rounded_rectangle([(cx-half,cy-half),(cx+half,cy+half)],radius=s//12,fill=WHITE)
    arm=s*0.28; th=s*0.18
    d.rectangle([(cx-th/2,cy-arm),(cx+th/2,cy+arm)],fill=RED)
    d.rectangle([(cx-arm,cy-th/2),(cx+arm,cy+th/2)],fill=RED)

# FRONT: rotes Trikot + Schweizer Kreuz auf der Brust + Hinweis
im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
jersey(d)
swiss_cross(d,W//2,560,150)
ctext(d,W//2,820,'SCHWIIZ',font(110),WHITE,track=8)
ctext(d,W//2,1230,'↑ DEIN DESIGN VORNE',font(40),(120,120,120,255),track=4)
im.save(os.path.join(OUT,'wm-trikot-front.png')); print('  ✓ wm-trikot-front.png')

# BACK: rotes Trikot + Platzhalter NAME + grosse NUMMER (Ghost) + Hinweis
im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
jersey(d)
ctext(d,W//2,470,'DEIN NAME',font(90),WHITE,track=6)
ctext(d,W//2,600,'10',font(360),GHOST)
ctext(d,W//2,1230,'↑ TIPPE NAME & NUMMER EIN',font(40),(120,120,120,255),track=3)
im.save(os.path.join(OUT,'wm-trikot-back.png')); print('  ✓ wm-trikot-back.png')
print('Fertig. pod/templates/')
