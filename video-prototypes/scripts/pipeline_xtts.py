#!/usr/bin/env python3
"""XTTS-Pipeline: menschliche Stimme (Daisy) -> Rhubarb (Mund) + Whisper (Wort-Timing).
Aufruf: python3 pipeline_xtts.py <key...>"""
import os; os.environ["COQUI_TOS_AGREED"]="1"
import sys, json, subprocess, wave, imageio_ffmpeg, torch
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import XttsAudioConfig, XttsArgs
from TTS.config.shared_configs import BaseDatasetConfig
torch.serialization.add_safe_globals([XttsConfig,XttsAudioConfig,XttsArgs,BaseDatasetConfig])
from TTS.api import TTS

FF=imageio_ffmpeg.get_ffmpeg_exe(); RB="/tmp/rhubarb/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb"
SPK="Daisy Studious"
keys=sys.argv[1:] or ["s6"]
print("loading XTTS...")
tts=TTS("tts_models/multilingual/multi-dataset/xtts_v2",progress_bar=False)

for k in keys:
    txt=open(f"/tmp/sc_{k}.txt").read().strip()
    tts.tts_to_file(text=txt,speaker=SPK,language="de",file_path=f"/tmp/{k}_raw.wav")
    eq="highpass=f=70,dynaudnorm=f=250,aresample=24000"
    subprocess.run([FF,"-y","-i",f"/tmp/{k}_raw.wav","-ac","1","-af",eq,f"/tmp/{k}.wav"],check=True,capture_output=True)
    subprocess.run([RB,"-r","phonetic","-f","json","-o",f"/tmp/{k}_cues.json",f"/tmp/{k}.wav"],check=True,capture_output=True)
    w=wave.open(f"/tmp/{k}.wav"); print(f"[{k}] XTTS dur={w.getnframes()/w.getframerate():.2f}s")

import whisper
print("whisper word-timing...")
model=whisper.load_model("small")
for k in keys:
    r=model.transcribe(f"/tmp/{k}.wav",language="de",word_timestamps=True,fp16=False)
    words=[{"w":w["word"].strip(),"start":round(w["start"],3),"end":round(w["end"],3)}
           for seg in r["segments"] for w in seg.get("words",[])]
    json.dump(words,open(f"/tmp/{k}_words.json","w"),ensure_ascii=False); print(f"[{k}] {len(words)} words")
print("XTTS pipeline done")
