# Direkt auf YouTube veröffentlichen — 1 Video alle 2 Tage

> **Schnellstart (ein Kommando):** Sobald `client_secret.json` da ist (Schritte 1–3
> der „Einmaligen Einrichtung"), erledigt
> `cd video-prototypes && bash scripts/setup_youtube.sh`
> den Login, holt das Refresh-Token und setzt die 3 GitHub-Secrets automatisch (per `gh`).
> Danach läuft alles von allein — der Rest dieser Datei ist nur Hintergrundwissen.

Die Clips werden als **Shorts** hochgeladen und **von YouTube selbst terminiert**
veröffentlicht: jeder Upload bekommt ein `publishAt`-Datum aus `schedule.csv`
(Start 2026-06-04, dann alle 2 Tage, 18:00 Europe/Berlin). YouTube schaltet jeden
Clip automatisch zum Termin öffentlich — du lädst also **einmal** hoch, der Rest
läuft von allein.

## Einmalige Einrichtung (5 Min)

1. **Google-Cloud-Projekt** anlegen → <https://console.cloud.google.com/>
2. **YouTube Data API v3** aktivieren (APIs & Dienste → Bibliothek).
3. **OAuth-Client** erstellen: APIs & Dienste → Anmeldedaten → *OAuth-Client-ID* →
   Typ **Desktop**. JSON herunterladen und als
   `video-prototypes/client_secret.json` ablegen.
   (Beim ersten Lauf einmal als Test-User unter „OAuth-Zustimmungsbildschirm" eintragen.)
4. Pakete installieren:
   ```
   pip install google-api-python-client google-auth-oauthlib google-auth-httplib2
   ```

## Hochladen

Aus dem Ordner `video-prototypes/`:

```
make youtube            # terminiert laut schedule.csv (empfohlen)
# oder:
python3 scripts/yt_upload.py            # dito
python3 scripts/yt_upload.py --immediate   # alles sofort öffentlich
python3 scripts/yt_upload.py --scenes s1 s2  # nur einzelne
```

Beim ersten Lauf öffnet sich der Browser zur Freigabe; danach merkt sich
`token.json` die Anmeldung. Bereits hochgeladene Clips stehen in `uploaded.json`
und werden übersprungen — der Befehl ist gefahrlos wiederholbar.

## Wichtig

- **Geheim halten:** `client_secret.json`, `token.json`, `uploaded.json` **nicht**
  committen (stehen in `.gitignore`).
- **API-Kontingent:** Ein Upload kostet ~1600 Einheiten, Standard-Tageskontingent
  10 000 → ca. **6 Uploads/Tag**. Für alle 15 entweder an 3 Tagen laufen lassen
  oder im Cloud-Projekt eine Kontingent-Erhöhung beantragen.
- **Zeitzone:** Im Winter in `scripts/yt_upload.py` `TZ_OFFSET = "+01:00"` setzen.

## Vollautomatisch via GitHub Action (kein eigener Rechner)

Der Workflow `.github/workflows/youtube.yml` lädt **alle 2 Tage** automatisch den
nächsten Clip hoch und veröffentlicht ihn sofort als Short. Fortschritt steht in
`uploaded.json` (committet der Workflow zurück). Manuell auch per *Actions → Run
workflow* startbar (Eingabe „count" = wie viele Clips jetzt).

**Einrichtung:**

1. Schritte 1–4 oben erledigen (Cloud-Projekt, API, `client_secret.json`, pip).
2. **Einmal** ein Refresh-Token holen (lokal):
   ```
   cd video-prototypes
   python3 scripts/yt_get_refresh_token.py
   ```
   Browser-Freigabe bestätigen → das Skript druckt `YT_CLIENT_ID`,
   `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`.
3. Diese drei als **Repo-Secrets** hinterlegen:
   GitHub → *Settings → Secrets and variables → Actions → New repository secret*:
   - `YT_CLIENT_ID`
   - `YT_CLIENT_SECRET`
   - `YT_REFRESH_TOKEN`
4. Fertig. Der Cron läuft an ungeraden Tagen ~18:00 (Berlin). Zum Testen:
   *Actions → „YouTube auto-publish" → Run workflow* (count=1).

**Hinweise:**
- Die Clips müssen im Repo liegen (`video-prototypes/output/clipfilm_*.mp4`) — sind sie.
- Reihenfolge & Texte kommen aus `schedule.csv`. Reihenfolge/Start ändern:
  `make schedule` bzw. `python3 scripts/make_schedule.py 2026-07-01`, dann committen.
- Ein Upload/Lauf bleibt weit unter dem API-Tageskontingent.
- GitHub-Cron kann sich um einige Minuten verzögern — unkritisch.
