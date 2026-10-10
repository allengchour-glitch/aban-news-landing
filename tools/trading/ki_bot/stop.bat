@echo off
chcp 65001 >nul
REM Not-Aus: legt die Datei STOP an. Danach eroeffnet kein Bot mehr etwas; der Krypto-Pilot schliesst seine Futures-Positionen.
type nul > "%~dp0STOP"
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
cd /d "%~dp0\..\..\.."
set PY=py
where py >nul 2>nul || set PY=python
if not "%BINANCE_FUTURES_API_KEY%"=="" (
  echo Krypto-Pilot schliesst jetzt seine Futures-Positionen ...
  %PY% tools\trading\krypto_bot\pilot.py --lauf
)
echo.
echo Not-Aus aktiv. Pruefe das Ergebnis oben ^(bei einem Fehler: im Binance-Konto nachsehen^).
echo Alpaca-Positionen siehst du in der Alpaca-App. Wieder einschalten: weiter.bat
pause
