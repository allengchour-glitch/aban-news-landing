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
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = "data-aban-tools-cta"

# Branchen mit eigenem Kit → Hub kann direkt aufs passende Produkt verlinken (#kit-<slug>).
def _kit_slugs() -> set:
    f = ROOT / "data" / "kit-catalog.json"
    try:
        return {k["slug"] for k in json.loads(f.read_text(encoding="utf-8"))}
    except Exception:  # noqa: BLE001
        return set()


KIT_SLUGS = _kit_slugs()

SHOP_GENERIC = ('Schon weiter? Fertige Branchen-Kits (Spickzettel + erprobte Prompts + '
                'Datenschutz-Checkliste, CHF 12) findest du im '
                '<a href="/shop.html" style="color:#b45309;font-weight:600;text-decoration:none">Shop →</a>')
SHOP_TARGETED = ('Schon weiter? Es gibt ein fertiges Kit für deine Branche — Spickzettel, '
                 'erprobte Prompts und Checkliste für CHF 12: '
                 '<a href="/shop.html#kit-{slug}" style="color:#b45309;font-weight:600;text-decoration:none">'
                 'Dein Branchen-Kit ansehen →</a>')

BLOCK_TMPL = """<aside {marker} style="max-width:760px;margin:2.5rem auto;padding:1.3rem 1.4rem;border:1px solid #ece3d4;border-radius:14px;background:#fffbf5">
  <h2 style="margin:0 0 .5rem;font-size:1.15rem;color:#1f2937">Passende Werkzeuge — gratis, ohne Login</h2>
  <p style="margin:0 0 .9rem;color:#374151;font-size:.96rem;line-height:1.6">Bevor du Geld für KI ausgibst: nutz die kostenlosen Tools, vergleich die KI-Anbieter ehrlich und prüf, ob KI dich überhaupt nennt. Alles ohne Anmeldung.</p>
  <p style="margin:0;display:flex;flex-wrap:wrap;gap:.55rem">
    <a href="/online-tools.html" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;font-size:.92rem">Alle Gratis-Tools →</a>
    <a href="https://tools.abannews.com" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;font-size:.92rem">KI-Tools-Verzeichnis →</a>
    <a href="/ki-erwaehnungs-check.html" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;font-size:.92rem">Werde ich von KI genannt? →</a>
    <a href="https://abannews.beehiiv.com/subscribe" style="display:inline-block;background:transparent;color:#b45309;border:1px solid #fde9c8;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;font-size:.92rem">Newsletter gratis →</a>
  </p>
  <p style="margin:.9rem 0 0;color:#374151;font-size:.9rem;line-height:1.55">{shop_line}</p>
  <p style="margin:.5rem 0 0;color:#6b7280;font-size:.86rem;line-height:1.55">aban news ist unabhängig und werbefrei. Wenn dir das hilft: <a href="/founding.html" style="color:#b45309;font-weight:600;text-decoration:none">werde Founding-Mitglied →</a></p>
</aside>
"""


BLOCK_EN = """<aside {marker} style="max-width:760px;margin:2.5rem auto;padding:1.3rem 1.4rem;border:1px solid #ece3d4;border-radius:14px;background:#fffbf5">
  <h2 style="margin:0 0 .5rem;font-size:1.15rem;color:#1f2937">Useful tools — free, no login</h2>
  <p style="margin:0 0 .9rem;color:#374151;font-size:.96rem;line-height:1.6">Before you spend money on AI: use the free tools and check whether AI even mentions you. No sign-up.</p>
  <p style="margin:0;display:flex;flex-wrap:wrap;gap:.55rem">
    <a href="https://tools.abannews.com" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;font-size:.92rem">AI tools directory →</a>
    <a href="https://abannews.beehiiv.com/subscribe" style="display:inline-block;background:transparent;color:#b45309;border:1px solid #fde9c8;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;font-size:.92rem">Free newsletter →</a>
  </p>
  <p style="margin:.9rem 0 0;color:#374151;font-size:.9rem;line-height:1.55">Want more? Ready-made industry kits (cheat sheet + proven prompts + checklist) are in the <a href="/en/shop.html" style="color:#b45309;font-weight:600;text-decoration:none">Shop →</a></p>
</aside>
"""


def slug_of(path: Path) -> str:
    return path.name[len("ki-fuer-"):-len(".html")]


def block_for(slug: str, lang: str = "de") -> str:
    if lang == "en":
        return BLOCK_EN.format(marker=MARKER)
    shop = SHOP_TARGETED.format(slug=slug) if slug in KIT_SLUGS else SHOP_GENERIC
    return BLOCK_TMPL.format(marker=MARKER, shop_line=shop)


# matcht einen bestehenden Funnel-Block (zum Ersetzen)
EXISTING = re.compile(r'<aside ' + re.escape(MARKER) + r'.*?</aside>\n?', re.S)


def main():
    dry = "--dry" in sys.argv
    lang = "en" if "--lang" in sys.argv and "en" in sys.argv else "de"
    base = ROOT / "en" if lang == "en" else ROOT
    files = sorted(glob.glob(str(base / "ki-fuer-*.html")))
    inserted = updated = unchanged = skipped = targeted = 0
    for f in files:
        p = Path(f)
        s = p.read_text(encoding="utf-8")
        block = block_for(slug_of(p), lang)
        if lang == "de" and slug_of(p) in KIT_SLUGS:
            targeted += 1
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
    print(f"{'[dry] ' if dry else ''}{inserted} eingefügt, {updated} aktualisiert, "
          f"{unchanged} unverändert, {skipped} übersprungen (kein </main>), "
          f"{targeted} mit Direkt-Kit-Link, {len(files)} gesamt.")


if __name__ == "__main__":
    main()
