#!/usr/bin/env python3
import re, io, json, urllib.request, os
from PIL import Image, ImageDraw, ImageFont, ImageOps

OUT = "/tmp/pins2"; os.makedirs(OUT, exist_ok=True)
W, H, IMG_H = 1000, 1500, 950
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
f_brand = ImageFont.truetype(FB, 34); f_title = ImageFont.truetype(FB, 50)
f_sub = ImageFont.truetype(FR, 28); f_price = ImageFont.truetype(FB, 60); f_promo = ImageFont.truetype(FB, 30)
ACCENT, INK = "#e8b923", "#111111"

BOARD = {
  "men":   ("Herrenmode Schweiz",            "#herrenmode #menstyle #schweiz #menswear", "herrenmode, menstyle, herren"),
  "dress": ("Sommerkleider & Damenmode 2026","#sommerkleid #ootd #schweiz #damenmode #fashion", "sommerkleid, damenmode schweiz, ootd"),
  "jewel": ("Schmuck & Accessoires",         "#schmuck #jewelry #schweiz #accessoires", "schmuck, damenschmuck, accessoires"),
  "beauty":("Wellness & Beauty",             "#selfcare #beauty #wellness #schweiz #skincare", "selfcare, beauty, wellness"),
  "home":  ("Home & Geschenkideen",          "#homedeko #geschenkidee #schweiz #interior #homedecor", "home deko, geschenkidee, interior"),
}

# (handle, title, price, img_url, category)
P = [
 # ---- MÄNNERMODE ----
 ("herren-slides-porto-cross-strap-wildleder-optik","Herren-Slides «Porto» · Cross-Strap, Wildleder-Optik","39.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/4de7e77f-06df-4347-b49d-09ab36b0ee88.jpg?v=1780944896","men"),
 ("herren-slip-on-sail-canvas-leichte-sohle","Herren-Slip-on «Sail» · Canvas, leichte Sohle","49.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/8f944f16-51c4-48b2-84ca-cb5dae220d67.jpg?v=1780944168","men"),
 ("herren-strickhemd-amalfi-ajour-knit-camp-kragen","Herren-Strickhemd «Amalfi» · Ajour-Knit, Camp-Kragen","44.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/45240fe2-82b9-41d4-aecb-fac1e15da55c.jpg?v=1780944045","men"),
 ("herren-henley-waffle-waffelstrick-langarm","Herren-Henley «Waffle» · Waffelstrick, Langarm","34.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/cfcbe962-5cf9-4059-aea2-82fa2809ae98.jpg?v=1780905412","men"),
 ("herren-leinenhose-lino-locker-atmungsaktiv","Herren-Leinenhose «Lino» · locker & atmungsaktiv","29.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/8ac7a988-8141-4f39-971e-0875ea9b5de7.jpg?v=1780258346","men"),
 ("herren-sommershirt-breeze-leicht-atmungsaktiv","Herren-Sommershirt «Breeze» · leicht & atmungsaktiv","24.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/d5b6dd62-4bcd-4461-8c8f-510a49663d2b.jpg?v=1780258196","men"),
 ("herren-strickshirt-riviera-cord-kurzarm","Herren-Strickshirt «Riviera» · Cord-Kurzarm","24.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/bf52f7ab-4d00-4362-bac8-5031389685ee.jpg?v=1780258275","men"),
 ("herren-sommerhemd-monsieur-french-court-style-kurzarm","Herren-Sommerhemd «Monsieur» · French-Court, Kurzarm","44.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/06a091fd-ea0b-40ee-b299-1ae220e92daf.jpg?v=1780243098","men"),
 ("herbst-winter-beliebte-herren-sportoutfits-urbane-lassige-sportliche-jogging-sets-herren-tagliche-trainingskleidung","Herren Jogging-Set 2-tlg · urbaner Streetwear-Look","39.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S4cf6096a9894489faaed4ef5db3d16f0j.webp?v=1780296601","men"),
 ("2026-neue-herrenbekleidung-t-shirt-herren-muster-t-shirt-herren-t-shirt-retro-washed-denim-stil-fur-manner-geeignet","Herren T-Shirt Retro-Washed · Denim-Look","24.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Se6b5c8e49c5849108234a02e6a7012d0P_00a17b01-1544-4ce0-b221-2b0b121546d9.webp?v=1780296601","men"),
 ("herren-outdoor-mode-trend-radsport-freizeit-winddichte-atmungsaktive-jacke-komfortable-und-vielseitige-dicke-baumwollkleidung","Herren Outdoor-Jacke · winddicht & atmungsaktiv","49.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Sf475fd13d8514bc1be5fdbd27de8e0abg_3af07ab0-5b69-41a4-9f7f-728067f18360.webp?v=1780296601","men"),
 ("hemden-und-blusen-fur-herren-weisse-herrenoberteile-schlichte-grafische-blumenkleidung-koreanischer-stil-designermode-s-elegant-gunstig-marke-cool","Herren Hemd · schlicht & elegant, koreanischer Stil","39.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Sdc94ccc64efa4e2a9a43182ad03d8324L.webp?v=1780296599","men"),
 ("herrenbekleidung-japanische-retro-overalls-fur-manner-freizeithose-mit-geradem-bein-lockere-cordhose-mit-weitem-bein-vielseitig-einsetzbar","Herren Cordhose Retro · weites Bein, japanischer Stil","44.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S0dd336fa26d84335b8b5b880d93afb9dj.webp?v=1780296598","men"),
 ("2023-herren-bekleidung-neue-mode-loser-mann-einfarbig-plissiert-temperament-hohe-taille-schone-dunne-fruhling-sommer-freizeit-hose","Herren Stoffhose plissiert · High-Waist, leicht","34.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S74e67acc6d1d47bca616cf116803aa1eW.webp?v=1780296597","men"),
 # ---- SCHMUCK & ACCESSOIRES ----
 ("moissanite-herzkette-coeur-s925-silber-infinity","Moissanite-Herzkette «Coeur» · S925 Silber, Infinity","119.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/010b06fe-dd7e-4470-a288-9b868a06330c.jpg?v=1780901173","jewel"),
 ("glucks-halskette-fortune-hufeisen-kreuz-mit-zirkonia","Glücks-Halskette «Fortune» · Hufeisen & Kreuz, Zirkonia","16.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/61dae66d-75fe-4ed2-99a0-0e68bd0ec85f.jpg?v=1780889454","jewel"),
 ("doppel-ring-duo-s925-silber-mit-zirkonia-topas-blau","Doppel-Ring «Duo» · S925 Silber, Zirkonia & Topas-Blau","49.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/5032c52d-d4c7-4f64-ab18-4bd9f8930268.jpg?v=1780897581","jewel"),
 ("sommer-armband-evil-schmetterling-nazar-auge-vergoldet","Sommer-Armband «Évil» · Schmetterling & Nazar, vergoldet","19.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/2ece7b43-05bc-434e-b1b4-5bb6360168cb.jpg?v=1780879302","jewel"),
 ("statement-ohrringe-dore-geburstetes-gold-quadratisch","Statement-Ohrringe «Doré» · gebürstetes Gold","29.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/de618414-704b-442e-ab22-22c964ff28bf.jpg?v=1780879300","jewel"),
 ("perlen-anhanger-coquille-muschel-form-vergoldet","Perlen-Anhänger «Coquille» · Muschel-Form, vergoldet","24.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/56761d00-d8d6-48e1-9274-e1070c2c8bf2.jpg?v=1780877301","jewel"),
 ("oversized-sonnenbrille-street-getont-square-style-3-farben","Oversized-Sonnenbrille «Street» · getönt, Square-Style","19.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/dfe8e26a-be97-42b4-88a2-33109ccbb907.jpg?v=1780378792","jewel"),
 ("polarisierte-sonnenbrille-hd-damen-uv-schutz-mehrere-tonungen","Polarisierte Sonnenbrille «HD» · UV-Schutz","24.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/1496f934-823a-4beb-acc0-7b20928fd075_trans.jpg?v=1780359128","jewel"),
 ("boston-henkeltasche-lussa-echtleder-im-bowling-stil-damen-9-farben","Boston-Henkeltasche «Lussa» · Echtleder, Bowling-Stil","99.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/0e0a337f-2279-43b7-965b-fdc556bfc02e.jpg?v=1780524334","jewel"),
 ("make-up-tasche-mirror-kosmetiketui-mit-integriertem-spiegel","Make-up-Tasche «Mirror» · mit integriertem Spiegel","19.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/febf4d9b-e31d-4f70-a886-23cf0f54502b_trans.jpg?v=1780904766","jewel"),
 ("herz-mond-halskette-zarte-schlusselbein-kette-silber-optik","Herz-Mond-Halskette · zarte Schlüsselbein-Kette","16.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/bc9cf2ec-4ff2-438e-954e-d500bd158a35.jpg?v=1780358730","jewel"),
 # ---- KLEIDER ----
 ("sommerkleid-sole-casual-midi-raglan-armel","Sommerkleid «Sole» · Casual Midi, Raglan-Ärmel","34.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/1cebeab4-e138-43e3-af3e-fc96d5a5abf2.jpg?v=1780905230","dress"),
 ("tunika-mini-kleid-riva-v-ausschnitt-strand-stil-damen","Tunika-Mini-Kleid «Riva» · V-Ausschnitt, Strand-Stil","34.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/57e35fe7-7266-4834-8568-f76fd8addf06.jpg?v=1780524933","dress"),
 ("floral-sommerkleid-capucine-puffarmel-leicht-luftig-damen","Floral-Sommerkleid «Capucine» · Puffärmel, luftig","34.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/b39d742d-5bf2-464e-a82e-3015164749c2.jpg?v=1780520331","dress"),
 ("etuikleid-bureau-ruschenarmel-hohe-taille-damen-s-3xl-6-farben","Etuikleid «Bureau» · Rüschenärmel & hohe Taille","39.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/9c2afb7d-0f5d-43bb-8a90-24f4af02348b.jpg?v=1780520263","dress"),
 ("off-shoulder-plisseekleid-aurelie-schulterfrei-fliessend-damen-4-farben","Off-Shoulder-Plisseekleid «Aurélie» · schulterfrei","39.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/f7c35f4d-7aad-4f0f-8c37-09f404721145.jpg?v=1780519779","dress"),
 ("floral-sommerkleid-marguerite-ruschen-trager-figurbetont","Floral-Sommerkleid «Marguerite» · Rüschen-Träger","34.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/1eedc52a-e299-44ac-b49b-f6a6bdc5d6ea.jpg?v=1780484110","dress"),
 ("mini-kleid-mit-ruschen-spaghetti-trager-elastisch-sommer-2026","Mini-Kleid «Ruffle» · Spaghetti-Träger, elastisch","29.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/c6efdee1-e741-4788-b96b-b5a96095e3d9.jpg?v=1780316551","dress"),
 # ---- WELLNESS & BEAUTY ----
 ("collagen-masken-set-repair-augen-gesicht","Collagen-Masken-Set «Repair» · Augen & Gesicht","24.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/6684a965-31e0-4df5-b192-cb3d7ef540d1.jpg?v=1780950381","beauty"),
 ("smart-aroma-diffuser-aura-grossraum","Smart-Aroma-Diffuser «Aura» · Grossraum","89.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/959b06b9-6157-46af-97ec-57b5759b2b15_ba471bb2-b645-4713-9c51-a0a5bb17da56.jpg?v=1780950381","beauty"),
 ("satin-seidenkissenbezug-2er-set-sanft-zu-haut-haar","Satin-Seidenkissenbezug 2er-Set · sanft zu Haut & Haar","24.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/ba0bcbcb-84db-41f8-8a16-f191ef3aebf1.jpg?v=1780246608","beauty"),
 ("augenmassagegerat-mit-warme-musik-bluetooth-faltbar-gegen-mude-augen","Augenmassagegerät · Wärme & Musik, Bluetooth","44.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/7b0e2963-6d66-448c-93f7-386083583cfa_trans.jpg?v=1780219237","beauty"),
 ("reise-schallzahnburste-4-modi-magnetschwebe-motor-antibakterielle-box","Reise-Schallzahnbürste · 4 Modi, antibakterielle Box","29.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/32ba94f1-1767-4f75-b224-8e1774fcd676_fine.jpg?v=1780219374","beauty"),
 # ---- HOME & GESCHENKE ----
 ("strickblumen-strauss-fleur-handgestrickt-ewig","Strickblumen-Strauss «Fleur» · handgestrickt, ewig","16.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/2578e6cd-4c71-4cc9-8c6e-07f3e6340428.jpg?v=1780951337","home"),
 ("keramik-vase-craquele-antik-glasur","Keramik-Vase «Craquelé» · Antik-Glasur","54.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/44002d9d-527a-4e67-b382-24a84ba4c2ed_trans.jpg?v=1780951337","home"),
 ("deko-vase-antique-schmiedeeisen-vintage-look-37-cm","Deko-Vase «Antique» · Schmiedeeisen, Vintage-Look","44.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/03043723-bc37-4f35-8344-f29294d9c909.jpg?v=1780878066","home"),
 ("quallen-diffuser-medusa-mit-musik-led","Quallen-Diffuser «Medusa» · mit Musik & LED","49.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/22f0f705-abaa-4fd5-8dd8-c45514658907.png?v=1780246492","home"),
 ("3d-druck-nachttischlampe-warmes-nachtlicht-deko-objekt-furs-schlafzimmer","3D-Druck-Nachttischlampe · warmes Nachtlicht & Deko","16.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/de536d8f-2650-458c-8c85-103ead7e17bd_trans.jpg?v=1780221406","home"),
 ("titan-schneidebrett-chef-food-grade-antibakteriell","Titan-Schneidebrett «Chef» · Food-Grade, antibakteriell","24.9","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/fca9167f-0522-4c39-96de-0bc08198d408_trans.jpg?v=1780951337","home"),
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
        if sep in full:
            h,s=full.split(sep,1); return h.strip(),s.strip()
    return full,""

meta=[]
for i,(handle,title,price,img,cat) in enumerate(P,1):
    board,tags,kw=BOARD[cat]
    price_s=f"CHF {float(price):.2f}"
    name=re.sub(r"\s*\([^)]*\)","",title).strip()
    pin_title=(name+" | LuxeStyle CH")[:100]
    desc=f"{name} 🛍️ Schweizer Online-Shop, weltweiter Versand. {price_s} — −10% mit Code WELCOME10. {tags}"[:480]
    link=f"https://luxestyle.ch/products/{handle}"
    fn=f"b-{i:02d}-{slug(name)}.jpg"
    try:
        req=urllib.request.Request(img,headers={"User-Agent":"Mozilla/5.0"})
        im=Image.open(io.BytesIO(urllib.request.urlopen(req,timeout=40).read())).convert("RGB")
    except Exception as e:
        print(f"  ⚠️ {fn} img fail: {e}"); continue
    im=ImageOps.fit(im,(W,IMG_H),centering=(0.5,0.4))
    c=Image.new("RGB",(W,H),"#ffffff"); c.paste(im,(0,0)); d=ImageDraw.Draw(c)
    d.rectangle([0,0,W,70],fill=INK); d.text((40,18),"LUXESTYLE  ·  luxestyle.ch",font=f_brand,fill="#fff")
    d.rectangle([0,IMG_H,W,H],fill="#fff")
    head,sub=parse(name); y=IMG_H+45
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

json.dump(meta,open("/tmp/batch_meta.json","w"),ensure_ascii=False)
print(f"\n{len(meta)} Bilder gerendert.")
