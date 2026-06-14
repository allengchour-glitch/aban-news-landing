#!/usr/bin/env python3
# LuxeStyle — transcribe.py · Video/Audio -> Text (faster-whisper, CPU, lokal, gratis).
# Zweck: Reels/Videos transkribieren (z.B. Berner Creator-Clips zum Mundart-Lernen, oder eigene
#        Voiceover-QA, oder DM-Sprachnachrichten). KEIN Cloud-Dienst, kein Key.
#
# ⚠️ Schweizerdeutsch: Whisper normalisiert „de" meist Richtung HOCHDEUTSCH — gut fürs INHALTLICHE
#    Verstehen, nur begrenzt für exakte Bärndütsch-Schreibweise. Trotzdem nützlich (Wortschatz, Hooks).
#
# Nutzung:
#   python3 automation/transcribe.py <datei.mp4|.wav|.m4a> [--model small|base|medium] [--lang de|auto]
#   -> druckt Transkript + schreibt <datei>.txt
import sys, os, subprocess, argparse

ap = argparse.ArgumentParser()
ap.add_argument("input")
ap.add_argument("--model", default=os.environ.get("WHISPER_MODEL", "small"))
ap.add_argument("--lang", default="de")
a = ap.parse_args()
if not os.path.exists(a.input):
    print("Datei fehlt:", a.input); sys.exit(1)

# Audio extrahieren (16k mono wav)
wav = "/tmp/_transcribe.wav"
subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", a.input,
                "-ar", "16000", "-ac", "1", wav], check=True)

from faster_whisper import WhisperModel
print(f"… Modell '{a.model}' laden (1. Mal: Download) …", file=sys.stderr)
model = WhisperModel(a.model, device="cpu", compute_type="int8")
lang = None if a.lang == "auto" else a.lang
segments, info = model.transcribe(wav, language=lang, vad_filter=True)
print(f"… Sprache: {info.language} (p={info.language_probability:.2f}) …", file=sys.stderr)

lines = []
for s in segments:
    lines.append(s.text.strip())
text = " ".join(lines).strip()
out = os.path.splitext(a.input)[0] + ".txt"
open(out, "w").write(text + "\n")
print(text)
print(f"\n📝 -> {out}", file=sys.stderr)
