"""
aban news — OG-Image für das KI-Sichtbarkeit-Komplett-Paket (1200×630, Pillow).
Stil identisch zu og-hype.png. Run: python3 generate_sichtbarkeit_paket_og.py → og-sichtbarkeit-paket.png
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


def build():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.ellipse([W - 520, -260, W + 260, 360], fill=CREAM)
    d.rectangle([0, 0, 16, H], fill=AMBER)
    d.text((70, 70), "☕  aban news", font=font(34), fill=AMBER_DK)
    badge = "KOMPLETT-PAKET · 29 €"
    bf = font(24)
    bb = d.textbbox((0, 0), badge, font=bf)
    d.rounded_rectangle([70, 140, 70 + (bb[2] - bb[0]) + 44, 140 + (bb[3] - bb[1]) + 26], radius=18, fill=CREAM)
    d.text((92, 152), badge, font=bf, fill=AMBER_DK)
    d.text((70, 208), "Von KI gefunden", font=font(80), fill=INK)
    d.text((70, 208 + 88), "werden", font=font(80), fill=INK)
    y = 208 + 88 + 96
    for ln in ["Buch + 3 Monate Monitor + Vorlage"]:
        d.text((70, y), ln, font=font(40), fill=AMBER_DK)
        y += 56
    d.text((70, H - 78), "ChatGPT · Perplexity · Google AI  ·  abannews.com/ki-paket",
           font=font(26, bold=False), fill=MUTED)
    img.save(os.path.join(ROOT, "og-sichtbarkeit-paket.png"), "PNG")
    print("✓ og-sichtbarkeit-paket.png erstellt")


if __name__ == "__main__":
    build()
