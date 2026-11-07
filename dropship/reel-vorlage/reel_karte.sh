#!/usr/bin/env bash
# Foto-Reel-Vorlage «Karte»: 9,4 s, 1080x1920, ohne Stimme, deutscher Text, feste Markenmusik.
# Gestaltung: Codex (PR #2829, Wasserwellen-Lampe: Produktkarte, zwei Bildfenster, Markenabschluss), hier verallgemeinert und um sanfte
# Bewegung (langsamer Zoom, Text blendet ein) sowie helle/dunkle Variante. Die aktuelle Regel vom 07.11. sperrt Stimme und Musikrotation.
# Das Skript schreibt NUR die lokale MP4 (und mit MUSIK_LOG_SCHREIBEN=1 eine Zeile ins Musik-Log). Keine Queue, kein Upload, kein Git.
#
# Eingabe (Umgebung):
#   FOTO_A FOTO_B FOTO_C   https-Adressen EIGENER Produktfotos (A = Produkt ganz, B/C = Detail/Stimmung). PFLICHT: von Hand gesichtet, ohne
#                          Fremdschrift, Marken, Personen oder private Bilder. Zuschnitt dafür: CROP_B / CROP_C = «x:y:breite:hoehe» im Original.
#   SHA_A SHA_B SHA_C      optional: erwartete SHA-256 der Fotos (Abbruch bei Abweichung)
#   TITEL1 [TITEL2]        Titel, je höchstens 16 Zeichen  ·  TAGLINE ≤ 30  ·  TEXT_MITTE ≤ 18  ·  NAME_KURZ ≤ 36  ·  ENDZEILE ≤ 28 (Vorgabe: LuxeStyle · luxestyle.ch)
#   INVERS=1               dunkle Karten aussen, helle Mitte (sonst creme aussen, dunkle Mitte)
#   MUSIK                  darf nur luxe-premium.wav sein  ·  MUSIK_START Startsekunde (Vorgabe 0)  ·  MUSIK_LUFS Lautstärke (Vorgabe -22)
#   MUSIK_RECHTE_BESTAETIGT=1 ist vor einem echten Render Pflicht und bestätigt die aktuelle Datei-/Rechteprüfung. TROCKEN=1 braucht diese Bestätigung nicht.
#   SPRECHER               historischer Eingang; jeder nicht leere Wert wird abgelehnt. Social-Videos enthalten keine gesprochene Sprache.
#   TROCKEN=1              nur prüfen (Text, Zuschnitt, Musikwahl) und den Filtergraphen drucken; nichts laden, nichts rendern
#   PRODUKT                Name fürs Musik-Log (Vorgabe: NAME_KURZ)   ·   OUT  Zieldatei (Vorgabe ./reel-karte.mp4)   ·   REPO_ROOT
# Text: kein ' : % \ (drawtext), keine Emoji. Schweizer Rechtschreibung. Keine Preise, Versprechen oder Bewertungen im Reel.
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="${REPO_ROOT:-$(git -C "$script_dir" rev-parse --show-toplevel)}"
fail() { echo "FEHLER: $*" >&2; exit 2; }
check_text() { # name wert max pflicht
  local n="$1" v="$2" max="$3" req="$4"
  [ -z "$v" ] && { [ "$req" = 1 ] && fail "$n fehlt"; return 0; }
  [ "${#v}" -le "$max" ] || fail "$n länger als $max Zeichen: «$v»"
  case "$v" in *"'"*|*:*|*%*|*\\*) fail "$n enthält ein verbotenes Zeichen (' : % \\): «$v»" ;; esac
}
TITEL1="${TITEL1:-}"; TITEL2="${TITEL2:-}"; TAGLINE="${TAGLINE:-}"; TEXT_MITTE="${TEXT_MITTE:-}"; NAME_KURZ="${NAME_KURZ:-}"
ENDZEILE="${ENDZEILE:-LuxeStyle · luxestyle.ch}"
check_text TITEL1 "$TITEL1" 16 1; check_text TITEL2 "$TITEL2" 16 0; check_text TAGLINE "$TAGLINE" 30 1
check_text TEXT_MITTE "$TEXT_MITTE" 18 1; check_text NAME_KURZ "$NAME_KURZ" 36 1; check_text ENDZEILE "$ENDZEILE" 28 1
for v in FOTO_A FOTO_B FOTO_C; do case "${!v:-}" in https://*) ;; *) fail "$v fehlt oder ist keine https-Adresse" ;; esac; done
for v in CROP_B CROP_C; do [ -z "${!v:-}" ] || [[ "${!v}" =~ ^[0-9]+:[0-9]+:[0-9]+:[0-9]+$ ]] || fail "$v muss «x:y:breite:hoehe» sein"; done
font_serif=/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf; font_sans=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
PRODUKT="${PRODUKT:-$NAME_KURZ}"; OUT="${OUT:-./reel-karte.mp4}"; MUSIK="${MUSIK:-luxe-premium.wav}"
[ "$MUSIK" = luxe-premium.wav ] || fail "MUSIK muss automation/music/luxe-premium.wav sein"
music_path="$repo_root/automation/music/$MUSIK"; [ -f "$music_path" ] || fail "Musikdatei fehlt: $music_path"
mlufs="${MUSIK_LUFS:--22}"; [[ "$mlufs" =~ ^-[0-9]+$ ]] || fail "MUSIK_LUFS muss eine negative ganze Zahl sein: «$mlufs»"
mstart="${MUSIK_START:-0}"; [[ "$mstart" =~ ^[0-9]+$ ]] || fail "MUSIK_START muss eine ganze Zahl sein: «$mstart»"
mend=$((mstart + 10))
SPRECHER="${SPRECHER:-}"; [ -z "$SPRECHER" ] || fail "SPRECHER ist gesperrt: Social-Videos verwenden nur Text im Bild und Musik"
[ "${TROCKEN:-0}" = 1 ] || [ "${MUSIK_RECHTE_BESTAETIGT:-0}" = 1 ] || fail "Vor dem Render MUSIK_RECHTE_BESTAETIGT=1 nach aktueller Datei-/Rechteprüfung setzen"
if [ "${TROCKEN:-0}" != 1 ]; then
  for cmd in ffmpeg ffprobe curl sha256sum; do command -v "$cmd" >/dev/null || fail "$cmd fehlt"; done
  [ -f "$font_serif" ] && [ -f "$font_sans" ] || fail "DejaVu-Schriften fehlen"
fi
work="$(mktemp -d)"; trap 'rm -rf -- "$work"' EXIT
fetch() { local n="$1" url="$2" sha="${3:-}"; curl --fail --location --silent --show-error --max-time 45 --output "$work/$n" "$url"
  [ -z "$sha" ] || printf '%s  %s\n' "$sha" "$work/$n" | sha256sum --check --status || fail "SHA-256 von $n weicht ab"
  ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$work/$n" >/dev/null || fail "$n ist kein Bild"; }
if [ "${TROCKEN:-0}" != 1 ]; then fetch a.jpg "$FOTO_A" "${SHA_A:-}"; fetch b.jpg "$FOTO_B" "${SHA_B:-}"; fetch c.jpg "$FOTO_C" "${SHA_C:-}"; fi
# Farben: aussen = Karten A und C, mitte = Karte B
if [ "${INVERS:-0}" = 1 ]; then
  BG_O=0x302a25; FG_O=0xf3eee7; SUB_O=0xc8bca9; FR_O=0x796c5d; BG_M=0xf3eee7; FG_M=0x302a25; FR_M=0xc8bca9
else
  BG_O=0xf3eee7; FG_O=0x302a25; SUB_O=0x544a40; FR_O=0xc8bca9; BG_M=0x302a25; FG_M=0xf3eee7; FR_M=0x796c5d
fi
crop() { [ -n "${1:-}" ] || return 0; local x y w h; IFS=: read -r x y w h <<<"$1"; printf 'crop=%d:%d:%d:%d,' "$w" "$h" "$x" "$y"; }  # Eingabe x:y:breite:hoehe, ffmpeg will breite:hoehe:x:y
cb="$(crop "${CROP_B:-}")"; cc="$(crop "${CROP_C:-}")"
fit() { printf 'scale=%d:%d:force_original_aspect_ratio=decrease:flags=lanczos,pad=%d:%d:(ow-iw)/2:(oh-ih)/2:white,setsar=1' "$1" "$2" "$1" "$2"; }
bgfill() { printf 'scale=%d:%d:force_original_aspect_ratio=increase:flags=lanczos,crop=%d:%d,boxblur=60:4,eq=brightness=-0.04,setsar=1' "$1" "$2" "$1" "$2"; }
fg() { printf 'scale=%d:%d:force_original_aspect_ratio=decrease:flags=lanczos,setsar=1' "$1" "$2"; }
fade='alpha='"'"'if(lt(t,0.3),0,min(1,(t-0.3)/0.6))'"'"
if [ -n "$TITEL2" ]; then
  titel="drawtext=fontfile=$font_serif:text='$TITEL1':fontsize=84:fontcolor=$FG_O:x=(w-text_w)/2:y=222:$fade,drawtext=fontfile=$font_serif:text='$TITEL2':fontsize=84:fontcolor=$FG_O:x=(w-text_w)/2:y=330:$fade"
else
  titel="drawtext=fontfile=$font_serif:text='$TITEL1':fontsize=84:fontcolor=$FG_O:x=(w-text_w)/2:y=276:$fade"
fi
zoom_in() { printf "zoompan=z='1+0.0008*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=%dx%d:fps=30" "$1" "$2"; }
zoom_out() { printf "zoompan=z='max(1,1.12-0.0010*on)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=%dx%d:fps=30" "$1" "$2"; }
cat > "$work/g.ffgraph" <<FILTER
[0:v]split=2[pa0][pc0];
[pa0]$(fit 1760 1760),$(zoom_in 880 880),format=yuv420p[pa];
[pc0]$(fit 1520 1520),$(zoom_in 760 760),format=yuv420p[pc];
[1:v]${cb}split=2[wb_bg][wb_fg];[wb_bg]$(bgfill 868 1880)[wb_b];[wb_fg]$(fg 868 1880)[wb_f];[wb_b][wb_f]overlay=(W-w)/2:(H-h)/2,$(zoom_in 434 940),format=yuv420p[wb];
[2:v]${cc}split=2[dt_bg][dt_fg];[dt_bg]$(bgfill 868 1880)[dt_b];[dt_fg]$(fg 868 1880)[dt_f];[dt_b][dt_f]overlay=(W-w)/2:(H-h)/2,$(zoom_out 434 940),format=yuv420p[dt];
color=c=$BG_O:s=1080x1920:r=30:d=3.6,
drawbox=x=48:y=48:w=984:h=1824:color=$FR_O:t=1,
drawbox=x=92:y=568:w=896:h=904:color=white:t=fill,
$titel,
drawtext=fontfile=$font_sans:text='$TAGLINE':fontsize=42:fontcolor=$SUB_O:x=(w-text_w)/2:y=1582:$fade[ba];
[ba][pa]overlay=x=100:y=580:shortest=1,trim=duration=3.6,setpts=PTS-STARTPTS,fps=30,settb=AVTB[sa];
color=c=$BG_M:s=1080x1920:r=30:d=3.6,
drawbox=x=48:y=48:w=984:h=1824:color=$FR_M:t=1,
drawtext=fontfile=$font_serif:text='$TEXT_MITTE':fontsize=84:fontcolor=$FG_M:x=(w-text_w)/2:y=255:$fade,
drawbox=x=72:y=498:w=438:h=944:color=$FR_M:t=1,drawbox=x=570:y=498:w=438:h=944:color=$FR_M:t=1,
drawbox=x=414:y=1530:w=252:h=1:color=$FR_M:t=fill[bb];
[bb][wb]overlay=x=74:y=500:shortest=1[b1];[b1][dt]overlay=x=572:y=500:shortest=1,trim=duration=3.6,setpts=PTS-STARTPTS,fps=30,settb=AVTB[sb];
color=c=$BG_O:s=1080x1920:r=30:d=3.4,
drawbox=x=48:y=48:w=984:h=1824:color=$FR_O:t=1,
drawtext=fontfile=$font_sans:text='$NAME_KURZ':fontsize=42:fontcolor=$SUB_O:x=(w-text_w)/2:y=244:$fade,
drawbox=x=152:y=496:w=776:h=784:color=white:t=fill,
drawbox=x=414:y=1408:w=252:h=1:color=$FR_O:t=fill,
drawtext=fontfile=$font_serif:text='$ENDZEILE':fontsize=56:fontcolor=$FG_O:x=(w-text_w)/2:y=1492:$fade[bc];
[bc][pc]overlay=x=160:y=508:shortest=1,trim=duration=3.4,setpts=PTS-STARTPTS,fps=30,settb=AVTB[sc];
[sa][sb]xfade=transition=fade:duration=0.4:offset=3.2,fps=30,settb=AVTB[ab];
[ab][sc]xfade=transition=fade:duration=0.4:offset=6.4,tpad=stop_mode=clone:stop_duration=0.1,fps=30,trim=duration=9.4,format=yuv420p,setparams=range=limited[v];
FILTER
musik_kette="[3:a]atrim=start=$mstart:end=$mend,asetpts=PTS-STARTPTS,loudnorm=I=$mlufs:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.4,afade=t=out:st=8.4:d=1,aresample=48000"
printf '%s\n' "${musik_kette}[a]" >> "$work/g.ffgraph"
if [ "${TROCKEN:-0}" = 1 ]; then echo "MUSIK=$MUSIK"; echo "START=$mstart"; cat "$work/g.ffgraph"; exit 0; fi   # TROCKEN=1: nur prüfen und den Filtergraphen drucken, nichts laden, nichts rendern
mkdir -p "$(dirname -- "$OUT")"
ffmpeg -hide_banner -loglevel warning -nostdin -y -filter_complex_threads 1 \
  -loop 1 -framerate 30 -t 3.8 -i "$work/a.jpg" -loop 1 -framerate 30 -t 3.8 -i "$work/b.jpg" -loop 1 -framerate 30 -t 3.8 -i "$work/c.jpg" \
  -i "$music_path" -filter_complex_script "$work/g.ffgraph" -map '[v]' -map '[a]' -t 9.4 \
  -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -color_range tv -threads 2 -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart \
  -metadata title="LuxeStyle $NAME_KURZ - Foto-Reel" "$OUT"
if [ "${MUSIK_LOG_SCHREIBEN:-0}" = 1 ]; then
  printf '%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$PRODUKT" "$MUSIK" >> "${MUSIK_LOG:-$script_dir/musik-log.txt}"
fi
echo "Musik: $MUSIK (ab Sekunde $mstart); keine gesprochene Sprache"
ffprobe -v error -show_entries stream=codec_name,width,height,avg_frame_rate,duration:format=duration,size -of default=nw=1 "$OUT"
