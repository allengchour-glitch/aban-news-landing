#!/usr/bin/env python3
# =============================================================================
#  freegen_video — gratis Text→Video-Engine (HeyGen-Alternative, ohne Credits)
# -----------------------------------------------------------------------------
#  Erzeugt aus einem JSON-Skript ein fertiges MP4: pro Szene ein gebrandeter
#  Text (Pillow, sauberer Umbruch + Schatten) über Bild/Farbe, plus Musik.
#  Läuft UNBEGRENZT und KOSTENLOS — kein API-Key, keine Credits.
#
#  Abhängigkeiten: Pillow + ein ffmpeg-Binary. ffmpeg wird automatisch gefunden
#  (PATH oder das von `pip install imageio-ffmpeg` mitgelieferte Binary).
#
#  Aufruf:
#    python3 automation/freegen_video.py freegen/script.example.json
#
#  Skript-Format (JSON):
#    {
#      "output": "freegen/out/clip.mp4",
#      "w": 1080, "h": 1920, "fps": 30,
#      "music": "automation/music/luxe-premium.wav",
#      "brand": "LUXESTYLE.CH",
#      "scenes": [
#        { "text": "Premium-Mode aus der Schweiz", "seconds": 3, "bg": "#0b0b0c" },
#        { "text": "Versandkostenfrei ab CHF 65", "seconds": 3, "image": "pfad.jpg" }
#      ]
#    }
# =============================================================================

import json, os, sys, subprocess, shutil, tempfile

from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def find_ffmpeg():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit("❌ Kein ffmpeg gefunden. Installier es (apt) oder: pip install imageio-ffmpeg")


def tts(text, out_wav, model=None):
    """Gratis-Voiceover via piper. Gibt den WAV-Pfad zurück oder None."""
    import glob
    piper = shutil.which("piper")
    if not piper or not text:
        return None
    m = model or os.environ.get("PIPER_MODEL")
    if not m or not os.path.exists(m):
        hits = sorted(glob.glob(os.path.expanduser("~/.local/share/piper-voices/*.onnx")))
        de = [x for x in hits if "de_DE" in os.path.basename(x)]
        m = (de or hits or [None])[0]
    if not m:
        return None
    p = subprocess.run([piper, "-m", m, "-f", out_wav], input=text.encode("utf-8"),
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    return out_wav if p.returncode == 0 and os.path.exists(out_wav) else None


def wav_dur(path):
    import wave
    with wave.open(path) as wv:
        return wv.getnframes() / float(wv.getframerate())


def hex_rgb(s, default=(11, 11, 12)):
    if not s:
        return default
    s = s.lstrip("#")
    try:
        return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
    except Exception:
        return default


def wrap(draw, text, font, max_w):
    """Zeilenumbruch nach Pixelbreite."""
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=font) <= max_w or not cur:
            cur = test
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def cover(img, w, h):
    """Bild formatfüllend zuschneiden (cover)."""
    iw, ih = img.size
    scale = max(w / iw, h / ih)
    img = img.resize((int(iw * scale), int(ih * scale)), Image.LANCZOS)
    x = (img.width - w) // 2
    y = (img.height - h) // 2
    return img.crop((x, y, x + w, y + h))


def render_scene(scene, w, h, brand, out_png):
    bg = hex_rgb(scene.get("bg"), (11, 11, 12))
    base = Image.new("RGB", (w, h), bg)
    if scene.get("image") and os.path.exists(scene["image"]):
        try:
            ph = Image.open(scene["image"]).convert("RGB")
            base = cover(ph, w, h)
            # Abdunkeln für Lesbarkeit
            ov = Image.new("RGB", (w, h), (0, 0, 0))
            base = Image.blend(base, ov, 0.42)
        except Exception:
            pass

    draw = ImageDraw.Draw(base)
    margin = int(w * 0.09)
    max_w = w - 2 * margin
    size = int(w * 0.085)
    font = ImageFont.truetype(FONT_BOLD, size)
    lines = wrap(draw, scene.get("text", ""), font, max_w)
    line_h = int(size * 1.25)
    block_h = line_h * len(lines)
    y = (h - block_h) // 2

    for ln in lines:
        tw = draw.textlength(ln, font=font)
        x = (w - tw) // 2
        # Schatten + Text
        draw.text((x + 3, y + 3), ln, font=font, fill=(0, 0, 0))
        draw.text((x, y), ln, font=font, fill=(255, 255, 255))
        y += line_h

    if brand:
        bf = ImageFont.truetype(FONT_REG, int(w * 0.032))
        bw = draw.textlength(brand, font=bf)
        draw.text(((w - bw) // 2, int(h * 0.92)), brand, font=bf, fill=(230, 230, 230))

    base.save(out_png)


def main():
    if len(sys.argv) < 2:
        sys.exit("Aufruf: python3 automation/freegen_video.py <skript.json>")
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    w = int(spec.get("w", 1080))
    h = int(spec.get("h", 1920))
    fps = int(spec.get("fps", 30))
    brand = spec.get("brand", "")
    music = spec.get("music")
    output = spec.get("output", "freegen/out/clip.mp4")
    scenes = list(spec.get("scenes", []))
    if not scenes:
        sys.exit("❌ Keine 'scenes' im Skript.")

    # Marken-Intro / -Outro (opt-in) — einheitliche Klammer um jedes Reel.
    if spec.get("intro"):
        scenes.insert(0, {"text": spec["intro"], "seconds": float(spec.get("intro_seconds", 2.2)),
                          "bg": spec.get("intro_bg", "#0b0b0c")})
    if spec.get("outro"):
        scenes.append({"text": spec["outro"], "seconds": float(spec.get("outro_seconds", 2.5)),
                       "bg": spec.get("outro_bg", "#0b0b0c")})

    os.makedirs(os.path.dirname(output) or ".", exist_ok=True)
    ff = find_ffmpeg()
    tmp = tempfile.mkdtemp(prefix="freegen_")

    # Optionales Voiceover (piper) — eine Erzählung über das ganze Reel.
    voice_wav = tts(spec.get("voiceover", ""), os.path.join(tmp, "voice.wav")) if spec.get("voiceover") else None
    if voice_wav:
        vdur = wav_dur(voice_wav) + 0.6
        cur = sum(float(s.get("seconds", 3)) for s in scenes)
        if vdur > cur:  # letzte Szene strecken, damit das Bild die Stimme abdeckt
            scenes[-1]["seconds"] = float(scenes[-1].get("seconds", 3)) + (vdur - cur)

    inputs, filters, total = [], [], 0.0

    for i, sc in enumerate(scenes):
        secs = float(sc.get("seconds", 3))
        total += secs
        png = os.path.join(tmp, f"s{i}.png")
        render_scene(sc, w, h, brand, png)
        # Ken-Burns-Bewegung (sanfter Zoom) — Standard an, wenn ein Bild da ist.
        motion = sc.get("motion", bool(sc.get("image")))
        if motion:
            d = max(1, int(round(secs * fps)))
            inputs += ["-i", png]
            filters.append(
                f"[{i}:v]scale={w * 2}:{h * 2},"
                f"zoompan=z='min(zoom+0.0010,1.10)':d={d}:"
                f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}:fps={fps},"
                f"setsar=1,format=yuv420p[v{i}]")
        else:
            inputs += ["-loop", "1", "-t", f"{secs}", "-i", png]
            filters.append(f"[{i}:v]scale={w}:{h},setsar=1,fps={fps},format=yuv420p[v{i}]")

    n = len(scenes)
    concat = "".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[v]"

    cmd = [ff, "-y", *inputs]
    has_music = bool(music and os.path.exists(music))
    fade_st = max(0.0, total - 1.5)
    audio_parts, map_audio = [], False

    if voice_wav and has_music:
        cmd += ["-i", voice_wav, "-stream_loop", "-1", "-i", music]
        audio_parts = [
            f"[{n}:a]apad,atrim=0:{total:.2f},volume=1.0[vo]",
            f"[{n + 1}:a]atrim=0:{total:.2f},afade=t=out:st={fade_st:.2f}:d=1.5,volume=0.16[mu]",
            "[vo][mu]amix=inputs=2:duration=first:normalize=0[a]",
        ]
        map_audio = True
    elif voice_wav:
        cmd += ["-i", voice_wav]
        audio_parts = [f"[{n}:a]apad,atrim=0:{total:.2f}[a]"]
        map_audio = True
    elif has_music:
        cmd += ["-stream_loop", "-1", "-i", music]
        audio_parts = [f"[{n}:a]atrim=0:{total:.2f},afade=t=out:st={fade_st:.2f}:d=1.5,volume=0.7[a]"]
        map_audio = True

    fc = ";".join(filters + [concat] + audio_parts)
    cmd += ["-filter_complex", fc, "-map", "[v]"]
    if map_audio:
        cmd += ["-map", "[a]", "-c:a", "aac", "-b:a", "160k"]

    cmd += ["-r", str(fps), "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", "-shortest", output]

    print(f"▶ Rendere {n} Szene(n), {total:.1f}s → {output}")
    r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if r.returncode != 0:
        sys.stderr.write(r.stderr.decode("utf-8", "ignore")[-1500:])
        sys.exit(f"\n❌ ffmpeg-Fehler ({r.returncode})")
    sz = os.path.getsize(output) / 1e6
    print(f"✅ Fertig: {output} ({sz:.1f} MB)")


if __name__ == "__main__":
    main()
