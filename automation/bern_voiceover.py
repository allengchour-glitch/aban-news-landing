#!/usr/bin/env python3
# LuxeStyle — bern_voiceover.py · LOKALE Eigen-Stimme (piper, gratis, kein Key).
# Macht aus Bärndütsch-Text eine Voiceover-WAV (für Reels: render_masterpiece.sh nimmt voice.wav).
# Whisper (transcribe.py) + diese Stimme = vollständige Sprach-Pipeline ohne Cloud.
#
# ⚠️ piper hat KEINE native Schweizerdeutsch-Stimme → wir nutzen die deutsche Kerstin-Stimme; auf
#    Bärndütsch-Text klingt sie „deutsch gefärbt". Für echte Mundart-Stimme: HeyGen (heygen_video.mjs,
#    braucht Key) oder Trend-Sound in der App. Für schnelle, gratis Voiceovers reicht das hier.
#
# Nutzung: python3 automation/bern_voiceover.py "Hoi zäme, das isch es schöns Teil!" [out.wav]
import sys, os, subprocess

TMP = "/tmp/brand"; VOICE = f"{TMP}/kerstin.onnx"
URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/kerstin/low/de_DE-kerstin-low.onnx"
os.makedirs(TMP, exist_ok=True)
text = sys.argv[1] if len(sys.argv) > 1 else ""
out = sys.argv[2] if len(sys.argv) > 2 else "/tmp/bern_vo.wav"
if not text:
    print('Nutzung: python3 automation/bern_voiceover.py "<Bärndütsch-Text>" [out.wav]'); sys.exit(1)

if not (os.path.exists(VOICE) and os.path.getsize(VOICE) > 1_000_000):
    print("… Kerstin-Stimme laden …", file=sys.stderr)
    subprocess.run(["curl", "-sS", "-L", "--max-time", "180", "-o", VOICE, URL], check=True)
    subprocess.run(["curl", "-sS", "-L", "--max-time", "60", "-o", VOICE + ".json", URL + ".json"], check=True)

p = subprocess.run(["piper", "-m", VOICE, "-f", out], input=text, capture_output=True, text=True)
if p.returncode != 0 or not os.path.exists(out):
    print("PIPER-Fehler:", p.stderr[-300:]); sys.exit(1)
print(out)
