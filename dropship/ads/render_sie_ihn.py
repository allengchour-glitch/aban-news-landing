#!/usr/bin/env python3
# LuxeStyle — "Für Sie & Ihn" (9:16, ~60s), STUMM (kein Sound/Stimme), nur Visuals + Text.
# Kleider → Damen-Schmuck (10) → Herren-Schmuck (6). Nur ffmpeg.
import subprocess, sys, os
HERE = "/home/user/aban-news-landing"
TMP = "/tmp/sieihn"; SEG = f"{TMP}/seg"
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
GRADE = ("eq=contrast=1.12:saturation=1.22:brightness=0.016,"
         "unsharp=5:5:0.7:5:5:0.0,vignette=angle=PI/4.5")
os.makedirs(SEG, exist_ok=True)
EN = f"{HERE}/social/enhanced"; R = f"{HERE}/reels"; JW = "/tmp/jw"; MO = "/tmp/more"

def esc(t): return t.replace(":", "\\:").replace("'", "’")
def overlay(label, sub):
    l, s = esc(label), esc(sub)
    p = [
        f"drawtext=fontfile={F}:text='LUXESTYLE':fontcolor=white@0.9:fontsize=38:x=(w-text_w)/2:y=86:"
        f"shadowcolor=black@0.7:shadowx=2:shadowy=2:alpha='min(t/0.3,1)'",
        "drawbox=x=0:y=1500:w=1080:h=300:color=black@0.40:t=fill",
    ]
    if l: p.append(f"drawtext=fontfile={F}:text='{l}':fontcolor=white:fontsize=68:x=(w-text_w)/2:y=1556:"
                   f"shadowcolor=black:shadowx=3:shadowy=3:alpha='min(max((t-0.15)/0.25\\,0)\\,1)'")
    if s: p.append(f"drawtext=fontfile={F}:text='{s}':fontcolor=0xF5D08A:fontsize=46:x=(w-text_w)/2:y=1660:"
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
    dt = [
        f"drawtext=fontfile={F}:text='✦':fontcolor=0xF5D08A@0.9:fontsize=70:x=200:y=560:alpha='min(t/0.4,1)'",
        f"drawtext=fontfile={F}:text='✦':fontcolor=white@0.8:fontsize=44:x=820:y=900:alpha='min(max((t-0.2)/0.4\\,0)\\,1)'",
        f"drawtext=fontfile={F}:text='{t}':fontcolor=white:fontsize=92:x=(w-text_w)/2:y=820:"
        f"shadowcolor=black:shadowx=3:shadowy=3:alpha='min(t/0.4,1)'",
        f"drawtext=fontfile={F}:text='{s}':fontcolor=0xF5D08A:fontsize=54:x=(w-text_w)/2:y=965:"
        f"alpha='min(max((t-0.25)/0.4\\,0)\\,1)'",
    ]
    if s2: dt.append(f"drawtext=fontfile={F}:text='{s2}':fontcolor=white@0.92:fontsize=44:x=(w-text_w)/2:y=1050:"
                     f"alpha='min(max((t-0.45)/0.4\\,0)\\,1)'")
    run(["ffmpeg","-y","-loglevel","error","-f","lavfi","-i","color=c=0x0d0b09:s=1080x1920:r=30","-t",str(D),
         "-vf",f"{flash(i)}{','.join(dt)},vignette=angle=PI/4","-c:v","libx264","-pix_fmt","yuv420p","-preset","veryfast",out])

SEGS = [
    ("card", 2.0, "FÜR SIE & IHN", "Kleider · Schmuck", ""),
    # KLEIDER
    ("vid", f"{R}/veo-hero-brise-2026-06-08.mp4", 2.2, "Off-Shoulder «Brise»", "luftig & leicht"),
    ("photo", f"{MO}/kleid-ibiza.jpg", 2.2, "Boho «Ibiza»", "Bestseller"),
    ("vid", f"{R}/veo-hero-nuit-2026-06-08.mp4", 2.2, "Slip-Kleid «Nuit»", "Abend-elegant"),
    ("photo", f"{MO}/kleid-aria.jpg", 2.2, "Maxi «Aria»", "tailliert"),
    ("vid", f"{R}/veo-hero-daisy-2026-06-08.mp4", 2.2, "Retro «Daisy»", "Polka-Dot"),
    ("photo", f"{MO}/kleid-riva.jpg", 2.2, "Tunika «Riva»", "Strand-Stil"),
    ("photo", f"{MO}/kleid-indigo.jpg", 2.2, "Boho «Indigo»", "mit Volant"),
    ("vid", f"{R}/veo-hero-sirene-2026-06-08.mp4", 2.2, "Abendmode", "der grosse Auftritt"),
    # FÜR SIE — Schmuck
    ("card", 1.6, "FÜR SIE", "Damen-Schmuck", ""),
    ("photo", f"{MO}/sj-eclat-ohrstecker.jpg", 2.1, "Moissanite-Ohrstecker", "S925"),
    ("photo", f"{MO}/sj-fortune.jpg", 2.1, "Kette «Fortune»", "Glücks-Symbole"),
    ("photo", f"{MO}/sj-duo-ring.jpg", 2.1, "Doppel-Ring «Duo»", "Topas-Blau"),
    ("photo", f"{MO}/sj-smaragd-set.jpg", 2.1, "Smaragd-Set «Vintage»", "3-teilig"),
    ("photo", f"{MO}/sj-evil-armband.jpg", 2.1, "Armband «Évil»", "vergoldet"),
    ("photo", f"{MO}/sj-choker.png", 2.1, "Choker · Layer", "trendig"),
    ("photo", f"{JW}/stella.jpg", 2.1, "Kette «Stella»", "Kleeblatt"),
    ("photo", f"{JW}/coeur.jpg", 2.1, "Herzkette «Coeur»", "Moissanite"),
    ("photo", f"{JW}/serpent.jpg", 2.1, "Armreif «Serpent»", "925 Silber"),
    # FÜR IHN — Schmuck
    ("card", 1.6, "FÜR IHN", "Herren-Schmuck", ""),
    ("photo", f"{MO}/hj-leder-anker.png", 2.2, "Leder-Armband «Anker»", "maritim"),
    ("photo", f"{MO}/j-ring-vintage.jpg", 2.2, "Herren-Ring «Vintage»", "Edelstahl"),
    ("photo", f"{MO}/j-cuban-link.png", 2.2, "Cuban-Link-Armband", "wasserfest"),
    ("photo", f"{MO}/j-figaro.png", 2.2, "Figaro-Kette", "PVD Gold/Silber"),
    ("photo", f"{MO}/j-herren-halskette.png", 2.2, "Herren-Halskette", "minimalistisch"),
    ("photo", f"{MO}/hj-magnate-set.jpg", 2.2, "Herrenuhr-Set «Magnate»", "Quarz + Armband"),
    ("card", 2.6, "−10 PROZENT", "mit Code WELCOME10", "luxestyle.ch · Link in Bio"),
]

paths = []
for i, sp in enumerate(SEGS):
    o = f"{SEG}/{i:02d}.mp4"; kind = sp[0]
    if kind == "card": seg_card(i, o, sp[1], sp[2], sp[3], sp[4] if len(sp) > 4 else "")
    elif kind == "vid": seg_vid(i, sp[1], o, sp[2], sp[3], sp[4])
    else: seg_photo(i, sp[1], o, sp[2], sp[3], sp[4])
    paths.append(o)

concat = f"{TMP}/list.txt"; open(concat, "w").write("".join(f"file '{p}'\n" for p in paths))
vid = f"{TMP}/vid.mp4"
run(["ffmpeg","-y","-loglevel","error","-f","concat","-safe","0","-i",concat,"-r","30",
     "-c:v","libx264","-pix_fmt","yuv420p","-preset","medium",vid])
T = round(sum(sp[1] if sp[0]=="card" else sp[2] for sp in SEGS), 2)
out = f"{HERE}/reels/luxestyle-sie-ihn-60s-stumm.mp4"
run(["ffmpeg","-y","-loglevel","error","-i",vid,"-f","lavfi","-i","anullsrc=channel_layout=stereo:sample_rate=44100",
     "-map","0:v","-map","1:a","-t",str(T),"-c:v","copy","-c:a","aac","-b:a","96k","-movflags","+faststart","-shortest",out])
print(f"OK: {out}  ~{T}s  ({len(SEGS)} Segmente, stumm)")
