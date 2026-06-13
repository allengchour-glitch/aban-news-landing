#!/usr/bin/env python3
import sys, os, re, json, csv, io, urllib.request
sys.path.insert(0, "/home/user/aban-news-landing/automation")
from gen_pinterest_polish import render, BOARDS, slug  # wiederverwenden
from PIL import Image

ROOT="/home/user/aban-news-landing"
PINS=os.path.join(ROOT,"dropship","pins")
CSVP=os.path.join(ROOT,"dropship","pinterest_pins.csv")
RAW="https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/main/dropship/pins/"
SAVED=sys.argv[1]

pinned=set(open("/tmp/pinned_handles.txt").read().split())

EMOJI=re.compile("["
    "\U0001F000-\U0001FAFF\U00002600-\U000027BF\U00002B00-\U00002BFF"
    "\U0001F1E6-\U0001F1FF\U0000FE0F\U00002190-\U000021FF\U00002300-\U000023FF]+", flags=re.UNICODE)
def clean(s):
    s=EMOJI.sub("", s)
    s=re.sub(r"\s{2,}"," ", s).strip(" ·-–—")
    return s

def cat_of(tags):
    t=set(x.lower() for x in tags)
    if t & {"schmuck","damen-schmuck","herrenschmuck"}: return "jewel"
    if t & {"schuhe","sandalen"}: return "shoe"
    if t & {"herren","herrenuhr"} and not (t & {"damen"}): return "men"
    if t & {"kleid","damen-mode","damenmode"} or ("damen" in t and "mode" in t): return "dress"
    if t & {"beauty","wellness","selfcare","massage","gesundheit","skincare"}: return "beauty"
    if t & {"taschen"}: return "jewel"
    if t & {"deko","dekoration","wohnen","beleuchtung","kueche","haushalt","aroma","aroma-diffuser","kerzen","bad","garten","ordnung","organizer"}: return "home"
    return "gift"

CAP={"dress":16,"jewel":16,"beauty":10,"shoe":10,"home":14,"men":8,"gift":6}

_raw=open(SAVED,encoding="utf-8").read()
data=json.loads(_raw[_raw.index("{"):])["data"]

# Kandidaten einsammeln (dedup über handle), Alias-Reihenfolge = Priorität
cands=[]; seen=set()
for alias in ["dress","damen","jewel","shoe","beauty","deco","men","bags"]:
    for n in data.get(alias,{}).get("nodes",[]):
        h=n["handle"]
        if h in pinned or h in seen: continue
        img=(n.get("featuredMedia") or {}).get("image") or {}
        url=img.get("url")
        if not url: continue
        seen.add(h)
        price=n["priceRangeV2"]["minVariantPrice"]["amount"]
        cands.append((h, n["title"], price, url, n.get("tags",[])))

# nach Kategorie balancieren
buckets={}
for h,title,price,url,tags in cands:
    c=cat_of(tags); buckets.setdefault(c,[]).append((h,title,price,url))
picked=[]
for c,items in buckets.items():
    picked += [(h,t,p,u,c) for (h,t,p,u) in items[:CAP.get(c,6)]]

print("Auswahl pro Board:")
from collections import Counter
print("  ", Counter(c for *_,c in picked))
print("  total:", len(picked))

# rendern + CSV-Zeilen
rows=[]; idx=0; ok=0
EM={"dress":"☀️","jewel":"\U0001F48E","beauty":"\U0001F9D6","home":"\U0001F3E1","shoe":"\U0001F461","men":"\U0001F454","gift":"\U0001F381"}
for h,title,price,url,c in picked:
    idx+=1
    board,tags,kw=BOARDS.get(c,BOARDS["gift"])
    name=clean(re.sub(r"\s*\([^)]*\)","",title))
    if not name: continue
    fn=f"py2-{idx:03d}-{slug(name)}.jpg"
    try:
        req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
        im=Image.open(io.BytesIO(urllib.request.urlopen(req,timeout=45).read())).convert("RGB")
    except Exception as e:
        print("  WARN", fn, e); continue
    render(im, name, price, os.path.join(PINS,fn))
    price_s=f"CHF {float(price):.2f}"
    pin_title=(name+" | LuxeStyle CH")[:100]
    desc=f"{name} {EM.get(c,'')} Schweizer Online-Shop, weltweiter Versand. {price_s} — −10% mit Code WELCOME10. {tags}"[:480]
    link=f"https://luxestyle.ch/products/{h}"
    rows.append([pin_title, RAW+fn, board, "", desc, link, "", kw]); ok+=1
    print("  OK", fn)

# an bestehende CSV anhängen
with open(CSVP,"a",newline="",encoding="utf-8") as fh:
    w=csv.writer(fh, quoting=csv.QUOTE_ALL)
    w.writerows(rows)
print(f"\n{ok} neue Pins gerendert + an CSV angehängt.")
