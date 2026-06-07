#!/usr/bin/env python3
"""
tools/add_branchen_funnel.py — fügt/aktualisiert einen einheitlichen, ehrlichen
Funnel-Block in allen ki-fuer-*.html (Branchen-SEO-Seiten): Verweis auf den
Gratis-Tool-Hub, das KI-Tools-Verzeichnis, den KI-Sichtbarkeits-Check und den
Newsletter.

Sicher & idempotent: der Block wird per Marker (data-aban-tools-cta) erkannt.
Fehlt er, wird er direkt vor dem LETZTEN </main> eingefügt. Ist er vorhanden,
wird er durch die aktuelle Fassung ERSETZT (so lassen sich Links nachrüsten,
ohne Duplikate). Inline-Styles (brand-konform: gefüllte Buttons #b45309, WCAG AA)
— unabhängig vom Seiten-CSS. Aban-Voice: anti-hype, du-Form, keine erfundenen Zahlen.

Aufruf:  python3 tools/add_branchen_funnel.py [--dry]
"""
import glob
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = "data-aban-tools-cta"

BLOCK = """<aside {marker} style="max-width:760px;margin:2.5rem auto;padding:1.3rem 1.4rem;border:1px solid #ece3d4;border-radius:14px;background:#fffbf5">
  <h2 style="margin:0 0 .5rem;font-size:1.15rem;color:#1f2937">Passende Werkzeuge — gratis, ohne Login</h2>
  <p style="margin:0 0 .9rem;color:#374151;font-size:.96rem;line-height:1.6">Bevor du Geld für KI ausgibst: nutz die kostenlosen Tools, vergleich die KI-Anbieter ehrlich und prüf, ob KI dich überhaupt nennt. Alles ohne Anmeldung.</p>
  <p style="margin:0;display:flex;flex-wrap:wrap;gap:.55rem">
    <a href="/online-tools.html" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;font-size:.92rem">Alle Gratis-Tools →</a>
    <a href="https://tools.abannews.com" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;font-size:.92rem">KI-Tools-Verzeichnis →</a>
    <a href="/ki-erwaehnungs-check.html" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;font-size:.92rem">Werde ich von KI genannt? →</a>
    <a href="https://abannews.beehiiv.com/subscribe" style="display:inline-block;background:transparent;color:#b45309;border:1px solid #fde9c8;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;font-size:.92rem">Newsletter gratis →</a>
  </p>
  <p style="margin:.9rem 0 0;color:#6b7280;font-size:.86rem;line-height:1.55">aban news ist unabhängig und werbefrei. Wenn dir das hilft: <a href="/founding.html" style="color:#b45309;font-weight:600;text-decoration:none">werde Founding-Mitglied →</a></p>
</aside>
""".format(marker=MARKER)

# matcht einen bestehenden Funnel-Block (zum Ersetzen)
EXISTING = re.compile(r'<aside ' + re.escape(MARKER) + r'.*?</aside>\n?', re.S)


def main():
    dry = "--dry" in sys.argv
    files = sorted(glob.glob(str(ROOT / "ki-fuer-*.html")))
    inserted = updated = unchanged = skipped = 0
    for f in files:
        p = Path(f)
        s = p.read_text(encoding="utf-8")
        if MARKER in s:
            new = EXISTING.sub(lambda _m: BLOCK, s, count=1)
            if new == s:
                unchanged += 1
                continue
            updated += 1
        else:
            idx = s.rfind("</main>")
            if idx == -1:
                skipped += 1
                continue
            new = s[:idx] + BLOCK + s[idx:]
            inserted += 1
        if not dry:
            p.write_text(new, encoding="utf-8")
    print(f"{'[dry] ' if dry else ''}{inserted} eingefügt, {updated} aktualisiert, "
          f"{unchanged} unverändert, {skipped} übersprungen (kein </main>), "
          f"{len(files)} gesamt.")


if __name__ == "__main__":
    main()
