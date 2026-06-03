#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cover-Generator fuer "Glut" (Aschebund-Trilogie, Band 1).

Reines Pillow (PIL), keine externen Dienste, keine Kosten. Erzeugt ein
dunkles Dark-Fantasy/Romantasy-Cover im KDP-eBook-Format (1600x2560, RGB):
Asche-zu-Glut-Verlauf, eine gezeichnete Drachen-Silhouette als Motiv,
Serifen-Titel. Bewusst schlicht und typo-stark - sofort KDP-tauglich.

Run:  python3 cover_glut.py
Out:  ki-schriftsteller/drachen/ausgabe/cover-glut.png

Hinweis: Das ist ein sauberes Typo-Cover als sichere Basis. Eine illustrierte
Variante (Adobe/Stock) kann spaeter darauf aufsetzen.
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

HIER = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HIER, "ausgabe")

W, H = 1600, 2560

# Dunkle Asche-/Glut-Palette
SCHWARZ = (18, 16, 20)
ASCHE = (38, 34, 40)
GLUT_TIEF = (120, 40, 12)
GLUT = (217, 96, 24)
GLUT_HELL = (245, 158, 66)
CREME = (240, 226, 200)
GRAU = (150, 142, 150)


_FONTS = {
    "serif_bold": [
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    ],
    "serif": [
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
    ],
    "sans": [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ],
}


def font(size, art="serif_bold"):
    for pfad in _FONTS.get(art, []):
        try:
            return ImageFont.truetype(pfad, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def breite(draw, text, fnt):
    b = draw.textbbox((0, 0), text, font=fnt)
    return b[2] - b[0]


def sperren(text):
    """Versalien mit Sperrung fuer den Titel."""
    return " ".join(list(text.upper()))


def vertikal_verlauf(top, bot):
    """Asche oben -> Glut unten."""
    img = Image.new("RGB", (W, H), top)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = (y / (H - 1)) ** 1.6  # unten staerker zur Glut
        r = round(top[0] + (bot[0] - top[0]) * t)
        g = round(top[1] + (bot[1] - top[1]) * t)
        b = round(top[2] + (bot[2] - top[2]) * t)
        d.line([(0, y), (W, y)], fill=(r, g, b))
    return img


def glut_schein(img, cx, cy, radius, farbe, staerke=0.5):
    """Weicher radialer Glut-Schein (Glow) um einen Punkt."""
    schein = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(schein)
    schritte = 60
    for i in range(schritte, 0, -1):
        r = int(radius * i / schritte)
        f = (i / schritte)
        col = (int(farbe[0] * f), int(farbe[1] * f), int(farbe[2] * f))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    # additiv mischen
    base = img.load()
    sch = schein.load()
    for y in range(0, H, 1):
        for x in range(0, W, 1):
            br, bg, bb = base[x, y]
            sr, sg, sb = sch[x, y]
            base[x, y] = (min(255, br + int(sr * staerke)),
                          min(255, bg + int(sg * staerke)),
                          min(255, bb + int(sb * staerke)))
    return img


def drache_silhouette(draw, cx, cy, scale):
    """Fliegende Drachen-Silhouette (von vorn/oben), klar lesbar, dunkel.

    Aufbau: zwei grosse Fledermaus-artige Fluegel mit Fingerzacken, ein
    schlanker Koerper mit nach vorn gestrecktem Hals/Kopf und ein langer,
    nach unten schwingender Schweif.
    """
    s = scale

    def fluegel(seite):
        """seite = -1 (links) oder +1 (rechts)."""
        m = seite
        # Vom Schulteransatz nach aussen, mit drei Fingerspitzen und
        # eingebuchteter Flughaut dazwischen.
        return [
            (cx + m * 0.18 * s, cy - 0.18 * s),   # Schulter
            (cx + m * 1.05 * s, cy - 1.05 * s),   # Fingerspitze 1 (oben)
            (cx + m * 0.95 * s, cy - 0.55 * s),   # Bucht
            (cx + m * 1.75 * s, cy - 0.95 * s),   # Fingerspitze 2
            (cx + m * 1.45 * s, cy - 0.40 * s),   # Bucht
            (cx + m * 2.15 * s, cy - 0.55 * s),   # Fingerspitze 3 (aussen)
            (cx + m * 1.70 * s, cy - 0.05 * s),   # Bucht
            (cx + m * 2.05 * s, cy + 0.30 * s),   # Fingerspitze 4 (unten)
            (cx + m * 1.20 * s, cy + 0.18 * s),   # Flughaut zurueck
            (cx + m * 0.30 * s, cy + 0.10 * s),   # zum Koerper
        ]

    # Koerper (schlank, leicht keilfoermig) + Hals + Kopf nach vorn (unten)
    koerper = [
        (cx - 0.16 * s, cy - 0.20 * s),
        (cx + 0.16 * s, cy - 0.20 * s),
        (cx + 0.12 * s, cy + 0.55 * s),
        (cx + 0.05 * s, cy + 0.80 * s),   # Brust
        (cx, cy + 0.95 * s),              # Kopfansatz
        (cx - 0.05 * s, cy + 0.80 * s),
        (cx - 0.12 * s, cy + 0.55 * s),
    ]
    # Kopf (kleines Dreieck, vorgestreckt)
    kopf = [
        (cx - 0.07 * s, cy + 0.92 * s),
        (cx + 0.07 * s, cy + 0.92 * s),
        (cx, cy + 1.12 * s),
    ]
    # langer Schweif, nach unten-hinten schwingend
    schweif = [
        (cx - 0.12 * s, cy - 0.18 * s),
        (cx + 0.12 * s, cy - 0.18 * s),
        (cx + 0.45 * s, cy - 1.15 * s),   # Schweif schwingt nach oben-hinten
        (cx + 0.30 * s, cy - 1.55 * s),   # Schweifspitze (Widerhaken)
        (cx + 0.18 * s, cy - 1.20 * s),
        (cx, cy - 0.30 * s),
    ]

    for poly in (schweif, fluegel(-1), fluegel(1), koerper, kopf):
        draw.polygon(poly, fill=SCHWARZ)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    img = vertikal_verlauf(ASCHE, GLUT_TIEF)
    # Glut-Schein unten (als stiege Hitze auf)
    img = glut_schein(img, W // 2, int(H * 0.93), int(W * 0.75), GLUT, staerke=0.45)
    img = glut_schein(img, W // 2, int(H * 0.62), int(W * 0.42), GLUT_HELL, staerke=0.25)
    draw = ImageDraw.Draw(img)

    # Drache, fliegend, vor dem Glutschein in der unteren Bildhaelfte
    drache_silhouette(draw, int(W * 0.5), int(H * 0.72), int(W * 0.17))

    # --- Reihen-Label oben ---
    f_reihe = font(40, "sans")
    reihe = "ASCHEBUND  -  BUCH EINS"
    draw.text(((W - breite(draw, reihe, f_reihe)) // 2, int(H * 0.085)),
              reihe, font=f_reihe, fill=GRAU)

    # --- Titel gross, gesperrt, Serif ---
    titel = sperren("Glut")
    f_titel = font(300, "serif_bold")
    tw = breite(draw, f_titel and titel, f_titel)
    if tw > W * 0.8:
        f_titel = font(int(300 * (W * 0.8) / tw), "serif_bold")
        tw = breite(draw, titel, f_titel)
    ty = int(H * 0.16)
    # leichter Schatten + Glut-Glanz
    draw.text(((W - tw) // 2 + 4, ty + 4), titel, font=f_titel, fill=SCHWARZ)
    draw.text(((W - tw) // 2, ty), titel, font=f_titel, fill=CREME)

    # Trennlinie
    ly = ty + int(H * 0.115)
    lw = int(W * 0.34)
    draw.rectangle([(W - lw) // 2, ly, (W + lw) // 2, ly + 5], fill=GLUT)

    # --- Untertitel (im dunklen Bereich oben, klar lesbar) ---
    f_sub = font(48, "serif")
    subs = ["Wie weit gehst du,", "wenn jeder Zauber", "dich Leben kostet?"]
    sy = ly + int(H * 0.025)
    for ln in subs:
        draw.text(((W - breite(draw, ln, f_sub)) // 2, sy), ln, font=f_sub, fill=CREME)
        sy += 64

    # --- Autorzeile unten ---
    f_aut = font(54, "serif_bold")
    aut = "ABAN"
    draw.text(((W - breite(draw, aut, f_aut)) // 2, int(H * 0.90)),
              aut, font=f_aut, fill=CREME)

    out = os.path.join(OUT_DIR, "cover-glut.png")
    img.convert("RGB").save(out, "PNG")
    print("geschrieben:", out, img.size)


if __name__ == "__main__":
    main()
