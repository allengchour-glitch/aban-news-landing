#!/usr/bin/env bash
# stimme.sh — erzeugt aus einer Zeit-Text-Datei eine deutsche Sprachspur (Piper, lokal und gratis).
# Aufruf:  bash stimme.sh <stimme.txt> <ausgabe.wav> [gesamtdauer_s]
# stimme.txt: je Zeile «Startsekunde<TAB>Text» (Hochdeutsch, kurze Sätze, so schreiben wie gesprochen).
# Umgebung: STIMME_TEMPO (Vorgabe 1.2 = etwas langsamer als normal; 1.0 normal, 1.4 sehr ruhig), STIMME (Vorgabe de_DE-thorsten-high; Alternative de_DE-ramona-low), PIPER_MODELLE (Vorgabe ~/.local/share/luxe-stimmen, wird bei Bedarf geladen).
# Prüft, dass jede Zeile vor dem Start der nächsten fertig gesprochen ist (sonst Exit 1 mit Angabe der Zeile).
# Danach: STIMME_DATEI=<ausgabe.wav> STIMME_START=0 bash mix.sh <stumm.mp4> <ausgabe.mp4>
set -euo pipefail
fail() { echo "FEHLER: $*" >&2; exit 2; }
[ $# -ge 2 ] || fail "Aufruf: stimme.sh <stimme.txt> <ausgabe.wav> [gesamtdauer_s]"
txt="$1"; out="$2"; total="${3:-}"; [ -f "$txt" ] || fail "Datei fehlt: $txt"
command -v piper >/dev/null || fail "piper fehlt (pip install piper-tts)"
STIMME="${STIMME:-de_DE-thorsten-high}"; [[ "$STIMME" =~ ^de_DE-[a-z]+-[a-z_]+$ ]] || fail "STIMME muss de_DE-<name>-<qualität> heissen"
tempo="${STIMME_TEMPO:-1.2}"; [[ "$tempo" =~ ^[0-9](\.[0-9]+)?$ ]] && awk -v t="$tempo" 'BEGIN{exit !(t>=0.6 && t<=2)}' || fail "STIMME_TEMPO muss eine Zahl von 0.6 bis 2 sein"
mdir="${PIPER_MODELLE:-$HOME/.local/share/luxe-stimmen}"; mkdir -p "$mdir"; sp="${STIMME#de_DE-}"; sp="${sp%-*}"; q="${STIMME##*-}"
for e in onnx onnx.json; do [ -s "$mdir/$STIMME.$e" ] || curl --fail --location --silent --show-error --max-time 300 --output "$mdir/$STIMME.$e" "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/$sp/$q/$STIMME.$e" || fail "Stimme $STIMME.$e nicht ladbar"; done
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
starts=(); durs=(); n=0
while IFS=$'\t' read -r start text; do
  [ -z "${start:-}" ] && continue
  [[ "$start" =~ ^[0-9]+(\.[0-9]+)?$ ]] || fail "Zeile $((n+1)): Startsekunde ungültig: «$start»"
  [ -n "${text:-}" ] || fail "Zeile $((n+1)): Text fehlt"
  [ "${#text}" -le 160 ] || fail "Zeile $((n+1)): Text länger als 160 Zeichen"
  n=$((n+1))
  printf '%s' "$text" | piper -m "$mdir/$STIMME.onnx" --length-scale "$tempo" -f "$work/z$n.wav" >/dev/null 2>&1 || fail "Piper konnte Zeile $n nicht sprechen"
  d="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$work/z$n.wav")"
  starts+=("$start"); durs+=("$d")
  echo "Zeile $n: ab ${start}s, Dauer ${d}s: $text"
done < "$txt"
[ "$n" -gt 0 ] || fail "keine Zeilen in $txt"
bad=0
for ((i=0;i<n;i++)); do
  ende="$(awk -v s="${starts[$i]}" -v d="${durs[$i]}" 'BEGIN{printf "%.2f",s+d}')"
  if [ $((i+1)) -lt "$n" ]; then lim="${starts[$((i+1))]}"; else lim="${total:-}"; fi
  if [ -n "$lim" ] && awk -v e="$ende" -v l="$lim" 'BEGIN{exit !(e>l-0.3)}'; then echo "ZU LANG: Zeile $((i+1)) endet bei ${ende}s, nächster Einsatz/Ende bei ${lim}s (Reserve 0,3 s)" >&2; bad=1; fi
done
[ "$bad" = 0 ] || exit 1
inputs=(); graph=""
for ((i=0;i<n;i++)); do
  ms="$(awk -v s="${starts[$i]}" 'BEGIN{printf "%d",s*1000}')"
  inputs+=(-i "$work/z$((i+1)).wav"); graph+="[$i:a]aresample=24000,adelay=${ms}|${ms}[a$i];"
done
mix=""; for ((i=0;i<n;i++)); do mix+="[a$i]"; done
ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex "${graph}${mix}amix=inputs=$n:duration=longest:normalize=0[o]" -map "[o]" "$out"
echo "Fertig: $out ($n Zeilen, Stimme $STIMME)"
