"""mediakit/video_edit.py — Video-Operationen (dünne ffmpeg-Wrapper).

trim, concat, vertical(9:16), captions, music, fade, thumb — plus Bausteine
(still_to_segment, concat_demux), die reel.py wiederverwendet. Alle ffmpeg-Aufrufe
laufen über ffmpeg_util.run() (klarer Fehler statt verschluckter stderr).
"""
import os
import re
import subprocess
import tempfile

from . import audio, brand
from .ass_subs import srt_to_ass
from .ffmpeg_util import MediakitError, get_ffmpeg, run

W, H, FPS = brand.W, brand.H, 30
VERTICAL_VF = (f"scale={W}:{H}:force_original_aspect_ratio=increase,"
               f"crop={W}:{H},setsar=1,fps={FPS}")


# ---- Probe-Helfer -----------------------------------------------------------
def probe_duration(path):
    ff = get_ffmpeg()
    p = subprocess.run([ff, "-hide_banner", "-i", str(path)], capture_output=True, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", p.stderr)
    if not m:
        raise MediakitError(f"Konnte Dauer nicht lesen aus: {path}")
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


def has_audio(path):
    ff = get_ffmpeg()
    p = subprocess.run([ff, "-hide_banner", "-i", str(path)], capture_output=True, text=True)
    return "Audio:" in p.stderr


def _ss(t):
    """'0:03' / '12' / '1:02.5' → Sekunden-String für ffmpeg (-ss akzeptiert beides, aber wir normieren)."""
    if t is None:
        return None
    if ":" in str(t):
        parts = [float(x) for x in str(t).split(":")]
        sec = 0.0
        for p in parts:
            sec = sec * 60 + p
        return f"{sec:.3f}"
    return f"{float(t):.3f}"


# ---- Bausteine (auch von reel.py genutzt) -----------------------------------
def still_to_segment(img, dur, out, motion=True, idx=0, n=1, fade=0.4):
    """Standbild → Videosegment der Länge dur (9:16, yuv420p).

    motion=True: dezenter Ken-Burns-Zoom (gegen den „statisch/langweilig"-Look),
    Drift-Richtung alterniert je Slide. Ein-/Ausblende nur am ersten/letzten Slide.
    """
    ff = get_ffmpeg()
    frames = max(1, int(round(dur * FPS)))
    if motion:
        # Supersampling gegen das zoompan-Ruckeln: Slide 2,5x hochskalieren, ZENTRIERT
        # (ohne Seitwärts-Drift) langsam zoomen, dann sauber auf 1080x1920 runterrechnen.
        # Pixel-Rundungssprünge werden so unsichtbar → ruhiger Zoom, kein Wackeln.
        ss_w, ss_h = int(W * 2.5), int(H * 2.5)
        # gerade Slides leicht rein-, ungerade leicht rauszoomen (Abwechslung, beides ruhig)
        if idx % 2 == 0:
            z = "min(zoom+0.0004,1.08)"
        else:
            z = "if(eq(on,0),1.08,max(zoom-0.0004,1.0))"
        vf = (f"scale={ss_w}:{ss_h}:flags=bicubic,"
              f"zoompan=z='{z}':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
              f"s={W}x{H}:fps={FPS},format=yuv420p")
        if idx == 0:
            vf = vf.replace(",format=yuv420p", f",fade=t=in:st=0:d={fade},format=yuv420p")
        if idx == n - 1:
            vf = vf.replace(",format=yuv420p", f",fade=t=out:st={max(0, dur - fade):.2f}:d={fade},format=yuv420p")
    else:
        vf = f"{VERTICAL_VF},format=yuv420p"
    run([ff, "-y", "-loop", "1", "-i", str(img), "-t", f"{dur:.2f}",
         "-vf", vf,
         "-an", "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", str(out)])
    return out


def concat_demux(segments, out, reencode=False):
    """Segmente per concat-Demuxer aneinanderhängen (gleiche Codec-Params vorausgesetzt)."""
    ff = get_ffmpeg()
    lst = tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False)
    lst.write("\n".join(f"file '{os.path.abspath(str(p))}'" for p in segments))
    lst.close()
    args = [ff, "-y", "-f", "concat", "-safe", "0", "-i", lst.name]
    if reencode:
        args += ["-c:v", "libx264", "-crf", "22", "-preset", "veryfast", "-c:a", "aac", "-b:a", "160k"]
    else:
        args += ["-c", "copy"]
    args.append(str(out))
    try:
        run(args)
    finally:
        os.unlink(lst.name)
    return out


# ---- CLI-Operationen --------------------------------------------------------
def trim(in_path, out, start=None, end=None, duration=None):
    ff = get_ffmpeg()
    args = [ff, "-y"]
    if start is not None:
        args += ["-ss", _ss(start)]
    args += ["-i", str(in_path)]
    if duration is not None:
        args += ["-t", _ss(duration)]
    elif end is not None:
        args += ["-to", _ss(end)]
    args += ["-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-c:a", "aac", "-b:a", "160k", str(out)]
    run(args)
    return out


def vertical(in_path, out):
    ff = get_ffmpeg()
    run([ff, "-y", "-i", str(in_path), "-vf", f"{VERTICAL_VF},format=yuv420p",
         "-c:v", "libx264", "-crf", "20", "-preset", "veryfast",
         "-c:a", "aac", "-b:a", "160k", str(out)])
    return out


def concat(out, inputs, normalize=False):
    if normalize:
        tmp = tempfile.mkdtemp(prefix="mediakit_")
        segs = []
        for i, src in enumerate(inputs):
            seg = os.path.join(tmp, f"seg_{i}.mp4")
            vertical(src, seg)
            segs.append(seg)
        return concat_demux(segs, out, reencode=True)
    return concat_demux(list(inputs), out, reencode=True)


def captions(in_path, out, srt=None, ass=None, karaoke=False):
    """Untertitel einbrennen. ASS direkt, oder SRT → markengestylte ASS."""
    ff = get_ffmpeg()
    tmp_ass = None
    if ass:
        ass_path = ass
    elif srt:
        tmp_ass = tempfile.NamedTemporaryFile(suffix=".ass", delete=False).name
        srt_to_ass(srt, tmp_ass)
        ass_path = tmp_ass
    else:
        raise MediakitError("captions braucht --srt ODER --ass.")
    try:
        run([ff, "-y", "-i", str(in_path),
             "-vf", f"subtitles={ass_path}",
             "-c:v", "libx264", "-crf", "21", "-preset", "veryfast",
             "-c:a", "copy", str(out)])
    finally:
        if tmp_ass and os.path.exists(tmp_ass):
            os.unlink(tmp_ass)
    return out


def music(in_path, out, music_file=None, ambient=False, gain=0.14, duck=False):
    """Hintergrund-Musik/Drone unter die vorhandene Tonspur legen (oder als Tonspur)."""
    ff = get_ffmpeg()
    src_has_audio = has_audio(in_path)
    if ambient:
        drone = audio.ambient_drone(gain=gain, label="d")
        if src_has_audio:
            fc = f"{drone};[0:a][d]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[ao]"
        else:
            fc = f"{drone};[d]alimiter=limit=0.95[ao]"
        run([ff, "-y", "-i", str(in_path), "-filter_complex", fc,
             "-map", "0:v", "-map", "[ao]", "-c:v", "copy",
             "-c:a", "aac", "-b:a", "160k", "-shortest", str(out)])
    elif music_file:
        if src_has_audio:
            mix = ("[1:a]volume=0.25[mu];" +
                   ("[0:a][mu]sidechaincompress=threshold=0.05:ratio=8[ao]" if duck
                    else "[0:a][mu]amix=inputs=2:duration=first:normalize=0[ao]"))
        else:
            mix = "[1:a]volume=0.5[ao]"
        run([ff, "-y", "-i", str(in_path), "-stream_loop", "-1", "-i", str(music_file),
             "-filter_complex", mix, "-map", "0:v", "-map", "[ao]",
             "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", str(out)])
    else:
        raise MediakitError("music braucht --ambient ODER --music FILE.")
    return out


def fade(in_path, out, fin=0.5, fout=0.8):
    ff = get_ffmpeg()
    dur = probe_duration(in_path)
    vf = f"fade=t=in:st=0:d={fin},fade=t=out:st={max(0, dur - fout):.2f}:d={fout}"
    args = [ff, "-y", "-i", str(in_path), "-vf", vf]
    if has_audio(in_path):
        af = f"afade=t=in:st=0:d={fin},afade=t=out:st={max(0, dur - fout):.2f}:d={fout}"
        args += ["-af", af]
    args += ["-c:v", "libx264", "-crf", "21", "-preset", "veryfast", "-c:a", "aac", "-b:a", "160k", str(out)]
    run(args)
    return out


def thumb(in_path, out_png, at="0:01"):
    ff = get_ffmpeg()
    run([ff, "-y", "-ss", _ss(at), "-i", str(in_path), "-frames:v", "1", str(out_png)])
    return out_png
