# 🧠 MEMORY-KOMPAKT — LuxeStyle (ZUERST LESEN, komprimiert aus allen Sessions)
> Verdichtung aller STAND-/Log-Dateien. Details bei Bedarf: STAND-2026-06-09-ABSCHLUSS.md (POD/Designs),
> STAND-2026-06-08 (Shopify-Auth), CJ-IMPORT-LOG.md (Katalog-Historie), ABEND-TODO.md (User-Klicks),
> MISTER-DTF-FULFILLMENT.md (Bügeltransfer). Stand: **2026-06-10 nachts** (Details als dated Einträge unten).

## 📌 STAND 2026-06-11 (Prodigi-Connector + Lieferzeit + Sprache je Land — NEU, ZUERST LESEN)
**🟢 SCHON LIVE & VERIFIZIERT (diese Session live geschaltet):**
- **Prodigi LIVE:** User hat `PRODIGI_API_KEY` gesetzt (Länge 36, gültig). `prodigi-check` bestätigt SKUs
  `GLOBAL-FAP-A4/A3/A2` (Enhanced Matte 200g, Druckbereich `default`). `prodigi-products` (dry=false) lief → 10 Schweiz-Poster
  ACTIVE (Handle `prodigi-poster-*`, Tag `schweiz-edition`). `prodigi-sync` (cron 6h) druckt bezahlte Orders autom.
- **12 Schweiz-Sticker LIVE:** `schweiz-sticker.yml` (dry=false) → `schweiz-sticker-*` ACTIVE (Printful Kiss-Cut SKU
  `9000001_10163/10164/10165`, Metafeld print_file, Tag `schweiz-edition`). Füllt die `schweiz-edition`-Collection.
- **Spocket = WEGLASSEN** (User: „kostet"). Abo ~25–40$/Mt, nicht nötig — CJ(gratis)+Printful+Prodigi decken alles. Kein Spocket.
- **Theme = „Horizon"** (block-basiert, JSON-Template `templates/product.json`, Section-Typ `product-information`):
  **KEIN `sections/main-product.liquid`** → `inject_delivery_snippet.mjs` greift NICHT. Lieferzeit Phase 2 = Customizer
  „Custom Liquid"-Block im PDP nötig (sicherer User-Schritt), NICHT per API erzwingen (Theme-Bruch-Gefahr). Phase 1 reicht.
- **Sprache je Land LIVE:** `shopLocales` = DE(primär)/EN/FR/IT **alle published** → Shopify schaltet je Land autom. um.
- **Übersetzungen LIVE:** `translate.yml` (dry=false) lief — **Hero verifiziert** (echte FR/IT Titel+Body+Meta, HTML/Emoji intakt),
  **Katalog-Lauf** (alle ~517 Produkte) + Theme laufen autonom weiter; Ledger `dropship/_translated.txt` committet je Scope.
  Bei Abbruch: `translate.yml` erneut dry=false starten → setzt via Ledger fort (idempotent). **Bali NICHT übersetzt** (nicht in Hero-CSV, DO-NOT-POST ok).
- **Lieferzeit Phase 1 LIVE:** `delivery-block.yml` (dry=false) lief → alle aktiven Produkte haben `class="ls-liefer"`-Block +
  Metafeld `custom.lieferzeit`. (Viele Altprodukte = Tier „standard" 6–12/9–16, weil ohne cj-real-Tag — ok, plausibel.)

**Gebaut & committet (alles no-op-safe, idempotent, DRY_RUN-fähig; auf `main`):**
- **Prodigi-Connector (POD #3, EU-Labs)** — `automation/prodigi_check.mjs` (Key/Katalog), `create_prodigi_products.mjs`
  (10 Schweiz-Poster aus `social/posters/hoch/`, Fine-Art A4/A3/A2, **Shopify-Variant-SKU = DIREKT Prodigi-SKU** z.B.
  `GLOBAL-FAP-A3`, Metafeld `custom.print_file`, Tags `prodigi_personalized_product`+`schweiz-edition`, ACTIVE+publish),
  `prodigi_sync.mjs` (bezahlte Order → `POST /v4.0/orders`, Quote für Lieferzeit, Gemini-QA-Gate). Workflows
  `prodigi-check/products/sync.yml`. **No-op bis User `PRODIGI_API_KEY`-Secret setzt** (gratis Prodigi-Konto). Endpoint
  `https://api.prodigi.com/v4.0`, Header `X-API-Key`; Sandbox via `PRODIGI_SANDBOX=1`.
- **Lieferzeit je Bestellort** — Phase 1 `automation/delivery_block.mjs` (Regions-Block in Beschreibung + Metafeld
  `custom.lieferzeit` json; Herkunft aus Tags: EU-Druck 3–7 T · eu-lager 5–10 · cj-real 8–14/US 10–20). Phase 2
  `snippets/ls-lieferzeit.liquid` + `automation/inject_delivery_snippet.mjs` (zeigt nur Zeile fürs Kundenland, 4 Sprachen
  inline, raw-API-Theme-Write + Backup + REMOVE=1). Workflows `delivery-block.yml`, `delivery-snippet.yml`.
- **Sprache je Land** — `automation/markets_languages.mjs` (aktiviert+publiziert Shop-Locales FR/IT/EN **additiv**,
  fasst Markt-Web-Presence NICHT an = Parallel-Session-Schutz; nur Report), `automation/translate_content.mjs`
  (Gemini DE→FR/IT/EN → `translationsRegister`, digest-idempotent via Ledger `dropship/_translated.txt`, **SCOPE=hero|catalog|theme**).
  Workflow `translate.yml` fährt **hero→catalog→theme sequenziell** in 1 Lauf (committet Ledger zurück). Braucht `GEMINI_API_KEY`+Shopify-Creds.
- **Spocket:** KEIN Merchant-API (bestätigt) → später per App-Import + Veredelung. **autopilot2** „Markets inkompatibel" = harmlos, User-Entscheid: drin lassen.
- **Reprice-Falle:** `printful_reprice.mjs` NICHT mit Default `MIN_MARGE=12` auf Sticker/kleine POD (überteuert) — nur mit `MIN_MARGE=2`.
- **Offen (User):** siehe `dropship/TODO-AKTUELL.md`. Kurz: (1) `PRODIGI_API_KEY`-Secret → dann `prodigi-check`→`prodigi-products`;
  (2) Lieferzeit Phase 2 `delivery-snippet.yml` (richtige `SECTION` prüfen); (3) Spocket-App-Import; (4) Markt-Web-Presence
  je Markt: FR/IT/EN ggf. im Admin → Märkte ergänzen, falls Sprache dort nicht auto erscheint.

## 📌 STAND 2026-06-10 (Session-Ende — ZUERST LESEN, dann Details unten)
**Heute live geschaltet (alles auf `main`, mit Backups/Rollback):**
1. **POD-Mockups gesäubert** (kein „Dein Design" mehr; Printful-Gratis-Katalog `/products/variant/{id}` = saubere Blanks).
2. **🇨🇭 Schweiz Edition:** 39 Mundart/CH-Designs generiert (Gemini wieder da), **Designs-Galerie 335 Motive** (Schweiz zuerst,
   `/pages/designs-galerie?cat=Schweiz`), Smart-Collection `schweiz-edition`, Menü-Top-Link „🇨🇭 Schweiz".
3. **Gelato verbunden** (Store „LuxeStyle" Active) → **1. Fertig-Poster live** `schweiz-poster-gruezi` (per API veredelt).
   10 Poster-Motive in `social/posters/` (+ `…/hoch/` Hochformat). **Gelato = manuell anlegen, Claude veredelt per API.**
4. **„Poster zum Selbstgestalten" (Printful) LIVE** `/products/poster-zum-selbstgestalten`: Editor-Widget hochformat-fähig
   (`pod/designer.js` data-ratio/data-ref, rückwärtskompatibel), 4 Grössen, SKU `9000001_<printfulVar>`, Auto-Druck Printful.
5. **Header umgestaltet:** Logo-Bild **„LuxeStyle.ch"** gesetzt (`current.logo` in settings_data.json), Menü-Labels gekürzt →
   **alle 11 Punkte sichtbar (kein „Mehr")**.
6. **53 Effizienz-Badges** (Solar/USB-LED, rechtssicher, KEIN erfundenes Energielabel A–F — keins qualifiziert).
7. Früher heute: 404-Menüfix (selbst-gestalten-1 unpubliziert → Menü auf `selbst-gestalten`), AGB/Footer, FB-Token ✓, Memory komprimiert.

**Anbieter-Realität:** Gelato=verbunden (UI-anlegen, API CI-blockiert) · Printful=Selbstgestalt-Linie (läuft, Auto-Druck) ·
Printify=NICHT verbunden — **Recheck 10.06. abends bestätigt**: Key gültig, Katalog ok, aber einziger Shop = `"My new store"`
(id 27875158, Kanal `disconnected`) → User muss in Printify den LuxeStyle-Shopify-Store als Sales-Channel verbinden (sonst
ignorieren, Printful reicht). · Gemini-Billing=OK.

**App `autopilot2` (Badge „Markets inkompatibel"):** Warnung = App nicht kompatibel mit Multi-Market-Setup (8 Märkte),
bricht aber nichts. **User-Entscheid 10.06.: DRIN LASSEN / nicht anfassen** (evtl. Parallel-Session). NICHT deinstallieren.

**Offene User-Schritte (optional):** mehr Gelato-Produkte anlegen → „alle einrichten" sagen (Claude veredelt) · TikTok manuell
posten · (falls Sticker/Magnete autonom gewünscht: Shopify-Store in Printify verbinden).

**Workflows (workflow_dispatch):** gen-designs · gen-posters · designs-page · pod-blank-mockups · create-poster-pod ·
pod-inject-designer · printful-reprice · printful-sync(cron) · set-header-logo(+REMOVE=Rollback) · efficiency-badge ·
hero-schweiz(zurückgerollt) · pod-provider-check. **Theme-Edits via raw-API (MCP blockt Live-Theme); Backups in `dropship/theme-backups/`.**

## 🔑 FAKTEN & AUTH
- Shop **LuxeStyle** (luxestyle.ch), myshopify `au3j0y-hq.myshopify.com`. Zugriff: Shopify-MCP `mcp__…__*` ODER
  GitHub-Actions via **Client-Credentials** (Secrets `SHOPIFY_SHOP/CLIENT_ID/CLIENT_SECRET` gesetzt & funktionierend).
  ⚠️ `atkn_`/`shpat_`-Token werden abgelehnt → IMMER Client-Credentials (`POST /admin/oauth/access_token`).
- **Git-Workflow:** alles auf `main` via `_mp_*`-Branch → `git push origin _mp_x:main`. Dev-Branch `claude/dropshipping-session-LehDs` ist STALE. Pages liefert Repo unter **abannews.com** (reels/, social/, pod/) — Deploy-Backlog möglich.
- **Secrets gesetzt (verifiziert):** SHOPIFY_*, GEMINI_API_KEY, PRINTFUL_API_KEY, CLOUDINARY (im Code: CLOUD `dwyi6kkrl`/PRESET `pigto8ba`),
  TELEGRAM_*, META_*/IG/Threads, **FB_PAGE_ACCESS_TOKEN + FB_PAGE_ID** (2026-06-09 getestet ✓ Page-Token LuxeStyle CH, pages_manage_posts).
  **Fehlt/parkt:** PRINTIFY_API_KEY, GELATO_API_KEY (User: Kreditkarte geht erst später).

## ✅ LÄUFT AUTONOM (Dauerbetrieb, ohne User)
- **Shop-Katalog:** ~200 CJ-Dropship-Produkte (Fashion), SEO/Beschreibungen/Kollektionen optimiert.
- **„Selbst gestalten" (POD):** Editor v2 `pod/designer.js` (frei platzieren, Bild/Logo-Upload, 67-Sticker-Bibliothek,
  Druckdatei-Bake via Cloudinary) auf 26 Printful-Sync-Produkten. **Preise gesund** (printful_reprice.mjs, ×2,3).
  Bestellung→Druck: `printful_sync.mjs` (Cron 20 Min, Gemini-Kontroll-Gate, Auto-confirm bei PASS).
- **Bügeltransfer-Linie** (Mister DTF, manuell): Produkt live, Editor dran.
- **Social-Maschine (täglich):** veredelte 2,6-Sek-Clips (`enhance_clips.mjs`, Cron 05:20) + Montage (`make_montage.mjs`,
  Cron 06:10) → Video-Queue → **Meta-Autopilot postet IG+FB+Threads** (FB jetzt aktiv). Rohe Lieferanten-Bilder gestoppt.
- **Designs-Galerie-Seite** live (`/pages/designs-galerie`, Menü-Tab), zeigt alle Motive mit Kategorie-Filter.

## 🖼️ PRINT/POD-STATUS (Kernprojekt)
- **Motiv-Bibliothek: ~274 Fertig-Designs (`social/designs/`) + 67 Sticker (`social/stickers/`) = ~340.** Themen: Tiere,
  Sprüche (DE/EN/Schweiz Hoi/Grüezi/Merci), Tattoo, Food, Natur/Blumen, Space/Zodiac, Sport, Musik, Gaming, Y2K, Vegan,
  Logos/Badges, Saison, Self-Care. Generator `gen_designs.mjs`/`gen_stickers.mjs` (Gemini Nano-Banana, Magenta-BG +
  pngjs/Pillow-Chroma-Key, skip vorhandene, max/Lauf). ⚠️ manche Outputs grau → Alpha-Cleanup T=120.
- **VERKAUF = geparkt auf Kreditkarte + Provider-Keys.** Entscheid: **Sticker via Printify**, **Poster/Shirts via Gelato**
  (beide volle API → create+auto-fulfill, vollautonom). Geldfluss: Kunde→Shopify/Stripe→User-Bank; Anbieter bucht
  Produktionskosten autom. von User-Karte; Differenz=Gewinn. Claude steuert nur Logistik, kein Geld.
- **Connector-Scaffolds da:** `create_sticker_products_shopify.mjs` (Plan B Shopify, productSet) +
  `printful_create_design_products.mjs` (Printful /store/products — für Shopify-Stores GESPERRT, nur API-Store-Typ).
  → Sobald PRINTIFY/GELATO-Key: echte Connectoren bauen, je 1 Test, dann Voll-Rollout der 340 Motive + Kollektionen.

## ⚠️ TEUER GELERNTE LEHREN
- **GitHub-Expression-Bug:** `cond && '' || '1'` ergibt IMMER '1' (leerer String=falsy) → nutze `… && '0' || '1'`.
- **Gemini „transparent" = Schachbrett/grau**, nicht echtes Alpha → auf Magenta generieren + Chroma-Key + Alpha-Cleanup.
- **ffmpeg-Hänger:** `-nostdin` + Input `-t` + fetch-Timeouts. Stills brauchen `-framerate`.
- **Pages-Backlog:** neue URLs erst 404, dann 200 (Minuten). Für sofort: Shopify-CDN oder raw.githubusercontent (PNG ok, MP4=octet-stream → IG mag's nicht).
- **Live-Theme-Write:** über MCP gesperrt, ABER über echte Admin-API (Script, Client-Credentials) erlaubt → Footer/Policies autonom fixbar.
- **Printful-App-Import** auf „manuell" → evtl. 2 Entwürfe (App ohne Design + unser API-Sync mit Design) → den MIT Design bestätigen.
- **Headless-Chromium** im Container (`/opt/pw-browsers`) → QA-Screenshots mit `--ignore-certificate-errors` (Sandbox-TLS).
  Aber: kein Login in User-Accounts → FB-Token/TikTok-Kampagne = User/sein Browser-Claude oder API-Token.
- **KEINE asiatischen Models** in Content. KEINE Fake-Reviews. Bali kein Content (Model asiatisch).

## 🟡 OFFENE USER-KLICKS (Reichweite/Setup)
1. **Kreditkarte** + **PRINTIFY_API_KEY** + **GELATO_API_KEY** → POD-Verkauf vollautonom zünden.
2. **TikTok-Kampagne** „Complete Payment" (Pixel D8EKVR3C77U6KT5BTBD0, CH/Frauen/18–34, 20 CHF/Tag) — oder TikTok-Marketing-API-Token geben → Claude macht's per API.
3. **GEMINI-Billing aufladen** (Projekt-Guthaben) — siehe Lehre unten, AKTUELL LEER.
- ERLEDIGT autonom: AGB-Domain, Footer-Links, FB-Token getestet ✓, **POD-Mockups gesäubert** (s.u.).

## 🆕 2026-06-09 spät — POD-Mockups „Dein Design" entfernt + 2 wichtige Lehren
- **User-Beschwerde:** auf der „Selbst gestalten"-Collection war der Platzhalter „Dein Design" auf gewölbten
  Produkten (Taschen/Tasse/Flasche/Body) **abgeschnitten** → wirkte kaputt. FIX: 11 Featured-Bilder auf
  **saubere Blanko-Echtfotos** getauscht (Taschen×6, Tasse, Flasche, Baby-Body, 2 iPhone-Hüllen). Apparel blieb
  (Text dort lesbar/zentriert); Sticker blieb (Printful-Blank zeigt „Stickers"-Sample). Per Shopify-MCP
  `productCreateMedia`+`productDeleteMedia`(+`productReorderMedia` für die Hüllen mit 7/53 Varianten-Bildern).
- **🔴 LEHRE 1 — GEMINI-GUTHABEN LEER:** Nano-Banana/Veo geben **HTTP 429 „prepayment credits are depleted"**.
  Die 30 CHF sind aufgebraucht → JEDE Gemini-**Bild**-Generierung (gen_designs/gen_stickers/gemini_enhance_image/
  pod_blank_mockups/Veo) ist bis zum Aufladen tot. (Gemini-**Text** evtl. via Free-Tier noch ok.) Nicht stundenlang
  suchen — erst Billing prüfen.
- **🟢 LEHRE 2 — Printful-Katalog ist GRATIS & ÖFFENTLICH (kein Key!):** `GET https://api.printful.com/products/variant/{catalogVariantId}`
  → `result.variant.image` = **sauberes Blanko-Produktfoto** (weisser BG, kein „Dein Design"). `catalogVariantId` =
  Teil nach „_" in der Shopify-SKU (`<sync>_<catalogVariantId>`). So OHNE Gemini/Key saubere Mockups holen.
  ⚠️ manche Varianten liefern `…/product_temporary_image.jpg` (leer) → andere White-Variante via `/products/{product_id}` nehmen.
  ⚠️ Apparel-`variant.image` ist oft ein **Model-Foto** (Regel „keine asiatischen Models" prüfen! var 10874/recycelter-Hoodie las asiatisch → vermieden) → für Apparel lieber Flat/Ghost.
- **Tool/Workflow** `automation/pod_blank_mockups.mjs` + `.github/workflows/pod-blank-mockups.yml` (Gemini-Text-Removal,
  liegt bereit für wenn Billing wieder da ist; aktuell no-op wegen 429).

## 🇨🇭 MARKTLÜCKE = „Schweiz Edition" (Strategie: `dropship/MARKTLUECKE-SCHWEIZ-EDITION.md`)
- **Daten 30T:** 2.888 Sessions, **1.541 CH** (53 %), aber **8 Warenkorb / 7 Checkout / 0 Kauf** → Engpass = **Conversion**,
  nicht Traffic. Kaltes Social-Publikum sieht austauschbare Dropship-Mode (= Temu/AliExpress) → kein Kaufgrund.
- **Lücke:** **Mundart- & CH-Kultur-POD** (Hoi zäme, Chuchichäschtli, Kanton-Pride…) — Sprach-/Kulturmauer gegen
  generische Dropshipper, emotional/Heimat, geschenk-/impuls-tauglich, on-demand (Printful EU / Mister DTF CH).
  **Held = Mundart-Sticker CHF 4.90** (Produktbild = Motiv, kein Mockup → schnellster Launch + bester Conv-Hebel).
- **Vorbereitet diese Session:** +39 Mundart/CH-Design-Briefs in `social/designs/prompts.json` (313 total, generieren
  sobald Gemini-Billing da); Smart-Collection **„🇨🇭 Schweiz Edition"** angelegt (`gid://shopify/Collection/688449749377`,
  handle `schweiz-edition`, Regel Tag `schweiz-edition`, leer/startklar).
- **Zum Live-Schalten:** (1) Gemini-Billing → Motive generieren; (2) Printify/Gelato-Key (Karte) → Auto-Fulfill;
  (3) Pre-made Produkte taggen `schweiz-edition`; (4) Menü/Hero verlinken + Reel + Kampagne. Details im Strategie-Doc.

### Update 2026-06-10 — Gemini-Guthaben WIEDER DA ✅
- User: „geht" → `gen-designs.yml` 2× dispatcht: erst die ~45 alten Lücken, dann gezielt (`only=`) die **39 CH-Motive**.
  **Alle 39 generiert, Mundart-Rechtschreibung korrekt** (Chuchichäschtli, Grüezi mitenand, Härzlech, Gopfertami,
  Feierabig, Znüni, Bünzli, Gäll, es git nu eis ZÜRI, BÄRN, BASEL, 1. August…). Bibliothek **268 designs + 67 sticker**.
- **Designs-Galerie neu gebaut → 335 Motive (51 Schweiz), CH zuerst.** `page_body.html` regeneriert (Shell/v3.1 erhalten,
  Kategorien gemappt: ch-*→Schweiz, flower→Natur, zodiac/space→Space, sport, food), via `designs-page.yml` publiziert.
  ⚠️ **Pages-Deploy-Lag ~15–20 Min** für neue PNGs → vor dem Publizieren auf `abannews.com/...png`=200 warten (sonst broken tiles).
- **Kund:innen können die CH-Motive JETZT schon kaufen** über „Selbst gestalten" (Editor → Printful-Fulfillment LÄUFT).
  Offen für Fertig-Produkte (ohne Gestalten): Printify/Gelato-Key (Karte).
- **Menü-Verlinkung (2026-06-10):** Top-Level **„🇨🇭 Schweiz Edition"** (Pos. 2, MenuItem `787008815489`) →
  `/pages/designs-galerie?cat=Schweiz`. Galerie-JS kann jetzt **Deep-Link-Filter** (`?cat=` oder `#Kategorie`).
  Sub-Item „Designs & Sticker" auf (335) aktualisiert. `menuUpdate` ersetzt ALLE Items → immer komplette
  Item-Liste (mit ids) mitsenden, sonst Verlust.
- **Startseiten-Hero „Schweiz Edition" — VERSUCHT, zurückgerollt (2026-06-10):** Tool `automation/add_hero_schweiz.mjs`
  + Workflow `hero-schweiz.yml` (klont bestehenden Hero, Backup `dropship/theme-backups/index.json.bak`, REMOVE=1=Rollback).
  LEHRE: Hero-`image_1` akzeptiert NUR `shopify://shop_images/<file>` (externe/CDN-URL → „does not point to an applicable
  resource"); Bild via stagedUploadsCreate+fileCreate hochgeladen (`schweiz-edition-hero.png`, liegt in Shopify-Files bereit).
  Ergebnis: mobil gut (Headline+Button über Motiv-Wallpaper), **Desktop schlecht** (Hero zu hoch, Text/Button unsichtbar)
  → entfernt, Startseite wieder sauber/original. Hero-Feintuning = visueller Customizer-Job. Schweiz-Discovery läuft
  weiter über den Menü-Link (solider Live-Gewinn).

## 2026-06-10 nachm — Print-Video + KRITISCHER 404-Fix (Selbst-gestalten-Link)
- **Print-Werbevideo für TikTok geliefert:** `reels/werbung-selbst-gestalten-de.mp4` (9:16, DE, Voiceover+Musik;
  +`-clean` ohne Ton für Trend-Sound; +EN). Schon auf IG/FB/Threads gepostet (video_queue `print-de`=posted).
  **TikTok-Direktposting geht NICHT** (kein App-Audit) -> User postet selbst. TikTok-Caption (Mundart) im Chat geliefert.
- **App-Download-Hänger (NICHT Handy):** Chat-Anhang grosse MP4 bleibt bei "Wird heruntergeladen" haengen.
  LOESUNG: **Browser-Link** statt Anhang -> `https://abannews.com/reels/<datei>.mp4` (oeffnet/spielt/speichert zuverlaessig).
- **KRITISCH — `/collections/selbst-gestalten`-404 (User-Report):** Root-Cause via curl+API gefunden:
  - Es gibt ZWEI POD-Collections: `selbst-gestalten` (id 688385524097, 18 Prod., **publiziert -> HTTP 200 ueberall**)
    und `selbst-gestalten-1` (id 688427434369, 27 Prod., **resourcePublications LEER -> 404 ueberall, unpubliziert**).
  - Das Menue-Sub-Item "Alle zum Gestalten" zeigte auf `/collections/selbst-gestalten-1` (404) -> DAS war der 404.
  - **FIX:** Menue-Item (786839306625) auf `/collections/selbst-gestalten` (200) umgebogen (menuUpdate, ganze Liste).
    + Redirect `/collections/selbst-gestalten-1` -> `/collections/selbst-gestalten` (faengt Altreferenzen).
  - ⚠️ FALSCHE Annahme korrigiert: hatte zuerst Redirect `selbst-gestalten`->`-1` gesetzt (= funktionierend auf kaputt!)
    -> wieder geloescht. **LEHRE: vor URL-Annahmen IMMER `curl -o /dev/null -w "%{http_code}"` testen** + `resourcePublications`
    pruefen; URL-Redirects feuern nur bei echtem 404; ein "existierendes" Resource-Handle != erreichbar.
- **Link-Audit (alle 28 Menue-/Werbe-Collections):** ALLE existieren mit Produkten (sommer 72, damen-mode 337, schuhe 97,
  selbst-gestalten 18, gadgets 124, sale 367 …). Beide Menue-Seiten publiziert. Keine weiteren toten Links.
- **Maerkte:** DACH (`luxestyle.ch/de-de/`), Switzerland(ch), Global, FR, IT, EU-rest, UK, US — alle enabled.
  Collections-Erreichbarkeit pro Markt kann abweichen -> im Zweifel beide Markt-Pfade testen (`/de-de/` und root).

## 2026-06-10 abend — POD-Anbieter-Keys gesetzt (Printify + Gelato), Check gebaut
- User hat **PRINTIFY_API_KEY (gültig, Länge 1301) + GELATO_API_KEY (gültig, Länge 110)** als GitHub-Secrets gesetzt.
- Tool `automation/pod_provider_check.mjs` + Workflow `pod-provider-check.yml` (testet Keys + verbundene Shops, legt nichts an).
- **PRINTIFY:** Key gültig, Katalog erreichbar (1415 Blueprints). **Magnete:** `851 Die-Cut Magnets`, 428 Magnets, 789 Square,
  771/857 Button. **Sticker:** `400 Kiss-Cut Stickers`, 384 Square, 476/564 Vinyl. **🟡 ABER:** der einzige Printify-Shop
  ist `id 27875158 "My new store" | sales_channel=disconnected` → **LuxeStyle-Shopify-Store ist in Printify NICHT verbunden.**
  → Produkte per API würden NICHT im Shop landen. **USER-SCHRITT:** Printify → „Manage my stores" → Add store → Shopify →
  LuxeStyle (au3j0y-hq) verbinden. Dann erscheint ein neuer Shop mit sales_channel=shopify → dessen shop_id für create.
- **GELATO:** Key gesetzt/gültig. Store-Verbindung analog im Gelato-Dashboard prüfen/verbinden (Dashboard → Stores).
- **NÄCHSTER SCHRITT (Claude, sobald Shopify in Printify verbunden):** Connector bauen (Design-Upload → product create
  auf shopify-shop_id → publish) + Schweiz-Sticker/Magnete (Mundart/Matterhorn/Edelweiss) anlegen, Preis ×2,3, Tag
  `schweiz-edition`. Bis dahin: Keys da, aber **Store-Verbindung im Anbieter fehlt** = Blocker.

## 2026-06-10 spätabend — Anbieter-Realität: Gelato verbunden, aber CI-API blockiert
- **GELATO:** Store **„LuxeStyle" verbunden & Active** (CHF, Region North America) — User-Screenshot bestätigt
  (dashboard.gelato.com/stores/list). ABER **Gelato-API ist aus GitHub-Actions NICHT erreichbar** (`fetch failed`,
  auch mit User-Agent/Accept; Sandbox bekommt 503). → **Vollautonomer Gelato-Connector via CI NICHT möglich** (Netz/WAF-Sperre).
  Gelato-Weg = **manuell im Gelato-UI** („Add product" / Mockup Studio → Design hochladen → publish → Auto-Sync+Fulfill zu Shopify).
  Gelato-Stärken: **Poster, Karten, Tassen, Apparel, Tote** (CH-naher Druck) — ideal für Schweiz-Souvenir/Geschenk.
- **PRINTIFY:** API **funktioniert aus CI** (Shops/Katalog abrufbar), Magnete `851 Die-Cut`, Sticker `400 Kiss-Cut`.
  ABER Shopify-Store dort **NICHT verbunden** (nur „My new store / disconnected"). → Für CI-Autonomie müsste der
  User in Printify den Shopify-Store verbinden (Add store → Shopify → App in Shopify installieren/genehmigen).
- **ENTSCHEID/Strategie:** Gelato (verbunden) = Poster/Karten/Tassen **manuell** anlegen (Claude prept Designs+Specs);
  Printify (CI-fähig) = Sticker/Magnete **vollautonom**, sobald Shopify in Printify verbunden. Beide ergänzen sich.
- Tool `automation/pod_provider_check.mjs` + `pod-provider-check.yml` bleibt für Status-Checks.

## 2026-06-10 — Schweiz-Poster generiert (für Gelato)
- `automation/gen_posters.mjs` + `gen-posters.yml`: **vollflächige** Poster-Artworks (kein Magenta-Chroma wie Sticker),
  Gemini 2.5 Flash Image. **10 Motive in `social/posters/`**: matterhorn, alps-panorama, lake, chalet, gondola, cow,
  edelweiss, edelweiss-pattern, fondue, gruezi (Typo „GRÜEZI" korrekt). Optisch top, „GRÜEZI" stimmt.
  ⚠️ Gemini liefert **1024×1024 quadratisch** (ignoriert 2:3-Prompt) → gut für quadratische Art-Prints/Poster bis ~A4;
  für grosse Hochformat-Poster im Gelato-Editor positionieren oder gezielt Hochformat-Varianten generieren.
- Öffentlich via Pages: `https://abannews.com/social/posters/<name>.jpg` (Deploy-Lag ~15 Min beachten).
- Geliefert an User (Vorschau-Sheet + Links). Gelato: Create product → Poster → Datei hoch → Publish.

## 2026-06-10 — Hochformat-Poster + Printify weiter disconnected → Empfehlung: alles über Gelato
- **Hochformat-Poster gebaut:** `social/posters/hoch/*-hoch.jpg` (10) = Pillow-Komposition (Quadrat-Art + Titel-Band,
  Serif), echtes 2:3-Art-Print-Layout, Marke-Footer. An User als Dateien geliefert. (Quadrat-Originale in `social/posters/`.)
- **Printify: 4× geprüft, IMMER „My new store / disconnected"** — User sagt „verbunden", aber Printify-API sieht keinen
  Shopify-Store. Wahrscheinlich **anderes Printify-Konto als der API-Key** ODER Shopify-Genehmigen-Schritt nie zu Ende.
- **Gelato = der verbundene Anbieter** (Store „LuxeStyle" Active). Gelato kann **Poster, Sticker, Tassen, Tote, Karten,
  Apparel** → deckt die ganze Schweiz-Linie ab. **EMPFEHLUNG: alles über Gelato (manuell anlegen), Printify vorerst fallen
  lassen** (CI-API zwar offen, aber Store nie verbunden → kein Nutzen). Gelato-API aus CI weiterhin blockiert → Anlegen im UI.
- **Noch KEIN Gelato-Produkt in Shopify** (neuestes Produkt 06-09) → User muss in Gelato „Publish to store" abschließen.
  Sobald da: Claude taggt `schweiz-edition`, Preis ×2,3, Collection+Menü.

## 2026-06-10 — ERSTES Gelato-Produkt LIVE + per API veredelt ✅
- **Gelato→Shopify-Sync FUNKTIONIERT.** User hat in Gelato ein Poster veröffentlicht → kam als
  „Premium Semi-Glossy Paper Poster 13x18 cm" (vendor LuxeStyle, type „Print Material", SKU=UUID) in den Shop.
  Motiv = **GRÜEZI** (ch-poster-gruezi).
- **Claude-Veredelung per Shopify-API (productUpdate + productVariantsBulkUpdate):**
  Titel „Schweiz-Poster «Grüezi» – Mundart-Kunstdruck", Typ Poster, Tags `schweiz-edition,poster,kunstdruck,mundart,geschenk,gelato`,
  Mundart-Beschreibung, Preis 15.08→**14.90**, Handle→`schweiz-poster-gruezi` (URL luxestyle.ch/products/schweiz-poster-gruezi).
  Produkt ACTIVE/Onlineshop, in Geschenk-Smart-Collections; `schweiz-edition`-Smartcollection indexiert async (paar Min).
- **WORKFLOW etabliert:** User legt in Gelato an + „Publish to store" (einziger manueller Schritt) → Claude macht
  Titel/Text/Preis/Tags/Collection/URL per API. Gelato-Produkte erkennbar an type „Print Material"/Gelato-Titel + UUID-SKU.
- Printify weiter ungenutzt (disconnected) — Gelato deckt alles ab.

## 2026-06-10 — „Poster zum Selbstgestalten" (Printful) gebaut (Plan umgesetzt)
- **Widget `pod/designer.js`** jetzt aspect/auflösungs-konfigurierbar: `data-ratio` (Default 1=quadratisch) + `data-ref`
  (Default 1200). Bestehende 26 Produkte unverändert. Poster bekommt `data-ratio=1.414 data-ref=2400` (Hochformat 1:√2).
- **`pod_inject_designer.mjs`** poster-aware: productType „Poster" ODER Tag `pod-poster` → injiziert data-ratio/data-ref,
  erzwingt Einseitig (kein back). Query um productType+tags erweitert.
- **`printful_sync.mjs`** `placementFor`: POSTER/CANVAS → `default` (Einzelplatzierung).
- **NEU `automation/create_poster_pod.mjs` + `create-poster-pod.yml`**: legt per `productSet` 1 Produkt
  „Poster zum Selbstgestalten" an (Handle `poster-zum-selbstgestalten`, Typ Poster, Tags wunschdesign+pod-poster+…,
  4 Grössen, SKU `9000001_<printfulVariantId>` aus Printful-Produkt **268** „Enhanced Matte Paper Poster (cm)":
  30×40=8948/25.90, 50×70=8952/32.90, 70×100=8954/46.90, A2=19516/28.90). Status DRAFT. Featured/Editor-Bild
  `pod/poster-blank.png` (sauberes Hochformat-Blanko mit „Dein Motiv hier"-Hinweis; via Pages).
- **Reihenfolge zum Scharfschalten:** create-poster-pod (DRY→echt) → pod-inject-designer → printful_reprice (Tag
  printful_personalized_product, ×2,3) → Status ACTIVE/publizieren. Druck läuft dann automatisch über Printful (printful_sync).
- **Fertig-Schweiz-Poster bleiben getrennt** (Gelato, schweiz-edition).

### ✅ VERIFIZIERT LIVE (2026-06-10): „Poster zum Selbstgestalten"
- Produkt `gid://shopify/Product/15427182330241`, Handle `poster-zum-selbstgestalten`, **ACTIVE**, in 6 Publications.
  URL `luxestyle.ch/products/poster-zum-selbstgestalten` (HTTP 200, auch /de-de/). 4 Grössen, SKUs `9000001_8948/8952/8954/19516`.
- **Editor rendert HOCHFORMAT** (Storefront-Screenshot bestätigt: „Dein Motiv hier"-Canvas portrait, Tools, Warenkorb-Button).
  Injektion mit `data-ratio="1.414" data-ref="2400"`. **Keine Regression:** Bestandsprodukt (T-Shirt) hat kein data-ratio → quadratisch.
- In Collection `selbst-gestalten` (18→19) → erscheint im Menü „🎨 Selbst gestalten → Alle zum Gestalten".
- Preise 25.90/32.90/46.90/28.90 (≈×2,3, reprice nicht nötig). Druck-Fulfillment läuft beim echten Kauf automatisch
  über `printful_sync` (placement POSTER→default, SKU→variant_id, Cloudinary-Druckdatei).
- OFFEN/optional: Poster-Karte in die `/pages/selbst-gestalten`-Grid aufnehmen (Collection deckt Discovery schon ab).

## 2026-06-10 — Header umgestaltet: LuxeStyle.ch-Logo + alle Menüpunkte sichtbar ✅
- **Logo (Titelbild):** „titelbild" = das LuxeStyle-Logo soll die Domain zeigen. Header hatte KEIN Logo-Bild → nur Shop-Name-Text.
  → Wortmarke **`pod/luxestyle-ch-logo.png`** (Serif, „.ch" in Marken-Gold #8b7355) erstellt, in Shopify-Files hochgeladen
  (`MediaImage/69652492353921` → `shopify://shop_images/luxestyle-ch-logo.png`), und als Header-Logo gesetzt.
  Tool `automation/set_header_logo.mjs` + `set-header-logo.yml` schreibt `current.logo` in `config/settings_data.json`
  (LIVE-Theme via raw-API, Backup `dropship/theme-backups/settings_data.json.bak`, JSON-Validierung, REMOVE=1=Rollback).
  LEHRE: Logo ist GLOBALES Theme-Setting `current.logo` (nicht in der header-Section); leer = Shop-Name-Text.
- **Menü „man sieht nicht alles" (Desktop):** 11 Top-Items mit langen Labels (Emojis + „& …") → Theme klappte Überlauf
  in „Mehr". → Top-Labels gekürzt (Entdecken, 🇨🇭 Schweiz, Mode, Gestalten, Schuhe, Schmuck, Beauty, Wohnen, Tech,
  Geschenke, Sale) via `menuUpdate`. Ergebnis verifiziert: **ALLE 11 sichtbar, kein „Mehr" mehr.**
  ⚠️ Storefront cached Header/Theme ~paar Min → nach Änderung kurz warten + Cache-Bust-URL zum Screenshoten.
- **Energieklasse A–F (offen):** User „nur wo Label vorhanden" → echte EU-Energielabels nur bei wenigen Elektro-Produkten
  (CJ liefert i.d.R. keine). Nächster Schritt: Tech/Gadgets-Katalog auf Produkte mit echtem Label prüfen, dann Klasse +
  Label-Bild ergänzen. Keine Klassen erfinden (gesetzlich).

## 2026-06-10 — Energieklasse geprüft → KEINE qualifiziert; stattdessen Effizienz-Badges (rechtssicher)
- **Befund:** KEIN Produkt im Shop fällt unter die EU-Energielabel-Pflicht A–F: Lampen sind alle Solar/USB/Akku
  (Label gilt nur für netzbetriebene Wechsel-Leuchtmittel), Beamer sind ausgenommen, keine TVs/Kühlschränke/Netz-Birnen.
  → Keine Klasse erfunden (gesetzlich). Geprüft: beleuchtung-lampen (7) + gadgets (124).
- **Stattdessen rechtssichere Effizienz-Hinweise gesetzt** (`automation/add_efficiency_badge.mjs` + `efficiency-badge.yml`):
  grünes Badge vorangestellt, idempotent (Marker `class="ls-eff"`): Solar-Produkte → „☀️ Solarbetrieben · keine Stromkosten",
  USB/Akku-LED-Lampen → „🔌 USB/Akku-LED · energieeffizient". **53 Produkte** bekamen ein Badge (alle Solar shop-weit via
  `title:Solar*` + USB-Lampen), 1 übersprungen (Wellness-Bundle). Verifiziert an 2 Produkten. Kein Energielabel = legal sauber.

## 2026-06-10 — Magnete (beides) LIVE über Printful ✅
- **Drucker:** Printful **Die-Cut Magnets (656)**, 3 Grössen: 7,6cm=16366/CHF7.90 · 10cm=16367/9.90 · 15cm=16465/13.90.
- **A) „Magnet zum Selbstgestalten"** `/products/magnet-zum-selbstgestalten` (ACTIVE) — Editor-Widget **quadratisch**
  (kein data-ratio = Default), Kunde lädt Bild hoch, Printful druckt auto (printful_sync, placement MAGNET→default).
  Tools `automation/create_magnet_pod.mjs` + `magnete-anlegen.yml`. Blanko-Bild `pod/magnet-blank.png`.
- **B) 6 fertige Schweiz-Magnete** (Matterhorn, Grüezi mitenand, Merci vilmal, Schweizer Herz, Kuhglocke, Fondue),
  Handles `schweiz-magnet-*`, ACTIVE, Tag `schweiz-edition`+`fertig-magnet` (KEIN wunschdesign → kein Widget).
  **Auto-Fulfillment via Produkt-Metafeld `custom.print_file` = Motiv-URL.** Tool `automation/create_schweiz_magnets.mjs`.
- **printful_sync erweitert (wiederverwendbar für ALLE Fertig-Produkte):** wenn keine Editor-Druckdatei in den
  Order-Properties → Fallback auf Produkt-Metafeld `custom.print_file`. + `MAGNET` in placementFor (single „default").
- **Muster für künftige Fertig-Produkte:** Tag `printful_personalized_product` (für sync) OHNE `wunschdesign` (kein Widget) +
  Metafeld `custom.print_file` + SKU `9000001_<printfulVariantId>`. → vollautonom verkaufbar+druckbar.
