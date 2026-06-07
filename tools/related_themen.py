#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — interne Verlinkung der themen/-Artikel („Verwandte Themen").

Setzt in jede themen/*.html einen kompakten „Verwandte Themen"-Block (Marker
data-aban-related-themen) als Ring: Artikel i verlinkt die nächsten N → kein
Artikel bleibt verwaist, besserer Crawl & Verweildauer. Idempotent, Labels aus <title>.

    python3 tools/related_themen.py [--dry] [--n 5]
"""
from __future__ import annotations

import argparse
import glob
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
THEMEN = ROOT / "themen"
MARKER = "data-aban-related-themen"
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.S | re.I)
EXISTING = re.compile(r'<aside ' + re.escape(MARKER) + r'.*?</aside>\n?', re.S)


def label_from(path: Path, slug: str) -> str:
    m = TITLE_RE.search(path.read_text(encoding="utf-8", errors="ignore"))
    if m:
        t = m.group(1).split("|")[0].replace("&amp;", "&").strip()
        if t:
            return t
    return slug.replace("-", " ").title()


def build_block(neighbors: list[tuple[str, str]]) -> str:
    links = " ·\n    ".join(
        f'<a href="/themen/{s}.html" style="color:#b45309;text-decoration:none;font-weight:600">{lbl}</a>'
        for s, lbl in neighbors)
    return (
        f'<aside {MARKER} style="max-width:760px;margin:1.5rem auto;padding:1rem 1.2rem;'
        'border:1px solid #ece3d4;border-radius:14px;background:#fcfaf6">\n'
        '  <h2 style="margin:0 0 .5rem;font-size:1.05rem;color:#1f2937">Verwandte Themen</h2>\n'
        '  <p style="margin:0;color:#374151;font-size:.93rem;line-height:1.8">\n    '
        f'{links}\n  </p>\n</aside>\n')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--n", type=int, default=5)
    args = ap.parse_args()

    files = sorted(glob.glob(str(THEMEN / "*.html")))
    slugs = [Path(f).stem for f in files]
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
          f"{unchanged} unverändert, {skipped} übersprungen, {len(files)} gesamt (je {n} Querverweise).")


if __name__ == "__main__":
    main()
