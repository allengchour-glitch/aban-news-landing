#!/usr/bin/env bash
set -euo pipefail
render_root=/dev/shm/luxestyle-review/r272
output_file="$render_root/luxestyle-atelier-15s-review-r272.mp4"
test ! -e "$output_file"
ffmpeg -hide_banner -nostdin -n -threads 2 -filter_complex_threads 1 \
  -i "$render_root/source/take-0.mp4" -i "$render_root/source/take-1.mp4" -i "$render_root/source/take-2.mp4" \
  -filter_complex '
[0:v:0]crop=w=1761:h=2348:x=1500:y=0:exact=1,scale=1080:1440,setsar=1,split=2[a_head][a_tail];
[a_head]trim=start=0:end=3,setpts=PTS-STARTPTS,fps=30,trim=end_frame=90,format=yuv420p[a0];
[1:v:0]trim=start=0:end=4,setpts=PTS-STARTPTS,scale=1080:1440:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1080:1440:(ow-iw)/2:(oh-ih)/2:color=0xece5dd,setsar=1,fps=30,trim=end_frame=120,format=yuv420p[b0];
[2:v:0]trim=start=0:end=4,setpts=PTS-STARTPTS,scale=1080:1440:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1080:1440:(ow-iw)/2:(oh-ih)/2:color=0xece5dd,setsar=1,fps=30,trim=end_frame=120,format=yuv420p[c0];
[a_tail]trim=start=1:end=5,setpts=PTS-STARTPTS,fps=30,trim=end_frame=120,format=yuv420p[a1];
[a0][b0][c0][a1]concat=n=4:v=1:a=0[out]' \
  -map '[out]' -an -map_metadata -1 -c:v libx264 -threads 2 -preset slow -crf 19 \
  -pix_fmt yuv420p -profile:v high -level:v 4.1 -g 15 -keyint_min 15 \
  -sc_threshold 0 -bf 0 -movflags +faststart -frames:v 450 "$output_file"
ffprobe -v error -count_frames -show_streams -show_format -of json "$output_file" > "$render_root/quality/MASTER-PROBE.json"
ffmpeg -hide_banner -nostdin -v error -threads 2 -i "$output_file" -f null -
python3 - <<'PY'
import pathlib,json,hashlib
b=pathlib.Path('/dev/shm/luxestyle-review/r272'); p=b/'luxestyle-atelier-15s-review-r272.mp4'
probe=json.loads((b/'quality'/'MASTER-PROBE.json').read_text()); s=probe['streams']
assert len(s)==1 and s[0]['codec_type']=='video' and s[0]['width']==1080 and s[0]['height']==1440
assert s[0]['nb_read_frames']=='450' and s[0]['r_frame_rate']=='30/1' and abs(float(probe['format']['duration'])-15)<.002
assert p.stat().st_size<50*1024*1024
proof={'masterId':'luxe-home-atelier-multishot-20261116','path':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'seconds':15,'frames':450,'exportFPS':30,'sourceFPS':24,'opticalFlow':False,'width':1080,'height':1440,'audioStreams':0,'completeDecode':'PASS','state':'REVIEW_EXPORT_PENDING_VISUAL_AND_OWNER_ACCEPTANCE','productCrops':'B and C full-frame preserved; A decorative crop x1500/y0/w1761/h2348','paidLocalRender':False}
(b/'quality'/'MASTER-TECHNICAL-PROOF.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps(proof))
PY
