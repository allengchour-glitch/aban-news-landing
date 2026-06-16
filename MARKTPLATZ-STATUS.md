# 🛒 aban Marktplatz — Status & Betriebs-Memory

> Vollständiger Stand des aban-Marktplatzes (Such-/Shop-/Inserate-Teil auf abannews.com).
> Für jede Session: hier steht, was läuft, wie deployt wird und was offen ist.
> **Trennung:** Shopify-Shop **luxestyle.ch** wird von anderen Sessions gepflegt — diese
> Seite liest nur den **öffentlichen Feed** (`/api/luxestyle`), kein Eingriff in den Katalog.

## Seiten (alle premium/Luxe-Design, einheitlich)
- **/suche.html** — Universal-Suche: alle Quellen in einem Raster (Inserate, eBay-Angebote, LuxeStyle-Shop, Jobs) + **alle CH-Portale** (kontextabhängig) + Filter (Quelle/Kategorie/Region/Preisklasse/Zustand) + gespeicherte/teilbare Suchen (URL-State).
- **/marktplatz.html** — Hub mit Kacheln + Mehrfach-Kategorie-Ankreuzen → Smart-Routing.
- **/auto-suche.html** — voller AutoScout-Filtersatz (Marke→Modell-Dropdowns, Typ, Preis/Jahr/km von–bis, Treibstoff, Getriebe) → eBay-Quelle.
- **/immobilien.html** — voller ImmoScout-Filtersatz (Objektart, Zimmer/Fläche/Preis von–bis modusabhängig, Region, Ausstattung).
- **/inserate.html** — Kleinanzeigen: Kategorie-Mehrfach, Region, Preisklasse, Schnellfilter, Merkliste, Shop-Cross-Selling.
- **/angebote-suche.html**, **/stellenangebote.html** — eBay/Jobs + Portal-Weitersuche.
- **/luxestyle.html** — eigene Shop-Landing (Premium-Design), Produkte aus `/api/luxestyle`, Klick → luxestyle.ch (volle Marge).
- **/inserat/:id** — serverseitig gerenderte Detailseite (SSR), Open Graph + JSON-LD + canonical + „Melden" + Shop-Empfehlungen.
- **inserat-aufgeben.html** + **inserate-admin.html** — Inserat einreichen / moderieren.

## APIs (Cloudflare Pages Functions, `functions/`)
- **/api/ebay** — echte eBay-Produkte (Browse API) + Affiliate. Secrets: `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_CAMPAIGN_ID` (EPN) — **gesetzt, live, demo:false** ✅. `EBAY_MARKETPLACE` default EBAY_DE. km/Jahr-Feinfilter via yearFrom/yearTo/kmMin/kmMax.
- **/api/luxestyle** — eigener Shop-Feed (`luxestyle.ch/products.json`, **kein Secret**), normalisiert+cached. ✅
- **/api/jobs** — Partner-Jobbörse (Adzuna). ✅
- **/api/inserate-list** — eigene Inserate aus D1. **demo:true bis D1 verbunden.** `?id=` Einzelabruf, `?status=pending` (Admin-Token).
- **/api/inserat-submit** + **/api/inserat-moderate** — D1 schreiben/moderieren. CORS auf abannews.com beschränkt.

## Autonome Worker (Cloudflare Cron — unabhängig von der GitHub-Actions-Sperre)
- **workers/site-brain** — alle 6 h: prüft alle Seiten (Status/Metas/„Deploy-nötig"-Marker) **+ Geld-Wächter** (eBay/LuxeStyle/Jobs) + Wochen-Report. Telegram-Alarm. URL: `aban-site-brain.allengchour.workers.dev`. KV optional.
- **workers/inserate-brain** — stündlich: meldet „DB live", „erstes echtes Inserat", offene Freigaben. URL: `aban-inserate-brain.allengchour.workers.dev`. KV `INS_KV` = a7595b32…
- Telegram-Bot **@abannewsprBot**, Chat 164567631. Secrets je Worker via `wrangler secret put`.
- Deploy Worker: `cd workers/<name> && npx wrangler deploy`.

## 💰 Geld-Modell
1. **eBay-Provision** (passiv) — live, EPN campid gesetzt.
2. **LuxeStyle-Marge** (eigene Produkte) — sichtbar in: Universal-Suche, Inserate, Detailseiten (Cross-Sell), Startseite-Reihe, Marktplatz-Kachel, eigene Shop-Seite.

## 🚀 Deploy (Pages-Projekt „abannews", Direct Upload — KEIN Git-Auto-Deploy)
- **1 Doppelklick:** `deploy.bat` (Repo-Root) = git pull + build + `wrangler pages deploy`.
- PowerShell: `.\deploy.bat` · cmd: `deploy.bat`.
- Manuell: `bash build-pages.sh` (in PowerShell: `& "C:\Program Files\Git\bin\bash.exe" build-pages.sh`; in cmd ohne `&`) → `npx wrangler@3 pages deploy _site --project-name=abannews --branch=main`.
- ⚠️ Cloudflare-Secrets greifen **sofort** (kein Redeploy nötig); HTML-Änderungen brauchen Deploy.
- GitHub Actions ist account-weit gesperrt → Autonomie nur via Cloudflare Worker (siehe `AUTONOM-CLOUDFLARE.md`).

## Offen (nur User / Cloudflare-Zugang)
- **D1 für echte Inserate:** `setup-inserate.bat` → D1 anlegen + Schema + `ADMIN_TOKEN` + Dashboard-Binding `DB`. Danach meldet inserate-brain den ersten Eintrag.
- **Traffic** = der eigentliche Umsatz-Hebel (SEO greift mit der Zeit; Pinterest/Social laut Memory stark).

## Sicherheit/Qualität
Parametrisierte D1-Queries (kein SQLi), Output-Escaping (kein XSS), CSP/HSTS/X-Frame, Honeypot+Rate-Limit, security.txt, aria-labels, JSON-LD/canonical. Brain-Scan: 0 Fehler, Score 100.

Stand: 2026-06-16.
