#!/usr/bin/env python3
"""Skript #6 - South-Park-Cutout-Figur auf DETAILLIERTEM Hintergrund (Stadt-Strasse, Daemmerung)."""
import math, numpy as np, imageio.v2 as imageio
from PIL import Image, ImageDraw, ImageFont

W,H=480,864; FPS=20; DUR=12.0; N=int(FPS*DUR); SS=2
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def font(px): return ImageFont.truetype(FONT,px*SS)
SKIN=(245,205,165);BEANIE=(40,170,175);POM=(250,235,120);COAT=(120,80,200)
COATD=(95,60,165);MITT=(235,225,210);SHOE=(60,55,70);OUT=(28,24,38)
WHITE=(255,255,255);AMBER=(255,150,24)

def smooth(t): return t*t*(3-2*t)
def key(t,fr,ease=True,over=0.0):
    if t<=fr[0][0]: return fr[0][1]
    if t>=fr[-1][0]: return fr[-1][1]
    for i in range(len(fr)-1):
        t0,v0=fr[i];t1,v1=fr[i+1]
        if t0<=t<=t1:
            f=(t-t0)/(t1-t0)
            if ease:f=smooth(f)
            v=v0+(v1-v0)*f
            if over and 0<f<1: v+=math.sin(f*math.pi)*over*(v1-v0)*0.12
            return v
    return fr[-1][1]
def E(d,cx,cy,rx,ry,fill,outline=OUT,ow=3): d.ellipse([cx-rx,cy-ry,cx+rx,cy+ry],fill=fill,outline=outline,width=ow*SS)
def RR(d,x0,y0,x1,y1,r,fill,outline=OUT,ow=3): d.rounded_rectangle([x0,y0,x1,y1],radius=r,fill=fill,outline=outline,width=ow*SS)

# ---- deterministic building windows ----
import random
random.seed(7)
BUILDINGS=[]
xx=0
while xx<W:
    bw=random.randint(46,82); bh=random.randint(150,330)
    BUILDINGS.append((xx,bw,bh,random.choice([(46,40,78),(38,34,66),(55,46,90)])))
    xx+=bw+random.randint(2,8)
WINLIT=set((bi,wi) for bi in range(len(BUILDINGS)) for wi in range(40) if random.random()<0.5)

def draw_bg(d,t):
    # sky gradient dusk
    for y in range(0,int(H*0.62)):
        f=y/(H*0.62)
        r=int(30+ (250-30)*f**2); g=int(28+(120-28)*f**1.6); b=int(70+(40-70)*f)
        d.line([(0,y*SS),(W*SS,y*SS)],fill=(min(r,255),min(g,255),max(b,0)),width=SS)
    # moon
    E(d,W*SS*0.78,H*SS*0.12,22*SS,22*SS,(255,245,210),outline=(255,245,210),ow=1)
    # skyline (silhouette + windows)
    horizon=int(H*0.58)
    for bi,(bx,bw,bh,col) in enumerate(BUILDINGS):
        top=horizon-bh
        d.rectangle([bx*SS,top*SS,(bx+bw)*SS,horizon*SS],fill=col)
        # windows grid
        wi=0
        for wy in range(top+12,horizon-10,22):
            for wx in range(bx+8,bx+bw-10,18):
                lit=(bi,wi) in WINLIT
                c=(255,210,120) if lit else (24,20,42)
                d.rectangle([wx*SS,wy*SS,(wx+9)*SS,(wy+13)*SS],fill=c)
                wi+=1
    # street
    d.rectangle([0,horizon*SS,W*SS,H*SS],fill=(46,44,56))
    # sidewalk band
    d.rectangle([0,horizon*SS,W*SS,(horizon+18)*SS],fill=(70,66,80))
    d.line([(0,horizon*SS),(W*SS,horizon*SS)],fill=(95,90,108),width=2*SS)
    # crosswalk stripes (perspective-ish)
    for i,sx in enumerate(range(40,W-10,46)):
        wj=8+i*1
        d.polygon([(sx*SS,(horizon+24)*SS),((sx+24)*SS,(horizon+24)*SS),
                   ((sx+24+wj)*SS,H*SS),((sx-wj)*SS,H*SS)],fill=(210,205,215))
    # streetlamp left
    d.rectangle([(W*0.10-3)*SS,(H*0.20)*SS,(W*0.10+3)*SS,horizon*SS],fill=(30,28,40))
    E(d,W*0.10*SS,H*0.20*SS,12*SS,8*SS,(255,225,150),outline=(40,38,52),ow=2)
    d.ellipse([(W*0.10-40)*SS,(H*0.20-30)*SS,(W*0.10+40)*SS,(H*0.20+40)*SS],fill=None,outline=None)

def render_frame(fi):
    t=fi/FPS
    img=Image.new("RGB",(W*SS,H*SS),(20,18,40)); d=ImageDraw.Draw(img,"RGBA")
    draw_bg(d,t)

    q=math.floor(t*8)/8.0; jx=math.sin(q*53)*2.2*SS; jy=math.cos(q*41)*2.0*SS
    cx=W*SS*0.40+jx; base=H*SS*0.74+jy; bob=math.sin(t*2*math.pi*1.3)*4*SS
    slump=key(t,[(0,0),(2,0),(2.4,8),(3.6,8),(4,0),(12,0)])*SS

    # soft shadow under figure
    d.ellipse([cx-70*SS,base+70*SS,cx+70*SS,base+92*SS],fill=(0,0,0,70))

    for s in (-1,1):
        hipx=cx+s*36*SS; step=math.sin(t*2*math.pi*1.3+(0 if s<0 else math.pi))*5
        RR(d,hipx-14*SS,base+5*SS,hipx+14*SS,base+64*SS,11*SS,COATD)
        E(d,hipx+step*SS,base+74*SS,20*SS,13*SS,SHOE)
    RR(d,cx-66*SS,base-64*SS+bob+slump,cx+66*SS,base+16*SS+bob+slump,28*SS,COAT)
    d.line([(cx,base-60*SS+bob+slump),(cx,base+10*SS+bob+slump)],fill=COATD,width=4*SS)

    shy=base-46*SS+bob+slump
    gl=math.sin(t*2*math.pi*1.3+1)*14; al=math.radians(-72+gl)
    exl=cx-64*SS+math.sin(al)*42*SS; eyl=shy+abs(math.cos(al))*42*SS
    RR(d,min(cx-64*SS,exl)-12*SS,min(shy,eyl)-12*SS,max(cx-64*SS,exl)+12*SS,max(shy,eyl)+12*SS,12*SS,COAT)
    E(d,exl,eyl,16*SS,16*SS,MITT)

    rang=key(t,[(0,72),(0.6,72),(0.9,55),(1.3,72),(6,72),(6.25,72),(6.5,-18),(8.2,-18),(9,72),(12,72)],over=0.5)
    shx=cx+64*SS; ar=math.radians(rang); L=44*SS
    exr=shx+math.sin(ar)*L; eyr=shy+math.cos(ar)*L
    RR(d,min(shx,exr)-12*SS,min(shy,eyr)-12*SS,max(shx,exr)+12*SS,max(shy,eyr)+12*SS,12*SS,COAT)
    E(d,exr,eyr,16*SS,16*SS,MITT)
    if 6.5<=t<=8.9:
        screen=(58,45,94)
        if 6.65<=t<=8.0: screen=(127,208,255)
        elif t>8.0: screen=(140,140,140)
        RR(d,exr-13*SS,eyr-20*SS,exr+13*SS,eyr+20*SS,5*SS,(34,34,34))
        RR(d,exr-9*SS,eyr-15*SS,exr+9*SS,eyr+15*SS,3*SS,screen,outline=screen,ow=1)
        if screen==(127,208,255):  # phone glow on face
            d.ellipse([exr-40*SS,eyr-50*SS,exr+40*SS,eyr+30*SS],fill=(127,208,255,40))
        if 6.5<t<6.7: d.line([(shx,shy),(shx+70*SS,shy+8*SS)],fill=AMBER,width=4*SS)

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
    env=abs(math.sin(t*9.5))*(0.5+0.5*abs(math.sin(t*2.1)))
    if 6.3<t<6.7: env*=0.1
    my=hy+44*SS; mo=4*SS+env*24*SS
    E(d,hx,my,28*SS,mo,(120,50,55))
    if mo>13*SS: E(d,hx,my+mo*0.35,15*SS,mo*0.4,(210,90,95))
    d.pieslice([hx-94*SS,hy-122*SS,hx+94*SS,hy+28*SS],180,360,fill=BEANIE,outline=OUT,width=3*SS)
    RR(d,hx-94*SS,hy-54*SS,hx+94*SS,hy-38*SS,9*SS,BEANIE)
    E(d,hx,hy-110*SS,17*SS,17*SS,POM)

    # ===== PROPS (now part of the scene) =====
    if 2.0<=t<=4.0:
        sx,sy=W*SS*0.82,H*SS*0.16
        E(d,sx,sy,24*SS,24*SS,WHITE,ow=4); RR(d,sx-6*SS,sy-32*SS,sx+6*SS,sy-24*SS,2*SS,WHITE)
        ha=(t*6)%(2*math.pi); d.line([(sx,sy),(sx+16*SS*math.sin(ha),sy-16*SS*math.cos(ha))],fill=AMBER,width=3*SS)
    if 3.8<=t<=6.2:
        lx,ly=W*SS*0.84,H*SS*0.26; rot=t*120
        for a0 in range(0,360,45):
            if (a0//45)%2==0: d.arc([lx-26*SS,ly-26*SS,lx+26*SS,ly+26*SS],a0+rot,a0+rot+32,fill=AMBER,width=6*SS)
    # traffic light = real pole on the street (always visible after 5.6s)
    if t>=5.6:
        tx=W*SS*0.88; poleTop=H*SS*0.40
        d.rectangle([tx-4*SS,poleTop,tx+4*SS,H*SS*0.74],fill=(30,28,40))
        ty=poleTop-6*SS
        RR(d,tx-16*SS,ty-42*SS,tx+16*SS,ty+42*SS,9*SS,(12,8,24))
        red=(255,77,77) if t<7.6 else (60,40,40); grn=(40,60,50) if t<7.6 else (62,224,127)
        E(d,tx,ty-22*SS,9*SS,9*SS,red,ow=1); E(d,tx,ty+22*SS,9*SS,9*SS,grn,ow=1)
        if t<7.6: d.ellipse([tx-28*SS,ty-44*SS,tx+28*SS,ty,],fill=(255,77,77,30))
    if 6.9<=t<=7.8:
        f=(t-6.9)/0.9; sc=1.3*math.sin(f*math.pi)*SS; stx,sty=W*SS*0.74,H*SS*0.36; pts=[]
        for i in range(10):
            a=math.radians(i*36-90); rr=20 if i%2==0 else 8
            pts.append((stx+rr*sc*math.cos(a),sty+rr*sc*math.sin(a)))
        d.polygon(pts,fill=(255,211,77),outline=(255,157,0))

    CAPS=[(0,2,"96× AM TAG",(250,235,120),46),(2,4,"6 STUNDEN WEG",WHITE,44),
          (4,6,"AUSLÖSER → BELOHNUNG",WHITE,32),(6,8,"DREI SEKUNDEN STILLE…",WHITE,36),
          (8,10,"MACH ES TEURER",(250,235,120),44),(10,12,"…ODER?",WHITE,50)]
    for (a,b,txt,col,sz) in CAPS:
        if a<=t<b:
            ft=font(sz); bb=d.textbbox((0,0),txt,font=ft); tw=bb[2]-bb[0]
            d.rounded_rectangle([W*SS/2-tw/2-12*SS,40*SS,W*SS/2+tw/2+12*SS,40*SS+sz*SS+14*SS],radius=10*SS,fill=(20,14,36,235))
            d.text((W*SS/2-tw/2,48*SS),txt,font=ft,fill=col)
    return img.resize((W,H),Image.LANCZOS)

if __name__=="__main__":
    print(f"Rendering {N} frames (detailed scene)...")
    writer=imageio.get_writer("/tmp/s6-scene.mp4",fps=FPS,codec="libx264",quality=8,ffmpeg_params=["-pix_fmt","yuv420p"])
    stills={20:"hook",95:"loop",130:"snap",230:"wink"}
    frames=[]
    for i in range(N):
        im=render_frame(i); writer.append_data(np.asarray(im.convert("RGB"))); frames.append(im)
        if i in stills: im.convert("RGB").save(f"/tmp/s6s_{stills[i]}.png")
    writer.close()
    frames[0].save("/tmp/s6-scene.gif",save_all=True,append_images=frames[1:],duration=int(1000/FPS),loop=0,optimize=True)
    print("done")
