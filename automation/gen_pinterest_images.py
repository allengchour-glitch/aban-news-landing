#!/usr/bin/env python3
"""
gen_pinterest_images.py — rendert für jeden Pin aus dropship/pinterest_pins.csv
ein gebrandetes Pinterest-Bild (1000x1500): Produktfoto + Markenband + Titel +
Preis-Anker + WELCOME10-Pill + Versandzeile. Output -> OUT_DIR (default /tmp/pins).

Aufruf: python3 automation/gen_pinterest_images.py [csv] [out_dir]
"""
import csv, os, re, sys, urllib.request, io
from PIL import Image, ImageDraw, ImageFont, ImageOps

CSV = sys.argv[1] if len(sys.argv) > 1 else "dropship/pinterest_pins.csv"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/pins"
os.makedirs(OUT, exist_ok=True)

W, H = 1000, 1500
IMG_H = 950
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
f_brand = ImageFont.truetype(FB, 34)
f_title = ImageFont.truetype(FB, 50)
f_sub   = ImageFont.truetype(FR, 28)
f_price = ImageFont.truetype(FB, 60)
f_promo = ImageFont.truetype(FB, 30)

ACCENT = "#e8b923"
INK = "#111111"

def slugify(s):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s[:60]

def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=font) <= max_w:
            cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines[:2]  # max 2 Zeilen

def parse_title(full):
    full = full.split("|")[0].strip()
    for sep in ["—", " - ", "·"]:
        if sep in full:
            head, sub = full.split(sep, 1)
            return head.strip(), sub.strip()
    return full, ""

def make_pin(row, idx):
    media = row["Media URL"].strip()
    head, sub = parse_title(row["Title"])
    m = re.search(r"CHF\s*([\d.]+)", row["Description"])
    price = f"CHF {m.group(1)}" if m else ""

    req = urllib.request.Request(media, headers={"User-Agent": "Mozilla/5.0"})
    raw = urllib.request.urlopen(req, timeout=30).read()
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    img = ImageOps.fit(img, (W, IMG_H), centering=(0.5, 0.4))

    canvas = Image.new("RGB", (W, H), "#ffffff")
    canvas.paste(img, (0, 0))
    d = ImageDraw.Draw(canvas)

    # Markenband
    d.rectangle([0, 0, W, 70], fill=INK)
    d.text((40, 18), "LUXESTYLE  ·  luxestyle.ch", font=f_brand, fill="#ffffff")

    # Textblock
    d.rectangle([0, IMG_H, W, H], fill="#ffffff")
    y = IMG_H + 45
    for line in wrap(d, head, f_title, W - 80):
        d.text((40, y), line, font=f_title, fill=INK); y += 58
    if sub:
        for line in wrap(d, sub, f_sub, W - 80)[:1]:
            d.text((40, y + 4), line, font=f_sub, fill="#555555"); y += 40
    y += 20
    if price:
        d.text((40, y), price, font=f_price, fill=INK); y += 90
    pill = "−10% mit Code WELCOME10"
    pw = d.textlength(pill, font=f_promo)
    d.rounded_rectangle([40, y, 40 + pw + 60, y + 60], radius=30, fill=ACCENT)
    d.text((70, y + 13), pill, font=f_promo, fill=INK)
    d.text((40, H - 70), "Schweizer Online-Shop · weltweiter Versand", font=f_sub, fill="#777777")

    name = f"pin-{idx:02d}-{slugify(head)}.jpg"
    canvas.save(os.path.join(OUT, name), quality=88)
    return name

def main():
    with open(CSV, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    print(f"{len(rows)} Pins → rendere nach {OUT}")
    for i, row in enumerate(rows, 1):
        try:
            name = make_pin(row, i)
            print(f"  ✅ {name}")
        except Exception as e:
            print(f"  ⚠️ Zeile {i} ({row.get('Title','?')[:40]}): {e}")
    print("fertig.")

if __name__ == "__main__":
    main()
