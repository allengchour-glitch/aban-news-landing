# 🤖 LuxeStyle — Autonomie-Architektur

Übersicht, **was vollautonom läuft**, was **noch einen einmaligen User-Schritt** braucht, und **welches Tool was tut**.
Ziel des Auftrags (CLAUDE.md): Shop vollautonom betreiben → kaufende Kunden. Diese Datei bündelt die Autonomie-Bausteine.

## Die 3 Always-on-Wege (laufen ohne aktive Session)
| Weg | Status | Was er tut | Was zum Scharfschalten fehlt |
|---|---|---|---|
| **Cloudflare Worker** (`cloudflare/`, deployed: `luxestyle-autopilot.allengchour.workers.dev`) | LIVE, Crons aus | Social-Autopilot (Bild/Reel/Post), Gelato- & Stripe-Webhooks, **Shop-Wartung** (neu) | Crons einkommentieren + Secrets (s.u.) + redeploy |
| **GitHub Actions** | Workflows da | `bestseller-refresh.yml` (täglich), `shop-autopilot.yml` (täglich) | Repo-Secrets + ggf. Actions aktiviert |
| **In-Session (MCP)** | sofort | Alles manuell durch Claude pro Session | — (läuft, aber nicht unbeaufsichtigt) |

## Autonome Tools (in diesem Repo)
| Tool | Zweck | Lauf |
|---|---|---|
| `automation/shop_autopilot.mjs` | **SEO-Autofix** neuer Produkte (ohne `seo.title`) + **Bild-QA** (FAILED-Report) + **Health-Report** + Telegram-Digest | `node automation/shop_autopilot.mjs` (DRY) · `LIVE=1` schreibt · `TASK=all\|seo\|images\|health` |
| `automation/update_bestsellers.mjs` | **Bestseller** der sichtbaren Top-10 (`bestseller-premium-heroes`) nach echten Verkäufen ranken; Fallback Review-Sieger + `good_products.csv` | `LIVE=1 node automation/update_bestsellers.mjs` |
| `automation/price_guard.mjs` | **Verkaufbarkeit schützen**: Varianten mit `inventoryPolicy=DENY` → `CONTINUE` (nie „ausverkauft"); meldet Preis-0 / sinnlose compareAtPrice | `LIVE=1 node automation/price_guard.mjs` |
| `automation/link_guard.mjs` | **404-Wächter**: prüft Menü- + Cross-Sell-Collection-Links auf Existenz/Publikation; legt sichere Swapped-Prefix-Redirects an | `LIVE=1 node automation/link_guard.mjs` |
| `automation/cross_sell.mjs` | hängt Produkten ohne internen Collection-Link eine **Cross-Sell-Box** an (Tag/Typ → verifizierte Collection) | `LIVE=1 node automation/cross_sell.mjs` |
| `cloudflare/src/shop.js` | Worker-Port der Shop-Wartung (Cron 06:45 → KV `shop_health`, sichtbar unter `/health`) | per Cron / `/run?task=shop&key=RUN_KEY` |
| `cloudflare/src/{worker,video,gelato,stripe,products}.js` | Social-Autopilot, Fulfillment, Checkout | per Cron / Webhook |

**Workflows:** `shop-autopilot.yml` (täglich, SEO/QA), `bestseller-refresh.yml` (täglich), `shop-guards.yml` (wöchentlich: price/link/cross-sell).

Alle Tools sind **no-op-sicher** (ohne Creds passiert nichts) und **idempotent** (DRY-Default, `LIVE=1` schreibt).

## 🔑 Der eine Autonomie-Unlock (vom User, einmalig)
Unbeaufsichtigte Shop-Schreibzugriffe brauchen ein Shopify-Admin-Token. **Aktuell scheitert der Client-Credentials-Grant
mit `app_not_installed`** → die Custom-App muss **einmal im Shop installiert** werden (Shopify-Admin → Apps → die Custom-App
→ installieren, Scope `write_products`). Danach funktionieren GitHub Actions **und** der Worker-Cron vollautonom.

Alternativ ein statisches `SHOPIFY_ADMIN_TOKEN` als Secret hinterlegen (GitHub-Repo-Secret bzw. `wrangler secret put`).

### Schritt-für-Schritt (Shop-Wartung scharfschalten)
**Variante A — GitHub Actions (einfachste):**
1. Repo → Settings → Secrets → `SHOPIFY_SHOP=au3j0y-hq.myshopify.com` + `SHOPIFY_ADMIN_TOKEN` (oder `SHOPIFY_CLIENT_ID`+`SHOPIFY_CLIENT_SECRET`).
2. (Optional) `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` für den Digest.
3. Fertig — `shop-autopilot.yml` + `bestseller-refresh.yml` laufen täglich.

**Variante B — Cloudflare Worker (gleiche Infra wie Social):**
1. `cd cloudflare`
2. `wrangler secret put SHOPIFY_ADMIN_TOKEN` (oder CLIENT_ID/SECRET) · `SHOPIFY_SHOP` als `[vars]` setzen.
3. In `wrangler.toml` `[triggers] crons = ["45 6 * * *"]` einkommentieren · `SHOP_AUTOPILOT_LIVE="1"` setzen.
4. `wrangler deploy`. Prüfen: `GET /health` → Feld `shop` zeigt den letzten Report.

## Bleibt User-Sache (kann kein Tool ersetzen)
- **Reichweite/Traffic** (§10): TikTok/Meta-Kampagne + Budget + Pixel. Ohne Besucher kein Umsatz — das ist der reale Engpass.
- **App-Install / Token** (s. o.) — einmaliger Klick, schaltet die ganze Schreib-Autonomie frei.
- Veröffentlichte Social-Posts löschen, Bezahlungen, 2FA-Logins.
