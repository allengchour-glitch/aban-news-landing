#!/usr/bin/env python3
"""Szene #6 - 'Neo-Stickman', voll gelenkig, Bewegung synchron zum Text.
Rendert ein animiertes GIF (kein ffmpeg noetig)."""
import math
from PIL import Image, ImageDraw, ImageFont

# ---------- canvas / timing ----------
W, H = 480, 854          # 9:16, gross
FPS = 20
DUR = 12.0               # 12s loop, 6 beats x 2s
N = int(FPS * DUR)
SS = 2                   # supersampling for smooth thick lines
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

AMBER  = (255, 150, 24)
AMBER2 = (255, 200, 70)
WHITE  = (255, 255, 255)
INK    = (22, 15, 43)

def font(px): return ImageFont.truetype(FONT, px*SS)

# ---------- keyframe helper ----------
def smooth(t):                      # smoothstep ease
    return t*t*(3-2*t)

def key(t, frames, ease=True, overshoot=0.0):
    """frames: list of (time, value). returns interpolated value at time t."""
    if t <= frames[0][0]: return frames[0][1]
    if t >= frames[-1][0]: return frames[-1][1]
    for i in range(len(frames)-1):
        t0, v0 = frames[i]; t1, v1 = frames[i+1]
        if t0 <= t <= t1:
            f = (t-t0)/(t1-t0)
            if ease: f = smooth(f)
            v = v0 + (v1-v0)*f
            if overshoot and 0 < f < 1:           # tiny rubber overshoot near end
                v += math.sin(f*math.pi) * overshoot * (v1-v0) * 0.12
            return v
    return frames[-1][1]

# ---------- geometry: angles measured from straight-down, +clockwise ----------
def limb_end(x, y, ang, length):
    a = math.radians(ang)
    return x + length*math.sin(a), y + length*math.cos(a)

def thick_line(d, p0, p1, w, col):
    d.line([p0, p1], fill=col, width=int(w*SS))
    r = w*SS/2
    for p in (p0, p1):
        d.ellipse([p[0]-r, p[1]-r, p[0]+r, p[1]+r], fill=col)

def dot(d, p, r, col):
    d.ellipse([p[0]-r*SS, p[1]-r*SS, p[0]+r*SS, p[1]+r*SS], fill=col)

# ---------- beat captions (start_time, text, color, size) ----------
CAPS = [
    (0.0, 2.0,  "96× AM TAG",        AMBER2, 52),
    (2.0, 4.0,  "6 STUNDEN WEG",          WHITE,  50),
    (4.0, 6.0,  "AUSLÖSER → BELOHNUNG", WHITE, 36),
    (6.0, 8.0,  "DREI SEKUNDEN STILLE…", WHITE, 40),
    (8.0,10.0,  "MACH ES TEURER",         AMBER2, 48),
    (10.0,12.0, "…ODER?", WHITE, 54),
]

def render_frame(fi):
    t = fi / FPS
    img = Image.new("RGB", (W*SS, H*SS), (18, 12, 36))
    d = ImageDraw.Draw(img, "RGBA")

    # bg glow
    d.ellipse([W*SS*0.5-260*SS, H*SS*0.45-260*SS, W*SS*0.5+260*SS, H*SS*0.45+260*SS],
              fill=(255,176,32,16))

    cx = W*SS*0.42
    bob = math.sin(t*2*math.pi*1.9) * 5*SS      # idle bob
    ground = H*SS*0.66 + bob

    # ===== body skeleton anchors =====
    pelvis = (cx, ground)
    shoulder = (cx, ground - 150*SS)
    head_c = (cx, shoulder[1] - 70*SS)

    # ----- LEGS (idle walk-in-place): hip->knee->foot -----
    walk = math.sin(t*2*math.pi*1.9)
    for side, ph in ((1, 0), (-1, math.pi)):
        thigh_a = 8*side + 10*math.sin(t*2*math.pi*1.9 + ph)
        knee = limb_end(*pelvis, thigh_a, 80*SS)
        shin_a = thigh_a + 12 + 8*math.sin(t*2*math.pi*1.9 + ph)
        foot = limb_end(*knee, shin_a, 72*SS)
        thick_line(d, pelvis, knee, 16, AMBER)
        thick_line(d, knee, foot, 14, AMBER)
        dot(d, foot, 8, WHITE)

    # ----- BODY -----
    thick_line(d, shoulder, pelvis, 18, AMBER)

    # ----- LEFT ARM (idle swing): shoulder->elbow->hand -----
    la_sh = -16 + 10*math.sin(t*2*math.pi*1.9 + 1)
    la_el_pt = limb_end(*shoulder, la_sh, 66*SS)
    la_fo = la_sh + 22 + 8*math.sin(t*2*math.pi*1.9 + 1)
    la_hand = limb_end(*la_el_pt, la_fo, 58*SS)
    thick_line(d, shoulder, la_el_pt, 15, AMBER)
    thick_line(d, la_el_pt, la_hand, 13, AMBER)
    dot(d, la_hand, 9, WHITE)

    # ----- RIGHT ARM (the reflex, synced to text) -----
    # shoulder angle: idle hang ~12, twitch at hook, SNAP up at 'drei sekunden stille' (~6.3s),
    # hold scrolling, lower (put away) at trick (~8.4s)
    ra_sh = key(t, [
        (0.0, 12), (0.6, 12), (0.9, -6), (1.3, 12),   # hook twitch
        (6.0, 12), (6.25, 12),
        (6.45, 132),                                   # SNAP up
        (8.2, 132),                                    # hold/scroll
        (9.0, 12), (12.0, 12),
    ], overshoot=0.6)
    ra_el = key(t, [
        (0.0, 18), (6.25, 18), (6.45, 78), (8.2, 78), (9.0, 18), (12.0, 18),
    ])
    ra_el_pt = limb_end(*shoulder, ra_sh, 66*SS)
    ra_hand = limb_end(*ra_el_pt, ra_sh + ra_el, 58*SS)
    # smear at snap
    if 6.3 < t < 6.55:
        thick_line(d, shoulder, limb_end(*shoulder, 70, 120*SS), 4, (255,176,32,170))
    thick_line(d, shoulder, ra_el_pt, 15, AMBER)
    thick_line(d, ra_el_pt, ra_hand, 13, AMBER)
    dot(d, ra_hand, 10, WHITE)

    # phone in right hand while raised
    if 6.45 <= t <= 8.9:
        screen = (58,45,94)
        if 6.6 <= t <= 8.0: screen = (127,208,255)      # lit / scrolling
        elif t > 8.0: screen = (140,140,140)            # grey = trick
        px, py = ra_hand
        d.rounded_rectangle([px-13*SS, py-20*SS, px+13*SS, py+20*SS], radius=5*SS, fill=(34,34,34))
        d.rounded_rectangle([px-9*SS, py-15*SS, px+9*SS, py+15*SS], radius=3*SS, fill=screen)

    # ----- HEAD (tilts down to look at phone while scrolling) -----
    look = key(t, [(0,0),(6.4,0),(6.6,1),(8.0,1),(8.6,0),(12,0)])
    hx = head_c[0] + 6*SS*look
    hy = head_c[1] + 8*SS*look
    r = 42*SS
    d.ellipse([hx-r, hy-r, hx+r, hy+r], fill=AMBER)
    # eyes (blink)
    blink = (t % 3.2) > 3.05
    ey = hy + 2*SS + 10*SS*look
    if blink:
        d.line([hx-16*SS, ey, hx-7*SS, ey], fill=INK, width=4*SS)
        d.line([hx+7*SS, ey, hx+16*SS, ey], fill=INK, width=4*SS)
    else:
        # wink on loop beat
        wink = t > 10.6 and (t % 0.6) < 0.4
        d.ellipse([hx-16*SS, ey-5*SS, hx-6*SS, ey+5*SS], fill=INK)
        if wink:
            d.line([hx+6*SS, ey, hx+16*SS, ey], fill=INK, width=4*SS)
        else:
            d.ellipse([hx+6*SS, ey-5*SS, hx+16*SS, ey+5*SS], fill=INK)
    # brows
    d.line([hx-18*SS, hy-16*SS, hx-4*SS, hy-19*SS], fill=INK, width=5*SS)
    d.line([hx+4*SS, hy-19*SS, hx+18*SS, hy-16*SS], fill=INK, width=5*SS)

    # ===== PROPS =====
    # stopwatch (stakes 2-4s)
    if 2.0 <= t <= 4.0:
        sx, sy = W*SS*0.72, H*SS*0.22
        d.ellipse([sx-26*SS, sy-26*SS, sx+26*SS, sy+26*SS], outline=WHITE, width=4*SS)
        d.rounded_rectangle([sx-7*SS, sy-34*SS, sx+7*SS, sy-26*SS], radius=2*SS, fill=WHITE)
        ha = (t*6) % (2*math.pi)
        d.line([sx, sy, sx+18*SS*math.sin(ha), sy-18*SS*math.cos(ha)], fill=AMBER, width=3*SS)
    # loop wheel (mechanik 4-6s) bottom-left, rotating arc
    if 3.8 <= t <= 6.2:
        lx, ly = W*SS*0.16, H*SS*0.86
        rot = t*120
        for a0 in range(0, 360, 45):
            a = math.radians(a0+rot)
            if (a0//45) % 2 == 0:
                d.arc([lx-28*SS, ly-28*SS, lx+28*SS, ly+28*SS], a0+rot, a0+rot+32, fill=AMBER, width=6*SS)
    # traffic light (beispiel 6-8s)
    if 5.8 <= t <= 8.2:
        tx, ty = W*SS*0.86, H*SS*0.52
        d.rounded_rectangle([tx-18*SS, ty-46*SS, tx+18*SS, ty+46*SS], radius=9*SS, fill=(12,8,24), outline=(255,255,255,40), width=2*SS)
        red = (255,77,77) if t < 7.6 else (60,40,40)
        grn = (40,60,50) if t < 7.6 else (62,224,127)
        d.ellipse([tx-10*SS, ty-36*SS, tx+10*SS, ty-16*SS], fill=red)
        d.ellipse([tx-10*SS, ty+16*SS, tx+10*SS, ty+36*SS], fill=grn)
    # reward star pop (after grab ~7-7.6s)
    if 6.9 <= t <= 7.8:
        f = (t-6.9)/0.9
        sc = (1.3*math.sin(f*math.pi)) * SS
        stx, sty = W*SS*0.70, H*SS*0.34
        pts = []
        for i in range(10):
            ang = math.radians(i*36 - 90)
            rr = 22 if i % 2 == 0 else 9
            pts.append((stx + rr*sc*math.cos(ang), sty + rr*sc*math.sin(ang)))
        d.polygon(pts, fill=(255,211,77), outline=(255,157,0))

    # ===== CAPTION (synced) =====
    for (a, b, txt, col, sz) in CAPS:
        if a <= t < b:
            f = (t-a)
            alpha = 255
            if f < 0.15: alpha = int(255*(f/0.15))
            if b-t < 0.15: alpha = int(255*((b-t)/0.15))
            ft = font(sz)
            bb = d.textbbox((0,0), txt, font=ft)
            tw = bb[2]-bb[0]
            pop = 1.0 if f > 0.15 else 0.9 + 0.1*(f/0.15)
            tx = W*SS/2 - tw/2
            ty = 70*SS
            # shadow
            d.text((tx, ty+3*SS), txt, font=ft, fill=(0,0,0,min(alpha,120)))
            d.text((tx, ty), txt, font=ft, fill=col+(alpha,))

    # footer
    ft = font(13)
    foot = "Szene #6 · alle Gelenke · Bewegung synchron zum Text"
    bb = d.textbbox((0,0), foot, font=ft)
    d.text((W*SS/2-(bb[2]-bb[0])/2, H*SS-34*SS), foot, font=ft, fill=(255,255,255,90))

    return img.resize((W, H), Image.LANCZOS)

if __name__ == "__main__":
    print(f"Rendering {N} frames...")
    frames = [render_frame(i) for i in range(N)]
    print("Encoding GIF...")
    frames[0].save("/tmp/szene-06.gif", save_all=True, append_images=frames[1:],
                   duration=int(1000/FPS), loop=0, optimize=True)
    print("done -> /tmp/szene-06.gif")
