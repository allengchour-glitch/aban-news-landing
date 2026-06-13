#!/usr/bin/env python3
import sys, os, re, json, io, csv, urllib.request
sys.path.insert(0, "/home/user/aban-news-landing/automation")
from gen_pinterest_polish import render, BOARDS, slug
from PIL import Image

ROOT="/home/user/aban-news-landing"; PINS=os.path.join(ROOT,"dropship","pins")
CSVP=os.path.join(ROOT,"dropship","pinterest_pins.csv")
RAW="https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/main/dropship/pins/"
B="https://cdn.shopify.com/s/files/1/0943/6856/3585/files/"
# (handle, title, price, img, cat)
P=[
 ("925-silber-fusskettchen-riva-emaille-perlen","925-Silber Fusskettchen «Riva» · Emaille-Perlen","49.9",B+"be9c2108-545a-4606-9af3-84c0b9cc8870.jpg","jewel"),
 ("susswasserperlen-ohrringe-perla-925-silber","Süsswasserperlen-Ohrringe «Perla» · 925 Silber","89.9",B+"eaee98af-abff-45be-a390-0612247aefc4.png","jewel"),
 ("925-silber-ring-fleur-filigrane-blute","925-Silber Ring «Fleur» · filigrane Blüte","59.9",B+"785189e1-2b3f-4ca3-a8ef-57f1836dd71a.jpg","jewel"),
 ("moissanite-kette-aurora-925-silber-gra-zertifiziert","Moissanite-Kette «Aurora» · 925 Silber, GRA-zertifiziert","199.0",B+"3d48340e-cc7f-4d18-8f74-cd2c8d463c9b.jpg","jewel"),
 ("mesh-armband-maille-s925-silber-federleicht","Mesh-Armband «Maille» · S925 Silber, federleicht","109.9",B+"4df7f58c-433d-41ed-84dd-25d773b332f6.jpg","jewel"),
 ("perlen-ohrhanger-eventail-s925-silber-susswasserperle","Perlen-Ohrhänger «Éventail» · S925 Silber & Süsswasserperle","119.9",B+"b0ed05a4-c623-4179-b4af-ee086cf4bd50.jpg","jewel"),
 ("partner-herzketten-aimant-magnet-herz-2er-set-fur-paare","Partner-Herzketten «Aimant» · Magnet-Herz, 2er-Set","29.9",B+"ff50384b-bd43-4974-aaad-6257dd50e1af.jpg","jewel"),
 ("muschel-anhanger-kette-coquille-gold-optik-maritim","Muschel-Anhänger-Kette «Coquille» · Gold-Optik","24.9",B+"5dc2514b-4baa-4de0-a2a8-f7d13556b3d7.jpg","jewel"),
 ("premium-schultertasche-como-geraumig-tragegurt","Premium Schultertasche «Como» · geräumig","89.9",B+"0b0b2206-4c0a-4413-b4b1-8f574fbc2a20_fine.jpg","jewel"),
 ("echtleder-henkeltasche-milano-weiches-rindsleder","Echtleder-Henkeltasche «Milano» · weiches Rindsleder","99.9",B+"3dcf27ae-3c09-435b-a1ed-1a4bd4f802dc_trans.jpg","jewel"),
 ("weekender-reisetasche-voyage-premium-pu-leder-faltbar","Weekender-Reisetasche «Voyage» · Premium-Leder, faltbar","39.9",B+"3eab1c6f-7e73-43aa-8c66-12059dfe1725.jpg","jewel"),
 ("herren-trainingsschuhe-forza-gym-weightlifting","Herren Trainingsschuhe «Forza» · Gym & Weightlifting","54.9",B+"f3669a27-e274-4ec0-83ba-d36a0479172f.jpg","shoe"),
 ("herren-sport-sneaker-velocita-mesh-wide-toe","Herren Sport-Sneaker «Velocità» · Mesh, Wide-Toe","54.9",B+"73c856f7-d935-41eb-bb56-d3722f7b049a.jpg","shoe"),
 ("herren-leder-sandalen-adriano-vollnarbenleder","Herren Leder-Sandalen «Adriano» · Vollnarbenleder","49.9",B+"a102ecb5-8d3b-4a3b-a7a6-af021ff8347e.jpg","shoe"),
 ("herren-high-top-sneaker-brooklyn-mesh-atmungsaktiv","Herren High-Top-Sneaker «Brooklyn» · Mesh","44.9",B+"68d1f93d-d661-44d6-93ce-06d1765880d3.jpg","shoe"),
 ("damen-komfort-sandalen-estate-elastik-riemen","Damen Komfort-Sandalen «Estate» · Elastik-Riemen","29.9",B+"9ac127da-5f2f-4c12-8a79-84b498a90cf9.jpg","shoe"),
 ("damen-beach-slides-mare-slip-on","Damen Beach-Slides «Maré» · Slip-on","29.9",B+"002675e3-d313-47c9-a30f-be4260e2af42.jpg","shoe"),
 ("damen-sommer-sandalen-lido-geschlossene-spitze","Damen Sommer-Sandalen «Lido» · geschlossene Spitze","32.9",B+"f019fb9f-5739-40f0-a432-48b4f3dbfe87.jpg","shoe"),
 ("damen-high-heel-sandalette-capri-offene-spitze","Damen High-Heel-Sandalette «Capri» · offene Spitze","44.9",B+"1ef08d25-8428-4c13-8ca5-fc7da3731a15.jpg","shoe"),
 ("polka-dot-wickel-rock-dolce-high-waist-asymmetrisch","Polka-Dot Wickel-Rock «Dolce» · High-Waist","34.9",B+"bf2b735e-62bb-43b6-b8ca-954f7dc124ae.jpg","dress"),
 ("wide-leg-midi-rock-studio-fliessend-freigrosse","Wide-Leg Midi-Rock «Studio» · fließend, Freigröße","29.9",B+"dea1d8b3-602a-416b-b22c-3ab8790591f4.jpg","dress"),
 ("solar-gartenleuchte-lumio-aluminium-automatisch","Solar-Gartenleuchte «Lumio» · Aluminium, automatisch","29.9",B+"f5e1abcf-0a8d-424a-8036-c36eaf1a1b61_trans.jpg","home"),
 ("rgb-wandlampe-halo-kabellos-fernbedienung-ohne-bohren","RGB-Wandlampe «Halo» · kabellos, ohne Bohren","26.9",B+"e89382ed-eb6c-4e07-8400-8e0109435f9a.jpg","home"),
 ("solar-windspiel-libelle-farbwechsel-led-wetterfest-2er-set","Solar-Windspiel «Libelle» · Farbwechsel-LED (2er-Set)","44.9",B+"20299f76-c5f2-422a-a2a7-457abcf8190b.jpg","home"),
 ("solar-gartenleuchten-lumiere-3er-set-retro-wegleuchten-wasserdicht","Solar-Gartenleuchten «Lumière» · 3er-Set Retro","34.9",B+"c50bc746-c8e3-47de-a8c7-6347805fc23b_trans.jpg","home"),
 ("aroma-diffuser-persimmon-kaki-frucht-design-mit-licht","Aroma-Diffuser «Persimmon» · Kaki-Design mit Licht","24.9",B+"1f3a005e-f49a-48f5-9809-f5248940bd4b.jpg","home"),
 ("retro-plattenspieler-bluetooth-lautsprecher-vinyl","Retro Plattenspieler · Bluetooth-Lautsprecher","24.9",B+"56186644-9091-4e10-9829-652e315e1245.jpg","gift"),
 ("camping-stuhl-sunshade-faltbar-mit-sonnendach-getrankehalter","Camping-Stuhl «Sunshade» · faltbar mit Sonnendach","129.9",B+"0296fce8-f74b-4caa-b5ab-37af3a3f56e9.jpg","gift"),
 ("aufblasbare-sonnenliege-solara-mit-sonnendach","Aufblasbare Sonnenliege «Solara» mit Sonnendach","39.9",B+"0f4ee99a-592d-4014-9961-ef919c9c23bf.jpg","gift"),
 ("burger-smasher-grill-helfer-set-edelstahl-patty-presse-wender-haube","Burger-Smasher & Grill-Helfer-Set · Edelstahl","29.9",B+"44f4a5a7-5269-4e2c-8573-efe2cb662a70.jpg","gift"),
]
EM={"dress":"☀️","jewel":"\U0001F48E","beauty":"\U0001F9D6","home":"\U0001F3E1","shoe":"\U0001F461","men":"\U0001F454","gift":"\U0001F381"}
rows=[]; ok=0
for i,(handle,title,price,img,cat) in enumerate(P,1):
    board,tags,kw=BOARDS.get(cat,BOARDS["gift"])
    name=re.sub(r"\s*\([^)]*\)","",title).strip()
    fn=f"py3-{i:03d}-{slug(name)}.jpg"
    try:
        req=urllib.request.Request(img,headers={"User-Agent":"Mozilla/5.0"})
        im=Image.open(io.BytesIO(urllib.request.urlopen(req,timeout=45).read())).convert("RGB")
    except Exception as e:
        print("  WARN",fn,e); continue
    render(im,name,price,os.path.join(PINS,fn))
    price_s=f"CHF {float(price):.2f}"
    desc=f"{name} {EM.get(cat,'')} Schweizer Online-Shop, weltweiter Versand. {price_s} — −10% mit Code WELCOME10. {tags}"[:480]
    rows.append([(name+' | LuxeStyle CH')[:100], RAW+fn, board, "", desc, f"https://luxestyle.ch/products/{handle}", "", kw]); ok+=1
    print("  OK",fn)
with open(CSVP,"a",newline="",encoding="utf-8") as fh:
    csv.writer(fh,quoting=csv.QUOTE_ALL).writerows(rows)
print(f"\n{ok} neue Pins gerendert + an CSV angehängt.")
