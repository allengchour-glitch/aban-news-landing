#!/usr/bin/env python3
# LuxeStyle Marken-Video (60s + 30s) — reproduzierbar. Siehe Doku-Header unten.
# SETUP: apt-get install -y ffmpeg ; pip install piper-tts ; Kerstin-Voice de_DE-kerstin-low.onnx laden.
# VO (piper --length_scale 1.08) Texte + Musik (luxe-house1.wav, geduckt) + Assets (reels/veo-hero-*, social/enhanced/*).
# Effekte: Ken-Burns, eq+vignette, drawtext-Fade, xfade. WICHTIG: kein '%' in drawtext -> "Prozent".
#!/usr/bin/env python3
import subprocess, sys, os, json
HERE="/home/user/aban-news-landing"
TMP="/tmp/brand"; SEG=f"{TMP}/seg"
F="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
GRADE="eq=contrast=1.06:saturation=1.10:brightness=0.012,vignette=angle=PI/5"
os.makedirs(SEG,exist_ok=True)

def esc(t): return t.replace(":","\\:").replace("'","’")
def overlay(label,sub):
    l=esc(label); s=esc(sub)
    return (f"drawtext=fontfile={F}:text='LUXESTYLE':fontcolor=white@0.85:fontsize=36:x=(w-text_w)/2:y=80:"
            f"shadowcolor=black@0.6:shadowx=2:shadowy=2:alpha='min(t/0.5,1)',"
            f"drawbox=x=0:y=1540:w=1080:h=260:color=black@0.42:t=fill,"
            f"drawtext=fontfile={F}:text='{l}':fontcolor=white:fontsize=62:x=(w-text_w)/2:y=1590:"
            f"shadowcolor=black:shadowx=2:shadowy=2:alpha='min(max((t-0.3)/0.4\\,0)\\,1)',"
            f"drawtext=fontfile={F}:text='{s}':fontcolor=0xF5D08A:fontsize=44:x=(w-text_w)/2:y=1680:"
            f"alpha='min(max((t-0.45)/0.4\\,0)\\,1)'")
def run(args):
    r=subprocess.run(args,capture_output=True,text=True)
    if r.returncode!=0: print("FFMPEG ERR:",' '.join(args)[:200],"\n",r.stderr[-600:]); sys.exit(1)

def seg_vid(src,out,D,label,sub):
    run(["ffmpeg","-y","-loglevel","error","-i",src,"-t",str(D),
         "-vf",f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,{GRADE},{overlay(label,sub)}",
         "-an","-r","30","-c:v","libx264","-pix_fmt","yuv420p","-preset","veryfast",out])
def seg_photo(src,out,D,label,sub):
    f=int(D*30)
    run(["ffmpeg","-y","-loglevel","error","-loop","1","-i",src,"-t",str(D),
         "-vf",(f"scale=1620:2880:force_original_aspect_ratio=increase,crop=1620:2880,"
                f"zoompan=z='min(zoom+0.0008,1.12)':d={f}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,"
                f"setsar=1,{GRADE},{overlay(label,sub)}"),
         "-r","30","-c:v","libx264","-pix_fmt","yuv420p","-preset","veryfast",out])
def seg_card(out,D,title,sub,sub2=""):
    t=esc(title); s=esc(sub); s2=esc(sub2)
    dt=(f"drawtext=fontfile={F}:text='{t}':fontcolor=white:fontsize=92:x=(w-text_w)/2:y=780:alpha='min(t/0.6,1)',"
        f"drawtext=fontfile={F}:text='{s}':fontcolor=0xF5D08A:fontsize=52:x=(w-text_w)/2:y=930:alpha='min(max((t-0.3)/0.5\\,0)\\,1)'")
    if s2: dt+=f",drawtext=fontfile={F}:text='{s2}':fontcolor=white@0.9:fontsize=44:x=(w-text_w)/2:y=1010:alpha='min(max((t-0.5)/0.5\\,0)\\,1)'"
    run(["ffmpeg","-y","-loglevel","error","-f","lavfi","-i",f"color=c=0x16110d:s=1080x1920:r=30","-t",str(D),
         "-vf",f"{dt},vignette=angle=PI/4","-c:v","libx264","-pix_fmt","yuv420p","-preset","veryfast",out])

def build(version, segs, D, C, vo, out):
    # render segments
    paths=[]
    for i,sp in enumerate(segs):
        o=f"{SEG}/{version}_{i:02d}.mp4"; kind=sp[0]
        if kind=="card": seg_card(o,D,sp[1],sp[2],sp[3] if len(sp)>3 else "")
        elif kind=="vid": seg_vid(f"{HERE}/{sp[1]}",o,D,sp[2],sp[3])
        else: seg_photo(f"{HERE}/{sp[1]}",o,D,sp[2],sp[3])
        paths.append(o)
    N=len(paths); T=round(N*D-(N-1)*C,2)
    # xfade chain
    inputs=[];
    for p in paths: inputs+=["-i",p]
    fc=""; prev="[0:v]"
    for k in range(1,N):
        off=round(k*(D-C),3); lab=f"[x{k}]" if k<N-1 else "[v]"
        fc+=f"{prev}[{k}:v]xfade=transition=fade:duration={C}:offset={off}{lab};"
        prev=f"[x{k}]"
    fc=fc.rstrip(";")
    vidonly=f"{TMP}/{version}_vid.mp4"
    run(["ffmpeg","-y","-loglevel","error",*inputs,"-filter_complex",fc,"-map","[v]","-r","30",
         "-c:v","libx264","-pix_fmt","yuv420p","-preset","medium",vidonly])
    # music bed looped to T
    bed=f"{TMP}/{version}_bed.wav"
    run(["ffmpeg","-y","-loglevel","error","-stream_loop","-1","-i",f"{HERE}/automation/music/luxe-house1.wav","-t",str(T),
         "-af",f"volume=0.13,afade=t=in:st=0:d=1,afade=t=out:st={T-2}:d=2",bed])
    # mix vo (delayed) + bed
    run(["ffmpeg","-y","-loglevel","error","-i",vidonly,"-i",vo,"-i",bed,
         "-filter_complex",f"[1:a]adelay=2200|2200,loudnorm=I=-15:TP=-1.5[vo];[2:a]aresample=44100[mu];[vo][mu]amix=inputs=2:duration=longest:dropout_transition=3,loudnorm=I=-14:TP=-1[a]",
         "-map","0:v","-map","[a]","-t",str(T),"-c:v","copy","-c:a","aac","-b:a","192k","-movflags","+faststart",out])
    print(f"{version}: {out}  ~{T}s")

LONG=[
 ("card","LuxeStyle","Schweizer Online-Shop","Premium · fair · weltweit"),
 ("vid","reels/veo-hero-brise-2026-06-08.mp4","Sommermode","Kleider für heisse Tage"),
 ("photo","social/enhanced/herren-strickhemd-amalfi-ajour-knit-camp-kragen.jpg","Herrenmode","Looks für Ihn"),
 ("photo","social/enhanced/silber-armreif-serpent-s925-schlangenschuppen-optik.jpg","Schmuck & Uhren","Funkelnde Details"),
 ("vid","reels/veo-hero-nuit-2026-06-08.mp4","Taschen","Crossbody «Nuit»"),
 ("photo","social/enhanced/augenmassage.jpg","Beauty & Wellness","Self-Care für jeden Tag"),
 ("photo","social/enhanced/craquele-vase.jpg","Für dein Zuhause","Deko & Lifestyle"),
 ("vid","reels/veo-hero-cosy-2026-06-08.mp4","Cardigans","Kuschelig in viele Farben"),
 ("photo","social/enhanced/strohtasche.jpg","Accessoires","Der Sommer-Look"),
 ("vid","reels/veo-hero-sirene-2026-06-08.mp4","Abendmode","Der grosse Auftritt"),
 ("card","Selbst gestalten","Dein Design, dein Teil","on-demand gedruckt"),
 ("vid","reels/veo-hero-mountaintee-2026-06-09.mp4","T-Shirts","Dein Motiv"),
 ("vid","reels/veo-hero-sunsethoodie-2026-06-09.mp4","Hoodies","In deiner Farbe"),
 ("vid","reels/veo-hero-quotemug-2026-06-09.mp4","Tassen","Mit deinem Spruch"),
 ("vid","reels/veo-hero-cattote-2026-06-09.mp4","Taschen","Eigenes Design"),
 ("card","luxestyle.ch","−10 Prozent · Code WELCOME10","Weltweiter Versand · 30 Tage Rückgabe"),
]
SHORT=[
 ("card","LuxeStyle","Schweizer Online-Shop","Premium · fair · weltweit"),
 ("vid","reels/veo-hero-brise-2026-06-08.mp4","Sommermode","Für Sie"),
 ("photo","social/enhanced/herren-strickhemd-amalfi-ajour-knit-camp-kragen.jpg","Herrenmode","Für Ihn"),
 ("photo","social/enhanced/silber-armreif-serpent-s925-schlangenschuppen-optik.jpg","Schmuck","Funkelnde Details"),
 ("vid","reels/veo-hero-nuit-2026-06-08.mp4","Taschen","Crossbody «Nuit»"),
 ("photo","social/enhanced/augenmassage.jpg","Beauty & Wellness","Self-Care"),
 ("vid","reels/veo-hero-cosy-2026-06-08.mp4","Cardigans","Viele Farben"),
 ("card","Selbst gestalten","Dein Design, dein Teil",""),
 ("vid","reels/veo-hero-mountaintee-2026-06-09.mp4","Eigene Designs","T-Shirt, Tasse & mehr"),
 ("card","luxestyle.ch","−10 Prozent · WELCOME10","Weltweiter Versand"),
]
build("long",LONG,3.7,0.45,f"{TMP}/vo60.wav",f"{TMP}/luxestyle-brand-60s.mp4")
build("short",SHORT,3.0,0.4,f"{TMP}/vo30.wav",f"{TMP}/luxestyle-brand-30s.mp4")
