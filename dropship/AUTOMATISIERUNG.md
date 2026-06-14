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
