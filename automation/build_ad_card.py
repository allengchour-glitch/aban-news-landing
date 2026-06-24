#!/usr/bin/env python3
"""build_ad_card.py — macht aus einem Alpenlicht-Produktbild eine FERTIGE, postbare No-Voice-Ad-Card:
Mundart-Hook oben + CHF-Preis-Badge + CTA (WELCOME10) — alles in der Safe-Zone (Text endet <= y1500),
dezente Verlauf-Scrims für Lesbarkeit, kleine Marke. 1080x1920 9:16. Gratis (Pillow), kein KI-Call.

Lauf: python3 automation/build_ad_card.py --image social/ai-lifestyle/x.png --hook "Sie loft nie a 🌊" \
        --price "CHF 24.90" [--cta "Jetzt shoppe · Code WELCOME10"] [--out social/cards/x-card.png]
"""
import argparse, os, textwrap, re
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Emojis/Symbole entfernen (DejaVu rendert sie als Tofu-Box). Text liest sich ohne genauso.
_EMOJI = re.compile("[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF\U00002B00-\U00002BFF\U0000FE00-\U0000FE0F\U00002190-\U000021FF\U00002300-\U000023FF]", flags=re.UNICODE)
def clean(s): return _EMOJI.sub("", s).replace("  ", " ").strip()

W, H = 1080, 1920
SAFE_BOTTOM = 1500  # Text endet hier (untere ~20% frei für Plattform-Caption)
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

def font(p, s): return ImageFont.truetype(p, s)

def fit_cover(im):
    im = im.convert("RGB")
    s = max(W / im.width, H / im.height)
    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    x = (im.width - W) // 2; y = (im.height - H) // 2
    return im.crop((x, y, x + W, H + y))

def scrim(img, top=True, height=560, alpha=170):
    grad = Image.new("L", (1, height), 0)
    for i in range(height):
        v = int(alpha * (1 - i / height)) if top else int(alpha * (i / height))
        grad.putpixel((0, i), v)
    grad = grad.resize((W, height))
    box = Image.new("RGBA", (W, height), (0, 0, 0, 255))
    box.putalpha(grad)
    img.alpha_composite(box, (0, 0 if top else H - height))

def draw_text(d, xy, text, f, fill="white", anchor="la", shadow=True):
    x, y = xy
    if shadow:
        d.text((x + 3, y + 3), text, font=f, fill=(0, 0, 0, 160), anchor=anchor)
    d.text((x, y), text, font=f, fill=fill, anchor=anchor)

def pill(d, cx, y, text, f, pad=34, fill=(255, 255, 255, 235), tcol=(20, 20, 20)):
    w = d.textlength(text, font=f); h = f.size
    x0 = cx - w / 2 - pad; x1 = cx + w / 2 + pad
    d.rounded_rectangle([x0, y, x1, y + h + pad], radius=(h + pad) // 2, fill=fill)
    d.text((cx, y + (h + pad) / 2), text, font=f, fill=tcol, anchor="mm")
    return y + h + pad

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True)
    ap.add_argument("--hook", required=True)
    ap.add_argument("--price", default="")
    ap.add_argument("--cta", default="Jetzt shoppe · Code WELCOME10")
    ap.add_argument("--brand", default="LUXESTYLE")
    ap.add_argument("--out", default="")
    a = ap.parse_args()
    out = a.out or os.path.join("social", "cards", os.path.splitext(os.path.basename(a.image))[0] + "-card.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)

    img = fit_cover(Image.open(a.image)).convert("RGBA")
    # Text NUR in OBERES Band (Marke+Hook+Preis) + UNTERES Band (CTA) -> Produkt-Mitte bleibt frei (kein Ueberdecken).
    scrim(img, top=True, height=620, alpha=175)
    scrim(img, top=False, height=300, alpha=190)
    d = ImageDraw.Draw(img)

    # OBEN: Marke, Hook, Preis-Pill
    draw_text(d, (70, 64), a.brand, font(FB, 40), fill=(255, 255, 255, 235))
    fh = font(FB, 74)
    lines = textwrap.wrap(clean(a.hook), width=21)[:2]
    y = 140
    for ln in lines:
        draw_text(d, (70, y), ln, fh)
        y += 90
    if a.price:
        # Preis links-buendig direkt unter dem Hook (im oberen Band, ueber dem Produkt)
        fp = font(FB, 58); txt = a.price; pad = 28
        w = d.textlength(txt, font=fp)
        d.rounded_rectangle([70, y + 10, 70 + w + 2 * pad, y + 10 + fp.size + pad], radius=(fp.size + pad) // 2, fill=(212, 175, 90, 245))
        d.text((70 + pad, y + 10 + (fp.size + pad) / 2), txt, font=fp, fill=(20, 20, 20), anchor="lm")

    # UNTEN: CTA-Leiste ganz unten (unter dem Produkt)
    pill(d, W // 2, H - 150, clean(a.cta), font(FB, 46), fill=(255, 255, 255, 242), tcol=(20, 20, 20))

    img.convert("RGB").save(out, quality=92)
    print("OK", out)

if __name__ == "__main__":
    main()
