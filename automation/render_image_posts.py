#!/usr/bin/env python3
# LuxeStyle — Bild-Posts (1080x1350 JPG) mit Text: Produktfoto + Marken-Wortmarke + Name + Preis.
# Für NEUE Produkte (Uhren + Herren-Schmuck), die noch nie gepostet wurden. Nur ffmpeg.
import subprocess, sys, os
HERE="/home/user/aban-news-landing"; OUT=f"{HERE}/social/static"; os.makedirs(OUT,exist_ok=True)
F="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
GRADE="eq=contrast=1.08:saturation=1.12:brightness=0.012,unsharp=5:5:0.5:5:5:0.0"

def esc(t): return t.replace(":", "\\:").replace("'", "’")
def run(a):
    r=subprocess.run(a,capture_output=True,text=True)
    if r.returncode!=0: print("ERR:",' '.join(a)[:160],"\n",r.stderr[-600:]); sys.exit(1)

def post(img, out, name, price, sub):
    n,p,s=esc(name),esc(price),esc(sub)
    vf=(f"scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350,setsar=1,{GRADE},"
        # obere + untere Scrims
        "drawbox=x=0:y=0:w=1080:h=180:color=black@0.34:t=fill,"
        "drawbox=x=0:y=1010:w=1080:h=340:color=black@0.46:t=fill,"
        # Wortmarke oben + Goldlinie
        f"drawtext=fontfile={F}:text='L U X E S T Y L E':fontcolor=white@0.95:fontsize=44:x=(w-text_w)/2:y=64,"
        "drawbox=x=440:y=124:w=200:h=3:color=0xC19A5B:t=fill,"
        # Produktname (gross) + Untertitel + Preis-Pill + CTA
        f"drawtext=fontfile={F}:text='{n}':fontcolor=white:fontsize=58:x=(w-text_w)/2:y=1060:shadowcolor=black:shadowx=2:shadowy=2,"
        f"drawtext=fontfile={F}:text='{s}':fontcolor=0xF5D08A:fontsize=38:x=(w-text_w)/2:y=1132,"
        f"drawtext=fontfile={F}:text='{p}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=1186:shadowcolor=black:shadowx=2:shadowy=2,"
        f"drawtext=fontfile={F}:text='Code WELCOME10  ·  luxestyle.ch':fontcolor=white@0.92:fontsize=34:x=(w-text_w)/2:y=1272")
    run(["ffmpeg","-y","-loglevel","error","-i",img,"-vf",vf,"-frames:v","1","-q:v","3",out])
    print("OK",out)

UH="/tmp/uhr"; MO="/tmp/more"
ITEMS=[
 (f"{UH}/herrenuhr-edelstahl.png","Herrenuhr Edelstahl","CHF 129.90","Saphirglas · 50m wasserdicht","herrenuhr-edelstahl"),
 (f"{UH}/skelettuhr-heritage.png","Automatik-Skelettuhr","CHF 99.90","mechanisch · offenes Werk","skelettuhr-heritage"),
 (f"{UH}/chronograph-aviator.png","Chronograph «Aviator»","CHF 79.90","Lederband · Piloten-Look","chronograph-aviator"),
 (f"{UH}/damenuhr-petite.png","Damenuhr «Petite»","CHF 59.90","Perlmutt-Zifferblatt","damenuhr-petite"),
 (f"{MO}/hj-leder-anker.png","Leder-Armband «Anker»","CHF 29.90","Edelstahl · maritim","leder-anker-armband"),
 (f"{MO}/j-cuban-link.png","Cuban-Link Armband","CHF 32.90","Edelstahl · wasserfest","cuban-link-armband"),
]
for img,name,price,sub,slug in ITEMS:
    post(img,f"{OUT}/post-{slug}.jpg",name,price,sub)
print("Fertig:",len(ITEMS),"Bild-Posts")
