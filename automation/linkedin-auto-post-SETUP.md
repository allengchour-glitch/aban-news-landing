# LinkedIn Auto-Post Pipeline — Setup-Anleitung (Make.com-ALTERNATIVE)

> ⚠️ **WICHTIG — Markensicherheit (2026-06-06):** Die hier mitgelieferte `linkedin_posts_seed.csv`
> (30 „Launch-Sprint"-Posts) enthält **erfundene Statistiken und Metriken** — z. B. Bitkom-Zahlen
> (41 %/19 %), Umfragen mit `n=327`/`142 Leser`, Abo-Zahlen („285 Abos"), Open-/Reply-Rates. Das
> verstößt gegen das Markenversprechen „keine erfundenen Fakten". **Diese 30 Posts NICHT ungeprüft
> autonom posten.** Vor Verwendung: erfundene Zahlen entfernen/durch echte ersetzen.
>
> ✅ **Empfohlener (autonom + gratis) Weg ist jetzt die native Pipeline** — keine Fremdkonten:
> `automation/linkedin_post.py` + `social/linkedin_queue.json` + `.github/workflows/linkedin-autopost.yml`
> (Setup: `docs/LINKEDIN-AUTOPOST.md`). Deren Queue enthält nur **geprüfte, evergreen** Posts (kein Fake).
> Dieses Make.com-Blueprint bleibt als **Alternative** (LinkedIn-Login bequem über Buffer), ist aber
> **nicht** verdrahtet und nutzt obige CSV — also erst nach Faktencheck einsetzen.

> Veröffentlicht täglich (Mo–Fr, 08:00 Europe/Zurich) automatisch einen LinkedIn-Post
> aus einer Google-Sheet-Queue, markiert die Zeile als "posted" und sendet
> eine Slack-Confirmation. 30 Posts vorpopuliert für den Launch-Sprint.

---

## Dateien in diesem Ordner

| Datei | Zweck |
|-------|-------|
| `linkedin-auto-post.blueprint.json` | Make.com Scenario-Blueprint zum Importieren |
| `linkedin_posts_seed.csv` | 30 vorpopulierte Posts für Google Sheets (UTF-8 BOM) |
| `linkedin-auto-post-SETUP.md` | Diese Anleitung |

---

## Architektur

```
Cron Mo-Fr 08:00 Europe/Zurich
        ↓
Google-Sheets:SearchRows (status=ready AND scheduled_date=today, limit 1)
        ↓
HTTP-Module → LinkedIn UGC-Posts-API   (ALTERNATIV: Buffer / Publer)
        ↓
Google-Sheets:UpdateRow (status=posted, posted_at=NOW, post_url=Response-ID)
        ↓
HTTP-Module → Slack-Webhook ("✅ Post N veröffentlicht …")
```

---

## Setup-Schritte (Option A: direkte LinkedIn-API)

### 1. Google Sheet anlegen

1. Neues Google Sheet erstellen → Name z. B. `aban-news-config`
2. Tab umbenennen zu `linkedin_posts`
3. Spalten in Row 1 (genau diese Reihenfolge!):

   | A | B | C | D | E | F | G |
   |---|---|---|---|---|---|---|
   | id | scheduled_date | content | hashtags | status | posted_at | post_url |

4. Daten importieren:
   - **File → Import → Upload → `linkedin_posts_seed.csv`**
   - Import location: "Append to current sheet"
   - Separator: Detect automatically
   - Convert text to numbers/dates: **NO** (sonst werden Hashtags geschrottet)
5. `scheduled_date`-Spalte: Format → Plain text (damit ISO-Dates 1:1 stehen bleiben)
6. Sheet-ID aus URL kopieren (zwischen `/d/` und `/edit`)

### 2. LinkedIn Developer App + Access-Token

1. https://www.linkedin.com/developers/apps → Create App
2. Produkte aktivieren:
   - **Share on LinkedIn** (Scope: `w_member_social`)
   - **Sign In with LinkedIn using OpenID Connect** (Scope: `openid`, `profile`)
3. OAuth-2.0-Flow durchlaufen → `access_token` notieren (60 Tage gültig)
4. Eigene Person-URN holen via Test-Call:
   ```
   curl -H "Authorization: Bearer <TOKEN>" \
        https://api.linkedin.com/v2/userinfo
   ```
   Die `sub`-ID ist deine Person-URN-ID → `urn:li:person:<sub>`

> ⚠️ LinkedIn-Token läuft nach 60 Tagen ab. Für den 30-Tage-Sprint OK,
> danach refreshen oder Buffer-Alternative nutzen (Option B unten).

### 3. Slack Webhook

1. https://api.slack.com/apps → Create App "aban news"
2. Incoming Webhooks aktivieren → Webhook-URL kopieren
3. Channel z. B. `#aban-launch`

### 4. Make.com Scenario

1. https://eu1.make.com → New Scenario
2. **Import Blueprint** → `linkedin-auto-post.blueprint.json` hochladen
3. Beim Import werden 4 Module sichtbar — Connections einrichten:

   | Modul | Connection | Pflichtfelder |
   |-------|-----------|---------------|
   | 1. Google Sheets Search Rows | Google OAuth | Spreadsheet-ID, Tab=`linkedin_posts` |
   | 2. HTTP LinkedIn POST | Header-Auth | `__LINKEDIN_ACCESS_TOKEN__`, `__LINKEDIN_PERSON_URN__` |
   | 3. Google Sheets Update Row | (gleiche Connection) | gleiche IDs |
   | 4. HTTP Slack | (none) | `__SLACK_WEBHOOK_URL__` |

4. Scenario-Variables anlegen (Make → Scenario settings → Variables):
   - `LINKEDIN_ACCESS_TOKEN`
   - `LINKEDIN_PERSON_URN`
   - `SHEET_ID`
   - `SLACK_WEBHOOK_URL`

5. Schedule: bereits aus Blueprint übernommen — `0 8 * * 1-5` Europe/Zurich

### 5. Test-Run

1. In Sheet: Row mit `id=1` auf `scheduled_date = today` setzen
2. Make.com → "Run once"
3. LinkedIn-Profil prüfen: Post sichtbar?
4. Sheet prüfen: `status=posted`, `posted_at` befüllt?
5. Slack: Confirmation-Message angekommen?
6. Bei Erfolg: scheduled_date wieder auf Original-Datum zurücksetzen.

### 6. Schedule aktivieren

- Toggle "ON" oben links im Make-Scenario.
- Operations-Budget free-tier: 1.000 Ops/Monat — pro Tag ~4 Ops = 80/Monat. ✓

---

## Setup-Schritte (Option B: Buffer / Publer — ohne LinkedIn-API)

Falls LinkedIn-Token-Refresh zu nervig:

1. **Buffer Free-Plan** (https://buffer.com): 3 Kanäle + 30 Posts queue
2. Buffer mit LinkedIn-Account verbinden (One-Click-OAuth, kein Token-Management)
3. In Make.com Blueprint → Modul 2 austauschen:
   - HTTP-Module entfernen
   - **Buffer:CreateUpdate**-Modul einfügen (Make hat das nativ)
   - Mapping: `text = {{1.content}}`, `profile_ids = [BUFFER_PROFILE_ID]`
4. Rest bleibt identisch.

**Pro:** Kein Token-Refresh, native LinkedIn-Verbindung.
**Contra:** Buffer Free hat 10 Posts/Channel Queue — für 30-Tage-Sprint reicht's,
weil Make täglich neu schiebt.

**Alternative:** Publer (https://publer.io) — ähnlich Buffer, aber mit
expliziter "Send Now" API, nicht nur Queue.

---

## Sheet-Spec — `linkedin_posts` Tab

| Spalte | Typ | Beispiel | Pflicht |
|--------|------|----------|---------|
| `id` | Number | 1, 2, …, 30 | ✓ |
| `scheduled_date` | ISO-Date (Plain text!) | `2026-06-01` | ✓ |
| `content` | Multi-line text | Voller Post-Body inkl. Zeilenumbrüche | ✓ |
| `hashtags` | Text | `#KI #DACH #Newsletter` | optional |
| `status` | Enum | `ready` / `posted` / `skipped` | ✓ |
| `posted_at` | Datetime | `2026-06-01 08:01:15` | auto |
| `post_url` | URL | LinkedIn-Response-ID | auto |

**Pre-populated:** 30 Posts aus `wachstum/linkedin-30-posts-launch.md`,
gemappt auf 2026-06-01 bis 2026-06-30 (1 Post pro Tag, inkl. Wochenende
für vollständige Coverage — Scheduler postet aber nur Mo–Fr, Wochenend-Posts
werden manuell auf Wochentage verschoben oder bleiben als Reserve).

---

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| LinkedIn-API "401 Unauthorized" | Token abgelaufen → neuen via OAuth-Flow ziehen |
| Sheet-Filter trifft 0 Rows | `scheduled_date` als Plain-text formatiert? Zeitzone passt? |
| Slack-Notification fehlt | Webhook-URL korrekt? → Test-Call mit curl |
| Make-Run-Limit erreicht | Free 1000/Monat; bei Bedarf upgrade auf Core 9 $/Monat |
| Post 2× am selben Tag | `maxRows: 1` im Sheets-Modul gesetzt? Schedule nur 1× pro Tag? |

---

## Wartung

- **Wöchentlich:** Sheet checken — alle Posts mit `status=ready` für kommende Woche?
- **Monatlich:** LinkedIn-Token refreshen (Option A)
- **Monitoring:** Make.com → Scenario → History → letzte 30 Runs prüfen

---

## Erweiterungen (später)

- A/B-Test-Spalte: `variant_a` / `variant_b` → Modul-Filter zufällig
- Image-Posts: zusätzliche Spalte `image_url`, LinkedIn-Multimedia-Upload-Flow
- Engagement-Tracking: nach 24h Likes/Comments via LinkedIn-API in Sheet zurückschreiben
- Multi-Channel: gleiches Sheet → Twitter/Bluesky/Threads-Modul hinzufügen

— Aban
