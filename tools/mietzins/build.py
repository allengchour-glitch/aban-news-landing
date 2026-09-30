#!/usr/bin/env python3
"""Baut das Mietzins-Paket (Produkt) aus EINER Rechen-Engine.

    python3 tools/mietzins/build.py   # → content/packs/de/mietzins-paket/mietzins-paket.html
Feste Marke /*ENGINE*/ statt Regex (Lehre aus tools/schulden/build.py).
"""
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[1]
engine = (HIER / "engine.js").read_text(encoding="utf-8")
src = (HIER / "mietzins-paket.src.html").read_text(encoding="utf-8")
assert src.count("/*ENGINE*/") == 1
ziel = ROOT / "content" / "packs" / "de" / "mietzins-paket" / "mietzins-paket.html"
ziel.parent.mkdir(parents=True, exist_ok=True)
ziel.write_text(src.replace("/*ENGINE*/", engine), encoding="utf-8")
print(f"→ {ziel.relative_to(ROOT)}")

seite = ROOT / "mietzins-senkung-rechner.html"
s = seite.read_text(encoding="utf-8")
a, e = "/*ENGINE-START*/", "/*ENGINE-END*/"
assert s.count(a) == 1 and s.count(e) == 1, "Engine-Marken fehlen oder doppelt"
neu = s[:s.index(a) + len(a)] + "\n" + engine + "\n" + s[s.index(e):]
if neu != s:
    seite.write_text(neu, encoding="utf-8")
print(f"→ {seite.relative_to(ROOT)} (Engine-Block)")
