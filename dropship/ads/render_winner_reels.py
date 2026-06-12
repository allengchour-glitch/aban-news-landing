#!/usr/bin/env python3
# LuxeStyle — "Gewinner-Formel"-Reels: Einzel-Thema + Mundart-Text + Preis (9:16, stumm).
# Aus TikTok-Analyse: Mundart + Selbstgestalten + Produkt-mit-Preis ziehen am besten.
import subprocess, sys, os
HERE = "/home/user/aban-news-landing"; R = f"{HERE}/reels"; MO = "/tmp/more"
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
GRADE = ("eq=contrast=1.12:saturation=1.22:brightness=0.016,"
         "unsharp=5:5:0.7:5:5:0.0,vignette=angle=PI/4.5")

def esc(t): return t.replace(":", "\\:").replace("'", "’")
def overlay(label, sub):
    l, s = esc(label), esc(sub)
    p = [f"drawtext=fontfile={F}:text='LUXESTYLE':fontcolor=white@0.9:fontsize=38:x=(w-text_w)/2:y=86:"
         f"shadowcolor=black@0.7:shadowx=2:shadowy=2:alpha='min(t/0.3,1)'",
         "drawbox=x=0:y=1500:w=1080:h=300:color=black@0.40:t=fill"]
    if l: p.append(f"drawtext=fontfile={F}:text='{l}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=1556:"
                   f"shadowcolor=black:shadowx=3:shadowy=3:alpha='min(max((t-0.15)/0.25\\,0)\\,1)'")
    if s: p.append(f"drawtext=fontfile={F}:text='{s}':fontcolor=0xF5D08A:fontsize=48:x=(w-text_w)/2:y=1662:"
                   f"alpha='min(max((t-0.3)/0.25\\,0)\\,1)'")
    return ",".join(p)
def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode != 0: print("ERR:", ' '.join(a)[:160], "\n", r.stderr[-600:]); sys.exit(1)
def flash(i): return "" if i == 0 else "fade=t=in:st=0:d=0.10:color=white,"
def seg_vid(i, src, out, D, label, sub):
    run(["ffmpeg","-y","-loglevel","error","-i",src,"-t",str(D),
         "-vf",f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,{GRADE},{flash(i)}{overlay(label,sub)}",
         "-an","-r","30","-c:v","libx264","-pix_fmt","yuv420p","-preset","veryfast",out])
def seg_photo(i, src, out, D, label, sub):
    f = int(D*30)
    run(["ffmpeg","-y","-loglevel","error","-loop","1","-i",src,"-t",str(D),
         "-vf",(f"scale=1620:2880:force_original_aspect_ratio=increase,crop=1620:2880,"
                f"zoompan=z='min(zoom+0.0016,1.18)':d={f}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,"
                f"setsar=1,{GRADE},{flash(i)}{overlay(label,sub)}"),
         "-r","30","-c:v","libx264","-pix_fmt","yuv420p","-preset","veryfast",out])
def seg_card(i, out, D, title, sub, sub2=""):
    t, s, s2 = esc(title), esc(sub), esc(sub2)
    dt = [f"drawtext=fontfile={F}:text='✦':fontcolor=0xF5D08A@0.9:fontsize=70:x=200:y=560:alpha='min(t/0.4,1)'",
          f"drawtext=fontfile={F}:text='✦':fontcolor=white@0.8:fontsize=44:x=820:y=900:alpha='min(max((t-0.2)/0.4\\,0)\\,1)'",
          f"drawtext=fontfile={F}:text='{t}':fontcolor=white:fontsize=88:x=(w-text_w)/2:y=820:"
          f"shadowcolor=black:shadowx=3:shadowy=3:alpha='min(t/0.4,1)'",
          f"drawtext=fontfile={F}:text='{s}':fontcolor=0xF5D08A:fontsize=56:x=(w-text_w)/2:y=960:"
          f"alpha='min(max((t-0.25)/0.4\\,0)\\,1)'"]
    if s2: dt.append(f"drawtext=fontfile={F}:text='{s2}':fontcolor=white@0.92:fontsize=44:x=(w-text_w)/2:y=1046:"
                     f"alpha='min(max((t-0.45)/0.4\\,0)\\,1)'")
    run(["ffmpeg","-y","-loglevel","error","-f","lavfi","-i","color=c=0x0d0b09:s=1080x1920:r=30","-t",str(D),
         "-vf",f"{flash(i)}{','.join(dt)},vignette=angle=PI/4","-c:v","libx264","-pix_fmt","yuv420p","-preset","veryfast",out])

def build(name, segs):
    TMP=f"/tmp/win_{name}"; SEG=f"{TMP}/seg"; os.makedirs(SEG,exist_ok=True)
    paths=[]
    for i,sp in enumerate(segs):
        o=f"{SEG}/{i:02d}.mp4"; k=sp[0]
        if k=="card": seg_card(i,o,sp[1],sp[2],sp[3],sp[4] if len(sp)>4 else "")
        elif k=="vid": seg_vid(i,sp[1],o,sp[2],sp[3],sp[4])
        else: seg_photo(i,sp[1],o,sp[2],sp[3],sp[4])
        paths.append(o)
    lst=f"{TMP}/l.txt"; open(lst,"w").write("".join(f"file '{p}'\n" for p in paths))
    vid=f"{TMP}/v.mp4"
    run(["ffmpeg","-y","-loglevel","error","-f","concat","-safe","0","-i",lst,"-r","30",
         "-c:v","libx264","-pix_fmt","yuv420p","-preset","medium",vid])
    T=round(sum(s[1] if s[0]=="card" else s[2] for s in segs),2)
    out=f"{R}/{name}.mp4"
    run(["ffmpeg","-y","-loglevel","error","-i",vid,"-f","lavfi","-i","anullsrc=channel_layout=stereo:sample_rate=44100",
         "-map","0:v","-map","1:a","-t",str(T),"-c:v","copy","-c:a","aac","-b:a","96k","-movflags","+faststart","-shortest",out])
    print(f"OK {out} ~{T}s")

# Reel A — Selbstgestalten (Mundart)
build("luxestyle-win-selbstgestalten-stumm", [
    ("card", 2.2, "MACH DYS EIGES TEIL", "Dy Design, dys Teil", ""),
    ("vid", f"{R}/veo-hero-mountaintee-2026-06-09.mp4", 2.2, "T-Shirt", "dys Motiv"),
    ("vid", f"{R}/veo-hero-sunsethoodie-2026-06-09.mp4", 2.2, "Hoodie", "dyni Farb"),
    ("vid", f"{R}/veo-hero-quotemug-2026-06-09.mp4", 2.0, "Tasse", "dyn Spruch"),
    ("vid", f"{R}/veo-hero-cattote-2026-06-09.mp4", 2.0, "Täsche", "dys Design"),
    ("card", 2.4, "Ab CHF 20.90", "−10% mit WELCOME10", "luxestyle.ch · Link in Bio"),
])
# Reel B — Summer-Chleider (Mundart + Preis)
build("luxestyle-win-chleider-stumm", [
    ("card", 2.2, "SUMMER-CHLEIDER", "ab CHF 34.90", ""),
    ("vid", f"{R}/veo-hero-brise-2026-06-08.mp4", 2.2, "«Brise»", "luftig & leicht"),
    ("photo", f"{MO}/kleid-ibiza.jpg", 2.0, "«Ibiza»", "Bestseller"),
    ("vid", f"{R}/veo-hero-daisy-2026-06-08.mp4", 2.2, "«Daisy»", "Retro Polka-Dot"),
    ("photo", f"{MO}/kleid-aria.jpg", 2.0, "«Aria»", "Maxi tailliert"),
    ("vid", f"{R}/veo-hero-nuit-2026-06-08.mp4", 2.2, "«Nuit»", "Abend-elegant"),
    ("card", 2.4, "−10% mit WELCOME10", "luxestyle.ch", "Link in Bio"),
])
