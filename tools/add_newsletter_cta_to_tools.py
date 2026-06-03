#!/usr/bin/env python3
"""
tools/add_newsletter_cta_to_tools.py — fügt am Ende jeder Gratis-Tool-Seite eine
dezente Newsletter-Conversion-Box ein (Tool-Besucher → Abonnent:innen).

Eingefügt direkt vor dem letzten `</div></main>`. Inline-Styles (brand-konform:
gefüllter Button #b45309 = WCAG AA), unabhängig vom Seiten-CSS. Aban-Voice:
anti-hype, du-Form, ehrlich („jederzeit abbestellbar").

Idempotent: Seiten mit dem Marker `data-aban-news-cta` werden übersprungen.
Der Tool-Hub (online-tools.html) hat schon eine eigene Newsletter-Sektion → nicht in der Liste.

Aufruf:  python3 tools/add_newsletter_cta_to_tools.py [--dry]
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = "data-aban-news-cta"
ANCHOR = "</div></main>"

BAND = ('<aside ' + MARKER + ' style="max-width:760px;margin:26px auto 4px;'
        'background:linear-gradient(135deg,#fef3c7,#fffdf9);border:1px solid #fde9c8;'
        'border-radius:14px;padding:20px;text-align:center">\n'
        '  <strong style="font-size:1.08rem;color:#1f2937">Fandst du das nützlich? '
        '5 Minuten KI ohne Hype — jeden Werktag.</strong>\n'
        '  <p style="color:#374151;font-size:.93rem;margin:.45rem auto .9rem;max-width:520px">'
        'aban news ist der deutschsprachige KI-Newsletter für Selbstständige: kurz, ehrlich, '
        'kein Buzzword-Bingo. Gratis, jederzeit abbestellbar.</p>\n'
        '  <a href="https://abannews.beehiiv.com/subscribe" style="display:inline-block;'
        'background:#b45309;color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;'
        'border-radius:9px;font-size:.95rem">Newsletter gratis abonnieren →</a>\n'
        '</aside>\n')

TOOLS = [
    "encoder", "uuid-generator", "diff-tool", "markdown-tabelle", "env-parser",
    "hash-generator", "kontrast-checker", "passwort-generator", "zeichenzaehler",
    "timestamp-konverter", "jwt-decoder", "farb-umrechner", "prozent-rechner",
    "mwst-rechner", "qr-code", "regex-tester", "json-formatter",
    "automatisierung-rechner", "cron-generator", "was-automatisieren",
    "ki-kosten-rechner",
]


def main():
    dry = "--dry" in sys.argv
    added = skipped = missing = 0
    for name in TOOLS:
        p = ROOT / (name + ".html")
        if not p.exists():
            missing += 1
            continue
        s = p.read_text(encoding="utf-8")
        if MARKER in s:
            skipped += 1
            continue
        # bevorzugt vor `</div></main>`, sonst vor dem letzten `</main>`
        if ANCHOR in s:
            new = s.replace(ANCHOR, BAND + ANCHOR, 1)
        elif "</main>" in s:
            idx = s.rfind("</main>")
            new = s[:idx] + BAND + s[idx:]
        else:
            skipped += 1
            continue
        if not dry:
            p.write_text(new, encoding="utf-8")
        added += 1
    print(f"{'[dry] ' if dry else ''}{added} ergänzt, {skipped} übersprungen, "
          f"{missing} fehlen, {len(TOOLS)} gesamt.")


if __name__ == "__main__":
    main()
