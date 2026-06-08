#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gen_hub_placeholder.py — keyless Marken-Platzhalter für Branchen-Hub-Bilder.

Erzeugt img/site/hub-<slug>.jpg als sauberes, markentypisches Platzhalterbild
(Pillow, KEIN API-Key). Beseitigt 404s, wenn (noch) kein Pexels-Foto vorliegt.
Label wird aus ki-fuer-<slug>.html (Titel »… für <Branche> ·«) gezogen.

Upgrade auf echtes Foto später: Datei löschen + automation/gen_site_images.py
mit PEXELS_API_KEY laufen lassen (make_one überspringt vorhandene Dateien).

Run:  python3 tools/gen_hub_placeholder.py <slug1> <slug2> ...
"""
import glob
import os
import re
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREAM, AMBER, AMBER_DK, INK, MUTED = (254, 243, 199), (217, 119, 6), (180, 83, 9), (31, 41, 55), (107, 114, 128)
BG = (255, 251, 245)


def font(size, bold=True):
    cands = [("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
              else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")] + \
        glob.glob("/usr/share/fonts/**/DejaVuSans*.ttf", recursive=True)
    for c in cands:
        if c and os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def label_for(slug):
    hub = os.path.join(ROOT, f"ki-fuer-{slug}.html")
    label = None
    if os.path.exists(hub):
        s = open(hub, encoding="utf-8").read()
        m = re.search(r"KI-Sichtbarkeit für ([^·<]+?)\s*[·<]", s) or re.search(r"<title>[^—]*für ([^—·<]+)", s)
        if m:
            label = m.group(1).strip()
    if not label:
        label = slug.replace("ae", "ä").replace("oe", "ö").replace("ue", "ü").replace("-", " ").title()
    # führende Artikel entfernen ("den Angelladen" -> "Angelladen")
    label = re.sub(r"^(den|das|die|der|dem|ein|eine|einen)\s+", "", label, flags=re.I)
    return label


def wrap(d, text, fnt, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textbbox((0, 0), t, font=fnt)[2] <= maxw:
            cur = t
        else:
            lines.append(cur) if cur else None
            cur = w
    if cur:
        lines.append(cur)
    return lines


def make(slug):
    W, H = 1600, 1000
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.ellipse([W - 700, -360, W + 360, 500], fill=CREAM)
    d.rectangle([0, 0, 22, H], fill=AMBER)
    d.text((80, 90), "☕  aban news", font=font(46), fill=AMBER_DK)
    d.text((80, 165), "KI-Sichtbarkeit für lokale Betriebe", font=font(34, bold=False), fill=MUTED)
    label = label_for(slug)
    y = 360
    for ln in wrap(d, label, font(104), W - 200)[:3]:
        d.text((80, y), ln, font=font(104), fill=INK)
        y += 120
    d.text((80, H - 110), "Wirst du von ChatGPT & Co. empfohlen?  ·  abannews.com",
           font=font(32, bold=False), fill=AMBER_DK)
    out = os.path.join(ROOT, "img", "site", f"hub-{slug}.jpg")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    img.save(out, "JPEG", quality=86)
    return out


def main():
    slugs = sys.argv[1:]
    if not slugs:
        print("Usage: gen_hub_placeholder.py <slug> ...")
        return
    for s in slugs:
        p = make(s)
        print("✓", os.path.relpath(p, ROOT), f"({label_for(s)})")


if __name__ == "__main__":
    main()
