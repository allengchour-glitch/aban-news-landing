#!/usr/bin/env python3
"""hook_start.py — die bewegteste Sekunde eines Lieferantenvideos als Reel-Einstieg (30.09.2026).

ANLASS (gemessen 30.09.): der Reel-Motor rendert mit START=min(2, Dauer/4) — ein fester Einstieg, meist Karton, Titel-
Einblendung oder ruhige Totale. Das Meisterwerk-Tor (automation/meisterwerk_tor.py, HOOK = mittlere Bilddifferenz der
ersten Sekunde ≥ 3,0) wies danach 14 von 14 Post-Versuchen am 30.09. ab; der Motor selbst prüfte nie, er füllte die
Warteschlange mit Reels, die der Poster verwirft (je Versuch ein 15-min-Durchlauf ohne Post).

Misst die Quelle wie das Tor (96x170 Graustufen, 15 fps) und gibt die Startsekunde mit der höchsten Bewegung im
1-s-Fenster zurück, unter den Starts, die noch ≥ MIN_REST Sekunden Material danach haben. Intro (erste 0,5 s) zählt
nicht, wenn es Alternativen gibt (Blende/Schwarzbild misst als «Bewegung»).

  python3 automation/reel/hook_start.py <quelle.mp4>   → JSON {"start": s, "hook_quelle": x, "hook_standard": y}
  Exit 0 = gemessen, 2 = nicht messbar.
"""
import json, os, subprocess, sys
import numpy as np

W, H, FPS = 96, 170, 15
MIN_REST = float(os.environ.get("MIN_REST", "6"))


def bewegung(pfad):
    roh = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", pfad, "-vf",
                          f"fps={FPS},scale={W}:{H},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
    n = len(roh) // (W * H)
    if n < FPS * 2:
        raise RuntimeError("zu wenige Bilder dekodiert")
    fr = np.frombuffer(roh[: n * W * H], np.uint8).reshape(n, H, W).astype(np.float32)
    return np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))


def bester_start(diff):
    dauer = (len(diff) + 1) / FPS
    fenster = np.convolve(diff, np.ones(FPS) / FPS, mode="valid")        # fenster[i] = Hook bei Start i/FPS
    grenze = max(1, int((dauer - MIN_REST) * FPS))
    kand = fenster[:grenze]
    ab = int(0.5 * FPS) if len(kand) > FPS else 0
    i = ab + int(np.argmax(kand[ab:]))
    standard = min(2.0, dauer / 4)
    j = min(int(standard * FPS), len(fenster) - 1)
    return round(i / FPS, 2), float(kand[i]), float(fenster[j]), round(standard, 2)


def main():
    if len(sys.argv) < 2:
        print(__doc__); return 2
    try:
        s, h, hs, std = bester_start(bewegung(sys.argv[1]))
    except Exception as e:
        print(json.dumps({"fehler": str(e)[:200]})); return 2
    print(json.dumps({"start": s, "hook_quelle": round(h, 2), "start_standard": std, "hook_standard": round(hs, 2)}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
