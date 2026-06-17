import subprocess, os, urllib.request, json
HERE="/home/user/aban-news-landing"; TMP="/tmp/hero"; SEG=f"{TMP}/seg"; os.makedirs(SEG,exist_ok=True)
F="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
NODE="/opt/node22/bin/node" if os.path.exists("/opt/node22/bin/node") else "node"
GRADE="eq=contrast=1.08:saturation=1.14:brightness=0.014,vignette=angle=PI/5"
# DAS 1 A-Video (TikTok-Pixel-Ad-Creative). Top-Produkte aus top_products.csv, schnell geschnitten,
# starker Hook 1. Sekunde, Preis-Anker, klarer CTA. Mundart-Hook (Gewinner-Format laut Gehirn).
top=[l.split(",") for l in open(f"{HERE}/automation/top_products.csv").read().strip().split("\n")[1:]]
# (label, image) — 16 stärkste, abwechslungsreiche Reihenfolge (Mode/Schmuck/Beauty/Schuhe/Tasche)
PICK=["moissanite-herzkette-coeur-s925-silber-infinity","blazer-roma-tailliert-mit-bindegurtel-revers",
 "herren-sneaker-marco-leder-optik-retro-trainer","sonnenbrille-riviera-oversize-square-mit-gold-detail",
 "silber-armreif-serpent-s925-schlangenschuppen-optik","stiletto-sandalette-gala-violett-knochelriemen",
 "statement-ohrringe-onyx-geometrisch-schwarz","stroh-shopper-capri-geflochtene-schultertasche",
 "herren-set-costa-kapuzen-shirt-jogger","ring-set-eternita-stapelbares-tropfen-ring-set-silber",
 "plateau-sneaker-cloud-spitzen-mesh-geschnurt","seidenschal-lyon-eleganter-halstuch-schal",
 "filzhut-montana-breitkrempiger-wollfilz-fedora","crossbody-tasche-lido-gewebte-color-block-bag",
 "armkette-papillon-schmetterling-rosegold-perlmutt","mini-handtasche-perla-perlen-rivet-bag"]
byname={r[0]:r for r in top}
IMGS=[byname[n][1] for n in PICK if n in byname]
def run(a):
    r=subprocess.run(a,capture_output=True,text=True)
    if r.returncode!=0: print("FFMPEG ERR:",r.stderr[-700:]); raise SystemExit(1)
DUR=1.15; FR=30; d=int(DUR*FR)
ok=[]
for i,u in enumerate(IMGS):
    p=f"{SEG}/s{i}.jpg"
    try: urllib.request.urlretrieve(u,p)
    except Exception as e: print("dl fail",i,e); continue
    z="min(zoom+0.0026,1.17)" if i%2==0 else "if(eq(on,0),1.17,max(zoom-0.0026,1.0))"
    run(["ffmpeg","-y","-loop","1","-i",p,"-t",str(DUR),"-vf",
      f"scale=1300:2310:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='{z}':d={d}:s=1080x1920:fps={FR},{GRADE},format=yuv420p",
      "-r",str(FR),"-an",f"{SEG}/c{i}.mp4"])
    ok.append(i)
n=len(ok)
inputs=[]
for i in ok: inputs+=["-i",f"{SEG}/c{i}.mp4"]
fc=""; last="[0]"; XF=0.22; step=DUR-XF
for k in range(1,n):
    fc+=f"{last}[{k}]xfade=transition=fade:duration={XF}:offset={step*k:.2f}[x{k}];"
    last=f"[x{k}]"
total=step*(n-1)+DUR
# HOOK (Mundart, 1. Sek gross) → Brand oben durchgehend → End-CTA mit Code
brand="LuxeStyle.ch"
hook1="Schwiizer Shop 🇨🇭"   # entfernt (Emoji = tofu) → siehe unten ohne Emoji
hook1="Premium-Looks. Faire Priis."
cta="-10%25 mit Code WELCOME10"
cta2="Jetz uf luxestyle.ch"
draw=(f"drawtext=fontfile={F}:text='{brand}':fontcolor=white:fontsize=42:x=(w-tw)/2:y=70:alpha=0.9:box=1:boxcolor=black@0.25:boxborderw=12,"
 f"drawtext=fontfile={F}:text='{hook1}':fontcolor=white:fontsize=56:x=(w-tw)/2:y=210:box=1:boxcolor=black@0.5:boxborderw=24:enable='lt(t,2.2)',"
 f"drawtext=fontfile={F}:text='{cta}':fontcolor=white:fontsize=60:x=(w-tw)/2:y=1300:box=1:boxcolor=black@0.55:boxborderw=24:enable='gt(t,{total-4.0:.2f})',"
 f"drawtext=fontfile={F}:text='{cta2}':fontcolor=0xC19A5B:fontsize=52:x=(w-tw)/2:y=1390:box=1:boxcolor=black@0.55:boxborderw=22:enable='gt(t,{total-4.0:.2f})'")
fc=fc[:-1]+f";{last}{draw}[v]"
mp="/tmp/hero_track.wav"
subprocess.run([NODE,f"{HERE}/automation/music/music_library.mjs","pick","--mood","upbeat-pop","--dur",str(int(total)+1),"--out",mp],capture_output=True,text=True)
out=f"{HERE}/reels/luxe-hero-ad.mp4"
if os.path.exists(mp):
    run(["ffmpeg","-y",*inputs,"-i",mp,"-filter_complex",fc,
      "-map","[v]","-map",f"{n}:a","-t",f"{total:.2f}","-af","afade=t=in:d=0.5,afade=t=out:st="+f"{total-1.2:.2f}"+":d=1.2,loudnorm=I=-14:TP=-1.5",
      "-c:v","libx264","-pix_fmt","yuv420p","-r",str(FR),"-crf","19","-movflags","+faststart",out])
else:
    run(["ffmpeg","-y",*inputs,"-filter_complex",fc,"-map","[v]","-t",f"{total:.2f}","-c:v","libx264","-pix_fmt","yuv420p","-r",str(FR),"-movflags","+faststart",out])
print("OK",out,f"{total:.1f}s",f"{n} Bilder",f"{os.path.getsize(out)//1024}KB")
