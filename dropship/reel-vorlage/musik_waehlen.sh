#!/usr/bin/env bash
# Wählt das Musikstück für ein Reel: rotiert über die Stücke, nie zweimal hintereinander dasselbe.
# Regel (Besitzer 2.11.2026: «andere Musik … nie das gleiche»; die selbst erzeugten Stücke gefielen nicht: «nimm von irgendwo lieber»):
# aus allen Stücken ausser dem zuletzt benutzten das am wenigsten benutzte, bei Gleichstand das am längsten nicht benutzte, dann die Reihenfolge der Liste.
# Liste = Mixkit-Stücke (Mixkit Stock Music Free License: Social-Media-Videos und Werbung erlaubt, keine Namensnennung nötig; automation/music/CREDITS.txt).
# Die Eigenproduktionen (luxe-*.wav/mp3) und die Kevin-MacLeod-Stücke (CC BY, verlangt Quellenangabe) sind NICHT in der Rotation; per MUSIK=<Datei> bleiben sie wählbar.
# Aufruf: musik_waehlen.sh             → druckt den Dateinamen (z. B. mixkit-majestic-475.mp3)
#         musik_waehlen.sh --liste     → druckt alle Stücke der Rotation
#         musik_waehlen.sh --start <D> → druckt die Startsekunde im Stück (aus musik-start.txt, sonst 0): der Ausschnitt soll im Hauptteil liegen, nicht im leisen Intro
# Log: MUSIK_LOG (Vorgabe musik-log.txt neben dem Skript), Zeilen «ISO-Zeit<TAB>Produkt<TAB>Stück». Geschrieben wird es nur von reel_karte.sh nach einem erfolgreichen Render.
set -euo pipefail
dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
log="${MUSIK_LOG:-$dir/musik-log.txt}"
tracks="mixkit-serene-view-443.mp3 mixkit-majestic-475.mp3 mixkit-dreamy-jazz-645.mp3 mixkit-new-york-427.mp3 mixkit-violin-uplift-675.mp3"
case "${1:-}" in
  --liste) for t in $tracks; do echo "$t"; done; exit 0 ;;
  --start) [ -n "${2:-}" ] || { echo "FEHLER: --start braucht einen Dateinamen" >&2; exit 2; }
           st=0; [ -f "$dir/musik-start.txt" ] && st="$(awk -F'\t' -v f="$2" '$1==f{print $2; exit}' "$dir/musik-start.txt")"
           printf '%s\n' "${st:-0}"; exit 0 ;;
esac
declare -A n lastpos
last=""; pos=0
if [ -f "$log" ]; then
  while IFS=$'\t' read -r _ts _h t; do
    [ -z "${t:-}" ] && continue
    case " $tracks " in *" $t "*) ;; *) continue ;; esac
    pos=$((pos + 1)); n[$t]=$(( ${n[$t]:-0} + 1 )); lastpos[$t]=$pos; last="$t"
  done < "$log"
fi
best=""; bc=999999; bp=999999
for t in $tracks; do
  [ "$t" = "$last" ] && continue
  c=${n[$t]:-0}; p=${lastpos[$t]:-0}
  if [ "$c" -lt "$bc" ] || { [ "$c" -eq "$bc" ] && [ "$p" -lt "$bp" ]; }; then best="$t"; bc=$c; bp=$p; fi
done
printf '%s\n' "$best"
