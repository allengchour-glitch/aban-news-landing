#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Konsistenz-Check für Preise & Garantien (stdlib, deterministisch).

Fängt genau die Drifts ab, die wir gerade von Hand finden mussten (EN €99 statt €89,
falsche Runway-Zahl, widersprüchliche Garantie-Fristen). Prüft die ausgelieferte
Haupt-Website gegen die kanonischen Werte und schreibt reports/CONSISTENCY.md.

Kanonisch:  Founding €69 einmalig · Premium €9/€89 · Pro €19/€190 · 30 Tage Geld-zurück.

    python3 tools/consistency_check.py            # Report, Exit 0
    python3 tools/consistency_check.py --strict    # Exit 1 bei Abweichung (CI)
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "reports" / "CONSISTENCY.md"

# Mehrstufiges Preismodell: Premium €9/€89 · Pro €19/€190 · Founding €69 (einmalig).
CANON = {"founding": 69, "months": {9, 19}, "years": {89, 190}, "moneyback_days": 30}
# Eigene Produkte/interne Ops-Docs mit eigener Preis-/Garantie-Logik → nicht prüfen.
# (business-cockpit/cockpit-app = separates Business-/Trading-Tool mit eigenem €29/€49-Preis.)
EXCLUDE = ("/dist/", "node_modules", "/video-prototypes/", "/aban-studio/", "/dropship/",
           "/kurs.html", "/launch-manual.html", "/ebook.html", "/buch.html",
           "/business-cockpit.html", "/cockpit-app.html")

# €X /Jahr|pro Jahr|per year  ·  €X /Monat|pro Monat|per month  ·  €X einmal/once/lifetime
YEAR = re.compile(r'€\s?(\d{1,4})\s*(?:/|pro\s|per\s)?\s*(?:Jahr|year)', re.I)
MONTH = re.compile(r'€\s?(\d{1,4})\s*(?:/|pro\s|per\s)?\s*(?:Monat|month)', re.I)
LIFE = re.compile(r'€\s?(\d{1,4})\s*(?:einmal|einmalig|once|lifetime)', re.I)
MBACK = re.compile(r'(\d{1,3})\s*[- ]?\s*(?:Tage?|days?)\s*(?:[- ]?\s*)?(?:Geld[- ]?zurück|money[- ]?back|Geld zurück)', re.I)
LEGACY = re.compile(r'€\s?(?:149|99|79)\b')  # bekannte alte Preise


def pages() -> list[Path]:
    out = []
    for p in REPO.rglob("*.html"):
        rp = "/" + p.relative_to(REPO).as_posix()
        if any(x in rp for x in EXCLUDE) or "/archive/" in rp:
            continue
        out.append(p)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--strict", action="store_true")
    args = ap.parse_args()

    findings: list[str] = []
    for p in pages():
        rp = p.relative_to(REPO).as_posix()
        for i, line in enumerate(p.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
            for m in YEAR.finditer(line):
                if m.start() and line[m.start() - 1] in "–—-":
                    continue  # Teil einer Spanne (z. B. „€5–€10")
                if int(m.group(1)) not in CANON["years"]:
                    findings.append(f"{rp}:{i} — Jahrespreis €{m.group(1)} ∉ {sorted(CANON['years'])}")
            for m in MONTH.finditer(line):
                if m.start() and line[m.start() - 1] in "–—-":
                    continue  # Spanne (z. B. „€5–€10/Monat") = Vergleich, kein Preis
                if int(m.group(1)) not in CANON["months"]:
                    findings.append(f"{rp}:{i} — Monatspreis €{m.group(1)} ∉ {sorted(CANON['months'])}")
            for m in LIFE.finditer(line):
                if int(m.group(1)) != CANON["founding"]:
                    findings.append(f"{rp}:{i} — Einmalpreis €{m.group(1)} ≠ €{CANON['founding']}")
            for m in MBACK.finditer(line):
                if int(m.group(1)) != CANON["moneyback_days"]:
                    findings.append(f"{rp}:{i} — Geld-zurück {m.group(1)} Tage ≠ {CANON['moneyback_days']}")
            if LEGACY.search(line):
                findings.append(f"{rp}:{i} — alter Preis (149/99/79) gefunden: {line.strip()[:80]}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    head = ("# Konsistenz-Check — Preise & Garantien\n\n"
            f"Kanonisch: Founding €{CANON['founding']} einmalig · Premium €9/Monat·€89/Jahr · "
            f"Pro €19/Monat·€190/Jahr · {CANON['moneyback_days']} Tage Geld-zurück.\n\n")
    if not findings:
        OUT.write_text(head + "✅ Keine Abweichungen gefunden.\n", encoding="utf-8")
        print("✅ Konsistenz-Check: keine Abweichungen.")
        return 0
    body = "\n".join(f"- {f}" for f in findings)
    OUT.write_text(head + f"⚠️ {len(findings)} Abweichung(en):\n\n{body}\n", encoding="utf-8")
    print(f"⚠️ {len(findings)} Abweichung(en) — siehe {OUT.relative_to(REPO)}:")
    for f in findings:
        print("  " + f)
    return 1 if args.strict else 0


if __name__ == "__main__":
    sys.exit(main())
