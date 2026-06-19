# freegen — gratis Creator-Tools (HeyGen/Canva/ElevenLabs-Ersatz)

Selbstgebaute, kostenlose & unbegrenzte Werkzeuge für abannews-Content. Kein Abo,
keine Credits, keine API-Keys.

## Werkzeuge
| Tool | Zweck | Ersetzt |
|---|---|---|
| `automation/freegen_video.py` | Text→Video (Captions, Ken-Burns-Zoom, Intro/Outro, Voiceover, Musik) | HeyGen / InVideo |
| `automation/freegen_image.py` | Social-Images (Post/Square/Story/OG) | Canva |
| `automation/freegen_tts.py` | Deutsches Voiceover (WAV) | ElevenLabs |
| `automation/freegen_hubreels.py` | Auto-Reel je `ki-*.html`-Hub (Titel/Teaser → Skript/MP4) | — |

## Abhängigkeiten (einmalig)
```bash
pip install pillow imageio-ffmpeg piper-tts
python3 -m piper.download_voices de_DE-thorsten-medium   # deutsche Stimme (~61 MB)
```
`ffmpeg` wird automatisch gefunden (System-`ffmpeg` oder das von `imageio-ffmpeg`
mitgelieferte Binary). Schrift: DejaVuSans (Standard auf Linux).

## Schnellstart
```bash
# Video aus Skript (siehe script.example.json)
python3 automation/freegen_video.py freegen/script.example.json

# Social-Images (Canva-Ersatz)
python3 automation/freegen_image.py --batch freegen/images.example.json

# Voiceover allein
python3 automation/freegen_tts.py "Dein Text" --out freegen/out/voice.wav

# Auto-Reels für die ersten 10 KI-Hubs (nur Skripte; --render für MP4)
python3 automation/freegen_hubreels.py --limit 10 --voiceover --render
```

## Video-Skript-Felder (freegen_video.py)
- `w/h/fps`, `music`, `brand`, `output`
- `intro` / `outro` (Text) → gebrandete Klammer-Szenen
- `voiceover` (Text) → piper-Stimme als Hauptton, Musik wird automatisch geduckt
- `scenes[]`: `{ text, seconds, bg, image?, motion? }` (Ken-Burns-Zoom: Standard an bei Bild)

Generierte Dateien (`out/`, `img/`, `hubs/`, `*.mp4`) sind per `.gitignore`
ausgeschlossen — regenerierbar, gehören nicht ins Repo.
