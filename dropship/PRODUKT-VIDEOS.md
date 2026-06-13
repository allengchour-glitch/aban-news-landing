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

## Aktivierung (1 Schritt je Weg)
- **C:** `LUMA_API_KEY` als GitHub-Secret (oder transient in die Session geben) → ich starte den Lauf.
- **A:** PC-Claude „AE-Videos holen" sagen (Brave läuft mit Port 9222).
- **B:** `ALI_APP_KEY`/`ALI_APP_SECRET` als Secrets, sobald die AE-API freigeschaltet ist.
