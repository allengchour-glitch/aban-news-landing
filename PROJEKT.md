# Projekt-Memory — Geld verdienen mit KI (Aban)

> Dauerhafter Gedächtnis-Speicher für dieses Vorhaben. Überlebt Session-Resets.
> Stand: 2026-05-30 (Newsletter-Werkbank + Social-Autopost integriert) · Betreiber: Alleng Chour (abannews.com, Belp/CH).

## Kontext / Ziel
Solo-Operator mit KI-API-Zugang (LLM-Text, Bild, Audio/Voice) + bestehendem
deutschsprachigem KI-Newsletter (Aban News / abannews.de). Ziel: möglichst
automatisierte, passive Einnahmequellen mit KI — Fokus DACH-Markt.

## Stammprojekt: Aban News (Newsletter) — Repo-Root
Das ursprüngliche & zentrale Projekt: Landingpage für den deutschsprachigen täglichen
KI-Newsletter **abannews.com / .de** (Mo–Fr, kuratiert, „3–5 Min, kein Hype").
- **Dateien (Root):** `index.html` (Hero+Subscribe), `founding.html` (€149 Founding-Member),
  `sponsoring.html` (Werbe-Rate-Card), `willkommen.html`, `datenschutz.html`, `impressum.html`,
  `faq.html`, `about.html`, `brand.html` (Markenstimme), `css/styles.css`, `logo-*.svg`.
- **Daten/Automation:** `data/tools.json` = 176 kuratierte KI-Tools (33 neue mit [Redaktion: prüfen]-Marker) (Bewertung, DACH-Relevanz, DSGVO,
  Pricing) — zugleich Datenbasis des KI-Tools Radar. `automation/` = Brand-Voice-Validator (Flask)
  + Make.com-Blueprints. CI: Voice-Linter (`.github/workflows/voice-linter.yml`).
- **Markenstimme (für ALLE Projekte verbindlich):** ehrlich, praktisch, deutsch, anti-Buzzword
  (keine Wörter wie „revolutionär/disruptiv/game-changer/AI-powered"). Verboten-Phrasen-Liste im Validator.
- **Werkbank (NEU):** `automation/werkbank.py` verbindet Newsletter ↔ Netzwerk: `issue` (Ausgaben-Entwurf aus Radar-Daten), `check` (Brand-Voice-Score), `social` (Posts ableiten). Nur Entwürfe; Versand bleibt menschlich. Doku: `automation/WERKBANK.md`.
- **Rolle:** Distributions-Kanal + größtes Asset. Alle Geld-Projekte teasern über den Newsletter an
  und verlinken zurück (Newsletter-Box). Betreiber/Impressum-Daten: Alleng Chour, Belp/CH, hallo@abannews.com.

## Aktive Geld-Projekte (in diesem Repo)

### 1. KI-Tools Radar  →  Ordner `ki-tools-radar/`  (HAUPTPROJEKT, launch-fertig)
Automatisierte, mehrsprachige KI-Tool-Vergleichsseite (programmatic SEO).
Verdient passiv über Affiliate-Links + leitet Traffic in den Newsletter.
- **Domain (geplant):** `radar.abannews.com` (Subdomain — kostenlos, SEO-Bonus)
- **Umfang:** 176 Tools × 11 Sprachen = ~10.255 Seiten, baut sich selbst (GitHub Actions, wöchentlich + bei Datenänderung)
- **Generator:** `ki-tools-radar/generate.py` (pure stdlib + optional Pillow für OG-Bilder), liest `../data/tools.json` + `lang/*.json` + `content/*.json`
- **Seitentypen:** Start (Suche, Tool des Monats), Tool (Pro/Contra, FAQ, verwandte Tools, OG-Bild), Kategorie, Vergleich (A-vs-B) + Hub, Alternativen-zu-X, Use-Case, Berufs-Stacks (8), DACH-Bestenliste, Trending+RSS, Budget, A–Z, Glossar (30 Begriffe, alle in 11 Sprachen übersetzt), Partner/Transparenz, Impressum, Datenschutz, 404
- **SEO:** JSON-LD (SoftwareApplication/Review/Breadcrumb/FAQ/ItemList/WebSite/Org/DefinedTerm), hreflang, Sitemap-Index + 11 Sprach-Sitemaps, OG/Twitter-Cards, Vergleichstabellen, interne Verlinkung, Live-Suche, Dark Mode, PWA, security.txt/humans.txt
- **Recht:** Impressum + Datenschutz mit echten Daten generiert (DSGVO/Cloudflare), Affiliate-Transparenz (UWG) automatisch
- **Monetarisierung:** `ki-tools-radar/affiliate.json` (23 Programme vorbereitet), Newsletter-Box auf jeder Seite
- **Anleitungen:** `LAUNCH.md` (Live schalten), `GELD-VERDIENEN.md` (Affiliate-Setup)

### 2. Förder-Radar  →  Ordner `foerder-radar/`  (NEU — Chance #2, Fundament steht)
Automatisiertes DACH-Fördermittel-Verzeichnis (programmatic, statisch). Verdient über
**Lead-Gen** (Fördermittel-Berater zahlen pro qualifizierter Anfrage) + Premium-Platzierung.
- **Domain (geplant):** `foerder.abannews.com` (Subdomain)
- **Generator:** `foerder-radar/generate.py` (pure stdlib). Daten: `foerderungen.json` (63 echte, verifizierte Programme,
  KEINE erfundenen Beträge — verlinkt offizielle Quellen, „ohne Gewähr"). Lead-Slots: `leadgen.json`.
- **Seiten:** Index + Live-Filter (Region/Art/Suche), /programm/<id>, /region/<r>, /art/<a>, /fuer/<zielgruppe>, /bereich/<thema>, Impressum, Datenschutz
- **Stand:** 99 Seiten (63 Programme + 10 Zielgruppen- + 13 Themen-Hubs; DE 40 / AT 10 / EU 8 / CH 5), GovernmentService-JSON-LD, Sitemap, AI-Crawler-robots, Dark Mode, Auto-Build-Workflow
- **Offen:** Daten erweitern (foerderdatenbank.de-Export), Berater-Partner + leadgen.json, Domain/Deployment, Newsletter-Teaser

### 3. KI-Jobs Radar  →  Ordner `jobs-radar/`  (NEU — Chance #3, läuft)
Automatisierter DACH-KI-/ML-Jobboard (programmatic, statisch). Verdient über gesponserte
„Featured Jobs" + Newsletter-Einbettung.
- **Domain (geplant):** `jobs.abannews.com` (Subdomain)
- **Datenquelle:** `fetch_jobs.py` holt KI-/ML-Jobs aus der freien **Arbeitnow- + Remotive-API** (kein Key, kein
  make.com nötig) → `jobs.json`. Seed-Fallback wenn API down. GitHub Action ruft API direkt täglich ab.
- **Generator:** `jobs-radar/generate.py` (stdlib). Seiten: Index+Live-Filter (Suche/Remote),
  /job/<slug> mit **JobPosting-JSON-LD (Google for Jobs)**, Impressum, Datenschutz. Sponsoring: `sponsors.json`.
- **Stand:** 12 echte Seed-Jobs, AI-Crawler-robots, Dark Mode, tägl. Auto-Build-Workflow
- **Offen:** Sponsoren + sponsors.json, Domain/Deployment, Newsletter-Einbettung. Quelle erweiterbar (Bundesagentur/Adzuna).

### Portal: Aban-Netzwerk  →  Ordner `portal/`  (verbindet alles)
Statische Hub-Seite, die Newsletter + alle 3 Geld-Projekte bündelt (interne Verlinkung/SEO,
Organization-sameAs-Schema). `portal/generate.py`, Karten in `CARDS`. Deploy-Idee: `abannews.com`-Wurzel
oder `start.abannews.com`. Neue Property = ein Eintrag in CARDS.

### Aban Studio  →  Ordner `aban-studio/`  (GEPARKT — auf Wunsch des Users)
DSGVO-konformes KI-Content-Studio (SaaS-Konzept, W1-Fundament: DB-Schema, Provider-Interface,
AI-Act-Modul). Nicht aktiv weiterentwickelt. Bei Bedarf reaktivierbar.

### Strategie-Memory  →  `ki-geld-projekt/`
`MARKTRECHERCHE.md` (KI-Geldmodelle 2026) + `MARKTLUECKEN-2026.md` (Kapital-Chancen) +
**`MARKETING-PLAYBOOK.md`** (persönlicher, ehrlicher Marketing-/Geld-Leitfaden: Newsletter-Wachstum,
LinkedIn-DACH, GEO, Monetarisierung nach Audience-Größe, realistische Timeline, das 80/20).

## Git / Deployment
- **Branch:** `claude/ai-money-project-f25Ub` · **PR:** #2 (Draft) auf allengchour-glitch/aban-news-landing
- CI: Voice-Linter überspringt alle Projekt-/Memory-Ordner (ki-tools-radar/, foerder-radar/, jobs-radar/,
  aban-studio/, ki-geld-projekt/, PROJEKT.md, CLAUDE.md) — gilt nur für Newsletter-Content im Root.
- Jedes Geld-Projekt hat einen eigenen Auto-Build-Workflow in `.github/workflows/`.

## Lead-Magnet (fertig)
`downloads/generate_lead_magnet.py` → `downloads/top-30-ki-tools-dach-2026.pdf` — „Die 30 besten
KI-Tools für DACH 2026", aus `data/tools.json` (reportlab, Aban-Branding, Newsletter-CTA). Das ist
das LinkedIn-/Profil-Opt-in-Geschenk aus dem MARKETING-PLAYBOOK. Neu bauen: `python downloads/generate_lead_magnet.py`.
Förder-Variante: `foerder-radar/generate_lead_magnet.py` → `foerder-leitfaden-dach-2026.pdf`.
LinkedIn-Content-Plan (2 Wochen, fertige Vorlagen): `ki-geld-projekt/LINKEDIN-CONTENT-PLAN.md`.
LP-Landingpage: `gratis-ki-tools.html` (PDF gegen beehiiv-Anmeldung, Root).
**Master-Startanleitung: `START-HIER.md`** (einziger Einstiegspunkt: was fertig, was der User tun muss).


## Social-Auto-Posting (fertig)
`social/posts.json` (14 fertige Posts) + `social/post.py` (1-Klick an Telegram/Discord) +
`.github/workflows/social-autopost.yml` (Mo/Mi/Fr automatisch). Tokens NUR als GitHub-Secrets
(DISCORD_WEBHOOK_URL / TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID) — nie im Code. Anleitung: social/README.md.

## KI-News-Aggregator (fertig, automatisch)
`automation/news_aggregator.py` sammelt KI-News aus 7 seriösen RSS-Feeds (OpenAI, Google AI, HF,
TechCrunch, VentureBeat, MIT Tech Review, heise). Workflow `news-aggregator.yml` läuft Mo–Fr 05:00 UTC
und committet `automation/news-roh-aktuell.md` (Kuratier-Checkliste, KEINE erfundenen News, Quellen verlinkt).
Newsletter-Workflow: news_aggregator → auswählen+schreiben → werkbank check → beehiiv → werkbank social → Auto-Posting.

## Offene To-dos (nur der User kann das — braucht seine Accounts)
1. Cloudflare Pages mit Repo verbinden + `radar.abannews.com` als Custom Domain (→ LAUNCH.md)
   - Build: `cd ki-tools-radar && pip install -r requirements.txt && python generate.py` · Output: `ki-tools-radar/dist`
2. Bei 2-3 Affiliate-Programmen anmelden → Codes in `affiliate.json` (→ GELD-VERDIENEN.md)
3. Rechtsseiten gegenlesen
4. Im Newsletter anteasern (schnellster erster Traffic)

## Größere Kapital-Chancen / Marktlücken (Details: ki-geld-projekt/MARKTLUECKEN-2026.md)
Top 3 (verstärken sich gegenseitig, alle nutzen vorhandene Assets):
1. **Deutscher GEO-Service + „AI-Sichtbarkeit"-Report-Abo** (Mittelstand) — 5-10 Kunden = €10K/Mo.
2. **Programmatic-Motor → transaktionale/lokale Daten-Directories + Lead-Gen** (Fördermittel-Matcher,
   DACH-Solar/Wärmepumpe) — de-riskt Affiliate-Site gegen AI Overviews, Directory-/Lead-Ökonomie.
3. **Aban News → B2B-Media + auto-backfilled DACH-AI-Jobs-Board** — monetarisiert Audience direkt.
Vermeiden: E-Rechnung (gelöst), High-Risk-AI-Act-Plattformen (Enterprise), KI-Media-Slop.

## Wichtige Strategie-Erkenntnisse 2026 (Details: ki-tools-radar/STRATEGIE-2026.md)
- Zero-Click steigt: „beste X"-Suchen verlieren Klicks an Google AI Overviews → Moat = eigene
  E-Mail-Liste (Newsletter!) + eigene Testdaten, die LLMs nicht wegsynthetisieren können.
- Affiliate-Sites von Core-Updates getroffen → „Information Gain" (eigene Tests, Autor-Bio) entscheidet.
- Recurring-SaaS-Provisionen > Einmal. B2B-Lead-Gen (CPL $30-150) oft lukrativer als CPS.
- GEO/AEO: von ChatGPT/Perplexity zitiert werden (Antwort im 1. Satz unter H2, FAQ-Blöcke).
- DACH/Deutsch als Moat: native Fachsprache, DSGVO, EUR — englische Konkurrenz kann das schwer kopieren.
- Vermeiden: Display-Ads bei wenig Traffic, noch mehr dünne Programmatik-Seiten, generische Newsletter-Box.
