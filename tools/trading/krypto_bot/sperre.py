#!/usr/bin/env python3
"""Prozessübergreifende Sperre: Pilot-Lauf, Cockpit-Knopf, Aufgabenplanung und Not-Aus handeln nie gleichzeitig.

Zwei Läufe, die beide «Position 0» lesen, bevor einer kauft, würden sonst beide den vollen Betrag kaufen (doppelter Hebel).
Die Sperre ist eine Datei in data/, angelegt mit O_EXCL (gelingt nur einem Prozess). Bleibt sie nach einem Absturz
liegen, gilt sie nach ALT_NACH Sekunden als verwaist und wird übernommen.
"""
from __future__ import annotations

import os
import time
from contextlib import contextmanager
from pathlib import Path

ORDNER = Path(__file__).resolve().parents[3] / "data"
ALT_NACH = 900


class Besetzt(RuntimeError):
    """Ein anderer Lauf hält die Sperre."""


@contextmanager
def lauf_sperre(name="krypto-lauf", warten=0.0, ordner=None, alt_nach=ALT_NACH):
    datei = Path(ordner or ORDNER) / f"{name}.lock"
    datei.parent.mkdir(parents=True, exist_ok=True)
    start = time.time()
    while True:
        try:
            fd = os.open(str(datei), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, f"{os.getpid()} {time.time():.0f}\n".encode())
            os.close(fd)
            break
        except FileExistsError:
            try:
                alter = time.time() - datei.stat().st_mtime
            except FileNotFoundError:
                continue  # gerade freigegeben: nochmals versuchen
            if alter > alt_nach:
                try:
                    datei.unlink()
                except FileNotFoundError:
                    pass
                continue
            if time.time() - start >= warten:
                raise Besetzt(f"Ein anderer Lauf handelt gerade (seit {alter:.0f} s).") from None
            time.sleep(0.25)
    try:
        yield
    finally:
        try:
            datei.unlink()
        except FileNotFoundError:
            pass
