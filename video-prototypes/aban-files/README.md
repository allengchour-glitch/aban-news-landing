# ABAN Files — Faceless Sci-Fi Shorts Pipeline

Automatisierte 9:16-Kurzvideos für die „ABAN Files"-Serie (KING ALLENG, der
reptiloide Herrscher aus dem Inneren der Erde, kommentiert KI/Tech/Welt).

Es gibt **drei Render-Wege** — alle nutzen dieselben Skripte (`aban_scripts.json`)
und dieselbe ElevenLabs-Stimme. Keys kommen **immer aus Umgebungsvariablen**,
niemals im Code.

## 1. Stock-Footage (gratis, empfohlen) — `aban_stock.py`
Echtes cinematisches Pexels-Footage + ElevenLabs-Stimme + Karaoke-Untertitel
(ASS/libass) + Dark-Grade/Vignette/Korn + ABAN-Branding + dunkles Drone-Bett.

```bash
export XI="<elevenlabs-key>"
export PEXELS="<pexels-key>"          # gratis: https://www.pexels.com/api/
python3 aban_stock.py ep1             # -> /tmp/aban_stock_ep1.mp4
```
Szenen-Suchbegriffe pro Folge stehen im `SCENES`-Dict im Skript.

## 2. Faceless-Animation (gratis, ohne Stock) — `aban_render.py`
Prozeduraler Sci-Fi-Look (Code-Regen, Amber-Glow) + Karaoke-Untertitel.
Braucht nur `XI` (ElevenLabs). Reines PIL/ffmpeg, kein Stock-Key.

```bash
export XI="<elevenlabs-key>"
python3 aban_render.py ep1            # -> /tmp/aban_ep1.mp4
```

## 3. HeyGen Avatar IV (echter sprechender Avatar) — `heygen_make.sh`
Der „ABAN ALLENG"-Talking-Photo spricht via Avatar IV
(`use_avatar_iv_model: true` **im `character`-Objekt**).
Braucht **`api`-Credits** im HeyGen-Konto (~$4/Min).

```bash
export HG="<heygen-api-key>"
bash heygen_make.sh ep1              # -> alleng_ep1.mp4
```

## Dateien
- `aban_scripts.json` — Folgen-Skripte (title / hook / text).
- `aban_stock.py` — Stock-Footage-Pipeline.
- `aban_render.py` — prozedurale Faceless-Pipeline.
- `heygen_make.sh` — HeyGen-Avatar-IV-Pipeline.

## Abhängigkeiten
`pip install Pillow numpy imageio-ffmpeg` — ffmpeg kommt aus `imageio_ffmpeg`
(muss `subtitles`/libass können; `drawtext` wird **nicht** vorausgesetzt).

## Hinweise
- ElevenLabs-Stimme: Standard `pNInz6obpgDQGcFmaJgB` (Adam), via `VOICE` änderbar.
- Untertitel-Timing kommt aus dem ElevenLabs „with-timestamps"-Endpoint
  (kein Whisper nötig).
- Keys/Secrets gehören in GitHub-Action-Secrets bzw. lokale Env — nicht ins Repo.
