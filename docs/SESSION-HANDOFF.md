# Session-Handoff / geteiltes Memory — Video-Stack + LuxeStyle-Ads

> Stand 2026-06-03. Kompakter Übergabe-Zettel, damit die nächste Session (egal ob
> Video, aban oder LuxeStyle) sofort weiterweiß. Code-Wahrheit ist immer `main` + die PRs unten.

## Was diese Session gebaut/gemerged hat (aban-news-landing)
- **video.abannews.com vorbereitet** — `video-radar/` baut sauber inkl. `_headers`; SEO-Seite
  `ki-videos-erstellen.html`. (PRs #188, #196 gemerged)
- **KI-Lifestyle-Radar** — `lifestyle-radar/` (18 echte Apps, 6 Bereiche) + SEO-Seite
  `ki-lifestyle.html`. (PR #232 gemerged)
- **Cloudflare-Deploy-Automatik** — `tools/cf_pages_setup.py` + Workflows
  `cf-pages-setup.yml` (Git) / `cf-pages-deploy.yml` (Direct Upload, ohne OAuth). Doku
  `docs/CF-PAGES-SETUP.md`, `docs/CF-PROJEKTE-TABELLE.md`, `docs/API-KEYS.md`. (PRs #193/#194 gemerged)
- **Go-Live-Befund video** — gescheitert am API-Token (Pages·Edit fehlte / als Worker statt
  Pages angelegt → „Asset too large" durch 297-MB-.git). Details `docs/VIDEO-GO-LIVE-STATUS.md`. (#213/#225)

## Offene PRs (NICHT gemerged — auf User-Wunsch)
- **#235** `claude/aban-files-video` — ABAN-Files-Video-Stack auf main heben (B) +
  konsolidieren (C) + Tools: **`shrink.py`** (mp4 klein rendern, CRF/Zielgröße),
  **`doctor.py`** (Preflight-Check), `requirements.txt`, shrink im Upload, `docs/VIDEO-STACK.md`.
  275-MB-Renders aus Git entfernt, `youtube.yml` veraltet/deaktiviert.
- **#229** `claude/neus-video-projekt-7fM9v` — reziproker Link ki-stimmen ↔ ki-videos.

## Sicherheit (offen, User-TODO)
Im Chat sichtbar gewordene Keys → **rotieren**: ElevenLabs-Key, Cloudflare-Token `cfut_…`.
Regel: Keys nur in GitHub-Secrets/CF-Env, nie in Chat/Repo (`docs/API-KEYS.md`).

## LuxeStyle „luxeshop" — TikTok-Ads (Befund)
- „luxeshop" = Shop **LuxeStyle CH**; separates privates Repo `luxestyle-dashboard`
  (aus dieser Session **nicht** zugänglich — GitHub-MCP auf aban-news-landing beschränkt).
- **Aber:** Die ganze **Reel-/Ad-Pipeline liegt HIER im Repo** (von früherer Session):
  `dropship/ads/` (Renderer inkl. `render_mix.sh`/`render_gadgetmix.sh`/`render_premium_reel.sh`),
  `automation/good_products.csv` (kuratierter Mix), `auto_render.sh`, `post-next-reel.mjs`
  (Telegram/n8n-Autopost), 3 Cron-Workflows (`reel-render/-autopost/-analytics.yml`),
  Regeln `dropship/REEL-REGELN.md`, 8 fertige Reels in `reels/`.
- **„Aus aller Mix" existiert bereits** (good_products.csv mischt Kleider+Accessoires; Mix-Renderer da).
- **Lokales Rendern unmöglich** in der Sandbox: das gebündelte (imageio-)ffmpeg hat **kein
  `drawtext`** (Text-Overlays), kein System-ffmpeg/apt. Rendern läuft nur in der **CI**
  (`reel-render.yml`, workflow_dispatch, input `n`).
- ⚠️ **Posten ist nach außen gerichtet:** neue Reels gehen als `ready` in die Queue, der
  Autopost-Cron postet `ready` öffentlich (TikTok/IG). Nur mit klarem User-OK auslösen.
- LuxeStyle-Eigen-Memory: `dropship/REEL-REGELN.md`, `dropship/CJ-IMPORT-LOG.md`,
  `dropship/AUTONOMER-MODUS.md`. Eigener Branch `claude/dropship-lade-memory-SrAs5`.

## Nächste sinnvolle Schritte
1. #235 + #229 prüfen/mergen, wenn gewünscht.
2. video.abannews.com: Token mit **Account·Cloudflare Pages·Edit** als Secret → Deploy-Workflow.
3. LuxeStyle-Ads: in einer Session auf dem Dropship-Branch weiterbauen; „render mix" =
   `reel-render.yml` (CI) auslösen; Posten erst nach Freigabe (REEL-REGELN §9).
