"""
aban news — Apple-Touch-Icon (180×180 PNG, Pillow).

Zeichnet das Marken-Kaffeetassen-Icon auf cremefarbenem Grund (iOS rundet
selbst ab, daher Vollfläche). Selbst gezeichnet, on-brand, keine externen Assets.

Run:   python3 generate_touch_icon.py
Check: python3 generate_touch_icon.py --check
Dep:   pip install pillow
"""
import argparse
import io
import os
import sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "apple-touch-icon.png")

BG = (254, 243, 199)      # cream
AMBER = (217, 119, 6)
AMBER_LT = (245, 158, 11)
AMBER_DK = (180, 83, 9)


def render():
    S = 180
    img = Image.new("RGB", (S, S), BG)
    d = ImageDraw.Draw(img)
    # Skala: Original viewBox 64 -> 180 (Faktor 2.8125)
    k = S / 64.0

    def sc(*xy):
        return [v * k for v in xy]

    # Dampf-Linien (zwei Bögen, vereinfacht als Linien mit Rundung)
    d.line(sc(26, 18, 26, 7), fill=AMBER, width=int(2.5 * k * 0.4))
    d.line(sc(38, 18, 38, 7), fill=AMBER, width=int(2.5 * k * 0.4))

    # Tassen-Körper (Polygon mit abgerundetem Boden)
    body = sc(14, 24, 14, 44)
    # Rechteck-Korpus
    d.rounded_rectangle(sc(14, 24, 50, 54), radius=int(10 * k), fill=AMBER)
    # Verlauf andeuten: oberer Bereich heller
    d.rounded_rectangle(sc(14, 24, 50, 38), radius=int(8 * k), fill=AMBER_LT)
    d.rectangle(sc(14, 31, 50, 40), fill=AMBER)
    # Kaffee-Oberfläche (Ellipse)
    d.ellipse(sc(14, 21, 50, 27), fill=AMBER_DK)
    # Henkel
    d.arc(sc(46, 30, 60, 46), start=-70, end=70, fill=AMBER, width=int(4 * k * 0.5))
    return img


def build(check=False):
    img = render()
    if check:
        if not os.path.exists(OUT):
            print("FEHLT: apple-touch-icon.png")
            return 1
        buf = io.BytesIO()
        img.save(buf, "PNG")
        if buf.getvalue() != open(OUT, "rb").read():
            print("DRIFT: apple-touch-icon.png weicht ab")
            return 1
        print("apple-touch-icon.png aktuell.")
        return 0
    img.save(OUT, "PNG")
    print("✓ apple-touch-icon.png (180×180)")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    sys.exit(build(check=args.check))
