#!/usr/bin/env python3
"""Baut den Finanz-Kompass (Produkt) aus den VIER Rechen-Engines (Budget, Schulden, Mietzins, Kompass).

    python3 tools/kompass/build.py   # → content/packs/de/finanz-kompass/finanz-kompass.html
Feste Marke /*ENGINES*/ statt Regex (Lehre aus tools/schulden/build.py).
"""
from pathlib import Path

HIER = Path(__file__).resolve().parent
TOOLS = HIER.parent
ROOT = TOOLS.parent
engines = "\n".join((TOOLS / n / "engine.js").read_text(encoding="utf-8") for n in ("budget", "schulden", "mietzins", "kompass"))
src = (HIER / "kompass.src.html").read_text(encoding="utf-8")
assert src.count("/*ENGINES*/") == 1
ziel = ROOT / "content" / "packs" / "de" / "finanz-kompass" / "finanz-kompass.html"
ziel.parent.mkdir(parents=True, exist_ok=True)
ziel.write_text(src.replace("/*ENGINES*/", engines), encoding="utf-8")
print(f"→ {ziel.relative_to(ROOT)}")

seite = ROOT / "finanz-kompass-schweiz.html"
s = seite.read_text(encoding="utf-8")
a, e = "/*ENGINE-START*/", "/*ENGINE-END*/"
assert s.count(a) == 1 and s.count(e) == 1, "Engine-Marken fehlen oder doppelt"
neu = s[:s.index(a) + len(a)] + "\n" + engines + "\n" + s[s.index(e):]
if neu != s:
    seite.write_text(neu, encoding="utf-8")
print(f"→ {seite.relative_to(ROOT)} (Engine-Block)")
