#!/usr/bin/env python3
"""Audio-Pipeline: piper TTS -> Cartoon-Pitch + EQ-Glaettung -> Rhubarb (Mund) + Whisper (Wort-Timing)."""
import sys, json, subprocess, wave, imageio_ffmpeg
FF=imageio_ffmpeg.get_ffmpeg_exe()
RB="/tmp/rhubarb/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb"
VOICE="/tmp/de_DE-eva_k-x_low.onnx"
SR_BASE=16000
PITCH=1.0          # natuerliche Stimme (kein Cartoon-Pitch)
keys=sys.argv[1:] or ["s6","s3","s7"]

def sh(cmd, **kw): return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)

# --- 1) audio per key (piper -> cartoon+EQ -> rhubarb) ---
for k in keys:
    txt=open(f"/tmp/sc_{k}.txt").read().strip()
    sh(["bash","-lc",f'cat /tmp/sc_{k}.txt | python3 -m piper -m {VOICE} --length_scale 1.0 --noise_w 0.8 -f /tmp/{k}_base.wav'])
    # natuerlich: warm + de-harsh + compress + normalize (KEIN pitch)
    eq=("highpass=f=80,equalizer=f=300:t=q:w=1.2:g=2,equalizer=f=4500:t=q:w=2:g=-2.5,"
        "acompressor=ratio=2.5:threshold=-18dB,dynaudnorm=f=200,aresample=24000")
    sh([FF,"-y","-i",f"/tmp/{k}_base.wav","-af",eq,f"/tmp/{k}.wav"])
    sh([RB,"-r","phonetic","-f","json","-o",f"/tmp/{k}_cues.json",f"/tmp/{k}.wav"])
    w=wave.open(f"/tmp/{k}.wav"); print(f"[{k}] cartoon dur={w.getnframes()/w.getframerate():.2f}s")

# --- 2) word timings (whisper once, on base audio, scaled to cartoon timeline) ---
import whisper
print("loading whisper small...")
model=whisper.load_model("small")
for k in keys:
    r=model.transcribe(f"/tmp/{k}_base.wav", language="de", word_timestamps=True, fp16=False)
    words=[]
    for seg in r["segments"]:
        for w in seg.get("words",[]):
            words.append({"w":w["word"].strip(),"start":round(w["start"]/PITCH,3),"end":round(w["end"]/PITCH,3)})
    json.dump(words, open(f"/tmp/{k}_words.json","w"), ensure_ascii=False)
    print(f"[{k}] {len(words)} words")
print("pipeline done")
