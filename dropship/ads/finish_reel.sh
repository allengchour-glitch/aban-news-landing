#!/usr/bin/env bash
# LuxeStyle — Reel-Finisher 9:16, 60fps, SAFE-ZONE-Text. Aus einem Quell-/Luma-Clip macht es
# 2 Exporte:  <base>-9x16.mp4 (STUMM, fuer TikTok-Trend-Sound)  +  <base>-9x16-meta.mp4 (mit Musik).
#
# ⚠️ SAFE-ZONE (User 2026-06-14 „schrift unten achtung"): CTA-Zeile sitzt bei y=1480 (~77%),
#    NICHT mehr ganz unten (frueher y=h-150 ≈ 92% -> kollidierte mit Plattform-Caption/Buttons).
#    Hook+Preis oben. Gilt fuer ALLE Reels.
#
# Nutzung:
#   dropship/ads/finish_reel.sh <master.mp4> <base> <layout:full|square> "<hook>" "<prod·CHF>" <mood>
#   z.B. finish_reel.sh reels/luma-brise-master.mp4 reel-brise full "So gahsch in Summer" "Maxikleid «Brise» · CHF 34.90" elegant
set -euo pipefail
FF="ffmpeg -nostdin -y -hide_banner -loglevel error"
F=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="${1:?master}"; BASE="${2:?base}"; LAYOUT="${3:-full}"; HOOK="${4:?hook}"; PROD="${5:?prod}"; MOOD="${6:-elegant}"
OUT_SILENT="${ROOT}/reels/${BASE}-9x16.mp4"; OUT_META="${ROOT}/reels/${BASE}-9x16-meta.mp4"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC" 2>/dev/null | head -n1)
printf '%s' "$DUR" | grep -qE '^[0-9.]+$' || DUR=9
HFO=$(python3 -c "print(round($DUR-1.0,2))")   # Hook-Fade-out kurz vor Schluss
# Alpha-Kurven (Komma escaped fuer filtergraph)
A_HOOK="if(lt(t\,0.3)\,0\,if(lt(t\,0.9)\,(t-0.3)/0.6\,if(lt(t\,${HFO})\,1\,if(lt(t\,$(python3 -c "print(round($HFO+0.6,2))"))\,1-(t-${HFO})/0.6\,0))))"
A_PROD="if(lt(t\,0.5)\,0\,if(lt(t\,1.1)\,(t-0.5)/0.6\,if(lt(t\,${HFO})\,1\,if(lt(t\,$(python3 -c "print(round($HFO+0.6,2))"))\,1-(t-${HFO})/0.6\,0))))"
A_CTA="if(lt(t\,1.2)\,0\,if(lt(t\,1.8)\,(t-1.2)/0.6\,1))"
# SAFE-ZONE Y-Positionen
if [ "$LAYOUT" = "square" ]; then HY=340; PY=448; else HY=150; PY=242; fi
CY=1480   # <-- CTA in der Safe-Zone (frueher h-150)
DT="drawtext=fontfile=${F}:text='$(printf '%s' "$HOOK" | sed "s/'/’/g")':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=${HY}:box=1:boxcolor=black@0.40:boxborderw=22:alpha='${A_HOOK}'[t1];\
[t1]drawtext=fontfile=${F}:text='$(printf '%s' "$PROD" | sed "s/'/’/g")':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=${PY}:box=1:boxcolor=black@0.34:boxborderw=16:alpha='${A_PROD}'[t2];\
[t2]drawtext=fontfile=${F}:text='luxestyle.ch · Code WELCOME10':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=${CY}:box=1:boxcolor=black@0.32:boxborderw=16:alpha='${A_CTA}'[outv]"

if [ "$LAYOUT" = "square" ]; then
  FC="[0:v]minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,split=2[bg][fg];\
[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=22,eq=brightness=-0.12:saturation=1.06[bgb];\
[fg]scale=1080:1080[fgs];[bgb][fgs]overlay=(W-w)/2:(H-h)/2[base];[base]${DT}"
else
  FC="[0:v]minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[base];[base]${DT}"
fi

echo "» $BASE ($LAYOUT, ${DUR}s) — Safe-Zone CTA y=${CY}"
$FF -i "$SRC" -filter_complex "$FC" -map "[outv]" -an -r 60 -c:v libx264 -pix_fmt yuv420p -crf 19 -preset medium "$OUT_SILENT"

# Musik fuer Meta-Export (kommerziell-frei via Tool; schreibt CREDITS.md)
NODE="/opt/node22/bin/node"; [ -x "$NODE" ] || NODE=node
"$NODE" "${ROOT}/automation/music/music_library.mjs" pick --mood "$MOOD" >/dev/null 2>&1 || true
MP3=$(ls -1 "${ROOT}"/automation/music/lib/*.mp3 2>/dev/null | head -n1)
if [ -n "${MP3:-}" ] && [ -f "$MP3" ]; then
  $FF -i "$OUT_SILENT" -stream_loop -1 -i "$MP3" \
    -filter_complex "[1:a]volume=0.5,afade=t=in:st=0:d=0.8,afade=t=out:st=$(python3 -c "print(round($DUR-1.2,2))"):d=1.2[a]" \
    -map 0:v -map "[a]" -t "$DUR" -c:v copy -c:a aac -b:a 192k -movflags +faststart "$OUT_META"
  echo "  ✅ $OUT_SILENT (+ -meta mit Musik)"
else
  cp "$OUT_SILENT" "$OUT_META"; echo "  ⚠️ keine Musik gefunden — Meta = stumm-Kopie"
fi
