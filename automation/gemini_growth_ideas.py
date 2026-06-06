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
MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

BRAND = ("„aban news“ + aban-Netzwerk (Radars: KI-Tools, Förder, Jobs, Kurse, Prompts, Agenturen, "
         "Video) — ehrlich, anti-Hype, kein Tracking-Pixel, KEINE erfundenen Zahlen, kein Affiliate-"
         "Müll. Solo-Betreiber, kleines/kein Budget, Start nahe 0 Reichweite.")

PROMPTS = {
    "growth": ("Du berätst " + BRAND + "\n\n"
        "Gib 12 KONKRETE, ehrliche, sofort umsetzbare Wachstumsideen — für E-Mail-Abonnenten UND "
        "Social-Follower (LinkedIn, Telegram). Pro Idee: 1 Satz Was + 1 Satz Wie + Aufwand (klein/mittel/groß).\n\n"
        "STRIKT verboten: Follower/Abonnenten kaufen, Fake-Zahlen/Testimonials, Massen-Spam/DMs, Clickbait, "
        "Engagement-Pods/Bots. Bevorzugt: echter Mehrwert, Community, Kooperationen, SEO, Cross-Promo.\n\n"
        "Markdown, gegliedert in „## E-Mail-Abonnenten“ und „## Social-Follower“."),
    "monetization": ("Du berätst " + BRAND + "\n\n"
        "Gib 12 KONKRETE, ehrliche Wege, wie aus dem aban-Netzwerk Einnahmen/Budget entstehen — ethisch, "
        "marken-konform. Pro Idee: Was + erster Schritt + 'ab welcher Reichweite sinnvoll' + Aufwand. "
        "Decke ab: Newsletter-Sponsoring (klar gekennzeichnet), faire Affiliate-Links in den Radars (nur "
        "ehrlich empfohlene Tools, transparent), Premium/Founding, bezahlte Verzeichnis-Listings (Agenturen), "
        "Digitalprodukte (Kurs/Prompt-Pack/eBook), Lead-Gen/Kooperationen.\n\n"
        "STRIKT verboten: irreführende Werbung, versteckte Affiliate-Links, Pay-for-positive-Review, "
        "Datenverkauf, alles was 'ehrlich/kein Hype' verletzt. Sortiere nach Aufwand-Nutzen.\n\n"
        "Markdown-Liste, je Idee 'erst ab X Abonnenten sinnvoll'."),
}
OUT_MAP = {"growth": REPO / "docs" / "WACHSTUM-IDEEN.md",
           "monetization": REPO / "docs" / "MONETARISIERUNG-IDEEN.md"}


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
    import argparse
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--topic", choices=list(PROMPTS), default="growth")
    args = ap.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("GEMINI_API_KEY nicht gesetzt → no-op (Exit 0).")
        return 0
    try:
        ideas = gemini(api_key, PROMPTS[args.topic])
    except urllib.error.HTTPError as e:
        print(f"::warning::Gemini HTTP {e.code}: {e.read().decode('utf-8','ignore')[:300]}")
        return 0
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Gemini-Aufruf fehlgeschlagen: {e}")
        return 0

    title = "Wachstums-Ideen" if args.topic == "growth" else "Monetarisierungs-Ideen (Budget)"
    today = dt.date.today().isoformat()
    header = (f"# {title} (Gemini) — Stand {today}\n\n"
              "> ⚠️ VORSCHLÄGE von Gemini — vor Umsetzung prüfen. Nur marken-konforme, ehrliche "
              "Ideen umsetzen (keine Fake-Zahlen, kein Spam/Bots, keine versteckten Affiliate-Links).\n\n---\n\n")
    out = OUT_MAP[args.topic]
    out.write_text(header + ideas.strip() + "\n", encoding="utf-8")
    print(f"✓ {title} geschrieben: {out} ({len(ideas)} Zeichen)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
