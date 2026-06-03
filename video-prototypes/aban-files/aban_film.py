#!/usr/bin/env python3
"""ABAN Files - Film-Compiler.

Haengt alle Folgen-Clips (clips/ep*.mp4, in Episodenreihenfolge) zu EINEM
durchgehenden „Collection"-Film zusammen und legt einen dunklen Ambient-Score
darunter (fuellt stille Stellen).

Aufruf:
  python3 aban_film.py                      # -> aban-files-collection.mp4
  python3 aban_film.py out.mp4 ep1 ep2 ep3  # nur bestimmte Folgen, eigener Name

Nur stdlib + imageio_ffmpeg (kein Key noetig).
"""
import os, sys, re, subprocess, tempfile
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
CLIPS = os.path.join(HERE, "clips")
FF = imageio_ffmpeg.get_ffmpeg_exe()

# dunkler a-moll-Ambient-Pad (gleicher Score wie die Einzelfolgen)
MUSIC = ("sine=f=110,volume=0.5[m1];sine=f=164.81,volume=0.4[m2];sine=f=220,volume=0.3[m3];"
         "sine=f=329.63,volume=0.12[m4];[m1][m2][m3][m4]amix=inputs=4:normalize=0,"
         "tremolo=f=0.12:d=0.45,lowpass=f=1500,aecho=0.8:0.7:450|800:0.4|0.25,volume=0.9[mraw]")


def epnum(name):
    m = re.search(r"ep(\d+)", name)
    return int(m.group(1)) if m else 0


def main():
    args = [a for a in sys.argv[1:]]
    out = "aban-files-collection.mp4"
    if args and args[0].endswith(".mp4"):
        out = args.pop(0)
    if args:
        files = [os.path.join(CLIPS, f"{e}.mp4") for e in args]
    else:
        files = sorted((os.path.join(CLIPS, f) for f in os.listdir(CLIPS) if f.endswith(".mp4")),
                       key=epnum)
    files = [f for f in files if os.path.exists(f)]
    if not files:
        sys.exit("Keine Clips in clips/ gefunden.")
    print(f"Baue Film aus {len(files)} Clips:")
    for f in files:
        print("  -", os.path.basename(f))

    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as lf:
        lf.write("\n".join(f"file '{f}'" for f in files))
        listfile = lf.name
    base = out + ".base.mp4"
    # 1) sauber konkatenieren (re-encode -> einheitlich)
    subprocess.run([FF, "-y", "-f", "concat", "-safe", "0", "-i", listfile,
                    "-c:v", "libx264", "-crf", "22", "-preset", "veryfast",
                    "-c:a", "aac", "-b:a", "160k", base], check=True)
    # 2) Ambient-Score druntermischen (Stimme bleibt vorn)
    subprocess.run([FF, "-y", "-i", base,
                    "-filter_complex",
                    f"{MUSIC};[mraw]volume=0.20[mu];[0:a]volume=1.0[vo];"
                    f"[vo][mu]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[ao]",
                    "-map", "0:v", "-c:v", "copy", "-map", "[ao]", "-c:a", "aac", "-b:a", "160k",
                    "-shortest", out], check=True)
    os.remove(base); os.remove(listfile)
    print(f"\nFertig -> {out}")


if __name__ == "__main__":
    main()
