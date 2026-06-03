# Reel-Autopost — Vollautomatik (alle 4h 1 Reel) → TikTok + Instagram, gratis

> **Selbstgemachtes abannews-Tool (GitHub Actions)** taktet alle 4 Stunden und postet das nächste
> freigegebene Reel über **Make-Webhook → Buffer → TikTok + Instagram**. Queue + Logik liegen im Repo
> (kein Google Sheet nötig). Freigabe passiert beim Setzen von `status=ready` (z.B. per Telegram).

## Architektur
```
.github/workflows/reel-autopost.yml   (cron 0 */4 * * * — DAS abannews-Tool)
   → automation/post-next-reel.mjs    : nächstes Reel mit status=ready aus automation/reels_seed.csv
        → POST Make-Webhook (Secret MAKE_REEL_WEBHOOK)  { id, video_url, caption, hashtags, platforms }
            → Make: Buffer Create Post → TikTok + Instagram   (Video von https://abannews.com/reels/<slug>.mp4)
            → Make: Telegram-Bestätigung
        → markiert Zeile als posted + committet zurück
```
**Kosten: 0 CHF** — GitHub Actions (gratis), Make Free, Buffer Free, GitHub Pages (Video-Hosting), Telegram.

## Dateien
| Datei | Zweck |
|-------|-------|
| `.github/workflows/reel-autopost.yml` | 4h-Cron, ruft das Skript, committet Status |
| `automation/post-next-reel.mjs` | wählt nächstes `ready`-Reel → Make-Webhook → markiert posted |
| `automation/video-autopost.blueprint.json` | Make-Szenario (Webhook → Buffer → Telegram), importierbar |
| `automation/reels_seed.csv` | **die Queue** (id,scheduled_date,video_url,caption,hashtags,platforms,status,posted_at,post_url) |
| `../dropship/ads/publish_reel.sh` | mp4 → `reels/<slug>.mp4` + fertige CSV-Zeile |

## Status-Logik (Queue = reels_seed.csv)
`pending` (gerendert, wartet auf Freigabe) → `ready` (freigegeben, darf gepostet werden) → `posted` (live).
Die 4h-Action nimmt immer die **erste** Zeile mit `status=ready` UND gesetztem `video_url`.

## Einmaliges Setup (≈20 Min)
### 1. Buffer (gratis) + Kanäle TRENNEN
- Konto auf https://buffer.com. **TikTok-Konto** und **Instagram-Konto** (Business/Creator + FB-Seite) **je als eigenen Channel** verbinden → 2 Profile-IDs notieren.
- (Optional später: YouTube Shorts/Pinterest als weitere Channels.)

### 2. Reels hosten (GitHub Pages)
- `dropship/ads/render_premium_reel.sh out.mp4 musik.wav img_dir` → `dropship/ads/publish_reel.sh ...` → `reels/<slug>.mp4` + CSV-Zeile.
- `git push` → live unter `https://abannews.com/reels/<slug>.mp4`. CSV-Zeile in `reels_seed.csv` (status `pending`).
- **Die 3 Start-Reels (eleganz/sommer/premium) liegen bereits drin und sind `ready`.**

### 3. Make-Szenario importieren
1. https://eu1.make.com → New Scenario → **Import Blueprint** → `video-autopost.blueprint.json`.
2. **Modul 1 (Custom Webhook):** Webhook erstellen → **URL kopieren**.
3. **Modul 2:** durch natives **Buffer → „Create Post"** ersetzen (empfohlen, kein Token). Mapping:
   Text = `{{1.caption}}` + Zeilenumbruch + `{{1.hashtags}}` · Video = `{{1.video_url}}` · Profiles = TikTok + Instagram.
   *(Wer HTTP behält: `__BUFFER_*__`-Variablen setzen.)*
4. **Modul 3 (Telegram):** Variablen `TELEGRAM_BOT_TOKEN` (`8904564755:…`) + `TELEGRAM_CHAT_ID` (`164567631`).
5. Szenario **ON** (instant/Webhook — wartet auf Aufrufe).

### 4. GitHub-Action scharfschalten
- Repo → **Settings → Secrets and variables → Actions → New secret**: `MAKE_REEL_WEBHOOK` = die Make-Webhook-URL aus Schritt 3.2.
- Fertig. `.github/workflows/reel-autopost.yml` läuft ab jetzt **alle 4h** und postet je 1 `ready`-Reel.
  Manuell testen: Actions-Tab → „Reel Auto-Post" → **Run workflow**.
- **Ohne Secret = sauberer No-Op** (es passiert nichts, kein Fehler).

### 5. Nachschub (laufend)
- Neue Reels via `publish_reel.sh` → `reels/`, Zeile in `reels_seed.csv`, `status` auf `ready` setzen
  (manuell oder per Telegram-Freigabe). Solange `ready`-Zeilen da sind, postet die Action alle 4h weiter.
- **Themen-Vielfalt (REEL-REGELN Regel 3):** nicht nur Damenmode — Schmuck, Accessoires, Schuhe, Taschen,
  Brillen, Herren, Tech-Gadgets, Wohnen, Beauty … alles möglich, premium präsentiert.

## Grenzen (ehrlich)
- Claude/GitHub posten nicht direkt in die Apps — **Buffer** tut es. **IG-Reels** via Buffer meist voll automatisch,
  **TikTok** je nach Kontotyp teils „Push-to-App" (1 finaler Tap).
- Organik = Reichweite; für Käufe bleibt die bezahlte TikTok-Conversion-Kampagne (`KAMPAGNE-TODO-FUER-USER.md`) der Haupthebel.
