#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — fügt <img> die intrinsischen width/height-Attribute hinzu (gegen CLS).

Liest die echten Pixelmaße der lokalen Bilddatei (PNG/JPEG/GIF/WebP/SVG, stdlib) und
ergänzt width="W" height="H" NUR wenn beide fehlen. Kein Verzerren (echte Maße).
Externe/data:-Bilder + responsives `width:100%` (CSS skaliert weiterhin) bleiben unberührt.

  python3 tools/add_img_dims.py            # anwenden
  python3 tools/add_img_dims.py --dry      # nur zählen
"""
import argparse, glob, os, re, struct

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
SKIP_DIR = ("dropship/", "video-prototypes/", "node_modules/", "dist/", "_site/", ".git/")


def png_size(d):
    if d[:8] == b"\x89PNG\r\n\x1a\n" and d[12:16] == b"IHDR":
        return struct.unpack(">II", d[16:24])


def gif_size(d):
    if d[:6] in (b"GIF87a", b"GIF89a"):
        return struct.unpack("<HH", d[6:10])


def jpeg_size(d):
    if d[:2] != b"\xff\xd8":
        return None
    i = 2
    while i < len(d) - 9:
        if d[i] != 0xFF:
            i += 1; continue
        m = d[i + 1]
        if 0xC0 <= m <= 0xCF and m not in (0xC4, 0xC8, 0xCC):
            h, w = struct.unpack(">HH", d[i + 5:i + 9])
            return (w, h)
        if d[i + 2:i + 4]:
            seg = struct.unpack(">H", d[i + 2:i + 4])[0]
            i += 2 + seg
        else:
            break


def webp_size(d):
    if d[:4] != b"RIFF" or d[8:12] != b"WEBP":
        return None
    t = d[12:16]
    try:
        if t == b"VP8 ":
            w = struct.unpack("<H", d[26:28])[0] & 0x3FFF
            h = struct.unpack("<H", d[28:30])[0] & 0x3FFF
            return (w, h)
        if t == b"VP8L":
            b0, b1, b2, b3 = d[21], d[22], d[23], d[24]
            w = ((b1 & 0x3F) << 8 | b0) + 1
            h = ((b3 & 0x0F) << 10 | b2 << 2 | (b1 & 0xC0) >> 6) + 1
            return (w, h)
        if t == b"VP8X":
            w = (d[24] | d[25] << 8 | d[26] << 16) + 1
            h = (d[27] | d[28] << 8 | d[29] << 16) + 1
            return (w, h)
    except Exception:
        return None


def svg_size(path):
    s = open(path, encoding="utf-8", errors="ignore").read(2000)
    w = re.search(r'<svg[^>]*\bwidth="(\d+)', s)
    h = re.search(r'<svg[^>]*\bheight="(\d+)', s)
    if w and h:
        return (int(w.group(1)), int(h.group(1)))
    vb = re.search(r'viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"', s)
    if vb:
        return (round(float(vb.group(1))), round(float(vb.group(2))))


_cache = {}
def size_of(rel):
    if rel in _cache:
        return _cache[rel]
    path = rel.lstrip("/")
    res = None
    if os.path.exists(path):
        try:
            if path.lower().endswith(".svg"):
                res = svg_size(path)
            else:
                d = open(path, "rb").read(64) if path.lower().endswith((".png", ".gif")) else open(path, "rb").read()
                res = (png_size(d) or jpeg_size(d) or gif_size(d) or webp_size(d)) if not path.lower().endswith(".svg") else None
                if res is None:
                    d = open(path, "rb").read()
                    res = png_size(d) or jpeg_size(d) or gif_size(d) or webp_size(d)
        except Exception:
            res = None
    _cache[rel] = res
    return res


IMG = re.compile(r'<img\b[^>]*>')
SRC = re.compile(r'\bsrc="([^"]+)"')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()
    pages = [p.replace(os.sep, "/") for p in glob.glob("**/*.html", recursive=True)]
    pages = [p for p in pages if not any(p.startswith(d) for d in SKIP_DIR)]
    added = files = skipped = 0
    for p in pages:
        s = open(p, encoding="utf-8", errors="ignore").read()
        changed = False

        def repl(m):
            nonlocal added, skipped, changed
            tag = m.group(0)
            if "width=" in tag and "height=" in tag:
                return tag
            ms = SRC.search(tag)
            if not ms:
                return tag
            src = ms.group(1)
            if src.startswith(("http", "data:", "//")):
                return tag
            sz = size_of(src)
            if not sz or sz[0] <= 0 or sz[1] <= 0:
                skipped += 1
                return tag
            # nur ergänzen wenn KEINES von beiden gesetzt ist (sonst Layout-Annahmen respektieren)
            if "width=" in tag or "height=" in tag:
                return tag
            added += 1; changed = True
            return tag[:-1].rstrip() + f' width="{sz[0]}" height="{sz[1]}">'

        ns = IMG.sub(repl, s)
        if changed and not args.dry:
            open(p, "w", encoding="utf-8").write(ns)
            files += 1
    print(f"{'[dry] ' if args.dry else ''}width/height ergänzt: {added} imgs in {files} Dateien "
          f"(übersprungen, Maße unbekannt: {skipped})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
