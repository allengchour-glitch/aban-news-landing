#!/usr/bin/env python3
"""PNG -> progressives JPEG (q86, optimiert). Aufruf: /usr/bin/python3 tojpeg.py in.png out.jpg [qualitaet]  (Pillow noetig)"""
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
q = int(sys.argv[3]) if len(sys.argv) > 3 else 86
im = Image.open(src).convert('RGB')
im.save(dst, 'JPEG', quality=q, progressive=True, optimize=True, subsampling=0)
