#!/usr/bin/env bash
# CJ-Video (oder KI-Clip) zu einem TikTok-Video veredeln: Ausschnitt wählen, auf 9:16 zuschneiden, auf 1080x1920 bringen, Hook-Text einblenden,
# Endkarte, rotierende Mixkit-Musik (Originalton wird weggelassen). Schreibt NUR die lokale MP4. Keine Queue, kein Upload, kein Git.
#
# Eingabe (Umgebung):
#   IN=<Datei>        Quellvideo (PFLICHT, von Hand gesichtet: keine Fremdschrift, keine Gesichter, keine Marken)
#   OUT=<Datei>       Ziel (Vorgabe ./tiktok-video.mp4)
#   SS=<Sekunden>     Startpunkt im Quellvideo (Vorgabe 0)   ·   DAUER=<Sekunden> Länge des Ausschnitts (Vorgabe 12, höchstens 15)
#   CROPX=<0..1>      bei breiteren Quellen: Lage des 9:16-Ausschnitts (0 = links, 0.5 = Mitte, 1 = rechts; Vorgabe 0.5)
#   HOOK1 [HOOK2]     Hook-Text, je höchstens 16 Zeichen (erscheint 0,2 bis 3,0 s)   ·   ENDZEILE ≤ 28 Zeichen (Vorgabe: LuxeStyle · luxestyle.ch), letzte 2,2 s
#   MUSIK / MUSIK_START / MUSIK_LUFS   wie reel_karte.sh (Vorgabe: rotierend über musik_waehlen.sh, -22 LUFS)   ·   PRODUKT fürs Musik-Log
#   TROCKEN=1         nur prüfen und den Filtergraphen drucken
# Text: kein ' : % \ " (drawtext), keine Emoji. Keine Preise, Rabatte, Lieferversprechen im Video.
# Qualität: CJ-Quellen sind meist 540x960; das Hochziehen auf 1080x1920 wirkt weich (Lanczos + leichtes Nachschärfen). Das ist eine Grenze der Quelle, nicht des Skripts.
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="${REPO_ROOT:-$(git -C "$script_dir" rev-parse --show-toplevel)}"
reel_dir="$repo_root/dropship/reel-vorlage"
fail() { echo "FEHLER: $*" >&2; exit 2; }
check_text() { # name wert max pflicht
  local n="$1" v="$2" max="$3" req="$4"
  [ -z "$v" ] && { [ "$req" = 1 ] && fail "$n fehlt"; return 0; }
  [ "${#v}" -le "$max" ] || fail "$n länger als $max Zeichen: «$v»"
  case "$v" in *"'"*|*:*|*%*|*\\*|*'"'*) fail "$n enthält ein verbotenes Zeichen (' : % \\ \"): «$v»" ;; esac
}
IN="${IN:-}"; OUT="${OUT:-./tiktok-video.mp4}"; HOOK1="${HOOK1:-}"; HOOK2="${HOOK2:-}"; ENDZEILE="${ENDZEILE:-LuxeStyle · luxestyle.ch}"
SS="${SS:-0}"; DAUER="${DAUER:-12}"; CROPX="${CROPX:-0.5}"
[ -n "$IN" ] && [ -f "$IN" ] || fail "IN fehlt oder ist keine Datei"
check_text HOOK1 "$HOOK1" 16 1; check_text HOOK2 "$HOOK2" 16 0; check_text ENDZEILE "$ENDZEILE" 28 1
[[ "$SS" =~ ^[0-9]+(\.[0-9]+)?$ ]] || fail "SS muss eine Zahl sein: «$SS»"
[[ "$DAUER" =~ ^[0-9]+(\.[0-9]+)?$ ]] || fail "DAUER muss eine Zahl sein: «$DAUER»"
awk -v d="$DAUER" 'BEGIN{exit !(d>=4 && d<=15)}' || fail "DAUER muss zwischen 4 und 15 Sekunden liegen: «$DAUER»"
awk -v c="$CROPX" 'BEGIN{exit !(c>=0 && c<=1)}' || fail "CROPX muss zwischen 0 und 1 liegen: «$CROPX»"
for cmd in ffmpeg ffprobe awk; do command -v "$cmd" >/dev/null || fail "$cmd fehlt"; done
font_bold=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf; font_serif=/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf
[ -f "$font_bold" ] && [ -f "$font_serif" ] || fail "DejaVu-Schriften fehlen"

IFS=, read -r w h < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$IN" | head -1)
[[ "${w:-}" =~ ^[0-9]+$ && "${h:-}" =~ ^[0-9]+$ ]] || fail "Quelle nicht lesbar (Breite/Höhe)"
dq="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN" | head -1)"; dq="${dq:-0}"
awk -v s="$SS" -v d="$DAUER" -v q="$dq" 'BEGIN{exit !(q+0>0 && s+d<=q+0.05)}' || fail "Ausschnitt (SS $SS + DAUER $DAUER) länger als die Quelle ($dq s)"
# 9:16-Ausschnitt: breiter als 9:16 → Breite kappen, schmaler → Höhe kappen (gerade Zahlen)
if [ $((w * 16)) -gt $((h * 9)) ]; then cw=$(( (h * 9 / 16) / 2 * 2 )); ch=$h; else cw=$w; ch=$(( (w * 16 / 9) / 2 * 2 )); fi
cx="$(awk -v w="$w" -v cw="$cw" -v f="$CROPX" 'BEGIN{printf "%d", int((w-cw)*f/2)*2}')"
cy="$(awk -v h="$h" -v ch="$ch" 'BEGIN{printf "%d", int((h-ch)/2/2)*2}')"

MUSIK="${MUSIK:-auto}"; if [ "$MUSIK" = auto ]; then MUSIK="$("$reel_dir/musik_waehlen.sh")"; fi
case "$MUSIK" in */*|"") fail "MUSIK muss ein Dateiname sein" ;; esac
music_path="$repo_root/automation/music/$MUSIK"; [ -f "$music_path" ] || fail "Musikdatei fehlt: $music_path"
mlufs="${MUSIK_LUFS:--22}"; [[ "$mlufs" =~ ^-[0-9]+$ ]] || fail "MUSIK_LUFS muss eine negative ganze Zahl sein: «$mlufs»"
mstart="${MUSIK_START:-$("$reel_dir/musik_waehlen.sh" --start "$MUSIK")}"; [[ "$mstart" =~ ^[0-9]+$ ]] || fail "MUSIK_START muss eine ganze Zahl sein: «$mstart»"
mend="$(awk -v s="$mstart" -v d="$DAUER" 'BEGIN{printf "%d", s+d+1}')"
PRODUKT="${PRODUKT:-$(basename -- "$IN")}"
fo="$(awk -v d="$DAUER" 'BEGIN{printf "%.2f", d-0.5}')"          # Beginn des Ausblendens
endst="$(awk -v d="$DAUER" 'BEGIN{printf "%.2f", d-2.2}')"       # Beginn der Endkarte
hook_alpha="if(lt(t,0.5),(t-0.2)/0.3,if(gt(t,2.7),(3.0-t)/0.3,1))"
end_alpha="if(lt(t,$endst+0.3),(t-$endst)/0.3,1)"
dt_h() { printf "drawtext=fontfile=%s:text='%s':fontsize=84:fontcolor=white:borderw=3:bordercolor=black@0.55:box=1:boxcolor=black@0.30:boxborderw=26:x=(w-text_w)/2:y=%d:enable='between(t,0.2,3.0)':alpha='%s'" "$font_bold" "$1" "$2" "$hook_alpha"; }
hook_chain="$(dt_h "$HOOK1" 330)"; [ -z "$HOOK2" ] || hook_chain="$hook_chain,$(dt_h "$HOOK2" 450)"
cat > /tmp/veredeln.$$.ffgraph <<FILTER
[0:v]trim=start=$SS:duration=$DAUER,setpts=PTS-STARTPTS,fps=30,crop=$cw:$ch:$cx:$cy,scale=1080:1920:flags=lanczos,unsharp=5:5:0.7:5:5:0.0,setsar=1,
$hook_chain,
drawtext=fontfile=$font_serif:text='$ENDZEILE':fontsize=58:fontcolor=white:borderw=2:bordercolor=black@0.55:box=1:boxcolor=black@0.35:boxborderw=24:x=(w-text_w)/2:y=1300:enable='gte(t,$endst)':alpha='$end_alpha',
fade=t=in:st=0:d=0.3,fade=t=out:st=$fo:d=0.5,format=yuv420p[v];
[1:a]atrim=start=$mstart:end=$mend,asetpts=PTS-STARTPTS,loudnorm=I=$mlufs:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.4,afade=t=out:st=$fo:d=0.5,aresample=48000,atrim=duration=$DAUER[a]
FILTER
trap 'rm -f -- /tmp/veredeln.$$.ffgraph' EXIT
if [ "${TROCKEN:-0}" = 1 ]; then echo "QUELLE=${w}x${h} AUSSCHNITT=${cw}x${ch}+${cx}+${cy} MUSIK=$MUSIK START=$mstart"; cat /tmp/veredeln.$$.ffgraph; exit 0; fi
mkdir -p "$(dirname -- "$OUT")"
ffmpeg -hide_banner -loglevel warning -nostdin -y -i "$IN" -i "$music_path" -filter_complex_script /tmp/veredeln.$$.ffgraph -map '[v]' -map '[a]' -t "$DAUER" \
  -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -threads 2 -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart \
  -metadata title="LuxeStyle $PRODUKT - TikTok" "$OUT"
if [ "${MUSIK_LOG_SCHREIBEN:-0}" = 1 ]; then printf '%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$PRODUKT" "$MUSIK" >> "${MUSIK_LOG:-$reel_dir/musik-log.txt}"; fi
echo "Musik: $MUSIK (ab Sekunde $mstart), Quelle ${w}x${h}, Ausschnitt ${cw}x${ch}+${cx}+${cy}"
ffprobe -v error -show_entries stream=codec_name,width,height,avg_frame_rate:format=duration,size -of default=nw=1 "$OUT"
