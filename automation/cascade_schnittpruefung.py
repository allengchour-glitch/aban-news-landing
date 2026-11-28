#!/usr/bin/env python3
"""Prüft drei lokale Originaltakes für die Cascade-EDL, ohne Ausgabemedien zu erzeugen.

Aufruf: python3 cascade_schnittpruefung.py SCHNITTPLAN.edl TAKE_A TAKE_B TAKE_C
Benötigt Python 3 und echtes ffprobe. Quellzeiten zählen ab dem ersten Videobild.
Rückgabe 0: zeitlich passend. Rückgabe 1: Eingabe, Zuordnung oder Timing prüfen.
Die Prüfung trifft keine Aussage über Motiv, Rechte, Bildqualität oder Freigabe.
"""
import argparse
import hashlib
import json
import re
import subprocess
from fractions import Fraction
from pathlib import Path

FPS = 30
TAKES = ("CASC_A", "CASC_B", "CASC_C")
MASTER = "luxe_cascade_creolen_20261122"


def bildnummer(tc):
    if not re.fullmatch(r"\d\d:[0-5]\d:[0-5]\d:[0-2]\d", tc):
        raise ValueError(f"Ungültiger Timecode {tc!r}")
    h, m, s, f = map(int, tc.split(":"))
    return ((h * 60 + m) * 60 + s) * FPS + f


def schnittliste(pfad):
    zeilen = [z.strip() for z in pfad.read_text(encoding="ascii").splitlines() if z.strip()]
    if zeilen[:2] != [f"TITLE: {MASTER}", "FCM: NON-DROP FRAME"]:
        raise ValueError("Master-ID oder Timecode-Format der EDL stimmt nicht")
    bedarf = {}
    start = bildnummer("01:00:00:00")
    zuletzt = start
    for nummer, zeile in enumerate(zeilen[2:], 1):
        felder = zeile.split()
        if (len(felder) != 8 or felder[0] != f"{nummer:03}" or
                felder[1] not in TAKES or felder[2:4] != ["V", "C"]):
            raise ValueError(f"Unbekannter EDL-Eintrag in Einstellung {nummer}")
        von, bis, ein, aus = map(bildnummer, felder[4:])
        if ein != zuletzt or bis <= von or bis - von != aus - ein:
            raise ValueError(f"Fehler im Quell- oder Schnittzeitraum bei Einstellung {nummer}")
        # Quellende exklusiv. Die Regiefassung verlangt eine Sekunde Nachlauf.
        take = felder[1]
        bedarf[take] = max(bedarf.get(take, 0), bis + FPS)
        zuletzt = aus
    if len(zeilen) != 6 or set(bedarf) != set(TAKES) or zuletzt - start != 18 * FPS:
        raise ValueError("Erwartet sind vier Einstellungen, drei Takes und 540 Bilder")
    return bedarf


def quelldaten(pfad, minimum):
    if not pfad.is_file():
        raise ValueError("Lokale Quelldatei fehlt")
    vorher = pfad.stat()
    with pfad.open("rb") as quelle:
        h = hashlib.sha256()
        for teil in iter(lambda: quelle.read(1024 * 1024), b""):
            h.update(teil)
    daten = {"sha256": h.hexdigest()}
    aufruf = ["ffprobe", "-v", "error", "-protocol_whitelist", "file",
              "-format_whitelist", "mov,matroska,avi,mxf,mpegts,mpeg",
              "-select_streams", "V:0", "-show_frames", "-show_entries",
              "stream=time_base,width,height:frame=best_effort_timestamp",
              "-of", "json", "-i", str(pfad.resolve())]
    p = subprocess.run(aufruf, capture_output=True, text=True, timeout=180)
    nachher = pfad.stat()
    if (vorher.st_dev, vorher.st_ino, vorher.st_size, vorher.st_mtime_ns) != (
            nachher.st_dev, nachher.st_ino, nachher.st_size, nachher.st_mtime_ns):
        raise ValueError("Datei hat sich während der Prüfung geändert")
    if p.returncode or p.stderr.strip():
        raise ValueError("Videospur konnte nicht vollständig dekodiert werden")
    info = json.loads(p.stdout)
    spuren = info.get("streams", [])
    bilder = info.get("frames", [])
    if len(spuren) != 1 or not bilder:
        raise ValueError("Keine auswertbare Videospur")
    spur = spuren[0]
    daten.update(bilder=len(bilder), raster=[spur["width"], spur["height"]])
    # Ein Container kann Zeitstempel auf Millisekunden runden. Die Abweichung
    # darf nie mehr als einen Tick oder eine Zehntel Bilddauer betragen.
    takt = Fraction(spur["time_base"])
    if takt <= 0 or any("best_effort_timestamp" not in f for f in bilder):
        daten["status"] = "Zeitstempel manuell prüfen"
        return daten
    pts = [int(f["best_effort_timestamp"]) for f in bilder]
    toleranz = min(takt, Fraction(1, 10 * FPS))
    if (any(b <= a for a, b in zip(pts, pts[1:])) or
            any(abs((t - pts[0]) * takt - Fraction(i, FPS)) > toleranz
                for i, t in enumerate(pts))):
        daten["status"] = "Zeitbasis für 30 fps anpassen oder prüfen"
    elif len(bilder) < minimum:
        daten["status"] = "Zu kurz für Schnitt und Nachlauf"
    else:
        daten["status"] = "Zeitbereich gedeckt"
    return daten


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("edl", type=Path)
    for take in TAKES:
        parser.add_argument(take, type=Path)
    args = parser.parse_args()
    try:
        bedarf = schnittliste(args.edl)
    except (OSError, ValueError) as fehler:
        print(json.dumps({"edl_fehler": str(fehler)}, ensure_ascii=False))
        return 1
    takes = {}
    nach_hash = {}
    for take in TAKES:
        try:
            daten = quelldaten(getattr(args, take), bedarf[take])
        except (OSError, ValueError, KeyError, ZeroDivisionError, subprocess.TimeoutExpired) as fehler:
            daten = {"status": f"Prüfung offen: {fehler}"}
        daten["soll_bilder_mit_nachlauf"] = bedarf[take]
        takes[take] = daten
        if "sha256" in daten:
            nach_hash.setdefault(daten["sha256"], []).append(take)
    for gruppe in nach_hash.values():
        if len(gruppe) > 1:
            for take in gruppe:
                takes[take]["status"] = "Dateigleichheit: Zuordnung der Einstellungen prüfen"
    passt = all(d["status"] == "Zeitbereich gedeckt" for d in takes.values())
    print(json.dumps({"master": MASTER, "schnittbilder": 540, "fps": FPS,
                      "zeitlich_passend": passt, "takes": takes,
                      "separat_pruefen": "Produktidentität, drei Motive, Kadrierung, Qualität und Rechte"},
                     ensure_ascii=False, indent=2))
    return 0 if passt else 1


if __name__ == "__main__":
    raise SystemExit(main())
