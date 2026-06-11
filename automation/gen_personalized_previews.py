#!/usr/bin/env python3
# Gebrandete „Selbst gestalten"-Vorschaubilder — PRO PRODUKT eine eigene, erkennbare Silhouette
# (Tasse/Shirt/Tasche/Kissen/Poster/Magnet/Mauspad/Bügeltransfer) + anfängerfreundlicher Hinweis.
import os, math
from PIL import Image, ImageDraw, ImageFont

FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONTB="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
OUT="pod/personalized"; os.makedirs(OUT, exist_ok=True)
S=1000
GOLD=(200,169,106); WHITE=(238,239,244); MUT=(165,167,178); LINE=(205,207,216); DARKP=(28,28,34)

LABELS={"tasse":"Deine Tasse","shirt":"Dein T-Shirt","kissen":"Dein Kissen","tote":"Deine Tasche",
        "poster":"Dein Poster","magnet":"Dein Magnet","mousepad":"Dein Mauspad","buegeltransfer":"Dein Bügeltransfer"}

def font(b,sz): return ImageFont.truetype(FONTB if b else FONT, sz)
def ctext(d,y,txt,f,fill,ls=0):
    if ls:
        total=sum(d.textlength(c,font=f)+ls for c in txt)-ls; x=(S-total)/2
        for c in txt: d.text((x,y),c,font=f,fill=fill); x+=d.textlength(c,font=f)+ls
    else:
        d.text(((S-d.textlength(txt,font=f))/2,y),txt,font=f,fill=fill)

# „Dein Foto hier"-Platzhalter: Rahmen + Sonne + Berge + Plus-Badge, in beliebige Box skaliert
def photo_ph(d,x0,y0,x1,y1):
    w,h=x1-x0,y1-y0; mn=min(w,h)
    d.rounded_rectangle([x0,y0,x1,y1],radius=max(8,int(mn*0.10)),outline=GOLD,width=5)
    d.ellipse([x0+0.16*w,y0+0.14*h,x0+0.34*w,y0+0.14*h+0.18*mn],fill=GOLD)
    by=y1-0.12*h
    d.polygon([(x0+0.10*w,by),(x0+0.44*w,y0+0.42*h),(x0+0.70*w,by)],fill=WHITE)
    d.polygon([(x0+0.52*w,by),(x0+0.78*w,y0+0.55*h),(x1-0.04*w,by)],fill=MUT)
    br=max(14,int(mn*0.15)); bx,byb=x1,y0
    d.ellipse([bx-br,byb-br,bx+br,byb+br],fill=GOLD)
    d.line([bx-br*0.5,byb,bx+br*0.5,byb],fill=DARKP,width=max(4,int(br*0.35)))
    d.line([bx,byb-br*0.5,bx,byb+br*0.5],fill=DARKP,width=max(4,int(br*0.35)))

# ── Produkt-Silhouetten (Outline) + Foto-Box ──
def sil_tasse(d):
    d.rounded_rectangle([360,205,585,500],radius=22,outline=LINE,width=7)          # Korpus
    d.arc([560,250,690,455],start=-78,end=78,fill=LINE,width=7)                     # Henkel
    photo_ph(d,392,250,560,455)
def sil_shirt(d):
    pts=[(415,205),(360,225),(300,300),(345,355),(400,322),(400,520),(600,520),
         (600,322),(655,355),(700,300),(640,225),(585,205),(540,250),(460,250)]
    d.line(pts+[pts[0]],fill=LINE,width=7,joint="curve")
    photo_ph(d,425,300,575,475)
def sil_kissen(d):
    d.rounded_rectangle([320,215,680,515],radius=46,outline=LINE,width=7)
    for cx,cy in [(320,215),(680,215),(320,515),(680,515)]:                         # Ecken-Tupfer
        d.ellipse([cx-9,cy-9,cx+9,cy+9],fill=LINE)
    photo_ph(d,360,255,640,475)
def sil_tote(d):
    d.rounded_rectangle([350,255,650,520],radius=14,outline=LINE,width=7)           # Beutel
    d.arc([388,150,492,300],start=180,end=360,fill=LINE,width=7)                    # Henkel links
    d.arc([508,150,612,300],start=180,end=360,fill=LINE,width=7)                    # Henkel rechts
    photo_ph(d,382,288,618,492)
def sil_poster(d):
    d.rectangle([385,180,615,520],outline=LINE,width=7)                             # Rahmen
    d.line([500,150,500,180],fill=LINE,width=5); d.ellipse([493,143,507,157],outline=LINE,width=4)  # Aufhänger
    photo_ph(d,408,205,592,495)
def sil_magnet(d):
    d.rounded_rectangle([395,255,605,465],radius=20,outline=LINE,width=7)
    photo_ph(d,420,280,580,440)
def sil_mousepad(d):
    d.rounded_rectangle([300,300,700,470],radius=26,outline=LINE,width=7)
    photo_ph(d,328,322,672,450)
def sil_buegeltransfer(d):
    # „Transfer-Bogen": gestrichelter Schnittrahmen + Foto + kleines Bügeleisen
    x0,y0,x1,y1=360,200,640,470; dash=16
    x=x0
    while x<x1: d.line([x,y0,min(x+dash,x1),y0],fill=GOLD,width=4); d.line([x,y1,min(x+dash,x1),y1],fill=GOLD,width=4); x+=2*dash
    y=y0
    while y<y1: d.line([x0,y,x0,min(y+dash,y1)],fill=GOLD,width=4); d.line([x1,y,x1,min(y+dash,y1)],fill=GOLD,width=4); y+=2*dash
    photo_ph(d,388,228,612,442)
    d.rounded_rectangle([430,500,570,540],radius=10,outline=LINE,width=6)            # Bügeleisen-Sohle
    d.line([445,500,470,476],fill=LINE,width=6); d.line([555,500,530,476],fill=LINE,width=6)
    d.arc([470,468,530,500],start=180,end=360,fill=LINE,width=6)                     # Griff

SIL={"tasse":sil_tasse,"shirt":sil_shirt,"kissen":sil_kissen,"tote":sil_tote,
     "poster":sil_poster,"magnet":sil_magnet,"mousepad":sil_mousepad,"buegeltransfer":sil_buegeltransfer}

for slug,label in LABELS.items():
    img=Image.new("RGB",(S,S)); px=img.load()
    for y in range(S):
        t=y/S; c=(int(38+t*14),int(38+t*14),int(46+t*16))
        for x in range(S): px[x,y]=c
    d=ImageDraw.Draw(img)
    d.rounded_rectangle([26,26,S-26,S-26],radius=28,outline=(70,72,84),width=3)
    ctext(d,58,"L U X E S T Y L E",font(True,30),GOLD,ls=2)
    SIL[slug](d)
    ctext(d,600,"SELBST GESTALTEN",font(True,70),WHITE)
    ctext(d,684,f"{label} · dein Foto",font(True,38),GOLD)
    ctext(d,752,"So einfach: Foto hochladen · gestalten · fertig",font(False,28),MUT)
    img.save(f"{OUT}/{slug}.png","PNG"); print("✓",slug)
print("fertig")
