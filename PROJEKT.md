# Projekt-Memory — Geld verdienen mit KI (Aban)

> Dauerhafter Gedächtnis-Speicher für dieses Vorhaben. Überlebt Session-Resets.
> Stand: 2026-05-30 · Betreiber: Alleng Chour (abannews.com, Belp/CH).

## Kontext / Ziel
Solo-Operator mit KI-API-Zugang (LLM-Text, Bild, Audio/Voice) + bestehendem
deutschsprachigem KI-Newsletter (Aban News / abannews.de). Ziel: möglichst
automatisierte, passive Einnahmequellen mit KI — Fokus DACH-Markt.

## Aktive Projekte (in diesem Repo)

### 1. KI-Tools Radar  →  Ordner `ki-tools-radar/`  (HAUPTPROJEKT, launch-fertig)
Automatisierte, mehrsprachige KI-Tool-Vergleichsseite (programmatic SEO).
Verdient passiv über Affiliate-Links + leitet Traffic in den Newsletter.
- **Domain (geplant):** `radar.abannews.com` (Subdomain — kostenlos, SEO-Bonus)
- **Umfang:** 143 Tools × 11 Sprachen = ~8.300 Seiten, baut sich selbst (GitHub Actions, wöchentlich + bei Datenänderung)
- **Generator:** `ki-tools-radar/generate.py` (pure stdlib + optional Pillow für OG-Bilder), liest `../data/tools.json` + `lang/*.json` + `content/*.json`
- **Seitentypen:** Start (Suche, Tool des Monats), Tool (Pro/Contra, FAQ, verwandte Tools, OG-Bild), Kategorie, Vergleich (A-vs-B) + Hub, Alternativen-zu-X, Use-Case, Berufs-Stacks (8), DACH-Bestenliste, Trending+RSS, Budget, A–Z, Glossar (15 Begriffe), Partner/Transparenz, Impressum, Datenschutz, 404
- **SEO:** JSON-LD (SoftwareApplication/Review/Breadcrumb/FAQ/ItemList/WebSite/Org/DefinedTerm), hreflang, Sitemap-Index + 11 Sprach-Sitemaps, OG/Twitter-Cards, Vergleichstabellen, interne Verlinkung, Live-Suche, Dark Mode, PWA, security.txt/humans.txt
- **Recht:** Impressum + Datenschutz mit echten Daten generiert (DSGVO/Cloudflare), Affiliate-Transparenz (UWG) automatisch
- **Monetarisierung:** `ki-tools-radar/affiliate.json` (23 Programme vorbereitet), Newsletter-Box auf jeder Seite
- **Anleitungen:** `LAUNCH.md` (Live schalten), `GELD-VERDIENEN.md` (Affiliate-Setup)

### 2. Aban Studio  →  Ordner `aban-studio/`  (GEPARKT — auf Wunsch des Users)
DSGVO-konformes KI-Content-Studio (SaaS-Konzept, W1-Fundament: DB-Schema, Provider-Interface,
AI-Act-Modul). Nicht aktiv weiterentwickelt. Bei Bedarf reaktivierbar.

### 3. Marktrecherche  →  `ki-geld-projekt/MARKTRECHERCHE.md`
Gegengeprüfte 5-Strang-Recherche zu KI-Geldmodellen 2026 (Basis aller Entscheidungen).

## Git / Deployment
- **Branch:** `claude/ai-money-project-f25Ub` · **PR:** #2 (Draft) auf allengchour-glitch/aban-news-landing
- CI: Voice-Linter überspringt die Projekt-Ordner (ki-tools-radar/, aban-studio/, ki-geld-projekt/)

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
