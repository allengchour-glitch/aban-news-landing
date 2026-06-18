#!/usr/bin/env python3
# LuxeStyle — finish_reel.py  (Reel-Finisher: rohe/letterboxed Clips -> Gewinner-Format)
# full-screen 9:16 (Blur-Fill, killt Letterbox) + LuxeStyle-Marke + Mundart-Hook (1. Sek, Safe-Zone)
# + CTA unten + Musik. Hebt schwache veo-Clips auf das Format, das laut Daten zieht (Preis/Mundart).
# Lauf:  python3 automation/video/finish_reel.py INPUT.mp4 "Mundart-Hook" [OUTPUT.mp4] [CHF-Preis]
import os, sys, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
inp = sys.argv[1]; hook = sys.argv[2] if len(sys.argv) > 2 else "Lueg mau das aa"
out = sys.argv[3] if len(sys.argv) > 3 else inp.rsplit(".",1)[0] + "-finish.mp4"
price = sys.argv[4] if len(sys.argv) > 4 else ""
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; FS = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
RED = "0xD52B1E"; MUSIC = os.path.join(ROOT, "automation/music/luxe-house1.wav")
def esc(t): return t.replace("'","").replace(":"," ").replace("%"," Prozent").replace(",","")
prx = f"CHF {price}" if price else ""
# Letterbox (schwarze Balken) per cropdetect ERMITTELN + wegschneiden -> sauberer Inhalt
cd = subprocess.run(["ffmpeg","-hide_banner","-ss","1","-i",inp,"-vf","cropdetect=24:2:0","-frames:v","60","-f","null","-"],capture_output=True,text=True)
crops = [l.split("crop=")[1].split(" ")[0] for l in cd.stderr.splitlines() if "crop=" in l]
CROP = ("crop="+crops[-1]+",") if crops else ""
# Blur-Fill aus dem GESCHNITTENEN Inhalt -> heller, voller BG (keine schwarzen Bänder)
vf = (f"[0:v]{CROP}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=22,eq=brightness=-0.04[bg];"
      f"[0:v]{CROP}scale=1040:-2[fg];"
      f"[bg][fg]overlay=(W-w)/2:(H-h)/2,eq=contrast=1.05:saturation=1.12,"
      f"drawbox=x=0:y=0:w=1080:h=12:color={RED}:t=fill,"
      f"drawtext=fontfile={F}:text='LuxeStyle.ch':fontcolor=white:fontsize=40:x=40:y=44:box=1:boxcolor={RED}@0.85:boxborderw=10,"
      f"drawtext=fontfile={FS}:text='{esc(hook)}':fontcolor=white:fontsize=62:x=(w-tw)/2:y=140:box=1:boxcolor=black@0.5:boxborderw=18,"
      + (f"drawtext=fontfile={F}:text='{esc(prx)}':fontcolor=0xFFE066:fontsize=54:x=(w-tw)/2:y=1330:box=1:boxcolor={RED}@0.85:boxborderw=14," if prx else "")
      + f"drawtext=fontfile={F}:text='luxestyle.ch · WELCOME10 = 10 Prozent':fontcolor=white:fontsize=42:x=(w-tw)/2:y=1440:box=1:boxcolor=black@0.55:boxborderw=14[v]")
dur = subprocess.run(["ffprobe","-v","0","-show_entries","format=duration","-of","csv=p=0",inp],capture_output=True,text=True).stdout.strip()
dur = float(dur or 8)
af = f"afade=t=in:d=0.4,afade=t=out:st={dur-1.0:.2f}:d=1.0,loudnorm=I=-14:TP=-1.5"
cmd = ["ffmpeg","-y","-i",inp]
if os.path.exists(MUSIC): cmd += ["-i",MUSIC,"-filter_complex",vf,"-map","[v]","-map","1:a","-af",af,"-shortest"]
else: cmd += ["-filter_complex",vf,"-map","[v]","-an"]
cmd += ["-c:v","libx264","-preset","veryfast","-crf","23","-pix_fmt","yuv420p","-r","30","-t",f"{dur:.2f}","-movflags","+faststart",out]
r = subprocess.run(cmd,capture_output=True,text=True)
if r.returncode: print("ERR",r.stderr[-500:]); sys.exit(1)
print("FERTIG:",out)
