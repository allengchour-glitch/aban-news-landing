#!/usr/bin/env bash
# render_test.sh — Selbsttest für render.mjs, mix.sh und pruefe_sicherzone.mjs (ohne Netz, ca. 1 Minute).
# Prüft: Standbild-Format, Zeit wirkt, Reihenfolge-Unabhängigkeit, Kurzvideo-Daten, Ton-Mix, Sicherzone,
# und dass ein absichtlich kaputter Renderer (Animationen NICHT pausiert) erkannt wird (Mutationsprobe).
set -uo pipefail
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"; cd "$here"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
ok=0; bad=0
check() { if [ "$2" = 1 ]; then ok=$((ok+1)); echo "  ok   $1"; else bad=$((bad+1)); echo "  FAIL $1"; fi; }
md5() { md5sum "$1" | cut -c1-12; }
B=bausteine/04-baum-waechst.html

echo "== Standbilder"
node render.mjs "$B" --vorschau 0.5,2 --outdir "$tmp/a" >/dev/null 2>&1
check "Standbild 1080x1920" "$([ "$(ffprobe -v error -show_entries stream=width,height -of csv=p=0 "$tmp/a/t000_5.png" 2>/dev/null)" = "1080,1920" ] && echo 1 || echo 0)"
check "Zeit wirkt (0,5 s und 2 s sehen verschieden aus)" "$([ "$(md5 "$tmp/a/t000_5.png")" != "$(md5 "$tmp/a/t00002.png")" ] && echo 1 || echo 0)"

echo "== Reihenfolge und Wiederholung"
node render.mjs "$B" --vorschau 2,0.5 --outdir "$tmp/b" >/dev/null 2>&1
check "gleiche Zeiten in umgekehrter Reihenfolge = gleiche Bilder" "$([ "$(md5 "$tmp/a/t000_5.png")" = "$(md5 "$tmp/b/t000_5.png")" ] && [ "$(md5 "$tmp/a/t00002.png")" = "$(md5 "$tmp/b/t00002.png")" ] && echo 1 || echo 0)"
node render.mjs "$B" --vorschau 0.5,2 --outdir "$tmp/c" >/dev/null 2>&1
check "zweiter Lauf = gleiche Bilder" "$([ "$(md5 "$tmp/a/t000_5.png")" = "$(md5 "$tmp/c/t000_5.png")" ] && [ "$(md5 "$tmp/a/t00002.png")" = "$(md5 "$tmp/c/t00002.png")" ] && echo 1 || echo 0)"

echo "== Kurzvideo"
node render.mjs "$B" --out "$tmp/k.mp4" --dauer 1 >/dev/null 2>&1
info="$(ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=codec_name,pix_fmt,width,height,r_frame_rate,nb_read_frames -of csv=p=0 "$tmp/k.mp4" 2>/dev/null)"
check "H.264, yuv420p, 1080x1920, 30 fps, 30 Bilder ($info)" "$([ "$info" = "h264,1080,1920,yuv420p,30/1,30" ] && echo 1 || echo 0)"

echo "== Ton"
bash mix.sh "$tmp/k.mp4" "$tmp/km.mp4" >/dev/null 2>&1
ast="$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "$tmp/km.mp4" 2>/dev/null)"
check "Mix hat Tonspur (aac)" "$([ "$ast" = aac ] && echo 1 || echo 0)"
bash mix.sh "$tmp/k.mp4" "$tmp/x.mp4" >/dev/null 2>&1; MUSIK=../../etc/passwd bash mix.sh "$tmp/k.mp4" "$tmp/x.mp4" >/dev/null 2>&1
check "MUSIK mit Pfad wird abgelehnt" "$([ $? -ne 0 ] && echo 1 || echo 0)"
MUSIK_LUFS=laut bash mix.sh "$tmp/k.mp4" "$tmp/x.mp4" >/dev/null 2>&1
check "ungültiges MUSIK_LUFS wird abgelehnt" "$([ $? -ne 0 ] && echo 1 || echo 0)"
log_vor="$(wc -l < ../../dropship/reel-vorlage/musik-log.txt)"
bash mix.sh "$tmp/k.mp4" "$tmp/x.mp4" >/dev/null 2>&1
check "Musik-Log bleibt ohne MUSIK_LOG_SCHREIBEN unberührt" "$([ "$log_vor" = "$(wc -l < ../../dropship/reel-vorlage/musik-log.txt)" ] && echo 1 || echo 0)"

echo "== Sicherzone"
node pruefe_sicherzone.mjs projekte/frieden/szenen.html >/dev/null 2>&1
check "Titel des Beispiel-Shorts liegen in der Sicherzone" "$([ $? -eq 0 ] && echo 1 || echo 0)"
cat > "$tmp/zu_weit.html" <<'H'
<!doctype html><meta charset="utf-8"><div class="cap" style="position:absolute;left:700px;top:1700px;width:300px">Zu nah am Rand</div>
<script src="file://HERE/motion.js"></script><script>Motion.fertig(1)</script>
H
sed -i "s#HERE#$here#" "$tmp/zu_weit.html"
node pruefe_sicherzone.mjs "$tmp/zu_weit.html" >/dev/null 2>&1
check "Titel zu nah am Rand werden erkannt" "$([ $? -eq 1 ] && echo 1 || echo 0)"

echo "== Mutationsprobe: Renderer ohne pause() muss auffallen"
sed 's/an.forEach((x) => x.pause());/\/* MUTANT *\//' render.mjs > "$tmp/mutant.mjs"
if grep -q MUTANT "$tmp/mutant.mjs"; then
  node "$tmp/mutant.mjs" "$here/$B" --vorschau 0.5,2 --outdir "$tmp/m" >/dev/null 2>&1
  check "Mutant (Animationen laufen weiter) liefert andere Bilder als der echte Renderer" "$([ "$(md5 "$tmp/m/t000_5.png" 2>/dev/null)" != "$(md5 "$tmp/a/t000_5.png")" ] || [ "$(md5 "$tmp/m/t00002.png" 2>/dev/null)" != "$(md5 "$tmp/a/t00002.png")" ] && echo 1 || echo 0)"
else
  check "Mutant konnte nicht gebaut werden (Suchtext in render.mjs geändert?)" 0
fi

echo; echo "Ergebnis: $ok ok, $bad Fehler"; [ "$bad" -eq 0 ]
