"""mediakit/image_edit.py — Bildbearbeitung (reine Pillow, kein ffmpeg).

crop/resize zu Seitenverhältnissen (9:16, 1:1, 16:9 …), Padding, Thumbnails,
Marken-Overlay (Akzentbalken/Logo) und Caption-Einbrennen. Marken-Farben/Fonts
kommen aus mediakit.brand.
"""
from PIL import Image, ImageDraw

from . import brand
from .ffmpeg_util import MediakitError


def parse_aspect(s):
    """'9:16' -> (9, 16). Wirft MediakitError bei Unsinn."""
    try:
        a, b = s.lower().split(":")
        a, b = int(a), int(b)
        if a <= 0 or b <= 0:
            raise ValueError
        return a, b
    except Exception:
        raise MediakitError(f"Ungültiges Seitenverhältnis: {s!r} (erwartet z. B. 9:16)")


def _open(path):
    img = Image.open(path)
    return img.convert("RGB") if img.mode not in ("RGB", "RGBA") else img


def crop_to_aspect(in_path, out_path, aspect, mode="cover", bg=brand.BG):
    """mode='cover' = mittig auf Verhältnis beschneiden (füllt); 'contain' = einpassen + Rand."""
    aw, ah = parse_aspect(aspect)
    img = _open(in_path)
    w, h = img.size
    target = aw / ah
    if mode == "contain":
        return pad(in_path, out_path, aspect, bg=bg)
    # cover: größtmöglichen mittigen Ausschnitt mit Ziel-Ratio nehmen
    if w / h > target:           # zu breit → links/rechts beschneiden
        new_w = int(h * target)
        x = (w - new_w) // 2
        box = (x, 0, x + new_w, h)
    else:                        # zu hoch → oben/unten beschneiden
        new_h = int(w / target)
        y = (h - new_h) // 2
        box = (0, y, w, y + new_h)
    img.crop(box).save(out_path)
    return out_path


def pad(in_path, out_path, aspect, bg=brand.BG):
    """Bild vollständig zeigen, fehlenden Platz mit Markenfarbe auffüllen (Ziel-Ratio)."""
    aw, ah = parse_aspect(aspect)
    img = _open(in_path).convert("RGB")
    w, h = img.size
    target = aw / ah
    if w / h > target:           # zu breit → Höhe wächst
        canvas_w, canvas_h = w, int(round(w / target))
    else:
        canvas_w, canvas_h = int(round(h * target)), h
    canvas = Image.new("RGB", (canvas_w, canvas_h), bg)
    canvas.paste(img, ((canvas_w - w) // 2, (canvas_h - h) // 2))
    canvas.save(out_path)
    return out_path


def resize(in_path, out_path, width=None, height=None, aspect=None):
    """Skalieren. Mit nur --width: Höhe proportional (oder via --aspect erzwingen)."""
    img = _open(in_path)
    w, h = img.size
    if width and aspect:
        aw, ah = parse_aspect(aspect)
        height = int(round(width * ah / aw))
    elif width and not height:
        height = int(round(width * h / w))
    elif height and not width:
        width = int(round(height * w / h))
    if not width or not height:
        raise MediakitError("resize braucht --width und/oder --height (oder --aspect).")
    img.resize((width, height), Image.LANCZOS).save(out_path)
    return out_path


def thumbnail(in_path, out_path, width=480, aspect="16:9"):
    """Kleines Vorschaubild: erst auf Verhältnis beschneiden, dann auf Breite skalieren."""
    tmp = crop_to_aspect(in_path, out_path, aspect, mode="cover")
    img = _open(tmp)
    aw, ah = parse_aspect(aspect)
    img.resize((width, int(round(width * ah / aw))), Image.LANCZOS).save(out_path)
    return out_path


def overlay(in_path, out_path, brand_bar=False, logo=None, pos="tl"):
    """Marken-Akzentbalken (links) und/oder ein Logo-PNG in eine Ecke einblenden."""
    img = _open(in_path).convert("RGBA")
    w, h = img.size
    d = ImageDraw.Draw(img)
    if brand_bar:
        bar = max(8, w // 60)
        d.rectangle([0, 0, bar, h], fill=brand.AMBER)
    if logo:
        if str(logo).lower().endswith(".svg"):
            raise MediakitError("Logo-Overlay erwartet ein PNG (kein SVG — kein Rasterizer im Toolkit).")
        lg = Image.open(logo).convert("RGBA")
        m = max(12, w // 40)
        positions = {
            "tl": (m, m), "tr": (w - lg.width - m, m),
            "bl": (m, h - lg.height - m), "br": (w - lg.width - m, h - lg.height - m),
        }
        img.alpha_composite(lg, positions.get(pos, positions["tl"]))
    img.convert("RGB").save(out_path)
    return out_path


def caption(in_path, out_path, text, pos="bottom", style="brand"):
    """Marken-Caption (cream-Text auf ink-Pille) ins untere/obere Drittel brennen."""
    img = _open(in_path).convert("RGB")
    w, h = img.size
    d = ImageDraw.Draw(img)
    fnt = brand.font(max(28, w // 22), bold=True)
    pad_x, pad_y, gap = 36, 28, 10
    lines = brand.wrap(d, text, fnt, w - 2 * pad_x - 2 * 30)
    line_h = d.textbbox((0, 0), "Ag", font=fnt)
    lh = (line_h[3] - line_h[1]) + gap
    block_h = lh * len(lines) + 2 * pad_y
    y0 = (h - block_h - 40) if pos == "bottom" else 40
    # Pille
    d.rounded_rectangle([30, y0, w - 30, y0 + block_h], radius=24, fill=brand.INK)
    y = y0 + pad_y
    for line in lines:
        tw = d.textlength(line, font=fnt)
        d.text(((w - tw) / 2, y), line, font=fnt, fill=brand.CREAM)
        y += lh
    img.save(out_path)
    return out_path
