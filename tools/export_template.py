#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — „Newsletter-Autopilot"-Bausatz exportieren (Grundgerüst).

Kopiert die WIEDERVERWENDBAREN Automations-Bausteine (ohne Inhalte/Secrets/eigene Texte)
nach dist-template/ — fertig zum Verkauf als Boilerplate (Gumroad/Lemon Squeezy) oder als
Open-Core-Repo. Enthält KEINE Keys, KEINE Queues, KEINE eigenen Ausgaben.

    python3 tools/export_template.py
"""
from __future__ import annotations

import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "dist-template"

# Generische, wiederverwendbare Bausteine (keine eigenen Inhalte/Secrets):
FILES = [
    "automation/visuals.py", "automation/gen_image_gemini.py", "automation/pexels_image.py",
    "automation/gen_card.py", "automation/gen_chart.py", "automation/gemini_text.py",
    "automation/gemini_generate_posts.py", "automation/telegram_post.py", "automation/linkedin_post.py",
    "automation/draft_with_gemini.py", "automation/build_issue.py", "automation/autopilot.py",
    "automation/news_aggregator.py", "tools/brand-voice-linter.py", "tools/status.py",
    "tools/consistency_check.py", "Makefile",
]
WORKFLOWS = ["telegram-autopost.yml", "linkedin-autopost.yml", "gemini-content-engine.yml",
             "gemini-draft.yml", "autopilot.yml"]

README = """# Newsletter-Autopilot — Bausatz

Ein schlanker, no-op-sicherer Automations-Stack für Indie-Newsletter:
- Content-Engine (LLM erzeugt evergreen Posts) mit Brand-Voice-Gate
- Bild-Pipeline: echte Fotos (Pexels) + KI-Bilder (Imagen/Vertex) + Marken-Karte als Fallback
- Bild-reiche Ausgaben-Builder, Telegram-/LinkedIn-Autopost, täglicher Autopilot
- Alles über GitHub Actions (keine Server), Secrets nie im Code

## Setup (Kurz)
1. Secrets setzen: GEMINI_API_KEY oder GCP_SA_KEY/GCP_PROJECT, optional PEXELS_API_KEY,
   TELEGRAM_BOT_TOKEN/TELEGRAM_CHANNEL, LINKEDIN_ACCESS_TOKEN/AUTHOR_URN.
2. Workflows nach .github/workflows/ legen, Branch = main.
3. `make status` für den Überblick.

Ohne Keys passiert nichts (no-op) — gefahrloses Ausprobieren. Lizenz: <eintragen>.
"""


def main() -> int:
    if OUT.exists():
        shutil.rmtree(OUT)
    copied = 0
    for rel in FILES:
        src = REPO / rel
        if src.exists():
            dst = OUT / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(src, dst)
            copied += 1
    for wf in WORKFLOWS:
        src = REPO / ".github" / "workflows" / wf
        if src.exists():
            dst = OUT / ".github" / "workflows" / wf
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(src, dst)
            copied += 1
    (OUT / "README.md").write_text(README, encoding="utf-8")
    # leere Queue-Vorlagen mitgeben
    (OUT / "social").mkdir(parents=True, exist_ok=True)
    for q in ("telegram_queue.json", "linkedin_queue.json"):
        (OUT / "social" / q).write_text("[]\n", encoding="utf-8")
    print(f"✓ Bausatz exportiert: dist-template/ ({copied} Dateien + README + leere Queues)")
    print("  Hinweis: enthält KEINE Secrets/Inhalte. Vor Verkauf Lizenz + eigene Marke ergänzen.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
