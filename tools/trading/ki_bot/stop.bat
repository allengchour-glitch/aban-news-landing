@echo off
REM Not-Aus: legt die Datei STOP an. Der Bot sendet danach keine Auftraege mehr.
type nul > "%~dp0STOP"
echo Not-Aus aktiv. Offene Positionen siehst du in der Alpaca-App. Wieder einschalten: weiter.bat
pause
