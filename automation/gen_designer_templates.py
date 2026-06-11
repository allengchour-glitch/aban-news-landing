#!/usr/bin/env python3
# Helle Produkt-Vorlagen für die EDITOR-CANVAS (data-img-front): weisses Produkt auf hellem Grund
# + gestrichelte „Designfläche", damit der Kunde direkt auf dem Produkt gestaltet (statt leerem Kasten).
import os
from PIL import Image, ImageDraw, ImageFont
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
OUT="pod/templates"; os.makedirs(OUT, exist_ok=True)
BG=(244,241,236); PROD=(255,255,255); EDGE=(208,203,192); SHADE=(247,245,241); DASH=(196,170,120); HINT=(183,178,167)

def font(sz): return ImageFont.truetype(FONT, sz)
def hint(d,box,txt="Dein Design hier",col=HINT):
    x0,y0,x1,y1=box; f=font(26)
    w=d.textlength(txt,font=f); d.text(((x0+x1-w)/2,(y0+y1)/2-16),txt,font=f,fill=col)
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
def t_shirt(fill=PROD,edge=EDGE,hintcol=HINT):
    img,d=base()
    pts=[(420,230),(360,250),(285,335),(340,400),(405,365),(405,640),(645,640),(645,365),(710,400),(765,335),(690,250),(630,230),(575,285),(475,285)]
    d.polygon(pts,fill=fill,outline=edge)
    da=[440,345,610,575]; dashed(d,da); hint(d,da,col=hintcol); return img
def t_shirt_white(): return t_shirt(PROD,EDGE,HINT)
def t_shirt_black(): return t_shirt((40,40,44),(78,78,84),(196,196,202))
def t_shirt_navy():  return t_shirt((30,42,74),(58,72,108),(196,204,220))
def t_tote():
    img,d=base()
    d.rounded_rectangle([330,310,670,660],radius=10,fill=PROD,outline=EDGE,width=6)
    d.arc([388,180,478,362],180,360,fill=EDGE,width=10); d.arc([522,180,612,362],180,360,fill=EDGE,width=10)
    da=[372,360,628,620]; dashed(d,da); hint(d,da); return img
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

GEN={"tasse":t_tasse,"shirt":t_shirt_white,"tote":t_tote,"kissen":t_kissen,"magnet":t_magnet,
     "mousepad":t_mousepad,"buegeltransfer":t_buegeltransfer,"poster":t_poster,
     "shirt-white":t_shirt_white,"shirt-black":t_shirt_black,"shirt-navy":t_shirt_navy}
for slug,fn in GEN.items():
    fn().save(f"{OUT}/{slug}.png","PNG"); print("✓",slug)
print("fertig")
