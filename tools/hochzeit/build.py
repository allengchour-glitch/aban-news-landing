#!/usr/bin/env python3
"""Baut den Hochzeits-Budget-Plan (Produkt) und die Gratis-Seite aus EINER Rechen-Engine.

    python3 tools/hochzeit/build.py   # → content/packs/de/hochzeits-budget/hochzeits-budget.html
                                      #   + Engine-Block in hochzeit-budget-rechner.html
"""
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[1]
engine = (HIER / "engine.js").read_text(encoding="utf-8")
src = (HIER / "hochzeits-budget.src.html").read_text(encoding="utf-8")
assert src.count("/*ENGINE*/") == 1
ziel = ROOT / "content" / "packs" / "de" / "hochzeits-budget" / "hochzeits-budget.html"
ziel.parent.mkdir(parents=True, exist_ok=True)
ziel.write_text(src.replace("/*ENGINE*/", engine), encoding="utf-8")
print(f"→ {ziel.relative_to(ROOT)}")

seite = ROOT / "hochzeit-budget-rechner.html"
if seite.exists():
    s = seite.read_text(encoding="utf-8")
    a, e = "/*ENGINE-START*/", "/*ENGINE-END*/"
    assert s.count(a) == 1 and s.count(e) == 1, "Engine-Marken fehlen oder doppelt"
    neu = s[:s.index(a) + len(a)] + "\n" + engine + "\n" + s[s.index(e):]
    if neu != s:
        seite.write_text(neu, encoding="utf-8")
    print(f"→ {seite.relative_to(ROOT)} (Engine-Block)")
