@echo off
REM Krypto-Cockpit: unsichtbarer Autostart (Aufgabe "Krypto-Cockpit-Start": bei der Anmeldung und alle 15 Minuten) - ohne Browser, ohne Fenster.
REM Laeuft das Cockpit schon, beendet sich cockpit.py --autostart sofort. Gestartet wird diese Datei von cockpit-start-still.vbs (Fensterstil 0 = unsichtbar).
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
cd /d "%~dp0\..\..\.."
set PY=py
where py >nul 2>nul || set PY=python
REM Alles in EINER Zeile mit "& exit /b": cmd liest sie ganz ein, bevor ein Update diese Datei ersetzt, und liest danach nichts mehr.
%PY% tools\trading\krypto_bot\cockpit.py --autostart & exit /b
