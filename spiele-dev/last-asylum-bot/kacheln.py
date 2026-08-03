#!/usr/bin/env python3
"""Ein geteiltes Bild in Kacheln zerlegen - damit Claude es lesen kann.

`bot.py teilen` legt den Bildschirm in voller Aufloesung unter `austausch/`
ab. Das sind rund sechs Megabyte, und die GitHub-Schnittstelle gibt den
Inhalt einer Datei nur bis etwa einem Megabyte direkt heraus; darueber
bleibt nur ein Download-Link, den Claude nicht immer abrufen kann.

Zerlegt man dasselbe Bild in ein Raster, liegt jede Kachel bei ein paar
hundert Kilobyte und ist damit lesbar. Meist braucht es ohnehin nur die
eine, in der der gesuchte Knopf steht.

    python kacheln.py                          # neuestes Bild aus austausch/
    python kacheln.py austausch/ladebildschirm.png
    python kacheln.py --spalten 4 --zeilen 6   # feiner rastern

Die Kacheln heissen z<Zeile>s<Spalte>.png, oben links ist z1s1. Zusaetzlich
entsteht `kacheln/uebersicht.txt` mit den Bildkoordinaten jeder Kachel -
damit laesst sich ein Fund aus einer Kachel wieder auf das ganze Bild
umrechnen, ohne nachzumessen.
"""

from __future__ import annotations

import argparse
import glob
import os
import subprocess
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)

from laa.image import Image  # noqa: E402


def neuestes_bild(ordner: str) -> str:
    treffer = [p for p in glob.glob(os.path.join(ordner, "*.png"))]
    if not treffer:
        raise SystemExit(
            f"In {ordner} liegt kein Bild. Erst aufnehmen:\n"
            "    python bot.py teilen --als versammlung"
        )
    return max(treffer, key=os.path.getmtime)


def zerlegen(bild: Image, ziel: str, spalten: int, zeilen: int) -> list:
    for alt in glob.glob(os.path.join(ziel, "*.png")):
        os.remove(alt)
    os.makedirs(ziel, exist_ok=True)

    kb, kh = bild.width // spalten, bild.height // zeilen
    plan = []
    for z in range(zeilen):
        for s in range(spalten):
            x, y = s * kb, z * kh
            # Die letzte Spalte und Zeile bekommen den Rest, damit bei
            # krummen Groessen kein Streifen verlorengeht.
            breite = bild.width - x if s == spalten - 1 else kb
            hoehe = bild.height - y if z == zeilen - 1 else kh
            name = f"z{z + 1}s{s + 1}.png"
            bild.crop(x, y, breite, hoehe).save(os.path.join(ziel, name))
            plan.append((name, x, y, breite, hoehe))
    return plan


def uebersicht_schreiben(pfad: str, quelle: str, bild: Image, plan: list) -> None:
    zeilen = [
        f"Quelle: {os.path.basename(quelle)}  ({bild.width}x{bild.height})",
        "",
        "Kachel      x0     y0   Breite   Hoehe",
    ]
    for name, x, y, b, h in plan:
        zeilen.append(f"{name:10} {x:6d} {y:6d} {b:8d} {h:7d}")
    zeilen += [
        "",
        "Ein Fund in einer Kachel liegt im Gesamtbild bei x0+x, y0+y.",
    ]
    with open(pfad, "w", encoding="utf-8") as fh:
        fh.write("\n".join(zeilen) + "\n")


def hochladen(ordner: str, quelle: str) -> bool:
    def git(*rest):
        return subprocess.run(["git", "-C", HIER, *rest], capture_output=True, timeout=180)

    git("add", "--", ordner)
    ergebnis = git("commit", "-m", f"Kacheln zum Anschauen: {os.path.basename(quelle)}")
    if ergebnis.returncode != 0 and b"nothing to commit" not in ergebnis.stdout:
        # Nicht weiterlaufen und am Ende "Hochgeladen" melden - der haeufigste
        # Grund (git kennt keinen Namen) stand ausserdem in stderr, das hier
        # weggeworfen wurde.
        text = (ergebnis.stdout + ergebnis.stderr).decode("utf-8", "replace")
        print("Eintragen fehlgeschlagen:", " ".join(text.split())[:300], file=sys.stderr)
        return False
    schub = git("push")
    if schub.returncode != 0:
        print("Hochladen fehlgeschlagen:",
              schub.stderr.decode("utf-8", "replace").strip()[:300], file=sys.stderr)
        return False
    return True


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("bild", nargs="?", help="Bild aus austausch/ (Standard: das neueste)")
    p.add_argument("--spalten", type=int, default=3)
    p.add_argument("--zeilen", type=int, default=4)
    p.add_argument("--ohne-hochladen", action="store_true",
                   help="nur zerlegen, nicht ins Repository schieben")
    args = p.parse_args()

    austausch = os.path.join(HIER, "austausch")
    quelle = args.bild or neuestes_bild(austausch)
    if not os.path.exists(quelle):
        raise SystemExit(f"{quelle} gibt es nicht.")

    bild = Image.load(quelle)
    if bild.ist_einfarbig():
        raise SystemExit("Das Bild ist leer - so ist nichts zu sehen.")

    spalten, zeilen = max(1, args.spalten), max(1, args.zeilen)
    ziel = os.path.join(austausch, "kacheln")
    plan = zerlegen(bild, ziel, spalten, zeilen)
    uebersicht_schreiben(os.path.join(ziel, "uebersicht.txt"), quelle, bild, plan)

    groessen = [os.path.getsize(os.path.join(ziel, n)) for n, *_ in plan]
    print(f"{os.path.basename(quelle)} ({bild.width}x{bild.height})"
          f" -> {len(plan)} Kacheln in austausch/kacheln/")
    print(f"  groesste Kachel: {max(groessen) // 1024} KB"
          f"  (unter 1000 KB ist gut lesbar)")
    if max(groessen) > 900 * 1024:
        print("  Tipp: feiner rastern, z. B. --spalten 4 --zeilen 6")

    if args.ohne_hochladen:
        return 0
    if hochladen(ziel, quelle):
        print("Hochgeladen. Claude kann die Kacheln jetzt lesen.")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
