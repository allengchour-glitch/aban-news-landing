#!/usr/bin/env bash
# LuxeStyle — ElevenLabs Music: generiert royalty-free Instrumental-Track (TikTok-Vibe).
# Fallback: automation/reel_music.m4a (falls kein Key / Plan ohne Musik / Fehler).
# Nutzung: gen_music.sh <out.m4a> "<prompt>" <length_ms>
set -uo pipefail
OUT="${1:?out}"; PROMPT="${2:?prompt}"; LEN="${3:-28000}"
KEY="${ELEVENLABS_API_KEY:-}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FALLBACK="$ROOT/automation/reel_music.m4a"
if [ -z "$KEY" ]; then echo "kein ELEVENLABS_API_KEY -> Fallback-Musik."; cp "$FALLBACK" "$OUT"; exit 0; fi
W=$(mktemp -d)
python3 - "$KEY" "$PROMPT" "$LEN" "$W/m.mp3" <<'PY' || true
import sys, json, urllib.request
key, prompt, length, out = sys.argv[1:5]
body = json.dumps({"prompt": prompt, "music_length_ms": int(length), "force_instrumental": True, "model_id": "music_v1"}).encode()
req = urllib.request.Request("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128",
    data=body, headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
try:
    d = urllib.request.urlopen(req, timeout=180).read(); open(out, "wb").write(d); print("ElevenLabs-Music OK:", len(d), "bytes")
except Exception as e:
    print("Music-Fehler:", e)
    try:
        import urllib.error
        if isinstance(e, urllib.error.HTTPError):
            print("Music-Antwort (ElevenLabs):", e.read().decode("utf-8","replace")[:400])
    except Exception as e2:
        print("Music-Body-Fehler:", e2)
PY
if [ -s "$W/m.mp3" ]; then
  ffmpeg -y -hide_banner -loglevel error -i "$W/m.mp3" -c:a aac -b:a 192k "$OUT"
  echo "Custom ElevenLabs-Musik -> $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s)"
else
  echo "Music fehlgeschlagen -> Fallback reel_music.m4a"; cp "$FALLBACK" "$OUT"
fi
rm -rf "$W"
