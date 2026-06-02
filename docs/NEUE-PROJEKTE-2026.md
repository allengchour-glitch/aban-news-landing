# Neue Projekte 2026 — Bauplan (alle drei greenlit: 1+2+3)

> Grounded in `ki-geld-projekt/MARKTLUECKEN-2026.md` + dem bewährten Geld-Projekt-
> Muster (`generate.py` stdlib + `*.json` Daten + `dist/`, Cloudflare Pages).
> **Strategischer Kern:** weg von AIO-anfälligen Info-/Affiliate-Seiten → hin zu
> **transaktionalen, lokalen, daten-getriebenen Directories mit Lead-Gen.**
>
> **Reihenfolge-Empfehlung:** 1 → 2 → 3. #1 und #2 erweitern Bestehendes (schnell),
> #3 braucht harte Datenbeschaffung (zuletzt).

---

## 1. Fördermittel-Matcher  (Upgrade `foerder-radar/`)

**Was schon da ist:** `foerderungen.json` (86 Programme), `leadgen.json`,
`generate.py` (650 Z.), `generate_lead_magnet.py`, Domain `foerder.abannews.com`.
**Upgrade:** Von der Info-Liste zum **transaktionalen Matcher** mit Berater-Lead-Gen.

- **MVP:**
  1. Interaktiver Filter (Bundesland · Unternehmensgröße · Thema KI/Digitalisierung)
     → passende Programme sofort (statisches JS, Muster wie `hype-filter.html`).
  2. Pro Programm **„Beratung anfragen"**-Lead-Formular (Cloudflare Function +
     mailto-Fallback), Routing über erweitertes `leadgen.json` (Berater-Partner).
  3. Seiten-Typen: `/matcher` (Tool) · `/foerderung/<slug>` · `/bundesland/<x>` ·
     `/thema/<x>`.
- **Monetarisierung:** Pay-per-Lead an Förder-Berater + Premium-Placement.
- **Moat:** lokal/transaktional → AIO-fest; Regulierungs-Rückenwind (€5B+ KI-Förderung).
- **Build:** `cd foerder-radar && python generate.py` → `dist`.
- **Aufwand:** niedrig-mittel (Daten + Generator stehen, neu = Matcher-UI + Lead-Flow).

---

## 2. Jobs-Board auto-backfill  (Ausbau `jobs-radar/`)

**Was schon da ist:** `fetch_jobs.py` (Arbeitnow + Remotive, 145 Z.), `jobs.json`,
`sponsors.json`, `generate.py` (355 Z.), Domain `jobs.abannews.com`.
**Upgrade:** near-passives, selbst-auffüllendes Board + Audience-Monetarisierung.

- **MVP:**
  1. **Auto-Backfill:** Workflow `jobs-backfill.yml` ruft `fetch_jobs.py` z. B. alle
     6 h (statt manuell), committet `jobs.json`, baut neu.
  2. **Newsletter-Einbettung:** Generator gibt einen „Top-5-KI-Jobs"-HTML-Block aus,
     der in die tägliche Ausgabe kann.
  3. **Premium-Listings:** Feld `premium:true` in `jobs.json` → oben, hervorgehoben;
     `sponsors.json` für bezahlte Platzierungen.
- **Monetarisierung:** Premium-Job-Listings + Newsletter-Sponsoring (B2B-CPM).
- **Moat:** eigene Distribution (Newsletter) — AIO kann sie nicht anfassen.
- **Build:** `cd jobs-radar && python generate.py` → `dist`.
- **Aufwand:** am niedrigsten (alles vorhanden, nur Cron + Embed + Premium-Feld).

---

## 3. Wärmepumpe/Solar Lead-Gen  (NEU `handwerk-radar/`)

**Neu** nach dem Muster von `dropshipping-radar/` (stdlib-`generate.py` +
`data/anbieter.json` → `dist`).

- **MVP:**
  1. Lokales **Installateur-Verzeichnis**, Stadt-Seiten
     (`/<stadt>/waermepumpe-installateur`), filter-/sortierbar.
  2. **„Angebot anfragen"**-Lead-Formular pro Stadt/Anbieter.
  3. Seiten-Typen: Stadt · Anbieter-Detail · Vergleich · FAQ · Kosten-Guide.
- **Monetarisierung:** Pay-per-Lead (zig € je Lead bei €11-29K-Projekten) + Premium-Placement.
- **⚠️ Realismus:** höchster €/Lead, **aber** Anbieterdaten sind hart (Handwerks-
  kammer-Verzeichnisse, manuell starten — ehrlich leer wie `agenturen-radar`), und
  am weitesten von der KI-Marke. **Deshalb zuletzt** und nur, wenn die Datenquelle steht.
- **Build:** `cd handwerk-radar && python generate.py` → `dist`.
- **Aufwand:** mittel-hoch (neuer Generator + Datenbeschaffung).

---

## Gemeinsames (alle drei)

- **Kein Build-Step-Framework:** Python-stdlib-`generate.py`, Output `dist/`,
  Cloudflare Pages erkennt es. Eigener Auto-Build-Workflow je Projekt.
- **Ehrlichkeit:** Daten echt oder klar als Platzhalter markiert (`[Redaktion: prüfen]`),
  keine erfundenen Anbieter/Zahlen (wie agenturen-/dropshipping-radar).
- **Anti-Hype-Ton**, du-Form, DSGVO (kein Tracking), Newsletter-CTA als Quer-Monetarisierung.
- **Lead-Formulare:** Cloudflare Pages Function (Muster: `functions/api/hype-check.js`)
  + mailto-Fallback; **nie** Secrets im Repo.

## Nächste PRs (sequenziell, je eigener Branch)

1. `claude/foerder-matcher` — Matcher-UI + Lead-Flow auf foerder-radar.
2. `claude/jobs-backfill` — Cron-Workflow + Newsletter-Embed + Premium-Feld.
3. `claude/handwerk-radar` — neues Verzeichnis-Skelett (ehrlich leer).
