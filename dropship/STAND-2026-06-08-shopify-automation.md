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
