# 🧑‍🎤 LuxeStyle — Eigener KI-Sprecher (self-hosted, GRATIS, NVIDIA-GPU)

> Ersetzt HeyGen ohne Abo. Läuft auf dem **PC mit NVIDIA-GPU**. Kommerziell sichere Lizenzen:
> **SadTalker** (Apache-2.0, Bild→sprechender Kopf) + **OpenVoice v2** (MIT, Stimme/Voice-Clone).
> ⚠️ NICHT XTTS-v2 (CPML = nicht kommerziell). Cloud-Claude kann das NICHT (keine GPU) → nur PC.

## Was es macht
Text (Bärndütsch) → **OpenVoice** erzeugt die Stimme (optional aus 10-Sek-Sample geklont) →
**SadTalker** animiert ein Portrait-Bild dazu (sprechender Kopf) → ffmpeg macht 9:16 + Hook/CTA-Text
(Safe-Zone!) + Musik → fertiges Reel in `reels/`. Danach wie immer auf CDN + in die Queue.

## EINMALIGE Einrichtung (am PC, 1×)
**Voraussetzung:** Windows + NVIDIA-GPU (CUDA), `git`, `ffmpeg`, Miniconda/Python 3.10.
Doppelklick **`SETUP-AVATAR.bat`** (in diesem Ordner) — macht automatisch:
1. Conda-Env `avatar` (Python 3.10) + PyTorch-CUDA.
2. `git clone` SadTalker + OpenVoice, `pip install` der Requirements.
3. Lädt die Checkpoints (SadTalker-Modelle, OpenVoice-Checkpoints) herunter.
Dauert beim 1. Mal ~15–30 Min (Downloads). Danach nie wieder.

## Ein Reel erzeugen (am PC)
Doppelklick **`MACHE-AVATAR.bat`** → fragt nach Skript-Text (Bärndütsch) + Portrait-Bild →
erzeugt `reels/avatar-<datum>.mp4`. Oder Sätze in `automation/local/avatar/scripts.txt` (eine Zeile = ein Reel).

## Eingaben, die du brauchst
- **Portrait-Bild** des Presenters (`automation/local/avatar/presenter.jpg`) — neutral, frontal, gut beleuchtet.
  (KI-Portrait ist ok; KEIN echtes Promi-Gesicht. Für Markenkonsistenz dasselbe Gesicht behalten.)
- *(Optional)* **Stimm-Sample** (`voice-sample.wav`, ~10 Sek) für OpenVoice-Klon. Ohne Sample = Standard-Stimme.

## Für den PC-Claude (Browser/Port)
Sag am PC einfach: **„richte den Avatar ein"** → er führt `SETUP-AVATAR.bat` aus; danach
**„mach ein Avatar-Reel: <Bärndütsch-Text>"** → `MACHE-AVATAR.bat`. Repos/Lizenzen:
- SadTalker: https://github.com/OpenTalker/SadTalker (Apache-2.0)
- OpenVoice: https://github.com/myshell-ai/OpenVoice (MIT)
- Alternative höhere Qualität (mehr Setup): MuseTalk https://github.com/TMElyralab/MuseTalk

## Pipeline danach (automatisch, wie gehabt)
`reels/avatar-*.mp4` → `node automation/upload_to_shopify_cdn.mjs` → Zeile in `social/video_queue.csv`
(Bärndütsch-Caption aus `automation/brain/berndeutsch.json`) → Gehirn-Queue → Worker postet autonom.
