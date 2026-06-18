#!/usr/bin/env python3
# LuxeStyle — Schweiz-WM-2026-Fan-Designs (druckfertige transparente PNGs, Pillow-only)
# Stil identisch zur Swiss-Edition (Design-System-Farben, Anton-Font, 3000px ≈ 25cm@300dpi).
# Output: pod/wm-2026/*.png  → DTG-Druck auf Fan-Textil (Rot/Weiss/Anthrazit).
# Saisonal: nach der WM mit dem Shop-Teardown (tag:wm-2026) zusammen entfernen.
import os
from PIL import Image, ImageDraw, ImageFont

FONT = '/tmp/fonts/Anton.ttf'
OUT  = os.path.join(os.path.dirname(__file__), '..', 'pod', 'wm-2026')
os.makedirs(OUT, exist_ok=True)

ANTHRACITE = (31, 35, 40, 255)
OFFWHITE   = (244, 241, 234, 255)
RED        = (213, 43, 30, 255)
WHITE      = (255, 255, 255, 255)
BLACK      = (20, 20, 22, 255)
W = 3000

def font(size): return ImageFont.truetype(FONT, size)
def text_size(f, s): b = f.getbbox(s); return b[2]-b[0], b[3]-b[1], b[0], b[1]
def fit_font(s, max_w, start=900, tracking=0):
    sz = start
    while sz > 40:
        f = font(sz); w = sum(text_size(f, ch)[0] for ch in s) + tracking*(len(s)-1)
        if w <= max_w: return f
        sz -= 10
    return font(40)
def draw_tracked(d, x, y, s, f, fill, tracking=0):
    cx = x
    for ch in s:
        w, h, ox, oy = text_size(f, ch)
        d.text((cx-ox, y), ch, font=f, fill=fill); cx += w + tracking
    return cx - x
def line_width(s, f, tracking=0): return sum(text_size(f, ch)[0] for ch in s) + tracking*(len(s)-1)
def new(): return Image.new('RGBA', (W, 2600), (0,0,0,0))
def trim(im, pad=60):
    bb = im.getbbox()
    if not bb: return im
    im = im.crop(bb)
    out = Image.new('RGBA', (im.width+2*pad, im.height+2*pad), (0,0,0,0))
    out.paste(im, (pad, pad), im); return out
def save(im, name):
    im = trim(im); p = os.path.join(OUT, name+'.png'); im.save(p)
    print(f'  ✓ {name}.png  {im.width}x{im.height}')

def swiss_cross(d, cx, cy, s, square_fill, cross_fill):
    half = s//2
    d.rounded_rectangle([(cx-half,cy-half),(cx+half,cy+half)], radius=s//12, fill=square_fill)
    arm = s*0.28; thick = s*0.18
    d.rectangle([(cx-thick/2, cy-arm),(cx+thick/2, cy+arm)], fill=cross_fill)
    d.rectangle([(cx-arm, cy-thick/2),(cx+arm, cy+thick/2)], fill=cross_fill)

def soccer_ball(d, cx, cy, r, body=WHITE, patch=BLACK, ring=ANTHRACITE):
    """Schlichter Fussball: weisser Kreis + zentrales Fünfeck + Umriss (Print-tauglich)."""
    import math
    d.ellipse([(cx-r,cy-r),(cx+r,cy+r)], fill=body, outline=ring, width=max(6,r//22))
    # zentrales Fünfeck
    pent = []
    for k in range(5):
        a = -math.pi/2 + k*2*math.pi/5
        pent.append((cx + r*0.42*math.cos(a), cy + r*0.42*math.sin(a)))
    d.polygon(pent, fill=patch)
    # 5 kurze Nähte nach aussen
    for k in range(5):
        a = -math.pi/2 + k*2*math.pi/5
        x1 = cx + r*0.42*math.cos(a); y1 = cy + r*0.42*math.sin(a)
        x2 = cx + r*0.82*math.cos(a); y2 = cy + r*0.82*math.sin(a)
        d.line([(x1,y1),(x2,y2)], fill=ring, width=max(5,r//26))

def stacked(words, fill, accent_dot=True, tracking=40, gap=40, top=None):
    im = top or new(); d = ImageDraw.Draw(im)
    fonts = [fit_font(w, W-200, tracking=tracking) for w in words]
    sz = min(f.size for f in fonts); fonts=[font(sz)]*len(words)
    heights=[text_size(f,w)[1] for f,w in zip(fonts,words)]
    total=sum(heights)+gap*(len(words)-1); y=(im.height-total)//2
    lw=0
    for w,f,h in zip(words,fonts,heights):
        lw=line_width(w,f,tracking); x=(W-lw)//2
        draw_tracked(d,x,y,w,f,fill,tracking); y+=h+gap
    if accent_dot:
        r=sz//9; d.ellipse([(W//2+lw//2+r,y-h//2),(W//2+lw//2+3*r,y-h//2+2*r)], fill=RED)
    return im

def oneline(word, fill, tracking=30, caption=None, cap_fill=None, yoff=0):
    im=new(); d=ImageDraw.Draw(im)
    f=fit_font(word,W-160,tracking=tracking); h=text_size(f,word)[1]; lw=line_width(word,f,tracking)
    y=(im.height-h)//2-(120 if caption else 0)+yoff
    draw_tracked(d,(W-lw)//2,y,word,f,fill,tracking)
    if caption:
        cf=font(max(70,f.size//7)); cw=line_width(caption,cf,20)
        draw_tracked(d,(W-cw)//2,y+h+70,caption,cf,cap_fill or fill,20)
    return im

print('🇨🇭⚽ Rendere Schweiz-WM-2026-Designs …')

# 1) HOPP SCHWIIZ + Fussball + Schweizer Kreuz (Cream/Off-White-Tee → Anthrazit)
im=new(); d=ImageDraw.Draw(im)
soccer_ball(d, W//2, 470, 300)
swiss_cross(d, W//2+360, 300, 200, RED, WHITE)
im = stacked(['HOPP','SCHWIIZ'], ANTHRACITE, accent_dot=False, top=im)
save(im, 'hopp-schwiiz-wm')

# 2) MIR SIND DEBII (Schweiz ist qualifiziert — Fan-Stolz)
save(oneline('MIR SIND DEBII', RED, tracking=20,
             caption='WM 2026 · GRUEPPE B', cap_fill=ANTHRACITE), 'mir-sind-debii')

# 3) ROT-WIISS mit Schweizer Kreuz
im=new(); d=ImageDraw.Draw(im)
swiss_cross(d, W//2, 560, 560, RED, OFFWHITE)
f=fit_font('ROT-WIISS', W-300, tracking=40); lw=line_width('ROT-WIISS',f,40)
draw_tracked(d,(W-lw)//2,1060,'ROT-WIISS',f,ANTHRACITE,40)
bottom=im.getbbox()[3]; cf=font(100); cap='SIT 1291 · HOPP SCHWIIZ'; cw=line_width(cap,cf,18)
draw_tracked(d,(W-cw)//2,bottom+70,cap,cf,RED,18)
save(im,'rot-wiiss')

# 4) FUESSBALL-FIEBER + Sage-Unterstrich
img=oneline('FUESSBALL', ANTHRACITE, tracking=24, caption='-FIEBER 2026-', cap_fill=RED)
save(img,'fuessball-fieber')

# 5) WM 2026 gross + Ball als O-Ersatz-Gefühl (Ball über Text)
im=new(); d=ImageDraw.Draw(im)
soccer_ball(d, W//2, 470, 320)
f=fit_font('WM 2026', W-300, tracking=50); lw=line_width('WM 2026',f,50)
draw_tracked(d,(W-lw)//2,940,'WM 2026',f,ANTHRACITE,50)
bottom=im.getbbox()[3]; cf=font(110); cap='HOPP SCHWIIZ'; cw=line_width(cap,cf,22)
draw_tracked(d,(W-cw)//2,bottom+70,cap,cf,RED,22)
save(im,'wm-2026-schwiiz')

# 6) 1:0 FÜR D SCHWIIZ
save(oneline('1:0 FÜR D SCHWIIZ', ANTHRACITE, tracking=14,
             caption='FAN SIIT EBIG', cap_fill=RED), 'eins-zu-null-schwiiz')

print('Fertig. Dateien in pod/wm-2026/')
