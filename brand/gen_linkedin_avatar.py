#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — LinkedIn-Logo-Quadrat (400×400) markenkonform, deterministisch mit Pillow.

Erzeugt brand/linkedin-avatar.png — als Profilbild der Unternehmensseite (LinkedIn zeigt es
im Feed als Kreis, daher zentriert mit Rand). Amber-Hintergrund, cremefarbene Kaffeetasse,
Wortmarke „aban news" in Weiß. Aufruf: python3 brand/gen_linkedin_avatar.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

S = 400
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "brand", "linkedin-avatar.png")

AMBER_LT = (245, 158, 11)
AMBER_DK = (180, 83, 9)
CREAM = (255, 248, 235)
WHITE = (255, 255, 255)
FONT_DIRS = ["/usr/share/fonts/truetype/liberation", "/usr/share/fonts/truetype/dejavu"]


def font(names, size):
    for d in FONT_DIRS:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def vgradient(w, h, top, bot):
    base = Image.new("RGB", (w, h), top)
    px = base.load()
    for y in range(h):
        t = y / max(1, h - 1)
        row = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = row
    return base


def coffee_cup(d, cx, cy, sc):
    for dx in (-13 * sc, 13 * sc):
        pts = [(cx + dx - 6 * sc, cy - 54 * sc), (cx + dx + 7 * sc, cy - 68 * sc),
               (cx + dx - 6 * sc, cy - 82 * sc), (cx + dx + 7 * sc, cy - 96 * sc)]
        d.line(pts, fill=CREAM, width=max(3, int(6 * sc)), joint="curve")
    bw, bh = 70 * sc, 62 * sc
    x0, y0 = cx - bw / 2, cy - 26 * sc
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=18 * sc, fill=CREAM)
    d.ellipse([x0, y0 - 11 * sc, x0 + bw, y0 + 11 * sc], fill=(236, 223, 200))
    d.ellipse([x0 + 6 * sc, y0 - 7 * sc, x0 + bw - 6 * sc, y0 + 7 * sc], fill=WHITE)
    d.arc([x0 + bw - 12 * sc, y0 + 8 * sc, x0 + bw + 40 * sc, y0 + 50 * sc],
          start=300, end=60, fill=CREAM, width=max(6, int(9 * sc)))


def main():
    img = vgradient(S, S, AMBER_LT, AMBER_DK)
    d = ImageDraw.Draw(img)
    # Tasse zentriert oben
    coffee_cup(d, S // 2, 168, 1.25)
    # Wortmarke unten, zentriert
    f = font(["LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf"], 56)
    txt = "aban news"
    w = d.textlength(txt, font=f)
    d.text(((S - w) / 2, 270), txt, font=f, fill=WHITE)
    # feine Unterzeile
    fs = font(["LiberationSans-Regular.ttf", "DejaVuSans.ttf"], 24)
    sub = "KI in 5 Minuten"
    ws = d.textlength(sub, font=fs)
    d.text(((S - ws) / 2, 336), sub, font=fs, fill=CREAM)
    img.save(OUT, "PNG")
    print(f"✓ {OUT} ({S}×{S})")


if __name__ == "__main__":
    main()
