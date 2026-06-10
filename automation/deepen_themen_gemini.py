#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Themen-Seiten (themen/*.html) mit Gemini vertiefen.

Schwester von deepen_hubs_gemini.py: gleiche, verifizierte Render-/Parse-/Insert-Logik,
aber themen-spezifisch (Topic aus <h1>, themen-orientierter Prompt). Idempotent ueber den
gleichen Marker data-aban-deep. No-op-sicher ohne Gemini-Key (Exit 0).

  python3 automation/deepen_themen_gemini.py            # eine Charge (Default 8)
  ABAN_DEEP_BATCH=21 python3 automation/deepen_themen_gemini.py
  python3 automation/deepen_themen_gemini.py --dry-run
"""
from __future__ import annotations

import glob
import html
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "automation"))

# verifizierte Bausteine aus dem Hub-Deepener wiederverwenden (kein Duplikat)
from deepen_hubs_gemini import MARKER, render, faq_jsonld, parse_json, insert  # noqa: E402

BATCH = int((os.environ.get("ABAN_DEEP_BATCH") or "8").strip() or "4")


def topic(src: str) -> str | None:
    """Thema aus <h1> bzw. <title> ziehen (voller Text, kein 'KI fuer'-Strip)."""
    m = re.search(r"<h1[^>]*>(.*?)</h1>", src, re.S | re.I) or re.search(r"<title>(.*?)</title>", src, re.S | re.I)
    if not m:
        return None
    t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
    t = re.split(r"\s[|–—]\s|\s·\s", t)[0].strip()
    return t or None


PROMPT = """Du schreibst für „aban news" — einen ehrlichen, anti-hype KI-Newsletter für den deutschsprachigen Raum.
Schreibe vertiefenden Text zum Thema: „{topic}".

Ton: sachlich, konkret, du-Form, ohne Buzzwords, ohne Übertreibung. KEINE erfundenen Zahlen, Prozentwerte
oder Studien. Keine Heilsversprechen. Wenn KI bei etwas nicht hilft oder es Grenzen/Risiken gibt, sag das.
WICHTIG: Erkläre alles so einfach und klar, dass es auch jemand ohne jede KI-Vorkenntnis sofort versteht —
vermeide Fachbegriffe oder erkläre sie in einem kurzen Halbsatz. Nimm konkrete Alltagsbeispiele.

Gib AUSSCHLIESSLICH gültiges JSON in genau diesem Format zurück (kein Markdown, keine Erklärung drumherum):
{{
 "intro": "2 zusammenhängende Absätze (je 3-5 Sätze), die das Thema praktisch vertiefen — konkrete Anwendungsfälle, was gut funktioniert und wo die Grenzen sind. Trenne die zwei Absätze mit \\n\\n.",
 "faq": [
   {{"q": "Eine echte Frage, die jemand zu diesem Thema hätte", "a": "ehrliche, konkrete Antwort in 2-3 Sätzen"}},
   {{"q": "...", "a": "..."}},
   {{"q": "...", "a": "..."}}
 ]
}}"""


def main():
    dry = "--dry-run" in sys.argv
    todo = []
    for f in sorted(glob.glob(os.path.join(ROOT, "themen", "*.html"))):
        src = open(f, encoding="utf-8").read()
        if MARKER in src:
            continue
        t = topic(src)
        if t:
            todo.append((f, t))
    print(f"{len(todo)} Themen-Seiten ohne Tiefen-Abschnitt; Charge: {BATCH}")
    batch = todo[:BATCH]
    if dry:
        for f, t in batch:
            print("  würde vertiefen:", os.path.basename(f), "→", t)
        return 0
    try:
        from gemini_text import generate
    except Exception as ex:  # noqa: BLE001
        print(f"gemini_text nicht ladbar: {ex} → no-op"); return 0
    done = 0
    for f, t in batch:
        txt = generate(PROMPT.format(topic=t), max_tokens=2048, temperature=0.5,
                       thinking_budget=0, response_json=True)
        if not txt:
            print(f"  (keine Gemini-Antwort für {t} — übersprungen)"); continue
        data = parse_json(txt)
        if not data:
            print(f"  (kein gültiges JSON für {t} — übersprungen)"); continue
        section = render(t, data, heading=f"Vertiefung: {t}")
        if not section:
            print(f"  (unvollständig für {t} — übersprungen)"); continue
        src = open(f, encoding="utf-8").read()
        out = insert(src, section, faq_jsonld(data))
        if not out:
            continue
        open(f, "w", encoding="utf-8").write(out)
        done += 1
        print(f"  ✓ vertieft: themen/{os.path.basename(f)} ({t})")
    print(f"{done} Themen-Seiten vertieft.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
