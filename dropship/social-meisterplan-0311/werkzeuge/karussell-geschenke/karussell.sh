#!/usr/bin/env bash
# Karussell «5 Geschenke» für Instagram/Facebook: 7 JPG 1080x1350 (4:5) in /tmp/sm-geschenke/out/.
# Schreibt NUR unter /tmp/sm-geschenke (src_final/, live.json, out/, lint.json). Kein Upload, keine Planung, kein Git, kein Shopify-Schreibzugriff.
# Ablauf: 1) frische Preise/Verfügbarkeit aus der Shop-Storefront (Shopify, nur lesen)  2) Quellbilder laden, HTTP 200 + Grösse prüfen
#         3) Folien rendern (Pillow, DejaVu wie reel_karte.sh)  4) ffprobe-Kontrolle.
# Umgebung: COVER_MIT_PREIS=1 rendert Folie 1 mit «bis CHF 30» (Vorgabe: ohne Preis auf der Titelfolie); KAR_OUT = anderer Zielordner.
set -euo pipefail
BASE=/tmp/sm-geschenke
PY=/usr/bin/python3            # Pillow läuft nur mit diesem Python (python3 im PATH hat ein defektes PIL)
export KAR_BASE="$BASE" KAR_OUT="${KAR_OUT:-$BASE/out}"
fail() { echo "FEHLER: $*" >&2; exit 2; }
for c in curl ffprobe "$PY"; do command -v "$c" >/dev/null || fail "$c fehlt"; done
"$PY" -I -c "from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps" || fail "Pillow nicht nutzbar"
mkdir -p "$BASE/src_final" "$BASE/raw"
SHOP=https://luxestyle.ch/products
HANDLES="led-tulpen-planet-nachtlicht-fur-tisch-618400 retro-vogel-keramikbecher-mit-ballgriff-637200 dreifachklinken-tennisarmband-mit-zirkon-613400 plusch-panda-15-cm-fga25867 kristallspitzen-set-8-teilig-holzbox"
for h in $HANDLES; do
  code=$(curl -sS -L --max-time 30 -o "$BASE/raw/$h.js" -w '%{http_code}' "$SHOP/$h.js") || fail "Abruf $h"
  [ "$code" = 200 ] || fail "$h antwortet $code"
done
"$PY" -I - "$BASE" $HANDLES <<'PY'
import json, sys, os
base, handles = sys.argv[1], sys.argv[2:]
out = {}
for h in handles:
    d = json.load(open(os.path.join(base, "raw", h + ".js"), encoding="utf-8"))
    out[h] = {"title": d["title"], "min": d["price_min"] / 100, "max": d["price_max"] / 100, "available": bool(d["available"]),
              "variants": [[v["title"], v["price"] / 100, bool(v["available"]), v.get("sku")] for v in d["variants"]]}
    print(f'{h}: CHF {out[h]["min"]:.2f}..{out[h]["max"]:.2f} verfügbar={out[h]["available"]}')
json.dump(out, open(os.path.join(base, "live.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
PY
CDN=https://cdn.shopify.com/s/files/1/0943/6856/3585/files
getimg() { # name url minpx
  local n="$1" u="$2" min="$3" code dim w h
  code=$(curl -sS -L --max-time 45 -o "$BASE/src_final/$n" -w '%{http_code}' "$u") || fail "Bild $n"
  [ "$code" = 200 ] || fail "Bild $n antwortet $code"
  dim=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$BASE/src_final/$n") || fail "$n ist kein Bild"
  w=${dim%,*}; h=${dim#*,}
  [ "$w" -ge "$min" ] && [ "$h" -ge "$min" ] || fail "Bild $n nur ${w}x${h}, unter $min px"
  echo "Bild $n ${w}x${h} 200 $(sha256sum "$BASE/src_final/$n" | cut -c1-16)"
}
getimg tulpen.jpg   "$CDN/b9683f82-f404-4515-b15e-61f91a31d888.jpg?v=1791999508" 700
getimg becher.jpg   "$CDN/cefcf398-a91c-41b6-b163-d295a57f6710.jpg?v=1791947521" 700
getimg armband.jpg  "$CDN/8053e81a-ee8a-4e3c-8661-b073eb851e12.jpg?v=1791732837" 700
getimg panda.jpg    "$CDN/25867_1.jpg?v=1784843613" 700
getimg kristall.jpg "$CDN/kristallspitzen-set-8-teilig-A_haupt.jpg?v=1791145638" 700
"$PY" -I "$BASE/karussell_render.py"
for f in "$KAR_OUT"/0*.jpg; do
  dim=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$f")
  [ "$dim" = "1080,1350" ] || fail "$f hat $dim statt 1080,1350"
  echo "$(basename "$f") $dim $(stat -c %s "$f") Byte"
done
echo "FERTIG: $(ls "$KAR_OUT"/0*.jpg | wc -l) Folien in $KAR_OUT"
