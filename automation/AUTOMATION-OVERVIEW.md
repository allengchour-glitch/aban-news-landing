# 🤖 Automation-Übersicht — abannews & LuxeStyle (gemeinsames Gedächtnis)

Beide Projekte im Repo nutzen dasselbe **gratis Automatik-Muster**:
**GitHub Action (cron) → Skript/Queue (im Repo) → Make.com-Webhook → Buffer/HTTP → Plattform**.
Alles läuft auf GitHub-Infra (keine laufende Claude-Session nötig), no-op-safe ohne Secrets.

## LuxeStyle (Dropship) — Reel-Autopost-System
| Baustein | Datei | Funktion |
|---|---|---|
| Render-Engine | `dropship/ads/render_premium_reel.sh` | 9:16-Reel mit Hook (Regel 8), Musik, Marken-Intro/Outro |
| **Auto-Render** | `dropship/ads/auto_render.sh` + `.github/workflows/reel-render.yml` (cron 4h) | baut Reels NUR aus `automation/good_products.csv` (Regel 7b: gut bewertet + echtes Bild) → Queue `ready` |
| Allow-Liste | `automation/good_products.csv` | kuratierte gute Produkte (name,image_url,label) — Vielfalt erweitern = Zeilen hinzufügen |
| Musik | `automation/reel_music.m4a` | generiertes, lizenzfreies Ambient (ersetzbar) |
| Queue | `automation/reels_seed.csv` | id,scheduled_date,video_url,caption,hashtags,platforms,status,posted_at,post_url |
| **Auto-Post** | `automation/post-next-reel.mjs` + `.github/workflows/reel-autopost.yml` (cron 4h, 00/04/08…) | nächstes `ready`-Reel → Make-Webhook |
| Make-Szenario | `automation/video-autopost.blueprint.json` | Webhook → Buffer (TikTok+IG) → Telegram-Notify |
| Hosting | `reels/*.mp4` → `https://abannews.com/reels/...` | GitHub Pages, öffentlich für Buffer |
| **Feedback** | `automation/reel-analytics.mjs` + `.github/workflows/reel-analytics.yml` (alle 2 Tage) | Queue-Status + Shop-Bestellungen → Telegram |
| Regeln | `dropship/REEL-REGELN.md` | verbindliche Reel-Regeln (User-Feedback-Gedächtnis) |

**Secrets (Repo → Settings → Actions):** `MAKE_REEL_WEBHOOK`, `SHOPIFY_SHOP`, `SHOPIFY_ADMIN_TOKEN`,
`TELEGRAM_BOT_TOKEN` (8904564755:…), `TELEGRAM_CHAT_ID` (164567631). Ohne = sauberer No-Op.
**Wichtig:** Geplante Actions laufen nur vom **Default-Branch** → Branch nach `main` mergen, damit der Cron greift.

## abannews — gleiches Muster, wiederverwendbar
- Vorhanden: `automation/linkedin-auto-post.blueprint.json` (+ SETUP) = Cron → Google-Sheet → Buffer/LinkedIn → Slack.
- **Wiederverwendbar:** Dieselbe Engine kann abannews-Content automatisieren — z.B. tägliche Posts aus der
  Tool-DB/Glossar, oder (analog zu LuxeStyle) Reels/Visuals → Buffer → LinkedIn/X/Threads. Einfach
  `good_products.csv`-Äquivalent (z.B. `good_tools.csv`) + eigenes Render/Compose-Skript + denselben
  Auto-Post-Flow nutzen. Telegram/Slack-Notify identisch.
- D.h. **ein Automatik-Framework für beide Marken**; pro Projekt nur Queue-Quelle + Creative-Generator tauschen.

## Grenzen (für beide)
- Claude/GitHub posten nicht direkt in die Apps — **Buffer** tut es (IG meist voll auto, TikTok teils 1 Tap).
- Plattform-**Views/Insights** (TikTok/IG) sind nicht per API hier abrufbar → App-Insights/Buffer Analytics.
