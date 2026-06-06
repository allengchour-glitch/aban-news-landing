#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — markeneigene Post-Karte (Pillow, keine Stockfotos, keine KI-Bilder).

Erzeugt aus dem Hook eines Posts eine schlichte, markenkonforme Karte (1080x1350 JPG):
Creme-Hintergrund, ☕ aban-Wortmarke, große Headline (der Hook), Amber-Linie, Footer.
Eigene Rechte, deterministisch, passt zur ehrlichen/anti-Hype-Marke.

Nutzung:
    from gen_card import make_card
    make_card("Deine Headline …", "/tmp/card.jpg")
  oder CLI:  python3 automation/gen_card.py "Headline" out.jpg
"""
from __future__ import annotations

import sys
from PIL import Image, ImageDraw, ImageFont

BG = (255, 250, 242)      # cream
INK = (31, 41, 55)
AMBER = (217, 119, 6)
AMBER_DK = (180, 83, 9)
MUTED = (107, 114, 128)

SANS_BOLD = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
             "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]
SANS = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"]


def _font(paths, size):
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _hook(text: str, limit: int = 120) -> str:
    """Erste aussagekräftige Zeile/Satz als Headline."""
    first = ""
    for line in text.strip().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            first = line
            break
    if not first:
        first = text.strip()[:limit]
    # bei sehr langer Zeile am Satzende kürzen
    if len(first) > limit:
        cut = first[:limit]
        for sep in (". ", " — ", ": ", ", "):
            if sep in cut:
                cut = cut.rsplit(sep, 1)[0] + sep.strip()
                break
        first = cut.rstrip() + "…"
    return first


def _wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=font) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def make_card(text: str, out_path: str, size=(1080, 1350)) -> str:
    W, H = size
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    M = 90

    # Rahmen-Akzent
    d.rectangle([0, 0, W, 14], fill=AMBER)

    # Wortmarke ☕ aban news
    wm = _font(SANS_BOLD, 46)
    d.ellipse([M, M, M + 26, M + 26], fill=AMBER)
    d.text((M + 42, M - 8), "aban news", font=wm, fill=INK)

    # Headline (Hook)
    head_f = _font(SANS_BOLD, 76)
    lines = _wrap(d, _hook(text), head_f, W - 2 * M)
    # vertikal mittig im Hauptbereich
    line_h = int(76 * 1.22)
    block_h = line_h * len(lines)
    y = max(M + 130, (H - block_h) // 2 - 60)
    for ln in lines:
        d.text((M, y), ln, font=head_f, fill=INK)
        y += line_h

    # Amber-Linie
    d.rectangle([M, y + 24, M + 120, y + 32], fill=AMBER)

    # Footer
    foot_f = _font(SANS_BOLD, 38)
    sub_f = _font(SANS, 30)
    d.text((M, H - M - 70), "abannews.com", font=foot_f, fill=AMBER_DK)
    d.text((M, H - M - 18), "Mo–Fr · KI in 5 Minuten · ehrlich, ohne Hype", font=sub_f, fill=MUTED)

    img.save(out_path, "JPEG", quality=88)
    return out_path


if __name__ == "__main__":
    txt = sys.argv[1] if len(sys.argv) > 1 else "Die wichtigsten KI-Updates für DACH-Profis — jeden Morgen in 5 Minuten."
    out = sys.argv[2] if len(sys.argv) > 2 else "card.jpg"
    print("Karte:", make_card(txt, out))
