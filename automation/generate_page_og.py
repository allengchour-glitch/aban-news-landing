#!/usr/bin/env python3
"""Per-page social-preview (OG) images for the non-issue pages (money/theme/etc).

Renders a 1200x630 on-brand PNG per page (title from the page's H1) into
img/og/page-<name>.png and wires og:image/twitter:image into that page.
Self-rendered = full rights. Requires Pillow.

    python3 automation/generate_page_og.py
"""
import re
import html
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OG_DIR = ROOT / "img" / "og"
SITE = "https://abannews.com"
W, H, M = 1200, 630, 80
AMBER = (217, 119, 6); AMBER_LIGHT = (245, 158, 11)
COFFEE_DARK = (59, 42, 26); COFFEE_DEEP = (35, 23, 8); CREAM = (253, 246, 236)
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

H1_RE = re.compile(r'<h1[^>]*>(.*?)</h1>', re.S)

# page file (relative to repo root) -> og name
PAGES = {
    "beratung.html": "page-beratung",
    "produkte.html": "page-produkte",
    "transparenz.html": "page-transparenz",
    "founding.html": "page-founding",
    "start.html": "page-start",
    "downloads/dach-ki-toolkit.html": "page-toolkit",
    "themen/index.html": "page-themen",
    "themen/ki-tools.html": "page-themen-ki-tools",
    "themen/dsgvo-und-datenschutz.html": "page-themen-dsgvo",
    "themen/anti-hype.html": "page-themen-anti-hype",
    "themen/produktivitaet.html": "page-themen-produktivitaet",
    "themen/automatisierung.html": "page-themen-automatisierung",
    "themen/no-code.html": "page-themen-no-code",
    # aban-Netzwerk + Geld-Kanäle
    "netzwerk.html": "page-netzwerk",
    "radar.html": "page-radar",
    "foerder.html": "page-foerder",
    "jobs.html": "page-jobs",
    "kurse.html": "page-kurse",
    "deals.html": "page-deals",
    "experten.html": "page-experten",
    "workshops.html": "page-workshops",
    "vorlagen.html": "page-vorlagen",
    # SEO-Vergleichsseiten
    "vergleich-writing.html": "page-vergleich-writing",
    "vergleich-image-gen.html": "page-vergleich-image-gen",
    "vergleich-coding.html": "page-vergleich-coding",
    "vergleich-video-gen.html": "page-vergleich-video-gen",
    "vergleich-productivity.html": "page-vergleich-productivity",
    "vergleich-marketing-ai.html": "page-vergleich-marketing-ai",
    "vergleich-api.html": "page-vergleich-api",
    "vergleich-ai-chat.html": "page-vergleich-ai-chat",
    "vergleich-kostenlos.html": "page-vergleich-kostenlos",
    # weitere indexierbare Seiten
    "geld-verdienen-mit-ki.html": "page-geld-verdienen",
    "archive.html": "page-archive",
    "mrr.html": "page-mrr",
    "werbung.html": "page-werbung",
    "growth-dashboard.html": "page-growth-dashboard",
    "ebook.html": "page-ebook",
}


def title_of(t):
    m = H1_RE.search(t)
    if m:
        return html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip().lstrip("☕").strip()
    m = re.search(r"<title>(.*?)</title>", t, re.S)
    return html.unescape(m.group(1).split("|")[0]).strip() if m else "aban news"


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
    if len(lines) == max_lines and draw.textlength(" ".join(lines), font=font) < draw.textlength(text, font=font):
        while lines and draw.textlength(lines[-1] + " …", font=font) > max_w:
            lines[-1] = lines[-1].rsplit(" ", 1)[0] if " " in lines[-1] else lines[-1][:-1]
        lines[-1] = lines[-1].rstrip(".,;: ") + " …"
    return lines


def render(title, out):
    img = Image.new("RGB", (W, H), COFFEE_DEEP); px = img.load()
    for y in range(H):
        t = y / (H - 1)
        px_row = tuple(round(COFFEE_DARK[i] + (COFFEE_DEEP[i] - COFFEE_DARK[i]) * t) for i in range(3))
        for x in range(W):
            px[x, y] = px_row
    d = ImageDraw.Draw(img)
    for gy in range(48, H, 60):
        for gx in range(W - 280, W - 20, 60):
            d.ellipse([gx, gy, gx + 5, gy + 5], fill=AMBER)
    f_word = ImageFont.truetype(FB, 34)
    f_title = ImageFont.truetype(FB, 66)
    f_foot = ImageFont.truetype(FR, 27)
    d.rounded_rectangle([M, 70, M + 70, 80], radius=5, fill=AMBER)
    d.ellipse([M, 104, M + 26, 130], fill=AMBER_LIGHT)
    d.text((M + 38, 100), "aban news", font=f_word, fill=AMBER_LIGHT)
    lines = wrap(d, title, f_title, W - 2 * M, 3)
    line_h = 80
    start_y = 300 - (len(lines) - 1) * line_h // 2
    for i, ln in enumerate(lines):
        d.text((M, start_y + i * line_h), ln, font=f_title, fill=CREAM)
    d.text((M, H - 76), "abannews.com · der ehrliche KI-Newsletter für DACH", font=f_foot,
           fill=(CREAM[0], CREAM[1], CREAM[2]))
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG", optimize=True)
    return out.stat().st_size


def wire(path, og_name, title):
    t = path.read_text(encoding="utf-8")
    url = f"{SITE}/img/og/{og_name}.png"
    alt = html.escape(f"aban news · {title}")

    if '<meta property="og:image"' in t:
        # Vorhandene Tags ersetzen
        t2 = re.sub(r'(<meta property="og:image" content=")[^"]*(">)', rf'\g<1>{url}\g<2>', t, count=1)
        t2 = re.sub(r'(<meta name="twitter:image" content=")[^"]*(">)', rf'\g<1>{url}\g<2>', t2, count=1)
        if 'property="og:image:width"' not in t2:
            extra = (f'\n  <meta property="og:image:width" content="1200">'
                     f'\n  <meta property="og:image:height" content="630">'
                     f'\n  <meta property="og:image:alt" content="{alt}">')
            t2 = re.sub(r'(<meta property="og:image" content="[^"]*">)', rf'\g<1>{extra}', t2, count=1)
    else:
        # Tags fehlen ganz -> nach <title> (oder description) einfügen
        block = (f'\n  <meta property="og:image" content="{url}">'
                 f'\n  <meta property="og:image:width" content="1200">'
                 f'\n  <meta property="og:image:height" content="630">'
                 f'\n  <meta property="og:image:alt" content="{alt}">'
                 f'\n  <meta name="twitter:image" content="{url}">')
        anchor = re.search(r'<meta name="description"[^>]*>', t)
        if not anchor:
            anchor = re.search(r'</title>', t)
        if not anchor:
            return False
        t2 = t[:anchor.end()] + block + t[anchor.end():]
        # twitter:card sicherstellen (für große Vorschau)
        if 'twitter:card' not in t2:
            t2 = t2.replace('<meta name="twitter:image"',
                            '<meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:image"', 1)

    if t2 != t:
        path.write_text(t2, encoding="utf-8")
        return True
    return False


def main():
    n = wired = 0
    for rel, og in PAGES.items():
        p = ROOT / rel
        if not p.exists():
            print("!! fehlt:", rel); continue
        title = title_of(p.read_text(encoding="utf-8"))
        render(title, OG_DIR / f"{og}.png")
        n += 1
        if wire(p, og, title):
            wired += 1
    print(f"Seiten-OG erzeugt: {n} · Meta verdrahtet: {wired}")


if __name__ == "__main__":
    main()
