#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
TPL = "/home/user/aban-news-landing/pod/templates/shirt-white.png"
OUT = "/tmp/couple_shirts"; os.makedirs(OUT, exist_ok=True)
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
PZ = (437, 350, 614, 586)          # print zone on shirt
SHIRT = (276, 224, 766, 662)       # crop incl. sleeves
BG = (243, 240, 233)

def crown(d, cx, cy, w, col):
    h = int(w*0.62); x0, y0 = cx-w//2, cy-h//2
    pts = [(x0, y0+h), (x0, y0+int(h*0.35)), (x0+int(w*0.18), y0+int(h*0.7)),
           (x0+int(w*0.32), y0+int(h*0.1)), (x0+int(w*0.5), y0+int(h*0.62)),
           (x0+int(w*0.68), y0+int(h*0.1)), (x0+int(w*0.82), y0+int(h*0.7)),
           (x0+w, y0+int(h*0.35)), (x0+w, y0+h)]
    d.polygon(pts, fill=col); d.rectangle([x0, y0+h, x0+w, y0+h+int(h*0.16)], fill=col)
    for fx in (0.0, 0.5, 1.0):
        px = x0+int(w*fx); py = y0+int(h*0.1) if fx == 0.5 else y0+int(h*0.35); r = max(3, w//22)
        d.ellipse([px-r, py-r, px+r, py+r], fill=col)

def heart(d, cx, cy, w, col):
    h = int(w*0.9); x0, y0 = cx-w//2, cy-h//2
    d.pieslice([x0, y0, x0+w//2, y0+int(h*0.7)], 180, 360, fill=col)
    d.pieslice([x0+w//2, y0, x0+w, y0+int(h*0.7)], 180, 360, fill=col)
    d.polygon([(x0, y0+int(h*0.32)), (x0+w, y0+int(h*0.32)), (cx, y0+h)], fill=col)

def render(lines, icon, col=(26, 26, 26)):
    pw, ph = PZ[2]-PZ[0], PZ[3]-PZ[1]
    im = Image.new("RGBA", (pw, ph), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cx = pw//2; top = int(ph*0.14)
    if icon == "crown": crown(d, cx, top+22, int(pw*0.32), col); ty = top+56
    elif icon == "heart": heart(d, cx, top+20, int(pw*0.24), col); ty = top+54
    else: ty = top
    fs = int(pw*0.32)
    while fs > 12:
        f = ImageFont.truetype(SERIF, fs)
        if max(d.textlength(l, font=f) for l in lines) <= pw*0.9 and ty+len(lines)*int(fs*1.12) <= ph-6: break
        fs -= 2
    f = ImageFont.truetype(SERIF, fs); lh = int(fs*1.12)
    for i, l in enumerate(lines):
        w = d.textlength(l, font=f); d.text((cx-w/2, ty+i*lh), l, font=f, fill=col)
    return im

def shirt(design):
    base = Image.open(TPL).convert("RGBA"); d = ImageDraw.Draw(base)
    d.rectangle([PZ[0]-32, PZ[1]-14, PZ[2]+34, PZ[3]+12], fill=(255, 255, 255, 255))
    base.alpha_composite(design, (PZ[0], PZ[1]))
    return base.crop(SHIRT)

def pair(left, right, fname):
    sl = shirt(left); sr = shirt(right)
    W, H = 1500, 1050; cv = Image.new("RGB", (W, H), BG)
    sc = 1.0; sw = int(sl.width*sc); sh = int(sl.height*sc)
    sl = sl.resize((sw, sh), Image.LANCZOS); sr = sr.resize((sw, sh), Image.LANCZOS)
    gap = 20; total = sw*2+gap; x0 = (W-total)//2; y = (H-sh)//2+10
    shd = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(shd)
    for x in (x0, x0+sw+gap):
        sd.ellipse([x+70, y+sh-30, x+sw-70, y+sh+24], fill=(0, 0, 0, 55))
    shd = shd.filter(ImageFilter.GaussianBlur(16))
    cv.paste(Image.alpha_composite(Image.new("RGBA", (W, H), BG+(255,)), shd).convert("RGB"), (0, 0))
    cv.paste(sl, (x0, y), sl); cv.paste(sr, (x0+sw+gap, y), sr)
    cv.save(f"{OUT}/{fname}", quality=92); print("ok", fname)

CONCEPTS = {
    "king-queen": (["KING"], ["QUEEN"], "crown"),
    "mr-mrs": (["MR"], ["MRS"], "crown"),
    "her-his": (["HER", "KING"], ["HIS", "QUEEN"], "crown"),
    "hubby-wifey": (["HUBBY"], ["WIFEY"], "heart"),
}
for k, (l, r, ic) in CONCEPTS.items():
    pair(render(l, ic), render(r, ic), f"{k}-shirts.jpg")
print("DONE ->", OUT)
