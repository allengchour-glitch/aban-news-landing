#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Newsletter-CTA in Content-Seiten ergänzen (idempotent).

Setzt eine markeneigene Newsletter-Box (Marker data-aban-newsletter-cta) vor das
letzte </main> von INHALTLICHEN Seiten, die noch keine beehiiv-Anmeldung haben.
Bewusst NICHT auf Recht-/Utility-/Listen-Seiten (Impressum, Archiv, Presse …).

Sicher & idempotent: vorhandener Block wird ersetzt; Seiten mit bereits vorhandener
beehiiv-Anmeldung werden übersprungen (kein Doppel-CTA).

    python3 tools/add_newsletter_cta.py [--dry]
"""
from __future__ import annotations

import argparse
import glob
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = "data-aban-newsletter-cta"
CTA_RE = re.compile(r'beehiiv\.com/subscribe', re.I)
EXISTING = re.compile(r'<aside ' + re.escape(MARKER) + r'.*?</aside>\n?', re.S)

# Inhaltsseiten im Root, die einen CTA verdienen (Recht/Utility/Listen bewusst NICHT).
ROOT_CONTENT = ["ki-videos-erstellen.html", "ki-lifestyle.html", "ki-stimmen.html",
                "ki-und-krypto-daten.html", "geld-verdienen-mit-3d-druck.html"]

BLOCK = f"""<aside {MARKER} style="max-width:760px;margin:2rem auto;padding:1.2rem 1.4rem;border:1px solid #ece3d4;border-radius:14px;background:#fffbf5;text-align:center">
  <h2 style="margin:0 0 .4rem;font-size:1.1rem;color:#1f2937">KI verständlich, werktäglich</h2>
  <p style="margin:0 0 .9rem;color:#374151;font-size:.95rem;line-height:1.6">aban news ist ein kurzer, ehrlicher KI-Newsletter für DACH-Profis — 3–5 Minuten, kein Hype.</p>
  <a href="https://abannews.beehiiv.com/subscribe" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;font-weight:600;padding:10px 20px;border-radius:8px;font-size:.95rem">Gratis abonnieren →</a>
</aside>
"""


def targets() -> list[Path]:
    files = [Path(f) for f in glob.glob(str(ROOT / "themen" / "*.html"))]
    files += [ROOT / n for n in ROOT_CONTENT if (ROOT / n).exists()]
    return sorted(files)


def main():
    dry = "--dry" in __import__("sys").argv
    inserted = updated = unchanged = skipped = 0
    for p in targets():
        s = p.read_text(encoding="utf-8")
        if MARKER in s:
            new = EXISTING.sub(lambda _m: BLOCK, s, count=1)
            if new == s:
                unchanged += 1
                continue
            updated += 1
        else:
            if CTA_RE.search(s):       # hat schon einen CTA → nicht doppeln
                skipped += 1
                continue
            idx = s.rfind("</main>")
            if idx == -1:
                skipped += 1
                continue
            new = s[:idx] + BLOCK + s[idx:]
            inserted += 1
        if not dry:
            p.write_text(new, encoding="utf-8")
    print(f"{'[dry] ' if dry else ''}{inserted} eingefügt, {updated} aktualisiert, "
          f"{unchanged} unverändert, {skipped} übersprungen, {len(targets())} Ziele.")


if __name__ == "__main__":
    main()
