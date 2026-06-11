#!/usr/bin/env python3
# Helle Produkt-Vorlagen für die EDITOR-CANVAS (data-img-front): weisses Produkt auf hellem Grund
# + gestrichelte „Designfläche", damit der Kunde direkt auf dem Produkt gestaltet (statt leerem Kasten).
import os
from PIL import Image, ImageDraw, ImageFont
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
OUT="pod/templates"; os.makedirs(OUT, exist_ok=True)
BG=(244,241,236); PROD=(255,255,255); EDGE=(208,203,192); SHADE=(247,245,241); DASH=(196,170,120); HINT=(183,178,167)

def font(sz): return ImageFont.truetype(FONT, sz)
def hint(d,box,txt="Dein Design hier"):
    x0,y0,x1,y1=box; f=font(26)
    w=d.textlength(txt,font=f); d.text(((x0+x1-w)/2,(y0+y1)/2-16),txt,font=f,fill=HINT)
def dashed(d,box):
    x0,y0,x1,y1=box; s=18
    x=x0
    while x<x1: d.line([x,y0,min(x+s,x1),y0],fill=DASH,width=3); d.line([x,y1,min(x+s,x1),y1],fill=DASH,width=3); x+=2*s
    y=y0
    while y<y1: d.line([x0,y,x0,min(y+s,y1)],fill=DASH,width=3); d.line([x1,y,x1,min(y+s,y1)],fill=DASH,width=3); y+=2*s

def base(W=1000,H=1000):
    img=Image.new("RGB",(W,H),BG); return img, ImageDraw.Draw(img)

def t_tasse():
    img,d=base()
    d.rounded_rectangle([320,250,610,600],radius=26,fill=PROD,outline=EDGE,width=6)
    d.arc([585,300,720,540],-78,78,fill=EDGE,width=14)
    da=[360,300,560,540]; dashed(d,da); hint(d,da); return img
def t_shirt():
    img,d=base()
    pts=[(420,230),(360,250),(285,335),(340,400),(405,365),(405,640),(645,640),(645,365),(710,400),(765,335),(690,250),(630,230),(575,285),(475,285)]
    d.polygon(pts,fill=PROD,outline=EDGE);
    da=[440,345,610,575]; dashed(d,da); hint(d,da); return img
def t_tote():
    img,d=base()
    d.rounded_rectangle([320,300,680,640],radius=16,fill=PROD,outline=EDGE,width=6)
    d.arc([372,180,512,360],180,360,fill=EDGE,width=12); d.arc([488,180,628,360],180,360,fill=EDGE,width=12)
    da=[370,350,630,600]; dashed(d,da); hint(d,da); return img
def t_kissen():
    img,d=base()
    d.rounded_rectangle([250,250,750,750],radius=60,fill=PROD,outline=EDGE,width=6)
    da=[330,330,670,670]; dashed(d,da); hint(d,da); return img
def t_magnet():
    img,d=base()
    d.rounded_rectangle([330,330,670,670],radius=26,fill=PROD,outline=EDGE,width=6)
    da=[370,370,630,630]; dashed(d,da); hint(d,da); return img
def t_mousepad():
    img,d=base()
    d.rounded_rectangle([220,360,780,640],radius=30,fill=PROD,outline=EDGE,width=6)
    da=[260,395,740,605]; dashed(d,da); hint(d,da); return img
def t_buegeltransfer():
    img,d=base()
    d.rounded_rectangle([300,250,700,720],radius=14,fill=PROD,outline=EDGE,width=6)
    da=[345,300,655,670]; dashed(d,da); hint(d,da); return img
def t_poster():
    img,d=base(1000,1414)
    d.rectangle([120,120,880,1294],fill=PROD,outline=EDGE,width=6)
    da=[160,160,840,1254]; dashed(d,da); hint(d,da); return img

GEN={"tasse":t_tasse,"shirt":t_shirt,"tote":t_tote,"kissen":t_kissen,"magnet":t_magnet,
     "mousepad":t_mousepad,"buegeltransfer":t_buegeltransfer,"poster":t_poster}
for slug,fn in GEN.items():
    fn().save(f"{OUT}/{slug}.png","PNG"); print("✓",slug)
print("fertig")
