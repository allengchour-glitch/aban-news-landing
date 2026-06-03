#!/usr/bin/env python3
"""100-Clip-Backbone: scripts.json -> fertige, gebrandete Clips.
Ablauf je Eintrag: VO-Text -> pipeline (Stimme+Mund+Wort-Timing) -> make_clip (Hase+Lip-Sync+Captions) -> brand (Intro/Outro).
Aufruf: python3 batch.py [scripts.json] [nur_key1 nur_key2 ...]"""
import json, subprocess, sys, os

cfg=sys.argv[1] if len(sys.argv)>1 and sys.argv[1].endswith(".json") else "/tmp/scripts.json"
only=[a for a in sys.argv[1:] if not a.endswith(".json")]
scripts=json.load(open(cfg))
if only: scripts=[s for s in scripts if s["key"] in only]
keys=[s["key"] for s in scripts]
print(f"Batch: {len(keys)} Clips -> {keys}")

# 1) Texte ablegen
for s in scripts:
    open(f"/tmp/sc_{s['key']}.txt","w").write(s["vo"].strip()+"\n")

# 2) Audio + Mund-Cues + Wort-Timing fuer alle (ein Whisper-Load)
subprocess.run(["python3","/tmp/pipeline.py"]+keys, check=True)

# 3) Pro Clip: rendern + branden
done=[]
for s in scripts:
    subprocess.run(["python3","/tmp/make_clip.py",s["key"]], check=True)
    subprocess.run(["python3","/tmp/brand.py",s["key"],s["title"]], check=True)
    out=f"/tmp/final_{s['key']}.mp4"
    done.append(out); print(f"  ✓ {s['key']}: {out} ({os.path.getsize(out)//1024} KB)")

print("BATCH DONE:"); [print("  "+d) for d in done]
print("\n-> Neuen Clip hinzufuegen = Eintrag in scripts.json + 'python3 batch.py'")
