#!/usr/bin/env python3
import json, re, glob
TC="gid://shopify/TaxonomyCategory/"
EXACT={
 "Schmuck":"aa-6","Damen-Schmuck":"aa-6","Halskette":"aa-6","Ohrringe":"aa-6","Armband":"aa-6","Ring":"aa-6",
 "Uhren":"aa-6-11","Sonnenbrille":"aa-2-27","Hut":"aa-2-17","Sonnenhut":"aa-2-17","Mütze":"aa-2-17",
 "Tasche":"aa-5-4","Taschen":"aa-5-4","Rucksack":"aa-5-4","Taschen & Reise":"aa-5-4","Taschen & Accessoires":"aa-5-4",
 "Schuhe":"aa-8","Sneaker":"aa-8","Sandalen":"aa-8","Sandalette":"aa-8","Pumps":"aa-8","Ballerina":"aa-8",
 "Slip-on":"aa-8","Slides":"aa-8","Herren-Schuhe":"aa-8","Damen-Schuhe":"aa-8","Damen-Sandalen":"aa-8",
 "Kleid":"aa-1-4","Damen-Kleid":"aa-1-4","Accessoires":"aa-2",
 "Damenmode":"aa-1","Damen-Mode":"aa-1","Herrenmode":"aa-1","Herren-Mode":"aa-1","Mode":"aa-1","Shirt":"aa-1",
 "Damen-Top":"aa-1","Damen-Set":"aa-1","Blazer":"aa-1","Damen-Blazer":"aa-1","Cardigan":"aa-1","Damen-Cardigan":"aa-1",
 "Jacke":"aa-1","Bluse":"aa-1","Damen-Bluse":"aa-1","Rock":"aa-1","Damen-Rock":"aa-1","Shorts":"aa-1",
 "Damen-Shorts":"aa-1","Damen-Hose":"aa-1","Weste":"aa-1","Jumpsuit":"aa-1","Damen-Jumpsuit":"aa-1",
 "Jeans":"aa-1","Set":"aa-1","Sport-Set":"aa-1","Herren-Set":"aa-1","Hose":"aa-1","Top":"aa-1","Pullover":"aa-1","Strickwaren":"aa-1",
 "Beauty":"hb-3-2-6","Beauty & Pflege":"hb-3-2-6","Beauty-Tool":"hb-3-2-9","Hautpflege":"hb-3-2-9",
 "Wellness & Spa":"hb-3-11-9","Wellness":"hb-3-11-9","Aroma-Diffuser":"hb-3-11-9",
 "Beleuchtung":"hg-13-5","Garten & Beleuchtung":"hg-13-5",
 "Küche":"hg-11-8","Küche & Haushalt":"hg-11-8","Küchenhelfer":"hg-11-8",
 "Wohnen":"hg-3","Deko":"hg-3","Wohnaccessoire":"hg-3","Schlafen & Wohnen":"hg-3","Deko & Wohnaccessoires":"hg-3","Vase":"hg-3-67",
 "Elektronik":"el","Tech":"el","Tech-Gadget":"el","Gadget":"el","Sommer-Gadget":"el","Outdoor & Gadget":"el","Handy-Zubehör":"el","Audio":"el-2",
 "Sommer & Kühlung":"hg-9-1-6","Ventilator":"hg-9-1-6",
 "Haustier":"ap-2","Haustier & Sommer":"ap-2","Auto-Zubehör":"vp-1","Spielzeug":"tg-5",
 "Bad":"hg-1","Bad & Wellness":"hg-1",
 "Outdoor":"hg-12","Outdoor & Sommer":"hg-12","Sport & Outdoor":"hg-12","Reise & Outdoor":"hg-12",
 "Reise-Zubehör":"hg-12","Garten & Pflanzen":"hg-12","Grill-Zubehör":"hg-12","Garten":"hg-12",
 "Trinkflasche":"hg-11-8","Trinkflaschen":"hg-11-8",
 "Haushalt":"hg","Haushalt & Hobby":"hg","Wellness & Haushalt":"hg","Aufbewahrung":"hg","Büro & Home Office":"hg","Büro":"hg",
 "Massage":"hb-3-11-9","Luftbefeuchter":"hb-3-11-9","Camping":"hg-12","Grill & BBQ":"hg-12","Pool & Strand":"hg-12",
}
EMOJI=re.compile("["
 "\U0001F000-\U0001FAFF\U00002600-\U000027BF\U00002B00-\U00002BFF"
 "\U0001F1E6-\U0001F1FF\U0000FE0F\U00002190-\U000021FF\U00002300-\U000023FF]+", flags=re.UNICODE)
def clean(s): return re.sub(r"\s{2,}"," ",EMOJI.sub("",s or "")).strip(" ·-–—")
def gq(s): return s.replace("\\","\\\\").replace('"','\\"')
def title_bad(t):
    if not t: return True
    t=t.strip()
    if t.endswith("…") or t.endswith("..."): return True
    m=("|" in t) or ("CHF" in t) or ("LuxeStyle" in t)
    if not m and t.count(" – ")>=1: return True
    if not m and len(t)>62: return True
    return False
def desc_bad(d):
    if not d: return True
    d=d.strip()
    return d.endswith("…") or d.endswith("...") or ("schnelle Lieferung. Jetzt" in d)
def mk_title(name):
    n=clean(name)
    if len(n)>50:
        cut=n[:50]
        if " " in cut: cut=cut[:cut.rfind(" ")]
        n=cut
    return (n.rstrip(" ,;:·–-")+" | LuxeStyle")[:70]
def mk_desc(name):
    return f"{clean(name)}: jetzt im Schweizer Online-Shop LuxeStyle. Faire Preise, schnelle Lieferung (7–14 Tage), 30 Tage Rückgabe. −10% mit Code WELCOME10."[:315]

nodes=[]
for f in sorted(glob.glob("/tmp/seonew_0*.txt")):
    r=open(f,encoding="utf-8").read()
    nodes+=json.loads(r[r.index("{"):])["data"]["products"]["nodes"]
# dedup
seen=set(); uniq=[]
for n in nodes:
    if n["id"] in seen: continue
    seen.add(n["id"]); uniq.append(n)

cats=[]; seos=[]; skip={}
for n in uniq:
    if not n.get("category"):
        cid=EXACT.get((n.get("productType") or "").strip())
        if cid: cats.append((n["id"], TC+cid))
        else: skip[n.get("productType","—")]=skip.get(n.get("productType","—"),0)+1
    seo=n.get("seo") or {}
    if title_bad(seo.get("title")) or desc_bad(seo.get("description")):
        seos.append((n["id"], mk_title(n["title"]), mk_desc(n["title"])))
print(f"Produkte: {len(uniq)} · Kategorie: {len(cats)} · SEO-Fix: {len(seos)} · skip-Typen: {skip}")

def write_batches(items, kind, fmt, B):
    nb=0
    for i in range(0,len(items),B):
        nb+=1; parts=["mutation {"]
        for j,it in enumerate(items[i:i+B]): parts.append(fmt(j,it))
        parts.append("}")
        open(f"/tmp/{kind}_{nb:02d}.txt","w",encoding="utf-8").write("\n".join(parts))
    return nb

n1=write_batches(cats,"catnew", lambda j,it: f'  c{j}: productUpdate(input: {{ id: "{it[0]}", category: "{it[1]}" }}) {{ product {{ id }} userErrors {{ field message }} }}', 50)
n2=write_batches(seos,"seonewfix", lambda j,it: f'  s{j}: productUpdate(input: {{ id: "{it[0]}", seo: {{ title: "{gq(it[1])}", description: "{gq(it[2])}" }} }}) {{ product {{ id }} userErrors {{ field message }} }}', 25)
print(f"catnew Dateien: {n1} · seonewfix Dateien: {n2}")
