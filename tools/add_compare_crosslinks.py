#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — kontextuelle Querverweise auf den Vergleichs-/Kaufabsicht-Seiten.

Die Vergleichsseiten (Broker, Geschäftskonto, Buchhaltung, KI-Tools …) standen
bisher isoliert: sie verlinkten nach AUSSEN zu Anbietern, aber nicht auf die
verwandten eigenen Vergleiche. Das kostet interne Verlinkung (SEO) und hält
Besucher nicht im monetarisierten Cluster.

Dieses Tool setzt einen kleinen, markentreuen „Ebenfalls vergleichen"-Block
(Marker data-aban-relcompare) direkt VOR den Founding-Nudge (data-aban-premium),
sonst vor das letzte </main>. Nur kuratierte, echt verwandte Ziele; nur wenn die
Zielseite existiert. Idempotent (vorhandener Block wird ersetzt).

    python3 tools/add_compare_crosslinks.py [--dry]
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = "data-aban-relcompare"
EXISTING = re.compile(r'<aside ' + re.escape(MARKER) + r'.*?</aside>\n?', re.S)

# Seite -> kuratierte, echt verwandte Querverweise (Slug ohne .html, Linktext).
RELATED = {
    "broker-vergleich": [("geschaeftskonto-vergleich", "Geschäftskonto im Vergleich"),
                         ("hypothek-rechner-schweiz", "Hypothek berechnen")],
    "buchhaltungssoftware-vergleich": [("lexoffice-vs-sevdesk", "lexoffice vs. sevdesk"),
                                       ("geschaeftskonto-vergleich", "Geschäftskonto im Vergleich")],
    "lexoffice-vs-sevdesk": [("buchhaltungssoftware-vergleich", "Alle Buchhaltungs-Tools im Vergleich"),
                             ("rechnung-generator", "Rechnung erstellen")],
    "geschaeftskonto-vergleich": [("qonto-vs-kontist", "Qonto vs. Kontist"),
                                  ("geschaeftskonto-kostenlos", "Kostenloses Geschäftskonto")],
    "geschaeftskonto-kostenlos": [("geschaeftskonto-vergleich", "Geschäftskonto im Vergleich"),
                                  ("qonto-vs-kontist", "Qonto vs. Kontist")],
    "qonto-vs-kontist": [("geschaeftskonto-vergleich", "Alle Geschäftskonten im Vergleich"),
                         ("buchhaltungssoftware-vergleich", "Buchhaltungssoftware im Vergleich")],
    "chatgpt-vs-claude": [("ki-tools-vergleich", "Alle KI-Tools im Vergleich"),
                          ("ki-tools-fuer-selbststaendige", "KI-Tools für Selbstständige")],
    "ki-tools-vergleich": [("chatgpt-vs-claude", "ChatGPT vs. Claude"),
                           ("ki-tools-fuer-selbststaendige", "KI-Tools für Selbstständige")],
    "angebot-vs-kostenvoranschlag": [("angebot-schreiben", "Angebot schreiben"),
                                     ("rechnung-generator", "Rechnung erstellen")],
    "selbststaendig-krankenversicherung": [("selbststaendig-ratgeber", "Ratgeber Selbstständigkeit"),
                                           ("steuern-sparen-selbststaendige", "Steuern sparen")],
}


def block_for(links: list[tuple[str, str]]) -> str:
    # mit Trenner zwischen den Links
    sep = '<span style="color:#cbb"> · </span>'
    joined = sep.join(
        f'<a href="/{slug}.html" style="color:#b45309;font-weight:600;'
        f'text-decoration:none">{label} →</a>'
        for slug, label in links)
    return (f'<aside {MARKER} style="max-width:760px;margin:18px auto 4px;'
            f'background:#fffbf5;border:1px solid #ece3d4;border-radius:14px;'
            f'padding:14px 18px;text-align:center">'
            f'<strong style="color:#1f2937">Ebenfalls vergleichen</strong>'
            f'<span style="display:block;margin-top:8px;font-size:.95rem">{joined}</span>'
            f'</aside>\n')


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()

    ins = upd = unchanged = skip = 0
    for page, links in RELATED.items():
        p = ROOT / f"{page}.html"
        if not p.is_file():
            skip += 1
            continue
        links = [(s, l) for s, l in links if (ROOT / f"{s}.html").is_file()]
        if not links:
            skip += 1
            continue
        s = p.read_text(encoding="utf-8")
        block = block_for(links)
        if MARKER in s:
            new = EXISTING.sub(lambda _m: block, s, count=1)
            if new == s:
                unchanged += 1
                continue
            upd += 1
        else:
            anchor = s.find('<aside data-aban-premium')
            if anchor == -1:
                anchor = s.rfind("</main>")
            if anchor == -1:
                anchor = s.rfind("</body>")
            if anchor == -1:
                skip += 1
                continue
            new = s[:anchor] + block + s[anchor:]
            ins += 1
        if not args.dry:
            p.write_text(new, encoding="utf-8")
        print(f"  {'dry-' if args.dry else ''}ok  {page}.html  ({len(links)} Links)")

    print(f"{ins} eingefügt, {upd} aktualisiert, {unchanged} unverändert, {skip} übersprungen.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
