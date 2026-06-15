# 🧠 Shop-Brain — vollautomatische Produkt-Veredelung (gratis, dauerhaft)

Hält den Katalog selbstständig auf Top-Niveau: prüft per Cron die neuesten Produkte und setzt
**fehlende SEO + Kategorie** automatisch. Läuft auf **Cloudflare** — kostenlos, keine GitHub Actions,
keine Kreditkarte. Nutzt die **Shopify Admin API** direkt (keine App-Installation nötig).

## Warum das die Lösung ist
Andere Import-Bots legen ständig neue Produkte an, teils **ohne SEO/Kategorie** (und überschreiben sie
sogar wieder). Das Shop-Brain bügelt das **alle 6 Stunden automatisch** aus — niemand muss etwas tun.

## Einrichtung (einmalig, ~10 Min — alles gratis)
1. **Cloudflare-Konto** (hast du schon, abannews liegt dort).
2. **KV anlegen** und die id in `wrangler.toml` eintragen:
   ```
   cd workers/shop-brain
   npx wrangler kv namespace create BRAIN_KV   # gibt id aus -> in wrangler.toml
   ```
3. **Shopify-Secrets** setzen (Client-Credentials — der Shop hat eine Custom-App; Werte = aus
   `automation/reel-analytics.mjs`-Secrets bzw. Dev-Dashboard):
   ```
   npx wrangler secret put SHOPIFY_SHOP            # au3j0y-hq.myshopify.com
   npx wrangler secret put SHOPIFY_CLIENT_ID
   npx wrangler secret put SHOPIFY_CLIENT_SECRET
   ```
   Optional: `TRIGGER_KEY` (Test-Schutz), `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (Status-Push 1×/Lauf).
4. **Deployen:**
   ```
   npx wrangler deploy
   ```
   → Der Cron (`0 */6 * * *`) läuft ab jetzt von selbst. Fertig.

## Testen (ohne auf den Cron zu warten)
`https://<dein-worker>.workers.dev/?key=<TRIGGER_KEY>` → JSON-Report (geprüft / veredelt).
Letzter Lauf liegt in KV unter `last_run`.

## 🤖 KI-SEO mit Claude (optional, empfohlen)
Setzt du das Secret **`ANTHROPIC_API_KEY`**, schreibt **Claude** für jedes Produkt eine **individuelle,
verkaufsstarke** deutsche SEO (Meta-Titel + Description) statt des Templates — automatischer Fallback aufs
Template, falls Key fehlt oder die API mal hakt. Steuerung per Env:
- `ANTHROPIC_API_KEY` — dein Anthropic-Key (Secret). Ohne ihn bleibt alles beim Template.
- `BRAIN_AI_MODEL` — Modell (Default **`claude-opus-4-8`**; sparsamer: `claude-haiku-4-5`).
- `AI_LIMIT` — max. KI-Texte pro Lauf (Kosten-Deckel; Worker-Default **12** wegen Cloudflare-Subrequest-Limit,
  Node/GitLab-Default **25**).

Cloudflare: `npx wrangler secret put ANTHROPIC_API_KEY`. GitHub Actions/GitLab: als Secret/Variable setzen.

## Was es konkret tut (v3)
1. **Produkt-Veredelung:** holt die **50 neuesten** `cj-real`-Produkte. Fehlender **SEO-Titel/Description** → gesetzt
   (Template oder **Claude** mit `ANTHROPIC_API_KEY`). Fehlende **Kategorie** → Shopify-Taxonomie (Google-Feed).
2. **Collection-Cover:** Collections **ohne Titelbild** bekommen automatisch ein Cover aus einem eigenen Produktbild.
3. **Collection-SEO (v3):** Collections **ohne SEO-Titel** bekommen automatisch Titel + Description.
4. **QA-Alarme (v3, melden – kein Auto-Eingriff):** aktive Produkte **ohne Bild**, **Dubletten** (gleicher Titel),
   **Fehlpreise (CHF 0)** → Log/KV (`last_no_image`, `last_alerts`) + Telegram.
- Idempotent: bereits gepflegte Produkte/Collections werden übersprungen. Limits: `AI_LIMIT`, `COLLECTION_COVER_MAX`.

## Grenzen (ehrlich)
- **Apps installieren** geht nur per User-OAuth — das kann kein Skript. Die wichtigen sind aber schon da
  (Judge.me, Google & YouTube, Pinterest, Klaviyo).
- **Bilder/Pins** macht der separate `workers/pinterest-cron/` (gleiches Prinzip).
- SEO-Texte sind Template-basiert (sauber & konsistent), keine individuelle Copywriting-Magie — dafür
  läuft es 100% autonom und gratis.
