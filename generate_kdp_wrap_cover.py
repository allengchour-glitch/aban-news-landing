#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KDP-Wraparound-Cover-Generator fuer das Taschenbuch "Anti-Hype".

Erzeugt ein druckfertiges, durchgehendes Taschenbuch-Cover (Rueckseite +
Ruecken + Vorderseite) fuer Amazon KDP mit reinem Pillow (PIL). Kein Netzwerk,
keine externen Schriften — es werden nur System-Schriften (DejaVu / Liberation)
mit Fallback genutzt, genau wie in den anderen Bild-Skripten dieses Repos.

Ausgabe (nach ``downloads/``):
  - ``kdp-cover-paperback.png`` — das vollstaendige Wraparound-Cover, 300 DPI RGB.

------------------------------------------------------------------------------
WICHTIG: Die Cover-MASSE haengen von der finalen SEITENZAHL ab!
------------------------------------------------------------------------------
Der Ruecken (Spine) wird breiter, je mehr Seiten das Buch hat. KDP rechnet fuer
weisses Papier mit rund **0.002252 Zoll pro Seite**. Die Gesamtbreite des Covers
ist also nicht konstant, sondern:

    Gesamtbreite = 2 x Trim-Breite + Ruecken + 2 x Anschnitt (Bleed)
    Gesamthoehe  = Trim-Hoehe + 2 x Anschnitt (Bleed)

mit Trim 5 x 8 Zoll und Bleed 0.125 Zoll je Seite.

Bei der Standard-Annahme von 19 Seiten ist der Ruecken nur ~0.043 Zoll breit —
viel zu schmal fuer lesbaren Text. In dem Fall bleibt der Ruecken leer und es
wird eine Notiz ausgegeben. Erst ab ~100 Seiten wird der Ruecken bedruckt.

ABLAUF in der Praxis:
  1. Manuskript bei KDP hochladen.
  2. KDP zeigt die **tatsaechliche Seitenzahl** des fertigen Innenteils an.
  3. Dieses Skript mit genau dieser Zahl erneut laufen lassen:

         python3 generate_kdp_wrap_cover.py --pages 132

     Nur so passt der Ruecken exakt und KDP akzeptiert das Cover.

Verwendung:
    python3 generate_kdp_wrap_cover.py                # Default: 19 Seiten
    python3 generate_kdp_wrap_cover.py --pages 132    # mit echter Seitenzahl
    python3 generate_kdp_wrap_cover.py --pages 132 --dpi 300

Hinweis: 19 Seiten ist nur ein Platzhalter, damit das Skript out-of-the-box
laeuft. Der reale Wert kommt aus dem KDP-Dashboard nach dem Manuskript-Upload.
"""

import argparse
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

# --- KDP Taschenbuch-Masse (in Zoll) ----------------------------------------
TRIM_W_IN = 5.0          # Trim-Breite
TRIM_H_IN = 8.0          # Trim-Hoehe
BLEED_IN = 0.125         # Anschnitt je Aussenseite
SAFE_IN = 0.25           # Sicherheitsabstand zur Trim-Kante (Text bleibt drin)
SPINE_PER_PAGE_IN = 0.002252  # weisses Papier: Ruecken-Zuwachs pro Seite
# Ab dieser Ruecken-Breite (Zoll) wird Text auf den Ruecken gedruckt.
SPINE_TEXT_MIN_IN = 0.0625
DEFAULT_PAGES = 19
DEFAULT_DPI = 300

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


# --- Inhalt (Aban-Voice: pragmatisch, direkt, anti-hype, du-Form) -----------
FRONT_TITLE = "Anti-Hype"
# \n erzwingt einen sauberen Umbruch nach "Solopreneure".
FRONT_SUBTITLE = "Wie deutsche Solopreneure\nKI ohne Bullshit einsetzen"
AUTHOR = "ABAN"
SPINE_TEXT = "Anti-Hype · ABAN"

BACK_HEADLINE = "Schluss mit dem Laerm."
BACK_BLURB = (
    "Du hast genug von grossen Versprechen und leeren Schlagworten. "
    "Dieses Buch zeigt dir, was KI in deinem Alltag wirklich leistet "
    "und was nicht. Klare Sprache, echte Beispiele, ehrliche Grenzen. "
    "Du liest es an einem Nachmittag und weisst danach, wo du anfaengst."
)
BACK_BULLETS = [
    "Welche Aufgaben du heute an KI abgibst",
    "Wie du Werkzeuge ohne Vorwissen auswaehlst",
    "Woran du faule Versprechen sofort erkennst",
]
BACK_URL = "abannews.com"


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


def compute_dimensions(pages, dpi):
    """Berechnet alle Cover-Masse in Pixeln aus Seitenzahl und DPI.

    Liefert ein Dict mit den wichtigsten Massen (Pixel und Zoll).
    """
    spine_in = pages * SPINE_PER_PAGE_IN
    full_w_in = 2 * TRIM_W_IN + spine_in + 2 * BLEED_IN
    full_h_in = TRIM_H_IN + 2 * BLEED_IN

    px = lambda inches: int(round(inches * dpi))
    return {
        "dpi": dpi,
        "pages": pages,
        "spine_in": spine_in,
        "full_w_in": full_w_in,
        "full_h_in": full_h_in,
        "full_w_px": px(full_w_in),
        "full_h_px": px(full_h_in),
        "bleed_px": px(BLEED_IN),
        "safe_px": px(SAFE_IN),
        "trim_w_px": px(TRIM_W_IN),
        "trim_h_px": px(TRIM_H_IN),
        "spine_px": px(spine_in),
        "spine_text_ok": spine_in >= SPINE_TEXT_MIN_IN,
    }


def _draw_front(img, draw, dims):
    """Zeichnet die Vorderseite (rechtes Panel) — spiegelt das eBook-Cover."""
    bleed = dims["bleed_px"]
    safe = dims["safe_px"]
    # Linke Kante der Vorderseite = Bleed + Trim + Spine + Trim.
    front_x0 = bleed + dims["trim_w_px"] + dims["spine_px"]
    panel_w = dims["trim_w_px"]
    H = dims["full_h_px"]

    # Inhaltsbereich (Safe Area) innerhalb des Front-Panels.
    cx0 = front_x0 + safe
    cx1 = front_x0 + panel_w - safe
    content_w = cx1 - cx0
    center_x = (cx0 + cx1) // 2

    # Dezenter Amber-Seitenstreifen an der Aussenkante (rechts), ruhig gehalten.
    bar_w = max(2, int(panel_w * 0.035))
    bar_x1 = bleed + dims["trim_w_px"] + dims["spine_px"] + panel_w
    draw.rectangle([(bar_x1 - bar_w, 0), (bar_x1, H)], fill=AMBER)

    # --- Kreis-Motiv oben ---------------------------------------------------
    circle_d = int(panel_w * 0.22)
    circle_x0 = center_x - circle_d // 2
    circle_y0 = int(H * 0.13)
    circle_x1 = circle_x0 + circle_d
    circle_y1 = circle_y0 + circle_d
    draw.ellipse(
        [(circle_x0, circle_y0), (circle_x1, circle_y1)],
        fill=AMBER,
        outline=AMBER_DARK,
        width=max(2, int(panel_w * 0.004)),
    )
    inset = int(circle_d * 0.30)
    draw.ellipse(
        [(circle_x0 + inset, circle_y0 + inset),
         (circle_x1 - inset, circle_y1 - inset)],
        fill=CREAM,
    )

    # --- Titel (gross, fett) -----------------------------------------------
    title_size = int(panel_w * 0.165)
    title_font = font(title_size, "bold")
    while _text_width(draw, FRONT_TITLE, title_font) > content_w and title_size > 20:
        title_size -= 4
        title_font = font(title_size, "bold")
    title_y = int(H * 0.40)
    title_w = _text_width(draw, FRONT_TITLE, title_font)
    draw.text((center_x - title_w // 2, title_y), FRONT_TITLE, font=title_font, fill=INK)

    # Amber-Trennlinie unter dem Titel.
    title_bbox = draw.textbbox((center_x - title_w // 2, title_y), FRONT_TITLE, font=title_font)
    rule_y = title_bbox[3] + int(H * 0.025)
    rule_w = int(content_w * 0.5)
    draw.rectangle(
        [(center_x - rule_w // 2, rule_y),
         (center_x + rule_w // 2, rule_y + max(3, int(H * 0.004)))],
        fill=AMBER,
    )

    # --- Untertitel (umgebrochen) ------------------------------------------
    sub_size = int(panel_w * 0.052)
    sub_font = font(sub_size, "regular")
    sub_lines = []
    for absatz in FRONT_SUBTITLE.split("\n"):
        sub_lines.extend(wrap_text(draw, absatz, sub_font, content_w))
    line_gap = int(sub_size * 1.35)
    sub_y = rule_y + int(H * 0.045)
    for line in sub_lines:
        line_w = _text_width(draw, line, sub_font)
        draw.text((center_x - line_w // 2, sub_y), line, font=sub_font, fill=AMBER_DARK)
        sub_y += line_gap

    # --- Autorzeile unten (kein URL auf der Vorderseite) -------------------
    author_size = int(panel_w * 0.040)
    author_font = font(author_size, "bold")
    author_y = int(H * 0.90)
    author_w = _text_width(draw, AUTHOR, author_font)
    draw.text((center_x - author_w // 2, author_y), AUTHOR, font=author_font, fill=INK)


def _draw_spine(img, draw, dims):
    """Zeichnet den Ruecken — nur, wenn er breit genug fuer lesbaren Text ist."""
    bleed = dims["bleed_px"]
    spine_x0 = bleed + dims["trim_w_px"]
    spine_w = dims["spine_px"]
    H = dims["full_h_px"]

    if not dims["spine_text_ok"] or spine_w < 8:
        # Zu schmal: Ruecken bleibt leer (nur der Verlauf). Notiz kommt in main().
        return

    # Ruecken-Text auf separatem Bild rendern und um 90 Grad drehen.
    spine_size = max(10, int(spine_w * 0.55))
    spine_font = font(spine_size, "bold")
    # Text soll in die Ruecken-Hoehe (abzueglich Safe) passen.
    avail = H - 2 * dims["safe_px"]
    while _text_width(draw, SPINE_TEXT, spine_font) > avail and spine_size > 8:
        spine_size -= 2
        spine_font = font(spine_size, "bold")

    tw = _text_width(draw, SPINE_TEXT, spine_font)
    th = _text_height(draw, SPINE_TEXT, spine_font)
    pad = max(2, int(spine_size * 0.4))
    strip = Image.new("RGB", (tw + 2 * pad, th + 2 * pad), CREAM)
    sdraw = ImageDraw.Draw(strip)
    sdraw.text((pad, pad), SPINE_TEXT, font=spine_font, fill=INK, anchor="lt")
    # Um 90 Grad drehen, sodass der Text von unten nach oben laeuft.
    strip = strip.rotate(90, expand=True)

    # Mittig im Ruecken platzieren.
    paste_x = spine_x0 + (spine_w - strip.width) // 2
    paste_y = (H - strip.height) // 2
    img.paste(strip, (paste_x, paste_y))


def _draw_back(img, draw, dims):
    """Zeichnet die Rueckseite (linkes Panel): Blurb, Stichpunkte, URL unten."""
    bleed = dims["bleed_px"]
    safe = dims["safe_px"]
    panel_w = dims["trim_w_px"]
    H = dims["full_h_px"]

    cx0 = bleed + safe
    cx1 = bleed + panel_w - safe
    content_w = cx1 - cx0
    y = int(H * 0.12)

    # --- Headline -----------------------------------------------------------
    head_size = int(panel_w * 0.060)
    head_font = font(head_size, "bold")
    for line in wrap_text(draw, BACK_HEADLINE, head_font, content_w):
        draw.text((cx0, y), line, font=head_font, fill=INK)
        y += int(head_size * 1.3)

    # Kurze Amber-Linie unter der Headline.
    y += int(H * 0.012)
    draw.rectangle(
        [(cx0, y), (cx0 + int(content_w * 0.35), y + max(3, int(H * 0.004)))],
        fill=AMBER,
    )
    y += int(H * 0.05)

    # --- Blurb (3-4 kurze Saetze) ------------------------------------------
    blurb_size = int(panel_w * 0.038)
    blurb_font = font(blurb_size, "regular")
    blurb_gap = int(blurb_size * 1.45)
    for line in wrap_text(draw, BACK_BLURB, blurb_font, content_w):
        draw.text((cx0, y), line, font=blurb_font, fill=INK)
        y += blurb_gap

    y += int(H * 0.04)

    # --- Stichpunkte: was drinsteht ----------------------------------------
    bullet_size = int(panel_w * 0.038)
    bullet_font = font(bullet_size, "regular")
    bullet_gap = int(bullet_size * 1.45)
    marker = "—"  # Gedankenstrich als ruhiger Aufzaehlungs-Marker.
    marker_w = _text_width(draw, marker + " ", bullet_font)
    for item in BACK_BULLETS:
        draw.text((cx0, y), marker, font=bullet_font, fill=AMBER_DARK)
        lines = wrap_text(draw, item, bullet_font, content_w - marker_w)
        for i, line in enumerate(lines):
            draw.text((cx0 + marker_w, y), line, font=bullet_font, fill=INK)
            y += bullet_gap

    # --- URL klein unten (nur auf der Rueckseite) --------------------------
    url_size = int(panel_w * 0.034)
    url_font = font(url_size, "bold")
    url_y = H - bleed - safe - _text_height(draw, BACK_URL, url_font) - int(H * 0.01)
    draw.text((cx0, url_y), BACK_URL, font=url_font, fill=AMBER_DARK)


def render_wrap_cover(pages, dpi, out_path):
    """Rendert das vollstaendige Wraparound-Cover und speichert es als PNG.

    Liefert das Dimensions-Dict zurueck (fuer Logging/Tests).
    """
    dims = compute_dimensions(pages, dpi)
    img = _vertical_gradient(dims["full_w_px"], dims["full_h_px"], BACKGROUND, CREAM)
    draw = ImageDraw.Draw(img)

    # Dezente Markierung der Ruecken-Grenzen ueber einen Hauch dunkleres Creme:
    # bewusst NICHT als harte Linie gedruckt (KDP druckt sonst die Falzlinie mit).
    _draw_back(img, draw, dims)
    _draw_spine(img, draw, dims)
    _draw_front(img, draw, dims)

    img = img.convert("RGB")
    img.info["dpi"] = (dpi, dpi)
    img.save(out_path, "PNG", dpi=(dpi, dpi))
    return dims


def main():
    parser = argparse.ArgumentParser(
        description="Erzeugt ein KDP-Wraparound-Taschenbuch-Cover (Anti-Hype)."
    )
    parser.add_argument(
        "--pages", type=int, default=DEFAULT_PAGES,
        help="Finale Seitenzahl des Innenteils (aus dem KDP-Dashboard). "
             "Default: %(default)s (Platzhalter).",
    )
    parser.add_argument(
        "--dpi", type=int, default=DEFAULT_DPI,
        help="Aufloesung in DPI (Default: %(default)s, von KDP empfohlen).",
    )
    args = parser.parse_args()

    if args.pages < 1:
        parser.error("--pages muss mindestens 1 sein.")

    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, "kdp-cover-paperback.png")
    dims = render_wrap_cover(args.pages, args.dpi, out_path)

    size_bytes = os.path.getsize(out_path)
    print("Geschrieben: {}".format(out_path))
    print("  Seitenzahl : {}".format(dims["pages"]))
    print("  DPI        : {}".format(dims["dpi"]))
    print("  Ruecken    : {:.4f} Zoll  ({} px)".format(dims["spine_in"], dims["spine_px"]))
    print("  Gesamtmass : {} x {} px".format(dims["full_w_px"], dims["full_h_px"]))
    print("  Gesamtmass : {:.3f} x {:.3f} Zoll".format(dims["full_w_in"], dims["full_h_in"]))
    print("  Dateigroesse: {} Bytes".format(size_bytes))

    if not dims["spine_text_ok"]:
        print(
            "  HINWEIS: Der Ruecken ist mit {:.4f} Zoll zu schmal fuer lesbaren "
            "Text und bleibt leer.".format(dims["spine_in"])
        )
        print(
            "           Sobald KDP die echte Seitenzahl zeigt, erneut laufen "
            "lassen, z. B.: python3 generate_kdp_wrap_cover.py --pages 132"
        )


if __name__ == "__main__":
    main()
