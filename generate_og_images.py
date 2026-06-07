"""
aban news — Social-/OG-Image-Generator (1200×630, Pillow).

Erzeugt die Open-Graph-Bilder für die Money-/eBook-Seiten:
  og-ebook.png · og-ki-tools.png · og-chatgpt.png

Run:  python3 generate_og_images.py
Dep:  pip install pillow
"""
import glob
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))

AMBER = (217, 119, 6)
AMBER_DK = (180, 83, 9)
CREAM = (254, 243, 199)
INK = (31, 41, 55)
MUTED = (107, 114, 128)
BG = (255, 251, 245)


def font(size, bold=True):
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


def make(out, badge, title, subs, foot, title_size=110):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.ellipse([W - 520, -260, W + 260, 360], fill=CREAM)
    d.rectangle([0, 0, 16, H], fill=AMBER)
    d.text((70, 70), "☕  aban news", font=font(34), fill=AMBER_DK)
    bf = font(24)
    bb = d.textbbox((0, 0), badge, font=bf)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    d.rounded_rectangle([70, 140, 70 + bw + 44, 140 + bh + 26], radius=18, fill=CREAM)
    d.text((92, 152), badge, font=bf, fill=AMBER_DK)
    d.text((70, 212), title, font=font(title_size), fill=INK)
    y = 212 + title_size + 30
    sf = font(44)
    for ln in subs:
        d.text((70, y), ln, font=sf, fill=AMBER_DK)
        y += 60
    d.text((70, H - 78), foot, font=font(26, bold=False), fill=MUTED)
    img.save(os.path.join(ROOT, out), "PNG")
    print("✓ %s erstellt" % out)


def build():
    make("og-ebook.png", "GRATIS eBOOK", "Anti-Hype",
         ["Wie deutsche Solopreneure", "KI ohne Bullshit einsetzen"],
         "abannews.com  ·  3-Fragen-Filter · minimaler Stack · 7 Hype-Fallen",
         title_size=118)
    make("og-ki-tools.png", "KI-TOOLS 2026", "Der ehrliche Stack",
         ["Was Selbstständige wirklich brauchen —", "und was nur Zeit kostet"],
         "abannews.com  ·  nach Nutzen, Preis & DSGVO sortiert", title_size=96)
    make("og-chatgpt.png", "CHATGPT-GUIDE", "Echter Nutzen",
         ["ChatGPT für Solopreneure —", "7 Anwendungen, klare Grenzen"],
         "abannews.com  ·  ohne Prompt-Magie-Versprechen", title_size=96)
    make("og-3d-druck.png", "3D-DRUCK & POD", "Mit KI Geld verdienen",
         ["Eigene Designs verkaufen —", "ohne eigene Maschine"],
         "abannews.com  ·  ehrlich gerechnet: Margen, Recht, Anbieter", title_size=92)


if __name__ == "__main__":
    build()
