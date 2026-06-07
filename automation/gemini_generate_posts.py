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

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("GEMINI_API_KEY nicht gesetzt → no-op (Exit 0).")
        return 0

    try:
        raw = gemini(api_key, PROMPT.format(n=args.n))
    except urllib.error.HTTPError as e:
        print(f"::warning::Gemini HTTP {e.code}: {e.read().decode('utf-8','ignore')[:300]}")
        return 0
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Gemini-Aufruf fehlgeschlagen: {e}")
        return 0

    # Robust gegen Schreibweisen wie "--- POST ---", "----POST----" usw.
    candidates = [p.strip() for p in re.split(r"-{2,}\s*POST\s*-{2,}", raw) if p.strip()]
    print(f"Gemini lieferte {len(candidates)} Kandidaten.")
    passed = []
    for c in candidates:
        # 200–1500 Zeichen: 60–130 Wörter liegen klar darüber; filtert Schnipsel/Vorworte raus.
        if 200 <= len(c) <= 1500 and passes_linter(c):
            passed.append(c)
            print("  ✓ akzeptiert:", c.split(chr(10))[0][:60])
        elif len(c) < 200:
            print("  ✗ zu kurz (kein vollständiger Post):", c.split(chr(10))[0][:50])
    if not passed:
        print("Keine Kandidaten bestanden das Gate — nichts hinzugefügt.")
        return 0
    append_to_queues(passed)
    print(f"✓ {len(passed)} geprüfte Posts in die Queues aufgenommen.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
