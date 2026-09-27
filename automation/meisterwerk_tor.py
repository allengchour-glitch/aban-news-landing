#!/usr/bin/env python3
"""meisterwerk_tor.py — Qualitaetstor VOR jedem Reel-Post (27.09.2026, Betreiber: «mache keine billige einfache post,
jeder soll ein meisterwerk sein»).

Gemessen am 27.09. (Metricool, 30 Tage): TikTok Ø Wiedergabe 1,8 s von 11 s, Instagram-Reels 67 % Skip-Rate — die
erste Sekunde entscheidet. Neue Schnitte aus reel/schnitt.py pruefen das schon («Tor am Ergebnis»); die Warteschlange
enthaelt aber auch aeltere Reels, die nie durch ein Tor gingen. Dieses Tor misst die fertige Datei:

  FORMAT   9:16, mindestens 1080x1920
  DAUER    6–35 s (kuerzer wirkt billig, laenger verliert)
  TON      integrierte Lautheit −30 … −8 LUFS (stumm/zu leise/uebersteuert)
  HOOK     Bewegung in der ersten Sekunde (mittlere Bilddifferenz, 96x170 Graustufen, 15 fps) ≥ MIN_HOOK
           — ein Standbild oder ein langsamer Titel-Einstieg ist kein Hook
  STILL    Anteil fast stehender Sekunden ≤ 50 % (Diashow aus Standbildern = billig)

  python3 automation/meisterwerk_tor.py <datei|url> [...]   → je Datei eine JSON-Zeile {ok, gruende, werte}
  Exit 0 = alle bestanden, 4 = mindestens eine durchgefallen, 2 = nicht messbar (dann KEIN Post — kein Urteil ist kein Ja).
"""
import json, os, re, subprocess, sys, tempfile
import numpy as np

MIN_HOOK = float(os.environ.get("MIN_HOOK", "3.0"))
FF = os.environ.get("FFMPEG", "ffmpeg")
W, H, FPS = 96, 170, 15


def lokal(q):
    if re.match(r"^https?://", q):
        f = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
        r = subprocess.run(["curl", "-sL", "--max-time", "90", "-o", f, q])
        if r.returncode or os.path.getsize(f) < 10000:
            raise RuntimeError("Download fehlgeschlagen")
        return f, True
    return q, False


def messen(pfad):
    info = subprocess.run([FF, "-hide_banner", "-i", pfad], capture_output=True, text=True).stderr
    m = re.search(r"Video:.*?(\d{3,5})x(\d{3,5})", info)
    d = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info)
    if not m or not d:
        raise RuntimeError("kein Videostrom lesbar")
    w, h = int(m.group(1)), int(m.group(2))
    dauer = int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3))
    ton = None
    if re.search(r"Audio:", info):
        e = subprocess.run([FF, "-hide_banner", "-nostats", "-i", pfad, "-filter_complex", "ebur128", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
        mi = re.findall(r"I:\s+(-?[\d.]+) LUFS", e)
        ton = float(mi[-1]) if mi else None
    roh = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-i", pfad, "-vf", f"fps={FPS},scale={W}:{H},format=gray",
                          "-f", "rawvideo", "-"], capture_output=True).stdout
    n = len(roh) // (W * H)
    if n < FPS:
        raise RuntimeError("zu wenige Bilder dekodiert")
    fr = np.frombuffer(roh[: n * W * H], np.uint8).reshape(n, H, W).astype(np.float32)
    diff = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
    hook = float(diff[:FPS].mean())
    sek = [diff[i:i + FPS].mean() for i in range(0, len(diff), FPS)]
    still = float(np.mean([s < 1.0 for s in sek])) if sek else 1.0
    return dict(breite=w, hoehe=h, dauer=round(dauer, 1), lufs=ton, hook=round(hook, 2), still=round(still, 2))


def urteil(v):
    g = []
    if v["breite"] < 1080 or v["hoehe"] < 1920 or abs(v["breite"] / v["hoehe"] - 9 / 16) > 0.02:
        g.append(f"FORMAT {v['breite']}x{v['hoehe']}")
    if not 6 <= v["dauer"] <= 35:
        g.append(f"DAUER {v['dauer']} s")
    if v["lufs"] is None:
        g.append("TON fehlt")
    elif not -30 <= v["lufs"] <= -8:
        g.append(f"TON {v['lufs']} LUFS")
    if v["hook"] < MIN_HOOK:
        g.append(f"HOOK {v['hook']} < {MIN_HOOK}")
    if v["still"] > 0.5:
        g.append(f"STILL {int(v['still'] * 100)} %")
    return g


def main(args):
    rc = 0
    for q in args:
        try:
            p, tmp = lokal(q)
            try:
                v = messen(p)
            finally:
                if tmp:
                    os.unlink(p)
            g = urteil(v)
            print(json.dumps(dict(quelle=q, ok=not g, gruende=g, werte=v), ensure_ascii=False))
            if g:
                rc = max(rc, 4)
        except Exception as e:
            print(json.dumps(dict(quelle=q, ok=False, gruende=[f"nicht messbar: {e}"], werte=None), ensure_ascii=False))
            rc = 2 if rc == 0 else rc
    return rc


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
