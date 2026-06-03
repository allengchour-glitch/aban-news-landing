#!/usr/bin/env python3
"""Wickelt einen fertigen Clip in Intro-Sting + End-CTA (Branding/Serie).
Aufruf: python3 brand.py <key> "<Titel>" """
import sys, math, subprocess, numpy as np, imageio.v2 as imageio, imageio_ffmpeg
from PIL import Image, ImageDraw, ImageEnhance
from render_s6_max import draw_bg, VIG, BLACK, W, H, SS, font, E, RR, OUT, WHITE, AMBER
from render_s6_htf import draw_critter, L, CW, CH
import render_s6_htf as HTF
HTF.BODY=(245,205,222); HTF.BODYD=(224,176,200); HTF.BODYL=(255,233,242)
HTF.BELLY=(255,244,249); HTF.EAR=(245,205,222); HTF.NOSE=(208,110,135)
HTF.BLUSH=(255,150,170); HTF.EARS="bunny"; HTF.TAIL="bushy"

K=sys.argv[1]; TITLE=sys.argv[2] if len(sys.argv)>2 else ""
CHANNEL="GEHIRN·HACKS"; HANDLE="@gehirnhacks"
FPS=30; FF=imageio_ffmpeg.get_ffmpeg_exe()

def bunny(img,t,arm,look,eyewide,blink,env,scl=0.82,cxf=0.5,gyf=0.95):
    layer=Image.new("RGBA",(CW*SS,CH*SS),(0,0,0,0)); ld=ImageDraw.Draw(layer,"RGBA")
    draw_critter(ld,t,arm,look,env,eyewide,blink,None,mw=1.0)
    bounce=math.sin(t*2*math.pi*1.6); sy=1+0.06*bounce; sx=1/sy
    w2=int(CW*SS*sx*scl); h2=int(CH*SS*sy*scl); sc=layer.resize((w2,h2),Image.LANCZOS)
    img.paste(sc,(int(W*SS*cxf-w2*0.5),int(H*SS*gyf-h2*((CH-30)/CH))),sc)

def post(img):
    img=Image.composite(img,BLACK,VIG); img=ImageEnhance.Color(img).enhance(1.16)
    return img.resize((W,H),Image.LANCZOS)

def render_seg(kind, dur):
    n=int(FPS*dur); frames=[]
    for i in range(n):
        t=i/FPS
        img=Image.new("RGB",(W*SS,H*SS),(20,18,40)); d=ImageDraw.Draw(img,"RGBA")
        draw_bg(d,t)
        if kind=="intro":
            bunny(img,t,16,0,0.2,(t%2.5)>2.4,0.0,scl=0.86)
            # channel name pop
            f=min(1,t/0.3); ft=font(54*(0.8+0.2*f)); txt=CHANNEL
            bb=d.textbbox((0,0),txt,font=ft); tw=bb[2]-bb[0]
            d.rounded_rectangle([W*SS/2-tw/2-18*SS,H*SS*0.13,W*SS/2+tw/2+18*SS,H*SS*0.13+78*SS],radius=14*SS,fill=(18,12,32,235),outline=(255,176,32,220),width=3*SS)
            d.text((W*SS/2-tw/2,H*SS*0.13+12*SS),txt,font=ft,fill=(250,235,120))
            if TITLE:
                ft2=font(30); bb2=d.textbbox((0,0),TITLE,font=ft2); tw2=bb2[2]-bb2[0]
                d.text((W*SS/2-tw2/2,H*SS*0.27),TITLE,font=ft2,fill=WHITE)
        else:  # outro: waving + CTA
            wave=-58+16*math.sin(t*12)
            bunny(img,t,wave,0,0.35,(t%2.5)>2.42,0.18,scl=0.86)
            f=min(1,t/0.25)
            ft=font(52*(0.8+0.2*f)); txt="FOLGEN FÜR MEHR"
            bb=d.textbbox((0,0),txt,font=ft); tw=bb[2]-bb[0]
            d.rounded_rectangle([W*SS/2-tw/2-18*SS,H*SS*0.12,W*SS/2+tw/2+18*SS,H*SS*0.12+74*SS],radius=14*SS,fill=(18,12,32,235),outline=(255,176,32,230),width=3*SS)
            d.text((W*SS/2-tw/2,H*SS*0.12+10*SS),txt,font=ft,fill=(250,235,120))
            fh=font(34); bh=d.textbbox((0,0),HANDLE,font=fh); twh=bh[2]-bh[0]
            d.text((W*SS/2-twh/2,H*SS*0.24),HANDLE,font=fh,fill=WHITE)
            # pulsing follow arrow
            ay=H*SS*0.34+math.sin(t*8)*6*SS
            d.polygon([(W*SS/2-22*SS,ay),(W*SS/2+22*SS,ay),(W*SS/2,ay+30*SS)],fill=(255,176,32))
        frames.append(np.asarray(post(img).convert("RGB")))
    return frames

def encode(frames,path):
    wr=imageio.get_writer(path,fps=FPS,codec="libx264",quality=9,ffmpeg_params=["-pix_fmt","yuv420p"])
    for fr in frames: wr.append_data(fr)
    wr.close()

if __name__=="__main__":
    print(f"[{K}] branding...")
    encode(render_seg("intro",1.1),f"/tmp/{K}_intro_v.mp4")
    encode(render_seg("outro",1.9),f"/tmp/{K}_outro_v.mp4")
    # add silent audio to intro/outro so concat keeps a/v aligned
    for seg,dur in (("intro",1.1),("outro",1.9)):
        subprocess.run([FF,"-y","-i",f"/tmp/{K}_{seg}_v.mp4","-f","lavfi","-i",f"anullsrc=r=24000:cl=mono",
                        "-c:v","copy","-c:a","aac","-shortest",f"/tmp/{K}_{seg}.mp4"],check=True,capture_output=True)
    # concat intro + body + outro (re-encode for safety)
    subprocess.run([FF,"-y","-i",f"/tmp/{K}_intro.mp4","-i",f"/tmp/clip_{K}.mp4","-i",f"/tmp/{K}_outro.mp4",
        "-filter_complex","[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[v][a]",
        "-map","[v]","-map","[a]","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k",f"/tmp/final_{K}.mp4"],check=True,capture_output=True)
    print(f"done -> /tmp/final_{K}.mp4")
