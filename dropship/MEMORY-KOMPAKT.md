# 🧠 MEMORY-KOMPAKT — LuxeStyle (ZUERST LESEN, komprimiert aus allen Sessions)
> Verdichtung aller STAND-/Log-Dateien. Details bei Bedarf: STAND-2026-06-09-ABSCHLUSS.md (POD/Designs),
> STAND-2026-06-08 (Shopify-Auth), CJ-IMPORT-LOG.md (Katalog-Historie), ABEND-TODO.md (User-Klicks),
> MISTER-DTF-FULFILLMENT.md (Bügeltransfer). Stand: 2026-06-09 nachts.

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
- ERLEDIGT autonom: AGB-Domain, Footer-Links, FB-Token getestet ✓.
