#!/usr/bin/env python3
"""
tools/link_tools_to_hub.py — verlinkt die einzelnen Gratis-Tool-Seiten zurück auf
den Tool-Hub (online-tools.html). Schliesst die Hub-and-Spoke-Verlinkung: der Hub
verlinkt zu jedem Tool, jedes Tool verlinkt zurueck.

Fuegt im Footer (vor dem Impressum-Link) einen "Alle Tools"-Link ein.
Idempotent: Seiten, die den Hub schon verlinken, werden uebersprungen.

Aufruf:  python3 tools/link_tools_to_hub.py [--dry]
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ANCHOR = '<a href="/impressum.html">Impressum</a>'
INSERT = '<a href="/online-tools.html">Alle Tools</a> &middot; ' + ANCHOR

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
    changed = skipped = missing = 0
    for name in TOOLS:
        p = ROOT / (name + ".html")
        if not p.exists():
            missing += 1
            continue
        s = p.read_text(encoding="utf-8")
        if "/online-tools.html" in s:
            skipped += 1
            continue
        if ANCHOR not in s:
            skipped += 1
            continue
        new = s.replace(ANCHOR, INSERT, 1)
        if not dry:
            p.write_text(new, encoding="utf-8")
        changed += 1
    print(f"{'[dry] ' if dry else ''}{changed} verlinkt, {skipped} übersprungen, "
          f"{missing} fehlen, {len(TOOLS)} gesamt.")


if __name__ == "__main__":
    main()
