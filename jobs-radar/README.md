# KI-Jobs Radar

> Automatisierter DACH-KI-/ML-Jobboard (programmatic, statisch). Holt sich Stellen
> selbst (GitHub Action + freie Arbeitnow-API, kein API-Key), baut sich neu, und
> verdient über **gesponserte Stellen** (Featured Jobs) + Newsletter-Einbettung.

Marktlücken-Begründung: `../ki-geld-projekt/MARKTLUECKEN-2026.md` (Chance #3 — near-passiv,
hedgt Zero-Click-Risiko, monetarisiert die bestehende Audience direkt).

## Wie es läuft (voll automatisch, gratis)
```
Arbeitnow-API → fetch_jobs.py (filtert KI-/ML-Jobs) → jobs.json → generate.py → dist/ → live
        (alles im GitHub-Actions-Workflow, täglich)
```
- **Kein API-Key, kein make.com nötig** — die GitHub Action ruft die offene API direkt ab.
  (make.com ginge auch, ist aber nicht erforderlich.)
- **Robust:** Wenn die API mal nicht antwortet, bleibt die letzte gute `jobs.json` erhalten — der
  Build schlägt nie fehl.

## Ehrlichkeits-Prinzip
Stellen werden aggregiert und **verlinken zur Originalquelle**; keine erfundenen Gehälter/Details.
Jede Seite zeigt Quelle + „ohne Gewähr".

## Geld verdienen
- **Featured Jobs (Sponsoring):** Arbeitgeber/Recruiter zahlen für eine hervorgehobene Stelle ganz oben
  (z. B. €99–299/Monat). Eintragen in `sponsors.json` → `slots._featured` (wird als „Anzeige" gekennzeichnet).
- **Newsletter-Synergie:** die besten Jobs wöchentlich im Aban-News-Newsletter featuren.
- Später: eigene „Job posten"-Funktion (bezahlt), Job-Alert-E-Mails.

## Nutzung
```bash
python fetch_jobs.py    # holt aktuelle KI-Jobs → jobs.json  (optional lokal)
python generate.py      # baut nach ./dist
```

## Struktur
```
jobs-radar/
├── fetch_jobs.py   # holt KI-/ML-Jobs aus Arbeitnow-API → jobs.json (Seed-Fallback)
├── generate.py     # Generator (stdlib): index+filter, /job/<slug>, Recht, sitemap, JobPosting-Schema
├── jobs.json       # aktuelle Jobs (von fetch_jobs.py gepflegt; Seed eingecheckt)
├── sponsors.json   # bezahlte Featured-Job-Slots
└── dist/           # generiert (gitignored)
```

## Vor dem Live-Gang
- Domain: `jobs.abannews.com` (Subdomain) → `BASE_URL` ist gesetzt.
- Cloudflare Pages: Build `cd jobs-radar && python fetch_jobs.py && python generate.py`, Output `jobs-radar/dist`.
- Rechtsseiten gegenlesen.

## Status
🟢 Generator + Auto-Fetch laufen (12 echte KI-Jobs im Seed, JobPosting-Schema für Google Jobs).
🟡 Offen: Sponsoren gewinnen + `sponsors.json`, Domain/Deployment, Newsletter-Einbettung. Quelle erweiterbar
   (Bundesagentur-API / Adzuna zusätzlich).
