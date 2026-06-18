#!/usr/bin/env python3
# =============================================================================
#  freegen_image — gratis Social-Image-Generator (Canva-Ersatz)
# -----------------------------------------------------------------------------
#  Erzeugt gebrandete Post-/Thumbnail-Bilder (Pillow): Kicker + Headline +
#  Subline + Markenzeile auf Farbe oder Hintergrundbild. Kostenlos, unbegrenzt,
#  ohne Abo. Für abannews-Newsletter, Hubs und Social-Posts.
#
#  Einzeln:
#    python3 automation/freegen_image.py \
#      --headline "KI ehrlich erklärt" --subline "Jeden Tag in 2 Minuten" \
#      --kicker "NEWSLETTER" --brand "ABANNEWS.COM" \
#      --out freegen/img/post.png --size 1080x1350 [--bg "#0b0b0c"] \
#      [--accent "#e8b04b"] [--image hintergrund.jpg]
#
#  Batch (JSON-Liste von obigen Feldern):
#    python3 automation/freegen_image.py --batch freegen/images.example.json
#
#  Größen-Kürzel: post=1080x1350 · square=1080x1080 · story=1080x1920 · og=1200x630
# =============================================================================

import argparse, json, os, sys
from PIL import Image, ImageDraw, ImageFont

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SIZES = {"post": (1080, 1350), "square": (1080, 1080), "story": (1080, 1920), "og": (1200, 630)}


def hex_rgb(s, default=(11, 11, 12)):
    if not s:
        return default
    s = s.lstrip("#")
    try:
        return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
    except Exception:
        return default


def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=font) <= max_w or not cur:
            cur = test
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines


def cover(img, w, h):
    iw, ih = img.size
    sc = max(w / iw, h / ih)
    img = img.resize((int(iw * sc), int(ih * sc)), Image.LANCZOS)
    x, y = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((x, y, x + w, y + h))


def parse_size(s):
    if s in SIZES:
        return SIZES[s]
    try:
        w, h = s.lower().split("x"); return (int(w), int(h))
    except Exception:
        return SIZES["post"]


def render(spec, out):
    w, h = parse_size(str(spec.get("size", "post")))
    accent = hex_rgb(spec.get("accent"), (232, 176, 75))
    base = Image.new("RGB", (w, h), hex_rgb(spec.get("bg"), (11, 11, 12)))
    if spec.get("image") and os.path.exists(spec["image"]):
        try:
            base = cover(Image.open(spec["image"]).convert("RGB"), w, h)
            base = Image.blend(base, Image.new("RGB", (w, h), (0, 0, 0)), 0.5)
        except Exception:
            pass
    d = ImageDraw.Draw(base)
    margin = int(w * 0.08)
    max_w = w - 2 * margin

    # Akzentbalken oben links
    d.rectangle([margin, int(h * 0.12), margin + int(w * 0.13), int(h * 0.12) + 10], fill=accent)

    y = int(h * 0.16)
    kicker = (spec.get("kicker") or "").upper()
    if kicker:
        kf = ImageFont.truetype(FONT_BOLD, int(w * 0.030))
        d.text((margin, y), kicker, font=kf, fill=accent)
        y += int(w * 0.055)

    # Headline
    hf = ImageFont.truetype(FONT_BOLD, int(w * 0.082))
    for ln in wrap(d, spec.get("headline", ""), hf, max_w):
        d.text((margin + 2, y + 2), ln, font=hf, fill=(0, 0, 0))
        d.text((margin, y), ln, font=hf, fill=(255, 255, 255))
        y += int(w * 0.092)

    # Subline
    sub = spec.get("subline", "")
    if sub:
        y += int(h * 0.01)
        sf = ImageFont.truetype(FONT_REG, int(w * 0.040))
        for ln in wrap(d, sub, sf, max_w):
            d.text((margin, y), ln, font=sf, fill=(210, 210, 215))
            y += int(w * 0.052)

    # Markenzeile unten
    brand = spec.get("brand", "")
    if brand:
        bf = ImageFont.truetype(FONT_BOLD, int(w * 0.034))
        by = int(h * 0.90)
        d.rectangle([margin, by - 14, margin + int(w * 0.06), by - 8], fill=accent)
        d.text((margin, by), brand, font=bf, fill=(245, 245, 245))

    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    base.save(out)
    print(f"✅ {out} ({w}x{h})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch")
    ap.add_argument("--headline"); ap.add_argument("--subline"); ap.add_argument("--kicker")
    ap.add_argument("--brand", default="ABANNEWS.COM"); ap.add_argument("--out", default="freegen/img/post.png")
    ap.add_argument("--size", default="post"); ap.add_argument("--bg"); ap.add_argument("--accent"); ap.add_argument("--image")
    a = ap.parse_args()
    if a.batch:
        items = json.load(open(a.batch, encoding="utf-8"))
        for it in items:
            render(it, it.get("out", "freegen/img/post.png"))
        return
    if not a.headline:
        sys.exit("❌ --headline nötig (oder --batch <json>)")
    render({k: getattr(a, k) for k in ["headline", "subline", "kicker", "brand", "size", "bg", "accent", "image"]}, a.out)


if __name__ == "__main__":
    main()
