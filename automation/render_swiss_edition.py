#!/usr/bin/env python3
# LuxeStyle — Swiss-Edition Welle-1 Design-Generator (druckfertige transparente PNGs)
# Pillow-only, deterministisch, Design-System-Farben. Output: pod/swiss-edition/*.png
# Druckauflösung: 3000 px Breite ≈ 25 cm @ 300 dpi. Transparent → DTG-Druck auf Textil.
import os
from PIL import Image, ImageDraw, ImageFont

FONT = '/tmp/fonts/Anton.ttf'
OUT  = os.path.join(os.path.dirname(__file__), '..', 'pod', 'swiss-edition')
os.makedirs(OUT, exist_ok=True)

# Design-System-Farben
ANTHRACITE = (31, 35, 40, 255)
OFFWHITE   = (244, 241, 234, 255)
RED        = (213, 43, 30, 255)
SAGE       = (124, 140, 107, 255)
W = 3000  # Canvas-/Druckbreite

def font(size): return ImageFont.truetype(FONT, size)

def text_size(f, s):
    b = f.getbbox(s); return b[2]-b[0], b[3]-b[1], b[0], b[1]

def fit_font(s, max_w, start=900, tracking=0):
    """grösste Schrift, bei der s in max_w passt (inkl. Tracking)."""
    sz = start
    while sz > 40:
        f = font(sz); w = sum(text_size(f, ch)[0] for ch in s) + tracking*(len(s)-1)
        if w <= max_w: return f
        sz -= 10
    return font(40)

def draw_tracked(d, x, y, s, f, fill, tracking=0):
    """Text mit Buchstabenabstand zeichnen; gibt Gesamtbreite zurück."""
    cx = x
    for ch in s:
        w, h, ox, oy = text_size(f, ch)
        d.text((cx-ox, y), ch, font=f, fill=fill)
        cx += w + tracking
    return cx - x

def line_width(s, f, tracking=0):
    return sum(text_size(f, ch)[0] for ch in s) + tracking*(len(s)-1)

def new(): return Image.new('RGBA', (W, 2400), (0,0,0,0))

def trim(im, pad=60):
    bb = im.getbbox()
    if not bb: return im
    im = im.crop(bb)
    out = Image.new('RGBA', (im.width+2*pad, im.height+2*pad), (0,0,0,0))
    out.paste(im, (pad, pad), im); return out

def save(im, name):
    im = trim(im); p = os.path.join(OUT, name+'.png'); im.save(p)
    print(f'  ✓ {name}.png  {im.width}x{im.height}')

def stacked(words, fill, accent_dot=None, tracking=40, gap=40):
    """Mehrzeilige zentrierte Wörter, je Zeile auf Breite gefittet."""
    im = new(); d = ImageDraw.Draw(im)
    fonts = [fit_font(w, W-200, tracking=tracking) for w in words]
    sz = min(f.size for f in fonts); fonts = [font(sz)]*len(words)  # einheitliche Grösse
    heights = [text_size(f, w)[1] for f,w in zip(fonts,words)]
    total = sum(heights) + gap*(len(words)-1)
    y = (2400-total)//2
    for w, f, h in zip(words, fonts, heights):
        lw = line_width(w, f, tracking); x = (W-lw)//2
        draw_tracked(d, x, y, w, f, fill, tracking)
        y += h + gap
    if accent_dot:  # roter Punkt rechts unten an die letzte Zeile
        r = sz//9; d.ellipse([(W//2+lw//2+r, y-h//2),(W//2+lw//2+3*r, y-h//2+2*r)], fill=RED)
    return im

def oneline(word, fill, tracking=30, caption=None, cap_fill=None):
    im = new(); d = ImageDraw.Draw(im)
    f = fit_font(word, W-160, tracking=tracking)
    h = text_size(f, word)[1]; lw = line_width(word, f, tracking)
    y = (2400-h)//2 - (120 if caption else 0)
    draw_tracked(d, (W-lw)//2, y, word, f, fill, tracking)
    if caption:
        cf = font(max(70, f.size//7)); cw = line_width(caption, cf, 20)
        draw_tracked(d, (W-cw)//2, y+h+70, caption, cf, cap_fill or fill, 20)
    return im

def swiss_cross(d, cx, cy, s, square_fill, cross_fill):
    """Schweizer Kreuz: rotes (oder anthrazit) Quadrat + weisses Kreuz, korrekte Proportionen."""
    half = s//2
    d.rounded_rectangle([(cx-half,cy-half),(cx+half,cy+half)], radius=s//12, fill=square_fill)
    arm = s*0.28; thick = s*0.18  # CH-Kreuz-Proportion (Arm:Dicke ≈ 7:6 vom Zentrum)
    d.rectangle([(cx-thick/2, cy-arm),(cx+thick/2, cy+arm)], fill=cross_fill)
    d.rectangle([(cx-arm, cy-thick/2),(cx+arm, cy+thick/2)], fill=cross_fill)

print('🇨🇭 Rendere Swiss-Edition Welle 1 …')

# 1) HOI ZÄME (Cream-Tee → Anthrazit-Ink + roter Punkt)
save(stacked(['HOI','ZÄME'], ANTHRACITE, accent_dot=True), 'hoi-zaeme')

# 2) MERCI VILMAL (Off-White-Tee → Anthrazit + rotes Herz-Akzent als Punkt)
save(stacked(['MERCI','VILMAL'], ANTHRACITE, accent_dot=True), 'merci-vilmal')

# 3) CHUCHICHÄSCHTLI (Anthrazit-Hoodie → Off-White, mit Caption)
save(oneline('CHUCHICHÄSCHTLI', OFFWHITE, tracking=18,
             caption='S SCHÖNSCHT SCHWIIZER WORT', cap_fill=RED), 'chuchichaeschtli')

# 4) GMÜETLECH (Sand-Crew → Anthrazit-Wort + Sage-Unterstrich)
img = oneline('GMÜETLECH', ANTHRACITE, tracking=26)
# Sage-Unterstrich unter das Wort
d = ImageDraw.Draw(img); bb = img.getbbox()
d.rectangle([(bb[0], bb[3]-0), (bb[2], bb[3]+34)], fill=SAGE)  # wird durch trim mitgenommen
save(img, 'gmuetlech')

# 5) SALI ZÄME (Schwarz-Tee → Off-White, minimalistisch)
save(oneline('SALI ZÄME', OFFWHITE, tracking=36), 'sali-zaeme')

# 6) 1. AUGUST (Off-White-Tee → Schweizer Kreuz + Anthrazit-Text)
im = new(); d = ImageDraw.Draw(im)
swiss_cross(d, W//2, 640, 660, RED, OFFWHITE)
f = fit_font('1. AUGUST', W-300, tracking=40)
lw = line_width('1. AUGUST', f, 40); draw_tracked(d, (W-lw)//2, 1120, '1. AUGUST', f, ANTHRACITE, 40)
bottom = im.getbbox()[3]  # echte Unterkante von Kreuz+AUGUST → Caption garantiert darunter
cf = font(110); cap='SCHWIIZER NATIONALFIIRTIG'; cw=line_width(cap,cf,18)
draw_tracked(d, (W-cw)//2, bottom+80, cap, cf, RED, 18)
save(im, 'erste-august')

# --- Bonus Welle 1+ (hohe Nachfrage) ---
# 7) HOPP SCHWIIZ (Cream-Tee → Anthrazit + roter Punkt; Sport/Nationalstolz)
save(stacked(['HOPP','SCHWIIZ'], ANTHRACITE, accent_dot=True), 'hopp-schwiiz')

# 8) FEIERABIG (Off-White-/Cream-Tee → Anthrazit + Sage-Unterstrich)
img = oneline('FEIERABIG', ANTHRACITE, tracking=30)
d = ImageDraw.Draw(img); bb = img.getbbox()
d.rectangle([(bb[0], bb[3]), (bb[2], bb[3]+34)], fill=SAGE)
save(img, 'feierabig')

# 9) GRÜEZI (Cream-Tee → Anthrazit + roter Punkt)
img = oneline('GRÜEZI', ANTHRACITE, tracking=40)
d = ImageDraw.Draw(img); bb = img.getbbox()
r = 70; d.ellipse([(bb[2]+50, bb[3]-r),(bb[2]+50+r, bb[3])], fill=RED)
save(img, 'grueezi')

print('Fertig. Dateien in pod/swiss-edition/')
