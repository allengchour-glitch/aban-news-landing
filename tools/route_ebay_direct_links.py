#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — direkte eBay-Suchlinks auf den getrackten /go/ebay-Redirect umstellen.

Manche Kaufberater-Seiten verlinken direkt auf `ebay.ch/sch/i.html?_nkw=…` — ohne
campid, also OHNE Affiliate-Tracking (= 0 € Provision). Dieses Tool ersetzt solche
Direktlinks durch `/go/ebay?q=<Suchbegriff>&customid=<Seite>`, der serverseitig die
campid + EPN-Parameter setzt (functions/go/ebay.js). So tracken auch diese Seiten.

Sicher & idempotent: trifft nur echte ebay.(ch|de|com)/sch-Direktlinks; `/go/ebay`
bleibt unangetastet. Der Suchbegriff (_nkw) wird übernommen; Filter wie LH_PrefLoc
entfallen bewusst (der Redirect sortiert nach Best Match auf eBay.de).

    python3 tools/route_ebay_direct_links.py [--dry]
"""
from __future__ import annotations

import argparse
import glob
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL_RE = re.compile(r'https?://www\.ebay\.(?:ch|de|com)/sch/i\.html\?[^"\'\s<>]*')
NKW_RE = re.compile(r'_nkw=([^&"\'\s<>]+)')


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
            url = m.group(0)
            nk = NKW_RE.search(url)
            n += 1
            if nk and nk.group(1):
                return f"/go/ebay?q={nk.group(1)}&amp;customid={slug}"
            return f"/go/ebay?customid={slug}"

        new = URL_RE.sub(repl, s)
        if new != s:
            links_total += n
            files_changed += 1
            if not args.dry:
                Path(f).write_text(new, encoding="utf-8")
            print(f"  {'dry-' if args.dry else ''}ok  {Path(f).name}  ({n} Link(s))")

    print(f"{files_changed} Seiten geändert, {links_total} Direktlinks auf /go/ebay umgestellt.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
