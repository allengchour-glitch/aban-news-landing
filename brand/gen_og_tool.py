#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — OG-Bilder für Tool-Seiten (1200×630), deterministisch mit Pillow.

Erzeugt og-<slug>.png im Marken-Look (Creme + Amber): Wortmarke, Titel (auto-fit),
Untertitel (umgebrochen), Fußzeile. Für besseres Teilen (LinkedIn/X/WhatsApp).
Aufruf: python3 brand/gen_og_tool.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREAM = (255, 250, 242); DARK = (31, 41, 55); AMBER = (217, 119, 6)
AMBER_DK = (180, 83, 9); GREY = (90, 99, 112)
FD = ["/usr/share/fonts/truetype/liberation", "/usr/share/fonts/truetype/dejavu"]

# (slug, Titel, Untertitel)
TOOLS = [
    ("ki-bullshit-bingo", "KI-Bullshit-Bingo",
     "Buzzword-Bingo fürs nächste „KI-Strategie“-Meeting. Spielbar & druckbar."),
    ("ki-richtlinie", "KI-Richtlinie fürs Team",
     "In 1 Minute klare Nutzungsregeln — erlaubte Tools, Tabu-Daten, Prüfpflicht."),
    ("ki-prompt-checker", "Prompt-Verbesserer",
     "Prompt einfügen → Score, was fehlt (Rolle, Format, Beispiel) + besseres Gerüst."),
    ("avv-anfrage", "AVV-Anfrage-Generator",
     "Fertige E-Mail: AVV/DPA + die richtigen Datenschutz-Fragen an den KI-Anbieter."),
]


def font(names, size):
    for d in FD:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def fit_font(draw, text, names, max_w, start, min_size=44):
    s = start
    while s > min_size:
        f = font(names, s)
        if draw.textlength(text, font=f) <= max_w:
            return f
        s -= 3
    return font(names, min_size)


def wrap(draw, text, f, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=f) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def make(slug, title, sub):
    img = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 18, H], fill=AMBER_DK)
    d.rectangle([0, H - 10, W, H], fill=AMBER)
    # Marke
    d.text((70, 60), "aban", font=font(["LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf"], 44), fill=DARK)
    aw = d.textlength("aban", font=font(["LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf"], 44))
    d.text((70 + aw + 11, 60), "news", font=font(["LiberationSans-Regular.ttf", "DejaVuSans.ttf"], 44), fill=AMBER)
    # Titel (auto-fit auf eine Zeile)
    tf = fit_font(d, title, ["LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf"], W - 140, 84)
    d.text((70, 175), title, font=tf, fill=DARK)
    # Untertitel (umgebrochen, max 3 Zeilen)
    sf = font(["LiberationSans-Regular.ttf", "DejaVuSans.ttf"], 38)
    lines = wrap(d, sub, sf, W - 140)[:3]
    y = 300
    for ln in lines:
        d.text((70, y), ln, font=sf, fill=GREY)
        y += 52
    # Fußzeile
    d.text((70, 540), "abannews.com  ·  gratis, ohne Login, kein Buzzword-Bingo",
           font=font(["LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf"], 28), fill=AMBER_DK)
    out = os.path.join(ROOT, "og-" + slug + ".png")
    img.save(out, "PNG")
    return out


def main():
    for slug, title, sub in TOOLS:
        print("✓", make(slug, title, sub))


if __name__ == "__main__":
    main()
