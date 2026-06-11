#!/usr/bin/env python3
# Erzeugt gebrandete „Selbst gestalten"-Vorschaubilder (sichtbar, NICHT weiss) für die Personalisiert-Produkte.
import os
from PIL import Image, ImageDraw, ImageFont

FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONTB="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
OUT="pod/personalized"; os.makedirs(OUT, exist_ok=True)
S=1000
GOLD=(200,169,106); WHITE=(245,245,248); MUT=(170,172,182)

TYPES={
 "tasse":"Deine Tasse","shirt":"Dein T-Shirt","kissen":"Dein Kissen",
 "tote":"Deine Tasche","poster":"Dein Poster","magnet":"Dein Magnet","mousepad":"Dein Mauspad",
 "buegeltransfer":"Dein Bügeltransfer",
}

def font(b,sz): return ImageFont.truetype(FONTB if b else FONT, sz)
def ctext(d,y,txt,f,fill,ls=0):
    if ls:
        # letterspaced
        widths=[d.textlength(c,font=f)+ls for c in txt]; total=sum(widths)-ls
        x=(S-total)/2
        for c in txt:
            d.text((x,y),c,font=f,fill=fill); x+=d.textlength(c,font=f)+ls
    else:
        w=d.textlength(txt,font=f); d.text(((S-w)/2,y),txt,font=f,fill=fill)

def upload_icon(d,cx,cy,r):
    # gerahmtes Bild-Icon mit Bergmotiv + Plus-Badge (gezeichnet, kein Emoji)
    x0,y0,x1,y1=cx-r,cy-r,cx+r,cy+r
    d.rounded_rectangle([x0,y0,x1,y1],radius=int(r*0.18),outline=GOLD,width=7)
    # Sonne
    d.ellipse([x0+r*0.45,y0+r*0.42,x0+r*0.75,y0+r*0.72],fill=GOLD)
    # Berge
    d.polygon([(x0+r*0.15,y1-r*0.25),(x0+r*0.75,y0+r*0.85),(x0+r*1.15,y1-r*0.25)],fill=WHITE)
    d.polygon([(x0+r*0.9,y1-r*0.25),(x0+r*1.35,y0+r*1.0),(x0+r*1.85,y1-r*0.25)],fill=MUT)
    # Plus-Badge
    bx,by,br=x1-6,y0+6,int(r*0.30)
    d.ellipse([bx-br,by-br,bx+br,by+br],fill=GOLD)
    d.line([bx-br*0.5,by,bx+br*0.5,by],fill=(30,30,36),width=6)
    d.line([bx,by-br*0.5,bx,by+br*0.5],fill=(30,30,36),width=6)

for slug,label in TYPES.items():
    img=Image.new("RGB",(S,S))
    px=img.load()
    for y in range(S):  # vertikaler Verlauf charcoal
        t=y/S; r=int(38+ t*14); g=int(38+t*14); b=int(46+t*16)
        for x in range(S): px[x,y]=(r,g,b)
    d=ImageDraw.Draw(img)
    d.rounded_rectangle([26,26,S-26,S-26],radius=28,outline=(70,72,84),width=3)
    ctext(d,70,"L U X E S T Y L E",font(True,30),GOLD,ls=2)
    upload_icon(d,S//2,355,150)
    ctext(d,560,"SELBST GESTALTEN",font(True,76),WHITE)
    ctext(d,660,f"{label} · dein Foto",font(True,40),GOLD)
    ctext(d,742,"Bild hochladen · Text · Sticker",font(False,32),MUT)
    ctext(d,790,"— direkt im Editor —",font(False,30),MUT)
    img.save(f"{OUT}/{slug}.png","PNG")
    print("✓",slug)
print("fertig")
