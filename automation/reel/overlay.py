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

# --- Sichere Zone (23.09.2026, Betreiber-Screenshot des ersten TikTok-Posts) ------------------------------
# TikTok/IG legen ihre eigene Oberflaeche UEBER das Video: oben Suchleiste (~0-200 px), unten Nutzername,
# Caption, Fortschrittsbalken und Werbebanner (~1440-1920 px), rechts die Knopfleiste (x > 930, y ~950-1500).
# Das alte Fussfeld (1530-1920) lag exakt unter der Caption: Titel und Preis waren im Screenshot unlesbar,
# die Kopfleiste (0-190) unter der Suchleiste. Alles Wichtige steht jetzt zwischen 200 und 1470 px und
# Fusszeile/Preis sind auf die linke Mitte (CX_FUSS) zentriert, damit die Knopfleiste nichts verdeckt.
KOPF_Y = 200            # Kopfleiste 200-330
HOOK_Y = 350            # Hook-Box ab 350
FUSS_Y = 1170           # Fussfeld 1170-1440 (Video liegt bei 600-1162, siehe make_reel.sh)
FUSS_ENDE = 1440
CX_FUSS = 470           # Mitte der Textzone links der Knopfleiste (0-940)

def text_cx(draw, cx, y, s, f, fill, shadow=True):
    w = draw.textlength(s, font=f)
    x = cx - w / 2
    if shadow: draw.text((x + 2, y + 3), s, font=f, fill=(0, 0, 0, 160))
    draw.text((x, y), s, font=f, fill=fill)

def main(out_static, out_hook, t1, t2, price, hook):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.rectangle((0, KOPF_Y, W, KOPF_Y + 130), fill=(20, 20, 20, 140))                       # Kopfleiste
    spaced(d, KOPF_Y + 26, "LUXESTYLE", font(F_SERIF, 44), WHITE, sp=8)
    d.rectangle((W/2 - 60, KOPF_Y + 92, W/2 + 60, KOPF_Y + 96), fill=GOLD)
    d.rectangle((0, FUSS_Y, W, FUSS_ENDE), fill=(20, 20, 20, 168))                          # Fussfeld
    d.rectangle((CX_FUSS - 100, FUSS_Y + 16, CX_FUSS + 100, FUSS_Y + 20), fill=GOLD)
    fT = font(F_BOLD, 46)
    zeilen = [z for z in (t1, t2) if z] or [""]
    if len(zeilen) == 1: zeilen = wrap(d, zeilen[0], fT, 800, 2)
    zeilen = [z for z in zeilen if d.textlength(z, font=fT) <= 820] or [wrap(d, " ".join(zeilen), fT, 800, 2)[0]]
    y = FUSS_Y + 28
    for z in zeilen[:2]: text_cx(d, CX_FUSS, y, z, fT, WHITE); y += 54
    text_cx(d, CX_FUSS, y + 2, price, font(F_BOLD, 68), GOLD); y += 2 + 80
    text_cx(d, CX_FUSS, min(y, FUSS_ENDE - 36), "luxestyle.ch · Klarna & TWINT · Gratis Versand ab CHF 50", font(F_REG, 26), (235, 235, 235, 255), shadow=False)
    img.save(out_static)
    hk = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d2 = ImageDraw.Draw(hk)
    if hook:
        fH = font(F_BOLD, 58); lines = wrap(d2, hook, fH, 880, 2)
        hgt = 56 + 72 * len(lines)
        box = Image.new("RGBA", (W, H), (0, 0, 0, 0)); bd = ImageDraw.Draw(box)
        bd.rounded_rectangle((60, HOOK_Y, W - 60, HOOK_Y + hgt), radius=28, fill=(20, 20, 20, 165))
        hk = Image.alpha_composite(hk, box); d2 = ImageDraw.Draw(hk)
        yy = HOOK_Y + 28
        for l in lines: text_c(d2, yy, l, fH, GOLD); yy += 72
    hk.save(out_hook)

if __name__ == "__main__":
    a = sys.argv[1:] + [""] * 6
    main(a[0], a[1], a[2], a[3], a[4], a[5])
