#!/usr/bin/env python3
"""Vasen-Entwurf lokal wiederherstellen; kein Upload, keine API-Aufrufe."""
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'reels/entwuerfe/altpost-remake-20261114'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = ROOT / 'reels/clip-craquele-vase.mp4'
MUSIC = ROOT / 'automation/music/mixkit-serene-view-443.mp3'
FONTS = Path('/usr/share/fonts/truetype/dejavu')
DURATION = 10.2


def main():
    with tempfile.TemporaryDirectory(prefix='luxe-vase-remake-') as scratch:
        work = Path(scratch)
        count = 0
        def text(value, size, y, font='DejaVuSans.ttf', box=False):
            nonlocal count
            path = work / f'text-{count}.txt'
            count += 1
            path.write_text(value, encoding='utf-8')
            backing = ':box=1:boxcolor=white@0.8:boxborderw=8' if box else ''
            return (f"drawtext=fontfile={FONTS/font}:textfile={path}:expansion=none:fontsize={size}:"
                    f"fontcolor=0x29291f:x=86:y={y}:alpha='min(1,t/0.2)'{backing}")
        graph = ['[0:v]trim=duration=2.6,setpts=1.384615384615*(PTS-STARTPTS),fps=30,'
                 'tpad=stop_mode=clone:stop_duration=0.2,trim=end_frame=108,'
                 'setpts=PTS-STARTPTS,fps=30,settb=1/30,setsar=1,split=3[b0][b1][b2]']
        specs = [
            ('LUXESTYLE','EIN DETAIL.','Viel Charakter.',84,'DejaVuSerif-Bold.ttf'),
            ('LUXESTYLE','MUSTER MIT CHARAKTER.','Ein Blick auf die Details.',57,'DejaVuSans-Bold.ttf'),
            ('INSPIRATION FÜR ZUHAUSE','LUXESTYLE','Entdecke deinen nächsten Fund.',74,'DejaVuSans-Bold.ttf')]
        for i,(eyebrow,head,sub,size,font) in enumerate(specs):
            filt = f'[b{i}]'
            if i == 1:
                filt += 'scale=1296:2304,crop=1080:1920:108:192,'
            filt += text(eyebrow,27,190)+',drawbox=x=86:y=245:w=116:h=4:color=0xb48c47:t=fill,'
            filt += text(head,size,285,font)+','+text(sub,36,405)
            if i == 2:
                filt += ','+text('luxestyle.ch',33,477)
            graph.append(filt+f'[v{i}]')
        graph += ['[v0][v1]xfade=transition=fade:duration=0.3:offset=3.3,fps=30,settb=1/30[x1]',
                  '[x1][v2]xfade=transition=fade:duration=0.3:offset=6.6,fps=30,settb=1/30[x2]',
                  '[x2]tpad=stop_mode=clone:stop_duration=0.1,trim=duration=10.2,'+
                  text('Videoentwurf',23,1500,box=True)+',format=yuv420p[v]']
        script = work/'schnitt.ffscript'
        script.write_text(';\n'.join(graph))
        silent = OUT/'vase-layout-neu-ohne-ton.mp4'
        with (work/'render.log').open('w') as log:
            subprocess.run(['ffmpeg','-hide_banner','-nostats','-y','-filter_complex_threads','1',
                            '-i',str(SOURCE),'-filter_complex_script',str(script),'-map','[v]',
                            '-an','-t','10.2','-c:v','libx264','-crf','18','-preset','medium',
                            '-threads','2','-pix_fmt','yuv420p','-r','30','-movflags','+faststart',str(silent)],
                           stdout=log,stderr=subprocess.STDOUT,check=True)
        audio='atrim=start=16:duration=10.2,asetpts=PTS-STARTPTS,afade=t=in:d=0.35,afade=t=out:st=9.2:d=1'
        measure=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(MUSIC),'-af',audio+',loudnorm=I=-24:TP=-2:LRA=8:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
        meter=json.JSONDecoder().raw_decode(measure.stderr[measure.stderr.rfind('{'):])[0]
        norm=(f"loudnorm=I=-24:TP=-2:LRA=8:measured_I={meter['input_i']}:measured_TP={meter['input_tp']}:"
              f"measured_LRA={meter['input_lra']}:measured_thresh={meter['input_thresh']}:offset={meter['target_offset']}:linear=true")
        result=OUT/'vase-layout-neu-mit-musik.mp4'
        subprocess.run(['ffmpeg','-hide_banner','-nostats','-y','-i',str(silent),'-i',str(MUSIC),
                        '-filter_complex','[1:a]'+audio+','+norm+',aresample=48000[a]',
                        '-map','0:v:0','-map','[a]','-c:v','copy','-c:a','aac','-b:a','160k','-t','10.2',
                        '-movflags','+faststart',str(result)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
        print(silent)
        print(result)


if __name__ == '__main__':
    main()
