#!/usr/bin/env bash
# render-laptop.sh — rendert Pia Folge 2 auf der Grafikkarte dieses Rechners (nur das stumme Video).
# Aufruf: bash laptop/render-laptop.sh [--dauer 8]   (Ergebnis: ausgabe/folge2-stumm.mp4)
set -euo pipefail
cd "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/.."
[ -d node_modules ] || npm install
mkdir -p ausgabe
node ../motion/render.mjs projekte/pia-folge2/szene.html --webgl gpu --wartezeit 180 --out ausgabe/folge2-stumm.mp4 "$@"
echo "Fertig: $PWD/ausgabe/folge2-stumm.mp4"
