#!/usr/bin/env python3
"""Korrigiert die angeschnittene Überschrift der Text-Videos (Vorlage «Hook · Produkt · Preis», 1080×1920, 8 s) – Verfahren vom 09.11.2026.

Fall: Kaiserpinguin-Video – die zweite Überschriftzeile («für Kinder ab 3 Jahren?») war breiter als das Bild und links/rechts abgeschnitten.
Vorgehen (die Szene 1 dauert bis 2,6 s, Tonspur und alle anderen Bilder bleiben unverändert):
  1. Ein sauberer Hintergrundstreifen (nur Creme) wird aus dem Video selbst über das Überschriftenband gelegt
     (Überlagerung im RGB-Format: die Standardüberlagerung rechnet in YUV und färbt das Band dunkler).
  2. Die Überschrift wird in Gelasio Bold (Georgia-Ersatz mit gleichen Zeichenbreiten, OFL) neu gesetzt: gleiche Grösse (92 px) und gleiche Lage der
     ersten Zeile, die lange Zeile auf zwei Zeilen verteilt, Einblenden in 0,25 s wie im Original.
Schrift: npm pack @fontsource/gelasio → files/gelasio-latin-700-normal.woff (ffmpeg liest WOFF direkt). Nicht im Repo (Lizenz OFL 1.1, frei nutzbar).

  python3 pinguin_hook_fix.py ORIGINAL.mp4 SCHRIFT.woff AUSGABE.mp4 "Ein Plüschtier" "für Kinder" "ab 3 Jahren?"
Eichung: «Ein Plüschtier» ergibt mit Gelasio 92 px dieselbe Breite wie im Original (666 px, x 208..874). Das Band liegt bei y 235..615
(das Produktbild beginnt bei y ≈ 720), der saubere Streifen stammt aus y 1540..1920.
"""
import os
import subprocess
import sys

ORIGINAL, FONT, OUT = sys.argv[1:4]
ZEILEN = sys.argv[4:]
SIZE, TOP, PITCH, SZENE_ENDE, EINBLENDEN = 92, 251, 120, 2.6, 0.25
BAND_Y, BAND_H, STREIFEN_Y = 235, 380, 1540
FARBE = '0x2A2A24'
W = 1080


def glyphen_oben(text, y):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=0xF4EFE5:s=1080x700', '-vf',
                          f"drawtext=fontfile={FONT}:text='{text}':fontsize={SIZE}:fontcolor={FARBE}:x=(w-text_w)/2:y={y}",
                          '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True, check=True).stdout
    return min(yy for yy in range(700) if any(raw[yy * W + x] < 120 for x in range(0, W, 2)))


versatz = glyphen_oben(ZEILEN[0], 100) - 100        # Abstand Glyphenoberkante zu y-Parameter
ys = [TOP - versatz + PITCH * k for k in range(len(ZEILEN))]
dts = ','.join(f"drawtext=fontfile={FONT}:text='{t}':fontsize={SIZE}:fontcolor={FARBE}@1:x=(w-text_w)/2:y={y}:"
               f"alpha='min(t/{EINBLENDEN},1)':enable='lt(t,{SZENE_ENDE})'" for t, y in zip(ZEILEN, ys))
fc = (f"[0:v]format=rgb24,split[a][b];[b]crop=1080:{BAND_H}:0:{STREIFEN_Y}[p];"
      f"[a][p]overlay=0:{BAND_Y}:format=rgb:enable='lt(t,{SZENE_ENDE})'[c];[c]{dts}[v]")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', ORIGINAL, '-filter_complex', fc, '-map', '[v]', '-map', '0:a', '-c:v', 'libx264', '-crf', '17',
                '-preset', 'slow', '-pix_fmt', 'yuvj420p', '-color_range', 'pc', '-colorspace', 'bt470bg', '-r', '30', '-c:a', 'copy',
                '-movflags', '+faststart', OUT], check=True)
print('geschrieben:', OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB')
