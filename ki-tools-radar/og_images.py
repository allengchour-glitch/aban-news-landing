"""Open Graph image generation for KI-Tools Radar (1200×630 PNG per tool).

Used for rich link previews when pages are shared on social / messengers.
Requires Pillow; the main generator calls this only if Pillow is importable,
so the pure-stdlib HTML build still works without it.

Images are language-neutral (tool name + score + vendor), so one PNG per tool
is reused across all language versions.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (255, 251, 245)        # #fffbf5
ACCENT = (217, 119, 6)      # #d97706
TEXT = (31, 41, 55)         # #1f2937
MUTED = (107, 114, 128)     # #6b7280
SUCCESS = (5, 150, 105)     # #059669

_FONT = "DejaVuSans.ttf"
_FONT_BOLD = "DejaVuSans-Bold.ttf"


def _font(bold: bool, size: int):
    try:
        return ImageFont.truetype(_FONT_BOLD if bold else _FONT, size)
    except Exception:
        return ImageFont.load_default()


def _wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines[:3]


def _render(name: str, score, vendor: str, path: Path):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 16], fill=ACCENT)                 # top accent bar
    d.text((64, 70), "KI-Tools Radar", font=_font(True, 40), fill=ACCENT)
    d.text((64, 128), "Ehrlich bewertete KI-Tools · DACH",
           font=_font(False, 26), fill=MUTED)

    name_font = _font(True, 92)
    lines = _wrap(d, name, name_font, W - 128)
    y = 250
    for ln in lines:
        d.text((64, y), ln, font=name_font, fill=TEXT)
        y += 104

    if vendor:
        d.text((64, max(y + 6, 520)), vendor, font=_font(False, 32), fill=MUTED)

    if score not in (None, "", "—"):
        badge = f"{score}/10"
        bf = _font(True, 56)
        tw = d.textlength(badge, font=bf)
        bx0, by0 = W - tw - 140, 250
        d.rounded_rectangle([bx0, by0, bx0 + tw + 60, by0 + 90], radius=24, fill=SUCCESS)
        d.text((bx0 + 30, by0 + 14), badge, font=bf, fill=(255, 255, 255))

    img.save(path, "PNG")


def generate(tools, out_dir: Path, slugify) -> int:
    og = out_dir / "og"
    og.mkdir(parents=True, exist_ok=True)
    for t in tools:
        _render(t["name"], t.get("worth_it_score"), t.get("vendor", ""),
                og / f"{slugify(t['id'])}.png")
    _render("143 KI-Tools, ehrlich bewertet", None, "11 Sprachen · DACH",
            og / "default.png")
    return len(tools) + 1
