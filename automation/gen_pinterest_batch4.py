#!/usr/bin/env python3
import re, io, json, urllib.request, os
from PIL import Image, ImageDraw, ImageFont, ImageOps
OUT="/tmp/pins4"; os.makedirs(OUT,exist_ok=True)
W,H,IMG_H=1000,1500,950
FB="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; FR="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
f_brand=ImageFont.truetype(FB,34); f_title=ImageFont.truetype(FB,50); f_sub=ImageFont.truetype(FR,28)
f_price=ImageFont.truetype(FB,60); f_promo=ImageFont.truetype(FB,30)
ACCENT,INK="#e8b923","#111111"
BOARD=("Home & Geschenkideen","#geschenkidee #gadget #schweiz #geschenk #homedecor","geschenkidee, gadget, geschenke schweiz")
B="https://cdn.shopify.com/s/files/1/0943/6856/3585/files/"
P=[
 ("smartwatch-pro-1-78-amoled-herzfrequenz-fitness-tracker-bluetooth","Smartwatch Pro 1.78″ AMOLED · Fitness & Bluetooth","69.9",B+"8e617793-8686-478b-88fd-5e68e5702df9.jpg"),
 ("rugged-smartwatch-x5-5-atm-wasserdicht-gps-bluetooth-calling","Rugged Smartwatch X5 · 5 ATM, GPS, Calling","79.9",B+"26d6b504-c1ad-482e-b33a-743d657b94aa.jpg"),
 ("12-in-1-multitool-klappbares-edelstahl-werkzeug-mit-schraubendreher-bits","12-in-1 Multitool · klappbar, Edelstahl","34.9",B+"2c18e1ac-2846-4520-b325-71ed81fda91c.jpg"),
 ("panda-handyhalter-susser-schreibtisch-stander-fur-smartphones","Panda Handyhalter · süsser Schreibtisch-Ständer","14.9",B+"a06fd21f-32ae-4a68-82a4-4e0efe8c3853_trans.jpg"),
 ("roboter-mini-ventilator-usb-tischventilator-mit-digitalanzeige-leise","Roboter Mini-Ventilator · USB, Digitalanzeige","19.9",B+"54af95a7-c314-4146-885b-78b188722d20_trans.jpg"),
 ("bausteine-set-widebody-racer-321-teile","Bausteine-Set «Widebody Racer» · 321 Teile","42.9",B+"26bb171b-a810-4215-8092-b9999a608337.jpg"),
 ("bausteine-set-police-racer-318-teile","Bausteine-Set «Police Racer» · 318 Teile","39.9",B+"53e5871c-ef53-4086-8a63-943cac34b9b9.jpg"),
 ("bausteine-set-retro-racer-196-teile-sportwagen","Bausteine-Set «Retro Racer» · 196 Teile, Sportwagen","36.9",B+"6c18b2ea-bfaa-46ee-9b20-636e9e750d62.jpg"),
 ("spielzeug-fahrzeuge-set-feuerwehr-bau-polizei-fur-kids","Spielzeug-Fahrzeuge Set · Feuerwehr, Bau, Polizei","9.9",B+"f465fd4a-6b06-415a-82b1-398a781463ba.jpg"),
]
def slug(s): return re.sub(r"[^a-z0-9]+","-",s.lower()).strip("-")[:55]
def wrap(d,t,f,m):
    out,cur=[],""
    for w in t.split():
        x=(cur+" "+w).strip()
        if d.textlength(x,font=f)<=m: cur=x
        else:
            if cur: out.append(cur)
            cur=w
    if cur: out.append(cur)
    return out[:2]
def parse(full):
    full=full.split("|")[0].strip()
    for sep in ["—","–"," - ","·"]:
        if sep in full: h,s=full.split(sep,1); return h.strip(),s.strip()
    return full,""
meta=[]
for i,(handle,title,price,img) in enumerate(P,1):
    board,tags,kw=BOARD; price_s=f"CHF {float(price):.2f}"
    name=re.sub(r"\s*\([^)]*\)","",title).strip()
    pin_title=(name+" | LuxeStyle CH")[:100]
    desc=f"{name} 🎁 Schweizer Online-Shop, weltweiter Versand. {price_s} — −10% mit Code WELCOME10. {tags}"[:480]
    link=f"https://luxestyle.ch/products/{handle}"; fn=f"d-{i:02d}-{slug(name)}.jpg"
    try:
        req=urllib.request.Request(img,headers={"User-Agent":"Mozilla/5.0"})
        im=Image.open(io.BytesIO(urllib.request.urlopen(req,timeout=40).read())).convert("RGB")
    except Exception as e:
        print(f"  WARN {fn} {e}"); continue
    im=ImageOps.fit(im,(W,IMG_H),centering=(0.5,0.4))
    c=Image.new("RGB",(W,H),"#fff"); c.paste(im,(0,0)); d=ImageDraw.Draw(c)
    d.rectangle([0,0,W,70],fill=INK); d.text((40,18),"LUXESTYLE  ·  luxestyle.ch",font=f_brand,fill="#fff")
    d.rectangle([0,IMG_H,W,H],fill="#fff"); head,sub=parse(name); y=IMG_H+45
    for ln in wrap(d,head,f_title,W-80): d.text((40,y),ln,font=f_title,fill=INK); y+=58
    if sub:
        for ln in wrap(d,sub,f_sub,W-80)[:1]: d.text((40,y+4),ln,font=f_sub,fill="#555"); y+=40
    y+=20; d.text((40,y),price_s,font=f_price,fill=INK); y+=90
    pill="−10% mit Code WELCOME10"; pw=d.textlength(pill,font=f_promo)
    d.rounded_rectangle([40,y,40+pw+60,y+60],radius=30,fill=ACCENT); d.text((70,y+13),pill,font=f_promo,fill=INK)
    d.text((40,H-70),"Schweizer Online-Shop · weltweiter Versand",font=f_sub,fill="#777")
    c.save(os.path.join(OUT,fn),quality=88)
    meta.append({"file":fn,"title":pin_title,"board":board,"desc":desc,"link":link,"kw":kw})
    print(f"  OK {fn}")
json.dump(meta,open("/tmp/batch_meta4.json","w"),ensure_ascii=False)
print(f"{len(meta)} gerendert.")
