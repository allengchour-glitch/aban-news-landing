#!/usr/bin/env python3
"""Skript #6 - HTF-Critter mit ECHTEM Lip-Sync: Mund folgt phonem-genau dem
gesprochenen deutschen Voiceover (piper TTS -> Rhubarb Lip Sync), Audio gemuxt."""
import math, json, bisect, subprocess, numpy as np, imageio.v2 as imageio, imageio_ffmpeg
from PIL import Image, ImageDraw, ImageEnhance
from render_s6_max import draw_bg, draw_dust, VIG, BLACK, W, H, SS, font, key, E, RR, OUT, WHITE, AMBER
from render_s6_htf import draw_critter, L, CW, CH
import render_s6_htf as HTF
# --- HASE (bunny) character ---
HTF.BODY=(245,205,222); HTF.BODYD=(224,176,200); HTF.BODYL=(255,233,242)
HTF.BELLY=(255,244,249); HTF.EAR=(245,205,222); HTF.NOSE=(208,110,135)
HTF.BLUSH=(255,150,170); HTF.EARS="bunny"; HTF.TAIL="bushy"

FPS=30
cues=json.load(open("/tmp/cues.json"))
DUR=cues["metadata"]["duration"]
N=int(FPS*DUR)
SCALE=12.0/DUR   # map real time -> 12s beat template

# Rhubarb mouth shape -> (openness, width factor)
SHAPE={"X":(0.00,1.00),"A":(0.00,0.90),"B":(0.20,1.00),"C":(0.50,1.15),
       "D":(0.90,1.25),"E":(0.55,0.70),"F":(0.35,0.55),"G":(0.22,0.95),"H":(0.42,1.00)}
mc=cues["mouthCues"]; starts=[c["start"] for c in mc]
def shape_at(t):
    i=bisect.bisect_right(starts,t)-1; i=max(0,min(i,len(mc)-1)); return mc[i]["value"]

# precompute smoothed mouth (env, width) per frame
ENV=[0.0]*N; MW=[1.0]*N; pe,pw=0.0,1.0
for fi in range(N):
    t=fi/FPS; e,w=SHAPE.get(shape_at(t),(0.2,1.0))
    pe+=(e-pe)*0.55; pw+=(w-pw)*0.55; ENV[fi]=pe; MW[fi]=pw

def render_frame(fi):
    t=fi/FPS; tt=t*SCALE
    img=Image.new("RGB",(W*SS,H*SS),(20,18,40)); d=ImageDraw.Draw(img,"RGBA")
    draw_bg(d,t)
    layer=Image.new("RGBA",(CW*SS,CH*SS),(0,0,0,0)); ld=ImageDraw.Draw(layer,"RGBA")
    ra=key(tt,[(0,18),(0.6,18),(0.9,8),(1.3,18),(6,18),(6.2,18),(6.5,-40),(8.2,-40),(9,18),(12,18)],over=0.6)
    look=key(tt,[(0,0),(6.4,0),(6.6,1),(8.0,1),(8.6,0),(12,0)])
    eyewide=key(tt,[(0,0),(6.2,0),(6.45,1.0),(6.9,0.5),(8.0,0.5),(8.5,0),(12,0)])
    blink=(t%2.8)>2.68 and not (6.3*1/SCALE<t<7.0*1/SCALE)
    phone=None
    if 6.5<=tt<=8.9: phone=(127,208,255) if 6.65<=tt<=8.0 else ((140,140,140) if tt>8.0 else (58,45,94))
    draw_critter(ld,t,ra,look,ENV[fi],eyewide,blink,phone,mw=MW[fi])

    bounce=math.sin(t*2*math.pi*1.5); sy=1+0.05*bounce
    sy+=key(tt,[(0,0),(6.2,0),(6.35,-0.14),(6.5,0.12),(6.7,0),(12,0)])
    sx=1.0/sy; scl=0.78
    w2=max(1,int(CW*SS*sx*scl)); h2=max(1,int(CH*SS*sy*scl))
    sc=layer.resize((w2,h2),Image.LANCZOS)
    cxs=int(W*SS*0.40); gys=int(H*SS*0.93)
    img.paste(sc,(int(cxs-w2*0.5),int(gys-h2*((CH-30)/CH))),sc)
    if 6.45<tt<6.65: d.line([(cxs+L(40),gys-L(190)),(cxs+L(120),gys-L(182))],fill=AMBER,width=int(L(4)))
    draw_dust(d,t)

    if 2.0<=tt<=4.0:
        sx2,sy2=W*SS*0.82,H*SS*0.15; E(d,sx2,sy2,24*SS,24*SS,WHITE,ow=4); RR(d,sx2-6*SS,sy2-32*SS,sx2+6*SS,sy2-24*SS,2*SS,WHITE)
        ha=(t*6)%(2*math.pi); d.line([(sx2,sy2),(sx2+16*SS*math.sin(ha),sy2-16*SS*math.cos(ha))],fill=AMBER,width=3*SS)
    if 3.8<=tt<=6.2:
        lx,ly=W*SS*0.84,H*SS*0.25; rot=t*120
        for a0 in range(0,360,45):
            if (a0//45)%2==0: d.arc([lx-26*SS,ly-26*SS,lx+26*SS,ly+26*SS],a0+rot,a0+rot+32,fill=AMBER,width=6*SS)
    if tt>=5.6:
        tx=W*SS*0.88; poleTop=H*SS*0.40; d.rectangle([tx-4*SS,poleTop,tx+4*SS,H*SS*0.78],fill=(30,28,40))
        ty=poleTop-6*SS; RR(d,tx-16*SS,ty-42*SS,tx+16*SS,ty+42*SS,9*SS,(12,8,24))
        red=(255,77,77) if tt<7.6 else (60,40,40); grn=(40,60,50) if tt<7.6 else (62,224,127)
        E(d,tx,ty-22*SS,9*SS,9*SS,red,ow=1); E(d,tx,ty+22*SS,9*SS,9*SS,grn,ow=1)
    if 6.9<=tt<=7.8:
        f=(tt-6.9)/0.9; scc=1.3*math.sin(f*math.pi)*SS; stx,sty=W*SS*0.70,H*SS*0.33; pts=[]
        for i in range(10):
            a=math.radians(i*36-90); rr=20 if i%2==0 else 8; pts.append((stx+rr*scc*math.cos(a),sty+rr*scc*math.sin(a)))
        d.polygon(pts,fill=(255,211,77),outline=(255,157,0))

    CAPS=[(0,2,"96× AM TAG",(250,235,120),48),(2,4,"6 STUNDEN WEG",WHITE,46),
          (4,6,"AUSLÖSER → BELOHNUNG",WHITE,34),(6,8,"DREI SEKUNDEN STILLE…",WHITE,38),
          (8,10,"MACH ES TEURER",(250,235,120),46),(10,12,"…ODER?",WHITE,52)]
    for (a,b,txt,col,sz) in CAPS:
        if a<=tt<b:
            f=tt-a; pop=1.0 if f>0.18 else 0.86+0.14*(f/0.18)
            ft=font(sz*pop); bb=d.textbbox((0,0),txt,font=ft); tw=bb[2]-bb[0]; th=bb[3]-bb[1]
            bx=W*SS/2; by=52*SS
            d.rounded_rectangle([bx-tw/2-14*SS,by-6*SS,bx+tw/2+14*SS,by+th+14*SS],radius=12*SS,fill=(18,12,32,235))
            d.rounded_rectangle([bx-tw/2-14*SS,by-6*SS,bx+tw/2+14*SS,by+th+14*SS],radius=12*SS,outline=(255,176,32,180),width=2*SS)
            d.text((bx-tw/2+2*SS,by+4*SS),txt,font=ft,fill=(0,0,0,160))
            d.text((bx-tw/2,by+2*SS),txt,font=ft,fill=col)

    img=Image.composite(img,BLACK,VIG)
    img=ImageEnhance.Color(img).enhance(1.18); img=ImageEnhance.Contrast(img).enhance(1.06)
    z=1.0+0.05*(t/DUR); cw,ch=int(W*SS/z),int(H*SS/z); l=(W*SS-cw)//2; tp=int((H*SS-ch)*0.42)
    return img.crop((l,tp,l+cw,tp+ch)).resize((W,H),Image.LANCZOS)

if __name__=="__main__":
    print(f"Rendering {N} frames @ SS{SS}, DUR={DUR:.2f}s (real lip-sync)...")
    tmp="/tmp/s6-lip-noaudio.mp4"
    writer=imageio.get_writer(tmp,fps=FPS,codec="libx264",quality=9,ffmpeg_params=["-pix_fmt","yuv420p"])
    stills={}
    for i in range(N):
        im=render_frame(i); writer.append_data(np.asarray(im.convert("RGB")))
        if i%60==0: print(f"  {i}/{N}")
    writer.close()
    ff=imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([ff,"-y","-i",tmp,"-i","/tmp/vo.wav","-c:v","copy","-c:a","aac","-b:a","128k","-shortest","/tmp/s6-lip.mp4"],
                   check=True, capture_output=True)
    print("done -> /tmp/s6-lip.mp4 (mit Ton)")
