#!/usr/bin/env python3
"""CINEMATIC: IK-Lauf-Zyklus, federnde menschliche Bewegung, Shot-System (Schnitte/
Push-ins/Handheld), Tiefenschaerfe (bg-Blur), Licht (Schatten/Rim/Scheinwerfer-Sweep/
Grade/Bloom), Smears. Reuse: Stimme/Lip-Sync/Captions/Props.
Aufruf: python3 anim_film.py <key> [--still T]"""
import sys, json, math, bisect, subprocess, random, numpy as np, imageio.v2 as imageio, imageio_ffmpeg
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
from render_s6_max import draw_bg, draw_dust, W, H, SS, font, E, RR, limb, OUT, WHITE, AMBER, key as KEY
FONTP="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
_VG=Image.new("L",(W*SS,H*SS),0); ImageDraw.Draw(_VG).ellipse([-W*SS*0.2,-H*SS*0.12,W*SS*1.2,H*SS*1.12],fill=255)
_VG=_VG.filter(ImageFilter.GaussianBlur(120*SS//3)); _BLACK=Image.new("RGB",(W*SS,H*SS),(0,0,0))

BODY=(245,205,222); BODYD=(224,176,200); BODYL=(255,233,242); BELLY=(255,244,249)
EAR=(245,205,222); NOSE=(208,110,135); BLUSH=(255,150,170); MOUTH=(150,66,70)
TONGUE=(228,118,120); PUP=(40,32,46); TEETH=(255,255,255)
CW,CH=360,560
def L(v): return v*SS
def sm(x): x=max(0.0,min(1.0,x)); return x*x*(3-2*x)
def pt(x,y,ang,ln): a=math.radians(ang); return (x+math.sin(a)*ln, y+math.cos(a)*ln)
def nz(t,s): return (math.sin(t*1.7+s)+math.sin(t*2.9+s*2)*0.6+math.sin(t*0.7+s*3)*0.4)/2.0

# ---- 2-bone IK (2D): hip + foot target -> knee, foot (clamped) ----
def ik(hip,foot,l1,l2,bend=1):
    hx,hy=hip; fx,fy=foot; dx,dy=fx-hx,fy-hy; d=math.hypot(dx,dy) or 1e-3
    d=max(abs(l1-l2)+1,min(l1+l2-1,d)); ang=math.atan2(dy,dx)
    fx,fy=hx+math.cos(ang)*d,hy+math.sin(ang)*d
    a=math.acos(max(-1,min(1,(l1*l1+d*d-l2*l2)/(2*l1*d))))
    ka=ang-bend*a; kx,ky=hx+math.cos(ka)*l1,hy+math.sin(ka)*l1
    return (kx,ky),(fx,fy)

# ================= dynamic background (parallax-ready) =================
random.seed(21)
FLICK=[(random.uniform(0.04,0.96)*W,random.uniform(0.22,0.55)*H,random.uniform(1.5,5),random.uniform(0,6.28)) for _ in range(22)]
CLOUDS=[(random.uniform(0,1),random.uniform(0.06,0.20),random.uniform(34,60),random.uniform(0.006,0.014)) for _ in range(3)]
NEON=[(random.uniform(0.06,0.9)*W,random.uniform(0.24,0.5)*H,random.uniform(26,52),random.choice([(255,90,160),(90,220,255),(255,180,60),(150,120,255)]),random.uniform(2,5),random.uniform(0,6.28)) for _ in range(6)]
PEOPLE=[(random.uniform(0,1),random.choice([-1,1])*random.uniform(0.03,0.06),random.uniform(0,6.28),random.uniform(0.85,1.2)) for _ in range(7)]
def draw_bg_extra(d,t):
    SW=H*0.585
    for x0,y0,r,v in CLOUDS:
        x=((x0+t*v)%1.3-0.15)*W
        for dx in (-r*0.7,0,r*0.7): d.ellipse([(x+dx-r)*SS,(y0*H-r*0.6)*SS,(x+dx+r)*SS,(y0*H+r*0.6)*SS],fill=(60,54,92,70))
    for fx,fy,rate,ph in FLICK:
        on=math.sin(t*rate+ph)>0.25; c=(255,216,130) if on else (30,26,50)
        d.rectangle([fx*SS,fy*SS,(fx+10)*SS,(fy+14)*SS],fill=c)
        if on: d.rectangle([(fx-1)*SS,(fy-1)*SS,(fx+11)*SS,(fy+15)*SS],fill=(255,216,130,40))
    for nx,ny,nw,col,rate,ph in NEON:
        pulse=0.4+0.6*(0.5+0.5*math.sin(t*rate+ph)); c=tuple(int(v*pulse) for v in col)
        d.rounded_rectangle([nx*SS,ny*SS,(nx+nw)*SS,(ny+12)*SS],radius=3*SS,fill=c,outline=tuple(min(255,int(v*1.2)) for v in col),width=2*SS)
        d.ellipse([(nx-10)*SS,(ny-8)*SS,(nx+nw+10)*SS,(ny+20)*SS],fill=col+(int(50*pulse),))
    ax=((t*0.03)%1.2-0.1)*W; ay=H*0.09
    d.ellipse([(ax-2)*SS,(ay-2)*SS,(ax+2)*SS,(ay+2)*SS],fill=(220,220,255))
    if int(t*2)%2==0: d.ellipse([(ax-3)*SS,(ay-1)*SS,(ax+1)*SS,(ay+3)*SS],fill=(255,80,80))
    for x0,sp,ph,sc in PEOPLE:
        x=((x0+t*sp)%1.25-0.12)*W; y=SW; hh=22*sc; step=math.sin(t*sp*60+ph); bob=abs(math.sin(t*sp*60+ph))*2; col=(18,16,30)
        d.ellipse([(x-3*sc)*SS,(y-hh-bob)*SS,(x+3*sc)*SS,(y-hh+6*sc-bob)*SS],fill=col)
        d.line([((x)*SS,(y-hh+4*sc-bob)*SS),((x)*SS,(y-6*sc)*SS)],fill=col,width=int(3*sc*SS))
        d.line([((x)*SS,(y-6*sc)*SS),((x-4*sc*step)*SS,y*SS)],fill=col,width=int(2.5*sc*SS))
        d.line([((x)*SS,(y-6*sc)*SS),((x+4*sc*step)*SS,y*SS)],fill=col,width=int(2.5*sc*SS))
    lanes=[(0.55,0.0,0.70,1),(0.40,0.5,0.80,1),(0.7,0.25,0.66,1),(0.5,0.15,0.74,-1),(0.62,0.7,0.86,-1)]
    for sp,off,yy,dr in lanes:
        p=((t*sp+off)%1.6)-0.2
        if 0<=p<=1.05:
            cxp=(p if dr>0 else 1-p)*W; ry=yy*H; gw=70
            glow=(255,238,180,60) if dr>0 else (255,90,90,55); core=(255,250,220,160) if dr>0 else (255,120,120,150)
            d.ellipse([(cxp-gw)*SS,(ry-7)*SS,(cxp+gw)*SS,(ry+7)*SS],fill=glow)
            d.ellipse([(cxp-12)*SS,(ry-4)*SS,(cxp+12)*SS,(ry+4)*SS],fill=core)

def draw_prop(ld,name,hx,hy,t,lit=None):
    if name=="phone":
        sc=lit or (58,45,94); RR(ld,hx-L(12),hy-L(18),hx+L(12),hy+L(18),L(5),(30,30,30)); RR(ld,hx-L(8),hy-L(13),hx+L(8),hy+L(13),L(3),sc,outline=sc,ow=1)
    elif name=="cig":
        ex,ey=hx-L(36),hy-L(22); ld.line([(hx,hy),(ex,ey)],fill=(40,40,40),width=int(L(9))); ld.line([(hx,hy),(ex,ey)],fill=WHITE,width=int(L(6)))
        ld.line([(hx,hy),(hx-L(11),hy-L(7))],fill=(210,160,90),width=int(L(6))); E(ld,ex,ey,L(7),L(7),(255,120,40,90),outline=None,ow=0); E(ld,ex,ey,L(3.5),L(3.5),(255,140,50),outline=(255,140,50),ow=1)
        for i in range(3): sx=ex+math.sin(t*3+i)*L(6); sy=ey-L(12)-i*L(13); ld.ellipse([sx-L(4),sy-L(5),sx+L(4),sy+L(5)],fill=(225,225,225,70))
    elif name=="donut":
        E(ld,hx,hy,L(22),L(22),(228,170,120)); E(ld,hx,hy-L(2),L(22),L(18),(246,150,200))
        for dx,dy,c in [(-9,-6,(255,255,255)),(6,-9,(120,220,255)),(1,2,(255,240,120)),(11,1,(150,255,150)),(-11,4,(255,150,150))]: ld.line([(hx+L(dx),hy+L(dy)),(hx+L(dx+4),hy+L(dy+4))],fill=c,width=int(L(2.5)))
        E(ld,hx,hy,L(8),L(8),(36,28,48))
    elif name=="cal":
        ld.rectangle([hx-L(10),hy-L(26),hx-L(7),hy-L(17)],fill=(120,120,130)); ld.rectangle([hx+L(7),hy-L(26),hx+L(10),hy-L(17)],fill=(120,120,130))
        RR(ld,hx-L(17),hy-L(20),hx+L(17),hy+L(18),L(3),WHITE); ld.rectangle([hx-L(17),hy-L(20),hx+L(17),hy-L(8)],fill=(220,70,70))
        for gy2 in range(3):
            for gx in range(4): cx=hx-L(12)+gx*L(8); cy=hy-L(3)+gy2*L(7); ld.ellipse([cx-L(1.5),cy-L(1.5),cx+L(1.5),cy+L(1.5)],fill=(150,150,160))
        ld.ellipse([hx+L(1),hy+L(2),hx+L(13),hy+L(14)],outline=(220,70,70),width=int(L(2.5)))

# ================= character (IK legs, spring secondary) =================
LT,LSh=L(74),L(64)   # thigh, shin
def draw_char(ld,t,P):
    """returns (head_local, hand_local) in layer px. P: pose dict."""
    cx=L(CW/2)+P["X"]*SS; bob=P["bob"]*SS; lean=P["lean"]
    hipY=L(420)+bob; hip=(cx,hipY)
    sh=(cx+math.sin(math.radians(lean))*L(120), L(300)+bob)
    grY=L(470)
    # tail (spring)
    E(ld,cx+L(70),L(388)+bob,L(30),L(34),BODYD); E(ld,cx+L(74)+P["tail"]*SS,L(380)+bob,L(19),L(21),WHITE)
    # legs via IK to foot targets
    for side in ("L","R"):
        s=-1 if side=="L" else 1; hx=hip[0]+s*L(22); ft=P["foot"+side]
        knee,foot=ik((hx,hipY),(ft[0]*SS+cx,ft[1]*SS),LT,LSh,bend=1)
        limb(ld,(hx,hipY),knee,21,BODY,hi=BODYL); limb(ld,knee,foot,17,BODYD,hi=BODYL)
        fx,fy=foot; E(ld,fx+s*L(6),fy+L(2),L(20),L(12),BODYD)
    # body
    bx0,bx1=sh[0]-L(70),sh[0]+L(70)
    ld.polygon([(bx0,sh[1]),(bx1,sh[1]),(hip[0]+L(60),hip[1]),(hip[0]-L(60),hip[1])],fill=BODY,outline=OUT)
    E(ld,(sh[0]+hip[0])/2,(sh[1]+hip[1])/2+L(20),L(46),L(58),BELLY)
    # arms
    for side,(sa,ea) in (("L",P["armL"]),("R",P["armR"])):
        if side=="R" and P.get("prop"): continue
        s=-1 if side=="L" else 1; shx=sh[0]+s*L(56); shy=sh[1]+L(6)
        el=pt(shx,shy,sa,L(54)); hand=pt(*el,sa+ea,L(48))
        limb(ld,(shx,shy),el,16,BODY,hi=BODYL); limb(ld,el,hand,13,BODYD); E(ld,hand[0],hand[1],L(13),L(13),BODY)
        if P.get("smear") and side=="R": ld.line([(shx,shy),hand],fill=(255,176,32,90),width=int(L(3)))
    # head
    ht=P["headturn"]; look=P["look"]; hx=sh[0]+ht*L(16); hy=sh[1]-L(70)+bob*0.2
    for s in (-1,1):
        exu=hx+s*L(38)+ht*L(10); ey=hy-L(96)+P["ear"]*(1 if s>0 else -1)
        E(ld,exu,ey,L(18),L(54),EAR); E(ld,exu,ey+L(6),L(10),L(40),BLUSH)
    E(ld,hx,hy,L(92),L(88),BODY); E(ld,hx-L(32),hy-L(32),L(32),L(28),BODYL)
    for s in (-1,1): E(ld,hx+s*L(56),hy+L(24),L(19),L(13),BLUSH,outline=BLUSH,ow=1)
    ew=L(36)*(1+0.22*P["eyewide"]); eh=L(44)*(1+0.3*P["eyewide"]); ld2=look*L(9); sac=P.get("sac",0)*L(6)
    for s in (-1,1):
        ox=hx+s*L(36)+ht*L(10)
        if P["blink"]: ld.line([(ox-ew*0.8,hy-L(6)),(ox+ew*0.8,hy-L(6))],fill=OUT,width=int(L(5)))
        else:
            E(ld,ox,hy-L(6),ew,eh,WHITE,ow=3); pr=L(16)*(1-0.25*P["eyewide"]); px=ox+ht*L(5)+sac; py=hy-L(2)+ld2
            E(ld,px,py,pr,pr*1.12,PUP,outline=PUP,ow=1); E(ld,px-pr*0.35,py-pr*0.4,pr*0.42,pr*0.42,WHITE,outline=WHITE,ow=1)
    E(ld,hx+ht*L(6),hy+L(20),L(10),L(8),NOSE,outline=NOSE,ow=1)
    my=hy+L(38); mo=L(4)+P["env"]*L(18); E(ld,hx+ht*L(6),my,L(16)*P["mw"],mo,MOUTH)
    if mo>L(11): E(ld,hx+ht*L(6),my+mo*0.3,L(8),mo*0.4,TONGUE)
    else:
        ld.rectangle([hx+ht*L(6)-L(8),my-L(2),hx+ht*L(6)-L(1),my+L(9)],fill=TEETH,outline=OUT,width=int(L(1.5)))
        ld.rectangle([hx+ht*L(6)+L(1),my-L(2),hx+ht*L(6)+L(8),my+L(9)],fill=TEETH,outline=OUT,width=int(L(1.5)))
    handR=(hx,hy)
    if P.get("prop"):
        sa,ea=P["armR"]; shx=sh[0]+L(56); shy=sh[1]+L(6); el=pt(shx,shy,sa,L(54)); hand=pt(*el,sa+ea,L(48))
        limb(ld,(shx,shy),el,16,BODY,hi=BODYL); limb(ld,el,hand,13,BODYD); E(ld,hand[0],hand[1],L(13),L(13),BODY)
        draw_prop(ld,P["prop"],hand[0],hand[1],t,P.get("phone_lit")); handR=hand
        if P.get("phone_lit")==(127,208,255): ld.ellipse([hx-L(48),hy+L(2),hx+L(48),hy+L(70)],fill=(127,208,255,46))
    return (hx,hy),handR

# ================= performance blocking (walk + act) =================
def perform(t,DUR,env,eyewide,blink,prop,sac):
    P=dict(env=env,eyewide=eyewide,blink=blink,mw=1.0,sac=sac)
    WALK=2.2; gr=470.0          # ground y in layer-local (pre-SS)
    stance_w=26
    if t<WALK:   # WALK IN (locomotion, IK planted feet)
        p=sm(t/WALK); P["X"]=-160+160*p
        ph=t*2.4
        def footpos(off):
            cyc=(ph+off)%1.0; stride=34
            if cyc<0.6: fx=stride*(0.5-cyc/0.6); fy=gr            # stance (planted, slides back)
            else: s=(cyc-0.6)/0.4; fx=stride*(-0.5+s); fy=gr-30*math.sin(s*math.pi)  # swing (lift)
            return (fx,fy)
        P["footL"]=footpos(0.0); P["footR"]=footpos(0.5)
        P["bob"]=-4-3*math.cos(ph*2*math.pi*2); P["lean"]=6
        P["armL"]=(-22+26*math.sin(ph*2*math.pi+math.pi),16); P["armR"]=(22+26*math.sin(ph*2*math.pi),16)
        P["headturn"]=0.35; P["look"]=0.1; P["ear"]=math.sin(ph*2*math.pi)*7*SS/SS; P["tail"]=math.sin(ph*8)*8
    else:        # STAND & ACT (planted feet, weight shift, breathing)
        tt=t-WALK; P["X"]=0
        wsh=math.sin(tt*1.4); P["lean"]=4*wsh
        P["footL"]=(-stance_w,gr); P["footR"]=(stance_w,gr)
        breath=math.sin(tt*2*math.pi*0.5)*2
        P["bob"]=breath+ (-1.5*abs(wsh))
        # gestures (eased) alternating
        g=tt%2.6
        if g<0.9:
            gg=sm(g/0.45) if g<0.45 else sm((0.9-g)/0.45)
            if int(tt/2.6)%2==0: P["armR"]=(-30-45*gg,-10-30*gg); P["armL"]=(-16+6*nz(tt,1),16)
            else: P["armL"]=(30+45*gg,10+30*gg); P["armR"]=(16+6*nz(tt,2),16)
        else: P["armR"]=(18+6*nz(tt,3),16); P["armL"]=(-18+6*nz(tt,4),16)
        P["headturn"]=0.4*math.sin(tt*0.9)+0.08*nz(tt,5); P["look"]=0.25*math.sin(tt*0.9)
        P["ear"]=math.sin(tt*5)*5*SS/SS; P["tail"]=math.sin(tt*6)*12
    if prop:
        if prop in ("phone","cig"): P["armR"]=(-95,-54); P["look"]=0.9
        else: P["armR"]=(-74,-30); P["look"]=0.6
        P["headturn"]=0.05; P["eyewide"]=max(P["eyewide"],0.3)
    # spring secondary: ears/tail lag already sine; smear flag on fast arm
    P["smear"]=False
    return P

# ================= load audio-driven data =================
K=sys.argv[1]
cues=json.load(open(f"/tmp/{K}_cues.json")); DUR=cues["metadata"]["duration"]
words=json.load(open(f"/tmp/{K}_words.json")); FPS=30; N=int(FPS*DUR)
SHAPE={"X":(0,1),"A":(0,0.9),"B":(0.2,1),"C":(0.5,1.15),"D":(0.9,1.25),"E":(0.55,0.7),"F":(0.35,0.55),"G":(0.22,0.95),"H":(0.42,1)}
mc=cues["mouthCues"]; mstarts=[c["start"] for c in mc]
def shp(tt): i=max(0,min(bisect.bisect_right(mstarts,tt)-1,len(mc)-1)); return mc[i]["value"]
ENV=[0.0]*N; MW=[1.0]*N; pe,pw=0.0,1.0
for fi in range(N): e,w=SHAPE.get(shp(fi/FPS),(0.2,1.0)); pe+=(e-pe)*0.5; pw+=(w-pw)*0.5; ENV[fi]=pe; MW[fi]=pw
wstarts=[w["start"] for w in words]
PROP_TRIG={"s6":("phone","handy"),"s7":("cig","zigarette"),"s5":("donut","süße"),"s3":("cal","tage"),
           "s1":("phone","handy"),"s8":("phone","scroll"),"s14":("donut","marshmallow"),"s11":("phone","zwei")}
PNAME,PSUB=PROP_TRIG.get(K,(None,None)); TRIG=None
if PSUB:
    for w in words:
        if PSUB in w["w"].lower(): TRIG=w["start"]; break
    if TRIG is None: TRIG=DUR*0.5
def word_at(tt):
    i=bisect.bisect_right(wstarts,tt)-1
    if 0<=i<len(words) and words[i]["start"]<=tt<=words[i]["end"]+0.08: return words[i]
    return None

# ================= shot / camera system =================
def shots():
    # fractions of DUR; type, base zoom; focus: body/head/hand
    base=[(0.00,0.18,"wide",1.18,"body"),(0.18,0.34,"med",1.7,"chest"),(0.34,0.50,"cu",2.7,"head"),
          (0.50,0.66,"med",1.8,"chest"),(0.66,0.82,"cu",2.7,"head"),(0.82,1.01,"wide",1.2,"body")]
    return base
SHOTS=shots()
def cam_at(t, head, hand, prop):
    fr=t/DUR
    sh=SHOTS[-1]
    for s in SHOTS:
        if s[0]<=fr<s[1]: sh=s; break
    a,b,typ,zoom,foc=sh
    # prop insert override: cut to medium-close on the hand while prop active
    if prop and TRIG is not None and TRIG<=t<=TRIG+2.6:
        typ="insert"; zoom=2.1; foc="hand"
    p=(fr-a)/max(1e-3,(b-a))
    zoom=zoom*(1+0.05*sm(p))            # gentle push-in within shot
    if foc=="head": fx,fy=head
    elif foc=="hand": fx,fy=hand
    elif foc=="chest": fx,fy=head[0],head[1]+H*SS*0.10
    else: fx,fy=W*SS*0.42,H*SS*0.62
    # handheld micro-shake
    fx+=nz(t,7)*W*SS*0.006; fy+=nz(t,8)*H*SS*0.006
    dof = {"cu":16,"insert":11,"med":5,"wide":0}.get(typ,0)
    grade={"cu":(1.10,1.07,(255,238,210,18)),"insert":(1.12,1.05,(255,238,210,16)),
           "med":(1.14,1.06,(255,235,225,10)),"wide":(1.18,1.05,(180,200,255,14))}.get(typ,(1.15,1.05,None))
    return fx,fy,zoom,dof,grade,typ

# ================= compositing =================
def render_scene(t,fi):
    """full-res scene image (RGB) + char head/hand scene coords + prop info."""
    bg=Image.new("RGB",(W*SS,H*SS),(20,18,40)); d=ImageDraw.Draw(bg,"RGBA")
    draw_bg(d,t); draw_bg_extra(d,t)
    prop=PNAME if (TRIG is not None and TRIG-0.25<=t<=TRIG+2.7) else None
    lit=None
    if prop=="phone": lit=(127,208,255) if t<=TRIG+1.7 else (140,140,140)
    sac=1.0 if (math.sin(t*3.3)>0.93) else 0.0
    P=perform(t,DUR,ENV[fi],0.2*max(0,math.sin(t*1.1)),(t%3.1)>3.0,prop,sac)
    P["prop"]=prop; P["phone_lit"]=lit; P["mw"]=MW[fi]
    layer=Image.new("RGBA",(CW*SS,CH*SS),(0,0,0,0)); ld=ImageDraw.Draw(layer,"RGBA")
    headL,handL=draw_char(ld,t,P)
    # squash & stretch + scale + paste
    bnc=math.sin(t*2*math.pi*1.5); sy=1+0.035*bnc; sx=1/sy; scl=0.74
    w2=max(1,int(CW*SS*sx*scl)); h2=max(1,int(CH*SS*sy*scl)); sc=layer.resize((w2,h2),Image.LANCZOS)
    px=int(W*SS*0.42+P["X"]*SS-w2*0.5); py=int(H*SS*0.99-h2)
    # ground contact shadow (on bg, before char)
    shy=H*SS*0.965; d.ellipse([px+w2*0.5-L(60),shy-L(12),px+w2*0.5+L(60),shy+L(12)],fill=(0,0,0,90))
    bg.paste(sc,(px,py),sc)
    def mapL(p): return (px+p[0]*w2/(CW*SS), py+p[1]*h2/(CH*SS))
    head=mapL(headL); hand=mapL(handL)
    # rim light + headlight sweep over character region
    sweep=(t*0.5)%4.0
    if sweep<1.0:
        sx0=int((sweep-0.2)*W*SS); gl=Image.new("RGBA",(W*SS,H*SS),(0,0,0,0)); gd=ImageDraw.Draw(gl)
        gd.ellipse([sx0-L(60),py,sx0+L(60),py+h2],fill=(255,225,170,46)); bg=Image.alpha_composite(bg.convert("RGBA"),gl).convert("RGB")
    return bg,head,hand,prop

def bloom(img):
    arr=np.asarray(img).astype(np.float32); br=np.clip(arr-150,0,255)
    bl=Image.fromarray(br.astype(np.uint8)).filter(ImageFilter.GaussianBlur(10*SS//3))
    out=np.clip(arr+np.asarray(bl).astype(np.float32)*0.5,0,255).astype(np.uint8)
    return Image.fromarray(out)

def frame(fi):
    t=fi/FPS
    scene,head,hand,prop=render_scene(t,fi)
    fx,fy,zoom,dof,grade,typ=cam_at(t,head,hand,prop)
    # depth of field: blur background-ish (whole scene) for close shots, char stays mostly sharp
    if dof>0:
        blurred=scene.filter(ImageFilter.GaussianBlur(dof*SS//3))
        # keep a sharp oval around the subject (focus)
        m=Image.new("L",scene.size,0); md=ImageDraw.Draw(m)
        rr=W*SS*0.30 if typ=="cu" else W*SS*0.4
        md.ellipse([head[0]-rr,head[1]-rr*1.2,head[0]+rr,head[1]+rr*1.2],fill=255); m=m.filter(ImageFilter.GaussianBlur(40*SS//3))
        scene=Image.composite(scene,blurred,m)
    # camera crop
    cw,ch=W*SS/zoom,H*SS/zoom
    l=max(0,min(W*SS-cw,fx-cw/2)); tp=max(0,min(H*SS-ch,fy-ch/2))
    img=scene.crop((int(l),int(tp),int(l+cw),int(tp+ch))).resize((W*SS,H*SS),Image.LANCZOS)
    # grade + bloom + vignette
    cc,ct,tint=grade
    img=ImageEnhance.Color(img).enhance(cc); img=ImageEnhance.Contrast(img).enhance(ct)
    if tint:
        ov=Image.new("RGBA",img.size,tint); img=Image.alpha_composite(img.convert("RGBA"),ov).convert("RGB")
    img=bloom(img)
    img=Image.composite(img,_BLACK,_VG)
    img=img.resize((W,H),Image.LANCZOS)
    # captions (screen space, after camera)
    d=ImageDraw.Draw(img,"RGBA"); wd=word_at(t)
    if wd and wd["w"].strip():
        txt=wd["w"].upper().strip(".,!?")
        if txt:
            sz=46; ft=ImageFont.truetype(FONTP,sz)
            bb=d.textbbox((0,0),txt,font=ft); tw=bb[2]-bb[0]
            if tw>W*0.84: sz=int(sz*W*0.84/tw); ft=ImageFont.truetype(FONTP,sz); bb=d.textbbox((0,0),txt,font=ft); tw=bb[2]-bb[0]
            th=bb[3]-bb[1]; bx=W/2; by=H*0.13
            d.rounded_rectangle([bx-tw/2-14,by-8,bx+tw/2+14,by+th+16],radius=12,fill=(18,12,32,230),outline=(255,176,32,210),width=3)
            d.text((bx-tw/2+2,by+5),txt,font=ft,fill=(0,0,0,170)); d.text((bx-tw/2,by+3),txt,font=ft,fill=(250,235,120))
    return img

if __name__=="__main__":
    if "--still" in sys.argv:
        T=float(sys.argv[sys.argv.index("--still")+1]); frame(int(T*FPS)).save(f"/tmp/film_{K}_{T}.png"); print("still saved")
    else:
        print(f"[{K}] FILM {N} frames")
        tmp=f"/tmp/{K}_film_noa.mp4"; wr=imageio.get_writer(tmp,fps=FPS,codec="libx264",quality=9,ffmpeg_params=["-pix_fmt","yuv420p"])
        for i in range(N):
            wr.append_data(np.asarray(frame(i).convert("RGB")))
            if i%60==0: print(f"  {i}/{N}")
        wr.close(); ff=imageio_ffmpeg.get_ffmpeg_exe()
        subprocess.run([ff,"-y","-i",tmp,"-i",f"/tmp/{K}.wav","-c:v","copy","-c:a","aac","-b:a","128k","-shortest",f"/tmp/clipfilm_{K}.mp4"],check=True,capture_output=True)
        print(f"done -> /tmp/clipfilm_{K}.mp4")
