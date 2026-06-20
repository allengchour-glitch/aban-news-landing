# 🤖 KI-Automation-Sync-Bot — LuxeStyle (Architektur & Stand)

> User 2026-06-20 „KI-Automation-Sync-Bot einrichten". Dieses Dokument beschreibt den **eingerichteten**
> autonomen Bot: wie Cloud, PC und Worker sich synchronisieren, sich selbst aktualisieren/heilen und lernen.

## 🔄 Der Sync-Kreis (Selbst-Update, keine manuelle Arbeit)
```
Cloud-Claude  --git push-->  GitHub (=Cloud-Wahrheit)  --git pull-->  PC (VOLLAUTOMAT/giga)
     ^                                                                      |
     |---------------  git push (Reports/Status/Posts)  <------------------ |
Worker (Cloudflare) liest queue.json LIVE von GitHub  -->  postet IG/FB
```
- **Cloud → GitHub:** ich pushe Verbesserungen (Code/Content/Captions/Brain).
- **GitHub → PC:** `LuxeUpdate` (05:00) + `giga` (`git pull --rebase`) ziehen den neuesten Code = meine Verbesserungen sind automatisch live. **Selbst-heilend** (kill Locks + takeown + reset, detached lange Jobs → kein Stau).
- **PC → GitHub:** Bot pusht Posts/Status/Reports (`reports/tiktok-last-run.json`, Analyse, yt-learn).
- **GitHub → Worker:** der Cloudflare-Worker liest `queue.json` live → postet IG/FB (6×/Tag Cron), **prüft vorher den echten IG-Profilstand** (kein Doppelpost).

## 🧠 KI-Schicht (Multi-Provider, faellt nie aus)
- **Text:** `ai_generate.mjs` Router → Groq → Gemini → DeepSeek → … (Fallback-Kette, Keys nur in `luxe-secrets.ps1`).
- **Vision:** Gemini (`video-qa.mjs` Reel-QA, `image-audit.mjs` Bild-Audit).
- **Bild/Video/Musik/Stimme:** Pollinations/FLUX · ffmpeg · CC-BY-Musik · piper.

## 📈 Lern-Schleife (wird laufend besser)
- `tiktok-bot analyze` + `self_learn` (IG/FB-Insights) → Gewinner/Verlierer → `knowledge.json`.
- `trend_scan` (CH-Trends) + `yt-learn` (Top-YouTuber analysieren → Lehren INS GEHIRN `rules.yt_gelernt`).
- Regel `letzter_post_analyse`: jeder Zyklus prüft den neuesten Post überall (Saves/Shares > Likes 2026).
- Brain (`knowledge.json`, 110+ Regeln) steuert Captions/Hooks/Formate → Content wird automatisch besser.

## ⏱️ 24/7-Takt (Windows-Tasks, ohne User)
03:30 Produkte · 04:30 SEO · 05:00 Update+Heilung · 09/12/15/21 Engage+Analyse · 10/19 Post ·
11:30/18:30 Giga (TikTok+Analyse) · alle 10 Min Fernsteuerung (cmd-poll) · So Entfolgen+Cleanup.

## 🟢 Eingerichtet & läuft / 🔴 Nur User (selten)
- 🟢 Sync, Selbst-Update/-Heilung, KI-Router, Vision-QA, Lern-Schleife, Posten (TikTok+Meta), Content-Bau, Dubletten-Schutz, Speicher-Aufraeumer.
- 🔴 1× Logins (TikTok/IG in Brave; entfaellt nach TikTok-Audit) · Keys in `luxe-secrets.ps1` · Geld/Budget-OK · Google Free Listings.

**Kurz: Der Bot synchronisiert + verbessert + heilt sich selbst — der User gibt keine Befehle.**
