# Misst je Bild des Clips s01 (960x720) die Lage der Lampe: Tulpenspitze (oberste gelb-orange Zeile),
# Kugel (hellste warme Flaeche) und Sockel (unterste gesaettigte Zeile im Mittelband). Ausgabe in Prozent der Bildhoehe.
import subprocess, sys, json
import numpy as np
f = sys.argv[1]
W, H = 960, 720
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
n = len(raw) // (W * H * 3)
a = np.frombuffer(raw, np.uint8).reshape(n, H, W, 3).astype(int)
out = []
for i in range(n):
    fr = a[i]
    R, G, B = fr[..., 0], fr[..., 1], fr[..., 2]
    gelb = (R > 170) & (G > 90) & (B < 100) & (R - B > 110)
    band = gelb[:, 380:640]
    zeilen = np.where(band.sum(1) >= 3)[0]
    top = int(zeilen.min()) if len(zeilen) else None
    sat = (fr.max(-1) - fr.min(-1))
    # Sockel: unterhalb der Kugel, gesaettigte (goldene) oder dunkle Pixel im Mittelband
    sb = ((sat > 52) | (fr.max(-1) < 120))[:, 420:600]  # Tisch: Saettigung <= 45 und hell
    # zusammenhaengend von der Kugel abwaerts (Kugel: hell-warm im Mittelband), Luecke > 3 Zeilen beendet den Sockel
    kug = ((R > 170) & (R - B > 70))[:, 420:600].sum(1) >= 40
    kz = np.where(kug)[0]; kz = kz[kz > 250]
    unten = None
    if len(kz):
        y = int(kz.max()); luecke = 0; unten = y
        while y < H - 1:
            y += 1
            if sb[y].sum() >= 12: unten = y; luecke = 0
            else:
                luecke += 1
                if luecke > 3: break
    # links/rechts: Lampe gesamt (gelb oder Kugel hell-warm) 
    hellwarm = (R > 170) & (R - B > 70)
    cols = np.where(hellwarm[200:650, :].sum(0) >= 4)[0]
    cols = cols[(cols > 250) & (cols < 750)]
    out.append({'bild': i, 't': round(i / 24, 3), 'oben': top, 'unten': unten, 'links': int(cols.min()) if len(cols) else None, 'rechts': int(cols.max()) if len(cols) else None})
oben = [o['oben'] for o in out if o['oben'] is not None]; unten = [o['unten'] for o in out if o['unten'] is not None]
links = [o['links'] for o in out if o['links'] is not None]; rechts = [o['rechts'] for o in out if o['rechts'] is not None]
print(json.dumps({'bilder': n, 'oben_min_px': min(oben), 'oben_min_pct': round(100 * min(oben) / H, 2), 'unten_max_px': max(unten), 'unten_max_pct': round(100 * (max(unten) + 1) / H, 2),
  'links_min_pct': round(100 * min(links) / W, 2), 'rechts_max_pct': round(100 * (max(rechts) + 1) / W, 2), 'je_sekunde': [out[k] for k in range(0, n, 12)]}, ensure_ascii=False))
