#!/usr/bin/env python3
"""Skript #6 ('96x am Tag') im South-Park-Cutout-Stil.
Figur spielt die Beats, Mund-Lipsync, Props + Captions synchron."""
import math, numpy as np, imageio.v2 as imageio
from PIL import Image, ImageDraw, ImageFont

W, H = 480, 864
FPS = 20
DUR = 12.0
N = int(FPS*DUR)
SS = 2
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def font(px): return ImageFont.truetype(FONT, px*SS)

SKIN=(245,205,165); BEANIE=(40,170,175); POM=(250,235,120)
COAT=(120,80,200); COATD=(95,60,165); MITT=(235,225,210)
SHOE=(60,55,70); OUT=(28,24,38); WHITE=(255,255,255); AMBER=(255,150,24)

def smooth(t): return t*t*(3-2*t)
def key(t, fr, ease=True, over=0.0):
    if t<=fr[0][0]: return fr[0][1]
    if t>=fr[-1][0]: return fr[-1][1]
    for i in range(len(fr)-1):
        t0,v0=fr[i]; t1,v1=fr[i+1]
        if t0<=t<=t1:
            f=(t-t0)/(t1-t0)
            if ease: f=smooth(f)
            v=v0+(v1-v0)*f
            if over and 0<f<1: v+=math.sin(f*math.pi)*over*(v1-v0)*0.12
            return v
    return fr[-1][1]
def E(d,cx,cy,rx,ry,fill,outline=OUT,ow=3): d.ellipse([cx-rx,cy-ry,cx+rx,cy+ry],fill=fill,outline=outline,width=ow*SS)
def RR(d,x0,y0,x1,y1,r,fill,outline=OUT,ow=3): d.rounded_rectangle([x0,y0,x1,y1],radius=r,fill=fill,outline=outline,width=ow*SS)

CAPS=[(0,2,"96× AM TAG",(250,235,120),46),(2,4,"6 STUNDEN WEG",WHITE,44),
      (4,6,"AUSLÖSER → BELOHNUNG",WHITE,32),(6,8,"DREI SEKUNDEN STILLE…",WHITE,36),
      (8,10,"MACH ES TEURER",(250,235,120),44),(10,12,"…ODER?",WHITE,50)]

def render_frame(fi):
    t=fi/FPS
    img=Image.new("RGB",(W*SS,H*SS),(250,244,230))
    d=ImageDraw.Draw(img)
    for yy in range(0,H*SS,26*SS): d.line([(0,yy),(W*SS,yy)],fill=(243,236,220),width=SS)

    # paper jitter (cutout)
    q=math.floor(t*8)/8.0
    jx=math.sin(q*53)*2.2*SS; jy=math.cos(q*41)*2.0*SS
    cx=W*SS*0.42+jx; base=H*SS*0.62+jy
    bob=math.sin(t*2*math.pi*1.3)*4*SS
    slump=key(t,[(0,0),(2,0),(2.4,8),(3.6,8),(4,0),(12,0)])*SS  # stakes slump

    # legs
    for s in (-1,1):
        hipx=cx+s*36*SS; step=math.sin(t*2*math.pi*1.3+(0 if s<0 else math.pi))*5
        RR(d,hipx-14*SS,base+5*SS,hipx+14*SS,base+64*SS,11*SS,COATD)
        E(d,hipx+step*SS,base+74*SS,20*SS,13*SS,SHOE)
    # body
    RR(d,cx-66*SS,base-64*SS+bob+slump,cx+66*SS,base+16*SS+bob+slump,28*SS,COAT)
    d.line([(cx,base-60*SS+bob+slump),(cx,base+10*SS+bob+slump)],fill=COATD,width=4*SS)

    # LEFT arm idle gesture
    shy=base-46*SS+bob+slump
    gl=math.sin(t*2*math.pi*1.3+1)*14
    al=math.radians(-72+gl); exl=cx-64*SS+math.sin(al)*42*SS; eyl=shy+abs(math.cos(al))*42*SS
    RR(d,min(cx-64*SS,exl)-12*SS,min(shy,eyl)-12*SS,max(cx-64*SS,exl)+12*SS,max(shy,eyl)+12*SS,12*SS,COAT)
    E(d,exl,eyl,16*SS,16*SS,MITT)

    # RIGHT arm = reflex: idle down, SNAP up w/ phone at 'stille', lower at trick
    rang=key(t,[(0,72),(0.6,72),(0.9,55),(1.3,72),(6,72),(6.25,72),(6.5,-18),(8.2,-18),(9,72),(12,72)],over=0.5)
    shx=cx+64*SS
    ar=math.radians(rang)
    # elbow/hand position
    L=44*SS
    exr=shx+math.sin(ar)*L; eyr=shy-math.cos(ar)*L if rang<10 else shy-abs(math.cos(ar))*L*0.2 - (L if rang<0 else 0)
    # simpler: compute hand straight from shoulder by angle (0=down,90=out,-18=up-ish)
    exr=shx+math.sin(ar)*L; eyr=shy+math.cos(ar)*L
    RR(d,min(shx,exr)-12*SS,min(shy,eyr)-12*SS,max(shx,exr)+12*SS,max(shy,eyr)+12*SS,12*SS,COAT)
    E(d,exr,eyr,16*SS,16*SS,MITT)
    # phone in hand when raised
    if 6.5<=t<=8.9:
        screen=(58,45,94)
        if 6.65<=t<=8.0: screen=(127,208,255)
        elif t>8.0: screen=(140,140,140)
        RR(d,exr-13*SS,eyr-20*SS,exr+13*SS,eyr+20*SS,5*SS,(34,34,34))
        RR(d,exr-9*SS,eyr-15*SS,exr+9*SS,eyr+15*SS,3*SS,screen,outline=screen,ow=1)
        if 6.5<t<6.7: d.line([(shx,shy),(shx+70*SS,shy+8*SS)],fill=AMBER,width=4*SS)  # smear

    # HEAD
    look=key(t,[(0,0),(6.4,0),(6.6,1),(8.0,1),(8.6,0),(12,0)])
    hx=cx+5*SS*look; hy=base-150*SS+bob+slump+8*SS*look
    E(d,hx,hy,90*SS,84*SS,SKIN)
    blink=(t%3.0)>2.86; wink=t>10.5 and (t%0.6)<0.4
    for s in (-1,1): E(d,hx+s*28*SS,hy-12*SS,28*SS,34*SS,WHITE)
    if blink:
        for s in (-1,1): d.line([(hx+s*28*SS-20*SS,hy-12*SS),(hx+s*28*SS+20*SS,hy-12*SS)],fill=OUT,width=5*SS)
    else:
        ld=look*8*SS
        E(d,hx-28*SS+math.sin(t*1.3)*4*SS,hy-10*SS+ld,8*SS,10*SS,OUT,ow=1)
        if wink: d.line([(hx+28*SS-18*SS,hy-12*SS),(hx+28*SS+18*SS,hy-12*SS)],fill=OUT,width=5*SS)
        else: E(d,hx+28*SS+math.sin(t*1.3)*4*SS,hy-10*SS+ld,8*SS,10*SS,OUT,ow=1)
    # mouth flap (talks, pauses at snap)
    env=abs(math.sin(t*9.5))*(0.5+0.5*abs(math.sin(t*2.1)))
    if 6.3<t<6.7: env*=0.1
    my=hy+44*SS; mo=4*SS+env*24*SS
    E(d,hx,my,28*SS,mo,(120,50,55))
    if mo>13*SS: E(d,hx,my+mo*0.35,15*SS,mo*0.4,(210,90,95))
    # beanie
    d.pieslice([hx-94*SS,hy-122*SS,hx+94*SS,hy+28*SS],180,360,fill=BEANIE,outline=OUT,width=3*SS)
    RR(d,hx-94*SS,hy-54*SS,hx+94*SS,hy-38*SS,9*SS,BEANIE)
    E(d,hx,hy-110*SS,17*SS,17*SS,POM)

    # ===== PROPS =====
    if 2.0<=t<=4.0:  # stopwatch
        sx,sy=W*SS*0.80,H*SS*0.20
        E(d,sx,sy,24*SS,24*SS,WHITE,ow=4); RR(d,sx-6*SS,sy-32*SS,sx+6*SS,sy-24*SS,2*SS,WHITE)
        ha=(t*6)%(2*math.pi); d.line([(sx,sy),(sx+16*SS*math.sin(ha),sy-16*SS*math.cos(ha))],fill=AMBER,width=3*SS)
    if 3.8<=t<=6.2:  # loop wheel
        lx,ly=W*SS*0.82,H*SS*0.30; rot=t*120
        for a0 in range(0,360,45):
            if (a0//45)%2==0: d.arc([lx-26*SS,ly-26*SS,lx+26*SS,ly+26*SS],a0+rot,a0+rot+32,fill=AMBER,width=6*SS)
    if 5.8<=t<=8.2:  # traffic light
        tx,ty=W*SS*0.88,H*SS*0.55
        RR(d,tx-16*SS,ty-42*SS,tx+16*SS,ty+42*SS,9*SS,(12,8,24))
        red=(255,77,77) if t<7.6 else (60,40,40); grn=(40,60,50) if t<7.6 else (62,224,127)
        E(d,tx,ty-22*SS,9*SS,9*SS,red,ow=1); E(d,tx,ty+22*SS,9*SS,9*SS,grn,ow=1)
    if 6.9<=t<=7.8:  # reward star
        f=(t-6.9)/0.9; sc=1.3*math.sin(f*math.pi)*SS; stx,sty=W*SS*0.80,H*SS*0.40; pts=[]
        for i in range(10):
            a=math.radians(i*36-90); rr=20 if i%2==0 else 8
            pts.append((stx+rr*sc*math.cos(a),sty+rr*sc*math.sin(a)))
        d.polygon(pts,fill=(255,211,77),outline=(255,157,0))

    # caption
    for (a,b,txt,col,sz) in CAPS:
        if a<=t<b:
            f=t-a; al=255
            if f<0.15: al=int(255*f/0.15)
            if b-t<0.15: al=int(255*(b-t)/0.15)
            ft=font(sz); bb=d.textbbox((0,0),txt,font=ft); tw=bb[2]-bb[0]
            d.rounded_rectangle([W*SS/2-tw/2-12*SS,46*SS,W*SS/2+tw/2+12*SS,46*SS+sz*SS+14*SS],radius=10*SS,fill=(20,14,36))
            d.text((W*SS/2-tw/2,54*SS),txt,font=ft,fill=col)
    ft2=font(14); foot="Skript #6 im South-Park-Cutout-Stil"
    bb2=d.textbbox((0,0),foot,font=ft2); d.text((W*SS/2-(bb2[2]-bb2[0])/2,H*SS-34*SS),foot,font=ft2,fill=(120,110,100))
    return img.resize((W,H),Image.LANCZOS)

if __name__=="__main__":
    print(f"Rendering {N} frames...")
    writer=imageio.get_writer("/tmp/s6-cutout.mp4",fps=FPS,codec="libx264",quality=8,ffmpeg_params=["-pix_fmt","yuv420p"])
    stills={20:"hook",130:"snap",165:"grey",230:"wink"}
    frames=[]
    for i in range(N):
        im=render_frame(i); writer.append_data(np.asarray(im.convert("RGB"))); frames.append(im)
        if i in stills: im.convert("RGB").save(f"/tmp/s6c_{stills[i]}.png")
    writer.close()
    frames[0].save("/tmp/s6-cutout.gif",save_all=True,append_images=frames[1:],duration=int(1000/FPS),loop=0,optimize=True)
    print("done")
