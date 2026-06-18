#!/usr/bin/env python3
# LuxeStyle — build_wm_reel.py  (WM/Public-Viewing-Reel, CH-Theme rot-weiss, Mundart)
# Reicht den WM-Reichweiten-Trend mit: Top-Produkte als "Match-Day / Public-Viewing-Outfit".
# KEIN FIFA/Team-Logo/Spielername (rechtlich sauber) — nur generische WM-Stimmung + CH rot-weiss.
# 9:16, Safe-Zone-Text (y<=1500), kein Emoji/Apostroph/% im Brenn-Text, Hype-Musik, xfade.
# Lauf:  python3 automation/video/build_wm_reel.py [ANZAHL]
import os, sys, csv, time, subprocess, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
N = int(sys.argv[1]) if len(sys.argv) > 1 else 8
FR = 30; DUR = 1.7; XF = 0.35
RED = "0xD52B1E"  # Schweizer Rot
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FS = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
MUSIC = os.path.join(ROOT, "automation/music/luxe-hype-pro.mp3")
SEG = "/tmp/wmreel"; os.makedirs(SEG, exist_ok=True)
GRADE = "eq=contrast=1.06:saturation=1.14:brightness=0.01,vignette=angle=PI/5"

def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode != 0:
        print("FFMPEG ERR:\n", r.stderr[-600:]); raise SystemExit(1)

def price(handle):
    try:
        d = __import__("json").load(urllib.request.urlopen(f"https://luxestyle.ch/products/{handle}.json", timeout=15))
        return d["product"]["variants"][0]["price"]
    except Exception:
        return ""

def esc(t):  # drawtext-sicher: kein Apostroph/Doppelpunkt/%; Umlaute ok (DejaVu)
    return t.replace("'", "").replace(":", " ").replace("%", " Prozent").replace(",", "")

# 1) Produkte laden
rows = list(csv.reader(open(os.path.join(ROOT, "automation/top_products.csv"))))[1:]
pick = [r for r in rows if len(r) >= 3][:N]
print(f"{len(pick)} Produkte:", ", ".join(p[2] for p in pick))

def stripe(extra=""):  # rot-weiss CH-Akzent: roter Balken oben + weisse Linie
    return (f"drawbox=x=0:y=0:w=1080:h=14:color={RED}:t=fill,"
            f"drawbox=x=0:y=14:w=1080:h=4:color=white:t=fill" + (("," + extra) if extra else ""))

def card(text_lines, out, dur, sub=""):
    # Titel-/Outro-Karte: dunkler BG, rot-weiss, grosse Schrift
    draws = [stripe()]
    y = 760
    for i, (txt, size, col, fnt) in enumerate(text_lines):
        draws.append(f"drawtext=fontfile={fnt}:text='{esc(txt)}':fontcolor={col}:fontsize={size}:x=(w-tw)/2:y={y}:box=1:boxcolor=black@0.45:boxborderw=16")
        y += size + 40
    vf = f"color=c=0x101418:s=1080x1920:d={dur}:r={FR},{GRADE}," + ",".join(draws)
    run(["ffmpeg","-y","-f","lavfi","-i",vf,"-t",str(dur),"-c:v","libx264","-preset","veryfast","-pix_fmt","yuv420p","-r",str(FR),out])

# 2) Intro-Karte
intro = f"{SEG}/00intro.mp4"
card([("WM-FIEBER", 110, "white", F), ("Public Viewing im Style", 60, RED, FS),
      ("SCHWIIZ - bisch bereit?", 54, "white", FS)], intro, 2.2)

# 3) Produkt-Segmente (Ken-Burns + rot-weiss-Akzent + Label + Preis)
segs = [intro]
for i, r in enumerate(pick):
    handle, img, label = r[0], r[1], r[2]
    raw = f"{SEG}/raw{i}.jpg"
    try:
        urllib.request.urlretrieve(img, raw)
    except Exception as e:
        print("skip", label, e); continue
    pr = price(handle); prx = f"CHF {pr}" if pr else ""
    o = f"{SEG}/s{i}.mp4"
    nframes = int(DUR * FR)
    vf = (f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=24,eq=brightness=-0.12[bg];"
          f"[0:v]scale=900:-1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[base];"
          f"[base]zoompan=z='min(zoom+0.0012,1.12)':d={nframes}:s=1080x1920:fps={FR},{GRADE},"
          f"{stripe()},"
          f"drawtext=fontfile={F}:text='LuxeStyle.ch':fontcolor=white:fontsize=38:x=40:y=44:box=1:boxcolor={RED}@0.85:boxborderw=10,"
          f"drawtext=fontfile={FS}:text='{esc(label)}':fontcolor=white:fontsize=58:x=(w-tw)/2:y=1330:box=1:boxcolor=black@0.5:boxborderw=18,"
          f"drawtext=fontfile={F}:text='{esc(prx)}':fontcolor=0xFFE066:fontsize=52:x=(w-tw)/2:y=1410:box=1:boxcolor={RED}@0.85:boxborderw=14[v]")
    run(["ffmpeg","-y","-loop","1","-t",str(DUR),"-i",raw,"-filter_complex",vf,"-map","[v]","-an","-r",str(FR),"-c:v","libx264","-preset","ultrafast","-crf","24","-pix_fmt","yuv420p",o])
    segs.append(o)

# 4) Outro-CTA
outro = f"{SEG}/zz_outro.mp4"
card([("Dys Match-Day-Outfit", 64, "white", FS), ("luxestyle.ch", 92, RED, F),
      ("WELCOME10 = 10 Prozent gschpart", 46, "white", FS)], outro, 2.6)
segs.append(outro)

# 5) xfade-Kette
inp = []; [inp.extend(["-i", s]) for s in segs]
durs = []
for s in segs:
    pr = subprocess.run(["ffprobe","-v","0","-show_entries","format=duration","-of","csv=p=0",s], capture_output=True, text=True)
    durs.append(float(pr.stdout.strip() or DUR))
fc = ""; last = "[0:v]"; off = 0.0
for k in range(1, len(segs)):
    off += durs[k-1] - XF
    fc += f"{last}[{k}:v]xfade=transition=fade:duration={XF}:offset={off:.2f}[x{k}];"; last = f"[x{k}]"
total = sum(durs) - XF*(len(segs)-1)
fc = fc.rstrip(";")
stamp = time.strftime("%Y%m%d-%H%M")
out = os.path.join(ROOT, f"reels/luxe-wm-publicviewing-{stamp}.mp4")
af = f"afade=t=in:d=0.5,afade=t=out:st={total-1.0:.2f}:d=1.0,loudnorm=I=-14:TP=-1.5"
if os.path.exists(MUSIC):
    run(["ffmpeg","-y",*inp,"-i",MUSIC,"-filter_complex",fc,"-map",last,"-map",f"{len(segs)}:a",
         "-t",f"{total:.2f}","-af",af,"-c:v","libx264","-preset","veryfast","-pix_fmt","yuv420p","-r",str(FR),"-crf","20","-movflags","+faststart",out])
else:
    run(["ffmpeg","-y",*inp,"-filter_complex",fc,"-map",last,"-t",f"{total:.2f}","-c:v","libx264","-pix_fmt","yuv420p","-r",str(FR),"-movflags","+faststart",out])
print(f"FERTIG: {out}  ({total:.0f}s, {len(segs)} Segmente)")
