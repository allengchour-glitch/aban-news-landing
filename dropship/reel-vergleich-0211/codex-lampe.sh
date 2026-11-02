#!/usr/bin/env bash
# Lokales Foto-Vergleichsmuster; keine Queue, kein Upload und keine Publikation.
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="${1:-$(git -C "$script_dir" rev-parse --show-toplevel)}"
music_path="$repo_root/automation/music/luxe-premium.wav"
font_serif=/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf
font_sans=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
for cmd in ffmpeg ffprobe curl sha256sum; do command -v "$cmd" >/dev/null; done
test -f "$music_path" && test -f "$font_serif" && test -f "$font_sans"
printf '%s  %s\n' a7674ecadb21fca447267be25c7e9cc44f35d2a1583ec0953d4185c7a3b16688 "$music_path" | sha256sum --check --status
work_dir="$(mktemp -d)"
trap 'rm -rf -- "$work_dir"' EXIT
fetch() {
  local name="$1" url="$2" expected="$3"
  curl --fail --location --silent --show-error --max-time 45 --output "$work_dir/$name" "$url"
  printf '%s  %s\n' "$expected" "$work_dir/$name" | sha256sum --check --status
}
fetch product.jpg 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/9de03875-2206-4cf1-908d-8669310bf0e1_trans.jpg' 84ea21ce6692ae41744b541d5eca1e1d54e26bee06e8f9186e1f408c548d968c
fetch wall.jpg 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/6a74321a-b49c-4289-9f57-3fbd4df161aa_trans.jpg' 9399bd11bc58891c22eed97f19836c91581c4bd885f2f88287a2bdf0a9952900
fetch room.jpg 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/b1c21ce7-8d40-479b-ac5c-886968e76c1b_trans.jpg' 6a9627b80aa6a9f476731aafaebd87f894ba09101603a00862b9a4d2f96cb4b4

# SETZUNG: feste redaktionelle Ausschnitte. Keine Licht-/Produktanimation oder Zoomfahrt.
# Die Raum-Originale enthalten Fremdschrift/private Fotos ausserhalb dieser Fenster.
# GEMESSEN: Die dokumentierten Quell-SHA-256 werden vor jedem Render geprueft.
cat > "$work_dir/layout.ffgraph" <<FILTER
[0:v]split=2[product_a][product_c];
[product_a]scale=880:880:flags=lanczos:in_range=full:out_range=tv,setsar=1,format=yuv420p[pa];
[product_c]scale=760:760:flags=lanczos:in_range=full:out_range=tv,setsar=1,format=yuv420p[pc];
[1:v]crop=340:510:190:0,scale=434:651:flags=lanczos:in_range=full:out_range=tv,pad=434:652:0:0:color=0x302a25,setsar=1[wall];
[2:v]crop=190:275:339:505,scale=434:628:flags=lanczos:in_range=full:out_range=tv,pad=434:652:0:12:color=0x302a25,setsar=1[detail];
color=c=0xf3eee7:s=1080x1920:r=30:d=3.2,
drawbox=x=48:y=48:w=984:h=1824:color=0xc8bca9:t=1,
drawbox=x=92:y=568:w=896:h=904:color=white:t=fill,
drawtext=fontfile=$font_serif:text='Wasserwellen-':fontsize=84:fontcolor=0x302a25:x=(w-text_w)/2:y=222,
drawtext=fontfile=$font_serif:text='Lampe':fontsize=84:fontcolor=0x302a25:x=(w-text_w)/2:y=330,
drawtext=fontfile=$font_sans:text='Ein warmer Akzent.':fontsize=42:fontcolor=0x544a40:x=(w-text_w)/2:y=1582[base_a];
[base_a][pa]overlay=x=100:y=580:shortest=1,trim=duration=3.2,setpts=PTS-STARTPTS,fps=30,settb=AVTB[scene_a];
color=c=0x302a25:s=1080x1920:r=30:d=3.2,
drawbox=x=48:y=48:w=984:h=1824:color=0x796c5d:t=1,
drawtext=fontfile=$font_serif:text='Warmes Licht.':fontsize=84:fontcolor=0xf3eee7:x=(w-text_w)/2:y=255,
drawbox=x=72:y=548:w=438:h=656:color=0xc8bca9:t=1,
drawbox=x=570:y=548:w=438:h=656:color=0xc8bca9:t=1,
drawbox=x=414:y=1464:w=252:h=1:color=0xc8bca9:t=fill[base_b];
[base_b][wall]overlay=x=74:y=550:shortest=1[b_wall];
[b_wall][detail]overlay=x=572:y=550:shortest=1,trim=duration=3.2,setpts=PTS-STARTPTS,fps=30,settb=AVTB[scene_b];
color=c=0xf3eee7:s=1080x1920:r=30:d=3,
drawbox=x=48:y=48:w=984:h=1824:color=0xc8bca9:t=1,
drawtext=fontfile=$font_sans:text='Wasserwellen-Lampe':fontsize=42:fontcolor=0x544a40:x=(w-text_w)/2:y=244,
drawbox=x=152:y=496:w=776:h=784:color=white:t=fill,
drawbox=x=414:y=1408:w=252:h=1:color=0xb5a18a:t=fill,
drawtext=fontfile=$font_serif:text='LuxeStyle · luxestyle.ch':fontsize=56:fontcolor=0x302a25:x=(w-text_w)/2:y=1492[base_c];
[base_c][pc]overlay=x=160:y=508:shortest=1,trim=duration=3,setpts=PTS-STARTPTS,fps=30,settb=AVTB[scene_c];
[scene_a][scene_b]xfade=transition=fade:duration=0.2:offset=3,fps=30,settb=AVTB[ab];
[ab][scene_c]xfade=transition=fade:duration=0.2:offset=6,tpad=stop_mode=clone:stop_duration=0.1,fps=30,trim=duration=9,format=yuv420p,setparams=range=limited[v];
[3:a]atrim=start=0:end=9,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.08,afade=t=out:st=8.2:d=0.8,volume=0.8,aresample=48000[a]
FILTER

# Das Skript schreibt ausschliesslich diese MP4 im eigenen Ordner.
# Kein product-reel/reel-render/reel-autopost, kein LIVE=1, kein Git-Write.
ffmpeg -hide_banner -loglevel warning -nostdin -y \
  -filter_complex_threads 1 \
  -loop 1 -framerate 30 -i "$work_dir/product.jpg" \
  -loop 1 -framerate 30 -i "$work_dir/wall.jpg" \
  -loop 1 -framerate 30 -i "$work_dir/room.jpg" \
  -i "$music_path" -filter_complex_script "$work_dir/layout.ffgraph" \
  -map '[v]' -map '[a]' -t 9 -frames:v 270 \
  -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -color_range tv -threads 2 \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart \
  -metadata title='LuxeStyle Wasserwellen-Lampe – Foto-Vergleichsmuster' \
  "$script_dir/codex-lampe.mp4"
ffprobe -v error -show_entries stream=index,codec_name,codec_type,width,height,avg_frame_rate,pix_fmt,sample_rate,channels,duration,nb_frames:format=duration,size \
  -of json "$script_dir/codex-lampe.mp4"
