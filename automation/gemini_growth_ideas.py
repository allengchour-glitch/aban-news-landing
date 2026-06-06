#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Gemini-Wachstums-Berater (Ideen, KEINE Auto-Umsetzung).

Fragt Gemini nach ehrlichen, umsetzbaren Wachstumsideen (E-Mail-Abonnenten + Social-Follower)
für einen neuen deutschsprachigen KI-Newsletter und schreibt sie nach docs/WACHSTUM-IDEEN.md.
Mensch/Boss prüft und setzt nur die guten, marken-konformen um (keine Spam-/Fake-Taktiken).

No-op ohne GEMINI_API_KEY (Exit 0).
    python3 automation/gemini_growth_ideas.py
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "docs" / "WACHSTUM-IDEEN.md"
MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

PROMPT = """Du berätst „aban news“ — einen brandneuen, täglichen deutschsprachigen KI-Newsletter
für DACH-Profis (Start bei 0 Abonnenten). Marke: ehrlich, anti-Hype, kein Tracking-Pixel,
KEINE erfundenen Zahlen, kein Affiliate-Müll. Solo-Betreiber, kleines/kein Budget.

Gib 12 KONKRETE, ehrliche, sofort umsetzbare Wachstumsideen — für E-Mail-Abonnenten UND
Social-Follower (LinkedIn, Telegram). Pro Idee: 1 Satz Was + 1 Satz Wie + erwarteter Aufwand
(klein/mittel/groß).

STRIKT verboten (nicht vorschlagen): Follower/Abonnenten kaufen, Fake-Zahlen/Testimonials,
Spam/DMs in Masse, Clickbait mit falschen Versprechen, Engagement-Pods/Bots, irreführende Taktiken.
Bevorzugt: echter Mehrwert, Community, Kooperationen, SEO, Cross-Promotion, organische Reichweite.

Antworte als Markdown-Liste, gegliedert in „## E-Mail-Abonnenten“ und „## Social-Follower“.
"""


def gemini(api_key, prompt):
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
           f"{MODEL}:generateContent?key={api_key}")
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.6, "maxOutputTokens": 2000}}
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode("utf-8"))["candidates"][0]["content"]["parts"][0]["text"]


def main() -> int:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("GEMINI_API_KEY nicht gesetzt → no-op (Exit 0).")
        return 0
    try:
        ideas = gemini(api_key, PROMPT)
    except urllib.error.HTTPError as e:
        print(f"::warning::Gemini HTTP {e.code}: {e.read().decode('utf-8','ignore')[:300]}")
        return 0
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Gemini-Aufruf fehlgeschlagen: {e}")
        return 0

    today = dt.date.today().isoformat()
    header = (f"# Wachstums-Ideen (Gemini) — Stand {today}\n\n"
              "> ⚠️ VORSCHLÄGE von Gemini — vor Umsetzung prüfen. Nur marken-konforme, ehrliche "
              "Ideen umsetzen (keine Fake-Zahlen, kein Spam/Bots/gekaufte Follower).\n\n---\n\n")
    OUT.write_text(header + ideas.strip() + "\n", encoding="utf-8")
    print(f"✓ Ideen geschrieben: {OUT} ({len(ideas)} Zeichen)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
