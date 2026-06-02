#!/usr/bin/env python3
"""Cover-art resolver for the KDP pipeline — image IN, drawn art, or (gated) AI.

Three ways to get the front-cover raster, with a self-diagnosing fallback chain:

  1. "image" — process a supplied photo/illustration: convert to RGB, cover-crop
     to the exact front-panel size (trim + bleed) at 300 DPI, and report the
     effective resolution (warns below 300 DPI).
  2. "draw"  — programmatically paint brand cover art with Pillow (gradient +
     concentric-arc motif in the book's accent colours). No network, no stock.
  3. "ai"    — optional AI image motif. OFF unless opted in AND an image API key
     is configured; this repo deliberately uses no 3rd-party image API by
     default, so the hook is left unwired and diagnoses itself as skipped.

resolve() picks per the configured mode (default "auto" = ai -> image -> draw),
always returns a usable front image (falls back to drawn art) plus a diagnosis
log and whether the cover should apply a legibility scrim.

    from cover_art import resolve
    r = resolve(cover_cfg, trim=(6,9), bleed=0.125, dpi=300, workdir="out/x")
    cfg["front_image"], cfg["front_scrim"] = r["path"], r["scrim"]
    for line in r["diag"]: print(line)
"""
import os
from PIL import Image, ImageDraw, ImageOps, ImageFilter


def _hex(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _shade(rgb, f):
    return tuple(max(0, min(255, int(c * f))) for c in rgb)


def _front_px(trim, bleed, dpi):
    """Front panel covers one trim width + outer bleed, full height + 2x bleed."""
    tw, th = trim
    return int(round((tw + bleed) * dpi)), int(round((th + 2 * bleed) * dpi))


def prepare_image(src, trim, bleed, dpi, out, diag):
    """Cover-crop a supplied image to the exact front-panel size; self-diagnose DPI."""
    Wt, Ht = _front_px(trim, bleed, dpi)
    tw, th = trim
    im = Image.open(src)
    mode_note = "" if im.mode == "RGB" else f" (converted from {im.mode})"
    im = im.convert("RGB")
    sw, sh = im.size
    eff = min(sw / (tw + bleed), sh / (th + 2 * bleed))
    if eff < dpi - 1:
        diag.append(f"  ⚠ image ~{eff:.0f} DPI on the front (<{dpi}) — print may look soft")
    src_ar, tgt_ar = sw / sh, Wt / Ht
    if abs(src_ar - tgt_ar) > 0.02:
        diag.append(f"  · aspect {src_ar:.2f} ≠ front {tgt_ar:.2f} → cover-cropped to fill")
    fitted = ImageOps.fit(im, (Wt, Ht), method=Image.LANCZOS, centering=(0.5, 0.4))
    fitted.save(out, dpi=(dpi, dpi))
    diag.append(f"  · image {sw}x{sh}{mode_note} → {Wt}x{Ht}px @ {dpi} DPI")
    return out


def _gradient(Wt, Ht, top, bot):
    img = Image.new("RGB", (Wt, Ht))
    px = img.load()
    for y in range(Ht):
        f = y / max(1, Ht - 1)
        col = tuple(int(top[i] + (bot[i] - top[i]) * f) for i in range(3))
        for x in range(Wt):
            px[x, y] = col
    return img


def _motif(style, d, Wt, Ht, line, lw):
    """Draw the chosen motif onto RGBA draw `d` (in `line` colour). Sits low so the
    title block (top third) stays clean."""
    cx, cy = int(Wt * 0.5), int(Ht * 0.70)
    if style == "burst":                                    # radiating spokes
        import math
        R = int(min(Wt, Ht) * 0.62)
        for i in range(24):
            ang = math.pi * i / 24
            dx, dy = math.cos(ang), math.sin(ang)
            d.line([cx - dx * R, cy - dy * R, cx + dx * R, cy + dy * R],
                   fill=line + (34,), width=lw)
        d.ellipse([cx - 70, cy - 70, cx + 70, cy + 70], fill=line + (90,))
    elif style == "dots":                                   # halftone field, fades up
        step = int(min(Wt, Ht) * 0.052)
        for gy in range(int(Ht * 0.42), Ht, step):
            for gx in range(step // 2, Wt, step):
                f = (gy - Ht * 0.42) / (Ht - Ht * 0.42)     # 0 top .. 1 bottom
                r = max(1, int(step * 0.16 * (0.4 + f)))
                d.ellipse([gx - r, gy - r, gx + r, gy + r], fill=line + (int(40 + 70 * f),))
    elif style == "arc":                                    # concentric corner arcs
        ax, ay = int(Wt * 0.5), Ht                          # anchored bottom-centre
        step = int(min(Wt, Ht) * 0.11)
        for k in range(1, 8):
            r = step * k
            d.arc([ax - r, ay - r, ax + r, ay + r], 180, 360,
                  fill=line + (max(0, 95 - k * 9),), width=lw)
    else:                                                   # "rings" (default), bolder
        step = int(min(Wt, Ht) * 0.092)
        for k in range(1, 8):
            r = step * k
            d.ellipse([cx - r, cy - r, cx + r, cy + r],
                      outline=line + (max(0, 105 - k * 11),), width=lw)
        d.ellipse([cx - step + lw, cy - step + lw, cx + step - lw, cy + step - lw],
                  fill=line + (40,))                        # soft solid core


def draw_art(cfg, trim, bleed, dpi, out, diag):
    """Paint a brand front illustration: vertical gradient + a chosen accent motif.
    Motif style via cfg['art']['motif']: rings (default) | burst | dots | arc."""
    Wt, Ht = _front_px(trim, bleed, dpi)
    bg = _hex(cfg.get("bg", "#138086"))
    line = _hex(cfg.get("line", "#8FD3D6"))
    style = cfg.get("art", {}).get("motif", "rings")
    img = _gradient(Wt, Ht, _shade(bg, 1.20), _shade(bg, 0.58)).convert("RGBA")
    ov = Image.new("RGBA", (Wt, Ht), (0, 0, 0, 0))
    _motif(style, ImageDraw.Draw(ov), Wt, Ht, line, max(3, int(dpi / 75)))
    ov = ov.filter(ImageFilter.GaussianBlur(radius=max(1, dpi // 400)))
    img = Image.alpha_composite(img, ov).convert("RGB")
    img.save(out, dpi=(dpi, dpi))
    diag.append(f"  · drawn brand art {Wt}x{Ht}px @ {dpi} DPI (gradient + '{style}' motif)")
    return out


def ai_art(cfg, trim, bleed, dpi, out, diag):
    """Optional AI motif — gated; unwired by default (repo uses no 3rd-party img API)."""
    art = cfg.get("art", {})
    key = os.environ.get("COVER_IMAGE_API_KEY")
    if not art.get("ai"):
        return None
    if not key:
        diag.append("  · ai: opted in but COVER_IMAGE_API_KEY unset → fallback")
        return None
    # Intentionally unwired: plug your image provider here and write `out`.
    diag.append("  · ai: no provider wired in cover_art.ai_art() → fallback")
    return None


def resolve(cover_cfg, trim, bleed=0.125, dpi=300, workdir="."):
    """Return {path, scrim, diag}. mode: auto|image|draw|ai|none."""
    art = cover_cfg.get("art", {})
    mode = art.get("mode", "auto")
    diag = [f"cover-art: mode={mode}"]
    out_img = os.path.join(workdir, "_front-art.png")
    if mode == "none":
        diag.append("  · typographic cover (no front image)")
        return {"path": None, "scrim": False, "diag": diag}

    # 1) AI (auto or explicit) — self-diagnoses and usually falls back
    if mode in ("auto", "ai"):
        p = ai_art(cover_cfg, trim, bleed, dpi, out_img, diag)
        if p:
            return {"path": p, "scrim": True, "diag": diag}

    # 2) supplied image (auto or explicit)
    if mode in ("auto", "image"):
        src = art.get("src")
        if src and os.path.exists(src):
            p = prepare_image(src, trim, bleed, dpi, out_img, diag)
            return {"path": p, "scrim": art.get("scrim", True), "diag": diag}
        if mode == "image":
            diag.append(f"  ⚠ image src missing ({src!r}) → fell back to drawn art")

    # 3) drawn brand art (the always-available floor)
    p = draw_art(cover_cfg, trim, bleed, dpi, out_img, diag)
    return {"path": p, "scrim": art.get("scrim", False), "diag": diag}
