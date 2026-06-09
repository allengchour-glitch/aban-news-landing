# 📌 STAND 2026-06-08 — Shopify-Vollautomatik scharf (ZUERST LESEN)

> Handoff der Session vom 2026-06-08. Korrigiert/ergänzt ältere CLAUDE.md-Notizen. Kürzeste Version:
> **Die Shopify-Schreib-Automatik läuft jetzt — über Client-Credentials, NICHT über einen `atkn_`-Token.**

## 🔑 SHOPIFY-AUTH — die teuer gelernte Wahrheit (überschreibt alte Notiz!)
- Der User hat die Custom-App auf **ALLE Zugriffe** gesetzt und **`SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET`** als GitHub-Secrets hinterlegt (CID 32 Zeichen, CSEC `shpss_…` 38 Zeichen).
- **Der Admin-API-Token `atkn_…` (69 Zeichen) wird von Shopify ABGELEHNT** („Invalid API key or access token") — NICHT verwenden. (Alte CLAUDE.md-Notiz „shpat_-Knopf abgeschafft → atkn nehmen" war falsch.)
- **Funktioniert: Client-Credentials-Grant** → `POST https://au3j0y-hq.myshopify.com/admin/oauth/access_token` mit `{client_id, client_secret, grant_type:"client_credentials"}` → `access_token`, dann Header `X-Shopify-Access-Token`. Authentifiziert als Shop „LuxeStyle".
- Unsere Skripte testen automatisch beide Wege (`SHOPIFY_ADMIN_TOKEN` → sonst Client-Credentials) und nehmen den funktionierenden. Also: Secrets stehen, **läuft**.
- Shop-Domain immer **au3j0y-hq.myshopify.com** (SHOPIFY_SHOP-Secret; Code normalisiert auf *.myshopify.com).

## ✅ Was jetzt vollautonom läuft (alles auf `main`)
1. **Beschreibungs-Block katalogweit** — `automation/desc_block.mjs` + `.github/workflows/desc-block.yml`.
   Hängt bei Fashion-Produkten an: Styling-Text + **Bemerkung** + Link zur **passenden Kollektion** (auto aus den
   eigenen Collections: kleider→Kleider, taschen-sub→Taschen, sonnenbrillen-eyewear→Sonnenbrillen, damen-schmuck-sub→
   Schmuck, sonst damen-mode). **Idempotent** (Marker `Styling &amp; Bemerkung`). Pro Lauf MAX (Default 60).
   **Erledigt:** damen-mode (300+10), damen-schmuck-sub (105), kleider (30), sonnenbrillen-eyewear, taschen-sub ≈ ~320 Produkte.
   Weitere Kollektionen: Workflow mit `collection`-Handle starten.
2. **KI-Bild → Produkt** — `automation/shopify_add_enhanced.mjs` + NEU `.github/workflows/attach-enhanced.yml`.
   Hängt veredelte Bilder (`social/enhanced/_manifest.csv`) per `productCreateMedia` ans Produkt (Handle-Lookup).
   Ledger `social/enhanced/_added.txt` gegen Doppel. **Erledigt: alle 10** (brise/strohtasche/daisy/dosnu/cateye/sirene
   via Workflow; nuit/cosy/active/sommerriv waren vorher manuell per MCP → vorab ins Ledger eingetragen).
   Der tägliche `gemini-enhance`-Cron hängt ab jetzt neue Bilder automatisch an (Creds greifen).
3. **Veo-Video → Produkt** — manuell per MCP an **nuit** + **cosy** gehängt (stagedUploadsCreate VIDEO → POST zu GCS
   → productCreateMedia VIDEO). Weitere bei Bedarf gleich machen.
4. **DUO10**-Staffelrabatt (Code, 2 Artikel = −10%, kombiniert nicht mit anderen Codes) live; auf Sommer+Damen-Mode
   als Spar-Tipp kommuniziert. **Lieferzeit „📦 7–14 Tage"** in 5 Top-Kollektionen ergänzt (CRO-Priorität 1).
5. **Gemini-Learnings** — `automation/gemini_dropship_learnings.mjs` + `gemini-learnings.yml` (wöchentl. + manuell) →
   Report `reports/dropship-learnings-2026-06-08.md` (Erfolgsmuster + getaggter Aktionsplan [API]/[THEME]/[USER]).
6. **Single-Produkt-Premium-Reel** — `dropship/ads/render_product_reel.sh` + `product-reel.yml` + Manifest
   `dropship/ads/product_reels.csv` (Ken-Burns 1 Produkt + Musik + Clean-Version + Produktlink). Bali-Reel war
   gerendert, dann gelöscht (siehe unten).

## ⚠️ Marken-/Content-Regeln (NEU, verbindlich — auch in dropship/REEL-REGELN.md)
- **KEINE asiatischen Models** in Bildern/Reels/Posts. Hero-Bild vor Aufnahme in good_products.csv prüfen.
- **Bali komplett entfernt** (Model asiatisch + zu oft gezeigt): aus good_products.csv, product_reels.csv,
  reels_seed.csv, posts_image.csv, enhanced-Manifest + alle Bali-Medien gelöscht. Produkt bleibt im Shop, nur kein Content.
- Ein Produkt nicht zu oft wiederholen (Abwechslung).

## 🛠️ Workflow-Fallen (diese Session gelöst — nicht erneut reintappen)
- **Boolean-Input-Bug:** GitHub gibt `dry_run` als String `"false"` → in `${{ inputs.x && '1' || '' }}` ist jeder
  nicht-leere String truthy → IMMER dry. **Fix:** `${{ github.event.inputs.x == 'true' && '1' || '' }}`.
- **`reports/` ist gitignored** → Commit-Guard `git status --porcelain reports/` ist leer. **Fix:** `git add -f reports/`
  dann `git diff --cached --quiet`-Check.
- **Concurrency-Gruppe** (cancel-in-progress:false) behält nur 1 laufenden + 1 wartenden → bei 3 schnell getriggerten
  Läufen wird der **mittlere abgebrochen**. Kollektionen **einzeln nacheinander** triggern.
- **Repo extrem aktiv** (zweite Session = abannews-News-Seite: archive/, dossiers, „Frag aban"). Kollision gering, weil
  andere Dateien. Meine MCP-Commits sind SHA-geprüft; Bot-Pushes mit `git pull --rebase --autostash` + Retry.
- **Veo (Gemini-API):** Bild-Input MUSS `image.bytesBase64Encoded` heissen (NICHT `imageBytes` = nur SDK-Name).
  Veo-FAST kann KEIN Bild-Input → Default `veo-2.0-generate-001`. Commit-Step: `.veo_pointer` nur adden wenn vorhanden
  (im `only`-Modus fehlt er, sonst exit 128 + Clip verloren). Cron wöchentlich (Budget).

## 🟡 Offene USER-Schritte (nur der User)
- **TikTok-Pixel** + AGB/Domain + 1 saubere Kampagne+Budget (das eigentliche Reichweite-/Käufer-Nadelöhr).
- **Theme/Customizer (Gemini-Top-Hebel):** Sticky-ATC (mobil), USP-/Trust-Bar, Judge.me-Sterne auf Kacheln,
  Lagerbestand-Urgency + 2. Bild beim Hover, „Komplettiere deinen Look"-Cross-Sell, mobile „1 Reihe Bild+Text".
- `FB_PAGE_ACCESS_TOKEN` (Facebook-Posting), TikTok-App-Audit (öffentlich).
- `GEMINI_API_KEY` ist gesetzt (Billing aktiv, ~30 CHF) — KI-Bild + Veo + Learnings laufen.

## 🎬 Werbevideo-Tool (1-Klick) — Stand 2026-06-08 abends
- **`werbevideo.yml`** (workflow_dispatch, Inputs `concept=fashion|print`, `heroes`, `stills`, `seconds`): erzeugt
  DE+EN 9:16-Werbung (hook-first) via `dropship/ads/render_masterpiece.sh` + Voiceover (`tts_eleven.sh`) +
  Musik (`gen_music.sh`). Output `reels/werbung-{luxestyle|selbst-gestalten}-{de,en}.mp4` (+`-clean.mp4` für Trend-Sound).
- **🐛 GELÖST (teuer): 5-Sekunden-Kollaps.** Symptom: fertiges Video nur ~1/5 der Voiceover-Länge. **2 Ursachen:**
  (1) Standbild-Segmente rendern mit `-loop 1 -t SEG` nur 0.83×SEG lang (zoompan d=1, Input-25fps→fps=30-Verlust);
  (2) die xfade-Offsets wurden aus dem NOMINALEN `SEG` berechnet → Offset > echte Segmentlänge → ffmpeg-xfade-Kette
  **kollabiert auf 1 Segment**. **FIX:** Standbild-Input `-loop 1 -framerate $FPS -t $SEG -i` (volle Länge) **+**
  xfade-Offsets aus den ECHT gemessenen Segmentlängen (`SEGDUR[]` per ffprobe) statt aus `SEG`. Verifiziert:
  DE VD=25.1s/EN 21.3s = Voiceover-Länge. DEBUG-Echos (DUR/SEG/Segmentlängen/VD) bleiben im Skript.
- **🔴 ElevenLabs-Key = HTTP 401 (ungültig/abgelaufen)** für BEIDE Endpoints (Music API **und** TTS). 401≠403 →
  es ist nicht nur Plan-Sperre, der Key selbst wird abgelehnt. Fallback greift sauber: **Musik = `automation/reel_music.m4a`**
  (royalty-free, legal), **Stimme = Google-TTS** (natürlich, Zahlen ausgeschrieben). **USER-TODO:** frischen
  `ELEVENLABS_API_KEY` als Secret setzen → dann custom TikTok-Vibe-Musik (`gen_music.sh`, force_instrumental) + ElevenLabs-Stimme.
- **Stand:** «Selbst gestalten»-Print-Werbung DE+EN fertig & geliefert (NICHT gepostet — User: erst posten wenn mehr
  Follower). Fashion-Werbung (2. Video) = Gate offen (Katalog fertig) → `werbevideo.yml concept=fashion heroes=<…> stills=…`.

## 🎬 Fashion-Werbung (2. Video) — gebaut 2026-06-08 spät
- 1-Klick: `werbevideo.yml concept=fashion heroes=brise,daisy,sirene stills=4 seconds=4 source=dropship/ads/good_products_fashion_ad.csv`.
- Veo-Bewegung (veo-3.1-lite, image-to-video, 4s) für **brise/daisy/sirène** + bereits vorhandene `cosy`+`nuit`-Clips
  → Manifest-Reihenfolge alphabetisch: **brise(Opener), cosy, daisy, nuit, sirène** = Kleider+Cardigan+Tasche
  (passt zum Sprechertext „Kleider, Taschen & Accessoires"). Stills aus kuratierter `good_products_fashion_ad.csv`
  (Strohtasche/Dos-Nu/Lumea/Savanna — keine Doppelung zu den Veo-Heroes).
- Output `reels/werbung-luxestyle-{de,en}.mp4` (+`-clean`). Audio = Fallback (ElevenLabs 401) bis User neuen Key setzt;
  dann 1 Re-Render mit echter Musik+Stimme (Veo-Clips sind committet → kein neuer Veo-Cost).
- **Posten: NICHT** (User: erst bei mehr Followern). Veo-`reels_seed.csv`-Queue wird vom Commit-Step NICHT committet → kein Auto-Post.

## 🎬 Werbevideo v2 (2026-06-08 nachts) — User-Feedback eingearbeitet
- **Veo-Bewegung entdreht:** `buildPrompt` in `automation/veo-hero-clip.mjs` verbietet jetzt explizit Rotation/180-360-Spin/
  Orbit/Flip → nur sanfter Dolly-in + Parallaxe, Motiv bleibt frontal. (User: „muss nicht 180 sein, einfach animieren;
  wenn's nicht geht, dann nicht" → Bewegung dezent, nicht erzwungen.)
- **Fashion-Manifest = nur gewählte Heroes in Reihenfolge** (statt glob-all): `werbevideo.yml` Step 2 iteriert über
  `HEROES_IN` (Komma-Liste) → `reels/veo-hero-<name>-*.mp4` neueste, in Input-Reihenfolge. Keine alten/rotierenden
  Clips mehr. `HEROES_IN`-Env ergänzt.
- **Strohtasche raus → Kleid:** `dropship/ads/good_products_fashion_ad.csv` Zeile strohtasche → **fleurette**
  (Blumen-Maxikleid). Stills jetzt: dosnu, lumea, savanna, fleurette (alle Kleider, keine Schrift-Probleme).
- **ElevenLabs-Key vom User neu gesetzt** → beide Videos neu gerendert mit echter Musik (gen_music.sh, instrumental)
  + ElevenLabs-Stimme. Fashion-Heroes-Reihenfolge: brise(Opener)→daisy→sirène→nuit→cosy.
- Commit 48263c54. Weiterhin NICHT gepostet.

## 📣 Posting-Status + Stil (2026-06-08 spät)
- **User postet TikTok selbst** (hat 1 Werbevideo manuell auf TikTok gepostet). **Claude soll IG + FB + Threads** übernehmen
  („mach du die andere 3"). → Posting jetzt FREIGEGEBEN (vorher „erst später").
- **Musik final = lizenzfreier House-Track** (Mixkit, kommerziell frei) `dropship/ads/ad_music.mp3`; Stimme = Google
  (User: ElevenLabs zu teuer/leer). gen_music.sh Fallback zeigt auf ad_music.mp3.
- **Video-Posting-Weg:** `social/meta_post.mjs` postet IG-Reels (media_type=REELS, video_url) + FB-Page-Video (file_url)
  von ÖFFENTLICHER URL. Reels sind unter `https://abannews.com/reels/<datei>.mp4` erreichbar (200, GitHub Pages).
  ⚠️ Threads-VIDEO ist in meta_post.mjs NOCH NICHT drin (nur IG+FB). FB braucht gültigen Page-Token (früher gefehlt).
- **Stil-Referenz vom User (gefällt ihm):** Graff-FB-Ad — enger Crop Model+Produkt, dunkler Hintergrund, großes
  Marken-Logo mittig, shoppbare Produkt-Kacheln + „Jetzt kaufen". = Premium-Catalog-Look als Richtung für Bild-Ads.

## 📣 Social-Posting VOLL AUTOMATISIERT (2026-06-08 nacht) — Feed + Stories
- **Feed-Videos:** `automation/video-autopost-meta.mjs` + `.github/workflows/video-meta-autopost.yml` (Cron 2×/Tag).
  Queue `social/video_queue.csv`. Postet IG-Reel + FB-Page-Video + Threads-Video von ÖFFENTLICHER URL
  (`https://abannews.com/reels/<datei>.mp4`). **LIVE getestet: IG+FB+Threads ALLE erfolgreich** (Fashion DE gepostet,
  IDs IG 17967279882019494 / FB 2993507844185859 / Threads 18088917572624711). FB-Token zieht jetzt
  (Page-Token via `/me/accounts` automatisch geholt — altes FB-Problem GELÖST).
- **Stories:** `automation/story-autopost-meta.mjs` + `.github/workflows/story-meta-autopost.yml` (Cron 4×/Tag).
  Queue `social/story_queue.csv` (type=image|video). IG-Stories (Bild+Video) + FB Foto-/Video-Story. Threads = keine Stories.
  **LIVE getestet: IG-Video-Story ✅.**
- **🔑 robots.txt-LEHRE:** Der FB-**rupload**-Fetcher (Video-Story) respektiert abannews.com/robots.txt → `403 Restricted
  by robots.txt` beim `file_url`-Upload. FIX: Video-Bytes im Runner selbst laden + **binär** zu rupload hochladen
  (`offset/file_size/Content-Type:octet-stream`). IG + FB-Feed-Video ziehen die URL problemlos (anderer Fetcher).
- **Direktlinks in Feed-Captions:** Fashion → `luxestyle.ch/collections/sommer`, Print → `luxestyle.ch/collections/selbst-gestalten`
  (beide 200). Stories haben per API KEINE Link-/Caption-Param → Marke steckt im Medium (Logo/Outro).
- **Gestaffelt:** je 1 Post/Lauf (MAX_PER_RUN=1) + `scheduled_date`-Gate → kein Spam. User postet TikTok selbst.
- **Tokens (Secrets, funktionieren):** IG_USER_ID + (IG_ACCESS_TOKEN/META_ACCESS_TOKEN), FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN
  (oder META_ACCESS_TOKEN), THREADS_USER_ID + THREADS_ACCESS_TOKEN.

## 🎨 POD-Meisterwerk-Seite "Selbst gestalten" (2026-06-08 nacht) — produkt-first + Gemini-Loop
- **Shopify-Page** gid://shopify/Page/698444710273 (handle `selbst-gestalten`) komplett neu: **PRODUKT-FIRST**
  (User: "Kunden wollen zuerst Produkte sehen, nicht Text") — 26 wunschdesign-Produktkarten (Bild/Name/ab-Preis/
  "Gestalten→", Links /products/<handle>) ganz oben, Erklärung/Steps/FAQ danach. Marken-Gold #c1922f, mobil-first.
- **Pipeline (im Repo, wiederverwendbar):** `dropship/pod/gen_page.mjs` (Generator, liest `wunsch_raw.json`) →
  `dropship/pod/page_body.html` → `automation/update_pod_page.mjs` (Shopify Client-Credentials pageUpdate) +
  Workflow `pod-page-update.yml`. **Shopify-Creds (SHOPIFY_SHOP/CLIENT_ID/CLIENT_SECRET) sind gesetzt & funktionieren** ✅.
- **Gemini-Kritik-Loop:** `automation/gemini_page_critique.mjs` + `pod-page-critique.yml` (GEMINI_API_KEY-Secret) →
  Kritik nach `dropship/pod/gemini-critique.md`. Runde 1 (7.5/10) → v2 umgesetzt: Kategorie-Filter (Kleidung/Taschen/
  Accessoires, data-cat + JS), Sticky-CTA, Preis-Klarheit, Step-Icons, ehrliche Trust-Zeile (KEINE Fake-Reviews),
  Ideen-Chips. Runde 2 fand echten Bug (Count-Inkonsistenz 26 vs 120+) → v2.1: "100+ Farben&Grössen" + Desktop-Sticky.
- **Offen/optional (Gemini):** echte Kundenbewertungen (Judge.me, sobald vorhanden) + Beispiel-Design-Galerie (braucht
  Mockup-Assets). Bewusst weggelassen, keine Fake-Inhalte.
- Storefront-Cache braucht ~Minuten nach pageUpdate (Admin-API ist sofort aktuell). URL: luxestyle.ch/pages/selbst-gestalten

## 🎨 POD „Gestalten"-Tool VOLL AUTONOM (2026-06-09 nachts) — eigenes Widget, kein Drittanbieter
- **Problem gelöst:** Printful-Produkte hatten KEINE Kunden-Personalisierung (1 Variante, „Dein Design"=Mockup).
  Eigenes Widget gebaut statt App/Printful-Toggle.
- **`pod/designer.js`** (via GitHub Pages → abannews.com/pod/designer.js), per Mini-Snippet in jede
  POD-Produktbeschreibung. Features: **Vorne/Hinten-Umschalter** (eigene Mockups + Vorschau je Seite),
  **TEXT** (Schrift/Farbe/Grösse/Platzierung, Live-Vorschau), **Logo/Bild-Upload** (Cloudinary unsigned —
  Tab erscheint sobald `CLOUD`+`PRESET` in designer.js gesetzt), **zweisprachig DE/EN** (auto aus `Shopify.locale`).
- **Add-to-cart:** liest gewählte Variante aus dem Shopify-Formular, legt sie per `Shopify.routes.cart_add_url`
  (locale-sicher) mit Design als **properties** ab; spiegelt Design zusätzlich in versteckte `properties[]`-Inputs
  des Formulars → **auch der normale Theme-Kaufbutton trägt das Design** (kein Blank-Order). LIVE getestet: Text+Vorschau
  +Warenkorb funktionieren (Screenshots vom User bestätigt).
- **Rollout:** `automation/pod_inject_designer.mjs` + `.github/workflows/pod-inject-designer.yml` (idempotent,
  Vorne/Hinten-Erkennung per Bild-Dateiname front/back). **Auf ALLEN 26 wunschdesign-Produkten live.**
- **Gemini-Kritik-Loop:** `automation/gemini_widget_critique.mjs` + `pod-widget-critique.yml` → `dropship/pod/widget-critique.md`
  (6/10). Umgesetzt in v5: grössere Swatches+Häkchen, Bild-entfernen-Button, Upload-Sperre, besserer Platzhalter,
  locale-sichere URLs, Zweisprachigkeit.
- **Mehrsprachig:** Shop hat DE(primär)/EN/FR/IT **published** → Switcher existiert nativ. POD-Seite EN via
  `automation/pod_translate_page.mjs` + `pod-translate-page.yml` (`translationsRegister`, Titel/Body/Meta) →
  **luxestyle.ch/en/pages/selbst-gestalten** komplett englisch (verifiziert).
- **OFFENE USER-SCHRITTE (für „komplett hands-off"):**
  1. **Foto/Logo-Upload:** Cloudinary-Gratis-Konto → `CLOUD`+`PRESET` (öffentlich) in `pod/designer.js` setzen → Bild-Tab live auf allen 26.
  2. **Front+Back-Druck:** in Printful pro Produkt 2. Druckfläche + Aufpreis aktivieren (Widget bietet Hinten schon an).
  3. **Auto-Fulfillment:** Printful-API-Key als Secret → Workflow, der bei jeder Bestellung den Druckauftrag mit dem
     Kunden-Design erstellt (noch zu bauen).
- **Nächster geplanter autonomer Schritt:** Beispiel-Design-Galerie auf der POD-Seite (Gemini-Bilder), war hinter dem
  funktionierenden Gestalten-Button gegated — jetzt möglich.

## 🟢 HANDOFF 2026-06-09 (ZUERST LESEN — POD-Selbstgestalten KOMPLETT live + offener Profit-Schritt)

### Live & autonom (alles auf `main`, gepusht)
- **POD „Gestalten"-Tool auf ALLEN 26 wunschdesign-Produkten** (`pod/designer.js` via GitHub Pages → abannews.com/pod/designer.js;
  Snippet je Produktbeschreibung via `automation/pod_inject_designer.mjs` + Workflow `pod-inject-designer.yml`, idempotent).
  Features: **Vorne/Hinten** (eigene Mockups+Vorschau), **Text** (Schrift/Farbe/Grösse/Platzierung, Live-Vorschau),
  **Logo/Bild-Upload** (Cloudinary, Tab erscheint sobald `CLOUD`+`PRESET` in designer.js gesetzt), **zweisprachig DE/EN**
  (auto aus `Shopify.locale`), **locale-sichere Cart-URLs**. Design reist als Bestell-`properties` mit; zusätzlich in
  versteckte `properties[]`-Formularfelder gespiegelt → **auch der normale Theme-Kaufbutton trägt das Design** (kein Blank-Order).
- **Shop ist mehrsprachig** (DE primär / EN / FR / IT alle published → Switcher nativ). **POD-Seite EN live**:
  luxestyle.ch/en/pages/selbst-gestalten via `automation/pod_translate_page.mjs` (`translationsRegister`, Page 698444710273).
- **Inspirations-Galerie** (6 KI-Beispiel-Designs) live auf DE+EN POD-Seite (nach dem Produktraster).
- **KI-Bild-Generator** `automation/gen_looks.mjs` + `gen-looks.yml` (Gemini „Nano Banana", funktioniert!). 19 Looks in
  `social/looks/` (ex-*, ex2-*, hero-*). Eigene Batches via `social/looks/prompts.json`. Bilder via Pages: abannews.com/social/looks/<name>.png.
- **hero-summer-2.png** in Shopify-Files hochgeladen (MediaImage 69637951193473) → User setzt es im Customizer als Startseiten-Hero
  (Theme API-gesperrt). Weitere gute Heroes: hero-dark-luxe, hero-street-young (Fremd-Text „NOCTURE"/„FASHION" → durch LuxeStyle ersetzen, falls genutzt).
- **Werbevideos** (werbevideo.yml) + **Social-Autopilot** Feed (video-meta-autopost.yml) + Stories (story-meta-autopost.yml) laufen.
- **Gemini-Kritik-Loops**: pod-page-critique.yml, pod-widget-critique.yml (→ dropship/pod/*-critique.md).

### 🚨 KRITISCH OFFEN: PREISE ZU TIEF → kein/negativer Gewinn
- POD-Preise teils UNTER Printful-Kosten: T-Shirt CHF 8 (Kosten ~10-11), Tasse CHF 7.50 (~7-8), Premium-Hoodie CHF 28.50 (~27-30).
  **NICHT auf Verkauf bewerben/vermarkten, bis Preise gefixt sind** (sonst Verlust pro Verkauf).
- **User-Auftrag wörtlich: „schau das ich auch guten win mache".** Ziel-Marge: Retail ≈ Kosten ×2,2–2,5, mind. CHF 12–15/Teil,
  .90-Preise. Plan-Vorschau: T-Shirt 24.90 (Gewinn ~13), Hoodie 59.90 (~29), Tasse 19.90 (~11), Tote 22.90 (~12), Cap 29.90 (~15),
  iPhone-Hülle 27.90 (~15), Trinkflasche 39.90 (~21), Bomberjacke 89.90 (~42).

### 🔑 OFFENE USER-SCHRITTE (Reihenfolge)
1. **Printful-API-Key** (Printful → Settings → Developers → API → Add token, Scopes Products+Orders) → als GitHub-Secret.
   Dann AUTONOM: echte Kosten ziehen → **alle Preise auf gesunde Marge** setzen → **Fertig-Design-Produkte + viele Kunden-Vorlagen**
   anlegen (auto-druckbar) in „Fertige Designs"-Kollektion → **Auto-Fulfillment** (Bestellung druckt/versendet sich selbst).
   **ERST danach** vermarkten (Looks als Ads/Posts). User kommt „am Abend" mit dem Key.
2. **Cloudinary** (gratis: Cloud Name + Unsigned Preset, beides öffentlich) → in `pod/designer.js` `CLOUD`/`PRESET` → Foto/Logo-Upload live auf allen 26.
3. **Printful Rückseiten-Druckfläche + Aufpreis** pro Produkt (Widget bietet „Hinten" schon an).
