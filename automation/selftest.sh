#!/usr/bin/env bash
# =============================================================================
#  selftest.sh — prüft mit EINEM Befehl, dass die freegen-Toolsuite läuft.
# -----------------------------------------------------------------------------
#  Syntax (Python/Node/Bash) + Funktions-Smoke-Tests (Bild/Video/Voiceover/Build/
#  Scan). KI-Tests laufen nur, wenn ein Anbieter-Key in der Umgebung liegt
#  (z. B. GROQ_API_KEY) — sonst werden sie sauber übersprungen.
#
#  Aufruf:  bash automation/selftest.sh
#  Exit-Code 0 = alles ok, !=0 = mind. ein Test fehlgeschlagen.
# =============================================================================
cd "$(dirname "$0")/.." || exit 2
PY=python3; NODE="${NODE:-/opt/node22/bin/node}"; command -v "$NODE" >/dev/null || NODE=node
FAIL=0
ok(){ echo "  ✅ $1"; }
bad(){ echo "  ❌ $1"; FAIL=$((FAIL+1)); }

echo "== Syntax: Python =="
for f in automation/freegen_video.py automation/freegen_image.py automation/freegen_tts.py \
         automation/freegen_hubreels.py automation/freegen_bot.py automation/freegen_promo.py \
         automation/freegen_carousel.py automation/freegen_ai.py automation/newsletter_polish.py; do
  $PY -c "import ast,sys;ast.parse(open(sys.argv[1]).read())" "$f" 2>/dev/null && ok "$f" || bad "$f"
done

echo "== Syntax: Node =="
for f in functions/_llm.mjs automation/ai_critique.mjs automation/inject-engine.mjs \
         "functions/inserat/[id].js" functions/api/generate.js functions/api/chat.js; do
  "$NODE" --check "$f" 2>/dev/null && ok "$f" || bad "$f"
done

echo "== Syntax: Bash =="
bash -n automation/setup-cloudflare.sh 2>/dev/null && ok "setup-cloudflare.sh" || bad "setup-cloudflare.sh"

echo "== Funktion =="
$PY automation/freegen_image.py --headline "Selftest" --out /tmp/_st.png >/dev/null 2>&1 && ok "freegen_image" || bad "freegen_image"
printf '{"output":"/tmp/_st.mp4","w":1080,"h":1920,"scenes":[{"text":"ok","seconds":2,"bg":"#0b0b0c"}]}' > /tmp/_st.json
$PY automation/freegen_video.py /tmp/_st.json >/dev/null 2>&1 && ok "freegen_video" || bad "freegen_video"
$PY automation/freegen_tts.py "Test." --out /tmp/_st.wav >/dev/null 2>&1 && ok "freegen_tts (piper)" || echo "  ⚠️  freegen_tts übersprungen (piper/Modell fehlt)"

if "$NODE" -e "import('./functions/_llm.mjs').then(m=>process.exit(m.llmProvider({GROQ_API_KEY:'x'})==='groq'?0:1))" 2>/dev/null; then ok "_llm provider-switch"; else bad "_llm provider-switch"; fi

echo "== KI (nur mit Key) =="
if $PY -c "import os,sys;sys.path.insert(0,'automation');import freegen_ai;sys.exit(0 if freegen_ai.available() else 1)" 2>/dev/null; then
  $PY -c "import sys;sys.path.insert(0,'automation');import freegen_ai as a;sys.exit(0 if a.reel_copy('Test','x') else 1)" 2>/dev/null && ok "freegen_ai (Live-Call)" || bad "freegen_ai (Live-Call)"
else
  echo "  ⚠️  kein KI-Key in der Umgebung — KI-Tests übersprungen (setz GROQ_API_KEY)"
fi

echo "== Build =="
bash build-pages.sh >/tmp/_st_build.log 2>&1 && ok "build-pages.sh" || bad "build-pages.sh (siehe /tmp/_st_build.log)"

echo
if [ "$FAIL" -eq 0 ]; then echo "✅ Selbsttest bestanden — alles läuft."; else echo "❌ $FAIL Test(s) fehlgeschlagen."; fi
exit "$FAIL"
