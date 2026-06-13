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

## Was es konkret tut
- Holt die **50 neuesten** `cj-real`-Produkte (sortKey CREATED_AT).
- Für jedes mit **fehlendem SEO-Titel** → setzt sauberen Titel `… | LuxeStyle` + Nutzen-Description.
- Für jedes mit **fehlender Kategorie** → setzt Shopify-Taxonomie (Produkttyp→ID-Map = wie `catalog_enrich.py`)
  → speist Google Free Listings.
- Idempotent: bereits gepflegte Produkte werden übersprungen.

## Grenzen (ehrlich)
- **Apps installieren** geht nur per User-OAuth — das kann kein Skript. Die wichtigen sind aber schon da
  (Judge.me, Google & YouTube, Pinterest, Klaviyo).
- **Bilder/Pins** macht der separate `workers/pinterest-cron/` (gleiches Prinzip).
- SEO-Texte sind Template-basiert (sauber & konsistent), keine individuelle Copywriting-Magie — dafür
  läuft es 100% autonom und gratis.
