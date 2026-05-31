"""
aban news — OG-Image-Generator für die Kurs-Verkaufsseite (1200×630, Pillow).

Erzeugt das Open-Graph-Bild für kurs.html → og-kurs.png.
Stil identisch zu og-buch.png / og-ebook.png: gleicher Font-Loader,
gleiche Brand-Farben, gleiche Amber-Akzent-Formen.

Run:  python3 generate_kurs_og.py
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


def make(out, badge, title, subs, foot, title_size=118):
    """Layout 1:1 wie generate_buch_og.make() — gleicher Look wie og-ebook.png."""
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # Amber-Akzent-Formen
    d.ellipse([W - 520, -260, W + 260, 360], fill=CREAM)
    d.rectangle([0, 0, 16, H], fill=AMBER)
    # Marke
    d.text((70, 70), "☕  aban news", font=font(34), fill=AMBER_DK)
    # Badge
    bf = font(24)
    bb = d.textbbox((0, 0), badge, font=bf)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    d.rounded_rectangle([70, 140, 70 + bw + 44, 140 + bh + 26], radius=18, fill=CREAM)
    d.text((92, 152), badge, font=bf, fill=AMBER_DK)
    # Titel
    d.text((70, 212), title, font=font(title_size), fill=INK)
    # Untertitel-Zeilen
    y = 212 + title_size + 30
    sf = font(44)
    for ln in subs:
        d.text((70, y), ln, font=sf, fill=AMBER_DK)
        y += 60
    # Footer
    d.text((70, H - 78), foot, font=font(26, bold=False), fill=MUTED)
    img.save(os.path.join(ROOT, out), "PNG")
    print("✓ %s erstellt" % out)


def build():
    make(
        "og-kurs.png",
        "DER KURS · 6 MODULE + 6 BONI",
        "Die KI-Werkstatt",
        ["KI im Arbeitsalltag nutzen", "— ohne Hype"],
        "48 Seiten · 50 Prompts  ·  abannews.com/kurs.html",
        title_size=92,
    )


if __name__ == "__main__":
    build()
