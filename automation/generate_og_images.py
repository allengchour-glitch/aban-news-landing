#!/usr/bin/env python3
"""Generate per-issue social-preview (OG) images and wire up the meta tags.

Previously every issue shared one generic /og-image.png, so link previews on
LinkedIn/X/WhatsApp looked identical regardless of the issue. This renders a
1200x630 PNG per issue (on-brand, matching the SVG hero) into img/og/NNN.png
and points each issue's og:image / twitter:image at it.

Self-rendered = full rights, no licensing risk. Requires Pillow.
Run from repo root:  python3 automation/generate_og_images.py
"""
import re
import html
from pathlib import Path
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "archive"
OG_DIR = ROOT / "img" / "og"
SITE = "https://abannews.com"

W, H, M = 1200, 630, 80
AMBER = (217, 119, 6)
AMBER_LIGHT = (245, 158, 11)
COFFEE_DARK = (59, 42, 26)
COFFEE_DEEP = (35, 23, 8)
CREAM = (253, 246, 236)

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

ISSUE_RE = re.compile(r"^(\d{3})-(\d{4}-\d{2}-\d{2})-")
H1_RE = re.compile(r'<h1 class="issue-title">(.*?)</h1>', re.S)
MONTHS = {1:"Januar",2:"Februar",3:"März",4:"April",5:"Mai",6:"Juni",7:"Juli",
          8:"August",9:"September",10:"Oktober",11:"November",12:"Dezember"}

PROBES = {
    "probe-2026-05-27.html": ("probe", "Probe"),
    "ultimate-probe-2026-05-27.html": ("probe-ultimate", "Ultimate-Probe"),
}


def clean_title(raw: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", raw)).strip().lstrip("☕").strip()


def fmt_date(iso: str) -> str:
    d = datetime.strptime(iso, "%Y-%m-%d")
    return f"{d.day}. {MONTHS[d.month]} {d.year}"


def wrap(draw, text, font, max_w, max_lines=3):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
            if len(lines) == max_lines:
                break
    if cur and len(lines) < max_lines:
        lines.append(cur)
    # ellipsis if truncated
    if len(lines) == max_lines and draw.textlength(" ".join(lines), font=font) < draw.textlength(text, font=font):
        while lines and draw.textlength(lines[-1] + " …", font=font) > max_w:
            lines[-1] = lines[-1].rsplit(" ", 1)[0] if " " in lines[-1] else lines[-1][:-1]
        lines[-1] = lines[-1].rstrip(".,;: ") + " …"
    return lines


def render(num_label: str, date_iso: str, title: str, out: Path):
    img = Image.new("RGB", (W, H), COFFEE_DEEP)
    px = img.load()
    # vertical gradient
    for y in range(H):
        t = y / (H - 1)
        r = round(COFFEE_DARK[0] + (COFFEE_DEEP[0] - COFFEE_DARK[0]) * t)
        g = round(COFFEE_DARK[1] + (COFFEE_DEEP[1] - COFFEE_DARK[1]) * t)
        b = round(COFFEE_DARK[2] + (COFFEE_DEEP[2] - COFFEE_DARK[2]) * t)
        for x in range(W):
            px[x, y] = (r, g, b)
    d = ImageDraw.Draw(img)
    # dot grid (top-right), subtle
    for gy in range(48, H, 60):
        for gx in range(W - 280, W - 20, 60):
            d.ellipse([gx, gy, gx + 5, gy + 5], fill=(AMBER[0], AMBER[1], AMBER[2]))
    # (dots drawn at full amber but tiny -> reads as subtle texture)

    f_word = ImageFont.truetype(FONT_BOLD, 34)
    f_badge = ImageFont.truetype(FONT_MONO, 26)
    f_title = ImageFont.truetype(FONT_BOLD, 70)
    f_foot = ImageFont.truetype(FONT_REG, 28)

    # amber accent bar
    d.rounded_rectangle([M, 70, M + 70, 80], radius=5, fill=AMBER)
    # wordmark + coffee dot
    d.ellipse([M, 104, M + 26, 130], fill=AMBER_LIGHT)
    d.text((M + 38, 100), "aban news", font=f_word, fill=AMBER_LIGHT)
    # issue badge top-right
    bw = d.textlength(num_label, font=f_badge)
    d.text((W - M - bw, 106), num_label, font=f_badge, fill=(CREAM[0], CREAM[1], CREAM[2]))

    # title
    lines = wrap(d, title, f_title, W - 2 * M, max_lines=3)
    line_h = 84
    start_y = 300 - (len(lines) - 1) * line_h // 2
    for i, ln in enumerate(lines):
        d.text((M, start_y + i * line_h), ln, font=f_title, fill=CREAM)

    # footer
    foot = f"{num_label} · {fmt_date(date_iso)} · Mo–Fr · DACH"
    d.text((M, H - 78), foot, font=f_foot, fill=(CREAM[0], CREAM[1], CREAM[2]))

    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG", optimize=True)
    return out.stat().st_size


def wire_meta(path: Path, og_name: str, alt: str):
    """Point og:image/twitter:image at the per-issue PNG; add dims + alt once."""
    t = path.read_text(encoding="utf-8")
    url = f"{SITE}/img/og/{og_name}.png"
    t = re.sub(r'(<meta property="og:image" content=")[^"]*(">)', rf'\g<1>{url}\g<2>', t, count=1)
    t = re.sub(r'(<meta name="twitter:image" content=")[^"]*(">)', rf'\g<1>{url}\g<2>', t, count=1)
    if 'property="og:image:width"' not in t:
        extra = (f'\n  <meta property="og:image:width" content="1200">'
                 f'\n  <meta property="og:image:height" content="630">'
                 f'\n  <meta property="og:image:alt" content="{html.escape(alt)}">')
        t = re.sub(r'(<meta property="og:image" content="[^"]*">)', rf'\g<1>{extra}', t, count=1)
    path.write_text(t, encoding="utf-8")


def main():
    count = 0
    total_bytes = 0
    for path in sorted(ARCHIVE.glob("*.html")):
        m = ISSUE_RE.match(path.name)
        if m:
            num, date_iso = m.group(1), m.group(2)
            og_name, badge = num, f"Ausgabe {num}"
        elif path.name in PROBES:
            og_name, badge = PROBES[path.name]
            dm = re.search(r"(\d{4}-\d{2}-\d{2})", path.name)
            date_iso = dm.group(1) if dm else "2026-05-27"
        else:
            continue
        h1 = H1_RE.search(path.read_text(encoding="utf-8"))
        if not h1:
            continue
        title = clean_title(h1.group(1))
        size = render(badge, date_iso, title, OG_DIR / f"{og_name}.png")
        wire_meta(path, og_name, f"aban news {badge} · {title}")
        total_bytes += size
        count += 1
    avg = total_bytes // count // 1024 if count else 0
    print(f"OG-Bilder erzeugt: {count} · ø {avg} KB · Meta-Tags verdrahtet")


if __name__ == "__main__":
    main()
