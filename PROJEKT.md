# Projekt-Memory — Geld verdienen mit KI (Aban)

> Dauerhafter Gedächtnis-Speicher für dieses Vorhaben. Überlebt Session-Resets.
> Stand: **2026-06-07** (Vertex-AI-Bildpipeline LIVE — siehe nächster Abschnitt) · Betreiber: Allen Chour (abannews.com, Belp/CH).
> ⚠️ Hinweis: `CLAUDE.md` im Repo-Root ist inzwischen das Arbeitsgedächtnis eines **anderen** Workstreams
> (LuxeStyle-Dropshipping-Shop) und **nicht mehr** die aban-news-Wahrheit. Für aban-news ist **dieses**
> Dokument (`PROJEKT.md`) maßgeblich. CLAUDE.md des Dropship-Projekts NICHT überschreiben.
> 🔗 **Session-übergreifend:** Beide Sessions teilen sich dieses Repo. Bild-Generierung
> (`automation/gen_image_gemini.py`, Vertex-AI-Pfad) ist jetzt produktiv und kann auch vom
> Dropship-Workstream genutzt werden — Secrets `GCP_SA_KEY`/`GCP_PROJECT` liegen im Repo (allengchour-glitch).

## 📌 Stand 2026-06-07 — Echte KI-Bilder (Google Imagen via Vertex AI) LIVE ✅
**Ergebnis:** Telegram-Autopost erzeugt jetzt zu jedem Post ein **echtes Imagen-Bild** statt der Marken-Karte.
Verifiziert im Workflow-Log (`telegram-autopost.yml`, Run 27079834486):
`(Vertex imagen-3.0-generate-002 @ us-central1)` → `✓ Bild erzeugt` → `✓ Gepostet`.
- **Pfad:** `automation/gen_image_gemini.py` → `make_image()` Reihenfolge: **Vertex (GCP_SA_KEY)** → Gemini-Dev-API → Marken-Karte (Fallback). Vertex ist der aktive Weg.
- **Aktiviert (User, am Handy):** GCP-Projekt **`aban-imagen`** (Nr. 392921573891) · Service-Account **`abannews@aban-imagen.iam.gserviceaccount.com`** mit Rolle *Vertex AI User* · **Vertex AI / „Agent Platform" API aktiviert** · JSON-Key als **GitHub-Secret `GCP_SA_KEY`** + Secret **`GCP_PROJECT=aban-imagen`**.
- **Zwei Bugs gefixt (Commit auf `main`):** (1) leere `${{ vars.GCP_LOCATION }}`/`VERTEX_IMAGE_MODEL` → `.get(default)` greift bei leerem String NICHT → mit `or`-Default abgefangen (Region `us-central1`, Modell `imagen-3.0-generate-002`); (2) `_vertex()` fing nur `HTTPError` → URLError/DNS crashte den ganzen Post → jetzt breiter `except` → Karte als Fallback statt Crash.
- **Lehren (teuer gelernt):** Imagen läuft NICHT über die Developer-API (`generativelanguage`, gibt 404 für `:predict`) → **nur Vertex AI**. Vertex-403 „API not used/disabled" = `aiplatform.googleapis.com` im Projekt aktivieren. Leere GitHub-*Variables* kommen als `""` an, nicht als „unset" → Defaults mit `or` setzen, nicht `.get(k, default)`.
- **Kosten:** ~0,03–0,04 $/Bild → bei 1 Post/Werktag ~**1 $/Monat** (User-Budget). Budget-Limit empfohlen: https://console.cloud.google.com/billing/budgets
- **🔴 Security-Lehre (wiederholt):** User hat den **ersten** SA-JSON-Key (private_key) im Chat gepostet → verbrannt → muss in GCP gelöscht werden (Key-ID `a7be9889…`). Der **zweite** Key wurde direkt als GitHub-Secret gesetzt (sicher). NIE wieder Keys im Chat — immer direkt in GitHub-Secrets.
- **🟡 Optional offen (User):** alten Key `a7be9889…` in GCP löschen (falls noch nicht); optional Variables `GCP_LOCATION=us-central1` + `VERTEX_IMAGE_MODEL=imagen-3.0-generate-002` setzen (nötig ist es nicht, Code hat Defaults).
- **Workflows mit Vertex-Bild verdrahtet:** `telegram-autopost.yml`, `linkedin-autopost.yml`, `telegram-control.yml`, `gemini-content-engine.yml`, `gemini-draft.yml`, `gemini-growth-ideas.yml` (alle bekommen `GCP_SA_KEY`/`GCP_PROJECT`/`GCP_LOCATION`/`VERTEX_IMAGE_MODEL` + `pip install google-auth requests`).

## 📌 Stand 2026-06-07 (Teil 5) — Konsistenz-Guard, lebhaftere Bilder, themen-Verlinkung
- **#3 Konsistenz-Check (`tools/consistency_check.py` → `reports/CONSISTENCY.md`, im Autopilot):** prüft Preise (Founding €69 · Premium €9/Mt · €89/Jahr) + Garantie (30 Tage) site-weit gegen kanonische Werte, ignoriert Spannen („€5–€10") und Fremdprodukte (kurs.html=€59/14T, ebook/buch, launch-manual intern). Fand & behoben: **`en/faq.html` 14→30 Tage**. Jetzt ✅ keine Abweichungen. `--strict` = CI-tauglich (Exit 1). Verhindert künftige Preis/Garantie-Drifts automatisch.
- **#2 Lebhaftere Bilder (`gen_image_gemini.py`):** 5 Stil-Varianten neu = fotorealistisch-warm / farbenfroh-flach / isometrisch-3D / cineastisches Stillleben / Papier-Collage (satte Farben, warmes Licht) statt vorher „minimal/ruhig". Weiterhin **keine Gesichter/Text/Zahlen** (Guardrail). Live verifiziert. **Option offen:** echte Stockfotos via Pexels/Unsplash (gratis API) — nur auf Wunsch, da Quellen-Pflicht + extra Key.
- **#1 themen-Verlinkung (`tools/related_themen.py`, im Autopilot):** „Verwandte Themen"-Ring (je 5 Querverweise) in alle **21 `themen/`-Artikel** → kein verwaister Artikel, besserer Crawl. Idempotent, 0 defekte Links.
- **Autopilot** ruft jetzt zusätzlich `consistency_check` + `related_themen`.

## 📌 Stand 2026-06-07 (Teil 4) — Ehrlichkeits-Pass: Founding & Pricing entschönt
**Auftrag „ehrlich machen + überall verbessern".** Auf den Verkaufsseiten standen Versprechen, die bei
0 Abonnenten/Solo nicht existieren können → entfernt/ehrlich umformuliert (Markenregel: keine Fake-Claims):
- **`founding.html` (DE) + `en/founding.html`** komplett ehrlich gemacht: entfernt **Discord-Community/`#cafe-founding`-VIP-Channel, Monthly-Office-Hour/Zoom, Quartals-Strategy-Calls, wöchentlicher Podcast/privater Spotify-Feed, „12 Workflow-Templates/Jahr (Notion+JSON)", „50+ Promo-Codes wöchentlich", „First-Look 2 Wochen früher"**. Ersetzt durch ehrliche, lieferbare Benefits: Lifetime-Preis €69, voller Premium-Zugang sobald Formate starten, **direkter Draht per E-Mail**, du prägst die Roadmap mit, Tool-Datenbank, Honor-Roll, faire Garantien. Vergleichstabelle, Benefit-Grid, „Mittwoch-Ausgabe"-Sektion → „Premium-Vertiefung", FAQ-Accordion + **FAQPage-JSON-LD** mitgezogen. Post-Kauf-Text: „Discord-Einladung" → nur Premium-Zugang.
- **Zwei harte Bugs gefixt:** EN-Jahrespreis **€99 → €89** (Fließtext + FAQ-Schema); falsche Runway-Zahl **„~€14.900" → „~€6.900"** (100×€69); „Quarterly calls" ↔ DE „Monthly Office-Hour"-Widerspruch aufgelöst.
- **Datums-Widerspruch entschärft:** „Seit 2024 schreibe ich jeden Werktag" (founding-Founder, `ebook.html`, `en/ebook.html`) widersprach „startet als" → auf zeitlosen, ehrlichen Wortlaut geändert. 🟡 **User: echtes Startdatum bestätigen**, dann kann es präzise zurück.
- **`index.html`** Pricing-Karten + FAQ + JSON-LD: „Mittwoch-Premium-Edition, Audio, Discord, Office-Hour, VIP-Channel" → „Premium-Vertiefungen, Voll-Archiv, Tool-Datenbank, werbefrei, direkter Draht". **`en/faq.html`** desgleichen. Index-Trust-Band nutzt nur ehrliche Fakten (5 Min, Mo–Fr, 3+1+1, 0 €) — keine erfundenen Leserzahlen.
- **Geprüft & sauber:** `faq.html` (DE) hatte keine Überansprüche; `roadmap.html` ist explizit „⏳ geplant" (Podcast-Pilot) → bleibt; alle JSON-LD valide, 0 defekte interne Links.
- ✅ **User bestätigt (2026-06-07):** (1) KEIN „seit 2024" — Startdatum-Claim bleibt entfernt. (2) KEINE Premium-Vertiefungen/Audio geplant → **alle „Vertiefung/Deep-Dive/Audio"-Versprechen komplett entfernt** (founding DE/EN, index, ebook DE/EN, en/faq, launch-manual). **Ehrliches Premium-Modell jetzt:** Voll-Archiv mit Suche + werbefrei + Tool-Datenbank. **Founding** = das alles auf Lebenszeit (€69 einmal) + direkter Draht per E-Mail + du prägst die Roadmap mit + Honor-Roll + faire Garantien. Founding-Sektion „Mittwoch-Ausgabe" → „Was in einer täglichen Ausgabe steckt" (3 Updates/1 Tool/1 Prompt — real).

## 📌 Stand 2026-06-07 (Teil 3) — SEO-Lücken, Hub des Tages, Lead-Magnete + ehrlicheres Audit
- **Wachstums-Audit ehrlich gemacht (`tools/growth_audit.py`):** war mit Fehlbefunden (Basenamen statt Pfaden; CTA-Check zu streng; Prototypen/Drafts/Video-Workstream mitgezählt). Jetzt: relative Pfade, CTA-Regex `beehiiv\.com/subscribe`, Ausschluss `video-prototypes/`/`-preview`/`-draft`/`issue-*-final`/Recht-Utility. Realbild: **OG fehlend 1→0, verwaiste Hubs 0, CTA-Lücken 47→21** (Rest = Utility/Listen, bewusst).
- **Newsletter-CTA ergänzt (`tools/add_newsletter_cta.py`, idempotent):** Box vor `</main>` auf **26 Content-Seiten** (alle 21 `themen/*` + 5 Root-Artikel); Recht/Listen/Utility bewusst ausgenommen; läuft jetzt im Autopilot mit.
- **OG-Bild** für `geld-verdienen-mit-3d-druck.html` ergänzt (`generate_og_images.py` → `og-3d-druck.png` + og:image/twitter:image-Meta). Die 2 fehlenden `canonical` liegen in `video-prototypes/output/` → **anderer Workstream, NICHT angefasst**.
- **„Hub des Tages" im Digest (`tools/telegram_report.py`):** wählt täglich deterministisch einen Hub zum Teilen + verweist auf `docs/SHARE-KIT.md` → Mensch-Hebel wird Ein-Klick.
- **Branchen-Lead-Magnete (`automation/generate_branchen_pdfs.py`):** **261 ehrliche 1-Seiten-PDFs** „KI-Schnellstart für <Branche>" aus den ECHTEN Anwendungsfällen der Hubs (reportlab) in `downloads/branchen/`, jeder Hub idempotent verlinkt (Marker `data-aban-leadmagnet`) + Newsletter-CTA. `--all` = alle Hubs, Default = PREFERRED-Set. Extraktion robust für beide Layouts (h3 unter „Sinnvolle Anwendungsfälle" + nummerierte h2). **Bewusst NICHT im Autopilot** (PDF-Bytes nicht deterministisch → Commit-Churn); bei neuen Branchen `--all` manuell laufen lassen.
- **Bild-Vielfalt (`gen_image_gemini.py`):** 5 markenkonforme Stil-Varianten (editorial/isometrisch/geometrisch/line-art/Papiertextur), deterministisch pro Thema via MD5-Hash → Posts sehen abwechslungsreich aus, gleiche Ausgabe bleibt stabil. Guardrails (keine Gesichter/Text/Zahlen) unverändert.
- **Founding DE/EN angeglichen:** EN hatte **€99/Jahr** (falsch) → **€89/Jahr** (FAQ-JSON-LD + Fließtext) und **„Quarterly calls"** → **„Monthly office-hour"** (Widerspruch zu DE „Monthly Office-Hour"); Mittwoch-Edition als Audio angeglichen. 🟡 **User bestätigen:** ob Discord/Monthly-Office-Hour/Mittwoch-Audio real existieren — sonst auf Wunsch abschwächen (kein Fake-Versprechen).
- **themen/-OG:** geprüft — **alle 21 haben bereits ein vorhandenes og:image** → nichts zu tun.

## 📌 Stand 2026-06-07 (Teil 2) — Autopilot + ehrliches Wachstum + Bild-Pipeline gehärtet
**Auftrag:** „setze alles autonom um … entwickle Tools, dass es noch einfacher läuft, die Seite automatisch
verbessert, automatisch Abonnenten sucht — alles autonom, auch Geld verdienen." Umgesetzt (ehrlich, abannews-Scope):
- **Bild-Pipeline gehärtet:** doppelter `build_visual()` aus telegram_post.py + linkedin_post.py in **`automation/visuals.py`** zusammengeführt (eine Quelle). **Pro-Kanal-Seitenverhältnis** (Telegram 1:1, LinkedIn 16:9) via neuem `set_aspect()` in `gen_image_gemini.py` (Imagen erlaubt nur 1:1/3:4/4:3/9:16/16:9). **Kill-Switch `ABAN_DISABLE_IMAGE_GEN=1`** (GitHub-Variable) → stoppt kostenpflichtige KI-Bilder sofort → Pillow-Karte gratis. Beide Poster nutzen jetzt das Modul; Verhalten unverändert (dry-run verifiziert).
- **Autopilot (`automation/autopilot.py` + `.github/workflows/autopilot.yml`, tägl. 05:00 UTC):** EIN Lauf bündelt News-Roh­material → **Queue-Top-up nur bei Bedarf** (`ABAN_QUEUE_MIN`, Default 5 → `gemini_generate_posts.py`) → Newsletter-Entwurf → Wachstums-Audit → Funnel-Block aktuell halten. **Postet NICHT selbst** (das machen die Autopost-Workflows), versendet NICHTS. No-op ohne `GEMINI_API_KEY`, Exit 0.
- **Geld-Funnel autonom verdrahtet:** `tools/add_branchen_funnel.py` erweitert → **alle 262 `ki-fuer-*`-Hubs** verlinken jetzt zusätzlich **`/founding.html`** („werde Founding-Mitglied", ehrlich, anti-hype). Idempotent verifiziert (2. Lauf = 0 Änderungen).
- **Wachstums-Audit (`tools/growth_audit.py` → `reports/GROWTH-AUDIT.md`):** prüft OG-Bild-Abdeckung, Newsletter-CTA, Funnel-/Founding-Link, interne Link-Gesundheit (nutzt `check_internal_links.scan()`), **verwaiste Hubs**. Erst-Befund: 5 ohne OG-Bild, 51 ohne CTA, **201 verwaiste Hubs** (interne Verlinkung = nächster echter Hebel), 0 defekte Links.
- **Tages-Digest erweitert:** `tools/telegram_report.py` zeigt jetzt zusätzlich **Wachstums-Befunde + Queue-Stände** → EINE tägliche Nachricht (gesendet vom 06:00-`daily-improvement.yml`, das nach dem 05:00-Autopilot läuft).
- **Content-Gate gehärtet:** `gemini_generate_posts.py` splittet Posts robust (Regex `-{2,}\s*POST\s*-{2,}`), Mindestlänge 40→**200 Zeichen** (filtert Schnipsel/Vorworte).
- **Interne Verlinkung (`tools/related_hubs.py`):** setzt in jeden der 262 Hubs einen „Verwandte Branchen"-Block (Ring: Hub i → nächste 6 alphabet. Nachbarn) → **verwaiste Hubs 201 → 0** (verifiziert via growth_audit). Idempotent, Labels aus `<title>`.
- **Share-Kit (`tools/share_kit.py` → `docs/SHARE-KIT.md`):** fertige Copy-Paste-Teilen-Posts (LinkedIn/WhatsApp/Reddit) für 8 kauf-nahe Branchen, ehrlich/anti-hype, deterministisch (kein Key). Macht den Mensch-Hebel „organisch teilen" zum 1-Klick.
- **Autopilot erweitert:** ruft jetzt zusätzlich `related_hubs.py` (idempotent) + `share_kit.py` daily auf; Commit-Pfade um `docs/SHARE-KIT.md` ergänzt.
- **🔴 EHRLICHE GRENZE (dem User klar gesagt):** „Abonnenten automatisch suchen" gibt es nicht ToS-konform — kein Auto-DM/Follow/Scraping. Autonom = oberen Trichter breiter (OG/CTA/Funnel/Crawl) + Maschine gefüttert halten. Reichweite/Umsatz brauchen Mensch-Hebel (Posten-Tokens, organisch teilen, beehiiv-Referral, ggf. Ads). Steht im Audit + Digest.
- **Bewusst NICHT angefasst:** andere Workstreams (`aban_*`, `aban-*.yml`, `scripts/yt_upload.py`, `dropship/**`, `gen_post_image.py`).

## 📌 Stand 2026-06-06 — Wachstum & Conversion (PR #381, Branch `claude/ai-money-project-f25Ub`)
**Ziel der Session:** „sehr reif, aber 0 Abonnenten" → *gefunden werden + Besucher→Abonnent*. 4 Workstreams + Hub-Boost. Markenversprechen gewahrt (kein Tracking-Pixel, DSGVO, keine Fake-Zahlen). **Engpass = Reichweite/Conversion, nicht Bauen.**
- **A · Analytics:** `js/analytics.js` = **Cloudflare Web Analytics** (cookielos, kein Pixel, Do-Not-Track-aware, **no-op bis `CF_TOKEN` gesetzt**). Eingebunden auf DE/EN/FR/IT `index`, `founding`, `gratis-ki-tools`, `online-tools`, `preview`. `datenschutz.html` §6.2 + AV-Tabelle auf CF korrigiert (war fälschlich Plausible/Umami). 🙋 **User:** Token aus CF-Dashboard in `js/analytics.js` (`CF_TOKEN`) eintragen.
- **C · Conversion (Startseite):** Sticky Mobile-CTA auf allen 4 `index` (DE/EN/FR/IT). DE zusätzlich: Lead-Magnet-Sekundär-CTA (→`/gratis-ki-tools.html`), rotierende Mail-Vorschau (Mo/Mi/Fr, Pause b. Hover), ehrliche Founding-ROI-Zeile („≈8 Monate Premium"). EN/FR/IT haben das Vorschau-Karussell bereits.
- **B · SEO:** DE-Homepage `noindex→index` + `canonical` + reziprokes `hreflang` (fehlten als einzige Sprachvariante). `BreadcrumbList`-JSON-LD auf **allen 262** `ki-fuer-*.html`. Archiv-Ausgaben hatten schon `NewsArticle`.
- **🚀 Hub-Boost (alle 262 `ki-fuer-*.html` = SEO-Eintrittspunkte):** (1) **Inline-E-Mail-Formular** in der CTA-Box `#abo` → direkt `https://abannews.beehiiv.com/subscribe` (GET `email`), Lead-Magnet bleibt Sekundär-Link — *kein Extra-Klick mehr*. (2) Sticky Mobile-CTA → springt zu `#abo`. (3) „**Verwandte Branchen-Guides**"-Block (4 Links via Keyword-Buckets, Fallback alphabet. Nachbarn) für Crawl-Tiefe. Migration war Einmal-Skript (entfernt).
- **F · QA:** `tools/check_internal_links.py` (interne href/src vs. Dateien; schließt `/dist/`, `<script>`, Platzhalter aus) → **1.213 Seiten, 0 defekte interne Links**. `quality-check.yml` JSON-Validator überspringt jetzt Shopify-JSONC (`/*`-Header in `dropship/assets/theme-index-branded.json`) — `main` hatte parallel denselben Fix (Merge: main-Version genommen, robuster m. BOM).
- **Branch-Falle (wichtig):** Remote-`claude/ai-money-project-f25Ub` war **veraltet** (671 Commits hinter `main`, alte PRs #2/#13/#14 alle geschlossen). → mit `--force-with-lease` auf aktuellen `main` + neue Commits zurückgesetzt. Später `main`-Merge (8 neue Hubs nachgezogen → wieder 262/262 konsistent).
- **CI-Status:** `check` (Quality) ✅, Pre-deploy-Validation (JSON-LD, einziger blockender Schritt) ✅, 762 JSON-LD-Blöcke valide. **Rot = NUR Cloudflare-Deploy-Previews** (`radar`/`aban-news-landing`/`aban-a`/`ki-verzeichnis`/`foerder-radar`): gemeinsame **Infra-/Token-Ursache** (Auth code 10000), **user-seitig**, kein Code-Fehler. PR `mergeable_state: unstable` = mergebar.
- **🟡 Offene User-Schritte:** (1) `CF_TOKEN` in `js/analytics.js`; (2) optional CF-Deploy-Token-Rechte fixen (Pages/Workers Edit) → Previews grün; (3) PR #381 aus Draft holen/mergen.
- **LinkedIn-Wachstum:** **Native, autonom+gratis Pipeline gebaut** — `automation/linkedin_post.py` +
  `social/linkedin_queue.json` (**17 geprüfte, ehrliche** Evergreen-Posts, KEINE Fake-Zahlen) +
  `.github/workflows/linkedin-autopost.yml` (Mo–Fr 08:00, no-op ohne Secrets) + `docs/LINKEDIN-AUTOPOST.md`.
  **🟡 TOKEN STEHT NOCH AUS — User holt `LINKEDIN_ACCESS_TOKEN`+`LINKEDIN_AUTHOR_URN` SPÄTER** (LinkedIn-Dev-App
  braucht Company Page → nur am Desktop anlegbar; Mobile 404t). **Empfohlene Alternative ohne Token/Company Page:
  Buffer (gratis) → persönliches Profil verbinden → die 17 Posts einplanen.** LinkedIn-Newsletter = wöchentlich
  (Teaser→beehiiv). ⚠️ Die alten 30 Make-Seed-Posts (`automation/linkedin_posts_seed.csv`) enthalten erfundene
  Statistiken → bewusst NICHT in die Queue übernommen (in Docs als „erst nach Faktencheck" markiert).
- **Fakten-Korrektur:** Founding ist **€69 einmalig** (PayPal), Premium €9/Mt bzw. €89/Jahr; beehiiv **Gratis-Plan**. (Ältere PROJEKT.md-Stellen mit „€149" sind veraltet.)
- **Newsletter attraktiver (Startseite, live nach Merge):** echte Archiv-Vorschau (3 neueste Ausgaben) + „Beispielausgabe"-Button; Anmelde-Geschenk **`downloads/10-ki-prompts.pdf`** (via `automation/generate_prompts_pdf.py`, reportlab); ehrlicher Gründer-Block + Teilen-Buttons; „Dialog statt Monolog"-Block; Hero-Live-Vorschau zeigt **echte Schlagzeilen** der letzten Ausgaben; `ueber-aban.html` Foto-Platzhalter. Doku: `docs/NEWSLETTER-ATTRAKTIV.md` (beehiiv-Referral + Welcome-Mail-Text).
- **Telegram-Autopost (einfachster autonom+gratis Kanal!):** `automation/telegram_post.py` + `.github/workflows/telegram-autopost.yml` + `social/telegram_queue.json` (17 ehrliche Posts), no-op ohne Secrets. **🟡 User: `TELEGRAM_BOT_TOKEN`+`TELEGRAM_CHANNEL` setzen** (BotFather, ~5 Min, kein OAuth/Ablauf — viel leichter als LinkedIn). Setup: `docs/TELEGRAM-SETUP.md`.
- **Retention:** `docs/RETENTION-BAUSTEINE.md` (10 Hebel: Zustellbarkeit/Domain-Auth, Welcome+Geschenk, Dialog-Frage, Prompt als Sticky, Telegram-Touchpoint, Win-back, sanfte Upgrades, Preferences).
- **🤖 Autonome Content-Engine (Gemini=Arbeiter, Brand-Voice-Linter=Boss-Gate):** `automation/gemini_generate_posts.py` + `.github/workflows/gemini-content-engine.yml` (Mo-Fr Cron) erzeugt **evergreen** Posts (zeitlos, KEINE erfundenen Zahlen/News), jeder Post MUSS `tools/brand-voice-linter.py --strict` bestehen, nur dann ab in Telegram+LinkedIn-Queue → Kanäle nie leer. Verifiziert: Hype-Post wird abgelehnt, sauberer Post besteht.
- **Bild/Content-Studio (Pillow + Gemini):** `automation/studio.py` = ein CLI für `card` (Marken-Textkarte, gen_card.py), `image` (Gemini-Bild, editorial, KEINE Fake-Gesichter/Zahlen, gen_image_gemini.py), `chart` (Balken aus ECHTEN Zahlen+Pflicht-Quelle, gen_chart.py), `chart-template`, `draft` (Gemini-Ausgabenentwurf). Doku `docs/CONTENT-STUDIO.md`. Telegram-Autopost hängt automatisch Bild an (Gemini-Bild→Karte→Text).
- **🟡 Aktivierung (alles no-op bis dahin):** Secret `GEMINI_API_KEY` (+ optional vars `GEMINI_MODEL`/`GEMINI_IMAGE_MODEL`) → dann arbeiten Content-Engine, Bilder & Entwürfe autonom. **Wichtige Lehre:** KI darf NIE Zahlen/Diagramme erfinden — Diagramme nur aus echten, gelieferten Daten (gen_chart.py mit Quelle); News-Posts nur als ENTWURF (Mensch sendet). Evergreen-Posts dürfen auto-posten.
- **🔴 Security-Lehre:** Telegram-Bot-Token war im Repo (CJ-IMPORT-LOG.md) öffentlich geleakt → entfernt; muss in BotFather revoked werden. **NIE Secrets ins Repo, immer GitHub-Secrets.**

## 📌 Stand 2026-06-03 — Gratis-Tool-Offensive + interne Verlinkung
**24 client-side Gratis-Tools** (kein Login/Upload/Tracking, Aban-Voice, Amber-Shell, JSON-LD) live auf abannews.com:
- Entwickler/Daten: `json-formatter` `/json`, `regex-tester` `/regex`, `encoder` `/encode`, `hash-generator` `/hash`,
  `uuid-generator` `/uuid`, `env-parser` `/env`, `jwt-decoder` `/jwt`, `diff-tool` `/diff`,
  `timestamp-konverter` `/timestamp`, `markdown-tabelle` `/tabelle`, **`qr-code` `/qr`**.
- Text/Farbe/Web: `hype-filter`, `zeichenzaehler` `/zeichen`, `kontrast-checker` `/kontrast`, `farb-umrechner` `/farben`.
- Rechnen/Geld: `automatisierung-rechner`, `cron-generator` `/cron`, `was-automatisieren`, `prozent-rechner` `/prozent`,
  `mwst-rechner` `/mwst`, `finanz-rechner`, `passwort-generator` `/passwort`, `ki-kosten-rechner`.
- **QR-Code-Generator:** eigener Inline-Encoder (GF(256)/Reed-Solomon/ISO-18004-Maskierung, Byte/UTF-8, V1–40),
  Datentabellen aus `segno` extrahiert, Encoder **gegen segno verifiziert (296/296 byte-identische Matrizen**,
  V1–39, alle ECC, Auto-Maske, UTF-8). PNG+SVG-Export. Keine Fremd-Lib.
- **SEO-Hub `online-tools.html`** (`/werkzeuge`, `/online-tools`, `/gratis-tools`): listet alle Tools nach Themen,
  CollectionPage+ItemList+FAQPage+Breadcrumb-JSON-LD, eigenes Social-Bild `og-tools.png` (`generate_tools_og.py`).
- **Interne Verlinkung (Hub-and-Spoke):** alle 92 `ki-fuer-*`-Branchenseiten (Funnel-Block, `tools/add_branchen_funnel.py`,
  re-runnable) + alle 21 Tool-Seiten (Footer, `tools/link_tools_to_hub.py`) verlinken den Hub; Hub verlinkt zurück.
- **Newsletter-Sample** (`preview.html`) inhaltlich erweitert.

**Cloudflare-Go-Live der Radars (offen, nur User/Token):** `tools/cf_pages_setup.py --all-pending` + Workflow
`cf-pages-setup.yml` (Default jetzt `all-pending`, ein Tap). Browser-Agent-Weg ohne Token:
`docs/CLOUDFLARE-DEPLOY-BROWSER-AGENT.md` (Tabelle = alle 17 offenen Subdomains). Voraussetzungen: Repo-Secret
`CLOUDFLARE_API_TOKEN` (Pages-Edit + DNS-Edit) **oder** CF-Login + einmal „Connect to Git". Token NIE ins Repo.

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

### 8. Dropshipping-/Print-on-Demand-Radar  →  Ordner `dropshipping-radar/`  (NEU 31.05.)
- **Domain:** dropshipping.abannews.com — **CF-Projekt noch anzulegen** (Build `cd dropshipping-radar && python generate.py`, Output `dropshipping-radar/dist`).
- **Generator:** `dropshipping-radar/generate.py` (pure stdlib, Muster wie `kurse-radar`). Daten: `data/anbieter.json` (22 echte Anbieter: Shopify, WooCommerce, DSers, Spocket, AutoDS, Zendrop, CJdropshipping, Syncee, BigBuy, vidaXL, Printful, Printify, Gelato, Modalyst, Sellvia, EPROLO, Brandsdistribution, Trendsi, Doba, SaleHoo, Inventory Source, Avasam — Preise/Score `null` bis geprüft, KEINE erfundenen Werte).
- **DACH-Kern:** boolesche Felder `eu_lager` + `deutsche_oberflaeche` = das Unterscheidungsmerkmal (kürzere Lieferzeit, EU-Rechnung). EU-Lager-Anbieter werden nach vorn sortiert + als farbige Badges gezeigt.
- **Seiten:** Start (Vergleichstabelle + Live-Suche), 22 Anbieter-Detailseiten (SoftwareApplication-JSON-LD + FAQ), 7 Kategorie- + 4 Fokus-Seiten, sitemap/robots/RSS. 36 HTML-Seiten gesamt.
- **Monetarisierung:** `dropshipping-radar/affiliate.json` (alle Slots deaktiviert, `_`-Präfix) — Anbieter-Affiliate (Shopify, Spocket, Printful, AutoDS …), sobald Links freigegeben.

### 9. Geld-Hub „Mit 3D-Druck Geld verdienen"  →  `geld-verdienen-mit-3d-druck.html` im Root  (NEU 31.05., sofort live)
- Print-on-Demand-Modell ehrlich erklärt: KI-STL erstellen → fremdes Druck-Service-Bureau produziert & liefert → Verkauf über eigene Seite. Beantwortet die User-Frage „ist das Dropshipping?" → ja, POD-Variante mit eigenem Design (besser als Katalog-Weiterverkauf).
- Layout wie `ki-fuer-*.html`. WebPage + **HowTo** (3 Schritte) + FAQPage-JSON-LD. Margen-Rechnung, GPSR/Recht-Hinweise (DACH), IP-Warnung. In `sitemap.xml`, Pretty-URLs `/3d-druck`, `/3d` in `_redirects`. Verlinkt `dropshipping.abannews.com` (Anbieter) + radar.abannews.com (KI-Tools). Monetarisierung: Newsletter + Affiliate über die Radars.

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
  kurse-radar/, prompts-bibliothek/, agenturen-radar/, dropshipping-radar/, aban-studio/, ki-geld-projekt/, PROJEKT.md, CLAUDE.md)
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

## Hype-Filter — interaktives Tool (Repo-Root + Edge-API)
Erstes echtes Backend-Tool im Netzwerk (raus aus rein statischem HTML).
- **`hype-filter.html`** (Pretty-URLs `/hype`, `/hype-filter`): Web-App, die deutschen
  Marketing-/Website-Text auf Hype prüft — Klartext-Score 0–100, markierte Buzzwords/
  Versprechen/Füllwörter/Passiv, Schachtelsatz- & Lesbarkeits-Analyse (Wiener Sachtextformel),
  konkrete Umschreib-Vorschläge + regelbasierte Aufräum-Fassung. Brand-Style, SEO/OG/JSON-LD
  (`WebApplication`), Newsletter-CTA als Monetarisierung. Kein Login, kein Tracking.
- **Edge-API:** `functions/api/hype-check.js` (Cloudflare Pages Function, POST `/api/hype-check`)
  + Analyse-Engine `functions/_engine.mjs` (reines JS, keine Deps). Optionale KI-Umschreibung
  via Claude, wenn Secret `ANTHROPIC_API_KEY` im Pages-Projekt gesetzt ist (Model über
  `HYPE_MODEL`, Default `claude-sonnet-4-6`) — sonst regelbasierter Fallback. Kein Build-Step
  nötig: Cloudflare erkennt `functions/` automatisch.
- **Tests:** `node functions/_engine.test.mjs` (84 Checks) + `functions/_api.test.mjs`
  (40 Checks), alle grün. Engine wird zugleich vom CI-Voice-Validator-Gedanken
  gespeist (Lexikon erweitert die `FORBIDDEN`-Idee).
- **Verlinkt:** Footer `index.html` + `resources.html` (Live-Tools-Karte), `sitemap.xml`.
- **Idee/Moat:** dasselbe Werkzeug, mit dem jede Newsletter-Ausgabe geprüft wird, als
  öffentliches Produkt — on-brand (Anti-Hype), nützlich für DACH-Solo-Profis, später als
  Premium-API/Bulk-Check monetisierbar.

### Hype-Filter — Ausbau (parallele Agenten-Runde)
- Engine deutlich vertieft: Lexikon 49→65 Einträge, neue Kategorien `vage` +
  `nominalstil`, `metrics.readingLabel`, ReDoS-gehärtet, 84 Engine-Tests.
- API gehärtet: 405/413/415-Guards, Security-/Cache-Header, Claude-Timeout +
  Key-Leak-Schutz; 40 API-Tests (`functions/_api.test.mjs`).
- CI: `.github/workflows/hype-filter-test.yml` fährt die JS-Tests + HTML-Sanity.
- Frontend: Dark-Mode, Kopier-Buttons, localStorage-Restore, Teilen-per-Hash,
  Tastatur (Strg/Cmd+Enter), ARIA/Fokus/Print, defensives Rendering.
- `anti-hype-texten.html` — SEO-Cornerstone-Ratgeber (funnelt zum Tool).
- `js/hype-filter-widget.js` + `hype-widget-demo.html` — einbettbares Widget
  (Shadow-DOM, XSS-sicher) für Fremd-Sites → Backlinks. Pretty-URLs `/anti-hype`,
  `/widget`. Verlinkt in sitemap/_redirects/Footer/resources.

## Stand 2026-05-31 (Abend) — Conversion-/A11y-/SEO-Runde
- **Hype-Filter Review-Welle:** 4 Audits (Security, A11y, Engine-Linguistik, Voice),
  Fixes umgesetzt (Engine-False-Positives raus, Dark-Mode-Kontrast, escaped Output,
  eigene Tool-Seiten bestehen ihren eigenen Filter). Tests jetzt 84 + 40, alle grün.
- **AA-Buttons site-weit:** gefüllte Primär-/CTA-Buttons von Weiß-auf-`#d97706`
  (3.19:1) auf `#b45309` (5.02:1, WCAG AA), Hover `#92400e`. Akzent-Token `--amber`
  bewusst unverändert. Dark-Mode-Seiten token-aware. 26 Regeln/23 Dateien + styles.css.
- **ki-tools-radar Umsatz-Pass** (`generate.py`): Affiliate-`rel` korrigiert
  (`sponsored noopener` statt widersprüchlichem `sponsored nofollow`, `noopener`-Lücke
  bei `target="_blank"` geschlossen — 0 Verstöße im dist), **CTA above-the-fold nach
  TLDR** (3 CTAs/Seite), einzigartige keyword-reiche Titles („{Tool} Test & Bewertung
  {Jahr}") in 11 Sprachen, `og:type=product`, Meta-Descriptions an Wortgrenze gekürzt.
  Build deterministisch (10.351 Seiten). **Dieselben Hebel sind auf die übrigen
  Programmatic-Projekte (foerder/jobs/kurse/prompts/agenturen) übertragbar.**
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


## 🆕 Netzwerk-Ausbau (Stand 2026-06-02)

Großer Bau-Schub seit dem 31.05. — alles gemergt auf `main`, ehrlich/anti-hype, DSGVO-fest,
selbst-bauend. Detail-Doku je Projekt in `CLAUDE.md`.

### Neue Tool-Radars (Muster wie voice-radar: `generate.py` stdlib → `dist/`, EU-Flag, Affiliate `_`-deaktiviert, Preise/Scores `null` bis menschlich geprüft)
- `automatisierung-radar/` (36 Tools, selbst-wachsend: Vergleichs-/Use-Case-Seiten, KI-Helfer, Frage-Assistent) — Domain automatisierung.
- `dropshipping-`, `newsletter-`, `buchhaltung-`, `chatbot-`, `voice-`, `video-`, `musik-radar/` — je 18–24 echte Anbieter.
- `handwerk-radar/` (OSM/ODbL, 55 Betriebe) — ⚠️ menschlicher Verifikations-Pass vor Bewerbung nötig.
- **Status:** Code + Auto-Build-Workflows fertig; **CF-Projekte je Subdomain noch anzulegen** (nur Klicks).

### Dach-Verzeichnis `ki-verzeichnis/`  (das SEO-Rückgrat)
Aggregiert alle 8 Tool-Radars + `data/tools.json` zu EINER durchsuchbaren Authority-Site:
**326 unique Tools, 9 Bereiche, ~338 Seiten**, Dedup nach Name, **verlinkt zu jedem Fach-Radar zurück**
(Cross-Linking). EU-Hosting sortiert vorn. Domain `tools.abannews.com` (CF-Projekt anzulegen). Selbst-wachsend.

### AI-Sichtbarkeit (Service-Funnel, schnellster Cash-Weg)
- `ai-sichtbarkeit.html` — prüft **AEO-Reife** einer Seite (Edge `functions/api/aeo-check.js`).
- `ki-erwaehnungs-check.html` — **Marken-Präsenz** in KI-Antworten („Werde ich genannt?"), Engine
  `functions/_visibility-engine.mjs` + `functions/api/ki-erwaehnung.js` (optional Claude, sonst Fallback), 21 Tests.
- Beide cross-verlinkt; speisen das Service-Angebot (`docs/AI-SICHTBARKEIT-*.md`).

### Eigene Produkte
- `pod-shop/` — Print-on-Demand-Storefront (personalisierte Namens-Produkte; Design via `namen-generator.html`).
  Preise `null` bis real kalkuliert (kein Offer-JSON-LD), `pod-config.json` alle Slots `_`-deaktiviert (Mail-Fallback),
  `shopify-import.csv`. **Live = Shopify + POD-Anbieter verbinden, Preise eintragen, `_` raus** (3 Schritte im README).
- `produkt-imperium/` — Ratgeber-Fabrik: Thema → KDP-Ratgeber (`generate_guide.py`, Modell claude-opus-4-8,
  ohne Key Trockenlauf). Nur Entwürfe mit `[Redaktion: prüfen]`, keine erfundenen Fakten. Braucht `ANTHROPIC_API_KEY`.

### Content & Funnel
- **Hype-Watch** (`hype-watch.html` + `generate_hype_watch.py`): 5 belegte Faktenchecks, ClaimReview-JSON-LD, selbst-wachsend.
- **Premium-Briefing** (`premium-briefing.html` + `-beispiel.html`): Bezahl-Tier mit echtem Beispiel.
- **Funnel-Fix (großer echter Hebel):** alle **92 Branchen-Seiten** (`ki-fuer-*.html`) verlinken jetzt
  Newsletter + KI-Tools-Verzeichnis + Sichtbarkeits-Check (vorher: keine!). Idempotent via `tools/add_branchen_funnel.py`.
- **Daily-Scan** (`tools/daily_improvement_scan.py`, Workflow): prüft 377 Seiten täglich, Report nach `reports/`.

### Video
- `video-pipeline/` — `generate_clips.py`: macht aus Hype-Watch-Fällen 9:16-Clip-Pakete
  (Slides+Skript+SRT+Caption); `generate_promo.py`: produktionsfertiger Werbespot (Variante A 40 s / B 15 s,
  Storyboard+VO-Text+SRT+Regie). Optional ElevenLabs (`--voice`). Verteilung über `social/post.py`.
  **Ehrlich:** Geld indirekt über den Funnel, kein YouTube-Reichtums-Versprechen.

### ⚠️ Offene To-dos (nur der User — braucht eigene Accounts/Keys)
1. **Cloudflare-Projekte** je Subdomain anlegen + Custom Domain zuordnen: `tools.` `shop.` `musik.` `video.`
   `voice.` `chatbot.` `buchhaltung.` `newsletter.` `dropshipping.` `automatisierung.` `kurse.` `prompts.` `agenturen.` `handwerk.` (`docs/GO-LIVE-RADARS.md`).
2. **POD-Shop live schalten:** Shopify-Store + POD-Anbieter (Gelato/EU-3D-Druck) verbinden, echte Preise, `_` entfernen.
3. **Keys setzen** (nie ins Repo, nur Env/CF-Secret): `ANTHROPIC_API_KEY` (Ratgeber-Fabrik, Edge-Tools),
   `ELEVENLABS_API_KEY` (Video-Vertonung). Quelle: console.anthropic.com bzw. elevenlabs.io.
4. **Werbespot final rendern:** `video-pipeline/generate_promo.py` → `voiceover.txt` in ElevenLabs,
   Frames+SRT in HeyGen, 9:16 exportieren (`docs/WERBEVIDEO-*.md`).
5. **handwerk-radar:** menschlicher Verifikations-Pass der OSM-Daten vor dem Bewerben.

### Sicherheit / Markenversprechen (gilt für ALLES)
- **Keine erfundenen Zahlen/Preise/Quellen** — `null` bzw. `[Redaktion: prüfen]` bis menschlich verifiziert.
- **Keine Secrets im Repo** — Keys nur als Env/CF-Secret; im Chat geklebte Keys gelten als verbrannt (revoke + neu).
- Kein Tracking, kein Google Analytics, System-Fonts, anti-hype, du-Form — site-weit.
