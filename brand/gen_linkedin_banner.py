#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — LinkedIn-Banner (1584×396) markenkonform, deterministisch mit Pillow.

Erzeugt brand/linkedin-banner.png (persönliches Profil & Unternehmensseite nutzbar).
Marke: Kaffeetasse-Icon (amber #f59e0b→#d97706), Wortmarke „aban" (#1f2937) + „news" (#d97706),
warmer Creme-Hintergrund. Text bleibt rechts/mittig, damit das Profilbild unten links nichts verdeckt.
Reine Pillow-Primitive — scharfe Schrift (KI-Bild verhext Text). Aufruf: python3 brand/gen_linkedin_banner.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1584, 396
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "brand", "linkedin-banner.png")

CREAM = (255, 250, 242)
DARK = (31, 41, 55)        # #1f2937
AMBER = (217, 119, 6)      # #d97706
AMBER_LT = (245, 158, 11)  # #f59e0b
AMBER_DK = (180, 83, 9)    # #b45309
GREY = (90, 99, 112)

FONT_DIRS = ["/usr/share/fonts/truetype/liberation", "/usr/share/fonts/truetype/dejavu"]


def font(names, size):
    for d in FONT_DIRS:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


F_BOLD = lambda s: font(["LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf"], s)
F_REG = lambda s: font(["LiberationSans-Regular.ttf", "DejaVuSans.ttf"], s)


def vgradient(w, h, top, bot):
    base = Image.new("RGB", (w, h), top)
    px = base.load()
    for y in range(h):
        t = y / max(1, h - 1)
        px_row = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = px_row
    return base


def coffee_cup(draw, cx, cy, scale):
    """Stilisierte Kaffeetasse + Dampf im aban-Look, zentriert um (cx, cy)."""
    s = scale
    # Dampf (zwei geschwungene Striche)
    for dx in (-7 * s, 7 * s):
        pts = [(cx + dx - 3 * s, cy - 30 * s), (cx + dx + 4 * s, cy - 38 * s),
               (cx + dx - 3 * s, cy - 46 * s), (cx + dx + 4 * s, cy - 54 * s)]
        draw.line(pts, fill=AMBER, width=max(2, int(3 * s)), joint="curve")
    # Tassenkörper (abgerundetes Rechteck, amber)
    bw, bh = 38 * s, 34 * s
    x0, y0 = cx - bw / 2, cy - 14 * s
    draw.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=10 * s, fill=AMBER_LT)
    draw.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=10 * s, outline=AMBER_DK, width=max(1, int(1.5 * s)))
    # Oberer Rand (Ellipse)
    draw.ellipse([x0, y0 - 6 * s, x0 + bw, y0 + 6 * s], fill=AMBER_DK)
    draw.ellipse([x0 + 3 * s, y0 - 4 * s, x0 + bw - 3 * s, y0 + 4 * s], fill=(255, 240, 214))
    # Henkel
    draw.arc([x0 + bw - 6 * s, y0 + 4 * s, x0 + bw + 22 * s, y0 + 28 * s],
             start=300, end=60, fill=AMBER, width=max(3, int(5 * s)))


def main():
    img = vgradient(W, H, (255, 252, 246), CREAM)
    d = ImageDraw.Draw(img)

    # dezenter amber Akzentbalken links (schmal, stört Avatar nicht)
    d.rectangle([0, 0, 14, H], fill=AMBER_DK)
    # feine Grundlinie
    d.rectangle([0, H - 6, W, H], fill=AMBER_LT)

    # Inhalt rechts der Avatar-Zone (Avatar sitzt unten links ~0..300px)
    left = 360
    # Logo-Zeile: Tasse + Wortmarke
    coffee_cup(d, left + 22, 96, 1.05)
    wx = left + 105
    aban_f = F_BOLD(58)
    d.text((wx, 66), "aban", font=aban_f, fill=DARK)
    abw = d.textlength("aban", font=aban_f)
    d.text((wx + abw + 12, 66), "news", font=F_REG(58), fill=AMBER)

    # Claim (Headline)
    d.text((left, 168), "KI in 5 Minuten — ohne Hype.", font=F_BOLD(62), fill=DARK)

    # Subline
    d.text((left, 250), "Der ehrliche KI-Newsletter für den DACH-Mittelstand.",
           font=F_REG(34), fill=GREY)

    # Footer-Zeile: URL + Nutzenpunkte
    d.text((left, 312), "abannews.com", font=F_BOLD(32), fill=AMBER_DK)
    url_w = d.textlength("abannews.com", font=F_BOLD(32))
    d.text((left + url_w + 24, 316), "·  täglich  ·  kostenlos  ·  kein Buzzword-Bingo",
           font=F_REG(28), fill=GREY)

    img.save(OUT, "PNG")
    print(f"✓ {OUT} ({W}×{H})")


if __name__ == "__main__":
    main()
