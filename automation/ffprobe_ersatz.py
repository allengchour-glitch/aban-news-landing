#!/usr/bin/env python3
"""ffprobe-Ersatz — liefert die Dauer einer Mediendatei.

WARUM: Der Container hat kein ffprobe. Das mitgelieferte ffmpeg von imageio_ffmpeg bringt nur
das Encoder-Binary mit. Zehn Render-Skripte des Projekts rufen ffprobe auf, und zwar in genau
ZWEI Formen — beide fragen ausschliesslich nach der Dauer in Sekunden:

    ffprobe -v error -show_entries format=duration -of csv=p=0        <datei>
    ffprobe -v error -select_streams a:0 -show_entries stream=duration -of csv=p=0 <datei>

Beides wird hier aus der Kopfzeile von `ffmpeg -i` gelesen. Ausgabe ist eine nackte Sekundenzahl,
wie es die Skripte erwarten.

⚠️ EHRLICHE GRENZE: Die zweite Form will die Dauer der AUDIOSPUR, dieser Ersatz gibt die Dauer
des CONTAINERS zurueck. Bei den hier verwendeten Dateien (reine Musikstuecke, fertig gerenderte
Clips) ist das dasselbe; bei einem Video mit kuerzerer Tonspur waere es zu lang. Wer sich darauf
verlaesst, muss das wissen — deshalb steht es hier und nicht in einer Fussnote.
"""
import os
import re
import subprocess
import sys

FFMPEG = "/usr/local/bin/ffmpeg"


def dauer(pfad):
    r = subprocess.run([FFMPEG, "-hide_banner", "-i", pfad], capture_output=True, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)", r.stderr)
    if not m:
        return None
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def main():
    # Optionswerte ("error", "csv=p=0") stehen ebenfalls ohne Strich da — die Datei ist die
    # letzte Angabe, die auch wirklich existiert.
    datei = None
    for a in reversed([a for a in sys.argv[1:] if not a.startswith("-")]):
        if os.path.exists(a):
            datei = a
            break
    if not datei:
        sys.exit(1)
    d = dauer(datei)
    if d is None:
        sys.exit(1)
    print(f"{d:.6f}")


if __name__ == "__main__":
    main()
