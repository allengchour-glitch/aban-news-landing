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

## 🟢 LIVE-STATUS (Stand 2026-05-31)
- **Alle 3 Radars LIVE auf Cloudflare Pages** ✅
  - KI-Tools Radar → `radar.abannews.com` (Projekt `radar`)
  - Förder-Radar → `foerder.abannews.com` (Projekt `foerder`, foerder.pages.dev)
  - KI-Jobs Radar → `jobs.abannews.com` (Projekt `jobs`, jobs-9np.pages.dev, Branch main)
  - Custom Domains aktiviert, CNAMEs automatisch, ggf. kurz "Initializing".
- ✅ **radar baut von `main`** (umgestellt 2026-05-31). Affiliate-Links Systeme.io + ElevenLabs sind LIVE auf radar.abannews.com bestätigt.
- **Aktive Affiliate-Links** (in ki-tools-radar/affiliate.json): Systeme.io (60% recurring), ElevenLabs (20%).
- **Affiliate-Bewerbungen laufen** (manuelle Prüfung, Link kommt per Mail): GetResponse, Murf AI, ggf. Surfer SEO.
  -> Sobald Link da: in affiliate.json eintragen, '_'-Präfix entfernen, rebuild. Tools existieren bereits in tools.json.
- **Social-Secrets:** noch offen — User legt sie selbst bei GitHub an (Settings→Secrets→Actions): DISCORD_WEBHOOK_URL und/oder TELEGRAM_BOT_TOKEN+TELEGRAM_CHAT_ID. Werte holt der User aus Discord (Kanal→Integrationen→Webhooks) bzw. Telegram (@BotFather /mybots). Code-Seite fertig (social/post.py + social-autopost.yml, Mo/Mi/Fr). NIE Werte im Chat annehmen.
- **Besucher-Hebel (NEU, Stand 31.05.):** abannews.com verlinkt jetzt die 3 Radars (Aban-Netzwerk-Block in index.html).
  Fertige Launch-Posts zum Kopieren: `ki-geld-projekt/ERSTE-BESUCHER.md` (LinkedIn/Reddit/WhatsApp).
  EHRLICH: 0 Besucher = 0 Einnahmen; kein Auto-Trick ersetzt Teilen+Zeit. Reihenfolge: posten (ERSTE-BESUCHER.md)
  + Newsletter-Teaser (automation/newsletter-teaser.md) + Geduld mit Google (Wochen).
- **Discord-Webhook:** Nutzer hat ihn 2x im Chat gepostet → muss gelöscht & neu erstellt werden,
  neue URL NUR als GitHub-Secret DISCORD_WEBHOOK_URL. Auto-Posting-Test danach via Actions → Run workflow.
- **Traffic:** nächster großer Hebel — Newsletter-Teaser + LinkedIn (LINKEDIN-CONTENT-PLAN.md).
- WICHTIG bei Anmeldungen: nur den https-Affiliate-LINK annehmen, NIE API-Key/Passwort/Bankdaten.


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

### 4. KI-Kurs-Radar  →  Ordner `kurse-radar/`  (NEU 31.05., launch-fertig)
- **Domain:** kurse.abannews.com — **Cloudflare-Projekt noch anzulegen** (Build `cd kurse-radar && python generate.py`, Output `kurse-radar/dist`).
- **Generator:** `kurse-radar/generate.py` (pure stdlib). Daten: `data/kurse.json` (22 echte Anbieter: DeepLearning.AI, Coursera, DataCamp, openHPI, Google/Microsoft-Zertifikate … — Preise/Score `null` bis redaktionell geprüft, KEINE erfundenen Werte).
- **Seiten:** Startseite/Vergleich, 22 Kurs-Detailseiten, Themen- + Niveau-Seiten, sitemap/robots/RSS. Course-JSON-LD.
- **Monetarisierung:** `kurse-radar/affiliate.json` (alle Slots deaktiviert, `_`-Präfix) — Kursplattform-Affiliate, sobald Links freigegeben.

### 5. Prompt-Bibliothek  →  Ordner `prompts-bibliothek/`  (NEU 31.05.)
- **Domain:** prompts.abannews.com — **CF-Projekt noch anzulegen** (Build `cd prompts-bibliothek && python generate.py`, Output `prompts-bibliothek/dist`).
- **Generator:** `prompts-bibliothek/generate.py` (stdlib). Daten: `data/prompts.json` (50 SELBST geschriebene Prompts, 9 Berufe × 11 Aufgaben). Live-Suche + Copy-Button (Vanilla-JS). HowTo-JSON-LD.
- **Monetarisierung:** Newsletter-Opt-in (kein Affiliate). Später Premium-Pack-PDF denkbar.

### 6. KI-Dienstleister-Verzeichnis  →  Ordner `agenturen-radar/`  (NEU 31.05.)
- **Domain:** agenturen.abannews.com — **CF-Projekt noch anzulegen** (Build `cd agenturen-radar && python generate.py`, Output `agenturen-radar/dist`).
- **Generator:** `agenturen-radar/generate.py` (stdlib, baut auch mit leerer Liste). Daten: `data/agenturen.json` — startet ehrlich LEER (nur 2 als `platzhalter:true` markierte Struktur-Beispiele, KEINE echten Firmen).
- **Monetarisierung:** bezahlte Listings (Basis 0 € vs. Featured, Preis `[Redaktion: festlegen]`). Funnel `eintrag-einreichen.html` + `preise.html`, Kontakt `hallo@abannews.com`.

### 7. Branchen-Hubs  →  8× `ki-fuer-*.html` im Root  (NEU 31.05., sofort live auf abannews.com)
- Handwerker, Steuerberater, Ärzte, Anwälte, Immobilienmakler, Coaches, Onlineshops, Gastronomie.
- Layout aus `geld-verdienen-mit-ki.html`. WebPage + FAQPage-JSON-LD, in `sitemap.xml`. Origineller Inhalt (~800 W.), Newsletter-CTA + Link → radar.abannews.com. Monetarisierung: Newsletter + Tool-Affiliate.

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
- **Branch:** alles nach `main` gemergt (PR #2 erledigt). Cloudflare-Projekte auf `main` stellen. auf allengchour-glitch/aban-news-landing
- CI: Voice-Linter überspringt alle Projekt-/Memory-Ordner (ki-tools-radar/, foerder-radar/, jobs-radar/,
  kurse-radar/, prompts-bibliothek/, agenturen-radar/, aban-studio/, ki-geld-projekt/, PROJEKT.md, CLAUDE.md)
  — gilt nur für Newsletter-Content im Root.
- Jedes Geld-Projekt hat einen eigenen Auto-Build-Workflow in `.github/workflows/`.

## Newsletter-Archiv (NEU, fertig)
`generate_archive.py` baut aus den 28 echten Ausgaben in archive/*.html eine durchsuchbare
`archive.html` + `archive.rss` (Titel/Datum/Teaser aus den Dateien, KEINE erfundenen Daten).
Jede Ausgabe = indexierbare SEO-Seite + Vertrauen für neue Leser. Footer von index.html verlinkt es.
Neu bauen nach neuer Ausgabe: `python generate_archive.py`.

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

## 💶 Monetarisierung Newsletter/Buch — LIVE-Stand (2026-05-31, Session „ebook verkaufen")

**Founding-Member — LIVE & verkauft aktiv:**
- Preis von €149 auf **€69** gesenkt (Early-Bird), site-weit konsistent (außer `archive/`, bewusst).
- Zahlung über **PayPal Payment Link** `https://www.paypal.com/ncp/payment/7GPXCMBCETCUY`
  (in `founding.html` + `en/founding.html`, target=_blank, kein SDK/Embed nötig).
  Alter Hosted-Button `UB35NLZNLRDEY` (€149) + Test-Link `P6P4EECUBNVEJ` sind ersetzt —
  User wollte beide später in PayPal deaktivieren/archivieren (offen, reine Aufräumarbeit).
- Beide Founding-Seiten auf „Maximum" ausgebaut (de+en, identische Struktur): Hero, Benefits,
  „Für wen / für wen nicht", Mittwoch-Einblick, Founder-Story, Geld-Transparenz, Vergleichstabelle,
  FAQ (12 de / 9 en), „So läuft's nach der Zahlung", Honor-Roll, Product- + FAQPage-JSON-LD.
- Rechnungs-Fallback per Mail (hallo@abannews.com) bleibt.
- **PayPal in datenschutz.html** dokumentiert (PayPal Europe, Luxemburg, Art. 6 Abs. 1 lit. b DSGVO)
  + Auftragsverarbeiter-Tabellenzeile. CSP in `_headers` um `*.paypal.com`/`*.paypalobjects.com`
  erweitert (script/frame/connect/form-action).

**Buch/eBook „Anti-Hype" — KDP-tauglich gemacht (alle 4 Sprachen):**
- Inhalt in `generate_ebook.py` (einzige Quelle der Wahrheit) von 6 auf **13 Kapitel** erweitert:
  + „Was KI gut kann / wo sie scheitert", „Wie du mit KI redest" (Prompting),
  „Datenschutz in 5 Minuten", „Klartext-Glossar" — in de/en/fr/it gespiegelt.
- Print-Innenteil jetzt ≥24 Seiten (KDP-Minimum): de 27 / en 26 / fr 27 / it 25.
- Regeneriert: `downloads/anti-hype-ebook*.pdf|.epub`, `anti-hype-print-*.pdf`, Wraparound-Cover.
  Bauen: `python3 generate_ebook.py` + `python3 generate_kdp_print.py de en fr it`
  + `python3 generate_kdp_wrap_cover.py --pages <N>`.
- Pay-what-you-want-CTA am Leseende aller `ebook.html` → `buch.html`.
  Buch-Verkauf läuft über **Lemon Squeezy** (`js/buch-config.js` BUY_URL gesetzt, akzeptiert Karte+PayPal,
  Merchant-of-Record → MwSt automatisch). KDP-`KDP_URL` noch leer (nach Amazon-Launch eintragen).
- Neue Doku: `docs/KDP-VEROEFFENTLICHEN.md` (Schritt-für-Schritt Kindle+Taschenbuch + fertige
  Metadaten/Klappentext pro Sprache) und `docs/NEWSLETTER-GELD.md` (ehrliche Reihenfolge der
  Geldkanäle: eigene Produkte → Affiliate → Sponsoring).

**Sponsoring/Rate-Card:** ehrlicher Hinweis ergänzt (Abrechnung nach verifizierter Listengröße,
fairer Start-Tarif in Aufbauphase). Calendly `abannews/sponsor` aktiv.

**🛠 KDP-Automation (im Repo):** `tools/kdp-cover/` — **Pipeline** `build_book.py`
(ein Aufruf → Vektor-Cover + Innenteil + `metadata.md` + `upload-playbook.md` pro Buch;
Cover-Rücken wird aus der echten Innenteil-Seitenzahl berechnet, Cover/Innenteil passen
automatisch). Bausteine: `kdp_cover.py` (Cover), `planner_interior.py` (Planer-Innenteil).
README hält alle KDP-Lehren fest (Vektor statt Raster, exakte Größe, Rücken-/Papier-Formel,
kein eigener Barcode, Fonts einbetten). Beispiel-Configs ADHD + Mileage. `out/` git-ignored.

**🔑 Codewort „BUCHDRUCK"** (Konvention): Sagt Allen **„BUCHDRUCK"**, dann
`cd tools/kdp-cover && python3 build_book.py --pending` ausführen — baut **nur die
Bücher mit `uploaded: False`** in `BOOKS` (die noch nicht bei KDP hochgeladen sind)
neu und zeigt die Cover-Vorschauen. Sobald ein Buch hochgeladen ist, sein
`"uploaded"` in `build_book.py` auf `True` setzen (dann überspringt es BUCHDRUCK).
Cover-Bild pro Buch: `cover["art"]` mit `mode` image|draw|auto|none + `motif`
rings|burst|dots|arc (Modul `cover_art.py`, mit Selbst-Diagnose/Fallback).
**Echter KDP-Katalog-Status** (alle Titel inkl. Romane/externe Workbooks, mit
ASIN + Live-/Prüf-Status) steht in `tools/kdp-cover/KDP-STATUS.md` — von Hand
gepflegt, da nicht alles aus `build_book.py` kommt.

**Gemergte PRs dieser Session:** #15 (eBook/KDP+PayPal-Founding), #16 (€69+Payment-Link),
#18 (Founding-Seite Maximum de), #19 (en-Parität), #20 (Fix toter #checkout-Anker en).

**Offene To-dos (nur User, braucht PayPal/Amazon-Accounts):**
1. Live-Test `abannews.com/founding.html` → PayPal zeigt €69?
2. Alten PayPal-Button `UB35NLZNLRDEY` + Test-Link `P6P4EECUBNVEJ` in PayPal deaktivieren.
3. Buch auf Amazon KDP veröffentlichen (Dateien+Metadaten liegen fertig in `docs/KDP-VEROEFFENTLICHEN.md`),
   dann `KDP_URL` in `js/buch-config.js` setzen.
4. Inhaltliche Wahrheits-Prüfung der Founding-Benefits (de nennt Discord/Mittwoch-Edition/Office-Hour,
   en nennt Slack/Sunday-deep-dive/Quarterly-calls — vor breiter Bewerbung angleichen auf das, was real existiert).

⚠️ **Session-Warnung:** Gegen Ende lieferte die Umgebung verfälschte File-Reads von `index.html`
(Phantom-„Google Analytics", 1248 statt 308 Zeilen). `index.html` ist in Wahrheit unverändert/sauber
(308 Zeilen, kein gtag, WebSite+Organization-JSON-LD vorhanden). Es wurde NICHTS Fehlerhaftes
committet. Bei künftigem Feinschliff an index.html zur Sicherheit Inhalte per `git show` gegenprüfen.
