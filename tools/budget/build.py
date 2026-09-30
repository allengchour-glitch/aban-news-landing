#!/usr/bin/env python3
"""Baut den Budget-Plan (Produkt) und die Gratis-Seite aus EINER Rechen-Engine.

    python3 tools/budget/build.py   # → content/packs/de/budget-plan/budget-plan.html
                                    #   + Engine-Block in budget-rechner-schweiz.html
Feste Marken statt Regex (Lehre aus tools/schulden/build.py: ein zu gieriges Muster löschte die Oberfläche).
"""
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[1]
engine = (HIER / "engine.js").read_text(encoding="utf-8")

src = (HIER / "budget-plan.src.html").read_text(encoding="utf-8")
assert src.count("/*ENGINE*/") == 1
ziel = ROOT / "content" / "packs" / "de" / "budget-plan" / "budget-plan.html"
ziel.parent.mkdir(parents=True, exist_ok=True)
ziel.write_text(src.replace("/*ENGINE*/", engine), encoding="utf-8")
print(f"→ {ziel.relative_to(ROOT)}")

seite = ROOT / "budget-rechner-schweiz.html"
if seite.exists():
    s = seite.read_text(encoding="utf-8")
    a, e = "/*ENGINE-START*/", "/*ENGINE-END*/"
    assert s.count(a) == 1 and s.count(e) == 1, "Engine-Marken fehlen oder doppelt"
    neu = s[:s.index(a) + len(a)] + "\n" + engine + "\n" + s[s.index(e):]
    if neu != s:
        seite.write_text(neu, encoding="utf-8")
    print(f"→ {seite.relative_to(ROOT)} (Engine-Block)")
