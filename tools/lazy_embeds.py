#!/usr/bin/env python3
# =============================================================================
#  lazy_embeds.py — externe Einbettungen erst laden, wenn sie gebraucht werden
# -----------------------------------------------------------------------------
#  ⚠️ GEMESSEN 2026-08-28: 269 Seiten binden das beehiiv-Newsletter-iframe ein,
#  237 davon OHNE `loading="lazy"`. Ein iframe ohne dieses Attribut lädt sofort
#  mit der Seite — obwohl die Newsletter-Box weit unter dem ersten Bildschirm
#  sitzt. Auf dem Handy kostet das Datenvolumen und verzögert das Ladeende bei
#  jedem Besuch, auch wenn niemand so weit scrollt.
#
#  `loading="lazy"` ist seit Jahren in allen gängigen Browsern unterstützt und
#  ändert nichts am Aussehen: der Rahmen bleibt, der Inhalt kommt beim Scrollen.
#
#  Nur EINBETTUNGEN UNTER dem ersten Bildschirm sind gemeint. Ein iframe ganz
#  oben würde durch lazy langsamer wirken — deshalb bleiben die ersten 25 % des
#  Quelltexts unangetastet.
#
#  Aufruf:  python3 tools/lazy_embeds.py [--fix]
# =============================================================================

import os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BEREICHE = ["", "vergleich", "maerkte", "themen", "dossier", "hype-watch", "en", "fr", "it"]
# Fremde Einbettungen, die typischerweise weit unten stehen
EXTERN = re.compile(r'<iframe(?![^>]*\bloading=)([^>]*\b(?:embeds\.beehiiv\.com|youtube\.com/embed|'
                    r'player\.vimeo\.com)[^>]*)>', re.I)


def main():
    fix = "--fix" in sys.argv
    offen = 0
    seiten = []
    for bereich in BEREICHE:
        verz = os.path.join(ROOT, bereich) if bereich else ROOT
        for pfad in sorted(glob.glob(os.path.join(verz, "*.html"))):
            html = open(pfad, encoding="utf-8", errors="ignore").read()
            grenze = len(html) // 4          # oberes Viertel bleibt eifrig geladen
            neu, n = [], 0

            def ersetzen(m):
                nonlocal n
                if m.start() < grenze:       # steht weit oben -> nicht verzögern
                    return m.group(0)
                n += 1
                return '<iframe loading="lazy"' + m.group(1) + '>'

            html2 = EXTERN.sub(ersetzen, html)
            if not n:
                continue
            offen += n
            seiten.append(os.path.relpath(pfad, ROOT))
            if fix:
                open(pfad, "w", encoding="utf-8").write(html2)
    if not offen:
        print("✔ alle Einbettungen unterhalb des ersten Bildschirms laden verzögert")
        return 0
    print(f"{'✔' if fix else '⚠'} {offen} Einbettungen auf {len(seiten)} Seiten "
          f"{'auf lazy gesetzt' if fix else 'ohne loading=lazy'}")
    if not fix:
        print("   → mit --fix umstellen")
    return 0 if fix else 1


if __name__ == "__main__":
    sys.exit(main())
