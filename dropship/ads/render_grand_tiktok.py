#!/usr/bin/env python3
# LuxeStyle — 61s "Grand"-Showcase (9:16), STUMM (kein Sound/Stimme), nur Visuals + on-screen Text.
# Reihenfolge: Schmuck → Uhren → kurz Mode → Selbst gestalten → "sonst irgendwas" (OHNE Augenmassage).
# Effekte: kräftiger Grade, White-Flash-Cuts, Sparkle, Bold-Text. Nur ffmpeg.
import subprocess, sys, os
HERE = "/home/user/aban-news-landing"
TMP = "/tmp/grand61"; SEG = f"{TMP}/seg"
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
GRADE = ("eq=contrast=1.12:saturation=1.22:brightness=0.016,"
         "unsharp=5:5:0.7:5:5:0.0,vignette=angle=PI/4.5")
os.makedirs(SEG, exist_ok=True)
EN = f"{HERE}/social/enhanced"

def esc(t): return t.replace(":", "\\:").replace("'", "’")

def overlay(label, sub):
    l, s = esc(label), esc(sub)
    parts = [
        f"drawtext=fontfile={F}:text='LUXESTYLE':fontcolor=white@0.9:fontsize=38:x=(w-text_w)/2:y=86:"
        f"shadowcolor=black@0.7:shadowx=2:shadowy=2:alpha='min(t/0.3,1)'",
        "drawbox=x=0:y=1500:w=1080:h=300:color=black@0.40:t=fill",
    ]
    if l:
        parts.append(f"drawtext=fontfile={F}:text='{l}':fontcolor=white:fontsize=70:x=(w-text_w)/2:y=1556:"
                     f"shadowcolor=black:shadowx=3:shadowy=3:alpha='min(max((t-0.15)/0.25\\,0)\\,1)'")
    if s:
        parts.append(f"drawtext=fontfile={F}:text='{s}':fontcolor=0xF5D08A:fontsize=46:x=(w-text_w)/2:y=1662:"
                     f"alpha='min(max((t-0.3)/0.25\\,0)\\,1)'")
    return ",".join(parts)

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        print("FFMPEG ERR:", ' '.join(args)[:180], "\n", r.stderr[-700:]); sys.exit(1)

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
        f"drawtext=fontfile={F}:text='{t}':fontcolor=white:fontsize=96:x=(w-text_w)/2:y=820:"
        f"shadowcolor=black:shadowx=3:shadowy=3:alpha='min(t/0.4,1)'",
        f"drawtext=fontfile={F}:text='{s}':fontcolor=0xF5D08A:fontsize=56:x=(w-text_w)/2:y=965:"
        f"alpha='min(max((t-0.25)/0.4\\,0)\\,1)'",
    ]
    if s2:
        dt.append(f"drawtext=fontfile={F}:text='{s2}':fontcolor=white@0.92:fontsize=46:x=(w-text_w)/2:y=1052:"
                  f"alpha='min(max((t-0.45)/0.4\\,0)\\,1)'")
    run(["ffmpeg","-y","-loglevel","error","-f","lavfi","-i","color=c=0x0d0b09:s=1080x1920:r=30","-t",str(D),
         "-vf",f"{flash(i)}{','.join(dt)},vignette=angle=PI/4","-c:v","libx264","-pix_fmt","yuv420p","-preset","veryfast",out])

R=f"{HERE}/reels"; JW="/tmp/jw"; UH="/tmp/uhr"
SEGS = [
    ("card", 2.0, "ECHTER GLANZ", "Schmuck · Uhren & mehr", ""),
    # --- SCHMUCK ---
    ("vid", f"{R}/clip-eclat-kette.mp4", 2.4, "Éclat-Kette", "S925 · funkelnd"),
    ("photo", f"{EN}/moissanite-herzkette-coeur-s925-silber-infinity.jpg", 2.2, "Herzkette «Coeur»", "Moissanite"),
    ("photo", f"{JW}/onyx.jpg", 2.0, "Ohrringe «Onyx»", "Statement"),
    ("vid", f"{R}/clip-silber-armreif-serpent-s925-schlangenschuppen-optik.mp4", 2.4, "Armreif «Serpent»", "Schlangen-Optik"),
    ("photo", f"{JW}/stella.jpg", 2.0, "Kette «Stella»", "Zirkonia-Kleeblatt"),
    ("photo", f"{EN}/silber-armreif-serpent-s925-schlangenschuppen-optik.jpg", 2.0, "925er Silber", "edel & fair"),
    ("photo", f"{EN}/eclat-kette.jpg", 2.0, "Funkelnde Details", "jeden Tag Glanz"),
    ("photo", f"{JW}/coeur.jpg", 2.0, "Infinity-Herz", "Liebes-Symbol"),
    # --- UHREN ---
    ("vid", f"{R}/clip-smartwatch-pro.mp4", 2.4, "Smartwatch Pro", "immer verbunden"),
    ("photo", f"{UH}/herrenuhr-edelstahl.png", 2.2, "Herrenuhr Edelstahl", "Saphirglas · 50m"),
    ("photo", f"{UH}/skelettuhr-heritage.png", 2.2, "Automatik-Skelett", "offenes Werk"),
    ("photo", f"{UH}/chronograph-aviator.png", 2.2, "Chronograph «Aviator»", "Lederband"),
    ("photo", f"{UH}/damenuhr-petite.png", 2.0, "Damenuhr «Petite»", "Perlmutt-Zifferblatt"),
    ("photo", f"{UH}/two-tone-business.png", 2.0, "Two-Tone Business", "Gold/Silber"),
    ("photo", f"{UH}/marmor-damenuhr.png", 2.0, "Marmor-Damenuhr", "Stein-Look"),
    # --- MODE (kurz) ---
    ("vid", f"{R}/veo-hero-sirene-2026-06-08.mp4", 2.2, "Abendmode", "der grosse Auftritt"),
    ("vid", f"{R}/clip-blazer-roma-tailliert-mit-bindegurtel-revers.mp4", 2.2, "Blazer «Roma»", "Business & Apéro"),
    ("photo", f"{EN}/aurora-kleid.jpg", 2.0, "Abendkleid «Aurora»", "Satin mit Schlitz"),
    ("vid", f"{R}/clip-herren-strickhemd-amalfi-ajour-knit-camp-kragen.mp4", 2.2, "Herrenmode", "Looks für Ihn"),
    # --- SELBST GESTALTEN ---
    ("card", 1.8, "SELBST GESTALTEN", "Dein Design, dein Teil", ""),
    ("vid", f"{R}/veo-hero-mountaintee-2026-06-09.mp4", 2.0, "T-Shirt", "dein Motiv"),
    ("vid", f"{R}/veo-hero-sunsethoodie-2026-06-09.mp4", 2.0, "Hoodie", "deine Farbe"),
    ("vid", f"{R}/veo-hero-quotemug-2026-06-09.mp4", 2.0, "Tasse", "dein Spruch"),
    ("vid", f"{R}/veo-hero-cattote-2026-06-09.mp4", 2.0, "Tasche", "dein Design"),
    # --- SONST IRGENDWAS (ohne Augenmassage) ---
    ("vid", f"{R}/clip-sonnenbrille-chrome.mp4", 2.0, "Sonnenbrille «Chrome»", "polarisiert"),
    ("photo", f"{EN}/strohtasche.jpg", 2.0, "Strohtasche", "der Sommer-Look"),
    ("vid", f"{R}/clip-craquele-vase.mp4", 2.0, "Deko «Craquelé»", "für dein Zuhause"),
    ("card", 2.6, "−10 PROZENT", "mit Code WELCOME10", "luxestyle.ch · Link in Bio"),
]

paths = []
for i, sp in enumerate(SEGS):
    o = f"{SEG}/{i:02d}.mp4"; kind = sp[0]
    if kind == "card": seg_card(i, o, sp[1], sp[2], sp[3], sp[4] if len(sp) > 4 else "")
    elif kind == "vid": seg_vid(i, sp[1], o, sp[2], sp[3], sp[4])
    else: seg_photo(i, sp[1], o, sp[2], sp[3], sp[4])
    paths.append(o)

concat = f"{TMP}/list.txt"
open(concat, "w").write("".join(f"file '{p}'\n" for p in paths))
vid = f"{TMP}/grand_vid.mp4"
run(["ffmpeg","-y","-loglevel","error","-f","concat","-safe","0","-i",concat,
     "-r","30","-c:v","libx264","-pix_fmt","yuv420p","-preset","medium",vid])
T = round(sum(sp[1] if sp[0]=="card" else sp[2] for sp in SEGS), 2)

# STUMM: stiller AAC-Track (kein Sound/Stimme) — für Upload-Kompatibilitaet
out = f"{HERE}/reels/luxestyle-grand-61s-stumm.mp4"
run(["ffmpeg","-y","-loglevel","error","-i",vid,
     "-f","lavfi","-i","anullsrc=channel_layout=stereo:sample_rate=44100",
     "-map","0:v","-map","1:a","-t",str(T),"-c:v","copy","-c:a","aac","-b:a","96k",
     "-movflags","+faststart","-shortest",out])
print(f"OK: {out}  ~{T}s  ({len(SEGS)} Segmente, stumm)")
