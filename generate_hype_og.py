"""
aban news — OG-Image-Generator für den Hype-Filter (1200×630, Pillow).

Erzeugt das Open-Graph-Bild für hype-filter.html → og-hype.png.
Stil identisch zu og-kurs.png / og-ebook.png: gleicher Font-Loader,
gleiche Brand-Farben, gleiche Amber-Akzent-Formen.

Run:  python3 generate_hype_og.py
Dep:  pip install pillow
"""
import glob
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))

# Brand-Farben — übernommen aus generate_og_images.py
AMBER = (217, 119, 6)
AMBER_DK = (180, 83, 9)
CREAM = (254, 243, 199)
INK = (31, 41, 55)
MUTED = (107, 114, 128)
BG = (255, 251, 245)
STRIKE = (160, 22, 22)


def font(size, bold=True):
    """Font-Loader — identisch zu generate_og_images.py (matcht og-ebook.png)."""
    cands = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ] + glob.glob("/usr/share/fonts/**/DejaVuSans*.ttf", recursive=True)
    for c in cands:
        if c and os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def build():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # Amber-Akzent-Formen (wie og-kurs.png)
    d.ellipse([W - 520, -260, W + 260, 360], fill=CREAM)
    d.rectangle([0, 0, 16, H], fill=AMBER)
    # Marke
    d.text((70, 70), "☕  aban news", font=font(34), fill=AMBER_DK)
    # Badge
    badge = "GRATIS-TOOL · KEIN LOGIN"
    bf = font(24)
    bb = d.textbbox((0, 0), badge, font=bf)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    d.rounded_rectangle([70, 140, 70 + bw + 44, 140 + bh + 26], radius=18, fill=CREAM)
    d.text((92, 152), badge, font=bf, fill=AMBER_DK)
    # Titel
    d.text((70, 212), "Der Hype-Filter", font=font(96), fill=INK)
    # Untertitel
    y = 212 + 96 + 30
    for ln in ["Wie viel Hype steckt", "in deinem Text?"]:
        d.text((70, y), ln, font=font(46), fill=AMBER_DK)
        y += 62
    # „durchgestrichene" Buzzwords als visuelle Anspielung
    chips = ["revolutionär", "Game-Changer", "10x", "bahnbrechend"]
    cy = y + 24
    cx = 70
    cf = font(28, bold=False)
    for w in chips:
        cb = d.textbbox((0, 0), w, font=cf)
        cw = cb[2] - cb[0]
        d.rounded_rectangle([cx, cy, cx + cw + 28, cy + 46], radius=12, outline=STRIKE, width=2)
        d.text((cx + 14, cy + 8), w, font=cf, fill=STRIKE)
        d.line([cx + 8, cy + 24, cx + cw + 20, cy + 24], fill=STRIKE, width=3)
        cx += cw + 28 + 18
    # Footer
    d.text((70, H - 78), "Buzzwords · Füllwörter · Lesbarkeit  ·  abannews.com/hype",
           font=font(26, bold=False), fill=MUTED)
    img.save(os.path.join(ROOT, "og-hype.png"), "PNG")
    print("✓ og-hype.png erstellt")


if __name__ == "__main__":
    build()
