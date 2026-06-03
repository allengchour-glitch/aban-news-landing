"""
aban news — OG-Bild für den Tool-Hub `online-tools.html` (1200×630, Pillow).

Erzeugt `og-tools.png` im Repo-Root (selbe Konvention wie og-hype.png / og-ebook.png).
Selbst gezeichnet (Amber/Cream, System-Stil) — keine Stockfotos, keine externen Fonts.
Idempotent: gleiche Daten -> gleiches Bild.

Run:    python3 generate_tools_og.py
Check:  python3 generate_tools_og.py --check   (Exit 1 bei Abweichung)
Dep:    pip install pillow
"""
import argparse
import glob
import io
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "og-tools.png")

AMBER = (217, 119, 6)
AMBER_DK = (180, 83, 9)
CREAM = (254, 243, 199)
AMBER_LT = (253, 233, 200)
INK = (31, 41, 55)
MUTED = (107, 114, 128)
BG = (255, 251, 245)
CARD = (255, 255, 255)

# Mini-Kacheln (Symbol/Kürzel) — signalisiert „viele kleine Tools"
TILES = [
    "{ }", "QR", "%", "#", ".*", "</>",
    "0x", "⌚", "Aa", "RGB", "≠", "€",
]


def font(size, bold=True, mono=False):
    if mono:
        cands = ["/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"]
    else:
        cands = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
                 else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                 "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold
                 else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"]
    cands += glob.glob("/usr/share/fonts/**/DejaVuSans*.ttf", recursive=True)
    for c in cands:
        if c and os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def center_text(d, cx, cy, text, fnt, fill):
    bb = d.textbbox((0, 0), text, font=fnt)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    d.text((cx - w / 2 - bb[0], cy - h / 2 - bb[1]), text, font=fnt, fill=fill)


def render():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # Deko: Cream-Kreis oben rechts, Amber-Kante links
    d.ellipse([W - 520, -300, W + 300, 320], fill=CREAM)
    d.rectangle([0, 0, 16, H], fill=AMBER)

    # Marke
    d.text((70, 60), "☕  aban news", font=font(34), fill=AMBER_DK)

    # Badge
    bf = font(24)
    badge = "GRATIS-TOOLS"
    bb = d.textbbox((0, 0), badge, font=bf)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    d.rounded_rectangle([70, 128, 70 + bw + 44, 128 + bh + 26], radius=18, fill=AMBER_LT)
    d.text((92, 140), badge, font=bf, fill=AMBER_DK)

    # Titel
    tf = font(92)
    d.text((70, 196), "26 kostenlose Tools", font=tf, fill=INK)
    d.text((70, 196 + 92 + 10), "für Selbstständige", font=tf, fill=AMBER_DK)

    # Unterzeile
    d.text((70, 418), "Kein Login · kein Upload · kein Tracking",
           font=font(38, bold=False), fill=INK)

    # Mini-Kachel-Reihe (zwei Reihen à 6) unten
    tile = 70
    gap = 16
    x0, y0 = 70, 478
    tfnt = font(30, mono=True)
    for i, label in enumerate(TILES):
        col = i % 6
        row = i // 6
        x = x0 + col * (tile + gap)
        y = y0 + row * (tile + gap)
        if y + tile > H - 70:  # Platz für Fußzeile lassen -> nur erste Reihe
            break
        d.rounded_rectangle([x, y, x + tile, y + tile], radius=14,
                            fill=CARD, outline=AMBER_LT, width=2)
        center_text(d, x + tile / 2, y + tile / 2, label, tfnt, AMBER_DK)

    # Fuß
    d.text((W - 470, H - 60), "abannews.com/werkzeuge",
           font=font(26, bold=False), fill=MUTED)
    return img


def build(check=False):
    img = render()
    if check:
        if not os.path.exists(OUT):
            print("FEHLT: og-tools.png")
            return 1
        buf = io.BytesIO()
        img.save(buf, "PNG")
        if buf.getvalue() != open(OUT, "rb").read():
            print("DRIFT: og-tools.png weicht ab")
            return 1
        print("og-tools.png aktuell.")
        return 0
    img.save(OUT, "PNG")
    print("✓ og-tools.png")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="nur prüfen, nichts schreiben")
    args = ap.parse_args()
    sys.exit(build(check=args.check))
