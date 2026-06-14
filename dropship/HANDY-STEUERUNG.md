# 📱 LuxeStyle vom Handy steuern + ohne dich laufen lassen

> **Empfohlen (funktioniert HEUTE, kein GitHub nötig):** Datei **`control.html`** (Repo-Root) am Handy öffnen →
> **Worker-URL + Trigger-Key 1× eintragen** (wird lokal gespeichert) → fertig. Buttons:
> 📷 Jetzt posten · 📊 Status · 📈 Meta-Analyse · 🧹 Alte FB-Posts löschen · 🔄 Queue von vorne · 🔗 Neue Queue laden.
> Tipp iOS: in Safari „Zum Home-Bildschirm" → wie eine App. Android: Chrome → „Zum Startbildschirm".

## ✅ Was schon VOLLAUTONOM läuft (ohne dich, ohne Handy)
- **Cloudflare-Worker** `luxe-poster` (Cron 2×/Tag, 16+19 UTC): postet IG+FB **Bilder + Stories + Reels**,
  zählt den Queue-Cursor selbst weiter, **holt die Queue selbst von der CDN-URL** (kein Redeploy nötig) und
  **analysiert Meta bei jedem Lauf** (IG+FB-Engagement → KV-Log, am Handy via 📈-Button sichtbar).
- **Pinterest** (eigenes System, 2×/Woche), **Gehirn-Lernen + Queue-Nachschub**, **Tages-Asset-Rotation** der Reels.

## 🔴 EINMALIGE Einrichtung, damit ALLES ohne dich läuft (danach nie wieder)
1. **`wrangler deploy`** im Ordner `automation/cloudflare/luxe-poster` (1×) → aktiviert den neuesten Worker-Code
   (FB-Stories, echte FB-Reels, Meta-Analyse) + die aktuelle Queue. *Doppelklick:* `automation/local/DEPLOY-WORKER.bat`.
2. **Worker-Secrets** (1×, Cloudflare-Dashboard → Worker → Settings → Variables): `META_ACCESS_TOKEN` (langlebiger
   Page/User-Token), `TRIGGER_KEY` (frei wählbar — den gleichen ins `control.html` eintragen).
3. **PC-Teil (optional, nur für Follower-Wachstum + TikTok-Upload):** `automation/local/SETUP-EINMALIG.bat` 1×
   doppelklicken → Windows-Tagestask. Läuft dann täglich, wenn der PC an + Brave eingeloggt ist.
4. **Pixel + CH-Kampagne** = der einzige echte Käufe-Hebel (Meta/TikTok-Werbe-Manager).

> Danach: du musst NICHTS mehr tippen. Optional steuerst du per `control.html`-Button auf Abruf (z. B. sofort posten
> oder die Meta-Analyse ansehen). Der Cloud-Claude aktualisiert Inhalte über die Queue-CDN-URL ohne Redeploy.

---
## (Legacy) GitHub-Actions-Buttons — nur falls Actions wieder frei ist

---

## 🟢 SOFORT & ohne Einrichtung: GitHub-App
1. **GitHub-App** (iOS/Android) installieren → einloggen.
2. Repo `allengchour-glitch/aban-news-landing` → Tab **Actions** → Workflow wählen → **„Run workflow"**.

---

## 🔘 RICHTIGE BUTTONS (Homescreen-Widgets)

### Einmalig: Token anlegen (1×, 2 Min)
GitHub → Settings → Developer settings → **Fine-grained Token** →
- Repository: nur `aban-news-landing`
- Permissions: **Actions = Read and write**
- Token kopieren (beginnt `github_pat_…`). **Nur ins Handy-Widget eintragen, nirgends sonst.**

### Die API hinter jedem Button
```
POST https://api.github.com/repos/allengchour-glitch/aban-news-landing/actions/workflows/<DATEI>/dispatches
Header:  Authorization: Bearer <DEIN_TOKEN>
Header:  Accept: application/vnd.github+json
Body:    {"ref":"main"}
```
Antwort **204** = ausgelöst ✅.

### Die Workflows (= deine Buttons)
| Button | `<DATEI>` | Macht |
|---|---|---|
| 📊 **Analyse jetzt** | `analytics-learn.yml` | TikTok-Performance ziehen + lernen |
| 📸 **IG/FB Bild posten** | `social-meta-autopost.yml` | nächstes Bild aus Queue |
| 🎬 **IG/FB Reel posten** | `video-meta-autopost.yml` | nächstes Video aus Queue |
| 📖 **Story posten** | `story-meta-autopost.yml` | nächste Story aus Queue |
| 🎵 **TikTok Entwurf** | `tiktok-autopost.yml` | nächstes Reel in TikTok-Entwürfe |
| 💬 **DMs beantworten** | `ig-dm-reply.yml` | neue Instagram-DMs automatisch beantworten |
| 📅 **Metricool planen** | `metricool-schedule.yml` | Queue → Metricool (öffentlich) |
| 📌 **Pinterest pinnen** | `pinterest-publish.yml` | nächste Pins aus der Queue |
| ✨ **FB polieren** | `fb-profile-polish.yml` | FB-Profilbild + Info setzen |

---

## 🍎 iPhone — Kurzbefehle (Shortcuts)
1. App **Kurzbefehle** → **+** → Aktion **„Inhalte von URL abrufen"**.
2. URL: die obige (mit der jeweiligen `<DATEI>`). **Methode: POST**.
3. **Header:** `Authorization` = `Bearer github_pat_…` · `Accept` = `application/vnd.github+json`.
4. **Anfragetext: JSON** → Schlüssel `ref` = `main`. Benennen → **zum Home-Bildschirm hinzufügen**.

## 🤖 Android — App „HTTP Shortcuts" (gratis)
1. App **HTTP Shortcuts** installieren. **+** → Method **POST** → URL einfügen.
2. **Headers:** `Authorization: Bearer github_pat_…` und `Accept: application/vnd.github+json`.
3. **Body (Custom text):** `{"ref":"main"}`. Speichern → **„Zum Startbildschirm"** = Button.

---

## 🔒 Sicherheit
- Der Token lebt **nur auf deinem Handy** (im Widget/Shortcut). Nicht teilen, nicht in Chat/Repo.
- Nur „Actions: write" — der Token kann **nur Workflows starten**, sonst nichts.
- Verlierst du das Handy → Token in GitHub einfach **widerrufen**.
