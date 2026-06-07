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

Ohne Keys passiert nichts (no-op) — gefahrloses Ausprobieren.

## Inhalt
- `automation/` — Content-Engine, Bild-Pipeline, Ausgaben-Builder, Autopilot, Poster
- `.github/workflows/` — fertige Cron-Workflows (Branch = main)
- `tools/` — Brand-Voice-Linter, Status, Konsistenz-Check
- `.env.example` — alle Variablen-Namen (echte Werte gehören in GitHub-Secrets, NIE in den Code)
- `social/` — leere Queue-Vorlagen

## Lizenz
Single-Seat-Lizenz (`LICENSE.txt`): du darfst den Bausatz für **deine eigenen** Newsletter/
Projekte nutzen und anpassen — aber den Bausatz selbst **nicht weiterverkaufen** oder als
Konkurrenz-Boilerplate vertreiben. Details in `LICENSE.txt`.
"""

LICENSE_TEXT = """Newsletter-Autopilot — Single-Seat-Lizenz
Copyright (c) Aban Chour / abannews.com

Mit dem Kauf erhältst du das Recht, diesen Bausatz (Code + Workflows) für eine
unbegrenzte Zahl EIGENER Newsletter/Projekte zu nutzen, zu verändern und zu betreiben —
kommerziell und privat.

NICHT erlaubt ist:
- den Bausatz (ganz oder in wesentlichen Teilen) als eigenes Produkt, Boilerplate oder
  Vorlage weiterzuverkaufen, weiterzugeben oder öffentlich zu veröffentlichen;
- die Lizenz an Dritte weiterzugeben.

Der Bausatz wird „wie besehen" geliefert, ohne Gewähr. Keine Haftung für Schäden,
API-Kosten oder Datenverlust. Du bist für deine API-Keys und deren Kosten selbst verantwortlich.
"""

ENV_EXAMPLE = """# Echte Werte gehören in GitHub-Secrets/Repository-Variablen — NIE in dieses File committen.
# Text (eines davon):
GEMINI_API_KEY=
# oder Vertex AI (Service-Account-JSON als ein String):
GCP_SA_KEY=
GCP_PROJECT=
GCP_LOCATION=us-central1
# Bilder (optional):
PEXELS_API_KEY=
# Poster (optional):
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL=
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_AUTHOR_URN=
"""

LISTING = """# Newsletter-Autopilot — Listing (Verkaufstext-Entwurf)

**Was es ist:** ein no-op-sicherer Automations-Stack, der einen Indie-Newsletter weitgehend
selbst betreibt — Content-Entwürfe, bild-reiche Ausgaben, Social-Posts — komplett über GitHub
Actions (keine Server, keine monatliche Plattform-Gebühr).

**Für wen:** Solo-Creator und kleine Teams, die einen Newsletter ohne teuren Tool-Stack
automatisieren wollen und mit Git/GitHub umgehen können.

**Drin:**
- Content-Engine mit Brand-Voice-Gate (gegen Hype/Floskeln)
- Bild-Pipeline: echte Fotos (Pexels) + KI-Bilder (Imagen) + Marken-Karte als Fallback
- Bild-reicher Ausgaben-Builder, Telegram-/LinkedIn-Autopost, täglicher Autopilot
- Fertige Cron-Workflows, `.env.example`, Setup-Anleitung

**Ehrlich:** Der Bausatz macht die Arbeit — nicht die Nachfrage. Inhalte, Keys und das
Gewinnen von Abonnenten bleiben bei dir. Ohne API-Keys passiert nichts (gefahrloses Testen).

**Lizenz:** Single-Seat (eigene Nutzung ja, Weiterverkauf nein).
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
    (OUT / "LICENSE.txt").write_text(LICENSE_TEXT, encoding="utf-8")
    (OUT / ".env.example").write_text(ENV_EXAMPLE, encoding="utf-8")
    (OUT / "LISTING.md").write_text(LISTING, encoding="utf-8")
    # leere Queue-Vorlagen mitgeben
    (OUT / "social").mkdir(parents=True, exist_ok=True)
    for q in ("telegram_queue.json", "linkedin_queue.json"):
        (OUT / "social" / q).write_text("[]\n", encoding="utf-8")
    print(f"✓ Bausatz exportiert: dist-template/ ({copied} Dateien + README + LICENSE + .env.example + LISTING + leere Queues)")
    print("  Hinweis: enthält KEINE Secrets/Inhalte. Vor Verkauf nur noch eigene Marke/Preis im LISTING ergänzen.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
