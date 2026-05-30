#!/usr/bin/env python3
"""Add the dezenten Exit-Intent/Scroll-Subscribe-Prompt to content & issue pages.

Injects <script src="/js/subscribe-prompt.js" defer></script> right before
</body>. Deliberately NOT added to the dedicated signup page (index.html), the
post-signup page (willkommen), legal pages, or the paid-funnel pages, where a
pop-in would annoy more than convert. Idempotent.

Run from repo root:  python3 automation/inject_exit_prompt.py
"""
import glob
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TAG = '<script src="/js/subscribe-prompt.js" defer></script>'

EXCLUDE = {
    "index.html", "willkommen.html", "datenschutz.html", "impressum.html",
    "founding.html", "sponsoring.html", "werbung.html", "launch.html",
    "404.html", "index-classic.html", "v2.html", "preview.html",
    "brand.html", "growth-dashboard.html", "mrr.html", "stats.html", "launch-manual.html",
}


def targets():
    files = []
    files += glob.glob(str(ROOT / "archive" / "[0-9]*.html"))
    files += glob.glob(str(ROOT / "archive" / "probe-*.html"))
    files += glob.glob(str(ROOT / "archive" / "ultimate-*.html"))
    files += [str(ROOT / "archive" / "index.html")]
    files += glob.glob(str(ROOT / "themen" / "*.html"))
    files += [str(ROOT / "downloads" / "dach-ki-toolkit.html")]
    for name in ["about.html", "faq.html", "resources.html", "glossary.html",
                 "tools.html", "geld-verdienen-mit-ki.html", "roadmap.html",
                 "press.html", "start.html"]:
        files.append(str(ROOT / name))
    # dedupe, keep existing, drop excludes
    seen, out = set(), []
    for f in files:
        p = Path(f)
        if not p.exists() or p.name in EXCLUDE:
            continue
        if f in seen:
            continue
        seen.add(f)
        out.append(p)
    return out


def main():
    changed = 0
    for p in targets():
        t = p.read_text(encoding="utf-8")
        if "subscribe-prompt.js" in t:
            continue
        if "</body>" not in t:
            print(f"!! kein </body> in {p.name}, übersprungen")
            continue
        t = t.replace("</body>", "  " + TAG + "\n</body>", 1)
        p.write_text(t, encoding="utf-8")
        changed += 1
    print(f"Exit-Prompt eingebunden: {changed} Seiten neu")


if __name__ == "__main__":
    main()
