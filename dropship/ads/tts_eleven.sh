#!/usr/bin/env bash
# LuxeStyle — ElevenLabs Voiceover (eleven_multilingual_v2) mit robustem Google-TTS-Fallback.
# Nutzung: tts_eleven.sh <lang(de|en)> <out.wav> "<text>"
set -uo pipefail   # KEIN -e: ElevenLabs-Fehler -> Fallback, kein Abbruch
LANG_="${1:?lang}"; OUT="${2:?out}"; TEXT="${3:?text}"
KEY="${ELEVENLABS_API_KEY:-}"
VOICE="${ELEVENLABS_VOICE_ID:-EXAVITQu4vr4xnSDxMaL}"
HERE="$(cd "$(dirname "$0")" && pwd)"

fallback(){ echo "-> Google-TTS-Fallback ($LANG_)."; bash "$HERE/tts.sh" "$LANG_" "$OUT" "$TEXT"; }

if [ -z "$KEY" ]; then echo "Kein ELEVENLABS_API_KEY."; fallback; exit $?; fi

# Voice-Settings env-überschreibbar (Defaults = bisheriges Verhalten). Für eine ruhigere,
# weniger „wobbelige" Stimme z.B. ELEVENLABS_STABILITY=0.62 ELEVENLABS_STYLE=0.15 setzen.
STAB="${ELEVENLABS_STABILITY:-0.55}"; SIM="${ELEVENLABS_SIMILARITY:-0.8}"; STYLE="${ELEVENLABS_STYLE:-0.3}"
W=$(mktemp -d)
python3 - "$KEY" "$VOICE" "$TEXT" "$W/vo.mp3" "$STAB" "$SIM" "$STYLE" <<'PY' || true
import sys, json, urllib.request
key, voice, text, out, stab, sim, style = sys.argv[1:8]
body = json.dumps({"text": text, "model_id": "eleven_multilingual_v2",
    "voice_settings": {"stability":float(stab),"similarity_boost":float(sim),"style":float(style),"use_speaker_boost":True}}).encode()
req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128",
    data=body, headers={"xi-api-key": key, "Content-Type":"application/json", "Accept":"audio/mpeg"})
try:
    d = urllib.request.urlopen(req, timeout=60).read(); open(out,"wb").write(d); print("ElevenLabs OK:", len(d), "bytes")
except Exception as e:
    print("ElevenLabs-Fehler:", e)
PY

if [ ! -s "$W/vo.mp3" ]; then rm -rf "$W"; fallback; exit $?; fi
ffmpeg -y -hide_banner -loglevel error -i "$W/vo.mp3" -ar 44100 -ac 2 -af "loudnorm=I=-15:TP=-1.5,apad=pad_dur=0.2" "$OUT"
echo "ElevenLabs -> $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s)"
rm -rf "$W"
