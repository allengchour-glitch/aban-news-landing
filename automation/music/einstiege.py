"""Misst je Musikstück die energiereichsten Einstiegspunkte für 11-s-Reels (Musik v2, 23.09.2026).

Befund: jedes Reel begann beim Intro (Sekunde 0) — bei 11 s Länge kam der Drop oft gar nicht vor, und
die ersten 1–2 s entscheiden übers Weiterscrollen. Hier: RMS-Energie in 0,25-s-Schritten, gleitendes
Fenster über REEL s, die besten Fenster (≥ 3 s auseinander) als Einstiege; zusätzlich Lautheit (LUFS)
und Dauer. Ergebnis: automation/music/_einstiege.json (vom Reel-Motor gelesen).
"""
import json, os, subprocess, sys
import numpy as np

HIER = os.path.dirname(os.path.abspath(__file__))
REEL = float(os.environ.get("REEL", "11"))
SR = 22050

def lade(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)

def lufs(p):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", p, "-af", "ebur128", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    for z in out.splitlines()[::-1]:
        if z.strip().startswith("I:"):
            return float(z.split()[1])
    return None

erg = {}
for f in sorted(os.listdir(HIER)):
    if not f.endswith((".wav", ".mp3")):
        continue
    x = lade(os.path.join(HIER, f))
    dauer = len(x) / SR
    hop = int(SR * 0.25)
    rms = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2) + 1e-12) for i in range(0, len(x) - hop, hop)])
    fenster = int(REEL / 0.25)
    if len(rms) <= fenster:
        starts = [0.0]
    else:
        # Fensterenergie + Bonus für einen starken ERSTEN Takt (erste 1,5 s zählen doppelt)
        kum = np.convolve(rms, np.ones(fenster), "valid")
        kopf = np.convolve(rms, np.ones(6), "valid")[:len(kum)]
        wert = kum / fenster + kopf / 6
        reihe = np.argsort(-wert)
        starts = []
        for i in reihe:
            s = i * 0.25
            if all(abs(s - t) >= 3 for t in starts):
                starts.append(round(float(s), 2))
            if len(starts) == 3:
                break
    erg[f] = {"dauer": round(dauer, 1), "lufs": lufs(os.path.join(HIER, f)), "einstiege": starts}
    print(f"{f:32} {dauer:6.1f}s  Einstiege {starts}")
json.dump(erg, open(os.path.join(HIER, "_einstiege.json"), "w"), indent=1, ensure_ascii=False)
