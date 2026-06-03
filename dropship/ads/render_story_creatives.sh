#!/usr/bin/env bash
# LuxeStyle — Story/Reels-Creatives (1080x1920) aus ECHTEN Produktfotos.
# Pro Produkt: Foto oben (Cover-Crop) + Marken-Panel unten mit Titel, Preis,
# Gold-CTA "JETZT SHOPPEN" und WELCOME10-Badge. Keine Stock-Models.
#
# Nutzung:  render_story_creatives.sh <manifest.tsv> <img_dir> <out_dir>
#   manifest.tsv  je Zeile:  <bilddatei><TAB><Titel><TAB><Preis>
#   z.B.          1.jpg	Sommerkleid ärmellos	CHF 32.90
# Ohne Argumente: Demo-Batch aus /tmp/storybuild.
set -euo pipefail
FF="ffmpeg -nostdin -y -hide_banner -loglevel error"
SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
[ -f "$SANS" ] || SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
BG=0xf4f3f1; INK=0x2c2c2c; GOLD=0xb8915a

MANIFEST="${1:-/tmp/storybuild/manifest.tsv}"
IMG="${2:-/tmp/storybuild/img}"
OUT="${3:-/tmp/storybuild/out}"
W="$(mktemp -d)"
mkdir -p "$OUT"

printf '%s' "${CTA_TEXT:-JETZT SHOPPEN  →}" > "$W/cta.txt"
printf '%s' "${PROMO_TEXT:--10% mit Code  WELCOME10}" > "$W/promo.txt"
printf '%s' "LUXESTYLE" > "$W/brand.txt"

IH=1180   # Foto-Höhe oben; Panel = Rest bis 1920
i=0
while IFS=$'\t' read -r file name price; do
  [ -z "${file:-}" ] && continue
  printf '%s' "$name"  > "$W/n_$i.txt"
  printf '%s' "$price" > "$W/p_$i.txt"
  base="${file%.*}"
  fc="[0:v]scale=1080:${IH}:force_original_aspect_ratio=increase,crop=1080:${IH}:(iw-1080)/2:(ih-${IH})/2,setsar=1[p];"
  fc+="[1:v][p]overlay=x=0:y=0[bg];"
  fc+="[bg]drawtext=fontfile=${SANS}:textfile=${W}/brand.txt:fontcolor=white:fontsize=44:x=(w-text_w)/2:y=70:alpha=0.95:shadowcolor=black@0.4:shadowx=2:shadowy=2,"
  fc+="drawbox=x=80:y=1262:w=10:h=120:color=${GOLD}:t=fill,"
  fc+="drawtext=fontfile=${SANS}:textfile=${W}/n_${i}.txt:fontcolor=${INK}:fontsize=64:x=120:y=1268,"
  fc+="drawtext=fontfile=${SANS}:textfile=${W}/p_${i}.txt:fontcolor=${GOLD}:fontsize=92:x=120:y=1360,"
  fc+="drawbox=x=80:y=1560:w=920:h=132:color=${GOLD}:t=fill,"
  fc+="drawtext=fontfile=${SANS}:textfile=${W}/cta.txt:fontcolor=${INK}:fontsize=60:x=(w-text_w)/2:y=1560+(132-60)/2,"
  fc+="drawtext=fontfile=${SANS}:textfile=${W}/promo.txt:expansion=none:fontcolor=${INK}:fontsize=42:x=120:y=1748:alpha=0.85[v]"
  $FF -i "$IMG/$file" -f lavfi -i "color=c=${BG}:s=1080x1920" \
      -filter_complex "$fc" -map "[v]" -frames:v 1 "$OUT/luxestyle_story_${base}.png"
  echo ">> $OUT/luxestyle_story_${base}.png"
  i=$((i+1))
done < "$MANIFEST"
rm -rf "$W"
echo ">> DONE ($OUT)"
