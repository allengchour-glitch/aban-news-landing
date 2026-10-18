#!/usr/bin/env python3
"""Baut das verkaufte Workbook „KI-Sichtbarkeits-Audit" aus EINER Engine.

    python3 tools/ki_audit/build.py

Schreibt content/packs/de/ki-sichtbarkeit-audit/ki-sichtbarkeit-audit.html.
Aus diesem Ordner baut automation/build_product_pack.py das ZIP, das
functions/api/kit-download.js nach bezahlter Bestellung ausliefert.
"""
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[1]

engine = (HIER / "engine.js").read_text(encoding="utf-8")
src = (HIER / "workbook.src.html").read_text(encoding="utf-8")
assert src.count("/*ENGINE*/") == 1, "genau eine Engine-Marke erwartet"

ziel = ROOT / "content" / "packs" / "de" / "ki-sichtbarkeit-audit" / "ki-sichtbarkeit-audit.html"
ziel.parent.mkdir(parents=True, exist_ok=True)
neu = src.replace("/*ENGINE*/", engine)
if not ziel.exists() or ziel.read_text(encoding="utf-8") != neu:
    ziel.write_text(neu, encoding="utf-8")
    print(f"→ {ziel.relative_to(ROOT)} ({len(neu)} Zeichen)")
else:
    print(f"= {ziel.relative_to(ROOT)} unverändert")
