#!/usr/bin/env python3
# LuxeStyle — build_masterpiece.py  (EIN cinematisches Meisterwerk-Reel aus 1 Produktbild)
# Blur-Fill 9:16 + langsamer Ken-Burns + warmer Premium-Grade + Vignette + Mundart-Hook (Safe-Zone)
# + Marke + Preis + CTA + elegante Musik. Fuer TikTok/IG/FB. Kein Emoji/Apostroph im Brenn-Text.
# Lauf: python3 automation/video/build_masterpiece.py HANDLE BILD-URL "Label" "Mundart-Hook" [OUT.mp4]
import os, sys, subprocess, urllib.request, json
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
handle = sys.argv[1]; img = sys.argv[2]; label = sys.argv[3]
hook = sys.argv[4] if len(sys.argv) > 4 else "Genau das hesch gsuecht?"
out = sys.argv[5] if len(sys.argv) > 5 else os.path.join(ROOT, f"reels/luxe-meisterwerk-{handle[:24]}.mp4")
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; FS = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
GOLD = "0xE8D5A8"; FR = 30; DUR = 13.0; S = "/tmp/ms"; os.makedirs(S, exist_ok=True)
def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: print("ERR", r.stderr[-500:]); raise SystemExit(1)
def esc(t): return t.replace("'", "").replace(":", " ").replace("%", " Prozent").replace(",", "")
try: price = json.load(urllib.request.urlopen(f"https://luxestyle.ch/products/{handle}.json", timeout=15))["product"]["variants"][0]["price"]
except Exception: price = ""
prx = f"CHF {price}" if price else ""
raw = f"{S}/p." + img.split(".")[-1].split("?")[0]
urllib.request.urlretrieve(img, raw)
# Musik: elegant aus music_library, sonst house
mp = f"{S}/track.wav"
subprocess.run(["/opt/node22/bin/node" if os.path.exists("/opt/node22/bin/node") else "node",
                os.path.join(ROOT, "automation/music/music_library.mjs"), "pick", "--mood", "elegant", "--dur", str(int(DUR)+1), "--out", mp], capture_output=True)
if not os.path.exists(mp):
    mp = os.path.join(ROOT, "automation/music/luxe-house1.wav")
nf = int(DUR * FR)
vf = (f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=28,eq=brightness=-0.14:saturation=1.05[bg];"
      f"[0:v]scale=940:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[base];"
      f"[base]zoompan=z='min(zoom+0.0007,1.10)':d={nf}:s=1080x1920:fps={FR},"
      f"eq=contrast=1.07:saturation=1.12:brightness=0.012,curves=preset=lighter,vignette=angle=PI/4.5,"
      f"drawtext=fontfile={FS}:text='LuxeStyle.ch':fontcolor=white:fontsize=40:x=(w-tw)/2:y=80:alpha='min(1,t*1.5)',"
      f"drawtext=fontfile={FS}:text='{esc(hook)}':fontcolor=white:fontsize=66:x=(w-tw)/2:y=170:box=1:boxcolor=black@0.45:boxborderw=20:enable='lt(t,4)':alpha='if(lt(t,0.5),t*2,if(lt(t,3.5),1,(4-t)*2))',"
      f"drawtext=fontfile={FS}:text='{esc(label)}':fontcolor=white:fontsize=58:x=(w-tw)/2:y=1330:box=1:boxcolor=black@0.45:boxborderw=18:enable='gt(t,3.5)',"
      f"drawtext=fontfile={F}:text='{esc(prx)}':fontcolor={GOLD}:fontsize=56:x=(w-tw)/2:y=1410:box=1:boxcolor=black@0.5:boxborderw=14:enable='gt(t,3.5)',"
      f"drawtext=fontfile={F}:text='luxestyle.ch  WELCOME10 = 10 Prozent':fontcolor=white:fontsize=40:x=(w-tw)/2:y=1480:box=1:boxcolor=black@0.55:boxborderw=12:enable='gt(t,{DUR-4:.0f})'[v]")
af = f"afade=t=in:d=0.8,afade=t=out:st={DUR-1.5:.1f}:d=1.5,loudnorm=I=-14:TP=-1.5"
run(["ffmpeg", "-y", "-loop", "1", "-t", str(DUR), "-i", raw, "-i", mp, "-filter_complex", vf,
     "-map", "[v]", "-map", "1:a", "-t", str(DUR), "-af", af, "-c:v", "libx264", "-preset", "medium",
     "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FR), "-movflags", "+faststart", out])
print("FERTIG:", out)
