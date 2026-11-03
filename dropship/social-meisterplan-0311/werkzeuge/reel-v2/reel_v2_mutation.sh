#!/usr/bin/env bash
# Mutationsprobe fuer reel_v2.sh: jede Zerstoerung wird in eine KOPIE des Skripts geschrieben und vom Test (FAIL_FAST, ohne Stimmen-Render) geprueft.
# Erkannt = der Test endet mit Fehler. Ueberlebt = der Test bleibt gruen (Luecke im Test oder gleichwertige Mutation).
set -uo pipefail
dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
tmp="$(mktemp -d)"; trap 'rm -rf -- "$tmp"' EXIT
orig="$dir/reel_v2.sh"
muts=(
"M01 Sicherheitsrand rechts aufgeweitet (SAFE_X1 930 -> 1070)|SAFE_X1=930|SAFE_X1=1070"
"M02 Lint ohne «gratis»|sterne bewertung gratis wasserdicht|sterne bewertung wasserdicht"
"M03 Bildrate 25 statt 30 (FPS)|W=1080; H=1920; FPS=30|W=1080; H=1920; FPS=25"
"M04 Länge 9,5 s statt 11,0 s (DAUER)|DAUER=11.0|DAUER=9.5"
"M05 Tonspur nicht ins MP4 gemappt|-map '[v]' -map \"\$((5+nsc)):a\" -t|-map '[v]' -t"
"M06 Hook-Mindestgrösse 96 -> 40 px|HOOK_PX_MIN=96|HOOK_PX_MIN=40"
"M07 Hook-Zeilenlänge 16 -> 20 Zeichen|HOOK_MAX=16|HOOK_MAX=20"
"M08 Musikrotation erlaubt dasselbe Stück|    [ \"\$t\" = \"\$last\" ] && continue|    false && continue"
"M09 Untertitel ohne Leerzeichen zwischen den Zeilen|\${zl//|/ }|\${zl//|/}"
"M10 Hook beginnt erst bei 0,3 s|add_block hook hook 0 2.6|add_block hook hook 0.3 2.6"
"M11 Ziffernprüfung im Sprechtext entfernt|case \"\$SPRECHTEXT\" in *[0-9]*)|case \"\$SPRECHTEXT\" in *QQQ*)"
"M12 Zoom-Bereich aufgeweitet (0,05-0,08 -> beliebig)|^(in|out):0\\.0[5-8]:|^(in|out):0\\.[0-9]+:"
"M13 Lautheitsziel Text-Arm -14 statt -22 LUFS|ZIEL=-22|ZIEL=-14"
"M14 Lint-Fehler (IFS) in check_zeilen wieder eingebaut|  IFS='|' read -r -a teile <<<\"\$v\"|  local IFS='|'; teile=(\$v)"
"M15 Auflösung 720 statt 1080 (W)|W=1080; H=1920|W=720; H=1920"
"M16 Untertitel zu tief (SUB_CY 1340 -> 1650) UND Rand-Wächter unten aufgeweitet (SAFE_Y1 1500 -> 1900)|SUB_CY=1340|SUB_CY=1650|SAFE_Y1=1500|SAFE_Y1=1900"
"M17 Schriftgrössen-Mindestmass Text 56 -> 30 px|TEXT_PX_MIN=56|TEXT_PX_MIN=30"
"M19 Zeilenlänge Untertitel/Textblock 28 -> 40 Zeichen|ZEILE_MAX=28|ZEILE_MAX=40"
"M18 Ziffern-/Zeichenprüfung (zeichen_ok) liefert immer ok|zeichen_ok() { \"\$PY\" -I -c '|zeichen_ok() { return 0; \"\$PY\" -I -c '"
)
killed=0; survived=0; liste=""
echo "Grundlauf (unverändertes Skript) ..."
if FAIL_FAST=1 TEST_STIMME=0 REEL_SCRIPT="$orig" bash "$dir/reel_v2_test.sh" > "$tmp/base.log" 2>&1; then echo "  Grundlauf: grün ($(tail -1 "$tmp/base.log"))"; else echo "  Grundlauf ROT, Abbruch"; tail -5 "$tmp/base.log"; exit 3; fi
for m in "${muts[@]}"; do
  IFS='|' read -r -a teile <<< "$m"
  # Felder: Name | alt | neu | (alt2 | neu2); alt/neu duerfen ein '|' enthalten -> eigene Trennung ueber Python
  name="${teile[0]}"
  cp "$orig" "$tmp/mut.sh"
  python3.13 -I - "$tmp/mut.sh" "$m" <<'PY' || { echo "  $name: Mutation nicht anwendbar (Text nicht gefunden)"; survived=$((survived+1)); liste="$liste\n  ?  $name (nicht anwendbar)"; continue; }
import sys
path, spec = sys.argv[1], sys.argv[2]
# Spezialfaelle mit '|' im Text: bekannte Muster
paare = {
 "M09": ("${zl//|/ }", "${zl//|/}"),
 "M12": ("^(in|out):0\\.0[5-8]:", "^(in|out):0\\.[0-9]+:"),
 "M14": ("  IFS='|' read -r -a teile <<<\"$v\"", "  local IFS='|'; teile=($v)"),
}
tag = spec[:3]
s = open(path, encoding="utf-8").read()
if tag in paare:
    todo = [paare[tag]]
else:
    f = spec.split("|")
    todo = [(f[1], f[2])] + ([(f[3], f[4])] if len(f) >= 5 else [])
for alt, neu in todo:
    if s.count(alt) != 1:   # nur eindeutige Stellen mutieren (sonst trifft die Mutation womoeglich einen Kommentar)
        sys.exit(1)
    s = s.replace(alt, neu, 1)
open(path, "w", encoding="utf-8").write(s)
PY
  if cmp -s "$orig" "$tmp/mut.sh"; then echo "  $name: Kopie unverändert, übersprungen"; continue; fi
  if FAIL_FAST=1 TEST_STIMME=0 REEL_SCRIPT="$tmp/mut.sh" bash "$dir/reel_v2_test.sh" > "$tmp/m.log" 2>&1; then
    echo "  ÜBERLEBT: $name"; survived=$((survived+1)); liste="$liste\n  ÜBERLEBT  $name"
  else
    d="$(grep -m1 '^FEHLER' "$tmp/m.log" | cut -c1-110)"; echo "  erkannt:  $name  -> $d"; killed=$((killed+1)); liste="$liste\n  erkannt   $name"
  fi
done
echo "Mutationsprobe: ${#muts[@]} Mutanten, $killed erkannt, $survived überlebt"
[ "$survived" -eq 0 ]
