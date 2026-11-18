#!/usr/bin/env bash
# render-laptop.sh — rendert Pia Folge 3 auf der Grafikkarte dieses Rechners (nur das stumme Video).
# Aufruf: bash laptop/render-laptop.sh [--dauer 8]   (Ergebnis: ausgabe/folge3-stumm.mp4)
set -euo pipefail
cd "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/.."
[ -d node_modules ] || npm install
mkdir -p ausgabe
node ../motion/render.mjs projekte/pia-folge3/szene.html --webgl gpu --wartezeit 180 --out ausgabe/folge3-stumm.mp4 "$@"
echo "Fertig: $PWD/ausgabe/folge3-stumm.mp4"
