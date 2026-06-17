import subprocess, os, urllib.request
HERE="/home/user/aban-news-landing"; TMP="/tmp/mtg"; SEG=f"{TMP}/seg"; os.makedirs(SEG,exist_ok=True)
F="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
NODE="/opt/node22/bin/node" if os.path.exists("/opt/node22/bin/node") else "node"
GRADE="eq=contrast=1.07:saturation=1.12:brightness=0.012,vignette=angle=PI/5"
IMGS=[
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S64222836_P00.jpg?v=1781709590",
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S64221639_P00.jpg?v=1781709620",
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/8424002240493_S3063122_P20.jpg?v=1781672232",
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/5609060097798_R20.jpg?v=1781672204",
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/8412842621862_S8901241_P01.jpg?v=1781670818",
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/8427561027710_S7930257_P00.jpg?v=1781670799",
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/0793661604914_S91119445_P00.jpg?v=1781669839",
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/4011391203105_M1206314_P00.jpg?v=1781690146",
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/3165140901239_S7109576_P00.jpg?v=1781691312",
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/8008004089009_00.jpg?v=1781652622",
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/a083eb57-fe88-4722-9860-1de863c00b06.jpg?v=1780949914",
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/8769b498-4e79-4900-bde6-9d7316ed91a3.jpg?v=1780939727",
]
def run(a):
    r=subprocess.run(a,capture_output=True,text=True)
    if r.returncode!=0: print("FFMPEG ERR:",r.stderr[-600:]); raise SystemExit(1)
# 1) Bilder -> Clips (2.4s zoompan)
DUR=2.4; FR=30; d=int(DUR*FR)
for i,u in enumerate(IMGS):
    p=f"{SEG}/src{i}.jpg"
    try: urllib.request.urlretrieve(u,p)
    except Exception as e: print("dl fail",i,e); continue
    run(["ffmpeg","-y","-loop","1","-i",p,"-t",str(DUR),"-vf",
      f"scale=1300:2310:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0016,1.13)':d={d}:s=1080x1920:fps={FR},{GRADE},format=yuv420p",
      "-r",str(FR),"-an",f"{SEG}/c{i}.mp4"])
n=len([i for i in range(len(IMGS)) if os.path.exists(f"{SEG}/c{i}.mp4")])
# 2) xfade-Chain
inputs=[]; 
for i in range(n): inputs+=["-i",f"{SEG}/c{i}.mp4"]
fc=""; last="[0]"; off=0.0; XF=0.4; step=DUR-XF
for i in range(1,n):
    off=step*i
    fc+=f"{last}[{i}]xfade=transition=fade:duration={XF}:offset={off:.2f}[x{i}];"
    last=f"[x{i}]"
total=step*(n-1)+DUR
# Text: Hook (0-2.5s), Brand oben durchgehend, End-CTA (letzte 3.5s)
hook="Neu im Shop  Summer 2026"
brand="LuxeStyle.ch"
cta="luxestyle.ch   -10%25 mit WELCOME10"
draw=(f"drawtext=fontfile={F}:text='{brand}':fontcolor=white:fontsize=40:x=(w-tw)/2:y=70:alpha=0.85:box=1:boxcolor=black@0.5:boxborderw=12,"
 f"drawtext=fontfile={F}:text='{hook}':fontcolor=white:fontsize=70:x=(w-tw)/2:y=230:box=1:boxcolor=black@0.45:boxborderw=22:enable='lt(t,2.6)',"
 f"drawtext=fontfile={F}:text='{cta}':fontcolor=white:fontsize=58:x=(w-tw)/2:y=1380:box=1:boxcolor=black@0.5:boxborderw=24:enable='gt(t,{total-3.6:.2f})'")
fc=fc[:-1]+f";{last}{draw}[v]"
# 3) Musik
mp="/tmp/mtg_track.wav"
subprocess.run([NODE,f"{HERE}/automation/music/music_library.mjs","pick","--mood","upbeat-pop","--dur",str(int(total)+1),"--out",mp],capture_output=True,text=True)
out=f"{HERE}/reels/luxe-main-showcase.mp4"
if os.path.exists(mp):
    run(["ffmpeg","-y",*inputs,"-i",mp,"-filter_complex",fc,
      "-map","[v]","-map",f"{n}:a","-t",f"{total:.2f}","-af","afade=t=in:d=0.6,afade=t=out:st="+f"{total-1.2:.2f}"+":d=1.2,loudnorm=I=-14:TP=-1.5",
      "-c:v","libx264","-pix_fmt","yuv420p","-r",str(FR),"-movflags","+faststart",out])
else:
    run(["ffmpeg","-y",*inputs,"-filter_complex",fc,"-map","[v]","-t",f"{total:.2f}","-c:v","libx264","-pix_fmt","yuv420p","-r",str(FR),"-movflags","+faststart",out])
print("OK",out,f"{total:.1f}s",f"{os.path.getsize(out)//1024}KB")
