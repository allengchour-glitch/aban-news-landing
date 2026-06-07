#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — GEO-/KI-Sichtbarkeits-Report (Grundgerüst, no-op-sicher).

Prüft je Kunde, ob seine Marke in KI-Antworten (ChatGPT/Perplexity-typische Fragen)
auftaucht, und schreibt einen ehrlichen Monats-Report nach reports/geo/<slug>-<YYYY-MM>.md.
Geschäftsmodell: monatliches Abo (B2B). Versand/Akquise bleibt Mensch.

EHRLICH: Das ist eine Momentaufnahme/Einschätzung (KI-Antworten schwanken, kein Live-Scrape).
Keine erfundenen Zahlen — die Einschätzung kommt vom Modell, klar als solche gekennzeichnet.

Kundenliste: data/geo-clients.json  (Beispiel: data/geo-clients.example.json)
No-op ohne GEMINI/GCP-Key oder ohne Kundenliste (Exit 0).

    python3 automation/geo_report.py
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
sys.path.insert(0, str(ROOT))

CLIENTS = REPO / "data" / "geo-clients.json"
OUTDIR = REPO / "reports" / "geo"

PROMPT = """Du bist GEO-/AEO-Analyst (KI-Suchmaschinen-Sichtbarkeit). Sei nüchtern und ehrlich.
Frage: Wenn jemand eine KI (ChatGPT/Perplexity) fragt „{frage}" — wie wahrscheinlich wird die
Marke „{brand}" ({website}) erwähnt? Antworte in genau diesem Format:
EINSCHÄTZUNG: <hoch|mittel|gering|unklar> — 1 Satz Begründung (keine erfundenen Zahlen).
WARUM: 2 kurze Sätze, woran es liegt.
TIPPS: 2 konkrete, umsetzbare GEO/AEO-Maßnahmen (FAQ-Block, klare H2-Antworten, Zitierbarkeit).
"""


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:40] or "kunde"


def main() -> int:
    if not CLIENTS.exists():
        print(f"Keine Kundenliste {CLIENTS.relative_to(REPO)} — siehe data/geo-clients.example.json. No-op.")
        return 0
    try:
        from gemini_text import generate
    except Exception:  # noqa: BLE001
        print("gemini_text nicht verfügbar.")
        return 0
    clients = json.loads(CLIENTS.read_text(encoding="utf-8"))
    month = dt.date.today().strftime("%Y-%m")
    OUTDIR.mkdir(parents=True, exist_ok=True)
    written = 0
    for c in clients:
        brand, website = c.get("brand", ""), c.get("website", "")
        fragen = c.get("keywords", [])
        if not brand or not fragen:
            continue
        L = [f"# KI-Sichtbarkeits-Report — {brand} ({month})", "",
             "> Momentaufnahme/Einschätzung durch ein KI-Modell — KI-Antworten schwanken, kein Live-Scrape.",
             "> Keine Erfolgsgarantie. Umsetzung der Tipps = euer Hebel.", ""]
        for frage in fragen:
            r = generate(PROMPT.format(frage=frage, brand=brand, website=website),
                         max_tokens=700, temperature=0.3, thinking_budget=0)
            L.append(f"## Frage: „{frage}\"")
            L.append(r.strip() if r else "_(keine Antwort erhalten)_")
            L.append("")
        out = OUTDIR / f"{slug(brand)}-{month}.md"
        out.write_text("\n".join(L) + "\n", encoding="utf-8")
        written += 1
        print(f"✓ {out.relative_to(REPO)}")
    print(f"Fertig: {written} Report(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
