# 📱 LuxeStyle vom Handy steuern — Klick-Buttons (Widgets)

> Ziel: Auf dem Handy-Homescreen **Buttons**, die je eine Automatik auslösen (posten,
> analysieren, planen, polieren). Keine App nötig — nutzt die GitHub-„Run workflow"-API.
> ⚠️ Funktioniert, sobald **GitHub Actions** wieder frei ist (heutige Sperre löst sich von selbst).

---

## 🟢 SOFORT & ohne Einrichtung: GitHub-App
1. **GitHub-App** (iOS/Android) installieren → einloggen.
2. Repo `allengchour-glitch/aban-news-landing` → Tab **Actions** → Workflow wählen → **„Run workflow"**.
   Das sind 2–3 Taps pro Aktion. Reicht für den Anfang.

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
| 🎵 **TikTok Entwurf** | `tiktok-autopost.yml` | nächstes Reel in TikTok-Entwürfe |
| 📅 **Metricool planen** | `metricool-schedule.yml` | Queue → Metricool (öffentlich) |
| ✨ **FB polieren** | `fb-profile-polish.yml` | FB-Profilbild + Info setzen |

---

## 🍎 iPhone — Kurzbefehle (Shortcuts)
Pro Button einmal anlegen (oder einen duplizieren):
1. App **Kurzbefehle** → **+** → Aktion **„Inhalte von URL abrufen"**.
2. URL: die obige (mit der jeweiligen `<DATEI>`).
3. **Methode: POST**.
4. **Header** hinzufügen: `Authorization` = `Bearer github_pat_…` · `Accept` = `application/vnd.github+json`.
5. **Anfragetext: JSON** → Schlüssel `ref` = `main`.
6. Kurzbefehl benennen (z. B. „🎵 TikTok") → **zum Home-Bildschirm hinzufügen** = Button/Widget.
→ Wiederholen für jede Aktion. Mit dem **Kurzbefehle-Widget** hast du alle als Kachel-Raster.

## 🤖 Android — App „HTTP Shortcuts" (gratis)
1. App **HTTP Shortcuts** installieren.
2. **+** → Method **POST** → die URL einfügen.
3. **Headers:** `Authorization: Bearer github_pat_…` und `Accept: application/vnd.github+json`.
4. **Body (Custom text):** `{"ref":"main"}`.
5. Speichern → langes Drücken → **„Zum Startbildschirm"** = Button.
→ Die App hat selbst auch ein **Homescreen-Widget** mit allen Buttons.

---

## 🔒 Sicherheit
- Der Token lebt **nur auf deinem Handy** (im Widget/Shortcut). Nicht teilen, nicht in Chat/Repo.
- Nur „Actions: write" — der Token kann **nur Workflows starten**, sonst nichts.
- Verlierst du das Handy → Token in GitHub einfach **widerrufen**.

## 💡 Tipp
Ein einziger **Sammel-Kurzbefehl** mit „Aus Menü wählen" (iPhone) listet alle Aktionen →
ein Button, dann antippen welche. So brauchst du nur **ein** Widget.
