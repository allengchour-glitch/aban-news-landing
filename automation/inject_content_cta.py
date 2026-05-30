#!/usr/bin/env python3
"""Idempotently inject a subscribe CTA banner + conversion.css link into
in-scope content pages of the aban news static site.

For each in-scope file:
  1. Ensure /css/conversion.css is linked (insert after the styles.css link).
  2. Insert the .content-cta banner immediately before <footer class="site-footer">.
  3. Both steps are idempotent (skipped if already present).

Files without a <footer class="site-footer"> are skipped and reported.
No git operations are performed.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

IN_SCOPE = [
    "about.html",
    "faq.html",
    "resources.html",
    "glossary.html",
    "tools.html",
    "geld-verdienen-mit-ki.html",
    "roadmap.html",
    "press.html",
]

CONVERSION_LINK = '<link rel="stylesheet" href="/css/conversion.css">'

# Matches a <link ... href="...styles.css"...> line, regardless of attribute
# order or whether the href is relative (css/styles.css) or absolute
# (/css/styles.css).
STYLES_LINK_RE = re.compile(
    r'<link\b[^>]*\bhref\s*=\s*["\'][^"\']*styles\.css["\'][^>]*>',
    re.IGNORECASE,
)

# Detects an existing conversion.css link (relative or absolute href).
CONVERSION_LINK_RE = re.compile(
    r'<link\b[^>]*\bhref\s*=\s*["\'][^"\']*conversion\.css["\'][^>]*>',
    re.IGNORECASE,
)

FOOTER_RE = re.compile(r'<footer\s+class\s*=\s*["\']site-footer["\']')


def cta_block(indent: str) -> str:
    lines = [
        '<aside class="content-cta">',
        '  <p class="sub-cta-kicker">☕ aban news</p>',
        '  <p class="sub-cta-title">Der ehrliche KI-Newsletter für DACH — Mo–Fr morgens, 3–5 Min, kein Hype.</p>',
        '  <form class="sub-cta-form" action="https://abannews.beehiiv.com/subscribe" method="get" novalidate>',
        '    <label class="sr-only" for="cc-email">E-Mail-Adresse</label>',
        '    <input id="cc-email" type="email" name="email" required placeholder="deine@email.de" autocomplete="email">',
        '    <button type="submit" class="btn">Kostenlos abonnieren →</button>',
        '  </form>',
        '  <p class="sub-cta-trust">DSGVO-konform · 1-Klick-Abmeldung · kein Tracking-Pixel</p>',
        '</aside>',
    ]
    return "\n".join(indent + ln for ln in lines)


def process(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    original = text
    notes = []

    # --- Step 1: ensure conversion.css link present exactly once ---
    if not CONVERSION_LINK_RE.search(text):
        m = STYLES_LINK_RE.search(text)
        if m:
            # Determine the indentation of the styles.css line.
            line_start = text.rfind("\n", 0, m.start()) + 1
            indent = re.match(r"[ \t]*", text[line_start:m.start()]).group(0)
            # Insert immediately after the end of the styles.css link line.
            line_end = text.find("\n", m.end())
            if line_end == -1:
                line_end = len(text)
            insertion = "\n" + indent + CONVERSION_LINK
            text = text[:line_end] + insertion + text[line_end:]
            notes.append("added conversion.css link")
        else:
            notes.append("WARNING: no styles.css link found; conversion.css link NOT added")
    else:
        notes.append("conversion.css link already present")

    # --- Step 2 & 3: inject CTA banner before footer (idempotent) ---
    if 'class="content-cta"' in text:
        notes.append("content-cta already present")
    else:
        m = FOOTER_RE.search(text)
        if not m:
            # No site-footer: skip this file entirely (and roll back any link
            # change would be wrong since stylesheet should still exist — but
            # per spec, files without site-footer are skipped). We keep the
            # link change only if styles.css existed; geld page has neither.
            notes.append("SKIPPED: no <footer class=\"site-footer\">")
            if text != original:
                path.write_text(text, encoding="utf-8")
            return "SKIPPED (no site-footer): " + path.name + " [" + "; ".join(notes) + "]"
        line_start = text.rfind("\n", 0, m.start()) + 1
        indent = re.match(r"[ \t]*", text[line_start:m.start()]).group(0)
        block = cta_block(indent) + "\n"
        text = text[:line_start] + block + text[line_start:]
        notes.append("added content-cta banner")

    if text != original:
        path.write_text(text, encoding="utf-8")
        return "CHANGED: " + path.name + " [" + "; ".join(notes) + "]"
    return "unchanged: " + path.name + " [" + "; ".join(notes) + "]"


def main() -> None:
    for name in IN_SCOPE:
        p = ROOT / name
        if not p.exists():
            print("MISSING (skipped): " + name)
            continue
        print(process(p))


if __name__ == "__main__":
    main()
