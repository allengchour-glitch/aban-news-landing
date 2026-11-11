#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
SRC="${1:?Usage: $0 SOURCE_MP4 PRODUCT_IMAGE [MUSIC_WAV] [OUTPUT_MP4]}"
IMG="${2:?Usage: $0 SOURCE_MP4 PRODUCT_IMAGE [MUSIC_WAV] [OUTPUT_MP4]}"
MUSIC="${3:-$REPO_ROOT/automation/music/luxe-premium.wav}"
OUT="${4:-luxestyle-sternenlicht-entwurf-r176.mp4}"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
ffmpeg -hide_banner -loglevel error -y \
  -loop 1 -framerate 25 -t 3 -i "$IMG" \
  -ss 12 -t 5 -i "$SRC" \
  -ss 22 -t 5.96 -i "$SRC" \
  -loop 1 -framerate 25 -t 3 -i "$IMG" \
  -i "$MUSIC" \
  -filter_complex "
    [0:v]scale=1020:1020:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:500:color=0xF2ECE3,setsar=1,
      zoompan=z='min(1.02,1+on*0.00027)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=25,
      drawbox=x=110:y=205:w=160:h=6:color=0xB49B7A:t=fill,
      drawtext=fontfile='${BOLD}':text='Licht im Detail.':fontcolor=0x302B28:fontsize=68:x=110:y=245,
      drawtext=fontfile='${FONT}':text='Sternenlicht-Projektor':fontcolor=0x5A514A:fontsize=38:x=110:y=1390,
      drawtext=fontfile='${FONT}':text='LuxeStyle':fontcolor=0x8A7765:fontsize=30:x=110:y=1465,
      fade=t=in:st=0:d=0.20,format=yuv420p[s1];
    [1:v]setpts=1.2*PTS,fps=25,trim=duration=6,setpts=PTS-STARTPTS,split=2[s2bg][s2fg];
    [s2bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=38,eq=brightness=-0.16:saturation=0.88[bg2];
    [s2fg]scale=1080:-2:flags=lanczos[fg2];
    [bg2][fg2]overlay=x=0:y=(H-h)/2,
      drawbox=x=90:y=160:w=900:h=150:color=0x191719@0.72:t=fill,
      drawtext=fontfile='${BOLD}':text='Lichtmomente entdecken.':fontcolor=0xF4EBDD:fontsize=54:x=(w-text_w)/2:y=205,
      drawbox=x=90:y=1600:w=900:h=4:color=0xB49B7A@0.90:t=fill,setsar=1,format=yuv420p[s2];
    [2:v]fps=25,tpad=stop_mode=clone:stop_duration=0.04,trim=duration=6,setpts=PTS-STARTPTS,split=2[s3bg][s3fg];
    [s3bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=38,eq=brightness=-0.16:saturation=0.92[bg3];
    [s3fg]scale=1080:-2:flags=lanczos[fg3];
    [bg3][fg3]overlay=x=0:y=(H-h)/2,
      drawbox=x=90:y=160:w=900:h=150:color=0x191719@0.72:t=fill,
      drawtext=fontfile='${BOLD}':text='Sterne. Galaxien. Licht.':fontcolor=0xF4EBDD:fontsize=52:x=(w-text_w)/2:y=207,
      drawbox=x=90:y=1600:w=900:h=4:color=0xB49B7A@0.90:t=fill,setsar=1,format=yuv420p[s3];
    [3:v]scale=1020:1020:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:500:color=0xF2ECE3,setsar=1,
      zoompan=z='max(1,1.02-on*0.00027)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=25,
      drawbox=x=110:y=200:w=160:h=6:color=0xB49B7A:t=fill,
      drawtext=fontfile='${BOLD}':text='Produkt ansehen':fontcolor=0x302B28:fontsize=68:x=110:y=245,
      drawtext=fontfile='${FONT}':text='luxestyle.ch':fontcolor=0x5A514A:fontsize=40:x=110:y=1390,
      drawtext=fontfile='${FONT}':text='LuxeStyle':fontcolor=0x8A7765:fontsize=30:x=110:y=1465,
      fade=t=out:st=2.35:d=0.65,format=yuv420p[s4];
    [s1][s2][s3][s4]concat=n=4:v=1:a=0,trim=duration=18,setpts=PTS-STARTPTS,
      scale=out_range=tv:out_color_matrix=bt709,format=yuv420p,
      setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709[v];
    [4:a]atrim=start=0:end=18,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.20,afade=t=out:st=17.2:d=0.8[a]
  " \
  -map '[v]' -map '[a]' \
  -c:v libx264 -profile:v high -level 4.1 -preset slow -crf 18 -pix_fmt yuv420p -r 25 -g 50 -keyint_min 25 \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 192k -ar 44100 -ac 2 -movflags +faststart -shortest "$OUT"
sha256sum "$OUT"
