# 🎬 Produkt-Videos — drei Wege (Stand 2026-06-13)

> Ziel: echte Bewegung an den Produkten (PDP) **und** Reels für Social. CJ liefert das Feld
> `productVideo` praktisch nie gefüllt → wir holen Videos selbst. AliExpress blockt direktes
> Cloud-Scraping (HTTP 403, Akamai). Darum drei Wege, alle als persistenter Code committet
> (No-op-sicher, aktivieren per Secret/PC — wie beim CJ-Import).

Gemeinsamer Baustein: **`automation/attach_video_to_product.mjs`** — lädt ein lokales MP4 via
`stagedUploadsCreate(VIDEO)` hoch und hängt es per `productCreateMedia(VIDEO)` ans Produkt
(pollt bis `READY`). Auth wie `upload_to_shopify_cdn.mjs` (SHOPIFY_SHOP + CLIENT_ID/SECRET, oder
SHOPIFY_ADMIN_TOKEN). Wird von allen drei Pipelines genutzt.

## C — Eigene Clips via Luma (empfohlen, copyright-sauber) ✅
`automation/luma_product_video.mjs` — macht aus dem **sauberen Produkt-Hauptbild** ein
Bewegungs-Video (Luma Dream Machine, Image-to-Video, ruhige Premium-Kamera, kein Text/Wackeln),
hängt es ans Produkt und (mit `--queue`) in `social/video_queue.csv`.
- **Secret:** `LUMA_API_KEY` (+ Shopify-Creds für den Attach).
- **Lauf:** `node automation/luma_product_video.mjs gid://shopify/Product/15430179651969 --queue`
  oder `--pids 15430179651969,15430179357057`. `--no-attach` = nur rendern, `--dry` = Vorschau.
- Vorteil: 100 % unsere Assets (keine Copyright-Grauzone), läuft voll autonom.

## A — AliExpress-Video über PC-Claude-Browser
`automation/local/ae-video-fetch.mjs` — läuft am PC über das eingeloggte Brave (CDP 9222, wie die
Follower-/DM-Tools), sucht je Produkt auf AliExpress, öffnet den Top-Treffer und fängt die echte
`.mp4` aus dem Netzwerk ab. Mit Shopify-Creds hängt es das Video direkt an; sonst → `ae-video-found.csv`.
- **Start (PC):** `node automation/local/ae-video-fetch.mjs --in dropship/ae-targets.csv`
- Kein API-Key nötig (nutzt die Browser-Session). Copyright: Lieferanten-Video (Dropship-üblich, grau).

## B — AliExpress Open-Platform API (voll autonom nach Freischaltung)
`automation/aliexpress_video_api.mjs` — TOP-Gateway, HMAC-SHA256-signiert: Keyword-Suche →
`productdetail.get` → `product_video_url` → download → attach.
- **Secrets:** `ALI_APP_KEY` + `ALI_APP_SECRET` (+ optional `ALI_TRACKING_ID`; API muss freigeschaltet sein).
- **Lauf:** `node automation/aliexpress_video_api.mjs --in dropship/ae-targets.csv`

## Ziel-Liste
`dropship/ae-targets.csv` — `productGID,Suchtitel(EN)` für die 16 neuen Produkte (2026-06-13).
Für Weg C zählt nur die GID (Bild kommt aus Shopify), Weg A/B nutzen den Suchtitel.

## ✅ Lauf 2026-06-13 — Weg C live (16/16)
Alle **16 neuen Produkte** haben jetzt ein Luma-Video (Image-to-Video, ray-flash-2, ~5s, ruhige
Premium-Kamera, kein Text/Logo). Erzeugt aus dem Produkt-Hauptbild, hochgeladen via Shopify-Staging
(`stagedUploadsCreate(VIDEO)` + GCS-POST) und per `productCreateMedia(VIDEO)` ans Produkt gehängt —
**Foto bleibt Hauptbild, Video kommt in die Galerie**. Shopify transkodiert (UPLOADED→READY, wenige Min).
Funktioniert komplett aus der Cloud (Luma-Key + MCP-Staging + curl), kein Shopify-Admin-Token nötig.
- **Luma-Key (funktionierend):** Format `luma-<uuid>-<uuid>` (NICHT der `luma-api-…`). Nur transient nutzen.

## ✅ Lauf 2026-06-13 (Forts.) — Conversion-Gewinner bekommen Videos (Budget ~10 CHF ausschöpfen)
Zusätzlich zu den 16 neuen Produkten haben jetzt auch die **bewerteten/starken Katalog-Produkte** Videos
(Jade-Gua-Sha, Gala, Glow, Cloud, Lino, Marco, Roma, FlexHold, Onyx, Costa, Stella, Porto, Serpent, Amalfi, Coeur …).
- **Luma-Limit gelernt:** **max. ~10 gleichzeitige Jobs** (HTTP 429 „concurrent active jobs") → in Wellen à 8–10
  generieren, abwarten, anhängen, wiederholen. Credit (HTTP 402/„insufficient") ist der eigentliche Stopp.
- **Cloud-Attach-Rezept (ohne Admin-Token):** MCP `stagedUploadsCreate(VIDEO)` → `curl -F`-POST der Bytes an GCS
  (Felder: GoogleAccessId,key,policy,signature,file — file ZULETZT) → MCP `productCreateMedia(VIDEO, originalSource=resourceUrl)`.
- **Poll-Falle:** Luma GET-by-id per Python-urllib gibt teils 403 (WAF) → mit `curl -A "Mozilla/5.0"` pollen.
- **Hands-free für den ganzen Katalog:** `SHOPIFY_CLIENT_ID`/`SHOPIFY_CLIENT_SECRET` als Secrets setzen →
  dann hängt `automation/luma_product_video.mjs` selbst an (kein manuelles Staging mehr) und kann das Restguthaben
  unbeaufsichtigt verbrauchen: `node automation/luma_product_video.mjs --pids <id,id,...>`.
- **Staging-Falle:** Die `stagedUploadsCreate`-Policy läuft **sehr kurz** (~sofort) ab → Bytes SOFORT nach dem
  Staging hochladen (in Gruppen ≤5), sonst HTTP 400 beim GCS-POST. Bei 400 einfach neu stagen + sofort posten.

### Stand 2026-06-13 — 57 Produkte mit Luma-Video, Budget (~10 CHF) AUFGEBRAUCHT ✅
Wellen bis das Guthaben leer war (Luma: HTTP 400 „Insufficient credits"):
- 16 neue cj-real + 15 bewertete/starke (good_products) + 10 Schmuck (Ringe/Ohrringe/Tennis-Armband)
  + 10 Home/Bamboo/Couple (FreshSeal, SharpPro, Seifenspender, Coffee-Becher, Bamboo-Mode, Espadrilles,
  Lisbon-Slipper, Soulmate-Kette) + 6 Couple-Schmuck/Hunde-Feeder = **57 live**.
- **Credit-Stopp:** ~10 CHF reichten für insgesamt rund **57 Clips** (ray-flash-2, 720p, 5 s). Danach 400
  „Insufficient credits" → sauberer Stopp im Generator (`genw.py`/`luma_product_video.mjs` brechen bei 402/„credit" ab).
- POD-„Selbst gestalten" + Text-Shirts bewusst ausgelassen (Motion verzerrt Text/Logos).
- **Für künftige Läufe:** Guthaben in Luma aufladen → dann weitere Wellen oder hands-free über
  `luma_product_video.mjs` (mit `SHOPIFY_CLIENT_ID/SECRET` als Env, da GitHub-Secrets in der Cloud-Session nicht sichtbar).

### ⚠️ ZWEI Luma-Konten / ZWEI APIs (wichtig, 2026-06-13)
Der User hat **zwei** Luma-Zugänge — nicht verwechseln:
1. **Alt „Dream Machine API"** — Key-Format `luma-<uuid>-<uuid>`, Basis `https://api.lumalabs.ai/dream-machine/v1`,
   Modell `ray-flash-2` (billig), `GET /credits` vorhanden, Concurrency ~10. Dieses Konto war das mit den ersten
   ~10 CHF → **jetzt $0** (57 Clips verbraucht).
2. **Neu „Agents API"** (platform.lumalabs.ai, Konto „alleng chour") — Key-Format **`luma-api-…`**, Basis
   **`https://agents.lumalabs.ai/v1`**, Bearer-Auth, Modell **nur `ray-3.2`** (Premium, teurer → weniger Clips/$),
   **Concurrency-Limit 4** (strenger!), **kein** `/credits`-Endpoint. Doku: https://docs.agents.lumalabs.ai
   - **Generate:** `POST /v1/generations` Body `{"model":"ray-3.2","type":"video","prompt":"…","aspect_ratio":"9:16",
     "video":{"resolution":"720p","duration":"5s","start_frame":{"url":"<bild>"}}}` → `{id,state:"queued"}`.
   - **Poll:** `GET /v1/generations/{id}` → `state:"completed"`, MP4 in **`output[0].url`** (S3, ~1 h gültig → sofort laden).
   - **Stopp-Signale:** 402/„Insufficient credits" = leer; „Concurrent generation limit reached (4)" / „Rate limit exceeded" = nur warten.
   - Skripte: `/tmp/genag.py`, `/tmp/pollag.sh`, `/tmp/runag.py` (Driver mit Concurrency-3, Stopp bei Credit).
   - **`luma-api-…`-Keys gehen NICHT auf die Dream-Machine-API** (gibt „Not authenticated") und umgekehrt.
   - **GCS-Upload-Falle (Agents-Clips):** Die Shopify-Staging-Policy läuft fast sofort ab → die Bytes **parallel**
     hochladen (`curl … & … & wait`), NICHT sequentiell; bei sequentiellem Upload von >2 Dateien laufen die späteren
     Policies ab (HTTP 400/403). Grosse Dateien (>3 MB) ggf. einzeln + sofort nach dem Staging.
   - **Stand:** Auf dem neuen $10-Konto bereits **15 Stufe-A-Clips** angehängt (Home-Gadgets/Reisetaschen/Bamboo),
     weitere Welle (Abendkleider/Diffuser/Multitool/Uhr …) läuft per `runag.py` bis 402. Gesamt-Videos im Shop: ~72+.

## Aktivierung (1 Schritt je Weg)
- **C:** `LUMA_API_KEY` als GitHub-Secret (oder transient in die Session geben) → ich starte den Lauf.
- **A:** PC-Claude „AE-Videos holen" sagen (Brave läuft mit Port 9222).
- **B:** `ALI_APP_KEY`/`ALI_APP_SECRET` als Secrets, sobald die AE-API freigeschaltet ist.
