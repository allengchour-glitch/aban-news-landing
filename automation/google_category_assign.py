#!/usr/bin/env python3
import json, glob

TC="gid://shopify/TaxonomyCategory/"
EXACT={
 # Schmuck
 "Schmuck":"aa-6","Damen-Schmuck":"aa-6","Halskette":"aa-6","Ohrringe":"aa-6","Armband":"aa-6","Ring":"aa-6",
 "Uhren":"aa-6-11",
 "Sonnenbrille":"aa-2-27",
 "Hut":"aa-2-17","Sonnenhut":"aa-2-17","Mütze":"aa-2-17",
 # Taschen
 "Tasche":"aa-5-4","Taschen":"aa-5-4","Rucksack":"aa-5-4","Taschen & Reise":"aa-5-4","Taschen & Accessoires":"aa-5-4",
 # Schuhe
 "Schuhe":"aa-8","Sneaker":"aa-8","Sandalen":"aa-8","Sandalette":"aa-8","Pumps":"aa-8","Ballerina":"aa-8",
 "Slip-on":"aa-8","Slides":"aa-8","Herren-Schuhe":"aa-8","Damen-Schuhe":"aa-8","Damen-Sandalen":"aa-8",
 # Kleider
 "Kleid":"aa-1-4","Damen-Kleid":"aa-1-4",
 # Accessoires generisch
 "Accessoires":"aa-2",
 # Bekleidung
 "Damenmode":"aa-1","Damen-Mode":"aa-1","Herrenmode":"aa-1","Herren-Mode":"aa-1","Mode":"aa-1","Shirt":"aa-1",
 "Damen-Top":"aa-1","Damen-Set":"aa-1","Blazer":"aa-1","Damen-Blazer":"aa-1","Cardigan":"aa-1","Damen-Cardigan":"aa-1",
 "Jacke":"aa-1","Bluse":"aa-1","Damen-Bluse":"aa-1","Rock":"aa-1","Damen-Rock":"aa-1","Shorts":"aa-1",
 "Damen-Shorts":"aa-1","Damen-Hose":"aa-1","Weste":"aa-1","Jumpsuit":"aa-1","Damen-Jumpsuit":"aa-1",
 "Jeans":"aa-1","Set":"aa-1","Sport-Set":"aa-1","Herren-Set":"aa-1",
 # Beauty
 "Beauty":"hb-3-2-6","Beauty & Pflege":"hb-3-2-6","Beauty-Tool":"hb-3-2-9","Hautpflege":"hb-3-2-9",
 "Wellness & Spa":"hb-3-11-9","Wellness":"hb-3-11-9","Aroma-Diffuser":"hb-3-11-9",
 # Beleuchtung
 "Beleuchtung":"hg-13-5","Garten & Beleuchtung":"hg-13-5",
 # Küche
 "Küche":"hg-11-8","Küche & Haushalt":"hg-11-8","Küchenhelfer":"hg-11-8",
 # Deko / Wohnen
 "Wohnen":"hg-3","Deko":"hg-3","Wohnaccessoire":"hg-3","Schlafen & Wohnen":"hg-3","Deko & Wohnaccessoires":"hg-3","Vase":"hg-3-67",
 # Elektronik
 "Elektronik":"el","Tech":"el","Tech-Gadget":"el","Gadget":"el","Sommer-Gadget":"el","Outdoor & Gadget":"el","Handy-Zubehör":"el",
 "Audio":"el-2",
 # Ventilatoren / Kühlung
 "Sommer & Kühlung":"hg-9-1-6","Ventilator":"hg-9-1-6",
 # Haustier
 "Haustier":"ap-2","Haustier & Sommer":"ap-2",
 # Auto
 "Auto-Zubehör":"vp-1",
 # Spielzeug
 "Spielzeug":"tg-5",
 # Bad
 "Bad":"hg-1","Bad & Wellness":"hg-1",
 # Garten / Outdoor
 "Outdoor":"hg-12","Outdoor & Sommer":"hg-12","Sport & Outdoor":"hg-12","Reise & Outdoor":"hg-12",
 "Reise-Zubehör":"hg-12","Garten & Pflanzen":"hg-12","Grill-Zubehör":"hg-12",
 # Drinkware -> Küche
 "Trinkflasche":"hg-11-8","Trinkflaschen":"hg-11-8",
 # Haushalt generisch -> Heim & Garten
 "Haushalt":"hg","Haushalt & Hobby":"hg","Wellness & Haushalt":"hg","Aufbewahrung":"hg",
}

def cat_for(pt):
    if not pt: return None
    return EXACT.get(pt.strip())

nodes=[]
for f in sorted(glob.glob("/tmp/seopage_0[1-5].txt")):
    raw=open(f,encoding="utf-8").read()
    nodes+=json.loads(raw[raw.index("{"):])["data"]["products"]["nodes"]

assigns=[]; skipped={}
for n in nodes:
    if n.get("category"):  # schon gesetzt
        continue
    cid=cat_for(n.get("productType"))
    if cid: assigns.append((n["id"], TC+cid))
    else: skipped[n.get("productType","—")]=skipped.get(n.get("productType","—"),0)+1

print(f"Produkte: {len(nodes)} · Kategorie zuweisbar: {len(assigns)} · übersprungen (Typen): {sum(skipped.values())}")
if skipped: print("  übersprungene Typen:", dict(sorted(skipped.items(), key=lambda x:-x[1])))
B=50; nb=0
for i in range(0,len(assigns),B):
    chunk=assigns[i:i+B]; nb+=1
    parts=["mutation {"]
    for j,(pid,cid) in enumerate(chunk):
        parts.append(f'  c{j}: productUpdate(input: {{ id: "{pid}", category: "{cid}" }}) {{ product {{ id }} userErrors {{ field message }} }}')
    parts.append("}")
    open(f"/tmp/catfix_{nb:02d}.txt","w",encoding="utf-8").write("\n".join(parts))
print(f"{nb} Kategorie-Mutations-Dateien /tmp/catfix_*.txt")
