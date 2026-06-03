#!/usr/bin/env bash
# LuxeStyle - build_figure.sh : EIN Befehl von Idee -> druckfertige AMS-Figur.
#
# Kette (vollautomatisch):
#   meshy_text.py (Form)  ->  polish.py (manifold, mm, Boden)  ->
#   auto_face.py (Augen/Nase automatisch)  ->  assemble.py (AMS-3MF)  +  Render
#
# Voraussetzung: /tmp/meshy.key (oder MESHY_API_KEY), blender + xvfb, python3.
#
# Aufruf:
#   NAME=mimi PROMPT="a cute cat figurine ..." bash build_figure.sh
# Env:
#   NAME   Ausgabename (Default figur)
#   PROMPT Meshy-Text-Prompt
#   SIZE   laengste Kante mm (Default 50)
#   GLB    optional: fertiges GLB statt Meshy-Generierung (spart Credits)
#   REFINE 0/1 (Default 1)
set -euo pipefail
cd "$(dirname "$0")"

NAME="${NAME:-figur}"
SIZE="${SIZE:-50}"
PROMPT="${PROMPT:-a cute cat figurine lying down in a compact loaf pose, paws tucked under, head up, smooth stylized solid, chunky balanced not overly chubby, small ears, short tail, no separate base}"
WORK="/tmp/build_${NAME}"; mkdir -p "$WORK"
OUTDIR="out/${NAME}"; mkdir -p "$OUTDIR"
PAL='{"weiss":[0.92,0.92,0.92],"schwarz":[0.03,0.03,0.03],"rosa":[0.95,0.5,0.58]}'

echo "== [1/4] Form erzeugen =="
if [ -n "${GLB:-}" ]; then
  RAW="$GLB"; echo "   (nutze vorhandenes GLB: $RAW)"
else
  RAW="$WORK/raw.glb"
  PROMPT="$PROMPT" REFINE="${REFINE:-1}" OUT="$RAW" python3 meshy_text.py
fi
[ -f "$RAW" ] || { echo "FEHLER: kein GLB ($RAW)"; exit 1; }

echo "== [2/4] Polish (manifold, ${SIZE}mm, Boden) =="
python3 polish.py "$RAW" --size "$SIZE" --remesh 0.45 --decimate 0.5 --base
STEM="${RAW%.*}"; POL="${STEM}_polished.stl"
[ -f "$POL" ] || { echo "FEHLER: polish-Output fehlt ($POL)"; exit 1; }

echo "== [3/4] Auto-Augen/Nase + Render =="
IN="$POL" OUTDIR="$WORK/parts" RENDER="$WORK/${NAME}.png" \
  xvfb-run -a blender --background --python auto_face.py

echo "== [4/4] AMS-3MF zusammenbauen =="
IN="$WORK/parts" OUT="$OUTDIR/${NAME}.3mf" GLB="$OUTDIR/${NAME}.glb" \
  PNG="$OUTDIR/${NAME}_3mf.png" PALETTE="$PAL" \
  xvfb-run -a blender --background --python assemble.py

cp -f "$WORK/${NAME}.png" "$OUTDIR/${NAME}_render.png" 2>/dev/null || true
cp -f "$POL" "$OUTDIR/${NAME}_white.stl" 2>/dev/null || true

echo "== FERTIG: $OUTDIR =="
ls -la "$OUTDIR"
