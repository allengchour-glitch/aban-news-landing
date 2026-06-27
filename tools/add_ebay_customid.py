#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — &customid=<Seite> an alle /go/ebay-Links hängen (EPN-Attribution).

Der /go/ebay-Redirect reicht ein optionales customid an eBay weiter → im EPN-Report
sieht man dann pro Seite, welcher Kaufberater Klicks/Käufe bringt. Viele Links
hatten noch kein customid. Dieses Tool ergänzt es (= Dateiname der Seite) bei jedem
/go/ebay-Link, der noch keins hat. Idempotent.

    python3 tools/add_ebay_customid.py [--dry]
"""
from __future__ import annotations

import argparse
import glob
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# erfasst die komplette Query nach /go/ebay? bis zum Attribut-Ende
LINK_RE = re.compile(r'/go/ebay\?([^"\'<>\s]*)')


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()

    files_changed = 0
    links_total = 0
    for f in sorted(glob.glob(str(ROOT / "*.html"))):
        slug = Path(f).stem
        s = Path(f).read_text(encoding="utf-8")
        n = 0

        def repl(m: re.Match) -> str:
            nonlocal n
            query = m.group(1)
            if "customid=" in query:
                return m.group(0)  # schon vorhanden
            n += 1
            sep = "&amp;" if query else ""
            return f"/go/ebay?{query}{sep}customid={slug}"

        new = LINK_RE.sub(repl, s)
        if new != s:
            files_changed += 1
            links_total += n
            if not args.dry:
                Path(f).write_text(new, encoding="utf-8")
            print(f"  {'dry-' if args.dry else ''}ok  {Path(f).name}  (+{n} customid)")

    print(f"{files_changed} Seiten, {links_total} /go/ebay-Links mit customid ergänzt.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
