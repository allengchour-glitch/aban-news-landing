#!/usr/bin/env python3
"""Rendert einen Clip: Hase + Lip-Sync (Rhubarb) + WORT-CAPTIONS (Whisper) + Ton.
Aufruf: python3 make_clip.py <key>   (erwartet /tmp/<key>.wav, <key>_cues.json, <key>_words.json)"""
import sys, json, math, bisect, subprocess, numpy as np, imageio.v2 as imageio, imageio_ffmpeg
from PIL import Image, ImageDraw, ImageEnhance
from render_s6_max import draw_bg, draw_dust, VIG, BLACK, W, H, SS, font, key as KEYF, E, RR, OUT, WHITE, AMBER
from render_s6_htf import draw_critter, L, CW, CH
import render_s6_htf as HTF
# --- HASE ---
HTF.BODY=(245,205,222); HTF.BODYD=(224,176,200); HTF.BODYL=(255,233,242)
HTF.BELLY=(255,244,249); HTF.EAR=(245,205,222); HTF.NOSE=(208,110,135)
HTF.BLUSH=(255,150,170); HTF.EARS="bunny"; HTF.TAIL="bushy"

K=sys.argv[1]
cues=json.load(open(f"/tmp/{K}_cues.json")); DUR=cues["metadata"]["duration"]
words=json.load(open(f"/tmp/{K}_words.json"))
FPS=30; N=int(FPS*DUR)
SHAPE={"X":(0.00,1.00),"A":(0.00,0.90),"B":(0.20,1.00),"C":(0.50,1.15),
       "D":(0.90,1.25),"E":(0.55,0.70),"F":(0.35,0.55),"G":(0.22,0.95),"H":(0.42,1.00)}
mc=cues["mouthCues"]; starts=[c["start"] for c in mc]
def shape_at(t):
    i=max(0,min(bisect.bisect_right(starts,t)-1,len(mc)-1)); return mc[i]["value"]
ENV=[0.0]*N; MW=[1.0]*N; pe,pw=0.0,1.0
for fi in range(N):
    e,w=SHAPE.get(shape_at(fi/FPS),(0.2,1.0)); pe+=(e-pe)*0.55; pw+=(w-pw)*0.55; ENV[fi]=pe; MW[fi]=pw
wstarts=[w["start"] for w in words]
def word_at(t):
    i=bisect.bisect_right(wstarts,t)-1
    if 0<=i<len(words) and words[i]["start"]<=t<=words[i]["end"]+0.08: return words[i],t-words[i]["start"]
    return None,0

def render_frame(fi):
    t=fi/FPS
    img=Image.new("RGB",(W*SS,H*SS),(20,18,40)); d=ImageDraw.Draw(img,"RGBA")
    draw_bg(d,t)
    layer=Image.new("RGBA",(CW*SS,CH*SS),(0,0,0,0)); ld=ImageDraw.Draw(layer,"RGBA")
    arm=16+8*math.sin(t*2.2)+ (-22 if (t%4.0)<0.7 else 0)*0   # gentle idle sway
    look=0.12*math.sin(t*0.7)
    eyewide=0.25*max(0.0,math.sin(t*1.3))+0.4*max(0.0,ENV[fi]-0.6)
    blink=(t%2.9)>2.78
    draw_critter(ld,t,arm,look,ENV[fi],eyewide,blink,None,mw=MW[fi])
    bounce=math.sin(t*2*math.pi*1.5); sy=1+0.05*bounce; sx=1.0/sy; scl=0.78
    w2=max(1,int(CW*SS*sx*scl)); h2=max(1,int(CH*SS*sy*scl)); scc=layer.resize((w2,h2),Image.LANCZOS)
    img.paste(scc,(int(W*SS*0.40-w2*0.5),int(H*SS*0.93-h2*((CH-30)/CH))),scc)
    draw_dust(d,t)

    # WORD-BY-WORD CAPTION (karaoke pop)
    wd,age=word_at(t)
    if wd and wd["w"]:
        txt=wd["w"].upper().strip(".,!?")
        if txt:
            pop=1.0 if age>0.10 else 0.7+0.3*(age/0.10)
            ft=font(58*pop); bb=d.textbbox((0,0),txt,font=ft); tw=bb[2]-bb[0]; th=bb[3]-bb[1]
            bx=W*SS/2; by=H*SS*0.20
            d.rounded_rectangle([bx-tw/2-18*SS,by-10*SS,bx+tw/2+18*SS,by+th+18*SS],radius=14*SS,fill=(18,12,32,230),outline=(255,176,32,200),width=3*SS)
            d.text((bx-tw/2+2*SS,by+5*SS),txt,font=ft,fill=(0,0,0,170))
            d.text((bx-tw/2,by+3*SS),txt,font=ft,fill=(250,235,120))

    img=Image.composite(img,BLACK,VIG); img=ImageEnhance.Color(img).enhance(1.16); img=ImageEnhance.Contrast(img).enhance(1.06)
    z=1.0+0.05*(t/DUR); cw,ch=int(W*SS/z),int(H*SS/z); l=(W*SS-cw)//2; tp=int((H*SS-ch)*0.42)
    return img.crop((l,tp,l+cw,tp+ch)).resize((W,H),Image.LANCZOS)

if __name__=="__main__":
    print(f"[{K}] rendering {N} frames, DUR={DUR:.2f}s")
    tmp=f"/tmp/{K}_noaudio.mp4"
    wr=imageio.get_writer(tmp,fps=FPS,codec="libx264",quality=9,ffmpeg_params=["-pix_fmt","yuv420p"])
    for i in range(N):
        wr.append_data(np.asarray(render_frame(i).convert("RGB")))
        if i%90==0: print(f"  {i}/{N}")
    wr.close()
    ff=imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([ff,"-y","-i",tmp,"-i",f"/tmp/{K}.wav","-c:v","copy","-c:a","aac","-b:a","128k","-shortest",f"/tmp/clip_{K}.mp4"],check=True,capture_output=True)
    print(f"done -> /tmp/clip_{K}.mp4")
