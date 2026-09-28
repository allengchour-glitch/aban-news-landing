#!/usr/bin/env bash
# einrichten.sh — HyperFrames (heygen-com/hyperframes, Apache-2.0) in /tmp/hfprobe bereitstellen (28.09.2026, Probe).
# Nichts davon liegt im Repo ausser den Kompositionen: npm-Pakete, Schriften, gsap und ein echtes ffprobe kommen frisch.
#   bash automation/hyperframes/einrichten.sh [komposition]   → /tmp/hfprobe/<komposition> bereit zum Rendern
# Rendern:
#   cd /tmp/hfprobe/<komposition> && PATH=/tmp/hfprobe/bin:/opt/node22/bin:$PATH \
#     PRODUCER_HEADLESS_SHELL_PATH=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell \
#     HYPERFRAMES_SKIP_SKILLS=1 npx hyperframes render --output /tmp/hfprobe/out.mp4 --fps 30
# Fallen (gemessen): /usr/local/bin/ffprobe ist ein Python-Ersatz → Tonmischung scheitert («no video stream») → echtes
# ffprobe aus @ffprobe-installer; Telemetrie ist standardmässig AN → wird hier abgeschaltet; gsap/Schriften lokal (kein CDN).
set -euo pipefail
K="${1:-panda_probe}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
export PATH=/opt/node22/bin:$PATH HYPERFRAMES_SKIP_SKILLS=1
mkdir -p /tmp/hfprobe/bin && cd /tmp/hfprobe
[ -f package.json ] || npm init -y >/dev/null
[ -d node_modules/hyperframes ] || npm i -s hyperframes@0.8.86 gsap@3.14.2 @fontsource/playfair-display @fontsource/inter @ffprobe-installer/ffprobe
ln -sf "$(node -e "console.log(require('@ffprobe-installer/ffprobe').path)")" /tmp/hfprobe/bin/ffprobe
npx hyperframes telemetry disable >/dev/null 2>&1 || true
mkdir -p "/tmp/hfprobe/$K/assets"
cp "$REPO/automation/hyperframes/$K/"* "/tmp/hfprobe/$K/"
cp node_modules/gsap/dist/gsap.min.js "/tmp/hfprobe/$K/assets/"
cp node_modules/@fontsource/playfair-display/files/playfair-display-latin-800-normal.woff2 "/tmp/hfprobe/$K/assets/"
cp node_modules/@fontsource/inter/files/inter-latin-{500,800}-normal.woff2 "/tmp/hfprobe/$K/assets/"
echo "bereit: /tmp/hfprobe/$K (Produktbilder assets/p*.jpg + assets/musik.wav selbst ablegen)"
