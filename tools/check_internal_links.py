#!/usr/bin/env python3
"""Aban News — Interner Link-/Asset-Integritätscheck.

Prüft alle internen href/src-Verweise der HAUPT-Website (abannews.com) darauf,
ob die Zieldatei im Repo existiert. Ergänzt tools/link_checker.py, der die
*ausgehenden* http(s)-Links in den Datenquellen prüft — dieses Tool prüft die
*internen* Verlinkungen der ausgelieferten HTML-Seiten.

Bewusst ausgeschlossen:
  - **/dist/**            (gebaute Sub-Sites; deployen auf eigene Subdomains,
                           ihre /-absoluten Links zeigen auf deren eigenen Root)
  - node_modules
  - http(s)/mailto/tel/#-Anker/data:/javascript:  (keine internen Dateien)
  - Inhalte in <script>…</script> (JS-Template-Strings sind keine Links)
  - Platzhalter mit ${…}, {merge_tag} oder [PLATZHALTER] (Newsletter-Vorlagen)

Reine Standardbibliothek, kein Netz, kein Tracking.

Beispiele:
    python3 tools/check_internal_links.py
    python3 tools/check_internal_links.py --fail-on-broken   # Exit 1 für CI
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

ATTR = re.compile(r'(?:href|src)\s*=\s*"([^"]+)"')
SCRIPT = re.compile(r"<script\b.*?</script>", re.S | re.I)
EXTERNAL = ("http://", "https://", "mailto:", "tel:", "//", "data:", "javascript:")
PLACEHOLDER = re.compile(r"\$\{|\{[a-z_]+\}|\[[A-Z0-9_]+\]")


def is_skippable(url: str) -> bool:
    if not url or url.startswith("#"):
        return True
    if url.startswith(EXTERNAL):
        return True
    if PLACEHOLDER.search(url):
        return True
    return False


def scan() -> dict[str, list[str]]:
    os.chdir(REPO)
    # Pretty-URLs aus _redirects als gültige Ziele anerkennen (kein Fehlalarm).
    redirects: set[str] = set()
    rp = Path("_redirects")
    if rp.exists():
        for line in rp.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) >= 2:
                frm = parts[0].split("?")[0].rstrip("/")
                redirects.add(frm)
                redirects.add(frm.lstrip("/"))
    htmls = [
        p for p in Path(".").rglob("*.html")
        if "/dist/" not in p.as_posix()
        and "node_modules" not in p.as_posix()
    ]
    broken: dict[str, list[str]] = defaultdict(list)
    for f in htmls:
        d = f.parent
        text = SCRIPT.sub("", f.read_text(encoding="utf-8", errors="ignore"))
        for url in ATTR.findall(text):
            url = url.strip()
            if is_skippable(url):
                continue
            path = url.split("#")[0].split("?")[0]
            if not path:
                continue
            # Pretty-URL per _redirects? -> gültig
            if path.rstrip("/") in redirects:
                continue
            if path.startswith("/"):
                tgt = Path(path.lstrip("/"))
            else:
                tgt = (d / path)
            tgt = Path(os.path.normpath(tgt))
            if path.endswith("/") or tgt.is_dir():
                tgt = tgt / "index.html"
            if not tgt.exists():
                broken[url].append(f.as_posix())
    return broken


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--fail-on-broken", action="store_true",
                    help="Exit 1, wenn defekte interne Links gefunden werden (CI).")
    args = ap.parse_args()

    broken = scan()
    if not broken:
        print("✓ Keine defekten internen Links auf der Haupt-Website gefunden.")
        return 0

    print(f"✗ {len(broken)} defekte interne Ziel(e):\n")
    for url, srcs in sorted(broken.items()):
        print(f"  {url}")
        for s in srcs[:5]:
            print(f"      ← {s}")
        if len(srcs) > 5:
            print(f"      … und {len(srcs) - 5} weitere")
    return 1 if args.fail_on_broken else 0


if __name__ == "__main__":
    sys.exit(main())
