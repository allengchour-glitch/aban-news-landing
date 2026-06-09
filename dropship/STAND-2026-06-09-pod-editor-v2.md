# 📌 STAND 2026-06-09 — POD-Editor v2 (frei platzieren) + Sticker-Bibliothek (ZUERST LESEN)

> Handoff der Session 2026-06-09. Ergänzt STAND-2026-06-08 (Shopify-Auth/Automatik gilt unverändert).
> Kurz: **Das „Selbst gestalten"-Tool kann jetzt frei platzieren (ziehen/skalieren/drehen) + hat eine
> KI-Sticker-Bibliothek. Alles live auf `main` → abannews.com, automatisch in allen 26 POD-Produkten.**

## ✅ NEU diese Session (alles auf `main`, deployed)
1. **Editor v2 — `pod/designer.js` v6** (ausgeliefert via Pages: `https://abannews.com/pod/designer.js`, HTTP 200).
   - **Layer-Modell** je Seite (Vorne/Hinten): Typen `text` | `image` (Upload) | `sticker`.
   - **Freies Transformieren** auf der Vorschau: **ziehen** (Drag), **skalieren+drehen** per Eck-Handle (Maus)
     UND **Pinch/2-Finger-Rotate** (Touch). Aktiver Layer = Rahmen + Handle + Löschen-Knopf (✕).
   - Werkzeugleiste: **➕ Text** (Schrift/Farbe), **⭐ Sticker** (Bibliothek-Grid), **🖼️ Bild** (nur sichtbar
     wenn Cloudinary gesetzt).
   - **Druckdatei-Bake:** beim In-den-Warenkorb wird je bedruckter Seite ein `<canvas>` in **1200×1200**
     gerendert (Layer mit Transform) → `toBlob()` → **Cloudinary-Upload** → Bestell-Property
     `🖼️ Druckdatei (Vorne/Hinten)`. **Nur aktiv wenn Cloudinary (CLOUD/PRESET) gesetzt** — sonst wird die
     Design-Beschreibung (Text/Sticker-Namen) als Property mitgeschickt, der Kauf funktioniert trotzdem.
     Sticker werden fürs CORS-sichere Backen über **Cloudinary-Fetch** (`/image/fetch/<abannews-URL>`) geladen.
   - Zweisprachig DE/EN (`Shopify.locale`), add-to-cart-Fluss + versteckte `properties[…]`-Inputs wie v5.
   - **WICHTIG:** Text- und Sticker-Designs funktionieren **OHNE Cloudinary** (Sticker werden direkt von
     abannews.com angezeigt). Nur **eigener Bild-Upload + echte Druckdatei** brauchen Cloudinary.
2. **Sticker-Bibliothek — `social/stickers/` (18 Stück, echte Transparenz)**, Index `index.json`.
   - Generator `automation/gen_stickers.mjs` + Workflow `.github/workflows/gen-stickers.yml` (workflow_dispatch,
     Input `only=name,name`). Prompts in `social/stickers/prompts.json`.
   - **🔑 LEHRE (teuer): Gemini „Nano Banana" liefert KEINE echte Transparenz** — es malt ein sichtbares
     **Schachbrett-Muster** als Pixel. Fix: Sticker auf **solidem Magenta (#FF00FF)** generieren und im Workflow
     per **pngjs-Chroma-Key** zu echtem Alpha auskeyen (`keyMagenta`, Despill gegen Magenta-Säume). Workflow
     installiert `pngjs`. Ergebnis verifiziert: alle 18 = **RGBA, sauberer weisser Die-Cut-Rand, kein Fringe**.
     Rote/pinke Sticker (heart/word-love) überleben den Key (r,b niedrig bei Rot → nicht magenta).
   - Mehr Sticker: Namen+Prompt in `prompts.json` ergänzen → `gen-stickers.yml` starten. Bei Bedarf neue
     Kategorien (Tiere/Blumen/Y2K/Sprüche). Aktuell: heart-red, star-gold, smiley-yellow, daisy-flower,
     cat-cute, dog-cute, butterfly, rainbow, lightning, crown, coffee, peace, moon-stars, mushroom-retro,
     cherry, flame, word-love, word-vibes.

## 🔌 NEU: Printful-Connector gebaut (Editor → Anbieter, Auto-Sync) — `automation/printful_sync.mjs`
**Wichtige Erkenntnis:** Die 26 POD-Produkte sind **bereits Printful-Sync-Produkte** (Tag
`printful_personalized_product`, SKU = `<syncId>_<printfulVariantId>`, z.B. `8481330_11576` → Variante `11576`;
Classic-Tee S/M/L/XL = 11576/11577/11578/11579). Der Connector decodiert die Variante direkt aus der SKU.
- **Flow (User-Entscheid 2026-06-09):** bezahlte Bestellung mit `wunschdesign`-Item → Printful-Order via API
  (`POST api.printful.com/orders`), Empfänger aus Lieferadresse, Druckdatei(en) aus Bestell-Property
  `🖼️ Druckdatei (Vorne/Hinten)`. **Gemini-Kontroll-Gate:** PASS → Auftrag **verbindlich bestätigt**
  (`?confirm=1`); FAIL (leer/unscharf/unzulässig) → **Entwurf** + Tag `printful-review` + Telegram.
  Idempotent (Tag `printful-synced` + Metafeld `printful.order_id`).
- **Workflow:** `.github/workflows/printful-sync.yml` (Cron alle 20 Min + manuell `dry_run`).
- **🔑 ZUM SCHARFSCHALTEN (User):**
  1. **`PRINTFUL_API_KEY`** als GitHub-Secret (Printful → Dashboard → Settings → API; ggf. **`PRINTFUL_STORE_ID`**
     wenn mehrere Stores). Optional `PRINTFUL_AUTO_CONFIRM=0` = nie auto-bestätigen (immer Entwurf).
  2. **Cloudinary** (s.u.) — ohne Druckdatei-URL kann kein Auftrag entstehen (Connector überspringt + flaggt).
  3. **⚠️ Printful-App-Auto-Import für diese Produkte AUS** (Printful-Dashboard → Stores → Order import =
     manuell/aus), sonst legt die App **zusätzlich** einen Auftrag an = **Doppel-Druck**. Unser API-Sync ist
     der einzige Weg, der das Editor-Design mitschickt.
  4. Erst mit `dry_run` testen → dann 1–2 echte Test-Bestellungen prüfen (Platzierung front/back vs. default
     je Produkttyp; Heuristik im Script, bei Bedarf verfeinern).

## 🟡 OFFEN / USER (für „verkaufen", anbieter-unabhängig vorbereitet)
- **Cloudinary** (Cloud Name + **unsigned** Upload-Preset, öffentlich) → in `pod/designer.js` `CLOUD`/`PRESET`
  setzen (oben im File). Dann scharf: **eigener Bild/Logo-Upload UND echte Druckdatei-Erzeugung**. Bis dahin
  läuft das Tool für Text+Sticker.
- **Printful-API-Key** (kommt „am Abend") → **Aufkleber-Linie (Kiss-Cut)** als verkaufbare, auto-gedruckte
  Produkte; + Preise auf gesunde Marge (siehe Pricing-Plan). Druckdatei-Export passt 1:1.
- **Bügeltransfer / Iron-on (Textil)** = **andere Firma** (Printful kann das NICHT). DTF-Anbieter wählen:
  Ninja Transfers / DTFSheet / DTF Transfers / StickerYou / Transfer Kingdom (Design hochladen → Folie →
  Kunde bügelt selbst aufs eigene Shirt). Start manuell oder via Shopify-App/API. Editor exportiert die
  fertige PNG-Druckdatei → anbieter-unabhängig direkt nutzbar.

## Kurz-Verifikation (für nächste Session)
- `curl https://abannews.com/pod/designer.js | grep "v6"` → vorhanden.
- `https://abannews.com/social/stickers/index.json` + `…/cat-cute.png` → 200.
- POD-Produktseite öffnen → ➕Text / ⭐Sticker hinzufügen, frei schieben/skalieren/drehen; in den Warenkorb →
  Bestellung trägt `🎨 Design`-Zusammenfassung (+ `🖼️ Druckdatei`, sobald Cloudinary gesetzt).
