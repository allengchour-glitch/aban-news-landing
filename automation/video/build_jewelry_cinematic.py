import subprocess, os, urllib.request, json
HERE="/home/user/aban-news-landing"; TMP="/tmp/jewel"; SEG=f"{TMP}/seg"; os.makedirs(SEG,exist_ok=True)
F="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
NODE="/opt/node22/bin/node" if os.path.exists("/opt/node22/bin/node") else "node"
# Cinematisch + edel: warmer Grade, sanfte Vignette, langsame Makro-Zooms (Schmuck = Gewinner-Kategorie 778 V)
GRADE="eq=contrast=1.06:saturation=1.10:brightness=0.015,vignette=angle=PI/4.5,unsharp=5:5:0.6"
IMGS=json.load(open("/tmp/jew_imgs.json"))
LABELS=["Herzketti «Coeur»","Ohrringe «Onyx»","Armreif «Serpent»","Ring-Set «Eternità»","Armkette «Papillon»","Kette «Stella»"]
def run(a):
    r=subprocess.run(a,capture_output=True,text=True)
    if r.returncode!=0: print("ERR",r.stderr[-600:]); raise SystemExit(1)
DUR=2.6; FR=30; d=int(DUR*FR)
ok=[]
for i,u in enumerate(IMGS):
    p=f"{SEG}/s{i}.jpg"
    try: urllib.request.urlretrieve(u,p)
    except Exception as e: print("dl fail",i,e); continue
    # langsamer, eleganter Zoom-in (cinematic)
    run(["ffmpeg","-y","-loop","1","-i",p,"-t",str(DUR),"-vf",
      f"scale=1300:2310:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0012,1.12)':d={d}:s=1080x1920:fps={FR},{GRADE},format=yuv420p",
      "-r",str(FR),"-an",f"{SEG}/c{i}.mp4"])
    ok.append(i)
n=len(ok)
inputs=[]
for i in ok: inputs+=["-i",f"{SEG}/c{i}.mp4"]
fc=""; last="[0]"; XF=0.5; step=DUR-XF
for k in range(1,n):
    fc+=f"{last}[{k}]xfade=transition=fadeblack:duration={XF}:offset={step*k:.2f}[x{k}];"
    last=f"[x{k}]"
total=step*(n-1)+DUR
brand="LuxeStyle.ch"
hook="Schwiizer Schmuck wo glänzt"
sub="S925 Silber · ab CHF 24.90"
cta="-10%25 mit WELCOME10"
cta2="luxestyle.ch"
# Produkt-Label je Segment (klein, unten, Safe-Zone y<=1450), Brand oben, Hook 1. Sek, End-CTA
labeldraw=""
for idx,k in enumerate(ok):
    s=step*idx; e=s+DUR
    lab=LABELS[k] if k<len(LABELS) else ""
    labeldraw+=f"drawtext=fontfile={F}:text='{lab}':fontcolor=white:fontsize=46:x=(w-tw)/2:y=1380:box=1:boxcolor=black@0.45:boxborderw=16:enable='between(t,{s+0.3:.2f},{e-0.3:.2f})',"
draw=(labeldraw+
 f"drawtext=fontfile={F}:text='{brand}':fontcolor=white:fontsize=40:x=(w-tw)/2:y=70:alpha=0.88:box=1:boxcolor=black@0.5:boxborderw=12,"
 f"drawtext=fontfile={F}:text='{hook}':fontcolor=white:fontsize=62:x=(w-tw)/2:y=210:box=1:boxcolor=black@0.5:boxborderw=22:enable='lt(t,2.6)',"
 f"drawtext=fontfile={F}:text='{sub}':fontcolor=0xE8D5A8:fontsize=44:x=(w-tw)/2:y=290:box=1:boxcolor=black@0.4:boxborderw=14:enable='lt(t,2.6)',"
 f"drawtext=fontfile={F}:text='{cta}':fontcolor=white:fontsize=56:x=(w-tw)/2:y=1480:box=1:boxcolor=black@0.55:boxborderw=20:enable='gt(t,{total-3.6:.2f})',"
 f"drawtext=fontfile={F}:text='{cta2}':fontcolor=0xE8D5A8:fontsize=50:x=(w-tw)/2:y=1560:box=1:boxcolor=black@0.55:boxborderw=18:enable='gt(t,{total-3.6:.2f})'")
fc=fc[:-1]+f";{last}{draw}[v]"
mp="/tmp/jewel_track.wav"
subprocess.run([NODE,f"{HERE}/automation/music/music_library.mjs","pick","--mood","elegant","--dur",str(int(total)+1),"--out",mp],capture_output=True,text=True)
out=f"{HERE}/reels/luxe-jewelry-cinematic.mp4"
if os.path.exists(mp):
    run(["ffmpeg","-y",*inputs,"-i",mp,"-filter_complex",fc,"-map","[v]","-map",f"{n}:a","-t",f"{total:.2f}",
      "-af","afade=t=in:d=0.8,afade=t=out:st="+f"{total-1.3:.2f}"+":d=1.3,loudnorm=I=-14:TP=-1.5",
      "-c:v","libx264","-pix_fmt","yuv420p","-r",str(FR),"-crf","18","-movflags","+faststart",out])
else:
    run(["ffmpeg","-y",*inputs,"-filter_complex",fc,"-map","[v]","-t",f"{total:.2f}","-c:v","libx264","-pix_fmt","yuv420p","-r",str(FR),"-movflags","+faststart",out])
print("OK",out,f"{total:.1f}s",f"{n} Schmuck",f"{os.path.getsize(out)//1024}KB")
