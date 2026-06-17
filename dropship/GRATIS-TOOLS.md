# 🧰 LuxeStyle — Gratis-Tools & Apps für alles Mögliche (Verbesserige)

> User 2026-06-17 „gratis tools und apps für alles mögliche für Verbesserige".
> Diese Liste = was **integriert** ist (✅ läuft schon im Code) vs. **empfohlen** (👉 ein Key/Install).
> Prinzip: **alles gratis, mit Fallback** — fällt eins aus, greift das nächste. Keys NUR in
> `luxe-secrets.ps1`/ENV, NIE im öffentlichen Repo.

## 🤖 KI — Text / Captions / Strategie
- ✅ **Multi-Provider-Router** `automation/ai/ai_generate.mjs` — groq→gemini→openrouter→cloudflare→mistral→openai, autom. Fallback, Template ohne Key.
- ✅ **Groq** (console.groq.com) — GRATIS, sehr schnell, aktiver #1. Key gesetzt (luxe-secrets.ps1).
- 👉 **Gemini** (aistudio.google.com), **OpenRouter** (:free-Modelle), **Cloudflare Workers AI**, **Mistral** — je mehr Keys, desto mehr Redundanz.

## 🖼️ KI — Bilder (Hintergründe / Lifestyle / Banner / Story-Backdrops)
- ✅ **`automation/ai/image_gen.mjs`** — Fallback: **Pollinations (GRATIS, KEIN Key, FLUX)** → Cloudflare-FLUX → HuggingFace. Skaliert sauber auf 1080×1920.
- ⚠️ Regel: KI-Bilder NUR als Hintergrund/Lifestyle/Banner — **NIE ein echtes Produkt fälschen** (Misrepresentation). „no text/watermark" ist im Prompt fest drin.
- 👉 Optional: **Cloudflare Workers AI** (CF-Token) / **HuggingFace** (HF_API_KEY) als Qualitäts-Fallback.

## 🎬 Video / Bild / Audio (lokal, gratis, kein Key)
- ✅ **ffmpeg** — Reels/Montagen/Ken-Burns/xfade/Grade/Text (alle Builder).
- ✅ **piper** — DE/Mundart-Voiceover (Kerstin), gratis offline.
- ✅ **Pillow (PIL)** — `gen_post_image.py` Text-Karten (Wortmarke+Preis-Pill).
- ✅ **music_library.mjs** — kommerziell-freie Musik (Kevin MacLeod CC-BY), Auto-Attribution.
- 👉 **rembg** (pip, gratis lokal) — Hintergrund freistellen für saubere Produkt-Cutouts (Setup optional, ~170 MB Modell).

## 📈 Analyse / Trends / SEO (gratis)
- ✅ **`automation/trends/trend_scan.mjs`** — Google-Trends-CH (RSS, KEIN Key) + KI-Content/Musik-Ideen.
- ✅ **`tools/tiktok_analyze.py`** (yt-dlp) — eigene TikTok-Performance.
- ✅ **`automation/health-check.mjs`** — was lebt gerade (Provider/Tools/Quellen).
- ✅ **gallery-dl** (pip) — Bild-/Trend-Scraping von Creatorn (Ideen klauen, nicht reposten).
- 👉 **Metricool** (gratis-Tier) — Cross-Plattform-Insights (manuell/öffentlich).
- 👉 **Google Search Console + Merchant Free Listings** (gratis) — organischer Shop-Traffic.

## 📤 Posten / Reichweite (gratis)
- ✅ **Cloudflare-Worker `luxe-poster`** — IG+FB autonom 6×/Tag (gratis Cron).
- ✅ **TikTok-Upload** via PC-Brave-CDP (kein API-Audit nötig).
- ✅ **ch-follower-growth.mjs** — echte CH-Follower (langsam, sicher).
- ✅ **Pinterest** (`pinterest_publish.mjs`, bestehendes System) + **tutti/anibis** (Gratis-CH-Marktplätze).

## 🔁 Reproduzierbar aufbauen
- ✅ **`automation/setup-free-stack.sh`** — installiert/prüft yt-dlp/gallery-dl/Pillow + Health-Check.
- Container sind ephemer → dieses Skript + die Committed-Tools sind die Wahrheit; jede neue Session/PC baut den Stack neu auf.

## 🟡 Nur-User-Klicks (kein API-Weg) — bringen die Käufe
- **TikTok-Pixel + bezahlti CH-Kampagne** (A-Video = Creative) · **Google Merchant Free Listings** · **`wrangler deploy`** (Queue live).
