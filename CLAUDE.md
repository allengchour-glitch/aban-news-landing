# CLAUDE.md — Auto-Kontext für dieses Repo

Dieses Repo enthält die Aban-News-Landingpage **und** mehrere KI-Geldverdien-Projekte.
**Vor Arbeit an den Geld-Projekten zuerst `PROJEKT.md` lesen** (vollständiger Memory-Stand).

## Schnellorientierung
- `PROJEKT.md` — Gedächtnis: Projektstände, Domain, To-dos, Strategie-Kurzfassung. **Immer zuerst.**
- `ki-tools-radar/` — Hauptprojekt: automatisierte KI-Tool-Vergleichsseite (programmatic SEO, 11 Sprachen).
  - `generate.py` = der Generator (pure stdlib + optional Pillow). Bauen: `cd ki-tools-radar && python generate.py` → `dist/`.
  - `affiliate.json` = Monetarisierung. `STRATEGIE-2026.md` = Wachstums-/Geld-Strategie.
  - `LAUNCH.md` / `GELD-VERDIENEN.md` = Anleitungen für den User.
- `ki-geld-projekt/MARKTRECHERCHE.md` — Strategische Marktrecherche.
- `aban-studio/` — geparktes SaaS-Konzept (nicht aktiv).

## Arbeitsweise (vom User etabliert)
- Sprache mit dem User: **Deutsch**. Ton: ehrlich, kein Hype (passt zur Aban-Markenstimme — keine
  Wörter wie „revolutionär/disruptiv/game-changer").
- Entwicklung auf Branch `claude/ai-money-project-f25Ub`, PR #2. Nach Änderungen committen + pushen.
- Der User will **autonomes Weiterbauen** („weiter"/„alles"). Bei echten Verzweigungen kurz nachfragen.
- Generator-Änderungen immer testen: `python generate.py` + HTML/JSON-LD-Validierung, dann commit/push.
- Keine erfundenen persönlichen/rechtlichen Daten — Platzhalter `[...]` nutzen, wenn etwas unbekannt ist.

## Wichtige Fakten
- Betreiber: Alleng Chour, abannews.com (Belp/CH). Radar-Domain: `radar.abannews.com`.
- Voice-Linter-CI überspringt die Projekt-Ordner (ki-tools-radar/, aban-studio/, ki-geld-projekt/).
- Modell-Identifier NICHT in Commits/PRs/Artefakte schreiben — nur im Chat.
