#!/usr/bin/env python3
import io, urllib.request, os
from PIL import Image, ImageDraw, ImageFont, ImageOps
OUT="/tmp/cats"; os.makedirs(OUT, exist_ok=True)
W,H=1600,620
FB="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; FR="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
B="https://cdn.shopify.com/s/files/1/0943/6856/3585/files/"
ACCENT="#e8b923"
# (handle, dateiname, Titel, Subtitel, bg-image)
CATS=[
 ("damen-mode","cat-frauen","Frauen","Sommer-Mode 2026 — Premium-Looks für jeden Auftritt",B+"ce596d7a-cd30-4d15-b583-27ef01b1b0f6.jpg"),
 ("fur-ihn","cat-herren","Herren","Sommer-Styles für ihn — clean, bequem, zeitlos",B+"6d3dddef-f807-44ac-9758-37c07591fe4c.jpg"),
 ("premium-schmuck","cat-schmuck","Schmuck","Eleganter Schmuck — Silber, Zirkonia & Perlen",B+"58e9722c-2090-494a-9c55-985b92e6185b.jpg"),
 ("schuhe","cat-schuhe","Schuhe","Sandalen, Sneaker & Pumps für den Sommer",B+"a27b989a-1ebd-43c0-b09c-09286027283d.jpg"),
 ("wohnen-dekoration","cat-wohnen","Wohnen & Wellness","Deko, Düfte & Self-Care fürs Zuhause",B+"44002d9d-527a-4e67-b382-24a84ba4c2ed_trans.jpg"),
 ("premium-beauty","cat-beauty","Beauty","Skincare & Beauty-Tools für deinen Glow",B+"a083eb57-fe88-4722-9860-1de863c00b06.jpg"),
 ("trends-gadgets","cat-trends","Trends & Gadgets","Die viralen Lieblinge 2026",B+"8e617793-8686-478b-88fd-5e68e5702df9.jpg"),
 ("premium-geschenke","cat-geschenke","Geschenke","Geschenkideen, die Freude machen",B+"0e0a337f-2279-43b7-965b-fdc556bfc02e.jpg"),
 ("unter-chf-25","cat-sale","Sale","Lieblingsstücke unter CHF 25",B+"7c1bde0e-bcba-4105-84cf-2cf8c253a2d3.jpg"),
]
def banner(title,sub,bgurl,path):
    req=urllib.request.Request(bgurl,headers={"User-Agent":"Mozilla/5.0"})
    src=Image.open(io.BytesIO(urllib.request.urlopen(req,timeout=40).read())).convert("RGB")
    img=ImageOps.fit(src,(W,H),centering=(0.5,0.33))
    ov=Image.new("L",(W,H),0); d=ImageDraw.Draw(ov)
    for x in range(W):
        a=int(170*max(0,(1-(x/(W*0.64)))))
        d.line([(x,0),(x,H)],fill=a)
    img=Image.composite(Image.new("RGB",(W,H),(28,24,20)),img,ov)
    d=ImageDraw.Draw(img)
    d.text((70,80),"LUXESTYLE · SCHWEIZ",font=ImageFont.truetype(FB,26),fill="#e8d9c5")
    # Titel ggf. kleiner wenn lang
    tsize=96 if len(title)<=14 else 72
    d.text((68,150 if tsize==96 else 165),title,font=ImageFont.truetype(FB,tsize),fill="#ffffff")
    d.text((72,270),sub,font=ImageFont.truetype(FR,30),fill="#f2e9dc")
    bx,by=72,344; lbl="Jetzt entdecken  →"; f=ImageFont.truetype(FB,28)
    w=d.textlength(lbl,font=f)
    d.rounded_rectangle([bx,by,bx+w+56,by+62],radius=31,fill=ACCENT)
    d.text((bx+28,by+15),lbl,font=f,fill="#1c1814")
    d.rectangle([0,H-8,W,H],fill="#8b7355")
    img.save(path,quality=88)
meta=[]
for handle,fn,title,sub,bg in CATS:
    p=os.path.join(OUT,fn+".jpg")
    try:
        banner(title,sub,bg,p); meta.append((handle,fn+".jpg",title)); print("  OK",fn)
    except Exception as e:
        print("  WARN",fn,e)
import json; json.dump(meta,open("/tmp/cats_meta.json","w"),ensure_ascii=False)
print(len(meta),"Banner gerendert")
