#!/usr/bin/env python3
"""Lässt eine Testdatei mit verschobener Uhr laufen (nur für die Suche nach Zeitbomben, schreibt nichts ins Repo).

    python3 zeitversatz.py <Tage> <Ordner mit dem Modul> <Modulname> <Testdatei>

Die Uhr (datetime.now/utcnow, date.today, time.time) läuft um <Tage> Tage vor, im Modul UND in der Testdatei. Alles andere bleibt echt."""
import datetime as _dt
import importlib
import runpy
import sys
import time as _time

tage, ordner, modul, testdatei = int(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
sys.path.insert(0, ordner)
M = importlib.import_module(modul)
versatz = tage * 86400
ECHT_DT, ECHT_D, echt_zeit = _dt.datetime, _dt.date, _time.time


class D(ECHT_DT):
    @classmethod
    def now(cls, tz=None):
        return cls.fromtimestamp(echt_zeit() + versatz, tz)

    @classmethod
    def utcnow(cls):
        return cls.utcfromtimestamp(echt_zeit() + versatz)


class T(ECHT_D):
    @classmethod
    def today(cls):
        return cls.fromtimestamp(echt_zeit() + versatz)


if getattr(M, "datetime", None) is ECHT_DT:
    M.datetime = D
if getattr(M, "date", None) is ECHT_D:
    M.date = T
_dt.datetime = D  # auch die Testdatei (und alles, was später «from datetime import …» macht) sieht die verschobene Uhr
_dt.date = T
import os as _os
if not _os.environ.get("NUR_DATUM"):
    _time.time = lambda: echt_zeit() + versatz  # mit NUR_DATUM=1 bleibt time.time echt (Dateizeiten und Sperren bleiben stimmig)
sys.argv = [testdatei]
runpy.run_path(testdatei, run_name="__main__")
