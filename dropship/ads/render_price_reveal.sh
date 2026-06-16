#!/bin/bash
# render_price_reveal.sh — PREMIUM Price-Reveal-Reel aus einem (sauberen) Produktbild.
# Lieferanten (BigBuy/CJ) liefern für Mode/Schmuck/Parfum KEINE Videos → wir erzeugen eigene,
# copyright-saubere, vertikale Reels fürs Produkt-Video UND Social.
#
# v3 (2026-06-16): Ken-Burns-Push + warmer Premium-Grade + Vignette + sanfte Preis-Reveal,
# Text knackscharf in Safe-Zone (y≤1500) + MUSIK (kommerziell-frei via music_library.mjs,
# Kevin MacLeod CC-BY, Auto-Attribution in CREDITS.md).
#   Standard = MIT Musik (für Meta/IG/FB + Produkt-Video auf der PDP).
#   SILENT=1  = stumm (TikTok-Version — Trend-Sound legt man in der App drauf).
#   MOOD=elegant|cinematic|house|lofi  (Default elegant)
#
# Nutzung:  ./render_price_reveal.sh <bild.jpg|url> "<Titel>" "<CHF Preis>" <out.mp4> ["<Hook>"]
#
# EINBETTEN als Produkt-Video (Cloud, via Shopify-MCP): stagedUploadsCreate(VIDEO) → curl 204 →
#   productCreateMedia(productId, media:[{originalSource:<resourceUrl>, mediaContentType: VIDEO}]).
set -e
SRC="$1"; TITLE="$2"; PRICE="$3"; OUT="$4"; HOOK="${5:-Was choschtet das?}"
F=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
RD="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NODE="$(command -v node || echo /opt/node22/bin/node)"
TMP=$(mktemp --suffix=.jpg)
case "$SRC" in http*) curl -s -L -o "$TMP" "$SRC";; *) cp "$SRC" "$TMP";; esac
mkdir -p "$(dirname "$OUT")"

# Video-Filter (Ken-Burns + Grade + Vignette + Text), Ausgabe als [v].
VF="[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=26:4,eq=brightness=-0.12:saturation=1.10[bg];
[0:v]scale=920:-1[fg];
[bg][fg]overlay=(W-w)/2:(H-h)/2-150[comp];
[comp]zoompan=z='min(zoom+0.00045,1.10)':d=270:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,setsar=1,
vignette=PI/5,
curves=r='0/0 0.5/0.53 1/1':g='0/0 0.5/0.5 1/1':b='0/0.02 0.5/0.49 1/0.97',
drawtext=fontfile=$F:text='${HOOK}':fontcolor=white:fontsize=66:x=(w-text_w)/2:y=210:box=1:boxcolor=black@0.45:boxborderw=22:enable='lt(t,2.3)':alpha='if(lt(t,0.3),t/0.3,1)',
drawtext=fontfile=$F:text='${TITLE}':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=1110:box=1:boxcolor=black@0.42:boxborderw=16:alpha='if(lt(t,0.5),0,if(lt(t,0.9),(t-0.5)/0.4,1))',
drawtext=fontfile=$F:text='${PRICE}':fontcolor=0xF5E6C8:fontsize=120:x=(w-text_w)/2:y=1205:box=1:boxcolor=black@0.55:boxborderw=26:alpha='if(lt(t,2.2),0,if(lt(t,2.55),(t-2.2)/0.35,1))',
drawtext=fontfile=$F:text='Original · 30 Tage Rückgabe':fontcolor=white:fontsize=38:x=(w-text_w)/2:y=1385:box=1:boxcolor=black@0.40:boxborderw=14:alpha='if(lt(t,2.7),0,1)',
drawtext=fontfile=$F:text='luxestyle.ch':fontcolor=0x1A1206:fontsize=48:x=(w-text_w)/2:y=1448:box=1:boxcolor=0xC9A24F@0.92:boxborderw=20:alpha='if(lt(t,4.3),0,1)'[v]"

# Musik holen (kommerziell-frei) — außer SILENT=1.
TRK=""
if [ "${SILENT:-0}" != "1" ]; then
  TRK=$(mktemp --suffix=.wav)
  if ! "$NODE" "$RD/automation/music/music_library.mjs" pick --mood "${MOOD:-elegant}" --dur 9 --out "$TRK" >/dev/null 2>&1 || [ ! -s "$TRK" ]; then
    TRK=""   # kein Track verfügbar (offline) → stumm, no-op-safe
  fi
fi

if [ -n "$TRK" ]; then
  ffmpeg -y -loop 1 -i "$TMP" -i "$TRK" -t 9 -r 30 -filter_complex \
"$VF;[1:a]afade=t=in:st=0:d=0.8,afade=t=out:st=8:d=1,volume=0.55,loudnorm=I=-16:TP=-1.5:LRA=11[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -r 30 -c:a aac -b:a 128k -shortest "$OUT"
  rm -f "$TRK"
else
  ffmpeg -y -loop 1 -i "$TMP" -t 9 -r 30 -filter_complex "$VF" -map "[v]" \
    -c:v libx264 -pix_fmt yuv420p -movflags +faststart -r 30 -an "$OUT"
fi
rm -f "$TMP"
echo "OK $OUT ($(stat -c%s "$OUT") bytes)$([ -n "$TRK" ] || echo ' [stumm]')"
