#!/usr/bin/env bash
# finish_reel.sh — STANDARD-FINISH fuer ALLE Produkt-Videos (User 2026-07-01 "jetzt alle neue videos so").
# Aurora-Rezeptur: Rohclip -> entbalken (cropdetect) -> 1080x1920 fuellen -> TEXT OBEN im freien Bereich
# (nie ueber dem Produkt) -> Stimme ODER Musik drunter -> web-fertig. Laeuft in der Cloud (Linux, DejaVu-Font).
#
# Nutzung: finish_reel.sh <in.mp4> "<Titel>" <out.mp4> [voice.mp3] [music.mp3]
#   Ohne voice/music: Original-Ton bleibt. Mit voice: Video wird auf VO-Laenge geloopt + VO drunter (loudnorm).
set -uo pipefail
IN="${1:?in.mp4 fehlt}"; TITLE="${2:-LuxeStyle}"; OUT="${3:?out.mp4 fehlt}"; VOICE="${4:-}"; MUSIC="${5:-}"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
CTA="Mit Code WELCOME10 sparen"
[ -f "$IN" ] || { echo "IN fehlt: $IN"; exit 1; }

# MUSIK-VARIATION (User 2026-07-01 "musik nervt, jedes mal andere"): ohne explizite Musik/Stimme automatisch
# einen eleganten CC-BY-Track waehlen - per Titel-Hash, damit jedes Produkt einen ANDEREN, aber konsistenten Track hat.
MUSICDIR="automation/music/lib"
if [ -z "$VOICE" ] && [ -z "$MUSIC" ]; then
  TRACKS=(dreams-become-real inspired smooth-lovin bossa-antigua local-forecast-elevator carefree easy-lemon funkorama)
  H=$(echo -n "$TITLE" | cksum | cut -d' ' -f1); IDX=$(( H % ${#TRACKS[@]} ))
  CAND="$MUSICDIR/${TRACKS[$IDX]}.mp3"
  [ -f "$CAND" ] && MUSIC="$CAND" && echo "auto-Musik: ${TRACKS[$IDX]}"
fi

# 1) Schwarze Balken (Veo liefert oft quadratisch/letterbox) automatisch erkennen
CROP=$(ffmpeg -ss 2 -i "$IN" -vframes 8 -vf cropdetect=24:2:0 -f null - 2>&1 | grep -o 'crop=[0-9:]*' | tail -1)
CROPF=""; [ -n "$CROP" ] && CROPF="${CROP},"

# 2) Text OBEN (y=250/330) im freien Bereich — Produkt sitzt meist mittig/unten, drum ist oben frei.
VF="${CROPF}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,\
drawtext=fontfile=${FONT}:text='${TITLE//\'/}':fontcolor=white:fontsize=50:borderw=3:bordercolor=black@0.75:x=(w-text_w)/2:y=250,\
drawtext=fontfile=${FONT}:text='${CTA}':fontcolor=0xFFE08A:fontsize=44:borderw=3:bordercolor=black@0.8:x=(w-text_w)/2:y=330"

if [ -n "$VOICE" ] && [ -f "$VOICE" ]; then
  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VOICE" 2>/dev/null); [ -z "$DUR" ] && DUR=15
  ffmpeg -y -stream_loop -1 -i "$IN" -i "$VOICE" -t "$DUR" -vf "$VF" -map 0:v:0 -map 1:a:0 \
    -af "loudnorm=I=-15:TP=-1.5" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k "$OUT" -loglevel error
elif [ -n "$MUSIC" ] && [ -f "$MUSIC" ]; then
  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN" 2>/dev/null); [ -z "$DUR" ] && DUR=8
  ffmpeg -y -i "$IN" -stream_loop -1 -i "$MUSIC" -t "$DUR" -vf "$VF" -map 0:v:0 -map 1:a:0 \
    -af "volume=0.7,afade=t=out:st=$(awk "BEGIN{print $DUR-1.5}"):d=1.5" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k "$OUT" -loglevel error
else
  ffmpeg -y -i "$IN" -vf "$VF" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k "$OUT" -loglevel error
fi
echo "✅ finish_reel: $OUT ($(du -h "$OUT" 2>/dev/null | cut -f1))"
