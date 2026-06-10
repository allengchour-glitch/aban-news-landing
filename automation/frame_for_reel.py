#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""frame_for_reel.py — bringt ein (oft niedrig aufgelöstes) Produktfoto VOR dem Reel-Render
auf ein sauberes 1080x1920-Frame (adaptiv via gen_post_image.place_hero):
hochauflösend = immersives Full-Bleed, niedrig aufgelöst = scharfes Produkt auf unscharfem BG.

So bekommt render_premium_reel.sh bereits korrekt dimensionierte, SCHARFE Eingaben
(kein 2–2.5× Hochskalieren im Video mehr → behebt 'Auflösung nicht gut').

Nutzung:  W=1080 H=1920 python3 frame_for_reel.py <in.jpg> <out.jpg>
Fällt bei fehlendem Pillow lautlos aus (Exit 0, Original bleibt) → Render läuft trotzdem.
"""
import os
import sys

inp = sys.argv[1] if len(sys.argv) > 1 else ""
outp = sys.argv[2] if len(sys.argv) > 2 else inp
W = int(os.environ.get("W", "1080"))
H = int(os.environ.get("H", "1920"))

try:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from PIL import Image
    import gen_post_image as g
    src = Image.open(inp).convert("RGB")
    g.place_hero(src, W, H).save(outp, "JPEG", quality=93, optimize=True)
    print(f"framed -> {outp} ({W}x{H})")
except Exception as e:
    sys.stderr.write(f"frame_for_reel übersprungen ({e}) — Original bleibt.\n")
    sys.exit(0)
