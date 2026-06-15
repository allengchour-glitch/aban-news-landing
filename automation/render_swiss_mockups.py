#!/usr/bin/env python3
# LuxeStyle — Swiss-Edition Vorschau-Mockups: Design auf Garment-Farbe (Brust-Print-Look).
# Zeigt die echte Wirkung — besonders Off-White-Designs auf dunklem Stoff. Pillow-only.
import os
from PIL import Image, ImageDraw

SRC = os.path.join(os.path.dirname(__file__), '..', 'pod', 'swiss-edition')
OUT = os.path.join(SRC, 'mockups'); os.makedirs(OUT, exist_ok=True)

# Design → Garment-Farbe (aus dem Manifest)
GARMENT = {
    'hoi-zaeme':        (237,232,221),  # Cream
    'merci-vilmal':     (244,241,234),  # Off-White
    'chuchichaeschtli': (43,47,53),     # Anthrazit (dunkel)
    'gmuetlech':        (217,205,184),  # Sand
    'sali-zaeme':       (26,26,28),      # Schwarz
    'erste-august':     (244,241,234),  # Off-White
    'hopp-schwiiz':     (237,232,221),  # Cream
    'feierabig':        (226,216,196),  # Sand/Cream
    'grueezi':          (237,232,221),  # Cream
    'matterhorn-zermatt':(237,232,221), # Cream (Line-Art)
    'schwiizer-alpe':   (244,241,234),  # Off-White (Line-Art)
    'edelweiss':        (237,232,221),  # Cream (Line-Art)
    'swiss-made':       (237,232,221),  # Cream (Emblem)
    'zueri':            (244,241,234),  # Off-White (Stadt)
}
BG = (250, 248, 245)   # heller Studio-Hintergrund
CW, CH = 1200, 1500    # Mockup-Format (4:5)

def mockup(name, gar):
    design = Image.open(os.path.join(SRC, name+'.png')).convert('RGBA')
    im = Image.new('RGB', (CW, CH), BG); d = ImageDraw.Draw(im)
    # „Garment"-Fläche (grosse abgerundete Stoff-Fläche)
    gx0, gy0, gx1, gy1 = 90, 150, CW-90, CH-90
    d.rounded_rectangle([gx0,gy0,gx1,gy1], radius=70, fill=gar)
    # dezenter Kragen-Hinweis (Halsausschnitt)
    neck_w = 300
    d.ellipse([CW//2-neck_w//2, gy0-70, CW//2+neck_w//2, gy0+70], fill=BG)
    # Design auf Brust platzieren (~58% Garment-Breite, oberes Drittel)
    target_w = int((gx1-gx0)*0.62)
    scale = target_w / design.width
    dw, dh = target_w, int(design.height*scale)
    design_r = design.resize((dw, dh), Image.LANCZOS)
    px = (CW-dw)//2; py = gy0 + int((gy1-gy0)*0.22)
    im.paste(design_r, (px, py), design_r)
    p = os.path.join(OUT, name+'-mockup.jpg'); im.save(p, quality=90)
    print(f'  ✓ {name}-mockup.jpg')

print('🧵 Rendere Garment-Mockups …')
for n, c in GARMENT.items():
    if os.path.exists(os.path.join(SRC, n+'.png')): mockup(n, c)
print('Fertig → pod/swiss-edition/mockups/')
