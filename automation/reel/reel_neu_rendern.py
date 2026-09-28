#!/usr/bin/env python3
"""reel_neu_rendern.py — wartende Reels mit zu kleinem Videofenster neu rendern (28.09.2026).

Anlass: Betreiber-Screenshot TikTok «das video ist sehr klein?» — der Lederrucksack (9:16-Quelle) stand in make_reel.sh als
326×580 px im Bild (9 % der Fläche). make_reel.sh hat seit 28.09. das Band 390-1170 (Hochformat 600×780, quadratisch 780×780,
Querformat volle Breite). Dieses Skript rendert die WARTENDEN Reels (status ready, social/reels/reel_<pid>.mp4) neu, deren
scharfes Fenster schmaler als 700 px ist — mit denselben Texten, demselben Preis und derselben Musik; die Adresse bleibt gleich.

Quelle: auftraege/ergebnis/*-rq-<pid>.mp4 (Server-Weg vom 28.09.). Ohne Quelle bleibt das Reel, wie es ist (gemeldet).
Nach dem Render muss `meisterwerk_tor.py` bestehen (mit PREIS_SOLL aus der Caption), sonst bleibt die alte Datei.

  python3 automation/reel/reel_neu_rendern.py          → Trockenlauf: Liste mit Fensterbreite, Quelle, Hook, Musik
  SCHARF=1 python3 automation/reel/reel_neu_rendern.py → rendern, Tor, Datei ersetzen (git add/commit macht der Aufrufer)
"""
import csv, glob, json, os, re, subprocess, sys, tempfile
import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(REPO)
SCHARF = os.environ.get("SCHARF") == "1"
MIN_BREITE = 700


def fensterbreite(video):
    """Breite des scharfen Videofensters im Band (Zeilen 650-1100) bei t=5 s — Gradientenenergie je Spalte."""
    png = tempfile.NamedTemporaryFile(suffix=".png", delete=False).name
    try:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "5", "-i", video, "-frames:v", "1", png], check=True, timeout=120)
        a = np.asarray(Image.open(png).convert("L"), dtype=float)[650:1100]
        g = np.abs(np.diff(a, axis=1)).mean(axis=0)
        cols = np.where(g > max(3, np.percentile(g, 95) * 0.25))[0]
        return int(cols.max() - cols.min()) if len(cols) else 0
    finally:
        os.unlink(png)


def zeilen(titel):
    """Titelzeilen genau wie der Reel-Motor (zeilen() aus cj_video_reel_engine.mjs)."""
    js = r"""const src=require('fs').readFileSync('automation/cj_video_reel_engine.mjs','utf8');
const k=src.match(/function kurzTitel\(title\) \{[\s\S]*?\n\}/)[0], z=src.match(/function zeilen\(title\) \{[\s\S]*?\n\}/)[0];
eval(k); eval(z); console.log(JSON.stringify(zeilen(process.argv[1])));"""
    return json.loads(subprocess.run(["/opt/node22/bin/node", "-e", js, titel], capture_output=True, text=True, check=True).stdout)


def dauer(p):
    import av
    with av.open(p) as c:
        return float(c.duration / 1e6) if c.duration else 0.0


def main():
    rows = list(csv.DictReader(open("automation/reels_seed.csv")))
    erg = []
    for r in rows:
        if r.get("status") != "ready" or not r["id"].startswith("cjreel-"):
            continue
        pid = r["id"][len("cjreel-"):]
        lokal = f"social/reels/reel_{pid}.mp4"
        if not os.path.exists(lokal):
            continue
        b = fensterbreite(lokal)
        if b >= MIN_BREITE:
            continue
        q = sorted(glob.glob(f"auftraege/ergebnis/*-rq-{pid.lower()}.mp4"))
        cap = r["caption"]
        hook = re.sub(r"\s*👀\s*$", "", cap.split("\n")[0]).strip()
        m = re.search(r"«([^»]+)»", cap); titel = m.group(1) if m else ""
        p = re.search(r"CHF (\d+\.\d\d)", cap); preis = p.group(1) if p else ""
        if not (q and titel and preis):
            erg.append((pid, b, "UEBERSPRUNGEN", "keine Quelle" if not q else "Caption ohne Titel/Preis")); continue
        mus = subprocess.run(["python3", "automation/music/produce/musik_erkennen.py", lokal], capture_output=True, text=True).stdout.split("\t")
        stueck = mus[1] if len(mus) >= 5 and mus[4].strip() == "sicher" else "luxe-adventure-uplift.wav"
        ein = json.load(open("automation/music/_einstiege.json")).get(stueck, {}).get("einstiege", [0])[0]
        z1, z2 = zeilen(titel)
        print(f"{pid}: Fenster {b} px → neu · «{titel[:40]}» CHF {preis} · Hook «{hook}» · {stueck} ab {ein}s", flush=True)
        if not SCHARF:
            erg.append((pid, b, "TROCKEN", "")); continue
        tmp = f"/tmp/reelneu_{pid}.mp4"
        d = dauer(q[0])
        env = {**os.environ, "START": str(min(2, d / 4 if d else 0)), "MUSIK_START": str(ein)}
        subprocess.run(["bash", "automation/reel/make_reel.sh", q[0], tmp, z1, z2, f"CHF {preis}", hook, "automation/music/" + stueck],
                       env=env, check=True, capture_output=True, timeout=600)
        tor = subprocess.run(["python3", "automation/meisterwerk_tor.py", tmp], env={**os.environ, "PREIS_SOLL": preis},
                             capture_output=True, text=True, timeout=600)
        nb = fensterbreite(tmp)
        if tor.returncode != 0:
            erg.append((pid, b, "TOR-DURCHGEFALLEN", tor.stdout.strip()[-200:])); os.unlink(tmp); continue
        os.replace(tmp, lokal)
        erg.append((pid, b, "ERSETZT", f"neu {nb} px"))
    print("\nERGEBNIS:")
    for e in erg:
        print("  " + " · ".join(str(x) for x in e))
    print(f"FERTIG: {sum(1 for e in erg if e[2]=='ERSETZT')} ersetzt, {sum(1 for e in erg if e[2]!='ERSETZT' and e[2]!='TROCKEN')} nicht, "
          f"{sum(1 for e in erg if e[2]=='TROCKEN')} im Trockenlauf")


if __name__ == "__main__":
    main()
