#!/usr/bin/env python3
"""aban news — Ausgaben-ENTWURF mit Gemini (no-op-sicher, reine Standardbibliothek).

Nimmt das von news_aggregator.py gesammelte Rohmaterial (automation/news-roh-*.md)
und lässt Gemini daraus einen Tagesausgaben-ENTWURF im aban-Format formulieren.

HARTE REGELN (im Prompt verankert):
  - NUR die gelieferten Quellen verwenden, NICHTS erfinden (keine Zahlen/Studien/Zitate dazudichten).
  - du-Form, anti-Hype (keine Wörter wie revolutionär/disruptiv/game-changer/bahnbrechend).
  - Format: 3 Updates (je mit Einordnung „was heißt das für dich") + 1 Tool + 1 Prompt.
  - Jede Faktbehauptung verweist auf die Quelle aus dem Rohmaterial.
  - Ergebnis ist ein ENTWURF — Versand macht IMMER der Mensch.

No-op ohne GEMINI_API_KEY (Exit 0, kein Crash, kein CI-Rot). Schreibt nichts Verschicktes,
nur eine Datei automation/entwurf-gemini-JJJJ-MM-TT.md.

Aufrufe:
    python3 automation/draft_with_gemini.py
    GEMINI_MODEL=gemini-2.0-flash python3 automation/draft_with_gemini.py
"""
from __future__ import annotations

import datetime as dt
import glob
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

PROMPT_HEADER = """Du bist die Redaktion von „aban news", einem täglichen deutschsprachigen KI-Newsletter für DACH-Profis.
Schreibe aus dem folgenden RECHERCHE-ROHMATERIAL einen ausführlichen Ausgaben-ENTWURF.

STRIKTE REGELN:
- Verwende AUSSCHLIESSLICH Informationen aus dem Rohmaterial unten. Erfinde NICHTS dazu —
  keine Zahlen, Prozente, Studien, Zitate oder Tools, die nicht im Material stehen.
- „Länger" heißt: mehr ERKLÄRUNG, Kontext und konkrete Schritte — NIEMALS neue Fakten erfinden.
- du-Form. Ehrlich, nüchtern, anti-Hype. Verboten: revolutionär, disruptiv, game-changer,
  bahnbrechend, „verändert alles", AI-powered, Buzzwords, Ausrufezeichen-Ketten.
- Ziel-Länge: rund 1100–1300 Wörter (8–10 Min Lesezeit). Maximal 1500 Wörter. Höchstens 3 Emojis gesamt.

FORMAT — verwende GENAU diese Markierungen (jede auf eigener Zeile), nichts anderes drumherum:
INTRO: <2–3 Sätze, worum es heute geht>
UPDATE: <Schlagzeile des Updates>
<2–4 Sätze mit den Fakten aus dem Material>
WAS: <ein ganzer Absatz (3–5 Sätze): was das konkret für DACH-Solo-/KMU-Profis bedeutet, was zu tun ist>
QUELLE: <die Quell-URL aus dem Material>
BILD: <kurzer ENGLISCHER Bild-Such-Hinweis, 3–6 Wörter, motivisch passend, ohne Personen>
(WIEDERHOLE den UPDATE…BILD-Block 4–5 mal)
TIEFER: <ein Thema vertieft erklärt, 5–8 Sätze, Hintergrund + Praxis-Schritte, nur aus Material>
TOOL: <nur wenn im Material ein konkretes Tool vorkommt: Name + 2–3 Sätze + „für wen / für wen nicht">
PROMPT: <ein praktischer, allgemein nützlicher Prompt zum Kopieren, kein erfundener Fakt>
OUTRO: <2–3 ehrliche Schluss-Sätze>

- Reicht das Material nicht für 4 Updates, schreib lieber weniger UPDATE-Blöcke und sag es im OUTRO ehrlich.

ROHMATERIAL:
"""


def latest_roh() -> Path | None:
    files = sorted(glob.glob(str(ROOT / "news-roh-*.md")))
    # "news-roh-aktuell.md" bevorzugen, sonst das neueste datierte
    aktuell = ROOT / "news-roh-aktuell.md"
    if aktuell.exists():
        return aktuell
    return Path(files[-1]) if files else None


def main() -> int:
    roh = latest_roh()
    if not roh:
        print("Kein Rohmaterial (automation/news-roh-*.md) — erst news_aggregator.py laufen lassen.")
        return 0
    material = roh.read_text(encoding="utf-8")[:12000]
    print(f"Rohmaterial: {roh.name} ({len(material)} Zeichen)")

    if not (os.environ.get("GCP_SA_KEY") or os.environ.get("GEMINI_API_KEY")):
        print("Weder GCP_SA_KEY noch GEMINI_API_KEY gesetzt → no-op (Exit 0).")
        return 0

    from gemini_text import generate  # Vertex → Developer-API → None
    draft = generate(PROMPT_HEADER + material, max_tokens=4000, temperature=0.4, thinking_budget=0)
    if not draft:
        print("::warning::Kein Text erzeugt (Vertex + Developer-API fehlgeschlagen) → kein Entwurf.")
        return 0

    today = dt.date.today().isoformat()
    out = ROOT / f"entwurf-gemini-{today}.md"
    header = (f"# ENTWURF (Gemini) — {today}\n\n"
              "> ⚠️ NICHT senden. Erst selbst prüfen: Fakten gegen Quellen checken, kürzen, in deine Stimme bringen.\n"
              f"> Quelle Rohmaterial: {roh.name} · Modell: {MODEL}\n\n---\n\n")
    out.write_text(header + draft.strip() + "\n", encoding="utf-8")
    print(f"✓ Entwurf geschrieben: {out.name} ({len(draft)} Zeichen)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
