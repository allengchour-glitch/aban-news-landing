# 📱 LuxeStyle vom Handy steuern — Klick-Buttons (Widgets)

> Ziel: Auf dem Handy-Homescreen **Buttons**, die je eine Automatik auslösen (posten,
> analysieren, planen, polieren, DMs beantworten). Keine App nötig — nutzt die GitHub-„Run workflow"-API.
> ⚠️ Funktioniert, sobald **GitHub Actions** wieder frei ist (heutige Sperre löst sich von selbst).

Am einfachsten: die Datei **`control.html`** (Repo-Root) auf dem Handy öffnen (oder hosten) → Token
einmal einfügen → alle Buttons als Kachel-Raster. Alternativ die Shortcuts/HTTP-Shortcuts unten.

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
