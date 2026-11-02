#!/usr/bin/env bash
# Test der Musikwahl: nie zweimal hintereinander dasselbe Stück, gleichmässige Verteilung, Fremdzeilen werden ignoriert, Startsekunden.
set -euo pipefail
dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
tmp="$(mktemp -d)"; trap 'rm -rf -- "$tmp"' EXIT
export MUSIK_LOG="$tmp/log.txt"; : > "$MUSIK_LOG"
mapfile -t liste < <("$dir/musik_waehlen.sh" --liste); n=${#liste[@]}
fehler=0; prev=""
[ "$n" -ge 3 ] || { echo "FEHLER: weniger als 3 Stücke in der Rotation ($n)"; fehler=$((fehler+1)); }
for t in "${liste[@]}"; do case "$t" in mixkit-*.mp3) ;; *) echo "FEHLER: unerwartetes Stück in der Rotation: $t"; fehler=$((fehler+1));; esac; done
for i in $(seq 1 $((n * 6))); do
  t="$("$dir/musik_waehlen.sh")"
  [ -n "$t" ] || { echo "FEHLER: leere Wahl bei $i"; fehler=$((fehler+1)); }
  [ "$t" != "$prev" ] || { echo "FEHLER: zweimal $t hintereinander bei $i"; fehler=$((fehler+1)); }
  printf '2026-11-02T00:00:%02dZ\tprodukt-%d\t%s\n' "$i" "$i" "$t" >> "$MUSIK_LOG"; prev="$t"
done
mx=$(cut -f3 "$MUSIK_LOG" | sort | uniq -c | sort -rn | head -1 | awk '{print $1}')
mn=$(cut -f3 "$MUSIK_LOG" | sort | uniq -c | sort -n | head -1 | awk '{print $1}')
kinds=$(cut -f3 "$MUSIK_LOG" | sort -u | wc -l)
[ "$kinds" -eq "$n" ] || { echo "FEHLER: nur $kinds von $n Stücken benutzt"; fehler=$((fehler+1)); }
[ $((mx - mn)) -le 1 ] || { echo "FEHLER: Verteilung ungleich ($mn bis $mx)"; fehler=$((fehler+1)); }
# Eigenproduktionen und CC-BY-Stücke im Log werden ignoriert und nie gewählt
printf 'x\ty\tluxe-hype1.wav\nx\ty\tvoltaic.mp3\n' >> "$MUSIK_LOG"
t="$("$dir/musik_waehlen.sh")"; case "$t" in luxe-*|voltaic.mp3|electrodoodle.mp3|digital-lemonade.mp3) echo "FEHLER: Stück ausserhalb der Rotation gewählt: $t"; fehler=$((fehler+1));; esac
# Sonderfall: das zuletzt benutzte Stück ist zugleich das am wenigsten benutzte: trotzdem nicht noch einmal
: > "$MUSIK_LOG"
for rep in 1 2; do for t in "${liste[@]:1}"; do printf 'x\ty\t%s\n' "$t" >> "$MUSIK_LOG"; done; done
printf 'x\ty\t%s\n' "${liste[0]}" >> "$MUSIK_LOG"
t="$("$dir/musik_waehlen.sh")"; [ "$t" != "${liste[0]}" ] || { echo "FEHLER: zuletzt benutztes Stück erneut gewählt"; fehler=$((fehler+1)); }
# leeres Log: erstes Stück der Liste
: > "$MUSIK_LOG"; [ "$("$dir/musik_waehlen.sh")" = "${liste[0]}" ] || { echo "FEHLER: leeres Log"; fehler=$((fehler+1)); }
# Startsekunden: jedes Stück hat eine ganze Zahl; unbekannte Stücke 0; Aufruf ohne Namen ist ein Fehler
for t in "${liste[@]}"; do s="$("$dir/musik_waehlen.sh" --start "$t")"; [[ "$s" =~ ^[0-9]+$ ]] || { echo "FEHLER: Startsekunde von $t ist «$s»"; fehler=$((fehler+1)); }; done
[ "$("$dir/musik_waehlen.sh" --start unbekannt.mp3)" = 0 ] || { echo "FEHLER: unbekanntes Stück nicht 0"; fehler=$((fehler+1)); }
"$dir/musik_waehlen.sh" --start >/dev/null 2>&1 && { echo "FEHLER: --start ohne Namen akzeptiert"; fehler=$((fehler+1)); } || true
[ "$("$dir/musik_waehlen.sh" --start "${liste[1]}")" -gt 0 ] || { echo "FEHLER: ${liste[1]} hat keinen Start im Hauptteil (musik-start.txt)"; fehler=$((fehler+1)); }
if [ "$fehler" -eq 0 ]; then echo "musik_waehlen_test: ok, 0 Fehler"; else echo "musik_waehlen_test: $fehler Fehler"; exit 1; fi
