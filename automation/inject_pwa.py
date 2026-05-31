#!/usr/bin/env python3
"""Bindet PWA-/Icon-Links site-weit ein (idempotent): PNG-Favicons,
apple-touch-icon und das Web-App-Manifest. Muster wie inject_modern.py.

    python3 automation/inject_pwa.py
"""
import glob
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOCK = (
    '  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n'
    '  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n'
    '  <link rel="apple-touch-icon" href="/apple-touch-icon.png">\n'
    '  <link rel="manifest" href="/site.webmanifest">\n'
)
EXCLUDE = {"launch-manual.html"}


def main():
    changed = 0
    for f in glob.glob(str(ROOT / "**" / "*.html"), recursive=True):
        p = Path(f)
        if "/node_modules/" in f or "/.git/" in f or p.name in EXCLUDE:
            continue
        t = p.read_text(encoding="utf-8", errors="ignore")
        if "site.webmanifest" in t or "</head>" not in t:
            continue
        # nach dem SVG-Favicon einfügen, sonst vor </head>
        import re
        m = re.search(r'<link rel="icon" href="/favicon\.svg"[^>]*>\n', t)
        if m:
            t = t[:m.end()] + BLOCK + t[m.end():]
        else:
            t = t.replace("</head>", BLOCK + "</head>", 1)
        p.write_text(t, encoding="utf-8")
        changed += 1
    print(f"PWA-/Icon-Links eingebunden: {changed} Seiten")


if __name__ == "__main__":
    main()
