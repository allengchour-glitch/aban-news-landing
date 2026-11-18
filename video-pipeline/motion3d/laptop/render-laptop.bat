@echo off
rem render-laptop.bat - rendert Pia Folge 2 auf der Grafikkarte dieses Laptops (nur das stumme Video).
rem Aufruf per Doppelklick oder in der Eingabeaufforderung. Ergebnis: ..\ausgabe\folge2-stumm.mp4
setlocal
cd /d "%~dp0.."
if not exist node_modules ( call npm install || goto fehler )
if not exist ausgabe mkdir ausgabe
set ARGS=%*
node ..\motion\render.mjs projekte\pia-folge2\szene.html --webgl gpu --wartezeit 180 --out ausgabe\folge2-stumm.mp4 %ARGS%
if errorlevel 1 goto fehler
echo.
echo Fertig: %CD%\ausgabe\folge2-stumm.mp4
pause
exit /b 0
:fehler
echo FEHLER: siehe Meldung oben. Anleitung: laptop\LAPTOP-EINRICHTEN.md
pause
exit /b 1
