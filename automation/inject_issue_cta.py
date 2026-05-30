#!/usr/bin/env python3
"""Idempotently inject an inline subscribe box and social share row into
every in-scope aban news archive issue page.

In-scope files (relative to repo root):
  - archive/0??-*.html        (numbered issues 001-026)
  - archive/probe-2026-05-27.html
  - archive/ultimate-probe-2026-05-27.html

For each file the script:
  1. Ensures the conversion.css stylesheet link is present exactly once,
     inserted immediately after the archive.css link.
  2. If the file does not already contain class="sub-cta", inserts the
     subscribe + share block immediately before the issue footer line.

The share links are personalised per page using the canonical URL and the
issue title read from the file itself.
"""

import glob
import html
import os
import re
import sys
from urllib.parse import quote

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVE_DIR = os.path.join(REPO_ROOT, "archive")

ARCHIVE_CSS_LINE = '  <link rel="stylesheet" href="/archive/archive.css">'
CONVERSION_CSS_LINE = '  <link rel="stylesheet" href="/css/conversion.css">'

FOOTER_MARKER = '<footer class="issue-footer">'


def collect_files():
    files = set()
    for path in glob.glob(os.path.join(ARCHIVE_DIR, "0??-*.html")):
        files.add(path)
    for name in ("probe-2026-05-27.html", "ultimate-probe-2026-05-27.html"):
        p = os.path.join(ARCHIVE_DIR, name)
        if os.path.exists(p):
            files.add(p)
    return sorted(files)


def extract_canonical(text):
    m = re.search(r'<link\s+rel="canonical"\s+href="([^"]+)"', text)
    if not m:
        raise ValueError("no canonical link found")
    return html.unescape(m.group(1))


def extract_title(text):
    m = re.search(r'<h1\s+class="issue-title">(.*?)</h1>', text, re.DOTALL)
    if not m:
        raise ValueError("no issue-title found")
    raw = m.group(1)
    # strip HTML tags
    raw = re.sub(r"<[^>]+>", "", raw)
    raw = html.unescape(raw).strip()
    # strip leading coffee emoji + space
    if raw.startswith("☕ "):
        raw = raw[2:]
    elif raw.startswith("☕"):
        raw = raw[1:]
    return raw.strip()


def build_block(canonical_url, title):
    u = quote(canonical_url, safe="")
    t = quote(title, safe="")
    block = """\
      <aside class="sub-cta">
        <p class="sub-cta-kicker">☕ Noch nicht dabei?</p>
        <p class="sub-cta-title">aban news kommt Mo–Fr morgens in dein Postfach — 3–5 Min, kein Hype.</p>
        <form class="sub-cta-form" action="https://abannews.beehiiv.com/subscribe" method="get" novalidate>
          <label class="sr-only" for="cta-email">E-Mail-Adresse</label>
          <input id="cta-email" type="email" name="email" required placeholder="deine@email.de" autocomplete="email">
          <button type="submit" class="btn">Kostenlos abonnieren →</button>
        </form>
        <p class="sub-cta-trust">DSGVO-konform · 1-Klick-Abmeldung · kein Tracking-Pixel</p>
      </aside>
      <div class="share-row" aria-label="Diese Ausgabe teilen">
        <span class="share-label">Teilen:</span>
        <a class="share-btn" href="https://www.linkedin.com/sharing/share-offsite/?url=__U__" target="_blank" rel="noopener">LinkedIn</a>
        <a class="share-btn" href="https://twitter.com/intent/tweet?url=__U__&amp;text=__T__" target="_blank" rel="noopener">X</a>
        <a class="share-btn" href="https://wa.me/?text=__T__%20__U__" target="_blank" rel="noopener">WhatsApp</a>
        <a class="share-btn" href="mailto:?subject=__T__&amp;body=__U__">E-Mail</a>
      </div>
"""
    block = block.replace("__U__", u).replace("__T__", t)
    return block


def process_file(path):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    original = text
    changed = False

    # 1) ensure conversion.css link present exactly once, after archive.css
    if CONVERSION_CSS_LINE not in text:
        if ARCHIVE_CSS_LINE in text:
            text = text.replace(
                ARCHIVE_CSS_LINE,
                ARCHIVE_CSS_LINE + "\n" + CONVERSION_CSS_LINE,
                1,
            )
            changed = True
        else:
            print(f"  WARNING: archive.css link not found in {os.path.basename(path)}; "
                  "skipping stylesheet insertion")

    # 2) insert sub-cta + share block before issue footer (idempotent)
    if 'class="sub-cta"' not in text:
        canonical = extract_canonical(text)
        title = extract_title(text)
        block = build_block(canonical, title)

        footer_idx = text.find(FOOTER_MARKER)
        if footer_idx == -1:
            raise ValueError(f"footer marker not found in {path}")
        # find start of the line containing the footer marker
        line_start = text.rfind("\n", 0, footer_idx) + 1
        text = text[:line_start] + block + text[line_start:]
        changed = True

    if text != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

    return changed


def verify_file(path):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    problems = []

    n_cta = text.count('class="sub-cta"')
    if n_cta != 1:
        problems.append(f"sub-cta count = {n_cta}")

    n_css = text.count('href="/css/conversion.css"')
    if n_css != 1:
        problems.append(f"conversion.css count = {n_css}")

    n_open = len(re.findall(r"<figure\b", text))
    n_close = text.count("</figure>")
    if n_open != n_close:
        problems.append(f"figure tags unbalanced ({n_open} open, {n_close} close)")

    # share links should contain this file's own NNN url
    canonical = extract_canonical(text)
    enc = quote(canonical, safe="")
    n_share_url = text.count("?url=" + enc) + text.count("text=") * 0  # url= occurrences
    if text.count("url=" + enc) < 2:
        problems.append("share links do not reference own canonical url")

    return problems


def main():
    files = collect_files()
    if not files:
        print("No in-scope files found.", file=sys.stderr)
        return 1

    changed_count = 0
    print(f"Processing {len(files)} in-scope files...")
    for path in files:
        changed = process_file(path)
        if changed:
            changed_count += 1
        status = "changed" if changed else "unchanged"
        print(f"  [{status}] {os.path.basename(path)}")

    print("\nVerifying...")
    all_ok = True
    for path in files:
        problems = verify_file(path)
        if problems:
            all_ok = False
            print(f"  FAIL {os.path.basename(path)}: {'; '.join(problems)}")

    print("\n=== Summary ===")
    print(f"In-scope files : {len(files)}")
    print(f"Files changed  : {changed_count}")
    print(f"Verification   : {'ALL OK' if all_ok else 'PROBLEMS FOUND'}")
    return 0 if all_ok else 2


if __name__ == "__main__":
    sys.exit(main())
