#!/usr/bin/env bash
# LuxeStyle — batch_masterpiece.sh : Meisterwerk-Reel fuer jedes Top-Produkt (idempotent, robust).
cd "$(dirname "$0")/../.." || exit 1
HOOKS=("Gseht us wie Tuusige?" "Luxus-Look, kei Luxus-Pris" "Genau das hesch gsuecht?" "Das mues i ha" "Weles nimmsch?" "Gseht teuer us - isch es nid" "Dis noeie Lieblingsteil?" "Fuer di oder zum Verschaenke?")
i=0
# CRLF strip + sauber parsen
tail -n +2 automation/top_products.csv | tr -d '\r' | while IFS=, read -r handle img label rest; do
  [ -z "$handle" ] && continue
  slug=$(echo "$handle" | tr -cd 'a-z0-9-' | cut -c1-28)
  out="reels/mw-${slug}.mp4"
  if [ -f "$out" ]; then echo "skip: $label"; continue; fi
  hook="${HOOKS[$((i % ${#HOOKS[@]}))]}"; i=$((i+1))
  echo "== build: $label  [$hook] -> $out =="
  PRESET=veryfast python3 automation/video/build_masterpiece.py </dev/null "$handle" "$img" "$label" "$hook" "$out" 2>&1 | tail -1
done
echo "BATCH FERTIG. Meisterwerke total: $(ls reels/mw-*.mp4 reels/luxe-meisterwerk-*.mp4 2>/dev/null | wc -l)"
