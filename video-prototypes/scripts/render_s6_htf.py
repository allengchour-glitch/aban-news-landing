#!/usr/bin/env python3
"""Skript #6 - Happy-Tree-Friends-STIL: suesse runde Critter-Figur, RIESIGE glaenzende
Augen, knallige Farben, FLUESSIGE Bewegung mit Squash&Stretch (Layer-Skalierung),
uebertriebene Schreck-Reaktion. Eigene Figur, kein HTF-Charakter kopiert."""
import math, numpy as np, imageio.v2 as imageio
from PIL import Image, ImageDraw, ImageEnhance
from render_s6_max import (draw_bg, draw_dust, VIG, BLACK, W, H, SS, font, key,
                           E, RR, OUT, WHITE, AMBER)

FPS=30; DUR=12.0; N=int(FPS*DUR)

# critter palette (bright + cute)
BODY=(255,201,71); BODYD=(232,170,40); BODYL=(255,224,140)
BELLY=(255,236,176); EAR=(236,176,46); NOSE=(74,48,40)
BLUSH=(255,150,130); MOUTH=(150,66,70); TONGUE=(228,118,120)
PUP=(40,32,46); TEETH=(255,255,255)

CW,CH=360,520                      # local design space (pre-SS)
def L(v): return v*SS

def draw_critter(d,t,arm_r,look,env,eyewide,blink,phone):
    cx=L(CW/2)
    # secondary motion offsets
    earw=math.sin(t*2*math.pi*1.5-0.6)*5
    tailw=math.sin(t*2*math.pi*2.0)*14

    # ---- tail ----
    E(d,cx+L(70),L(360),L(26),L(30),BODYD)
    E(d,cx+L(70+tailw*0.3),L(352),L(16),L(18),BODY)

    # ---- legs + feet ----
    for s in (-1,1):
        lx=cx+s*L(34)
        d.line([(lx,L(400)),(lx,L(452))],fill=OUT,width=int(L(30)))
        d.line([(lx,L(400)),(lx,L(452))],fill=BODY,width=int(L(24)))
        E(d,lx+s*L(8),L(460),L(26),L(15),BODYD)     # foot

    # ---- body (bean) ----
    E(d,cx,L(322),L(86),L(100),BODY)
    E(d,cx-L(30),L(300),L(34),L(46),BODYL)          # highlight
    E(d,cx,L(338),L(52),L(64),BELLY)                 # belly patch

    # ---- arms ----
    # left idle gentle
    al=-22+math.sin(t*3.5)*10
    ax=cx-L(78); ay=L(300)
    ex=ax+math.sin(math.radians(al))*L(60); ey=ay+abs(math.cos(math.radians(al)))*L(60)
    d.line([(ax,ay),(ex,ey)],fill=OUT,width=int(L(26))); d.line([(ax,ay),(ex,ey)],fill=BODY,width=int(L(20)))
    E(d,ex,ey,L(15),L(15),BODYD)
    # right reflex
    rx0=cx+L(78); ry0=L(300)
    rex=rx0+math.sin(math.radians(arm_r))*L(64); rey=ry0+math.cos(math.radians(arm_r))*L(64)
    d.line([(rx0,ry0),(rex,rey)],fill=OUT,width=int(L(26))); d.line([(rx0,ry0),(rex,rey)],fill=BODY,width=int(L(20)))
    E(d,rex,rey,L(15),L(15),BODYD)
    if phone is not None:
        RR(d,rex-L(13),rey-L(20),rex+L(13),rey+L(20),L(5),(30,30,30))
        RR(d,rex-L(9),rey-L(15),rex+L(9),rey+L(15),L(3),phone,outline=phone,ow=1)

    # ---- head ----
    hx=cx+L(6)*look; hy=L(150)+L(8)*look
    # ears (rounded, with inner)
    for s in (-1,1):
        eyx=hx+s*L(62); eyy=L(74)+earw*(1 if s>0 else -1)
        E(d,eyx,eyy,L(34),L(38),EAR); E(d,eyx,eyy+L(4),L(18),L(20),BLUSH)
    # face
    E(d,hx,hy,L(96),L(92),BODY)
    E(d,hx-L(34),hy-L(34),L(34),L(30),BODYL)         # sheen
    # cheeks blush
    for s in (-1,1): E(d,hx+s*L(58),hy+L(26),L(20),L(14),BLUSH,outline=BLUSH,ow=1)

    # ---- BIG shiny eyes (the HTF signature) ----
    ewx=L(38)*(1+0.22*eyewide); ewy=L(46)*(1+0.30*eyewide)
    ld=look*L(10)
    for s in (-1,1):
        ox=hx+s*L(38)
        if blink:
            d.line([(ox-ewx*0.8,hy-L(6)),(ox+ewx*0.8,hy-L(6))],fill=OUT,width=int(L(5)))
        else:
            E(d,ox,hy-L(6),ewx,ewy,WHITE,ow=int(3))
            pr=L(17)*(1-0.25*eyewide)
            px=ox+math.sin(t*1.2)*L(4); py=hy-L(2)+ld
            E(d,px,py,pr,pr*1.12,PUP,outline=PUP,ow=1)
            E(d,px-pr*0.35,py-pr*0.4,pr*0.42,pr*0.42,WHITE,outline=WHITE,ow=1)   # big catchlight
            E(d,px+pr*0.3,py+pr*0.4,pr*0.18,pr*0.18,(255,255,255),outline=WHITE,ow=1)
    # nose (heart-ish)
    E(d,hx,hy+L(20),L(11),L(9),NOSE,outline=NOSE,ow=1)
    # mouth + buck teeth
    my=hy+L(40)+ld*0.4; mo=L(4)+env*L(20)
    E(d,hx,my,L(18),mo,MOUTH)
    if mo>L(12): E(d,hx,my+mo*0.3,L(9),mo*0.4,TONGUE)
    # buck teeth (cute) only when mouth small
    if mo<L(12):
        d.rectangle([hx-L(9),my-L(2),hx-L(1),my+L(9)],fill=TEETH,outline=OUT,width=int(L(1.5)))
        d.rectangle([hx+L(1),my-L(2),hx+L(9),my+L(9)],fill=TEETH,outline=OUT,width=int(L(1.5)))
    # sweat drop on shock
    if eyewide>0.5:
        sdy=hy-L(40)+ (eyewide-0.5)*L(30)
        E(d,hx+L(70),sdy,L(7),L(11),(150,210,240),outline=(90,150,200),ow=2)

def render_frame(fi):
    t=fi/FPS
    img=Image.new("RGB",(W*SS,H*SS),(20,18,40)); d=ImageDraw.Draw(img,"RGBA")
    draw_bg(d,t)

    # ---- character layer (for true squash & stretch) ----
    layer=Image.new("RGBA",(CW*SS,CH*SS),(0,0,0,0)); ld=ImageDraw.Draw(layer,"RGBA")
    ra=key(t,[(0,18),(0.6,18),(0.9,8),(1.3,18),(6,18),(6.2,18),(6.5,-40),(8.2,-40),(9,18),(12,18)],over=0.6)
    look=key(t,[(0,0),(6.4,0),(6.6,1),(8.0,1),(8.6,0),(12,0)])
    env=abs(math.sin(t*10))*(0.5+0.5*abs(math.sin(t*2.1)))
    if 6.25<t<6.65: env*=0.1
    eyewide=key(t,[(0,0),(6.2,0),(6.45,1.0),(6.9,0.5),(8.0,0.5),(8.5,0),(12,0)])
    blink=(t%2.8)>2.68 and not (6.3<t<7.0)
    phone=None
    if 6.5<=t<=8.9: phone=(127,208,255) if 6.65<=t<=8.0 else ((140,140,140) if t>8.0 else (58,45,94))
    draw_critter(ld,t,ra,look,env,eyewide,blink,phone)

    # squash & stretch (volume-preserving) + jump-pop at snap
    bounce=math.sin(t*2*math.pi*1.5)
    sy=1+0.05*bounce
    jump=key(t,[(0,0),(6.2,0),(6.35,-0.14),(6.5,0.12),(6.7,0),(12,0)])  # anticipate down, stretch up
    sy+=jump
    sx=1.0/sy
    scl=0.78
    w2=max(1,int(CW*SS*sx*scl)); h2=max(1,int(CH*SS*sy*scl))
    sc=layer.resize((w2,h2),Image.LANCZOS)
    cxs=int(W*SS*0.40); gys=int(H*SS*0.93)
    footx=w2*0.5; footy=h2*((CH-30)/CH)
    img.paste(sc,(int(cxs-footx),int(gys-footy)),sc)

    if 6.45<t<6.65:
        d.line([(cxs+L(40),gys-L(190)),(cxs+L(120),gys-L(182))],fill=AMBER,width=int(L(4)))
    draw_dust(d,t)

    # PROPS
    if 2.0<=t<=4.0:
        sx2,sy2=W*SS*0.82,H*SS*0.15; E(d,sx2,sy2,24*SS,24*SS,WHITE,ow=4); RR(d,sx2-6*SS,sy2-32*SS,sx2+6*SS,sy2-24*SS,2*SS,WHITE)
        ha=(t*6)%(2*math.pi); d.line([(sx2,sy2),(sx2+16*SS*math.sin(ha),sy2-16*SS*math.cos(ha))],fill=AMBER,width=3*SS)
    if 3.8<=t<=6.2:
        lx,ly=W*SS*0.84,H*SS*0.25; rot=t*120
        for a0 in range(0,360,45):
            if (a0//45)%2==0: d.arc([lx-26*SS,ly-26*SS,lx+26*SS,ly+26*SS],a0+rot,a0+rot+32,fill=AMBER,width=6*SS)
    if t>=5.6:
        tx=W*SS*0.88; poleTop=H*SS*0.40; d.rectangle([tx-4*SS,poleTop,tx+4*SS,H*SS*0.78],fill=(30,28,40))
        ty=poleTop-6*SS; RR(d,tx-16*SS,ty-42*SS,tx+16*SS,ty+42*SS,9*SS,(12,8,24))
        red=(255,77,77) if t<7.6 else (60,40,40); grn=(40,60,50) if t<7.6 else (62,224,127)
        E(d,tx,ty-22*SS,9*SS,9*SS,red,ow=1); E(d,tx,ty+22*SS,9*SS,9*SS,grn,ow=1)
    if 6.9<=t<=7.8:
        f=(t-6.9)/0.9; scc=1.3*math.sin(f*math.pi)*SS; stx,sty=W*SS*0.70,H*SS*0.33; pts=[]
        for i in range(10):
            a=math.radians(i*36-90); rr=20 if i%2==0 else 8; pts.append((stx+rr*scc*math.cos(a),sty+rr*scc*math.sin(a)))
        d.polygon(pts,fill=(255,211,77),outline=(255,157,0))

    CAPS=[(0,2,"96× AM TAG",(250,235,120),48),(2,4,"6 STUNDEN WEG",WHITE,46),
          (4,6,"AUSLÖSER → BELOHNUNG",WHITE,34),(6,8,"DREI SEKUNDEN STILLE…",WHITE,38),
          (8,10,"MACH ES TEURER",(250,235,120),46),(10,12,"…ODER?",WHITE,52)]
    for (a,b,txt,col,sz) in CAPS:
        if a<=t<b:
            f=t-a; pop=1.0 if f>0.18 else 0.86+0.14*(f/0.18)
            ft=font(sz*pop); bb=d.textbbox((0,0),txt,font=ft); tw=bb[2]-bb[0]; th=bb[3]-bb[1]
            bx=W*SS/2; by=52*SS
            d.rounded_rectangle([bx-tw/2-14*SS,by-6*SS,bx+tw/2+14*SS,by+th+14*SS],radius=12*SS,fill=(18,12,32,235))
            d.rounded_rectangle([bx-tw/2-14*SS,by-6*SS,bx+tw/2+14*SS,by+th+14*SS],radius=12*SS,outline=(255,176,32,180),width=2*SS)
            d.text((bx-tw/2+2*SS,by+4*SS),txt,font=ft,fill=(0,0,0,160))
            d.text((bx-tw/2,by+2*SS),txt,font=ft,fill=col)

    img=Image.composite(img,BLACK,VIG)
    img=ImageEnhance.Color(img).enhance(1.18)
    img=ImageEnhance.Contrast(img).enhance(1.06)
    z=1.0+0.05*(t/DUR); cw,ch=int(W*SS/z),int(H*SS/z); l=(W*SS-cw)//2; tp=int((H*SS-ch)*0.42)
    img=img.crop((l,tp,l+cw,tp+ch))
    return img.resize((W,H),Image.LANCZOS)

if __name__=="__main__":
    print(f"Rendering {N} frames @ SS{SS} (HTF style)...")
    writer=imageio.get_writer("/tmp/s6-htf.mp4",fps=FPS,codec="libx264",quality=9,ffmpeg_params=["-pix_fmt","yuv420p"])
    stills={30:"hook",120:"loop",196:"snap",250:"grey",330:"wink"}
    for i in range(N):
        im=render_frame(i); writer.append_data(np.asarray(im.convert("RGB")))
        if i in stills: im.convert("RGB").save(f"/tmp/s6h_{stills[i]}.png")
        if i%60==0: print(f"  {i}/{N}")
    writer.close(); print("done -> /tmp/s6-htf.mp4")
