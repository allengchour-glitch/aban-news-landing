#!/usr/bin/env python3
"""
shrink.py — fertige Videos klein rendern (ffmpeg-Wrapper, ohne Qualitätsdrama).

Komprimiert ein einzelnes MP4 oder einen ganzen Ordner auf eine deutlich kleinere
Dateigröße — passend für Shorts/Reels (9:16) und um Repo-/Upload-Bloat zu vermeiden.
Reine Python-stdlib; ffmpeg kommt von System (PATH) oder dem gebündelten
`imageio-ffmpeg` (wie der Rest der Pipeline). Kein Tracking, keine Cloud.

Zwei Modi:
  • Qualitäts-Modus (Standard): konstante Qualität per CRF. Kleinere Datei bei
    gleicher Optik durch effizientere Kodierung. `--crf` (höher = kleiner).
  • Zielgrößen-Modus: `--target-mb N` rechnet die Bitrate aus der Dauer aus und
    trifft die Größe per Zwei-Pass-Kodierung recht genau.

Beispiele:
    python3 shrink.py clip.mp4                      # -> clip-small.mp4 (CRF 28, H.264)
    python3 shrink.py clip.mp4 --crf 30 --h265      # noch kleiner (H.265)
    python3 shrink.py clip.mp4 --target-mb 8        # ziel: ~8 MB
    python3 shrink.py output/ --suffix -small       # ganzen Ordner
    python3 shrink.py clip.mp4 --max-height 1920 --fps 30
    python3 shrink.py clip.mp4 --replace            # Original ersetzen (Backup .bak)
    python3 shrink.py output/ --dry-run             # nur zeigen

Standard-Settings sind auf "klein + überall abspielbar" getrimmt:
H.264 yuv420p, CRF 28, preset slow, +faststart, AAC 128k, auf 1080×1920 begrenzt.
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path


def find_ffmpeg() -> str:
    """System-ffmpeg bevorzugen, sonst das gebündelte aus imageio-ffmpeg."""
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit("FEHLER: ffmpeg nicht gefunden. Installiere es (apt install ffmpeg) "
                 "oder `pip install imageio-ffmpeg`.")


_DUR_RE = re.compile(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)")


def probe_duration(ffmpeg: str, path: Path) -> float | None:
    """Dauer in Sekunden aus dem ffmpeg-Stderr lesen (kein ffprobe nötig)."""
    out = subprocess.run([ffmpeg, "-i", str(path)], capture_output=True, text=True).stderr
    m = _DUR_RE.search(out)
    if not m:
        return None
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


def human(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def vf_chain(max_h: int, max_w: int) -> str:
    # In die Box max_w×max_h einpassen (Seitenverhältnis bleibt), nie hochskalieren,
    # danach auf gerade Pixelmaße runden (H.264/yuv420p verlangt das).
    return (f"scale='min({max_w},iw)':'min({max_h},ih)':"
            f"force_original_aspect_ratio=decrease,"
            f"scale=trunc(iw/2)*2:trunc(ih/2)*2")


def base_video_args(args) -> list[str]:
    vcodec = "libx265" if args.h265 else "libx264"
    out = ["-c:v", vcodec, "-preset", args.preset, "-pix_fmt", "yuv420p",
           "-vf", vf_chain(args.max_height, args.max_width)]
    if args.fps:
        out += ["-r", str(args.fps)]
    if args.h265:
        out += ["-tag:v", "hvc1"]  # bessere Apple/QuickTime-Kompatibilität
    return out


def audio_args(args) -> list[str]:
    if args.mute:
        return ["-an"]
    return ["-c:a", "aac", "-b:a", args.audio_bitrate]


def run(cmd: list[str]) -> bool:
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        sys.stderr.write(p.stderr[-1500:] + "\n")
        return False
    return True


def encode_crf(ffmpeg, src: Path, dst: Path, args) -> bool:
    cmd = [ffmpeg, "-y", "-i", str(src), *base_video_args(args),
           "-crf", str(args.crf), *audio_args(args),
           "-movflags", "+faststart", str(dst)]
    return run(cmd)


def encode_target(ffmpeg, src: Path, dst: Path, args) -> bool:
    """Zwei-Pass auf eine Zielgröße. Bitrate = Zielbits/Dauer - Audio."""
    dur = probe_duration(ffmpeg, src)
    if not dur or dur < 0.1:
        sys.stderr.write(f"  Dauer nicht lesbar — fällt auf CRF-Modus zurück.\n")
        return encode_crf(ffmpeg, src, dst, args)
    target_bits = args.target_mb * 8 * 1024 * 1024
    audio_bps = 0 if args.mute else int(args.audio_bitrate.rstrip("k")) * 1000
    video_bps = int(target_bits / dur) - audio_bps
    if video_bps < 50_000:
        sys.stderr.write("  Zielgröße zu klein für die Dauer — nimm mehr MB.\n")
        return False
    vbr = f"{video_bps}"
    passlog = str(dst.with_suffix(".2pass"))
    null = "NUL" if os.name == "nt" else "/dev/null"
    common = [ffmpeg, "-y", "-i", str(src), *base_video_args(args),
              "-b:v", vbr, "-maxrate", vbr, "-bufsize", f"{video_bps*2}"]
    ok = run(common + ["-pass", "1", "-passlogfile", passlog, "-an", "-f", "mp4", null])
    if ok:
        ok = run(common + ["-pass", "2", "-passlogfile", passlog, *audio_args(args),
                            "-movflags", "+faststart", str(dst)])
    for ext in (".log", ".log.mbtree"):
        try:
            os.remove(passlog + ext)
        except OSError:
            pass
    return ok


def process(ffmpeg, src: Path, args) -> bool:
    if args.replace:
        dst = src.with_suffix(".tmp.mp4")
    elif args.out and not args.out.is_dir():
        dst = args.out
    else:
        dst = src.with_name(src.stem + args.suffix + ".mp4")
        if args.out and args.out.is_dir():
            dst = args.out / dst.name

    before = src.stat().st_size
    print(f"▶ {src.name}  ({human(before)})", flush=True)
    if args.dry_run:
        mode = f"target {args.target_mb} MB" if args.target_mb else f"CRF {args.crf}"
        codec = "H.265" if args.h265 else "H.264"
        print(f"    [dry-run] → {dst.name}  ({codec}, {mode}, ≤{args.max_width}×{args.max_height})")
        return True

    ok = (encode_target if args.target_mb else encode_crf)(ffmpeg, src, dst, args)
    if not ok:
        print(f"    ✗ Fehler bei {src.name}")
        return False

    after = dst.stat().st_size
    saved = (1 - after / before) * 100 if before else 0
    if args.replace:
        if not args.no_backup:
            shutil.move(str(src), str(src) + ".bak")
        shutil.move(str(dst), str(src))
        where = src.name + "  (Original ersetzt" + ("" if args.no_backup else ", .bak gesichert") + ")"
    else:
        where = dst.name
    print(f"    ✓ {where}  {human(before)} → {human(after)}  (−{saved:.0f}%)")
    return True


def main(argv=None) -> int:
    p = argparse.ArgumentParser(
        description="Videos klein rendern (ffmpeg). Datei oder Ordner.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("Beispiele:")[1].split("Standard")[0])
    p.add_argument("path", type=Path, help="MP4-Datei oder Ordner mit MP4s")
    p.add_argument("--crf", type=int, default=28,
                   help="Qualität (höher = kleiner). H.264 18–32, Standard 28")
    p.add_argument("--target-mb", type=float, default=None,
                   help="Zielgröße in MB (Zwei-Pass statt CRF)")
    p.add_argument("--h265", action="store_true", help="H.265/HEVC (kleiner, etwas weniger kompatibel)")
    p.add_argument("--preset", default="slow",
                   help="ffmpeg-Preset (slower = kleiner, langsamer). Standard slow")
    p.add_argument("--max-height", type=int, default=1920, help="max. Höhe (Standard 1920)")
    p.add_argument("--max-width", type=int, default=1080, help="max. Breite (Standard 1080)")
    p.add_argument("--fps", type=int, default=None, help="Bildrate begrenzen (z. B. 30)")
    p.add_argument("--audio-bitrate", default="128k", help="Audio-Bitrate (Standard 128k)")
    p.add_argument("--mute", action="store_true", help="Tonspur entfernen")
    p.add_argument("--suffix", default="-small", help="Namens-Zusatz (Standard -small)")
    p.add_argument("-o", "--out", type=Path, default=None, help="Ziel-Datei oder -Ordner")
    p.add_argument("--replace", action="store_true", help="Original ersetzen (Backup .bak)")
    p.add_argument("--no-backup", action="store_true", help="bei --replace kein .bak anlegen")
    p.add_argument("--dry-run", action="store_true", help="nur zeigen, nichts kodieren")
    args = p.parse_args(argv)

    ffmpeg = find_ffmpeg()
    if args.path.is_dir():
        files = sorted(f for f in args.path.iterdir()
                       if f.suffix.lower() == ".mp4" and args.suffix not in f.stem)
    elif args.path.is_file():
        files = [args.path]
    else:
        sys.exit(f"FEHLER: {args.path} nicht gefunden.")
    if not files:
        sys.exit("Keine MP4-Dateien gefunden.")

    if args.out and len(files) > 1 and not args.out.is_dir():
        sys.exit("Bei mehreren Dateien muss -o ein Ordner sein.")

    total_before = total_after = 0
    fails = 0
    for f in files:
        before = f.stat().st_size
        if process(ffmpeg, f, args):
            total_before += before
        else:
            fails += 1
    print(f"\nFertig. {len(files) - fails}/{len(files)} ok.")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
