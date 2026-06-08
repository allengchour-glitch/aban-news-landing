#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""automation/inject_assistant.py — „Frag aban"-Widget in Schlüssel-Seiten einhängen.

Fügt vor </body> ein <script defer src="/js/assistant.js"> ein — idempotent
(läuft beliebig oft). Nur kuratierte, hochwertige Seiten (Funnel + Hilfe), nicht
die 1200 Archiv-/Branchen-Guide-Seiten.

    python3 automation/inject_assistant.py
"""
import glob
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAG = '<script defer src="/js/assistant.js"></script>'

FILES = [
    "index.html", "tools.html", "online-tools.html", "faq.html", "ki-ratgeber.html",
    "shop.html", "links.html", "gratis-ki-tools.html", "hype-watch.html",
    "ai-sichtbarkeit.html", "ki-erwaehnungs-check.html", "ki-tools-datensatz.html",
    "vorlagen-set.html", "prompt-pack.html", "preview.html",
]
GLOBS = ["ki-sichtbarkeit*.html", "ki-compliance*.html"]


def targets():
    seen, out = set(), []
    for f in FILES:
        p = os.path.join(ROOT, f)
        if os.path.exists(p) and p not in seen:
            seen.add(p); out.append(p)
    for g in GLOBS:
        for p in glob.glob(os.path.join(ROOT, g)):
            if p not in seen:
                seen.add(p); out.append(p)
    return out


def main():
    added = skipped = 0
    for p in targets():
        html = open(p, encoding="utf-8").read()
        if "js/assistant.js" in html:
            skipped += 1; continue
        if "</body>" not in html:
            continue
        html = html.replace("</body>", f"{TAG}\n</body>", 1)
        open(p, "w", encoding="utf-8").write(html)
        added += 1
    print(f"✓ Frag-aban-Widget: {added} Seiten ergänzt, {skipped} schon vorhanden")


if __name__ == "__main__":
    main()
