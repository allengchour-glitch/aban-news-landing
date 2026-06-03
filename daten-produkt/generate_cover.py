#!/usr/bin/env python3
"""Cover-Bild für die Gumroad-Verkaufsseite des KI-Tools-Datensatzes.

On-brand (Amber/Cream wie die aban-news-Site), 1280×720, reine Pillow.
  python3 generate_cover.py            # -> dist/cover-datensatz.png

Nur ein Bild — kein Upload. Die PNG bekommst du, hochladen zu Gumroad machst du.
"""
import glob
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE / "dist" / "cover-datensatz.png"

# Marken-Farben (siehe CLAUDE.md :root)
BG       = (255, 251, 245)   # #fffbf5
CREAM    = (254, 243, 199)   # #fef3c7
AMBER    = (217, 119, 6)     # #d97706
AMBER_D  = (180, 83, 9)      # #b45309
INK      = (31, 41, 55)      # #1f2937
MUTED    = (90, 100, 115)


def font(size, bold=True):
    cands = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ] + glob.glob("/usr/share/fonts/**/DejaVuSans*.ttf", recursive=True)
    for c in cands:
        try:
            return ImageFont.truetype(c, size)
        except Exception:
            continue
    return ImageFont.load_default()


def main():
    W, H = 1280, 720
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # linker Amber-Balken
    d.rectangle([0, 0, 18, H], fill=AMBER)
    # dezentes Cream-Feld oben rechts
    d.rectangle([0, 0, W, 92], fill=CREAM)

    # Marke oben
    d.text((60, 30), "aban news", font=font(34, True), fill=AMBER_D)
    d.text((W - 360, 38), "CSV + JSON · sofort-Download", font=font(22, False), fill=MUTED)

    # Titel
    d.text((60, 170), "KI-Tools-Datensatz", font=font(78, True), fill=INK)
    d.text((60, 262), "DACH", font=font(78, True), fill=AMBER)
    # "DACH" + Zusatz auf einer Linie
    dach_w = d.textlength("DACH", font=font(78, True))
    d.text((60 + dach_w + 28, 290), "— 326 Tools", font=font(46, True), fill=INK)

    # Feature-Zeilen
    feats = [
        "Name · Bereich · EU-Hosting · offizielle URL",
        "53 Tools mit bestätigtem EU-Hosting markiert",
        "von Hand kuratiert — keine erfundenen Bewertungen",
    ]
    y = 410
    for f in feats:
        d.ellipse([60, y + 9, 76, y + 25], fill=AMBER)
        d.text((92, y), f, font=font(30, False), fill=INK)
        y += 56

    # Preis-Badge unten rechts
    bx0, by0, bx1, by1 = W - 260, H - 150, W - 60, H - 70
    d.rounded_rectangle([bx0, by0, bx1, by1], radius=16, fill=AMBER_D)
    d.text((bx0 + 40, by0 + 16), "19 €", font=font(48, True), fill=(255, 255, 255))

    # Fußzeile
    d.text((60, H - 64), "abannews.com · Einzelplatz-Nutzung · Stand laufend",
           font=font(22, False), fill=MUTED)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG")
    print(f"✅ Cover: {OUT}  ({OUT.stat().st_size // 1024} KB, {W}×{H})")


if __name__ == "__main__":
    main()
