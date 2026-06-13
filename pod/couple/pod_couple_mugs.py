#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

TPL = "/home/user/aban-news-landing/pod/templates/tasse.png"
OUT = "/tmp/couple_mugs"
os.makedirs(OUT, exist_ok=True)
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

# print zone (within 1000x1000 template) + mug crop tile
PZ = (357, 296, 563, 543)            # design area
MUG = (300, 232, 742, 620)           # crop a single clean mug (incl. handle)
BG = (243, 240, 233)                 # cream background to match template

def font(path, size): return ImageFont.truetype(path, size)

def draw_crown(d, cx, cy, w, col):
    """simple elegant crown centered at (cx, cy), width w."""
    h = int(w * 0.62)
    x0, y0 = cx - w // 2, cy - h // 2
    pts = [(x0, y0 + h), (x0, y0 + int(h*0.35)),
           (x0 + int(w*0.18), y0 + int(h*0.7)), (x0 + int(w*0.32), y0 + int(h*0.1)),
           (x0 + int(w*0.5), y0 + int(h*0.62)), (x0 + int(w*0.68), y0 + int(h*0.1)),
           (x0 + int(w*0.82), y0 + int(h*0.7)), (x0 + w, y0 + int(h*0.35)),
           (x0 + w, y0 + h)]
    d.polygon(pts, fill=col)
    d.rectangle([x0, y0 + h, x0 + w, y0 + h + int(h*0.16)], fill=col)
    for fx in (0.0, 0.5, 1.0):
        px = x0 + int(w * fx); py = y0 + int(h*0.1) if fx == 0.5 else y0 + int(h*0.35)
        r = max(3, w // 22)
        d.ellipse([px - r, py - r, px + r, py + r], fill=col)

def draw_heart(d, cx, cy, w, col):
    h = int(w*0.9); x0, y0 = cx - w//2, cy - h//2
    d.pieslice([x0, y0, x0 + w//2, y0 + int(h*0.7)], 180, 360, fill=col)
    d.pieslice([x0 + w//2, y0, x0 + w, y0 + int(h*0.7)], 180, 360, fill=col)
    d.polygon([(x0, y0 + int(h*0.32)), (x0 + w, y0 + int(h*0.32)), (cx, y0 + h)], fill=col)

def render_design(lines, icon, col=(26, 26, 26)):
    """returns an RGBA design sized to print zone."""
    pw, ph = PZ[2]-PZ[0], PZ[3]-PZ[1]
    im = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = pw // 2
    top = int(ph * 0.12)
    if icon == "crown":
        draw_crown(d, cx, top + 24, int(pw*0.34), col); ty = top + 60
    elif icon == "heart":
        draw_heart(d, cx, top + 22, int(pw*0.26), col); ty = top + 58
    else:
        ty = top
    # fit text lines
    big = max(lines, key=len)
    fs = int(pw * 0.34)
    while fs > 12:
        f = font(SERIF, fs)
        if max(ImageDraw.Draw(im).textlength(l, font=f) for l in lines) <= pw*0.92 and \
           ty + len(lines)*int(fs*1.12) <= ph - 6:
            break
        fs -= 2
    f = font(SERIF, fs)
    lh = int(fs * 1.12)
    for i, l in enumerate(lines):
        w = ImageDraw.Draw(im).textlength(l, font=f)
        d.text((cx - w/2, ty + i*lh), l, font=f, fill=col)
    return im

def make_mug(design):
    base = Image.open(TPL).convert("RGBA")
    d = ImageDraw.Draw(base)
    # white-out placeholder text + dashed box
    d.rectangle([PZ[0]-8, PZ[1]-8, PZ[2]+8, PZ[3]+8], fill=(255, 255, 255, 255))
    base.alpha_composite(design, (PZ[0], PZ[1]))
    return base.crop(MUG)

def pair_canvas(left, right, fname):
    mug_l = make_mug(left); mug_r = make_mug(right)
    W, H = 1400, 1100
    cv = Image.new("RGB", (W, H), BG)
    scale = 1.35
    mw = int(mug_l.width * scale); mh = int(mug_l.height * scale)
    mug_l = mug_l.resize((mw, mh), Image.LANCZOS)
    mug_r = mug_r.resize((mw, mh), Image.LANCZOS)
    # soft shadow
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh)
    gap = 60; total = mw*2 + gap; x0 = (W - total)//2; y = (H - mh)//2 + 20
    for x in (x0, x0+mw+gap):
        sd.ellipse([x+30, y+mh-40, x+mw-30, y+mh+30], fill=(0, 0, 0, 70))
    sh = sh.filter(ImageFilter.GaussianBlur(18)); cv.paste(Image.alpha_composite(Image.new("RGBA",(W,H),BG+(255,)), sh).convert("RGB"), (0,0))
    cv.paste(mug_l, (x0, y), mug_l); cv.paste(mug_r, (x0+mw+gap, y), mug_r)
    cv.save(f"{OUT}/{fname}", quality=92)
    return f"{OUT}/{fname}"

def single(design, fname, scale=2.2):
    mug = make_mug(design)
    mw = int(mug.width*scale); mh = int(mug.height*scale)
    mug = mug.resize((mw, mh), Image.LANCZOS)
    W = H = 1200; cv = Image.new("RGB", (W, H), BG)
    cv.paste(mug, ((W-mw)//2, (H-mh)//2), mug)
    cv.save(f"{OUT}/{fname}", quality=92); return f"{OUT}/{fname}"

CONCEPTS = {
    "king-queen":  (["KING"],  ["QUEEN"], "crown"),
    "mr-mrs":      (["MR"],    ["MRS"],   "crown"),
    "her-his":     (["HER", "KING"], ["HIS", "QUEEN"], "crown"),
    "wifey-hubby": (["HUBBY"], ["WIFEY"], "heart"),
}
for key, (l, r, icon) in CONCEPTS.items():
    dl = render_design(l, icon); dr = render_design(r, icon)
    pair_canvas(dl, dr, f"{key}-set.jpg")
    single(render_design(l, icon), f"{key}-left.jpg")
    single(render_design(r, icon), f"{key}-right.jpg")
    print("ok", key)
print("DONE ->", OUT)
