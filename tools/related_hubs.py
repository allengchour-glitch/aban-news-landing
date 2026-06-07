#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — interne Verlinkung der Branchen-Hubs (gegen verwaiste Seiten).

Setzt in JEDE ki-fuer-*.html einen kompakten „Verwandte Branchen"-Block (Marker
data-aban-related). Die Verlinkung folgt einem RING: Hub i verlinkt die nächsten
N alphabetischen Nachbarn (mit Umlauf). Dadurch ist GARANTIERT jeder Hub das Ziel
von N anderen Hubs → keine verwaisten Seiten mehr, besserer Crawl & Verweildauer.

Sicher & idempotent: vorhandener Block wird ersetzt, sonst vor dem letzten </main>
eingefügt. Inline-Styles (brand-konform), Aban-Voice. Labels aus dem <title> der Ziel-Hubs.

    python3 tools/related_hubs.py [--dry] [--n 6]
"""
from __future__ import annotations

import argparse
import glob
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = "data-aban-related"
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.S | re.I)
EXISTING = re.compile(r'<aside ' + re.escape(MARKER) + r'.*?</aside>\n?', re.S)


def label_from(path: Path, slug: str) -> str:
    """„KI für X" aus dem <title>; Fallback: Slug humanisiert."""
    m = TITLE_RE.search(path.read_text(encoding="utf-8", errors="ignore"))
    if m:
        t = m.group(1).split("|")[0]
        t = re.split(r"\s[—–-]\s", t, 1)[0]          # vor dem ersten Gedankenstrich
        t = re.sub(r"\(20\d\d\)", "", t).strip()
        if t:
            return t
    return "KI für " + slug.replace("-", " ").title()


def build_block(neighbors: list[tuple[str, str]]) -> str:
    links = " ·\n    ".join(
        f'<a href="/ki-fuer-{s}.html" style="color:#b45309;text-decoration:none;font-weight:600">{lbl}</a>'
        for s, lbl in neighbors)
    return (
        f'<aside {MARKER} style="max-width:760px;margin:1.5rem auto;padding:1rem 1.2rem;'
        'border:1px solid #ece3d4;border-radius:14px;background:#fcfaf6">\n'
        '  <h2 style="margin:0 0 .5rem;font-size:1.05rem;color:#1f2937">Verwandte Branchen</h2>\n'
        '  <p style="margin:0;color:#374151;font-size:.93rem;line-height:1.8">\n    '
        f'{links}\n  </p>\n</aside>\n')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--n", type=int, default=6, help="Anzahl Querverweise pro Hub")
    args = ap.parse_args()

    files = sorted(glob.glob(str(ROOT / "ki-fuer-*.html")))
    slugs = [Path(f).name[len("ki-fuer-"):-len(".html")] for f in files]
    paths = {s: Path(f) for s, f in zip(slugs, files)}
    labels = {s: label_from(paths[s], s) for s in slugs}
    n = max(1, min(args.n, len(slugs) - 1))

    inserted = updated = unchanged = skipped = 0
    for i, s in enumerate(slugs):
        neighbors = [(slugs[(i + k) % len(slugs)], labels[slugs[(i + k) % len(slugs)]])
                     for k in range(1, n + 1)]
        block = build_block(neighbors)
        p = paths[s]
        txt = p.read_text(encoding="utf-8")
        if MARKER in txt:
            new = EXISTING.sub(lambda _m: block, txt, count=1)
            if new == txt:
                unchanged += 1
                continue
            updated += 1
        else:
            idx = txt.rfind("</main>")
            if idx == -1:
                skipped += 1
                continue
            new = txt[:idx] + block + txt[idx:]
            inserted += 1
        if not args.dry:
            p.write_text(new, encoding="utf-8")
    print(f"{'[dry] ' if args.dry else ''}{inserted} eingefügt, {updated} aktualisiert, "
          f"{unchanged} unverändert, {skipped} übersprungen, {len(files)} gesamt "
          f"(je {n} Querverweise, Ring → keine Waisen).")


if __name__ == "__main__":
    main()
