#!/usr/bin/env bash
# LuxeStyle — Story/Reels-Creatives (1080x1920) aus ECHTEN Produktfotos.
# Pro Produkt: Foto oben (Cover-Crop) + Marken-Panel unten mit Titel, Preis,
# Gold-CTA "JETZT SHOPPEN" und WELCOME10-Badge. Keine Stock-Models.
set -euo pipefail
FF="ffmpeg -y -hide_banner -loglevel error"
SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
[ -f "$SANS" ] || SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
IMG=/tmp/storybuild/img; W=/tmp/storybuild/work; OUT=/tmp/storybuild/out
BG=0xf4f3f1; INK=0x2c2c2c; GOLD=0xb8915a
mkdir -p "$W" "$OUT"

names=( "Sommerkleid ärmellos" "Mini-Kleid mit Rüschen" "Strand-Maxirock" "Boho Resort-Set 2-tlg" )
prices=( "CHF 32.90" "CHF 29.90" "CHF 34.90" "CHF 44.90" )
files=( 1 2 3 4 )

for i in "${!names[@]}"; do
  printf '%s' "${names[$i]}" > "$W/n_$i.txt"
  printf '%s' "${prices[$i]}" > "$W/p_$i.txt"
done
printf '%s' "JETZT SHOPPEN  →" > "$W/cta.txt"
printf '%s' "-10% mit Code  WELCOME10" > "$W/promo.txt"
printf '%s' "LUXESTYLE" > "$W/brand.txt"

# Layout: Foto y=0..1180 (Cover-Crop), Panel y=1180..1920
IH=1180
for i in "${!files[@]}"; do
  f="${files[$i]}"
  fc="[0:v]scale=1080:${IH}:force_original_aspect_ratio=increase,crop=1080:${IH}:(iw-1080)/2:(ih-${IH})/2,setsar=1[p];"
  fc+="[1:v][p]overlay=x=0:y=0[bg];"
  # Marken-Wortmarke oben über dem Foto (dezent)
  fc+="[bg]drawtext=fontfile=${SANS}:textfile=${W}/brand.txt:fontcolor=white:fontsize=44:x=(w-text_w)/2:y=70:alpha=0.95:shadowcolor=black@0.4:shadowx=2:shadowy=2,"
  # Gold-Akzentbalken im Panel
  fc+="drawbox=x=80:y=1262:w=10:h=120:color=${GOLD}:t=fill,"
  # Titel
  fc+="drawtext=fontfile=${SANS}:textfile=${W}/n_${i}.txt:fontcolor=${INK}:fontsize=64:x=120:y=1268,"
  # Preis
  fc+="drawtext=fontfile=${SANS}:textfile=${W}/p_${i}.txt:fontcolor=${GOLD}:fontsize=92:x=120:y=1360,"
  # CTA-Pille (Gold)
  fc+="drawbox=x=80:y=1560:w=920:h=132:color=${GOLD}:t=fill,"
  fc+="drawtext=fontfile=${SANS}:textfile=${W}/cta.txt:fontcolor=${INK}:fontsize=60:x=(w-text_w)/2:y=1560+(132-60)/2,"
  # Promo-Badge
  fc+="drawtext=fontfile=${SANS}:textfile=${W}/promo.txt:expansion=none:fontcolor=${INK}:fontsize=42:x=120:y=1748:alpha=0.85[v]"
  $FF -i "$IMG/$f.jpg" -f lavfi -i "color=c=${BG}:s=1080x1920" \
      -filter_complex "$fc" -map "[v]" -frames:v 1 "$OUT/luxestyle_story_${f}.png"
  echo ">> $OUT/luxestyle_story_${f}.png"
done
echo ">> DONE ($OUT)"
