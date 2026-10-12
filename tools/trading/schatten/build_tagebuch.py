#!/usr/bin/env python3
"""Setzt tagebuch.js in ki-bot-tagebuch.html ein (zwischen /*TAGEBUCH-START*/ und /*TAGEBUCH-END*/). Idempotent."""
from pathlib import Path

HIER = Path(__file__).resolve().parent
seite = HIER.parents[2] / "ki-bot-tagebuch.html"
s = seite.read_text(encoding="utf-8")
a, e = "/*TAGEBUCH-START*/", "/*TAGEBUCH-END*/"
assert s.count(a) == 1 and s.count(e) == 1, "Marken fehlen oder doppelt"
neu = s[:s.index(a) + len(a)] + "\n" + (HIER / "tagebuch.js").read_text(encoding="utf-8") + "\n" + s[s.index(e):]
if neu != s:
    seite.write_text(neu, encoding="utf-8")
print("→ ki-bot-tagebuch.html")
