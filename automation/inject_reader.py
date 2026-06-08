#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""automation/inject_reader.py — bindet archive/reader.js in alle Archiv-Ausgaben ein.

Idempotent: fügt genau einmal `<script defer src="/archive/reader.js"></script>` vor
`</body>` ein. Ändert NICHTS am redaktionellen Inhalt. Nur echte Ausgaben
(NNN-*.html) + Probe-Ausgaben; index.html/assets bleiben unangetastet.

Run:  python3 automation/inject_reader.py
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVE = os.path.join(ROOT, "archive")
TAG = '<script defer src="/archive/reader.js"></script>'


def main():
    changed = skipped = 0
    for fn in sorted(os.listdir(ARCHIVE)):
        if not fn.endswith(".html") or fn == "index.html":
            continue
        # nur Ausgaben-Seiten (haben eine Issue-Body-Struktur)
        path = os.path.join(ARCHIVE, fn)
        s = open(path, encoding="utf-8").read()
        if 'class="issue-body"' not in s:
            continue
        if "/archive/reader.js" in s:
            skipped += 1
            continue
        if "</body>" not in s:
            continue
        s = s.replace("</body>", f"{TAG}\n</body>", 1)
        open(path, "w", encoding="utf-8").write(s)
        changed += 1
    print(f"✓ reader.js eingebunden: {changed} neu, {skipped} bereits vorhanden")


if __name__ == "__main__":
    main()
