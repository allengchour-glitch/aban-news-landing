#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tiktok_video — schneidet aus einem fertigen Karussell ein 9:16-Video.

WARUM: Dieselbe Arbeit soll zwei Formate tragen. Die Slides aus tiktok_karussell.py sind bereits
1080x1920, gebrandet und faktisch geprueft — daraus ein geschnittenes Video zu machen kostet
Sekunden und verdoppelt den Ertrag je Aufbau. Kein zweiter Faktencheck noetig: was auf dem Slide
steht, wurde dort schon geprueft.

ZWEI AUSGABEN, und das ist Absicht (Vorgabe des Betreibers vom 12.06.2026):
  <slug>-clean.mp4   OHNE Ton  → beim Hochladen den aktuellen TikTok-Trend-Sound waehlen.
                                 Das ist der STANDARDWEG; ein Trend-Sound traegt die Reichweite.
  <slug>-musik.mp4   MIT Musik → fuer Plattformen ohne Sound-Bibliothek oder als Rueckfall.
Kein Voiceover — ausdrueckliche Vorgabe: Text auf dem Bild statt Stimme.

SCHNITT: harter Schnitt zwischen den Slides, dazu eine langsame Fahrt (Ken Burns) je Slide.
Harte Schnitte, weil das dem Wisch-Rhythmus eines Karussells entspricht; Blenden wirken traeg.

⚠️ Musik NUR aus automation/music/ — eigene, lizenzfreie Stuecke. Nie ein Ausschnitt aus einem
   echten Song: Content-ID sperrt den Upload, und das faellt erst nach dem Posten auf.

ENV: SLUG (Ordner unter social/tiktok, sonst der neueste) · SEK (Sekunden je Slide, 2.4)
"""

import os
import re
import subprocess
import zlib

HIER = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HIER)
BASIS = os.path.join(ROOT, "social", "tiktok")
MUSIKORDNER = os.path.join(HIER, "music")
FF = "/usr/local/bin/ffmpeg"

SEK = float(os.environ.get("SEK", "2.4"))
FPS = 30


def lauf(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        print("   ffmpeg-Fehler:", (r.stderr or "")[-400:])
    return r.returncode == 0


def gemessene_dauer(pfad):
    r = subprocess.run([FF, "-hide_banner", "-i", pfad], capture_output=True, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)", r.stderr)
    if not m:
        return None
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def fahrt(bild, ziel, hinein):
    """Ein Slide als Clip mit langsamer Fahrt.

    Erst auf das Doppelte hochskalieren, dann zoompan — sonst ruckelt die Fahrt sichtbar,
    weil zoompan auf ganze Pixel rundet.

    ⚠️ Zoom bewusst KLEIN. Der erste Lauf fuhr bis 1.12; dabei werden oben und unten je rund
    6 % abgeschnitten, und genau dort stehen Wortmarke und Slide-Zaehler — im Standbild war
    «LUXESTYLE» angeschnitten. Bei 1.045 sind es 37 px, die Wortmarke beginnt bei y=74 und
    bleibt vollstaendig sichtbar.

    ⚠️ `-r FPS` MUSS gesetzt sein. Ohne das liefert zoompan 25 fps, die Clips werden kuerzer
    als `-t` verspricht (gemessen 13.8s statt 16.8s) und jede daraus abgeleitete Zeit stimmt nicht.
    """
    if hinein:
        z = "min(1+0.00062*on,1.045)"
    else:
        z = "max(1.045-0.00062*on,1.0)"
    rahmen = int(SEK * FPS)
    vf = (f"scale=2160:3840,zoompan=z='{z}':d=1"
          f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps={FPS},"
          f"trim=end_frame={rahmen},setpts=PTS-STARTPTS,format=yuv420p")
    return lauf([FF, "-y", "-loglevel", "error", "-loop", "1", "-framerate", str(FPS),
                 "-t", f"{SEK}", "-i", bild, "-vf", vf, "-r", str(FPS),
                 "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", ziel])


def main():
    slug = os.environ.get("SLUG")
    if not slug:
        ordner = [d for d in os.listdir(BASIS) if os.path.isdir(os.path.join(BASIS, d))]
        if not ordner:
            print("PAUSE: kein Karussell unter social/tiktok")
            return
        slug = sorted(ordner, key=lambda d: os.path.getmtime(os.path.join(BASIS, d)))[-1]
    quelle = os.path.join(BASIS, slug)
    slides = sorted(f for f in os.listdir(quelle) if f.endswith(".jpg"))
    if len(slides) < 3:
        print(f"PAUSE: «{slug}» hat nur {len(slides)} Slides")
        return

    teile = []
    for i, s in enumerate(slides):
        z = f"/tmp/_ttv_{i:02d}.mp4"
        if fahrt(os.path.join(quelle, s), z, hinein=(i % 2 == 0)):
            teile.append(z)
    if len(teile) < 3:
        print("PAUSE: zu wenige Clips gerendert")
        return

    liste = "/tmp/_ttv_liste.txt"
    with open(liste, "w") as f:
        for t in teile:
            f.write(f"file '{t}'\n")

    clean = os.path.join(quelle, f"{slug}-clean.mp4")
    if not lauf([FF, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                 "-i", liste, "-c", "copy", clean]):
        print("PAUSE: Zusammenfuegen fehlgeschlagen")
        return

    # ⚠️ Die Dauer wird GEMESSEN, nicht gerechnet. Der erste Lauf meldete 16.8s (len*SEK) fuer
    # ein 13.8s langes Video — die Musik-Ausblendung lag dadurch HINTER dem Ende und griff nie.
    # Eine Zahl aus der eigenen Annahme belegt nichts.
    dauer = gemessene_dauer(clean)
    if dauer is None:
        print("PAUSE: Dauer nicht messbar")
        return
    print(f"   ✔ {os.path.relpath(clean, ROOT)}  ({dauer:.1f}s, {len(teile)} Schnitte, ohne Ton)")

    stuecke = ([f for f in os.listdir(MUSIKORDNER)
                if f.lower().endswith((".wav", ".m4a", ".mp3"))]
               if os.path.isdir(MUSIKORDNER) else [])
    if not stuecke:
        print("   (keine eigene Musik gefunden — nur die Clean-Fassung)")
        return
    # Abwechslung ist Vorgabe, Nachvollziehbarkeit auch: derselbe Slug soll dasselbe Stueck
    # ergeben. ⚠️ NICHT hash() — Pythons hash() ist je Prozess zufaellig (PYTHONHASHSEED),
    # zwei Laeufe gaben verschiedene Musik. crc32 ist stabil.
    stueck = os.path.join(MUSIKORDNER,
                          sorted(stuecke)[zlib.crc32(slug.encode()) % len(stuecke)])
    musik = os.path.join(quelle, f"{slug}-musik.mp4")
    ok = lauf([FF, "-y", "-loglevel", "error", "-i", clean, "-i", stueck,
               "-filter_complex", f"[1:a]afade=t=out:st={max(0.1, dauer - 1.2):.2f}:d=1.2[a]",
               "-map", "0:v", "-map", "[a]", "-shortest",
               "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", musik])
    if ok:
        print(f"   ✔ {os.path.relpath(musik, ROOT)}  (mit {os.path.basename(stueck)})")
    print("FERTIG")


if __name__ == "__main__":
    main()
