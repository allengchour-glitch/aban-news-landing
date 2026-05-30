#!/usr/bin/env python3
"""South-Park-STIL (Paper-Cutout) Test - eigene Figur, kein Charakter kopiert.
Flache Formen, grosser Kopf, Knopfaugen, Mund-Flap (Lipsync), Papier-Zittern."""
import math, numpy as np, imageio.v2 as imageio
from PIL import Image, ImageDraw, ImageFont

W, H = 480, 854
FPS = 20
DUR = 8.0
N = int(FPS*DUR)
SS = 2
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def font(px): return ImageFont.truetype(FONT, px*SS)

# palette (original colors, not matching any SP character)
SKIN   = (245, 205, 165)
BEANIE = (40, 170, 175)     # teal
POM    = (250, 235, 120)
COAT   = (120, 80, 200)     # purple
COATD  = (95, 60, 165)
MITT   = (235, 225, 210)
SHOE   = (60, 55, 70)
OUT    = (28, 24, 38)       # outline
WHITE  = (255,255,255)
AMBER  = (255,150,24)

def E(d, cx, cy, rx, ry, fill, outline=OUT, ow=3):
    d.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=fill, outline=outline, width=ow*SS)
def RR(d, x0,y0,x1,y1, r, fill, outline=OUT, ow=3):
    d.rounded_rectangle([x0,y0,x1,y1], radius=r, fill=fill, outline=outline, width=ow*SS)

def render_frame(fi):
    t = fi/FPS
    img = Image.new("RGB", (W*SS, H*SS), (250, 244, 230))   # paper-cream bg
    d = ImageDraw.Draw(img)

    # subtle paper texture stripes
    for yy in range(0, H*SS, 26*SS):
        d.line([(0,yy),(W*SS,yy)], fill=(243,236,220), width=SS)

    # ---- cutout PAPER JITTER: quantized to ~8fps, tiny offset + rotation ----
    q = math.floor(t*8)/8.0
    jx = (math.sin(q*53.0)*2.2)*SS
    jy = (math.cos(q*41.0)*2.0)*SS
    cx = W*SS*0.5 + jx
    base = H*SS*0.60 + jy
    bob = math.sin(t*2*math.pi*1.4)*4*SS

    # ===== LEGS (short stubby, pivot at hip) =====
    for side in (-1, 1):
        hipx = cx + side*40*SS
        step = math.sin(t*2*math.pi*1.4 + (0 if side<0 else math.pi))*6
        kx = hipx + step*SS
        RR(d, hipx-15*SS, base+5*SS, hipx+15*SS, base+70*SS, 12*SS, COATD)  # leg
        E(d, kx, base+82*SS, 22*SS, 14*SS, SHOE)                            # shoe

    # ===== BODY (small rounded coat) =====
    RR(d, cx-72*SS, base-70*SS+bob, cx+72*SS, base+18*SS+bob, 30*SS, COAT)
    # coat zipper
    d.line([(cx, base-66*SS+bob),(cx, base+12*SS+bob)], fill=COATD, width=4*SS)

    # ===== ARMS (stubby, pivot at shoulder, gentle gesture) =====
    for side in (-1, 1):
        shx = cx + side*70*SS
        shy = base-50*SS+bob
        ga = math.sin(t*2*math.pi*1.4 + (1 if side<0 else 2))*14
        ang = math.radians(70*side + ga)
        ex = shx + math.sin(ang)*46*SS
        ey = shy + abs(math.cos(ang))*46*SS
        RR(d, min(shx,ex)-13*SS, min(shy,ey)-13*SS, max(shx,ex)+13*SS, max(shy,ey)+13*SS, 13*SS, COAT)
        E(d, ex, ey, 17*SS, 17*SS, MITT)   # mitten hand

    # ===== HEAD (big, dominant) =====
    hx, hy = cx, base-150*SS+bob
    E(d, hx, hy, 96*SS, 90*SS, SKIN)

    # ----- EYES: two white ovals touching, beady pupils -----
    blink = (t % 3.0) > 2.86
    ex_off = 30*SS
    look = math.sin(t*1.3)*5*SS
    for s in (-1,1):
        E(d, hx+s*ex_off, hy-14*SS, 30*SS, 36*SS, WHITE, ow=3)
    if blink:
        for s in (-1,1):
            d.line([(hx+s*ex_off-22*SS, hy-14*SS),(hx+s*ex_off+22*SS, hy-14*SS)], fill=OUT, width=5*SS)
    else:
        for s in (-1,1):
            E(d, hx+s*ex_off+look, hy-12*SS, 8*SS, 10*SS, OUT, outline=OUT, ow=1)

    # ----- MOUTH FLAP (lipsync): amplitude from a 'speech' envelope -----
    # talking during the whole clip, varying open amount
    env = abs(math.sin(t*9.5)) * (0.5+0.5*abs(math.sin(t*2.1)))   # mouth open 0..1
    if (t % 3.4) > 3.0: env *= 0.1                                # tiny pauses
    mouthy = hy+46*SS
    mo = 4*SS + env*26*SS                                         # open height
    E(d, hx, mouthy, 30*SS, mo, (120,50,55))                      # mouth
    if mo > 14*SS:                                                # tongue when wide
        E(d, hx, mouthy+mo*0.35, 16*SS, mo*0.4, (210,90,95))

    # ----- BEANIE (rounded cap + pom) -----
    d.pieslice([hx-100*SS, hy-130*SS, hx+100*SS, hy+30*SS], 180, 360, fill=BEANIE, outline=OUT, width=3*SS)
    RR(d, hx-100*SS, hy-58*SS, hx+100*SS, hy-40*SS, 9*SS, BEANIE)   # brim
    E(d, hx, hy-118*SS, 18*SS, 18*SS, POM)                         # pom-pom

    # ===== CAPTION =====
    txt = "SO TICKT DEIN GEHIRN"
    ft = font(40)
    bb = d.textbbox((0,0), txt, font=ft); tw = bb[2]-bb[0]
    d.text((W*SS/2-tw/2, 60*SS+3*SS), txt, font=ft, fill=(0,0,0))
    d.text((W*SS/2-tw/2, 60*SS), txt, font=ft, fill=(255,255,255))
    ft2 = font(15)
    foot = "Stil-Test: South-Park-artiger Paper-Cutout (eigene Figur)"
    bb2 = d.textbbox((0,0), foot, font=ft2)
    d.text((W*SS/2-(bb2[2]-bb2[0])/2, H*SS-40*SS), foot, font=ft2, fill=(120,110,100))

    return img.resize((W,H), Image.LANCZOS)

if __name__ == "__main__":
    print(f"Rendering {N} frames (South Park style)...")
    writer = imageio.get_writer("/tmp/southpark-style.mp4", fps=FPS, codec="libx264",
                                quality=8, ffmpeg_params=["-pix_fmt","yuv420p"])
    stills = {18:"talk_open", 40:"talk_closed", 95:"gesture"}
    frames=[]
    for i in range(N):
        im = render_frame(i)
        writer.append_data(np.asarray(im.convert("RGB")))
        frames.append(im)
        if i in stills: im.convert("RGB").save(f"/tmp/sp_{stills[i]}.png")
    writer.close()
    frames[0].save("/tmp/southpark-style.gif", save_all=True, append_images=frames[1:],
                   duration=int(1000/FPS), loop=0, optimize=True)
    print("done -> /tmp/southpark-style.mp4 + .gif + stills")
