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

# MUSIK VIBE-PASSEND + ROTIEREND (User 2026-07-02 "mache alles passend" / "immer das gleiche" nervt):
# Track-Pool nach Produkt-Typ (aus dem Titel erkannt), Auswahl per Titel-Hash (konsistent je Produkt),
# und NIE zweimal hintereinander derselbe Track (Anti-Wiederholung ueber automation/music/.last_track).
MUSICDIR="automation/music/lib"
if [ -z "$VOICE" ] && [ -z "$MUSIC" ]; then
  LT=$(printf '%s' "$TITLE" | tr '[:upper:]' '[:lower:]')
  if echo "$LT" | grep -qE 'schmuck|kette|halskette|ohrring|ring|armband|armreif|armreif|uhr|perle|gold|silber|diamant|moissanit|manschett'; then
    POOL=(dreams-become-real inspired); MOOD="elegant"
  elif echo "$LT" | grep -qE 'beauty|serum|creme|kerze|wellness|gua|roller|seide|diffuser|pflege|maske|augen|bad|duft'; then
    POOL=(smooth-lovin local-forecast-elevator); MOOD="ruhig"
  else
    POOL=(bossa-antigua easy-lemon funkorama carefree); MOOD="lebhaft"
  fi
  H=$(printf '%s' "$TITLE" | cksum | cut -d' ' -f1); IDX=$(( H % ${#POOL[@]} )); PICK="${POOL[$IDX]}"
  LAST=""; [ -f automation/music/.last_track ] && LAST=$(cat automation/music/.last_track 2>/dev/null)
  if [ "$PICK" = "$LAST" ] && [ ${#POOL[@]} -gt 1 ]; then IDX=$(( (IDX+1) % ${#POOL[@]} )); PICK="${POOL[$IDX]}"; fi
  CAND="$MUSICDIR/$PICK.mp3"
  [ -f "$CAND" ] && MUSIC="$CAND" && printf '%s' "$PICK" > automation/music/.last_track 2>/dev/null && echo "auto-Musik ($MOOD): $PICK"
fi

# 1) Schwarze Balken (Veo liefert oft quadratisch/letterbox) automatisch erkennen.
#    Grenzwert 10 (NICHT 24): nur ECHT-schwarze Balken entfernen. 24 hielt dunkle Studio-Szenen
#    (z.B. Sonnenbrille auf dunklem Grund) faelschlich fuer Balken -> extremer Ueberzoom. Lehre 2026-07-02.
CROP=$(ffmpeg -ss 2 -i "$IN" -vframes 8 -vf cropdetect=10:2:0 -f null - 2>&1 | grep -o 'crop=[0-9:]*' | tail -1)
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
