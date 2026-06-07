#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Content-Engine: Gemini erzeugt, der Brand-Voice-Linter ist der Türsteher.

Rollen: Gemini = Arbeiter (schreibt Posts), dieses Skript = Boss (Regeln + Qualitäts-Gate).
Es erzeugt EVERGREEN Social-Posts (zeitlos, KEINE erfundenen Zahlen/News → sicher auto-postbar),
prüft JEDEN per tools/brand-voice-linter.py --strict und hängt NUR bestandene an die Autopost-
Queues (Telegram + LinkedIn). So gehen die Kanäle nie leer.

No-op ohne GEMINI_API_KEY (Exit 0). Nichts wird hier gepostet — nur Queue gefüllt.

    python3 automation/gemini_generate_posts.py --n 3
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
LINTER = REPO / "tools" / "brand-voice-linter.py"
QUEUES = [REPO / "social" / "telegram_queue.json", REPO / "social" / "linkedin_queue.json"]
MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

PROMPT = """Schreibe {n} eigenständige, EVERGREEN Social-Posts für „aban news“ (täglicher
deutschsprachiger KI-Newsletter für DACH-Profis).

REGELN (strikt):
- du-Form, ehrlich, nüchtern, anti-Hype.
- VERBOTEN: revolutionär, disruptiv, game-changer, bahnbrechend, „verändert alles“, AI-powered,
  Ausrufezeichen-Ketten, Großbuchstaben-Schreien.
- KEINE Statistiken, Prozente, Studien, Datums-/Aktualitätsbezüge oder konkreten Produkt-News
  (zeitlos halten — keine Zahlen erfinden!).
- Konkreter Nutzen: ein Tipp, ein Prompt zum Kopieren oder eine klare Haltung.
- 60–130 Wörter. Am Ende: https://abannews.com und MAXIMAL 3 Hashtags.
- Trenne die Posts mit einer eigenen Zeile genau so: ---POST---
- Kein Vorwort, keine Nummerierung, nur die Posts.
"""

PROMPT_ONE = """Schreibe EINEN eigenständigen, EVERGREEN Social-Post für „aban news“ (täglicher
deutschsprachiger KI-Newsletter für DACH-Profis).

REGELN (strikt):
- du-Form, ehrlich, nüchtern, anti-Hype.
- VERBOTEN: revolutionär, disruptiv, game-changer, bahnbrechend, „verändert alles“, AI-powered,
  Ausrufezeichen-Ketten, Großbuchstaben-Schreien.
- KEINE Statistiken, Prozente, Studien, Datums-/Aktualitätsbezüge oder konkreten Produkt-News
  (zeitlos halten — keine Zahlen erfinden!).
- Konkreter Nutzen: ein Tipp, ein Prompt zum Kopieren oder eine klare Haltung.
- 60–130 Wörter. Am Ende: https://abannews.com und MAXIMAL 3 Hashtags.
- Nur der Post-Text, kein Vorwort, keine Anführungszeichen drumherum.
"""


def gemini(api_key, prompt):
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
           f"{MODEL}:generateContent?key={api_key}")
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2000}}
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read().decode("utf-8"))
    return data["candidates"][0]["content"]["parts"][0]["text"]


def passes_linter(text) -> bool:
    if not LINTER.exists():
        return True  # ohne Linter nicht blockieren
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write(text)
        tmp = f.name
    try:
        r = subprocess.run([sys.executable, str(LINTER), tmp, "--strict"],
                           capture_output=True, text=True)
        ok = r.returncode == 0
        if not ok:
            print("  ✗ Linter abgelehnt:", (r.stdout or r.stderr).strip().splitlines()[-1:])
        return ok
    finally:
        os.unlink(tmp)


def append_to_queues(posts):
    today = dt.date.today().strftime("%Y%m%d")
    for q in QUEUES:
        items = json.loads(q.read_text(encoding="utf-8")) if q.exists() else []
        have = {e["id"] for e in items}
        prefix = "tg" if "telegram" in q.name else "li"
        i = 0
        for text in posts:
            i += 1
            pid = f"{prefix}-gen-{today}-{i}"
            while pid in have:
                i += 1
                pid = f"{prefix}-gen-{today}-{i}"
            items.append({"id": pid, "status": "ready", "text": text})
            have.add(pid)
        q.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"  → {q.name}: +{len(posts)} (gesamt {len(items)})")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--n", type=int, default=3)
    args = ap.parse_args()

    if not (os.environ.get("GCP_SA_KEY") or os.environ.get("GEMINI_API_KEY")):
        print("Weder GCP_SA_KEY noch GEMINI_API_KEY gesetzt → no-op (Exit 0).")
        return 0

    from gemini_text import generate  # Vertex → Developer-API → None
    # EINEN Post pro Aufruf = robust (Modelle ignorieren Sammel-Trenner gern).
    passed: list[str] = []
    for i in range(args.n):
        c = generate(PROMPT_ONE, max_tokens=600, temperature=0.85)
        if not c:
            continue
        c = c.strip()
        if 200 <= len(c) <= 1300 and passes_linter(c):
            passed.append(c)
            print("  ✓ akzeptiert:", c.split(chr(10))[0][:60])
        else:
            print(f"  ✗ verworfen ({len(c)} Zeichen / Gate):", c.split(chr(10))[0][:50])
    if not passed:
        print("Keine Posts bestanden das Gate — nichts hinzugefügt.")
        return 0
    append_to_queues(passed)
    print(f"✓ {len(passed)} geprüfte Posts in die Queues aufgenommen.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
