#!/bin/bash
# make_reel.sh <src.mp4> <out.mp4> "<Titel>" "<Preis>" <musik.wav>
set -e
SRC="$1"; OUT="$2"; TITLE="$3"; PRICE="$4"; MUSIC="$5"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONTR="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
DUR=9
# Titel escapen (Doppelpunkt/Apostroph)
esc(){ printf '%s' "$1" | sed "s/:/\\\\:/g; s/'/\\\\\\\\'/g"; }
T=$(esc "$TITLE"); P=$(esc "$PRICE")
ffmpeg -y -stream_loop 4 -i "$SRC" -i "$MUSIC" -t $DUR -filter_complex "
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2,eq=brightness=-0.06[bg];
[0:v]scale=1000:-2[fg];
[bg][fg]overlay=(W-w)/2:(H-h)/2[base];
[base]drawbox=x=0:y=0:w=1080:h=190:color=0x1a1a1a@0.55:t=fill[topbar];
[topbar]drawtext=fontfile=$FONT:text='LuxeStyle':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=70[brand];
[brand]drawbox=x=0:y=1560:w=1080:h=360:color=0x1a1a1a@0.62:t=fill[botbar];
[botbar]drawtext=fontfile=$FONT:text='$T':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=1620:box=1:boxcolor=0x00000000[t1];
[t1]drawtext=fontfile=$FONT:text='$P':fontcolor=0xF5D67A:fontsize=72:x=(w-text_w)/2:y=1690[t2];
[t2]drawtext=fontfile=$FONTR:text='luxestyle.ch  ·  -10%25 mit WELCOME10':fontcolor=white:fontsize=38:x=(w-text_w)/2:y=1800[v]
" -map "[v]" -map 1:a -af "afade=t=in:d=0.5,afade=t=out:st=8:d=1,volume=0.8" \
  -c:v libx264 -preset medium -crf 21 -pix_fmt yuv420p -c:a aac -b:a 128k -shortest "$OUT"
