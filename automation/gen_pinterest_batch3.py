#!/usr/bin/env python3
import re, io, json, urllib.request, os
from PIL import Image, ImageDraw, ImageFont, ImageOps
OUT="/tmp/pins3"; os.makedirs(OUT,exist_ok=True)
W,H,IMG_H=1000,1500,950
FB="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; FR="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
f_brand=ImageFont.truetype(FB,34); f_title=ImageFont.truetype(FB,50); f_sub=ImageFont.truetype(FR,28)
f_price=ImageFont.truetype(FB,60); f_promo=ImageFont.truetype(FB,30)
ACCENT,INK="#e8b923","#111111"
BOARD={
 "shoe": ("Schuhe & Sandalen","#schuhe #sommerschuhe #shoes #schweiz","damenschuhe, sommerschuhe, schuhe"),
 "men":  ("Herrenmode Schweiz","#herrenmode #menstyle #schweiz #menswear","herrenmode, menstyle, herren"),
 "jewel":("Schmuck & Accessoires","#schmuck #jewelry #schweiz #accessoires","schmuck, damenschmuck, accessoires"),
 "beauty":("Wellness & Beauty","#selfcare #beauty #wellness #schweiz #skincare","selfcare, beauty, wellness"),
 "home": ("Home & Geschenkideen","#homedeko #geschenkidee #schweiz #interior #homedecor","home deko, geschenkidee, interior"),
}
B="https://cdn.shopify.com/s/files/1/0943/6856/3585/files/"
P=[
 ("stiletto-sandalette-gala-violett-knochelriemen","Stiletto-Sandalette «Gala» · Violett, Knöchelriemen","54.9",B+"7bf5ab15-c1f2-4d08-8f90-d80f0ffcab79.jpg","shoe"),
 ("zehensteg-sandalen-riva-flach-mit-metall-detail","Zehensteg-Sandalen «Riva» · flach, Metall-Detail","24.9",B+"6a21a0c4-4f98-40b9-8932-5b73b39a4418.jpg","shoe"),
 ("loafer-damen-rundkappe-flach-vielseitig-basic-2026","Loafer · Rundkappe flach, vielseitig","27.9",B+"e71f990b-323e-4913-bac5-64e3655fc3e8.jpg","shoe"),
 ("slingback-pumps-damen-mit-absatz-wasserfest-beschichtet-elegant-2026","Slingback-Pumps · mit Absatz, elegant","49.9",B+"cde4a79b-a7e1-464e-9439-e15c30150ee0.jpg","shoe"),
 ("plateau-sandalen-damen-retro-style-mit-komfort-sohle-sommer-2026","Plateau-Sandalen · Retro-Style, Komfort-Sohle","29.9",B+"b4da0d58-e760-4691-b348-9dc4a3d13722.jpg","shoe"),
 ("herren-laufschuhe-flyknit-atmungsaktiv-leicht-sport-alltag","Herren-Laufschuhe · Flyknit, atmungsaktiv","34.9",B+"d62058e7-0a19-4305-8ba1-27bd4338b456.jpg","men"),
 ("herren-leder-slipper-elegant-zum-reinschlupfen-business-freizeit","Herren-Leder-Slipper · elegant, zum Reinschlüpfen","54.9",B+"99ca5acf-a3c4-4d3a-aa6b-799c7d914b72.jpg","men"),
 ("acryl-ohrringe-ambre-karamell-ton-statement","Acryl-Ohrringe «Ambre» · Karamell-Ton, Statement","24.9",B+"398a97d4-7c8b-4aeb-b01d-34bd73a71960.jpg","jewel"),
 ("geburtsstein-armband-pois-zarte-kette-mit-steinen","Geburtsstein-Armband «Pois» · zarte Kette","24.9",B+"55a7eecf-0d8f-4974-8d4a-21f8f2df9aaa.jpg","jewel"),
 ("halskette-mit-ring-halter-anhanger-minimalistisch-3-farben","Ring-Halter-Halskette · minimalistisch","18.9",B+"bbf0e9b7-6b9f-4999-b018-553135b12ef4.jpg","jewel"),
 ("statement-ohrringe-retro-geometrisch-oversized","Statement-Ohrringe «Retro» · geometrisch, oversized","22.9",B+"e5f1d04d-a69f-4426-8a61-5c442df273c1.jpg","jewel"),
 ("geflochtenes-herz-armband-925-versilbert-gruner-zirkonia","Herz-Armband geflochten · 925-versilbert, Zirkonia","19.9",B+"70a1c59a-a55d-4060-8f05-22395375da2f.jpg","jewel"),
 ("ohrringe-duo-2-fach-tragbar-zirkonia-in-silber-optik","Ohrringe «Duo» · 2-fach tragbar, Zirkonia","29.9",B+"210eab2a-d1ab-40bb-ae8b-d9bcde185e67.jpg","jewel"),
 ("offenes-armband-metallic-verstellbarer-cuff-4-farben","Offenes Armband «Metallic» · verstellbarer Cuff","14.9",B+"e4de737d-0176-4d29-9e5f-fcd54eb87351.jpg","jewel"),
 ("herz-muschel-anhanger-titanstahl-wasserfest-stahl-rosegold-gold","Herz-Muschel-Anhänger · Titanstahl, wasserfest","14.9",B+"948d754f-3128-495f-8e08-f6ba945eb94d.jpg","jewel"),
 ("smaragd-zirkon-schmuck-set-vintage-ohrringe-ring-halskette","Schmuck-Set «Vintage» · Smaragd-Zirkon, 3-tlg","18.9",B+"0a4e6efa-cd87-4064-bab2-e3cc0fa1aa6e.jpg","jewel"),
 ("moissanite-ohrstecker-eclat-s925-silber-0-5-1-karat","Moissanite-Ohrstecker «Éclat» · S925 Silber","139.9",B+"036d0c3a-840a-4c64-ae0c-a1b48d18116c.jpg","jewel"),
 ("handliches-massagegerat-vibrations-massage-mit-mehreren-stufen","Massagegerät «Relax» · Vibration, mehrere Stufen","44.9",B+"f2ec2824-7ac0-403c-a0fd-f1ced4b3cd47_trans.jpg","beauty"),
 ("selbstklebende-3d-wimpern-wiederverwendbar-ohne-kleber-naturlicher-look","3D-Wimpern selbstklebend · ohne Kleber, natürlich","14.9",B+"68c5683f-0d07-42cd-89e1-ec5daa2a65aa.jpg","beauty"),
 ("4l-luftbefeuchter-cool-mist-fur-grosse-raume-leise-lang-anhaltend","4L-Luftbefeuchter · Cool-Mist, leise","54.9",B+"01bca786-e663-4d36-aeda-498ccf5ad58e.jpg","home"),
 ("aroma-diffuser-mist-ultraschall-mit-led","Aroma-Diffuser «Mist» · Ultraschall mit LED","16.9",B+"5724c715-5879-4208-8e07-c75398ac09b5.jpg","home"),
 ("reed-diffuser-aroma-duftstabchen-ohne-flamme","Reed-Diffuser «Aroma» · Duftstäbchen ohne Flamme","16.9",B+"a6789eef-1fed-49ee-9fd0-5eb8e48be93d.jpg","home"),
 ("spulbecken-organizer-schwamm-seifenhalter-mit-ablauf","Spülbecken-Organizer · Schwamm- & Seifenhalter","24.9",B+"582a93c1-79f2-4f36-8c72-c8c5e611259a.jpg","home"),
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
for i,(handle,title,price,img,cat) in enumerate(P,1):
    board,tags,kw=BOARD[cat]; price_s=f"CHF {float(price):.2f}"
    name=re.sub(r"\s*\([^)]*\)","",title).strip()
    pin_title=(name+" | LuxeStyle CH")[:100]
    desc=f"{name} 🛍️ Schweizer Online-Shop, weltweiter Versand. {price_s} — −10% mit Code WELCOME10. {tags}"[:480]
    link=f"https://luxestyle.ch/products/{handle}"; fn=f"c-{i:02d}-{slug(name)}.jpg"
    try:
        req=urllib.request.Request(img,headers={"User-Agent":"Mozilla/5.0"})
        im=Image.open(io.BytesIO(urllib.request.urlopen(req,timeout=40).read())).convert("RGB")
    except Exception as e:
        print(f"  ⚠️ {fn} img fail: {e}"); continue
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
    print(f"  ✅ {fn}")
json.dump(meta,open("/tmp/batch_meta3.json","w"),ensure_ascii=False)
print(f"\n{len(meta)} Bilder gerendert.")
