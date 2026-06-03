# Video-Stack (konsolidiert) — wer macht was

> Eine Quelle der Wahrheit für die Video-Produktion im aban-Netzwerk. Es gibt
> **zwei Säulen** mit unterschiedlichem Zweck — bewusst getrennt, hier zusammengeführt.

## Säule 1 — `video-pipeline/` (Funnel-Clips, schlicht)
**Zweck:** kurze 9:16-Clips, die auf den Newsletter führen. Geld kommt über den
**Funnel**, nicht über Views.

- `generate_clips.py` → faceless Clip-Pakete aus den Hype-Watch-Faktenchecks
  (`data/hype-watch.json`): markengetreue Pillow-Slides + `untertitel.srt` + VO-Text.
- `generate_promo.py` → der Newsletter-Werbespot (40 s + 15 s).
- Reine stdlib + Pillow. Optionale Vertonung via `ELEVENLABS_API_KEY` (`--voice`).
- Kein Avatar, kein Stock-Footage — bewusst minimal. Output `ausgabe/` ist git-ignored.

**Wann nutzen:** schnell, kostenlos, ehrlich. Der Standard-Weg.

## Säule 2 — `video-prototypes/aban-files/` (eigener YouTube-Kanal, aufwändiger)
**Zweck:** ein faceless **YouTube-Kanal** („ABAN Files") mit höherer Produktion.

- `aban_render.py` / `aban_stock.py` — Render-Pipeline mit **Pexels**-Stock-Footage.
- `heygen_make.sh` — optional **HeyGen**-Avatar (Avatar IV).
- `scripts/eleven_pipeline.py` — **ElevenLabs**-Stimme → LipSync → Whisper-Untertitel.
- `aban_publish.py` + Workflow **`aban-youtube.yml`** — rendert **in der CI** und lädt
  als Short hoch. **Zeitplan deaktiviert** — nur `workflow_dispatch`, bis du bewusst
  freigibst. Fortschritt in `aban-files/uploaded.json`.

**Wann nutzen:** wenn du den eigenen Kanal regelmäßig bespielen willst. Mehr Aufwand,
mehr Keys.

## Keys / Secrets (nur in GitHub-Secrets, nie im Repo)
| Secret | Wofür | Säule |
|--------|-------|:-----:|
| `ELEVENLABS_API_KEY` / `XI` | Vertonung | 1 + 2 |
| `PEXELS` | Stock-Footage | 2 |
| `YT_CLIENT_ID` / `YT_CLIENT_SECRET` | YouTube-OAuth | 2 |
| `ABAN_YT_REFRESH_TOKEN` | Upload auf den ABAN-Files-Kanal | 2 |

Setzen wie in [`API-KEYS.md`](API-KEYS.md). HeyGen-Rendering ist bewusst **nicht**
voll automatisiert (Kosten pro Clip).

## Videos klein rendern — `video-prototypes/scripts/shrink.py`
ffmpeg-Wrapper (System- oder gebündeltes `imageio-ffmpeg`), der fertige `.mp4`
deutlich verkleinert — für Shorts-Upload und um Repo-Bloat zu vermeiden.

```bash
python3 video-prototypes/scripts/shrink.py clip.mp4            # CRF 28, H.264 -> clip-small.mp4
python3 video-prototypes/scripts/shrink.py clip.mp4 --target-mb 8   # ~8 MB (Zwei-Pass)
python3 video-prototypes/scripts/shrink.py output/ --suffix -small  # ganzer Ordner
python3 video-prototypes/scripts/shrink.py clip.mp4 --h265 --crf 30 # noch kleiner
# oder per Makefile:  make shrink            (output/ -> *-small.mp4)
#                     make shrink-s6         (ein Clip)
#                     make shrink TARGET=8   (~8 MB pro Clip)
```

Standard: auf 1080×1920 begrenzt, `+faststart`, AAC 128k. Im Test: 31 MB → ~2–3 MB
(−90 %) bei guter Optik. Zielgrößen-Modus trifft die MB recht genau.

## Veraltet
- **`youtube.yml`** (lud vorab-gerenderte Clips aus `video-prototypes/output/`) ist
  **veraltet**: die 275 MB Renders wurden aus Git entfernt (schlanker Stack). Zeitplan
  deaktiviert. Der CI-Render-Weg (`aban-youtube.yml`) ersetzt ihn. `video-prototypes/output/`
  ist git-ignored — Renders bleiben lokal.

## Ehrlich
Auto-Publish bringt nur etwas mit regelmäßigem, gutem Content. Die Technik ist der
einfache Teil; das Dranbleiben der schwere. Kein YouTube-Reichtums-Versprechen.
