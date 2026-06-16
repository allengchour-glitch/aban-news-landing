# 🤖 Autonom ohne GitHub Actions — Cloudflare Worker (Lehre aus LuxeStyle)

**Stand 2026-06-16.** GitHub Actions ist für den Account **gesperrt** („Actions has been
disabled for this user"). Nichts, was auf Actions baut, läuft (auch `control.html`s
`workflow_dispatch` nicht). **Lösung wie bei LuxeStyle: Cloudflare Worker mit Cron-Trigger.**
Die laufen serverless, gratis und **komplett unabhängig von GitHub Actions/GitLab**.

## Vorhandene Worker (`workers/…`, je `wrangler.toml` + `worker.js`)
- **site-brain** — überwacht `abannews.com` live per Cron (alle 6 h): HTTP 200, `<title>`,
  canonical, og:title, description + **Marktplatz-Seiten** (Suche/Auto/Immobilien/Inserate/
  Angebote/Jobs/Inserieren) und erkennt **„veraltet — Deploy nötig"** über HTML-Marker.
  Score in KV, Alarm per Telegram. Tut bewusst **kein** Deploy/Fix (nur „das Auge").
- **shop-brain** — veredelt LuxeStyle-Produkte autonom per Cron (Shopify Client-Credentials).
- **pinterest-cron** — postet Pins per Cron (Pinterest API v5).
- **ki-werkzeug-ai** — serverseitiger KI-Endpoint mit Kosten-Bremse (KV).

Muster jedes Workers: `scheduled()` = Cron, `fetch()` = manueller Test über
`GET /?run=1&key=<TRIGGER_KEY>` bzw. `/?key=…`, Secrets per `wrangler secret put`.

## Worker deployen (einmalig, PC mit eingeloggtem wrangler)
```bash
cd workers/site-brain
npx wrangler kv namespace create BRAIN_KV   # ID in wrangler.toml eintragen
npx wrangler deploy
# optional Alarme:
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
npx wrangler secret put TRIGGER_KEY
```
Danach läuft die Überwachung autonom; bei Problemen **oder veraltetem Deploy** kommt eine
Telegram-Nachricht — ohne dass jemand etwas anstoßen muss.

## Was ein Worker NICHT kann
Die statische Seite **bauen/deployen** (kein Quellcode/Build im Worker). Deploy bleibt:
`deploy.bat` (Direct Upload) **oder** Cloudflare Pages Git-Integration (dann Auto-Deploy bei
jedem Push, ebenfalls ohne Actions). Der Worker **meldet** nur, wann ein Deploy fällig ist.

## Merksatz für künftige Sessions
**Autonomie = Cloudflare Worker (Cron), nicht GitHub Actions.** Neue Daueraufgaben als Worker
unter `workers/<name>/` bauen (Cron + KV + optional Telegram), per `wrangler deploy` scharf
schalten. Actions nur, falls/again wenn entsperrt.
