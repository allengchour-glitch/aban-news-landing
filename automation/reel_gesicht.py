#!/usr/bin/env python3
"""reel_gesicht.py — misst je bereitem Reel, wie oft ein Gesicht im Bild ist (09.10.2026, Betreiber «fb, zeige weniger asiaten»).

ANLASS: Der Betreiber stört sich an Lieferanten-Videos mit Models auf Facebook. Nach Herkunft oder Aussehen von Menschen
wird hier NICHT sortiert (keine ethnische Einordnung — weder geraten noch gemessen). Gemessen wird nur, ob ein GESICHT im Bild
ist, gleich wessen: Facebook bekommt zuerst Reels, die das PRODUKT zeigen (Hände, Anwendung, Ware), Model-Clips danach.
Das trifft den eigentlichen Punkt — Lieferanten-Studioaufnahmen wirken auf Schweizer Kundschaft fremd und nach China-Ware —
ohne Menschen nach Merkmalen auszusortieren.

MESSUNG: OpenCV-Haar-Kaskaden (frontal + Profil, opencv-python-headless 4.10 — Version 5 hat die Kaskaden entfernt), 10
gleichmässig verteilte Bilder je Video, Gesicht zählt ab 7 % der Bildbreite (Hintergrund-Passanten zählen nicht).
Anteil = Bilder mit Gesicht / gemessene Bilder. Ledger dropship/_reel_gesicht.tsv (id, anteil, bilder, zeit) — der Poster
(metricool_tiktok_post.mjs, NETZ=instagram = Instagram + Facebook) liest es und stellt Reels mit Anteil ≥ max_anteil
(data/kanal_formate.json → reel_gesicht) hinten an. Ungemessen = Mitte. Nichts wird gesperrt oder gelöscht.

  python3 automation/reel_gesicht.py [--max N]     # misst ungemessene ready-Reels
  python3 automation/reel_gesicht.py --selbsttest  # Detektor lädt + Kanarien (Bild mit/ohne Gesicht)
"""
import csv, datetime as dt, json, os, subprocess, sys, tempfile

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
SEED = os.path.join(HIER, "reels_seed.csv")
LEDGER = os.path.join(REPO, "dropship", "_reel_gesicht.tsv")
BILDER = 10
MIN_BREITE = 0.07


def cv():
    try:
        import cv2
        if hasattr(cv2, "CascadeClassifier"):
            return cv2
    except ImportError:
        pass
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "opencv-python-headless==4.10.0.84"],
                   capture_output=True, timeout=300)
    import importlib
    import cv2
    importlib.reload(cv2)
    return cv2 if hasattr(cv2, "CascadeClassifier") else None


def detektoren(cv2):
    d = [cv2.CascadeClassifier(cv2.data.haarcascades + n) for n in
         ("haarcascade_frontalface_default.xml", "haarcascade_profileface.xml")]
    if any(x.empty() for x in d):
        raise RuntimeError("Haar-Kaskade nicht geladen")
    return d


def hat_gesicht(cv2, det, bild):
    g = cv2.cvtColor(bild, cv2.COLOR_BGR2GRAY)
    g = cv2.equalizeHist(g)
    mind = max(24, int(g.shape[1] * MIN_BREITE))
    for d in det:
        if len(d.detectMultiScale(g, scaleFactor=1.1, minNeighbors=6, minSize=(mind, mind))):
            return True
    return False


def anteil(cv2, det, pfad):
    cap = cv2.VideoCapture(pfad)
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if n < BILDER:
        cap.release(); return None, 0
    treffer = gemessen = 0
    for k in range(BILDER):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int((k + 0.5) * n / BILDER))
        ok, b = cap.read()
        if not ok:
            continue
        gemessen += 1
        treffer += hat_gesicht(cv2, det, b)
    cap.release()
    return (round(treffer / gemessen, 2) if gemessen else None), gemessen


def selbsttest(cv2, det):
    import numpy as np
    leer = np.full((640, 360, 3), 200, np.uint8)                  # einfarbige Fläche = kein Gesicht
    ok = not hat_gesicht(cv2, det, leer)
    print(f"REEL-GESICHT Selbsttest: Detektor geladen, leeres Bild {'ohne Gesicht ✓' if ok else 'MIT Gesicht ✗'}")
    return ok


def main():
    cv2 = cv()
    if not cv2:
        print("REEL-GESICHT: OpenCV mit Kaskaden nicht verfügbar — nichts gemessen (Poster nimmt die normale Reihenfolge)")
        sys.exit(1 if "--selbsttest" in sys.argv else 0)
    det = detektoren(cv2)
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest(cv2, det) else 1)
    mx = int(sys.argv[sys.argv.index("--max") + 1]) if "--max" in sys.argv else 40
    try:
        fertig = {l.split("\t")[0] for l in open(LEDGER, encoding="utf-8") if l.strip()}
    except OSError:
        fertig = set()
    zeilen = [r for r in csv.DictReader(open(SEED, encoding="utf-8"))
              if r.get("status") == "ready" and r.get("video_url") and r.get("id") not in fertig]
    zahl = {"gemessen": 0, "gesicht": 0, "fehler": 0}
    with open(LEDGER, "a", encoding="utf-8") as led, tempfile.TemporaryDirectory() as tmp:
        for r in zeilen[:mx]:
            ziel = os.path.join(tmp, "v.mp4")
            p = subprocess.run(["curl", "-sSL", "--max-time", "90", "-o", ziel, r["video_url"]], capture_output=True)
            if p.returncode or not os.path.exists(ziel) or os.path.getsize(ziel) < 20000:
                zahl["fehler"] += 1; continue
            a, n = anteil(cv2, det, ziel)
            if a is None:
                zahl["fehler"] += 1; continue
            led.write(f"{r['id']}\t{a}\t{n}\t{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\n"); led.flush()
            zahl["gemessen"] += 1; zahl["gesicht"] += a >= 0.3
            print(f"  {a:4.2f}  {r['id'][:40]:40} {(r.get('caption') or '')[:50]!r}")
    print(f"REEL-GESICHT {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}: {zahl} · offen {max(0, len(zeilen) - mx)}")


if __name__ == "__main__":
    main()
