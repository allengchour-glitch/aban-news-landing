#!/usr/bin/env python3
"""Skript #6 - DETAILLIERTERER Cutout-MENSCH (menschliche Proportionen, Haare,
Gesicht, Kleidungs-Details, 2-Segment-Arme/Beine) auf detailliertem Strassen-Hintergrund."""
import math, random, numpy as np, imageio.v2 as imageio
from PIL import Image, ImageDraw, ImageFont

W,H=480,864; FPS=20; DUR=12.0; N=int(FPS*DUR); SS=2
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def font(px): return ImageFont.truetype(FONT,px*SS)

OUT=(26,22,36); WHITE=(255,255,255); AMBER=(255,150,24)
SKIN=(238,196,158); SKIND=(214,170,132)
HAIR=(74,52,38); HAIRH=(104,74,52)
JACK=(58,96,168); JACKD=(44,76,140)        # denim jacket
SHIRT=(225,228,236)
JEAN=(64,72,104); JEAND=(50,58,86)
SNEAK=(245,245,248); SNEAKD=(70,70,84)
MOUTH=(150,70,72); TONGUE=(214,108,110)

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
def limb(d,p0,p1,w,fill,oc=OUT,ow=3):
    d.line([p0,p1],fill=oc,width=int((w+ow*2)*SS))
    for p in (p0,p1): d.ellipse([p[0]-(w/2+ow)*SS,p[1]-(w/2+ow)*SS,p[0]+(w/2+ow)*SS,p[1]+(w/2+ow)*SS],fill=oc)
    d.line([p0,p1],fill=fill,width=int(w*SS))
    for p in (p0,p1): d.ellipse([p[0]-w/2*SS,p[1]-w/2*SS,p[0]+w/2*SS,p[1]+w/2*SS],fill=fill)
def pt(x,y,ang,L): a=math.radians(ang); return (x+math.sin(a)*L, y+math.cos(a)*L)

# ---- detailed street background ----
random.seed(7); BUILDINGS=[]; xx=0
while xx<W:
    bw=random.randint(46,82); bh=random.randint(150,330)
    BUILDINGS.append((xx,bw,bh,random.choice([(46,40,78),(38,34,66),(55,46,90)]))); xx+=bw+random.randint(2,8)
WINLIT=set((bi,wi) for bi in range(len(BUILDINGS)) for wi in range(40) if random.random()<0.5)
def draw_bg(d):
    for y in range(0,int(H*0.62)):
        f=y/(H*0.62); r=int(30+220*f**2); g=int(28+92*f**1.6); b=int(70-30*f)
        d.line([(0,y*SS),(W*SS,y*SS)],fill=(min(r,255),min(g,255),max(b,0)),width=SS)
    E(d,W*SS*0.78,H*SS*0.12,22*SS,22*SS,(255,245,210),outline=(255,245,210),ow=1)
    horizon=int(H*0.58)
    for bi,(bx,bw,bh,col) in enumerate(BUILDINGS):
        top=horizon-bh; d.rectangle([bx*SS,top*SS,(bx+bw)*SS,horizon*SS],fill=col); wi=0
        for wy in range(top+12,horizon-10,22):
            for wx in range(bx+8,bx+bw-10,18):
                c=(255,210,120) if (bi,wi) in WINLIT else (24,20,42)
                d.rectangle([wx*SS,wy*SS,(wx+9)*SS,(wy+13)*SS],fill=c); wi+=1
    d.rectangle([0,horizon*SS,W*SS,H*SS],fill=(46,44,56))
    d.rectangle([0,horizon*SS,W*SS,(horizon+18)*SS],fill=(70,66,80))
    d.line([(0,horizon*SS),(W*SS,horizon*SS)],fill=(95,90,108),width=2*SS)
    for i,sx in enumerate(range(40,W-10,46)):
        wj=8+i; d.polygon([(sx*SS,(horizon+24)*SS),((sx+24)*SS,(horizon+24)*SS),((sx+24+wj)*SS,H*SS),((sx-wj)*SS,H*SS)],fill=(210,205,215))
    d.rectangle([(W*0.10-3)*SS,(H*0.20)*SS,(W*0.10+3)*SS,horizon*SS],fill=(30,28,40))
    E(d,W*0.10*SS,H*0.20*SS,12*SS,8*SS,(255,225,150),outline=(40,38,52),ow=2)

def draw_person(d,cx,gy,t,ra_ang,look,env,blink,wink,jit):
    bob=math.sin(t*2*math.pi*1.3)*3*SS
    hip_y=gy-150*SS+jit; sh_y=gy-250*SS+bob+jit; head_cy=gy-310*SS+bob+jit
    # shadow
    d.ellipse([cx-60*SS,gy-6*SS,cx+60*SS,gy+14*SS],fill=(0,0,0,80))

    # ---- LEGS (jeans, 2-seg, knee seam, sneaker) ----
    for s in (-1,1):
        hipx=cx+s*26*SS; sw=math.sin(t*2*math.pi*1.3+(0 if s<0 else math.pi))*4
        knee=pt(hipx,hip_y,s*4+sw,72*SS); ankle=pt(*knee,s*2+sw,66*SS)
        limb(d,(hipx,hip_y),knee,20,JEAN); limb(d,knee,ankle,17,JEAND)
        d.line([knee[0]-7*SS,knee[1],knee[0]+7*SS,knee[1]],fill=JEAND,width=2*SS)
        # sneaker
        fx,fy=ankle
        RR(d,fx-10*SS,fy-6*SS,fx+26*SS*s if s>0 else fx+10*SS, fy+14*SS,7*SS,SNEAK) if False else None
        d.rounded_rectangle([fx-12*SS,fy-8*SS,fx+30*SS,fy+14*SS] if s>0 else [fx-30*SS,fy-8*SS,fx+12*SS,fy+14*SS],radius=7*SS,fill=SNEAK,outline=OUT,width=3*SS)
        d.rectangle([fx-30*SS if s<0 else fx-12*SS, fy+8*SS, fx+12*SS if s<0 else fx+30*SS, fy+15*SS],fill=SNEAKD)

    # ---- TORSO (denim jacket: collar, zipper, pockets) ----
    jx0,jx1=cx-52*SS,cx+52*SS
    d.polygon([(jx0,sh_y),(jx1,sh_y),(cx+44*SS,hip_y),(cx-44*SS,hip_y)],fill=JACK,outline=OUT)
    d.line([(jx0,sh_y),(cx-44*SS,hip_y)],fill=OUT,width=3*SS); d.line([(jx1,sh_y),(cx+44*SS,hip_y)],fill=OUT,width=3*SS)
    d.line([(jx0,sh_y),(jx1,sh_y)],fill=OUT,width=3*SS); d.line([(cx-44*SS,hip_y),(cx+44*SS,hip_y)],fill=OUT,width=3*SS)
    # shirt V at neck
    d.polygon([(cx-16*SS,sh_y),(cx+16*SS,sh_y),(cx,sh_y+22*SS)],fill=SHIRT)
    # collar
    d.polygon([(cx-16*SS,sh_y),(cx-2*SS,sh_y+4*SS),(cx-2*SS,sh_y-12*SS)],fill=JACKD,outline=OUT)
    d.polygon([(cx+16*SS,sh_y),(cx+2*SS,sh_y+4*SS),(cx+2*SS,sh_y-12*SS)],fill=JACKD,outline=OUT)
    # zipper + pockets
    d.line([(cx,sh_y+18*SS),(cx,hip_y-6*SS)],fill=JACKD,width=3*SS)
    for s in (-1,1): RR(d,cx+s*34*SS-12*SS,hip_y-46*SS,cx+s*34*SS+12*SS,hip_y-20*SS,4*SS,JACK,outline=JACKD,ow=2)

    # ---- ARMS (denim sleeves, 2-seg, hands) ----
    # left idle
    la1=pt(cx-50*SS,sh_y+6*SS,-58+math.sin(t*4)*8,52*SS); la2=pt(*la1,-30,46*SS)
    limb(d,(cx-50*SS,sh_y+6*SS),la1,16,JACK); limb(d,la1,la2,13,JACKD); E(d,la2[0],la2[1],11*SS,11*SS,SKIN,ow=3)
    # right reflex
    el=pt(cx+50*SS,sh_y+6*SS,ra_ang,52*SS)
    bend=ra_ang+ (55 if ra_ang<10 else 18)
    ha=pt(*el,bend,46*SS)
    limb(d,(cx+50*SS,sh_y+6*SS),el,16,JACK); limb(d,el,ha,13,JACKD); E(d,ha[0],ha[1],11*SS,11*SS,SKIN,ow=3)

    # phone in right hand
    if 6.5<=t<=8.9:
        sc=(58,45,94)
        if 6.65<=t<=8.0: sc=(127,208,255)
        elif t>8.0: sc=(140,140,140)
        RR(d,ha[0]-12*SS,ha[1]-19*SS,ha[0]+12*SS,ha[1]+19*SS,5*SS,(34,34,34))
        RR(d,ha[0]-8*SS,ha[1]-14*SS,ha[0]+8*SS,ha[1]+14*SS,3*SS,sc,outline=sc,ow=1)

    # ---- NECK + HEAD ----
    d.rectangle([cx-12*SS,sh_y-18*SS,cx+12*SS,sh_y+2*SS],fill=SKIND)
    hx=cx+4*SS*look; hy=head_cy+6*SS*look
    # ears
    for s in (-1,1): E(d,hx+s*42*SS,hy+4*SS,9*SS,12*SS,SKIN)
    # face
    E(d,hx,hy,44*SS,52*SS,SKIN)
    # hair (top + side sweep)
    d.pieslice([hx-46*SS,hy-58*SS,hx+46*SS,hy+20*SS],180,360,fill=HAIR,outline=OUT,width=3*SS)
    d.polygon([(hx-46*SS,hy-8*SS),(hx-46*SS,hy-30*SS),(hx-10*SS,hy-44*SS),(hx+20*SS,hy-30*SS),(hx+46*SS,hy-34*SS),(hx+46*SS,hy-8*SS)],fill=HAIR)
    d.line([(hx-20*SS,hy-40*SS),(hx+30*SS,hy-34*SS)],fill=HAIRH,width=3*SS)
    # eyebrows
    ld=look*7*SS
    d.line([(hx-26*SS,hy-12*SS+ld),(hx-10*SS,hy-15*SS+ld)],fill=HAIR,width=4*SS)
    d.line([(hx+10*SS,hy-15*SS+ld),(hx+26*SS,hy-12*SS+ld)],fill=HAIR,width=4*SS)
    # eyes
    for s in (-1,1):
        ex=hx+s*17*SS
        if blink: d.line([(ex-9*SS,hy-2*SS+ld),(ex+9*SS,hy-2*SS+ld)],fill=OUT,width=4*SS)
        elif wink and s>0: d.line([(ex-9*SS,hy-2*SS),(ex+9*SS,hy-2*SS)],fill=OUT,width=4*SS)
        else:
            E(d,ex,hy-2*SS+ld*0.5,9*SS,11*SS,WHITE,ow=2)
            E(d,ex+math.sin(t*1.3)*3*SS,hy-1*SS+ld,4*SS,5*SS,OUT,ow=1)
    # nose
    d.line([(hx,hy+2*SS+ld),(hx+5*SS,hy+12*SS+ld)],fill=SKIND,width=3*SS)
    d.line([(hx+5*SS,hy+12*SS+ld),(hx-2*SS,hy+13*SS+ld)],fill=SKIND,width=3*SS)
    # mouth flap
    my=hy+28*SS+ld; mo=3*SS+env*16*SS
    E(d,hx,my,15*SS,mo,MOUTH)
    if mo>10*SS: E(d,hx,my+mo*0.3,8*SS,mo*0.4,TONGUE)

def render_frame(fi):
    t=fi/FPS
    img=Image.new("RGB",(W*SS,H*SS),(20,18,40)); d=ImageDraw.Draw(img,"RGBA")
    draw_bg(d)
    q=math.floor(t*8)/8.0; jx=math.sin(q*53)*2.0*SS; jy=math.cos(q*41)*1.8*SS
    cx=W*SS*0.40+jx; gy=H*SS*0.92+jy
    ra=key(t,[(0,68),(0.6,68),(0.9,52),(1.3,68),(6,68),(6.25,68),(6.5,-30),(8.2,-30),(9,68),(12,68)],over=0.5)
    look=key(t,[(0,0),(6.4,0),(6.6,1),(8.0,1),(8.6,0),(12,0)])
    env=abs(math.sin(t*9.5))*(0.5+0.5*abs(math.sin(t*2.1)))
    if 6.3<t<6.7: env*=0.1
    blink=(t%3.0)>2.86; wink=t>10.5 and (t%0.6)<0.4
    draw_person(d,cx,gy,t,ra,look,env,blink,wink,jy)
    if 6.5<t<6.7:
        sh=(cx+50*SS,gy-244*SS); d.line([sh,(sh[0]+70*SS,sh[1]+8*SS)],fill=AMBER,width=4*SS)

    # PROPS
    if 2.0<=t<=4.0:
        sx,sy=W*SS*0.82,H*SS*0.16; E(d,sx,sy,24*SS,24*SS,WHITE,ow=4); RR(d,sx-6*SS,sy-32*SS,sx+6*SS,sy-24*SS,2*SS,WHITE)
        ha=(t*6)%(2*math.pi); d.line([(sx,sy),(sx+16*SS*math.sin(ha),sy-16*SS*math.cos(ha))],fill=AMBER,width=3*SS)
    if 3.8<=t<=6.2:
        lx,ly=W*SS*0.84,H*SS*0.26; rot=t*120
        for a0 in range(0,360,45):
            if (a0//45)%2==0: d.arc([lx-26*SS,ly-26*SS,lx+26*SS,ly+26*SS],a0+rot,a0+rot+32,fill=AMBER,width=6*SS)
    if t>=5.6:
        tx=W*SS*0.88; poleTop=H*SS*0.40; d.rectangle([tx-4*SS,poleTop,tx+4*SS,H*SS*0.74],fill=(30,28,40))
        ty=poleTop-6*SS; RR(d,tx-16*SS,ty-42*SS,tx+16*SS,ty+42*SS,9*SS,(12,8,24))
        red=(255,77,77) if t<7.6 else (60,40,40); grn=(40,60,50) if t<7.6 else (62,224,127)
        E(d,tx,ty-22*SS,9*SS,9*SS,red,ow=1); E(d,tx,ty+22*SS,9*SS,9*SS,grn,ow=1)
    if 6.9<=t<=7.8:
        f=(t-6.9)/0.9; sc=1.3*math.sin(f*math.pi)*SS; stx,sty=W*SS*0.72,H*SS*0.34; pts=[]
        for i in range(10):
            a=math.radians(i*36-90); rr=20 if i%2==0 else 8; pts.append((stx+rr*sc*math.cos(a),sty+rr*sc*math.sin(a)))
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
    print(f"Rendering {N} frames (detailed person)...")
    writer=imageio.get_writer("/tmp/s6-person.mp4",fps=FPS,codec="libx264",quality=8,ffmpeg_params=["-pix_fmt","yuv420p"])
    stills={20:"hook",95:"loop",130:"snap",230:"wink"}; frames=[]
    for i in range(N):
        im=render_frame(i); writer.append_data(np.asarray(im.convert("RGB"))); frames.append(im)
        if i in stills: im.convert("RGB").save(f"/tmp/s6p_{stills[i]}.png")
    writer.close()
    frames[0].save("/tmp/s6-person.gif",save_all=True,append_images=frames[1:],duration=int(1000/FPS),loop=0,optimize=True)
    print("done")
