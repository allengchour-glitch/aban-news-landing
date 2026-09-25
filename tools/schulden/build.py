#!/usr/bin/env python3
"""Baut den Schulden-Plan (Produkt) und die Gratis-Seite aus EINER Rechen-Engine.

    python3 tools/schulden/build.py      # schreibt content/packs/de/schulden-plan/schulden-plan.html
                                         # und aktualisiert den Engine-Block in schulden-oder-investieren.html
"""
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[1]
engine = (HIER / "engine.js").read_text(encoding="utf-8")

src = (HIER / "schulden-plan.src.html").read_text(encoding="utf-8")
ziel = ROOT / "content" / "packs" / "de" / "schulden-plan" / "schulden-plan.html"
ziel.parent.mkdir(parents=True, exist_ok=True)
ziel.write_text(src.replace("/*ENGINE*/", engine), encoding="utf-8")
print(f"→ {ziel.relative_to(ROOT)}")

seite = ROOT / "schulden-oder-investieren.html"
if seite.exists():
    s = seite.read_text(encoding="utf-8")
    # Eindeutige Marken statt „bis zum nächsten </script>": ein leerer Block liess das Muster sonst
    # bis ans Ende des FOLGENDEN Skripts greifen und löschte die Oberfläche (23.09. passiert).
    a, e = "/*ENGINE-START*/", "/*ENGINE-END*/"
    assert s.count(a) == 1 and s.count(e) == 1, "Engine-Marken fehlen oder doppelt"
    neu = s[:s.index(a) + len(a)] + "\n" + engine + "\n" + s[s.index(e):]
    if neu != s:
        seite.write_text(neu, encoding="utf-8")
    print(f"→ {seite.relative_to(ROOT)} (Engine-Block)")
