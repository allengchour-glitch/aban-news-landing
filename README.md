# Aban — KI-Newsletter & Netzwerk (DACH)

> Deutschsprachiges KI-Netzwerk: ein täglicher Newsletter plus drei automatisierte,
> statische Web-Properties. Ehrlich, kein Hype, DSGVO-konform.
> **Start hier:** [`START-HIER.md`](START-HIER.md) · **Gedächtnis:** [`PROJEKT.md`](PROJEKT.md)

## Properties

| Property | Was | Ordner | Domain (geplant) |
|---|---|---|---|
| 📬 **Aban News** | Täglicher KI-Newsletter (beehiiv) + Landingpage | Repo-Root | abannews.com / .de |
| 📡 **KI-Tools Radar** | 143 KI-Tools, 11 Sprachen, ~8.400 Seiten, Affiliate | `ki-tools-radar/` | radar.abannews.com |
| 🧭 **Förder-Radar** | DACH-Fördermittel-Verzeichnis, Lead-Gen | `foerder-radar/` | foerder.abannews.com |
| 🤖 **KI-Jobs Radar** | DACH-KI-Jobboard (Auto-Fetch), Sponsoring | `jobs-radar/` | jobs.abannews.com |
| 📡 **Portal** | Hub, verbindet alle vier | `portal/` | abannews.com |

## Tech

- **Generatoren:** pure Python (stdlib), bauen statisches HTML nach `dist/`. Kein Build-Tool nötig.
- **Daten:** `data/tools.json` (143 Tools), `foerder-radar/foerderungen.json`, `jobs-radar/jobs.json`.
- **Hosting:** Cloudflare Pages (gratis, statisch). DSGVO-safe: System-Fonts, kein Tracking, Rechtsseiten.
- **Automatik:** GitHub Actions bauen jedes Projekt automatisch; Social-Auto-Posting Mo/Mi/Fr.
- **SEO/GEO:** JSON-LD (mehrere Typen), hreflang, Sitemaps, RSS, OG-Bilder, AI-Crawler erlaubt.

## Schnellstart (lokal)

```bash
cd ki-tools-radar && python generate.py    # → dist/
cd ../foerder-radar && python generate.py
cd ../jobs-radar && python fetch_jobs.py && python generate.py
cd ../portal && python generate.py
```

## Marketing & Geld
- `ki-geld-projekt/MARKETING-PLAYBOOK.md` — Wachstum & Monetarisierung (ehrlich).
- `ki-geld-projekt/LINKEDIN-CONTENT-PLAN.md` — 2-Wochen-Vorlagen.
- `ki-geld-projekt/MARKTLUECKEN-2026.md` — größere Kapital-Chancen.
- `ki-geld-projekt/VERMOEGEN-SCHWEIZ.md` — persönlicher Vermögensaufbau (Bildung, keine Beratung).
- `downloads/` & `foerder-radar/` — Lead-Magnet-PDFs.

## Prinzipien
Ehrliche Markenstimme (Anti-Buzzword-Regeln per Voice-Linter durchgesetzt), keine erfundenen Fakten
(Förder-/Job-Daten verlinken offizielle Quellen, „ohne Gewähr"), DSGVO-first.

*Frühere Landing-Doku: siehe Git-Historie. Dieses README beschreibt das Gesamt-Netzwerk.*
