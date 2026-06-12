#!/usr/bin/env python3
# LuxeStyle — Bild-Posts (1080x1350 JPG) mit Text: Produktfoto + Marken-Wortmarke + Name + Preis.
# Für NEUE Produkte (Uhren + Herren-Schmuck), die noch nie gepostet wurden. Nur ffmpeg.
import subprocess, sys, os
HERE="/home/user/aban-news-landing"; OUT=f"{HERE}/social/static"; os.makedirs(OUT,exist_ok=True)
F="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
# Premium-Grade: warm, etwas Kontrast/Sättigung, Schärfe + Vignette für Fokus aufs Produkt
GRADE=("eq=contrast=1.10:saturation=1.14:brightness=0.010,"
       "unsharp=5:5:0.6:5:5:0.0,curves=r='0/0 0.5/0.52 1/1',vignette=angle=PI/4.6")

def esc(t): return t.replace(":", "\\:").replace("'", "’")
def run(a):
    r=subprocess.run(a,capture_output=True,text=True)
    if r.returncode!=0: print("ERR:",' '.join(a)[:160],"\n",r.stderr[-600:]); sys.exit(1)

def post(img, out, name, price, sub):
    n,p,s=esc(name),esc(price),esc(sub)
    # weicher Verlaufs-Scrim unten: mehrere transparente Boxen gestapelt -> sanfter Übergang
    scrim_bottom=",".join(
        f"drawbox=x=0:y={1350-h}:w=1080:h={h}:color=black@{a}:t=fill"
        for h,a in [(430,0.10),(360,0.16),(300,0.24),(240,0.34),(190,0.20)])
    scrim_top="drawbox=x=0:y=0:w=1080:h=170:color=black@0.12:t=fill,drawbox=x=0:y=0:w=1080:h=120:color=black@0.18:t=fill"
    vf=(f"scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350,setsar=1,{GRADE},"
        f"{scrim_top},{scrim_bottom},"
        # feiner Gold-Innenrahmen
        "drawbox=x=22:y=22:w=1036:h=1306:color=0xC19A5B@0.55:t=2,"
        # Wortmarke oben + Goldlinien links/rechts
        f"drawtext=fontfile={F}:text='L U X E S T Y L E':fontcolor=white@0.96:fontsize=42:x=(w-text_w)/2:y=62,"
        "drawbox=x=300:y=84:w=110:h=2:color=0xC19A5B@0.8:t=fill,"
        "drawbox=x=670:y=84:w=110:h=2:color=0xC19A5B@0.8:t=fill,"
        # Produktname + Untertitel + Gold-Trennlinie + Preis + CTA
        f"drawtext=fontfile={F}:text='{n}':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=1052:shadowcolor=black@0.7:shadowx=2:shadowy=2,"
        f"drawtext=fontfile={F}:text='{s}':fontcolor=0xF5D08A:fontsize=37:x=(w-text_w)/2:y=1126,"
        "drawbox=x=480:y=1180:w=120:h=2:color=0xC19A5B@0.7:t=fill,"
        f"drawtext=fontfile={F}:text='{p}':fontcolor=white:fontsize=66:x=(w-text_w)/2:y=1196:shadowcolor=black@0.7:shadowx=2:shadowy=2,"
        f"drawtext=fontfile={F}:text='Code WELCOME10   ·   luxestyle.ch':fontcolor=white@0.90:fontsize=33:x=(w-text_w)/2:y=1284")
    run(["ffmpeg","-y","-loglevel","error","-i",img,"-vf",vf,"-frames:v","1","-q:v","2",out])
    print("OK",out)

UH="/tmp/uhr"; MO="/tmp/more"
ITEMS=[
 (f"{UH}/herrenuhr-edelstahl.png","Herrenuhr Edelstahl","CHF 129.90","Saphirglas · 50m wasserdicht","herrenuhr-edelstahl"),
 (f"{UH}/skelettuhr-heritage.png","Automatik-Skelettuhr","CHF 99.90","mechanisch · offenes Werk","skelettuhr-heritage"),
 (f"{UH}/two-tone-business.png","Sportuhr «Pacific»","CHF 69.90","Edelstahl · GMT-Bezel mit Datum","two-tone-business-uhr-gold-silber-mit-datum"),
 (f"{UH}/damenuhr-petite.png","Damenuhr «Petite»","CHF 59.90","Perlmutt-Zifferblatt","damenuhr-petite"),
 (f"{MO}/hj-leder-anker.png","Leder-Armband «Anker»","CHF 29.90","Edelstahl · maritim","leder-anker-armband"),
 (f"{MO}/j-cuban-link.png","Cuban-Link Armband","CHF 32.90","Edelstahl · wasserfest","cuban-link-armband"),
]
for img,name,price,sub,slug in ITEMS:
    post(img,f"{OUT}/post-{slug}.jpg",name,price,sub)
print("Fertig:",len(ITEMS),"Bild-Posts")
