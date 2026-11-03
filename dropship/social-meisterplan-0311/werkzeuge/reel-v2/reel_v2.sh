#!/usr/bin/env bash
# Reel-Vorlage v2 «Hook» (TikTok), eigenes Skript, ersetzt reel_karte.sh NICHT.
# 1080x1920, 30 fps, H.264 yuv420p, AAC, 11,0 s, Vollbild-Szenen mit Ken-Burns-Zoom, Hook schon in Bild 0.
# Aufbau (Sekunden): 0,0-2,6 Hook | 2,6-5,5 Nutzen | 5,5-8,5 Beweis | 8,5-9,8 Einschraenkung oder ruhiger Schluss-Zoom | 9,8-11,0 Endkarte
# Zwei Arme: ARM=stimme (Piper-Stimme, Untertitel = Sprechtext Zeichen fuer Zeichen)  |  ARM=text (nur Musik, Textbloecke)
# Das Skript schreibt NUR die lokale MP4 (und eine Zeile ins Musik-Log). Keine Queue, kein Upload, kein Git, kein Netz ausser dem Laden der Fotos (https).
#
# Eingabe (Umgebung):
#   ARM                 stimme | text
#   HOOK1 [HOOK2]       Hook, je Zeile hoechstens 16 Zeichen, mind. 96 px, nur was das Standbild belegt (kein Produktname, keine Bewegung)
#   BILD1..BILD4        Foto je Szene (Hook, Nutzen, Beweis, Einschraenkung/Schluss): lokale Datei oder https-Adresse. Von Hand gesichtet!
#   CROP1..CROP4        optional «x:y:breite:hoehe» im Original (Zuschnitt, z. B. gegen Fremdschrift am Rand)
#   ZOOM1..ZOOM4        optional «richtung:betrag:fx:fy», richtung in|out, betrag 0,05 bis 0,08, Fokus 0..1 (Vorgabe in:0.07 / out:0.06 / in:0.06 / in:0.05)
#   ARM=stimme:  SATZ_NUTZEN SATZ_BEWEIS SATZ_ENDE   je ein Satz (Hochdeutsch, Zahlen ausgeschrieben); Satz 1 = HOOK1 HOOK2 (wird gross gezeigt).
#                Sprechtext gesamt hoechstens 160 Zeichen; Untertitel: 2 Zeilen je hoechstens 28 Zeichen, gleich Sprechtext Zeichen fuer Zeichen
#   ARM=text:    TEXT_NUTZEN TEXT_BEWEIS [TEXT_ENDE]   je «Zeile1|Zeile2», Zeile hoechstens 28 Zeichen, hoechstens 2 Zeilen
#   ENDZEILE            Endkarte (Vorgabe «LuxeStyle · luxestyle.ch», hoechstens 28 Zeichen)
#   MUSIK               Dateiname in MUSIK_DIR (Vorgabe auto = Rotation ueber fuenf Mixkit-Stuecke, nie dasselbe wie das vorige)  ·  MUSIK_START  Startsekunde
#   STIMME              Piper-Stimme (Vorgabe de_DE-thorsten-high)  ·  PIPER_MODELLE  Ordner der Modelle (Vorgabe /tmp/cm/tts)
#   PRODUKT             Name fuers Musik-Log  ·  OUT  Zieldatei  ·  PRESET  x264-Preset (Vorgabe medium)  ·  MUSIK_LOG_SCHREIBEN=0 schaltet das Log aus
#   TROCKEN=1           nur pruefen (Text, Sicherheitsrand, Musikwahl, Zuschnitt-Format) und den Filtergraphen drucken; nichts laden, nichts rendern
# Text: in drawtext kein ' : % \ | (und kein Emoji, kein ss-Zeichen ß); im Reel NIE Preis, CHF, Rabatt, Prozent, Lieferzeit, Tage, Werktage, Lieferung,
#       Sterne, Bewertung, gratis, wasserdicht, gesund, Schlaf, Augen, Limited, Designer, Echt (Text-Lint, Exit 2). Preis nur in der Caption.
# Sicherheitsrand (TikTok-Oberflaeche): aller Text nur in x 90 bis 930 und y 250 bis 1500 (unten 420 px und rechts 150 px frei); das Skript misst die
#       Textbreite mit der echten Schrift und bricht bei Verstoss mit Exit 2 ab.
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
fail() { echo "FEHLER: $*" >&2; exit 2; }

# ---------- Festwerte ----------
W=1080; H=1920; FPS=30
DAUER=11.0
SAFE_X0=90; SAFE_X1=930; SAFE_Y0=250; SAFE_Y1=1500
HOOK_MAX=16; ZEILE_MAX=28; END_MAX=28; SPRECH_MAX=160
HOOK_PX_MIN=96; TEXT_PX_MIN=56
SUB_CY=1340; MID_CY=1300   # Mitte der Untertitel / der Textbloecke (y)
FG_CY=1060; FEATHER=120   # Mitte des Vordergrunds (y) bei unscharfem Hintergrund; weiche Kante in px (2x-Standbild)
FONT_SERIF=/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf; FONT_SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
[ -f "$FONT_SERIF" ] && [ -f "$FONT_SANS" ] || fail "DejaVu-Schriften fehlen"
PY="${PYTHON:-python3.13}"
command -v "$PY" >/dev/null || fail "$PY fehlt"
"$PY" -I -c 'from PIL import ImageFont' 2>/dev/null || fail "Pillow fehlt in $PY (Textbreite wird damit gemessen)"
VERBOTEN="preis chf rabatt prozent lieferzeit tage werktage lieferung sterne bewertung gratis wasserdicht gesund schlaf augen limited designer echt"

# ---------- Textpruefung ----------
zeichen_ok() { "$PY" -I -c '
import sys
t = sys.argv[1]
bad = [c for c in t if c in "\x27:%\\|" or ord(c) < 32 or ord(c) > 0x24F or c == "ß"]
if bad:
    sys.stderr.write("verbotenes Zeichen: " + repr(bad[0]) + "\n"); sys.exit(1)
' "$1"; }
check_text() { # name wert max pflicht
  local n="$1" v="$2" max="$3" req="$4"
  if [ -z "$v" ]; then [ "$req" = 1 ] && fail "$n fehlt"; return 0; fi
  [ "${#v}" -le "$max" ] || fail "$n länger als $max Zeichen (${#v}): «$v»"
  zeichen_ok "$v" || fail "$n enthält ein verbotenes Zeichen (' : % \\ | Emoji ß): «$v»"
  local lc w; lc="$(printf '%s' "$v" | tr '[:upper:]' '[:lower:]')"
  for w in $VERBOTEN; do case "$lc" in *"$w"*) fail "$n enthält das verbotene Wort «$w»: «$v»" ;; esac; done
}
check_zeilen() { # name wert (Zeile1|Zeile2)
  local n="$1" v="$2" i=0 z; local -a teile
  [ -n "$v" ] || return 0
  IFS='|' read -r -a teile <<<"$v"
  for z in "${teile[@]}"; do i=$((i+1)); check_text "$n Zeile $i" "$z" "$ZEILE_MAX" 1; done
  [ "$i" -le 2 ] || fail "$n hat mehr als 2 Zeilen"
}

ARM="${ARM:-}"; case "$ARM" in stimme|text) ;; *) fail "ARM muss «stimme» oder «text» sein" ;; esac
HOOK1="${HOOK1:-}"; HOOK2="${HOOK2:-}"; ENDZEILE="${ENDZEILE:-LuxeStyle · luxestyle.ch}"
check_text HOOK1 "$HOOK1" "$HOOK_MAX" 1; check_text HOOK2 "$HOOK2" "$HOOK_MAX" 0; check_text ENDZEILE "$ENDZEILE" "$END_MAX" 1
HOOK_SATZ="$HOOK1${HOOK2:+ $HOOK2}"
SATZ_NUTZEN="${SATZ_NUTZEN:-}"; SATZ_BEWEIS="${SATZ_BEWEIS:-}"; SATZ_ENDE="${SATZ_ENDE:-}"
TEXT_NUTZEN="${TEXT_NUTZEN:-}"; TEXT_BEWEIS="${TEXT_BEWEIS:-}"; TEXT_ENDE="${TEXT_ENDE:-}"
SPRECHTEXT=""
if [ "$ARM" = stimme ]; then
  check_text SATZ_NUTZEN "$SATZ_NUTZEN" 80 1; check_text SATZ_BEWEIS "$SATZ_BEWEIS" 80 1; check_text SATZ_ENDE "$SATZ_ENDE" 80 1
  SPRECHTEXT="$HOOK_SATZ $SATZ_NUTZEN $SATZ_BEWEIS $SATZ_ENDE"
  [ "${#SPRECHTEXT}" -le "$SPRECH_MAX" ] || fail "Sprechtext länger als $SPRECH_MAX Zeichen (${#SPRECHTEXT})"
  case "$SPRECHTEXT" in *[0-9]*) fail "Sprechtext enthält Ziffern: Zahlen ausschreiben" ;; esac
  case "$HOOK_SATZ" in *[.!?]) ;; *) fail "Der Hook ist der erste gesprochene Satz und muss mit . ! oder ? enden" ;; esac
  for s in "$SATZ_NUTZEN" "$SATZ_BEWEIS" "$SATZ_ENDE"; do case "$s" in *[.!?]) ;; *) fail "Jeder Satz muss mit . ! oder ? enden: «$s»" ;; esac; done
else
  [ -z "$SATZ_NUTZEN$SATZ_BEWEIS$SATZ_ENDE" ] || fail "ARM=text kennt keine SATZ_*-Variablen (kein Ton ausser Musik)"
  check_zeilen TEXT_NUTZEN "$TEXT_NUTZEN"; check_zeilen TEXT_BEWEIS "$TEXT_BEWEIS"; check_zeilen TEXT_ENDE "$TEXT_ENDE"
  [ -n "$TEXT_NUTZEN" ] && [ -n "$TEXT_BEWEIS" ] || fail "ARM=text braucht TEXT_NUTZEN und TEXT_BEWEIS (2 bis 3 Textblöcke)"
fi

# ---------- Fotos, Zuschnitt, Zoom (Format pruefen) ----------
for i in 1 2 3 4; do
  eval "c=\${CROP$i:-}"; [ -z "$c" ] || [[ "$c" =~ ^[0-9]+:[0-9]+:[0-9]+:[0-9]+$ ]] || fail "CROP$i muss «x:y:breite:hoehe» sein: «$c»"
  eval "b=\${BILD$i:-}"; [ -n "$b" ] || fail "BILD$i fehlt"
  case "$b" in https://*) ;; /*|./*) [ "${TROCKEN:-0}" = 1 ] || [ -f "$b" ] || fail "BILD$i nicht gefunden: $b" ;; *) fail "BILD$i muss ein Pfad oder eine https-Adresse sein" ;; esac
done
zoom_vorgabe() { case "$1" in 1) echo "in:0.07:0.5:0.5" ;; 2) echo "out:0.06:0.5:0.5" ;; 3) echo "in:0.06:0.5:0.5" ;; *) echo "in:0.05:0.5:0.5" ;; esac; }
declare -A ZR ZB ZX ZY
for i in 1 2 3 4 5; do
  eval "z=\${ZOOM$i:-}"; [ -n "$z" ] || z="$(zoom_vorgabe "$i")"
  [[ "$z" =~ ^(in|out):0\.0[5-8]:(0|1|0\.[0-9]+):(0|1|0\.[0-9]+)$ ]] || fail "ZOOM$i muss «in|out:0.05..0.08:fx:fy» sein: «$z»"
  IFS=: read -r ZR[$i] ZB[$i] ZX[$i] ZY[$i] <<<"$z"
done

# ---------- Musik: Rotation, nie dasselbe wie das vorige ----------
MUSIK_DIR="${MUSIK_DIR:-$script_dir/music}"; MUSIK_LOG="${MUSIK_LOG:-$script_dir/musik-log.txt}"
tracks="mixkit-serene-view-443.mp3 mixkit-majestic-475.mp3 mixkit-dreamy-jazz-645.mp3 mixkit-new-york-427.mp3 mixkit-violin-uplift-675.mp3"
declare -A START=( [mixkit-serene-view-443.mp3]=16 [mixkit-majestic-475.mp3]=14 [mixkit-dreamy-jazz-645.mp3]=11 [mixkit-new-york-427.mp3]=24 [mixkit-violin-uplift-675.mp3]=9 )
musik_waehlen() {
  declare -A n lastpos; local last="" pos=0 t _ts _h best="" bc=999999 bp=999999 c p
  if [ -f "$MUSIK_LOG" ]; then
    while IFS=$'\t' read -r _ts _h t; do
      [ -z "${t:-}" ] && continue
      case " $tracks " in *" $t "*) ;; *) continue ;; esac
      pos=$((pos + 1)); n[$t]=$(( ${n[$t]:-0} + 1 )); lastpos[$t]=$pos; last="$t"
    done < "$MUSIK_LOG"
  fi
  for t in $tracks; do
    [ "$t" = "$last" ] && continue
    c=${n[$t]:-0}; p=${lastpos[$t]:-0}
    if [ "$c" -lt "$bc" ] || { [ "$c" -eq "$bc" ] && [ "$p" -lt "$bp" ]; }; then best="$t"; bc=$c; bp=$p; fi
  done
  printf '%s\n' "$best"
}
MUSIK="${MUSIK:-auto}"; if [ "$MUSIK" = auto ]; then MUSIK="$(musik_waehlen)"; fi
case "$MUSIK" in */*|"") fail "MUSIK muss ein Dateiname sein" ;; esac
music_path="$MUSIK_DIR/$MUSIK"; [ -f "$music_path" ] || fail "Musikdatei fehlt: $music_path"
mstart="${MUSIK_START:-${START[$MUSIK]:-0}}"; [[ "$mstart" =~ ^[0-9]+$ ]] || fail "MUSIK_START muss eine ganze Zahl sein: «$mstart»"
PRODUKT="${PRODUKT:-reel}"; OUT="${OUT:-./reel-v2.mp4}"; PRESET="${PRESET:-medium}"
STIMME="${STIMME:-de_DE-thorsten-high}"; PIPER_MODELLE="${PIPER_MODELLE:-/tmp/cm/tts}"
[[ "$STIMME" =~ ^de_DE-[a-z]+-(low|medium|high)$ ]] || fail "STIMME muss eine deutsche Piper-Stimme sein (z. B. de_DE-thorsten-high): «$STIMME»"

work="$(mktemp -d)"; trap 'rm -rf -- "$work"' EXIT

# ---------- Zeitplan ----------
# Szenengrenzen 2,6 / 5,5 / 8,5 / 9,8; Überblendung 0,4 s mittig; Clip-Längen 2,8 / 3,3 / 3,4 / 1,7 / 1,4 s = 84 / 99 / 102 / 51 / 42 Bilder, Summe 11,0 s
NF=(0 84 99 102 51 42); OFFSET=(0 2.4 5.3 8.3 9.6)
# Stimme: Startzeiten der vier Saetze und späteste Endzeiten (der Satz muss in seine Szene passen)
VSTART=(0.25 2.75 5.65 8.45); VENDE=(2.5 5.35 8.35 9.8)
if [ "$ARM" = stimme ]; then
  sentences=("$HOOK_SATZ" "$SATZ_NUTZEN" "$SATZ_BEWEIS" "$SATZ_ENDE")
  vdur=(0 0 0 0)
  if [ "${TROCKEN:-0}" = 1 ]; then for k in 0 1 2 3; do vdur[$k]="$(awk -v n="${#sentences[$k]}" 'BEGIN{printf "%.2f", n*0.065}')"; done
  else
    mdl="$PIPER_MODELLE/$STIMME.onnx"; [ -s "$mdl" ] && [ -s "$mdl.json" ] || fail "Piper-Modell fehlt: $mdl"
    command -v piper >/dev/null || fail "piper fehlt (pip install piper-tts)"
    for k in 0 1 2 3; do
      printf '%s' "${sentences[$k]}" | piper -m "$mdl" -f "$work/satz$k.wav" >/dev/null 2>&1 || fail "Piper konnte Satz $((k+1)) nicht sprechen"
      vdur[$k]="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$work/satz$k.wav")"
    done
  fi
  for k in 0 1 2 3; do
    awk -v s="${VSTART[$k]}" -v d="${vdur[$k]}" -v e="${VENDE[$k]}" 'BEGIN{exit !(s+d<=e)}' || fail "Satz $((k+1)) dauert ${vdur[$k]} s und endet nach ${VENDE[$k]} s (Start ${VSTART[$k]} s): kürzen"
  done
  awk -v s="${VSTART[0]}" 'BEGIN{exit !(s>=0.2)}' || fail "Sprache darf frühestens bei 0,2 s beginnen"
  if [ "${TROCKEN:-0}" != 1 ]; then for k in 0 1 2 3; do awk -v k="$((k+1))" -v s="${VSTART[$k]}" -v d="${vdur[$k]}" 'BEGIN{printf "Stimme Satz %d: Start %.2f s, Dauer %.2f s, Ende %.2f s\n", k, s, d, s+d}'; done; fi
fi

# ---------- Textlayout und Sicherheitsrand (Pillow misst mit der echten Schrift) ----------
cat > "$work/layout.py" <<'PYEOF'
import sys
from PIL import ImageFont
SAFE_X0, SAFE_X1, SAFE_Y0, SAFE_Y1 = (int(v) for v in sys.argv[1:5])
CX = (SAFE_X0 + SAFE_X1) // 2
out_graph, out_scrims = sys.argv[5], sys.argv[6]
fonts = {"serif": sys.argv[7], "sans": sys.argv[8]}
def die(msg):
    sys.stderr.write("FEHLER: " + msg + "\n"); sys.exit(2)
draw, scrims, report = [], [], []
for raw in sys.stdin.read().splitlines():
    if not raw.strip():
        continue
    bid, kind, start, end, fk, smin, smax, anchor, ay, bw, text = raw.split("\t")
    start, end, smin, smax, ay, bw = float(start), float(end), int(smin), int(smax), int(ay), int(bw)
    lines = text.split("|")
    size = None
    for s in range(smax, smin - 1, -2):
        f = ImageFont.truetype(fonts[fk], s)
        if max(f.getlength(l) for l in lines) + 2 * bw <= SAFE_X1 - SAFE_X0:
            size = s; break
    if size is None:
        w = max(ImageFont.truetype(fonts[fk], smin).getlength(l) for l in lines) + 2 * bw
        die(f"{bid}: Text zu breit für den Sicherheitsrand (x {SAFE_X0} bis {SAFE_X1}) schon bei {smin} px: {w:.0f} px > {SAFE_X1 - SAFE_X0}: «{'/'.join(lines)}»")
    f = ImageFont.truetype(fonts[fk], size)
    lh = round(size * 1.22); box_h = round(size * 1.2)
    total = (len(lines) - 1) * lh + box_h
    y0 = ay if anchor == "top" else (ay - total if anchor == "bottom" else ay - total // 2)
    if y0 < SAFE_Y0 or y0 + total > SAFE_Y1:
        die(f"{bid}: Text liegt ausserhalb des Sicherheitsrands (y {SAFE_Y0} bis {SAFE_Y1}): y {y0} bis {y0 + total}")
    fi = 0.15; fo = 0.15
    if kind == "hook":
        alpha = f"if(lt(t,{end - fo:.2f}),1,if(lt(t,{end:.2f}),({end:.2f}-t)/{fo},0))"
    elif kind == "end":
        alpha = f"if(lt(t,{start:.2f}),0,min(1,(t-{start:.2f})/0.35))"
    else:
        alpha = (f"if(lt(t,{start:.2f}),0,if(lt(t,{start + fi:.2f}),(t-{start:.2f})/{fi},"
                 f"if(lt(t,{end - fo:.2f}),1,if(lt(t,{end:.2f}),({end:.2f}-t)/{fo},0))))")
    en = f"between(t,{start:.2f},{end:.2f})" if kind != "end" else f"gte(t,{start:.2f})"
    col = "0xf3eee7" if kind == "end" else "white"
    for i, l in enumerate(lines):
        w = f.getlength(l) + 2 * bw
        x = round(CX - w / 2 + bw)  # Tintenbreite + Kontur liegt zentriert im Sicherheitsrand
        if x - bw < SAFE_X0 or x - bw + w > SAFE_X1:
            die(f"{bid}: Zeile ausserhalb des Sicherheitsrands: «{l}»")
        y = y0 + i * lh
        draw.append(f"drawtext=fontfile={fonts[fk]}:text='{l}':fontsize={size}:fontcolor={col}:x={x}:y={y}:borderw={bw}:bordercolor=black@0.92:"
                    f"shadowx=0:shadowy=4:shadowcolor=black@0.4:alpha='{alpha}':enable='{en}'")
    if kind != "end":
        sh = total + 360
        scrims.append(f"{bid}\t{start}\t{end}\t{y0 + total // 2 - sh // 2}\t{sh}\t{kind}")
    report.append(f"BLOCK {bid} size={size} y={y0}-{y0 + total} start={start} end={end} lines=" + "/".join(lines))
open(out_graph, "w").write(",\n".join(draw))
open(out_scrims, "w").write("\n".join(scrims) + ("\n" if scrims else ""))
print("\n".join(report))
PYEOF

blocks="$work/blocks.tsv"; : > "$blocks"
add_block() { printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$@" >> "$blocks"; }  # id kind start end font smin smax anchor y bw text
add_block hook hook 0 2.6 serif "$HOOK_PX_MIN" 112 top 330 8 "$HOOK1${HOOK2:+|$HOOK2}"
UNTERTITEL=""; [ "$ARM" = stimme ] && UNTERTITEL="$HOOK_SATZ"
wrap2() { # satz -> "Zeile1|Zeile2" (eine Zeile, wenn sie passt, sonst ausgewogener Umbruch; je Zeile hoechstens ZEILE_MAX Zeichen und im Sicherheitsrand; mehr als 2 Zeilen = Fehler)
  "$PY" -I - "$1" "$ZEILE_MAX" "$FONT_SANS" "$((SAFE_X1 - SAFE_X0))" <<'PYW'
import sys
from PIL import ImageFont
satz, mx, font, breit = sys.argv[1], int(sys.argv[2]), sys.argv[3], int(sys.argv[4])
f = ImageFont.truetype(font, 56)
def passt(z):
    return len(z) <= mx and f.getlength(z) + 2 * 6 <= breit
words = satz.split(" ")
lines = [satz] if passt(satz) else None
if lines is None:
    best = None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        if passt(a) and passt(b):
            score = max(len(a), len(b))
            if best is None or score < best[0]:
                best = (score, [a, b])
    if best is None:
        sys.stderr.write("FEHLER: Untertitel braucht mehr als 2 Zeilen oder ein Wort ist zu breit: " + satz + "\n"); sys.exit(2)
    lines = best[1]
if " ".join(lines) != satz:
    sys.stderr.write("FEHLER: Untertitel ungleich Sprechtext\n"); sys.exit(2)
print("|".join(lines))
PYW
}
if [ "$ARM" = stimme ]; then
  names=(nutzen beweis ende)
  for k in 1 2 3; do
    zl="$(wrap2 "${sentences[$k]}")" || exit 2
    s="${VSTART[$k]}"; e="$(awk -v s="${VSTART[$k]}" -v d="${vdur[$k]}" 'BEGIN{printf "%.2f", s+d+0.2}')"
    add_block "${names[$((k-1))]}" mid "$s" "$e" sans "$TEXT_PX_MIN" 60 center "$SUB_CY" 6 "$zl"
    UNTERTITEL="${UNTERTITEL:+$UNTERTITEL }${zl//|/ }"
  done
else
  add_block nutzen mid 2.7 5.4 sans "$TEXT_PX_MIN" 64 center "$MID_CY" 6 "$TEXT_NUTZEN"
  add_block beweis mid 5.6 8.4 sans "$TEXT_PX_MIN" 64 center "$MID_CY" 6 "$TEXT_BEWEIS"
  [ -z "$TEXT_ENDE" ] || add_block ende mid 8.55 9.75 sans "$TEXT_PX_MIN" 64 center "$SUB_CY" 6 "$TEXT_ENDE"
fi
add_block endkarte end 9.9 11.0 serif "$TEXT_PX_MIN" 60 center 900 6 "$ENDZEILE"
"$PY" -I "$work/layout.py" "$SAFE_X0" "$SAFE_X1" "$SAFE_Y0" "$SAFE_Y1" "$work/draw.ffg" "$work/scrims.tsv" "$FONT_SERIF" "$FONT_SANS" < "$blocks" > "$work/layout.txt" || exit 2

# ---------- Filtergraph ----------
zp() { # szene -> zoompan-Kette (Eingang ist ein 2x-Standbild 2160x3840)
  local i="$1" n="${NF[$1]}" z
  if [ "${ZR[$i]}" = in ]; then z="1+${ZB[$i]}*on/($n-1)"; else z="1+${ZB[$i]}-${ZB[$i]}*on/($n-1)"; fi
  printf "zoompan=z='%s':x='(iw-iw/zoom)*%s':y='(ih-ih/zoom)*%s':d=%d:s=%dx%d:fps=%d,format=yuv420p,setsar=1,settb=AVTB" "$z" "${ZX[$i]}" "${ZY[$i]}" "$n" "$W" "$H" "$FPS"
}
trans=(x slideleft fade wipeup fadeblack)
nsc=0; scrim_in=""; scrim_ids=()
while IFS=$'\t' read -r sid s0 s1 sy sh sk; do [ -z "$sid" ] && continue; nsc=$((nsc+1)); scrim_ids+=("$sid"); done < "$work/scrims.tsv"
{
  for i in 1 2 3 4 5; do printf '[%d:v]%s[s%d];\n' "$((i-1))" "$(zp "$i")" "$i"; done
  for i in 1 2 3 4; do
    if [ "$i" = 1 ]; then a="[s1]"; else a="[x$((i-1))]"; fi
    printf '%s[s%d]xfade=transition=%s:duration=0.4:offset=%s[x%d];\n' "$a" "$((i+1))" "${trans[$i]}" "${OFFSET[$i]}" "$i"
  done
  prev="[x4]"; k=0
  while IFS=$'\t' read -r sid s0 s1 sy sh sk; do
    [ -z "$sid" ] && continue
    if [ "$sk" = hook ]; then fadein=""; else fadein="fade=t=in:st=$s0:d=0.15:alpha=1,"; fi
    printf '[%d:v]format=rgba,%sfade=t=out:st=%s:d=0.15:alpha=1[sc%d];\n' "$((5+k))" "$fadein" "$(awk -v e="$s1" 'BEGIN{printf "%.2f", e-0.15}')" "$k"
    printf '%s[sc%d]overlay=x=0:y=%d:format=auto[o%d];\n' "$prev" "$k" "$sy" "$k"
    prev="[o$k]"; k=$((k+1))
  done < "$work/scrims.tsv"
  printf '%sdrawbox=x=420:y=820:w=180:h=3:color=0xf3eee7@0.85:t=fill:enable=gte(t\\,9.9),drawbox=x=420:y=980:w=180:h=3:color=0xf3eee7@0.85:t=fill:enable=gte(t\\,9.9),\n' "$prev"
  cat "$work/draw.ffg"
  printf ',\nformat=yuv420p,trim=duration=%s,setpts=PTS-STARTPTS[v];\n' "$DAUER"
} > "$work/g.ffgraph"
sed -i 's/;$/;/' "$work/g.ffgraph"

if [ "${TROCKEN:-0}" = 1 ]; then
  echo "ARM=$ARM"; echo "MUSIK=$MUSIK"; echo "START=$mstart"; echo "FORMAT=${W}x${H}@${FPS}"; echo "DAUER=$DAUER"
  echo "HOOK=$HOOK1${HOOK2:+|$HOOK2}"; echo "SPRECHTEXT=$SPRECHTEXT"; echo "UNTERTITEL=$UNTERTITEL"
  cat "$work/layout.txt"; echo "---"; cat "$work/g.ffgraph"; exit 0
fi

# ---------- Fotos holen, Standbilder bauen (2x, damit der Zoom ruhig laeuft) ----------
dims() { ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$1"; }
for i in 1 2 3 4; do
  eval "b=\${BILD$i}"; case "$b" in https://*) curl --fail --location --silent --show-error --max-time 60 --output "$work/b$i.img" "$b" || fail "BILD$i nicht ladbar"; src="$work/b$i.img" ;; *) src="$b" ;; esac
  d="$(dims "$src")" || fail "BILD$i ist kein Bild"; iw="${d%x*}"; ih="${d#*x}"
  eval "c=\${CROP$i:-}"; [ -n "$c" ] || c="0:0:$iw:$ih"; IFS=: read -r cx cy cw ch <<<"$c"
  [ $((cx + cw)) -le "$iw" ] && [ $((cy + ch)) -le "$ih" ] && [ "$cw" -gt 0 ] && [ "$ch" -gt 0 ] || fail "CROP$i liegt ausserhalb des Fotos (${iw}x${ih}): $c"
  # Vollbild nur, wenn der Ausschnitt 9:16 fuellt (4 % Toleranz) und mindestens 700 px breit ist; sonst Vordergrund auf unscharf gespiegeltem Hintergrund
  mode="$(awk -v w="$cw" -v h="$ch" 'BEGIN{r=w/h; print (r>=0.5400 && r<=0.5850 && w>=700) ? "fill" : "mirror"}')"
  if [ "$mode" = fill ]; then
    ffmpeg -hide_banner -loglevel error -nostdin -y -i "$src" -vf "crop=$cw:$ch:$cx:$cy,scale=2160:3840:force_original_aspect_ratio=increase:flags=lanczos,crop=2160:3840,setsar=1,format=rgb24" -frames:v 1 "$work/still$i.png" || fail "Standbild $i"
  else
    # Vordergrund in 1080x1560 einpassen, nie mehr als 2x hochziehen; Mitte bei y=1060 (der Hook liegt auf dem unscharfen Hintergrund, unten deckt die Oberflaeche), Kanten weich
    read -r fw fh < <(awk -v w="$cw" -v h="$ch" 'BEGIN{s=1080/w; t=1560/h; if(t<s)s=t; if(s>2)s=2; printf "%d %d\n", int(w*s*2/2+0.5)*2, int(h*s*2/2+0.5)*2}')
    mfl="color=c=white:s=1x$fh:d=1,format=gray,geq=lum='255*clip(min(Y,H-1-Y)/$FEATHER,0,1)',scale=$fw:$fh:flags=neighbor[mv];"
    if [ "$fw" -lt 2158 ]; then mfl+="color=c=white:s=${fw}x1:d=1,format=gray,geq=lum='255*clip(min(X,W-1-X)/$FEATHER,0,1)',scale=$fw:$fh:flags=neighbor[mh];[mv][mh]blend=all_mode=multiply[mk];"; else mfl+="[mv]null[mk];"; fi
    ffmpeg -hide_banner -loglevel error -nostdin -y -i "$src" -filter_complex "[0:v]crop=$cw:$ch:$cx:$cy,split=2[a][b];[a]scale=270:480:force_original_aspect_ratio=increase:flags=bilinear,crop=270:480,hflip,boxblur=10:3,scale=2160:3840:flags=bicubic,gblur=sigma=18:steps=2,eq=brightness=-0.16:saturation=1.05[bg];[b]scale=$fw:$fh:flags=lanczos,format=rgba[fg0];${mfl}[fg0][mk]alphamerge[fg];[bg][fg]overlay=(W-w)/2:$((FG_CY*2))-h/2,format=rgb24" -frames:v 1 "$work/still$i.png" || fail "Standbild $i"
  fi
  echo "Szene $i: $mode (${cw}x${ch} aus ${iw}x${ih})"
done
# Endkarte: dunkel, unscharf, Markenfarbe
ffmpeg -hide_banner -loglevel error -nostdin -y -i "$work/still4.png" -vf "scale=108:192,boxblur=4:2,scale=2160:3840:flags=bicubic,eq=brightness=-0.30:saturation=0.8,drawbox=x=0:y=0:w=iw:h=ih:color=0x302a25@0.62:t=fill,format=rgb24" -frames:v 1 "$work/still5.png" || fail "Standbild 5"
# Scrims (weicher dunkler Verlauf hinter dem Text)
k=0; scrim_args=()
while IFS=$'\t' read -r sid s0 s1 sy sh sk; do
  [ -z "$sid" ] && continue
  ffmpeg -hide_banner -loglevel error -nostdin -y -f lavfi -i "color=c=black@0.0:s=${W}x${sh}:d=1,format=rgba,geq=r='0':g='0':b='0':a='128*pow(sin(PI*Y/H),1.4)'" -frames:v 1 "$work/scrim$k.png" || fail "Scrim $sid"
  scrim_args+=(-loop 1 -framerate "$FPS" -t 11.5 -i "$work/scrim$k.png"); k=$((k+1))
done < "$work/scrims.tsv"

# ---------- Ton ----------
lufs() { ffmpeg -hide_banner -nostats -i "$1" -af ebur128=peak=true -f null - 2>&1 | awk '/Summary:/{s=1} s && $1=="I:"{print $2; exit}'; }
tpeak() { ffmpeg -hide_banner -nostats -i "$1" -af ebur128=peak=true -f null - 2>&1 | awk '/Summary:/{s=1} s && /True peak:/{t=1} s && t && $1=="Peak:"{print $2; exit}'; }
ffmpeg -hide_banner -loglevel error -nostdin -y -ss "$mstart" -t 11.8 -i "$music_path" -ac 2 -ar 48000 -c:a pcm_f32le "$work/music_raw.wav" || fail "Musik nicht lesbar"
FADES="afade=t=out:st=9.8:d=1.2"
if [ "$ARM" = text ]; then
  ZIEL=-22
  ffmpeg -hide_banner -loglevel error -nostdin -y -i "$work/music_raw.wav" -af "afade=t=in:st=0:d=0.3,$FADES" -c:a pcm_f32le "$work/pre.wav"
else
  ZIEL=-17
  # Stimme: Saetze einzeln mit adelay setzen, auf -16 LUFS bringen; Musik als Bett (-27 LUFS) mit Ducking unter der Stimme
  inp=(); fl=""
  for k in 0 1 2 3; do inp+=(-i "$work/satz$k.wav"); ms="$(awk -v s="${VSTART[$k]}" 'BEGIN{printf "%d", s*1000}')"; fl+="[$k:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[v$k];"; done
  ffmpeg -hide_banner -loglevel error -nostdin -y "${inp[@]}" -filter_complex "${fl}[v0][v1][v2][v3]amix=inputs=4:normalize=0:duration=longest,apad=whole_dur=11.8,atrim=duration=11.8[vo]" -map '[vo]' -c:a pcm_f32le "$work/voice_raw.wav" || fail "Stimmenspur"
  lv="$(lufs "$work/voice_raw.wav")"; lm="$(lufs "$work/music_raw.wav")"
  gv="$(awk -v l="$lv" 'BEGIN{printf "%.2f", -16-l}')"; gm="$(awk -v l="$lm" 'BEGIN{printf "%.2f", -27-l}')"
  ffmpeg -hide_banner -loglevel error -nostdin -y -i "$work/music_raw.wav" -i "$work/voice_raw.wav" -filter_complex "[0:a]volume=${gm}dB[m];[1:a]volume=${gv}dB,asplit=2[vs][vm];[m][vs]sidechaincompress=threshold=0.02:ratio=9:attack=20:release=450:makeup=1[md];[md][vm]amix=inputs=2:normalize=0:duration=first,afade=t=in:st=0:d=0.2,$FADES[mx]" -map '[mx]' -c:a pcm_f32le "$work/pre.wav" || fail "Mix"
fi
lp="$(lufs "$work/pre.wav")"; [ -n "$lp" ] || fail "Lautheit nicht messbar"
LIMIT=0.80
mkfinal() { ffmpeg -hide_banner -loglevel error -nostdin -y -i "$work/pre.wav" -af "volume=${1}dB,alimiter=limit=$LIMIT:attack=5:release=80:level=0" -c:a pcm_f32le "$work/mix_final.wav"; }
g="$(awk -v z="$ZIEL" -v l="$lp" 'BEGIN{printf "%.2f", z-l}')"; mkfinal "$g"
lf="$(lufs "$work/mix_final.wav")"
if awk -v z="$ZIEL" -v l="$lf" 'BEGIN{d=l-z; if(d<0)d=-d; exit !(d>0.4)}'; then g="$(awk -v g="$g" -v z="$ZIEL" -v l="$lf" 'BEGIN{printf "%.2f", g+(z-l)}')"; mkfinal "$g"; lf="$(lufs "$work/mix_final.wav")"; fi
echo "Ton: Ziel ${ZIEL} LUFS, vor dem MP4 gemessen ${lf} LUFS (Gain ${g} dB)"

# ---------- Render ----------
mkdir -p "$(dirname -- "$OUT")"
ffmpeg -hide_banner -loglevel warning -nostdin -y -filter_complex_threads 2 \
  -i "$work/still1.png" -i "$work/still2.png" -i "$work/still3.png" -i "$work/still4.png" -i "$work/still5.png" "${scrim_args[@]}" \
  -i "$work/mix_final.wav" -filter_complex_script "$work/g.ffgraph" -map '[v]' -map "$((5+nsc)):a" -t "$DAUER" \
  -c:v libx264 -preset "$PRESET" -crf 18 -pix_fmt yuv420p -r "$FPS" -threads 4 -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart \
  -metadata title="LuxeStyle $PRODUKT - Reel v2 ($ARM)" "$OUT" || fail "Render"
if [ "${MUSIK_LOG_SCHREIBEN:-1}" = 1 ]; then printf '%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$PRODUKT" "$MUSIK" >> "$MUSIK_LOG"; fi
echo "Musik: $MUSIK (ab Sekunde $mstart)${SPRECHTEXT:+; Stimme: $STIMME}"
echo "Lautheit MP4: $(lufs "$OUT") LUFS, True Peak $(tpeak "$OUT") dBTP"
ffprobe -v error -show_entries stream=codec_name,width,height,avg_frame_rate,pix_fmt,duration:format=duration,size -of default=nw=1 "$OUT"
