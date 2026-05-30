# CLAUDE.md — Auto-Kontext für dieses Repo

Dieses Repo enthält die Aban-News-Landingpage **und** mehrere KI-Geldverdien-Projekte.
**Vor Arbeit an den Geld-Projekten zuerst `PROJEKT.md` lesen** (vollständiger Memory-Stand).

## Schnellorientierung
- `PROJEKT.md` — Gedächtnis: Projektstände, Domain, To-dos, Strategie-Kurzfassung. **Immer zuerst.**
- **Aban News (Newsletter)** = das Stamm-/Mutterprojekt im Repo-Root: Landingpage für den
  deutschsprachigen täglichen KI-Newsletter (abannews.com / .de). Dateien: `index.html`, `founding.html`,
  `sponsoring.html`, `datenschutz.html`, `impressum.html`, `css/styles.css`, Logos `logo-*.svg`,
  `data/tools.json` (143 kuratierte KI-Tools — Datenbasis für ki-tools-radar!), `automation/` (Brand-Voice-
  Validator + Make.com-Blueprints). **Ist der Distributions-Kanal & größte Asset für alle Geld-Projekte.**
- `ki-tools-radar/` — Geld-Projekt 1: automatisierte KI-Tool-Vergleichsseite (programmatic SEO, 11 Sprachen,
  ~8.270 Seiten). Speist sich aus `data/tools.json`. Monetarisierung: Affiliate. Domain: `radar.abannews.com`.
- `foerder-radar/` — Geld-Projekt 2: DACH-Fördermittel-Verzeichnis (Lead-Gen). `foerderungen.json` = Daten
  (29 echte Programme). Domain: `foerder.abannews.com`.
- `jobs-radar/` — Geld-Projekt 3: DACH-KI-Jobboard. `fetch_jobs.py` holt Jobs aus freier Arbeitnow-API
  (kein Key, kein make.com nötig) → `jobs.json`. Monetarisierung: gesponserte Jobs. Domain: `jobs.abannews.com`.
- `ki-geld-projekt/` — Strategie-Memory: `MARKTRECHERCHE.md` + `MARKTLUECKEN-2026.md` (Kapital-Chancen).
- `aban-studio/` — geparktes SaaS-Konzept (nicht aktiv).

Jedes Geld-Projekt: `generate.py` (pure stdlib), eigenes README, baut nach `dist/`, eigener
GitHub-Actions-Auto-Build-Workflow. Alle teilen Aban-Branding (warmes Amber #d97706) + DSGVO-Prinzip
(System-Fonts, kein Tracking, Rechtsseiten).

## Arbeitsweise (vom User etabliert)
- Sprache mit dem User: **Deutsch**. Ton: ehrlich, kein Hype (passt zur Aban-Markenstimme — keine
  Wörter wie „revolutionär/disruptiv/game-changer").
- Entwicklung auf Branch `claude/ai-money-project-f25Ub`, PR #2. Nach Änderungen committen + pushen.
- Der User will **autonomes Weiterbauen** („weiter"/„alles"). Bei echten Verzweigungen kurz nachfragen.
- Generator-Änderungen immer testen: `python generate.py` + HTML/JSON-LD-Validierung, dann commit/push.
- Keine erfundenen persönlichen/rechtlichen Daten — Platzhalter `[...]` nutzen, wenn etwas unbekannt ist.

## Wichtige Fakten
- Betreiber: Alleng Chour, abannews.com (Belp/CH), Kontakt hallo@abannews.com.
  Geld-Projekt-Domains als Subdomains: `radar.` / `foerder.` / `jobs.abannews.com`.
- Geld-Projekte deployen statisch (Cloudflare Pages), gratis. Live-Gang = Aufgabe des Users
  (Accounts/Zahlung); Anleitungen liegen je Projekt im README/LAUNCH.
- Voice-Linter-CI überspringt alle Projekt-/Memory-Ordner+Dateien (ki-tools-radar/, foerder-radar/,
  jobs-radar/, aban-studio/, ki-geld-projekt/, PROJEKT.md, CLAUDE.md) — er gilt nur für Newsletter-Content.
- Newsletter-Inhalte (Aban-News-Ausgaben/Marketing) MÜSSEN die Brand-Voice einhalten (Voice-Linter, kein Hype).
- Modell-Identifier NICHT in Commits/PRs/Artefakte schreiben — nur im Chat.
