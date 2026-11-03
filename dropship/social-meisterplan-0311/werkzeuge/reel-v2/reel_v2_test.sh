#!/usr/bin/env bash
# Test der Reel-Vorlage v2. Trockenlaeufe (schnell, kein Render) + echter Render (Format, Laenge, Bildrate, Ton, Lautheit, Hook in Bild 0).
# REEL_SCRIPT=<Pfad>  anderes Skript pruefen (Mutationsprobe)  ·  FAIL_FAST=1  beim ersten Fehler abbrechen  ·  TEST_STIMME=1  zusaetzlich ARM=stimme rendern (Piper)
# TEST_RENDER=0  Render-Teil auslassen
set -uo pipefail
dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="${REEL_SCRIPT:-$dir/reel_v2.sh}"
tmp="$(mktemp -d)"; trap 'rm -rf -- "$tmp"' EXIT
IMG="${TEST_IMG:-/tmp/sm-v2/img}"
export MUSIK_DIR="${MUSIK_DIR:-/tmp/sm-v2/music}" MUSIK_LOG="$tmp/log.txt" MUSIK_LOG_SCHREIBEN=0
fehler=0; n=0
ok()  { n=$((n+1)); echo "ok:   $1"; }
bad() { n=$((n+1)); fehler=$((fehler+1)); echo "FEHLER: $1"; if [ "${FAIL_FAST:-0}" = 1 ]; then echo "reel_v2_test: abgebrochen beim ersten Fehler (FAIL_FAST)"; exit 1; fi; }

basis() { # Grundeinstellung je Arm
  export BILD1="$IMG/spk_1999782621132.jpg" BILD2="$IMG/spk_2076107127183.jpg" BILD3="$IMG/spk_2076107127183.jpg" BILD4="$IMG/spk_1999782621132.jpg"
  export CROP1="0:0:800:765" CROP3="130:20:540:620" CROP4="180:30:440:560"
  export HOOK1="Farbiges Licht" HOOK2="im Wasser" PRODUKT="Test" OUT="$tmp/t.mp4" PRESET=ultrafast
  if [ "$1" = text ]; then
    export ARM=text TEXT_NUTZEN="Das Licht läuft|synchron zur Musik" TEXT_BEWEIS="Zwei Kanäle|und 3D-Ton" TEXT_ENDE="Farben können vom|Foto abweichen"
  else
    export ARM=stimme HOOK2="im Wasser." SATZ_NUTZEN="Weiches, blendfreies Licht." SATZ_BEWEIS="Das Oberteil schwebt dank Magnettechnik." SATZ_ENDE="Steckdose nötig."
  fi
}
trocken() { ( arm="$1"; shift; basis "$arm"; for kv in "$@"; do export "$kv"; done; export TROCKEN=1; bash "$SCRIPT" ) }
exit_code() { local rc; trocken "$@" >"$tmp/out.txt" 2>"$tmp/err.txt"; rc=$?; echo "$rc"; }
soll_exit2() { # beschreibung arm VAR=wert...
  local d="$1"; shift; local rc; rc="$(exit_code "$@")"
  [ "$rc" = 2 ] && ok "Exit 2: $d" || bad "kein Exit 2 (rc=$rc): $d"
}

# ---------- 1. Grundfaelle ----------
[ "$(exit_code text)" = 0 ] && ok "Grundfall ARM=text läuft (Trockenlauf)" || bad "Grundfall ARM=text: $(cat "$tmp/err.txt")"
trocken text > "$tmp/text.txt" 2>&1
[ "$(exit_code stimme)" = 0 ] && ok "Grundfall ARM=stimme läuft (Trockenlauf)" || bad "Grundfall ARM=stimme: $(cat "$tmp/err.txt")"
trocken stimme > "$tmp/stimme.txt" 2>&1

# ---------- 2. Format im Filtergraphen ----------
for f in text stimme; do
  grep -q '^FORMAT=1080x1920@30$' "$tmp/$f.txt" && ok "$f: Format 1080x1920@30" || bad "$f: FORMAT nicht 1080x1920@30"
  [ "$(grep -c 's=1080x1920:fps=30' "$tmp/$f.txt")" = 5 ] && ok "$f: fünf Szenen 1080x1920 mit 30 fps im Graphen" || bad "$f: Szenen nicht alle 1080x1920@30"
  grep -q '^DAUER=11.0$' "$tmp/$f.txt" && ok "$f: Dauer 11,0 s" || bad "$f: DAUER nicht 11.0"
done

# ---------- 3. Zeitplan, Zoom, Uebergaenge (aus dem Graphen gerechnet, unabhaengig vom Skript) ----------
python3.13 -I - "$tmp/text.txt" > "$tmp/plan.txt" 2>&1 <<'PY'
import re, sys
g = open(sys.argv[1], encoding="utf-8").read().split("---\n", 1)[1]
d = [int(x) for x in re.findall(r"zoompan=[^\n]*?:d=(\d+):s=1080x1920:fps=30", g)]
xf = re.findall(r"xfade=transition=(\w+):duration=([\d.]+):offset=([\d.]+)", g)
print("szenen", len(d), "frames_summe", sum(d))
print("uebergaenge", len(xf), "arten", len({t for t, _, _ in xf}))
frames = sum(d) - sum(round(float(dur) * 30) for _, dur, _ in xf)
print("gesamt_s", round(frames / 30, 3))
lauf = d[0]; okfolge = True
for i, (_, dur, off) in enumerate(xf):
    if abs(float(off) - (lauf / 30 - float(dur))) > 0.011: okfolge = False
    lauf = lauf + d[i + 1] - round(float(dur) * 30)
print("offsets_stimmig", okfolge)
zs = re.findall(r"zoompan=z='1\+([\d.]+)", g)
print("zoom", " ".join(zs))
print("grenzen", " ".join(f"{float(o) + 0.2:.1f}" for _, _, o in xf))
PY
grep -q '^szenen 5 ' "$tmp/plan.txt" && ok "fünf Szenen (Hook, Nutzen, Beweis, Schluss, Endkarte)" || bad "Szenenzahl: $(cat "$tmp/plan.txt")"
grep -q '^gesamt_s 11.0$' "$tmp/plan.txt" && ok "Bildzahl ergibt 11,0 s (Summe der Clips minus Überblendungen)" || bad "Gesamtlänge laut Graph: $(grep gesamt "$tmp/plan.txt")"
grep -q '^offsets_stimmig True$' "$tmp/plan.txt" && ok "xfade-Offsets passen zu den Clip-Längen" || bad "xfade-Offsets unstimmig"
grep -q '^grenzen 2.6 5.5 8.5 9.8$' "$tmp/plan.txt" && ok "Szenengrenzen 2,6 / 5,5 / 8,5 / 9,8 s" || bad "Szenengrenzen: $(grep grenzen "$tmp/plan.txt")"
a="$(grep '^uebergaenge' "$tmp/plan.txt" | awk '{print $4}')"; [ "${a:-0}" -ge 3 ] && ok "mindestens drei verschiedene Überblendungsarten ($a)" || bad "zu wenig verschiedene Überblendungen ($a)"
zok=1; for z in $(grep '^zoom ' "$tmp/plan.txt" | cut -d' ' -f2-); do awk -v z="$z" 'BEGIN{exit !(z>=0.05 && z<=0.08)}' || zok=0; done
[ "$zok" = 1 ] && ok "Ken-Burns-Zoom je Szene 5 bis 8 %" || bad "Zoom ausserhalb 5 bis 8 %: $(grep '^zoom ' "$tmp/plan.txt")"

# ---------- 4. Hook, Textgroesse, Sicherheitsrand (eigene Messung mit Pillow aus dem gedruckten Graphen) ----------
for f in text stimme; do
python3.13 -I - "$tmp/$f.txt" > "$tmp/text_$f.txt" 2>&1 <<'PY'
import re, sys
from PIL import ImageFont
g = open(sys.argv[1], encoding="utf-8").read().split("---\n", 1)[1]
dts = re.findall(r"drawtext=fontfile=(\S+?):text='([^']*)':fontsize=(\d+):fontcolor=\S+?:x=(-?\d+):y=(-?\d+):borderw=(\d+):.*?enable='([^']*)'", g)
bad = 0; hook = []; minsub = 999
for font, text, size, x, y, bw, en in dts:
    size, x, y, bw = int(size), int(x), int(y), int(bw)
    w = ImageFont.truetype(font, size).getlength(text)
    if x - bw < 90 or x + w + bw > 930 or y < 250 or y + size * 1.2 > 1500:
        bad += 1; print("AUSSERHALB", text, x, y, size, round(w))
    if "between(t,0.00,2.60)" in en: hook.append((text, size))
    elif "gte(t,9.90)" not in en: minsub = min(minsub, size)
print("drawtexte", len(dts), "ausserhalb", bad)
print("hook_zeilen", len(hook), "hook_min_px", min(s for _, s in hook) if hook else 0, "hook_max_zeichen", max(len(t) for t, _ in hook) if hook else 0)
print("text_min_px", minsub)
print("hook_beginnt_bei_0", bool(re.search(r"between\(t,0\.00,2\.60\)", g)))
al = re.findall(r"text='" + re.escape(hook[0][0]) + r"'[^\n]*?alpha='([^']*)'", g) if hook else []
print("hook_alpha_bei_0", ("if(lt(t,2.45),1," in al[0]) if al else False)
PY
grep -q '^drawtexte [0-9]* ausserhalb 0$' "$tmp/text_$f.txt" && ok "$f: aller Text liegt in x 90 bis 930 und y 250 bis 1500 (eigene Messung)" || bad "$f: Text ausserhalb des Sicherheitsrands: $(cat "$tmp/text_$f.txt")"
read -r _ hz _ hm _ hc < <(grep '^hook_zeilen' "$tmp/text_$f.txt")
[ "${hz:-0}" -ge 1 ] && [ "${hz:-0}" -le 2 ] && ok "$f: Hook hat höchstens 2 Zeilen ($hz)" || bad "$f: Hook-Zeilen: $hz"
[ "${hm:-0}" -ge 96 ] && ok "$f: Hook mindestens 96 px ($hm)" || bad "$f: Hook kleiner als 96 px ($hm)"
[ "${hc:-99}" -le 16 ] && ok "$f: Hook-Zeile höchstens 16 Zeichen ($hc)" || bad "$f: Hook-Zeile zu lang ($hc)"
read -r _ tm < <(grep '^text_min_px' "$tmp/text_$f.txt")
[ "${tm:-0}" -ge 56 ] && ok "$f: Untertitel/Textblöcke mindestens 56 px ($tm)" || bad "$f: Text kleiner als 56 px ($tm)"
grep -q '^hook_beginnt_bei_0 True$' "$tmp/text_$f.txt" && grep -q '^hook_alpha_bei_0 True$' "$tmp/text_$f.txt" && ok "$f: Hook steht schon in Bild 0 (enable ab 0,00 s, Alpha 1 ohne Einblenden)" || bad "$f: Hook nicht ab Bild 0 voll sichtbar"
done

# ---------- 5. Untertitel = Sprechtext ----------
sp="$(grep '^SPRECHTEXT=' "$tmp/stimme.txt" | cut -d= -f2-)"; ut="$(grep '^UNTERTITEL=' "$tmp/stimme.txt" | cut -d= -f2-)"
[ -n "$sp" ] && [ "$sp" = "$ut" ] && ok "Untertitel (inkl. Hook) gleich Sprechtext Zeichen für Zeichen" || bad "Untertitel ungleich Sprechtext: «$ut» gegen «$sp»"
# gedruckte Zeilen des Graphen zusammensetzen und mit dem Sprechtext vergleichen (nicht nur die Selbstauskunft des Skripts)
zl="$(python3.13 -I - "$tmp/stimme.txt" <<'PY'
import re, sys
g = open(sys.argv[1], encoding="utf-8").read().split("---\n", 1)[1]
rows = []
for m in re.finditer(r"drawtext=fontfile=\S+?:text='([^']*)':fontsize=\d+:fontcolor=\S+?:x=-?\d+:y=(-?\d+):.*?enable='between\(t,([\d.]+),([\d.]+)\)'", g):
    rows.append((float(m.group(3)), int(m.group(2)), m.group(1)))
rows.sort()
print(" ".join(t for _, _, t in rows))
PY
)"
[ "$zl" = "$sp" ] && ok "aus dem Graphen gelesene Bildschirmzeilen (Hook + Untertitel) = Sprechtext" || bad "Graphzeilen «$zl» gegen Sprechtext «$sp»"
[ "${#sp}" -le 160 ] && ok "Sprechtext höchstens 160 Zeichen (${#sp})" || bad "Sprechtext zu lang (${#sp})"
case "$sp" in *[0-9]*) bad "Sprechtext enthält Ziffern" ;; *) ok "Sprechtext ohne Ziffern (Zahlen ausgeschrieben)" ;; esac
awk '/^BLOCK (nutzen|beweis|ende) /{ if (match($0,/start=[0-9.]+/)) {s=substr($0,RSTART+6,RLENGTH-6); if (s+0<0.2) f=1} } END{exit f}' "$tmp/stimme.txt" && ok "Untertitel/Sprache beginnen nicht vor 0,2 s" || bad "Sprache beginnt vor 0,2 s"
maxz="$(grep '^BLOCK ' "$tmp/stimme.txt" | grep -v 'hook\|endkarte' | sed 's/.*lines=//' | tr '/' '\n' | awk '{ if (length($0)>m) m=length($0) } END{print m+0}')"
[ "$maxz" -le 28 ] && ok "Untertitelzeilen höchstens 28 Zeichen ($maxz)" || bad "Untertitelzeile $maxz Zeichen"
zeilen="$(grep '^BLOCK ' "$tmp/stimme.txt" | grep -v 'hook\|endkarte' | awk -F'lines=' '{ n=split($2,a,"/"); if (n>m) m=n } END{print m+0}')"
[ "$zeilen" -le 2 ] && ok "Untertitel höchstens 2 Zeilen ($zeilen)" || bad "Untertitel mit $zeilen Zeilen"

# ---------- 6. Text-Lint: Gegenproben ----------
for w in Preis CHF Rabatt Prozent Lieferzeit Tage Werktage Lieferung Sterne Bewertung gratis wasserdicht gesund Schlaf Augen Limited Designer Echt; do
  soll_exit2 "verbotenes Wort «$w» im Hook" text "HOOK2=Das ist $w"
done
soll_exit2 "verbotenes Wort als Teil eines Wortes (Schlafzimmer)" text "TEXT_NUTZEN=Licht fürs Schlafzimmer"
soll_exit2 "verbotenes Wort klein geschrieben (preis) im Text" text "TEXT_BEWEIS=zum kleinen preis"
soll_exit2 "verbotenes Wort in der Endzeile" text "ENDZEILE=Gratis · luxestyle.ch"
soll_exit2 "verbotenes Wort im gesprochenen Satz" stimme "SATZ_BEWEIS=Mit Lieferung nach Hause."
[ "$(exit_code text "HOOK2=ganz leicht")" = 0 ] && ok "Gegenprobe: harmloser Text läuft durch" || bad "harmloser Text abgelehnt: $(cat "$tmp/err.txt")"
for z in "'" ":" "%" "\\" "|"; do soll_exit2 "verbotenes Zeichen «$z» (Hook)" text "HOOK2=im${z}Licht"; soll_exit2 "verbotenes Zeichen «$z» (Satz)" stimme "SATZ_ENDE=Steckdose${z}nötig."; done
for z in "'" ":" "%" "\\"; do soll_exit2 "verbotenes Zeichen «$z» (Textzeile)" text "TEXT_NUTZEN=Licht${z}Musik"; done
soll_exit2 "Emoji im Text" text "TEXT_NUTZEN=Licht 🎵"
soll_exit2 "ß statt ss (Schweizer Rechtschreibung)" text "TEXT_NUTZEN=Weißes Licht"
soll_exit2 "Ziffern im Sprechtext" stimme "SATZ_NUTZEN=Drei Stufen, 3 Stück."

# ---------- 7. Laengen und Sicherheitsrand ----------
soll_exit2 "Hook-Zeile 17 Zeichen" text "HOOK1=ABCDEFGHIJKLMNOPQ"
soll_exit2 "Hook-Zeile 17 schmale Zeichen (passt in die Breite, ist aber zu lang)" text "HOOK1=iiiiiiiiiiiiiiiii"
soll_exit2 "Endzeile 29 schmale Zeichen" text "ENDZEILE=iiiiiiiiiiiiiiiiiiiiiiiiiiiii"
soll_exit2 "Textzeile 29 schmale Zeichen" text "TEXT_NUTZEN=iiiiiiiiiiiiiiiiiiiiiiiiiiiii"
soll_exit2 "Textzeile 28 mal M: bei 56 px zu breit (Mindestgrösse darf nicht unterschritten werden)" text "TEXT_BEWEIS=MMMMMMMMMMMMMMMMMMMMMMMMMMMM"
[ "$(exit_code text "HOOK1=iiiiiiiiiiiiiiii")" = 0 ] && ok "Gegenprobe: Hook-Zeile mit genau 16 schmalen Zeichen ist erlaubt" || bad "16 Zeichen abgelehnt: $(cat "$tmp/err.txt")"
soll_exit2 "Endzeile 29 Zeichen" text "ENDZEILE=LuxeStyle luxestyle.ch heute!"
soll_exit2 "Textzeile 29 Zeichen" text "TEXT_NUTZEN=aaaa bbbb cccc dddd eeee ffff g"
soll_exit2 "drei Textzeilen" text "TEXT_NUTZEN=a|b|c"
soll_exit2 "Sprechtext über 160 Zeichen" stimme "SATZ_NUTZEN=Weiches blendfreies Licht für Zuhause und Büro. Sehr schön." "SATZ_BEWEIS=Das Oberteil schwebt dank Magnettechnik in der Luft und bleibt dort." "SATZ_ENDE=Eine Steckdose wird benötigt, sonst nichts weiter."
soll_exit2 "Hook zu breit für den Sicherheitsrand (16 mal W)" text "HOOK1=WWWWWWWWWWWWWWWW"
soll_exit2 "Textzeile zu breit für den Sicherheitsrand (28 mal W)" text "TEXT_BEWEIS=WWWWWWWWWWWWWWWWWWWWWWWWWWWW"
soll_exit2 "Untertitel braucht mehr als zwei Zeilen" stimme "SATZ_BEWEIS=Das Oberteil schwebt dank Magnettechnik wirklich lange und ruhig durch den Raum."
soll_exit2 "Satz ohne Satzzeichen am Ende" stimme "SATZ_ENDE=Steckdose nötig"
soll_exit2 "Satz zu lang für seine Szene (Schätzung)" stimme "SATZ_ENDE=Steckdose wird dafür gebraucht."

# ---------- 8. Eingaben ----------
soll_exit2 "ARM unbekannt" text "ARM=beides"
soll_exit2 "ARM=text mit SATZ_*" text "SATZ_ENDE=Nein."
soll_exit2 "Zoom 20 Prozent" text "ZOOM1=in:0.20:0.5:0.5"
soll_exit2 "Zoom 3 Prozent" text "ZOOM2=in:0.03:0.5:0.5"
soll_exit2 "Zuschnitt falsch geschrieben" text "CROP1=1:2:3"
soll_exit2 "MUSIK mit Pfad" text "MUSIK=../etc/passwd"
soll_exit2 "Stimme nicht deutsch" stimme "STIMME=en_US-amy-low"
soll_exit2 "BILD ohne Pfad/https" text "BILD2=foto.jpg"

# ---------- 9. Musikrotation ----------
wahl() { trocken text 2>/dev/null | sed -n 's/^MUSIK=//p'; }
liste=(mixkit-serene-view-443.mp3 mixkit-majestic-475.mp3 mixkit-dreamy-jazz-645.mp3 mixkit-new-york-427.mp3 mixkit-violin-uplift-675.mp3)
rm -f "$tmp/log.txt"; [ "$(wahl)" = "${liste[0]}" ] && ok "leeres Log: erstes Stück" || bad "Musikwahl bei leerem Log"
printf 't\tp\t%s\n' "${liste[0]}" > "$tmp/log.txt"; w="$(wahl)"; [ -n "$w" ] && [ "$w" != "${liste[0]}" ] && ok "nie dasselbe Stück wie das vorige ($w nach ${liste[0]})" || bad "dasselbe Stück zweimal hintereinander oder keine Wahl («$w»)"
# Gegenprobe: das letzte Stück hat den kleinsten Zähler, trotzdem darf es nicht kommen
: > "$tmp/log.txt"; for t in "${liste[@]:1}" "${liste[@]:1}" "${liste[0]}"; do printf 't\tp\t%s\n' "$t" >> "$tmp/log.txt"; done
w="$(wahl)"; [ -n "$w" ] && [ "$w" != "${liste[0]}" ] && ok "letztes Stück ausgeschlossen, auch wenn es das seltenste ist ($w)" || bad "letztes Stück gewählt, obwohl es das vorige war (seltenstes) oder keine Wahl («$w»)"
: > "$tmp/log.txt"; seq=""; for i in 1 2 3 4 5 6; do m="$(wahl)"; seq="$seq $m"; printf 't\tp\t%s\n' "$m" >> "$tmp/log.txt"; done
[ "$(echo $seq | tr ' ' '\n' | sort -u | wc -l)" -ge 4 ] && ok "sechs Wahlen verteilen sich auf mindestens 4 Stücke" || bad "Rotation verteilt schlecht:$seq"
rm -f "$tmp/log.txt"

# ---------- 10. Render ----------
if [ "${TEST_RENDER:-1}" = 1 ]; then
  for f in "$IMG/spk_1999782621132.jpg" "$IMG/spk_2076107127183.jpg"; do [ -f "$f" ] || bad "Testbild fehlt: $f"; done
  lufs() { ffmpeg -hide_banner -nostats -i "$1" -af ebur128=peak=true -f null - 2>&1 | awk '/Summary:/{s=1} s && $1=="I:"{print $2; exit}'; }
  tpk()  { ffmpeg -hide_banner -nostats -i "$1" -af ebur128=peak=true -f null - 2>&1 | awk '/Summary:/{s=1} s && /True peak:/{t=1} s && t && $1=="Peak:"{print $2; exit}'; }
  render_pruefen() { # datei arm lufs_ziel
    local mp="$1" arm="$2" ziel="$3" v d a ad l t
    v="$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,avg_frame_rate,pix_fmt -of csv=p=0 "$mp")"
    [ "$v" = "h264,1080,1920,yuv420p,30/1" ] && ok "$arm: H.264, 1080x1920, 30 fps, yuv420p (ffprobe: $v)" || bad "$arm: Videoformat falsch: $v"
    d="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$mp")"
    awk -v d="$d" 'BEGIN{exit !(d>=10.0 && d<=12.0)}' && ok "$arm: Länge $d s (10 bis 12 s)" || bad "$arm: Länge $d s"
    awk -v d="$d" 'BEGIN{exit !(d>=10.9 && d<=11.1)}' && ok "$arm: Länge nahe 11,0 s" || bad "$arm: Länge nicht 11,0 s: $d"
    a="$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -of csv=p=0 "$mp")"
    [ "$a" = "aac,48000,2" ] && ok "$arm: Tonspur vorhanden (AAC, 48 kHz, stereo)" || bad "$arm: keine/andere Tonspur: «$a»"
    ad="$(ffprobe -v error -select_streams a:0 -show_entries stream=duration -of csv=p=0 "$mp")"
    awk -v d="${ad:-0}" 'BEGIN{exit !(d>=10.8)}' && ok "$arm: Tonspur $ad s lang" || bad "$arm: Tonspur zu kurz (${ad:-keine})"
    l="$(lufs "$mp")"; t="$(tpk "$mp")"
    awk -v l="${l:-0}" -v z="$ziel" 'BEGIN{d=l-z; if(d<0)d=-d; exit !(d<=1.2)}' && ok "$arm: Lautheit $l LUFS (Ziel $ziel ± 1,2)" || bad "$arm: Lautheit $l LUFS, Ziel $ziel"
    awk -v t="${t:-0}" 'BEGIN{exit !(t<=-1.0)}' && ok "$arm: True Peak $t dBTP (höchstens -1)" || bad "$arm: True Peak $t dBTP"
  }
  ( basis text; export OUT="$tmp/text.mp4"; bash "$SCRIPT" > "$tmp/render_text.log" 2>&1 ) || bad "Render ARM=text schlug fehl: $(tail -3 "$tmp/render_text.log")"
  if [ -f "$tmp/text.mp4" ]; then
    render_pruefen "$tmp/text.mp4" text -22
    # Hook in Bild 0: helle Pixel im Hook-Streifen (x 90..930, y 330..600) bei 0,0 s, deutlich weniger bei 3,3 s (Hook ist weg)
    for t in 0.0 3.3; do ffmpeg -hide_banner -loglevel error -nostdin -y -ss "$t" -i "$tmp/text.mp4" -frames:v 1 "$tmp/fr_$t.png"; done
    h="$(python3.13 -I - "$tmp/fr_0.0.png" "$tmp/fr_3.3.png" <<'PY'
import sys
from PIL import Image
def weiss(p):
    im = Image.open(p).convert("L").crop((90, 330, 930, 600))
    return sum(1 for v in im.tobytes() if v > 235)
print(weiss(sys.argv[1]), weiss(sys.argv[2]))
PY
)"
    read -r w0 w1 <<<"$h"
    [ "${w0:-0}" -ge 3000 ] && [ "${w0:-0}" -ge $(( ${w1:-0} * 3 )) ] && ok "Frame 0 zeigt den Hook (helle Text-Pixel im Hook-Streifen: $w0 bei 0,0 s gegen $w1 bei 3,3 s)" || bad "Hook in Frame 0 nicht erkennbar ($w0 gegen $w1)"
  fi
  if [ "${TEST_STIMME:-0}" = 1 ]; then
    ( basis stimme; export OUT="$tmp/stimme.mp4"; bash "$SCRIPT" > "$tmp/render_stimme.log" 2>&1 ) || bad "Render ARM=stimme schlug fehl: $(tail -3 "$tmp/render_stimme.log")"
    [ -f "$tmp/stimme.mp4" ] && render_pruefen "$tmp/stimme.mp4" stimme -17
  fi
fi

if [ "$fehler" -eq 0 ]; then echo "reel_v2_test: ok, $n Prüfungen, 0 Fehler"; else echo "reel_v2_test: $fehler Fehler bei $n Prüfungen"; exit 1; fi
