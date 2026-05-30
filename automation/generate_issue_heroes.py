#!/usr/bin/env python3
"""Generate on-brand SVG header images for each archive issue and embed them.

Why SVG: self-created, so 100% rights-clear (no stock/press licensing risk),
tiny file size, scales crisp on any screen, and matches the warm coffee brand.
Replace any NNN.svg with an AI-generated raster (WebP/JPG, 1200x420, <200KB)
later if you want photographic headers — the <figure> markup stays the same.

Run from repo root:  python3 automation/generate_issue_heroes.py
"""
import re
import html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "archive"
IMG_DIR = ROOT / "img" / "issues"

# Brand palette (warm coffee + amber, from css/styles.css / theme-color)
AMBER = "#d97706"
AMBER_LIGHT = "#f59e0b"
COFFEE_DARK = "#3b2a1a"
COFFEE_DEEP = "#231708"
CREAM = "#fdf6ec"

ISSUE_RE = re.compile(r"^(\d{3})-(\d{4}-\d{2}-\d{2})-")
H1_RE = re.compile(r'<h1 class="issue-title">(.*?)</h1>', re.S)
KICKER_RE = re.compile(r'<p class="issue-kicker">(.*?)</p>', re.S)

MONTHS = {
    "01": "Januar", "02": "Februar", "03": "März", "04": "April",
    "05": "Mai", "06": "Juni", "07": "Juli", "08": "August",
    "09": "September", "10": "Oktober", "11": "November", "12": "Dezember",
}


def clean_title(raw: str) -> str:
    """Strip tags and the leading coffee emoji from the h1 text."""
    txt = re.sub(r"<[^>]+>", "", raw)
    txt = html.unescape(txt).strip()
    txt = txt.lstrip("☕").strip()
    return txt


def wrap_title(title: str, max_chars: int = 24, max_lines: int = 3):
    words = title.split()
    lines, cur = [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > max_chars:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
        if len(lines) == max_lines:
            break
    if cur and len(lines) < max_lines:
        lines.append(cur)
    if len(lines) == max_lines and (len(" ".join(words)) > len(" ".join(lines))):
        lines[-1] = lines[-1].rstrip(".,;:") + " …"
    return lines


def fmt_date(iso: str) -> str:
    y, m, d = iso.split("-")
    return f"{int(d)}. {MONTHS[m]} {y}"


def build_svg(badge: str, date_iso: str, title: str) -> str:
    # `badge` is the full top-right label, e.g. "Ausgabe 016" or "Probe".
    lines = wrap_title(title)
    title_block = []
    # Title baseline starts lower when fewer lines, so it stays vertically centered.
    start_y = 232 - (len(lines) - 1) * 30
    for i, line in enumerate(lines):
        y = start_y + i * 66
        title_block.append(
            f'<text x="80" y="{y}" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif" '
            f'font-size="54" font-weight="800" fill="{CREAM}" letter-spacing="-1">{html.escape(line)}</text>'
        )
    title_svg = "\n  ".join(title_block)
    date_label = html.escape(fmt_date(date_iso))

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 420" role="img" aria-label="aban news {html.escape(badge)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{COFFEE_DARK}"/>
      <stop offset="1" stop-color="{COFFEE_DEEP}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="{AMBER_LIGHT}"/>
      <stop offset="1" stop-color="{AMBER}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="420" fill="url(#bg)"/>
  <!-- subtle dot grid -->
  <g fill="{AMBER}" opacity="0.07">
    {"".join(f'<circle cx="{x}" cy="{y}" r="3"/>' for y in range(40, 420, 56) for x in range(900, 1200, 56))}
  </g>
  <!-- amber accent bar -->
  <rect x="80" y="64" width="64" height="8" rx="4" fill="url(#accent)"/>
  <!-- wordmark -->
  <text x="80" y="110" font-family="ui-sans-serif,system-ui,sans-serif" font-size="26" font-weight="700" fill="{AMBER_LIGHT}" letter-spacing="1">☕ aban news</text>
  <!-- issue badge -->
  <text x="1120" y="110" text-anchor="end" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="22" font-weight="600" fill="{CREAM}" opacity="0.7">{html.escape(badge)}</text>
  <!-- title -->
  {title_svg}
  <!-- date footer -->
  <text x="80" y="372" font-family="ui-sans-serif,system-ui,sans-serif" font-size="22" font-weight="500" fill="{CREAM}" opacity="0.6">{date_label} · Mo–Fr · DACH</text>
</svg>
'''


def figure_block(svg_name: str, badge: str, title: str) -> str:
    alt = html.escape(f"aban news {badge} · {title}")
    return (
        '      <figure class="issue-hero">\n'
        f'        <img src="/img/issues/{svg_name}.svg" width="1200" height="420" '
        f'loading="lazy" decoding="async" alt="{alt}">\n'
        '      </figure>\n'
    )


def process(path: Path, svg_name: str, badge: str, date_iso: str) -> bool:
    """Write the SVG for `path` and embed the <figure>. Returns True if HTML changed."""
    text = path.read_text(encoding="utf-8")
    h1 = H1_RE.search(text)
    if not h1:
        print(f"!! kein h1 in {path.name}, übersprungen")
        return False
    title = clean_title(h1.group(1))

    (IMG_DIR / f"{svg_name}.svg").write_text(build_svg(badge, date_iso, title), encoding="utf-8")

    if 'class="issue-hero"' in text:
        return False  # idempotent
    anchor = '      <div class="issue-body">'
    if anchor not in text:
        print(f"!! kein issue-body-Anker in {path.name}, übersprungen")
        return False
    fig = figure_block(svg_name, badge, title)
    path.write_text(text.replace(anchor, fig + "\n" + anchor, 1), encoding="utf-8")
    return True


# Probe-/Sample-Ausgaben ohne laufende Nummer: filename -> (svg_name, badge)
PROBES = {
    "probe-2026-05-27.html": ("probe", "Probe"),
    "ultimate-probe-2026-05-27.html": ("probe-ultimate", "Ultimate-Probe"),
}
DATE_IN_NAME = re.compile(r"(\d{4}-\d{2}-\d{2})")


THUMB_PAT = re.compile(
    r'(<article class="arc-card"[^>]*>)(.*?)(<h2 class="arc-card-title"><a href="([^"]+)")',
    re.S,
)


def svg_name_for_href(href: str):
    name = href.rsplit("/", 1)[-1].replace(".html", "")
    m = re.match(r"(\d{3})-", name)
    if m:
        return m.group(1)
    if name.startswith("ultimate-probe"):
        return "probe-ultimate"
    if name.startswith("probe"):
        return "probe"
    return None


def update_archive_index_thumbs() -> int:
    """Insert a decorative hero thumbnail at the top of each archive card.

    Decorative (aria-hidden, empty alt, tabindex=-1) because the card title is
    already a link to the same issue — avoids a redundant link for screen readers.
    Idempotent.
    """
    idx = ARCHIVE / "index.html"
    if not idx.exists():
        return 0
    text = idx.read_text(encoding="utf-8")
    n = 0

    def repl(m):
        nonlocal n
        if "arc-card-thumb" in m.group(2):
            return m.group(0)
        svg = svg_name_for_href(m.group(4))
        if not svg:
            return m.group(0)
        n += 1
        thumb = (
            f'\n        <a class="arc-card-thumb" href="{m.group(4)}" tabindex="-1" aria-hidden="true">'
            f'<img src="/img/issues/{svg}.svg" width="1200" height="420" loading="lazy" decoding="async" alt=""></a>'
        )
        return m.group(1) + thumb + m.group(2) + m.group(3)

    text = THUMB_PAT.sub(repl, text)
    idx.write_text(text, encoding="utf-8")
    return n


def main():
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    numbered = sorted(p for p in ARCHIVE.glob("*.html") if ISSUE_RE.match(p.name))
    changed = 0

    for path in numbered:
        m = ISSUE_RE.match(path.name)
        num, date_iso = m.group(1), m.group(2)
        changed += process(path, num, f"Ausgabe {num}", date_iso)

    for fname, (svg_name, badge) in PROBES.items():
        path = ARCHIVE / fname
        if not path.exists():
            continue
        dm = DATE_IN_NAME.search(fname)
        date_iso = dm.group(1) if dm else "2026-05-27"
        changed += process(path, svg_name, badge, date_iso)

    thumbs = update_archive_index_thumbs()

    total = len(numbered) + sum((ARCHIVE / f).exists() for f in PROBES)
    print(f"Ausgaben verarbeitet: {total} · Header neu angepasst: {changed} · "
          f"Archiv-Thumbnails neu: {thumbs}")


if __name__ == "__main__":
    main()
