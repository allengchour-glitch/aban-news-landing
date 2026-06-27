#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — OG-Share-Karten generieren + og:image/twitter einbinden (idempotent).

Viele Content-Seiten haben og:title/og:description, aber KEIN og:image — geteilte
Links (WhatsApp/LinkedIn/X) zeigen dann keine Vorschau → schlechtere Klickrate.
Dieses Tool erzeugt pro Seite eine schlichte Marken-Karte (1200×630, Pillow) unter
og/<slug>.png und fügt og:image + twitter:card/twitter:image vor </head> ein.

Sicher: ändert NUR Seiten ohne vorhandenes og:image; rührt Inhalt/Logik nicht an.
Reine Stdlib + Pillow.

    python3 tools/gen_og_cards.py --dry     # nur zeigen, was passieren würde
    python3 tools/gen_og_cards.py           # Karten erzeugen + Meta einfügen
"""
from __future__ import annotations

import argparse
import glob
import html
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OGDIR = ROOT / "og"
BASE = "https://abannews.com"

# Nicht-deployte / nicht teilenswerte Top-Ordner werden ohnehin nicht gescannt
# (wir scannen nur Root-*.html). Rechts-/Utility-Seiten haben meist eh ein og:image
# oder sollen kein Card — wir fassen nur an, was kein og:image hat.

CREAM = (255, 251, 245)
AMBER = (217, 119, 6)
INK = (31, 41, 55)
MUTED = (107, 114, 128)
LINE = (236, 227, 212)
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
W, H = 1200, 630

OG_TITLE = re.compile(r'<meta\s+property="og:title"\s+content="([^"]*)"', re.I)
TITLE = re.compile(r"<title>(.*?)</title>", re.S | re.I)
HAS_OGIMG = re.compile(r'property="og:image"', re.I)
HAS_TWCARD = re.compile(r'name="twitter:card"', re.I)
NOINDEX = re.compile(r'name="robots"\s+content="[^"]*noindex', re.I)


def clean_title(raw: str) -> str:
    t = html.unescape(raw or "").strip()
    # „· aban news"-Suffix und Trenner-Tails entfernen
    for sep in (" · ", " | "):
        if sep in t:
            t = t.split(sep)[0].strip()
    return t


def card_title(text: str) -> str:
    m = OG_TITLE.search(text)
    if m and m.group(1).strip():
        return clean_title(m.group(1))
    m = TITLE.search(text)
    return clean_title(m.group(1)) if m else ""


def wrap(draw, text, font, maxw):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=font) <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def render(title: str, out: Path):
    img = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 16, H], fill=AMBER)                      # linker Akzentbalken
    d.text((70, 58), "aban news", font=ImageFont.truetype(BOLD, 46), fill=AMBER)
    d.rectangle([70, 126, 1130, 130], fill=LINE)               # Trennlinie
    # Titel: größte Größe wählen, die in ≤4 Zeilen passt
    size, lines, tf = 70, [], None
    for size in (70, 62, 56, 50, 44):
        tf = ImageFont.truetype(BOLD, size)
        lines = wrap(d, title, tf, 1040)
        if len(lines) <= 4:
            break
    lines = lines[:4]
    y = 196
    for ln in lines:
        d.text((70, y), ln, font=tf, fill=INK)
        y += size + 14
    d.text((70, H - 74), "abannews.com · KI verständlich für Selbstständige",
           font=ImageFont.truetype(REG, 29), fill=MUTED)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG", optimize=True)


def inject(text: str, slug: str) -> str:
    url = f"{BASE}/og/{slug}.png"
    tags = (f'<meta property="og:image" content="{url}">\n'
            f'<meta property="og:image:width" content="1200">\n'
            f'<meta property="og:image:height" content="630">\n'
            f'<meta name="twitter:image" content="{url}">\n')
    if not HAS_TWCARD.search(text):
        tags += '<meta name="twitter:card" content="summary_large_image">\n'
    return text.replace("</head>", tags + "</head>", 1)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()

    done = 0
    targets = []
    for f in sorted(glob.glob(str(ROOT / "*.html"))):
        text = Path(f).read_text(encoding="utf-8", errors="ignore")
        if HAS_OGIMG.search(text) or NOINDEX.search(text):
            continue
        targets.append((Path(f), text))

    print(f"Seiten ohne og:image: {len(targets)}")
    for path, text in targets:
        slug = path.stem
        title = card_title(text)
        if not title:
            continue
        if args.dry:
            print(f"  würde Karte bauen: og/{slug}.png  ←  {title[:60]}")
            continue
        render(title, OGDIR / f"{slug}.png")
        path.write_text(inject(text, slug), encoding="utf-8")
        done += 1
    if not args.dry:
        print(f"✓ {done} Karten erzeugt + og:image/twitter eingebunden.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
