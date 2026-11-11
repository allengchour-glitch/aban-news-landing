#!/usr/bin/env bash
# bauen.sh — baut eine Kurzfolge der Reihe «Warum vegan leben?» (3D): Stimme → Zeiten → Render → Ton.
# Aufruf (aus video-pipeline/motion3d):  bash projekte/pia-warum/bauen.sh <ordner> [--nur-zeiten | --probe | --nur-ton]
#   <ordner>       Ordner der Folge unter projekte/, z. B. pia-warum-1-tiere
#   --nur-zeiten   nur Stimme und zeiten.js.   --probe   rendert nur die ersten 8 s (Probeclip).
#   --nur-ton      kein Render: legt Stimme und Musik neu unter das schon gerenderte ausgabe/<ordner>-stumm.mp4
# Umgebung: WEBGL=sw (Standard, Software) oder gpu (auf dem Laptop),
#   STIMME (Standard de-DE-KatjaNeural über edge-tts; Piper: z. B. de_DE-ramona-low),
#   STIMME_RATE (+0%), STIMME_PAUSE (0.5), STIMME_BEGINN (0.25; wirkt nur mit edge-tts), EDGE_CA_BUNDLE (bei Proxy),
#   MUSIK: a = «Sleepy Cat» (Klavier), b = «Forest Treasure» (Natur), beide Mixkit, vom Besitzer am 11.11.2026 gewählt;
#          ohne = nur Stimme; oder ein Dateiname in automation/music. Vorgabe: ungerade Folge a, gerade Folge b.
#   MUSIK_LUFS: Lautstärke der Musik (Vorgabe -32; die Stimme liegt bei -16, die Musik duckt zusätzlich unter der Stimme).
set -euo pipefail
cd "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/../.."
f="${1:-}"; case "$f" in ""|*/*|.*) echo "Aufruf: bash projekte/pia-warum/bauen.sh <ordner> [--nur-zeiten | --probe | --nur-ton]" >&2; exit 2;; esac
p="projekte/$f"; m=../motion; mkdir -p ausgabe
[ -f "$p/szene.html" ] && [ -f "$p/stimme.txt" ] && [ -f "$p/folge.js" ] || { echo "FEHLER: $p braucht szene.html, stimme.txt und folge.js (anlegen.py)" >&2; exit 2; }
modus="${2:-}"
export STIMME="${STIMME:-de-DE-KatjaNeural}" STIMME_RATE="${STIMME_RATE:-+0%}" STIMME_PAUSE="${STIMME_PAUSE:-0.5}" STIMME_BEGINN="${STIMME_BEGINN:-0.25}"

if [ "$modus" != "--nur-ton" ]; then
  if [[ "$STIMME" == de-DE-* ]]; then   # neuronale Stimme (edge-tts); sonst Piper
    python3 $m/stimme_edge.py "$p/stimme.txt" "ausgabe/$f-stimme.wav" "ausgabe/$f-zeiten.json"
  else
    ZEITEN_JSON="ausgabe/$f-zeiten.json" bash $m/stimme.sh "$p/stimme.txt" "ausgabe/$f-stimme.wav"
  fi
  printf '/* erzeugt von bauen.sh aus stimme.txt, nicht von Hand ändern */\nwindow.__ZEITEN = %s;\n' "$(python3 -I -c 'import json,sys;print(json.dumps(json.load(open(sys.argv[1])),ensure_ascii=False))' "ausgabe/$f-zeiten.json")" > "$p/zeiten.js"
  [ "$modus" = "--nur-zeiten" ] && exit 0
  dauer=(); [ "$modus" = "--probe" ] && dauer=(--dauer 8)
  node $m/render.mjs "$p/szene.html" --webgl "${WEBGL:-sw}" --wartezeit 180 --out "ausgabe/$f-stumm.mp4" "${dauer[@]}"
fi
[ -f "ausgabe/$f-stumm.mp4" ] && [ -f "ausgabe/$f-stimme.wav" ] || { echo "FEHLER: ausgabe/$f-stumm.mp4 oder -stimme.wav fehlt (erst ohne --nur-ton bauen)" >&2; exit 2; }

# Musik wählen: Folge N aus dem Ordnernamen (pia-warum-N-…), ungerade a, gerade b
musik="${MUSIK:-}"
if [ -z "$musik" ]; then n="$(echo "$f" | sed -n 's/^pia-warum-\([0-9]\+\)-.*/\1/p')"; musik=a; [ -n "$n" ] && [ $((n % 2)) -eq 0 ] && musik=b; fi
case "$musik" in
  a) nr=135; name=sleepy-cat; start=1 ;;
  b) nr=138; name=forest-treasure; start=3 ;;
  ohne) nr= ;;
  *) nr=datei ;;
esac
lufs="${MUSIK_LUFS:--32}"
if [ "$musik" = ohne ]; then
  ffmpeg -y -loglevel error -i "ausgabe/$f-stumm.mp4" -i "ausgabe/$f-stimme.wav" \
    -filter_complex "[1:a]loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000,apad[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "ausgabe/$f.mp4"
  echo "Fertig: ausgabe/$f.mp4 (nur Stimme, keine Musik)"
elif [ "$nr" = datei ]; then
  MUSIK="$musik" MUSIK_LUFS="$lufs" STIMME_DATEI="ausgabe/$f-stimme.wav" STIMME_START=0 bash $m/mix.sh "ausgabe/$f-stumm.mp4" "ausgabe/$f.mp4"
else
  # Mixkit-Stücke werden nicht ins Repo gelegt (Lizenz: nur als Ton in einem Video, die Datei selbst nicht weitergeben),
  # sondern bei Bedarf geladen. ausgabe/ ist in .gitignore.
  md="ausgabe/musik/mixkit-$name-$nr.mp3"; mkdir -p ausgabe/musik
  [ -s "$md" ] || curl -fsSL --max-time 120 -o "$md" "https://assets.mixkit.co/music/$nr/$nr.mp3"
  MUSIK_DATEI="$md" MUSIK_START="${MUSIK_START:-$start}" MUSIK_LUFS="$lufs" STIMME_DATEI="ausgabe/$f-stimme.wav" STIMME_START=0 \
    bash $m/mix.sh "ausgabe/$f-stumm.mp4" "ausgabe/$f.mp4"
fi
