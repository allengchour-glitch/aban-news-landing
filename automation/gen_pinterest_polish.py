#!/usr/bin/env python3
"""
gen_pinterest_polish.py — POLIERTES Pinterest-Pin-Template (v5) für LuxeStyle.
Konsolidiert die Roh-Produktlisten aus gen_pinterest_batch{,3,4}.py und rendert
sie im neuen Premium-Look:
  - Creme-Basis (#faf7f2) statt hartem Weiss (passt zum Shop)
  - Serifen-Headline (editorial), Gold-Akzentlinie
  - sanfter Foto→Creme-Übergang (kein harter Schnitt)
  - dezentes Marken-Wordmark (gesperrt) über dem Foto statt schwarzem Balken
  - Preis als CHF-klein + Zahl-gross, WELCOME10-Pille rechts daneben
Output: /tmp/pins_polish/*.jpg + /tmp/polish_meta.json
Aufruf: python3 automation/gen_pinterest_polish.py [--only N]
"""
import re, io, os, json, sys, urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageOps

OUT = "/tmp/pins_polish"; os.makedirs(OUT, exist_ok=True)
W, H, IMG_H = 1000, 1500, 928
CDN = "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/"

CREAM = (250, 247, 242); INK = (44, 44, 44); TAUPE = (139, 115, 85)
GRAY = (122, 114, 104); GOLD = (232, 185, 35); WHITE = (255, 255, 255)

FSB = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FB  = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR  = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
f_brand = ImageFont.truetype(FB, 24)
f_url   = ImageFont.truetype(FR, 21)
f_title = ImageFont.truetype(FSB, 54)
f_sub   = ImageFont.truetype(FR, 27)
f_chf   = ImageFont.truetype(FB, 30)
f_price = ImageFont.truetype(FSB, 66)
f_promo = ImageFont.truetype(FB, 28)
f_foot  = ImageFont.truetype(FB, 20)

BOARDS = {
 "men":   ("Herrenmode Schweiz",             "#herrenmode #menstyle #schweiz #menswear",       "herrenmode, menstyle, herren"),
 "dress": ("Sommerkleider & Damenmode 2026", "#sommerkleid #ootd #schweiz #damenmode #fashion","sommerkleid, damenmode schweiz, ootd"),
 "jewel": ("Schmuck & Accessoires",          "#schmuck #jewelry #schweiz #accessoires",        "schmuck, damenschmuck, accessoires"),
 "beauty":("Wellness & Beauty",              "#selfcare #beauty #wellness #schweiz #skincare", "selfcare, beauty, wellness"),
 "home":  ("Home & Geschenkideen",           "#homedeko #geschenkidee #schweiz #interior #homedecor","home deko, geschenkidee, interior"),
 "shoe":  ("Schuhe & Sandalen",              "#schuhe #sommerschuhe #shoes #schweiz",          "damenschuhe, sommerschuhe, schuhe"),
 "gift":  ("Home & Geschenkideen",           "#geschenkidee #gadget #schweiz #geschenk #homedecor","geschenkidee, gadget, geschenke schweiz"),
}

def extract_P(path, default_cat=None):
    txt = open(path, encoding="utf-8").read()
    m = re.search(r"\nP\s*=\s*\[", txt)
    start = m.start() + 1
    end = txt.index("\n]", start) + 2
    ns = {"B": CDN}
    exec(txt[start:end], ns)
    out = []
    for row in ns["P"]:
        if len(row) == 5:
            h, t, pr, img, cat = row
        else:
            h, t, pr, img = row; cat = default_cat
        out.append((h, t, pr, img, cat))
    return out

def collect():
    base = os.path.join(os.path.dirname(__file__))
    items, seen = [], set()
    for fn, dc in [("gen_pinterest_batch.py", None),
                   ("gen_pinterest_batch3.py", None),
                   ("gen_pinterest_batch4.py", "gift")]:
        for h, t, pr, img, cat in extract_P(os.path.join(base, fn), dc):
            if h in seen:
                continue
            seen.add(h); items.append((h, t, pr, img, cat or "gift"))
    return items

def slug(s): return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:55]

def wrap(d, t, f, m):
    out, cur = [], ""
    for w in t.split():
        x = (cur + " " + w).strip()
        if d.textlength(x, font=f) <= m: cur = x
        else:
            if cur: out.append(cur)
            cur = w
    if cur: out.append(cur)
    return out

def parse(full):
    full = full.split("|")[0].strip()
    for sep in ["—", "–", " - ", "·"]:
        if sep in full:
            h, s = full.split(sep, 1); return h.strip(), s.strip()
    return full, ""

def tracked(d, xy, text, font, fill, tr=2):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + tr
    return x

def render(src, name, price, path):
    prod = ImageOps.fit(src, (W, IMG_H), centering=(0.5, 0.30))
    c = Image.new("RGB", (W, H), CREAM); c.paste(prod, (0, 0))
    # sanfter Foto→Creme-Übergang am Bildfuss
    fade = 96
    grad = Image.new("L", (W, fade))
    gd = ImageDraw.Draw(grad)
    for r in range(fade):
        gd.line([(0, r), (W, r)], fill=int(255 * (r / fade) ** 1.3))
    c.paste(Image.new("RGB", (W, fade), CREAM), (0, IMG_H - fade), grad)
    # dezenter dunkler Verlauf oben für das Wordmark
    sh = 76
    tov = Image.new("RGBA", (W, sh), (0, 0, 0, 0)); tdd = ImageDraw.Draw(tov)
    for r in range(sh):
        tdd.line([(0, r), (W, r)], fill=(0, 0, 0, int(135 * (1 - r / sh))))
    c.paste(tov, (0, 0), tov)
    d = ImageDraw.Draw(c)
    tracked(d, (40, 26), "LUXESTYLE", f_brand, WHITE, tr=4)
    uw = d.textlength("luxestyle.ch", font=f_url)
    d.text((W - 40 - uw, 30), "luxestyle.ch", font=f_url, fill=(245, 240, 232))
    # Text-Band
    x = 56; y = IMG_H + 40
    d.rectangle([x, y, x + 66, y + 5], fill=GOLD); y += 28
    head, sub = parse(name)
    for ln in wrap(d, head, f_title, W - 2 * x)[:2]:
        d.text((x, y), ln, font=f_title, fill=INK); y += 64
    if sub:
        for ln in wrap(d, sub, f_sub, W - 2 * x)[:1]:
            d.text((x, y + 2), ln, font=f_sub, fill=GRAY); y += 42
    y += 20
    d.text((x, y + 24), "CHF", font=f_chf, fill=TAUPE)
    cw = d.textlength("CHF ", font=f_chf)
    d.text((x + cw, y), f"{float(price):.2f}", font=f_price, fill=INK)
    pill = "−10%  CODE WELCOME10"; pw = d.textlength(pill, font=f_promo)
    py = y + 20
    d.rounded_rectangle([W - x - pw - 52, py, W - x, py + 56], radius=28, fill=GOLD)
    d.text((W - x - pw - 26, py + 14), pill, font=f_promo, fill=INK)
    y += 100
    tracked(d, (x, H - 56), "SCHWEIZER ONLINE-SHOP   ·   WELTWEITER VERSAND", f_foot, TAUPE, tr=2)
    c.save(path, quality=90)

def main():
    only = None
    if "--only" in sys.argv:
        only = int(sys.argv[sys.argv.index("--only") + 1])
    items = collect()
    if only: items = items[:only]
    meta = []
    for i, (handle, title, price, img, cat) in enumerate(items, 1):
        board, tags, kw = BOARDS.get(cat, BOARDS["gift"])
        name = re.sub(r"\s*\([^)]*\)", "", title).strip()
        fn = f"px-{i:03d}-{slug(name)}.jpg"
        try:
            req = urllib.request.Request(img, headers={"User-Agent": "Mozilla/5.0"})
            im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=45).read())).convert("RGB")
        except Exception as e:
            print(f"  ⚠️ {fn} img fail: {e}"); continue
        render(im, name, price, os.path.join(OUT, fn))
        price_s = f"CHF {float(price):.2f}"
        pin_title = (name + " | LuxeStyle CH")[:100]
        emoji = {"dress":"☀️","jewel":"💎","beauty":"🧖‍♀️","home":"🏡","shoe":"👡","men":"👔","gift":"🎁"}.get(cat, "🛍️")
        desc = f"{name} {emoji} Schweizer Online-Shop, weltweiter Versand. {price_s} — −10% mit Code WELCOME10. {tags}"[:480]
        link = f"https://luxestyle.ch/products/{handle}"
        meta.append({"file": fn, "title": pin_title, "board": board, "desc": desc, "link": link, "kw": kw})
        print(f"  ✅ {fn}")
    json.dump(meta, open("/tmp/polish_meta.json", "w"), ensure_ascii=False)
    print(f"\n{len(meta)} polierte Pins gerendert → {OUT}")

if __name__ == "__main__":
    main()
