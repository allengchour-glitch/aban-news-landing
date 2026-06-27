#!/usr/bin/env python3
"""High-res transparent print files for Printful (just the artwork)."""
from PIL import Image, ImageDraw, ImageFont
import os
OUT = "/tmp/couple_mugs/print"; os.makedirs(OUT, exist_ok=True)
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
W, H = 1800, 2100          # tall transparent print canvas
COL = (20, 20, 20, 255)

def crown(d, cx, cy, w):
    h = int(w*0.62); x0, y0 = cx - w//2, cy - h//2
    pts = [(x0, y0+h), (x0, y0+int(h*0.35)), (x0+int(w*0.18), y0+int(h*0.7)),
           (x0+int(w*0.32), y0+int(h*0.1)), (x0+int(w*0.5), y0+int(h*0.62)),
           (x0+int(w*0.68), y0+int(h*0.1)), (x0+int(w*0.82), y0+int(h*0.7)),
           (x0+w, y0+int(h*0.35)), (x0+w, y0+h)]
    d.polygon(pts, fill=COL); d.rectangle([x0, y0+h, x0+w, y0+h+int(h*0.16)], fill=COL)
    for fx in (0.0, 0.5, 1.0):
        px = x0+int(w*fx); py = y0+int(h*0.1) if fx == 0.5 else y0+int(h*0.35); r = max(6, w//22)
        d.ellipse([px-r, py-r, px+r, py+r], fill=COL)

def heart(d, cx, cy, w):
    h = int(w*0.9); x0, y0 = cx-w//2, cy-h//2
    d.pieslice([x0, y0, x0+w//2, y0+int(h*0.7)], 180, 360, fill=COL)
    d.pieslice([x0+w//2, y0, x0+w, y0+int(h*0.7)], 180, 360, fill=COL)
    d.polygon([(x0, y0+int(h*0.32)), (x0+w, y0+int(h*0.32)), (cx, y0+h)], fill=COL)

def make(lines, icon, fname):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cx = W//2; top = int(H*0.16)
    if icon == "crown": crown(d, cx, top, int(W*0.42)); ty = top + int(W*0.30)
    else: heart(d, cx, top, int(W*0.34)); ty = top + int(W*0.26)
    fs = int(W*0.42)
    while fs > 30:
        f = ImageFont.truetype(SERIF, fs)
        if max(d.textlength(l, font=f) for l in lines) <= W*0.92 and ty+len(lines)*int(fs*1.12) <= H-40: break
        fs -= 6
    f = ImageFont.truetype(SERIF, fs); lh = int(fs*1.12)
    for i, l in enumerate(lines):
        w = d.textlength(l, font=f); d.text((cx-w/2, ty+i*lh), l, font=f, fill=COL)
    im.save(f"{OUT}/{fname}")
    print("ok", fname)

DESIGNS = {
    "king": (["KING"], "crown"), "queen": (["QUEEN"], "crown"),
    "mr": (["MR"], "crown"), "mrs": (["MRS"], "crown"),
    "her-king": (["HER", "KING"], "crown"), "his-queen": (["HIS", "QUEEN"], "crown"),
    "hubby": (["HUBBY"], "heart"), "wifey": (["WIFEY"], "heart"),
}
for k, (l, ic) in DESIGNS.items():
    make(l, ic, f"print-{k}.png")
print("DONE ->", OUT)
