# Video-Helfer-Tools (`video-prototypes/scripts/`)

> Zwei eigenständige Helfer, die die Video-Produktion einfacher machen — reine
> stdlib + ffmpeg, ändern nichts an der bestehenden Render-Pipeline.

## `shrink.py` — Videos klein rendern
ffmpeg-Wrapper (System- oder gebündeltes `imageio-ffmpeg`), der fertige `.mp4`
deutlich verkleinert — für Shorts-Upload und gegen Repo-Bloat.

```bash
python3 video-prototypes/scripts/shrink.py clip.mp4            # CRF 28, H.264 -> clip-small.mp4
python3 video-prototypes/scripts/shrink.py clip.mp4 --target-mb 8   # ~8 MB (Zwei-Pass, trifft die MB)
python3 video-prototypes/scripts/shrink.py output/ --suffix -small  # ganzer Ordner
python3 video-prototypes/scripts/shrink.py clip.mp4 --h265 --crf 30 # noch kleiner
```
Standard: ≤1080×1920, `+faststart`, AAC 128k. Im Test: 31 MB → ~2–3 MB (−90 %).
Optional vor dem Upload einsetzbar (kleiner = schneller hochgeladen).

## `doctor.py` — Preflight-Check
Sagt in 2 Sekunden, was bereit ist und was fehlt (Python-Pakete, ffmpeg,
Keys/Secrets) mit ✓/●/✗ + Fix-Befehl. Verrät keine Key-Werte.

```bash
python3 video-prototypes/scripts/doctor.py
```

## `requirements.txt`
Kern-Pakete in einem Befehl:
```bash
pip install -r video-prototypes/requirements.txt
```
YouTube-/XTTS-Pakete sind dort dokumentiert und bei Bedarf einkommentierbar.

> Hinweis: Die Render-/Publish-Pipeline (`aban-files/`, `Makefile`, Workflows) wird
> von der Video-Session gepflegt — diese Helfer sind bewusst eigenständig und
> greifen nicht ein. Wer mag, kann `shrink.py` vor dem Upload einhängen.
