import subprocess, os, urllib.request
HERE="/home/user/aban-news-landing"; TMP="/tmp/mtgf"; SEG=f"{TMP}/seg"; os.makedirs(SEG,exist_ok=True)
F="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
NODE="/opt/node22/bin/node" if os.path.exists("/opt/node22/bin/node") else "node"
GRADE="eq=contrast=1.07:saturation=1.13:brightness=0.012,vignette=angle=PI/5"
# 24 kuratierte, saubere Produktbilder (aus good_products.csv + BigBuy-Lifestyle) — diverse Mix:
# Mode/Schmuck/Beauty/Schuhe/Taschen/Hüte/Gadget/Outdoor/Küche. Alle bereits QA'd (kein Watermark/asiat. Schrift).
IMGS=[
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/5ee0a6a3-63ee-4f7c-a0f8-ca7624c0437c.jpg?v=1780905339", # Blazer Roma
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/010b06fe-dd7e-4470-a288-9b868a06330c.jpg?v=1780901173", # Herzkette Coeur
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/8769b498-4e79-4900-bde6-9d7316ed91a3.jpg?v=1780939727", # Sneaker Marco
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/a083eb57-fe88-4722-9860-1de863c00b06.jpg?v=1780949914", # Gua-Sha Jade
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/1490603a-8052-48a8-9b70-ce25ddb3d19c_0365449e-907c-4f49-b9e0-8370f0b1a687.jpg?v=1781498735", # Sonnenbrille Riviera
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/6d3dddef-f807-44ac-9758-37c07591fe4c.jpg?v=1780944994", # Herren-Set Costa
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/bc5926c2-ee69-4dff-842b-271f3e176766.jpg?v=1780945950", # Ohrringe Onyx
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/6d900035-347b-406c-8469-181668807d25.jpg?v=1780939378", # Plateau-Sneaker Cloud
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/5265cfc5-4cdb-4f6a-b42b-a1c1c6747730.jpg?v=1781498749", # Stroh-Shopper Capri
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/faf1f652-d875-4756-8151-c68fcce5ea7f.jpg?v=1781495561", # 3D Gesichtsroller
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/19a35734-aee3-4996-99ec-d9ce9d725eef.jpg?v=1780945369", # Leinen-Set Lino
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/c187a03f-4d8f-4dfa-ba22-3da52050644c.jpg?v=1781495425", # Ring-Set Eternita
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/8725900e-5255-453d-bc8b-946f63461933.jpg?v=1781495538", # Filzhut Montana
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/ffd154c1-3d29-49c2-b507-e5b21cd1a225.jpg?v=1781498763", # Crossbody Lido
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/45240fe2-82b9-41d4-aecb-fac1e15da55c.jpg?v=1780944045", # Strickhemd Amalfi
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/1f58fc7c-1aba-4332-9df0-96b825528613.jpg?v=1781495373", # Armkette Papillon
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/32861c38-617e-4458-8226-5b2c4db04833.jpg?v=1781495475", # Seidenschal Lyon
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/8424002240493_S3063122_P20.jpg?v=1781672232", # Kupfer-Becher Mule
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/5609060097798_R20.jpg?v=1781672204", # Kaffeemaschine
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/0793661604914_S91119445_P00.jpg?v=1781669839", # Camping-Laterne
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/8427561027710_S7930257_P00.jpg?v=1781670799", # Feuerschale
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/7bf5ab15-c1f2-4d08-8f90-d80f0ffcab79.jpg?v=1780945950", # Stiletto Gala
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/f862730b-a432-4006-b9cd-8b818cc127c4.jpg?v=1781498787", # Mini-Tasche Perla
 "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/58e9722c-2090-494a-9c55-985b92e6185b.jpg?v=1780945390", # Zirkonia-Kette Stella
]
def run(a):
    r=subprocess.run(a,capture_output=True,text=True)
    if r.returncode!=0: print("FFMPEG ERR:",r.stderr[-600:]); raise SystemExit(1)
# 1) Bilder -> kurze Clips (1.2s zoompan = schneller Schnitt, mehr Bilder)
DUR=1.2; FR=30; d=int(DUR*FR)
ok=[]
for i,u in enumerate(IMGS):
    p=f"{SEG}/src{i}.jpg"
    try: urllib.request.urlretrieve(u,p)
    except Exception as e: print("dl fail",i,e); continue
    # abwechselnd rein-/raus-zoomen für Dynamik
    z="min(zoom+0.0024,1.16)" if i%2==0 else "if(eq(on,0),1.16,max(zoom-0.0024,1.0))"
    run(["ffmpeg","-y","-loop","1","-i",p,"-t",str(DUR),"-vf",
      f"scale=1300:2310:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='{z}':d={d}:s=1080x1920:fps={FR},{GRADE},format=yuv420p",
      "-r",str(FR),"-an",f"{SEG}/c{i}.mp4"])
    ok.append(i)
n=len(ok)
# 2) xfade-Chain (0.25s schnelle Übergänge)
inputs=[]
for i in ok: inputs+=["-i",f"{SEG}/c{i}.mp4"]
fc=""; last="[0]"; XF=0.25; step=DUR-XF
for k in range(1,n):
    off=step*k
    fc+=f"{last}[{k}]xfade=transition=fade:duration={XF}:offset={off:.2f}[x{k}];"
    last=f"[x{k}]"
total=step*(n-1)+DUR
hook="Viu Style. Eis Shop."
brand="LuxeStyle.ch"
cta="luxestyle.ch   -10%25 mit WELCOME10"
draw=(f"drawtext=fontfile={F}:text='{brand}':fontcolor=white:fontsize=40:x=(w-tw)/2:y=70:alpha=0.85:box=1:boxcolor=black@0.5:boxborderw=12,"
 f"drawtext=fontfile={F}:text='{hook}':fontcolor=white:fontsize=72:x=(w-tw)/2:y=230:box=1:boxcolor=black@0.45:boxborderw=22:enable='lt(t,2.4)',"
 f"drawtext=fontfile={F}:text='{cta}':fontcolor=white:fontsize=56:x=(w-tw)/2:y=1380:box=1:boxcolor=black@0.5:boxborderw=24:enable='gt(t,{total-3.4:.2f})'")
fc=fc[:-1]+f";{last}{draw}[v]"
# 3) Musik (upbeat → passt zum schnellen Schnitt)
mp="/tmp/mtgf_track.wav"
subprocess.run([NODE,f"{HERE}/automation/music/music_library.mjs","pick","--mood","upbeat-pop","--dur",str(int(total)+1),"--out",mp],capture_output=True,text=True)
out=f"{HERE}/reels/luxe-showcase-fast.mp4"
if os.path.exists(mp):
    run(["ffmpeg","-y",*inputs,"-i",mp,"-filter_complex",fc,
      "-map","[v]","-map",f"{n}:a","-t",f"{total:.2f}","-af","afade=t=in:d=0.6,afade=t=out:st="+f"{total-1.2:.2f}"+":d=1.2,loudnorm=I=-14:TP=-1.5",
      "-c:v","libx264","-pix_fmt","yuv420p","-r",str(FR),"-movflags","+faststart",out])
else:
    run(["ffmpeg","-y",*inputs,"-filter_complex",fc,"-map","[v]","-t",f"{total:.2f}","-c:v","libx264","-pix_fmt","yuv420p","-r",str(FR),"-movflags","+faststart",out])
print("OK",out,f"{total:.1f}s",f"{n} Bilder",f"{os.path.getsize(out)//1024}KB")
