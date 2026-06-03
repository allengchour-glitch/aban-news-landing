# Reel-Autopost-Pipeline — Setup (TikTok + Instagram, gratis)

> Postet freigegebene Reels automatisch auf **TikTok + Instagram** — gratis über **Buffer**,
> mit **Telegram-Freigabe davor** (kein Blind-Post) und **GitHub-Pages-Hosting** der Videos.
> Spiegelt das bestehende `linkedin-auto-post`-Blueprint-Muster, nur für Video.

## Dateien
| Datei | Zweck |
|-------|-------|
| `video-autopost.blueprint.json` | Make.com-Scenario zum Importieren |
| `reels_seed.csv` | Start-Queue (3 freigegebene Reels + 7 fertige Caption/Hashtag-Ideen) |
| `../dropship/ads/publish_reel.sh` | mp4 → öffentliche URL + fertige CSV-Zeile |
| `video-autopost-SETUP.md` | diese Anleitung |

## Architektur
```
render_premium_reel.sh → reel.mp4
   → publish_reel.sh → /reels/<slug>.mp4 (Repo) + CSV-Zeile (status=pending)
      → git push → öffentlich: https://abannews.com/reels/<slug>.mp4
         → Telegram-Freigabe: Tap «✅ Posten» → Sheet status=ready
            → Make-Cron (8h) → Buffer → TikTok + Instagram
               → Sheet status=posted → Telegram-Bestätigung
```
**Kosten: 0 CHF** — Make Free (1.000 Ops/Mt, Pipeline braucht ~4/Post), Buffer Free (3 Channels),
GitHub Pages gratis, Telegram gratis.

---

## 1. Buffer einrichten — und die Kanäle TRENNEN
Das beantwortet deine Frage „ich habe 1 Kanal — wie trennen?": **In Buffer ist jedes Social-Konto ein eigener „Channel".**
1. Gratis-Konto auf https://buffer.com.
2. **Channel verbinden → TikTok** (dein TikTok-Konto, One-Click-OAuth).
3. **Channel verbinden → Instagram** (Instagram **Business/Creator**-Konto, verknüpft mit einer Facebook-Seite — sonst kein Auto-Publish).
4. Du hast jetzt **2 getrennte Channels**. Jeder hat eine **Profile-ID** (in der Buffer-URL/Channel-Settings) → beide notieren:
   - TikTok-Profile-ID → `__BUFFER_TIKTOK_PROFILE_ID__`
   - Instagram-Profile-ID → `__BUFFER_IG_PROFILE_ID__`
> Über die Spalte `platforms` im Sheet (`tiktok`, `instagram` oder `tiktok,instagram`) steuerst du pro Reel,
> an welche Channels es geht. Caption/Hashtags kannst du pro Plattform variieren (IG = mehr Hashtags, TikTok = kürzer + Trend-Sound).
> **Später erweiterbar:** YouTube Shorts / Pinterest einfach als weitere Buffer-Channels verbinden.

## 2. Google Sheet `reels_queue` anlegen
1. Neues Google Sheet → Tab umbenennen zu **`reels_queue`**.
2. Zeile 1 (genau diese Reihenfolge):
   `id | scheduled_date | video_url | caption | hashtags | platforms | status | posted_at | post_url`
3. **File → Import → Upload → `reels_seed.csv`** → „Append to current sheet", „Convert text to numbers/dates: **NO**".
4. Spalte `scheduled_date` → Format **Plain text** (ISO-Dates bleiben 1:1).
5. Sheet-ID aus URL kopieren (zwischen `/d/` und `/edit`) → `__SHEET_ID__`.

**Status-Logik:** `pending` (Reel gerendert, wartet auf Freigabe) → `ready` (per Telegram freigegeben) → `posted` (live).

## 3. Reels hosten (GitHub Pages, gratis)
1. Reel rendern: `dropship/ads/render_premium_reel.sh out.mp4 musik.wav img_dir`.
2. Veröffentlich-fertig machen:
   ```
   dropship/ads/publish_reel.sh /tmp/relA/out/luxestyle_eleganz.mp4 eleganz 2026-06-04 \
     "Sommer-Eleganz von LuxeStyle ✨ -10% WELCOME10 → luxestyle.ch" \
     "#schweizmode #sommerkleid #ootdschweiz #luxestyle" "tiktok,instagram"
   ```
   → kopiert nach `reels/eleganz.mp4`, gibt **öffentliche URL** + **CSV-Zeile** aus.
3. `git add reels/eleganz.mp4 && git commit && git push` → Video ist live unter
   `https://abannews.com/reels/eleganz.mp4` (Buffer/Make holen es von dort).
4. CSV-Zeile ins Google Sheet einfügen (status bleibt `pending`).

## 4. Make.com-Scenario importieren
1. https://eu1.make.com → New Scenario → **Import Blueprint** → `video-autopost.blueprint.json`.
2. **Modul 2 (HTTP an Buffer) durch das native Modul ersetzen** (empfohlen, kein Token):
   - Modul 2 löschen → **Buffer → „Create Post"/„Create Update"** einfügen.
   - Connection: Buffer per OAuth verbinden.
   - Mapping: **Text** = `{{1.caption}}` + Zeilenumbruch + `{{1.hashtags}}` · **Media/Video-URL** = `{{1.video_url}}` ·
     **Profiles** = TikTok- + Instagram-Channel · **Share now** = true.
   - (Wer lieber bei HTTP bleibt: `__BUFFER_ACCESS_TOKEN__` + Profile-IDs in Scenario-Variablen setzen.)
3. **Scenario-Variablen** (Make → Scenario settings → Variables):
   `SHEET_ID`, `BUFFER_TIKTOK_PROFILE_ID`, `BUFFER_IG_PROFILE_ID`, `TELEGRAM_BOT_TOKEN` (`8904564755:…`), `TELEGRAM_CHAT_ID` (`164567631`).
4. Google-Sheets-Module (1 + 3): Connection setzen, Spreadsheet = dein Sheet, Tab = `reels_queue`.
5. Schedule ist im Blueprint = `0 */8 * * *` Europe/Zurich (alle 8h). Anpassbar.

## 5. Telegram-Freigabe koppeln
Du hast die Freigabe schon (Szenario **6001019**, Bot `8904564755:…`, chat `164567631`, Buttons `post_<id>`).
- Reel kommt per `sendVideo` mit Buttons «✅ Posten / ❌» in Telegram (wie msg 54/61).
- Tap «✅ Posten» → dein Telegram-Watch-Szenario setzt im Sheet die passende Zeile auf **status=ready**
  (Google-Sheets „Update/Search Row" nach `id` aus dem callback_data `post_<id>`).
- Erst dann zieht der Cron oben das Reel und postet.
> Ohne Telegram-Kopplung: Du setzt `status` im Sheet manuell von `pending` auf `ready`.

## 6. Test-Run
1. Im Sheet: eine Zeile mit echtem `video_url` (z.B. eleganz.mp4) → `scheduled_date = heute`, `status = ready`.
2. Make → **Run once**.
3. Buffer-Queue prüfen → Post bei TikTok + Instagram? Sheet → `status=posted`? Telegram-Bestätigung da?
4. Schedule **ON**.

## Grenzen (ehrlich)
- **TikTok:** Buffer-Auto-Publish ist je nach Kontotyp teils „Push-to-App" (1 finaler Tap in der TikTok-App).
  **Instagram-Reels** via Buffer i.d.R. voll automatisch (Business/Creator-Konto vorausgesetzt).
- **Organik = Reichweite, kein Käufer-Garant.** Für echte Käufe bleibt die bezahlte TikTok-Conversion-Kampagne
  (`KAMPAGNE-TODO-FUER-USER.md`) der Haupthebel — diese Pipeline ist der kostenlose Zusatz-Traffic.
- Reels-mp4 im Repo halten die Größe klein halten (≤ ~10 MB/Reel); alte rausräumen, wenn gepostet.

## Wartung
- Wöchentlich: Sheet auffüllen (neue Reels via publish_reel.sh) — genug Zeilen mit `status=ready` für die Woche.
- Make → History: letzte Runs prüfen. Buffer Free = 10 Posts/Channel Queue (reicht, da Cron laufend nachschiebt).
