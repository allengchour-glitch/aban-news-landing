#!/usr/bin/env python3
"""ABAN Files - Stock-Footage Pipeline (GRATIS).
ElevenLabs ALLENG-Stimme + Pexels-Stockclips + Karaoke-Untertitel (ASS) + Dark-Drone
-> cinematisches 9:16-Video. Aufruf:  XI=<el> PEXELS=<key> python3 aban_stock.py <ep>
"""
import os, sys, json, base64, subprocess, urllib.request, urllib.parse
import imageio_ffmpeg

XI = os.environ["XI"]; PEXELS = os.environ["PEXELS"]
VOICE = os.environ.get("VOICE", "pNInz6obpgDQGcFmaJgB")
FF = imageio_ffmpeg.get_ffmpeg_exe()
W, H, FPS = 1080, 1920, 30
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

SCENES = {
    "ep1": ["dark server room data center", "glowing circuit board macro", "artificial intelligence network",
            "earth from space at night", "deep cave tunnel dark", "futuristic city night fog"],
    "ep2": ["moon surface craters", "dark side of the moon", "rocket launch night",
            "astronaut space dark", "stars galaxy time lapse", "radar satellite dish night"],
    "ep3": ["data center servers blinking", "power grid electricity night", "cooling fans technology",
            "underground tunnel industrial", "glowing fiber optics", "city power lines dusk"],
}


def tts(text):
    body = json.dumps({"text": text, "model_id": "eleven_multilingual_v2",
                       "voice_settings": {"stability": 0.35, "similarity_boost": 0.75,
                                          "style": 0.5, "use_speaker_boost": True}}).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
        data=body, method="POST", headers={"xi-api-key": XI, "Content-Type": "application/json"})
    d = json.load(urllib.request.urlopen(req, timeout=120))
    open("/tmp/_a.mp3", "wb").write(base64.b64decode(d["audio_base64"]))
    al = d["alignment"]; ch, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
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


UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"


def _search(params):
    url = "https://api.pexels.com/videos/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": PEXELS, "User-Agent": UA})
    return json.load(urllib.request.urlopen(req, timeout=60)).get("videos", [])


def pexels_dl(query, idx):
    vids = _search({"query": query, "orientation": "portrait", "per_page": 8, "size": "medium"})
    if not vids:
        vids = _search({"query": query, "per_page": 8})
    if not vids:
        return None
    # bestes File: portrait, hoehe>=1080, sonst groesstes
    best, bestscore = None, -1
    for v in vids:
        for f in v.get("video_files", []):
            h, w = f.get("height", 0), f.get("width", 0)
            score = h + (5000 if h >= w else 0) + min(h, 1920)
            if score > bestscore:
                bestscore, best = score, f["link"]
    out = f"/tmp/_stock_{idx}.mp4"
    dreq = urllib.request.Request(best, headers={"User-Agent": UA})
    with urllib.request.urlopen(dreq, timeout=120) as r, open(out, "wb") as fo:
        fo.write(r.read())
    return out


def fmt_ts(t):
    h = int(t // 3600); m = int((t % 3600) // 60); s = t % 60
    return f"{h:01d}:{m:02d}:{s:05.2f}"


def build_ass(words, total, path):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: K,DejaVu Sans,64,&H004FCFFF,&H00F2F2F2,&H00101010,&H64000000,1,0,0,0,100,100,0,0,1,4,3,5,80,80,250,1
Style: TAG,DejaVu Sans,40,&H0050C8FF,&H0050C8FF,&H00101010,&H00000000,1,0,0,0,100,100,6,0,1,2,2,8,0,0,70,1
[Events]
Format: Layer, Start, End, Style, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,{fmt_ts(0)},{fmt_ts(total)},TAG,,0,0,0,,A B A N   F I L E S
"""
    groups = [words[i:i + 4] for i in range(0, len(words), 4)]
    lines = []
    for gi, g in enumerate(groups):
        gs = g[0][1]
        ge = groups[gi + 1][0][1] if gi + 1 < len(groups) else (g[-1][2] + 0.4)
        parts = []
        for wi, (w, ws, we) in enumerate(g):
            nxt = g[wi + 1][1] if wi + 1 < len(g) else ge
            kcs = max(1, int((nxt - ws) * 100))
            parts.append(f"{{\\k{kcs}}}{w} ")
        lines.append(f"Dialogue: 0,{fmt_ts(gs)},{fmt_ts(ge)},K,,0,0,0,,{''.join(parts).strip()}")
    open(path, "w").write(head + "\n".join(lines) + "\n")


def render(ep):
    scenes = SCENES[ep]
    words, dur = tts(text=json.load(open("/tmp/aban_scripts.json"))[ep]["text"])
    total = dur + 0.7
    seg = total / len(scenes)
    # Stockclips holen + normalisieren auf 9:16
    norm = []
    for i, q in enumerate(scenes):
        src = pexels_dl(q, i)
        if not src:
            continue
        out = f"/tmp/_seg_{i}.mp4"
        subprocess.run([FF, "-y", "-stream_loop", "3", "-i", src, "-t", f"{seg:.2f}",
                        "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS}",
                        "-an", "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", out],
                       check=True, capture_output=True)
        norm.append(out)
    concat = "/tmp/_concat.txt"
    open(concat, "w").write("\n".join(f"file '{p}'" for p in norm))
    subprocess.run([FF, "-y", "-f", "concat", "-safe", "0", "-i", concat, "-c", "copy", "/tmp/_base.mp4"],
                   check=True, capture_output=True)
    # Audio: Stimme + Drone
    subprocess.run([FF, "-y", "-i", "/tmp/_a.mp3", "-ar", "44100",
                    "-af", "highpass=f=60,dynaudnorm=f=200", "/tmp/_vo.wav"], check=True, capture_output=True)
    build_ass(words, total, "/tmp/_subs.ass")
    drone = "sine=f=48,volume=0.05[a];sine=f=72,volume=0.035[b];[a][b]amix=2,lowpass=f=180,aecho=0.6:0.5:600:0.3,volume=0.5[d]"
    vf = (f"eq=brightness=-0.12:saturation=0.92:contrast=1.05,vignette=PI/4.5,"
          f"noise=alls=7:allf=t,subtitles=/tmp/_subs.ass")
    subprocess.run([FF, "-y", "-i", "/tmp/_base.mp4", "-i", "/tmp/_vo.wav",
                    "-filter_complex", f"[0:v]{vf}[v];{drone};[1:a]volume=1.0[vo];[vo][d]amix=2:duration=first[ao]",
                    "-map", "[v]", "-map", "[ao]", "-c:v", "libx264", "-crf", "22", "-preset", "veryfast",
                    "-c:a", "aac", "-b:a", "160k", "-shortest", f"/tmp/aban_stock_{ep}.mp4"],
                   check=True, capture_output=True)
    print(f"[{ep}] done {dur:.1f}s {len(norm)} scenes -> /tmp/aban_stock_{ep}.mp4", flush=True)


if __name__ == "__main__":
    render(sys.argv[1] if len(sys.argv) > 1 else "ep1")
