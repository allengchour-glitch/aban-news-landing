# Gratis Lip-Sync-Pipeline (TTS + Rhubarb)

Echter, phonem-genauer Lip-Sync — komplett gratis & lokal. Kein KI-Video-Gen
(kein "character drift"): die Figur bleibt code-getrieben, NUR der Mund folgt der Stimme.

## Bestandteile (von GitHub / HuggingFace, gratis)
1. **piper TTS** (deutsche KI-Stimme): `pip install piper-tts`
   - Voice: HuggingFace `rhasspy/piper-voices` -> `de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx` (+ .onnx.json)
2. **Rhubarb Lip Sync** (GitHub `DanielSWolf/rhubarb-lip-sync`, Release v1.13.0 Linux zip)
   - sprachunabhängiger Modus: `rhubarb -r phonetic`

## Ablauf
```
# 1) Voiceover erzeugen (vo.txt -> vo.wav)
cat vo.txt | python3 -m piper -m de_DE-thorsten-medium.onnx -f vo.wav
# 2) Mund-Formen analysieren (A-H + X, mit Zeitstempeln)
rhubarb -r phonetic -f json -o cues.json vo.wav
# 3) Rendern: Mund pro Frame aus cues.json (siehe scripts/render_s6_lipsync.py)
#    Audio wird per ffmpeg ins MP4 gemuxt.
```

## Mapping Rhubarb-Form -> Mund (openness, breite)
X rest | A zu(MBP) | B leicht | C offen(E) | D weit(A) | E rund(O) | F spitz(U/W/F) | G F/V | H L
Siehe SHAPE-Dict in scripts/render_s6_lipsync.py.

## Binaries NICHT im Repo
rhubarb (87MB) + voice (63MB) sind zu gross -> per obigen Links nachladen.
