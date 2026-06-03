# ABAN Files — Faceless Sci-Fi/Ancient-Aliens Shorts (vollautomatisch)

Automatisierte 9:16-Kurzvideo-Serie für YouTube. Sprecher ist **ALLENG**, ein
reptiloider Herrscher aus dem Inneren der Erde („KING ALLENG" wird **nicht** mehr
genannt — `ALLENG` ist der echte Vorname des Owners und bleibt draußen). Jede Folge
ist ein kurzer, mysteriöser Monolog im Ancient-Aliens-Doku-Ton, endet mit
**„The ABAN Files. Check it out."**

> **Marken-Regel:** echten Namen NIE nennen. Owner-Handle privat halten.

## Schnellüberblick

```
aban_scripts.json      # alle Folgen (title / hook / text)
aban_stock.py          # Render-Pipeline (Pexels + ElevenLabs + Untertitel + Musik)
aban_publish.py        # lädt die nächste Folge als YouTube-Short hoch
aban_film.py           # baut aus allen Clips EINEN Collection-Film (mit Musik)
aban_stats.py          # liest View-Zahlen -> Analyst/Grower
aban_render.py         # Backup: prozedurale Faceless-Animation (ohne Stock)
heygen_make.sh         # Backup: echter HeyGen-Avatar IV (braucht api-Credits)
clips/ep*.mp4          # vorgerenderte Clips (Workflow lädt sie ohne CI-Render)
uploaded.json          # Fortschritt (welche Folgen schon hoch sind)
video_ids.json         # ep -> YouTube-Video-ID (für den Analysten)
```

## 1. Render-Pipeline (`aban_stock.py`) — GRATIS, in Nutzung

ElevenLabs-Stimme (mit Wort-Timing) + echtes **Pexels**-Footage (16 Shots/Folge) +
**Karaoke-Untertitel** (ASS/libass, im unteren Drittel) + Dark-Grade/Vignette/Korn +
**ABAN-Branding** oben + **dunkler Ambient-Score** (a-moll-Pad, füllt stille Stellen).

```bash
export XI="<elevenlabs-key>"
export PEXELS="<pexels-key>"        # gratis: https://www.pexels.com/api/
python3 aban_stock.py ep11          # -> /tmp/aban_stock_ep11.mp4
```

- Szenen-Suchbegriffe pro Folge: `SCENES`-Dict im Skript (gern Drohne/Totale/Makro/
  Slow-Mo mischen für den Film-Doku-Look).
- Untertitel-Timing kommt aus dem ElevenLabs-„with-timestamps"-Endpoint (kein Whisper).
- Stimme: `pNInz6obpgDQGcFmaJgB` (Adam), `stability 0.5 / style 0.45` für flüssiges Reden.

## 2. Auto-Publish (`aban_publish.py` + `.github/workflows/aban-youtube.yml`)

Wählt die nächste noch nicht hochgeladene Folge, nimmt den **fertigen Clip**
`clips/<ep>.mp4` (sonst rendert er frisch — dann XI+PEXELS nötig) und lädt ihn als
Short hoch. Merkt sich Fortschritt in `uploaded.json` und die Video-ID in
`video_ids.json`.

```bash
python3 aban_publish.py --count 1 --privacy public   # oder unlisted/private
```

- **Auth:** reuse der Bunny-Secrets `YT_CLIENT_ID` / `YT_CLIENT_SECRET` /
  `YT_REFRESH_TOKEN` (gelten für denselben Kanal). Kein eigenes Token nötig.
- **Zeitplan:** Cron an geraden Tagen ~19:00 Berlin, je 1 Folge öffentlich.
- Manuell: Actions → „ABAN Files auto-publish" → Run workflow (count/privacy).

## 3. Film-Compiler (`aban_film.py`)

Hängt alle `clips/ep*.mp4` zu einem durchgehenden „Collection"-Film zusammen und legt
den Ambient-Score drunter.

```bash
python3 aban_film.py                  # -> aban-files-collection.mp4 (alle Folgen)
python3 aban_film.py best.mp4 ep11 ep2 ep9   # nur ausgewählte
```

## 4. Analyst / Grower (`aban_stats.py` + `.github/workflows/aban-stats.yml`)

Liest die View-Zahlen (über `video_ids.json` und/oder Kanal-Erkennung) und gibt eine
nach Views sortierte Tabelle + Top-Performer-Hinweis aus.

```bash
python3 aban_stats.py            # Tabelle in die Konsole
python3 aban_stats.py --report   # zusätzlich reports/ABAN-STATS.md
```

Der Workflow läuft **wöchentlich** (Montag) und committet den Report. **So wächst der
Kanal datengetrieben:** Bestperformer-Thema erkennen → mehr davon bauen.

## Neue Folge hinzufügen

1. Eintrag `epN` in `aban_scripts.json` (title / hook / 1 Monolog, Ende
   „The ABAN Files. Check it out.").
2. `SCENES["epN"]` in `aban_stock.py` (12–18 thematische, mysteriöse Queries).
3. Rendern: `XI=… PEXELS=… python3 aban_stock.py epN`.
4. Clip nach `clips/epN.mp4` kopieren, committen.
5. Der Auto-Cron lädt sie beim nächsten Lauf hoch (oder manuell mit `--count`).

## Abhängigkeiten

```bash
pip install Pillow numpy imageio-ffmpeg \
  google-api-python-client google-auth-oauthlib google-auth-httplib2
```
ffmpeg kommt aus `imageio_ffmpeg` — muss **`subtitles`/libass** können; **`drawtext`
wird NICHT vorausgesetzt** (Branding liegt darum in der ASS-Datei, nicht per drawtext).

## Gotchas (teuer erkauftes Wissen)

- **ASS-Untertitel:** die Events-`Format:`-Zeile MUSS das Feld `Name` enthalten,
  sonst rutscht ein Komma in jeden Untertitel (`,Text`).
- **Kein `drawtext`** im gebündelten ffmpeg → Titel/Branding über ASS-Styles lösen.
- **Pexels** blockt den Default-Python-User-Agent (403) → Browser-UA mitsenden.
- **Persist-Step:** `git add` VOR `git diff --cached` prüfen, sonst werden NEUE
  `uploaded.json` / `video_ids.json` nicht committet → Doppel-Uploads.
- **Upload-Token-Scope** ist nur `youtube.upload` → bereits hochgeladene Videos
  lassen sich per API **nicht** auf öffentlich umstellen (manuell im Studio).

## Roadmap (datengetrieben)

NICHT blind weiterproduzieren. ~1 Tag laufen lassen → `aban_stats.py` →
Bestperformer-Thema/Stil ausbauen. Look-Ziel: **Film-Doku** (mehr/mysteriösere Shots,
andere Perspektiven, Spannungsbogen, echte Mysterien wie Göbekli Tepe/Nazca/Puma Punku).

## Secrets (nie ins Repo)

`XI` (ElevenLabs), `PEXELS`, `YT_CLIENT_ID/SECRET/REFRESH_TOKEN`. Für den
HeyGen-Backup zusätzlich `HG`. Alles als Env-Variablen bzw. GitHub-Secrets.
