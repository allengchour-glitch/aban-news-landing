import subprocess, os, json
HERE="/home/user/aban-news-landing"; SEG="/tmp/ult/seg"; os.makedirs(SEG,exist_ok=True)
F="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
NODE="/opt/node22/bin/node"
ids=json.load(open("/tmp/ult_ids.json"))  # [{id,label,price}] in clip order c0..c3
GRADE="eq=contrast=1.07:saturation=1.12:brightness=0.012,vignette=angle=PI/5"
def run(a):
    r=subprocess.run(a,capture_output=True,text=True)
    if r.returncode!=0: print("ERR",r.stderr[-700:]); raise SystemExit(1)
DUR=3.6; FR=30
segs=[]
for i,it in enumerate(ids):
    src=f"/tmp/ult/c{i}.mp4"
    if not os.path.exists(src): continue
    lab=it["label"]; pr=("CHF "+it["price"]) if it.get("price") else ""
    # 1024² → 1080x1920 mit Blur-Fill (ganzes Produkt sichtbar) + Grade + Label unten (Safe-Zone)
    vf=(f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=26,eq=brightness=-0.12[bg];"
        f"[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,{GRADE},"
        f"drawtext=fontfile={F}:text='{lab}':fontcolor=white:fontsize=52:x=(w-tw)/2:y=1360:box=1:boxcolor=black@0.5:boxborderw=18,"
        f"drawtext=fontfile={F}:text='{pr}':fontcolor=0xE8D5A8:fontsize=46:x=(w-tw)/2:y=1440:box=1:boxcolor=black@0.45:boxborderw=14[v]")
    out=f"{SEG}/s{i}.mp4"
    run(["ffmpeg","-y","-t",str(DUR),"-i",src,"-filter_complex",vf,"-map","[v]","-r",str(FR),"-an",
         "-c:v","libx264","-pix_fmt","yuv420p",out])
    segs.append(out)
n=len(segs)
inputs=[]
for s in segs: inputs+=["-i",s]
fc=""; last="[0]"; XF=0.4; step=DUR-XF
for k in range(1,n):
    fc+=f"{last}[{k}]xfade=transition=fade:duration={XF}:offset={step*k:.2f}[x{k}];"
    last=f"[x{k}]"
total=step*(n-1)+DUR
brand="LuxeStyle.ch"; hook="Premium-Looks i Bewegig"; cta="-10%25 mit WELCOME10"; cta2="luxestyle.ch"
draw=(f"drawtext=fontfile={F}:text='{brand}':fontcolor=white:fontsize=42:x=(w-tw)/2:y=70:alpha=0.9:box=1:boxcolor=black@0.25:boxborderw=12,"
 f"drawtext=fontfile={F}:text='{hook}':fontcolor=white:fontsize=60:x=(w-tw)/2:y=200:box=1:boxcolor=black@0.5:boxborderw=22:enable='lt(t,2.6)',"
 f"drawtext=fontfile={F}:text='{cta}':fontcolor=white:fontsize=58:x=(w-tw)/2:y=1540:box=1:boxcolor=black@0.55:boxborderw=20:enable='gt(t,{total-3.6:.2f})',"
 f"drawtext=fontfile={F}:text='{cta2}':fontcolor=0xE8D5A8:fontsize=50:x=(w-tw)/2:y=1620:box=1:boxcolor=black@0.55:boxborderw=18:enable='gt(t,{total-3.6:.2f})'")
fc=fc[:-1]+f";{last}{draw}[v]"
mp="/tmp/ult_track.wav"
subprocess.run([NODE,f"{HERE}/automation/music/music_library.mjs","pick","--mood","upbeat-pop","--dur",str(int(total)+1),"--out",mp],capture_output=True,text=True)
out=f"{HERE}/reels/luxe-ultimate-ad.mp4"
if os.path.exists(mp):
    run(["ffmpeg","-y",*inputs,"-i",mp,"-filter_complex",fc,"-map","[v]","-map",f"{n}:a","-t",f"{total:.2f}",
      "-af","afade=t=in:d=0.6,afade=t=out:st="+f"{total-1.2:.2f}"+":d=1.2,loudnorm=I=-14:TP=-1.5",
      "-c:v","libx264","-pix_fmt","yuv420p","-r",str(FR),"-crf","18","-movflags","+faststart",out])
else:
    run(["ffmpeg","-y",*inputs,"-filter_complex",fc,"-map","[v]","-t",f"{total:.2f}","-c:v","libx264","-pix_fmt","yuv420p","-r",str(FR),"-movflags","+faststart",out])
print("OK",out,f"{total:.1f}s",f"{n} Luma-Clips",f"{os.path.getsize(out)//1024}KB")
