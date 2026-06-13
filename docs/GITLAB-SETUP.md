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

### Pinterest (Gratis-Dauertraffic für LuxeStyle) — Job `pinterest-publish`
| Variable | Wert | Pflicht |
|---|---|---|
| `PINTEREST_ACCESS_TOKEN` | Pinterest-Access-Token | eine der beiden Varianten |
| `PINTEREST_REFRESH_TOKEN` | Pinterest-Refresh-Token | **empfohlene Variante** (läuft nie ab) |
| `PINTEREST_APP_ID` | Pinterest-App-ID | mit Refresh-Token |
| `PINTEREST_APP_SECRET` | Pinterest-App-Secret | mit Refresh-Token |

Postet die fertigen Pins aus `dropship/pinterest_pins.csv` (103 Stück) gedrosselt — identisch
zum gesperrten GitHub-Workflow. **Achtung Pinterest-API-Zugang:** die App muss **„Standard Access"**
haben; eine Trial-/„Consumer type"-App liefert `401 consumer type not supported` (das ist KEIN
Token-Fehler). Standard-Access beantragt man im Pinterest-Developer-Portal — bis dahin Pins notfalls
per Bulk-Upload/Pinterest-Shopify-Kanal posten (siehe `dropship/PINTEREST-SETUP.md`).

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

## 5. Jobs starten
GitLab-Projekt → **Build → Pipelines → Run pipeline** → dann den gewünschten Job starten:
- **`aban-upload`** (YouTube): Variable **`COUNT`** = `6` (YouTube ~6 Uploads/Tag) → lädt ep24–ep29.
  Nächster Tag `COUNT=7` für den Rest ep30–ep36.
- **`pinterest-publish`** (LuxeStyle-Traffic): Variable **`LIMIT`** = `5` (Pins pro Lauf), `DRY=true`
  für einen Testlauf ohne Posten. Braucht die Pinterest-Variablen aus §2.

## 6. Optional: automatisch (sparsam!)
GitLab-Projekt → **Build → Pipeline schedules → New schedule**:
- **Pinterest** (lohnt sich — Dauertraffic): z. B. **Mo & Do 09:00**, Variable `LIMIT=5`.
  Vorrat reicht für ~10 Wochen, dann „mehr Pins" sagen.
- **ABAN-YouTube**: für den toten Kanal lohnt Dauerbetrieb kaum → eher manuell.

**Wichtig:** Gratis-Tarif hat ~400 CI-Minuten/Monat → sparsam planen (2 Pinterest-Läufe/Woche
brauchen nur wenige Minuten), sonst kostet es.

## Sicherheit
- Secrets **nur** in GitLab-Variablen (Masked), **nie** in den Code/Chat.
- `.gitlab-ci.yml` enthält keine Geheimnisse, nur Variablen-Namen.
