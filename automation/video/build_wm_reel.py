#!/usr/bin/env python3
# LuxeStyle — build_wm_reel.py  (WM/Public-Viewing-Reel v3, CH, ECHTER Fussball-Bezug)
# - Match-Day-passende Produkte (Caps, Sport-/Aviator-Brillen, Herren-Shorts/Sneaker/Set) statt Frauen-Blazer.
# - Fussball-Bild (Pollinations, gratis) als Intro/Halbzeit/Outro + gezeichnete Schweizer-Flagge (Dauer-Badge + Intro gross).
# - Mundart-Fussball-Hooks, Hype-Musik, KEINE Stimme, kein FIFA-Logo (rechtlich sauber), Safe-Zone-Text.
# Lauf:  python3 automation/video/build_wm_reel.py
import os, subprocess, time, urllib.request, json

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FR = 30; DUR = 1.8
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; FS = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
RED = "0xD52B1E"; CDN = "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/"
MUSIC = os.path.join(ROOT, "automation/music/luxe-hype-pro.mp3")
S = "/tmp/wmreel"; os.makedirs(S, exist_ok=True); BALL = f"{S}/ball.jpg"

# Match-Day / Public-Viewing-passende Produkte (handle, bild, label)
WM = [
    ("baseball-cap-navy-washed-cotton", CDN+"f3a43509-1c4d-4cf7-ad0d-438b6047f99d.png", "Baseball-Cap «Navy»"),
    ("sport-sonnenbrille-wraparound-polarisiert", CDN+"S6a68cdd64d554b31a3568be18d8ea363w.webp", "Sport-Sonnenbrille"),
    ("herren-sneaker-marco-leder-optik-retro-trainer", CDN+"8769b498-4e79-4900-bde6-9d7316ed91a3.jpg", "Herren-Sneaker «Marco»"),
    ("herren-beach-shorts-coral-reissverschluss-tasche", CDN+"dd82ba1d-222f-40c8-bcb5-78942c0b5938.jpg", "Herren-Shorts «Coral»"),
    ("aviator-sonnenbrille-pilot-polarisiert-uv400", CDN+"H071fc6eb77d94c0c931c316f405bf9d5H.webp", "Aviator-Brille"),
    ("herren-set-costa-kapuzen-shirt-jogger", CDN+"6d3dddef-f807-44ac-9758-37c07591fe4c.jpg", "Herren-Set «Costa»"),
]

def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: print("ERR", r.stderr[-500:]); raise SystemExit(1)
def price(h):
    try: return json.load(urllib.request.urlopen(f"https://luxestyle.ch/products/{h}.json", timeout=15))["product"]["variants"][0]["price"]
    except Exception: return ""
def esc(t): return t.replace("'", "").replace(":", " ").replace("%", " Prozent").replace(",", "")
def flag(x, y, s):  # Schweizer Flagge
    cx, cy = x+s//2, y+s//2; t = int(s*0.2); l = int(s*0.62)
    return (f"drawbox=x={x}:y={y}:w={s}:h={s}:color={RED}:t=fill,"
            f"drawbox=x={cx-t//2}:y={cy-l//2}:w={t}:h={l}:color=white:t=fill,"
            f"drawbox=x={cx-l//2}:y={cy-t//2}:w={l}:h={t}:color=white:t=fill")

# Fussball holen (Pollinations gratis)
if not os.path.exists(BALL):
    try: urllib.request.urlretrieve("https://image.pollinations.ai/prompt/classic%20soccer%20ball%20black%20white%20on%20green%20grass%20stadium?width=600&height=600&nologo=true", BALL)
    except Exception as e: print("Ball-Download fail", e)

def card(lines, out, dur):
    draws = [f"drawbox=x=0:y=0:w=1080:h=14:color={RED}:t=fill", flag(440, 300, 200)]
    y = 820
    for txt, size, col, fnt in lines:
        draws.append(f"drawtext=fontfile={fnt}:text='{esc(txt)}':fontcolor={col}:fontsize={size}:x=(w-tw)/2:y={y}:box=1:boxcolor=black@0.5:boxborderw=16"); y += size+34
    vf = (f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.30:saturation=1.05,boxblur=3[bg];[bg]"+",".join(draws)+"[v]")
    run(["ffmpeg","-y","-loop","1","-t",str(dur),"-i",BALL,"-filter_complex",vf,"-map","[v]","-an","-r",str(FR),"-preset","veryfast","-crf","23","-pix_fmt","yuv420p",out])

# Karten
card([("WM-FIEBER",104,"white",F),("Public Viewing im Style",54,"0xFF5A4D",FS),("HOPP SCHWIIZ!",60,"white",F)], f"{S}/c_intro.mp4", 3.0)
card([("MATCH-DAY-LOOKS",80,"white",F),("Dys Outfit fürs Spiel",50,"0xFF5A4D",FS)], f"{S}/c_mid.mp4", 2.0)
card([("Anpfiff fürs Shoppe",58,"white",FS),("luxestyle.ch",90,"0xFF5A4D",F),("WELCOME10 = 10 Prozent",44,"white",FS)], f"{S}/c_outro.mp4", 2.8)

# Produkt-Segmente (Ken-Burns + Marke + Label + Preis + Eck-Flagge)
segs = []
for i, (h, img, lab) in enumerate(WM):
    raw = f"{S}/p{i}." + img.split(".")[-1].split("?")[0]
    try: urllib.request.urlretrieve(img, raw)
    except Exception as e: print("skip", lab, e); continue
    pr = price(h); prx = f"CHF {pr}" if pr else ""
    o = f"{S}/p{i}.mp4"; nf = int(DUR*FR)
    vf = (f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=24,eq=brightness=-0.12[bg];"
          f"[0:v]scale=900:-1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[base];"
          f"[base]zoompan=z='min(zoom+0.0012,1.12)':d={nf}:s=1080x1920:fps={FR},eq=contrast=1.06:saturation=1.14,"
          f"drawbox=x=0:y=0:w=1080:h=14:color={RED}:t=fill,{flag(905,40,120)},"
          f"drawtext=fontfile={F}:text='LuxeStyle.ch':fontcolor=white:fontsize=38:x=40:y=44:box=1:boxcolor={RED}@0.85:boxborderw=10,"
          f"drawtext=fontfile={FS}:text='{esc(lab)}':fontcolor=white:fontsize=56:x=(w-tw)/2:y=1330:box=1:boxcolor=black@0.5:boxborderw=18,"
          f"drawtext=fontfile={F}:text='{esc(prx)}':fontcolor=0xFFE066:fontsize=52:x=(w-tw)/2:y=1410:box=1:boxcolor={RED}@0.85:boxborderw=14[v]")
    run(["ffmpeg","-y","-loop","1","-t",str(DUR),"-i",raw,"-filter_complex",vf,"-map","[v]","-an","-r",str(FR),"-preset","ultrafast","-crf","24","-pix_fmt","yuv420p",o])
    segs.append((o, lab))

# Reihenfolge: intro, 3 Produkte, Halbzeit, Rest, outro
half = len(segs)//2
order = [f"{S}/c_intro.mp4"] + [s[0] for s in segs[:half]] + [f"{S}/c_mid.mp4"] + [s[0] for s in segs[half:]] + [f"{S}/c_outro.mp4"]
order = [o for o in order if os.path.exists(o)]
durs = []
for o in order:
    p = subprocess.run(["ffprobe","-v","0","-show_entries","format=duration","-of","csv=p=0",o], capture_output=True, text=True); durs.append(float(p.stdout.strip() or DUR))
total = sum(durs); n = len(order)
inp = []; [inp.extend(["-i", o]) for o in order]
fc = "".join(f"[{k}:v]" for k in range(n)) + f"concat=n={n}:v=1:a=0[v]"
out = os.path.join(ROOT, "reels/luxe-wm-fussball.mp4")
af = f"afade=t=in:d=0.5,afade=t=out:st={total-1.3:.2f}:d=1.3,loudnorm=I=-14:TP=-1.5"
run(["ffmpeg","-y",*inp,"-i",MUSIC,"-filter_complex",fc,"-map","[v]","-map",f"{n}:a","-t",f"{total:.2f}","-af",af,"-c:v","libx264","-preset","veryfast","-crf","23","-pix_fmt","yuv420p","-r",str(FR),"-shortest","-movflags","+faststart",out])
print(f"FERTIG {out} {total:.0f}s {n} Segmente · Produkte: " + ", ".join(s[1] for s in segs))
