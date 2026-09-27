#!/usr/bin/env python3
"""musik_erkennen.py — welches eigene Stück läuft in einem fertigen Reel? (28.09.2026)

Anlass: Betreiber «musik jetzt nur epischer guter sound instrumental orchester». Für die wartenden Reels stand die Musik
nirgends (Verlauf endet 23.09., ältere Reels gar nicht) — erkannt wird sie am Ton selbst: Einsatz-Hüllkurve (onset strength)
des Reels gegen jedes Stück in automation/music/, normierte Kreuzkorrelation über alle Versätze. Das beste Stück gewinnt,
wenn es deutlich vor dem zweiten liegt (Abstand ≥ 1.5×) — sonst «unklar» (nie raten).

  python3 musik_erkennen.py <video|url> [...]     → je Zeile: datei  stück  wert  zweiter  urteil
"""
import glob, os, subprocess, sys, tempfile
import numpy as np
import librosa

MUSIK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, HOP = 11025, 256
_cache = {}


def huellkurve(pfad, dauer=None):
    y, _ = librosa.load(pfad, sr=SR, mono=True, duration=dauer)
    e = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)
    return (e - e.mean()) / (e.std() + 1e-9)


def stuecke():
    if not _cache:
        for f in sorted(glob.glob(os.path.join(MUSIK, "*.wav")) + glob.glob(os.path.join(MUSIK, "*.mp3"))):
            _cache[os.path.basename(f)] = huellkurve(f)
    return _cache


def bester_versatz(reel, stueck):
    if len(stueck) < len(reel):
        return 0.0
    n = len(stueck) + len(reel)
    k = np.fft.irfft(np.fft.rfft(stueck, n) * np.conj(np.fft.rfft(reel, n)), n)[: len(stueck) - len(reel) + 1]
    return float(k.max() / len(reel))


def erkennen(video):
    tmp = None
    if video.startswith("http"):
        tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
        subprocess.run(["curl", "-sL", "--max-time", "120", "-o", tmp, video], check=True)
        video = tmp
    wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", video, "-vn", "-ac", "1", "-ar", str(SR), wav], check=True)
    r = huellkurve(wav)
    os.unlink(wav)
    if tmp:
        os.unlink(tmp)
    werte = sorted(((bester_versatz(r, s), n) for n, s in stuecke().items()), reverse=True)
    (w1, n1), (w2, _) = werte[0], werte[1]
    return n1, w1, w2, ("sicher" if w1 >= 1.5 * max(w2, 1e-6) and w1 > 0.3 else "unklar")


if __name__ == "__main__":
    for v in sys.argv[1:]:
        try:
            n, w1, w2, u = erkennen(v)
            print(f"{os.path.basename(v.split('?')[0])}\t{n}\t{w1:.2f}\t{w2:.2f}\t{u}", flush=True)
        except Exception as e:
            print(f"{os.path.basename(v.split('?')[0])}\tFEHLER\t{e}", flush=True)
