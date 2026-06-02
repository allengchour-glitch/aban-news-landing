#!/usr/bin/env python3
"""
tools/add_branchen_funnel.py — fügt einen einheitlichen, ehrlichen Funnel-Block in
alle ki-fuer-*.html (Branchen-SEO-Seiten) ein: Verweis aufs KI-Tools-Verzeichnis,
den KI-Sichtbarkeits-Check und den Newsletter.

Sicher & idempotent: der Block wird per Marker (data-aban-tools-cta) erkannt und
nur eingefügt, wenn er fehlt. Eingefügt direkt vor dem LETZTEN </main>. Inline-Styles
(brand-konform: gefüllte Buttons #b45309, WCAG AA) — unabhängig vom Seiten-CSS.
Aban-Voice: anti-hype, du-Form, keine erfundenen Zahlen.

Aufruf:  python3 tools/add_branchen_funnel.py [--dry]
"""
import glob
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = "data-aban-tools-cta"

BLOCK = """<aside {marker} style="max-width:760px;margin:2.5rem auto;padding:1.3rem 1.4rem;border:1px solid #ece3d4;border-radius:14px;background:#fffbf5">
  <h2 style="margin:0 0 .5rem;font-size:1.15rem;color:#1f2937">Passende KI-Werkzeuge — gratis, ohne Login</h2>
  <p style="margin:0 0 .9rem;color:#374151;font-size:.96rem;line-height:1.6">Bevor du Geld für KI ausgibst: vergleich die Tools ehrlich und prüf, ob KI dich überhaupt nennt. Beides kostenlos.</p>
  <p style="margin:0;display:flex;flex-wrap:wrap;gap:.55rem">
    <a href="https://tools.abannews.com" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;font-size:.92rem">KI-Tools-Verzeichnis →</a>
    <a href="/ki-erwaehnungs-check.html" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;font-size:.92rem">Werde ich von KI genannt? →</a>
    <a href="https://abannews.beehiiv.com/subscribe" style="display:inline-block;background:transparent;color:#b45309;border:1px solid #fde9c8;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;font-size:.92rem">Newsletter gratis →</a>
  </p>
</aside>
""".format(marker=MARKER)


def main():
    dry = "--dry" in sys.argv
    files = sorted(glob.glob(str(ROOT / "ki-fuer-*.html")))
    changed = skipped = 0
    for f in files:
        p = Path(f)
        s = p.read_text(encoding="utf-8")
        if MARKER in s:
            skipped += 1
            continue
        idx = s.rfind("</main>")
        if idx == -1:
            skipped += 1
            continue
        new = s[:idx] + BLOCK + s[idx:]
        if not dry:
            p.write_text(new, encoding="utf-8")
        changed += 1
    print(f"{'[dry] ' if dry else ''}{changed} Seiten ergänzt, {skipped} übersprungen "
          f"(Marker vorhanden / kein </main>), {len(files)} gesamt.")


if __name__ == "__main__":
    main()
