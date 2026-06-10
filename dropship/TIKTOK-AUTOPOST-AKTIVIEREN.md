# 🎵 TikTok-Reels automatisch posten — Aktivierung (einmalig)

Das Auto-Posting ist gebaut und getestet: `automation/tiktok-autopost.mjs` +
`.github/workflows/tiktok-autopost.yml`. Es lädt das nächste Reel aus
`automation/reels_seed.csv` herunter und postet es per **TikTok Content-Posting-API v2
(FILE_UPLOAD)** — keine Domain-Verifizierung nötig, funktioniert mit den Shopify-CDN-Reels.
Token erneuern sich automatisch (24h). **Ohne Secrets = No-Op (nichts passiert).**

Claude kann die App-Erstellung & den Login NICHT übernehmen (TikTok-Login) — diese 3 Schritte
sind deine; danach läuft alles automatisch.

## 1) TikTok-Developer-App anlegen
https://developers.tiktok.com → **Manage apps** → neue App, z. B. „LuxeStyle Poster".
- **Products** hinzufügen: **Login Kit** + **Content Posting API**.
- **Scopes** freischalten: `user.info.basic`, `video.upload`, `video.publish`.
- **Redirect URI** hinzufügen: `http://localhost:8723/callback`
- **Client Key** + **Client Secret** notieren.

## 2) Tokens holen (lokal, 1 Minute)
Auf deinem Rechner (Node ≥18):
```
TT_CLIENT_KEY=dein_key TT_CLIENT_SECRET=dein_secret node automation/tiktok-oauth.mjs
```
→ Browser öffnet sich, mit dem **LuxeStyle-TikTok-Konto** einloggen → das Skript druckt
**`TT_ACCESS_TOKEN`** und **`TT_REFRESH_TOKEN`**.  (Tokens NIE committen!)

## 3) 4 GitHub-Secrets setzen
Repo → Settings → Secrets and variables → Actions:
- `TT_CLIENT_KEY`
- `TT_CLIENT_SECRET`
- `TT_ACCESS_TOKEN`
- `TT_REFRESH_TOKEN`

Danach **Bescheid geben** → Claude hostet die (scharfen) Reels auf der CDN, füllt
`reels_seed.csv` und löst den Post aus.

## ⚠️ Wichtig: App-Audit & Privacy
Solange TikTok deine App **nicht auditiert** hat, MUSS `privacy_level = SELF_ONLY` bleiben
→ Reels landen als **privat/Entwurf** in deinem TikTok-Konto (du veröffentlichst sie 1× manuell).
Nach dem TikTok-App-Audit: Repo-Variable **`TT_PRIVACY_LEVEL = PUBLIC_TO_EVERYONE`** setzen →
dann posten sie **direkt öffentlich**, vollautomatisch.

## Hinweis Cron vs. Branch
Der geplante TikTok-Cron läuft vom `main`-Branch. Bis die CDN-Reels in `main` sind, postet
Claude per **Workflow-Dispatch auf dem Dropship-Branch** (so wie bei Meta). Für hands-off
täglich: PR nach `main` mergen.

## Musik-Lizenz
Die auto-gerenderten Reels nutzen royalty-free Tracks (Kevin MacLeod, CC-BY) → die
Quellenangabe hängt automatisch an der Caption. Für echte Trend-Sounds: die `-clean.mp4`
in der TikTok-App posten und den Sound dort drauflegen.
