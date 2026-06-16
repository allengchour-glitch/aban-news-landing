#!/bin/bash
# render_price_reveal.sh — eigener Price-Reveal-Reel aus einem (sauberen) Produktbild.
# Da Lieferanten (BigBuy/CJ) für Mode/Schmuck/Parfum KEINE Videos liefern (geprüft 2026-06-16),
# erzeugen wir eigene, copyright-saubere, vertikale Reels — fürs Produkt-Video UND Social.
#
# Nutzung:  ./render_price_reveal.sh <bild.jpg|url> "<Titel>" "<CHF Preis>" <out.mp4> ["<Hook>"]
# Beispiel: ./render_price_reveal.sh /tmp/dg.jpg "Dolce & Gabbana — «The One»" "CHF 99.90" reels/dg.mp4 "Was choschtet das?"
#
# Danach EINBETTEN als Produkt-Video (vollautonom aus der Cloud, via Shopify-MCP):
#   1) stagedUploadsCreate(resource: VIDEO, mimeType "video/mp4", fileSize "<bytes>")
#   2) curl -X POST <url> -F GoogleAccessId=.. -F key=.. -F policy=.. -F signature=.. -F file=@<mp4>  (→ HTTP 204)
#      ⚠️ policy/signature EXAKT kopieren (Tippfehler = 400)
#   3) productCreateMedia(productId, media:[{originalSource:<resourceUrl>, mediaContentType: VIDEO}])  (→ status UPLOADED→READY)
# Safe-Zone: aller Text endet bei y≤1500 (Plattform-Caption blendet unten ~20% ein).
set -e
SRC="$1"; TITLE="$2"; PRICE="$3"; OUT="$4"; HOOK="${5:-Was choschtet das?}"
F=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
TMP=$(mktemp --suffix=.jpg)
case "$SRC" in http*) curl -s -o "$TMP" "$SRC";; *) cp "$SRC" "$TMP";; esac
mkdir -p "$(dirname "$OUT")"
ffmpeg -y -loop 1 -i "$TMP" -t 9 -r 30 -filter_complex "
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:3,eq=brightness=-0.10:saturation=1.05[bg];
[0:v]scale=900:-1[fg];
[bg][fg]overlay=(W-w)/2:(H-h)/2-150,
drawtext=fontfile=$F:text='${HOOK}':fontcolor=white:fontsize=66:x=(w-text_w)/2:y=210:box=1:boxcolor=black@0.45:boxborderw=22:enable='lt(t,2.3)',
drawtext=fontfile=$F:text='${TITLE}':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=1110:box=1:boxcolor=black@0.40:boxborderw=16,
drawtext=fontfile=$F:text='${PRICE}':fontcolor=white:fontsize=118:x=(w-text_w)/2:y=1210:box=1:boxcolor=black@0.52:boxborderw=24:alpha='if(lt(t,2.2),0,if(lt(t,2.5),(t-2.2)/0.3,1))',
drawtext=fontfile=$F:text='Original · 30 Tage Rückgabe':fontcolor=white:fontsize=38:x=(w-text_w)/2:y=1380:box=1:boxcolor=black@0.40:boxborderw=14:alpha='if(lt(t,2.6),0,1)',
drawtext=fontfile=$F:text='luxestyle.ch':fontcolor=white:fontsize=46:x=(w-text_w)/2:y=1448:box=1:boxcolor=0xC9A24F@0.88:boxborderw=18:alpha='if(lt(t,4.3),0,1)'
" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "$OUT"
rm -f "$TMP"
echo "OK $OUT ($(stat -c%s "$OUT") bytes)"
