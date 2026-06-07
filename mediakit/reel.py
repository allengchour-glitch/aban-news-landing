"""mediakit/reel.py — aban-news-Reel fertig rendern (die Lücke).

Macht aus `video-pipeline/ausgabe/<case>/` (4 Slides + skript.txt + untertitel.srt
+ optional voiceover) ein fertiges 9:16-mp4 mit pro-Slide-Dauern, eingebrannten
Untertiteln und ruhigem Ambient-Pad — kein CapCut mehr.

Timing in 3 Stufen:
  A  voiceover + Key (XI) → ElevenLabs-Wort-Timings → audiosynchron + Karaoke
  B  untertitel.srt → Cue-Spannen (4-Slide-Mapping)
  C  Fallback: feste Dauern aus Wortzahl (~2.6 W/s, min 2.5 s)
"""
import glob
import os
import tempfile
from pathlib import Path

from . import audio, tts
from .ass_subs import build_ass, parse_srt, srt_to_ass
from .ffmpeg_util import MediakitError, get_ffmpeg, run
from .video_edit import concat_demux, still_to_segment

REPO = Path(__file__).resolve().parent.parent
VP_AUSGABE = REPO / "video-pipeline" / "ausgabe"


def _slide_sections(n_lines, n_slides):
    """Liste von (start_line, end_line) je Slide. 4←5-Mapping: slide_03 = Zeilen 3+4."""
    if n_slides == 4 and n_lines == 5:
        return [(0, 1), (1, 2), (2, 4), (4, 5)]
    # generisch: Zeilen möglichst gleichmäßig auf die Slides verteilen
    per = max(1, n_lines // n_slides)
    secs, i = [], 0
    for k in range(n_slides):
        end = n_lines if k == n_slides - 1 else min(n_lines, i + per)
        secs.append((i, end)); i = end
    return secs


def _durations_from_words(lines, words, total, n_slides):
    """Stufe A: Slide-Dauern aus Wort-Timings (audiosynchron)."""
    secs = _slide_sections(len(lines), n_slides)
    # erster Wort-Index je Zeile
    counts = [len(l.split()) for l in lines]
    line_start_idx = [sum(counts[:i]) for i in range(len(lines) + 1)]
    starts = []
    for (a, _b) in secs:
        wi = min(line_start_idx[a], len(words) - 1)
        starts.append(words[wi][1])
    starts.append(total)
    return [max(0.8, starts[k + 1] - starts[k]) for k in range(n_slides)]


def _durations_from_srt(srt_path, lines, n_slides):
    """Stufe B: Slide-Dauern aus SRT-Cue-Starts."""
    cues = parse_srt(srt_path)
    if len(cues) < 2:
        return None, None
    secs = _slide_sections(len(lines), n_slides)
    total = cues[-1][1]
    starts = []
    for (a, _b) in secs:
        idx = min(a, len(cues) - 1)
        starts.append(cues[idx][0])
    starts.append(total)
    return [max(0.8, starts[k + 1] - starts[k]) for k in range(n_slides)], total


def _durations_fixed(lines, n_slides):
    """Stufe C: feste Dauern aus Wortzahl je Slide-Sektion."""
    secs = _slide_sections(len(lines), n_slides)
    durs = []
    for (a, b) in secs:
        words = sum(len(lines[i].split()) for i in range(a, b))
        durs.append(max(2.5, words / 2.6))
    return durs


def render(case_id, out=None, voice=False, ambient=True, gain=0.12, from_dir=None,
           ambient_style="warm", music=None):
    ff = get_ffmpeg()
    src = Path(from_dir) if from_dir else (VP_AUSGABE / case_id)
    if not src.is_dir():
        raise MediakitError(
            f"Ordner fehlt: {src}\n"
            f"Erst die Slides bauen:\n"
            f"    cd video-pipeline && python3 generate_clips.py {case_id}")
    slides = sorted(glob.glob(str(src / "slide_*.png")))
    if not slides:
        raise MediakitError(f"Keine slide_*.png in {src}")
    skript = (src / "skript.txt")
    lines = [l for l in skript.read_text(encoding="utf-8").split("\n") if l.strip()] if skript.exists() else []
    srt_path = src / "untertitel.srt"
    n = len(slides)

    work = tempfile.mkdtemp(prefix="mediakit_reel_")
    voice_wav = None
    ass_path = os.path.join(work, "subs.ass")
    tier = "C"

    # ---- Stufe A: Voiceover + Wort-Timings (Karaoke) ----
    words = total = None
    if voice and tts.have_key() and lines:
        res = tts.synth_with_timestamps(" ".join(lines), os.path.join(work, "vo.mp3"))
        if res:
            words, total = res
            durs = _durations_from_words(lines, words, total, n)
            build_ass(words, total, ass_path)          # markengetreue Karaoke-ASS
            # Stimme entrumpeln/normalisieren
            voice_wav = os.path.join(work, "vo.wav")
            run([ff, "-y", "-i", os.path.join(work, "vo.mp3"),
                 "-ar", "44100", "-af", audio.VOICE_EQ, voice_wav])
            tier = "A"

    # ---- Stufe B: SRT ----
    if tier == "C" and srt_path.exists() and lines:
        durs_b, _total = _durations_from_srt(srt_path, lines, n)
        if durs_b:
            durs = durs_b
            srt_to_ass(str(srt_path), ass_path)
            tier = "B"

    # ---- Stufe C: feste Dauern ----
    if tier == "C":
        durs = _durations_fixed(lines or [""] * n, n)
        if srt_path.exists():
            srt_to_ass(str(srt_path), ass_path)
        else:
            # Minimal-ASS ohne Cues (nur TAG), Untertitel optional
            build_ass([], sum(durs), ass_path)

    # ---- Segmente bauen + zusammenfügen ----
    segs = []
    for i, (img, d) in enumerate(zip(slides, durs)):
        seg = os.path.join(work, f"seg_{i}.mp4")
        still_to_segment(img, d, seg)
        segs.append(seg)
    base = os.path.join(work, "base.mp4")
    concat_demux(segs, base)

    # ---- Finaler Render: Untertitel einbrennen + Audio ----
    out = Path(out) if out else (src / "reel.mp4")
    ass_esc = ass_path.replace(":", r"\:")
    args = [ff, "-y", "-i", base]
    idx = 1
    voice_idx = music_idx = None
    if voice_wav:
        args += ["-i", voice_wav]; voice_idx = idx; idx += 1
    use_music = bool(music) and os.path.exists(str(music))
    if use_music:
        args += ["-stream_loop", "-1", "-i", str(music)]; music_idx = idx; idx += 1

    # Hintergrund-Bett bestimmen: eigene Musik > generierter Stil ('none'/ambient=False = keins)
    bed_pre = None
    if use_music:
        bed_pre = f"[{music_idx}:a]volume=0.30[bed]"
    elif ambient:
        bed_pre = audio.ambient(ambient_style, gain=gain, label="bed")

    chains = [f"[0:v]subtitles={ass_esc}[v]"]
    if voice_idx is not None and bed_pre:
        chains += [bed_pre,
                   f"[{voice_idx}:a]volume=1.0[vo];[vo][bed]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[ao]"]
    elif voice_idx is not None:
        chains.append(f"[{voice_idx}:a]volume=1.0,alimiter=limit=0.95[ao]")
    elif bed_pre:
        chains += [bed_pre, "[bed]alimiter=limit=0.95[ao]"]
    fc = ";".join(chains)
    amap = ["-map", "[v]"] + (["-map", "[ao]"] if "[ao]" in fc else [])

    args += ["-filter_complex", fc] + amap + [
        "-c:v", "libx264", "-crf", "21", "-preset", "veryfast"]
    if "[ao]" in fc:
        args += ["-c:a", "aac", "-b:a", "160k"]
    args += ["-shortest", str(out)]
    run(args)

    bett = "Musik" if use_music else (ambient_style if ambient else "stumm")
    print(f"  ✓ Reel [{case_id}] Stufe {tier} · Bett={bett} → {out}  ({n} Slides, {sum(durs):.1f}s, 1080x1920)")
    return out
