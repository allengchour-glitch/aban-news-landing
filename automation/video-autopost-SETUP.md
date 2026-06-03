# Reel-Autopost — Vollautomatik (alle 4h 1 Reel) → TikTok + Instagram, gratis · OHNE Make

> **Eigentool (GitHub Actions), analog zum abannews-Publisher `social/post.py`.** Taktet alle 4 Stunden
> und postet das nächste freigegebene Reel über einen **generischen Webhook → n8n (gratis, self-hosted) →
> TikTok + Instagram** und/oder direkt per **Telegram**. **Kein Make/Zapier-Abo nötig.** Queue + Logik
> liegen im Repo (kein Google Sheet). Freigabe = `status=ready` setzen.

## Architektur
```
.github/workflows/reel-autopost.yml   (cron 0 */4 * * * — DAS Eigentool)
   → automation/post-next-reel.mjs    : nächstes Reel mit status=ready aus automation/reels_seed.csv
        ├─ POST PUBLISH_WEBHOOK_URL  { id, video_url, caption, hashtags, platforms, text, url, tags }
        │     → n8n (gratis, self-hosted)  → TikTok + Instagram   (Video von https://abannews.com/reels/<slug>.mp4)
        └─ Telegram sendMessage (TELEGRAM_BOT_TOKEN+CHAT_ID)  → direkte Meldung, Zero-Relay
        → markiert Zeile als posted (sobald ≥1 Kanal klappt) + committet zurück
```
**Kosten: 0 CHF** — GitHub Actions, n8n (self-hosted/Free), GitHub Pages (Video-Hosting), Telegram.
> n8n ist dieselbe gratis, EU-fähige Engine wie im abannews-Projekt (`social/N8N-WEBHOOK.md`,
> `social/n8n-publish-workflow.json`). Make ist **nicht** erforderlich (nur als Legacy-Alias `MAKE_REEL_WEBHOOK` möglich).

## Dateien
| Datei | Zweck |
|-------|-------|
| `.github/workflows/reel-autopost.yml` | 4h-Cron, ruft das Skript, committet Status |
| `automation/post-next-reel.mjs` | wählt nächstes `ready`-Reel → Webhook (n8n) + Telegram → markiert posted |
| `automation/reels_seed.csv` | **die Queue** (id,scheduled_date,video_url,caption,hashtags,platforms,status,posted_at,post_url) |
| `../social/n8n-publish-workflow.json` | abannews-n8n-Flow (Webhook → Plattformen), importierbar |
| `../dropship/ads/publish_reel.sh` | mp4 → `reels/<slug>.mp4` + fertige CSV-Zeile |

## Status-Logik (Queue = reels_seed.csv)
`pending` (gerendert, wartet) → `ready` (freigegeben, darf gepostet werden) → `posted` (live).
Die 4h-Action nimmt immer die **erste** Zeile mit `status=ready` UND gesetztem `video_url`.

## Einmaliges Setup (≈20 Min, gratis)
### 1. n8n bereitstellen (gratis, EU)
- **Self-hosted:** `npx n8n` lokal oder Docker auf kleinem Server (https://docs.n8n.io/hosting/), oder n8n-Cloud-Test.
- **Workflow importieren:** n8n → *Workflows → Import from File* → `social/n8n-publish-workflow.json`
  (Flow: Webhook → Text bauen → Plattformen). Für Reels die **Instagram-** und **TikTok-Nodes** ergänzen/aktivieren
  und ihre Credentials einmalig per OAuth verbinden (das ist der Teil, den ein Skript nicht kann).
- Workflow **aktivieren** → **Production-Webhook-URL** kopieren.

### 2. Reels hosten (GitHub Pages)
- `dropship/ads/auto_render.sh` (Engine) **oder** `render_premium_reel.sh` + `publish_reel.sh` → `reels/<slug>.mp4` + CSV-Zeile.
- `git push` → live unter `https://abannews.com/reels/<slug>.mp4`.
- **Start-Reels (eleganz/sommer/premium + Auto-Reels) liegen bereits drin und sind `ready`.**

### 3. GitHub-Action scharfschalten (Secrets)
Repo → **Settings → Secrets and variables → Actions → New secret** — mind. einer:
- `PUBLISH_WEBHOOK_URL` = die n8n-Webhook-URL aus Schritt 1 (→ IG/TikTok).
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (`164567631`) = direkte Telegram-Meldung.
- *(optional Legacy: `MAKE_REEL_WEBHOOK`, falls doch ein Make-Szenario genutzt wird.)*

Fertig. `.github/workflows/reel-autopost.yml` läuft **alle 4h** und postet je 1 `ready`-Reel.
Manuell testen: **Actions-Tab → „Reel Auto-Post" → Run workflow**. **Ohne jeden Secret = sauberer No-Op.**

### 4. Nachschub (laufend, automatisch)
- `.github/workflows/reel-render.yml` rendert alle 4h ein neues Reel aus `automation/good_products.csv`
  (nur geprüft gut bewertete Produkte) und hängt es `ready` an die Queue. Manuell: `N=5 dropship/ads/auto_render.sh`.
- **Themen-Vielfalt (REEL-REGELN Regel 3):** nicht nur Damenmode — Schmuck, Accessoires, Schuhe, Taschen,
  Brillen, Herren, Tech-Gadgets, Wohnen, Beauty … alles möglich, premium präsentiert.

## Grenzen (ehrlich)
- Das Skript postet Telegram **direkt**; **IG/TikTok** brauchen einen OAuth-fähigen Relay — dafür **n8n** (gratis,
  self-hosted), nicht Make. **IG-Reels** gehen darüber meist voll automatisch, **TikTok** je nach Kontotyp
  teils „Push-to-App" (1 finaler Tap).
- Organik = Reichweite; für Käufe bleibt die bezahlte TikTok-Conversion-Kampagne
  (`../dropship/KAMPAGNE-TODO-FUER-USER.md`) der Haupthebel.
