#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Tool-Vergleichsseiten (vergleich/*.html) mit Gemini vertiefen.

Schwester von deepen_hubs_gemini.py: gleiche verifizierte Render-/Parse-/Insert-Logik,
aber vergleichs-spezifisch (Titel „A vs B" aus h1, ehrliche Entscheidungshilfe + FAQ).
Wichtig: KEINE erfundenen Preise/Scores/Benchmarks — die Seite hat ihre eigenen Daten,
der Gemini-Teil bleibt bewusst allgemein (für wen passt was, worauf achten).

Idempotent über data-aban-deep. No-op-sicher ohne Gemini-Key (Exit 0).

  python3 automation/deepen_vergleiche_gemini.py            # eine Charge (Default 8)
  ABAN_DEEP_BATCH=45 python3 automation/deepen_vergleiche_gemini.py
  python3 automation/deepen_vergleiche_gemini.py --dry-run
"""
from __future__ import annotations

import glob
import html
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "automation"))

from deepen_hubs_gemini import MARKER, render, faq_jsonld, parse_json, insert  # noqa: E402

BATCH = int((os.environ.get("ABAN_DEEP_BATCH") or "8").strip() or "4")


def pair(src: str) -> str | None:
    """Vergleichs-Titel „A vs B" aus <h1> bzw. <title> ziehen."""
    m = re.search(r"<h1[^>]*>(.*?)</h1>", src, re.S | re.I) or re.search(r"<title>(.*?)</title>", src, re.S | re.I)
    if not m:
        return None
    t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
    t = re.split(r"\s[|–—]\s|\s·\s", t)[0].strip()
    return t or None


PROMPT = """Du schreibst für „aban news" — einen ehrlichen, anti-hype KI-Newsletter für den deutschsprachigen Raum.
Es geht um den Tool-Vergleich: „{pair}".

Schreibe eine ehrliche Entscheidungshilfe: für wen sich welches der beiden eher eignet und worauf man bei der
Wahl achten sollte. WICHTIG: Erkläre alles so einfach und klar, dass es auch jemand ohne jede KI-Vorkenntnis
sofort versteht — vermeide Fachbegriffe oder erkläre sie in einem kurzen Halbsatz (z. B. „… eine Vorlage, in
die du nur deinen Text einsetzt"). Bleib sachlich und konkret, du-Form, ohne Buzzwords. KEINE erfundenen Preise, Zahlen,
Prozentwerte, Scores oder Benchmarks — die kennst du nicht. Wenn sich die beiden für den Alltag kaum
unterscheiden, sag das ehrlich. Nenne ruhig typische Stärken/Schwächen der jeweiligen Tool-Art.

Gib AUSSCHLIESSLICH gültiges JSON in genau diesem Format zurück (kein Markdown, keine Erklärung drumherum):
{{
 "intro": "2 zusammenhängende Absätze (je 3-5 Sätze): wann eher das eine, wann eher das andere — anhand echter Auswahl-Kriterien (Use-Case, Budget-Logik, Lernkurve, Datenschutz/DACH, Integrationen). Trenne die zwei Absätze mit \\n\\n.",
 "faq": [
   {{"q": "Eine echte Frage, die jemand vor dieser Tool-Wahl hätte", "a": "ehrliche, konkrete Antwort in 2-3 Sätzen"}},
   {{"q": "...", "a": "..."}},
   {{"q": "...", "a": "..."}}
 ]
}}"""


def main():
    dry = "--dry-run" in sys.argv
    todo = []
    for f in sorted(glob.glob(os.path.join(ROOT, "vergleich", "*.html"))):
        src = open(f, encoding="utf-8").read()
        if MARKER in src:
            continue
        p = pair(src)
        if p:
            todo.append((f, p))
    print(f"{len(todo)} Vergleichsseiten ohne Tiefen-Abschnitt; Charge: {BATCH}")
    batch = todo[:BATCH]
    if dry:
        for f, p in batch:
            print("  würde vertiefen:", os.path.basename(f), "→", p)
        return 0
    try:
        from gemini_text import generate
    except Exception as ex:  # noqa: BLE001
        print(f"gemini_text nicht ladbar: {ex} → no-op"); return 0
    done = 0
    for f, p in batch:
        txt = generate(PROMPT.format(pair=p), max_tokens=2048, temperature=0.5,
                       thinking_budget=0, response_json=True)
        if not txt:
            print(f"  (keine Gemini-Antwort für {p} — übersprungen)"); continue
        data = parse_json(txt)
        if not data:
            print(f"  (kein gültiges JSON für {p} — übersprungen)"); continue
        section = render(p, data, heading=f"{p}: worauf es bei der Wahl ankommt")
        if not section:
            print(f"  (unvollständig für {p} — übersprungen)"); continue
        src = open(f, encoding="utf-8").read()
        out = insert(src, section, faq_jsonld(data))
        if not out:
            continue
        open(f, "w", encoding="utf-8").write(out)
        done += 1
        print(f"  ✓ vertieft: vergleich/{os.path.basename(f)} ({p})")
    print(f"{done} Vergleichsseiten vertieft.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
