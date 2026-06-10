#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — OG-Bild für den KI-Hype-Detektor (1200×630), deterministisch mit Pillow.

Erzeugt og-ki-hype-detektor.png — Marken-Look (Creme + Amber), Titel + Pitch,
ein angedeuteter „Score 0 vs 100"-Balken. Für besseres Teilen (LinkedIn/X/WhatsApp).
Aufruf: python3 brand/gen_og_hype.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "og-ki-hype-detektor.png")
CREAM = (255, 250, 242); DARK = (31, 41, 55); AMBER = (217, 119, 6)
AMBER_DK = (180, 83, 9); GREY = (90, 99, 112); OK = (21, 128, 61); BAD = (185, 28, 28)
FD = ["/usr/share/fonts/truetype/liberation", "/usr/share/fonts/truetype/dejavu"]


def font(names, size):
    for d in FD:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


B = lambda s: font(["LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf"], s)
R = lambda s: font(["LiberationSans-Regular.ttf", "DejaVuSans.ttf"], s)


def main():
    img = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 18, H], fill=AMBER_DK)           # Akzentbalken links
    d.rectangle([0, H - 10, W, H], fill=AMBER)          # Grundlinie

    # Marke
    d.text((70, 64), "aban", font=B(46), fill=DARK)
    aw = d.textlength("aban", font=B(46))
    d.text((70 + aw + 12, 64), "news", font=R(46), fill=AMBER)

    # Titel
    d.text((70, 150), "KI-Hype-Detektor", font=B(86), fill=DARK)
    # Pitch (2 Zeilen)
    d.text((70, 262), "Text einfügen → Buzzwords markiert,", font=R(40), fill=GREY)
    d.text((70, 312), "Hype-Score, Klartext-Übersetzung.", font=R(40), fill=GREY)

    # „Score 0 vs 100"-Demo-Balken
    by = 420
    d.text((70, by - 4), "ehrlich", font=B(26), fill=OK)
    d.text((1010, by - 4), "Hype", font=B(26), fill=BAD)
    bx0, bx1 = 70, 1130
    grad = Image.new("RGB", (bx1 - bx0, 26), CREAM)
    gp = grad.load()
    for x in range(bx1 - bx0):
        t = x / (bx1 - bx0 - 1)
        if t < 0.5:
            c = tuple(int(OK[i] + (AMBER[i] - OK[i]) * (t / 0.5)) for i in range(3))
        else:
            c = tuple(int(AMBER[i] + (BAD[i] - AMBER[i]) * ((t - 0.5) / 0.5)) for i in range(3))
        for y in range(26):
            gp[x, y] = c
    img.paste(grad, (bx0, by + 30))
    d.rounded_rectangle([bx0, by + 30, bx1, by + 56], radius=13, outline=AMBER_DK, width=2)

    # Fußzeile
    d.text((70, 530), "abannews.com  ·  gratis, ohne Login, kein Buzzword-Bingo", font=B(30), fill=AMBER_DK)

    img.save(OUT, "PNG")
    print(f"✓ {OUT} ({W}×{H})")


if __name__ == "__main__":
    main()
