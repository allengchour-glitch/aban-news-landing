#!/usr/bin/env python3
"""KDP full-wrap cover generator — TRUE VECTOR PDF (reportlab).

Why vector: KDP's image analysis repeatedly false-flags rasterized covers with
"object outside the margins" even when content is well inside. A vector PDF with
real, embedded text is measured precisely and passes cleanly.

Hard-won KDP lessons baked in:
  * Output is vector text, never a flattened image.
  * Exact full-wrap size: (2*trim_w + spine + 2*bleed) x (trim_h + 2*bleed).
  * Spine width = pages * paper-multiplier (white 0.002252, cream 0.0025, color 0.002347").
  * Thin spine (< ~0.35"): NO spine text (clearance impossible) -> leave it blank.
  * NEVER draw your own barcode or a barcode box; KDP places its own. Keep the
    bottom area clear.
  * Single flat background field — no colour blocks/stripes touching the edges
    (KDP flags those as "objects").
  * Fonts embedded; reportlab's default Helvetica is remapped to the embedded
    font so no non-embedded font remains.

Usage:
    from kdp_cover import build_cover, EXAMPLES
    build_cover(EXAMPLES["adhd"], "/path/out.pdf")
Or run directly to regenerate the bundled examples:
    python3 kdp_cover.py            # builds adhd + mileage demo covers to ./out/
"""
import os
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

PT = 72.0
PAPER = {"white": 0.002252, "cream": 0.0025, "color": 0.002347}
_DEJAVU = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
_DEJAVU_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def _register_fonts():
    if "DJR" not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont("DJR", _DEJAVU))
        pdfmetrics.registerFont(TTFont("DJB", _DEJAVU_B))


def _remap_helvetica(path):
    """Point any leftover reportlab Helvetica resource at the embedded DejaVu."""
    import pikepdf
    pdf = pikepdf.open(path, allow_overwriting_input=True)
    for page in pdf.pages:
        res = page.get("/Resources"); fonts = res.get("/Font") if res else None
        if not fonts:
            continue
        dj = None
        for _, f in fonts.items():
            bf = str(f.get("/BaseFont", ""))
            if "DejaVuSans" in bf and "Bold" not in bf:
                dj = f; break
        for k in list(fonts.keys()):
            if "Helvetica" in str(fonts[k].get("/BaseFont", "")) and dj is not None:
                fonts[k] = dj
    pdf.save(path)


def build_cover(cfg, out_pdf):
    """cfg keys:
        trim=(w,h) in inches, pages:int, paper:'white'|'cream'|'color', bleed:float,
        bg, pale, line, white  (hex colours),
        title_lines:[...], subtitle_lines:[...], feature:str, author:str,
        back_head:[...], back_para:str, bullets:[...]
    """
    _register_fonts()
    tw, th = cfg["trim"]
    bleed = cfg.get("bleed", 0.125)
    spine = round(cfg["pages"] * PAPER[cfg.get("paper", "white")], 4)
    full_w = 2 * tw + spine + 2 * bleed
    full_h = th + 2 * bleed
    Wp, Hp = full_w * PT, full_h * PT
    X = lambda i: i * PT
    T = lambda i: Hp - i * PT

    x_spine0 = bleed + tw
    x_spine1 = bleed + tw + spine
    front_cx = x_spine1 + tw / 2.0

    BG = HexColor(cfg.get("bg", "#138086"))
    PALE = HexColor(cfg.get("pale", "#EAFBFB"))
    LINE = HexColor(cfg.get("line", "#8FD3D6"))
    WHITE = HexColor(cfg.get("white", "#FFFFFF"))

    c = canvas.Canvas(out_pdf, pagesize=(Wp, Hp))
    c.setFillColor(BG); c.rect(0, 0, Wp, Hp, fill=1, stroke=0)   # one flat field

    def center(txt, cx, top, font, size, color):
        c.setFont(font, size * PT); c.setFillColor(color)
        c.drawCentredString(X(cx), T(top), txt)

    def left(txt, x, top, font, size, color):
        c.setFont(font, size * PT); c.setFillColor(color)
        c.drawString(X(x), T(top), txt)

    def wrap(text, x, top, font, size, leading, color, maxw):
        c.setFont(font, size * PT); c.setFillColor(color)
        m = maxw * PT; words, line = text.split(), ""
        for w in words:
            t = (line + " " + w).strip()
            if pdfmetrics.stringWidth(t, font, size * PT) <= m:
                line = t
            else:
                c.drawString(X(x), T(top), line); top += leading; line = w
        if line:
            c.drawString(X(x), T(top), line); top += leading
        return top

    # ---- FRONT ----
    ty = cfg.get("title_top", 2.7)
    tsize = cfg.get("title_size", 0.48)
    for ln in cfg["title_lines"]:
        center(ln, front_cx, ty, "DJB", tsize, WHITE); ty += tsize + 0.12
    ry = T(ty + 0.04); c.setStrokeColor(LINE); c.setLineWidth(0.022 * PT)
    c.line(X(front_cx - 0.85), ry, X(front_cx + 0.85), ry)
    sy = ty + 0.42
    for i, ln in enumerate(cfg.get("subtitle_lines", [])):
        center(ln, front_cx, sy + i * 0.27, "DJR", 0.165, PALE)
    if cfg.get("feature"):
        center(cfg["feature"], front_cx, full_h - 1.5, "DJR", 0.13, PALE)
    center(cfg["author"], front_cx, full_h - 0.95, "DJB", 0.20, WHITE)

    # ---- SPINE: text only if comfortably wide, else blank ----
    if spine >= 0.35 and cfg.get("spine_text"):
        from reportlab.lib.units import inch  # noqa
        c.saveState()
        c.translate(X((x_spine0 + x_spine1) / 2), Hp / 2)
        c.rotate(90)
        c.setFont("DJB", 0.10 * PT); c.setFillColor(WHITE)
        c.drawCentredString(0, -0.035 * PT, cfg["spine_text"])
        c.restoreState()

    # ---- BACK ----
    bx = bleed + 0.65
    bw = (x_spine0 - 0.5) - bx
    by = 1.3
    for i, ln in enumerate(cfg["back_head"]):
        col = WHITE if i < len(cfg["back_head"]) - 1 else PALE
        left(ln, bx, by, "DJB", 0.23, col); by += 0.33
    by += 0.2
    by = wrap(cfg["back_para"], bx, by, "DJR", 0.12, 0.19, PALE, bw) + 0.16
    for b in cfg["bullets"]:
        c.setFillColor(LINE); c.circle(X(bx + 0.03), T(by - 0.04), 0.03 * PT, fill=1, stroke=0)
        by = wrap(b, bx + 0.15, by, "DJR", 0.11, 0.17, WHITE, bw - 0.15) + 0.10

    c.showPage(); c.save()
    _remap_helvetica(out_pdf)
    return dict(full_w=full_w, full_h=full_h, spine=spine, out=out_pdf)


# ---------------- bundled example configs (the two covers built 2026-06-02) -----
EXAMPLES = {
    "adhd": dict(
        trim=(6, 9), pages=102, paper="white",
        bg="#138086", pale="#EAFBFB", line="#8FD3D6",
        title_lines=["ADHD Daily", "Planner", "for Adults"],
        subtitle_lines=["A 90-Day Planner Built", "for an ADHD Brain"],
        feature="Time-Blocks  ·  Body Doubling  ·  Daily Top 3",
        author="MARCUS REILLY",
        back_head=["Three things.", "One page a day.", "That's the system."],
        back_para=("Your brain isn't broken — it just runs a different operating system. "
                   "This planner works with it. One clean page a day: your Top 3, hour-by-hour "
                   "time blocks to beat time-blindness, a spot for body doubling, and a place "
                   "to catch the small dopamine wins that keep you moving."),
        bullets=[
            "90 undated daily pages — start any day, miss a day guilt-free",
            "Top 3 priorities, not an endless to-do list",
            "Time-block schedule + brain-dump space on every page",
            "Body-doubling and dopamine-win prompts built in",
            "6x9 inches, matte cover, room to actually write",
        ],
    ),
    "mileage": dict(
        trim=(6, 9), pages=119, paper="white",
        bg="#456A8C", pale="#E9F0F7", line="#A9C2DA",
        title_lines=["Mileage Log Book", "for Small Business"], title_size=0.42, title_top=2.55,
        subtitle_lines=["IRS-style daily mileage tracker",
                        "for self-employed, rideshare & 1099 filers"],
        feature="Schedule C ready  ·  2025 IRS rate $0.67 / mile",
        author="MARCUS REILLY",
        back_head=["Every mile. Every trip.", "Audit-ready."],
        back_para=("Built to substantiate Schedule C, Line 9. A contemporaneous trip log for the "
                   "self-employed, 1099 contractors, rideshare drivers, realtors and Etsy sellers "
                   "— the mileage record the IRS (Publication 463) expects, kept the simple way."),
        bullets=[
            "Date, odometer start/end, total miles & purpose on every line",
            "Business / personal / medical / charity at a glance",
            "Monthly and yearly mileage totals",
            "2025 standard mileage rate reference ($0.67/mile)",
            "6x9 inches, durable matte cover, easy to fill in",
        ],
    ),
}

if __name__ == "__main__":
    os.makedirs("out", exist_ok=True)
    for name, cfg in EXAMPLES.items():
        info = build_cover(cfg, f"out/cover-{name}-6x9.pdf")
        print(f"{name}: {info['full_w']}x{info['full_h']}in  spine {info['spine']}in -> {info['out']}")
