#!/usr/bin/env python3
"""tools/add_en_hub_breadcrumbs.py — fügt BreadcrumbList-JSON-LD in alle
en/ki-fuer-*.html ein (Parität zu den DE-Hubs, die das schon haben).

Idempotent: Hubs mit bestehendem BreadcrumbList werden übersprungen. Name + URL
werden aus dem vorhandenen WebPage-JSON-LD des Hubs gelesen (keine erfundenen
Daten). Der Block wird direkt VOR dem WebPage-Script eingefügt (gleiche Stelle
wie bei den DE-Hubs).

    python3 tools/add_en_hub_breadcrumbs.py [--dry]
"""
import glob
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOME = "https://abannews.com/en/"

# matcht das WebPage-JSON-LD-Script (zum Auslesen von name/url + als Einfügepunkt)
WEBPAGE_RE = re.compile(
    r'(  <script type="application/ld\+json">\s*\n\s*)(\{[^\n]*"@type":"WebPage"[^\n]*\})',
)


def breadcrumb(name: str, url: str) -> str:
    data = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": HOME},
            {"@type": "ListItem", "position": 2, "name": name, "item": url},
        ],
    }
    return ('  <script type="application/ld+json">\n  '
            + json.dumps(data, ensure_ascii=False) + '\n  </script>\n')


def main():
    dry = "--dry" in sys.argv
    files = sorted(glob.glob(str(ROOT / "en" / "ki-fuer-*.html")))
    inserted = skipped = unchanged = 0
    for f in files:
        p = Path(f)
        s = p.read_text(encoding="utf-8")
        if "BreadcrumbList" in s:
            unchanged += 1
            continue
        m = WEBPAGE_RE.search(s)
        if not m:
            skipped += 1
            continue
        try:
            wp = json.loads(m.group(2))
            name, url = wp["name"], wp["url"]
        except Exception:  # noqa: BLE001
            skipped += 1
            continue
        block = breadcrumb(name, url)
        new = s[:m.start()] + block + s[m.start():]
        if not dry:
            p.write_text(new, encoding="utf-8")
        inserted += 1
    print(f"{'[dry] ' if dry else ''}{inserted} eingefügt, {unchanged} schon vorhanden, "
          f"{skipped} übersprungen (kein WebPage-JSON-LD), {len(files)} gesamt.")


if __name__ == "__main__":
    main()
