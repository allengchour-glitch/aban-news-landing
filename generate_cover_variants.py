#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Shop- und Social-Cover-Varianten fuer das Buch "Anti-Hype".

Das hochformatige KDP-Cover (``downloads/kdp-cover-ebook.png``, 1600 x 2560)
ist fuer Amazon KDP gemacht. Shop-Plattformen wie Lemon Squeezy oder Gumroad
zeigen Produktbilder aber **quadratisch oder breit** an — ein hohes Cover wird
dort beschnitten oder mit Raendern dargestellt. Dieses Skript erzeugt deshalb
zwei zusaetzliche, bewusst komponierte Varianten mit derselben Markensprache
(Amber-Kreis, Titel, Untertitel, Autorzeile) wie das KDP-Cover.

Ausgabe (nach ``downloads/``):
  - ``cover-square.png`` — 1600 x 1600, fuer Shop-Produktbilder (Lemon Squeezy,
    Gumroad), zentriert und ruhig komponiert.
  - ``cover-wide.png`` — 1280 x 720 (16:9), fuer Social-/Shop-Banner: links der
    Titelblock, rechts das Amber-Kreis-Motiv, Footer "PDF / ePub / Kindle".

Das ``kdp-cover-ebook.png`` bleibt unveraendert der KDP-Upload — diese beiden
Bilder sind ausschliesslich fuer Shop und Social gedacht.

Reines Pillow (PIL), kein Netzwerk, nur System-Schriften (DejaVu / Liberation)
mit Fallback. Helfer (``font``, Farben, ``wrap_text``, Verlauf, Kreis-/Titel-
Layout) sind aus ``generate_kdp_cover.py`` uebernommen, damit alle Cover
zusammenpassen.

Verwendung:
    python3 generate_cover_variants.py

Weitere Groessen lassen sich leicht ergaenzen: einfach einen Eintrag im Dict
``VARIANTS`` hinzufuegen (Renderer, Masse, Dateiname).
"""

import os

from PIL import Image, ImageDraw, ImageFont

# --- Marken-Farben (siehe :root in index.html / css/styles.css) -------------
AMBER = (217, 119, 6)        # #d97706
AMBER_DARK = (180, 83, 9)    # #b45309
CREAM = (254, 243, 199)      # #fef3c7
INK = (31, 41, 55)           # #1f2937
BACKGROUND = (255, 251, 245)  # #fffbf5

# --- Ausgabe-Verzeichnis -----------------------------------------------------
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "downloads")

# --- Buch-Inhalt (identisch zum KDP-Cover) ----------------------------------
TITLE = "Anti-Hype"
SUBTITLE = "Wie deutsche Solopreneure\nKI ohne Bullshit einsetzen"
AUTHOR = "ABAN"
FORMATS = "PDF · ePub · Kindle"

# Schrift-Kandidaten: zuerst DejaVu, dann Liberation als Fallback.
# Es werden NUR vorhandene System-Schriften genutzt; nichts wird heruntergeladen.
_FONT_CANDIDATES = {
    "bold": [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
        "DejaVuSans-Bold.ttf",
        "LiberationSans-Bold.ttf",
    ],
    "regular": [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
        "DejaVuSans.ttf",
        "LiberationSans-Regular.ttf",
    ],
}


def font(size, weight="regular"):
    """Laedt eine System-Schrift in der gewuenschten Groesse mit Fallback-Kette.

    Probiert DejaVu, dann Liberation. Findet sich nichts, wird die
    Pillow-Standardschrift zurueckgegeben (Groesse dann nicht steuerbar),
    damit das Skript nie abbricht.
    """
    for path in _FONT_CANDIDATES.get(weight, []):
        try:
            return ImageFont.truetype(path, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def _text_width(draw, text, fnt):
    """Liefert die Pixelbreite eines Textes (robust ueber textbbox)."""
    bbox = draw.textbbox((0, 0), text, font=fnt)
    return bbox[2] - bbox[0]


def _text_height(draw, text, fnt):
    """Liefert die Pixelhoehe eines Textes (robust ueber textbbox)."""
    bbox = draw.textbbox((0, 0), text, font=fnt)
    return bbox[3] - bbox[1]


def wrap_text(draw, text, fnt, max_width):
    """Bricht Text wortweise um, sodass jede Zeile in ``max_width`` passt.

    Nutzt ``draw.textbbox`` zur Messung. Einzelne ueberlange Woerter werden in
    eine eigene Zeile gesetzt (nicht hart getrennt).
    """
    words = text.split()
    if not words:
        return []
    lines = []
    current = words[0]
    for word in words[1:]:
        candidate = current + " " + word
        if _text_width(draw, candidate, fnt) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def _vertical_gradient(width, height, top_color, bottom_color):
    """Erzeugt einen sanften vertikalen Farbverlauf von oben nach unten."""
    base = Image.new("RGB", (width, height), top_color)
    top_r, top_g, top_b = top_color
    bot_r, bot_g, bot_b = bottom_color
    draw = ImageDraw.Draw(base)
    for y in range(height):
        t = y / max(1, height - 1)
        r = round(top_r + (bot_r - top_r) * t)
        g = round(top_g + (bot_g - top_g) * t)
        b = round(top_b + (bot_b - top_b) * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    return base


def _draw_circle(draw, x0, y0, diameter):
    """Zeichnet das Marken-Kreis-Motiv: Amber-Kreis mit dunklem Ring und
    ruhigem Creme-Innenpunkt — identisch zur Sprache des KDP-Covers."""
    x1 = x0 + diameter
    y1 = y0 + diameter
    ring = max(2, int(diameter * 0.018))
    draw.ellipse(
        [(x0, y0), (x1, y1)],
        fill=AMBER,
        outline=AMBER_DARK,
        width=ring,
    )
    inset = int(diameter * 0.30)
    draw.ellipse(
        [(x0 + inset, y0 + inset), (x1 - inset, y1 - inset)],
        fill=CREAM,
    )


def _fit_title_font(draw, text, max_width, start_size):
    """Verkleinert die Titelschrift, bis sie in ``max_width`` passt."""
    size = start_size
    fnt = font(size, "bold")
    while _text_width(draw, text, fnt) > max_width and size > 40:
        size -= 4
        fnt = font(size, "bold")
    return fnt


# --- Renderer: Quadrat (1600 x 1600) ----------------------------------------
def render_square(width, height, out_path):
    """Quadratisches Cover, zentriert komponiert: Kreis oben, Titel, Trennlinie,
    Untertitel, Autorzeile unten — ruhig und bewusst (anti-hype)."""
    img = _vertical_gradient(width, height, BACKGROUND, CREAM)
    draw = ImageDraw.Draw(img)

    margin = int(width * 0.10)
    content_width = width - 2 * margin

    # Dezenter Amber-Seitenstreifen links als ruhiges Marken-Element.
    bar_width = int(width * 0.035)
    draw.rectangle([(0, 0), (bar_width, height)], fill=AMBER)

    # Kreis-Motiv oben, horizontal zentriert.
    circle_d = int(width * 0.20)
    circle_x0 = margin + (content_width - circle_d) // 2
    circle_y0 = int(height * 0.12)
    _draw_circle(draw, circle_x0, circle_y0, circle_d)

    # Titel (gross, fett), zentriert.
    title_font = _fit_title_font(draw, TITLE, content_width, int(width * 0.155))
    title_y = int(height * 0.40)
    title_w = _text_width(draw, TITLE, title_font)
    title_x = margin + (content_width - title_w) // 2
    draw.text((title_x, title_y), TITLE, font=title_font, fill=INK)

    # Dezente Amber-Trennlinie unter dem Titel.
    title_bbox = draw.textbbox((title_x, title_y), TITLE, font=title_font)
    rule_y = title_bbox[3] + int(height * 0.025)
    rule_w = int(content_width * 0.5)
    rule_x0 = margin + (content_width - rule_w) // 2
    draw.rectangle(
        [(rule_x0, rule_y), (rule_x0 + rule_w, rule_y + max(4, int(height * 0.004)))],
        fill=AMBER,
    )

    # Untertitel (kleiner, umgebrochen), zentriert.
    sub_size = int(width * 0.050)
    sub_font = font(sub_size, "regular")
    sub_lines = []
    for absatz in SUBTITLE.split("\n"):
        sub_lines.extend(wrap_text(draw, absatz, sub_font, content_width))
    line_gap = int(sub_size * 1.35)
    sub_y = rule_y + int(height * 0.045)
    for line in sub_lines:
        line_w = _text_width(draw, line, sub_font)
        line_x = margin + (content_width - line_w) // 2
        draw.text((line_x, sub_y), line, font=sub_font, fill=AMBER_DARK)
        sub_y += line_gap

    # Autorzeile unten, zentriert.
    author_size = int(width * 0.040)
    author_font = font(author_size, "bold")
    author_y = int(height * 0.88)
    author_w = _text_width(draw, AUTHOR, author_font)
    author_x = margin + (content_width - author_w) // 2
    draw.text((author_x, author_y), AUTHOR, font=author_font, fill=INK)

    img = img.convert("RGB")
    img.save(out_path, "PNG")
    return out_path


# --- Renderer: Breit / 16:9 (1280 x 720) ------------------------------------
def render_wide(width, height, out_path):
    """Breites Banner (16:9): links Titelblock, rechts das Kreis-Motiv, unten
    die Formatzeile. Gleiche Markensprache wie die anderen Cover."""
    img = _vertical_gradient(width, height, BACKGROUND, CREAM)
    draw = ImageDraw.Draw(img)

    margin = int(height * 0.10)

    # Dezenter Amber-Seitenstreifen links.
    bar_width = int(width * 0.018)
    draw.rectangle([(0, 0), (bar_width, height)], fill=AMBER)

    # Rechte Spalte: Kreis-Motiv, vertikal zentriert.
    circle_d = int(height * 0.46)
    circle_x0 = int(width * 0.70)
    circle_y0 = (height - circle_d) // 2
    _draw_circle(draw, circle_x0, circle_y0, circle_d)

    # Linke Spalte: Titelblock. Breite bis kurz vor dem Kreis.
    left_x = bar_width + margin
    block_right = circle_x0 - int(width * 0.04)
    block_width = block_right - left_x

    # Titel (fett), linksbuendig.
    title_font = _fit_title_font(draw, TITLE, block_width, int(height * 0.165))
    title_y = int(height * 0.22)
    draw.text((left_x, title_y), TITLE, font=title_font, fill=INK)

    # Amber-Trennlinie unter dem Titel.
    title_bbox = draw.textbbox((left_x, title_y), TITLE, font=title_font)
    rule_y = title_bbox[3] + int(height * 0.035)
    rule_w = int(block_width * 0.45)
    draw.rectangle(
        [(left_x, rule_y), (left_x + rule_w, rule_y + max(4, int(height * 0.006)))],
        fill=AMBER,
    )

    # Untertitel (umgebrochen), linksbuendig.
    sub_size = int(height * 0.052)
    sub_font = font(sub_size, "regular")
    sub_lines = []
    for absatz in SUBTITLE.split("\n"):
        sub_lines.extend(wrap_text(draw, absatz, sub_font, block_width))
    line_gap = int(sub_size * 1.35)
    sub_y = rule_y + int(height * 0.06)
    for line in sub_lines:
        draw.text((left_x, sub_y), line, font=sub_font, fill=AMBER_DARK)
        sub_y += line_gap

    # Footer-Formatzeile, innerhalb der Sicherheitsmarge.
    fmt_size = int(height * 0.040)
    fmt_font = font(fmt_size, "bold")
    fmt_y = height - margin - _text_height(draw, FORMATS, fmt_font)
    draw.text((left_x, fmt_y), FORMATS, font=fmt_font, fill=INK)

    # Autorzeile rechts unter dem Kreis, zentriert zur Kreisachse.
    author_size = int(height * 0.045)
    author_font = font(author_size, "bold")
    author_w = _text_width(draw, AUTHOR, author_font)
    author_x = circle_x0 + (circle_d - author_w) // 2
    author_y = circle_y0 + circle_d + int(height * 0.04)
    draw.text((author_x, author_y), AUTHOR, font=author_font, fill=INK)

    img = img.convert("RGB")
    img.save(out_path, "PNG")
    return out_path


# --- Varianten-Definitionen (leicht erweiterbar) ----------------------------
VARIANTS = {
    "square": {
        "render": render_square,
        "width": 1600,
        "height": 1600,
        "filename": "cover-square.png",
    },
    "wide": {
        "render": render_wide,
        "width": 1280,
        "height": 720,
        "filename": "cover-wide.png",
    },
}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, spec in VARIANTS.items():
        out_path = os.path.join(OUT_DIR, spec["filename"])
        spec["render"](spec["width"], spec["height"], out_path)
        size = os.path.getsize(out_path)
        with Image.open(out_path) as check:
            dims = check.size
        print(
            "[{}] geschrieben: {} ({} x {} px, {} Bytes)".format(
                name, out_path, dims[0], dims[1], size
            )
        )


if __name__ == "__main__":
    main()
