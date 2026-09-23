#!/bin/bash
# make_reel.sh <src.mp4> <out.mp4> "<Titel Zeile 1>" "<Titel Zeile 2>" "<Preis>" "<Hook>" <musik>   (v2, 22.09.2026)
# Rueckwaerts-kompatibel: 5 Argumente = alte Form <src> <out> "<Titel>" "<Preis>" <musik>.
#
# ⚠️ Die statische ffmpeg-Fassung im Container hat KEIN drawtext (gemessen 22.09.). Text kommt deshalb
# 23.09.: Das scharfe Video sitzt im Band 600-1180 (unter Kopf+Hook, ueber dem Fussfeld 1170-1440): Querformat
# 1000 breit, quadratische/hochformatige Quellen auf 580 px Hoehe eingepasst (Probe: ein quadratisches CJ-Video
# blieb zentriert und ragte ins Fussfeld). TikToks Caption deckt die unteren ~480 px, die Suchleiste die oberen ~200.
# als PNG-Ebenen aus overlay.py (PIL) und wird per `overlay` eingeblendet: eine statische Ebene (Marke,
# Titel auf zwei Zeilen, Preis, Fusszeile) und die HOOK-Ebene fuer die ersten 3,2 s.
set -e
if [ "$#" -ge 7 ]; then SRC="$1"; OUT="$2"; T1="$3"; T2="$4"; PRICE="$5"; HOOK="$6"; MUSIC="$7"
else SRC="$1"; OUT="$2"; T1="$3"; T2=""; PRICE="$4"; HOOK=""; MUSIC="$5"; fi
DUR="${DUR:-11}"
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d /tmp/reelov.XXXXXX)"; trap 'rm -rf "$TMP"' EXIT
python3 "$HERE/overlay.py" "$TMP/static.png" "$TMP/hook.png" "$T1" "$T2" "$PRICE" "$HOOK"
# Musik v2 (23.09.2026): MUSIK_START = gemessener Energie-Einstieg (automation/music/_einstiege.json) statt immer
# Sekunde 0 — bei 11 s kam der Drop sonst oft gar nicht vor. Lautheit per loudnorm auf -14 LUFS (Plattform-Norm)
# statt «volume=0.8» (Stücke lagen zwischen -9 und -15 LUFS).
MUSIK_START="${MUSIK_START:-0}"
# Stimme (23.09.2026, A/B): STIMME=<wav aus voiceover.py> legt die Sprache ab STIMME_START (0.4 s) ueber die Musik.
# Die Musik laeuft als Bett (-20 LUFS) und wird per sidechaincompress unter der Stimme geduckt; die fertige Mischung
# geht ZWEISTUFIG (messen, dann linear) auf -14 LUFS, 48 kHz Stereo. Gemessen 23.09.: die einstufige Fassung unten
# traf in der Probe -14.5 LUFS, schreibt aber 96-kHz-Mono-AAC (loudnorm gibt 192 kHz aus); der Bestand social/reels/
# (56, aeltere Renders, 44.1 kHz) liegt zu 42/56 bei -15.5/-15.6 LUFS. LAUTHEIT_2PASS=1 schickt auch Reels OHNE Stimme durch diese Mischstufe;
# ohne STIMME und ohne LAUTHEIT_2PASS bleibt alles wie bisher. STIMME_STEMS=<dir> schreibt zusaetzlich die Spuren
# musik_roh / musik_geduckt / stimme (vor der Endnormierung) zum Nachmessen des Duckings.
VIDEO_GRAPH="
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2,eq=brightness=-0.06[bg];
[0:v]scale=w='if(gt(ih/iw\,0.58)\,-2\,1000)':h='if(gt(ih/iw\,0.58)\,580\,-2)'[fg];
[bg][fg]overlay=(W-w)/2:600+(580-h)/2[base];
[base][2:v]overlay=0:0[v1];
[v1][3:v]overlay=0:0:enable='lt(t,3.2)'[v]"
if [ -n "${STIMME:-}" ] || [ "${LAUTHEIT_2PASS:-0}" = "1" ]; then
  if [ -n "${STIMME:-}" ] && [ ! -s "$STIMME" ]; then echo "make_reel: STIMME=$STIMME fehlt/leer" >&2; exit 4; fi
  MUSIK_KETTE="aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.3,afade=t=out:st=$((DUR-1)):d=1"
  if [ -n "${STIMME:-}" ]; then
    VMS=$(python3 -c "print(int(float('${STIMME_START:-0.4}')*1000))")
    DUCK="${STIMME_DUCK:-threshold=0.03:ratio=8:attack=15:release=350:knee=3}"
    BASIS="[0:a]$MUSIK_KETTE,loudnorm=I=-20:TP=-3:LRA=11,aresample=48000,apad[m0];
[1:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${VMS}|${VMS},apad[v];
[v]asplit=2[vm][vsc]"
    ffmpeg -y -hide_banner -loglevel error -ss "$MUSIK_START" -i "$MUSIC" -i "$STIMME" \
      -filter_complex "$BASIS;[m0][vsc]sidechaincompress=$DUCK[md];[md][vm]amix=inputs=2:duration=longest:normalize=0[mix]" \
      -map "[mix]" -t "$DUR" -ar 48000 -ac 2 "$TMP/mix.wav"
    if [ -n "${STIMME_STEMS:-}" ]; then
      mkdir -p "$STIMME_STEMS"
      ffmpeg -y -hide_banner -loglevel error -ss "$MUSIK_START" -i "$MUSIC" -i "$STIMME" \
        -filter_complex "$BASIS;[m0]asplit=2[m][mroh];[m][vsc]sidechaincompress=$DUCK[md]" \
        -map "[mroh]" -t "$DUR" "$STIMME_STEMS/musik_roh.wav" -map "[md]" -t "$DUR" "$STIMME_STEMS/musik_geduckt.wav" -map "[vm]" -t "$DUR" "$STIMME_STEMS/stimme.wav"
    fi
  else
    ffmpeg -y -hide_banner -loglevel error -ss "$MUSIK_START" -i "$MUSIC" -af "$MUSIK_KETTE,apad" -t "$DUR" -ar 48000 -ac 2 "$TMP/mix.wav"
  fi
  # Endnormierung zweistufig: messen, dann linear auf -14 LUFS (TP -1.5)
  LN=$(ffmpeg -hide_banner -nostats -i "$TMP/mix.wav" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | python3 -c "
import sys, json; e = sys.stdin.read(); m = json.loads(e[e.rindex('{'):e.rindex('}') + 1])
print(f\"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true\")")
  ffmpeg -y -hide_banner -loglevel error -i "$TMP/mix.wav" -af "$LN,aresample=48000" -ar 48000 -ac 2 "$TMP/mixn.wav"
  ffmpeg -y -hide_banner -loglevel error -stream_loop 6 -i "$SRC" -i "$TMP/mixn.wav" -i "$TMP/static.png" -i "$TMP/hook.png" -t "$DUR" -filter_complex "$VIDEO_GRAPH" \
    -map "[v]" -map 1:a -c:v libx264 -preset medium -crf 24 -pix_fmt yuv420p -c:a aac -b:a 160k -ar 48000 -shortest "$OUT"
  exit 0
fi
ffmpeg -y -hide_banner -loglevel error -stream_loop 6 -i "$SRC" -ss "$MUSIK_START" -i "$MUSIC" -i "$TMP/static.png" -i "$TMP/hook.png" -t "$DUR" -filter_complex "
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2,eq=brightness=-0.06[bg];
[0:v]scale=w='if(gt(ih/iw\,0.58)\,-2\,1000)':h='if(gt(ih/iw\,0.58)\,580\,-2)'[fg];
[bg][fg]overlay=(W-w)/2:600+(580-h)/2[base];
[base][2:v]overlay=0:0[v1];
[v1][3:v]overlay=0:0:enable='lt(t,3.2)'[v]
" -map "[v]" -map 1:a -af "afade=t=in:d=0.3,afade=t=out:st=$((DUR-1)):d=1,loudnorm=I=-14:TP=-1.5:LRA=11" \
  -c:v libx264 -preset medium -crf 24 -pix_fmt yuv420p -c:a aac -b:a 128k -shortest "$OUT"
