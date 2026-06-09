# 📌 STAND 2026-06-09 (ABSCHLUSS — ZUERST LESEN). „Selbst gestalten" KOMPLETT live + Meta-Video-Maschine

> Ergänzt STAND-2026-06-08 (Shopify-Auth) und STAND-2026-06-09-pod-editor-v2. Kürzest:
> **POD-Verkauf läuft End-to-End (Editor→Druckdatei→Printful, gesunde Preise). Meta bekommt ab jetzt
> veredelte 2,6-Sek-Clips + Montagen statt roher Bilder.** Offen nur noch wenige User-Klicks.

## ✅ SCHARF & VERIFIZIERT (alles auf `main`)
1. **POD-Editor v2** (`pod/designer.js`, abannews.com/pod/designer.js): frei platzieren (drag/scale/rotate, Touch-Pinch),
   Sticker-Bibliothek (18 transparente, `social/stickers/` + `gen_stickers.mjs`+`gen-stickers.yml`), Bild-Upload,
   Druckdatei-Bake (Canvas→Cloudinary). **Cloudinary LIVE: CLOUD `dwyi6kkrl` / PRESET `pigto8ba`** (unsigned, Fetch ok).
2. **Preise gesund** — `automation/printful_reprice.mjs` + `printful-reprice.yml`. **ANGEWENDET (×2,3, min CHF12, .90)**
   auf alle 26 POD (Tag `wunschdesign`). Verifiziert: Classic-Tee 8→ab 20.90, iPhone-Hülle 13.50→20.90, Sticker 3→14.90,
   Tasse 7.50→17.90. ⚠️ **Lehre:** GitHub-Expression `cond && '' || '1'` ergibt IMMER '1' (leerer String = falsy) →
   wir nutzen jetzt `… && '0' || '1'` und Skript prüft `DRY_RUN==='1'`. Reprice-Workflow-Input `apply:true`+`tag`.
3. **Printful-Auto-Sync** — `automation/printful_sync.mjs` + `printful-sync.yml` (Cron 20 Min). **`PRINTFUL_API_KEY`
   gesetzt & getestet** (dry_run: Auth ok, „keine offenen Bestellungen"). Flow: bezahlte Bestellung → SKU `<sync>_<variantId>`
   → Druckdatei aus Property `🖼️ Druckdatei` → **Gemini-Kontroll-Gate** (PASS=verbindlich `?confirm=1`, FAIL=Entwurf+Tag
   `printful-review`+Telegram). Idempotent (Tag `printful-synced`+Metafeld). `PRINTFUL_AUTO_CONFIRM` default=AI-gated.
   ⚠️ Printful-App-Import steht auf „manuelle Bestätigung" (User) → kann 2. (leeren) Entwurf erzeugen → den MIT Design
   bestätigen, leeren löschen (siehe dropship/pod/MISTER-DTF-FULFILLMENT.md).
4. **Bügeltransfer-Linie (Mister DTF, misterdtf.ch)** — Produkt `gid://shopify/Product/15423895830913` ACTIVE, 6 Kanäle,
   Handle `buegeltransfer-selbst-gestalten`, Preise A5 11.90/A4 16.90/A3 24.90. Fulfillment MANUELL (Druckdatei bei
   Mister DTF hochladen). Tag `buegeltransfer` → bewusst NICHT im Printful-Sync.
5. **Kollektion + Menü:** Smart-Collection „Selbst gestalten" (`/collections/selbst-gestalten-1`, Regel Tag wunschdesign
   ODER buegeltransfer, 27 Produkte). Hauptmenü „🎨 Selbst gestalten" hat Unterpunkte „🛍️ Alle zum Gestalten" + „♨️ Bügeltransfer (DIY)".
6. **Meta-Video-Maschine (veredelt):**
   - `automation/enhance_clips.mjs` + `enhance-clips.yml` (Cron tägl. 05:20): echtes Foto → Gemini-Editorial (entfernt
     Lieferanten-Text) → **2,6s Ken-Burns-Clip** (Musik `automation/reel_music.m4a`, CTA-Band) → `reels/clip-<name>.mp4`
     → Video-Queue (ready, IG/FB/Threads). ⚠️ ffmpeg-Anti-Hang: `-nostdin` + Input `-t` + fetch-Timeouts.
   - `automation/make_montage.mjs` + `montage.yml` (manuell): mehrere veredelte Bilder → **1 Video**, je Segment
     Produktname-Text (box=1) + CTA + Musik → `reels/montage-<datum>.mp4` → Queue. (Fix: box=1 statt drawbox, kein fade.)
   - **Rohe Lieferanten-Bild-Posts gestoppt** (`social/posts_image.csv` ready→skip). Ab jetzt nur veredelte Videos/Clips.
   - `clip-gif.yml`: MP4→GIF-Vorschau (`reels/preview/`) für Inline-Ansicht.
7. **IG-Reel-Cover-Fix:** `video-autopost-meta.mjs` setzt `thumb_offset=1500` (kein leeres Erstbild-Cover mehr).
8. **On-demand Meta-Post bewährt:** User-Video → `reels/<name>.mp4` committen (Pages-URL `video/mp4`; Pages hat Backlog,
   Raw-URL `application/octet-stream` mag IG NICHT) → als ERSTE `ready`-Zeile in `video_queue.csv` → `video-meta-autopost.yml`.
   So 1 User-Reel live gepostet (IG `17852380284695362` + Threads). Poster nimmt erste ready-Zeile (MAX_PER_RUN=1).

## 🟡 OFFENE USER-KLICKS (Rest)
1. **`FB_PAGE_ACCESS_TOKEN`** setzen (Page `1049840534888592`, Scope `pages_manage_posts`) → Facebook-Posting. IG+Threads laufen.
2. **TikTok-Kampagne** „Complete Payment", Pixel D8EKVR3C77U6KT5BTBD0, CH/Frauen/18–34/DE+FR, 20 CHF/Tag, Smart-Kampagnen AUS.
3. **AGB-Domain** `aban-192.myshopify.com`→`luxestyle.ch` (Shopify Richtlinien).
4. **Footer-Social-Links** auf LuxeStyle (FB/IG/Threads). Alles in `dropship/ABEND-TODO.md`.

## 🔑 Secrets-Stand (verifiziert via Logs)
Gesetzt: SHOPIFY_SHOP/CLIENT_ID/CLIENT_SECRET, GEMINI_API_KEY, PRINTFUL_API_KEY, TELEGRAM_BOT_TOKEN/CHAT_ID, META_*/IG/Threads.
Fehlt: FB_PAGE_ACCESS_TOKEN. (PRINTFUL_STORE_ID/AUTO_CONFIRM optional, leer = Defaults.)

## ➕ Autonom-Runde (2026-06-09 spät)
- **Montage täglich** (montage.yml Cron 06:10) zusätzlich zu enhance-clips (05:20). Content-Maschine selbstlaufend.
- **Sticker-Bibliothek 18→30** (prompts.json erweitert, gen-stickers laufen). Magenta-Chroma-Key-Format beibehalten.
- **Kollektion „Selbst gestalten" SEO** gesetzt (global.title_tag/description_tag, Collection 688427434369).
- Stand: Shop vollautonom (Katalog, POD-Verkauf, Preise, tägl. Social-Videos). Einziger offener Hebel = 4 User-Klicks
  (FB-Token, TikTok-Kampagne, AGB-Domain, Footer-Links).

## ➕ Fix-Runde (2026-06-09): „Dein Design"-Mockup raus + Blank-Shirt
- **Lehre:** Das Mockup `unisex-staple-t-shirt-white-front-6a26fe32875df.jpg` hat **„Dein Design" eingebrannt**
  (User-Upload). Betraf nur 2 Produkte: „Unisex T-Shirt – Selbst gestalten" (15422811439489) + Bügeltransfer.
- Fix: Gemini-Blank-Tee generiert (`social/looks/blank-tee-white.png` via gen-looks, prompts.json), auf Shopify-CDN
  hochgeladen → `cdn.shopify.com/.../blank-tee-white.png`. Bei beiden Produkten als **data-img-front (+back)** gesetzt;
  beim Unisex-Tee auch die 4 „Dein Design"-Galerie-Mockups entfernt + Blank als einziges Bild.
- ⚠️ pod_inject_designer derivt data-img-front aus Media-Dateinamen „front/back"; Blank heisst `blank-tee-white.png`
  (kein „front") → bei erneutem Inject Unisex-Tee data-img-front manuell prüfen. Bügeltransfer ist inject-unabhängig.
- **Upload-Button bestätigt live** (Cloudinary): Editor-Knopf „🖼️ Bild" → Kunde lädt eigenes Logo/Sticker/Foto.
- Bügeltransfer-Galerie-Duplikat (ex-tshirt-paint.png 2×) → 1 entfernt.

## 📋 BACKLOG (User-Wunsch, „später nach allem")
- **Eigene Aufkleber-/„Kleber"-Produktlinie massiv ausbauen:** viele Sticker/Logos/Bilder **NUR als Aufkleber**
  (Laptop/Flasche/Handy/Deko), **NICHT** für Shirts → eigenständiges Verkaufsprodukt + eigene Sticker-Kollektion.
- Pipeline existiert bereits: `automation/gen_designs.mjs` (+ gen_stickers) → Motive; `automation/printful_create_design_products.mjs`
  + `design-products.yml` → Kiss-Cut-Sticker-Produkte via Printful (Auto-Druck). Also nur: mehr Motive generieren
  (Themen-Sets), als Kiss-Cut-Produkte anlegen, in Kollektion „Aufkleber/Sticker" bündeln. Gemini macht die Bilder.
