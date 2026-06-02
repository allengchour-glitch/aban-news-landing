# CLAUDE.md — Projekt-Gedächtnis für `aban-news-landing`

> Wird von Claude Code automatisch geladen und hält den Kontext fest, damit jede
> Session sofort weiß, worum es geht — ohne das ganze Repo neu zu lesen.

## Was ist das?

Statische Marketing-Website für **aban news** — einen täglichen, deutschsprachigen
KI-Newsletter für DACH-Profis ("Mo–Fr, 5 Minuten, kein Hype"). Kein Build-Step,
kein Framework: reines HTML + Inline-CSS, deployt auf **Cloudflare Pages**.

- **Domain:** `abannews.com` (neuere Dateien). Ältere Texte referenzieren teils
  `abannews.de` — bei Neuanlage **immer `.com`** verwenden.
- **Betreiber:** Allen Chour ("Aban"), Belp (CH).
- **Newsletter-Backend:** beehiiv (`https://abannews.beehiiv.com/subscribe`).

## Architektur / Konventionen

- **Eine Seite = eine `.html`-Datei** im Root. Sprach-Varianten in `en/`, `fr/`, `it/`.
- **CSS ist inline** im `<head>` jeder Subpage bzw. in `css/styles.css` (Hauptlanding).
  Kein externes Framework, **kein Google Fonts** (DSGVO: System-Font-Stack
  `-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,…`).
- **Kein Tracking, keine 3rd-Party-Requests** außer Subscribe-POST (beehiiv) und
  ggf. Stripe-Redirect. JS nur inline, minimal, vanilla.
- **Brand-Farben** (Hex, siehe `:root` in `index.html` / `css/styles.css`):
  Amber `d97706`, Amber-dunkel `b45309`, Amber-hell `fde9c8`, Cream `fef3c7`,
  Ink `1f2937`/`1c2530`, Background `fffbf5`/`fffaf2`.
  **Gefüllte Buttons nutzen `b45309`** (weiß darauf = 5.02:1, WCAG AA); `d97706`
  ist reine Akzentfarbe (Links/Rahmen/Headings), weil weiß darauf nur 3.19:1 ergibt.
- **Subpage-Layout-Muster:** siehe `geld-verdienen-mit-ki.html` (max-width 760px,
  sticky Header mit `.brand` + `.btn`, Footer mit Impressum/Datenschutz-Links).
- **a11y/SEO Pflicht:** `<link rel="canonical">`, OG-Tags, JSON-LD (`schema.org`),
  `lang="de"`, hreflang bei mehrsprachigen Seiten.

## Aban-Voice (wichtig!)

Pragmatisch, direkt, anti-hype. Hype-Floskeln und Buzzwords sind tabu. Die
**kanonische Sperrliste** (als Regex) steht in
`automation/brand-voice-validator-api.py` (Variable `FORBIDDEN`) — eine Quelle der
Wahrheit, hier bewusst nicht dupliziert. Der CI-Workflow `voice-linter` erzwingt
sie auf allen geänderten Content-`*.md`-Dateien (`--strict`, generic-Channel: max
5000 Zeichen, max 3 `#`-Tags, durchgehend die du-Form). Infrastruktur-/Doku-
Markdown (`CLAUDE.md`, `docs/**`, `README.md`) ist bewusst ausgenommen — dort
gelten Newsletter-Längen-/Format-Regeln nicht.

Vor dem Commit lokal prüfen:
```bash
python3 tools/brand-voice-linter.py DATEI.md --strict   # Exit 0 = sauber
```

HTML-Seiten folgen demselben Ton: keine Hype-Wörter, keine Mehrfach-Ausrufezeichen,
durchgehend die du-Form.

## Lead-Magnets / PDFs

- `downloads/*.pdf` werden mit **reportlab** generiert (`pip install reportlab`).
- `generate_pdfs.py` → 5 Lead-Magnet-PDFs (Prompts, Glossar, Checkliste, Tool-Stack,
  Cold-Email). Helfer: `make_styles()`, `cover_page()`, `new_doc()`, `footer_canvas()`.
- `generate_ebook.py` → `downloads/anti-hype-ebook.pdf` (das "Anti-Hype"-eBook,
  beworben auf `ebook.html` und in `roadmap.html`). Enthält **3 Marken-Diagramme**
  (`ebook_diagrams.py`, Pillow — selbst gezeichnet, kein Stock) + ein **Quellen-Kapitel**
  (echte Primärquellen: EUR-Lex DSGVO/AI Act, Datenschutzbehörden). Beides wird zur
  Build-Zeit via `_augment()` eingespielt — CONTENT-Dict bleibt unberührt. `render_blocks`
  kennt Block-Typen `img`/`src`. `generate_kdp_print.py` nutzt dasselbe `_augment` (Diagramme
  auch im Taschenbuch, auf 5×8" skaliert). Diagramm-Vorschau auf `buch.html` („Blick ins Buch").
- `generate_launch_manual_pdf.py` → `downloads/launch-manual.pdf`.
- `generate_kurs.py` → `downloads/ki-werkstatt-kurs.pdf` (das Kurs-Produkt von `kurs.html`,
  6 Module ausgeschrieben). Ausgeliefert über `kurs-zugang.html` (noindex Lieferseite).
- Regenerieren: `python3 generate_ebook.py` (idempotent, schreibt nach `downloads/`).

## Lese-Memory (Buch-Seiten)

- `js/buch-memory.js` = wiederverwendbare, buch-bewusste Memory (Download-Status,
  „zuletzt angesehen", geöffnete Abschnitte). Konfiguration über `data-*`-Attribute
  im Markup, **eigener `data-memory-key` pro Buch** (`aban_buch_v1`,
  `aban_trilogie_v1`), nur `localStorage`, kein Tracking. Genutzt von `buch.html`
  (+ `en/ fr/ it/`) und `trilogie.html`. `ebook.html` hat seine eigene Inline-Memory
  (`aban_ebook_v1`) — bewusst getrennt.

## KI-Schriftsteller (`ki-schriftsteller/`)

- Python-Generator, der Romane Kapitel für Kapitel mit `claude-opus-4-8` schreibt
  (Plot-Bibel als gecachter System-Präfix). Einzelbuch **oder** Trilogie (`baende`).
- Trilogie-Beispiel: `roman-drama-trilogie.json` → `trilogie.html`. Shared Helfer:
  `roman_util.py`. Output (Kapitel + `ausgabe/`) ist **git-ignored**, braucht
  `ANTHROPIC_API_KEY`. Details: `ki-schriftsteller/README.md`.

## Seiten-Inventar (Auswahl)

| Datei | Zweck |
|-------|-------|
| `index.html` | Haupt-Landing (Hero + Sample-Switcher + Subscribe) |
| `ebook.html` | eBook-Lead-Magnet (Email-Capture + Founding-Upsell + Lese-Memory, inline) |
| `buch.html` | Anti-Hype als Buch (PWYW, PDF/ePub) + Lese-Memory via `js/buch-memory.js` |
| `trilogie.html` | Drama-Trilogie „Das Tal hält den Atem an" (KI-Schriftsteller-Experiment) + Memory |
| `geld-verdienen-mit-ki.html` | SEO-Money-Page (Layout-Referenz für Subpages) |
| `ki-tools-fuer-selbststaendige.html` | SEO-Money-Page „KI-Tools für Selbstständige" |
| `chatgpt-fuer-solopreneure.html` | SEO-Money-Page „ChatGPT für Solopreneure" |
| `ki-dsgvo-konform.html` | SEO-Cornerstone „KI DSGVO-konform nutzen" (5-Fragen-Check, echte Quellen). **4-sprachig** (de + `en/ fr/ it/`), reziprokes hreflang |
| `chatgpt-vs-claude.html` | SEO-Cornerstone ehrlicher Tool-Vergleich (Tabelle, „welches Tool für welche Aufgabe", kein Affiliate). DE-only |
| `founding.html` | €149 Founding-Member-Angebot |
| `sponsoring.html` / `werbung.html` | Werbe-Rate-Card / Policy |
| `resources.html` | Gratis-Resourcen + PDF-Downloads |
| `willkommen.html` | Post-Subscribe (eBook-Geschenk) |
| `hype-filter.html` | Interaktives Tool: Marketing-Text auf Hype prüfen (siehe unten) |
| `anti-hype-texten.html` | SEO-Cornerstone-Ratgeber zum Tool (Vorher/Nachher, FAQ) |
| `hype-widget-demo.html` | `noindex` — Doku/Demo fürs einbettbare Widget |
| `impressum.html` / `datenschutz.html` | CH-Impressum / DSGVO |

## Hype-Filter (interaktives Tool)

Das einzige Feature mit serverseitiger Logik. Bricht bewusst mit „nur statisches HTML":
- **Engine** `functions/_engine.mjs` — reine, deterministische JS-Analyse deutschen
  Texts (Buzzwords/Sperrliste, übertriebene Versprechen, Füllwörter, Passiv, Vage-
  Phrasen, Nominalstil, Wiener Sachtextformel). Keine Abhängigkeiten, ReDoS-fest.
- **API** `functions/api/hype-check.js` — Cloudflare Pages Function (Edge). Single +
  Bulk. Optionale KI-Umschreibung nur bei gesetztem `ANTHROPIC_API_KEY` (sonst
  übersprungen, kein Hard-Fail). Rate-Limit + Input-Caps, escaped Output.
- **Frontend** `hype-filter.html` — Vanilla-JS-UI mit Dark-Mode, Copy/Share,
  localStorage, ARIA. **Buttons site-weit auf `#b45309`** (WCAG AA, weiß = 5.02:1;
  `--amber #d97706` bleibt reine Akzentfarbe).
- **Widget** `js/hype-filter-widget.js` — Shadow-DOM-Einbettung (ein `<script>`-Tag),
  style-isoliert, XSS-sicher. Demo/Doku: `hype-widget-demo.html`.
- **Tests** `functions/_engine.test.mjs` (84) + `functions/_api.test.mjs` (40), Node,
  ohne Framework: `node functions/_engine.test.mjs`. CI-Workflow grünt sie.
- **Detail-Doku:** `functions/README.md` (Entwickler) und `PROJEKT.md`.

> Pages Functions brauchen **keinen** Build-Step — Cloudflare erkennt `functions/`
> automatisch. Die Node-Tests laufen nur lokal/CI, nicht im Deploy.

## Neue Seite anlegen

1. Layout aus `geld-verdienen-mit-ki.html` kopieren (Header/Footer/Style-Token).
2. `<link rel="canonical">`, OG-Tags, JSON-LD setzen, `abannews.com`.
3. Eintrag in `sitemap.xml` ergänzen, optional Pretty-URL in `_redirects`.
4. Falls relevant: Nav-Link in `index.html` (`.hnav`) + Footer-Link.
5. Voice-Check laufen lassen (siehe oben).

## Monetarisierung aktivieren (3 Schalter, kostenlos zum Start)

1. **Newsletter (aktiv):** alle Subscribe-Buttons → `abannews.beehiiv.com/subscribe`.
2. **Stripe (Founding €149):** in `founding.html`, `<script>` oben,
   `STRIPE_FOUNDING_LINK` setzen. Leer → Mail-Fallback.
3. **Calendly (Sponsoring):** in `sponsoring.html`, `<script>` am Ende,
   `CALENDLY_URL` setzen. Leer → Mail-Fallback.
4. **TWINT / Shopify / Karte (Founding, optional):** in `js/pay-config.js`
   `TWINT_URL`, `SHOPIFY_URL` und/oder `CARD_URL` setzen (nur öffentliche
   Bezahl-Links, **nie** Secrets/Kartennummern). Pro gesetztem Link erscheint
   ein zusätzlicher Button im Founding-Checkout (de + `en/`); leer → Button
   bleibt verborgen (kein toter Link). PayPal bleibt der Haupt-Button.

**Funnel:** SEO-Money-Pages + `resources.html` → Newsletter-Opt-in →
`willkommen.html` (eBook-Geschenk) → `founding.html` / `sponsoring.html`.
Social-Image fürs eBook: `og-ebook.png` (Pillow, 1200×630).

## Git / Deployment

- Branch-Konvention: `claude/...` Feature-Branches, **nie** direkt nach `main`.
- Cloudflare Pages: kein Build-Command, Output = Repo-Root. `_redirects` + `_headers`
  werden automatisch erkannt. Jeder Push auf `main` triggert Auto-Deploy.

## Geld-Projekte (Aban-Netzwerk) — zusätzlich zum Newsletter
Dieses Repo enthält neben der Newsletter-Site mehrere automatisierte KI-Geld-Projekte.
**Voller Stand in `PROJEKT.md`** (immer zuerst lesen). Kurz:
- `ki-tools-radar/` — KI-Tool-Vergleich (177 Tools, 11 Sprachen, ~10.351 Seiten). LIVE auf radar.abannews.com. Affiliate. 56 Tool-Seiten verlinken zurück aufs Newsletter-Archiv.
- `foerder-radar/` — DACH-Fördermittel (86 echte Programme). Lead-Gen. Domain foerder.abannews.com.
- `jobs-radar/` — DACH-KI-Jobboard (fetch_jobs.py: Arbeitnow+Remotive). Domain jobs.abannews.com.
- `kurse-radar/` — KI-Kurs-/Zertifikat-Vergleich (22 echte Anbieter, Preise/Score `null` bis geprüft). Affiliate (deaktiviert). Domain kurse.abannews.com. **Cloudflare-Projekt noch anzulegen.**
- `prompts-bibliothek/` — 73 selbst geschriebene deutsche Prompts (9 Berufe, 11 Aufgaben), Live-Suche + Copy-Button. Newsletter-Opt-in. Domain prompts.abannews.com. **CF-Projekt noch anzulegen.**
- `agenturen-radar/` — KI-Dienstleister-Verzeichnis DACH (startet ehrlich leer, nur markierte Platzhalter). Bezahlte Listings. Domain agenturen.abannews.com. **CF-Projekt noch anzulegen.**
- `dropshipping-radar/` — Dropshipping-/Print-on-Demand-Anbieter-Vergleich DACH (22 echte Anbieter, `data/anbieter.json`). DACH-Filter `eu_lager`/`deutsche_oberflaeche`, Affiliate (deaktiviert, `_`-Präfix). Domain dropshipping.abannews.com. **CF-Projekt noch anzulegen.** Build `cd dropshipping-radar && python generate.py`, Output `dropshipping-radar/dist`.
- `newsletter-radar/` — KI-Newsletter-/E-Mail-Marketing-Tools (21 echte Anbieter). Schema/Generator wie dropshipping (`data/anbieter.json`, Preise/Scores `null` bis geprüft, keine Offer/Review-JSON-LD). Affiliate `_`-deaktiviert. Domain newsletter.abannews.com. **CF-Projekt noch anzulegen.** Build `cd newsletter-radar && python generate.py`.
- `buchhaltung-radar/` — KI-Buchhaltungs-/Rechnungs-Tools (22 echte Anbieter, DACH-Schwerpunkt: lexoffice, sevDesk, DATEV …). Gleiches Muster. Domain buchhaltung.abannews.com. **CF-Projekt noch anzulegen.** Build `cd buchhaltung-radar && python generate.py`.
- `chatbot-radar/` — KI-Kundenservice-/Chatbot-Tools (24 echte Anbieter, DACH: Cognigy, Parloa, moin.ai, Userlike …). Gleiches Muster. Domain chatbot.abannews.com. **CF-Projekt noch anzulegen.** Build `cd chatbot-radar && python generate.py`.
- `voice-radar/` — KI-Voice-/Transkriptions-Tools (22 echte Anbieter: Amberscript, Speechmatics, aTrain …). Gleiches Muster. Domain voice.abannews.com. **CF-Projekt noch anzulegen.** Build `cd voice-radar && python generate.py`.
- `video-radar/` — KI-Video-Tools (22 echte Anbieter: Runway, Pika, Luma, Kling, Sora, Veo, Synthesia, HeyGen, Descript, CapCut, OpusClip, VEED, Submagic, Adobe Firefly, Topaz, Elai …). Kategorien: Text→Video, KI-Avatare/Sprecher, Schnitt & Repurposing, Untertitel & Übersetzung, Bild→Video. Generator von voice-radar kopiert + angepasst, gleiches Muster. **Nische stark US-lastig** — `eu_lager` meist false/null, EU-nähere (Submagic/FR, Elai/EE, Synthesia·VEED/UK) sortieren vorn; CapCut/Kling (ByteDance/Kuaishou) mit Drittland-Warnung im `aban_note`. Affiliate `_`-deaktiviert. Domain video.abannews.com. **CF-Projekt noch anzulegen.** Build `cd video-radar && python generate.py`.
- `musik-radar/` — KI-Musik-Tools (18 echte Anbieter: Suno, Udio, ElevenLabs Music, Stable Audio, Soundraw, Mubert, AIVA, Loudly, Soundful, Beatoven.ai, Boomy, Meta MusicGen, Riffusion, Google MusicFX, LANDR, Moises, LALAL.AI, Endel). Kategorien: Song-Generierung, Instrumental & Royalty-Free, Stems & Mastering, Open Source, Funktionsmusik. Generator von voice-radar kopiert + angepasst, gleiches Muster. **Nische US-lastig + rechtslastig** — jeder Eintrag trägt einen Lizenz-Caveat im `aban_note` (kommerzielle Nutzung/Rechte tariff-abhängig, AGB prüfen); EU-nähere (AIVA/Luxemburg, Loudly/Berlin) sortieren vorn; MusicGen/Riffusion selbst-hostbar. Affiliate `_`-deaktiviert. Domain musik.abannews.com. **CF-Projekt noch anzulegen.** Build `cd musik-radar && python generate.py`.
- `automatisierung-radar/` — KI- & Workflow-Automatisierungs-Tools (36 echte Anbieter: n8n, Make, Zapier, Power Automate, Locoia, Camunda, BRYTER, SeaTable, UiPath, Konfuzio …). DACH-Schwerpunkt mit EU-Hosting-Filter (`eu_lager` = EU-Hosting, `deutsche_oberflaeche` = deutsche Oberfläche). Generator von voice-radar kopiert + angepasst, gleiches Muster. Affiliate `_`-deaktiviert. Domain automatisierung.abannews.com. **CF-Projekt noch anzulegen.** Build `cd automatisierung-radar && python generate.py`. **Selbst-wachsend (371 Seiten):** interaktive Filter (EU-Toggle), Entscheidungshilfe, Feld `preismodell`, SEO-Ratgeber `/automatisierungs-tools-auswaehlen.html`, **automatische Vergleichsseiten** `vergleich/<a>-vs-<b>.html` (jedes Paar mit gemeinsamer Kategorie), **Anwendungsfall-Seiten** `/fuer/<slug>` (`USE_CASES`), **wöchentlicher Cron-Build** + **`suggest_tools.py`** (schlägt echte neue Tools zum Prüfen vor → `data/_vorschlaege.json`, alle wertenden Felder `null` bis Mensch verifiziert; eigener Workflow). Wachstum bleibt datengetrieben — nie erfundene Preise/Tools. **KI-Funktionen (Claude API, `ai/ki_helfer.py`, Modell `claude-opus-4-8`, gecachter Aban-Voice-Präfix):** `recherche` (Faktenfelder-Entwurf für ein reales Tool), `content` (Newsletter/Tool-des-Monats/Social aus echten Daten), `audit` (Daten-Wächter → Prüf-Fragen `data/_audit.json`). Plus **Website-Frage-Assistent** `/fragen.html` + Edge-Function `functions/api/ask.js` (von generate.py nach dist/ gebaut, Modell `claude-haiku-4-5`, antwortet nur aus gelisteten Tools, ohne `ANTHROPIC_API_KEY` Fallback). Eigener Audit-Workflow (wöchentlich, secret-gated). KI liefert immer nur Entwürfe/Fragen mit `[Redaktion: prüfen]`; `preis_eur`/`worth_it_score` bleiben `null` bis Mensch prüft. `ai/`-Skripte brauchen `pip install anthropic`.
- `handwerk-radar/` — Wärmepumpe/Solar-Installateur-Verzeichnis DACH. Anbieterdaten aus **OpenStreetMap (ODbL)** via `fetch_anbieter.py` (55 echte Betriebe, qualitätsgefiltert; **nur Betriebe mit Website, keine Mails/Tel republished, Opt-out im Footer, ODbL-Attribution, Pay-per-Lead AUS bis Opt-in**). Adaptiert vom `agenturen-radar`-Muster. Domain handwerk.abannews.com. **CF-Projekt noch anzulegen.** Build `cd handwerk-radar && python generate.py`. ⚠️ Vor dem Bewerben menschlicher Verifikations-Pass nötig (breiter OSM-`hvac`-Tag → Fehl-Zuordnungen). Daten neu ziehen: `python3 fetch_anbieter.py`.
- **Deploy-Readiness (alle Radars):** Generatoren erzeugen jetzt durchgängig `sitemap.xml`, `robots.txt`, `404.html` und `_headers` (Security/CSP). foerder+jobs: strikte CSP; kurse/prompts/dropshipping/agenturen/handwerk: `script-src 'unsafe-inline'` (Inline-Scripts/onclick). Live-Schalten = nur noch CF-Klick je Subdomain (`docs/GO-LIVE-RADARS.md`).
- **Geld-Fokus (Service, schnellster Cash-Weg):** AI-Sichtbarkeits-Service für DACH-Mittelstand — Verkaufs-Paket `docs/AI-SICHTBARKEIT-ANGEBOT.md`, Einsteiger-Anleitung `docs/AI-SICHTBARKEIT-STARTPAKET.md`, Report-Rahmen `docs/AI-SICHTBARKEIT-REPORT-VORLAGE.md`, Seite `ai-sichtbarkeit.html`. Engpass ist Outbound/Verkauf (menschlich), nicht Bauen.
- 92× `ki-fuer-*.html` im Root — Branchen-SEO-Hubs. Erste 8: Handwerker, Steuerberater, Ärzte, Anwälte, Makler, Coaches, Onlineshops, Gastro. +14: Zahnärzte, Finanzberater, Friseure, Psychotherapeuten, KFZ-Werkstätten, Fotografen, Versicherungsmakler, Nachhilfe, Unternehmensberater, Physiotherapeuten, Hotels, Eventplaner, Werbeagenturen, Vereine. +10: Architekten, Hausverwaltungen, Reinigungsfirmen, Pflegedienste, Tierarztpraxen, Apotheken, Fitnessstudios, Garten-/Landschaftsbau, Übersetzer, Autohändler. +10: Bäckereien, Reisebüros, IT-Dienstleister, Logopädie, Ergotherapie, Bestatter, Winzer, Kosmetikstudios, Catering, Speditionen. +10: Maler, Dachdecker, Schreiner, Augenoptiker, Hebammen, Ernährungsberatung, Tonstudios, Floristik, Brauereien, Goldschmiede. +10: Elektriker, Sanitär/Heizung, Fliesenleger, Trockenbau, Glaser, Metallbauer, Zimmerer, Gerüstbau, Raumausstatter, Schornsteinfeger. +10: Heilpraktiker, Hörakustiker, Podologen, Zahntechniker, Sanitätshäuser, Kieferorthopäden, Notare, Wirtschaftsprüfer, Sachverständige, Hausmeisterservice. +10: Sicherheitsdienste, Umzugsunternehmen, Schlüsseldienste, Entrümpelung, Schädlingsbekämpfer, Metzgereien, Eisdielen, Cafés, Buchhandlungen, Fahrradläden. +10: Sportgeschäfte, Modeboutiquen, Getränkehandel, Fahrschulen, Musikschulen, Tanzschulen, Sprachschulen, Nagelstudios, Tattoostudios, Hochzeitsfotografen. Laufen direkt auf abannews.com. Newsletter + Tool-Affiliate. OG-Bilder via `generate_branchen_og.py` (Pillow).
- `geld-verdienen-mit-3d-druck.html` im Root — Geld-SEO-Hub „Mit 3D-Druck Geld verdienen" (Print-on-Demand: KI-STL → fremde Druck-Fabrik → Versand → Verkauf; ehrlich als Dropshipping-Variante eingeordnet). Layout wie `ki-fuer-*.html`, WebPage+HowTo+FAQPage-JSON-LD. Verlinkt `dropshipping.abannews.com`. Pretty-URLs `/3d-druck`, `/3d`.
- `hype-watch.html` + `hype-watch/<id>.html` + `generate_hype_watch.py` (Daten `data/hype-watch.json`) — **Hype-Watch**: selbst-wachsende Faktencheck-Serie, die überhypte KI-Behauptungen belegt entlarvt. `ClaimReview`-JSON-LD (Googles Faktencheck-Schema), Aban-Voice. Neuer Fall = Objekt in der JSON + `python3 generate_hype_watch.py`, dann Sitemap-URLs ergänzen. Pretty-URL `/hype-watch`. Vom Voice-Scanner ausgenommen (zitiert Hype absichtlich).
- `portal/` — Hub; `social/` — Mehrkanal-Publisher (Telegram/Discord/Mastodon direkt + generischer `PUBLISH_WEBHOOK_URL` → Make/n8n/Zapier-Fanout für LinkedIn/X; fertiges `social/n8n-publish-workflow.json`); `automation/werkbank.py` + `news_aggregator.py` — Newsletter-Tools.
- `tools/daily_improvement_scan.py` + Workflow `daily-improvement.yml` — **täglicher Verbesserungs-Scan (autonom, Cron 06:00 UTC):** prüft alle HTML-Seiten + sitemap auf SEO/a11y/Security/JSON-LD/Voice-Schwachstellen, schreibt priorisierten Report nach `reports/IMPROVEMENT-REPORT.md` (nur bei Änderung committet, `[skip ci]`). Reine Heuristik, stdlib, erfindet nichts — Befunde manuell verifizieren. Ergänzt `tools/link_checker.py`.
- Jedes Geld-Projekt: `generate.py` (stdlib), eigener Auto-Build-Workflow, baut nach `dist/`.
- Daten `data/tools.json` (177 Tools, 33 neue mit „[Redaktion: prüfen]") speist den ki-tools-radar.

## Verkauf/Zahlung — Stand 2026-05-31 (Details in PROJEKT.md)
- **Founding €69** (von €149 gesenkt), Zahlung per **PayPal Payment Link** `ncp/payment/7GPXCMBCETCUY`
  in `founding.html` + `en/founding.html` (kein SDK, nur Link-Button). Rechnung per Mail-Fallback.
- **Buch „Anti-Hype"** = 13 Kapitel (de/en/fr/it), KDP-tauglich (Print ≥24 S.). Inhalt nur in
  `generate_ebook.py` ändern (Single Source); danach `generate_ebook.py` + `generate_kdp_print.py de en fr it` neu bauen.
- Buch-Verkauf via **Lemon Squeezy** (`js/buch-config.js`). KDP-Anleitung: `docs/KDP-VEROEFFENTLICHEN.md`,
  Geldkanäle: `docs/NEWSLETTER-GELD.md`.
- PayPal in `datenschutz.html` + CSP in `_headers` (`*.paypal.com`) hinterlegt.
- ⚠️ Diese Site nutzt **kein** Google Analytics / kein 3rd-Party-Tracking (DSGVO/Markenversprechen) — nie hinzufügen.
