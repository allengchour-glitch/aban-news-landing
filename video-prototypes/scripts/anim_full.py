#!/usr/bin/env python3
"""VOLLE ANIMATION: artikulierter Hase (Knie/Ellbogen-FK), Lauf-Zyklus (laeuft ins Bild),
Gesten, Gewichtsverlagerung, Kopf-Drehen, Huepfer, Ohren/Schwanz-Nachschwingen.
Aufruf: python3 anim_full.py <key> [--still T]"""
import sys, json, math, bisect, subprocess, numpy as np, imageio.v2 as imageio, imageio_ffmpeg
from PIL import Image, ImageDraw, ImageEnhance
from render_s6_max import draw_bg, draw_dust, VIG, BLACK, W, H, SS, font, key as KEYF, E, RR, limb, OUT, WHITE, AMBER

BODY=(245,205,222); BODYD=(224,176,200); BODYL=(255,233,242); BELLY=(255,244,249)
EAR=(245,205,222); NOSE=(208,110,135); BLUSH=(255,150,170); MOUTH=(150,66,70)
TONGUE=(228,118,120); PUP=(40,32,46); TEETH=(255,255,255)
CW,CH=360,560
def L(v): return v*SS
def sm(x): x=max(0,min(1,x)); return x*x*(3-2*x)
def pt(x,y,ang,ln): a=math.radians(ang); return (x+math.sin(a)*ln, y+math.cos(a)*ln)

import random as _r
_r.seed(21)
FLICK=[(_r.uniform(0.04,0.96)*W,_r.uniform(0.22,0.55)*H,_r.uniform(1.5,5),_r.uniform(0,6.28)) for _ in range(22)]
CLOUDS=[(_r.uniform(0,1),_r.uniform(0.06,0.20),_r.uniform(34,60),_r.uniform(0.006,0.014)) for _ in range(3)]
NEON=[(_r.uniform(0.06,0.9)*W,_r.uniform(0.24,0.5)*H,_r.uniform(26,52),_r.choice([(255,90,160),(90,220,255),(255,180,60),(150,120,255)]),_r.uniform(2,5),_r.uniform(0,6.28)) for _ in range(6)]
# people: (x0, speed dir, phase, scale)
PEOPLE=[(_r.uniform(0,1),_r.choice([-1,1])*_r.uniform(0.03,0.06),_r.uniform(0,6.28),_r.uniform(0.85,1.2)) for _ in range(7)]
def draw_bg_extra(d,t):
    SW=H*0.585  # sidewalk line
    # drifting clouds
    for x0,y0,r,v in CLOUDS:
        x=((x0+t*v)%1.3-0.15)*W
        for dx in (-r*0.7,0,r*0.7):
            d.ellipse([(x+dx-r)*SS,(y0*H-r*0.6)*SS,(x+dx+r)*SS,(y0*H+r*0.6)*SS],fill=(60,54,92,70))
    # flickering windows
    for fx,fy,rate,ph in FLICK:
        on=math.sin(t*rate+ph)>0.25; c=(255,216,130) if on else (30,26,50)
        d.rectangle([fx*SS,fy*SS,(fx+10)*SS,(fy+14)*SS],fill=c)
        if on: d.rectangle([(fx-1)*SS,(fy-1)*SS,(fx+11)*SS,(fy+15)*SS],fill=(255,216,130,40))
    # NEON signs (pulsing colored)
    for nx,ny,nw,col,rate,ph in NEON:
        pulse=0.4+0.6*(0.5+0.5*math.sin(t*rate+ph))
        c=tuple(int(v*pulse) for v in col)
        d.rounded_rectangle([nx*SS,ny*SS,(nx+nw)*SS,(ny+12)*SS],radius=3*SS,fill=c,outline=tuple(min(255,int(v*1.2)) for v in col),width=2*SS)
        d.ellipse([(nx-10)*SS,(ny-8)*SS,(nx+nw+10)*SS,(ny+20)*SS],fill=col+(int(50*pulse),))
    # blinking aircraft
    ax=((t*0.03)%1.2-0.1)*W; ay=H*0.09
    d.ellipse([(ax-2)*SS,(ay-2)*SS,(ax+2)*SS,(ay+2)*SS],fill=(220,220,255))
    if int(t*2)%2==0: d.ellipse([(ax-3)*SS,(ay-1)*SS,(ax+1)*SS,(ay+3)*SS],fill=(255,80,80))
    # PEOPLE walking on the sidewalk (silhouettes)
    for x0,sp,ph,sc in PEOPLE:
        x=((x0+t*sp)%1.25-0.12)*W; y=SW; hh=22*sc
        step=math.sin(t*sp*60+ph); bob=abs(math.sin(t*sp*60+ph))*2
        col=(18,16,30)
        d.ellipse([(x-3*sc)*SS,(y-hh-6*sc-bob)*SS,(x+3*sc)*SS,(y-hh+bob*0+0-6*sc+6*sc-bob)*SS] if False else [(x-3*sc)*SS,(y-hh-bob)*SS,(x+3*sc)*SS,(y-hh+6*sc-bob)*SS],fill=col)  # head
        d.line([((x)*SS,(y-hh+4*sc-bob)*SS),((x)*SS,(y-6*sc)*SS)],fill=col,width=int(3*sc*SS))  # body
        d.line([((x)*SS,(y-6*sc)*SS),((x-4*sc*step)*SS,y*SS)],fill=col,width=int(2.5*sc*SS))  # leg1
        d.line([((x)*SS,(y-6*sc)*SS),((x+4*sc*step)*SS,y*SS)],fill=col,width=int(2.5*sc*SS))  # leg2
    # traffic BOTH directions on the road
    lanes=[(0.55,0.0,0.70,1),(0.40,0.5,0.80,1),(0.7,0.25,0.66,1),(0.5,0.15,0.74,-1),(0.62,0.7,0.86,-1)]
    for sp,off,yy,dr in lanes:
        p=((t*sp+off)%1.6)-0.2
        if 0<=p<=1.05:
            cxp=(p if dr>0 else 1-p)*W; ry=yy*H; gw=70
            glow=(255,238,180,60) if dr>0 else (255,90,90,55)   # headlights vs taillights
            core=(255,250,220,160) if dr>0 else (255,120,120,150)
            d.ellipse([(cxp-gw)*SS,(ry-7)*SS,(cxp+gw)*SS,(ry+7)*SS],fill=glow)
            d.ellipse([(cxp-12)*SS,(ry-4)*SS,(cxp+12)*SS,(ry+4)*SS],fill=core)

def draw_prop(ld,name,hx,hy,t,lit=None):
    if name=="phone":
        sc=lit or (58,45,94)
        RR(ld,hx-L(12),hy-L(18),hx+L(12),hy+L(18),L(5),(30,30,30))
        RR(ld,hx-L(8),hy-L(13),hx+L(8),hy+L(13),L(3),sc,outline=sc,ow=1)
    elif name=="cig":
        ex,ey=hx-L(36),hy-L(22)
        ld.line([(hx,hy),(ex,ey)],fill=(40,40,40),width=int(L(9)))
        ld.line([(hx,hy),(ex,ey)],fill=WHITE,width=int(L(6)))
        ld.line([(hx,hy),(hx-L(11),hy-L(7))],fill=(210,160,90),width=int(L(6)))  # filter
        E(ld,ex,ey,L(7),L(7),(255,120,40,90),outline=None,ow=0)                  # glow
        E(ld,ex,ey,L(3.5),L(3.5),(255,140,50),outline=(255,140,50),ow=1)         # ember
        for i in range(3):                                                        # smoke
            sx=ex+math.sin(t*3+i)*L(6); sy=ey-L(12)-i*L(13)
            ld.ellipse([sx-L(4),sy-L(5),sx+L(4),sy+L(5)],fill=(225,225,225,70))
    elif name=="donut":
        E(ld,hx,hy,L(22),L(22),(228,170,120))
        E(ld,hx,hy-L(2),L(22),L(18),(246,150,200))
        for dx,dy,c in [(-9,-6,(255,255,255)),(6,-9,(120,220,255)),(1,2,(255,240,120)),(11,1,(150,255,150)),(-11,4,(255,150,150))]:
            ld.line([(hx+L(dx),hy+L(dy)),(hx+L(dx+4),hy+L(dy+4))],fill=c,width=int(L(2.5)))
        E(ld,hx,hy,L(8),L(8),(36,28,48))
    elif name=="cal":
        ld.rectangle([hx-L(10),hy-L(26),hx-L(7),hy-L(17)],fill=(120,120,130))
        ld.rectangle([hx+L(7),hy-L(26),hx+L(10),hy-L(17)],fill=(120,120,130))
        RR(ld,hx-L(17),hy-L(20),hx+L(17),hy+L(18),L(3),WHITE)
        ld.rectangle([hx-L(17),hy-L(20),hx+L(17),hy-L(8)],fill=(220,70,70))
        for gy2 in range(3):
            for gx in range(4):
                cx=hx-L(12)+gx*L(8); cy=hy-L(3)+gy2*L(7)
                ld.ellipse([cx-L(1.5),cy-L(1.5),cx+L(1.5),cy+L(1.5)],fill=(150,150,160))
        ld.ellipse([hx+L(1),hy+L(2),hx+L(13),hy+L(14)],outline=(220,70,70),width=int(L(2.5)))

def draw_bunny(ld,t,P):
    """P: dict with pose params."""
    cx=L(CW/2)+P["X"]*SS
    lean=P["lean"]; bobh=P["bob"]*SS
    hip=(cx, L(420)+bobh)
    sh =(cx+math.sin(math.radians(lean))*L(120), L(300)+bobh)  # shoulder center, leans
    # ---- TAIL (puff, swings) ----
    E(ld,cx+L(70),L(388),L(30),L(34),BODYD); E(ld,cx+L(74)+P["tail"]*SS,L(380),L(19),L(21),WHITE)
    # ---- LEGS (hip->knee->foot, FK) ----
    for side,(th,sh2) in (("L",P["legL"]),("R",P["legR"])):
        s=-1 if side=="L" else 1
        hx=hip[0]+s*L(24); hy=hip[1]
        knee=pt(hx,hy,th,L(72)); foot=pt(*knee,th+sh2,L(64))
        limb(ld,(hx,hy),knee,21,BODY,hi=BODYL); limb(ld,knee,foot,17,BODYD,hi=BODYL)
        # foot
        fx,fy=foot; E(ld,fx+s*L(6),fy+L(4),L(20),L(12),BODYD)
    # ---- BODY ----
    bx0,bx1=sh[0]-L(70),sh[0]+L(70)
    ld.polygon([(bx0,sh[1]),(bx1,sh[1]),(hip[0]+L(60),hip[1]),(hip[0]-L(60),hip[1])],fill=BODY,outline=OUT)
    E(ld,(sh[0]+hip[0])/2,(sh[1]+hip[1])/2+L(20),L(46),L(58),BELLY)
    # ---- ARMS (shoulder->elbow->hand, FK) ----
    for side,(sa,ea) in (("L",P["armL"]),("R",P["armR"])):
        if side=="R" and P.get("prop"): continue   # rechter Arm+Objekt nach dem Kopf (vorne)
        s=-1 if side=="L" else 1
        shx=sh[0]+s*L(56); shy=sh[1]+L(6)
        el=pt(shx,shy,sa,L(54)); hand=pt(*el,sa+ea,L(48))
        limb(ld,(shx,shy),el,16,BODY,hi=BODYL); limb(ld,el,hand,13,BODYD)
        E(ld,hand[0],hand[1],L(13),L(13),BODY)
    # ---- HEAD ----
    ht=P["headturn"]; look=P["look"]
    hx=sh[0]+ht*L(16); hy=sh[1]-L(70)+bobh*0.2
    earw=P["ear"]
    for s in (-1,1):
        exu=hx+s*L(34)+ht*L(8); E(ld,exu,L(150)+bobh*0.2+earw*(1 if s>0 else -1)*SS/SS*0 - L(0),L(20),L(58),EAR)
    # (ears drawn relative to head)
    for s in (-1,1):
        exu=hx+s*L(34)+ht*L(8); ey=hy-L(96)+earw*(1 if s>0 else -1)
        E(ld,exu,ey,L(18),L(54),EAR); E(ld,exu,ey+L(6),L(10),L(40),BLUSH)
    E(ld,hx,hy,L(92),L(88),BODY)
    E(ld,hx-L(32),hy-L(32),L(32),L(28),BODYL)
    for s in (-1,1): E(ld,hx+s*L(56),hy+L(24),L(19),L(13),BLUSH,outline=BLUSH,ow=1)
    ew=L(36)*(1+0.22*P["eyewide"]); eh=L(44)*(1+0.3*P["eyewide"]); ld2=look*L(9)
    for s in (-1,1):
        ox=hx+s*L(36)+ht*L(10)
        if P["blink"]: ld.line([(ox-ew*0.8,hy-L(6)),(ox+ew*0.8,hy-L(6))],fill=OUT,width=int(L(5)))
        else:
            E(ld,ox,hy-L(6),ew,eh,WHITE,ow=3); pr=L(16)*(1-0.25*P["eyewide"])
            px=ox+ht*L(5); py=hy-L(2)+ld2
            E(ld,px,py,pr,pr*1.12,PUP,outline=PUP,ow=1); E(ld,px-pr*0.35,py-pr*0.4,pr*0.42,pr*0.42,WHITE,outline=WHITE,ow=1)
    E(ld,hx+ht*L(6),hy+L(20),L(10),L(8),NOSE,outline=NOSE,ow=1)
    my=hy+L(38); mo=L(4)+P["env"]*L(18)
    E(ld,hx+ht*L(6),my,L(16)*P["mw"],mo,MOUTH)
    if mo>L(11): E(ld,hx+ht*L(6),my+mo*0.3,L(8),mo*0.4,TONGUE)
    else:
        ld.rectangle([hx+ht*L(6)-L(8),my-L(2),hx+ht*L(6)-L(1),my+L(9)],fill=TEETH,outline=OUT,width=int(L(1.5)))
        ld.rectangle([hx+ht*L(6)+L(1),my-L(2),hx+ht*L(6)+L(8),my+L(9)],fill=TEETH,outline=OUT,width=int(L(1.5)))
    # rechter Arm + Gegenstand VOR dem Kopf (nicht verdeckt)
    if P.get("prop"):
        sa,ea=P["armR"]; shx=sh[0]+L(56); shy=sh[1]+L(6)
        el=pt(shx,shy,sa,L(54)); hand=pt(*el,sa+ea,L(48))
        limb(ld,(shx,shy),el,16,BODY,hi=BODYL); limb(ld,el,hand,13,BODYD); E(ld,hand[0],hand[1],L(13),L(13),BODY)
        draw_prop(ld,P["prop"],hand[0],hand[1],t,P.get("phone_lit"))
    if P.get("phone_lit")==(127,208,255):
        ld.ellipse([hx-L(48),hy+L(2),hx+L(48),hy+L(70)],fill=(127,208,255,46))

def pose(t, DUR, env, eyewide, blink, prop):
    """Choreography controller -> pose params."""
    P=dict(env=env,eyewide=eyewide,blink=blink,mw=1.0)
    WALK=1.5
    if t<WALK:                                   # walk IN from left
        p=sm(t/WALK); P["X"]=-150+150*p
        ph=t*2*math.pi*2.3
        P["legL"]=(22*math.sin(ph), 18+34*max(0,-math.sin(ph)))
        P["legR"]=(22*math.sin(ph+math.pi), 18+34*max(0,-math.sin(ph+math.pi)))
        P["armL"]=(-20+24*math.sin(ph+math.pi),18); P["armR"]=(20+24*math.sin(ph),18)
        P["lean"]=4; P["bob"]=-6+6*abs(math.sin(ph)); P["headturn"]=0.3; P["look"]=0; P["ear"]=math.sin(ph)*6; P["tail"]=0
    else:
        tt=t-WALK
        P["X"]=0
        weight=math.sin(tt*1.9); P["lean"]=6*weight
        P["legL"]=(3+weight*5, 9); P["legR"]=(-3+weight*5, 9)
        # bouncy bob + frequent hops
        hop=0.0
        for hb in (1.6,3.6,5.6,7.6,9.6,11.6,13.6,15.6):
            if 0<=tt-hb<0.42: hop=-math.sin((tt-hb)/0.42*math.pi)*34
        P["bob"]=math.sin(tt*2*math.pi*1.8)*5+hop
        # bigger, more frequent gestures, alternating hands
        g=(tt%2.0)
        if g<0.8:
            gg=math.sin(g/0.8*math.pi)
            if int(tt/2.0)%2==0:
                P["armR"]=(-80+14*math.sin(tt*10), -46-24*gg); P["armL"]=(-18+8*math.sin(tt*3),16)
            else:
                P["armL"]=(80-14*math.sin(tt*10), 46+24*gg); P["armR"]=(18+8*math.sin(tt*3),16)
        else:
            P["armR"]=(20+10*math.sin(tt*3.0),16); P["armL"]=(-20+10*math.sin(tt*3.0+1),16)
        P["headturn"]=0.7*math.sin(tt*1.4); P["look"]=0.3*math.sin(tt*1.4)
        P["ear"]=math.sin(tt*6)*7+(hop*0.4); P["tail"]=math.sin(tt*7)*16
    # phone grab override (if phone active, raise right hand to face)
    if prop:
        if prop in ("phone","cig"): P["armR"]=(-95,-54); P["look"]=0.9
        else: P["armR"]=(-74,-30); P["look"]=0.6
        P["headturn"]=0.05; P["eyewide"]=max(P["eyewide"],0.3)
    return P

K=sys.argv[1]
cues=json.load(open(f"/tmp/{K}_cues.json")); DUR=cues["metadata"]["duration"]
words=json.load(open(f"/tmp/{K}_words.json"))
FPS=30; N=int(FPS*DUR)
SHAPE={"X":(0,1),"A":(0,0.9),"B":(0.2,1),"C":(0.5,1.15),"D":(0.9,1.25),"E":(0.55,0.7),"F":(0.35,0.55),"G":(0.22,0.95),"H":(0.42,1)}
mc=cues["mouthCues"]; starts=[c["start"] for c in mc]
def shp(t): i=max(0,min(bisect.bisect_right(starts,t)-1,len(mc)-1)); return mc[i]["value"]
ENV=[0]*N; MW=[1]*N; pe,pw=0,1
for fi in range(N): e,w=SHAPE.get(shp(fi/FPS),(0.2,1)); pe+=(e-pe)*0.55; pw+=(w-pw)*0.55; ENV[fi]=pe; MW[fi]=pw
wstarts=[w["start"] for w in words]
PROP_TRIG={"s6":("phone","handy"),"s7":("cig","zigarette"),"s5":("donut","süße"),"s3":("cal","tage"),
           "s1":("phone","handy"),"s8":("phone","scroll"),"s14":("donut","marshmallow"),"s11":("phone","zwei")}
PNAME,PSUB=PROP_TRIG.get(K,(None,None)); TRIG=None
if PSUB:
    for w in words:
        if PSUB in w["w"].lower(): TRIG=w["start"]; break
    if TRIG is None: TRIG=DUR*0.5
def word_at(t):
    i=bisect.bisect_right(wstarts,t)-1
    if 0<=i<len(words) and words[i]["start"]<=t<=words[i]["end"]+0.08: return words[i],t-words[i]["start"]
    return None,0

def frame(fi):
    t=fi/FPS
    img=Image.new("RGB",(W*SS,H*SS),(20,18,40)); d=ImageDraw.Draw(img,"RGBA")
    draw_bg(d,t); draw_bg_extra(d,t)
    layer=Image.new("RGBA",(CW*SS,CH*SS),(0,0,0,0)); ld=ImageDraw.Draw(layer,"RGBA")
    prop=PNAME if (TRIG is not None and TRIG-0.25<=t<=TRIG+2.7) else None
    lit=None
    if prop=="phone": lit=(127,208,255) if t<=TRIG+1.7 else (140,140,140)
    P=pose(t,DUR,ENV[fi],0.25*max(0,math.sin(t*1.3))+0.4*max(0,ENV[fi]-0.6),(t%2.9)>2.8,prop)
    P["mw"]=MW[fi]; P["prop"]=prop; P["phone_lit"]=lit
    draw_bunny(ld,t,P)
    bounce=math.sin(t*2*math.pi*1.5); sy=1+0.04*bounce; sx=1/sy; scl=0.74
    w2=max(1,int(CW*SS*sx*scl)); h2=max(1,int(CH*SS*sy*scl)); sc=layer.resize((w2,h2),Image.LANCZOS)
    img.paste(sc,(int(W*SS*0.42-w2*0.5),int(H*SS*0.99-h2)),sc)
    draw_dust(d,t)
    wd,age=word_at(t)
    if wd and wd["w"]:
        txt=wd["w"].upper().strip(".,!?")
        if txt:
            pop=1.0 if age>0.1 else 0.7+0.3*(age/0.1); sz=56*pop; ft=font(sz)
            bb=d.textbbox((0,0),txt,font=ft); tw=bb[2]-bb[0]
            if tw>W*SS*0.84: sz*=W*SS*0.84/tw; ft=font(sz); bb=d.textbbox((0,0),txt,font=ft); tw=bb[2]-bb[0]
            th=bb[3]-bb[1]; bx=W*SS/2; by=H*SS*0.17
            d.rounded_rectangle([bx-tw/2-18*SS,by-10*SS,bx+tw/2+18*SS,by+th+18*SS],radius=14*SS,fill=(18,12,32,230),outline=(255,176,32,200),width=3*SS)
            d.text((bx-tw/2+2*SS,by+5*SS),txt,font=ft,fill=(0,0,0,170)); d.text((bx-tw/2,by+3*SS),txt,font=ft,fill=(250,235,120))
    img=Image.composite(img,BLACK,VIG); img=ImageEnhance.Color(img).enhance(1.16); img=ImageEnhance.Contrast(img).enhance(1.06)
    z=1.04+0.05*(t/DUR); cw,ch=int(W*SS/z),int(H*SS/z)
    panx=int(math.sin(t*0.5)*0.035*W*SS); pany=int(math.sin(t*0.37)*0.02*H*SS)
    l=max(0,min(W*SS-cw,(W*SS-cw)//2+panx)); tp=max(0,min(H*SS-ch,int((H*SS-ch)*0.42)+pany))
    return img.crop((l,tp,l+cw,tp+ch)).resize((W,H),Image.LANCZOS)

if __name__=="__main__":
    if "--still" in sys.argv:
        T=float(sys.argv[sys.argv.index("--still")+1]); frame(int(T*FPS)).save(f"/tmp/full_{K}_{T}.png"); print("still saved")
    else:
        print(f"[{K}] FULL anim {N} frames")
        tmp=f"/tmp/{K}_full_noa.mp4"; wr=imageio.get_writer(tmp,fps=FPS,codec="libx264",quality=9,ffmpeg_params=["-pix_fmt","yuv420p"])
        for i in range(N):
            wr.append_data(np.asarray(frame(i).convert("RGB")))
            if i%90==0: print(f"  {i}/{N}")
        wr.close(); ff=imageio_ffmpeg.get_ffmpeg_exe()
        subprocess.run([ff,"-y","-i",tmp,"-i",f"/tmp/{K}.wav","-c:v","copy","-c:a","aac","-b:a","128k","-shortest",f"/tmp/clipfull_{K}.mp4"],check=True,capture_output=True)
        print(f"done -> /tmp/clipfull_{K}.mp4")
