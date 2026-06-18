#!/usr/bin/env python3
# LuxeStyle — luma_autopilot.py  (Luma IM GRIFF: autonom frische Produkt-Bewegungs-Reels)
# User 2026-06-17 „und Luma im Griff". EIN Befehl, end-to-end, idempotent, credit-bewusst:
#   1) Luma-Guthaben prüfen (stoppt wenn < MIN)   2) nächste N Top-Produkte ohne Luma-Reel (Ledger)
#   3) Luma img2video (ray-flash-2) je Produkt   4) zu EINEM 9:16-Reel montieren (Blur-Fill+Label+Preis+Musik)
#   5) auf Shopify-CDN laden   6) in social/video_queue.csv + Ledger eintragen
# ENV: LUMA_API_KEY (Pflicht), SHOPIFY_CLIENT_ID/SECRET (für CDN-Upload). No-op-safe.
# Lauf: LUMA_API_KEY=… SHOPIFY_CLIENT_ID=… SHOPIFY_CLIENT_SECRET=… python3 automation/video/luma_autopilot.py [N]
import os, sys, json, time, subprocess, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
NODE = "/opt/node22/bin/node" if os.path.exists("/opt/node22/bin/node") else "node"
KEY = os.environ.get("LUMA_API_KEY", "")
N = int(sys.argv[1]) if len(sys.argv) > 1 else 4
MIN_CREDITS = float(os.environ.get("LUMA_MIN_CREDITS", "200"))
LUMA = "https://api.lumalabs.ai/dream-machine/v1/generations"
LEDGER = os.path.join(HERE, "luma-done.txt")
F = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def hget(url, hdr):
    req = urllib.request.Request(url, headers=hdr); return json.load(urllib.request.urlopen(req, timeout=30))
def hpost(url, hdr, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={**hdr, "Content-Type": "application/json"}, method="POST")
    return json.load(urllib.request.urlopen(req, timeout=60))

if not KEY: print("LUMA_API_KEY fehlt → No-op."); sys.exit(0)
H = {"Authorization": "Bearer " + KEY}

# 1) Guthaben
try:
    bal = hget(LUMA.replace("/generations", "/credits"), H).get("credit_balance", 0)
except Exception as e: print("Credits-Abruf fehlgeschlagen:", e); sys.exit(0)
print(f"Luma-Guthaben: {bal:.0f} Credits")
if bal < MIN_CREDITS: print(f"< {MIN_CREDITS} → sicherheitshalber STOP (Guthaben schonen)."); sys.exit(0)

# 2) nächste N Top-Produkte ohne Luma-Reel
top = [l.split(",") for l in open(os.path.join(ROOT, "automation/top_products.csv")).read().strip().split("\n")[1:]]
done = set(open(LEDGER).read().split()) if os.path.exists(LEDGER) else set()
pick = [(r[0], r[1], r[2] if len(r) > 2 else r[0]) for r in top if r[0] not in done][:N]
if not pick: print("Alle Top-Produkte haben schon ein Luma-Reel (Ledger) → No-op."); sys.exit(0)
print(f"{len(pick)} neue Produkte:", ", ".join(p[2] for p in pick))

# Preise live
def price(handle):
    try: return json.load(urllib.request.urlopen(f"https://luxestyle.ch/products/{handle}.json", timeout=15))["product"]["variants"][0]["price"]
    except Exception: return ""

SEG = "/tmp/lumaap"; os.makedirs(SEG, exist_ok=True)
def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode != 0: print("ffmpeg ERR", r.stderr[-400:]); raise SystemExit(1)

# 3) Luma-Clips generieren + pollen
ids = []
for i, (h, img, lab) in enumerate(pick):
    body = {"prompt": "elegant slow cinematic product motion, soft luxury light, no text, no watermark",
            "model": "ray-flash-2", "resolution": "720p", "duration": "5s", "aspect_ratio": "9:16",
            "keyframes": {"frame0": {"type": "image", "url": img}}}
    try: r = hpost(LUMA, H, body); ids.append((r["id"], h, lab, price(h))); print("gen", lab, r["id"])
    except Exception as e: print("gen fail", lab, e)
    time.sleep(2)
clips = []
for rnd in range(100):
    time.sleep(15); alldone = True
    for idx, (gid, h, lab, pr) in enumerate(ids):
        cp = f"{SEG}/c{idx}.mp4"
        if os.path.exists(cp): continue
        try:
            s = hget(f"{LUMA}/{gid}", H)
            if s.get("state") == "completed" and s.get("assets", {}).get("video"):
                urllib.request.urlretrieve(s["assets"]["video"], cp); print("done", lab)
            elif s.get("state") == "failed": print("failed", lab); ids[idx] = (gid, h, lab + "__FAIL", pr)
            else: alldone = False
        except Exception: alldone = False
    if alldone: break
ready = [(idx, ids[idx]) for idx in range(len(ids)) if os.path.exists(f"{SEG}/c{idx}.mp4")]
if not ready: print("Keine Clips fertig → No-op."); sys.exit(0)

# 4) zu EINEM Reel montieren (Blur-Fill + Label + Preis + Musik)
GR = "eq=contrast=1.07:saturation=1.12:brightness=0.012,vignette=angle=PI/5"; FR = 30; DUR = 3.2
segs = []
for idx, (gid, h, lab, pr) in ready:
    o = f"{SEG}/s{idx}.mp4"; prx = (f"CHF {pr}" if pr else "")
    vf = (f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=26,eq=brightness=-0.12[bg];"
          f"[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,{GR},"
          f"drawtext=fontfile={FB}:text='LuxeStyle.ch':fontcolor=white:fontsize=40:x=(w-tw)/2:y=70:box=1:boxcolor=black@0.5:boxborderw=12,"
          f"drawtext=fontfile={FB}:text='{lab}':fontcolor=white:fontsize=50:x=(w-tw)/2:y=1360:box=1:boxcolor=black@0.5:boxborderw=18,"
          f"drawtext=fontfile={FB}:text='{prx}':fontcolor=0xE8D5A8:fontsize=46:x=(w-tw)/2:y=1440:box=1:boxcolor=black@0.5:boxborderw=14[v]")
    run(["ffmpeg","-y","-t",str(DUR),"-i",f"{SEG}/c{idx}.mp4","-filter_complex",vf,"-map","[v]","-r",str(FR),"-an","-c:v","libx264","-pix_fmt","yuv420p",o])
    segs.append(o)
inp = []; [inp.extend(["-i", s]) for s in segs]; nn = len(segs)
fc = ""; last = "[0]"; XF = 0.4; step = DUR - XF
for kk in range(1, nn): fc += f"{last}[{kk}]xfade=transition=fade:duration={XF}:offset={step*kk:.2f}[x{kk}];"; last = f"[x{kk}]"
tot = step*(nn-1)+DUR
cta = "-10%25 mit WELCOME10"
draw = (f"drawtext=fontfile={FB}:text='{cta}':fontcolor=white:fontsize=56:x=(w-tw)/2:y=1540:box=1:boxcolor=black@0.55:boxborderw=20:enable='gt(t,{tot-3.4:.2f})'")
fc = (fc[:-1] if nn > 1 else "[0]null") + (f";{last}{draw}[v]" if nn > 1 else f",{draw}[v]")
mp = "/tmp/lumaap_track.wav"
subprocess.run([NODE, os.path.join(ROOT,"automation/music/music_library.mjs"),"pick","--mood","upbeat-pop","--dur",str(int(tot)+1),"--out",mp], capture_output=True)
stamp = time.strftime("%Y%m%d-%H%M"); out = os.path.join(ROOT, f"reels/luxe-luma-{stamp}.mp4")
af = "afade=t=in:d=0.6,afade=t=out:st="+f"{tot-1.2:.2f}"+":d=1.2,loudnorm=I=-14:TP=-1.5"
if os.path.exists(mp): run(["ffmpeg","-y",*inp,"-i",mp,"-filter_complex",fc,"-map","[v]","-map",f"{nn}:a","-t",f"{tot:.2f}","-af",af,"-c:v","libx264","-pix_fmt","yuv420p","-r",str(FR),"-crf","18","-movflags","+faststart",out])
else: run(["ffmpeg","-y",*inp,"-filter_complex",fc,"-map","[v]","-t",f"{tot:.2f}","-c:v","libx264","-pix_fmt","yuv420p","-r",str(FR),"-movflags","+faststart",out])
print("Reel:", out, f"{tot:.0f}s {nn} Produkte")

# 5) CDN-Upload
url = subprocess.run([NODE, os.path.join(ROOT,"automation/upload_to_shopify_cdn.mjs"), out, "LuxeStyle Luma Reel"], capture_output=True, text=True).stdout.strip().split("\n")[-1]
if not url.startswith("https"): print("CDN-Upload fehlgeschlagen → Reel lokal:", out); sys.exit(0)
# 6) video_queue + Ledger
names = ", ".join(ids[idx][2] for idx,_ in ready)
cap = f"Neu i Bewegig ✨ {names} – live animiert. 👉 luxestyle.ch · WELCOME10 = -10% #schweizmode #ootdschweiz #luxestyle #fyp"
with open(os.path.join(ROOT,"social/video_queue.csv"),"a") as f:
    f.write(f'reel-luma-{stamp},{time.strftime("%Y-%m-%d")},{url},"{cap}",,ready,,\n')
with open(LEDGER,"a") as f:
    for idx,_ in ready: f.write(ids[idx][1] + "\n")
print("✅ In CDN + Queue:", url)
