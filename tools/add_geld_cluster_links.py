#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — verlinkt die finanznahen Branchen-Hubs ins ehrliche „Geld & KI"-Cluster.

Fuegt in ausgewaehlte ki-fuer-*.html-Hubs einen eigenstaendig markierten Block
<aside data-aban-geld> direkt vor </main> ein (idempotent: bei vorhandenem Marker
wird der Block ersetzt). Eigener Marker -> kollidiert NICHT mit den anderen Injektoren
(data-aban-tools-cta / data-aban-related). Keine erfundenen Zahlen, keine Anlageberatung.

  python3 tools/add_geld_cluster_links.py          # schreibt
  python3 tools/add_geld_cluster_links.py --dry     # nur zeigen
"""
from __future__ import annotations
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKER = "data-aban-geld"

HUBS = ["finanzberater", "steuerberater", "immobilienmakler",
        "versicherungsmakler", "unternehmensberater", "wirtschaftspruefer"]

# (URL, Label) — ehrliches Geld-&-KI-Cluster, fuer Finanz-Profis und ihre Kund:innen relevant
LINKS = [
    ("/geld-und-ki.html", "Geld &amp; KI — Übersicht"),
    ("/maerkte.html", "Märkte: Aktien &amp; Krypto"),
    ("/ki-aktien-hype-check.html", "KI-Aktien Hype-Check"),
    ("/trading-tipps.html", "Trading-Tipps (ehrlich)"),
    ("/ki-betrug-scam-check.html", "KI-Betrug &amp; Scams"),
    ("/steuer-basics-selbststaendige.html", "Steuer-Basics"),
    ("/kleinunternehmerregelung-einfach-erklaert.html", "Kleinunternehmerregelung"),
    ("/rechnung-generator.html", "Rechnung schreiben"),
    ("/mahnung-schreiben.html", "Mahnung schreiben"),
    ("/angebot-schreiben.html", "Angebot schreiben"),
    ("/altersvorsorge-selbststaendige.html", "Altersvorsorge"),
    ("/scheinselbststaendigkeit-vermeiden.html", "Scheinselbstständigkeit"),
]

CHIP = ("display:inline-block;border:1px solid #ece3d4;border-radius:8px;"
        "padding:7px 12px;text-decoration:none;color:#1f2937;font-size:.9rem;background:#fff")


def block() -> str:
    chips = "".join(f'<a href="{u}" style="{CHIP}">{lbl} →</a>' for u, lbl in LINKS)
    return (f'\n<aside {MARKER} style="max-width:760px;margin:26px auto;padding:16px 18px;'
            f'border:1px solid #ece3d4;border-radius:14px;background:#fffbf5">'
            f'<h2 style="font-size:1.1rem;margin:0 0 4px;color:#1f2937">Ehrliche Geld-&amp;-KI-Guides von aban news</h2>'
            f'<p style="margin:0 0 10px;color:#374151;font-size:.95rem">Anti-hype, anfängerfreundlich, '
            f'keine Anlageberatung:</p>'
            f'<p style="margin:0;display:flex;flex-wrap:wrap;gap:.5rem">{chips}</p></aside>\n')


PAT = re.compile(r'\n?<aside ' + re.escape(MARKER) + r'.*?</aside>\n?', re.S)


def main() -> int:
    dry = "--dry" in sys.argv
    b = block()
    changed = skipped = 0
    for slug in HUBS:
        f = os.path.join(ROOT, f"ki-fuer-{slug}.html")
        if not os.path.isfile(f):
            print("  fehlt:", os.path.basename(f)); continue
        src = open(f, encoding="utf-8").read()
        if MARKER in src:
            new = PAT.sub(b, src, count=1)          # idempotent: ersetzen
        else:
            idx = src.rfind("</main>")
            if idx == -1:
                print("  kein </main>:", os.path.basename(f)); continue
            new = src[:idx] + b + src[idx:]
        if new != src:
            if not dry:
                open(f, "w", encoding="utf-8").write(new)
            changed += 1
            print(("[dry] " if dry else "") + "✓ " + os.path.basename(f))
        else:
            skipped += 1
    print(f"{changed} geaendert, {skipped} unveraendert, {len(HUBS)} Hubs.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
