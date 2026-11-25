#!/usr/bin/env bash
# bauen.sh — baut Pia Folge 3 (3D): Stimme → Zeiten → Render → Mix.
# Aufruf (aus video-pipeline/motion3d):  bash projekte/pia-folge3/bauen.sh [--nur-zeiten] [--probe]
#   --nur-zeiten   nur Stimme und zeiten.js.   --probe   rendert nur die ersten 8 s (Probeclip).
# Umgebung: WEBGL=sw (Standard, Software) oder gpu (auf dem Laptop), STIMME (Standard de-DE-KatjaNeural über edge-tts; Piper: de_DE-ramona-low), EDGE_CA_BUNDLE (bei Proxy), STIMME_PAUSE (0.9), MUSIK … wie in mix.sh.
set -euo pipefail
cd "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/../.."
p=projekte/pia-folge3; m=../motion; mkdir -p ausgabe
export STIMME="${STIMME:-de-DE-KatjaNeural}" STIMME_PAUSE="${STIMME_PAUSE:-1.4}"
if [[ "$STIMME" == de-DE-* ]]; then   # neuronale Stimme (edge-tts); sonst Piper (z. B. STIMME=de_DE-ramona-low)
  python3 $m/stimme_edge.py "$p/stimme.txt" ausgabe/folge3-stimme.wav ausgabe/folge3-zeiten.json
else
  ZEITEN_JSON=ausgabe/folge3-zeiten.json bash $m/stimme.sh "$p/stimme.txt" ausgabe/folge3-stimme.wav
fi
printf '/* erzeugt von bauen.sh aus stimme.txt, nicht von Hand ändern */\nwindow.__ZEITEN = %s;\n' "$(python3 -I -c 'import json,sys;print(json.dumps(json.load(open(sys.argv[1])),ensure_ascii=False))' ausgabe/folge3-zeiten.json)" > "$p/zeiten.js"
[ "${1:-}" = "--nur-zeiten" ] && exit 0
dauer=(); [ "${1:-}" = "--probe" ] && dauer=(--dauer 8)
node $m/render.mjs "$p/szene.html" --webgl "${WEBGL:-sw}" --wartezeit 180 --out ausgabe/folge3-stumm.mp4 "${dauer[@]}"
STIMME_DATEI=ausgabe/folge3-stimme.wav STIMME_START=0 bash $m/mix.sh ausgabe/folge3-stumm.mp4 ausgabe/pia-folge3.mp4
