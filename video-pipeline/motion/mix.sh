#!/usr/bin/env bash
# mix.sh — legt Musik (und optional eine Stimme) unter ein stummes Video aus render.mjs.
# Aufruf:  bash mix.sh <stumm.mp4> <ausgabe.mp4>
# Umgebung (alle optional):
#   MUSIK          Dateiname in automation/music (Vorgabe: auto = dropship/reel-vorlage/musik_waehlen.sh, rotiert, nie zweimal hintereinander gleich)
#   MUSIK_DATEI    statt MUSIK: fertige Musikdatei mit Pfad (z. B. von einem bauen.sh geladen); MUSIK_START ist dann Pflicht
#   MUSIK_START    Startsekunde im Stück (Vorgabe: aus musik-start.txt)
#   MUSIK_LUFS     Lautstärke der Musik (Vorgabe -22, leise)
#   STIMME_DATEI   fertige Sprachaufnahme (wav/mp3); Musik duckt darunter (Sidechain, wie reel_karte.sh). Piper selbst startet dieses Skript nicht:
#                  Sprecher-Text mit Piper wie in dropship/reel-vorlage/reel_karte.sh erzeugen und die Datei hier angeben.
#   STIMME_START   Sekunde, ab der die Stimme einsetzt (Vorgabe 0.6)
#   MUSIK_LOG_SCHREIBEN=1   trägt die Wahl ins Musik-Log ein (sonst bleibt die Rotation unberührt)
set -euo pipefail
fail() { echo "FEHLER: $*" >&2; exit 2; }
[ $# -eq 2 ] || fail "Aufruf: mix.sh <stumm.mp4> <ausgabe.mp4>"
in="$1"; out="$2"; [ -f "$in" ] || fail "Eingabe fehlt: $in"
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"; repo="$(cd "$here/../.." && pwd)"
vr="$repo/dropship/reel-vorlage"
dur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")"; [ -n "$dur" ] || fail "Dauer nicht lesbar"
if [ -n "${MUSIK_DATEI:-}" ]; then
  mp="$MUSIK_DATEI"; musik="$(basename "$mp")"; [ -f "$mp" ] || fail "MUSIK_DATEI fehlt: $mp"
  [ -n "${MUSIK_START:-}" ] || fail "MUSIK_START fehlt (Pflicht mit MUSIK_DATEI)"
else
  musik="${MUSIK:-auto}"; [ "$musik" = auto ] && musik="$("$vr/musik_waehlen.sh")"
  case "$musik" in */*|*..*) fail "MUSIK ist ein Dateiname ohne Pfad";; esac
  mp="$repo/automation/music/$musik"; [ -f "$mp" ] || fail "Musikdatei fehlt: $mp"
fi
ms="${MUSIK_START:-$("$vr/musik_waehlen.sh" --start "$musik")}"; [[ "$ms" =~ ^[0-9]+$ ]] || fail "MUSIK_START muss eine ganze Zahl sein"
mdur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$mp")"
awk -v s="$ms" -v d="$dur" -v m="$mdur" 'BEGIN{exit !(s+d<=m)}' || fail "Stück zu kurz: $musik hat $mdur s, gebraucht werden $ms + $dur s"
lufs="${MUSIK_LUFS:--22}"; [[ "$lufs" =~ ^-[0-9]+$ ]] || fail "MUSIK_LUFS muss eine negative ganze Zahl sein"
fo="$(awk -v d="$dur" 'BEGIN{f=d-2; if(f<0)f=0; printf "%.3f",f}')"
chain="[1:a]atrim=start=$ms:end=$(awk -v s="$ms" -v d="$dur" 'BEGIN{printf "%.3f",s+d}'),asetpts=PTS-STARTPTS,loudnorm=I=$lufs:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.8,afade=t=out:st=$fo:d=2,aresample=48000"
if [ -n "${STIMME_DATEI:-}" ]; then
  [ -f "$STIMME_DATEI" ] || fail "STIMME_DATEI fehlt: $STIMME_DATEI"
  sv="${STIMME_START:-0.6}"; [[ "$sv" =~ ^[0-9]+(\.[0-9]+)?$ ]] || fail "STIMME_START muss eine Zahl sein"
  ms_ms="$(awk -v v="$sv" 'BEGIN{printf "%d",v*1000}')"
  graph="${chain}[m0];[2:a]loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000,adelay=${ms_ms}|${ms_ms},apad,atrim=duration=$dur,asplit=2[v1][v2];[m0][v1]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=500[md];[md][v2]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.9[a]"
  ffmpeg -y -loglevel error -i "$in" -i "$mp" -i "$STIMME_DATEI" -filter_complex "$graph" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$out"
else
  ffmpeg -y -loglevel error -i "$in" -i "$mp" -filter_complex "${chain}[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$out"
fi
if [ "${MUSIK_LOG_SCHREIBEN:-0}" = 1 ]; then
  printf '%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "motion:$(basename "$in" .mp4)" "$musik" >> "${MUSIK_LOG:-$vr/musik-log.txt}"
fi
echo "Fertig: $out (Musik $musik ab ${ms}s, ${lufs} LUFS${STIMME_DATEI:+, mit Stimme})"
