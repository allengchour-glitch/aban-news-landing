#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Monetarisierungs-Lücken-Audit (read-only).

Findet Seiten mit **Kaufabsicht** (Kaufberater, Vergleiche, Rechner, „kaufen") die
KEINEN echten Geld-Pfad haben — also weder Affiliate-Link (/go/…), noch Produkt/
Kit/Shop-Link, noch Founding/Pro-Angebot. Der generische Newsletter-Button im
Header zählt NICHT als Monetarisierung (steht eh auf jeder Seite).

So sieht man auf einen Blick, welche Traffic-Seiten Besucher bekommen, aber nichts
verdienen können — die lohnendsten Stellen zum Nachrüsten (Affiliate/Produkt).

Reine Stdlib. Ändert nichts.

    python3 tools/money_gap_audit.py            # Report nach reports/MONEY-GAP.md
    python3 tools/money_gap_audit.py --fail     # Exit 1, wenn Lücken (CI)
"""
from __future__ import annotations

import argparse
import glob
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Kaufabsicht: nur ECHTE Kauf-/Vergleichs-Seiten (Gratis-Rechner/Umrechner sind
# Lead-Gen-Tools, kein Affiliate-Ziel — bewusst NICHT als „Kaufabsicht").
INTENT_FILE = re.compile(r"(kaufen|-vergleich|kaufberater|angebote?|broker|"
                         r"hypothek|geschaeftskonto|immobilien|versicherung)", re.I)
INTENT_TITLE = re.compile(r"(\bkaufen\b|im Vergleich|\bVergleich\b|Kaufberater|"
                          r"\bAngebote?\b)", re.I)
TITLE = re.compile(r"<title>(.*?)</title>", re.S | re.I)
NOINDEX = re.compile(r'name="robots"\s+content="[^"]*noindex', re.I)

# Echte Geld-Pfade (Header-Newsletter bewusst NICHT dabei).
MONEY = re.compile(
    r"/go/|ebay\.|amzn\.to|amazon\.|tag=[\w-]+-21|awin1\.com|/awin|"   # Affiliate (Redirect, eBay direkt, Amazon, Awin)
    r"/founding|ki-studio\.html|aban\s*Pro|/pro\b|"                    # bezahltes Angebot
    r"shop\.html|/kits?/|downloads/kits|kit-download|danke-kit|"       # Shop/Kits
    r"data-aban-(product|kit|geld|compare|ebay|affiliate|buy)|"        # Crosslink-/Vergleichs-Marker
    r'class="[^"]*\b(affiliate|buy|cta-kauf)\b|'                        # Affiliate-/Kauf-Block (CSS-Klasse)
    r"stripe|gumroad|paddle|lemonsqueezy|checkout|"                    # Bezahl-Provider/Checkout
    r">\s*Jetzt kaufen|>\s*Kaufen\b|buy_button",                       # direkte Kauf-Buttons
    re.I)

# Klar nicht-kommerzielle/Utility-Seiten ausschließen (sollen kein Geld-Element haben).
SKIP_NAME = re.compile(r"^(impressum|datenschutz|agb|nutzungsbedingungen|widerruf|"
                       r"kontakt|transparenz|presse|press|danke|index|404|"
                       r"sitemap|suche|search|account|login|jobs?|karriere)", re.I)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--fail", action="store_true")
    args = ap.parse_args()

    leaks = []
    intent_total = 0
    for f in sorted(glob.glob(str(ROOT / "*.html"))):
        name = Path(f).stem
        if SKIP_NAME.match(name):
            continue
        text = Path(f).read_text(encoding="utf-8", errors="ignore")
        if NOINDEX.search(text):
            continue
        m = TITLE.search(text)
        title = (m.group(1).strip() if m else name)
        intent = bool(INTENT_FILE.search(name) or INTENT_TITLE.search(title))
        if not intent:
            continue
        intent_total += 1
        if not MONEY.search(text):
            leaks.append((name, title))

    rep = ROOT / "reports" / "MONEY-GAP.md"
    rep.parent.mkdir(exist_ok=True)
    lines = ["# Monetarisierungs-Lücken — abannews.com", "",
             f"**Kaufabsicht-Seiten:** {intent_total} · **ohne Geld-Pfad:** {len(leaks)}",
             "", "> Geld-Pfad = Affiliate (/go/…), Produkt/Kit/Shop oder Founding/Pro. "
             "Header-Newsletter zählt nicht.", ""]
    for n, t in leaks:
        lines.append(f"- `{n}.html` — {t[:70]}")
    rep.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Kaufabsicht-Seiten: {intent_total} · ohne Geld-Pfad: {len(leaks)} "
          f"→ reports/MONEY-GAP.md")
    for n, t in leaks[:25]:
        print(f"  · {n}.html — {t[:60]}")
    if len(leaks) > 25:
        print(f"  … und {len(leaks)-25} weitere")
    return 1 if (leaks and args.fail) else 0


if __name__ == "__main__":
    raise SystemExit(main())
