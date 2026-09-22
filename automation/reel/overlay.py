#!/usr/bin/env python3
"""overlay.py — Text-Ebenen fuer Reels als PNG (PIL), weil die statische ffmpeg-Fassung im Container
KEIN drawtext hat (gemessen 22.09.2026: `ffmpeg -filters` ohne drawtext; die alte make_reel.sh konnte
hier gar nicht rendern). Vorteil: echte Typografie, Zeilenumbruch, weiche Schatten.
Aufruf: overlay.py <static.png> <hook.png> "<Titel 1>" "<Titel 2>" "<Preis>" "<Hook>"
"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W, H = 1080, 1920
F_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
F_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
F_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
GOLD = (245, 214, 122, 255); WHITE = (255, 255, 255, 255)

def font(p, s):
    return ImageFont.truetype(p, s)

def text_c(draw, y, s, f, fill, shadow=True):
    w = draw.textlength(s, font=f)
    x = (W - w) / 2
    if shadow: draw.text((x + 2, y + 3), s, font=f, fill=(0, 0, 0, 160))
    draw.text((x, y), s, font=f, fill=fill)

def spaced(draw, y, s, f, fill, sp=6):
    w = sum(draw.textlength(ch, font=f) + sp for ch in s) - sp
    x = (W - w) / 2
    for ch in s:
        draw.text((x + 2, y + 3), ch, font=f, fill=(0, 0, 0, 150)); draw.text((x, y), ch, font=f, fill=fill)
        x += draw.textlength(ch, font=f) + sp

def wrap(draw, s, f, maxw, maxlines=2):
    words, lines, cur = s.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=f) <= maxw: cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    if len(lines) > maxlines:
        lines = lines[:maxlines]; lines[-1] = lines[-1][:max(0, len(lines[-1]) - 1)].rstrip() + "…"
    return lines

def main(out_static, out_hook, t1, t2, price, hook):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, 190), fill=(20, 20, 20, 140))                       # Kopfleiste
    spaced(d, 58, "LUXESTYLE", font(F_SERIF, 50), WHITE, sp=8)
    d.rectangle((W/2 - 60, 138, W/2 + 60, 142), fill=GOLD)
    d.rectangle((0, 1530, W, H), fill=(20, 20, 20, 168))                      # Fussfeld
    d.rectangle((W/2 - 100, 1562, W/2 + 100, 1566), fill=GOLD)
    fT = font(F_BOLD, 52)
    zeilen = [z for z in (t1, t2) if z] or [""]
    if len(zeilen) == 1: zeilen = wrap(d, zeilen[0], fT, 960, 2)
    y = 1592
    for z in zeilen: text_c(d, y, z, fT, WHITE); y += 64
    text_c(d, y + 6, price, font(F_BOLD, 78), GOLD); y += 6 + 92
    text_c(d, min(y + 4, 1836), "luxestyle.ch  ·  Klarna & TWINT  ·  Gratis Versand ab CHF 50", font(F_REG, 32), (235, 235, 235, 255), shadow=False)
    img.save(out_static)
    hk = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d2 = ImageDraw.Draw(hk)
    if hook:
        fH = font(F_BOLD, 62); lines = wrap(d2, hook, fH, 900, 2)
        hgt = 60 + 76 * len(lines)
        box = Image.new("RGBA", (W, H), (0, 0, 0, 0)); bd = ImageDraw.Draw(box)
        bd.rounded_rectangle((60, 250, W - 60, 250 + hgt), radius=28, fill=(20, 20, 20, 165))
        hk = Image.alpha_composite(hk, box); d2 = ImageDraw.Draw(hk)
        yy = 250 + 30
        for l in lines: text_c(d2, yy, l, fH, GOLD); yy += 76
    hk.save(out_hook)

if __name__ == "__main__":
    a = sys.argv[1:] + [""] * 6
    main(a[0], a[1], a[2], a[3], a[4], a[5])
