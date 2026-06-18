#!/usr/bin/env bash
# LuxeStyle — batch_masterpiece.sh : Meisterwerk-Reel fuer jedes Top-Produkt (idempotent).
# Liest automation/top_products.csv (name,image_url,label), rotiert Mundart-Gewinner-Hooks,
# baut nur was noch fehlt -> reels/luxe-meisterwerk-<handle>.mp4
cd "$(dirname "$0")/../.." || exit 1
HOOKS=("Genau das hesch gsuecht?" "Lueg mau das aa" "Das mues i ha" "Weles nimmsch?" "Dis noeie Lieblingsteil?" "Fuer di oder zum Verschaenke?")
i=0; built=0
tail -n +2 automation/top_products.csv | while IFS=, read -r handle img label rest; do
  [ -z "$handle" ] && continue
  out="reels/luxe-meisterwerk-${handle:0:24}.mp4"
  if [ -f "$out" ]; then echo "skip (da): $label"; continue; fi
  hook="${HOOKS[$((i % ${#HOOKS[@]}))]}"; i=$((i+1))
  echo "== build $((i)): $label  [$hook] =="
  python3 automation/video/build_masterpiece.py "$handle" "$img" "$label" "$hook" "$out" 2>&1 | tail -1
done
echo "BATCH FERTIG."
ls -1 reels/luxe-meisterwerk-*.mp4 2>/dev/null | wc -l | xargs echo "Meisterwerke total:"
