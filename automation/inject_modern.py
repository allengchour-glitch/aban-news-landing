#!/usr/bin/env python3
"""Bindet den 'Warm & modern'-Layer site-weit ein: css/modern.css im <head>
und js/reveal.js vor </body>. Idempotent. Muster wie automation/inject_pwa.py.

    python3 automation/inject_modern.py
"""
import glob
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS = '  <link rel="stylesheet" href="/css/modern.css">\n'
JS = '  <script src="/js/reveal.js" defer></script>\n'
EXCLUDE = {"launch-manual.html"}  # generierte/Sonderseiten überspringen


def main():
    changed = 0
    for f in glob.glob(str(ROOT / "**" / "*.html"), recursive=True):
        p = Path(f)
        if "/node_modules/" in f or "/.git/" in f or p.name in EXCLUDE:
            continue
        t = p.read_text(encoding="utf-8", errors="ignore")
        if "</head>" not in t or "</body>" not in t:
            continue
        orig = t
        if "/css/modern.css" not in t:
            # nach conversion.css einfügen, sonst nach erstem stylesheet, sonst vor </head>
            for anchor in ('<link rel="stylesheet" href="/css/conversion.css">\n',
                           '<link rel="stylesheet" href="/css/styles.css">\n',
                           '<link rel="stylesheet" href="css/styles.css">\n'):
                if anchor in t:
                    t = t.replace(anchor, anchor + CSS, 1)
                    break
            else:
                t = t.replace("</head>", CSS + "</head>", 1)
        if "/js/reveal.js" not in t:
            t = t.replace("</body>", JS + "</body>", 1)
        if t != orig:
            p.write_text(t, encoding="utf-8")
            changed += 1
    print(f"Modern-Layer eingebunden: {changed} Seiten")


if __name__ == "__main__":
    main()
