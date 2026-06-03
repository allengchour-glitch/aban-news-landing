# XTTS v2 (Coqui) — gepinntes Setup + Fehler-Verlauf

XTTS gibt eine **deutlich menschlichere/ausdrucksvollere** Stimme als piper, ließ sich in der
Web-Session aber NICHT sauber installieren (Abhängigkeits-Kaskade). Hier das Rezept, damit es
in der `make-blueprint`-Umgebung (oder Docker) in einem Rutsch läuft.

## Warum es in der Web-Session scheiterte (Fehler-Verlauf)
Jeder Fix legte das nächste Problem frei:
1. `coqui-tts` Build bricht an **docopt** (setuptools-Inkompatibilität, Py3.11)
2. nach `setuptools<66`: **torch fehlt** (wird nicht automatisch gezogen)
3. nach torch: **torchaudio fehlt**
4. nach torchaudio: **transformers** zu alt → `isin_mps_friendly` fehlt
5. transformers 4.46 zu alt → coqui-tts will **transformers>=4.57**
6. mit torch 2.9: **torchcodec** nötig (braucht System-ffmpeg-Libs) → Sackgasse im Container

## Gepinntes, funktionierendes Setup (empfohlen)
Schlüssel: **torch < 2.9** vermeiden den torchcodec-Zwang.
```bash
python3 -m venv venv && source venv/bin/activate
pip install "setuptools<66" wheel
pip install "torch==2.4.1" "torchaudio==2.4.1" --index-url https://download.pytorch.org/whl/cpu
pip install "transformers>=4.57,<4.58"
pip install coqui-tts          # 0.27.x
# erster Lauf lädt das XTTS-v2-Modell (~1.8 GB)
export COQUI_TOS_AGREED=1
```

## Minimal-Skript (deutsche weibliche Stimme)
```python
import os; os.environ["COQUI_TOS_AGREED"]="1"
import torch
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import XttsAudioConfig, XttsArgs
from TTS.config.shared_configs import BaseDatasetConfig
torch.serialization.add_safe_globals([XttsConfig,XttsAudioConfig,XttsArgs,BaseDatasetConfig])
from TTS.api import TTS
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=False)
# weibliche Built-in-Speaker: z.B. "Daisy Studious", "Gracie Wise", "Tammy Grit"
tts.tts_to_file(text="…dein Skript…", speaker="Daisy Studious",
                language="de", file_path="vo.wav")
```
Danach wie gehabt: `rhubarb -r phonetic` → Mund-Cues, dann rendern.

## GPU-Tipp
Auf einer GPU (CUDA) ist XTTS ~10× schneller. CPU geht, ist aber langsam (Minuten pro Clip).

## Alternative ohne XTTS (läuft sofort, gratis)
piper TTS (`de_DE-eva_k` / `kerstin` / `ramona`) + Cartoon-Pitch + EQ-Glättung (ffmpeg).
Siehe LIPSYNC-SETUP.md. Etwas roboterhafter, aber 0 Installations-Stress.
