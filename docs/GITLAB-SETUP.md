# 🦊 GitLab-CI als Gratis-Ersatz für GitHub Actions

GitHub hat Actions account-weit gesperrt (zu hohe Nutzung). Bis das wieder frei ist
(oder dauerhaft), lassen wir die wichtigsten Jobs auf **GitLab.com** laufen — **gratis**.
Die Pipeline-Konfig liegt schon im Repo: `.gitlab-ci.yml` (aktuell: ABAN-Files-Upload).

> ⚠️ **Wichtigste Hürde zuerst:** Du brauchst die **Werte** der Secrets (v. a. den
> YouTube-`YT_REFRESH_TOKEN`). GitHub zeigt gespeicherte Secrets **nicht** an. Wenn du sie
> nicht woanders gesichert hast, musst du den YouTube-OAuth-Token **neu erzeugen** (siehe §4).

## 1. GitLab-Account + Projekt (gratis)
1. Konto auf **https://gitlab.com** anlegen (gratis).
2. **New project → Import project → Repository by URL** →
   `https://github.com/allengchour-glitch/aban-news-landing.git`
   (oder „GitHub" als Quelle wählen). So landet der ganze Code inkl. `.gitlab-ci.yml` dort.
3. Einmalig: GitLab verlangt für die Gratis-Runner eine **Kreditkarten-Verifizierung**
   (reiner Echtheits-Check, **keine Kosten**). Settings → Billing, falls gefragt.

## 2. Secrets als CI/CD-Variablen eintragen
GitLab-Projekt → **Settings → CI/CD → Variables → Add variable** (jeweils „Masked" anhaken):

| Variable | Wert | Pflicht |
|---|---|---|
| `YT_CLIENT_ID` | YouTube-OAuth-Client-ID | ✅ |
| `YT_CLIENT_SECRET` | YouTube-OAuth-Client-Secret | ✅ |
| `YT_REFRESH_TOKEN` | YouTube-OAuth-Refresh-Token | ✅ |
| `GITLAB_PUSH_TOKEN` | Project-Access-Token (siehe §3) | empfohlen |
| `XI` | ElevenLabs-Key | nur für Neu-Rendern* |
| `PEXELS` | Pexels-Key | nur für Neu-Rendern* |

\* Die 13 offenen Folgen (ep24–ep36) sind **bereits gerendert** (Clips im Repo) → für den
Upload werden `XI`/`PEXELS` **nicht** gebraucht. Stimme ist im mp4.

## 3. Status-Speichern (gegen Doppel-Uploads)
Damit GitLab `uploaded.json`/`video_ids.json` zurückschreibt:
- GitLab-Projekt → **Settings → Access Tokens → Project Access Token** →
  Rolle „Maintainer", Scope **`write_repository`** → erstellen.
- Den Token als Variable **`GITLAB_PUSH_TOKEN`** eintragen (Masked).

## 4. Falls der YouTube-Refresh-Token verloren ist (neu erzeugen)
Wenn du `YT_REFRESH_TOKEN` nicht mehr hast:
1. Google-Cloud-Projekt → OAuth-Client (Desktop) → Client-ID + Secret (hast du evtl. noch).
2. Einmal den OAuth-Flow durchlaufen (Scope `https://www.googleapis.com/auth/youtube.upload`)
   → liefert einen neuen Refresh-Token. (Sag Bescheid, dann gebe ich dir ein kleines
   Hilfsskript dafür.)

## 5. Upload starten
GitLab-Projekt → **Build → Pipelines → Run pipeline** →
- Variable **`COUNT`** = `6` setzen (YouTube erlaubt ~6 Uploads/Tag) → Pipeline starten →
  Job **`aban-upload`** läuft (lädt ep24–ep29 hoch).
- **Nächster Tag:** nochmal mit `COUNT` = `7` (lädt den Rest ep30–ep36).

## 6. Optional: automatisch (sparsam!)
GitLab-Projekt → **Build → Pipeline schedules → New schedule** → z. B. täglich 06:00,
Variable `COUNT=2`. **Wichtig:** Gratis-Tarif hat ~400 CI-Minuten/Monat → sparsam planen,
sonst kostet es. Für den toten ABAN-Kanal lohnt Dauerbetrieb kaum — eher manuell.

## Sicherheit
- Secrets **nur** in GitLab-Variablen (Masked), **nie** in den Code/Chat.
- `.gitlab-ci.yml` enthält keine Geheimnisse, nur Variablen-Namen.
