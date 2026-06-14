#!/usr/bin/env python3
# LuxeStyle — Marken-Video 9:16 (60s-Master + 30s-Kurzschnitt), reproduzierbar & committet.
# Stimme: piper Kerstin (DE, weiblich, auto-Download). Musik: NEUES music_library.mjs (Kevin
# MacLeod, CC-BY 4.0, kommerziell-frei) — KEIN billiger GM-Synth mehr.
#
# ⚠️ SAFE-ZONE-REGEL (User 2026-06-14 „schrift unten achtung"): TikTok/IG/Reels blenden unten
#    ~20 % (Caption/CTA/Fortschrittsbalken) und rechts ~12 % (Icons) ein. Daher endet ALLER
#    eingebrannte Text bei ~78 % Hoehe (y<=1500) — nie ganz unten, sonst Textbrei mit der
#    Plattform-Caption.
#
# Nutzung:  /opt/node22/bin/node existiert · python3 dropship/ads/render_brand_video.py
#   ENV optional: MUSIC_ID (default dreams-become-real), OUTDIR (default reels)
import subprocess, sys, os

HERE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # repo root
TMP = "/tmp/brand"; SEG = f"{TMP}/seg"
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
GRADE = "eq=contrast=1.06:saturation=1.10:brightness=0.012,vignette=angle=PI/5"
MUSIC_ID = os.environ.get("MUSIC_ID", "dreams-become-real")
OUTDIR = os.path.join(HERE, os.environ.get("OUTDIR", "reels"))
NODE = "/opt/node22/bin/node" if os.path.exists("/opt/node22/bin/node") else "node"
VOICE = f"{TMP}/kerstin.onnx"
VOICE_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/kerstin/low/de_DE-kerstin-low.onnx"
os.makedirs(SEG, exist_ok=True); os.makedirs(OUTDIR, exist_ok=True)

VO60 = ("Willkommen bei LuxeStyle, deinem Schweizer Online-Shop. Premium-Looks zu fairen Preisen, "
        "ganz ohne teuren Marken-Aufschlag. Mode für Sie und für Ihn. Schmuck, der funkelt. Beauty "
        "und Wellness für deinen Alltag. Und clevere Ideen für dein Zuhause. Jedes Teil mit Sorgfalt "
        "ausgewählt. Und das Beste: Mit Selbst gestalten machst du dein ganz eigenes Design. T-Shirt, "
        "Hoodie, Tasche oder Tasse, in deiner Farbe, mit deinem Motiv, auf Bestellung gedruckt. Wir "
        "liefern weltweit, gratis ab fünfundsechzig Franken, mit dreissig Tagen Rückgaberecht. Bezahl "
        "bequem mit Twint, Karte oder PayPal. Sichere dir jetzt zehn Prozent auf deine erste Bestellung, "
        "mit dem Code Welcome zehn. Entdecke deinen Look, auf luxestyle punkt c h.")
VO30 = ("LuxeStyle, dein Schweizer Online-Shop. Mode, Schmuck, Beauty und mehr, zu fairen Preisen. "
        "Und mit Selbst gestalten machst du dein eigenes Design. Zehn Prozent mit dem Code Welcome "
        "zehn. Jetzt entdecken, auf luxestyle punkt c h.")

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        print("ERR:", ' '.join(args)[:160], "\n", r.stderr[-700:]); sys.exit(1)
    return r

def ensure_voice():
    if os.path.exists(VOICE) and os.path.getsize(VOICE) > 1_000_000:
        return
    print("⬇️  Kerstin-Stimme laden …")
    run(["curl", "-sS", "-L", "--max-time", "180", "-o", VOICE, VOICE_URL])
    run(["curl", "-sS", "-L", "--max-time", "60", "-o", VOICE + ".json", VOICE_URL + ".json"])

def synth(text, out):
    p = subprocess.run(["piper", "-m", VOICE, "-f", out], input=text, capture_output=True, text=True)
    if p.returncode != 0 or not os.path.exists(out):
        print("PIPER ERR:", p.stderr[-500:]); sys.exit(1)

def get_music():
    """Laedt einen kommerziell-freien Track ueber das neue Tool (schreibt CREDITS.md) und gibt die
    rohe MP3 zurueck — build() loopt/fadet sie selbst (gebunden via -t), kein Riesen-Zwischen-WAV."""
    run([NODE, f"{HERE}/automation/music/music_library.mjs", "pick", "--id", MUSIC_ID])
    mp3 = f"{HERE}/automation/music/lib/{MUSIC_ID}.mp3"
    if not os.path.exists(mp3):
        print("❌ Musik-Cache fehlt:", mp3); sys.exit(1)
    return mp3

def esc(t): return t.replace(":", "\\:").replace("'", "’")

def overlay(label, sub):
    # SAFE-ZONE: Caption-Band hochgezogen (Box bis y=1540 ≈ 80 %, Text endet ~1485 ≈ 77 %).
    l = esc(label); s = esc(sub)
    return (f"drawtext=fontfile={F}:text='LUXESTYLE':fontcolor=white@0.85:fontsize=36:x=(w-text_w)/2:y=70:"
            f"shadowcolor=black@0.6:shadowx=2:shadowy=2:alpha='min(t/0.5,1)',"
            f"drawbox=x=0:y=1300:w=1080:h=240:color=black@0.40:t=fill,"
            f"drawtext=fontfile={F}:text='{l}':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=1345:"
            f"shadowcolor=black:shadowx=2:shadowy=2:alpha='min(max((t-0.3)/0.4\\,0)\\,1)',"
            f"drawtext=fontfile={F}:text='{s}':fontcolor=0xF5D08A:fontsize=42:x=(w-text_w)/2:y=1430:"
            f"alpha='min(max((t-0.45)/0.4\\,0)\\,1)'")

def seg_vid(src, out, D, label, sub):
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-t", str(D),
         "-vf", f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,{GRADE},{overlay(label,sub)}",
         "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", out])

def seg_photo(src, out, D, label, sub):
    f = int(D * 30)
    run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", src, "-t", str(D),
         "-vf", (f"scale=1620:2880:force_original_aspect_ratio=increase,crop=1620:2880,"
                 f"zoompan=z='min(zoom+0.0008,1.12)':d={f}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,"
                 f"setsar=1,{GRADE},{overlay(label,sub)}"),
         "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", out])

def seg_card(out, D, title, sub, sub2=""):
    t = esc(title); s = esc(sub); s2 = esc(sub2)
    dt = (f"drawtext=fontfile={F}:text='{t}':fontcolor=white:fontsize=92:x=(w-text_w)/2:y=780:alpha='min(t/0.6,1)',"
          f"drawtext=fontfile={F}:text='{s}':fontcolor=0xF5D08A:fontsize=52:x=(w-text_w)/2:y=930:alpha='min(max((t-0.3)/0.5\\,0)\\,1)'")
    if s2:
        dt += f",drawtext=fontfile={F}:text='{s2}':fontcolor=white@0.9:fontsize=44:x=(w-text_w)/2:y=1010:alpha='min(max((t-0.5)/0.5\\,0)\\,1)'"
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x16110d:s=1080x1920:r=30", "-t", str(D),
         "-vf", f"{dt},vignette=angle=PI/4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", out])

def build(version, segs, D, C, vo, bed, out):
    paths = []
    for i, sp in enumerate(segs):
        o = f"{SEG}/{version}_{i:02d}.mp4"; kind = sp[0]
        if kind == "card": seg_card(o, D, sp[1], sp[2], sp[3] if len(sp) > 3 else "")
        elif kind == "vid": seg_vid(f"{HERE}/{sp[1]}", o, D, sp[2], sp[3])
        else: seg_photo(f"{HERE}/{sp[1]}", o, D, sp[2], sp[3])
        paths.append(o)
    N = len(paths); T = round(N * D - (N - 1) * C, 2)
    inputs = []
    for p in paths: inputs += ["-i", p]
    fc = ""; prev = "[0:v]"
    for k in range(1, N):
        off = round(k * (D - C), 3); lab = f"[x{k}]" if k < N - 1 else "[v]"
        fc += f"{prev}[{k}:v]xfade=transition=fade:duration={C}:offset={off}{lab};"
        prev = f"[x{k}]"
    fc = fc.rstrip(";")
    vidonly = f"{TMP}/{version}_vid.mp4"
    run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", fc, "-map", "[v]", "-r", "30",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", vidonly])
    bedloop = f"{TMP}/{version}_bed.wav"
    run(["ffmpeg", "-y", "-loglevel", "error", "-stream_loop", "-1", "-i", bed, "-t", str(T),
         "-af", f"volume=0.16,afade=t=in:st=0:d=1,afade=t=out:st={T-2}:d=2", bedloop])
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", vidonly, "-i", vo, "-i", bedloop,
         "-filter_complex", f"[1:a]adelay=2200|2200,loudnorm=I=-15:TP=-1.5[vo];[2:a]aresample=44100[mu];[vo][mu]amix=inputs=2:duration=longest:dropout_transition=3,loudnorm=I=-14:TP=-1[a]",
         "-map", "0:v", "-map", "[a]", "-t", str(T), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out])
    print(f"✅ {version}: {out}  ~{T}s  ({N} Segmente, Musik={MUSIC_ID})")

LONG = [
    ("card", "LuxeStyle", "Schweizer Online-Shop", "Premium · fair · weltweit"),
    ("vid", "reels/veo-hero-brise-2026-06-08.mp4", "Sommermode", "Kleider für heisse Tage"),
    ("photo", "social/enhanced/monsieur-hemd.jpg", "Herrenmode", "Looks für Ihn"),
    ("photo", "social/enhanced/eclat-kette.jpg", "Schmuck & Uhren", "Funkelnde Details"),
    ("vid", "reels/veo-hero-nuit-2026-06-08.mp4", "Taschen", "Crossbody «Nuit»"),
    ("photo", "social/enhanced/augenmassage.jpg", "Beauty & Wellness", "Self-Care für jeden Tag"),
    ("photo", "social/enhanced/craquele-vase.jpg", "Für dein Zuhause", "Deko & Lifestyle"),
    ("vid", "reels/veo-hero-cosy-2026-06-08.mp4", "Cardigans", "Kuschelig in viele Farben"),
    ("photo", "social/enhanced/strohtasche.jpg", "Accessoires", "Der Sommer-Look"),
    ("vid", "reels/veo-hero-sirene-2026-06-08.mp4", "Abendmode", "Der grosse Auftritt"),
    ("card", "Selbst gestalten", "Dein Design, dis eiges Teil", "on-demand gedruckt"),
    ("vid", "reels/veo-hero-mountaintee-2026-06-09.mp4", "T-Shirts", "Dein Motiv"),
    ("vid", "reels/veo-hero-sunsethoodie-2026-06-09.mp4", "Hoodies", "In deiner Farbe"),
    ("vid", "reels/veo-hero-quotemug-2026-06-09.mp4", "Tassen", "Mit deinem Spruch"),
    ("vid", "reels/veo-hero-cattote-2026-06-09.mp4", "Taschen", "Eigenes Design"),
    ("card", "luxestyle.ch", "−10 Prozent · Code WELCOME10", "Weltweiter Versand · 30 Tage Rückgabe"),
]
SHORT = [
    ("card", "LuxeStyle", "Schweizer Online-Shop", "Premium · fair · weltweit"),
    ("vid", "reels/veo-hero-brise-2026-06-08.mp4", "Sommermode", "Für Sie"),
    ("photo", "social/enhanced/monsieur-hemd.jpg", "Herrenmode", "Für Ihn"),
    ("photo", "social/enhanced/eclat-kette.jpg", "Schmuck", "Funkelnde Details"),
    ("vid", "reels/veo-hero-nuit-2026-06-08.mp4", "Taschen", "Crossbody «Nuit»"),
    ("photo", "social/enhanced/augenmassage.jpg", "Beauty & Wellness", "Self-Care"),
    ("vid", "reels/veo-hero-cosy-2026-06-08.mp4", "Cardigans", "Viele Farben"),
    ("card", "Selbst gestalten", "Dein Design, dis eiges Teil", ""),
    ("vid", "reels/veo-hero-mountaintee-2026-06-09.mp4", "Eigene Designs", "T-Shirt, Tasse & mehr"),
    ("card", "luxestyle.ch", "−10 Prozent · WELCOME10", "Weltweiter Versand"),
]

if __name__ == "__main__":
    ensure_voice()
    print("🎙️  Voiceover (Kerstin) …")
    synth(VO60, f"{TMP}/vo60.wav"); synth(VO30, f"{TMP}/vo30.wav")
    print("🎵  Musik (kommerziell-frei) …")
    bed = get_music()
    build("long", LONG, 3.7, 0.45, f"{TMP}/vo60.wav", bed, f"{OUTDIR}/luxestyle-brand-60s.mp4")
    build("short", SHORT, 3.0, 0.4, f"{TMP}/vo30.wav", bed, f"{OUTDIR}/luxestyle-brand-30s.mp4")
