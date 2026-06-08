"""
aban news — OG-Image-Generator für die KI-Reels-Seite (1200×630, Pillow).
Stil identisch zu og-hype.png (gleicher Font-Loader, Brand-Farben, Amber-Formen).
Run:  python3 generate_reels_og.py   →  og-reels.png
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
    # Badge
    badge = "TÄGLICH NEU · VIDEO"
    bf = font(24)
    bb = d.textbbox((0, 0), badge, font=bf)
    d.rounded_rectangle([70, 140, 70 + (bb[2] - bb[0]) + 44, 140 + (bb[3] - bb[1]) + 26], radius=18, fill=CREAM)
    d.text((92, 152), badge, font=bf, fill=AMBER_DK)
    # Titel + Untertitel
    d.text((70, 212), "KI-Reels", font=font(96), fill=INK)
    y = 212 + 96 + 30
    for ln in ["Ehrliche Tool-Checks", "in 20 Sekunden."]:
        d.text((70, y), ln, font=font(46), fill=AMBER_DK)
        y += 62
    # Drei 9:16-Reel-Kacheln mit Play-Dreieck (Video-Anspielung)
    rx, ry, rw, rh = 760, 150, 110, 196
    for i in range(3):
        x = rx + i * 130
        d.rounded_rectangle([x, ry + i * 14, x + rw, ry + i * 14 + rh], radius=16, fill=INK)
        cx, cy = x + rw // 2, ry + i * 14 + rh // 2
        d.polygon([(cx - 14, cy - 18), (cx - 14, cy + 18), (cx + 20, cy)], fill=CREAM)
    # Footer
    d.text((70, H - 78), "Tool-Checks · Faktenchecks  ·  abannews.com/reels",
           font=font(26, bold=False), fill=MUTED)
    img.save(os.path.join(ROOT, "og-reels.png"), "PNG")
    print("✓ og-reels.png erstellt")


if __name__ == "__main__":
    build()
