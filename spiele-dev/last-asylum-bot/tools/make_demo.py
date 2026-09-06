#!/usr/bin/env python3
"""Erzeugt eine Demo-Umgebung (Bildschirme + Templates) ohne echtes Gerät.

So kannst du den Bot sofort ausprobieren:
    python3 tools/make_demo.py
    python3 bot.py replay demo/frames --config config/demo.json
"""

from __future__ import annotations

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from laa.image import Image  # noqa: E402

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 540, 960  # kleiner als ein echtes Handy – hält die Demo schnell


def fill(img: Image, x: int, y: int, w: int, h: int, color) -> None:
    for j in range(max(0, y), min(img.height, y + h)):
        base = (j * img.width) * 3
        for i in range(max(0, x), min(img.width, x + w)):
            p = base + i * 3
            img.data[p] = color[0]
            img.data[p + 1] = color[1]
            img.data[p + 2] = color[2]


def noise_block(img: Image, x: int, y: int, w: int, h: int, seed: int, base=(60, 60, 70)) -> None:
    """Strukturierter Block – Template-Matching braucht Kontrast, nicht Einfarbigkeit."""
    rng = random.Random(seed)
    for j in range(h):
        for i in range(w):
            px, py = x + i, y + j
            if not (0 <= px < img.width and 0 <= py < img.height):
                continue
            k = rng.randint(-70, 70)
            p = (py * img.width + px) * 3
            img.data[p] = max(0, min(255, base[0] + k))
            img.data[p + 1] = max(0, min(255, base[1] + k))
            img.data[p + 2] = max(0, min(255, base[2] + k))


def make_background(seed: int) -> Image:
    img = Image.new(W, H, (24, 28, 34))
    rng = random.Random(seed)
    for i in range(14):  # Deko, damit die Bilder sich unterscheiden
        noise_block(img, rng.randint(0, W - 60), rng.randint(120, H - 160), 50, 40, seed * 100 + i, (40, 48, 60))
    fill(img, 0, 0, W, 70, (18, 20, 26))
    noise_block(img, 12, 14, 120, 40, seed + 7, (70, 90, 110))
    return img


def main() -> int:
    tpl_dir = os.path.join(HERE, "templates", "demo")
    frame_dir = os.path.join(HERE, "demo", "frames")
    os.makedirs(tpl_dir, exist_ok=True)
    os.makedirs(frame_dir, exist_ok=True)

    # Zwei markante Bedien-Elemente als Templates.
    close_x = Image.new(34, 34, (200, 60, 60))
    noise_block(close_x, 0, 0, 34, 34, 4711, (190, 70, 70))
    close_x.save(os.path.join(tpl_dir, "close_x.png"))

    claim = Image.new(120, 44, (60, 170, 90))
    noise_block(claim, 0, 0, 120, 44, 1234, (60, 170, 90))
    claim.save(os.path.join(tpl_dir, "claim.png"))

    # Bild 1: Werbung offen (Schliessen-Kreuz oben rechts)
    f1 = make_background(1)
    fill(f1, 60, 200, 420, 500, (12, 12, 16))
    _paste(f1, close_x, 470, 150)
    f1.save(os.path.join(frame_dir, "01-werbung.png"))

    # Bild 2: Belohnung abholbar
    f2 = make_background(2)
    _paste(f2, claim, 210, 700)
    f2.save(os.path.join(frame_dir, "02-belohnung.png"))

    # Bild 3: nichts zu tun
    make_background(3).save(os.path.join(frame_dir, "03-leer.png"))

    # Bild 4: wieder Belohnung, an anderer Stelle
    f4 = make_background(4)
    _paste(f4, claim, 120, 480)
    f4.save(os.path.join(frame_dir, "04-belohnung2.png"))

    print(f"Templates → {tpl_dir}")
    print(f"Bildschirme → {frame_dir}")
    print("Test:  python3 bot.py replay demo/frames --config config/demo.json")
    return 0


def _paste(dst: Image, src: Image, x: int, y: int) -> None:
    for j in range(src.height):
        for i in range(src.width):
            px, py = x + i, y + j
            if not (0 <= px < dst.width and 0 <= py < dst.height):
                continue
            s = (j * src.width + i) * 3
            d = (py * dst.width + px) * 3
            dst.data[d : d + 3] = src.data[s : s + 3]


if __name__ == "__main__":
    raise SystemExit(main())
