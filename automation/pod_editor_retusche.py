#!/usr/bin/env python3
"""Entfernt den eingebrannten Text «Dein Design» (schwarz, glatte helle Fläche) aus einem Printful-Mockup (2000x2000).
Verfahren: dunkle Buchstaben als Komponenten erkennen (breite Buchstaben als Anker, dazu i-Punkte), Rand 11 px, spaltenweise zwischen der Fläche darüber und darunter überbrücken,
in Zeilenrichtung glätten, Rauschen der Umgebung nachbilden. Gemessen am 28.10.2026 an 6 iPhone-Mockups; nur für glatte, helle Flächen (Hüllen), NICHT für Stoff.
Aufruf: automation/pod_editor_retusche.py <in.jpg> <out.jpg> [maske_vorschau.jpg]  (braucht numpy, scipy, ImageMagick convert/identify). Rein lokal, keine Netzzugriffe."""
import sys, subprocess, numpy as np
from scipy import ndimage as ndi

def lade(p):
    dim = subprocess.check_output(['identify', '-format', '%w %h', p]).decode().split()
    W, H = int(dim[0]), int(dim[1])
    raw = subprocess.check_output(['convert', p, '-colorspace', 'sRGB', '-depth', '8', 'rgb:-'])
    return np.frombuffer(raw, np.uint8).reshape(H, W, 3).copy(), W, H

def speichere(a, p, q=90):
    H, W, _ = a.shape
    subprocess.run(['convert', '-size', f'{W}x{H}', '-depth', '8', 'rgb:-', '-quality', str(q), p], input=a.tobytes(), check=True)

def maske(a, W, H):
    luma = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    y0, y1 = int(0.415 * H), int(0.625 * H)           # Band, in dem der Platzhalter sitzt (Mitte der Hülle, unterhalb des Kameramoduls)
    dunkel = np.zeros_like(luma, bool); dunkel[y0:y1] = luma[y0:y1] < 150
    lab, n = ndi.label(dunkel, structure=np.ones((3, 3)))
    objs = ndi.find_objects(lab)
    # 1. Anker: breite Buchstaben (D, e, n, s, g): Höhe 40-190, Breite >= 38 und nicht gigantisch; Tasten am Rand sind schmal
    anker = [sl for sl in objs if 40 <= sl[0].stop - sl[0].start <= 190 and 38 <= sl[1].stop - sl[1].start <= 320]
    if not anker: return np.zeros_like(dunkel), None
    bx0, bx1 = min(s[1].start for s in anker), max(s[1].stop for s in anker)
    by0, by1 = min(s[0].start for s in anker), max(s[0].stop for s in anker)
    # 2. alles Dunkle INNERHALB dieses Kastens (i-Punkte, i-Striche, Antialiasing-Inseln), Tasten und Hüllenrand liegen ausserhalb
    m = np.zeros_like(dunkel)
    for i, sl in enumerate(objs, 1):
        if sl[1].start >= bx0 - 6 and sl[1].stop <= bx1 + 6 and sl[0].start >= by0 - 14 and sl[0].stop <= by1 + 14:
            m |= lab == i
    return m, (bx0, bx1, by0, by1)

import os
RAND=int(os.environ.get('RAND','11')); SIGX=float(os.environ.get('SIGX','9'))
def fuelle(a, m, rand=None, luecke=4, tief=9):
    rand = RAND if rand is None else rand
    out = a.astype(np.float32).copy()
    H, W, _ = a.shape
    md = ndi.binary_dilation(m, iterations=rand)       # Antialiasing-Saum und JPEG-Ringing mitnehmen
    for x in np.where(md.any(axis=0))[0]:
        col = md[:, x]; ys = np.where(col)[0]
        runs = np.split(ys, np.where(np.diff(ys) > 1)[0] + 1)
        for r in runs:
            ya, yb = r[0], r[-1]
            top = np.median(a[max(0, ya - luecke - tief):max(1, ya - luecke), x].astype(np.float32), axis=0)
            bot = np.median(a[yb + luecke:yb + luecke + tief, x].astype(np.float32), axis=0)
            n = yb - ya + 1
            t = (np.arange(n) + 1) / (n + 1)
            out[ya:yb + 1, x] = top[None, :] * (1 - t[:, None]) + bot[None, :] * t[:, None]
    # senkrechte Schlieren: im gefüllten Bereich in Zeilenrichtung kräftig glätten, an der Naht weich ausblenden
    fe = ndi.gaussian_filter(md.astype(np.float32), 3.0); fe = np.clip(fe * 1.6, 0, 1)
    wei = ndi.gaussian_filter(out, sigma=(1.2, SIGX, 0))
    out = out * (1 - fe[..., None]) + wei * fe[..., None]
    ring = ndi.binary_dilation(md, iterations=18) & ~md
    sd = float((a[ring].astype(np.float32) - ndi.gaussian_filter(a.astype(np.float32), sigma=(2, 2, 0))[ring]).std())
    rng = np.random.default_rng(7)
    out = out + (rng.normal(0, sd, a.shape).astype(np.float32) * ndi.gaussian_filter(md.astype(np.float32), 1.0)[..., None])
    return np.clip(out, 0, 255).astype(np.uint8), md, sd

if __name__ == '__main__':
    a, W, H = lade(sys.argv[1])
    m, box = maske(a, W, H)
    if box is None or not m.any(): print('KEIN TEXT ERKANNT', sys.argv[1]); sys.exit(3)
    bw, bh = box[1] - box[0], box[3] - box[2]
    if not (450 <= bw <= 950 and 60 <= bh <= 220): print(f'UNPLAUSIBLER TEXTKASTEN {bw}x{bh}', sys.argv[1]); sys.exit(4)
    b, md, sd = fuelle(a, m)
    speichere(b, sys.argv[2])
    ys, xs = np.where(md)
    print(f'{sys.argv[1]}: Maske {int(m.sum())} px, erweitert {int(md.sum())}, Box x {xs.min()}-{xs.max()} y {ys.min()}-{ys.max()}, Rauschen sd {sd:.2f}')
    if len(sys.argv) > 3:
        v = a.copy(); v[md] = [255, 0, 255]; speichere(v, sys.argv[3], 85)
