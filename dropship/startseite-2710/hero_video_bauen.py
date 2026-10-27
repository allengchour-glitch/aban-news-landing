#!/usr/bin/env python3
"""Hero-Video: endlos laufende Produktwand (Spalten fahren auf und ab), nahtlose Schleife, ohne Ton.
Aufruf: bauen.py desktop|mobil [sekunden] [fps]  → hero_<variante>.mp4 + poster_<variante>.jpg"""
import sys, subprocess, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

VAR = sys.argv[1] if len(sys.argv) > 1 else 'desktop'
T = float(sys.argv[2]) if len(sys.argv) > 2 else 30.0
FPS = int(sys.argv[3]) if len(sys.argv) > 3 else 24
BG = (23, 21, 19)

# (Datei, Beschriftung, Bildanker oben 0 … unten 1)
SP = [
    [('mode_04', 'Mode', .3), ('schmuck_00', 'Schmuck', .5), ('kueche_01', 'Küche', .5), ('tasche_02', 'Taschen', .35), ('uhren_05', 'Uhren', .5)],
    [('decke_06', 'Wohnen', .5), ('laden_02', 'Elektronik', .5), ('hund_04', 'Haustiere', .4), ('beauty_07', 'Beauty', .3), ('sneaker_02', 'Schuhe', .5)],
    [('uhren_01', 'Uhren', .5), ('mode_13', 'Mode', .3), ('lampe_07', 'Wohnen', .5), ('tasche_10', 'Taschen', .5), ('audio_01', 'Elektronik', .5)],
    [('hund_12', 'Haustiere', .4), ('mode_11', 'Mode', .25), ('schmuck_03', 'Schmuck', .5), ('kueche_07', 'Küche', .5), ('herren_06', 'Herren', .3)],
    [('mode_06', 'Mode', .3), ('kueche_09', 'Küche', .5), ('herren_11', 'Herren', .3), ('schmuck_04', 'Schmuck', .5), ('tasche_00', 'Taschen', .5)],
]
if VAR == 'desktop':
    W, H, CW, CH, GAP, N_COL, X0 = 2000, 800, 270, 360, 18, 5, 600
    LABEL, FONT_PX = True, 20
    DIR = [-1, 1, -1, 1, -1]; PHASE = [0.0, 0.31, 0.62, 0.17, 0.45]
else:
    W, H, CW, CH, GAP, N_COL, X0 = 1080, 1500, 306, 408, 20, 3, 60
    LABEL, FONT_PX = True, 24
    SP = [SP[0], SP[1], SP[3]]
    DIR = [-1, 1, -1]; PHASE = [0.0, 0.4, 0.2]
R = 22
font = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-SemiBold.otf', FONT_PX)

def karte(name, text, anker):
    im = Image.open(f'img/{name}.jpg').convert('RGB')
    w, h = im.size; s = max(CW / w, CH / h)
    im = im.resize((max(CW, round(w * s)), max(CH, round(h * s))), Image.LANCZOS)
    x = (im.width - CW) // 2; y = round((im.height - CH) * anker)
    im = im.crop((x, y, x + CW, y + CH))
    m = Image.new('L', (CW * 3, CH * 3), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, CW * 3 - 1, CH * 3 - 1), R * 3, fill=255); m = m.resize((CW, CH), Image.LANCZOS)
    k = Image.new('RGBA', (CW, CH)); k.paste(im, (0, 0)); k.putalpha(m)
    if LABEL:
        d = ImageDraw.Draw(k, 'RGBA'); tw = d.textlength(text, font=font); pw, ph = int(tw + 30), FONT_PX + 18
        d.rounded_rectangle((16, CH - ph - 16, 16 + pw, CH - 16), ph // 2, fill=(20, 18, 16, 168)); d.text((16 + 15, CH - ph - 16 + 8), text, font=font, fill=(250, 247, 242, 255))
    return k

def streifen(liste):
    n = len(liste); L = n * (CH + GAP)
    karten = [karte(*e) for e in liste]
    schatten = Image.new('RGBA', (CW + 80, 2 * L + 80), (0, 0, 0, 0))
    for k in range(2 * n):
        sh = Image.new('RGBA', (CW + 80, CH + 80), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((40, 52, 40 + CW, 52 + CH), R, fill=(0, 0, 0, 120))
        schatten.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)), (0, k * (CH + GAP)))
    s = Image.new('RGB', (CW + 80, 2 * L + 80), BG); s.paste(schatten, (0, 0), schatten)
    for k in range(2 * n): s.paste(karten[k % n], (40, 40 + k * (CH + GAP)), karten[k % n])
    return np.asarray(s.crop((40, 40, 40 + CW, 40 + 2 * L)), dtype=np.uint8), L

streifen_liste = [streifen(c) for c in SP]
# Maske: dunkel ueber dem Textbereich (Desktop links, Mobil unten), fliessend in die Karten
yy, xx = np.mgrid[0:H, 0:W]
if VAR == 'desktop':
    m = np.clip((1020 - xx) / 300.0, 0, 1) ** 1.0
else:
    m = np.clip((yy - H * 0.27) / (H * 0.25), 0, 1) ** 1.05 * 0.96
m = np.clip(m + np.clip((70 - yy) / 70.0, 0, 1) * 0.35 + np.clip((yy - (H - 60)) / 60.0, 0, 1) * 0.0, 0, 1)[..., None].astype(np.float32)
bg = np.zeros((H, W, 3), np.float32); bg[:] = BG

def frame(t):
    f = np.zeros((H, W, 3), np.uint8); f[:] = BG
    for i, (s, L) in enumerate(streifen_liste):
        off = int((DIR[i] * (t / T) * L + PHASE[i] * L) % L)
        x = X0 + i * (CW + GAP); sl = s[off:off + H]
        w = min(CW, W - x)
        if w > 0: f[:, x:x + w] = sl[:H, :w]
    return (f.astype(np.float32) * (1 - m) + bg * m).astype(np.uint8)

n = int(round(T * FPS))
pa = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow',
      '-crf', '28' if VAR == 'desktop' else '31', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', '-an', f'hero_{VAR}.mp4']
import os
if os.environ.get('OUT_W'):   # kleinere Ausgabe, damit Shopify nur bis 720p umkodiert (sonst 1080p-Stufe mit 2,5 Mbit/s)
    i = pa.index('-c:v'); pa[i:i] = ['-vf', f"scale={os.environ['OUT_W']}:{os.environ['OUT_H']}:flags=lanczos"]
p = subprocess.Popen(pa, stdin=subprocess.PIPE)
for k in range(n):
    p.stdin.write(frame(k / FPS).tobytes())
p.stdin.close(); p.wait()
Image.fromarray(frame(0)).save(f'poster_{VAR}.jpg', quality=84, optimize=True, progressive=True)
print(VAR, W, H, n, 'Bilder', p.returncode)
