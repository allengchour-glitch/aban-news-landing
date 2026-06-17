import subprocess, os, json
HERE="/home/user/aban-news-landing"; SEG="/tmp/flag/seg"; os.makedirs(SEG,exist_ok=True)
F="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; FI="/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
NODE="/opt/node22/bin/node"
GRADE="eq=contrast=1.07:saturation=1.12:brightness=0.012,vignette=angle=PI/5"
# 8 vorhandene Luma-Clips (wiederverwendet = 0 neue Credits), abwechslungsreiche Reihenfolge.
CLIPS=[
 ("/tmp/ult/c0.mp4","Moissanite-Herzkette «Coeur»","CHF 119.90"),
 ("/tmp/fash/c0.mp4","Leinen-Set «Lino»","CHF 59.90"),
 ("/tmp/ult/c3.mp4","Stiletto-Sandalette «Gala»","CHF 54.90"),
 ("/tmp/fash/c1.mp4","Seidenschal «Lyon»","CHF 12.90"),
 ("/tmp/ult/c1.mp4","Blazer «Roma»","CHF 49.90"),
 ("/tmp/fash/c2.mp4","Plateau-Sneaker «Cloud»","CHF 39.90"),
 ("/tmp/ult/c2.mp4","Crossbody «Lido»","CHF 12.90"),
 ("/tmp/fash/c3.mp4","Filzhut «Montana»","CHF 12.90"),
]
def run(a):
    r=subprocess.run(a,capture_output=True,text=True)
    if r.returncode!=0: print("ERR",r.stderr[-700:]); raise SystemExit(1)
FR=30; CLIPDUR=3.0; CARD=2.6
segs=[]
# Intro-Karte
intro=f"{SEG}/intro.mp4"
run(["ffmpeg","-y","-f","lavfi","-i",f"color=c=0x141414:s=1080x1920:d={CARD}","-vf",
 f"drawtext=fontfile={FI}:text='LuxeStyle':fontcolor=white:fontsize=110:x=(w-tw)/2:y=760,"
 f"drawtext=fontfile={F}:text='Schwiizer Premium · Sommer 2026':fontcolor=0xE8D5A8:fontsize=44:x=(w-tw)/2:y=900,"
 f"format=yuv420p","-r",str(FR),intro]); segs.append(intro)
# Produkt-Clips (Blur-Fill + Label + Brand, Kontrast black@0.5)
for i,(src,lab,pr) in enumerate(CLIPS):
    if not os.path.exists(src): continue
    o=f"{SEG}/p{i}.mp4"
    vf=(f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=26,eq=brightness=-0.12[bg];"
        f"[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,{GRADE},"
        f"drawtext=fontfile={F}:text='LuxeStyle.ch':fontcolor=white:fontsize=40:x=(w-tw)/2:y=70:box=1:boxcolor=black@0.5:boxborderw=12,"
        f"drawtext=fontfile={F}:text='{lab}':fontcolor=white:fontsize=50:x=(w-tw)/2:y=1360:box=1:boxcolor=black@0.5:boxborderw=18,"
        f"drawtext=fontfile={F}:text='{pr}':fontcolor=0xE8D5A8:fontsize=46:x=(w-tw)/2:y=1440:box=1:boxcolor=black@0.5:boxborderw=14[v]")
    run(["ffmpeg","-y","-t",str(CLIPDUR),"-i",src,"-filter_complex",vf,"-map","[v]","-r",str(FR),"-an","-c:v","libx264","-pix_fmt","yuv420p",o])
    segs.append(o)
# Outro-Karte
outro=f"{SEG}/outro.mp4"
run(["ffmpeg","-y","-f","lavfi","-i",f"color=c=0x141414:s=1080x1920:d={CARD}","-vf",
 f"drawtext=fontfile={FI}:text='Jetz entdecke':fontcolor=white:fontsize=80:x=(w-tw)/2:y=720,"
 f"drawtext=fontfile={F}:text='luxestyle.ch':fontcolor=0xE8D5A8:fontsize=64:x=(w-tw)/2:y=880,"
 f"drawtext=fontfile={F}:text='-10%25 mit Code WELCOME10':fontcolor=white:fontsize=46:x=(w-tw)/2:y=1000,"
 f"format=yuv420p","-r",str(FR),outro]); segs.append(outro)
# xfade-Chain
inputs=[]
for s in segs: inputs+=["-i",s]
n=len(segs); fc=""; last="[0]"; XF=0.4
durs=[CARD]+[CLIPDUR]*(n-2)+[CARD]
off=0.0
for k in range(1,n):
    off+=durs[k-1]-XF
    fc+=f"{last}[{k}]xfade=transition=fade:duration={XF}:offset={off:.2f}[x{k}];"
    last=f"[x{k}]"
total=sum(durs)-XF*(n-1)
fc=fc[:-1]+f";{last}null[v]"
mp="/tmp/flag_track.wav"
subprocess.run([NODE,f"{HERE}/automation/music/music_library.mjs","pick","--mood","elegant","--dur",str(int(total)+1),"--out",mp],capture_output=True,text=True)
out=f"{HERE}/reels/luxe-flagship-film.mp4"
if os.path.exists(mp):
    run(["ffmpeg","-y",*inputs,"-i",mp,"-filter_complex",fc,"-map","[v]","-map",f"{n}:a","-t",f"{total:.2f}",
      "-af","afade=t=in:d=0.8,afade=t=out:st="+f"{total-1.3:.2f}"+":d=1.3,loudnorm=I=-14:TP=-1.5",
      "-c:v","libx264","-pix_fmt","yuv420p","-r",str(FR),"-crf","18","-movflags","+faststart",out])
else:
    run(["ffmpeg","-y",*inputs,"-filter_complex",fc,"-map","[v]","-t",f"{total:.2f}","-c:v","libx264","-pix_fmt","yuv420p","-r",str(FR),"-movflags","+faststart",out])
print("OK",out,f"{total:.1f}s",f"{n-2} Produkte",f"{os.path.getsize(out)//1024}KB")
