#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Edles Cover fuer "Glut" (Aschebund-Trilogie, Band 1).

Reines Pillow, keine externen Dienste. Gegenueber cover_glut.py edler:
- Supersampling (2x gerendert, dann LANCZOS verkleinert) -> glatte Kanten.
- Gold-/Glut-Palette mit Verlauf im Titel statt flachem Creme.
- Feine Ornament-Linien + duenner Goldrahmen (Romantasy-Anmutung).
- Aufsteigende Funken/Asche-Partikel statt grobem Glow.
- Elegantere, geschwungene Drachensilhouette (Kurven statt Zacken).

Run:  python3 cover_glut_edel.py
Out:  drachen/ausgabe/cover-glut.png  (1600x2560, RGB, KDP-eBook)
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFont, ImageFilter

HIER = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HIER, "ausgabe")

SS = 2                      # Supersampling-Faktor
W, H = 1600, 2560
WW, HH = W * SS, H * SS     # Render-Aufloesung

# Edle dunkle Palette mit Gold
NACHT = (14, 12, 16)
ASCHE = (32, 27, 33)
GLUT_TIEF = (96, 38, 16)
GOLD = (214, 168, 86)
GOLD_HELL = (245, 214, 150)
CREME = (242, 232, 214)
GRAU = (150, 140, 148)


_FONTS = {
    "serif_bold": [
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    ],
    "serif": [
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
    ],
}


def font(size, art="serif_bold"):
    for pfad in _FONTS.get(art, []):
        try:
            return ImageFont.truetype(pfad, size * SS)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def breite(draw, text, fnt):
    b = draw.textbbox((0, 0), text, font=fnt)
    return b[2] - b[0]


def sperren(text, n=1):
    return (" " * n).join(list(text.upper()))


def vertikal_verlauf():
    """Tiefes Nacht-zu-Glut, weich, mit goldenem Schimmer in der Mitte unten."""
    img = Image.new("RGB", (WW, HH), NACHT)
    d = ImageDraw.Draw(img)
    for y in range(HH):
        t = (y / (HH - 1))
        # Nacht -> Asche -> Glut, nicht-linear
        tt = t ** 1.5
        top, bot = ASCHE, GLUT_TIEF
        r = round(NACHT[0] + (bot[0] - NACHT[0]) * tt)
        g = round(NACHT[1] + (bot[1] - NACHT[1]) * tt)
        b = round(NACHT[2] + (bot[2] - NACHT[2]) * tt)
        d.line([(0, y), (WW, y)], fill=(r, g, b))
    return img


def weicher_schein(img, cx, cy, radius, farbe, staerke):
    """Radialer Schein ueber ein separates, weichgezeichnetes Layer (schnell)."""
    layer = Image.new("RGB", (WW, HH), (0, 0, 0))
    d = ImageDraw.Draw(layer)
    steps = 40
    for i in range(steps, 0, -1):
        r = int(radius * i / steps)
        f = (i / steps) ** 2
        d.ellipse([cx - r, cy - r, cx + r, cy + r],
                  fill=(int(farbe[0] * f), int(farbe[1] * f), int(farbe[2] * f)))
    layer = layer.filter(ImageFilter.GaussianBlur(radius // 8))
    return Image.blend(img, _additiv(img, layer, staerke), 1.0)


def _additiv(base, layer, staerke):
    from PIL import ImageChops
    return ImageChops.add(base, Image.eval(layer, lambda v: int(v * staerke)))


def emblem(img, cx, cy, scale):
    """Edles Gold-Emblem: stilisierte Flamme in einem Doppelkreis mit Strahlen.

    Wird als eigenes RGBA-Layer gezeichnet (saubere Linien) und aufgesetzt.
    Passt zu 'Glut' und zum Magiesystem (Feuer, das Leben kostet).
    """
    s = scale
    layer = Image.new("RGBA", (WW, HH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    def kreis(r, farbe, dick):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=farbe, width=dick)

    # Strahlenkranz (feine Striche nach aussen)
    n = 48
    r_in, r_out = int(s * 1.18), int(s * 1.32)
    for i in range(n):
        a = 2 * math.pi * i / n
        lang = (i % 4 == 0)
        ri = r_in
        ro = r_out + (int(s * 0.10) if lang else 0)
        d.line([(cx + ri * math.cos(a), cy + ri * math.sin(a)),
                (cx + ro * math.cos(a), cy + ro * math.sin(a))],
               fill=GOLD, width=(2 * SS if lang else SS))

    # Doppelkreis
    kreis(int(s * 1.05), GOLD, 3 * SS)
    kreis(int(s * 0.92), (GOLD[0] // 2, GOLD[1] // 2, GOLD[2] // 2), SS)

    # Stilisierte Flamme (zwei gespiegelte Beziers + innere Zunge)
    def bez(p0, p1, p2, nn=30):
        return [( (1-t)**2*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0],
                  (1-t)**2*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1] )
                for t in (k/nn for k in range(nn+1))]

    def P(dx, dy):
        return (cx + dx * s, cy + dy * s)

    flamme = (bez(P(0, -0.78), P(0.52, -0.18), P(0.30, 0.40))      # rechts aussen
              + bez(P(0.30, 0.40), P(0.16, 0.58), P(0, 0.62))       # rechts unten
              + bez(P(0, 0.62), P(-0.16, 0.58), P(-0.30, 0.40))     # links unten
              + bez(P(-0.30, 0.40), P(-0.52, -0.18), P(0, -0.78)))  # links aussen
    d.polygon(flamme, fill=GOLD_HELL)

    # innere, dunkle Flammenzunge (gibt Tiefe)
    zunge = (bez(P(0, -0.34), P(0.22, 0.02), P(0.12, 0.34))
             + bez(P(0.12, 0.34), P(0, 0.42), P(-0.12, 0.34))
             + bez(P(-0.12, 0.34), P(-0.22, 0.02), P(0, -0.34)))
    d.polygon(zunge, fill=GLUT_TIEF)

    img.alpha_composite(layer)


def funken(draw, anzahl, cy_min, cy_max):
    """Aufsteigende Glut-Funken: kleine, helle Punkte mit Halo."""
    rnd = random.Random(7)
    for _ in range(anzahl):
        x = rnd.randint(int(WW * 0.08), int(WW * 0.92))
        y = rnd.randint(int(HH * cy_min), int(HH * cy_max))
        r = rnd.choice([1, 1, 2, 2, 3]) * SS
        hell = rnd.random()
        col = GOLD_HELL if hell > 0.6 else GOLD
        draw.ellipse([x - r, y - r, x + r, y + r], fill=col)


def gold_text(img, draw, xy, text, fnt, hell=GOLD_HELL, tief=GOLD):
    """Titel mit vertikalem Gold-Verlauf + dezentem Schatten."""
    x, y = xy
    b = draw.textbbox((0, 0), text, font=fnt)
    tw, th = b[2] - b[0], b[3] - b[1]
    # Verlaufsmaske aus dem Text
    maske = Image.new("L", (tw + 20, th + 40), 0)
    dm = ImageDraw.Draw(maske)
    dm.text((10 - b[0], 10 - b[1]), text, font=fnt, fill=255)
    # Vertikaler Gold-Verlauf
    grad = Image.new("RGB", (tw + 20, th + 40))
    dg = ImageDraw.Draw(grad)
    for yy in range(grad.height):
        t = yy / max(1, grad.height - 1)
        c = (round(hell[0] + (tief[0] - hell[0]) * t),
             round(hell[1] + (tief[1] - hell[1]) * t),
             round(hell[2] + (tief[2] - hell[2]) * t))
        dg.line([(0, yy), (grad.width, yy)], fill=c)
    # Schatten
    schatten = Image.new("L", maske.size, 0)
    ImageDraw.Draw(schatten).text((10 - b[0] + 3 * SS, 10 - b[1] + 3 * SS),
                                  text, font=fnt, fill=140)
    img.paste((0, 0, 0), (x - 10, y - 10), schatten)
    img.paste(grad, (x - 10, y - 10), maske)


def linie(draw, x0, x1, y, farbe, dick=2):
    draw.rectangle([x0, y, x1, y + dick * SS], fill=farbe)


def raute(draw, cx, cy, r, farbe):
    draw.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=farbe)


def zier_trenner(draw, cy, halbbreite):
    """Feine Ziertrennlinie mit Raute in der Mitte (edel)."""
    mid = WW // 2
    linie(draw, mid - halbbreite, mid - 28 * SS, cy, GOLD, 2)
    linie(draw, mid + 28 * SS, mid + halbbreite, cy, GOLD, 2)
    raute(draw, mid, cy + SS, 14 * SS, GOLD_HELL)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    img = vertikal_verlauf()
    img = weicher_schein(img, WW // 2, int(HH * 0.95), int(WW * 0.85), (150, 70, 24), 0.9)
    img = weicher_schein(img, WW // 2, int(HH * 0.68), int(WW * 0.5), (120, 80, 30), 0.5)
    img = img.convert("RGBA")
    draw = ImageDraw.Draw(img)

    # Aufsteigende Funken (vor allem unten)
    funken(draw, 70, 0.45, 0.99)

    # Edles Gold-Emblem (Flamme im Doppelkreis) statt Drache
    emblem(img, int(WW * 0.5), int(HH * 0.70), int(WW * 0.155))
    draw = ImageDraw.Draw(img)  # nach alpha_composite neu holen

    # Duenner Goldrahmen (innen)
    m = int(WW * 0.045)
    draw.rectangle([m, m, WW - m, HH - m], outline=GOLD, width=2 * SS)
    draw.rectangle([m + 8 * SS, m + 8 * SS, WW - m - 8 * SS, HH - m - 8 * SS],
                   outline=(GOLD[0] // 2, GOLD[1] // 2, GOLD[2] // 2), width=SS)

    # --- Reihen-Label oben (gesperrt, fein) ---
    f_reihe = font(34, "serif")
    reihe = sperren("Aschebund", 1) + "   .   " + sperren("Buch Eins", 1)
    draw.text(((WW - breite(draw, reihe, f_reihe)) // 2, int(HH * 0.105)),
              reihe, font=f_reihe, fill=GOLD)

    zier_trenner(draw, int(HH * 0.145), int(WW * 0.26))

    # --- Titel: Gold-Verlauf, gesperrt ---
    titel = sperren("Glut", 1)
    f_titel = font(290, "serif_bold")
    tw = breite(draw, titel, f_titel)
    if tw > WW * 0.74:
        f_titel = font(int(290 * (WW * 0.74) / tw), "serif_bold")
        tw = breite(draw, titel, f_titel)
    ty = int(HH * 0.185)
    gold_text(img, draw, ((WW - tw) // 2, ty), titel, f_titel)
    draw = ImageDraw.Draw(img)  # nach paste neu holen

    zier_trenner(draw, ty + int(HH * 0.115), int(WW * 0.22))

    # --- Untertitel (Creme, ruhig) ---
    f_sub = font(46, "serif")
    subs = ["Wie weit gehst du,", "wenn jeder Zauber", "dich Leben kostet?"]
    sy = ty + int(HH * 0.145)
    for ln in subs:
        draw.text(((WW - breite(draw, ln, f_sub)) // 2, sy), ln, font=f_sub, fill=CREME)
        sy += 64 * SS

    # --- Autorzeile unten ---
    f_aut = font(50, "serif_bold")
    aut = sperren("Aban", 2)
    draw.text(((WW - breite(draw, aut, f_aut)) // 2, int(HH * 0.905)),
              aut, font=f_aut, fill=GOLD_HELL)

    # Herunterskalieren -> glatte Kanten
    img = img.resize((W, H), Image.LANCZOS)
    out = os.path.join(OUT_DIR, "cover-glut.png")
    img.convert("RGB").save(out, "PNG")
    print("geschrieben:", out, img.size)


if __name__ == "__main__":
    main()
