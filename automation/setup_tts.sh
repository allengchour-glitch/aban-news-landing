#!/usr/bin/env bash
# LuxeStyle — setup_tts.sh · piper-TTS reproduzierbar herstellen (Container sind ephemer!).
# Installiert piper-tts (falls fehlt) + lädt die deutschen Stimmen. Idempotent, no-op wenn schon da.
# Danach läuft die Sprach-Pipeline: bern_voiceover.py / render_brand_video.py / render_masterpiece.sh.
#
# Nutzung:  bash automation/setup_tts.sh
set -e
VOICE_DIR="${PIPER_VOICE_DIR:-/tmp/brand}"
mkdir -p "$VOICE_DIR"
BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE"

echo "==> 1) piper-tts sicherstellen"
if ! command -v piper >/dev/null 2>&1; then
  pip install --quiet piper-tts
fi
piper --help >/dev/null 2>&1 && echo "   piper OK ($(pip show piper-tts 2>/dev/null | sed -n 's/^Version: //p'))"

# Stimme holen (nur wenn fehlt/zu klein)
fetch() { # $1=zielname  $2=hf-pfad
  local f="$VOICE_DIR/$1"
  if [ -f "$f" ] && [ "$(stat -c%s "$f" 2>/dev/null || echo 0)" -gt 1000000 ]; then echo "   $1 schon da"; return; fi
  echo "   lade $1 …"
  curl -sS -L --max-time 180 -o "$f" "$2"
  curl -sS -L --max-time 60 -o "$f.json" "$2.json"
}

echo "==> 2) Deutsche Stimmen laden (-> $VOICE_DIR)"
fetch "kerstin.onnx"  "$BASE/kerstin/low/de_DE-kerstin-low.onnx"      # weiblich (Standard für Reels)
fetch "thorsten.onnx" "$BASE/thorsten/medium/de_DE-thorsten-medium.onnx"  # männlich, höhere Qualität

echo "==> 3) Test-Synthese"
echo "Hoi zäme, das isch es schöns Teil." | piper -m "$VOICE_DIR/kerstin.onnx" -f /tmp/_tts_test.wav 2>/dev/null \
  && echo "   ✅ TTS funktioniert ($(stat -c%s /tmp/_tts_test.wav) bytes)" \
  || { echo "   ❌ TTS-Test fehlgeschlagen"; exit 1; }
echo "FERTIG. Stimmen: kerstin (w), thorsten (m) in $VOICE_DIR"
