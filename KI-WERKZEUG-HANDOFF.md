# 🛠️ Session-Handoff — KI-Werkzeug (`ki-werkzeug.html`)

> Für die separate Tool-Session. Stand 2026-06-09. Enthält die **Antworten/Entscheidungen des Users**
> (aus dem Newsletter-Chat durchgereicht) — bitte hier weiterbauen, nicht im Newsletter-Chat.
> **User-Wunsch (2026-06-09 Nacht): Memory regelmäßig speichern/aktualisieren.**

## 📌 2026-06-09 (Abend/Nacht) — LinkedIn live · Site-Rettung · neues Tool · Autonomie-Taktung
**🔴 WICHTIGSTES (Site war down!):** `abannews.com` gab **404** — Ursache: Repo war **privat**, GitHub Pages
veröffentlicht privat nicht (Free-Plan). **Fix:** Repo auf **Public** (User), Pages-Source `main`/root,
**`.nojekyll` hinzugefügt** (PR #548 — 4.824 Dateien killten den Jekyll-Build). Seite wieder **live** (200).
- **Merke:** `.nojekyll` NIE löschen. Bots pushen oft → viele Pages-Builds canceln sich; nach erstem Erfolg
  bleibt die Seite trotzdem auf letzter guter Version. `…github.io/...` 404 ist normal (Custom-Domain übernimmt).
- **Offen (User, morgen wenn Kreditkarte entsperrt):** optional GitHub **Pro** → Repo wieder **Private** (Pages
  läuft mit Pro privat weiter). Sonst Public lassen = gratis + unbegrenzte Actions-Minuten (besser für die Bots).
- **Secret-Scan vor Public:** Tree + ganze Historie sauber (keine Tokens/Keys) — Public ist sicher.

**🔗 LinkedIn-Autopost LIVE (Profil):** Erster Post ging raus (`urn:li:share:7470177626050138112`).
- `automation/linkedin_post.py`: **Author-URN wird selbstheilend aus dem Token geholt** (`/userinfo`→`/me`),
  + Ziel-Schalter **`LINKEDIN_POST_TARGET`** (`person`/`org`/`both`) + optionaler **`LINKEDIN_ORG_ACCESS_TOKEN`**
  (zweite App) + race-sicherer Persist (`pull --rebase`+retry). PRs #535/#537/#538/#544/#546.
- **Token-Lehre:** Token MUSS `openid profile w_member_social` haben (sonst 403/422). Jedes Neu-Erzeugen im
  Token-Generator **revoked den alten** → zuletzt erzeugen, sofort ins Secret. Läuft ~2 Monate, dann erneuern.
- **Cron:** werktags 08:00 UTC, 1 Post/Tag. Queue `social/linkedin_queue.json` = **71** (1 posted).
- **Firmenseite-Posting per API = SACKGASSE:** Community Management API braucht Verifizierung **und** muss
  einziges App-Produkt sein → für Einzel-Devs praktisch nicht freischaltbar. **→ Seite via Buffer/Publer**
  (offizielle Partner). Export gebaut: `automation/export_page_queue.py` → `social/linkedin_page_export.csv` +
  `…_posts.txt` (User: Publer-Gratis sperrt CSV-Bulk → „Auto Schedule" Post-für-Post, oder Buffer).

**🎨 Marken-Assets (für LinkedIn, im Repo):** `brand/linkedin-banner.png` (1584×396) + `brand/linkedin-avatar.png`
(400×400) + Generatoren (`brand/gen_linkedin_*.py`). Profil-/Seiten-Texte (Headline/About/Slogan/Specialties)
im Chat geliefert.

**🆕 Neues Gratis-Tool (PR #549):** **`ki-hype-detektor.html`** (+ **`en/ki-hype-detektor.html`**, hreflang-Paar) —
Text einfügen → Buzzwords markiert, **Hype-Score 0–100**, Klartext-Übersetzung. Clientseitig, kein API/Datenversand,
HTML-escaped (kein XSS), kuratiertes Buzzword-Wörterbuch. Headless getestet (ehrlich→0, Hype→100). Verdrahtet:
Sitemap, `online-tools.html`, LinkedIn-Queue (`aban-tool-hype-detektor`, postet als Nächstes).
  **Nachgezogen:** EN-Version (PR #551, hreflang-Paar) + **Teilen-Buttons** (LinkedIn/X/WhatsApp/Native/Copy, Score
  im Share-Text → viraler Loop) DE+EN + Querverlinkung in `ki-start.html` (Kachel) & `ki-glossar.html` (Band).
- **Glossar 26 → 33 Begriffe** (PR #553): Chain-of-Thought, Vibe Coding, MoE, Jailbreak, Synthetische Daten,
  Latenz, Deepfake (korrekt, anti-hype). In `generate_ki_glossar.py` (TERMS) ergänzt → `ki-glossar.html` neu
  erzeugt (Titel/JSON-LD/Count automatisch). **WICHTIG: ki-glossar.html ist GENERIERT** — Änderungen IMMER im
  Generator machen, sonst überschreibt der nächste Lauf sie (Hype-Link im Band ist jetzt im Generator). Zahl-Refs
  in index/online-tools/ki-start auf 33 aktualisiert. Begriffe füttern auch die Social-Posts (gen_social_content).
- **OG-Bild für Hype-Detektor** (PR #554): `brand/gen_og_hype.py` → `og-ki-hype-detektor.png` (1200×630, Marke
  + ehrlich→Hype-Balken); `og:image` + `twitter:card` auf beiden Hype-Seiten → bessere Teil-Klickrate.
- **Vergleiche 194 → 197** (PR #554): Perplexity hatte keinen Vergleich mit den großen Chatbots → in
  `data/tools.json` `perplexity.alternatives += chatgpt/gemini/claude` → `generate_tool_vergleiche.py` erzeugt
  **chatgpt-vs-perplexity / gemini-vs-perplexity / claude-vs-perplexity** (Top-Suchbegriffe). Hub+Zahl-Refs auto/
  manuell auf 197. **Merke:** `vergleich/*` + Hub sind GENERIERT; neue Paare über `alternatives` in tools.json +
  Regenerieren; Sitemap-Zeilen manuell aus `vergleich/_sitemap-fragment.txt` nachziehen.
- **LinkedIn-Queue Welle 2** (PR #555): +10 Themen-Posts via `automation/seed_theme_posts.py` (bewerben die neuen
  Inhalte: Perplexity-Vergleiche, Vibe Coding, Deepfake, Chain-of-Thought, Hype-Detektor-Challenge, Prompt-Rolle …).
  **Queue jetzt 81 (~16 Wo. Werktags-Vorrat).** Seed-Skript ist idempotent (Präfix `aban-theme-`).
- **Neues teilbares Tool: `ki-bullshit-bingo.html`** (PR #556) — spielbares Buzzword-Bingo fürs „KI-Meeting"
  (5×5, Freifeld, Win-Detection, neue Karte/Reset/Drucken, Teilen-Buttons). Selbst-ironisch zum Claim „kein
  Buzzword-Bingo". Clientseitig, druckbar. Verdrahtet: online-tools, Sitemap, Querlink vom Hype-Detektor.
  Headless getestet (12 Gewinnlinien korrekt, Syntax ok).
- **Neues Tool (praktisch): `ki-richtlinie.html`** (PR #557) — KI-Richtlinien-Generator: Klicks → fertige
  „KI-Nutzungsrichtlinie fürs Team" (erlaubte Tools, Tabu-Daten, Prüfpflicht, Ansprechperson) zum Kopieren/Drucken.
  Clientseitig, keine Rechtsberatung. Echter KMU-Bedarf (DSGVO-Check empfiehlt genau das). Verdrahtet: online-tools,
  Sitemap, ki-start-Kachel, Querlink aus dem DSGVO-Check-Band. Syntax ok.
- **2 weitere Tools (PR #558):** `ki-prompt-checker.html` (Prompt-Verbesserer: prüft Rolle/Kontext/Format/
  Beispiel/Grenzen → Score 0–100 + fehlende Bausteine + Gerüst; headless: vage 25, detailliert 88) und
  `avv-anfrage.html` (AVV/DPA-Anfrage-Mail an KI-Anbieter + Datenschutz-Fragen, Copy + mailto). Beide clientseitig,
  verdrahtet (online-tools, Sitemap, ki-start, Querlinks). **Gratis-Tool-Familie jetzt 15+.**
- **OG-Bilder für 4 neue Tools** (PR #559): `brand/gen_og_tool.py` (parametrisiert, auto-fit Titel + Umbruch) →
  og-ki-bullshit-bingo / og-ki-richtlinie / og-ki-prompt-checker / og-avv-anfrage.png; `og:image` je Seite gesetzt
  (besseres Teilen). **Hinweis: Gemini lt. User aufgebraucht** → Gemini-Bots (autopilot/cover/Bild-Gen) pausieren
  no-op-sicher; Autopost fällt auf Text/Pexels zurück; deterministischer Verbesserer + Tools + Build laufen weiter.
- **Newsletter-Hebel offen (nur User):** beehiiv liefert nur Link, kein Inline-Formular. **beehiiv-Embed-Snippet**
  (`<iframe src="https://embeds.beehiiv.com/…">` aus Settings→Subscribe Forms) → dann baue ich Inline-Signup site-weit
  statt nur Weiterleitung (= direkter Abonnenten-Boost).

**🤖 Autonomie-Taktung (PR #550) — User-Wunsch „1+2, Gemini jeden 2. Tag, 2×/Tag":**
- **`autopilot.yml`** (Gemini-Autopilot: Content/Queues/Newsletter-Entwurf/Audit) → **jeden 2. Tag** (`0 5 */2 * *`).
- **`daily-improvement.yml`** (deterministischer Verbesserer: Auto-Fixes+Scan+Report) → **2×/Tag** (`0 6,18 * * *`).
- **`aban-director.yml`** (Analytics) alle 4h bleibt. Alle no-op-sicher, committen `[skip ci]`.
- **EHRLICH zur Browser-/Desktop-Autonomie:** Diese Cloud-Session hat **KEIN Browser-/Desktop-Tool** → kann sich
  NICHT in Dashboards einloggen (LinkedIn/Stripe/TikTok/Publer/GitHub-Web). „Claude für Chrome" ist ein separates
  Claude im User-Browser (braucht User da). Logins an unbeaufsichtigten Bot delegieren = nicht sicher. Autonom geht:
  Code/Repo/GitHub + verbundene MCP (Shopify). Dashboard-Schritte bleiben User (ich bereite auf „1 Klick" vor).
- **TikTok-Pixel: vom User gestrichen** („ohne tiktok pixel").

**🟡 Mini-Aufräum offen (kein Live-Einfluss):** PR #546 (Org-Token-Code, durch Buffer-Pivot überflüssig) +
PR #547 (Seiten-Export) hingen am GitHub-Rate-Limit — bei Gelegenheit mergen/schließen.

## 📌 2026-06-09 — Tag-Bilanz (Newsletter-Site, ~43 PRs, alles live auf main)
**Neue Gratis-Tools/Projekte:** KI-Werkzeug DE+EN (+Phase-2-Worker `workers/ki-werkzeug-ai/`), Welche-KI-Finder
(`welche-ki-fuer-was.html`, lädt `data/tools.json`), Prompt-Baukasten (DE+EN), Readiness-Check (DE+EN),
KI-Glossar (DE+EN, Generator `generate_ki_glossar.py`), Spar-Rechner, DSGVO-Schnellcheck, Start-Hub (`ki-start.html`),
**194 Tool-Vergleiche** (`generate_tool_vergleiche.py` → `vergleich/`), **Newsletter-LP** (`newsletter.html`).
**Reichweite/Conversion:** Header-Banner `js/announce.js` auf 745+ Seiten; Funnel in 599 Branchen-Hubs; Lead-Magnet-PDFs
auf Tool-Seiten verlinkt; **Social-Content-Queue** `automation/gen_social_content.py` → `social/aban-content-queue.csv`
(62 Vorlagen, NICHT auto-gepostet); Anti-Hype-Cover via Gemini (`automation/gen_buch_cover.py` + Workflow).
**3 Einnahme-Richtungen:** A) KI-Sichtbarkeits-Monitor 9 €/Mon (Funnel steht), B) Texte-Service (`texte-service.html`),
C) White-Label (`fuer-verbaende.html`).
**🟡 OFFEN (User/Infra):**
- **Stripe-Monitor-Link** (9 €/Mon) → in `js/checkout-config.js` `MONITOR_ABO_URL` (User schickt Link, ich verdrahte).
  Lemon-API kann KEINE Produkte anlegen; Lemon-Store hat nur „aban news Premium"(2×)+Buch → Stripe gewählt.
- **CTA-Label A/B/C** site-weit vereinheitlichen (User-Wahl offen).
- **Worker deployen** für echte KI (README in workers/ki-werkzeug-ai).
- **Projekt 5 (Sichtbarkeits-Report-PDF)** + **6 (mehr Branchen-Kits)**: brauchen reportlab/CI + Produkt-Entscheidungen → offen.
- EN-Finder bleibt DE (tools.json-Notes sind deutsch).

## 📌 2026-06-09 (Teil 3) — 3 Einnahme-Richtungen + Header-Banner (User: „alle reihenach")
- **Header-Banner site-weit (#499):** `js/announce.js` — schließbar (7T), de/en, rotiert: KI-Sichtbarkeits-Check ·
  KI-Werkzeug · Newsletter. Auf 120 Root-Seiten + EN-Tool. (Hubs noch nicht — können nachgezogen werden.)
- **A) KI-Sichtbarkeits-Abo (#500):** Gratis-Check (`ki-erwaehnungs-check.html`) führt jetzt primär zum
  **Monitor (9 €/Mon)** als Held. Trichter: Banner → Check → Monitor. **User-TODO:** `MONITOR_ABO_URL` in
  `js/checkout-config.js` (Stripe-Abo-Link) setzen → Kaufbutton live (sonst Mail-Fallback).
- **B) Done-for-you-Texte (#501):** neue Seite **`texte-service.html`** (Starter CHF 49 / Monats-Flat CHF 39).
  Bestellung über `TEXTE_STARTER_URL`/`TEXTE_FLAT_URL` in checkout-config (leer = vorbefüllte Mail-Anfrage).
  Verlinkt aus KI-Werkzeug DE+EN. **User-TODO:** Preise bestätigen/ändern, Service liefern, optional Stripe-Links.
- **C) White-Label (#502):** neue Seite **`fuer-verbaende.html`** (Verbände/Kammern/Agenturen), 3 Lizenz-Modelle,
  Demo = Live-Tool, Lead-Gen per Mail. Footer-verlinkt + Sitemap. **User-TODO:** Konditionen im Sales-Gespräch.
- **Empfehlung:** A zuerst scharfschalten (nur 1 Stripe-Link nötig, Teile stehen), dann B/C als Sales.

## 📌 2026-06-09 (Teil 2) — EN-Tool + Phase-2-Worker (8h-Auto-Sprint)
- **EN-Tool live (PR #492):** `en/ki-werkzeug.html` (gespiegelte Logik, EN-Copy/Templates), Funnel in
  **alle 298 `en/ki-fuer-*.html`**, hreflang DE↔EN, Sitemap. **Pro-Flag teilt sich** (gleiche Origin).
- **Umlaut-Politur site-weit (PR #491):** online-tools (Gerät/Täglich) + stats (Über/täglich/nötig/für/nächste).
  Sichtbar-Text-Scan jetzt **0 Treffer**.
- **Hybrid-Nav (PR #490):** „Preise" aus Top-Nav raus, Premium+Shop bleiben (User-Entscheid „mach hybrid").
- **🔧 Phase-2-Worker GEBAUT (dieser PR): `workers/ki-werkzeug-ai/`** (worker.js + wrangler.toml + README).
  Cloudflare-Worker hinter `AI_ENDPOINT`: hält den KI-Key serverseitig, **verlustsichere Kosten-Bremse**
  (harte Tages-Caps pro IP + global in KV, `gemini-2.0-flash`), baut Prompt serverseitig, liefert `{text}`.
  **Noch inert** (AI_ENDPOINT bleibt "" bis User deployt). Scharfschalten: README (≈10 Min: KV anlegen,
  `GEMINI_API_KEY`+`PRO_TOKEN` als Secrets, `wrangler deploy`, `AI_ENDPOINT` in beiden Tool-Seiten setzen).
  → Damit ist „Pro = echte KI" möglich, ohne je minus zu machen (globaler Cap deckelt Kosten).

## 📌 2026-06-09 — Kunden-Überblick + Funnel + Gemini-Kontrolle (alles live auf `main`)
- **PR #480 gemergt → live:** Feature-Überblick „Alles für deinen Betrieb" (5 Karten) unter dem Hero,
  „Gratis vs Pro"-Vergleichsblock (Preis folgt Branchen-Stufe, `#pro-price-2`), Branchen-Guide + Hilfe-Link
  in jedem Text-Ergebnis (`#t-more`, Anker `#hilfe`), 4 kaputte Fahrplan-Slugs gefixt (alle 20 Branchen →
  echte Seite, sonst `/online-tools.html`), JSON-LD-Preise 9.90/19.90.
- **PR #480 (Teil 2) — Funnel:** `tools/add_branchen_funnel.py` um KI-Werkzeug-Hauptbutton erweitert +
  idempotent in **alle 289 `ki-fuer-*.html`** eingespielt (Branchen-Traffic → Tool).
- **PR #487:** Gemini-Kritik-Workflow-Default zeigte auf tote `/dossier/ki-werkzeugkasten.html` → jetzt
  `/ki-werkzeug.html` + `/online-tools.html`.
- **Gemini-Kontrolle gelaufen (7/10), Report `reports/site-critique-abannews-2026-06-09.md`.** Behoben:
  **PR #488** — `online-tools.html` Umlaut-/Grammatik-Fix (war durchgängig „fuer Selbststaendige", URLs geschont).
- **🟡 OFFENE USER-ENTSCHEIDUNGEN aus der Gemini-Kritik (bewusst NICHT autonom umgesetzt):**
  1. **Shop/Premium/Preise aus der Startseiten-Nav entfernen** — Gemini empfiehlt es fürs Abo-Ziel,
     widerspricht aber der Monetarisierung (Shop/Founding/Pro) + dem neuen Funnel → **User-Call.**
  2. **CTA-Beschriftung vereinheitlichen** („Gratis abonnieren" / „5-Min-Briefing gratis →" / „Newsletter gratis")
     → Marken-/Copy-Entscheidung.
  3. Mobile-Sticky-CTA **existiert bereits** (`.sticky-sub`/`.mcta`, nach Scroll) — kein Handlungsbedarf.
  4. „Frag aban"-FAB (`js/assistant.js`, fixed unten-rechts) überlappt evtl. Newsletter-Vorschau — FAB-typisch,
     ohne Render schwer prüfbar → offen gelassen.

## Stand (live-bereit, Demo-Modus)
- Seite: `ki-werkzeug.html` → live unter `abannews.com/ki-werkzeug.html` (PR #477 gemergt).
- **Texte erstellen** (Branche → Stichworte → Entwurf: Produkttext / Social-Post / Bewertungs-Antwort / Kunden-Mail) + **KI-Fahrplan** (3 Fragen → Plan + Checkliste).
- Aktuell **vorlagenbasiert im Browser** (kein Datenversand) — passt zur „kein Login/Upload"-Linie.
- **Vorbereitete Schalter im Code** (für „scharf schalten"):
  - `AI_ENDPOINT` (~Z. 330/507) → echte KI über kleinen **Cloudflare-Worker** (versteckt den API-Key).
  - `STRIPE_PRO_LINK` (~Z. 323/329/541) → echter Stripe-Kauf (1 Zeile).
  - **Tageslimit** via `localStorage` (~Z. 344–350; `LIMIT`-Konstanten ~Z. 498–528): gratis **5 Texte + 1 Fahrplan/Tag**, danach Pro-Kaufbutton.
- Preis: **CHF 9.90/Monat — ENTSCHIEDEN** (`#pro-price`).
- Verlinkt in `online-tools.html` + `sitemap.xml`.
- **NEU (umgesetzt): Pro hebt das Tageslimit auf.** `isPro()`/`setPro()`/`applyPro()` + localStorage-Flag
  `aban_kw_pro`. Aktivierung per **Checkout-Rückkehr `?pro=ok`** ODER **Freischalt-Code** (`PRO_UNLOCK_CODE`,
  Default `aban-pro`). `quota()` gibt bei Pro `left=Infinity` → Vorlagen unbegrenzt, kein Upsell;
  `refreshQuota()` zeigt „Pro · unbegrenzt".
- **NEU (umgesetzt): Kunden-Überblick auf der Seite** („vorbereite so viel wie möglich für kunden",
  „mach die seite mit gutem überblick"): (1) **„Alles für deinen Betrieb"**-Feature-Grid direkt unter dem Hero
  (5 Karten: Produkttext / Social-Post / Bewertungs-Antwort / Kunden-Mail / KI-Fahrplan, reuse `.steps`/`.step`);
  (2) **„Gratis vs Pro"-Vergleichsblock** vor der Kaufbox (`.compare`/`.plan`, `#pro-price-2` folgt der Branchen-Stufe
  via `updateProTier`); Zwischen-Überschriften `.ov-h`/`.ov-sub` für klare Gliederung.
- **NEU (umgesetzt): 2 Preis-Stufen nach Branche** (`updateProTier`, `PROPLUS_BRANCHEN`):
  - **Standard `STRIPE_PRO_LINK` = CHF 9.90** (`https://buy.stripe.com/6oUdRbfKKcfq03ZbaR5wI05`) — die meisten Branchen.
  - **Pro+ `STRIPE_PROPLUS_LINK` = CHF 19.90** (`https://buy.stripe.com/6oU00l1TUcfqg2XdiZ5wI06`) — regulierte/sensible:
    Praxis/Therapie, Immobilien/Makler, Beratung/Coaching. Preis + Kauf-Link folgen automatisch der Branchen-Auswahl.
- ⚠️ **User-TODO (sonst kein Auto-Unlock):** in **beiden** Stripe-Payment-Links „After payment → Redirect" auf
  `https://abannews.com/ki-werkzeug.html?pro=ok` setzen. Sonst muss der Käufer den Freischalt-Code nutzen.
- **AI_ENDPOINT** weiter offen (echte KI). Hinweis: Client-Unlock (`?pro=ok`/Code) ist UX und umgehbar — kostenlos ist
  aber nur die Vorlage (0 Grenzkosten). Die echte **Kosten-/Pro-Durchsetzung muss der Worker** machen.

## 🟢 Antworten/Wünsche des Users (UMSETZEN)
1. **Themen verlinken + Zahlung am Schluss:** In den Tool-Ergebnissen die passenden **Themen/Branchen-Hubs verlinken**; nach Erreichen des Gratis-Limits **am Ende einfach die Zahlung** zeigen.
   → User fragte „oder ist das C?": Ja — das **Einbauen des Tool-Buttons in alle 289 Branchen-Hubs (Option C)** ist gewünscht (Funnel). Es gibt ein Skript-Muster im Repo (`tools/add_branchen_funnel.py` / `tools/add_dossier_link.py`) als Vorlage.
2. **Mehr Details + Hilfe-Link** in der Ausgabe: User will „mit viel Details und Link zur Hilfe". → Ergebnisse anreichern + Hilfe/Anleitung verlinken.
3. **Kosten-Limit:** „wenn zu viel benutzen kosten → mach ein Limit." → Tageslimit beibehalten/strenger; bei echter KI zusätzlich **Budget-/Rate-Limit pro Nutzer** (Cent-Kosten je Generierung im Blick).
4. **Bilder?** → **Offen** — User fragt, ob Bilder rein sollen. Noch nicht entschieden.

## 🟡 Offene Entscheidungen
- **Pro-Preis:** ✅ **ENTSCHIEDEN — CHF 9.90/Monat.** (Eingetragen.)
- **`PRO_AI_DAILY_CAP`-Wert:** Default 50/Tag gesetzt; finalen Wert mit KI-Budget festlegen.
- **Bilder** im Tool: weiterhin offen (User-Entscheidung).

## 💡 Learnings (vom User: „aktualisiere memory und lerne")
- **„Unbegrenzt" muss verlustsicher sein.** User-Vorgabe: *„Pro = unbegrenzt, nicht dass ich minus mache."*
  → Trennung nach Grenzkosten: **Vorlagen = 0 €/Aufruf → für Pro echt unbegrenzt** (sicher);
  **echte KI = Cent/Aufruf → „unbegrenzt (faire Nutzung)"** mit Cap.
- **Kosten-Bremse gehört serverseitig.** Client-`localStorage`-Limits sind UX und **umgehbar** →
  der echte Fair-Use-/Budget-Cap (`PRO_AI_DAILY_CAP`) muss im **Cloudflare-Worker hinter `AI_ENDPOINT`**
  erzwungen werden. Niemals dort den API-Key ins Frontend legen.
- **Preis-Anker nutzen:** 9.90 lehnt sich an den bestehenden 9-€/Mon-Monitor an → konsistentes Pricing.
- **Pro-Freischaltung ohne Backend möglich:** `?pro=ok`-Redirect nach Stripe-Success + manueller
  Freischalt-Code überbrücken die Zeit, bis Stripe-Webhooks stehen.

## ⚠️ Vom User nötig zum Scharfschalten (kann die Session NICHT selbst)
- **Stripe-Konto** + fertiger Payment-Link → in `STRIPE_PRO_LINK`.
- **KI-API-Schlüssel mit Budget** (z. B. Gemini/OpenAI) → in den Cloudflare-Worker hinter `AI_ENDPOINT` (jede echte Generierung kostet Cent-Beträge → daher Punkt 3, Limit).

## Nächste Schritte (aus der Tool-Session, Auswahl)
- **A)** Echte KI + Stripe scharfschalten (sobald Konten da).
- **B)** EN/FR/IT-Versionen des Tools.
- **C)** Tool-Button automatisch in alle 289 Branchen-Hubs (Funnel) — **vom User gewünscht** (s. Punkt 1).
- **D)** So lassen, User testet selbst.

> Empfehlung für die Tool-Session: **Punkt 1–3 umsetzen** (Themen-Links, mehr Details+Hilfe, Limit härter),
> **C** vorbereiten (Funnel-Skript), und **Preis/Bilder** beim User abfragen, bevor A scharf geschaltet wird.
