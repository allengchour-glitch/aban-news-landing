#!/usr/bin/env python3
# LuxeStyle — WM-Trikot „Selbst gestalten" Blanks (realistischer Trikot-Look, 4 Farben, Vorne/Hinten)
# Kunde tippt im Editor Name + Nummer als Text-Ebenen. Output: pod/templates/wm-trikot-<farbe>-<seite>.png
import os, math
from PIL import Image, ImageDraw, ImageFont
FONT='/tmp/fonts/Anton.ttf'
OUT=os.path.join(os.path.dirname(__file__),'..','pod','templates'); os.makedirs(OUT,exist_ok=True)
W,H=1200,1450; CX=W//2
def font(s): return ImageFont.truetype(FONT,s)
WHITE=(255,255,255,255); RED=(206,32,39,255)

# Farbwelten: base, panel(dunkler), trim, ink(Schrift/Nummer), cross_sq, cross_arm
COLORWAYS={
 'rot':    dict(base=(206,32,39,255),  panel=(186,26,33,255),  trim=WHITE, ink=WHITE, sq=WHITE, arm=(206,32,39,255)),
 'weiss':  dict(base=(244,244,244,255),panel=(232,232,232,255),trim=RED,   ink=RED,   sq=RED,   arm=WHITE),
 'schwarz':dict(base=(28,28,30,255),   panel=(18,18,20,255),   trim=WHITE, ink=WHITE, sq=WHITE, arm=(28,28,30,255)),
 'blau':   dict(base=(24,58,140,255),  panel=(20,50,120,255),  trim=WHITE, ink=WHITE, sq=WHITE, arm=(24,58,140,255)),
}
def ctext(d,cx,y,s,f,fill,track=0):
    tw=sum(d.textbbox((0,0),ch,font=f)[2] for ch in s)+track*(len(s)-1); x=cx-tw//2
    for ch in s:
        d.text((x,y),ch,font=f,fill=fill); x+=d.textbbox((0,0),ch,font=f)[2]+track
def body_poly():
    return [(CX-300,310),(CX-345,470),(CX-255,500),(CX-235,1190),(CX+235,1190),
            (CX+255,500),(CX+345,470),(CX+300,310),(CX+150,275),(CX-150,275)]
def jersey(base,c):
    d=ImageDraw.Draw(base)
    for sgn in (-1,1):
        d.polygon([(CX+sgn*295,315),(CX+sgn*475,470),(CX+sgn*395,575),(CX+sgn*235,490)],fill=c['panel'])
        d.line([(CX+sgn*475,470),(CX+sgn*395,575)],fill=c['trim'],width=22)
    mask=Image.new('L',(W,H),0); ImageDraw.Draw(mask).polygon(body_poly(),fill=255)
    stripes=Image.new('RGBA',(W,H),c['base']); sd=ImageDraw.Draw(stripes)
    for i in range(0,W,92): sd.rectangle([(i,0),(i+46,H)],fill=c['panel'])
    base.paste(stripes,(0,0),mask)
    d.line([(CX-300,330),(CX-250,1180)],fill=c['trim'],width=12)
    d.line([(CX+300,330),(CX+250,1180)],fill=c['trim'],width=12)
    d.polygon([(CX-150,275),(CX,400),(CX+150,275)],fill=c['trim'])
    d.polygon([(CX-118,278),(CX,368),(CX+118,278)],fill=c['panel'])
def swiss_crest(d,cx,cy,s,c):
    half=s//2; d.rounded_rectangle([(cx-half,cy-half),(cx+half,cy+half)],radius=s//12,fill=c['sq'])
    arm=s*0.28; th=s*0.18
    d.rectangle([(cx-th/2,cy-arm),(cx+th/2,cy+arm)],fill=c['arm'])
    d.rectangle([(cx-arm,cy-th/2),(cx+arm,cy+th/2)],fill=c['arm'])
def arc_text(base,s,f,cx,cy,r,fill,spread=46,track=8):
    d=ImageDraw.Draw(base)
    widths=[d.textbbox((0,0),ch,font=f)[2] for ch in s]; total=sum(widths)+track*(len(s)-1)
    acc=0
    for ch,w in zip(s,widths):
        frac=(acc+w/2)/total; a=math.radians(-spread/2+spread*frac)
        x=cx+r*math.sin(a); y=cy-r*math.cos(a)+r
        layer=Image.new('RGBA',(w+40,f.size+40),(0,0,0,0))
        ImageDraw.Draw(layer).text((20,10),ch,font=f,fill=fill)
        layer=layer.rotate(-math.degrees(a),expand=True,resample=Image.BICUBIC)
        base.alpha_composite(layer,(int(x-layer.width/2),int(y-layer.height/2))); acc+=w+track

for name,c in COLORWAYS.items():
    # FRONT
    im=Image.new('RGBA',(W,H),(0,0,0,0)); jersey(im,c); d=ImageDraw.Draw(im)
    swiss_crest(d,CX+205,470,120,c)
    ctext(d,CX-45,440,'SCHWIIZ',font(66),c['ink'],track=4)
    ctext(d,CX,1255,'↑ VORNE: WAPPEN / NAME / LOGO',font(36),(130,130,130,255),track=2)
    im.save(os.path.join(OUT,f'wm-trikot-{name}-front.png'))
    # BACK
    im=Image.new('RGBA',(W,H),(0,0,0,0)); jersey(im,c); d=ImageDraw.Draw(im)
    arc_text(im,'DEIN NAME',font(92),CX,430,520,c['ink'])
    d=ImageDraw.Draw(im); ctext(d,CX,630,'10',font(380),c['ink'])  # solide Nummer in Trikotfarbe-Kontrast
    ctext(d,CX,1255,'↑ TIPPE NAME & NUMMER EIN',font(36),(130,130,130,255),track=2)
    im.save(os.path.join(OUT,f'wm-trikot-{name}-back.png'))
    print(f'  ✓ {name}: front + back')
print('Fertig. pod/templates/')
