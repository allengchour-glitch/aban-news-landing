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


def draw_art(cfg, trim, bleed, dpi, out, diag):
    """Paint a brand front illustration: vertical gradient + concentric arcs."""
    Wt, Ht = _front_px(trim, bleed, dpi)
    bg = _hex(cfg.get("bg", "#138086"))
    line = _hex(cfg.get("line", "#8FD3D6"))
    top = _shade(bg, 1.18)          # a touch lighter up top (behind title)
    bot = _shade(bg, 0.62)          # darker toward the foot
    img = Image.new("RGB", (Wt, Ht), bg)
    px = img.load()
    for y in range(Ht):             # smooth vertical gradient
        f = y / max(1, Ht - 1)
        col = tuple(int(top[i] + (bot[i] - top[i]) * f) for i in range(3))
        for x in range(Wt):
            px[x, y] = col
    ov = Image.new("RGBA", (Wt, Ht), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    cx, cy = int(Wt * 0.5), int(Ht * 0.66)      # motif sits below the title block
    step = int(min(Wt, Ht) * 0.085)
    for k in range(1, 7):
        r = step * k
        a = max(0, 70 - k * 9)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=line + (a,),
                  width=max(2, int(dpi / 110)))
    ov = ov.filter(ImageFilter.GaussianBlur(radius=max(1, dpi // 300)))
    img = Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")
    img.save(out, dpi=(dpi, dpi))
    diag.append(f"  · drawn brand art {Wt}x{Ht}px @ {dpi} DPI (gradient + arc motif)")
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
