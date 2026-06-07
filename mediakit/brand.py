"""mediakit/brand.py — aban-news-Markenkit (Pillow).

Single Source of Truth für Farben, Fonts und die Slide-Bausteine, die vorher in
`video-pipeline/generate_clips.py` lagen. Reine stdlib + Pillow (keine Video-Deps),
damit beide Video-Projekte (Reels + ABAN Files) sie billig importieren können.

Signaturen sind identisch zu den alten Funktionen in generate_clips.py — der
Generator importiert sie jetzt von hier und re-exportiert sie unverändert.
"""
import glob
import os

from PIL import Image, ImageDraw, ImageFont

# Brand-Farben (identisch zu generate_hype_og.py / generate_clips.py)
AMBER = (217, 119, 6)
AMBER_DK = (180, 83, 9)
CREAM = (254, 243, 199)
INK = (31, 41, 55)
MUTED = (107, 114, 128)
BG = (255, 251, 245)
STRIKE = (160, 22, 22)
WHITE = (255, 255, 255)

W, H = 1080, 1920  # 9:16 vertikal


def font(size, bold=True):
    cands = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ] + glob.glob("/usr/share/fonts/**/DejaVuSans*.ttf", recursive=True)
    for c in cands:
        if c and os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def wrap(draw, text, fnt, max_w):
    """Bricht Text auf Pixelbreite um."""
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=fnt) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_block(d, x, y, text, fnt, fill, max_w, line_gap=12):
    for line in wrap(d, text, fnt, max_w):
        d.text((x, y), line, font=fnt, fill=fill)
        bb = d.textbbox((0, 0), line, font=fnt)
        y += (bb[3] - bb[1]) + line_gap
    return y


def _ts(sec):
    """Sekunden → SRT-Timecode HH:MM:SS,mmm."""
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int((sec - int(sec)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def slide(path, *, kicker, headline, body, accent=AMBER_DK, body_fill=INK,
          footer="abannews.com/hype-watch"):
    """Markengetreuer 9:16-Slide (Akzentbalken, Cream-Form, Kicker-Badge, Headline, Body)."""
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 20, H], fill=AMBER)            # Akzent-Balken links
    d.ellipse([W - 620, -360, W + 320, 420], fill=CREAM)  # weiche Form oben
    d.text((70, 90), "☕  aban news", font=font(40), fill=AMBER_DK)
    # Kicker-Badge
    bf = font(34)
    bb = d.textbbox((0, 0), kicker, font=bf)
    d.rounded_rectangle([70, 180, 70 + (bb[2] - bb[0]) + 56, 180 + (bb[3] - bb[1]) + 34],
                        radius=20, fill=accent)
    d.text((98, 196), kicker, font=bf, fill=WHITE)
    # Headline
    y = draw_block(d, 70, 320, headline, font(78), INK, W - 140, line_gap=16)
    # Body
    if body:
        draw_block(d, 70, y + 40, body, font(48), body_fill, W - 140, line_gap=18)
    # Footer
    d.text((70, H - 120), footer, font=font(38), fill=MUTED)
    img.save(path)


def slide_overlay(path, *, kicker, headline, body, accent=AMBER_DK,
                  footer="radar.abannews.com"):
    """Transparentes RGBA-Text-Overlay für den B-Roll-Look (Text über Stockvideo).

    OBEN verankert (wie slide()): dunkler Verlauf oben für Lesbarkeit, Text hell.
    Das untere Drittel bleibt frei — dort laufen die Untertitel, keine Überschneidung.
    """
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # Oberer Verlauf: dunkel am Kopf → transparent bei ~62 % (dahinter sitzt der Text)
    panel = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(panel)
    fade_to = int(H * 0.62)
    for i in range(fade_to):
        a = int(205 * (1 - i / fade_to))
        pd.line([(0, i), (W, i)], fill=(15, 23, 42, max(0, a)))
    img = Image.alpha_composite(img, panel)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 20, H], fill=AMBER + (255,))            # Akzent-Balken
    d.text((70, 90), "☕  aban news", font=font(40), fill=CREAM + (255,))
    # Kicker-Badge (oben, wie slide())
    bf = font(34)
    bb = d.textbbox((0, 0), kicker, font=bf)
    d.rounded_rectangle([70, 180, 70 + (bb[2] - bb[0]) + 56, 180 + (bb[3] - bb[1]) + 34],
                        radius=20, fill=accent + (255,))
    d.text((98, 196), kicker, font=bf, fill=WHITE + (255,))
    # Headline + Body hell, im oberen Bereich
    y = draw_block(d, 70, 320, headline, font(78), WHITE + (255,), W - 140, line_gap=16)
    if body:
        draw_block(d, 70, y + 36, body, font(46), CREAM + (255,), W - 140, line_gap=16)
    img.save(path)
