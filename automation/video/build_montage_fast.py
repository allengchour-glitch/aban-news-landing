#!/usr/bin/env python3
# LuxeStyle — build_montage_fast.py  (SCHNELL-Montage: viele Produkte, ~2.5s/Produkt, schneller Text)
# User 2026-06-18: „max 3 Sek pro Produkt, lieber schneller, Text schneller, viele geile Bilder pro Video."
# Full-screen 9:16 Blur-Fill + schneller Ken-Burns + Premium-Grade + Label+Preis (sofort) + Intro-Hook + Outro-CTA + Musik.
# Lauf: python3 automation/video/build_montage_fast.py [ANZAHL] [START_INDEX] [OUT.mp4]
import os, sys, csv, time, subprocess, urllib.request, json
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
N = int(sys.argv[1]) if len(sys.argv) > 1 else 8
START = int(sys.argv[2]) if len(sys.argv) > 2 else 0
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; FS = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
GOLD = "0xE8D5A8"; RED = "0xD52B1E"; FR = 30; DUR = 2.5; SEG = "/tmp/mfast"; os.makedirs(SEG, exist_ok=True)
GRADE = "eq=contrast=1.07:saturation=1.13:brightness=0.012,vignette=angle=PI/5"
def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: print("ERR", r.stderr[-400:]); raise SystemExit(1)
def esc(t): return (t or "").replace("'", "").replace(":", " ").replace("%", " Prozent").replace(",", "")
def price(h):
    try: return json.load(urllib.request.urlopen(f"https://luxestyle.ch/products/{h}.json", timeout=12))["product"]["variants"][0]["price"]
    except Exception: return ""
rows = [r for r in list(csv.reader(open(os.path.join(ROOT, "automation/top_products.csv"))))[1:] if len(r) >= 3]
pick = rows[START:START+N]
nf = int(DUR * FR)
def card(lines, out, dur):
    d = [f"drawbox=x=0:y=0:w=1080:h=12:color={RED}:t=fill"]; y = 820
    for txt, sz, col, fn in lines:
        d.append(f"drawtext=fontfile={fn}:text='{esc(txt)}':fontcolor={col}:fontsize={sz}:x=(w-tw)/2:y={y}:box=1:boxcolor=black@0.5:boxborderw=16"); y += sz + 30
    vf = f"color=c=0x0e1116:s=1080x1920:d={dur}:r={FR},{GRADE}," + ",".join(d)
    run(["ffmpeg","-y","-nostdin","-f","lavfi","-i",vf,"-t",str(dur),"-c:v","libx264","-preset","veryfast","-crf","20","-pix_fmt","yuv420p","-r",str(FR),out])
intro = f"{SEG}/00.mp4"; card([("LUXESTYLE",96,"white",F),("Dini neue Lieblingsstuck",52,GOLD,FS),("Lueg dir das aa",46,"white",FS)], intro, 2.8)
segs = [intro]
for i, r in enumerate(pick):
    h, img, lab = r[0], r[1], r[2]
    raw = f"{SEG}/r{i}." + img.split(".")[-1].split("?")[0]
    try: urllib.request.urlretrieve(img, raw)
    except Exception as e: print("skip", lab, e); continue
    pr = price(h); prx = f"CHF {pr}" if pr else ""
    o = f"{SEG}/s{i}.mp4"
    vf = (f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=24,eq=brightness=-0.12[bg];"
          f"[0:v]scale=940:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[b];"
          f"[b]zoompan=z='min(zoom+0.0005,1.05)':d={nf}:s=1080x1920:fps={FR},{GRADE},"
          f"drawbox=x=0:y=0:w=1080:h=12:color={RED}:t=fill,"
          f"drawtext=fontfile={F}:text='LuxeStyle.ch':fontcolor=white:fontsize=36:x=40:y=44:box=1:boxcolor={RED}@0.85:boxborderw=9,"
          f"drawtext=fontfile={FS}:text='{esc(lab)}':fontcolor=white:fontsize=56:x=(w-tw)/2:y=1340:box=1:boxcolor=black@0.5:boxborderw=16:alpha='min(1,t*2.2)',"
          f"drawtext=fontfile={F}:text='{esc(prx)}':fontcolor={GOLD}:fontsize=52:x=(w-tw)/2:y=1420:box=1:boxcolor={RED}@0.85:boxborderw=13:alpha='min(1,t*2.2)'[v]")
    run(["ffmpeg","-y","-nostdin","-loop","1","-t",str(DUR),"-i",raw,"-filter_complex",vf,"-map","[v]","-an","-r",str(FR),"-c:v","libx264","-preset","veryfast","-crf","21","-pix_fmt","yuv420p",o])
    segs.append(o)
outro = f"{SEG}/zz.mp4"; card([("Alles uf",54,"white",FS),("luxestyle.ch",92,GOLD,F),("WELCOME10 = 10 Prozent",44,"white",FS)], outro, 2.2); segs.append(outro)
mp = f"{SEG}/m.wav"
subprocess.run(["/opt/node22/bin/node" if os.path.exists("/opt/node22/bin/node") else "node", os.path.join(ROOT,"automation/music/music_library.mjs"),"pick","--mood","upbeat-pop","--dur","30","--out",mp], capture_output=True)
if not os.path.exists(mp): mp = os.path.join(ROOT,"automation/music/luxe-hype-pro.mp3")
durs = [float(subprocess.run(["ffprobe","-v","0","-show_entries","format=duration","-of","csv=p=0",s],capture_output=True,text=True).stdout.strip() or DUR) for s in segs]
total = sum(durs); n = len(segs); inp = []; [inp.extend(["-i",s]) for s in segs]
fc = "".join(f"[{k}:v]" for k in range(n)) + f"concat=n={n}:v=1:a=0[v]"
out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(ROOT, f"reels/luxe-montage-{time.strftime('%Y%m%d-%H%M')}.mp4")
af = f"afade=t=in:d=0.4,afade=t=out:st={total-1.2:.2f}:d=1.2,loudnorm=I=-14:TP=-1.5"
run(["ffmpeg","-y","-nostdin",*inp,"-i",mp,"-filter_complex",fc,"-map","[v]","-map",f"{n}:a","-t",f"{total:.2f}","-af",af,"-c:v","libx264","-preset","veryfast","-crf","20","-pix_fmt","yuv420p","-r",str(FR),"-shortest","-movflags","+faststart",out])
print(f"FERTIG: {out}  ({total:.0f}s, {len(pick)} Produkte à {DUR}s)")
