#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Money-Gaps automatisch schliessen (dynamisch, selbstheilend).

Findet (mit derselben Logik wie money_gap_audit) ALLE Kaufabsicht-Seiten ohne
Geld-Pfad — auch NEU hinzugekommene — und setzt den Founding-Geld-Pfad davor
(derselbe idempotente Block wie add_tool_premium_nudge). So muss niemand mehr eine
feste Seitenliste pflegen: neue Vergleichs-/Kaufberater-Seiten werden automatisch
monetarisiert.

DRY: nutzt money_gap_audit (Erkennung) + add_tool_premium_nudge (Einfügen) direkt
wieder — eine Quelle der Wahrheit, keine doppelte Logik. Idempotent.

Sicher: greift nur bei echter Kaufabsicht + fehlendem Geld-Pfad; der Founding-Block
ist ein dezenter, markentreuer CTA. Der Guard pusht nur auf einen Review-Branch
(brain/money-seo), nie nach main → Mensch prüft vor dem Livegang.

    python3 tools/autofix_money_gap.py [--dry]
"""
from __future__ import annotations

import argparse
import glob
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
sys.path.insert(0, str(TOOLS))

import money_gap_audit as mga          # noqa: E402  (Erkennung)
import add_tool_premium_nudge as nudge  # noqa: E402  (Einfügen: process(), NUDGE_*)


def leak_pages() -> list[Path]:
    """Alle Root-Seiten mit Kaufabsicht ABER ohne Geld-Pfad (= money_gap_audit-Logik)."""
    out = []
    for f in sorted(glob.glob(str(ROOT / "*.html"))):
        name = Path(f).stem
        if mga.SKIP_NAME.match(name):
            continue
        text = Path(f).read_text(encoding="utf-8", errors="ignore")
        if mga.NOINDEX.search(text):
            continue
        m = mga.TITLE.search(text)
        title = (m.group(1).strip() if m else name)
        if not (mga.INTENT_FILE.search(name) or mga.INTENT_TITLE.search(title)):
            continue
        if not mga.MONEY.search(text):
            out.append(Path(f))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()

    pages = leak_pages()
    if not pages:
        print("Keine offenen Money-Gaps — nichts zu tun. ✅")
        return 0

    fixed = 0
    for p in pages:
        if args.dry:
            print(f"  würde Founding-Pfad setzen: {p.name}")
            continue
        # add_tool_premium_nudge.process erwartet einen Pfad, fügt den Founding-Block
        # idempotent vor </main> ein (überspringt, wenn schon data-aban-premium da ist).
        r = nudge.process(str(p))
        print(f"  {r:8} {p.name}")
        if r == "ok":
            fixed += 1

    print(f"{'[dry] ' if args.dry else ''}{len(pages)} Lücke(n) gefunden, "
          f"{fixed} Founding-Pfad(e) gesetzt.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
