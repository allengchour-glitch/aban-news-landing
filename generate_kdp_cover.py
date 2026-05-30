#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KDP-Cover-Generator fuer das Buch "Anti-Hype".

Erzeugt ein druckfertiges Cover-Bild fuer Amazon KDP mit reinem Pillow (PIL).
Keine externen Schriften werden geladen, kein Netzwerk noetig — es werden nur
System-Schriften (DejaVu / Liberation) mit Fallback verwendet, genau wie in den
anderen Bild-Skripten dieses Repos.

Ausgabe (nach ``downloads/``):
  - ``kdp-cover-ebook.png`` — das Kindle-eBook-Frontcover.

Format-Hinweise:
  - KDP empfiehlt fuer das eBook-Cover **1600 x 2560 px** (Seitenverhaeltnis 1.6),
    RGB. Genau dieses Mass wird hier erzeugt.
  - Saemtlicher Text bleibt innerhalb einer Sicherheitsmarge von rund 10 %, damit
    KDP das Cover nicht wegen Text im Anschnitt (Bleed) ablehnt.
  - Dies ist ein **reines Frontcover**. Fuer ein TASCHENBUCH braucht man ein
    durchgehendes Wraparound-Cover mit Ruecken (Spine) und Rueckseite (Back) —
    das ist hier bewusst nicht enthalten (out of scope).

Verwendung:
    python3 generate_kdp_cover.py

Weitere Sprachen lassen sich spaeter leicht ergaenzen: einfach einen Eintrag im
Dict ``COVERS`` hinzufuegen (Titel, Untertitel, Autorzeile, Dateiname). Aktuell
wird nur die deutsche Variante ("de") erzeugt.
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

# --- KDP eBook-Cover Masse ---------------------------------------------------
WIDTH = 1600
HEIGHT = 2560

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


def render_cover(title, subtitle, author, out_path):
    """Rendert ein einzelnes Frontcover und speichert es als PNG."""
    # Hintergrund: dezenter Verlauf von Background-Creme zu hellerem Creme.
    # Bewusst zurueckhaltend (anti-hype), nicht grell.
    img = _vertical_gradient(WIDTH, HEIGHT, BACKGROUND, CREAM)
    draw = ImageDraw.Draw(img)

    # Sicherheitsmarge (~10 %), damit kein Text in den Anschnitt laeuft.
    margin = int(WIDTH * 0.10)
    content_width = WIDTH - 2 * margin

    # Dezenter Amber-Seitenstreifen links als ruhiges Marken-Element.
    bar_width = int(WIDTH * 0.035)
    draw.rectangle([(0, 0), (bar_width, HEIGHT)], fill=AMBER)

    # --- Kreis-Motiv oben (statt Emoji, da Glyphen in PIL-Fonts fehlen) ----
    circle_d = int(WIDTH * 0.22)
    circle_x0 = margin
    circle_y0 = int(HEIGHT * 0.12)
    circle_x1 = circle_x0 + circle_d
    circle_y1 = circle_y0 + circle_d
    # Gefuellter Amber-Kreis mit duennem dunkleren Ring.
    draw.ellipse(
        [(circle_x0, circle_y0), (circle_x1, circle_y1)],
        fill=AMBER,
        outline=AMBER_DARK,
        width=max(2, int(WIDTH * 0.004)),
    )
    # Kleiner Creme-Innenpunkt fuer ruhige Tiefe (schlicht gehalten).
    inset = int(circle_d * 0.30)
    draw.ellipse(
        [
            (circle_x0 + inset, circle_y0 + inset),
            (circle_x1 - inset, circle_y1 - inset),
        ],
        fill=CREAM,
    )

    # --- Titel (gross, fett) -----------------------------------------------
    # Titelgroesse so waehlen, dass er bequem in die Breite passt.
    title_size = int(WIDTH * 0.165)
    title_font = font(title_size, "bold")
    while _text_width(draw, title, title_font) > content_width and title_size > 40:
        title_size -= 4
        title_font = font(title_size, "bold")

    title_y = int(HEIGHT * 0.40)
    title_w = _text_width(draw, title, title_font)
    title_x = margin + (content_width - title_w) // 2
    draw.text((title_x, title_y), title, font=title_font, fill=INK)

    # Dezente Amber-Trennlinie unter dem Titel.
    title_bbox = draw.textbbox((title_x, title_y), title, font=title_font)
    rule_y = title_bbox[3] + int(HEIGHT * 0.025)
    rule_w = int(content_width * 0.5)
    rule_x0 = margin + (content_width - rule_w) // 2
    draw.rectangle(
        [(rule_x0, rule_y), (rule_x0 + rule_w, rule_y + max(4, int(HEIGHT * 0.004)))],
        fill=AMBER,
    )

    # --- Untertitel (kleiner, umgebrochen) ---------------------------------
    sub_size = int(WIDTH * 0.052)
    sub_font = font(sub_size, "regular")
    # Erst an manuellen Umbruechen (\n) trennen, dann jede Zeile bei Bedarf
    # automatisch umbrechen — so haengt z. B. "KI" nicht allein am Zeilenende.
    sub_lines = []
    for absatz in subtitle.split("\n"):
        sub_lines.extend(wrap_text(draw, absatz, sub_font, content_width))
    line_gap = int(sub_size * 1.35)
    sub_y = rule_y + int(HEIGHT * 0.045)
    for line in sub_lines:
        line_w = _text_width(draw, line, sub_font)
        line_x = margin + (content_width - line_w) // 2
        draw.text((line_x, sub_y), line, font=sub_font, fill=AMBER_DARK)
        sub_y += line_gap

    # --- Autorzeile unten ---------------------------------------------------
    author_size = int(WIDTH * 0.040)
    author_font = font(author_size, "bold")
    author_y = int(HEIGHT * 0.90)
    author_w = _text_width(draw, author, author_font)
    author_x = margin + (content_width - author_w) // 2
    draw.text((author_x, author_y), author, font=author_font, fill=INK)

    img = img.convert("RGB")
    img.save(out_path, "PNG")
    return out_path


# --- Cover-Definitionen (pro Sprache leicht erweiterbar) --------------------
COVERS = {
    "de": {
        "title": "Anti-Hype",
        # \n erzwingt einen sauberen Umbruch nach "Solopreneure".
        "subtitle": "Wie deutsche Solopreneure\nKI ohne Bullshit einsetzen",
        # Auf dem Cover nur der Autorname in Versalien (Buchkonvention; KDP mag
        # keine Werbe-URLs auf dem Cover). Die Domain steht im Buch-Footer.
        "author": "ABAN",
        "filename": "kdp-cover-ebook.png",
    },
}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for lang, spec in COVERS.items():
        out_path = os.path.join(OUT_DIR, spec["filename"])
        render_cover(spec["title"], spec["subtitle"], spec["author"], out_path)
        size = os.path.getsize(out_path)
        with Image.open(out_path) as check:
            dims = check.size
        print(
            "[{}] geschrieben: {} ({} x {} px, {} Bytes)".format(
                lang, out_path, dims[0], dims[1], size
            )
        )


if __name__ == "__main__":
    main()
