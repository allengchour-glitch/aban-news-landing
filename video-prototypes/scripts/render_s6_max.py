#!/usr/bin/env python3
"""Skript #6 - MAX-QUALITAET: detaillierter Cutout-Mensch, 3x Supersampling,
Tiefen-Hintergrund (Nebel/Sterne/Reflexion), Shading + Rim-Light, Vignette/Grade,
Kamera-Zoom, Staub-Partikel."""
import math, random, numpy as np, imageio.v2 as imageio
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter

W,H=540,960; FPS=24; DUR=12.0; N=int(FPS*DUR); SS=3
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def font(px): return ImageFont.truetype(FONT,int(px*SS))

OUT=(24,20,34); WHITE=(255,255,255); AMBER=(255,150,24)
SKIN=(238,196,158); SKIND=(212,166,128); SKINL=(250,214,178)
HAIR=(70,48,34); HAIRH=(112,80,56)
JACK=(60,100,172); JACKD=(42,72,134); JACKL=(92,134,204)
SHIRT=(228,231,238); JEAN=(66,74,108); JEAND=(48,56,84); JEANL=(92,100,140)
SNEAK=(248,248,250); SNEAKD=(64,64,80)
MOUTH=(150,70,72); TONGUE=(214,108,110); BLUSH=(236,150,140)
WARM=(255,196,120); COOL=(150,180,230)

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
def E(d,cx,cy,rx,ry,fill,outline=OUT,ow=3): d.ellipse([cx-rx,cy-ry,cx+rx,cy+ry],fill=fill,outline=outline,width=int(ow*SS))
def RR(d,x0,y0,x1,y1,r,fill,outline=OUT,ow=3): d.rounded_rectangle([x0,y0,x1,y1],radius=r,fill=fill,outline=outline,width=int(ow*SS))
def limb(d,p0,p1,w,fill,hi=None,oc=OUT,ow=3):
    d.line([p0,p1],fill=oc,width=int((w+ow*2)*SS))
    for p in (p0,p1): d.ellipse([p[0]-(w/2+ow)*SS,p[1]-(w/2+ow)*SS,p[0]+(w/2+ow)*SS,p[1]+(w/2+ow)*SS],fill=oc)
    d.line([p0,p1],fill=fill,width=int(w*SS))
    for p in (p0,p1): d.ellipse([p[0]-w/2*SS,p[1]-w/2*SS,p[0]+w/2*SS,p[1]+w/2*SS],fill=fill)
    if hi:  # highlight streak along limb
        dx,dy=p1[0]-p0[0],p1[1]-p0[1]; L=math.hypot(dx,dy) or 1; nx,ny=-dy/L,dx/L
        off=w*0.22*SS
        d.line([(p0[0]+nx*off,p0[1]+ny*off),(p1[0]+nx*off,p1[1]+ny*off)],fill=hi,width=int(w*0.30*SS))
def pt(x,y,ang,L): a=math.radians(ang); return (x+math.sin(a)*L, y+math.cos(a)*L)

# ---------- background (3 depth layers + fog + stars + reflection) ----------
random.seed(11)
STARS=[(random.uniform(0,W),random.uniform(0,H*0.34),random.uniform(0.6,1.6),random.uniform(0,6.28)) for _ in range(70)]
DUST =[(random.uniform(0,W),random.uniform(0,H),random.uniform(1.0,2.6),random.uniform(0,6.28),random.uniform(0.2,0.7)) for _ in range(46)]
def gen_layer(seed,hmin,hmax,col,wmin,wmax):
    random.seed(seed); arr=[]; x=-10
    while x<W+10:
        bw=random.randint(wmin,wmax); bh=random.randint(hmin,hmax)
        arr.append((x,bw,bh,col,[random.random()<0.5 for _ in range(60)])); x+=bw+random.randint(2,7)
    return arr
FAR =gen_layer(1, 90,180,(58,52,92),34,54)
MID =gen_layer(2,150,260,(46,40,78),46,72)
NEAR=gen_layer(3,180,330,(34,30,58),52,86)
HOR=int(H*0.60)

def draw_bg(d,t):
    # sky
    for y in range(0,HOR):
        f=y/HOR; r=int(26+225*f**2.1); g=int(24+96*f**1.7); b=int(72-26*f)
        d.line([(0,y*SS),(W*SS,y*SS)],fill=(min(r,255),min(g,255),max(b,0)),width=SS)
    # stars (twinkle)
    for sx,sy,sr,ph in STARS:
        a=int(120+110*math.sin(t*2+ph))
        d.ellipse([(sx-sr)*SS,(sy-sr)*SS,(sx+sr)*SS,(sy+sr)*SS],fill=(255,250,230,max(a,0)))
    # moon + halo
    mx,my=W*0.76,H*0.12
    for rr,al in ((46,26),(34,40),(24,70)): d.ellipse([(mx-rr)*SS,(my-rr)*SS,(mx+rr)*SS,(my+rr)*SS],fill=(255,245,210,al))
    E(d,mx*SS,my*SS,20*SS,20*SS,(255,247,220),outline=(255,247,220),ow=1)
    # building layers back->front
    for layer,fog in ((FAR,90),(MID,45),(NEAR,0)):
        for (bx,bw,bh,col,lit) in layer:
            top=HOR-bh
            c=tuple(int(col[i]+(150-col[i])*fog/255) for i in range(3))  # fog fade
            d.rectangle([bx*SS,top*SS,(bx+bw)*SS,HOR*SS],fill=c)
            if fog<50:
                wi=0
                for wy in range(top+14,HOR-12,24):
                    for wx in range(bx+9,bx+bw-12,20):
                        win=(255,212,128) if lit[wi%60] else (26,22,46)
                        d.rectangle([wx*SS,wy*SS,(wx+10)*SS,(wy+14)*SS],fill=win); wi+=1
    # fog band at horizon
    for i in range(26):
        d.line([(0,(HOR-26+i)*SS),(W*SS,(HOR-26+i)*SS)],fill=(150,140,170,int(70*(1-i/26))),width=SS)
    # street
    d.rectangle([0,HOR*SS,W*SS,H*SS],fill=(44,42,54))
    # wet reflection of lamp + window glow
    for i in range(40):
        a=int(70*(1-i/40))
        d.line([((W*0.12-2)*SS,(HOR+i*3)*SS),((W*0.12+2)*SS,(HOR+i*3)*SS)],fill=(255,225,150,a),width=2*SS)
    d.rectangle([0,HOR*SS,W*SS,(HOR+14)*SS],fill=(66,62,78)); d.line([(0,HOR*SS),(W*SS,HOR*SS)],fill=(96,90,112),width=2*SS)
    # crosswalk: clean perspective bands across road
    for i in range(7):
        yy=HOR+26+i*i*4.0; hh=4+i*2.2
        if yy>H: break
        inset=70-i*9
        d.rectangle([inset*SS,yy*SS,(W-inset)*SS,(yy+hh)*SS],fill=(200,196,206))
    # streetlamp pole + warm glow
    d.rectangle([(W*0.12-3)*SS,(H*0.18)*SS,(W*0.12+3)*SS,HOR*SS],fill=(28,26,38))
    for rr,al in ((40,22),(26,40),(14,70)): d.ellipse([(W*0.12-rr)*SS,(H*0.18-rr)*SS,(W*0.12+rr)*SS,(H*0.18+rr)*SS],fill=(255,220,150,al))
    E(d,W*0.12*SS,H*0.18*SS,12*SS,8*SS,(255,228,160),outline=(40,38,52),ow=2)

def draw_dust(d,t):
    for x,y,r,ph,sp in DUST:
        yy=(y-t*sp*30)%H; xx=(x+math.sin(t*0.5+ph)*8)
        d.ellipse([(xx-r)*SS,(yy-r)*SS,(xx+r)*SS,(yy+r)*SS],fill=(255,240,210,40))

def draw_person(d,cx,gy,t,ra_ang,look,env,blink,wink,jit,phone_lit):
    bob=math.sin(t*2*math.pi*1.3)*3*SS
    hip_y=gy-150*SS+jit; sh_y=gy-252*SS+bob+jit; head_cy=gy-312*SS+bob+jit
    d.ellipse([cx-58*SS,gy-4*SS,cx+58*SS,gy+16*SS],fill=(0,0,0,90))
    # LEGS
    for s in (-1,1):
        hipx=cx+s*24*SS; sw=math.sin(t*2*math.pi*1.3+(0 if s<0 else math.pi))*3
        knee=pt(hipx,hip_y,s*3+sw,74*SS); ankle=pt(*knee,s*1.5+sw,64*SS)
        limb(d,(hipx,hip_y),knee,21,JEAN,hi=JEANL); limb(d,knee,ankle,17,JEAND,hi=JEANL)
        fx,fy=ankle
        box=[fx-12*SS,fy-9*SS,fx+32*SS,fy+15*SS] if s>0 else [fx-32*SS,fy-9*SS,fx+12*SS,fy+15*SS]
        RR(d,*box,8*SS,SNEAK);
        d.rectangle([box[0],box[3]-7*SS,box[2],box[3]],fill=SNEAKD)
        d.line([fx-2*SS,fy-6*SS,fx+ (18 if s>0 else -18)*SS,fy-2*SS],fill=SNEAKD,width=2*SS)
    # TORSO jacket
    jx0,jx1=cx-54*SS,cx+54*SS
    d.polygon([(jx0,sh_y),(jx1,sh_y),(cx+45*SS,hip_y),(cx-45*SS,hip_y)],fill=JACK,outline=OUT)
    d.polygon([(jx1-18*SS,sh_y),(jx1,sh_y),(cx+45*SS,hip_y),(cx+27*SS,hip_y)],fill=JACKD)  # shaded right side
    d.line([(cx-30*SS,sh_y+6*SS),(cx-38*SS,hip_y-10*SS)],fill=JACKL,width=4*SS)            # highlight left
    for x in (jx0,jx1): d.line([(x,sh_y),(cx+(45 if x>cx else -45)*SS,hip_y)],fill=OUT,width=3*SS)
    d.line([(jx0,sh_y),(jx1,sh_y)],fill=OUT,width=3*SS); d.line([(cx-45*SS,hip_y),(cx+45*SS,hip_y)],fill=OUT,width=3*SS)
    d.polygon([(cx-16*SS,sh_y),(cx+16*SS,sh_y),(cx,sh_y+22*SS)],fill=SHIRT)
    d.polygon([(cx-16*SS,sh_y),(cx-2*SS,sh_y+4*SS),(cx-2*SS,sh_y-12*SS)],fill=JACKD,outline=OUT)
    d.polygon([(cx+16*SS,sh_y),(cx+2*SS,sh_y+4*SS),(cx+2*SS,sh_y-12*SS)],fill=JACKD,outline=OUT)
    d.line([(cx,sh_y+18*SS),(cx,hip_y-6*SS)],fill=JACKD,width=3*SS)
    for s in (-1,1): RR(d,cx+s*34*SS-12*SS,hip_y-46*SS,cx+s*34*SS+12*SS,hip_y-20*SS,4*SS,JACK,outline=JACKD,ow=2)
    # ARMS
    la1=pt(cx-50*SS,sh_y+8*SS,-14+math.sin(t*4)*5,58*SS); la2=pt(*la1,-6,50*SS)
    limb(d,(cx-50*SS,sh_y+8*SS),la1,17,JACK,hi=JACKL); limb(d,la1,la2,14,JACKD); E(d,la2[0],la2[1],11*SS,11*SS,SKIN,ow=3)
    el=pt(cx+50*SS,sh_y+8*SS,ra_ang,58*SS); bend=ra_ang+(14 if ra_ang>5 else 60); ha=pt(*el,bend,50*SS)
    limb(d,(cx+50*SS,sh_y+8*SS),el,17,JACK,hi=JACKL); limb(d,el,ha,14,JACKD); E(d,ha[0],ha[1],11*SS,11*SS,SKIN,ow=3)
    if phone_lit is not None:
        RR(d,ha[0]-12*SS,ha[1]-19*SS,ha[0]+12*SS,ha[1]+19*SS,5*SS,(30,30,30))
        RR(d,ha[0]-8*SS,ha[1]-14*SS,ha[0]+8*SS,ha[1]+14*SS,3*SS,phone_lit,outline=phone_lit,ow=1)
    # NECK + HEAD
    d.rectangle([cx-12*SS,sh_y-18*SS,cx+12*SS,sh_y+2*SS],fill=SKIND)
    hx=cx+4*SS*look; hy=head_cy+6*SS*look
    for s in (-1,1): E(d,hx+s*42*SS,hy+4*SS,9*SS,12*SS,SKIN)
    E(d,hx,hy,44*SS,52*SS,SKIN)
    d.ellipse([(hx-40)*SS,(hy-44)*SS,(hx-6)*SS,(hy-6)*SS],fill=(255,222,190,90))     # soft sheen
    d.ellipse([(hx+18)*SS,(hy-2)*SS,(hx+40)*SS,(hy+30)*SS],fill=(210,166,128,70))    # shade right
    # blush
    for s in (-1,1): d.ellipse([(hx+s*24-9)*SS,(hy+12)*SS,(hx+s*24+9)*SS,(hy+22)*SS],fill=(236,150,140,90))
    # hair
    d.pieslice([(hx-46)*SS,(hy-60)*SS,(hx+46)*SS,(hy+18)*SS],180,360,fill=HAIR,outline=OUT,width=3*SS)
    d.polygon([(hx-46*SS,hy-6*SS),(hx-46*SS,hy-30*SS),(hx-8*SS,hy-46*SS),(hx+22*SS,hy-30*SS),(hx+46*SS,hy-34*SS),(hx+46*SS,hy-6*SS)],fill=HAIR)
    d.line([(hx-18*SS,hy-42*SS),(hx+28*SS,hy-36*SS)],fill=HAIRH,width=4*SS)
    ld=look*7*SS
    d.line([(hx-26*SS,hy-12*SS+ld),(hx-10*SS,hy-15*SS+ld)],fill=HAIR,width=4*SS)
    d.line([(hx+10*SS,hy-15*SS+ld),(hx+26*SS,hy-12*SS+ld)],fill=HAIR,width=4*SS)
    for s in (-1,1):
        ex=hx+s*17*SS
        if blink: d.line([(ex-9*SS,hy-2*SS+ld),(ex+9*SS,hy-2*SS+ld)],fill=OUT,width=4*SS)
        elif wink and s>0: d.line([(ex-9*SS,hy-2*SS),(ex+9*SS,hy-2*SS)],fill=OUT,width=4*SS)
        else:
            E(d,ex,hy-2*SS+ld*0.5,9*SS,11*SS,WHITE,ow=2)
            E(d,ex+math.sin(t*1.3)*3*SS,hy-1*SS+ld,4.5*SS,5.5*SS,OUT,ow=1)
            d.ellipse([(ex-2)*SS,(hy-5+ld/SS)*SS,(ex+1)*SS,(hy-2+ld/SS)*SS],fill=WHITE)  # catchlight
    d.line([(hx,hy+2*SS+ld),(hx+5*SS,hy+12*SS+ld)],fill=SKIND,width=3*SS)
    d.line([(hx+5*SS,hy+12*SS+ld),(hx-2*SS,hy+13*SS+ld)],fill=SKIND,width=3*SS)
    my=hy+28*SS+ld; mo=3*SS+env*16*SS
    E(d,hx,my,15*SS,mo,MOUTH)
    if mo>10*SS: E(d,hx,my+mo*0.3,8*SS,mo*0.4,TONGUE)
    # phone glow on face when lit
    if phone_lit==(127,208,255):
        d.ellipse([(hx-46)*SS,(hy+4)*SS,(hx+46)*SS,(hy+70)*SS],fill=(127,208,255,46))

def make_vignette():
    m=Image.new("L",(W*SS,H*SS),0); dd=ImageDraw.Draw(m)
    dd.ellipse([-W*0.25*SS,-H*0.18*SS,W*1.25*SS,H*1.18*SS],fill=255)
    m=m.filter(ImageFilter.GaussianBlur(120*SS//10))
    return m
VIG=make_vignette()
BLACK=Image.new("RGB",(W*SS,H*SS),(0,0,0))

def render_frame(fi):
    t=fi/FPS
    img=Image.new("RGB",(W*SS,H*SS),(20,18,40)); d=ImageDraw.Draw(img,"RGBA")
    draw_bg(d,t)
    q=math.floor(t*8)/8.0; jx=math.sin(q*53)*2.0*SS; jy=math.cos(q*41)*1.8*SS
    cx=W*SS*0.40+jx; gy=H*SS*0.95+jy
    ra=key(t,[(0,12),(0.6,12),(0.9,2),(1.3,12),(6,12),(6.25,12),(6.5,-34),(8.2,-34),(9,12),(12,12)],over=0.5)
    look=key(t,[(0,0),(6.4,0),(6.6,1),(8.0,1),(8.6,0),(12,0)])
    env=abs(math.sin(t*9.5))*(0.5+0.5*abs(math.sin(t*2.1)))
    if 6.3<t<6.7: env*=0.1
    blink=(t%3.0)>2.86; wink=t>10.5 and (t%0.6)<0.4
    phone=None
    if 6.5<=t<=8.9: phone=(58,45,94); phone=(127,208,255) if 6.65<=t<=8.0 else ((140,140,140) if t>8.0 else (58,45,94))
    draw_person(d,cx,gy,t,ra,look,env,blink,wink,jy,phone)
    if 6.5<t<6.7:
        sh=(cx+50*SS,gy-244*SS); d.line([sh,(sh[0]+72*SS,sh[1]+8*SS)],fill=AMBER,width=4*SS)
    draw_dust(d,t)
    # PROPS
    if 2.0<=t<=4.0:
        sx,sy=W*SS*0.82,H*SS*0.15; E(d,sx,sy,24*SS,24*SS,WHITE,ow=4); RR(d,sx-6*SS,sy-32*SS,sx+6*SS,sy-24*SS,2*SS,WHITE)
        ha=(t*6)%(2*math.pi); d.line([(sx,sy),(sx+16*SS*math.sin(ha),sy-16*SS*math.cos(ha))],fill=AMBER,width=3*SS)
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
        f=(t-6.9)/0.9; sc=1.3*math.sin(f*math.pi)*SS; stx,sty=W*SS*0.72,H*SS*0.33; pts=[]
        for i in range(10):
            a=math.radians(i*36-90); rr=20 if i%2==0 else 8; pts.append((stx+rr*sc*math.cos(a),sty+rr*sc*math.sin(a)))
        d.polygon(pts,fill=(255,211,77),outline=(255,157,0))
    # CAPTION with pop + shadow
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

    # ---- post: vignette + grade + camera zoom ----
    img=Image.composite(img,BLACK,VIG)
    img=ImageEnhance.Color(img).enhance(1.14)
    img=ImageEnhance.Contrast(img).enhance(1.07)
    z=1.0+0.05*(t/DUR)                                   # slow zoom-in
    cw,ch=int(W*SS/z),int(H*SS/z); l=(W*SS-cw)//2; tp=int((H*SS-ch)*0.42)
    img=img.crop((l,tp,l+cw,tp+ch))
    return img.resize((W,H),Image.LANCZOS)

if __name__=="__main__":
    print(f"Rendering {N} frames @ SS{SS} (MAX)...")
    writer=imageio.get_writer("/tmp/s6-max.mp4",fps=FPS,codec="libx264",quality=9,ffmpeg_params=["-pix_fmt","yuv420p"])
    stills={24:"hook",96:"loop",132:"snap",200:"grey",264:"wink"}
    for i in range(N):
        im=render_frame(i); writer.append_data(np.asarray(im.convert("RGB")))
        if i in stills: im.convert("RGB").save(f"/tmp/s6m_{stills[i]}.png")
        if i%48==0: print(f"  {i}/{N}")
    writer.close(); print("done -> /tmp/s6-max.mp4")
