#!/usr/bin/env python3
"""ABAN Files - Faceless Sci-Fi Shorts Renderer.
ElevenLabs (Stimme + Wort-Timing) -> dunkler Sci-Fi-Look (Code-Regen, Amber-Glow,
Karaoke-Untertitel) -> 9:16 MP4 mit Stimme + dunklem Drone-Bett.
Aufruf:  XI=<key> python3 aban_render.py <ep>
"""
import os, sys, json, base64, math, random, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import urllib.request, imageio_ffmpeg

XI = os.environ["XI"]
VOICE = os.environ.get("VOICE", "pNInz6obpgDQGcFmaJgB")   # Adam - Dominant
FF = imageio_ffmpeg.get_ffmpeg_exe()
W, H, FPS = 1080, 1920, 30
FD = "/usr/share/fonts/truetype/dejavu"
F_TITLE = ImageFont.truetype(f"{FD}/DejaVuSans-Bold.ttf", 92)
F_HOOK  = ImageFont.truetype(f"{FD}/DejaVuSans.ttf", 50)
F_CAP   = ImageFont.truetype(f"{FD}/DejaVuSans-Bold.ttf", 74)
F_TAG   = ImageFont.truetype(f"{FD}/DejaVuSans-Bold.ttf", 32)
F_MONO  = ImageFont.truetype(f"{FD}/DejaVuSansMono-Bold.ttf", 30)
RAIN_CH = "01ABXYZΛΨΔΣΩ#@%<>/\\|アカサタナ"

AMBER = (255, 198, 80)
WHITE = (240, 240, 235)
DIM   = (104, 116, 128)


def tts(text):
    body = json.dumps({"text": text, "model_id": "eleven_multilingual_v2",
                       "voice_settings": {"stability": 0.35, "similarity_boost": 0.75,
                                          "style": 0.5, "use_speaker_boost": True}}).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
        data=body, method="POST",
        headers={"xi-api-key": XI, "Content-Type": "application/json"})
    d = json.load(urllib.request.urlopen(req, timeout=120))
    open("/tmp/_a.mp3", "wb").write(base64.b64decode(d["audio_base64"]))
    al = d["alignment"]
    ch, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    words, cur, ws, we = [], "", None, None
    for c, s, e in zip(ch, st, en):
        if c.strip() == "":
            if cur:
                words.append((cur, ws, we)); cur, ws, we = "", None, None
            continue
        if ws is None:
            ws = s
        cur += c; we = e
    if cur:
        words.append((cur, ws, we))
    return words, (en[-1] if en else 0.0)


def base_layers():
    # statischer Hintergrund-Verlauf + Vignette + Amber-Radialglow (RGBA)
    yy = np.linspace(0, 1, H)[:, None]
    top, bot = np.array([10, 14, 20]), np.array([3, 5, 8])
    grad = (top * (1 - yy) + bot * yy)[:, None, :].repeat(W, 1).astype(np.float32)
    grad = np.broadcast_to(grad, (H, W, 3)).copy()
    xx, yv = np.meshgrid(np.linspace(-1, 1, W), np.linspace(-1.4, 1.4, H))
    r = np.sqrt(xx ** 2 + yv ** 2)
    vig = np.clip(1.15 - r * 0.55, 0.25, 1.0)[..., None]
    glow = np.clip(1 - (np.sqrt(xx ** 2 + (yv * 1.1) ** 2) / 0.9), 0, 1) ** 2.2
    glow = (glow[..., None] * np.array([255, 150, 50])).astype(np.float32)
    return grad, vig, glow


def draw_text_glow(d, xy, text, font, fill, anchor="mm", glow=(0, 0, 0)):
    x, y = xy
    for ox, oy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
        d.text((x + ox, y + oy), text, font=font, fill=glow, anchor=anchor)
    d.text((x, y), text, font=font, fill=fill, anchor=anchor)


def wrap(words, font, maxw, draw):
    lines, cur = [], []
    for w in words:
        t = " ".join([x[0] for x in cur] + [w[0]])
        if draw.textlength(t, font=font) > maxw and cur:
            lines.append(cur); cur = [w]
        else:
            cur.append(w)
    if cur:
        lines.append(cur)
    return lines


def render(ep, title, hook, text):
    words, dur = tts(text)
    total = dur + 0.9
    N = int(total * FPS)
    grad, vig, glow = base_layers()
    # Caption-Gruppen (je ~4 Wörter)
    groups = [words[i:i + 4] for i in range(0, len(words), 4)]
    # Code-Regen-Spalten
    random.seed(7)
    cols = []
    for x in range(40, W, 62):
        cols.append({"x": x, "y": random.uniform(-H, 0), "sp": random.uniform(6, 16),
                     "ch": [random.choice(RAIN_CH) for _ in range(16)]})
    tmp = ImageDraw.Draw(Image.new("RGB", (10, 10)))

    cmd = [FF, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p",
           "-crf", "20", "-preset", "veryfast", f"/tmp/_sil_{ep}.mp4"]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    for f in range(N):
        t = f / FPS
        frame = grad.copy()
        pulse = 0.18 + 0.10 * math.sin(t * 1.7)
        frame += glow * pulse
        img = Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8))
        d = ImageDraw.Draw(img)
        # Code-Regen
        for c in cols:
            c["y"] += c["sp"]
            if c["y"] > H + 200:
                c["y"] = random.uniform(-400, -50)
                c["ch"] = [random.choice(RAIN_CH) for _ in range(16)]
            for i, ch in enumerate(c["ch"]):
                yy = c["y"] - i * 30
                if -30 < yy < H:
                    b = max(0, 1 - i / 14)
                    col = (int(60 * b + 120 * (i == 0)), int(150 * b + 105 * (i == 0)), int(110 * b + 90 * (i == 0)))
                    d.text((c["x"], yy), ch, font=F_MONO, fill=col)
        # Top-Tag
        draw_text_glow(d, (W // 2, 92), "A B A N   F I L E S", F_TAG, AMBER, glow=(40, 20, 0))
        d.text((W // 2, 132), "· KING ALLENG ·", font=ImageFont.truetype(f"{FD}/DejaVuSans.ttf", 24),
               fill=DIM, anchor="mm")
        # Intro-Titel (0..2.1s)
        if t < 2.1:
            a = min(1, t / 0.4) * min(1, (2.1 - t) / 0.4)
            ti = Image.new("RGBA", (W, H), (0, 0, 0, 0)); dt = ImageDraw.Draw(ti)
            for ln, yy in wrap_title(title, dt):
                draw_text_glow(dt, (W // 2, yy), ln, F_TITLE, (255, 255, 255, int(255 * a)), glow=(60, 30, 0, int(180 * a)))
            draw_text_glow(dt, (W // 2, 1120), hook, F_HOOK, (255, 200, 90, int(255 * a)), glow=(0, 0, 0, int(200 * a)))
            img = Image.alpha_composite(img.convert("RGBA"), ti).convert("RGB"); d = ImageDraw.Draw(img)
        else:
            # Karaoke-Untertitel
            g = None
            for gr in groups:
                if gr[0][1] is not None and t >= gr[0][1] - 0.05 and t <= (gr[-1][2] or gr[0][1]) + 0.35:
                    g = gr
            if g is None:  # halte letzte Gruppe in Lücken
                for gr in groups:
                    if gr[0][1] is not None and t >= gr[0][1]:
                        g = gr
            if g:
                lines = wrap(g, F_CAP, 960, tmp)
                yy = H // 2 + 230 - (len(lines) - 1) * 50
                for line in lines:
                    tot = sum(tmp.textlength(w[0] + " ", font=F_CAP) for w in line)
                    x = W // 2 - tot / 2
                    for w, ws, we in line:
                        active = (ws is not None and ws - 0.05 <= t <= (we or ws) + 0.12)
                        spoken = (we is not None and t > we)
                        col = AMBER if active else (WHITE if spoken else DIM)
                        wt = w + " "
                        draw_text_glow(d, (x, yy), w, F_CAP, col, anchor="lm",
                                       glow=(50, 28, 0) if active else (0, 0, 0))
                        x += tmp.textlength(wt, font=F_CAP)
                    yy += 100
        # Vignette + Korn
        arr = np.asarray(img).astype(np.float32) * vig
        arr += np.random.normal(0, 3, (H, W, 1))
        p.stdin.write(np.clip(arr, 0, 255).astype(np.uint8).tobytes())
    p.stdin.close(); p.wait()

    # Audio: Stimme (EQ) + dunkles Drone-Bett, gemuxt
    subprocess.run([FF, "-y", "-i", "/tmp/_a.mp3", "-ar", "44100",
                    "-af", "highpass=f=60,dynaudnorm=f=200", "/tmp/_vo.wav"],
                   check=True, capture_output=True)
    drone = (f"sine=f=48,volume=0.05[a];sine=f=72,volume=0.035[b];"
             f"[a][b]amix=2,lowpass=f=180,aecho=0.6:0.5:600:0.3,volume=0.5[d]")
    subprocess.run([FF, "-y", "-i", f"/tmp/_sil_{ep}.mp4", "-i", "/tmp/_vo.wav",
                    "-filter_complex",
                    f"{drone};[1:a]volume=1.0[v];[v][d]amix=2:duration=first:dropout_transition=0,"
                    f"aresample=44100[ao]",
                    "-map", "0:v", "-map", "[ao]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
                    "-shortest", f"/tmp/aban_{ep}.mp4"], check=True, capture_output=True)
    print(f"[{ep}] done {dur:.1f}s -> /tmp/aban_{ep}.mp4", flush=True)


def wrap_title(title, draw):
    ws = title.split()
    lines, cur = [], []
    for w in ws:
        if draw.textlength(" ".join(cur + [w]), font=F_TITLE) > 940 and cur:
            lines.append(" ".join(cur)); cur = [w]
        else:
            cur.append(w)
    if cur:
        lines.append(" ".join(cur))
    y0 = 980 - (len(lines) - 1) * 55
    return [(ln, y0 + i * 110) for i, ln in enumerate(lines)]


if __name__ == "__main__":
    ep = sys.argv[1] if len(sys.argv) > 1 else "ep1"
    sc = json.load(open("/tmp/aban_scripts.json"))[ep]
    render(ep, sc["title"], sc["hook"], sc["text"])
