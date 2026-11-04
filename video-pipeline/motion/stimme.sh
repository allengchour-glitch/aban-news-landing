#!/usr/bin/env bash
# stimme.sh — erzeugt aus einer Textdatei eine deutsche Sprachspur (Piper, lokal und gratis).
# Aufruf:  bash stimme.sh <stimme.txt> <ausgabe.wav> [gesamtdauer_s]
#
# Zwei Formate für stimme.txt (Spalten durch TAB getrennt):
#  A) feste Zeiten:   «Startsekunde  Text»                    → jede Zeile setzt zur angegebenen Sekunde ein.
#  B) automatische Zeiten (wie im Referenzvideo «Szenenlänge = Länge der Sprecherzeile»):
#                     «S1  Text  [Bildschirmtitel]»           → Szene S1, S2, … ; die Zeilen folgen einander mit Pause (STIMME_PAUSE, Vorgabe 0.5 s),
#                       die erste setzt bei 0.6 s ein. Optional schreibt ZEITEN_JSON=<datei> die berechneten Szenenfenster
#                       (Szene beginnt 0.4 s vor ihrer ersten Zeile, endet 0.6 s nach ihrer letzten; die letzte Szene bekommt 1 s Ausklang).
# Hochdeutsch, kurze Sätze, so schreiben wie gesprochen (Zahlen ausschreiben).
# Umgebung: STIMME_TEMPO (Vorgabe 1.2 = etwas langsamer als normal; 1.0 normal, 1.4 sehr ruhig), STIMME (Vorgabe de_DE-thorsten-high;
#           Alternative de_DE-ramona-low), PIPER_MODELLE (Vorgabe ~/.local/share/luxe-stimmen, wird bei Bedarf geladen).
# Prüft, dass jede Zeile vor dem Start der nächsten fertig gesprochen ist (sonst Exit 1 mit Angabe der Zeile).
# Danach: STIMME_DATEI=<ausgabe.wav> STIMME_START=0 bash mix.sh <stumm.mp4> <ausgabe.mp4>
set -euo pipefail
fail() { echo "FEHLER: $*" >&2; exit 2; }
[ $# -ge 2 ] || fail "Aufruf: stimme.sh <stimme.txt> <ausgabe.wav> [gesamtdauer_s]"
txt="$1"; out="$2"; total="${3:-}"; [ -f "$txt" ] || fail "Datei fehlt: $txt"
command -v piper >/dev/null || fail "piper fehlt (pip install piper-tts)"
STIMME="${STIMME:-de_DE-thorsten-high}"; [[ "$STIMME" =~ ^de_DE-[a-z]+-[a-z_]+$ ]] || fail "STIMME muss de_DE-<name>-<qualität> heissen"
tempo="${STIMME_TEMPO:-1.2}"; [[ "$tempo" =~ ^[0-9](\.[0-9]+)?$ ]] && awk -v t="$tempo" 'BEGIN{exit !(t>=0.6 && t<=2)}' || fail "STIMME_TEMPO muss eine Zahl von 0.6 bis 2 sein"
pause="${STIMME_PAUSE:-0.5}"; [[ "$pause" =~ ^[0-9](\.[0-9]+)?$ ]] || fail "STIMME_PAUSE muss eine Zahl von 0 bis 9.9 sein"
mdir="${PIPER_MODELLE:-$HOME/.local/share/luxe-stimmen}"; mkdir -p "$mdir"; sp="${STIMME#de_DE-}"; sp="${sp%-*}"; q="${STIMME##*-}"
for e in onnx onnx.json; do [ -s "$mdir/$STIMME.$e" ] || curl --fail --location --silent --show-error --max-time 300 --output "$mdir/$STIMME.$e" "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/$sp/$q/$STIMME.$e" || fail "Stimme $STIMME.$e nicht ladbar"; done
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
starts=(); durs=(); szenen=(); titel=(); texte=(); n=0; auto=""
while IFS=$'\t' read -r start text titeltext; do
  [ -z "${start:-}" ] && continue
  if [[ "$start" =~ ^S[0-9]+$ ]]; then mode=auto; elif [[ "$start" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then mode=fest; else fail "Zeile $((n+1)): erste Spalte muss Sekunden oder S<Nummer> sein: «$start»"; fi
  [ -z "$auto" ] && auto="$mode"; [ "$auto" = "$mode" ] || fail "Zeile $((n+1)): feste Zeiten und S<Nummer> lassen sich nicht mischen"
  [ -n "${text:-}" ] || fail "Zeile $((n+1)): Text fehlt"
  [ "${#text}" -le 160 ] || fail "Zeile $((n+1)): Text länger als 160 Zeichen"
  n=$((n+1))
  printf '%s' "$text" | piper -m "$mdir/$STIMME.onnx" --length-scale "$tempo" -f "$work/z$n.wav" >/dev/null 2>&1 || fail "Piper konnte Zeile $n nicht sprechen"
  d="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$work/z$n.wav")"
  starts+=("$start"); durs+=("$d"); szenen+=("$start"); titel+=("${titeltext:-}"); texte+=("$text")
done < "$txt"
[ "$n" -gt 0 ] || fail "keine Zeilen in $txt"
if [ "$auto" = auto ]; then   # Einsatzzeiten aus den Längen berechnen
  t="0.6"
  for ((i=0;i<n;i++)); do
    starts[$i]="$t"; t="$(awk -v s="$t" -v d="${durs[$i]}" -v p="$pause" 'BEGIN{printf "%.3f",s+d+p}')"
  done
fi
for ((i=0;i<n;i++)); do echo "Zeile $((i+1)): ab ${starts[$i]}s, Dauer ${durs[$i]}s: ${texte[$i]}"; done
bad=0
for ((i=0;i<n;i++)); do
  ende="$(awk -v s="${starts[$i]}" -v d="${durs[$i]}" 'BEGIN{printf "%.2f",s+d}')"
  if [ $((i+1)) -lt "$n" ]; then lim="${starts[$((i+1))]}"; else lim="${total:-}"; fi
  if [ -n "$lim" ] && awk -v e="$ende" -v l="$lim" 'BEGIN{exit !(e>l-0.3)}'; then echo "ZU LANG: Zeile $((i+1)) endet bei ${ende}s, nächster Einsatz/Ende bei ${lim}s (Reserve 0,3 s)" >&2; bad=1; fi
done
[ "$bad" = 0 ] || exit 1
if [ -n "${ZEITEN_JSON:-}" ]; then
  [ "$auto" = auto ] || fail "ZEITEN_JSON braucht das Format mit S<Nummer>"
  {
    for ((i=0;i<n;i++)); do printf '%s\t%s\t%s\t%s\t%s\n' "${szenen[$i]}" "${starts[$i]}" "${durs[$i]}" "${texte[$i]}" "${titel[$i]}"; done
  } | python3 -I -c '
import sys, json
zeilen = []
for l in sys.stdin.read().splitlines():
    s, a, d, t, ti = (l.split("\t") + [""] * 5)[:5]
    zeilen.append({"szene": s, "start": float(a), "dauer": float(d), "text": t, "titel": ti})
szenen = []
for z in zeilen:
    if not szenen or szenen[-1]["id"] != z["szene"]:
        szenen.append({"id": z["szene"], "zeilen": []})
    szenen[-1]["zeilen"].append(z)
for i, sz in enumerate(szenen):
    erste, letzte = sz["zeilen"][0], sz["zeilen"][-1]
    sz["t0"] = 0.0 if i == 0 else round(erste["start"] - 0.4, 3)
    ende = letzte["start"] + letzte["dauer"]
    sz["t1"] = round(ende + 1.0, 3) if i == len(szenen) - 1 else round(ende + 0.6, 3)
gesamt = szenen[-1]["t1"]
print(json.dumps({"gesamt": gesamt, "szenen": szenen}, ensure_ascii=False, indent=1))
' > "$ZEITEN_JSON"
  echo "Zeiten: $ZEITEN_JSON"
fi
inputs=(); graph=""
for ((i=0;i<n;i++)); do
  ms="$(awk -v s="${starts[$i]}" 'BEGIN{printf "%d",s*1000}')"
  inputs+=(-i "$work/z$((i+1)).wav"); graph+="[$i:a]aresample=24000,adelay=${ms}|${ms}[a$i];"
done
mix=""; for ((i=0;i<n;i++)); do mix+="[a$i]"; done
ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex "${graph}${mix}amix=inputs=$n:duration=longest:normalize=0[o]" -map "[o]" "$out"
echo "Fertig: $out ($n Zeilen, Stimme $STIMME)"
