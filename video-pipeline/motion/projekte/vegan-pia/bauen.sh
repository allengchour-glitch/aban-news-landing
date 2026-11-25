#!/usr/bin/env bash
# bauen.sh — baut das Pia-Short vollständig: Stimme → Zeiten → Render → Mix.
# Aufruf (aus video-pipeline/motion):  bash projekte/vegan-pia/bauen.sh [--nur-zeiten]
#   --nur-zeiten   erzeugt nur Stimme und zeiten.js (zum Vorschauen); sonst auch Render und Mix (ca. 4 Min Render).
# Umgebung: STIMME, STIMME_TEMPO, MUSIK … wie in stimme.sh / mix.sh. Ausgaben in ausgabe/ (git-ignoriert).
set -euo pipefail
cd "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/../.."
p=projekte/vegan-pia; mkdir -p ausgabe
ZEITEN_JSON=ausgabe/vegan-zeiten.json bash stimme.sh "$p/stimme.txt" ausgabe/vegan-stimme.wav
printf '/* erzeugt von bauen.sh aus stimme.txt (Szenenzeiten = Länge der Sprecherzeilen), nicht von Hand ändern */\nwindow.__ZEITEN = %s;\n' "$(python3 -I -c 'import json,sys;print(json.dumps(json.load(open(sys.argv[1])),ensure_ascii=False))' ausgabe/vegan-zeiten.json)" > "$p/zeiten.js"
echo "Zeiten: $p/zeiten.js"
[ "${1:-}" = "--nur-zeiten" ] && exit 0
node render.mjs "$p/szenen.html" --out ausgabe/vegan-stumm.mp4
STIMME_DATEI=ausgabe/vegan-stimme.wav STIMME_START=0 bash mix.sh ausgabe/vegan-stumm.mp4 ausgabe/vegan-pia.mp4
