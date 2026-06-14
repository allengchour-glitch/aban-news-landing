# 🤖 LuxeStyle — Marketing/Deploy ohne Befehl (+ Handy-Steuerung)

> Ziel: so viel wie möglich läuft von selbst. Was technisch einen Browser braucht (Follower), läuft
> ohne Tippen per Zeitplaner — aber nur wenn der PC an + Brave eingeloggt ist (keine Follow-API existiert).

## 1) 📤 Posten (IG/FB) — VOLL AUTONOM, kein PC nötig
**Cloudflare-Worker** postet 2×/Tag in CH-Primetime (16/19 UTC = 18/21 Uhr) aus `queue.json`.
- **Einmal deployen** (am PC, danach NIE wieder anfassen):
  ```
  cd automation/cloudflare/luxe-poster
  META_ACCESS_TOKEN="EAA…" TRIGGER_KEY="einpasswort" bash deploy.sh
  ```
- Läuft dann in der Cloud (kein PC, kein Befehl). Queue wird vom Gehirn/`build_queue.mjs` gefüllt.

## 2) 📱 Handy-Steuerung (auf Abruf posten, ohne PC)
Der Worker hat eine Trigger-URL. Ein **Antippen vom Handy** postet sofort den nächsten Queue-Eintrag:
```
https://luxe-poster.<dein-subdomain>.workers.dev/?key=DEIN_TRIGGER_KEY
```
- **iPhone:** Lesezeichen am Home-Screen / Kurzbefehl (App „Kurzbefehle" → „URL-Inhalte abrufen").
- **Android:** App „HTTP Shortcuts" → Shortcut auf diese URL → Widget auf den Home-Screen.
- Status ansehen: `…workers.dev/?key=…&status=1` (zeigt Cursor/Anzahl).

## 3) 🇨🇭 Follower-Wachstum — OHNE Tippen per Taskplaner (PC nötig)
Browser-Pflicht (Instagram/TikTok haben keine Follow-API) → läuft am PC, aber **automatisch per Zeitplan**:
- Skript `automation/local/run-follower-daily.ps1` startet Brave mit Debug-Port **selbst** + holt Follower
  (sonntags zusätzlich Entfolgen). Du musst nichts mehr tippen.
- **Einmalige Einrichtung** (PowerShell als Admin, 1 Zeile):
  ```powershell
  schtasks /create /tn "LuxeFollower" /sc daily /st 10:00 /tr "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\Users\allen\aban-news-landing\automation\local\run-follower-daily.ps1"
  ```
- Voraussetzung: einmal Brave mit dem `brave-agent`-Profil bei **Instagram + TikTok einloggen** (bleibt eingeloggt).
- Danach: jeden Tag um 10:00 automatisch (wenn PC an). Kein Befehl mehr.

## 4) 🎵 TikTok posten — pure Automation über die offizielle API (KEIN Browser)
`automation/tiktok-autopost.mjs` postet per **TikTok Content-Posting-API v2** (FILE_UPLOAD) — Tokens
refreshen sich selbst (24h). Läuft im täglichen PC-Task mit (Schritt 4 im Wrapper). **Aktivierung einmalig:**
1. **TikTok-App** (developers.tiktok.com): Produkte **Login Kit + Content Posting API**, Scopes
   `user.info.basic`, `video.upload`, `video.publish`, Redirect URI `http://localhost:8723/callback`.
   (Deinen **Client Key + Secret** hast du schon.)
2. **Tokens holen** (PC, 1 Min): `TT_CLIENT_KEY=… TT_CLIENT_SECRET=… node automation/tiktok-oauth.mjs`
   → druckt `TT_ACCESS_TOKEN` + `TT_REFRESH_TOKEN`. In `…\luxe-secrets.ps1` eintragen (nur lokal!).
3. Fertig — der Task postet ab dann täglich ein Reel.
⚠️ **App-Audit:** bis TikTok deine App auditiert, posten Reels als **privat/Entwurf** (`SELF_ONLY`, du tippst 1×
„posten" in der App). Nach Audit: `TT_PRIVACY_LEVEL=PUBLIC_TO_EVERYONE` → **vollautomatisch öffentlich.**
(No-PC-Variante existiert: `tiktok-cloud-autopost.mjs` via Browserbase — falls du den Cloud-Browser nutzt.)

## ⚡ RASANTES Wachstum — die ehrliche Wahrheit
Pure Automation = **gleichmäßiges** Wachstum. „Rasant" geht organisch NICHT (Daten: 0 Shares = Reichweiten-
Decke, ~300 Views/Video). **Schnelles Wachstum = BEZAHLT** — es gibt keinen Gratis-Turbo:
- **TikTok Spark Ads:** deine **organischen Gewinner boosten** (Mundart/Preis-Vergleich, der Smart-Diffuser-Clip
  mit 1107 V) — echtes Geld, echte rasante CH-Reichweite. Anleitung: `dropship/TIKTOK-ADS-ANLEITUNG.md`
  (EINE saubere Conversion-Kampagne, Pixel `D8EKVR3C77U6KT5BTBD0`, CH/Frauen 18–34, ~20 CHF/Tag).
- **Meta Advantage+ Shopping:** auto-optimierte IG/FB-Ads → rasante Reichweite (braucht Meta-Pixel + Budget).
- **Reihenfolge:** erst Pixel scharf → kleine Test-Budgets auf die bewiesenen Gewinner → skalieren was konvertiert.
Das ist dein Klick (Ads-Konto + Budget). Der Rest (Creatives, Targeting, Landing) ist vorbereitet.

## Ehrliche Grenzen
- **Follower braucht den PC an** (oder PC-Claude). Komplett ohne PC geht Follower NICHT — keine API existiert.
- **Pixel + bezahlte Kampagne** = nur du (Meta/TikTok Ads Manager). Das ist der eigentliche Käufe-Hebel.
- **Meta-Token** läuft ~60 Tage → dann im Worker einmal neu setzen (`wrangler secret put META_ACCESS_TOKEN`).

## Zusammengefasst „ohne Befehl"
| Aufgabe | Ohne Befehl? | Voraussetzung |
|---|---|---|
| IG/FB posten 2×/Tag | ✅ | Worker 1× deployen |
| Posten auf Abruf (Handy) | ✅ | Worker-URL als Shortcut |
| Gehirn lernen + Queue füllen | ✅ (im Worker/Zeitplan) | — |
| CH-Follower holen | ✅ per Taskplaner | PC an + Brave eingeloggt |
| Pixel/Ads | ❌ nur du | Ads-Konto |
