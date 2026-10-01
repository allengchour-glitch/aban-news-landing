#!/usr/bin/env python3
"""Baut das Umzugs-Paket (Produkt) aus Mietzins-Engine (Termine) + Umzugs-Engine.

    python3 tools/umzug/build.py   # → content/packs/de/umzugs-paket/umzugs-paket.html (+ Engine-Block der Gratis-Seite)
"""
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[1]
engines = "\n".join((ROOT / "tools" / n / "engine.js").read_text(encoding="utf-8") for n in ("mietzins", "umzug"))
src = (HIER / "umzug.src.html").read_text(encoding="utf-8")
assert src.count("/*ENGINES*/") == 1
ziel = ROOT / "content" / "packs" / "de" / "umzugs-paket" / "umzugs-paket.html"
ziel.parent.mkdir(parents=True, exist_ok=True)
ziel.write_text(src.replace("/*ENGINES*/", engines), encoding="utf-8")
print(f"→ {ziel.relative_to(ROOT)}")

seite = ROOT / "wohnung-kuendigen-schweiz.html"
if seite.exists():
    s = seite.read_text(encoding="utf-8")
    a, e = "/*ENGINE-START*/", "/*ENGINE-END*/"
    assert s.count(a) == 1 and s.count(e) == 1, "Engine-Marken fehlen oder doppelt"
    neu = s[:s.index(a) + len(a)] + "\n" + engines + "\n" + s[s.index(e):]
    if neu != s:
        seite.write_text(neu, encoding="utf-8")
    print(f"→ {seite.relative_to(ROOT)} (Engine-Block)")
