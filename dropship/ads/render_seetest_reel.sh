#!/bin/bash
# render_seetest_reel.sh — WASSERFEST-Kollektions-Reel nach REEL-PRODUKTION-PLAYBOOK-2026.
# Mehr-Szenen-Montage (kein statischer Pan): Hook in Sek 0, schnelle Cuts (~2.5s/Bild + Zoom-Punch),
# Mundart-Text in Safe-Zone (y≤1500), LOOP (letzte Szene = erste), CC-BY-Musik via music_library.
# ⚠️ EHRLICH: Das ist ein POLIERTER Kollektions-Teaser mit Wasserfest-MESSAGING — der echte „See-Test"
#   (Schmuck UNTER Wasser) braucht echtes Filmmaterial/Luma-I2V-B-Roll, das hier oben eingeschnitten wird.
#
# Nutzung: ./render_seetest_reel.sh <out.mp4> "<Hook>" "<CTA>" <bild1> <bild2> ... (2–6 Bilder/URLs)
#   SILENT=1 = stumm (TikTok, Trend-Sound in-App)   MOOD=elegant|house|lofi (Default elegant)
set -e
OUT="$1"; HOOK="${2:-Wasserfescht? 💧}"; CTA="${3:-luxestyle.ch 🇨🇭}"; shift 3
F=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
RD="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NODE="$(command -v node || echo /opt/node22/bin/node)"
SEG=2.6           # Sekunden pro Szene (schnelle Cuts, neuer Reiz)
WORK=$(mktemp -d); mkdir -p "$(dirname "$OUT")"
imgs=("$@")
# LOOP-Bau: erste Szene am Ende wiederholen (letztes Frame ≈ erstes → nahtloser Rewatch).
imgs+=("${imgs[0]}")
clips=()
i=0
for src in "${imgs[@]}"; do
  t="$WORK/img_$i.jpg"
  case "$src" in http*) curl -s -L -o "$t" "$src";; *) cp "$src" "$t";; esac
  [ -s "$t" ] || { echo "WARN: Bild $i leer, übersprungen"; continue; }
  c="$WORK/clip_$i.mp4"
  # Pro Szene: unscharfer Hintergrund-Fill + scharfes Produkt + Zoom-Punch + warmer Grade + Vignette.
  ffmpeg -y -loop 1 -i "$t" -t "$SEG" -r 30 -filter_complex \
"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=26:4,eq=brightness=-0.12:saturation=1.12[bg];
[0:v]scale=940:-1[fg];
[bg][fg]overlay=(W-w)/2:(H-h)/2-120[c];
[c]zoompan=z='min(zoom+0.0010,1.14)':d=78:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,setsar=1,vignette=PI/5,curves=r='0/0 0.5/0.53 1/1':b='0/0.02 0.5/0.49 1/0.97'[v]" \
    -map "[v]" -c:v libx264 -pix_fmt yuv420p -r 30 "$c" 2>/dev/null
  clips+=("$c"); i=$((i+1))
done
[ ${#clips[@]} -ge 2 ] || { echo "FEHLER: <2 gültige Bilder"; rm -rf "$WORK"; exit 1; }

# Clips mit hartem Schnitt aneinanderhängen (schnelle Cuts = Pattern-Interrupt).
list="$WORK/list.txt"; : > "$list"
for c in "${clips[@]}"; do echo "file '$c'" >> "$list"; done
MONT="$WORK/mont.mp4"
ffmpeg -y -f concat -safe 0 -i "$list" -c copy "$MONT" 2>/dev/null
DUR=$(awk "BEGIN{print ${#clips[@]}*$SEG}")

# Persistenter Hook (Sek 0–2.2, Neugier) + CTA-Endcard + Trust-Zeile, alles in Safe-Zone.
TXT="drawtext=fontfile=$F:text='${HOOK}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=230:box=1:boxcolor=black@0.45:boxborderw=24:enable='lt(t,2.4)':alpha='if(lt(t,0.25),t/0.25,1)',
drawtext=fontfile=$F:text='Edelstahl · anlauffrei · am See ok':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=1300:box=1:boxcolor=black@0.42:boxborderw=16:enable='gt(t,2.4)',
drawtext=fontfile=$F:text='30 Tage Rückgabe · Schweizer Shop':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=1380:box=1:boxcolor=black@0.40:boxborderw=14:enable='gt(t,3.0)',
drawtext=fontfile=$F:text='${CTA}':fontcolor=0x1A1206:fontsize=50:x=(w-text_w)/2:y=1448:box=1:boxcolor=0xC9A24F@0.92:boxborderw=20:enable='gt(t,${DUR%.*}-4)'"

# Musik (CC-BY) außer SILENT.
TRK=""
if [ "${SILENT:-0}" != "1" ]; then
  TRK="$WORK/trk.wav"
  "$NODE" "$RD/automation/music/music_library.mjs" pick --mood "${MOOD:-elegant}" --dur "${DUR%.*}" --out "$TRK" >/dev/null 2>&1 || TRK=""
  [ -s "$TRK" ] || TRK=""
fi
if [ -n "$TRK" ]; then
  ffmpeg -y -i "$MONT" -i "$TRK" -filter_complex \
"[0:v]$TXT[v];[1:a]afade=t=in:st=0:d=0.8,afade=t=out:st=$(awk "BEGIN{print $DUR-1.2}"):d=1.2,volume=0.55,loudnorm=I=-16:TP=-1.5:LRA=11[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k -shortest "$OUT" 2>/dev/null
else
  ffmpeg -y -i "$MONT" -filter_complex "[0:v]$TXT[v]" -map "[v]" \
    -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "$OUT" 2>/dev/null
fi
rm -rf "$WORK"
echo "OK $OUT ($(stat -c%s "$OUT") bytes, ${DUR%.*}s, ${#clips[@]} Szenen)$([ -n "$TRK" ] || echo ' [stumm]')"
