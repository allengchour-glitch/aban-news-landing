#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""add_dossier_link.py — verlinkt die Themen-Dossiers aus den Branchen-Hubs.

Fügt in jede ki-fuer-*.html (DE + en/) einen kleinen, idempotenten Block ein, der
auf die Themen-Dossiers verweist (interner Link-Saft + Gratis-Content-Einstieg in
den Newsletter-Funnel). Marker: data-aban-dossier-link.

Sicher & idempotent: ist der Block schon da, wird er aktualisiert; sonst direkt
vor dem letzten </main> eingefügt. Reine String-Operation, kein Eingriff in den
redaktionellen Inhalt.

Run:  python3 tools/add_dossier_link.py [--lang en] [--dry]
"""
import glob
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = "data-aban-dossier-link"

BLOCK_DE = ("""<aside {marker} style="max-width:760px;margin:2rem auto;padding:1.2rem 1.4rem;"""
            """border:1px solid #ece3d4;border-radius:14px;background:#fffbf5">
  <strong style="display:block;margin-bottom:.5rem">🧭 KI verstehen statt nur nutzen — die Themen-Dossiers</strong>
  <p style="margin:0 0 .6rem;color:#374151">Ehrliche Tiefen-Guides aus dem aban-news-Newsletter — gratis, ohne Anmeldung:</p>
  <p style="margin:0;line-height:1.9">
    <a href="/dossier/ki-datenschutz-dach.html">🔒 KI &amp; Datenschutz im DACH-Raum</a> ·
    <a href="/dossier/ki-fuer-selbststaendige.html">🚀 KI für Selbstständige</a> ·
    <a href="/dossier/anti-hype-reality-checks.html">🔍 Anti-Hype &amp; Reality-Checks</a> ·
    <a href="/dossiers.html"><strong>alle Dossiers →</strong></a>
  </p>
</aside>
""")

BLOCK_EN = ("""<aside {marker} style="max-width:760px;margin:2rem auto;padding:1.2rem 1.4rem;"""
            """border:1px solid #ece3d4;border-radius:14px;background:#fffbf5">
  <strong style="display:block;margin-bottom:.5rem">🧭 Understand AI, don't just use it — the topic dossiers</strong>
  <p style="margin:0 0 .6rem;color:#374151">Honest in-depth guides from the aban news newsletter — free, no sign-up:</p>
  <p style="margin:0;line-height:1.9">
    <a href="/en/dossier/ki-datenschutz-dach.html">🔒 AI &amp; Data Protection (DACH)</a> ·
    <a href="/en/dossier/ki-fuer-selbststaendige.html">🚀 AI for the Self-Employed</a> ·
    <a href="/en/dossier/anti-hype-reality-checks.html">🔍 Anti-Hype &amp; Reality Checks</a> ·
    <a href="/en/dossiers.html"><strong>all dossiers →</strong></a>
  </p>
</aside>
""")

EXISTING = re.compile(r'<aside ' + re.escape(MARKER) + r'.*?</aside>\n?', re.S)


def main():
    dry = "--dry" in sys.argv
    lang = "en" if "en" in sys.argv else "de"
    base = ROOT / "en" if lang == "en" else ROOT
    block = (BLOCK_EN if lang == "en" else BLOCK_DE).format(marker=MARKER)
    files = sorted(glob.glob(str(base / "ki-fuer-*.html")))
    inserted = updated = unchanged = skipped = 0
    for f in files:
        p = Path(f)
        s = p.read_text(encoding="utf-8")
        if MARKER in s:
            new = EXISTING.sub(lambda _m: block, s, count=1)
            if new == s:
                unchanged += 1
                continue
            updated += 1
        else:
            idx = s.rfind("</main>")
            if idx == -1:
                skipped += 1
                continue
            new = s[:idx] + block + s[idx:]
            inserted += 1
        if not dry:
            p.write_text(new, encoding="utf-8")
    print(f"{'[dry] ' if dry else ''}{lang}: {inserted} eingefügt, {updated} aktualisiert, "
          f"{unchanged} unverändert, {skipped} ohne </main>, {len(files)} gesamt.")


if __name__ == "__main__":
    main()
