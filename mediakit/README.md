# mediakit — Bild- & Video-Bearbeitungs-Toolkit (aban news)

Gemeinsames, wiederverwendbares Toolkit für die Video-Projekte (aban-news-Reels
*und* ABAN-Files-Shorts). Drei Fähigkeiten:

1. **Allzweck-Edit** — Bild zuschneiden/skalieren, Video trimmen/zusammenfügen/croppen, Untertitel, Musik, Thumbnails.
2. **Reels fertig rendern** — aus `video-pipeline/ausgabe/<case>/` (Slides + Skript + SRT) ein **fertiges 9:16-mp4** machen (vorher: nur Standbilder → CapCut von Hand).
3. **Kreativ-KI** — Adobe-Firefly-MCP (agenten-aufgerufen, siehe `FIREFLY.md`).

## Installation
- **Bild-Befehle** brauchen nur Pillow (schon Projekt-Abhängigkeit).
- **Video-/Reel-Befehle** brauchen ffmpeg via:
  ```bash
  pip install imageio-ffmpeg
  ```
  (Holt ein gebündeltes ffmpeg inkl. libass — ffmpeg ist nicht im Container.)

## CLI
```bash
# BILD (nur Pillow)
python3 -m mediakit image crop    IN OUT --aspect 9:16|1:1|16:9 [--mode cover|contain] [--bg cream|ink|R,G,B]
python3 -m mediakit image resize  IN OUT --width N [--height N] [--aspect ...]
python3 -m mediakit image pad     IN OUT --aspect 9:16 [--bg cream]
python3 -m mediakit image thumb   IN OUT [--width 480] [--aspect 16:9]
python3 -m mediakit image overlay IN OUT [--brand-bar] [--logo logo.png] [--pos tl|tr|bl|br]
python3 -m mediakit image caption IN OUT --text "..." [--pos bottom|top]

# VIDEO (braucht imageio-ffmpeg)
python3 -m mediakit video trim     IN OUT --start 0:03 [--end 0:12 | --duration 9]
python3 -m mediakit video concat   OUT IN1 IN2 ... [--normalize]
python3 -m mediakit video vertical IN OUT                 # -> 1080x1920
python3 -m mediakit video captions IN OUT (--srt FILE | --ass FILE)
python3 -m mediakit video music    IN OUT (--ambient [--gain 0.14] | --music FILE [--duck])
python3 -m mediakit video fade     IN OUT [--fin 0.5] [--fout 0.8]
python3 -m mediakit video thumb    IN OUT.png [--at 0:02]

# REEL (die Lücke: Slides -> fertiges Video)
python3 -m mediakit reel <case-id> [--voice] [--no-ambient] [--out PATH]
#   <case-id> = Ordnername in video-pipeline/ausgabe/  (z. B. ein Hype-Watch-Fall)

# FIREFLY (Datei rein/raus; den KI-Edit macht der Agent per MCP)
python3 -m mediakit firefly prepare IN [--stage DIR]
python3 -m mediakit firefly ingest  FIREFLY_OUTPUT DEST
```

## Reel-Montage — Timing in 3 Stufen
`reel.py` liest die Slides + `skript.txt` + `untertitel.srt` (+ optional Voiceover):
- **A (mit `--voice` + `XI`-Key):** ElevenLabs-Wort-Timings → audiosynchrone Slide-Dauern **+ Karaoke-Untertitel**.
- **B (ohne Key):** Dauern aus den SRT-Cue-Spannen (4-Slide-Mapping: Slide 3 = Realität+Verdikt).
- **C (Fallback):** feste Dauern aus Wortzahl (~2,6 W/s, min 2,5 s) — läuft immer.

Jeder Slide → 9:16-Segment → Concat → Untertitel eingebrannt (Marken-Amber) →
ruhiger Ambient-Pad (+ Voiceover bei Stufe A). Ausgabe: `ausgabe/<case>/reel.mp4`
(git-ignored). Ohne Key/ffmpeg-Fehler: klare Meldung, kein Crash.

## Markenkit
`mediakit/brand.py` ist die Single Source of Truth für Farben/Fonts/Slide-Baustein
(vorher in `video-pipeline/generate_clips.py`). `generate_clips.py` und
`generate_promo.py` importieren von hier — unverändertes Verhalten.

## Wiederverwendete Muster
Die ffmpeg-/ASS-/Audio-/TTS-Muster sind aus `video-prototypes/aban-files/aban_stock.py`
**portiert** (inkl. ASS-`Name`-Feld-Fix). Die live laufende aban-files-Pipeline bleibt
**unangetastet**; eine spätere Migration auf `mediakit` ist optional.
