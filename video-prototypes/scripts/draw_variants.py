#!/usr/bin/env python3
"""Alternative Cartoon-Figuren (HTF-Stil) als Stills zum Aussuchen."""
import math
from PIL import Image, ImageDraw, ImageFont
from render_s6_max import draw_bg, VIG, BLACK, W, H, SS, font, E, RR, OUT, WHITE
from PIL import ImageEnhance

CW,CH=360,520
def L(v): return v*SS
PUP=(40,32,46); BLUSH=(255,150,130); MOUTH=(150,66,70); TEETH=(255,255,255)

def critter(d,P):
    cx=L(CW/2); t=0
    body=P["body"]; bodyd=P["bodyd"]; bodyl=P["bodyl"]; belly=P["belly"]
    # tail
    if P.get("tail"):
        if P["tail"]=="bushy":
            E(d,cx+L(74),L(360),L(30),L(34),bodyd); E(d,cx+L(78),L(352),L(18),L(20),WHITE)
        else:
            E(d,cx+L(70),L(360),L(22),L(26),bodyd)
    # legs
    for s in (-1,1):
        lx=cx+s*L(34); d.line([(lx,L(400)),(lx,L(452))],fill=OUT,width=int(L(30))); d.line([(lx,L(400)),(lx,L(452))],fill=body,width=int(L(24)))
        E(d,lx+s*L(8),L(460),L(26),L(15),bodyd)
    # body
    E(d,cx,L(322),L(86),L(100),body); E(d,cx-L(30),L(300),L(34),L(46),bodyl); E(d,cx,L(338),L(52),L(64),belly)
    # arms
    for s in (-1,1):
        ax=cx+s*L(78); ex=ax+s*L(30); ey=L(360)
        d.line([(ax,L(300)),(ex,ey)],fill=OUT,width=int(L(26))); d.line([(ax,L(300)),(ex,ey)],fill=body,width=int(L(20))); E(d,ex,ey,L(15),L(15),bodyd)
    hx=cx; hy=L(150)
    # ears (style)
    es=P["ears"]
    for s in (-1,1):
        eyx=hx+s*L(58)
        if es=="round": E(d,eyx,L(74),L(34),L(38),P["ear"]); E(d,eyx,L(78),L(18),L(20),BLUSH)
        elif es=="cat": d.polygon([(eyx-L(28),L(96)),(eyx+L(28),L(96)),(eyx+s*L(6),L(34))],fill=P["ear"],outline=OUT); d.polygon([(eyx-L(14),L(92)),(eyx+L(14),L(92)),(eyx,L(54))],fill=BLUSH)
        elif es=="bunny": E(d,eyx,L(34),L(20),L(56),P["ear"]); E(d,eyx,L(40),L(11),L(40),BLUSH)
        elif es=="none": pass
    # face
    E(d,hx,hy,L(96),L(92),body); E(d,hx-L(34),hy-L(34),L(34),L(30),bodyl)
    for s in (-1,1): E(d,hx+s*L(58),hy+L(26),L(20),L(14),BLUSH,outline=BLUSH,ow=1)
    # eyes (frog = on top, big)
    eyo=L(0)
    if P.get("frogeyes"):
        for s in (-1,1):
            ox=hx+s*L(40); oy=hy-L(70)
            E(d,ox,oy,L(30),L(34),body); E(d,ox,oy,L(22),L(26),WHITE); E(d,ox,oy+L(2),L(11),L(13),PUP); E(d,ox-L(4),oy-L(4),L(5),L(5),WHITE)
    else:
        for s in (-1,1):
            ox=hx+s*L(38)
            E(d,ox,hy-L(6),L(38),L(46),WHITE); E(d,ox,hy-L(2),L(17),L(19),PUP); E(d,ox-L(6),hy-L(8),L(7),L(7),WHITE,outline=WHITE,ow=1)
    # snout/nose
    if P.get("snout"):
        E(d,hx,hy+L(28),L(30),L(22),P["snout"]);
    E(d,hx,hy+L(22),L(10),L(8),P["nose"],outline=P["nose"],ow=1)
    # whiskers
    if P.get("whiskers"):
        for s in (-1,1):
            for k in (-1,0,1):
                d.line([(hx+s*L(16),hy+L(24)+k*L(6)),(hx+s*L(70),hy+L(20)+k*L(12))],fill=OUT,width=int(L(2)))
    # mouth + teeth
    my=hy+L(40); E(d,hx,my,P.get("mw_w",L(20)),L(7),MOUTH)
    if P.get("buck"):
        d.rectangle([hx-L(9),my-L(2),hx-L(1),my+L(10)],fill=TEETH,outline=OUT,width=int(L(1.5)))
        d.rectangle([hx+L(1),my-L(2),hx+L(9),my+L(10)],fill=TEETH,outline=OUT,width=int(L(1.5)))

VAR={
 "katze":dict(body=(120,150,210),bodyd=(92,120,180),bodyl=(160,186,235),belly=(220,230,248),ear=(120,150,210),nose=(80,70,90),ears="cat",whiskers=1,tail="long",label="KATZE"),
 "hase":dict(body=(245,210,225),bodyd=(225,180,200),bodyl=(255,235,242),belly=(255,245,250),ear=(245,210,225),nose=(210,120,140),ears="bunny",buck=1,tail="bushy",label="HASE"),
 "frosch":dict(body=(140,200,110),bodyd=(110,170,80),bodyl=(175,225,150),belly=(225,240,200),ear=(140,200,110),nose=(80,110,70),ears="none",frogeyes=1,mw_w=L(30),label="FROSCH"),
 "fuchs":dict(body=(245,150,70),bodyd=(220,120,45),bodyl=(255,185,120),belly=(255,238,210),ear=(220,120,45),snout=(255,238,210),nose=(50,40,46),ears="cat",tail="bushy",label="FUCHS"),
}

for key,P in VAR.items():
    img=Image.new("RGB",(W*SS,H*SS),(20,18,40)); d=ImageDraw.Draw(img,"RGBA")
    draw_bg(d,0.5)
    layer=Image.new("RGBA",(CW*SS,CH*SS),(0,0,0,0)); ld=ImageDraw.Draw(layer,"RGBA")
    critter(ld,P)
    scl=0.78; w2=int(CW*SS*scl); h2=int(CH*SS*scl); sc=layer.resize((w2,h2),Image.LANCZOS)
    img.paste(sc,(int(W*SS*0.40-w2*0.5),int(H*SS*0.93-h2*((CH-30)/CH))),sc)
    ft=font(46); txt=P["label"]; bb=d.textbbox((0,0),txt,font=ft); tw=bb[2]-bb[0]
    d.rounded_rectangle([W*SS/2-tw/2-14*SS,52*SS,W*SS/2+tw/2+14*SS,52*SS+60*SS],radius=12*SS,fill=(18,12,32,235),outline=(255,176,32,180),width=2*SS)
    d.text((W*SS/2-tw/2,58*SS),txt,font=ft,fill=(250,235,120))
    img=Image.composite(img,BLACK,VIG); img=ImageEnhance.Color(img).enhance(1.16)
    img.resize((W,H),Image.LANCZOS).save(f"/tmp/char_{key}.png")
    print("made",key)
