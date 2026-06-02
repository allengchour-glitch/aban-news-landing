# Direkt auf YouTube veröffentlichen — 1 Video alle 2 Tage

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

## Vollautomatisch ohne eigenen Rechner (optional)

Statt lokal kann ein **GitHub-Action-Workflow** den Upload übernehmen: OAuth-
Refresh-Token als Repo-Secret hinterlegen, Workflow per Knopfdruck (oder Cron)
starten. Sag Bescheid, dann lege ich `.github/workflows/youtube.yml` an.
