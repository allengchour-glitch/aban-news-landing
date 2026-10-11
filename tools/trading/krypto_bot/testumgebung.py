#!/usr/bin/env python3
"""Hilfe für die Tests: echte Schalter-Dateien (STOP = Not-Aus, PAUSE = Auto-Handel aus) und die Lauf-Sperre in einen
leeren Ordner umbiegen. So prüft ein Selbsttest den Code — und nicht, ob der Nutzer gerade den Not-Aus gedrückt hat."""
from __future__ import annotations

import tempfile
from pathlib import Path


def schalter_umbiegen(*module):
    """Auch das Buch der kopierten Telegram-Calls wird umgebogen: offene Calls des Nutzers dürfen den Not-Aus-Test nicht ändern."""
    ordner = Path(tempfile.mkdtemp(prefix="krypto-test-"))
    import calls_kopierer as CK
    module = tuple(module) + (CK,)
    CK.BUCH, CK.PRUEFUNG = ordner / "calls-kopierer.json", ordner / "calls-pruefung.json"
    for m in module:
        for name in ("STOP_DATEI", "PAUSE_DATEI", "STOP", "PAUSE"):
            wert = getattr(m, name, None)
            if isinstance(wert, Path):
                setattr(m, name, ordner / wert.name)
        if hasattr(m, "ORDNER") and m.__name__.endswith("sperre"):
            m.ORDNER = ordner
    return ordner
