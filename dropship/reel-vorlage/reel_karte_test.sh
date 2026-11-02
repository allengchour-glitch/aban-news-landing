#!/usr/bin/env bash
# Test der Reel-Vorlage im Trockenlauf (kein Netz, kein Render): Texteingabe, Zuschnitt, Farben, Musikwahl.
set -uo pipefail
dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
tmp="$(mktemp -d)"; trap 'rm -rf -- "$tmp"' EXIT
mkdir -p "$tmp/repo/automation/music"; mapfile -t liste < <("$dir/musik_waehlen.sh" --liste); for t in "${liste[@]}"; do : > "$tmp/repo/automation/music/$t"; done
export REPO_ROOT="$tmp/repo" MUSIK_LOG="$tmp/log.txt" TROCKEN=1
export TITEL1="Titel" TAGLINE="Eine Zeile." TEXT_MITTE="Mitte." NAME_KURZ="Produkt" FOTO_A=https://x/a.jpg FOTO_B=https://x/b.jpg FOTO_C=https://x/c.jpg
fehler=0
ok()  { echo "ok:   $1"; }
bad() { echo "FEHLER: $1"; fehler=$((fehler+1)); }
laeuft() { bash "$dir/reel_karte.sh" >"$tmp/out.txt" 2>"$tmp/err.txt"; }
laeuft && ok "Grundfall läuft" || bad "Grundfall: $(cat "$tmp/err.txt")"
grep -q "MUSIK=${liste[0]}" "$tmp/out.txt" && ok "leeres Log: erstes Stück" || bad "Musikwahl bei leerem Log"
grep -q "^START=[0-9][0-9]*$" "$tmp/out.txt" && ok "Startsekunde im Trockenlauf" || bad "START fehlt"
( export MUSIK_START=7; bash "$dir/reel_karte.sh" ) | grep -q "atrim=start=7:end=17," && ok "Startsekunde 7 kommt im Filter an (atrim=start=7:end=17)" || bad "MUSIK_START erreicht den Filter nicht"
( bash "$dir/reel_karte.sh" ) | grep -q "loudnorm=I=-22:" && ok "Musik leise (Vorgabe -22 LUFS im Filter)" || bad "Vorgabe-Lautstärke fehlt im Filter"
( export MUSIK_LUFS=-18; bash "$dir/reel_karte.sh" ) | grep -q "loudnorm=I=-18:" && ok "MUSIK_LUFS wirkt" || bad "MUSIK_LUFS erreicht den Filter nicht"
( export MUSIK_LUFS=laut; bash "$dir/reel_karte.sh" ) >/dev/null 2>&1 && bad "MUSIK_LUFS=laut nicht abgelehnt" || ok "abgelehnt: MUSIK_LUFS=laut"
printf 't\tp\t%s\n' "${liste[0]}" > "$MUSIK_LOG"; laeuft; grep -q "MUSIK=${liste[1]}" "$tmp/out.txt" && ok "nach dem ersten Stück kommt das zweite" || bad "Rotation"
for e in "TITEL1=ABCDEFGHIJKLMNOPQ" "TAGLINE=Dieser Satz ist deutlich zu lang fuer die Karte" "TEXT_MITTE=Text mit Doppelpunkt:" "TITEL1=Zehn%" "NAME_KURZ=Es geht nicht" "FOTO_A=http://unsicher/a.jpg" "CROP_B=1:2:3" "MUSIK=../etc/passwd" "TITEL1="; do
  ( export "${e?}"; [ "$e" = "NAME_KURZ=Es geht nicht" ] && export NAME_KURZ="Es'geht nicht"; bash "$dir/reel_karte.sh" >/dev/null 2>"$tmp/err.txt" ); rc=$?
  [ "$rc" -eq 2 ] && ok "abgelehnt: ${e:0:40}" || bad "nicht abgelehnt (rc=$rc): $e"
done
( export MUSIK_START=abc; bash "$dir/reel_karte.sh" >/dev/null 2>&1 ); [ $? -eq 2 ] && ok "MUSIK_START muss eine Zahl sein" || bad "MUSIK_START nicht geprüft"
( export CROP_B=190:0:340:510 CROP_C=339:505:190:275; bash "$dir/reel_karte.sh" ) | grep -q "crop=340:510:190:0," && ok "Zuschnitt in ffmpeg-Reihenfolge (w:h:x:y)" || bad "Zuschnitt-Reihenfolge"
( export CROP_C=339:505:190:275; bash "$dir/reel_karte.sh" ) | grep -q "crop=190:275:339:505," && ok "zweiter Zuschnitt" || bad "zweiter Zuschnitt"
erste_karte() { grep -m1 -o 'color=c=0x[0-9a-f]*' | cut -d= -f2-; }
[ "$( ( export INVERS=1; bash "$dir/reel_karte.sh" ) | erste_karte)" = "c=0x302a25" ] && ok "INVERS: erste Karte dunkel" || bad "INVERS-Farben"
[ "$(bash "$dir/reel_karte.sh" | erste_karte)" = "c=0xf3eee7" ] && ok "Vorgabe: erste Karte hell" || bad "Vorgabefarben"
mkdir -p "$tmp/repo/automation/music/../music"; ( export MUSIK="../music/${liste[0]}"; bash "$dir/reel_karte.sh" >/dev/null 2>&1 ); [ $? -eq 2 ] && ok "MUSIK mit Pfad abgelehnt, auch wenn die Datei existiert" || bad "MUSIK mit existierendem Pfad nicht abgelehnt"
( export TITEL2="Zeile zwei" ; bash "$dir/reel_karte.sh" ) | grep -c "text='Zeile zwei'" | grep -q '^1$' && ok "zweite Titelzeile" || bad "TITEL2"
if [ "$fehler" -eq 0 ]; then echo "reel_karte_test: ok, 0 Fehler"; else echo "reel_karte_test: $fehler Fehler"; exit 1; fi
