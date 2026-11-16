"""Kapitel-Clips kodieren. Aufruf: python3 kodieren.py <id> <fmt> <breite> <crf> <gop> <pingpong 0/1> <aus.mp4> [--poster aus.webp]
Quelle und Ausschnitt aus hero1111b/schnitt/werkzeug/plan.py (geprüfte Fenster, 48 Bilder, 24 fps)."""
import sys, subprocess, numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/hero1111b/schnitt/werkzeug')
from plan import PLAN, SIZE, decode_cmd
sid, fmt, breite, crf, gop, pp, aus = sys.argv[1:8]
poster = sys.argv[sys.argv.index('--poster') + 1] if '--poster' in sys.argv else None
s = [x for x in PLAN[fmt] if x['id'] == sid][0]
W, H = SIZE[fmt]
n = 48 if s['n'] >= 48 else s['n']
p = subprocess.run(decode_cmd(s['src'], s['a'], n, s['geo']), capture_output=True, check=True)
fr = np.frombuffer(p.stdout, np.uint8).reshape(n, H, W, 3)
idx = list(range(n))
if pp == '1':
    idx = idx + list(range(n - 2, 0, -1))   # vor und zurück: nahtlose Schleife ohne Sprung
data = b''.join(fr[i].tobytes() for i in idx)
bw = int(breite); bh = round(bw * H / W / 2) * 2
vf = f"scale={bw}:{bh}:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p"
cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '24', '-i', '-',
       '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '4.0', '-crf', crf,
       '-g', gop, '-keyint_min', gop, '-sc_threshold', '0', '-bf', '0' if gop == '1' else '2',
       '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
       '-an', '-movflags', '+faststart', aus]
subprocess.run(cmd, input=data, check=True)
if poster:
    # Poster = Bild 0 der kodierten Datei (gleicher Eindruck wie der Videostart, kein Sprung beim Wechsel)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', aus, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '78', '-compression_level', '6', poster], check=True)
print(aus, len(idx), 'Bilder')
