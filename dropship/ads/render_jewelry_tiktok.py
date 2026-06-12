#!/usr/bin/env python3
# LuxeStyle — "krasses" Schmuck-TikTok (9:16, ~17.6s).
# Intro-Reveal → Drop@6.4s harte Beat-Cuts mit White-Flash, kräftiger Grade, Bold-Text, Sparkle.
# Musik: automation/music/luxe-hype-pro.mp3 (17.76s, Intro→Drop@6.4s). Nur ffmpeg.
import subprocess, sys, os
HERE = "/home/user/aban-news-landing"
TMP = "/tmp/jewtt"; SEG = f"{TMP}/seg"
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
# kräftiger, funkelnder Grade (mehr Kontrast/Sättigung als Marken-Video) + Schärfe
GRADE = ("eq=contrast=1.14:saturation=1.28:brightness=0.018,"
         "unsharp=5:5:0.8:5:5:0.0,vignette=angle=PI/4.5")
os.makedirs(SEG, exist_ok=True)

def esc(t): return t.replace(":", "\\:").replace("'", "’")

def overlay(label, sub):
    l, s = esc(label), esc(sub)
    parts = [
        # Marke oben
        f"drawtext=fontfile={F}:text='LUXESTYLE':fontcolor=white@0.9:fontsize=38:x=(w-text_w)/2:y=86:"
        f"shadowcolor=black@0.7:shadowx=2:shadowy=2:alpha='min(t/0.3,1)'",
        # dunkles Band unten
        "drawbox=x=0:y=1500:w=1080:h=300:color=black@0.40:t=fill",
    ]
    if l:
        parts.append(
            f"drawtext=fontfile={F}:text='{l}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=1556:"
            f"shadowcolor=black:shadowx=3:shadowy=3:alpha='min(max((t-0.15)/0.25\\,0)\\,1)'")
    if s:
        parts.append(
            f"drawtext=fontfile={F}:text='{s}':fontcolor=0xF5D08A:fontsize=48:x=(w-text_w)/2:y=1660:"
            f"alpha='min(max((t-0.3)/0.25\\,0)\\,1)'")
    return ",".join(parts)

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        print("FFMPEG ERR:", ' '.join(args)[:180], "\n", r.stderr[-700:]); sys.exit(1)

# White-Flash am Schnitt: fade aus Weiss (ausser allererstem Segment)
def flash(i): return "" if i == 0 else "fade=t=in:st=0:d=0.10:color=white,"

def seg_vid(i, src, out, D, label, sub):
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-t", str(D),
         "-vf", f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,{GRADE},{flash(i)}{overlay(label,sub)}",
         "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", out])

def seg_photo(i, src, out, D, label, sub, zoom=0.0016):
    f = int(D * 30)
    run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", src, "-t", str(D),
         "-vf", (f"scale=1620:2880:force_original_aspect_ratio=increase,crop=1620:2880,"
                 f"zoompan=z='min(zoom+{zoom},1.18)':d={f}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,"
                 f"setsar=1,{GRADE},{flash(i)}{overlay(label,sub)}"),
         "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", out])

def seg_card(i, out, D, title, sub, sub2=""):
    t, s, s2 = esc(title), esc(sub), esc(sub2)
    dt = [
        # funkelnde Akzente
        f"drawtext=fontfile={F}:text='✦':fontcolor=0xF5D08A@0.9:fontsize=70:x=200:y=560:alpha='min(t/0.4,1)'",
        f"drawtext=fontfile={F}:text='✦':fontcolor=white@0.8:fontsize=44:x=820:y=900:alpha='min(max((t-0.2)/0.4\\,0)\\,1)'",
        f"drawtext=fontfile={F}:text='✦':fontcolor=0xF5D08A@0.8:fontsize=52:x=760:y=520:alpha='min(max((t-0.3)/0.4\\,0)\\,1)'",
        f"drawtext=fontfile={F}:text='{t}':fontcolor=white:fontsize=104:x=(w-text_w)/2:y=820:"
        f"shadowcolor=black:shadowx=3:shadowy=3:alpha='min(t/0.4,1)'",
        f"drawtext=fontfile={F}:text='{s}':fontcolor=0xF5D08A:fontsize=58:x=(w-text_w)/2:y=970:"
        f"alpha='min(max((t-0.25)/0.4\\,0)\\,1)'",
    ]
    if s2:
        dt.append(f"drawtext=fontfile={F}:text='{s2}':fontcolor=white@0.92:fontsize=46:x=(w-text_w)/2:y=1056:"
                  f"alpha='min(max((t-0.45)/0.4\\,0)\\,1)'")
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi",
         "-i", "color=c=0x0d0b09:s=1080x1920:r=30", "-t", str(D),
         "-vf", f"{flash(i)}{','.join(dt)},vignette=angle=PI/4", "-c:v", "libx264",
         "-pix_fmt", "yuv420p", "-preset", "veryfast", out])

EN = f"{HERE}/social/enhanced"
SEGS = [
    ("card", 2.0, "ECHTER GLANZ", "Schmuck-Drop 2026", ""),
    ("vid", f"{HERE}/reels/clip-eclat-kette.mp4", 2.2, "Éclat-Kette", "S925 · funkelnd"),
    ("photo", f"{EN}/moissanite-herzkette-coeur-s925-silber-infinity.jpg", 2.2, "Herzkette «Coeur»", "Moissanite-Stein"),
    # --- DROP @6.4s: schnelle Beat-Cuts ---
    ("vid", f"{HERE}/reels/clip-silber-armreif-serpent-s925-schlangenschuppen-optik.mp4", 1.3, "Armreif «Serpent»", "Schlangen-Optik"),
    ("photo", "/tmp/jw/onyx.jpg", 1.2, "Ohrringe «Onyx»", "Statement-Piece"),
    ("photo", "/tmp/jw/stella.jpg", 1.2, "Kette «Stella»", "Zirkonia-Kleeblatt"),
    ("photo", f"{EN}/silber-armreif-serpent-s925-schlangenschuppen-optik.jpg", 1.2, "925er Silber", "edel & fair"),
    ("photo", "/tmp/jw/coeur.jpg", 1.2, "Infinity-Herz", "Liebes-Symbol"),
    ("photo", f"{EN}/eclat-kette.jpg", 1.2, "Jeden Tag Glanz", "Schweizer Shop"),
    ("card", 3.9, "−10 PROZENT", "mit Code WELCOME10", "luxestyle.ch · Link in Bio"),
]

paths = []
for i, sp in enumerate(SEGS):
    o = f"{SEG}/{i:02d}.mp4"
    kind = sp[0]
    if kind == "card":
        seg_card(i, o, sp[1], sp[2], sp[3], sp[4] if len(sp) > 4 else "")
    elif kind == "vid":
        seg_vid(i, sp[1], o, sp[2], sp[3], sp[4])
    else:
        seg_photo(i, sp[1], o, sp[2], sp[3], sp[4])
    paths.append(o)

# harte Cuts → concat
concat = f"{TMP}/list.txt"
open(concat, "w").write("".join(f"file '{p}'\n" for p in paths))
vid = f"{TMP}/jew_vid.mp4"
run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concat,
     "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", vid])
T = sum(sp[1] if sp[0] == "card" else sp[2] for sp in SEGS)

# Musik (hype-pro) drunter, Fade-out
out = f"{HERE}/reels/luxestyle-schmuck-tiktok.mp4"
run(["ffmpeg", "-y", "-loglevel", "error", "-i", vid, "-i", f"{HERE}/automation/music/luxe-hype-pro.mp3",
     "-filter_complex", f"[1:a]volume=1.0,afade=t=out:st={round(T-1.0,2)}:d=1.0,loudnorm=I=-13:TP=-1[a]",
     "-map", "0:v", "-map", "[a]", "-t", str(T), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
     "-movflags", "+faststart", out])
print(f"OK: {out}  ~{round(T,2)}s")
