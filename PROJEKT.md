# Projekt-Memory — Geld verdienen mit KI (Aban)

> Dauerhafter Gedächtnis-Speicher für dieses Vorhaben. Überlebt Session-Resets.
> Stand: **2026-06-07** — LIVE & autonom: KI-Bilder (Vertex/Imagen) + echte Fotos (Pexels) in Social-Posts;
> Content-Engine erzeugt Posts (gemini-2.5-flash via Vertex, thinking_budget=0); **bild-reiche, lange Newsletter-
> Ausgaben** (`build_issue.py`, inkl. `--niche`); **€9/€89-Premium-Checkout live** (Lemon Squeezy, EUR);
> **autonomer Stripe-Shop** mit 11 Branchen-Kits + Shop-Funnel in allen 262 Hubs; **GEO-Report-Abo-Cron** +
> Muster; **Bausatz** verkaufsfertig (Lizenz/Listing); Newsletter-CTA auf allen Inhaltsseiten; growth_audit sauber.
> Hub-Header-Bilder füllen sich täglich nach; Effizienz-Tools (`tools/status.py`, `Makefile`).
> **👉 Neueste Lage + offene Punkte: Teil 12 (direkt unter dem Backlog).** Backlog leer bis auf #6 `promote`
> (erst nach echtem Versand). · Betreiber: Allen Chour (abannews.com, Belp/CH).
> ⚠️ Hinweis: `CLAUDE.md` im Repo-Root ist inzwischen das Arbeitsgedächtnis eines **anderen** Workstreams
> (LuxeStyle-Dropshipping-Shop) und **nicht mehr** die aban-news-Wahrheit. Für aban-news ist **dieses**
> Dokument (`PROJEKT.md`) maßgeblich. CLAUDE.md des Dropship-Projekts NICHT überschreiben.
> 🔗 **Session-übergreifend:** Beide Sessions teilen sich dieses Repo. Bild-Generierung
> (`automation/gen_image_gemini.py`, Vertex-AI-Pfad) ist jetzt produktiv und kann auch vom
> Dropship-Workstream genutzt werden — Secrets `GCP_SA_KEY`/`GCP_PROJECT` liegen im Repo (allengchour-glitch).

## 🚀 2026-06-14 — GROSSER AUTONOM-SCHWUNG: eBay LIVE + 13 SEO-Seiten + Bilder + Selbst-Hirn (zuerst lesen)
> Session „mach alles autonom". Alles gemerged + deployt (Cloudflare Pages ist jetzt **git-verbunden** →
> Push auf `main` deployt automatisch; `wrangler pages deploy _site` geht zusätzlich/manuell weiter).

- **🛒 eBay-Angebote KOMPLETT LIVE (verdient mit!):** `/api/ebay` liefert echte Browse-API-Artikel mit
  **EPN-Affiliate-Tracking**. Secrets in **Cloudflare Pages** gesetzt (Token darf Pages-Secrets!):
  `EBAY_CLIENT_ID=allengch-abannews-PRD-ca92c9933-98a2bbef`, `EBAY_CLIENT_SECRET` (PRD-…-1ffb, vollständig),
  `EBAY_DEV_ID=4974f07d-…`, `EBAY_CAMPAIGN_ID=5339156671` (EPN-Kampagne „aban"). **Compliance**
  („Marketplace Account Deletion" → Exemption „I do not persist eBay data") war der Schalter für `invalid_client`.
  Seiten `/angebote-suche.html` + 14 Kategorie-Seiten zeigen echte Angebote. **🔥 Angebote** ist jetzt in der
  site-weiten Engine-Nav (`js/site-nav.js`). **Offen:** restliche Affiliate-Netzwerke (Awin/financeAds/Amazon).
- **🧠 Selbst-verbesserndes Hirn (3 Arme):** (1) `tools/daily_improvement_scan.py` mit **Health-Score**
  (`automation/brain-state.json`, aktuell **97.3/100**, 0 hoch/0 mittel/27 tonal) + sicherem `--fix` (noopener)
  + `--voice` (Hype-Wörter, grammatisch sicher); (2) `automation/brain-wake.sh` + **SessionStart-Hook**
  (`.claude/settings.json`) weckt das Hirn jede Session; (3) `workers/site-brain/` Cloudflare-Cron-**Wächter**
  (überwacht Live-Seite, fixt/deployt NICHT — braucht Workers+KV-Token zum Deploy); (4) `.gitlab-ci.yml`
  `brain-improve` (scannt/fixt → Branch `brain/auto`, braucht `GH_PUSH_TOKEN`). Runbook: `automation/BRAIN.md`.
- **🎨 Optik lebendiger (kein Foto nötig, alles Inline-SVG):** Engine-Nav (Gradient, Hover, Icons, puls. Marke);
  Hero-SVGs auf 3 Ratgebern, 2 Hubs (Ratgeber/Tools), **6 Rechnern**, **37 ki-fuer-Seiten mit fehlendem Foto**
  (KI-Banner-SVG; 299 mit echtem Foto unberührt). Brand-Voice: 32 Seiten entschärft (Mehrwert→Nutzen etc.).
- **📄 13 neue SEO-Ratgeber (nachfrage-basiert via Google-Autocomplete), je FAQ-Schema + Hero-SVG + Cockpit-Funnel:**
  rechnung-stornieren, kunden-gewinnen, steuererklaerung-selbststaendige, rechnungsprogramm-kostenlos,
  lexoffice-vs-sevdesk, qonto-vs-kontist, gewerbe-anmelden-kosten, rechnung-ins-ausland, privatrechnung-schreiben,
  **rechnung-auf-englisch** (DE→EN-Vokabeln), **kleinunternehmer-grenze-2026**, selbststaendig-krankenversicherung,
  buchhaltung-fuer-anfaenger. Alle in `js/site-nav.js`-Katalog + `sitemap.xml` + Ratgeber-Vertiefung.
- **💼 LinkedIn-artiger Aufträge-/Jobs-Feed:** `auftraege.html` (3-Spalten: Profil/Filter · Feed · Ausschreiben-CTA),
  nutzt `/api/inserate-list` mit Beispiel-Karten im Demo-Modus. Von `inserate.html` verlinkt, in Nav.
- **📊 Nächste Nachfrage-Lücken (Google-Autocomplete, noch offen):** „ki für präsentationen/powerpoint",
  „ki für hausarbeiten/literaturrecherche", „ki für lehrer"; „selbstständig machen ideen/förderung";
  „geschäftskonto kostenlos".
- **⏳ Nur der User kann freischalten:** (1) **Cloudflare-D1-Token** → echte Inserate/Aufträge statt Beispiele
  (Tabelle `inserate`, Schema `db/inserate-schema.sql`, `ADMIN_TOKEN`); (2) **Cloudflare Workers+KV-Token** →
  `site-brain`-Wächter deployen; (3) **GitLab** einrichten → `brain-improve` automatisch; (4) Affiliate-Konten.
- **Deploy-Fakten:** Cloudflare-Token `cfut_…` (Pages:Edit, KEIN D1/Workers) + Account `33e5217c…`.
  Loop: Branch von `origin/main` → PR → squash-merge → (auto-deploy via git) bzw. `bash build-pages.sh` +
  `npx wrangler@3 pages deploy _site --project-name=abannews --branch=main`. Vor `git reset --hard` IMMER `git fetch`
  (Parallel-Bots pushen auf `main`).

## 💰 2026-06-13 — TOKEN-KOSTEN gesenkt (Newsletter-Workstream) + Startseiten-Polish
> Session „polish / token sparen". Alles gemerged, alle internen aban-news-Links sauber.
- **Startseite poliert:** Hub-Zahl 355→**360** (akkurat, #805); „13 Text-Arten"→**22** (Konsistenz mit
  KI-Studio) + **Demo-Fallback** ohne „Netzwerkfehler" (zeigt freundlich KI-Studio-Link, falls `/api/demo`
  nicht erreichbar — z. B. solange Apex auf GitHub Pages liegt), #818. Fazit: Startseite ist **top, kein Redesign**.
- **🔑 Token gespart (#826 + Ergebnis-Cache):** Einziger NICHT pro-gateter Anthropic-Endpoint war
  `/api/demo` (öffentlicher Gratis-Teaser) — lief auf **Sonnet** → auf **Haiku** umgestellt (~4–5× billiger,
  eigenes `DEMO_MODEL`-Env). **Zusätzlich Ergebnis-Cache** (`caches.default`, 24 h): identische Eingaben →
  0 Tokens, kein Quota — v. a. der vorausgefüllte Demo-Default wird nur 1×/Tag echt generiert.
- **Wichtige Erkenntnisse (in `docs/TOKEN-SPAREN.md`):** (1) Bis auf die Demo ist JEDER Anthropic-Call
  hinter Pro/Bezahlung/Limit — Kosten gut eingedämmt. (2) Alle Modelle sind **per Env überschreibbar**
  (`GENERATE_MODEL`/`HYPE_MODEL`/`CHAT_MODEL`/`VISIBILITY_MODEL`/`DEMO_MODEL`) → User kann ohne Deploy auf
  Haiku stellen. (3) Prompt-Caching bringt hier NICHTS (System-Prompts ~60 Tok, unter 1024-Min). (4) Automation
  läuft auf Gemini-Gratis; deterministische Generatoren (Rechnung/Mahnung/Hype-Filter) sind lokal = 0 Tokens.
  „Selber produzieren"-Optionen dokumentiert (Ollama auf Dauer-PC, Groq/Gemini-Free als `/api/*`-Adapter).
- **Shop-Folgearbeit aus Katalog-Wachstum (22 Produkte) abgeschlossen:** EN-Shop 12→22 (#794), EN-Funnel
  8 Direkt-Kit-Links (#795), Shop-ItemList-Schema 12→22 DE+EN (#798).

## 💸 2026-06-12 (ABEND) — AFFILIATE-MONETARISIERUNG + aban-Pro-Funnel (NEUESTER STAND, zuerst lesen!)

> Ganztägige Session: aban-Pro/KI-Studio ausgebaut **und** eine komplette, ehrliche **Affiliate-Maschine** gebaut.
> Zentrale Idee: ehrliche Review-/How-to-Seiten → Funnel zum KI-Studio (gratis testen) + Newsletter, Affiliate
> **nur** auf Review-Seiten, Tool-DB bleibt neutral. **Alles markenkonform, anti-hype, klar gekennzeichnet.**

### 🔑 Affiliate-Mechanik (EINE Quelle der Wahrheit)
- **`js/affiliate-config.js`** (`window.ABAN_AFFILIATE`): pro Tool ein `*_URL`. **Tracking-Link eintragen → Review-
  Seite verdient + zeigt „Affiliate-Link"-Label.** Leer `""` → Button zeigt neutral auf Anbieter-Domain (kein toter
  Link, kein falsches Label). Die Review-Seiten lesen die Keys per kleinem Inline-Script (ids wie `aff-hostinger`,
  `deals-eleven`, `vo-eleven` …).
- **AKTIVE Verdiener (Links real eingetragen):**
  - `MURF_URL` = `https://get.murf.ai/hhd1supey3ea` ✅ (PartnerStack aktiv)
  - `ELEVENLABS_URL` = `https://try.elevenlabs.io/6hlkc0rv2u1j` ✅ (PartnerStack aktiv)
  - `HOSTINGER_URL` = `https://www.hostinger.com/?REFERRALCODE=T2IALLENGYBU` ✅ (Refer&earn, heute aktiviert, PR #801)
- **ManyChat:** NICHT in Users PartnerStack → bewusst **entlabelt** (neutrale Empfehlung, `MANYCHAT_URL:""`,
  rel=noopener, kein „*"). Erst wieder Affiliate, wenn echter Tracking-Link da.
- **Leer/wartend (User meldet sich bei Programm an → schickt Link → dann Key setzen):** `SEVDESK_URL`,
  `LEXOFFICE_URL`, `BEXIO_URL` (via Awin), `BREVO_URL`, `MAILERLITE_URL`, `GETRESPONSE_URL`, `IONOS_URL`,
  `WEBFLOW_URL`, `CANVA_URL`.

### 🧭 Wichtige strategische Erkenntnis (aus User-Screenshots)
- Users **PartnerStack** hat NUR **Murf + ElevenLabs** aktiv. **PartnerStack-Sperre:** weitere Programme (ManyChat
  etc.) lassen sich erst freischalten, **nachdem die ERSTE Provision** über Murf/ElevenLabs verdient wurde.
  → Deshalb **Voice-Traffic priorisiert** (führt zur ersten Provision, die alles andere aufschließt).
- **Unabhängige Programme** (Hostinger, Brevo, Canva, sevDesk/Awin …) haben die PartnerStack-Hürde NICHT →
  können sofort nach Freigabe verdienen.

### 🆕 Heute gebaute Seiten (alle DE, viele auch EN; Funnel + FAQ/HowTo-Schema, im Sitemap + tool-tipps-Hub)
- **aban Pro / KI-Studio:** 22 Text-Arten (gruppiert), Gratis-Demo `/api/demo` (Origin-Gate, 280 Tok, IP-Limit) auf
  Startseite + KI-Studio, „Kopieren"-Buttons, Newsletter-Fang im Upsell, vorausgefüllte Demo-Beispiele.
  Engine `functions/api/generate.js` (+`lang`), `functions/api/audit-report.js`, `functions/api/demo.js`.
- **API-Seite** `/api` (+`/en/api`): Doku + **Live-Playground** + FAQ-Schema.
- **KI-Sichtbarkeits-Audit** `/ki-audit` (+EN) Pro-gated; in den GEO-Hub `/ki-sichtbarkeit` + 21 Branchenseiten + EN
  integriert (Option B: 3 Wege — Gratis-Check / Sofort-Report Pro / Workbook 29€).
- **Affiliate-Reviews:** `/deals`(+EN), `/ki-chatbots`(+EN), `/buchhaltung-software`, `/email-marketing-tools`(+EN),
  `/website-hosting`(+EN), `/design-tools`, **Hub** `/tool-tipps`.
- **Voice-Funnel (→ ElevenLabs/Murf):** `/ki-stimmen` (bestehend), `/ki-voiceover`, `/ki-stimme-klonen`,
  `/text-vorlesen-lassen`, `/ki-podcast`.

### ✅ DEPLOY-STAU GELÖST (2026-06-13) — alles live
- Der Actions-Throttle vom 12.06. (~15:09 UTC) hat sich **über Nacht von selbst gelöst**; der Stau ist abgearbeitet.
- **Verifiziert live (curl, 13.06.):** `js/affiliate-config.js` enthält `REFERRALCODE=T2IALLENGYBU` (Hostinger-Link
  aktiv); alle Voice-Seiten liefern 200 (`/ki-voiceover`, `/ki-stimme-klonen`, `/text-vorlesen-lassen`, `/ki-podcast`);
  `/website-hosting` + `/tool-tipps` live; ManyChat-Fix (entlabelt, `MANYCHAT_URL=""`) ist live. **Nichts verloren.**

### ✅ TODO MORGEN (mit dem User)
1. **Hostinger-Affiliate-Formular** zu Ende ausfüllen (separates, höher-zahlendes Programm; Refer&earn läuft schon).
   Anleitung steht; „What makes you a great fit"-Text + Dropdowns „Yes" + Besucherzahl (NICHT die URL) eintragen.
2. **Brevo-Affiliate:** richtige URL **`https://www.brevo.com/partners/affiliates/`** — ⚠️ **braucht professionelle
   E-Mail `…@abannews.com`** (Gmail/Hotmail wird abgelehnt!). Sonst → **Canva** (über Impact.com, Gmail ok).
3. User schickt **Tracking-Link(s)** → in `affiliate-config.js` eintragen, committen, deployen (Seite verdient).
4. **Newsletter rausschicken** (fertiger Text steht im Chat: „Reels vertonen ohne Mikro…", verlinkt /ki-stimmen,
   /ki-voiceover, /ki-stimme-klonen) → holt die **erste Murf/ElevenLabs-Provision** → schaltet ManyChat & Co. frei.
5. **Prüfen, ob der Deploy nachgezogen ist** (Actions wieder frei?) — sonst weiter warten.

### 🟡 Weiterhin offen (nur User, für aban-Pro/Shop-Umsatz)
- **Lemon-Squeezy-Store aktivieren** (2FA/Review) → Pro/Audit/API kaufbar.
- **Stripe-Secret-Key** (`sk_live_…`, nicht `pk_…`) als GitHub- + Cloudflare-Pages-Secret → Shop-Produkte kaufbar
  (der frühere Shop-Workflow scheiterte an einem Publishable-Key → 403; `stripe_sync.py` ist jetzt non-destruktiv).

### 🔒 Sicherheit (heute geschärft)
- API-Keys/Passwörter NIE in die öffentliche `affiliate-config.js` — nur **Affiliate-LINK-URLs** (öffentlich ok).
  (User hatte einen ManyChat-**API-Key** angeboten — abgelehnt, ist NICHT der Affiliate-Link.)
- **Branch:** diese Session committet auf `claude/abannews-growth-monetization-hm6wod` → Draft-PRs → squash nach `main`.

## 🗂️ OFFENE AUFGABEN / BACKLOG (Stand 2026-06-07) — NUR auf Kommando des Users starten
> Der User hat gesagt: **nichts anfangen, bis er es sagt.** Diese Liste ist der gesammelte Backlog.
> Jeweils per Stichwort auslösbar.

**Autonom (ich, sobald „los"):**
1. ✅ `test` — Shop-Struktur verifiziert (5 ZIPs ↔ 5 Live-Stripe-Links CHF 12 ↔ Gate-Hash stimmen überein).
   Offen nur Browser-Live-Test (Cloudflare blockt meinen Fetcher): `…/api/kit-download?session_id=cs_test_123abc`
   muss `{"error":"Zahlung nicht gefunden."}` liefern. (Erledigt im Batch „1 7 10", PR #387.)
2. ✅ `mehr kits` — `data/kit-catalog.json` 5→11 Branchen (+coaches, immobilienmakler, friseure,
   fotografen, architekten, fitnessstudios). Stripe-Workflow legt Produkte/Links/ZIPs an. (PR #388.)
3. ✅ `hubs verlinken` — Shop-Link im Funnel-Block aller 262 `ki-fuer-*`-Hubs (`tools/add_branchen_funnel.py`). (PR #388.)
4. ✅ `muster` — `downloads/muster/geo-report-MUSTER.md` (erfundene Berner Firma, klar gekennzeichnet). (PR #388.)
5. ✅ `geo-cron` — `.github/workflows/geo-report.yml` (monatlich, Reports als privates Artefakt, no-op-sicher). (PR #388.)
6. `promote` — gesendete Newsletter-Ausgabe ins öffentliche Archiv (`build_issue.py --promote`) — NACH Versand. **(einzig offen)**
7. ✅ `nischen ausbau` — `--niche` durchgängig (news_aggregator/draft/build_issue + Dispatch-Input). (PR #387.)
8. ✅ `bausatz` — `tools/export_template.py` liefert LICENSE.txt (Single-Seat) + .env.example + LISTING.md. (PR #388.)
9. ✅ `lead-magnete` — 6 neue Branchen-Schnellstart-PDFs aus echten Hub-Use-Cases + Hub-Links. (PR #388.)
10. ✅ `og-chatgpt` — ruhiger abstrakter Amber-Verlauf als Hintergrund. (PR #387.)

**Nur User (extern):** TWINT-Freischaltung abwarten (in Prüfung) · Cloudflare-Env für Download bestätigen
(Check A) · `sk_live_` ist aktiv (Shop live) · optional `CF_TOKEN` (Analytics) + LinkedIn-Token · 3 Wachstums-
Hebel (organisch teilen, beehiiv-Referral, Posten) · erste Newsletter-Ausgabe senden.

**Schon erledigt (nicht offen):** verwaiste Hubs 201→0, €9/89-Checkout live, CHF+TWINT-Code, Bild-Pipeline
(Pexels+Imagen), Content-Engine, bild-reiche Ausgaben, 4 Geld-Grundgerüste, Stripe-Shop (Karte/CHF live).


## 📌 Stand 2026-06-12 (Teil 20) — Katalog-Wachstum nachgezogen (EN-Shop, Funnel, Schema) + Link-Cleanup
Session „voll gas / mach fertig / keine pause" (Newsletter-Workstream, parallel zum Pro/Märkte-Ausbau):
- **3 neue distinkte DE-Hubs + i18n:** Detektei, Textilreinigung, Personaldienstleister je DE/EN/FR/IT
  (PRs #453/#736/#738). **71 fehlende Branchen-PDFs** generiert (35 EN + 36 DE) → defekte Links runter.
- **Link-/Asset-Cleanup (#757):** fehlende Favicon-PNGs + `site.webmanifest` generiert, tote
  `/hype-watch`/`/sponsoring`-Links gefixt → **0 defekte aban-news-interne Links**.
- **3 verwaiste Hubs** (alpakahof/pilzzucht/straussenfarm) via `related_hubs.py` in den Ring (#759).
- **🔑 KATALOG-RESYNC-MUSTER (wichtig, wiederkehrend):** Wenn der Pro/Shop-Workstream `kit-catalog.json`
  erweitert (jetzt **22 Produkte**), müssen 3 abgeleitete Dinge nachgezogen werden — alle idempotent:
  1) **EN-Katalog** `kit-catalog-en.json` + `shop-products-en.json` (en-Slugs, EUR) — #794 (12→22).
  2) **EN-Funnel** `add_branchen_funnel.py --lang en` → neue Kit-Branchen kriegen Direkt-Deep-Link — #795 (8 Hubs).
  3) **Shop-ItemList-Schema** in `shop.html`+`en/shop.html` neu aus Katalog generieren — #798 (12→22).
  DE war dank Parallel-Workstream schon aktuell. `shop_selfcheck.py`: 0 Fehler, nur „Bezahllink leer"
  (18×, **user-gated** STRIPE_API_KEY).
- **Stand:** je **360 Hubs** DE/EN/FR/IT, Shop 22 Produkte DE+EN mit Preis+Schema, 0 Waisen, 0 interne Link-Leichen.
  Geld-Hebel unverändert beim User (`docs/MORGEN-TODO.md`): STRIPE_API_KEY→„sync", CF-Token, erste Ausgabe, Reichweite.

## 📌 Stand 2026-06-11 (Teil 19) — ⚠️ HOSTING-BEFUND + Edge-API auf Cloudflare Pages bewiesen
**Kernbefund (Live-Test):** `abannews.com` läuft aktuell auf **GitHub Pages** (statisch; Header `via: varnish` +
`x-github-request-id`, nur durch Cloudflare durchgeproxyt). Deshalb geben `/api/*` (KI-Studio, hype-rewrite, chat)
auf der Live-Domain **404/405** zurück — die `functions/`-Edge-API läuft dort GAR NICHT. (Das `CNAME` = abannews.com
bestätigt GitHub Pages; die alte `CLOUDFLARE-SETUP.md`-Behauptung „läuft auf CF Pages" ist falsch.)
- **Cloudflare-Token (Preflight 11.06., `cf-preflight.yml`): „voll einsatzbereit"** — Pages-Deploy + DNS möglich,
  Account 33e521…, 10 Projekte (alles Radars), **keins mit Domain abannews.com**.
- **Gelöst ohne Browser, per API:** neuer Workflow **`.github/workflows/cf-deploy-mainsite.yml`** (Dispatch) baut ein
  sauberes `_site/` (rsync, exclude video-prototypes/reels/social/dropship/… wegen >25 MiB; `functions/`+`_headers`+
  `_redirects` drin) und deployt es per `wrangler pages deploy` ins Pages-Projekt **`abannews`** → **`abannews.pages.dev`**.
  **Berührt die Live-Domain NICHT.**
- **✅ BEWIESEN (11.06.):** Auf `abannews.pages.dev` laufen die Funktionen: `/api/pro-validate` → `{"valid":false}` (200),
  `/api/generate` → `{"error":"ai_off"}` (503 = Funktion läuft, nur Anthropic-Key fehlt), `/ki-studio` + `markets.json` = 200.
  → **Option A funktioniert.** Edge-API ist real, sobald die Hauptseite auf CF Pages liegt.
- **✅ ANTHROPIC_API_KEY WIRED + KI LIVE BEWIESEN (11.06.):** Key lag als GitHub-Secret; `cf-deploy-mainsite.yml`
  schreibt ihn per `wrangler pages secret put` automatisch ins Pages-Projekt. Test auf abannews.pages.dev:
  `/api/chat` → **echte Claude-Antwort (200)**, `/api/generate` → 402 pro_required (Key da + Gate greift). Backend fertig.
- **✅✅ DOMAIN-UMZUG DURCH (11.06., per API, autonom):** `cf-attach-domain.yml` (Trockenlauf→apply) hat die
  Custom-Domain aufs Pages-Projekt registriert, die 8 GitHub-Pages-Apex-Records (A/AAAA) gelöscht und CNAME
  `abannews.com` → `abannews.pages.dev` (proxied) angelegt. **MX (Porkbun-Mail) + TXT (SPF/Google-Verify) blieben.**
  **LIVE verifiziert:** abannews.com Header = `server: cloudflare` (GitHub-Marker weg); `/api/chat` → echte Claude-Antwort
  (200); `/api/generate` → 402 pro_required; Startseite/ki-studio/maerkte/shop/markets.json alle 200. Zone-ID
  67820161…, abannews.pages.dev.
- **✅ AUTO-DEPLOY (sonst friert die Direct-Upload-Seite ein):** `cf-deploy-mainsite.yml` deployt jetzt bei
  Inhalts-Pushes (paths-ignore für dropship/social/automation/memory) **+ alle 6 h** (fängt Bot-`[skip ci]`-Commits
  wie Märkte-Daten). wrangler lädt nur geänderte Dateien.
- **🟢🟢 PRO-FUNNEL KOMPLETT LIVE + END-TO-END BEWIESEN (11.06.):** LS-Produkt „aban Pro" (1136301), 2 Varianten +
  license keys. Checkout-Links in `js/pay-config.js` scharf: Monat €19 (var 1777687, buy 530fd3f2…, Checkout zeigt
  19,00 €), Jahr €190 (var 1777696, buy 4379ddc9…, price_label 190,00 € verifiziert). Premium-(€9)-Zweitbutton aus
  KI-Studio-Hero entfernt (Conversion-Fokus). **VOLL-FLOW getestet mit echtem Test-Lizenzschlüssel
  (1443574C-…, Status inactive 0/3):** `POST abannews.com/api/pro-validate` → `{"valid":true}` ✅;
  `POST /api/generate` mit `X-Pro-Key` → echte Claude-Antwort (200, markengerechter LinkedIn-Post) ✅. Kauf→Lizenz→
  Unlock→KI durchgängig bewiesen. **Offen nur noch: LS-Store-Freigabe** (war „under review") → dann echtes Geld,
  ohne weitere Änderung (Test↔Live = gleiche Mechanik). Test-Karte 4242 4242 4242 4242.

## 📌 Stand 2026-06-11 (Teil 18) — „aban Pro" + KI-Studio (Live-KI-Tools, gated per Lizenz)
User-Wunsch: „premium verbessern mit zusatz kosten wo man dich brauchen kann mit tools". Entscheid (User):
**neuer Pro-Tier €19/Mt (€190/Jahr)** zusätzlich zu Premium €9, mit **allen 4 Live-KI-Tools** + „alles vertiefen
und mehr Themen". Gebaut auf den vorhandenen Cloudflare-Pages-Functions.
- **Seite `ki-studio.html` + `en/ki-studio.html`** („aban KI-Studio"): Hero+Preis, **Lizenz-Unlock-Box**, 4 Tool-Panels
  (gesperrt bis Schlüssel da), „mehr Themen"-Teaser, Preis, FAQ. Frontend `js/ki-studio.js` (Unlock/validate/
  localStorage, Tool-Calls mit `X-Pro-Key`, graceful Fehler: ai_off→„noch nicht aktiv", pro_required, rate). DE/EN
  via `<html lang>`. Verlinkt: online-tools (Featured-Card), Home-Footer, founding.html (Upsell-Benefit), Sitemap.
- **Gating-Infra (Edge):** `functions/_pro.mjs` validiert einen **Lemon-Squeezy-Lizenzschlüssel** über
  `licenses/validate` — **braucht KEINEN Store-API-Key** (10-min-Cache). Kein Test-/Backdoor-Key (User-Wunsch).
  `functions/api/pro-validate.js` (POST {license_key}→{valid}). 
- **Tools (Claude, serverseitig):** `functions/api/generate.js` NEU (Texte/E-Mail/Fahrpläne, **Pro-Pflicht**, 503 ohne
  Key, 402 ohne Lizenz). `hype-check.js`: Claude-Umschreibung jetzt Pro-gated (Nicht-Pro → Regel-Fallback,
  `proRequired:true` — **free Hype-Filter bleibt unverändert**). `ki-erwaehnung.js`: Claude-KI-Check Pro-gated.
  Frag-aban Pro nutzt `/api/chat` (bestehend). Alle 84 Engine-Tests grün.
- **`js/pay-config.js`:** `PRO_MONTHLY_URL`/`PRO_YEARLY_URL` (LEER → Buttons zeigen ehrlich „Start in Kürze").
- **🟡 AKTIVIERUNG (nur User, 3 Schritte):** (1) **Cloudflare-Pages-Secret `ANTHROPIC_API_KEY`** setzen → Tools
  werden live (sonst 503/Fallback). (2) **Lemon-Squeezy Pro-Produkt** (€19/Mt, €190/Jahr) mit **„license keys"
  aktiviert** anlegen → Checkout-Links in `pay-config.js` `PRO_*` eintragen. Bis dahin: Seite live, Tools sagen ehrlich „noch nicht aktiv". Kosten: Claude nur
  bei Pro-Nutzung → durch das Abo gedeckt. Offene Kür: ki-werkzeug.html live an `/api/generate` hängen; weitere
  Tools (Content-Planer, E-Mail-Serien, Prompt-Veredler Pro, Markt-Briefing, Übersetzen) als „mehr Themen" geplant.
- **Ausbau (User „alles autonome und weiter"):** (a) **`ki-werkzeug.html` an Live-KI gehängt** — `AI_ENDPOINT=/api/generate`,
  schickt `X-Pro-Key` aus localStorage `aban_pro_key`; echte KI nur mit gültiger Pro-Lizenz, sonst Vorlagen-Fallback
  (free unverändert). (b) **Mehr Pro-Tools** in `generate.js`: neue `kind`s `contentplan`, `emailserie`, `translate`,
  `prompt` — Content-Plan + E-Mail-Serie sind im Studio-Dropdown „KI-Texte" live (✓), translate/prompt API-fertig
  (Panel folgt). (c) **Aktivierungs-Anleitung `docs/ABAN-PRO-AKTIVIEREN.md`** (Cloudflare-Key → LS-Pro-Produkt mit
  license keys → `pay-config.js` → Kundenablauf + Troubleshooting; kein Test-Key/Backdoor).
- **Ausbau-Runde 2 (User „weiter alles"):** KI-Studio hat jetzt **7 Tool-Panels** — neu: **Übersetzen & anpassen**,
  **Prompt-Veredler Pro**, **Markt-Briefing** (zieht `/data/markets.json` → Top-Mover → `generate.js` `kind:marketbrief`).
  JS-Cases in `ki-studio.js` (+`marketSummary()`). „mehr Themen"-Karten auf echte Roadmap umgestellt (Branchen-
  Vorlagen, geplante Reports, Team-Sitze, API-Zugang). **Startseite:** neuer „aban Pro"-Callout-Band (vor Dossiers)
  mit CTA ins KI-Studio + Premium. Alle 7 Tools laufen über die Edge-Funktionen, gated per Lizenz. **Startseiten-Preistabelle** jetzt 4-stufig: Free → Premium €9 → **Pro €19** → Founding.

## 📌 Stand 2026-06-10 (Teil 17) — NEUE „Märkte"-Sektion live (Krypto+Aktien+News+KI, DE/EN)
User-Bogen: „coole projekt / traiding" → „alles, neue seite bei abannews.com" → „mach autonom" →
„erweitere mit allem" → „wechsle aufs Gemini-Model" → „mergen / telegram vom abannews nehmen" →
„baue fertig / tiefgründiger / sauber + erweitern" → **„nur de und en"** (FR/IT wieder raus). Alles
gemerged (zuletzt PR #599, FR/IT-Revert). **Komplett live & autonom — diese (abannews-)Session besitzt das.**
- **Seite `/maerkte.html` + `/en/maerkte.html`** (Pretty-URLs `/maerkte`,`/markets`,`/trading` via `_redirects`):
  Ticker, kategorie-gruppierte Kurstabelle (Krypto/Aktien/Indizes/Rohstoffe), Markt-Stimmungs-Gauge,
  Top-Mover, 3 Rechner-Widgets (Umrechner/Spar/G+V), Watchlist (localStorage), Währungs-Switch (USD/CHF/EUR),
  KI-Sentiment-Karten, Per-Asset-News, FAQ/Schema. **Überall „keine Anlageberatung"-Disclaimer.**
- **42 Assets** (14 Krypto, 10 Aktien, **4 ETFs** als eigene Kategorie, 8 Indizes, 6 Rohstoffe) mit
  Detailseiten `maerkte/<id>.html` + `en/maerkte/<id>.html` (je 42) — Kennzahlen-Tabelle, strukturierte
  KI-Analyse (Treiber/Risiko/Einordnung), verwandte Assets, News, 30-Tage-Chart. Asset-Namen in Karten/
  Tabelle verlinken auf Detailseite. ETF-Typ: `js/markets.js` (Label/Order) + `build_markets_detail.py`.
- **Daten keyless:** Krypto live im Browser via **CoinGecko** (CSP `connect-src` in `_headers` erweitert);
  Aktien/Indizes/Rohstoffe via **Yahoo-Finance-Chart-Endpoint** (Stooq-Fallback), FX via Frankfurter/ECB,
  News via Google-News-RSS. Fetcher: `automation/markets_fetch.py` (+ `spark_stats`, 52W-Hoch/Tief, Volumen,
  Market-Cap, 7d/30d). Indizes als „Pkt" (keine Währungsumrechnung).
- **KI = Gemini** (nicht Claude — User-Wunsch, Gratis-Tier): `automation/markets_ai.py` nutzt
  `automation/gemini_text.py` (gemini-2.5-flash, `thinking_budget=0`, JSON-Output sentiment/confidence/
  rationale/signal/analysis), no-op ohne `GEMINI_API_KEY`. KI gibt **nie** Kauf/Verkauf-Empfehlung.
- **Automatik:** `.github/workflows/markets-build.yml` (Mo–Fr 06:00 & 16:00 UTC): fetch → Gemini →
  `build_markets_detail.py` (Detailseiten) → Telegram-Digest → commit `[skip ci]`. `markets-monitor.yml`
  wacht über Daten-Frische (Alert via `TELEGRAM_OWNER_ID`). Telegram-Digest reuse: `TELEGRAM_BOT_TOKEN`/
  `TELEGRAM_CHANNEL` (vom abannews-Bot). Alle Secrets bestätigt aktiv.
- **Vernetzung:** in Top-Nav + Footer; von online-tools.html + ki-und-krypto-daten.html + Rechner-Seiten +
  629 Branchen-Hubs verlinkt (siehe KI-WERKZEUG-HANDOFF.md). i18n nur DE/EN (`<html lang>`-getrieben).
- **Nebenbei gefixt:** 60 fehlende Branchen-PDFs (`generate_branchen_pdfs.py`-Parserfix) + 21 Hub-Bilder
  generiert; 3 tote related-Links. **Out-of-scope (andere Session):** tote `/products/`-Links in `dropship/`.
- **i18n-Stand FINAL: nur DE + EN.** FR/IT wurden auf User-Wunsch komplett zurückgebaut (hreflang/Switcher/
  Detailseiten). Lehre: globaler String-Replace für Übersetzungen zerstörte `id`/`for`-Attribute → kanonische
  DE-IDs als Referenz. Push-Lehre: 413-„request too large" kam von stalem `origin/main` → `git fetch` +
  `rebase origin/main`, dann packt git nur den eigenen Commit. Force-Push auf den Feature-Branch war freigegeben.
- **🟢 Offen: nichts Blockierendes.** Sektion läuft vollautonom. Kür erledigt: (1) **Mobile-Card-Layout**
  der Kurstabelle (≤560px → gestapelte Karten, CSS-only, DE+EN); (2) **vertiefte Detail-Charts** (30-Tage-SVG
  mit Hoch/Tief-Hilfslinien + Beschriftung + Endpunkt-Marker); (3) **mehr Assets** 32→42 inkl. neuer
  ETF-Kategorie. Neue Werte: Daten via Yahoo/CoinGecko gefüllt; KI-Sentiment ergänzt der nächste Gemini-CI-Lauf
  (bis dahin neutral). Sitemap (DE+EN) ergänzt + valide.
- **UX-Runde (User „mehr tabs, Liste kürzen, Startseite"):** (a) **Kategorie-Filter-Tabs** über der Tabelle
  (Alle/Krypto/Aktien/ETF/Indizes/Rohstoffe, mit Count) in `js/markets.js`; (b) **pro Gruppe nur 5 Zeilen +
  „mehr anzeigen (+N)"/„weniger"** (kein endloses Scrollen), `CAP=5`, `expanded`-State; (c) **Markt-Vorschau
  auf der Startseite** (`index.html`): Krypto-/Aktien-&-ETF-/Finanz-News-Block aus `/data/markets.json`
  (inline, CSP-safe, XSS-escaped, `hidden` bis Daten da) + CTA „Alle 42 Märkte". Sub-Text 22→42 korrigiert.
- **Geo-Anpassung (User „CHF in CH, EUR andere Länder + Sprache?"):** (a) **Währung nach Land** — Besucherland
  keyless via Cloudflare `/cdn-cgi/trace` (`loc=`): CH/LI→CHF, Eurozone→EUR, sonst USD; greift nur als Vorwahl,
  manuelle USD/CHF/EUR-Wahl (localStorage) gewinnt. In `js/markets.js` (`geoCurrency`/`applyCur`) **und** in der
  Startseiten-Vorschau (nutzt `markets.json`-`fx`). (b) **Sprach-Hinweis** `js/lang-suggest.js` — dezenter,
  dismissbarer Banner DE↔EN wenn Browsersprache ≠ Seitensprache (liest vorhandene `hreflang`-Alternates;
  **kein** Auto-Redirect, SEO-konform). Eingebunden auf `maerkte.html`/`en/maerkte.html`/`index.html`.
- **Sprach-Banner site-weit ausgerollt (User „entscheide du"):** `tools`-loser Injektor hat `lang-suggest.js`
  nach `announce.js` in **787 DE+EN-Seiten** mit `hreflang`-Alternates eingehängt (idempotent; 289 ohne
  Alternate übersprungen; dropship unberührt). Banner ist no-op-sicher → einmal ausrollen reicht für alle.

## 📌 Stand 2026-06-12 (Teil 17) — 3 neue Verticals + i18n + 71 PDF-Fixes (Voll-gas-Session)
User: „voll gas autonom". Erledigt & gemerged (PRs #453, #736, #738):
- **3 neue distinkte DE-Hubs:** Detektei, Textilreinigung & Wäscherei, Personaldienstleister (je 5
  Büro-Use-Cases, ehrliche Grenzen; Personaldienstleister betont AGG/EU-AI-Act-Hochrisiko/keine
  automatisierte Bewerberauswahl). Voll integriert (OG/Funnel/Lead-PDF/Related/Sitemap).
- **9 EN/FR/IT-Übersetzungen** der 3 neuen Hubs (#736) → volle 4-Sprachen-Parität. Fix dabei:
  it „mangiare"→„manganare" (Mangeln). Parallel-Workstream baute weiter aus → Stand jetzt **360 Hubs
  je Sprache** (DE/EN/FR/IT).
- **71 fehlende Branchen-PDFs generiert** (#738, 35 EN + 36 DE): Parallel-Workstream hatte Hubs ohne
  ihre Schnellstart-PDFs angelegt → 141 defekte Links → 70 (Rest: Hub-Hero-Bilder via site-images-
  Workflow + /hype-watch, beide nicht PDF-bezogen).
- **🔑 LEHRE (GitHub-Rate-Limit-Workaround):** Wenn die GraphQL-Mutation „ready for review" dauer-
  geblockt ist (Parallel-Workstream teilt den API-User): Draft-PR NICHT entdraften — stattdessen
  dieselben Commits unter neuem Branch-Namen pushen (`git push origin alt:neu-v2`) und PR direkt mit
  `draft:false` anlegen (REST geht) → sofort mergebar. Alte Draft-PRs danach schließen.
- **🔑 LEHRE (Race):** async-Hub-Agenten beendeten NACH meinem Commit und strippten die Tool-Asides →
  idempotente Tools danach erneut fahren. Besser: Agenten synchron, Tools erst nach Abschluss aller.

## 📌 Stand 2026-06-08 (Teil 16) — Volle 4-Sprachen-Hub-Parität + Schema + Abend-TODO
User: „alles weiter wo du kannst und das wo ich mache in todo abend". Erledigt & gemerged:
- **BreadcrumbList-Schema in ALLEN Hubs** (PR #442 EN, #444 FR+IT): `tools/add_en_hub_breadcrumbs.py`
  (generalisiert `--lang en|fr|it`, idempotent, Name/URL aus vorhandenem WebPage-JSON-LD) → EN/FR/IT-Hubs
  bekommen BreadcrumbList (EN/IT „Home", FR „Accueil"). Schema-Parität zu DE jetzt komplett.
- **6 EN-Hub-Übersetzungen** (PR #446): die zuletzt DE-only-Hubs (osteopathen, masseure, kinderbetreuung,
  tierheilpraktiker, tierphysiotherapie, orthopaedieschuhtechnik) → native EN, + 6 EN-Schnellstart-PDFs
  (`generate_branchen_pdfs.py --lang en`). **EN-Parität 262→268.**
- **12 FR+IT-Hub-Übersetzungen** (PR #447): dieselben 6 nach FR + IT (native, via parallele Agenten mit
  exaktem Sprach-Template). DE+EN-Hubs: hreflang fr+it + Nav auf konkrete Seiten. 12 Sitemap-Einträge.
  **→ DE/EN/FR/IT je 268 Hubs, volle Schema- + hreflang-Parität.** Alle JSON-LD + Sitemap-XML + Links validiert.
- **`docs/MORGEN-TODO.md` neu** (Abend-TODO, akkurat): 1) `STRIPE_API_KEY` (→ „sync": legt 6 fehlende DE-Kits
  + alle EN-Kits + Bundle an) · 2) Cloudflare-Deploy-Token · 3) Premium-Briefing-LS-Link (€19/€190 →
  „briefing-link") · 4) erste Ausgabe senden (→ „promote") · 5) Reichweite · 6) AGB-Anwaltscheck.
- **Lehre (Branch-Falle):** nach `merge_pull_request` ist man lokal auf `main` ausgecheckt → vor neuer Arbeit
  IMMER frischen Branch anlegen. Einmal versehentlich auf lokal-`main` committet → mit `git branch <neu> <sha>`
  + `git reset --hard origin/main` gerettet, dann sauber via PR gemergt. NIE direkt `main` pushen (blockiert).
- **Autonom erschöpft:** SEO/Schema/Conversion/Parität sind durch. Weiterer Umsatz hängt rein an den
  User-Schritten in MORGEN-TODO (v.a. `STRIPE_API_KEY` + Reichweite). Kein Tool erfindet Nachfrage.

## 📌 Stand 2026-06-08 (Teil 15) — Preise überall sichtbar + EN-Kit-Deep-Links + Shop-Schema (Loop)
User: „weiter in loop langsam" → „setzt überall kosten das die leute zahlen" → „weiter". Erledigt & gemerged:
- **EN-Funnel Kit-Deep-Links** (PR #403): `add_branchen_funnel.py` liest jetzt `kit-catalog-en.json`; die 11
  EN-Hubs mit eigenem Kit verlinken direkt auf `/en/shop.html#kit-en-<slug>` („View your industry kit →"),
  Rest generisch. Spiegelt das DE-Muster. **+ Fix:** toter `/hype-watch`-Link in ki-reels.html → `.html`.
- **Preise überall sichtbar** (PR #403): Cross-Sell-Blöcke mit konkreten Preisen auf **online-tools.html**
  (Shop CHF 12 · Premium €9/mo · Founding €69), **gratis-ki-tools.html** (nach dem PDF) und
  **archive/index.html** (Premium/Founding/Shop). Voller Shop-Katalog sichtbar: `shop-products.json` 5→**12
  Produkte** (11 Kits + Bundle CHF 79, 5 mit aktivem Stripe-Link), `shop-products-en.json` 0→**12** (€12/€79).
- **Shop Product/Offer-Schema** (PR #415): `ItemList` mit `Product`+`Offer` (Preis CHF/EUR + Kauflink) auf
  shop.html **und** en/shop.html → Kits können in Google mit Preis erscheinen (Rich Results). JSON-LD validiert.
- **Honesty geprüft:** premium-briefing.html zeigt €19/€190, aber Checkout leer → Button fällt **ehrlich** auf
  „Auf die Liste — Start in Kürze" (kein toter Kauf). consistency_check + check_internal_links grün.
- **🔴 Bottleneck bleibt Reichweite + fehlende Checkout-Links:** nur 5/11 DE-Kits + 0 EN-Kits haben Kauflinks.
  **Nur User:** `STRIPE_API_KEY`-Secret → `stripe_sync.py` legt restliche Links + Bundle an; Lemon-Squeezy-Abo
  fürs Premium-Briefing (€19/€190); Traffic (organisch teilen, beehiiv-Referral); erste Ausgabe senden.

## 📌 Stand 2026-06-07 (Teil 14) — Hub-Welle, AGB, Shop-SEO, EN-Funnel (Loop-Runde)
User: „Hintergrundaufgaben fertig + andere, gemütlich weiter, dann loop". Erledigt & gemerged:
- **6 neue Branchen-Hubs** (PR #397) via parallele Agenten gebaut + voll integriert: Osteopathen, Masseure,
  Tierheilpraktiker, Orthopädie-Schuhtechnik, Tierphysiotherapie, Kinderbetreuung. Je 5 Use-Cases + FAQ +
  JSON-LD + OG-Bild + Lead-Magnet-PDF + Funnel + Querverlinkung + Sitemap. **262 → 268 Hubs**, Audit sauber.
  (Hero-Bilder überlässt der site-images-Workflow mit Keys; hreflang/Sprachschalter auf existierende Ziele.)
- **AGB & Widerruf** (`agb.html`, PR #397) für digitale Shop-Produkte (CH-Recht, Widerruf bei Downloads) →
  Shop-Footer + Sitemap. ⚠️ vor scharfem Verkauf anwaltlich gegenlesen lassen.
- **Shop-SEO** (PR #398): FAQ-Sektion + **FAQPage-JSON-LD** auf shop.html **und** en/shop.html (Rich-Results).
- **EN-Funnel** (PR #399): `add_branchen_funnel.py --lang en` → Tools-/Shop-CTA (`/en/shop.html`) in allen
  262 EN-Hubs (internationaler Funnel).
- **⚠️ Kein Scheduler** (`ScheduleWakeup`/`CronCreate`) in dieser Umgebung → echter Timer-Loop nicht möglich.
  „Loop" = synchron Iteration für Iteration, solange der User „weiter" sagt. Pro Iteration: frischer Branch →
  PR → merge_pull_request → unsubscribe. **Lehre:** für jede Iteration WIRKLICH neuen Branch anlegen
  (einmal versehentlich auf den schon gemergten FAQ-Branch committet — ging gut, weil main den Inhalt schon hatte).
- **Offene Loop-Kandidaten (ehrlich, ohne Keys):** Product/Offer-JSON-LD auf shop (dynamische Preise → statisch
  riskant, zurückgestellt); Cloudflare-Web-Analytics-Snippet (no-op bis Token); shop_selfcheck+growth_audit ins
  Autopilot-Self-Monitoring; EN-Deep-Links Hub→eigenes en-Kit; weitere distinkte Hubs; Performance-Kleinfixes.
- **Geld-Hebel weiterhin nur beim User:** Stripe-Workflow starten (DE+EN inkl. Bundle), Cloudflare-radar-Token,
  Secrets, erste Ausgabe senden.

## 📌 Stand 2026-06-07 (Teil 13) — 4 Zusatz-Verbesserungen (schnellste zuerst) + International
User: „alle vier, schnellste zuerst, am Schluss Memory speichern". Auf Branch `claude/go-live-bundle-leadmagnets`:
- **(1) Go-Live-Selbsttest:** `tools/shop_selfcheck.py` prüft Konsistenz Katalog ↔ Live-Produkte ↔ ZIPs ↔
  Gate-Hash (mit `DOWNLOAD_SALT` auch ZIP-Namen). Go-Live-Reihenfolge in `docs/STRIPE-SHOP.md` ergänzt.
- **(2) Bundle „Alle Kits" (Default CHF 79, anpassbar):** Katalog-Eintrag `alle-kits` (bundle:true);
  `build_product_pack.py` baut Bundle-ZIP aus allen Einzel-Packs; `stripe_sync.py` sortiert Bundle nach oben
  + Flag; `shop.html` zeigt „SPAR-PAKET"-Badge + Hervorhebung.
- **(3) Lead-Magnete:** bereits 261/262 Hubs mit Gratis-PDF (nur `bestatter` ohne Use-Cases) → nichts zu tun.
- **(4) International/EN:** `generate_branchen_pdfs --lang en` (robuster Use-Case-Match „… use cases") → **257
  englische Spickzettel** + EN-Lead-Magnet-Block in EN-Hubs; `data/kit-catalog-en.json` (EUR, `en-`-Slugs);
  `build_product_pack --lang en` (englische Texte); `stripe_sync --catalog/--out/--state/--danke` = zweite
  Produktwelt → `data/shop-products-en.json`; **`en/shop.html`** + **`en/danke-kit.html`**; `stripe-shop.yml`
  baut/synct jetzt DE **und** EN; en/index + sitemap verlinkt. **Aktivierung wie DE: Stripe-Workflow starten.**
- **Weitere Vorschläge (offen, gut):** Widerruf/AGB für digitale Produkte; FAQ+FAQPage-Schema & Product-JSON-LD
  auf shop; Download-Härtung via R2+signierte URLs; Cloudflare-Web-Analytics (cookielos); Self-Monitoring
  (shop_selfcheck+growth_audit) in den Autopilot.
- **EN-Funnel für bezahlte Kits noch nicht in EN-Hubs** (add_branchen_funnel läuft nur auf DE-Root-Hubs) —
  optionaler nächster Schritt: EN-Variante des Tools-CTA-Blocks für `en/`-Hubs.

## 📌 Stand 2026-06-07 (Teil 12) — Backlog fertig + Konversions-Politur
Auf „weiter machen" autonom abgearbeitet, jeweils frischer Branch → Draft-PR → per
`merge_pull_request`-Tool nach main gemerged (direkter main-Push bleibt classifier-blockiert):
- **PR #388 (gemerged):** Backlog #2/#3/#4/#5/#8/#9 — Shop-Funnel in alle 262 Hubs, +6 Kits +6 Lead-
  Magnet-PDFs, GEO-Report-Cron + Muster, Bausatz-Lizenz/Listing. voice-linter nimmt `downloads/`+`reports/` aus.
- **PR #389 (gemerged):** Newsletter-CTA auf 12 weitere Inhalts-/Konversionsseiten (DE+EN-Block,
  `</body>`-Fallback). Audit „ohne Newsletter-CTA" 21→9 (Rest bewusst B2B/Transparenz/auto-generiert).
- **shop.html (dieser Branch):** „Was steckt drin"-Block + Gratis-First-Querlink; **TWINT-Claim entfernt**
  (TWINT noch in Stripe-Prüfung → nur „per Karte" versprechen, bis live). founding.html TWINT-Buttons sind
  ohnehin `hidden` bis URL gesetzt — ehrlich, kein Fix nötig.
- **growth_audit jetzt:** 0 ohne OG, 0 Hub ohne Funnel/Founding, 0 defekte Links, 0 verwaiste Hubs.
- **Offen Backlog: nur noch #6 `promote`** (erst nach echter gesendeter Ausgabe).
- **User-Restaufgaben:** Cloudflare-`radar`-Token re-scopen (Deploy-CI Auth-Error 10000, betrifft jeden
  Commit, nicht mein Diff) · `Stripe-Shop`-Workflow 1× starten (6 neue Kits → Produkte/Links/ZIPs) ·
  Browser-Check `…/api/kit-download?session_id=cs_test_123abc` → `{"error":"Zahlung nicht gefunden."}`.

## 📌 Stand 2026-06-07 (Teil 11) — Batch „1 7 10" + Branch/CI-Lage (WICHTIG für nächste Session)
Erledigt: Backlog **#1 (test), #7 (nischen ausbau), #10 (og-chatgpt)** — siehe Backlog-Häkchen oben.
- **⚠️ Push nach `main` wird vom Auto-Mode-Classifier BLOCKIERT** (direkter Default-Branch-Push + Force-Push
  verweigert). Der alte Branch `claude/ai-money-project-f25Ub` ist hoffnungslos divergiert (Force nötig → blockiert).
  → Diese Arbeit liegt daher auf **frischem Branch `claude/nische-og-shop-test`** = **Draft-PR #387** (base main).
  **Merge nach main = User** (oder per merge_pull_request-Tool, falls erlaubt). Crons laufen erst ab main.
  **Lehre nächste Session:** für aban-Arbeit gleich einen frischen `claude/<thema>`-Branch + PR nutzen, nicht main.
- **CI-Lage PR #387:** „Workers Builds" (aban-a/ki-verzeichnis/aban-news-landing) = `skipped` (fremde
  Worker-Projekte im selben Repo, nicht mein Diff). **„Deploy to Cloudflare Pages" = FAIL: Auth-Error 10000** —
  `CLOUDFLARE_API_TOKEN` hat keine Rechte fürs Pages-Projekt `radar`. **Nicht durch meinen Diff verursacht**
  (Token-/Secret-Problem, scheitert auf jedem Branch). **Fix = User:** Token-Permissions im CF-Dashboard.
- **Abonniert:** PR #387 (Failure-Webhooks wecken mich). Kein Scheduler-Tool hier → keinen Timer-Check-in.

## 📌 Stand 2026-06-07 (Teil 10) — Vollautonomer Stripe-Shop (Tool)
Auf Wunsch „bau ein Tool, das das autonom macht": **Stripe** statt Lemon Squeezy, weil Stripe Produkte/
Preise/Bezahllinks **per API** erlaubt (LS nicht — daher dort 1 manueller Upload nötig).
- **`automation/stripe_sync.py`** — legt je Kit aus `data/kit-catalog.json` idempotent Produkt+Preis(EUR)+
  Payment-Link an (Redirect → `danke-kit.html`), schreibt `data/shop-products.json` (+ `data/stripe-state.json`). No-op ohne `STRIPE_API_KEY`.
- **`functions/api/kit-download.js`** (Cloudflare Pages Function) — verifiziert die Stripe-Session
  serverseitig und gibt erst dann den Download frei; Dateiname **gehasht via `DOWNLOAD_SALT`** (unrätbar).
- **`danke-kit.html`** (Redirect-Ziel, noindex) holt den Link; **`shop.html`** liest `data/shop-products.json`
  (Fallback `js/shop-config.js`). **`.github/workflows/stripe-shop.yml`** baut Kits → legt sie gehasht in
  `downloads/kits/` → `stripe_sync` → committet. Doku `docs/STRIPE-SHOP.md`.
- **🟡 Einmalige Aktivierung (User):** Stripe-Konto + Secrets `STRIPE_API_KEY`, `DOWNLOAD_SALT` (GitHub UND
  Cloudflare-Pages-Env). Dann Workflow starten → Shop live, danach neue Branchen = Katalog ergänzen, kein Klick mehr.
- **Ehrlich:** soft-gated (kein hartes DRM bei statischem Hosting; für €12-Kits ok; Ausbau: R2 + signierte URLs).
  Stripe ≠ MoR (bei CH/MwSt-frei unkritisch). LS-Variante (`shop-config.js`) bleibt als MoR-Alternative bestehen.

## 📌 Stand 2026-06-07 (Teil 9) — 4 Automation-Geld-Grundgerüste (neu, no-op-sicher)
Neue Projekt-Gerüste zum Geldverdienen mit Automation (alle nutzen vorhandenen Stack, ehrlich):
- **#1 GEO-Report-Abo (B2B, wiederkehrend):** `automation/geo_report.py` → `reports/geo/<marke>-<monat>.md`
  (KI-Sichtbarkeits-Einschätzung je Kunde via gemini_text, ehrlich als Momentaufnahme gekennzeichnet).
  Config `data/geo-clients.json` (Vorlage `.example.json`). Doku `docs/GEO-REPORT.md`. Größtes MRR-Potenzial,
  braucht Akquise. No-op ohne Key/Kundenliste.
- **#3 Digital-PDF-Shop (passiv):** `automation/build_product_pack.py` → `downloads/packs/<slug>/`
  (Branchen-PDF + prompts.md + checkliste + LIESMICH; Gemini oder ehrlicher Fallback). Storefront `shop.html`
  liest `js/shop-config.js` (Lemon-Squeezy-Links, leer = „bald"). Doku `docs/PDF-SHOP.md`. MoR regelt MwSt.
- **#2 Nischen-Newsletter:** Pipeline klonen je DACH-Nische. `data/niches.example.json` + `docs/NISCHEN-NEWSLETTER.md`
  (Ausbau: `--niche`-Flag in news_aggregator/draft). Skaliert fast gratis.
- **#4 Autopilot-Bausatz:** `tools/export_template.py` → `dist-template/` (generische Bausteine ohne Secrets/Inhalte
  + README + leere Queues) zum Verkauf als Boilerplate. Doku `docs/AUTOPILOT-BAUSATZ.md`.
- **Build-Artefakte gitignored:** `dist-template/`, `downloads/packs/`. **Alle 4 sind Grundgerüste** — Inhalte/
  Akquise/Verkaufslinks = Mensch. Ehrliche Grenze überall notiert (Automation macht Arbeit, nicht Nachfrage).

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

## 📌 Stand 2026-06-07 (Teil 8) — Bild-reiche Ausgaben + €9-Checkout + Lemon-Squeezy-Live-Zahlen
- **Längere, bild-reiche Newsletter-Ausgaben:** `draft_with_gemini.py` schreibt jetzt **strukturiert**
  (INTRO/UPDATE/WAS/QUELLE/BILD/TIEFER/TOOL/PROMPT/OUTRO), Ziel **1100–1300 Wörter** (maxTokens 4000),
  „länger = mehr Erklärung, KEINE neuen Fakten". NEU `automation/build_issue.py` baut daraus eine fertige
  HTML-Ausgabe (`data/issue-<DATUM>-draft.html`, NOINDEX, beehiiv-Copy-Paste) mit **Bildern pro Update**
  (abwechselnd Pexels-Foto / Imagen-Illustration via `BILD:`-Hinweis), **Cover**, und **optionalem echten
  Chart** nur wenn `automation/issue-data-<DATUM>.json` existiert (`gen_chart`, Quelle Pflicht → nie Fake).
  Selbst gehostet `img/issues/<DATUM>/`, absolute URLs (laden in beehiiv+Web). Brand-Voice-Gate. Lokal getestet
  (Karten-Fallback, Chart-Pfad). Workflow `gemini-draft.yml` erweitert (Bild-Secrets, committet issue+img).
  Linter ignoriert `entwurf-gemini-*.md`. **Versand bleibt Mensch** (beehiiv).
- **€9/€89-Premium-Checkout LIVE:** Lemon-Squeezy-Links in `js/pay-config.js` (Monats+Jahres), Startseiten-
  Button mit Toggle aktiv. **Währung: international** — Seite zeigt **€**, LS (MoR) rechnet beim Checkout in
  Landeswährung um + Steuer. 🟡 **User: beide LS-Produkte von CHF auf EUR stellen** (Anzeige=Abbuchung).
  Founding bleibt €69. Hinweis „Preis in €; beim Checkout ggf. Landeswährung" auf index.
- **Lemon-Squeezy Live-Zahlen:** `automation/ls_stats.py` → `data/ls-stats.json` (echte aktive Abos aus
  LS-API, MRR-Schätzung aus Listenpreisen), läuft im **Autopilot** (Secret `LEMONSQUEEZY_API_KEY` aktiv),
  erscheint im **`tools/status.py`**-Dashboard. No-op ohne Key. 🔴 Falls LS-API-Key je im Chat war → rotieren.
- ✅ **VERIFIZIERT (CI):** `data/issue-2026-06-07-draft.html` gebaut — **~1010 Wörter, 5 Updates, 6 Bilder
  gemischt** (Imagen-Cover + Pexels-Fotos + Imagen-Illustrationen). KI-PNGs werden zu schlanken JPGs optimiert.
- 🔴 **WICHTIGE LEHRE (Text-Modell):** `gemini-2.0-flash` ist **abgeschaltet** (Vertex „no access" + Dev-API
  „no longer available"). Fix: `automation/gemini_text.py` probiert **mehrere aktuelle Modelle** der Reihe nach
  (gemini-2.5-flash → gemini-flash-latest → 2.0-flash-001 → 1.5-flash), je Modell **Vertex → Developer-API**.
  Damit funktionieren jetzt **alle Text-Generatoren** (Ausgaben-Entwurf, Content-Engine/Posts, Autopilot-Top-up).
  draft_with_gemini + gemini_generate_posts nutzen gemini_text. Workflows haben GCP-Text-Env + google-auth.
- 🔑 **Webseiten-Bilder-Fortschritt:** ~150/262 Hub-Header-Bilder erzeugt (CI-Batches); Autopilot füllt täglich 25 nach.
- ✅ **Content-Engine läuft (verifiziert):** erzeugt echte Gemini-Posts (Queue ready 6). **LEHRE gemini-2.5-flash:**
  das Modell verbraucht Output-Budget fürs interne „Thinking" → kurze maxOutputTokens schneiden Antworten ab.
  Fix: `gemini_text.generate(..., thinking_budget=0)` schaltet Thinking ab (Content-Engine nutzt das); für den
  langen Newsletter-Entwurf bleibt Thinking an (maxTokens 4000). Damit füllt der Autopilot die Post-Queues autonom.
- 🟢 **Gesamtstatus Bild/Text-Pipeline:** Telegram-Posts mit Bild ✅, Content-Nachschub ✅, bild-reiche Ausgabe ✅,
  OG-Bilder mit Imagen-Hintergrund ✅ (3/4; chatgpt-OG Fallback flach), Hub-Bilder laufen nach, €9/€89-Checkout live.

## 📌 Stand 2026-06-07 (Teil 7) — Webseiten-Bilder + Effizienz-Tools
- **Webseiten-Bilder (`automation/gen_site_images.py` + `.github/workflows/site-images.yml`):** Header-Bilder pro Seite, selbst gehostet in `img/site/`, idempotent nach erstem `</h1>` eingefügt (Marker `data-aban-hero`, lazy, object-fit). Quelle gemischt/budgetbewusst: **Hubs=Pexels (gratis), themen/index/founding=KI/Imagen (~$1)**. Workflow manuell + batch-fähig (Pexels-Limit ~200/h). Test (3 Hubs) ✅ echte Fotos. Volle Läufe gestartet (hub batch 150 + themen).
- **Selbst-vervollständigend:** Autopilot füllt täglich **25 Hub-Bilder** per Pexels nach (`ABAN_IMG_BATCH`, idempotent) → die 262 Hubs komplettieren sich über ~Tage von selbst. `PEXELS_API_KEY` jetzt auch in autopilot.yml; Commit-Pfade um `img/` erweitert.
- **Effizienz-Tools (Wunsch „einfacher/schneller für später"):**
  - **`tools/status.py`** — Ein-Blick-Dashboard: Queue-Stände, Hub/themen-Abdeckung (Funnel/Lead-Magnet/Bild/CTA/Verlinkung), Bilder/PDFs, letzte Audit-/Konsistenz-Befunde. Ein Befehl statt vieler greps.
  - **`Makefile`** — Kurzbefehle: `make status|audit|growth|consistency|links|funnel|related|cta|leadmagnets|sharekit|og|all-content|check`. `make help` listet alles. (Lokale Wartung; Posten/Bilder laufen in CI wegen Secrets.)
- **🟡 €9-Premium-Checkout fehlt bewusst:** Premium-Karten zeigen auf Founding (€69, PayPal). Für €9/Monat braucht es einen Zahlungsanbieter (PayPal-Abo/Stripe/beehiiv-Paid) = User-Setup; `premium-briefing.html` hat schon Config-Slot `PREMIUM.monthly.url` (leer → Warteliste, kein toter Link).

## 📌 Stand 2026-06-07 (Teil 6) — Pexels-Variante (echte Stockfotos)
- **`automation/pexels_image.py`:** lädt echte, lizenzfreie Fotos von Pexels (gratis API, no-op ohne `PEXELS_API_KEY`). Kuratierte warm/professionelle Suchbegriffe (Arbeitsplatz/Objekt-lastig, wenig Gesichter), Orientierung je Seitenverhältnis, deterministische Auswahl pro Thema.
- **`visuals.build_visual` Quelle wählbar** via `ABAN_IMAGE_SOURCE`: `auto` (Default: Pexels falls Key, sonst KI) · `pexels` · `ai`. Reihenfolge: **Pexels → Imagen → Marken-Karte**, alles no-op-sicher; `ABAN_DISABLE_IMAGE_GEN=1` = globaler Aus-Schalter.
- **Workflows** (telegram-autopost, linkedin-autopost, telegram-control) bekommen `PEXELS_API_KEY` + `ABAN_IMAGE_SOURCE` + `ABAN_DISABLE_IMAGE_GEN`. Setup: `docs/AKTIVIERUNG.md` §5b. 🟡 **User: `PEXELS_API_KEY` als Secret setzen** (gratis: pexels.com/api) → dann echte Fotos. Pexels-Lizenz: kommerziell erlaubt, Namensnennung erwünscht (nicht Pflicht).

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
