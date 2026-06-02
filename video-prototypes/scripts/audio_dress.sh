#!/bin/bash
# Tonspur-Veredelung: warme Stimme (EQ/Komp/Raum-Hall) + Nacht-Stadt-Ambiente
# (geduckt unter der Stimme), dann ohne Neu-Render in den Clip gemuxt.
# Aufruf: bash audio_dress.sh s6   ->  /tmp/clipdress_s6.mp4
set -e
k="$1"
REPO=/home/user/aban-news-landing
VO="/tmp/${k}_el.wav"; [ -f "$VO" ] || VO="/tmp/${k}.wav"
SRC="$REPO/video-prototypes/output/clipfilm_${k}.mp4"
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
D=$(python3 -c "import wave;w=wave.open('$VO');print(round(w.getnframes()/w.getframerate()+1.2,2))")

# 1) veredelte Mischung VO + Ambiente
"$FF" -y -i "$VO" \
 -f lavfi -t "$D" -i "anoisesrc=color=brown:amplitude=0.7" \
 -f lavfi -t "$D" -i "anoisesrc=color=pink:amplitude=0.4" \
 -filter_complex "\
[0:a]aresample=44100,highpass=f=85,equalizer=f=220:t=q:w=1.2:g=2.5,equalizer=f=3000:t=q:w=2:g=2,\
acompressor=threshold=-18dB:ratio=3:attack=8:release=180,aecho=0.8:0.8:33|52:0.2|0.13,apad=pad_dur=1.0,asplit=2[vo1][vo2];\
[1:a]lowpass=f=360,volume=0.11[rum];\
[2:a]bandpass=f=850:width_type=h:w=1100,tremolo=f=0.12:d=0.5,volume=0.045[air];\
[rum][air]amix=inputs=2:normalize=0[amb0];\
[amb0][vo2]sidechaincompress=threshold=0.045:ratio=7:attack=15:release=380[ambd];\
[vo1][ambd]amix=inputs=2:normalize=0,alimiter=limit=0.95[out]" \
 -map "[out]" -ac 2 "/tmp/voxbed_${k}.wav"

# 2) neue Tonspur in den bestehenden Clip muxen (Video unangetastet)
"$FF" -y -i "$SRC" -i "/tmp/voxbed_${k}.wav" \
 -map 0:v -map 1:a -c:v copy -c:a aac -b:a 168k -shortest "/tmp/clipdress_${k}.mp4"
echo "fertig -> /tmp/clipdress_${k}.mp4"
