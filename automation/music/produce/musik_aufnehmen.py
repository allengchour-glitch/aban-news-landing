#!/usr/bin/env python3
"""musik_aufnehmen.py — ein fertiges Stück (z. B. vidIQ `vidiq_generate_music`, echte Instrumente) in die Reel-Bibliothek
aufnehmen (27.09.2026, Betreiber: GM-SoundFont «hört sich beschissen an … nimm instrumente wie top sounds»).

Schritte: laden (URL oder Datei) → mastern (−1.5 dB, 4× überabgetasteter Begrenzer mit level=0 — ffmpegs Standard
level=1 hebt sonst wieder auf 0 dBFS an) → messen (LUFS, True Peak) → Tempo schätzen (Onset-Autokorrelation, 80–190 BPM,
Oktave nach oben bevorzugt) → CREDITS.txt-Zeile im Abschnitt LIZENZIERT → einstiege.py.

  python3 musik_aufnehmen.py <url|datei> <luxe-name> "<beschreibung>" [--bpm N] [--probe]
  --probe: nur nach automation/music/_probe/ legen (keine CREDITS-Zeile, nicht in Rotation) — bis der Betreiber «gut» sagt.
"""
import os, re, subprocess, sys, tempfile
import numpy as np

HIER = os.path.dirname(os.path.abspath(__file__))
MUSIK = os.path.dirname(HIER)


def laden(q):
    if re.match(r"^https?://", q):
        f = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
        subprocess.run(["curl", "-sL", "--max-time", "180", "-o", f, q], check=True)
        return f
    return q


def mastern(src, out):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-af",
                    "volume=-1.5dB,aresample=176400,alimiter=limit=0.87:attack=1:release=50:level=0,aresample=44100",
                    "-ar", "44100", "-c:a", "pcm_s16le", out], check=True)


def messen(p):
    t = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", p, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    t = t[t.rfind("Summary"):]
    i = re.search(r"I:\s+(-?[\d.]+)", t)
    tp = re.findall(r"Peak:\s+(-?[\d.]+)", t)
    return (float(i.group(1)) if i else None), (float(tp[-1]) if tp else None)


def tempo(p):
    sr, hop = 22050, 256
    x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                                     capture_output=True).stdout, dtype=np.float32)
    e = np.array([np.sum(x[i * hop:(i + 1) * hop] ** 2) for i in range(len(x) // hop)])
    on = np.maximum(0, np.diff(np.log(e + 1e-9)))
    on -= on.mean()
    ac = np.correlate(on, on, "full")[len(on) - 1:]
    fps = sr / hop
    kand = []
    for bpm in np.arange(80, 190, 0.5):
        lag = 60 / bpm * fps
        kand.append((ac[int(round(lag))] + 0.5 * ac[int(round(lag * 2))], bpm))
    kand.sort(reverse=True)
    b = kand[0][1]
    return int(round(b * 2 if b < 95 else b))


def main(a):
    if len(a) < 3:
        sys.exit(__doc__)
    quelle, name, beschr = a[0], a[1], a[2]
    probe = "--probe" in a
    bpm = int(a[a.index("--bpm") + 1]) if "--bpm" in a else None
    if not re.match(r"^luxe-[a-z0-9-]+$", name):
        sys.exit("Name muss luxe-<klein-mit-bindestrich> sein")
    ziel = os.path.join(MUSIK, "_probe" if probe else "", f"{name}.wav")
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    roh = laden(quelle)
    i0, tp0 = messen(roh)
    mastern(roh, ziel)
    i1, tp1 = messen(ziel)
    bpm = bpm or tempo(ziel)
    print(f"{name}: roh {i0} LUFS / {tp0} dBTP → gemastert {i1} LUFS / {tp1} dBTP · ~{bpm} BPM · {ziel}")
    if tp1 is None or tp1 > -1.0:
        sys.exit(f"True Peak {tp1} > −1.0 dBTP — nicht aufgenommen")
    if probe:
        return
    cr = os.path.join(MUSIK, "CREDITS.txt")
    txt = open(cr, encoding="utf-8").read()
    if f"- {name}.wav" in txt:
        print("CREDITS-Zeile existiert schon")
    else:
        with open(cr, "a", encoding="utf-8") as f:
            f.write(f"- {name}.wav  ({beschr}, ~{bpm} BPM; gemastert {i1} LUFS / {tp1} dBTP; aufgenommen mit musik_aufnehmen.py)\n")
    subprocess.run(["python3", os.path.join(MUSIK, "einstiege.py")], capture_output=True)


if __name__ == "__main__":
    main(sys.argv[1:])
