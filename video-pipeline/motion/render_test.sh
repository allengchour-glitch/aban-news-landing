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

echo "== Strichmännchen"
node render.mjs bausteine/06-stickman.html --vorschau 1.0,3.3 --outdir "$tmp/st" >/dev/null 2>&1
check "Pose wechselt (Gehen und Jubeln sehen verschieden aus)" "$([ -f "$tmp/st/t00001.png" ] && [ -f "$tmp/st/t003_3.png" ] && [ "$(md5 "$tmp/st/t00001.png")" != "$(md5 "$tmp/st/t003_3.png")" ] && echo 1 || echo 0)"
cat > "$tmp/falsch.html" <<'H'
<!doctype html><meta charset="utf-8"><svg id="s" width="1080" height="1920"></svg>
<script src="file://HERE/motion.js"></script><script src="file://HERE/stickman.js"></script>
<script>const p = Stickman(document.getElementById('s'), { x: 500, y: 1500 }); p.pose(2, 'jubeln', .5); p.pose(1, 'ruhig', .5); Motion.fertig(3)</script>
H
sed -i "s#HERE#$here#g" "$tmp/falsch.html"
node render.mjs "$tmp/falsch.html" --vorschau 1 --outdir "$tmp/f" >/dev/null 2>&1
check "Bewegungen rückwärts in der Zeit werden abgelehnt" "$([ $? -ne 0 ] && echo 1 || echo 0)"

echo "== Pia-Short (Zeiten und Sicherzone)"
node -e '
const fs=require("fs"); const w={}; new Function("window",fs.readFileSync("projekte/vegan-pia/zeiten.js","utf8"))(w);
const z=w.__ZEITEN; let ok=z&&z.szenen&&z.szenen.length===4&&z.gesamt>20&&z.gesamt<40;
z.szenen.forEach((s,i)=>{ if(s.t0>=s.t1) ok=false; s.zeilen.forEach(l=>{ if(l.start<s.t0||l.start+l.dauer>s.t1-0.3) ok=false; });
  if(i>0){ const v=z.szenen[i-1]; if(s.t0>v.t1) ok=false; } });
if(Math.abs(z.szenen[3].t1-z.gesamt)>0.01) ok=false;
process.exit(ok?0:1)' >/dev/null 2>&1
check "zeiten.js: 4 Szenen, jede Zeile liegt in ihrer Szene (0,3 s Reserve), keine Lücke" "$([ $? -eq 0 ] && echo 1 || echo 0)"
node pruefe_sicherzone.mjs projekte/vegan-pia/szenen.html >/dev/null 2>&1
check "Titel des Pia-Shorts liegen in der Sicherzone" "$([ $? -eq 0 ] && echo 1 || echo 0)"
if command -v piper >/dev/null 2>&1 && [ -s "$HOME/.local/share/luxe-stimmen/de_DE-thorsten-high.onnx" ]; then
  printf 'S1\tHallo Welt.\tTitel\nS2\tNoch ein Satz.\n' > "$tmp/s.txt"
  ZEITEN_JSON="$tmp/z.json" bash stimme.sh "$tmp/s.txt" "$tmp/s.wav" >/dev/null 2>&1
  check "stimme.sh schreibt Zeiten für S<Nummer>-Zeilen (2 Szenen, wachsende Startzeiten)" "$(python3 -I -c 'import json,sys;z=json.load(open(sys.argv[1]));s=z["szenen"];print(1 if len(s)==2 and s[1]["t0"]>0 and s[1]["zeilen"][0]["start"]>s[0]["zeilen"][0]["start"] and abs(s[1]["t1"]-z["gesamt"])<0.01 else 0)' "$tmp/z.json" 2>/dev/null || echo 0)"
  printf 'S1\tEins.\n2.0\tZwei.\n' > "$tmp/m.txt"
  bash stimme.sh "$tmp/m.txt" "$tmp/m.wav" >/dev/null 2>&1
  check "stimme.sh lehnt gemischte Formate ab" "$([ $? -ne 0 ] && echo 1 || echo 0)"
else
  echo "  --   Stimmen-Tests übersprungen (Piper oder Modell nicht installiert)"
fi
echo "== Markdown-Linter (wie die CI)"
lint_ok=1; for f in *.md projekte/*/*.md; do python3 ../../tools/brand-voice-linter.py "$f" --strict >/dev/null 2>&1 || { lint_ok=0; echo "     Linter rot: $f"; }; done
check "alle .md in video-pipeline/motion bestehen den Voice-Linter" "$lint_ok"

echo; echo "Ergebnis: $ok ok, $bad Fehler"; [ "$bad" -eq 0 ]
