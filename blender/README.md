# Blender-3D-Render (manuell, minuten-sicher)

Rendert kurze 360°-Animationen mit **Blender (Cycles, CPU)** in GitHub Actions —
**kein Cron**, läuft nur, wenn du es startest. Output landet in `media/3d/` und wird
automatisch auf **`/3d-animation.html`** eingebettet (sobald vorhanden).

## Starten
GitHub → **Actions** → **„3D Render (Blender · manuell)"** → **Run workflow** → Optionen:

| Option | Bedeutung | Default |
|---|---|---|
| `mode` | `intro` (abstraktes Marken-Intro) oder `mug` (Produkt-Turntable) | `intro` |
| `design` | nur `mug`: Pfad zum Design-PNG, z. B. `pod/looks/ex-mug-quote.png` | — |
| `frames` | Anzahl Frames (mehr = länger + mehr Minuten) | `48` |
| `samples` | Cycles-Samples (mehr = sauberer, langsamer) | `16` |
| `res` | Auflösung quadratisch in px | `720` |

Ergebnis: `media/3d/<mode>.mp4`, `<mode>.webm`, `<mode>-poster.jpg` (committet, `[skip ci]`).

## Minuten-Hinweis
CPU-Render ohne GPU. Richtwert klein halten: `frames=48`, `samples=16`, `res=720` ≈ wenige
Minuten. Für „schöner" `samples` hoch, für „länger/flüssiger" `frames` hoch — beides kostet Zeit.

## Lokal testen (falls Blender installiert)
```
MODE=intro FRAMES=24 SAMPLES=8 RES=512 OUT=media/3d/frames blender -b -P blender/render_scene.py
```

## Dateien
- `render_scene.py` — bpy-Szene (Modi `intro`/`mug`), defensiv für Blender 3.x/4.x.
- `.github/workflows/blender-render.yml` — Installer + Render + ffmpeg + Commit.
