#!/usr/bin/env python3
"""ElevenLabs-Pipeline: Premium-Stimme (Mary Kai) -> Rhubarb (Mund) + Whisper (Wort-Timing).
Erzeugt pro Szene:
  /tmp/{k}.wav      24k mono  (Lip-Sync/Whisper/Render-Input, wie bisher)
  /tmp/{k}_el.wav   44.1k     (saubere Quelle fürs Audio-Dressing)
  /tmp/{k}_cues.json, /tmp/{k}_words.json
Aufruf: XI=<key> python3 eleven_pipeline.py <key...>
"""
import os, sys, json, subprocess, wave, urllib.request, imageio_ffmpeg

XI = os.environ["XI"]
VOICE = os.environ.get("VOICE", "BswSp506E1rUw7uja1V5")   # Mary Kai
MODEL = "eleven_multilingual_v2"
FF = imageio_ffmpeg.get_ffmpeg_exe()
RB = "/tmp/rhubarb/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb"
keys = sys.argv[1:] or ["s6"]


def tts(text, mp3_path):
    body = json.dumps({
        "text": text, "model_id": MODEL,
        "voice_settings": {"stability": 0.40, "similarity_boost": 0.80,
                           "style": 0.20, "use_speaker_boost": True},
    }).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128",
        data=body, method="POST",
        headers={"xi-api-key": XI, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    with urllib.request.urlopen(req, timeout=120) as r:
        open(mp3_path, "wb").write(r.read())


for k in keys:
    txt = open(f"/tmp/sc_{k}.txt").read().strip()
    tts(txt, f"/tmp/{k}_el.mp3")
    # 44.1k saubere Quelle (für Dressing) + 24k mono (Lip-Sync/Render), gleiche EQ wie zuvor
    subprocess.run([FF, "-y", "-i", f"/tmp/{k}_el.mp3", "-ar", "44100", f"/tmp/{k}_el.wav"],
                   check=True, capture_output=True)
    eq = "highpass=f=70,dynaudnorm=f=250,aresample=24000"
    subprocess.run([FF, "-y", "-i", f"/tmp/{k}_el.mp3", "-ac", "1", "-af", eq, f"/tmp/{k}.wav"],
                   check=True, capture_output=True)
    subprocess.run([RB, "-r", "phonetic", "-f", "json", "-o", f"/tmp/{k}_cues.json", f"/tmp/{k}.wav"],
                   check=True, capture_output=True)
    w = wave.open(f"/tmp/{k}.wav")
    print(f"[{k}] ElevenLabs dur={w.getnframes()/w.getframerate():.2f}s", flush=True)

import whisper
print("whisper word-timing...", flush=True)
model = whisper.load_model("small")
for k in keys:
    r = model.transcribe(f"/tmp/{k}.wav", language="de", word_timestamps=True, fp16=False)
    words = [{"w": w["word"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)}
             for seg in r["segments"] for w in seg.get("words", [])]
    json.dump(words, open(f"/tmp/{k}_words.json", "w"), ensure_ascii=False)
    print(f"[{k}] {len(words)} words", flush=True)
print("ELEVEN pipeline done", flush=True)
