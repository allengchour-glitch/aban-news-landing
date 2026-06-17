# 📕 LuxeStyle — MASTER A–Z (alles im Detail · einzige Wahrheits-Quelle)

> User 2026-06-17 „du muesch alles wüsse vo A bis Z i jedes Detail". Diese Datei = vollständiger
> Überblick über die GANZE Social/Marketing-Operation. Detail-Regeln im Gehirn `automation/brain/knowledge.json`.
> Zuerst lesen: SHARED-MEMORY.md (Koordination) + CLAUDE.md (Daueraufträge) + diese Datei + dropship/STATUS.md (Verlauf).

## A — Shop-Grundlagen
- **Shop:** LuxeStyle · **luxestyle.ch** · Shopify `au3j0y-hq.myshopify.com` · ~2'100 aktive Produkte.
- **Markt:** STRIKT Schweiz (kein Deutschland!). Mundart bevorzugt. Währung CHF. Zahlung TWINT + Karte. Gratis-Versand ab CHF 65, 30 Tage Rückgabe, Code **WELCOME10** (-10%).
- **🔴 Kern-Engpass:** ~1'200 Sessions/14T aber **0 Bestellungen** → Problem = **Reichweite + Conversion**, NICHT Katalog/Content.

## B — Rollen-Split (WICHTIG)
- **Diese Session (CizQ6) = NUR Social/Marketing:** Posting, Videos/Reels, Bilder-mit-Text, Follower, Chat/DM, Engagement, Pixel/Kampagne, Verbreitung, Analyse.
- **Andere Session (ChatGPT) = Website/Theme/Katalog-Struktur.** → Theme/PDP/Menü NICHT anfassen (nur lesen). Koordination via SHARED-MEMORY.md.

## C — Zugänge (Shopify)
- Shopify-Schreibzugriff: **Client-Credentials-Grant** (`POST au3j0y-hq.myshopify.com/admin/oauth/access_token`, client_id `ffe6c3a1326affdd7f461760ac1a8950` + Secret `shpss_…` NUR in luxe-secrets). App MUSS installiert sein. `shpat_`/`atkn_` gehen nicht. Auch via Shopify-MCP (kein Key nötig).

## D — Verkaufs-/Verbreitungs-Kanäle (alle Status)
| Kanal | Status | Tool |
|---|---|---|
| Online Store / Shop | ✅ | Shopify |
| Instagram | ✅ autonom (Worker 3×/Tag) | luxe-poster |
| Facebook | ✅ autonom (3×/Tag, low engagement) | luxe-poster |
| TikTok | ✅ 2×/Tag posten + 4×/Tag Engagement | tiktok-cycle / engagement-cycle |
| Pinterest | ✅ (Token pending → dann 2×/Woche) | pinterest_publish.mjs |
| tutti.ch | ✅ autonom (Cap 2/Tag) | tutti-post.mjs |
| anibis.ch | ✅ autonom (Cap 2/Tag) | anibis-post.mjs |
| FB-CH-Gruppen | ✅ beitrete (15h) + poste (12h) | fb-group-join/post.mjs |
| Google&YouTube / Merchant | ✅ Feed ready (Free Listings aktivieren = User) | feed_polish.mjs |
| Ricardo | ❌ Feed nur B-Ware, Neuware abgelehnt (Warteliste) | — |
| eBay / TikTok Shop | ❌ keine Creds / nicht in CH | — |

## E — Content-Pipeline (Videos)
- **Build-Skripte (persistent!):** `automation/video/` — hero_ad, jewelry_cinematic, ultimate (Luma), fashion (Luma), montage/montage_fast, **flagship_film**. Register: `automation/video/VIDEO-REGISTRY.json`.
- **Hero-Videos auf CDN+Queue:** luxe-hero-ad, luxe-ultimate-ad (Luma), luxe-jewelry-cinematic, luxe-fashion-motion, luxe-flagship-film, montagen. + 40 Produkt-Reels (luxe-*-9x16).
- **Luma** (img2video, ray-flash-2, Key luma-6ac…, 9099 Cr) = echte Bewegung aus Produktbildern.
- **Musik:** `automation/music/music_library.mjs` (CC-BY, Entscheid A = legal+autonom, NIE klauen). piper = Voiceover (gratis).
- **Regeln:** Safe-Zone-Text (y≤1500), kein Botox/asiat.Schrift/Watermark, TikTok stumm-fähig (Trend-Sound in-App), Meta mit Musik.

## F — Content-Pipeline (Bilder)
- **Text-Karten = Standard** (NIE nacktes Bild): `gen_post_image.py` → editorial Karte (LUXESTYLE + Produkt + -10%-Pill), Headline adaptiv. 21 Top auf CDN → `social/text_image_map.json`.
- **IG-Carousel** (Bilderreihe/1 Kachel): `post_ig_carousel.mjs` (Di+Fr).
- **Gratis Bild-KI:** `automation/ai/image_gen.mjs` (Pollinations kein Key → CF → HF) für Hintergründe (NIE echtes Produkt fälschen).

## G — Captions / Formate (Gewinner)
- **Frage-Hooks gewinnen** («Weles nimmsch – 1,2,3?») + Produkt+CHF-Preis + Mundart. Generische Roundups floppen.
- **5 Top-Formate** (von Shops gelernt): Mini-Vlog, Transformation-Reveal, How-To, OOTD, Behind-the-Scenes — immer Frage am Schluss.
- KI-Captions: `automation/ai/ai_generate.mjs` (Groq→Gemini→… Router).

## H — Posten/Engagement-Kadenz (autonom)
- **Worker** (Cloudflare luxe-poster, Cron 8/12/17 UTC): IG+FB 3×/Tag aus queue.json (`build_queue.mjs` baut: 21 Text-Bilder + Reels + Stories, DO-NOT-POST-Filter, Dedup).
- **tiktok-cycle.ps1** 2×/Tag (posten), **engagement-cycle.ps1** 4×/Tag (analysieren+chatten+folgen).
- Setup: `SETUP-AUTONOM.bat` (1× Admin) → PC-Listener autostart + alle Cycles.

## I — Follower-Wachstum (langsam, sicher)
- `ch-follower-growth.mjs` IG 30 / TikTok 22/Tag (oder 8/6 pro Engagement-Lauf), 25–70s Pausen, Stopp bei Block. `ch-unfollow.mjs` täglich (Ratio war IG 146/814!). NUR PC-Brave-CDP. Ziel 1 Mio = nachhaltig über Monate.

## J — Analyse / Lernen (das Gehirn)
- `automation/brain/knowledge.json` (71 Regeln, kumulativ, Ratsche). `brain.mjs` lernt, `build_queue.mjs` baut Queue.
- `auto.sh`: Health→TikTok-Analyse→Trends/Musik→Lernen→Queue. `trend_scan.mjs` (Google-Trends-CH gratis + Gemini-Ideen). `image-audit.mjs` (Gemini Vision: Watermark/Botox). `tiktok_analyze.py` (yt-dlp).
- **Clarity AKTIV** (Heatmaps/Recordings) → Conversion-Analyse in 1-2 Tagen.

## K — KI-Stack (gratis, mit Fallback)
- **Router** `ai_generate.mjs`: groq→gemini→together→deepseek→openrouter→cloudflare→mistral→openai → Template. Bricht NIE.
- **Live:** Groq + Gemini (gratis). Vision: Gemini. Bilder: Pollinations. Video: Luma. Voice: piper.
- **Leer (nicht nötig, kein Geld):** DeepSeek $0, OpenAI Quota, HeyGen API 4, ElevenLabs 7.

## L — Key-Inventar (Werte NUR in luxe-secrets.ps1, NIE Repo)
GROQ ✅ · GEMINI ✅ · LUMA ✅(luma-6ac) · HEYGEN ⚠️ · ELEVENLABS ⚠️ · DEEPSEEK ⚠️ · OPENAI ⚠️ · PRINTFUL · STRIPE sk_live ⚠️(User rotiert nicht) · DOWNLOAD_SALT · LUXE_WORKER_KEY · BIGBUY · SHOPIFY_CLIENT_ID/SECRET · META_ACCESS_TOKEN/FB-Page-Token. (1 unlabeled 64-hex-Key offen.)

## M — Cloud-Steuerung
- `automation/luxe-control.mjs` (ENV LUXE_WORKER_KEY): Cloud löst PC-Aktionen via Worker-Queue aus (tutti/anibis/tiktok/deploy/campaign-dry/campaign-go/credits). Worker `&cmd=` queut (postet nicht). PC-Listener (`pc-listener.ps1`) drained 90s.
- Handy: `control.html` (Knöpfe) + Direkt-URLs.

## N — Pixel / bezahlte Kampagne (#1 Sales-Hebel)
- Pixel **D8EKVR3C77U6KT5BTBD0** (Shopify-TikTok-App). **Event-Leiter:** View Content → Add to Cart → Complete Payment (nicht direkt auf Kauf bei 0 Sales!). Playbook: `dropship/PIXEL-STRATEGIE.md`.
- **Kampagne-Bot** `tiktok-campaign-port.mjs` (Brave-CDP, Budget-Cap 350 CHF hart, CH/Frauen/18-34, Creative=flagship-film). Ablauf: `--dry` → Selektoren prüfen → AUTO_LAUNCH=1.
- TikTok bot 30-Tage-Gratis-Wachstumsprogramm angeboten (Rep Wallrath) → evtl. Ad-Guthaben (Mail-Entwurf liegt bereit).

## O — Bild/Marken-Sicherheit (teuer gelernt)
- NIE: Botox/Serum/fremd-gebrandetes Öl (HEMP for U), asiat./arab. Schrift, MADE IN CHINA, fremde Watermark, Fake-Reviews. **Jedes Bild vor Posten ansehen.**
- 4-Schichten-DO-NOT-POST: gen_post_image-Exclude + top_products sauber + build_queue-Filter (airtight) + ig-delete (published).

## P — Was NUR der User kann (kein API)
1. **TikTok-Pixel-Kampagne starten** (350 CHF) ← bringt Käufer.
2. **`SETUP-AUTONOM.bat`** 1× (Admin) → alle Bots autonom.
3. **wrangler deploy** (oder Handy) → neue Queue live.
4. **Google Merchant Free Listings** aktivieren · **Clarity-Projekt** «Accept» · **Pinterest-Token** · **fb-groups.txt** füllen.

## Q — Reproduzierbarkeit
- Container ephemer → alles Wichtige committed. `setup-free-stack.sh` baut Tools (yt-dlp/gallery-dl/Pillow). Build-Skripte in `automation/video/`. Branch **claude/luxestyle-product-CizQ6** → Draft-PR #643 nach main. NIE direkt main.
