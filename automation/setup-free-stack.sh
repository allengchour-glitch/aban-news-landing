#!/usr/bin/env bash
# LuxeStyle — setup-free-stack.sh
# Installiert/prüft den GRATIS-Vollautomations-Stack reproduzierbar (User 2026-06-17
# „alles gratis Versionen … mit allen Varianten … für richtige Vollautomation").
# Idempotent: alles was schon da ist, wird übersprungen. Läuft in Cloud-Container UND auf dem PC
# (Git-Bash/WSL). Container sind ephemer → dieses Skript ist die Wahrheit, womit jede Session/PC
# den Stack neu aufbaut. KEINE Secrets hier — Keys kommen aus ENV / luxe-secrets.ps1.
set -u
say(){ printf '  %s\n' "$*"; }
have(){ command -v "$1" >/dev/null 2>&1; }
PIP="python3 -m pip install --quiet --upgrade --break-system-packages"

echo "== LuxeStyle Gratis-Stack Setup =="

# 1) Mediа-Tools (Video/Audio/TTS) — meist schon im Image vorhanden
have ffmpeg && say "ffmpeg ok" || say "⚠️ ffmpeg fehlt (apt-get install ffmpeg / brew install ffmpeg)"
have piper  && say "piper ok"  || say "ℹ️ piper fehlt (Voiceover optional) — siehe video-prototypes/HANDOFF.md"

# 2) Downloader/Analyse (gratis): yt-dlp (TikTok-Analyse), gallery-dl (Bild-Trends), Pillow
if have yt-dlp; then say "yt-dlp ok"; else $PIP yt-dlp && say "yt-dlp installiert" || say "⚠️ yt-dlp install fehlgeschlagen"; fi
if have gallery-dl; then say "gallery-dl ok"; else $PIP gallery-dl && say "gallery-dl installiert" || say "ℹ️ gallery-dl optional"; fi
python3 -c "import PIL" 2>/dev/null && say "Pillow ok" || { $PIP Pillow && say "Pillow installiert"; }

# 3) Node-CLIs (gratis): wrangler (Worker-Deploy) — nur prüfen, npx zieht bei Bedarf
have wrangler && say "wrangler ok" || say "ℹ️ wrangler via 'npx wrangler' (kein globales Install nötig)"

# 4) KI-Router Selbsttest (welche GRATIS-Provider sind aktuell scharf?)
NODE="$(command -v node || echo /opt/node22/bin/node)"
echo "-- KI-Provider (Keys aus ENV) --"
"$NODE" "$(dirname "$0")/health-check.mjs" --ai 2>/dev/null || say "ℹ️ health-check: Node/Keys prüfen"

cat <<'NOTE'
-- GRATIS-Keys (alle optional, Reihenfolge = Fallback; in luxe-secrets.ps1 / ENV setzen) --
  GROQ_API_KEY        console.groq.com           (gratis, schnell)        ← empfohlen #1
  GEMINI_API_KEY      aistudio.google.com        (gratis)                 ← empfohlen #2
  OPENROUTER_API_KEY  openrouter.ai (:free)      (gratis-Modelle)
  CF_ACCOUNT_ID + CF_API_TOKEN  Cloudflare Workers AI (gratis-Tier)
  TOGETHER_API_KEY    api.together.xyz           (gratis-Tier, Llama 3.3)
  DEEPSEEK_API_KEY    platform.deepseek.com      (gratis-Tier)
  MISTRAL_API_KEY     console.mistral.ai         (gratis-Tier)
  OPENAI_API_KEY      platform.openai.com        (kostenpflichtig, Fallback)
Mehr Keys = mehr Redundanz. Fällt einer aus, nimmt der Router automatisch den nächsten;
ohne jeden Key läuft Template-Fallback → Automation bricht NIE.
NOTE
echo "== fertig =="
