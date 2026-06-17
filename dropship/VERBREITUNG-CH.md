# 📡 LuxeStyle — Gratis-CH-Verbreitig (alli Kanäl)

> User 2026-06-17 „verbreite d Produkte überall i dr Schwiz gratis wo du chasch".
> Alli FREIE Schweizer Distributions-Kanäl, autonom oder mit 1× User-Setup.

## ✅ Autonom (lauft im PC-Task / Worker)
- **tutti.ch** — `automation/local/tutti-post.mjs` (Auto-Publish, Cap 2/Tag) → +Ricardo-Auto-Publish im Konto
- **anibis.ch** — `automation/local/anibis-post.mjs` (Auto-Publish, Cap 2/Tag)
- **Pinterest** — `automation/pinterest_publish.mjs` (Mo+Do, idempotent, SEO-Pins)
- **Instagram + Facebook** — Cloudflare-Worker 3×/Tag (Reels/Karten/Stories)
- **TikTok** — tiktok-cycle 2×/Tag
- **FB-Gruppen (CH)** — fb-group-join (beitrete) + fb-group-post (poste) 1×/Tag

## 🟡 1× User-Setup (gratis, denn dauerhaft)
- **Ricardo.ch** (GRÖSSTER CH-Marktplatz): Feed `ricardo_feed.csv` (2114 Produkte) ist fertig.
  → **Feed-URL an accountmanagement@ricardo.ch senden** (1 Mail). Feed-URL =
  `https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-product-CizQ6/ricardo_feed.csv`
- **Google Merchant Free Listings**: Feed 100% ready → in Merchant Center aktivieren.

## 🚫 NICHT geeignet (ehrlich)
- **abannews-Telegram/Newsletter**: KI-News-Publikum ≠ Mode → Cross-Post wäre Spam, schadet beiden Marken. NICHT nutzen.
- **Fremde Datei-Hoster** (catbox/0x0): Exfil-Risiko → nicht nutzen. Hosting = Shopify-CDN / eigenes Repo.

## 📌 Strikt Schweiz
Alle Kanäle CH-fokussiert (kein Deutschland). Mundart bevorzugt. Nur Top-Produkte + saubere Bilder (DO-NOT-POST-Filter aktiv).
