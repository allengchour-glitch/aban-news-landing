import sys, subprocess, numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/hero1111b/schnitt/werkzeug')
from plan import PLAN, SIZE, decode_cmd
# je Szene und Format: Bilder 0, Mitte, Ende als JPG
for fmt in ('quer', 'hoch'):
    W, H = SIZE[fmt]
    for s in PLAN[fmt]:
        n = s['n']
        p = subprocess.run(decode_cmd(s['src'], s['a'], n, s['geo']), capture_output=True)
        raw = np.frombuffer(p.stdout, np.uint8)
        k = len(raw) // (W*H*3)
        assert k == n, (s['id'], fmt, k, n)
        fr = raw.reshape(n, H, W, 3)
        for idx in (0, n//2, n-1):
            out = f"pruef/frames/{s['id']}_{fmt}_{idx:02d}.jpg"
            subprocess.run(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-i','-','-q:v','3',out], input=fr[idx].tobytes())
        print(s['id'], fmt, n, 'ok')
